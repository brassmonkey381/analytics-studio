# Event analytics — last 30 days

Collected 2026-08-05T23:50:16.788Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

5 sessions · 17 events · 1 account + 3 guests · median session 2s
Excluded: 76 sessions, 148 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 5 | 17 | 4 |
| 7d | 5 | 17 | 4 |
| 14d | 5 | 17 | 4 |
| 30d | 5 | 17 | 4 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **4** Opened the app (100% of top)
- **3** Did anything past the open (75% of top)
- **0** Was shown the PRO offer (0% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **4** Opened the app (100% of top)
- **3** Viewed a page (75% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts?_

- **3** Started as a guest (100% of top)
- **2** Did anything at all (66.7% of top)
- **0** Created an account (0% of top) — see gap `guest_upgrade`

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 11 | 3 |
| Session started (`session.start`) | 5 | 4 |
| Created a binder (`binder.add`) | 1 | 1 |

Instrumentation: 9/13 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `account.created`, `csv.import`, `card.search`, `trial.start`

Works, but not yet from a real user: `auth.login`, `demo.tricolor_search`, `demo.csv_import`, `demo.curation`, `demo.print`, `card.add`

Registered, not yet fired: `pro.offer_shown`, `pro.offer_declined`, `trial.start_failed`, `csv.import_failed`, `search.no_results`

## TCGScan

0 sessions · 0 events · 0 accounts + 0 guests · median session —
Excluded: 4 sessions, 13 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 0 | 0 | 0 |
| 14d | 0 | 0 | 0 |
| 30d | 0 | 0 | 0 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **0** Opened the app
- **0** Did anything past the open
- **0** Was shown the PRO offer — see gap `trial_awareness`
- **0** Started a PRO trial

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **0** Opened the app
- **0** Viewed a page
- **0** Tried a demo
- **0** Made something real

### Guest to account

_Do anonymous guests ever convert into real accounts?_

- **0** Started as a guest
- **0** Did anything at all
- **0** Created an account — see gap `guest_upgrade`

Instrumentation: 4/14 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `account.created`, `card.search`, `card.open`, `scan.capture`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `trial.start`

Works, but not yet from a real user: `session.start`, `page.view`, `auth.login`, `card.add`

Registered, not yet fired: `pro.offer_shown`, `trial.start_failed`, `scan.failed`

## Tracking gaps

### TCGScan cannot see its own search queries `tcgscan_search_blind` (medium, open)

Free-typed search on tcgscan runs inside the shared tcgscan-browse package, which exposes no onEvent callback, so the app cannot observe a query or its result count. What it emits are proxies from outside the kit: card.search { kind: 'similar' } when find-similar is pressed, and card.open when a detail opens (documented at tcgscan-app/src/app/(tabs)/browse/index.tsx:169). michi has no such boundary and does emit search.no_results. Discovered 2026-08-06 while verifying the gap fixes; it is why search.no_results is registered for michi only rather than pending forever on tcgscan.

**Effect:** tcgscan search volume and zero-result rate are both unmeasurable; card.search understates real searching

**Fix:** add an onEvent callback to the tcgscan-browse package (search ran, result count), then consume it in tcgscan-app. Per tcgscan/AGENTS.md rule 3 that is a package release plus a commit-pin bump in each app — not a local interception, which the code comment there explicitly warns against.

### No impression event for the PRO trial offer `trial_awareness` (blocking, landed)

TrialCta renders the 'Start free 14-day PRO trial' button but emits nothing until it is pressed, and it returns null for anyone not eligible. The offer also appears outside /plans (michi's PrintPlaceholdersSheet), so a pricing page view neither implies nor is required for seeing it. Awareness is not measured, so the funnel's awareness stage reads zero — that zero is the gap, not a finding. Pricing-page views in the Pages table are the interim proxy, and they are a different and smaller set.

**Effect:** understates awareness — currently makes it unmeasurable

**Fix:** track('pro.offer_shown', { surface }) once per mount on the rendering path only (never the return-null path), plus pro.offer_declined on dismissal and a surface prop on trial.start. Both apps' components/monetization/TrialCta.tsx. Note this counts ELIGIBLE impressions only, which is the right denominator for offer conversion and the wrong one for audience awareness.

### A guest session is rewritten to look like it never was one `guest_upgrade` (medium, landed)

The conversion event itself DOES exist: both apps emit account.created with props.via = 'guest_upgrade' (michi store/auth.tsx:309,348; tcgscan store/auth.tsx:198,266,283). What is lost is the session. resetSessionUser() patches analytics_sessions.is_guest in place when a guest signs up mid-session, so the row retroactively claims it was always an account. Sessions cannot be split into 'started as guest' and 'started signed in', and the session-level conversion rate is unrecoverable.

**Effect:** guest-started sessions are undercounted; the conversion count itself is correct

**Fix:** stop mutating is_guest — make it mean 'started as a guest' and add an upgraded_at column set at the transition, guarded by a trigger so a future client cannot regress it.

### Session length is a floor, not a duration `session_end` (medium, landed)

last_seen_at is bumped opportunistically and throttled to 60s, and only when an event fires. There is no unload/background hook, so a session that ends after a long read records the timestamp of its last tracked action instead. Every duration is an underestimate, and single-event sessions read as zero seconds.

**Effect:** understates session length

**Fix:** flush a last_seen_at write on web 'visibilitychange'/'pagehide' and on RN AppState 'background'.

### Nothing records failure `no_error_events` (medium, landed)

No event marks a failed scan, a rejected CSV, a search with no results, or a checkout that errored. Every funnel measures only the happy path, so a stage that drops off cannot be distinguished between 'lost interest' and 'it broke'.

**Effect:** hides the reason for every drop-off

**Fix:** track('<feature>.failed', { reason }) on the error branches that already exist.

### A handful of events carry no props `props_thin` (low, landed)

Assessed against the code, not the recorded rows — the sample in the database is small enough to be misleading. Most call sites are already well instrumented: card.search carries kind, scan.capture carries mode and cards, csv.import carries cards, card.add carries source and count, account.created carries via, binder.add carries isDemo. The bare ones are demo.print, demo.tricolor_search, demo.csv_import, card.open, trial.start and the four collection.* events, so 'which demo precedes a signup' and 'which surface sold the trial' cannot be segmented.

**Effect:** limits segmentation on those events only; biases no count

**Fix:** add a small props object at those call sites; ids and counts only, per the no-PII rule in lib/analytics.ts.

### No acquisition source `referrer` (low, deferred)

Nothing records how a session arrived — no referrer, no UTM capture. Marketing spend cannot be attributed to activation or trials. DEFERRED by Brian on 2026-08-06, for a real reason rather than as a backlog punt: michi-maker/src/app/legal/privacy.tsx promises first-party records of 'which pages you open and product actions', and referrer/UTM are neither. Capturing them means changing that disclosure first, in both apps.

**Effect:** no attribution possible

**Fix:** not scheduled. When picked up: nullable referrer/utm_source/utm_medium/utm_campaign on analytics_sessions, web only, referrer stripped to origin + pathname CLIENT-SIDE so another site's query string cannot carry PII into our database — and the privacy copy updated in the same change.
