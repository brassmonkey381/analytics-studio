# Event analytics — last 30 days

Collected 2026-11-13T15:07:54.538Z. Own/QA/automated accounts excluded.
Row cap: the lane fetches at most 50000 rows per project and hit it for michi-maker, tcgscan. Rows older than 2026-11-02 17:06:22.362125+00 were dropped, so any window reaching back past that point is a floor there; windows inside it are exact.
The HTML report carries a 24h / 7d / 14d / 30d toggle and hover rosters; this file is the 30d view.

## Michi-Maker

6175 sessions · 38723 events · 158 accounts + 4657 guests · median session 11s
Excluded: 2423 sessions, 9969 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 128 | 2072 | 121 |
| 7d | 1576 | 25780 | 1232 |
| 14d | 4665 | 38723 | 3727 |
| 30d | 6175 | 38723 | 4815 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **4657** of 4815 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **158** Signed-in account (100% of top)
- **101** Did anything past the open (63.9% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### The wall: refusal to trial

_When a plan limit actually stops someone, does the trial offer sitting there convert them?_

- **107** Was stopped by a plan limit (2.2% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Pressed start (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **1917** Opened the app (39.8% of top)
- **1872** Viewed a page (38.9% of top)
- **13** Tried a demo (0.3% of top)
- **12** Made something real (0.2% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **4767** Started as a guest (100% of top)
- **1870** Did anything at all (39.2% of top)
- **70** Submitted the upgrade (1.5% of top) — see gap `upgrade_unconfirmed`
- **70** Completed it (ground truth) (1.5% of top)

### Print & QR campaigns

| Campaign | People | Sessions | Converted on a visit | Signups carrying the code |
| --- | ---: | ---: | ---: | ---: |
| `rd_rainbow_image` (reddit · paid_social) | 2238 | 2455 | 24 | 16 |
| `rd_lidi_image` (reddit · paid_social) | 829 | 904 | 14 | 8 |
| `rd_coverflow_4x5` (reddit · paid_social) | 207 | 220 | 0 | 0 |
| `rd_lidi_video` (reddit · test) | 14 | 14 | 0 | 0 |
| `ig_coverflow_loop` (instagram · organic_social) | 10 | 10 | 0 | 0 |
| `sk_3c_a1_p1_four` (threads · organic_social) | 8 | 8 | 0 | 0 |
| `sk_dr_a1_p1_four` (threads · organic_social) | 7 | 7 | 0 | 0 |
| `test_reddit_skip` (reddit · paid_social) | 2 | 2 | 0 | 0 |
| `test` (reddit · cpc) | 2 | 2 | 0 | 0 |
| `ig_bio` (instagram · organic_social) | 2 | 2 | 0 | 0 |
| `sk_3c_a1_p1_story` (instagram · organic_social) | 2 | 2 | 0 | 0 |
| `test_reddit_new` (reddit · paid_social) | 1 | 1 | 0 | 0 |
| `rd_rainbow_video` (reddit · test) | 1 | 1 | 0 | 0 |
| `sk_dr_a1_p1_story` (instagram · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_group` (facebook · organic_social) | 1 | 1 | 0 | 0 |
| `sk_dr_b_story` (instagram · organic_social) | 1 | 1 | 0 | 0 |

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `themeSearch` | binder_editor | 80 | 45 | 30 | dialog 43, toast 37 | upgrade 34, signin 9, toast 37<br>_trial rendered on 0 of 80_ | not_now 18, close 19 |
| `findSimilar` | binder_editor | 53 | 28 | 22 | dialog 7, toast 46 | upgrade 7, toast 46<br>_trial rendered on 0 of 53_ | not_now 4, close 3 |
| `artUploads` | binder_editor | 33 | 12 | 5 | dialog 10, toast 23 | upgrade 9, signin 1, toast 23<br>_trial rendered on 0 of 33_ | not_now 8, close 1 |
| `binders` | my_binders | 31 | 26 | 25 | dialog 12, toast 19 | upgrade 4, signin 8, toast 19<br>_trial rendered on 0 of 31_ | not_now 7, close 2 |
| `themeSearch` | browse | 19 | 14 | 10 | dialog 15, toast 4 | upgrade 6, signin 9, toast 4<br>_trial rendered on 0 of 19_ | not_now 6, close 5 |
| `binders` | browse | 2 | 2 | 2 | dialog 1, toast 1 | signin 1, toast 1<br>_trial rendered on 0 of 2_ | not_now 1 |
| `binders` | build_wizard | 1 | 1 | 1 | inline 1 | signin 1<br>_trial rendered on 0 of 1_ | _none recorded_ |
| `pagesPerBinder` | home | 1 | 1 | 1 | toast 1 | toast 1<br>_trial rendered on 0 of 1_ | _none recorded_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| The sharing attestation (`rights-attestation`) | 79 | 76 | accepted 30, dismissed 45, abandoned 2 _(+2 left with it open — tab shut before an answer)_ |
| Their profile photo (`avatar-consent`) | 7 | 7 | accepted 1, dismissed 2, abandoned 3 _(+1 left with it open — tab shut before an answer)_ |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

4767 people opened as a guest across 5734 sessions.

| How far they got | People | of 4767 |
| --- | ---: | ---: |
| Opened and left | 2892 | 60.7% |
| Looked at a page or two | 434 | 9.1% |
| Wandered the site | 172 | 3.6% |
| Built something | 1269 | 26.6% |

Of the 1269 who built something, **66** created an account.

**44** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Created a binder (`binder.add`) | 1261 | 1305 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 1233 | 1362 |
| Reached a walkthrough step (`walkthrough.step`) | 1230 | 1560 |
| Added cards (`card.add`) | 1213 | 3359 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 1194 | 1194 |
| Left the walkthrough (`walkthrough.done`) | 434 | 449 |
| Pressed a landing-page button (`landing.cta`) | 231 | 250 |
| Moved or swapped a pocket (`pocket.move`) | 156 | 2256 |
| Saw a create-account wall (`signin.perk_shown`) | 146 | 267 |
| Opened the new-binder wizard (`wizard.shown`) | 139 | 159 |
| Took a free taste of a PRO feature (`taste.used`) | 120 | 170 |
| Opened Complete page (`complete_open`) | 114 | 170 |
| Tried the theme search demo (`demo.theme_search`) | 106 | 418 |
| Hit a plan limit (`cap.gate_shown`) | 104 | 214 |
| Cleared pockets (`pocket.clear`) | 102 | 941 |
| Searched cards (`card.search`) | 97 | 148 |
| Added a page (`page.add`) | 88 | 382 |
| Fill page composed (`autofill.run`) | 88 | 107 |
| Started Google sign-in (`auth.oauth_start`) | 82 | 121 |
| Opened Arrange (`arrange_open`) | 73 | 339 |
| Account created (`account.created`) | 70 | 80 |
| Was shown a prompt (`prompt.shown`) | 70 | 78 |
| Answered a prompt (`prompt.answered`) | 69 | 74 |
| Placed artwork (`pocket.art`) | 64 | 825 |
| Completed a page (`complete_pick`) | 62 | 69 |
| Picked a binder kind in the wizard (`wizard.kind`) | 56 | 66 |
| Opened the daily puzzle (`puzzle.opened`) | 50 | 59 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 47 | 104 |
| Backed out of a limit (`cap.gate_dismissed`) | 46 | 71 |
| Opened Fill page (`autofill.open`) | 40 | 77 |
| Pressed Create in the wizard (`wizard.create`) | 38 | 40 |
| Undo or redo (`editor.undo`) | 35 | 145 |
| Searched stock art (`art.search`) | 35 | 95 |
| Changed the pocket grid (`binder.grid`) | 30 | 54 |
| Ran a theme search that searched a synonym group (`similar_words.searched`) | 28 | 86 |
| Deleted a binder (`binder.delete`) | 27 | 32 |
| Removed a page (`page.remove`) | 26 | 112 |
| Saw the card-landed celebration (`walkthrough.celebration`) | 24 | 37 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 23 | 78 |
| Google account already had a michi account (`auth.link_exists`) | 20 | 27 |
| Changed the page background (`binder.background`) | 19 | 84 |
| Made a binder public or private (`binder.public`) | 18 | 19 |
| Signed in (`auth.login`) | 17 | 28 |
| Tapped Create account on a wall (`signin.perk_click`) | 17 | 20 |
| pocket.art_edit (`pocket.art_edit`) | 16 | 86 |
| Solved the daily puzzle (`puzzle.solved`) | 15 | 15 |
| Previewed the print sheets (`print.preview`) | 12 | 25 |
| Clicked out to a store (`affiliate.click`) | 12 | 15 |
| Answered the puzzle offer (`puzzle.choice`) | 11 | 11 |
| Picked a set over the page cap in the wizard (`wizard.cap_ask`) | 10 | 12 |
| Opened Stripe Checkout (`offer.checkout_start`) | 9 | 13 |
| Set a pocket finish (`pocket.finish`) | 8 | 214 |
| Split an art piece (`pocket.split`) | 7 | 34 |
| Reordered pages (`page.reorder`) | 7 | 34 |
| arrange_shuffle (`arrange_shuffle`) | 7 | 31 |
| Tried tri-color search (`demo.tricolor_search`) | 7 | 9 |
| Handed a binder page out as a picture (`page.picture`) | 7 | 9 |
| art.tidy (`art.tidy`) | 6 | 31 |
| Changed binder styling (`binder.style`) | 6 | 13 |
| Opened the wishlist (`wishlist.shown`) | 6 | 6 |
| Opened the feedback form (`feedback.shown`) | 5 | 5 |
| Tried the example import (`demo.csv_import`) | 4 | 5 |
| Started a PRO trial (`trial.start`) | 4 | 4 |
| puzzle.revealed (`puzzle.revealed`) | 4 | 4 |
| Saw the wizard's card preview (`wizard.preview`) | 4 | 4 |
| Shared a card picture (`card.picture`) | 4 | 4 |
| csv.analyzed (`csv.analyzed`) | 3 | 64 |
| Changed a binder cover (`binder.cover`) | 3 | 25 |
| Applied an arrangement (`arrange_pick`) | 3 | 8 |
| Styled a pocket (`pocket.style`) | 3 | 8 |
| Sign-in return ended without an account (`auth.callback_failed`) | 3 | 6 |
| Renamed a binder (`binder.rename`) | 3 | 3 |
| Used the tray (`pocket.tray`) | 3 | 3 |
| Merged art pieces (`pocket.merge`) | 2 | 22 |
| CSV import failed (`csv.import_failed`) | 2 | 9 |
| Opened an outside art search (`art.link`) | 2 | 2 |
| print.auto_download (`print.auto_download`) | 2 | 2 |
| Downloaded print sheets (`print.download`) | 2 | 2 |
| Account deleted (`account.deleted`) | 1 | 2 |
| Removed blank pages (`page.compact`) | 1 | 1 |
| collector.print (`collector.print`) | 1 | 1 |
| Shared a binder link (`share.link`) | 1 | 1 |
| Downloaded the full-size share image (`share.hires`) | 1 | 1 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Imported a CSV (`csv.import`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 1606 | 2538 |
| `/binder/:id` | 1360 | 2036 |
| `/my-binders` | 1265 | 1647 |
| `/welcome` | 419 | 502 |
| `/new-binder` | 139 | 160 |
| `/discover` | 113 | 262 |
| `/browse` | 111 | 182 |
| `/michi-method` | 92 | 164 |
| `/auth-callback` | 81 | 119 |
| `/collect` | 62 | 86 |
| `/daily` | 49 | 58 |
| `/learn` | 44 | 71 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 8569 | 1885 |
| Left a page (dwell recorded) (`page.leave`) | 7499 | 1213 |
| Added cards (`card.add`) | 3628 | 1222 |
| Moved or swapped a pocket (`pocket.move`) | 2723 | 164 |
| Session started (`session.start`) | 2503 | 1917 |
| Reached a walkthrough step (`walkthrough.step`) | 1564 | 1231 |
| Was shown the binder walkthrough (`walkthrough.shown`) | 1364 | 1234 |
| Created a binder (`binder.add`) | 1307 | 1263 |
| Cleared pockets (`pocket.clear`) | 1274 | 110 |
| Skipped the landing page (tagged arrival) (`landing.skip`) | 1197 | 1197 |
| Placed artwork (`pocket.art`) | 1037 | 68 |
| Left the walkthrough (`walkthrough.done`) | 450 | 435 |
| Tried the theme search demo (`demo.theme_search`) | 428 | 110 |
| Added a page (`page.add`) | 428 | 95 |
| Opened Arrange (`arrange_open`) | 399 | 78 |
| Saw a create-account wall (`signin.perk_shown`) | 286 | 153 |
| Pressed a landing-page button (`landing.cta`) | 252 | 233 |
| Set a pocket finish (`pocket.finish`) | 222 | 9 |
| Hit a plan limit (`cap.gate_shown`) | 220 | 107 |
| Undo or redo (`editor.undo`) | 215 | 40 |
| Took a free taste of a PRO feature (`taste.used`) | 180 | 124 |
| Searched cards (`card.search`) | 172 | 101 |
| Opened Complete page (`complete_open`) | 170 | 114 |
| Opened the new-binder wizard (`wizard.shown`) | 160 | 140 |
| Removed a page (`page.remove`) | 150 | 30 |
| Was offered the daily puzzle (`puzzle.offer_shown`) | 140 | 56 |
| Started Google sign-in (`auth.oauth_start`) | 121 | 82 |
| Fill page composed (`autofill.run`) | 113 | 89 |
| pocket.art_edit (`pocket.art_edit`) | 106 | 18 |
| Searched stock art (`art.search`) | 98 | 37 |
| Changed the page background (`binder.background`) | 96 | 21 |
| Ran a theme search that searched a synonym group (`similar_words.searched`) | 92 | 30 |
| Merged art pieces (`pocket.merge`) | 90 | 3 |
| Opened Fill page (`autofill.open`) | 88 | 44 |
| Guessed at the puzzle (`puzzle.guess_submitted`) | 87 | 24 |
| Was shown a prompt (`prompt.shown`) | 86 | 77 |
| Answered a prompt (`prompt.answered`) | 83 | 76 |
| Account created (`account.created`) | 80 | 70 |
| Backed out of a limit (`cap.gate_dismissed`) | 74 | 49 |
| Completed a page (`complete_pick`) | 69 | 62 |
| Picked a binder kind in the wizard (`wizard.kind`) | 66 | 56 |
| csv.analyzed (`csv.analyzed`) | 64 | 3 |
| Opened the daily puzzle (`puzzle.opened`) | 63 | 52 |
| Changed the pocket grid (`binder.grid`) | 58 | 32 |
| Split an art piece (`pocket.split`) | 50 | 8 |
| art.tidy (`art.tidy`) | 47 | 7 |
| Pressed Create in the wizard (`wizard.create`) | 40 | 38 |
| Saw the card-landed celebration (`walkthrough.celebration`) | 37 | 24 |
| Reordered pages (`page.reorder`) | 35 | 8 |
| Deleted a binder (`binder.delete`) | 34 | 28 |
| arrange_shuffle (`arrange_shuffle`) | 32 | 8 |
| Signed in (`auth.login`) | 32 | 18 |
| Google account already had a michi account (`auth.link_exists`) | 27 | 20 |
| Previewed the print sheets (`print.preview`) | 27 | 14 |
| Changed a binder cover (`binder.cover`) | 25 | 3 |
| Saw the returned-binder banner (`returned_binder.shown`) | 23 | 3 |
| Tapped Create account on a wall (`signin.perk_click`) | 20 | 17 |
| Made a binder public or private (`binder.public`) | 19 | 18 |
| Solved the daily puzzle (`puzzle.solved`) | 18 | 16 |
| Clicked out to a store (`affiliate.click`) | 16 | 13 |
| Changed binder styling (`binder.style`) | 16 | 7 |
| Used the tray (`pocket.tray`) | 15 | 5 |
| Opened Stripe Checkout (`offer.checkout_start`) | 13 | 9 |
| Picked a set over the page cap in the wizard (`wizard.cap_ask`) | 12 | 10 |
| Answered the puzzle offer (`puzzle.choice`) | 11 | 11 |
| Styled a pocket (`pocket.style`) | 10 | 4 |
| Tried tri-color search (`demo.tricolor_search`) | 9 | 7 |
| Handed a binder page out as a picture (`page.picture`) | 9 | 7 |
| CSV import failed (`csv.import_failed`) | 9 | 2 |
| Applied an arrangement (`arrange_pick`) | 8 | 3 |
| Opened the wishlist (`wishlist.shown`) | 7 | 7 |
| Tried the example import (`demo.csv_import`) | 7 | 6 |
| Sign-in return ended without an account (`auth.callback_failed`) | 6 | 3 |
| Opened the feedback form (`feedback.shown`) | 5 | 5 |
| Started a PRO trial (`trial.start`) | 4 | 4 |
| puzzle.revealed (`puzzle.revealed`) | 4 | 4 |
| Saw the wizard's card preview (`wizard.preview`) | 4 | 4 |
| Shared a card picture (`card.picture`) | 4 | 4 |
| Renamed a binder (`binder.rename`) | 3 | 3 |
| Opened an outside art search (`art.link`) | 2 | 2 |
| print.auto_download (`print.auto_download`) | 2 | 2 |
| Downloaded print sheets (`print.download`) | 2 | 2 |
| Account deleted (`account.deleted`) | 2 | 1 |
| Removed blank pages (`page.compact`) | 1 | 1 |
| collector.print (`collector.print`) | 1 | 1 |
| Shared a binder link (`share.link`) | 1 | 1 |
| Downloaded the full-size share image (`share.hires`) | 1 | 1 |
| Tried the print example (`demo.print`) | 1 | 1 |
| Imported a CSV (`csv.import`) | 1 | 1 |

Instrumentation: 88/116 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `deploy.live`, `returned_binder.open`, `returned_binder.dismiss`, `demo.curation`, `compose.pages_kept`, `pro.offer_shown`, `pro.offer_declined`, `names.ideas_limit`, `trial.start_click`, `trial.start_failed`, `search.no_results`, `share.format`, `share.qr`, `tcgscan.pairing_click`, `wizard.reveal`, `wizard.reveal_continue`, `story.build`, `feedback.submitted`, `feedback.failed`, `wishlist.vote`, `wishlist.vote_failed`, `wishlist.submitted`, `wishlist.submit_failed`, `offer.checkout_failed`, `offer_checkout_start`, `puzzle.guess_failed`, `page.duplicate`, `page.swap`

Works, but not yet from a real user: `names.ideas`, `binder.rebuild_from_tcgscan`, `wizard.chat`, `binder.duplicate`, `page.send`, `share.pages_featured`

Registered, not yet fired: `share.link_created`, `share.link_copied`, `share.link_opened`, `binder.reshare`

## TCGScan

139 sessions · 220 events · 7 accounts + 75 guests · median session 16s
Excluded: 256 sessions, 1088 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 3 | 8 | 2 |
| 7d | 32 | 90 | 22 |
| 14d | 71 | 220 | 45 |
| 30d | 139 | 220 | 82 |

### PRO trial: awareness to activation

_Of the people a trial can even be offered to, how many see it, and how many start one?_

> **75** of 82 people in this window are guests and are not counted here. Guests are set aside, not counted as a drop-off. useTrial returns 'ineligible' with no session (use-trial.ts, the fetch effect returns early for guests), so TrialCta renders null and pro.offer_shown cannot fire for a signed-out visitor. Counting them made a structural impossibility look like a 95% leak. Their route into this population is the signup funnel above.

- **7** Signed-in account (100% of top)
- **2** Did anything past the open (28.6% of top)
- **0** Was shown the PRO offer (0% of top)
- **0** Started a PRO trial (0% of top)

### First-session activation

_Do people who open the app ever do the core thing it is for?_

- **35** Opened the app (42.7% of top)
- **34** Viewed a page (41.5% of top)
- **0** Tried a demo (0% of top)
- **0** Made something real (0% of top)

### Guest to account

_Do anonymous guests ever convert into real accounts, and does the upgrade actually complete?_

- **80** Started as a guest (100% of top)
- **34** Did anything at all (42.5% of top)
- **3** Submitted the upgrade (3.8% of top) — see gap `upgrade_unconfirmed`
- **2** Completed it (ground truth) (2.5% of top)

### What we asked of people

| Wall | Where | Shown | People | Guests | How | Offer | Backed out |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `collections` | collection_list | 3 | 1 | _not recorded_ | _not recorded 3_ | _not recorded 3_<br>_trial rendered on 0 of 3_ | _not recorded 1_ |

A row is one wall — the `limit_key` and the surface it was met on. **Shown** counts impressions of the block, not people sitting at a cap: an account can be at 16 of 16 for weeks and emit nothing. The **Offer** column is two things: what the wall said it was about to draw, then what the stream saw render (a `pro.offer_shown` in the same session on the same `surface`, within a minute). Where they disagree, the second is the truth.

### What guests did past the open

80 people opened as a guest across 134 sessions.

| How far they got | People | of 80 |
| --- | ---: | ---: |
| Opened and left | 46 | 57.5% |
| Looked at a page or two | 18 | 22.5% |
| Wandered the site | 15 | 18.8% |
| Built something | 1 | 1.3% |

Of the 1 who built something, **0** created an account.

**3** guests walked to a pricing page; **0** saw the PRO offer. `TrialCta` renders only when `isSignedIn && !is_anonymous`, so a guest there sees no offer by design.

| Guest action | People | Times |
| --- | ---: | ---: |
| Account created (`account.created`) | 3 | 4 |
| Signed in (`auth.login`) | 3 | 3 |
| scan.riffle_pick (`scan.riffle_pick`) | 1 | 3 |
| Hit a plan limit (`cap.gate_shown`) | 1 | 3 |
| Scanned a card (`scan.capture`) | 1 | 2 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |
| Scan failed (`scan.failed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `/` | 25 | 57 |
| `/scan` | 23 | 43 |
| `/settings` | 9 | 15 |
| `/collection` | 6 | 13 |
| `/browse` | 4 | 9 |
| `/plans` _(pricing)_ | 3 | 4 |
| `/auth-callback` | 3 | 4 |
| `/planned` | 1 | 2 |
| `/ui-reference` | 1 | 1 |
| `/sessions` | 1 | 1 |
| `/support` | 1 | 1 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 150 | 34 |
| Session started (`session.start`) | 53 | 35 |
| Account created (`account.created`) | 4 | 3 |
| Signed in (`auth.login`) | 3 | 3 |
| scan.riffle_pick (`scan.riffle_pick`) | 3 | 1 |
| Hit a plan limit (`cap.gate_shown`) | 3 | 1 |
| Scanned a card (`scan.capture`) | 2 | 1 |
| Backed out of a limit (`cap.gate_dismissed`) | 1 | 1 |
| Scan failed (`scan.failed`) | 1 | 1 |

Instrumentation: 19/29 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `card.search`, `trial.start`, `pro.offer_shown`, `trial.start_failed`, `offer.checkout_failed`, `iap.purchase_start`, `iap.purchase_result`, `scan.sealed_hint`, `collection.sealed_add`, `iap.restore`

Works, but not yet from a real user: `card.add`, `card.open`, `collection.create`, `collection.rename`, `collection.delete`, `collection.card_add`, `collection.card_remove`, `affiliate.click`, `offer.checkout_start`, `external_marketplace_search_clicked`, `bulk_edit_applied`

## Doggle

592 sessions · 2303 events · 6 accounts + 544 guests · median session 2s
Excluded: 876 sessions, 7460 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 1 | 4 | 5 |
| 7d | 80 | 331 | 70 |
| 14d | 235 | 891 | 207 |
| 30d | 592 | 2303 | 550 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Doggle accounts?_

- **548** Arrived signed out (100% of top)
- **521** Viewed any screen (95.1% of top)
- **4** Created an account (0.7% of top) — see gap `doggle_oauth_signup_untracked`
- **0** Signed in on that visit (0% of top)

### What we asked of people

| Prompt | Shown | People | What came back |
| --- | ---: | ---: | --- |
| points:dog_place_checkin (`points:dog_place_checkin`) | 1 | 1 | accepted 1 |
| points:walk_complete (`points:walk_complete`) | 1 | 1 | accepted 1 |

**dismissed** is a closed dialog, **abandoned** is a screen left with it open, **left with it open** is a tab shut before either — three different silences. Two of these are a privacy correction and a legal attestation: their numbers are a record of what was asked and answered, never a rate to drive up.

### What guests did past the open

548 people opened as a guest across 544 sessions.

| How far they got | People | of 548 |
| --- | ---: | ---: |
| Opened and left | 10 | 1.8% |
| Looked at a page or two | 523 | 95.4% |
| Wandered the site | 15 | 2.7% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| Session revalidated (plumbing) (`session.check`) | 530 | 672 |
| Device reachable by push (`push.token_registered`) | 4 | 22 |
| Asked for location permission (`location.permission_requested`) | 4 | 18 |
| Location permission answered (`location.permission_result`) | 4 | 14 |
| Account created (`account.created`) | 4 | 4 |
| Opened a Discover panel (`discover.tab`) | 3 | 21 |
| Asked for push permission (`push.permission_requested`) | 3 | 3 |
| Push permission answered (`push.permission_result`) | 3 | 3 |
| recs.shown (`recs.shown`) | 1 | 4 |
| Tapped a notification (`push.opened`) | 1 | 3 |
| location.status (`location.status`) | 1 | 2 |
| Started a walk (`walk.start`) | 1 | 1 |
| Was shown a prompt (`prompt.shown`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |
| Answered a prompt (`prompt.answered`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Landing` | 491 | 492 |
| `Login` | 48 | 64 |
| `Social` | 5 | 10 |
| `Onboarding` | 4 | 7 |
| `MeetupDetail` | 4 | 4 |
| `Home` | 3 | 50 |
| `Discover` | 3 | 18 |
| `Mail` | 3 | 4 |
| `Blog` | 3 | 4 |
| `Profile` | 2 | 13 |
| `PetHome` | 2 | 10 |
| `UserProfile` | 2 | 6 |

| Event | Fired | People |
| --- | ---: | ---: |
| Viewed a page (`page.view`) | 821 | 523 |
| Session revalidated (plumbing) (`session.check`) | 719 | 532 |
| Session started (`session.start`) | 576 | 518 |
| Device reachable by push (`push.token_registered`) | 47 | 5 |
| Asked for location permission (`location.permission_requested`) | 32 | 6 |
| Location permission answered (`location.permission_result`) | 25 | 6 |
| Opened a Discover panel (`discover.tab`) | 25 | 4 |
| recs.shown (`recs.shown`) | 13 | 2 |
| location.status (`location.status`) | 11 | 2 |
| Tapped a notification (`push.opened`) | 8 | 2 |
| Checked in at a place (`checkin.create`) | 6 | 1 |
| Account created (`account.created`) | 4 | 4 |
| Asked for push permission (`push.permission_requested`) | 3 | 3 |
| Push permission answered (`push.permission_result`) | 3 | 3 |
| Was shown a prompt (`prompt.shown`) | 2 | 2 |
| Answered a prompt (`prompt.answered`) | 2 | 2 |
| Check-in refused (`checkin.failed`) | 2 | 1 |
| recs.acted (`recs.acted`) | 2 | 1 |
| Started a walk (`walk.start`) | 1 | 1 |
| Finished a walk (`walk.end`) | 1 | 1 |

Instrumentation: 22/24 events verified firing (all traffic, all time).

Never fired by anyone (unverified): `session.recovered`, `session.expired`

Works, but not yet from a real user: `auth.login`, `walk.cancel`, `checkin.out`, `session.unreachable`, `auth.signout_decision`

## Pickleague

166 sessions · 883 events · 0 accounts + 107 guests · median session 38s
Excluded: 219 sessions, 2754 events (our own, QA and automated accounts).

| Window | Sessions | Events | People |
| --- | ---: | ---: | ---: |
| 24h | 6 | 38 | 2 |
| 7d | 37 | 132 | 48 |
| 14d | 159 | 869 | 101 |
| 30d | 166 | 883 | 107 |

### Visitor to account

_Do signed-out visitors (QR scans included) become Pickleague accounts?_

- **107** Arrived signed out (100% of top)
- **100** Viewed any screen (93.5% of top)
- **1** Created an account (0.9% of top)
- **0** Signed in on that visit (0% of top)

### What guests did past the open

107 people opened as a guest across 166 sessions.

| How far they got | People | of 107 |
| --- | ---: | ---: |
| Opened and left | 5 | 4.7% |
| Looked at a page or two | 56 | 52.3% |
| Wandered the site | 46 | 43% |
| Built something | 0 | 0% |

| Guest action | People | Times |
| --- | ---: | ---: |
| appstore.click (`appstore.click`) | 49 | 435 |
| Account created (`account.created`) | 3 | 4 |
| recs.shown (`recs.shown`) | 2 | 2 |
| auth.link_failed (`auth.link_failed`) | 1 | 1 |

| Route guests reached | People | Views |
| --- | ---: | ---: |
| `Login` | 78 | 233 |
| `Register` | 19 | 24 |
| `CheckEmail` | 12 | 14 |
| `FirstRun` | 2 | 2 |

| Event | Fired | People |
| --- | ---: | ---: |
| appstore.click (`appstore.click`) | 435 | 49 |
| Viewed a page (`page.view`) | 273 | 100 |
| Session started (`session.start`) | 168 | 91 |
| Account created (`account.created`) | 4 | 3 |
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
