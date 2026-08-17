// Dashboard server: an index of every report, each servable and re-pullable on
// demand, so a browser reload shows current numbers instead of whatever the last
// cron run left on disk.
//
// Reports come from config/reports.json, and anything in reports/*.html that is
// NOT listed still shows up on the index as unregistered. That is the important
// property: a new report is reachable the moment it exists. Registering it is
// what gives it a title, a position, and a refresh button — not what makes it
// visible. A dashboard that hides work until someone edits a config is a
// dashboard people stop trusting.
//
// Bound to 127.0.0.1 and nothing else, deliberately. The rendered reports carry
// account emails and usernames — the whole reason they are gitignored. Binding
// 0.0.0.0 would hand that to anything on the same wifi. Remote access needs auth
// first, not a wider bind.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";

import { ROOT, readConfig } from "./lib/studio.mjs";

const HOST = "127.0.0.1";
// Not a port anything standard claims. 4317/4318 are OpenTelemetry's and were
// already taken on this machine, which is exactly the failure worth avoiding:
// a dashboard that silently answers from someone else's service.
const PORT = Number(process.env.PORT ?? 4726);
// A reload after this long re-pulls before rendering, so a dashboard left open
// overnight is never quietly stale. Explicit refresh ignores it.
const STALE_MS = Number(process.env.DASHBOARD_STALE_MS ?? 10 * 60 * 1000);

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Registry + discovery. Reloaded per request so adding a report never needs a
// server restart — the point is that new reports show up on their own.
function catalog() {
  let registered = [];
  try {
    registered = (readConfig("reports.json").reports ?? []).filter((r) => r.id && r.file);
  } catch (err) {
    console.error(`config/reports.json unreadable (${err.message}) — falling back to discovery only.`);
  }
  const known = new Set(registered.map((r) => r.file.replace(/\\/g, "/")));
  const found = [];
  try {
    for (const f of readdirSync(join(ROOT, "reports"))) {
      if (!f.endsWith(".html")) continue;
      const rel = `reports/${f}`;
      if (known.has(rel)) continue;
      found.push({
        id: basename(f, ".html"),
        title: basename(f, ".html"),
        blurb: "Unregistered — add it to config/reports.json for a title and a refresh.",
        file: rel,
        unregistered: true,
      });
    }
  } catch { /* no reports dir yet */ }
  // Ids must be unique: two entries on the same route would make which one you
  // get depend on array order, which is a confusing way to lose a report.
  const seen = new Set();
  return [...registered, ...found].filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
}

const byId = (id) => catalog().find((r) => r.id === id);

// Sidebar section order. Unreadable or missing config falls back to an empty
// order, which sorts every group alphabetically rather than losing any.
function groupOrder() {
  try {
    return readConfig("reports.json").groups ?? [];
  } catch {
    return [];
  }
}

// One refresh at a time per report. Two overlapping runs would race on the same
// output files and could interleave a half-written report into a response.
const running = new Map();

// Windows reports a failure to CREATE the process as an NT status code — an
// exit code at or above 0xC0000000, most often 0xC0000142 STATUS_DLL_INIT_FAILED
// (3221225794 in the decimal Node prints). The tell is that stdout AND stderr are
// completely empty: the lane never got as far as running, so nothing is wrong
// with the lane. A long-lived dashboard can fall into a state where EVERY spawn
// from it fails this way while the very same script runs fine from a fresh shell,
// and then only restarting the server clears it. Left as a bare number this reads
// like the report crashed, which sends you debugging the wrong file.
const NT_FAILURE = 0xc0000000;
const ntStatus = (code) =>
  typeof code === "number" && (code >>> 0) >= NT_FAILURE ? `0x${(code >>> 0).toString(16).toUpperCase()}` : null;

// windowsHide keeps each child from allocating a console window. Hundreds of
// those over a long-running dashboard are exactly the kind of per-station
// resource whose exhaustion produces the failure above.
const runScript = (script) =>
  new Promise((resolve) => {
    const log = [];
    const child = spawn(process.execPath, [join(ROOT, script)], { cwd: ROOT, windowsHide: true });
    child.stdout.on("data", (d) => log.push(String(d)));
    child.stderr.on("data", (d) => log.push(String(d)));
    child.on("error", (e) => resolve({ code: -1, log: `spawn failed: ${e.message}` }));
    child.on("close", (code) => resolve({ code, log: log.join("") }));
  });

function runReport(rep) {
  if (running.has(rep.id)) return running.get(rep.id);
  if (!rep.scripts?.length) return Promise.reject(new Error(`${rep.id} has no refresh scripts`));
  const started = Date.now();
  const job = (async () => {
    const log = [];
    for (const script of rep.scripts) {
      let r = await runScript(script);
      // A process that never started is worth exactly one more try; a process
      // that ran and failed is not, because re-running it would just fail again
      // and double the wait before the error reaches the page.
      if (ntStatus(r.code) && !r.log.trim()) r = await runScript(script);
      if (r.code !== 0) {
        const nt = ntStatus(r.code);
        throw new Error(
          nt && !r.log.trim()
            ? `${script} could not be started by Windows (${nt}) — twice. It produced no output, so the lane never ran ` +
              `and this is NOT an error in the report itself; running it by hand will very likely work. ` +
              `This dashboard process can no longer spawn children: stop it and run "npm run serve" again.`
            : `${script} exited ${r.code}\n${log.join("")}${r.log}`,
        );
      }
      log.push(r.log);
    }
    return { ms: Date.now() - started, log: log.join("") };
  })();
  running.set(rep.id, job);
  // Cleanup must not create a SECOND rejecting branch. `job.finally(fn)` returns
  // a new promise that rejects alongside `job`; nothing awaits that one, so a
  // failing lane became an unhandled rejection and Node killed the whole server
  // — defeating the two callers below that carefully catch and serve the last
  // good report. `then(done, done)` handles the rejection, so the derived
  // promise fulfils, while `job` itself still rejects for the caller.
  const done = () => running.delete(rep.id);
  job.then(done, done);
  return job;
}

function collectedAt(rep) {
  if (rep.data) {
    try {
      const j = JSON.parse(readFileSync(join(ROOT, rep.data), "utf8"));
      if (j.collectedAt) return j.collectedAt;
    } catch { /* fall through to mtime */ }
  }
  try {
    return new Date(statSync(join(ROOT, rep.file)).mtimeMs).toISOString();
  } catch {
    return null;
  }
}

const isStale = (rep) => {
  const at = collectedAt(rep);
  return !at || Date.now() - Date.parse(at) > STALE_MS;
};

// ---------- injected control strip ----------
//
// Injected by the server rather than baked into each generator, so every report
// gets the same chrome for free and each reports/*.html stays honest when opened
// straight off disk — no refresh button that cannot refresh.
// The four apps, in the order they appear in the filter. Read from apps.json so
// a fifth app becomes a checkbox by existing, not by editing this file.
function appList() {
  try {
    return readConfig("apps.json").apps.map((a) => ({ id: a.id, name: a.name }));
  } catch {
    return [];
  }
}

// A report with no `apps` key covers everything: the filter must never silently
// hide a lane whose coverage it does not know.
const appsOf = (rep, apps) => (Array.isArray(rep.apps) && rep.apps.length ? rep.apps : apps.map((a) => a.id));

// Reports grouped for the sidebar. A report whose group is not in the configured
// order still renders, under its own heading at the end — an unrecognised group
// is a config typo, and losing the report would be a far worse response to one.
function grouped(all, order) {
  const seen = new Map();
  for (const r of all) {
    const g = r.unregistered ? "Unregistered" : r.group || "Other";
    if (!seen.has(g)) seen.set(g, []);
    seen.get(g).push(r);
  }
  const known = order.filter((g) => seen.has(g));
  const rest = [...seen.keys()].filter((g) => !order.includes(g)).sort();
  return [...known, ...rest].map((g) => [g, seen.get(g)]);
}

// `rep` is null on the index, which has the same sidebar but no age or refresh
// of its own — navigation must not change shape between pages.
function bar(rep, all, groupOrder) {
  const at = rep ? collectedAt(rep) : null;
  const apps = appList();
  const nav = grouped(all, groupOrder)
    .map(
      ([group, reps]) => `<div class="dash-group"><div class="dash-glabel">${esc(group)}</div>${reps
        .map(
          (r) =>
            `<a class="dash-item${rep && r.id === rep.id ? " on" : ""}" href="/${esc(r.id)}" data-apps="${esc(appsOf(r, apps).join(" "))}" title="${esc(r.blurb ?? r.title)}">${esc(r.title)}</a>`,
        )
        .join("")}</div>`,
    )
    .join("");
  const appBoxes = apps
    .map(
      (a) =>
        `<label class="dash-app"><input type="checkbox" class="dash-appbox" value="${esc(a.id)}" checked> ${esc(a.name)}</label>`,
    )
    .join("");
  return `<aside id="dashside">
  <a class="dash-brand" href="/">Analytics Studio</a>
  <nav class="dash-nav">${nav}</nav>
  <div class="dash-filter">
    <div class="dash-glabel">Apps <button type="button" id="dash-appall" class="dash-mini">all</button></div>
    ${appBoxes}
    <p class="dash-fnote" id="dash-fnote"></p>
  </div>
</aside>
<div id="dashbar" data-lane="${esc(rep?.id ?? "")}" data-can-refresh="${!!rep?.scripts?.length}">
  <span class="dash-title">${esc(rep ? rep.title : "All reports")}</span>
  ${rep
    ? `<span class="dash-age" data-at="${at ?? ""}" data-refreshing="${running.has(rep.id)}">&mdash;</span>
  ${rep.scripts?.length ? `<button id="dash-refresh" type="button">Pull fresh data</button>
  <label class="dash-auto"><input type="checkbox" id="dash-auto"> auto 5m</label>` : `<span class="dash-static">no refresh lane</span>`}`
    : ""}
  <span id="dash-msg"></span>
</div>${DASH_CSS}${DASH_JS}`;
}

const SIDE_W = 208;
const BAR_H = 41;
const DASH_CSS = `<style>
:root { --dash-side: ${SIDE_W}px; }
body { padding-left: var(--dash-side); }
#dashside { position: fixed; left: 0; top: 0; bottom: 0; width: var(--dash-side); z-index: 40;
  overflow-y: auto; padding: 14px 0 20px; background: var(--surface, #fff);
  border-right: 1px solid var(--border, #ddd); font: 13px system-ui, sans-serif; }
#dashside .dash-brand { display: block; padding: 0 14px 12px; font-size: 12.5px; font-weight: 650;
  color: var(--ink, #000); text-decoration: none; letter-spacing: .01em; }
#dashside .dash-group { margin-bottom: 12px; }
#dashside .dash-glabel { display: flex; align-items: center; gap: 6px; padding: 0 14px 4px;
  font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted, #888); font-weight: 600; }
#dashside .dash-item { display: block; padding: 5px 14px; color: var(--ink-2, #444); text-decoration: none;
  border-left: 2px solid transparent; }
#dashside .dash-item:hover { background: color-mix(in srgb, var(--bar, #2a78d6) 8%, transparent); }
#dashside .dash-item.on { color: var(--ink, #000); font-weight: 650;
  border-left-color: var(--bar, #2a78d6); background: color-mix(in srgb, var(--bar, #2a78d6) 10%, transparent); }
/* Dimmed, never hidden: a report you cannot currently see through this filter is
   still one click away, and hiding it would look like it had been deleted. */
#dashside .dash-item.off { opacity: .38; }
#dashside .dash-filter { border-top: 1px solid var(--border, #ddd); padding-top: 12px; margin-top: 4px; }
#dashside .dash-app { display: flex; gap: 7px; align-items: center; padding: 3px 14px; color: var(--ink-2, #444); cursor: pointer; }
#dashside .dash-app input { margin: 0; }
#dashside .dash-mini { font: inherit; font-size: 10px; text-transform: none; letter-spacing: 0;
  background: none; border: 1px solid var(--border, #ddd); border-radius: 10px; color: var(--muted, #888);
  padding: 0 6px; cursor: pointer; margin-left: auto; }
#dashside .dash-fnote { padding: 6px 14px 0; margin: 0; font-size: 11px; color: var(--muted, #888); line-height: 1.35; }
#dashbar { position: sticky; top: 0; z-index: 30; display: flex; gap: 10px; align-items: center;
  flex-wrap: wrap; padding: 8px 20px; background: var(--surface, #fff);
  border-bottom: 1px solid var(--border, #ddd); font: 13px system-ui, sans-serif; }
#dashbar .dash-title { font-weight: 650; color: var(--ink, #000); }
#dashbar .dash-age { color: var(--muted, #888); margin-left: auto; font-variant-numeric: tabular-nums; }
#dashbar button { font: inherit; padding: 4px 12px; border-radius: 20px; cursor: pointer;
  background: var(--bar, #2a78d6); color: #fff; border: 0; }
#dashbar button[disabled] { opacity: 0.55; cursor: progress; }
#dashbar .dash-auto, #dashbar .dash-static { color: var(--muted, #888); display: flex; gap: 4px; align-items: center; }
#dashbar #dash-msg { color: var(--muted, #888); }
#dashbar.err #dash-msg { color: #d03b3b; }
/* The sidebar owns app selection while the dashboard is serving, so a report's
   own app tab bar would be a second control fighting the first. It stays in the
   file for opening reports/*.html straight off disk; here it is hidden. */
body.dash-hosted .tabbar { display: none; }
/* The hidden attribute is an HTML-namespace UA rule, so it does NOT reliably
   hide SVG children (a chart series, an end label). Chart series are exactly
   what the app filter needs to hide, so state it explicitly for both. */
[data-app-scope][hidden] { display: none !important; }
.dash-app-empty { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
  padding: 14px 20px; color: var(--muted, #888); font-size: 13px; font-style: italic; }
.dash-app-empty .dash-mini { font-style: normal; font-size: 11px; padding: 2px 10px;
  background: none; border: 1px solid var(--border, #ddd); border-radius: 12px;
  color: var(--ink-2, #444); cursor: pointer; }
/* A report's own sticky bar must sit below this one, not under it. Reports that
   stack a second sticky strip (the geo app name + sport chips) read --stick to
   park under the window toggle rather than on top of it. */
.winbar { top: ${BAR_H}px !important; }
body.dash-hosted { --stick: ${BAR_H}px; }
@media (max-width: 900px) {
  body { padding-left: 0; }
  #dashside { position: static; width: auto; border-right: 0; border-bottom: 1px solid var(--border, #ddd); }
  .winbar { top: 0 !important; }
}
</style>`;

const DASH_JS = `<script>
(function () {
  var bar = document.getElementById('dashbar');
  var lane = bar.dataset.lane;
  var msg = document.getElementById('dash-msg');
  var age = bar.querySelector('.dash-age');
  var btn = document.getElementById('dash-refresh');
  var auto = document.getElementById('dash-auto');
  document.body.classList.add('dash-hosted');

  // ---------- app filter ----------
  // One choice, shared by every report and remembered across them, because
  // "show me Doggle" is a question about the studio, not about one page.
  var boxes = [].slice.call(document.querySelectorAll('.dash-appbox'));
  var ALL = boxes.map(function (b) { return b.value; });
  var KEY = 'studio-apps';

  function selected() {
    return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
  }
  function apply() {
    // No fallback: unchecking every app hides every app. An earlier version
    // treated "none selected" as "show all", which quietly contradicted the
    // control — the page looked unfiltered while the boxes said otherwise.
    // Emptiness is honest here; what it must not be is a dead end, so the empty
    // state below carries a one-click way back.
    var eff = selected();
    var on = eff;
    try { localStorage.setItem(KEY, JSON.stringify(on)); } catch (e) {}
    // Published so a report's own script can narrow things the DOM cannot express
    // — the DAU crosshair reads one roster and lists every app in it.
    window.studioApps = eff.slice();
    window.dispatchEvent(new CustomEvent('studio:apps', { detail: eff.slice() }));

    // Dim the reports that cannot say anything about the current selection.
    document.querySelectorAll('#dashside .dash-item').forEach(function (a) {
      var covers = (a.getAttribute('data-apps') || '').split(' ').filter(Boolean);
      var hit = !covers.length || covers.some(function (x) { return eff.indexOf(x) !== -1; });
      a.classList.toggle('off', !hit);
    });

    // Filter this report's own app-scoped blocks. A block may name several apps.
    var scoped = document.querySelectorAll('[data-app-scope]');
    var shown = 0;
    scoped.forEach(function (el) {
      var mine = (el.getAttribute('data-app-scope') || '').split(' ').filter(Boolean);
      var vis = !mine.length || mine.some(function (x) { return eff.indexOf(x) !== -1; });
      el.hidden = !vis;
      if (vis) shown++;
    });

    var note = document.getElementById('dash-fnote');
    if (!on.length) {
      note.textContent = 'No app selected — everything app-specific is hidden.';
    } else if (scoped.length === 0) {
      // Being honest about reach matters more than looking clever: this report
      // has no per-app sections, so the filter changes nothing inside it.
      note.textContent = on.length < ALL.length
        ? 'This report is not split by app — the filter only dims the list above.'
        : '';
    } else {
      // Totals that span apps are computed server-side and are NOT re-derived
      // here — recomputing in the browser would be a second implementation that
      // can disagree with the first. Say so rather than let a page-wide total
      // look like it followed the filter.
      note.textContent = shown + ' of ' + scoped.length + ' sections shown.' +
        (on.length < ALL.length ? ' Totals that span apps still count every app.' : '');
    }

    // The empty state exists so an empty page is never a dead end: it says which
    // control caused it and undoes it in one click.
    var empty = document.getElementById('dash-app-empty');
    var blank = !on.length || (scoped.length > 0 && shown === 0);
    if (blank && !empty) {
      empty = document.createElement('p');
      empty.id = 'dash-app-empty';
      empty.className = 'dash-app-empty';
      var span = document.createElement('span');
      var undo = document.createElement('button');
      undo.type = 'button';
      undo.className = 'dash-mini';
      undo.textContent = 'Show all apps';
      undo.addEventListener('click', function () {
        boxes.forEach(function (b) { b.checked = true; });
        apply();
      });
      empty.appendChild(span);
      empty.appendChild(undo);
      bar.parentNode.insertBefore(empty, bar.nextSibling);
    }
    if (blank) {
      empty.firstChild.textContent = on.length
        ? 'Nothing to show: this report covers no app you have selected. '
        : 'Nothing to show: no app is selected in the sidebar. ';
    } else if (empty) empty.remove();
  }

  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(saved) && saved.length) {
      boxes.forEach(function (b) { b.checked = saved.indexOf(b.value) !== -1; });
    }
  } catch (e) {}
  boxes.forEach(function (b) { b.addEventListener('change', apply); });
  var allBtn = document.getElementById('dash-appall');
  if (allBtn) allBtn.addEventListener('click', function () {
    boxes.forEach(function (b) { b.checked = true; });
    apply();
  });
  // A report's own inline scripts run at the end of the body, BEFORE
  // DOMContentLoaded — running here means the filter has the last word over any
  // panel visibility they restored from their own localStorage key.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();

  // The index has the sidebar but no age or refresh of its own.
  function tickAge() {
    var at = age.getAttribute('data-at');
    if (!at) { age.textContent = 'never pulled'; return; }
    var s = Math.max(0, (Date.now() - Date.parse(at)) / 1000);
    var txt = 'data ' + (s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : (s / 3600).toFixed(1) + 'h') + ' old';
    // A background refresh was kicked off because this data was stale. Say so —
    // otherwise the page looks stale for no reason and the button looks unused.
    if (age.getAttribute('data-refreshing') === 'true') txt += ' · refreshing in the background, reload when it finishes';
    age.textContent = txt;
  }
  if (age) { tickAge(); setInterval(tickAge, 15000); }
  if (!btn) return;

  function refresh() {
    btn.disabled = true; bar.classList.remove('err'); msg.textContent = 'pulling...';
    return fetch('/api/refresh?lane=' + encodeURIComponent(lane), { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'refresh failed'); location.reload(); })
      .catch(function (e) {
        bar.classList.add('err');
        msg.textContent = String(e.message || e).slice(0, 200);
        btn.disabled = false;
      });
  }
  btn.addEventListener('click', refresh);

  // Auto-refresh survives a reload via localStorage, otherwise turning it on
  // would switch itself off at the first refresh it triggered.
  var timer = null;
  function setAuto(on) {
    auto.checked = on;
    try { localStorage.setItem('dash-auto-' + lane, on ? '1' : '0'); } catch (e) {}
    if (timer) { clearInterval(timer); timer = null; }
    if (on) timer = setInterval(refresh, 300000);
  }
  auto.addEventListener('change', function () { setAuto(auto.checked); });
  try { setAuto(localStorage.getItem('dash-auto-' + lane) === '1'); } catch (e) {}
})();
</script>`;

function inject(html, rep, all) {
  const strip = bar(rep, all, groupOrder());
  return html.includes("<main>") ? html.replace("<main>", strip + "<main>") : strip + html;
}

// ---------- index ----------

function indexPage(all) {
  const apps = appList();
  // Cards carry the same data-app-scope the reports use, so the sidebar filter
  // works identically here — the index is just another page it can narrow.
  const card = (r) => {
    const at = collectedAt(r);
    const missing = !existsSync(join(ROOT, r.file));
    return `<a class="card${r.unregistered ? " unreg" : ""}" href="/${esc(r.id)}" data-app-scope="${esc(appsOf(r, apps).join(" "))}">
  <span class="ct">${esc(r.title)}</span>
  <span class="cb">${esc(r.blurb ?? "")}</span>
  <span class="cf">
    <code>${esc(r.file)}</code>
    <span class="cage" data-at="${at ?? ""}">${missing ? "not built yet" : "&mdash;"}</span>
  </span>
</a>`;
  };
  const cards = grouped(all, groupOrder())
    .map(([group, reps]) => `<h2 class="gh">${esc(group)}</h2>\n<div class="grid">\n${reps.map(card).join("\n")}\n</div>`)
    .join("\n");
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Analytics Studio</title>
<style>
:root { color-scheme: light; --page:#f9f9f7; --surface:#fcfcfb; --ink:#0b0b0b; --ink-2:#52514e;
  --muted:#898781; --border:rgba(11,11,11,0.10); --bar:#2a78d6; }
@media (prefers-color-scheme: dark) { :root:where(:not([data-theme="light"])) {
  color-scheme: dark; --page:#0d0d0d; --surface:#1a1a19; --ink:#fff; --ink-2:#c3c2b7;
  --muted:#898781; --border:rgba(255,255,255,0.10); --bar:#3987e5; } }
*{box-sizing:border-box}
body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:880px;margin:0 auto;padding:40px 20px 60px}
h1{font-size:22px;margin:0 0 2px}
.meta{color:var(--muted);font-size:13px;margin:0 0 22px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.card{display:flex;flex-direction:column;gap:5px;background:var(--surface);border:1px solid var(--border);
  border-radius:10px;padding:14px 16px;text-decoration:none;color:inherit}
.card:hover{border-color:var(--bar)}
.card.unreg{border-style:dashed}
.ct{font-size:15px;font-weight:650}
.cb{color:var(--ink-2);font-size:12.5px;flex:1}
.cf{display:flex;justify-content:space-between;gap:8px;align-items:baseline;margin-top:4px}
.cf code,.cage{color:var(--muted);font-size:11px}
.cage{font-variant-numeric:tabular-nums;white-space:nowrap}
.note{color:var(--muted);font-size:12.5px;margin-top:24px}
h2.gh{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:22px 0 8px}
h2.gh:first-of-type{margin-top:0}
</style>
${bar(null, all, groupOrder())}
<main>
<h1>Analytics Studio</h1>
<p class="meta">${all.length} report${all.length === 1 ? "" : "s"} · localhost only, because these carry account emails and usernames · opening one re-pulls if its data is over ${Math.round(STALE_MS / 60000)} min old.</p>
${cards}
<p class="note">Reports come from <code>config/reports.json</code>: <code>group</code> orders these sections and <code>apps</code> drives the sidebar filter. Anything in <code>reports/*.html</code> that is not listed still appears here, marked unregistered — a new report is reachable the moment it exists; registering it is what gives it a title, a group and a refresh button.</p>
<script>
document.querySelectorAll('.cage[data-at]').forEach(function (el) {
  var at = el.getAttribute('data-at');
  if (!at) return;
  var s = Math.max(0, (Date.now() - Date.parse(at)) / 1000);
  el.textContent = (s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : (s / 3600).toFixed(1) + 'h') + ' old';
});
</script>
</main>`;
}

// ---------- server ----------

function send(res, code, type, body) {
  res.writeHead(code, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname;

  try {
    if (req.method === "POST" && path === "/api/refresh") {
      const rep = byId(url.searchParams.get("lane"));
      if (!rep) return send(res, 400, "application/json", JSON.stringify({ ok: false, error: "unknown report" }));
      try {
        const r = await runReport(rep);
        return send(res, 200, "application/json", JSON.stringify({ ok: true, ms: r.ms, collectedAt: collectedAt(rep) }));
      } catch (err) {
        return send(res, 500, "application/json", JSON.stringify({ ok: false, error: String(err.message).slice(0, 800) }));
      }
    }

    if (path === "/api/status") {
      return send(
        res,
        200,
        "application/json",
        JSON.stringify(
          catalog().map((r) => ({
            id: r.id,
            title: r.title,
            file: r.file,
            built: existsSync(join(ROOT, r.file)),
            collectedAt: collectedAt(r),
            stale: isStale(r),
            refreshable: !!r.scripts?.length,
          })),
          null,
          2,
        ),
      );
    }

    const all = catalog();
    if (path === "/") return send(res, 200, "text/html; charset=utf-8", indexPage(all));

    const rep = all.find((r) => `/${r.id}` === path);
    if (!rep) return send(res, 404, "text/html; charset=utf-8", `<p>No such report. <a href="/">All reports</a></p>`);

    const abs = join(ROOT, rep.file);
    const built = existsSync(abs);
    if (rep.scripts?.length && !built) {
      // Nothing on disk: there is no choice but to build before answering.
      try {
        await runReport(rep);
      } catch (err) {
        return send(res, 500, "text/plain; charset=utf-8", `Could not build ${rep.id}:\n\n${err.message}`);
      }
    } else if (rep.scripts?.length && isStale(rep)) {
      // Stale but present: serve what we have NOW and refresh behind it.
      //
      // This used to await the rebuild, which made opening a report cost
      // whatever its lane costs — the geo lane takes over a minute (100k places,
      // point-in-polygon over 71k cells), so a stale open was a 15-125 second
      // blank tab with nothing explaining the wait. Freshness is not worth that:
      // the age indicator already says how old the data is, the bar says a
      // refresh is running, and a reload once it finishes shows the new numbers.
      if (!running.has(rep.id)) runReport(rep).catch(() => {});
    }
    if (!existsSync(abs)) {
      return send(res, 404, "text/html; charset=utf-8", `<p><code>${esc(rep.file)}</code> does not exist yet, and this report has no refresh lane to build it. <a href="/">All reports</a></p>`);
    }
    return send(res, 200, "text/html; charset=utf-8", inject(readFileSync(abs, "utf8"), rep, all));
  } catch (err) {
    return send(res, 500, "text/plain; charset=utf-8", String(err.message));
  }
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Something else is listening there —`);
    console.error(`start on another one with:  PORT=4727 npm run serve`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, HOST, () => {
  const all = catalog();
  console.log(`Analytics dashboard  http://${HOST}:${PORT}`);
  for (const r of all) console.log(`  /${r.id.padEnd(10)} ${r.title}${r.unregistered ? "  (unregistered)" : ""}`);
  console.log(`  /api/status  every report as JSON`);
  console.log(`\nLocalhost only - the reports contain account emails and usernames.`);
  console.log(`Reload re-pulls when data is older than ${Math.round(STALE_MS / 60000)} min; the button always re-pulls.`);
});
