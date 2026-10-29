# Print & QR campaigns

Collected 2026-10-29T23:24:26.588Z. All-time unless a window is named.

**258 campaign arrivals** across 4 apps.

> 202 `?code=` arrival(s) ignored: OAuth sign-in callback codes (UUIDs), not campaigns. michi stopped recording them on 2026-10-29; these are older rows.

## Michi-Maker

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Reddit ad - Lidi image | `rd_lidi_image` | 93 | 90 | 90 | 0 | 4 |
| Reddit ad - Rainbow image | `rd_rainbow_image` | 82 | 81 | 80 | 0 | 2 |
| Reddit ad - Coverflow video (feed) | `rd_coverflow_4x5` | 75 | 74 | 74 | 0 | 1 |
| Instagram link in bio - Coverflow loop | `ig_coverflow_loop` | 4 | 4 | 4 | 0 | 0 |

Excluded from the above: 4 from our own/QA accounts, 0 verification scan(s).

## TCGScan

No campaign-tagged arrival, all time. A landing route carrying a code HAS been recorded here (first on 2026-10-11), so the capture path works end to end and this zero reads as "nobody scanned" — bearing in mind that the only codes seen so far may be our own verification scans, counted separately above.

## Doggle

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| (unregistered) | `verify_launch_qr` | 4 | 4 | 4 | 0 | 0 |

Excluded from the above: 0 from our own/QA accounts, 1 verification scan(s).

## Pickleague

No campaign-tagged arrival, all time. Excluded from that zero: 2 arrival(s) from our own/QA accounts, 0 verification scan(s) of our own. Landing routes are recorded (289 of 312 sessions, first on 2026-08-14) but not one has ever carried a code, so this zero cannot yet be told apart from a build that has not shipped — see qr_campaign_capture below.

## Printed codes

| Campaign | App | Code | Piece | Arrivals | Members |
| --- | --- | --- | --- | ---: | ---: |
| Oakland Card Show | michi-maker | `oakland_cardshow` | business card | 0 | 0 |
| Word of mouth | doggle | `wom` | flyer + business card | 0 | 0 |
| SHL dog park | doggle | `shl` | flyer + business card | 0 | 0 |
| Dog park handouts | doggle | `dogpark` | flyer + business card | 0 | 0 |
| Word of mouth | pickleague | `wom` | flyer + business card | 0 | 0 |
| The HUB Alameda | pickleague | `hub` | flyer + business card | 0 | 0 |
| Courtside handouts | pickleague | `court` | flyer + business card | 0 | 0 |
| Word of mouth | tcgscan | `wom` | flyer + business card | 0 | 0 |
| Card show | tcgscan | `cardshow` | flyer + business card | 0 | 0 |
| Word of mouth | michi-maker | `wom` | flyer + business card | 0 | 0 |
| Card show | michi-maker | `cardshow` | flyer + business card | 0 | 0 |
| Reddit ad - Coverflow video (feed) | michi-maker | `rd_coverflow_4x5` | reddit paid ad | 75 | 0 |
| Reddit ad - Coverflow video (desktop) | michi-maker | `rd_coverflow_16x9` | reddit paid ad | 0 | 0 |
| Reddit ad - Lidi video | michi-maker | `rd_lidi_video` | reddit paid ad | 0 | 0 |
| Reddit ad - Lidi image | michi-maker | `rd_lidi_image` | reddit paid ad | 93 | 0 |
| Reddit ad - Rainbow image | michi-maker | `rd_rainbow_image` | reddit paid ad | 82 | 0 |
| Reddit ad - Max (one link for the campaign) | michi-maker | `rd_max` | reddit paid ad | 0 | 0 |
| r/michimaker post - Coverflow loop | michi-maker | `rd_sub_coverflow_loop` | reddit organic post | 0 | 0 |
| Reddit organic post - Coverflow loop | michi-maker | `rd_coverflow_loop` | reddit organic post | 0 | 0 |
| Instagram link in bio - Coverflow loop | michi-maker | `ig_coverflow_loop` | instagram post | 4 | 0 |
| Discord share - Coverflow loop | michi-maker | `dc_coverflow_loop` | discord share | 0 | 0 |

## Can a scan be seen at all?

All traffic, all time, exclusions included — capture is a property of the deployed code.

| App | Sessions | With landing route | With a code | With device id | Capture |
| --- | ---: | ---: | ---: | ---: | --- |
| Michi-Maker | 5899 | 5485 | 455 | 5384 | a code was recorded 2026-08-13 |
| TCGScan | 1581 | 1413 | 4 | 1407 | a code was recorded 2026-10-11 |
| Doggle | 1197 | 1138 | 5 | 1197 | a code was recorded 2026-08-13 |
| Pickleague | 312 | 289 | 0 | 312 | routes yes, never a code — a zero cannot be told from an unshipped build |

