// Reddit lane: what happens to a person who clicks a Reddit ad for michi-maker.
//
// WHY A LANE OF ITS OWN. The campaigns lane answers "which printed code brought whom"; it
// stops at arrival. The Reddit launch (2026-10-29) is a paid channel whose whole question is
// what happens AFTER arrival on a phone: did they reach the editor, place a card, open Fill
// page, meet the create-account wall, tap it, come back as an account, come back at all. Every
// step below is a row michi already writes; nothing here is inferred from a page title.
//
// THE POPULATION is a session whose landing_route or session.start carries utm_source=reddit.
// Since michi-maker 7bc1d40 the Google round trip carries the campaign across the hop, so the
// return session is tagged too and its session.start carries `from_session`, the guest session
// it continues. Before that commit the return session was untagged and on a new uid (the Sign
// in tab bug, gaps.account_created_fires_on_oauth_start), so for those days an account is
// stitched to its guest session by TIME: a non-anonymous user created within 20 s of a Reddit
// guest session's last event, whose first session landed on /auth-callback. The report says
// which stitch produced each number.
//
// CUTS. A day is a Pacific day (lib/studio). A deploy is a `deploy.live` row (michi
// scripts/record-deploy.mjs, since 2026-10-30 04:14 UTC): the report also reads the funnel per
// deploy segment, so "did the fix help" is cut on the moment Vercel went live, not on a commit.
//
// SPEND comes from marketing-studio assets/qr/spend.yaml, a ledger Brian appends from Reddit
// Ads Manager (date, spend, clicks, impressions, optional code). Cost per step is spend over
// the steps the same window produced; when the ledger has no rows in the window the cost
// columns say so instead of printing zero.
//
// Writes data/reddit.json (counts only, committed), data/reddit-roster.json (identity,
// gitignored), reports/reddit.html (gitignored) and reports/reddit.md (counts, committed).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, dayOf, isoDate, loadEnv, parseTs, readConfig, runSql, exclusionCte, tzLabel } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, ROSTER_STORE_CAP, userLabel } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const CFG = readConfig("events.json");
const PROJECT = CFG.projectRef;
const DATA_FILE = join(ROOT, "data", "reddit.json");
const ROSTER_FILE = join(ROOT, "data", "reddit-roster.json");
const HTML_FILE = join(ROOT, "reports", "reddit.html");
const MD_FILE = join(ROOT, "reports", "reddit.md");
const SPEND_PATH = join(ROOT, CFG.campaigns?.spendLedger ?? "../marketing-studio/assets/qr/spend.yaml");
const REGISTRY_PATH = join(ROOT, CFG.campaigns?.registry ?? "../marketing-studio/assets/qr/campaigns.yaml");

const SOURCE = "reddit";
const LOOKBACK_DAYS = 30;
const PHONE_MAX_W = 500; // viewport_w below this is a phone; a 7-inch tablet in portrait sits above it
const STITCH_SECONDS = 20; // pre-7bc1d40: account created this soon after the guest session ended
const ROW_CAP = 200_000;

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env - the reddit lane needs Management API access.");
  process.exit(1);
}

// ---------- registry + spend ledger (marketing-studio) ----------

// The same deliberately small YAML reader as campaigns.mjs: one top-level list of flat
// `key: value` entries. Anything else is counted as a parse miss, never skipped quietly.
function parseFlatList(text, listKey) {
  const out = [];
  let inList = false;
  let cur = null;
  const unquote = (v) => v.replace(/^["']|["']$/g, "").trim();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      if (cur) out.push(cur);
      cur = null;
      inList = new RegExp(`^${listKey}:`).test(line);
      continue;
    }
    if (!inList) continue;
    const item = line.match(/^\s*-\s*([\w-]+):\s*(.*)$/);
    if (item) {
      if (cur) out.push(cur);
      cur = {};
      cur[item[1]] = unquote(item[2]);
      continue;
    }
    const field = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (field && cur) cur[field[1]] = unquote(field[2]);
  }
  if (cur) out.push(cur);
  return out;
}

const registry = new Map(); // code -> label
if (existsSync(REGISTRY_PATH)) {
  for (const c of parseFlatList(readFileSync(REGISTRY_PATH, "utf8"), "campaigns")) {
    if (c.app === "michi-maker" && c.code) registry.set(c.code, c.label ?? c.id ?? c.code);
  }
}

const spend = { path: CFG.campaigns?.spendLedger ?? "../marketing-studio/assets/qr/spend.yaml", found: false, rows: [], declared: 0 };
if (existsSync(SPEND_PATH)) {
  const text = readFileSync(SPEND_PATH, "utf8");
  spend.found = true;
  spend.declared = (text.match(/^\s*-\s*date:/gm) ?? []).length;
  spend.rows = parseFlatList(text, "spend")
    .filter((r) => r.date && (r.source ?? SOURCE) === SOURCE)
    .map((r) => ({
      date: r.date,
      code: r.code && r.code !== "null" ? r.code : null,
      spend: Number(r.spend ?? 0),
      clicks: Number(r.clicks ?? 0),
      impressions: Number(r.impressions ?? 0),
      currency: r.currency ?? "USD",
      note: r.note ?? null,
    }));
  if (spend.declared !== spend.rows.length) {
    console.warn(`WARNING: spend.yaml declares ${spend.declared} rows but ${spend.rows.length} parsed as ${SOURCE} rows - cost columns may be short.`);
  }
} else {
  console.warn(`WARNING: no spend ledger at ${SPEND_PATH} - cost per step cannot be computed.`);
}

// ---------- fetch ----------

const excl = exclusionCte("michi-maker");
const since = `now() - interval '${LOOKBACK_DAYS} days'`;

// Reddit-tagged sessions: landing_route (first page.view backfills it) or the session.start
// props (the hop return since 7bc1d40). One row per session with who it was.
const sessionsSql = `
with ${excl},
st as (
  select session_id, props
  from public.analytics_events
  where app = 'michi' and name = 'session.start' and ts >= ${since}
)
select s.id, s.user_id, s.started_at, s.last_seen_at, s.landing_route, s.device_id,
       st.props->>'code' as p_code, st.props->>'utm_medium' as p_medium, st.props->>'utm_content' as p_content,
       st.props->>'utm_term' as p_term, st.props->>'referrer' as p_referrer,
       (st.props->>'viewport_w')::int as viewport_w, st.props->>'from_session' as from_session,
       coalesce((st.props->>'is_guest')::boolean, s.is_guest) as started_as_guest,
       coalesce(u.is_anonymous, true) as anon_now, pr.username, u.email,
       (s.user_id in (select id from excluded_users)) as excluded
from public.analytics_sessions s
left join st on st.session_id = s.id
left join auth.users u on u.id = s.user_id
left join public.profiles pr on pr.id = s.user_id
where s.app = 'michi' and s.started_at >= ${since}
  and (s.landing_route like '%utm_source=${SOURCE}%' or st.props->>'utm_source' = '${SOURCE}')
order by s.started_at
limit ${ROW_CAP}`;

// Everything those sessions did. Props are reduced to the few fields the funnel reads.
const eventsSql = `
with ${excl},
rd as (
  select s.id from public.analytics_sessions s
  left join public.analytics_events st on st.session_id = s.id and st.name = 'session.start'
  where s.app = 'michi' and s.started_at >= ${since}
    and (s.landing_route like '%utm_source=${SOURCE}%' or st.props->>'utm_source' = '${SOURCE}')
)
select e.session_id, e.user_id, e.name, e.ts,
       e.props->>'step' as step, e.props->>'via' as via, e.props->>'kind' as kind,
       e.props->>'surface' as surface, e.props->>'feature' as feature, e.props->>'source' as source,
       (e.props->>'route' like '/binder/%') as editor_route
from public.analytics_events e
join rd on rd.id = e.session_id
where e.ts >= ${since}
order by e.ts
limit ${ROW_CAP}`;

// Accounts that a Reddit guest became, pre-7bc1d40 stitch: created within STITCH_SECONDS after
// a Reddit guest session's last event, first session landing on the auth callback.
const stitchSql = `
with ${excl},
rd as (
  select s.id, s.user_id, s.last_seen_at from public.analytics_sessions s
  left join public.analytics_events st on st.session_id = s.id and st.name = 'session.start'
  join auth.users g on g.id = s.user_id
  where s.app = 'michi' and s.started_at >= ${since} and g.is_anonymous
    and (s.landing_route like '%utm_source=${SOURCE}%' or st.props->>'utm_source' = '${SOURCE}')
)
select rd.id as guest_session, rd.user_id as guest_uid, u.id as account_uid, u.created_at,
       extract(epoch from (u.created_at - rd.last_seen_at)) as gap_s, pr.username, u.email,
       (u.id in (select id from excluded_users)) as excluded
from rd
join auth.users u on u.is_anonymous = false
  and u.created_at between rd.last_seen_at - interval '5 seconds' and rd.last_seen_at + interval '${STITCH_SECONDS} seconds'
left join public.profiles pr on pr.id = u.id
where exists (select 1 from public.analytics_sessions f where f.user_id = u.id
              and f.started_at between u.created_at - interval '5 seconds' and u.created_at + interval '60 seconds'
              and (f.landing_route like '/auth-callback%' or f.landing_route like '/?code=%'))
order by u.created_at`;

// Later sessions by anyone the lane knows (guest uid or account uid): the return signal.
const returnsSql = `
with rd as (
  select distinct s.user_id from public.analytics_sessions s
  left join public.analytics_events st on st.session_id = s.id and st.name = 'session.start'
  where s.app = 'michi' and s.started_at >= ${since}
    and (s.landing_route like '%utm_source=${SOURCE}%' or st.props->>'utm_source' = '${SOURCE}')
)
select s.user_id, s.id, s.started_at, s.landing_route
from public.analytics_sessions s join rd on rd.user_id = s.user_id
where s.app = 'michi' and s.started_at >= ${since}
order by s.started_at
limit ${ROW_CAP}`;

// Public binders by those people, from the table (ground truth beats binder.public).
const publicSql = `
with rd as (
  select distinct s.user_id from public.analytics_sessions s
  left join public.analytics_events st on st.session_id = s.id and st.name = 'session.start'
  where s.app = 'michi' and s.started_at >= ${since}
    and (s.landing_route like '%utm_source=${SOURCE}%' or st.props->>'utm_source' = '${SOURCE}')
)
select b.owner_id, b.id, b.created_at, b.is_public, b.cap_exempt
from public.binders b join rd on rd.user_id = b.owner_id
where b.created_at >= ${since}`;

const deploysSql = `
select ts, props->>'short' as short, props->>'commit' as commit
from public.analytics_events where app = 'michi' and name = 'deploy.live' and ts >= ${since}
order by ts`;

const [sessions, events, stitches, returns, publics, deploys] = await Promise.all([
  runSql(PROJECT, sessionsSql),
  runSql(PROJECT, eventsSql),
  runSql(PROJECT, stitchSql),
  runSql(PROJECT, returnsSql),
  runSql(PROJECT, publicSql),
  runSql(PROJECT, deploysSql),
]);

const collectedAt = new Date().toISOString();
const NOW = Date.now();
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WINDOW = 7;
const inWin = (ts, w) => w === ALL_WINDOW || parseTs(ts).getTime() >= NOW - Number(w) * 86400_000;

// ---------- identity (rosters only; never in the counts file) ----------

const identity = new Map();
const remember = (id, u) => {
  if (!id || identity.has(id)) return;
  identity.set(id, { id, username: u.username || null, email: u.email, anon: !!u.anon });
};
for (const s of sessions) remember(s.user_id, { username: s.username, email: s.email, anon: s.anon_now });
for (const st of stitches) remember(st.account_uid, { username: st.username, email: st.email, anon: false });
const label = (id) => userLabel(identity.get(id) ?? { id, anon: true });
const roster = (ids) => {
  const names = [...new Set(ids.filter(Boolean))].map(label).sort((a, b) => a.localeCompare(b));
  return { total: names.length, names: names.slice(0, ROSTER_STORE_CAP) };
};

// ---------- per-session facts ----------

const CODE_RE = /[?&]code=([a-z0-9_]{1,64})(?:&|$)/i;
const VERIFY_PREFIXES = CFG.campaigns?.verificationPrefixes ?? ["test_"];
const isVerification = (code) => !!code && VERIFY_PREFIXES.some((p) => code.startsWith(p));
let verificationSessions = 0;
const PARAM = (route, k) => {
  const m = String(route ?? "").match(new RegExp(`[?&]${k}=([^&]*)`));
  return m ? decodeURIComponent(m[1]) : null;
};

const bySession = new Map();
for (const s of sessions) {
  if (s.excluded) continue;
  const code = s.p_code ?? (String(s.landing_route ?? "").match(CODE_RE)?.[1] ?? null);
  if (isVerification(code)) {
    verificationSessions++; // Brian's own test links (test_*): counted here, never in the funnel
    continue;
  }
  bySession.set(s.id, {
    id: s.id,
    uid: s.user_id,
    startedAt: s.started_at,
    lastSeenAt: s.last_seen_at,
    day: dayOf(s.started_at),
    code,
    medium: s.p_medium ?? PARAM(s.landing_route, "utm_medium"),
    content: s.p_content ?? PARAM(s.landing_route, "utm_content"),
    term: s.p_term ?? PARAM(s.landing_route, "utm_term"),
    viewportW: s.viewport_w ?? null,
    fromSession: s.from_session ?? null,
    guest: !!s.started_as_guest,
    secs: Math.max(0, (parseTs(s.last_seen_at) - parseTs(s.started_at)) / 1000),
    views: 0,
    editor: false,
    ring: false,
    browser: false,
    placed: false,
    cardAdd: 0,
    fillOpen: false,
    wallSeen: false,
    shelfNote: false,
    wallClick: false,
    oauthStart: false,
    accountHere: false,
    dismissed: false,
    searches: 0,
    searchKinds: new Map(),
    noResults: 0,
    taste: false,
    capGate: false,
    proOffer: false,
    lastEvent: null,
  });
}
const excludedSessions = sessions.filter((s) => s.excluded).length;

for (const e of events) {
  const s = bySession.get(e.session_id);
  if (!s) continue;
  s.lastEvent = e.name;
  switch (e.name) {
    case "page.view":
      s.views++;
      if (e.editor_route) s.editor = true;
      break;
    case "walkthrough.shown":
      s.ring = true;
      break;
    case "walkthrough.step":
      if (e.step === "ring") s.ring = true;
      if (e.step === "card") s.browser = true;
      if (e.step === "placed") s.placed = true;
      break;
    case "walkthrough.done":
      if (e.via === "dismissed") s.dismissed = true;
      break;
    case "card.add":
      s.cardAdd++;
      s.placed = true;
      break;
    case "autofill.open":
      s.fillOpen = true;
      break;
    case "signin.perk_shown":
      // The My Binders shelf note (binder_cap) appears for every Reddit guest one second in,
      // because the auto-made binder puts a guest at 1 of 1 binders; nobody is stopped by it.
      // It is counted apart so the "wall" step means a wall that stood between a tap and a
      // feature (Fill page, Complete, labels, print, cap gate dialog).
      if (e.surface === "binder_cap") s.shelfNote = true;
      else s.wallSeen = true;
      break;
    case "signin.perk_click":
      s.wallClick = true;
      break;
    case "auth.oauth_start":
      s.oauthStart = true;
      break;
    case "account.created":
      s.accountHere = true;
      break;
    case "card.search":
      s.searches++;
      s.searchKinds.set(e.kind ?? "text", (s.searchKinds.get(e.kind ?? "text") ?? 0) + 1);
      break;
    case "search.no_results":
      s.noResults++;
      break;
    case "taste.used":
      s.taste = true;
      break;
    case "cap.gate_shown":
      s.capGate = true;
      break;
    case "pro.offer_shown":
      s.proOffer = true;
      break;
    default:
      break;
  }
}

// ---------- stitching: which Reddit session became an account ----------
//
// Two stitches, reported apart. `hop`: the return session's from_session names the guest
// session (7bc1d40+), and account.created fired in that return session, or the uid itself is no
// longer anonymous (the Create tab linked onto it). `time`: the pre-fix heuristic.
const accountOf = new Map(); // guest session id -> { uid, how }
for (const s of bySession.values()) {
  if (s.fromSession && bySession.has(s.fromSession) && (s.accountHere || !identity.get(s.uid)?.anon)) {
    accountOf.set(s.fromSession, { uid: s.uid, how: "hop" });
  }
  // Same-uid upgrade inside the session (email/password, or the Create tab link after 56e656f).
  if (s.accountHere && identity.get(s.uid) && !identity.get(s.uid).anon && !accountOf.has(s.id)) {
    accountOf.set(s.id, { uid: s.uid, how: "same_uid" });
  }
}
for (const st of stitches) {
  if (st.excluded) continue;
  if (!accountOf.has(st.guest_session) && bySession.has(st.guest_session)) {
    accountOf.set(st.guest_session, { uid: st.account_uid, how: "time" });
  }
}

// Returns: a later session by the same uid (guest or account) on a LATER Pacific day.
const sessionsByUid = new Map();
for (const r of returns) {
  if (!sessionsByUid.has(r.user_id)) sessionsByUid.set(r.user_id, []);
  sessionsByUid.get(r.user_id).push(r);
}
const returned = (s) => {
  const uid = accountOf.get(s.id)?.uid ?? s.uid;
  const later = [...(sessionsByUid.get(s.uid) ?? []), ...(uid !== s.uid ? sessionsByUid.get(uid) ?? [] : [])];
  return later.some((r) => r.id !== s.id && dayOf(r.started_at) > s.day);
};

const publicByUid = new Map();
for (const b of publics) {
  if (!b.is_public) continue;
  if (!publicByUid.has(b.owner_id)) publicByUid.set(b.owner_id, 0);
  publicByUid.set(b.owner_id, publicByUid.get(b.owner_id) + 1);
}
const madePublic = (s) => {
  const uid = accountOf.get(s.id)?.uid ?? s.uid;
  return (publicByUid.get(s.uid) ?? 0) + (uid !== s.uid ? publicByUid.get(uid) ?? 0 : 0) > 0;
};

// Return sessions themselves are not arrivals twice: a Reddit guest who comes back through a
// bookmark is a return, and one who clicks the ad again is a second arrival. Both stay in the
// population; the return-rate asks the question per arrival, so nothing is double-counted.

// ---------- the funnel ----------

const STEPS = [
  ["arrived", "Arrived from Reddit", (s) => true],
  ["editor", "Reached the binder editor", (s) => s.editor],
  ["ring", "Saw the first pocket ring", (s) => s.ring],
  ["browser", "Opened the card browser", (s) => s.browser || s.searches > 0 || s.cardAdd > 0],
  ["placed", "Placed a card", (s) => s.placed],
  ["taste", "Took the guest taste (Find similar)", (s) => s.taste],
  ["fill", "Opened Fill page", (s) => s.fillOpen],
  ["wall", "Met the create-account wall", (s) => s.wallSeen],
  ["tap", "Tapped Create account", (s) => s.wallClick || s.oauthStart],
  ["account", "Became an account", (s) => accountOf.has(s.id) || (s.accountHere && !identity.get(s.uid)?.anon)],
  ["public", "Made a binder public", (s) => madePublic(s)],
];

const STEP_AT = Object.fromEntries(STEPS.map(([id], i) => [id, i]));
const at = (f, id) => f[STEP_AT[id]].sessions;

const isPhone = (s) => s.viewportW != null && s.viewportW < PHONE_MAX_W;
const isDesktop = (s) => s.viewportW != null && s.viewportW >= PHONE_MAX_W;

function funnelOver(list) {
  return STEPS.map(([id, lbl, test]) => {
    const hits = list.filter(test);
    return { id, label: lbl, sessions: hits.length, _ids: hits.map((s) => accountOf.get(s.id)?.uid ?? s.uid) };
  });
}
const median = (xs) => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
const summarize = (list) => {
  const f = funnelOver(list);
  const secs = list.map((s) => s.secs);
  return {
    sessions: list.length,
    phone: list.filter(isPhone).length,
    desktop: list.filter(isDesktop).length,
    unknownDevice: list.filter((s) => s.viewportW == null).length,
    bounced: list.filter((s) => s.views <= 1 && s.secs < 10).length,
    medianSecs: median(secs),
    p90Secs: secs.length ? [...secs].sort((a, b) => a - b)[Math.floor(secs.length * 0.9)] : null,
    returned: list.filter(returned).length,
    dismissed: list.filter((s) => s.dismissed).length,
    shelfNotes: list.filter((s) => s.shelfNote).length,
    tasted: list.filter((s) => s.taste).length,
    capGates: list.filter((s) => s.capGate).length,
    proOffers: list.filter((s) => s.proOffer).length,
    funnel: f,
  };
};

// ---------- windows ----------

const out = {
  collectedAt,
  dayTz: tzLabel(),
  source: SOURCE,
  lookbackDays: LOOKBACK_DAYS,
  phoneMaxWidth: PHONE_MAX_W,
  windows: WINDOWS,
  defaultWindow: DEFAULT_WINDOW,
  spend: { found: spend.found, path: spend.path, rows: spend.rows.length, declared: spend.declared },
  deploys: deploys.map((d) => ({ ts: d.ts, short: d.short })),
  verificationSessions,
  byWindow: {},
};
const rosters = {};
const all = [...bySession.values()];

for (const w of WINDOWS) {
  const list = all.filter((s) => inWin(s.startedAt, w));
  const sum = summarize(list);
  for (const st of sum.funnel) {
    rosters[`f|${w}|${st.id}`] = roster(st._ids);
    delete st._ids;
  }
  rosters[`t|${w}|returned`] = roster(list.filter(returned).map((s) => accountOf.get(s.id)?.uid ?? s.uid));
  rosters[`t|${w}|accounts`] = roster(list.filter((s) => accountOf.has(s.id)).map((s) => accountOf.get(s.id).uid));
  rosters[`t|${w}|phone`] = roster(list.filter(isPhone).map((s) => s.uid));
  rosters[`t|${w}|bounced`] = roster(list.filter((s) => s.views <= 1 && s.secs < 10).map((s) => s.uid));

  // Device split of the whole funnel.
  const phoneF = funnelOver(list.filter(isPhone));
  const deskF = funnelOver(list.filter(isDesktop));
  for (const st of phoneF) {
    rosters[`p|${w}|${st.id}`] = roster(st._ids);
    delete st._ids;
  }
  for (const st of deskF) {
    rosters[`d|${w}|${st.id}`] = roster(st._ids);
    delete st._ids;
  }

  // Per creative (code), with cost when the ledger has it.
  const codes = new Map();
  for (const s of list) {
    const k = s.code ?? "(no code)";
    if (!codes.has(k)) codes.set(k, []);
    codes.get(k).push(s);
  }
  const ledger = spend.rows.filter((r) => w === ALL_WINDOW || Date.parse(`${r.date}T12:00:00Z`) >= NOW - Number(w) * 86400_000);
  const spendFor = (code) => ledger.filter((r) => r.code === code).reduce((a, r) => a + r.spend, 0);
  const clicksFor = (code) => ledger.filter((r) => r.code === code).reduce((a, r) => a + r.clicks, 0);
  const totalSpend = ledger.reduce((a, r) => a + r.spend, 0);
  const totalClicks = ledger.reduce((a, r) => a + r.clicks, 0);
  const totalImpr = ledger.reduce((a, r) => a + r.impressions, 0);
  const perCode = [...codes.entries()]
    .map(([code, ss]) => {
      const f = funnelOver(ss);
      for (const st of f) {
        rosters[`c|${w}|${code}|${st.id}`] = roster(st._ids);
        delete st._ids;
      }
      const sp = spendFor(code);
      return {
        code,
        label: registry.get(code) ?? null,
        registered: registry.has(code),
        medium: ss[0].medium ?? null,
        sessions: ss.length,
        phone: ss.filter(isPhone).length,
        editor: at(f, "editor"),
        placed: at(f, "placed"),
        taste: at(f, "taste"),
        fill: at(f, "fill"),
        wall: at(f, "wall"),
        tap: at(f, "tap"),
        accounts: at(f, "account"),
        public: at(f, "public"),
        returned: ss.filter(returned).length,
        medianSecs: median(ss.map((s) => s.secs)),
        spend: sp || null,
        clicks: clicksFor(code) || null,
      };
    })
    .sort((a, b) => b.sessions - a.sessions);

  // Audience and ad (utm_content / utm_term), once the links carry them.
  const dims = (key) => {
    const m = new Map();
    for (const s of list) {
      const k = s[key];
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    }
    return [...m.entries()]
      .map(([k, ss]) => {
        const f = funnelOver(ss);
        for (const st of f) {
          rosters[`${key}|${w}|${k}|${st.id}`] = roster(st._ids);
          delete st._ids;
        }
        return { value: k, sessions: ss.length, editor: at(f, "editor"), placed: at(f, "placed"), accounts: at(f, "account") };
      })
      .sort((a, b) => b.sessions - a.sessions);
  };

  // Per Pacific day.
  const days = new Map();
  for (const s of list) {
    if (!days.has(s.day)) days.set(s.day, []);
    days.get(s.day).push(s);
  }
  const daily = [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, ss]) => {
      const f = funnelOver(ss);
      rosters[`day|${w}|${day}`] = roster(ss.map((s) => s.uid));
      rosters[`dayacc|${w}|${day}`] = roster(f[STEP_AT.account]._ids);
      for (const st of f) delete st._ids;
      const sp = spend.rows.filter((r) => r.date === day && !r.code).reduce((a, r) => a + r.spend, 0) + spend.rows.filter((r) => r.date === day && r.code).reduce((a, r) => a + r.spend, 0);
      return {
        day,
        sessions: ss.length,
        phone: ss.filter(isPhone).length,
        editor: at(f, "editor"),
        placed: at(f, "placed"),
        taste: at(f, "taste"),
        fill: at(f, "fill"),
        wall: at(f, "wall"),
        accounts: at(f, "account"),
        returned: ss.filter(returned).length,
        medianSecs: median(ss.map((s) => s.secs)),
        spend: sp || null,
      };
    });

  // Per deploy segment: from each deploy.live row to the next. Sessions before the first marker
  // in the window form a "before" segment, which is honest about the days with no marker.
  const marks = deploys.filter((d) => inWin(d.ts, w) || w === ALL_WINDOW).map((d) => ({ at: parseTs(d.ts).getTime(), short: d.short }));
  const segments = [];
  const bounds = [-Infinity, ...marks.map((m) => m.at), Infinity];
  for (let i = 0; i < bounds.length - 1; i++) {
    const ss = list.filter((s) => {
      const t = parseTs(s.startedAt).getTime();
      return t >= bounds[i] && t < bounds[i + 1];
    });
    if (!ss.length && i === 0) continue;
    const f = funnelOver(ss);
    const segId = i === 0 ? "before" : marks[i - 1].short;
    for (const st of f) {
      rosters[`seg|${w}|${segId}|${st.id}`] = roster(st._ids);
      delete st._ids;
    }
    segments.push({
      id: segId,
      from: i === 0 ? null : new Date(bounds[i]).toISOString(),
      to: bounds[i + 1] === Infinity ? null : new Date(bounds[i + 1]).toISOString(),
      sessions: ss.length,
      phone: ss.filter(isPhone).length,
      editor: at(f, "editor"),
      placed: at(f, "placed"),
      taste: at(f, "taste"),
      fill: at(f, "fill"),
      wall: at(f, "wall"),
      tap: at(f, "tap"),
      accounts: at(f, "account"),
      returned: ss.filter(returned).length,
      medianSecs: median(ss.map((s) => s.secs)),
    });
  }

  // Search: kinds and dead ends. The main search box's typed text is not recorded (see
  // gaps.tcgscan_search_blind), so this is kinds and no-results, never queries.
  const kinds = new Map();
  for (const s of list) for (const [k, n] of s.searchKinds) kinds.set(k, (kinds.get(k) ?? 0) + n);
  const search = {
    sessionsSearching: list.filter((s) => s.searches > 0).length,
    searches: list.reduce((a, s) => a + s.searches, 0),
    noResults: list.reduce((a, s) => a + s.noResults, 0),
    sessionsWithNoResults: list.filter((s) => s.noResults > 0).length,
    kinds: [...kinds.entries()].map(([kind, n]) => ({ kind, n })).sort((a, b) => b.n - a.n),
  };
  rosters[`t|${w}|searching`] = roster(list.filter((s) => s.searches > 0).map((s) => s.uid));
  rosters[`t|${w}|noresults`] = roster(list.filter((s) => s.noResults > 0).map((s) => s.uid));

  // Where sessions ended: the last event name, for the ones that never placed a card.
  const ends = new Map();
  for (const s of list.filter((s) => !s.placed)) {
    const k = s.lastEvent ?? "(no event)";
    ends.set(k, (ends.get(k) ?? 0) + 1);
  }
  const stalls = [...ends.entries()].map(([event, n]) => ({ event, n })).sort((a, b) => b.n - a.n).slice(0, 8);

  // Stitch mix, so the account number says how it was produced.
  const stitch = { hop: 0, same_uid: 0, time: 0 };
  for (const s of list) {
    const a = accountOf.get(s.id);
    if (a) stitch[a.how]++;
  }

  const cost = totalSpend
    ? {
        spend: totalSpend,
        clicks: totalClicks || null,
        impressions: totalImpr || null,
        ledgerRows: ledger.length,
        perArrival: sum.sessions ? totalSpend / sum.sessions : null,
        perEditor: at(sum.funnel, "editor") ? totalSpend / at(sum.funnel, "editor") : null,
        perPlaced: at(sum.funnel, "placed") ? totalSpend / at(sum.funnel, "placed") : null,
        perAccount: at(sum.funnel, "account") ? totalSpend / at(sum.funnel, "account") : null,
        perReturn: sum.returned ? totalSpend / sum.returned : null,
      }
    : { spend: 0, ledgerRows: ledger.length };

  out.byWindow[w] = {
    ...sum,
    stitch,
    cost,
    perCode,
    audiences: dims("content"),
    ads: dims("term"),
    daily,
    segments,
    search,
    stalls,
    phoneFunnel: phoneF.map(({ id, sessions }) => ({ id, sessions })),
    desktopFunnel: deskF.map(({ id, sessions }) => ({ id, sessions })),
    excludedSessions: sessions.filter((s) => s.excluded && inWin(s.started_at, w)).length,
  };
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => (v == null ? "<span class=\"na\">n/a</span>" : String(v));
const secs = (v) => (v == null ? "n/a" : v >= 90 ? `${Math.round(v / 60)} min` : `${Math.round(v)} s`);
const usd = (v) => (v == null ? "<span class=\"na\">no spend rows</span>" : `$${v.toFixed(2)}`);
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "");
const hov = (...parts) => hoverAttr(...parts);
const ptTime = (iso) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

const DAY_MAX = Math.max(1, ...WINDOWS.flatMap((w) => out.byWindow[w].daily.map((d) => d.sessions)));
const axisTicks = (max) => (max <= 1 ? [0, 1] : [0, Math.round(max / 2), max]);

function dailyChart(w, daily) {
  if (!daily.length) return `<p class="empty">No Reddit arrivals in this window.</p>`;
  const days = daily.length;
  const width = 640;
  const height = 170;
  const padL = 34;
  const padB = 28;
  const plotW = width - padL - 8;
  const plotH = height - padB - 12;
  const slot = plotW / days;
  const bw = Math.max(3, Math.min(28, slot * 0.6));
  const y = (v) => 12 + plotH - (v / DAY_MAX) * plotH;
  const every = days <= 7 ? 1 : days <= 14 ? 2 : 7;
  const grid = axisTicks(DAY_MAX)
    .map((v) => `<line x1="${padL}" y1="${y(v)}" x2="${width - 8}" y2="${y(v)}" class="grid"/><text x="${padL - 6}" y="${y(v) + 4}" class="atick" text-anchor="end">${v}</text>`)
    .join("");
  const cols = daily
    .map((d, i) => {
      const cx = padL + (i + 0.5) * slot;
      const h = d.sessions ? Math.max(2, (d.sessions / DAY_MAX) * plotH) : 0;
      const ha = d.accounts ? Math.max(2, (d.accounts / DAY_MAX) * plotH) : 0;
      const labelled = (days - 1 - i) % every === 0;
      const val = d.sessions && (days <= 14 || d.sessions === DAY_MAX) ? `<text x="${cx}" y="${y(d.sessions) - 4}" class="bval" text-anchor="middle">${d.sessions}</text>` : "";
      return `${h ? `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y(d.sessions).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="bar-a" ${hov("day", "{scope}", d.day)} tabindex="0"/>` : ""}${
        ha ? `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y(d.accounts).toFixed(1)}" width="${bw.toFixed(1)}" height="${ha.toFixed(1)}" rx="2" class="bar-b" ${hov("dayacc", "{scope}", d.day)} tabindex="0"/>` : ""
      }${val}${labelled ? `<text x="${cx}" y="${height - 8}" class="atick" text-anchor="middle">${d.day.slice(5)}</text>` : ""}`;
    })
    .join("");
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Reddit arrivals and accounts per day">
<title>Reddit arrivals and accounts per day</title>${grid}${cols}</svg>
<figcaption><span class="sw a"></span> arrivals <span class="sw b"></span> became an account (y: sessions, x: ${esc(out.dayTz)} day; one scale across windows)</figcaption></figure>`;
}

function funnelTable(prefix, w, funnel, idsFor) {
  const top = funnel[0].sessions;
  return `<div class="funnel"><table class="ftab">${funnel
    .map((s, i) => {
      const width = top ? Math.max(s.sessions ? 2 : 0, (s.sessions / top) * 100) : 0;
      const conv = i ? pct(s.sessions, top) : "";
      return `<tr ${hov(prefix, "{scope}", ...(idsFor ? idsFor(s) : [s.id]))}><td class="fl">${esc(s.label ?? s.id)}</td><td class="fb"><span class="bar" style="width:${width.toFixed(1)}%"></span></td><td class="fn">${s.sessions}</td><td class="fd">${conv}</td></tr>`;
    })
    .join("")}</table></div>`;
}

const blocks = WINDOWS.map((w) => {
  const d = out.byWindow[w];
  const f = d.funnel;
  const tiles = [
    ["Arrivals", d.sessions, `${d.phone} on a phone, ${d.desktop} desktop, ${d.unknownDevice} unknown`, "f", "arrived"],
    ["Placed a card", at(f, "placed"), pct(at(f, "placed"), d.sessions) + " of arrivals", "f", "placed"],
    ["Became an account", at(f, "account"), `${d.stitch.hop + d.stitch.same_uid} by the hop, ${d.stitch.time} stitched by time`, "f", "account"],
    ["Came back a later day", d.returned, pct(d.returned, d.sessions) + " of arrivals, guests included", "t", "returned"],
    ["Bounced", d.bounced, "one page, under 10 seconds", "t", "bounced"],
    ["Median stay", secs(d.medianSecs), `p90 ${secs(d.p90Secs)}`, null, null],
  ]
    .map(
      ([k, v, sub, pre, rk]) =>
        `<div class="tile" ${pre ? hov(pre, "{scope}", rk) : ""}><div class="k">${esc(k)}</div><div class="value${v === 0 ? " zero" : ""}">${v}</div><div class="sub">${esc(sub)}</div></div>`,
    )
    .join("");

  const c = d.cost;
  const costRows = c.spend
    ? `<table class="tbl cost"><thead><tr><th>Spend</th><th>Clicks (Reddit)</th><th>Arrivals (site)</th><th>Per arrival</th><th>Per editor</th><th>Per first card</th><th>Per account</th><th>Per return</th></tr></thead>
<tbody><tr><td>${usd(c.spend)}</td><td>${n(c.clicks)}</td><td>${d.sessions}</td><td>${usd(c.perArrival)}</td><td>${usd(c.perEditor)}</td><td>${usd(c.perPlaced)}</td><td>${usd(c.perAccount)}</td><td>${usd(c.perReturn)}</td></tr></tbody></table>
<p class="note">${c.ledgerRows} ledger row${c.ledgerRows === 1 ? "" : "s"} in this window from <code>${esc(spend.path)}</code>. Clicks are Reddit's count; arrivals are sessions the site saw. Per-step cost divides the window's spend by the window's step count, so a day of spend whose visitors act tomorrow lands on the wrong side of a 24h cut; read 7d and up for cost.</p>`
    : `<p class="note">No spend rows for this window in <code>${esc(spend.path)}</code>${spend.found ? "" : " (file not found)"}. Add a row per day from Reddit Ads Manager and the cost per step appears here.</p>`;

  const codeRows = d.perCode.length
    ? d.perCode
        .map(
          (r) =>
            `<tr ${hov("c", "{scope}", r.code, "arrived")}><td><code>${esc(r.code)}</code>${r.label ? `<div class="sub">${esc(r.label)}</div>` : r.registered ? "" : '<div class="sub warn">not in the registry</div>'}</td><td class="num">${r.sessions}</td><td class="num">${r.phone}</td><td class="num">${r.editor}</td><td class="num">${r.placed}</td><td class="num">${r.taste}</td><td class="num">${r.fill}</td><td class="num">${r.wall}</td><td class="num">${r.tap}</td><td class="num" ${hov("c", "{scope}", r.code, "account")}>${r.accounts}</td><td class="num">${r.public}</td><td class="num">${r.returned}</td><td class="num">${secs(r.medianSecs)}</td><td class="num">${r.spend == null ? '<span class="na">-</span>' : usd(r.spend)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="14" class="empty">No arrivals.</td></tr>`;

  const dimTable = (title, rows, key, hint) =>
    rows.length
      ? `<h3>${esc(title)}</h3><table class="tbl"><thead><tr><th>${esc(title)}</th><th class="num">Arrivals</th><th class="num">Editor</th><th class="num">Placed</th><th class="num">Accounts</th></tr></thead><tbody>${rows
          .map((r) => `<tr ${hov(key, "{scope}", r.value, "arrived")}><td>${esc(r.value)}</td><td class="num">${r.sessions}</td><td class="num">${r.editor}</td><td class="num">${r.placed}</td><td class="num">${r.accounts}</td></tr>`)
          .join("")}</tbody></table>`
      : `<h3>${esc(title)}</h3><p class="note">${esc(hint)}</p>`;

  const segRows = d.segments.length
    ? d.segments
        .map(
          (s) =>
            `<tr ${hov("seg", "{scope}", s.id, "arrived")}><td>${s.id === "before" ? "before the first marker" : `<code>${esc(s.id)}</code>`}<div class="sub">${s.from ? ptTime(s.from) : "window start"} to ${s.to ? ptTime(s.to) : "now"}</div></td><td class="num">${s.sessions}</td><td class="num">${s.phone}</td><td class="num">${s.editor}</td><td class="num">${s.placed}</td><td class="num">${s.taste}</td><td class="num">${s.fill}</td><td class="num">${s.wall}</td><td class="num">${s.tap}</td><td class="num" ${hov("seg", "{scope}", s.id, "account")}>${s.accounts}</td><td class="num">${s.returned}</td><td class="num">${secs(s.medianSecs)}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="12" class="empty">No arrivals.</td></tr>`;

  const dayRows = d.daily.length
    ? [...d.daily]
        .reverse()
        .map(
          (r) =>
            `<tr ${hov("day", "{scope}", r.day)}><td>${esc(r.day)}</td><td class="num">${r.sessions}</td><td class="num">${r.phone}</td><td class="num">${r.editor}</td><td class="num">${r.placed}</td><td class="num">${r.taste}</td><td class="num">${r.fill}</td><td class="num">${r.wall}</td><td class="num" ${hov("dayacc", "{scope}", r.day)}>${r.accounts}</td><td class="num">${r.returned}</td><td class="num">${secs(r.medianSecs)}</td><td class="num">${r.spend == null ? '<span class="na">-</span>' : usd(r.spend)}</td></tr>`,
        )
        .join("")
    : "";

  const stallRows = d.stalls.map((s) => `<tr><td><code>${esc(s.event)}</code></td><td class="num">${s.n}</td></tr>`).join("");
  const kindRows = d.search.kinds.map((k) => `<tr><td>${esc(k.kind)}</td><td class="num">${k.n}</td></tr>`).join("");

  return `<div data-w="${w}"${w === DEFAULT_WINDOW ? "" : " hidden"}>
<div class="tiles">${tiles}</div>
<p class="note">Excluded from everything above: <strong>${d.excludedSessions}</strong> Reddit-tagged session${d.excludedSessions === 1 ? "" : "s"} from our own or QA accounts, and ${verificationSessions} test-link session${verificationSessions === 1 ? "" : "s"} (codes starting ${esc(VERIFY_PREFIXES.join(", "))}) across the lookback.
Device is read from <code>viewport_w</code> on <code>session.start</code> (michi 6d01a53, live 2026-10-29 evening); sessions before that carry no width and count as unknown. Phone means narrower than ${PHONE_MAX_W}px.</p>

<h2>Cost per step</h2>
${costRows}

<h2>The funnel</h2>
${funnelTable("f", w, f)}
<p class="note">Each row is sessions that reached that step; the right column is its share of arrivals. The steps are not nested: the wall is met on more surfaces than Fill page, and an account can follow a wall that was never shown in this session. "Became an account" counts the hop return (<code>from_session</code>, michi 7bc1d40), a same-id upgrade in the session, and for days before the fix a non-anonymous user created within ${STITCH_SECONDS} s of the guest session's end whose first page was the sign-in return. The tile above says how many came from each.
"Took the guest taste" is a guest's one Find similar (michi 2ae2814; before that deploy guests had none, so the row reads zero). Fill page and the wall are visible only since michi 6d01a53: a zero on those rows before 2026-10-29 evening is blindness, not behaviour.
The My Binders shelf note ("you are at your binder limit, create a free account"), shown to <strong>${d.shelfNotes}</strong> session${d.shelfNotes === 1 ? "" : "s"} about one second in because the auto-made binder filled a guest's one-binder cap (removed on arrival in michi b77e3bc, 2026-10-30 08:05 UTC), is NOT counted as a wall: nothing it guards was tapped.</p>

<div class="cols">
<div><h3>Phone</h3>${funnelTable("p", w, d.phoneFunnel.map((s, i) => ({ ...s, label: STEPS[i][1] })))}</div>
<div><h3>Desktop</h3>${funnelTable("d", w, d.desktopFunnel.map((s, i) => ({ ...s, label: STEPS[i][1] })))}</div>
</div>
<p class="note">Phone ${d.phone} + desktop ${d.desktop} + unknown ${d.unknownDevice} = ${d.sessions}. The two columns cover only sessions that recorded a viewport (since 2026-10-29 evening); the other ${d.unknownDevice} are in neither, including ${at(f, "account") - d.phoneFunnel[STEP_AT.account].sessions - d.desktopFunnel[STEP_AT.account].sessions} of the ${at(f, "account")} account${at(f, "account") === 1 ? "" : "s"}.</p>

<h2>Per day</h2>
${dailyChart(w, d.daily)}
${dayRows ? `<table class="tbl"><thead><tr><th>Day (${esc(out.dayTz)})</th><th class="num">Arrivals</th><th class="num">Phone</th><th class="num">Editor</th><th class="num">Placed</th><th class="num">Taste</th><th class="num">Fill</th><th class="num">Wall</th><th class="num">Accounts</th><th class="num">Returned</th><th class="num">Median stay</th><th class="num">Spend</th></tr></thead><tbody>${dayRows}</tbody></table>` : ""}

<h2>Per deploy</h2>
<table class="tbl"><thead><tr><th>Segment</th><th class="num">Arrivals</th><th class="num">Phone</th><th class="num">Editor</th><th class="num">Placed</th><th class="num">Taste</th><th class="num">Fill</th><th class="num">Wall</th><th class="num">Tap</th><th class="num">Accounts</th><th class="num">Returned</th><th class="num">Median stay</th></tr></thead><tbody>${segRows}</tbody></table>
<p class="note">A segment runs from one <code>deploy.live</code> marker (michi promote-to-production.ps1, the moment Vercel went live) to the next. Markers exist since 2026-10-30 04:14 UTC; everything earlier is one "before" segment, because the first day's deploy times were never recorded. A segment a few hours old has the arrivals of a few hours: compare rates, not counts.</p>

<h2>Per creative</h2>
<table class="tbl"><thead><tr><th>Code</th><th class="num">Arrivals</th><th class="num">Phone</th><th class="num">Editor</th><th class="num">Placed</th><th class="num">Taste</th><th class="num">Fill</th><th class="num">Wall</th><th class="num">Tap</th><th class="num">Accounts</th><th class="num">Public</th><th class="num">Returned</th><th class="num">Median stay</th><th class="num">Spend</th></tr></thead><tbody>${codeRows}</tbody></table>
<div class="cols">
<div>${dimTable("Audience (utm_content)", d.audiences, "content", "No link carried utm_content yet. Put the subreddit in utm_content on each ad link and this table fills in.")}</div>
<div>${dimTable("Ad (utm_term)", d.ads, "term", "No link carried utm_term yet. Put the ad name in utm_term and the creative and the audience separate.")}</div>
</div>

<h2>Where sessions stalled</h2>
<div class="cols">
<div><table class="tbl"><thead><tr><th>Last event, sessions that never placed a card</th><th class="num">Sessions</th></tr></thead><tbody>${stallRows || '<tr><td colspan="2" class="empty">Every session placed a card.</td></tr>'}</tbody></table>
<p class="note">Walkthrough dismissed: <strong>${d.dismissed}</strong>. Took a free taste: <strong>${d.tasted}</strong>. Met a cap gate: <strong>${d.capGates}</strong>. Saw a PRO offer: <strong>${d.proOffers}</strong>.</p></div>
<div><table class="tbl"><thead><tr><th>Search kind</th><th class="num">Searches</th></tr></thead><tbody>${kindRows || '<tr><td colspan="2" class="empty">No searches.</td></tr>'}</tbody></table>
<p class="note"><span ${hov("t", "{scope}", "searching")}><strong>${d.search.sessionsSearching}</strong> session${d.search.sessionsSearching === 1 ? "" : "s"} searched</span>, <span ${hov("t", "{scope}", "noresults")}><strong>${d.search.sessionsWithNoResults}</strong> hit no results</span> (${d.search.noResults} time${d.search.noResults === 1 ? "" : "s"}). The typed text of the main search box is not recorded (gaps.tcgscan_search_blind), so what people look for is a kind, never a word.</p></div>
</div>
</div>`;
}).join("\n");

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reddit launch: what happens after the click</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --bar-2:#86b6ef; --warn:#b45309; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-2:#184f95; --warn:#eda100; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-2:#184f95; --warn:#eda100; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1060px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:16px;margin:28px 0 6px} h3{font-size:14px;margin:14px 0 4px;color:var(--ink-2)}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:10px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.tile .k{font-size:12px;color:var(--ink-2)}
.tile .value{font-size:26px;font-weight:650}
.tile .value.zero{color:var(--muted)}
.tile .sub,.sub{color:var(--muted);font-size:12px}
.sub.warn{color:var(--warn)}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.funnel{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.ftab{width:100%;border-collapse:collapse;font-size:13px}
.ftab td{padding:3px 0;vertical-align:middle}
.ftab .fl{width:40%} .ftab .fb{width:40%}
.ftab .bar{display:block;height:12px;background:var(--bar);border-radius:3px}
.ftab .fn{width:10%;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;padding-left:10px}
.ftab .fd{width:10%;text-align:right;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:6px 8px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
.tbl th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.na{color:var(--muted);font-style:italic;font-size:12px}
.empty{color:var(--muted);font-style:italic}
code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--muted)}
.chart{margin:10px 0 0;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px 6px}
.chart svg{width:100%;height:auto;display:block}
.chart figcaption{font-size:12px;color:var(--muted);margin-top:4px}
.grid{stroke:var(--border);stroke-width:1}
.atick{font-size:10px;fill:var(--muted)}
.bval{font-size:10px;fill:var(--ink-2)}
.bar-a{fill:var(--bar-2)} .bar-b{fill:var(--bar)}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;vertical-align:-1px;margin:0 3px 0 6px}
.sw.a{background:var(--bar-2)} .sw.b{background:var(--bar)}
</style>
<main>
<h1>Reddit launch</h1>
<p class="meta">Every michi-maker session tagged <code>utm_source=reddit</code> in the last ${LOOKBACK_DAYS} days, and what happened after the click:
the editor, the first card, Fill page, the create-account wall, the account, the return. Days are ${esc(out.dayTz)}.
Hover any number for the people behind it (guests are numbered by id stub). Collected ${esc(collectedAt)}.</p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes sessions by their start time; returns and public binders are read as of now")}

${blocks}

<p class="note"><strong>What this cannot say.</strong> A Reddit click that never loaded a page leaves no session, so Reddit's click count will always exceed arrivals here.
The deploy segments start with the first <code>deploy.live</code> marker (2026-10-30 04:14 UTC); the first day's deploys are inside the "before" segment.
A return by a guest who cleared their browser storage is a new guest, uncounted.</p>
</main>
${hoverLayer(rosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

// ---------- markdown (counts only, committed; marketing-studio reads it) ----------

const md = [];
const a7 = out.byWindow[7];
const aa = out.byWindow[ALL_WINDOW];
md.push(`# Reddit launch - what happens after the click`, ``);
md.push(`Collected ${collectedAt}. Days are ${out.dayTz}. Population: michi-maker sessions tagged utm_source=reddit, last ${LOOKBACK_DAYS} days. Our own and QA accounts excluded (${aa.excludedSessions} sessions in the lookback), plus ${verificationSessions} test-link sessions.`, ``);
md.push(`## Last 7 days`, ``);
md.push(`| step | sessions | of arrivals |`, `|---|---:|---:|`);
for (let i = 0; i < a7.funnel.length; i++) {
  const s = a7.funnel[i];
  md.push(`| ${s.label} | ${s.sessions} | ${i ? pct(s.sessions, a7.funnel[0].sessions) : ""} |`);
}
md.push(``, `Phone ${a7.phone}, desktop ${a7.desktop}, unknown ${a7.unknownDevice}. Bounced ${a7.bounced}. Median stay ${secs(a7.medianSecs)}. Came back a later day ${a7.returned}. Accounts by hop ${a7.stitch.hop + a7.stitch.same_uid}, stitched by time ${a7.stitch.time}.`, ``);
if (a7.cost.spend) {
  md.push(`Spend $${a7.cost.spend.toFixed(2)} over ${a7.cost.ledgerRows} ledger rows: per arrival ${usd(a7.cost.perArrival).replace(/<[^>]+>/g, "")}, per first card ${usd(a7.cost.perPlaced).replace(/<[^>]+>/g, "")}, per account ${usd(a7.cost.perAccount).replace(/<[^>]+>/g, "")}.`, ``);
} else {
  md.push(`No spend rows in the last 7 days (${spend.path}).`, ``);
}
md.push(`## Per day (30 days)`, ``);
md.push(`| day | arrivals | phone | editor | placed | taste | fill | wall | accounts | returned | median stay | spend |`, `|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|`);
for (const r of [...aa.daily].reverse()) md.push(`| ${r.day} | ${r.sessions} | ${r.phone} | ${r.editor} | ${r.placed} | ${r.taste} | ${r.fill} | ${r.wall} | ${r.accounts} | ${r.returned} | ${secs(r.medianSecs)} | ${r.spend == null ? "-" : `$${r.spend.toFixed(2)}`} |`);
md.push(``, `## Per deploy (30 days)`, ``);
md.push(`| segment | from (UTC) | arrivals | editor | placed | taste | fill | wall | tap | accounts | returned |`, `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|`);
for (const s of aa.segments) md.push(`| ${s.id} | ${s.from ?? "-"} | ${s.sessions} | ${s.editor} | ${s.placed} | ${s.taste} | ${s.fill} | ${s.wall} | ${s.tap} | ${s.accounts} | ${s.returned} |`);
md.push(``, `## Per creative (30 days)`, ``);
md.push(`| code | label | arrivals | editor | placed | accounts | returned | spend |`, `|---|---|---:|---:|---:|---:|---:|---:|`);
for (const r of aa.perCode) md.push(`| ${r.code} | ${r.label ?? (r.registered ? "" : "not in registry")} | ${r.sessions} | ${r.editor} | ${r.placed} | ${r.accounts} | ${r.returned} | ${r.spend == null ? "-" : `$${r.spend.toFixed(2)}`} |`);
md.push(``, `> Fill page and the wall are recorded since michi 6d01a53 (2026-10-29 evening); the hop stitch since 7bc1d40 (2026-10-29 22:50 PT). Earlier zeros on those steps are blindness. Deploy markers since 2026-10-30 04:14 UTC.`, ``);
writeFileSync(MD_FILE, md.join("\n") + "\n");

console.log(
  `Reddit  7d: ${a7.sessions} arrivals, ${at(a7.funnel, "editor")} editor, ${at(a7.funnel, "placed")} placed, ${at(a7.funnel, "fill")} fill, ${at(a7.funnel, "wall")} wall, ${at(a7.funnel, "account")} accounts, ${a7.returned} returned  ·  phone ${a7.phone}/${a7.sessions}  ·  excluded ${a7.excludedSessions}`,
);
console.log(`  deploy markers: ${deploys.length}  ·  spend rows: ${spend.rows.length}${spend.found ? "" : " (ledger missing)"}  ·  stitch (all): hop ${aa.stitch.hop + aa.stitch.same_uid}, time ${aa.stitch.time}`);
console.log(`\nWrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/reddit.html (gitignored) and reports/reddit.md`);
