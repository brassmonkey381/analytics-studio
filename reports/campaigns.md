# Print & QR campaigns

Collected 2026-11-07T15:07:59.649Z. All-time unless a window is named.

**2962 campaign arrivals** across 4 apps.

> 203 `?code=` arrival(s) ignored: OAuth sign-in callback codes (UUIDs), not campaigns. michi stopped recording them on 2026-10-29; these are older rows.

## Michi-Maker

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Reddit ad - Rainbow image | `rd_rainbow_image` | 2008 | 1827 | 624 | 12 | 145 |
| Reddit ad - Lidi image | `rd_lidi_image` | 703 | 649 | 389 | 5 | 56 |
| Reddit ad - Coverflow video (feed) | `rd_coverflow_4x5` | 220 | 207 | 183 | 0 | 8 |
| Reddit ad - Lidi video | `rd_lidi_video` | 14 | 14 | 0 | 0 | 0 |
| Instagram link in bio - Coverflow loop | `ig_coverflow_loop` | 10 | 10 | 4 | 0 | 0 |
| (unregistered) | `test` | 2 | 2 | 2 | 0 | 0 |
| (unregistered) | `rd_rainbow_video` | 1 | 1 | 0 | 0 | 0 |

Excluded from the above: 148 from our own/QA accounts, 3 verification scan(s).

## TCGScan

No campaign-tagged arrival, all time. A landing route carrying a code HAS been recorded here (first on 2026-10-11), so the capture path works end to end and this zero reads as "nobody scanned" — bearing in mind that the only codes seen so far may be our own verification scans, counted separately above.

## Doggle

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| (unregistered) | `verify_launch_qr` | 4 | 4 | 4 | 0 | 0 |

Excluded from the above: 0 from our own/QA accounts, 1 verification scan(s).

## Pickleague

No campaign-tagged arrival, all time. Excluded from that zero: 2 arrival(s) from our own/QA accounts, 0 verification scan(s) of our own. Landing routes are recorded (488 of 519 sessions, first on 2026-08-14) but not one has ever carried a code, so this zero cannot yet be told apart from a build that has not shipped — see qr_campaign_capture below.

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
| Reddit ad - Coverflow video (feed) | michi-maker | `rd_coverflow_4x5` | reddit paid ad | 220 | 0 |
| Reddit ad - Coverflow video (desktop) | michi-maker | `rd_coverflow_16x9` | reddit paid ad | 0 | 0 |
| Reddit ad - Lidi video | michi-maker | `rd_lidi_video` | reddit paid ad | 14 | 0 |
| Reddit ad - Lidi image | michi-maker | `rd_lidi_image` | reddit paid ad | 703 | 5 |
| Reddit ad - Rainbow image | michi-maker | `rd_rainbow_image` | reddit paid ad | 2008 | 12 |
| Reddit ad - Max (one link for the campaign) | michi-maker | `rd_max` | reddit paid ad | 0 | 0 |
| r/michimaker post - Coverflow loop | michi-maker | `rd_sub_coverflow_loop` | reddit organic post | 0 | 0 |
| Reddit organic post - Coverflow loop | michi-maker | `rd_coverflow_loop` | reddit organic post | 0 | 0 |
| Instagram link in bio - Coverflow loop | michi-maker | `ig_coverflow_loop` | instagram post | 10 | 0 |
| Discord share - Coverflow loop | michi-maker | `dc_coverflow_loop` | discord share | 0 | 0 |

## Can a scan be seen at all?

All traffic, all time, exclusions included — capture is a property of the deployed code.

| App | Sessions | With landing route | With a code | With device id | Capture |
| --- | ---: | ---: | ---: | ---: | --- |
| Michi-Maker | 10365 | 9535 | 3279 | 9850 | a code was recorded 2026-08-13 |
| TCGScan | 1752 | 1562 | 5 | 1578 | a code was recorded 2026-10-11 |
| Doggle | 1546 | 1462 | 5 | 1546 | a code was recorded 2026-08-13 |
| Pickleague | 519 | 488 | 0 | 519 | routes yes, never a code — a zero cannot be told from an unshipped build |

