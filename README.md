# Analytics Studio

Daily execution lane that gathers **DAU** and **new Supabase users** for
**Doggle, Pickleague, Michi-Maker, and TCGScan**, keeps a rolling history, and
renders a 30-day report (daily + cumulative).

## Layout

```
config/apps.json         app registry: project refs, DAU/new-user sources
config/sql/*.sql         custom per-app SQL (TCGScan + Michi-Maker share one project)
scripts/collect.mjs      fetches metrics, merges into data/metrics.json
scripts/report.mjs       renders reports/report.html + reports/latest.md
data/metrics.json        rolling per-day store (history accumulates across runs)
run-daily.ps1            collect + report + log to logs/
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
npm run daily        # collect + report
npm run collect      # just fetch/merge metrics
npm run report       # just rebuild reports from stored data
.\setup-schedule.ps1 # register the daily 08:07 scheduled task (run once)
```

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
