# Request: what a set-drop post does, per set and per day

**From:** michi-maker (owner session, 2026-10-27). **App:** michi-maker.
**Context:** `../tcgscan/michi-maker/docs/SET-DROP.md`.

## What we need to know

michi-maker will post Instagram content for a new Pokémon set the morning its card images land
(the data server publishes them by 05:30; `scripts/set-drop-watch.mjs` in michi-maker flags the
set). Five content formats are planned (day-one whole-set binder carousel, day-7 price page,
colour pages, build timelapses, mat assembly reels). After the first few drops we want to keep
the formats that bring people and drop the rest. For that we need, **per set and per day from
the morning the images landed** (day 0, 1, 2, ... 14):

1. opens of the public binder links we post (share links are instrumented per
   `../tcgscan/ANALYTICS-SHARE-LINKS.md`), split by referrer where Instagram can be told apart
   from the rest;
2. Collect builds of that set (`collector.binder` with `kind` and the set), and how many of
   those were by accounts created that day;
3. copies of the posted binders (`binder_reshares`) and prints bought from them;
4. signups on those days against the 14 days before, so a drop reads as a lift or not.

A per-format split would be ideal but we do not expect the stream to carry it; a per-post UTM on
the link in each caption is the likely answer, and we will add one if the studio says which
parameter it reads.

## Why

Posting is the owner's time every drop morning. Two or three drops will tell us which format
earns that time only if the numbers are laid out by set and day; the general DAU report cannot
separate a drop from a weekend.

## Not asked for

No product code. If the stream lacks something (the set id on `collector.binder` is there; a
post-level source is not), write the work order into the michi-maker repo as usual.
