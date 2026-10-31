# Print & QR campaigns

Collected 2026-10-31T15:07:47.158Z. All-time unless a window is named.

**1072 campaign arrivals** across 4 apps.

> 202 `?code=` arrival(s) ignored: OAuth sign-in callback codes (UUIDs), not campaigns. michi stopped recording them on 2026-10-29; these are older rows.

## Michi-Maker

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Reddit ad - Rainbow image | `rd_rainbow_image` | 511 | 489 | 487 | 1 | 11 |
| Reddit ad - Lidi image | `rd_lidi_image` | 366 | 345 | 340 | 0 | 18 |
| Reddit ad - Coverflow video (feed) | `rd_coverflow_4x5` | 185 | 175 | 175 | 0 | 4 |
| Instagram link in bio - Coverflow loop | `ig_coverflow_loop` | 4 | 4 | 4 | 0 | 0 |
| (unregistered) | `test` | 2 | 2 | 2 | 0 | 0 |

Excluded from the above: 50 from our own/QA accounts, 3 verification scan(s).

## TCGScan

No campaign-tagged arrival, all time. A landing route carrying a code HAS been recorded here (first on 2026-10-11), so the capture path works end to end and this zero reads as "nobody scanned" — bearing in mind that the only codes seen so far may be our own verification scans, counted separately above.

## Doggle

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| (unregistered) | `verify_launch_qr` | 4 | 4 | 4 | 0 | 0 |

Excluded from the above: 0 from our own/QA accounts, 1 verification scan(s).

## Pickleague

No campaign-tagged arrival, all time. Excluded from that zero: 2 arrival(s) from our own/QA accounts, 0 verification scan(s) of our own. Landing routes are recorded (314 of 339 sessions, first on 2026-08-14) but not one has ever carried a code, so this zero cannot yet be told apart from a build that has not shipped — see qr_campaign_capture below.

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
| Reddit ad - Coverflow video (feed) | michi-maker | `rd_coverflow_4x5` | reddit paid ad | 185 | 0 |
| Reddit ad - Coverflow video (desktop) | michi-maker | `rd_coverflow_16x9` | reddit paid ad | 0 | 0 |
| Reddit ad - Lidi video | michi-maker | `rd_lidi_video` | reddit paid ad | 0 | 0 |
| Reddit ad - Lidi image | michi-maker | `rd_lidi_image` | reddit paid ad | 366 | 0 |
| Reddit ad - Rainbow image | michi-maker | `rd_rainbow_image` | reddit paid ad | 511 | 1 |
| Reddit ad - Max (one link for the campaign) | michi-maker | `rd_max` | reddit paid ad | 0 | 0 |
| r/michimaker post - Coverflow loop | michi-maker | `rd_sub_coverflow_loop` | reddit organic post | 0 | 0 |
| Reddit organic post - Coverflow loop | michi-maker | `rd_coverflow_loop` | reddit organic post | 0 | 0 |
| Instagram link in bio - Coverflow loop | michi-maker | `ig_coverflow_loop` | instagram post | 4 | 0 |
| Discord share - Coverflow loop | michi-maker | `dc_coverflow_loop` | discord share | 0 | 0 |

## Can a scan be seen at all?

All traffic, all time, exclusions included — capture is a property of the deployed code.

| App | Sessions | With landing route | With a code | With device id | Capture |
| --- | ---: | ---: | ---: | ---: | --- |
| Michi-Maker | 7135 | 6593 | 1316 | 6620 | a code was recorded 2026-08-13 |
| TCGScan | 1606 | 1435 | 4 | 1432 | a code was recorded 2026-10-11 |
| Doggle | 1284 | 1218 | 5 | 1284 | a code was recorded 2026-08-13 |
| Pickleague | 339 | 314 | 0 | 339 | routes yes, never a code — a zero cannot be told from an unshipped build |

