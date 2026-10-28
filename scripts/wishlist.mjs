// Wishlist lane: WHO voted for WHAT on michi-maker.com/wishlist, and what they wrote in the box.
//
//   The page has two stores (michi-maker src/app/wishlist.tsx): a click is a row in
//   feature_votes (toggle - a second click deletes it), the words go through
//   feedback_responses as survey `wishlist`. The page itself only ever shows the tally
//   through feature_vote_counts(), counts and no names, so this lane is the only place the
//   owner can see who is behind a vote.
//
//   Ideas live in the app, not the database (src/data/featureIdeas.ts). A vote for an idea
//   that has since left the ballot is kept and marked `onBallot: false` - the page cannot
//   show it, which is exactly why the tally on the site and the tally here can differ, and
//   the digest says so instead of letting the two numbers disagree silently.
//
//   Exclusions: exclusionCte("michi-maker") marks our own/QA votes; they are counted and
//   stated, never dropped. Guests (anonymous auth) can vote and are named by id stub.
//
// Writes data/wishlist.json (counts per idea, committed) and data/wishlist-roster.json
// (one row per voter with what they voted for, plus the written ideas - prose and email are
// identity, so gitignored). The digest is the consumer.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { ROOT, loadEnv, runSql, exclusionCte, readConfig } from "./lib/studio.mjs";

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("FAILED: no SUPABASE_ACCESS_TOKEN in .env - this lane needs Management API access.");
  process.exit(1);
}

const APP = "michi-maker";
const APP_KEY = "michi"; // the `app` column value in feature_votes / feedback_responses / analytics_events
const PROJECT = readConfig("events.json").projectRef;
const DATA_FILE = join(ROOT, "data", "wishlist.json");
const ROSTER_FILE = join(ROOT, "data", "wishlist-roster.json");
// The ballot, read from the app repo when it is checked out beside this one. Not a
// dependency: without it the ids print as ids and every idea counts as on the ballot.
const IDEAS_FILE = join(ROOT, "..", "tcgscan", "michi-maker", "src", "data", "featureIdeas.ts");

const WINDOWS = ["1", "7", "30"];
const NOW = Date.now();
const inWindow = (ts, days) => NOW - Date.parse(ts) <= days * 86400_000;

function readBallot() {
  if (!existsSync(IDEAS_FILE)) return null;
  const src = readFileSync(IDEAS_FILE, "utf8");
  const out = [];
  for (const m of src.matchAll(/\{\s*id:\s*'([a-z0-9-]+)',\s*label:\s*'((?:[^'\\]|\\.)*)'/g)) out.push({ id: m[1], label: m[2].replace(/\\'/g, "'") });
  return out.length ? out : null;
}

const votesSql = `
with ${exclusionCte(APP)}
select v.feature, v.created_at, v.user_id,
       coalesce(p.username, '') as username, u.email, coalesce(u.is_anonymous, false) as anon,
       (v.user_id in (select id from excluded_users)) as excluded
from public.feature_votes v
left join auth.users u on u.id = v.user_id
left join public.profiles p on p.id = v.user_id
where v.app = '${APP_KEY}'
order by v.created_at`;

const ideasSql = `
with ${exclusionCte(APP)}
select f.created_at, f.user_id, f.was_guest, f.answers, f.context, f.contact_email, f.contact_ok,
       coalesce(p.username, '') as username, u.email,
       (f.user_id in (select id from excluded_users)) as excluded
from public.feedback_responses f
left join auth.users u on u.id = f.user_id
left join public.profiles p on p.id = f.user_id
where f.app = '${APP_KEY}' and f.survey_id = 'wishlist'
order by f.created_at`;

const eventsSql = `
with ${exclusionCte(APP)}
select e.name, e.ts, e.user_id, e.props, (e.user_id in (select id from excluded_users)) as excluded
from public.analytics_events e
where e.app = '${APP_KEY}' and e.name like 'wishlist.%' and e.ts > now() - interval '30 days'
order by e.ts`;

const t0 = Date.now();
const [votes, ideas, events] = await Promise.all([runSql(PROJECT, votesSql), runSql(PROJECT, ideasSql), runSql(PROJECT, eventsSql)]);
const ballot = readBallot();
const onBallot = new Set((ballot ?? []).map((b) => b.id));
const labelOf = (id) => ballot?.find((b) => b.id === id)?.label ?? id;

// Who a voter is, the way the digest names people: username, else email, else a numbered guest.
const who = (r) => (r.username ? `@${r.username}` : r.anon || r.was_guest ? `guest ${String(r.user_id).slice(0, 8)}` : r.email || `account ${String(r.user_id).slice(0, 8)}`);

// ---- per idea ----
const byFeature = new Map();
for (const v of votes) {
  const f = byFeature.get(v.feature) ?? { id: v.feature, label: labelOf(v.feature), onBallot: !ballot || onBallot.has(v.feature), votes: 0, real: 0, ours: 0, guests: 0, last: null, windows: {} };
  f.votes++;
  if (v.excluded) f.ours++;
  else if (v.anon) f.guests++;
  else f.real++;
  if (!f.last || v.created_at > f.last) f.last = v.created_at;
  for (const w of WINDOWS) if (inWindow(v.created_at, +w) && !v.excluded) f.windows[w] = (f.windows[w] ?? 0) + 1;
  byFeature.set(v.feature, f);
}
// Every idea on the ballot appears, zeros included: "nobody wants this" is a finding.
for (const b of ballot ?? []) if (!byFeature.has(b.id)) byFeature.set(b.id, { id: b.id, label: b.label, onBallot: true, votes: 0, real: 0, ours: 0, guests: 0, last: null, windows: {} });
const features = [...byFeature.values()].sort((a, b) => b.votes - a.votes || a.label.localeCompare(b.label));

// ---- per voter ----
const byVoter = new Map();
for (const v of votes) {
  const r = byVoter.get(v.user_id) ?? { stub: String(v.user_id).slice(0, 8), who: who(v), excluded: v.excluded, guest: !!v.anon, features: [], first: v.created_at, last: v.created_at };
  r.features.push({ id: v.feature, label: labelOf(v.feature), onBallot: !ballot || onBallot.has(v.feature), at: v.created_at });
  if (v.created_at > r.last) r.last = v.created_at;
  byVoter.set(v.user_id, r);
}
const voters = [...byVoter.values()].sort((a, b) => (a.last < b.last ? 1 : -1));

// ---- the words ----
const written = ideas.map((r) => ({
  at: r.created_at,
  stub: String(r.user_id ?? "").slice(0, 8),
  who: who(r),
  excluded: r.excluded,
  guest: !!r.was_guest,
  text: typeof r.answers?.idea === "string" ? r.answers.idea : null,
  contactEmail: r.contact_ok ? r.contact_email ?? r.answers?.email ?? null : null,
  votesAtSend: Array.isArray(r.context?.votes) ? r.context.votes : null,
}));

// ---- the page itself ----
const evCount = (name, days, excluded = false) => events.filter((e) => e.name === name && e.excluded === excluded && inWindow(e.ts, days)).length;
const pageWindows = {};
for (const w of WINDOWS) {
  pageWindows[w] = {
    shown: evCount("wishlist.shown", +w),
    shownOurs: evCount("wishlist.shown", +w, true),
    voteClicks: evCount("wishlist.vote", +w),
    voteFailed: evCount("wishlist.vote_failed", +w),
    submitted: evCount("wishlist.submitted", +w),
    submitFailed: evCount("wishlist.submit_failed", +w),
    votesCast: votes.filter((v) => !v.excluded && inWindow(v.created_at, +w)).length,
    ideasWritten: written.filter((x) => !x.excluded && inWindow(x.at, +w)).length,
  };
}

const sum = (arr, f) => arr.reduce((n, x) => n + (f(x) ? 1 : 0), 0);
const out = {
  collectedAt: new Date(NOW).toISOString(),
  app: APP,
  windows: WINDOWS,
  ballotSource: ballot ? "michi-maker/src/data/featureIdeas.ts" : null,
  ballot: ballot ?? [],
  features,
  totals: {
    votes: votes.length,
    votesReal: sum(votes, (v) => !v.excluded && !v.anon),
    votesGuests: sum(votes, (v) => !v.excluded && v.anon),
    votesOurs: sum(votes, (v) => v.excluded),
    votesOffBallot: sum(votes, (v) => ballot && !onBallot.has(v.feature)),
    voters: voters.length,
    votersReal: sum(voters, (r) => !r.excluded && !r.guest),
    votersGuests: sum(voters, (r) => !r.excluded && r.guest),
    votersOurs: sum(voters, (r) => r.excluded),
    ideasWritten: written.length,
    ideasWrittenOurs: sum(written, (x) => x.excluded),
  },
  page: pageWindows,
};
mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2) + "\n");
writeFileSync(ROSTER_FILE, JSON.stringify({ collectedAt: out.collectedAt, voters, written }, null, 2) + "\n");

const t = out.totals;
console.log(`wishlist: ${t.votes} votes by ${t.voters} voters (${t.votersReal} real, ${t.votersGuests} guests, ${t.votersOurs} ours), ${t.votesOffBallot} vote(s) for ideas no longer on the ballot, ${t.ideasWritten} written ideas (${t.ideasWrittenOurs} ours); ballot ${ballot ? ballot.length + " ideas" : "not read"} (${Date.now() - t0} ms)`);
for (const f of features.filter((x) => x.votes)) console.log(`  ${f.label}${f.onBallot ? "" : " [off ballot]"}: ${f.votes} (${f.real} real, ${f.guests} guests, ${f.ours} ours)`);
console.log(`Wrote ${DATA_FILE} and ${ROSTER_FILE} (gitignored - names voters and carries the written ideas)`);
