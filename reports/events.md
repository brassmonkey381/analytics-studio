# Event analytics — last 30 days

Collected 2026-10-09T16:24:55.358Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

1216 sessions · 18618 events · 92 accounts + 508 guests · median session 1m
Excluded: 734 sessions, 6575 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 26 | 284 | 19 |
| 7d | 272 | 2638 | 146 |
| 14d | 570 | 6939 | 277 |
| 30d | 1216 | 18618 | 600 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **508** of 600 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **92** Signed-in account (100% of top)
- **91** Did anything past the open (98.9% of top)
- **69** Was shown the PRO offer (75% of top)
- **16** Started a PRO trial (17.4% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **96** Was stopped by a plan limit (16% of top)
- **41** Was shown the PRO offer (6.8% of top)
- **10** Pressed start (1.7% of top)
- **10** Started a PRO trial (1.7% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **597** Opened the app (99.5% of top)
- **595** Viewed a page (99.2% of top)
- **22** Tried a demo (3.7% of top)
- **20** Made something real (3.3% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **548** Started as a guest (100% of top)
- **544** Did anything at all (99.3% of top)
- **93** Submitted the upgrade (17% of top) — see gap `upgrade_unconfirmed`
- **40** Completed it (ground truth) (7.3% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `23be02d5-1cb6-4be8-968a-b430978bc477` | 1 | 1 | 0 | 0 |
| `01d8315e-38a4-431e-be6d-f9367e930df9` | 1 | 1 | 0 | 0 |
| `945d1952-bce7-44b7-9ac9-94deb3aec9e4` | 1 | 1 | 0 | 0 |
| `f6e806f5-95ff-4ead-bc9e-2d92f463b8ba` | 1 | 1 | 0 | 0 |
| `2677c484-189e-4ccf-83fe-d117f8ea4bac` | 1 | 1 | 0 | 0 |
| `d0f0c96e-9503-40a6-9238-13c46ba5dd4f` | 1 | 1 | 0 | 0 |
| `8aa0957a-fb75-4828-b6bc-c5914429a25d` | 1 | 1 | 0 | 0 |
| `7bf1f3e9-dd92-477e-80e4-d6f229c32821` | 1 | 1 | 0 | 0 |
| `598b7880-56a5-4c22-970f-fdc81d49a12a` | 1 | 1 | 0 | 0 |
| `653fb409-cbb8-4bed-b6dc-076bc0ebf597` | 1 | 1 | 0 | 0 |
| `812d0537-b46a-45a0-ba8f-7f9a8495bf2b` | 1 | 1 | 0 | 0 |
| `0bb0dea8-0e4d-42e8-a8d5-f91eb373693b` | 1 | 1 | 0 | 0 |
| `be21af03-3a63-41a1-a4f3-7a51c4532587` | 1 | 1 | 0 | 0 |
| `711ff702-6ba9-46d1-8d8d-70babd0ad530` | 1 | 1 | 0 | 0 |
| `f30d2164-efc9-4219-81e1-5960c0ca9a4f` | 1 | 1 | 0 | 0 |
| `eabd4da3-9dc6-467b-b527-c3f1d05f3e4f` | 1 | 1 | 0 | 0 |
| `c9df78b1-3c4c-4480-b677-b8fc5c0713ee` | 1 | 1 | 1 | 0 |
| `335bd3c4-5e96-43f3-b915-26007fff0cb6` | 1 | 1 | 0 | 0 |
| `32faff15-7b09-4fa0-9263-36c2f8b4a93a` | 1 | 1 | 0 | 0 |
| `14bf021b-045c-4575-8d38-272b85a79922` | 1 | 1 | 0 | 0 |
| `d89c1090-73e8-4bf6-ae28-7d686ff7a4b3` | 1 | 1 | 0 | 0 |
| `5ecba5d1-8e35-4c7d-9a6e-e17c2831c41d` | 1 | 1 | 0 | 0 |
| `2a8d0348-ac35-4420-b0c8-9a27f7f90590` | 1 | 1 | 0 | 0 |
| `3f889f5f-8b8a-439b-aac9-4f531985202a` | 1 | 1 | 0 | 0 |
| `1eedf2a2-8d68-4722-a98c-8b1b66f9f73d` | 1 | 1 | 0 | 0 |
| `14319b25-2892-4214-9614-5155b51c0890` | 1 | 1 | 0 | 0 |
| `a2715249-9bf4-44a9-b1ae-79910e3d216e` | 1 | 1 | 0 | 0 |
| `14eeaf28-ff65-4236-aefd-2d99c5298e67` | 1 | 1 | 0 | 0 |
| `91a11ca2-1a00-4214-8661-93c138b7a75d` | 1 | 1 | 0 | 0 |
| `4e1c5e91-98ec-431c-ac97-27134a7a2875` | 1 | 1 | 0 | 0 |
| `325baed6-93a9-4e15-bb43-a961d1d3e533` | 1 | 1 | 0 | 0 |
| `65c49b8c-7239-43a8-a6b8-b55dc9243004` | 1 | 1 | 0 | 0 |
| `208d7060-4d34-4586-b67c-abe439ea1832` | 1 | 1 | 0 | 0 |
| `375e9741-2cbf-40c2-a881-4e86b7e3fa12` | 1 | 1 | 0 | 0 |
| `1d2c93e6-5a38-41f7-b55b-ac0914c6d467` | 1 | 1 | 0 | 0 |
| `4b3caf74-fac5-47db-9cee-f718233e7f7f` | 1 | 1 | 0 | 0 |
| `081a8fbf-e3cc-44ef-aa9c-a1947b1fb1bd` | 1 | 1 | 0 | 0 |
| `239d3d5e-f9bd-4e71-a7a2-562d548caa32` | 1 | 1 | 0 | 0 |
| `8eaa8128-8952-44b2-bf2c-cf2bb9b20785` | 1 | 1 | 0 | 0 |
| `dc6558c5-8381-47f1-8ecd-9f8f6a5da00e` | 1 | 1 | 0 | 0 |
| `4b5e0388-482c-4a26-8c84-718aac385fb4` | 1 | 1 | 0 | 0 |
| `2308e3f1-f460-48e1-9130-c5084fbae68f` | 1 | 1 | 0 | 0 |
| `01fdacce-97f8-4330-a3fa-78f93cfc3045` | 1 | 1 | 0 | 0 |
| `cf70b3e1-a0a1-4ae1-addc-2a363acc384e` | 1 | 1 | 0 | 0 |
| `f8d85e84-4648-453a-84c5-915274b7f4fb` | 1 | 1 | 0 | 0 |
| `68d561cb-4ffc-4c64-863f-d294c0f0ce7c` | 1 | 1 | 0 | 0 |
| `ce5788f4-883d-4012-b6f7-f23bd5ad1221` | 1 | 1 | 1 | 0 |
| `15701f69-957b-429f-933c-f268176d6807` | 1 | 1 | 1 | 0 |
| `2779e0f7-d851-427a-83e5-cdb4b02401e5` | 1 | 1 | 1 | 0 |
| `f2cb838f-20b9-4373-859a-3fd37989cce7` | 1 | 1 | 0 | 0 |
| `dbd73322-f50c-4d36-a85e-d324638fc5ca` | 1 | 1 | 0 | 0 |
| `19eb1628-1e41-4745-8536-1110518f9503` | 1 | 1 | 0 | 0 |
| `68e01d62-e52f-4a22-bfa8-ce4cb4183a86` | 1 | 1 | 0 | 0 |
| `26f44bae-37fa-4775-b527-c1619ca1c1a5` | 1 | 1 | 0 | 0 |
| `af6509dc-c1ed-4b26-93d9-2fbeeee76d96` | 1 | 1 | 0 | 0 |
| `b8a1f656-7ab9-48f1-821b-5eb591628bab` | 1 | 1 | 0 | 0 |
| `ec23abb4-6035-4354-8000-3d0f214133db` | 1 | 1 | 0 | 0 |
| `ecc9b6c8-6f4e-48a5-beed-cd691f29b28f` | 1 | 1 | 0 | 0 |
| `83cc4629-38fa-450a-b7c4-9eecf1f6ee05` | 1 | 1 | 0 | 0 |
| `2a6d107c-c9a5-4a97-a5f7-0809100a8239` | 1 | 1 | 0 | 0 |
| `0b5cc0ad-a72d-4a73-ae54-3d35d99e6cc5` | 1 | 1 | 0 | 0 |
| `63b344d7-8fb7-4b0e-9bfb-3b4c822b4862` | 1 | 1 | 0 | 0 |
| `188543b7-79a4-4a44-a97b-79524b600f4b` | 1 | 1 | 0 | 0 |
| `7ffd6729-60b5-48f5-94f5-8809a9b62916` | 1 | 1 | 0 | 0 |
| `899adc54-d1c6-4016-9e41-ad6be8bbe7d1` | 1 | 1 | 1 | 0 |
| `6d55a2a2-8270-4f49-ad44-33eae88ddf75` | 1 | 1 | 0 | 0 |
| `6e324f06-3e91-4e8e-bc75-5dfe4423329b` | 1 | 1 | 0 | 0 |
| `d61145be-8ea3-4a01-a437-fadbd05a9f8c` | 1 | 1 | 0 | 0 |
| `66d45577-91bc-4bdb-b10b-b6f3b90f4811` | 1 | 1 | 1 | 0 |
| `dc746d0a-760d-4445-a570-963a656ff7ff` | 1 | 1 | 1 | 0 |
| `3e535cea-f1bf-4b36-a9a2-2166e4bbcdbd` | 1 | 1 | 0 | 0 |
| `c728e8d2-668d-4383-8f74-cb892b019b45` | 1 | 1 | 0 | 0 |
| `5ee3e51d-61c3-4d6f-bad4-a6cdeb86baf8` | 1 | 1 | 0 | 0 |
| `f9b2eaa8-1f0e-41df-9ad9-a04345bbaa13` | 1 | 1 | 0 | 0 |
| `c3c2f0ea-a3ab-41c9-a444-29f4d13ca52c` | 1 | 1 | 0 | 0 |
| `3a4e6be3-36b4-4dfb-82d3-f0529ffc8938` | 1 | 1 | 0 | 0 |
| `78767bd4-1f4f-494b-9135-d222b8989073` | 1 | 1 | 0 | 0 |
| `a23be7e4-c8d3-485a-9e83-4295a338f571` | 1 | 1 | 0 | 0 |
| `30a5765a-b6fb-4833-9646-2a6613061653` | 1 | 1 | 0 | 0 |
| `42eaf66d-bc61-4437-bb9d-308e6eafd67a` | 1 | 1 | 0 | 0 |
| `7b7772d0-25e9-4543-88a7-17f5b2b8fb5b` | 1 | 0 | 0 | 1 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `findSimilar` | binder_editor | 76 | 39 | 17 | dialog 51, toast 25 | trial 32, upgrade 2, signin 17, toast 25<br>_trial rendered on 28 of 76_ | not_now 24, close 26 |
| `themeSearch` | binder_editor | 71 | 38 | 19 | dialog 71 | trial 40, signin 31<br>_trial rendered on 39 of 71_ | not_now 23, close 47 |
| `themeSearch` | browse | 49 | 27 | 25 | dialog 49 | trial 6, signin 43<br>_trial rendered on 6 of 49_ | not_now 18, close 25 |
| `findSimilar` | browse | 4 | 3 | 3 | dialog 3, toast 1 | signin 3, toast 1<br>_trial rendered on 0 of 4_ | not_now 2, close 1 |
| `pagesPerBinder` | binder_editor | 4 | 2 | 1 | dialog 2, toast 2 | trial 1, signin 1, toast 2<br>_trial rendered on 1 of 4_ | close 1 |
| `binders` | my_binders | 3 | 3 | 1 | dialog 3 | trial 1, upgrade 1, signin 1<br>_trial rendered on 2 of 3_ | not_now 2, close 1 |
| `binders` | browse | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |
| `binders` | build_wizard | 1 | 1 | 1 | inline 1 | signin 1<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `findSimilar` | home | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |
| `pagesPerBinder` | browse | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **942** times to **69** people, walked away from **108**, pressed **16**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `my_binders` | `/my-binders` 462, `/binder/:id` 128, `/purchases` 1, `/` 1 | 592 | 15 | 1 | 0 |
| `slice_studio` | `/binder/:id` 103, `/my-binders` 59, `/` 9, `/browse` 6 | 177 | 17 | 0 | 3 |
| `binder_editor` | `/binder/:id` 55, `/my-binders` 11, `/` 2 | 68 | 31 | 71 | 2 |
| `plans` | `/plans` 45, `/my-binders` 3, `/browse` 2, `/michi-method` 1 | 51 | 28 | 0 | 1 |
| `print_gate` | `/binder/:id` 18, `/my-binders` 18, `/binder/example-fill-sheet` 6, `/` 2, `/auth-callback` 1, `/learn/slice-studio` 1 | 46 | 27 | 31 | 7 |
| `browse` | `/search-guide` 3, `/browse` 3 | 6 | 4 | 3 | 3 |
| `trial_recovery` | `/` 2 | 2 | 2 | 2 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 102 | 80 | accepted 24, dismissed 72, abandoned 2 _(+4 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 27 | 25 | accepted 15, declined 6, dismissed 5, abandoned 33 |
| The PRO trial, second chance (`pro-trial-offer`) | 2 | 2 | dismissed 2 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

548 people opened as a guest across 715 sessions.

| How far they got | People | of 548 |
| --- | ---: | ---: |
| Opened and left | 4 | 0.7% |
| Looked at a page or two | 218 | 39.8% |
| Wandered the site | 188 | 34.3% |
| Built something | 138 | 25.2% |

Of the 138 who built something, **36** created an account.

**60** guests walked to a pricing page; **30** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 135 | 150 |
| Reached a walkthrough step (`walkthrough.step`) | 122 | 287 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 122 | 151 |
| Account created (`account.created`) | 93 | 102 |
| Left the walkthrough (`walkthrough.done`) | 84 | 94 |
| Added cards (`card.add`) | 82 | 1546 |
| Tried the theme search demo (`demo.theme_search`) | 82 | 417 |
| Hit a plan limit (`cap.gate_shown`) | 73 | 140 |
| Backed out of a limit (`cap.gate_dismissed`) | 71 | 118 |
| Was shown a prompt (`prompt.shown`) | 37 | 40 |
| Answered a prompt (`prompt.answered`) | 37 | 40 |
| Saw the PRO offer (`pro.offer_shown`) | 30 | 159 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 19 | 63 |
| Dismissed the PRO offer (`pro.offer_declined`) | 19 | 32 |
| Signed in (`auth.login`) | 18 | 26 |
| Opened the daily puzzle (`puzzle.opened`) | 14 | 17 |
| Searched cards (`card.search`) | 12 | 12 |
| Pressed the PRO trial button (`trial.start_click`) | 9 | 9 |
| Started a PRO trial (`trial.start`) | 9 | 9 |
| Answered the puzzle offer (`puzzle.choice`) | 8 | 8 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 6 | 46 |
| Followed the TCGScan pairing pitch (`tcgscan.pairing_click`) | 6 | 8 |
| Previewed the print sheets (`print.preview`) | 5 | 7 |
| Tried the example import (`demo.csv_import`) | 4 | 10 |
| CSV import failed (`csv.import_failed`) | 3 | 14 |
| Imported a CSV (`csv.import`) | 3 | 4 |
| Opened Stripe Checkout (`offer.checkout_start`) | 3 | 3 |
| Tried tri-color search (`demo.tricolor_search`) | 2 | 4 |
| Opened the feedback form (`feedback.shown`) | 2 | 3 |
| Tried the print example (`demo.print`) | 2 | 2 |
| Solved the daily puzzle (`puzzle.solved`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 415 | 485 |
| `/` | 409 | 1077 |
| `/binder/:id` | 203 | 543 |
| `/my-binders` | 165 | 446 |
| `/browse` | 128 | 212 |
| `/michi-method` | 95 | 161 |
| `/discover` | 87 | 161 |
| `/plans` _(pricing)_ | 52 | 67 |
| `/learn` | 50 | 67 |
| `/search-guide` | 31 | 53 |
| `/auth-callback` | 22 | 30 |
| `/daily` | 20 | 29 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 7404 | 595 |
| Added cards (`card.add`) | 6113 | 120 |
| Session started (`session.start`) | 1196 | 597 |
| Saw the PRO offer (`pro.offer_shown`) | 942 | 69 |
| Tried the theme search demo (`demo.theme_search`) | 605 | 106 |
| Reached a walkthrough step (`walkthrough.step`) | 362 | 156 |
| Created a binder (`binder.add`) | 239 | 176 |
| Hit a plan limit (`cap.gate_shown`) | 211 | 96 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 194 | 156 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 181 | 43 |
| Backed out of a limit (`cap.gate_dismissed`) | 173 | 90 |
| Answered a prompt (`prompt.answered`) | 159 | 84 |
| Was shown a prompt (`prompt.shown`) | 131 | 83 |
| Left the walkthrough (`walkthrough.done`) | 125 | 114 |
| Dismissed the PRO offer (`pro.offer_declined`) | 108 | 46 |
| Signed in (`auth.login`) | 105 | 60 |
| Account created (`account.created`) | 102 | 93 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 63 | 10 |
| Opened the daily puzzle (`puzzle.opened`) | 31 | 21 |
| Searched cards (`card.search`) | 25 | 20 |
| Tried the example import (`demo.csv_import`) | 20 | 9 |
| CSV import failed (`csv.import_failed`) | 18 | 5 |
| Previewed the print sheets (`print.preview`) | 18 | 12 |
| Pressed the PRO trial button (`trial.start_click`) | 16 | 16 |
| Started a PRO trial (`trial.start`) | 16 | 16 |
| Followed the TCGScan pairing pitch (`tcgscan.pairing_click`) | 13 | 9 |
| Answered the puzzle offer (`puzzle.choice`) | 12 | 12 |
| Tried the print example (`demo.print`) | 9 | 7 |
| Tried tri-color search (`demo.tricolor_search`) | 8 | 6 |
| Imported a CSV (`csv.import`) | 7 | 6 |
| Opened the feedback form (`feedback.shown`) | 5 | 4 |
| Opened Stripe Checkout (`offer.checkout_start`) | 4 | 4 |
| Tried collection curation (`demo.curation`) | 1 | 1 |
| Solved the daily puzzle (`puzzle.solved`) | 1 | 1 |
| Sent feedback (`feedback.submitted`) | 1 | 1 |

Instrumentation: 38/44 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `compose.pages_kept`, `trial.start_failed`, `search.no_results`, `feedback.failed`, `offer.checkout_failed`, `puzzle.guess_failed`

Works, but not yet from a real user: `binder.rebuild_from_tcgscan`, `story.build`, `offer_checkout_start`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

67 sessions · 367 events · 12 accounts + 35 guests · median session 6s
Excluded: 589 sessions, 7649 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 2 | 16 | 2 |
| 7d | 7 | 39 | 4 |
| 14d | 16 | 89 | 9 |
| 30d | 67 | 367 | 47 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **35** of 47 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **12** Signed-in account (100% of top)
- **7** Did anything past the open (58.3% of top)
- **1** Was shown the PRO offer (8.3% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **41** Opened the app (87.2% of top)
- **40** Viewed a page (85.1% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **39** Started as a guest (100% of top)
- **38** Did anything at all (97.4% of top)
- **4** Submitted the upgrade (10.3% of top) — see gap `upgrade_unconfirmed`
- **4** Completed it (ground truth) (10.3% of top)

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `collections` | collection_list | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **4** times to **1** person, walked away from **0**, pressed **0**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `plans` | `/plans` 4 | 4 | 1 | 0 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

### What guests did past the open

39 people opened as a guest across 52 sessions.

| How far they got | People | of 39 |
| --- | ---: | ---: |
| Opened and left | 1 | 2.6% |
| Looked at a page or two | 18 | 46.2% |
| Wandered the site | 17 | 43.6% |
| Built something | 3 | 7.7% |

Of the 3 who built something, **0** created an account.

**1** guests walked to a pricing page; **1** saw the PRO offer.

| Guest action | People | Times |
| --- | ---: | ---: |
| Signed in (`auth.login`) | 6 | 6 |
| Account created (`account.created`) | 4 | 4 |
| Opened a card (`card.open`) | 2 | 3 |
| Added a card to a collection (`collection.card_add`) | 1 | 8 |
| Saw the PRO offer (`pro.offer_shown`) | 1 | 4 |
| Scanned a card (`scan.capture`) | 1 | 3 |
| Added cards (`card.add`) | 1 | 1 |
| Created a collection (`collection.create`) | 1 | 1 |
| Removed a card from a collection (`collection.card_remove`) | 1 | 1 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 28 | 67 |
| `/welcome` | 19 | 35 |
| `/settings` | 13 | 17 |
| `/scan` | 12 | 35 |
| `/browse` | 7 | 15 |
| `/collection` | 6 | 17 |
| `/sealed/:n` | 4 | 9 |
| `/collection/col-mu7vyqii-1` | 1 | 3 |
| `/collection/col-mu5nxzh0-0` | 1 | 2 |
| `/plans` _(pricing)_ | 1 | 2 |
| `/collection/col-mu5nvds7-0` | 1 | 1 |
| `/card/:n` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 252 | 41 |
| Session started (`session.start`) | 66 | 41 |
| Signed in (`auth.login`) | 10 | 10 |
| Added a card to a collection (`collection.card_add`) | 8 | 1 |
| Scanned a card (`scan.capture`) | 7 | 2 |
| Account created (`account.created`) | 5 | 5 |
| Added cards (`card.add`) | 5 | 2 |
| Opened a card (`card.open`) | 4 | 3 |
| Saw the PRO offer (`pro.offer_shown`) | 4 | 1 |
| Removed a card from a collection (`collection.card_remove`) | 3 | 2 |
| Created a collection (`collection.create`) | 2 | 2 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 1 |

Instrumentation: 22/28 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `card.search`, `cap.gate_dismissed`, `trial.start_failed`, `scan.failed`, `offer.checkout_failed`, `scan.sealed_hint`

Works, but not yet from a real user: `collection.rename`, `collection.delete`, `trial.start`, `offer.checkout_start`, `iap.purchase_start`, `iap.purchase_result`, `collection.sealed_add`, `external_marketplace_search_clicked`, `bulk_edit_applied`, `iap.restore`

## Doggle

81 sessions · 311 events · 4 accounts + 78 guests · median session 3s
Excluded: 88 sessions, 501 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 3 | 1 |
| 7d | 15 | 38 | 13 |
| 14d | 34 | 128 | 34 |
| 30d | 81 | 311 | 82 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **81** Arrived signed out (100% of top)
- **60** Viewed any screen (74.1% of top)
- **0** Created an account (0% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `AppAgg.com` (AppAgg.com · referral) | 1 | 1 | 0 | 0 |

### What guests did past the open

81 people opened as a guest across 76 sessions.

| How far they got | People | of 81 |
| --- | ---: | ---: |
| Opened and left | 10 | 12.3% |
| Looked at a page or two | 65 | 80.2% |
| Wandered the site | 6 | 7.4% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 64 | 111 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 54 | 56 |
| `Login` | 9 | 15 |
| `Home` | 3 | 16 |
| `Onboarding` | 3 | 3 |
| `PetHome` | 2 | 4 |
| `Mail` | 2 | 2 |
| `DogEdit` | 1 | 3 |
| `Discover` | 1 | 2 |
| `DogPlaceDetail` | 1 | 2 |
| `Settings` | 1 | 1 |
| `PlanDay` | 1 | 1 |
| `Profile` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 123 | 61 |
| Session revalidated (plumbing) (`session.check`) | 115 | 65 |
| Session started (`session.start`) | 73 | 60 |

Instrumentation: 12/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `account.created`, `push.permission_requested`, `push.permission_result`, `push.token_registered`, `push.opened`, `location.permission_requested`, `location.permission_result`, `walk.cancel`, `checkin.failed`, `discover.tab`, `session.recovered`, `session.expired`

Works, but not yet from a real user: `auth.login`, `prompt.shown`, `prompt.answered`, `walk.start`, `walk.end`, `checkin.create`, `checkin.out`, `session.unreachable`, `auth.signout_decision`

## Pickleague

13 sessions · 24 events · 0 accounts + 11 guests · median session 1s
Excluded: 15 sessions, 127 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 4 | 11 | 2 |
| 14d | 4 | 11 | 2 |
| 30d | 13 | 24 | 11 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **11** Arrived signed out (100% of top)
- **8** Viewed any screen (72.7% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

11 people opened as a guest across 13 sessions.

| How far they got | People | of 11 |
| --- | ---: | ---: |
| Opened and left | 3 | 27.3% |
| Looked at a page or two | 6 | 54.5% |
| Wandered the site | 2 | 18.2% |
| Built something | 0 | 0% |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 8 | 13 |
| `Register` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 14 | 8 |
| Session started (`session.start`) | 10 | 8 |

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

### Checkout clicks were forked, partial and unregistered `checkout_intent_blind` (high, landed)

Three faults at once. The event name differed between the apps by one character (offer_checkout_start vs offer.checkout_start), so no cross-app question could be asked. Only one of the three michi call sites and one of the two tcgscan ones emitted anything, so bundle upgrades and binder-PDF purchases reached Stripe silently. And all of it - plus tcgscan's IAP pair and michi's print.preview - was unregistered in this studio, arriving as unrecognised and counted by no report.

**Effect:** understated checkout intent by an unknown amount and made it unjoinable across the two apps

**Fix:** Landed 2026-09-23. startCheckout() in both apps emits offer.checkout_start and, on a failed URL mint, offer.checkout_failed; every caller passes a `surface`. Six names registered. Promote to fixed once a checkout_start is observed from a surface other than offer_cards - that is the half that was invisible.

### The daily puzzle emitted nothing `puzzle_blind` (high, landed)

/daily, its home-card invitation, the opt-in preference and every guess shipped with zero track() calls. Whether anyone was offered it, accepted it, opened it, guessed, or solved it was entirely invisible - the only trace was page.view on /daily, which cannot tell a first look from a return to a solved puzzle and says nothing about play.

**Effect:** made every question about the puzzle unanswerable

**Fix:** Landed 2026-09-24: offer_shown, choice, opened, guess_submitted, solved and guess_failed, with ?from= on the card and rail links so entry point is attributable. Promote to fixed on the first observed puzzle.solved - that is the end of the chain and proves every link before it.

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

### The feedback page counted sends and nothing else `feedback_unmeasured` (medium, landed)

/feedback shipped emitting one event, feedback.submitted. A send that never landed was silent in all three of its failure modes, and there was no impression event at all - so the submit count was a numerator with no denominator, which reads as a triumph off six openings and a problem off six hundred.

**Effect:** made the response rate unknowable in either direction, and hid every failed send

**Fix:** Landed 2026-09-22 in michi: feedback.shown once per form mount, and feedback.failed with the repo's own reason enum (no-session | rate-limited | error) at both the classified and the thrown paths.

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
