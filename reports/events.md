# Event analytics — last 30 days

Collected 2026-09-04T15:07:32.790Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

530 sessions · 4577 events · 42 accounts + 311 guests · median session 1m
Excluded: 796 sessions, 5963 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 27 | 476 | 24 |
| 7d | 153 | 1751 | 113 |
| 14d | 332 | 3256 | 217 |
| 30d | 530 | 4577 | 353 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **311** of 353 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **42** Signed-in account (100% of top)
- **42** Did anything past the open (100% of top)
- **20** Was shown the PRO offer (47.6% of top) — see gap `trial_awareness`
- **1** Started a PRO trial (2.4% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **11** Was stopped by a plan limit (3.1% of top)
- **2** Was shown the PRO offer (0.6% of top) — see gap `trial_awareness`
- **0** Pressed start (0% of top) — see gap `trial_click_unproven`
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **348** Opened the app (98.6% of top)
- **332** Viewed a page (94.1% of top)
- **9** Tried a demo (2.5% of top)
- **9** Made something real (2.5% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **331** Started as a guest (100% of top)
- **310** Did anything at all (93.7% of top)
- **39** Submitted the upgrade (11.8% of top) — see gap `upgrade_unconfirmed`
- **18** Completed it (ground truth) (5.4% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `299d297d-c1cb-43d6-be4a-cb5e2ce049e6` | 2 | 2 | 0 | 1 |
| `a6d172c4-e566-4b11-bf24-b26a652ba087` | 1 | 1 | 0 | 0 |
| `72baa86b-7204-444f-8ba1-f62c1103b534` | 1 | 1 | 0 | 0 |
| `49bb8d42-bb93-4b2f-9b83-b1d0e58d91eb` | 1 | 1 | 0 | 0 |
| `eacc07d3-89ad-4398-8673-5cecdfd710ce` | 1 | 1 | 0 | 0 |
| `f22d26d7-64e6-4c5a-8d02-dc437d74b45e` | 1 | 1 | 0 | 0 |
| `faed5065-c1d1-45f8-8a78-3494094486ec` | 1 | 1 | 0 | 0 |
| `22bbe2cb-dd7c-438a-aeb2-7ba28717969d` | 1 | 1 | 0 | 0 |
| `cc2788e0-8635-4111-91f1-812e9470b1b8` | 1 | 1 | 0 | 0 |
| `381a0346-5be3-4c17-94f2-5f770338bda2` | 1 | 1 | 0 | 0 |
| `9151b121-450c-4ec0-ae33-a8ff7b194dbd` | 1 | 1 | 0 | 0 |
| `de4df162-8cc0-4fb6-af5f-5b4fe2dfd71d` | 1 | 1 | 0 | 0 |
| `9731ea95-392d-4c73-b355-bc481a6d3dd1` | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `binders` | my_binders | 5 | 4 | _not recorded_ | _not recorded 5_ | _not recorded 5_<br>_trial rendered on 0 of 5_ | _none recorded_ |
| `binders` | browse | 3 | 3 | _not recorded_ | _not recorded 3_ | _not recorded 3_<br>_trial rendered on 0 of 3_ | _none recorded_ |
| `pagesPerBinder` | binder_editor | 3 | 2 | _not recorded_ | _not recorded 3_ | _not recorded 3_<br>_trial rendered on 0 of 3_ | _none recorded_ |
| `findSimilar` | browse | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | close 1 |
| `pagesPerBinder` | browse | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **39** times to **20** people, walked away from **6**, pressed **1**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `plans` | `/plans` 26 | 26 | 16 | 0 | 0 |
| `print_gate` | `/my-binders` 7, `/` 1, `/binder/example-fill-sheet` 1 | 9 | 7 | 5 | 0 |
| `slice_studio` | `/binder/:id` 2 | 2 | 1 | 0 | 1 |
| `my_binders` | `/my-binders` 1 | 1 | 1 | 0 | 0 |
| `trial_recovery` | `/` 1 | 1 | 1 | 1 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 15 | 15 | accepted 3, dismissed 11 _(+1 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 6 | 6 | accepted 5, dismissed 1, abandoned 13 |
| The PRO trial, second chance (`pro-trial-offer`) | 1 | 1 | dismissed 1 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

331 people opened as a guest across 411 sessions.

| How far they got | People | of 331 |
| --- | ---: | ---: |
| Opened and left | 21 | 6.3% |
| Looked at a page or two | 106 | 32% |
| Wandered the site | 101 | 30.5% |
| Built something | 103 | 31.1% |

Of the 103 who built something, **20** created an account.

**44** guests walked to a pricing page; **11** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 103 | 122 |
| Added cards (`card.add`) | 47 | 455 |
| Account created (`account.created`) | 39 | 44 |
| Saw the PRO offer (`pro.offer_shown`) | 11 | 17 |
| Hit a plan limit (`cap.gate_shown`) | 10 | 11 |
| Searched cards (`card.search`) | 8 | 10 |
| Signed in (`auth.login`) | 8 | 8 |
| Was shown a prompt (`prompt.shown`) | 7 | 7 |
| Answered a prompt (`prompt.answered`) | 6 | 6 |
| Dismissed the PRO offer (`pro.offer_declined`) | 3 | 3 |
| Tried the print example (`demo.print`) | 2 | 2 |
| Tried the example import (`demo.csv_import`) | 2 | 2 |
| Tried tri-color search (`demo.tricolor_search`) | 1 | 1 |
| Imported a CSV (`csv.import`) | 1 | 1 |
| demo.theme_search (`demo.theme_search`) | 1 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 275 | 304 |
| `/` | 249 | 570 |
| `/binder/:id` | 128 | 331 |
| `/my-binders` | 113 | 310 |
| `/michi-method` | 57 | 79 |
| `/discover` | 52 | 78 |
| `/browse` | 47 | 69 |
| `/learn` | 40 | 52 |
| `/plans` _(pricing)_ | 36 | 47 |
| `/contest` | 24 | 33 |
| `/purchases` _(pricing)_ | 14 | 20 |
| `/binder/ex-pitch-black-chase` | 13 | 13 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 2542 | 332 |
| Added cards (`card.add`) | 1145 | 58 |
| Session started (`session.start`) | 524 | 348 |
| Created a binder (`binder.add`) | 147 | 118 |
| Account created (`account.created`) | 44 | 39 |
| Saw the PRO offer (`pro.offer_shown`) | 39 | 20 |
| Signed in (`auth.login`) | 34 | 27 |
| Answered a prompt (`prompt.answered`) | 34 | 16 |
| Was shown a prompt (`prompt.shown`) | 22 | 16 |
| Hit a plan limit (`cap.gate_shown`) | 13 | 11 |
| Searched cards (`card.search`) | 12 | 10 |
| Tried the example import (`demo.csv_import`) | 6 | 6 |
| Dismissed the PRO offer (`pro.offer_declined`) | 6 | 5 |
| Tried the print example (`demo.print`) | 2 | 2 |
| demo.theme_search (`demo.theme_search`) | 2 | 2 |
| Tried tri-color search (`demo.tricolor_search`) | 1 | 1 |
| Imported a CSV (`csv.import`) | 1 | 1 |
| Pressed the PRO trial button (`trial.start_click`) | 1 | 1 |
| Started a PRO trial (`trial.start`) | 1 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |

Instrumentation: 22/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `csv.import_failed`, `search.no_results`

Works, but not yet from a real user: `demo.curation`, `compose.pages_kept`, `trial.start_failed`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

22 sessions · 64 events · 0 accounts + 14 guests · median session 4s
Excluded: 565 sessions, 7298 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 1 | 6 | 1 |
| 14d | 6 | 18 | 2 |
| 30d | 22 | 64 | 14 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **14** of 14 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **0** Signed-in account
- **0** Did anything past the open
- **0** Was shown the PRO offer — see gap `trial_awareness`
- **0** Started a PRO trial

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **14** Opened the app (100% of top)
- **6** Viewed a page (42.9% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **14** Started as a guest (100% of top)
- **6** Did anything at all (42.9% of top)
- **1** Submitted the upgrade (7.1% of top) — see gap `upgrade_unconfirmed`
- **0** Completed it (ground truth) (0% of top)

### What guests did past the open

14 people opened as a guest across 22 sessions.

| How far they got | People | of 14 |
| --- | ---: | ---: |
| Opened and left | 8 | 57.1% |
| Looked at a page or two | 1 | 7.1% |
| Wandered the site | 4 | 28.6% |
| Built something | 1 | 7.1% |

Of the 1 who built something, **0** created an account.

| Guest action | People | Times |
| --- | ---: | ---: |
| Account created (`account.created`) | 1 | 4 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |
| Added cards (`card.add`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 5 | 6 |
| `/scan` | 4 | 9 |
| `/browse` | 4 | 8 |
| `/settings` | 4 | 6 |
| `/collection` | 4 | 5 |
| `/collection/col-msjkro33-0` | 1 | 1 |
| `/card/:n` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 36 | 6 |
| Session started (`session.start`) | 21 | 14 |
| Account created (`account.created`) | 4 | 1 |
| Searched cards (`card.search`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |
| Added cards (`card.add`) | 1 | 1 |

Instrumentation: 16/19 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `trial.start`, `cap.gate_dismissed`, `trial.start_failed`

Works, but not yet from a real user: `auth.login`, `scan.capture`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `pro.offer_shown`, `cap.gate_shown`, `scan.failed`

## Doggle

85 sessions · 303 events · 3 accounts + 81 guests · median session 1s
Excluded: 134 sessions, 789 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 16 | 67 | 10 |
| 7d | 38 | 174 | 27 |
| 14d | 51 | 204 | 41 |
| 30d | 85 | 303 | 84 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **83** Arrived signed out (100% of top)
- **70** Viewed any screen (84.3% of top)
- **3** Created an account (3.6% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `test_doggle_qr` (qr · print) | 1 | 1 | 0 | 0 |

### What guests did past the open

83 people opened as a guest across 84 sessions.

| How far they got | People | of 83 |
| --- | ---: | ---: |
| Opened and left | 8 | 9.6% |
| Looked at a page or two | 68 | 81.9% |
| Wandered the site | 7 | 8.4% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| session.check (`session.check`) | 42 | 103 |
| Account created (`account.created`) | 3 | 4 |
| auth.signout_decision (`auth.signout_decision`) | 2 | 3 |
| session.expired (`session.expired`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 46 | 46 |
| `Login` | 25 | 39 |
| `Home` | 3 | 6 |
| `Settings` | 3 | 3 |
| `InviteLanding` | 2 | 3 |
| `DogProfile` | 2 | 2 |
| `Profile` | 2 | 2 |
| `Onboarding` | 2 | 2 |
| `Walk` | 1 | 1 |
| `WalkDetail` | 1 | 1 |
| `Mail` | 1 | 1 |
| `PetHome` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 109 | 71 |
| session.check (`session.check`) | 103 | 42 |
| Session started (`session.start`) | 83 | 63 |
| Account created (`account.created`) | 4 | 3 |
| auth.signout_decision (`auth.signout_decision`) | 3 | 2 |
| session.expired (`session.expired`) | 1 | 1 |

Instrumentation: 4/4 events verified firing (all traffic, all time).

Works, but not yet from a real user: `auth.login`

## Pickleague

36 sessions · 91 events · 0 accounts + 21 guests · median session 4s
Excluded: 80 sessions, 501 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 8 | 14 | 2 |
| 7d | 16 | 41 | 9 |
| 14d | 24 | 62 | 14 |
| 30d | 36 | 91 | 21 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **21** Arrived signed out (100% of top)
- **19** Viewed any screen (90.5% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

21 people opened as a guest across 30 sessions.

| How far they got | People | of 21 |
| --- | ---: | ---: |
| Opened and left | 2 | 9.5% |
| Looked at a page or two | 13 | 61.9% |
| Wandered the site | 6 | 28.6% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Signed in (`auth.login`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 17 | 39 |
| `Register` | 2 | 8 |
| `EventDetail` | 2 | 7 |
| `GuestJoin` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 55 | 19 |
| Session started (`session.start`) | 35 | 17 |
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

### trial.start_click is shipped but has never fired `trial_click_unproven` (important, landed)

Until 2026-08-31 a press of the trial button left nothing behind unless the RPC answered: 'they never pressed' and 'they pressed and it did not come back' were the same silence (the failure class trial_start_dropped was written about). trackTrialStartClick now fires before the RPC in both TrialCta call paths, but the build carrying it reached production on 2026-08-31 19:23 UTC - dated by the first cap.gate_shown row carrying the `offer` prop, which shipped in the same change. So the 'Pressed start' stage has about a day of coverage and has never recorded a row.

**Effect:** the stage cannot yet distinguish 'nobody pressed' from 'we were not watching'. Read the OUTCOME from ground truth instead, which does not have this hole

**Fix:** Nothing to build - wait for traffic. Promote to fixed on the first observed trial.start_click. A continued zero once the stage has a few weeks behind it IS a finding, and a strong one, because the outcome it would explain is already established below.

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
