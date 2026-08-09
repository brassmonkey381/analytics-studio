// Geographic coverage lane: where the ingestion + enrichment pipelines have
// actually been, state by state, for the two location apps.
//
//   Doggle      dog_places, assigned to a state by the ingestion ledger itself —
//               a place's region maps to a state (CA), else the ingest tile
//               whose bbox contains it (NV/OR/UT/WA...). Enrichment coverage
//               (photo, description, dog score, boundary, nearby amenities) is
//               read straight off the columns those scripts fill.
//   Pickleague  venues, assigned to a state by nearest us_cities entry
//               (approximate near borders, and says so).
//
// Rendered as a US tile-grid cartogram — every state the same size, grouped by
// census region — because the question is coverage, not acreage. A state with
// zero means THE PIPELINE HAS NOT RUN THERE, not that nothing exists there; the
// page says so, because that zero is "we can't see it", the second kind.
//
// This lane counts places, not people, so account exclusions do not apply —
// stated on the page. The window toggle scopes rows by when they were ingested
// (created_at); the ingestion ledger table is as-of-now and says so inline.
//
// Writes data/geo.json (counts only, committed) + data/geo-roster.json
// (place/venue names, gitignored) + reports/geo.html (gitignored).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const APPS = readConfig("apps.json");
const refOf = (id) => APPS.apps.find((a) => a.id === id)?.projectRef;
const DOGGLE = refOf("doggle");
const PICKLE = refOf("pickleague");
const DATA_FILE = join(ROOT, "data", "geo.json");
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

// ---------- the cartogram ----------
// Standard US tile grid (11 cols), states in their census region. col,row.
const GRID = {
  AK: [0, 0], ME: [10, 0],
  WI: [5, 1], VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], MI: [6, 2], NY: [8, 2], MA: [9, 2], RI: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [7, 7],
};
const REGIONS = {
  Northeast: ["CT", "ME", "MA", "NH", "RI", "VT", "NJ", "NY", "PA"],
  Midwest: ["IL", "IN", "MI", "OH", "WI", "IA", "KS", "MN", "MO", "NE", "ND", "SD"],
  South: ["DE", "FL", "GA", "MD", "NC", "SC", "VA", "DC", "WV", "AL", "KY", "MS", "TN", "AR", "LA", "OK", "TX"],
  West: ["AZ", "CO", "ID", "MT", "NV", "NM", "UT", "WY", "AK", "CA", "HI", "OR", "WA"],
};
const regionOf = (st) => Object.keys(REGIONS).find((r) => REGIONS[r].includes(st)) ?? "—";

// ---------- queries: one fetch per concern, every window computed from it ----------

// State assignment comes from the ingestion machinery itself: region -> state
// (how CA was loaded), else the ingest tile whose bbox contains the point (how
// every tiled state was loaded). What matches neither lands in 'unassigned'.
const dogPlacesSql = `
with placed as (
  select p.name, p.created_at, p.source,
         (p.cover_photo_url is not null) as photo,
         (p.description is not null) as descr,
         (p.dog_score is not null) as scored,
         (p.boundary is not null) as bounded,
         (p.nearby_toilets is not null or p.nearby_water is not null) as amenities,
         coalesce(r.state, t.state, '??') as st
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
  count(*) filter (where photo)::int photo,
  count(*) filter (where descr)::int descr,
  count(*) filter (where scored)::int scored,
  count(*) filter (where bounded)::int bounded,
  count(*) filter (where amenities)::int amenities,
  count(*) filter (where created_at >= now() - interval '1 day')::int d1,
  count(*) filter (where created_at >= now() - interval '7 day')::int d7,
  count(*) filter (where created_at >= now() - interval '14 day')::int d14,
  count(*) filter (where created_at >= now() - interval '30 day')::int d30,
  (array_agg(name order by scored desc, name))[1:20] top_names
from placed group by st order by n desc`;

// Places that matched no region and no tile — ingested OFF the ledger. They are
// real places somewhere, so nearest us_cities decides their state (same cell
// trick as pickleague), and they carry an off-ledger counter so the map can say
// how many of a state's places the ingestion ledger cannot account for.
const dogOffLedgerSql = `
with un as (
  select p.name, p.created_at, p.source,
         (p.cover_photo_url is not null) as photo,
         (p.description is not null) as descr,
         (p.dog_score is not null) as scored,
         (p.boundary is not null) as bounded,
         (p.nearby_toilets is not null or p.nearby_water is not null) as amenities,
         round(p.lat::numeric, 1) clat, round(p.lng::numeric, 1) clng
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
    count(*) filter (where photo)::int photo,
    count(*) filter (where descr)::int descr,
    count(*) filter (where scored)::int scored,
    count(*) filter (where bounded)::int bounded,
    count(*) filter (where amenities)::int amenities,
    count(*) filter (where created_at >= now() - interval '1 day')::int d1,
    count(*) filter (where created_at >= now() - interval '7 day')::int d7,
    count(*) filter (where created_at >= now() - interval '14 day')::int d14,
    count(*) filter (where created_at >= now() - interval '30 day')::int d30,
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

// Venues have no region ledger, so nearest us_cities entry decides the state.
// Venues are bucketed into 0.2-degree cells first so the correlated scan runs
// per cell, not per venue. Approximate within ~20 km of a state line.
const pickleVenuesSql = `
with cells as (
  select round(v.lat::numeric, 1) clat, round(v.lng::numeric, 1) clng,
    count(*)::int n,
    count(*) filter (where v.source = 'osm')::int osm,
    count(*) filter (where v.source = 'google')::int google,
    count(*) filter (where v.indoor)::int indoor,
    count(*) filter (where v.boundary is not null)::int bounded,
    count(*) filter (where v.last_refreshed_at is not null)::int refreshed,
    coalesce(sum(v.court_count), 0)::int courts,
    count(*) filter (where v.created_at >= now() - interval '1 day')::int d1,
    count(*) filter (where v.created_at >= now() - interval '7 day')::int d7,
    count(*) filter (where v.created_at >= now() - interval '14 day')::int d14,
    count(*) filter (where v.created_at >= now() - interval '30 day')::int d30,
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

const [dogStatesRaw, dogOffCells, dogTiles, pickleCells] = await Promise.all([
  runSql(DOGGLE, dogPlacesSql),
  runSql(DOGGLE, dogOffLedgerSql),
  runSql(DOGGLE, dogTilesSql),
  runSql(PICKLE, pickleVenuesSql),
]);

const collectedAt = new Date().toISOString();
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WIN = ALL_WINDOW;

// Fold state-keyed cells into per-state rows, summing every numeric field.
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
const DOG_KEYS = ["n", "curated", "photo", "descr", "scored", "bounded", "amenities", "d1", "d7", "d14", "d30", "offLedger"];
const dogStates = new Map();
for (const r of dogStatesRaw) {
  if (r.st === "??") continue;
  dogStates.set(r.st, { ...r, offLedger: 0, top_names: (r.top_names ?? []).filter(Boolean) });
}
foldCells(dogStates, dogOffCells.map((c) => ({ ...c, offLedger: c.n })), DOG_KEYS, Object.fromEntries(DOG_KEYS.map((k) => [k, 0])));

// Pickleague: everything arrives as cells.
const PICKLE_KEYS = ["n", "osm", "google", "indoor", "bounded", "refreshed", "courts", "d1", "d7", "d14", "d30"];
const pickleStates = foldCells(new Map(), pickleCells, PICKLE_KEYS, Object.fromEntries(PICKLE_KEYS.map((k) => [k, 0])));

const tilesByState = new Map(dogTiles.map((t) => [t.state, t]));
const winCount = (row, w) => (w === ALL_WINDOW ? row.n : row[`d${w}`]);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

const datasets = [
  {
    id: "d",
    app: "Doggle",
    unit: "places",
    states: dogStates,
    statLines(r, w) {
      const lines = [`${regionOf(r.st)} region`];
      const t = tilesByState.get(r.st);
      if (t) {
        lines.push(`ingest tiles: ${t.done} done, ${t.pending} pending${t.running ? `, ${t.running} running` : ""}${t.empty ? `, ${t.empty} empty` : ""}${t.errored ? `, ${t.errored} ERRORED` : ""}`);
        lines.push(`features ${t.features} seen, ${t.loaded} loaded`);
      }
      if (w === ALL_WINDOW) {
        lines.push(`enriched: photo ${pct(r.photo, r.n)}%, descr ${pct(r.descr, r.n)}%, score ${pct(r.scored, r.n)}%, boundary ${pct(r.bounded, r.n)}%, amenities ${pct(r.amenities, r.n)}%`);
        if (r.curated) lines.push(`${r.curated} curated by hand, rest osm`);
        if (r.offLedger) lines.push(`${r.offLedger} OFF-LEDGER (no region, no tile; state by nearest city)`);
      } else {
        lines.push(`ingested in last ${windowLabel(w)}: ${winCount(r, w)} (enrichment %s are all-time)`);
      }
      return lines;
    },
  },
  {
    id: "p",
    app: "Pickleague",
    unit: "venues",
    states: pickleStates,
    statLines(r, w) {
      const lines = [`${regionOf(r.st)} region`];
      lines.push(`sources: ${r.osm} osm, ${r.google} google`);
      if (w === ALL_WINDOW) {
        lines.push(`${r.courts} courts counted · ${r.indoor} indoor · boundary ${pct(r.bounded, r.n)}% · details refreshed ${pct(r.refreshed, r.n)}%`);
      } else {
        lines.push(`ingested in last ${windowLabel(w)}: ${winCount(r, w)} (enrichment %s are all-time)`);
      }
      return lines;
    },
  },
];

// ---------- outputs ----------

const rosters = {};
const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WIN, apps: {} };

for (const ds of datasets) {
  const states = {};
  for (const [st, r] of ds.states) {
    states[st] = { n: r.n, d1: r.d1, d7: r.d7, d14: r.d14, d30: r.d30 };
    if (ds.id === "d") Object.assign(states[st], { photo: r.photo, descr: r.descr, scored: r.scored, bounded: r.bounded, amenities: r.amenities, curated: r.curated, offLedger: r.offLedger });
    else Object.assign(states[st], { osm: r.osm, google: r.google, courts: r.courts, bounded: r.bounded, refreshed: r.refreshed });
    for (const w of WINDOWS) {
      rosters[`st|${w}|${ds.id}|${st}`] = {
        total: winCount(r, w),
        names: [...ds.statLines(r, w), `— top ${ds.unit} —`, ...(r.top_names ?? []).filter(Boolean)],
      };
    }
  }
  out.apps[ds.id === "d" ? "doggle" : "pickleague"] = {
    states,
    statesCovered: [...ds.states.keys()].filter((s) => s !== "??").length,
    unassigned: ds.states.get("??")?.n ?? 0,
    ...(ds.id === "d" ? { offLedger: [...ds.states.values()].reduce((a, r) => a + (r.offLedger ?? 0), 0) } : {}),
  };
}
out.apps.doggle.tiles = dogTiles.map((t) => ({ ...t }));

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Number(n).toLocaleString("en-US");

// ONE binning across apps and across windows: log-decade bins. Narrowing the
// window empties the map; it never rescales it.
const BINS = [1, 10, 100, 1000, 10000];
const binOf = (v) => (v <= 0 ? 0 : BINS.filter((b) => v >= b).length);
const binLabel = (i) =>
  i === 0 ? "0" : i === BINS.length ? `${fmt(BINS.at(-1))}+` : `${fmt(BINS[i - 1])}–${fmt(BINS[i] - 1)}`;

function usMap(ds, w) {
  const tiles = Object.entries(GRID)
    .map(([st, [col, row]]) => {
      const r = ds.states.get(st);
      const v = r ? winCount(r, w) : 0;
      const bin = binOf(v);
      return `<div class="st b${bin}" style="grid-column:${col + 1};grid-row:${row + 1}" ${hoverAttr("st", "{scope}", ds.id, st)} tabindex="0">
<span class="ab">${st}</span><span class="ct">${v ? fmt(v) : ""}</span></div>`;
    })
    .join("");
  return `<div class="usmap" role="img" aria-label="${esc(ds.app)} ${esc(ds.unit)} by state">${tiles}</div>`;
}

function regionTable(ds, w) {
  const rows = Object.entries(REGIONS)
    .map(([name, sts]) => {
      const covered = sts.filter((s) => (winCount(ds.states.get(s) ?? { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 }, w) ?? 0) > 0);
      const total = sts.reduce((a, s) => a + (winCount(ds.states.get(s) ?? { n: 0, d1: 0, d7: 0, d14: 0, d30: 0 }, w) ?? 0), 0);
      return { name, covered: covered.length, of: sts.length, total };
    })
    .sort((a, b) => b.total - a.total)
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td><td class="num">${r.covered} / ${r.of}</td><td class="num">${fmt(r.total)}</td></tr>`,
    )
    .join("");
  return `<table class="tbl rgn"><thead><tr><th>Census region</th><th class="num">States covered</th><th class="num">${esc(ds.unit[0].toUpperCase() + ds.unit.slice(1))}</th></tr></thead><tbody>${rows}</tbody></table>`;
}

const legend = `<div class="legend">${Array.from({ length: BINS.length + 1 }, (_, i) => `<span class="chip"><span class="sw b${i}"></span>${binLabel(i)}</span>`).join("")}<span class="chip lgnote">same bins across apps and windows</span></div>`;

const blocks = WINDOWS.map((w) => {
  const parts = datasets
    .map((ds) => {
      const meta = out.apps[ds.id === "d" ? "doggle" : "pickleague"];
      const offNote = ds.id === "d" && meta.offLedger
        ? `<p class="note"><strong>${fmt(meta.offLedger)}</strong> places are <strong>off-ledger</strong> — inside no defined region and no ingest tile, so no pipeline
run accounts for them; they are placed by nearest city and flagged per-state on hover. Worth knowing which script wrote them.</p>`
        : "";
      return `<h2>${esc(ds.app)} — ${esc(ds.unit)} by state</h2>
${usMap(ds, w)}
${regionTable(ds, w)}
${offNote}${meta.unassigned ? `<p class="note">${fmt(meta.unassigned)} ${esc(ds.unit)} could not be assigned to any state at all — counted nowhere on the map, stated here instead.</p>` : ""}`;
    })
    .join("\n");
  return `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${legend}\n${parts}</div>`;
}).join("\n");

const tileRows = dogTiles
  .map((t) => {
    const prog = t.tiles ? Math.round((t.done / t.tiles) * 100) : 0;
    return `<tr><td>${esc(t.state)}</td><td class="num">${t.done} / ${t.tiles}</td><td class="mcell"><span class="meter"><span class="fill" style="width:${prog}%"></span></span></td><td class="num">${t.pending}</td><td class="num">${t.running}</td><td class="num">${t.errored ? `<strong class="warntxt">${t.errored}</strong>` : 0}</td><td class="num">${fmt(t.features)}</td><td class="num">${fmt(t.loaded)}</td><td class="dt">${t.last_done ? esc(String(t.last_done).slice(0, 10)) : "—"}</td></tr>`;
  })
  .join("");

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Geographic coverage — ingestion &amp; enrichment by state</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --warn:#b45309;
  --b1:#86b6ef; --b2:#649de6; --b3:#4383d8; --b4:#2a68c0; --b5:#1c4f9c; --b45-ink:#fff; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100;
  --b1:#184f95; --b2:#2f65ab; --b3:#4a80cc; --b4:#6ea3e8; --b5:#9cc3f5; --b45-ink:#0b0b0b; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100;
  --b1:#184f95; --b2:#2f65ab; --b3:#4a80cc; --b4:#6ea3e8; --b5:#9cc3f5; --b45-ink:#0b0b0b; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 8px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.legend{display:flex;gap:12px;margin:12px 0 4px;font-size:12px;color:var(--ink-2);flex-wrap:wrap;align-items:center}
.legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px;border:1px solid var(--border)}
.legend .lgnote{color:var(--muted);font-size:11px}
.sw.b0,.st.b0{background:transparent}
.sw.b1,.st.b1{background:var(--b1)} .sw.b2,.st.b2{background:var(--b2)} .sw.b3,.st.b3{background:var(--b3)}
.sw.b4,.st.b4{background:var(--b4)} .sw.b5,.st.b5{background:var(--b5)}
.usmap{display:grid;grid-template-columns:repeat(11,1fr);gap:3px;max-width:640px;margin:8px 0}
.st{aspect-ratio:1;border-radius:5px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  border:1px solid var(--border);min-width:0}
.st.b0{border-style:dashed}
.st.b0 .ab,.st.b0 .ct{color:var(--muted)}
.st .ab{font-size:11px;font-weight:650;line-height:1.1}
.st .ct{font-size:9.5px;line-height:1.1;font-variant-numeric:tabular-nums}
.st.b1 .ab,.st.b1 .ct,.st.b2 .ab,.st.b2 .ct{color:#0b0b0b}
.st.b3 .ab,.st.b3 .ct{color:#fff}
.st.b4 .ab,.st.b4 .ct,.st.b5 .ab,.st.b5 .ct{color:var(--b45-ink)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.tbl.rgn{max-width:640px}
.meter{display:inline-block;width:110px;height:8px;border-radius:4px;background:color-mix(in srgb, var(--bar) 14%, transparent);vertical-align:middle;overflow:hidden}
.meter .fill{display:block;height:100%;border-radius:4px;background:var(--bar)}
.mcell{width:120px}
.warntxt{color:var(--warn)}
.dt{font-variant-numeric:tabular-nums;color:var(--muted)}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Geographic coverage</h1>
<p class="meta">Where the ingestion and enrichment pipelines have actually been, as a US tile grid —
every state the same size, because the question is coverage, not acreage. Hover (or tab to) a state
for its pipeline detail and top entries. <strong>A blank state means the pipeline has not run there</strong> —
"we can't see it", not "nothing exists there". This page counts places and venues, not people, so
account exclusions do not apply. Doggle states come from the ingestion ledger itself (region &rarr; state,
else containing ingest tile); Pickleague venues use the nearest <code>us_cities</code> entry, approximate
within ~20&nbsp;km of a state line. Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WIN, "scopes rows by when they were ingested (created_at)")}

${blocks}

<h2>Doggle ingest tile ledger</h2>
<p class="note">The queue behind the map: each state is split into bbox tiles and loaded tile by tile.
This table is the ledger <strong>as of now</strong> — it does not move with the window toggle above.
&ldquo;Loaded&rdquo; below &ldquo;features&rdquo; means the loader filtered or failed some features.</p>
<table class="tbl"><thead><tr><th>State</th><th class="num">Done / tiles</th><th></th><th class="num">Pending</th><th class="num">Running</th><th class="num">Errored</th><th class="num">Features</th><th class="num">Loaded</th><th>Last done</th></tr></thead>
<tbody>${tileRows || `<tr><td colspan="9" class="empty">No ingest tiles yet.</td></tr>`}</tbody></table>
</main>
${hoverLayer(rosters, { unit: "row/rows" })}
${windowScript(WINDOWS, DEFAULT_WIN)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

const dg = out.apps.doggle, pk = out.apps.pickleague;
console.log(`Geo  Doggle ${dg.statesCovered} states covered (${fmt(Object.values(dg.states).reduce((a, s) => a + s.n, 0))} places, ${fmt(dg.unassigned)} unassigned)`);
console.log(`     Pickleague ${pk.statesCovered} states covered (${fmt(Object.values(pk.states).reduce((a, s) => a + s.n, 0))} venues, ${fmt(pk.unassigned)} unassigned)`);
console.log(`Wrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains place/venue names)`);
console.log(`Wrote reports/geo.html`);
