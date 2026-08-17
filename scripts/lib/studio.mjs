// Shared plumbing for every lane in the studio: repo paths, .env loading, the
// Supabase Management API SQL runner, and THE exclusion CTE.
//
// The exclusion rule in particular must be identical everywhere. It lived in
// collect.mjs while there was only one lane; the events lane needs the exact
// same filter, and two copies of a policy is two policies.

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv(path = join(ROOT, ".env")) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

export function readConfig(name) {
  return JSON.parse(readFileSync(join(ROOT, "config", name), "utf8"));
}

export const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---------- Days ----------
//
// THE reporting timezone. Every "day" in this studio - a DAU bucket, a chart column, a
// digest's "yesterday" - is cut on midnight HERE, not on midnight UTC. Owner decision
// 2026-08-16: the numbers describe Brian's day, so they should break where his day does.
//
// It is America/Los_Angeles rather than a fixed -08:00 on purpose. "PST" as spoken means
// "my clock", and half the year that clock is PDT; a fixed offset would silently move every
// boundary by an hour each spring. Set REPORT_TZ in .env to override - `Etc/GMT+8` is a
// true, year-round PST if that is ever wanted (note the sign: POSIX zones are inverted).
//
// NOT changed by this: rolling windows (24h/7d/30d are durations, and a duration has no
// timezone), and product-defined periods like the monthly scan-credit cycle, which resets
// on a boundary the APP enforces - reporting it on a different one would misstate what a
// user is actually allowed.
export const REPORT_TZ = process.env.REPORT_TZ || "America/Los_Angeles";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: REPORT_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The zone's current abbreviation (PST/PDT), for labelling a report honestly. */
export function tzLabel(at = new Date()) {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: REPORT_TZ, timeZoneName: "short" })
      .formatToParts(at)
      .find((p) => p.type === "timeZoneName")?.value ?? REPORT_TZ
  );
}

/** Postgres hands back `2026-08-16 21:22:02.731476+00`; be strict about turning that into
 *  an instant rather than trusting every runtime to guess the same way. */
export function parseTs(ts) {
  if (ts instanceof Date) return ts;
  const raw = String(ts).trim();
  const norm = raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const d = new Date(norm);
  return Number.isNaN(d.getTime()) ? new Date(raw) : d;
}

/** YYYY-MM-DD for an instant, in the reporting zone. */
export function isoDate(d = new Date()) {
  return DAY_FMT.format(d instanceof Date ? d : parseTs(d));
}

/** The reporting-zone day a timestamp falls in. Replaces `String(ts).slice(0, 10)`, which
 *  silently answered in UTC and put 5pm Pacific on tomorrow. */
export function dayOf(ts) {
  return ts == null ? null : isoDate(parseTs(ts));
}

/** Epoch ms of midnight in the reporting zone on a given YYYY-MM-DD. Two passes so a DST
 *  transition inside the day cannot land the answer an hour out. */
export function startOfDay(dayStr) {
  const naive = Date.parse(`${dayStr}T00:00:00Z`);
  const offsetAt = (instant) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: REPORT_TZ,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(instant)
        .filter((p) => p.type !== "literal")
        .map((p) => [p.type, p.value]),
    );
    const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
    return asUtc - instant.getTime();
  };
  let t = naive - offsetAt(new Date(naive));
  return naive - offsetAt(new Date(t));
}

/** SQL: the reporting-zone date of a timestamptz column. `at time zone` converts to local
 *  wall-clock first, so the ::date that follows is the day the user actually lived. */
export function dayExpr(col) {
  return `((${col}) at time zone ${sqlStr(REPORT_TZ)})::date`;
}

/** SQL: today in the reporting zone. Replaces `current_date`, which is the SERVER's day. */
export function todayExpr() {
  return `((now() at time zone ${sqlStr(REPORT_TZ)})::date)`;
}

// ---------- Management API SQL ----------

export async function runSql(projectRef, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

// ---------- Exclusions ----------

// Builds the `excluded_users` CTE: our own accounts, seeded/placeholder rows,
// QA/test accounts, and anything whose session user-agent looks automated
// (Playwright/headless browsers, curl, node, etc). Every metrics query filters
// against this, and the excluded count is reported so it is never silent.
export function exclusionCte(appId, exclusions = readConfig("exclusions.json")) {
  const g = exclusions.global ?? {};
  const a = exclusions.byApp?.[appId] ?? {};
  const patterns = [...(g.emailPatterns ?? []), ...(a.emailPatterns ?? [])];
  const exact = [...(g.emailExact ?? []), ...(a.emailExact ?? [])];
  const ids = [...(g.userIds ?? []), ...(a.userIds ?? [])];
  // IPs come from .env, never from committed config — an address is location data.
  const envIps = (process.env.EXCLUDED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ips = [...envIps, ...(g.ips ?? []), ...(a.ips ?? [])];
  const uaRegex = a.userAgentRegex ?? g.userAgentRegex ?? null;

  const clauses = [];
  if (patterns.length) clauses.push(`u.email ilike any (array[${patterns.map(sqlStr).join(", ")}])`);
  if (exact.length) clauses.push(`lower(u.email) = any (array[${exact.map((e) => sqlStr(String(e).toLowerCase())).join(", ")}])`);
  if (ids.length) clauses.push(`u.id = any (array[${ids.map(sqlStr).join(", ")}]::uuid[])`);
  if (uaRegex) {
    clauses.push(`exists (select 1 from auth.sessions s where s.user_id = u.id and s.user_agent ~* ${sqlStr(uaRegex)})`);
  }
  // IP exclusion applies to ANONYMOUS guests only. A dev box shares its address
  // with everyone else on that network, and a real signed-in user there must not
  // vanish from the numbers — real accounts are excluded by identity (email)
  // instead. This kills dev-machine guest noise without the NAT collateral.
  if (ips.length) {
    clauses.push(`(u.is_anonymous and exists (select 1 from auth.sessions s where s.user_id = u.id and host(s.ip) = any (array[${ips.map(sqlStr).join(", ")}])))`);
  }
  const where = clauses.length ? clauses.join("\n     or ") : "false";
  return `excluded_users as (\n  select u.id from auth.users u\n  where ${where}\n)`;
}
