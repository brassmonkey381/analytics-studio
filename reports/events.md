# Event analytics — last 30 days

Collected 2026-10-26T15:07:35.921Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

1122 sessions · 15230 events · 77 accounts + 488 guests · median session 1m
Excluded: 1037 sessions, 8863 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 60 | 2423 | 43 |
| 7d | 289 | 5630 | 185 |
| 14d | 527 | 8131 | 304 |
| 30d | 1122 | 15230 | 565 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **488** of 565 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **77** Signed-in account (100% of top)
- **76** Did anything past the open (98.7% of top)
- **35** Was shown the PRO offer (45.5% of top)
- **6** Started a PRO trial (7.8% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **74** Was stopped by a plan limit (13.1% of top)
- **19** Was shown the PRO offer (3.4% of top)
- **4** Pressed start (0.7% of top)
- **4** Started a PRO trial (0.7% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **560** Opened the app (99.1% of top)
- **556** Viewed a page (98.4% of top)
- **14** Tried a demo (2.5% of top)
- **13** Made something real (2.3% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **519** Started as a guest (100% of top)
- **511** Did anything at all (98.5% of top)
- **73** Submitted the upgrade (14.1% of top) — see gap `upgrade_unconfirmed`
- **31** Completed it (ground truth) (6% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
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
| `899adc54-d1c6-4016-9e41-ad6be8bbe7d1` | 1 | 1 | 0 | 0 |
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
| `38f35148-5b12-44ba-a5d4-a7fe5daff98e` | 1 | 1 | 0 | 0 |
| `52940aea-f2ad-47ad-80f3-69d1681fed9e` | 1 | 1 | 0 | 0 |
| `17be4d3b-9d36-4235-88a6-f878ed886a64` | 1 | 1 | 0 | 0 |
| `ddef4394-08a5-44d0-87c8-47e099dd9540` | 1 | 1 | 0 | 0 |
| `8f96e8e4-e768-4d8b-9ea0-8caa2537c137` | 1 | 1 | 0 | 0 |
| `cb37a28e-fb9e-48ce-902b-6720a60e7121` | 1 | 1 | 0 | 0 |
| `b670a578-6571-4cfc-a700-ae46ee6e0167` | 1 | 1 | 0 | 0 |
| `26c7427b-3728-4e06-86f0-b2936d961d3f` | 1 | 1 | 0 | 0 |
| `fe6e6e2f-0f0a-4049-bd9d-b09afc8e4533` | 1 | 1 | 0 | 0 |
| `d5d7c0b2-fac7-461b-984e-53debf44fbdd` | 1 | 1 | 0 | 0 |
| `14eefb6b-449c-4008-9bf9-3bfbab7da128` | 1 | 1 | 0 | 0 |
| `6d6e08c8-15bf-432f-a191-387b76b43212` | 1 | 1 | 0 | 0 |
| `79a6471e-71fd-4797-adfe-c95b73242f71` | 1 | 1 | 0 | 0 |
| `fe58f5f2-5d94-4b24-b47b-be2d3db8c0c7` | 1 | 1 | 0 | 0 |
| `ad6a161b-1a09-434e-843c-cc47e2d74787` | 1 | 1 | 1 | 0 |
| `238fe9e8-01c8-4fd5-854a-a477f4b72eb7` | 1 | 1 | 0 | 0 |
| `6f095b83-7624-43de-879f-34d3ca28f1e3` | 1 | 1 | 0 | 0 |
| `22abdcbc-32b3-471a-8ff0-050b8b187f58` | 1 | 1 | 0 | 0 |
| `10bab456-20f7-46df-8d9b-c53ad44007a5` | 1 | 1 | 0 | 0 |
| `16a9b2a9-cfd7-41f6-b0f5-8f532385ddd4` | 1 | 1 | 0 | 0 |
| `007f7e40-1142-4d5f-9d30-cfa1c8e4e6b6` | 1 | 1 | 0 | 0 |
| `736a0885-acff-4b30-a3fc-dac3f57b1cf4` | 1 | 1 | 0 | 0 |
| `e0ea0d0f-1f4b-46f9-84b5-6f6d50a699df` | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `themeSearch` | binder_editor | 74 | 41 | 24 | dialog 74 | trial 15, upgrade 14, signin 45<br>_trial rendered on 15 of 74_ | not_now 31, close 41 |
| `findSimilar` | binder_editor | 51 | 29 | 12 | dialog 36, toast 15 | trial 12, upgrade 12, signin 12, toast 15<br>_trial rendered on 12 of 51_ | not_now 17, close 19 |
| `themeSearch` | browse | 14 | 9 | 8 | dialog 14 | upgrade 1, signin 13<br>_trial rendered on 0 of 14_ | not_now 2, close 11 |
| `binders` | my_binders | 9 | 8 | 3 | dialog 9 | trial 1, upgrade 5, signin 3<br>_trial rendered on 1 of 9_ | not_now 8, close 1 |
| `artUploads` | binder_editor | 7 | 3 | 1 | dialog 3, toast 4 | upgrade 2, signin 1, toast 4<br>_trial rendered on 0 of 7_ | not_now 2, close 1 |
| `findSimilar` | browse | 3 | 3 | 2 | dialog 3 | upgrade 1, signin 2<br>_trial rendered on 0 of 3_ | not_now 1, close 1 |
| `pagesPerBinder` | binder_editor | 3 | 1 | 0 | dialog 1, toast 2 | trial 1, toast 2<br>_trial rendered on 1 of 3_ | close 1 |
| `binders` | build_wizard | 1 | 1 | 1 | inline 1 | signin 1<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `binders` | browse | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |
| `findSimilar` | home | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **243** times to **35** people, walked away from **44**, pressed **6**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `slice_studio` | `/binder/:id` 68, `/my-binders` 41, `/` 2 | 111 | 14 | 0 | 2 |
| `my_binders` | `/my-binders` 48, `/binder/:id` 11 | 59 | 11 | 1 | 0 |
| `binder_editor` | `/binder/:id` 24, `/` 2, `/my-binders` 2 | 28 | 16 | 27 | 1 |
| `plans` | `/plans` 20, `/my-binders` 3 | 23 | 15 | 0 | 1 |
| `print_gate` | `/binder/:id` 11, `/my-binders` 9, `/binder/example-fill-sheet` 1, `/` 1 | 22 | 13 | 16 | 2 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 88 | 66 | accepted 22, dismissed 60, abandoned 3 _(+3 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 19 | 17 | accepted 9, declined 3, dismissed 7, abandoned 14 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

519 people opened as a guest across 654 sessions.

| How far they got | People | of 519 |
| --- | ---: | ---: |
| Opened and left | 8 | 1.5% |
| Looked at a page or two | 203 | 39.1% |
| Wandered the site | 175 | 33.7% |
| Built something | 133 | 25.6% |

Of the 133 who built something, **30** created an account.

**49** guests walked to a pricing page; **13** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 132 | 146 |
| Reached a walkthrough step (`walkthrough.step`) | 126 | 286 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 126 | 158 |
| Left the walkthrough (`walkthrough.done`) | 91 | 101 |
| Added cards (`card.add`) | 79 | 1623 |
| Account created (`account.created`) | 73 | 81 |
| Tried the theme search demo (`demo.theme_search`) | 60 | 404 |
| Hit a plan limit (`cap.gate_shown`) | 54 | 108 |
| Backed out of a limit (`cap.gate_dismissed`) | 52 | 94 |
| Opened the daily puzzle (`puzzle.opened`) | 42 | 50 |
| Was shown a prompt (`prompt.shown`) | 30 | 35 |
| Answered a prompt (`prompt.answered`) | 30 | 35 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 23 | 68 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 22 | 141 |
| Saw the PRO offer (`pro.offer_shown`) | 13 | 109 |
| Signed in (`auth.login`) | 13 | 20 |
| Searched cards (`card.search`) | 12 | 12 |
| Moved or swapped a pocket (`pocket.move`) | 10 | 109 |
| Opened Arrange (`arrange_open`) | 10 | 31 |
| Previewed the print sheets (`print.preview`) | 9 | 13 |
| Answered the puzzle offer (`puzzle.choice`) | 9 | 9 |
| Placed artwork (`pocket.art`) | 7 | 55 |
| Cleared pockets (`pocket.clear`) | 7 | 42 |
| Dismissed the PRO offer (`pro.offer_declined`) | 7 | 15 |
| Started a PRO trial (`trial.start`) | 7 | 7 |
| Opened Stripe Checkout (`offer.checkout_start`) | 5 | 9 |
| Tried tri-color search (`demo.tricolor_search`) | 5 | 7 |
| Solved the daily puzzle (`puzzle.solved`) | 5 | 5 |
| CSV import failed (`csv.import_failed`) | 4 | 16 |
| Added a page (`page.add`) | 4 | 12 |
| Searched stock art (`art.search`) | 4 | 9 |
| Changed the pocket grid (`binder.grid`) | 4 | 6 |
| Pressed the PRO trial button (`trial.start_click`) | 4 | 4 |
| Undo or redo (`editor.undo`) | 3 | 29 |
| Tried the example import (`demo.csv_import`) | 3 | 9 |
| Imported a CSV (`csv.import`) | 3 | 4 |
| Opened the feedback form (`feedback.shown`) | 3 | 4 |
| pocket.art_edit (`pocket.art_edit`) | 2 | 5 |
| puzzle.revealed (`puzzle.revealed`) | 2 | 2 |
| art.tidy (`art.tidy`) | 2 | 2 |
| Set a pocket finish (`pocket.finish`) | 1 | 6 |
| csv.analyzed (`csv.analyzed`) | 1 | 2 |
| Reordered pages (`page.reorder`) | 1 | 2 |
| Built a binder from a story template (`story.build`) | 1 | 1 |
| Duplicated a page (`page.duplicate`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/welcome` | 415 | 495 |
| `/` | 393 | 909 |
| `/binder/:id` | 205 | 542 |
| `/my-binders` | 162 | 429 |
| `/discover` | 84 | 164 |
| `/michi-method` | 79 | 129 |
| `/browse` | 75 | 136 |
| `/plans` _(pricing)_ | 43 | 68 |
| `/daily` | 43 | 51 |
| `/learn` | 37 | 52 |
| `/search-guide` | 30 | 41 |
| `/whats-new` | 18 | 22 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 5112 | 556 |
| Added cards (`card.add`) | 3652 | 113 |
| Session started (`session.start`) | 1102 | 560 |
| Moved or swapped a pocket (`pocket.move`) | 896 | 19 |
| Tried the theme search demo (`demo.theme_search`) | 518 | 77 |
| Placed artwork (`pocket.art`) | 359 | 14 |
| Undo or redo (`editor.undo`) | 358 | 6 |
| Reached a walkthrough step (`walkthrough.step`) | 347 | 149 |
| Cleared pockets (`pocket.clear`) | 316 | 15 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 293 | 63 |
| Saw the PRO offer (`pro.offer_shown`) | 243 | 35 |
| Created a binder (`binder.add`) | 194 | 163 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 189 | 149 |
| Hit a plan limit (`cap.gate_shown`) | 164 | 74 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 162 | 25 |
| Backed out of a limit (`cap.gate_dismissed`) | 138 | 70 |
| Set a pocket finish (`pocket.finish`) | 126 | 3 |
| Left the walkthrough (`walkthrough.done`) | 122 | 112 |
| Answered a prompt (`prompt.answered`) | 118 | 67 |
| Was shown a prompt (`prompt.shown`) | 107 | 67 |
| Account created (`account.created`) | 81 | 73 |
| Added a page (`page.add`) | 81 | 9 |
| Signed in (`auth.login`) | 76 | 45 |
| Opened Arrange (`arrange_open`) | 76 | 14 |
| Opened the daily puzzle (`puzzle.opened`) | 65 | 51 |
| Dismissed the PRO offer (`pro.offer_declined`) | 44 | 22 |
| Previewed the print sheets (`print.preview`) | 34 | 22 |
| Searched cards (`card.search`) | 32 | 18 |
| Reordered pages (`page.reorder`) | 29 | 3 |
| art.tidy (`art.tidy`) | 23 | 5 |
| pocket.art_edit (`pocket.art_edit`) | 18 | 5 |
| CSV import failed (`csv.import_failed`) | 17 | 5 |
| Tried the example import (`demo.csv_import`) | 16 | 7 |
| Answered the puzzle offer (`puzzle.choice`) | 15 | 15 |
| Opened Stripe Checkout (`offer.checkout_start`) | 12 | 8 |
| Started a PRO trial (`trial.start`) | 10 | 10 |
| Searched stock art (`art.search`) | 10 | 5 |
| Duplicated a page (`page.duplicate`) | 10 | 2 |
| Tried tri-color search (`demo.tricolor_search`) | 9 | 7 |
| Changed the pocket grid (`binder.grid`) | 9 | 6 |
| Removed a page (`page.remove`) | 7 | 2 |
| Opened the feedback form (`feedback.shown`) | 6 | 5 |
| Pressed the PRO trial button (`trial.start_click`) | 6 | 6 |
| Changed the page background (`binder.background`) | 6 | 1 |
| Imported a CSV (`csv.import`) | 5 | 4 |
| Solved the daily puzzle (`puzzle.solved`) | 5 | 5 |
| Deleted a binder (`binder.delete`) | 3 | 1 |
| csv.analyzed (`csv.analyzed`) | 2 | 1 |
| puzzle.revealed (`puzzle.revealed`) | 2 | 2 |
| Split an art piece (`pocket.split`) | 2 | 1 |
| Sent feedback (`feedback.submitted`) | 1 | 1 |
| Built a binder from a story template (`story.build`) | 1 | 1 |
| Applied an arrangement (`arrange_pick`) | 1 | 1 |

Instrumentation: 63/78 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `demo.curation`, `demo.print`, `trial.start_failed`, `search.no_results`, `tcgscan.pairing_click`, `feedback.failed`, `offer.checkout_failed`, `offer_checkout_start`, `puzzle.guess_failed`, `binder.duplicate`, `binder.rename`, `page.swap`, `page.send`, `page.compact`, `art.link`

Works, but not yet from a real user: `compose.pages_kept`, `binder.rebuild_from_tcgscan`, `binder.public`, `binder.cover`, `binder.style`, `pocket.tray`, `pocket.merge`, `pocket.style`, `share.link`, `share.hires`, `share.pages_featured`, `print.download`, `complete_open`, `complete_pick`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

97 sessions · 429 events · 4 accounts + 54 guests · median session 28s
Excluded: 78 sessions, 521 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 3 | 1 |
| 7d | 32 | 135 | 20 |
| 14d | 79 | 357 | 51 |
| 30d | 97 | 429 | 58 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **54** of 58 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **4** Signed-in account (100% of top)
- **4** Did anything past the open (100% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **58** Opened the app (100% of top)
- **57** Viewed a page (98.3% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **57** Started as a guest (100% of top)
- **56** Did anything at all (98.2% of top)
- **3** Submitted the upgrade (5.3% of top) — see gap `upgrade_unconfirmed`
- **3** Completed it (ground truth) (5.3% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `3d13a4c6-d63a-428c-a360-4f09a2797503` | 2 | 2 | 0 | 0 |
| `6f328825-7b55-465b-aaf7-15f9883d6539` | 1 | 1 | 0 | 0 |

### What guests did past the open

57 people opened as a guest across 94 sessions.

| How far they got | People | of 57 |
| --- | ---: | ---: |
| Opened and left | 1 | 1.8% |
| Looked at a page or two | 20 | 35.1% |
| Wandered the site | 34 | 59.6% |
| Built something | 2 | 3.5% |

Of the 2 who built something, **1** created an account.

**3** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Opened a card (`card.open`) | 5 | 6 |
| Account created (`account.created`) | 3 | 3 |
| Signed in (`auth.login`) | 3 | 3 |
| Added cards (`card.add`) | 1 | 2 |
| Renamed a collection (`collection.rename`) | 1 | 1 |
| Searched a marketplace off-site (`external_marketplace_search_clicked`) | 1 | 1 |
| Scanned a card (`scan.capture`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 47 | 104 |
| `/scan` | 38 | 82 |
| `/browse` | 18 | 31 |
| `/settings` | 15 | 25 |
| `/collection` | 13 | 22 |
| `/sealed/:n` | 7 | 7 |
| `/auth-callback` | 4 | 4 |
| `/card/:n` | 3 | 5 |
| `/plans` _(pricing)_ | 3 | 3 |
| `/legal/privacy` | 1 | 1 |
| `/legal/terms` | 1 | 1 |
| `/collection/col-mv72kv49-0` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 313 | 57 |
| Session started (`session.start`) | 95 | 58 |
| Opened a card (`card.open`) | 6 | 5 |
| Signed in (`auth.login`) | 5 | 4 |
| Account created (`account.created`) | 3 | 3 |
| Searched a marketplace off-site (`external_marketplace_search_clicked`) | 3 | 2 |
| Added cards (`card.add`) | 2 | 1 |
| Renamed a collection (`collection.rename`) | 1 | 1 |
| Scanned a card (`scan.capture`) | 1 | 1 |

Instrumentation: 17/28 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `card.search`, `collection.delete`, `trial.start`, `cap.gate_dismissed`, `trial.start_failed`, `offer.checkout_failed`, `iap.purchase_start`, `iap.purchase_result`, `scan.sealed_hint`, `bulk_edit_applied`, `iap.restore`

Works, but not yet from a real user: `collection.create`, `collection.card_add`, `collection.card_remove`, `pro.offer_shown`, `cap.gate_shown`, `scan.failed`, `offer.checkout_start`, `collection.sealed_add`

## Doggle

266 sessions · 1125 events · 7 accounts + 253 guests · median session 1s
Excluded: 329 sessions, 3569 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 27 | 83 | 31 |
| 7d | 130 | 516 | 127 |
| 14d | 228 | 980 | 216 |
| 30d | 266 | 1125 | 260 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **259** Arrived signed out (100% of top)
- **228** Viewed any screen (88% of top)
- **4** Created an account (1.5% of top) — see gap `doggle_oauth_signup_untracked`
- **1** Signed in on that visit (0.4% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `AppAgg.com` (AppAgg.com · referral) | 1 | 1 | 0 | 0 |

### What we asked of people

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| points:dog_place_checkin (`points:dog_place_checkin`) | 1 | 1 | accepted 1 |
| points:walk_complete (`points:walk_complete`) | 1 | 1 | accepted 1 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

259 people opened as a guest across 247 sessions.

| How far they got | People | of 259 |
| --- | ---: | ---: |
| Opened and left | 13 | 5% |
| Looked at a page or two | 238 | 91.9% |
| Wandered the site | 8 | 3.1% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 239 | 326 |
| Account created (`account.created`) | 4 | 4 |
| Asked for location permission (`location.permission_requested`) | 3 | 16 |
| Device reachable by push (`push.token_registered`) | 3 | 16 |
| Location permission answered (`location.permission_result`) | 3 | 13 |
| Opened a Discover panel (`discover.tab`) | 2 | 20 |
| Asked for push permission (`push.permission_requested`) | 2 | 2 |
| Push permission answered (`push.permission_result`) | 2 | 2 |
| Started a walk (`walk.start`) | 1 | 1 |
| Was shown a prompt (`prompt.shown`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |
| Answered a prompt (`prompt.answered`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 212 | 212 |
| `Login` | 19 | 26 |
| `Onboarding` | 6 | 8 |
| `Home` | 3 | 44 |
| `PetHome` | 3 | 11 |
| `Mail` | 3 | 4 |
| `Blog` | 3 | 4 |
| `Discover` | 2 | 17 |
| `DogEdit` | 2 | 5 |
| `InviteLanding` | 2 | 3 |
| `Walk` | 2 | 3 |
| `Settings` | 1 | 10 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 406 | 229 |
| Session revalidated (plumbing) (`session.check`) | 343 | 240 |
| Session started (`session.start`) | 253 | 225 |
| Asked for location permission (`location.permission_requested`) | 29 | 4 |
| Device reachable by push (`push.token_registered`) | 28 | 4 |
| Location permission answered (`location.permission_result`) | 26 | 4 |
| Opened a Discover panel (`discover.tab`) | 20 | 2 |
| Account created (`account.created`) | 4 | 4 |
| Checked in at a place (`checkin.create`) | 3 | 1 |
| Tapped a notification (`push.opened`) | 2 | 1 |
| Asked for push permission (`push.permission_requested`) | 2 | 2 |
| Push permission answered (`push.permission_result`) | 2 | 2 |
| Was shown a prompt (`prompt.shown`) | 2 | 2 |
| Answered a prompt (`prompt.answered`) | 2 | 2 |
| Checked out (`checkin.out`) | 1 | 1 |
| Started a walk (`walk.start`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |

Instrumentation: 22/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `session.recovered`, `session.expired`

Works, but not yet from a real user: `auth.login`, `walk.cancel`, `checkin.failed`, `session.unreachable`, `auth.signout_decision`

## Pickleague

35 sessions · 74 events · 0 accounts + 22 guests · median session 4s
Excluded: 115 sessions, 1610 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 3 | 6 | 3 |
| 14d | 28 | 59 | 17 |
| 30d | 35 | 74 | 22 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **22** Arrived signed out (100% of top)
- **21** Viewed any screen (95.5% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

22 people opened as a guest across 35 sessions.

| How far they got | People | of 22 |
| --- | ---: | ---: |
| Opened and left | 1 | 4.5% |
| Looked at a page or two | 15 | 68.2% |
| Wandered the site | 6 | 27.3% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| appstore.click (`appstore.click`) | 1 | 2 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 21 | 34 |
| `Register` | 4 | 4 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 38 | 21 |
| Session started (`session.start`) | 34 | 21 |
| appstore.click (`appstore.click`) | 2 | 1 |

Instrumentation: 4/4 events verified firing (all traffic, all time).

Works, but not yet from a real user: `auth.login`, `account.created`

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

### A Doggle email signup leaves no event anyone owns `doggle_email_signup_unattributed` (medium, specced)

Found 2026-10-17 from a real signup. With email confirmation on, supabase.auth.signUp returns the new user but no session, so the client is still anon: account.created is written with user_id null, the live session is never claimed (analytics_claim needs a JWT), and when the person confirms they arrive in a new session. auth.users is the only place the account exists. Phone signups are unaffected because they get a session at once. A QR campaign code merged onto that account.created belongs to nobody, so campaign attribution for confirmed-email signups is lost too.

**Effect:** the digest names the account from auth.users and the Account created event under nobody; campaign claims undercount email signups

**Fix:** doggle/ANALYTICS-SIGNUP-ATTRIBUTION.md: carry data.user.id as props.account (and pending_confirmation) on account.created in app/src/data/auth.ts. When live rows carry it, scripts/events.mjs joins a null-user account.created to props.account and this moves to landed, then fixed on the first proven row.

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

### The binder editor's tools emitted nothing, and card.add did not say how `michi_editor_tools_untracked` (medium, landed)

Found 2026-10-22 answering 'how is @cardorg making binders?'. Every pick in the pocket picker, whether from a text search, a set, a theme or Similar, wrote card.add { source: 'manual' }; the picker's set browser fired no card.search at all (the kit has no onSearch / onSetChange callbacks, and card.search fired only from home and My binders). Add page, duplicate, delete, reorder, grid size, background, styling, pocket moves, clears, merges, finishes, the tray, share-link copy, print downloads, stock art and the rename dialog all had no event. The answer came from binder_slots created_at and card ids resolved against the catalogue.

**Effect:** the journey view under-describes editing sessions: a 144-card night reads as 149 identical card.add rows and page views; which tools are used, and which are never touched, was invisible

**Fix:** Landed 2026-10-22 in michi-maker (commit after 63d450a): card.add.via from the kit's browseState at pick time, and one event per completed tool use in the store methods (see _editorToolsDoc). Promote to fixed on the first observed card.add with via = 'browse_set' from a non-excluded account; that is the exact row the question needed.

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
