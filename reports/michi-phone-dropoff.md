# Michi Maker: where phone-browser visitors drop off (MIC-017)

Read 2026-11-07 10:00 PT. Phone = session.start viewport under 500 px. Viewport is recorded only
since 2026-10-29, so "last 30 days" is in practice 2026-10-29 to 2026-11-07. Days are Pacific.

**Population: 2,266 phone sessions, 2,259 of them Reddit paid.** Excluded and not counted: 52 sessions
on our own accounts, 76 utm_medium=qa sessions, 11 test-rig sessions (reddit/test 10, qa/playwright 1).

"Tapped" means any event the visitor caused, beyond the automatic load events (session.start,
page.view, landing.skip, binder.add, walkthrough.shown/step, seeded card.add, page.leave).

## Top 5 drop-off points

| # | where | in | out | kept |
|---|---|---:|---:|---:|
| 1 | Arrive on the seeded binder, never tap | 2,266 | 2,117 left | 149 tapped (6.6%) |
| 2 | First walkthrough ask, current design (Complete step, since 2026-11-05 09:10 UTC) | 128 saw it | 125 | 3 reached step 2 (2%) |
| 3 | Walkthrough dismissed, then nothing | 156 dismissed | 97 left with that as their last tap | |
| 4 | Sign-in wall (after launch day) | 32 shown | 28 | 4 tapped it, 4 of those sessions made an account |
| 5 | New-binder wizard, kind screen | 21 shown | 19 left on it | 2 picked a kind, 1 created |

1. **No tap: real time on page is seconds.** page.leave exists since 2026-11-05 09:10 UTC. Of 126 no-tap
   sessions with it, the median visible time is 2.7 s: 65 under 3 s, 38 from 3 to 10 s, 16 from 10 to 30 s,
   7 over 30 s. Sessions that tapped: median 20 s.
2. **Every walkthrough design loses about nine in ten at its first ask.** Art-first (2026-10-31 to 11-05):
   1,311 saw the art step, 101 reached Complete (8%). First-pocket (to 2026-10-30): 321 saw ring, 37 card,
   7 placed.
3. **Dismissing the walkthrough is the single most common last tap.** 97 sessions.
4. **Launch-day wall is a separate bug, already gone.** 2026-10-29: 55 sessions were shown the binder_cap
   wall, 52 without a tap. Not counted in row 4. Wall surfaces across 30 days: arrange_sheet 12,
   complete_wall 11, cap_gate 11, fill_wall 5, print_sheet 3, fill_sheet 1. 58 sessions' last event was a wall.
5. **Wizard sample is small.** Phone guests reach it only by pressing Start building, Reddit arrivals skip
   it, and the wizard ad arm started 2026-11-07 08:21 UTC. Treat as a direction, not a rate.

## Where guests quit: their last deliberate action (149 sessions that tapped)

| last action | sessions |
|---|---:|
| dismissed the walkthrough | 97 |
| shown a sign-in wall | 58 |
| moved a card (pocket.move) | 50 |
| wizard kind screen | 19 |
| opened Complete, did not run it | 12 |

A session can count in more than one row of the first table; this table counts each session once.

## Outcome

8 phone accounts in the window. Own card added in 48 sessions, Complete run in 14. Cap gate shown to 19
guests and 4 free accounts; 3 cap-gate sessions made an account.

## Limits

- **Not yet visible:** michi 56e3760 (phone editor dock and tool bar, 2026-11-07 10:40 UTC) has no rows here yet.
- **Speed batch after this read:** michi e31dad1 (MIC-018, faster first paint, smaller pictures) went live 2026-11-07 23:49:46 UTC. Drop-off point 1, the under-3-second bounce, is the number it should move; re-read it against this report from that stamp on.
- **Thin read on the current walkthrough:** 128 sessions since 2026-11-05.
- **Bounce reason unknown:** the stream cannot see why a visitor leaves in under 3 s. Slow load, the
  wrong ad audience and accidental taps all look the same here.
