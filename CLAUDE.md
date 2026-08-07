# Working in analytics-studio

This repo **reads**. It never writes to an app's database and never ships product
code. Fixes to instrumentation land in the app repos (`../tcgscan/*`), handed over
as a written work order — see `../tcgscan/ANALYTICS-TRACKING-GAPS.md` for the shape.

Read `README.md` for what each lane does. This file is the house rules: the things
that must be true of **every** report, including ones that do not exist yet.

---

## The four staples

Every report in this studio has all four. They are not per-report decisions and
they are not optional. Shared code exists for each so you get them by calling a
function, not by remembering.

> **Closed 2026-08-07.** `scripts/report.mjs` (the DAU lane, `/metrics`) used to
> be the exception here — no window toggle, its own hover code, its identity
> blob inlined as executable script. It now has all four staples like every
> other report. Two deliberate choices remain, and they are choices rather than
> gaps: its line charts keep a bespoke crosshair, because the shared layer shows
> one roster and that tooltip is a multi-series readout (date, then every app's
> value) — it reads names out of the shared parsed blob, so the escaping rules
> are not duplicated. And at 24h the charts step aside for a note, because one
> day of a daily series is a point, not a trend; the tiles carry that window.
> **There is no longer a report in this studio that skips a staple.**

### 1. Hover any plot for who is behind the number — `scripts/lib/hover.mjs`

A count without names is a dead end. Every mark, row and tile that represents
people gets a hover roster: bars, funnel stages, table rows, stat tiles. Capped at
20 shown, with the true total and a `+N more`.

```js
import { hoverAttr, hoverLayer, roster, userLabel } from "./lib/hover.mjs";

const rosters = { "michi|free": roster(ids, userLabel) };   // flat key -> {total,names}
`<tr ${hoverAttr("michi", "free")}>`                        // same key in the markup
`${hoverLayer(rosters, { unit: "account/accounts" })}`      // once, near </main>
```

Non-negotiable inside that module, which is why it is centralised:

- **Names are written with `textContent`, never `innerHTML`.** A username is
  user-supplied text.
- The JSON blob escapes `<` and is **parsed, not evaluated**.
- Names resolve `@username` → display name → `guest <id-stub>` → email.
  **Guests are numbered by stub, never collapsed into one "(guest)"** — four
  guests must not read as one person.

### 2. A 24h / 7d / 14d / 30d window toggle — `scripts/lib/windows.mjs`

```js
import { STANDARD_WINDOWS, windowBar, windowScript, ALL_WINDOW } from "./lib/windows.mjs";
```

- **Every window is computed server-side from ONE fetch.** The toggle only
  changes which precomputed block is visible. Recomputing in the browser is a
  second implementation that can disagree with the first; fetching per window
  gives each window a different "now".
- **Say what the window scopes**, next to the control — `windowBar()` requires
  it. It legitimately differs per report (events: timestamps; plans: signup
  cohort). A number whose population is ambiguous is worse than no number.
- Add `ALL_WINDOW` for a point-in-time report. A tier snapshot whose widest view
  is 30 days hides every account older than a month.
- State inline anything that **does not** move with the toggle — ground truth
  tables and instrumentation coverage do not, and must say so where they appear.
- The choice persists across reports via `localStorage`.

### 3. Exclusions are applied, and their size is always shown

`exclusionCte()` in `scripts/lib/studio.mjs` is the single definition. Our own,
seeded, QA and automated accounts never count toward a behavioural number.

**Never drop them silently.** Every report states how much was excluded, and
where it fits, renders it as a distinct lighter segment. That is what makes "all
our paid tiers are ours" visible instead of merely absent. See
`config/exclusions.json`.

One exception, and it is deliberate: **instrumentation coverage counts ALL
traffic, exclusions included, all-time.** Whether a `track()` call site can fire
is a property of the code, not of who used the app — filtering it reports a
hand-verified QA event as broken.

### 4. Counts are committed; identity is not

| committed | gitignored |
| --- | --- |
| `data/*.json` (counts, no names, no ids) | `data/*-roster.json`, `data/journeys.json`, `data/accounts.json` |
| `reports/events.md` | every `reports/*.html` |

A new lane that emits identity **must** add its sidecar to `.gitignore` in the
same change. `run-daily.ps1` scans the staged diff for emails, keys and IPs and
**fails closed** — that is a backstop, not the defence. `.gitignore` is.

---

## Charts

Load the **`dataviz` skill before writing any chart code**, and follow it. Two
things it will tell you that are easy to get wrong here and have already been
decided:

- **Run `validate_palette.js`. Do not reason about contrast.** Tier and funnel
  ramps are **ordinal**, not categorical — validate with `--ordinal`, which has a
  tighter floor than a meter track. Current ordinal pair: light
  `#2a78d6`/`#86b6ef`, dark `#3987e5`/`#184f95`; both pass in both modes.
- **One scale across panels and across windows.** Per-window scaling makes a bar
  grow when you narrow the window, which is the opposite of what happened.

Drop a series that would flatten the others rather than log-scaling it, and say
where it went — guests outnumber accounts ~50:1 on the shared project, so the
plans chart states them as context instead of drawing them.

## Adding a report

1. A script that writes `data/<id>.json` (counts) plus, if it has identity, a
   gitignored `data/<id>-roster.json`, and renders `reports/<id>.html`.
2. Register it in `config/reports.json` for a title, a blurb and a refresh.
   **It is already reachable without this** — the dashboard lists any
   `reports/*.html` as unregistered. Registering adds chrome, not visibility.
3. Add it to `run-daily.ps1` (non-fatal, after the DAU lane) and to the
   auto-commit file list if its data file is committed.
4. All four staples above.

## Reporting numbers

- **State the caveat next to the number, not in an appendix.** A funnel stage
  whose definition is known to be wrong carries an inline marker to its gap.
- **A zero has two meanings** — "it didn't happen" and "we can't see it". Never
  print one when you mean the other. `config/events.json` → `gaps` carries a
  `status` (`open` / `specced` / `landed` / `deferred` / `fixed`) precisely so a
  landed-but-unproven fix cannot be mistaken for a working one.
- **Ground truth beats the event stream** for anything that has a product table.
  Trials live in `pro_trials` / `tcgscan_pro_trials`, tiers in `entitlements`.
  Those predate instrumentation; the stream cannot see backwards.
- **Verify against the code, not just the rows.** Two gap findings here were
  wrong because they were inferred from a small sample of recorded events when
  the call sites said otherwise.

## Environment

Windows, PowerShell 5.1. `.ps1` files are read as ANSI without a BOM, so **keep
them pure ASCII** — an em-dash breaks the parser. Node writes UTF-8, so set
`[Console]::OutputEncoding` before capturing its output or the log fills with
mojibake. No heredocs and no `&&`/`||` in PowerShell.

Credentials are in `.env` (gitignored): `SUPABASE_ACCESS_TOKEN` drives every
lane through the Management API. `EXCLUDED_IPS` lives there too and never in
committed config — an IP is location data.
