// Events report: reads data/events.json (aggregates) and, when present, the
// gitignored data/journeys.json (identity-bearing per-session timelines and the
// per-number user rosters), and writes reports/events.html + reports/events.md.
//
// Order is deliberate: the questions first, then the evidence, then the gaps.
// The gaps panel is not an appendix — a funnel stage whose definition is known
// to be wrong carries its caveat inline, next to the number it distorts.
//
// Two interactive affordances, both HTML-only:
//   * a 24h / 7d / 14d / 30d window toggle. All four are precomputed and
//     rendered; the toggle only changes which is visible, so there is no
//     client-side recomputation to disagree with the server's.
//   * hover any count to see WHO is behind it. Rosters live in journeys.json,
//     never in the committed aggregates, and are written with textContent —
//     a username is user-supplied text and must never reach innerHTML.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, readConfig } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const DATA = join(ROOT, "data", "events.json");
if (!existsSync(DATA)) {
  console.error("No data/events.json — run `npm run events` first.");
  process.exit(1);
}
const store = JSON.parse(readFileSync(DATA, "utf8"));
const CFG = readConfig("events.json");
const GAPS = CFG.gaps ?? {};

// Optional and gitignored: journeys carry account identity.
const JPATH = join(ROOT, "data", "journeys.json");
const journeys = existsSync(JPATH) ? JSON.parse(readFileSync(JPATH, "utf8")).apps : {};

const MAX_SESSIONS_SHOWN = 40;
const MAX_EVENTS_PER_SESSION = 60;
const WINDOWS = store.windows ?? STANDARD_WINDOWS;
const DEFAULT_WINDOW = Math.max(...WINDOWS);
const apps = Object.entries(store.apps ?? {});

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => (v == null ? "—" : String(v));
const pctS = (v) => (v == null ? "—" : `${v}%`);

function secs(v) {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) return `${Math.round(v / 60)}m`;
  return `${(v / 3600).toFixed(1)}h`;
}
const clock = (ts) => new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
const day = (ts) => new Date(ts).toISOString().slice(0, 10);
const winLabel = windowLabel;

// Sort by how much attention a gap still needs: unfinished work first, then by
// severity. A fixed or deferred gap stays listed — the record of why a number
// once read the way it did is worth more than a tidy list — but it sinks.
const SEV_ORDER = { blocking: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { open: 0, specced: 1, landed: 2, deferred: 3, fixed: 4 };
const gapList = Object.entries(GAPS).sort(
  (a, b) =>
    (STATUS_ORDER[a[1].status ?? "open"] ?? 9) - (STATUS_ORDER[b[1].status ?? "open"] ?? 9) ||
    (SEV_ORDER[a[1].severity] ?? 9) - (SEV_ORDER[b[1].severity] ?? 9),
);

// A hover handle. `{scope}` is replaced with the active window by the shared
// hover layer, so one attribute serves all four windows. Rendered even when the
// roster is missing (aggregates-only run) — the handler finds nothing and shows
// no tooltip rather than erroring.
const hov = (appId, kind, key) => ` ${hoverAttr(appId, "{scope}", kind, key)}`;

// journeys.json nests rosters as app -> window -> kind -> key. The shared hover
// layer wants one flat map, so flatten to the same key shape the markup emits.
const flatRosters = {};
for (const [appId, j] of Object.entries(journeys)) {
  for (const [win, kinds] of Object.entries(j.rosters ?? {})) {
    for (const [kind, entries] of Object.entries(kinds)) {
      for (const [key, r] of Object.entries(entries)) {
        flatRosters[`${appId}|${win}|${kind}|${key}`] = r;
      }
    }
  }
}

// ---------- pieces ----------

function tiles(w, appId) {
  const t = w.totals;
  const cells = [
    ["Sessions", t.sessions, `${t.bouncedSessions} ended without a second event`, "sessions"],
    ["Events", t.events, t.firstEventAt ? `since ${day(t.firstEventAt)}` : "none recorded", "events"],
    ["People", t.users, `${t.realUsers} account${t.realUsers === 1 ? "" : "s"}, ${t.guestUsers} guest${t.guestUsers === 1 ? "" : "s"}`, "users"],
    ["Median session", secs(t.medianSessionSecs), "a floor — see session_end gap", null],
  ];
  return `<div class="tiles">${cells
    .map(
      ([k, v, sub, rk]) =>
        `<div class="tile${rk ? " hoverable" : ""}"${rk ? hov(appId, "tiles", rk) : ""}><div class="k">${esc(k)}</div><div class="value${v === 0 || v === "—" ? " nodata" : ""}">${esc(n(v))}</div><div class="sub">${esc(sub)}</div></div>`,
    )
    .join("")}</div>`;
}

// Funnel bars are width-proportional to the top stage, so the drop-off is the
// visual, not the numbers. A stage with a caveat gets a marker linking to the
// gap that makes it untrustworthy — but only while that gap is still live. A
// `fixed` gap stays in the register as the record of what was wrong and when;
// carrying its marker on the number would keep telling the reader not to trust
// a figure that has since been proven, which is its own kind of wrong. Every
// other status (open / specced / landed / deferred) still earns the marker:
// landed means shipped-but-unproven, which is precisely when to keep warning.
function funnel(f, appId) {
  const top = f.stages[0]?.users ?? 0;
  const rows = f.stages
    .map((s, i) => {
      const w = top > 0 ? Math.max(s.users > 0 ? 2 : 0, (s.users / top) * 100) : 0;
      const drop = i > 0 && f.stages[i - 1].users > s.users ? f.stages[i - 1].users - s.users : 0;
      const live = s.caveat && GAPS[s.caveat]?.status !== "fixed";
      const mark = live
        ? ` <a class="caveat" href="#gap-${esc(s.caveat)}" title="${esc(GAPS[s.caveat]?.title ?? s.caveat)}">!</a>`
        : "";
      return `<tr class="hoverable"${hov(appId, "funnels", `${f.id}|${s.id}`)}>
  <td class="fl">${esc(s.label)}${mark}</td>
  <td class="fb"><span class="bar" style="width:${w.toFixed(1)}%"></span></td>
  <td class="fn">${s.users}</td>
  <td class="fp">${i === 0 ? "" : pctS(s.ofTop)}</td>
  <td class="fd">${drop ? `&minus;${drop}` : ""}</td>
</tr>`;
    })
    .join("\n");
  return `<div class="funnel">
  <div class="q">${esc(f.question)}</div>
  <table class="ftab">${rows}</table>
</div>`;
}

function truthPanel(w) {
  const t = w.truth ?? {};
  const rows = Object.entries(t)
    .map(([kind, v]) => {
      const untracked =
        v.untracked == null
          ? "—"
          : v.untracked > 0
            ? `<span class="warn">${v.untracked} with no event</span>`
            : "all tracked";
      return `<tr><td>${esc(kind)}</td><td class="num">${v.users}</td><td class="num muted">${v.excludedUsers}</td><td>${untracked}</td><td class="muted">${v.earliest ? esc(day(v.earliest)) : "—"}</td></tr>`;
    })
    .join("");
  if (!rows) return "";
  return `<table class="tbl">
  <thead><tr><th>Ground truth</th><th class="num">Users</th><th class="num">Excluded</th><th>Event stream</th><th>Earliest</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="note">Read straight from the product tables (trials, entitlements), not the event stream — so these cover all history and do <strong>not</strong> move with the window above. A row counted here with no matching event is the gap between what happened and what was recorded.</p>`;
}

function eventTable(w, appId) {
  if (!w.eventsByName.length) return `<p class="empty">No events recorded from non-excluded users in this window.</p>`;
  const rows = w.eventsByName
    .map(
      (e) =>
        `<tr class="hoverable"${hov(appId, "events", e.name)}><td>${esc(e.label)}${e.known ? "" : ' <span class="warn">unrecognised</span>'}<div class="mono">${esc(e.name)}</div></td><td class="muted">${esc(e.stage ?? "—")}</td><td class="num">${e.count}</td><td class="num">${e.users}</td></tr>`,
    )
    .join("");
  return `<table class="tbl"><thead><tr><th>Event</th><th>Stage</th><th class="num">Fired</th><th class="num">People</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function routeTable(w, appId) {
  if (!w.routes.length) return "";
  const rows = w.routes
    .map(
      (r) =>
        `<tr class="hoverable"${hov(appId, "routes", r.route)}><td><code>${esc(r.route)}</code>${r.intent === "pricing" ? ' <span class="pill pricing">pricing</span>' : ""}${r.label ? ` <span class="muted">${esc(r.label)}</span>` : ""}</td><td class="num">${r.count}</td><td class="num">${r.users}</td></tr>`,
    )
    .join("");
  return `<h4>Pages</h4><table class="tbl"><thead><tr><th>Route</th><th class="num">Views</th><th class="num">People</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function coveragePanel(a) {
  const c = a.coverage;
  const parts = [];
  parts.push(
    `<p class="note"><strong>${c.fired} of ${c.declared}</strong> instrumented events for this app have fired at least once. Counted across <em>all</em> traffic including our own and QA, and across all time regardless of the window above: whether a <code>track()</code> call site works is a property of the code, so filtering it would report a verified event as broken.</p>`,
  );
  if (c.neverFired.length) {
    parts.push(
      `<p class="note warn">Never fired by anyone: ${c.neverFired.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Unverified — the call site may be unreachable. Exercise these in QA before trusting a zero here as a behavioural finding.</p>`,
    );
  }
  if (c.neverFiredReal?.length) {
    parts.push(
      `<p class="note">Verified working but not yet seen from a real user: ${c.neverFiredReal.map((x) => `<code>${esc(x)}</code>`).join(", ")}. The instrumentation is fine; the behaviour has not happened outside our own accounts.</p>`,
    );
  }
  if (c.planned?.length) {
    const pending = c.planned.filter((x) => !(c.plannedLanded ?? []).includes(x));
    if (pending.length) {
      parts.push(
        `<p class="note">Registered, not yet fired: ${pending.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Kept out of the counts above — an event nobody has written cannot have a broken call site. See <a href="#gaps">tracking gaps</a>.</p>`,
      );
    }
    if (c.plannedLanded?.length) {
      parts.push(
        `<p class="note"><strong>Landed since the spec:</strong> ${c.plannedLanded.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Mark the matching gap <code>fixed</code> in <code>config/events.json</code>.</p>`,
      );
    }
  }
  if (c.unrecognised.length) {
    parts.push(
      `<p class="note warn">Seen in the data but not in the studio taxonomy: ${c.unrecognised.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Add them to <code>config/events.json</code>.</p>`,
    );
  }
  return parts.join("\n");
}

// Journeys are rendered once and filtered client-side by the window toggle —
// each card carries its start time as an epoch so the filter is a comparison,
// not a date parse in a loop.
function journeyPanel(appId) {
  const j = journeys[appId];
  if (!j) return `<p class="note">No <code>data/journeys.json</code> — run <code>npm run events</code> to generate it.</p>`;
  if (!j.sessions.length) return `<p class="empty">No sessions from non-excluded users.</p>`;
  const shown = j.sessions.slice(0, MAX_SESSIONS_SHOWN);
  const cards = shown
    .map((s) => {
      const evs = s.events.slice(0, MAX_EVENTS_PER_SESSION);
      const items = evs
        .map((e) => {
          const cls = ["ev", e.milestone ? "ms" : "", e.pricing ? "pr" : ""].filter(Boolean).join(" ");
          const props = e.props
            ? ` <span class="props">${esc(
                Object.entries(e.props)
                  .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
                  .join(" · "),
              )}</span>`
            : "";
          return `<li class="${cls}"><span class="t">${esc(clock(e.ts))}</span> <span class="lbl">${esc(e.label)}</span>${props}</li>`;
        })
        .join("");
      const more =
        s.events.length > evs.length
          ? `<li class="ev muted">+${s.events.length - evs.length} more event${s.events.length - evs.length === 1 ? "" : "s"}</li>`
          : "";
      return `<details class="sess" data-since="${Date.parse(s.startedAt)}">
  <summary>
    <span class="who">${esc(s.user)}</span>
    ${s.guest ? '<span class="pill guest">guest</span>' : '<span class="pill acct">account</span>'}
    <span class="pill">${esc(s.platform ?? "?")}</span>
    <span class="when">${esc(day(s.startedAt))} ${esc(clock(s.startedAt))}</span>
    <span class="dur">${esc(secs(s.durationSecs))}</span>
    <span class="cnt">${s.events.length} event${s.events.length === 1 ? "" : "s"}</span>
  </summary>
  <ol class="tl">${items}${more}</ol>
</details>`;
    })
    .join("\n");
  const trunc =
    j.sessions.length > shown.length
      ? `<p class="note">Showing the ${shown.length} most recent of ${j.sessions.length} sessions.</p>`
      : "";
  return `<div data-since-group>${cards}</div><p class="note win-empty" hidden>No sessions started in this window.</p>${trunc}`;
}

function appSection(id, a) {
  const widest = a.windows[DEFAULT_WINDOW];
  const plats = Object.entries(widest.totals.platforms ?? {})
    .map(([k, v]) => `${esc(k)} ${v}`)
    .join(" · ");

  // One block per window; the toggle flips which is shown. Precomputing beats
  // recomputing in the browser — the two could not then disagree.
  const blocks = WINDOWS.map((d) => {
    const w = a.windows[d];
    const t = w.totals;
    const excl =
      t.excludedSessions || t.excludedEvents
        ? `<p class="note">Excluded from every number in this view: <strong>${t.excludedSessions}</strong> session${t.excludedSessions === 1 ? "" : "s"} and <strong>${t.excludedEvents}</strong> event${t.excludedEvents === 1 ? "" : "s"} from our own, QA and automated accounts (see <code>config/exclusions.json</code>). The stream is working; that traffic is just ours.</p>`
        : "";
    const orphan = t.orphanEvents
      ? `<p class="note warn">${t.orphanEvents} event${t.orphanEvents === 1 ? "" : "s"} could not be attached to a session.</p>`
      : "";
    return `<div class="wblock" data-w="${d}"${d === DEFAULT_WINDOW ? "" : " hidden"}>
${tiles(w, id)}
${excl}${orphan}
<h3>Questions</h3>
${w.funnels.length ? w.funnels.map((f) => `<h4>${esc(f.title)}</h4>${funnel(f, id)}`).join("\n") : '<p class="empty">No funnels configured.</p>'}
${truthPanel(w)}
<h3>What people did</h3>
${eventTable(w, id)}
${routeTable(w, id)}
</div>`;
  }).join("\n");

  return `<section>
<h2>${esc(a.name)}</h2>
${plats ? `<p class="note">Platforms over ${winLabel(DEFAULT_WINDOW)}: ${plats}.</p>` : ""}
${blocks}

<h3>Instrumentation coverage</h3>
${coveragePanel(a)}

<h3>Sessions &amp; journeys</h3>
${journeyPanel(id)}
</section>`;
}

function gapsSection() {
  const cards = gapList
    .map(
      ([id, g]) => `<div class="gap ${esc(g.severity)}${g.status === "fixed" ? " done" : ""}" id="gap-${esc(id)}">
  <div class="ghead"><span class="sev">${esc(g.severity)}</span> <span class="status st-${esc(g.status ?? "open")}">${esc(g.status ?? "open")}</span> <strong>${esc(g.title)}</strong> <code>${esc(id)}</code></div>
  <p>${esc(g.detail)}</p>
  <p class="dir"><strong>Effect on the numbers:</strong> ${esc(g.direction)}</p>
  <p class="fix"><strong>Fix:</strong> ${esc(g.fix)}</p>
</div>`,
    )
    .join("\n");
  const counts = gapList.reduce((acc, [, g]) => ((acc[g.status ?? "open"] = (acc[g.status ?? "open"] ?? 0) + 1), acc), {});
  const tally = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ");
  return `<section>
<h2 id="gaps">Tracking gaps</h2>
<p class="note">What the product does but the stream does not record. Ordered by how much attention each still needs — ${esc(tally)}.
<strong>specced</strong> means written up in <code>../tcgscan/ANALYTICS-TRACKING-GAPS.md</code> and waiting on the app repos;
<strong>landed</strong> means the code is in but no event has been observed yet, so it is not proven;
<strong>deferred</strong> means a decision was made not to do it, with the reason stated.
A landed gap becomes <strong>fixed</strong> when its event actually appears — the coverage panel above detects that, so it is not a judgement call. Every fix lands in the app repos, never here.</p>
${cards}
</section>`;
}

// ---------- page ----------

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Event analytics — Michi-Maker &amp; TCGScan</title>
<style>
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb;
  --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --border: rgba(11,11,11,0.10);
  --bar: #2a78d6; --bar-dim: #cde2fb;
  --warn: #b45309; --ms: #1baf7a; --pricing: #eb6834;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19;
    --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --border: rgba(255,255,255,0.10);
    --bar: #3987e5; --bar-dim: #184f95;
    --warn: #eda100; --ms: #199e70; --pricing: #d95926;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #0d0d0d; --surface: #1a1a19;
  --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --border: rgba(255,255,255,0.10);
  --bar: #3987e5; --bar-dim: #184f95;
  --warn: #eda100; --ms: #199e70; --pricing: #d95926;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 28px 20px 60px; }
h1 { font-size: 22px; margin: 0 0 2px; }
h2 { font-size: 18px; margin: 40px 0 6px; border-top: 1px solid var(--border); padding-top: 20px; }
h3 { font-size: 15px; margin: 26px 0 6px; }
h4 { font-size: 13px; margin: 18px 0 4px; color: var(--ink-2); font-weight: 600; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 18px; }


.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 10px; }
.tile { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.tile .k { font-size: 12px; color: var(--ink-2); }
.tile .value { font-size: 26px; font-weight: 650; font-variant-numeric: tabular-nums; }
.tile .value.nodata { color: var(--muted); }
.tile .sub { color: var(--muted); font-size: 12px; }
.note { color: var(--muted); font-size: 12.5px; margin: 8px 0; }
.empty { color: var(--muted); font-size: 13px; font-style: italic; margin: 10px 0; }
.warn { color: var(--warn); }
code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }


.funnel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin: 8px 0 4px; }
.funnel .q { color: var(--ink-2); font-size: 13px; margin-bottom: 8px; }
.ftab { width: 100%; border-collapse: collapse; font-size: 13px; }
.ftab td { padding: 3px 0; vertical-align: middle; }
.ftab .fl { width: 34%; padding-right: 10px; }
.ftab .fb { width: 40%; }
.ftab .bar { display: block; height: 14px; background: var(--bar); border-radius: 3px; min-width: 0; }
.ftab .fn { width: 8%; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; padding-left: 10px; }
.ftab .fp { width: 10%; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }
.ftab .fd { width: 8%; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 12px; }
a.caveat { display: inline-block; width: 15px; height: 15px; line-height: 15px; text-align: center;
  background: var(--warn); color: var(--page); border-radius: 50%; font-size: 11px; font-weight: 700;
  text-decoration: none; vertical-align: 1px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.tbl th, .tbl td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border); }
.tbl th { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); font-weight: 600; }
.tbl tr:last-child td { border-bottom: 0; }
.tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.muted { color: var(--muted); }

.pill { display: inline-block; font-size: 10.5px; padding: 1px 6px; border-radius: 20px;
  border: 1px solid var(--border); color: var(--muted); vertical-align: 1px; }
.pill.guest { border-color: var(--muted); }
.pill.acct { color: var(--bar); border-color: var(--bar); }
.pill.pricing { color: var(--pricing); border-color: var(--pricing); }

.sess { background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 8px 12px; margin-bottom: 6px; }
.sess summary { cursor: pointer; font-size: 13px; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.sess summary .who { font-weight: 600; }
.sess summary .when, .sess summary .dur, .sess summary .cnt { color: var(--muted); font-size: 12px; }
.sess summary .cnt { margin-left: auto; }
.tl { list-style: none; margin: 8px 0 4px; padding: 0 0 0 4px; border-left: 2px solid var(--grid); }
.tl .ev { font-size: 12.5px; padding: 2px 0 2px 12px; position: relative; }
.tl .ev::before { content: ""; position: absolute; left: -5px; top: 9px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--grid); }
.tl .ev.ms::before { background: var(--ms); }
.tl .ev.pr::before { background: var(--pricing); }
.tl .ev.ms .lbl { font-weight: 600; }
.tl .t { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 6px; }
.tl .props { color: var(--muted); font-size: 11.5px; }

.gap { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--muted);
  border-radius: 8px; padding: 10px 14px; margin: 10px 0; font-size: 13px; }
.gap.blocking { border-left-color: #d03b3b; }
.gap.high { border-left-color: var(--warn); }
.gap.medium { border-left-color: var(--bar); }
.gap.done { opacity: 0.65; }
.gap .ghead { margin-bottom: 4px; }
.gap .sev { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.gap .status { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid var(--border); border-radius: 20px; padding: 1px 6px; color: var(--muted); }
.gap .status.st-specced { color: var(--bar); border-color: var(--bar); }
.gap .status.st-landed { color: var(--warn); border-color: var(--warn); }
.gap .status.st-fixed { color: var(--ms); border-color: var(--ms); }
.gap p { margin: 5px 0; color: var(--ink-2); }
.gap .fix { color: var(--ink); }

</style>
<main>
<h1>Event analytics — Michi-Maker &amp; TCGScan</h1>
<p class="meta">Collected ${esc(store.collectedAt ?? "—")} · source <code>public.analytics_sessions</code> + <code>public.analytics_events</code> on <code>${esc(CFG.projectRef)}</code>.
Our own, QA and automated accounts are excluded throughout; the excluded volume is stated per app so nothing is dropped silently.
Hover any count to see who is behind it. <a href="#gaps">Known tracking gaps &rarr;</a></p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes events and sessions by timestamp")}

${apps.map(([id, a]) => appSection(id, a)).join("\n")}
${gapsSection()}
</main>
${hoverLayer(flatRosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

// ---------- markdown ----------

const mdWin = DEFAULT_WINDOW;
const md = [
  `# Event analytics — last ${mdWin} days`,
  ``,
  `Collected ${store.collectedAt ?? "—"}. Own/QA/automated accounts excluded.`,
  `The HTML report carries a ${WINDOWS.map(winLabel).join(" / ")} toggle and hover rosters; this file is the ${winLabel(mdWin)} view.`,
  ``,
  ...apps.flatMap(([, a]) => {
    const w = a.windows[mdWin];
    const t = w.totals;
    const lines = [
      `## ${a.name}`,
      ``,
      `${t.sessions} sessions · ${t.events} events · ${t.realUsers} account${t.realUsers === 1 ? "" : "s"} + ${t.guestUsers} guest${t.guestUsers === 1 ? "" : "s"} · median session ${secs(t.medianSessionSecs)}`,
      `Excluded: ${t.excludedSessions} sessions, ${t.excludedEvents} events (our own, QA and automated accounts).`,
      ``,
      `| Window | Sessions | Events | People |`,
      `| --- | ---: | ---: | ---: |`,
      ...WINDOWS.map((d) => {
        const x = a.windows[d].totals;
        return `| ${winLabel(d)} | ${x.sessions} | ${x.events} | ${x.users} |`;
      }),
      ``,
    ];
    for (const f of w.funnels) {
      lines.push(`### ${f.title}`, ``, `_${f.question}_`, ``);
      for (const s of f.stages) {
        // Same rule as the HTML: a fixed gap no longer caveats its number.
        const caveat = s.caveat && GAPS[s.caveat]?.status !== "fixed" ? ` — see gap \`${s.caveat}\`` : "";
        lines.push(`- **${s.users}** ${s.label}${s.ofTop != null ? ` (${s.ofTop}% of top)` : ""}${caveat}`);
      }
      lines.push(``);
    }
    if (w.eventsByName.length) {
      lines.push(`| Event | Fired | People |`, `| --- | ---: | ---: |`);
      for (const e of w.eventsByName) lines.push(`| ${e.label} (\`${e.name}\`) | ${e.count} | ${e.users} |`);
      lines.push(``);
    }
    lines.push(`Instrumentation: ${a.coverage.fired}/${a.coverage.declared} events verified firing (all traffic, all time).`, ``);
    if (a.coverage.neverFired.length) {
      lines.push(`Never fired by anyone (unverified): ${a.coverage.neverFired.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    if (a.coverage.neverFiredReal?.length) {
      lines.push(`Works, but not yet from a real user: ${a.coverage.neverFiredReal.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    const pendingMd = (a.coverage.planned ?? []).filter((x) => !(a.coverage.plannedLanded ?? []).includes(x));
    if (pendingMd.length) {
      lines.push(`Registered, not yet fired: ${pendingMd.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    if (a.coverage.plannedLanded?.length) {
      lines.push(`**Landed since the spec:** ${a.coverage.plannedLanded.map((x) => `\`${x}\``).join(", ")} — mark the matching gap \`fixed\`.`, ``);
    }
    return lines;
  }),
  `## Tracking gaps`,
  ``,
  ...gapList.flatMap(([id, g]) => [
    `### ${g.title} \`${id}\` (${g.severity}, ${g.status ?? "open"})`,
    ``,
    g.detail,
    ``,
    `**Effect:** ${g.direction}`,
    ``,
    `**Fix:** ${g.fix}`,
    ``,
  ]),
].join("\n");

const HTML_OUT = join(ROOT, "reports", "events.html");
const MD_OUT = join(ROOT, "reports", "events.md");
mkdirSync(dirname(HTML_OUT), { recursive: true });
writeFileSync(HTML_OUT, html);
writeFileSync(MD_OUT, md);
console.log(`Wrote reports/events.html and reports/events.md (${apps.length} apps, windows ${WINDOWS.map(winLabel).join("/")})`);
