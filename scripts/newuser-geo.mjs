// New-user geography lane: WHERE the real people who just signed up are, for the two
// apps whose product is place data (Doggle places, Pickleague venues), so the owner
// hears the morning a new user appears somewhere the ingestion pipeline has not run.
//
//   One fetch per app, rolling windows (24h / 7d / 30d / 90d) bucketed from created_at
//   in JS - a duration has no timezone, so these are NOT rezoned (see CLAUDE.md).
//
//   Location per user, best source first. Doggle: the saved home on the profile
//   (profiles.city/state/lat/lng; the 0158 column default Alameda 37.7652/-122.2416 is
//   "unset", not Alameda), then the saved place search, then a device fix (check-ins,
//   walks, gps debug). Pickleague has no home on the profile, so: a check-in GPS fix,
//   then the venue they checked in to / played at / favorited / planned, then a match
//   location, league home court, tournament, DUPR club. Coordinates are reverse-geocoded
//   through each app's OWN us_cities table (nearest_us_city), and the city centroid comes
//   from the same table - never from a person's coordinates.
//
//   Coverage comes from data/geo.json (the geo lane, which must have run first): places
//   ingested in the user's state, and in the county the centroid falls in (point-in-
//   polygon over the vendored county boundaries, the same way the geo lane buckets). A
//   county with 0 places under a new user is the alert this lane exists for.
//
//   Exclusions: exclusionCte(app) (config/exclusions.json, which since 2026-10-24 also
//   carries each app's own test-account flag), plus guests (anonymous auth or the app's
//   is_guest), deleted profiles and accounts with no profile row. Every excluded count is
//   written, never dropped.
//
// Writes data/newuser-geo.json (counts by city, committed) and data/newuser-geo-roster.json
// (one row per located user: id stub + city, gitignored - a person's city is identity).
// No report HTML: the digest is the consumer. A zero here has two meanings and the file
// says which: `noLocation` is "we can't see it", a missing city is "nobody signed up there".

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { ROOT, loadEnv, readConfig, runSql, exclusionCte } from "./lib/studio.mjs";
import { loadTopo, decode, contains, FIPS_TO_POSTAL } from "./lib/usmap.mjs";

loadEnv();
if (!process.env.SUPABASE_ACCESS_TOKEN) {
  console.error("FAILED: no SUPABASE_ACCESS_TOKEN in .env - this lane needs Management API access.");
  process.exit(1);
}

const APPS = readConfig("apps.json");
const refOf = (id) => APPS.apps.find((a) => a.id === id)?.projectRef;
const DATA_FILE = join(ROOT, "data", "newuser-geo.json");
const ROSTER_FILE = join(ROOT, "data", "newuser-geo-roster.json");
const GEO_FILE = join(ROOT, "data", "geo.json");

const DAYS = 90;
const WINDOWS = [1, 7, 30, 90];
const ACTIVE_DAYS = 14;

// Doggle's 0158 column default. A profile sitting exactly here never chose a location.
const DOGGLE_DEFAULT = { city: "alameda", state: "CA", lat: 37.7652, lng: -122.2416 };

const US_STATES = new Set(Object.values(FIPS_TO_POSTAL));
const inUS = (la, ln) =>
  (la > 24 && la < 50 && ln > -125 && ln < -66) || (la > 51 && la < 72 && ln > -170 && ln < -129) || (la > 18 && la < 23 && ln > -161 && ln < -154);

// ---------- per-app SQL: one row per real new user, with the best coordinate we can tie to them ----------

function doggleSql() {
  return `
with ${exclusionCte("doggle")},
nu as (
  select u.id, u.created_at, u.is_anonymous, p.city, p.state, p.lat, p.lng, p.last_place_search, null::timestamptz as deleted_at, (p.id is null) as no_profile
  from auth.users u left join public.profiles p on p.id = u.id
  where u.created_at >= now() - interval '${DAYS} days'
),
t as (select n.*, (n.id in (select id from excluded_users)) as ex from nu n),
real as (select * from t where not ex and not coalesce(is_anonymous,false) and deleted_at is null and not no_profile),
gps as (
  select distinct on (user_id) user_id, lat, lng from (
    select profile_id as user_id, fix_lat lat, fix_lng lng, created_at at from public.dog_place_checkins where fix_lat is not null
    union all select profile_id, start_lat, start_lng, started_at from public.walks where start_lat is not null
    union all select profile_id, lat, lng, at from public.gps_debug_events where lat is not null and kind in ('fix','checkin','passive_tick','walk_eval')
  ) x where user_id in (select id from real) order by user_id, at desc
),
per as (
  select r.id, r.created_at,
    case
      when r.lat is not null and not (r.lat = ${DOGGLE_DEFAULT.lat} and r.lng = ${DOGGLE_DEFAULT.lng} and lower(r.city) = '${DOGGLE_DEFAULT.city}' and r.state = '${DOGGLE_DEFAULT.state}') then 'home'
      when (r.last_place_search->>'lat') is not null then 'last_place_search'
      when g.lat is not null then 'device_gps'
    end as src,
    case
      when r.lat is not null and not (r.lat = ${DOGGLE_DEFAULT.lat} and r.lng = ${DOGGLE_DEFAULT.lng} and lower(r.city) = '${DOGGLE_DEFAULT.city}' and r.state = '${DOGGLE_DEFAULT.state}') then r.lat
      when (r.last_place_search->>'lat') is not null then (r.last_place_search->>'lat')::float8
      else g.lat end as lat,
    case
      when r.lat is not null and not (r.lat = ${DOGGLE_DEFAULT.lat} and r.lng = ${DOGGLE_DEFAULT.lng} and lower(r.city) = '${DOGGLE_DEFAULT.city}' and r.state = '${DOGGLE_DEFAULT.state}') then r.lng
      when (r.last_place_search->>'lng') is not null then (r.last_place_search->>'lng')::float8
      else g.lng end as lng,
    exists (select 1 from public.analytics_sessions s where s.user_id = r.id and s.started_at >= now() - interval '${ACTIVE_DAYS} days') as active,
    (select platform from public.analytics_sessions s where s.user_id = r.id order by started_at limit 1) as platform
  from real r left join gps g on g.user_id = r.id
)
select
  (select count(*)::int from nu) as total,
  (select count(*)::int from t where ex) as excluded,
  (select count(*)::int from t where not ex and coalesce(is_anonymous,false)) as guests,
  (select count(*)::int from t where not ex and not coalesce(is_anonymous,false) and (deleted_at is not null or no_profile)) as deleted_or_no_profile,
  (select count(*)::int from real) as real,
  (select count(distinct device_id)::int from public.analytics_sessions where started_at >= now() - interval '${DAYS} days' and user_id is null) as signed_out_devices,
  (select coalesce(json_agg(json_build_object('stub', left(id::text, 8), 'created_at', created_at, 'src', src, 'lat', lat, 'lng', lng, 'active', active, 'platform', platform)), '[]'::json) from per) as rows;`;
}

function pickleagueSql() {
  return `
with ${exclusionCte("pickleague")},
nu as (
  select u.id, u.created_at, u.is_anonymous, p.is_guest, p.deleted_at, (p.id is null) as no_profile
  from auth.users u left join public.profiles p on p.id = u.id
  where u.created_at >= now() - interval '${DAYS} days'
),
t as (select n.*, (n.id in (select id from excluded_users)) as ex from nu n),
real as (select * from t where not ex and not coalesce(is_anonymous,false) and not coalesce(is_guest,false) and deleted_at is null and not no_profile),
loc as (
  select user_id, src, lat, lng, at from (
    select c.user_id, 'checkin_gps' src, c.fix_lat lat, c.fix_lng lng, c.created_at at from public.venue_checkins c where c.fix_lat is not null
    union all select c.user_id, 'checkin_venue', v.lat, v.lng, c.created_at from public.venue_checkins c join public.venues v on v.id = c.venue_id where v.lat is not null
    union all select s.user_id, 'play_session_venue', v.lat, v.lng, s.created_at from public.play_sessions s join public.venues v on v.id = s.venue_id where v.lat is not null
    union all select f.user_id, 'favorite_venue', v.lat, v.lng, f.created_at from public.court_favorites f join public.venues v on v.id = f.venue_id where v.lat is not null
    union all select p.user_id, 'plan_venue', v.lat, v.lng, p.created_at from public.court_plans p join public.venues v on v.id = p.venue_id where v.lat is not null
    union all select r.user_id, 'routine_venue', v.lat, v.lng, r.created_at from public.court_routines r join public.venues v on v.id = r.venue_id where v.lat is not null
    union all select x.uid, 'match_location', m.location_lat, m.location_lng, m.created_at
      from public.matches m cross join lateral (values (m.player1_id),(m.player2_id),(m.partner1_id),(m.partner2_id)) x(uid)
      where m.location_lat is not null and x.uid is not null
    union all select lm.user_id, 'league_home_court', coalesce(l.home_court_lat, v.lat), coalesce(l.home_court_lng, v.lng), lm.joined_at
      from public.league_members lm join public.leagues l on l.id = lm.league_id left join public.venues v on v.id = l.home_venue_id
      where coalesce(l.home_court_lat, v.lat) is not null
    union all select tr.user_id, 'tournament_location', tt.location_lat, tt.location_lng, tr.registered_at
      from public.tournament_registrations tr join public.tournaments tt on tt.id = tr.tournament_id where tt.location_lat is not null
    union all select d.profile_id, 'dupr_club', d.dupr_latitude, d.dupr_longitude, d.first_seen_at
      from public.dupr_club_members d where d.profile_id is not null and d.dupr_latitude is not null
  ) z where user_id in (select id from real)
),
ranked as (
  select *, row_number() over (partition by user_id order by
    case src when 'checkin_gps' then 1 when 'checkin_venue' then 2 when 'play_session_venue' then 3 when 'favorite_venue' then 4
             when 'plan_venue' then 5 when 'routine_venue' then 6 when 'match_location' then 7 when 'league_home_court' then 8
             when 'tournament_location' then 9 else 10 end, at desc) rn
  from loc
),
per as (
  select r.id, r.created_at, b.src, b.lat, b.lng,
    exists (select 1 from public.analytics_sessions s where s.user_id = r.id and s.started_at >= now() - interval '${ACTIVE_DAYS} days') as active,
    (select platform from public.analytics_sessions s where s.user_id = r.id order by started_at limit 1) as platform
  from real r left join ranked b on b.user_id = r.id and b.rn = 1
)
select
  (select count(*)::int from nu) as total,
  (select count(*)::int from t where ex) as excluded,
  (select count(*)::int from t where not ex and (coalesce(is_anonymous,false) or coalesce(is_guest,false))) as guests,
  (select count(*)::int from t where not ex and not coalesce(is_anonymous,false) and not coalesce(is_guest,false) and (deleted_at is not null or no_profile)) as deleted_or_no_profile,
  (select count(*)::int from real) as real,
  (select count(distinct device_id)::int from public.analytics_sessions where started_at >= now() - interval '${DAYS} days' and user_id is null) as signed_out_devices,
  (select coalesce(json_agg(json_build_object('stub', left(id::text, 8), 'created_at', created_at, 'src', src, 'lat', lat, 'lng', lng, 'active', active, 'platform', platform)), '[]'::json) from per) as rows;`;
}

const LANES = {
  doggle: { sql: doggleSql, unit: "places" },
  pickleague: { sql: pickleagueSql, unit: "venues" },
};

// ---------- coverage: the geo lane's committed output + county boundaries ----------

const geo = existsSync(GEO_FILE) ? JSON.parse(readFileSync(GEO_FILE, "utf8")) : null;
if (!geo) console.warn("data/geo.json is missing: coverage will be reported as unknown, not as zero.");
const countiesGeo = decode(loadTopo("us-counties-10m.json"), "counties").map((c) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const ring of c.rings) for (const [x, y] of ring) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  return { ...c, bbox: [minX, minY, maxX, maxY] };
});
const countyAt = (lon, lat) => countiesGeo.find((c) => contains(c.rings, c.bbox, lon, lat)) ?? null;

function coverageFor(app, state, lon, lat) {
  const g = geo?.apps?.[app];
  if (!g) return { known: false };
  const cty = lon != null && lat != null ? countyAt(lon, lat) : null;
  const st = g.states?.[state] ?? null;
  return {
    known: true,
    statePlaces: st?.n ?? 0,
    stateCovered: !!st && st.n > 0,
    county: cty?.name ?? null,
    fips: cty?.id ?? null,
    countyPlaces: cty ? (g.counties?.[cty.id]?.n ?? 0) : null,
  };
}

// ---------- run ----------

const NOW = Date.now();
const out = { collectedAt: new Date().toISOString(), windows: WINDOWS, activeDays: ACTIVE_DAYS, geoCollectedAt: geo?.collectedAt ?? null, apps: {} };
const roster = { collectedAt: out.collectedAt, apps: {} };

for (const [app, lane] of Object.entries(LANES)) {
  const ref = refOf(app);
  if (!ref) { console.warn(`${app}: no projectRef in config/apps.json, skipped`); continue; }
  const t0 = Date.now();
  const [agg] = await runSql(ref, lane.sql());
  const rows = agg.rows ?? [];
  console.log(`${app}: ${agg.total} accounts in ${DAYS}d, ${agg.excluded} excluded, ${agg.guests} guests, ${agg.real} real, ${rows.filter((r) => r.lat != null).length} located (${Date.now() - t0} ms)`);

  // Reverse-geocode through the app's own table; centroid per city from the same table.
  const located = rows.filter((r) => r.lat != null);
  if (located.length) {
    const vals = located.map((r, i) => `(${i}, ${Number(r.lat)}::float8, ${Number(r.lng)}::float8)`).join(",");
    const rc = await runSql(ref, `select v.i, public.nearest_us_city(v.la, v.ln) as c from (values ${vals}) v(i, la, ln)`);
    for (const x of rc) {
      const c = typeof x.c === "string" ? JSON.parse(x.c) : x.c;
      if (c) { located[x.i].city = c.city; located[x.i].state = c.state ?? c.state_code; }
    }
  }
  for (const r of located) {
    const isUs = r.state ? US_STATES.has(String(r.state).toUpperCase()) : inUS(Number(r.lat), Number(r.lng));
    if (!isUs) { r.city = null; r.state = null; r.foreign = true; }
  }
  const keys = [...new Set(located.filter((r) => r.city).map((r) => `${r.city}|${r.state}`))];
  const cent = {};
  if (keys.length) {
    const vals = keys.map((k, i) => { const [c, s] = k.split("|"); return `(${i}, '${c.replace(/'/g, "''")}', '${String(s).replace(/'/g, "''")}')`; }).join(",");
    const gc = await runSql(ref, `select v.i, public.geocode_city_state(v.c, v.s) as g from (values ${vals}) v(i, c, s)`);
    for (const x of gc) { const g = typeof x.g === "string" ? JSON.parse(x.g) : x.g; if (g) cent[keys[x.i]] = [g.lat, g.lng]; }
  }

  // Coverage once per city (centroid), so every user in a city reads the same answer.
  const cover = {};
  for (const k of keys) {
    const [, s] = k.split("|");
    const c = cent[k] ?? [null, null];
    cover[k] = coverageFor(app, s, c[1], c[0]);
  }

  const windows = {};
  for (const w of WINDOWS) {
    const since = NOW - w * 86400_000;
    const inWin = rows.filter((r) => Date.parse(r.created_at) >= since);
    const byCity = {};
    for (const r of inWin) {
      if (!r.city) continue;
      const k = `${r.city}|${r.state}`;
      const e = (byCity[k] ??= { city: r.city, state: r.state, users: 0, active: 0, sources: {} });
      e.users++; if (r.active) e.active++; e.sources[r.src] = (e.sources[r.src] ?? 0) + 1;
    }
    const cities = Object.values(byCity)
      .sort((a, b) => b.users - a.users || b.active - a.active || a.state.localeCompare(b.state))
      .map((e) => {
        const k = `${e.city}|${e.state}`;
        const c = cent[k] ?? [null, null];
        const cv = cover[k];
        return {
          ...e,
          lat: c[0] != null ? +Number(c[0]).toFixed(3) : null,
          lng: c[1] != null ? +Number(c[1]).toFixed(3) : null,
          coverage: cv,
          // The alert: a real person signed up somewhere the pipeline has not run.
          alert: cv.known ? (!cv.stateCovered ? "state" : cv.countyPlaces === 0 ? "county" : null) : "unknown",
        };
      });
    const byState = {};
    for (const c of cities) byState[c.state] = (byState[c.state] ?? 0) + c.users;
    windows[w] = {
      real: inWin.length,
      active: inWin.filter((r) => r.active).length,
      located: inWin.filter((r) => r.city).length,
      foreign: inWin.filter((r) => r.foreign).length,
      noLocation: inWin.filter((r) => r.lat == null).length,
      activeLocated: inWin.filter((r) => r.active && r.city).length,
      bySource: inWin.reduce((m, r) => ((m[r.src ?? "none"] = (m[r.src ?? "none"] ?? 0) + 1), m), {}),
      byPlatform: inWin.reduce((m, r) => ((m[r.platform ?? "none"] = (m[r.platform ?? "none"] ?? 0) + 1), m), {}),
      byState: Object.entries(byState).sort((a, b) => b[1] - a[1]).map(([state, users]) => ({ state, users })),
      cities,
    };
  }

  out.apps[app] = {
    unit: lane.unit,
    days: DAYS,
    totals: { accounts: agg.total, excluded: agg.excluded, guests: agg.guests, deletedOrNoProfile: agg.deleted_or_no_profile, real: agg.real, signedOutDevices: agg.signed_out_devices },
    windows,
  };
  roster.apps[app] = rows.map((r) => ({
    stub: r.stub,
    created_at: r.created_at,
    city: r.city ?? null,
    state: r.state ?? null,
    src: r.src ?? null,
    foreign: !!r.foreign,
    active: !!r.active,
    platform: r.platform ?? null,
    coverage: r.city ? cover[`${r.city}|${r.state}`] : null,
  }));
}

mkdirSync(join(ROOT, "data"), { recursive: true });
writeFileSync(DATA_FILE, JSON.stringify(out, null, 2));
writeFileSync(ROSTER_FILE, JSON.stringify(roster, null, 2));
for (const [app, a] of Object.entries(out.apps)) {
  const w = a.windows[90];
  const alerts = w.cities.filter((c) => c.alert && c.alert !== "unknown");
  console.log(`${app} 90d: ${w.real} real, ${w.located} located, ${w.noLocation} no location; ${alerts.length} city/cities outside ingestion: ${alerts.map((c) => `${c.city}, ${c.state} (${c.alert})`).join("; ") || "none"}`);
}
console.log(`Wrote ${DATA_FILE} and ${ROSTER_FILE}`);
