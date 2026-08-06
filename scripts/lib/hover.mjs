// THE hover layer. Every plot in this studio shows who is behind a number on
// hover — see CLAUDE.md. This module exists so that is structural rather than
// remembered: a report gets the behaviour by calling hoverLayer(), and the
// safety rules below cannot be forgotten one report at a time.
//
// The contract is deliberately flat. A report flattens whatever shape its
// rosters have into ONE map of `key -> { total, names }`, and marks each
// hoverable element with the same key. Nothing here knows about funnels, tiers,
// windows or apps.
//
//   const rosters = { "michi-maker|free": { total: 4, names: [...] } };
//   `<tr ${hoverAttr("michi-maker", "free")}>`  ->  data-hov="michi-maker|free"
//
// A key may contain the literal token {scope}, replaced at hover time with
// whatever the page last passed to `setHoverScope(...)`. That is how a report
// with a time-window toggle keeps one set of markup across four datasets
// without re-rendering: the events report stamps the active window as the
// scope, and the same <tr> resolves to a different roster.

/** Names shown before the tooltip truncates. The roster's own total is used for
 *  the "+N more" line, so truncation never misrepresents the count. */
export const HOVER_MAX_NAMES = 20;

/** Cap on names STORED per roster. Well above what is shown, so the display cap
 *  can be raised without re-collecting, but bounded so a healthy app's 30-day
 *  roster cannot balloon the sidecar. */
export const ROSTER_STORE_CAP = 60;

/**
 * Build one roster entry. `total` is the true population; `names` is capped.
 * Ids are deduped — callers pass raw per-row id lists as often as user sets.
 */
export function roster(ids, label) {
  const names = [...new Set(ids)].map(label).sort((a, b) => a.localeCompare(b));
  return { total: names.length, names: names.slice(0, ROSTER_STORE_CAP) };
}

/**
 * How a person is named. @username first — that is what the apps show. Guests
 * are numbered by a short id stub rather than collapsed into one "(guest)",
 * which would make four guests look like one person.
 */
export function userLabel(u) {
  if (!u) return "unknown";
  if (u.username) return `@${u.username}`;
  if (u.displayName ?? u.display_name) return u.displayName ?? u.display_name;
  if (u.anon) return `guest ${String(u.id ?? "").slice(0, 8)}`;
  return u.email ?? String(u.id ?? "").slice(0, 8);
}

/** The attribute that makes an element hoverable. Parts are joined with `|`. */
export function hoverAttr(...parts) {
  const key = parts.join("|").replace(/"/g, "");
  return `data-hov="${key}"`;
}

/**
 * The JSON blob + tooltip + behaviour. Drop the return value in once, near the
 * end of the page.
 *
 * `<` is escaped in the blob so a username can never close the script tag, and
 * the client parses rather than evaluates. Every name is written with
 * textContent — a username is user-supplied text and must never reach
 * innerHTML. Both of those are the reason this lives in one place.
 */
export function hoverLayer(rosters, { maxNames = HOVER_MAX_NAMES, unit = "person/people" } = {}) {
  const [one, many] = unit.split("/");
  const blob = JSON.stringify(rosters ?? {}).replace(/</g, "\\u003c");
  return `<div id="hovtip" role="tooltip"></div>
<style>
[data-hov] { cursor: help; }
tr[data-hov]:hover, [data-hov].hovrow:hover { background: color-mix(in srgb, var(--bar, #2a78d6) 7%, transparent); }
#hovtip { position: fixed; z-index: 40; pointer-events: none; max-width: 300px; display: none;
  background: var(--surface, #fff); color: var(--ink, #000);
  border: 1px solid var(--border, rgba(0,0,0,0.1)); border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0,0,0,0.16); padding: 8px 10px;
  font: 12.5px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
#hovtip .hv-h { color: var(--muted, #888); font-size: 11px; text-transform: uppercase;
  letter-spacing: 0.04em; margin-bottom: 5px; }
#hovtip .hv-n { font-variant-numeric: tabular-nums; padding: 1px 0; }
#hovtip .hv-more { color: var(--muted, #888); margin-top: 4px; font-style: italic; }
</style>
<script type="application/json" id="hov-data">${blob}</script>
<script>
(function () {
  var MAX = ${maxNames};
  var ONE = ${JSON.stringify(one)}, MANY = ${JSON.stringify(many)};
  var data = {};
  try { data = JSON.parse(document.getElementById('hov-data').textContent || '{}'); } catch (e) {}
  var tip = document.getElementById('hovtip');
  var scope = '';
  // Reports with a time-window toggle call this; everything else never does.
  window.setHoverScope = function (s) { scope = String(s == null ? '' : s); hide(); };

  function show(el, ev) {
    var key = (el.getAttribute('data-hov') || '').replace('{scope}', scope);
    var r = data[key];
    if (!r || !r.total) return hide();
    tip.textContent = '';
    var h = document.createElement('div');
    h.className = 'hv-h';
    h.textContent = r.total + ' ' + (r.total === 1 ? ONE : MANY);
    tip.appendChild(h);
    var names = (r.names || []).slice(0, MAX);
    names.forEach(function (nm) {
      var row = document.createElement('div');
      row.className = 'hv-n';
      row.textContent = nm;            // never innerHTML: user-supplied text
      tip.appendChild(row);
    });
    if (r.total > names.length) {
      var m = document.createElement('div');
      m.className = 'hv-more';
      m.textContent = '+' + (r.total - names.length) + ' more';
      tip.appendChild(m);
    }
    tip.style.display = 'block';
    move(ev);
  }
  function move(ev) {
    if (tip.style.display !== 'block') return;
    var pad = 14, b = tip.getBoundingClientRect();
    var x = ev.clientX + pad, y = ev.clientY + pad;
    if (x + b.width > innerWidth - 8) x = ev.clientX - b.width - pad;
    if (y + b.height > innerHeight - 8) y = Math.max(8, ev.clientY - b.height - pad);
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hide() { tip.style.display = 'none'; }

  function target(e) { return e.target && e.target.closest ? e.target.closest('[data-hov]') : null; }
  document.addEventListener('mouseover', function (e) { var el = target(e); if (el) show(el, e); else hide(); });
  document.addEventListener('mousemove', function (e) { var el = target(e); if (el) move(e); else hide(); });
  document.addEventListener('scroll', hide, true);
})();
</script>`;
}
