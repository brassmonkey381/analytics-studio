// Economy lane: the in-app currencies and the tier caps, one tab per app.
//
//   Doggle       points — balances outstanding, points earned/spent, and what
//                earned them (points_ledger carries an amount per row, so this
//                app has a complete economy).
//   Pickleague   pickles — balances outstanding, plus the SUBSET of earning
//                that records an amount. Most bonus grants are idempotency
//                ledgers with no amount column; the page says so rather than
//                printing a total that looks complete and is not.
//   Michi-Maker  every account's usage against its tier cap: binders, pages per
//   TCGScan      binder, artworks kept, prints this month / scans this month,
//                collections, cards in the biggest collection.
//
// Every plot is a DISTRIBUTION: bars are buckets of accounts, not a time
// series. Hover a bar for who is in it; click it and the accounts drop out
// below with their exact numbers.
//
// What moves with the window toggle, and what cannot:
//   - FLOWS (earned, spent) are scoped by the toggle.
//   - BALANCES and CAP UTILISATION are point-in-time as of collection. A
//     balance has no window; asking "what was the balance 7 days ago" needs a
//     history table none of these apps keep. Stated inline at every such block.
//   - The monthly caps (scans, prints) are calendar-month by definition, which
//     is a third scope again, and also stated.
//
// Cap definitions are taken from the APP CODE, not guessed from the rows:
// cardsPerCollection counts cards (sum of quantity), artUploads is a retention
// cap on slices kept, pagesPerBinder is pages in one binder. See
// ../tcgscan/tcgscan-app/docs/MONETIZATION-TIERS.md and
// ../tcgscan/michi-maker/docs/CAP-ENFORCEMENT.md.
//
// Writes data/economy.json (counts only, committed) + data/economy-roster.json
// (identity, gitignored) + reports/economy.html (gitignored).

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, exclusionCte } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, userLabel } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const APPS = readConfig("apps.json");
const refOf = (id) => APPS.apps.find((a) => a.id === id)?.projectRef;
const DOGGLE = refOf("doggle");
const PICKLE = refOf("pickleague");
const TCG = refOf("tcgscan"); // Michi-Maker and TCGScan share one project

const DATA_FILE = join(ROOT, "data", "economy.json");
const ROSTER_FILE = join(ROOT, "data", "economy-roster.json");
const HTML_FILE = join(ROOT, "reports", "economy.html");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the economy lane needs Management API access.");
  process.exit(1);
}
if (!DOGGLE || !PICKLE || !TCG) {
  console.error("config/apps.json is missing one of the doggle / pickleague / tcgscan projectRefs.");
  process.exit(1);
}

// ---------- queries: one fetch per concern, every window computed from it ----------

// Identity rides along on every row so rosters need no second query.
const identCols = (col, profileTbl, nameCol) => `
  (${col} in (select id from excluded_users)) as excluded,
  coalesce(${profileTbl}.${nameCol}, '') as display_name,
  u.email, coalesce(u.is_anonymous, false) as anon`;

const dogLedgerSql = `
with ${exclusionCte("doggle")}
select l.profile_id as uid, l.points, l.reason, l.created_at as ts, l.is_bonus,
${identCols("l.profile_id", "p", "display_name")}
from public.points_ledger l
left join public.profiles p on p.id = l.profile_id
left join auth.users u on u.id = l.profile_id`;

const dogBalanceSql = `
with ${exclusionCte("doggle")}
select p.id as uid, p.points as balance,
${identCols("p.id", "p", "display_name")}
from public.profiles p
left join auth.users u on u.id = p.id`;

const pickBalanceSql = `
with ${exclusionCte("pickleague")}
select p.id as uid, p.pickles as balance, p.is_guest, p.is_unclaimed,
  (p.id in (select id from excluded_users)) as excluded,
  coalesce(nullif(p.username,''), coalesce(p.full_name,'')) as display_name,
  u.email, coalesce(u.is_anonymous, false) as anon
from public.profiles p
left join auth.users u on u.id = p.id`;

// The Pickleague flows that DO record an amount. Everything else that grants
// pickles (court bonus, first match, first doubles, FTUE, per-game bonus) is an
// idempotency ledger with no amount column — counted separately, as events.
const pickFlowSql = `
with ${exclusionCte("pickleague")},
flows as (
  select user_id as uid, (coalesce(daily_pickles,0) + coalesce(milestone_pickles,0)) as amount,
         awarded_at as ts, 'Login streak reward' as reason, 'earn' as dir
  from public.user_streak_rewards
  union all
  select user_id, amount, created_at, 'Pickle pot payout', 'earn' from public.pickle_pot_payouts
  union all
  select user_id, -cost_paid, purchased_at, 'Shop purchase', 'spend' from public.player_shop_purchases
  union all
  select user_id, -stake, placed_at, 'Wager staked', 'spend' from public.wagers
  union all
  select user_id, -amount_paid, created_at, 'Pickle pot entry', 'spend'
  from public.pickle_pot_contributions where refunded_at is null
)
select f.uid, f.amount, f.ts, f.reason, f.dir,
  (f.uid in (select id from excluded_users)) as excluded,
  coalesce(nullif(p.username,''), coalesce(p.full_name,'')) as display_name,
  u.email, coalesce(u.is_anonymous, false) as anon
from flows f
left join public.profiles p on p.id = f.uid
left join auth.users u on u.id = f.uid`;

// Grant EVENTS with no recorded amount — counted so the gap is visible.
const pickGrantEventsSql = `
with ${exclusionCte("pickleague")},
ev as (
  select user_id as uid, granted_at as ts, 'Home-court bonus' as kind from public.court_bonus_grants
  union all select user_id, granted_at, 'First doubles match' from public.first_doubles_bonus_grants
  union all select user_id, granted_at, 'First match' from public.first_match_bonus_grants
  union all select user_id, granted_at, 'Onboarding step' from public.ftue_grants
  union all select user_id, granted_at, 'Per-game match bonus' from public.match_game_bonus_grants
)
select ev.uid, ev.ts, ev.kind, (ev.uid in (select id from excluded_users)) as excluded
from ev`;

// ---------- cap usage on the shared TCG project ----------

// Tier as the entitlements ledger sees it right now, for every account that has
// any of the usage below. Anonymous accounts are the 'guest' tier.
const tierExpr = (col) => `
  case
    when exists (select 1 from public.entitlements e where e.user_id = ${col}
                 and e.product in ('tcgscan_vip','michi_vip') and (e.expires_at is null or e.expires_at > now())) then 'vip'
    when exists (select 1 from public.entitlements e where e.user_id = ${col}
                 and e.product in ('tcgscan_pro','michi_pro') and (e.expires_at is null or e.expires_at > now())) then 'pro'
    when coalesce(u.is_anonymous, false) then 'guest'
    else 'free'
  end`;

// One row per (account, limit_key) with the number the app would compare to the
// cap. Definitions verified against the app code, not inferred from the rows.
const capUsageSql = (appId) => `
with ${exclusionCte(appId)},
binders_n as (
  select owner_id as uid, count(*)::int used from public.binders
  where not coalesce(is_demo,false) and archived_at is null group by 1
),
pages_n as (
  select b.owner_id as uid, max(pc.n)::int used
  from (select binder_id, count(*)::int n from public.binder_pages group by 1) pc
  join public.binders b on b.id = pc.binder_id
  where not coalesce(b.is_demo,false) and b.archived_at is null group by 1
),
art_n as (
  select owner_id as uid, count(*)::int used from public.saved_slices
  where deleted_at is null group by 1
),
prints_n as (
  select user_id as uid, count(*)::int used from public.print_events
  where created_at >= date_trunc('month', now()) group by 1
),
scans_n as (
  select user_id as uid, count(*)::int used from public.scan_events
  where created_at >= date_trunc('month', now()) group by 1
),
coll_n as (
  -- The app mints a default "My Collection" on every fresh install before the
  -- visitor does anything (tcgscan-app/src/lib/portfolio.ts loadRaw), and cloud
  -- sync pushes it up. Counting it made every guest look pinned to the 1-
  -- collection guest cap: 221 of 228 rows are named "My Collection" and 205 were
  -- created at signup and never edited. Same filter the DAU lane uses — keep a
  -- collection made well after signup (deliberate) or edited later (used).
  select c.user_id as uid, count(*)::int used
  from public.collections c
  join auth.users cu on cu.id = c.user_id
  where c.archived_at is null
    and (c.created_at > cu.created_at + interval '2 seconds'
         or c.updated_at > c.created_at + interval '2 seconds')
  group by 1
),
cards_n as (
  -- cardsPerCollection counts CARDS, not lots: sum(quantity) per collection,
  -- and the cap applies to the biggest single collection.
  select user_id as uid, max(q)::int used from (
    select user_id, collection_id, sum(quantity)::int q
    from public.portfolio_entries group by 1, 2
  ) s group by 1
),
all_use as (
  select uid, 'michi' as app, 'binders' as limit_key, used from binders_n
  union all select uid, 'michi', 'pagesPerBinder', used from pages_n
  union all select uid, 'michi', 'artUploads', used from art_n
  union all select uid, 'michi', 'includedPrintsPerMonth', used from prints_n
  union all select uid, 'tcgscan', 'cardScansPerMonth', used from scans_n
  union all select uid, 'tcgscan', 'collections', used from coll_n
  union all select uid, 'tcgscan', 'cardsPerCollection', used from cards_n
)
select a.uid, a.app, a.limit_key, a.used,
  ${tierExpr("a.uid")} as tier,
  (a.uid in (select id from excluded_users)) as excluded,
  coalesce(pr.username, '') as username,
  coalesce(pr.display_name, '') as display_name,
  u.email, coalesce(u.is_anonymous, false) as anon
from all_use a
left join auth.users u on u.id = a.uid
left join public.profiles pr on pr.id = a.uid
where a.used > 0`;

const capsSql = `select app, limit_key, tier, value from public.tier_caps`;

// Accounts that exist but use nothing — so a distribution over "accounts that
// used the feature" can state what it leaves out instead of implying zero.
const tcgAccountsSql = `
with ${exclusionCte("tcgscan")}
select count(*)::int total,
  count(*) filter (where coalesce(is_anonymous,false))::int guests,
  count(*) filter (where id in (select id from excluded_users))::int excluded
from auth.users`;

const [dogLedger, dogBalances, pickBalances, pickFlows, pickGrantEvents, capUsage, caps, tcgAccounts] =
  await Promise.all([
    runSql(DOGGLE, dogLedgerSql),
    runSql(DOGGLE, dogBalanceSql),
    runSql(PICKLE, pickBalanceSql),
    runSql(PICKLE, pickFlowSql),
    runSql(PICKLE, pickGrantEventsSql),
    runSql(TCG, capUsageSql("tcgscan")),
    runSql(TCG, capsSql),
    runSql(TCG, tcgAccountsSql).then((r) => r[0]),
  ]);

const collectedAt = new Date().toISOString();
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WIN = 30;
const NOW = Date.now();
const inWin = (ts, w) => w === ALL_WINDOW || Date.parse(ts) >= NOW - Number(w) * 86400_000;
const fmt = (n) => Number(n ?? 0).toLocaleString("en-US");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const labelOf = (r) =>
  userLabel({
    id: r.uid,
    username: r.username || null,
    display_name: r.display_name || null,
    email: r.email,
    anon: r.anon,
  });

// ---------- distribution machinery ----------

// Log-decade buckets, the same shape the geo lane uses: narrowing the window
// empties a bucket, it never rescales the axis. The bucket SET is computed from
// the all-time maximum so it is identical in every window.
// There is deliberately NO zero bucket: every caller filters to accounts with a
// positive value, so a "0" bar would always read as "nobody has zero", which is
// the opposite of the truth. Zero-holders are stated in prose instead.
function decadeBuckets(maxValue) {
  const edges = [1];
  while (edges.at(-1) * 10 <= Math.max(1, maxValue)) edges.push(edges.at(-1) * 10);
  return edges.map((lo, i) => {
    const hi = i + 1 < edges.length ? edges[i + 1] - 1 : Infinity;
    return { lo, hi, label: hi === Infinity ? `${fmt(lo)}+` : lo === hi ? fmt(lo) : `${fmt(lo)}–${fmt(hi)}` };
  });
}
const bucketIndex = (bs, v) => {
  for (let i = bs.length - 1; i >= 0; i--) if (v >= bs[i].lo) return i;
  return 0;
};

// Utilisation bands for a cap. Ordinal (light->dark), with the at/over band on
// the warning colour because crossing a cap is a state, not just a bigger number.
const BANDS = [
  { key: "b1", label: "1–25%", lo: 0, hi: 25 },
  { key: "b2", label: "25–50%", lo: 25, hi: 50 },
  { key: "b3", label: "50–80%", lo: 50, hi: 80 },
  { key: "b4", label: "80–99%", lo: 80, hi: 100 },
  { key: "over", label: "at / over cap", lo: 100, hi: Infinity },
];
// Written out rather than derived: exactly 100% must land in "at / over cap",
// and a loop on `>` puts it in 80–99% instead.
const bandIndex = (p) => (p >= 100 ? 4 : p >= 80 ? 3 : p >= 50 ? 2 : p >= 25 ? 1 : 0);

const rosters = {};
const out = { collectedAt, windows: WINDOWS, defaultWindow: DEFAULT_WIN, apps: {} };

// A distribution block: buckets x windows, each with its own roster.
// `rows` is [{uid, who, value, ts}] — ts null means the row is point-in-time.
function distribution(keyPrefix, rows, buckets, { windowed }) {
  const perWindow = {};
  for (const w of WINDOWS) {
    const counts = buckets.map(() => 0);
    const who = buckets.map(() => []);
    const scoped = windowed ? rows.filter((r) => inWin(r.ts, w)) : rows;
    // A windowed distribution sums each account's flow inside the window, so a
    // bucket is "accounts whose earning in this window fell in this range".
    const byUid = new Map();
    for (const r of scoped) byUid.set(r.uid, { who: r.who, value: (byUid.get(r.uid)?.value ?? 0) + r.value });
    for (const [uid, v] of byUid) {
      if (v.value <= 0 && windowed) continue; // no flow in this window is not a bucket-0 account
      const i = bucketIndex(buckets, v.value);
      counts[i]++;
      who[i].push({ uid, who: v.who, value: v.value });
    }
    perWindow[w] = { counts, who };
    buckets.forEach((b, i) => {
      const list = who[i].sort((a, z) => z.value - a.value);
      rosters[`${keyPrefix}|${w}|${i}`] = {
        total: list.length,
        names: list.slice(0, 60).map((x) => `${x.who} — ${fmt(x.value)}`),
      };
    });
  }
  // ONE y-scale across every window: the tallest bar any window produces.
  const yMax = Math.max(1, ...WINDOWS.flatMap((w) => perWindow[w].counts));
  return { buckets, perWindow, yMax };
}

// ---------- Doggle ----------

const dogReal = dogLedger.filter((r) => !r.excluded);
const dogExcluded = dogLedger.length - dogReal.length;
const dogBalReal = dogBalances.filter((r) => !r.excluded);
const dogBalExcluded = dogBalances.length - dogBalReal.length;
const dogBalSum = dogBalReal.reduce((a, r) => a + (r.balance ?? 0), 0);

// "Login bonus (day 3)" and "Daily care (Eve): Walks" are one reason each with a
// variable tail. Group on the stable head so the chart has categories, not 40
// near-duplicate strings.
const reasonCategory = (reason) => String(reason ?? "").split(/\s*[:(]/)[0].trim() || "Other";

const dogEarnRows = dogReal
  .filter((r) => r.points > 0)
  .map((r) => ({ uid: r.uid, who: labelOf(r), value: r.points, ts: r.ts }));
const dogBalRows = dogBalReal
  .filter((r) => (r.balance ?? 0) > 0)
  .map((r) => ({ uid: r.uid, who: labelOf(r), value: r.balance, ts: null }));

const dogBalDist = distribution("dbal", dogBalRows, decadeBuckets(Math.max(0, ...dogBalRows.map((r) => r.value))), { windowed: false });
const dogEarnDist = distribution("dearn", dogEarnRows, decadeBuckets(Math.max(0, ...dogEarnRows.map((r) => r.value))), { windowed: true });

// Earned by reason, per window — a ranked bar list, not a distribution.
const dogReasons = {};
for (const w of WINDOWS) {
  const agg = new Map();
  for (const r of dogReal) {
    if (r.points <= 0 || !inWin(r.ts, w)) continue;
    const c = reasonCategory(r.reason);
    const e = agg.get(c) ?? { points: 0, rows: 0, uids: new Set(), who: new Map() };
    e.points += r.points;
    e.rows++;
    e.uids.add(r.uid);
    e.who.set(r.uid, (e.who.get(r.uid) ?? 0) + r.points);
    agg.set(c, e);
  }
  const list = [...agg.entries()]
    .map(([c, e]) => ({ category: c, points: e.points, rows: e.rows, users: e.uids.size, who: [...e.who.entries()] }))
    .sort((a, b) => b.points - a.points);
  dogReasons[w] = list;
  for (const r of list) {
    rosters[`drsn|${w}|${r.category}`] = {
      total: r.users,
      names: r.who
        .map(([uid, pts]) => ({ n: dogReal.find((x) => x.uid === uid) ? labelOf(dogReal.find((x) => x.uid === uid)) : String(uid).slice(0, 8), pts }))
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 60)
        .map((x) => `${x.n} — ${fmt(x.pts)} pts`),
    };
  }
}
// ONE scale for the reason chart across windows.
const dogReasonMax = Math.max(1, ...WINDOWS.flatMap((w) => dogReasons[w].map((r) => r.points)));

// ---------- Pickleague ----------

const pickBalReal = pickBalances.filter((r) => !r.excluded);
const pickBalExcluded = pickBalances.length - pickBalReal.length;
const pickFlowReal = pickFlows.filter((r) => !r.excluded);
const pickFlowExcluded = pickFlows.length - pickFlowReal.length;
const pickGrantReal = pickGrantEvents.filter((r) => !r.excluded);

const pickBalRows = pickBalReal
  .filter((r) => (r.balance ?? 0) > 0)
  .map((r) => ({ uid: r.uid, who: labelOf(r), value: r.balance, ts: null }));
const pickBalSum = pickBalRows.reduce((a, r) => a + r.value, 0);
// One account holding almost the entire supply is the single most important
// fact about this economy, so it is measured and named rather than smoothed.
const pickTop = [...pickBalRows].sort((a, b) => b.value - a.value)[0] ?? null;
const pickTopShare = pickTop && pickBalSum ? (pickTop.value / pickBalSum) * 100 : 0;

const pickEarnRows = pickFlowReal
  .filter((r) => r.amount > 0)
  .map((r) => ({ uid: r.uid, who: labelOf(r), value: r.amount, ts: r.ts }));
const pickSpendRows = pickFlowReal
  .filter((r) => r.amount < 0)
  .map((r) => ({ uid: r.uid, who: labelOf(r), value: -r.amount, ts: r.ts }));

const pickBalDist = distribution("pbal", pickBalRows, decadeBuckets(Math.max(0, ...pickBalRows.map((r) => r.value))), { windowed: false });
const pickEarnDist = distribution("pearn", pickEarnRows, decadeBuckets(Math.max(0, ...pickEarnRows.map((r) => r.value))), { windowed: true });

const pickFlowByReason = {};
for (const w of WINDOWS) {
  const agg = new Map();
  for (const r of pickFlowReal) {
    if (!inWin(r.ts, w)) continue;
    const e = agg.get(r.reason) ?? { amount: 0, rows: 0, dir: r.dir };
    e.amount += Math.abs(r.amount);
    e.rows++;
    agg.set(r.reason, e);
  }
  pickFlowByReason[w] = [...agg.entries()].map(([reason, e]) => ({ reason, ...e })).sort((a, b) => b.amount - a.amount);
}
const pickGrantByKind = {};
for (const w of WINDOWS) {
  const agg = new Map();
  for (const r of pickGrantReal) {
    if (!inWin(r.ts, w)) continue;
    agg.set(r.kind, (agg.get(r.kind) ?? 0) + 1);
  }
  pickGrantByKind[w] = [...agg.entries()].map(([kind, n]) => ({ kind, n })).sort((a, b) => b.n - a.n);
}

// ---------- Michi-Maker / TCGScan cap utilisation ----------

const capOf = (app, key, tier) => {
  const row = caps.find((c) => c.app === app && c.limit_key === key && c.tier === tier);
  return row ? row.value : undefined;
};

const CAP_META = {
  binders: { app: "michi", title: "Binders", unit: "binders", scope: "as of now", note: "non-demo, non-archived binders owned by the account" },
  pagesPerBinder: { app: "michi", title: "Pages in a binder", unit: "pages", scope: "as of now", note: "the account's fullest single binder — the cap is per binder, not per account" },
  artUploads: { app: "michi", title: "Artworks kept", unit: "artworks", scope: "as of now", note: "a retention cap on slices kept in the tray, not a lifetime upload count" },
  includedPrintsPerMonth: { app: "michi", title: "Prints included this month", unit: "print jobs", scope: "calendar month", note: "free and guest tiers include 0, so any print is over the included allowance" },
  cardScansPerMonth: { app: "tcgscan", title: "Card scans this month", unit: "scans", scope: "calendar month", note: "each scan consumes one monthly credit" },
  collections: { app: "tcgscan", title: "Collections", unit: "collections", scope: "as of now", note: "non-archived collections" },
  cardsPerCollection: { app: "tcgscan", title: "Cards in biggest collection", unit: "cards", scope: "as of now", note: "counts CARDS (sum of quantity), not lots — owner call, 2026-07-23" },
};

const capReal = capUsage.filter((r) => !r.excluded);
const capExcluded = capUsage.length - capReal.length;

const capBlocks = {};
for (const [key, meta] of Object.entries(CAP_META)) {
  const rows = capReal.filter((r) => r.limit_key === key);
  // Per-cap, not just page-wide: an empty chart whose accounts were all
  // excluded means something completely different from one where nothing
  // happened, and only a per-cap number can tell them apart.
  const excludedHere = capUsage.filter((r) => r.excluded && r.limit_key === key).length;
  const withCap = [];
  let uncapped = 0;
  for (const r of rows) {
    const cap = capOf(meta.app, key, r.tier);
    if (cap === null || cap === undefined) {
      uncapped++;
      continue;
    }
    // A cap of 0 (free/guest prints) cannot produce a percentage; any use of it
    // is over the allowance by definition, which is what the band says.
    const p = cap === 0 ? Infinity : (r.used / cap) * 100;
    withCap.push({ uid: r.uid, who: labelOf(r), tier: r.tier, used: r.used, cap, p });
  }
  const counts = BANDS.map(() => 0);
  const who = BANDS.map(() => []);
  for (const r of withCap) {
    const i = bandIndex(r.p);
    counts[i]++;
    who[i].push(r);
  }
  BANDS.forEach((b, i) => {
    const list = who[i].sort((a, z) => z.p - a.p);
    rosters[`cap|${key}|${i}`] = {
      total: list.length,
      names: list.slice(0, 60).map((x) => `${x.who} (${x.tier}) — ${fmt(x.used)} of ${fmt(x.cap)}`),
    };
  });
  capBlocks[key] = {
    meta,
    counts,
    who,
    uncapped,
    excludedHere,
    users: withCap.length,
    atCap: counts[BANDS.length - 1],
    yMax: Math.max(1, ...counts),
  };
}

// ---------- outputs (counts only; identity lives in the roster sidecar) ----------

const distJson = (d) => ({
  buckets: d.buckets.map((b) => b.label),
  byWindow: Object.fromEntries(WINDOWS.map((w) => [w, d.perWindow[w].counts])),
});

out.apps.doggle = {
  currency: "points",
  balances: {
    accounts: dogBalRows.length,
    outstanding: dogBalSum,
    excludedAccounts: dogBalExcluded,
    distribution: distJson(dogBalDist),
  },
  flows: Object.fromEntries(
    WINDOWS.map((w) => {
      const rs = dogReal.filter((r) => inWin(r.ts, w));
      return [
        w,
        {
          earned: rs.filter((r) => r.points > 0).reduce((a, r) => a + r.points, 0),
          spent: -rs.filter((r) => r.points < 0).reduce((a, r) => a + r.points, 0),
          rows: rs.length,
          earners: new Set(rs.filter((r) => r.points > 0).map((r) => r.uid)).size,
        },
      ];
    }),
  ),
  earnedDistribution: distJson(dogEarnDist),
  byReason: Object.fromEntries(WINDOWS.map((w) => [w, dogReasons[w].map((r) => ({ category: r.category, points: r.points, rows: r.rows, users: r.users }))])),
  excludedLedgerRows: dogExcluded,
};

out.apps.pickleague = {
  currency: "pickles",
  balances: {
    accounts: pickBalRows.length,
    outstanding: pickBalSum,
    excludedAccounts: pickBalExcluded,
    topShare: Number(pickTopShare.toFixed(1)),
    distribution: distJson(pickBalDist),
  },
  flows: Object.fromEntries(
    WINDOWS.map((w) => {
      const rs = pickFlowReal.filter((r) => inWin(r.ts, w));
      return [
        w,
        {
          earnedMeasured: rs.filter((r) => r.amount > 0).reduce((a, r) => a + r.amount, 0),
          spent: -rs.filter((r) => r.amount < 0).reduce((a, r) => a + r.amount, 0),
          grantEventsWithoutAmount: pickGrantReal.filter((r) => inWin(r.ts, w)).length,
        },
      ];
    }),
  ),
  earnedDistribution: distJson(pickEarnDist),
  excludedFlowRows: pickFlowExcluded,
};

out.apps.caps = Object.fromEntries(
  Object.entries(capBlocks).map(([k, b]) => [
    k,
    { app: b.meta.app, bands: BANDS.map((x) => x.label), counts: b.counts, users: b.users, uncapped: b.uncapped, atCap: b.atCap },
  ]),
);
out.apps.caps._accounts = { ...tcgAccounts, excludedUsageRows: capExcluded };

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const BAR_H = 110;

// A distribution chart: one bar per bucket, hover for who, click to drill.
function distChart(id, dist, { label, unit, windowed }) {
  const per = (w) => {
    const { counts } = dist.perWindow[w];
    const cols = dist.buckets
      .map((b, i) => {
        const n = counts[i];
        const h = n ? Math.max(3, Math.round((n / dist.yMax) * BAR_H)) : 0;
        const drill = n ? ` data-drill="dr-${id}-${w}-${i}" role="button" tabindex="0" aria-label="${esc(b.label)} ${unit}, ${n} accounts, open the list"` : "";
        // A point-in-time chart pins its roster to one window rather than
        // {scope}: its numbers do not follow the toggle, so its names must not
        // appear to either.
        const hov = windowed ? hoverAttr(id, "{scope}", i) : hoverAttr(id, w, i);
        return `<div class="bcol">
  ${n ? `<span class="bval">${n}</span>` : ""}
  <span class="bar${n ? "" : " zero"}" style="height:${h}px" ${hov}${drill}></span>
  <span class="btick">${esc(b.label)}</span>
</div>`;
      })
      .join("");
    const mid = Math.round(dist.yMax / 2);
    const yAxis = `<div class="ygrid" aria-hidden="true">
  <div class="gl" style="bottom:${BAR_H + 18}px"><span class="gv">${dist.yMax}</span></div>
  ${mid > 0 && mid < dist.yMax ? `<div class="gl" style="bottom:${Math.round((mid / dist.yMax) * BAR_H) + 18}px"><span class="gv">${mid}</span></div>` : ""}
  <div class="gl base" style="bottom:18px"><span class="gv">0</span></div>
</div>`;
    const panels = dist.buckets
      .map((b, i) => {
        const list = dist.perWindow[w].who[i];
        if (!list.length) return "";
        return `<div class="drill" id="dr-${id}-${w}-${i}" hidden>
<div class="dhead"><h4>${esc(b.label)} ${esc(unit)} — ${list.length} ${list.length === 1 ? "account" : "accounts"}</h4><button class="dclose" type="button">close &times;</button></div>
<table class="tbl"><thead><tr><th>Account</th><th class="num">${esc(label)}</th></tr></thead>
<tbody>${list
          .sort((a, z) => z.value - a.value)
          .map((x) => `<tr><td>${esc(x.who)}</td><td class="num">${fmt(x.value)}</td></tr>`)
          .join("")}</tbody></table>
</div>`;
      })
      .join("");
    return `<div class="plot">${yAxis}<div class="chart" role="img" aria-label="${esc(label)} distribution, tallest bar ${dist.yMax} accounts">${cols}</div></div>
<p class="axlab">${esc(unit)} per account &rarr;</p>
${panels}`;
  };
  if (!windowed) {
    // Point-in-time: one rendering, and it must not appear to follow the toggle.
    return per(ALL_WINDOW);
  }
  return WINDOWS.map((w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${per(w)}</div>`).join("\n");
}

// A ranked horizontal bar list (what earned the points).
function rankChart(rows, { max, valueOf, labelOf: lf, hoverKey, unit }) {
  if (!rows.length) return `<p class="empty">Nothing in this window.</p>`;
  return `<div class="ranks">${rows
    .map((r) => {
      const v = valueOf(r);
      const w = Math.max(1, Math.round((v / max) * 100));
      return `<div class="rank"${hoverKey ? ` ${hoverAttr(hoverKey, "{scope}", lf(r))} tabindex="0"` : ""}>
  <span class="rlab">${esc(lf(r))}</span>
  <span class="rtrack"><span class="rfill" style="width:${w}%"></span></span>
  <span class="rval">${fmt(v)}${unit ? ` ${esc(unit)}` : ""}</span>
</div>`;
    })
    .join("")}</div>`;
}

// Cap utilisation chart: bands rather than decades, at/over cap in the warn colour.
function capChart(key, block) {
  const cols = BANDS.map((b, i) => {
    const n = block.counts[i];
    const h = n ? Math.max(3, Math.round((n / block.yMax) * BAR_H)) : 0;
    const drill = n ? ` data-drill="dr-cap-${key}-${i}" role="button" tabindex="0" aria-label="${esc(b.label)}, ${n} accounts, open the list"` : "";
    return `<div class="bcol">
  ${n ? `<span class="bval">${n}</span>` : ""}
  <span class="bar band-${b.key}${n ? "" : " zero"}" style="height:${h}px" ${hoverAttr("cap", key, i)}${drill}></span>
  <span class="btick">${esc(b.label)}</span>
</div>`;
  }).join("");
  const mid = Math.round(block.yMax / 2);
  const yAxis = `<div class="ygrid" aria-hidden="true">
  <div class="gl" style="bottom:${BAR_H + 18}px"><span class="gv">${block.yMax}</span></div>
  ${mid > 0 && mid < block.yMax ? `<div class="gl" style="bottom:${Math.round((mid / block.yMax) * BAR_H) + 18}px"><span class="gv">${mid}</span></div>` : ""}
  <div class="gl base" style="bottom:18px"><span class="gv">0</span></div>
</div>`;
  const panels = BANDS.map((b, i) => {
    const list = block.who[i];
    if (!list.length) return "";
    return `<div class="drill" id="dr-cap-${key}-${i}" hidden>
<div class="dhead"><h4>${esc(b.label)} — ${list.length} ${list.length === 1 ? "account" : "accounts"}</h4><button class="dclose" type="button">close &times;</button></div>
<table class="tbl"><thead><tr><th>Account</th><th>Tier</th><th class="num">Used</th><th class="num">Cap</th><th>Utilisation</th></tr></thead>
<tbody>${list
      .map((x) => {
        const w = x.p === Infinity ? 100 : Math.min(100, Math.round(x.p));
        const over = x.p >= 100;
        return `<tr><td>${esc(x.who)}</td><td>${esc(x.tier)}</td><td class="num">${fmt(x.used)}</td><td class="num">${fmt(x.cap)}</td><td class="mcell"><span class="meter"><span class="fill${over ? " full" : ""}" style="width:${w}%"></span></span> <span class="pct">${x.p === Infinity ? "over" : `${Math.round(x.p)}%`}</span></td></tr>`;
      })
      .join("")}</tbody></table>
</div>`;
  }).join("");
  const capsLine = `<p class="note">${esc(block.meta.note)}. Caps by tier: ${["guest", "free", "pro", "vip"]
    .map((t) => {
      const c = capOf(block.meta.app, key, t);
      return `${t} ${c === null ? "&infin;" : c === undefined ? "—" : fmt(c)}`;
    })
    .join(", ")}.</p>`;
  // Five empty bars would read as a measurement, so an empty cap says WHY it is
  // empty instead of drawing one. The two reasons are not interchangeable.
  const body = block.users
    ? `<div class="plot">${yAxis}<div class="chart" role="img" aria-label="${esc(block.meta.title)} utilisation bands, tallest bar ${block.yMax} accounts">${cols}</div></div>
<p class="axlab">share of the account's own cap &rarr;</p>
<p class="note">${block.users} account${block.users === 1 ? "" : "s"} with any use.${
        block.uncapped ? ` ${block.uncapped} on an unlimited tier, not plotted — there is no denominator.` : ""
      }${block.excludedHere ? ` ${block.excludedHere} more excluded as ours, bot, seeded or QA.` : ""}${
        block.atCap ? ` <strong class="warntxt">${block.atCap}</strong> at or over the cap.` : ""
      }</p>
${panels}`
    : `<p class="note empty">${
        block.excludedHere
          ? `No chart: every account that used this — <strong>${block.excludedHere}</strong> of them — is one of ours, a bot, seeded or QA, and excluded by policy. This is <em>not</em> "nobody used it".`
          : `No chart: nobody has used this at all${block.meta.scope === "calendar month" ? " this calendar month" : ""}. The table is readable and it is empty, so this is a real zero — it did not happen.`
      }</p>`;
  return `<div class="panel">
<div class="phead"><h3>${esc(block.meta.title)}</h3><span class="scale">${esc(block.meta.scope)}</span></div>
${capsLine}
${body}
</div>`;
}

// The in-page tab bar is for opening this file straight off disk. Served
// through the dashboard it is hidden and the sidebar's app filter drives the
// same panels — one app control, not two fighting each other.
const APP_TABS = [
  ["d", "Doggle", "doggle"],
  ["p", "Pickleague", "pickleague"],
  ["m", "Michi-Maker", "michi-maker"],
  ["t", "TCGScan", "tcgscan"],
];
const scopeOf = (id) => APP_TABS.find(([tid]) => tid === id)?.[2] ?? id;
const tabBar = `<div class="tabbar" role="tablist" aria-label="App">${APP_TABS.map(
  ([id, name], i) => `<button class="appbtn" role="tab" data-app="${id}" aria-selected="${i === 0}">${esc(name)}</button>`,
).join("")}</div>`;

// ----- Doggle panel -----
const dogTiles = WINDOWS.map((w) => {
  const f = out.apps.doggle.flows[w];
  return `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>
<div class="tiles">
  <div class="tile"><div class="k">Points earned</div><div class="value${f.earned ? "" : " zero"}">${fmt(f.earned)}</div><div class="sub">${w === ALL_WINDOW ? "all time" : `last ${windowLabel(w)}`} · ${f.earners} ${f.earners === 1 ? "account" : "accounts"}</div></div>
  <div class="tile"><div class="k">Points spent</div><div class="value${f.spent ? "" : " zero"}">${fmt(f.spent)}</div><div class="sub">redemptions and purchases</div></div>
  <div class="tile"><div class="k">Ledger rows</div><div class="value${f.rows ? "" : " zero"}">${fmt(f.rows)}</div><div class="sub">every credit and debit</div></div>
</div></div>`;
}).join("\n");

const dogReasonBlocks = WINDOWS.map(
  (w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${rankChart(dogReasons[w], {
    max: dogReasonMax,
    valueOf: (r) => r.points,
    labelOf: (r) => r.category,
    hoverKey: "drsn",
    unit: "pts",
  })}</div>`,
).join("\n");

const dogglePanel = `<div class="apppanel" data-app-panel="d" data-app-scope="doggle">
<div class="appname">Doggle</div>
<h2>Points outstanding</h2>
<p class="note"><strong>Point-in-time, as of collection — this block does not move with the window toggle.</strong>
A balance has no window: <code>profiles.points</code> is a running total and no history table exists to rewind it.
${fmt(dogBalRows.length)} account${dogBalRows.length === 1 ? "" : "s"} hold <strong>${fmt(dogBalSum)}</strong> points between them;
${fmt(dogBalReal.length - dogBalRows.length)} more hold nothing and are not plotted (an empty bar for them would read as
"nobody has zero", which is the opposite of the truth).
${dogBalExcluded ? `${dogBalExcluded} of our own / seeded / QA accounts are excluded from this and every number below.` : ""}</p>
${distChart("dbal", dogBalDist, { label: "Balance", unit: "points held", windowed: false })}

<h2>Flows</h2>
${dogTiles}
<p class="note">${dogExcluded ? `<strong>${fmt(dogExcluded)}</strong> ledger rows from our own, seeded or QA accounts are not in any number or bar on this tab — excluded by policy, stated so the drop is never silent.` : "No excluded ledger rows."}</p>

<h3 class="sec">How much each account earned</h3>
<p class="note">Each account's total earning inside the window, bucketed. Log-decade buckets, fixed across windows —
narrowing the toggle empties bars, it never rescales them. Hover a bar for who is in it; click one for their numbers.</p>
${distChart("dearn", dogEarnDist, { label: "Earned", unit: "points earned", windowed: true })}

<h3 class="sec">What earned the points</h3>
<p class="note">Reasons are grouped on their stable head, so <code>Login bonus (day 3)</code> and
<code>Daily care (Eve): Walks</code> land in <em>Login bonus</em> and <em>Daily care</em> rather than becoming
forty near-duplicate labels. One scale across windows. Hover a row for the accounts behind it.</p>
${dogReasonBlocks}
</div>`;

// ----- Pickleague panel -----
const pickTiles = WINDOWS.map((w) => {
  const f = out.apps.pickleague.flows[w];
  return `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>
<div class="tiles">
  <div class="tile"><div class="k">Pickles earned <span class="pill">measured</span></div><div class="value${f.earnedMeasured ? "" : " zero"}">${fmt(f.earnedMeasured)}</div><div class="sub">streak rewards + pot payouts only</div></div>
  <div class="tile"><div class="k">Pickles spent</div><div class="value${f.spent ? "" : " zero"}">${fmt(f.spent)}</div><div class="sub">shop, wagers, pot entries</div></div>
  <div class="tile"><div class="k">Grants with no amount</div><div class="value${f.grantEventsWithoutAmount ? "" : " zero"}">${fmt(f.grantEventsWithoutAmount)}</div><div class="sub">events whose pickle value is not in the database</div></div>
</div></div>`;
}).join("\n");

const pickGrantBlocks = WINDOWS.map(
  (w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${rankChart(pickGrantByKind[w], {
    max: Math.max(1, ...WINDOWS.flatMap((x) => pickGrantByKind[x].map((r) => r.n))),
    valueOf: (r) => r.n,
    labelOf: (r) => r.kind,
    unit: "grants",
  })}</div>`,
).join("\n");

const pickFlowBlocks = WINDOWS.map(
  (w) => `<div data-w="${w}"${w === DEFAULT_WIN ? "" : " hidden"}>${rankChart(pickFlowByReason[w], {
    max: Math.max(1, ...WINDOWS.flatMap((x) => pickFlowByReason[x].map((r) => r.amount))),
    valueOf: (r) => r.amount,
    labelOf: (r) => r.reason,
    unit: "pickles",
  })}</div>`,
).join("\n");

const picklePanel = `<div class="apppanel" data-app-panel="p" data-app-scope="pickleague" hidden>
<div class="appname">Pickleague</div>
<h2>Pickles outstanding</h2>
<p class="note"><strong>Point-in-time, as of collection — this block does not move with the window toggle.</strong>
${fmt(pickBalRows.length)} account${pickBalRows.length === 1 ? "" : "s"} hold <strong>${fmt(pickBalSum)}</strong> pickles;
${fmt(pickBalReal.length - pickBalRows.length)} more hold nothing and are not plotted.
${pickBalExcluded ? `${fmt(pickBalExcluded)} accounts are excluded — almost all of them the ${fmt(pickBalances.filter((r) => r.is_unclaimed).length)} unclaimed placeholder rows from the 2026-07-29 roster import, which are not people.` : ""}</p>
${pickTop && pickTopShare > 50
    ? `<p class="note warnbox"><strong>One account holds ${pickTopShare.toFixed(1)}% of every pickle in circulation</strong>
(${fmt(pickTop.value)} of ${fmt(pickBalSum)}). It is not caught by any exclusion rule — it signs in with an ordinary
consumer email address. Either it is a test account that belongs in <code>config/exclusions.json</code>, or a grant
path paid out far more than it should have. Until that is settled, <strong>read every total on this tab as
"one account plus everyone else"</strong>: the distribution below is the honest view, because a bucket chart puts that
account in its own bar instead of burying it in an average.</p>`
    : ""}
${distChart("pbal", pickBalDist, { label: "Balance", unit: "pickles held", windowed: false })}

<h2>Flows</h2>
<p class="note warnbox"><strong>Pickleague has no complete points ledger, and this page will not pretend otherwise.</strong>
<code>user_streak_rewards</code> and <code>pickle_pot_payouts</code> record an amount, so their pickles are exact.
The other five earning paths — home-court bonus, first match, first doubles, onboarding steps and the per-game match
bonus — are <em>idempotency</em> tables: they record <em>that</em> an account was granted a bonus, never how many pickles
it was worth. Those amounts live in app constants. So <strong>&ldquo;earned&rdquo; below is a floor, not a total</strong>,
and the gap is counted beside it as grant events. Closing this needs an amount column on those tables, or a single
pickles ledger like Doggle's <code>points_ledger</code>.</p>
${pickTiles}
<p class="note">${pickFlowExcluded ? `<strong>${fmt(pickFlowExcluded)}</strong> flow rows from excluded accounts are not drawn anywhere on this tab.` : "No excluded flow rows."}</p>

<h3 class="sec">How much each account earned <span class="pill">measured paths only</span></h3>
${distChart("pearn", pickEarnDist, { label: "Earned", unit: "pickles earned", windowed: true })}

<h3 class="sec">Where the measured pickles moved</h3>
${pickFlowBlocks}

<h3 class="sec">Grants whose pickle value is not recorded</h3>
<p class="note">Counted as events, because counting them as zero pickles would be a lie and counting them as a guess
would be worse. This is the size of the blind spot above.</p>
${pickGrantBlocks}
</div>`;

// ----- cap panels -----
const capPanel = (appKey, appName, keys) => `<div class="apppanel" data-app-panel="${appKey}" data-app-scope="${scopeOf(appKey)}" hidden>
<h2>${esc(appName)} — usage against tier caps</h2>
<p class="note"><strong>Point-in-time, as of collection — these blocks do not move with the window toggle.</strong>
A cap is a state, not a flow: the count caps read the account's totals right now, and the two monthly caps
(scans, prints) reset on the <strong>calendar month</strong>, a third scope again. Each bar is a band of accounts by how
much of <em>their own</em> cap they have used, so a guest at 4 of 5 scans and a pro at 800 of 1,000 sit in the same
band — which is the point. Hover a bar for who; click for their exact numbers.</p>
<p class="note">Only accounts that have used the feature at all are plotted. Across this shared project there are
${fmt(tcgAccounts.total)} auth accounts, ${fmt(tcgAccounts.guests)} of them anonymous guest sessions and
${fmt(tcgAccounts.excluded)} excluded as ours, bot, seeded or QA — the great majority of them have never touched
these features, and an empty account is not a utilisation story.
${capExcluded ? `${fmt(capExcluded)} usage rows from excluded accounts are not drawn.` : ""}</p>
${keys.map((k) => capChart(k, capBlocks[k])).join("\n")}
</div>`;

const michiPanel = capPanel("m", "Michi-Maker", ["binders", "pagesPerBinder", "artUploads", "includedPrintsPerMonth"]);
const tcgPanel = capPanel("t", "TCGScan", ["cardScansPerMonth", "collections", "cardsPerCollection"]);

const legend = `<div class="legend">
<span class="chip"><span class="sw band-b1"></span>1–25%</span>
<span class="chip"><span class="sw band-b2"></span>25–50%</span>
<span class="chip"><span class="sw band-b3"></span>50–80%</span>
<span class="chip"><span class="sw band-b4"></span>80–99%</span>
<span class="chip"><span class="sw band-over"></span>at / over cap</span>
<span class="chip lgnote">utilisation bands — ordinal, with the crossing state on the warning colour</span>
</div>`;

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Economy — points, pickles and tier caps</title>
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
main{max-width:1000px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:26px 0 6px}
h3{font-size:13.5px;margin:0} h3.sec{font-size:14px;margin:22px 0 4px} h4{font-size:13px;margin:0}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.note{color:var(--muted);font-size:12.5px;margin:8px 0}
.warnbox{border-left:3px solid var(--warn);padding-left:10px;color:var(--ink-2)}
.tabbar{display:flex;gap:6px;margin:14px 0 4px;flex-wrap:wrap}
.appbtn{font:inherit;font-size:13.5px;padding:5px 16px;border-radius:20px;cursor:pointer;
  background:var(--surface);color:var(--ink-2);border:1px solid var(--border)}
.appbtn[aria-selected="true"]{background:var(--bar);color:#fff;border-color:var(--bar);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:10px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.tile .k{font-size:12px;color:var(--ink-2)}
.tile .value{font-size:28px;font-weight:650}
.tile .value.zero{color:var(--muted)}
.tile .sub{color:var(--muted);font-size:12px}
.pill{display:inline-block;font-size:10px;padding:1px 6px;border-radius:20px;border:1px solid var(--border);color:var(--muted);vertical-align:1px}
.panel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:12px 0}
.phead{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}
.scale{font-size:11px;color:var(--muted)}
.plot{display:flex;position:relative;overflow:hidden;margin-top:8px}
.ygrid{position:relative;width:34px;flex:none;height:${BAR_H + 40}px}
.ygrid .gl{position:absolute;left:0;right:-9999px;border-bottom:1px solid var(--border);z-index:0;pointer-events:none}
.ygrid .gl.base{border-bottom-color:color-mix(in srgb, var(--ink) 25%, transparent)}
.ygrid .gv{position:absolute;right:6px;top:-8px;font-size:9.5px;color:var(--muted);font-variant-numeric:tabular-nums;background:var(--surface);padding:0 2px}
.plot .chart{flex:1;position:relative;z-index:1;display:flex;align-items:flex-end;gap:4px;height:${BAR_H + 40}px;padding-top:14px}
.bcol{flex:1;min-width:0;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-end;height:100%;position:relative;gap:2px}
.bar{display:block;background:var(--bar);border-radius:4px 4px 0 0;cursor:default}
.bar[data-drill]{cursor:pointer}
.bar.zero{background:transparent;border-bottom:1px solid var(--border)}
.bar:hover,.bar:focus{outline:2px solid var(--ink);outline-offset:1px}
.band-b1{background:var(--b1)} .band-b2{background:var(--b2)} .band-b3{background:var(--b3)}
.band-b4{background:var(--b4)} .band-over{background:var(--warn)}
.bval{position:absolute;top:-2px;left:0;right:0;text-align:center;font-size:10.5px;font-weight:600;color:var(--ink-2)}
.btick{height:22px;font-size:9.5px;color:var(--muted);text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.axlab{font-size:10.5px;color:var(--muted);text-align:center;margin:0 0 4px}
.ranks{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.rank{display:grid;grid-template-columns:minmax(120px,190px) 1fr minmax(70px,auto);gap:8px;align-items:center;font-size:12.5px}
.rank[data-hov]{cursor:help;padding:1px 2px;border-radius:4px}
.rank[data-hov]:hover{background:color-mix(in srgb, var(--bar) 7%, transparent)}
.rlab{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rtrack{background:color-mix(in srgb, var(--bar) 12%, transparent);border-radius:4px;height:10px;overflow:hidden}
.rfill{display:block;height:100%;background:var(--bar);border-radius:4px}
.rval{text-align:right;font-variant-numeric:tabular-nums;color:var(--muted);font-size:11.5px}
.legend{display:flex;gap:12px;margin:12px 0 4px;font-size:12px;color:var(--ink-2);flex-wrap:wrap;align-items:center}
.legend .sw{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:5px;vertical-align:-2px;border:1px solid var(--border)}
.legend .lgnote{color:var(--muted);font-size:11px}
.drill{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:10px 0}
.dhead{display:flex;justify-content:space-between;align-items:baseline}
.dclose{font:inherit;font-size:12px;color:var(--muted);background:none;border:1px solid var(--border);border-radius:16px;padding:2px 10px;cursor:pointer}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:middle}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.meter{display:inline-block;width:110px;height:8px;border-radius:4px;background:color-mix(in srgb, var(--bar) 14%, transparent);vertical-align:middle;overflow:hidden}
.meter .fill{display:block;height:100%;border-radius:4px;background:var(--bar)}
.meter .fill.full{background:var(--warn)}
.mcell{width:170px;white-space:nowrap}
.pct{font-size:11.5px;color:var(--muted);font-variant-numeric:tabular-nums}
.warntxt{color:var(--warn)}
.empty{color:var(--muted);font-style:italic;font-size:12.5px}
code{font-family:ui-monospace,Menlo,monospace;font-size:12px}
</style>
<main>
<h1>Economy</h1>
<p class="meta">The in-app currencies and the tier caps, one tab per app. Every plot is a <strong>distribution</strong>:
a bar is a bucket of accounts, not a day. Hover (or tab to) a bar for who is in it; click it and those accounts drop
out below with their exact numbers. Every number reads a product table, so a zero means it did not happen —
<em>except</em> where the table cannot record the answer at all, which is called out where it occurs.
Our own, seeded, QA and automated accounts are excluded everywhere, with the size of that removal stated on each tab.
Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WIN, "scopes the FLOW blocks (earned / spent) by when they happened; balances and cap utilisation are point-in-time and say so")}
${tabBar}
${legend}

${dogglePanel}
${picklePanel}
${michiPanel}
${tcgPanel}
</main>
${hoverLayer(rosters, { unit: "account/accounts" })}
${windowScript(WINDOWS, DEFAULT_WIN)}
<script>
(function () {
  // App tabs: one visible panel, persisted across visits.
  function selectApp(id) {
    document.querySelectorAll('.appbtn').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.app === id)); });
    document.querySelectorAll('[data-app-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-app-panel') !== id; });
    try { localStorage.setItem('studio-economy-app', id); } catch (e) {}
  }
  document.querySelectorAll('.appbtn').forEach(function (b) {
    b.addEventListener('click', function () { selectApp(b.dataset.app); });
  });
  var saved = null;
  try { saved = localStorage.getItem('studio-economy-app'); } catch (e) {}
  if (saved && document.querySelector('[data-app-panel="' + saved + '"]')) selectApp(saved);

  // Bar drill-down: one open panel at a time within its own chart.
  function toggle(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var open = el.hidden;
    var scope = el.parentNode || document;
    scope.querySelectorAll('.drill').forEach(function (d) { d.hidden = true; });
    if (open) { el.hidden = false; el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  }
  function act(target) {
    var el = target && target.closest ? target.closest('[data-drill],.dclose') : null;
    if (!el) return false;
    if (el.hasAttribute && el.hasAttribute('data-drill')) toggle(el.getAttribute('data-drill'));
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

const f30 = out.apps.doggle.flows[30];
console.log(
  `Economy Doggle: ${fmt(dogBalSum)} points outstanding across ${dogBalRows.length} accounts · 30d earned ${fmt(f30.earned)} (${dogExcluded} excluded ledger rows)`,
);
console.log(
  `Economy Pickleague: ${fmt(pickBalSum)} pickles across ${pickBalRows.length} accounts` +
    (pickTop ? ` · top account holds ${pickTopShare.toFixed(1)}%` : "") +
    ` · ${pickGrantReal.length} grant events carry no amount`,
);
for (const [k, b] of Object.entries(capBlocks)) {
  console.log(`Economy cap ${k}: ${b.users} accounts with use, ${b.atCap} at/over cap${b.uncapped ? `, ${b.uncapped} unlimited` : ""}`);
}
console.log(`Wrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/economy.html`);
