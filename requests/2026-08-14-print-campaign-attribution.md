# Request: attribute printed QR codes to signups

**From:** marketing-studio (`../marketing-studio`), 2026-08-14
**Asks:** can a scan of a specific printed piece be traced to what the person did next?
**Status:** APPROVED for michi-maker by Brian, 2026-08-14. See "Decision" below.

---

## The ask, concretely

marketing-studio now generates static, per-campaign QR codes
(`../marketing-studio/assets/qr/`, `scripts/qr-campaign.mjs`). Each encodes its campaign in
the URL, e.g. for a batch of business cards taken to a card show:

    https://michi-maker.com/welcome?code=oakland_cardshow&utm_source=qr&utm_medium=print&utm_campaign=oakland_cardshow

The codes are static on purpose: the previous doggle cards routed through `qr.codes/<id>`,
a third-party redirect that now sits behind a paid subscription, so a printed card could be
switched off by someone else's billing. Nothing sits between the scan and the site any
more — which also means **nothing outside our own stream can count the scan.**

The question marketing wants answered is not "how many scans". It is:

> Did the Oakland card show produce members?

## What happens today

Tested by hand on 2026-08-14: scanned the Oakland code, landed on `/welcome`, browsed to
home, stayed a guest, never converted.

That session **was** recorded. Guests are not anonymous to this stream — michi-maker mints
a real anonymous Supabase account for them (`src/app/legal/terms.tsx`), so `auth.uid()`
exists and RLS is satisfied. There will be an `analytics_sessions` row with
`is_guest = true` and `page.view` events for `/welcome` then `/`.

**The campaign was not recorded, for two reasons, both in code:**

1. Nothing reads `?code=` or any `utm_*` param. No match anywhere in
   `michi-maker/src/app/welcome.tsx` or `src/lib/analytics.ts`.
2. The query string is discarded before it reaches the database.
   `src/components/analytics/RouteTracker.tsx:25` emits
   `track('page.view', { route: pathname })`, and expo-router's `usePathname()` returns the
   path without the query. `recordLandingRoute()` (`src/lib/analytics.ts:313`) writes that
   value, so `landing_route` stored `/welcome`, not `/welcome?code=oakland_cardshow`.

The session is therefore indistinguishable from someone typing the URL directly.

## Decision (2026-08-14)

**Approved by Brian for michi-maker**, on the grounds that michi-maker is a website rather
than a distributed app, so the app-store privacy-label obligations that motivated the
original deferral do not bind it.

That settles michi-maker. Two things it does NOT settle, both worth a moment before the
work order goes out:

1. **tcgscan is not in the same position.** `../marketing-studio/apps/tcgscan/app.yaml`
   records "native builds EAS-internal, store submission being prepared" — so it IS heading
   for an app store, where the privacy label does apply. The emitters in the two apps are
   near-identical by design and this repo's own rule is that a gap fixed in one app only is
   worse than the gap. So either the change lands in both and tcgscan's disclosure is
   checked before submission, or it lands in michi only and the asymmetry is recorded
   deliberately rather than by accident.
2. **The privacy page still says what it says.** Being web-only removes the store label,
   not `michi-maker/src/app/legal/privacy.tsx`, which still promises records of "which
   pages you open and product actions". A self-printed campaign code is a fair reading of
   "product action", and the allowlist below keeps it to values we chose ourselves — but
   one sentence added to that page would make it unarguable and costs nothing.

For the record, the original reasoning this supersedes — `config/events.json` →
`gaps.referrer`, deferred 2026-08-06:

> michi-maker/src/app/legal/privacy.tsx promises first-party records of "which pages you
> open and product actions", and referrer/UTM are neither. Capturing them means changing
> that disclosure first, in both apps.

That reasoning still holds for **general referrer capture**, which is a different and wider
thing: it records where a person came from on the open web. This approval covers only a
campaign code we print ourselves, which reveals nothing about the person and cannot carry a
third party's query string. `gaps.referrer` should stay `deferred`; this is a narrower
carve-out, not its reversal.

## Framing (stated by Brian, 2026-08-14)

Both studios - marketing and analytics - are **internal tooling, and always have been**.
Their purpose is understanding how people use the apps. There is no ad network, no data
broker, no third-party pixel, and nothing here is shared outside the fleet. The analytics
lane is first-party by construction: the stream lives in our own Supabase project, behind
RLS, read by a local dashboard.

That is the frame the campaign code sits inside. It is a value we print on our own paper,
read on our own site, and store in our own database to answer our own question. Worth
stating plainly in the record, because "tracking" carries an implication that does not
apply here.

## Scope, per app

The four apps are not in the same position, and a single work order would be wrong:

| app | has the event spine? | what campaign attribution would take |
| --- | --- | --- |
| michi-maker | yes (`piikwvntldytjejxmcla`) | small — capture the param, see below |
| tcgscan | yes (same project, same tables) | same change, must stay symmetric with michi |
| doggle | **no** — metrics lane only (DAU / new users) | would need the whole `analytics_sessions`/`analytics_events` spine built first |
| pickleague | **no** — metrics lane only | same |

So this is really two decisions: a small one for michi + tcgscan, and a much larger one for
doggle + pickleague that should be judged on its own merits rather than smuggled in behind
a QR code.

## Smallest change that answers the question (michi + tcgscan)

No migration needed. `landing_route` already exists on `analytics_sessions`
(`michi-maker/supabase/migrations/20260806090000_analytics_gap_fixes.sql:6`), and
`analytics_events.props` is free-form `jsonb`.

1. Stop discarding the query string on the FIRST page view. `RouteTracker.tsx` has the
   pathname; on web the search string is available alongside it. `recordLandingRoute()`
   then stores `/welcome?code=oakland_cardshow`.
2. Keep an allowlist. Store `code`, `utm_source`, `utm_medium`, `utm_campaign` and drop
   everything else, so an arbitrary third-party parameter can never ride in. This is the
   client-side stripping the deferred gap's own `fix` note already asks for.
3. If conversion attribution is wanted and not just arrivals: persist the code and include
   it in `account.created` props, which already fires
   (`{ via: 'guest_upgrade' | 'password' | ... }`).

Both apps or neither — the emitters are near-identical by design and a gap fixed in one is
worse than the gap.

## Acceptance

- A session that lands on `/welcome?code=X` has `landing_route` containing `code=X`.
- A session landing with no parameters is unchanged (no empty query suffix).
- A parameter outside the allowlist never reaches the database.
- Guest sessions carry it too — the tested journey never converted, and that is the common
  case for a card handed out at a show.

## Watch out for

`src/lib/analytics.ts:303` records that `landing_route` was null on all 91 sessions because
a supabase-js `PostgrestFilterBuilder` is a lazy thenable and the update was never awaited.
The same trap sits on any new write here. **Verify against real rows, not against the code
path** — this exact bug already shipped once in this file.

---

## Outcome (2026-08-13, studio)

Implemented in **all four apps** on Brian's instruction ("permission to build out all
tracking"), which supersedes the michi-only approval above. What landed:

- **michi + tcgscan** (symmetric): the emitters keep the allowlisted `?code`/`utm_*` query on
  the first page.view (`landing_route`), persist the code across a web reload, and merge it
  into `account.created` props centrally in `emit()`. The already-specced `device_id`
  (ANALYTICS-GUEST-DEVICE-ID.md) shipped in the same change:
  `supabase/migrations/20260813090000_analytics_device_id.sql`.
- **doggle + pickleague**: had no event spine at all; each got its own
  (`doggle/db/migrations/0377_analytics_events.sql`,
  `pickleague/supabase/migration_add_analytics_events.sql`) with one deliberate difference
  from michi's: `user_id` is nullable and the `anon` role may insert, because their public
  pages are browsed signed-out and neither app should mint anon auth users for mere browsing.
  A signed-out session that gains an identity mid-visit is *claimed* (`user_id` set,
  `upgraded_at` stamped) — that claim is the QR-scan → signup join. `device_id` and campaign
  capture are in from day one. Minimal taxonomy: `session.start`, `page.view`, `auth.login`,
  `account.created`.
- **Privacy**: one first-party-analytics/campaign-code/device-id disclosure added to all four
  policies (michi + tcgscan `legal/privacy.tsx`, doggle `lib/legalContent.ts`, pickleague
  `public/privacy.html`). `gaps.referrer` stays `deferred` — this is the narrow carve-out only.
- **Studio**: the events lane reads all three projects (per-app `projectRef`), groups
  identity-less visits by `device_id` as "visitors" (never "users"), and renders a
  **Print & QR campaigns** panel per app: people arrived by code / converted on a visit /
  signups carrying the code. An unmigrated project is skipped LOUDLY, not rendered as zero.

**Order matters at deploy time:** the migrations must be applied before the new app code
ships — the emitters now send `device_id` on the session insert, and PostgREST rejects an
unknown column (analytics swallows the error, so the failure mode is silently missing
sessions, the worst kind).

**Store labels, recorded as the doc asked:** tcgscan (submission in prep) and doggle
(submission prepared) must declare first-party analytics — "Product Interaction" data, linked
to identity when signed in — on their App Store privacy labels before submitting. The
in-app policies already say it; the label must match.

Open follow-ups, registered as gaps in `config/events.json`: `qr_campaign_capture` (landed,
unproven until a real scan), `anon_visitor_exclusions` (signed-out dev browsing on
doggle/pickleague cannot be excluded), `doggle_oauth_signup_untracked`.

### Verification (2026-08-13, real rows — two live findings)

End-to-end simulated scans (fresh headless browser context = a true first-time visitor)
against local dev servers writing to the production projects surfaced two bugs that
code-path review had passed:

1. **Fresh visitors lost their landing page.view on michi/tcgscan.** The auth bootstrap
   settles signed-out (`INITIAL_SESSION` null) before the guest is minted, and
   `resetSessionUser(null)` wiped the pre-identity event buffer — deleting the landing
   `page.view` (and with it `landing_route` + the campaign code) of every FIRST-time
   visitor. Returning visitors were unaffected, which is why the stream looked healthy.
   Fixed in both emitters (`everHadIdentity` guard); verified: a fresh scan now writes
   `landing_route = '/welcome?code=…&utm_…'`, the buffered page.view with its original
   timestamp, and a device_id. Brian's own iOS session confirmed device_id persisting
   across native sessions.
2. **RLS select-gating silently broke every anon-side session update on the new spines.**
   An UPDATE whose WHERE references table columns needs the rows to pass a SELECT policy
   too; anon has none, so heartbeats/landing_route (and the authenticated CLAIM of a
   null-user row) matched zero rows while PostgREST answered 204. Fixed with SECURITY
   DEFINER RPCs (`analytics_touch` / `analytics_claim` — doggle `0378_analytics_rpc.sql`,
   pickleague `migration_add_analytics_rpc.sql`); session ids are now minted client-side
   so no anon SELECT policy is ever needed. Session + event inserts were verified working;
   the RPC paths verify once the fix migrations are applied.
