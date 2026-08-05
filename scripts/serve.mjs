// Dashboard server: serves the reports and can re-pull the source data on
// demand, so a browser reload shows current numbers instead of whatever the
// last cron run left on disk.
//
// Bound to 127.0.0.1 and nothing else, deliberately. The rendered reports carry
// account emails and usernames — the whole reason events.html and report.html
// are gitignored. A dashboard that put them on 0.0.0.0 would hand that to
// anything on the same coffee-shop wifi. If this ever needs to be remote, it
// needs auth first, not a wider bind.
//
// Refreshing runs the same scripts the daily lane runs; there is exactly one
// code path that produces a report, so the dashboard can never drift from the
// scheduled output.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { ROOT } from "./lib/studio.mjs";

const HOST = "127.0.0.1";
// Not a port anything standard claims. 4317/4318 are OpenTelemetry's and were
// already taken on this machine, which is exactly the failure worth avoiding:
// a dashboard that silently answers from someone else's service.
const PORT = Number(process.env.PORT ?? 4726);
// A reload after this long re-pulls before rendering, so a dashboard left open
// overnight is never quietly stale. Explicit refresh ignores it.
const STALE_MS = Number(process.env.DASHBOARD_STALE_MS ?? 10 * 60 * 1000);

const LANES = {
  events: {
    label: "Events",
    path: "/events",
    file: join(ROOT, "reports", "events.html"),
    data: join(ROOT, "data", "events.json"),
    scripts: ["scripts/events.mjs", "scripts/events-report.mjs"],
  },
  metrics: {
    label: "DAU & new users",
    path: "/metrics",
    file: join(ROOT, "reports", "report.html"),
    data: join(ROOT, "data", "metrics.json"),
    scripts: ["scripts/collect.mjs", "scripts/report.mjs"],
  },
};

// One refresh at a time per lane. Two overlapping runs would race on the same
// output files and could interleave a half-written report into a response.
const running = new Map();

function runLane(id) {
  if (running.has(id)) return running.get(id);
  const lane = LANES[id];
  const started = Date.now();
  const job = (async () => {
    const log = [];
    for (const script of lane.scripts) {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [join(ROOT, script)], { cwd: ROOT });
        child.stdout.on("data", (d) => log.push(String(d)));
        child.stderr.on("data", (d) => log.push(String(d)));
        child.on("error", reject);
        child.on("close", (code) =>
          // A partial failure still leaves a report worth reading, same as the
          // daily lane: only a hard non-zero from the collector aborts.
          code === 0 ? resolve() : reject(new Error(`${script} exited ${code}\n${log.join("")}`)),
        );
      });
    }
    return { ms: Date.now() - started, log: log.join("") };
  })();
  running.set(id, job);
  job.finally(() => running.delete(id));
  return job;
}

function collectedAt(id) {
  const lane = LANES[id];
  try {
    const j = JSON.parse(readFileSync(lane.data, "utf8"));
    if (j.collectedAt) return j.collectedAt;
  } catch { /* fall through to mtime */ }
  try {
    return new Date(statSync(lane.data).mtimeMs).toISOString();
  } catch {
    return null;
  }
}

function isStale(id) {
  const at = collectedAt(id);
  return !at || Date.now() - Date.parse(at) > STALE_MS;
}

// The served page gains a control strip the static file does not have. Keeping
// it here rather than in the generator means reports/events.html stays honest
// when opened straight off disk — no refresh button that cannot refresh.
function injectBar(html, id) {
  const at = collectedAt(id);
  const nav = Object.entries(LANES)
    .map(
      ([k, l]) =>
        `<a class="dash-tab${k === id ? " on" : ""}" href="${l.path}">${l.label}</a>`,
    )
    .join("");
  const bar = `<div id="dashbar">
  <span class="dash-nav">${nav}</span>
  <span class="dash-age" data-at="${at ?? ""}">—</span>
  <button id="dash-refresh" type="button">Pull fresh data</button>
  <label class="dash-auto"><input type="checkbox" id="dash-auto"> auto 5m</label>
  <span id="dash-msg"></span>
</div>
<style>
#dashbar { position: sticky; top: 0; z-index: 30; display: flex; gap: 10px; align-items: center;
  flex-wrap: wrap; padding: 8px 20px; background: var(--surface, #fff);
  border-bottom: 1px solid var(--border, #ddd); font: 13px system-ui, sans-serif; }
#dashbar .dash-tab { color: var(--muted, #888); text-decoration: none; padding: 3px 10px;
  border-radius: 20px; border: 1px solid transparent; }
#dashbar .dash-tab.on { color: var(--ink, #000); border-color: var(--border, #ddd); font-weight: 600; }
#dashbar .dash-age { color: var(--muted, #888); margin-left: auto; font-variant-numeric: tabular-nums; }
#dashbar button { font: inherit; padding: 4px 12px; border-radius: 20px; cursor: pointer;
  background: var(--bar, #2a78d6); color: #fff; border: 0; }
#dashbar button[disabled] { opacity: 0.55; cursor: progress; }
#dashbar .dash-auto { color: var(--muted, #888); display: flex; gap: 4px; align-items: center; }
#dashbar #dash-msg { color: var(--muted, #888); }
#dashbar.err #dash-msg { color: #d03b3b; }
/* The report's own sticky window bar must sit below this one, not under it. */
.winbar { top: 41px !important; }
</style>
<script>
(function () {
  var bar = document.getElementById('dashbar');
  var btn = document.getElementById('dash-refresh');
  var msg = document.getElementById('dash-msg');
  var age = document.getElementById('dash-age') || bar.querySelector('.dash-age');
  var auto = document.getElementById('dash-auto');
  var lane = ${JSON.stringify(id)};

  function tickAge() {
    var at = age.getAttribute('data-at');
    if (!at) { age.textContent = 'never pulled'; return; }
    var s = Math.max(0, (Date.now() - Date.parse(at)) / 1000);
    var t = s < 60 ? Math.round(s) + 's' : s < 3600 ? Math.round(s / 60) + 'm' : (s / 3600).toFixed(1) + 'h';
    age.textContent = 'data ' + t + ' old';
  }
  tickAge();
  setInterval(tickAge, 15000);

  function refresh() {
    btn.disabled = true;
    bar.classList.remove('err');
    msg.textContent = 'pulling...';
    fetch('/api/refresh?lane=' + encodeURIComponent(lane), { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || 'refresh failed');
        location.reload();
      })
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
</script>
`;
  // After <main> opens if possible, so the bar sits above the report content.
  return html.includes("<main>") ? html.replace("<main>", bar + "<main>") : bar + html;
}

function send(res, code, type, body) {
  res.writeHead(code, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    // Nothing here should ever be framed or leak a referrer to another origin.
    "referrer-policy": "no-referrer",
  });
  res.end(body);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const path = url.pathname;

  try {
    if (req.method === "POST" && path === "/api/refresh") {
      const lane = url.searchParams.get("lane");
      if (!LANES[lane]) return send(res, 400, "application/json", JSON.stringify({ ok: false, error: "unknown lane" }));
      try {
        const r = await runLane(lane);
        return send(res, 200, "application/json", JSON.stringify({ ok: true, ms: r.ms, collectedAt: collectedAt(lane) }));
      } catch (err) {
        return send(res, 500, "application/json", JSON.stringify({ ok: false, error: String(err.message).slice(0, 800) }));
      }
    }

    if (path === "/api/status") {
      const out = Object.fromEntries(Object.keys(LANES).map((k) => [k, { collectedAt: collectedAt(k), stale: isStale(k) }]));
      return send(res, 200, "application/json", JSON.stringify(out, null, 2));
    }

    const laneId = path === "/" ? "events" : Object.keys(LANES).find((k) => LANES[k].path === path);
    if (!laneId) return send(res, 404, "text/plain; charset=utf-8", "Not found");

    const lane = LANES[laneId];
    // A stale or missing report re-pulls before rendering, so the first load of
    // the morning is current without anyone thinking to press the button.
    if (!existsSync(lane.file) || isStale(laneId)) {
      try {
        await runLane(laneId);
      } catch (err) {
        if (!existsSync(lane.file)) {
          return send(res, 500, "text/plain; charset=utf-8", `Could not build ${laneId}:\n\n${err.message}`);
        }
        // A failed refresh with a report already on disk shows the old one
        // rather than an error page — stale data beats no data, and the age
        // indicator says how stale.
      }
    }
    return send(res, 200, "text/html; charset=utf-8", injectBar(readFileSync(lane.file, "utf8"), laneId));
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
  console.log(`Analytics dashboard  http://${HOST}:${PORT}`);
  console.log(`  /          events report (default)`);
  console.log(`  /metrics   DAU + new users`);
  console.log(`  /api/status  collection times as JSON`);
  console.log(`\nLocalhost only - the reports contain account emails and usernames.`);
  console.log(`Reload re-pulls when the data is older than ${Math.round(STALE_MS / 60000)} min; the button always re-pulls.`);
});
