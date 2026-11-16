// Sources lane (ANA-015, MKT-034 action 7): visits that AI assistants and search engines sent
// to the four sites, from data the studio already has. No new tracking.
//
//   Two signals, and they differ per site:
//   1. utm_source on the landing URL (analytics_sessions.landing_route keeps allowlisted
//      utm_* since 2026-08-14). ChatGPT adds utm_source=chatgpt.com to the links it shows,
//      so this sees ChatGPT on every site. Most other assistants add nothing.
//   2. document.referrer (session.start props.referrer, origin + path). Michi web only, since
//      2026-10-29. Doggle, PickLeague and BiBo record no referrer, so a search engine visit
//      there is INVISIBLE: the report prints "not recorded", never 0.
//   So the AI number is a floor everywhere, and the search number exists for Michi only.
//
//   A visit is an analytics_sessions row. Exclusions: exclusionCte per app (our own, QA,
//   automated), Michi dev-mode sessions (session.start props.dev = true, Brian testing on
//   production) and referrers from localhost or our own Vercel previews. All three are
//   counted and stated, never drawn.
//
// Writes data/sources.json (counts, committed), data/sources-roster.json (who and which
// landing page, gitignored) and reports/sources.html (gitignored).

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { ROOT, loadEnv, runSql, exclusionCte, readConfig, dataEvents } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, roster, userLabel } from "./lib/hover.mjs";
import { STANDARD_WINDOWS, ALL_WINDOW, windowBar, windowScript, windowLabel } from "./lib/windows.mjs";

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("FAILED: no SUPABASE_ACCESS_TOKEN in .env - this lane needs Management API access.");
  process.exit(1);
}

const DATA_FILE = join(ROOT, "data", "sources.json");
const ROSTER_FILE = join(ROOT, "data", "sources-roster.json");
const HTML_FILE = join(ROOT, "reports", "sources.html");

const APPS = Object.fromEntries(readConfig("apps.json").apps.map((a) => [a.id, a]));
// The four sites. `key` is the analytics `app` column; `referrerSince` is when that site
// started recording document.referrer (null = it does not).
const SITES = [
  { id: "michi-maker", key: "michi", site: "michi-maker.com", name: "Michi Maker", referrerSince: "2026-10-29" },
  { id: "tcgscan", key: "tcgscan", site: "biboscan.com", name: "BiBo", referrerSince: null },
  { id: "doggle", key: "doggle", site: "doggle.club", name: "Doggle", referrerSince: null },
  { id: "pickleague", key: "pickleague", site: "pickleague.club", name: "PickLeague", referrerSince: null },
];

// AI assistants, by referrer host or utm_source value. Order is the display order.
const ASSISTANTS = [
  { id: "chatgpt", label: "ChatGPT", hosts: ["chatgpt.com", "chat.openai.com"], utm: ["chatgpt.com", "chatgpt", "openai"] },
  { id: "perplexity", label: "Perplexity", hosts: ["perplexity.ai", "www.perplexity.ai"], utm: ["perplexity", "perplexity.ai"] },
  { id: "claude", label: "Claude", hosts: ["claude.ai"], utm: ["claude", "claude.ai"] },
  { id: "gemini", label: "Gemini", hosts: ["gemini.google.com", "bard.google.com"], utm: ["gemini", "gemini.google.com"] },
  { id: "copilot", label: "Copilot", hosts: ["copilot.microsoft.com", "copilot.cloud.microsoft"], utm: ["copilot", "copilot.microsoft.com"] },
];
// Search engines, by referrer host. Sign-in and mail hosts on the same domains are not search.
const SEARCH = [
  { id: "google", label: "Google", re: /^(www\.|m\.)?google\.[a-z.]+$/ },
  { id: "bing", label: "Bing", re: /^(www\.|cn\.)?bing\.com$/ },
  { id: "yahoo", label: "Yahoo", re: /(^|\.)search\.yahoo\.com$/ },
  { id: "duckduckgo", label: "DuckDuckGo", re: /^(www\.)?duckduckgo\.com$/ },
  { id: "other", label: "Other search", re: /^(www\.)?(ecosia\.org|yandex\.[a-z.]+|baidu\.com|search\.brave\.com|startpage\.com|qwant\.com|naver\.com)$/ },
];
const INTERNAL_REF = /^(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|[a-z0-9-]+-brassmonkey381s-projects\.vercel\.app)$/;

const WINDOWS = [...STANDARD_WINDOWS, ALL_WINDOW];
const DEFAULT_WINDOW = 30;
const NOW = Date.now();
const inWin = (ts, w) => w === ALL_WINDOW || NOW - Date.parse(ts) <= w * 86400_000;

const hostOf = (ref) => {
  if (!ref) return null;
  const m = String(ref).match(/^[a-z]+:\/\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
};
const utmOf = (route) => {
  const m = String(route ?? "").match(/[?&]utm_source=([^&#]+)/i);
  if (!m) return null;
  try { return decodeURIComponent(m[1]).toLowerCase(); } catch { return m[1].toLowerCase(); }
};
const pathOf = (route) => String(route ?? "").split(/[?#]/)[0] || "/";

function classify(row) {
  const host = hostOf(row.ref);
  const utm = utmOf(row.landing_route);
  for (const a of ASSISTANTS) {
    if (host && a.hosts.includes(host)) return { cls: "ai", sub: a.id, via: "referrer" };
    if (utm && a.utm.includes(utm)) return { cls: "ai", sub: a.id, via: "utm" };
  }
  if (host) for (const s of SEARCH) if (s.re.test(host)) return { cls: "search", sub: s.id, via: "referrer" };
  return { cls: "other", sub: null, via: null };
}

function sessionsSql(site) {
  return `
with ${exclusionCte(site.id)},
st as (
  select distinct on (e.session_id) e.session_id, e.props
  from public.analytics_events e
  where e.app = '${site.key}' and e.name = 'session.start'
  order by e.session_id, e.ts
)
select s.id, s.started_at, s.user_id, s.landing_route,
       st.props->>'referrer' as ref,
       coalesce(st.props->>'dev', '') = 'true' as dev,
       (s.user_id in (select id from excluded_users)) as excluded,
       u.email, coalesce(u.is_anonymous, s.is_guest, false) as anon
from public.analytics_sessions s
left join st on st.session_id = s.id
left join auth.users u on u.id = s.user_id
where s.app = '${site.key}'`;
}

const t0 = Date.now();
const fetched = await Promise.all(SITES.map((s) => runSql(APPS[s.id].projectRef, sessionsSql(s))));

const out = {
  collectedAt: new Date(NOW).toISOString(),
  windows: WINDOWS.map(String),
  assistants: ASSISTANTS.map(({ id, label }) => ({ id, label })),
  searchEngines: SEARCH.map(({ id, label }) => ({ id, label })),
  sites: [],
};
const rosters = {};
const landings = {};

SITES.forEach((site, i) => {
  const rows = fetched[i];
  const s = { id: site.id, site: site.site, name: site.name, referrerSince: site.referrerSince, firstSession: null, byWindow: {} };
  for (const r of rows) if (!s.firstSession || r.started_at < s.firstSession) s.firstSession = r.started_at;
  for (const w of WINDOWS) {
    const inw = rows.filter((r) => inWin(r.started_at, w));
    const internal = inw.filter((r) => INTERNAL_REF.test(hostOf(r.ref) ?? ""));
    const dropped = new Set([...internal.map((r) => r.id)]);
    const kept = inw.filter((r) => !r.excluded && !r.dev && !dropped.has(r.id));
    const d = {
      visits: kept.length,
      excludedAccounts: inw.filter((r) => r.excluded).length,
      excludedDev: inw.filter((r) => !r.excluded && r.dev).length,
      excludedInternal: internal.filter((r) => !r.excluded && !r.dev).length,
      withReferrer: kept.filter((r) => r.ref).length,
      ai: 0, aiViaUtm: 0, aiViaReferrer: 0, aiBy: {},
      search: site.referrerSince ? 0 : null, searchBy: {},
      searchScope: null,
    };
    const ids = { ai: [], search: [] };
    for (const a of ASSISTANTS) d.aiBy[a.id] = 0;
    if (site.referrerSince) for (const e of SEARCH) d.searchBy[e.id] = 0;
    const land = {};
    for (const r of kept) {
      const c = classify(r);
      const who = userLabel({ id: r.user_id, email: r.email, anon: r.anon });
      if (c.cls === "ai") {
        d.ai++; d.aiBy[c.sub]++;
        if (c.via === "utm") d.aiViaUtm++; else d.aiViaReferrer++;
        ids.ai.push(who); (rosters[`${site.id}|${w}|ai|${c.sub}`] ??= []).push(who);
        const p = pathOf(r.landing_route); land[p] = (land[p] ?? 0) + 1;
      } else if (c.cls === "search" && site.referrerSince) {
        d.search++; d.searchBy[c.sub]++;
        ids.search.push(who); (rosters[`${site.id}|${w}|search|${c.sub}`] ??= []).push(who);
      }
    }
    if (site.referrerSince) {
      // A window reaching back past the day referrers started cannot see search before it.
      const since = Date.parse(site.referrerSince + "T00:00:00Z");
      d.searchScope = w === ALL_WINDOW || NOW - w * 86400_000 < since ? `since ${site.referrerSince}` : null;
    }
    rosters[`${site.id}|${w}|ai`] = ids.ai;
    rosters[`${site.id}|${w}|search`] = ids.search;
    landings[`${site.id}|${w}`] = Object.entries(land).sort((a, b) => b[1] - a[1]).slice(0, 8);
    s.byWindow[w] = d;
  }
  out.sites.push(s);
});

// Rosters: one entry per hover key, names deduped by the shared helper.
const rosterOut = {};
for (const [k, names] of Object.entries(rosters)) rosterOut[k] = roster(names, (x) => x);

mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
writeFileSync(ROSTER_FILE, JSON.stringify({ collectedAt: out.collectedAt, rosters: rosterOut, aiLandings: landings }, null, 2) + "\n");

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (n, unseen = "not recorded") => (n == null ? `<span class="unseen">${unseen}</span>` : n === 0 ? `<span class="zero">0</span>` : String(n));
const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(a / b < 0.01 ? 2 : 1)}%` : "");

const blocks = WINDOWS.map((w) => {
  const rows = out.sites
    .map((s) => {
      const d = s.byWindow[w];
      return `<tr data-app-scope="${s.id}">
  <td><strong>${esc(s.name)}</strong><br><code>${esc(s.site)}</code></td>
  <td class="num">${d.visits}</td>
  <td class="num" ${hoverAttr(s.id, w, "ai")} tabindex="0">${num(d.ai)}<div class="sub">${pct(d.ai, d.visits)}</div></td>
  <td class="num" ${hoverAttr(s.id, w, "search")} tabindex="0">${num(d.search)}<div class="sub">${d.search == null ? "no referrer captured" : d.searchScope ? esc(d.searchScope) : pct(d.search, d.visits)}</div></td>
</tr>`;
    })
    .join("\n");

  const aiRows = out.sites
    .map((s) => {
      const d = s.byWindow[w];
      const cells = ASSISTANTS.map((a) => `<td class="num" ${hoverAttr(s.id, w, "ai", a.id)}>${num(d.aiBy[a.id])}</td>`).join("");
      return `<tr data-app-scope="${s.id}"><td>${esc(s.name)}</td>${cells}<td class="num sub">${d.aiViaUtm} / ${d.aiViaReferrer}</td></tr>`;
    })
    .join("\n");

  const searchSites = out.sites.filter((s) => s.referrerSince);
  const searchRows = searchSites
    .map((s) => {
      const d = s.byWindow[w];
      const cells = SEARCH.map((e) => `<td class="num" ${hoverAttr(s.id, w, "search", e.id)}>${num(d.searchBy[e.id])}</td>`).join("");
      return `<tr data-app-scope="${s.id}"><td>${esc(s.name)}</td>${cells}</tr>`;
    })
    .join("\n");

  const landRows = out.sites
    .filter((s) => (landings[`${s.id}|${w}`] ?? []).length)
    .map((s) => `<tr data-app-scope="${s.id}"><td>${esc(s.name)}</td><td>${landings[`${s.id}|${w}`].map(([p, n]) => `<code>${esc(p)}</code> ${n}`).join(", ")}</td></tr>`)
    .join("\n");

  const excl = out.sites
    .map((s) => {
      const d = s.byWindow[w];
      return `${esc(s.name)} ${d.excludedAccounts} ours/QA${d.excludedDev ? `, ${d.excludedDev} dev-mode` : ""}${d.excludedInternal ? `, ${d.excludedInternal} from localhost or our previews` : ""}`;
    })
    .join(" · ");

  return `<div data-w="${w}"${w === DEFAULT_WINDOW ? "" : " hidden"}>
<table class="tbl"><thead><tr><th>Site</th><th class="num">Visits</th><th class="num">From AI assistants</th><th class="num">From search engines</th></tr></thead>
<tbody>${rows}</tbody></table>
<p class="note">Excluded and not counted above: ${excl}.</p>
${out.sites.flatMap((s) => dataEvents(s.id).map((e) => `<p class="note" data-app-scope="${s.id}"><strong>${esc(s.name)}, ${esc(e.date)}: ${esc(e.label)}.</strong> ${esc(e.note)}</p>`)).join("")}

<h2>Which assistant</h2>
<table class="tbl"><thead><tr><th>Site</th>${ASSISTANTS.map((a) => `<th class="num">${esc(a.label)}</th>`).join("")}<th class="num">via utm / referrer</th></tr></thead>
<tbody>${aiRows}</tbody></table>

<h2>Which search engine</h2>
<table class="tbl"><thead><tr><th>Site</th>${SEARCH.map((e) => `<th class="num">${esc(e.label)}</th>`).join("")}</tr></thead>
<tbody>${searchRows}</tbody></table>
<p class="note">Only Michi Maker records the referring site (since ${esc(SITES[0].referrerSince)}). BiBo, Doggle and PickLeague
are left out of this table because a search visit there cannot be seen, not because there were none.</p>

<h2>Where AI-referred visitors land</h2>
${landRows ? `<table class="tbl"><thead><tr><th>Site</th><th>Landing page and visits</th></tr></thead><tbody>${landRows}</tbody></table>` : `<p class="empty">No AI-referred visits in this window.</p>`}
</div>`;
}).join("\n");

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI and search traffic</title>
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
main{max-width:900px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:28px 0 6px}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.wrap{overflow-x:auto}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.sub{color:var(--muted);font-size:11.5px;font-weight:400}
.zero{color:var(--muted)}
.unseen{color:var(--warn);font-size:12px;font-style:italic}
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--muted)}
@media (max-width:600px){ .tbl{font-size:12px} .tbl th,.tbl td{padding:6px 6px} }
</style>
<main>
<h1>AI and search traffic</h1>
<p class="meta">Visits to the four sites that an AI assistant or a search engine sent, from data the apps already
record. Hover a number for the visitors behind it. Collected ${esc(out.collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes visits by session start time")}

<div class="wrap">${blocks}</div>

<p class="note"><strong>What this can and cannot say.</strong> A visit is an app session. An AI visit is counted when the
landing URL carries <code>utm_source</code> from an assistant (ChatGPT adds <code>utm_source=chatgpt.com</code> to its links;
most other assistants add nothing) or, on Michi Maker only, when the browser reported an assistant as the referring site.
So every AI number is a floor. Search engines are visible on Michi Maker only, from ${esc(SITES[0].referrerSince)}; on the
other three sites the search column says <em>not recorded</em> because those apps do not capture the referrer.
Crawler visits (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot) never run the app, so they are not here at all.</p>
</main>
${hoverLayer(rosterOut, { unit: "visitor/visitors" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

mkdirSync(join(ROOT, "reports"), { recursive: true });
writeFileSync(HTML_FILE, html);

console.log(`sources: fetched ${fetched.reduce((n, r) => n + r.length, 0)} sessions in ${Date.now() - t0} ms`);
for (const s of out.sites) {
  const d = s.byWindow[DEFAULT_WINDOW];
  const a = s.byWindow[ALL_WINDOW];
  console.log(`  ${s.name.padEnd(11)} 30d: ${d.visits} visits, AI ${d.ai}, search ${d.search ?? "not recorded"}  |  all: ${a.visits} visits, AI ${a.ai}, search ${a.search ?? "not recorded"}`);
}
console.log(`Wrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - names visitors and landing pages)`);
console.log(`Wrote ${HTML_FILE} (gitignored)`);
