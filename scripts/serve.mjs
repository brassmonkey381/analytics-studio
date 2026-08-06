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

// One refresh at a time per report. Two overlapping runs would race on the same
// output files and could interleave a half-written report into a response.
const running = new Map();

function runReport(rep) {
  if (running.has(rep.id)) return running.get(rep.id);
  if (!rep.scripts?.length) return Promise.reject(new Error(`${rep.id} has no refresh scripts`));
  const started = Date.now();
  const job = (async () => {
    const log = [];
    for (const script of rep.scripts) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [join(ROOT, script)], { cwd: ROOT });
        child.stdout.on("data", (d) => log.push(String(d)));
        child.stderr.on("data", (d) => log.push(String(d)));
        child.on("error", reject);
        child.on("close", (code) =>
          code === 0 ? resolve() : reject(new Error(`${script} exited ${code}\n${log.join("")}`)),
        );
      });
    }
    return { ms: Date.now() - started, log: log.join("") };
  })();
  running.set(rep.id, job);
  job.finally(() => running.delete(rep.id));
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
function bar(rep, all) {
  const at = collectedAt(rep);
  const nav = all
    .map((r) => `<a class="dash-tab${r.id === rep.id ? " on" : ""}" href="/${esc(r.id)}">${esc(r.title)}</a>`)
    .join("");
  return `<div id="dashbar" data-lane="${esc(rep.id)}" data-can-refresh="${!!rep.scripts?.length}">
  <a class="dash-home" href="/" title="All reports">&#9632;</a>
  <span class="dash-nav">${nav}</span>
  <span class="dash-age" data-at="${at ?? ""}">&mdash;</span>
  ${rep.scripts?.length ? `<button id="dash-refresh" type="button">Pull fresh data</button>
  <label class="dash-auto"><input type="checkbox" id="dash-auto"> auto 5m</label>` : `<span class="dash-static">no refresh lane</span>`}
  <span id="dash-msg"></span>
</div>${DASH_CSS}${DASH_JS}`;
}

const DASH_CSS = `<style>
#dashbar { position: sticky; top: 0; z-index: 30; display: flex; gap: 10px; align-items: center;
  flex-wrap: wrap; padding: 8px 20px; background: var(--surface, #fff);
  border-bottom: 1px solid var(--border, #ddd); font: 13px system-ui, sans-serif; }
#dashbar .dash-home { color: var(--muted, #888); text-decoration: none; font-size: 11px; }
#dashbar .dash-nav { display: flex; gap: 4px; flex-wrap: wrap; }
#dashbar .dash-tab { color: var(--muted, #888); text-decoration: none; padding: 3px 10px;
  border-radius: 20px; border: 1px solid transparent; }
#dashbar .dash-tab.on { color: var(--ink, #000); border-color: var(--border, #ddd); font-weight: 600; }
#dashbar .dash-age { color: var(--muted, #888); margin-left: auto; font-variant-numeric: tabular-nums; }
#dashbar button { font: inherit; padding: 4px 12px; border-radius: 20px; cursor: pointer;
  background: var(--bar, #2a78d6); color: #fff; border: 0; }
#dashbar button[disabled] { opacity: 0.55; cursor: progress; }
#dashbar .dash-auto, #dashbar .dash-static { color: var(--muted, #888); display: flex; gap: 4px; align-items: center; }
#dashbar #dash-msg { color: var(--muted, #888); }
#dashbar.err #dash-msg { color: #d03b3b; }
/* A report's own sticky bar must sit below this one, not under it. */
.winbar { top: 41px !important; }
</style>`;

const DASH_JS = `<script>
(function () {
  var bar = document.getElementById('dashbar');
  var lane = bar.dataset.lane;
  var msg = document.getElementById('dash-msg');
  var age = bar.querySelector('.dash-age');
  var btn = document.getElementById('dash-refresh');
  var auto = document.getElementById('dash-auto');

  function tickAge() {
    var at = age.getAttribute('data-at');
    if (!at) { age.textContent = 'never pulled'; return; }
    var s = Math.max(0, (Date.now() - Date.parse(at)) / 1000);
    age.textContent = 'data ' + (s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : (s / 3600).toFixed(1) + 'h') + ' old';
  }
  tickAge(); setInterval(tickAge, 15000);
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
  const strip = bar(rep, all);
  return html.includes("<main>") ? html.replace("<main>", strip + "<main>") : strip + html;
}

// ---------- index ----------

function indexPage(all) {
  const cards = all
    .map((r) => {
      const at = collectedAt(r);
      const missing = !existsSync(join(ROOT, r.file));
      return `<a class="card${r.unregistered ? " unreg" : ""}" href="/${esc(r.id)}">
  <span class="ct">${esc(r.title)}</span>
  <span class="cb">${esc(r.blurb ?? "")}</span>
  <span class="cf">
    <code>${esc(r.file)}</code>
    <span class="cage" data-at="${at ?? ""}">${missing ? "not built yet" : "&mdash;"}</span>
  </span>
</a>`;
    })
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
</style>
<main>
<h1>Analytics Studio</h1>
<p class="meta">${all.length} report${all.length === 1 ? "" : "s"} · localhost only, because these carry account emails and usernames · opening one re-pulls if its data is over ${Math.round(STALE_MS / 60000)} min old.</p>
<div class="grid">
${cards}
</div>
<p class="note">Reports come from <code>config/reports.json</code>. Anything in <code>reports/*.html</code> that is not listed still appears here, marked unregistered — a new report is reachable the moment it exists; registering it is what gives it a title and a refresh button.</p>
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
    // A stale or missing report re-pulls before rendering, so the first load of
    // the morning is current without anyone thinking to press the button.
    if (rep.scripts?.length && (!existsSync(abs) || isStale(rep))) {
      try {
        await runReport(rep);
      } catch (err) {
        if (!existsSync(abs)) {
          return send(res, 500, "text/plain; charset=utf-8", `Could not build ${rep.id}:\n\n${err.message}`);
        }
        // A failed refresh with a report already on disk serves the old one:
        // stale beats blank, and the age indicator says how stale.
      }
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
