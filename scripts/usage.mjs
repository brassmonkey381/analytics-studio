// Product-usage lane: what people are actually MAKING, daily, from ground-truth
// tables — not the event stream.
//
//   Michi-Maker  binders created, cards/images placed into binder pages, prints
//   TCGScan      cards scanned, cards added to a collection
//   Credits      scan credits used this calendar month vs each user's tier cap,
//                and print allocation usage
//
// Every number here reads a product table (binders, binder_slots, scan_events,
// portfolio_entries, print_events), so a zero means "it did not happen" — these
// tables predate instrumentation and see everything. That is the opposite
// caveat from the events report, and the page says so.
//
// The credit section is deliberately calendar-month scoped, because that is how
// the caps in tier_caps work — it states inline that it does not move with the
// window toggle.
//
// Writes data/usage.json (counts only, committed) + data/usage-roster.json
// (identity, gitignored) + reports/usage.html (gitignored).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, exclusionCte } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, roster, userLabel } from "./lib/hover.mjs";
import { STANDARD_WINDOWS, windowBar, windowScript } from "./lib/windows.mjs";

const CFG = readConfig("events.json");
const PROJECT = CFG.projectRef;
const DATA_FILE = join(ROOT, "data", "usage.json");
const ROSTER_FILE = join(ROOT, "data", "usage-roster.json");
const HTML_FILE = join(ROOT, "reports", "usage.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the usage lane needs Management API access.");
  process.exit(1);
}

// One fetch per table; every window is computed here from that single fetch.
// Identity rides along on each row so the rosters need no second query.
const ident = (col) => `
       (${col} in (select id from excluded_users)) as excluded,
       coalesce(pr.username,'') as username, coalesce(pr.display_name,'') as display_name,
       u.email, coalesce(u.is_anonymous,false) as anon`;
const identJoin = (col) => `
left join auth.users u on u.id = ${col}
left join public.profiles pr on pr.id = ${col}`;

const bindersSql = `
with ${exclusionCte("michi-maker")}
select b.owner_id as uid, b.created_at as ts, b.is_demo,${ident("b.owner_id")}
from public.binders b${identJoin("b.owner_id")}`;

// A slot is one card or image placed into a binder page. The owner comes via
// the page's binder; demo binders' slots are staging content, not usage.
const slotsSql = `
with ${exclusionCte("michi-maker")}
select b.owner_id as uid, s.created_at as ts, s.slot_type, b.is_demo,${ident("b.owner_id")}
from public.binder_slots s
join public.binder_pages p on p.id = s.page_id
join public.binders b on b.id = p.binder_id${identJoin("b.owner_id")}`;

const scansSql = `
with ${exclusionCte("tcgscan")}
select e.user_id as uid, e.created_at as ts,${ident("e.user_id")}
from public.scan_events e${identJoin("e.user_id")}`;

// portfolio_entries is the per-add record (user_cards is a flat rollup of the
// same collection — their quantity totals agree). One row = one add action;
// quantity is how many copies that action recorded.
const cardsSql = `
with ${exclusionCte("tcgscan")}
select pe.user_id as uid, pe.added_at as ts, pe.quantity,${ident("pe.user_id")}
from public.portfolio_entries pe${identJoin("pe.user_id")}`;

const printsSql = `
with ${exclusionCte("michi-maker")}
select p.user_id as uid, p.created_at as ts, p.sheets,${ident("p.user_id")}
from public.print_events p${identJoin("p.user_id")}`;

// Scan credits: everyone who scanned this calendar month, their tier as the
// entitlements ledger sees it RIGHT NOW, and therefore their monthly cap.
const creditsSql = `
with ${exclusionCte("tcgscan")},
m as (
  select user_id, count(*) as used
  from public.scan_events
  where created_at >= date_trunc('month', now())
  group by 1
)
select m.user_id as uid, m.used,
  case
    when exists (select 1 from public.entitlements e where e.user_id = m.user_id
                 and e.product = 'tcgscan_vip' and (e.expires_at is null or e.expires_at > now())) then 'vip'
    when exists (select 1 from public.entitlements e where e.user_id = m.user_id
                 and e.product = 'tcgscan_pro' and (e.expires_at is null or e.expires_at > now())) then 'pro'
    when coalesce(u.is_anonymous, false) then 'guest'
    else 'free'
  end as tier,${ident("m.user_id")}
from m${identJoin("m.user_id")}
order by m.used desc`;

const capsSql = `select app, limit_key, tier, value from public.tier_caps
where (app = 'tcgscan' and limit_key = 'cardScansPerMonth')
   or (app = 'michi' and limit_key = 'includedPrintsPerMonth')`;

const [bindersAll, slotsAll, scans, cards, prints, credits, caps] = await Promise.all(
  [bindersSql, slotsSql, scansSql, cardsSql, printsSql, creditsSql, capsSql].map((q) => runSql(PROJECT, q)),
);

const collectedAt = new Date().toISOString();
const WINDOWS = STANDARD_WINDOWS; // [1, 7, 14, 30]
const DEFAULT_WIN = 14;
const MAX_W = WINDOWS.at(-1);
const NOW = Date.now();
const inWin = (ts, w) => Date.parse(ts) >= NOW - w * 86400_000;
const dayOf = (ts) => String(ts).slice(0, 10);

// Demo binders are staging content, not usage — dropped from every count and
// stated once in the prose so the drop is never silent.
const binders = bindersAll.filter((r) => !r.is_demo);
const slots = slotsAll.filter((r) => !r.is_demo);
const demoBinders = bindersAll.length - binders.length;

const label = (r) => userLabel({ id: r.uid, username: r.username || null, display_name: r.display_name || null, email: r.email, anon: r.anon });
const labelById = new Map();
for (const rows of [binders, slots, scans, cards, prints, credits]) {
  for (const r of rows) if (r.uid && !labelById.has(r.uid)) labelById.set(r.uid, label(r));
}
const rosterOf = (ids) => roster(ids, (id) => labelById.get(id) ?? String(id).slice(0, 8));

// The four daily series. `qty` marks the one whose rows carry a copy count.
const SERIES = [
  { id: "binders", app: "Michi-Maker", title: "New binders", sub: "binders created", rows: binders },
  { id: "slots", app: "Michi-Maker", title: "Cards placed", sub: "cards & images placed into binder pages", rows: slots },
  { id: "scans", app: "TCGScan", title: "Cards scanned", sub: "each scan consumes a monthly credit", rows: scans },
  { id: "cards", app: "TCGScan", title: "Cards added", sub: "adds to a collection", rows: cards, qty: true },
];

// Last N UTC dates, oldest first, ending today.
const lastDays = (n) => {
  const t = new Date();
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - i)).toISOString().slice(0, 10));
  }
  return out;
};
const DAYS = lastDays(MAX_W);

const rosters = {};
const daily = {}; // seriesId -> { real: Map(day->n), exc: Map(day->n), max }
for (const s of SERIES) {
  const real = new Map(), exc = new Map(), whoReal = new Map(), whoExc = new Map();
  for (const r of s.rows) {
    const d = dayOf(r.ts);
    if (!DAYS.includes(d)) continue;
    const [m, w] = r.excluded ? [exc, whoExc] : [real, whoReal];
    m.set(d, (m.get(d) ?? 0) + 1);
    if (!w.has(d)) w.set(d, []);
    w.get(d).push(r.uid);
  }
  // ONE scale per series across every window: the max stacked day of the
  // widest window. Narrowing the toggle must never make a bar grow.
  const max = Math.max(1, ...DAYS.map((d) => (real.get(d) ?? 0) + (exc.get(d) ?? 0)));
  daily[s.id] = { real, exc, max };
  for (const [d, ids] of whoReal) rosters[`d|${s.id}|${d}`] = rosterOf(ids);
  for (const [d, ids] of whoExc) rosters[`dx|${s.id}|${d}`] = rosterOf(ids);
}

const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WIN, byWindow: {}, daily: {}, allTime: {}, credits: {} };
for (const s of SERIES) {
  out.allTime[s.id] = { n: s.rows.filter((r) => !r.excluded).length, excluded: s.rows.filter((r) => r.excluded).length };
  out.daily[s.id] = {
    days: DAYS,
    real: DAYS.map((d) => daily[s.id].real.get(d) ?? 0),
    excluded: DAYS.map((d) => daily[s.id].exc.get(d) ?? 0),
  };
}
out.allTime.demoBinders = demoBinders;
out.allTime.prints = {
  jobs: prints.filter((r) => !r.excluded).length,
  sheets: prints.filter((r) => !r.excluded).reduce((a, r) => a + r.sheets, 0),
  excludedJobs: prints.filter((r) => r.excluded).length,
};

for (const w of WINDOWS) {
  const block = {};
  for (const s of SERIES) {
    const rs = s.rows.filter((r) => inWin(r.ts, w));
    const real = rs.filter((r) => !r.excluded);
    block[s.id] = {
      n: real.length,
      users: new Set(real.map((r) => r.uid)).size,
      excluded: rs.length - real.length,
    };
    if (s.qty) block[s.id].qty = real.reduce((a, r) => a + (r.quantity ?? 1), 0);
    rosters[`t|${w}|${s.id}`] = rosterOf(real.map((r) => r.uid));
    rosters[`tx|${w}|${s.id}`] = rosterOf(rs.filter((r) => r.excluded).map((r) => r.uid));
  }
  out.byWindow[w] = block;
}

// ---------- credits (calendar month, NOT windowed) ----------

const capOf = (app, key, tier) => caps.find((c) => c.app === app && c.limit_key === key && c.tier === tier)?.value ?? null;
const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const creditRows = credits.map((r) => {
  const cap = capOf("tcgscan", "cardScansPerMonth", r.tier);
  return { uid: r.uid, who: label(r), tier: r.tier, used: r.used, cap, pct: cap ? Math.min(100, (r.used / cap) * 100) : null, ours: r.excluded };
});
const realScanners = creditRows.filter((r) => !r.ours);
const nearCap = realScanners.filter((r) => r.cap && r.used / r.cap >= 0.8);
const printsMonth = prints.filter((r) => !r.excluded && dayOf(r.ts) >= collectedAt.slice(0, 8) + "01");
out.credits = {
  month: monthName,
  scan: {
    scanners: realScanners.length,
    ours: creditRows.length - realScanners.length,
    nearCap: nearCap.length,
    caps: { guest: capOf("tcgscan", "cardScansPerMonth", "guest"), free: capOf("tcgscan", "cardScansPerMonth", "free"), pro: capOf("tcgscan", "cardScansPerMonth", "pro") },
  },
  print: {
    jobs: printsMonth.length,
    sheets: printsMonth.reduce((a, r) => a + r.sheets, 0),
    includedPro: capOf("michi", "includedPrintsPerMonth", "pro"),
    includedVip: capOf("michi", "includedPrintsPerMonth", "vip"),
  },
};

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BAR_H = 120;

function chart(s, w) {
  const d = daily[s.id];
  const days = DAYS.slice(-w);
  const max = d.max;
  // Selective direct label: the window's biggest day only; everything else is
  // on hover, and the full table is under <details>.
  const winMax = Math.max(...days.map((dd) => (d.real.get(dd) ?? 0) + (d.exc.get(dd) ?? 0)));
  let labeled = false;
  const cols = days
    .map((dd, i) => {
      const r = d.real.get(dd) ?? 0;
      const x = d.exc.get(dd) ?? 0;
      const tot = r + x;
      const hr = r ? Math.max(2, Math.round((r / max) * BAR_H)) : 0;
      const hx = x ? Math.max(2, Math.round((x / max) * BAR_H)) : 0;
      const lbl = tot > 0 && tot === winMax && !labeled ? `<span class="dlab">${tot}</span>` : "";
      if (lbl) labeled = true;
      const tick = i === 0 || i === days.length - 1 || (days.length - 1 - i) % 7 === 0 ? dd.slice(5) : "";
      return `<div class="day">
  ${lbl}${x ? `<span class="seg exc" style="height:${hx}px" ${hoverAttr("dx", s.id, dd)} tabindex="0"></span>` : ""}${r ? `<span class="seg real" style="height:${hr}px" ${hoverAttr("d", s.id, dd)} tabindex="0"></span>` : ""}
  <span class="tick">${tick}</span>
</div>`;
    })
    .join("");
  const tableRows = days
    .filter((dd) => (d.real.get(dd) ?? 0) + (d.exc.get(dd) ?? 0) > 0)
    .map((dd) => `<tr><td>${dd}</td><td class="num">${d.real.get(dd) ?? 0}</td><td class="num">${d.exc.get(dd) ?? 0}</td></tr>`)
    .join("");
  return `<div class="panel">
<div class="phead"><h3>${esc(s.title)}</h3><span class="scale">y-max ${max}/day, fixed across windows</span></div>
<div class="chart" role="img" aria-label="${esc(s.title)} per day">${cols}</div>
<details><summary>Data table</summary>
<table class="tbl"><thead><tr><th>Day</th><th class="num">Counted</th><th class="num">Ours (excluded)</th></tr></thead>
<tbody>${tableRows || `<tr><td colspan="3" class="empty">Nothing in this window.</td></tr>`}</tbody></table>
</details>
</div>`;
}

const blocks = WINDOWS.map((w) => {
  const b = out.byWindow[w];
  const tiles = SERIES.map((s) => {
    const v = b[s.id];
    const sub = s.qty && v.qty !== v.n ? `${v.qty} copies incl. quantities · ${v.users} ${v.users === 1 ? "person" : "people"}` : `${v.users} ${v.users === 1 ? "person" : "people"} · ${esc(s.sub)}`;
    return `<div class="tile" ${hoverAttr("t", "{scope}", s.id)} tabindex="0"><div class="k">${esc(s.app)} · ${esc(s.title)}</div><div class="value${v.n === 0 ? " zero" : ""}">${v.n}</div><div class="sub">${sub}</div></div>`;
  }).join("");
  const excTotal = SERIES.reduce((a, s) => a + b[s.id].excluded, 0);
  const excBits = SERIES.filter((s) => b[s.id].excluded).map((s) => `${b[s.id].excluded} ${s.id}`).join(", ");
  const charts =
    w === 1
      ? `<p class="note">One day of a daily series is a point, not a trend — the tiles above carry this window. Widen it for the charts.</p>`
      : `<div class="legend"><span class="chip"><span class="sw real"></span>counted</span><span class="chip"><span class="sw exc"></span>ours / QA (excluded, shown so the drop is never silent)</span></div>
<h2>Michi-Maker</h2>
${chart(SERIES[0], w)}
${chart(SERIES[1], w)}
<h2>TCGScan</h2>
${chart(SERIES[2], w)}
${chart(SERIES[3], w)}`;
  return `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>
<div class="tiles">${tiles}</div>
<p class="note">Excluded in this window: <strong>${excTotal}</strong> row${excTotal === 1 ? "" : "s"} from our own, seeded or QA accounts${excBits ? ` (${excBits})` : ""} — drawn lighter in the bars, never dropped silently.</p>
${charts}
</div>`;
}).join("\n");

const creditRowsHtml = creditRows
  .map((r) => {
    const capTxt = r.cap === null ? "&infin;" : r.cap;
    const meter = r.cap === null ? "" : `<span class="meter"><span class="fill${r.used >= r.cap ? " full" : ""}" style="width:${r.pct.toFixed(0)}%"></span></span>`;
    return `<tr${r.ours ? ' class="ours"' : ""}><td>${esc(r.who)}${r.ours ? ' <span class="pill">ours</span>' : ""}</td><td>${esc(r.tier)}</td><td class="num">${r.used}</td><td class="num">${capTxt}</td><td class="mcell">${meter}</td></tr>`;
  })
  .join("");

const cm = out.credits;
const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Product usage — binders, scans, cards and credits</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --bar-lt:#86b6ef; --warn:#b45309; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-lt:#184f95; --warn:#eda100; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-lt:#184f95; --warn:#eda100; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 6px} h3{font-size:13.5px;margin:0}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:10px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.tile .k{font-size:12px;color:var(--ink-2)}
.tile .value{font-size:28px;font-weight:650}
.tile .value.zero{color:var(--muted)}
.tile .sub{color:var(--muted);font-size:12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.legend{display:flex;gap:14px;margin:12px 0 2px;font-size:12px;color:var(--ink-2)}
.legend .sw{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.sw.real,.seg.real{background:var(--bar)} .sw.exc,.seg.exc{background:var(--bar-lt)}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:10px 0}
.phead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px}
.scale{font-size:11px;color:var(--muted)}
.chart{display:flex;align-items:flex-end;gap:2px;height:${BAR_H + 34}px;padding-top:14px}
.chart .day{flex:1;min-width:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;height:100%;position:relative;gap:2px}
.chart .seg{display:block;border-radius:0}
.chart .day .seg:first-of-type{border-radius:4px 4px 0 0}
.chart .tick{height:16px;font-size:9.5px;color:var(--muted);text-align:center;overflow:visible;white-space:nowrap}
.chart .dlab{position:absolute;top:-2px;left:0;right:0;text-align:center;font-size:10.5px;font-weight:600;color:var(--ink-2)}
details{margin-top:8px;font-size:12.5px} summary{cursor:pointer;color:var(--muted)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.tbl tr.ours td{color:var(--muted)}
.pill{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:20px;border:1px solid var(--border);color:var(--muted)}
.meter{display:inline-block;width:120px;height:8px;border-radius:4px;background:color-mix(in srgb, var(--bar) 14%, transparent);vertical-align:middle;overflow:hidden}
.meter .fill{display:block;height:100%;border-radius:4px;background:var(--bar)}
.meter .fill.full{background:var(--warn)}
.mcell{width:130px}
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Product usage</h1>
<p class="meta">What people are making, daily: binders and placed cards on Michi-Maker, scans and
collection adds on TCGScan, and credit consumption against the tier caps. Every number reads a
product table, not the event stream — <strong>a zero here means it did not happen</strong>, because these tables
see everything and predate instrumentation. Hover (or tab to) any tile or bar for who is behind it.
${demoBinders ? `${demoBinders} demo binder${demoBinders === 1 ? "" : "s"} and its contents are not counted anywhere on this page. ` : ""}Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WIN, "scopes rows by when they were created")}

${blocks}

<h2>Scan credits — ${esc(cm.month)}</h2>
<p class="note">Scoped to the <strong>calendar month</strong>, because that is how <code>cardScansPerMonth</code> resets —
this section deliberately does <strong>not</strong> move with the window toggle above. Caps: guest ${cm.scan.caps.guest},
free ${cm.scan.caps.free}, pro ${cm.scan.caps.pro}, vip unlimited. Tier is read from the entitlements ledger as of now.</p>
<table class="tbl"><thead><tr><th>Who</th><th>Tier</th><th class="num">Scans used</th><th class="num">Monthly cap</th><th>Usage</th></tr></thead>
<tbody>${creditRowsHtml || `<tr><td colspan="5" class="empty">Nobody has scanned this month.</td></tr>`}</tbody></table>
<p class="note">${cm.scan.nearCap
    ? `<strong>${cm.scan.nearCap}</strong> non-excluded ${cm.scan.nearCap === 1 ? "user is" : "users are"} at &ge;80% of their cap — a guest or free user running out of scans is the strongest upgrade signal this data has.`
    : `No non-excluded user is near their cap this month.`}</p>

<h2>Print credits — ${esc(cm.month)}</h2>
<p class="note">Also calendar-month scoped. PRO includes ${cm.print.includedPro}/month, VIP ${cm.print.includedVip}/month.
This month: <strong>${cm.print.jobs}</strong> print ${cm.print.jobs === 1 ? "job" : "jobs"} (${cm.print.sheets} sheet${cm.print.sheets === 1 ? "" : "s"}).
All-time: ${out.allTime.prints.jobs} job${out.allTime.prints.jobs === 1 ? "" : "s"}, ${out.allTime.prints.sheets} sheets, plus ${out.allTime.prints.excludedJobs} from our own accounts.</p>
</main>
${hoverLayer(rosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WIN)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

const b14 = out.byWindow[14];
console.log(
  `Usage 14d  binders ${b14.binders.n} · slots ${b14.slots.n} · scans ${b14.scans.n} · cards ${b14.cards.n}` +
    `  |  month credits: ${out.credits.scan.scanners} scanners, ${out.credits.scan.nearCap} near cap`,
);
console.log(`Wrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/usage.html`);
