// THE window toggle. Every report in this studio can be read over 24h / 7d /
// 14d / 30d — see CLAUDE.md. Shared so the control looks and behaves the same
// everywhere and a new report gets it by calling two functions.
//
// The rule that makes this safe: **every window is computed server-side, from
// one fetch, and the toggle only changes which precomputed block is visible.**
// Recomputing in the browser would be a second implementation that could
// disagree with the first, and fetching per window would give each window a
// slightly different "now".
//
// What a window MEANS is the report's business, and differs legitimately:
//   events  — events and sessions with a timestamp in the window
//   plans   — accounts whose signup falls in the window (tier is always as-of-now)
// A report must say which it is, next to the control. A number whose population
// is ambiguous is worse than no number.

export const STANDARD_WINDOWS = [1, 7, 14, 30];

/** `all` is a legitimate extra slot, not a deviation: for a point-in-time
 *  report (a tier snapshot, a roster) a widest view of 30 days would silently
 *  hide every account older than a month, which is usually most of them. */
export const ALL_WINDOW = "all";

export function windowLabel(d) {
  if (d === ALL_WINDOW) return "All time";
  return d === 1 ? "24h" : `${d}d`;
}

/**
 * The control strip. `windows` is the list of slots, `active` the default.
 * `meaning` is the one-line statement of what the window scopes — required,
 * because it is the difference between a number and a misleading number.
 */
export function windowBar(windows, active, meaning) {
  const btns = windows
    .map(
      (d) =>
        `<button class="winbtn" data-win="${d}" aria-pressed="${String(d === active)}">${windowLabel(d)}</button>`,
    )
    .join("");
  return `<div class="winbar" role="group" aria-label="Time window">
  <span class="lbl">Window</span>${btns}
  <span class="winmeaning">${meaning}</span>
</div>`;
}

/**
 * Styles + behaviour. Shows the `[data-w="<active>"]` block and hides the rest,
 * hands the active window to the hover layer as its scope so rosters follow the
 * toggle, and filters any `[data-since]` element by its own timestamp — which is
 * how a list rendered once (session cards) tracks the control without four
 * copies in the DOM.
 */
export function windowScript(windows, active) {
  return `<style>
.winbar { position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; align-items: center;
  background: var(--page, #fff); padding: 10px 0 12px; margin-bottom: 6px;
  border-bottom: 1px solid var(--border, #ddd); flex-wrap: wrap; }
.winbar .lbl { font-size: 12px; color: var(--muted, #888); margin-right: 2px; }
.winbar .winmeaning { font-size: 12px; color: var(--muted, #888); margin-left: 8px; }
.winbtn { font: inherit; font-size: 13px; padding: 4px 12px; border-radius: 20px; cursor: pointer;
  background: var(--surface, #fff); color: var(--ink-2, #444);
  border: 1px solid var(--border, #ddd); }
.winbtn[aria-pressed="true"] { background: var(--bar, #2a78d6); color: #fff;
  border-color: var(--bar, #2a78d6); font-weight: 600; }
</style>
<script>
(function () {
  var win = ${JSON.stringify(String(active))};
  function apply(d) {
    win = String(d);
    document.querySelectorAll('.winbtn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.win === win));
    });
    document.querySelectorAll('[data-w]').forEach(function (el) { el.hidden = el.dataset.w !== win; });
    // Rosters are stored per window; the hover layer substitutes this into keys.
    if (window.setHoverScope) window.setHoverScope(win);
    // Lists rendered once and filtered by their own timestamp.
    var cutoff = win === 'all' ? -Infinity : Date.now() - Number(win) * 86400000;
    document.querySelectorAll('[data-since-group]').forEach(function (wrap) {
      var shown = 0;
      wrap.querySelectorAll('[data-since]').forEach(function (el) {
        var vis = Number(el.dataset.since) >= cutoff;
        el.hidden = !vis;
        if (vis) shown++;
      });
      var empty = wrap.parentNode && wrap.parentNode.querySelector('.win-empty');
      if (empty) empty.hidden = shown > 0;
    });
    try { localStorage.setItem('studio-window', win); } catch (e) {}
  }
  document.querySelectorAll('.winbtn').forEach(function (b) {
    b.addEventListener('click', function () { apply(b.dataset.win); });
  });
  // One window choice across the whole studio: pick 7d on one report and the
  // next report you open is already on 7d, if it offers that slot.
  var saved = null;
  try { saved = localStorage.getItem('studio-window'); } catch (e) {}
  var offered = ${JSON.stringify(windows.map(String))};
  apply(saved && offered.indexOf(saved) !== -1 ? saved : win);
})();
</script>`;
}
