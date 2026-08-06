// Plans lane: how many distinct accounts sit at each plan tier, per app family.
//
// Reads the shared `entitlements` ledger rather than any event — an entitlement
// is the thing that is actually true about an account, and it predates the event
// stream by weeks. Tier resolution mirrors michi's data/tiers.ts exactly:
//
//   vip > pro > free (signed-in, no active grant) > guest (anonymous)
//
// "Active" is `expires_at is null or expires_at > now()`. A lapsed grant leaves
// the account at free, which is what the app itself does.
//
// The two app families share one ledger and are told apart by the product key:
// tier_pro/tier_vip are michi's, tcgscan_pro/tcgscan_vip are the sibling's. An
// account can hold both, so the two panels are not a partition of one population.
//
// Writes data/plans.json (counts only, committed) and, when identity is
// available, the roster sidecar inside it is split out to data/plans-roster.json
// (gitignored) exactly like the events lane.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, exclusionCte } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, ROSTER_STORE_CAP } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const CFG = readConfig("events.json");
const PROJECT = CFG.projectRef;
const DATA_FILE = join(ROOT, "data", "plans.json");
const ROSTER_FILE = join(ROOT, "data", "plans-roster.json");
const HTML_FILE = join(ROOT, "reports", "plans.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the plans lane needs Management API access.");
  process.exit(1);
}

const FAMILIES = [
  { id: "michi-maker", name: "Michi-Maker", pro: "tier_pro", vip: "tier_vip" },
  { id: "tcgscan", name: "TCGScan", pro: "tcgscan_pro", vip: "tcgscan_vip" },
];
const TIERS = ["free", "pro", "vip"];
const ROSTER_CAP = 60;

// One row per account per family, carrying the resolved tier, how the grant was
// obtained, and whether the account is one of ours. Nothing is filtered in SQL:
// the excluded are counted separately and shown, never silently dropped.
function sql() {
  const fam = FAMILIES.map(
    (f) => `select
  '${f.id}'::text as family,
  u.id,
  u.anon,
  u.ex,
  case when u.anon then 'guest'
       when e.vip_src is not null then 'vip'
       when e.pro_src is not null then 'pro'
       else 'free' end as tier,
  coalesce(e.vip_src, e.pro_src) as source
from acct u
left join lateral (
  select
    max(case when x.product = '${f.vip}' then x.source end) as vip_src,
    max(case when x.product = '${f.pro}' then x.source end) as pro_src
  from active x where x.user_id = u.id
) e on true`,
  ).join("\nunion all\n");

  return `with ${exclusionCte("michi-maker")},
active as (
  select user_id, product, source
  from public.entitlements
  where expires_at is null or expires_at > now()
),
acct as (
  select au.id,
         coalesce(au.is_anonymous, false) as anon,
         (au.id in (select id from excluded_users)) as ex,
         pr.username, au.email, au.created_at
  from auth.users au
  left join public.profiles pr on pr.id = au.id
),
rows as (
${fam}
)
-- One row per account per family, ungrouped: the windowing below is a signup
-- cohort filter and needs each account's own created_at, which a GROUP BY here
-- would throw away.
select r.family, r.tier, r.source, r.ex as excluded, r.anon,
  a.created_at,
  coalesce('@' || a.username, a.email, left(r.id::text, 8)) as who
from rows r join acct a on a.id = r.id
order by 1,2,3`;
}

const rows = await runSql(PROJECT, sql());

const collectedAt = new Date().toISOString();
const NOW = Date.now();
// Every slot is cut from the same fetch, per the rule in lib/windows.mjs.
// `all` leads here: a tier snapshot whose widest view was 30 days would hide
// every account older than a month, which is nearly all of them.
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WINDOW = ALL_WINDOW;
// The window is a SIGNUP COHORT. The tier itself is always resolved as of now —
// "of the accounts that signed up in this period, where are they today".
const inWindow = (row, w) => w === ALL_WINDOW || Date.parse(row.created_at) >= NOW - Number(w) * 86400_000;

const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WINDOW, families: {} };
const rosters = {};

for (const f of FAMILIES) {
  const all = rows.filter((r) => r.family === f.id);
  const perWindow = {};
  for (const w of WINDOWS) {
    const mine = all.filter((r) => inWindow(r, w));
    const tiers = {};
    for (const t of TIERS) {
      const at = mine.filter((r) => r.tier === t);
      const real = at.filter((r) => !r.excluded);
      const excl = at.filter((r) => r.excluded);
      const bySource = {};
      for (const r of at.filter((r) => r.source)) {
        const b = (bySource[r.source] ??= { real: 0, excluded: 0 });
        b[r.excluded ? "excluded" : "real"] += 1;
      }
      tiers[t] = { real: real.length, excluded: excl.length, bySource };
      // Flat key space, exactly as lib/hover.mjs expects. `{scope}` in the
      // markup is replaced with the active window at hover time.
      const names = (list) => [...new Set(list.map((r) => r.who))].sort((a, b) => a.localeCompare(b));
      rosters[`${f.id}|${w}|${t}`] = { total: real.length, names: names(real).slice(0, ROSTER_STORE_CAP) };
      rosters[`${f.id}|${w}|${t}|ours`] = { total: excl.length, names: names(excl).slice(0, ROSTER_STORE_CAP) };
    }
    const guests = mine.filter((r) => r.tier === "guest");
    perWindow[w] = {
      tiers,
      guests: {
        real: guests.filter((r) => !r.excluded).length,
        excluded: guests.filter((r) => r.excluded).length,
      },
      paying: TIERS.reduce((a, t) => a + (t === "free" ? 0 : (tiers[t].bySource.stripe?.real ?? 0)), 0),
    };
  }
  out.families[f.id] = { name: f.name, windows: perWindow };
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- chart ----------
//
// Form: the question is "how many accounts at each tier", i.e. magnitude across a
// small ordered set — a bar chart. Tier is ORDINAL (free < pro < vip), so colour
// is one hue stepped light→dark rather than a categorical set; steps validated
// with scripts/validate_palette.js --ordinal in both modes (light #2a78d6/#86b6ef,
// dark #3987e5/#184f95, light end clears 2:1 against each surface).
//
// Guests are NOT a bar. There are two orders of magnitude more of them than
// signed-in accounts, so a shared linear scale would flatten every real tier to
// nothing — and an anonymous session is not an account at a plan tier anyway.
// They are stated as context above the chart instead.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const TIER_LABEL = { free: "Free", pro: "PRO", vip: "VIP" };
const SOURCE_LABEL = { stripe: "paid", trial: "trial", manual: "comp" };

// One scale for every panel AND every window, taken from the widest slot. A
// per-window scale would make a bar grow when you narrowed the window, which is
// the opposite of what happened.
const maxCount = Math.max(
  1,
  ...FAMILIES.flatMap((f) =>
    TIERS.map((t) => {
      const v = out.families[f.id].windows[ALL_WINDOW].tiers[t];
      return v.real + v.excluded;
    }),
  ),
);

// Shared scale across both panels: the two families are directly comparable and
// per-panel scaling would make "4 free" and "1 pro" look the same size.
function panel(f, w) {
  const d = out.families[f.id].windows[w];
  const W = 420, ROW = 46, PAD_L = 56, PAD_R = 56, top = 8;
  const H = top + TIERS.length * ROW + 8;
  const plotW = W - PAD_L - PAD_R;
  const bars = TIERS.map((t, i) => {
    const v = d.tiers[t];
    const y = top + i * ROW + 10;
    const total = v.real + v.excluded;
    const wReal = (v.real / maxCount) * plotW;
    const wExcl = (v.excluded / maxCount) * plotW;
    // 2px surface gap between the two fills, per the mark spec — never a hairline
    // border, which would read as a third value.
    const gap = v.real > 0 && v.excluded > 0 ? 2 : 0;
    const srcs = Object.entries(v.bySource)
      .map(([s, b]) => `${b.real + b.excluded} ${SOURCE_LABEL[s] ?? s}`)
      .join(", ");
    const title = `${TIER_LABEL[t]} — ${v.real} account${v.real === 1 ? "" : "s"}` +
      (v.excluded ? `, plus ${v.excluded} of ours` : "") + (srcs ? ` (${srcs})` : "");
    // {scope} resolves to the active window, so one set of hover keys serves
    // every slot. The two fills get their own handles: hovering "ours" must
    // name our accounts, not the real ones.
    return `<g class="barrow">
  <title>${esc(title)}</title>
  <text class="tlabel" x="${PAD_L - 10}" y="${y + 15}" text-anchor="end">${esc(TIER_LABEL[t])}</text>
  <rect class="track" x="${PAD_L}" y="${y}" width="${plotW}" height="20" rx="4" ${hoverAttr(f.id, "{scope}", t)}></rect>
  ${v.real > 0 ? `<rect class="bar-real" x="${PAD_L}" y="${y}" width="${Math.max(3, wReal)}" height="20" rx="4" ${hoverAttr(f.id, "{scope}", t)}></rect>` : ""}
  ${v.excluded > 0 ? `<rect class="bar-excl" x="${PAD_L + wReal + gap}" y="${y}" width="${Math.max(3, wExcl - gap)}" height="20" rx="4" ${hoverAttr(f.id, "{scope}", t, "ours")}></rect>` : ""}
  <text class="bval${total === 0 ? " zero" : ""}" x="${PAD_L + Math.max(wReal + wExcl, 3) + 8}" y="${y + 15}" ${hoverAttr(f.id, "{scope}", t)}>${v.real}${v.excluded ? ` <tspan class="ours">+${v.excluded}</tspan>` : ""}</text>
</g>`;
  }).join("\n");

  return `<figure class="panel">
  <figcaption>${esc(f.name)}</figcaption>
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(f.name)} accounts by plan tier">
    ${bars}
  </svg>
  <p class="ctx">${d.guests.real.toLocaleString()} anonymous guest${d.guests.real === 1 ? "" : "s"} not counted above — a guest has no account and no tier.${d.guests.excluded ? ` A further ${d.guests.excluded.toLocaleString()} are ours.` : ""}</p>
</figure>`;
}

// One block per window; the toggle flips which is shown. Same rule as the
// events report: precomputed beats recomputed, so the two cannot disagree.
const blocks = WINDOWS.map((w) => {
  const paying = FAMILIES.reduce((a, f) => a + out.families[f.id].windows[w].paying, 0);
  const cohort =
    w === ALL_WINDOW
      ? "every account on the project"
      : `accounts that signed up in the last ${windowLabel(w)}`;
  const tableRows = FAMILIES.flatMap((f) =>
    TIERS.map((t) => {
      const v = out.families[f.id].windows[w].tiers[t];
      const srcs =
        Object.entries(v.bySource).map(([s, b]) => `${SOURCE_LABEL[s] ?? s} ${b.real + b.excluded}`).join(", ") || "—";
      return `<tr ${hoverAttr(f.id, "{scope}", t)}><td>${esc(f.name)}</td><td>${TIER_LABEL[t]}</td><td class="num">${v.real}</td><td class="num muted">${v.excluded}</td><td class="muted">${esc(srcs)}</td></tr>`;
    }),
  ).join("");

  return `<div data-w="${w}"${w === DEFAULT_WINDOW ? "" : " hidden"}>
<p class="hero">${paying}</p>
<p class="hero-sub">paying accounts across both apps among ${esc(cohort)}, excluding our own.${paying === 0 ? " Every PRO and VIP grant on this project belongs to an account the exclusion policy filters out." : ""}</p>

<div class="legend">
  <span><i class="sw real"></i> Real accounts</span>
  <span><i class="sw excl"></i> Ours / QA (excluded from every other report)</span>
</div>
<div class="panels">
${FAMILIES.map((f) => panel(f, w)).join("\n")}
</div>

<h2>Table view</h2>
<table class="tbl">
  <thead><tr><th>App</th><th>Tier</th><th class="num">Real</th><th class="num">Ours</th><th>Grant source</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</div>`;
}).join("\n");

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Plan tiers — accounts by tier</title>
<style>
:root {
  color-scheme: light;
  --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e; --muted:#898781;
  --grid:#e1e0d9; --border:rgba(11,11,11,0.10);
  --t-real:#2a78d6; --t-excl:#86b6ef; --track:#eeece6;
}
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark;
  --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --border:rgba(255,255,255,0.10);
  --t-real:#3987e5; --t-excl:#184f95; --track:#242422;
} }
:root[data-theme="dark"] {
  color-scheme: dark;
  --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --border:rgba(255,255,255,0.10);
  --t-real:#3987e5; --t-excl:#184f95; --track:#242422;
}
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:960px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px}
h2{font-size:16px;margin:32px 0 6px}
.meta{color:var(--muted);font-size:13px;margin-bottom:18px}
.hero{font-size:48px;font-weight:650;line-height:1.05;margin:14px 0 0}
.hero-sub{color:var(--ink-2);font-size:13px;margin:2px 0 0}
.legend{display:flex;gap:14px;align-items:center;margin:18px 0 4px;font-size:12.5px;color:var(--ink-2)}
.legend span{display:flex;gap:6px;align-items:center}
.sw{width:11px;height:11px;border-radius:3px;display:inline-block}
.sw.real{background:var(--t-real)} .sw.excl{background:var(--t-excl)}
.panels{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:14px;margin-top:6px}
.panel{margin:0;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.panel figcaption{font-size:13px;font-weight:600;margin-bottom:2px}
.panel svg{width:100%;height:auto;display:block;overflow:visible}
.track{fill:var(--track)}
.bar-real{fill:var(--t-real)} .bar-excl{fill:var(--t-excl)}
.tlabel{fill:var(--ink-2);font-size:12px}
.bval{fill:var(--ink);font-size:12.5px;font-weight:600}
.bval.zero{fill:var(--muted);font-weight:400}
.bval .ours{fill:var(--muted);font-weight:400}
.barrow:hover .track{fill:color-mix(in srgb,var(--t-real) 12%,var(--track))}
.ctx{color:var(--muted);font-size:12px;margin:8px 0 0}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.muted{color:var(--muted)}
</style>
<main>
<h1>Plan tiers</h1>
<p class="meta">Distinct accounts by effective tier, from the shared <code>entitlements</code> ledger — not from the event stream, so this covers all history. Resolution mirrors the apps: <code>vip &gt; pro &gt; free</code>, active meaning no expiry or an expiry in the future. Hover any bar or row for the accounts behind it. Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes the SIGNUP COHORT; tier is always as of now")}

${blocks}

<p class="note">The two panels are not a partition of one population: both apps read the same ledger and one account can hold a tier in each. An account with a lapsed grant resolves to Free, exactly as the app resolves it. Bar widths share one scale across every panel and every window — a narrower window must never make a bar look bigger.</p>
</main>
${hoverLayer(rosters, { unit: "account/accounts" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

for (const f of FAMILIES) {
  const d = out.families[f.id].windows[ALL_WINDOW];
  console.log(
    `${f.name.padEnd(12)} ` +
      TIERS.map((t) => `${TIER_LABEL[t]} ${d.tiers[t].real}${d.tiers[t].excluded ? `(+${d.tiers[t].excluded})` : ""}`).join("  ") +
      `  · ${d.guests.real} guests`,
  );
}
console.log(`\nWrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/plans.html`);
