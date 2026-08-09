// US boundary machinery for the geo lane: TopoJSON decode, point-in-polygon,
// the AlbersUSA composite projection, and SVG path building.
//
// The vendored assets/us-{states,counties}-10m.json are in raw lon/lat, and
// that split is deliberate:
//   - DATA (assigning a point to a state/county) happens in geographic space
//     with plain even-odd ray casting — exact, no projection involved.
//   - DRAWING projects through a hand-rolled AlbersUSA (d3's parameters:
//     scale 1300, translate 487.5,305 for a 975x610 canvas). A projection bug
//     could only shift pixels, never move a count to the wrong county.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./studio.mjs";

// ---------- TopoJSON ----------

export function loadTopo(file) {
  return JSON.parse(readFileSync(join(ROOT, "assets", file), "utf8"));
}

/** Decode a topology object's geometries into { id, name, rings } where rings
 *  is a flat list of lon/lat rings (holes included — even-odd PIP absorbs
 *  them, and fill-rule evenodd draws them). */
export function decode(topo, objectName) {
  const tf = topo.transform;
  const arcs = topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]];
    });
  });
  const ring = (arcIdxs) => {
    const pts = [];
    for (const i of arcIdxs) {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      // consecutive arcs share their junction point; drop the duplicate
      pts.push(...(pts.length ? a.slice(1) : a));
    }
    return pts;
  };
  return topo.objects[objectName].geometries.map((g) => {
    const polys = g.type === "Polygon" ? [g.arcs] : g.type === "MultiPolygon" ? g.arcs : [];
    return { id: g.id, name: g.properties?.name ?? String(g.id), rings: polys.flat().map(ring) };
  });
}

// ---------- point-in-polygon (lon/lat, even-odd across all rings) ----------

export function bboxOf(rings) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of rings) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

export function contains(rings, bbox, lon, lat) {
  if (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3]) return false;
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

// ---------- AlbersUSA (d3's composite: lower 48 + Alaska + Hawaii insets) ----------

const RAD = Math.PI / 180;

function conicEqualArea({ rotate, center, parallels: [p1, p2], scale: k, translate: [tx, ty] }) {
  const sy0 = Math.sin(p1 * RAD);
  const n = (sy0 + Math.sin(p2 * RAD)) / 2;
  const c = 1 + sy0 * (2 * n - sy0);
  const r0 = Math.sqrt(c) / n;
  const raw = (lonR, latR) => {
    const r = Math.sqrt(c - 2 * n * Math.sin(latR)) / n;
    const x = lonR * n;
    return [r * Math.sin(x), r0 - r * Math.cos(x)];
  };
  // center is given in the rotated frame, exactly as d3 applies it
  const pc = raw(center[0] * RAD, center[1] * RAD);
  return (lon, lat) => {
    let l = lon + rotate;
    if (l > 180) l -= 360; else if (l < -180) l += 360;
    const p = raw(l * RAD, lat * RAD);
    return [tx + k * (p[0] - pc[0]), ty - k * (p[1] - pc[1])];
  };
}

export const MAP_W = 975, MAP_H = 610;
const K = 1300, TX = 487.5, TY = 305;
const lower48 = conicEqualArea({ rotate: 96, center: [-0.6, 38.7], parallels: [29.5, 45.5], scale: K, translate: [TX, TY] });
const alaska = conicEqualArea({ rotate: 154, center: [-2, 58.5], parallels: [55, 65], scale: K * 0.35, translate: [TX - 0.307 * K, TY + 0.201 * K] });
const hawaii = conicEqualArea({ rotate: 157, center: [-3, 19.9], parallels: [8, 18], scale: K, translate: [TX - 0.205 * K, TY + 0.212 * K] });

export function albersUsa(lon, lat) {
  if (lat > 50 && lon < -128) return alaska(lon, lat); // AK (Aleutians included)
  if (lat < 25 && lon < -140) return hawaii(lon, lat); // HI
  return lower48(lon, lat);
}

// ---------- SVG paths ----------

/** Project rings and build a path string. Points closer than `thin` px to the
 *  last kept point are dropped — pure size control, invisible at 1x zoom. */
export function svgPath(rings, { thin = 0.6 } = {}) {
  const parts = [];
  for (const r of rings) {
    let last = null;
    const kept = [];
    for (const [lon, lat] of r) {
      const p = albersUsa(lon, lat);
      if (last && Math.abs(p[0] - last[0]) < thin && Math.abs(p[1] - last[1]) < thin) continue;
      kept.push(p);
      last = p;
    }
    if (kept.length < 3) continue;
    parts.push("M" + kept.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + "Z");
  }
  return parts.join("");
}

/** Projected bbox of a set of ring-lists — used to crop a county panel's
 *  viewBox to its state. */
export function projectedBbox(ringsList, pad = 6) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const rings of ringsList) for (const r of rings) for (const [lon, lat] of r) {
    const [x, y] = albersUsa(lon, lat);
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
}

// FIPS -> postal code for the states (us-atlas ids are FIPS strings).
export const FIPS_TO_POSTAL = {
  "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA", "08": "CO", "09": "CT", 10: "DE",
  11: "DC", 12: "FL", 13: "GA", 15: "HI", 16: "ID", 17: "IL", 18: "IN", 19: "IA", 20: "KS",
  21: "KY", 22: "LA", 23: "ME", 24: "MD", 25: "MA", 26: "MI", 27: "MN", 28: "MS", 29: "MO",
  30: "MT", 31: "NE", 32: "NV", 33: "NH", 34: "NJ", 35: "NM", 36: "NY", 37: "NC", 38: "ND",
  39: "OH", 40: "OK", 41: "OR", 42: "PA", 44: "RI", 45: "SC", 46: "SD", 47: "TN", 48: "TX",
  49: "UT", 50: "VT", 51: "VA", 53: "WA", 54: "WV", 55: "WI", 56: "WY", 72: "PR", 78: "VI",
};
export const POSTAL_TO_FIPS = Object.fromEntries(Object.entries(FIPS_TO_POSTAL).map(([f, p]) => [p, String(f).padStart(2, "0")]));
