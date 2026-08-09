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

import { ROOT, loadEnv, readConfig, runSql } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";
import { loadTopo, decode, bboxOf, contains, svgPath, projectedBbox, MAP_W, MAP_H, FIPS_TO_POSTAL, POSTAL_TO_FIPS } from "./lib/usmap.mjs";

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

// Fine (~1 km) cells for the county drill-down, carrying the enrichment flags
// so county hover can state its own percentages. Counted in SQL, assigned to a
// county in Node by point-in-polygon in raw lon/lat.
const fineCellsSql = (table, lanes) => `
select round(lat::numeric, 2) clat, round(lng::numeric, 2) clng, count(*)::int n,
    ${laneCols(lanes)},
    ${WINDOW_COLS("created_at")}
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

const [dogStatesRaw, dogOffCells, dogTiles, dogRegions, pickleCells, dogFine, pickleFine, dogBoard, pickleBoard] = await Promise.all([
  runSql(DOGGLE, dogPlacesSql),
  runSql(DOGGLE, dogOffLedgerSql),
  runSql(DOGGLE, dogTilesSql),
  runSql(DOGGLE, dogRegionsSql),
  runSql(PICKLE, pickleVenuesSql),
  runSql(DOGGLE, fineCellsSql("dog_places", LANES.d)),
  runSql(PICKLE, fineCellsSql("venues", LANES.p)),
  runSql(DOGGLE, boardSql("dog_places", LANES.d, "order by dog_score desc nulls last, name")).then((r) => r[0]),
  runSql(PICKLE, boardSql("venues", LANES.p, "order by name")).then((r) => r[0]),
]);

const collectedAt = new Date().toISOString();
const today = collectedAt.slice(0, 10);
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WIN = ALL_WINDOW;
const winCount = (row, w) => (w === ALL_WINDOW ? row.n : row[`d${w}`]) ?? 0;
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

const PICKLE_KEYS = ["n", "osm", "google", "indoor", "courtsum", ...LANES.p.map((l) => l.id), "d1", "d7", "d14", "d30"];
const pickleStates = foldCells(new Map(), pickleCells.map((c) => ({ ...c, courtsum: c.courtsum ?? c.courtSum ?? 0 })), PICKLE_KEYS, Object.fromEntries(PICKLE_KEYS.map((k) => [k, 0])));

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
    lanes: LANES.p, historyKey: "pickleague",
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
function countyCounts(fine, laneIds) {
  const keys = ["n", ...laneIds, ...STANDARD_WINDOWS.map((w) => `d${w}`)];
  const acc = new Map(); // fips5 -> {n, <lanes>, d1, d7, d14, d30}
  const spill = new Map(); // postal -> n
  let foreign = 0, shoreline = 0;
  for (const cell of fine) {
    const lon = Number(cell.clng), lat = Number(cell.clat);
    let hit = countiesGeo.find((c) => contains(c.rings, c.bbox, lon, lat));
    if (!hit) {
      hit = nearestCounty(lon, lat);
      if (hit) shoreline += cell.n;
      else { foreign += cell.n; continue; }
    }
    if (!dataFips.has(hit.stateFips)) {
      const p = FIPS_TO_POSTAL[hit.stateFips] ?? hit.stateFips;
      spill.set(p, (spill.get(p) ?? 0) + cell.n);
      continue;
    }
    const a = acc.get(hit.id) ?? Object.fromEntries(keys.map((k) => [k, 0]));
    for (const k of keys) a[k] += cell[k] ?? 0;
    acc.set(hit.id, a);
  }
  return { acc, spill, foreign, shoreline };
}
const countyData = Object.fromEntries(datasets.map((ds) => [ds.id, countyCounts(ds.fine, ds.lanes.map((l) => l.id))]));

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
  }
  // Debt-board hover: the highest-value rows each script has not touched.
  for (const l of ds.lanes) {
    rosters[`ln|${ds.id}|${l.id}`] = {
      total: ds.board.total - ds.board[l.id],
      names: (ds.board[`${l.id}_missing`] ?? []).filter(Boolean),
    };
  }
  out.apps[ds.historyKey] = {
    states,
    counties,
    statesCovered: Object.keys(states).length,
    unassigned: ds.states.get("??")?.n ?? 0,
    foreign: countyData[ds.id].foreign,
    shorelineAssigned: countyData[ds.id].shoreline,
    spillover: Object.fromEntries([...countyData[ds.id].spill.entries()].sort((a, b) => b[1] - a[1])),
    board: { total: ds.board.total, ...Object.fromEntries(ds.lanes.map((l) => [l.id, ds.board[l.id]])) },
    ...(ds.id === "d" ? { offLedger: [...ds.states.values()].reduce((a, r) => a + (r.offLedger ?? 0), 0) } : {}),
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

// Every state path is rendered ONCE; the window toggle re-colors it from the
// data-b-* attributes. States with data are clickable and open their county
// drill-down panel.
function nationalMap(ds) {
  const paths = statesGeo
    .map((s) => {
      const r = ds.states.get(s.postal);
      const drill = r && r.n > 0 ? ` data-drill="drill-${ds.id}-${s.postal}"` : "";
      const empty = { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 };
      return `<path d="${svgPath(s.rings)}" fill-rule="evenodd" class="stp bin${binOf(r?.n ?? 0)}" ${hoverAttr("st", "{scope}", ds.id, s.postal)} ${binAttrs(r ?? empty)}${drill}${drill ? ' tabindex="0" role="button" aria-label="' + esc(s.name) + ", open county detail\"" : ""}/>`;
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
          return `<path d="${svgPath(c.rings, { thin: 0.3 })}" fill-rule="evenodd" class="stp bin${binOf(a.n)}" ${hoverAttr("cty", "{scope}", ds.id, c.id)} ${binAttrs(a)} tabindex="0"/>`;
        })
        .join("\n");
      const withData = counties.filter((c) => countyData[ds.id].acc.has(c.id));
      const tableRows = withData
        .map((c) => ({ c, a: countyData[ds.id].acc.get(c.id) }))
        .sort((x, y) => y.a.n - x.a.n)
        .map(({ c, a }) => `<tr><td>${esc(c.name)}</td><td class="num">${fmt(a.n)}</td><td class="num">${fmt(a.d30)}</td></tr>`)
        .join("");
      const regions =
        ds.id === "d" && dogRegions.some((g) => g.state === st)
          ? `<h4>Named ingestion regions</h4>
<p class="note">The ledger's own sub-state units for ${esc(stateName[st] ?? st)} — coverage by region, all-time and last 30d.</p>
<table class="tbl half"><thead><tr><th>Region</th><th class="num">Places</th><th class="num">30d</th></tr></thead>
<tbody>${dogRegions.filter((g) => g.state === st).map((g) => `<tr><td>${esc(g.name)}</td><td class="num">${fmt(g.n)}</td><td class="num">${fmt(g.d30)}</td></tr>`).join("")}</tbody></table>`
          : "";
      return `<section class="drill" id="drill-${ds.id}-${st}" hidden>
<div class="dhead"><h3>${esc(ds.app)} — ${esc(stateName[st] ?? st)} by county</h3><button class="dclose" type="button">close &times;</button></div>
<svg viewBox="${vb.map((v) => v.toFixed(1)).join(" ")}" class="ctymap" role="img" aria-label="${esc(stateName[st] ?? st)} counties">
${paths}
</svg>
<p class="note">County split is geometric (~1 km cells, point-in-polygon) and can differ by a hair from the
ledger-based state total above. ${withData.length} of ${counties.length} counties have ${esc(ds.unit)}.
Hover a county for its own enrichment percentages.</p>
${stateDebtTable(ds, r)}
<details><summary>County table</summary>
<table class="tbl half"><thead><tr><th>County</th><th class="num">All-time</th><th class="num">30d</th></tr></thead>
<tbody>${tableRows || `<tr><td colspan="3" class="empty">Nothing here.</td></tr>`}</tbody></table>
</details>
${regions}
</section>`;
    })
    .join("\n");
}

function regionTable(ds, w) {
  const empty = { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 };
  const rows = Object.entries(REGIONS)
    .map(([name, sts]) => {
      const covered = sts.filter((s) => winCount(ds.states.get(s) ?? empty, w) > 0);
      const total = sts.reduce((a, s) => a + winCount(ds.states.get(s) ?? empty, w), 0);
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
      return `<tr><td>${esc(t.state)}</td><td class="num">${t.done} / ${t.tiles}</td><td class="mcell"><span class="meter"><span class="fill" style="width:${prog}%"></span></span></td><td class="num">${t.pending}</td><td class="num">${t.running}</td><td class="num">${t.errored ? `<strong class="warntxt">${t.errored}</strong>` : 0}</td><td class="num">${fmt(t.features)}</td><td class="num">${fmt(t.loaded)}</td><td class="dt">${t.last_done ? esc(String(t.last_done).slice(0, 10)) : "—"}</td></tr>`;
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
    const winTables = WINDOWS.map((w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${regionTable(ds, w)}</div>`).join("\n");
    const winBoards = WINDOWS.map((w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${debtBoard(ds, w)}</div>`).join("\n");
    return `<div class="apppanel" data-app-panel="${ds.id}"${i === 0 ? "" : " hidden"}>
<h2>${esc(ds.unit[0].toUpperCase() + ds.unit.slice(1))} by state</h2>
<p class="note">Click (or press Enter on) a shaded state for its county drill-down, state debt table and regions.</p>
${nationalMap(ds)}
${winTables}
${offNote}${spillNote}${unNote}${ctyNote}
${drillPanels(ds)}
<h2>Enrichment debt</h2>
<p class="note">Debt is rows the script has not touched yet, app-wide; per-state debt lives in each drill panel.
The &Delta; and trend columns read this lane's own daily snapshots (<code>data/enrich.json</code>) — debt moves
when the script runs <em>or</em> when ingestion adds rows, and a rising line during an ingest is expected, not a
regression. Hover a lane for the highest-value rows still missing it.</p>
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
main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 6px} h3{font-size:14px;margin:0} h4{font-size:13px;margin:14px 0 2px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:8px 0}
.tabbar{display:flex;gap:6px;margin:14px 0 4px}
.appbtn{font:inherit;font-size:13.5px;padding:5px 16px;border-radius:20px;cursor:pointer;
  background:var(--surface);color:var(--ink-2);border:1px solid var(--border)}
.appbtn[aria-selected="true"]{background:var(--bar);color:#fff;border-color:var(--bar);font-weight:600}
.legend{display:flex;gap:12px;margin:12px 0 4px;font-size:12px;color:var(--ink-2);flex-wrap:wrap;align-items:center}
.legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px;border:1px solid var(--border)}
.legend .lgnote{color:var(--muted);font-size:11px}
.bin0{fill:var(--page)} .bin1{fill:var(--b1)} .bin2{fill:var(--b2)} .bin3{fill:var(--b3)} .bin4{fill:var(--b4)} .bin5{fill:var(--b5)}
.sw.bin0{background:var(--page)} .sw.bin1{background:var(--b1)} .sw.bin2{background:var(--b2)}
.sw.bin3{background:var(--b3)} .sw.bin4{background:var(--b4)} .sw.bin5{background:var(--b5)}
.stmap,.ctymap{width:100%;height:auto;display:block;margin:6px 0}
.ctymap{max-width:560px}
.stp{stroke:var(--page);stroke-width:0.75;vector-effect:non-scaling-stroke}
.stp[data-drill]{cursor:pointer}
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
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Geographic coverage &amp; enrichment</h1>
<p class="meta">Where the ingestion pipelines have been, on real geography, and how far behind each
enrichment script is — one tab per app. Hover (or tab to) a state for its pipeline detail; click a
shaded one to drill into counties, its own debt table, and (where defined) named regions.
<strong>A blank state means the pipeline has not run there</strong> — "we can't see it", not "nothing exists
there". This page counts places and venues, not people, so account exclusions do not apply.
Collected ${esc(collectedAt)}.</p>

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
  // wrapping it keeps ONE source of truth for the active window.
  function recolor(w) {
    document.querySelectorAll('[data-b-all]').forEach(function (el) {
      var b = el.getAttribute('data-b-' + w) || '0';
      el.setAttribute('class', el.getAttribute('class').replace(/\\bbin\\d\\b/, 'bin' + b));
    });
  }
  var prev = window.setHoverScope;
  window.setHoverScope = function (s) { if (prev) prev(s); recolor(String(s)); };
  var btn = document.querySelector('.winbtn[aria-pressed="true"]');
  recolor(btn ? btn.dataset.win : 'all');

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

  // Drill-down: one open panel at a time; click again (or close) to dismiss.
  function toggle(id) {
    var was = document.getElementById(id);
    var open = was && was.hidden;
    document.querySelectorAll('.drill').forEach(function (d) { d.hidden = true; });
    if (was && open) { was.hidden = false; was.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    var p = t.closest ? t.closest('[data-drill]') : null;
    if (p) return toggle(p.getAttribute('data-drill'));
    var c = t.closest ? t.closest('.dclose') : null;
    if (c) c.closest('.drill').hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var p = e.target.closest ? e.target.closest('[data-drill]') : null;
    if (p) { e.preventDefault(); toggle(p.getAttribute('data-drill')); }
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
console.log(`Enrichment history: ${history.length} snapshot${history.length === 1 ? "" : "s"}`);
console.log(`Wrote ${DATA_FILE} and ${ENRICH_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains place/venue names)`);
console.log(`Wrote reports/geo.html`);
