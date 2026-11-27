// OWNER: sets. "Wrong Address": the summer city PARK (shots 1 + 5 dusk) and the school SCIENCE FAIR gym (GYM, shot 4).
//
// Both sets light themselves with their OWN shader rig (sets_kit.ts imat; technique: goose/sets.ts):
//   PARK: open sky. The sun key = the world's camera-relative sun for the shot (same formula as world.shotSun, so the
//     cards' long shadows agree). The world shadow map gives the near long shadows (cart, bench, lamps, trees); an
//     ANALYTIC canopy test (ray vs 28 tree spheres) lays the long soft tree shadows across the far lawn too. Warm haze
//     glows toward the low sun in the fog. park = warm golden late afternoon; parkend (shot 5) = DUSK: rose low sun,
//     lilac-blue shade, the lamp posts + the cart's string lights + the skyline windows glow.
//   GYM: the sun enters ONLY through the high window strip in the LEFT wall (x -4): per pixel a surface is lit only if
//     its ray toward the sun passes the aperture minus the piers, so the low morning sun lays bright window patches
//     across the maple floor, the table and the bleachers; ray-marched haze beams + dust motes glow in the shafts
//     (NOINK, keep-outs around the kids + the girl). gym -> peak (LOOK_RAMPS, "Twice"): the rig ramps to an ICE-BLUE
//     cyan flash-freeze (white-cyan sun, cyan ambient, cold beams).
//
// SUN (looks.ts): park/parkend: any az works (rig follows the world sun). GYM wants the sun from the LEFT, a touch
//   behind the lens: GYM_SUN_AZ / GYM_SUN_EL below (looks gym + peak should use the same az/el so the card shadows
//   agree with the window patches; the rig itself always uses GYM_SUN).
//
// CONTRACTS (world = place anchor + local, metres; PARK = (0,0,0), GYM = (3000,0,0)):
//   PARK: lawn y 0; gravel path top y 0.015 (BEAN stands on it at PARK+(-0.15,0,-0.2), 0.8 m kept clear).
//     CART at PARK+(1.3,0,-1.3) yaw CART_YAW (front toward the lens): counter top y 1.09, umbrella rim y ~2.12
//       (r 1.0), giant cone sign on a pole up to y ~4.1. BENCH at PARK+(-1.4,0,-1.2) yaw BENCH.yaw, seat top y 0.45.
//     LAMPS (posts, globe at y ~3.0), POND (centre, radii), trees, flower beds, skyline z -128..-160, hills.
//   GYM: maple floor y 0; left wall x -4 (window strip z -4..5, y 2.4..4.4), back wall z -4.6 (bleachers to y 1.8),
//     right wall x 4.5, ceiling 6.5. TABLE: x -1.8..1.6, z -0.86..-0.36 (back edge 4 cm IN FRONT of the kids' card
//     plane z -0.9: the kids sit right behind it), top y 0.72, cloth skirt to the floor (left half red FAST, right half
//     blue SLOW). FAST banner centre (-0.9, 2.15, -1.55), SLOW (0.9, 2.15, -1.55) on a pole frame. Trifold "ICE-CREAM
//     HEADACHE STUDY" on the table centre (x 0, z -0.62, y 0.72..1.3). Centre circle (penguin logo) at (0, 0, 1.1).
//     The CHART easel is in props.ts (CHART).
import * as THREE from "three";
import { cloudHD, CLOUD_GOLD, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { PARK, GYM, SHOTS, LOOK_RAMPS, SUN_FROM, Look, V3 as SV3, smooth, camAt } from "./story";
import { LOOKS } from "./looks";
import {
  V3, C3, Bat, TRS, MM, flat, wallZ, wallX, lump, ribbon, LSet, imat, setLights, parkRig, gymRig, Glows, GlowItem, Haze, Motes, NT,
} from "./sets_kit";
import {
  grassTex, gravelTex, leafTex, cartSignTex, menuTex, waffleTex, facadeTex, mapleTex, blockTex, fastTex, slowTex, fairTex,
  trifoldTex, bgTrifoldTex, scoreTex, outsideTex, logoTex, clockTex, tubTex,
} from "./sets_tex";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ exported contracts (world coordinates)
export const BEAN_SPOT = add(PARK, -0.15, 0, -0.2);
export const CART = add(PARK, 1.3, 0, -1.3);
export const CART_YAW = -0.42;
const CART_M = TRS(CART[0] - PARK[0], 0, CART[2] - PARK[2], CART_YAW);
/** a point in the cart's local frame -> world */
export const cartPt = (x: number, y: number, z: number): C3 => { const v = V3(x, y, z).applyMatrix4(CART_M); return add(PARK, v.x, v.y, v.z); };
/** the giant cone sign's pole (balloons are tied there, props.ts) */
export const CART_SIGN_POLE = cartPt(-0.5, 2.0, -0.22);
export const BENCH = { c: add(PARK, -1.4, 0, -1.2), yaw: 0.38, seatY: 0.45, len: 1.5 };
export const LAMPS: C3[] = [[-2.3, 0, -0.45], [2.75, 0, -3.1], [-0.6, 0, -9.4], [3.1, 0, -13.2], [-1.6, 0, -19.5], [-4.6, 0, 1.8]].map(([x, y, z]) => add(PARK, x, y, z));
export const POND = { c: add(PARK, -2.7, 0, -7.9), rx: 2.7, rz: 1.65 };
export const TABLE = { x0: GYM[0] - 1.8, x1: GYM[0] + 1.6, z0: GYM[2] - 0.86, z1: GYM[2] - 0.36, top: GYM[1] + 0.72 };
export const BANNER_FAST = add(GYM, -0.9, 2.15, -1.55);
export const BANNER_SLOW = add(GYM, 0.9, 2.15, -1.55);
export const TRIFOLD = add(GYM, 0, 0.72, -0.62);
export const GYM_WIN = { x: GYM[0] - 4, z0: GYM[2] - 4, z1: GYM[2] + 5, y0: GYM[1] + 2.4, y1: GYM[1] + 4.4 };

// ============================================================ rigs per look
export type Rig = { au: C3; ad: C3; sun: C3; lamp: number; fill: C3; haze: number; hazeC: C3; skyHaze: C3; motes: number; bounce: C3; win: number; cloud: C3; pend: C3; outK: number };
const R0: Rig = { au: [0, 0, 0], ad: [0, 0, 0], sun: [0, 0, 0], lamp: 0, fill: [0, 0, 0], haze: 0, hazeC: [1, 1, 1], skyHaze: [1, 1, 1], motes: 0, bounce: [0, 0, 0], win: 0, cloud: [1, 1, 1], pend: [0, 0, 0], outK: 1 };
const RIGS: Record<Look, Rig> = {
  park: { ...R0, au: [0.4, 0.5, 0.92], ad: [0.26, 0.24, 0.12], sun: [3.3, 2.2, 1.12], lamp: 0.0, fill: [0.08, 0.07, 0.1], skyHaze: [1.0, 0.78, 0.5], bounce: [0.16, 0.12, 0.04], win: 0.0, cloud: [1.0, 0.95, 0.9] },
  parkend: { ...R0, au: [0.3, 0.3, 0.62], ad: [0.15, 0.1, 0.16], sun: [1.7, 0.78, 0.66], lamp: 1.0, fill: [0.07, 0.06, 0.12], skyHaze: [1.0, 0.6, 0.62], bounce: [0.06, 0.04, 0.05], win: 1.0, cloud: [0.95, 0.7, 0.8] },
  gym: { ...R0, au: [0.5, 0.56, 0.72], ad: [0.3, 0.25, 0.2], sun: [3.0, 2.6, 2.0], fill: [0.12, 0.13, 0.17], haze: 0.55, hazeC: [1.0, 0.92, 0.78], motes: 1.2, bounce: [0.34, 0.24, 0.12], pend: [0.2, 0.22, 0.25], outK: 1.0 },
  peak: { ...R0, au: [0.38, 0.72, 1.15], ad: [0.16, 0.34, 0.5], sun: [2.6, 3.6, 4.4], fill: [0.12, 0.26, 0.4], haze: 0.85, hazeC: [0.6, 0.95, 1.3], motes: 1.6, bounce: [0.12, 0.3, 0.45], pend: [0.18, 0.3, 0.42], outK: 1.3 },
  mouth: { ...R0 }, hq: { ...R0 },
};
const mixRig = (a: Rig, b: Rig, k: number): Rig => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof Rig)[]) {
    const x = a[key], y = b[key];
    o[key] = Array.isArray(x) ? (x as number[]).map((v, i) => v + ((y as number[])[i] - v) * k) : (x as number) + ((y as number) - (x as number)) * k;
  }
  return o as Rig;
};
/** the rig for this frame: the shot's look, blended through LOOK_RAMPS exactly like world.ts */
export const rigAt = (id: number, f: number): Rig => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && f >= r[2] && (
    (s.look === r[0] && r[2] >= s.a && r[2] <= s.b) || (s.look === r[1] && s.a >= r[2] && s.a <= r[3] && f <= r[3])));
  if (!rp) return RIGS[s.look];
  return mixRig(RIGS[rp[0]], RIGS[rp[1]], smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2])));
};
/** the world's camera-relative sun for a shot (same formula as world.shotSun, incl. SUN_FROM) */
const sunCache = new Map<number, THREE.Vector3>();
export const worldSun = (id: number) => {
  let v = sunCache.get(id);
  if (v) return v;
  const id2 = SUN_FROM[id] ?? id, s = SHOTS[id2 - 1], L = LOOKS[SHOTS[id - 1].look];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id2, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  sunCache.set(id, v);
  return v;
};
/** GYM: the rig's own fixed sun (from shot 4's mean view) so it always rakes through the left windows */
export const GYM_SUN_AZ = -115, GYM_SUN_EL = 30;
let gymSunV: THREE.Vector3 | null = null;
export const gymSun = () => {
  if (gymSunV) return gymSunV;
  const s = SHOTS[3];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(4, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(GYM_SUN_AZ), el = THREE.MathUtils.degToRad(GYM_SUN_EL);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  return (gymSunV = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize());
};

// ============================================================ PARK
/** the gravel path's centre line (local xz) */
const PATH_PTS = [[1.6, 9], [0.9, 4], [0.1, 1.2], [-0.15, -0.2], [0.05, -2.2], [0.9, -4.6], [1.7, -7.4], [1.6, -10.4], [0.6, -13.6], [-0.6, -17], [-0.9, -21], [-0.2, -26]];
const pathCurve = new THREE.CatmullRomCurve3(PATH_PTS.map(([x, z]) => V3(x, 0, z)));
type Tree = { x: number; z: number; s: number; kind: number; seed: number };
const TREES: Tree[] = [
  { x: -3.3, z: -4.2, s: 1.15, kind: 0, seed: 11 }, { x: 3.9, z: -6.4, s: 1.3, kind: 1, seed: 12 }, { x: -6.2, z: -10.5, s: 1.5, kind: 0, seed: 13 },
  { x: 6.6, z: -12.5, s: 1.4, kind: 2, seed: 14 }, { x: -3.6, z: -16.5, s: 1.35, kind: 1, seed: 15 }, { x: 4.4, z: -19, s: 1.6, kind: 0, seed: 16 },
  { x: -8.5, z: -3.5, s: 1.4, kind: 2, seed: 17 }, { x: 8.2, z: -2.5, s: 1.3, kind: 0, seed: 18 }, { x: -5.5, z: 3.5, s: 1.3, kind: 1, seed: 19 },
  { x: 6.5, z: 4.5, s: 1.4, kind: 0, seed: 20 }, { x: -11, z: -15, s: 1.7, kind: 0, seed: 21 }, { x: 10.5, z: -17, s: 1.6, kind: 1, seed: 22 },
];
// a far tree line (a gap in the middle for the skyline)
for (let i = 0; i < 22; i++) { const r = rng(300 + i), side = i % 2 ? 1 : -1, x = side * (5 + r() * 26), z = -26 - r() * 16; TREES.push({ x, z, s: 1.4 + r() * 0.7, kind: Math.floor(r() * 3), seed: 400 + i }); }
const FOLIAGE: string[][] = [["#5cb043", "#7cc84e", "#3f9a3a"], ["#7ab83a", "#9ad04a", "#5a9a2e"], ["#3f9a5a", "#5ab46a", "#2e7a48"]];
const canopyOf = (t: Tree) => ({ c: V3(t.x, 2.95 * t.s, t.z), r: 1.15 * t.s });
/** a round painted tree: trunk + two branches + a cluster of lumpy foliage balls */
const roundTree = (b: Bat, bark: THREE.Material, leaf: THREE.Material, t: Tree) => {
  const r = rng(t.seed), s = t.s, pal = FOLIAGE[t.kind], h = 1.9 * s;
  b.rod(bark, V3(t.x, -0.05, t.z), V3(t.x + 0.05 * s, h, t.z - 0.03 * s), 0.11 * s, 9, "#7a5238", 0.17 * s);
  for (let k = 0; k < 2; k++) { const a = r() * 6.28; b.rod(bark, V3(t.x, h * 0.72, t.z), V3(t.x + Math.cos(a) * 0.55 * s, h * 1.12, t.z + Math.sin(a) * 0.55 * s), 0.05 * s, 6, "#7a5238", 0.08 * s); }
  const c = canopyOf(t).c;
  b.add(lump(1.0 * s, 0.92 * s, 1.0 * s, t.seed * 3, 0.1, 18, false), leaf, TRS(c.x, c.y, c.z, r() * 6), pal[0]);
  const n = 5 + Math.floor(r() * 2);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r(), up = r() * 0.7 - 0.2, rr = (0.5 + r() * 0.2) * s;
    b.add(lump(rr, rr * 0.92, rr, t.seed * 7 + k, 0.12, 14, false), leaf, TRS(c.x + Math.cos(a) * 0.8 * s, c.y + up * s, c.z + Math.sin(a) * 0.8 * s, r() * 6), pal[k % 3]);
  }
  b.add(lump(0.6 * s, 0.55 * s, 0.6 * s, t.seed * 5, 0.12, 14, false), leaf, TRS(c.x + 0.1 * s, c.y + 0.75 * s, c.z, r() * 6), pal[1]);
};
class Park {
  root = new THREE.Group(); S: LSet;
  lampMat: THREE.ShaderMaterial; bulbMat: THREE.ShaderMaterial; winMat: THREE.ShaderMaterial; glows: Glows; bulbGlow: Glows;
  clouds: THREE.Mesh[] = [];
  constructor() {
    this.S = parkRig();
    const R = this.root, S = this.S;
    R.position.set(...PARK);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), far = new Bat();
    const grass = imat(S, { map: grassTex(), rep: [0.4, 0.4], stripe: 0.07 });
    const gravel = imat(S, { map: gravelTex(), rep: [1, 1], spec: 12, specK: 0.06 });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.18 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 80, specK: 0.7 });
    const leaf = imat(S, { map: leafTex(), rep: [2, 2], rim: 0.3 }), bark = imat(S, { spec: 10, specK: 0.05 });
    const cream = imat(S, { spec: 40, specK: 0.35, rim: 0.2 });
    // ---- ground: the lawn (flat near the action, gently rolling beyond), the gravel path ----
    const roll = (x: number, z: number) => {
      const d = Math.hypot(x * 0.8, z + 4);
      return (0.45 * Math.sin(x * 0.11 + 0.4) * Math.sin(z * 0.09 + 1.3) + 0.25 * Math.sin(x * 0.23 + z * 0.17)) * smooth((d - 16) / 14);
    };
    b.add(flat(-140, -170, 140, 40, 0, 112, 84, roll), grass);
    {
      const pts = pathCurve.getSpacedPoints(160).map((p) => new THREE.Vector2(p.x, p.z));
      b.add(ribbon(pts, 1.55, 0.015, 0.14, 0.78), gravel);
      // pale stones along both path edges (tiny lumps, the ink draws the edge)
      const r = rng(5);
      for (let i = 0; i < pts.length - 1; i += 2) {
        const p = pts[i], q = pts[i + 1], tx = q.x - p.x, tz = q.y - p.y, tl = Math.hypot(tx, tz) || 1;
        for (const sd of [-1, 1]) {
          const x = p.x - (tz / tl) * sd * 0.8, z = p.y + (tx / tl) * sd * 0.8;
          if (Math.hypot(x + 0.15, z + 0.2) < 0.9) continue;
          fu.add(lump(0.07 + r() * 0.03, 0.035, 0.06, 900 + i * 2 + (sd > 0 ? 1 : 0), 0.15, 8), paint, TRS(x, 0, z, r() * 3), r() < 0.5 ? "#e8e0d4" : "#d4c8bc");
        }
      }
    }
    // ---- the POND: blob water surface, stone rim, lily pads, two ducks, reeds ----
    {
      const P = POND, cx = P.c[0] - PARK[0], cz = P.c[2] - PARK[2];
      const sh = new THREE.Shape(), N = 64, rad = (a: number) => 1 + 0.08 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2);
      for (let i = 0; i <= N; i++) { const a = (i / N) * Math.PI * 2, x = Math.cos(a) * P.rx * rad(a), y = Math.sin(a) * P.rz * rad(a); if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y); }
      const wg = new THREE.ShapeGeometry(sh, 4); wg.rotateX(Math.PI / 2);
      b.add(wg, imat(S, { col: "#3aa0b8", spec: 120, specK: 1.4, water: true }), TRS(cx, 0.02, cz));
      const r = rng(77);
      for (let i = 0; i < 46; i++) {
        const a = (i / 46) * Math.PI * 2 + r() * 0.05, rr = rad(a), s = 0.18 + r() * 0.12;
        fu.add(lump(s, s * 0.55, s * 0.8, 950 + i, 0.18, 10), paint, TRS(cx + Math.cos(a) * P.rx * rr * 1.02, -0.02, cz + Math.sin(a) * P.rz * rr * 1.02, a), ["#d8d0c8", "#c8c0b8", "#e6dcd0", "#b8b4b0"][i % 4]);
      }
      for (let i = 0; i < 9; i++) {
        const a = r() * 6.28, d = 0.3 + r() * 0.55, x = cx + Math.cos(a) * P.rx * d, z = cz + Math.sin(a) * P.rz * d, s = 0.16 + r() * 0.1;
        fu.add(new THREE.CircleGeometry(s, 16, 0.3, Math.PI * 2 - 0.6), gloss, TRS(x, 0.035, z, r() * 6, -Math.PI / 2), "#4aa040");
        if (i % 3 === 0) { fu.sph(gloss, TRS(x, 0.07, z, 0, 0, 0, [0.05, 0.04, 0.05]), 8, "#ff9ec4"); fu.sph(gloss, TRS(x, 0.1, z, 0, 0, 0, 0.018), 6, "#ffe06a"); }
      }
      const duck = (x: number, z: number, yaw: number) => {
        const M = TRS(x, 0.02, z, yaw);
        cast.add(lump(0.17, 0.12, 0.11, 61, 0.05, 14), gloss, M, "#fffaf0");
        cast.sph(gloss, MM(M, TRS(0.13, 0.2, 0, 0, 0, 0, 0.075)), 12, "#fffaf0");
        cast.add(new THREE.ConeGeometry(0.03, 0.08, 8), gloss, MM(M, TRS(0.22, 0.19, 0, 0, 0, -Math.PI / 2)), "#ffa23a");
        cast.add(new THREE.ConeGeometry(0.05, 0.1, 8), gloss, MM(M, TRS(-0.17, 0.1, 0, 0, 0, Math.PI / 2 + 0.6)), "#fffaf0");
        for (const s of [-1, 1]) fu.sph(gloss, MM(M, TRS(0.17, 0.23, s * 0.05, 0, 0, 0, 0.014)), 6, "#1c1c28");
      };
      duck(cx + 0.7, cz + 0.4, -2.2); duck(cx - 0.4, cz - 0.3, -2.7);
      for (let i = 0; i < 26; i++) { const a = -Math.PI * 0.85 + r() * Math.PI * 0.7, x = cx + Math.cos(a) * P.rx * 1.08, z = cz + Math.sin(a) * P.rz * 1.08, h = 0.5 + r() * 0.5; fu.rod(plain, V3(x, 0, z), V3(x + (r() - 0.5) * 0.15, h, z), 0.012, 4, "#4a8a3a"); if (i % 3 === 0) fu.cyl(gloss, 0.025, 0.025, 0.14, 6, TRS(x, h - 0.05, z), "#7a4a2a"); }
    }
    // ---- trees ----
    const cs = S.u.uTS.value as THREE.Vector4[];
    TREES.forEach((t, i) => {
      roundTree(Math.hypot(t.x, t.z) < 14 ? cast : far, bark, leaf, t);
      if (i < NT) { const c = canopyOf(t); cs[i].set(c.c.x + PARK[0], c.c.y + PARK[1], c.c.z + PARK[2], c.r); }
    });
    for (const [x, z, s] of [[-14, -24, 1.4], [15, -27, 1.5], [-20, -30, 1.3], [21, -22, 1.4]] as [number, number, number][]) {
      far.rod(bark, V3(x, 0, z), V3(x, 1.2 * s, z), 0.12 * s, 7, "#7a5238");
      far.add(lump(0.9 * s, 3.4 * s, 0.9 * s, Math.round(Math.abs(x) * 7), 0.1, 14, false), leaf, TRS(x, 3.4 * s, z), "#3f9a5a");
    }
    // ---- hedges along the far edge + round bushes ----
    for (let i = 0; i < 18; i++) { const x = -34 + i * 4; if (Math.abs(x) < 3.5) continue; far.rbox(leaf, 3.9, 1.0, 1.1, 0.45, TRS(x, 0.45, -23.5), i % 2 ? "#4aa440" : "#58b04a", 3); }
    {
      const r = rng(91);
      for (const [x, z, s] of [[-4.4, -1.4, 0.55], [4.6, -1.0, 0.6], [-5.2, -6.2, 0.7], [5.6, -8.8, 0.65], [2.6, 1.8, 0.45], [-2.9, 2.6, 0.5], [7.8, -6, 0.8], [-8.2, -8, 0.8]] as [number, number, number][]) {
        cast.add(lump(s, s * 0.8, s, Math.round(Math.abs(x * 13 + z)), 0.15, 14), leaf, TRS(x, -0.05, z, r() * 6), FOLIAGE[Math.floor(r() * 3)][Math.floor(r() * 2)]);
      }
    }
    // ---- flower beds: soil mound + clustered blooms ----
    const bed = (x: number, z: number, rx: number, rz: number, seed: number, cols: string[]) => {
      const r = rng(seed);
      fu.add(lump(rx, 0.06, rz, seed, 0.05, 20), paint, TRS(x, 0, z), "#8a5a3a");
      const n = Math.round(rx * rz * 60);
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28, d = Math.sqrt(r()) * 0.85, fx = x + Math.cos(a) * rx * d, fz = z + Math.sin(a) * rz * d, h = 0.1 + r() * 0.16;
        fu.add(lump(0.07, 0.07, 0.07, seed + i, 0.1, 8), leaf, TRS(fx, 0.03, fz), "#4aa040");
        fu.sph(cream, TRS(fx, h + 0.04, fz, 0, 0, 0, [0.045, 0.035, 0.045]), 8, cols[i % cols.length]);
        fu.sph(gloss, TRS(fx, h + 0.075, fz, 0, 0, 0, 0.016), 6, "#ffe06a");
      }
    };
    bed(-2.75, -2.35, 0.9, 0.45, 501, ["#ff6a8a", "#ffffff", "#ffb03a"]);
    bed(2.95, -0.35, 0.7, 0.4, 502, ["#c08aff", "#ff8ab4", "#ffffff"]);
    bed(-3.7, 1.0, 0.75, 0.5, 503, ["#ff4a4a", "#ffd23a", "#ff8ab4"]);
    bed(-1.1, -12.6, 1.0, 1.0, 504, ["#ff6a8a", "#ffd23a", "#ffffff", "#c08aff"]);
    bed(3.6, -9.6, 0.9, 0.5, 505, ["#ffb03a", "#ff6a8a"]);
    // ---- the BENCH ----
    {
      const B = BENCH, M = TRS(B.c[0] - PARK[0], 0, B.c[2] - PARK[2], B.yaw), L = B.len, wood = "#d88a4a", iron = "#2e3a34";
      const at = (x: number, y: number, z: number) => V3(x, y, z).applyMatrix4(M);
      for (let k = 0; k < 4; k++) cast.rbox(paint, L, 0.035, 0.075, 0.012, MM(M, TRS(0, B.seatY - 0.018, -0.17 + k * 0.095)), wood);
      for (let k = 0; k < 3; k++) cast.rbox(paint, L, 0.08, 0.03, 0.012, MM(M, TRS(0, 0.58 + k * 0.11, -0.25 - k * 0.025, 0, -0.22)), wood);
      for (const sx of [-1, 1]) {
        const x = sx * (L / 2 - 0.12);
        cast.rod(metal, at(x, 0, 0.12), at(x, B.seatY - 0.03, 0.1), 0.022, 6, iron);
        cast.rod(metal, at(x, 0, -0.2), at(x, 0.86, -0.32), 0.022, 6, iron);
        cast.box(metal, x - 0.018, B.seatY - 0.06, -0.22, x + 0.018, B.seatY - 0.035, 0.16, iron, M);
        cast.torus(metal, 0.12, 0.016, MM(M, TRS(x, 0.62, 0.02, Math.PI / 2, 0, 0)), iron, Math.PI);
        cast.box(metal, x - 0.025, 0.0, 0.06, x + 0.025, 0.025, 0.18, iron, M); cast.box(metal, x - 0.025, 0.0, -0.26, x + 0.025, 0.025, -0.14, iron, M);
      }
    }
    // ---- LAMP POSTS (green iron, globe lanterns) ----
    this.lampMat = imat(S, { col: "#000000", em: [0.3, 0.3, 0.28], self: [0.6, 0.6, 0.6] });
    for (const L of LAMPS) {
      const x = L[0] - PARK[0], z = L[2] - PARK[2], T = Math.hypot(x, z) < 6 ? cast : far, col = "#2e5a46";
      T.lathe(metal, [[0.001, 0], [0.14, 0], [0.14, 0.12], [0.09, 0.2], [0.07, 0.55], [0.09, 0.62], [0.001, 0.62]], TRS(x, 0, z), 14, col);
      T.rod(metal, V3(x, 0.6, z), V3(x, 2.75, z), 0.045, 10, col, 0.035);
      T.lathe(metal, [[0.001, 0], [0.08, 0], [0.11, 0.06], [0.001, 0.06]], TRS(x, 2.72, z), 14, col);
      fu.sph(this.lampMat, TRS(x, 2.98, z, 0, 0, 0, [0.19, 0.22, 0.19]), 18);
      T.lathe(metal, [[0.001, 0.0], [0.2, 0.0], [0.16, 0.06], [0.04, 0.14], [0.02, 0.24], [0.001, 0.26]], TRS(x, 3.17, z), 14, col);
      T.sph(metal, TRS(x, 3.44, z, 0, 0, 0, 0.035), 8, col);
    }
    // ---- the ICE-CREAM CART ----
    this.bulbMat = imat(S, { col: "#000000", em: [0.6, 0.6, 0.6], self: [0.5, 0.5, 0.5] });
    const bulbs: GlowItem[] = [];
    {
      const M = CART_M, P = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => MM(M, TRS(x, y, z, ry, rx, rz, s));
      const at = (x: number, y: number, z: number) => V3(x, y, z).applyMatrix4(M);
      const MINT = "#a6ead2", PINK = "#ff8fb8", CREAM = "#fff4e2", INK = "#3a2a3a";
      const sign = imat(S, { map: cartSignTex(), spec: 40, specK: 0.2, self: [0.08, 0.06, 0.07] }), waffle = imat(S, { map: waffleTex(), rep: [3, 1.2], spec: 20, specK: 0.15 });
      // body + trims + the "ICE CREAM" panels (front + back)
      cast.rbox(gloss, 1.12, 0.62, 0.62, 0.06, P(0, 0.73, 0), MINT, 3);
      cast.rbox(gloss, 1.16, 0.08, 0.66, 0.03, P(0, 0.44, 0), PINK);
      cast.rbox(gloss, 1.16, 0.05, 0.66, 0.02, P(0, 1.0, 0), PINK);
      fu.plane(sign, 0.96, 0.48, P(0, 0.72, 0.313));
      fu.plane(sign, 0.96, 0.48, P(0, 0.72, -0.313, Math.PI));
      // counter top + the four open tubs with scoops
      cast.rbox(gloss, 1.24, 0.06, 0.72, 0.025, P(0, 1.06, 0), CREAM);
      const flav = ["#ff9ec4", "#9ef0c8", "#fff0c0", "#9a5a3a"];
      for (let k = 0; k < 4; k++) {
        const x = -0.42 + k * 0.28;
        fu.cyl(metal, 0.115, 0.105, 0.05, 20, P(x, 1.11, 0.04), "#d8dce8", true);
        fu.torus(metal, 0.115, 0.012, P(x, 1.135, 0.04, 0, Math.PI / 2), "#e8ecf4");
        fu.add(lump(0.105, 0.075, 0.105, 70 + k, 0.2, 14), cream, P(x, 1.12, 0.04, k), flav[k]);
        fu.add(lump(0.05, 0.04, 0.05, 80 + k, 0.2, 10), cream, P(x + 0.04, 1.17, 0.02, k), flav[k]);
      }
      // cone stack holder + an ice-cream scoop
      fu.cyl(metal, 0.06, 0.05, 0.12, 14, P(0.52, 1.15, 0.26), "#d8dce8", true);
      for (let k = 0; k < 4; k++) fu.add(new THREE.ConeGeometry(0.055, 0.16, 14, 1, true), waffle, P(0.52, 1.2 + k * 0.035, 0.26, 0, Math.PI));
      fu.rod(metal, at(-0.62, 1.1, 0.27), at(-0.52, 1.24, 0.27), 0.012, 6, "#c0c4d0"); fu.sph(metal, P(-0.64, 1.11, 0.27, 0, 0, 0, 0.035), 8, "#c0c4d0");
      // side wheels (spoked), legs
      for (const sx of [-1, 1]) {
        const wx = sx * 0.64;
        cast.torus(gloss, 0.29, 0.035, P(wx, 0.33, 0, Math.PI / 2), INK, Math.PI * 2, 10);
        cast.torus(gloss, 0.25, 0.018, P(wx, 0.33, 0, Math.PI / 2), PINK);
        cast.cyl(metal, 0.05, 0.05, 0.08, 12, P(wx, 0.33, 0, 0, 0, Math.PI / 2), CREAM);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; fu.rod(metal, at(wx, 0.33, 0), at(wx, 0.33 + Math.sin(a) * 0.25, Math.cos(a) * 0.25), 0.008, 5, CREAM); }
      }
      for (const [x, z] of [[-0.45, 0.22], [0.45, 0.22], [-0.45, -0.22], [0.45, -0.22]]) cast.rod(metal, at(x, 0, z), at(x, 0.42, z), 0.02, 6, "#d8dce8");
      // push handle at the right side
      cast.rod(metal, at(0.56, 0.95, 0.2), at(0.9, 1.05, 0.2), 0.016, 6, "#d8dce8");
      cast.rod(metal, at(0.56, 0.95, -0.2), at(0.9, 1.05, -0.2), 0.016, 6, "#d8dce8");
      cast.rod(metal, at(0.9, 1.05, -0.24), at(0.9, 1.05, 0.24), 0.022, 8, PINK);
      // the striped umbrella: 16 coloured wedges, scalloped valance, string lights, finial
      const UY = 2.12, UR = 1.0, UH = 0.4, NS = 16;
      cast.rod(metal, at(0, 1.09, -0.05), at(0, UY + UH, -0.05), 0.022, 8, CREAM);
      for (let i = 0; i < NS; i++) {
        const col = i % 2 ? CREAM : PINK, a0 = (i / NS) * Math.PI * 2;
        cast.add(new THREE.ConeGeometry(UR, UH, 4, 1, true, a0, (Math.PI * 2) / NS), cream, P(0, UY + UH / 2, -0.05), col);
        const am = a0 + Math.PI / NS, cx = Math.sin(am) * UR * 0.985, cz = Math.cos(am) * UR * 0.985;
        fu.add(new THREE.CircleGeometry(0.2, 10, Math.PI, Math.PI), cream, P(cx, UY + 0.005, cz - 0.05, am), col);
        const bp = at(Math.sin(am) * UR * 0.93, UY - 0.12, Math.cos(am) * UR * 0.93 - 0.05);
        const bc = [["#ffe08a", [1.0, 0.75, 0.35]], ["#ff9ac0", [1.0, 0.45, 0.6]], ["#9ae8ff", [0.45, 0.85, 1.0]], ["#fff0b0", [1.0, 0.9, 0.55]]][i % 4] as [string, C3];
        fu.sph(this.bulbMat, TRS(bp.x, bp.y, bp.z, 0, 0, 0, [0.028, 0.036, 0.028]), 8, bc[0]);
        bulbs.push({ p: V3(bp.x, bp.y - 0.01, bp.z), c: [bc[1][0] * 0.55, bc[1][1] * 0.55, bc[1][2] * 0.55], s: 0.32, g: 0, tw: 1 });
      }
      {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 64; i++) { const a = (i / 64) * Math.PI * 2, sag = Math.abs(Math.sin((a * NS) / 2)) * 0.1; pts.push(at(Math.sin(a) * UR * 0.95, UY - 0.02 - sag, Math.cos(a) * UR * 0.95 - 0.05)); }
        fu.tube(plain, pts, 0.005, 200, "#2a3a2a", 4);
      }
      cast.sph(gloss, P(0, UY + UH + 0.04, -0.05, 0, 0, 0, 0.06), 12, PINK); cast.sph(gloss, P(0, UY + UH + 0.12, -0.05, 0, 0, 0, 0.035), 10, "#e8343c");
      // the GIANT CONE SIGN on its pole (rear left corner)
      const sx = -0.5, sz = -0.22;
      cast.rod(metal, at(sx, 1.0, sz), at(sx, 2.95, sz), 0.035, 10, "#e8ecf4");
      cast.torus(metal, 0.045, 0.012, P(sx, 2.3, sz, 0, Math.PI / 2), PINK);
      cast.add(new THREE.ConeGeometry(0.24, 0.62, 20, 1), waffle, P(sx, 3.2, sz, 0, Math.PI));
      cast.add(lump(0.26, 0.24, 0.26, 91, 0.12, 18, false), cream, P(sx, 3.55, sz), "#ff9ec4");
      cast.add(lump(0.22, 0.2, 0.22, 92, 0.12, 18, false), cream, P(sx + 0.02, 3.78, sz), "#9ef0c8");
      cast.sph(gloss, P(sx + 0.03, 4.0, sz, 0, 0, 0, 0.07), 14, "#e8343c");
      cast.rod(plain, at(sx + 0.03, 4.05, sz), at(sx + 0.09, 4.17, sz), 0.008, 4, "#3a7a2a");
      for (let k = 0; k < 6; k++) { const a = k * 1.05; fu.add(lump(0.045, 0.09, 0.045, 95 + k, 0.1, 8, false), cream, P(sx + Math.cos(a) * 0.23, 3.42, sz + Math.sin(a) * 0.23), "#ff9ec4"); }
      // the chalkboard A-frame menu, front right
      const MA = P(0.98, 0, 0.42, 0.55), menu = imat(S, { map: menuTex(), self: [0.05, 0.05, 0.05] });
      for (const s of [-1, 1]) {
        cast.rbox(paint, 0.48, 0.66, 0.025, 0.01, MM(MA, TRS(0, 0.36, s * 0.1, 0, s * 0.16)), "#c88a4a");
        fu.plane(menu, 0.4, 0.55, MM(MA, TRS(0, 0.37, s * 0.1 + s * 0.016, s > 0 ? 0 : Math.PI, s * 0.16)));
      }
    }
    // ---- a bin by the bench ----
    cast.lathe(gloss, [[0.001, 0], [0.19, 0], [0.21, 0.7], [0.22, 0.74], [0.001, 0.74]], TRS(-2.65, 0, -1.25), 20, "#3a7a5a");
    cast.torus(metal, 0.215, 0.018, TRS(-2.65, 0.73, -1.25, 0, Math.PI / 2), "#2e3a34");
    // ---- the distant SKYLINE (pastel towers, windows lit at dusk) + HILLS ----
    this.winMat = imat(S, { map: facadeTex(), rep: [0.25, 1 / 3.5], wina: true, em: [0, 0, 0] });
    {
      const r = rng(1717), cols = ["#ffc8a8", "#d8c0f0", "#a8e0d0", "#a8c8f0", "#fff0c8", "#ffb8c8", "#c8e8a8"];
      let x = -170;
      while (x < 170) {
        const w = 10 + r() * 12, d = 9 + r() * 6, cen = Math.exp(-((x / 70) ** 2)), h = 6 + r() * 8 + cen * 9, z = -128 - r() * 16, col = cols[Math.floor(r() * cols.length)];
        far.box(this.winMat, x, -1, z - d, x + w, h, z, col);
        far.box(plain, x - 0.3, h, z - d - 0.3, x + w + 0.3, h + 0.8, z + 0.3, "#f4ece4");
        const top = r();
        if (top < 0.3) { far.box(this.winMat, x + w * 0.2, h + 0.8, z - d * 0.8, x + w * 0.8, h + 6, z - d * 0.2, col); far.box(plain, x + w * 0.15, h + 6, z - d * 0.85, x + w * 0.85, h + 6.6, z - d * 0.15, "#f4ece4"); }
        else if (top < 0.45) { far.cyl(plain, 1.6, 1.6, 2.6, 12, TRS(x + w * 0.6, h + 3.5, z - d / 2), "#c89a7a"); far.add(new THREE.ConeGeometry(1.9, 1.4, 12), plain, TRS(x + w * 0.6, h + 5.5, z - d / 2), "#a86a5a"); for (const ox of [-1, 1]) far.rod(plain, V3(x + w * 0.6 + ox, h + 0.8, z - d / 2), V3(x + w * 0.6 + ox, h + 2.2, z - d / 2), 0.12, 4, "#8a6a5a"); }
        else if (top < 0.6) far.rod(metal, V3(x + w / 2, h + 0.8, z - d / 2), V3(x + w / 2, h + 9, z - d / 2), 0.25, 6, "#e8e0e8", 0.08);
        else if (top < 0.75) { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(d, 0); sh.lineTo(d / 2, d * 0.55); sh.lineTo(0, 0); const tri = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: false }); tri.rotateY(Math.PI / 2); far.add(tri, plain, TRS(x, h + 0.8, z), "#c86a6a"); }
        x += w + 1 + r() * 4;
      }
      const hill = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      far.add(hill, grass, TRS(-140, -3, -210, 0, 0, 0, [170, 22, 70]), "#8ac06a");
      far.add(hill, grass, TRS(130, -3, -230, 0, 0, 0, [160, 28, 70]), "#7ab070");
      far.add(hill, grass, TRS(10, -3, -320, 0, 0, 0, [260, 34, 60]), "#90b8a0");
      for (let i = 0; i < 40; i++) {
        const x2 = (r() < 0.5 ? -1 : 1) * (30 + r() * 80), z2 = -48 - r() * 26, s = 1.6 + r() * 1.2;
        far.add(lump(1.3 * s, 1.2 * s, 1.3 * s, 2000 + i, 0.12, 10, false), leaf, TRS(x2, 1.6 * s, z2), FOLIAGE[i % 3][i % 2]);
        far.rod(bark, V3(x2, -0.2, z2), V3(x2, 0.8 * s, z2), 0.18 * s, 5, "#7a5238");
      }
    }
    // ---- clouds (painted billboards, NOINK) ----
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), new THREE.MeshBasicMaterial({ map: cloudHD(70 + (i % 4), CLOUD_GOLD), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1, 1, 1) }));
      const a = -0.75 + i * 0.3, d = 520 + (i % 3) * 60;
      m.position.set(Math.sin(a) * d, 70 + ((i * 37) % 60), -Math.cos(a) * d); m.rotation.y = -a; m.scale.setScalar(200 + (i % 3) * 50);
      m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 1; R.add(m); this.clouds.push(m);
    }
    b.build(R); fu.build(R); cast.build(R, true); far.build(R);
    // ---- glows: lamp globes (dusk) + the cart's string lights ----
    const items: GlowItem[] = [];
    for (const L of LAMPS) { const x = L[0] - PARK[0], z = L[2] - PARK[2]; items.push({ p: V3(x, 2.98, z), c: [1.0, 0.72, 0.38], s: 0.9, g: 0 }, { p: V3(x, 2.98, z), c: [0.25, 0.15, 0.07], s: 3.4, g: 0 }); }
    this.glows = new Glows(R, items, 0.8);
    this.bulbGlow = new Glows(R, bulbs, 0.6);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), sd = worldSun(id);
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun); S.u.uOpen.value = 1;
    S.u.uAO.value = 0; S.u.uTT.value = t; S.u.uFogCap.value = 0.8; (S.u.uHazeC.value as THREE.Color).setRGB(...rg.skyHaze);
    (S.u.uO.value as THREE.Vector3).set(O.x, O.y, O.z);
    const lk = rg.lamp, lc: C3 = [1.5 * lk, 0.95 * lk, 0.42 * lk];
    const lights = LAMPS.slice(0, 5).map((L) => ({ p: W2(L[0] - PARK[0], 2.95, L[2] - PARK[2]), c: lc, r: 2.2 }));
    const cp = cartPt(0, 1.9, 0);
    setLights(S, [
      ...lights,
      { p: V3(...cp), c: [0.9 * lk, 0.6 * lk, 0.45 * lk], r: 1.3 },     // the cart's string lights
      { p: W2(-0.1, 1.4, 3.2), c: rg.fill, r: 3.5 },                     // soft front fill
      { p: W2(-0.15, 0.25, -0.2), c: rg.bounce, r: 1.4 },               // warm bounce off the path around BEAN
    ], rg.au, rg.ad);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(0.25 + 3.2 * lk, 0.25 + 2.2 * lk, 0.22 + 1.0 * lk);
    (this.bulbMat.uniforms.uEm.value as THREE.Vector3).set(0.35 + 2.6 * lk, 0.35 + 2.6 * lk, 0.35 + 2.6 * lk);
    (this.winMat.uniforms.uEm.value as THREE.Vector3).set(1.6 * rg.win, 1.15 * rg.win, 0.55 * rg.win);
    this.glows.gk.set(lk, 0, 0, 0); this.glows.mat.uniforms.uT.value = t; this.glows.mesh.visible = lk > 0.01;
    this.bulbGlow.gk.set(0.15 + 0.85 * lk, 0, 0, 0); this.bulbGlow.mat.uniforms.uT.value = t;
    for (const m of this.clouds) (m.material as THREE.MeshBasicMaterial).color.setRGB(...rg.cloud);
  }
}

// ============================================================ GYM (science fair)
const GX0 = -4, GX1 = 4.5, GZ0 = -4.6, GZ1 = 9, GY = 6.5;
const WIN = { z0: -4, z1: 5, y0: 2.4, y1: 4.4, cols: 5, pier: 0.28, tr: 0.05 };
type LDefArr = { p: THREE.Vector3; c: C3; r: number }[];
class Gym {
  root = new THREE.Group(); S: LSet;
  haze: Haze; motes: Motes; outMat: THREE.ShaderMaterial; pendMat: THREE.ShaderMaterial; glows: Glows;
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  constructor() {
    this.S = gymRig();
    const R = this.root, S = this.S;
    R.position.set(...GYM);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), nk = new Bat();
    const floor = imat(S, { map: mapleTex(), rep: [0.5, 0.5], spec: 70, specK: 0.55 });
    const block = imat(S, { map: blockTex(), rep: [1 / 1.6, 1 / 0.8] });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.18 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 80, specK: 0.8 });
    const cream = imat(S, { spec: 40, specK: 0.35, rim: 0.2 }), cloth = imat(S, { rim: 0.2 });
    const WALL = "#d6e4f2", WALLHI = "#fff4e0", STRIPE = "#3a6ad8";
    // ---- floor + court lines (NOINK strips) + centre logo ----
    b.add(flat(GX0, GZ0, GX1, GZ1, 0), floor);
    {
      const line = imat(S, { spec: 60, specK: 0.4 });
      const strip = (pts: THREE.Vector2[], w: number, col: string) => nk.add(ribbon(pts, w, 0.004), line, undefined, col);
      const arc = (cx: number, cz: number, r: number, a0: number, a1: number, n = 64) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return new THREE.Vector2(cx + Math.cos(a) * r, cz + Math.sin(a) * r); });
      strip(arc(0, 1.1, 1.8, 0, Math.PI * 2, 96), 0.06, "#e8343c");
      strip([new THREE.Vector2(GX0 + 0.3, 1.1), new THREE.Vector2(-1.8, 1.1)], 0.06, "#e8343c");
      strip([new THREE.Vector2(1.8, 1.1), new THREE.Vector2(GX1 - 0.3, 1.1)], 0.06, "#e8343c");
      strip([new THREE.Vector2(GX0 + 0.5, GZ0 + 1.9), new THREE.Vector2(GX0 + 0.5, GZ1 - 0.5)], 0.06, "#3a6ad8");
      strip([new THREE.Vector2(GX1 - 0.5, GZ0 + 1.9), new THREE.Vector2(GX1 - 0.5, GZ1 - 0.5)], 0.06, "#3a6ad8");
      strip(arc(0, 7.4, 2.2, -Math.PI, 0, 48), 0.06, "#3a6ad8");
      const lg = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.9), imat(S, { map: logoTex(), cut: true, spec: 60, specK: 0.4 }));
      (lg.geometry as THREE.BufferGeometry).setAttribute("color", new THREE.Float32BufferAttribute(new Array(4 * 3).fill(1), 3));
      lg.rotation.x = -Math.PI / 2; lg.position.set(0, 0.006, 1.1); lg.layers.set(NOINK); lg.receiveShadow = true; lg.frustumCulled = false; R.add(lg);
    }
    // ---- walls: block lower (pale blue) with a stripe, cream upper; the LEFT wall with the window strip ----
    b.add(wallZ(GX0, GX1, 0, 2.0, GZ0), block, undefined, WALL); b.add(wallZ(GX0, GX1, 2.0, GY, GZ0), block, undefined, WALLHI);
    b.box(paint, GX0, 1.95, GZ0, GX1, 2.12, GZ0 + 0.03, STRIPE);
    {
      const hole = [[WIN.z0, WIN.z1, WIN.y0, WIN.y1]];
      bn.add(wallX(GX0, GZ0, GZ1, 0, 2.0, hole), block, undefined, WALL); bn.add(wallX(GX0, GZ0, GZ1, 2.0, GY, hole), block, undefined, WALLHI);
      bn.box(paint, GX0, 1.95, GZ0, GX0 + 0.03, 2.12, GZ1, STRIPE);
      const xa = GX0 - 0.3, xb = GX0;
      bn.box(paint, xa, WIN.y0 - 0.06, WIN.z0, xb + 0.12, WIN.y0, WIN.z1, "#ffffff");
      bn.box(paint, xa, WIN.y1, WIN.z0, xb, WIN.y1 + 0.02, WIN.z1, "#ffffff");
      const cw = (WIN.z1 - WIN.z0) / WIN.cols;
      for (let k = 0; k <= WIN.cols; k++) { const z = WIN.z0 + k * cw; bn.box(paint, xa, WIN.y0, z - WIN.pier, xb + 0.02, WIN.y1, z + WIN.pier, "#f4f0e8"); }
      const ym = (WIN.y0 + WIN.y1) / 2;
      bn.box(paint, xb - 0.12, ym - WIN.tr, WIN.z0, xb - 0.06, ym + WIN.tr, WIN.z1, "#f4f0e8");
      this.outMat = imat(S, { map: outsideTex(), emap: true, em: [1.4, 1.4, 1.4] });
      const og = new THREE.Mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0 + 1, WIN.y1 - WIN.y0 + 0.6), this.outMat);
      (og.geometry as THREE.BufferGeometry).setAttribute("color", new THREE.Float32BufferAttribute(new Array(4 * 3).fill(1), 3));
      og.rotation.y = Math.PI / 2; og.position.set(GX0 - 0.6, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2); og.layers.set(NOINK); og.frustumCulled = false; this.negX.add(og);
      bp.add(wallX(GX1, GZ0, GZ1, 0, 2.0), block, undefined, WALL); bp.add(wallX(GX1, GZ0, GZ1, 2.0, GY), block, undefined, WALLHI);
      bp.box(paint, GX1 - 0.03, 1.95, GZ0, GX1, 2.12, GZ1, STRIPE);
      // right wall: the SCIENCE FAIR banner, clock, a door, stacked mats
      bp.plane(imat(S, { map: fairTex(), self: [0.08, 0.08, 0.1], spec: 30, specK: 0.15 }), 4.0, 1.0, TRS(GX1 - 0.02, 3.5, -0.5, -Math.PI / 2));
      bp.cyl(gloss, 0.26, 0.26, 0.05, 32, TRS(GX1 - 0.03, 2.6, 2.4, 0, 0, Math.PI / 2), "#1a1a24");
      bp.add(new THREE.CircleGeometry(0.235, 32), imat(S, { map: clockTex(), self: [0.15, 0.15, 0.15] }), TRS(GX1 - 0.058, 2.6, 2.4, -Math.PI / 2));
      bp.box(gloss, GX1 - 0.06, 0, 3.6, GX1, 2.2, 4.8, "#3a6ad8"); bp.box(gloss, GX1 - 0.08, 0.95, 4.6, GX1 - 0.04, 1.05, 4.7, "#d8dce8");
      for (let k = 0; k < 4; k++) bp.rbox(cloth, 1.0, 0.1, 1.6, 0.04, TRS(GX1 - 0.6, 0.05 + k * 0.105, 6.3, 0.03 * k), k % 2 ? "#3a8ae8" : "#ff4a3a");
      bc.add(flat(GX0, GZ0, GX1, GZ1, GY), imat(S, { col: "#e6e8f0" }));
    }
    // ceiling trusses + pendant lights
    this.pendMat = imat(S, { col: "#000000", em: [1, 1, 1] });
    const pend: GlowItem[] = [];
    for (let k = 0; k < 4; k++) {
      const z = -3.2 + k * 2.9;
      bc.box(metal, GX0, GY - 0.45, z - 0.06, GX1, GY - 0.38, z + 0.06, "#8a96b0"); bc.box(metal, GX0, GY - 0.06, z - 0.06, GX1, GY, z + 0.06, "#8a96b0");
      for (let i = 0; i < 12; i++) { const x = GX0 + (i + 0.5) * ((GX1 - GX0) / 12); bc.rod(metal, V3(x - 0.3, GY - 0.4, z), V3(x + 0.3, GY - 0.03, z), 0.02, 4, "#8a96b0"); }
      for (const x of [-2, 2]) {
        bc.rod(metal, V3(x, GY - 0.4, z), V3(x, 5.3, z), 0.012, 4, "#3a3a4a");
        bc.lathe(gloss, [[0.001, 0.32], [0.06, 0.32], [0.12, 0.22], [0.38, 0.0], [0.36, -0.01], [0.001, 0.2]], TRS(x, 5.0, z), 20, "#3a6a8a");
        bc.cyl(this.pendMat, 0.2, 0.2, 0.01, 20, TRS(x, 5.0, z), "#ffffff");
        pend.push({ p: V3(x, 4.97, z), c: [0.5, 0.55, 0.6], s: 1.0, g: 0 });
      }
    }
    // ---- BLEACHERS on the back wall (4 tiers), the hoop above, scoreboard, pennants ----
    {
      const x0 = -3.6, x1 = 3.6, tiers = 4, td = 0.42, th = 0.45;
      for (let k = 0; k < tiers; k++) {
        const z1 = GZ0 + (tiers - k) * td, y = (k + 1) * th;
        cast.box(paint, x0, y - 0.06, GZ0, x1, y, z1, "#c8844a");
        cast.box(floor, x0, y - th, z1 - 0.04, x1, y - 0.06, z1, "#e8c898");
        cast.box(paint, x0, y - th, z1 - 0.12, x1, y - th + 0.04, z1 - 0.04, "#5a6a8a");
      }
      for (const x of [x0 - 0.03, x1 + 0.03]) { cast.rod(metal, V3(x, 0, GZ0 + tiers * td), V3(x, tiers * th + 0.9, GZ0 + 0.1), 0.025, 6, "#8a96b0"); cast.rod(metal, V3(x, tiers * th, GZ0 + 0.1), V3(x, tiers * th + 0.9, GZ0 + 0.1), 0.025, 6, "#8a96b0"); }
      const r = rng(31);
      for (let i = 0; i < 7; i++) { const k = i % tiers, x = -3.2 + r() * 6.4, z = GZ0 + (tiers - k) * td - 0.2, y = (k + 1) * th; cast.rbox(cloth, 0.3, 0.36, 0.18, 0.07, TRS(x, y + 0.18, z, r() - 0.5), ["#ff8a3a", "#5ac8ff", "#c08aff", "#7ad07a", "#ffd23a"][i % 5], 3); }
      for (let i = 0; i < 5; i++) { const k = i % tiers, x = -3 + r() * 6, z = GZ0 + (tiers - k) * td - 0.12, y = (k + 1) * th; cast.cyl(gloss, 0.035, 0.035, 0.2, 10, TRS(x, y + 0.1, z), ["#5ac8ff", "#ff6a8a"][i % 2]); }
      const hz = GZ0 + 0.05;
      cast.box(metal, -0.06, 3.0, hz, 0.06, 3.9, hz + 1.0, "#8a96b0");
      cast.box(gloss, -0.9, 3.1, hz + 1.0, 0.9, 4.15, hz + 1.04, "#ffffff");
      cast.box(paint, -0.3, 3.15, hz + 1.041, 0.3, 3.55, hz + 1.05, "#e8343c");
      cast.box(paint, -0.26, 3.19, hz + 1.051, 0.26, 3.51, hz + 1.056, "#ffffff");
      cast.torus(metal, 0.23, 0.015, TRS(0, 3.05, hz + 1.3, 0, Math.PI / 2), "#ff6a2a");
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; fu.rod(plain, V3(Math.cos(a) * 0.23, 3.05, hz + 1.3 + Math.sin(a) * 0.23), V3(Math.cos(a + 0.4) * 0.15, 2.65, hz + 1.3 + Math.sin(a + 0.4) * 0.15), 0.006, 3, "#ffffff"); }
      cast.box(gloss, 1.9, 3.85, GZ0, 3.6, 4.75, GZ0 + 0.05, "#1a1a24");
      fu.plane(imat(S, { map: scoreTex(), emap: true, em: [1.1, 1.1, 1.1] }), 1.6, 0.8, TRS(2.75, 4.3, GZ0 + 0.06));
      for (let i = 0; i < 3; i++) { const x = -3.4 + i * 0.75; const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.62, 0); sh.lineTo(0.31, -0.62); sh.lineTo(0, 0); fu.add(new THREE.ShapeGeometry(sh), cloth, TRS(x, 4.6, GZ0 + 0.03), ["#ff4a3a", "#ffd23a", "#3a8ae8"][i]); }
    }
    // ---- the MAIN TABLE: cloth top + skirt (FAST red | SLOW blue), cups, bowls, tubs, the trifold ----
    {
      const T = TABLE, x0 = T.x0 - GYM[0], x1 = T.x1 - GYM[0], z0 = T.z0 - GYM[2], z1 = T.z1 - GYM[2], top = T.top - GYM[1];
      cast.box(cloth, x0, top - 0.03, z0, x1, top, z1, "#fffaf2");
      const skirt = (xa: number, xb: number, col: string) => {
        const g = new THREE.PlaneGeometry(xb - xa, top - 0.03, Math.max(8, Math.round((xb - xa) * 20)), 1), p = g.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) p.setZ(i, 0.012 * Math.sin(p.getX(i) * 40));
        g.computeVertexNormals();
        cast.add(g, cloth, TRS((xa + xb) / 2, (top - 0.03) / 2, z1 + 0.015), col);
      };
      skirt(x0, -0.05, "#ff5a4a"); skirt(-0.05, x1, "#4a92ec");
      cast.box(cloth, x0 - 0.012, 0.02, z0, x0, top - 0.03, z1 + 0.02, "#ff5a4a"); cast.box(cloth, x1, 0.02, z0, x1 + 0.012, top - 0.03, z1 + 0.02, "#4a92ec");
      cast.box(cloth, x0 - 0.012, top - 0.07, z1 + 0.03, x1 + 0.012, top - 0.02, z1 + 0.042, "#ffffff");
      const cup = (x: number, z: number, scoop: string) => {
        fu.lathe(gloss, [[0.001, 0], [0.035, 0], [0.048, 0.085], [0.05, 0.09], [0.001, 0.09]], TRS(x, top, z), 14, "#ffffff");
        fu.torus(gloss, 0.049, 0.006, TRS(x, top + 0.088, z, 0, Math.PI / 2), "#ff8ab4");
        fu.add(lump(0.045, 0.04, 0.045, Math.round(Math.abs(x * 100 + z * 7)), 0.2, 10), cream, TRS(x, top + 0.088, z), scoop);
      };
      const bowl = (x: number, z: number, scoop: string) => {
        fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.075, 0.035], [0.08, 0.05], [0.001, 0.03]], TRS(x, top, z), 18, "#ffd23a");
        fu.add(lump(0.055, 0.05, 0.055, Math.round(Math.abs(x * 50 + z * 9)), 0.2, 10), cream, TRS(x, top + 0.035, z), scoop);
        fu.rod(metal, V3(x + 0.02, top + 0.06, z), V3(x + 0.08, top + 0.14, z + 0.03), 0.006, 4, "#d8dce8");
      };
      for (const x of [-1.5, -1.0, -0.5]) { cup(x - 0.12, z1 - 0.16, "#ff9ec4"); bowl(x + 0.1, z1 - 0.2, "#9ef0c8"); }
      for (const x of [0.4, 0.9, 1.35]) { cup(x - 0.1, z1 - 0.15, "#fff0c0"); bowl(x + 0.12, z1 - 0.2, "#ff9ec4"); }
      const tub = imat(S, { map: tubTex(), spec: 40, specK: 0.3 });
      for (const [x, col] of [[-1.68, "#ff9ec4"], [1.47, "#9ef0c8"]] as [number, string][]) {
        fu.cyl(tub, 0.12, 0.11, 0.18, 24, TRS(x, top + 0.09, z1 - 0.2), "#ffffff");
        fu.add(lump(0.1, 0.06, 0.1, Math.round(Math.abs(x * 30)), 0.2, 12), cream, TRS(x, top + 0.18, z1 - 0.2), col);
      }
      for (let k = 0; k < 5; k++) fu.lathe(gloss, [[0.001, 0], [0.035, 0], [0.048, 0.085], [0.001, 0.085]], TRS(-1.62, top + k * 0.02, z0 + 0.12), 14, "#ffffff");
      fu.box(gloss, 1.25, top, z0 + 0.05, 1.4, top + 0.05, z0 + 0.18, "#ffe6f0");
      // the TRIFOLD (three panels, the middle one facing +z)
      const tx = TRIFOLD[0] - GYM[0], tz = TRIFOLD[2] - GYM[2], ph = 0.46, pw = 0.24, // (integration) smaller: clear of BEAN's peak face
        tri = imat(S, { map: trifoldTex(), spec: 20, specK: 0.1, self: [0.05, 0.05, 0.05] });
      for (let i = -1; i <= 1; i++) {
        const g = new THREE.PlaneGeometry(pw, ph), uv = g.getAttribute("uv") as THREE.BufferAttribute;
        for (let k = 0; k < uv.count; k++) uv.setX(k, (uv.getX(k) + i + 1) / 3);
        const yaw = i * 0.55, cx = tx + i * (pw / 2 + (pw / 2) * Math.cos(yaw)), cz = tz - Math.abs(i) * (pw / 2) * Math.sin(Math.abs(yaw));
        const Mp = TRS(cx, top + ph / 2 + 0.005, cz, -yaw);
        fu.add(g, tri, Mp);
        cast.box(paint, -pw / 2, -ph / 2, -0.012, pw / 2, ph / 2, -0.003, "#e8dcc8", Mp);
      }
    }
    // ---- FAST / SLOW banners on a pole frame behind the kids ----
    {
      const z = BANNER_FAST[2] - GYM[2], y = BANNER_FAST[1] - GYM[1];
      for (const x of [-1.75, 0, 1.75]) { cast.rod(metal, V3(x, 0, z - 0.03), V3(x, 2.62, z - 0.03), 0.022, 8, "#d8dce8"); cast.cyl(metal, 0.16, 0.18, 0.04, 16, TRS(x, 0.02, z - 0.03), "#8a96b0"); cast.sph(gloss, TRS(x, 2.65, z - 0.03, 0, 0, 0, 0.045), 10, "#ffd23a"); }
      cast.rod(metal, V3(-1.78, 2.5, z - 0.03), V3(1.78, 2.5, z - 0.03), 0.018, 8, "#d8dce8");
      const ban = (cx: number, tex: THREE.Texture) => {
        const g = new THREE.PlaneGeometry(1.5, 0.56, 24, 2), p = g.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) p.setZ(i, 0.025 * Math.sin(p.getX(i) * 5 + cx) * (0.6 - p.getY(i)));
        g.computeVertexNormals();
        cast.add(g, imat(S, { map: tex, spec: 30, specK: 0.15, self: [0.06, 0.06, 0.06], rim: 0.15 }), TRS(cx, y, z));
        for (const s of [-1, 1]) cast.rod(plain, V3(cx + s * 0.7, y + 0.28, z), V3(cx + s * 0.72, 2.5, z - 0.03), 0.006, 4, "#3a3a4a");
      };
      ban(-0.9, fastTex()); ban(0.9, slowTex());
    }
    // ---- background science-fair tables (volcano, planets, plants + magnets) ----
    {
      const zt = -2.45;
      const bgTable = (cx: number, w: number, k: number) => {
        cast.box(cloth, cx - w / 2, 0.68, zt - 0.32, cx + w / 2, 0.72, zt + 0.32, ["#ffe6a0", "#d0f0ff", "#ffd6e6", "#e0ffd0", "#f0e0ff"][k % 5]);
        cast.box(cloth, cx - w / 2, 0.02, zt + 0.32, cx + w / 2, 0.68, zt + 0.33, ["#ffb03a", "#5ac8ff", "#ff8ab4", "#7ad07a", "#b07aff"][k % 5]);
        const tri = imat(S, { map: bgTrifoldTex(k), self: [0.04, 0.04, 0.04] });
        for (let i = -1; i <= 1; i++) {
          const g = new THREE.PlaneGeometry(0.26, 0.42), uv = g.getAttribute("uv") as THREE.BufferAttribute;
          for (let q = 0; q < uv.count; q++) uv.setX(q, (uv.getX(q) + i + 1) / 3);
          fu.add(g, tri, TRS(cx + i * 0.25, 0.93, zt - 0.18 - Math.abs(i) * 0.06, -i * 0.5));
        }
      };
      bgTable(-2.6, 1.6, 0); bgTable(0, 1.6, 3); bgTable(2.6, 1.6, 2);
      cast.add(new THREE.ConeGeometry(0.28, 0.4, 16, 1, true), cream, TRS(-2.25, 0.92, zt + 0.05), "#8a5a3a");
      cast.add(lump(0.09, 0.05, 0.09, 4, 0.3, 10), cream, TRS(-2.25, 1.09, zt + 0.05), "#ff4a2a");
      for (let k = 0; k < 4; k++) { const a = k * 1.6; cast.add(lump(0.035, 0.12, 0.035, 10 + k, 0.2, 8, false), cream, TRS(-2.25 + Math.cos(a) * 0.12, 1.0, zt + 0.05 + Math.sin(a) * 0.12, a, 0.4 * Math.sin(a), 0.4 * Math.cos(a)), "#ff6a2a"); }
      cast.sph(gloss, TRS(0.45, 1.02, zt + 0.05, 0, 0, 0, 0.13), 16, "#ffc23a");
      for (const [dx, rr, col, h] of [[0.2, 0.05, "#5ac8ff", 0.9], [-0.05, 0.07, "#ff8a5a", 1.0], [-0.35, 0.09, "#c08aff", 0.95]] as [number, number, string, number][]) { cast.sph(gloss, TRS(dx, h, zt + 0.08, 0, 0, 0, rr), 14, col); cast.rod(metal, V3(dx, 0.72, zt + 0.08), V3(dx, h - rr, zt + 0.08), 0.006, 4, "#d8dce8"); }
      cast.torus(gloss, 0.13, 0.012, TRS(-0.35, 0.95, zt + 0.08, 0, 1.2, 0.3), "#ffe06a");
      for (const dx of [-0.45, -0.15, 0.15]) { cast.lathe(gloss, [[0.001, 0], [0.06, 0], [0.075, 0.12], [0.001, 0.12]], TRS(2.6 + dx, 0.72, zt + 0.08), 12, "#e87a4a"); cast.add(lump(0.07, 0.12 + (dx + 0.5) * 0.15, 0.07, Math.round((dx + 1) * 100), 0.2, 10, false), cream, TRS(2.6 + dx, 0.88 + (dx + 0.5) * 0.08, zt + 0.08), "#4aa040"); }
      cast.torus(gloss, 0.09, 0.03, TRS(3.05, 0.84, zt + 0.08), "#e8343c", Math.PI);
    }
    // ---- bunting: zig-zag pennants across the gym (3 swags) ----
    {
      const cols = ["#ff4a3a", "#ffd23a", "#3a8ae8", "#7ad07a", "#ff8ab4", "#ffffff"];
      for (const [z, y0] of [[-1.9, 3.5], [0.6, 3.9], [3.2, 4.3]] as [number, number][]) {
        const pts: THREE.Vector3[] = [], N = 26;
        for (let i = 0; i <= N; i++) { const u = i / N, x = GX0 + 0.05 + (GX1 - GX0 - 0.1) * u, y = y0 - 0.45 * Math.sin(u * Math.PI); pts.push(V3(x, y, z)); }
        fu.tube(plain, pts, 0.006, 80, "#3a3a4a", 4);
        for (let i = 0; i < N; i++) {
          const a = pts[i], c = pts[i + 1], sh = new THREE.Shape(), dx = c.x - a.x, dy = c.y - a.y;
          sh.moveTo(0, 0); sh.lineTo(dx * 0.85, dy * 0.85); sh.lineTo(dx * 0.42, dy * 0.42 - 0.26); sh.lineTo(0, 0);
          fu.add(new THREE.ShapeGeometry(sh), cloth, TRS(a.x + dx * 0.07, a.y + dy * 0.07, z), cols[i % cols.length]);
        }
      }
    }
    b.build(R); fu.build(R); cast.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil); nk.build(R, false, NOINK);
    this.glows = new Glows(R, pend, 0.6);
    const keeps = [
      { a: V3(GYM[0] + 0.35, 0, GYM[2] + 0.05), h: 1.7, r0: 0.45, r1: 1.0 },          // the girl + dad
      { a: V3(GYM[0] - 0.45, 0.6, GYM[2] - 1.06), h: 1.0, r0: 0.35, r1: 0.8 },        // BEAN (the peak face)
      { a: V3(GYM[0] - 1.1, 0.6, GYM[2] - 1.06), h: 0.9, r0: 0.3, r1: 0.7 },          // the other FAST kids
    ];
    this.haze = new Haze(R, S, keeps);
    this.motes = new Motes(R, S, 900, 77, [GX0 + 0.2, 0.3, -4.2, 3.5, 4.4, 4.5], keeps);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), sd = gymSun();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun); S.u.uOpen.value = 0;
    (S.u.uWC.value as THREE.Vector3).set(O.x + GX0, O.y + (WIN.y0 + WIN.y1) / 2, O.z + (WIN.z0 + WIN.z1) / 2);
    (S.u.uWN.value as THREE.Vector3).set(1, 0, 0); (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((WIN.z1 - WIN.z0) / 2, (WIN.y1 - WIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(WIN.cols, 2, WIN.pier, WIN.tr);
    (S.u.uO.value as THREE.Vector3).set(O.x, O.y, O.z); (S.u.uBox.value as THREE.Vector4).set((GX1 - GX0) / 2, GZ0, GY, (GX0 + GX1) / 2); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uFogCap.value = 0.6;
    const pl: LDefArr = [];
    for (let k = 0; k < 4; k++) for (const x of [-2, 2]) pl.push({ p: W2(x, 4.7, -3.2 + k * 2.9), c: rg.pend, r: 2.6 });
    setLights(S, [
      ...pl,
      { p: W2(1.2, 0.6, -1.2), c: rg.bounce, r: 2.2 },                  // sun bounce off the bright floor patches
      { p: W2(GX0 + 0.6, 3.4, 0.5), c: [rg.bounce[0] * 0.8, rg.bounce[1] * 0.8, rg.bounce[2] * 0.9], r: 3.0 }, // window glow
      { p: W2(0.2, 1.8, 4.6), c: rg.fill, r: 4.0 },                     // cool front fill
    ], rg.au, rg.ad);
    (this.outMat.uniforms.uEm.value as THREE.Vector3).set(1.3 * rg.outK, 1.35 * rg.outK, 1.45 * rg.outK);
    (this.pendMat.uniforms.uEm.value as THREE.Vector3).set(rg.pend[0] * 9, rg.pend[1] * 9, rg.pend[2] * 9);
    this.glows.gk.set(1, 0, 0, 0); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(V3(GX0, (WIN.y0 + WIN.y1) / 2, (WIN.z0 + WIN.z1) / 2), V3(0, 0, 1), V3(0, 1, 0), (WIN.z1 - WIN.z0) / 2, (WIN.y1 - WIN.y0) / 2, sd.clone().negate(), 10, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > GX0 + 0.1; this.posX.visible = c.x < GX1 - 0.1; this.ceil.visible = c.y < GY - 0.1;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { park: [0.4, 1.6, 5.2, 0.3, 1.3, -2, 52], gym: [0.2, 1.7, 5.6, 0.2, 1.2, -1, 56] };
export class Sets {
  root = new THREE.Group();
  private park = new Park();
  private gym = new Gym();
  constructor() { this.root.add(this.park.root, this.gym.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const o: SV3 = place === "gym" ? GYM : PARK, d = DEBUG_VIEW[place];
      cam.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); cam.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    this.park.root.visible = place === "park";
    this.gym.root.visible = place === "gym";
    if (this.park.root.visible) this.park.update(id, t, f);
    if (this.gym.root.visible) this.gym.update(id, t, f, cam);
  }
}
