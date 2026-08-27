# Print & QR campaigns

Collected 2026-08-27T15:07:35.825Z. All-time unless a window is named.

**4 campaign arrivals** across 4 apps.

## Michi-Maker

| Campaign | Code | Arrivals | People | Went further | Became members | Came back |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| (unregistered) | `299d297d-c1cb-43d6-be4a-cb5e2ce049e6` | 2 | 2 | 2 | 0 | 1 |
| (unregistered) | `72baa86b-7204-444f-8ba1-f62c1103b534` | 1 | 1 | 1 | 0 | 0 |
| (unregistered) | `a6d172c4-e566-4b11-bf24-b26a652ba087` | 1 | 1 | 1 | 0 | 1 |

Excluded from the above: 2 from our own/QA accounts, 0 verification scan(s).

## TCGScan

No campaign-tagged arrival, all time. Landing routes are recorded (329 of 404 sessions, first on 2026-08-06) but not one has ever carried a code, so this zero cannot yet be told apart from a build that has not shipped — see qr_campaign_capture below.

## Doggle

No campaign-tagged arrival, all time. Excluded from that zero: 0 arrival(s) from our own/QA accounts, 1 verification scan(s) of our own. A landing route carrying a code HAS been recorded here (first on 2026-08-13), so the capture path works end to end and this zero reads as "nobody scanned" — bearing in mind that the only codes seen so far may be our own verification scans, counted separately above.

## Pickleague

No campaign-tagged arrival, all time. Landing routes are recorded (50 of 53 sessions, first on 2026-08-14) but not one has ever carried a code, so this zero cannot yet be told apart from a build that has not shipped — see qr_campaign_capture below.

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

## Can a scan be seen at all?

All traffic, all time, exclusions included — capture is a property of the deployed code.

| App | Sessions | With landing route | With a code | With device id | Capture |
| --- | ---: | ---: | ---: | ---: | --- |
| Michi-Maker | 611 | 446 | 6 | 97 | a code was recorded 2026-08-13 |
| TCGScan | 404 | 329 | 0 | 230 | routes yes, never a code — a zero cannot be told from an unshipped build |
| Doggle | 112 | 111 | 1 | 112 | a code was recorded 2026-08-13 |
| Pickleague | 53 | 50 | 0 | 53 | routes yes, never a code — a zero cannot be told from an unshipped build |

