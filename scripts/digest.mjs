// Daily digest email: the four things Brian asked to see every morning, for REAL
// accounts (guests summarised in one line each, never dropped silently):
//
//   1. New accounts since yesterday
//   2. Plans / PRO / trial interactions since yesterday
//   3. Yesterday's DAU — and what those people actually did
//   4. (context) what got made, and where the tiers stand
//
// This is a DIGEST, not a studio report, and the difference is deliberate. It has no
// window toggle and no hover rosters because it is an email: there is no JS in a mail
// client, and a roster you cannot hover has to be printed inline or not at all. That is
// why it does not write into reports/ — a file there is listed by the dashboard as a
// report, and a report in this studio owes four staples it cannot deliver. It writes to
// state/ instead and links back to the real reports for the interactive versions.
//
// It READS THE LANES' OUTPUT rather than re-querying. DAU means something different in
// each app (login bonus, streak claim, write activity) and that definition lives in
// collect.mjs; a second query here would be a second definition, and the email would
// eventually disagree with the dashboard. The cost is that the digest is only as fresh
// as the last run — so staleness is computed and stated at the top, loudly.
//
//   node scripts/digest.mjs           build only, print a summary, write state/
//   node scripts/digest.mjs --send    also send it (needs RESEND_API_KEY + DIGEST_TO)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import { ROOT, loadEnv, isoDate, startOfDay, tzLabel, REPORT_TZ } from "./lib/studio.mjs";

loadEnv();
const SEND = process.argv.includes("--send");
const STATE = join(ROOT, "state");
const OUT_HTML = join(STATE, "digest-latest.html");
const OUT_TXT = join(STATE, "digest-latest.txt");

// ---------- inputs ----------

const missing = [];
function read(name) {
  const p = join(ROOT, "data", name);
  if (!existsSync(p)) {
    missing.push(name);
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch (err) {
    missing.push(`${name} (unreadable: ${err.message})`);
    return null;
  }
}

const metrics = read("metrics.json");
const events = read("events.json");
const journeys = read("journeys.json"); // gitignored: carries the names
const usage = read("usage.json");
const plans = read("plans.json");
const accounts = read("accounts.json"); // gitignored: carries the emails

if (!metrics) {
  console.error("FAILED: data/metrics.json is missing — run `npm run collect` first. Nothing to digest.");
  process.exit(1);
}

// ---------- dates ----------
// Reporting-zone days throughout (REPORT_TZ in lib/studio.mjs, Pacific), which is what the
// lanes now key their days by. "Yesterday" is the last COMPLETE day; "today so far" is the
// partial one, and is labelled as partial rather than quietly summed into the headline.

const NOW = new Date();
const iso = (d) => isoDate(d);
const TODAY = iso(NOW);
const YESTERDAY = iso(new Date(NOW.getTime() - 86400_000));
// Midnight in the reporting zone, not UTC — the whole point of the zone change.
const SINCE = startOfDay(YESTERDAY);
const TZ = tzLabel();

const hoursOld = (ts) => (ts ? (NOW.getTime() - Date.parse(ts)) / 3600_000 : null);
const staleness = [
  ["metrics", Math.max(...Object.values(metrics.apps ?? {}).map((a) => hoursOld(a.lastCollected) ?? 999))],
  ["events", hoursOld(events?.collectedAt)],
  ["usage", hoursOld(usage?.collectedAt)],
  ["plans", hoursOld(plans?.collectedAt)],
].filter(([, h]) => h != null && Number.isFinite(h));
const worstStale = staleness.length ? Math.max(...staleness.map(([, h]) => h)) : null;

// ---------- helpers ----------

const APPS = ["michi-maker", "tcgscan", "doggle", "pickleague"];
const appName = (id) => metrics.apps?.[id]?.name ?? id;
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A roster name is a real account unless it is one of the two anonymous shapes the studio
// prints: "guest <stub>" (a minted anonymous ACCOUNT) or "visitor <stub>" (an
// identity-less device on doggle/pickleague). Everything else is a person with a name.
const isReal = (nm) => !/^(guest|visitor)\s/i.test(String(nm));

const evWindow = (appId) => events?.apps?.[appId]?.windows?.["1"] ?? null;
const rosterOf = (appId) => journeys?.apps?.[appId]?.rosters?.["1"] ?? null;

// Whether any roster we read was truncated, so "+N more" can be said honestly.
let rosterTruncated = false;
function names(r) {
  if (!r) return [];
  if (r.total > (r.names?.length ?? 0)) rosterTruncated = true;
  return (r.names ?? []).filter(isReal);
}

// ---------- 1. new accounts since yesterday ----------

// Keyed by person, not by (person, app). Michi-Maker and TCGScan share one auth project, so
// one signup lands in BOTH rosters — counted per app that is two new accounts, which is
// wrong by exactly the number of people it matters most to get right at these volumes.
const newByPerson = new Map();
for (const id of APPS) {
  const roster = accounts?.apps?.[id]?.roster ?? [];
  for (const a of roster) {
    if (!a.created_at || Date.parse(a.created_at) < SINCE) continue;
    const who = a.email ?? "(no email on the account)";
    if (!newByPerson.has(who)) {
      newByPerson.set(who, {
        who,
        apps: [],
        createdAt: a.created_at,
        // Did they come back after signing up, or was the signup the whole visit?
        activeSince: !!(a.last_activity && Date.parse(a.last_activity) > Date.parse(a.created_at) + 60_000),
      });
    }
    const rec = newByPerson.get(who);
    rec.apps.push(id);
    if (a.last_activity && Date.parse(a.last_activity) > Date.parse(rec.createdAt) + 60_000) rec.activeSince = true;
  }
}
const newAccounts = [...newByPerson.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

// The counts the DAU lane recorded, kept beside the named list: if they disagree, the
// difference is an account created on a project whose roster we do not carry, and seeing
// both is how that shows up instead of hiding.
const newCounts = {};
for (const id of APPS) {
  const days = metrics.apps?.[id]?.days ?? {};
  newCounts[id] = {
    yesterday: days[YESTERDAY]?.new_users ?? 0,
    today: days[TODAY]?.new_users ?? 0,
    guestYesterday: days[YESTERDAY]?.new_guest ?? 0,
    guestToday: days[TODAY]?.new_guest ?? 0,
  };
}

// ---------- 2. plans / PRO / trials ----------

const MONETIZATION = new Set([
  "pro.offer_shown",
  "pro.offer_declined",
  "trial.start",
  "trial.start_failed",
  "cap.gate_shown",
  "cap.gate_dismissed",
]);

const money = [];
for (const id of APPS) {
  const w = evWindow(id);
  if (!w) continue;
  const r = rosterOf(id);
  const rows = (w.eventsByName ?? []).filter((e) => MONETIZATION.has(e.name) || e.stage === "monetization");
  const pricing = (w.routes ?? []).filter((rt) => rt.intent === "pricing");
  const trial = w.truth?.trial ?? null;
  const ent = w.truth?.entitlement ?? null;
  if (!rows.length && !pricing.length && !trial?.users && !ent?.users) continue;
  money.push({
    app: id,
    events: rows.map((e) => ({ ...e, who: names(r?.events?.[e.name]) })),
    pricing: pricing.map((rt) => ({ ...rt, who: names(r?.routes?.[rt.route]) })),
    trialUsers: trial?.users ?? 0,
    trialExcluded: trial?.excludedUsers ?? 0,
    entUsers: ent?.users ?? 0,
    entExcluded: ent?.excludedUsers ?? 0,
  });
}

// Tier standing is a POINT-IN-TIME snapshot over all accounts, not a 24h delta. It is here
// as the denominator those interactions are moving against, and is labelled as such.
const tiers = [];
for (const [id, fam] of Object.entries(plans?.families ?? {})) {
  const all = fam.windows?.all ?? null;
  if (!all) continue;
  tiers.push({
    app: id,
    name: fam.name ?? appName(id),
    tiers: Object.entries(all.tiers ?? {}).map(([t, v]) => ({ tier: t, real: v.real ?? 0 })),
    paying: all.paying ?? 0,
    onTrial: all.onTrial ?? 0,
  });
}

// ---------- 3. DAU yesterday, and what those people did ----------

const dau = [];
for (const id of APPS) {
  const m = metrics.apps?.[id];
  if (!m) continue;
  const days = m.days ?? {};
  const y = days[YESTERDAY] ?? {};
  const t = days[TODAY] ?? {};
  // WHO was active, by name — the DAU lane records membership per day, so this is the same
  // population the number counts rather than a lookalike rebuilt from the event stream.
  const who = (accounts?.apps?.[id]?.activeByDay?.[YESTERDAY] ?? []).slice();
  dau.push({
    app: id,
    yesterday: y.dau ?? 0,
    today: t.dau ?? 0,
    guestYesterday: y.dau_guest ?? 0,
    totalUsers: m.totalUsers ?? null,
    excludedUsers: m.excludedUsers ?? 0,
    who,
  });
}

// What each real, named person did in the last 24h of the event stream. Built by inverting
// the per-event and per-route rosters: the studio stores "who fired X", and a digest wants
// "what did this person do", which is the same data read the other way round.
const didByPerson = [];
for (const id of APPS) {
  const r = rosterOf(id);
  const w = evWindow(id);
  if (!r || !w) continue;
  const labels = new Map((w.eventsByName ?? []).map((e) => [e.name, e.label ?? e.name]));
  const per = new Map();
  const touch = (nm) => {
    if (!per.has(nm)) per.set(nm, { name: nm, did: new Set(), pages: new Set() });
    return per.get(nm);
  };
  // Only real event names. The same roster map also carries derived keys (guestAction_*,
  // guest-depth buckets) which are views of the SAME events — printing them alongside would
  // list a person's afternoon twice, once in English and once in raw key form.
  for (const [ev, entry] of Object.entries(r.events ?? {})) {
    if (!labels.has(ev)) continue;
    if (ev === "session.start" || ev === "page.view") continue; // the visit itself, not a doing
    for (const nm of names(entry)) touch(nm).did.add(labels.get(ev) ?? ev);
  }
  // Same filter as the events above: the roster map also holds guestRoute_* views of these
  // very routes, which would print each page twice.
  const realRoutes = new Set((w.routes ?? []).map((rt) => rt.route));
  for (const [route, entry] of Object.entries(r.routes ?? {})) {
    if (!realRoutes.has(route)) continue;
    for (const nm of names(entry)) touch(nm).pages.add(route);
  }
  // Somebody who only opened the app still belongs in the list — as "opened it, nothing
  // else", which is a finding, not an omission.
  for (const nm of names(r.tiles?.realUsers)) touch(nm);
  const people = [...per.values()].sort((a, b) => b.did.size - a.did.size || a.name.localeCompare(b.name));
  if (people.length) didByPerson.push({ app: id, people });
}

// ---------- 4. what got made (context) ----------

// Mirrors the SERIES table in scripts/usage.mjs — presentation only (which app a metric
// belongs to and what to call it). An id that is not listed still renders, under its own
// name, so a new metric added upstream appears here instead of vanishing.
const SERIES = {
  binders: ["michi-maker", "binders created"],
  slots: ["michi-maker", "cards placed in binders"],
  scans: ["tcgscan", "cards scanned"],
  cards: ["tcgscan", "cards added"],
  walks: ["doggle", "walks logged"],
  checkins: ["doggle", "place check-ins"],
  blog: ["doggle", "blog reads & affiliate clicks"],
  discovery: ["doggle", "discovery"],
  matches: ["pickleague", "matches"],
  league: ["pickleague", "league activity"],
  tournament: ["pickleague", "tournament activity"],
  votes: ["pickleague", "votes"],
};
const made = [];
for (const [id, v] of Object.entries(usage?.byWindow?.["1"] ?? {})) {
  if (!v || !v.n) continue;
  const [app, label] = SERIES[id] ?? [null, id];
  made.push({ app, label, n: v.n, users: v.users ?? 0, qty: v.qty ?? null });
}

// ---------- assemble ----------

const totalNew = newAccounts.length;
const totalDau = dau.reduce((n, d) => n + d.yesterday, 0);
const moneyTouches = money.reduce((n, m) => n + m.events.reduce((k, e) => k + e.count, 0) + m.pricing.reduce((k, p) => k + p.count, 0), 0);
const subject =
  `Analytics daily ${YESTERDAY} — ` +
  `${plural(totalNew, "new account")}, ${plural(totalDau, "active account")}, ${plural(moneyTouches, "plan/PRO touch", "plan/PRO touches")}`;

// ---------- render: HTML (email-safe) ----------
// Tables and inline styles only. No <style> block, no classes, no JS, no CSS variables —
// mail clients strip or ignore all four, and a digest that arrives unstyled but readable
// beats one that arrives broken.

const INK = "#111";
const MUTED = "#6b6b6b";
const LINE = "#e2e2df";
const ACCENT = "#2a78d6";
const WARN = "#b45309";
const wrap = (inner) => `<div style="margin:0;padding:0;background:#f6f6f4;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:18px 0;">
<tr><td align="center">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#fff;border:1px solid ${LINE};border-radius:10px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
${inner}
</table>
</td></tr></table></div>`;

const h2 = (t) => `<tr><td style="padding:22px 22px 2px;font:600 15px/1.3 inherit;color:${INK};border-top:1px solid ${LINE};">${esc(t)}</td></tr>`;
const p = (html, color = MUTED, size = "13px") => `<tr><td style="padding:4px 22px 8px;font:400 ${size}/1.5 inherit;color:${color};">${html}</td></tr>`;
const cellHead = `padding:6px 8px;font:600 11px/1.3 inherit;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;text-align:left;border-bottom:1px solid ${LINE};`;
const cell = `padding:6px 8px;font:400 13px/1.4 inherit;color:${INK};border-bottom:1px solid ${LINE};vertical-align:top;`;
const num = `${cell}text-align:right;`;

// ---------- charts, the only way a chart survives an email ----------
//
// No SVG and no CSS backgrounds-as-bars: Gmail strips <svg> outright and Outlook renders
// through Word, which ignores most of what a browser chart relies on. What every client
// does honour is a table cell with a bgcolor and a height attribute, so each bar is
// literally a one-cell table sitting on a shared baseline (valign="bottom").
//
// The studio's chart rules still apply and are the reason for the shape below:
//   - ONE scale across all four app rows, so the panels are comparable and a bar cannot
//     grow just because its own app is quiet.
//   - Values labeled per bar (14 days is inside the house limit for that), dates every
//     other day, anchored so the newest day is always labeled.
//   - The palette is the studio's validated ordinal pair on a light surface: #2a78d6 for
//     the series, #86b6ef for a recorded zero, which is not the same thing as a gap.
const CHART_DAYS = 14;
const BAR = "#2a78d6";
const BAR_ZERO = "#c9dcf6";
const chartDays = Array.from({ length: CHART_DAYS }, (_, i) => iso(new Date(SINCE - (CHART_DAYS - 1 - i) * 86400_000)));

function barRow(series, max, { colW = 17, h = 44 } = {}) {
  const cells = series.map((v) => {
    if (v == null) {
      // No row for that day at all. A gap and a zero must not look the same.
      return `<td valign="bottom" align="center" style="padding:0 1px;"><table role="presentation" cellpadding="0" cellspacing="0" width="${colW - 3}"><tr><td height="2" bgcolor="#e2e2df" style="font-size:0;line-height:0;">&nbsp;</td></tr></table></td>`;
    }
    const px = max > 0 && v > 0 ? Math.max(3, Math.round((v / max) * h)) : 2;
    const color = v > 0 ? BAR : BAR_ZERO;
    return `<td valign="bottom" align="center" style="padding:0 1px;"><table role="presentation" cellpadding="0" cellspacing="0" width="${colW - 3}"><tr><td height="${px}" bgcolor="${color}" style="font-size:0;line-height:0;background:${color};">&nbsp;</td></tr></table></td>`;
  });
  return `<tr height="${h + 4}">${cells.join("")}</tr>`;
}

function chart(rows, { max, unit }) {
  const width = CHART_DAYS * 17;
  const valueRow = (series) =>
    `<tr>${series
      .map((v) => `<td align="center" style="font:400 9.5px/1.2 inherit;color:${MUTED};padding:0 1px 1px;">${v == null ? "" : v || ""}</td>`)
      .join("")}</tr>`;
  // Day-of-month only: at 14px a column cannot hold "08-04" without wrapping it onto two
  // lines, and the month is already stated once in the caption above the chart.
  const dateRow = `<tr>${chartDays
    .map((d, i) => {
      const label = (CHART_DAYS - 1 - i) % 2 === 0 ? d.slice(8) : "";
      return `<td align="center" style="font:400 9.5px/1.2 inherit;color:${MUTED};padding:3px 0 0;white-space:nowrap;">${label}</td>`;
    })
    .join("")}</tr>`;
  // Dates once per chart, under the last row, rather than four times over.
  return rows
    .map(
      (r, ri) => `<tr><td style="padding:2px 22px ${ri === rows.length - 1 ? 10 : 4}px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
  <td width="96" valign="bottom" style="font:400 12px/1.3 inherit;color:${INK};padding-bottom:${ri === rows.length - 1 ? 16 : 2}px;">${esc(r.label)}<br><span style="color:${MUTED};font-size:10.5px;">peak ${Math.max(0, ...r.series.filter((v) => v != null))} ${esc(unit)}</span></td>
  <td valign="bottom"><table role="presentation" cellpadding="0" cellspacing="0" width="${width}" style="border-collapse:collapse;">
    ${valueRow(r.series)}
    ${barRow(r.series, max)}
    ${ri === rows.length - 1 ? dateRow : ""}
  </table></td>
</tr></table>
</td></tr>`,
    )
    .join("");
}

const parts = [];

parts.push(`<tr><td style="padding:22px 22px 0;font:650 19px/1.25 inherit;">Analytics daily — ${esc(YESTERDAY)}</td></tr>`);
parts.push(
  p(
    `Real accounts only; guests are summarised in one line per section rather than dropped. ` +
      `<strong>Yesterday</strong> means the complete ${esc(TZ)} day ${esc(YESTERDAY)} — every day in this studio is cut on Pacific midnight, so these are your days, not UTC ones. ` +
      `<strong>Since yesterday</strong> includes today so far, marked partial. Our own, QA and automated accounts are excluded throughout.`,
  ),
);
if (worstStale != null && worstStale > 26) {
  parts.push(
    p(
      `<strong>The data behind this email is ${worstStale.toFixed(0)} hours old.</strong> The daily lanes may not have run — treat every number below as of the last successful collection, not as of this morning.`,
      WARN,
    ),
  );
}
if (missing.length) parts.push(p(`Not available in this run: ${esc(missing.join(", "))}. Sections that need them are marked.`, WARN));

// --- headline table ---
parts.push(h2("Yesterday at a glance"));
parts.push(`<tr><td style="padding:6px 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
  <th style="${cellHead}">App</th>
  <th style="${cellHead}text-align:right;">Active</th>
  <th style="${cellHead}text-align:right;">New</th>
  <th style="${cellHead}text-align:right;">Today so far</th>
  <th style="${cellHead}text-align:right;">Accounts</th>
</tr>
${dau
  .map(
    (d) => `<tr>
  <td style="${cell}">${esc(appName(d.app))}</td>
  <td style="${num}${d.yesterday ? "" : `color:${MUTED};`}">${d.yesterday}</td>
  <td style="${num}${newCounts[d.app].yesterday ? "" : `color:${MUTED};`}">${newCounts[d.app].yesterday}</td>
  <td style="${num}color:${MUTED};">${d.today} act · ${newCounts[d.app].today} new</td>
  <td style="${num}color:${MUTED};">${d.totalUsers ?? "—"}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
{
  const g = dau.reduce((n, d) => n + d.guestYesterday, 0);
  const gn = APPS.reduce((n, id) => n + newCounts[id].guestYesterday, 0);
  const ex = dau.reduce((n, d) => n + d.excludedUsers, 0);
  parts.push(
    p(
      `Guests, kept out of every number above: <strong>${g}</strong> active and <strong>${gn}</strong> new yesterday. ` +
        `<strong>${ex}</strong> account-slots are excluded as ours, QA or automated — summed per app, and Michi-Maker and TCGScan share one auth pool, so an excluded account there is counted in both.`,
    ),
  );
}

// --- trend charts ---
// Placed directly after the headline because a single day's number cannot say whether it is
// normal. Both charts read metrics.json's committed day history, so they cover days that
// have already aged out of the event stream's 30-day window.
{
  const dauRows = APPS.map((id) => ({
    label: appName(id),
    series: chartDays.map((d) => metrics.apps?.[id]?.days?.[d]?.dau ?? null),
  }));
  const newRows = APPS.map((id) => ({
    label: appName(id),
    series: chartDays.map((d) => metrics.apps?.[id]?.days?.[d]?.new_users ?? null),
  }));
  const dauMax = Math.max(1, ...dauRows.flatMap((r) => r.series.filter((v) => v != null)));
  const newMax = Math.max(1, ...newRows.flatMap((r) => r.series.filter((v) => v != null)));

  parts.push(h2(`Active accounts per day — last ${CHART_DAYS} days`));
  parts.push(
    p(
      `${esc(chartDays[0])} to ${esc(chartDays[chartDays.length - 1])} ${esc(TZ)}, ticks every other day (labels are day-of-month). ` +
        `Real accounts only. All four rows share one scale (0 to ${dauMax}), so the apps are comparable and a quiet app cannot look busy. ` +
        `A pale stub is a recorded zero; a thin grey line is a day with no data at all.`,
    ),
  );
  parts.push(chart(dauRows, { max: dauMax, unit: "active" }));

  if (newRows.some((r) => r.series.some((v) => v))) {
    parts.push(h2(`New accounts per day — last ${CHART_DAYS} days`));
    parts.push(p(`Same ${CHART_DAYS} days, shared scale (0 to ${newMax}). Signups on the shared Michi-Maker/TCGScan auth pool are attributed to one app by the DAU lane, so these rows can be added up without double counting.`));
    parts.push(chart(newRows, { max: newMax, unit: "signups" }));
  } else {
    parts.push(p(`<strong>No signups at all in the last ${CHART_DAYS} days</strong> on any app, so that chart is omitted rather than drawn as four empty rows.`));
  }
}

// --- new accounts ---
parts.push(h2(`New accounts since yesterday — ${totalNew}`));
if (!accounts) {
  parts.push(p(`The account roster (<code>data/accounts.json</code>) was not available, so these can only be counted, not named: ${APPS.map((id) => `${appName(id)} ${newCounts[id].yesterday}`).join(", ")}.`, WARN));
} else if (!totalNew) {
  parts.push(p(`Nobody signed up. The DAU lane agrees — ${APPS.map((id) => newCounts[id].yesterday).reduce((a, b) => a + b, 0)} new real accounts recorded yesterday across the fleet.`));
} else {
  parts.push(`<tr><td style="padding:6px 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Who</th><th style="${cellHead}">App</th><th style="${cellHead}">Signed up</th><th style="${cellHead}">Since</th></tr>
${newAccounts
  .map(
    (a) => `<tr>
  <td style="${cell}">${esc(a.who)}</td>
  <td style="${cell}">${esc(a.apps.map(appName).join(" + "))}${a.apps.length > 1 ? `<br><span style="color:${MUTED};font-size:11.5px;">one account, shared auth</span>` : ""}</td>
  <td style="${cell}color:${MUTED};">${esc(String(a.createdAt).slice(0, 16).replace("T", " "))}</td>
  <td style="${cell}${a.activeSince ? "" : `color:${MUTED};`}">${a.activeSince ? "came back" : "signup only"}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
}

// --- plans / PRO / trials ---
parts.push(h2("Plans, PRO and trials since yesterday"));
if (!events) {
  parts.push(p("The event stream was not available in this run, so interactions cannot be reported. Ground-truth tiers below are unaffected.", WARN));
} else if (!money.length) {
  parts.push(
    p(
      `No PRO, trial or plan-limit interaction in the last 24h. Two blind spots make that zero softer than it looks: the offer impression only fires where <code>TrialCta</code> renders, and cap gates were only instrumented recently — both are tracked in the events report's gap register.`,
    ),
  );
} else {
  for (const m of money) {
    const rows = [
      ...m.events.map((e) => [e.label ?? e.name, e.count, e.users, e.who]),
      ...m.pricing.map((r) => [`Viewed ${r.label ?? r.route}`, r.count, r.users, r.who]),
    ];
    parts.push(`<tr><td style="padding:6px 22px 2px;font:600 13px/1.3 inherit;">${esc(appName(m.app))}</td></tr>`);
    parts.push(`<tr><td style="padding:2px 22px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Interaction</th><th style="${cellHead}text-align:right;">Times</th><th style="${cellHead}">Who</th></tr>
${rows
  .map(
    ([label, count, users, who]) => `<tr>
  <td style="${cell}">${esc(label)}</td>
  <td style="${num}">${count}</td>
  <td style="${cell}${who.length ? "" : `color:${MUTED};`}">${who.length ? esc(who.join(", ")) : `${users} guest${users === 1 ? "" : "s"}`}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
    if (m.trialUsers || m.trialExcluded || m.entUsers || m.entExcluded) {
      parts.push(
        p(
          `Ground truth (the product tables, not the event stream): ${m.trialUsers} real ${m.trialUsers === 1 ? "account holds" : "accounts hold"} a trial, ` +
            `${m.entUsers} a paid entitlement${m.trialExcluded || m.entExcluded ? ` — plus ${m.trialExcluded} trial and ${m.entExcluded} entitlement rows on our own accounts, excluded` : ""}.`,
        ),
      );
    }
  }
}
if (tiers.length) {
  parts.push(
    p(
      `<strong>Where the tiers stand</strong> (all accounts, point-in-time — this does not move with the day): ` +
        tiers
          .map(
            (t) =>
              `${esc(t.name)} ${t.tiers
                .filter((x) => x.real)
                .map((x) => `${x.real} ${x.tier}`)
                .join(", ") || "no real accounts on any tier"}`,
          )
          .join("; ") +
        `. Paying: ${tiers.reduce((n, t) => n + t.paying, 0)}; on trial: ${tiers.reduce((n, t) => n + t.onTrial, 0)}.`,
    ),
  );
}

// --- who was active and what they did ---
parts.push(h2("Who was active yesterday, and what they did"));
if (!dau.some((d) => d.yesterday)) {
  parts.push(p("No real account was active yesterday on any app."));
} else {
  for (const d of dau.filter((x) => x.yesterday || x.who.length)) {
    const known = d.who.length ? esc(d.who.join(", ")) : "<em>names not carried for this app in this run</em>";
    parts.push(`<tr><td style="padding:6px 22px 2px;font:600 13px/1.3 inherit;">${esc(appName(d.app))} — ${plural(d.yesterday, "active account")}</td></tr>`);
    parts.push(p(`<span style="color:${MUTED};">Active (product activity, ${esc(TZ)} ${esc(YESTERDAY)}):</span> ${known}`, INK));
    const detail = didByPerson.find((x) => x.app === d.app);
    if (detail) {
      parts.push(p(`<span style="color:${MUTED};">Event stream, rolling last 24h — a different window, and a different population: it sees instrumented actions, including from people the activity tables do not count.</span>`));
      parts.push(`<tr><td style="padding:2px 22px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Account</th><th style="${cellHead}">Did (last 24h)</th><th style="${cellHead}">Pages</th></tr>
${detail.people
  .map(
    (pp) => `<tr>
  <td style="${cell}">${esc(pp.name)}</td>
  <td style="${cell}${pp.did.size ? "" : `color:${MUTED};`}">${pp.did.size ? esc([...pp.did].join(", ")) : "opened it, nothing else"}</td>
  <td style="${cell}color:${MUTED};">${esc([...pp.pages].slice(0, 5).join(" ") || "—")}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
    }
  }
  parts.push(
    p(
      `"Did" is the last 24 hours of the event stream, which is a different window from the calendar day above and only covers instrumented actions; ` +
        `the active count itself comes from product tables (a login bonus on Doggle, a streak claim on Pickleague, a write on Michi/TCGScan), so an account can be active here with nothing in the "did" column.`,
    ),
  );
}

// --- what got made ---
if (made.length) {
  parts.push(h2("What got made (last 24h)"));
  parts.push(
    p(
      made
        .map((m) => `<strong>${m.n}${m.qty ? ` (${m.qty})` : ""}</strong> ${esc(m.label)}${m.app ? ` — ${esc(appName(m.app))}` : ""}, by ${plural(m.users, "account")}`)
        .join("<br>"),
      INK,
    ),
  );
  // Deliberately a list rather than a chart: these are different units on wildly different
  // scales (200 cards added next to 1 check-in), and one shared scale would flatten
  // everything except the largest. Charting them would need a log axis, which the house
  // rules refuse in favour of just not drawing it.
  parts.push(p(`Listed rather than charted: these are different units on very different scales, and one shared scale would flatten everything but the largest.`));
}

// --- footer ---
parts.push(h2("Reading this"));
parts.push(
  p(
    `Every count is real accounts with our own, QA and automated accounts removed. ` +
      (rosterTruncated ? `Some name lists are capped at 60 stored names, so a very long list may be shortened — the counts beside them are the true totals. ` : "") +
      `The same person can appear under two names: the account roster identifies people by email, the event stream by <code>@username</code> where they have one. ` +
      `The interactive versions of all of this — hover any number for who is behind it, with 24h/7d/14d/30d toggles — are the studio reports on your machine: run <code>npm run serve</code> in analytics-studio and open <span style="color:${ACCENT};">http://127.0.0.1:4726</span>.`,
  ),
);
// Only worth saying while a charted day still predates the switch — after that the seam is
// history, and a permanent footnote about it would be noise.
if (metrics.dayTzPrevious && chartDays.some((d) => d < (metrics.dayTzSince ?? ""))) {
  parts.push(
    p(
      `Days before ${esc(metrics.dayTzSince)} were cut on ${esc(metrics.dayTzPrevious.tz)} midnight rather than ${esc(TZ)}; their source rows have aged out of the collection window, so they cannot be re-cut. Compare across that date with care.`,
      WARN,
    ),
  );
}
parts.push(p(`Generated ${esc(NOW.toISOString())} by scripts/digest.mjs. Days are cut on ${esc(REPORT_TZ)} midnight (${esc(TZ)} today). Data collected: ${staleness.map(([k, h]) => `${k} ${h.toFixed(1)}h ago`).join(", ")}.`, MUTED, "11.5px"));

const html = wrap(parts.join("\n"));

// ---------- render: text alternative ----------

const T = [];
T.push(`ANALYTICS DAILY — ${YESTERDAY}`, "");
T.push(`Real accounts only; guests summarised, not dropped. Yesterday = the complete ${TZ} day ${YESTERDAY}.`);
if (worstStale != null && worstStale > 26) T.push(`WARNING: data is ${worstStale.toFixed(0)}h old — the daily lanes may not have run.`);
if (missing.length) T.push(`Not available this run: ${missing.join(", ")}`);
T.push("", "YESTERDAY AT A GLANCE");
for (const d of dau) T.push(`  ${appName(d.app).padEnd(12)} active ${String(d.yesterday).padStart(3)}   new ${String(newCounts[d.app].yesterday).padStart(3)}   accounts ${d.totalUsers ?? "-"}`);
T.push("", `ACTIVE ACCOUNTS PER DAY (${chartDays[0]} .. ${chartDays[chartDays.length - 1]} ${TZ}, real accounts)`);
for (const id of APPS) {
  const s = chartDays.map((d) => {
    const v = metrics.apps?.[id]?.days?.[d]?.dau;
    return v == null ? "-" : String(v);
  });
  T.push(`  ${appName(id).padEnd(12)} ${s.map((v) => v.padStart(2)).join(" ")}`);
}
T.push("", `NEW ACCOUNTS SINCE YESTERDAY — ${totalNew}`);
if (!totalNew) T.push("  none");
for (const a of newAccounts) T.push(`  ${a.who} (${a.apps.map(appName).join(" + ")}) ${String(a.createdAt).slice(0, 16)} — ${a.activeSince ? "came back" : "signup only"}`);
T.push("", "PLANS, PRO AND TRIALS SINCE YESTERDAY");
if (!money.length) T.push("  no PRO/trial/plan-limit interaction in the last 24h");
for (const m of money) {
  T.push(`  ${appName(m.app)}:`);
  for (const e of m.events) T.push(`    ${e.label ?? e.name} x${e.count} — ${e.who.join(", ") || `${e.users} guest(s)`}`);
  for (const r of m.pricing) T.push(`    viewed ${r.label ?? r.route} x${r.count} — ${r.who.join(", ") || `${r.users} guest(s)`}`);
}
T.push("", `WHO WAS ACTIVE YESTERDAY (${TZ} ${YESTERDAY})`);
for (const d of dau.filter((x) => x.yesterday || x.who.length)) {
  T.push(`  ${appName(d.app)} — active (product activity, ${d.yesterday}): ${d.who.join(", ") || "names not carried"}`);
  const detail = didByPerson.find((x) => x.app === d.app);
  if (detail?.people.length) T.push(`    event stream, rolling 24h:`);
  for (const pp of detail?.people ?? []) T.push(`      ${pp.name}: ${[...pp.did].join(", ") || "opened it, nothing else"}`);
}
if (made.length) {
  T.push("", "WHAT GOT MADE (24h)");
  for (const m of made) T.push(`  ${m.n}${m.qty ? ` (${m.qty})` : ""} ${m.label} — ${appName(m.app)}, by ${m.users} account(s)`);
}
T.push("", `Generated ${NOW.toISOString()} · analytics-studio scripts/digest.mjs`);
const text = T.join("\n");

mkdirSync(STATE, { recursive: true });
writeFileSync(OUT_HTML, html);
writeFileSync(OUT_TXT, text);

// ---------- send ----------

const KEY = process.env.RESEND_API_KEY;
const TO = (process.env.DIGEST_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const FROM = process.env.DIGEST_FROM;

console.log(text);
console.log(`\nWrote ${OUT_HTML}`);

if (!SEND) {
  console.log("Built only. Add --send to email it.");
  process.exit(0);
}
if (!KEY || !TO.length || !FROM) {
  console.error(
    `\nFAILED: cannot send — missing ${[!KEY && "RESEND_API_KEY", !FROM && "DIGEST_FROM", !TO.length && "DIGEST_TO"].filter(Boolean).join(", ")} in .env.` +
      `\nThe digest was still written to ${OUT_HTML}, so nothing is lost.`,
  );
  process.exit(2);
}

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: FROM, to: TO, subject, html, text }),
});
if (!res.ok) {
  console.error(`FAILED: Resend ${res.status} — ${(await res.text()).slice(0, 300)}`);
  process.exit(3);
}
const { id } = await res.json().catch(() => ({}));
console.log(`Sent to ${TO.join(", ")}${id ? ` (Resend id ${id})` : ""}`);
