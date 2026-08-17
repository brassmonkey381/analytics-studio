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

import { ROOT, loadEnv, readConfig, runSql, isoDate, dayOf, exclusionCte } from "./lib/studio.mjs";

const CFG = readConfig("events.json");
const DATA_FILE = join(ROOT, "data", "events.json");
const JOURNEYS_FILE = join(ROOT, "data", "journeys.json");

loadEnv();

const WINDOW_DAYS = CFG.windowDays ?? 30;
const ROW_CAP = 50_000;

// Apps live on more than one Supabase project now: michi/tcgscan share CFG.projectRef, while
// doggle and pickleague each carry their own spine (per-app `projectRef` override). Every app on
// one project is fetched in one query pair, so all of a project's windows still cut from the
// same "now".
const PROJECT_GROUPS = new Map();
for (const app of CFG.apps) {
  const ref = app.projectRef ?? CFG.projectRef;
  if (!PROJECT_GROUPS.has(ref)) PROJECT_GROUPS.set(ref, []);
  PROJECT_GROUPS.get(ref).push(app);
}

if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("No SUPABASE_ACCESS_TOKEN in .env — the events lane needs Management API access.");
  process.exit(1);
}

// ---------- fetch ----------

// One exclusion CTE per studio app id on the project, unioned: a user excluded
// for either app on a shared project is excluded from the whole stream. The
// lists are currently identical, but they are allowed to diverge and this
// keeps working.
function excludedUnionCte(apps) {
  const ids = apps.map((a) => a.id);
  const parts = ids.map((id, i) => exclusionCte(id).replace(/^excluded_users as \(/, `ex_${i} as (`));
  const union = ids.map((_, i) => `select id from ex_${i}`).join("\n  union\n  ");
  return [...parts, `excluded_users as (\n  ${union}\n)`].join(",\n");
}

// Sessions carry the identity. `excluded` rides along rather than filtering in
// SQL so the report can state how much was dropped instead of silently shrinking.
//
// Per-project differences are absorbed here rather than leaked downstream:
//   - profiles name columns differ (michi: username/display_name; doggle has only
//     display_name; pickleague: username/full_name) — per-app `profile` config maps them.
//   - device_id / landing_route are read through to_jsonb so a project whose
//     migration has not landed yet returns null instead of erroring the lane.
function sessionsSqlFor(apps) {
  const prof = apps.find((a) => a.profile)?.profile ?? { username: "username", displayName: "display_name" };
  const userCol = prof.username ? `pr.${prof.username}` : "null::text";
  const dispCol = prof.displayName ? `pr.${prof.displayName}` : "null::text";
  return `
with ${excludedUnionCte(apps)}
select
  s.id, s.user_id, s.app, s.is_guest, s.platform, s.app_version,
  s.started_at, s.last_seen_at, s.upgraded_at,
  to_jsonb(s)->>'device_id' as device_id,
  to_jsonb(s)->>'landing_route' as landing_route,
  u.email, coalesce(u.is_anonymous, false) as anon, u.created_at as user_created_at,
  ${userCol} as username, ${dispCol} as display_name,
  (s.user_id in (select id from excluded_users)) as excluded
from public.analytics_sessions s
left join auth.users u on u.id = s.user_id
left join public.profiles pr on pr.id = s.user_id
where s.started_at >= now() - interval '${WINDOW_DAYS} days'
order by s.started_at
limit ${ROW_CAP}`;
}

function eventsSqlFor(apps) {
  return `
with ${excludedUnionCte(apps)}
select
  e.id, e.user_id, e.session_id, e.app, e.name, e.props, e.ts,
  (e.user_id in (select id from excluded_users)) as excluded
from public.analytics_events e
where e.ts >= now() - interval '${WINDOW_DAYS} days'
order by e.ts
limit ${ROW_CAP}`;
}

// Ground truth for the monetization stages. Read over ALL time, not the window:
// a trial started before instrumentation existed is still a trial, and the
// event stream has no way to know about it.
function truthSql(kind, apps) {
  const keys = new Set(apps.map((a) => a.key));
  const specs = (CFG.truth?.[kind] ?? []).filter((s) => keys.has(s.app));
  if (!specs.length) return null;
  const parts = specs.map((s) => {
    const where = s.filter ? ` where ${s.filter}` : "";
    return `select '${s.app}'::text as app, t.${s.userCol} as user_id, t.${s.tsCol} as ts from public.${s.table} t${where}`;
  });
  return `
with ${excludedUnionCte(apps)},
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
  // Synthetic person keys (identity-less visits on doggle/pickleague): "visitor", never "guest"
  // — a guest is a minted anonymous ACCOUNT (michi), a visitor is a browser we can only group by
  // device. The stub keeps four visitors from reading as one person.
  if (typeof u.id === "string" && /^(dev|sess|ev):/.test(u.id)) {
    return `visitor ${u.id.slice(u.id.indexOf(":") + 1, u.id.indexOf(":") + 9)}`;
  }
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

const sessionRows = [];
const eventRows = [];
const truth = {};
for (const kind of Object.keys(CFG.truth ?? {})) truth[kind] = [];
const skippedApps = new Set();
for (const [ref, apps] of PROJECT_GROUPS) {
  try {
    const [s, e] = await Promise.all([
      runSql(ref, sessionsSqlFor(apps)),
      runSql(ref, eventsSqlFor(apps)),
    ]);
    sessionRows.push(...s);
    eventRows.push(...e);
  } catch (err) {
    // A project whose spine migration has not landed yet must not kill the whole
    // lane — but it must be LOUD, because a skipped app renders as absent, and
    // absent must never be mistaken for "no traffic".
    if (String(err).includes("does not exist")) {
      console.warn(
        `WARNING: ${apps.map((a) => a.id).join("/")} skipped — analytics tables not on project ${ref} yet ` +
          `(apply the spine migration; see the app repo). These apps will be missing from the report, not zero.`,
      );
      for (const a of apps) skippedApps.add(a.key);
      continue;
    }
    throw err;
  }
  for (const kind of Object.keys(CFG.truth ?? {})) {
    const sql = truthSql(kind, apps);
    if (sql) truth[kind].push(...(await runSql(ref, sql)));
  }
}

// Identity-less rows (doggle/pickleague record signed-out visits with user_id null; michi never
// does — it mints anon auth users instead). Synthesize a PERSON key so the rest of the lane has
// one: the device id when the client sent one (all sessions from one browser/install group into
// one visitor), else the session id (one visitor per session — the honest floor). These are
// VISITORS, not users: a device is not a person (one family iPad = several people; a phone + a
// laptop = one person twice). Events recorded signed-out resolve through their session; a
// claimed session (user_id filled in on sign-in/sign-up) already carries the real uid from the
// fetch, which is exactly the join campaign attribution needs.
for (const s of sessionRows) {
  if (!s.user_id) {
    s.user_id = s.device_id ? `dev:${s.device_id}` : `sess:${s.id}`;
    s.anon = true; // an identity-less visitor is a guest by definition
  }
}
{
  const sessionOf = new Map(sessionRows.map((s) => [s.id, s]));
  for (const e of eventRows) {
    if (e.user_id) continue;
    const s = e.session_id ? sessionOf.get(e.session_id) : null;
    e.user_id = s ? s.user_id : `ev:${e.id}`;
    // An event that inherits its session's IDENTITY must inherit its EXCLUSION with it.
    // Found 2026-08-16: the doggle/pickleague emitters write some events with user_id null
    // even on a signed-in session (the insert lands before the client has the uid). SQL
    // computes `excluded` as `e.user_id in (select ...)`, and NULL in (...) is NULL, not
    // false — so those rows passed the !e.excluded filter, then picked up the session
    // owner's identity here. Two of our own accounts were reappearing in every doggle
    // roster and count that way, from 16 events across one day. Michi/tcgscan were never
    // affected: their events always carry auth.uid().
    if (s?.excluded) e.excluded = true;
  }
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
      // wasGuest falls back to anon for someone seeded from events alone: still
      // anonymous with no session row we can see is still a guest. Synthetic
      // person keys (dev:/sess:/ev: — identity-less visits) are guests by
      // definition, even when seeded from an orphan event with no session row.
      const synthetic = /^(dev|sess|ev):/.test(String(id));
      byUser.set(id, {
        id,
        anon: !!ident.anon || synthetic,
        wasGuest: !!ident.wasGuest || !!ident.anon || synthetic,
        converted: !!ident.wasGuest && !ident.anon,
        names: new Set(),
        routes: new Set(),
        sessions: [],
        views: 0,
      });
    }
    return byUser.get(id);
  };
  for (const s of sessions) userOf(s.user_id).sessions.push(s.id);
  for (const e of events) {
    const u = userOf(e.user_id);
    u.names.add(e.name);
    if (e.name === "page.view") {
      u.views++;
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
      carried = new Set([...byUser.values()].filter((u) => u.wasGuest).map((u) => u.id));
    }
    const stages = [];
    const denom = carried.size;
    for (const st of f.stages) {
      let next;
      if (st.match === "guest") {
        // "was a guest", not "is anonymous now". Matching on the current flag
        // drops everyone who converted — the successes — out of the denominator
        // of the very funnel that measures conversion, so the stage that counts
        // signups could only ever count the ones that did NOT complete.
        next = new Set([...carried].filter((id) => byUser.get(id).wasGuest));
      } else if (st.match === "converted") {
        // Ground truth for the upgrade, and it disagrees with the event on
        // purpose. account.created fires the moment updateUser() returns, but
        // the account is not real until the email is confirmed — an unconfirmed
        // upgrade leaves is_anonymous true forever. Reading the event alone
        // counts abandoned signups as conversions.
        next = new Set([...carried].filter((id) => byUser.get(id).converted));
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
    const d = dayOf(s.started_at);
    if (byDay[d]) byDay[d].sessions++;
  }
  for (const e of events) {
    const d = dayOf(e.ts);
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
  // The population a conversion question is actually about: everyone who ever
  // showed up as a guest, split by whether they got out. everGuest is the only
  // one of the three that does not move when someone signs up.
  const everGuestIds = [...byUser.values()].filter((u) => u.wasGuest).map((u) => u.id);
  const convertedIds = [...byUser.values()].filter((u) => u.converted).map((u) => u.id);
  rosters.tiles.users = roster(byUser.keys(), identity);
  rosters.tiles.realUsers = roster(realIds, identity);
  rosters.tiles.guestUsers = roster(guestIds, identity);
  rosters.tiles.everGuestUsers = roster(everGuestIds, identity);
  rosters.tiles.convertedUsers = roster(convertedIds, identity);
  rosters.tiles.sessions = roster(sessions.map((s) => s.user_id), identity);
  rosters.tiles.events = roster(events.map((e) => e.user_id), identity);
  rosters.tiles.bounced = roster(
    [...bySession.values()].filter((b) => b.events.filter((e) => e.name !== "session.start").length === 0).map((b) => b.session.user_id),
    identity,
  );

  // --- what guests actually do past the open ---
  // "Did anything at all" is one funnel bar hiding four very different people:
  // someone who opened and left, someone who read, someone who wandered, and
  // someone who BUILT something. Only the last is an activation, and lumping
  // them makes a healthy make-rate look like idle traffic. Split explicitly.
  const MAKE = new Set(CFG.guestDepth?.makeEvents ?? []);
  const guestPeople = [...byUser.values()].filter((u) => u.wasGuest);
  const depthOf = (u) => {
    if ([...u.names].some((n) => MAKE.has(n))) return "made";
    if (u.views >= 3) return "explored";
    if ([...u.names].some((n) => n !== "session.start")) return "looked";
    return "openOnly";
  };
  const byDepth = { openOnly: [], looked: [], explored: [], made: [] };
  for (const u of guestPeople) byDepth[depthOf(u)].push(u.id);
  for (const [k, ids] of Object.entries(byDepth)) rosters.tiles[`guestDepth_${k}`] = roster(ids, identity);

  // What guests fire, and what they reach. Counted per PERSON, not per fire —
  // one guest reloading a page ten times is one person who saw it.
  const guestSet = new Set(guestPeople.map((u) => u.id));
  const guestEvents = events.filter((e) => guestSet.has(e.user_id));
  const tally = (rows, keyOf) => {
    const people = new Map();
    const fires = new Map();
    for (const r of rows) {
      const k = keyOf(r);
      if (k == null) continue;
      fires.set(k, (fires.get(k) ?? 0) + 1);
      if (!people.has(k)) people.set(k, new Set());
      people.get(k).add(r.user_id);
    }
    return [...people.entries()]
      .map(([k, s]) => ({ key: k, people: s.size, fires: fires.get(k), ids: [...s] }))
      .sort((a, b) => b.people - a.people || b.fires - a.fires);
  };
  const guestActions = tally(guestEvents.filter((e) => e.name !== "page.view"), (e) => e.name);
  const guestRoutes = tally(guestEvents.filter((e) => e.name === "page.view"), (e) => normalizeRoute(e.props?.route));
  for (const a of guestActions) rosters.events[`guestAction_${a.key}`] = roster(a.ids, identity);
  for (const r of guestRoutes) rosters.routes[`guestRoute_${r.key}`] = roster(r.ids, identity);

  const madeIds = new Set(byDepth.made);
  const guests = {
    people: guestPeople.length,
    sessions: sessions.filter((s) => s.is_guest).length,
    depth: {
      openOnly: byDepth.openOnly.length,
      looked: byDepth.looked.length,
      explored: byDepth.explored.length,
      made: byDepth.made.length,
    },
    converted: guestPeople.filter((u) => u.converted).length,
    // The rate that matters: of the guests who built something, how many stayed.
    convertedOfMade: guestPeople.filter((u) => u.converted && madeIds.has(u.id)).length,
    actions: guestActions.map(({ key, people, fires }) => ({ name: key, label: labelFor(key), people, fires })),
    routes: guestRoutes.slice(0, 20).map(({ key, people, fires }) => ({ route: key, people, fires })),
  };

  // Demand for pricing vs offers actually shown, guests only. These two numbers
  // are computed the same way and are meant to be read against each other: a
  // guest who walks to the pricing page is asking the question, and if the
  // offer count beneath it is zero then nothing answered. Derived rather than
  // written down, so it cannot go stale when the routes or the gating change.
  const pricingRouteSet = new Set(
    Object.entries(CFG.routes ?? {}).filter(([, v]) => v.intent === "pricing").map(([r]) => r),
  );
  const askedIds = new Set(
    guestEvents.filter((e) => e.name === "page.view" && pricingRouteSet.has(normalizeRoute(e.props?.route))).map((e) => e.user_id),
  );
  const offeredIds = new Set(guestEvents.filter((e) => e.name === "pro.offer_shown").map((e) => e.user_id));
  guests.pricing = { asked: askedIds.size, offered: offeredIds.size };
  rosters.tiles.guestAskedPricing = roster([...askedIds], identity);
  rosters.tiles.guestOffered = roster([...offeredIds], identity);

  // --- print/QR campaign attribution ---
  // A campaign session announces itself in landing_route's query part (the emitters append the
  // allowlisted ?code=..&utm_.. of the printed URL — see the marketing-studio request,
  // requests/2026-08-14-print-campaign-attribution.md). Grouped by code, with the three numbers
  // marketing actually asked for: who arrived, who converted mid-session, who SIGNED UP carrying
  // the code (account.created props.code — survives a reload, so it can attribute a signup whose
  // landing session fell outside the window).
  const campaignOf = (s) => {
    const route = s.landing_route ?? "";
    const q = route.indexOf("?");
    if (q < 0) return null;
    try {
      const p = new URLSearchParams(route.slice(q + 1));
      const code = p.get("code") ?? p.get("utm_campaign");
      if (!code) return null;
      return { code, source: p.get("utm_source"), medium: p.get("utm_medium") };
    } catch {
      return null;
    }
  };
  const byCampaign = new Map();
  const campaignBucket = (code) => {
    if (!byCampaign.has(code)) {
      byCampaign.set(code, { code, source: null, medium: null, sessions: 0, people: new Set(), converted: new Set(), signups: new Set() });
    }
    return byCampaign.get(code);
  };
  for (const s of sessions) {
    const c = campaignOf(s);
    if (!c) continue;
    const b = campaignBucket(c.code);
    b.source ??= c.source;
    b.medium ??= c.medium;
    b.sessions++;
    b.people.add(s.user_id);
    if (s.upgraded_at || byUser.get(s.user_id)?.converted) b.converted.add(s.user_id);
  }
  for (const e of events) {
    if (e.name !== "account.created" || !e.props?.code) continue;
    const b = campaignBucket(String(e.props.code));
    b.people.add(e.user_id);
    b.signups.add(e.user_id);
  }
  const campaigns = [...byCampaign.values()]
    .map((b) => {
      rosters.tiles[`campaign_${b.code}`] = roster([...b.people], identity);
      return { code: b.code, source: b.source, medium: b.medium, sessions: b.sessions, people: b.people.size, converted: b.converted.size, signups: b.signups.size };
    })
    .sort((a, b) => b.people - a.people);

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
        everGuestUsers: everGuestIds.length,
        convertedUsers: convertedIds.length,
        guestSessions: sessions.filter((s) => s.is_guest).length,
        upgradeSessions: sessions.filter((s) => s.upgraded_at).length,
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
      guests,
      campaigns,
      truth: truthCheck,
    },
    rosters,
  };
}

for (const app of CFG.apps) {
  const key = app.key;
  if (skippedApps.has(key)) continue; // absent, not zero — warned above
  const appSessions = sessionRows.filter((s) => s.app === key);
  const appEvents = eventRows.filter((e) => e.app === key);

  // Identity is built from the FULL fetch, never per window: a person who
  // appears in the 24h slice must still resolve to a name even if the session
  // that carries their profile row started three weeks ago.
  // Guest-ness has two different tenses and they must not be confused.
  //   anon        — is_anonymous on auth.users, i.e. what they are NOW.
  //   wasGuest    — they opened at least one session as a guest. Stamped on the
  //                 session row at the time and never rewritten, so it survives
  //                 the upgrade. This is history and it is the honest one.
  //   convertedAt — the session that carried them across (upgraded_at).
  // Both apps upgrade a guest IN PLACE (updateUser/linkIdentity keep the same
  // uid), so a converted person's guest-era rows already carry their user_id —
  // the journey is joined for free. What is NOT free is the tense: reading anon
  // alone retro-labels a converted guest as "never was one" and deletes them
  // from every guest population, which is exactly backwards.
  const identity = new Map();
  for (const s of appSessions) {
    if (!identity.has(s.user_id)) {
      identity.set(s.user_id, {
        id: s.user_id,
        email: s.email,
        username: s.username,
        displayName: s.display_name,
        anon: !!s.anon,
        wasGuest: false,
        convertedAt: null,
      });
    }
    const ident = identity.get(s.user_id);
    if (s.is_guest) ident.wasGuest = true;
    if (s.upgraded_at && (!ident.convertedAt || s.upgraded_at < ident.convertedAt)) {
      ident.convertedAt = s.upgraded_at;
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
        // Started as a guest. Stays true on the session that upgraded — that is
        // the point: the row records what they were when they walked in, and
        // upgradedAt records when that stopped being true.
        guest: s.anon || s.is_guest,
        landing: s.landing_route ?? null,
        upgradedAt: s.upgraded_at ?? null,
        converted: !!identity.get(s.user_id)?.convertedAt,
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
