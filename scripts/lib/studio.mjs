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

export function isoDate(d) {
  return d.toISOString().slice(0, 10);
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
