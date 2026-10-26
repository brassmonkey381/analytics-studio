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

import { ROOT, loadEnv, isoDate, startOfDay, tzLabel, REPORT_TZ, readConfig } from "./lib/studio.mjs";

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
const geoUsers = read("newuser-geo.json"); // where real new Doggle/Pickleague users are, vs ingestion coverage
const geoRoster = read("newuser-geo-roster.json"); // gitignored: id stub + city per new account

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
  ["new-user geo", hoursOld(geoUsers?.collectedAt)],
].filter(([, h]) => h != null && Number.isFinite(h));
const worstStale = staleness.length ? Math.max(...staleness.map(([, h]) => h)) : null;
// Name the stale lanes, not just the age: on 2026-10-26 one lane (new-user geo) had failed to
// start for two days while every other lane was fresh, and "40 hours old" read as if the whole
// email were stale. The reader needs to know which section to distrust.
const staleLanes = staleness.filter(([, h]) => h > 26).map(([k, h]) => `${k} (${h.toFixed(0)}h)`);

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
    // No email is not a gap in the data: a phone signup has none. Name it for what it is, and
    // keep the id stub so the same person matches the activity list below.
    const who =
      a.email && a.email !== "(no email)"
        ? a.email
        : a.provider === "phone"
          ? `phone signup ${a.id_stub ?? ""}`.trim()
          : `(no email) ${a.id_stub ?? ""}`.trim();
    if (!newByPerson.has(who)) {
      newByPerson.set(who, {
        who,
        apps: [],
        createdAt: a.created_at,
        // How the account was made, and whether they finished making it. An email signup
        // that never confirmed cannot sign in, so "signup only" undersells what happened.
        how: a.provider ?? null,
        confirmed: a.confirmed !== false,
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
const viaLabel = (a) => a.how ?? "unknown";
const sinceLabel = (a) => (a.activeSince ? "came back" : a.how === "email" && !a.confirmed ? "never confirmed the email" : "signup only");

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
  const paid = w.truth?.paid ?? null;
  if (!rows.length && !pricing.length && !trial?.users && !ent?.users) continue;
  money.push({
    app: id,
    events: rows.map((e) => ({ ...e, who: names(r?.events?.[e.name]) })),
    pricing: pricing.map((rt) => ({ ...rt, who: names(r?.routes?.[rt.route]) })),
    // `entitlement` means "holds a tier", and a trial grants one - so it counts
    // trials too. `paid` is the same tables with source <> 'trial' and is the
    // only one of the two that may be worded as revenue.
    trialUsers: trial?.users ?? 0,
    trialExcluded: trial?.excludedUsers ?? 0,
    entUsers: ent?.users ?? 0,
    entExcluded: ent?.excludedUsers ?? 0,
    // NOT truth.paid: that counts any entitlement whose source is not 'trial',
    // which includes a Stripe subscription sitting in its own $0 trial window.
    // The purchases block has already told those apart.
    paidUsers: events?.apps?.[id]?.purchases?.available ? events.apps[id].purchases.count : (paid?.users ?? null),
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

// Sessions by platform from the event stream's last 24h - the only place platform is
// recorded (analytics_sessions.platform). A different window and population from the
// Active column beside it, and labelled as sessions, not people, for that reason. Now that
// TCGScan is on the App Store this is the one line that says whether anyone is on the phone.
const platformsOf = (id) => {
  const pl = evWindow(id)?.totals?.platforms ?? null;
  if (!pl) return "—";
  const parts = Object.entries(pl).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`);
  return parts.length ? parts.join(" · ") : "—";
};

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
  // "Was shown a prompt" is true and useless when three prompts exist, so each
  // label is qualified by the prop that tells the event apart - the lane stores
  // a `which|<event>|<value>` roster for exactly this. A person who saw two
  // different prompts gets both named, in the order the lane found them.
  //
  // An event with no qualifier roster keeps its plain label rather than being
  // dropped: a missing detail must never remove the fact.
  const whichFor = (ev, nm) => {
    const out = [];
    for (const [key, entry] of Object.entries(r.asks ?? {})) {
      if (!key.startsWith(`which|${ev}|`)) continue;
      if (names(entry).includes(nm)) out.push(key.slice(`which|${ev}|`.length));
    }
    return out;
  };
  // A few props are flags rather than nouns, and read badly raw: "Guessed at the
  // puzzle (true)" says less than "(right)". Only these need translating.
  const READABLE = {
    "puzzle.guess_submitted": { true: "right", false: "wrong" },
    "puzzle.offer_shown": { true: "first time", false: "seen before" },
  };
  for (const [ev, entry] of Object.entries(r.events ?? {})) {
    if (!labels.has(ev)) continue;
    if (ev === "session.start" || ev === "page.view") continue; // the visit itself, not a doing
    const label = labels.get(ev) ?? ev;
    for (const nm of names(entry)) {
      const which = whichFor(ev, nm).map((v) => READABLE[ev]?.[v] ?? v);
      touch(nm).did.add(which.length ? `${label} (${which.join(", ")})` : label);
    }
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

// ---------- 5. where the new users are (Doggle, Pickleague) ----------
//
// From the new-user geography lane (scripts/newuser-geo.mjs), not re-queried. The lane
// resolves each real new account to a city through the app's own us_cities table and
// checks that city against the geo lane's ingestion coverage. The question this answers
// is the owner's (2026-10-24): "should we be ingesting data for an area or state because
// a new user showed up there?" - so a city with no places ingested in its county, or in a
// state the pipeline has not touched, is an ALERT and goes into the subject line.
const GEO_APPS = Object.keys(geoUsers?.apps ?? {});
const geoAlerts = []; // since yesterday, by person
const geoSinceYesterday = []; // every new real account since yesterday on those apps, located or not
for (const id of GEO_APPS) {
  for (const r of geoRoster?.apps?.[id] ?? []) {
    if (!r.created_at || Date.parse(r.created_at) < SINCE) continue;
    const cv = r.coverage;
    const alert = r.city && cv?.known ? (!cv.stateCovered ? "state" : cv.countyPlaces === 0 ? "county" : null) : null;
    const rec = { app: id, stub: r.stub, city: r.city, state: r.state, src: r.src, foreign: r.foreign, active: r.active, platform: r.platform, coverage: cv, alert };
    geoSinceYesterday.push(rec);
    if (alert) geoAlerts.push(rec);
  }
}
const geoWho = (rec) => {
  // Name the person the way the new-accounts list does, matched on the id stub the roster carries.
  const a = (accounts?.apps?.[rec.app]?.roster ?? []).find((x) => x.id_stub === rec.stub);
  return a ? (a.email && a.email !== "(no email)" ? a.email : `${a.provider === "phone" ? "phone signup" : "(no email)"} ${rec.stub}`) : `account ${rec.stub}`;
};
const geoPlace = (rec) => (rec.city ? `${rec.city}, ${rec.state}` : rec.foreign ? "outside the US" : "no location yet");
const geoCoverLine = (rec, unit) => {
  const cv = rec.coverage;
  if (!rec.city) return "";
  if (!cv?.known) return "coverage unknown (geo lane did not run)";
  if (!cv.stateCovered) return `NO ${unit} ingested in ${rec.state} at all`;
  if (cv.countyPlaces === 0) return `0 ${unit} in ${cv.county ?? "that county"} County, ${cv.statePlaces.toLocaleString()} in ${rec.state}`;
  return `${cv.countyPlaces.toLocaleString()} ${unit} in ${cv.county ?? "the"} County, ${cv.statePlaces.toLocaleString()} in ${rec.state}`;
};

// ---------- assemble ----------

const totalNew = newAccounts.length;
const totalDau = dau.reduce((n, d) => n + d.yesterday, 0);
const moneyTouches = money.reduce((n, m) => n + m.events.reduce((k, e) => k + e.count, 0) + m.pricing.reduce((k, p) => k + p.count, 0), 0);
const subject =
  (geoAlerts.length ? `NEW AREA: ${[...new Set(geoAlerts.map((g) => `${g.city}, ${g.state}`))].join("; ")} — ` : "") +
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
      `<strong>Stale: ${esc(staleLanes.join(", "))}.</strong> ${staleLanes.length === staleness.length ? "The daily lanes may not have run — treat every number below as of the last successful collection, not as of this morning." : "Those lanes failed or did not run; their sections are as of the last successful collection. Everything else is fresh."} Check logs/run-${esc(TODAY)}.log.`,
      WARN,
    ),
  );
}
if (missing.length) parts.push(p(`Not available in this run: ${esc(missing.join(", "))}. Sections that need them are marked.`, WARN));
if (geoAlerts.length) {
  parts.push(
    p(
      `<strong>New user outside ingestion coverage.</strong> ` +
        geoAlerts.map((g) => `${esc(geoWho(g))} signed up for ${esc(appName(g.app))} in <strong>${esc(geoPlace(g))}</strong>: ${esc(geoCoverLine(g, geoUsers.apps[g.app].unit))}.`).join(" ") +
        ` Details under "Where new users are".`,
      WARN,
    ),
  );
}

// Money first: the owner reads this email for trials and payments before anything else
// (2026-10-17). Everything below it is context for the people it names.
// ---------- Money ----------
//
// ONE section where there were three. "Plans, PRO and trials", "What people bought" and
// "On a PRO trial right now" each restated the same two ledgers (entitlements and the trial
// tables) from a different angle, in three places, with three chances to disagree. Now, per
// app: one ledger line, one named table with a Status column, and the 24h interactions
// underneath as the thing that moves the ledger. Every count on the ledger line is a product
// table; only the interactions come from the stream, and they say so.
//
// A ledger that could not be read says NOT COLLECTED, in warning colour, where its number
// would be. It used to say "nobody bought anything" - the same words for an empty table and
// an unreadable one (owner, 2026-10-12).
const fmtMoney = (minor, cur) =>
  minor == null ? null : `${(cur ?? "usd").toLowerCase() === "usd" ? "$" : `${String(cur).toUpperCase()} `}${(minor / 100).toFixed(2)}`;
// What a trial turns into when it ends: the row's own price and cadence. "$0 trial" said
// what Stripe calls it, not what the person signed up for (owner, 2026-10-16).
const thenPrice = (r) => {
  const money = fmtMoney(r.amountMinor, r.currency);
  const per = r.interval === "year" ? "per year" : r.interval === "month" ? "per month" : null;
  if (money && per) return `${money} ${per}`;
  if (money) return money;
  return per ? `the list price ${per}` : "the list price";
};
const moneyApps = APPS.filter((id) => events?.apps?.[id]?.purchases || events?.apps?.[id]?.activeTrials || money.some((m) => m.app === id));
// A STRIPE ROW'S expires_at IS NOT THE BILLING DATE. payments-webhook stores Stripe's period
// end PLUS a 3-day grace (GRACE_MS in that function) so a slow renewal payment does not cut
// access. On 2026-10-13 the email read that stored date as "first charge 2026-10-18" for a
// trial Stripe charges on the 15th. Term dates for Stripe rows are shown net of the grace;
// every other source stores the real end date.
const STRIPE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;
// A CANCELLED Stripe row is stored WITHOUT the grace (the webhook lapses it exactly at
// period end), so the subtraction applies only while renewal is on. Caught 2026-10-16:
// a trial cancelled on the 16th and ending the 19th printed "until 2026-10-16".
// A TRIALING row is stored without the grace too (payments-webhook, "access ends at trial_end,
// exactly", since the grace narrowing of 2026-10-19). Caught 2026-10-25: a trial started that
// day and ending the 28th printed "charges $24.99 per year on Oct 25". The grace is only ever
// on a PAID term's period end.
const termEnd = (r) => {
  if (!r.expiresAt) return null;
  const ms = Date.parse(r.expiresAt);
  const graced = r.source === "stripe" && !r.cancelledAt && r.kind !== "trialing";
  return new Date(graced ? ms - STRIPE_GRACE_MS : ms).toISOString().slice(0, 10);
};

// How many of an app's free trials are the free days of a $0 Stripe trial held by the
// same person. The webhook writes both ledger rows for one checkout, so without this the
// counts said "1 in a $0 trial, 1 on a free trial" about one person. Needs the names
// (journeys.json); without them the overlap is unknown and reads as 0.
const trialOverlap = (id) => {
  const a = journeys?.apps?.[id];
  if (!a) return 0;
  const stripe = new Set((a.purchases ?? []).filter((r) => r.kind === "trialing").map((r) => r.user));
  return (a.activeTrials ?? []).filter((t) => stripe.has(t.user)).length;
};
// ---------- Money, grouped ----------
//
// Five groups a reader can act on, in the order anything can happen: In trial (a charge or a
// cancellation is days away), Paying, One-off sales, Granted, Lapsed. One line per person,
// "who — what", dates as "Oct 19". The five-column table this replaces (owner, 2026-10-16:
// "chaotic") mixed all five states in one list sorted by date and spent a column on the
// product id. Every number here is still a product table; only the interactions are stream.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (ymd) => {
  if (!ymd) return "unknown";
  const [y, mo, d] = String(ymd).slice(0, 10).split("-").map(Number);
  if (!y || !mo || !d) return String(ymd).slice(0, 10);
  return `${MONTHS[mo - 1]} ${d}${y !== new Date().getFullYear() ? `, ${y}` : ""}`;
};
const perLabel = (iv) => (iv === "year" ? "/yr" : iv === "month" ? "/mo" : "");
const TIER_NAMES = { tier_pro: "PRO", tier_vip: "VIP", tcgscan_pro: "PRO", tcgscan_vip: "VIP" };
const tierName = (product) => TIER_NAMES[product] ?? String(product);
const GROUP_TITLES = { trial: "In trial", paying: "Paying", oneoff: "One-off sales", granted: "Granted", lapsed: "Lapsed" };

function moneyGroups(id) {
  const rows = journeys?.apps?.[id]?.purchases ?? [];
  const trials = journeys?.apps?.[id]?.activeTrials ?? [];
  const g = { trial: [], paying: [], oneoff: [], granted: [], lapsed: [] };
  // The Stripe trial row and the free-days row for the same person are ONE line: the webhook
  // writes both for one checkout. The free-days row knows the days left; the Stripe row knows
  // the price and whether renewal is still on.
  const stripeTrial = new Map(rows.filter((r) => r.kind === "trialing").map((r) => [r.user, r]));
  for (const t of trials) {
    const s = stripeTrial.get(t.user);
    const left = t.daysLeft === 0 ? "ends today" : `${t.daysLeft} day${t.daysLeft === 1 ? "" : "s"} left`;
    const sort = Date.parse(t.expiresAt);
    if (!s) {
      g.trial.push({ who: t.user, what: `${left} · no card on file`, warn: t.daysLeft <= 1, sort });
      continue;
    }
    stripeTrial.delete(t.user);
    g.trial.push(
      s.cancelledAt
        ? { who: t.user, what: `${left} · cancelled ${shortDate(s.cancelledAt)}, no charge coming`, warn: false, sort }
        // The free-days row IS the trial end; the Stripe row only knows the price.
        : { who: t.user, what: `${left} · charges ${thenPrice(s)} on ${shortDate(t.expiresAt)}`, warn: t.daysLeft <= 1, sort },
    );
  }
  for (const s of stripeTrial.values()) {
    const sort = s.expiresAt ? Date.parse(s.expiresAt) : Infinity;
    g.trial.push(
      s.cancelledAt
        ? { who: s.user, what: `cancelled ${shortDate(s.cancelledAt)} · ends ${shortDate(termEnd(s))}, no charge coming`, warn: false, sort }
        : { who: s.user, what: `charges ${thenPrice(s)} on ${shortDate(termEnd(s))}`, warn: false, sort },
    );
  }
  for (const r of rows) {
    const price = fmtMoney(r.amountMinor, r.currency);
    const end = r.expiresAt ? shortDate(termEnd(r)) : null;
    if (r.kind === "paid") {
      g.paying.push({
        who: r.user,
        what: `${tierName(r.product)} ${price ? `${price}${perLabel(r.interval)}` : "(price not recorded)"} via ${r.source}${
          r.cancelledAt ? ` · cancelled ${shortDate(r.cancelledAt)}, ends ${end}` : end ? ` · renews ${end}` : " · no end"
        }`,
        warn: !!r.cancelledAt,
        sort: r.expiresAt ? Date.parse(r.expiresAt) : Infinity,
      });
    } else if (r.kind === "oneoff") {
      g.oneoff.push({ who: r.user, what: `PDF binder ${price ?? "(price not recorded)"} · ${shortDate(r.at)}`, warn: false, sort: -Date.parse(r.at) });
    } else if (r.kind === "comped") {
      g.granted.push({ who: r.user, what: `${tierName(r.product)} · ${r.source}${end ? ` · until ${end}` : " · no end"}`, warn: false, sort: r.expiresAt ? Date.parse(r.expiresAt) : Infinity });
    } else if (r.kind === "lapsed") {
      // A short term that ended was a trial nobody was charged for; a full term that ended
      // was a subscription that ran out. Say which.
      const days = (Date.parse(r.expiresAt) - Date.parse(r.at)) / 86400000;
      const floor = r.interval === "year" ? 300 : r.interval === "month" ? 20 : 0;
      const how = floor && days < floor ? `trial ended ${end}, never charged` : `ended ${end}`;
      g.lapsed.push({ who: r.user, what: `${tierName(r.product)}${r.interval ? ` ${r.interval}ly` : ""} · ${how}`, warn: false, sort: -Date.parse(r.expiresAt) });
    }
  }
  for (const k of Object.keys(g)) g[k].sort((a, b) => a.sort - b.sort);
  return g;
}

// The number beside a group title: a count, and money where money is the point.
function groupLabel(key, lines, b) {
  const n = lines.length;
  if (key === "paying" && b?.priced) return `${n} · ${fmtMoney(b.mrrMinor, b.currency)}/mo run-rate${b.unpriced ? ` · ${b.unpriced} unpriced` : ""}`;
  if (key === "oneoff" && b?.oneOffMinor) return `${n} · ${fmtMoney(b.oneOffMinor, b.currency ?? "usd")} all-time${b.oneOffLast24h ? ` · ${b.oneOffLast24h} in the last 24h` : ""}`;
  return String(n);
}

if (moneyApps.length) {
  const sum = (f) => moneyApps.reduce((n, id) => n + (f(events?.apps?.[id]) ?? 0), 0);
  const paying = sum((a) => (a?.purchases?.available ? a.purchases.count : 0));
  const mrr = sum((a) => (a?.purchases?.available ? a.purchases.mrrMinor : 0));
  const pdfs = sum((a) => (a?.purchases?.available ? a.purchases.oneOff ?? 0 : 0));
  const inTrial = moneyApps.reduce((n, id) => n + moneyGroups(id).trial.length, 0);
  const anyUnread = moneyApps.some((id) => events?.apps?.[id]?.purchases?.available === false || events?.apps?.[id]?.activeTrials?.available === false);
  const headBits = [];
  headBits.push(`${paying} paying${mrr ? ` (${fmtMoney(mrr, "usd")}/mo)` : ""}`);
  if (inTrial) headBits.push(`${inTrial} in trial`);
  if (pdfs) headBits.push(`${pdfs} PDF${pdfs === 1 ? "" : "s"} sold`);
  parts.push(h2(`Money — ${headBits.join(" · ")}${anyUnread ? " — a ledger was not collected, see below" : ""}`));

  const groupHead = `padding:10px 8px 4px;font:600 11px/1.3 inherit;color:${MUTED};text-transform:uppercase;letter-spacing:.04em;text-align:left;`;
  const lineWho = `padding:3px 8px;font:400 13px/1.4 inherit;color:${INK};vertical-align:top;white-space:nowrap;width:1%;`;
  const lineWhat = `padding:3px 8px;font:400 13px/1.4 inherit;color:${INK};vertical-align:top;`;

  for (const id of moneyApps) {
    const b = events?.apps?.[id]?.purchases ?? null;
    const tr = events?.apps?.[id]?.activeTrials ?? null;
    const m = money.find((x) => x.app === id) ?? null;
    parts.push(`<tr><td style="padding:6px 22px 2px;font:600 13px/1.3 inherit;">${esc(appName(id))}</td></tr>`);

    // A ledger that could not be read says so where its group would be - never a quiet zero.
    const unread = [];
    if (b && !b.available) unread.push("purchases NOT COLLECTED this run");
    if (tr && !tr.available) unread.push("free trials NOT COLLECTED this run");
    if (unread.length) parts.push(p(`<strong>${unread.join(" · ")}</strong>`, WARN));

    const g = moneyGroups(id);
    const total = Object.values(g).reduce((n, xs) => n + xs.length, 0);
    const expectRows = (b?.available && (b.count || b.trialing || b.comped || b.oneOff)) || (tr?.available && tr.count);
    if (expectRows && !journeys) {
      parts.push(p(`<code>data/journeys.json</code> was not available in this run, so these can only be counted, not named.`, WARN));
    } else if (!total) {
      if (!unread.length) parts.push(p("Nothing on the ledger yet."));
    } else {
      const body = Object.entries(g)
        .filter(([, lines]) => lines.length)
        .map(
          ([key, lines]) =>
            `<tr><td colspan="2" style="${groupHead}">${esc(GROUP_TITLES[key])} <span style="font-weight:400;">· ${esc(groupLabel(key, lines, b))}</span></td></tr>` +
            lines
              .map(
                (l) => `<tr>
  <td style="${lineWho}">${esc(l.who)}</td>
  <td style="${lineWhat}${l.warn ? `color:${WARN};` : ""}">${esc(l.what)}</td>
</tr>`,
              )
              .join(""),
        )
        .join("");
      parts.push(`<tr><td style="padding:0 22px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${body}</table></td></tr>`);
    }

    // The footprint: what was excluded is always stated (house rule), and the all-time trial
    // count is context, not a group.
    const foot = [];
    if (m?.trialUsers) foot.push(`${m.trialUsers} ever trialed`);
    const ex = (b?.excluded ?? 0) + (tr?.excluded ?? 0);
    if (ex) foot.push(`${ex} rows of ours excluded`);
    if (foot.length) parts.push(p(foot.join(" · ")));

    // The 24h interactions that move the ledger - the stream, and only the stream.
    if (!events) {
      parts.push(p("The event stream was not available in this run, so 24h interactions cannot be reported; the ledger above is unaffected.", WARN));
    } else if (m && (m.events.length || m.pricing.length)) {
      const irows = [
        ...m.events.map((e) => [e.label ?? e.name, e.count, e.users, e.who]),
        ...m.pricing.map((r) => [`Viewed ${r.label ?? r.route}`, r.count, r.users, r.who]),
      ];
      parts.push(p(`<span style="color:${MUTED};">Last 24h, event stream — what moved toward (or away from) the ledger:</span>`));
      parts.push(`<tr><td style="padding:2px 22px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Interaction</th><th style="${cellHead}text-align:right;">Times</th><th style="${cellHead}">Who</th></tr>
${irows
  .map(
    ([label, count, users, who]) => `<tr>
  <td style="${cell}">${esc(label)}</td>
  <td style="${num}">${count}</td>
  <td style="${cell}${who.length ? "" : `color:${MUTED};`}">${who.length ? esc(who.join(", ")) : `${users} guest${users === 1 ? "" : "s"}`}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
    } else {
      parts.push(p(`No PRO, trial or plan-limit interaction in the last 24h. The offer impression only fires where <code>TrialCta</code> renders, so this zero is softer than it looks.`));
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
          `. A "tier" here includes trial grants; the paying count above is the one that may be read as revenue.`,
      ),
    );
  }
}

// --- headline table ---
parts.push(h2("Yesterday"));
parts.push(`<tr><td style="padding:6px 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
  <th style="${cellHead}">App</th>
  <th style="${cellHead}text-align:right;">Active</th>
  <th style="${cellHead}text-align:right;">New</th>
  <th style="${cellHead}text-align:right;">Today so far</th>
  <th style="${cellHead}text-align:right;">Accounts</th>
  <th style="${cellHead}">Sessions by platform (24h)</th>
</tr>
${dau
  .map(
    (d) => `<tr>
  <td style="${cell}">${esc(appName(d.app))}</td>
  <td style="${num}${d.yesterday ? "" : `color:${MUTED};`}">${d.yesterday}</td>
  <td style="${num}${newCounts[d.app].yesterday ? "" : `color:${MUTED};`}">${newCounts[d.app].yesterday}</td>
  <td style="${num}color:${MUTED};">${d.today} act · ${newCounts[d.app].today} new</td>
  <td style="${num}color:${MUTED};">${d.totalUsers ?? "—"}</td>
  <td style="${cell}color:${MUTED};">${esc(platformsOf(d.app))}</td>
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

// --- who was active and what they did ---
parts.push(p(`<strong style="color:${INK};font-size:13.5px;">Who was active, and what they did</strong>`));
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
<tr><th style="${cellHead}">Who</th><th style="${cellHead}">App</th><th style="${cellHead}">Via</th><th style="${cellHead}">Signed up</th><th style="${cellHead}">Since</th></tr>
${newAccounts
  .map(
    (a) => `<tr>
  <td style="${cell}">${esc(a.who)}</td>
  <td style="${cell}">${esc(a.apps.map(appName).join(" + "))}${a.apps.length > 1 ? `<br><span style="color:${MUTED};font-size:11.5px;">one account, shared auth</span>` : ""}</td>
  <td style="${cell}color:${MUTED};">${esc(viaLabel(a))}</td>
  <td style="${cell}color:${MUTED};">${esc(String(a.createdAt).slice(0, 16).replace("T", " "))}</td>
  <td style="${cell}${a.activeSince ? "" : `color:${a.how === "email" && !a.confirmed ? WARN : MUTED};`}">${esc(sinceLabel(a))}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
}

// --- where new users are ---
if (GEO_APPS.length) {
  parts.push(h2("Where new users are — Doggle and Pickleague"));
  if (!geoUsers) {
    parts.push(p("The new-user geography lane did not run, so nothing can be said about where people are. That is not the same as nobody being anywhere.", WARN));
  } else {
    // Since yesterday, by person: the actionable part.
    if (!geoSinceYesterday.length) {
      parts.push(p(`No new real account on either app since yesterday, so no new place to consider. The 90-day picture is below.`));
    } else {
      parts.push(`<tr><td style="padding:6px 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Who</th><th style="${cellHead}">App</th><th style="${cellHead}">Where</th><th style="${cellHead}">From</th><th style="${cellHead}">Ingested there</th></tr>
${geoSinceYesterday
  .map(
    (g) => `<tr>
  <td style="${cell}">${esc(geoWho(g))}</td>
  <td style="${cell}">${esc(appName(g.app))}</td>
  <td style="${cell}${g.alert ? `color:${WARN};font-weight:600;` : ""}">${esc(geoPlace(g))}</td>
  <td style="${cell}color:${MUTED};">${esc(g.src ?? "—")}</td>
  <td style="${cell}${g.alert ? `color:${WARN};` : `color:${MUTED};`}">${esc(geoCoverLine(g, geoUsers.apps[g.app].unit) || "—")}</td>
</tr>`,
  )
  .join("")}
</table></td></tr>`);
    }
    // The 90-day picture per app: ranked cities with activity and coverage.
    for (const id of GEO_APPS) {
      const a = geoUsers.apps[id];
      const w = a.windows?.["90"];
      if (!w) continue;
      const w7 = a.windows?.["7"];
      const head = `<strong>${esc(appName(id))}</strong>, last 90 days: ${plural(w.real, "real new account")}, ${w.located} with a location, ${w.noLocation} without${w.foreign ? `, ${w.foreign} outside the US` : ""}. ` +
        `${plural(w.active, "is", "are")} active in the last ${geoUsers.activeDays} days. Last 7 days: ${w7?.real ?? 0} new, ${w7?.located ?? 0} located. ` +
        `Excluded from the 90 days: ${a.totals.excluded} of ours/QA, ${a.totals.guests} guests. ${a.totals.signedOutDevices} signed-out devices never made an account and have no location.`;
      parts.push(p(head, INK));
      if (!w.cities.length) {
        parts.push(p(w.real ? `Nobody who signed up could be placed. ${id === "doggle" ? "Every profile sits on the Alameda column default, which means the location was never set, not that they live in Alameda." : "Nobody checked in, played or joined anything with a location."}` : "Nobody real signed up in 90 days: a true zero, not a visibility gap.", MUTED));
        continue;
      }
      const SHOW = 8;
      parts.push(`<tr><td style="padding:0 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">City</th><th style="${cellHead}text-align:right;">New (90d)</th><th style="${cellHead}text-align:right;">Active (${geoUsers.activeDays}d)</th><th style="${cellHead}">${esc(a.unit)} ingested</th></tr>
${w.cities
  .slice(0, SHOW)
  .map((c) => {
    const cv = c.coverage;
    const cover = !cv?.known ? "unknown" : !cv.stateCovered ? `none in ${c.state}` : `${(cv.countyPlaces ?? 0).toLocaleString()} in ${cv.county ?? "the"} County · ${cv.statePlaces.toLocaleString()} in ${c.state}`;
    return `<tr>
  <td style="${cell}${c.alert && c.alert !== "unknown" ? `color:${WARN};font-weight:600;` : ""}">${esc(c.city)}, ${esc(c.state)}</td>
  <td style="${num}">${c.users}</td>
  <td style="${num}">${c.active}</td>
  <td style="${cell}${c.alert && c.alert !== "unknown" ? `color:${WARN};` : `color:${MUTED};`}">${esc(cover)}${c.alert === "county" ? " — ingest?" : c.alert === "state" ? " — ingest the state?" : ""}</td>
</tr>`;
  })
  .join("")}
</table>${w.cities.length > SHOW ? `<div style="font:400 11.5px/1.4 inherit;color:${MUTED};padding:4px 8px;">+${w.cities.length - SHOW} more cities in data/newuser-geo.json</div>` : ""}</td></tr>`);
    }
    parts.push(
      p(
        `Location is the saved home on Doggle (a profile left on the Alameda default counts as unset), else the last place search, else a device fix; on Pickleague, where profiles have no home, it is the check-in fix or the venue, match, league, tournament or DUPR club the person touched. ` +
          `Cities come from each app's own us_cities table; "ingested" is the geo lane's count of ${GEO_APPS.map((id) => geoUsers.apps[id].unit).join(" / ")} in the county the city centroid falls in. Counts here are rolling days, not Pacific days.`,
      ),
    );
  }
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
// ---------- Daily puzzle ----------
//
// From puzzle_plays, not the event stream. The stream lost its call sites in a
// page rewrite and reported nobody playing while three people solved it; a
// table row cannot be dropped by a refactor.
//
// Answered and correct are SUBSETS of opened. A name in two lists is one person
// with two facts true, never two people.
const puzzleApps = APPS.map((id) => ({ id, pz: events?.apps?.[id]?.puzzle ?? null })).filter((x) => x.pz);
if (puzzleApps.length) {
  parts.push(h2("Daily puzzle"));
  for (const { id, pz } of puzzleApps) {
    const named = journeys?.apps?.[id]?.puzzle ?? null;
    if (!pz.available) {
      parts.push(p(`<strong>${esc(appName(id))}</strong> — puzzle tables not readable this run, so this is "not available" rather than zero.`, WARN));
      continue;
    }
    if (!pz.days.length) {
      parts.push(p(`<strong>${esc(appName(id))}</strong> — nobody has opened a puzzle yet.${pz.excluded ? ` <span style="color:${MUTED};">${pz.excluded} of our own plays excluded.</span>` : ""}`));
      continue;
    }
    parts.push(
      p(`<strong>${esc(appName(id))}</strong> — the last ${pz.days.length} ${pz.days.length === 1 ? "puzzle with any play on it" : "puzzles with any play on them"}.${pz.excluded ? ` <span style="color:${MUTED};">${pz.excluded} of our own plays excluded.</span>` : ""}`),
    );
    const list = (xs) => (xs.length ? esc(xs.join(", ")) : `<span style="color:${MUTED};">nobody</span>`);
    parts.push(`<tr><td style="padding:2px 22px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Puzzle</th><th style="${cellHead}">Opened it</th><th style="${cellHead}">Guessed <span style="color:${MUTED};font-weight:400;">(stream)</span></th><th style="${cellHead}">Got it right</th></tr>
${pz.days
  .map((d) => {
    const n = named?.find((x) => x.day === d.day) ?? null;
    const cellFor = (count, names) =>
      n ? `${count ? `<strong>${count}</strong> — ` : ""}${list(names)}` : `<strong>${count}</strong> <span style="color:${MUTED};">(names not carried)</span>`;
    // Guesses are stream data (see the Guessed header): each person with their tries,
    // because the misses are the one thing the ground-truth table cannot show.
    const g = d.guesses;
    const guessed = !g
      ? `<span style="color:${MUTED};">nobody</span>`
      : n?.guessers?.length
        ? `<strong>${g.people}</strong> — ${n.guessers.map((x) => `${esc(x.who)} <span style="color:${MUTED};">(${x.tries} ${x.tries === 1 ? "try" : "tries"}${x.wrong ? `, ${x.wrong} wrong` : ""})</span>`).join(", ")}`
        : `<strong>${g.people}</strong> <span style="color:${MUTED};">(${g.tries} tries, ${g.wrong} wrong; names not carried)</span>`;
    return `<tr>
  <td style="${cell}">${esc(d.day)}</td>
  <td style="${cell}">${cellFor(d.opened, n?.opened ?? [])}</td>
  <td style="${cell}">${guessed}</td>
  <td style="${cell}">${cellFor(d.correct, n?.correct ?? [])}</td>
</tr>`;
  })
  .join("")}
</table></td></tr>`);
    parts.push(p(`"Guessed" is the event stream (puzzle.guess_submitted, one event per try), because the puzzle table keeps only the accepted answer and cannot see a miss. The other two columns are the table.`, MUTED));
  }
}

// A survey answer as a person reads it, not as the database stores it.
//
// `3` is not an answer and neither is `aspect.sharing`. The labels are transcribed
// in config/events.json -> feedback.labels (see its _doc); an id with no entry
// falls back to the raw id, so a question added to the survey prints as
// `games_first` rather than disappearing from the email.
const FB_LABELS = (() => {
  try {
    return readConfig("events.json")?.feedback?.labels ?? null;
  } catch {
    return null;
  }
})();
const FB_ORDER = Object.keys(FB_LABELS?.questions ?? {});
const qLabel = (k) => FB_LABELS?.questions?.[k] ?? k;

// Matrix rows share one scale, so a key ending in '.' is a prefix for all of them.
function fbScale(k) {
  const sc = FB_LABELS?.scales ?? {};
  if (sc[k]) return sc[k];
  for (const [pre, v] of Object.entries(sc)) if (pre.endsWith(".") && k.startsWith(pre)) return v;
  return null;
}

// A named point where the scale has one. Otherwise the number WITH its direction
// spelled out, because a bare 0 on the recommend question reads as a missing answer
// when it is in fact the strongest thing anybody has said.
function fbAnswer(k, v) {
  const opts = FB_LABELS?.options?.[k];
  if (Array.isArray(v)) return v.map((one) => opts?.[one] ?? one).join(", ");
  if (typeof v === "number") {
    const sc = fbScale(k);
    const pt = sc?.points?.[String(v)];
    if (pt) return `${v} - ${pt}`;
    return sc?.ends ? `${v} (${sc.ends})` : String(v);
  }
  if (typeof v === "boolean") return v ? "yes" : "no";
  return opts?.[v] ?? String(v);
}

// The top of a scale, never assumed. The digest printed "nps: 0/5" for a 0-10
// question for as long as /5 was hardcoded; an unknown scale now prints the bare
// average rather than inventing a denominator for it.
const fbMax = (k) => fbScale(k)?.max ?? null;

// The aggregate rated rows. `nps` is dropped from them because it has its own
// block directly above with the proper bands - leaving it in reported the same
// answer twice, the second time against the wrong scale.
function fbRated(ratings) {
  return Object.entries(ratings ?? {})
    .filter(([k]) => k !== "nps")
    .sort((a, b) => (a[1].avg ?? 9) - (b[1].avg ?? 9))
    .slice(0, 5);
}

// Survey order, with anything unrecognised after it rather than dropped.
const fbSort = (a, b) => {
  const ia = FB_ORDER.indexOf(a[0]);
  const ib = FB_ORDER.indexOf(b[0]);
  return (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib);
};

// ---------- Leave Feedback ----------
//
// Driven entirely by what the lane found, never by a hardcoded app list: the page,
// the survey definition and feedback_responses are all app-agnostic (the table
// carries its own `app` column), so the day a second app ships a /feedback page it
// appears here with no edit. An app with no feedback spec is silent rather than
// printing a zero it was never eligible for.
//
// THREE DIFFERENT NOTHINGS, and the section says which one it is looking at:
//   table missing   -> "not available", the lane could not read it
//   0 responses     -> "nobody has sent anything yet", which is a real answer
//   0 opens too     -> nobody even reached the page, which is a different problem
const fbApps = APPS.map((id) => ({ id, fb: events?.apps?.[id]?.feedback ?? null })).filter((x) => x.fb);
if (fbApps.length) {
  parts.push(h2("Leave Feedback"));
  for (const { id, fb } of fbApps) {
    // Opens and failed sends come from the event stream; responses come from the
    // table. Deliberately: a response is a row that landed, and an open is only
    // ever an impression. They are counted from different places and cannot be
    // made to disagree by one of them dropping an event.
    const w = events?.apps?.[id]?.windows?.["1"];
    const byName = Object.fromEntries((w?.eventsByName ?? []).map((e) => [e.name, e]));
    const opened = byName["feedback.shown"]?.count ?? 0;
    const failed = byName["feedback.failed"]?.count ?? 0;
    const sidecar = journeys?.apps?.[id]?.feedback ?? null;

    if (!fb.available) {
      parts.push(p(`<strong>${esc(appName(id))}</strong> — feedback table not readable in this run, so this is "not available" rather than zero.`, WARN));
      continue;
    }
    if (!fb.responses) {
      parts.push(
        p(
          `<strong>${esc(appName(id))}</strong> — <strong>nobody has sent feedback yet.</strong> ` +
            (opened
              ? `The form was opened ${opened} time${opened === 1 ? "" : "s"} in the last 24h, so people are reaching it and not finishing.`
              : `The form was not opened at all in the last 24h either, so this is a reach problem before it is a response problem.`) +
            (failed ? ` <span style="color:${WARN};">${failed} send${failed === 1 ? "" : "s"} failed.</span>` : ""),
        ),
      );
      continue;
    }

    const n = fb.nps;
    parts.push(
      p(
        `<strong>${esc(appName(id))}</strong> — <strong>${fb.responses}</strong> response${fb.responses === 1 ? "" : "s"} all time ` +
          `from ${fb.people} ${fb.people === 1 ? "person" : "people"}${fb.guests ? `, ${fb.guests} sent as a guest` : ""}. ` +
          `Opened ${opened} time${opened === 1 ? "" : "s"} in the last 24h${failed ? `, <span style="color:${WARN};">${failed} failed to send</span>` : ""}. ` +
          (fb.contactable ? `<strong>${fb.contactable}</strong> asked to be replied to. ` : "") +
          (fb.excluded ? `<span style="color:${MUTED};">${fb.excluded} of ours excluded.</span>` : ""),
      ),
    );

    // An NPS off a handful of answers is a number, not a measurement. Print the n
    // beside it always, and refuse the headline score under 10.
    if (n.answered) {
      parts.push(
        p(
          n.answered >= 10
            ? `NPS <strong>${n.score}</strong> from ${n.answered} score${n.answered === 1 ? "" : "s"} — ${n.promoters} promoter${n.promoters === 1 ? "" : "s"}, ${n.passives} passive, ${n.detractors} detractor${n.detractors === 1 ? "" : "s"} (average ${n.average}/10).`
            : `${n.answered} score${n.answered === 1 ? "" : "s"} so far, averaging <strong>${n.average}</strong>/10 (${n.promoters} promoter${n.promoters === 1 ? "" : "s"}, ${n.passives} passive, ${n.detractors} detractor${n.detractors === 1 ? "" : "s"}). Too few for an NPS figure — that needs 10.`,
        ),
      );
    }

    // The 1-5 aspect ratings, worst first: the lowest-scoring part of the product
    // is the line worth reading, and sorting by name would bury it.
    const rated = fbRated(fb.ratings);
    if (rated.length) {
      parts.push(`<tr><td style="padding:2px 22px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><th style="${cellHead}">Rated</th><th style="${cellHead}text-align:right;">Average</th><th style="${cellHead}text-align:right;">Answers</th></tr>
${rated.map(([k, v]) => `<tr><td style="${cell}">${esc(qLabel(k))}</td><td style="${num}">${v.avg ?? "-"}${v.avg != null && fbMax(k) ? `/${fbMax(k)}` : ""}</td><td style="${num}">${v.n}</td></tr>`).join("")}
</table></td></tr>`);
    }

    // Choice answers - which other card games people asked for, mainly. Top 5,
    // because the house rule caps a visible list there and the tail is a long
    // flat one nobody acts on.
    for (const [q, counts] of Object.entries(fb.choices)) {
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (!top.length) continue;
      parts.push(p(`<strong>${esc(q)}</strong>: ${top.map(([k, v]) => `${esc(k)} ${v}`).join(" · ")}${Object.keys(counts).length > 5 ? ` <span style="color:${MUTED};">+${Object.keys(counts).length - 5} more</span>` : ""}`));
    }

    // What they actually wrote. The whole point of a feedback section, and the one
    // part that only exists in the gitignored sidecar - so when it is missing, say
    // so rather than implying nobody wrote anything.
    if (!sidecar) {
      parts.push(p(`${fb.withText} response${fb.withText === 1 ? "" : "s"} carried written answers, but <code>data/journeys.json</code> was not available in this run, so they cannot be quoted.`, WARN));
    } else {
      // EVERY response, each one whole (owner, 2026-10-02).
      //
      // This used to filter to responses carrying written answers and cap at five.
      // The first real response was nine numbers and no prose, so it matched that
      // filter nowhere: it existed in the averages above and in no other line of
      // the email, which reads as "there is no detail" when the detail was in hand.
      // A survey answered entirely in numbers is still an answered survey.
      //
      // The cap is high rather than absent so a hundred-response day cannot build an
      // email a mail client refuses to render, and it says so when it bites.
      const SHOW = 25;
      const shown = sidecar.slice(0, SHOW);
      for (const r of shown) {
        const textKeys = new Set(Object.keys(r.text ?? {}));
        const values = Object.entries(r.answers ?? {}).filter(([k]) => !textKeys.has(k)).sort(fbSort);
        const ctx = r.context ?? {};
        const meta = [
          ctx.platform,
          ctx.tier ? `${ctx.tier} tier` : null,
          typeof ctx.binders === "number" ? `${ctx.binders} binder${ctx.binders === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        const prose = Object.entries(r.text ?? {})
          .sort(fbSort)
          .map(
            ([k, v]) =>
              `<div style="margin:4px 0;"><div style="color:${MUTED};font-size:11.5px;">${esc(qLabel(k))}</div>` +
              `<div style="white-space:pre-wrap;">${esc(String(v).slice(0, 1500))}</div></div>`,
          )
          .join("");
        const rows = values
          .map(
            ([k, v]) =>
              `<div style="margin:1px 0;"><span style="color:${MUTED};">${esc(qLabel(k))}:</span> <strong>${esc(fbAnswer(k, v))}</strong></div>`,
          )
          .join("");
        // Said out loud, because an absent block and a skipped question look identical
        // in an email and only one of them is a finding.
        const nothingWritten = textKeys.size
          ? ""
          : `<div style="color:${MUTED};margin:4px 0;">No written answers - every open question was skipped.</div>`;
        parts.push(
          p(
            `<div style="border-left:3px solid ${LINE};padding-left:10px;">` +
              `<div style="color:${MUTED};font-size:11.5px;">${esc(r.user)}${r.guest ? " (guest)" : ""} · ${esc(String(r.at).slice(0, 16))}` +
              `${r.nps != null ? ` · scored <strong>${r.nps}/10</strong>` : ""}${meta ? ` · ${esc(meta)}` : ""}` +
              `${r.contact ? ` · <span style="color:${ACCENT};">${esc(r.contact)}</span>` : ""}</div>` +
              prose +
              nothingWritten +
              rows +
              `</div>`,
            INK,
          ),
        );
      }
      if (sidecar.length > SHOW)
        parts.push(
          p(
            `+${sidecar.length - SHOW} older response${sidecar.length - SHOW === 1 ? "" : "s"} not shown - all of them are in <code>data/journeys.json</code>.`,
            MUTED,
          ),
        );
    }
  }
}

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
if (worstStale != null && worstStale > 26) T.push(`WARNING: stale lanes: ${staleLanes.join(", ")} — ${staleLanes.length === staleness.length ? "the daily lanes may not have run" : "those sections are as of their last successful run; everything else is fresh"}. See logs/run-${TODAY}.log.`);
if (missing.length) T.push(`Not available this run: ${missing.join(", ")}`);
T.push("", "MONEY");
for (const id of moneyApps) {
  const b = events?.apps?.[id]?.purchases ?? null;
  const tr = events?.apps?.[id]?.activeTrials ?? null;
  const m = money.find((x) => x.app === id) ?? null;
  T.push(`  ${appName(id)}`);
  if (b && !b.available) T.push(`    purchases NOT COLLECTED this run`);
  if (tr && !tr.available) T.push(`    free trials NOT COLLECTED this run`);
  const g = moneyGroups(id);
  const total = Object.values(g).reduce((n, xs) => n + xs.length, 0);
  if (!total) {
    if (b?.available !== false && tr?.available !== false) T.push(`    nothing on the ledger yet`);
  }
  for (const [key, lines] of Object.entries(g)) {
    if (!lines.length) continue;
    T.push(`    ${GROUP_TITLES[key]} (${groupLabel(key, lines, b)})`);
    for (const l of lines) T.push(`      ${String(l.who).padEnd(20)} ${l.what}`);
  }
  const foot = [];
  if (m?.trialUsers) foot.push(`${m.trialUsers} ever trialed`);
  const ex = (b?.excluded ?? 0) + (tr?.excluded ?? 0);
  if (ex) foot.push(`${ex} rows of ours excluded`);
  if (foot.length) T.push(`    ${foot.join(" · ")}`);
  if (m && (m.events.length || m.pricing.length)) {
    T.push(`    last 24h, event stream:`);
    for (const e of m.events) T.push(`      ${e.label ?? e.name} x${e.count} — ${e.who.join(", ") || `${e.users} guest(s)`}`);
    for (const r of m.pricing) T.push(`      viewed ${r.label ?? r.route} x${r.count} — ${r.who.join(", ") || `${r.users} guest(s)`}`);
  } else if (events) T.push(`    no PRO/trial/plan-limit interaction in the last 24h`);
}
T.push("", "YESTERDAY");
for (const d of dau) T.push(`  ${appName(d.app).padEnd(12)} active ${String(d.yesterday).padStart(3)}   new ${String(newCounts[d.app].yesterday).padStart(3)}   accounts ${String(d.totalUsers ?? "-").padStart(4)}   sessions by platform (24h): ${platformsOf(d.app)}`);
for (const d of dau.filter((x) => x.yesterday || x.who.length)) {
  T.push(`  ${appName(d.app)} — active (product activity, ${d.yesterday}): ${d.who.join(", ") || "names not carried"}`);
  const detail = didByPerson.find((x) => x.app === d.app);
  if (detail?.people.length) T.push(`    event stream, rolling 24h:`);
  for (const pp of detail?.people ?? []) T.push(`      ${pp.name}: ${[...pp.did].join(", ") || "opened it, nothing else"}`);
}
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
for (const a of newAccounts) T.push(`  ${a.who} (${a.apps.map(appName).join(" + ")}) via ${viaLabel(a)} · ${String(a.createdAt).slice(0, 16)} — ${sinceLabel(a)}`);
if (GEO_APPS.length) {
  T.push("", "WHERE NEW USERS ARE (Doggle, Pickleague)");
  if (geoAlerts.length) T.push(`  ALERT: new user outside ingestion coverage: ${geoAlerts.map((g) => `${geoWho(g)} in ${geoPlace(g)} (${geoCoverLine(g, geoUsers.apps[g.app].unit)})`).join("; ")}`);
  if (!geoSinceYesterday.length) T.push("  nobody new since yesterday");
  for (const g of geoSinceYesterday) T.push(`  ${geoWho(g)} (${appName(g.app)}) — ${geoPlace(g)}${g.src ? ` via ${g.src}` : ""}${g.city ? ` — ${geoCoverLine(g, geoUsers.apps[g.app].unit)}` : ""}`);
  for (const id of GEO_APPS) {
    const a = geoUsers.apps[id];
    const w = a.windows?.["90"];
    if (!w) continue;
    T.push(`  ${appName(id)} 90d: ${w.real} real new, ${w.located} located, ${w.noLocation} no location, ${w.active} active ${geoUsers.activeDays}d; excluded ${a.totals.excluded} ours/QA, ${a.totals.guests} guests`);
    for (const c of w.cities.slice(0, 8)) {
      const cv = c.coverage;
      const cover = !cv?.known ? "coverage unknown" : !cv.stateCovered ? `no ${a.unit} in ${c.state}` : `${cv.countyPlaces ?? 0} ${a.unit} in ${cv.county ?? "the"} County, ${cv.statePlaces} in ${c.state}`;
      T.push(`    ${c.city}, ${c.state}: ${c.users} new, ${c.active} active — ${cover}${c.alert && c.alert !== "unknown" ? " — INGEST?" : ""}`);
    }
  }
}
if (made.length) {
  T.push("", "WHAT GOT MADE (24h)");
  for (const m of made) T.push(`  ${m.n}${m.qty ? ` (${m.qty})` : ""} ${m.label} — ${appName(m.app)}, by ${m.users} account(s)`);
}
if (puzzleApps.length) {
  T.push("", "DAILY PUZZLE");
  for (const { id, pz } of puzzleApps) {
    if (!pz.available) { T.push(`  ${appName(id)}: tables not readable this run`); continue; }
    if (!pz.days.length) { T.push(`  ${appName(id)}: nobody has opened a puzzle yet`); continue; }
    const named = journeys?.apps?.[id]?.puzzle ?? null;
    for (const d of pz.days) {
      const n = named?.find((x) => x.day === d.day) ?? null;
      const g = d.guesses;
      T.push(`  ${d.day} — opened ${d.opened}, guessed ${g ? `${g.people} (${g.tries} tries, ${g.wrong} wrong; stream)` : 0}, right ${d.correct}`);
      if (n) {
        T.push(`    opened:  ${n.opened.join(", ") || "nobody"}`);
        T.push(`    guessed: ${(n.guessers ?? []).map((x) => `${x.who} (${x.tries} ${x.tries === 1 ? "try" : "tries"}${x.wrong ? `, ${x.wrong} wrong` : ""})`).join(", ") || "nobody"}`);
        T.push(`    right:   ${n.correct.join(", ") || "nobody"}`);
      }
    }
  }
}

if (fbApps.length) {
  T.push("", "LEAVE FEEDBACK");
  for (const { id, fb } of fbApps) {
    const w = events?.apps?.[id]?.windows?.["1"];
    const byName = Object.fromEntries((w?.eventsByName ?? []).map((e) => [e.name, e]));
    const opened = byName["feedback.shown"]?.count ?? 0;
    const failed = byName["feedback.failed"]?.count ?? 0;
    if (!fb.available) {
      T.push(`  ${appName(id)}: table not readable this run (not available, not zero)`);
      continue;
    }
    if (!fb.responses) {
      T.push(`  ${appName(id)}: nobody has sent feedback yet; form opened ${opened}x in 24h${failed ? `, ${failed} failed to send` : ""}`);
      continue;
    }
    T.push(`  ${appName(id)}: ${fb.responses} response(s) from ${fb.people} people, opened ${opened}x in 24h${failed ? `, ${failed} failed` : ""}${fb.contactable ? `, ${fb.contactable} want a reply` : ""}`);
    if (fb.nps.answered) {
      T.push(
        fb.nps.answered >= 10
          ? `    NPS ${fb.nps.score} from ${fb.nps.answered} scores (avg ${fb.nps.average}/10)`
          : `    ${fb.nps.answered} score(s), avg ${fb.nps.average}/10 — too few for an NPS figure`,
      );
    }
    for (const [k, v] of fbRated(fb.ratings)) {
      T.push(`    ${qLabel(k)}: ${v.avg}${fbMax(k) ? `/${fbMax(k)}` : ""} (${v.n})`);
    }
    for (const r of (journeys?.apps?.[id]?.feedback ?? []).slice(0, 25)) {
      T.push(
        `    ${r.user}${r.guest ? " (guest)" : ""} ${String(r.at).slice(0, 16)}${r.nps != null ? ` (${r.nps}/10)` : ""}${r.contact ? ` <${r.contact}>` : ""}`,
      );
      const textKeys = new Set(Object.keys(r.text ?? {}));
      for (const [k, v] of Object.entries(r.text ?? {}).sort(fbSort)) {
        T.push(`      ${qLabel(k)}: ${String(v).slice(0, 1500)}`);
      }
      if (!textKeys.size) T.push("      (no written answers - every open question was skipped)");
      for (const [k, v] of Object.entries(r.answers ?? {}).filter(([k2]) => !textKeys.has(k2)).sort(fbSort)) {
        T.push(`      ${qLabel(k)}: ${fbAnswer(k, v)}`);
      }
    }
  }
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
