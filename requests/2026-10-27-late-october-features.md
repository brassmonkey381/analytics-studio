# Request: the late-October michi features, what fires and what does not

**From:** michi-maker (owner session, 2026-10-27). **App:** michi-maker.
**Context:** `../tcgscan/michi-maker/src/data/changelog.ts` (entries dated 2026-10-24 to 2026-10-27)
and `../tcgscan/michi-maker/src/lib/analytics.ts`. The owner asked, after shipping a week of
features: "do we have analytics tracking on any of the things we updated in the last few days?"
This file is the audit and the asks that fall out of it.

## What fires today (all on production since 2026-10-27)

| feature | event(s) | props worth reading |
| --- | --- | --- |
| Vote on What's Next (`/wishlist`) | `wishlist.shown`, `wishlist.vote`, `wishlist.vote_failed`, `wishlist.submitted`, `wishlist.submit_failed` | `feature`, `on`, `reason`, `has_text`, `votes` |
| Collector / Set Binders (`/collect`) | `collector.binder`, `collector.print` | `game`, `kind`, `pockets`, `pages` (plain, michi, curated), `curated`, `fillArt`, `artWindow`, `sort`, `lang`, `cameos` |
| Arrange (G), spreads and Shuffle | `arrange_open`, `arrange_pick`, `arrange_shuffle` | `spread`, `hasArt`, `pockets`; pick: `template`, `mode`, `rank`, `shown`, `shuffled`, `moves`; shuffle: `press`, `fresh` |
| Share picture chooser (Q and F, Share sheet) | `share.hires` | `surface` (`f_key`, `share_sheet`), `style` (soft, clean), `cards` (look, cards) |
| Print sheet, files after checkout | `print.download`, `print.auto_download` | `credit`, `spend`, `pockets`, `archived` |
| Sleeves and art backings for a selection | `pocket.style` | `what`, `count` |
| Find art opens first in Add art | `art.search` | `kind`, `orientation`, `hits` |

The vote tallies themselves are rows in `feature_votes` on `piikwvntldytjejxmcla`, readable with
`feature_vote_counts('michi')`; they are not events.

## Names the taxonomy does not know yet

Nine names landed this week and are not in `config/events.json`; the daily run already lists
`collector.binder` and `collector.print` as unrecognised. The other four below were in ANA-002
before this week and are unchanged.

New this week: `wishlist.shown`, `wishlist.vote`, `wishlist.vote_failed`, `wishlist.submitted`,
`wishlist.submit_failed`, `collector.binder`, `collector.print`, `arrange_shuffle`,
`print.auto_download`.

Still open from ANA-002: `csv.analyzed`, `puzzle.revealed`, `art.tidy`, `pocket.art_edit`.

Suggested stages: the wishlist five and `arrange_shuffle` are engagement; `collector.binder` is
activation (a binder made from nothing) and `collector.print` engagement; `print.auto_download`
monetization (it fires only after a paid checkout). `arrange_open` and `arrange_pick` are already
declared; `arrange_shuffle` is the same family and the same underscore style.

## What does not fire at all

These shipped this week with no event. Listed in the order the owner would want them answered.

1. **The owned tick.** Tapping the tick on a pocket (`BinderScreen` → `onOwnedPress`, calling
   `collectionRepo.markOwned` / `unmarkOwned`) writes to `user_cards` and sends nothing. We cannot
   say how many people mark cards owned, nor how many marks a session makes.
2. **Art views.** Setting the art view for the whole binder, a page, or a pocket (`binder_art_view`
   on the binder, `art_view` on pages and slots) sends nothing. Adoption of the week's largest
   editor change is invisible, except indirectly through `share.hires` `cards` and
   `collector.binder` `artWindow`.
3. **The quick look (Q).** Opening the quick look and choosing a style in the chooser sends nothing;
   only the download (`share.hires`) does. The style and cards split is therefore known for
   downloads only.
4. **The left menu.** No `nav.tap`. Page visits are in `page.view` by path, which covers the
   twelve in-app links, but Scan Cards opens the sister app in a new tab and leaves no row here,
   and we cannot tell a menu click from a link elsewhere on the page.
5. **Collect before the build.** Game, kind, language, facet filters and sort are read only at
   build time from `collector.binder`. A person who tries three games and leaves is not seen.
6. **Mats.** `print.download` does not say whether the zip carried a mats PDF or how many
   art-view pages it had.

## What we would like to know

- Vote page: visits to votes to text submissions, by signed-in and guest.
- Arrange: opens to picks, the share of opens in Spread, and whether Shuffle picks beat the
  arranger's own takes (`shuffled` on `arrange_pick`).
- Share picture: the soft or clean and look or cards split on downloads, by surface.
- Collect: builds by `game` and `kind`, and prints by `kind`; whether non-Pokémon games are used
  at all after the game row shipped.
- The six gaps above, once instrumented: owned marks per session, art-view settings per binder,
  quick looks that end in a download, menu use by group.

## Not asked for

No product code from the studio. If the studio wants the six gaps closed, write the names and
props into the michi-maker work order (`../tcgscan/ANALYTICS-TRACKING-GAPS.md`) with
`planned: true` entries in the taxonomy, and michi-maker will fire them. Proposed names, so the
planned entries can go in now: `card.owned` (`on`, `surface`), `binder.art_view` (`level`:
binder, page, pocket; `view`; `count`), `share.quick` (`style`, `cards`, `surface`), `nav.tap`
(`group`, `label`, `external`), `collector.input` (`what`: game, kind, lang, facet, sort;
`value`), and `mats` plus `art_pages` as props on `print.download`.
