// Geographic coverage & enrichment lane: where the ingestion pipelines have
// been AND how far behind each enrichment script is, one report, one app tab
// per app.
//
//   Tabs           Doggle | Pickleague — data-driven from `datasets`, so a
//                  future app is one more entry, not new plumbing.
//   National view  a true AlbersUSA choropleth per app (vendored us-atlas
//                  boundaries in assets/, decoded and projected at build time —
//                  the page stays self-contained).
//   Debt board     per app: coverage, debt, windowed delta and a daily
//                  burn-down sparkline per enrichment script. History lives in
//                  committed data/enrich.json (one row per day, upserted) —
//                  the same file the old /enrich lane wrote, so its history
//                  continues unbroken.
//   Drill-down     click a state with data -> county choropleth cropped to the
//                  state, a state-scoped debt table, the county table, and for
//                  CA the named ingestion regions. County hover carries the
//                  county's own enrichment percentages.
//
// Assignment happens in two DIFFERENT ways, on purpose:
//   - STATE totals come from the ingestion ledger itself (region -> state,
//     else containing ingest tile, done-tiles preferred) — so the map can
//     surface places the ledger cannot account for (off-ledger).
//   - COUNTY splits are geometric: places bucketed to ~1 km cells in SQL,
//     assigned by point-in-polygon in raw lon/lat (no projection involved in
//     any count). The two can differ by a hair at state lines; the drill
//     panel says so.
//
// A blank state means THE PIPELINE HAS NOT RUN THERE — "we can't see it", not
// "nothing exists there". This lane counts places, not people, so account
// exclusions do not apply — stated on the page. The window toggle re-colors
// the maps from precomputed per-window bins; nothing is recomputed client-side.
//
// Writes data/geo.json + data/enrich.json (counts only, committed) +
// data/geo-roster.json (place/venue names, gitignored) + reports/geo.html.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, dayOf } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";
import { loadTopo, decode, bboxOf, contains, svgPath, projectedBbox, albersUsa, MAP_W, MAP_H, FIPS_TO_POSTAL, POSTAL_TO_FIPS } from "./lib/usmap.mjs";

const APPS = readConfig("apps.json");
const refOf = (id) => APPS.apps.find((a) => a.id === id)?.projectRef;
const DOGGLE = refOf("doggle");
const PICKLE = refOf("pickleague");
const DATA_FILE = join(ROOT, "data", "geo.json");
const ENRICH_FILE = join(ROOT, "data", "enrich.json");
const ROSTER_FILE = join(ROOT, "data", "geo-roster.json");
const HTML_FILE = join(ROOT, "reports", "geo.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the geo lane needs Management API access.");
  process.exit(1);
}
if (!DOGGLE || !PICKLE) {
  console.error("config/apps.json is missing the doggle or pickleague projectRef.");
  process.exit(1);
}

const REGIONS = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  South: ["DE", "FL", "GA", "MD", "NC", "SC", "VA", "DC", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
  West: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
};
const regionOf = (st) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(st)) ?? "—";

// The enrichment lanes per app. `done` is the SQL predicate for "this row is
// enriched"; ids must stay stable — they key the committed history.
const LANES = {
  d: [
    { id: "photo", label: "Photos", done: "cover_photo_url is not null" },
    { id: "descr", label: "Descriptions", done: "description is not null" },
    { id: "scored", label: "Dog score", done: "dog_score is not null" },
    { id: "bounded", label: "Boundaries", done: "boundary is not null" },
    { id: "amenities", label: "Nearby amenities", done: "(nearby_toilets is not null or nearby_water is not null)" },
    { id: "wikidata", label: "Wikidata link", done: "wikidata_id is not null" },
  ],
  p: [
    { id: "bounded", label: "Boundaries", done: "boundary is not null" },
    { id: "refreshed", label: "Details refresh", done: "last_refreshed_at is not null" },
    { id: "surface", label: "Surface type", done: "surface is not null" },
    { id: "hours", label: "Opening hours", done: "opening_hours is not null" },
    { id: "courts", label: "Court counts", done: "(court_count is not null and court_count > 0)" },
  ],
};
const laneCols = (lanes) =>
  lanes.map((l) => `count(*) filter (where ${l.done})::int ${l.id}`).join(",\n    ");

// ---------- queries: one fetch per concern, every window computed from it ----------

const WINDOW_COLS = (ts) => STANDARD_WINDOWS.map((w) => `count(*) filter (where ${ts} >= now() - interval '${w} day')::int d${w}`).join(",\n    ");

// Pickleague venues carry a `sport` text[] — a venue can host several sports.
// The list is discovered from the data (ordered by volume) so a new sport is a
// new chip, not a code change. This preliminary query only ORDERS the chips;
// every number on the page still comes from the one main fetch below.
const sportRows = await runSql(PICKLE, `
select s sport, count(*)::int n
from venues v cross join lateral unnest(v.sport) s
where v.lat is not null group by 1 order by n desc`);
const SPORTS = sportRows.map((r) => r.sport).filter((s) => /^[a-z0-9_]+$/.test(s));
for (const r of sportRows) {
  if (!SPORTS.includes(r.sport)) console.error(`Skipping sport ${JSON.stringify(r.sport)} — not a safe identifier.`);
}
const SPORT_KEYS = SPORTS.flatMap((s) => [`sp_${s}`, ...STANDARD_WINDOWS.map((w) => `sp_${s}_d${w}`)]);
// `p` is the column prefix ("v." or "") so the same columns drop into both the
// state cells query and the bare fine-cells query.
const sportCountCols = (p) => SPORTS.map((s) =>
  [`count(*) filter (where '${s}' = any(${p}sport))::int sp_${s}`,
   ...STANDARD_WINDOWS.map((w) => `count(*) filter (where '${s}' = any(${p}sport) and ${p}created_at >= now() - interval '${w} day')::int sp_${s}_d${w}`),
  ].join(",\n    ")).join(",\n    ");
const sportNameCols = (p) => SPORTS.map((s) => `(array_agg(${p}name) filter (where '${s}' = any(${p}sport)))[1:4] nm_${s}`).join(",\n    ");

// State assignment comes from the ingestion machinery itself: region -> state
// (how CA was loaded), else the ingest tile whose bbox contains the point (how
// every tiled state was loaded).
const dogPlacesSql = `
with placed as (
  select p.*, coalesce(r.state, t.state, '??') as st
  from dog_places p
  left join dog_place_regions r on r.slug = p.region_slug
  left join lateral (
    -- Border points can sit in a done tile's bbox AND a neighbouring pending
    -- tile's bbox; prefer the tile whose pipeline actually loaded them, so the
    -- map never shows places in a state whose ledger says nothing ran.
    select ti.state from ingest_tiles ti
    where p.lat between ti.min_lat and ti.max_lat and p.lng between ti.min_lng and ti.max_lng
    order by (ti.status = 'done') desc
    limit 1
  ) t on true
)
select st, count(*)::int n,
  count(*) filter (where source = 'curated')::int curated,
  ${laneCols(LANES.d)},
  ${WINDOW_COLS("created_at")},
  (array_agg(name order by (dog_score is not null) desc, name))[1:20] top_names
from placed group by st order by n desc`;

// Places that matched no region and no tile — ingested OFF the ledger. They are
// real places somewhere, so nearest us_cities decides their state, and they
// carry an off-ledger counter so the map can say how many of a state's places
// the ingestion ledger cannot account for.
const dogOffLedgerSql = `
with un as (
  select p.*, round(p.lat::numeric, 1) clat, round(p.lng::numeric, 1) clng
  from dog_places p
  left join dog_place_regions r on r.slug = p.region_slug
  where r.state is null
    and not exists (
      select 1 from ingest_tiles ti
      where p.lat between ti.min_lat and ti.max_lat and p.lng between ti.min_lng and ti.max_lng)
),
cells as (
  select clat, clng, count(*)::int n,
    count(*) filter (where source = 'curated')::int curated,
    ${laneCols(LANES.d)},
    ${WINDOW_COLS("created_at")},
    (array_agg(name))[1:6] names
  from un group by 1, 2
)
select c.*,
  coalesce((
    select uc.state_code from us_cities uc
    where uc.lat between c.clat - 1.5 and c.clat + 1.5
      and uc.lng between c.clng - 1.5 and c.clng + 1.5
    order by (uc.lat - c.clat)^2 + (uc.lng - c.clng)^2
    limit 1
  ), '??') st
from cells c`;

const dogTilesSql = `
select state, count(*)::int tiles,
  count(*) filter (where status = 'done')::int done,
  count(*) filter (where status = 'pending')::int pending,
  count(*) filter (where status = 'running')::int running,
  count(*) filter (where status = 'empty')::int empty,
  count(*) filter (where last_error is not null)::int errored,
  coalesce(sum(features), 0)::int features,
  coalesce(sum(loaded), 0)::int loaded,
  max(done_at) last_done
from ingest_tiles group by state order by state`;

// The named sub-state regions the Doggle ingestion is organised around.
const dogRegionsSql = `
select r.state, r.name, count(p.id)::int n,
  count(p.id) filter (where p.created_at >= now() - interval '30 day')::int d30
from dog_place_regions r
left join dog_places p on p.region_slug = r.slug
group by 1, 2 order by n desc`;

// Venues have no region ledger, so nearest us_cities entry decides the state.
// Venues are bucketed into 0.1-degree cells first so the correlated scan runs
// per cell, not per venue. Approximate within ~10 km of a state line.
const pickleVenuesSql = `
with cells as (
  select round(v.lat::numeric, 1) clat, round(v.lng::numeric, 1) clng,
    count(*)::int n,
    count(*) filter (where v.source = 'osm')::int osm,
    count(*) filter (where v.source = 'google')::int google,
    count(*) filter (where v.indoor)::int indoor,
    coalesce(sum(v.court_count), 0)::int courtsum,
    ${laneCols(LANES.p)},
    ${WINDOW_COLS("v.created_at")},
    ${sportCountCols("v.")},
    ${sportNameCols("v.")},
    (array_agg(v.name))[1:6] names
  from venues v
  where v.lat is not null
  group by 1, 2
)
select c.*,
  coalesce((
    select uc.state_code from us_cities uc
    where uc.lat between c.clat - 1.5 and c.clat + 1.5
      and uc.lng between c.clng - 1.5 and c.clng + 1.5
    order by (uc.lat - c.clat)^2 + (uc.lng - c.clng)^2
    limit 1
  ), '??') st
from cells c`;

// Per-venue rows for the real-map drill below the subdivisions: name, address,
// geofence radius and the mapped boundary. Names and addresses land ONLY in the
// gitignored report HTML, never in committed data.
const pickleVenueRowsSql = `
select v.name, v.address, v.lat, v.lng, v.geofence_radius_m r, v.boundary, v.sport,
  v.surface, v.indoor, v.court_count, v.source
from venues v where v.lat is not null`;

// Fine (~1 km) cells for the county drill-down, carrying the enrichment flags
// so county hover can state its own percentages. Counted in SQL, assigned to a
// county in Node by point-in-polygon in raw lon/lat.
const fineCellsSql = (table, lanes, extraCols = "") => `
select round(lat::numeric, 2) clat, round(lng::numeric, 2) clng, count(*)::int n,
    ${laneCols(lanes)},
    ${WINDOW_COLS("created_at")}${extraCols ? `,\n    ${extraCols}` : ""}
from ${table}
where lat is not null
group by 1, 2`;

// App-level totals + the highest-value un-enriched rows per lane — the debt
// board and its hover samples, and the daily history snapshot.
const boardSql = (table, lanes, sampleOrder) => `
select count(*)::int total,
  ${lanes.map((l) => `count(*) filter (where ${l.done})::int ${l.id},
  (select json_agg(name) from (select name from ${table} where not ${l.done} ${sampleOrder} limit 20) s_${l.id}) ${l.id}_missing`).join(",\n  ")}
from ${table}`;

const [dogStatesRaw, dogOffCells, dogTiles, dogRegions, pickleCells, dogFine, pickleFine, dogBoard, pickleBoard, usCities, pickleVenues] = await Promise.all([
  runSql(DOGGLE, dogPlacesSql),
  runSql(DOGGLE, dogOffLedgerSql),
  runSql(DOGGLE, dogTilesSql),
  runSql(DOGGLE, dogRegionsSql),
  runSql(PICKLE, pickleVenuesSql),
  runSql(DOGGLE, fineCellsSql("dog_places", LANES.d)),
  runSql(PICKLE, fineCellsSql("venues", LANES.p, sportCountCols(""))),
  runSql(DOGGLE, boardSql("dog_places", LANES.d, "order by dog_score desc nulls last, name")).then((r) => r[0]),
  runSql(PICKLE, boardSql("venues", LANES.p, "order by name")).then((r) => r[0]),
  // The sub-county drill unit: cities are the deepest NAMED thing the data
  // has (no city polygons exist in assets, so cities render as dots).
  runSql(DOGGLE, "select city, state_code, lat, lng from us_cities"),
  runSql(PICKLE, pickleVenueRowsSql),
]);

const collectedAt = new Date().toISOString();
const today = dayOf(collectedAt);
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WIN = ALL_WINDOW;
const winCount = (row, w) => (w === ALL_WINDOW ? row.n : row[`d${w}`]) ?? 0;
const sportWinCount = (row, s, w) => (w === ALL_WINDOW ? row[`sp_${s}`] : row[`sp_${s}_d${w}`]) ?? 0;
const sportLabel = (s) => s.replace(/_/g, " ");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const fmt = (n) => Number(n).toLocaleString("en-US");

// ---------- fold state-keyed cells into per-state rows ----------

function foldCells(map, cells, numKeys, blank) {
  for (const c of cells) {
    const s = map.get(c.st) ?? { st: c.st, top_names: [], ...blank };
    for (const k of numKeys) s[k] += c[k] ?? 0;
    if (s.top_names.length < 20) s.top_names.push(...(c.names ?? []).filter(Boolean).slice(0, 20 - s.top_names.length));
    map.set(c.st, s);
  }
  return map;
}

// Doggle: ledger-assigned states first, then the off-ledger cells merged in.
// The main query's own '??' bucket is dropped — the off-ledger query re-derives
// that exact cohort with a state, and keeping both would double-count it.
const DOG_KEYS = ["n", "curated", ...LANES.d.map((l) => l.id), "d1", "d7", "d14", "d30", "offLedger"];
const dogStates = new Map();
for (const r of dogStatesRaw) {
  if (r.st === "??") continue;
  dogStates.set(r.st, { ...r, offLedger: 0, top_names: (r.top_names ?? []).filter(Boolean) });
}
foldCells(dogStates, dogOffCells.map((c) => ({ ...c, offLedger: c.n })), DOG_KEYS, Object.fromEntries(DOG_KEYS.map((k) => [k, 0])));

const PICKLE_KEYS = ["n", "osm", "google", "indoor", "courtsum", ...LANES.p.map((l) => l.id), "d1", "d7", "d14", "d30", ...SPORT_KEYS];
const pickleStates = foldCells(new Map(), pickleCells.map((c) => ({ ...c, courtsum: c.courtsum ?? c.courtSum ?? 0 })), PICKLE_KEYS, Object.fromEntries(PICKLE_KEYS.map((k) => [k, 0])));

// Second pass over the same cells for the per-sport name samples — foldCells
// only folds numbers and the single shared top_names list.
for (const c of pickleCells) {
  const s = pickleStates.get(c.st);
  if (!s) continue;
  s.spNames ??= {};
  for (const sp of SPORTS) {
    const arr = (s.spNames[sp] ??= []);
    if (arr.length < 20) arr.push(...(c[`nm_${sp}`] ?? []).filter(Boolean).slice(0, 20 - arr.length));
  }
}

// App-wide per-sport totals, from the SAME fetch as everything else. The '??'
// bucket is included: the sport mix is about the app, not the map.
const sportTotals = {};
for (const sp of SPORTS) {
  const t = { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 };
  for (const r of pickleStates.values()) {
    t.n += r[`sp_${sp}`] ?? 0;
    for (const w of STANDARD_WINDOWS) t[`d${w}`] += r[`sp_${sp}_d${w}`] ?? 0;
  }
  sportTotals[sp] = t;
}

// ---------- geometry + county assignment ----------

const statesGeo = decode(loadTopo("us-states-10m.json"), "states")
  .filter((s) => FIPS_TO_POSTAL[s.id] && !["PR", "VI"].includes(FIPS_TO_POSTAL[s.id]))
  .map((s) => ({ ...s, postal: FIPS_TO_POSTAL[s.id] }));
const stateName = Object.fromEntries(statesGeo.map((s) => [s.postal, s.name]));

const tilesByState = new Map(dogTiles.map((t) => [t.state, t]));

// One entry per app tab. Adding an app = adding an entry here (states map,
// fine cells, lanes, statLines) — the tabs, maps, boards and drills all render
// from this list.
const datasets = [
  {
    id: "d", app: "Doggle", unit: "places", states: dogStates, fine: dogFine, board: dogBoard,
    lanes: LANES.d, historyKey: "doggle",
    statLines(r, w) {
      const lines = [`${stateName[r.st] ?? r.st} — ${regionOf(r.st)} region`];
      const t = tilesByState.get(r.st);
      if (t) {
        lines.push(`ingest tiles: ${t.done} done, ${t.pending} pending${t.running ? `, ${t.running} running` : ""}${t.empty ? `, ${t.empty} empty` : ""}${t.errored ? `, ${t.errored} ERRORED` : ""}`);
        lines.push(`features ${fmt(t.features)} seen, ${fmt(t.loaded)} loaded`);
      }
      if (w === ALL_WINDOW) {
        lines.push(`enriched: photo ${pct(r.photo, r.n)}%, descr ${pct(r.descr, r.n)}%, score ${pct(r.scored, r.n)}%, boundary ${pct(r.bounded, r.n)}%, amenities ${pct(r.amenities, r.n)}%, wikidata ${pct(r.wikidata, r.n)}%`);
        if (r.curated) lines.push(`${r.curated} curated by hand, rest osm`);
        if (r.offLedger) lines.push(`${fmt(r.offLedger)} OFF-LEDGER (no region, no tile; state by nearest city)`);
      } else {
        lines.push(`ingested in last ${windowLabel(w)}: ${fmt(winCount(r, w))} (enrichment %s are all-time)`);
      }
      return lines;
    },
    countyLines(a) {
      return [
        `enriched: photo ${pct(a.photo, a.n)}%, descr ${pct(a.descr, a.n)}%, score ${pct(a.scored, a.n)}%`,
        `boundary ${pct(a.bounded, a.n)}%, amenities ${pct(a.amenities, a.n)}%, wikidata ${pct(a.wikidata, a.n)}%`,
      ];
    },
  },
  {
    id: "p", app: "Pickleague", unit: "venues", states: pickleStates, fine: pickleFine, board: pickleBoard,
    lanes: LANES.p, historyKey: "pickleague", extraKeys: SPORT_KEYS,
    statLines(r, w) {
      const lines = [`${stateName[r.st] ?? r.st} — ${regionOf(r.st)} region`];
      lines.push(`sources: ${fmt(r.osm)} osm, ${fmt(r.google)} google`);
      if (w === ALL_WINDOW) {
        lines.push(`${fmt(r.courtsum)} courts counted · ${fmt(r.indoor)} indoor`);
        lines.push(`enriched: boundary ${pct(r.bounded, r.n)}%, refreshed ${pct(r.refreshed, r.n)}%, surface ${pct(r.surface, r.n)}%, hours ${pct(r.hours, r.n)}%`);
      } else {
        lines.push(`ingested in last ${windowLabel(w)}: ${fmt(winCount(r, w))} (enrichment %s are all-time)`);
      }
      return lines;
    },
    countyLines(a) {
      return [
        `enriched: boundary ${pct(a.bounded, a.n)}%, refreshed ${pct(a.refreshed, a.n)}%`,
        `surface ${pct(a.surface, a.n)}%, hours ${pct(a.hours, a.n)}%, courts ${pct(a.courts, a.n)}%`,
      ];
    },
  },
];

// Point-in-polygon runs against ALL counties, because ingest tile bboxes are
// rectangles that cross state lines — a place the ledger credits to WA can sit
// geographically in Idaho, and only the full county set can see that. Drill
// panels are still rendered only for states the ledger credits.
const dataPostals = [...new Set(datasets.flatMap((ds) => [...ds.states.keys()].filter((s) => s !== "??")))];
const dataFips = new Set(dataPostals.map((p) => POSTAL_TO_FIPS[p]).filter(Boolean));
const countiesGeo = decode(loadTopo("us-counties-10m.json"), "counties")
  .map((c) => ({ ...c, stateFips: String(c.id).slice(0, 2), bbox: bboxOf(c.rings) }));

// County subdivisions (census CCDs, 500k cartographic, vendored for the data
// states) — the sub-county choropleth unit. GEOID = state+county+cousub, so
// membership in a county is exact, no geometry needed.
const cousubGeo = JSON.parse(readFileSync(join(ROOT, "assets", "us-cousub-west.json"), "utf8"))
  .map((s) => ({ ...s, countyFips: s.id.slice(0, 5), bbox: bboxOf(s.rings) }));
const cousubsByCounty = new Map();
for (const s of cousubGeo) {
  if (!cousubsByCounty.has(s.countyFips)) cousubsByCounty.set(s.countyFips, []);
  cousubsByCounty.get(s.countyFips).push(s);
}
const countiesByState = new Map();
for (const c of countiesGeo) {
  if (!dataFips.has(c.stateFips)) continue; // panels only where the ledger has data
  if (!countiesByState.has(c.stateFips)) countiesByState.set(c.stateFips, []);
  countiesByState.get(c.stateFips).push(c);
}

// Assign each fine cell to a county: bbox prefilter, then even-odd PIP.
// `spill` collects counts that land geographically in states the ledger does
// not credit — tile-bbox spillover, reported per state. A cell that misses
// every county gets a nearest-county fallback within ~5 km (shoreline points
// pushed into the water by cell rounding and 10 m simplification); what is
// left after THAT is not in the United States at all — ingest tile rectangles
// cross the national border — and is reported as `foreign`.
const NEAR = 0.05; // degrees, ~5 km
function nearestCounty(lon, lat) {
  let best = null, bestD = NEAR;
  for (const k of countiesGeo) {
    if (lon < k.bbox[0] - NEAR || lon > k.bbox[2] + NEAR || lat < k.bbox[1] - NEAR || lat > k.bbox[3] + NEAR) continue;
    for (const r of k.rings) for (const [x, y] of r) {
      const d = Math.hypot(x - lon, y - lat);
      if (d < bestD) { bestD = d; best = k; }
    }
  }
  return best;
}
function countyCounts(fine, laneIds, extraKeys = []) {
  const keys = ["n", ...laneIds, ...STANDARD_WINDOWS.map((w) => `d${w}`), ...extraKeys];
  const acc = new Map(); // fips5 -> {n, <lanes>, d1, d7, d14, d30}
  const sub = new Map(); // cousub GEOID -> same shape
  const spill = new Map(); // postal -> n
  let foreign = 0, shoreline = 0;
  for (const cell of fine) {
    const lon = Number(cell.clng), lat = Number(cell.clat);
    let hit = countiesGeo.find((c) => contains(c.rings, c.bbox, lon, lat));
    if (!hit) {
      hit = nearestCounty(lon, lat);
      if (hit) shoreline += cell.n;
      else { foreign += cell.n; cell.usOk = false; continue; }
    }
    // The city rollup reuses this verdict: a foreign cell must not borrow the
    // nearest US border town (Point Roberts would swallow Vancouver).
    cell.usOk = true;
    if (!dataFips.has(hit.stateFips)) {
      const p = FIPS_TO_POSTAL[hit.stateFips] ?? hit.stateFips;
      spill.set(p, (spill.get(p) ?? 0) + cell.n);
      continue;
    }
    const a = acc.get(hit.id) ?? Object.fromEntries(keys.map((k) => [k, 0]));
    for (const k of keys) a[k] += cell[k] ?? 0;
    acc.set(hit.id, a);
    // One level further: which subdivision of that county. Candidates are the
    // county's own cousubs (GEOID prefix), so this is a handful of PIPs; a
    // rounding miss falls back to the nearest cousub ring of the county.
    const subs = cousubsByCounty.get(hit.id) ?? [];
    let sh = subs.find((s) => contains(s.rings, s.bbox, lon, lat));
    if (!sh && subs.length) {
      let bestD = Infinity;
      for (const s of subs) for (const r of s.rings) for (const [x, y] of r) {
        const d = Math.hypot(x - lon, y - lat);
        if (d < bestD) { bestD = d; sh = s; }
      }
    }
    if (sh) {
      const b = sub.get(sh.id) ?? Object.fromEntries(keys.map((k) => [k, 0]));
      for (const k of keys) b[k] += cell[k] ?? 0;
      sub.set(sh.id, b);
    }
  }
  return { acc, sub, spill, foreign, shoreline };
}
const countyData = Object.fromEntries(datasets.map((ds) => [ds.id, countyCounts(ds.fine, ds.lanes.map((l) => l.id), ds.extraKeys ?? [])]));

// Every Pickleague venue assigned to its census county subdivision — venue by
// venue, not cell by cell, because the drill panel below shows THE venues, not
// counts. Finer than the ~1 km cells, so the two can differ by a hair at
// subdivision lines; the panel says so.
const venuesByCousub = new Map();
const venuesByCounty = new Map();
for (const v of pickleVenues) {
  const lon = Number(v.lng), lat = Number(v.lat);
  const cty = countiesGeo.find((c) => contains(c.rings, c.bbox, lon, lat)) ?? nearestCounty(lon, lat);
  if (!cty) continue;
  const subs = cousubsByCounty.get(cty.id) ?? [];
  let sh = subs.find((s) => contains(s.rings, s.bbox, lon, lat));
  if (!sh && subs.length) {
    let bestD = Infinity;
    for (const s of subs) for (const ring of s.rings) for (const [x, y] of ring) {
      const d = Math.hypot(x - lon, y - lat);
      if (d < bestD) { bestD = d; sh = s; }
    }
  }
  if (!sh) continue;
  if (!venuesByCousub.has(sh.id)) venuesByCousub.set(sh.id, []);
  venuesByCousub.get(sh.id).push(v);
  // The same venue also belongs to a county, which is the coarser real-map
  // level. Both maps point at ONE roster entry per venue, so adding the county
  // view costs marks, not another copy of every name and address.
  if (!venuesByCounty.has(cty.id)) venuesByCounty.set(cty.id, []);
  venuesByCounty.get(cty.id).push(v);
}
const venuesPlaced = [...venuesByCousub.values()].reduce((a, vs) => a + vs.length, 0);
const venuesUnplaced = pickleVenues.length - venuesPlaced;

// ---------- city rollup: the drill level BELOW county ----------
// Every ~1 km cell is credited to its nearest us_cities entry (1-degree bucket
// index, capped at ~30 km so a Canadian cell cannot borrow a border town).
// Cities render as dots on the county map — sized by all-time volume, colored
// by the windowed bins — because no city polygons exist to shade.

const cityBuckets = new Map();
for (const c of usCities) {
  const k = `${Math.round(c.lat)}|${Math.round(c.lng)}`;
  if (!cityBuckets.has(k)) cityBuckets.set(k, []);
  cityBuckets.get(k).push(c);
}
const CITY_MAX_D = 0.35; // degrees, ~30 km
function nearestCityOf(lon, lat) {
  let best = null, bestD = CITY_MAX_D;
  const blat = Math.round(lat), blng = Math.round(lon);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    for (const c of cityBuckets.get(`${blat + dy}|${blng + dx}`) ?? []) {
      const d = Math.hypot(c.lng - lon, c.lat - lat);
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  return best;
}
function cityRollup(ds) {
  const keys = ["n", ...ds.lanes.map((l) => l.id), ...STANDARD_WINDOWS.map((w) => `d${w}`), ...(ds.extraKeys ?? [])];
  const acc = new Map();
  for (const cell of ds.fine) {
    if (cell.usOk === false) continue; // classified foreign by the county pass
    const lon = Number(cell.clng), lat = Number(cell.clat);
    const city = nearestCityOf(lon, lat);
    if (!city || !dataPostals.includes(city.state_code)) continue;
    // Same-named cities exist within a state; the rounded latitude keeps them apart.
    const key = `${city.state_code}|${city.city}|${city.lat.toFixed(1)}`;
    const a = acc.get(key) ?? { city: city.city, st: city.state_code, lat: city.lat, lng: city.lng, ...Object.fromEntries(keys.map((k) => [k, 0])) };
    for (const k of keys) a[k] += cell[k] ?? 0;
    acc.set(key, a);
  }
  // Each city belongs to a county, so a county click can list its cities.
  for (const a of acc.values()) {
    const hit = countiesGeo.find((c) => contains(c.rings, c.bbox, a.lng, a.lat)) ?? nearestCounty(a.lng, a.lat);
    a.county = hit?.id ?? null;
  }
  return acc;
}
const cityData = Object.fromEntries(datasets.map((ds) => [ds.id, cityRollup(ds)]));
const countyName = Object.fromEntries(countiesGeo.map((c) => [c.id, c.name]));
const cousubById = Object.fromEntries(cousubGeo.map((s) => [s.id, s]));

// ---------- enrichment history: committed, append-or-replace today's row ----------

const prevEnrich = existsSync(ENRICH_FILE) ? JSON.parse(readFileSync(ENRICH_FILE, "utf8")) : { history: [] };
const snapshot = { date: today };
for (const ds of datasets) {
  snapshot[ds.historyKey] = { total: ds.board.total, ...Object.fromEntries(ds.lanes.map((l) => [l.id, ds.board[l.id]])) };
}
const history = [...(prevEnrich.history ?? []).filter((h) => h.date !== today), snapshot].sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(ENRICH_FILE, JSON.stringify({ collectedAt, history }, null, 2));

const inHist = (date, w) => w === ALL_WINDOW || Date.parse(date) >= Date.parse(today) - w * 86400_000;
const debtAt = (h, key, laneId) => (h[key] ? h[key].total - (h[key][laneId] ?? 0) : null);

// ---------- outputs ----------

const rosters = {};
const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WIN, apps: {} };

for (const ds of datasets) {
  const states = {};
  for (const [st, r] of ds.states) {
    if (st === "??") continue;
    states[st] = { n: r.n, d1: r.d1, d7: r.d7, d14: r.d14, d30: r.d30 };
    for (const l of ds.lanes) states[st][l.id] = r[l.id];
    if (ds.id === "d") Object.assign(states[st], { curated: r.curated, offLedger: r.offLedger });
    else Object.assign(states[st], { osm: r.osm, google: r.google, courtSum: r.courtsum });
    for (const w of WINDOWS) {
      rosters[`st|${w}|${ds.id}|${st}`] = {
        total: winCount(r, w),
        names: [...ds.statLines(r, w), `— top ${ds.unit} —`, ...(r.top_names ?? []).filter(Boolean)],
      };
    }
    // Sport-scoped rosters, keyed `<all-sports key>@<sport>` — the page appends
    // the active sport to data-hov, so the same mark resolves per sport.
    if (ds.id === "p") {
      states[st].sports = Object.fromEntries(SPORTS.filter((sp) => (r[`sp_${sp}`] ?? 0) > 0).map((sp) => [sp, r[`sp_${sp}`]]));
      for (const sp of SPORTS) {
        if (!((r[`sp_${sp}`] ?? 0) > 0)) continue;
        for (const w of WINDOWS) {
          rosters[`st|${w}|p|${st}@${sp}`] = {
            total: sportWinCount(r, sp, w),
            names: [
              `${stateName[st] ?? st} — ${sportLabel(sp)}`,
              `all-time ${fmt(r[`sp_${sp}`])} · 30d ${fmt(sportWinCount(r, sp, 30))} · 7d ${fmt(sportWinCount(r, sp, 7))} · 24h ${fmt(sportWinCount(r, sp, 1))}`,
              `sources and enrichment %s count all sports — pick "All sports" for them`,
              `— top ${sportLabel(sp)} venues —`,
              ...(r.spNames?.[sp] ?? []).filter(Boolean),
            ],
          };
        }
      }
    }
  }
  const counties = {};
  for (const [fips, a] of countyData[ds.id].acc) {
    counties[fips] = { ...a };
    const geo = countiesGeo.find((c) => c.id === fips);
    for (const w of WINDOWS) {
      rosters[`cty|${w}|${ds.id}|${fips}`] = {
        total: winCount(a, w),
        names: [
          `${geo?.name ?? fips}, ${FIPS_TO_POSTAL[String(fips).slice(0, 2)]}`,
          `all-time ${fmt(a.n)} · last 30d ${fmt(a.d30)}`,
          ...ds.countyLines(a),
        ],
      };
    }
    if (ds.id === "p") {
      for (const sp of SPORTS) {
        if (!((a[`sp_${sp}`] ?? 0) > 0)) continue;
        for (const w of WINDOWS) {
          rosters[`cty|${w}|p|${fips}@${sp}`] = {
            total: sportWinCount(a, sp, w),
            names: [
              `${geo?.name ?? fips}, ${FIPS_TO_POSTAL[String(fips).slice(0, 2)]} — ${sportLabel(sp)}`,
              `all-time ${fmt(a[`sp_${sp}`])} · last 30d ${fmt(sportWinCount(a, sp, 30))}`,
            ],
          };
        }
      }
    }
  }
  // Debt-board hover: the highest-value rows each script has not touched.
  for (const l of ds.lanes) {
    rosters[`ln|${ds.id}|${l.id}`] = {
      total: ds.board.total - ds.board[l.id],
      names: (ds.board[`${l.id}_missing`] ?? []).filter(Boolean),
    };
  }
  // Subdivision hover: the sub-county choropleth's roster, per window.
  for (const [geoid, a] of countyData[ds.id].sub) {
    const s = cousubById[geoid];
    for (const w of WINDOWS) {
      rosters[`sub|${w}|${ds.id}|${geoid}`] = {
        total: winCount(a, w),
        names: [
          `${s?.name ?? geoid} — ${countyName[geoid.slice(0, 5)] ?? ""}`,
          `all-time ${fmt(a.n)} · last 30d ${fmt(a.d30)}`,
          ...ds.countyLines(a),
        ],
      };
    }
    if (ds.id === "p") {
      for (const sp of SPORTS) {
        if (!((a[`sp_${sp}`] ?? 0) > 0)) continue;
        for (const w of WINDOWS) {
          rosters[`sub|${w}|p|${geoid}@${sp}`] = {
            total: sportWinCount(a, sp, w),
            names: [
              `${s?.name ?? geoid} — ${countyName[geoid.slice(0, 5)] ?? ""} — ${sportLabel(sp)}`,
              `all-time ${fmt(a[`sp_${sp}`])} · last 30d ${fmt(sportWinCount(a, sp, 30))}`,
            ],
          };
        }
      }
    }
  }
  // City-dot hover: static per city (the dot's SIZE is all-time; its color
  // follows the window), so the roster carries every window count as text.
  for (const [key, a] of cityData[ds.id]) {
    rosters[`city|${ds.id}|${key.replace(/"/g, "")}`] = {
      total: a.n,
      names: [
        `${a.city}, ${a.st}`,
        `all-time ${fmt(a.n)} · 30d ${fmt(a.d30)} · 7d ${fmt(a.d7)} · 24h ${fmt(a.d1)}`,
        ...ds.countyLines(a),
      ],
    };
    if (ds.id === "p") {
      for (const sp of SPORTS) {
        if (!((a[`sp_${sp}`] ?? 0) > 0)) continue;
        rosters[`city|p|${key.replace(/"/g, "")}@${sp}`] = {
          total: a[`sp_${sp}`],
          names: [
            `${a.city}, ${a.st} — ${sportLabel(sp)}`,
            `all-time ${fmt(a[`sp_${sp}`])} · 30d ${fmt(sportWinCount(a, sp, 30))} · 7d ${fmt(sportWinCount(a, sp, 7))} · 24h ${fmt(sportWinCount(a, sp, 1))}`,
          ],
        };
      }
    }
  }
  out.apps[ds.historyKey] = {
    states,
    counties,
    statesCovered: Object.keys(states).length,
    cities: cityData[ds.id].size,
    subdivisions: countyData[ds.id].sub.size,
    unassigned: ds.states.get("??")?.n ?? 0,
    foreign: countyData[ds.id].foreign,
    shorelineAssigned: countyData[ds.id].shoreline,
    spillover: Object.fromEntries([...countyData[ds.id].spill.entries()].sort((a, b) => b[1] - a[1])),
    board: { total: ds.board.total, ...Object.fromEntries(ds.lanes.map((l) => [l.id, ds.board[l.id]])) },
    ...(ds.id === "d" ? { offLedger: [...ds.states.values()].reduce((a, r) => a + (r.offLedger ?? 0), 0) } : {}),
    ...(ds.id === "p" ? { sports: sportTotals } : {}),
  };
}
out.apps.doggle.tiles = dogTiles.map((t) => ({ ...t }));
out.apps.doggle.regions = dogRegions.map((r) => ({ state: r.state, n: r.n, d30: r.d30 }));

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ONE binning across apps, windows, and drill levels: log-decade bins.
// Narrowing the window empties the map; it never rescales it.
const BINS = [1, 10, 100, 1000, 10000];
const binOf = (v) => (v <= 0 ? 0 : BINS.filter((b) => v >= b).length);
const binLabel = (i) => (i === 0 ? "0" : i === BINS.length ? `${fmt(BINS.at(-1))}+` : `${fmt(BINS[i - 1])}–${fmt(BINS[i] - 1)}`);
const binAttrs = (row) => WINDOWS.map((w) => `data-b-${w}="${binOf(winCount(row, w))}"`).join(" ");
// Per-sport bins for Pickleague marks. Zero bins are omitted — the recolorer
// reads a missing attribute as 0 — so the sparse sport×window matrix stays
// cheap. data-spb marks the element as sport-aware: without it the recolorer
// would fall back to the all-sports bin instead of showing 0.
const sportBinAttrs = (row) =>
  SPORTS.map((sp) =>
    WINDOWS.map((w) => {
      const b = binOf(sportWinCount(row, sp, w));
      return b ? `data-b-${sp}-${w}="${b}"` : "";
    }).filter(Boolean).join(" "),
  ).filter(Boolean).join(" ");
const markAttrs = (ds, row) => (ds.id === "p" ? `${binAttrs(row)} data-spb="" ${sportBinAttrs(row)}`.trim() : binAttrs(row));
// Pickleague hoverables carry the all-sports key twice: data-hov is live and
// data-hovall is the base the sport filter appends `@<sport>` to.
const spHover = (ds, ...parts) => {
  const h = hoverAttr(...parts);
  return ds.id === "p" ? `${h} ${h.replace('data-hov="', 'data-hovall="')}` : h;
};

// ---------- real-map venue panels (Pickleague): OSM tiles + geofences ----------
// A census-subdivision click opens THE venues on a real map: a static grid of
// OpenStreetMap raster tiles (free, no key, no library — plain web-mercator
// math) under an SVG overlay of geofences. Tile URLs sit in data-src and only
// load when the panel first opens, so a page load requests zero tiles and the
// OSM servers see a handful per click, with attribution. This is the one thing
// on the page that needs the network; everything else stays offline.

const TILE = 256;
const OSM_MAX_Z = 17;
function mercPx(lon, lat, z) {
  const n = TILE * 2 ** z;
  const rad = (lat * Math.PI) / 180;
  return [((lon + 180) / 360) * n, ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n];
}

function miniMapHtml(vs, { fences = true } = {}) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const v of vs) {
    minLon = Math.min(minLon, v.lng); maxLon = Math.max(maxLon, v.lng);
    minLat = Math.min(minLat, v.lat); maxLat = Math.max(maxLat, v.lat);
  }
  // Frame the venue cluster (not the whole subdivision — a rural CCD would
  // shrink every geofence to a subpixel), padded, with a floor so a lone venue
  // still gets its neighbourhood.
  const padLon = Math.max((maxLon - minLon) * 0.18, 0.004);
  const padLat = Math.max((maxLat - minLat) * 0.18, 0.003);
  minLon -= padLon; maxLon += padLon; minLat -= padLat; maxLat += padLat;
  // 520 px fits the drill's detail column without clipping under .vmap's
  // max-width — a clipped map would silently hide edge venues.
  let z = OSM_MAX_Z;
  for (; z > 3; z--) {
    const [ax, ay] = mercPx(minLon, maxLat, z);
    const [bx, by] = mercPx(maxLon, minLat, z);
    if (bx - ax <= 520 && by - ay <= 420) break;
  }
  const [x0, y0] = mercPx(minLon, maxLat, z);
  const [x1, y1] = mercPx(maxLon, minLat, z);
  const W = Math.round(x1 - x0), H = Math.round(y1 - y0);
  const imgs = [];
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor(x1 / TILE); tx++) {
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor(y1 / TILE); ty++) {
      imgs.push(`<img data-src="https://tile.openstreetmap.org/${z}/${tx}/${ty}.png" alt="" style="left:${tx * TILE - Math.round(x0)}px;top:${ty * TILE - Math.round(y0)}px">`);
    }
  }
  const mpp = (40075016.686 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)) / (TILE * 2 ** z);
  const px = (lon, lat) => { const [x, y] = mercPx(lon, lat, z); return [(x - x0).toFixed(1), (y - y0).toFixed(1)]; };
  const shapes = vs
    .map((v) => {
      const sports = (v.sport ?? []).filter((s) => SPORTS.includes(s));
      const [cx, cy] = px(v.lng, v.lat);
      let fence = "";
      // Geofences are drawn only where they are legible. A county frame lands
      // around 60 m per pixel, which renders a 45 m fence at under one pixel and
      // a 250 m one at four — ink that says nothing. Dots carry the county view;
      // the subdivision view, ~10x closer in, keeps the real shapes.
      if (fences) {
        if (v.boundary?.coordinates) {
          const polys = v.boundary.type === "MultiPolygon" ? v.boundary.coordinates : [v.boundary.coordinates];
          const d = polys.map((rings) => rings.map((ring) => `M${ring.map(([lo, la]) => px(lo, la).join(" ")).join("L")}Z`).join("")).join("");
          fence = `<path d="${d}" fill-rule="evenodd" class="vfence"/>`;
        } else if (v.r) {
          fence = `<circle cx="${cx}" cy="${cy}" r="${Math.max(3, v.r / mpp).toFixed(1)}" class="vring"/>`;
        }
      }
      // The whole group is one hover target on the shared layer — the venue's
      // detail roster. The invisible halo keeps a lone 3 px dot hoverable.
      return `<g ${hoverAttr(v.key)} tabindex="0"${sports.length ? ` data-sports="${sports.join(" ")}"` : ""}>${fence}<circle cx="${cx}" cy="${cy}" r="${fences ? 3.2 : 2.6}" class="vdot"/><circle cx="${cx}" cy="${cy}" r="${fences ? 9 : 7}" class="vhit"/></g>`;
    })
    .join("\n");
  return `<div class="vmap" style="width:${W}px;height:${H}px">
${imgs.join("\n")}
<svg class="voverlay" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${fences ? "Venue geofences" : "Venue locations"} on OpenStreetMap">${shapes}</svg>
</div>`;
}

// One detail roster per venue, built ONCE and shared by every mark that stands
// for it: its county dot, its subdivision geofence, and its table row. Names and
// addresses stay in the gitignored page, like every roster.
pickleVenues.forEach((v, i) => {
  v.key = `ven|${i}`;
  const sports = (v.sport ?? []).filter((s) => SPORTS.includes(s)).map(sportLabel).join(", ");
  const traits = [
    v.indoor ? "indoor" : "",
    v.surface ? `${v.surface} surface` : "",
    v.court_count ? `${v.court_count} ${v.court_count === 1 ? "court" : "courts"}` : "",
  ].filter(Boolean).join(" · ");
  rosters[v.key] = {
    total: 1,
    names: [
      v.name,
      v.address ?? "no address recorded",
      ...(sports ? [sports] : []),
      ...(traits ? [traits] : []),
      `${v.boundary?.coordinates ? "court boundary mapped" : "no boundary mapped"} · geofence ${fmt(v.r ?? 0)} m`,
      ...(v.source ? [`source: ${v.source}`] : []),
    ],
  };
});

// Why Doggle gets no real-map view, in its own numbers rather than a shrug.
const DOG_CELLS = new Set(dogFine.map((c) => `${c.clat}|${c.clng}`)).size;
const DOG_PLACE_MB = 11;

// The county-level real map: every venue in the county as a dot on OSM tiles.
function countyMapPanel(county, vs) {
  const bounded = vs.filter((v) => v.boundary?.coordinates).length;
  const cname = `${esc(county.name)}${String(county.name).match(/county|parish|borough|municipality/i) ? "" : " County"}`;
  return `<template class="ctpl" data-cm="cm-${county.id}"><div class="cmap" id="cm-${county.id}">
<h4>${cname} on a real map — <span class="ccount" data-n="${vs.length}">${fmt(vs.length)} ${vs.length === 1 ? "venue" : "venues"}</span></h4>
${miniMapHtml(vs, { fences: false })}
<p class="note">Basemap <a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a> contributors.
The whole county at once — hover (or tab to) any dot for that venue's address, sports, surface, courts and geofence.
<strong>No geofences at this zoom</strong>: a county frame is around 60 m per pixel, so the ${fmt(bounded)} mapped court
boundaries would draw at well under a pixel. Click a subdivision below to get ~10x closer, where the real shapes are
legible. The sport chips filter these dots and the count above.</p>
</div></template>`;
}

function venuePanel(sub, vs) {
  const rows = [...vs]
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((v) => {
      const sports = (v.sport ?? []).filter((s) => SPORTS.includes(s));
      return `<tr ${hoverAttr(v.key)} tabindex="0"${sports.length ? ` data-sports="${sports.join(" ")}"` : ""}><td>${esc(v.name)}</td><td>${v.address ? esc(v.address) : '<span class="mut">—</span>'}</td><td>${esc(sports.map(sportLabel).join(", "))}</td></tr>`;
    })
    .join("\n");
  const bounded = vs.filter((v) => v.boundary?.coordinates).length;
  // Wrapped in <template> so the browser parses it once into an inert fragment
  // and never styles or lays it out. All 221 of these live at once: as real DOM
  // they were ~2 MB and ~12,000 SVG nodes competing with the page you can
  // actually see. Cloned into place on the click that asks for it.
  return `<template class="vtpl" data-vp="vp-${sub.id}"><div class="vpanel" id="vp-${sub.id}">
<h4>${esc(sub.name)} — <span class="vcount" data-n="${vs.length}">${fmt(vs.length)} ${vs.length === 1 ? "venue" : "venues"} on a real map</span></h4>
${miniMapHtml(vs)}
<p class="note">Basemap <a href="https://www.openstreetmap.org/copyright">&copy; OpenStreetMap</a> contributors; tiles
load from openstreetmap.org when this panel opens — the rest of the page works offline. Solid outlines are the
${fmt(bounded)} mapped court boundaries; dashed rings are the app's stored geofence radius for the rest.
<strong>Marks overlap</strong>: courts sharing a park are separate venues a few dozen metres apart, which is a pixel or
two at this zoom — the count above is venues, not blobs, and hover (or tab) on a mark or a row spells out each one:
address, sports, surface, courts, geofence. Venues are assigned point-by-point and can differ by a hair from the
subdivision hover counts (those are cell-based). Map and list are all-time; the sport chips filter both and the count
above follows.</p>
<table class="tbl"><thead><tr><th>Venue</th><th>Address</th><th>Sports</th></tr></thead>
<tbody>${rows}</tbody></table>
</div></template>`;
}

// Every state path is rendered ONCE; the window toggle re-colors it from the
// data-b-* attributes. States with data are clickable and open their county
// drill-down panel.
function nationalMap(ds) {
  const paths = statesGeo
    .map((s) => {
      const r = ds.states.get(s.postal);
      const drill = r && r.n > 0 ? ` data-drill="drill-${ds.id}-${s.postal}"` : "";
      const empty = { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 };
      return `<path d="${svgPath(s.rings)}" fill-rule="evenodd" class="stp bin${binOf(r?.n ?? 0)}" ${spHover(ds, "st", "{scope}", ds.id, s.postal)} ${markAttrs(ds, r ?? empty)}${drill}${drill ? ' tabindex="0" role="button" aria-label="' + esc(s.name) + ", open county detail\"" : ""}/>`;
    })
    .join("\n");
  return `<svg viewBox="0 0 ${MAP_W} ${MAP_H}" class="stmap" role="img" aria-label="${esc(ds.app)} ${esc(ds.unit)} by state">
${paths}
</svg>`;
}

// Debt sparkline, drawn server-side from the committed history. Y is scaled to
// this lane's full history and pinned there for every window, so narrowing the
// toggle never rescales the line.
function spark(ds, laneId, w) {
  const pts = history.filter((h) => inHist(h.date, w) && h[ds.historyKey]).map((h) => debtAt(h, ds.historyKey, laneId));
  const all = history.map((h) => debtAt(h, ds.historyKey, laneId)).filter((v) => v !== null);
  const yMax = Math.max(1, ...all);
  const W = 120, H = 26, pad = 2;
  if (pts.length < 2) {
    const y = H - pad - ((pts[0] ?? 0) / yMax) * (H - 2 * pad);
    return `<svg class="spark" width="${W}" height="${H}" role="img" aria-label="debt history: one snapshot so far"><circle cx="${W - pad - 2}" cy="${y.toFixed(1)}" r="2.5" fill="var(--bar)"/></svg>`;
  }
  const x = (i) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - (v / yMax) * (H - 2 * pad);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return `<svg class="spark" width="${W}" height="${H}" role="img" aria-label="debt over ${pts.length} snapshots, y-max ${fmt(yMax)}"><polyline points="${line}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(pts.at(-1)).toFixed(1)}" r="2.5" fill="var(--bar)"/></svg>`;
}

function delta(ds, laneId, w) {
  const pts = history.filter((h) => inHist(h.date, w) && h[ds.historyKey]);
  if (pts.length < 2) return null;
  return debtAt(pts.at(-1), ds.historyKey, laneId) - debtAt(pts[0], ds.historyKey, laneId);
}

// The app-level debt board: one row per enrichment script, with hover samples,
// windowed delta and the burn-down sparkline.
function debtBoard(ds, w) {
  const rows = ds.lanes
    .map((l) => {
      const done = ds.board[l.id], total = ds.board.total, debt = total - done;
      const p = pct(done, total);
      const dl = delta(ds, l.id, w);
      const dTxt = dl === null ? '<span class="mut">—</span>' : dl === 0 ? "0" : dl > 0 ? `<span class="worse">+${fmt(dl)}</span>` : `<span>&minus;${fmt(-dl)}</span>`;
      return `<tr ${hoverAttr("ln", ds.id, l.id)} tabindex="0">
  <td>${esc(l.label)}</td>
  <td class="num">${fmt(done)} / ${fmt(total)}</td>
  <td class="mcell"><span class="meter"><span class="fill" style="width:${p}%"></span></span> <span class="pct">${p}%</span></td>
  <td class="num">${fmt(debt)}</td>
  <td class="num">${dTxt}</td>
  <td>${spark(ds, l.id, w)}</td>
</tr>`;
    })
    .join("\n");
  return `<table class="tbl"><thead><tr><th>Enrichment</th><th class="num">Done / rows</th><th>Coverage</th><th class="num">Debt</th><th class="num">&Delta; ${w === ALL_WINDOW ? "all time" : windowLabel(w)}</th><th>Debt trend <span class="thsub">since ${esc(history[0].date)}</span></th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

// State-scoped debt table inside a drill panel: same lanes, this state's rows.
function stateDebtTable(ds, r) {
  const rows = ds.lanes
    .map((l) => {
      const done = r[l.id] ?? 0, debt = r.n - done;
      const p = pct(done, r.n);
      return `<tr><td>${esc(l.label)}</td><td class="num">${fmt(done)} / ${fmt(r.n)}</td><td class="mcell"><span class="meter"><span class="fill" style="width:${p}%"></span></span> <span class="pct">${p}%</span></td><td class="num">${fmt(debt)}</td></tr>`;
    })
    .join("");
  return `<h4>Enrichment debt in ${esc(stateName[r.st] ?? r.st)}</h4>
<table class="tbl half"><thead><tr><th>Enrichment</th><th class="num">Done / rows</th><th>Coverage</th><th class="num">Debt</th></tr></thead>
<tbody>${rows}</tbody></table>`;
}

function drillPanels(ds) {
  return [...ds.states.entries()]
    .filter(([st, r]) => st !== "??" && r.n > 0)
    .map(([st, r]) => {
      const fips = POSTAL_TO_FIPS[st];
      const counties = countiesByState.get(fips) ?? [];
      const vb = projectedBbox(counties.map((c) => c.rings));
      const empty = Object.fromEntries(["n", ...ds.lanes.map((l) => l.id), "d1", "d7", "d14", "d30"].map((k) => [k, 0]));
      const paths = counties
        .map((c) => {
          const a = countyData[ds.id].acc.get(c.id) ?? empty;
          const cl = a.n > 0 ? ` data-citylist="cl-${ds.id}-${c.id}" role="button" aria-label="${esc(c.name)}, list its cities"` : "";
          return `<path d="${svgPath(c.rings, { thin: 0.3 })}" fill-rule="evenodd" class="stp bin${binOf(a.n)}" ${spHover(ds, "cty", "{scope}", ds.id, c.id)} ${markAttrs(ds, a)} tabindex="0"${cl}/>`;
        })
        .join("\n");
      const withData = counties.filter((c) => countyData[ds.id].acc.has(c.id));
      const tableRows = withData
        .map((c) => ({ c, a: countyData[ds.id].acc.get(c.id) }))
        .sort((x, y) => y.a.n - x.a.n)
        .map(({ c, a }) => `<tr><td>${esc(c.name)}</td><td class="num">${fmt(a.n)}</td><td class="num">${fmt(a.d30)}</td></tr>`)
        .join("");
      // The level below county lives in the per-county lists and the state
      // table below — the county map itself stays clean (the city dots it
      // used to carry were dropped 2026-08-09, owner ask, once the real-map
      // venue drill landed).
      const stCities = [...cityData[ds.id].entries()].filter(([, a]) => a.st === st).sort((x, y) => y[1].n - x[1].n);
      const cityRow = ([key, a], withCounty) =>
        `<tr ${spHover(ds, "city", ds.id, key.replace(/"/g, ""))} tabindex="0"><td>${esc(a.city)}</td>${withCounty ? `<td>${esc(countyName[a.county] ?? "—")}</td>` : ""}<td class="num">${fmt(a.n)}</td><td class="num">${fmt(a.d30)}</td></tr>`;
      const cityRows = stCities.map((e) => cityRow(e, true)).join("");
      // One pre-rendered panel per county with data; a county click shows it:
      // the county's SUBDIVISION choropleth (census CCDs — they tile the
      // county completely) plus the full list of its cities.
      const cityLists = withData
        .map((c) => {
          const cs = stCities.filter(([, a]) => a.county === c.id);
          const rows = cs.map((e) => cityRow(e, false)).join("");
          const subs = cousubsByCounty.get(c.id) ?? [];
          const emptySub = Object.fromEntries(["n", ...ds.lanes.map((l) => l.id), "d1", "d7", "d14", "d30"].map((k) => [k, 0]));
          const withVenues = (s) => ds.id === "p" && venuesByCousub.has(s.id);
          const subMap = subs.length
            ? `<svg viewBox="${projectedBbox(subs.map((s) => s.rings), 3).map((v) => v.toFixed(1)).join(" ")}" class="ctymap submap" role="img" aria-label="${esc(c.name)} subdivisions">
${subs.map((s) => {
                const a = countyData[ds.id].sub.get(s.id) ?? emptySub;
                const vp = withVenues(s) ? ` data-venues="vp-${s.id}" role="button" aria-label="${esc(s.name)}, open its venues on a real map"` : "";
                return `<path d="${svgPath(s.rings, { thin: 0.25 })}" fill-rule="evenodd" class="stp bin${binOf(a.n)}" ${spHover(ds, "sub", "{scope}", ds.id, s.id)} ${markAttrs(ds, a)} tabindex="0"${vp}/>`;
              }).join("\n")}
</svg>
<p class="note">Census county subdivisions — same bins, same window behaviour; hover one for its counts and enrichment.${
                ds.id === "p" ? " <strong>Click a subdivision for its venues on a real map</strong> — geofences, names and addresses." : ""
              }</p>
${ds.id === "p" ? subs.filter(withVenues).map((s) => venuePanel(s, venuesByCousub.get(s.id))).join("\n") : ""}`
            : "";
          const cname = `${esc(c.name)}${String(c.name).match(/county|parish|borough|municipality/i) ? "" : " County"}`;
          // The county-level real map sits above the subdivision choropleth:
          // the whole county on OSM first, then the choropleth to pick a
          // subdivision and go closer. Templated like everything else in here,
          // so opening a state does not build 58 counties' worth of maps.
          const countyMap = ds.id === "p" && venuesByCounty.has(c.id) ? countyMapPanel(c, venuesByCounty.get(c.id)) : "";
          return `<div class="citylist" id="cl-${ds.id}-${c.id}" hidden>
<h4>${cname} — ${fmt(cs.reduce((x, [, a]) => x + a.n, 0))} ${esc(ds.unit)} in ${cs.length} ${cs.length === 1 ? "city" : "cities"}</h4>
${countyMap}
${subMap}
<table class="tbl half"><thead><tr><th>City</th><th class="num">All-time</th><th class="num">30d</th></tr></thead>
<tbody>${rows || `<tr><td colspan="3" class="empty">No city resolved here — the ${esc(ds.unit)} sit farther than ~30 km from any listed city.</td></tr>`}</tbody></table>
</div>`;
        })
        .join("\n");
      const regions =
        ds.id === "d" && dogRegions.some((g) => g.state === st)
          ? `<h4>Named ingestion regions</h4>
<p class="note">The ledger's own sub-state units for ${esc(stateName[st] ?? st)} — coverage by region, all-time and last 30d.</p>
<table class="tbl half"><thead><tr><th>Region</th><th class="num">Places</th><th class="num">30d</th></tr></thead>
<tbody>${dogRegions.filter((g) => g.state === st).map((g) => `<tr><td>${esc(g.name)}</td><td class="num">${fmt(g.n)}</td><td class="num">${fmt(g.d30)}</td></tr>`).join("")}</tbody></table>`
          : "";
      // The biggest county opens automatically so the detail column is never
      // an empty pane when the panel appears.
      const defaultCl = withData.length
        ? `cl-${ds.id}-${withData.map((c) => ({ c, n: countyData[ds.id].acc.get(c.id).n })).sort((x, y) => y.n - x.n)[0].c.id}`
        : "";
      // Inert until opened. One state's panel is a county choropleth, a
      // subdivision map per county, every city list and every venue panel; all
      // 20 of them in live DOM meant thousands of SVG paths laid out for panels
      // you may never open. The <template> is parsed once and never styled.
      return `<template class="dtpl" data-drill-tpl="drill-${ds.id}-${st}"><section class="drill" id="drill-${ds.id}-${st}"${defaultCl ? ` data-defcl="${defaultCl}"` : ""} hidden>
<div class="dhead"><h3>${esc(ds.app)} — ${esc(stateName[st] ?? st)} by county</h3><button class="dclose" type="button">close &times;</button></div>
<div class="drillgrid">
<div>
<svg viewBox="${vb.map((v) => v.toFixed(1)).join(" ")}" class="ctymap" role="img" aria-label="${esc(stateName[st] ?? st)} counties">
${paths}
</svg>
<p class="note">County split is geometric (~1 km cells, point-in-polygon) and can differ by a hair from the
ledger-based state total above. ${withData.length} of ${counties.length} counties have ${esc(ds.unit)}.
Hover a county for its enrichment percentages; <strong>click it and the panel on the right follows</strong> —
its ${ds.id === "p" ? "real map, subdivision map and city list" : "subdivision map and city list"}.
The ${fmt(stCities.length)} cities live in those lists and the tables below.</p>
${ds.id === "d"
  ? `<p class="note">Doggle has <strong>no real-map view</strong> at county or subdivision level, deliberately.
Pickleague ships 4,072 venue points, so its dots cost about 650 KB; Doggle has ${fmt(dogBoard.total)} places in
${fmt(DOG_CELLS)} distinct ~1 km cells, which would add roughly 3 MB to a page already over ${Math.round(DOG_PLACE_MB)} MB.
The choropleths carry the density either way — what a basemap adds is street context, at a price this page cannot pay yet.</p>`
  : ""}
${stateDebtTable(ds, r)}
${ds.id === "p"
  ? `<h4>Sport mix in ${esc(stateName[r.st] ?? r.st)}</h4>
<p class="note">All-time and last 30d, as of collection; a multi-sport venue counts once per sport.</p>
<table class="tbl half"><thead><tr><th>Sport</th><th class="num">All-time</th><th class="num">30d</th></tr></thead>
<tbody>${SPORTS.filter((sp) => (r[`sp_${sp}`] ?? 0) > 0)
      .map((sp) => `<tr><td>${esc(sportLabel(sp))}</td><td class="num">${fmt(r[`sp_${sp}`])}</td><td class="num">${fmt(r[`sp_${sp}_d30`] ?? 0)}</td></tr>`)
      .join("")}</tbody></table>`
  : ""}
</div>
<div class="citylists">
<p class="note cl-hint">Click a county on the left to see its subdivisions and cities here.</p>
${cityLists}
</div>
</div>
<details><summary>All cities in ${esc(stateName[st] ?? st)} (${fmt(stCities.length)})</summary>
<table class="tbl half"><thead><tr><th>City</th><th>County</th><th class="num">All-time</th><th class="num">30d</th></tr></thead>
<tbody>${cityRows || `<tr><td colspan="4" class="empty">Nothing here.</td></tr>`}</tbody></table>
</details>
<details><summary>County table</summary>
<table class="tbl half"><thead><tr><th>County</th><th class="num">All-time</th><th class="num">30d</th></tr></thead>
<tbody>${tableRows || `<tr><td colspan="3" class="empty">Nothing here.</td></tr>`}</tbody></table>
</details>
${regions}
</section></template>`;
    })
    .join("\n");
}

function regionTable(ds, w, sport = "all") {
  const cnt = (s) => {
    const row = ds.states.get(s);
    if (!row) return 0;
    return sport === "all" ? winCount(row, w) : sportWinCount(row, sport, w);
  };
  const rows = Object.entries(REGIONS)
    .map(([name, sts]) => {
      const covered = sts.filter((s) => cnt(s) > 0);
      const total = sts.reduce((a, s) => a + cnt(s), 0);
      return { name, covered: covered.length, of: sts.length, total };
    })
    .sort((a, b) => b.total - a.total)
    .map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${r.covered} / ${r.of}</td><td class="num">${fmt(r.total)}</td></tr>`)
    .join("");
  return `<table class="tbl half"><thead><tr><th>Census region</th><th class="num">States covered</th><th class="num">${esc(ds.unit[0].toUpperCase() + ds.unit.slice(1))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const legend = `<div class="legend">${Array.from({ length: BINS.length + 1 }, (_, i) => `<span class="chip"><span class="sw bin${i}"></span>${binLabel(i)}</span>`).join("")}<span class="chip lgnote">${"log-decade bins, fixed across apps, windows and drill levels"}</span></div>`;

const tabBar = `<div class="tabbar" role="tablist" aria-label="App">${datasets
  .map((ds, i) => `<button class="appbtn" role="tab" data-app="${ds.id}" aria-selected="${i === 0}">${esc(ds.app)}</button>`)
  .join("")}</div>`;

const tileLedger = `<h2>Ingest tile ledger</h2>
<p class="note">The queue behind the map: each state is split into bbox tiles and loaded tile by tile.
This table is the ledger <strong>as of now</strong> — it does not move with the window toggle above.
&ldquo;Loaded&rdquo; below &ldquo;features&rdquo; means the loader filtered or failed some features.</p>
<table class="tbl"><thead><tr><th>State</th><th class="num">Done / tiles</th><th></th><th class="num">Pending</th><th class="num">Running</th><th class="num">Errored</th><th class="num">Features</th><th class="num">Loaded</th><th>Last done</th></tr></thead>
<tbody>${dogTiles
    .map((t) => {
      const prog = t.tiles ? Math.round((t.done / t.tiles) * 100) : 0;
      return `<tr><td>${esc(t.state)}</td><td class="num">${t.done} / ${t.tiles}</td><td class="mcell"><span class="meter"><span class="fill" style="width:${prog}%"></span></span></td><td class="num">${t.pending}</td><td class="num">${t.running}</td><td class="num">${t.errored ? `<strong class="warntxt">${t.errored}</strong>` : 0}</td><td class="num">${fmt(t.features)}</td><td class="num">${fmt(t.loaded)}</td><td class="dt">${t.last_done ? esc(dayOf(t.last_done)) : "—"}</td></tr>`;
    })
    .join("") || `<tr><td colspan="9" class="empty">No ingest tiles yet.</td></tr>`}</tbody></table>`;

const appPanels = datasets
  .map((ds, i) => {
    const meta = out.apps[ds.historyKey];
    const offNote =
      ds.id === "d" && meta.offLedger
        ? `<p class="note"><strong>${fmt(meta.offLedger)}</strong> places are <strong>off-ledger</strong> — inside no defined region and no ingest tile, so no pipeline
run accounts for them; they are placed by nearest city and flagged per-state on hover. Worth knowing which script wrote them.</p>`
        : "";
    const spillTotal = Object.values(meta.spillover).reduce((a, v) => a + v, 0);
    const spillNote = spillTotal
      ? `<p class="note"><strong>${fmt(spillTotal)}</strong> ${esc(ds.unit)} sit <strong>geographically</strong> in states the ledger does not credit
(${Object.entries(meta.spillover).map(([s, v]) => `${s} ${fmt(v)}`).join(", ")}) — ingest tile bboxes are rectangles and cross state lines.
They are in the shaded states' totals above but in no county panel.</p>`
      : "";
    const unNote = meta.unassigned ? `<p class="note">${fmt(meta.unassigned)} ${esc(ds.unit)} could not be assigned to any state at all — on no map, stated here instead.</p>` : "";
    const ctyNote = meta.foreign
      ? `<p class="note"><strong>${fmt(meta.foreign)}</strong> ${esc(ds.unit)} are <strong>not in the United States at all</strong> — ingest tile
rectangles cross the national border (the cluster is British Columbia, north of the WA tiles). They are inside the shaded
states' ledger totals above but in no county panel. A per-tile bbox clip against the border would stop this at the source.</p>`
      : "";
    // Pickleague's region table follows the sport filter too: one small table
    // per sport per window, visibility-toggled — never recomputed client-side.
    const vpNote =
      ds.id === "p" && venuesUnplaced
        ? `<p class="note">${fmt(venuesUnplaced)} ${venuesUnplaced === 1 ? "venue is" : "venues are"} in <strong>no real-map panel</strong> — outside every
vendored census subdivision (over a state or national border), so no subdivision click can list ${venuesUnplaced === 1 ? "it" : "them"}.</p>`
        : "";
    const winTables = (ds.id === "p" ? ["all", ...SPORTS] : ["all"])
      .map((sp) => {
        const inner = WINDOWS.map((w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${regionTable(ds, w, sp)}</div>`).join("\n");
        // data-spBLOCK, not data-sp: the chip buttons carry data-sp too, so a
        // `[data-sp]` visibility sweep hid every chip except the selected one —
        // which is how the control for choosing a sport disappeared the moment
        // you chose one.
        return ds.id === "p" ? `<div data-spblock="${sp}"${sp === "all" ? "" : " hidden"}>${inner}</div>` : inner;
      })
      .join("\n");
    const winBoards = WINDOWS.map((w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${debtBoard(ds, w)}</div>`).join("\n");
    const pairTotal = Object.values(sportTotals).reduce((a, t) => a + t.n, 0);
    const sportBar =
      ds.id === "p"
        ? `<div class="sportbar" role="group" aria-label="Sport">
<span class="lbl">Sport</span>
<button class="spbtn" data-sp="all" aria-pressed="true">All sports</button>
${SPORTS.map((sp) => `<button class="spbtn" data-sp="${sp}" data-label="${esc(sportLabel(sp))}" aria-pressed="false">${esc(sportLabel(sp))} <span class="spn">${fmt(sportTotals[sp].n)}</span></button>`).join("\n")}
</div>
<p class="note">The sport filter re-colors every map on this tab (states, counties, subdivisions, city dots), scopes
hover rosters and the census-region table, and persists across visits. A venue can host several sports — the
${SPORTS.length} sports sum to ${fmt(pairTotal)} across ${fmt(ds.board.total)} venues, so a multi-sport venue counts
once per sport. Enrichment debt, coverage %s, sources and the county/city tables always count <strong>all sports</strong>.</p>`
        : "";
    const sportMix =
      ds.id === "p"
        ? `<h2>Sport mix</h2>
<p class="note">Every venue by sport, app-wide — all-time and last 30 days as of collection; this table does not move
with the window or sport controls. Share is of all ${fmt(ds.board.total)} venues, so shares sum past 100% where venues
host several sports.</p>
<table class="tbl half"><thead><tr><th>Sport</th><th class="num">Venues</th><th>Share</th><th class="num">30d</th></tr></thead>
<tbody>${SPORTS.map((sp) => {
            const t = sportTotals[sp];
            const p = pct(t.n, ds.board.total);
            return `<tr><td>${esc(sportLabel(sp))}</td><td class="num">${fmt(t.n)}</td><td class="mcell"><span class="meter"><span class="fill" style="width:${p}%"></span></span> <span class="pct">${p}%</span></td><td class="num">${fmt(t.d30)}</td></tr>`;
          }).join("")}</tbody></table>`
        : "";
    // The app's name used to live only in the tab bar. The dashboard hides that
    // bar and shows the panels stacked, so without this heading two very
    // different maps sit on one page with nothing saying which app each is.
    // Sticky, together with the sport chips, so both stay answerable while you
    // scroll a map that is taller than the screen.
    return `<div class="apppanel" data-app-panel="${ds.id}" data-app-scope="${ds.historyKey}"${i === 0 ? "" : " hidden"}>
<div class="appstrip">
<div class="appname">${esc(ds.app)}</div>
${sportBar}
</div>
<h2>${esc(ds.unit[0].toUpperCase() + ds.unit.slice(1))} by state</h2>
<p class="note">Click (or press Enter on) a shaded state for its county drill-down, state debt table and regions.</p>
<div class="maprow">
<div>${nationalMap(ds)}</div>
<div>${winTables}
${offNote}${spillNote}${unNote}${ctyNote}${vpNote}</div>
</div>
${drillPanels(ds)}
${sportMix}
<h2>Enrichment debt</h2>
<p class="note">Debt is rows the script has not touched yet, app-wide; per-state debt lives in each drill panel.
The &Delta; and trend columns read this lane's own daily snapshots (<code>data/enrich.json</code>) — debt moves
when the script runs <em>or</em> when ingestion adds rows, and a rising line during an ingest is expected, not a
regression. Hover a lane for the highest-value rows still missing it.${ds.id === "p" ? " Debt counts all venues regardless of the sport filter." : ""}</p>
${winBoards}
${ds.id === "d" ? tileLedger : ""}
</div>`;
  })
  .join("\n");

const histNote =
  history.length < 2
    ? `<p class="note"><strong>First enrichment snapshot in this file.</strong> Trend and &Delta; columns come alive as daily runs add points.</p>`
    : "";

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Geographic coverage &amp; enrichment</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --warn:#b45309;
  --b1:#86b6ef; --b2:#649de6; --b3:#4383d8; --b4:#2a68c0; --b5:#1c4f9c; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100;
  --b1:#184f95; --b2:#2f65ab; --b3:#4a80cc; --b4:#6ea3e8; --b5:#9cc3f5; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100;
  --b1:#184f95; --b2:#2f65ab; --b3:#4a80cc; --b4:#6ea3e8; --b5:#9cc3f5; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1180px;margin:0 auto;padding:28px 20px 60px}
.maprow{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:18px;align-items:start}
.drillgrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:start}
@media (max-width:920px){.maprow,.drillgrid{grid-template-columns:1fr}}
.citylists .cl-hint{font-style:italic}
.citylists:has(.citylist:not([hidden])) .cl-hint{display:none}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 6px} h3{font-size:14px;margin:0} h4{font-size:13px;margin:14px 0 2px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:8px 0}
.tabbar{display:flex;gap:6px;margin:14px 0 4px}
.appbtn{font:inherit;font-size:13.5px;padding:5px 16px;border-radius:20px;cursor:pointer;
  background:var(--surface);color:var(--ink-2);border:1px solid var(--border)}
.appbtn[aria-selected="true"]{background:var(--bar);color:#fff;border-color:var(--bar);font-weight:600}
/* --stick is 0 standalone; the dashboard sets it to its own bar height so this
   strip parks under the window toggle instead of on top of it. */
:root{--stick:0px}
.appstrip{position:sticky;top:calc(var(--stick) + 40px);z-index:6;background:var(--page);
  border-bottom:1px solid var(--border);padding:8px 0 7px;margin:14px 0 6px}
.appname{font-size:17px;font-weight:700;letter-spacing:.01em}
.sportbar{display:flex;gap:6px;margin:8px 0 0;flex-wrap:wrap;align-items:center}
.sportbar .lbl{font-size:12px;color:var(--muted);margin-right:2px}
.spbtn{font:inherit;font-size:12.5px;padding:3px 12px;border-radius:20px;cursor:pointer;
  background:var(--surface);color:var(--ink-2);border:1px solid var(--border)}
.spbtn[aria-pressed="true"]{background:var(--bar);color:#fff;border-color:var(--bar);font-weight:600}
.spbtn .spn{font-size:11px;opacity:.75;font-variant-numeric:tabular-nums}
.legend{display:flex;gap:12px;margin:12px 0 4px;font-size:12px;color:var(--ink-2);flex-wrap:wrap;align-items:center}
.legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px;border:1px solid var(--border)}
.legend .lgnote{color:var(--muted);font-size:11px}
.bin0{fill:var(--page)} .bin1{fill:var(--b1)} .bin2{fill:var(--b2)} .bin3{fill:var(--b3)} .bin4{fill:var(--b4)} .bin5{fill:var(--b5)}
.sw.bin0{background:var(--page)} .sw.bin1{background:var(--b1)} .sw.bin2{background:var(--b2)}
.sw.bin3{background:var(--b3)} .sw.bin4{background:var(--b4)} .sw.bin5{background:var(--b5)}
.stmap,.ctymap{width:100%;height:auto;display:block;margin:6px 0}
.ctymap{max-width:560px}
.stp{stroke:var(--page);stroke-width:0.75;vector-effect:non-scaling-stroke}
.stp[data-drill],.stp[data-citylist],.stp[data-venues]{cursor:pointer}
.stp:hover,.stp:focus{stroke:var(--ink);stroke-width:1.4;outline:none}
.drill{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:12px 0}
.dhead{display:flex;justify-content:space-between;align-items:baseline}
.dclose{font:inherit;font-size:12px;color:var(--muted);background:none;border:1px solid var(--border);border-radius:16px;padding:2px 10px;cursor:pointer}
details{margin-top:8px;font-size:12.5px} summary{cursor:pointer;color:var(--muted)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl.half{max-width:560px}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.thsub{text-transform:none;letter-spacing:0;font-weight:400}
.meter{display:inline-block;width:110px;height:8px;border-radius:4px;background:color-mix(in srgb, var(--bar) 14%, transparent);vertical-align:middle;overflow:hidden}
.meter .fill{display:block;height:100%;border-radius:4px;background:var(--bar)}
.mcell{width:170px;white-space:nowrap}
.pct{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.spark{display:block}
.worse{color:var(--warn)}
.mut{color:var(--muted)}
.warntxt{color:var(--warn)}
.dt{font-variant-numeric:tabular-nums;color:var(--muted)}
.vpanel{margin:10px 0}
.cmap{margin:8px 0 14px}
.vmap{position:relative;overflow:hidden;border-radius:8px;border:1px solid var(--border);margin:8px 0;max-width:100%}
.vmap img{position:absolute;width:256px;height:256px}
.voverlay{position:absolute;left:0;top:0;display:block}
.vfence{fill:rgba(42,104,192,.22);stroke:#1c4f9c;stroke-width:1.5}
.vring{fill:rgba(42,104,192,.10);stroke:#1c4f9c;stroke-width:1.5;stroke-dasharray:4 3}
.vdot{fill:#1c4f9c;fill-opacity:.85;stroke:#fff;stroke-width:1.2}
.vhit{fill:transparent;stroke:none}
.sp-hide{display:none}
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Geographic coverage &amp; enrichment</h1>
<p class="meta">Where the ingestion pipelines have been, on real geography, and how far behind each
enrichment script is — one tab per app. Hover (or tab to) a state for its pipeline detail; click a
shaded one to drill into counties, city dots, its own debt table, and (where defined) named regions.
<strong>A blank state means the pipeline has not run there</strong> — "we can't see it", not "nothing exists
there". This page counts places and venues, not people, so account exclusions do not apply.
<strong>Pickleague is multi-sport</strong>: its default view combines all ${SPORTS.length} sports into one count, and the
<em>sport chips</em> at the top of the Pickleague section split every map by sport. Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WIN, "re-colors the maps and scopes the debt Δ/trend; coverage %s are as of now")}
${tabBar}
${legend}
${histNote}
${appPanels}
</main>
${hoverLayer(rosters, { unit: "row/rows" })}
${windowScript(WINDOWS, DEFAULT_WIN)}
<script>
(function () {
  // Re-color every map from its precomputed per-window bins. Rides on the
  // window machinery: windowScript calls setHoverScope on every toggle, so
  // wrapping it keeps ONE source of truth for the active window. Sport-aware
  // marks (data-spb, Pickleague only) read their per-sport attribute instead
  // when a sport is selected; a missing attribute is a 0.
  var sport = 'all';
  var lastWin = 'all';

  // Venue-level marks and rows (real-map panels) carry their sports verbatim.
  // Scoped to a root so it can be re-run on a panel cloned in later.
  function applySport(root) {
    root.querySelectorAll('[data-sports]').forEach(function (el) {
      var on = sport === 'all' || (' ' + el.getAttribute('data-sports') + ' ').indexOf(' ' + sport + ' ') !== -1;
      el.classList.toggle('sp-hide', !on);
    });
    // Panel headers must never read as "43 shrank to 10" — the other 33 are
    // other sports, not dropped records, so the header names the sport and
    // keeps the total in view. Runs per root so a panel cloned in later gets a
    // correct header immediately rather than at the next toggle.
    var chip = document.querySelector('.spbtn[data-sp="' + sport + '"]');
    var lbl = (chip && chip.getAttribute('data-label')) || sport;
    var panels = root.querySelectorAll ? root.querySelectorAll('.vpanel') : [];
    (root.classList && root.classList.contains('vpanel') ? [root] : panels).forEach(function (p) {
      var c = p.querySelector('.vcount');
      if (!c) return;
      var total = Number(c.getAttribute('data-n'));
      if (sport === 'all') {
        c.textContent = total + (total === 1 ? ' venue' : ' venues') + ' on a real map';
      } else {
        var shown = p.querySelectorAll('tbody tr:not(.sp-hide)').length;
        c.textContent = shown + ' of ' + total + (total === 1 ? ' venue' : ' venues') + ' here list ' + lbl;
      }
    });
    // Same rule for the county map, but it has no table to count — the visible
    // dots are the population, so count those.
    var cmaps = root.querySelectorAll ? root.querySelectorAll('.cmap') : [];
    (root.classList && root.classList.contains('cmap') ? [root] : cmaps).forEach(function (p) {
      var c = p.querySelector('.ccount');
      if (!c) return;
      var total = Number(c.getAttribute('data-n'));
      if (sport === 'all') {
        c.textContent = total + (total === 1 ? ' venue' : ' venues');
      } else {
        var shown = p.querySelectorAll('g[data-sports]:not(.sp-hide)').length;
        c.textContent = shown + ' of ' + total + (total === 1 ? ' venue' : ' venues') + ' list ' + lbl;
      }
    });
  }
  function recolor(w) {
    lastWin = String(w);
    document.querySelectorAll('[data-b-all]').forEach(function (el) {
      var key = 'data-b-' + (sport !== 'all' && el.hasAttribute('data-spb') ? sport + '-' : '') + lastWin;
      var b = el.getAttribute(key) || '0';
      el.setAttribute('class', el.getAttribute('class').replace(/\\bbin\\d\\b/, 'bin' + b));
    });
  }
  var prev = window.setHoverScope;
  window.setHoverScope = function (s) { if (prev) prev(s); recolor(String(s)); };
  var btn = document.querySelector('.winbtn[aria-pressed="true"]');
  recolor(btn ? btn.dataset.win : 'all');

  // Sport filter (Pickleague tab): re-colors sport-aware marks, swaps hover
  // keys (data-hovall is the all-sports base; sport keys append @<sport>),
  // and shows the matching [data-sp] blocks. Persists like the window choice.
  function selectSport(sp) {
    sport = sp;
    document.querySelectorAll('.spbtn').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.sp === sp)); });
    document.querySelectorAll('[data-spblock]').forEach(function (el) { el.hidden = el.getAttribute('data-spblock') !== sp; });
    document.querySelectorAll('[data-hovall]').forEach(function (el) {
      var base = el.getAttribute('data-hovall');
      el.setAttribute('data-hov', sp === 'all' ? base : base + '@' + sp);
    });
    applySport(document);
    recolor(lastWin);
    try { localStorage.setItem('studio-geo-sport', sp); } catch (e) {}
  }
  document.querySelectorAll('.spbtn').forEach(function (b) {
    b.addEventListener('click', function () { selectSport(b.dataset.sp); });
  });
  var savedSport = null;
  try { savedSport = localStorage.getItem('studio-geo-sport'); } catch (e) {}
  if (savedSport && savedSport !== 'all' && document.querySelector('.spbtn[data-sp="' + savedSport + '"]')) selectSport(savedSport);

  // App tabs: one visible panel; the choice persists across visits.
  function selectApp(id) {
    document.querySelectorAll('.appbtn').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.app === id)); });
    document.querySelectorAll('[data-app-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-app-panel') !== id; });
    try { localStorage.setItem('studio-geo-app', id); } catch (e) {}
  }
  document.querySelectorAll('.appbtn').forEach(function (b) {
    b.addEventListener('click', function () { selectApp(b.dataset.app); });
  });
  var savedApp = null;
  try { savedApp = localStorage.getItem('studio-geo-app'); } catch (e) {}
  if (savedApp && document.querySelector('[data-app-panel="' + savedApp + '"]')) selectApp(savedApp);

  // Everything the sidebar/sport/window controls stamp onto markup, applied to a
  // subtree — so content cloned in later is styled exactly like content that was
  // there at load, instead of being stuck at whatever the template froze.
  function hydrate(root) {
    if (sport !== 'all') {
      root.querySelectorAll('[data-hovall]').forEach(function (el) {
        el.setAttribute('data-hov', el.getAttribute('data-hovall') + '@' + sport);
      });
    }
    applySport(root);
    recolor(lastWin);
  }

  // Drill-down: one open panel at a time; click again (or close) to dismiss.
  // The panel is cloned out of its template the first time it is asked for.
  function toggle(id) {
    var was = document.getElementById(id);
    if (!was) {
      var tpl = document.querySelector('.dtpl[data-drill-tpl="' + id + '"]');
      if (!tpl) return;
      was = tpl.content.firstElementChild.cloneNode(true);
      tpl.parentNode.insertBefore(was, tpl);
      hydrate(was);
    }
    var open = was && was.hidden;
    document.querySelectorAll('.drill').forEach(function (d) { d.hidden = true; });
    if (was && open) {
      was.hidden = false;
      was.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Never present an empty detail column: the biggest county starts open.
      if (!was.querySelector('.citylist:not([hidden])') && was.dataset.defcl) toggleCounty(was.dataset.defcl, true);
    }
  }
  // County click: show that county's subdivision map + city list in the detail
  // column; one open per panel, click again to dismiss. quiet skips the
  // scroll for the auto-opened default.
  function toggleCounty(id, quiet) {
    var el = document.getElementById(id);
    if (!el) return;
    var open = el.hidden;
    var panel = el.closest('.drill') || document;
    panel.querySelectorAll('.citylist').forEach(function (d) { d.hidden = true; });
    // The county's own OSM map is templated too: built and its tiles fetched on
    // the first open of this county, never on the open of the state above it.
    var ctpl = el.querySelector('.ctpl');
    if (open && ctpl) {
      var cm = ctpl.content.firstElementChild.cloneNode(true);
      ctpl.parentNode.insertBefore(cm, ctpl);
      ctpl.remove();
      hydrate(cm);
      cm.querySelectorAll('img[data-src]').forEach(function (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); });
    }
    if (open) {
      el.hidden = false;
      if (!quiet) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  // Subdivision click: open its venues-on-a-real-map panel. The panel lives in
  // an inert <template> until now — cloned on first open, then reused. Tile imgs
  // hold their URL in data-src until that same moment, so a page load builds no
  // venue DOM and fetches no map tiles.
  function toggleVenues(id) {
    var el = document.getElementById(id);
    if (!el) {
      var tpl = document.querySelector('.vtpl[data-vp="' + id + '"]');
      if (!tpl) return;
      el = tpl.content.firstElementChild.cloneNode(true);
      tpl.parentNode.insertBefore(el, tpl);
      // Content that arrives after a sport was chosen must arrive already
      // filtered, or the panel would show every sport until the next toggle.
      hydrate(el);
    }
    var open = el.hidden;
    var wrap = el.closest('.citylist') || document;
    wrap.querySelectorAll('.vpanel').forEach(function (d) { d.hidden = true; });
    if (open) {
      el.querySelectorAll('img[data-src]').forEach(function (i) { i.src = i.getAttribute('data-src'); i.removeAttribute('data-src'); });
      el.hidden = false;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
  function act(target) {
    var el = target && target.closest ? target.closest('[data-drill],[data-citylist],[data-venues],.dclose') : null;
    if (!el) return false;
    if (el.hasAttribute && el.hasAttribute('data-drill')) toggle(el.getAttribute('data-drill'));
    else if (el.hasAttribute && el.hasAttribute('data-citylist')) toggleCounty(el.getAttribute('data-citylist'));
    else if (el.hasAttribute && el.hasAttribute('data-venues')) toggleVenues(el.getAttribute('data-venues'));
    else el.closest('.drill').hidden = true;
    return true;
  }
  document.addEventListener('click', function (e) { act(e.target); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (act(e.target)) e.preventDefault();
  });
})();
</script>`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

for (const ds of datasets) {
  const meta = out.apps[ds.historyKey];
  const worst = ds.lanes.map((l) => ({ l: l.label, debt: ds.board.total - ds.board[l.id] })).sort((a, b) => b.debt - a.debt)[0];
  console.log(
    `Geo ${ds.app}: ${meta.statesCovered} states, ${fmt(Object.values(meta.states).reduce((a, s) => a + s.n, 0))} ${ds.unit}, ` +
      `${Object.keys(meta.counties).length} counties · worst debt "${worst.l}" ${fmt(worst.debt)}`,
  );
}
console.log(`Geo Pickleague sports: ${SPORTS.length} (${SPORTS.map((s) => `${sportLabel(s)} ${fmt(sportTotals[s].n)}`).join(", ")})`);
console.log(`Enrichment history: ${history.length} snapshot${history.length === 1 ? "" : "s"}`);
console.log(`Wrote ${DATA_FILE} and ${ENRICH_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains place/venue names)`);
console.log(`Wrote reports/geo.html`);
