# Event analytics — last 30 days

Collected 2026-08-31T15:07:29.872Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

419 sessions · 3195 events · 33 accounts + 247 guests · median session 1m
Excluded: 290 sessions, 2739 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 14 | 98 | 12 |
| 7d | 154 | 1292 | 102 |
| 14d | 299 | 2516 | 201 |
| 30d | 419 | 3195 | 280 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **277** Opened the app (98.9% of top)
- **261** Did anything past the open (93.2% of top)
- **13** Was shown the PRO offer (4.6% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **10** Was stopped by a plan limit (3.6% of top)
- **2** Was shown the PRO offer (0.7% of top) — see gap `trial_awareness`
- **0** Pressed start (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **277** Opened the app (98.9% of top)
- **261** Viewed a page (93.2% of top)
- **6** Tried a demo (2.1% of top)
- **6** Made something real (2.1% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **264** Started as a guest (100% of top)
- **245** Did anything at all (92.8% of top)
- **30** Submitted the upgrade (11.4% of top) — see gap `upgrade_unconfirmed`
- **15** Completed it (ground truth) (5.7% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `299d297d-c1cb-43d6-be4a-cb5e2ce049e6` | 2 | 2 | 0 | 1 |
| `a6d172c4-e566-4b11-bf24-b26a652ba087` | 1 | 1 | 0 | 0 |
| `72baa86b-7204-444f-8ba1-f62c1103b534` | 1 | 1 | 0 | 0 |
| `49bb8d42-bb93-4b2f-9b83-b1d0e58d91eb` | 1 | 1 | 0 | 0 |
| `eacc07d3-89ad-4398-8673-5cecdfd710ce` | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offered | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `binders` | my_binders | 5 | 4 | _not recorded_ | _not recorded 5_ | _not recorded 5_ | _none recorded_ |
| `binders` | browse | 3 | 3 | _not recorded_ | _not recorded 3_ | _not recorded 3_ | _none recorded_ |
| `pagesPerBinder` | binder_editor | 3 | 2 | _not recorded_ | _not recorded 3_ | _not recorded 3_ | _none recorded_ |
| `pagesPerBinder` | browse | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing.

The PRO offer: shown **28** times to **13** people, walked away from **3**, pressed **0**. A decline is recorded only where walking away is an act, never for leaving a page.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 7 | 7 | accepted 2, dismissed 4 _(+1 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 2 | 2 | accepted 2, abandoned 1 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

264 people opened as a guest across 330 sessions.

| How far they got | People | of 264 |
| --- | ---: | ---: |
| Opened and left | 19 | 7.2% |
| Looked at a page or two | 86 | 32.6% |
| Wandered the site | 77 | 29.2% |
| Built something | 82 | 31.1% |

Of the 82 who built something, **17** created an account.

**39** guests walked to a pricing page; **8** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 82 | 97 |
| Added cards (`card.add`) | 38 | 266 |
| Account created (`account.created`) | 30 | 35 |
| Hit a plan limit (`cap.gate_shown`) | 9 | 10 |
| Saw the PRO offer (`pro.offer_shown`) | 8 | 14 |
| Searched cards (`card.search`) | 8 | 10 |
| Signed in (`auth.login`) | 7 | 7 |
| Was shown a prompt (`prompt.shown`) | 5 | 5 |
| Answered a prompt (`prompt.answered`) | 4 | 4 |
| Tried the print example (`demo.print`) | 2 | 2 |
| Dismissed the PRO offer (`pro.offer_declined`) | 2 | 2 |
| Tried the example import (`demo.csv_import`) | 1 | 1 |
| Tried tri-color search (`demo.tricolor_search`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 218 | 244 |
| `/` | 190 | 422 |
| `/binder/:id` | 100 | 252 |
| `/my-binders` | 92 | 242 |
| `/michi-method` | 49 | 68 |
| `/discover` | 44 | 68 |
| `/browse` | 36 | 55 |
| `/learn` | 35 | 47 |
| `/plans` _(pricing)_ | 31 | 40 |
| `/contest` | 21 | 30 |
| `/binder/ex-pitch-black-chase` | 13 | 13 |
| `/purchases` _(pricing)_ | 12 | 17 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 1987 | 261 |
| Added cards (`card.add`) | 540 | 45 |
| Session started (`session.start`) | 415 | 277 |
| Created a binder (`binder.add`) | 113 | 92 |
| Account created (`account.created`) | 35 | 30 |
| Saw the PRO offer (`pro.offer_shown`) | 28 | 13 |
| Signed in (`auth.login`) | 26 | 21 |
| Searched cards (`card.search`) | 12 | 10 |
| Hit a plan limit (`cap.gate_shown`) | 12 | 10 |
| Was shown a prompt (`prompt.shown`) | 9 | 7 |
| Answered a prompt (`prompt.answered`) | 9 | 7 |
| Tried the example import (`demo.csv_import`) | 3 | 3 |
| Dismissed the PRO offer (`pro.offer_declined`) | 3 | 3 |
| Tried the print example (`demo.print`) | 2 | 2 |
| Tried tri-color search (`demo.tricolor_search`) | 1 | 1 |

Instrumentation: 19/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `csv.import`, `cap.gate_dismissed`, `trial.start_click`, `csv.import_failed`, `search.no_results`

Works, but not yet from a real user: `demo.curation`, `compose.pages_kept`, `trial.start`, `trial.start_failed`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

21 sessions · 58 events · 0 accounts + 13 guests · median session 3s
Excluded: 454 sessions, 6118 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 5 | 12 | 1 |
| 14d | 9 | 17 | 5 |
| 30d | 21 | 58 | 13 |

### PRO trial: awareness to activation

_How many users know the PRO trial exists, and how many start one?_

- **13** Opened the app (100% of top)
- **5** Did anything past the open (38.5% of top)
- **0** Was shown the PRO offer (0% of top) — see gap `trial_awareness`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **13** Opened the app (100% of top)
- **5** Viewed a page (38.5% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **13** Started as a guest (100% of top)
- **5** Did anything at all (38.5% of top)
- **1** Submitted the upgrade (7.7% of top) — see gap `upgrade_unconfirmed`
- **0** Completed it (ground truth) (0% of top)

### What guests did past the open

13 people opened as a guest across 21 sessions.

| How far they got | People | of 13 |
| --- | ---: | ---: |
| Opened and left | 8 | 61.5% |
| Looked at a page or two | 1 | 7.7% |
| Wandered the site | 3 | 23.1% |
| Built something | 1 | 7.7% |

Of the 1 who built something, **0** created an account.

| Guest action | People | Times |
| --- | ---: | ---: |
| Account created (`account.created`) | 1 | 4 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |
| Added cards (`card.add`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/scan` | 4 | 9 |
| `/` | 4 | 5 |
| `/browse` | 3 | 6 |
| `/settings` | 3 | 5 |
| `/collection` | 3 | 4 |
| `/collection/col-msjkro33-0` | 1 | 1 |
| `/card/:n` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 31 | 5 |
| Session started (`session.start`) | 20 | 13 |
| Account created (`account.created`) | 4 | 1 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |
| Added cards (`card.add`) | 1 | 1 |

Instrumentation: 16/19 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `trial.start`, `cap.gate_dismissed`, `trial.start_failed`

Works, but not yet from a real user: `auth.login`, `scan.capture`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `pro.offer_shown`, `cap.gate_shown`, `scan.failed`

## Doggle

56 sessions · 151 events · 1 account + 65 guests · median session 1s
Excluded: 76 sessions, 394 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 6 | 16 | 6 |
| 7d | 16 | 37 | 17 |
| 14d | 37 | 92 | 38 |
| 30d | 56 | 151 | 66 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **65** Arrived signed out (100% of top)
- **55** Viewed any screen (84.6% of top)
- **1** Created an account (1.5% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `test_doggle_qr` (qr · print) | 1 | 1 | 0 | 0 |

### What guests did past the open

65 people opened as a guest across 55 sessions.

| How far they got | People | of 65 |
| --- | ---: | ---: |
| Opened and left | 7 | 10.8% |
| Looked at a page or two | 56 | 86.2% |
| Wandered the site | 2 | 3.1% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| session.check (`session.check`) | 27 | 27 |
| Account created (`account.created`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 41 | 41 |
| `Login` | 15 | 18 |
| `Walk` | 1 | 1 |
| `DogProfile` | 1 | 1 |
| `Profile` | 1 | 1 |
| `Home` | 1 | 1 |
| `Settings` | 1 | 1 |
| `WalkDetail` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 67 | 56 |
| Session started (`session.start`) | 56 | 50 |
| session.check (`session.check`) | 27 | 27 |
| Account created (`account.created`) | 1 | 1 |

Instrumentation: 4/4 events verified firing (all traffic, all time).

Works, but not yet from a real user: `auth.login`

## Pickleague

20 sessions · 50 events · 0 accounts + 13 guests · median session 1s
Excluded: 33 sessions, 262 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 2 | 9 | 2 |
| 14d | 14 | 35 | 7 |
| 30d | 20 | 50 | 13 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **13** Arrived signed out (100% of top)
- **12** Viewed any screen (92.3% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

13 people opened as a guest across 14 sessions.

| How far they got | People | of 13 |
| --- | ---: | ---: |
| Opened and left | 1 | 7.7% |
| Looked at a page or two | 8 | 61.5% |
| Wandered the site | 4 | 30.8% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Signed in (`auth.login`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 10 | 18 |
| `EventDetail` | 2 | 7 |
| `Register` | 1 | 2 |
| `GuestJoin` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 28 | 12 |
| Session started (`session.start`) | 21 | 10 |
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

### The two emitters have stopped being mirrors at the cap gates `tcgscan_cap_gate_parity` (medium, specced)

AGENTS.md in ../tcgscan requires michi-maker/src/lib/analytics.ts and tcgscan-app/src/lib/analytics.ts to differ only in APP, the storage key and michi's Json cast, on the stated grounds that a gap closed in one app is worse than the gap. Since 2026-08-27 they differ in more: michi's cap.gate_shown carries `as` (dialog | toast | inline), `is_guest` and `offer` (trial | upgrade | signin | toast); its cap.gate_dismissed takes an object with `via` (not_now | close | navigate) rather than two positional args; and it emits trial.start_click plus a trial.start_failed that carries surface and a refused/rpc_error reason. tcgscan-app has none of it, and its cap gates still route through lib/gate-prompt.ts rather than a useCapGate.

**Effect:** any cross-app cap or trial comparison silently compares a segmented michi against an unsegmented tcgscan; every michi-only prop reads as absent rather than as not-collected

**Fix:** Port the emitter additions verbatim (they are typed optional precisely so the tcgscan copy stays a valid subset), then give tcgscan-app the useCapGate + CapGateDialog pair so its walls are paced and instrumented at one chokepoint instead of nine. Until then, read `as` / `offer` / `via` as michi-only and never as a fleet number.

### No impression event for the PRO trial offer `trial_awareness` (blocking, landed)

TrialCta renders the 'Start free 14-day PRO trial' button but emits nothing until it is pressed, and it returns null for anyone not eligible. The offer also appears outside /plans (michi's PrintPlaceholdersSheet), so a pricing page view neither implies nor is required for seeing it. Awareness is not measured, so the funnel's awareness stage reads zero — that zero is the gap, not a finding. Pricing-page views in the Pages table are the interim proxy, and they are a different and smaller set.

**Effect:** understates awareness — currently makes it unmeasurable

**Fix:** track('pro.offer_shown', { surface }) once per mount on the rendering path only (never the return-null path), plus pro.offer_declined on dismissal and a surface prop on trial.start. Both apps' components/monetization/TrialCta.tsx. Note this counts ELIGIBLE impressions only, which is the right denominator for offer conversion and the wrong one for audience awareness.

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

### Cap gates emit nothing, so upgrade intent is invisible `cap_gates_blind` (blocking, fixed)

Every tier limit in tier_caps can stop a user — binders, pagesPerBinder, artUploads, cardScansPerMonth, collections, cardsPerCollection — and none of them emit an event when they do. The only monetization impression the stream has is pro.offer_shown, which fires from TrialCta; a gate that refuses an action without rendering that button is invisible. Hitting a cap is the highest-intent moment the product has, and it is the one moment the stream cannot see.

**Effect:** understates upgrade intent to exactly zero — every cap hit ever is unrecorded

**Fix:** Emit cap.gate_shown { limit, surface, tier, used, cap } once per gate impression, where `limit` is the tier_caps limit_key verbatim (pagesPerBinder, binders, artUploads, cardScansPerMonth, collections, cardsPerCollection) so it joins to the cap with no lookup table. Emit cap.gate_dismissed { limit, surface } when the user backs out without acting. Where a gate already renders TrialCta, pass the SAME surface string so cap.gate_shown, pro.offer_shown and trial.start share one attribution key and the gate-to-trial funnel is a join rather than a guess. Specced in ../tcgscan/ANALYTICS-CAP-GATES.md.

### landing_route was never written — the update was never sent `landing_route_broken` (high, fixed)

Root cause found and fixed 2026-08-06 (michi-maker e07d2e1, tcgscan-app 7a979a8). Both apps wrote it through a bare `void supabase.from(...).update(...)`. supabase-js returns a PostgrestFilterBuilder, which is a LAZY thenable: it only issues its HTTP request when something calls .then(). `void builder` builds the query and drops it — no request, no error, nothing to catch. The sites that work (touchSession, and the guest-upgrade branch of resetSessionUser) all await, which is exactly why last_seen_at advanced normally while landing_route stayed null on all 91 sessions: same table, same policy, same session, different call shape. flushLastSeen had the identical defect, so the session_end fix was also silently doing nothing on the visibilitychange path. Not permissions: RLS grants authenticated UPDATE on auth.uid() = user_id, column-level UPDATE covers landing_route, and the guard trigger does not touch it.

**Effect:** was: entry point unknown for every session, and session tails understated on tab-hide

**Fix:** FIXED — verified in production 2026-08-08: 30 of the 58 sessions started in the preceding 48h carry a non-null landing_route, where every one of the 91 sessions before the fix was null. The remainder are sessions that never recorded a page.view (landing_route is backfilled from the first one), not a residual failure.

### A guest session is rewritten to look like it never was one `guest_upgrade` (medium, fixed)

The conversion event itself DOES exist: both apps emit account.created with props.via = 'guest_upgrade' (michi store/auth.tsx:309,348; tcgscan store/auth.tsx:198,266,283). What is lost is the session. resetSessionUser() patches analytics_sessions.is_guest in place when a guest signs up mid-session, so the row retroactively claims it was always an account. Sessions cannot be split into 'started as guest' and 'started signed in', and the session-level conversion rate is unrecoverable.

**Effect:** guest-started sessions are undercounted; the conversion count itself is correct

**Fix:** stop mutating is_guest — make it mean 'started as a guest' and add an upgraded_at column set at the transition, guarded by a trigger so a future client cannot regress it.

### A guest who clears storage becomes a new person `guest_device_churn` (medium, fixed)

analytics_sessions has no device column, so identity for an anonymous user is only as durable as the Supabase session in storage. A reload keeps the same anon uid (persistence works - 5 michi anon uids span multiple days, one has 10 sessions), but cleared site data, incognito, a second browser or a reinstall mints a fresh uid with no join key to the old one. Guest counts are therefore an upper bound on guest PEOPLE.

**Effect:** guest people are overstated; every rate with guests in the denominator is understated

**Fix:** add analytics_sessions.device_id - a random opaque UUID generated once at first launch, persisted in localStorage/AsyncStorage, never regenerated on sign-out or upgrade. Specced in ../tcgscan/ANALYTICS-GUEST-DEVICE-ID.md.
