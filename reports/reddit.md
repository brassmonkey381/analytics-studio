# Reddit launch - what happens after the click

Collected 2026-10-30T19:12:50.854Z. Days are PDT. Population: michi-maker sessions tagged utm_source=reddit, last 30 days. Our own and QA accounts excluded (11 sessions in the lookback), plus 3 test-link sessions.

## Last 7 days

| step | sessions | of arrivals |
|---|---:|---:|
| Arrived from Reddit | 799 |  |
| Reached the binder editor | 454 | 57% |
| Saw the first prompt (pocket ring, or Complete on a seeded page) | 441 | 55% |
| Opened the card browser | 54 | 7% |
| Placed a card (own tap, or a Fill/Complete that placed) | 16 | 2% |
| Took a guest taste (Find similar, Fill page) | 5 | 1% |
| Opened Fill page | 1 | 0% |
| Met the create-account wall | 2 | 0% |
| Tapped Create account | 1 | 0% |
| Became an account | 3 | 0% |
| Made a binder public | 0 | 0% |

Phone 384, desktop 12, unknown 403. Bounced 71. Median stay 11 s. Came back a later day 1. Accounts by hop 0, stitched by time 3.

Spend $25.00 over 1 ledger rows: per arrival $0.03, per first card $1.56, per account $8.33.

## Per day (30 days)

| day | arrivals | phone | editor | placed | taste | fill | wall | accounts | returned | median stay | spend |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-30 | 312 | 302 | 266 | 7 | 5 | 0 | 1 | 0 | 0 | 12 s | - |
| 2026-10-29 | 487 | 82 | 188 | 9 | 0 | 1 | 1 | 3 | 1 | 11 s | $25.00 |

## Per deploy (30 days)

| segment | from (UTC) | arrivals | editor | placed | taste | fill | wall | tap | accounts | returned |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| before | - | 409 | 135 | 8 | 0 | 0 | 0 | 0 | 3 | 1 |
| 5873b67 | 2026-10-30T04:14:47.662Z | 8 | 7 | 1 | 0 | 1 | 1 | 1 | 0 | 0 |
| 7bc1d40 | 2026-10-30T05:19:51.067Z | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b6ab3d7 | 2026-10-30T05:51:35.514Z | 57 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b77e3bc | 2026-10-30T07:08:16.757Z | 193 | 157 | 4 | 5 | 0 | 0 | 0 | 0 | 0 |
| 8308dd9 | 2026-10-30T14:10:13.509Z | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| geo-targeted | 2026-10-30T14:35:00.000Z | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| c5332f6 | 2026-10-30T14:45:38.885Z | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 540fce5 | 2026-10-30T15:03:44.737Z | 109 | 99 | 3 | 0 | 0 | 1 | 0 | 0 | 0 |

## Per creative (30 days)

| code | label | arrivals | editor | placed | accounts | returned | spend |
|---|---|---:|---:|---:|---:|---:|---:|
| rd_lidi_image | Reddit ad - Lidi image | 318 | 179 | 8 | 2 | 1 | - |
| rd_rainbow_image | Reddit ad - Rainbow image | 288 | 193 | 5 | 0 | 0 | - |
| rd_coverflow_4x5 | Reddit ad - Coverflow video (feed) | 191 | 80 | 1 | 1 | 0 | - |
| (no code) | not in registry | 2 | 2 | 2 | 0 | 0 | - |

> Fill page and the wall are recorded since michi 6d01a53 (2026-10-29 evening); the hop stitch since 7bc1d40 (2026-10-29 22:50 PT). Earlier zeros on those steps are blindness. Deploy markers since 2026-10-30 04:14 UTC.

