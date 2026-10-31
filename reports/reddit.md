# Reddit launch - what happens after the click

Collected 2026-10-31T02:57:09.562Z. Days are PDT. Population: michi-maker sessions tagged utm_source=reddit, last 30 days. Our own and QA accounts excluded (20 sessions in the lookback), plus 3 test-link sessions.

## Last 7 days

| step | sessions | of arrivals |
|---|---:|---:|
| Arrived from Reddit | 942 |  |
| Reached the binder editor | 588 | 62% |
| Saw the first prompt (pocket ring, or Complete on a seeded page) | 575 | 61% |
| Opened the card browser | 60 | 6% |
| Placed a card (own tap, or a Fill/Complete that placed) | 22 | 2% |
| Took a guest taste (Find similar, Fill page) | 10 | 1% |
| Opened Fill page | 3 | 0% |
| Met the create-account wall | 10 | 1% |
| Tapped Create account | 2 | 0% |
| Became an account | 4 | 0% |
| Made a binder public | 1 | 0% |

Phone 504, desktop 35, unknown 403. Bounced 77. Median stay 12 s. Came back a later day 4. Accounts by hop 1, stitched by time 3.

Spend $113.42 over 3 ledger rows: per arrival $0.12, per first card $5.16, per account $28.36.

## Campaign scoreboard (7 days)

| campaign | spend | clicks | arrivals | editor | placed | accounts | sign-up rate | per account |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Campaign 1 (Traffic, clicks) | $91.61 | 542 | 916 | 566 | 19 | 3 | 0.3% | $30.54 |
| Campaign 2 (Sales, Sign up) | $21.81 | - | 26 | 22 | 3 | 1 | 3.8% | $21.81 |

Campaign 2 is every paid session whose link carried utm_content (only its ads do); arrivals and accounts are the site's count, spend and clicks the ledger's.

## Per day (30 days)

| day | arrivals | phone | editor | placed | taste | fill | wall | accounts | returned | median stay | spend |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-30 | 455 | 422 | 400 | 13 | 10 | 2 | 9 | 1 | 0 | 13 s | $62.44 |
| 2026-10-29 | 487 | 82 | 188 | 9 | 0 | 1 | 1 | 3 | 4 | 11 s | $50.98 |

## Per deploy (30 days)

| segment | from (UTC) | arrivals | editor | placed | taste | fill | wall | tap | accounts | returned |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| before | - | 409 | 135 | 8 | 0 | 0 | 0 | 0 | 3 | 3 |
| 5873b67 | 2026-10-30T04:14:47.662Z | 8 | 7 | 1 | 0 | 1 | 1 | 1 | 0 | 0 |
| 7bc1d40 | 2026-10-30T05:19:51.067Z | 13 | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| b6ab3d7 | 2026-10-30T05:51:35.514Z | 57 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| b77e3bc | 2026-10-30T07:08:16.757Z | 193 | 157 | 4 | 5 | 0 | 0 | 0 | 0 | 0 |
| 8308dd9 | 2026-10-30T14:10:13.509Z | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| geo-targeted | 2026-10-30T14:35:00.000Z | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| c5332f6 | 2026-10-30T14:45:38.885Z | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 540fce5 | 2026-10-30T15:03:44.737Z | 111 | 101 | 3 | 0 | 0 | 1 | 0 | 0 | 0 |
| 1576e85 | 2026-10-30T19:44:05.212Z | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sales-campaign | 2026-10-30T20:00:00.000Z | 5 | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| a1a025f | 2026-10-30T20:44:52.639Z | 41 | 38 | 3 | 3 | 1 | 4 | 1 | 1 | 0 |
| 2041d8d | 2026-10-30T22:20:58.994Z | 16 | 14 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| 37ab913 | 2026-10-30T22:44:55.281Z | 79 | 75 | 2 | 2 | 1 | 4 | 0 | 0 | 0 |

## Per creative (30 days)

| code | label | arrivals | editor | placed | accounts | returned | spend |
|---|---|---:|---:|---:|---:|---:|---:|
| rd_rainbow_image | Reddit ad - Rainbow image | 401 | 301 | 11 | 1 | 0 | - |
| rd_lidi_image | Reddit ad - Lidi image | 340 | 199 | 8 | 2 | 4 | - |
| rd_coverflow_4x5 | Reddit ad - Coverflow video (feed) | 199 | 86 | 1 | 1 | 0 | - |
| (no code) | not in registry | 2 | 2 | 2 | 0 | 0 | - |

> Fill page and the wall are recorded since michi 6d01a53 (2026-10-29 evening); the hop stitch since 7bc1d40 (2026-10-29 22:50 PT). Earlier zeros on those steps are blindness. Deploy markers since 2026-10-30 04:14 UTC.

