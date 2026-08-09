// Enrichment-debt lane: how far behind each enrichment script is, and whether
// it is gaining or losing ground as ingestion adds rows.
//
// Every enrichment is a column some script fills (photos, descriptions, dog
// score, boundaries, amenities, wikidata on Doggle; boundaries, details
// refresh, surface, hours, court counts on Pickleague). Debt = rows where the
// column is still empty. This lane snapshots the debt DAILY into committed
// history, so the burn-down chart builds itself one run at a time — debt moves
// when either the script runs or ingestion adds rows, and the delta column
// cannot tell those apart on its own, which the page says.
//
// This lane counts places and venues, not people, so account exclusions do not
// apply — stated on the page. Hover a lane for a sample of what is missing.
//
// Writes data/enrich.json (counts-only history, committed) +
// data/enrich-roster.json (sample names, gitignored) + reports/enrich.html.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const APPS = readConfig("apps.json");
const refOf = (id) => APPS.apps.find((a) => a.id === id)?.projectRef;
const DATA_FILE = join(ROOT, "data", "enrich.json");
const ROSTER_FILE = join(ROOT, "data", "enrich-roster.json");
const HTML_FILE = join(ROOT, "reports", "enrich.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the enrich lane needs Management API access.");
  process.exit(1);
}

// One entry per enrichment script's output column. `done` is the SQL predicate
// for "this row is enriched"; the sample pulls the most valuable un-enriched
// rows so the hover shows what the script would do next.
const BOARDS = [
  {
    app: "doggle",
    title: "Doggle — dog_places",
    table: "dog_places",
    ref: refOf("doggle"),
    sampleOrder: "order by dog_score desc nulls last, name",
    lanes: [
      { id: "photo", label: "Photos", done: "cover_photo_url is not null" },
      { id: "descr", label: "Descriptions", done: "description is not null" },
      { id: "scored", label: "Dog score", done: "dog_score is not null" },
      { id: "bounded", label: "Boundaries", done: "boundary is not null" },
      { id: "amenities", label: "Nearby amenities", done: "(nearby_toilets is not null or nearby_water is not null)" },
      { id: "wikidata", label: "Wikidata link", done: "wikidata_id is not null" },
    ],
  },
  {
    app: "pickleague",
    title: "Pickleague — venues",
    table: "venues",
    ref: refOf("pickleague"),
    sampleOrder: "order by name",
    lanes: [
      { id: "bounded", label: "Boundaries", done: "boundary is not null" },
      { id: "refreshed", label: "Details refresh", done: "last_refreshed_at is not null" },
      { id: "surface", label: "Surface type", done: "surface is not null" },
      { id: "hours", label: "Opening hours", done: "opening_hours is not null" },
      { id: "courts", label: "Court counts", done: "(court_count is not null and court_count > 0)" },
    ],
  },
];

const results = await Promise.all(
  BOARDS.map((b) => {
    const cols = b.lanes
      .map((l) => `count(*) filter (where ${l.done})::int ${l.id},
  (select json_agg(name) from (select name from ${b.table} where not ${l.done} ${b.sampleOrder} limit 20) s_${l.id}) ${l.id}_missing`)
      .join(",\n  ");
    return runSql(b.ref, `select count(*)::int total,\n  ${cols}\nfrom ${b.table}`).then((r) => r[0]);
  }),
);

const collectedAt = new Date().toISOString();
const today = collectedAt.slice(0, 10);

// ---------- history: committed, append-or-replace today's snapshot ----------

const prev = existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, "utf8")) : { history: [] };
const snapshot = { date: today };
for (let i = 0; i < BOARDS.length; i++) {
  const b = BOARDS[i], r = results[i];
  snapshot[b.app] = { total: r.total, ...Object.fromEntries(b.lanes.map((l) => [l.id, r[l.id]])) };
}
const history = [...(prev.history ?? []).filter((h) => h.date !== today), snapshot].sort((a, b) =>
  a.date.localeCompare(b.date),
);
const out = { collectedAt, history };

const rosters = {};
for (let i = 0; i < BOARDS.length; i++) {
  const b = BOARDS[i], r = results[i];
  for (const l of b.lanes) {
    rosters[`ln|${b.app}|${l.id}`] = {
      total: r.total - r[l.id],
      names: (r[`${l.id}_missing`] ?? []).filter(Boolean),
    };
  }
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Number(n).toLocaleString("en-US");
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS.filter((w) => w > 1)]; // 24h of a daily snapshot is one point
const DEFAULT_WIN = ALL_WINDOW;

const inWin = (date, w) =>
  w === ALL_WINDOW || Date.parse(date) >= Date.parse(today) - w * 86400_000;

// Debt sparkline, drawn server-side. Y is scaled to THIS lane's history within
// the widest window and pinned there for every window, so narrowing the toggle
// never rescales the line.
function spark(app, laneId, w) {
  const pts = history.filter((h) => inWin(h.date, w)).map((h) => ({ date: h.date, debt: h[app].total - h[app][laneId] }));
  const all = history.map((h) => h[app].total - h[app][laneId]);
  const yMax = Math.max(1, ...all);
  const W = 120, H = 26, pad = 2;
  if (pts.length < 2) {
    const y = H - pad - ((pts[0]?.debt ?? 0) / yMax) * (H - 2 * pad);
    return `<svg class="spark" width="${W}" height="${H}" role="img" aria-label="debt history: one snapshot so far"><circle cx="${W - pad - 2}" cy="${y.toFixed(1)}" r="2.5" fill="var(--bar)"/></svg>`;
  }
  const x = (i) => pad + (i / (pts.length - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - (v / yMax) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.debt).toFixed(1)}`).join(" ");
  return `<svg class="spark" width="${W}" height="${H}" role="img" aria-label="debt over ${pts.length} snapshots, y-max ${fmt(yMax)}"><polyline points="${line}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(pts.at(-1).debt).toFixed(1)}" r="2.5" fill="var(--bar)"/></svg>`;
}

// Delta over the window: current debt minus debt at the window's oldest
// snapshot. Negative = the script gained ground.
function delta(app, laneId, w) {
  const pts = history.filter((h) => inWin(h.date, w));
  if (pts.length < 2) return null;
  const d = (h) => h[app].total - h[app][laneId];
  return d(pts.at(-1)) - d(pts[0]);
}

const blocks = WINDOWS.map((w) => {
  const boards = BOARDS.map((b, i) => {
    const r = results[i];
    const rows = b.lanes
      .map((l) => {
        const done = r[l.id], debt = r.total - done;
        const p = r.total ? Math.round((done / r.total) * 100) : 0;
        const dl = delta(b.app, l.id, w);
        const dTxt = dl === null ? '<span class="mut">—</span>' : dl === 0 ? "0" : dl > 0 ? `<span class="worse">+${fmt(dl)}</span>` : `<span>&minus;${fmt(-dl)}</span>`;
        return `<tr ${hoverAttr("ln", b.app, l.id)} tabindex="0">
  <td>${esc(l.label)}</td>
  <td class="num">${fmt(done)} / ${fmt(r.total)}</td>
  <td class="mcell"><span class="meter"><span class="fill" style="width:${p}%"></span></span> <span class="pct">${p}%</span></td>
  <td class="num">${fmt(debt)}</td>
  <td class="num">${dTxt}</td>
  <td>${spark(b.app, l.id, w)}</td>
</tr>`;
      })
      .join("\n");
    return `<h2>${esc(b.title)}</h2>
<table class="tbl"><thead><tr><th>Enrichment</th><th class="num">Done / rows</th><th>Coverage</th><th class="num">Debt</th><th class="num">&Delta; ${w === ALL_WINDOW ? "all time" : windowLabel(w)}</th><th>Debt trend <span class="thsub">since ${esc(history[0].date)}</span></th></tr></thead>
<tbody>${rows}</tbody></table>`;
  }).join("\n");
  return `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${boards}</div>`;
}).join("\n");

const histNote =
  history.length < 2
    ? `<p class="note"><strong>First snapshot.</strong> The trend and &Delta; columns come alive when tomorrow's run adds a second point — this lane accumulates its own history in <code>data/enrich.json</code>, one row per day.</p>`
    : `<p class="note">${history.length} daily snapshots so far, since ${esc(history[0].date)}.</p>`;

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Enrichment debt — how far behind each pipeline is</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --warn:#b45309; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --warn:#eda100; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 6px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.meter{display:inline-block;width:110px;height:8px;border-radius:4px;background:color-mix(in srgb, var(--bar) 14%, transparent);vertical-align:middle;overflow:hidden}
.meter .fill{display:block;height:100%;border-radius:4px;background:var(--bar)}
.mcell{width:170px;white-space:nowrap}
.pct{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.spark{display:block}
.worse{color:var(--warn)}
.thsub{text-transform:none;letter-spacing:0;font-weight:400}
.mut{color:var(--muted)}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Enrichment debt</h1>
<p class="meta">How far behind each enrichment script is: <strong>debt</strong> is rows the script has not
touched yet. The board is as-of-now; the &Delta; and trend columns read this lane's own daily
snapshots. Debt moves when the script runs <em>or</em> when ingestion adds rows — a rising line during an
ingest is expected, not a regression. Hover (or tab to) a lane for the highest-value rows still
missing it. This page counts places and venues, not people, so account exclusions do not apply.
Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WIN, "scopes the trend and Δ columns; debt and coverage are as of now")}

${histNote}
${blocks}
</main>
${hoverLayer(rosters, { unit: "row missing it/rows missing it" })}
${windowScript(WINDOWS, DEFAULT_WIN)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

for (let i = 0; i < BOARDS.length; i++) {
  const b = BOARDS[i], r = results[i];
  const worst = b.lanes.map((l) => ({ l: l.label, debt: r.total - r[l.id] })).sort((a, x) => x.debt - a.debt)[0];
  console.log(`Enrich ${b.app}: ${fmt(r.total)} rows, worst lane "${worst.l}" owes ${fmt(worst.debt)}`);
}
console.log(`History: ${history.length} snapshot${history.length === 1 ? "" : "s"}`);
console.log(`Wrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains place/venue names)`);
console.log(`Wrote reports/enrich.html`);
