import fs from 'node:fs'; import { createRequire } from 'node:module';
import { feature } from 'topojson-client'; import { geoMercator } from 'd3-geo';
const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-50m.json');
const all = feature(topo, topo.objects.countries).features; const land = [all.find((f) => f.id === '380'), ...all.filter((f) => ['250', '756', '040', '705', '191', '674', '336', '470', '070', '008'].includes(f.id))];
export function panorama(punti, WT, HT, box) { // box: [left, top, right, bottom] dove devono stare i punti
  const base = geoMercator().scale(1).translate([0, 0]); const a = -60 * Math.PI / 180;
  const rot = (q) => [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a)];
  const R = punti.map(([la, ln]) => rot(base([ln, la])));
  const xs = R.map((p) => p[0]), ys = R.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0));
  const ox = box[0] + ((box[2] - box[0]) - (x1 - x0) * k) / 2 - x0 * k, oy = box[1] + ((box[3] - box[1]) - (y1 - y0) * k) / 2 - y0 * k;
  const P = (la, ln) => { const r = rot(base([ln, la])); return [r[0] * k + ox, r[1] * k + oy]; };
  const path = land.map((f) => { const g = f.geometry; const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return polys.map((poly) => poly.map((ring) => 'M' + ring.map((c) => P(c[1], c[0]).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z').join('')).join(''); });
  return { P, it: path[0], altri: path.slice(1).join('') };
}
