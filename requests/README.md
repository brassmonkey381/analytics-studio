# Requests

Incoming asks from outside the studio — "can the numbers answer X?" — as opposed to
`config/events.json` → `gaps`, which is what the studio found on its own.

A request is not a work order. It states what someone needs to know and why; the studio
decides whether the stream can answer it, what it would cost, and only then writes the work
order into the app repos (see `../tcgscan/ANALYTICS-TRACKING-GAPS.md` for that shape). The
studio still never ships product code.

| file | from | asks for | state |
| --- | --- | --- | --- |
| `2026-08-14-print-campaign-attribution.md` | marketing-studio | attribute printed QR codes to signups | approved for michi-maker 2026-08-14; tcgscan + the two metrics-only apps still open |
