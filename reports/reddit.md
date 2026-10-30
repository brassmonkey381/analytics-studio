# Reddit launch - what happens after the click

Collected 2026-10-30T15:07:47.752Z. Days are PDT. Population: michi-maker sessions tagged utm_source=reddit, last 30 days. Our own and QA accounts excluded (9 sessions in the lookback), plus 3 test-link sessions.

## Last 7 days

| step | sessions | of arrivals |
|---|---:|---:|
| Arrived from Reddit | 690 |  |
| Reached the binder editor | 355 | 51% |
| Saw the first pocket ring | 343 | 50% |
| Opened the card browser | 43 | 6% |
| Placed a card | 13 | 2% |
| Took a guest taste (Find similar, Fill page) | 5 | 1% |
| Opened Fill page | 1 | 0% |
| Met the create-account wall | 1 | 0% |
| Tapped Create account | 1 | 0% |
| Became an account | 3 | 0% |
| Made a binder public | 0 | 0% |

Phone 277, desktop 10, unknown 403. Bounced 66. Median stay 11 s. Came back a later day 1. Accounts by hop 0, stitched by time 3.

Spend $25.00 over 1 ledger rows: per arrival $0.04, per first card $1.92, per account $8.33.

## Per day (30 days)

| day | arrivals | phone | editor | placed | taste | fill | wall | accounts | returned | median stay | spend |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-30 | 203 | 195 | 167 | 4 | 5 | 0 | 0 | 0 | 0 | 11 s | - |
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
| 540fce5 | 2026-10-30T15:03:44.737Z | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Per creative (30 days)

| code | label | arrivals | editor | placed | accounts | returned | spend |
|---|---|---:|---:|---:|---:|---:|---:|
| rd_lidi_image | Reddit ad - Lidi image | 277 | 142 | 6 | 2 | 1 | - |
| rd_rainbow_image | Reddit ad - Rainbow image | 225 | 135 | 5 | 0 | 0 | - |
| rd_coverflow_4x5 | Reddit ad - Coverflow video (feed) | 186 | 76 | 0 | 1 | 0 | - |
| (no code) | not in registry | 2 | 2 | 2 | 0 | 0 | - |

> Fill page and the wall are recorded since michi 6d01a53 (2026-10-29 evening); the hop stitch since 7bc1d40 (2026-10-29 22:50 PT). Earlier zeros on those steps are blindness. Deploy markers since 2026-10-30 04:14 UTC.

