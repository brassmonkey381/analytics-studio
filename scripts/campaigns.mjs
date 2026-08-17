// Print & QR campaign lane: did a printed piece produce members?
//
// marketing-studio prints static QR codes that bake their campaign into the URL
// (`?code=oakland_cardshow`), so nothing sits between the scan and the site — and
// nothing outside our own stream can count the scan either. Since 2026-08-13 all
// four emitters keep the allowlisted `code`/`utm_*` query on the FIRST page.view
// (stored in `analytics_sessions.landing_route`) and merge the code into
// `account.created` props. This lane reads those two facts and follows the person
// forward: arrived -> stayed -> signed up -> came back.
//
// Three things this lane does that the events report's small campaigns panel cannot:
//
//   1. **It joins the printed registry.** `../marketing-studio/assets/qr/campaigns.yaml`
//      is the list of codes that physically exist on paper. A code printed with zero
//      arrivals is a REAL and different finding from a code we never printed — see
//      "a zero has two meanings" in CLAUDE.md. Both are named here.
//   2. **It states capture readiness separately**, over ALL traffic and all time,
//      exclusions included: whether landing_route is being written at all, and since
//      when. That is a property of the deployed code, not of who used the app, so a
//      "no arrivals" number can be read as "nobody scanned" rather than "we're blind".
//   3. **It is all-time by default.** A card handed out at a show is read for months;
//      a 30-day ceiling would hide the campaign it is named after.
//
// Writes data/campaigns.json (counts only, committed), data/campaigns-roster.json
// (identity, gitignored), reports/campaigns.html and reports/campaigns.md.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, isoDate, dayOf, exclusionCte } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer, ROSTER_STORE_CAP } from "./lib/hover.mjs";
import { ALL_WINDOW, STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const CFG = readConfig("events.json");
const CAMP = CFG.campaigns ?? {};
const DATA_FILE = join(ROOT, "data", "campaigns.json");
const ROSTER_FILE = join(ROOT, "data", "campaigns-roster.json");
const HTML_FILE = join(ROOT, "reports", "campaigns.html");
const MD_FILE = join(ROOT, "reports", "campaigns.md");

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the campaigns lane needs Management API access.");
  process.exit(1);
}

const ROW_CAP = 20_000;
const APPS = CFG.apps ?? [];
const APP_BY_KEY = new Map(APPS.map((a) => [a.key, a]));
const PROJECT_GROUPS = new Map();
for (const app of APPS) {
  const ref = app.projectRef ?? CFG.projectRef;
  if (!PROJECT_GROUPS.has(ref)) PROJECT_GROUPS.set(ref, []);
  PROJECT_GROUPS.get(ref).push(app);
}

// Verification scans are ours: the end-to-end proofs run against production while
// building the capture. They are excluded from every headline the same way our own
// accounts are — and, like them, stated rather than dropped silently.
const VERIFY_PREFIXES = CAMP.verificationPrefixes ?? ["test_"];
const isVerification = (code) => VERIFY_PREFIXES.some((p) => String(code).startsWith(p));

// ---------- the printed registry ----------

// A deliberately small YAML reader for ONE known file shape: `campaigns:` holding a
// list of flat `key: value` entries. Bringing in a YAML dependency to read eleven
// records would be the larger risk. Anything it cannot read is reported as a count
// mismatch rather than skipped quietly — see registry.note below.
function parseCampaignRegistry(text) {
  const out = [];
  let inList = false;
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^[A-Za-z_][\w-]*:/.test(line)) {
      // A top-level key ends the campaigns list and starts something else.
      if (cur) out.push(cur);
      cur = null;
      inList = /^campaigns:/.test(line);
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
  return out.filter((c) => c.code && c.app);
}
const unquote = (v) => v.replace(/^["']|["']$/g, "").trim();

const REGISTRY_PATH = join(ROOT, CAMP.registry ?? "../marketing-studio/assets/qr/campaigns.yaml");
const registry = { path: CAMP.registry ?? "../marketing-studio/assets/qr/campaigns.yaml", found: false, campaigns: [] };
if (existsSync(REGISTRY_PATH)) {
  const text = readFileSync(REGISTRY_PATH, "utf8");
  registry.found = true;
  registry.campaigns = parseCampaignRegistry(text).map((c) => ({
    id: c.id ?? null,
    app: c.app,
    label: c.label ?? c.id ?? c.code,
    code: c.code,
    url: c.url ?? null,
    piece: c.piece ?? null,
    printed: c.printed ?? null,
  }));
  // The `- id:` line count is the honest denominator: if the parser produced fewer
  // entries than the file has records, say so instead of reporting a short list.
  const declared = (text.match(/^\s*-\s*id:/gm) ?? []).length;
  registry.declared = declared;
  if (declared !== registry.campaigns.length) {
    console.warn(
      `WARNING: campaigns.yaml declares ${declared} campaigns but ${registry.campaigns.length} parsed — ` +
        `the registry table below is INCOMPLETE. Check the file shape against parseCampaignRegistry().`,
    );
  }
} else {
  console.warn(`WARNING: no campaign registry at ${REGISTRY_PATH} — every observed code will read as unregistered.`);
}
// app id -> code -> registry entry. Campaign identity is (app, code), never code
// alone: `wom` and `cardshow` are each printed for more than one app.
const REG = new Map();
for (const c of registry.campaigns) REG.set(`${c.app}|${c.code}`, c);

// ---------- fetch ----------

function excludedUnionCte(apps) {
  const ids = apps.map((a) => a.id);
  const parts = ids.map((id, i) => exclusionCte(id).replace(/^excluded_users as \(/, `ex_${i} as (`));
  const union = ids.map((_, i) => `select id from ex_${i}`).join("\n  union\n  ");
  return [...parts, `excluded_users as (\n  ${union}\n)`].join(",\n");
}

// device_id / landing_route go through to_jsonb so a project whose spine migration
// has not landed returns null rather than erroring the whole lane.
function arrivalsSql(apps) {
  const prof = apps.find((a) => a.profile)?.profile ?? { username: "username", displayName: "display_name" };
  const userCol = prof.username ? `pr.${prof.username}` : "null::text";
  const dispCol = prof.displayName ? `pr.${prof.displayName}` : "null::text";
  return `
with ${excludedUnionCte(apps)}
select
  s.id, s.user_id, s.app, s.is_guest, s.platform, s.started_at, s.last_seen_at, s.upgraded_at,
  to_jsonb(s)->>'device_id' as device_id,
  to_jsonb(s)->>'landing_route' as landing_route,
  u.email, coalesce(u.is_anonymous, false) as anon,
  ${userCol} as username, ${dispCol} as display_name,
  (s.user_id in (select id from excluded_users)) as excluded
from public.analytics_sessions s
left join auth.users u on u.id = s.user_id
left join public.profiles pr on pr.id = s.user_id
where to_jsonb(s)->>'landing_route' like '%code=%'
   or to_jsonb(s)->>'landing_route' like '%utm_campaign=%'
order by s.started_at
limit ${ROW_CAP}`;
}

// Events carrying a campaign code. account.created is the one the emitters merge it
// into, and it can fire on a LATER visit than the scan — which is exactly why this is
// read separately from landing_route rather than folded into it.
function codeEventsSql(apps) {
  const prof = apps.find((a) => a.profile)?.profile ?? { username: "username", displayName: "display_name" };
  const userCol = prof.username ? `pr.${prof.username}` : "null::text";
  const dispCol = prof.displayName ? `pr.${prof.displayName}` : "null::text";
  return `
with ${excludedUnionCte(apps)}
select
  e.id, e.user_id, e.session_id, e.app, e.name, e.ts,
  e.props->>'code' as code,
  u.email, coalesce(u.is_anonymous, false) as anon,
  ${userCol} as username, ${dispCol} as display_name,
  (e.user_id in (select id from excluded_users)) as excluded
from public.analytics_events e
left join auth.users u on u.id = e.user_id
left join public.profiles pr on pr.id = e.user_id
where e.props ? 'code'
order by e.ts
limit ${ROW_CAP}`;
}

// Instrumentation coverage: ALL traffic, all time, exclusions INCLUDED. Whether a
// landing route can be recorded is a property of the deployed code, not of who used
// the app — filtering it would report a hand-verified QA scan as broken capture.
const captureSql = `
select s.app,
  count(*) as sessions,
  count(to_jsonb(s)->>'landing_route') as with_landing,
  count(*) filter (where to_jsonb(s)->>'landing_route' like '%code=%') as with_code,
  count(to_jsonb(s)->>'device_id') as with_device,
  min(s.started_at) as first_session,
  max(s.started_at) as last_session,
  min(s.started_at) filter (where to_jsonb(s)->>'landing_route' is not null) as first_landing,
  min(s.started_at) filter (where to_jsonb(s)->>'landing_route' like '%code=%') as first_code
from public.analytics_sessions s
group by s.app`;

const uuidList = (ids) => `array[${ids.map((i) => `'${String(i).replace(/'/g, "''")}'`).join(",")}]::uuid[]`;
const textList = (ids) => `array[${ids.map((i) => `'${String(i).replace(/'/g, "''")}'`).join(",")}]::text[]`;

const arrivals = [];
const codeEvents = [];
const capture = {};
const skipped = [];
const projectOfApp = new Map();

for (const [ref, apps] of PROJECT_GROUPS) {
  for (const a of apps) projectOfApp.set(a.key, ref);
  let rows;
  try {
    rows = await Promise.all([runSql(ref, arrivalsSql(apps)), runSql(ref, codeEventsSql(apps)), runSql(ref, captureSql)]);
  } catch (err) {
    // A project without the spine must be LOUD. Rendered as absent, never as zero —
    // "we cannot see it" and "it did not happen" are different answers.
    if (String(err).includes("does not exist")) {
      console.warn(
        `WARNING: ${apps.map((a) => a.id).join("/")} skipped — no analytics spine on project ${ref}. ` +
          `These apps are MISSING from the report, not zero.`,
      );
      for (const a of apps) skipped.push(a.id);
      continue;
    }
    throw err;
  }
  const [arr, ev, cap] = rows;
  arrivals.push(...arr);
  codeEvents.push(...ev);
  for (const c of cap) {
    const app = APP_BY_KEY.get(c.app);
    if (app) capture[app.id] = c;
  }
}

// Second pass, only for the people who arrived on a code: every other session they
// have, so "came back" is answerable, and every event inside the arriving session, so
// "went past the landing page" is. Both are scoped to the arrival set rather than
// pulling the whole stream.
const sessionEvents = new Map(); // session id -> [{name, ts}]
const laterSessions = []; // {app, user_id, device_id, started_at, upgraded_at, anon}
if (arrivals.length) {
  for (const [ref, apps] of PROJECT_GROUPS) {
    const keys = new Set(apps.map((a) => a.key));
    const mine = arrivals.filter((s) => keys.has(s.app));
    if (!mine.length) continue;
    const sids = mine.map((s) => s.id);
    const uids = [...new Set(mine.map((s) => s.user_id).filter(Boolean))];
    const devs = [...new Set(mine.map((s) => s.device_id).filter(Boolean))];
    const who = [uids.length ? `s.user_id = any(${uuidList(uids)})` : null, devs.length ? `to_jsonb(s)->>'device_id' = any(${textList(devs)})` : null].filter(Boolean);
    const [evs, sess] = await Promise.all([
      runSql(ref, `select e.session_id, e.name, e.ts from public.analytics_events e where e.session_id = any(${uuidList(sids)}) order by e.ts limit ${ROW_CAP}`),
      who.length
        ? runSql(
            ref,
            `select s.id, s.app, s.user_id, to_jsonb(s)->>'device_id' as device_id, s.started_at, s.upgraded_at,
                    coalesce(u.is_anonymous, false) as anon
             from public.analytics_sessions s left join auth.users u on u.id = s.user_id
             where ${who.join(" or ")} order by s.started_at limit ${ROW_CAP}`,
          )
        : Promise.resolve([]),
    ]);
    for (const e of evs) {
      if (!sessionEvents.has(e.session_id)) sessionEvents.set(e.session_id, []);
      sessionEvents.get(e.session_id).push(e);
    }
    laterSessions.push(...sess);
  }
}

// ---------- shape ----------

const collectedAt = new Date().toISOString();
const NOW = Date.now();
const WINDOWS = [ALL_WINDOW, ...STANDARD_WINDOWS];
const DEFAULT_WINDOW = ALL_WINDOW;
const inWin = (ts, w) => w === ALL_WINDOW || Date.parse(ts) >= NOW - Number(w) * 86400_000;

// The person behind a row. Identity-less visits (doggle/pickleague record them with
// user_id null) group by device into a VISITOR — a device is not a person, so they are
// never called users. Same synthetic keys as the events lane, deliberately.
const personOf = (s) => s.user_id ?? (s.device_id ? `dev:${s.device_id}` : `sess:${s.id}`);

const identity = new Map();
function remember(id, row) {
  if (!identity.has(id)) {
    identity.set(id, {
      id,
      username: row.username || null,
      displayName: row.display_name || null,
      email: row.email ?? null,
      anon: !row.user_id || !!row.anon,
    });
  }
}
for (const s of arrivals) remember(personOf(s), s);
for (const e of codeEvents) if (e.user_id) remember(e.user_id, e);

// Mirrors scripts/events.mjs — a visitor stub must never read as one shared "(guest)",
// and four visitors must never read as one person.
function label(id) {
  const u = identity.get(id) ?? { id };
  if (u.username) return `@${u.username}`;
  if (u.displayName) return u.displayName;
  if (typeof id === "string" && /^(dev|sess):/.test(id)) {
    return `visitor ${id.slice(id.indexOf(":") + 1, id.indexOf(":") + 9)}`;
  }
  if (u.anon) return `guest ${String(id).slice(0, 8)}`;
  return u.email ?? String(id).slice(0, 8);
}
const roster = (ids) => {
  const names = [...new Set(ids)].map(label).sort((a, b) => a.localeCompare(b));
  return { total: names.length, names: names.slice(0, ROSTER_STORE_CAP) };
};

// The campaign carried by a landing route. Both route shapes appear: expo-router
// paths (`/welcome?code=…`) on michi/tcgscan and react-navigation screen names
// (`Landing?code=…`) on doggle/pickleague.
function campaignOf(route) {
  if (typeof route !== "string") return null;
  const q = route.indexOf("?");
  if (q < 0) return null;
  let p;
  try {
    p = new URLSearchParams(route.slice(q + 1));
  } catch {
    return null;
  }
  const code = p.get("code") ?? p.get("utm_campaign");
  if (!code) return null;
  return { code, source: p.get("utm_source"), medium: p.get("utm_medium"), path: route.slice(0, q) || "/" };
}

// Every later session a person has, for "came back" and for the identity they may have
// gained after the scan.
const sessionsByPerson = new Map();
for (const s of laterSessions) {
  const key = s.user_id ?? (s.device_id ? `dev:${s.device_id}` : `sess:${s.id}`);
  if (!sessionsByPerson.has(key)) sessionsByPerson.set(key, []);
  sessionsByPerson.get(key).push(s);
}
// Same trap the events lane hit (fixed 2026-08-16): an event written with a null user_id —
// which the doggle/pickleague emitters do even on a signed-in session — gets `excluded`
// NULL from SQL, because NULL in (...) is NULL rather than false. Inherit both the identity
// and the exclusion from its session. Only sessions this lane fetched (campaign arrivals)
// can be resolved, which is exactly the population these events are credited against.
{
  const sessionOf = new Map(arrivals.map((s) => [s.id, s]));
  for (const e of codeEvents) {
    if (e.user_id) continue;
    const s = e.session_id ? sessionOf.get(e.session_id) : null;
    if (!s) continue;
    e.user_id = personOf(s); // the same person key the sessions use, synthetic ones included
    if (s.excluded) e.excluded = true;
  }
}
const createdByPerson = new Set(codeEvents.filter((e) => e.name === "account.created" && e.user_id).map((e) => e.user_id));

// Decorate each arrival once; the windows then only filter.
for (const s of arrivals) {
  s.person = personOf(s);
  s.campaign = campaignOf(s.landing_route);
  s.verification = s.campaign ? isVerification(s.campaign.code) : false;
  s.appId = APP_BY_KEY.get(s.app)?.id ?? s.app;
  const evs = sessionEvents.get(s.id) ?? [];
  // Landing itself is session.start + one page.view. Anything beyond that second event
  // is the visitor going somewhere, which is the honest floor for "did not just bounce".
  s.beyondLanding = evs.filter((e) => e.name !== "session.start").length > 1;
  s.arrivedAnonymous = !s.user_id || s.is_guest === true || s.anon === true;
  const mine = sessionsByPerson.get(s.person) ?? [];
  const claimed = mine.some((o) => o.upgraded_at) || !!s.upgraded_at;
  // Ground truth for "became a member": the auth user is no longer anonymous, or a
  // signed-out session was claimed by a real identity. account.created is the SUBMITTED
  // signup and overstates it (gap upgrade_unconfirmed), so it is reported beside this
  // number, never merged into it.
  s.gainedIdentity = s.arrivedAnonymous && (claimed || mine.some((o) => o.user_id && !o.anon) || (!!s.user_id && !s.anon));
  s.submittedSignup = createdByPerson.has(s.person);
  const end = Date.parse(s.last_seen_at ?? s.started_at);
  s.returned = mine.some((o) => o.id !== s.id && Date.parse(o.started_at) > end);
}

const appList = APPS.filter((a) => !skipped.includes(a.id));
const out = {
  collectedAt,
  windows: WINDOWS,
  defaultWindow: DEFAULT_WINDOW,
  registry: { path: registry.path, found: registry.found, declared: registry.declared ?? null, count: registry.campaigns.length, campaigns: registry.campaigns },
  capture,
  skippedApps: skipped,
  apps: {},
};
const rosters = {};

for (const app of appList) {
  const mine = arrivals.filter((s) => s.app === app.key);
  const myEvents = codeEvents.filter((e) => e.app === app.key);
  const byWindow = {};

  for (const w of WINDOWS) {
    const win = mine.filter((s) => inWin(s.started_at, w));
    const live = win.filter((s) => !s.excluded && !s.verification && s.campaign);
    const buckets = new Map();
    for (const s of live) {
      const k = s.campaign.code;
      if (!buckets.has(k)) {
        buckets.set(k, {
          code: k,
          source: s.campaign.source,
          medium: s.campaign.medium,
          arrivals: 0,
          people: new Set(),
          stayed: new Set(),
          signedUp: new Set(),
          returned: new Set(),
          firstSeen: s.started_at,
          lastSeen: s.started_at,
        });
      }
      const b = buckets.get(k);
      b.arrivals++;
      b.people.add(s.person);
      if (s.beyondLanding) b.stayed.add(s.person);
      if (s.gainedIdentity) b.signedUp.add(s.person);
      if (s.returned) b.returned.add(s.person);
      if (s.started_at < b.firstSeen) b.firstSeen = s.started_at;
      if (s.started_at > b.lastSeen) b.lastSeen = s.started_at;
    }

    // account.created carrying a code — the durable half of attribution, because the
    // emitters persist the code and a signup days later still credits the scan.
    const signupsByCode = new Map();
    for (const e of myEvents) {
      if (e.name !== "account.created" || !e.code || e.excluded || isVerification(e.code)) continue;
      if (!inWin(e.ts, w)) continue;
      if (!signupsByCode.has(e.code)) signupsByCode.set(e.code, new Set());
      signupsByCode.get(e.code).add(e.user_id ?? `ev:${e.id}`);
    }
    for (const code of signupsByCode.keys()) {
      if (!buckets.has(code)) {
        // A signup whose scan is outside the window (or predates capture) still belongs
        // to its campaign — dropping it would credit the code with nothing.
        buckets.set(code, { code, source: null, medium: null, arrivals: 0, people: new Set(), stayed: new Set(), signedUp: new Set(), returned: new Set(), firstSeen: null, lastSeen: null });
      }
    }

    const campaigns = [...buckets.values()]
      .map((b) => {
        const reg = REG.get(`${app.id}|${b.code}`) ?? null;
        const signups = signupsByCode.get(b.code) ?? new Set();
        const base = `${app.id}|${w}|camp|${b.code}`;
        rosters[`${base}|people`] = roster(b.people);
        rosters[`${base}|stayed`] = roster(b.stayed);
        rosters[`${base}|signedUp`] = roster(b.signedUp);
        rosters[`${base}|returned`] = roster(b.returned);
        rosters[`${base}|signups`] = roster(signups);
        return {
          code: b.code,
          label: reg?.label ?? null,
          registryId: reg?.id ?? null,
          piece: reg?.piece ?? null,
          printed: reg?.printed ?? null,
          registered: !!reg,
          source: b.source,
          medium: b.medium,
          arrivals: b.arrivals,
          people: b.people.size,
          stayed: b.stayed.size,
          signedUp: b.signedUp.size,
          returned: b.returned.size,
          signupsWithCode: signups.size,
          firstSeen: b.firstSeen,
          lastSeen: b.lastSeen,
        };
      })
      .sort((a, b) => b.arrivals - a.arrivals || b.signedUp - a.signedUp || a.code.localeCompare(b.code));

    const people = new Set(live.map((s) => s.person));
    const t = {
      arrivals: live.length,
      campaigns: campaigns.length,
      people: people.size,
      stayed: new Set(live.filter((s) => s.beyondLanding).map((s) => s.person)).size,
      signedUp: new Set(live.filter((s) => s.gainedIdentity).map((s) => s.person)).size,
      returned: new Set(live.filter((s) => s.returned).map((s) => s.person)).size,
      alreadyMembers: new Set(live.filter((s) => !s.arrivedAnonymous).map((s) => s.person)).size,
      submittedSignups: new Set(live.filter((s) => s.submittedSignup).map((s) => s.person)).size,
      signupsWithCode: campaigns.reduce((n, c) => n + c.signupsWithCode, 0),
      excludedArrivals: win.filter((s) => s.excluded && s.campaign).length,
      verificationArrivals: win.filter((s) => s.verification && !s.excluded).length,
    };
    rosters[`${app.id}|${w}|tiles|people`] = roster(live.map((s) => s.person));
    rosters[`${app.id}|${w}|tiles|stayed`] = roster(live.filter((s) => s.beyondLanding).map((s) => s.person));
    rosters[`${app.id}|${w}|tiles|signedUp`] = roster(live.filter((s) => s.gainedIdentity).map((s) => s.person));
    rosters[`${app.id}|${w}|tiles|returned`] = roster(live.filter((s) => s.returned).map((s) => s.person));

    // Daily arrivals. At 24h a daily series is one column, which is a point rather than
    // a trend — the tiles carry that window (same call the DAU lane makes).
    let daily = null;
    if (w !== 1) {
      let days = Number(w);
      let start;
      if (w === ALL_WINDOW) {
        const first = live.length ? Math.min(...live.map((s) => Date.parse(s.started_at))) : NOW;
        days = Math.min(90, Math.max(7, Math.ceil((NOW - first) / 86400_000) + 1));
      }
      const buckets2 = {};
      const peopleByDay = {};
      for (let i = days - 1; i >= 0; i--) {
        const d = isoDate(new Date(NOW - i * 86400_000));
        buckets2[d] = 0;
        peopleByDay[d] = [];
      }
      for (const s of live) {
        const d = dayOf(s.started_at);
        if (d in buckets2) {
          buckets2[d]++;
          peopleByDay[d].push(s.person);
        }
      }
      // A day column is a mark that represents people, so it gets a roster like every
      // other mark — a hoverable bar with nothing behind it reads as broken.
      for (const [d, ids] of Object.entries(peopleByDay)) {
        if (ids.length) rosters[`${app.id}|${w}|day|${d}`] = roster(ids);
      }
      daily = Object.entries(buckets2).map(([day, arrivals]) => ({ day, arrivals }));
      start = daily[0]?.day;
      if (w === ALL_WINDOW && days === 90) daily.note = `capped at 90 days from ${start}`;
    }

    byWindow[w] = { totals: t, campaigns, daily };
  }

  // All-time per code, for the registry table — which does NOT move with the window
  // toggle and says so where it is rendered.
  const allTime = {};
  for (const s of mine) {
    if (!s.campaign || s.excluded || s.verification) continue;
    const b = (allTime[s.campaign.code] ??= { arrivals: 0, people: new Set(), signedUp: new Set(), firstSeen: s.started_at, lastSeen: s.started_at });
    b.arrivals++;
    b.people.add(s.person);
    if (s.gainedIdentity) b.signedUp.add(s.person);
    if (s.started_at < b.firstSeen) b.firstSeen = s.started_at;
    if (s.started_at > b.lastSeen) b.lastSeen = s.started_at;
  }
  const allTimeByCode = Object.fromEntries(
    Object.entries(allTime).map(([code, b]) => [code, { arrivals: b.arrivals, people: b.people.size, signedUp: b.signedUp.size, firstSeen: b.firstSeen, lastSeen: b.lastSeen }]),
  );

  out.apps[app.id] = { name: app.name, key: app.key, byWindow, allTimeByCode };
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(rosters, null, 2));

// ---------- report ----------

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const day = (ts) => dayOf(ts) ?? "—";
const hov = (...parts) => ` ${hoverAttr(...parts)}`;
const GAPS = CFG.gaps ?? {};

// ONE scale for the campaign bars, across every app and every window. Per-window
// scaling would make a bar grow when the window narrows, which is the opposite of
// what happened.
const BAR_MAX = Math.max(
  1,
  ...Object.values(out.apps).flatMap((a) => WINDOWS.flatMap((w) => a.byWindow[w].campaigns.map((c) => Math.max(c.arrivals, c.signupsWithCode)))),
);
const DAY_MAX = Math.max(
  1,
  ...Object.values(out.apps).flatMap((a) => WINDOWS.flatMap((w) => (a.byWindow[w].daily ?? []).map((d) => d.arrivals))),
);

const axisTicks = (max) => [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);

// Horizontal bars: arrivals as the light ordinal step, members produced as the dark one
// inside it. Two series, so a legend is present; values are labeled directly on the
// marks, which is what makes the axis a cross-check rather than the only reading.
function campaignBars(appId, w, campaigns) {
  if (!campaigns.length) return "";
  const rowH = 26;
  const gap = 6; // >= the 2px surface gap between adjacent fills
  const labelW = 150;
  const width = 640;
  const plotW = width - labelW - 46;
  const height = campaigns.length * (rowH + gap) + 26;
  const x = (v) => (v / BAR_MAX) * plotW;
  const grid = axisTicks(BAR_MAX)
    .map(
      (v) =>
        `<line x1="${labelW + x(v)}" y1="0" x2="${labelW + x(v)}" y2="${height - 22}" class="grid"/>` +
        `<text x="${labelW + x(v)}" y="${height - 8}" class="atick" text-anchor="middle">${v}</text>`,
    )
    .join("");
  const bars = campaigns
    .map((c, i) => {
      const y = i * (rowH + gap);
      const wA = Math.max(c.arrivals > 0 ? 3 : 0, x(c.arrivals));
      const wS = Math.max(c.signedUp > 0 ? 3 : 0, x(c.signedUp));
      const name = c.label ?? c.code;
      return `<g${hov(appId, "{scope}", "camp", `${c.code}|people`)} tabindex="0">
  <text x="${labelW - 8}" y="${y + rowH / 2 + 4}" class="blab" text-anchor="end">${esc(name.length > 22 ? `${name.slice(0, 21)}…` : name)}</text>
  <rect x="${labelW}" y="${y + 3}" width="${wA.toFixed(1)}" height="${rowH - 6}" rx="3" class="bar-a"/>
  ${c.signedUp > 0 ? `<rect x="${labelW}" y="${y + 6}" width="${wS.toFixed(1)}" height="${rowH - 12}" rx="3" class="bar-s"/>` : ""}
  <text x="${labelW + wA + 6}" y="${y + rowH / 2 + 4}" class="bval">${c.arrivals}${c.signedUp ? ` · ${c.signedUp}` : ""}</text>
</g>`;
    })
    .join("");
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Arrivals and members produced per campaign">
<title>Arrivals per campaign, with members produced</title>
${grid}${bars}
</svg>
<figcaption><span class="key"><i class="sw sw-a"></i>Arrivals (sessions that carried the code)</span> <span class="key"><i class="sw sw-s"></i>Became members</span> — x: people, one scale across every app and window</figcaption></figure>`;
}

// Daily arrivals. Tick density follows the house rule: every day at 7d, every other at
// 14d, weekly beyond — always anchored so the newest day is labeled.
function dailyChart(appId, w, daily) {
  if (!daily || !daily.length) return "";
  const days = daily.length;
  const width = 640;
  const height = 150;
  const padL = 30;
  const padB = 26;
  const plotW = width - padL - 8;
  const plotH = height - padB - 10;
  const bw = Math.max(2, plotW / days - 2);
  const y = (v) => 10 + plotH - (v / DAY_MAX) * plotH;
  const every = days <= 7 ? 1 : days <= 14 ? 2 : 7;
  const grid = axisTicks(DAY_MAX)
    .map((v) => `<line x1="${padL}" y1="${y(v)}" x2="${width - 8}" y2="${y(v)}" class="grid"/><text x="${padL - 6}" y="${y(v) + 4}" class="atick" text-anchor="end">${v}</text>`)
    .join("");
  const cols = daily
    .map((d, i) => {
      const cx = padL + (i + 0.5) * (plotW / days);
      const h = d.arrivals > 0 ? Math.max(2, (d.arrivals / DAY_MAX) * plotH) : 0;
      const labelled = (days - 1 - i) % every === 0;
      const val = d.arrivals > 0 && (days <= 14 || d.arrivals === DAY_MAX) ? `<text x="${cx}" y="${y(d.arrivals) - 4}" class="bval" text-anchor="middle">${d.arrivals}</text>` : "";
      return `${h ? `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y(d.arrivals).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="2" class="bar-a"${hov(appId, "{scope}", "day", d.day)} tabindex="0"/>` : ""}${val}${labelled ? `<text x="${cx}" y="${height - 8}" class="atick" text-anchor="middle">${d.day.slice(5)}</text>` : ""}`;
    })
    .join("");
  return `<figure class="chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Campaign arrivals per day">
<title>Campaign arrivals per day</title>
${grid}${cols}
</svg><figcaption>Arrivals per day (y: arrivals, x: date)${daily.note ? ` — ${esc(daily.note)}` : ""}</figcaption></figure>`;
}

function campaignTable(appId, w, campaigns) {
  if (!campaigns.length) return "";
  const rows = campaigns
    .map((c) => {
      const name = c.registered
        ? `<strong>${esc(c.label)}</strong> <code>${esc(c.code)}</code>${c.piece ? `<span class="sub"> · ${esc(c.piece)}</span>` : ""}`
        : `<code>${esc(c.code)}</code> <span class="pill warn">not in the printed registry</span>`;
      return `<tr>
  <td>${name}</td>
  <td class="num hoverable"${hov(appId, "{scope}", "camp", `${c.code}|people`)}>${c.arrivals}</td>
  <td class="num hoverable"${hov(appId, "{scope}", "camp", `${c.code}|people`)}>${c.people}</td>
  <td class="num hoverable"${hov(appId, "{scope}", "camp", `${c.code}|stayed`)}>${c.stayed}</td>
  <td class="num hoverable"${hov(appId, "{scope}", "camp", `${c.code}|signedUp`)}>${c.signedUp}</td>
  <td class="num hoverable"${hov(appId, "{scope}", "camp", `${c.code}|returned`)}>${c.returned}</td>
</tr>`;
    })
    .join("");
  const signupNote = campaigns.some((c) => c.signupsWithCode)
    ? `<p class="note">Signups carrying a code in their <code>account.created</code>: ${campaigns
        .filter((c) => c.signupsWithCode)
        .map((c) => `<span class="hoverable"${hov(appId, "{scope}", "camp", `${c.code}|signups`)}><code>${esc(c.code)}</code> ${c.signupsWithCode}</span>`)
        .join(", ")}. The code is persisted, so a signup days after the scan still credits the campaign — which is why this is counted separately from the arrival above. It is the SUBMITTED signup and overstates completion (<code>upgrade_unconfirmed</code>); "Became members" is ground truth.</p>`
    : "";
  return `<table class="tbl"><thead><tr>
  <th>Campaign</th><th class="num">Arrivals</th><th class="num">People</th>
  <th class="num">Went further</th><th class="num">Became members</th><th class="num">Came back</th>
</tr></thead><tbody>${rows}</tbody></table>${signupNote}`;
}

function appBlock(app) {
  const a = out.apps[app.id];
  const blocks = WINDOWS.map((w) => {
    const d = a.byWindow[w];
    const t = d.totals;
    const tiles = [
      ["Arrivals", t.arrivals, `${t.campaigns} campaign${t.campaigns === 1 ? "" : "s"} seen`, "people"],
      ["People", t.people, t.alreadyMembers ? `${t.alreadyMembers} already had an account` : "all arrived without an account", "people"],
      ["Became members", t.signedUp, "gained a real identity after the scan", "signedUp"],
      ["Came back", t.returned, "returned in a later session", "returned"],
    ]
      .map(
        ([k, v, sub, rk]) =>
          `<div class="tile hoverable"${hov(app.id, "{scope}", "tiles", rk)}><div class="k">${esc(k)}</div><div class="value${v === 0 ? " zero" : ""}">${v}</div><div class="sub">${esc(sub)}</div></div>`,
      )
      .join("");

    const body = t.arrivals || d.campaigns.length
      ? `${campaignBars(app.id, w, d.campaigns)}${campaignTable(app.id, w, d.campaigns)}${dailyChart(app.id, w, d.daily)}`
      : `<p class="empty">No campaign-tagged arrival in this window.${captureLine(app.id)}</p>`;

    const asides = [];
    if (t.excludedArrivals) asides.push(`<strong>${t.excludedArrivals}</strong> arrival${t.excludedArrivals === 1 ? "" : "s"} from our own or QA accounts, excluded from every number above`);
    if (t.verificationArrivals) asides.push(`<strong>${t.verificationArrivals}</strong> verification scan${t.verificationArrivals === 1 ? "" : "s"} (codes starting <code>${esc(VERIFY_PREFIXES.join("</code>, <code>"))}</code>) — ours, run to prove the capture works, excluded the same way`);

    return `<div data-w="${w}"${w === DEFAULT_WINDOW ? "" : " hidden"}>
<div class="tiles">${tiles}</div>
<p class="note">${asides.length ? `Also in this window: ${asides.join("; ")}.` : "Nothing was excluded from this window."}${
      app.id === "doggle" || app.id === "pickleague"
        ? ` Signed-out visits here carry no auth user, so our own signed-out browsing <em>cannot</em> be excluded — see <code>anon_visitor_exclusions</code> below.`
        : ""
    }</p>
${body}
</div>`;
  }).join("\n");

  return `<section data-app-scope="${esc(app.id)}">
<h2>${esc(app.name)}</h2>
${blocks}
</section>`;
}

// WHICH zero this is. Three genuinely different states, and the difference between them
// is the whole point of the panel — landing routes have been recorded since 2026-08-06,
// long before the campaign-capturing build existed, so "routes are being written" does
// NOT prove a code could have been seen. Only a code actually arriving proves that.
function captureLine(appId) {
  const c = capture[appId];
  if (!c) return " No analytics spine reached on this project, so this is <em>not visible</em> rather than <em>none</em>.";
  if (Number(c.with_code)) {
    return ` A landing route carrying a code HAS been recorded here (first on ${day(c.first_code)}), so the capture path works end to end and this zero reads as "nobody scanned" — bearing in mind that the only codes seen so far may be our own verification scans, counted separately above.`;
  }
  if (Number(c.with_landing)) {
    return ` Landing routes are recorded (${c.with_landing} of ${c.sessions} sessions, first on ${day(c.first_landing)}) but not one has ever carried a code, so this zero <strong>cannot yet be told apart from a build that has not shipped</strong> — see <code>qr_campaign_capture</code> below.`;
  }
  return ` Capture is not proven on this app at all: none of its ${c.sessions} sessions has ever recorded a landing route, so a scan could not have been seen.`;
}

const captureRows = APPS.map((app) => {
  const c = capture[app.id];
  if (!c) {
    return `<tr><td>${esc(app.name)}</td><td colspan="5" class="empty">no analytics spine reached — missing, not zero</td></tr>`;
  }
  const state = Number(c.with_code)
    ? `<span class="pill ok">a code was recorded ${day(c.first_code)}</span>`
    : Number(c.with_landing)
      ? `<span class="pill warn">routes yes, never a code</span>`
      : `<span class="pill warn">no landing route ever</span>`;
  return `<tr>
  <td>${esc(app.name)}</td>
  <td class="num">${c.sessions}</td>
  <td class="num">${c.with_landing}</td>
  <td class="num">${c.with_code}</td>
  <td class="num">${c.with_device}</td>
  <td>${state}</td>
</tr>`;
}).join("");

// The printed registry, joined to what arrived. A code on paper with no arrival is the
// finding this table exists for; a code in the data that is on no paper is the other.
const observedCodes = new Set();
for (const [appId, a] of Object.entries(out.apps)) for (const code of Object.keys(a.allTimeByCode)) observedCodes.add(`${appId}|${code}`);
const registryRows = registry.campaigns
  .map((c) => {
    const seen = out.apps[c.app]?.allTimeByCode?.[c.code] ?? null;
    observedCodes.delete(`${c.app}|${c.code}`);
    return `<tr>
  <td>${esc(c.label)}<span class="sub"> · ${esc(c.app)}</span></td>
  <td><code>${esc(c.code)}</code></td>
  <td>${esc(c.piece ?? "—")}${c.printed ? `<span class="sub"> · printed ${esc(c.printed)}</span>` : ""}</td>
  <td class="num">${seen ? seen.arrivals : `<span class="muted">0</span>`}</td>
  <td class="num">${seen ? seen.signedUp : `<span class="muted">0</span>`}</td>
  <td>${seen ? `first ${day(seen.firstSeen)}` : `<span class="muted">no scan recorded yet</span>`}</td>
</tr>`;
  })
  .join("");
const strayRows = [...observedCodes]
  .map((k) => {
    const [appId, code] = k.split("|");
    const seen = out.apps[appId].allTimeByCode[code];
    return `<tr>
  <td><span class="pill warn">unregistered</span><span class="sub"> · ${esc(appId)}</span></td>
  <td><code>${esc(code)}</code></td>
  <td class="muted">on no printed piece we know of</td>
  <td class="num">${seen.arrivals}</td>
  <td class="num">${seen.signedUp}</td>
  <td>first ${day(seen.firstSeen)}</td>
</tr>`;
  })
  .join("");

const gapCards = ["qr_campaign_capture", "anon_visitor_exclusions", "upgrade_unconfirmed"]
  .filter((id) => GAPS[id])
  .map((id) => {
    const g = GAPS[id];
    return `<div class="gap" id="gap-${esc(id)}">
  <div class="gh"><code>${esc(id)}</code> <span class="pill st-${esc(g.status)}">${esc(g.status)}</span></div>
  <div class="gt">${esc(g.title)}</div>
  <p class="gd">${esc(g.detail)}</p>
  <p class="gdir"><strong>Effect on the numbers above:</strong> ${esc(g.direction)}</p>
</div>`;
  })
  .join("");

const headline = (() => {
  const w = DEFAULT_WINDOW;
  const tot = appList.reduce(
    (acc, app) => {
      const t = out.apps[app.id].byWindow[w].totals;
      acc.arrivals += t.arrivals;
      acc.people += t.people;
      acc.signedUp += t.signedUp;
      acc.codes += t.campaigns;
      return acc;
    },
    { arrivals: 0, people: 0, signedUp: 0, codes: 0 },
  );
  if (!tot.arrivals) {
    return `<p class="headline zero">No printed code has been scanned yet — <strong>0 arrivals</strong> across all ${appList.length} apps, all time.
    Capture landed 2026-08-13 and is verified against real rows; what has not happened is a scan of a printed piece by somebody who is not us.
    Read the capture table below before reading this zero as a verdict on the print.</p>`;
  }
  return `<p class="headline"><strong>${tot.arrivals}</strong> arrival${tot.arrivals === 1 ? "" : "s"} from ${tot.codes} campaign code${tot.codes === 1 ? "" : "s"},
  <strong>${tot.people}</strong> ${tot.people === 1 ? "person" : "people"}, <strong>${tot.signedUp}</strong> of whom became member${tot.signedUp === 1 ? "" : "s"}. All time.</p>`;
})();

const skipNote = skipped.length
  ? `<p class="note warnline"><strong>${skipped.join(", ")} skipped.</strong> No analytics spine reached on ${skipped.length === 1 ? "its" : "their"} project, so ${skipped.length === 1 ? "it is" : "they are"} missing from this report rather than reported as zero.</p>`
  : "";

const registryNote = registry.found
  ? `Read from <code>${esc(registry.path)}</code> — ${registry.campaigns.length} printed campaign${registry.campaigns.length === 1 ? "" : "s"}${
      registry.declared && registry.declared !== registry.campaigns.length ? ` <span class="pill warn">${registry.declared} declared, ${registry.campaigns.length} parsed — this table is incomplete</span>` : ""
    }.`
  : `<span class="pill warn">registry not found</span> at <code>${esc(registry.path)}</code>, so every observed code below reads as unregistered and no printed-but-unscanned code can be listed at all.`;

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Print &amp; QR campaigns — did the paper produce members?</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; --bar-2:#86b6ef;
  --grid:rgba(11,11,11,0.09); --warn:#b45309; --ok:#2f7d32; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-2:#184f95;
  --grid:rgba(255,255,255,0.10); --warn:#eda100; --ok:#7bbd7f; } }
:root[data-theme="dark"] { color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff;
  --ink-2:#c3c2b7; --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; --bar-2:#184f95;
  --grid:rgba(255,255,255,0.10); --warn:#eda100; --ok:#7bbd7f; }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
h1{font-size:22px;margin:0 0 2px} h2{font-size:17px;margin:30px 0 4px} h3{font-size:14px;margin:22px 0 4px;color:var(--ink-2)}
.meta{color:var(--muted);font-size:13px;margin:0 0 12px}
.headline{background:var(--surface);border:1px solid var(--border);border-left:3px solid var(--bar);
  border-radius:10px;padding:12px 14px;font-size:14px;margin:14px 0}
.headline.zero{border-left-color:var(--warn)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:10px}
.tile{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.tile .k{font-size:12px;color:var(--ink-2)}
.tile .value{font-size:28px;font-weight:650}
.tile .value.zero{color:var(--muted)}
.tile .sub,.sub{color:var(--muted);font-size:12px}
.note{color:var(--muted);font-size:12.5px;margin:10px 0}
.note.warnline{color:var(--warn)}
.chart{margin:14px 0 4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
.chart svg{width:100%;height:auto;display:block}
.chart figcaption{color:var(--muted);font-size:12px;margin-top:6px}
.grid{stroke:var(--grid);stroke-width:1}
.atick{fill:var(--muted);font-size:10px}
.alab{font-size:10px}
.blab{fill:var(--ink-2);font-size:11.5px}
.bval{fill:var(--ink-2);font-size:11px;font-variant-numeric:tabular-nums}
.bar-a{fill:var(--bar-2)} .bar-s{fill:var(--bar);stroke:var(--surface);stroke-width:2}
.key{margin-right:12px;white-space:nowrap}
.sw{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:baseline}
.sw-a{background:var(--bar-2)} .sw-s{background:var(--bar)}
.tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px;background:var(--surface);
  border:1px solid var(--border);border-radius:10px;overflow:hidden}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
.tbl th{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);font-weight:600}
.tbl tr:last-child td{border-bottom:0}
.tbl .num{text-align:right;font-variant-numeric:tabular-nums}
.pill{display:inline-block;font-size:10.5px;padding:1px 6px;border-radius:20px;border:1px solid var(--border);color:var(--muted)}
.pill.warn{color:var(--warn);border-color:var(--warn)}
.pill.ok{color:var(--ok);border-color:var(--ok)}
.pill.st-landed{color:var(--warn);border-color:var(--warn)}
.pill.st-open{color:var(--warn);border-color:var(--warn)}
.pill.st-fixed{color:var(--ok);border-color:var(--ok)}
.empty{color:var(--muted);font-style:italic;font-size:13px}
.muted{color:var(--muted)}
code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;color:var(--muted)}
.gap{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin:10px 0}
.gh{display:flex;gap:8px;align-items:center;margin-bottom:2px}
.gt{font-weight:600;font-size:13.5px}
.gd,.gdir{font-size:12.5px;color:var(--ink-2);margin:6px 0 0}
section{scroll-margin-top:60px}
</style>
<main>
<h1>Print &amp; QR campaigns</h1>
<p class="meta">Did a printed piece produce members? Every static QR code bakes its campaign into the URL,
the four emitters keep that <code>?code=</code> on the first page view, and this lane follows the person forward:
arrived &rarr; went further &rarr; became a member &rarr; came back. Hover any number for who is behind it.
Collected ${esc(collectedAt)}.</p>

${headline}
${skipNote}

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes arrivals by when the code was scanned")}

${appList.map(appBlock).join("\n")}

<h2>Printed codes, and whether anyone scanned them</h2>
<p class="note">Ground truth for what physically exists on paper. ${registryNote}
This table is <strong>all-time and does not move with the window toggle</strong> — a card printed in one month and
scanned the next is the normal case, not an anomaly. A registered code with no arrival is the honest
"printed, not yet scanned"; a code in the data that is on no paper is the other finding, listed below it.</p>
<table class="tbl"><thead><tr>
  <th>Campaign</th><th>Code</th><th>Piece</th><th class="num">Arrivals</th><th class="num">Members</th><th>First seen</th>
</tr></thead><tbody>${registryRows || `<tr><td colspan="6" class="empty">No printed campaigns could be read.</td></tr>`}${strayRows}</tbody></table>

<h2>Can a scan be seen at all?</h2>
<p class="note">Instrumentation coverage, counted over <strong>ALL traffic including our own, all time</strong> — deliberately,
because whether a landing route can be recorded is a property of the deployed code, not of who used the app.
Filtering it would report a hand-verified scan as broken capture. This table does not move with the window toggle.</p>
<table class="tbl"><thead><tr>
  <th>App</th><th class="num">Sessions</th><th class="num">With a landing route</th><th class="num">With a code</th><th class="num">With a device id</th><th>Capture</th>
</tr></thead><tbody>${captureRows}</tbody></table>

<h2>What this cannot say yet</h2>
${gapCards}

<p class="note">Definitions, so no number here is ambiguous. <strong>Arrival</strong>: one session whose first
page view carried a campaign code — a person who scans twice is two arrivals and one person.
<strong>Went further</strong>: that session recorded more than the landing view, so it did not bounce.
<strong>Became a member</strong>: somebody who arrived without an account and now has a real identity, read from
ground truth (the auth user is no longer anonymous, or the signed-out session was claimed) rather than from the
signup event, which fires before an email is confirmed. <strong>Came back</strong>: a later session by the same
person — the same person key the events lane uses, which for a signed-out visitor is their device, and a device
is not a person.</p>
</main>
${hoverLayer(rosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

mkdirSync(dirname(HTML_FILE), { recursive: true });
writeFileSync(HTML_FILE, html);

// ---------- markdown ----------
// Counts only and no identity, so it is committed: marketing-studio reads this file
// rather than the gitignored HTML.

const md = [];
md.push(`# Print & QR campaigns`, ``, `Collected ${collectedAt}. All-time unless a window is named.`, ``);
{
  const tot = appList.reduce((n, app) => n + out.apps[app.id].byWindow[ALL_WINDOW].totals.arrivals, 0);
  md.push(
    tot
      ? `**${tot} campaign arrival${tot === 1 ? "" : "s"}** across ${appList.length} apps.`
      : `**No printed code has been scanned yet.** Capture is landed and verified against real rows; what has not happened is a real scan. Read the coverage table before reading this as a verdict on the print.`,
    ``,
  );
}
if (skipped.length) md.push(`> **${skipped.join(", ")} skipped** — no analytics spine reached; missing, not zero.`, ``);
for (const app of appList) {
  const a = out.apps[app.id];
  const d = a.byWindow[ALL_WINDOW];
  md.push(`## ${app.name}`, ``);
  if (!d.campaigns.length) {
    const t0 = d.totals;
    const aside =
      t0.excludedArrivals || t0.verificationArrivals
        ? ` Excluded from that zero: ${t0.excludedArrivals} arrival(s) from our own/QA accounts, ${t0.verificationArrivals} verification scan(s) of our own.`
        : "";
    md.push(`No campaign-tagged arrival, all time.${aside}${captureLine(app.id).replace(/<[^>]+>/g, "")}`, ``);
    continue;
  }
  md.push(`| Campaign | Code | Arrivals | People | Went further | Became members | Came back |`, `| --- | --- | ---: | ---: | ---: | ---: | ---: |`);
  for (const c of d.campaigns) {
    md.push(`| ${c.label ?? "(unregistered)"} | \`${c.code}\` | ${c.arrivals} | ${c.people} | ${c.stayed} | ${c.signedUp} | ${c.returned} |`);
  }
  md.push(``);
  const t = d.totals;
  if (t.excludedArrivals || t.verificationArrivals) {
    md.push(`Excluded from the above: ${t.excludedArrivals} from our own/QA accounts, ${t.verificationArrivals} verification scan(s).`, ``);
  }
}
md.push(`## Printed codes`, ``, `| Campaign | App | Code | Piece | Arrivals | Members |`, `| --- | --- | --- | --- | ---: | ---: |`);
for (const c of registry.campaigns) {
  const seen = out.apps[c.app]?.allTimeByCode?.[c.code];
  md.push(`| ${c.label} | ${c.app} | \`${c.code}\` | ${c.piece ?? "—"} | ${seen?.arrivals ?? 0} | ${seen?.signedUp ?? 0} |`);
}
md.push(``, `## Can a scan be seen at all?`, ``, `All traffic, all time, exclusions included — capture is a property of the deployed code.`, ``);
md.push(`| App | Sessions | With landing route | With a code | With device id | Capture |`, `| --- | ---: | ---: | ---: | ---: | --- |`);
for (const app of APPS) {
  const c = capture[app.id];
  if (!c) {
    md.push(`| ${app.name} | — | — | — | — | no spine reached (missing, not zero) |`);
    continue;
  }
  const state = Number(c.with_code)
    ? `a code was recorded ${day(c.first_code)}`
    : Number(c.with_landing)
      ? "routes yes, never a code — a zero cannot be told from an unshipped build"
      : "no landing route ever";
  md.push(`| ${app.name} | ${c.sessions} | ${c.with_landing} | ${c.with_code} | ${c.with_device} | ${state} |`);
}
md.push(``);
writeFileSync(MD_FILE, `${md.join("\n")}\n`);

// ---------- console ----------

const totalArrivals = appList.reduce((n, app) => n + out.apps[app.id].byWindow[ALL_WINDOW].totals.arrivals, 0);
const totalMembers = appList.reduce((n, app) => n + out.apps[app.id].byWindow[ALL_WINDOW].totals.signedUp, 0);
console.log(
  `Campaigns  ${totalArrivals} arrival${totalArrivals === 1 ? "" : "s"} all-time across ${appList.length} app${appList.length === 1 ? "" : "s"}` +
    `  ·  ${totalMembers} became members  ·  ${registry.campaigns.length} printed code${registry.campaigns.length === 1 ? "" : "s"} in the registry`,
);
for (const app of APPS) {
  const c = capture[app.id];
  if (!c) continue;
  const v = appList.some((a) => a.id === app.id) ? out.apps[app.id].byWindow[ALL_WINDOW].totals : null;
  console.log(
    `  ${app.name.padEnd(12)} landing routes ${String(c.with_landing).padStart(4)}/${String(c.sessions).padEnd(5)}` +
      ` codes ${String(c.with_code).padStart(3)}` +
      (v ? `  arrivals ${v.arrivals} (${v.verificationArrivals} verification, ${v.excludedArrivals} ours)` : ""),
  );
}
console.log(`\nWrote ${DATA_FILE}`);
console.log(`Wrote ${ROSTER_FILE} (gitignored - contains identity)`);
console.log(`Wrote reports/campaigns.html and reports/campaigns.md`);
