# Event analytics — last 30 days

Collected 2026-11-03T15:07:45.548Z. Own/QA/automated accounts excluded.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

4178 sessions · 35183 events · 103 accounts + 3150 guests · median session 13s
Excluded: 1446 sessions, 13077 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 389 | 0 | 327 |
| 7d | 3303 | 22341 | 2800 |
| 14d | 3642 | 29717 | 2998 |
| 30d | 4178 | 35183 | 3253 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **3150** of 3253 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **103** Signed-in account (100% of top)
- **91** Did anything past the open (88.3% of top)
- **17** Was shown the PRO offer (16.5% of top)
- **3** Started a PRO trial (2.9% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **98** Was stopped by a plan limit (3% of top)
- **8** Was shown the PRO offer (0.2% of top)
- **0** Pressed start (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **2496** Opened the app (76.7% of top)
- **2469** Viewed a page (75.9% of top)
- **21** Tried a demo (0.6% of top)
- **20** Made something real (0.6% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **3201** Started as a guest (100% of top)
- **2425** Did anything at all (75.8% of top)
- **79** Submitted the upgrade (2.5% of top) — see gap `upgrade_unconfirmed`
- **38** Completed it (ground truth) (1.2% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `rd_rainbow_image` (reddit · paid_social) | 1514 | 1637 | 4 | 1 |
| `rd_lidi_image` (reddit · paid_social) | 516 | 551 | 2 | 4 |
| `rd_coverflow_4x5` (reddit · paid_social) | 207 | 220 | 0 | 0 |
| `ig_coverflow_loop` (instagram · organic_social) | 4 | 4 | 0 | 0 |
| `test_reddit_skip` (reddit · paid_social) | 2 | 2 | 0 | 0 |
| `test` (reddit · cpc) | 2 | 2 | 0 | 0 |
| `test_reddit_new` (reddit · paid_social) | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `findSimilar` | binder_editor | 82 | 42 | 26 | dialog 43, toast 39 | trial 6, upgrade 19, signin 18, toast 39<br>_trial rendered on 6 of 82_ | not_now 20, close 23 |
| `themeSearch` | binder_editor | 72 | 40 | 25 | dialog 72 | trial 5, upgrade 19, signin 48<br>_trial rendered on 5 of 72_ | not_now 34, close 35 |
| `artUploads` | binder_editor | 22 | 10 | 4 | dialog 10, toast 12 | upgrade 6, signin 4, toast 12<br>_trial rendered on 0 of 22_ | not_now 4, close 5 |
| `binders` | my_binders | 14 | 11 | 7 | dialog 14 | upgrade 7, signin 7<br>_trial rendered on 0 of 14_ | not_now 10, close 4 |
| `themeSearch` | browse | 12 | 9 | 8 | dialog 12 | upgrade 1, signin 11<br>_trial rendered on 0 of 12_ | not_now 3, close 7 |
| `findSimilar` | browse | 5 | 5 | 4 | dialog 4, toast 1 | upgrade 1, signin 3, toast 1<br>_trial rendered on 0 of 5_ | not_now 2, close 1 |
| `binders` | browse | 1 | 1 | 1 | dialog 1 | signin 1<br>_trial rendered on 0 of 1_ | not_now 1 |
| `pagesPerBinder` | browse | 1 | 1 | 0 | dialog 1 | upgrade 1<br>_trial rendered on 0 of 1_ | close 1 |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

The PRO offer: shown **134** times to **17** people, walked away from **20**, pressed **2**. A decline is recorded only where walking away is an act, never for leaving a page.

| Surface | On which page | Shown | People | Declined | Pressed |
| --- | --- | ---: | ---: | ---: | ---: |
| `slice_studio` | `/binder/:id` 37, `/my-binders` 29 | 66 | 6 | 0 | 0 |
| `my_binders` | `/my-binders` 28, `/binder/:id` 10 | 38 | 8 | 0 | 0 |
| `binder_editor` | `/binder/:id` 10, `/my-binders` 1 | 11 | 7 | 11 | 0 |
| `print_gate` | `/binder/:id` 5, `/my-binders` 4, `/binder/example-fill-sheet` 1, `/` 1 | 11 | 7 | 9 | 2 |
| `plans` | `/plans` 5, `/my-binders` 3 | 8 | 5 | 0 | 0 |

**Surface** is the fixed string the call site passes — the same vocabulary the walls above use. **On which page** is the route the offer appeared over, matched to the nearest `page.view` in the session rather than the most recent: the offer fires from a mount effect and can beat its own screen's view to the wire.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 87 | 70 | accepted 24, dismissed 58, abandoned 3 _(+2 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 15 | 13 | accepted 7, declined 3, dismissed 5, abandoned 17 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

3201 people opened as a guest across 3731 sessions.

| How far they got | People | of 3201 |
| --- | ---: | ---: |
| Opened and left | 773 | 24.1% |
| Looked at a page or two | 517 | 16.2% |
| Wandered the site | 252 | 7.9% |
| Built something | 1659 | 51.8% |

Of the 1659 who built something, **36** created an account.

**51** guests walked to a pricing page; **4** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 1657 | 1671 |
| Reached a walkthrough step (`walkthrough.step`) | 1648 | 1994 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 1644 | 1703 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 1486 | 1488 |
| Added cards (`card.add`) | 1150 | 3224 |
| Left the walkthrough (`walkthrough.done`) | 217 | 228 |
| Saw a create-account wall (`signin.perk_shown`) | 105 | 161 |
| Tried the theme search demo (`demo.theme_search`) | 88 | 410 |
| Account created (`account.created`) | 79 | 81 |
| Moved or swapped a pocket (`pocket.move`) | 78 | 778 |
| Hit a plan limit (`cap.gate_shown`) | 76 | 148 |
| Pressed a landing-page button (`landing.cta`) | 75 | 82 |
| Backed out of a limit (`cap.gate_dismissed`) | 65 | 106 |
| Searched cards (`card.search`) | 54 | 101 |
| Opened the daily puzzle (`puzzle.opened`) | 47 | 52 |
| Opened Arrange (`arrange_open`) | 41 | 121 |
| Was shown a prompt (`prompt.shown`) | 36 | 39 |
| Answered a prompt (`prompt.answered`) | 36 | 39 |
| Took a free taste of a PRO feature (`taste.used`) | 35 | 48 |
| Added a page (`page.add`) | 33 | 157 |
| Cleared pockets (`pocket.clear`) | 31 | 439 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 30 | 74 |
| Opened Complete page (`complete_open`) | 27 | 48 |
| Placed artwork (`pocket.art`) | 26 | 380 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 24 | 133 |
| Fill page composed (`autofill.run`) | 21 | 24 |
| Opened Fill page (`autofill.open`) | 17 | 40 |
| Undo or redo (`editor.undo`) | 16 | 52 |
| Changed the pocket grid (`binder.grid`) | 15 | 33 |
| Searched stock art (`art.search`) | 14 | 29 |
| Completed a page (`complete_pick`) | 14 | 15 |
| Started Google sign-in (`auth.oauth_start`) | 13 | 14 |
| Answered the puzzle offer (`puzzle.choice`) | 13 | 13 |
| Signed in (`auth.login`) | 12 | 13 |
| Tried tri-color search (`demo.tricolor_search`) | 11 | 14 |
| Changed the page background (`binder.background`) | 9 | 72 |
| Previewed the print sheets (`print.preview`) | 9 | 13 |
| Deleted a binder (`binder.delete`) | 8 | 9 |
| pocket.art_edit (`pocket.art_edit`) | 7 | 20 |
| Solved the daily puzzle (`puzzle.solved`) | 7 | 7 |
| Opened an outside art search (`art.link`) | 6 | 10 |
| Opened Stripe Checkout (`offer.checkout_start`) | 5 | 9 |
| Started a PRO trial (`trial.start`) | 5 | 5 |
| Duplicated a page (`page.duplicate`) | 5 | 5 |
| Opened the wishlist (`wishlist.shown`) | 5 | 5 |
| Saw the PRO offer (`pro.offer_shown`) | 4 | 62 |
| Tried the example import (`demo.csv_import`) | 4 | 11 |
| Split an art piece (`pocket.split`) | 4 | 10 |
| puzzle.revealed (`puzzle.revealed`) | 4 | 4 |
| Changed binder styling (`binder.style`) | 3 | 34 |
| CSV import failed (`csv.import_failed`) | 3 | 7 |
| art.tidy (`art.tidy`) | 3 | 5 |
| Tapped Create account on a wall (`signin.perk_click`) | 3 | 3 |
| Reordered pages (`page.reorder`) | 2 | 54 |
| csv.analyzed (`csv.analyzed`) | 2 | 8 |
| Dismissed the PRO offer (`pro.offer_declined`) | 2 | 7 |
| Opened the feedback form (`feedback.shown`) | 2 | 2 |
| Duplicated a binder (`binder.duplicate`) | 2 | 2 |
| Clicked out to a store (`affiliate.click`) | 2 | 2 |
| Removed a page (`page.remove`) | 2 | 2 |
| Set a pocket finish (`pocket.finish`) | 1 | 6 |
| Pressed the PRO trial button (`trial.start_click`) | 1 | 1 |
| Built a binder from a story template (`story.build`) | 1 | 1 |
| Removed blank pages (`page.compact`) | 1 | 1 |
| Google account already had a michi account (`auth.link_exists`) | 1 | 1 |
| Made a binder public or private (`binder.public`) | 1 | 1 |
| Applied an arrangement (`arrange_pick`) | 1 | 1 |
| Tried collection curation (`demo.curation`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 2252 | 3136 |
| `/binder/:id` | 1761 | 2245 |
| `/my-binders` | 1720 | 2017 |
| `/welcome` | 785 | 886 |
| `/discover` | 115 | 217 |
| `/browse` | 94 | 163 |
| `/michi-method` | 85 | 144 |
| `/plans` _(pricing)_ | 48 | 80 |
| `/daily` | 47 | 52 |
| `/learn` | 39 | 70 |
| `/search-guide` | 34 | 49 |
| `/binder/ex-pitch-black-chase` | 26 | 32 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 10991 | 2474 |
| Added cards (`card.add`) | 5148 | 1182 |
| Session started (`session.start`) | 3258 | 2496 |
| Moved or swapped a pocket (`pocket.move`) | 2226 | 96 |
| Reached a walkthrough step (`walkthrough.step`) | 2047 | 1667 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 1730 | 1663 |
| Created a binder (`binder.add`) | 1723 | 1688 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 1489 | 1487 |
| Cleared pockets (`pocket.clear`) | 1000 | 50 |
| Placed artwork (`pocket.art`) | 945 | 39 |
| Tried the theme search demo (`demo.theme_search`) | 504 | 101 |
| Undo or redo (`editor.undo`) | 427 | 22 |
| Added a page (`page.add`) | 317 | 46 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 272 | 71 |
| Left the walkthrough (`walkthrough.done`) | 247 | 236 |
| Opened Arrange (`arrange_open`) | 236 | 49 |
| Set a pocket finish (`pocket.finish`) | 216 | 4 |
| Hit a plan limit (`cap.gate_shown`) | 209 | 98 |
| Saw a create-account wall (`signin.perk_shown`) | 164 | 108 |
| Searched cards (`card.search`) | 153 | 67 |
| Backed out of a limit (`cap.gate_dismissed`) | 150 | 84 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 146 | 26 |
| Saw the PRO offer (`pro.offer_shown`) | 134 | 17 |
| Answered a prompt (`prompt.answered`) | 117 | 72 |
| Was shown a prompt (`prompt.shown`) | 102 | 72 |
| Changed the page background (`binder.background`) | 100 | 16 |
| Reordered pages (`page.reorder`) | 88 | 6 |
| Pressed a landing-page button (`landing.cta`) | 83 | 76 |
| Account created (`account.created`) | 81 | 79 |
| Signed in (`auth.login`) | 65 | 43 |
| Opened the daily puzzle (`puzzle.opened`) | 62 | 53 |
| Took a free taste of a PRO feature (`taste.used`) | 53 | 38 |
| pocket.art_edit (`pocket.art_edit`) | 51 | 15 |
| Opened Complete page (`complete_open`) | 51 | 29 |
| Opened Fill page (`autofill.open`) | 48 | 18 |
| Changed binder styling (`binder.style`) | 46 | 5 |
| Searched stock art (`art.search`) | 43 | 18 |
| Changed the pocket grid (`binder.grid`) | 42 | 21 |
| Previewed the print sheets (`print.preview`) | 37 | 22 |
| art.tidy (`art.tidy`) | 36 | 7 |
| Fill page composed (`autofill.run`) | 24 | 21 |
| Opened Stripe Checkout (`offer.checkout_start`) | 21 | 13 |
| Dismissed the PRO offer (`pro.offer_declined`) | 20 | 10 |
| Deleted a binder (`binder.delete`) | 20 | 14 |
| Answered the puzzle offer (`puzzle.choice`) | 18 | 18 |
| Tried tri-color search (`demo.tricolor_search`) | 17 | 14 |
| Tried the example import (`demo.csv_import`) | 16 | 7 |
| Duplicated a page (`page.duplicate`) | 16 | 7 |
| Split an art piece (`pocket.split`) | 15 | 7 |
| Applied an arrangement (`arrange_pick`) | 15 | 3 |
| Removed a page (`page.remove`) | 15 | 7 |
| Completed a page (`complete_pick`) | 15 | 14 |
| Started Google sign-in (`auth.oauth_start`) | 14 | 13 |
| Voted on a wishlist idea (`wishlist.vote`) | 11 | 1 |
| Started a PRO trial (`trial.start`) | 10 | 10 |
| Opened an outside art search (`art.link`) | 10 | 6 |
| Downloaded the full-size share image (`share.hires`) | 9 | 3 |
| Changed a binder cover (`binder.cover`) | 9 | 1 |
| CSV import failed (`csv.import_failed`) | 8 | 4 |
| csv.analyzed (`csv.analyzed`) | 8 | 2 |
| Solved the daily puzzle (`puzzle.solved`) | 8 | 8 |
| Opened the wishlist (`wishlist.shown`) | 7 | 6 |
| Used the tray (`pocket.tray`) | 6 | 3 |
| Saw the returned-binder banner (`returned_binder.shown`) | 6 | 1 |
| puzzle.revealed (`puzzle.revealed`) | 4 | 4 |
| Tapped Create account on a wall (`signin.perk_click`) | 3 | 3 |
| Pressed the PRO trial button (`trial.start_click`) | 2 | 2 |
| Opened the feedback form (`feedback.shown`) | 2 | 2 |
| Shared a binder link (`share.link`) | 2 | 1 |
| Duplicated a binder (`binder.duplicate`) | 2 | 2 |
| Clicked out to a store (`affiliate.click`) | 2 | 2 |
| Chose the pages a share shows (`share.pages_featured`) | 2 | 1 |
| Built a binder from a story template (`story.build`) | 1 | 1 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Downloaded print sheets (`print.download`) | 1 | 1 |
| print.auto_download (`print.auto_download`) | 1 | 1 |
| Removed blank pages (`page.compact`) | 1 | 1 |
| Google account already had a michi account (`auth.link_exists`) | 1 | 1 |
| Made a binder public or private (`binder.public`) | 1 | 1 |
| Merged art pieces (`pocket.merge`) | 1 | 1 |
| Tried collection curation (`demo.curation`) | 1 | 1 |

Instrumentation: 81/98 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `deploy.live`, `returned_binder.open`, `returned_binder.dismiss`, `account.deleted`, `trial.start_failed`, `search.no_results`, `tcgscan.pairing_click`, `feedback.submitted`, `feedback.failed`, `wishlist.vote_failed`, `wishlist.submitted`, `wishlist.submit_failed`, `offer.checkout_failed`, `offer_checkout_start`, `puzzle.guess_failed`, `binder.rename`, `page.send`

Works, but not yet from a real user: `compose.pages_kept`, `csv.import`, `binder.rebuild_from_tcgscan`, `page.swap`, `pocket.style`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

132 sessions · 630 events · 6 accounts + 72 guests · median session 27s
Excluded: 182 sessions, 1110 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 10 | 0 | 6 |
| 7d | 44 | 239 | 24 |
| 14d | 70 | 352 | 40 |
| 30d | 132 | 630 | 78 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **72** of 78 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **6** Signed-in account (100% of top)
- **4** Did anything past the open (66.7% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **71** Opened the app (91% of top)
- **70** Viewed a page (89.7% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **77** Started as a guest (100% of top)
- **69** Did anything at all (89.6% of top)
- **4** Submitted the upgrade (5.2% of top) — see gap `upgrade_unconfirmed`
- **3** Completed it (ground truth) (3.9% of top)

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `collections` | add_to_collection | 4 | 1 | _not recorded_ | _not recorded 4_ | _not recorded 4_<br>_trial rendered on 0 of 4_ | _not recorded 1_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

### What guests did past the open

77 people opened as a guest across 129 sessions.

| How far they got | People | of 77 |
| --- | ---: | ---: |
| Opened and left | 8 | 10.4% |
| Looked at a page or two | 26 | 33.8% |
| Wandered the site | 40 | 51.9% |
| Built something | 3 | 3.9% |

Of the 3 who built something, **1** created an account.

**8** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Opened a card (`card.open`) | 5 | 6 |
| Account created (`account.created`) | 4 | 4 |
| Signed in (`auth.login`) | 3 | 3 |
| Scanned a card (`scan.capture`) | 2 | 4 |
| Renamed a collection (`collection.rename`) | 2 | 2 |
| Searched a marketplace off-site (`external_marketplace_search_clicked`) | 2 | 2 |
| Added a card to a collection (`collection.card_add`) | 1 | 5 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 4 |
| Added cards (`card.add`) | 1 | 2 |
| scan.riffle_pick (`scan.riffle_pick`) | 1 | 2 |
| Created a collection (`collection.create`) | 1 | 1 |
| Deleted a collection (`collection.delete`) | 1 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |
| Clicked out to a store (`affiliate.click`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 58 | 144 |
| `/scan` | 45 | 99 |
| `/browse` | 25 | 55 |
| `/settings` | 23 | 39 |
| `/collection` | 19 | 55 |
| `/plans` _(pricing)_ | 8 | 11 |
| `/sealed/:n` | 7 | 7 |
| `/card/:n` | 4 | 6 |
| `/auth-callback` | 4 | 4 |
| `/planned` | 3 | 5 |
| `/support` | 3 | 4 |
| `/sessions` | 3 | 4 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 471 | 70 |
| Session started (`session.start`) | 117 | 71 |
| Opened a card (`card.open`) | 6 | 5 |
| Signed in (`auth.login`) | 5 | 4 |
| Added a card to a collection (`collection.card_add`) | 5 | 1 |
| Account created (`account.created`) | 4 | 4 |
| Searched a marketplace off-site (`external_marketplace_search_clicked`) | 4 | 3 |
| Scanned a card (`scan.capture`) | 4 | 2 |
| Hit a plan limit (`cap.gate_shown`) | 4 | 1 |
| Added cards (`card.add`) | 2 | 1 |
| Renamed a collection (`collection.rename`) | 2 | 2 |
| scan.riffle_pick (`scan.riffle_pick`) | 2 | 1 |
| Created a collection (`collection.create`) | 1 | 1 |
| Deleted a collection (`collection.delete`) | 1 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |
| Clicked out to a store (`affiliate.click`) | 1 | 1 |

Instrumentation: 24/29 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `trial.start`, `trial.start_failed`, `offer.checkout_failed`, `scan.sealed_hint`, `iap.restore`

Works, but not yet from a real user: `card.search`, `collection.card_remove`, `pro.offer_shown`, `scan.failed`, `offer.checkout_start`, `iap.purchase_start`, `iap.purchase_result`, `collection.sealed_add`, `bulk_edit_applied`

## Doggle

457 sessions · 1804 events · 8 accounts + 423 guests · median session 1s
Excluded: 496 sessions, 5288 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 28 | 85 | 25 |
| 7d | 187 | 691 | 170 |
| 14d | 336 | 1271 | 315 |
| 30d | 457 | 1804 | 431 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **429** Arrived signed out (100% of top)
- **397** Viewed any screen (92.5% of top)
- **4** Created an account (0.9% of top) — see gap `doggle_oauth_signup_untracked`
- **1** Signed in on that visit (0.2% of top)

### What we asked of people

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| points:dog_place_checkin (`points:dog_place_checkin`) | 1 | 1 | accepted 1 |
| points:walk_complete (`points:walk_complete`) | 1 | 1 | accepted 1 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

429 people opened as a guest across 424 sessions.

| How far they got | People | of 429 |
| --- | ---: | ---: |
| Opened and left | 12 | 2.8% |
| Looked at a page or two | 403 | 93.9% |
| Wandered the site | 14 | 3.3% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 410 | 538 |
| Device reachable by push (`push.token_registered`) | 4 | 21 |
| Asked for location permission (`location.permission_requested`) | 4 | 18 |
| Location permission answered (`location.permission_result`) | 4 | 14 |
| Account created (`account.created`) | 4 | 4 |
| Opened a Discover panel (`discover.tab`) | 3 | 21 |
| Asked for push permission (`push.permission_requested`) | 3 | 3 |
| Push permission answered (`push.permission_result`) | 3 | 3 |
| Tapped a notification (`push.opened`) | 1 | 2 |
| Started a walk (`walk.start`) | 1 | 1 |
| Was shown a prompt (`prompt.shown`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |
| Answered a prompt (`prompt.answered`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 376 | 376 |
| `Login` | 32 | 40 |
| `Onboarding` | 6 | 9 |
| `Social` | 5 | 10 |
| `Blog` | 4 | 5 |
| `MeetupDetail` | 4 | 4 |
| `Home` | 3 | 48 |
| `Discover` | 3 | 18 |
| `Mail` | 3 | 4 |
| `Profile` | 2 | 13 |
| `PetHome` | 2 | 10 |
| `UserProfile` | 2 | 5 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 634 | 399 |
| Session revalidated (plumbing) (`session.check`) | 572 | 412 |
| Session started (`session.start`) | 442 | 395 |
| Device reachable by push (`push.token_registered`) | 39 | 5 |
| Asked for location permission (`location.permission_requested`) | 35 | 6 |
| Location permission answered (`location.permission_result`) | 28 | 6 |
| Opened a Discover panel (`discover.tab`) | 22 | 4 |
| Tapped a notification (`push.opened`) | 8 | 2 |
| Checked in at a place (`checkin.create`) | 5 | 1 |
| Account created (`account.created`) | 4 | 4 |
| Asked for push permission (`push.permission_requested`) | 3 | 3 |
| Push permission answered (`push.permission_result`) | 3 | 3 |
| Was shown a prompt (`prompt.shown`) | 2 | 2 |
| Answered a prompt (`prompt.answered`) | 2 | 2 |
| Check-in refused (`checkin.failed`) | 2 | 1 |
| Checked out (`checkin.out`) | 1 | 1 |
| Started a walk (`walk.start`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |

Instrumentation: 22/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `session.recovered`, `session.expired`

Works, but not yet from a real user: `auth.login`, `walk.cancel`, `session.unreachable`, `auth.signout_decision`

## Pickleague

38 sessions · 80 events · 0 accounts + 25 guests · median session 4s
Excluded: 177 sessions, 2227 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 2 | 4 | 2 |
| 7d | 3 | 6 | 3 |
| 14d | 4 | 8 | 4 |
| 30d | 38 | 80 | 25 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **25** Arrived signed out (100% of top)
- **24** Viewed any screen (96% of top)
- **0** Created an account (0% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

25 people opened as a guest across 38 sessions.

| How far they got | People | of 25 |
| --- | ---: | ---: |
| Opened and left | 1 | 4% |
| Looked at a page or two | 18 | 72% |
| Wandered the site | 6 | 24% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| appstore.click (`appstore.click`) | 1 | 2 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 24 | 37 |
| `Register` | 4 | 4 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 41 | 24 |
| Session started (`session.start`) | 37 | 24 |
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

### account.created fires when Google sign-in STARTS, so an abandoned OAuth hop counts as a new account `account_created_fires_on_oauth_start` (high, landed)

Found 2026-10-29 when the owner asked who the three Reddit-session signups were. michi-maker src/store/auth.tsx tracked account.created { via: oauth | guest_upgrade } right after signInWithOAuth / linkIdentity returned, before the browser left for Google, under the GUEST uid and session. CORRECTED the same evening: the hops were not abandoned. Two of the three (15:10 and 18:42 PT) completed six seconds later as a NEW auth.users row with a new uid and a new analytics session whose landing_route is /auth-callback, so linkIdentity did not link onto the anonymous row: the guest uid is orphaned with zero identities, the guest binder does not follow (the 18:42 guest placed 4 cards and the account owns 0 binders), and the campaign code on the guest session never reaches the account. account.created under the guest uid therefore cannot be joined to the account by uid; only the timestamp ties them.

**Effect:** every campaign-to-signup join by uid or session reads zero for OAuth signups from a guest session, which is the whole Reddit funnel; the event-stream signup count is right in total but attributed to the wrong uid

**Fix:** TWO HALVES. (a) Timing: fire on the return, not the tap (landed, below). (b) Continuity: the guest-to-account upgrade must either really link (linkIdentity onto the anonymous uid, so uid, binders and session survive) or carry the campaign across the hop (persist landingCampaign beside lib/authReturn.ts and put it on the new session.start and on account.created) and re-home the guest binder; until (b) lands the studio joins a Reddit guest session to its account by session end within 10 seconds of auth.users.created_at, and says so. Original ask: Fire account.created on the RETURN: in auth-callback.tsx (web) and the native deep-link handler, when the restored session is non-anonymous and auth.users.created_at (or identities.created_at) is within the last few minutes; emit auth.oauth_start { provider, guest } at the current call site instead so the hop itself stays measurable. Until then the studio should count accounts from ground truth: auth.users where is_anonymous=false joined to the guest session by uid, not from account.created rows whose user is still anonymous. landed 2026-10-29 michi-maker bf6844e (development, not deployed): the tap is auth.oauth_start { provider, guest }; account.created { via, provider } fires from the auth store onAuthStateChange (web and native alike) when the returned session carries a non-email identity created within the last ten minutes (via oauth when the user row is as new, guest_upgrade when the identity was linked onto an older anonymous row), once per uid per page life; older identities record auth.login as before. Rows before that deploy keep the old meaning: an account.created with via oauth/guest_upgrade whose user is still anonymous is an abandoned hop. fixed on the first post-deploy OAuth signup whose user has an identity.

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

### No acquisition source `referrer` (low, landed)

Nothing records how a session arrived — no referrer, no UTM capture. Marketing spend cannot be attributed to activation or trials. DEFERRED by Brian on 2026-08-06, for a real reason rather than as a backlog punt: michi-maker/src/app/legal/privacy.tsx promises first-party records of 'which pages you open and product actions', and referrer/UTM are neither. Capturing them means changing that disclosure first, in both apps.

**Effect:** no attribution possible

**Fix:** UTM capture landed 2026-08-14 (allowlisted code/utm_* into landing_route). Referrer landed 2026-10-29 on michi web (owner: turn Referrer capture on): session.start props.referrer = document.referrer trimmed CLIENT-SIDE to origin + pathname, dropped when same-origin, with michi-maker/src/app/legal/privacy.tsx updated in the same commit. Deliberately a session.start prop rather than a new analytics_sessions column: no migration, and the studio already reads session.start. tcgscan-app does not capture referrer yet. fixed when the first non-excluded session.start carries a referrer.

### No outbound TCGplayer or eBay click is recorded anywhere we can read `affiliate_clicks_blind` (medium ROOT CAUSE (michi session, 2026-10-29 21:13 PT): the guests never called linkIdentity. The account sheet opened on the Sign in tab for guests and link is true only on the Create tab, so every guest Google tap ran signInWithOAuth (new uid, new session, binder left behind). 56e656f opens a guest on Create (live in production 5873b67 ~21:20 PT): the tap now links onto the anonymous uid and account.created reports via guest_upgrade on the same uid. Continuity half landed in 7bc1d40 (development, not deployed): see _authHopDoc for from_uid / from_session. Remaining by design: a guest who flips to Sign in and uses Google gets another uid and leaves the guest binder behind. fixed when a post-7bc1d40 Reddit session.start carries utm_source and an account.created the same minute carries its from_session. MIGRATION 2026-10-29 23:30 PT (06:30 UTC 10-30): 33 orphaned guest binders, 441 cards, were re-homed onto 32 accounts by michi-maker scripts/zz-rehome-orphans.mjs (ledger in michi-maker/state, not here). Only binders.owner_id changed, updated_at was bumped to the move, created_at was not, and every moved binder has binders.cap_exempt = true, so a per-account binder or card count that jumps at that hour is this migration; binders-created-per-day is untouched. 13 weaker matches were dropped for good. 7bc1d40 is live since 22:50 PT 10-29., landed)

Found 2026-10-28 when the owner asked whether anyone had clicked an affiliate link. michi-maker (browse card actions, the binder price label, home sealed tiles), tcgscan-app (five eBay call sites across browse, collection and the card page) and the shared tcgscan-browse kit (Recent and Upcoming feed) all open the URL with Linking.openURL and fire no event. The URLs carry the affiliate parameters, so Impact and the eBay Partner Network see the clicks and the sales, but by subId1 / customid only - no user, card, session or preceding action - and nothing joins to the studio.

**Effect:** every monetization question about buy intent (did a real person click out, from which surface, after what) reads as zero; the zero is blindness, not disinterest

**Fix:** tcgscan/ANALYTICS-AFFILIATE-CLICKS.md: one affiliate.click event with network / surface / item / id / affiliate props at every call site, and an onOutboundClick hook on configureBrowse so the kit can report without importing either app. landed 2026-10-29: tcgscan-browse b407919 (v0.9.35, the hook), michi-maker 51133a5 (browse, binder_label, home_sealed, recent_feed) and tcgscan-app ab36440 (browse incl. the card/sealed detail pages, portfolio, scan, recent_feed; PriceCharting as a third network, affiliate always false). Not yet deployed: michi web is a manual deploy-web.ps1, tcgscan ships by EAS/OTA. fixed on the first row from a non-excluded account.

### A binder open does not say what carried the visitor there `share_attribution` (low, deferred)

CORRECTED 2026-08-06. This was first written up as blocking, on the reasoning that a shared-link arrival was unrecordable. That was wrong, and Brian caught it: page.view already carries props.route = /binder/<uuid>, so the binder id is in the data, and joining it to binders.owner_id separates a visitor from the owner reading their own binder. The whole channel is measurable from rows that already exist — see the shares lane, which needed no app change. What genuinely remains is narrower: the route cannot say HOW someone arrived, so a link from a friend and a click from /discover are identical. 'Arrived cold' (a binder open as the account's first ever action) is the proxy, since in-app browsing does not produce that.

**Effect:** channel volume is measurable; only the referring surface is unknown

**Fix:** not scheduled — deliberately. Distinguishing the two would need either a share token in the URL, which puts a tracking parameter in a link people paste to friends, or referrer capture, which is deferred for the privacy-copy reason under `referrer`. The share.* events registered in the taxonomy stay planned rather than specced: they would add sharer-side intent (made public, copied the link), which is a different question from arrivals and is not blocking anything.

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
