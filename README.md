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
scripts/campaigns.mjs    printed QR codes -> data/campaigns.json + reports/campaigns.{html,md}
scripts/plans.mjs        entitlement tiers -> data/plans.json + reports/plans.html
scripts/shares.mjs       binder visitors -> data/shares.json + reports/shares.html
scripts/economy.mjs      points/pickles + tier-cap usage -> data/economy.json + reports/economy.html
config/reports.json      dashboard registry: what appears on the index and how it refreshes
scripts/serve.mjs        localhost dashboard: serves the reports, re-pulls on demand
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
npm run serve         # live dashboard at http://127.0.0.1:4726 (reload = fresh pull)
npm run daily         # both lanes: metrics + events
npm run collect       # just fetch/merge metrics
npm run report        # just rebuild reports from stored data
npm run events        # just ingest the event stream
npm run events:report # just rebuild the events report
npm run campaigns     # just rebuild the print/QR campaign lane
npm run digest        # build the daily email digest into state/ (no send)
npm run digest:send   # build and email it (needs RESEND_API_KEY/DIGEST_FROM/DIGEST_TO in .env)
.\setup-schedule.ps1  # register the daily 08:07 scheduled task (run once)
```

### Dashboard

`npm run serve` puts every report behind a small local server so a browser
reload shows current numbers instead of whatever the last cron run left on
disk. `/` is an index of all of them; each gets a route at `/<id>` and
`/api/status` returns the lot as JSON.

**Adding a report.** Anything in `reports/*.html` shows up on the index
automatically, marked *unregistered*, and is reachable immediately. Adding it
to `config/reports.json` is what gives it a title, a blurb, a position, and a
refresh button — not what makes it visible. A dashboard that hides work until
someone edits a config is a dashboard people stop trusting.

```json
{ "id": "plans", "title": "Plan tiers", "group": "Growth",
  "apps": ["michi-maker", "tcgscan"], "blurb": "…",
  "file": "reports/plans.html", "data": "data/plans.json",
  "scripts": ["scripts/plans.mjs"] }
```

`scripts` is what a refresh runs, in order, from the repo root. Omit it for a
hand-written report and it is served without a refresh button rather than
pretending it has one. `data` is the JSON whose `collectedAt` drives the age
indicator; omit it and the report file's mtime is used. The registry is read
per request, so a new report needs no restart.

### Sidebar: report groups and the app filter

Navigation is a left sidebar, on the index and on every report, so it never
changes shape as you move between them. `group` places a report in a section and
the top-level `groups` array orders those sections; a report whose group is not
in that list still renders, under its own heading at the end, because an
unrecognised group is a config typo and losing the report would be a much worse
answer to one.

Below the nav is an **app filter** — a checkbox per app in `config/apps.json`,
one choice shared by every report and remembered across them, because "show me
Doggle" is a question about the studio rather than about one page. It does two
things:

- **Dims** any report whose `apps` list covers none of the selection. Dimmed,
  never hidden: a report you cannot currently see through the filter is still one
  click away, and hiding it would look like it had been deleted. A report with no
  `apps` key counts as covering all of them, so the filter can never silently
  hide a lane it does not understand.
- **Filters inside the report**, by showing only the `[data-app-scope="<id>"]`
  blocks whose app is selected. That attribute is the whole contract between a
  report and the dashboard — a generator adds it to each per-app section and gets
  filtering for free, knowing nothing about the server.

  Tag **every** per-app element, not just the obvious panels. On the DAU lane
  that means the chart series and its end label (SVG `<g>`), the legend entry,
  the stat tile, the small multiple, the retention figure, *and* the three table
  columns per app — 424 elements in all. Anything missed keeps showing an app you
  deselected, which is the whole bug the filter exists to prevent. Two gotchas:
  the `hidden` attribute does not reliably hide **SVG** children, so the injected
  CSS forces `[data-app-scope][hidden] { display: none }`; and content the DOM
  cannot express — the DAU crosshair reads one roster and lists every app in it —
  reads `window.studioApps`, which the dashboard publishes on every change
  alongside a `studio:apps` event.

Two details worth keeping true. **Unchecking every app hides every app** — an
earlier version treated "none selected" as "show all", which quietly contradicted
the control: the page looked unfiltered while the boxes said otherwise. Emptiness
is honest; what it must not be is a dead end, so the empty state names the cause
and carries a one-click **Show all apps**. And a report with no
`[data-app-scope]` blocks says so under the checkboxes instead of pretending the
filter did something.

Cross-app **totals are not re-derived in the browser** — that would be a second
implementation of a number the lane already computed server-side, and the two
could disagree. While a filter is narrowed the sidebar says so instead.

Reports that ship their own app tab bar (Coverage, Economy) keep it in the file
so they still work opened straight off disk, but the dashboard hides it and
drives the same panels from the sidebar — one app control, not two fighting each
other. The injected filter runs on `DOMContentLoaded`, which is after a report's
own inline scripts, so it has the last word over any panel state they restored
from their own `localStorage` key.

**Opening a stale report does not wait for a rebuild.** It serves what is on
disk immediately and starts the refresh behind it; the age indicator says how old
the data is and adds *"refreshing in the background, reload when it finishes"*.
This used to `await` the rebuild, which meant opening a report cost whatever its
lane costs — the geo lane takes over a minute (100k places, point-in-polygon over
71k cells), so a stale open was a 15–125 second blank tab with nothing explaining
the wait. Freshness is not worth that. A report with **nothing** on disk is still
built synchronously, because there is no alternative to show.

A control strip is injected into the served page: how old the data is, a
**Pull fresh data** button, and an optional 5-minute auto-refresh (remembered
across reloads, or turning it on would switch itself off at the first refresh
it triggered). A reload also re-pulls on its own when the data is older than
10 minutes — `DASHBOARD_STALE_MS` to change that — so the first load of the
morning is current without anyone thinking to press anything.

Three things worth knowing about how it is built:

- **Bound to `127.0.0.1` and nothing else, deliberately.** The rendered reports
  carry account emails and usernames — the whole reason `events.html` and
  `report.html` are gitignored. Binding `0.0.0.0` would hand that to anything
  on the same wifi. If this ever needs to be remote it needs auth first, not a
  wider bind.
- **Refreshing runs the same scripts the daily lane runs.** There is one code
  path that produces a report, so the dashboard cannot drift from the scheduled
  output. One refresh at a time per lane; overlapping runs would race on the
  same output files.
- **The control strip is injected by the server, not baked into the
  generator**, so `reports/events.html` stays honest when opened straight off
  disk — no refresh button that cannot refresh.

Default port is 4726 rather than something conventional: 4317/4318 are
OpenTelemetry's and were already taken here, and a dashboard that silently
answers from someone else's service is a bad failure. `PORT=4727 npm run serve`
to move it.

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

## Timezone: days are Pacific days

Every "day" in this studio — a DAU bucket, a chart column, the digest's "yesterday" — is cut
on **midnight Pacific**, not midnight UTC (owner decision, 2026-08-16). One definition,
`REPORT_TZ` in `scripts/lib/studio.mjs`, used by `isoDate`/`dayOf` in JS and by
`dayExpr()`/`todayExpr()` (`{{DAY:col}}` / `{{TODAY}}` in `config/sql/*.sql`) in SQL.

It is `America/Los_Angeles`, not a fixed `-08:00`. "PST" as spoken means "my clock", and
half the year that clock is PDT; a fixed offset would move every boundary by an hour each
spring. Set `REPORT_TZ` in `.env` to override — `Etc/GMT+8` is a true year-round PST (note
the inverted sign in POSIX zone names).

Two things are deliberately **not** rezoned:

- **Rolling windows.** 24h/7d/14d/30d are durations, and a duration has no timezone.
- **Product-defined periods**, like the monthly scan-credit cycle. That resets on a boundary
  the app enforces; reporting it on a different one would misstate what a user may actually
  do.

**There is a seam in the history.** Each run re-cuts the trailing 30 days, so those become
Pacific; days that had already aged out keep their UTC boundary and cannot be recomputed —
their source rows are outside the window. `metrics.json` records `dayTz`, `dayTzSince` and
`dayTzPrevious`, and the digest footnotes the seam while any charted day still predates it.

## Daily digest email

`npm run digest` builds the morning email — new accounts since yesterday, plan/PRO/trial
interactions, yesterday's active accounts and what each of them did — and
`npm run digest:send` mails it. `run-daily.ps1` runs it last, non-fatally.

Three decisions worth knowing before changing it:

- **It reads the other lanes' output, it does not re-query.** DAU means something different
  per app (a login bonus on Doggle, a streak claim on Pickleague, a write on
  Michi/TCGScan) and that definition lives in `collect.mjs`. A second query here would be a
  second definition and the email would drift out of agreement with the dashboard. The cost
  is that it is only as fresh as the last run, so it computes staleness and says so at the
  top when the data is over 26 hours old.
- **It writes to `state/`, not `reports/`.** Anything in `reports/` is listed by the
  dashboard as a report, and a report in this studio owes four staples — an email cannot
  deliver a window toggle or a hover roster. It links back to the real reports instead.
  `state/` is gitignored: the digest names accounts, so it is PII by construction.
- **Charts are table cells, not SVG.** Gmail strips `<svg>` and Outlook renders through
  Word, so each bar is a one-cell table with `bgcolor` and a `height` attribute sitting on a
  shared baseline. The studio's chart rules still hold: one scale across all four app rows,
  per-bar values, ticks every other day anchored to the newest. Mixed-unit series (200 cards
  next to 1 check-in) stay a list rather than becoming a log axis.

Sending needs `RESEND_API_KEY`, `DIGEST_FROM` (a Resend-verified sender) and `DIGEST_TO` in
`.env` — an address is identity and never belongs in committed config.
`state/setup-digest-email.ps1` collects them without echoing anything.

## Campaigns lane (print & QR)

`npm run campaigns` answers the question marketing actually asks: **did a printed
piece produce members?** Not "how many scans" — the codes are static by design
(nothing sits between the scan and the site, so nothing outside our own stream
could count a scan anyway), so the lane starts at the arrival and follows the
person forward: **arrived → went further → became a member → came back**.

It reads two things the emitters write, and keeps them separate on purpose:

| | |
| --- | --- |
| `analytics_sessions.landing_route` | the allowlisted `?code=`/`utm_*` kept on the first page view — the arrival |
| `analytics_events.props.code` | merged into `account.created` — a signup **days later** still credits the scan |

Three things make it more than the small panel already in the events report:

1. **It joins the printed registry.** `../marketing-studio/assets/qr/campaigns.yaml`
   is the list of codes that physically exist on paper. A registered code with no
   arrival is "printed, not yet scanned"; a code in the data that is on no paper is
   the opposite finding. Both are named, because *a zero has two meanings*.
   Campaign identity is **(app, code)**, never code alone — `wom` and `cardshow`
   are each printed for more than one app.
2. **Capture readiness is its own table**, over ALL traffic and all time,
   exclusions included: whether `landing_route` is being written at all, and since
   when. Whether a scan *can* be seen is a property of the deployed code, not of
   who used the app, so this is what lets a zero be read as "nobody scanned"
   rather than "we are blind".
3. **All-time by default.** A card handed out at a show is read for months; a
   30-day ceiling would hide the campaign it is named after. The standard
   24h/7d/14d/30d slots are all there, with All time as the default.

"Became a member" is read from **ground truth** — the auth user is no longer
anonymous, or the signed-out session was claimed — never from `account.created`,
which fires before an email is confirmed (`upgrade_unconfirmed`). Our own
verification scans (codes starting `test_`, configured in
`config/events.json` → `campaigns.verificationPrefixes`) are excluded from every
headline and stated inline, exactly like our own accounts.

`reports/campaigns.md` is committed — counts and our own campaign codes only — so
marketing-studio can read the result without opening the gitignored HTML.

## Shares lane

`npm run shares` answers who opens a binder that is **not theirs**, and what they
do next — the shared-binder-link channel.

It needs no new instrumentation, which was not obvious at first. A `page.view`
already carries `props.route = /binder/<uuid>`, so the binder id is in the data;
joining it to `binders.owner_id` and comparing against the viewer separates a
visitor from the owner reading their own binder. Three populations come out of
one route, and the report states all three so none of them hides:

| | |
| --- | --- |
| **visitor views** | someone who is not the owner — the arrivals, the number that matters |
| **owner views** | the baseline to subtract, not a signal |
| **unresolved** | the binder id is not in `binders` — local-only or deleted, never a share arrival |

What the route *cannot* say is how someone got there: a link from a friend and a
click from `/discover` look identical. **"Arrived cold"** — a binder open as the
account's first-ever action — is the proxy, since in-app browsing does not
produce that. The remaining gap is recorded as `share_attribution`, deferred
rather than specced: closing it needs either a share token in the URL, which
puts a tracking parameter in a link people paste to friends, or referrer
capture, which is deferred for the privacy-copy reason.

The events lane deliberately has **no** shared-binder funnel. It does not load
binder ownership, so a route-only version would count owners opening their own
binders as arrivals and overstate the channel. One question, one answer.

## Plans lane

`npm run plans` counts distinct accounts at each tier, per app family, from the
shared `entitlements` ledger — not from the event stream, so it covers all
history. Active means `expires_at is null or expires_at > now()`, and a lapsed
grant leaves the account at Free just as the app does. Both apps read one
ledger and are told apart by product key (`tier_*` vs `tcgscan_*`), so an
account can hold a tier in each — the two panels are **not** a partition of one
population.

**Free trial is a reporting tier, not a product one.** The ladder here is
`vip > pro > trial > free`, decided by the winning grant's `source`. The apps
deliberately do *not* special-case a trial — michi's `data/tiers.ts` resolves a
trial grant to `pro` so nothing downstream has to know, and a trial holder sees
PRO everywhere in the UI. Splitting it out is an analytics decision: full
access and paid access are the same thing to the product and completely
different things to the business. The headline counts Stripe-sourced grants
only, so a trial and a comp both read as zero revenue.

Two deliberate choices in the chart:

- **Tier is ordinal, so colour is one hue stepped light→dark**, not a
  categorical set. Steps are validated with the dataviz skill's
  `validate_palette.js --ordinal` in both modes — an ordinal ramp has a tighter
  floor than a meter track, and the light end must still clear 2:1 against the
  surface (light `#2a78d6`/`#86b6ef`, dark `#3987e5`/`#184f95`).
- **Guests are not a bar.** There are two orders of magnitude more of them than
  signed-in accounts, so a shared linear scale would flatten every real tier to
  nothing, and an anonymous session is not an account at a plan tier anyway.
  They are stated as context under each panel.

As of 2026-08-06 every PRO and VIP grant on the project belongs to an excluded
account, so the honest headline is **zero paying accounts**. The excluded
holders are shown in the lighter step rather than dropped, which is what makes
that fact visible instead of just absent.

## Economy lane

`npm run economy` (or `node scripts/economy.mjs`) covers the in-app currencies
and the tier caps, one tab per app. Every plot is a **distribution**: a bar is a
bucket of accounts, not a day. Hover a bar for who is in it; click it and those
accounts drop out below with their exact numbers.

Buckets are **log-decade**, the same shape the geo lane uses, computed from the
all-time maximum so the bucket set is identical in every window — narrowing the
toggle empties bars, it never rescales them. There is deliberately **no zero
bucket**: every chart plots accounts with a positive value, so a `0` bar would
read as "nobody has zero", which is the opposite of the truth. Zero-holders are
counted in prose beside the chart instead.

**What the window toggle does and does not scope.** Flows (earned, spent) are
windowed. Balances and cap utilisation are **point-in-time as of collection** and
say so at every such block: a balance has no window, because `profiles.points`
and `profiles.pickles` are running totals and no history table exists to rewind
them. The two monthly caps (scans, prints) are calendar-month by definition — a
third scope again, also stated. Point-in-time charts pin their hover rosters to a
fixed window rather than `{scope}`, so their names cannot appear to follow a
toggle their numbers ignore.

Three findings that shape the page:

- **Doggle has a real economy; Pickleague does not have a complete one.**
  `points_ledger` carries an amount per row, so Doggle's earned/spent is exact.
  Pickleague's `user_streak_rewards` and `pickle_pot_payouts` record amounts, but
  the other five earning paths (home-court bonus, first match, first doubles,
  onboarding, per-game bonus) are *idempotency* tables — they record **that** an
  account was granted a bonus, never how many pickles it was worth. So "earned"
  on that tab is **a floor, not a total**, and the gap is counted beside it as
  grant events. Closing it needs an amount column on those tables, or a single
  pickles ledger like Doggle's.
- **One Pickleague account holds 99.8% of every pickle in circulation** and is
  caught by no exclusion rule — it signs in with an ordinary consumer email.
  Either it belongs in `config/exclusions.json` or a grant path overpaid. The
  distribution is the honest view precisely because a bucket chart puts that
  account in its own bar instead of burying it in an average.
- **The collections cap needed the bootstrap filter.** The app mints a default
  "My Collection" on every fresh install, so counting rows naively put *every*
  guest at the 1-collection guest cap — 74 accounts "at cap", all artefact. With
  the same filter the DAU lane uses, it is 2. The binder cap has no equivalent
  problem (`made_at_signup` is 0), so the 15 guests sitting at 1 of 1 binder are
  a genuine upgrade signal.

Cap definitions come from the **app code**, not from guessing at the rows:
`cardsPerCollection` counts cards (sum of quantity, owner call 2026-07-23),
`artUploads` is a retention cap on slices kept, `pagesPerBinder` is pages in one
binder. An empty cap chart states *why* it is empty — nobody has used it, versus
everyone who used it is excluded — because those are not the same fact.

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
they can be committed: `data/events.json` (aggregates, no names, no user ids)
and `data/journeys.json` (per-session timelines and per-number user rosters,
gitignored). `reports/events.html` renders both.

### Window toggle and hover rosters

The HTML report carries a **24h / 7d / 14d / 30d** toggle. All four windows are
computed server-side from a *single* fetch — four round trips would be four
slightly different "now"s, and the 24h number would disagree with the 30d one
about the last minute. The toggle only changes which precomputed block is
visible, so the browser has nothing to recompute and nothing to get wrong.
Journey cards are filtered client-side by their own start time against the
same cutoff.

Two things deliberately **do not** move with the toggle, and say so inline:

- **Ground truth** (trials, entitlements) is read over all history. "Of the
  people active in this window, how many hold a trial" is the useful question;
  a trial started before instrumentation existed is still a trial.
- **Instrumentation coverage** is all-time and all-traffic. Asking "did this
  call site fire in the last 24 hours" would report every rarely-used path as
  broken.

**Hover any count** — a tile, a funnel bar, an event row, a page row — to see
who is behind it, capped at 20 names with a `+N more`. Names resolve as
`@username` → display name → `guest <id-stub>` → email. Guests are numbered by
id stub rather than collapsed into one "(guest)", which would make four guests
look like one person.

Rosters live in `journeys.json` and never in the committed aggregates. In the
page they ride in a `<script type="application/json">` blob with `<` escaped,
are parsed rather than evaluated, and every name is written with
`textContent` — a username is user-supplied text and must never reach
`innerHTML`.

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
