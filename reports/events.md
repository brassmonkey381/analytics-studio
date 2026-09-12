# Event analytics — last 30 days

Collected 2026-09-12T19:03:57.628Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

705 sessions · 7009 events · 55 accounts + 389 guests · median session 1m
Excluded: 1011 sessions, 9382 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 36 | 510 | 26 |
| 7d | 210 | 2436 | 137 |
| 14d | 394 | 4519 | 253 |
| 30d | 705 | 7009 | 444 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **389** of 444 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **55** Signed-in account (100% of top)
- **55** Did anything past the open (100% of top)
- **30** Was shown the PRO offer (54.5% of top)
- **4** Started a PRO trial (7.3% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **22** Was stopped by a plan limit (5% of top)
- **9** Was shown the PRO offer (2% of top)
- **2** Pressed start (0.5% of top)
- **2** Started a PRO trial (0.5% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **438** Opened the app (98.6% of top)
- **431** Viewed a page (97.1% of top)
- **14** Tried a demo (3.2% of top)
- **14** Made something real (3.2% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **414** Started as a guest (100% of top)
- **401** Did anything at all (96.9% of top)
- **58** Submitted the upgrade (14% of top) — see gap `upgrade_unconfirmed`
- **23** Completed it (ground truth) (5.6% of top)

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
| `ea83ff10-9acd-43f5-9ad6-a5c1d66b09d0` | 1 | 1 | 0 | 0 |
| `159f1618-33c4-4a43-943c-fc19b8a99970` | 1 | 1 | 0 | 0 |
| `08953ab2-c522-4d8c-8014-b1867e1faad4` | 1 | 1 | 0 | 0 |
| `07fc1a10-825e-4777-8be5-2cb5c976dd97` | 1 | 1 | 0 | 0 |
| `38cc7ac0-4602-4f50-9cb4-9616856b1a65` | 1 | 1 | 0 | 0 |
| `0e6d9e65-9e0f-4168-ac35-ba5103001a6f` | 1 | 1 | 0 | 0 |
| `16dcefb0-9a57-4421-a5d8-113708cca442` | 1 | 1 | 0 | 0 |
| `5a162cf9-59cc-436b-939e-aecbcaf4fe00` | 1 | 1 | 0 | 0 |
| `f5f8c2f8-e316-4456-8bdd-e8e7d06eea5a` | 1 | 1 | 0 | 0 |
| `d78b6049-acb9-48ca-b36a-daaefba35e73` | 1 | 1 | 0 | 0 |
| `6d06e1e3-5ec3-4221-a7ad-8c581f10f25c` | 1 | 1 | 0 | 0 |
| `3be00d93-86c9-4294-a03c-4c0aa98e5975` | 1 | 1 | 0 | 0 |
| `9c773823-ea9d-4e56-994c-4953ffd31358` | 1 | 1 | 0 | 0 |
| `b385ddb2-d99a-45f7-9fed-3bf03ad2e7d9` | 1 | 1 | 0 | 0 |
| `4159da30-3b2c-4e11-932b-cbc807b4b787` | 1 | 1 | 0 | 0 |
| `22123b3d-a15c-43dd-957c-2255112b41be` | 1 | 1 | 0 | 0 |
| `23be02d5-1cb6-4be8-968a-b430978bc477` | 1 | 1 | 0 | 0 |
| `01d8315e-38a4-431e-be6d-f9367e930df9` | 1 | 1 | 0 | 0 |
| `945d1952-bce7-44b7-9ac9-94deb3aec9e4` | 1 | 1 | 0 | 0 |
| `f6e806f5-95ff-4ead-bc9e-2d92f463b8ba` | 1 | 1 | 0 | 0 |
| `2677c484-189e-4ccf-83fe-d117f8ea4bac` | 1 | 1 | 0 | 0 |
| `7b7772d0-25e9-4543-88a7-17f5b2b8fb5b` | 1 | 0 | 0 | 1 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `findSimilar` | binder_editor | 25 | 9 | 4 | dialog 12, toast 13 | trial 8, signin 4, toast 13<br>_trial rendered on 8 of 25_ | not_now 4, close 7 |
| `binders` | my_binders | 7 | 6 | 1 | dialog 2, _not recorded 5_ | trial 1, signin 1, _not recorded 5_<br>_trial rendered on 1 of 7_ | close 2 |
| `pagesPerBinder` | binder_editor | 4 | 3 | 1 | dialog 1, _not recorded 3_ | signin 1, _not recorded 3_<br>_trial rendered on 0 of 4_ | _none recorded_ |
| `themeSearch` | binder_editor | 3 | 2 | 0 | dialog 3 | trial 3<br>_trial rendered on 3 of 3_ | not_now 1, close 2 |
| `findSimilar` | browse | 2 | 2 | 1 | dialog 2 | trial 1, signin 1<br>_trial rendered on 1 of 2_ | close 2 |
| `binders` | browse | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `pagesPerBinder` | browse | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **102** times to **30** people, walked away from **31**, pressed **4**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `plans` | `/plans` 30 | 30 | 19 | 0 | 0 |
| `my_binders` | `/my-binders` 25, `/binder/:id` 2 | 27 | 4 | 1 | 0 |
| `print_gate` | `/my-binders` 10, `/binder/:id` 9, `/binder/example-fill-sheet` 3, `/auth-callback` 1 | 23 | 13 | 17 | 1 |
| `binder_editor` | `/binder/:id` 7, `/my-binders` 4 | 11 | 6 | 10 | 1 |
| `slice_studio` | `/binder/:id` 4, `/my-binders` 4 | 8 | 2 | 0 | 2 |
| `trial_recovery` | `/` 2 | 2 | 2 | 2 | 0 |
| `browse` | `/browse` 1 | 1 | 1 | 1 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 36 | 32 | accepted 10, dismissed 23 _(+3 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 11 | 11 | accepted 9, declined 1, dismissed 1, abandoned 14 |
| The PRO trial, second chance (`pro-trial-offer`) | 2 | 2 | dismissed 2 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

414 people opened as a guest across 520 sessions.

| How far they got | People | of 414 |
| --- | ---: | ---: |
| Opened and left | 13 | 3.1% |
| Looked at a page or two | 132 | 31.9% |
| Wandered the site | 148 | 35.7% |
| Built something | 121 | 29.2% |

Of the 121 who built something, **25** created an account.

**50** guests walked to a pricing page; **16** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 121 | 145 |
| Added cards (`card.add`) | 62 | 821 |
| Account created (`account.created`) | 58 | 64 |
| Tried the theme search demo (`demo.theme_search`) | 17 | 34 |
| Hit a plan limit (`cap.gate_shown`) | 17 | 24 |
| Saw the PRO offer (`pro.offer_shown`) | 16 | 48 |
| Was shown a prompt (`prompt.shown`) | 14 | 17 |
| Answered a prompt (`prompt.answered`) | 13 | 16 |
| Signed in (`auth.login`) | 13 | 13 |
| Reached a walkthrough step (`walkthrough.step`) | 10 | 23 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 10 | 12 |
| Backed out of a limit (`cap.gate_dismissed`) | 9 | 9 |
| Dismissed the PRO offer (`pro.offer_declined`) | 7 | 8 |
| Searched cards (`card.search`) | 6 | 8 |
| Finished or dismissed the walkthrough (`walkthrough.done`) | 6 | 7 |
| Followed the TCGScan pairing pitch (`tcgscan.pairing_click`) | 4 | 12 |
| Tried the example import (`demo.csv_import`) | 3 | 5 |
| Tried tri-color search (`demo.tricolor_search`) | 2 | 2 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Imported a CSV (`csv.import`) | 1 | 1 |
| Pressed the PRO trial button (`trial.start_click`) | 1 | 1 |
| Started a PRO trial (`trial.start`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 369 | 422 |
| `/` | 336 | 861 |
| `/binder/:id` | 165 | 456 |
| `/my-binders` | 142 | 411 |
| `/michi-method` | 80 | 115 |
| `/discover` | 65 | 101 |
| `/browse` | 56 | 85 |
| `/learn` | 46 | 55 |
| `/plans` _(pricing)_ | 42 | 52 |
| `/contest` | 27 | 32 |
| `/binder/ex-pitch-black-chase` | 16 | 16 |
| `/purchases` _(pricing)_ | 14 | 21 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 3547 | 431 |
| Added cards (`card.add`) | 1983 | 79 |
| Session started (`session.start`) | 699 | 438 |
| Created a binder (`binder.add`) | 184 | 145 |
| Saw the PRO offer (`pro.offer_shown`) | 102 | 30 |
| Tried the theme search demo (`demo.theme_search`) | 70 | 24 |
| Account created (`account.created`) | 64 | 58 |
| Answered a prompt (`prompt.answered`) | 60 | 33 |
| Signed in (`auth.login`) | 57 | 41 |
| Was shown a prompt (`prompt.shown`) | 49 | 33 |
| Hit a plan limit (`cap.gate_shown`) | 43 | 22 |
| Dismissed the PRO offer (`pro.offer_declined`) | 31 | 16 |
| Reached a walkthrough step (`walkthrough.step`) | 27 | 12 |
| Backed out of a limit (`cap.gate_dismissed`) | 18 | 13 |
| Followed the TCGScan pairing pitch (`tcgscan.pairing_click`) | 15 | 5 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 15 | 12 |
| Searched cards (`card.search`) | 10 | 8 |
| Tried the example import (`demo.csv_import`) | 10 | 8 |
| Finished or dismissed the walkthrough (`walkthrough.done`) | 9 | 8 |
| Tried tri-color search (`demo.tricolor_search`) | 4 | 4 |
| Pressed the PRO trial button (`trial.start_click`) | 4 | 4 |
| Started a PRO trial (`trial.start`) | 4 | 4 |
| Tried the print example (`demo.print`) | 3 | 2 |
| Imported a CSV (`csv.import`) | 1 | 1 |

Instrumentation: 29/31 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `csv.import_failed`, `search.no_results`

Works, but not yet from a real user: `demo.curation`, `compose.pages_kept`, `trial.start_failed`, `binder.rebuild_from_tcgscan`, `story.build`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

49 sessions · 326 events · 4 accounts + 16 guests · median session 9s
Excluded: 799 sessions, 11499 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 23 | 189 | 6 |
| 7d | 35 | 286 | 13 |
| 14d | 37 | 301 | 15 |
| 30d | 49 | 326 | 20 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **16** of 20 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **4** Signed-in account (100% of top)
- **4** Did anything past the open (100% of top)
- **1** Was shown the PRO offer (25% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **19** Opened the app (95% of top)
- **16** Viewed a page (80% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **19** Started as a guest (100% of top)
- **16** Did anything at all (84.2% of top)
- **3** Submitted the upgrade (15.8% of top) — see gap `upgrade_unconfirmed`
- **3** Completed it (ground truth) (15.8% of top)

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `cardsPerCollection` | scan | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **4** times to **1** person, walked away from **0**, pressed **0**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `plans` | `/plans` 4 | 4 | 1 | 0 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

### What guests did past the open

19 people opened as a guest across 33 sessions.

| How far they got | People | of 19 |
| --- | ---: | ---: |
| Opened and left | 3 | 15.8% |
| Looked at a page or two | 7 | 36.8% |
| Wandered the site | 6 | 31.6% |
| Built something | 3 | 15.8% |

Of the 3 who built something, **1** created an account.

**1** guests walked to a pricing page; **1** saw the PRO offer.

| Guest action | People | Times |
| --- | ---: | ---: |
| Added cards (`card.add`) | 3 | 5 |
| Account created (`account.created`) | 3 | 5 |
| Created a collection (`collection.create`) | 2 | 2 |
| Scanned a card (`scan.capture`) | 1 | 6 |
| Added a card to a collection (`collection.card_add`) | 1 | 4 |
| Saw the PRO offer (`pro.offer_shown`) | 1 | 4 |
| Removed a card from a collection (`collection.card_remove`) | 1 | 3 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 12 | 28 |
| `/` | 11 | 56 |
| `/browse` | 5 | 13 |
| `/collection` | 4 | 39 |
| `/scan` | 4 | 26 |
| `/settings` | 4 | 19 |
| `/collection/col-mtxst7cv-0` | 1 | 10 |
| `/plans` _(pricing)_ | 1 | 5 |
| `/storage/stg-mtxykbr6-4` | 1 | 3 |
| `/card/:n` | 1 | 1 |
| `/storage/stg-mtxyhmrk-3` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 212 | 17 |
| Session started (`session.start`) | 48 | 19 |
| Added a card to a collection (`collection.card_add`) | 35 | 2 |
| Scanned a card (`scan.capture`) | 6 | 1 |
| Added cards (`card.add`) | 5 | 3 |
| Account created (`account.created`) | 5 | 3 |
| Created a collection (`collection.create`) | 4 | 3 |
| Saw the PRO offer (`pro.offer_shown`) | 4 | 1 |
| Removed a card from a collection (`collection.card_remove`) | 3 | 1 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 1 |
| Signed in (`auth.login`) | 1 | 1 |
| Opened a card (`card.open`) | 1 | 1 |
| Renamed a collection (`collection.rename`) | 1 | 1 |

Instrumentation: 17/19 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `cap.gate_dismissed`, `trial.start_failed`

Works, but not yet from a real user: `card.search`, `collection.delete`, `trial.start`, `scan.failed`

## Doggle

115 sessions · 452 events · 5 accounts + 108 guests · median session 1s
Excluded: 169 sessions, 975 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 7 | 48 | 3 |
| 7d | 26 | 137 | 26 |
| 14d | 66 | 317 | 55 |
| 30d | 115 | 452 | 113 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **112** Arrived signed out (100% of top)
- **94** Viewed any screen (83.9% of top)
- **3** Created an account (2.7% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `verify_launch_qr` | 4 | 4 | 0 | 0 |
| `test_doggle_qr` (qr · print) | 1 | 1 | 0 | 0 |

### What guests did past the open

112 people opened as a guest across 112 sessions.

| How far they got | People | of 112 |
| --- | ---: | ---: |
| Opened and left | 10 | 8.9% |
| Looked at a page or two | 92 | 82.1% |
| Wandered the site | 10 | 8.9% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 68 | 144 |
| Account created (`account.created`) | 3 | 4 |
| Answered the sign-out prompt (`auth.signout_decision`) | 2 | 3 |
| Session expired (`session.expired`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 67 | 69 |
| `Login` | 29 | 46 |
| `Home` | 5 | 28 |
| `Settings` | 4 | 4 |
| `Onboarding` | 4 | 4 |
| `PetHome` | 3 | 5 |
| `Profile` | 3 | 3 |
| `Mail` | 3 | 3 |
| `Blog` | 2 | 6 |
| `InviteLanding` | 2 | 3 |
| `DogProfile` | 2 | 2 |
| `BlogPost` | 1 | 4 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 188 | 95 |
| Session revalidated (plumbing) (`session.check`) | 145 | 69 |
| Session started (`session.start`) | 111 | 86 |
| Account created (`account.created`) | 4 | 3 |
| Answered the sign-out prompt (`auth.signout_decision`) | 3 | 2 |
| Session expired (`session.expired`) | 1 | 1 |

Instrumentation: 9/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `prompt.shown`, `prompt.answered`, `push.permission_requested`, `push.permission_result`, `push.token_registered`, `push.opened`, `location.permission_requested`, `location.permission_result`, `walk.start`, `walk.end`, `walk.cancel`, `checkin.create`, `checkin.out`, `checkin.failed`, `discover.tab`

Works, but not yet from a real user: `auth.login`, `session.recovered`, `session.unreachable`

## Pickleague

33 sessions · 81 events · 0 accounts + 27 guests · median session 4s
Excluded: 96 sessions, 631 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 0 | 1 |
| 7d | 4 | 2 | 4 |
| 14d | 20 | 43 | 13 |
| 30d | 33 | 81 | 27 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **27** Arrived signed out (100% of top)
- **20** Viewed any screen (74.1% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

27 people opened as a guest across 33 sessions.

| How far they got | People | of 27 |
| --- | ---: | ---: |
| Opened and left | 7 | 25.9% |
| Looked at a page or two | 15 | 55.6% |
| Wandered the site | 5 | 18.5% |
| Built something | 0 | 0% |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 18 | 40 |
| `Register` | 2 | 8 |
| `GuestJoin` | 1 | 1 |
| `EventDetail` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 50 | 20 |
| Session started (`session.start`) | 31 | 19 |

Instrumentation: 3/4 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `account.created`

Works, but not yet from a real user: `auth.login`

## Tracking gaps

### The binder editor emits nothing about editing `binder_editor_blind` (blocking, open)

src/components/binder/ has exactly two track() calls - demo.print and demo.tricolor_search, both upsells. There is no event for entering edit mode, pressing a pocket, opening or closing the cards dock, typing in its search box, or starting a drag that never lands. The workbench is the product and the stream cannot see any of it. Measured cost: 136 single-sitting sessions in which a binder was created averaged 15 minutes long with 6 minutes of silence at the end, and 56 of them (41%) went over a minute with the session alive and nothing recorded.

**Effect:** makes every 'why did they stop' question unanswerable from the stream - the 69 people who made a binder and never added a card have an event history of page.view, session.start and binder.add, and nothing else

**Fix:** Emit binder.slot_press { filled }, dock.open / dock.close { tab, fit }, card.search from the dock's own box (michi's only search event is search.no_results, and it fires from ColorSearchSheet, not the main box - see tcgscan_search_blind), and a drag that starts without landing. The walkthrough shipped 2026-09-10 covers the teaching half of this; it does not make the editor observable.

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

### Doggle and Pickleague emitted nothing about the product `doggle_product_blind` (blocking, landed)

Both native apps declared exactly four event names - session.start, page.view, auth.login, account.created - which is auth and navigation plumbing and no product at all. Over the 30 days to 2026-09-04 doggle's own tables recorded 132 points_ledger rows across 16 people, 31 dog_place_checkins across 5, 17 walks across 5, 6 badges and 4 dogs; the stream saw three accounts and no actions. Every 'why did they stop' question was unanswerable, and the coverage panel read 100% throughout because coverage is fired/declared and almost nothing was declared.

**Effect:** understated every behavioural question about doggle to nothing - the app looked fully instrumented while reporting no behaviour

**Fix:** Landed 2026-09-04 in doggle/app: prompt.shown / prompt.answered (the michi vocabulary verbatim, so the existing asks rollup reads them), push permission + token + open, location permission by scope, walk start/end/cancel, checkin create/out/failed, and discover.tab. Promote to fixed on the first observed row of each family, not on the code reading correctly - that is the mistake trial_awareness made.

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

### No impression event for the PRO trial offer `trial_awareness` (blocking, fixed)

TrialCta renders the 'Start free 14-day PRO trial' button but emits nothing until it is pressed, and it returns null for anyone not eligible. The offer also appears outside /plans (michi's PrintPlaceholdersSheet), so a pricing page view neither implies nor is required for seeing it. Awareness is not measured, so the funnel's awareness stage reads zero — that zero is the gap, not a finding. Pricing-page views in the Pages table are the interim proxy, and they are a different and smaller set.

**Effect:** understates awareness — currently makes it unmeasurable

**Fix:** track('pro.offer_shown', { surface }) once per mount on the rendering path only (never the return-null path), plus pro.offer_declined on dismissal and a surface prop on trial.start. Both apps' components/monetization/TrialCta.tsx. Note this counts ELIGIBLE impressions only, which is the right denominator for offer conversion and the wrong one for audience awareness.

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

### trial.start_click is shipped but has never fired `trial_click_unproven` (important, fixed)

Until 2026-08-31 a press of the trial button left nothing behind unless the RPC answered: 'they never pressed' and 'they pressed and it did not come back' were the same silence (the failure class trial_start_dropped was written about). trackTrialStartClick now fires before the RPC in both TrialCta call paths, but the build carrying it reached production on 2026-08-31 19:23 UTC - dated by the first cap.gate_shown row carrying the `offer` prop, which shipped in the same change. So the 'Pressed start' stage has about a day of coverage and has never recorded a row.

**Effect:** the stage cannot yet distinguish 'nobody pressed' from 'we were not watching'. Read the OUTCOME from ground truth instead, which does not have this hole

**Fix:** Nothing to build - wait for traffic. Promote to fixed on the first observed trial.start_click. A continued zero once the stage has a few weeks behind it IS a finding, and a strong one, because the outcome it would explain is already established below.
