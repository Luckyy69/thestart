// OWNER: cliff agent. CLIFF (shot 5): a prehistoric riverbank cliff in a RAINSTORM with a low sun breaking through.
//
// A layered, wet, mossy rock face (strata slabs with lips = holds, staggered joints, rivulets running down, wet glints)
// rises out of a rushing river. Its right edge is a corner: the gorge wall turns back (-z) and the river comes toward
// the lens out of a misty valley on the right, rapids around boulders at the corner, then flows left along the cliff
// foot. A gnarled tree on the cliff top throws a slick mossy BRANCH out to the right over the river. Far away: misty
// hill ridges, araucaria silhouettes, a curious long-neck dino on the far bank, a storm cloud deck (procedural dome)
// with a gap where the low sun breaks through (gold linings, crepuscular rays, rain curtains, a rainbow hint), one soft
// sheet-lightning flicker at the start. Rain everywhere: two instanced streak layers (gold where back-lit by the sun),
// splash crowns on every ledge/boulder/branch top, drips falling off the branch, ripple rings + sun glitter on the river,
// a puddle on the foot boulder, mist banks in the gorge, god-ray shafts. All NOINK effects are pure functions of t.
// Everything sun-dependent reads LOOKS.rain at runtime (same camera-relative formula as world.ts), so the looks owner
// can move the sun and the gap / rays / glitter / rainbow follow.
//
// CONTRACTS (LOCAL to CLIFF = (3000,0,0), metres; +z = toward the first-pass camera; the exports are WORLD):
//   FACE: the climbing face is the plane z ~ 0 (rock within -0.10..+0.16 in the climb column x -1.6..1.0, y 0.75..4.3),
//     facing +z (cast: card scale 0.75 = 1.6 m tall; HOLD_A is 1.15 m above HOLD_B). Cliff-top lip y ~4.35 at x -0.4 (slightly higher to the left). Corner at x ~0.8: right of it the gorge.
//   CLIFF_START (-0.5, 0.56, 0.5): a broad ledge (top y 0.56, sticks out to z ~0.42) where the climb starts (feet).
//   HOLD_B (-0.75, 2.20, ~0.27): FOOT hold (a narrow crumbly lip, flat top y 2.20; z = its front). He slips off it
//     (cliffAt.slip): a few pebbles break off here and tumble into the river.
//   HOLD_A (-0.35, 3.35, ~0.29): HAND hold (a rounded lip, flat top y 3.35; z = its front). His pruney fingers GRIP here.
//   BRANCH_POS (1.8, ~4.79, -0.3): top surface of the branch where his hands land (radius ~0.15 there, runs along x,
//     slightly rising to the right; branchTopY(x) gives the top for x 0.8..3.6). branchAt(id,t).dy: the dip + wobble
//     when he lands (at cliffAt.swing ~0.72, <= 4 cm) - add it to BRANCH_POS.
//   CARD PLANES: on the face put the ancestor card at z = 0.5 (CLIFF_CARD_Z; >= 0.2 m in front of the holds). Hanging
//     on / sitting on the branch: card z = 0.10 (BRANCH_CARD_Z; branch axis z -0.3).
//   CAMERA CORRIDOR: x -4..6, z 2.5..13, y -0.6..8 is open air over the river (water y -1.6). Nothing there.
//   Tested vantages (local; pos -> look, fov):
//     first-pass   (0,3,9)        -> (0,2.5,0)        45
//     HERO wide    (-1.4,2.2,9.5) -> (0.6,2.9,0)      42   cliff left, branch + river + sun gap right
//     GRIP close   (0.35,3.7,3.3) -> (-0.35,3.3,0.3)  40   hands on HOLD_A, river below
//     BRANCH       (3.4,3.4,6.2)  -> (1.6,4.2,-0.3)   42   the swing / landing, gorge + sky behind
//     WORM low     (1.2,-0.7,7.5) -> (0.1,2.8,0)      45   low over the water looking up the face
// Visible only while shot 5 is on screen (root.visible = id === 5).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { CLIFF, SHOTS, W, camAt, cliffAt, shotStart, V3 as T3 } from "./story";
import { LOOKS } from "./looks";

// ---------------- DEBUG (all OFF for delivery) ----------------
const DEBUG_CAM: { pos: T3; look: T3; fov: number } | null = null;
const DEBUG_SUN: [number, number] | null = null; // [az, el] override of LOOKS.rain for test stills
const DEBUG_MARKS = false;
if (DEBUG_SUN) { LOOKS.rain.sunAz = DEBUG_SUN[0]; LOOKS.rain.sunEl = DEBUG_SUN[1]; LOOKS.rain.sunDisc = true; }

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Cw = (x: number, y: number, z: number): T3 => [CLIFF[0] + x, CLIFF[1] + y, CLIFF[2] + z];
const TAU = Math.PI * 2;
const HA = [-0.35, 3.35], HB = [-0.75, 2.2];
const WATER_Y = -1.6;
/** card planes (world z) */
export const CLIFF_CARD_Z = CLIFF[2] + 0.5, BRANCH_CARD_Z = CLIFF[2] + 0.1;

// ============================================================ noise
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const lerpC = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));
const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), typeof s === "number" ? V(s, s, s) : V(...s));
const tf = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { g.applyMatrix4(m); return g; };
const merge = (l: THREE.BufferGeometry[]) => mergeGeometries(l, false)!;
/** canonical non-indexed attribute set (position, normal, uv, color) */
const clean = (g0: THREE.BufferGeometry, col: THREE.ColorRepresentation | ((p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) = "#ffffff") => {
  if (!g0.getAttribute("normal")) g0.computeVertexNormals();
  const s = g0.index ? g0.toNonIndexed() : g0;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const ca = new Float32Array(n * 3), pa = out.getAttribute("position"), na = out.getAttribute("normal"), v = V(0, 0, 0), nn = V(0, 0, 0), fixed = typeof col === "function" ? null : C(col);
  for (let i = 0; i < n; i++) {
    const c = fixed ?? (col as (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color)(v.fromBufferAttribute(pa, i), nn.fromBufferAttribute(na, i));
    ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b;
  }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
class Soup {
  p: number[] = []; c: number[] = [];
  tri(a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, ca: THREE.Color, cb: THREE.Color, cd: THREE.Color) {
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
    this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cd.r, cd.g, cd.b);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((this.p.length / 3) * 2), 2));
    return g;
  }
}
const tube = (pts: THREE.Vector3[], r: (u: number) => number, seg = 12, rad = 8, vTile = 1, wob = 0, seed = 0) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const len = curve.getLength();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, c = curve.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j, a = (j / rad) * TAU;
      const rr = r(u) * (1 + wob * vn(Math.cos(a) * 1.5 + seed, u * len * 0.9 + Math.sin(a) * 1.5));
      p.setXYZ(k, c.x + n.getX(k) * rr, c.y + n.getY(k) * rr, c.z + n.getZ(k) * rr);
      uv.setXY(k, j / rad, (u * len) / vTile);
    }
  }
  g.computeVertexNormals();
  return g;
};

// ============================================================ the cliff outline (plan view) + signed distance
// travelling along the outline, the river is on the +normal side; s' = arc length, 0 at the face point (0, 0), so on
// the climbing face s' ~ x
const OUT_PTS: [number, number][] = [[-70, 1.6], [-30, 1.0], [-12, 0.55], [-5, 0.18], [-1.5, 0.02], [0.3, 0], [0.82, -0.2], [1.18, -0.85],
  [1.32, -2.2], [1.4, -6], [1.1, -16], [-0.5, -40], [-5, -80], [-13, -140], [-26, -240]];
const OCURVE = new THREE.CatmullRomCurve3(OUT_PTS.map(([x, z]) => V(x, 0, z)), false, "centripetal");
const NS = 6000, OLEN = OCURVE.getLength();
const OX = new Float32Array(NS + 1), OZ = new Float32Array(NS + 1), ONX = new Float32Array(NS + 1), ONZ = new Float32Array(NS + 1);
{
  const pts = OCURVE.getSpacedPoints(NS);
  for (let i = 0; i <= NS; i++) {
    OX[i] = pts[i].x; OZ[i] = pts[i].z;
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(NS, i + 1)], tx = b.x - a.x, tz = b.z - a.z, l = Math.hypot(tx, tz) || 1;
    ONX[i] = -tz / l; ONZ[i] = tx / l;
  }
}
const DS = OLEN / NS;
const S0 = (() => { let b = 0, bd = 1e9; for (let i = 0; i <= NS; i++) { const d = Math.hypot(OX[i], OZ[i]); if (d < bd) { bd = d; b = i; } } return b * DS; })();
/** outline point + outward normal at local arc length s' */
const outAt = (sp: number) => {
  const k = Math.max(0, Math.min(NS - 1e-4, (sp + S0) / DS)), i = Math.floor(k), f = k - i;
  const nx = ONX[i] + (ONX[i + 1] - ONX[i]) * f, nz = ONZ[i] + (ONZ[i + 1] - ONZ[i]) * f, l = Math.hypot(nx, nz) || 1;
  return { x: OX[i] + (OX[i + 1] - OX[i]) * f, z: OZ[i] + (OZ[i + 1] - OZ[i]) * f, nx: nx / l, nz: nz / l };
};
/** signed distance to the outline (+ = river side) and s' of the nearest point */
const sdf = (x: number, z: number) => {
  let b = 0, bd = 1e18;
  for (let i = 0; i <= NS; i += 24) { const d = (OX[i] - x) ** 2 + (OZ[i] - z) ** 2; if (d < bd) { bd = d; b = i; } }
  const lo = Math.max(0, b - 30), hi = Math.min(NS, b + 30);
  for (let i = lo; i <= hi; i++) { const d = (OX[i] - x) ** 2 + (OZ[i] - z) ** 2; if (d < bd) { bd = d; b = i; } }
  return { n: (x - OX[b]) * ONX[b] + (z - OZ[b]) * ONZ[b], s: b * DS - S0 };
};
/** cliff-top lip height along the outline */
const topY = (sp: number) => 4.35 + 0.35 * sm((-sp - 1.4) / 6) + 0.25 * sm((-sp - 9) / 20) + (sp > 1.2 ? 0.02 * (sp - 1.2) + 0.00002 * (sp - 1.2) ** 2 : 0)
  + 0.18 * vn(sp * 0.18, 3) * sm(Math.abs(sp + 0.3) / 3 - 0.6);

// ============================================================ the rock face displacement (along the outward normal)
/** climb column mask (kept flat for the card) */
const climbZone = (sp: number, y: number) => sm((1.3 - Math.abs(sp + 0.3)) / 0.35) * sm((y - 0.62) / 0.2) * sm((4.32 - y) / 0.12);
const BAND = 0.56;
const faceD = (sp: number, y: number) => {
  const far = 1 + 0.7 * sm((Math.abs(sp) - 6) / 10);
  const yy = y + 0.035 * sp + 0.12 * vn(sp * 0.22, 1.3);
  const k = Math.floor(yy / BAND), f = yy / BAND - k;
  const amp = (0.08 + 0.2 * hash(k, 7.1)) * (0.65 + 0.55 * (0.5 + 0.5 * vn(sp * 0.33 + k * 3.1, k * 1.7))) * far;
  let d = amp * Math.pow(f, 1.45) * (1 - 0.3 * sm((f - 0.9) / 0.1));
  // staggered vertical joints (blocky slabs)
  const cj = sp * 0.85 + hash(k, 2.3) * 0.9 + 0.12 * vn(y * 0.7, k);
  const g = cj - Math.floor(cj), gg = Math.min(g, 1 - g);
  d -= 0.07 * Math.exp(-((gg / 0.03) ** 2)) * far;
  d += 0.06 * vn(sp * 1.6, y * 1.6) + 0.025 * vn(sp * 4.2, y * 4.2) + 0.28 * vn(sp * 0.2, y * 0.26 + 5) * far;
  d += 0.55 * sm((-0.4 - y) / 1.5);                                       // talus flare into the water
  const cz = climbZone(sp, y);
  d = d * (1 - cz) + Math.max(-0.1, Math.min(0.16, d * 0.75)) * cz;      // flat climb column
  // the START ledge (top y 0.56), HOLD_B (foot, top 2.20), HOLD_A (hand, top 3.35): flat-topped rounded lips
  const lip = (cx: number, top: number, w: number, h: number, out: number) => out * sm((1 - Math.abs(sp - cx) / w) / 0.35) * sm((y - (top - h)) / (h * 0.8)) * (1 - sm((y - top + 0.012) / 0.03));
  d += lip(-0.45, 0.56, 1.45, 0.32, 0.42) + lip(HB[0], HB[1], 0.32, 0.16, 0.09) + lip(HA[0], HA[1], 0.42, 0.2, 0.1);
  return Math.max(-0.3, d);
};
const faceZAt = (sp: number, y: number) => { const o = outAt(sp); return o.z + o.nz * faceD(sp, y); };
export const CLIFF_START = Cw(-0.5, 0.56, 0.5);
export const HOLD_A = Cw(HA[0], HA[1], +faceZAt(HA[0], HA[1] - 0.04).toFixed(3));
export const HOLD_B = Cw(HB[0], HB[1], +faceZAt(HB[0], HB[1] - 0.04).toFixed(3));

// ============================================================ the branch
const BR_PTS = [V(0.06, 5.45, -1.42), V(0.6, 5.12, -0.95), V(1.2, 4.84, -0.52), V(1.8, 4.62, -0.3), V(2.6, 4.57, -0.26), V(3.5, 4.7, -0.42), V(4.35, 4.95, -0.66)];
const BR_CURVE = new THREE.CatmullRomCurve3(BR_PTS);
const BR_R = (u: number) => 0.06 + 0.2 * Math.pow(1 - u, 1.2);
const brUAtX = (x: number) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (BR_CURVE.getPointAt(m).x < x) lo = m; else hi = m; } return (lo + hi) / 2; };
/** world y of the branch's top surface at local x (at rest) */
export const branchTopY = (x: number) => { const u = brUAtX(x), p = BR_CURVE.getPointAt(u); return CLIFF[1] + p.y + BR_R(u) + 0.015; };
export const BRANCH_POS: T3 = (() => { const u = brUAtX(1.8), p = BR_CURVE.getPointAt(u); return Cw(1.8, +(p.y + BR_R(u) + 0.015).toFixed(3), +p.z.toFixed(3)); })();
export const BRANCH_R = 0.15;
const BR_PIVOT = V(0.06, 5.45, -1.42);
const T_LAND = W.branches - 0.4 + 0.8 * 0.72; // cliffAt.swing ~0.75: he lands on the branch
const T_SLIP = W.grip - 0.45 + 0.08;
const T_FLASH = shotStart(5) + 0.27;
/** the branch dips + wobbles when he lands (dy at BRANCH_POS, metres) */
export const branchAt = (id: number, t: number) => {
  if (id !== 5) return { dy: 0, rot: 0 };
  const d = t - T_LAND;
  if (d < 0) return { dy: 0, rot: 0 };
  const k = Math.min(1, d / 0.06);
  const rot = -(0.018 * Math.exp(-d * 2.4) * Math.cos(d * 11) * k + 0.005 * Math.min(1, d / 0.25));
  return { dy: rot * (1.8 - BR_PIVOT.x), rot };
};

// ============================================================ painted textures
const rockTex = () => ctex("clRock2k", 2048, 2048, (g, r) => {
  const S = 1024; g.scale(2, 2); // painted at 2x resolution (sharp close-ups)
  g.fillStyle = "#a49a90"; g.fillRect(0, 0, S, S);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 26; i++) { // strata tint bands (v = y/2.2: one texture = 2.2 m)
    const y = r() * S, h = 20 + r() * 70, c = ["rgba(150,120,96,0.32)", "rgba(120,128,140,0.3)", "rgba(176,150,110,0.25)", "rgba(110,96,92,0.3)"][Math.floor(r() * 4)];
    wrap((dx, dy) => { g.fillStyle = c; g.fillRect(dx, y + dy, S, h); });
  }
  for (let i = 0; i < 900; i++) { // grain speckle
    const x = r() * S, y = r() * S, rr = 1 + r() * 3;
    g.fillStyle = r() < 0.5 ? "rgba(60,52,58,0.25)" : "rgba(230,220,200,0.22)";
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  for (let i = 0; i < 160; i++) { // wet vertical streaks (dark) + mineral runs (light)
    const x = r() * S, y0 = r() * S, L = 80 + r() * 300, w = 3 + r() * 12, dark = r() < 0.75;
    wrap((dx, dy) => {
      const gr = g.createLinearGradient(0, y0 + dy, 0, y0 + dy + L);
      gr.addColorStop(0, dark ? "rgba(40,40,52,0.0)" : "rgba(220,214,200,0)"); gr.addColorStop(0.2, dark ? "rgba(40,40,52,0.34)" : "rgba(220,214,200,0.22)"); gr.addColorStop(1, "rgba(40,40,52,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x + dx - w / 2, y0 + dy); g.lineTo(x + dx + w / 2, y0 + dy); g.lineTo(x + dx + w * 0.2, y0 + dy + L); g.lineTo(x + dx - w * 0.2, y0 + dy + L); g.fill();
    });
  }
  for (let i = 0; i < 60; i++) { // hairline cracks
    let x = r() * S, y = r() * S;
    g.strokeStyle = `rgba(36,30,36,${0.35 + r() * 0.3})`; g.lineWidth = 1 + r() * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 40; y += 10 + r() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 2600; i++) { // fine pits + grit (reads in close-ups)
    const x = r() * S, y = r() * S, rr = 0.4 + r() * 1.2;
    g.fillStyle = r() < 0.6 ? "rgba(40,34,44,0.35)" : "rgba(245,236,220,0.3)";
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
  for (let i = 0; i < 70; i++) { // lichen rosettes
    const x = r() * S, y = r() * S, rr = 5 + r() * 16, c = r() < 0.6 ? "rgba(196,200,96,0.55)" : "rgba(226,150,70,0.5)";
    wrap((dx, dy) => { g.fillStyle = c; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + dx + (r() - 0.5) * rr, y + dy + (r() - 0.5) * rr, rr * (0.35 + r() * 0.4), 0, TAU); g.fill(); } });
  }
});
const barkTex = () => ctex("clBark", 512, 1024, (g, r) => {
  const Wd = 512, H = 1024;
  g.fillStyle = "#6a4c38"; g.fillRect(0, 0, Wd, H);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-Wd, 0, Wd]) for (const dy of [-H, 0, H]) f(dx, dy); };
  for (let i = 0; i < 150; i++) {
    const x0 = r() * Wd, y0 = r() * H, len = 120 + r() * 380, w = 2 + r() * 7, dark = r() < 0.65, ph = r() * 6;
    g.strokeStyle = dark ? `rgba(34,22,20,${0.4 + r() * 0.35})` : `rgba(170,130,96,${0.25 + r() * 0.3})`;
    g.lineWidth = dark ? w : w * 0.6; g.lineCap = "round";
    wrap((dx, dy) => { g.beginPath(); for (let k = 0; k <= 12; k++) { const yy = y0 + (len * k) / 12, xx = x0 + 6 * Math.sin(k * 0.8 + ph); if (k) g.lineTo(xx + dx, yy + dy); else g.moveTo(xx + dx, yy + dy); } g.stroke(); });
  }
  for (let i = 0; i < 30; i++) {
    const x = r() * Wd, y = r() * H, rx = 8 + r() * 18, ry = 26 + r() * 60;
    wrap((dx, dy) => { g.fillStyle = "rgba(80,130,50,0.6)"; g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, 0, 0, TAU); g.fill(); });
  }
});
const mossTex = () => ctex("clMoss", 512, 512, (g, r) => {
  g.fillStyle = "#5e9a3a"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1000; i++) {
    const x = r() * 512, y = r() * 512, rad = 3 + r() * 11, k = r();
    g.fillStyle = k < 0.45 ? "rgba(40,90,40,0.45)" : k < 0.85 ? "rgba(140,196,80,0.45)" : "rgba(210,226,120,0.5)";
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, TAU); g.fill(); }
  }
});
const groundTex = () => ctex("clGround", 1024, 1024, (g, r) => {
  g.fillStyle = "#7a8a52"; g.fillRect(0, 0, 1024, 1024);
  const wrap = (x: number, y: number, f: (x: number, y: number) => void) => { for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) f(x + dx, y + dy); };
  for (let i = 0; i < 90; i++) {
    const x = r() * 1024, y = r() * 1024, rx = 30 + r() * 110, ry = 20 + r() * 80, a = r() * 3, c = r() < 0.5 ? "rgba(60,110,50,0.5)" : "rgba(120,96,64,0.45)";
    wrap(x, y, (a2, b2) => { g.fillStyle = c; g.beginPath(); g.ellipse(a2, b2, rx, ry, a, 0, TAU); g.fill(); });
  }
  for (let i = 0; i < 2200; i++) { // grass tufts / pebbles
    const x = r() * 1024, y = r() * 1024, L = 4 + r() * 9, a = -Math.PI / 2 + (r() - 0.5) * 0.8;
    g.strokeStyle = r() < 0.8 ? `rgba(${60 + r() * 80},${120 + r() * 70},${50 + r() * 30},0.7)` : "rgba(70,60,56,0.6)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
  }
});
const mistTex = () => ctex("clMist", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    const x = 90 + r() * 332, y = 110 + r() * 50, rx = 60 + r() * 90, ry = 26 + r() * 28;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, "rgba(255,255,255,0.24)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
  }
});

// ============================================================ materials
// WET: two-tone + a wet layer: sun glints off the reflection vector (back-lit wet tops sparkle even when N.L ~ 0),
// a fresnel sky sheen, and thin rivulets sliding down steep faces. Masked by the sun shadow.
const WET = {
  uT: { value: 0 }, uGlint: { value: new THREE.Color(1, 0.8, 0.5) }, uSheen: { value: new THREE.Color(0.2, 0.25, 0.35) },
  uFill: { value: new THREE.Color(0.1, 0.12, 0.2) }, uBnc: { value: new THREE.Color(0.2, 0.12, 0.05) }, uRim: { value: new THREE.Color(1, 0.6, 0.3) },
};
const matCache = new Map<string, THREE.Material>();
const wetMat = (key: string, p: THREE.MeshPhongMaterialParameters, o0: { shin: number; glint: number; sheen: number; riv: number; rim?: number }) => {
  const o = { rim: 1, ...o0 };
  let m = matCache.get(key) as THREE.MeshPhongMaterial | undefined;
  if (m) return m;
  const mm = twoTone(new THREE.MeshPhongMaterial({ specular: "#000000", shininess: 1, ...p }));
  const base = mm.onBeforeCompile;
  mm.onBeforeCompile = (sh, rr) => {
    base.call(mm, sh, rr);
    Object.assign(sh.uniforms, WET);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        { vec4 wp4 = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
          vWp = ( modelMatrix * wp4 ).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uT; uniform vec3 uGlint; uniform vec3 uSheen; uniform vec3 uFill; uniform vec3 uBnc; uniform vec3 uRim;\nfloat clh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }")
      .replace("#include <aomap_fragment>", `
        #if NUM_DIR_LIGHTS > 0
        {
          vec3 sV = directionalLights[ 0 ].direction;
          vec3 Nn = geometryNormal, Vd = geometryViewDir;
          vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
          float upk = dot( Nn, upV );
          // rivulets: thin water runs on steep faces, beads sliding down
          float hx = vWp.x * 5.0 + vWp.z * 5.0;
          float cell = floor( hx ), fx = fract( hx ) - 0.5;
          float hr = clh( vec2( cell, 3.7 ) );
          float lane = exp( -pow( ( fx - ( hr - 0.5 ) * 0.5 ) / 0.045, 2.0 ) ) * step( 0.55, hr );
          float bead = smoothstep( 0.75, 1.0, fract( vWp.y * 0.9 + uT * ( 0.9 + hr ) + hr * 7.0 ) );
          float riv = lane * ( 0.35 + 0.65 * bead ) * ( 1.0 - smoothstep( 0.3, 0.7, abs( upk ) ) ) * ${o.riv.toFixed(3)};
          vec3 Rf = reflect( -Vd, Nn );
          float sp = pow( max( dot( Rf, sV ), 0.0 ), ${o.shin.toFixed(1)} );
          float wetK = 0.55 + 0.45 * smoothstep( 0.2, 0.9, upk ) + 1.6 * riv;
          float fres = pow( 1.0 - max( dot( Nn, Vd ), 0.0 ), 3.0 );
          // set-local fill: cool storm sky from above, warm glitter bounce off the river from below, a gold rim on edges
          // turned toward the low sun, and the bright sun-side sky mirrored in wet up-facing tops (not shadow-masked)
          vec3 sH = normalize( sV - upV * dot( sV, upV ) );
          float rim = pow( 1.0 - max( dot( Nn, Vd ), 0.0 ), 2.0 ) * smoothstep( -0.1, 0.6, dot( Nn, sH ) );
          float skyR = pow( max( dot( Rf, sV ), 0.0 ), 6.0 ) * smoothstep( -0.2, 0.6, upk );
          reflectedLight.directSpecular += diffuseColor.rgb * ( uFill * ( 0.55 + 0.45 * upk ) + uBnc * max( -upk, 0.0 ) + uRim * rim * ${o.rim.toFixed(3)} ) * ( 1.0 - sunVis * 0.6 )
            + uGlint * skyR * wetK * 0.22 * ${o.glint.toFixed(3)};
          reflectedLight.directSpecular += uGlint * sp * sunVis * wetK * ${o.glint.toFixed(3)} + uSheen * ( fres * ${o.sheen.toFixed(3)} + riv * 0.8 ) + uRim * riv * 0.07 * ( 0.6 + 0.4 * sunVis );
        }
        #endif
        #include <aomap_fragment>`)
      .replace("#include <map_fragment>", `#include <map_fragment>
        #ifdef USE_MAP
          diffuseColor.rgb *= mix( 1.0, texture2D( map, vMapUv * 3.7 + 0.31 ).g * 1.7, 0.3 );
        #endif`);
  };
  mm.customProgramCacheKey = () => "clWet4_" + key;
  matCache.set(key, mm);
  return mm;
};
/** QA: far silhouettes (araucarias, dino) fogged ~100 % read as pale ghost wireframes under the ink: cap their haze so
 *  they stay painted, hazy but solid (a clone of the base material; fog factor clamped at `cap`) */
const hazeCap = <T extends THREE.Material>(base: T, key: string, cap: number): T => {
  let m = matCache.get(key) as T | undefined;
  if (m) return m;
  m = base.clone() as T;
  const prev = base.onBeforeCompile, mm = m;
  mm.onBeforeCompile = (sh, rr) => {
    prev.call(mm, sh, rr);
    sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", `#ifdef USE_FOG
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( smoothstep( fogNear, fogFar, vFogDepth ), ${cap.toFixed(3)} ) );
      #endif`);
  };
  const pk = base.customProgramCacheKey.bind(base);
  mm.customProgramCacheKey = () => pk() + "_haze" + cap.toFixed(3);
  matCache.set(key, mm);
  return mm;
};
const lamb = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  let m = matCache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p)); matCache.set(key, m); }
  return m;
};

// ============================================================ plants
const frond = (len: number, w: number, th0: number, th1: number, n: number, serr: number, cBase: string, cTip: string, fold = 0.24, soup = new Soup()) => {
  const P: THREE.Vector3[] = [], D: THREE.Vector3[] = [];
  let y = 0, z = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, th = th0 + (th1 - th0) * Math.pow(u, 1.5);
    P.push(V(0, y, z)); D.push(V(0, Math.cos(th), Math.sin(th)));
    y += (Math.cos(th) * len) / n; z += (Math.sin(th) * len) / n;
  }
  const side = V(1, 0, 0), cb = C(cBase), ct = C(cTip);
  const Ls: THREE.Vector3[] = [], Cs: THREE.Vector3[] = [], Rs: THREE.Vector3[] = [], cols: THREE.Color[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, nrm = V(0, 0, 0).crossVectors(D[i], side).normalize();
    const hw = i === n ? 0 : w * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.7) * (1 - 0.3 * u) * (i % 2 ? 1 : 1 - serr) * (i === 0 ? 0.3 : 1);
    Cs.push(P[i].clone().addScaledVector(nrm, hw * fold * 0.5));
    Ls.push(P[i].clone().addScaledVector(side, -hw).addScaledVector(nrm, -hw * fold * 0.5).addScaledVector(D[i], hw * 0.25));
    Rs.push(P[i].clone().addScaledVector(side, hw).addScaledVector(nrm, -hw * fold * 0.5).addScaledVector(D[i], hw * 0.25));
    cols.push(cb.clone().lerp(ct, Math.pow(u, 0.8)));
  }
  for (let i = 0; i < n; i++) {
    const c0 = cols[i], c1 = cols[i + 1], e0 = c0.clone().multiplyScalar(0.82), e1 = c1.clone().multiplyScalar(0.82), m0 = c0.clone().multiplyScalar(1.12), m1 = c1.clone().multiplyScalar(1.12);
    soup.tri(Ls[i], Cs[i + 1], Cs[i], e0, m1, m0); soup.tri(Ls[i], Ls[i + 1], Cs[i + 1], e0, e1, m1);
    soup.tri(Cs[i], Cs[i + 1], Rs[i + 1], m0, m1, e1); soup.tri(Cs[i], Rs[i + 1], Rs[i], m0, e1, e0);
  }
  return soup;
};
const soupGeo = (s: Soup, m?: THREE.Matrix4) => { const g = s.geo(); if (m) g.applyMatrix4(m); return g; };
/** rain-battered fern: fronds droop more than the jungle ones */
const fernPlant = (seed: number, h: number, pal: [string, string]) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [], nF = 8 + Math.floor(r() * 4);
  for (let f = 0; f < nF; f++) {
    const yaw = (f / nF) * TAU + r() * 0.4, len = h * (0.75 + 0.4 * r());
    L.push(soupGeo(frond(len, len * 0.15, 0.35 + 0.4 * r(), 2.0 + 0.5 * r(), 24, 0.45, pal[0], pal[1]), M(0, 0, 0, yaw)));
  }
  return merge(L);
};
const horsetails = (seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 0.5, h = 0.8 + 0.8 * r(), lx = (r() - 0.5) * 0.2;
    L.push(clean(tube([V(x, -0.05, z), V(x + lx * 0.5, h * 0.5, z), V(x + lx, h, z)], () => 0.026, 8, 6), (p) => ((p.y + 10.05) % 0.22 < 0.03 ? C("#2e3e22") : C("#6ea844"))));
    L.push(clean(new THREE.ConeGeometry(0.038, 0.13, 8).translate(x + lx, h + 0.06, z), "#8a5a34"));
  }
  return merge(L);
};
const rockGeo = (s: number, seed: number, cols = ["#8e8680", "#9a8e84", "#847c78", "#a09486"]) => {
  const rr = rng(seed), g = new THREE.IcosahedronGeometry(1, s > 0.6 ? 3 : 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.2 * vn(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i)) + 0.06 * vn(p.getX(i) * 5, p.getY(i) * 5 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  const col = cols[Math.floor(rr() * cols.length)];
  return clean(tf(g, M(0, 0, 0, rr() * 6, 0, 0, [s * (1 + 0.3 * rr()), s * (0.62 + 0.2 * rr()), s])), (q, n) => (n.y > 0.55 && q.y > 0 ? lerpC(col, "#5e8e3a", 0.8) : q.y < -s * 0.2 ? lerpC(col, "#3a4a3a", 0.5) : C(col)));
};
/** an araucaria-ish silhouette tree (trunk + flat whorls), base at origin */
const araucaria = (seed: number, h: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  L.push(clean(tube([V(0, -0.3, 0), V(0.1 * (r() - 0.5) * h, h * 0.5, 0), V(0, h, 0)], (u) => h * 0.022 * (1 - 0.6 * u) + 0.05, 8, 6), "#5a3e2c"));
  for (let k = 0; k < 5; k++) {
    const a = r() * TAU, d = k ? h * 0.14 : 0, y = h * (k ? 0.86 + 0.06 * r() : 0.95), rad = h * (k ? 0.13 + 0.05 * r() : 0.2);
    L.push(clean(new THREE.SphereGeometry(1, 14, 9).scale(rad, rad * 0.5, rad).translate(Math.cos(a) * d, y, Math.sin(a) * d), (p) => lerpC("#123426", "#2e5e3a", ((p.y - y) / (rad * 0.5)) * 0.5 + 0.5)));
  }
  return merge(L);
};

// ============================================================ NOINK effect shaders
const HASHGL = /* glsl */ `
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), u.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), u.x), u.y); }`;

/** rain streaks: a world-fixed lattice that falls, wrapped in a box around the camera (no swimming, no pops) */
const rainMesh = (n: number, seed: number, box: THREE.Vector3, len: number, width: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const A = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) A.set([r(), r(), r(), r()], i * 4);
  g.setAttribute("iA", new THREE.InstancedBufferAttribute(A, 4)); g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uBox: { value: box }, uFall: { value: V(1.6, -10.5, 0.4) }, uLen: { value: len }, uW: { value: width }, uSun: { value: V(0, 0.2, -1) },
      uCol: { value: new THREE.Color(0.5, 0.56, 0.66) }, uGold: { value: new THREE.Color(2.2, 1.5, 0.8) }, uK: { value: 0.5 } },
    vertexShader: /* glsl */ `attribute vec4 iA; uniform float uT; uniform vec3 uBox; uniform vec3 uFall; uniform float uLen; uniform float uW; uniform vec3 uSun;
      varying vec2 vQ; varying float vA; varying float vG;
      void main(){
        vec3 vel = uFall * (0.85 + 0.3 * iA.w);
        vec3 p0 = iA.xyz * uBox + vel * uT;
        vec3 rel = mod(p0 - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox;
        vec3 c = cameraPosition + rel;
        vec3 dir = normalize(vel);
        float along = position.y + 0.5;
        float dist = max(length(rel), 1e-3);
        vec3 view = -rel / dist;
        vec3 sx = cross(dir, view);
        vec3 side = sx / max(length(sx), 1e-4);
        vec3 p = c - dir * uLen * (0.7 + 0.6 * iA.w) * along + side * position.x * uW * max(1.2, dist);
        vec3 e = abs(rel) / (0.5 * uBox);
        float edge = (1.0 - smoothstep(0.75, 1.0, e.x)) * (1.0 - smoothstep(0.75, 1.0, e.y)) * (1.0 - smoothstep(0.75, 1.0, e.z));
        vA = edge * smoothstep(0.9, 2.2, dist) * (0.55 + 0.45 * fract(iA.w * 13.7));
        vG = pow(max(dot(-view, uSun), 0.0), 5.0);
        vQ = vec2(position.x * 2.0, along);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uGold; uniform float uK; varying vec2 vQ; varying float vA; varying float vG;
      void main(){
        float a = (1.0 - vQ.x * vQ.x) * smoothstep(0.0, 0.25, vQ.y) * (1.0 - smoothstep(0.6, 1.0, vQ.y)) * vA * uK;
        gl_FragColor = vec4((uCol + uGold * vG) * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 8;
  return m;
};

/** camera-facing water sparks updated from JS each frame: kind 0 = drop, 1 = splash crown, 2 = ripple ring (flat) */
class Sparks {
  mesh: THREE.Mesh; P: Float32Array; S: Float32Array; n = 0; max: number;
  private aP: THREE.InstancedBufferAttribute; private aS: THREE.InstancedBufferAttribute;
  constructor(max: number, parent: THREE.Object3D) {
    this.max = max;
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    this.P = new Float32Array(max * 3); this.S = new Float32Array(max * 4);
    this.aP = new THREE.InstancedBufferAttribute(this.P, 3); this.aS = new THREE.InstancedBufferAttribute(this.S, 4);
    this.aP.setUsage(THREE.DynamicDrawUsage); this.aS.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iP", this.aP); g.setAttribute("iS", this.aS); g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(0.7, 0.78, 0.9) }, uGold: { value: new THREE.Color(1.6, 1.1, 0.6) }, uSun: { value: V(0, 0.2, -1) } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform vec3 uSun; varying vec2 vQ; varying float vK; varying float vKind; varying float vG;
        void main(){
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 p;
          if (iS.w > 1.5) p = iP + vec3(position.x * iS.x, 0.0, position.y * iS.y);                                   // ripple: flat on the water
          else if (iS.w > 0.5) p = iP + right * position.x * iS.x + vec3(0.0, 1.0, 0.0) * (position.y + 0.5) * iS.y;  // crown: stands on its point
          else p = iP + right * position.x * iS.x + up * position.y * iS.y;                                          // drop
          vQ = position.xy * 2.0; vK = iS.z; vKind = iS.w;
          vG = pow(max(dot(normalize(iP - cameraPosition), uSun), 0.0), 4.0);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uGold; varying vec2 vQ; varying float vK; varying float vKind; varying float vG;
        void main(){
          float a = 0.0; vec2 q = vQ;
          if (vKind > 1.5) {                  // ripple ring
            float d = length(q); a = exp(-pow((d - 0.2 - 0.75 * vK) / 0.07, 2.0)) * (1.0 - vK) * (1.0 - vK) * 0.9;
          } else if (vKind > 0.5) {           // splash crown: a flat splat + a fan of droplets
            float k = vK, y = q.y * 0.5 + 0.5;
            float splat = exp(-pow(q.x / (0.35 + 0.6 * k), 2.0) - pow((y - 0.04) / 0.05, 2.0)) * (1.0 - k);
            float drops = 0.0;
            for (int j = 0; j < 5; j++) {
              float ang = -0.95 + float(j) * 0.475;
              vec2 c = vec2(sin(ang) * k * 0.85, (cos(ang) * 1.1 - 0.25) * (k * 1.6 - k * k * 1.3) + 0.05);
              vec2 dd = (vec2(q.x, y) - c) / vec2(0.09, 0.12);
              drops += exp(-dot(dd, dd) * 1.5);
            }
            a = (splat * 0.9 + drops * (1.0 - k * 0.7)) * smoothstep(0.0, 0.08, k) * (1.0 - smoothstep(0.75, 1.0, k));
          } else {                            // falling drop: an elongated bead with a bright core
            vec2 d = q / vec2(0.55, 1.0); a = exp(-dot(d, d) * 2.4) * vK;
          }
          gl_FragColor = vec4((uCol + uGold * vG) * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false; this.mesh.layers.set(NOINK); this.mesh.renderOrder = 7;
    parent.add(this.mesh);
  }
  begin() { this.n = 0; }
  add(x: number, y: number, z: number, w: number, h: number, k: number, kind: number) {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.P[i * 3] = x; this.P[i * 3 + 1] = y; this.P[i * 3 + 2] = z;
    this.S[i * 4] = w; this.S[i * 4 + 1] = h; this.S[i * 4 + 2] = k; this.S[i * 4 + 3] = kind;
  }
  end() { (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = this.n; this.aP.needsUpdate = true; this.aS.needsUpdate = true; }
}

/** the river: dark teal water, flow streaks + rapids foam, rain ripple rings, a fresnel sky + golden sun glitter path */
const waterMat = () => new THREE.ShaderMaterial({
  uniforms: {
    uT: { value: 0 }, uSun: { value: V(0, 0.2, -1) }, uFogC: { value: new THREE.Color() }, uFogR: { value: new THREE.Vector2(10, 160) },
    uDeep: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uSky: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uFoam: { value: new THREE.Color() }, uGlint: { value: new THREE.Color() }, uStill: { value: 0 },
  },
  vertexShader: /* glsl */ `attribute float aN; varying vec3 vW; varying float vN;
    void main(){ vN = aN; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`,
  fragmentShader: /* glsl */ `uniform float uT; uniform vec3 uSun; uniform vec3 uFogC; uniform vec2 uFogR; uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uSky; uniform vec3 uHor;
    uniform vec3 uFoam; uniform vec3 uGlint; uniform float uStill; varying vec3 vW; varying float vN;
    ${HASHGL}
    float ring(vec2 p, float t, float sc, float seed){
      vec2 q = p * sc + seed; vec2 c = floor(q), f = fract(q);
      float ph = h1(c + 3.1), per = 0.55 + 0.5 * h1(c + 7.7), a = t / per + ph, cyc = floor(a); a = fract(a);
      vec2 ctr = 0.3 + 0.4 * vec2(h1(c + cyc * 1.37), h1(c + cyc * 2.11 + 5.0));
      float d = length(f - ctr);
      return exp(-pow((d - a * 0.28) / 0.022, 2.0)) * (1.0 - a) * (1.0 - a);
    }
    float flowN(vec2 p, vec2 fd, vec2 fp){ vec2 q = vec2(dot(p, fp) * 2.2, dot(p, fd) * 0.32 - uT * 1.7 * (1.0 - uStill)); return n2(q) * 0.65 + n2(q * 2.3 + 4.0) * 0.35; }
    void main(){
      vec2 p = vW.xz - vec2(${CLIFF[0].toFixed(1)}, ${CLIFF[2].toFixed(1)});
      vec3 V = normalize(cameraPosition - vW);
      float dist = length(cameraPosition - vW);
      vec2 fd = normalize(mix(vec2(0.05, 1.0), vec2(-1.0, 0.12), smoothstep(-5.0, 1.5, p.y)));
      vec2 fp = vec2(fd.y, -fd.x);
      float fl = flowN(p, fd, fp);
      vec2 e = vec2(0.15, 0.0);
      float wx = flowN(p + e.xy, fd, fp) - flowN(p - e.xy, fd, fp), wz = flowN(p + e.yx, fd, fp) - flowN(p - e.yx, fd, fp);
      float aa = 1.0 - smoothstep(0.04, 0.12, fwidth(p.x) + fwidth(p.y));       // fade fine detail with distance
      float rg = (ring(p, uT, 1.3, 0.0) + ring(p, uT + 0.31, 1.7, 5.3) + ring(p, uT + 0.6, 2.3, 9.1)) * aa;
      float wk = 0.9 * (1.0 - 0.7 * uStill);
      vec3 N = normalize(vec3(-wx * wk + rg * 0.12, 1.0, -wz * wk + rg * 0.12));
      vec3 R = reflect(-V, N);
      float fres = 0.05 + 0.95 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
      vec3 base = mix(uDeep, uMid, smoothstep(0.35, 0.75, fl));
      vec3 sky = mix(uHor, uSky, smoothstep(0.0, 0.5, R.y));
      float sd = max(dot(R, uSun), 0.0);
      sky += uGlint * (0.5 * pow(sd, 18.0));
      vec3 col = mix(base, sky, fres);
      // foam: rapids at the corner, a white line where the water hits the rock, streaks along the flow
      vec2 r1 = p - vec2(2.0, -1.6), r2 = p - vec2(3.2, -5.0);
      float rap = exp(-dot(r1, r1) / 14.0) + 0.6 * exp(-dot(r2, r2) / 10.0);
      float edge = 1.0 - smoothstep(0.05, 0.75, vN);
      vec2 q = vec2(dot(p, fp) * 2.2, dot(p, fd) * 0.32 - uT * 1.7);
      float streak = smoothstep(0.58, 0.82, fl + 0.25 * n2(q * 4.0 + 9.0) - 0.12);
      float foam = clamp((streak * (0.18 + 1.1 * rap) + edge * (0.6 + 0.4 * n2(p * 3.0 + uT * 2.0))) * (1.0 - uStill), 0.0, 1.0);
      col = mix(col, uFoam, foam * 0.85);
      // rain rings + the sun glitter path
      col += uSky * rg * 0.55;
      float spark = pow(sd, 260.0) * (0.4 + 2.6 * smoothstep(0.55, 0.95, n2(p * 9.0 + uT * 3.0)));
      col += uGlint * spark * 4.5 + uGlint * pow(sd, 40.0) * 0.6;
      col = mix(col, uFogC, smoothstep(uFogR.x, uFogR.y, dist));
      gl_FragColor = vec4(col, 1.0); }`,
});

/** the storm sky dome (drawn after the world, behind it): the looks' sky gradient as the clear sky, a cloud deck with a
 *  gap around the sun, gold linings, crepuscular rays, rain curtains, a rainbow hint, a soft sheet-lightning flicker */
const domeMat = () => new THREE.ShaderMaterial({
  uniforms: {
    c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
    uSun: { value: V(0, 0.2, -1) }, uT: { value: 0 }, uFogC: { value: new THREE.Color() }, uDark: { value: new THREE.Color() }, uMid: { value: new THREE.Color() },
    uLine: { value: new THREE.Color() }, uRay: { value: new THREE.Color() }, uCurt: { value: new THREE.Color() },
    uRbC: { value: V(0, -0.2, -1) }, uRbR: { value: 0.45 }, uRbA: { value: 0.3 }, uFlash: { value: 0 }, uFlashD: { value: V(-0.4, 0.3, -1) },
  },
  vertexShader: "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform vec3 uSun; uniform float uT; uniform vec3 uFogC;
    uniform vec3 uDark; uniform vec3 uMid; uniform vec3 uLine; uniform vec3 uRay; uniform vec3 uCurt; uniform vec3 uRbC; uniform float uRbR; uniform float uRbA;
    uniform float uFlash; uniform vec3 uFlashD; varying vec3 vD;
    ${HASHGL}
    float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
    void main(){
      vec3 d = normalize(vD);
      float el = asin(clamp(d.y, -1.0, 1.0));
      vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
      float sd = dot(d, uSun), ang = acos(clamp(sd, -1.0, 1.0));
      // cloud deck (a flat layer seen in perspective), drifting with the wind
      float hy = max(d.y, 0.0) + 0.05;
      vec2 cp = d.xz / hy * 0.55 + vec2(uT * 0.045, uT * 0.018);
      float f = fbm(cp * 1.25 + 3.0);
      float g2 = n2(cp * 3.1 + 11.0) * 0.6 + n2(cp * 6.3 + 2.0) * 0.4;
      float hole = smoothstep(0.035, 0.22, ang + 0.08 * (n2(vec2(atan(d.y - uSun.y, d.x - uSun.x) * 2.0, 3.0)) - 0.5));
      float cv = f + 0.07 * g2 + 0.45 * hole - 0.24 + 0.1 * smoothstep(0.3, 0.02, el);
      float cov = smoothstep(0.42, 0.6, cv);
      float th = smoothstep(0.48, 0.85, f + 0.1 * g2);
      vec3 cc = mix(uMid, uDark, th);
      float glow = pow(max(sd, 0.0), 60.0) + 0.06 * pow(max(sd, 0.0), 20.0);
      float thin = 1.0 - smoothstep(0.45, 0.62, cv);
      cc += uLine * glow * (0.35 + 1.9 * thin * thin) * (1.0 - 0.6 * th);
      cc = mix(cc, uFogC, smoothstep(0.1, 0.0, el) * 0.6);
      c = mix(c, cc, cov);
      // rain curtains hanging under the deck near the horizon (slanted, drifting), lit gold toward the sun
      float az = atan(d.x, -d.z);
      float cu = n2(vec2(az * 26.0 + el * 9.0 + uT * 0.25, 0.5)) * 0.6 + n2(vec2(az * 70.0 + el * 25.0 + uT * 0.4, 3.0)) * 0.4;
      float cband = smoothstep(0.0, 0.03, el) * (1.0 - smoothstep(0.1, 0.32, el)) * smoothstep(0.4, 0.7, n2(vec2(az * 3.0, 7.0)) + 0.2 * cov);
      c = mix(c, uCurt + uLine * glow * 0.8, cband * smoothstep(0.35, 0.75, cu) * 0.55);
      // crepuscular rays fanning out of the gap (mostly downward)
      vec3 ax = normalize(cross(uSun, vec3(0.0, 1.0, 0.0))); vec3 ay = cross(ax, uSun);
      float phi = atan(dot(d, ay), dot(d, ax));
      float rays = smoothstep(0.45, 0.9, n2(vec2(phi * 7.0, 1.0)) * 0.7 + n2(vec2(phi * 19.0, 5.0)) * 0.3);
      float rk = (1.0 - smoothstep(0.05, 0.85, ang)) * smoothstep(0.03, 0.1, ang) * (0.35 + 0.65 * smoothstep(0.2, -0.6, sin(phi)));
      c += uRay * rays * rk * (0.12 + 0.88 * (1.0 - cov)) * 0.7;
      // the sun's glow through the wet air
      c += uRay * (0.5 * exp(-ang * ang / 0.003) + 0.35 * exp(-ang / 0.07) + 0.05 * exp(-ang / 0.3));
      // rainbow hint (inner violet .. outer red), strongest against dark cloud and rain
      float ra = acos(clamp(dot(d, uRbC), -1.0, 1.0)), x = (ra - uRbR) / 0.03;
      if (abs(x) < 1.0) {
        vec3 sp = clamp(vec3(1.6 - abs(x - 0.65) * 2.3, 1.5 - abs(x) * 2.6, 1.6 - abs(x + 0.65) * 2.3), 0.0, 1.0);
        c += sp * uRbA * (1.0 - x * x) * smoothstep(0.0, 0.08, el) * (1.0 - smoothstep(0.25, 0.55, el)) * (0.35 + 0.65 * cov) * hole;
      }
      // sheet lightning inside the cloud deck
      float fd2 = acos(clamp(dot(d, uFlashD), -1.0, 1.0));
      c += vec3(0.75, 0.8, 1.0) * uFlash * exp(-fd2 * fd2 / 0.03) * (0.3 + 0.7 * cov) * (0.6 + 0.4 * f);
      gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
});

/** god-ray shafts slanting down along the sun direction (adapted from the jungle rig) */
const raysMesh = (n: number, seed: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1, 1, 10), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const T = new Float32Array(n * 3), S = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { T.set([1 + r() * 14, 2 + r() * 10, -34 + r() * 30], i * 3); S.set([0.5 + 1.6 * r() * r(), r(), 22 + 22 * r(), r()], i * 4); }
  g.setAttribute("iC", new THREE.InstancedBufferAttribute(T, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(S, 4)); g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDir: { value: V(0, -1, 0) }, uCol: { value: V(1, 1, 1) }, uK: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec3 iC; attribute vec4 iS; uniform float uT; uniform vec3 uDir; varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float along = position.y;
        vec3 c = (modelMatrix * vec4(iC, 1.0)).xyz + vec3(sin(uT * 0.13 + iS.y * 6.28), 0.0, cos(uT * 0.11 + iS.y * 4.0)) * 0.3;
        vec3 p = c + uDir * iS.z * along;
        vec3 view = normalize(cameraPosition - p);
        vec3 side = normalize(cross(uDir, view));
        p += side * position.x * iS.x * (0.7 + 0.6 * (along + 0.5)) * 2.0;
        float dist = length(cameraPosition - p);
        vQ = vec2(position.x * 2.0, along + 0.5); vSeed = iS.y;
        float flick = 0.6 + 0.4 * sin(uT * (0.35 + 0.4 * iS.w) + iS.y * 40.0);
        vA = flick * (1.0 - 0.7 * abs(dot(view, uDir))) * smoothstep(3.0, 8.0, dist);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform float uT; varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float x = vQ.x, u = vQ.y;
        float a = exp(-x * x * 3.0) * (0.7 + 0.3 * sin(x * 6.0 + vSeed * 20.0 + sin(u * 3.0 + uT * 0.2))) * smoothstep(0.0, 0.3, u) * (1.0 - smoothstep(0.55, 1.0, u)) * vA * uK;
        gl_FragColor = vec4(uCol * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};
/** painted ridge rings (around the camera), aerial glow toward the sun */
const ridgeMat = () => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSun: { value: V(0, 0, -1) }, uMist: { value: 0.8 } },
  vertexShader: "attribute float k; varying float vK; varying vec3 vW; void main(){ vK = k; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uFog; uniform vec3 uGlow; uniform vec3 uSun; uniform float uMist; varying float vK; varying vec3 vW;
    void main(){
      vec3 d = normalize(vec3(vW.x - cameraPosition.x, 0.0, vW.z - cameraPosition.z));
      float toSun = max(0.0, dot(d, normalize(vec3(uSun.x, 0.0, uSun.z))));
      vec3 c = mix(uCol, uGlow, pow(toSun, 8.0) * 0.6);
      c = mix(c, uFog, smoothstep(0.0, 1.0, vK) * uMist);
      gl_FragColor = vec4(c, 1.0); }`,
  fog: false, side: THREE.DoubleSide,
});

// ============================================================ the Cliff
type Inst = { x: number; y: number; z: number; yaw: number; s: number; ph: number; amp: number };
type Mist = { s: THREE.Mesh; x: number; y: number; z: number; w: number; ph: number; sp: number; o: number };
type Spot = { x: number; y: number; z: number; ph: number; per: number; s: number };

export class Cliff {
  root = new THREE.Group();
  private branch = new THREE.Group();
  private sway: { mesh: THREE.InstancedMesh; inst: Inst[] }[] = [];
  private dome: THREE.Mesh; private domeM: THREE.ShaderMaterial;
  private water: THREE.ShaderMaterial; private puddle: THREE.ShaderMaterial;
  private rainN: THREE.Mesh; private rainF: THREE.Mesh; private rays: THREE.Mesh;
  private ridges: { m: THREE.Mesh; base: string; f: number }[] = [];
  private mists: Mist[] = [];
  private sparks: Sparks;
  private splashSpots: Spot[] = []; private dripSpots: Spot[] = []; private rippleSpots: Spot[] = [];
  private pebbles: THREE.InstancedMesh; private pebP: number[][] = [];
  private dino = new THREE.Group(); private dinoNeck = new THREE.Group(); private dinoHead = new THREE.Group();
  private sunDir: THREE.Vector3 | null = null; private fwd = V(0, 0, -1);
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private vs = V(1, 1, 1); private vp = V(0, 0, 0);
  private fogC = new THREE.Color(); private tmpC = new THREE.Color(); private tv = V(0, 0, 0);

  constructor() {
    const R = this.root;
    R.position.set(...CLIFF);
    R.visible = false;
    const r = rng(5531);
    this.sun();
    const rockMat = wetMat("rock", { map: rockTex(), vertexColors: true }, { shin: 60, glint: 1.4, sheen: 0.9, riv: 1 });
    const bould = wetMat("bould", { vertexColors: true, map: rockTex() }, { shin: 50, glint: 1.6, sheen: 1.0, riv: 0.6 });
    const barkMat = wetMat("bark", { map: barkTex(), vertexColors: true }, { shin: 40, glint: 1.2, sheen: 0.7, riv: 0.5 });
    const mossMat = wetMat("moss", { map: mossTex(), vertexColors: true }, { shin: 30, glint: 0.9, sheen: 0.5, riv: 0 });
    const groundMat = wetMat("ground", { map: groundTex(), vertexColors: true }, { shin: 30, glint: 0.7, sheen: 0.4, riv: 0 });
    const plantMat = wetMat("plant", { vertexColors: true, side: THREE.DoubleSide }, { shin: 26, glint: 0.9, sheen: 0.45, riv: 0 });
    const solidMat = lamb("clSolid", { vertexColors: true });
    const bake = (list: THREE.BufferGeometry[], mat: THREE.Material, cast = true, parent: THREE.Object3D = R) => {
      if (!list.length) return null;
      const m = new THREE.Mesh(merge(list), mat); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.matrixAutoUpdate = false; parent.add(m); return m;
    };

    // ---------------- the rock face: a swept wall along the outline + a rounded mossy lip ----------------
    {
      const cols: number[] = [];
      const spMin = -S0 + 1, spMax = OLEN - S0 - 1;
      for (let s = spMin; s < spMax; ) {
        cols.push(s);
        const a = Math.abs(s + 0.3);
        s += a < 4.5 ? 0.06 : a < 14 ? 0.2 : a < 40 ? 0.8 : 3.0;
      }
      cols.push(spMax);
      const NV = 140, LIP: [number, number][] = [[-0.09, 0.03], [-0.26, 0.1], [-0.5, 0.13], [-0.78, 0.11], [-1.02, -0.22], [-1.3, -0.9]];
      const nRow = 3 + NV + LIP.length;
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (const s of cols) {
        const o = outAt(s), top = topY(s);
        const push = (dn: number, y: number) => { pos.push(o.x + o.nx * dn, y, o.z + o.nz * dn); uv.push(s / 2.2, y / 2.2); };
        for (const y of [-2.9, -2.4, -2.05]) push(faceD(s, y), y);
        let dl = 0;
        for (let i = 0; i < NV; i++) { const y = -1.75 + (i / (NV - 1)) * (top - 0.14 + 1.75); dl = faceD(s, y); push(dl, y); }
        const lipBase = Math.min(0.08, dl * 0.6);
        for (const [dn, dy] of LIP) push(dn + lipBase * (dn > -0.3 ? 1 : 0), top + dy + 0.03 * vn(s * 0.9, dn));
      }
      for (let c = 0; c < cols.length - 1; c++) for (let j = 0; j < nRow - 1; j++) {
        const a = c * nRow + j, b = a + 1, d = a + nRow, e2 = d + 1;
        idx.push(a, d, e2, a, e2, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      // colours: wet rock tints per stratum, dark algae at the water line, moss on every up-facing ledge
      const na = g.getAttribute("normal"), n = na.count, col = new Float32Array(n * 3), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], ny = na.getY(i), k = Math.floor((y + 0.035) / BAND);
        c.set(["#ffffff", "#f6d2b0", "#d4dcec", "#ffe6c0", "#e8c8c0", "#c8d0c8"][((k % 6) + 6) % 6]).multiplyScalar(1.12);
        c.lerp(C("#5e6e58"), 0.75 * sm((-0.7 - y) / 0.9));
        c.lerp(C("#8cbf58"), sm((ny - 0.5) / 0.3) * (y > -1.2 ? 1 : 0.4));
        col.set([c.r, c.g, c.b], i * 3);
        // splash spots on ledge tops near the action
        if (ny > 0.82 && y > -1.3 && x > -5 && x < 1.6 && z > -2.5 && hash(x * 7.3, y * 3.1) < 0.12) this.splashSpots.push({ x, y, z, ph: r(), per: 0.45 + 0.5 * r(), s: 0.12 + 0.08 * r() });
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const m = new THREE.Mesh(g, rockMat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m);
    }

    // ---------------- terrain: the plateau (behind the lip) and the valley (river bed + far bank) ----------------
    const axis = (A: number, B: number, c0: number, sp: (d: number) => number) => {
      const xs: number[] = [c0];
      for (let x = c0; x > A; ) { x -= sp(c0 - x); xs.unshift(Math.max(A, x)); }
      for (let x = c0; x < B; ) { x += sp(x - c0); xs.push(Math.min(B, x)); }
      return xs;
    };
    const plateauY = (x: number, z: number, n: number, s: number) => {
      const far = 5.2 + 2.6 * vn(x * 0.04 + 3, z * 0.04) + 1.2 * vn(x * 0.11, z * 0.11 + 7) + 0.03 * Math.max(0, -z - 30);
      return THREE.MathUtils.lerp(topY(s) + 0.07 + 0.08 * vn(x * 1.3, z * 1.3), far, sm((-n - 2) / 14));
    };
    const valleyY = (x: number, z: number, n: number) => {
      const bed = -2.6 - 0.35 * sm(n / 3);
      if (n < 8) return bed;
      const rise = Math.min(2.4, (n - 8) * 0.5) + 0.04 * Math.max(0, n - 13) + 0.6 * vn(x * 0.15, z * 0.15) * sm((n - 11) / 4)
        + 7 * (0.5 + 0.5 * vn(x * 0.018 + 4, z * 0.018)) * sm((n - 40) / 60) + 0.02 * Math.max(0, -z - 120);
      return bed + rise;
    };
    const field = (xs: number[], zs: number[], keep: (n: number) => boolean, Y: (x: number, z: number, n: number, s: number) => number, colF: (x: number, y: number, z: number, n: number) => THREE.Color, mat: THREE.Material) => {
      const NX = xs.length, NZ = zs.length, pos = new Float32Array(NX * NZ * 3), col = new Float32Array(NX * NZ * 3), uv = new Float32Array(NX * NZ * 2), ok = new Uint8Array(NX * NZ);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i, x = xs[i], z = zs[j], o = sdf(x, z), y = Y(x, z, o.n, o.s), c = colF(x, y, z, o.n);
        pos.set([x, y, z], k * 3); col.set([c.r, c.g, c.b], k * 3); uv.set([x / 3, z / 3], k * 2); ok[k] = keep(o.n) ? 1 : 0;
      }
      const idx: number[] = [];
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) {
        const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
        if (ok[a] && ok[b] && ok[c] && ok[d]) idx.push(a, c, d, a, d, b);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m);
      return m;
    };
    field(axis(-140, 8, 0.5, (d) => 0.16 + 0.055 * d), axis(-270, 1.2, -1, (d) => 0.16 + 0.055 * d), (n) => n < -0.5, plateauY,
      (x, _y, z, n) => lerpC("#6e9a48", "#4a7a3c", 0.5 + 0.5 * vn(x * 0.3, z * 0.3)).lerp(C("#8a7a5a"), 0.4 * sm((-n - 0.6) / 0.6) * (1 - sm((-n - 1.5) / 1))), groundMat);
    field(axis(-60, 320, 2, (d) => 0.22 + 0.06 * d), axis(-420, 40, -2, (d) => 0.22 + 0.06 * d), (n) => n > -0.45, (x, z, n) => valleyY(x, z, n),
      (x, y, z) => (y < WATER_Y + 0.25 ? lerpC("#6a6252", "#4e5a46", sm((WATER_Y - y) / 0.6)) : lerpC("#5a8c40", "#3e6e3a", 0.5 + 0.5 * vn(x * 0.2, z * 0.2))), groundMat);

    // ---------------- the river ----------------
    {
      this.water = waterMat();
      const xs = axis(-80, 260, 1.5, (d) => 0.25 + 0.08 * d), zs = axis(-420, 30, -1, (d) => 0.25 + 0.08 * d);
      const NX = xs.length, NZ = zs.length, pos = new Float32Array(NX * NZ * 3), an = new Float32Array(NX * NZ);
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; pos.set([xs[i], WATER_Y, zs[j]], k * 3); an[k] = Math.min(sdf(xs[i], zs[j]).n, 9); }
      const idx: number[] = [];
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1; idx.push(a, c, d, a, d, b); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aN", new THREE.BufferAttribute(an, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, this.water); m.receiveShadow = false; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m);
    }

    // ---------------- boulders: rapids at the corner, the foot boulder with its puddle, bank rocks ----------------
    const BS: THREE.BufferGeometry[] = [];
    const boulders: [number, number, number, number][] = [[2.1, -1.75, -2.4, 0.75], [2.9, -1.85, -0.6, 0.5], [3.7, -1.8, -4.6, 0.85], [2.4, -1.95, 1.4, 0.42], [4.6, -1.9, -8.5, 0.7],
      [-4.6, -1.7, 0.9, 0.7], [1.3, -1.9, 0.9, 0.38], [6.2, -1.9, -14, 1.0], [3.4, -1.95, -11, 0.55], [-7.5, -1.6, 1.2, 1.1]];
    boulders.forEach(([x, y, z, s], i) => {
      BS.push(tf(rockGeo(s, 900 + i), M(x, y, z)));
      for (let k = 0; k < 3; k++) { const a = r() * TAU, rr = s * 0.4 * r(); this.splashSpots.push({ x: x + Math.cos(a) * rr, y: y + s * 0.62 - 0.05, z: z + Math.sin(a) * rr, ph: r(), per: 0.4 + 0.5 * r(), s: 0.14 + 0.06 * r() }); }
    });
    // the foot boulder: a broad flat slab (top y -0.62) with a puddle
    BS.push(clean(new THREE.CylinderGeometry(1.25, 1.5, 1.2, 28, 2).translate(-1.75, -1.22, 1.35), (_p, nn) => (nn.y > 0.7 ? C("#8a9a68") : C("#8e8680"))));
    bake(BS, bould);
    {
      this.puddle = waterMat(); this.puddle.uniforms.uStill.value = 1;
      const pg = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
      const pp = pg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) { const a = Math.atan2(pp.getZ(i), pp.getX(i)), k = 1 + 0.18 * Math.sin(a * 3 + 1) + 0.1 * Math.sin(a * 5); pp.setXYZ(i, pp.getX(i) * k * 0.72, 0, pp.getZ(i) * k * 0.52); }
      pg.setAttribute("aN", new THREE.BufferAttribute(new Float32Array(pp.count).fill(9), 1));
      const m = new THREE.Mesh(pg, this.puddle); m.position.set(-1.75, -0.605, 1.4); m.frustumCulled = false; R.add(m);
      for (let k = 0; k < 9; k++) { const a = r() * TAU, rr = Math.sqrt(r()) * 0.45; this.rippleSpots.push({ x: -1.75 + Math.cos(a) * rr * 1.3, y: -0.6, z: 1.4 + Math.sin(a) * rr, ph: r(), per: 0.5 + 0.5 * r(), s: 0.16 + 0.08 * r() }); }
    }
    // splash crowns on the open water near the cliff
    for (let k = 0; k < 70; k++) this.splashSpots.push({ x: -5 + 10 * r(), y: WATER_Y + 0.01, z: 0.6 + 5 * r(), ph: r(), per: 0.35 + 0.5 * r(), s: 0.1 + 0.08 * r() });

    // ---------------- the tree + the slick branch ----------------
    {
      const TB: THREE.BufferGeometry[] = [], MS: THREE.BufferGeometry[] = [];
      const tb = V(0.08, plateauY(0.08, -1.42, -1.4, 0) - 0.3, -1.42);
      TB.push(clean(tube([tb, V(0.04, 5.2, -1.45), V(-0.25, 6.8, -1.55), V(-0.1, 8.5, -1.8), V(0.35, 10.2, -2.1)], (u) => 0.34 * (1 - 0.5 * u) + 0.18 * Math.exp(-u * 12), 40, 14, 3, 0.07, 2), "#ffffff"));
      for (let k = 0; k < 5; k++) { // roots gripping the top
        const a = -0.2 + k * 0.75, L = 0.8 + 0.5 * r(), pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 4; i++) { const u = i / 4, x = tb.x + Math.cos(a) * (0.25 + L * u), z = tb.z + Math.sin(a) * (0.25 + L * u) * 0.8; pts.push(V(x, tb.y + 0.3 + 0.25 * (1 - u) - 0.1 * u, z)); }
        TB.push(clean(tube(pts, (u) => 0.13 * (1 - u) + 0.03, 10, 8, 2, 0.08, k), "#e8f0d8"));
      }
      TB.push(clean(tube([V(-0.2, 7.4, -1.6), V(-1.4, 8.3, -1.2), V(-2.4, 8.8, -0.9)], (u) => 0.16 * (1 - 0.6 * u) + 0.03, 16, 8, 2, 0.06, 4), "#ffffff"));
      const lobes: [number, number, number, number, string][] = [];
      const lc = ["#2a5e3a", "#336a3c", "#24563e", "#3c7444"];
      for (let k = 0; k < 14; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 2.4; lobes.push([0.2 + Math.cos(a) * d, 10.1 + r() * 1.6 - d * 0.3, -2.0 + Math.sin(a) * d * 0.7, 1.0 + r() * 0.8, lc[k % 4]]); }
      for (let k = 0; k < 5; k++) lobes.push([-2.4 + (r() - 0.5) * 1.2, 8.9 + r() * 0.6, -0.9 + (r() - 0.5) * 0.8, 0.6 + 0.4 * r(), lc[k % 4]]);
      bake(TB, barkMat);
      const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 18, 12), plantMat, lobes.length);
      lobes.forEach(([x, y, z, s, c], i) => { im.setMatrixAt(i, M(x, y, z, r() * 6, 0, 0, [s, s * 0.7, s])); im.setColorAt(i, C(c)); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
      // the branch (its own pivot group: dips on the landing)
      const B = this.branch; B.position.copy(BR_PIVOT);
      const off = new THREE.Group(); off.position.copy(BR_PIVOT).negate(); B.add(off); R.add(B);
      const BK: THREE.BufferGeometry[] = [clean(tube(BR_PTS, BR_R, 70, 16, 3, 0.05, 7), "#ffffff")];
      // moss saddle on the top (a shell over the top half, proud of the bark: no coplanar faces)
      {
        const seg = 60, NPh = 12, mp: number[] = [], mi: number[] = [], muv: number[] = [];
        for (let i = 0; i <= seg; i++) {
          const u = 0.04 + (0.9 * i) / seg, c = BR_CURVE.getPointAt(u), T = BR_CURVE.getTangentAt(u);
          const up = V(0, 1, 0).addScaledVector(T, -T.y).normalize(), S = V(0, 0, 0).crossVectors(T, up).normalize();
          for (let j = 0; j <= NPh; j++) {
            const ph = -1.15 + (2.3 * j) / NPh, top = Math.max(0, Math.cos(ph * 1.25));
            const rr = BR_R(u) * (1 + 0.05 * vn(u * 30, ph)) + (-0.012 + 0.03 * Math.pow(top, 0.6) + 0.012 * vn(u * 40, ph * 3) * top);
            const d = up.clone().multiplyScalar(Math.cos(ph)).addScaledVector(S, Math.sin(ph));
            mp.push(c.x + d.x * rr, c.y + d.y * rr, c.z + d.z * rr); muv.push(j / NPh, u * 6);
          }
        }
        for (let i = 0; i < seg; i++) for (let j = 0; j < NPh; j++) { const a = i * (NPh + 1) + j, b = a + 1, c = a + NPh + 2, d = a + NPh + 1; mi.push(a, b, c, a, c, d); }
        const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.Float32BufferAttribute(mp, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(muv, 2)); mg.setIndex(mi); mg.computeVertexNormals();
        MS.push(clean(mg, "#ffffff"));
      }
      // twigs + a leafy tip, hanging moss beards beyond the landing spot
      const tip = BR_CURVE.getPointAt(0.97);
      BK.push(clean(tube([tip.clone(), V(tip.x + 0.5, tip.y + 0.35, tip.z - 0.2), V(tip.x + 0.8, tip.y + 0.7, tip.z - 0.1)], (q) => 0.05 * (1 - q) + 0.015, 8, 6), "#ffffff"));
      { const u = brUAtX(2.9), c = BR_CURVE.getPointAt(u); BK.push(clean(tube([c.clone(), V(c.x + 0.2, c.y + 0.6, c.z - 0.35), V(c.x + 0.25, c.y + 1.0, c.z - 0.5)], (q) => 0.05 * (1 - q) + 0.015, 8, 6), "#ffffff")); }
      const PL: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 4; k++) PL.push(tf(fernPlant(610 + k, 0.55, ["#2a5e30", "#7ab84a"]), M(tip.x + 0.3 + 0.25 * k, tip.y + 0.25 + 0.15 * k, tip.z - 0.1, k, 0.4, 0.2)));
      const SS: THREE.BufferGeometry[] = [];
      for (const x of [0.9, 2.55, 3.1, 3.7]) {
        const u = brUAtX(x), c = BR_CURVE.getPointAt(u), y0 = c.y - BR_R(u) * 0.7, L = 0.35 + 0.45 * r();
        SS.push(clean(tube([V(c.x, y0 + 0.08, c.z), V(c.x + 0.03, y0 - L * 0.5, c.z + 0.02), V(c.x - 0.02, y0 - L, c.z)], (q) => 0.045 * (1 - q) + 0.008, 6, 5), "#5e8a3e"));
        this.dripSpots.push({ x: c.x - 0.02, y: y0 - L, z: c.z, ph: r(), per: 0.5 + 0.4 * r(), s: 1 });
      }
      for (let k = 0; k < 10; k++) { const x = 0.7 + 3.2 * r(), u = brUAtX(x), c = BR_CURVE.getPointAt(u); this.dripSpots.push({ x: c.x, y: c.y - BR_R(u), z: c.z, ph: r(), per: 0.45 + 0.6 * r(), s: 1 }); }
      for (let k = 0; k < 14; k++) { const x = 0.7 + 3.2 * r(), u = brUAtX(x), c = BR_CURVE.getPointAt(u); this.splashSpots.push({ x: c.x, y: c.y + BR_R(u), z: c.z, ph: r(), per: 0.45 + 0.4 * r(), s: 0.1 + 0.05 * r() }); }
      bake(BK, barkMat, true, off); bake(MS, mossMat, true, off); bake(SS, solidMat, true, off); bake(PL, plantMat, true, off);
    }
    // drips off the lip overhang (left of the climb column and along the gorge lip)
    for (let k = 0; k < 16; k++) {
      const s = k < 10 ? -5 + 3.4 * r() : 1.5 + 3 * r(), o = outAt(s), top = topY(s);
      this.dripSpots.push({ x: o.x + o.nx * 0.05, y: top - 0.02, z: o.z + o.nz * 0.05, ph: r(), per: 0.5 + 0.5 * r(), s: 0 });
    }

    // ---------------- plants: lip ferns, ledge ferns, horsetails on the bank, araucarias beyond ----------------
    {
      const variants: { geo: THREE.BufferGeometry; inst: Inst[]; amp: number; mat?: THREE.Material }[] = [
        { geo: fernPlant(700, 1.1, ["#24602e", "#7cb848"]), inst: [], amp: 0.05 },
        { geo: fernPlant(701, 0.75, ["#2e6a30", "#9ccc52"]), inst: [], amp: 0.06 },
        { geo: fernPlant(702, 1.6, ["#2a5a34", "#6aa848"]), inst: [], amp: 0.04 },
        { geo: horsetails(710), inst: [], amp: 0.04 },
        { geo: araucaria(720, 12), inst: [], amp: 0.004, mat: hazeCap(plantMat, "plantFar", 0.62) },
        { geo: araucaria(721, 16), inst: [], amp: 0.003, mat: hazeCap(plantMat, "plantFar", 0.62) },
      ];
      const add = (vi: number, x: number, y: number, z: number, s: number) => variants[vi].inst.push({ x, y, z, yaw: r() * TAU, s, ph: r() * TAU, amp: variants[vi].amp * (0.7 + 0.6 * r()) });
      // along the lip: not over the climb column / the branch path (s' -1.7 .. 2.6)
      for (let i = 0; i < 70; i++) {
        const s = r() < 0.55 ? -12 + 10.2 * r() : 2.6 + 12 * r(), n = -0.75 - 1.8 * r(), o = outAt(s);
        const x = o.x + o.nx * n, z = o.z + o.nz * n, sd = sdf(x, z);
        add(i % 3 === 2 ? 2 : i % 3, x, plateauY(x, z, sd.n, sd.s) - 0.04, z, 0.8 + 0.5 * r());
      }
      // ledge ferns (small) on the face strata, away from the climb column
      for (let i = 0, got = 0; i < 400 && got < 18; i++) {
        const s = -6 + 11 * r(), y = -0.6 + 4.4 * r();
        if (s > -2.0 && s < 2.4) continue;
        const d0 = faceD(s, y), d1 = faceD(s, y + 0.05);
        if (d0 - d1 < 0.06) continue; // a ledge top just above y
        const o = outAt(s), dn = d0 - 0.06;
        add(1, o.x + o.nx * dn, y + 0.03, o.z + o.nz * dn, 0.45 + 0.35 * r()); got++;
      }
      // the far bank: horsetails + ferns; araucarias on the bank and on the plateau beyond (misty silhouettes).
      // SUN LANE: nothing tall within ~16 deg of the sun's bearing from the shot's cameras (the sun must break through)
      const sunB = Math.atan2(this.sunDir!.x, -this.sunDir!.z), camsP = [SHOTS[4].a, SHOTS[4].b].map((f) => camAt(5, f).pos);
      const inLane = (x: number, z: number) => camsP.some((cp) => { const b = Math.atan2(x - (cp[0] - CLIFF[0]), -(z - (cp[2] - CLIFF[2]))), d = Math.atan2(Math.sin(b - sunB), Math.cos(b - sunB)); return Math.abs(d) < 0.28; });
      for (let i = 0; i < 900; i++) {
        const x = -40 + 120 * r(), z = -260 + 270 * r(), o = sdf(x, z);
        if (o.n > 10.6 && o.n < 26 && r() < 0.4) add(r() < 0.5 ? 3 : 2, x, valleyY(x, z, o.n) - 0.05, z, 0.9 + 0.6 * r());
        else if (((o.n > 14 && Math.hypot(x, z) > 60) || (o.n < -6 && Math.hypot(x, z) > 32)) && !inLane(x, z) && r() < 0.22) add(r() < 0.5 ? 4 : 5, x, (o.n > 0 ? valleyY(x, z, o.n) : plateauY(x, z, o.n, o.s)) - 0.2, z, 0.7 + 0.6 * r());
      }
      for (const v of variants) {
        if (!v.inst.length) continue;
        const m = new THREE.InstancedMesh(v.geo, v.mat ?? plantMat, v.inst.length);
        m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; R.add(m);
        this.sway.push({ mesh: m, inst: v.inst });
      }
    }

    // ---------------- the curious long-neck dino on the far bank ----------------
    {
      const dm = hazeCap(lamb("clDino", { vertexColors: true }), "clDinoHaze", 0.55);
      const col = (p: THREE.Vector3) => lerpC("#5e7a62", "#8aa486", sm(p.y / 6));
      const body = clean(new THREE.SphereGeometry(1, 24, 16).scale(3.2, 2.0, 1.8).translate(0, 4.6, 0), col);
      const legs = [[-1.9, -0.9], [-1.9, 0.9], [1.8, -0.9], [1.8, 0.9]].map(([x, z]) => clean(new THREE.CylinderGeometry(0.55, 0.62, 4.0, 12).translate(x, 2.0, z), col));
      const tail = clean(tube([V(-2.8, 4.8, 0), V(-5.5, 3.8, 0.4), V(-8.5, 2.6, 1.4), V(-10.5, 2.0, 2.6)], (u) => 0.9 * (1 - u) + 0.08, 24, 10), col);
      this.dino.add(new THREE.Mesh(merge([body, ...legs, tail]), dm));
      this.dinoNeck.position.set(2.6, 5.6, 0); this.dino.add(this.dinoNeck);
      const neck = clean(tube([V(0, 0, 0), V(1.3, 2.4, 0), V(1.9, 5.0, 0), V(2.1, 7.6, 0)], (u) => 0.85 * (1 - 0.6 * u) + 0.12, 28, 12), col);
      this.dinoNeck.add(new THREE.Mesh(neck, dm));
      this.dinoHead.position.set(2.1, 7.6, 0); this.dinoNeck.add(this.dinoHead);
      const head = clean(new THREE.SphereGeometry(1, 16, 12).scale(0.95, 0.55, 0.55).translate(0.55, 0.2, 0), col);
      const eye = clean(new THREE.SphereGeometry(0.11, 8, 6).translate(0.85, 0.42, 0.42), "#151515");
      const eye2 = clean(new THREE.SphereGeometry(0.11, 8, 6).translate(0.85, 0.42, -0.42), "#151515");
      this.dinoHead.add(new THREE.Mesh(merge([head, eye, eye2]), dm));
      this.dino.traverse((o) => { o.frustumCulled = false; if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = false; (o as THREE.Mesh).receiveShadow = true; } });
      // on the far bank, a little right of the shot's mean view axis, turned toward the cliff
      const c0 = camAt(5, Math.round((SHOTS[4].a + SHOTS[4].b) / 2)), cp = V(c0.pos[0] - CLIFF[0], 0, c0.pos[2] - CLIFF[2]);
      const f = this.fwd, rt = V(-f.z, 0, f.x);
      let spot = cp.clone().addScaledVector(f, 75).addScaledVector(rt, 9);
      for (let d = 50; d < 140; d += 2) {
        const p = cp.clone().addScaledVector(f, d).addScaledVector(rt, d * 0.12);
        if (sdf(p.x, p.z).n > 12.5) { spot = p; break; }
      }
      const so = sdf(spot.x, spot.z);
      this.dino.position.set(spot.x, valleyY(spot.x, spot.z, so.n) - 0.3, spot.z);
      this.dino.rotation.y = Math.atan2(spot.z, -spot.x) - 0.5; // head (+x) toward the cliff, a bit toward the lens
      this.dino.scale.setScalar(0.9);
      R.add(this.dino);
    }

    // ---------------- far vista: hill ridges around the camera ----------------
    {
      const ridge = (Rr: number, y0: number, amp: number, bump: number, seed: number, base: string, fk: number) => {
        const n = 360, pos: number[] = [], ks: number[] = [], idx: number[] = [];
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
          let top = y0 + amp * (0.6 * vn(c * 2 + seed, s * 2) + 0.4 * vn(c * 5 + seed, s * 5 + 3));
          top += bump * Math.sqrt(Math.abs(Math.sin(a * Rr / 10 + vn(c * 9, s * 9) * 2)));
          pos.push(c * Rr, top, s * Rr, c * Rr, top - 160, s * Rr); ks.push(0, 1);
        }
        for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("k", new THREE.Float32BufferAttribute(ks, 1)); g.setIndex(idx);
        const m = new THREE.Mesh(g, ridgeMat()); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = -0.8;
        R.add(m); this.ridges.push({ m, base, f: fk });
      };
      ridge(380, 8, 22, 4, 1, "#30485a", 0.45);
      ridge(540, 22, 40, 3, 7, "#43506c", 0.62);
      ridge(740, 40, 70, 0, 13, "#55587a", 0.76);
    }

    // ---------------- mist banks in the gorge + low over the river ----------------
    {
      const mt = mistTex(), mg = new THREE.PlaneGeometry(1, 1);
      for (let i = 0; i < 22; i++) {
        const z = -6 - 140 * Math.pow(r(), 1.3), x = 2 + (r() - 0.3) * (10 + Math.abs(z) * 0.5), w = 14 + Math.abs(z) * 0.45;
        const s = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false, opacity: 0.6, side: THREE.DoubleSide }));
        s.rotation.set(-Math.PI / 2, 0, r() * TAU); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 2; R.add(s);
        this.mists.push({ s, x, y: -0.6 + 3.5 * r() + Math.abs(z) * 0.02, z, w, ph: r() * TAU, sp: 0.2 + 0.3 * r(), o: 0.4 + 0.35 * r() });
      }
    }

    // ---------------- dome, rain, god rays, sparks, pebbles ----------------
    this.domeM = domeMat();
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 32), this.domeM);
    this.dome.layers.set(NOINK); this.dome.frustumCulled = false; this.dome.renderOrder = -0.5; R.add(this.dome);
    this.rainN = rainMesh(5200, 11, V(16, 12, 16), 0.5, 0.0019); R.add(this.rainN);
    this.rainF = rainMesh(4200, 23, V(80, 44, 80), 1.8, 0.0022); R.add(this.rainF);
    this.rays = raysMesh(16, 41); R.add(this.rays);
    this.sparks = new Sparks(900, R);
    this.pebbles = new THREE.InstancedMesh(rockGeo(0.05, 77), bould, 7);
    this.pebbles.castShadow = true; this.pebbles.receiveShadow = true; this.pebbles.frustumCulled = false; R.add(this.pebbles);
    for (let i = 0; i < 7; i++) this.pebP.push([HB[0] + (r() - 0.5) * 0.4, HB[1] - 0.02 - 0.06 * r(), faceZAt(HB[0], HB[1] - 0.05) + 0.05 + 0.1 * r(), (r() - 0.5) * 0.9, 0.3 + 0.9 * r(), 0.4 + 0.9 * r(), r() * 0.12, r() * TAU]);
    if (DEBUG_MARKS) {
      for (const [p, c] of [[HOLD_A, "#ff2040"], [HOLD_B, "#20a0ff"], [BRANCH_POS, "#ffe020"], [CLIFF_START, "#40ff60"]] as [T3, string][]) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), new THREE.MeshBasicMaterial({ color: c })); m.position.set(p[0] - CLIFF[0], p[1] - CLIFF[1], p[2] - CLIFF[2]); R.add(m);
      }
    }
    this.animate(shotStart(5));
  }

  /** the world's camera-relative sun for shot 5 (same formula as world.shotSun) + the shot's mean view direction */
  private sun(): THREE.Vector3 {
    if (this.sunDir) return this.sunDir;
    const s = SHOTS[4], L = LOOKS[s.look];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(5, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    this.fwd.set(fx, 0, fz);
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    this.sunDir = V(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    return this.sunDir;
  }

  private animate(t: number) {
    // plants: rain-battered sway + little jolts from the drops
    for (const s of this.sway) {
      s.inst.forEach((p, i) => {
        const a = p.amp * (Math.sin(t * 1.1 + p.ph) + 0.5 * Math.sin(t * 2.7 + p.ph * 1.7) + 0.35 * Math.sin(t * 7.3 + p.ph * 3.1));
        const b = p.amp * 0.7 * Math.sin(t * 0.9 + p.ph * 2.3);
        this.q.setFromEuler(this.e.set(a, p.yaw, b, "YXZ"));
        this.m4.compose(this.vp.set(p.x, p.y, p.z), this.q, this.vs.set(p.s, p.s, p.s));
        s.mesh.setMatrixAt(i, this.m4);
      });
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    // pebbles: break off the foot hold at the slip, tumble into the river (scale in, no pop; shrink into the foam)
    this.pebP.forEach(([x, y, z, vx, vz, vy, dt, ph], i) => {
      const d = t - T_SLIP - dt;
      if (d <= 0) { this.m4.makeScale(0, 0, 0); this.pebbles.setMatrixAt(i, this.m4); return; }
      const py = y + vy * d - 4.9 * d * d, s = Math.min(1, d / 0.07) * (1 - sm((WATER_Y + 0.15 - py) / 0.2)) * (0.7 + 0.6 * ((i * 0.37) % 1));
      this.q.setFromEuler(this.e.set(d * 9 + ph, d * 5, d * 7));
      this.m4.compose(this.vp.set(x + vx * d, Math.max(WATER_Y, py), z + vz * d + 0.4 * d), this.q, this.vs.set(s, s, s));
      this.pebbles.setMatrixAt(i, this.m4);
    });
    this.pebbles.instanceMatrix.needsUpdate = true;
  }

  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 5;
    if (!R.visible) return;
    if (DEBUG_CAM) {
      cam.position.set(...Cw(...DEBUG_CAM.pos)); cam.up.set(0, 1, 0); cam.lookAt(...Cw(...DEBUG_CAM.look));
      cam.fov = DEBUG_CAM.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    const L = LOOKS.rain, sun = this.sun(), rainK = cliffAt(id, t).rain;
    untone(L.fog[0], this.fogC);
    WET.uT.value = t;
    untone(this.tmpC.set(L.light.sunCol), WET.uGlint.value).multiplyScalar(1.2);
    untone(this.tmpC.set(L.light.sky).lerp(C(L.fog[0]), 0.4), WET.uSheen.value).multiplyScalar(0.35);
    untone(this.tmpC.set(L.sky.c[3]).lerp(C("#8a9ccc"), 0.5), WET.uFill.value).multiplyScalar(0.55);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffc890"), 0.3), WET.uBnc.value).multiplyScalar(0.35);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffd2a0"), 0.3), WET.uRim.value).multiplyScalar(1.3);
    // dome: the looks' sky stops as the clear sky + the storm deck
    const du = this.domeM.uniforms;
    L.sky.c.forEach((h, i) => untone(h, du["c" + i].value));
    const ee = L.sky.e.map((d) => THREE.MathUtils.degToRad(d)); du.e.value.set(ee[1], ee[2], ee[3], ee[4]);
    du.uSun.value.copy(sun); du.uT.value = t; du.uFogC.value.copy(this.fogC);
    untone(this.tmpC.set("#262c3c").lerp(C(L.fog[0]), 0.25), du.uDark.value); untone(this.tmpC.set("#4a5266").lerp(C(L.fog[0]), 0.3), du.uMid.value);
    untone(this.tmpC.set("#3a4458").lerp(C(L.fog[0]), 0.4), du.uCurt.value);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffd890"), 0.4), du.uLine.value).multiplyScalar(1.6);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffe2a8"), 0.5), du.uRay.value).multiplyScalar(0.55);
    // rainbow hint: centred below the horizon on the side away from the sun (a cartoon cheat: it sits in view)
    {
      const f = this.fwd, rt = V(-f.z, 0, f.x), side = sun.dot(rt) > 0 ? -1 : 1;
      const az = THREE.MathUtils.degToRad(14) * side, el = THREE.MathUtils.degToRad(-12);
      const h = f.clone().multiplyScalar(Math.cos(az)).addScaledVector(rt, Math.sin(az)).normalize();
      du.uRbC.value.set(h.x * Math.cos(el), Math.sin(el), h.z * Math.cos(el)).normalize();
      du.uRbR.value = THREE.MathUtils.degToRad(27); du.uRbA.value = 0.22 * sm((t - shotStart(5) - 0.6) / 1.5) * (0.6 + 0.4 * sm((t - W.branches + 0.4) / 0.8));
      const fl = (d: number) => (d < 0 ? 0 : Math.min(1, d / 0.06) * Math.exp(-d / 0.09));
      du.uFlash.value = 1.4 * (fl(t - T_FLASH) + 0.6 * fl(t - T_FLASH - 0.16));
      du.uFlashD.value.copy(f).addScaledVector(rt, -side * 0.45).setY(0.3).normalize();
    }
    this.dome.position.copy(cam.position).sub(R.position);
    // water + puddle
    for (const wm of [this.water, this.puddle]) {
      const wu = wm.uniforms;
      wu.uT.value = t; wu.uSun.value.copy(sun); wu.uFogC.value.copy(this.fogC); wu.uFogR.value.set(L.fog[1], L.fog[2]);
      untone("#14303a", wu.uDeep.value); untone("#24505a", wu.uMid.value);
      untone(this.tmpC.set(L.sky.c[2]).lerp(C("#6a7a90"), 0.5), wu.uSky.value); untone(this.tmpC.set(L.fog[0]).lerp(C(L.sky.c[0]), 0.4), wu.uHor.value);
      untone("#c8d8e0", wu.uFoam.value).multiplyScalar(0.8);
      untone(this.tmpC.set(L.light.sunCol).lerp(C("#fff0c0"), 0.4), wu.uGlint.value).multiplyScalar(2.2);
    }
    // vista ridges around the camera
    const cl = R.worldToLocal(this.tv.copy(cam.position));
    for (const { m, base, f: fk } of this.ridges) {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      m.position.set(cl.x, 0, cl.z);
      untone(this.tmpC.set(base).lerp(C(L.fog[0]), fk), u.uCol.value);
      u.uFog.value.copy(this.fogC); untone(this.tmpC.set(L.light.sunCol).lerp(C(L.fog[0]), 0.35), u.uGlow.value); u.uSun.value.copy(sun); u.uMist.value = 0.85;
    }
    // mist
    for (const m of this.mists) {
      m.s.position.set(m.x + Math.sin(t * 0.05 * m.sp + m.ph) * 4, m.y, m.z + Math.cos(t * 0.04 * m.sp + m.ph) * 3);
      m.s.scale.set(m.w * 1.6, m.w * 0.8, 1); const mm = m.s.material as THREE.MeshBasicMaterial; mm.opacity = m.o; mm.color.copy(this.fogC).multiplyScalar(1.05);
    }
    // rain
    for (const [rm, k] of [[this.rainN, 0.62], [this.rainF, 0.5]] as [THREE.Mesh, number][]) {
      const u = (rm.material as THREE.ShaderMaterial).uniforms;
      u.uT.value = t; u.uSun.value.copy(sun); u.uK.value = k * rainK;
      untone(this.tmpC.set(L.fog[0]).lerp(C("#c8d4e8"), 0.6), u.uCol.value).multiplyScalar(0.7);
      untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffe0a0"), 0.4), u.uGold.value).multiplyScalar(2.4);
    }
    // god rays: slant down along the sun's azimuth, steeper than the sun itself
    const ru = (this.rays.material as THREE.ShaderMaterial).uniforms, hs = V(sun.x, 0, sun.z).normalize(), rel = THREE.MathUtils.degToRad(28);
    ru.uT.value = t; ru.uDir.value.set(-hs.x * Math.cos(rel), -Math.sin(rel), -hs.z * Math.cos(rel));
    ru.uCol.value.set(1.0, 0.72, 0.4); ru.uK.value = 0.32;
    // sparks: splash crowns, drips, ripple rings (pure functions of t)
    const S = this.sparks, su = (S.mesh.material as THREE.ShaderMaterial).uniforms;
    su.uSun.value.copy(sun);
    untone(this.tmpC.set(L.fog[0]).lerp(C("#e0ecff"), 0.7), su.uCol.value).multiplyScalar(0.9);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffe0a0"), 0.4), su.uGold.value).multiplyScalar(1.6);
    S.begin();
    const by = branchAt(id, t), bq = new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), by.rot);
    const bw = (x: number, y: number, z: number) => this.tv.set(x, y, z).sub(BR_PIVOT).applyQuaternion(bq).add(BR_PIVOT);
    for (const p of this.splashSpots) {
      const a = (t + p.ph * p.per) / p.per, cyc = Math.floor(a), u = a - cyc;
      if (u > 0.32) continue;
      const k = u / 0.32, jx = (hash(cyc, p.ph * 91) - 0.5) * 0.12, jz = (hash(cyc + 7, p.ph * 53) - 0.5) * 0.12;
      const onBranch = p.y > 4.3 && p.x > 0.6 && p.z > -1.2;
      const q = onBranch ? bw(p.x + jx, p.y, p.z) : this.tv.set(p.x + jx, p.y, p.z + jz);
      S.add(q.x, q.y, q.z, p.s * (0.8 + 0.6 * k), p.s * 0.9, k, 1);
    }
    // the landing shakes a shower off the branch (a burst of extra drips for ~1 s)
    const shake = t > T_LAND ? Math.exp(-(t - T_LAND) / 0.5) : 0;
    this.dripSpots.forEach((p, i) => {
      for (let b = 0; b < (shake > 0.05 && p.s ? 3 : 1); b++) {
        const per = b ? 0.22 + 0.1 * hash(i, b) : p.per, a = (t + p.ph * per + b * 0.37) / per, cyc = Math.floor(a), u = a - cyc;
        if (b && hash(cyc, i + b * 13) > shake * 1.6) continue;
        const grow = 0.3, fallT = (u - grow) * per, ox = b ? (hash(i, b * 3) - 0.5) * 0.6 : 0;
        const base = p.s ? bw(p.x + ox, p.y, p.z) : this.tv.set(p.x, p.y, p.z);
        if (u < grow) { const k = u / grow; if (!b) S.add(base.x, base.y - 0.02 * k, base.z, 0.03 * k, 0.045 * k, 0.9 * k, 0); continue; }
        const y = base.y - 0.03 - 4.9 * fallT * fallT;
        if (y < WATER_Y) continue;
        S.add(base.x, y, base.z, 0.026, 0.09 + Math.min(0.12, fallT * 0.5), 0.9, 0);
      }
    });
    for (const p of this.rippleSpots) {
      const a = (t + p.ph * p.per) / p.per, cyc = Math.floor(a), u = a - cyc;
      const jx = (hash(cyc, p.ph * 31) - 0.5) * 0.3, jz = (hash(cyc + 3, p.ph * 17) - 0.5) * 0.2;
      S.add(p.x + jx, p.y + 0.004, p.z + jz, p.s * 1.6, p.s, u, 2);
    }
    S.end();
    // the branch reacts to the landing
    this.branch.rotation.set(0, 0, by.rot);
    // the dino: the neck sways, the head turns toward the action; it perks up at "grip"
    {
      const perk = sm((t - W.grip) / 0.6);
      this.dinoNeck.rotation.set(0, 0.15 * Math.sin(t * 0.35), 0.06 * Math.sin(t * 0.5) + 0.1 * perk);
      this.dinoHead.rotation.set(0.25 * Math.sin(t * 0.7) * (1 - perk) + 0.09 * perk * Math.sin(t * 2.2), 0.4 * perk, -0.15 + 0.2 * perk);
    }
    this.animate(t);
  }
}
