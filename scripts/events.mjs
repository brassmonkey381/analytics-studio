// Events lane: ingest public.analytics_sessions + public.analytics_events from
// the shared michi/tcgscan project, and turn them into (a) per-session user
// journeys and (b) aggregate funnels, cohorts and instrumentation coverage.
//
// The stream is instrumented by the sister repo (tcgscan/michi-maker migration
// 20260805100000_analytics_events.sql). Both apps write to the same two tables
// and are told apart by the `app` column.
//
// Volume is deliberately pulled raw rather than aggregated in SQL: the whole
// point of a journey view is the ordered detail, and there is a hard row cap so
// a runaway table can never blow up the run. Everything else is derived in JS,
// which keeps the questions in config/events.json instead of in SQL strings.
//
// Two outputs, split by whether they can be committed:
//   data/events.json   — counts and rates only. No emails, no user ids. Committed.
//   data/journeys.json — journeys with account emails. Gitignored.

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, isoDate, exclusionCte } from "./lib/studio.mjs";

const CFG = readConfig("events.json");
const DATA_FILE = join(ROOT, "data", "events.json");
const JOURNEYS_FILE = join(ROOT, "data", "journeys.json");

loadEnv();

const WINDOW_DAYS = CFG.windowDays ?? 30;
const PROJECT = CFG.projectRef;
const ROW_CAP = 50_000;

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the events lane needs Management API access.");
  process.exit(1);
}

// ---------- fetch ----------

// One exclusion CTE per studio app id, unioned: a user excluded for either app
// on this shared project is excluded from the whole stream. The two lists are
// currently identical, but they are allowed to diverge and this keeps working.
function excludedUnionCte() {
  const ids = CFG.apps.map((a) => a.id);
  const parts = ids.map((id, i) => exclusionCte(id).replace(/^excluded_users as \(/, `ex_${i} as (`));
  const union = ids.map((_, i) => `select id from ex_${i}`).join("\n  union\n  ");
  return [...parts, `excluded_users as (\n  ${union}\n)`].join(",\n");
}

// Sessions carry the identity. `excluded` rides along rather than filtering in
// SQL so the report can state how much was dropped instead of silently shrinking.
const sessionsSql = `
with ${excludedUnionCte()}
select
  s.id, s.user_id, s.app, s.is_guest, s.platform, s.app_version,
  s.started_at, s.last_seen_at,
  u.email, coalesce(u.is_anonymous, false) as anon, u.created_at as user_created_at,
  pr.username, pr.display_name,
  (s.user_id in (select id from excluded_users)) as excluded
from public.analytics_sessions s
left join auth.users u on u.id = s.user_id
left join public.profiles pr on pr.id = s.user_id
where s.started_at >= now() - interval '${WINDOW_DAYS} days'
order by s.started_at
limit ${ROW_CAP}`;

const eventsSql = `
with ${excludedUnionCte()}
select
  e.id, e.user_id, e.session_id, e.app, e.name, e.props, e.ts,
  (e.user_id in (select id from excluded_users)) as excluded
from public.analytics_events e
where e.ts >= now() - interval '${WINDOW_DAYS} days'
order by e.ts
limit ${ROW_CAP}`;

// Ground truth for the monetization stages. Read over ALL time, not the window:
// a trial started before instrumentation existed is still a trial, and the
// event stream has no way to know about it.
function truthSql(kind) {
  const specs = CFG.truth?.[kind] ?? [];
  if (!specs.length) return null;
  const parts = specs.map((s) => {
    const where = s.filter ? ` where ${s.filter}` : "";
    return `select '${s.app}'::text as app, t.${s.userCol} as user_id, t.${s.tsCol} as ts from public.${s.table} t${where}`;
  });
  return `
with ${excludedUnionCte()},
rows as (
${parts.join("\nunion all\n")}
)
select r.app, r.user_id, r.ts, u.email,
  (r.user_id in (select id from excluded_users)) as excluded
from rows r left join auth.users u on u.id = r.user_id
order by r.ts`;
}

// ---------- helpers ----------

const TAX = CFG.taxonomy ?? {};
const ROUTES = CFG.routes ?? {};
const pricingRoutes = new Set(
  Object.entries(ROUTES).filter(([, v]) => v.intent === "pricing").map(([k]) => k),
);

function labelFor(name) {
  return TAX[name]?.label ?? name;
}

// Dynamic route segments (/binder/<uuid>) are collapsed so route counts group.
function normalizeRoute(route) {
  if (typeof route !== "string" || !route) return null;
  return route
    .split("/")
    .map((seg) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
        ? ":id"
        : /^\d+$/.test(seg)
          ? ":n"
          : seg,
    )
    .join("/");
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}

// How a person is named in a hover roster. @username first — that is what the
// apps show and what Brian asked to see; the rest are fallbacks so a row is
// never anonymous-by-accident. Guests genuinely have no name, so they are
// numbered by a short id stub rather than collapsed into one "(guest)" entry,
// which would make four guests look like one person.
function userLabel(u) {
  if (u.username) return `@${u.username}`;
  if (u.displayName) return u.displayName;
  if (u.anon) return `guest ${u.id.slice(0, 8)}`;
  return u.email ?? u.id.slice(0, 8);
}

// Rosters are stored capped: a 30-day window on a healthy app is thousands of
// people, and nobody reads past the first screen of a tooltip. The true count
// travels alongside so the report can say "+N more" honestly instead of
// implying the cap is the total.
const ROSTER_STORE_CAP = 60;

// Deduped: callers pass raw id lists (one per session, one per event) as often
// as they pass user sets, and a roster is always a list of people.
function roster(ids, identity) {
  const names = [...new Set(ids)]
    .map((id) => userLabel(identity.get(id) ?? { id }))
    .sort((a, b) => a.localeCompare(b));
  return { total: names.length, names: names.slice(0, ROSTER_STORE_CAP) };
}

// ---------- main ----------

const [sessionRows, eventRows] = await Promise.all([
  runSql(PROJECT, sessionsSql),
  runSql(PROJECT, eventsSql),
]);

const truth = {};
for (const kind of Object.keys(CFG.truth ?? {})) {
  const sql = truthSql(kind);
  truth[kind] = sql ? await runSql(PROJECT, sql) : [];
}

if (sessionRows.length >= ROW_CAP || eventRows.length >= ROW_CAP) {
  console.warn(`WARNING: hit the ${ROW_CAP}-row cap — the window is truncated and every count below is a floor.`);
}

const collectedAt = new Date().toISOString();
// Every window is cut from the SAME fetch. Four round trips would be four
// slightly different "now"s, and the 24h number would disagree with the 30d
// one about what happened in the last minute.
const WINDOWS = CFG.windows ?? [1, 7, 14, 30];
const NOW = Date.now();
const out = { collectedAt, windowDays: WINDOW_DAYS, windows: WINDOWS, apps: {} };
const journeys = { collectedAt, windowDays: WINDOW_DAYS, windows: WINDOWS, apps: {} };

// One computation, run once per window. Returns the aggregates (safe to commit)
// and a parallel rosters object (identity-bearing, gitignored) whose keys match
// the aggregates one-for-one, so every number on the page has a "who" behind it.
function computeWindow(key, allSessionsIn, allEventsIn, days, identity) {
  const cutoff = NOW - days * 86400_000;
  const inWin = (ts) => Date.parse(ts) >= cutoff;
  const allSessions = allSessionsIn.filter((s) => inWin(s.started_at));
  const allEvents = allEventsIn.filter((e) => inWin(e.ts));
  const sessions = allSessions.filter((s) => !s.excluded);
  const events = allEvents.filter((e) => !e.excluded);
  const rosters = { funnels: {}, events: {}, routes: {}, tiles: {} };

  // --- events per session, and the ordered journey ---
  const bySession = new Map();
  for (const s of sessions) bySession.set(s.id, { session: s, events: [] });
  let orphanEvents = 0;
  for (const e of events) {
    const bucket = e.session_id ? bySession.get(e.session_id) : null;
    if (bucket) bucket.events.push(e);
    else orphanEvents++;
  }

  // --- per-user rollup ---
  // Seeded from BOTH sessions and events in the window. On a short window a
  // session can have started before the cutoff while its events land inside it;
  // seeding from sessions alone would drop those people entirely.
  const byUser = new Map();
  const userOf = (id) => {
    if (!byUser.has(id)) {
      const ident = identity.get(id) ?? {};
      byUser.set(id, { id, anon: !!ident.anon, names: new Set(), routes: new Set(), sessions: [] });
    }
    return byUser.get(id);
  };
  for (const s of sessions) userOf(s.user_id).sessions.push(s.id);
  for (const e of events) {
    const u = userOf(e.user_id);
    u.names.add(e.name);
    if (e.name === "page.view") {
      const r = normalizeRoute(e.props?.route);
      if (r) u.routes.add(r);
    }
  }

  // --- ground truth, per user ---
  // Read over ALL history on purpose, never windowed. The question a funnel is
  // asking is "of the people active in this period, how many hold a trial",
  // not "how many started one in the last 24 hours" — and a trial predating
  // instrumentation is still a trial.
  const truthUsers = {};
  for (const [kind, rows] of Object.entries(truth)) {
    truthUsers[kind] = new Set(rows.filter((r) => r.app === key && !r.excluded).map((r) => r.user_id));
  }

  // --- funnels ---
  // A stage counts a user only if they cleared every earlier stage, so the
  // difference between two rows is a genuine drop-off rather than two
  // independent populations that happen to be printed next to each other.
  const funnels = [];
  for (const f of (CFG.funnels ?? []).filter((f) => (f.apps ?? []).includes(key))) {
    let carried = new Set(byUser.keys());
    if (f.stages[0]?.match === "guest") {
      carried = new Set([...byUser.values()].filter((u) => u.anon).map((u) => u.id));
    }
    const stages = [];
    const denom = carried.size;
    for (const st of f.stages) {
      let next;
      if (st.match === "guest") {
        next = new Set([...carried].filter((id) => byUser.get(id).anon));
      } else if (st.match === "route") {
        const want = new Set(st.routes.map(normalizeRoute));
        next = new Set([...carried].filter((id) => [...byUser.get(id).routes].some((r) => want.has(r))));
      } else if (st.match === "truth") {
        const t = truthUsers[st.truth] ?? new Set();
        next = new Set([...carried].filter((id) => t.has(id)));
      } else {
        const want = new Set(st.names);
        next = new Set([...carried].filter((id) => [...byUser.get(id).names].some((n) => want.has(n))));
      }
      stages.push({
        id: st.id,
        label: st.label,
        users: next.size,
        ofPrev: pct(next.size, carried.size),
        ofTop: pct(next.size, denom),
        caveat: st.caveat ?? null,
      });
      rosters.funnels[`${f.id}|${st.id}`] = roster(next, identity);
      carried = next;
    }
    funnels.push({ id: f.id, title: f.title, question: f.question, stages });
  }

  // --- event / route / day rollups ---
  const byName = {};
  for (const e of events) {
    const b = (byName[e.name] ??= { name: e.name, label: labelFor(e.name), stage: TAX[e.name]?.stage ?? null, count: 0, users: new Set(), known: e.name in TAX });
    b.count++;
    b.users.add(e.user_id);
  }
  const eventsByName = Object.values(byName)
    .map((b) => {
      rosters.events[b.name] = roster(b.users, identity);
      return { ...b, users: b.users.size };
    })
    .sort((a, b) => b.count - a.count);

  const byRoute = {};
  for (const e of events.filter((e) => e.name === "page.view")) {
    const r = normalizeRoute(e.props?.route);
    if (!r) continue;
    const b = (byRoute[r] ??= { route: r, label: ROUTES[r]?.label ?? null, intent: ROUTES[r]?.intent ?? null, count: 0, users: new Set() });
    b.count++;
    b.users.add(e.user_id);
  }
  const routes = Object.values(byRoute)
    .map((b) => {
      rosters.routes[b.route] = roster(b.users, identity);
      return { ...b, users: b.users.size };
    })
    .sort((a, b) => b.count - a.count);

  const byDay = {};
  for (let i = days - 1; i >= 0; i--) {
    byDay[isoDate(new Date(Date.now() - i * 86400_000))] = { sessions: 0, events: 0, users: new Set() };
  }
  for (const s of sessions) {
    const d = s.started_at.slice(0, 10);
    if (byDay[d]) byDay[d].sessions++;
  }
  for (const e of events) {
    const d = e.ts.slice(0, 10);
    if (byDay[d]) { byDay[d].events++; byDay[d].users.add(e.user_id); }
  }
  const daily = Object.entries(byDay).map(([day, v]) => ({ day, sessions: v.sessions, events: v.events, users: v.users.size }));

  // --- session shape ---
  const durations = sessions.map((s) => Math.max(0, (Date.parse(s.last_seen_at) - Date.parse(s.started_at)) / 1000));
  durations.sort((a, b) => a - b);
  const median = durations.length ? durations[Math.floor(durations.length / 2)] : null;
  const platforms = {};
  for (const s of sessions) platforms[s.platform ?? "unknown"] = (platforms[s.platform ?? "unknown"] ?? 0) + 1;

  const bounced = [...bySession.values()].filter((b) => b.events.filter((e) => e.name !== "session.start").length === 0).length;

  const realIds = [...byUser.values()].filter((u) => !u.anon).map((u) => u.id);
  const guestIds = [...byUser.values()].filter((u) => u.anon).map((u) => u.id);
  rosters.tiles.users = roster(byUser.keys(), identity);
  rosters.tiles.realUsers = roster(realIds, identity);
  rosters.tiles.guestUsers = roster(guestIds, identity);
  rosters.tiles.sessions = roster(sessions.map((s) => s.user_id), identity);
  rosters.tiles.events = roster(events.map((e) => e.user_id), identity);
  rosters.tiles.bounced = roster(
    [...bySession.values()].filter((b) => b.events.filter((e) => e.name !== "session.start").length === 0).map((b) => b.session.user_id),
    identity,
  );

  // Where the event stream and the ground truth disagree. The stream can only
  // know about things that happened after instrumentation shipped, so a truth
  // row with no matching event is expected for old rows and a real miss for new
  // ones — the report shows both counts rather than picking one.
  const truthCheck = {};
  for (const [kind, rows] of Object.entries(truth)) {
    const mine = rows.filter((r) => r.app === key && !r.excluded);
    const evName = kind === "trial" ? "trial.start" : null;
    const withEvent = evName ? new Set(events.filter((e) => e.name === evName).map((e) => e.user_id)) : new Set();
    truthCheck[kind] = {
      users: new Set(mine.map((r) => r.user_id)).size,
      excludedUsers: new Set(rows.filter((r) => r.app === key && r.excluded).map((r) => r.user_id)).size,
      untracked: evName ? mine.filter((r) => !withEvent.has(r.user_id)).length : null,
      earliest: mine.length ? mine[0].ts : null,
    };
  }

  return {
    result: {
      windowDays: days,
      totals: {
        sessions: sessions.length,
        events: events.length,
        users: byUser.size,
        realUsers: realIds.length,
        guestUsers: guestIds.length,
        excludedSessions: allSessions.length - sessions.length,
        excludedEvents: allEvents.length - events.length,
        orphanEvents,
        bouncedSessions: bounced,
        medianSessionSecs: median,
        platforms,
        firstEventAt: events.length ? events[0].ts : null,
      },
      daily,
      eventsByName,
      routes,
      funnels,
      truth: truthCheck,
    },
    rosters,
  };
}

for (const app of CFG.apps) {
  const key = app.key;
  const appSessions = sessionRows.filter((s) => s.app === key);
  const appEvents = eventRows.filter((e) => e.app === key);

  // Identity is built from the FULL fetch, never per window: a person who
  // appears in the 24h slice must still resolve to a name even if the session
  // that carries their profile row started three weeks ago.
  const identity = new Map();
  for (const s of appSessions) {
    if (!identity.has(s.user_id)) {
      identity.set(s.user_id, {
        id: s.user_id,
        email: s.email,
        username: s.username,
        displayName: s.display_name,
        anon: !!s.anon,
      });
    }
  }

  const windows = {};
  const windowRosters = {};
  for (const days of WINDOWS) {
    const { result, rosters } = computeWindow(key, appSessions, appEvents, days, identity);
    windows[days] = result;
    windowRosters[days] = rosters;
  }
  const widest = windows[Math.max(...WINDOWS)];

  // --- instrumentation coverage ---
  // Window-independent on purpose. Whether a track() call site can fire is a
  // property of the code, so asking it of the last 24 hours would report every
  // rarely-used path as broken. Computed over ALL traffic, excluded accounts
  // included, for the same reason: our own QA pass is what proves a call site
  // works. `neverFiredReal` keeps the behavioural view separate.
  // `planned` names are specced but not built yet. They are kept out of the
  // "never fired" list, which is a bug signal — an event nobody has written
  // cannot have a broken call site, and mixing the two hides the real ones.
  const declaredAll = Object.entries(TAX).filter(([, v]) => (v.apps ?? []).includes(key));
  const declared = declaredAll.filter(([, v]) => !v.planned).map(([n]) => n);
  const planned = declaredAll.filter(([, v]) => v.planned).map(([n]) => n);
  const seenAny = new Set(appEvents.map((e) => e.name));
  const seenReal = new Set(appEvents.filter((e) => !e.excluded).map((e) => e.name));
  const neverFired = declared.filter((n) => !seenAny.has(n));
  const neverFiredReal = declared.filter((n) => seenAny.has(n) && !seenReal.has(n));
  // A planned event that has started firing has shipped — say so, so the gap
  // list and the data cannot disagree about what is done.
  const plannedLanded = planned.filter((n) => seenAny.has(n));
  const unrecognised = [...seenAny].filter((n) => !(n in TAX));

  out.apps[app.id] = {
    name: app.name,
    eventKey: key,
    windows,
    coverage: {
      declared: declared.length,
      fired: declared.length - neverFired.length,
      neverFired,
      neverFiredReal,
      planned,
      plannedLanded,
      unrecognised,
    },
  };

  // Journeys: identity-bearing, gitignored. Newest session first — that is the
  // order anyone actually reads them in. Not windowed: the report filters these
  // client-side by timestamp when the toggle moves, so one copy serves all four.
  const sessions = appSessions.filter((s) => !s.excluded);
  const events = appEvents.filter((e) => !e.excluded);
  const bySession = new Map();
  for (const s of sessions) bySession.set(s.id, { session: s, events: [] });
  for (const e of events) bySession.get(e.session_id)?.events.push(e);

  journeys.apps[app.id] = {
    name: app.name,
    rosters: windowRosters,
    sessions: [...bySession.values()]
      .sort((a, b) => (a.session.started_at < b.session.started_at ? 1 : -1))
      .map(({ session: s, events: evs }) => ({
        id: s.id,
        user: userLabel(identity.get(s.user_id) ?? { id: s.user_id }),
        email: s.email ?? null,
        userId: s.user_id.slice(0, 8),
        guest: s.anon || s.is_guest,
        platform: s.platform,
        appVersion: s.app_version,
        startedAt: s.started_at,
        lastSeenAt: s.last_seen_at,
        durationSecs: Math.max(0, Math.round((Date.parse(s.last_seen_at) - Date.parse(s.started_at)) / 1000)),
        events: evs.map((e) => ({
          name: e.name,
          label: labelFor(e.name),
          milestone: TAX[e.name]?.milestone === true,
          pricing: e.name === "page.view" && pricingRoutes.has(normalizeRoute(e.props?.route)),
          ts: e.ts,
          props: e.props && Object.keys(e.props).length ? e.props : null,
        })),
      })),
  };

  const t = widest.totals;
  const short = windows[Math.min(...WINDOWS)].totals;
  console.log(
    `${app.name.padEnd(12)} ${String(t.sessions).padStart(4)} sessions  ${String(t.events).padStart(5)} events  ` +
      `${t.realUsers} account${t.realUsers === 1 ? "" : "s"} + ${t.guestUsers} guest${t.guestUsers === 1 ? "" : "s"}  ` +
      `(${Math.min(...WINDOWS) * 24}h: ${short.sessions} sess / ${short.events} ev` +
      ` · excluded: ${t.excludedSessions} sessions / ${t.excludedEvents} events)`,
  );
}

// History: keep prior days' rollups so the lane accumulates a record even
// though the source tables are read live each run.
let store = { history: {} };
if (existsSync(DATA_FILE)) {
  try { store = JSON.parse(readFileSync(DATA_FILE, "utf8")); } catch { /* start fresh on a corrupt file */ }
}
store.collectedAt = out.collectedAt;
store.windowDays = out.windowDays;
store.windows = out.windows;
store.apps = out.apps;
store.history ??= {};
for (const [id, a] of Object.entries(out.apps)) {
  for (const d of a.windows[Math.max(...WINDOWS)].daily) {
    if (d.sessions || d.events) ((store.history[id] ??= {})[d.day] = { sessions: d.sessions, events: d.events, users: d.users });
  }
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
console.log(`\nWrote ${DATA_FILE}`);
writeFileSync(JOURNEYS_FILE, JSON.stringify(journeys, null, 2));
console.log(`Wrote ${JOURNEYS_FILE} (gitignored - contains emails)`);
