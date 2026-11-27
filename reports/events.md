# Event analytics — last 30 days

Collected 2026-11-27T15:08:03.080Z. Own/QA/automated accounts excluded.
Row cap: the lane fetches at most 50000 rows per project and hit it for michi-maker, tcgscan. Rows older than 2026-11-09 18:58:30.872805+00 were dropped, so any window reaching back past that point is a floor there; windows inside it are exact.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

6762 sessions · 42995 events · 202 accounts + 5056 guests · median session 10s
Excluded: 951 sessions, 5668 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 117 | 4747 | 85 |
| 7d | 490 | 14066 | 335 |
| 14d | 1181 | 31163 | 838 |
| 30d | 6762 | 42995 | 5258 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **5056** of 5258 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **202** Signed-in account (100% of top)
- **129** Did anything past the open (63.9% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **89** Was stopped by a plan limit (1.7% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Pressed start (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **1308** Opened the app (24.9% of top)
- **1284** Viewed a page (24.4% of top)
- **14** Tried a demo (0.3% of top)
- **11** Made something real (0.2% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **5218** Started as a guest (100% of top)
- **1266** Did anything at all (24.3% of top)
- **81** Submitted the upgrade (1.6% of top) — see gap `upgrade_unconfirmed`
- **81** Completed it (ground truth) (1.6% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `rd_rainbow_image` (reddit · paid_social) | 2459 | 2689 | 30 | 9 |
| `rd_lidi_image` (reddit · paid_social) | 829 | 904 | 14 | 1 |
| `rd_coverflow_4x5` (reddit · paid_social) | 207 | 220 | 0 | 0 |
| `rd_lidi_video` (reddit · test) | 14 | 14 | 0 | 0 |
| `ig_coverflow_loop` (instagram · organic_social) | 10 | 10 | 0 | 0 |
| `sk_3c_a1_p1_four` (threads · organic_social) | 8 | 8 | 0 | 0 |
| `ig_bio` (instagram · organic_social) | 7 | 7 | 0 | 0 |
| `sk_dr_a1_p1_four` (threads · organic_social) | 7 | 7 | 0 | 0 |
| `sk_3c_g_story` (instagram · organic_social) | 4 | 4 | 0 | 0 |
| `test_reddit_skip` (reddit · paid_social) | 2 | 2 | 0 | 0 |
| `test` (reddit · cpc) | 2 | 2 | 0 | 0 |
| `sk_3c_a1_p1_story` (instagram · organic_social) | 2 | 2 | 0 | 0 |
| `test_reddit_new` (reddit · paid_social) | 1 | 1 | 0 | 0 |
| `rd_rainbow_video` (reddit · test) | 1 | 1 | 0 | 0 |
| `sk_dr_a1_p1_story` (instagram · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_group` (facebook · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_b_story` (instagram · organic_social) | 1 | 1 | 0 | 0 |
| `sk_3c_group` (facebook · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_b01_pin` (pinterest · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_b02_pin` (pinterest · organic_social) | 1 | 1 | 0 | 0 |
| `holiday2026` | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `themeSearch` | binder_editor | 74 | 34 | 22 | dialog 26, toast 48 | upgrade 26, toast 48<br>_trial rendered on 0 of 74_ | not_now 6, close 16 |
| `artUploads` | binder_editor | 38 | 19 | 7 | dialog 15, toast 23 | upgrade 15, toast 23<br>_trial rendered on 0 of 38_ | not_now 6, close 9 |
| `binders` | my_binders | 33 | 26 | 22 | dialog 8, toast 25 | upgrade 8, toast 25<br>_trial rendered on 0 of 33_ | not_now 3, close 3 |
| `findSimilar` | binder_editor | 30 | 14 | 7 | dialog 11, toast 19 | upgrade 11, toast 19<br>_trial rendered on 0 of 30_ | not_now 4, close 5 |
| `pagesPerBinder` | binder_editor | 10 | 5 | 0 | dialog 6, toast 4 | upgrade 6, toast 4<br>_trial rendered on 0 of 10_ | not_now 1, close 5 |
| `findSimilar` | browse | 6 | 5 | 4 | dialog 1, toast 5 | upgrade 1, toast 5<br>_trial rendered on 0 of 6_ | close 1 |
| `themeSearch` | browse | 2 | 2 | 2 | toast 2 | toast 2<br>_trial rendered on 0 of 2_ | _none recorded_ |
| `binders` | build_wizard | 1 | 1 | 1 | inline 1 | signin 1<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `binders` | browse | 1 | 1 | 1 | toast 1 | toast 1<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `pagesPerBinder` | home | 1 | 1 | 1 | toast 1 | toast 1<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 113 | 103 | accepted 35, dismissed 72, abandoned 1 _(+5 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 5 | 5 | dismissed 3, abandoned 3 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

5218 people opened as a guest across 6292 sessions.

| How far they got | People | of 5218 |
| --- | ---: | ---: |
| Opened and left | 3950 | 75.7% |
| Looked at a page or two | 371 | 7.1% |
| Wandered the site | 159 | 3% |
| Built something | 738 | 14.1% |

Of the 738 who built something, **89** created an account.

**67** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 723 | 782 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 690 | 770 |
| Reached a walkthrough step (`walkthrough.step`) | 686 | 933 |
| Added cards (`card.add`) | 651 | 3598 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 511 | 511 |
| Pressed a landing-page button (`landing.cta`) | 360 | 392 |
| Left the walkthrough (`walkthrough.done`) | 318 | 333 |
| Opened the new-binder wizard (`wizard.shown`) | 178 | 245 |
| Picked a binder kind in the wizard (`wizard.kind`) | 161 | 244 |
| Moved or swapped a pocket (`pocket.move`) | 141 | 5148 |
| Added a page (`page.add`) | 120 | 559 |
| Cleared pockets (`pocket.clear`) | 118 | 1987 |
| Pressed Create in the wizard (`wizard.create`) | 111 | 127 |
| Saw a create-account wall (`signin.perk_shown`) | 110 | 207 |
| Opened Complete page (`complete_open`) | 108 | 171 |
| Took a free taste of a PRO feature (`taste.used`) | 103 | 164 |
| Started Google sign-in (`auth.oauth_start`) | 97 | 118 |
| Was shown a prompt (`prompt.shown`) | 91 | 101 |
| Searched cards (`card.search`) | 90 | 219 |
| Answered a prompt (`prompt.answered`) | 90 | 99 |
| Placed artwork (`pocket.art`) | 86 | 1548 |
| Opened Arrange (`arrange_open`) | 86 | 439 |
| Tried the theme search demo (`demo.theme_search`) | 86 | 429 |
| Hit a plan limit (`cap.gate_shown`) | 86 | 189 |
| Account created (`account.created`) | 81 | 91 |
| holiday.popup_shown (`holiday.popup_shown`) | 81 | 84 |
| Fill page composed (`autofill.run`) | 77 | 120 |
| Ran a theme search that searched a synonym group (`similar_words.searched`) | 66 | 275 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 54 | 131 |
| Completed a page (`complete_pick`) | 50 | 60 |
| Undo or redo (`editor.undo`) | 48 | 334 |
| Changed the pocket grid (`binder.grid`) | 48 | 72 |
| Searched stock art (`art.search`) | 41 | 134 |
| Opened the daily puzzle (`puzzle.opened`) | 36 | 47 |
| Used the tray (`pocket.tray`) | 33 | 238 |
| Removed a page (`page.remove`) | 33 | 143 |
| pocket.art_edit (`pocket.art_edit`) | 32 | 224 |
| Backed out of a limit (`cap.gate_dismissed`) | 31 | 54 |
| Changed the page background (`binder.background`) | 29 | 137 |
| Deleted a binder (`binder.delete`) | 29 | 44 |
| Opened Fill page (`autofill.open`) | 28 | 88 |
| Picked a set over the page cap in the wizard (`wizard.cap_ask`) | 23 | 33 |
| Made a binder public or private (`binder.public`) | 21 | 24 |
| Saw the card-landed celebration (`walkthrough.celebration`) | 19 | 28 |
| Signed in (`auth.login`) | 18 | 24 |
| Google account already had a michi account (`auth.link_exists`) | 18 | 20 |
| Previewed the print sheets (`print.preview`) | 16 | 31 |
| Applied an arrangement (`arrange_pick`) | 16 | 26 |
| Changed binder styling (`binder.style`) | 14 | 60 |
| Set a pocket finish (`pocket.finish`) | 13 | 212 |
| arrange_shuffle (`arrange_shuffle`) | 13 | 74 |
| Opened Stripe Checkout (`offer.checkout_start`) | 12 | 17 |
| Tapped Create account on a wall (`signin.perk_click`) | 12 | 12 |
| art.tidy (`art.tidy`) | 10 | 62 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 10 | 60 |
| Answered the puzzle offer (`puzzle.choice`) | 10 | 10 |
| Split an art piece (`pocket.split`) | 9 | 66 |
| Styled a pocket (`pocket.style`) | 9 | 46 |
| Reordered pages (`page.reorder`) | 8 | 131 |
| Sign-in return ended without an account (`auth.callback_failed`) | 7 | 11 |
| Tried tri-color search (`demo.tricolor_search`) | 7 | 9 |
| Handed a binder page out as a picture (`page.picture`) | 6 | 23 |
| Tried the example import (`demo.csv_import`) | 6 | 15 |
| Clicked out to a store (`affiliate.click`) | 6 | 6 |
| puzzle.revealed (`puzzle.revealed`) | 6 | 6 |
| Opened the wishlist (`wishlist.shown`) | 6 | 6 |
| Started a PRO trial (`trial.start`) | 5 | 5 |
| csv.analyzed (`csv.analyzed`) | 4 | 132 |
| CSV import failed (`csv.import_failed`) | 4 | 39 |
| holiday.popup_cta (`holiday.popup_cta`) | 4 | 4 |
| Merged art pieces (`pocket.merge`) | 3 | 105 |
| Solved the daily puzzle (`puzzle.solved`) | 3 | 5 |
| Opened the feedback form (`feedback.shown`) | 3 | 3 |
| Renamed a binder (`binder.rename`) | 3 | 3 |
| Changed a binder cover (`binder.cover`) | 2 | 11 |
| Imported a CSV (`csv.import`) | 2 | 8 |
| collector.binder (`collector.binder`) | 2 | 3 |
| collector.print (`collector.print`) | 2 | 2 |
| Chose the pages a share shows (`share.pages_featured`) | 1 | 3 |
| Shared a card picture (`card.picture`) | 1 | 1 |
| Shared a binder link (`share.link`) | 1 | 1 |
| print.auto_download (`print.auto_download`) | 1 | 1 |
| Downloaded print sheets (`print.download`) | 1 | 1 |
| Voted on a wishlist idea (`wishlist.vote`) | 1 | 1 |
| Downloaded the full-size share image (`share.hires`) | 1 | 1 |
| Checkout could not be opened (`offer.checkout_failed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 1012 | 1791 |
| `/binder/:id` | 866 | 1808 |
| `/my-binders` | 673 | 1139 |
| `/welcome` | 292 | 338 |
| `/new-binder` | 177 | 279 |
| `/discover` | 113 | 252 |
| `/auth-callback` | 94 | 114 |
| `/michi-method` | 86 | 139 |
| `/plans` _(pricing)_ | 67 | 150 |
| `/browse` | 63 | 121 |
| `/collect` | 51 | 71 |
| `/learn` | 41 | 60 |

| Event | Fired | People |
| --- | ---: | ---: |
| Left a page (dwell recorded) (`page.leave`) | 9749 | 1134 |
| Viewed a page (`page.view`) | 6966 | 1288 |
| Moved or swapped a pocket (`pocket.move`) | 5466 | 150 |
| Added cards (`card.add`) | 4025 | 661 |
| Cleared pockets (`pocket.clear`) | 2142 | 128 |
| Session started (`session.start`) | 1790 | 1308 |
| Placed artwork (`pocket.art`) | 1634 | 92 |
| Reached a walkthrough step (`walkthrough.step`) | 943 | 689 |
| Created a binder (`binder.add`) | 794 | 732 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 775 | 693 |
| Added a page (`page.add`) | 643 | 131 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 512 | 512 |
| Opened Arrange (`arrange_open`) | 494 | 90 |
| Tried the theme search demo (`demo.theme_search`) | 432 | 88 |
| Pressed a landing-page button (`landing.cta`) | 393 | 361 |
| Undo or redo (`editor.undo`) | 372 | 55 |
| Left the walkthrough (`walkthrough.done`) | 335 | 320 |
| Ran a theme search that searched a synonym group (`similar_words.searched`) | 277 | 67 |
| Used the tray (`pocket.tray`) | 249 | 34 |
| Set a pocket finish (`pocket.finish`) | 247 | 14 |
| Opened the new-binder wizard (`wizard.shown`) | 247 | 180 |
| Picked a binder kind in the wizard (`wizard.kind`) | 246 | 163 |
| pocket.art_edit (`pocket.art_edit`) | 236 | 35 |
| Searched cards (`card.search`) | 229 | 95 |
| Saw a create-account wall (`signin.perk_shown`) | 225 | 118 |
| Hit a plan limit (`cap.gate_shown`) | 196 | 89 |
| Took a free taste of a PRO feature (`taste.used`) | 171 | 104 |
| Opened Complete page (`complete_open`) | 171 | 108 |
| Removed a page (`page.remove`) | 168 | 37 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 165 | 66 |
| Reordered pages (`page.reorder`) | 153 | 11 |
| Changed the page background (`binder.background`) | 143 | 31 |
| Searched stock art (`art.search`) | 134 | 41 |
| csv.analyzed (`csv.analyzed`) | 132 | 4 |
| Pressed Create in the wizard (`wizard.create`) | 128 | 112 |
| Fill page composed (`autofill.run`) | 127 | 78 |
| Started Google sign-in (`auth.oauth_start`) | 118 | 97 |
| Was shown a prompt (`prompt.shown`) | 118 | 105 |
| Merged art pieces (`pocket.merge`) | 115 | 4 |
| Answered a prompt (`prompt.answered`) | 114 | 102 |
| Opened Fill page (`autofill.open`) | 101 | 31 |
| Account created (`account.created`) | 94 | 83 |
| holiday.popup_shown (`holiday.popup_shown`) | 86 | 83 |
| Changed the pocket grid (`binder.grid`) | 76 | 51 |
| arrange_shuffle (`arrange_shuffle`) | 74 | 13 |
| Split an art piece (`pocket.split`) | 73 | 12 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 71 | 12 |
| art.tidy (`art.tidy`) | 65 | 11 |
| Changed binder styling (`binder.style`) | 62 | 15 |
| Completed a page (`complete_pick`) | 60 | 50 |
| Backed out of a limit (`cap.gate_dismissed`) | 59 | 34 |
| Opened the daily puzzle (`puzzle.opened`) | 50 | 38 |
| Deleted a binder (`binder.delete`) | 48 | 31 |
| Styled a pocket (`pocket.style`) | 47 | 10 |
| CSV import failed (`csv.import_failed`) | 39 | 4 |
| Signed in (`auth.login`) | 35 | 24 |
| Previewed the print sheets (`print.preview`) | 33 | 18 |
| Picked a set over the page cap in the wizard (`wizard.cap_ask`) | 33 | 23 |
| Saw the card-landed celebration (`walkthrough.celebration`) | 28 | 19 |
| Made a binder public or private (`binder.public`) | 26 | 23 |
| Applied an arrangement (`arrange_pick`) | 26 | 16 |
| Changed a binder cover (`binder.cover`) | 26 | 3 |
| Handed a binder page out as a picture (`page.picture`) | 23 | 6 |
| Google account already had a michi account (`auth.link_exists`) | 20 | 18 |
| Opened Stripe Checkout (`offer.checkout_start`) | 17 | 12 |
| Tried the example import (`demo.csv_import`) | 17 | 8 |
| Saw the returned-binder banner (`returned_binder.shown`) | 15 | 3 |
| Tapped Create account on a wall (`signin.perk_click`) | 12 | 12 |
| Sign-in return ended without an account (`auth.callback_failed`) | 11 | 7 |
| Answered the puzzle offer (`puzzle.choice`) | 10 | 10 |
| Tried tri-color search (`demo.tricolor_search`) | 9 | 7 |
| Opened the wishlist (`wishlist.shown`) | 8 | 7 |
| Solved the daily puzzle (`puzzle.solved`) | 8 | 5 |
| Imported a CSV (`csv.import`) | 8 | 2 |
| Clicked out to a store (`affiliate.click`) | 7 | 7 |
| puzzle.revealed (`puzzle.revealed`) | 6 | 6 |
| Started a PRO trial (`trial.start`) | 5 | 5 |
| Copied or moved a page to another binder (`page.send`) | 5 | 1 |
| holiday.popup_cta (`holiday.popup_cta`) | 5 | 5 |
| collector.binder (`collector.binder`) | 4 | 3 |
| Opened the feedback form (`feedback.shown`) | 3 | 3 |
| Renamed a binder (`binder.rename`) | 3 | 3 |
| Chose the pages a share shows (`share.pages_featured`) | 3 | 1 |
| collector.print (`collector.print`) | 2 | 2 |
| Shared a binder link (`share.link`) | 2 | 2 |
| Shared a card picture (`card.picture`) | 1 | 1 |
| print.auto_download (`print.auto_download`) | 1 | 1 |
| Downloaded print sheets (`print.download`) | 1 | 1 |
| Voted on a wishlist idea (`wishlist.vote`) | 1 | 1 |
| Downloaded the full-size share image (`share.hires`) | 1 | 1 |
| Checkout could not be opened (`offer.checkout_failed`) | 1 | 1 |

Instrumentation: 89/116 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `deploy.live`, `returned_binder.open`, `returned_binder.dismiss`, `account.deleted`, `demo.curation`, `demo.print`, `compose.pages_kept`, `pro.offer_shown`, `pro.offer_declined`, `trial.start_click`, `trial.start_failed`, `search.no_results`, `share.format`, `tcgscan.pairing_click`, `wizard.preview`, `story.build`, `feedback.submitted`, `feedback.failed`, `wishlist.vote_failed`, `wishlist.submitted`, `wishlist.submit_failed`, `offer_checkout_start`, `puzzle.guess_failed`, `page.duplicate`, `page.swap`, `page.compact`, `art.link`

Works, but not yet from a real user: `names.ideas`, `names.ideas_limit`, `share.qr`, `binder.rebuild_from_tcgscan`, `wizard.chat`, `wizard.reveal`, `wizard.reveal_continue`, `binder.duplicate`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

518 sessions · 1108 events · 6 accounts + 75 guests · median session 6s
Excluded: 146 sessions, 229 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 8 | 70 | 7 |
| 14d | 431 | 1073 | 30 |
| 30d | 518 | 1108 | 81 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **75** of 81 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **6** Signed-in account (100% of top)
- **2** Did anything past the open (33.3% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **36** Opened the app (44.4% of top)
- **34** Viewed a page (42% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **78** Started as a guest (100% of top)
- **32** Did anything at all (41% of top)
- **3** Submitted the upgrade (3.8% of top) — see gap `upgrade_unconfirmed`
- **0** Completed it (ground truth) (0% of top)

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `collections` | collection_list | 3 | 2 | _not recorded_ | _not recorded 3_ | _not recorded 3_<br>_trial rendered on 0 of 3_ | _none recorded_ |
| `collections` | scan | 1 | 1 | _not recorded_ | _not recorded 1_ | _not recorded 1_<br>_trial rendered on 0 of 1_ | _not recorded 1_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

### What guests did past the open

78 people opened as a guest across 513 sessions.

| How far they got | People | of 78 |
| --- | ---: | ---: |
| Opened and left | 46 | 59% |
| Looked at a page or two | 12 | 15.4% |
| Wandered the site | 16 | 20.5% |
| Built something | 4 | 5.1% |

Of the 4 who built something, **0** created an account.

**4** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Scanned a card (`scan.capture`) | 4 | 6 |
| Hit a plan limit (`cap.gate_shown`) | 3 | 4 |
| Account created (`account.created`) | 3 | 3 |
| Opened a card (`card.open`) | 2 | 26 |
| Scan failed (`scan.failed`) | 2 | 4 |
| Searched cards (`card.search`) | 2 | 4 |
| Created a collection (`collection.create`) | 2 | 2 |
| Signed in (`auth.login`) | 1 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/scan` | 26 | 44 |
| `/` | 24 | 71 |
| `/settings` | 11 | 34 |
| `/browse` | 8 | 313 |
| `/collection` | 8 | 44 |
| `/plans` _(pricing)_ | 4 | 14 |
| `/planned` | 3 | 5 |
| `/auth-callback` | 3 | 3 |
| `/card/:n` | 2 | 43 |
| `/sealed/:n` | 2 | 18 |
| `/support` | 2 | 4 |
| `/sessions` | 1 | 5 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 613 | 34 |
| Session started (`session.start`) | 441 | 36 |
| Opened a card (`card.open`) | 26 | 2 |
| Scanned a card (`scan.capture`) | 6 | 4 |
| Scan failed (`scan.failed`) | 4 | 2 |
| Hit a plan limit (`cap.gate_shown`) | 4 | 3 |
| Searched cards (`card.search`) | 4 | 2 |
| Account created (`account.created`) | 4 | 4 |
| Signed in (`auth.login`) | 3 | 3 |
| Created a collection (`collection.create`) | 2 | 2 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |

Instrumentation: 14/29 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `collection.rename`, `collection.card_add`, `trial.start`, `pro.offer_shown`, `trial.start_failed`, `affiliate.click`, `offer.checkout_start`, `offer.checkout_failed`, `iap.purchase_start`, `iap.purchase_result`, `scan.sealed_hint`, `collection.sealed_add`, `external_marketplace_search_clicked`, `bulk_edit_applied`, `iap.restore`

Works, but not yet from a real user: `card.add`, `collection.delete`, `collection.card_remove`

## Doggle

958 sessions · 3714 events · 3 accounts + 907 guests · median session 1s
Excluded: 674 sessions, 4927 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 13 | 53 | 11 |
| 14d | 652 | 2538 | 638 |
| 30d | 958 | 3714 | 910 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **908** Arrived signed out (100% of top)
- **889** Viewed any screen (97.9% of top)
- **1** Created an account (0.1% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `PARK1` (flyer) | 10 | 10 | 0 | 0 |

### What we asked of people

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| walk:group:help (`walk:group:help`) | 2 | 2 | — _(+2 left with it open — tab shut before an answer)_ |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

908 people opened as a guest across 927 sessions.

| How far they got | People | of 908 |
| --- | ---: | ---: |
| Opened and left | 10 | 1.1% |
| Looked at a page or two | 825 | 90.9% |
| Wandered the site | 73 | 8% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 891 | 1196 |
| Opened a Discover panel (`discover.tab`) | 21 | 31 |
| Was shown a prompt (`prompt.shown`) | 2 | 2 |
| Device reachable by push (`push.token_registered`) | 1 | 6 |
| recs.shown (`recs.shown`) | 1 | 4 |
| Tapped a notification (`push.opened`) | 1 | 3 |
| Asked for location permission (`location.permission_requested`) | 1 | 2 |
| location.status (`location.status`) | 1 | 2 |
| Asked for push permission (`push.permission_requested`) | 1 | 1 |
| Location permission answered (`location.permission_result`) | 1 | 1 |
| Push permission answered (`push.permission_result`) | 1 | 1 |
| Account created (`account.created`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 331 | 348 |
| `Login` | 260 | 301 |
| `Blog` | 128 | 172 |
| `BlogPost` | 92 | 105 |
| `Home` | 62 | 84 |
| `DogProfile` | 24 | 24 |
| `MeetupDetail` | 24 | 24 |
| `DogPlaceDetail` | 23 | 23 |
| `Settings` | 21 | 31 |
| `Discover` | 21 | 21 |
| `PrivacyPolicy` | 20 | 20 |
| `InviteLanding` | 20 | 20 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 1437 | 891 |
| Session revalidated (plumbing) (`session.check`) | 1229 | 893 |
| Session started (`session.start`) | 939 | 887 |
| Opened a Discover panel (`discover.tab`) | 35 | 22 |
| Device reachable by push (`push.token_registered`) | 20 | 2 |
| recs.shown (`recs.shown`) | 13 | 2 |
| location.status (`location.status`) | 11 | 2 |
| Asked for location permission (`location.permission_requested`) | 8 | 3 |
| Tapped a notification (`push.opened`) | 7 | 2 |
| Location permission answered (`location.permission_result`) | 4 | 3 |
| Checked in at a place (`checkin.create`) | 4 | 1 |
| recs.acted (`recs.acted`) | 2 | 1 |
| Was shown a prompt (`prompt.shown`) | 2 | 2 |
| Asked for push permission (`push.permission_requested`) | 1 | 1 |
| Push permission answered (`push.permission_result`) | 1 | 1 |
| Account created (`account.created`) | 1 | 1 |

Instrumentation: 21/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `walk.cancel`, `session.expired`, `auth.signout_decision`

Works, but not yet from a real user: `auth.login`, `prompt.answered`, `walk.start`, `walk.end`, `checkin.out`, `checkin.failed`, `session.recovered`, `session.unreachable`

## Pickleague

403 sessions · 1406 events · 0 accounts + 330 guests · median session 1s
Excluded: 164 sessions, 2346 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 0 | 0 | 0 |
| 7d | 20 | 38 | 18 |
| 14d | 244 | 537 | 229 |
| 30d | 403 | 1406 | 330 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **330** Arrived signed out (100% of top)
- **312** Viewed any screen (94.5% of top)
- **1** Created an account (0.3% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

330 people opened as a guest across 403 sessions.

| How far they got | People | of 330 |
| --- | ---: | ---: |
| Opened and left | 16 | 4.8% |
| Looked at a page or two | 261 | 79.1% |
| Wandered the site | 53 | 16.1% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| appstore.click (`appstore.click`) | 56 | 487 |
| auth.reset_requested (`auth.reset_requested`) | 4 | 4 |
| Account created (`account.created`) | 3 | 4 |
| recs.shown (`recs.shown`) | 2 | 2 |
| auth.link_failed (`auth.link_failed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 161 | 331 |
| `CheckEmail` | 62 | 64 |
| `Register` | 60 | 66 |
| `InviteLanding` | 16 | 16 |
| `GuestJoin` | 15 | 15 |
| `Goldens` | 10 | 10 |
| `DevShareCards` | 3 | 3 |
| `FirstRun` | 2 | 2 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 507 | 312 |
| appstore.click (`appstore.click`) | 487 | 56 |
| Session started (`session.start`) | 401 | 310 |
| Account created (`account.created`) | 4 | 3 |
| auth.reset_requested (`auth.reset_requested`) | 4 | 4 |
| recs.shown (`recs.shown`) | 2 | 2 |
| auth.link_failed (`auth.link_failed`) | 1 | 1 |

Instrumentation: 4/4 events verified firing (all traffic, all time).

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

### Desktop editor pocket-menu actions were unclickable (Replace, Fill page, Similar, More) `michi_desktop_pocket_menu_dead` (medium, fixed)

Reported by Michi-Maker 2026-11-12 (MIC-017): a regression from michi a6444a5 made desktop pocket-menu buttons fall through to the card. WINDOW: from production promote e683833 (deploy.live 2026-11-11 08:02:10 UTC; the earlier promote daae6a9 did not contain it) until 3281a85 (fix 8009edd, deploy.live 2026-11-12 04:33:47 UTC, queue b6e397), about 20.5 hours. NOT dev-flagged: every desktop (wide, non-phone) editor user, guests included. Phones use the Pocket sheet and were unaffected. Michi confirmed the fix on production with real mouse clicks at 1280 px.

**Effect:** a zero or a dip in desktop autofill.open, complete_open and other menu-started actions inside the window means 'could not', not 'did not want to'. Do not read it as demand; compare desktop vs phone, and exclude the window from before/after comparisons of the editor tools.

**Fix:** Fixed by 8009edd (production 3281a85, 2026-11-12 04:33:47 UTC). No event changes.

### trial.start_click is shipped but has never fired `trial_click_unproven` (important, fixed)

Until 2026-08-31 a press of the trial button left nothing behind unless the RPC answered: 'they never pressed' and 'they pressed and it did not come back' were the same silence (the failure class trial_start_dropped was written about). trackTrialStartClick now fires before the RPC in both TrialCta call paths, but the build carrying it reached production on 2026-08-31 19:23 UTC - dated by the first cap.gate_shown row carrying the `offer` prop, which shipped in the same change. So the 'Pressed start' stage has about a day of coverage and has never recorded a row.

**Effect:** the stage cannot yet distinguish 'nobody pressed' from 'we were not watching'. Read the OUTCOME from ground truth instead, which does not have this hole

**Fix:** Nothing to build - wait for traffic. Promote to fixed on the first observed trial.start_click. A continued zero once the stage has a few weeks behind it IS a finding, and a strong one, because the outcome it would explain is already established below.
