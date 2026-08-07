// Report generator: reads data/metrics.json, writes reports/report.html and
// reports/latest.md. The HTML carries every window (24h/7d/14d/30d) rendered
// server-side and toggled client-side; the markdown is the 30-day view, since a
// static summary has no toggle to offer.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  HOVER_MAX_NAMES,
  ROSTER_STORE_CAP,
  hoverAttr,
  hoverLayer,
  roster,
  userLabel,
} from "./lib/hover.mjs";
import { STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const store = JSON.parse(readFileSync(join(ROOT, "data", "metrics.json"), "utf8"));
// Optional, gitignored: emails for hover. Absent on a REST-only collection.
const ACCOUNTS_PATH = join(ROOT, "data", "accounts.json");
const accounts = existsSync(ACCOUNTS_PATH) ? JSON.parse(readFileSync(ACCOUNTS_PATH, "utf8")).apps : {};
const CONFIG = JSON.parse(readFileSync(join(ROOT, "config", "apps.json"), "utf8"));

const WINDOW = CONFIG.windowDays ?? 30;
const dates = [];
for (let i = WINDOW - 1; i >= 0; i--) dates.push(new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10));

// Series slots follow the palette's fixed categorical order (never cycled).
const SLOTS = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#eb6834", dark: "#d95926" },
  { light: "#1baf7a", dark: "#199e70" },
  { light: "#eda100", dark: "#c98500" },
];

const apps = CONFIG.apps
  .filter((a) => store.apps[a.id])
  .map((a, i) => {
    const entry = store.apps[a.id];
    const dau = dates.map((d) => entry.days[d]?.dau ?? 0);
    const newDaily = dates.map((d) => entry.days[d]?.new_users ?? 0);
    const dauGuest = dates.map((d) => entry.days[d]?.dau_guest ?? 0);
    const newGuest = dates.map((d) => entry.days[d]?.new_guest ?? 0);
    const cumNew = [];
    newDaily.reduce((acc, v, idx) => (cumNew[idx] = acc + v), 0);
    return {
      id: a.id,
      name: a.name,
      slot: i % SLOTS.length,
      hasData: Object.keys(entry.days).length > 0,
      dau,
      newDaily,
      cumNew,
      dauGuest,
      newGuest,
      totalUsers: entry.totalUsers,
      guestUsers: entry.guestUsers ?? null,
      excludedUsers: entry.excludedUsers ?? null,
      retention: entry.retention || null,
      coverage: entry.coverage || null,
      totalsLabel: a.totalsLabel || "total users",
      lastCollected: entry.lastCollected,
      lastError: entry.lastError,
      note: a.reportNote || "",
    };
  });

// Tiles list every app (so a broken collector is visible); charts, legend and
// table only plot apps that actually have data.
const plotted = apps.filter((a) => a.hasData);

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const fmt = (n) => (n == null ? "n/a" : n.toLocaleString("en-US"));

// ---------- Windows ----------
//
// The toggle scopes the TRAILING DAILY SERIES: how many of the collected days
// are in view. Every window is rendered server-side from the one metrics.json
// already in hand, and the toggle only flips which [data-w] block is visible —
// no window is recomputed in the browser, so none can disagree with another.
//
// Two things deliberately do NOT move with it, and both say so where they are
// drawn: the active/churned bars (they carry their own 7/14/30 split, computed
// by a different query) and the total-users figure on each tile (point-in-time).
const WINDOWS = STANDARD_WINDOWS.filter((w) => w <= WINDOW);
const DEFAULT_WIN = WINDOWS.includes(WINDOW) ? WINDOW : WINDOWS.at(-1);
// A single day of a daily series is one point, not a trend. At 24h the charts
// step aside and the tiles — which is the right form for one number — carry it.
const PLOTTABLE = (w) => w > 1;

const lastN = (arr, w) => arr.slice(-w);
/** New users accumulated WITHIN the window, not carried in from before it. */
const cumWithin = (newDaily, w) => {
  const out = [];
  lastN(newDaily, w).reduce((acc, v, i) => (out[i] = acc + v), 0);
  return out;
};
// One scale across windows, per the house rule: narrowing the window must not
// make a mark grow. Both maxima are taken over the WIDEST window and reused by
// every narrower one, so a quiet week reads as a low curve rather than a
// rescaled one that looks identical to a busy month.
const DAU_MAX = Math.max(1, ...plotted.flatMap((a) => a.dau));
const CUM_MAX = Object.fromEntries(
  plotted.map((a) => [a.id, Math.max(1, ...cumWithin(a.newDaily, WINDOWS.at(-1)))]),
);

// ---------- SVG chart builder ----------

const W = 860, H = 300, PAD = { t: 16, r: 120, b: 34, l: 48 };

function niceTicks(max) {
  if (max <= 0) return [0, 1];
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? mag * 10;
  const ticks = [];
  for (let v = 0; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
}

function lineChart(id, seriesKey, win) {
  const d8 = lastN(dates, win);
  const series = Object.fromEntries(plotted.map((a) => [a.id, lastN(a[seriesKey], win)]));
  const plotW = W - PAD.l - PAD.r, plotH = H - PAD.t - PAD.b;
  // Fixed across windows on purpose — see DAU_MAX.
  const ticks = niceTicks(DAU_MAX);
  const yMax = ticks[ticks.length - 1];
  const x = (i) => PAD.l + (i / Math.max(1, d8.length - 1)) * plotW;
  const y = (v) => PAD.t + plotH - (v / yMax) * plotH;

  const grid = ticks
    .map((t) => `<line x1="${PAD.l}" y1="${y(t)}" x2="${W - PAD.r}" y2="${y(t)}" class="${t === 0 ? "baseline" : "grid"}"/>
<text x="${PAD.l - 8}" y="${y(t) + 4}" class="tick" text-anchor="end">${t.toLocaleString("en-US")}</text>`)
    .join("\n");

  const xTicks = [...new Set([0, Math.floor((d8.length - 1) / 2), d8.length - 1])]
    .map((i) => `<text x="${x(i)}" y="${H - PAD.b + 18}" class="tick" text-anchor="middle">${d8[i].slice(5)}</text>`)
    .join("\n");

  const lines = plotted
    .map((a) => {
      const vals = series[a.id];
      const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      const endY = y(vals.at(-1));
      return `<path d="${d}" class="line s${a.slot}"/>
<circle cx="${x(d8.length - 1)}" cy="${endY}" r="4" class="dot s${a.slot}"/>`;
    })
    .join("\n");

  // Direct end-labels only where they don't collide (>=15px apart); the legend
  // and tooltip carry the rest.
  const ends = plotted
    .map((a) => ({ a, ey: y(series[a.id].at(-1)) }))
    .sort((p, q) => p.ey - q.ey);
  const endLabels = ends
    .filter((p, i) => ends.every((q, j) => j === i || Math.abs(q.ey - p.ey) >= 15))
    .map((p) => `<g><circle cx="${W - PAD.r + 10}" cy="${p.ey - 4}" r="4" class="dot s${p.a.slot}"/><text x="${W - PAD.r + 18}" y="${p.ey}" class="endlabel">${esc(p.a.name)} ${fmt(series[p.a.id].at(-1))}</text></g>`)
    .join("\n");

  return `<div class="chart" data-chart="${id}" data-dates="${esc(JSON.stringify(d8))}">
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${id} chart, last ${windowLabel(win)}">
${grid}
${xTicks}
${lines}
${endLabels}
<line class="xhair" x1="0" x2="0" y1="${PAD.t}" y2="${H - PAD.b}" style="display:none"/>
<rect class="hit" x="${PAD.l}" y="${PAD.t}" width="${plotW}" height="${plotH}" fill="transparent"/>
</svg>
<div class="tooltip" style="display:none"></div>
</div>`;
}

// Small multiples: apps differ in size by orders of magnitude, so a shared
// y-axis flattens the smaller apps onto the baseline. Each panel gets its own
// scale; the panel's max is labelled so the scales are never confused.
function smallMultiples(win) {
  const d8 = lastN(dates, win);
  const w = 300, h = 132, pad = { t: 12, r: 12, b: 22, l: 40 };
  const plotW = w - pad.l - pad.r, plotH = h - pad.t - pad.b;
  return `<div class="sm-grid">${plotted
    .map((a) => {
      // Accumulated within the window: a 7d view must not carry in signups from
      // day 8. Scale stays pinned to the widest window (CUM_MAX) so a narrower
      // one reads as a genuinely smaller curve.
      const vals = cumWithin(a.newDaily, win);
      const ticks = niceTicks(CUM_MAX[a.id]);
      const yMax = ticks[ticks.length - 1];
      const x = (i) => pad.l + (i / Math.max(1, d8.length - 1)) * plotW;
      const y = (v) => pad.t + plotH - (v / yMax) * plotH;
      const grid = [0, yMax]
        .map((t) => `<line x1="${pad.l}" y1="${y(t)}" x2="${w - pad.r}" y2="${y(t)}" class="${t === 0 ? "baseline" : "grid"}"/>
<text x="${pad.l - 6}" y="${y(t) + 4}" class="tick" text-anchor="end">${t.toLocaleString("en-US")}</text>`)
        .join("\n");
      const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      return `<figure class="sm">
<figcaption><span class="key s${a.slot}"></span>${esc(a.name)} <strong>${fmt(vals.at(-1))}</strong></figcaption>
<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(a.name)} cumulative new users, last ${windowLabel(win)}">
${grid}
<text x="${pad.l}" y="${h - 6}" class="tick">${d8[0].slice(5)}</text>
<text x="${w - pad.r}" y="${h - 6}" class="tick" text-anchor="end">${d8.at(-1).slice(5)}</text>
<path d="${d}" class="line s${a.slot}"/>
<circle cx="${x(d8.length - 1)}" cy="${y(vals.at(-1))}" r="4" class="dot s${a.slot}"/>
</svg>
</figure>`;
    })
    .join("\n")}</div>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Total distinct real users per app, each window split into active (signed in
// within N days) and churned (its exact complement, so the pair always sums to
// the total). One shared x-scale across apps so bar length means headcount
// everywhere; active/churned are two steps of one hue, the meter pattern.
function retentionChart() {
  const WINDOWS = [7, 14, 30];
  const withRet = apps.filter((a) => a.retention);
  if (!withRet.length) return "";
  const maxTotal = Math.max(1, ...withRet.map((a) => a.retention.total));

  const w = 320, rowH = 30, padL = 34, padR = 10, padT = 6;
  const barW = w - padL - padR;
  const h = padT + WINDOWS.length * rowH + 4;

  return `<div class="sm-grid">${withRet
    .map((a) => {
      const r = a.retention;
      if (!r.total) {
        return `<figure class="sm">
<figcaption>${esc(a.name)} <strong>0</strong></figcaption>
<div class="empty">No signed-in users yet</div>
</figure>`;
      }
      const rows = WINDOWS.map((n, i) => {
        const active = r[`active_${n}`] ?? 0;
        const churned = r.total - active;
        const y = padT + i * rowH;
        const full = (r.total / maxTotal) * barW;
        const aw = (active / maxTotal) * barW;
        const gap = active && churned ? 2 : 0;
        const cw = Math.max(0, full - aw - gap);
        // Hit areas are the full row height so a 14px bar is easy to hover, and
        // carry tabindex so the roster is reachable without a mouse.
        const hit = (kind) =>
          `${hoverAttr("ret", a.id, n, kind)} tabindex="0" role="img" aria-label="${esc(a.name)} ${n}-day ${kind}"`;
        const parts = [];
        if (active) parts.push(`<rect x="${padL}" y="${y}" width="${aw.toFixed(1)}" height="14" rx="4" class="ret-active"/>
<rect x="${padL}" y="${y - 4}" width="${aw.toFixed(1)}" height="22" fill="transparent" class="ret-hit" ${hit("active")}/>`);
        if (churned) parts.push(`<rect x="${(padL + aw + gap).toFixed(1)}" y="${y}" width="${cw.toFixed(1)}" height="14" rx="4" class="ret-churned"/>
<rect x="${(padL + aw + gap).toFixed(1)}" y="${y - 4}" width="${cw.toFixed(1)}" height="22" fill="transparent" class="ret-hit" ${hit("churned")}/>`);
        return `<g>
<text x="${padL - 6}" y="${y + 11}" class="tick" text-anchor="end">${n}d</text>
${parts.join("")}
<text x="${(padL + full + 6).toFixed(1)}" y="${y + 11}" class="barval">${active}<tspan class="barval-muted"> / ${churned}</tspan></text>
</g>`;
      }).join("\n");
      return `<figure class="sm ret-fig">
<figcaption><span class="key s${a.slot}"></span>${esc(a.name)} <strong>${fmt(r.total)}</strong></figcaption>
<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(a.name)} active versus churned users by window">
${rows}
</svg>
</figure>`;
    })
    .join("\n")}</div>`;
}

// ---------- Stat tiles ----------

function tiles(win) {
  const label = windowLabel(win);
  return apps
    .map((a) => {
      const inWin = sum(lastN(a.newDaily, win));
      // Compare against the immediately preceding window of the same length, so
      // the delta answers "versus the last one of these" whatever is selected.
      const prev = sum(a.newDaily.slice(-2 * win, -win));
      const delta = inWin - prev;
      const deltaTxt = `${delta >= 0 ? "+" : "−"}${fmt(Math.abs(delta))} vs prior ${label}`;
      const err = a.lastError && (!a.lastCollected || a.lastError.at > a.lastCollected)
        ? `<div class="err">⚠ collection failing: ${esc(a.lastError.message.slice(0, 90))}</div>`
        : "";
      // Never render uncollected apps as zeros — that reads as "no activity".
      const guestRow = a.guestUsers
        ? `<div class="row"><span>Guest sessions (anonymous)</span><strong>${fmt(a.guestUsers)}</strong></div>`
        : "";
      const cov = a.coverage
        ? `<div class="row"><span>Registered on shared project</span><strong>${fmt(a.coverage.registered)}</strong></div>`
        : "";
      const exRow = a.excludedUsers
        ? `<div class="row excl"><span>Excluded (ours / QA / automated)</span><strong>${fmt(a.excludedUsers)}</strong></div>`
        : "";
      const body = a.hasData
        ? `<div class="value">${fmt(a.totalUsers)}</div>
  <div class="sub">${esc(a.totalsLabel)}</div>
  <div class="row"><span>DAU yesterday</span><strong>${fmt(a.dau.at(-2) ?? 0)}</strong>${
    a.dauGuest.at(-2) ? `<span class="delta">+${fmt(a.dauGuest.at(-2))} guest sessions</span>` : ""
  }</div>${guestRow}${cov}${exRow}
  <div class="row"><span>New users, ${label}</span><strong>${fmt(inWin)}</strong> <span class="delta ${delta >= 0 ? "up" : "down"}">${deltaTxt}</span></div>`
        : `<div class="value nodata">—</div>
  <div class="sub">not collected yet</div>`;
      return `<div class="tile">
  <div class="tile-head"><span class="key s${a.slot}"></span><span class="label">${esc(a.name)}</span></div>
  ${body}
  ${a.note ? `<div class="note">${esc(a.note)}</div>` : ""}
  ${err}
</div>`;
    })
    .join("\n");
}

// ---------- Table view ----------

function table() {
  const head = plotted.map((a) => `<th colspan="3">${esc(a.name)}</th>`).join("");
  const sub = plotted.map(() => `<th>DAU</th><th>Guest</th><th>New</th>`).join("");
  // Rendered ONCE and filtered by each row's own timestamp — the [data-since]
  // mechanism in lib/windows.mjs. Four copies of a 30-row table would be four
  // chances to disagree.
  const rows = dates
    .slice()
    .reverse()
    .map((d, ri) => {
      const i = dates.length - 1 - ri;
      const cells = plotted.map((a) => `<td>${fmt(a.dau[i])}</td><td class="muted">${fmt(a.dauGuest[i])}</td><td>${fmt(a.newDaily[i])}</td>`).join("");
      // End of that day, so a row is in the window whenever any of it is.
      const since = Date.parse(`${d}T23:59:59Z`);
      return `<tr data-since="${since}"><td>${d}</td>${cells}</tr>`;
    })
    .join("\n");
  return `<table><thead><tr><th rowspan="2">Date</th>${head}</tr><tr>${sub}</tr></thead><tbody data-since-group>${rows}</tbody></table>`;
}

// ---------- Page ----------

const legend = plotted
  .map((a) => `<span class="legend-item"><span class="key s${a.slot}"></span>${esc(a.name)}</span>`)
  .join("");

// The full-length daily series, indexed by the full `dates` list. Each window's
// chart carries only its own slice of dates and looks values up in here, so the
// numbers behind every window come from one array.
const chartData = JSON.stringify({
  dates,
  apps: plotted.map((a) => ({ id: a.id, name: a.name, slot: a.slot, dau: a.dau })),
});

// Every roster this page can show, flattened to the one shape lib/hover.mjs
// consumes: `key -> { total, names }`. Two families of key:
//   ret|<app>|<window>|<active|churned>   the retention bars
//   day|<app>|<YYYY-MM-DD>                one day of the DAU line
// Building them here means the emails are delivered as PARSED JSON rather than
// evaluated script, which is the whole reason the layer is centralised.
const hovRosters = {};

// `total` is the server's count — the number the bar actually draws. The names
// are recomputed here from last_seen and capped, so if the two ever disagree it
// surfaces as "+N more" rather than as a headline that contradicts the bar.
function retentionNames(appId, win, kind) {
  const rows = accounts[appId]?.roster ?? [];
  const cutoff = Date.now() - win * 86400_000;
  const inWindow = (r) => r.last_seen && new Date(r.last_seen).getTime() >= cutoff;
  return rows
    .filter((r) => (kind === "active" ? inWindow(r) : !inWindow(r)))
    .sort((p, q) => String(q.last_seen ?? "").localeCompare(String(p.last_seen ?? "")))
    .slice(0, ROSTER_STORE_CAP)
    .map((r) => {
      const who = userLabel({ email: r.email });
      if (!r.last_seen) return `${who} · never seen`;
      // Flag activity-derived last-seen: a persisted session makes sign-in
      // alone understate activity, which is the point of the measure.
      const viaActivity = r.last_activity && (!r.last_sign_in_at || r.last_activity > r.last_sign_in_at);
      return `${who} · ${String(r.last_seen).slice(0, 10)} (${viaActivity ? "activity" : "sign-in"})`;
    });
}

for (const a of apps) {
  if (a.retention) {
    for (const n of [7, 14, 30]) {
      const active = a.retention[`active_${n}`] ?? 0;
      hovRosters[`ret|${a.id}|${n}|active`] = { total: active, names: retentionNames(a.id, n, "active") };
      hovRosters[`ret|${a.id}|${n}|churned`] = {
        total: a.retention.total - active,
        names: retentionNames(a.id, n, "churned"),
      };
    }
  }
  for (const [day, emails] of Object.entries(accounts[a.id]?.activeByDay ?? {})) {
    hovRosters[`day|${a.id}|${day}`] = roster(emails, (e) => userLabel({ email: e }));
  }
}

const generated = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>App analytics</title>
<style>
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb;
  --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --baseline: #c3c2b7; --border: rgba(11,11,11,0.10);
  --up: #006300; --down: #d03b3b;
  --s0: #2a78d6; --s1: #eb6834; --s2: #1baf7a; --s3: #eda100;
  --ret-a: #2a78d6; --ret-c: #cde2fb;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19;
    --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --baseline: #383835; --border: rgba(255,255,255,0.10);
    --up: #0ca30c; --down: #e66767;
    --s0: #3987e5; --s1: #d95926; --s2: #199e70; --s3: #c98500;
    --ret-a: #3987e5; --ret-c: #184f95;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #0d0d0d; --surface: #1a1a19;
  --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --baseline: #383835; --border: rgba(255,255,255,0.10);
  --up: #0ca30c; --down: #e66767;
  --s0: #3987e5; --s1: #d95926; --s2: #199e70; --s3: #c98500;
  --ret-a: #3987e5; --ret-c: #184f95;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 28px 20px 60px; }
h1 { font-size: 22px; margin: 0 0 2px; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
h2 { font-size: 16px; margin: 34px 0 4px; }
.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.tile { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.tile-head { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
.label { color: var(--ink-2); font-size: 14px; }
.value { font-size: 30px; font-weight: 600; }
.sub { color: var(--muted); font-size: 12px; margin-bottom: 10px; }
.value.nodata { color: var(--muted); }
.row { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; color: var(--ink-2);
  padding: 3px 0; border-top: 1px solid var(--grid); flex-wrap: wrap; }
.row strong { color: var(--ink); font-variant-numeric: tabular-nums; }
.delta { font-size: 12px; width: 100%; text-align: right; }
.delta.up { color: var(--up); } .delta.down { color: var(--down); }
.note { color: var(--muted); font-size: 12px; margin-top: 8px; }
.err { color: var(--down); font-size: 12px; margin-top: 8px; }
.legend { display: flex; gap: 16px; flex-wrap: wrap; margin: 6px 0 8px; color: var(--ink-2); font-size: 13px; }
.legend-item { display: inline-flex; align-items: center; gap: 6px; }
.key { display: inline-block; width: 14px; height: 3px; border-radius: 2px; }
.key.s0 { background: var(--s0); } .key.s1 { background: var(--s1); }
.key.s2 { background: var(--s2); } .key.s3 { background: var(--s3); }
.chart { position: relative; background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 6px 4px; }
.chart svg { display: block; width: 100%; height: auto; }
.grid { stroke: var(--grid); stroke-width: 1; }
.baseline { stroke: var(--baseline); stroke-width: 1; }
.tick { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.endlabel { fill: var(--ink-2); font-size: 12px; }
.line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.line.s0 { stroke: var(--s0); } .line.s1 { stroke: var(--s1); }
.line.s2 { stroke: var(--s2); } .line.s3 { stroke: var(--s3); }
.dot { stroke: var(--surface); stroke-width: 2; }
.dot.s0 { fill: var(--s0); } .dot.s1 { fill: var(--s1); }
.dot.s2 { fill: var(--s2); } .dot.s3 { fill: var(--s3); }
.xhair { stroke: var(--baseline); stroke-width: 1; }
.tooltip { position: absolute; pointer-events: none; background: var(--surface);
  border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; font-size: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.12); min-width: 150px; z-index: 2; }
.tooltip .tt-date { color: var(--muted); margin-bottom: 4px; }
.tooltip .tt-row { display: flex; align-items: center; gap: 6px; padding: 1px 0; color: var(--ink-2); }
.tooltip .tt-row strong { color: var(--ink); margin-left: auto; font-variant-numeric: tabular-nums; }
.axisnote { color: var(--muted); font-size: 12px; margin: 2px 0 10px; }
.sm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.sm { margin: 0; background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 10px 8px 2px; }
.sm figcaption { display: flex; align-items: center; gap: 6px; color: var(--ink-2);
  font-size: 13px; padding: 0 4px 4px; }
.sm figcaption strong { color: var(--ink); margin-left: auto; font-variant-numeric: tabular-nums; }
.sm svg { display: block; width: 100%; height: auto; }
details { margin-top: 30px; }
summary { cursor: pointer; color: var(--ink-2); }
table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 13px;
  background: var(--surface); }
th, td { border: 1px solid var(--grid); padding: 4px 8px; text-align: right;
  font-variant-numeric: tabular-nums; }
th { color: var(--ink-2); font-weight: 600; }
td:first-child, th:first-child { text-align: left; }
.tablewrap { overflow-x: auto; }
td.muted { color: var(--muted); }
.row.excl span, .row.excl strong { color: var(--muted); font-weight: 500; }
.ret-active { fill: var(--ret-a); }
.ret-churned { fill: var(--ret-c); }
.swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }
.swatch.ret-active { background: var(--ret-a); }
.swatch.ret-churned { background: var(--ret-c); }
.barval { fill: var(--ink); font-size: 11px; font-variant-numeric: tabular-nums; }
.barval-muted { fill: var(--muted); }
.empty { color: var(--muted); font-size: 12px; padding: 14px 4px 18px; }
.tt-email { color: var(--ink-2); font-size: 11px; padding: 1px 0; word-break: break-all; }
.tt-more { color: var(--muted); font-size: 11px; padding: 2px 0 0; font-style: italic; }
.tt-emails { padding: 2px 0 4px 20px; }
.ret-fig { position: relative; }
.ret-hit { cursor: pointer; outline: none; }
.ret-hit:focus-visible { stroke: var(--ink); stroke-width: 1.5; }
</style>
<main>
<h1>App analytics</h1>
<div class="meta">Doggle · Pickleague · Michi-Maker · TCGScan &nbsp;·&nbsp; generated ${generated}<br>Excludes our own, seeded, QA/test and automated accounts (see config/exclusions.json). Guest = anonymous session, not an account.</div>

${windowBar(WINDOWS, DEFAULT_WIN, "Scopes the trailing daily series — the days in view, and new users counted over them.")}

<p class="axisnote">Each tile's headline total, guest and excluded counts are point-in-time and do <strong>not</strong> move with the window; only the new-user row does.</p>
<div class="tiles">
${WINDOWS.map((w) => `<div data-w="${w}" class="tiles-w"${w === DEFAULT_WIN ? "" : " hidden"}>${tiles(w)}</div>`).join("\n")}
</div>

<h2>Total distinct users — active vs churned</h2>
<p class="axisnote">Active = signed in <em>or</em> took any tracked in-app action within the window &mdash; a persisted session means sign-in alone understates activity. Churned is the exact complement, so each pair sums to that app's total. Shared scale across apps, so bar length is headcount. Numbers read active / churned; hover a bar to see which accounts. <strong>This panel carries its own 7/14/30 split and does not follow the toggle above.</strong></p>
<div class="legend"><span class="legend-item"><span class="swatch ret-active"></span>Active</span><span class="legend-item"><span class="swatch ret-churned"></span>Churned</span></div>
${retentionChart()}

<h2>Daily active users — signed-in accounts</h2>
<p class="axisnote">One y-scale across every window, so narrowing the window zooms the dates without ever making a line look taller.</p>
<div class="legend">${legend}</div>
${WINDOWS.map((w) =>
  `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${
    PLOTTABLE(w)
      ? lineChart("dau", "dau", w)
      : `<p class="axisnote">A single day is one point, not a trend — the <strong>DAU yesterday</strong> row on each tile above is the 24-hour view.</p>`
  }</div>`).join("\n")}

<h2>Cumulative new users</h2>
<p class="axisnote">Accumulated <em>within</em> the selected window — a 7d view does not carry in signups from day 8. Each panel keeps its own scale, pinned to the widest window, because the apps differ in size by orders of magnitude.</p>
${WINDOWS.map((w) =>
  `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${
    PLOTTABLE(w)
      ? smallMultiples(w)
      : `<p class="axisnote">Nothing to accumulate over a single day — see the new-user row on each tile.</p>`
  }</div>`).join("\n")}

<details>
<summary>Data table (${plotted.length} apps, one row per day in the window)</summary>
<div class="tablewrap">${table()}</div>
</details>

${hoverLayer(hovRosters, { unit: "account/accounts" })}
${windowScript(WINDOWS, DEFAULT_WIN)}
</main>
<script>
const DATA = ${chartData};
const MAX_NAMES = ${HOVER_MAX_NAMES};
const PADL = ${PAD.l}, PADR = ${PAD.r}, VW = ${W};

// The retention bars are handled entirely by the shared hover layer above —
// they carry data-hov keys and need no code here.
//
// The line charts keep their own crosshair, because the shared layer shows one
// roster and this tooltip is a multi-series readout: a date, then every app's
// value for it. It reads names out of the SAME parsed blob rather than a second
// inlined copy, so emails are still never evaluated as script.
let HOV = {};
try { HOV = JSON.parse(document.getElementById("hov-data").textContent || "{}"); } catch (e) {}

// Names are user-supplied strings: build these nodes with textContent only.
function nameList(parent, entry) {
  const names = (entry.names || []).slice(0, MAX_NAMES);
  for (const nm of names) {
    const row = document.createElement("div");
    row.className = "tt-email";
    row.textContent = nm;
    parent.appendChild(row);
  }
  if (entry.total > names.length) {
    const more = document.createElement("div");
    more.className = "tt-more";
    more.textContent = "+" + (entry.total - names.length) + " more (" + entry.total + " total)";
    parent.appendChild(more);
  }
}
for (const el of document.querySelectorAll(".chart")) {
  const kind = "dau"; // the only crosshair chart on this page
  const svg = el.querySelector("svg");
  const hit = el.querySelector(".hit");
  const xhair = el.querySelector(".xhair");
  const tip = el.querySelector(".tooltip");
  // Each window renders its own chart, so the x-axis is this chart's slice of
  // dates. Values are still looked up in the ONE full-length series by date —
  // never re-derived per window, so no two windows can disagree about a day.
  let DTS = [];
  try { DTS = JSON.parse(el.dataset.dates || "[]"); } catch (e) {}
  const show = (clientX) => {
    if (!DTS.length) return;
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * VW;
    const frac = Math.min(1, Math.max(0, (vx - PADL) / (VW - PADL - PADR)));
    const span = Math.max(1, DTS.length - 1);
    const i = Math.round(frac * span);
    const day = DTS[i];
    const gi = DATA.dates.indexOf(day);
    if (gi < 0) return;
    const snapX = PADL + (i / span) * (VW - PADL - PADR);
    xhair.setAttribute("x1", snapX); xhair.setAttribute("x2", snapX);
    xhair.style.display = "";
    tip.replaceChildren();
    const dt = document.createElement("div"); dt.className = "tt-date";
    dt.textContent = day; tip.appendChild(dt);
    for (const a of DATA.apps) {
      const row = document.createElement("div"); row.className = "tt-row";
      const key = document.createElement("span"); key.className = "key s" + a.slot;
      const name = document.createElement("span"); name.textContent = a.name;
      const val = document.createElement("strong");
      val.textContent = a[kind][gi].toLocaleString("en-US");
      row.append(key, name, val); tip.appendChild(row);
      // On the DAU chart, name who was active that day.
      if (kind === "dau") {
        const who = HOV["day|" + a.id + "|" + day];
        if (who && who.total) {
          const box = document.createElement("div");
          box.className = "tt-emails";
          nameList(box, who);
          tip.appendChild(box);
        }
      }
    }
    tip.style.display = "";
    const px = (snapX / VW) * r.width;
    tip.style.left = Math.min(px + 14, r.width - 170) + "px";
    tip.style.top = "24px";
  };
  hit.addEventListener("pointermove", (e) => show(e.clientX));
  hit.addEventListener("pointerleave", () => { tip.style.display = "none"; xhair.style.display = "none"; });
  hit.setAttribute("tabindex", "0");
  hit.addEventListener("focus", () => show(svg.getBoundingClientRect().right - 1));
  hit.addEventListener("blur", () => { tip.style.display = "none"; xhair.style.display = "none"; });
}
</script>
`;

mkdirSync(join(ROOT, "reports"), { recursive: true });
writeFileSync(join(ROOT, "reports", "report.html"), "<!doctype html>\n<html><head>" + html + "</html>");

// Markdown summary
const md = [
  `# App analytics — last ${WINDOW} days`,
  ``,
  `Generated ${generated}`,
  ``,
  `| App | Total users | DAU (yesterday) | New users 7d | New users 30d |`,
  `|---|---|---|---|---|`,
  ...apps.map((a) =>
    a.hasData
      ? `| ${a.name} | ${fmt(a.totalUsers)} | ${fmt(a.dau.at(-2) ?? 0)} | ${fmt(sum(a.newDaily.slice(-7)))} | ${fmt(sum(a.newDaily))} |`
      : `| ${a.name} | _not collected_ | — | — | — |`),
  ``,
  `## Total distinct users — active vs churned`,
  ``,
  `| App | Total | Active 7d | Churned 7d | Active 14d | Churned 14d | Active 30d | Churned 30d |`,
  `|---|---|---|---|---|---|---|---|`,
  ...apps
    .filter((a) => a.retention)
    .map((a) => {
      const r = a.retention;
      const cell = (n) => `${r[`active_${n}`]} | ${r.total - r[`active_${n}`]}`;
      return `| ${a.name} | ${r.total} | ${cell(7)} | ${cell(14)} | ${cell(30)} |`;
    }),
  ``,
  ...apps.filter((a) => a.note).map((a) => `- ${a.name}: ${a.note}`),
].join("\n");
writeFileSync(join(ROOT, "reports", "latest.md"), md + "\n");

console.log(`Wrote reports/report.html and reports/latest.md (${plotted.length} apps, window ${dates[0]} → ${dates.at(-1)})`);
