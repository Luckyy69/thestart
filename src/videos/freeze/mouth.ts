// OWNER: mouth. MOUTH (shot 2): INSIDE BEAN's mouth at giant scale, a warm glossy pink cave.
//   TONGUE floor (surface ~y 0, centre groove, papillae), x -3.2..3.2, from the tip at z +6.3 back to z -3, where it
//   rolls down into the dark THROAT. The PALATE vault (apex y 5.4) with transverse ridges (rugae) and a centre seam;
//   the soft palate + UVULA and the two throat ARCHES at z ~-4.4; behind them the cave bends UP into the dark nerve
//   TUNNEL toward the brain (a warm amber glow far up). U-shaped dental arches (upper teeth hang from a gum at y 4.15,
//   lower teeth stand on a gum at y -0.45; incisors at z 5.9, molars back to z ~0.4) inside the LIPS (z 7.0) with the
//   warm park light spilling in. Four red BLOOD VESSELS cross the palate (half-embedded pipes), a glowing yellow NERVE
//   roots in the palate behind the slab, sags across the cave (the ALARM BELL hangs at the sag) and climbs into the
//   tunnel. The ICE-CREAM SLAB (strawberry scoop, chocolate chips, a wafer-cone edge) flies in through the lips and
//   slams against the palate front-left.
// mouthAt(2,t) beats: slab (fly in, accelerating; squash-spring on impact at W.cold) | cold (frost spreads over the
//   palate from the impact: crystal-cell frost mask + 3D ice crystals, icy blue light, vapour wisps, flakes burst) |
//   squeeze (vessels pinch to x0.35 with a wobble, go dark) | blast (balloon to x1.8 with a springy overshoot, pulses
//   of blood throb along them) | nerve (cable glows, energy flows) | alarm (bell shakes + hammer + glow rings + red
//   flash light) | travel (a bright pulse + its light races along the cable up the tunnel).
//
// ===== CONTRACTS (LOCAL to MOUTH = (1000,0,0); exported values are WORLD) =====
//   Solid: tongue top y ~0.3 (|x| < 3, z 6..-3), walls/cheeks |x| ~4.4-4.9, roof y 5.4 (ridges hang 0.15 lower).
//   Teeth: upper tips y ~2.8, lower tips y ~0.7 (open gap at the incisors, z 5.9), lips ring at z 7.0 around
//   (0, 1.9) (opening rx 2.35, ry 1.9). The tunnel climbs from (0, 4.8, -7.1) to (0, 15, -9.9) (radius ~1.5).
//   CLEARANCE: inside the lips opening keep |x| < 1.2, y 1.2..2.6; inside the cave y 1.2..4.0, |x| < 2.5; keep 0.8 m
//   from the uvula (x 0, y 3.3..5.4, z ~-3.6) and the bell (BELL, radius 0.85 + hammer below).
//   SLAB_AT: the slab's resting centre; it flies in from z +10.8 through the lips (centre y ~1.8) during f 109-122.
//   VESSELS: centre of each vessel (they run across the palate in x). NERVE_PATH: root -> sag (bell) -> tunnel.
//   BELL: bell centre (dome faces +z). pulseAt(t): the travel pulse (world). MOUTH_CAM_KEYS: tested keys (WORLD).
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { ctex } from "../bridge/paint";
import { MOUTH, V3, W, FPS, mouthAt, smooth, clamp01, glide } from "./story";

const DEBUG = false; // TEMP: fly MOUTH_CAM_KEYS for stills (must be false when reporting)
const TAU = Math.PI * 2;

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
/** damped spring step response, zero start velocity */
const spr = (tau: number, z = 5.5, w = 13) => (tau <= 0 ? 0 : 1 - Math.exp(-z * tau) * (Math.cos(w * tau) + (z / w) * Math.sin(w * tau)));
const wl = (x: number, y: number, z: number): V3 => [MOUTH[0] + x, MOUTH[1] + y, MOUTH[2] + z];
const C = (h: string) => new THREE.Color(h);
/** piecewise smooth table lookup: rows [key, v1, v2, ...] */
const tab = (T: number[][], s: number, k: number) => {
  if (s <= T[0][0]) return T[0][k];
  for (let i = 0; i < T.length - 1; i++) if (s < T[i + 1][0]) return lerp(T[i][k], T[i + 1][k], smooth((s - T[i][0]) / (T[i + 1][0] - T[i][0])));
  return T[T.length - 1][k];
};
const catmull3 = (P: V3[], step: number): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / step));
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  out.push(P[P.length - 1].slice() as V3);
  return out;
};

// ============================== layout ==============================
const CY = 1.95; // cave centre height (straight part)
/** cave spine (front -> back, then up the tunnel) */
const SP_CP: V3[] = [[0, CY, 7.2], [0, CY, 3], [0, CY, -1], [0, 2.02, -3.6], [0, 2.85, -5.6], [0, 4.8, -7.1], [0, 7.6, -8.3], [0, 11, -9.2], [0, 15, -9.9]];
/** [s, half-width A, half-height B] along the spine (s = arc length from the lips) */
const AB = [[0, 2.35, 1.9], [0.5, 2.9, 2.35], [1.3, 3.85, 2.95], [2.8, 4.75, 3.35], [4.4, 5.15, 3.45], [9.6, 5.05, 3.45], [12.6, 3.9, 3.0], [14.8, 2.6, 2.3], [17, 1.75, 1.75], [30, 1.5, 1.5]];
const EX_UP = 2 / 2.5, EX_LO = 2 / 3.2;
type Ring = { p: THREE.Vector3; t: THREE.Vector3; u: THREE.Vector3; s: number; A: number; B: number };
const SPINE: Ring[] = (() => {
  const pts = catmull3(SP_CP, 0.075);
  const out: Ring[] = [];
  let s = 0;
  pts.forEach((q, i) => {
    if (i) s += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1], q[2] - pts[i - 1][2]);
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const t = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const u = new THREE.Vector3(0, -t.z, t.y).normalize();
    out.push({ p: new THREE.Vector3(...q), t, u, s, A: tab(AB, s, 1), B: tab(AB, s, 2) });
  });
  return out;
})();
const S_END = SPINE[SPINE.length - 1].s;
const spineAt = (s: number) => {
  let a = 0, b = SPINE.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (SPINE[m].s < s) a = m; else b = m; }
  const A = SPINE[a], B = SPINE[b], u = clamp01((s - A.s) / Math.max(1e-5, B.s - A.s));
  return { p: A.p.clone().lerp(B.p, u), u: A.u.clone().lerp(B.u, u).normalize(), t: A.t.clone().lerp(B.t, u).normalize(), A: lerp(A.A, B.A, u), B: lerp(A.B, B.B, u) };
};
/** palate ridges (rugae, transverse chevrons) + the centre seam: inward offset at local (x, z) */
const rugae = (x: number, z: number) => {
  const ax = Math.abs(x);
  const q = z + 0.34 * ax - 0.1 * Math.sin(2.1 * x + 0.6);
  const f = (((q / 0.88) % 1) + 1) % 1;
  const ridge = Math.exp(-(((f - 0.5) / 0.15) ** 2));
  const env = smooth((ax - 0.16) / 0.25) * (1 - smooth((ax - 2.7) / 0.9)) * smooth((z + 3.3) / 1.4) * (1 - smooth((z - 5.0) / 0.6));
  const raphe = 0.06 * Math.exp(-((x / 0.11) ** 2)) * smooth((z + 3.4) / 1.0) * (1 - smooth((z - 5.2) / 0.5));
  return 0.15 * ridge * env + raphe;
};
/** base roof height (no ridges) in the straight part at local (x, z) */
const roofY = (x: number, z: number) => {
  const s = 7.2 - z, A = tab(AB, s, 1), B = tab(AB, s, 2);
  const c = Math.pow(Math.min(0.999, Math.abs(x) / A), 1 / EX_UP), sn = Math.sqrt(Math.max(0, 1 - c * c));
  return CY + B * Math.pow(sn, EX_UP);
};
const roofN = (x: number, z: number, out: THREE.Vector3) => {
  const e = 0.02, fx = (roofY(x + e, z) - roofY(x - e, z)) / (2 * e), fz = (roofY(x, z + e) - roofY(x, z - e)) / (2 * e);
  return out.set(fx, -1, fz).normalize(); // inward (down)
};
// tongue
const TW = 3.15;
const tongueHW = (z: number) => (z > 1.8 ? TW * Math.sqrt(Math.max(0.012, 1 - ((z - 1.8) / 4.6) ** 2)) : TW - 0.35 * smooth((-z - 2.5) / 3));
const tongueY = (u: number, x: number, z: number) => {
  const au = Math.abs(u);
  let y = 0.62 * (1 - au ** 2.2) - 0.95 * smooth((au - 0.8) / 0.2);
  y -= 0.13 * Math.exp(-((x / 0.6) ** 2)) * smooth((4.9 - z) / 1.0) * smooth((z + 4.0) / 1.5);
  y -= 0.9 * smooth((z - 4.3) / 2.0);
  y -= 3.6 * smooth((-z - 2.6) / 4.0);
  y += 0.035 * vn(x * 0.9, z * 0.9);
  return y - 0.12;
};
// dental arches: a half circle (R, centre z ARCH_ZC) then straight back
const ARCH_R = 3.65, ARCH_ZC = 2.3, ARCH_STRAIGHT = 2.4;
const GUM_UP = 4.5, GUM_LO = -0.45;
/** point on the arch at arc length a from the front centre, side +1 (right, +x) / -1: position, outward normal */
const archAt = (a: number, side: number) => {
  const q = (Math.PI / 2) * ARCH_R;
  if (a <= q) { const p = a / ARCH_R; return { x: side * ARCH_R * Math.sin(p), z: ARCH_ZC + ARCH_R * Math.cos(p), ox: side * Math.sin(p), oz: Math.cos(p) }; }
  return { x: side * ARCH_R, z: ARCH_ZC - (a - q), ox: side, oz: 0 };
};
type ToothDef = { kind: 0 | 1 | 2; w: number; hl: number; hu: number; d: number };
const TEETH: ToothDef[] = [
  { kind: 0, w: 0.8, hl: 1.0, hu: 1.18, d: 0.42 }, { kind: 0, w: 0.68, hl: 0.96, hu: 1.04, d: 0.42 },
  { kind: 1, w: 0.72, hl: 1.06, hu: 1.16, d: 0.55 }, { kind: 2, w: 0.78, hl: 0.84, hu: 0.9, d: 0.8 },
  { kind: 2, w: 0.8, hl: 0.82, hu: 0.88, d: 0.85 }, { kind: 2, w: 1.06, hl: 0.76, hu: 0.82, d: 1.0 }, { kind: 2, w: 1.06, hl: 0.72, hu: 0.78, d: 1.0 },
];
// slab
const SLAB_R = 1.1, SLAB_DROP = SLAB_R * 0.86;
const SLAB_REST = new THREE.Vector3(-1.05, roofY(-1.05, 0.9) - 0.05, 0.9); // contact point on the roof
const SLAB_C0 = new THREE.Vector3(-1.05, SLAB_REST.y - SLAB_DROP, 0.9);
/** slab flight (contact point = centre + drop): a cubic from outside, through the teeth gap, up onto the roof */
const SLAB_P: V3[] = [[1.4, 3.3 + SLAB_DROP, 11.5], [0.3, 2.0 + SLAB_DROP, 7.5], [-0.3, 1.9 + SLAB_DROP, 4.0], [SLAB_REST.x, SLAB_REST.y, SLAB_REST.z]];
// vessels across the palate: [z0, wiggle phase, x-extent]
const VDEF: [number, number, number][] = [[2.1, 0.4, 3.3], [-0.45, 2.1, 3.5], [-1.65, 4.0, 3.5], [-2.75, 5.3, 3.3]];
const VR0 = 0.29;
/** where along each vessel (0..1) its face sits (visible right of the slab, left of the nerve) */
const FACE_U = [0.53, 0.58, 0.47, 0.55];
// nerve: palate root -> sag (bell) -> into the tunnel along its right side
const N_ROOT: V3 = [1.35, roofY(1.35, -0.95) - 0.05, -0.95];
const N_SAG: V3 = [1.85, 4.1, -2.5];
const NERVE_LOCAL: V3[] = (() => {
  const pts: V3[] = [N_ROOT, [1.75, 4.8, -1.45], N_SAG, [1.35, 4.3, -4.0]];
  for (let s = 13.2; s <= S_END - 1.2; s += 1.4) {
    const r = spineAt(s);
    const q = r.p.clone().addScaledVector(new THREE.Vector3(1, 0, 0), 0.5 * r.A).addScaledVector(r.u, -0.15 * r.B);
    pts.push([q.x, q.y, q.z]);
  }
  return catmull3(pts, 0.12);
})();
const N_S: number[] = (() => { const s = [0]; for (let i = 1; i < NERVE_LOCAL.length; i++) { const a = NERVE_LOCAL[i - 1], b = NERVE_LOCAL[i]; s.push(s[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); } return s; })();
const N_LEN = N_S[N_S.length - 1];
const nerveAt = (s: number): THREE.Vector3 => {
  let a = 0, b = N_S.length - 1;
  while (b - a > 1) { const m = (a + b) >> 1; if (N_S[m] < s) a = m; else b = m; }
  const u = clamp01((s - N_S[a]) / Math.max(1e-5, N_S[b] - N_S[a])), A = NERVE_LOCAL[a], B = NERVE_LOCAL[b];
  return new THREE.Vector3(lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u));
};
const BELL_R = 0.95;
const BELL_HANG = 0.62; // bracket length below the cable
const BELL_LOCAL = new THREE.Vector3(N_SAG[0], N_SAG[1] - 0.08 - BELL_HANG - 0.32, N_SAG[2] + 0.12);
const THROAT = new THREE.Vector3(0, 0.2, -5.2);
const LIP_Z = 7.0, LIP_CY = 1.9, LIP_RX = 2.35, LIP_RY = 1.9;

/** QA: the travel pulse as arc length along the cable at shot-2 time t (-99 = none). It leaves the palate root
 *  on "alarm" (f 312), accelerates past the bell, dives down the throat and shoots up the tunnel by f 342 (the
 *  story.ts RIDE camera chases it). The HQ pulse (hqAt.pulse) picks it up at f ~345. */
const P_F0 = 312, P_F1 = 342;
const pulseS = (t: number) => { const u = (t * FPS - P_F0) / (P_F1 - P_F0); return u <= 0 || u >= 1.15 ? -99 : N_LEN * Math.pow(u, 1.6); };
/** QA: the "nerve lights up" ignition front (arc length): a wave of light runs from the palate root up the cable */
const igniteS = (t: number) => { const u = clamp01((t - (W.nerve - 0.33)) / 0.65); return u <= 0 ? -1 : (N_LEN + 3) * Math.pow(u, 1.25) - 0.5; };

// ============================== exports ==============================
/** WORLD resting centre of the ice-cream slab (pressed on the palate) */
export const SLAB_AT: V3 = wl(SLAB_C0.x, SLAB_C0.y, SLAB_C0.z);
/** WORLD centre of each blood vessel (each runs across the palate along x, |x| <= ~3.4) */
export const VESSELS: V3[] = VDEF.map(([z0]) => { const y = roofY(0, z0); return wl(0, y - VR0 * 0.5, z0); });
/** WORLD nerve cable points: palate root -> sag (bell) -> up the tunnel (last point = deep in the tunnel) */
export const NERVE_PATH: V3[] = NERVE_LOCAL.filter((_, i) => i % 6 === 0 || i === NERVE_LOCAL.length - 1).map((p) => wl(p[0], p[1], p[2]));
/** WORLD alarm-bell centre (the dome faces +z, toward the lips) */
export const BELL: V3 = wl(BELL_LOCAL.x, BELL_LOCAL.y, BELL_LOCAL.z);
/** WORLD nerve pulse position for shot-2 time t (null before travel / after it left the cable) */
export const pulseAt = (t: number): V3 | null => {
  const s = pulseS(t);
  if (s <= 0 || s >= N_LEN) return null;
  const p = nerveAt(s);
  return wl(p.x, p.y, p.z);
};
type CamKey = { f: number; pos: V3; look: V3; fov: number };
/** recommended shot-2 camera keys (WORLD): dive through the lips -> LAND (cold hits) -> hold -> push to the bell -> ride
 *  the pulse up the tunnel (camera left of the cable) */
export const MOUTH_CAM_KEYS: CamKey[] = [
  { f: 112, pos: wl(0, 2.0, 11.0), look: wl(0, 2.4, 0), fov: 62 },
  { f: 142, pos: wl(0.0, 1.75, 8.3), look: wl(0, 3.0, -2.5), fov: 66 },
  { f: 270, pos: wl(0.0, 1.75, 8.0), look: wl(0.05, 3.05, -2.5), fov: 66 },
  { f: 292, pos: wl(0.6, 2.4, 3.4), look: wl(1.45, 3.35, -2.6), fov: 56 },
  { f: 318, pos: wl(0.6, 2.4, 3.2), look: wl(1.42, 3.35, -2.6), fov: 56 },
  { f: 334, pos: wl(0.3, 2.3, -2.9), look: wl(0.25, 3.3, -6.5), fov: 56 },
  { f: 352, pos: wl(0.2, 4.8, -6.7), look: wl(0.15, 9.5, -8.7), fov: 56 },
];

// ============================== shader patch ==============================
const MU = {
  uCold: { value: 0 }, uFrC: { value: new THREE.Vector3() }, uFrR: { value: 0 }, uT: { value: 0 },
  uNv: { value: 0 }, uNp: { value: -99 }, uNf: { value: -1 },
  uPLp: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLc: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLr: { value: [1, 1, 1, 1] },
};
const GLSL_COMMON = `
varying vec3 vMW;
uniform float uCold, uFrR, uT, uNv, uNp, uNf;
uniform vec3 uFrC;
uniform vec3 uPLp[4]; uniform vec3 uPLc[4]; uniform float uPLr[4];
float mH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 mH2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float mN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mH(i), mH(i + vec2(1.0, 0.0)), u.x), mix(mH(i + vec2(0.0, 1.0)), mH(i + vec2(1.0, 1.0)), u.x), u.y); }
float mFbm(vec2 p) { return 0.55 * mN(p) + 0.3 * mN(p * 2.1 + 3.1) + 0.15 * mN(p * 4.3 + 7.7); }
float frostMask() {
  if (uFrR < 0.01) return 0.0;
  float r = length(vMW - uFrC);
  float n = mFbm(vMW.xz * 1.1 + vec2(vMW.y * 0.7, 0.0));
  return 1.0 - smoothstep(uFrR - 0.22, uFrR + 0.04, r + (n - 0.5) * 1.5 * min(uFrR, 1.6));
}
float frostEdge = 0.0;
`;
const FROST_COLOR = `
{
  float fm = frostMask();
  if (fm > 0.0) {
    vec2 q = (vMW.xz + vec2(vMW.y * 0.55, -vMW.y * 0.35)) * 2.6;
    vec2 ip = floor(q), fp = fract(q); float d1 = 8.0, d2 = 8.0; vec2 id1 = ip;
    for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
      vec2 o = vec2(float(j), float(k)); vec2 r = o + mH2(ip + o) - fp; float dd = dot(r, r);
      if (dd < d1) { d2 = d1; d1 = dd; id1 = ip + o; } else if (dd < d2) { d2 = dd; }
    }
    float w = fwidth(q.x) * 0.9 + 0.01;
    float edge = 1.0 - smoothstep(0.03, 0.03 + w * 2.0, sqrt(d2) - sqrt(d1));
    float cv = mH(id1);
    vec3 ice = mix(vec3(0.42, 0.68, 1.0), vec3(0.72, 0.88, 1.0), cv);
    ice = mix(ice, vec3(1.0), edge * 0.9);
    diffuseColor.rgb = mix(diffuseColor.rgb, ice, fm * 0.88);
    frostEdge = edge * fm;
  }
  float halo = uCold * (1.0 - smoothstep(uFrR * 0.85, uFrR * 1.8 + 0.6, length(vMW - uFrC)));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.6, 0.78, 1.2) + vec3(0.0, 0.03, 0.09), 0.65 * halo * (1.0 - fm));
}
`;
type Kind = "shell" | "tongue" | "tooth" | "gum" | "vessel" | "nerve" | "slab" | "wafer" | "bell" | "plain" | "crystal";
type MO = { spec?: number; shin?: number; frost?: boolean; rim?: [number, number, number]; vc?: boolean; color?: string; emissive?: THREE.Color; flat?: boolean; side?: THREE.Side };
const mmat = (kind: Kind, o: MO = {}) => {
  const spec = o.spec ?? 0.3, shin = o.shin ?? 40, rim = o.rim ?? [0.32, 0.12, 0.12];
  const m = new THREE.MeshPhongMaterial({
    color: o.color ?? "#ffffff", vertexColors: o.vc ?? false, specular: new THREE.Color(spec, spec * 0.92, spec * 0.9), shininess: shin,
    emissive: o.emissive ?? new THREE.Color(0, 0, 0), flatShading: o.flat ?? false, side: o.side ?? THREE.FrontSide,
  });
  twoTone(m);
  const prev = m.onBeforeCompile;
  const uvK = kind === "nerve" || kind === "wafer" || kind === "vessel";
  const nvK = kind === "shell"; // QA: per-vertex (distance to the nerve cable, its arc length) for the nerve light
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, MU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMW;" + (uvK ? "\nvarying vec2 vMUv;" : "") + (nvK ? "\nattribute vec2 aNv;\nvarying vec2 vNv;" : ""))
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec4 mw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mw = instanceMatrix * mw;
        #endif
          vMW = (modelMatrix * mw).xyz; }` + (uvK ? "\nvMUv = uv;" : "") + (nvK ? "\nvNv = aNv;" : ""));
    let col = "";
    if (kind === "tongue") col = `{
      vec2 q = vMW.xz / 0.42; vec2 iq = floor(q), fq = fract(q); vec2 hq = mH2(iq);
      float fk = 1.0 - smoothstep(0.12, 0.35, fwidth(q.x));
      float pd = length(fq - 0.25 - 0.5 * hq), pr = 0.11 + 0.08 * hq.x;
      float pap = (1.0 - smoothstep(pr - 0.035, pr + 0.015, pd)) * step(0.18, hq.y);
      float ring = smoothstep(pr - 0.01, pr + 0.02, pd) * (1.0 - smoothstep(pr + 0.02, pr + 0.08, pd)) * step(0.18, hq.y);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.1, 0.98, 1.0) + vec3(0.09, 0.05, 0.06), pap * 0.85 * fk);
      diffuseColor.rgb *= 1.0 - 0.2 * ring * fk;
      vec2 q2 = vMW.xz / 0.11; vec2 h2 = mH2(floor(q2));
      float fk2 = 1.0 - smoothstep(0.12, 0.35, fwidth(q2.x));
      diffuseColor.rgb *= 1.0 - 0.07 * fk2 * (1.0 - smoothstep(0.1, 0.3, length(fract(q2) - 0.5 - 0.3 * (h2 - 0.5))));
    }`;
    if (kind === "shell") col = `{
      float vv = abs(mFbm(vMW.xz * 0.55 + vec2(vMW.y * 0.8, 1.7)) - 0.5);
      float vw = fwidth(vv) + 0.004;
      float vein = 1.0 - smoothstep(0.008, 0.008 + vw * 1.5, vv);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.86, 0.55, 0.62), 0.45 * vein);
    }`;
    if (kind === "wafer") col = `{
      vec2 g = vMUv * vec2(14.0, 6.0);
      vec2 a = abs(fract(g) - 0.5);
      float w = fwidth(g.x) + 0.02;
      float ln = 1.0 - smoothstep(0.06, 0.06 + w * 1.5, min(a.x, a.y));
      diffuseColor.rgb *= 1.0 - 0.32 * ln;
      diffuseColor.rgb *= 1.0 + 0.1 * (1.0 - smoothstep(0.1, 0.4, max(a.x, a.y)));
    }`;
    if (kind === "vessel") col = `{
      float st = abs(sin(vMUv.y * 6.0 + 0.6 * sin(vMUv.x * 6.2832)));
      diffuseColor.rgb *= 1.0 - 0.1 * smoothstep(0.85, 0.98, st);
    }`;
    if (kind === "nerve") col = `{
      float st = abs(sin(vMUv.x * 3.14159 * 5.0 + vMUv.y * 1.6));
      diffuseColor.rgb *= 1.0 - 0.18 * smoothstep(0.75, 0.97, st);
    }`;
    const frost = o.frost ? FROST_COLOR : "";
    let emit = "";
    if (o.frost) emit += `totalEmissiveRadiance += vec3(0.14, 0.4, 0.95) * (0.42 * frostMask() + 1.1 * frostEdge) * uCold;\n`;
    if (kind === "nerve") emit += `{
      float s = vMUv.y;
      float flow = 0.5 + 0.5 * sin(s * 4.0 - uT * 13.0);
      float p = exp(-pow((s - uNp) / 0.8, 2.0));
      float lit = uNv * (1.0 - smoothstep(uNf - 0.4, uNf + 0.4, s));
      float edge = uNf > -0.5 ? exp(-pow((s - uNf) / 0.55, 2.0)) : 0.0;
      vec3 Y = vec3(1.0, 0.6, 0.06);
      totalEmissiveRadiance += Y * (0.04 + lit * (1.0 + 0.6 * flow)) + vec3(1.0, 0.9, 0.6) * (p * 5.0 + edge * 3.5);
    }\n`;
    if (nvK) emit += `{
      float d = vNv.x, s = vNv.y;
      float lit = uNv * (1.0 - smoothstep(uNf - 0.6, uNf + 0.6, s));
      float pg = exp(-pow((s - uNp) / 1.6, 2.0));
      float ring = pow(0.5 + 0.5 * cos(s * 3.927), 10.0) * smoothstep(7.0, 9.5, s);
      vec3 L = vec3(1.0, 0.72, 0.28) * (lit * 0.7 * exp(-d / 0.9) + pg * 3.2 * exp(-d / 1.7));
      L += vec3(1.0, 0.62, 0.3) * ring * (0.6 * lit + 3.0 * exp(-pow((s - uNp) / 3.5, 2.0))) * exp(-d / 2.8);
      totalEmissiveRadiance += diffuseColor.rgb * L * 1.6;
    }\n`;
    if (kind === "crystal") emit += `totalEmissiveRadiance += vec3(0.25, 0.5, 0.95) * 0.55 * uCold;\n`;
    const lights = `
    {
      vec3 Nv = normalize(normal); vec3 Vv = normalize(vViewPosition); vec3 Pv = -vViewPosition;
      vec3 acc = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 Lp = (viewMatrix * vec4(uPLp[k], 1.0)).xyz - Pv; float d = length(Lp); vec3 L = Lp / max(d, 1e-3);
        float a = 1.0 / (1.0 + d * d / (uPLr[k] * uPLr[k])); a *= a;
        float wr = max(dot(Nv, L) * 0.7 + 0.3, 0.0);
        float sp = pow(max(dot(Nv, normalize(L + Vv)), 0.0), ${shin.toFixed(1)}) * ${(spec * 2.2).toFixed(3)};
        acc += uPLc[k] * a * (diffuseColor.rgb * wr + sp);
      }
      float fr = pow(1.0 - saturate(dot(Nv, Vv)), 2.6);
      acc += vec3(${rim.map((v) => v.toFixed(3)).join(", ")}) * diffuseColor.rgb * 2.0 * fr;
      totalEmissiveRadiance += acc;
      ${emit}
    }`;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_COMMON + (uvK ? "varying vec2 vMUv;\n" : "") + (nvK ? "varying vec2 vNv;\n" : ""))
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + col + frost)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + lights);
  };
  m.customProgramCacheKey = () => "fzMouth3_" + kind + (o.frost ? "F" : "") + shin + "_" + spec + "_" + rim.join(",");
  return m;
};

// ============================== textures ==============================
const softTex = () => ctex("fzMouthSoft", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const wispTex = () => ctex("fzMouthWisp", 512, 256, (g) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 40 + 20 * Math.sin(i * 2.1), y = 128 + 30 * Math.sin(i * 1.3), r = 60 + 25 * Math.sin(i * 3.7);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,255,255,0.42)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  }
});
const ringTex = () => ctex("fzMouthRing", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.lineWidth = 30; g.strokeStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(256, 256, 200, 0, TAU); g.stroke();
  g.lineWidth = 14; g.strokeStyle = "rgba(255,255,255,1)"; g.beginPath(); g.arc(256, 256, 200, 0, TAU); g.stroke();
  g.lineCap = "round"; g.lineWidth = 16;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU + 0.2;
    g.beginPath(); g.moveTo(256 + Math.cos(a) * 225, 256 + Math.sin(a) * 225); g.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250); g.stroke();
  }
});
const flakeTex = () => ctex("fzMouthFlake", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  g.translate(128, 128);
  const arm = (w: number, col: string) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round";
    for (let k = 0; k < 6; k++) {
      g.save(); g.rotate((k * TAU) / 6);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -105);
      for (const [d, l] of [[40, 31], [69, 24], [90, 15]] as [number, number][]) { g.moveTo(0, -d); g.lineTo(-l * 0.8, -d - l * 0.75); g.moveTo(0, -d); g.lineTo(l * 0.8, -d - l * 0.75); }
      g.stroke(); g.restore();
    }
  };
  arm(20, "#1a1430"); arm(11, "#d6ecff"); arm(4.5, "#ffffff");
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0, 0, 13, 0, TAU); g.fill();
});

/** little vessel faces: 0 = calm, 1 = scared (squeeze), 2 = boing (blast) */
const faceTex = (k: number) => ctex("fzMouthFace" + k, 256, 192, (g) => {
  g.clearRect(0, 0, 256, 192);
  const ink = "#1c0810";
  g.lineJoin = "round"; g.lineCap = "round";
  const eye = (x: number, y: number, rx: number, ry: number, pr: number, px: number, py: number) => {
    g.fillStyle = "#ffffff"; g.strokeStyle = ink; g.lineWidth = 9;
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = ink; g.beginPath(); g.arc(x + px, y + py, pr, 0, TAU); g.fill();
    if (pr > 9) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x + px - pr * 0.35, y + py - pr * 0.38, pr * 0.3, 0, TAU); g.fill(); }
  };
  if (k === 0) {
    eye(88, 82, 30, 38, 14, 3, 6); eye(168, 82, 30, 38, 14, -3, 6);
    g.strokeStyle = ink; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 22, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
  } else if (k === 1) {
    eye(84, 86, 38, 48, 7, 0, 0); eye(172, 86, 38, 48, 7, 0, 0);
    g.strokeStyle = ink; g.lineWidth = 8;
    g.beginPath(); g.moveTo(52, 26); g.lineTo(104, 38); g.stroke(); g.beginPath(); g.moveTo(204, 26); g.lineTo(152, 38); g.stroke();
    g.beginPath(); g.moveTo(100, 160); for (let i = 1; i <= 6; i++) g.lineTo(100 + i * 9.3, 160 + (i % 2 ? -8 : 8)); g.stroke();
    g.fillStyle = "#bfe6ff"; g.strokeStyle = ink; g.lineWidth = 5;
    g.beginPath(); g.moveTo(232, 40); g.quadraticCurveTo(246, 66, 232, 72); g.quadraticCurveTo(218, 66, 232, 40); g.fill(); g.stroke();
  } else {
    eye(84, 78, 40, 44, 20, 0, 2); eye(172, 78, 40, 44, 20, 0, 2);
    g.fillStyle = "#5a0a1c"; g.strokeStyle = ink; g.lineWidth = 8;
    g.beginPath(); g.ellipse(128, 150, 26, 22, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "#ff7a8c"; g.beginPath(); g.ellipse(128, 160, 14, 8, 0, 0, TAU); g.fill();
  }
});

// ============================== tubes ==============================
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
  set(c: ArrayLike<number>, r: ArrayLike<number>, v: ArrayLike<number>, col: (i: number) => THREE.Color) {
    const { ns, na } = this, P = this.pos.array as Float32Array, Nn = this.nrm.array as Float32Array, U = this.uv.array as Float32Array, Cc = this.col.array as Float32Array;
    for (let i = 0; i <= ns; i++) {
      const a = Math.max(0, i - 1), b = Math.min(ns, i + 1);
      this.T[i].set(c[b * 3] - c[a * 3], c[b * 3 + 1] - c[a * 3 + 1], c[b * 3 + 2] - c[a * 3 + 2]).normalize();
    }
    const t0 = this.T[0];
    this.N.set(0, 1, 0); if (Math.abs(t0.y) > 0.9) this.N.set(1, 0, 0);
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
/** static tube through points (local), radius function of u = 0..1 */
const staticTube = (pts: V3[], rad: (u: number) => number, na: number, mat: THREE.Material, col: (u: number) => THREE.Color, vScale = 1) => {
  const ns = pts.length - 1, t = new Tube(ns, na, mat);
  const c = new Float32Array((ns + 1) * 3), r = new Float32Array(ns + 1), v = new Float32Array(ns + 1);
  let s = 0;
  pts.forEach((p, i) => { c[i * 3] = p[0]; c[i * 3 + 1] = p[1]; c[i * 3 + 2] = p[2]; r[i] = rad(i / ns); if (i) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]); v[i] = s * vScale; });
  t.set(c, r, v, (i) => col(i / ns));
  return t;
};

// ============================== geometry builders ==============================
/** rounded-box unit tooth: x tangential, y gum (0) -> tip (1), z radial out; kind 0 incisor, 1 canine, 2 molar */
const toothGeo = (kind: 0 | 1 | 2) => {
  const g = new THREE.SphereGeometry(1, 30, 22);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = kind === 2 ? 3.2 : 3.6, m = Math.pow(Math.abs(x) ** n + Math.abs(y) ** n + Math.abs(z) ** n, 1 / n);
    x /= m; y /= m; z /= m;
    const v = (y + 1) / 2; // 0 gum .. 1 tip
    let X = x * 0.5, Y = v * 1.2 - 0.2, Z = z * 0.5;
    if (kind === 0) { X *= 0.84 + 0.2 * v; Z *= 1 - 0.45 * v * v; Z += 0.06 * (1 - x * x) * v; }
    if (kind === 1) { const k = smooth((v - 0.45) / 0.55); X *= 1 - 0.62 * k; Z *= 1 - 0.55 * k; Y += 0.12 * k * (1 - Math.abs(x)); }
    if (kind === 2) { X *= 0.96 + 0.06 * v; Z *= 0.96 + 0.06 * v; if (v > 0.78) Y += 0.09 * Math.cos(x * Math.PI) * Math.cos(z * Math.PI) * smooth((v - 0.78) / 0.2) - 0.05; }
    p.setXYZ(i, X, Y, Z);
  }
  g.computeVertexNormals();
  return g;
};
/** lumpy strawberry scoop (unit radius, flattened on top), vertex colours */
const scoopGeo = () => {
  const g = new THREE.SphereGeometry(1, 64, 44);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = p.count;
  const col = new Float32Array(n * 3), tc = new THREE.Color(), a = C("#ff8fb0"), b = C("#ffb6cb"), d = C("#f0709a"), fleck = C("#d63a5e");
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x), ph = Math.acos(THREE.MathUtils.clamp(y, -1, 1));
    let r = 1 + 0.06 * vn(Math.cos(th) * 1.6 + 3, Math.sin(th) * 1.6 + ph * 1.8) + 0.012 * Math.sin(ph * 16 + Math.sin(th * 2) * 1.5);
    r += 0.12 * Math.exp(-(((y + 0.3) / 0.11) ** 2)) * (1 + 0.35 * Math.sin(th * 5 + 1)); // the scooped rolled lip
    p.setXYZ(i, x * r, Math.min(y * r, 0.9), z * r);
    tc.copy(a).lerp(b, clamp01(0.5 + 0.6 * vn(Math.cos(th) * 1.5 + 5, Math.sin(th) * 1.5 + ph * 2))).lerp(d, clamp01(0.5 * vn(Math.cos(th) * 3, Math.sin(th) * 3 + ph * 3 + 2)));
    const fk = vn(Math.cos(th) * 4 + 11, Math.sin(th) * 4 + ph * 4);
    tc.lerp(fleck, 0.8 * smooth((fk - 0.5) / 0.08));
    col[i * 3] = tc.r; col[i * 3 + 1] = tc.g; col[i * 3 + 2] = tc.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
};

// ============================== Mouth ==============================
const NTRAIL = 7;
const NCRYS = 90, NWISP = 10, NFLAKE = 10, NRING = 3, NCHIP = 13;
export class Mouth {
  root = new THREE.Group();
  private vessels: Tube[] = []; private vesselMat: THREE.MeshPhongMaterial;
  private vc: Float32Array[] = []; private vr: Float32Array[] = []; private vv: Float32Array[] = []; private vBase: { p: THREE.Vector3[]; n: THREE.Vector3[]; u: number[] }[] = [];
  private slab = new THREE.Group(); private slabBody = new THREE.Group();
  private crys: THREE.InstancedMesh; private crysDef: { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3; d: number }[] = [];
  private nerveMat: THREE.MeshPhongMaterial; private dendMat: THREE.MeshPhongMaterial;
  private bell = new THREE.Group(); private bellDome = new THREE.Group(); private hammer = new THREE.Group(); private bellMat: THREE.MeshPhongMaterial;
  private wisps: THREE.Sprite[] = []; private flakes: THREE.Sprite[] = []; private rings: THREE.Sprite[] = [];
  private trail: THREE.Sprite[] = []; private flare: THREE.Sprite; private bellGlow: THREE.Sprite; private slamFlash: THREE.Sprite;
  private faces: THREE.Sprite[] = []; private faceMaps: THREE.Texture[] = [];
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3();
  private tc = new THREE.Color();

  constructor() {
    const R = this.root;
    R.position.set(...MOUTH);
    R.visible = false;
    const add = (o: THREE.Object3D, cast = false, recv = true) => { o.frustumCulled = false; o.castShadow = cast; o.receiveShadow = recv; R.add(o); return o; };

    // ---------------- cave shell (lips -> cave -> throat -> nerve tunnel) ----------------
    {
      const NA = 132, rings = SPINE, nr = rings.length;
      const pos = new Float32Array(nr * (NA + 1) * 3), col = new Float32Array(nr * (NA + 1) * 3);
      const tc = new THREE.Color(), X = new THREE.Vector3(1, 0, 0), q = new THREE.Vector3(), o = new THREE.Vector3();
      const cheek = C("#d4506c"), pal = C("#f28597"), ridgeC = C("#ffc3cb"), soft = C("#e65e78"), lip = C("#e2486a"), dark = C("#3a0716"), tun = C("#9a2440"), tun2 = C("#5e1228"), bot = C("#701a32");
      rings.forEach((rg, i) => {
        for (let j = 0; j <= NA; j++) {
          const th = -Math.PI / 2 + (j / NA) * TAU, c = Math.cos(th), sn = Math.sin(th), ex = sn > 0 ? EX_UP : EX_LO;
          const px = rg.A * Math.sign(c) * Math.abs(c) ** ex, py = rg.B * Math.sign(sn) * Math.abs(sn) ** ex;
          q.copy(rg.p).addScaledVector(X, px).addScaledVector(rg.u, py);
          let rgv = 0;
          if (rg.s > 0.9 && rg.s < 10.8 && sn > 0.2) {
            rgv = rugae(q.x, q.z) * smooth((sn - 0.2) / 0.35);
            o.copy(q).sub(rg.p).normalize();
            q.addScaledVector(o, -rgv);
          }
          const und = 0.06 * vn(q.x * 0.5 + rg.s * 0.3, q.y * 0.5 + 3.3); // gentle organic undulation
          o.copy(q).sub(rg.p).normalize(); q.addScaledVector(o, und);
          const k = (i * (NA + 1) + j) * 3;
          pos[k] = q.x; pos[k + 1] = q.y; pos[k + 2] = q.z;
          const roof = smooth((sn - 0.1) / 0.55);
          tc.copy(cheek).lerp(pal, roof);
          tc.lerp(soft, smooth((rg.s - 9.6) / 1.8) * roof);
          tc.lerp(ridgeC, clamp01(rgv / 0.15) * 0.75);
          tc.multiplyScalar(1 + 0.06 * vn(q.x * 0.8 + 7, q.z * 0.8));
          if (sn < -0.25) tc.lerp(bot, smooth((-sn - 0.25) / 0.4));
          tc.lerp(lip, 1 - smooth((rg.s - 0.2) / 0.8));
          if (rg.s > 13.5) tc.lerp(tun, smooth((rg.s - 13.5) / 2)).lerp(tun2, smooth((rg.s - 16) / 6));
          if (rg.s > 14) tc.multiplyScalar(1 + 0.22 * smooth((rg.s - 14) / 2) * Math.cos((rg.s * TAU) / 1.1)); // QA: tunnel ribs (speed read on the ride)
          const dT = q.distanceTo(THROAT);
          tc.lerp(dark, (0.5 * (1 - smooth((dT - 0.8) / 2.8)) + 0.48 * (1 - smooth((dT - 1.5) / 0.35))) * (1 - smooth((rg.s - 15) / 2)));
          col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b;
        }
      });
      const idx: number[] = [];
      for (let i = 0; i < nr - 1; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      { // QA: distance to the nerve cable + the arc length of its nearest point (the cable lights the walls around it)
        const nv = new Float32Array((pos.length / 3) * 2), NL = NERVE_LOCAL, nn = NL.length;
        for (let v = 0; v < pos.length / 3; v++) {
          const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
          let bd = 1e9, bi = 0;
          for (let i = 0; i < nn; i += 2) { const d = (NL[i][0] - x) ** 2 + (NL[i][1] - y) ** 2 + (NL[i][2] - z) ** 2; if (d < bd) { bd = d; bi = i; } }
          nv[v * 2] = Math.max(0, Math.sqrt(bd) - 0.17); nv[v * 2 + 1] = N_S[bi];
        }
        g.setAttribute("aNv", new THREE.BufferAttribute(nv, 2));
      }
      g.setIndex(idx); g.computeVertexNormals();
      // the normals must face the spine (inward)
      const nA = g.getAttribute("normal") as THREE.BufferAttribute, ri = Math.floor(nr * 0.3), r0 = rings[ri], k0 = ri * (NA + 1) + Math.floor(NA * 0.75);
      const inward = new THREE.Vector3(pos[k0 * 3], pos[k0 * 3 + 1], pos[k0 * 3 + 2]).sub(r0.p).negate().dot(new THREE.Vector3(nA.getX(k0), nA.getY(k0), nA.getZ(k0)));
      if (inward < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
      add(new THREE.Mesh(g, mmat("shell", { vc: true, spec: 0.32, shin: 34, frost: true, rim: [0.36, 0.12, 0.14] })), false, true);
      // glowing far end of the tunnel (toward the brain: warm amber)
      const e = spineAt(S_END - 0.3);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(e.A * 1.3, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 3.4, 1.3), fog: false }));
      disc.position.copy(e.p); disc.lookAt(e.p.clone().sub(e.t)); disc.layers.set(NOINK);
      add(disc, false, false);
    }

    // ---------------- tongue ----------------
    {
      const NU = 96, NZ = 190, z0 = 6.35, z1 = -7.4;
      const pos = new Float32Array((NU + 1) * (NZ + 1) * 3), col = new Float32Array((NU + 1) * (NZ + 1) * 3);
      const tc = new THREE.Color(), base = C("#f0698a"), mid = C("#ff8fa8"), edge = C("#c84466"), back = C("#a83458"), deep = C("#3e0a1c");
      for (let r = 0; r <= NZ; r++) for (let c = 0; c <= NU; c++) {
        const z = lerp(z0, z1, r / NZ), u = -1 + (2 * c) / NU, x = u * tongueHW(z) * (1 + 0.04 * Math.abs(u)), y = tongueY(u, x, z);
        const k = (r * (NU + 1) + c) * 3;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        tc.copy(base).lerp(mid, (1 - Math.abs(u)) ** 1.5 * 0.7).lerp(edge, smooth((Math.abs(u) - 0.7) / 0.3));
        tc.multiplyScalar(1 + 0.07 * vn(x * 0.7, z * 0.7 + 4));
        tc.lerp(back, smooth((-z - 1.5) / 2.5)).lerp(deep, smooth((-z - 3.8) / 2.2));
        col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b;
      }
      const idx: number[] = [];
      for (let r = 0; r < NZ; r++) for (let c = 0; c < NU; c++) { const a = r * (NU + 1) + c, b = a + 1, d = a + NU + 1, e = d + 1; idx.push(a, b, d, b, e, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.setIndex(idx); g.computeVertexNormals();
      const nA = g.getAttribute("normal") as THREE.BufferAttribute;
      if (nA.getY(Math.floor(NZ / 2) * (NU + 1) + NU / 2) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
      add(new THREE.Mesh(g, mmat("tongue", { vc: true, spec: 0.5, shin: 55, rim: [0.34, 0.1, 0.14] })), false, true);
    }

    // ---------------- gums, teeth, lips, face ----------------
    {
      const gumMat = mmat("gum", { vc: true, spec: 0.42, shin: 50, rim: [0.36, 0.12, 0.14] });
      const total = (Math.PI / 2) * ARCH_R + ARCH_STRAIGHT + 2.6;
      for (const up of [true, false]) {
        const pts: V3[] = [];
        for (let k = 0; k <= 120; k++) { const a = -total + (2 * total * k) / 120, A = archAt(Math.abs(a), a < 0 ? -1 : 1); pts.push([A.x, (up ? GUM_UP : GUM_LO) + (up ? 0.05 : -0.05) * Math.abs(a) / total, A.z]); }
        const gc = C(up ? "#ff93a8" : "#ff8aa2");
        R.add(staticTube(pts, (u) => 0.56 * (0.2 + 0.8 * smooth(Math.min(u, 1 - u) / 0.06)) + 0.01, 18, gumMat, () => gc).mesh);
      }
      const tMat = mmat("tooth", { color: "#fff8ea", spec: 0.7, shin: 90, rim: [0.2, 0.14, 0.14] });
      const geos = [toothGeo(0), toothGeo(1), toothGeo(2)];
      const lists: THREE.Matrix4[][] = [[], [], []];
      const bx = new THREE.Vector3(), by = new THREE.Vector3(), bz = new THREE.Vector3(), m = new THREE.Matrix4();
      for (const up of [true, false]) for (const side of [1, -1]) {
        let a = 0.035;
        TEETH.forEach((T, i) => {
          const A = archAt(a + T.w / 2, side);
          by.set(0, up ? -1 : 1, 0); bz.set(A.ox, 0, A.oz).normalize(); bx.crossVectors(by, bz);
          const h = (up ? T.hu : T.hl) * (1 + 0.04 * (h1(i * 7 + (up ? 3 : 1) + side) - 0.5));
          m.makeBasis(bx.clone().multiplyScalar(T.w), by.clone().multiplyScalar(h), bz.clone().multiplyScalar(T.d));
          m.setPosition(A.x, up ? GUM_UP - 0.18 : GUM_LO + 0.18, A.z);
          lists[T.kind].push(m.clone());
          a += T.w + 0.055;
        });
      }
      lists.forEach((L, k) => {
        const im = new THREE.InstancedMesh(geos[k], tMat, L.length);
        L.forEach((mm, i) => im.setMatrixAt(i, mm));
        add(im, false, true);
      });
      // lips: a plump ring around the opening (lower lip fuller)
      const lp: V3[] = [];
      for (let k = 0; k <= 96; k++) { const a = (k / 96) * TAU; lp.push([LIP_RX * Math.cos(a), LIP_CY + LIP_RY * Math.sin(a), LIP_Z + 0.08 * Math.cos(2 * a)]); }
      R.add(staticTube(lp, (u) => { const a = u * TAU, s = Math.sin(a); return 0.52 + (s < 0 ? 0.2 * -s : 0.05 * s) - 0.12 * Math.cos(a) ** 8; }, 20, mmat("gum", { vc: true, spec: 0.55, shin: 60, rim: [0.36, 0.12, 0.14] }), () => C("#ea4f6f")).mesh);
      // face skin around the lips (seen in the dive)
      const fg = new THREE.RingGeometry(1, 13, 72, 1);
      fg.scale(LIP_RX + 0.35, LIP_RY + 0.35, 1);
      const face = new THREE.Mesh(fg, mmat("plain", { color: "#ffbf96", spec: 0.12, shin: 20, rim: [0.3, 0.12, 0.1] }));
      face.position.set(0, LIP_CY, LIP_Z + 0.32);
      add(face, false, false);
    }

    // ---------------- uvula + throat arches ----------------
    {
      const soft = mmat("gum", { vc: true, spec: 0.45, shin: 50, rim: [0.36, 0.12, 0.14] });
      const top = spineAt(11.4), topY = top.p.y + top.B * 0.97;
      const pts: V3[] = [];
      for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push([0.04 * Math.sin(u * 3), topY + 0.4 - u * 2.05, top.p.z - 0.15 * u]); }
      const uc0 = C("#f26a86"), uc1 = C("#ff9db2");
      R.add(staticTube(pts, (u) => (u < 0.78 ? 0.42 + 0.14 * u * u : 0.53 * Math.sqrt(Math.max(0, 1 - ((u - 0.78) / 0.22) ** 2))) + 0.002, 20, soft, (u) => uc0.clone().lerp(uc1, u * 0.6)).mesh);
      for (const side of [1, -1]) for (const [dz, rr] of [[0, 0.62], [-1.1, 0.5]] as [number, number][]) {
        const ap: V3[] = [];
        for (let k = 0; k <= 40; k++) {
          const u = k / 40, x = side * lerp(0.75, 3.7, Math.sin((u * Math.PI) / 2)), y = lerp(topY + 0.45, -0.4, u * u), z = top.p.z + dz + 0.5 * u;
          ap.push([x, y, z]);
        }
        const ac = C(dz ? "#e05a78" : "#ff7f98");
        R.add(staticTube(ap, (u) => rr * (0.7 + 0.3 * Math.sin(Math.PI * u) + 0.5 * smooth((u - 0.75) / 0.25)) + 0.002, 20, soft, () => ac).mesh);
      }
    }

    // ---------------- blood vessels (dynamic) ----------------
    this.vesselMat = mmat("vessel", { vc: true, spec: 0.75, shin: 70, rim: [0.4, 0.06, 0.08], emissive: new THREE.Color(0, 0, 0) });
    VDEF.forEach(([z0, ph, xe]) => {
      const NS = 64, P: THREE.Vector3[] = [], Nn: THREE.Vector3[] = [], U: number[] = [];
      for (let k = 0; k <= NS; k++) {
        const u = k / NS, x = lerp(-xe, xe, u), z = z0 + 0.28 * Math.sin(1.2 * x + ph) + 0.1 * Math.sin(3.1 * x + ph * 2);
        P.push(new THREE.Vector3(x, roofY(x, z), z)); Nn.push(roofN(x, z, new THREE.Vector3())); U.push(u);
      }
      this.vBase.push({ p: P, n: Nn, u: U });
      this.vc.push(new Float32Array((NS + 1) * 3)); this.vr.push(new Float32Array(NS + 1)); this.vv.push(new Float32Array(NS + 1));
      const t = new Tube(NS, 18, this.vesselMat); this.vessels.push(t); R.add(t.mesh);
    });

    // ---------------- nerve (static cable + dendrite roots in the palate) ----------------
    this.nerveMat = mmat("nerve", { color: "#e8b43a", spec: 0.5, shin: 50, rim: [0.3, 0.2, 0.05] });
    { const nm = staticTube(NERVE_LOCAL, (u) => 0.17 * (u < 0.02 ? 0.6 + 20 * u : 1) * (1 - 0.15 * smooth((u - 0.7) / 0.3)), 16, this.nerveMat, () => C("#ffffff")).mesh; nm.castShadow = false; R.add(nm); }
    { // QA: a soft additive glow sheath around the cable (NOINK): it lights up with the ignition wave and the pulse
      const hm = new THREE.ShaderMaterial({
        uniforms: { uNv: MU.uNv, uNp: MU.uNp, uNf: MU.uNf, uT: MU.uT },
        vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying float vS; varying float vD;
          void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = cameraPosition - w.xyz;
            vS = uv.y; vD = length(vV); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `uniform float uNv, uNp, uNf, uT; varying vec3 vN; varying vec3 vV; varying float vS; varying float vD;
          void main(){
            float c = abs(dot(normalize(vN), normalize(vV)));
            float a = pow(c, 2.2) * smoothstep(0.25, 1.1, vS) * smoothstep(0.5, 1.6, vD);
            float lit = uNv * (1.0 - smoothstep(uNf - 0.4, uNf + 0.4, vS));
            float edge = uNf > -0.5 ? exp(-pow((vS - uNf) / 0.7, 2.0)) : 0.0;
            float p = exp(-pow((vS - uNp) / 1.1, 2.0)), tail = exp(-max(0.0, uNp - vS) / 2.2) * step(vS, uNp) * step(0.0, uNp);
            float flow = 0.75 + 0.25 * sin(vS * 4.0 - uT * 13.0);
            vec3 col = vec3(1.0, 0.55, 0.06) * (0.85 * lit * flow + 1.6 * edge + 0.8 * tail) + vec3(1.0, 0.85, 0.5) * 1.8 * p;
            gl_FragColor = vec4(col * a, 1.0); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const hmesh = staticTube(NERVE_LOCAL, (u) => 0.5 * (1 - 0.2 * smooth((u - 0.7) / 0.3)), 14, hm, () => C("#ffffff")).mesh;
      hmesh.castShadow = false; hmesh.receiveShadow = false; hmesh.layers.set(NOINK); hmesh.renderOrder = 5; R.add(hmesh);
    }
    this.dendMat = mmat("nerve", { color: "#ffd23c", spec: 0.4, shin: 40, rim: [0.3, 0.2, 0.05] });
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * TAU + 0.4, len = 1.0 + 0.7 * h1(k + 3), pts: V3[] = [];
      for (let i = 0; i <= 18; i++) {
        const u = i / 18, x = N_ROOT[0] + Math.cos(a + 0.4 * u * Math.sin(k)) * len * u, z = N_ROOT[2] + Math.sin(a + 0.4 * u * Math.sin(k)) * len * u;
        pts.push([x, roofY(x, z) - 0.03, z]);
      }
      R.add(staticTube(pts, (u) => 0.075 * (1 - 0.75 * u) + 0.004, 8, this.dendMat, () => C("#ffffff"), 0).mesh);
    }
    {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), this.dendMat);
      knob.position.set(N_ROOT[0], N_ROOT[1] - 0.04, N_ROOT[2]); knob.scale.set(1, 0.6, 1);
      add(knob, true, true);
    }

    // ---------------- alarm bell (hangs below the cable at the sag) ----------------
    {
      this.bellMat = mmat("bell", { color: "#ee2430", spec: 0.85, shin: 90, rim: [0.3, 0.06, 0.06], emissive: new THREE.Color(0, 0, 0) });
      const chrome = mmat("plain", { color: "#e8e4ec", spec: 0.9, shin: 110, rim: [0.2, 0.18, 0.2] });
      const gold = mmat("plain", { color: "#ffc93a", spec: 0.8, shin: 80, rim: [0.3, 0.2, 0.05] });
      // clamp ring around the cable
      let si = 0, sd = 1e9;
      NERVE_LOCAL.forEach((p, i) => { const d = Math.hypot(p[0] - N_SAG[0], p[1] - N_SAG[1], p[2] - N_SAG[2]); if (d < sd) { sd = d; si = i; } });
      const ta = NERVE_LOCAL[Math.max(0, si - 1)], tb = NERVE_LOCAL[Math.min(NERVE_LOCAL.length - 1, si + 1)];
      const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.075, 10, 24), gold);
      clamp.position.set(N_SAG[0], N_SAG[1], N_SAG[2]);
      clamp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(tb[0] - ta[0], tb[1] - ta[1], tb[2] - ta[2]).normalize());
      add(clamp, true, true);
      this.bell.position.set(N_SAG[0], N_SAG[1] - 0.08, N_SAG[2]);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, BELL_HANG, 10), gold); rod.position.y = -BELL_HANG / 2;
      this.bell.add(rod);
      // dome: convex side faces +z (toward the lips), open side toward the back
      const prof: THREE.Vector2[] = [];
      for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 0.5; prof.push(new THREE.Vector2(Math.max(0.001, BELL_R * Math.sin(a)), 0.5 * BELL_R * Math.cos(a) ** 0.8)); }
      prof.push(new THREE.Vector2(BELL_R * 1.07, -0.02), new THREE.Vector2(BELL_R * 1.07, -0.12), new THREE.Vector2(BELL_R * 0.92, -0.1));
      const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), this.bellMat);
      (this.bellMat as THREE.MeshPhongMaterial).side = THREE.DoubleSide;
      dome.rotation.x = Math.PI / 2; // lathe axis y -> +z
      this.bellDome.add(dome);
      const rimT = new THREE.Mesh(new THREE.TorusGeometry(BELL_R * 1.02, 0.1, 12, 56), mmat("bell", { color: "#b8121e", spec: 0.8, shin: 80, rim: [0.3, 0.06, 0.06] })); rimT.position.z = -0.06; this.bellDome.add(rimT);
      const band = new THREE.Mesh(new THREE.TorusGeometry(BELL_R * 0.62, 0.045, 8, 48), gold); band.position.z = 0.5 * BELL_R * 0.78; this.bellDome.add(band);
      const bolt = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), chrome); bolt.position.z = 0.55 * BELL_R + 0.02; bolt.scale.set(1, 1, 0.6);
      this.bellDome.add(bolt);
      const back = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 16), gold); back.rotation.x = Math.PI / 2; back.position.z = -0.12;
      this.bellDome.add(back);
      this.bellDome.position.set(0, -BELL_HANG - 0.32, 0.12); this.bellDome.rotation.order = "YXZ";
      this.bell.add(this.bellDome);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), chrome); arm.position.y = 0.25;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), chrome); ball.position.y = 0.52;
      this.hammer.add(arm, ball);
      this.hammer.position.set(0, -BELL_HANG - 0.32 - BELL_R - 0.42, 0.28);
      this.bell.add(this.hammer);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), gold); hb.position.copy(this.hammer.position); this.bell.add(hb);
      this.bell.traverse((o) => { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; });
      R.add(this.bell);
    }

    // ---------------- ice-cream slab ----------------
    {
      const scoop = new THREE.Mesh(scoopGeo(), mmat("slab", { vc: true, spec: 0.35, shin: 30, rim: [0.32, 0.14, 0.18] }));
      scoop.scale.setScalar(SLAB_R);
      this.slabBody.add(scoop);
      const chipMat = mmat("plain", { color: "#4a2414", spec: 0.3, shin: 30, rim: [0.1, 0.05, 0.03] });
      const chips = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.14, 0), chipMat, NCHIP);
      for (let i = 0; i < NCHIP; i++) {
        const ph = Math.acos(lerp(0.75, -0.55, h1(i * 3 + 1))), th = h1(i * 5 + 2) * TAU;
        this.v1.set(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th)).multiplyScalar(SLAB_R * 0.99);
        this.q.setFromEuler(new THREE.Euler(h1(i) * 3, h1(i + 9) * 3, h1(i + 17) * 3));
        this.m4.compose(this.v1, this.q, this.v2.set(1 + 0.6 * h1(i + 4), 0.5 + 0.3 * h1(i + 6), 0.9 + 0.5 * h1(i + 8)));
        chips.setMatrixAt(i, this.m4);
      }
      this.slabBody.add(chips);
      // wafer-cone edge: a broken piece of the cone rim under the scoop (toward the lens)
      const waf = new THREE.CylinderGeometry(SLAB_R * 0.97, SLAB_R * 0.7, 0.95, 56, 6, true, 0, TAU);
      { const p = waf.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.3) { const a = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, y + 0.3 * Math.abs(Math.sin(a * 2.5 + 0.7)) + 0.12 * Math.abs(Math.sin(a * 11))); } }
        waf.computeVertexNormals(); }
      const wafer = new THREE.Mesh(waf, mmat("wafer", { color: "#e8a556", spec: 0.25, shin: 24, rim: [0.3, 0.18, 0.08], side: THREE.DoubleSide }));
      wafer.position.set(0, -SLAB_R * 0.62, 0); wafer.rotation.set(0.1, 0.3, 0.05);
      this.slabBody.add(wafer);
      this.slabBody.position.y = -SLAB_DROP;
      this.slab.add(this.slabBody);
      this.slab.traverse((o) => { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; });
      R.add(this.slab);
    }

    // ---------------- frost crystals on the palate around the impact ----------------
    {
      const g = new THREE.OctahedronGeometry(1, 0).toNonIndexed(); g.computeVertexNormals();
      this.crys = new THREE.InstancedMesh(g, mmat("crystal", { color: "#e6f4ff", spec: 0.9, shin: 120, flat: true, rim: [0.3, 0.4, 0.6] }), NCRYS);
      const up = new THREE.Vector3(0, 1, 0);
      for (let i = 0; i < NCRYS; i++) {
        const a = h1(i * 13 + 1) * TAU, d = 0.8 + 3.0 * Math.sqrt(h1(i * 7 + 5));
        const x = SLAB_REST.x + Math.cos(a) * d * 1.05, z = SLAB_REST.z + Math.sin(a) * d * 0.9;
        if (Math.abs(x) > 3.6 || z > 5 || z < -3.4) { this.crysDef.push({ p: new THREE.Vector3(0, -50, 0), q: new THREE.Quaternion(), s: new THREE.Vector3(), d: 99 }); continue; }
        const n = roofN(x, z, new THREE.Vector3());
        const p = new THREE.Vector3(x, roofY(x, z) - rugae(x, z) + 0.02, z);
        const dir = n.clone().add(new THREE.Vector3(h1(i + 3) - 0.5, 0, h1(i + 5) - 0.5).multiplyScalar(0.9)).normalize();
        const qq = new THREE.Quaternion().setFromUnitVectors(up, dir);
        const L = 0.25 + 0.5 * h1(i * 3 + 2) * (1.3 - d / 4.5);
        this.crysDef.push({ p, q: qq, s: new THREE.Vector3(0.09 + 0.06 * h1(i + 11), L, 0.09 + 0.06 * h1(i + 13)), d: Math.hypot(x - SLAB_REST.x, z - SLAB_REST.z) });
      }
      add(this.crys, false, true);
    }

    // ---------------- NOINK effects ----------------
    const sprite = (map: THREE.Texture, color: THREE.Color, additive: boolean, order: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = order; s.visible = false; R.add(s); return s;
    };
    for (let i = 0; i < NWISP; i++) this.wisps.push(sprite(wispTex(), new THREE.Color(0.95, 1.0, 1.1), false, 4));
    for (let i = 0; i < NFLAKE; i++) this.flakes.push(sprite(flakeTex(), new THREE.Color(1.1, 1.15, 1.25), false, 6));
    for (let i = 0; i < NRING; i++) this.rings.push(sprite(ringTex(), new THREE.Color(1.6, 1.25, 0.3), true, 7));
    this.flare = sprite(softTex(), new THREE.Color(3.0, 2.2, 0.8), true, 8);
    for (let i = 0; i < NTRAIL; i++) this.trail.push(sprite(softTex(), new THREE.Color(2.2, 1.1, 0.2), true, 7));
    this.bellGlow = sprite(softTex(), new THREE.Color(2.0, 0.5, 0.3), true, 5);
    this.slamFlash = sprite(softTex(), new THREE.Color(1.6, 2.0, 2.6), true, 8);
    { // QA: the warm light at the far end of the nerve tunnel blooms (the ride flies toward it)
      const e = spineAt(S_END - 1.2), g = sprite(softTex(), new THREE.Color(2.2, 1.3, 0.5), true, 4);
      g.position.copy(e.p); g.scale.setScalar(e.A * 3.2); g.visible = true; (g.material as THREE.SpriteMaterial).opacity = 0.9;
    }
    this.faceMaps = [faceTex(0), faceTex(1), faceTex(2)];
    for (let i = 0; i < VDEF.length; i++) { const s = sprite(this.faceMaps[0], new THREE.Color(1, 1, 1), false, 3); (s.material as THREE.SpriteMaterial).depthWrite = false; this.faces.push(s); }
    MU.uPLp.value[0].set(...wl(0, 2.3, 8.2)); MU.uPLr.value[0] = 7.5; // warm park light through the lips
  }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 2;
    if (!R.visible) return;
    if (DEBUG) this.debugCam(f, cam);
    const st = mouthAt(2, t);
    MU.uT.value = t;

    // ---------- slab: fly in (accelerating), slam, squash-spring ----------
    const x = clamp01((t - (W.cold - 0.45)) / 0.45), u = Math.pow(x, 1.6);
    const ia = 1 - u, b0 = ia * ia * ia, b1 = 3 * u * ia * ia, b2 = 3 * u * u * ia, b3 = u * u * u;
    const bz = (k: 0 | 1 | 2) => b0 * SLAB_P[0][k] + b1 * SLAB_P[1][k] + b2 * SLAB_P[2][k] + b3 * SLAB_P[3][k];
    this.slab.position.set(bz(0), bz(1), bz(2));
    const tau = t - W.cold;
    const sq = tau > 0 ? 0.3 * Math.exp(-5.5 * tau) * Math.cos(15 * tau) + 0.12 * smooth(tau / 0.2) : 0.12 * x; // + = squashed
    const sy = 1 - sq, sxz = 1 / Math.sqrt(Math.max(0.3, sy));
    this.slab.scale.set(sxz, sy, sxz);
    this.slab.rotation.set(0.25 * (1 - u) - 0.08, 1.2 * (1 - u) + 0.3, 0.1 * (1 - u) + 0.12 * smooth(tau / 0.3));
    this.slab.visible = x > 0;
    const fl = tau > 0 ? Math.exp(-tau * 7) * smooth(tau / 0.04) : 0;
    this.slamFlash.visible = fl > 0.01;
    if (this.slamFlash.visible) { this.slamFlash.position.set(SLAB_REST.x, SLAB_REST.y - 0.3, SLAB_REST.z + 0.4); this.slamFlash.scale.setScalar(2 + 5 * (1 - Math.exp(-tau * 6))); (this.slamFlash.material as THREE.SpriteMaterial).opacity = fl * 0.9; }

    // ---------- frost ----------
    const cold = st.cold;
    const frR = cold > 0 ? 0.5 + 2.7 * cold + 0.14 * Math.max(0, t - W.cold - 0.6) : 0;
    MU.uCold.value = cold; MU.uFrR.value = frR;
    MU.uFrC.value.set(SLAB_REST.x, SLAB_REST.y - 0.1, SLAB_REST.z).add(R.position);
    this.crysDef.forEach((c, i) => {
      const g = c.d < 90 ? spr(frR - c.d * 0.92 - 0.2, 6.5, 14) : 0;
      this.m4.compose(c.p, c.q, this.v3.copy(c.s).multiplyScalar(Math.max(1e-4, g)));
      this.crys.setMatrixAt(i, this.m4);
    });
    this.crys.instanceMatrix.needsUpdate = true;
    this.crys.visible = cold > 0.001;

    // ---------- vessels: squeeze / blast / throb ----------
    const sqz = st.squeeze, bT = W.blast - 0.15;
    let bkMax = 0;
    VDEF.forEach((_, vi) => {
      const B = this.vBase[vi], c = this.vc[vi], r = this.vr[vi], v = this.vv[vi], NS = B.p.length - 1;
      const dl = 0.06 * vi; // stagger
      const sqi = clamp01(sqz * 1.15 - dl), bki = spr(t - bT - dl, 4.5, 11) * (1 - 0.5 * smooth((t - W.nerve) / 0.6));
      bkMax = Math.max(bkMax, bki);
      for (let k = 0; k <= NS; k++) {
        const uu = B.u[k], ends = smooth(Math.min(uu, 1 - uu) / 0.1);
        const wob = 1 + 0.16 * sqi * Math.sin(uu * 26 + t * 21 + vi) + 0.1 * sqi * Math.sin(uu * 9 - t * 13);
        const pinch = 1 - 0.65 * sqi * (0.85 + 0.15 * Math.cos(uu * 40));
        const ph = ((((uu * 3 - (t - bT) * 2.2 + vi * 0.3) % 1) + 1) % 1) - 0.5;
        const throb = 1 + 0.18 * clamp01(bki) * Math.exp(-((ph / 0.12) ** 2));
        const rr = VR0 * pinch * (1 + 0.8 * bki) * wob * throb * (0.35 + 0.65 * ends);
        r[k] = rr;
        const off = 0.45 * rr - 0.04 - 0.35 * (1 - ends) * VR0;
        c[k * 3] = B.p[k].x + B.n[k].x * off; c[k * 3 + 1] = B.p[k].y + B.n[k].y * off; c[k * 3 + 2] = B.p[k].z + B.n[k].z * off;
        v[k] = uu * 7;
      }
      this.face(vi, c, r, t, sqi, bki, cam);
      const base = this.tc.set("#d81a38").lerp(C("#8e1a44"), sqi * 0.7).lerp(C("#ff2f4a"), clamp01(bki) * 0.35);
      this.vessels[vi].set(c, r, v, () => base);
    });
    this.vesselMat.emissive.setRGB(0.25 * clamp01(bkMax) * (0.7 + 0.3 * Math.sin(t * 12)), 0.0, 0.02);

    // ---------- nerve + bell + pulse ----------
    MU.uNv.value = st.nerve * (0.85 + 0.15 * Math.sin(t * 9));
    MU.uNf.value = igniteS(t);
    const ps = pulseS(t);
    MU.uNp.value = ps;
    const ringK = st.alarm * (1 - 0.6 * smooth((t - W.but - 0.2) / 0.5));
    const par = f % 2 === 0 ? 1 : -1;
    this.bellDome.rotation.set(0.22, -0.42, ringK * (0.09 * par + 0.03 * Math.sin(t * 31)));
    this.bell.rotation.set(0.05 * ringK * Math.sin(t * 17), 0, ringK * 0.05 * par + 0.02 * st.nerve * Math.sin(t * 3));
    this.hammer.rotation.set(0, 0, ringK * 0.5 * par);
    this.bellMat.emissive.setRGB(0.6 * ringK * (0.6 + 0.4 * par), 0.08 * ringK, 0.03 * ringK);
    const bw = this.v3.copy(BELL_LOCAL);
    this.rings.forEach((s, i) => {
      const t0 = W.rings - 0.15 + (i / NRING) * 0.42, ph = ((((t - t0) / 0.42) % 1) + 1) % 1;
      s.visible = ringK > 0.01 && t > t0;
      if (!s.visible) return;
      s.position.copy(bw).add(this.v1.set(0, 0, 0.6));
      s.scale.setScalar(BELL_R * (2.1 + 3.4 * ph));
      (s.material as THREE.SpriteMaterial).opacity = ringK * (1 - ph) * smooth(ph / 0.15);
    });
    this.bellGlow.visible = ringK > 0.01;
    if (this.bellGlow.visible) { this.bellGlow.position.copy(bw).add(this.v1.set(0, 0, 0.4)); this.bellGlow.scale.setScalar(BELL_R * 3.6); (this.bellGlow.material as THREE.SpriteMaterial).opacity = ringK * (0.25 + 0.15 * par); }
    this.flare.visible = ps > 0 && ps < N_LEN;
    let pp: THREE.Vector3 | null = null, fo = 0;
    if (this.flare.visible) {
      pp = nerveAt(ps);
      this.flare.position.copy(pp);
      const cd = this.v2.copy(cam.position).sub(R.position).distanceTo(pp); // QA: never a lens-filling white blob
      this.flare.scale.setScalar(Math.min(1.6, 0.32 * cd) * (1 + 0.15 * Math.sin(t * 40)));
      fo = smooth(ps / 0.6) * (1 - smooth((ps - (N_LEN - 2)) / 2));
      (this.flare.material as THREE.SpriteMaterial).opacity = fo;
    }
    // QA: the comet tail behind the pulse (sprites along the cable, smaller + fainter with distance)
    this.trail.forEach((s, i) => {
      const ts = ps - (i + 1) * 0.42;
      s.visible = this.flare.visible && ts > 0.2;
      if (!s.visible) return;
      s.position.copy(nerveAt(ts));
      s.scale.setScalar(Math.min(1.0, 0.25 * this.v2.copy(cam.position).sub(R.position).distanceTo(s.position)) * (1 - i / (NTRAIL + 1)));
      (s.material as THREE.SpriteMaterial).opacity = fo * 0.7 * (1 - i / NTRAIL) * smooth((ts - 0.2) / 0.6);
    });

    // ---------- vapour wisps (cold air sinking off the slab) + flake burst ----------
    for (let i = 0; i < NWISP; i++) {
      const w = this.wisps[i], life = 2.2, t0 = W.cold + 0.05 + (i / NWISP) * life;
      w.visible = cold > 0.01 && t >= t0;
      if (!w.visible) continue;
      const ph = ((((t - t0) / life) % 1) + 1) % 1;
      const ox = (h1(i * 3) - 0.5) * 1.6, oz = (h1(i * 7) - 0.5) * 1.2;
      w.position.set(SLAB_REST.x + ox + 0.4 * ph * Math.sin(i), SLAB_REST.y - SLAB_R * 1.5 - 1.6 * ph, SLAB_REST.z + oz + 0.8 * ph);
      const sc = 1.2 + 1.8 * ph;
      w.scale.set(sc * 2, sc, 1);
      (w.material as THREE.SpriteMaterial).opacity = 0.55 * cold * smooth(ph / 0.2) * (1 - smooth((ph - 0.55) / 0.45));
      (w.material as THREE.SpriteMaterial).rotation = (h1(i) - 0.5) * 0.6 + ph * 0.4;
    }
    for (let i = 0; i < NFLAKE; i++) {
      const s = this.flakes[i], tt = t - W.cold;
      s.visible = tt > 0 && tt < 1.6;
      if (!s.visible) continue;
      const a = (i / NFLAKE) * TAU + h1(i) * 0.5, sp = 1.6 + 1.2 * h1(i + 4), d = sp * (1 - Math.exp(-tt * 2.6));
      s.position.set(SLAB_REST.x + Math.cos(a) * d, SLAB_REST.y - 0.6 - 0.7 * tt + Math.sin(a) * d * 0.35, SLAB_REST.z + Math.sin(a) * d * 0.6 + 0.5);
      s.scale.setScalar((0.32 + 0.22 * h1(i + 9)) * smooth(tt / 0.12) + 1e-4);
      (s.material as THREE.SpriteMaterial).rotation = tt * (1.5 + h1(i)) * (i % 2 ? 1 : -1);
      (s.material as THREE.SpriteMaterial).opacity = 1 - smooth((tt - 1.0) / 0.6);
    }

    // ---------- fake lights ----------
    const P = MU.uPLp.value, Cc = MU.uPLc.value, Rr = MU.uPLr.value;
    Cc[0].set(1.0, 0.74, 0.5).multiplyScalar(1.6 * (1 - 0.35 * cold));
    P[1].set(SLAB_REST.x, SLAB_REST.y - 1.6, SLAB_REST.z + 0.4).add(R.position);
    Cc[1].set(0.4, 0.68, 1.0).multiplyScalar(2.4 * cold + 3.0 * fl); Rr[1] = 3.2 + 1.2 * cold;
    P[2].set(N_SAG[0], N_SAG[1] - 0.4, N_SAG[2] + 0.6).add(R.position);
    Cc[2].set(1.0, 0.72, 0.25).multiplyScalar(2.4 * st.nerve); Rr[2] = 3.4;
    if (pp) { P[3].copy(pp).add(R.position); Cc[3].set(1.0, 0.85, 0.45).multiplyScalar(3.2 * fo); Rr[3] = 2.8; }
    else { P[3].copy(bw).add(this.v1.set(0, 0, 0.9)).add(R.position); Cc[3].set(1.0, 0.25, 0.15).multiplyScalar(1.4 * ringK * (0.6 + 0.4 * par)); Rr[3] = 3.5; }
  }

  /** a vessel's little face: sits on the tube's lens side at its FACE_U point; calm -> scared (squeeze) -> boing */
  private face(vi: number, c: Float32Array, r: Float32Array, t: number, sqi: number, bki: number, cam: THREE.PerspectiveCamera) {
    const s = this.faces[vi], NS = r.length - 1, k = Math.round(FACE_U[vi] * NS);
    const on = smooth((t - (W.blood - 0.25 + 0.07 * vi)) / 0.3) * (1 - smooth((t - (W.nerve - 0.4)) / 0.3));
    s.visible = on > 0.005;
    if (!s.visible) return;
    const T1 = W.squeeze - 0.2 + 0.06 * vi, T2 = W.blast - 0.15 + 0.06 * vi;
    const st = t < T1 ? 0 : t < T2 ? 1 : bki > 0.25 ? 2 : 0;
    const mat = s.material as THREE.SpriteMaterial;
    if (mat.map !== this.faceMaps[st]) { mat.map = this.faceMaps[st]; mat.needsUpdate = true; }
    const blink = 1 - 0.9 * Math.max(Math.exp(-(((t - T1) / 0.05) ** 2)), Math.exp(-(((t - T2) / 0.05) ** 2)));
    const rr = Math.max(r[k], VR0 * (st === 1 ? 1.05 : 0.8));
    this.v1.set(c[k * 3], c[k * 3 + 1], c[k * 3 + 2]);
    this.v2.copy(cam.position).sub(this.root.position).sub(this.v1).normalize();
    s.position.copy(this.v1).addScaledVector(this.v2, r[k] * 1.05);
    // pulled 0.7 m toward the lens along its own ray (same screen size) so the roof never cuts it
    const dc = this.v3.copy(cam.position).sub(this.root.position).distanceTo(s.position), kk = 1 - Math.min(0.4, 0.7 / Math.max(1, dc));
    s.position.lerp(this.v3, 1 - kk);
    const w = kk * rr * 2.3 * (st === 1 ? 1 + 0.06 * Math.sin(t * 60) : 1) * on;
    s.scale.set(w + 1e-4, w * 0.75 * blink + 1e-4, 1);
    void sqi;
  }

  private debugCam(f: number, cam: THREE.PerspectiveCamera) {
    const K = MOUTH_CAM_KEYS;
    let i = 0;
    while (i < K.length - 2 && f >= K[i + 1].f) i++;
    const A = K[i], B = K[i + 1], u = glide((f - A.f) / (B.f - A.f));
    cam.position.set(lerp(A.pos[0], B.pos[0], u), lerp(A.pos[1], B.pos[1], u), lerp(A.pos[2], B.pos[2], u));
    cam.up.set(0, 1, 0); cam.lookAt(lerp(A.look[0], B.look[0], u), lerp(A.look[1], B.look[1], u), lerp(A.look[2], B.look[2], u));
    cam.fov = lerp(A.fov, B.fov, u); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
}
