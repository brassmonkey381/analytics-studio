// Daily metrics collector: DAU + new users per app, last N days.
//
// Two execution paths per app, tried in order:
//   1. Management API SQL (needs SUPABASE_ACCESS_TOKEN in .env) — one query
//      per app, can read auth.users and any table.
//   2. PostgREST fallback (needs the app's service/secret key in .env) —
//      fetches (user, timestamp) rows for the window and buckets client-side.
//
// Results merge into data/metrics.json keyed by app id then ISO date, so each
// run refreshes the trailing window while older days accumulate as history.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, sqlStr, isoDate, exclusionCte } from "./lib/studio.mjs";

const CONFIG = readConfig("apps.json");
const DATA_FILE = join(ROOT, "data", "metrics.json");
// Emails live apart from metrics.json: that file is committed as the historical
// record and must stay free of PII. This sidecar is gitignored.
const ACCOUNTS_FILE = join(ROOT, "data", "accounts.json");

loadEnv();

const WINDOW_DAYS = CONFIG.windowDays ?? 30;
const PAT = process.env.SUPABASE_ACCESS_TOKEN || "";

function windowDates() {
  const out = [];
  const today = new Date();
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    out.push(isoDate(new Date(Date.now() - i * 86400_000)));
  }
  return out;
}

// ---------- Path 1: Management API SQL (runSql lives in lib/studio.mjs) ----------

function buildMetricsSql(app) {
  const activityUnion = app.dauSources
    .map((s) => {
      const where = [`${s.tsCol} >= now() - interval '${WINDOW_DAYS} days'`, s.filter]
        .filter(Boolean)
        .join(" and ");
      return `select ${s.userCol} as uid, (${s.tsCol})::date as d from public.${s.table} where ${where}`;
    })
    .join("\nunion all\n");

  const newUsersFrom = app.newUsers.schema === "auth" ? "auth.users" : `public.${app.newUsers.table}`;
  const newUsersWhere = [
    `n.${app.newUsers.tsCol} >= now() - interval '${WINDOW_DAYS} days'`,
    app.newUsers.filter,
  ]
    .filter(Boolean)
    .join(" and ");

  // Anonymous (guest) auth users are counted separately: they are real usage
  // but not accounts. auth.users.is_anonymous is the authoritative flag —
  // raw_app_meta_data has no 'provider' key for them.
  return `
with ${exclusionCte(app.id)},
days as (
  select generate_series((current_date - ${WINDOW_DAYS - 1})::date, current_date, interval '1 day')::date as d
),
activity as (
${activityUnion}
),
cls as (
  select a.uid, a.d, coalesce(u.is_anonymous, false) as guest
  from activity a left join auth.users u on u.id = a.uid
  where a.uid not in (select id from excluded_users)
),
dau as (
  select d,
    count(distinct uid) filter (where not guest) as c,
    count(distinct uid) filter (where guest) as g
  from cls group by d
),
newu as (
  select (n.${app.newUsers.tsCol})::date as d,
    count(*) filter (where not coalesce(u.is_anonymous, false)) as c,
    count(*) filter (where coalesce(u.is_anonymous, false)) as g
  from ${newUsersFrom} n
  left join auth.users u on u.id = n.id
  where ${newUsersWhere}
    and n.id not in (select id from excluded_users)
  group by 1
)
select days.d::text as day,
  coalesce(dau.c, 0)::int as dau, coalesce(dau.g, 0)::int as dau_guest,
  coalesce(newu.c, 0)::int as new_users, coalesce(newu.g, 0)::int as new_guest
from days
left join dau on dau.d = days.d
left join newu on newu.d = days.d
order by days.d`;
}

// Total distinct real users split by recency of last sign-in. active_N and
// churned_N are complements over the same cohort, so each window's pair always
// sums to `total`.
function buildRetentionSql(app) {
  return `with ${exclusionCte(app.id)},
${lastSeenCte(app)},
${cohortSql(app)},
cohort as (
  select greatest(coalesce(u.last_sign_in_at, '-infinity'::timestamptz),
                  coalesce(a.ts, '-infinity'::timestamptz)) as last_seen
  from cohort_ids c
  join auth.users u on u.id = c.id
  left join acts a on a.uid = c.id
  where not coalesce(u.is_anonymous, false)
    and c.id not in (select id from excluded_users)
)
select count(*)::int as total,
  count(*) filter (where last_seen >= now() - interval '7 days')::int as active_7,
  count(*) filter (where last_seen >= now() - interval '14 days')::int as active_14,
  count(*) filter (where last_seen >= now() - interval '30 days')::int as active_30
from cohort`;
}

// "Last seen" = the newest of a sign-in or ANY tracked in-app action.
// last_sign_in_at alone measures re-authentication, not use: a persisted
// session lets an engaged user go months without signing in again, which made
// active users look churned.
// One select per activity source. `from` lets a source span a join, for tables
// that do not carry the owner id themselves (binder pages/slots reach it via
// their binder); otherwise it is just public.<table>.
function sourceSelect(s, windowed) {
  const from = s.from ?? `public.${s.table}`;
  const conds = [];
  if (windowed) conds.push(`${s.tsCol} >= now() - interval '${WINDOW_DAYS} days'`);
  if (s.filter) conds.push(s.filter);
  const where = conds.length ? ` where ${conds.join(" and ")}` : "";
  return `select ${s.userCol} as uid, ${s.tsCol} as ts from ${from}${where}`;
}

// THE activity definition for an app, used by DAU, last-seen and the per-day
// hover alike. Kept in one place so those three can never drift apart.
function activitySources(app) {
  return app.activitySources ?? app.lastSeenSources ?? app.dauSources ?? [];
}

function activityUnion(app, windowed, indent = "  ") {
  return activitySources(app)
    .map((s) => indent + sourceSelect(s, windowed))
    .join("\n" + indent + "union all\n");
}

function lastSeenCte(app) {
  const sources = activitySources(app);
  if (!sources.length) return `acts as (select null::uuid as uid, '-infinity'::timestamptz as ts where false)`;
  return `acts as (
  select uid, max(ts) as ts from (
${activityUnion(app, false)}
  ) x where uid is not null and ts is not null group by uid
)`;
}

// The cohort is either everyone with a profile, or — on the shared
// TCGScan/Michi project, where one auth pool serves two apps — only the users
// who actually touched this app's tables.
function cohortSql(app) {
  if (app.cohortFromActivity) {
    return `cohort_ids as (select distinct uid as id from acts)`;
  }
  const from = app.newUsers.schema === "auth" ? "auth.users" : `public.${app.newUsers.table}`;
  return `cohort_ids as (select n.id from ${from} n)`;
}

// Account roster for report hover: who each number is actually made of.
function buildRosterSql(app) {
  return `with ${exclusionCte(app.id)},
${lastSeenCte(app)},
${cohortSql(app)}
select coalesce(u.email, '(no email)') as email,
       nullif(greatest(coalesce(u.last_sign_in_at, '-infinity'::timestamptz),
                       coalesce(a.ts, '-infinity'::timestamptz)),
              '-infinity'::timestamptz) as last_seen,
       u.last_sign_in_at, a.ts as last_activity, u.created_at
from cohort_ids c
join auth.users u on u.id = c.id
left join acts a on a.uid = c.id
where not coalesce(u.is_anonymous, false)
  and c.id not in (select id from excluded_users)
order by 2 desc nulls last`;
}

// Which accounts were active on each day of the window.
function buildActiveByDaySql(app) {
  return `with ${exclusionCte(app.id)},
activity as (
${activityUnion(app, true)}
)
select distinct a.ts::date::text as day, coalesce(u.email, '(no email)') as email
from activity a join auth.users u on u.id = a.uid
where not coalesce(u.is_anonymous, false)
  and a.uid not in (select id from excluded_users)
order by 1, 2`;
}

function buildTotalsSql(app) {
  const from = app.newUsers.schema === "auth" ? "auth.users" : `public.${app.newUsers.table}`;
  const where = app.newUsers.filter ? ` and ${app.newUsers.filter}` : "";
  return `with ${exclusionCte(app.id)}
  select
    count(*) filter (where not coalesce(u.is_anonymous, false) and not ex)::int as total_users,
    count(*) filter (where coalesce(u.is_anonymous, false) and not ex)::int as guest_users,
    count(*) filter (where ex)::int as excluded_users
  from (
    select n.id, u.is_anonymous, (n.id in (select id from excluded_users)) as ex
    from ${from} n left join auth.users u on u.id = n.id
    where true${where}
  ) t left join auth.users u on u.id = t.id`;
}

function sqlFromFile(name, appId) {
  return readFileSync(join(ROOT, "config", "sql", name), "utf8")
    .replaceAll("{{WINDOW}}", String(WINDOW_DAYS))
    .replaceAll("{{EXCLUDED_CTE}}", exclusionCte(appId))
    .replaceAll("{{ACTIVITY_UNION}}", activityUnion(CONFIG.apps.find((a) => a.id === appId), true))
    .replaceAll(
      "{{ACTIVITY_USERS}}",
      `select distinct uid from (\n${activityUnion(CONFIG.apps.find((a) => a.id === appId), false)}\n) au where uid is not null`,
    );
}

async function collectViaSql(app) {
  const metricsSql = app.metricsSqlFile ? sqlFromFile(app.metricsSqlFile, app.id) : buildMetricsSql(app);
  const totalsSql = app.totalsSqlFile ? sqlFromFile(app.totalsSqlFile, app.id) : buildTotalsSql(app);
  const rows = await runSql(app.projectRef, metricsSql);
  const totals = await runSql(app.projectRef, totalsSql);
  const days = {};
  for (const r of rows) {
    days[r.day] = {
      dau: r.dau,
      new_users: r.new_users,
      dau_guest: r.dau_guest ?? 0,
      new_guest: r.new_guest ?? 0,
    };
  }
  const retentionSql = app.retentionSqlFile
    ? sqlFromFile(app.retentionSqlFile, app.id)
    : buildRetentionSql(app);
  const retention = (await runSql(app.projectRef, retentionSql))[0] ?? null;

  const rosterSql = app.rosterSqlFile ? sqlFromFile(app.rosterSqlFile, app.id) : buildRosterSql(app);
  const roster = await runSql(app.projectRef, rosterSql);
  const activeRows = await runSql(app.projectRef, buildActiveByDaySql(app));
  const activeByDay = {};
  for (const r of activeRows) (activeByDay[r.day] ??= []).push(r.email);

  let coverage = null;
  if (app.coverageSqlFile) {
    coverage = (await runSql(app.projectRef, sqlFromFile(app.coverageSqlFile, app.id)))[0] ?? null;
  }
  return {
    days,
    totalUsers: totals[0]?.total_users ?? null,
    guestUsers: totals[0]?.guest_users ?? null,
    excludedUsers: totals[0]?.excluded_users ?? null,
    retention,
    coverage,
    accounts: { roster, activeByDay },
    source: "sql",
  };
}

// ---------- Path 2: PostgREST fallback ----------

// Legacy service_role keys are JWTs and go in both headers; new sb_secret_
// keys are only valid in the apikey header.
function authHeaders(key) {
  const h = { apikey: key };
  if (key.startsWith("eyJ")) h.Authorization = `Bearer ${key}`;
  return h;
}

async function restFetchAll(app, key, table, select, filters) {
  const base = `https://${app.projectRef}.supabase.co/rest/v1/${table}?select=${select}&${filters}`;
  const rows = [];
  const pageSize = 1000;
  for (let page = 0; page < 100; page++) {
    const from = page * pageSize;
    const res = await fetch(base, {
      headers: {
        ...authHeaders(key),
        Range: `${from}-${from + pageSize - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!res.ok) throw new Error(`REST ${table} ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  console.warn(`  ! ${app.id}/${table}: hit 100k row cap for window; counts may be low`);
  return rows;
}

async function collectViaRest(app, key) {
  const start = windowDates()[0];
  const days = {};
  for (const d of windowDates()) days[d] = { dau: 0, new_users: 0 };

  const activeByDay = new Map();
  // REST cannot express joins, so join-based sources are skipped here; the
  // Management API path (the default) covers them.
  for (const s of (app.dauSources ?? activitySources(app)).filter((s) => !s.from)) {
    const filters = [`${s.tsCol}=gte.${start}T00:00:00Z`, s.restFilter].filter(Boolean).join("&");
    const rows = await restFetchAll(app, key, s.table, `${s.userCol},${s.tsCol}`, filters);
    for (const r of rows) {
      const day = String(r[s.tsCol]).slice(0, 10);
      if (!(day in days)) continue;
      if (!activeByDay.has(day)) activeByDay.set(day, new Set());
      activeByDay.get(day).add(r[s.userCol]);
    }
  }
  for (const [day, set] of activeByDay) days[day].dau = set.size;

  let totalUsers = null;
  if (app.newUsers && app.newUsers.schema !== "auth") {
    const nu = app.newUsers;
    const filters = [`${nu.tsCol}=gte.${start}T00:00:00Z`, nu.restFilter].filter(Boolean).join("&");
    const rows = await restFetchAll(app, key, nu.table, nu.tsCol, filters);
    for (const r of rows) {
      const day = String(r[nu.tsCol]).slice(0, 10);
      if (day in days) days[day].new_users++;
    }
    const head = await fetch(
      `https://${app.projectRef}.supabase.co/rest/v1/${nu.table}?select=*${nu.restFilter ? "&" + nu.restFilter : ""}`,
      { method: "HEAD", headers: { ...authHeaders(key), Prefer: "count=exact" } },
    );
    const range = head.headers.get("content-range");
    if (range?.includes("/")) totalUsers = parseInt(range.split("/")[1], 10);
  }
  return { days, totalUsers, source: "rest" };
}

// ---------- Main ----------

const store = existsSync(DATA_FILE)
  ? JSON.parse(readFileSync(DATA_FILE, "utf8"))
  : { apps: {} };
const accountsStore = { _doc: "Email addresses for report hover. Gitignored - keep PII out of the committed history.", apps: {} };

let failures = 0;
for (const app of CONFIG.apps) {
  const key = process.env[app.serviceKeyEnv] || "";
  process.stdout.write(`${app.name} (${app.projectRef}) ... `);
  try {
    let result;
    if (PAT) {
      result = await collectViaSql(app);
    } else if (key) {
      result = await collectViaRest(app, key);
    } else {
      throw new Error(`no SUPABASE_ACCESS_TOKEN and no ${app.serviceKeyEnv} in .env`);
    }
    const entry = store.apps[app.id] ?? { name: app.name, days: {} };
    entry.name = app.name;
    entry.totalUsers = result.totalUsers;
    entry.guestUsers = result.guestUsers ?? null;
    entry.excludedUsers = result.excludedUsers ?? null;
    entry.retention = result.retention ?? null;
    entry.coverage = result.coverage ?? null;
    if (result.accounts) accountsStore.apps[app.id] = result.accounts;
    entry.lastCollected = new Date().toISOString();
    entry.lastSource = result.source;
    Object.assign(entry.days, result.days);
    store.apps[app.id] = entry;
    // Report the last COMPLETE UTC day; the newest bucket is still filling.
    const complete = Object.entries(result.days).at(-2) ?? Object.entries(result.days).at(-1);
    const g = complete[1].dau_guest ? ` (+${complete[1].dau_guest} guest)` : "";
    const x = result.excludedUsers ? `, excluded=${result.excludedUsers}` : "";
    console.log(`ok via ${result.source} — ${complete[0]}: dau=${complete[1].dau}${g}, new=${complete[1].new_users}, users=${result.totalUsers ?? "n/a"}${result.guestUsers ? ` (+${result.guestUsers} guest)` : ""}${x}`);
  } catch (err) {
    failures++;
    console.log(`FAILED: ${err.message}`);
    const entry = store.apps[app.id] ?? { name: app.name, days: {} };
    entry.lastError = { at: new Date().toISOString(), message: String(err.message) };
    store.apps[app.id] = entry;
  }
}

mkdirSync(dirname(DATA_FILE), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
console.log(`\nWrote ${DATA_FILE}`);
if (Object.keys(accountsStore.apps).length) {
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsStore, null, 2));
  console.log(`Wrote ${ACCOUNTS_FILE} (gitignored - contains emails)`);
}
// Exit non-zero only if EVERY app failed. A partial failure still has data
// worth reporting, so the report step must not be short-circuited by it.
if (failures) {
  console.log(`${failures} of ${CONFIG.apps.length} app(s) failed — see above.`);
  if (failures === CONFIG.apps.length) process.exitCode = 1;
}
