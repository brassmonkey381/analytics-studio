# App analytics — last 30 days

Generated 2026-08-04 01:59 UTC

| App | Total users | DAU (yesterday) | New users 7d | New users 30d |
|---|---|---|---|---|
| Doggle | 10 | 1 | 2 | 3 |
| Pickleague | 5 | 1 | 0 | 0 |
| Michi-Maker | 3 | 1 | 1 | 3 |
| TCGScan | 0 | 0 | 0 | 0 |

## Total distinct users — active vs churned

| App | Total | Active 7d | Churned 7d | Active 14d | Churned 14d | Active 30d | Churned 30d |
|---|---|---|---|---|---|---|---|
| Doggle | 10 | 3 | 7 | 4 | 6 | 4 | 6 |
| Pickleague | 5 | 1 | 4 | 1 | 4 | 1 | 4 |
| Michi-Maker | 3 | 2 | 1 | 3 | 0 | 3 | 0 |
| TCGScan | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

- Doggle: DAU = daily login-bonus claims (one per user per day of app open).
- Pickleague: DAU = daily login-streak claims (one per user per day of app open). Note: 472 profiles were bulk-created within 3 seconds on 2026-07-29 (roster import, not organic signups) — they dominate the 30-day new-user total.
- Michi-Maker: Shares one auth pool with TCGScan, which has only 10 real accounts total — the rest of auth.users is anonymous guest sessions, one per guest visit. DAU and new users count signed-in accounts only; guest sessions are shown separately and are closer to device-visits than people. Activity is write-based (binder edits, slices, likes, prints), so browsing leaves no trace.
- TCGScan: Shares one auth pool with Michi-Maker, which has only 10 real accounts total — the rest of auth.users is anonymous guest sessions, one per guest visit. DAU and new users count signed-in accounts only; guest sessions are shown separately and are closer to device-visits than people. Activity is write-based (scans, saves, collection edits), so browsing leaves no trace.
