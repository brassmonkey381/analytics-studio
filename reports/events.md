# Event analytics — last 30 days

Collected 2026-08-08T15:07:23.750Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

35 sessions · 219 events · 2 accounts + 23 guests · median session 1m
Excluded: 86 sessions, 178 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 8 | 62 | 8 |
| 7d | 35 | 219 | 25 |
| 14d | 35 | 219 | 25 |
| 30d | 35 | 219 | 25 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **25** Opened the app (100% of top)
- **17** Did anything past the open (68% of top)
- **1** Was shown the PRO offer (4% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **25** Opened the app (100% of top)
- **17** Viewed a page (68% of top)
- **1** Tried a demo (4% of top)
- **1** Made something real (4% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts?_

- **23** Started as a guest (100% of top)
- **15** Did anything at all (65.2% of top)
- **0** Created an account (0% of top) — see gap `guest_upgrade`

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 156 | 17 |
| Session started (`session.start`) | 35 | 25 |
| Added cards (`card.add`) | 16 | 3 |
| Created a binder (`binder.add`) | 8 | 6 |
| Saw the PRO offer (`pro.offer_shown`) | 2 | 1 |
| Account created (`account.created`) | 1 | 1 |
| Tried the print example (`demo.print`) | 1 | 1 |

Instrumentation: 10/13 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `csv.import`, `card.search`, `trial.start`

Works, but not yet from a real user: `auth.login`, `demo.tricolor_search`, `demo.csv_import`, `demo.curation`

Registered, not yet fired: `pro.offer_declined`, `trial.start_failed`, `csv.import_failed`, `search.no_results`, `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

**Landed since the spec:** `pro.offer_shown` — mark the matching gap `fixed`.

## TCGScan

7 sessions · 32 events · 0 accounts + 6 guests · median session 8s
Excluded: 47 sessions, 251 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 20 | 1 |
| 7d | 7 | 32 | 6 |
| 14d | 7 | 32 | 6 |
| 30d | 7 | 32 | 6 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **6** Opened the app (100% of top)
- **2** Did anything past the open (33.3% of top)
- **0** Was shown the PRO offer (0% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **6** Opened the app (100% of top)
- **2** Viewed a page (33.3% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts?_

- **6** Started as a guest (100% of top)
- **2** Did anything at all (33.3% of top)
- **1** Created an account (16.7% of top) — see gap `guest_upgrade`

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 19 | 2 |
| Session started (`session.start`) | 7 | 6 |
| Account created (`account.created`) | 4 | 1 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |

Instrumentation: 10/14 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `collection.create`, `collection.rename`, `collection.delete`, `trial.start`

Works, but not yet from a real user: `auth.login`, `card.add`, `scan.capture`, `collection.card_add`, `collection.card_remove`

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

### landing_route was never written — the update was never sent `landing_route_broken` (high, landed)

Root cause found and fixed 2026-08-06 (michi-maker e07d2e1, tcgscan-app 7a979a8). Both apps wrote it through a bare `void supabase.from(...).update(...)`. supabase-js returns a PostgrestFilterBuilder, which is a LAZY thenable: it only issues its HTTP request when something calls .then(). `void builder` builds the query and drops it — no request, no error, nothing to catch. The sites that work (touchSession, and the guest-upgrade branch of resetSessionUser) all await, which is exactly why last_seen_at advanced normally while landing_route stayed null on all 91 sessions: same table, same policy, same session, different call shape. flushLastSeen had the identical defect, so the session_end fix was also silently doing nothing on the visibilitychange path. Not permissions: RLS grants authenticated UPDATE on auth.uid() = user_id, column-level UPDATE covers landing_route, and the guard trigger does not touch it.

**Effect:** was: entry point unknown for every session, and session tails understated on tab-hide

**Fix:** DONE — both sites now await inside a fire-and-forget async IIFE. Awaiting deploy and verification: landing_route should be non-null on sessions started after the next production build. Flip this gap to `fixed` once that is observed.

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

### A binder open does not say what carried the visitor there `share_attribution` (low, deferred)

CORRECTED 2026-08-06. This was first written up as blocking, on the reasoning that a shared-link arrival was unrecordable. That was wrong, and Brian caught it: page.view already carries props.route = /binder/<uuid>, so the binder id is in the data, and joining it to binders.owner_id separates a visitor from the owner reading their own binder. The whole channel is measurable from rows that already exist — see the shares lane, which needed no app change. What genuinely remains is narrower: the route cannot say HOW someone arrived, so a link from a friend and a click from /discover are identical. 'Arrived cold' (a binder open as the account's first ever action) is the proxy, since in-app browsing does not produce that.

**Effect:** channel volume is measurable; only the referring surface is unknown

**Fix:** not scheduled — deliberately. Distinguishing the two would need either a share token in the URL, which puts a tracking parameter in a link people paste to friends, or referrer capture, which is deferred for the privacy-copy reason under `referrer`. The share.* events registered in the taxonomy stay planned rather than specced: they would add sharer-side intent (made public, copied the link), which is a different question from arrivals and is not blocking anything.

### No acquisition source `referrer` (low, deferred)

Nothing records how a session arrived — no referrer, no UTM capture. Marketing spend cannot be attributed to activation or trials. DEFERRED by Brian on 2026-08-06, for a real reason rather than as a backlog punt: michi-maker/src/app/legal/privacy.tsx promises first-party records of 'which pages you open and product actions', and referrer/UTM are neither. Capturing them means changing that disclosure first, in both apps.

**Effect:** no attribution possible

**Fix:** not scheduled. When picked up: nullable referrer/utm_source/utm_medium/utm_campaign on analytics_sessions, web only, referrer stripped to origin + pathname CLIENT-SIDE so another site's query string cannot carry PII into our database — and the privacy copy updated in the same change.
