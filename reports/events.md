# Event analytics — last 30 days

Collected 2026-08-05T21:54:22.779Z. Own/QA/automated accounts excluded.

## Michi-Maker

2 sessions · 2 events · 0 accounts + 1 guest · median session 0s
Excluded: 44 sessions, 110 events (our own, QA and automated accounts).

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **1** Opened the app (100% of top)
- **0** Did anything past the open (0% of top)
- **0** Reached a pricing surface (0% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **1** Opened the app (100% of top)
- **0** Viewed a page (0% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts?_

- **1** Started as a guest (100% of top)
- **0** Did anything at all (0% of top)
- **0** Created an account (0% of top) — see gap `guest_upgrade`

| Event | Fired | People |
| --- | ---: | ---: |
| Session started (`session.start`) | 2 | 1 |

Instrumentation: 8/13 events verified firing (all traffic).

Never fired by anyone (unverified): `account.created`, `demo.print`, `csv.import`, `card.search`, `trial.start`

Works, but not yet from a real user: `page.view`, `auth.login`, `demo.tricolor_search`, `demo.csv_import`, `demo.curation`, `binder.add`, `card.add`

## TCGScan

0 sessions · 0 events · 0 accounts + 0 guests · median session —
Excluded: 4 sessions, 13 events (our own, QA and automated accounts).

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **0** Opened the app
- **0** Did anything past the open
- **0** Reached a pricing surface — see gap `trial_awareness`
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

Instrumentation: 4/14 events verified firing (all traffic).

Never fired by anyone (unverified): `account.created`, `card.search`, `card.open`, `scan.capture`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `trial.start`

Works, but not yet from a real user: `session.start`, `page.view`, `auth.login`, `card.add`

## Tracking gaps

### No impression event for the PRO trial offer `trial_awareness` (blocking)

TrialCta renders the 'Start free 14-day PRO trial' button but emits nothing until it is pressed, and it returns null for anyone not eligible. The offer also appears outside /plans (michi's PrintPlaceholdersSheet), so a pricing page view neither implies nor is required for seeing it. Awareness is therefore not measured; the report substitutes pricing-page views, which is a different and smaller set.

**Effect:** understates awareness

**Fix:** track('pro.offer_shown', { surface }) on TrialCta mount, in both apps' components/monetization/TrialCta.tsx. Add track('pro.offer_declined') on dismissal of the gate that surfaced it.

### Guest-to-account upgrade is not an event `guest_upgrade` (high)

resetSessionUser() detects a guest upgrading in place (same uid, is_guest flips) and patches analytics_sessions.is_guest, but emits no event. The conversion is invisible in the stream and the session's own history is rewritten to look like it was never a guest.

**Effect:** understates guest conversion, overstates signed-in sessions

**Fix:** track('account.upgraded', { from: 'guest' }) in the same branch of resetSessionUser() that patches is_guest, in both apps' lib/analytics.ts.

### Session length is a floor, not a duration `session_end` (medium)

last_seen_at is bumped opportunistically and throttled to 60s, and only when an event fires. There is no unload/background hook, so a session that ends after a long read records the timestamp of its last tracked action instead. Every duration is an underestimate, and single-event sessions read as zero seconds.

**Effect:** understates session length

**Fix:** flush a last_seen_at write on web 'visibilitychange'/'pagehide' and on RN AppState 'background'.

### Nothing records failure `no_error_events` (medium)

No event marks a failed scan, a rejected CSV, a search with no results, or a checkout that errored. Every funnel measures only the happy path, so a stage that drops off cannot be distinguished between 'lost interest' and 'it broke'.

**Effect:** hides the reason for every drop-off

**Fix:** track('<feature>.failed', { reason }) on the error branches that already exist.

### Most events carry no props `props_thin` (low)

Only auth.login (method), card.add (source, count), page.view (route) and session.start (is_guest) carry any props. scan.capture, binder.add, csv.import and the demo events carry none, so 'how many cards per import' or 'which demo leads to signup' cannot be segmented.

**Effect:** limits segmentation, does not bias counts

**Fix:** add a small props object at each call site; keep it ids and counts only, per the no-PII rule in lib/analytics.ts.

### No acquisition source `referrer` (low)

Nothing records how a session arrived — no referrer, no UTM capture. Marketing spend cannot be attributed to activation or trials.

**Effect:** no attribution possible

**Fix:** capture document.referrer and utm_* on first web load into the analytics_sessions row (add nullable columns); native can send the install referrer.
