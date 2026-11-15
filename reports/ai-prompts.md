# AI answer check: 40 fixed prompts, read monthly (ANA-015)

The prompts live in `config/ai-prompts.json`: 10 per product (Michi Maker, BiBo, Doggle, PickLeague), frozen
on 2026-11-15. Readings go in `data/ai-prompt-readings.json`. The traffic side of the same question is the
**AI and search traffic** report (`scripts/sources.mjs`).

A reading answers one question per prompt: **did the assistant name the product, and did it link the site?**
It does not score answer quality. Assistant answers vary from run to run, so one month's single "yes" or "no" is
weak evidence. Read a trend over 3 or more months.

## When

Around the 15th of each month. The same week each time.

## How to take a reading

For each assistant in the table below:

1. Open a private browser window, signed out where the assistant allows it. If it needs sign-in, turn memory and
   personalization off first.
2. Paste each prompt exactly as written. Start a new chat for every prompt, so earlier answers do not carry over.
3. Record one row per prompt:
   - `mentioned`: the product is named in the answer (true or false).
   - `linked`: the answer links the product's domain (true or false), plus the URL.
   - `rank`: where the product sits in a list answer (1 = first), or null.
   - `others`: the first 3 products or sites the answer names instead.
4. Add the readings to `data/ai-prompt-readings.json` as one entry per date per assistant, in the same shape as
   the first entry.

| Assistant | Who can take the reading |
| --- | --- |
| ChatGPT (chatgpt.com, search on) | Brian: a browser session on his account or signed out |
| Perplexity (perplexity.ai) | Brian |
| Gemini (gemini.google.com) and Google AI Overviews | Brian |
| Copilot (copilot.microsoft.com) | Brian |
| Claude, model knowledge only, no web | This studio's session can take it. Done for 2026-11-15 |
| Web search ranking (the studio's search tool, a proxy for search-grounded answers) | This studio's session can take it. Done for 2026-11-15 |

Studio sessions cannot sign in to the consumer assistants, so the first four readings are Brian's, about
10 minutes per assistant at 15 seconds per prompt.

## First reading, 2026-11-15

The numbers are in `data/ai-prompt-readings.json`. Summary:

- **Claude, no web (claude-opus-5-5, knowledge to June 2026):** names none of the four products for any of the
  40 prompts, brand prompts included. The model has no knowledge of them.
- **Web search ranking:** 0 of 40 prompts return the product's own domain, brand prompts included ("What is
  michi-maker.com?" returned no michi-maker.com URL). Who shows up instead: binder-builders, cardrake and
  elitefourum for Michi; App Store listings, scanpokemon and eyevotcg for BiBo; App Store listings, sniffspot and
  tryfi for Doggle; pickleheads, pickleball.com and usapickleball for PickLeague.
- This baseline is at zero, so any later mention is a change. The ChatGPT, Perplexity, Gemini and Copilot
  readings are still to take (Brian).
