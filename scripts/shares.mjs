// Shared-binder lane: who is arriving on somebody else's binder, and what they
// do next.
//
// This needs NO new instrumentation. A `page.view` already carries
// `props.route = /binder/<uuid>`, so the binder id is in the data; joining it to
// `binders.owner_id` and comparing against the viewer separates a visitor from
// the owner reading their own binder. Everything below is derived from rows that
// already exist.
//
// The one thing the route cannot tell us is HOW someone arrived — a link from a
// friend and a click from /discover look identical. That is a real limit and the
// report says so, but it does not stop the channel from being measured: a
// non-owner opening a binder is the arrival, whatever carried them there.
//
// Writes data/shares.json (counts only, committed) + data/shares-roster.json
// (identity, gitignored) + reports/shares.html.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, exclusionCte } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, ROSTER_STORE_CAP, userLabel } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const CFG = readConfig("events.json");
const PROJECT = CFG.projectRef;
const DATA_FILE = join(ROOT, "data", "shares.json");
const ROSTER_FILE = join(ROOT, "data", "shares-roster.json");
const HTML_FILE = join(ROOT, "reports", "shares.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the shares lane needs Management API access.");
  process.exit(1);
}

// Every /binder/<id> view, resolved against the binder it names. `owner_id` is
// null when the id does not exist in `binders` — a local-only or deleted binder,
// which is not a share arrival and must not be counted as one.
const viewsSql = `
with ${exclusionCte("michi-maker")},
v as (
  select e.user_id, e.session_id, e.ts,
         substring(e.props->>'route' from '^/binder/([0-9a-f-]{36})$') as bid_text
  from public.analytics_events e
  where e.name = 'page.view'
    and e.app = 'michi'
    and e.props->>'route' like '/binder/%'
)
select v.user_id, v.session_id, v.ts,
       b.id as binder_id, b.owner_id, b.is_public,
       (b.id is not null and b.owner_id = v.user_id) as is_owner,
       (b.id is null) as unresolved,
       (v.user_id in (select id from excluded_users)) as excluded,
       coalesce(pr.username, '') as username, u.email, coalesce(u.is_anonymous,false) as anon
from v
left join public.binders b on v.bid_text is not null and b.id = v.bid_text::uuid
left join auth.users u on u.id = v.user_id
left join public.profiles pr on pr.id = v.user_id
order by v.ts`;

// What each viewer did across the whole stream, for the follow-on funnel.
const actsSql = `
select user_id, session_id, name, ts
from public.analytics_events
where app = 'michi'
order by ts`;

// Reshares are the durable proof someone liked a binder enough to copy it.
const resharesSql = `
with ${exclusionCte("michi-maker")}
select r.copied_by, r.source_binder_id, r.created_at,
       (r.copied_by in (select id from excluded_users)) as excluded
from public.binder_reshares r
order by r.created_at`;

const [views, acts, reshares] = await Promise.all([
  runSql(PROJECT, viewsSql),
  runSql(PROJECT, actsSql),
  runSql(PROJECT, resharesSql),
]);

const collectedAt = new Date().toISOString();
const NOW = Date.now();
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WINDOW = ALL_WINDOW;
const inWin = (ts, w) => w === ALL_WINDOW || Date.parse(ts) >= NOW - Number(w) * 86400_000;

const identity = new Map();
for (const v of views) {
  if (!identity.has(v.user_id)) {
    identity.set(v.user_id, { id: v.user_id, username: v.username || null, email: v.email, anon: v.anon });
  }
}
const label = (id) => userLabel(identity.get(id) ?? { id });
const roster = (ids) => {
  const names = [...new Set(ids)].map(label).sort((a, b) => a.localeCompare(b));
  return { total: names.length, names: names.slice(0, ROSTER_STORE_CAP) };
};

// Per-user event names and per-session names, so "did something after arriving"
// can be asked of the arrival's own session rather than of all time.
const namesByUser = new Map();
const namesBySession = new Map();
for (const a of acts) {
  if (!namesByUser.has(a.user_id)) namesByUser.set(a.user_id, new Set());
  namesByUser.get(a.user_id).add(a.name);
  if (a.session_id) {
    if (!namesBySession.has(a.session_id)) namesBySession.set(a.session_id, new Set());
    namesBySession.get(a.session_id).add(a.name);
  }
}
const firstTsByUser = new Map();
for (const a of acts) if (!firstTsByUser.has(a.user_id)) firstTsByUser.set(a.user_id, a.ts);

const MADE = ["binder.add", "csv.import", "card.add"];
const BROWSED = ["page.view", "card.search", "demo.tricolor_search", "demo.csv_import", "demo.curation", "demo.print"];

const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WINDOW, byWindow: {} };
const rosters = {};

for (const w of WINDOWS) {
  const vs = views.filter((v) => !v.excluded && inWin(v.ts, w));
  const visitor = vs.filter((v) => v.is_owner === false && !v.unresolved);
  const owner = vs.filter((v) => v.is_owner === true);
  const unresolved = vs.filter((v) => v.unresolved);

  // Funnel over VISITORS: people who opened a binder that is not theirs.
  const visitorIds = [...new Set(visitor.map((v) => v.user_id))];
  const visitorSessions = new Set(visitor.map((v) => v.session_id).filter(Boolean));
  // "Went elsewhere" is asked of the arrival's own session — a visit that led
  // nowhere and a visit followed by a week of use are different outcomes, and
  // an all-time check would score them the same.
  const browsedIds = visitorIds.filter((id) =>
    visitor.some((v) => v.user_id === id && [...(namesBySession.get(v.session_id) ?? [])].some((n) => BROWSED.includes(n) )) &&
    (namesByUser.get(id)?.size ?? 0) > 1,
  );
  const signedIds = browsedIds.filter((id) => namesByUser.get(id)?.has("account.created"));
  const madeIds = signedIds.filter((id) => [...(namesByUser.get(id) ?? [])].some((n) => MADE.includes(n)));

  // Landing on somebody else's binder as the very FIRST thing you ever did is
  // the strongest "came from a link" signal the data can give.
  const firstTouch = visitorIds.filter((id) => {
    const f = firstTsByUser.get(id);
    return f && visitor.some((v) => v.user_id === id && v.ts === f);
  });

  const perBinder = {};
  for (const v of visitor) {
    const b = (perBinder[v.binder_id] ??= { binder: v.binder_id, isPublic: v.is_public, views: 0, viewers: new Set() });
    b.views++;
    b.viewers.add(v.user_id);
  }
  const topBinders = Object.values(perBinder)
    .map((b) => {
      rosters[`binder|${w}|${b.binder}`] = roster([...b.viewers]);
      return { binder: b.binder.slice(0, 8), isPublic: b.isPublic, views: b.views, viewers: b.viewers.size };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const rs = reshares.filter((r) => !r.excluded && inWin(r.created_at, w));

  rosters[`f|${w}|opened`] = roster(visitorIds);
  rosters[`f|${w}|browsed`] = roster(browsedIds);
  rosters[`f|${w}|signed`] = roster(signedIds);
  rosters[`f|${w}|made`] = roster(madeIds);
  rosters[`t|${w}|visitors`] = roster(visitorIds);
  rosters[`t|${w}|owners`] = roster(owner.map((v) => v.user_id));
  rosters[`t|${w}|firsttouch`] = roster(firstTouch);
  rosters[`t|${w}|reshare`] = roster(rs.map((r) => r.copied_by));

  out.byWindow[w] = {
    views: vs.length,
    visitorViews: visitor.length,
    ownerViews: owner.length,
    unresolvedViews: unresolved.length,
    visitors: visitorIds.length,
    firstTouch: firstTouch.length,
    reshares: rs.length,
    bindersVisited: Object.keys(perBinder).length,
    topBinders,
    funnel: [
      { id: "opened", label: "Opened someone else's binder", users: visitorIds.length },
      { id: "browsed", label: "Went elsewhere in the app", users: browsedIds.length },
      { id: "signed", label: "Created an account", users: signedIds.length },
      { id: "made", label: "Made something of their own", users: madeIds.length },
    ],
    excludedViews: views.filter((v) => v.excluded && inWin(v.ts, w)).length,
  };
}

const publicBinders = [...new Set(views.filter((v) => v.is_public).map((v) => v.binder_id))].length;
out.context = { publicBindersSeen: publicBinders };

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const maxFunnel = Math.max(1, ...WINDOWS.flatMap((w) => out.byWindow[w].funnel.map((s) => s.users)));

const blocks = WINDOWS.map((w) => {
  const d = out.byWindow[w];
  const top = d.funnel[0].users;
  const rows = d.funnel
    .map((s, i) => {
      const width = top > 0 ? Math.max(s.users > 0 ? 2 : 0, (s.users / top) * 100) : 0;
      const drop = i > 0 && d.funnel[i - 1].users > s.users ? d.funnel[i - 1].users - s.users : 0;
      return `<tr ${hoverAttr("f", "{scope}", s.id)}>
  <td class="fl">${esc(s.label)}</td>
  <td class="fb"><span class="bar" style="width:${width.toFixed(1)}%"></span></td>
  <td class="fn">${s.users}</td>
  <td class="fd">${drop ? `&minus;${drop}` : ""}</td>
</tr>`;
    })
    .join("\n");

  const tiles = [
    ["Visitor views", d.visitorViews, "opens of a binder that is not yours", "visitors"],
    ["Distinct visitors", d.visitors, `across ${d.bindersVisited} binder${d.bindersVisited === 1 ? "" : "s"}`, "visitors"],
    ["Arrived cold", d.firstTouch, "a binder was their first ever action", "firsttouch"],
    ["Reshares", d.reshares, "copied someone's binder into their own", "reshare"],
  ]
    .map(
      ([k, v, sub, rk]) =>
        `<div class="tile" ${hoverAttr("t", "{scope}", rk)}><div class="k">${esc(k)}</div><div class="value${v === 0 ? " zero" : ""}">${v}</div><div class="sub">${esc(sub)}</div></div>`,
    )
    .join("");

  const binderRows = d.topBinders.length
    ? d.topBinders
        .map(
          (b) =>
            `<tr ${hoverAttr("binder", "{scope}", b.binder)}><td><code>${esc(b.binder)}</code>${b.isPublic ? ' <span class="pill">public</span>' : ' <span class="pill warn">private</span>'}</td><td class="num">${b.views}</td><td class="num">${b.viewers}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="empty">No binder has been opened by anyone but its owner in this window.</td></tr>`;

  return `<div data-w="${w}"${w === DEFAULT_WINDOW ? "" : " hidden"}>
<div class="tiles">${tiles}</div>
<p class="note">Also in this window: <strong>${d.ownerViews}</strong> owner-viewing-own-binder ${d.ownerViews === 1 ? "open" : "opens"} (the baseline, not arrivals),
<strong>${d.unresolvedViews}</strong> of binders that do not exist in the cloud table — local-only or deleted, and never a share arrival —
and <strong>${d.excludedViews}</strong> from our own or QA accounts.</p>

<h2>What visitors do next</h2>
<div class="funnel"><table class="ftab">${rows}</table></div>

<h2>Binders people are opening</h2>
<table class="tbl"><thead><tr><th>Binder</th><th class="num">Visitor views</th><th class="num">Visitors</th></tr></thead><tbody>${binderRows}</tbody></table>
</div>`;
}).join("\n");

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shared binders — visitors and what they do</title>
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
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:28px 0 6px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:10px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.tile .k{font-size:12px;color:var(--ink-2)}
.tile .value{font-size:28px;font-weight:650}
.tile .value.zero{color:var(--muted)}
.tile .sub{color:var(--muted);font-size:12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.funnel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.ftab{width:100%;border-collapse:collapse;font-size:13px}
.ftab td{padding:4px 0;vertical-align:middle}
.ftab .fl{width:38%} .ftab .fb{width:42%}
.ftab .bar{display:block;height:14px;background:var(--bar);border-radius:3px}
.ftab .fn{width:10%;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;padding-left:10px}
.ftab .fd{width:10%;text-align:right;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.pill{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:20px;border:1px solid var(--border);color:var(--muted)}
.pill.warn{color:var(--warn);border-color:var(--warn)}
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--muted)}
</style>
<main>
<h1>Shared binders</h1>
<p class="meta">Who opens a binder that is not theirs, and what they do next. Derived entirely from
<code>page.view</code> routes already in the stream — the binder id is in the route, and joining it to
<code>binders.owner_id</code> separates a visitor from the owner. No extra instrumentation involved.
Hover any number for the accounts behind it. Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes binder opens by timestamp")}

${blocks}

<p class="note"><strong>What this can and cannot say.</strong> It measures the arrival — somebody who is not
the owner opened a binder — which is the thing that matters for the channel. It cannot say what
carried them there: a link from a friend and a click from <code>/discover</code> look identical in the
route. "Arrived cold" is the closest proxy for a link, since landing on a binder as your first ever
action is not something in-app browsing produces.</p>
</main>
${hoverLayer(rosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

const a = out.byWindow[ALL_WINDOW];
console.log(
  `Shared binders  ${a.visitorViews} visitor view${a.visitorViews === 1 ? "" : "s"} by ${a.visitors} ` +
    `across ${a.bindersVisited} binder${a.bindersVisited === 1 ? "" : "s"}  ·  ${a.firstTouch} arrived cold  ·  ${a.reshares} reshare${a.reshares === 1 ? "" : "s"}`,
);
console.log(`  baseline: ${a.ownerViews} owner opens, ${a.unresolvedViews} unresolved, ${a.excludedViews} excluded`);
console.log(`\nWrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/shares.html`);
