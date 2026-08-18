# Event analytics — last 30 days

Collected 2026-08-18T15:07:28.572Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

143 sessions · 801 events · 11 accounts + 92 guests · median session 31s
Excluded: 122 sessions, 332 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 23 | 122 | 23 |
| 7d | 83 | 439 | 64 |
| 14d | 143 | 801 | 103 |
| 30d | 143 | 801 | 103 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **100** Opened the app (97.1% of top)
- **88** Did anything past the open (85.4% of top)
- **2** Was shown the PRO offer (1.9% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **100** Opened the app (97.1% of top)
- **88** Viewed a page (85.4% of top)
- **2** Tried a demo (1.9% of top)
- **2** Made something real (1.9% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **97** Started as a guest (100% of top)
- **82** Did anything at all (84.5% of top)
- **9** Submitted the upgrade (9.3% of top) — see gap `upgrade_unconfirmed`
- **5** Completed it (ground truth) (5.2% of top)

### What guests did past the open

97 people opened as a guest across 121 sessions.

| How far they got | People | of 97 |
| --- | ---: | ---: |
| Opened and left | 15 | 15.5% |
| Looked at a page or two | 32 | 33% |
| Wandered the site | 25 | 25.8% |
| Built something | 25 | 25.8% |

Of the 25 who built something, **5** created an account.

**15** guests walked to a pricing page; **2** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 25 | 30 |
| Added cards (`card.add`) | 11 | 59 |
| Account created (`account.created`) | 9 | 9 |
| Searched cards (`card.search`) | 4 | 5 |
| Hit a plan limit (`cap.gate_shown`) | 3 | 3 |
| Saw the PRO offer (`pro.offer_shown`) | 2 | 3 |
| Signed in (`auth.login`) | 2 | 2 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Tried the example import (`demo.csv_import`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 65 | 73 |
| `/` | 57 | 118 |
| `/binder/:id` | 27 | 64 |
| `/my-binders` | 26 | 70 |
| `/michi-method` | 19 | 26 |
| `/browse` | 17 | 28 |
| `/discover` | 15 | 22 |
| `/plans` _(pricing)_ | 13 | 18 |
| `/learn` | 12 | 19 |
| `/contest` | 6 | 12 |
| `/binder/ex-pitch-black-chase` | 6 | 6 |
| `/binder/ex-color-play` | 4 | 4 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 529 | 88 |
| Session started (`session.start`) | 140 | 100 |
| Added cards (`card.add`) | 72 | 13 |
| Created a binder (`binder.add`) | 31 | 26 |
| Account created (`account.created`) | 9 | 9 |
| Signed in (`auth.login`) | 7 | 6 |
| Searched cards (`card.search`) | 5 | 4 |
| Saw the PRO offer (`pro.offer_shown`) | 3 | 2 |
| Hit a plan limit (`cap.gate_shown`) | 3 | 3 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Tried the example import (`demo.csv_import`) | 1 | 1 |

Instrumentation: 13/20 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `csv.import`, `trial.start`, `pro.offer_declined`, `cap.gate_dismissed`, `trial.start_failed`, `csv.import_failed`, `search.no_results`

Works, but not yet from a real user: `demo.tricolor_search`, `demo.curation`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

13 sessions · 43 events · 0 accounts + 9 guests · median session 8s
Excluded: 208 sessions, 1680 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 2 | 1 |
| 7d | 4 | 10 | 2 |
| 14d | 13 | 43 | 9 |
| 30d | 13 | 43 | 9 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **9** Opened the app (100% of top)
- **4** Did anything past the open (44.4% of top)
- **0** Was shown the PRO offer (0% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **9** Opened the app (100% of top)
- **4** Viewed a page (44.4% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **9** Started as a guest (100% of top)
- **4** Did anything at all (44.4% of top)
- **1** Submitted the upgrade (11.1% of top) — see gap `upgrade_unconfirmed`
- **0** Completed it (ground truth) (0% of top)

### What guests did past the open

9 people opened as a guest across 13 sessions.

| How far they got | People | of 9 |
| --- | ---: | ---: |
| Opened and left | 5 | 55.6% |
| Looked at a page or two | 1 | 11.1% |
| Wandered the site | 3 | 33.3% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Account created (`account.created`) | 1 | 4 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/browse` | 3 | 6 |
| `/settings` | 3 | 5 |
| `/scan` | 3 | 4 |
| `/collection` | 3 | 4 |
| `/` | 3 | 4 |
| `/collection/col-msjkro33-0` | 1 | 1 |
| `/card/:n` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 25 | 4 |
| Session started (`session.start`) | 12 | 9 |
| Account created (`account.created`) | 4 | 1 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |

Instrumentation: 15/19 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `trial.start`, `cap.gate_dismissed`, `trial.start_failed`, `scan.failed`

Works, but not yet from a real user: `auth.login`, `card.add`, `scan.capture`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `pro.offer_shown`, `cap.gate_shown`

## Doggle

23 sessions · 68 events · 1 account + 32 guests · median session 1s
Excluded: 25 sessions, 113 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 4 | 9 | 4 |
| 7d | 23 | 68 | 33 |
| 14d | 23 | 68 | 33 |
| 30d | 23 | 68 | 33 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **32** Arrived signed out (100% of top)
- **27** Viewed any screen (84.4% of top)
- **1** Created an account (3.1% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `test_doggle_qr` (qr · print) | 1 | 1 | 0 | 0 |

### What guests did past the open

32 people opened as a guest across 22 sessions.

| How far they got | People | of 32 |
| --- | ---: | ---: |
| Opened and left | 5 | 15.6% |
| Looked at a page or two | 25 | 78.1% |
| Wandered the site | 2 | 6.3% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Account created (`account.created`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 15 | 15 |
| `Login` | 13 | 16 |
| `Walk` | 1 | 1 |
| `DogProfile` | 1 | 1 |
| `Profile` | 1 | 1 |
| `Home` | 1 | 1 |
| `Settings` | 1 | 1 |
| `WalkDetail` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 39 | 28 |
| Session started (`session.start`) | 28 | 22 |
| Account created (`account.created`) | 1 | 1 |

Instrumentation: 4/4 events verified firing (all traffic, all time).

Works, but not yet from a real user: `auth.login`

## Pickleague

11 sessions · 28 events · 0 accounts + 8 guests · median session 13s
Excluded: 27 sessions, 245 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 4 | 10 | 1 |
| 7d | 11 | 28 | 8 |
| 14d | 11 | 28 | 8 |
| 30d | 11 | 28 | 8 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **8** Arrived signed out (100% of top)
- **7** Viewed any screen (87.5% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

8 people opened as a guest across 7 sessions.

| How far they got | People | of 8 |
| --- | ---: | ---: |
| Opened and left | 1 | 12.5% |
| Looked at a page or two | 5 | 62.5% |
| Wandered the site | 2 | 25% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Signed in (`auth.login`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 5 | 8 |
| `EventDetail` | 1 | 4 |
| `Home` | 1 | 1 |
| `Settings` | 1 | 1 |
| `GuestJoin` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 15 | 7 |
| Session started (`session.start`) | 12 | 6 |
| Signed in (`auth.login`) | 1 | 1 |

Instrumentation: 3/4 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `account.created`

## Tracking gaps

### A real trial activation produced no trial.start event `trial_start_dropped` (high, open)

Found 2026-08-08 by activating a trial by hand on an owner account. Ground truth recorded it — public.pro_trials gained a row and entitlements a 14-day tier_pro grant, both stamped 23:33:09.484Z — but analytics_events has no trial.start, and has never had one. The call site is not missing: michi-maker/src/components/monetization/TrialCta.tsx:61 calls track('trial.start', { surface }) immediately after the RPC resolves, and its catch would have emitted trial.start_failed had the RPC thrown. Neither appeared. The cause is the guard at michi-maker/src/lib/analytics.ts:385 — `if (!supabase || !cachedUser) return;` — which discards an event when the analytics module has not yet been handed the auth identity by resetSessionUser(). Corroborated by the clock: michi's analytics_sessions row for that user was not created until 23:33:31.262Z, 21.8 seconds AFTER the grant, so no session and no cachedUser existed at the moment of the click. Every event emitted in that window is lost with no error and no counter.

**Effect:** understates trial starts, and silently — the surface attribution just added by trial_awareness cannot be joined to an activation, so offer-to-start conversion stays unmeasurable even though both ends now exist

**Fix:** Preferred: emit from the start_pro_trial RPC server-side, which cannot be lost to a bootstrap race, a crash, or a blocked request — the comment at TrialCta.tsx:59 already names this as the more authoritative option. Cheaper alternative: buffer events emitted while cachedUser is null and flush on resetSessionUser(), rather than dropping them. Either way the drop should stop being silent — a swallowed analytics failure is correct, an unrecorded one that nothing counts is not. Specced in ../tcgscan/ANALYTICS-TRIAL-START-DROPPED.md.

### TCGScan cannot see its own search queries `tcgscan_search_blind` (medium, open)

Free-typed search on tcgscan runs inside the shared tcgscan-browse package, which exposes no onEvent callback, so the app cannot observe a query or its result count. What it emits are proxies from outside the kit: card.search { kind: 'similar' } when find-similar is pressed, and card.open when a detail opens (documented at tcgscan-app/src/app/(tabs)/browse/index.tsx:169). michi has no such boundary and does emit search.no_results. Discovered 2026-08-06 while verifying the gap fixes; it is why search.no_results is registered for michi only rather than pending forever on tcgscan.

**Effect:** tcgscan search volume and zero-result rate are both unmeasurable; card.search understates real searching

**Fix:** add an onEvent callback to the tcgscan-browse package (search ran, result count), then consume it in tcgscan-app. Per tcgscan/AGENTS.md rule 3 that is a package release plus a commit-pin bump in each app — not a local interception, which the code comment there explicitly warns against.

### account.created counts submitted upgrades, not completed ones `upgrade_unconfirmed` (medium, open)

Both apps fire account.created {via:'guest_upgrade'} the moment updateUser() returns, which is before the email is confirmed. An upgrade whose email is never confirmed leaves auth.users.is_anonymous = true forever - the person stays a guest and keeps their guest caps, while the stream says they made an account. On 2026-08-11, 4 users had fired the event and only 2 had confirmed: the event overstates completed conversion by 2x.

**Effect:** conversion is overstated; the guest population is understated by the same people

**Fix:** emit a second event on confirmation (auth.confirmed, or account.created {via:'guest_upgrade_confirmed'}) so submit and complete are separable in the stream. Until then the funnel reads completion from ground truth (auth.users.is_anonymous + analytics_sessions.upgraded_at), which is why that stage is labelled as such.

### Signed-out visits cannot be excluded `anon_visitor_exclusions` (medium, open)

Exclusions key on auth identity: email/uid always, IPs only for anonymous AUTH users. Doggle and pickleague visitor sessions have no auth user at all, so our own signed-out browsing counts as real traffic in their behavioural numbers. Signed-in dev traffic is still excluded normally, and michi/tcgscan are unaffected (their guests are anon auth users, IP exclusion applies).

**Effect:** doggle/pickleague visitor counts are overstated by however much we browse our own public pages signed out.

**Fix:** Either add a device_id exclusion list once dev devices are known, or browse the public pages signed in. Until then read visitor spikes next to the deploy/QA calendar.

### Doggle OAuth signups fire no account.created `doggle_oauth_signup_untracked` (low, open)

account.created fires from the email/phone signUp wrappers in doggle's data/auth.ts. An OAuth (Google/Apple) signup never passes through them, so it emits only auth.login plus the session claim (upgraded_at). The doggle signup funnel stage carries this caveat.

**Effect:** doggle signups are undercounted by the OAuth share; the 'signed in on that visit' stage is the honest ceiling.

**Fix:** Fire account.created from the OAuth return path when the auth user was created moments before, mirroring michi's handling of the same ambiguity.

### A guest who clears storage becomes a new person `guest_device_churn` (medium, specced)

analytics_sessions has no device column, so identity for an anonymous user is only as durable as the Supabase session in storage. A reload keeps the same anon uid (persistence works - 5 michi anon uids span multiple days, one has 10 sessions), but cleared site data, incognito, a second browser or a reinstall mints a fresh uid with no join key to the old one. Guest counts are therefore an upper bound on guest PEOPLE.

**Effect:** guest people are overstated; every rate with guests in the denominator is understated

**Fix:** add analytics_sessions.device_id - a random opaque UUID generated once at first launch, persisted in localStorage/AsyncStorage, never regenerated on sign-out or upgrade. Specced in ../tcgscan/ANALYTICS-GUEST-DEVICE-ID.md.

### No impression event for the PRO trial offer `trial_awareness` (blocking, landed)

TrialCta renders the 'Start free 14-day PRO trial' button but emits nothing until it is pressed, and it returns null for anyone not eligible. The offer also appears outside /plans (michi's PrintPlaceholdersSheet), so a pricing page view neither implies nor is required for seeing it. Awareness is not measured, so the funnel's awareness stage reads zero — that zero is the gap, not a finding. Pricing-page views in the Pages table are the interim proxy, and they are a different and smaller set.

**Effect:** understates awareness — currently makes it unmeasurable

**Fix:** track('pro.offer_shown', { surface }) once per mount on the rendering path only (never the return-null path), plus pro.offer_declined on dismissal and a surface prop on trial.start. Both apps' components/monetization/TrialCta.tsx. Note this counts ELIGIBLE impressions only, which is the right denominator for offer conversion and the wrong one for audience awareness.

### Cap gates emit nothing, so upgrade intent is invisible `cap_gates_blind` (blocking, landed)

Every tier limit in tier_caps can stop a user — binders, pagesPerBinder, artUploads, cardScansPerMonth, collections, cardsPerCollection — and none of them emit an event when they do. The only monetization impression the stream has is pro.offer_shown, which fires from TrialCta; a gate that refuses an action without rendering that button is invisible. Hitting a cap is the highest-intent moment the product has, and it is the one moment the stream cannot see.

**Effect:** understates upgrade intent to exactly zero — every cap hit ever is unrecorded

**Fix:** Emit cap.gate_shown { limit, surface, tier, used, cap } once per gate impression, where `limit` is the tier_caps limit_key verbatim (pagesPerBinder, binders, artUploads, cardScansPerMonth, collections, cardsPerCollection) so it joins to the cap with no lookup table. Emit cap.gate_dismissed { limit, surface } when the user backs out without acting. Where a gate already renders TrialCta, pass the SAME surface string so cap.gate_shown, pro.offer_shown and trial.start share one attribution key and the gate-to-trial funnel is a join rather than a guess. Specced in ../tcgscan/ANALYTICS-CAP-GATES.md.

### Session length is a floor, not a duration `session_end` (medium, landed)

last_seen_at is bumped opportunistically and throttled to 60s, and only when an event fires. There is no unload/background hook, so a session that ends after a long read records the timestamp of its last tracked action instead. Every duration is an underestimate, and single-event sessions read as zero seconds.

**Effect:** understates session length

**Fix:** flush a last_seen_at write on web 'visibilitychange'/'pagehide' and on RN AppState 'background'.

### Nothing records failure `no_error_events` (medium, landed)

No event marks a failed scan, a rejected CSV, a search with no results, or a checkout that errored. Every funnel measures only the happy path, so a stage that drops off cannot be distinguished between 'lost interest' and 'it broke'.

**Effect:** hides the reason for every drop-off

**Fix:** track('<feature>.failed', { reason }) on the error branches that already exist.

### Campaign codes ride on landing_route and account.created `qr_campaign_capture` (medium, landed)

The emitters keep an allowlisted ?code/utm_* query on the first page.view (stored in landing_route) and merge the code into account.created props; all four apps landed the change 2026-08-13. Verified end-to-end against real rows in dev the same day: a fresh-context scan wrote landing_route='/welcome?code=...' plus device_id on michi, and 'Landing?code=...' plus the heartbeat/claim RPCs on doggle (the claim exercised as an authenticated JWT and reverted). Two bugs were found and fixed on the way: the fresh-visitor buffer wipe and the RLS select-gating no-op. What remains unproven is only production: the app code must deploy, and a printed code must be scanned for real.

**Effect:** until a real scan lands, a zero in the campaigns panel means 'not verified end-to-end', not 'the card show produced nothing'.

**Fix:** Deploy the app changes (migrations are already applied), then scan a printed code against production and confirm the session row carries code=<campaign>; then mark fixed.

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

### landing_route was never written — the update was never sent `landing_route_broken` (high, fixed)

Root cause found and fixed 2026-08-06 (michi-maker e07d2e1, tcgscan-app 7a979a8). Both apps wrote it through a bare `void supabase.from(...).update(...)`. supabase-js returns a PostgrestFilterBuilder, which is a LAZY thenable: it only issues its HTTP request when something calls .then(). `void builder` builds the query and drops it — no request, no error, nothing to catch. The sites that work (touchSession, and the guest-upgrade branch of resetSessionUser) all await, which is exactly why last_seen_at advanced normally while landing_route stayed null on all 91 sessions: same table, same policy, same session, different call shape. flushLastSeen had the identical defect, so the session_end fix was also silently doing nothing on the visibilitychange path. Not permissions: RLS grants authenticated UPDATE on auth.uid() = user_id, column-level UPDATE covers landing_route, and the guard trigger does not touch it.

**Effect:** was: entry point unknown for every session, and session tails understated on tab-hide

**Fix:** FIXED — verified in production 2026-08-08: 30 of the 58 sessions started in the preceding 48h carry a non-null landing_route, where every one of the 91 sessions before the fix was null. The remainder are sessions that never recorded a page.view (landing_route is backfilled from the first one), not a residual failure.

### A guest session is rewritten to look like it never was one `guest_upgrade` (medium, fixed)

The conversion event itself DOES exist: both apps emit account.created with props.via = 'guest_upgrade' (michi store/auth.tsx:309,348; tcgscan store/auth.tsx:198,266,283). What is lost is the session. resetSessionUser() patches analytics_sessions.is_guest in place when a guest signs up mid-session, so the row retroactively claims it was always an account. Sessions cannot be split into 'started as guest' and 'started signed in', and the session-level conversion rate is unrecoverable.

**Effect:** guest-started sessions are undercounted; the conversion count itself is correct

**Fix:** stop mutating is_guest — make it mean 'started as a guest' and add an upgraded_at column set at the transition, guarded by a trigger so a future client cannot regress it.
