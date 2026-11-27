// OWNER: skin. SKIN (shot 2): ON BEAN's forearm at giant scale. A soft peach skin plain (rest surface y 4) with
// pores + fine criss-cross creases, curving away into the warm haze (the arm's curve), and 12 giant springy HAIRS
// (~5 m brown stalks with cuticle scales) lying at 25 deg along one "grain" (LEAN, +x and away).
//   Each hair has a red ARRECTOR MUSCLE (a fibrous strap with cream tendon ends) from the skin BEHIND its root up to
//   1.2 m along the shaft, like a guy-rope. A glowing yellow NERVE network shows through a translucent jelly patch of
//   the skin (drawn in the skin shader from a per-vertex distance field); a yellow ARM rises out of a glowing pore at
//   the end of every branch and its little WHITE-GLOVED HAND grips that muscle.
// skinAt(2,t) + W (per-hair times are staggered along the nerve, so the action runs out from the nerve's source):
//   muscle : the HERO muscle (nearest the lens) glows + "TINY MUSCLE" label with an arrow (fades before "nerves").
//   cold   : giant inked snowflakes drift + spin through (NOINK), the skin cools to a lilac tint, hairs shiver.
//   scared : a giant MONSTER-HAND shadow (long claws) sweeps across the ground, hairs and all, left -> right.
//   nerve  : the network lights up (bloom); pulses race out along every branch and up every arm.
//   pull   : as each pulse reaches its hand the hand YANKS (slides toward the anchor with a jerk) and the muscle
//            CONTRACTS (belly flexes 1.8x like a bicep); the hairs strain up a few degrees, trembling.
//   stand  : a second pulse wave: every hand heaves, and the hairs SWING UPRIGHT in a staggered wave with a springy
//            overshoot (the shafts whip and bend); the muscles shorten as their hairs rise.
//   bumps  : the skin around each root DOMES up into a big round goosebump (springy), the hairs ride up on top.
//
// ===== CONTRACTS for the camera owner (LOCAL to SKIN = (1000,0,0); world = SKIN + local) =====
//   Layout: hairs lean along LEAN = (0.8, 0, -0.6) (screen right + away); each muscle runs from a pink pore 1.6 m
//   behind + 0.5 m lens-side of its root up to 1.2 m along the hair; its glove + yellow arm sit on the lens side.
//   Solid: skin surface y ~4 (domes up to 5.3 around each root, radius 1.6); it curves down beyond |x| 11 and z -15.
//   Hair roots (HAIRS[]) span x -5.6..5.8, z -10..2.6. Lying, the hairs reach y <= 6.3; upright y ~10.7.
//   Muscles/hands/arms stay within 2.2 m of their roots (front-most at z ~4.6), y <= 5.8. The glowing nerve trunk
//   (flat, in the skin shader) crosses the foreground at z ~6. Snowflakes fly in x -9..12, y 5..14, z -11..0.5.
//   CLEARANCE: keep cameras at z >= 7.5 (or y >= 12 over the field).
//   HERO_HAIR = world root of the hero hair (local (0.4, ~4, 2.6)); the "TINY MUSCLE" label stands above its muscle
//   and scales with camera distance (~55 % of the frame width). The scary shadow sweeps x -10 -> +8 around z 2.3
//   (through the hero), sized for the close framing.
//   Recommended keys SKIN_CAM_KEYS (tested in stills with the DEBUG camera, fov 45): dive 116 -> LAND close on the
//   hero muscle 160 (hold through "muscle", "cold", "scared") -> pull back, LAND wide 266 (before "pull") -> hold to
//   345 (stand + bumps) -> rise out 390. In the close framing the hero muscle sits at ~(36 %, 44 %) of the frame.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { ctex } from "../bridge/paint";
import { SKIN, V3, W, skinAt, smooth, clamp01, glide } from "./story";

const DEBUG = false; // TEMP: fly SKIN_CAM_KEYS for stills (must be false when reporting)
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

// ============================== helpers ==============================
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const h1 = (n: number) => hash(n, n * 0.37 + 1.3);
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const backOut = (u: number, c = 1.7) => { const x = clamp01(u) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };
/** damped spring step response, zero start velocity (overshoot ~ exp(-z pi / w)) */
const spr = (tau: number, z = 5.5, w = 13) => (tau <= 0 ? 0 : 1 - Math.exp(-z * tau) * (Math.cos(w * tau) + (z / w) * Math.sin(w * tau)));
const bumpW = (x: number, w: number) => (x <= 0 || x >= w ? 0 : Math.sin((Math.PI * x) / w));

// ============================== layout ==============================
export const SKIN_Y = 4;
const SKY = SKIN_Y;
/** rest ground height (local) */
const baseH = (x: number, z: number) => {
  const und = 0.09 * vn(x * 0.16 + 3, z * 0.16) + 0.035 * vn(x * 0.45, z * 0.45 + 7);
  const dz = Math.max(0, -z - 15), dx = Math.max(0, Math.abs(x) - 11);
  return SKY + und - 0.012 * dz * dz - 0.026 * dx * dx;
};
/** the hairs' common grain (xz unit vector) */
const LX = 0.8, LZ = -0.6;
const LEAN = 25 * DEG;
const ATT_S = 0.24;   // muscle attach point along the hair (fraction of its length)
const ANCH_D = 1.6;  // anchor distance behind the root (and ANCH_P toward the lens)
const ANCH_P = 0.5;
const DOME_R = 1.6, DOME_H = 1.3;
const domeW = (d: number) => { const u = d / DOME_R; return u >= 1 ? 0 : (1 - u * u) * (1 - u * u); };
type HairDef = { x: number; z: number; len: number; dl: number; ph: number };
const HDEF: HairDef[] = [
  { x: 0.4, z: 2.6, len: 5.0, dl: 0, ph: 0.3 },      // 0 HERO (front centre)
  { x: -3.6, z: 1.4, len: 4.9, dl: -6, ph: 1.7 },
  { x: 4.4, z: 1.9, len: 5.1, dl: 5, ph: 2.9 },
  { x: -5.6, z: -2.3, len: 5.2, dl: -4, ph: 4.1 },
  { x: -1.8, z: -1.4, len: 5.0, dl: 3, ph: 5.3 },
  { x: 2.2, z: -2.0, len: 5.3, dl: -3, ph: 0.9 },
  { x: 5.8, z: -1.2, len: 4.9, dl: 6, ph: 2.2 },
  { x: -3.8, z: -5.8, len: 5.1, dl: 2, ph: 3.6 },
  { x: 0.2, z: -5.2, len: 5.2, dl: -5, ph: 4.8 },
  { x: 4.0, z: -6.0, len: 5.0, dl: 4, ph: 1.2 },
  { x: -1.8, z: -9.6, len: 5.4, dl: -2, ph: 2.6 },
  { x: 2.4, z: -10.0, len: 5.2, dl: 3, ph: 3.9 },
];
type Hair = HairDef & { lx: number; lz: number; px: number; pz: number; ax: number; az: number; bx: number; bz: number; ry: number };
const HL: Hair[] = HDEF.map((h) => {
  const a = Math.atan2(LZ, LX) + h.dl * DEG, lx = Math.cos(a), lz = Math.sin(a), px = -lz, pz = lx;
  const ax = h.x - ANCH_D * lx + ANCH_P * px, az = h.z - ANCH_D * lz + ANCH_P * pz;
  // arm base: beside the muscle's grip (~30 % along), 0.85 m toward the lens side
  const tx = h.x + ATT_S * h.len * Math.cos(LEAN) * lx, tz = h.z + ATT_S * h.len * Math.cos(LEAN) * lz;
  const gx = ax + 0.3 * (tx - ax), gz = az + 0.3 * (tz - az);
  return { ...h, lx, lz, px, pz, ax, az, bx: gx + 0.85 * px, bz: gz + 0.85 * pz, ry: baseH(h.x, h.z) };
});
const wl = (x: number, y: number, z: number): V3 => [SKIN[0] + x, SKIN[1] + y, SKIN[2] + z];
/** world root of the hero hair */
export const HERO_HAIR: V3 = wl(HL[0].x, HL[0].ry, HL[0].z);
/** every hair: world root, length, unit lean direction (world), tip lying (rest) and tip upright (after "stand") */
export const HAIRS: { root: V3; len: number; lean: V3; tipRest: V3; tipUp: V3 }[] = HL.map((h) => ({
  root: wl(h.x, h.ry, h.z), len: h.len, lean: [h.lx, 0, h.lz],
  tipRest: wl(h.x + h.lx * h.len * 0.88, h.ry + h.len * 0.5, h.z + h.lz * h.len * 0.88),
  tipUp: wl(h.x + h.lx * h.len * 0.17, h.ry + DOME_H + h.len * 0.98, h.z + h.lz * h.len * 0.17),
}));
type CamKey = { f: number; pos: V3; look: V3; fov: number };
/** recommended shot-2 camera keys (WORLD coordinates) */
export const SKIN_CAM_KEYS: CamKey[] = [
  { f: 116, pos: wl(0.6, 18, 21), look: wl(0.5, 3.6, -1), fov: 45 },
  { f: 160, pos: wl(-0.2, 6.6, 8.8), look: wl(0.4, 3.6, 2.0), fov: 45 },   // LAND on the hero muscle ("its own tiny muscle")
  { f: 232, pos: wl(-0.15, 6.7, 9.1), look: wl(0.45, 3.65, 1.9), fov: 45 }, // tiny drift (cold, scared)
  { f: 266, pos: wl(0.8, 10.6, 16.0), look: wl(0.6, 2.0, -1.5), fov: 45 },  // pull back: LAND wide before "pull"
  { f: 345, pos: wl(0.8, 10.4, 15.6), look: wl(0.6, 2.05, -1.5), fov: 45 }, // hold (tiny push): stand + bumps
  { f: 390, pos: wl(0.7, 15, 21), look: wl(0.6, 3.6, -2), fov: 45 },       // rise out
];

// ============================== nerve network ==============================
type NPath = { pts: number[][]; r: number }; // pts: [x, z, s]
const catmull = (P: number[][], step: number) => {
  const out: number[][] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1].slice());
  return out;
};
const TRUNK_CP = [[-28, 8], [-12, 6.6], [-5, 5.7], [0.4, 6.0], [4.8, 4.8], [7.6, 1.2], [4.2, -3.0], [-1.0, -3.4], [-5.2, -7.2], [0.4, -8.0], [4.4, -12.8], [8, -30]];
const TRUNK_R = 0.3;
const NERVE = (() => {
  const trunk = catmull(TRUNK_CP, 0.2);
  let s = 0;
  trunk.forEach((p, i) => { if (i) s += Math.hypot(p[0] - trunk[i - 1][0], p[1] - trunk[i - 1][1]); p[2] = s; });
  const paths: NPath[] = [{ pts: trunk, r: TRUNK_R }];
  /** per hair: the full route from the source (trunk then branch), [x,z,s] */
  const routes: number[][][] = [];
  const branchTo = (bx: number, bz: number, bend: number, r: number, route: boolean) => {
    let bi = 0, bd = 1e9;
    trunk.forEach((p, i) => { const d = Math.hypot(p[0] - bx, p[1] - bz); if (d < bd) { bd = d; bi = i; } });
    const j = trunk[bi], mx = (j[0] + bx) / 2, mz = (j[1] + bz) / 2, dx = bx - j[0], dz = bz - j[1], L = Math.hypot(dx, dz) || 1;
    const cx = mx - (dz / L) * bend * L, cz = mz + (dx / L) * bend * L;
    const n = Math.max(3, Math.ceil(L / 0.2)), pts: number[][] = [];
    let s2 = j[2];
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = (1 - u) * (1 - u) * j[0] + 2 * u * (1 - u) * cx + u * u * bx, z = (1 - u) * (1 - u) * j[1] + 2 * u * (1 - u) * cz + u * u * bz;
      if (k) s2 += Math.hypot(x - pts[k - 1][0], z - pts[k - 1][1]);
      pts.push([x, z, s2]);
    }
    paths.push({ pts, r });
    if (route) routes.push([...trunk.slice(0, bi + 1), ...pts.slice(1)]);
  };
  HL.forEach((h, i) => branchTo(h.bx, h.bz, (h1(i * 7 + 2) - 0.5) * 0.5, 0.21, true));
  // decorative twigs (dead ends) so it reads as a network
  for (let k = 0; k < 9; k++) {
    const p = trunk[Math.floor(trunk.length * (0.1 + 0.08 * k))], side = k % 2 ? 1 : -1, a = h1(k * 3 + 1) * 0.8;
    branchTo(p[0] + side * (1.6 + 1.4 * a), p[1] + side * (0.8 + 1.6 * h1(k * 5)), side * 0.25, 0.1, false);
  }
  return { paths, routes };
})();
const ENDS = NERVE.routes.map((r) => r[r.length - 1][2]);
const S_LO = Math.min(...ENDS), S_HI = Math.max(...ENDS);
/** order of each hair along the nerve, 0..1 */
const sN = ENDS.map((s) => (s - S_LO) / Math.max(1e-3, S_HI - S_LO));
const ARM_LEN = 1.0; // approx extra arc up the arm
/** pulse speed so the front sweeps all hands in 0.45 s; pulse k emission time so it reaches the first hand at T */
const PV = (S_HI - S_LO) / 0.45;
const PULSE_T = [W.nerves - 0.2, W.pull - 0.08, W.stand - 0.4, W.bumps - 0.32].map((T) => T - (S_LO + ARM_LEN) / PV);

// ============================== per-hair schedule (staggered along the nerve) ==============================
const T_YANK1 = (i: number) => W.pull - 0.08 + 0.45 * sN[i];
const T_STAND = (i: number) => W.stand - 0.4 + 0.45 * sN[i];
const T_BUMP = (i: number) => W.bumps - 0.32 + 0.45 * sN[i];
/** hair elevation (rad) at t */
const hairTheta = (i: number, t: number) => {
  const h = HL[i];
  const st = skinAt(2, t);
  const yank = smooth((t - T_YANK1(i)) / 0.12);
  const standK = spr(t - T_STAND(i));
  const strain = (5 * DEG + 1.6 * DEG * Math.sin(t * 47 + h.ph * 3)) * yank * (1 - clamp01((t - T_STAND(i)) / 0.15));
  const shiver = (1.3 * st.cold + 1.8 * st.scared) * DEG * Math.sin(t * 38 + h.ph * 5);
  const sway = 1.4 * DEG * Math.sin(t * 1.25 + h.ph) * (1 - 0.6 * clamp01(standK));
  return LEAN + (90 * DEG - LEAN) * standK + strain + shiver + sway;
};
const domeH = (i: number, t: number) => DOME_H * spr(t - T_BUMP(i), 6, 11);

// ============================== shader patches ==============================
const SKU = {
  uOrg: { value: new THREE.Vector3(...SKIN) },
  uScC: { value: new THREE.Vector2(-100, 0) }, uScA: { value: 0 }, uScR: { value: 0 }, uScT: { value: null as THREE.Texture | null },
  uCold: { value: 0 }, uNerveOn: { value: 0 }, uPulse: { value: [-99, -99, -99, -99] },
};
const SCARY_SIZE = [7.5, 5.6];
const GLSL_COMMON = `
varying vec3 vSkW;
uniform vec3 uOrg; uniform vec2 uScC; uniform float uScA, uScR, uCold; uniform sampler2D uScT;
float skStE(float e, float x) { float w = fwidth(x) * 0.8 + 1e-4; return smoothstep(e - w, e + w, x); }
vec2 skH2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float skScary() {
  if (uScA < 0.002) return 0.0;
  vec2 d = vSkW.xz - uOrg.xz - uScC; float c = cos(uScR), s = sin(uScR);
  d = vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  vec2 uv = d / vec2(${SCARY_SIZE[0].toFixed(1)}, ${SCARY_SIZE[1].toFixed(1)}) + 0.5;
  if (uv.y < 0.0 || uv.y > 1.0 || uv.x > 1.0) return 0.0;
  return texture2D(uScT, vec2(max(uv.x, 0.002), uv.y)).a * uScA;
}
`;
const SCARY_APPLY = `
{
  float sc = skScary();
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.13, 0.09, 0.26), sc);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.92, 1.12) + vec3(0.02, 0.03, 0.06), uCold * 0.55);
}
`;
const SKIN_FRAG = `
{
  vec2 lp = vSkW.xz - uOrg.xz;
  float fadeK = 1.0 - smoothstep(0.08, 0.22, fwidth(lp.x) * 6.0);
  // fine criss-cross creases (two line sets) + a coarse crease cell network
  float a1 = abs(fract(dot(lp, vec2(0.80, 0.60)) / 1.35) - 0.5) * 1.35;
  float a2 = abs(fract(dot(lp, vec2(-0.55, 0.835)) / 1.6) - 0.5) * 1.6;
  float fine = (1.0 - skStE(0.025, a1)) * 0.6 + (1.0 - skStE(0.025, a2)) * 0.6;
  vec2 p = lp / 2.4; vec2 ip = floor(p), fp = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
    vec2 o = vec2(float(j), float(k)); vec2 r = o + 0.5 + 0.7 * (skH2(ip + o) - 0.5) - fp; float dd = dot(r, r);
    if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) { d2 = dd; }
  }
  float cell = 1.0 - skStE(0.035, (sqrt(d2) - sqrt(d1)) * 2.4);
  // pores: one dimple in some cells of a finer lattice
  vec2 q = lp / 0.95; vec2 iq = floor(q), fq = fract(q); vec2 hq = skH2(iq + 17.0);
  float pr = 0.05 + 0.05 * hq.y;
  float pd = length((fq - 0.25 - 0.5 * hq) * 0.95);
  float pore = step(0.45, hq.x) * (1.0 - skStE(pr, pd));
  float poreRim = step(0.45, hq.x) * (1.0 - skStE(pr + 0.05, pd)) * (1.0 - pore);
  diffuseColor.rgb *= 1.0 - fadeK * (0.10 * max(fine, 0.0) + 0.17 * cell);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.22, 0.24), 0.75 * pore * fadeK);
  diffuseColor.rgb *= 1.0 + 0.1 * poreRim * fadeK;
  // translucent jelly patch over the nerve + the cord itself
  float n = vNd;
  float jelly = 1.0 - smoothstep(0.35, 1.0, n);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.78, 0.70), 0.5 * jelly);
  float core = 1.0 - skStE(0.0, n);
  float edge = (1.0 - skStE(0.05, n)) * skStE(-0.03, n);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.66, 0.1), core);
  diffuseColor.rgb *= 1.0 - 0.75 * edge;
}
`;
const SKIN_EMIT = `
{
  float n = vNd; float core = 1.0 - smoothstep(-0.02, 0.02, n);
  float halo = exp(-max(n, 0.0) * max(n, 0.0) / 0.22);
  float pl = 0.0;
  for (int k = 0; k < 4; k++) { float d = (vNs - uPulse[k]) / 1.6; pl += exp(-d * d); }
  pl *= 1.0 - smoothstep(-0.2, 0.6, n);
  vec3 Y = vec3(1.0, 0.72, 0.12);
  totalEmissiveRadiance += Y * (uNerveOn * (core * 1.15 + halo * 0.3) + pl * (core * 4.5 + halo * 2.2)) * (1.0 - 0.6 * skScary());
}
`;
type Kind = "skin" | "hair" | "muscle" | "plain";
const patch = <T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, kind: Kind): T => {
  twoTone(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, SKU);
    const skin = kind === "skin", uvK = kind === "hair" || kind === "muscle";
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vSkW;" + (skin ? "\nattribute float aN; attribute float aS; varying float vNd; varying float vNs;" : "") +
        (uvK ? "\nvarying vec2 vSkUv;" : ""))
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec4 skw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          skw = instanceMatrix * skw;
        #endif
          vSkW = (modelMatrix * skw).xyz; }` + (skin ? "\nvNd = aN; vNs = aS;" : "") + (uvK ? "\nvSkUv = uv;" : ""));
    let frag = "";
    if (skin) frag = SKIN_FRAG;
    if (kind === "hair") frag = `{
      float f = fract(vSkUv.y / 0.34 + 0.12 * sin(vSkUv.x * 6.2832));
      float ln = smoothstep(0.86, 0.93, f) * (1.0 - smoothstep(0.96, 1.0, f));
      diffuseColor.rgb *= 1.0 - 0.3 * ln;
      diffuseColor.rgb *= 1.0 + 0.12 * smoothstep(0.0, 0.25, f) * (1.0 - smoothstep(0.25, 0.6, f));
    }`;
    if (kind === "muscle") frag = `{
      float st = abs(sin(vSkUv.x * 3.14159 * 9.0 + 0.6 * sin(vSkUv.y * 2.0)));
      diffuseColor.rgb *= 1.0 - 0.22 * smoothstep(0.82, 0.97, st);
      diffuseColor.rgb *= 1.0 + 0.1 * (1.0 - smoothstep(0.0, 0.4, st));
    }`;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_COMMON + (skin ? "varying float vNd; varying float vNs; uniform float uNerveOn; uniform float uPulse[4];\n" : "") +
        (uvK ? "varying vec2 vSkUv;\n" : ""))
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + frag + SCARY_APPLY)
      .replace("reflectedLight.indirectDiffuse = vec3( 0.0 );",
        "reflectedLight.indirectDiffuse = vec3( 0.0 );\n  reflectedLight.directDiffuse += vec3(0.36, 0.16, 0.13) * diffuseColor.rgb * 2.0 * pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0);");
    if (skin) sh.fragmentShader = sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n" + SKIN_EMIT);
  };
  m.customProgramCacheKey = () => "goSkin1_" + kind;
  return m;
};

// ============================== textures ==============================
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
/** "TINY MUSCLE" + a hand-drawn arrow whose tip is the bottom-left corner (sprite centre there) */
const LBL_W = 1024, LBL_H = 800, LBL_TIP: [number, number] = [470, 772];
const labelTex = () => ctex("goSkinLbl3", LBL_W, LBL_H, (g) => {
  g.clearRect(0, 0, LBL_W, LBL_H);
  g.lineJoin = "round"; g.lineCap = "round";
  const [tx, ty] = LBL_TIP;
  const path = () => { g.beginPath(); g.moveTo(560, 400); g.quadraticCurveTo(560, 600, tx + 8, ty - 60); };
  const head = () => { g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - 62, ty - 92); g.lineTo(tx + 6, ty - 70); g.lineTo(tx + 66, ty - 98); g.closePath(); };
  g.strokeStyle = "#140a1e"; g.lineWidth = 54; path(); g.stroke(); head(); g.lineWidth = 28; g.stroke(); g.fillStyle = "#140a1e"; g.fill();
  g.strokeStyle = "#ffe14a"; g.lineWidth = 26; path(); g.stroke(); g.fillStyle = "#ffe14a"; head(); g.fill();
  g.save(); g.translate(512, 200); g.rotate(-0.06);
  g.textAlign = "center"; g.textBaseline = "middle";
  for (const [txt, y, sz] of [["TINY", -90, 150], ["MUSCLE", 80, 170]] as [string, number, number][]) {
    g.font = `900 ${sz}px ${FONT}`;
    g.lineWidth = 46; g.strokeStyle = "#140a1e"; g.strokeText(txt, 0, y);
    g.fillStyle = "#ffe14a"; g.fillText(txt, 0, y);
  }
  g.restore();
});
const flakeTex = () => ctex("goSkinFlake", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.translate(256, 256);
  const arm = (w: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 0; k < 6; k++) {
      g.save(); g.rotate((k * TAU) / 6);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -210);
      for (const [d, l] of [[80, 62], [138, 48], [180, 30]] as [number, number][]) {
        g.moveTo(0, -d); g.lineTo(-l * 0.8, -d - l * 0.75); g.moveTo(0, -d); g.lineTo(l * 0.8, -d - l * 0.75);
      }
      g.stroke(); g.restore();
    }
    g.beginPath(); for (let k = 0; k <= 6; k++) { const a = (k * TAU) / 6; g.lineTo(Math.sin(a) * 46, -Math.cos(a) * 46); } g.stroke();
  };
  arm(40, "#1a1430"); arm(22, "#d6ecff"); arm(9, "#ffffff");
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
});
/** the monster-hand silhouette (alpha), fingers pointing +u; the wrist runs off the left edge (clamped -> endless arm) */
const scaryTex = () => {
  const t = ctex("goSkinScary", 1024, 1024, (g) => {
    g.clearRect(0, 0, 1024, 1024);
    g.filter = "blur(2px)";
    g.fillStyle = "#000";
    g.beginPath(); g.moveTo(-10, 430); g.quadraticCurveTo(250, 420, 380, 360); g.lineTo(560, 380); g.quadraticCurveTo(600, 520, 560, 650);
    g.lineTo(380, 640); g.quadraticCurveTo(250, 600, -10, 600); g.closePath(); g.fill();
    g.beginPath(); g.ellipse(500, 510, 150, 170, 0, 0, TAU); g.fill();
    const finger = (x0: number, y0: number, ang: number, len: number, w: number, curl: number) => {
      g.save(); g.translate(x0, y0); g.rotate(ang);
      g.beginPath(); g.moveTo(0, -w); g.quadraticCurveTo(len * 0.5, -w * 1.25 + curl * 0.4, len * 0.82, -w * 0.55 + curl);
      g.lineTo(len * 1.12, curl * 1.6 + w * 0.2);
      g.lineTo(len * 0.8, w * 0.5 + curl); g.quadraticCurveTo(len * 0.45, w * 1.2 + curl * 0.4, 0, w); g.closePath(); g.fill();
      for (const u of [0.32, 0.6]) { g.beginPath(); g.ellipse(len * u, curl * u * u, w * 0.55, w * 1.12, 0, 0, TAU); g.fill(); }
      g.restore();
    };
    finger(600, 400, -0.42, 300, 34, -30);
    finger(630, 480, -0.12, 350, 34, 20);
    finger(630, 560, 0.14, 330, 33, 26);
    finger(600, 630, 0.42, 270, 30, 34);
    finger(470, 360, -1.05, 230, 34, -40);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.needsUpdate = true;
  return t;
};

// ============================== tubes (CPU-built per frame) ==============================
class Tube {
  geo = new THREE.BufferGeometry();
  pos: THREE.BufferAttribute; nrm: THREE.BufferAttribute; uv: THREE.BufferAttribute; col: THREE.BufferAttribute;
  mesh: THREE.Mesh;
  private T: THREE.Vector3[] = []; private N = new THREE.Vector3(); private B = new THREE.Vector3(); private tmp = new THREE.Vector3();
  constructor(public ns: number, public na: number, mat: THREE.Material) {
    const n = (ns + 1) * (na + 1);
    this.pos = new THREE.BufferAttribute(new Float32Array(n * 3), 3); this.nrm = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    this.uv = new THREE.BufferAttribute(new Float32Array(n * 2), 2); this.col = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    const idx: number[] = [];
    for (let i = 0; i < ns; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    this.geo.setAttribute("position", this.pos); this.geo.setAttribute("normal", this.nrm); this.geo.setAttribute("uv", this.uv); this.geo.setAttribute("color", this.col);
    this.geo.setIndex(idx);
    for (let i = 0; i <= ns; i++) this.T.push(new THREE.Vector3());
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
  }
  /** c: centres (ns+1)*3, r: radii, v: uv.y per ring, col(i) colour per ring */
  set(c: Float32Array, r: Float32Array, v: Float32Array, col: (i: number) => THREE.Color) {
    const { ns, na } = this, P = this.pos.array as Float32Array, Nn = this.nrm.array as Float32Array, U = this.uv.array as Float32Array, Cc = this.col.array as Float32Array;
    for (let i = 0; i <= ns; i++) {
      const a = Math.max(0, i - 1), b = Math.min(ns, i + 1);
      this.T[i].set(c[b * 3] - c[a * 3], c[b * 3 + 1] - c[a * 3 + 1], c[b * 3 + 2] - c[a * 3 + 2]).normalize();
    }
    const t0 = this.T[0];
    this.N.set(0, 0, 1); if (Math.abs(t0.z) > 0.9) this.N.set(1, 0, 0);
    this.N.addScaledVector(t0, -this.N.dot(t0)).normalize();
    for (let i = 0; i <= ns; i++) {
      const t = this.T[i];
      if (i) this.N.addScaledVector(t, -this.N.dot(t)).normalize();
      this.B.crossVectors(t, this.N);
      const cl = col(i);
      for (let j = 0; j <= na; j++) {
        const a = (j / na) * TAU, ca = Math.cos(a), sa = Math.sin(a), k = i * (na + 1) + j;
        this.tmp.set(0, 0, 0).addScaledVector(this.N, ca).addScaledVector(this.B, sa);
        P[k * 3] = c[i * 3] + this.tmp.x * r[i]; P[k * 3 + 1] = c[i * 3 + 1] + this.tmp.y * r[i]; P[k * 3 + 2] = c[i * 3 + 2] + this.tmp.z * r[i];
        Nn[k * 3] = this.tmp.x; Nn[k * 3 + 1] = this.tmp.y; Nn[k * 3 + 2] = this.tmp.z;
        U[k * 2] = j / na; U[k * 2 + 1] = v[i];
        Cc[k * 3] = cl.r; Cc[k * 3 + 1] = cl.g; Cc[k * 3 + 2] = cl.b;
      }
    }
    this.pos.needsUpdate = true; this.nrm.needsUpdate = true; this.uv.needsUpdate = true; this.col.needsUpdate = true;
  }
}

/** merge non-indexed geometries (position + normal, zero uv) */
const mergeList = (list: THREE.BufferGeometry[]) => {
  const ls = list.map((p) => (p.index ? p.toNonIndexed() : p));
  let total = 0; for (const p of ls) total += p.getAttribute("position").count;
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3);
  let o = 0;
  for (const p of ls) {
    const pa = p.getAttribute("position"), na = p.getAttribute("normal");
    for (let i = 0; i < pa.count; i++) { P[(o + i) * 3] = pa.getX(i); P[(o + i) * 3 + 1] = pa.getY(i); P[(o + i) * 3 + 2] = pa.getZ(i); N[(o + i) * 3] = na.getX(i); N[(o + i) * 3 + 1] = na.getY(i); N[(o + i) * 3 + 2] = na.getZ(i); }
    o += pa.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  return g;
};
/** a white glove gripping a strap of radius vr along local x; the palm faces -y (the arm side), the cuff below it at
 *  y = -HAND_CUFF(vr); fingers wrap round the front over the top, the thumb round the back. */
const HAND_CUFF = (vr: number) => vr + 0.36;
const handGeo = (vr: number) => {
  const parts: THREE.BufferGeometry[] = [];
  const pa = -Math.PI / 2;
  ([[-0.2, 2.75, 0.105, 1], [0.0, 2.95, 0.11, 1], [0.2, 2.75, 0.105, 1], [0.38, 1.5, 0.1, -1]] as [number, number, number, number][]).forEach(([dx, len, tr, sg]) => {
    const rg = vr + tr - 0.015, a1 = pa + sg * len, lo = Math.min(pa, a1);
    parts.push(new THREE.TorusGeometry(rg, tr, 10, 30, len).rotateY(-Math.PI / 2).rotateX(-lo).translate(dx, 0, 0));
    parts.push(new THREE.SphereGeometry(tr * 1.15, 14, 10).translate(dx, Math.sin(a1) * rg, Math.cos(a1) * rg));
  });
  const pr = vr + 0.13;
  parts.push(new THREE.SphereGeometry(1, 18, 12).scale(0.42, 0.25, 0.15).rotateX(-pa).translate(0.05, Math.sin(pa) * pr, Math.cos(pa) * pr));
  const cr = HAND_CUFF(vr);
  parts.push(new THREE.TorusGeometry(0.16, 0.065, 10, 20).rotateX(Math.PI / 2).translate(0.05, -(cr - 0.05), 0));
  parts.push(new THREE.CylinderGeometry(0.16, 0.14, 0.14, 14).translate(0.05, -cr, 0));
  return mergeList(parts);
};

// ============================== Skin ==============================
const NFLAKE = 18;
const STRAP_R = 0.155, GRIP_R = STRAP_R * 0.95;
const C = (h: string) => new THREE.Color(h);
const MN = 24, HN = 40, HS0 = -0.12;

export class Skin {
  root = new THREE.Group();
  private surf: THREE.Mesh; private sPos: THREE.BufferAttribute; private sCol: THREE.BufferAttribute;
  private sBase: Float32Array; private cBase: Float32Array;
  private domeIdx: { idx: Int32Array; w: Float32Array }[] = [];
  private hairs: Tube[] = []; private muscles: Tube[] = []; private muscleMats: THREE.MeshPhongMaterial[] = [];
  private heroHalo: Tube; private haloMat: THREE.MeshBasicMaterial;
  private hands: THREE.InstancedMesh; private arms: THREE.InstancedMesh; private armMat: THREE.MeshLambertMaterial;
  private rings: THREE.InstancedMesh; private nPores: THREE.InstancedMesh; private nPoreMat: THREE.MeshLambertMaterial;
  private pulses: THREE.InstancedMesh;
  private flakes: THREE.Mesh[] = []; private flakeMat: THREE.MeshBasicMaterial;
  private label: THREE.Sprite;
  private lastKey = "";
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3();
  private bx = new THREE.Vector3(); private by = new THREE.Vector3(); private bz = new THREE.Vector3(); private tc = new THREE.Color();
  private cBuf = new Float32Array((HN + 1) * 3); private rBuf = new Float32Array(HN + 1); private vBuf = new Float32Array(HN + 1);
  private mc = new Float32Array((MN + 1) * 3); private mr = new Float32Array(MN + 1); private mv = new Float32Array(MN + 1); private hr = new Float32Array(MN + 1);
  private hairCol = [C("#5a301a"), C("#8c5530"), C("#b27a46")];
  private mRed = C("#e0313f"); private mTendon = C("#ffe0c8");

  constructor() {
    const R = this.root;
    R.position.set(...SKIN);
    R.visible = false;

    // ---------------- skin surface ----------------
    const axis = (lo: number, hi: number, d0: number, gLo: number, gHi: number, outLo: number, outHi: number) => {
      const a: number[] = [];
      for (let x = lo; x <= hi + 1e-6; x += d0) a.push(x);
      let x = lo, d = d0; while (x > outLo) { d *= gLo; x -= d; a.unshift(Math.max(x, outLo)); }
      x = a[a.length - 1]; d = d0; while (x < outHi) { d *= gHi; x += d; a.push(Math.min(x, outHi)); }
      return a;
    };
    const xs = axis(-9.5, 9.5, 0.1, 1.07, 1.07, -30, 30);
    const zs = axis(-13, 7.5, 0.1, 1.06, 1.08, -75, 20);
    const nc = xs.length, nr = zs.length, n = nc * nr;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), aN = new Float32Array(n), aS = new Float32Array(n);
    this.sBase = new Float32Array(n); this.cBase = new Float32Array(n * 3);
    const peach = C("#ffb898"), rose = C("#f79a8c"), cream = C("#ffcfae");
    const tc = new THREE.Color();
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
      const i = r * nc + c, x = xs[c], z = zs[r], y = baseH(x, z);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; this.sBase[i] = y;
      const m1 = vn(x * 0.22 + 11, z * 0.22), m2 = vn(x * 0.7 + 2, z * 0.7 - 4);
      tc.copy(peach).lerp(rose, clamp01(0.35 + 0.5 * m1)).lerp(cream, clamp01(0.25 * m2 + 0.1));
      col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
    }
    this.cBase.set(col);
    // nerve distance field (signed: distance to the cord edge) + arc length, via a bucket grid of segments
    {
      type Seg = { ax: number; az: number; bx: number; bz: number; sa: number; sb: number; r: number };
      const segs: Seg[] = [];
      for (const p of NERVE.paths) for (let k = 0; k < p.pts.length - 1; k++) {
        const a = p.pts[k], b = p.pts[k + 1];
        const u = k / (p.pts.length - 1), rr = p.r === TRUNK_R ? TRUNK_R : Math.max(0.13, p.r * (1 - 0.3 * u));
        segs.push({ ax: a[0], az: a[1], bx: b[0], bz: b[1], sa: a[2], sb: b[2], r: rr });
      }
      const CS = 2, buckets = new Map<string, Seg[]>();
      for (const s of segs) {
        const x0 = Math.floor((Math.min(s.ax, s.bx) - 2) / CS), x1 = Math.floor((Math.max(s.ax, s.bx) + 2) / CS);
        const z0 = Math.floor((Math.min(s.az, s.bz) - 2) / CS), z1 = Math.floor((Math.max(s.az, s.bz) + 2) / CS);
        for (let bx = x0; bx <= x1; bx++) for (let bz = z0; bz <= z1; bz++) { const k = bx + "," + bz; let l = buckets.get(k); if (!l) buckets.set(k, (l = [])); l.push(s); }
      }
      for (let i = 0; i < n; i++) {
        const x = pos[i * 3], z = pos[i * 3 + 2];
        const l = buckets.get(Math.floor(x / CS) + "," + Math.floor(z / CS));
        let best = 3, bs = -50;
        if (l) for (const s of l) {
          const dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz || 1;
          const u = clamp01(((x - s.ax) * dx + (z - s.az) * dz) / L2);
          const d = Math.hypot(x - s.ax - u * dx, z - s.az - u * dz) - s.r;
          if (d < best) { best = d; bs = lerp(s.sa, s.sb, u); }
        }
        aN[i] = best; aS[i] = bs;
      }
    }
    // hair domes: vertices within DOME_R of each root
    for (const h of HL) {
      const ids: number[] = [], ws: number[] = [];
      for (let i = 0; i < n; i++) { const d = Math.hypot(pos[i * 3] - h.x, pos[i * 3 + 2] - h.z); if (d < DOME_R) { ids.push(i); ws.push(domeW(d)); } }
      this.domeIdx.push({ idx: Int32Array.from(ids), w: Float32Array.from(ws) });
    }
    const idx: number[] = [];
    for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc - 1; c++) { const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1; idx.push(a, d, b, b, d, e); }
    const sg = new THREE.BufferGeometry();
    this.sPos = new THREE.BufferAttribute(pos, 3); this.sCol = new THREE.BufferAttribute(col, 3);
    sg.setAttribute("position", this.sPos); sg.setAttribute("color", this.sCol);
    sg.setAttribute("aN", new THREE.BufferAttribute(aN, 1)); sg.setAttribute("aS", new THREE.BufferAttribute(aS, 1));
    sg.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    sg.setIndex(idx); sg.computeVertexNormals();
    const skinMat = patch(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, specular: new THREE.Color(0.2, 0.15, 0.13), shininess: 30 }), "skin");
    this.surf = new THREE.Mesh(sg, skinMat);
    this.surf.receiveShadow = true; this.surf.castShadow = true; this.surf.frustumCulled = false;
    R.add(this.surf);
    SKU.uScT.value = scaryTex();

    // ---------------- hairs ----------------
    const hairMat = patch(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, specular: new THREE.Color(0.5, 0.36, 0.26), shininess: 46 }), "hair");
    for (let i = 0; i < HL.length; i++) { const t = new Tube(HN, 14, hairMat); this.hairs.push(t); R.add(t.mesh); }

    // ---------------- muscles (own material each: the glow is per muscle) ----------------
    for (let i = 0; i < HL.length; i++) {
      const m = patch(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, specular: new THREE.Color(0.45, 0.3, 0.3), shininess: 40, emissive: new THREE.Color(0, 0, 0) }), "muscle");
      const t = new Tube(MN, 16, m); this.muscles.push(t); this.muscleMats.push(m); R.add(t.mesh);
    }
    this.haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.9, 0.5), transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, fog: false });
    this.heroHalo = new Tube(MN, 16, this.haloMat);
    this.heroHalo.mesh.castShadow = false; this.heroHalo.mesh.receiveShadow = false; this.heroHalo.mesh.layers.set(NOINK); this.heroHalo.mesh.renderOrder = 2;
    R.add(this.heroHalo.mesh);

    // ---------------- hands, arms, pores ----------------
    const glove = patch(new THREE.MeshLambertMaterial({ color: "#fffaf0" }), "plain");
    this.hands = new THREE.InstancedMesh(handGeo(GRIP_R), glove, HL.length);
    this.armMat = patch(new THREE.MeshLambertMaterial({ color: "#ffcf3a", emissive: new THREE.Color(0.35, 0.2, 0.02) }), "plain");
    this.arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.075, 0.1, 1, 12, 1, true), this.armMat, HL.length);
    const ringMat = patch(new THREE.MeshLambertMaterial({ color: "#e98a80" }), "plain");
    this.rings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.3, 0.09, 10, 28).rotateX(Math.PI / 2), ringMat, HL.length * 2);
    this.nPoreMat = patch(new THREE.MeshLambertMaterial({ color: "#ffcf3a", emissive: new THREE.Color(0.4, 0.25, 0.02) }), "plain");
    this.nPores = new THREE.InstancedMesh(new THREE.TorusGeometry(0.19, 0.065, 8, 20).rotateX(Math.PI / 2), this.nPoreMat, HL.length);
    for (const m of [this.hands, this.arms, this.rings, this.nPores]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; R.add(m); }

    // ---------------- nerve pulses (bright streaks bulging under the skin) ----------------
    this.pulses = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(7, 6.4, 4.5), fog: false }), 4 * HL.length);
    this.pulses.frustumCulled = false; this.pulses.layers.set(NOINK); R.add(this.pulses);

    // ---------------- snowflakes ----------------
    this.flakeMat = new THREE.MeshBasicMaterial({ map: flakeTex(), transparent: true, depthWrite: true, alphaTest: 0.04, fog: false, side: THREE.DoubleSide, color: new THREE.Color(1.1, 1.12, 1.2) });
    const fg = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < NFLAKE; i++) { const m = new THREE.Mesh(fg, this.flakeMat); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 6; m.visible = false; this.flakes.push(m); R.add(m); }

    // ---------------- label ----------------
    this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(), transparent: true, depthWrite: true, alphaTest: 0.03, depthTest: true, depthFunc: THREE.AlwaysDepth, fog: false }));
    this.label.center.set(LBL_TIP[0] / LBL_W, 1 - LBL_TIP[1] / LBL_H);
    this.label.layers.set(NOINK); this.label.frustumCulled = false; this.label.renderOrder = 20; this.label.visible = false;
    R.add(this.label);
  }

  /** local skin height at (x,z) incl. the domes at time t */
  private heightAt(x: number, z: number, t: number) {
    let y = baseH(x, z);
    HL.forEach((h, i) => { const d = Math.hypot(x - h.x, z - h.z); if (d < DOME_R) y += domeH(i, t) * domeW(d); });
    return y;
  }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 2;
    if (!R.visible) return;
    if (DEBUG) this.debugCam(f, cam);
    const st = skinAt(2, t);

    // ---------- skin domes ----------
    const dh = HL.map((_, i) => domeH(i, t));
    const key = dh.map((v) => v.toFixed(4)).join(",");
    if (key !== this.lastKey) {
      this.lastKey = key;
      const P = this.sPos.array as Float32Array, Cc = this.sCol.array as Float32Array;
      for (const D of this.domeIdx) for (let k = 0; k < D.idx.length; k++) { const i = D.idx[k]; P[i * 3 + 1] = this.sBase[i]; Cc[i * 3] = this.cBase[i * 3]; Cc[i * 3 + 1] = this.cBase[i * 3 + 1]; Cc[i * 3 + 2] = this.cBase[i * 3 + 2]; }
      this.domeIdx.forEach((D, hi) => {
        if (dh[hi] < 1e-4) return;
        const k0 = Math.min(1, dh[hi] / DOME_H);
        for (let k = 0; k < D.idx.length; k++) {
          const i = D.idx[k], w = D.w[k], g = k0 * w;
          P[i * 3 + 1] += dh[hi] * w;
          Cc[i * 3] = lerp(Cc[i * 3], 1.0, 0.3 * g); Cc[i * 3 + 1] = lerp(Cc[i * 3 + 1], 0.7, 0.3 * g); Cc[i * 3 + 2] = lerp(Cc[i * 3 + 2], 0.66, 0.3 * g);
        }
      });
      this.sPos.needsUpdate = true; this.sCol.needsUpdate = true;
      this.surf.geometry.computeVertexNormals();
    }

    // ---------- shader state: nerve glow, pulses, cold, scary shadow ----------
    SKU.uNerveOn.value = st.nerve * (0.85 + 0.15 * Math.sin(t * 7));
    const ps = PULSE_T.map((t0) => (t >= t0 ? (t - t0) * PV : -99));
    for (let k = 0; k < 4; k++) SKU.uPulse.value[k] = ps[k];
    SKU.uCold.value = st.cold;
    const sw = clamp01((t - (W.scared - 0.35)) / 1.35);
    SKU.uScA.value = st.scared;
    SKU.uScC.value.set(lerp(-6.5, 4.5, sw), 2.3 + 0.5 * Math.sin(sw * 3));
    SKU.uScR.value = 0.12 * Math.sin(t * 2.3) - 0.15;
    this.armMat.emissive.setRGB(0.35 + 1.1 * st.nerve, 0.2 + 0.75 * st.nerve, 0.02);
    this.nPoreMat.emissive.setRGB(0.4 + 1.4 * st.nerve, 0.25 + 0.95 * st.nerve, 0.03);

    // ---------- hairs, muscles, hands ----------
    const hc = this.hairCol, tmpC = this.tc;
    HL.forEach((h, i) => {
      const th = hairTheta(i, t), e = 1 / 120;
      const acc = (hairTheta(i, t + e) - 2 * th + hairTheta(i, t - e)) / (e * e);
      const bend = 0.32 + THREE.MathUtils.clamp(0.0016 * acc, -0.6, 0.6); // intrinsic arc + whip
      const ry = h.ry + dh[i];
      const c = this.cBuf, r = this.rBuf, v = this.vBuf, ds = (1 - HS0) / HN;
      // start below the skin
      let x = h.x + Math.cos(th) * h.lx * HS0 * h.len, z = h.z + Math.cos(th) * h.lz * HS0 * h.len, y = ry + Math.sin(th) * HS0 * h.len - 0.05;
      const r0 = 0.23 * (h.len / 5);
      for (let k = 0; k <= HN; k++) {
        const s = HS0 + k * ds;
        c[k * 3] = x; c[k * 3 + 1] = y; c[k * 3 + 2] = z;
        r[k] = s > 0.93 ? r0 * 0.47 * Math.sqrt(Math.max(0, 1 - ((s - 0.93) / 0.07) ** 2)) : r0 * (1 - 0.57 * Math.max(0, s));
        v[k] = s * h.len;
        const phi = th - bend * Math.max(0, s);
        x += Math.cos(phi) * h.lx * ds * h.len; z += Math.cos(phi) * h.lz * ds * h.len; y += Math.sin(phi) * ds * h.len;
      }
      this.hairs[i].set(c, r, v, (k) => { const s = Math.max(0, HS0 + k * ds); return s < 0.5 ? tmpC.copy(hc[0]).lerp(hc[1], s * 2) : tmpC.copy(hc[1]).lerp(hc[2], (s - 0.5) * 1.6); });

      // ---------- this hair's muscle: anchor in the skin behind the root -> attach point on the shaft ----------
      const ka = Math.round((ATT_S - HS0) / ds);
      const atx = c[ka * 3], aty = c[ka * 3 + 1], atz = c[ka * 3 + 2];
      const Ax = h.ax, Ay = this.heightAt(h.ax, h.az, t) - 0.12, Az = h.az;
      const y1 = smooth((t - T_YANK1(i)) / 0.12), y2 = smooth((t - T_STAND(i) + 0.06) / 0.12);
      const jerk = 0.26 * bumpW(t - T_YANK1(i), 0.3) + 0.3 * bumpW(t - T_STAND(i) + 0.06, 0.32);
      const flex = clamp01(y1 * 0.8 + y2 * 0.35 - 0.15 * clamp01((t - T_STAND(i) - 0.6) / 0.6));
      const grip = 0.34 - 0.09 * y1 - 0.06 * y2;
      const mc = this.mc, mr = this.mr, mv = this.mv;
      const dx = atx - Ax, dy = aty - Ay, dz = atz - Az, Lm = Math.hypot(dx, dy, dz);
      const arch = 0.16 + 0.16 * flex;
      for (let k = 0; k <= MN; k++) {
        const u = k / MN;
        mc[k * 3] = Ax + dx * u; mc[k * 3 + 1] = Ay + dy * u + arch * 4 * u * (1 - u) - jerk * 0.8 * bumpW(u, 0.7); mc[k * 3 + 2] = Az + dz * u;
        const belly = Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.04)), 0.7);
        mr[k] = STRAP_R * (0.5 + 0.5 * belly) * (1 + 0.8 * flex * belly * belly) * (u > 0.985 ? 0.75 : 1);
        mv[k] = u * Lm;
      }
      this.muscles[i].set(mc, mr, mv, (k) => { const u = k / MN, ten = Math.max(smooth((0.13 - u) / 0.08), smooth((u - 0.87) / 0.08)); return tmpC.copy(this.mRed).lerp(this.mTendon, ten); });
      // glow: the hero on "muscle"; every muscle flashes with its yanks
      const hero = i === 0 ? st.muscle * (1 - 0.6 * st.nerve) * (0.55 + 0.35 * Math.sin(t * 9)) : 0;
      const yk = 0.55 * bumpW(t - T_YANK1(i), 0.5) + 0.55 * bumpW(t - T_STAND(i) + 0.06, 0.5) + 0.12 * st.nerve;
      this.muscleMats[i].emissive.setRGB(0.9 * (hero + yk), 0.12 * (hero + yk), 0.1 * (hero + yk));
      if (i === 0) {
        for (let k = 0; k <= MN; k++) this.hr[k] = mr[k] + 0.09;
        this.heroHalo.set(mc, this.hr, mv, () => tmpC.setRGB(1, 1, 1));
        this.haloMat.opacity = 0.55 * st.muscle * (1 - st.nerve) * (0.75 + 0.25 * Math.sin(t * 9));
        this.heroHalo.mesh.visible = this.haloMat.opacity > 0.003;
        // label: the arrow tip at the muscle belly
        const la = smooth((t - (W.muscle - 0.25)) / 0.25) * (1 - smooth((t - (W.nerves - 0.6)) / 0.3));
        this.label.visible = la > 0.003;
        if (this.label.visible) {
          const kb = Math.round(MN * 0.42);
          const dCam = cam.position.distanceTo(this.v2.set(mc[kb * 3], mc[kb * 3 + 1], mc[kb * 3 + 2]).add(R.position));
          const w = THREE.MathUtils.clamp(0.3 * dCam, 1.8, 3.4) * backOut(clamp01((t - (W.muscle - 0.25)) / 0.35), 2.0);
          // pulled 40 % of the way toward the lens along the ray through the arrow tip (same screen place + size), so
          // its depth sits in front of the hair lines behind it and the ink pass leaves the lettering clean
          this.v1.set(mc[kb * 3], mc[kb * 3 + 1] + mr[kb] + 0.12, mc[kb * 3 + 2]).add(R.position);
          this.v1.lerp(cam.position, 0.4).sub(R.position);
          this.label.position.copy(this.v1);
          this.label.scale.set(0.6 * w + 1e-4, (0.6 * w * LBL_H) / LBL_W + 1e-4, 1);
          (this.label.material as THREE.SpriteMaterial).opacity = la;
        }
      }
      // ---------- hand on the muscle at `grip` + arm down to its glowing pore ----------
      const kg = grip * MN, k0 = Math.floor(kg), k1 = Math.min(MN, k0 + 1), fu = kg - k0;
      const gx = lerp(mc[k0 * 3], mc[k1 * 3], fu), gy = lerp(mc[k0 * 3 + 1], mc[k1 * 3 + 1], fu) - jerk * 0.5, gz = lerp(mc[k0 * 3 + 2], mc[k1 * 3 + 2], fu);
      const sR = lerp(mr[k0], mr[k1], fu) / GRIP_R;
      this.bx.set(mc[k1 * 3] - mc[k0 * 3], mc[k1 * 3 + 1] - mc[k0 * 3 + 1], mc[k1 * 3 + 2] - mc[k0 * 3 + 2]).normalize();
      const by0 = this.heightAt(h.bx, h.bz, t) + 0.02;
      // the palm faces the arm base
      this.v2.set(h.bx - gx, by0 - gy, h.bz - gz); this.v2.addScaledVector(this.bx, -this.v2.dot(this.bx)).normalize();
      this.by.copy(this.v2).negate(); this.bz.crossVectors(this.bx, this.by).normalize();
      this.m4.makeBasis(this.bx, this.by, this.bz);
      this.m4.scale(this.v1.set(1, sR, sR)); this.m4.setPosition(gx, gy, gz);
      this.hands.setMatrixAt(i, this.m4);
      const cr = HAND_CUFF(GRIP_R) * sR;
      const cx = gx + this.v2.x * cr, cy = gy + this.v2.y * cr, cz = gz + this.v2.z * cr;
      const ax2 = h.bx - cx, ay2 = by0 - cy, az2 = h.bz - cz, La = Math.hypot(ax2, ay2, az2);
      this.q.setFromUnitVectors(this.v1.set(0, 1, 0), this.v2.set(-ax2 / La, -ay2 / La, -az2 / La));
      this.m4.compose(this.v1.set((h.bx + cx) / 2, (by0 + cy) / 2, (h.bz + cz) / 2), this.q, this.v2.set(1, La, 1));
      this.arms.setMatrixAt(i, this.m4);
      this.m4.compose(this.v1.set(h.bx, by0 - 0.03, h.bz), this.q.identity(), this.v2.set(1, 1, 1));
      this.nPores.setMatrixAt(i, this.m4);
      this.m4.compose(this.v1.set(h.x, ry - 0.035, h.z), this.q.identity(), this.v2.set(1, 1, 1));
      this.rings.setMatrixAt(i, this.m4);
      // the muscle's anchor pore (smaller ring where the strap dives into the skin)
      this.m4.compose(this.v1.set(Ax, Ay + 0.085, Az), this.q.identity(), this.v2.set(0.62, 0.8, 0.62));
      this.rings.setMatrixAt(HL.length + i, this.m4);
      // ---------- pulses along this hair's route, then up its arm ----------
      const route = NERVE.routes[i], end = route[route.length - 1][2];
      for (let k = 0; k < 4; k++) {
        const s = ps[k];
        let on = s > 0 && s < end + La;
        let px = 0, py = 0, pz = 0;
        if (on && s <= end) {
          let a = 0, b = route.length - 1;
          while (b - a > 1) { const m = (a + b) >> 1; if (route[m][2] < s) a = m; else b = m; }
          const u = (s - route[a][2]) / Math.max(1e-4, route[b][2] - route[a][2]);
          px = lerp(route[a][0], route[b][0], u); pz = lerp(route[a][1], route[b][1], u); py = baseH(px, pz) - 0.08;
          this.v2.set(route[b][0] - route[a][0], 0, route[b][1] - route[a][1]).normalize();
          if (px < -12 || pz < -16 || pz > 9) on = false;
        } else if (on) {
          const u = (s - end) / La;
          px = lerp(h.bx, cx, u); py = lerp(by0, cy, u); pz = lerp(h.bz, cz, u);
          this.v2.set(-ax2 / La, -ay2 / La, -az2 / La);
        }
        const sc = on ? 1 : 1e-4, thin = on && s > end ? 0.7 : 1;
        if (this.v2.lengthSq() < 0.5) this.v2.set(1, 0, 0);
        this.q.setFromUnitVectors(this.v1.set(1, 0, 0), this.v2);
        this.m4.compose(this.v1.set(px, py, pz), this.q, this.v2.set(1.3 * sc, 0.3 * sc * thin, 0.3 * sc * thin));
        this.pulses.setMatrixAt(k * HL.length + i, this.m4);
      }
    });
    for (const m of [this.hands, this.arms, this.rings, this.nPores, this.pulses]) m.instanceMatrix.needsUpdate = true;

    // ---------- snowflakes ----------
    const cold = st.cold;
    for (let i = 0; i < NFLAKE; i++) {
      const fl = this.flakes[i];
      fl.visible = cold > 0.003;
      if (!fl.visible) continue;
      const tt = t - (W.cold - 0.3);
      const sz = (0.7 + 1.1 * h1(i * 7 + 3)) * smooth(cold * 1.3 - 0.3 * h1(i));
      fl.position.set(-9 + 18 * h1(i * 11 + 1) + 1.6 * tt + 0.3 * Math.sin(tt * 1.7 + i), 5.0 + 4.5 * h1(i * 13 + 5) - 1.0 * tt, -8 + 10 * h1(i * 17 + 2)); // QA: lower + nearer so "cold" reads in the muscle close-up
      fl.quaternion.copy(cam.quaternion);
      fl.rotateZ(i + tt * (0.6 + 0.8 * h1(i * 3)) * (i % 2 ? 1 : -1));
      fl.scale.set(sz + 1e-4, sz + 1e-4, 1);
    }
    this.flakeMat.opacity = Math.min(1, cold * 1.5);
  }

  private debugCam(f: number, cam: THREE.PerspectiveCamera) {
    const K = SKIN_CAM_KEYS;
    let i = 0;
    while (i < K.length - 2 && f >= K[i + 1].f) i++;
    const A = K[i], B = K[i + 1], u = glide((f - A.f) / (B.f - A.f));
    cam.position.set(lerp(A.pos[0], B.pos[0], u), lerp(A.pos[1], B.pos[1], u), lerp(A.pos[2], B.pos[2], u));
    cam.up.set(0, 1, 0); cam.lookAt(lerp(A.look[0], B.look[0], u), lerp(A.look[1], B.look[1], u), lerp(A.look[2], B.look[2], u));
    cam.fov = lerp(A.fov, B.fov, u); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
}
