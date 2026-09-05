// Events report: reads data/events.json (aggregates) and, when present, the
// gitignored data/journeys.json (identity-bearing per-session timelines and the
// per-number user rosters), and writes reports/events.html + reports/events.md.
//
// Order is deliberate: the questions first, then the evidence, then the gaps.
// The gaps panel is not an appendix — a funnel stage whose definition is known
// to be wrong carries its caveat inline, next to the number it distorts.
//
// Two interactive affordances, both HTML-only:
//   * a 24h / 7d / 14d / 30d window toggle. All four are precomputed and
//     rendered; the toggle only changes which is visible, so there is no
//     client-side recomputation to disagree with the server's.
//   * hover any count to see WHO is behind it. Rosters live in journeys.json,
//     never in the committed aggregates, and are written with textContent —
//     a username is user-supplied text and must never reach innerHTML.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { ROOT, readConfig, dayOf } from "./lib/studio.mjs";
import { hoverAttr, hoverLayer } from "./lib/hover.mjs";
import { STANDARD_WINDOWS, windowBar, windowLabel, windowScript } from "./lib/windows.mjs";

const DATA = join(ROOT, "data", "events.json");
if (!existsSync(DATA)) {
  console.error("No data/events.json — run `npm run events` first.");
  process.exit(1);
}
const store = JSON.parse(readFileSync(DATA, "utf8"));
const CFG = readConfig("events.json");
const GAPS = CFG.gaps ?? {};

// Optional and gitignored: journeys carry account identity.
const JPATH = join(ROOT, "data", "journeys.json");
const journeys = existsSync(JPATH) ? JSON.parse(readFileSync(JPATH, "utf8")).apps : {};

const MAX_SESSIONS_SHOWN = 40;
const MAX_EVENTS_PER_SESSION = 60;
const WINDOWS = store.windows ?? STANDARD_WINDOWS;
const DEFAULT_WINDOW = Math.max(...WINDOWS);
const apps = Object.entries(store.apps ?? {});

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v) => (v == null ? "—" : String(v));
const pctS = (v) => (v == null ? "—" : `${v}%`);

function secs(v) {
  if (v == null) return "—";
  if (v < 60) return `${Math.round(v)}s`;
  if (v < 3600) return `${Math.round(v / 60)}m`;
  return `${(v / 3600).toFixed(1)}h`;
}
const clock = (ts) => new Date(ts).toLocaleTimeString("en-GB", { hour12: false });
const day = (ts) => dayOf(ts);
const winLabel = windowLabel;

// Sort by how much attention a gap still needs: unfinished work first, then by
// severity. A fixed or deferred gap stays listed — the record of why a number
// once read the way it did is worth more than a tidy list — but it sinks.
const SEV_ORDER = { blocking: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER = { open: 0, specced: 1, landed: 2, deferred: 3, fixed: 4 };
const gapList = Object.entries(GAPS).sort(
  (a, b) =>
    (STATUS_ORDER[a[1].status ?? "open"] ?? 9) - (STATUS_ORDER[b[1].status ?? "open"] ?? 9) ||
    (SEV_ORDER[a[1].severity] ?? 9) - (SEV_ORDER[b[1].severity] ?? 9),
);

// A hover handle. `{scope}` is replaced with the active window by the shared
// hover layer, so one attribute serves all four windows. Rendered even when the
// roster is missing (aggregates-only run) — the handler finds nothing and shows
// no tooltip rather than erroring.
const hov = (appId, kind, key) => ` ${hoverAttr(appId, "{scope}", kind, key)}`;

// journeys.json nests rosters as app -> window -> kind -> key. The shared hover
// layer wants one flat map, so flatten to the same key shape the markup emits.
const flatRosters = {};
for (const [appId, j] of Object.entries(journeys)) {
  for (const [win, kinds] of Object.entries(j.rosters ?? {})) {
    for (const [kind, entries] of Object.entries(kinds)) {
      for (const [key, r] of Object.entries(entries)) {
        flatRosters[`${appId}|${win}|${kind}|${key}`] = r;
      }
    }
  }
}

// ---------- pieces ----------

function tiles(w, appId) {
  const t = w.totals;
  const cells = [
    ["Sessions", t.sessions, `${t.bouncedSessions} ended without a second event`, "sessions"],
    ["Events", t.events, t.firstEventAt ? `since ${day(t.firstEventAt)}` : "none recorded", "events"],
    ["People", t.users, `${t.realUsers} account${t.realUsers === 1 ? "" : "s"}, ${t.guestUsers} guest${t.guestUsers === 1 ? "" : "s"}`, "users"],
    // "Ever a guest" is the population every conversion question is really
    // about, and it is the one number here that does not move when somebody
    // signs up. Converted is a subset of it, not of the accounts tile.
    [
      "Ever a guest",
      t.everGuestUsers ?? 0,
      (t.convertedUsers ?? 0) > 0
        ? `${t.convertedUsers} converted — their guest history stays joined`
        : "none have converted yet",
      "everGuestUsers",
    ],
    ["Median session", secs(t.medianSessionSecs), "a floor — see session_end gap", null],
  ];
  return `<div class="tiles">${cells
    .map(
      ([k, v, sub, rk]) =>
        `<div class="tile${rk ? " hoverable" : ""}"${rk ? hov(appId, "tiles", rk) : ""}><div class="k">${esc(k)}</div><div class="value${v === 0 || v === "—" ? " nodata" : ""}">${esc(n(v))}</div><div class="sub">${esc(sub)}</div></div>`,
    )
    .join("")}</div>`;
}

// Funnel bars are width-proportional to the top stage, so the drop-off is the
// visual, not the numbers. A stage with a caveat gets a marker linking to the
// gap that makes it untrustworthy — but only while that gap is still live. A
// `fixed` gap stays in the register as the record of what was wrong and when;
// carrying its marker on the number would keep telling the reader not to trust
// a figure that has since been proven, which is its own kind of wrong. Every
// other status (open / specced / landed / deferred) still earns the marker:
// landed means shipped-but-unproven, which is precisely when to keep warning.
function funnel(f, appId) {
  const top = f.stages[0]?.users ?? 0;
  const rows = f.stages
    .map((s, i) => {
      const w = top > 0 ? Math.max(s.users > 0 ? 2 : 0, (s.users / top) * 100) : 0;
      const drop = i > 0 && f.stages[i - 1].users > s.users ? f.stages[i - 1].users - s.users : 0;
      const live = s.caveat && GAPS[s.caveat]?.status !== "fixed";
      const mark = live
        ? ` <a class="caveat" href="#gap-${esc(s.caveat)}" title="${esc(GAPS[s.caveat]?.title ?? s.caveat)}">!</a>`
        : "";
      return `<tr class="hoverable"${hov(appId, "funnels", `${f.id}|${s.id}`)}>
  <td class="fl">${esc(s.label)}${mark}</td>
  <td class="fb"><span class="bar" style="width:${w.toFixed(1)}%"></span></td>
  <td class="fn">${s.users}</td>
  <td class="fp">${i === 0 ? "" : pctS(s.ofTop)}</td>
  <td class="fd">${drop ? `&minus;${drop}` : ""}</td>
</tr>`;
    })
    .join("\n");
  // A scoped funnel says so, and says how big the set-aside was. Narrowing a
  // population silently is the same sin as dropping exclusions silently: the
  // reader cannot tell a denominator that was chosen from one that was assumed.
  const scope = f.scope
    ? `<div class="scope"><strong>${f.scope.setAside}</strong> of ${f.scope.of} people in this window are guests and are not counted here.${
        f.scope.note ? ` ${esc(f.scope.note)}` : ""
      }</div>`
    : "";
  return `<div class="funnel">
  <div class="q">${esc(f.question)}</div>
  ${scope}<table class="ftab">${rows}</table>
</div>`;
}

function truthPanel(w) {
  const t = w.truth ?? {};
  const rows = Object.entries(t)
    .map(([kind, v]) => {
      const untracked =
        v.untracked == null
          ? "—"
          : v.untracked > 0
            ? `<span class="warn">${v.untracked} with no event</span>`
            : "all tracked";
      return `<tr><td>${esc(kind)}</td><td class="num">${v.users}</td><td class="num muted">${v.excludedUsers}</td><td>${untracked}</td><td class="muted">${v.earliest ? esc(day(v.earliest)) : "—"}</td></tr>`;
    })
    .join("");
  if (!rows) return "";
  return `<table class="tbl">
  <thead><tr><th>Ground truth</th><th class="num">Users</th><th class="num">Excluded</th><th>Event stream</th><th>Earliest</th></tr></thead>
  <tbody>${rows}</tbody></table>
  <p class="note">Read straight from the product tables (trials, entitlements), not the event stream — so these cover all history and do <strong>not</strong> move with the window above. A row counted here with no matching event is the gap between what happened and what was recorded.</p>`;
}

function eventTable(w, appId) {
  if (!w.eventsByName.length) return `<p class="empty">No events recorded from non-excluded users in this window.</p>`;
  const rows = w.eventsByName
    .map(
      (e) =>
        `<tr class="hoverable"${hov(appId, "events", e.name)}><td>${esc(e.label)}${e.known ? "" : ' <span class="warn">unrecognised</span>'}<div class="mono">${esc(e.name)}</div></td><td class="muted">${esc(e.stage ?? "—")}</td><td class="num">${e.count}</td><td class="num">${e.users}</td></tr>`,
    )
    .join("");
  return `<table class="tbl"><thead><tr><th>Event</th><th>Stage</th><th class="num">Fired</th><th class="num">People</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function routeTable(w, appId) {
  if (!w.routes.length) return "";
  const rows = w.routes
    .map(
      (r) =>
        `<tr class="hoverable"${hov(appId, "routes", r.route)}><td><code>${esc(r.route)}</code>${r.intent === "pricing" ? ' <span class="pill pricing">pricing</span>' : ""}${r.label ? ` <span class="muted">${esc(r.label)}</span>` : ""}</td><td class="num">${r.count}</td><td class="num">${r.users}</td></tr>`,
    )
    .join("");
  return `<h4>Pages</h4><table class="tbl"><thead><tr><th>Route</th><th class="num">Views</th><th class="num">People</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---------- what we asked of people ----------
//
// The interruptions: cap gates, the PRO offer, and the dialogs that open on
// their own. Kept together because they are one question — what does this
// product demand of a user, and what do they say — and split from "what people
// did", which is the opposite question.
//
// The prompts get their own block below the monetization ones ON PURPOSE. Two
// of the three are a privacy remediation and a legal attestation; a decline
// rate on those is a record, not a conversion rate, and nobody should be able
// to read this page as an invitation to optimise one.

/** How a fixed-union prop breaks down, or an honest blank. `—` is the bucket for
 *  a value the emitter did not carry, which is never the same as a zero. */
function breakdown(map, appId, kindKey, order) {
  const entries = Object.entries(map ?? {});
  if (!entries.length) return '<span class="muted">—</span>';
  const known = order.filter((k) => entries.some(([n]) => n === k));
  const extra = entries.map(([n]) => n).filter((n) => n !== "—" && !order.includes(n));
  const missing = map["—"];
  const parts = [...known, ...extra].map((k) => {
    const v = map[k];
    const h = kindKey ? hov(appId, "asks", `${kindKey}|${k}`) : "";
    // An unexpected value is a contract change upstream, not a rendering problem.
    const flag = order.includes(k) ? "" : ' <span class="warn">new</span>';
    return `<span class="hoverable"${h}>${esc(k)}${flag} <strong>${v.count}</strong></span>`;
  });
  if (missing) parts.push(`<span class="muted" title="Recorded before this prop existed">not recorded ${missing.count}</span>`);
  return parts.join(' <span class="muted">·</span> ');
}

const AS_ORDER = ["dialog", "toast", "inline"];
const OFFER_ORDER = ["trial", "upgrade", "signin", "toast"];
const VIA_ORDER = ["not_now", "close", "navigate"];
const RESPONSE_ORDER = ["accepted", "declined", "dismissed", "abandoned"];

// Routes have no fixed vocabulary, so `breakdown`'s order list would flag every
// one of them as new. Sorted by weight instead, and never flagged.
function routes(map, appId, kindKey) {
  const entries = Object.entries(map ?? {}).sort((a, b) => b[1].count - a[1].count);
  if (!entries.length) return '<span class="muted">—</span>';
  return entries
    .map(([r, v]) =>
      r === "—"
        ? `<span class="muted" title="No page.view in the session to place it against">unplaced ${v.count}</span>`
        : `<span class="hoverable"${hov(appId, "asks", `${kindKey}|${r}`)}><code>${esc(r)}</code> <strong>${v.count}</strong></span>`,
    )
    .join(' <span class="muted">·</span> ');
}

/** Prompts carry an id the studio does not otherwise know. Named here so the
 *  page reads in English, and labelled with what the prompt is FOR, because
 *  "avatar-consent" and "a photo we published without asking" are not the same
 *  sentence to anyone reading a decline rate. */
const PROMPT_LABELS = {
  "avatar-consent": ["Their profile photo", "privacy remediation — a provider photo we published unasked, then withdrew"],
  "rights-attestation": ["The sharing attestation", "legal — affirms they hold rights to what they publish"],
  "pro-trial-offer": ["The PRO trial, second chance", "monetization — a one-shot offer to a fixed recovered cohort"],
};

function asksPanel(w, appId) {
  const a = w.asks;
  if (!a) return '<p class="empty">Not computed for this window.</p>';
  const { gates, prompts, offer } = a;
  const out = [];

  // --- cap gates ---
  if (!gates.length) {
    out.push(
      '<p class="empty">No plan limit stopped anyone in this window. Check instrumentation coverage below before reading that as "nobody hit a wall".</p>',
    );
  } else {
    const rows = gates
      .map((g) => {
        const k = `${g.limit}|${g.surface}`;
        // Three states, not two. A row whose gates never carried `is_guest` must
        // NOT print 0 — the people behind several of these rows are anonymous,
        // and a zero there would say the opposite of what the roster shows.
        // Hoverable only when somebody is behind it: an empty tooltip on a zero
        // reads as a broken roster rather than as nobody.
        const guests = !g.guestKnown
          ? `<td class="muted" title="Recorded before is_guest existed">not recorded</td>`
          : g.guests
            ? `<td class="num hoverable"${hov(appId, "asks", `gateGuests|${k}`)}>${g.guests}</td>`
            : `<td class="num muted">0</td>`;
        return `<tr class="hoverable"${hov(appId, "asks", `gate|${k}`)}><td><code>${esc(g.limit)}</code></td><td class="muted">${esc(g.surface)}</td><td class="num">${g.shown}</td><td class="num">${g.people}</td>${guests}<td>${breakdown(g.as, appId, null, AS_ORDER)}</td><td>${breakdown(g.offer, appId, `gateOffer|${k}`, OFFER_ORDER)}<div class="seen">${
          g.offerHere
            ? `<span class="hoverable"${hov(appId, "asks", `gateOffered|${k}`)}>trial rendered on <strong>${g.offerHere}</strong> of ${g.shown}</span>`
            : `trial rendered on <strong>0</strong> of ${g.shown}`
        }</div></td><td>${g.dismissed ? breakdown(g.via, appId, `gateVia|${k}`, VIA_ORDER) : '<span class="muted">none recorded</span>'}</td></tr>`;
      })
      .join("");
    out.push(
      `<table class="tbl"><thead><tr><th>Wall</th><th>Where</th><th class="num">Shown</th><th class="num">People</th><th class="num">Guests</th><th>How</th><th>Offer</th><th>Backed out</th></tr></thead><tbody>${rows}</tbody></table>`,
      `<p class="note">The <strong>Offer</strong> column is two different things on purpose. The top line is what the wall SAID it was about to draw, stamped on <code>cap.gate_shown</code> at the moment it opened. The line under it is what the stream actually saw render — a <code>pro.offer_shown</code> in the same session carrying the same <code>surface</code> string, within a minute. They are allowed to disagree, and where they do the second one is the truth.</p>`,
      `<p class="note">A row is one wall — the <code>limit_key</code> and the surface it was met on, the pair that joins a gate to its offer. <strong>Shown</strong> counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. Read it next to the tier snapshot in the plans report, never instead of it.</p>`,
    );
  }

  // --- the offer itself ---
  const off = offer ?? {};
  if (off.shown) {
    const pcDecl = off.shown ? Math.round((off.declined / off.shown) * 1000) / 10 : 0;
    out.push(
      "<h4>Where the PRO offer was shown</h4>",
      `<p class="note">Shown <strong class="hoverable"${hov(appId, "asks", "offerShown")}>${off.shown}</strong> time${off.shown === 1 ? "" : "s"} to <strong>${off.shownPeople}</strong> ${off.shownPeople === 1 ? "person" : "people"}, walked away from <strong class="hoverable"${hov(appId, "asks", "offerDeclined")}>${off.declined}</strong> time${off.declined === 1 ? "" : "s"} (${pcDecl}%), pressed <strong class="hoverable"${hov(appId, "asks", "offerClicked")}>${off.clicked}</strong>. A decline is only recorded where walking away is an ACT — a dismissible dialog — never for leaving a page, so the shown and declined counts are deliberately not two ends of one bar.</p>`,
    );
    const rows = (off.bySurface ?? [])
      .map(
        (s) =>
          `<tr><td class="hoverable"${hov(appId, "asks", `offerSurface|${s.surface}`)}><code>${esc(s.surface)}</code></td><td>${routes(s.routes, appId, `offerRoute|${s.surface}`)}</td><td class="num">${s.shown}</td><td class="num">${s.people}</td><td class="num${s.declined ? " hoverable" : " muted"}"${s.declined ? hov(appId, "asks", `offerSurfaceDeclined|${s.surface}`) : ""}>${s.declined}</td><td class="num${s.clicked ? " hoverable" : " muted"}"${s.clicked ? hov(appId, "asks", `offerSurfaceClicked|${s.surface}`) : ""}>${s.clicked}</td></tr>`,
      )
      .join("");
    if (rows) {
      out.push(
        `<table class="tbl"><thead><tr><th>Surface</th><th>On which page</th><th class="num">Shown</th><th class="num">People</th><th class="num">Declined</th><th class="num">Pressed</th></tr></thead><tbody>${rows}</tbody></table>`,
        `<p class="note"><strong>Surface</strong> is the fixed string the call site passes — the same vocabulary the walls above use, so a row here and a row up there are the same place when they share a name. <strong>On which page</strong> is the route the offer actually appeared over, which is the half the enum cannot carry: <code>print_gate</code> is a sheet and opens from more than one page. It is matched to the nearest <code>page.view</code> in the session rather than the most recent one, because the offer fires from a mount effect and can beat its own screen's view to the wire by a few hundredths of a second.</p>`,
      );
    }
  }

  // --- prompts, kept apart ---
  out.push("<h4>Dialogs that open on their own</h4>");
  if (!prompts.length) {
    out.push(
      '<p class="empty">No self-opening prompt was shown in this window.</p>',
    );
  } else {
    const rows = prompts
      .map((p) => {
        const [label, why] = PROMPT_LABELS[p.prompt] ?? [p.prompt, null];
        const unpaired = p.unpaired
          ? ` <span class="warn" title="Shown, then the page closed before anything came back — a shut tab, not a lost event">${p.unpaired} left with it open</span>`
          : "";
        return `<tr class="hoverable"${hov(appId, "asks", `prompt|${p.prompt}`)}><td>${esc(label)}<div class="mono">${esc(p.prompt)}</div>${why ? `<div class="muted">${esc(why)}</div>` : ""}</td><td class="num">${p.shown}</td><td class="num">${p.people}</td><td>${breakdown(p.response, appId, `promptR|${p.prompt}`, RESPONSE_ORDER)}${unpaired}</td></tr>`;
      })
      .join("");
    out.push(
      `<table class="tbl"><thead><tr><th>Prompt</th><th class="num">Shown</th><th class="num">People</th><th>What came back</th></tr></thead><tbody>${rows}</tbody></table>`,
      `<p class="note"><strong>dismissed</strong> is a closed dialog, <strong>abandoned</strong> is a screen left with it open, and <strong>left with it open</strong> is a tab shut before either — three different silences, which is the entire reason these events exist. The last one is counted separately because it cannot be emitted from the page that is going away in every case: michi beacons an <code>abandoned</code> on <code>pagehide</code>, but a mobile tab killed after the browser froze it stays here, and inventing an answer for it would mean also inventing one for everybody who merely switched tabs. Two of these prompts are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, and a low acceptance rate on either is a finding about the ask, never a rate to drive up.</p>`,
    );
  }
  return out.join("\n");
}

// "Did anything past the open" is four different people wearing one number.
// The ladder splits them, and the only rung that is an activation is the last.
// Ordered worst-to-best so the eye travels toward the outcome that matters.
const PRICING = new Set(
  Object.entries(CFG.routes ?? {})
    .filter(([, v]) => v.intent === "pricing")
    .map(([r]) => r),
);

const DEPTH_RUNGS = [
  ["openOnly", "Opened and left", "fired session.start and nothing else"],
  ["looked", "Looked at a page or two", "read, but never went three deep"],
  ["explored", "Wandered the site", "3+ pages, built nothing"],
  ["made", "Built something", "created a binder, added cards, ran a demo"],
];

function guestPanel(w, appId) {
  const g = w.guests;
  if (!g || !g.people) return '<p class="empty">No guest traffic in this window.</p>';

  const top = g.people;
  const rungs = DEPTH_RUNGS.map(([k, label, sub]) => {
    const v = g.depth[k] ?? 0;
    const pc = top ? Math.round((v / top) * 1000) / 10 : 0;
    return `<tr class="hoverable${k === "made" ? " made" : ""}"${hov(appId, "tiles", `guestDepth_${k}`)}>
<td>${esc(label)}<div class="muted">${esc(sub)}</div></td>
<td class="num">${v}</td>
<td class="bar"><span style="width:${Math.max(pc, v ? 1.5 : 0)}%"></span></td>
<td class="num">${pctS(pc)}</td></tr>`;
  }).join("");

  // Conversion is quoted against the makers, not against all guests. A guest who
  // opened and left was never a candidate, and dividing by them makes a real
  // signal look like noise.
  const made = g.depth.made ?? 0;
  const convLine = made
    ? `<p class="note">Of the <strong>${made}</strong> who built something, <strong>${g.convertedOfMade}</strong> went on to create an account${
        g.converted > g.convertedOfMade ? ` (${g.converted} converted in total)` : ""
      }. Building is the step that predicts staying — nobody has ever converted without it.</p>`
    : "";

  // Demand vs answer. Only worth printing when somebody actually asked.
  const p = g.pricing ?? { asked: 0, offered: 0 };
  const pricingLine = p.asked
    ? `<p class="note${p.offered < p.asked ? " warn" : ""}"><strong class="hoverable"${hov(appId, "tiles", "guestAskedPricing")}>${p.asked}</strong> guest${
        p.asked === 1 ? "" : "s"
      } walked to a pricing page; <strong class="hoverable"${hov(appId, "tiles", "guestOffered")}>${p.offered}</strong> ${
        p.offered === 1 ? "was" : "were"
      } shown the PRO offer.${
        p.offered < p.asked
          ? " <code>TrialCta</code> renders only when <code>isSignedIn &amp;&amp; !is_anonymous</code>, so a guest on that page sees no offer by design — the impression event is correctly silent, and the demand above it is real."
          : ""
      }</p>`
    : "";

  const actions = g.actions.filter((a) => a.name !== "session.start");
  const actionRows = actions.length
    ? actions
        .map(
          (a) =>
            `<tr class="hoverable"${hov(appId, "events", `guestAction_${a.name}`)}><td>${esc(a.label)}<div class="mono">${esc(a.name)}</div></td><td class="num">${a.people}</td><td class="num">${a.fires}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="3" class="empty">Guests fired nothing but session.start.</td></tr>`;

  const routeRows = g.routes
    .map(
      (r) =>
        `<tr class="hoverable"${hov(appId, "routes", `guestRoute_${r.route}`)}><td><code>${esc(r.route)}</code>${
          PRICING.has(r.route) ? ' <span class="pill pricing">pricing</span>' : ""
        }</td><td class="num">${r.people}</td><td class="num">${r.fires}</td></tr>`,
    )
    .join("");

  return `<table class="tbl depth"><thead><tr><th>How far they got</th><th class="num">People</th><th></th><th class="num">of ${top}</th></tr></thead><tbody>${rungs}</tbody></table>
${convLine}${pricingLine}
<div class="cols">
<div><h4>What guests did</h4><table class="tbl"><thead><tr><th>Action</th><th class="num">People</th><th class="num">Times</th></tr></thead><tbody>${actionRows}</tbody></table></div>
<div><h4>Where guests went</h4><table class="tbl"><thead><tr><th>Route</th><th class="num">People</th><th class="num">Views</th></tr></thead><tbody>${routeRows}</tbody></table></div>
</div>`;
}

// Print/QR campaign attribution: arrivals by code, and what became of them. The three columns
// answer marketing's actual question ("did the card show produce members?") in order: people who
// arrived carrying the code, people who gained an account mid-visit, people whose account.created
// itself carried the code. Empty is a real state and says WHICH zero it is — capture landed
// 2026-08-13 but is unproven until the first genuine scan (gap qr_campaign_capture).
function campaignPanel(w, appId) {
  const rows = w.campaigns ?? [];
  const deeper = `<p class="note">This is the summary. The <a href="../reports/campaigns.html">Print &amp; QR campaigns</a> lane carries the same codes joined to marketing-studio's registry of what actually exists on paper, all-time by default, with the capture-readiness table that says which kind of zero a zero is.</p>`;
  if (!rows.length) {
    return `<p class="empty">No campaign-tagged arrivals in this window. Capture is landed but a printed code has yet to be scanned — a zero here is "not verified end-to-end", not "campaigns produce nothing" <a href="#gap-qr_campaign_capture"><code>qr_campaign_capture</code></a>.</p>${deeper}`;
  }
  const body = rows
    .map(
      (r) => `<tr class="hoverable"${hov(appId, "tiles", `campaign_${r.code}`)}>
<td><code>${esc(r.code)}</code>${r.source || r.medium ? `<div class="muted">${esc([r.source, r.medium].filter(Boolean).join(" · "))}</div>` : ""}</td>
<td class="num">${r.people}</td><td class="num">${r.sessions}</td><td class="num">${r.converted}</td><td class="num">${r.signups}</td></tr>`,
    )
    .join("");
  return `<table class="tbl"><thead><tr><th>Campaign</th><th class="num">People</th><th class="num">Sessions</th><th class="num">Converted on a visit</th><th class="num">Signups carrying the code</th></tr></thead><tbody>${body}</tbody></table>
<p class="note">"Converted" = a session that arrived with the code and gained an account mid-visit. "Signups carrying the code" = <code>account.created</code> whose props carry it (survives a reload, so it can attribute a signup whose landing fell outside this window). Neither is a scan counter — a scan that never loaded the page is invisible by design (static codes, no redirect service).</p>${deeper}`;
}

function coveragePanel(a) {
  const c = a.coverage;
  const parts = [];
  parts.push(
    `<p class="note"><strong>${c.fired} of ${c.declared}</strong> instrumented events for this app have fired at least once. Counted across <em>all</em> traffic including our own and QA, and across all time regardless of the window above: whether a <code>track()</code> call site works is a property of the code, so filtering it would report a verified event as broken.</p>`,
  );
  if (c.neverFired.length) {
    parts.push(
      `<p class="note warn">Never fired by anyone: ${c.neverFired.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Unverified — the call site may be unreachable. Exercise these in QA before trusting a zero here as a behavioural finding.</p>`,
    );
  }
  if (c.neverFiredReal?.length) {
    parts.push(
      `<p class="note">Verified working but not yet seen from a real user: ${c.neverFiredReal.map((x) => `<code>${esc(x)}</code>`).join(", ")}. The instrumentation is fine; the behaviour has not happened outside our own accounts.</p>`,
    );
  }
  if (c.planned?.length) {
    const pending = c.planned.filter((x) => !(c.plannedLanded ?? []).includes(x));
    if (pending.length) {
      parts.push(
        `<p class="note">Registered, not yet fired: ${pending.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Kept out of the counts above — an event nobody has written cannot have a broken call site. See <a href="#gaps">tracking gaps</a>.</p>`,
      );
    }
    if (c.plannedLanded?.length) {
      parts.push(
        `<p class="note"><strong>Landed since the spec:</strong> ${c.plannedLanded.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Mark the matching gap <code>fixed</code> in <code>config/events.json</code>.</p>`,
      );
    }
  }
  if (c.unrecognised.length) {
    parts.push(
      `<p class="note warn">Seen in the data but not in the studio taxonomy: ${c.unrecognised.map((x) => `<code>${esc(x)}</code>`).join(", ")}. Add them to <code>config/events.json</code>.</p>`,
    );
  }
  return parts.join("\n");
}

// Journeys are rendered once and filtered client-side by the window toggle —
// each card carries its start time as an epoch so the filter is a comparison,
// not a date parse in a loop.
function journeyPanel(appId) {
  const j = journeys[appId];
  if (!j) return `<p class="note">No <code>data/journeys.json</code> — run <code>npm run events</code> to generate it.</p>`;
  if (!j.sessions.length) return `<p class="empty">No sessions from non-excluded users.</p>`;
  const shown = j.sessions.slice(0, MAX_SESSIONS_SHOWN);
  const cards = shown
    .map((s) => {
      const evs = s.events.slice(0, MAX_EVENTS_PER_SESSION);
      const items = evs
        .map((e) => {
          const cls = ["ev", e.milestone ? "ms" : "", e.pricing ? "pr" : ""].filter(Boolean).join(" ");
          const props = e.props
            ? ` <span class="props">${esc(
                Object.entries(e.props)
                  .map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : v}`)
                  .join(" · "),
              )}</span>`
            : "";
          return `<li class="${cls}"><span class="t">${esc(clock(e.ts))}</span> <span class="lbl">${esc(e.label)}</span>${props}</li>`;
        })
        .join("");
      const more =
        s.events.length > evs.length
          ? `<li class="ev muted">+${s.events.length - evs.length} more event${s.events.length - evs.length === 1 ? "" : "s"}</li>`
          : "";
      return `<details class="sess" data-since="${Date.parse(s.startedAt)}">
  <summary>
    <span class="who">${esc(s.user)}</span>
    ${s.guest ? '<span class="pill guest">guest</span>' : '<span class="pill acct">account</span>'}
    <span class="pill">${esc(s.platform ?? "?")}</span>
    <span class="when">${esc(day(s.startedAt))} ${esc(clock(s.startedAt))}</span>
    <span class="dur">${esc(secs(s.durationSecs))}</span>
    <span class="cnt">${s.events.length} event${s.events.length === 1 ? "" : "s"}</span>
  </summary>
  <ol class="tl">${items}${more}</ol>
</details>`;
    })
    .join("\n");
  const trunc =
    j.sessions.length > shown.length
      ? `<p class="note">Showing the ${shown.length} most recent of ${j.sessions.length} sessions.</p>`
      : "";
  return `<div data-since-group>${cards}</div><p class="note win-empty" hidden>No sessions started in this window.</p>${trunc}`;
}

function appSection(id, a) {
  const widest = a.windows[DEFAULT_WINDOW];
  const plats = Object.entries(widest.totals.platforms ?? {})
    .map(([k, v]) => `${esc(k)} ${v}`)
    .join(" · ");

  // One block per window; the toggle flips which is shown. Precomputing beats
  // recomputing in the browser — the two could not then disagree.
  const blocks = WINDOWS.map((d) => {
    const w = a.windows[d];
    const t = w.totals;
    const excl =
      t.excludedSessions || t.excludedEvents
        ? `<p class="note">Excluded from every number in this view: <strong>${t.excludedSessions}</strong> session${t.excludedSessions === 1 ? "" : "s"} and <strong>${t.excludedEvents}</strong> event${t.excludedEvents === 1 ? "" : "s"} from our own, QA and automated accounts (see <code>config/exclusions.json</code>). The stream is working; that traffic is just ours.</p>`
        : "";
    const orphan = t.orphanEvents
      ? `<p class="note warn">${t.orphanEvents} event${t.orphanEvents === 1 ? "" : "s"} could not be attached to a session.</p>`
      : "";
    return `<div class="wblock" data-w="${d}"${d === DEFAULT_WINDOW ? "" : " hidden"}>
${tiles(w, id)}
${excl}${orphan}
<h3>Questions</h3>
${w.funnels.length ? w.funnels.map((f) => `<h4>${esc(f.title)}</h4>${funnel(f, id)}`).join("\n") : '<p class="empty">No funnels configured.</p>'}
${truthPanel(w)}
<h3>Print &amp; QR campaigns</h3>
${campaignPanel(w, id)}
<h3>What we asked of people</h3>
${asksPanel(w, id)}
<h3>What guests did past the open</h3>
${guestPanel(w, id)}
<h3>What people did</h3>
${eventTable(w, id)}
${routeTable(w, id)}
</div>`;
  }).join("\n");

  return `<section data-app-scope="${esc(id)}">
<h2>${esc(a.name)}</h2>
${plats ? `<p class="note">Platforms over ${winLabel(DEFAULT_WINDOW)}: ${plats}.</p>` : ""}
${blocks}

<h3>Instrumentation coverage</h3>
${coveragePanel(a)}

<h3>Sessions &amp; journeys</h3>
${journeyPanel(id)}
</section>`;
}

function gapsSection() {
  const cards = gapList
    .map(
      ([id, g]) => `<div class="gap ${esc(g.severity)}${g.status === "fixed" ? " done" : ""}" id="gap-${esc(id)}">
  <div class="ghead"><span class="sev">${esc(g.severity)}</span> <span class="status st-${esc(g.status ?? "open")}">${esc(g.status ?? "open")}</span> <strong>${esc(g.title)}</strong> <code>${esc(id)}</code></div>
  <p>${esc(g.detail)}</p>
  <p class="dir"><strong>Effect on the numbers:</strong> ${esc(g.direction)}</p>
  <p class="fix"><strong>Fix:</strong> ${esc(g.fix)}</p>
</div>`,
    )
    .join("\n");
  const counts = gapList.reduce((acc, [, g]) => ((acc[g.status ?? "open"] = (acc[g.status ?? "open"] ?? 0) + 1), acc), {});
  const tally = Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(" · ");
  return `<section>
<h2 id="gaps">Tracking gaps</h2>
<p class="note">What the product does but the stream does not record. Ordered by how much attention each still needs — ${esc(tally)}.
<strong>specced</strong> means written up in <code>../tcgscan/ANALYTICS-TRACKING-GAPS.md</code> and waiting on the app repos;
<strong>landed</strong> means the code is in but no event has been observed yet, so it is not proven;
<strong>deferred</strong> means a decision was made not to do it, with the reason stated.
A landed gap becomes <strong>fixed</strong> when its event actually appears — the coverage panel above detects that, so it is not a judgement call. Every fix lands in the app repos, never here.</p>
${cards}
</section>`;
}

// ---------- page ----------

const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Event analytics — Michi-Maker &amp; TCGScan</title>
<style>
:root {
  color-scheme: light;
  --page: #f9f9f7; --surface: #fcfcfb;
  --ink: #0b0b0b; --ink-2: #52514e; --muted: #898781;
  --grid: #e1e0d9; --border: rgba(11,11,11,0.10);
  --bar: #2a78d6; --bar-dim: #cde2fb;
  --warn: #b45309; --ms: #1baf7a; --pricing: #eb6834;
}
@media (prefers-color-scheme: dark) {
  :root:where(:not([data-theme="light"])) {
    color-scheme: dark;
    --page: #0d0d0d; --surface: #1a1a19;
    --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
    --grid: #2c2c2a; --border: rgba(255,255,255,0.10);
    --bar: #3987e5; --bar-dim: #184f95;
    --warn: #eda100; --ms: #199e70; --pricing: #d95926;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #0d0d0d; --surface: #1a1a19;
  --ink: #ffffff; --ink-2: #c3c2b7; --muted: #898781;
  --grid: #2c2c2a; --border: rgba(255,255,255,0.10);
  --bar: #3987e5; --bar-dim: #184f95;
  --warn: #eda100; --ms: #199e70; --pricing: #d95926;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink);
  font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 28px 20px 60px; }
h1 { font-size: 22px; margin: 0 0 2px; }
h2 { font-size: 18px; margin: 40px 0 6px; border-top: 1px solid var(--border); padding-top: 20px; }
h3 { font-size: 15px; margin: 26px 0 6px; }
h4 { font-size: 13px; margin: 18px 0 4px; color: var(--ink-2); font-weight: 600; }
.meta { color: var(--muted); font-size: 13px; margin-bottom: 18px; }


.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 10px; }
.tile { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; }
.tile .k { font-size: 12px; color: var(--ink-2); }
.tile .value { font-size: 26px; font-weight: 650; font-variant-numeric: tabular-nums; }
.tile .value.nodata { color: var(--muted); }
.tile .sub { color: var(--muted); font-size: 12px; }
.note { color: var(--muted); font-size: 12.5px; margin: 8px 0; }
.empty { color: var(--muted); font-size: 13px; font-style: italic; margin: 10px 0; }
.warn { color: var(--warn); }
.seen { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
code, .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; color: var(--muted); }


.funnel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin: 8px 0 4px; }
.funnel .q { color: var(--ink-2); font-size: 13px; margin-bottom: 8px; }
.funnel .scope { color: var(--muted); font-size: 12px; line-height: 1.5; margin: 0 0 8px;
  padding-left: 8px; border-left: 2px solid var(--border); }
.funnel .scope strong { color: var(--ink-2); }
.ftab { width: 100%; border-collapse: collapse; font-size: 13px; }
.ftab td { padding: 3px 0; vertical-align: middle; }
.ftab .fl { width: 34%; padding-right: 10px; }
.ftab .fb { width: 40%; }
.ftab .bar { display: block; height: 14px; background: var(--bar); border-radius: 3px; min-width: 0; }
.ftab .fn { width: 8%; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; padding-left: 10px; }
.ftab .fp { width: 10%; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); }
.ftab .fd { width: 8%; text-align: right; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 12px; }
/* Guest depth ladder. One scale across all four rungs and across every window,
   so a bar shrinking always means fewer people and never a rescale. */
.tbl.depth td.bar { width: 34%; padding-right: 12px; }
.tbl.depth td.bar span { display: block; height: 13px; background: var(--bar); border-radius: 3px; }
.tbl.depth tr.made td.bar span { background: var(--ms); }
.tbl.depth tr.made td:first-child { font-weight: 600; }
.cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0 22px; align-items: start; }
a.caveat { display: inline-block; width: 15px; height: 15px; line-height: 15px; text-align: center;
  background: var(--warn); color: var(--page); border-radius: 50%; font-size: 11px; font-weight: 700;
  text-decoration: none; vertical-align: 1px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.tbl th, .tbl td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border); }
.tbl th { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); font-weight: 600; }
.tbl tr:last-child td { border-bottom: 0; }
.tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
.muted { color: var(--muted); }

.pill { display: inline-block; font-size: 10.5px; padding: 1px 6px; border-radius: 20px;
  border: 1px solid var(--border); color: var(--muted); vertical-align: 1px; }
.pill.guest { border-color: var(--muted); }
.pill.acct { color: var(--bar); border-color: var(--bar); }
.pill.pricing { color: var(--pricing); border-color: var(--pricing); }

.sess { background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  padding: 8px 12px; margin-bottom: 6px; }
.sess summary { cursor: pointer; font-size: 13px; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.sess summary .who { font-weight: 600; }
.sess summary .when, .sess summary .dur, .sess summary .cnt { color: var(--muted); font-size: 12px; }
.sess summary .cnt { margin-left: auto; }
.tl { list-style: none; margin: 8px 0 4px; padding: 0 0 0 4px; border-left: 2px solid var(--grid); }
.tl .ev { font-size: 12.5px; padding: 2px 0 2px 12px; position: relative; }
.tl .ev::before { content: ""; position: absolute; left: -5px; top: 9px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--grid); }
.tl .ev.ms::before { background: var(--ms); }
.tl .ev.pr::before { background: var(--pricing); }
.tl .ev.ms .lbl { font-weight: 600; }
.tl .t { color: var(--muted); font-variant-numeric: tabular-nums; margin-right: 6px; }
.tl .props { color: var(--muted); font-size: 11.5px; }

.gap { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--muted);
  border-radius: 8px; padding: 10px 14px; margin: 10px 0; font-size: 13px; }
.gap.blocking { border-left-color: #d03b3b; }
.gap.high { border-left-color: var(--warn); }
.gap.medium { border-left-color: var(--bar); }
.gap.done { opacity: 0.65; }
.gap .ghead { margin-bottom: 4px; }
.gap .sev { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
.gap .status { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid var(--border); border-radius: 20px; padding: 1px 6px; color: var(--muted); }
.gap .status.st-specced { color: var(--bar); border-color: var(--bar); }
.gap .status.st-landed { color: var(--warn); border-color: var(--warn); }
.gap .status.st-fixed { color: var(--ms); border-color: var(--ms); }
.gap p { margin: 5px 0; color: var(--ink-2); }
.gap .fix { color: var(--ink); }

</style>
<main>
<h1>Event analytics — Michi-Maker &amp; TCGScan</h1>
<p class="meta">Collected ${esc(store.collectedAt ?? "—")} · source <code>public.analytics_sessions</code> + <code>public.analytics_events</code> on <code>${esc(CFG.projectRef)}</code>.
Our own, QA and automated accounts are excluded throughout; the excluded volume is stated per app so nothing is dropped silently.
Hover any count to see who is behind it. <a href="#gaps">Known tracking gaps &rarr;</a></p>

${windowBar(WINDOWS, DEFAULT_WINDOW, "scopes events and sessions by timestamp")}

${apps.map(([id, a]) => appSection(id, a)).join("\n")}
${gapsSection()}
</main>
${hoverLayer(flatRosters, { unit: "person/people" })}
${windowScript(WINDOWS, DEFAULT_WINDOW)}`;

// ---------- markdown ----------

const mdWin = DEFAULT_WINDOW;
const md = [
  `# Event analytics — last ${mdWin} days`,
  ``,
  `Collected ${store.collectedAt ?? "—"}. Own/QA/automated accounts excluded.`,
  `The HTML report carries a ${WINDOWS.map(winLabel).join(" / ")} toggle and hover rosters; this file is the ${winLabel(mdWin)} view.`,
  ``,
  ...apps.flatMap(([, a]) => {
    const w = a.windows[mdWin];
    const t = w.totals;
    const lines = [
      `## ${a.name}`,
      ``,
      `${t.sessions} sessions · ${t.events} events · ${t.realUsers} account${t.realUsers === 1 ? "" : "s"} + ${t.guestUsers} guest${t.guestUsers === 1 ? "" : "s"} · median session ${secs(t.medianSessionSecs)}`,
      `Excluded: ${t.excludedSessions} sessions, ${t.excludedEvents} events (our own, QA and automated accounts).`,
      ``,
      `| Window | Sessions | Events | People |`,
      `| --- | ---: | ---: | ---: |`,
      ...WINDOWS.map((d) => {
        const x = a.windows[d].totals;
        return `| ${winLabel(d)} | ${x.sessions} | ${x.events} | ${x.users} |`;
      }),
      ``,
    ];
    for (const f of w.funnels) {
      lines.push(`### ${f.title}`, ``, `_${f.question}_`, ``);
      if (f.scope) {
        lines.push(
          `> **${f.scope.setAside}** of ${f.scope.of} people in this window are guests and are not counted here.${f.scope.note ? ` ${f.scope.note}` : ""}`,
          ``,
        );
      }
      for (const s of f.stages) {
        // Same rule as the HTML: a fixed gap no longer caveats its number.
        const caveat = s.caveat && GAPS[s.caveat]?.status !== "fixed" ? ` — see gap \`${s.caveat}\`` : "";
        lines.push(`- **${s.users}** ${s.label}${s.ofTop != null ? ` (${s.ofTop}% of top)` : ""}${caveat}`);
      }
      lines.push(``);
    }
    if (w.campaigns?.length) {
      lines.push(`### Print & QR campaigns`, ``, `| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |`, `| --- | ---: | ---: | ---: | ---: |`);
      for (const r of w.campaigns) {
        lines.push(`| \`${r.code}\`${r.source ? ` (${[r.source, r.medium].filter(Boolean).join(" · ")})` : ""} | ${r.people} | ${r.sessions} | ${r.converted} | ${r.signups} |`);
      }
      lines.push(``);
    }
    const asks = w.asks;
    if (asks && (asks.gates.length || asks.prompts.length || asks.offer?.shown)) {
      lines.push(`### What we asked of people`, ``);
      const mdBreak = (map, order) => {
        const e = Object.entries(map ?? {});
        if (!e.length) return "—";
        const known = order.filter((k) => map[k]);
        const extra = e.map(([k]) => k).filter((k) => k !== "—" && !order.includes(k));
        const parts = [...known, ...extra].map((k) => `${k} ${map[k].count}`);
        if (map["—"]) parts.push(`_not recorded ${map["—"].count}_`);
        return parts.join(", ");
      };
      if (asks.gates.length) {
        lines.push(`| Wall | Where | Shown | People | Guests | How | Offer | Backed out |`, `| --- | --- | ---: | ---: | ---: | --- | --- | --- |`);
        for (const gt of asks.gates) {
          const guests = !gt.guestKnown ? "_not recorded_" : String(gt.guests);
          lines.push(
            `| \`${gt.limit}\` | ${gt.surface} | ${gt.shown} | ${gt.people} | ${guests} | ${mdBreak(gt.as, AS_ORDER)} | ${mdBreak(gt.offer, OFFER_ORDER)}<br>_trial rendered on ${gt.offerHere} of ${gt.shown}_ | ${gt.dismissed ? mdBreak(gt.via, VIA_ORDER) : "_none recorded_"} |`,
          );
        }
        lines.push(
          ``,
          `A row is one wall — the \`limit_key\` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a \`pro.offer_shown\` in the same session on the same \`surface\`, within a minute). Where they disagree, the second is the truth.`,
          ``,
        );
      }
      const off = asks.offer ?? {};
      if (off.shown) {
        lines.push(
          `The PRO offer: shown **${off.shown}** time${off.shown === 1 ? "" : "s"} to **${off.shownPeople}** ${off.shownPeople === 1 ? "person" : "people"}, walked away from **${off.declined}**, pressed **${off.clicked}**. A decline is recorded only where walking away is an act, never for leaving a page.`,
          ``,
        );
        const mdRoutes = (m) =>
          Object.entries(m ?? {})
            .sort((a, b) => b[1].count - a[1].count)
            .map(([r, v]) => (r === "—" ? `_unplaced ${v.count}_` : `\`${r}\` ${v.count}`))
            .join(", ") || "—";
        if ((off.bySurface ?? []).length) {
          lines.push(`| Surface | On which page | Shown | People | Declined | Pressed |`, `| --- | --- | ---: | ---: | ---: | ---: |`);
          for (const s of off.bySurface) {
            lines.push(`| \`${s.surface}\` | ${mdRoutes(s.routes)} | ${s.shown} | ${s.people} | ${s.declined} | ${s.clicked} |`);
          }
          lines.push(
            ``,
            `**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest \`page.view\` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.`,
            ``,
          );
        }
      }
      if (asks.prompts.length) {
        lines.push(`| Prompt | Shown | People | What came back |`, `| --- | ---: | ---: | --- |`);
        for (const pr of asks.prompts) {
          const [label] = PROMPT_LABELS[pr.prompt] ?? [pr.prompt];
          const unpaired = pr.unpaired ? ` _(+${pr.unpaired} left with it open — tab shut before an answer)_` : "";
          lines.push(`| ${label} (\`${pr.prompt}\`) | ${pr.shown} | ${pr.people} | ${mdBreak(pr.response, RESPONSE_ORDER)}${unpaired} |`);
        }
        lines.push(
          ``,
          `**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.`,
          ``,
        );
      }
    }
    const g = w.guests;
    if (g?.people) {
      lines.push(`### What guests did past the open`, ``, `${g.people} people opened as a guest across ${g.sessions} session${g.sessions === 1 ? "" : "s"}.`, ``);
      lines.push(`| How far they got | People | of ${g.people} |`, `| --- | ---: | ---: |`);
      for (const [k, label] of DEPTH_RUNGS.map(([k, label]) => [k, label])) {
        const v = g.depth[k] ?? 0;
        lines.push(`| ${label} | ${v} | ${g.people ? Math.round((v / g.people) * 1000) / 10 : 0}% |`);
      }
      lines.push(``);
      if (g.depth.made) {
        lines.push(`Of the ${g.depth.made} who built something, **${g.convertedOfMade}** created an account.`, ``);
      }
      if (g.pricing?.asked) {
        lines.push(
          `**${g.pricing.asked}** guests walked to a pricing page; **${g.pricing.offered}** saw the PRO offer.` +
            (g.pricing.offered < g.pricing.asked
              ? ` \`TrialCta\` renders only when \`isSignedIn && !is_anonymous\`, so a guest there sees no offer by design.`
              : ``),
          ``,
        );
      }
      const acts = g.actions.filter((a) => a.name !== "session.start");
      if (acts.length) {
        lines.push(`| Guest action | People | Times |`, `| --- | ---: | ---: |`);
        for (const a of acts) lines.push(`| ${a.label} (\`${a.name}\`) | ${a.people} | ${a.fires} |`);
        lines.push(``);
      }
      if (g.routes.length) {
        lines.push(`| Route guests reached | People | Views |`, `| --- | ---: | ---: |`);
        for (const r of g.routes.slice(0, 12)) {
          lines.push(`| \`${r.route}\`${PRICING.has(r.route) ? " _(pricing)_" : ""} | ${r.people} | ${r.fires} |`);
        }
        lines.push(``);
      }
    }
    if (w.eventsByName.length) {
      lines.push(`| Event | Fired | People |`, `| --- | ---: | ---: |`);
      for (const e of w.eventsByName) lines.push(`| ${e.label} (\`${e.name}\`) | ${e.count} | ${e.users} |`);
      lines.push(``);
    }
    lines.push(`Instrumentation: ${a.coverage.fired}/${a.coverage.declared} events verified firing (all traffic, all time).`, ``);
    if (a.coverage.neverFired.length) {
      lines.push(`Never fired by anyone (unverified): ${a.coverage.neverFired.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    if (a.coverage.neverFiredReal?.length) {
      lines.push(`Works, but not yet from a real user: ${a.coverage.neverFiredReal.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    const pendingMd = (a.coverage.planned ?? []).filter((x) => !(a.coverage.plannedLanded ?? []).includes(x));
    if (pendingMd.length) {
      lines.push(`Registered, not yet fired: ${pendingMd.map((x) => `\`${x}\``).join(", ")}`, ``);
    }
    if (a.coverage.plannedLanded?.length) {
      lines.push(`**Landed since the spec:** ${a.coverage.plannedLanded.map((x) => `\`${x}\``).join(", ")} — mark the matching gap \`fixed\`.`, ``);
    }
    return lines;
  }),
  `## Tracking gaps`,
  ``,
  ...gapList.flatMap(([id, g]) => [
    `### ${g.title} \`${id}\` (${g.severity}, ${g.status ?? "open"})`,
    ``,
    g.detail,
    ``,
    `**Effect:** ${g.direction}`,
    ``,
    `**Fix:** ${g.fix}`,
    ``,
  ]),
].join("\n");

const HTML_OUT = join(ROOT, "reports", "events.html");
const MD_OUT = join(ROOT, "reports", "events.md");
mkdirSync(dirname(HTML_OUT), { recursive: true });
writeFileSync(HTML_OUT, html);
writeFileSync(MD_OUT, md);
console.log(`Wrote reports/events.html and reports/events.md (${apps.length} apps, windows ${WINDOWS.map(winLabel).join("/")})`);
