# Analytics Studio

Two daily lanes over the app fleet:

1. **Metrics** — **DAU** and **new Supabase users** for **Doggle, Pickleague,
   Michi-Maker, and TCGScan**, with a rolling 30-day history (daily + cumulative).
2. **Events** — the in-app event/session stream for **Michi-Maker and TCGScan**,
   turned into per-session **user journeys**, aggregate **funnels**, and a
   standing **tracking-gap** report. See [Events lane](#events-lane).

## Layout

```
config/apps.json         app registry: project refs, DAU/new-user sources
config/exclusions.json   who never counts (ours, QA, automated)
config/events.json       event taxonomy, funnels, ground truth, known gaps
config/sql/*.sql         custom per-app SQL (TCGScan + Michi-Maker share one project)
scripts/lib/studio.mjs   shared: .env, Management API SQL, THE exclusion CTE
scripts/collect.mjs      fetches metrics, merges into data/metrics.json
scripts/report.mjs       renders reports/report.html + reports/latest.md
scripts/events.mjs       ingests analytics_sessions/_events -> events.json + journeys.json
scripts/events-report.mjs renders reports/events.html + reports/events.md
data/metrics.json        rolling per-day store (history accumulates across runs)
data/events.json         event aggregates + history (counts only, committed)
data/journeys.json       per-session timelines keyed by email (gitignored)
run-daily.ps1            both lanes + log to logs/
setup-schedule.ps1       registers the "AnalyticsStudio Daily" Windows task (08:07)
.env                     credentials (gitignored)
```

## Credentials (`.env`)

Two modes, checked in order:

1. **`SUPABASE_ACCESS_TOKEN`** (preferred) — a personal access token
   (`supabase login`, or dashboard → Account → Access Tokens). The collector
   runs SQL through the Management API on every project with this one
   credential. Required for TCGScan/Michi-Maker per-app signup attribution
   (first-touch heuristic) since they share one auth project.
2. **Per-project service keys** (fallback, REST mode) — `DOGGLE_SERVICE_KEY`
   and `PICKLEAGUE_SERVICE_KEY` are already populated (found in sibling
   repos). `TCG_APP_SERVICE_KEY` (project `piikwvntldytjejxmcla`) must be
   copied from the dashboard if not using an access token. In REST mode,
   TCGScan/Michi signups can't be attributed per app (reported combined under
   TCGScan; Michi-Maker shows DAU only).

## Run

```powershell
npm run daily         # both lanes: metrics + events
npm run collect       # just fetch/merge metrics
npm run report        # just rebuild reports from stored data
npm run events        # just ingest the event stream
npm run events:report # just rebuild the events report
.\setup-schedule.ps1  # register the daily 08:07 scheduled task (run once)
```

`run-daily.ps1` also commits and pushes `data/metrics.json`, `data/events.json`
and `reports/events.md` after each run, so the history stays current
unattended. Only those counts-only files are staged — the HTML reports,
`accounts.json`, `journeys.json` and logs are gitignored because they embed
emails.
Before committing it scans the staged diff for email addresses, Supabase
PATs, secret keys, JWTs and IPv4 literals, and **fails closed**: any match
unstages, logs what matched, and commits nothing. That is a backstop, not
the primary defence — `.gitignore` is. Set `$AutoCommit` or `$AutoPush` to
`$false` at the top of the script to disable either half.

Open `reports/report.html` for charts (light/dark aware, hover for per-day
values, data table at the bottom); `reports/latest.md` is a text summary.

Report sections: stat tiles per app, **total distinct users split into active
vs churned** at 7/14/30 days (active = signed in within the window, churned is
its exact complement, from `auth.users.last_sign_in_at`), daily active users,
and cumulative new users as small multiples.

## What "DAU" means per app

- **Doggle** — daily login-bonus claims in `points_ledger` (one row per user
  per day the app is opened). Exact DAU for app opens.
- **Pickleague** — daily login-streak claims in `user_streak_rewards` (same
  pattern). Exact DAU for app opens.
- **TCGScan** — write activity: `scan_events`, `saved_cards`, `collections`,
  `portfolio_entries`, `user_cards (source='scan')`. Read-only sessions leave
  no trace, so this undercounts browsers-only users.
- **Michi-Maker** — write activity: binder edits (incl. pages/slots), slices,
  likes, upvotes, prints, reshares, contest entries. Same read-only caveat.

## Exclusions

`config/exclusions.json` removes accounts that aren't real users: our own and
staff accounts, seeded/placeholder rows, QA and test accounts, and automated
clients. Automation is detected from `auth.sessions.user_agent` (Playwright,
HeadlessChrome, Puppeteer, Selenium, curl, node, python-requests, …); the rest
are email patterns, per-app where the domains differ.

The rules generate an `excluded_users` CTE that every metrics query filters
against. **Exclusions are never silent** — each app tile reports how many
accounts were removed. Add new fabricated cohorts to that config rather than
hardcoding filters into queries.

**IP exclusions live in `.env` as `EXCLUDED_IPS`** (comma-separated), not in
committed config — an address identifies a physical location. They apply to
**anonymous guests only**: a dev box shares its address with everyone else on
that network, and a genuine external user has signed in from ours. Real
accounts are excluded by email, never by IP. After changing any exclusion,
check that real-user counts did not move.

Known fabricated cohorts as of 2026-08-04: `@doggle.invalid` (26 Doggle seed
rows), `@unclaimed.pickleague.club` (473 roster placeholders — the 07-29
"import"), `@pickleague.test` (18), `@example.com` test accounts, and 454
HeadlessChrome guests on the shared TCGScan/Michi project.

## Signed-in accounts vs guest sessions

TCGScan and Michi-Maker call `signInAnonymously` on first visit, so their
shared project's `auth.users` is dominated by anonymous rows — 779 of 789 as
of 2026-08-04, against 10 real accounts. Every DAU and new-user query joins
`auth.users` and splits on **`is_anonymous`**: headline figures count
signed-in accounts, and guest sessions are reported alongside as a separate,
clearly-labelled number (they track device-visits more than people).

Do not test for guests with `raw_app_meta_data->>'provider' = 'anonymous'` —
anonymous users carry no `provider` key at all, so that test silently returns
zero and makes a guest-dominated project look entirely real. `is_anonymous`
is the authoritative flag.

Signups on the shared project are attributed to an app by which app's tables
a user touched first; users who never touch either app's tables are not
attributed.

The collector is idempotent: each run recomputes the trailing 30-day window
and merges it into `data/metrics.json`, so gaps self-heal and history older
than the window is preserved.

## Events lane

Michi-Maker and TCGScan write a first-party event stream into two tables on
their shared project (`piikwvntldytjejxmcla`), instrumented by the sister repo
(`tcgscan/`, migration `20260805100000_analytics_events.sql`):

- **`analytics_sessions`** — one row per app-open: who, which app, guest or
  not, platform, `started_at`/`last_seen_at`.
- **`analytics_events`** — append-only, one row per occurrence: `name` plus a
  `props` jsonb. Immutable from the client; no UPDATE/DELETE policy exists.

`scripts/events.mjs` reads both through the Management API, applies the same
exclusion policy as the metrics lane, and writes two files split by whether
they can be committed: `data/events.json` (aggregates, no emails, no user ids)
and `data/journeys.json` (per-session timelines keyed by account email,
gitignored). `reports/events.html` renders both.

### Asking a new question

Everything the report answers lives in `config/events.json`, not in code:

- **`taxonomy`** — every event name, its label, its stage on the
  acquisition → activation → engagement → monetization spine, and which apps
  emit it. A name seen in the data but missing here is reported as
  *unrecognised* rather than silently dropped, so new upstream instrumentation
  surfaces as a prompt to update this file.
- **`funnels`** — ordered stages. A user counts at stage N only if they cleared
  every earlier stage, so the difference between two rows is a real drop-off
  rather than two unrelated populations printed next to each other. A stage
  matches on an event (`names`), a page route (`routes`), a **ground-truth
  table** (`truth`), or guest status.
- **`truth`** — product tables (`pro_trials`, `tcgscan_pro_trials`,
  `entitlements`) read over *all* history, not just the window. Instrumentation
  shipped 2026-08-05; a trial started before that is still a trial, and the
  event stream has no way to know. The report shows both numbers and flags the
  difference rather than picking one.
- **`gaps`** — see below.

Add a funnel to that file and re-run `npm run events:report`; no code changes.

### Coverage is measured on ALL traffic, on purpose

Whether a `track()` call site can fire is a property of the code, not of who
used the app. Measuring coverage on the excluded stream would report an event
we have verified by hand in QA as "never fired", which reads as broken
instrumentation. So the report separates:

- **never fired by anyone** — unverified; the call site may be unreachable.
- **works, but not yet from a real user** — instrumentation is fine, the
  behaviour just has not happened outside our own accounts.

Every behavioural number stays exclusion-filtered as normal.

### Tracking gaps

`config/events.json` → `gaps` is a standing list of what the product does but
the stream does not record. Each entry states its **effect on the numbers**
("understates awareness"), a concrete **fix**, and a **status**:

| status | meaning |
| --- | --- |
| `open` | found, not yet written up |
| `specced` | written up in [`../tcgscan/ANALYTICS-TRACKING-GAPS.md`](../tcgscan/ANALYTICS-TRACKING-GAPS.md), waiting on the app repos |
| `deferred` | a decision was made not to do it, with the reason recorded |
| `fixed` | shipped and verified firing |

Any funnel stage a gap distorts carries an inline marker linking to it — a gap
is never an appendix you can read the chart without. **Fixes land in the app
repos, never here**; this repo only reads.

The blocking one today: **there is no impression event for the PRO trial
offer.** `TrialCta` emits `trial.start` only when pressed, and renders `null`
for anyone ineligible, so "how many users are *aware* of the trial" is not
measurable. The awareness stage of the PRO funnel reads zero — that zero is the
gap, not a finding, and pricing-page views in the Pages table are the interim
proxy.

Deferred: **acquisition attribution**. Referrer/UTM capture would contradict
michi's privacy disclosure as written, so it needs the copy changed first.

### Planned events

Names in the taxonomy marked `planned: true` are registered before they exist,
so they are recognised the moment they land instead of arriving as
*unrecognised*. They are deliberately kept **out** of the "never fired" list —
an event nobody has written cannot have a broken call site, and mixing the two
hides the real ones. When a planned name starts appearing, the coverage panel
says so and prompts you to mark its gap `fixed`.

### Handing work to the app repos

`../tcgscan/` is a workspace of independent repos, not a monorepo, and this one
is outside it. The studio's job ends at a written work order:
`../tcgscan/ANALYTICS-TRACKING-GAPS.md` carries the evidence (file:line), the
effect on each number, the required change, acceptance criteria, and the
event-name contract that must match this repo's taxonomy exactly.
