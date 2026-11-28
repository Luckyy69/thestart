// OWNER: belly. BELLY (shots 2 + 3): INSIDE BEAN's STOMACH at giant scale, a warm glossy pink-orange cavern.
//   A long organic chamber along x (fundus dome at x -9.6, body x -7..3, antrum narrowing x 3..7 into the PYLORUS
//   tunnel at (7,1.5,0) that bends away toward -z out of sight). Flat floor y ~0 (|z| < 3.6), walls |z| ~5, roof y ~8.
//   Big wavy RUGAE folds run along the length (leading lines into the exit). A glowing green-yellow JUICE pool (centre
//   (0,0.05,0), ~6.2 x 5 m, raised rim) lights the cavern from below (caustics dance on floor + walls); the OESOPHAGUS
//   opening in the roof at (-5,8,0) (plump sphincter ring) pours a warm haze shaft of light down. A shiny AIR BUBBLE
//   (iridescent, inked rim) floats on the juice at (1.5,1.2,-1). The crew's CORNER at (-3,0,2.5): 3 posts, 2 striped
//   hammocks, a crate table with a twin-bell alarm clock, a wall clock, a "CLEANING CREW" sign, fairy lights, mops,
//   buckets. A giant red PUSH BROOM lies at (-4.4,0,-0.7). Crumbs on the floor. "EXIT - TO INTESTINES" sign at the
//   pylorus.
// Beats (story.ts bellyAt / fullAt; never hard-coded seconds):
//   alarm: the alarm clock shakes + hammer + inked ring sprites + red flash | wake: hammocks swing (crew jump out) |
//   clock: wall-clock hands spin | squeeze: WAVE 1, a glowing muscle ring PINCHES the cavern (floor rises ~1.6 m in a
//   travelling hump, back wall + roof close in; the +z/camera side barely moves) x -6 -> +7; the crew lift the broom
//   before it and it pushes the crumbs; sweep: crumbs flung into the exit tunnel | bubble: highlight glint |
//   squish: WAVE 2 (derived locally: x = 1.5 + 6.2 (t - W.squish), so it reaches the bubble ON "squish") squashes the
//   bubble flat (springy) | echo: concentric inked SOUND RINGS + glowing rings sweep over the walls and bounce back |
//   growl: the walls flash warm + one big ring (letters = cast).
//   Shot 3 (fullAt): fill: 15 big foods + 70 peas drop out of the oesophagus (stretch, tumble, squash on landing) and
//   pile up x -6.5..2.6; squeeze2: the same wave rolls under the pile (food bobs up, glow muffled); muffle/thumbs: cast.
// ===== CONTRACTS (exports are WORLD) =====
//   JUICE_AT pool centre (surface) | BUBBLE_AT bubble centre (r 1.15) | CORNER_AT crew corner | HAMMOCKS[] the 2 bed
//   centres (lowest cloth point) | ALARM_AT alarm clock | WALL_CLOCK_AT | SIGN_AT | SQUEEZE_X(t) wave-centre x (t =
//   GLOBAL seconds f/30) | squeezeAt(t) {x, k, crestY} (crestY = floor top at the crest, z -0.6) | broomAt(t)
//   {head, grip} (grip = handle end where the crew push) | FOOD_TOP(t) pile top y | PIZZA_AT where the squashed crew
//   member stands (under the hero pizza's raised tip) | MUFFLE_AT top of the pile for the "mmf" bubble | OESO_AT |
//   EXIT_AT | GROWL_AT centre for the "GRRROWL" letters (cast) | BELLY_CAM_KEYS tested camera keys (f 102..778).
//   CLEARANCE: camera y 1.6..6.2, |z| <= 3.4 (z <= +3.2 on the +z side, z >= -2.0 while a wave passes your x),
//   x -7.4..5.8; 0.8 m from the bubble, the corner posts (x -5.4/-3.3/-1.1, z ~3.1-3.4, h 1.85) and food (shot 3:
//   the pile reaches y ~3.5 over x < 2.6).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { BELLY, V3, W, FPS, bellyAt, fullAt, glide, shotAt } from "./story";
import {
  TAU, h1, vn, lerp, spr, wob, C, catmull3, smooth, clamp01, BU, GLSL_NOISE, bmat, softTex, ringTex, signTex, exitTex,
  hammockTex, tubeGeo, FOOD_DIM, FOOD_MAKERS, FoodKind, woodMat, post, crate, bucket, mop, hammockGeo, alarmClock,
  wallClock, pushBroom, crumbGeos,
} from "./belly_kit";

const DEBUG = false; // TEMP: fly BELLY_CAM_KEYS for stills (must be false when reporting)
const wl = (x: number, y: number, z: number): V3 => [BELLY[0] + x, BELLY[1] + y, BELLY[2] + z];

// ============================== layout ==============================
const X0 = -9.6, X1 = 13.2;
const exitK = (x: number) => smooth((x - 3.0) / 3.8);
const tunR = (x: number) => lerp(1.55, 1.3, smooth((x - 7) / 4));
const capK = (x: number) => (x < -7.2 ? Math.sqrt(Math.max(0, 1 - ((x + 7.2) / 2.4) ** 2)) : 1) * (x > 12.2 ? Math.sqrt(Math.max(0, 1 - ((x - 12.2) / 1.0) ** 2)) : 1);
const cyAt = (x: number) => lerp(3.75, tunR(x) + 0.14, exitK(x));
const czAt = (x: number) => (x > 9.4 ? -0.34 * (x - 9.4) ** 2 : 0);
const slopeZ = (x: number) => (x > 9.4 ? -0.68 * (x - 9.4) : 0);
/** section half sizes at x: A (z), Bu (up), Bl (down), exponents */
const dims = (x: number) => {
  const e = exitK(x), k = capK(x), r = tunR(x), sl = Math.sqrt(1 + slopeZ(x) ** 2);
  const cy = cyAt(x);
  return { A: lerp(5.15 - 0.3 * smooth((x + 1) / 5), r, e) * k * sl, Bu: lerp(4.25, r, e) * k, Bl: lerp(cy, r, e) * k, eu: lerp(0.8, 1, e), el: lerp(0.35, 1, e), cy, cz: czAt(x) };
};
const HOLE: [number, number] = [-5, 0], HOLE_R = 1.85;
const POOL_C: V3 = [0, 0.05, 0];
const poolR = (a: number) => 3.1 + 0.32 * Math.sin(3 * a + 0.7) + 0.18 * Math.sin(5 * a + 2.1);
const POOL_ZS = 0.8; // pool z squash
/** pool basin offset on the floor at local (x, z): a dip with a raised rim */
const basin = (x: number, z: number) => {
  const dx = x - POOL_C[0], dz = (z - POOL_C[2]) / POOL_ZS, q = Math.hypot(dx, dz) / poolR(Math.atan2(dz, dx));
  return -0.38 * (1 - smooth((q - 0.55) / 0.4)) + 0.2 * Math.exp(-(((q - 1.0) / 0.12) ** 2));
};
const BUBBLE_L: V3 = [1.5, 1.2, -1], BUBBLE_R = 1.15;
const CORNER_L: V3 = [-3, 0, 2.5];
const POSTS: V3[] = [[-5.4, 0, 3.05], [-3.3, 0, 3.4], [-1.1, 0, 3.05]];
const POST_H = 1.85;
const HAM: { a: V3; b: V3; sag: number }[] = [
  { a: [-5.3, 1.6, 3.05], b: [-3.4, 1.6, 3.38], sag: 0.82 },
  { a: [-3.2, 1.6, 3.38], b: [-1.2, 1.6, 3.05], sag: 0.78 },
];
const CRATE_L: V3 = [-3.25, 0, 1.75];
const ALARM_L: V3 = [-3.15, 0.75, 1.68];
const SIGN_L: V3 = [-3.3, 2.32, 3.3];
const SIGN_YAW = 2.85; // (qa1) was 2.62: the sign's "C" end (z 3.82) sank into the wall fold
const BROOM_Z = -0.7, BROOM_X0 = -4.4, BROOM_XMAX = 5.5;
const EXIT_SIGN_L: V3 = [5.0, 3.85, 0];
const NF = 24; // rugae folds around

// ============================== waves ==============================
type Wave = { x: number; k: number; glow: number };
const env = (d: number) => Math.exp(-((d / 1.25) ** 2)) - 0.07 * Math.exp(-(((d - 2.3) / 1.0) ** 2));
const waveEnv = (x: number) => smooth((x + 6) / 1.6) * (1 - smooth((x - 5.6) / 1.4));
/** the travelling squeeze at GLOBAL time t (local x) */
const waveAt = (t: number): Wave => {
  const id = shotAt(Math.round(t * FPS)).id;
  if (id === 2) {
    const s = bellyAt(2, t).squeeze, x1 = -6 + 13 * s, k1 = s > 0 ? waveEnv(x1) : 0;
    const x2 = 1.5 + 6.2 * (t - W.squish), k2 = x2 > -6 && x2 < 7.2 ? 0.82 * waveEnv(x2) : 0;
    return k2 > k1 ? { x: x2, k: k2, glow: 1.1 } : { x: k1 > 0 ? x1 : -6, k: k1, glow: 1 };
  }
  if (id === 3) { const s = fullAt(3, t).squeeze2, x = -6 + 13 * s; return { x, k: s > 0 ? 0.55 * waveEnv(x) : 0, glow: 0.55 }; }
  return { x: -6, k: 0, glow: 0 };
};
/** pinch weight by section position: zn (-1 back .. +1 camera side), yn (-1 floor .. +1 roof) */
const pinchA = (zn: number, yn: number) => 0.44 * (1 - 0.78 * smooth((zn - 0.05) / 0.5)) * (1 - 0.18 * Math.max(0, yn)) * (1 - 0.3 * Math.max(0, -yn));

// ============================== floor lookup (rest) ==============================
const GX0 = -10, GZ0 = -7, GS = 0.2, GNX = 126, GNZ = 71;
const FLOOR = new Float32Array(GNX * GNZ).fill(99);
const floorRest = (x: number, z: number) => {
  const fx = (x - GX0) / GS, fz = (z - GZ0) / GS, ix = Math.max(0, Math.min(GNX - 2, Math.floor(fx))), iz = Math.max(0, Math.min(GNZ - 2, Math.floor(fz)));
  const u = clamp01(fx - ix), v = clamp01(fz - iz), a = FLOOR[iz * GNX + ix], b = FLOOR[iz * GNX + ix + 1], c = FLOOR[(iz + 1) * GNX + ix], d = FLOOR[(iz + 1) * GNX + ix + 1];
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
};
/** deformed floor height at local (x, z) for the wave */
const floorAt = (x: number, z: number, w: Wave) => {
  const fr = floorRest(x, z);
  if (w.k <= 0) return fr;
  const D = dims(x), zn = (z - D.cz) / D.A, s = 1 - w.k * pinchA(zn, -1) * env(x - w.x);
  return D.cy - (D.cy - fr) * s;
};

// ============================== food layout ==============================
type FoodDef = { kind: FoodKind; seed: number; x: number; z: number; yaw: number; tilt: [number, number]; y: number; h: number; T: number; D: number; S: V3; spin: V3 };
const FOOD_LIST: [FoodKind, number, number, number][] = [
  ["spag", -4.8, -1.6, 0.3], ["burger", -2.4, 0.2, 0.6], ["broc", -5.6, 1.4, 1.1], ["box", -1.0, -2.6, 0.5], ["pizza", -3.4, -2.8, 2.2],
  ["burger", -0.2, 1.3, 2.0], ["spag", 0.7, -1.3, 1.3], ["broc", -3.0, 2.1, 0.2], ["straw", 1.6, -0.1, 0.4], ["pizza", 2.3, 1.75, -0.35],
  ["burger", -3.7, -0.7, 1.4], ["broc", -1.3, -0.5, 2.7], ["spag", -1.9, 2.3, 0.8], ["pizza", -0.7, 0.6, 1.0], ["broc", 1.0, -2.7, 1.9],
];
const HERO_PIZZA = 9;
const NPEA = 70;
const FOOD_T0 = W.does - 0.3;
const G_ACC = 22, DROP_A = 0.2;
const FOODS: FoodDef[] = [], PEAS: FoodDef[] = [];
const HX0 = -8, HZ0 = -5, HS = 0.2, HNX = 66, HNZ = 51, HMAP = new Float32Array(HNX * HNZ);
const hmapMax = (x: number, z: number, r: number) => {
  let m = -9;
  for (let iz = 0; iz < HNZ; iz++) for (let ix = 0; ix < HNX; ix++) { const cx = HX0 + ix * HS, cz = HZ0 + iz * HS; if (Math.hypot(cx - x, cz - z) <= r) m = Math.max(m, HMAP[iz * HNX + ix]); }
  return m;
};
const hmapAdd = (x: number, z: number, r: number, top: number, h: number) => {
  for (let iz = 0; iz < HNZ; iz++) for (let ix = 0; ix < HNX; ix++) {
    const cx = HX0 + ix * HS, cz = HZ0 + iz * HS, d = Math.hypot(cx - x, cz - z);
    if (d < r) HMAP[iz * HNX + ix] = Math.max(HMAP[iz * HNX + ix], top - h + h * Math.sqrt(1 - (d / r) ** 2));
  }
};
const dropDur = (x: number, z: number, y: number) => 0.42 + 0.045 * Math.hypot(x - HOLE[0], z - HOLE[1]) + 0.02 * (7.6 - y);
const addPea = (k: number, T: number) => {
  const x = lerp(-6.6, 1.0, h1(k * 13 + 1)), z = lerp(-3.3, 3.0, h1(k * 17 + 5)), base = Math.max(0.05, hmapMax(x, z, 0.3) - 0.1);
  PEAS.push({ kind: "spag", seed: k, x, z, yaw: 0, tilt: [0, 0], y: base, h: 0.56, T, D: dropDur(x, z, base), S: [HOLE[0] + 0.8 * (h1(k + 3) - 0.5), 11.6, 0.8 * (h1(k + 9) - 0.5)], spin: [0, 0, 0] });
  hmapAdd(x, z, 0.32, base + 0.56, 0.56);
};
const buildFood = () => {
  if (FOODS.length) return;
  for (let iz = 0; iz < HNZ; iz++) for (let ix = 0; ix < HNX; ix++) HMAP[iz * HNX + ix] = Math.max(0.05, floorRest(HX0 + ix * HS, HZ0 + iz * HS));
  const peaAt = (k: number) => FOOD_T0 + 0.15 + 1.75 * (k / NPEA) + 0.05 * h1(k * 7 + 2);
  let pk = 0;
  FOOD_LIST.forEach(([kind, x0, z, yaw], i) => {
    let x = x0;
    const [r, h] = FOOD_DIM[kind]; x = Math.max(-6.4, x - 1.4);
    const T = FOOD_T0 + 0.115 * i;
    while (pk < NPEA && peaAt(pk) < T) { addPea(pk, peaAt(pk)); pk++; }
    const base = i === HERO_PIZZA ? 0.02 : Math.max(0.02, hmapMax(x, z, r * 0.55) - 0.28 * h);
    const tilt: [number, number] = i === HERO_PIZZA ? [0.3, 0] : [0.18 * (h1(i * 3) - 0.5), 0.18 * (h1(i * 5) - 0.5)];
    const S: V3 = [HOLE[0] + 0.5 * (h1(i + 11) - 0.5), 11.6, HOLE[1] + 0.5 * (h1(i + 17) - 0.5)];
    FOODS.push({ kind, seed: i + 1, x, z, yaw, tilt, y: base, h, T, D: dropDur(x, z, base), S, spin: [2.5 * (h1(i + 4) - 0.5), 3 * (h1(i + 6) - 0.5), 2.5 * (h1(i + 8) - 0.5)] });
    hmapAdd(x, z, r, base + h * (i === HERO_PIZZA ? 2.0 : 0.92), h);
  });
  while (pk < NPEA) { addPea(pk, peaAt(pk)); pk++; }
};
/** food state at shot time t into out = [x, y, z, sy, sxz, fallU (1 start .. 0 landed)]; false before it appears */
const foodState = (d: FoodDef, t: number, out: number[]) => {
  const t0 = d.T - DROP_A, tl = d.T + d.D;
  if (t < t0) return false;
  const H0: V3 = [HOLE[0] + (d.S[0] - HOLE[0]) * 0.3, 7.4, HOLE[1] + (d.S[2] - HOLE[1]) * 0.3];
  const v0: V3 = [(d.x - H0[0]) / d.D, (d.y - H0[1] + 0.5 * G_ACC * d.D * d.D) / d.D, (d.z - H0[2]) / d.D];
  if (t < d.T) { // inside the oesophagus: Hermite from S to the hole with the launch velocity
    const u = (t - t0) / DROP_A, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = 3 * u2 - 2 * u3, h11 = u3 - u2;
    for (let k = 0; k < 3; k++) out[k] = h00 * d.S[k] + h10 * DROP_A * (k === 1 ? -5 : 0) + h01 * H0[k] + h11 * DROP_A * v0[k];
    out[3] = 1.22; out[4] = 0.9; out[5] = 1;
  } else if (t < tl) {
    const tau = t - d.T;
    out[0] = H0[0] + v0[0] * tau; out[1] = H0[1] + v0[1] * tau - 0.5 * G_ACC * tau * tau; out[2] = H0[2] + v0[2] * tau;
    const u = tau / d.D; out[3] = 1 + 0.22 * (1 - smooth(u / 0.9)); out[4] = 1 / Math.sqrt(out[3]); out[5] = 1 - u;
  } else {
    const tau = t - tl;
    out[0] = d.x; out[1] = d.y; out[2] = d.z;
    const sq = 0.3 * Math.sin((Math.min(1, tau / 0.05) * Math.PI) / 2) * Math.exp(-5.5 * tau) * Math.cos(13 * tau);
    out[3] = 1 - sq; out[4] = 1 / Math.sqrt(Math.max(0.3, out[3])); out[5] = 0;
  }
  return true;
};

// ============================== exports ==============================
/** WORLD juice pool centre (surface) */
export const JUICE_AT: V3 = wl(POOL_C[0], POOL_C[1], POOL_C[2]);
/** WORLD air-bubble centre (radius 1.15; rides the wave up, squashes flat on squish) */
export const BUBBLE_AT: V3 = wl(...BUBBLE_L);
/** WORLD crew corner centre (floor) */
export const CORNER_AT: V3 = wl(...CORNER_L);
/** WORLD hammock bed points (lowest cloth point, where a sleeping crew member lies) */
export const HAMMOCKS: V3[] = HAM.map((h) => wl((h.a[0] + h.b[0]) / 2, (h.a[1] + h.b[1]) / 2 - 0.12 - h.sag + 0.1, (h.a[2] + h.b[2]) / 2));
export const ALARM_AT: V3 = wl(ALARM_L[0], ALARM_L[1] + 0.44, ALARM_L[2]);
export const WALL_CLOCK_AT: V3 = wl(-1.6, 2.75, 3.95);
export const SIGN_AT: V3 = wl(...SIGN_L);
export const OESO_AT: V3 = wl(HOLE[0], 8, HOLE[1]);
export const EXIT_AT: V3 = wl(7, 1.5, 0);
/** WORLD point for the cast's "GRRROWL" letters (centre of the cavern above the bubble) */
export const GROWL_AT: V3 = wl(0.6, 3.6, -0.8);
/** squeeze-wave centre x (WORLD) at GLOBAL time t (s): shot 2 wave 1 (bellyAt.squeeze, -6 -> +7), wave 2 (reaches the
 *  bubble x 1.5 exactly at W.squish), shot 3 (fullAt.squeeze2); parked at -6 when no wave runs */
export const SQUEEZE_X = (t: number) => BELLY[0] + waveAt(t).x;
/** the wave: x (WORLD), strength k (0..1), crestY = WORLD floor height on the crest (z -0.6) for surfing crew */
export const squeezeAt = (t: number) => { const w = waveAt(t); return { x: BELLY[0] + w.x, k: w.k, crestY: BELLY[1] + floorAt(w.x, -0.6, w) }; };
/** (cam integration) WORLD floor height at WORLD (x, z) and GLOBAL time t, with the squeeze hump (for the cast's feet) */
export const floorY = (x: number, z: number, t: number) => BELLY[1] + floorAt(x - BELLY[0], z - BELLY[2], waveAt(t));
const broomX = (t: number) => { const id = shotAt(Math.round(t * FPS)).id; if (id < 2) return BROOM_X0; if (id > 2) return BROOM_XMAX; const s = bellyAt(2, t).squeeze; return Math.min(BROOM_XMAX, Math.max(BROOM_X0, -6 + 13 * s + 1.7)); };
const broomAng = (t: number) => { const id = shotAt(Math.round(t * FPS)).id; if (id < 2) return 1.72; if (id > 2) return 1.05; return lerp(1.72, 1.05, smooth((t - (W.wakes + 0.6)) / 1.2)); };
/** (qa1) shot 2: the broom's head (3.6 m across z) and handle ran straight THROUGH the air bubble (z -2.15..0.15) and the
 *  crew through the surf lanes: the crew steer it to the camera side (z +2.0, head z 0.2..3.8) before it reaches the
 *  pool and back to its rest line only once it is past the bubble and parking at the exit (the handle then clears the
 *  bubble top). Rest line (BROOM_Z) unchanged at both ends, so shot 1/3 and the 2->3 seam are identical. */
const BROOM_DZ = 2.7;
const broomZ = (t: number) => {
  if (shotAt(Math.round(t * FPS)).id !== 2) return BROOM_Z;
  const x = broomX(t);
  return BROOM_Z + BROOM_DZ * smooth((x + 4.0) / 2.6) * (1 - smooth((x - 4.8) / 0.65));
};
/** WORLD push-broom: head (bottom centre) + grip (handle end, where the crew push) at GLOBAL time t */
export const broomAt = (t: number) => {
  const w = waveAt(t), x = broomX(t), z = broomZ(t), y = floorAt(x, z, w), a = broomAng(t);
  return { head: wl(x, y, z), grip: wl(x - 0.1 - 4.6 * Math.sin(a), y + 0.8 + 4.6 * Math.cos(a), z) };
};
/** WORLD top of the food pile at GLOBAL time t (BELLY floor before shot 3) */
export const FOOD_TOP = (t: number) => {
  if (shotAt(Math.round(t * FPS)).id !== 3) return BELLY[1];
  let m = 0; for (const d of FOODS) if (t >= d.T + d.D) m = Math.max(m, d.y + d.h);
  return BELLY[1] + m;
};
/** WORLD spot where the squashed crew member stands, under the raised tip of the hero pizza (thumbs-up) */
export const PIZZA_AT: V3 = wl(0.15, 0.0, 1.25);
/** WORLD top of the pile for the tiny muffled "mmf" bubble */
export const MUFFLE_AT: V3 = wl(-2.0, 3.6, 0.4);
type CamKey = { f: number; pos: V3; look: V3; fov: number };
/** tested camera keys (WORLD), f 102..778 (glide-interpolated between keys in the stills): dive down the oesophagus
 *  -> LAND wide (f130) -> crew corner (166-240) -> wide down the length for the squeeze (268-345) -> the bubble
 *  (420-505) -> pull back for the growl (560) -> shot 3 continuous: food pours in (640) -> the pile (700-778) */
export const BELLY_CAM_KEYS: CamKey[] = [
  { f: 102, pos: wl(-5.0, 10.4, 0.15), look: wl(-4.0, 3.0, 1.0), fov: 62 },
  { f: 130, pos: wl(4.8, 4.4, 2.8), look: wl(-4.0, 2.4, -0.3), fov: 62 },
  { f: 140, pos: wl(4.7, 4.35, 2.75), look: wl(-4.0, 2.4, -0.3), fov: 62 },
  { f: 166, pos: wl(-0.5, 2.5, -0.3), look: wl(-3.2, 1.25, 2.5), fov: 52 },
  { f: 240, pos: wl(-0.6, 2.6, -0.1), look: wl(-3.2, 1.25, 2.5), fov: 52 },
  { f: 268, pos: wl(-7.0, 4.4, 0.8), look: wl(2.5, 1.5, -0.8), fov: 60 },
  { f: 345, pos: wl(-6.6, 4.2, 0.9), look: wl(3.5, 1.5, -0.8), fov: 60 },
  { f: 420, pos: wl(-3.2, 2.8, 3.1), look: wl(1.5, 1.6, -1.0), fov: 54 },
  { f: 505, pos: wl(-3.0, 2.8, 3.1), look: wl(1.5, 1.6, -1.0), fov: 54 },
  { f: 560, pos: wl(4.4, 3.6, 1.8), look: wl(-2.0, 3.0, -0.6), fov: 62 },
  { f: 640, pos: wl(4.6, 4.3, 1.4), look: wl(-3.4, 3.2, -0.4), fov: 62 },
  { f: 700, pos: wl(4.6, 4.5, 1.2), look: wl(-4.0, 2.4, 0.0), fov: 70 },
  { f: 778, pos: wl(4.55, 4.5, 1.18), look: wl(-4.0, 2.4, 0.0), fov: 70 },
];

// ============================== shaders (pool, bubble, shaft) ==============================
const poolMat = () => new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uT: { value: 0 }, uGlow: { value: 1 } }]),
  fog: true,
  vertexShader: /* glsl */ `attribute float aQ; varying float vQ; varying vec3 vW; varying vec3 vN;
    #include <fog_pars_vertex>
    void main(){ vQ = aQ; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */ `uniform float uT, uGlow; varying float vQ; varying vec3 vW; varying vec3 vN;
    #include <fog_pars_fragment>
    ${GLSL_NOISE}
    void main(){
      vec2 p = vW.xz;
      float c1 = bCaus(p * 0.55, uT * 1.1), c2 = bCaus(p * 1.25 + 7.0, uT * 1.7);
      float sw = bFbm(p * 0.33 + vec2(uT * 0.12, -uT * 0.09));
      vec3 deep = vec3(0.16, 0.42, 0.03), mid = vec3(0.5, 0.86, 0.08), hi = vec3(1.25, 1.3, 0.32);
      vec3 col = mix(mid, deep, smoothstep(0.35, 0.95, vQ) * 0.55 + 0.25 * (1.0 - sw));
      col += hi * (0.5 * c1 + 0.28 * c2) * (0.75 + 0.5 * sw);
      float shore = smoothstep(0.8, 0.93, vQ);
      col = mix(col, vec3(1.25, 1.3, 0.55), shore * 0.75);
      vec3 V = normalize(cameraPosition - vW);
      float fr = pow(1.0 - abs(dot(normalize(vN), V)), 3.0);
      col = mix(col, vec3(1.05, 0.62, 0.52), fr * 0.4);
      float g = bH(floor(p * 5.0 + floor(uT * 3.0) * 0.17)); col += vec3(1.4, 1.4, 0.9) * step(0.985, g) * c1;
      gl_FragColor = vec4(col * uGlow, 1.0);
      #include <fog_fragment>
    }`,
});
const bubbleMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uHi: { value: 0 } },
  vertexShader: /* glsl */ `uniform float uT; varying vec3 vW; varying vec3 vN; varying vec3 vNv;
    void main(){ vec3 p = position * (1.0 + 0.025 * sin(position.y * 3.0 + uT * 4.0) + 0.02 * sin(position.x * 4.0 - uT * 3.3));
      vec4 w = modelMatrix * vec4(p, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vNv = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform float uT, uHi; varying vec3 vW; varying vec3 vN; varying vec3 vNv;
    ${GLSL_NOISE}
    void main(){
      vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
      float c = abs(dot(N, V)), fr = 1.0 - c;
      float band = fr * 2.6 + bFbm(vW.xy * 0.7 + vW.z * 0.5 + uT * 0.15) * 1.6 + uT * 0.25;
      vec3 iri = 0.55 + 0.45 * cos(6.2831 * (band + vec3(0.0, 0.33, 0.67)));
      vec3 col = mix(vec3(1.0, 0.92, 0.96), iri, 0.6);
      col += vec3(0.6, 1.0, 0.2) * smoothstep(-0.2, -0.9, N.y) * 0.5;
      float a = 0.16 + 0.7 * pow(fr, 1.6);
      vec3 Nv = normalize(vNv); if (!gl_FrontFacing) Nv = -Nv;
      float h = dot(Nv, normalize(vec3(-0.45, 0.5, 0.74)));
      float sp = smoothstep(0.955, 0.968, h);
      float h2 = dot(Nv, normalize(vec3(0.42, -0.35, 0.84)));
      sp = max(sp, smoothstep(0.985, 0.99, h2) * 0.85);
      float arc = smoothstep(0.80, 0.83, h) * (1.0 - smoothstep(0.86, 0.89, h)) * step(0.0, -Nv.x + Nv.y);
      sp = max(sp, arc * 0.7);
      sp *= gl_FrontFacing ? 1.0 : 0.0;
      float ink = smoothstep(0.78, 0.86, fr) * (gl_FrontFacing ? 1.0 : 0.0);
      col = mix(col * (1.0 + 0.8 * uHi), vec3(1.6), sp);
      a = max(a, sp);
      col = mix(col, vec3(0.06, 0.01, 0.04), ink); a = max(a, ink * 0.95);
      if (!gl_FrontFacing) a *= 0.45;
      gl_FragColor = vec4(col, a);
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const shaftMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uK: { value: 1 }, uCol: { value: new THREE.Color(1.0, 0.82, 0.58) } },
  vertexShader: /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform float uT, uK; uniform vec3 uCol; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    ${GLSL_NOISE}
    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float c = abs(dot(normalize(vN), V));
      float streak = 0.6 + 0.4 * bN(vec2(vUv.x * 18.0, vUv.y * 1.5 - uT * 0.25));
      float a = pow(c, 1.6) * smoothstep(0.0, 0.35, vUv.y) * (0.35 + 0.65 * vUv.y) * streak;
      float dc = length(cameraPosition - vW);
      a *= smoothstep(0.8, 3.0, dc);
      gl_FragColor = vec4(uCol * a * 0.12 * uK, 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});

// ============================== Belly ==============================
const NMOTE = 46, NPOOLB = 14, NRING = 6, NALR = 3;
export class Belly {
  root = new THREE.Group();
  private shellGeo!: THREE.BufferGeometry; private rest!: Float32Array; private pinchW!: Float32Array; private ringOf!: Uint16Array;
  private ringC: { y: number; z: number }[] = []; private ringX: number[] = []; private shellDirty = false;
  private pool!: THREE.Mesh; private poolRest!: Float32Array; private poolU!: { uT: { value: number }; uGlow: { value: number } };
  private poolBub!: THREE.InstancedMesh;
  private bubble = new THREE.Group(); private bubU: { uT: { value: number }; uHi: { value: number } }[] = []; private bubSat: THREE.Mesh[] = [];
  private shaftU!: { uT: { value: number }; uK: { value: number } };
  private hams: THREE.Group[] = [];
  private alarm!: { G: THREE.Group; body: THREE.Group; hammer: THREE.Group };
  private wclock!: { G: THREE.Group; hour: THREE.Group; min: THREE.Group };
  private broom!: { G: THREE.Group; handle: THREE.Group };
  private corner = new THREE.Group();
  private crumbs: THREE.Mesh[] = []; private crumbDef: { x: number; z: number; k: number; s: number }[] = [];
  private foods: THREE.Group[] = []; private peas!: THREE.InstancedMesh;
  private motes: THREE.Sprite[] = []; private rings: THREE.Sprite[] = []; private alarmRings: THREE.Sprite[] = []; private pops: THREE.Sprite[] = [];
  private alarmGlow!: THREE.Sprite; private bulbs!: THREE.InstancedMesh;
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3();
  private fs = [0, 0, 0, 0, 0, 0];

  constructor() {
    const R = this.root;
    R.position.set(...BELLY);
    R.visible = false;
    const add = (o: THREE.Object3D, cast = false, recv = true) => { o.traverse((c) => { c.frustumCulled = false; }); o.castShadow = cast; o.receiveShadow = recv; R.add(o); return o; };
    this.buildShell(add);
    buildFood();

    // ---------------- juice pool ----------------
    {
      const NR = 26, NA = 120, P: number[] = [], Q: number[] = [], idx: number[] = [];
      for (let i = 0; i <= NR; i++) for (let j = 0; j <= NA; j++) {
        const q = (i / NR) * 0.97, a = (j / NA) * TAU, r = q * poolR(a);
        P.push(POOL_C[0] + Math.cos(a) * r, POOL_C[1], POOL_C[2] + Math.sin(a) * r * POOL_ZS); Q.push(q);
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("aQ", new THREE.Float32BufferAttribute(Q, 1));
      g.setIndex(idx); g.computeVertexNormals();
      if (g.getAttribute("normal").getY((NA + 1) * 5 + 3) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
      const m = poolMat(); this.poolU = m.uniforms as never;
      this.pool = new THREE.Mesh(g, m); this.poolRest = new Float32Array(P);
      add(this.pool, false, false);
      this.poolBub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 16, 10, 0, TAU, 0, Math.PI / 2), bmat("glow", { color: "#b6f03a", spec: 0.9, shin: 90, emissive: new THREE.Color(0.25, 0.5, 0.05), rim: [0.3, 0.4, 0.1] }), NPOOLB);
      add(this.poolBub, false, false);
    }

    // ---------------- oesophagus: sphincter ring + tube + light shaft ----------------
    {
      const D = dims(HOLE[0]), ry = D.cy + D.Bu - 0.12;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(HOLE_R + 0.1, 0.42, 20, 64), bmat("shell", { color: "#ea6f7c", spec: 0.5, shin: 50, rim: [0.36, 0.12, 0.14] }));
      ring.rotation.x = Math.PI / 2; ring.position.set(HOLE[0], ry, HOLE[1]); add(ring, false, true);
      const pts = catmull3([[HOLE[0], ry - 0.5, 0], [HOLE[0], ry + 1.6, 0], [HOLE[0] - 0.4, ry + 3.6, 0], [HOLE[0] - 2.2, ry + 5.4, 0], [HOLE[0] - 4.6, ry + 6.2, 0]], 0.2);
      const cA = C("#f39aa0"), cB = C("#ffe2c4");
      const tube = new THREE.Mesh(tubeGeo(pts, (u) => HOLE_R + 0.05 - 0.25 * u + 0.08 * Math.sin(u * 40), 40, (u, a) => cA.clone().lerp(cB, smooth((u - 0.25) / 0.6)).multiplyScalar(1 + 0.08 * Math.sin(a * 9 + u * 30))),
        bmat("shell", { vc: true, side: THREE.BackSide, spec: 0.4, shin: 40, emissive: new THREE.Color(0.18, 0.1, 0.06) }));
      add(tube, false, true);
      const sg = new THREE.CylinderGeometry(1.55, 3.3, ry + 3.2, 48, 1, true); sg.translate(0, (ry + 3.2) / 2, 0);
      const sm = shaftMat(); this.shaftU = sm.uniforms as never;
      const shaft = new THREE.Mesh(sg, sm); shaft.position.set(HOLE[0] - 0.2, 0, HOLE[1] + 0.15); shaft.rotation.z = -0.03;
      shaft.layers.set(NOINK); shaft.renderOrder = 6; add(shaft, false, false);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.6, 1.25, 0.85), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      glow.position.set(HOLE[0] - 0.3, ry + 2.6, 0); glow.scale.setScalar(4.2); glow.layers.set(NOINK); add(glow, false, false);
    }

    // ---------------- pylorus: sphincter + EXIT sign ----------------
    {
      const x = 6.95, D = dims(x);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(Math.min(D.A, D.Bu) - 0.05, 0.36, 18, 56), bmat("plain", { color: "#c8505e", spec: 0.5, shin: 50, rim: [0.36, 0.12, 0.14] }));
      ring.rotation.y = Math.PI / 2; ring.position.set(x, D.cy, D.cz); add(ring, false, true);
      const sg = new THREE.Group();
      sg.add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.86, 1.72), bmat("plain", { color: "#1c1a22", spec: 0.3 })));
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: exitTex(), color: new THREE.Color(1.25, 1.25, 1.25) }));
      face.rotation.y = -Math.PI / 2; face.position.x = -0.075; sg.add(face);
      const D2 = dims(EXIT_SIGN_L[0]), top = D2.cy + D2.Bu, len = top - EXIT_SIGN_L[1];
      for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), bmat("plain", { color: "#2a2430" })); ch.position.set(0, len / 2 + 0.2, s * 0.6); sg.add(ch); }
      sg.position.set(...EXIT_SIGN_L); add(sg, true, true);
      const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(0.2, 1.0, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
      eg.position.set(EXIT_SIGN_L[0] - 0.3, EXIT_SIGN_L[1], 0); eg.scale.setScalar(3.0); eg.layers.set(NOINK); add(eg, false, false);
    }

    // ---------------- air bubble (+ 2 small satellites) ----------------
    {
      const g = new THREE.SphereGeometry(1, 64, 44);
      const m = bubbleMat(); this.bubU.push(m.uniforms as never);
      const b = new THREE.Mesh(g, m); b.layers.set(NOINK); b.renderOrder = 9; this.bubble.add(b);
      for (const [x, y, z, r] of [[1.15, -0.62, 0.55, 0.36], [-1.0, -0.78, 0.7, 0.24]] as [number, number, number, number][]) {
        const m2 = bubbleMat(); this.bubU.push(m2.uniforms as never);
        const s = new THREE.Mesh(g, m2); s.position.set(x, y, z); s.scale.setScalar(r / BUBBLE_R); s.layers.set(NOINK); s.renderOrder = 9; this.bubble.add(s); this.bubSat.push(s);
      }
      this.bubble.position.set(...BUBBLE_L); this.bubble.scale.setScalar(BUBBLE_R);
      add(this.bubble, false, false);
    }

    // ---------------- crew corner ----------------
    {
      const K = this.corner;
      for (const p of POSTS) { const o = post(POST_H); o.position.set(p[0], floorRest(p[0], p[2]) - 0.02, p[2]); K.add(o); }
      const hm = bmat("plain", { map: hammockTex(), spec: 0.15, shin: 20, side: THREE.DoubleSide, rim: [0.3, 0.2, 0.2] });
      const rope = bmat("plain", { color: "#e8d6b0", spec: 0.1 });
      HAM.forEach((h) => {
        const mid: V3 = [(h.a[0] + h.b[0]) / 2, (h.a[1] + h.b[1]) / 2, (h.a[2] + h.b[2]) / 2];
        const piv = new THREE.Group(); piv.position.set(...mid);
        const rel = (p: V3): V3 => [p[0] - mid[0], p[1] - mid[1], p[2] - mid[2]];
        const inA = rel(h.a), inB = rel(h.b);
        const ga: V3 = [inA[0] * 0.88, inA[1] - 0.12, inA[2] * 0.88], gb: V3 = [inB[0] * 0.88, inB[1] - 0.12, inB[2] * 0.88];
        piv.add(new THREE.Mesh(hammockGeo(ga, gb, h.sag, 0.95), hm));
        for (const [p, q] of [[inA, ga], [inB, gb]] as [V3, V3][]) for (const s of [-1, 1]) {
          const dx = gb[0] - ga[0], dz = gb[2] - ga[2], L = Math.hypot(dx, dz), px = (-dz / L) * 0.3 * s, pz = (dx / L) * 0.3 * s;
          piv.add(new THREE.Mesh(tubeGeo([p, [q[0] + px, q[1], q[2] + pz]], () => 0.022, 5), rope));
        }
        this.hams.push(piv); K.add(piv);
      });
      const cr = crate(); cr.position.set(CRATE_L[0], floorRest(CRATE_L[0], CRATE_L[2]), CRATE_L[2]); cr.rotation.y = 0.35; K.add(cr);
      const rug = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40).rotateX(-Math.PI / 2), bmat("plain", { color: "#3a8ee8", spec: 0.1 })); rug.scale.set(1.5, 1, 1); rug.position.set(CRATE_L[0], floorRest(CRATE_L[0], CRATE_L[2]) + 0.035, CRATE_L[2]); K.add(rug);
      this.alarm = alarmClock(); this.alarm.G.position.set(ALARM_L[0], floorRest(CRATE_L[0], CRATE_L[2]) + ALARM_L[1], ALARM_L[2]); this.alarm.G.rotation.y = 2.3; K.add(this.alarm.G);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.22, 16), bmat("plain", { color: "#ffffff", spec: 0.6 })); mug.position.set(CRATE_L[0] - 0.3, 0.86, CRATE_L[2] + 0.15); K.add(mug);
      this.wclock = wallClock(); this.wclock.G.position.set(WALL_CLOCK_AT[0] - BELLY[0], WALL_CLOCK_AT[1], WALL_CLOCK_AT[2]); this.wclock.G.rotation.y = Math.PI + 0.25; K.add(this.wclock.G);
      { const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.9), woodMat()); br.position.set(WALL_CLOCK_AT[0] - BELLY[0] + 0.12, WALL_CLOCK_AT[1], WALL_CLOCK_AT[2] + 0.5); br.rotation.y = 0.25; K.add(br); }
      {
        const sg = new THREE.Group(), tm = bmat("plain", { map: signTex(), spec: 0.04, shin: 30, caus: 0, rim: [0.1, 0.05, 0.04] }) /* (qa1) was spec 0.3: the highlight washed the black "CLEANING CREW" letters out */, bk = bmat("wood", { color: "#c8854a" });
        sg.add(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.66, 0.07), [bk, bk, bk, bk, tm, bk]));
        sg.position.set(...SIGN_L); sg.rotation.y = SIGN_YAW; K.add(sg);
      }
      for (const [x, z, a] of [[-5.95, 3.75, 0.2], [-5.6, 3.95, -0.25], [-0.5, 3.7, 0.15]] as [number, number, number][]) { const w = new THREE.Group(); w.add(mop(a)); w.position.set(x, floorRest(x, z), z); w.rotation.x = 0.22; K.add(w); }
      { const b = bucket("#ffcf3a"); b.position.set(-1.5, floorRest(-1.5, 2.0), 2.0); K.add(b); const b2 = bucket("#3a8ee8"); b2.position.set(-5.0, floorRest(-5.0, 2.1), 2.1); K.add(b2); }
      {
        const pts: V3[] = [], bl: V3[] = [];
        for (let k = 0; k < POSTS.length - 1; k++) {
          const a = POSTS[k], b = POSTS[k + 1];
          for (let i = 0; i <= 20; i++) { const u = i / 20; const p: V3 = [lerp(a[0], b[0], u), POST_H + 0.02 - 0.32 * Math.sin(Math.PI * u), lerp(a[2], b[2], u)]; if (i || !k) pts.push(p); if (i % 3 === 1) bl.push([p[0], p[1] - 0.08, p[2]]); }
        }
        K.add(new THREE.Mesh(tubeGeo(pts, () => 0.018, 5), bmat("plain", { color: "#2a2430" })));
        this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) }), bl.length);
        const cols = [C("#ffd24a"), C("#ff6a8a"), C("#7ae0ff"), C("#9aff6a")];
        bl.forEach((p, i) => { this.m4.makeTranslation(p[0], p[1], p[2]); this.bulbs.setMatrixAt(i, this.m4); this.bulbs.setColorAt(i, cols[i % 4].clone().multiplyScalar(1.8)); });
        this.bulbs.layers.set(NOINK); K.add(this.bulbs);
      }
      K.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.layers.mask !== 1 << NOINK) { o.castShadow = true; o.receiveShadow = true; } o.frustumCulled = false; });
      R.add(K);
    }

    // ---------------- broom ----------------
    this.broom = pushBroom();
    add(this.broom.G, true, true);

    // ---------------- crumbs ----------------
    {
      const geos = crumbGeos(), mat = bmat("food", { vc: true, spec: 0.25, shin: 24, rim: [0.3, 0.18, 0.08] });
      const spots: [number, number][] = [[-3.9, -1.9], [-3.4, 0.6], [-3.1, -0.9], [3.4, -1.6], [3.9, 0.3], [4.4, -0.8], [4.9, -2.0], [5.1, 0.7], [3.6, 0.95], [-1.4, -1.6], [0.4, 0.5], [2.2, -0.4], [4.2, -2.2], [-3.7, 0.0]];
      spots.forEach(([x, z], i) => {
        const m = new THREE.Mesh(geos[i % 3], mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
        this.crumbs.push(m); this.crumbDef.push({ x, z, k: i, s: 0.8 + 0.5 * h1(i * 3 + 1) }); R.add(m);
      });
    }

    // ---------------- food ----------------
    FOODS.forEach((d) => { const g = FOOD_MAKERS[d.kind](d.seed); g.traverse((o) => { o.frustumCulled = false; }); g.visible = false; this.foods.push(g); R.add(g); });
    this.peas = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 18, 12), bmat("food", { color: "#6cc63a", spec: 0.6, shin: 70, rim: [0.2, 0.32, 0.08] }), NPEA);
    this.peas.castShadow = true; this.peas.receiveShadow = true; this.peas.frustumCulled = false; R.add(this.peas);

    // ---------------- NOINK effects ----------------
    const sprite = (map: THREE.Texture, color: THREE.Color, additive: boolean, order: number) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, depthWrite: false, fog: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = order; s.visible = false; R.add(s); return s;
    };
    for (let i = 0; i < NMOTE; i++) this.motes.push(sprite(softTex(), new THREE.Color(1.3, 1.0, 0.7), true, 4));
    for (let i = 0; i < NRING; i++) this.rings.push(sprite(ringTex(), new THREE.Color(1, 1, 1), false, 10));
    for (let i = 0; i < NALR; i++) this.alarmRings.push(sprite(ringTex(), new THREE.Color(1, 1, 1), false, 10));
    for (let i = 0; i < NPOOLB; i++) this.pops.push(sprite(ringTex(), new THREE.Color(0.8, 1.2, 0.5), false, 7));
    this.alarmGlow = sprite(softTex(), new THREE.Color(2.0, 0.4, 0.3), true, 5);
  }

  private buildShell(add: (o: THREE.Object3D, cast?: boolean, recv?: boolean) => THREE.Object3D) {
    const NA = 200, xs: number[] = [];
    for (let x = X0; x <= X1 + 1e-6; x += 0.11) xs.push(x);
    const nr = xs.length, nv = nr * (NA + 1);
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), pw = new Float32Array(nv), ro = new Uint16Array(nv), sn = new Float32Array(nv);
    const tc = new THREE.Color();
    const floorC = C("#f8ae8c"), wallC = C("#f79482"), roofC = C("#f797a6"), crest = C("#ffdcc0"), valley = C("#a83852"), tun = C("#a83448"), tun2 = C("#4a0e1e"), fund = C("#e8737e");
    xs.forEach((x, i) => {
      const D = dims(x);
      this.ringX.push(x); this.ringC.push({ y: D.cy, z: D.cz });
      for (let j = 0; j <= NA; j++) {
        const th = -Math.PI / 2 + (j / NA) * TAU, c = Math.cos(th), s = Math.sin(th), up = s > 0;
        const e = up ? D.eu : D.el, B = up ? D.Bu : D.Bl;
        let pz = D.A * Math.sign(c) * Math.abs(c) ** e, py = B * Math.sign(s) * Math.abs(s) ** e;
        let amp = 0.62 * smooth((s + 0.95) / 0.3) * (up ? 1 - 0.45 * smooth(s) : 1) * (0.8 + 0.2 * Math.sin(x * 0.7 + th * 3)) * lerp(1, 0.32, exitK(x)) * capK(x) ** 2 * smooth((x + 9.2) / 1.8);
        const hx = x - HOLE[0], hz = pz + D.cz - HOLE[1];
        if (up) amp *= smooth((Math.hypot(hx, hz) - HOLE_R - 0.2) / 1.2);
        amp *= 1 - Math.exp(-(((x + 1.6) / 1.0) ** 2)) * Math.exp(-((s / 0.32) ** 2)) * smooth((c - 0.6) / 0.25); // smooth patch for the wall clock
        const ph = (th * NF) / TAU + 0.35 * Math.sin(0.42 * x + 2.0 * th) + 0.18 * Math.sin(1.15 * x - 3 * th + 1);
        const fold = Math.pow(0.5 + 0.5 * Math.cos(TAU * ph), 1.8);
        const und = 0.12 * vn(x * 0.4 + th * 2, th * 3 + 5) * smooth((s + 0.85) / 0.3) * capK(x) ** 2 * smooth((x + 9.2) / 1.8);
        const rr = Math.hypot(pz, py) || 1, off = -amp * fold + und;
        pz += (pz / rr) * off; py += (py / rr) * off;
        let y = D.cy + py; const z = D.cz + pz;
        if (s < -0.8) y += basin(x, z) * smooth((-s - 0.8) / 0.1) * (1 - exitK(x));
        const v = i * (NA + 1) + j, k = v * 3;
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
        pw[v] = pinchA(pz / D.A, py / B); ro[v] = i; sn[v] = s;
        tc.copy(wallC).lerp(floorC, smooth((-s - 0.4) / 0.5)).lerp(roofC, smooth((s - 0.2) / 0.6));
        const ak = clamp01(amp / 0.3);
        tc.lerp(crest, 0.7 * fold * fold * ak).lerp(valley, 0.62 * (1 - fold) ** 2 * ak);
        tc.multiplyScalar(1 + 0.07 * vn(x * 0.8 + 7, th * 4));
        tc.lerp(fund, 0.6 * (1 - smooth((x + 8.6) / 1.6)));
        tc.lerp(tun, smooth((x - 5.2) / 2.0)).lerp(tun2, smooth((x - 8.0) / 3.5));
        col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b;
        if (s < -0.3) {
          const gx = Math.round((x - GX0) / GS), gz = Math.round((z - GZ0) / GS);
          if (gx >= 0 && gx < GNX && gz >= 0 && gz < GNZ) FLOOR[gz * GNX + gx] = Math.min(FLOOR[gz * GNX + gx], y);
        }
      }
    });
    for (let it = 0; it < 60; it++) {
      let miss = 0;
      for (let gz = 0; gz < GNZ; gz++) for (let gx = 0; gx < GNX; gx++) {
        const i = gz * GNX + gx; if (FLOOR[i] < 98) continue;
        let s = 0, n = 0;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = gx + a, z = gz + b; if (x >= 0 && x < GNX && z >= 0 && z < GNZ && FLOOR[z * GNX + x] < 98) { s += FLOOR[z * GNX + x]; n++; } }
        if (n) FLOOR[i] = s / n + 1e-3; else miss++;
      }
      if (!miss) break;
    }
    const idx: number[] = [];
    const inHole = (v: number) => sn[v] > 0.5 && Math.hypot(pos[v * 3] - HOLE[0], pos[v * 3 + 2] - HOLE[1]) < HOLE_R;
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1;
      if (inHole(a) || inHole(b) || inHole(c) || inHole(d)) continue;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const ti = Math.floor(nr * 0.3) * (NA + 1) + 2; // a floor vertex near the bottom of a body ring: its normal must point up
    if ((g.getAttribute("normal") as THREE.BufferAttribute).getY(ti) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
    this.shellGeo = g; this.rest = new Float32Array(pos); this.pinchW = pw; this.ringOf = ro;
    add(new THREE.Mesh(g, bmat("shell", { vc: true, spec: 0.42, shin: 38, rim: [0.4, 0.16, 0.14] })), false, true);
  }

  /** (qa1) the height of the REAL (deformed) shell floor at local (x, z): the shell pinches every vertex toward its ring
   *  centre in y AND z with its own weight, so the analytic floorAt drifts from the mesh; the shot-2 juice pool rides on
   *  this so the hump never pokes through it. Floor vertices = ring indices j 167..200 then 0..33 (z ascending). */
  private shellFloorY(x: number, z: number) {
    const A = (this.shellGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array, NA = 200, rx = this.ringX;
    const fi = Math.max(0, Math.min(rx.length - 1.001, (x - X0) / 0.11)), i0 = Math.floor(fi), u = fi - i0;
    const ringY = (i: number) => {
      let pz = -1e9, py = 0;
      for (let q = 0; q <= 67; q++) {
        const j = q <= 33 ? 167 + q : q - 33, k = (i * (NA + 1) + j) * 3, zz = A[k + 2], yy = A[k + 1];
        if (zz >= z) return pz < -1e8 ? yy : py + ((yy - py) * (z - pz)) / Math.max(1e-6, zz - pz);
        pz = zz; py = yy;
      }
      return py;
    };
    return lerp(ringY(i0), ringY(Math.min(rx.length - 1, i0 + 1)), u);
  }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 2 || id === 3;
    if (!R.visible) return;
    if (DEBUG) this.debugCam(f, cam);
    const st = bellyAt(2, t), fu = fullAt(3, t), w = waveAt(t);
    BU.uT.value = t;

    // ---------- shell squeeze ----------
    if (w.k > 0.001) {
      const P = this.shellGeo.getAttribute("position") as THREE.BufferAttribute, A = P.array as Float32Array, Rr = this.rest, pw = this.pinchW, ro = this.ringOf;
      const envR = this.ringX.map((x) => w.k * env(x - w.x));
      for (let v = 0, n = pw.length; v < n; v++) {
        const i = ro[v], e = envR[i];
        if (Math.abs(e) < 1e-4) { A[v * 3 + 1] = Rr[v * 3 + 1]; A[v * 3 + 2] = Rr[v * 3 + 2]; continue; }
        const c = this.ringC[i], s = 1 - e * pw[v];
        A[v * 3 + 1] = c.y + (Rr[v * 3 + 1] - c.y) * s; A[v * 3 + 2] = c.z + (Rr[v * 3 + 2] - c.z) * s;
      }
      P.needsUpdate = true; this.shellGeo.computeVertexNormals(); this.shellDirty = true;
    } else if (this.shellDirty) {
      const P = this.shellGeo.getAttribute("position") as THREE.BufferAttribute; (P.array as Float32Array).set(this.rest); P.needsUpdate = true; this.shellGeo.computeVertexNormals(); this.shellDirty = false;
    }
    BU.uSq.value.set(BELLY[0] + w.x, w.k, w.glow);

    // ---------- juice pool (rises over the wave hump) + bubbles ----------
    {
      const P = this.pool.geometry.getAttribute("position") as THREE.BufferAttribute, A = P.array as Float32Array, Rr = this.poolRest;
      for (let v = 0; v < A.length / 3; v++) {
        const x = Rr[v * 3], z = Rr[v * 3 + 2];
        let y = POOL_C[1] + 0.025 * Math.sin(x * 1.3 + t * 2.1) * Math.sin(z * 1.1 - t * 1.7);
        if (w.k > 0.001) y = Math.max(y, (id === 2 ? Math.max(floorAt(x, z, w), this.shellFloorY(x, z) + 0.04) : floorAt(x, z, w)) + 0.07 + 0.1 * w.k * Math.exp(-(((x - w.x - 0.9) / 0.9) ** 2))); // (qa1) shot 2 only
        A[v * 3 + 1] = y;
      }
      P.needsUpdate = true; this.pool.geometry.computeVertexNormals();
      this.poolU.uT.value = t;
      this.poolU.uGlow.value = (id === 3 ? 1 - 0.3 * fu.fill : 1) * (1 + 0.25 * Math.exp(-(((t - W.juice) / 0.35) ** 2)));
      for (let i = 0; i < NPOOLB; i++) {
        const per = 1.6 + 1.3 * h1(i * 5 + 1), ph = (((t + per * h1(i * 7 + 3)) / per) % 1 + 1) % 1;
        const a = h1(i * 11 + 2) * TAU, q = 0.15 + 0.65 * Math.sqrt(h1(i * 13 + 4)), r = q * poolR(a);
        const x = POOL_C[0] + Math.cos(a) * r, z = POOL_C[2] + Math.sin(a) * r * POOL_ZS;
        const grow = smooth(ph / 0.85), popK = smooth((ph - 0.85) / 0.06), rad = (0.12 + 0.2 * h1(i + 9)) * grow * (1 - popK) + 1e-4;
        const y = POOL_C[1] + (w.k > 0.001 ? Math.max(0, floorAt(x, z, w) + 0.07 - POOL_C[1]) : 0);
        this.m4.compose(this.v1.set(x, y, z), this.q.identity(), this.v2.set(rad, rad * 0.8, rad)); this.poolBub.setMatrixAt(i, this.m4);
        const pr = this.pops[i], pp = (ph - 0.88) / 0.12;
        pr.visible = pp > 0 && pp < 1;
        if (pr.visible) { pr.position.set(x, y + 0.05, z); pr.scale.setScalar(0.3 + 0.9 * pp); (pr.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - pp); }
      }
      this.poolBub.instanceMatrix.needsUpdate = true;
    }

    // ---------- air bubble ----------
    {
      const rise = Math.max(0, floorAt(BUBBLE_L[0], BUBBLE_L[2], w) - floorRest(BUBBLE_L[0], BUBBLE_L[2]));
      const tq = t - (W.squish - 0.12);
      const sqA = id === 2 ? spr(tq, 4.2, 15) * (1 - smooth((t - W.squish - 0.35) / 0.7)) : 0;
      const jig = id === 2 ? 0.12 * wob(t - (W.squish + 0.6), 3.0, 12) : 0;
      const ride = 0.08 * w.k * Math.sin((BUBBLE_L[0] - w.x) * 1.8);
      const sy = (1 - 0.55 * sqA + jig + ride) * (1 + 0.03 * Math.sin(t * 2.3)), sxz = 1 / Math.sqrt(Math.max(0.35, sy));
      this.bubble.scale.set(BUBBLE_R * sxz * (1 + 0.02 * Math.sin(t * 1.9)), BUBBLE_R * sy, BUBBLE_R * sxz);
      this.bubble.position.set(BUBBLE_L[0], BUBBLE_L[1] - BUBBLE_R * (1 - sy) + rise * (1 - 0.5 * sqA), BUBBLE_L[2]);
      const hi = id === 2 ? st.bubble * Math.exp(-(((t - W.air) / 0.5) ** 2)) : 0;
      this.bubU.forEach((u) => { u.uT.value = t; u.uHi.value = hi; });
      this.bubSat.forEach((s, i) => { s.position.y = (i ? -0.78 : -0.62) + 0.04 * Math.sin(t * 2.5 + i); });
      this.bubble.visible = id === 2 || fu.fill < 0.6;
    }

    // ---------- echo: inked sound rings + glowing rings over the walls ----------
    {
      const ec = id === 2 || id === 3 ? st.echo : 0, gr = id === 2 || id === 3 ? Math.exp(-(((t - W.growl - 0.1) / 0.35) ** 2)) * st.growl : 0; // (cam) continues across the 2->3 seam (same cavern, no dissolve)
      const t0 = W.squish - 0.05, Wd = 5.2, v = 6.5;
      const bp = this.bubble.position;
      const rad = (k: number) => { const tt = t - t0 - k * 0.32; if (tt < 0) return -9; const d = v * tt; const b = Math.floor(d / Wd); const r = d - b * Wd; return b % 2 ? Wd - r : r; };
      const ecK = Math.max(ec * (1 - smooth((t - (W.echoes + 1.6)) / 0.8)), gr) * ((id === 2 || id === 3) && t > t0 ? 1 : 0);
      BU.uEc.value.set(BELLY[0] + bp.x, bp.y, bp.z, ecK);
      BU.uEcR.value.set(rad(0), rad(1), rad(2), rad(3));
      this.rings.forEach((s, i) => {
        if (i === 5) return;
        const tt = t - t0 - i * 0.3, life = 1.5, u = tt / life;
        s.visible = id === 2 && ec > 0.01 && u > 0 && u < 1;
        if (!s.visible) return;
        const back = i % 2 === 1; // odd rings: the bounce, converging back from the walls
        const sc = back ? lerp(8, 2.6, smooth(u)) : lerp(2.4, 8, 1 - (1 - u) ** 2);
        s.position.copy(bp); s.scale.setScalar(sc);
        (s.material as THREE.SpriteMaterial).opacity = ec * smooth(u / 0.12) * (1 - smooth((u - 0.6) / 0.4)) * (back ? 0.7 : 1);
      });
      const r5 = this.rings[5]; // growl: one big slow ring
      const tt5 = t - (W.growl - 0.1), u5 = tt5 / 1.2;
      r5.visible = (id === 2 || id === 3) && u5 > 0 && u5 < 1; // (cam) continues across the 2->3 seam (same cavern, no dissolve)
      if (r5.visible) { r5.position.copy(bp); r5.position.y += 1.6; r5.scale.setScalar(lerp(3, 7.5, 1 - (1 - u5) ** 2)); (r5.material as THREE.SpriteMaterial).opacity = smooth(u5 / 0.1) * (1 - smooth((u5 - 0.5) / 0.5)); }
    }

    // ---------- crew corner: alarm, hammocks, wall clock ----------
    {
      const al = id === 2 ? st.alarm : 0, par = f % 2 === 0 ? 1 : -1;
      this.alarm.body.rotation.set(0, 0, al * 0.12 * par);
      this.alarm.body.position.set(al * 0.03 * par, 0.44 + al * 0.05 * (0.5 + 0.5 * Math.sin(t * 40)), 0);
      this.alarm.hammer.rotation.z = al * 0.7 * par;
      const ap = this.v1.set(ALARM_L[0], ALARM_L[1] + 0.5, ALARM_L[2]);
      this.alarmRings.forEach((s, i) => {
        const ph = (((t * 2.6 + i / NALR) % 1) + 1) % 1;
        s.visible = al > 0.01; if (!s.visible) return;
        s.position.copy(ap); s.scale.setScalar(0.8 + 1.8 * ph); (s.material as THREE.SpriteMaterial).opacity = al * (1 - ph) * smooth(ph / 0.15);
      });
      this.alarmGlow.visible = al > 0.01;
      if (this.alarmGlow.visible) { this.alarmGlow.position.copy(ap); this.alarmGlow.scale.setScalar(2.4); (this.alarmGlow.material as THREE.SpriteMaterial).opacity = al * (0.35 + 0.15 * par); }
      const wk = id === 2 ? t - W.wakes : 99;
      this.hams.forEach((h, i) => {
        const sway = id === 2 && wk < 0 ? 0.04 * Math.sin(t * 1.6 + i * 1.3) : 0;
        const swing = id === 2 ? 0.42 * wob(wk - i * 0.08, 1.6, 6.5) : 0;
        const a = HAM[i].a, b = HAM[i].b, ax = this.v2.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
        h.quaternion.setFromAxisAngle(ax, sway + swing);
      });
      const ck = id === 2 ? st.clock : 1;
      this.wclock.min.rotation.z = -(0.4 + ck * 9) * TAU;
      this.wclock.hour.rotation.z = -(11.6 / 12 + ck * 0.75) * TAU;
      this.corner.position.y = Math.max(0, floorAt(CORNER_L[0], CORNER_L[2], w) - floorRest(CORNER_L[0], CORNER_L[2]));
    }

    // ---------- broom + crumbs ----------
    {
      const bx = broomX(t), bz = broomZ(t), by = floorAt(bx, bz, w), a = broomAng(t);
      const tilt = Math.atan2(floorAt(bx + 0.4, bz, w) - floorAt(bx - 0.4, bz, w), 0.8);
      this.broom.G.position.set(bx, by - 0.02, bz); this.broom.G.rotation.set(0, 0, tilt);
      this.broom.handle.rotation.set(0, 0, a - tilt);
      const sw = id === 2 ? st.sweep : id === 3 ? 1 : 0, fling = smooth((sw - 0.55) / 0.45);
      const front = bx + 0.42;
      this.crumbs.forEach((m, i) => {
        const d = this.crumbDef[i];
        const inBroom = d.z > BROOM_Z - 1.75 && d.z < BROOM_Z + 1.75;
        let x = d.x;
        if (inBroom && id >= 2) x = Math.max(d.x, front + 0.28 * d.s + 0.15 * (i % 3)) + 7.2 * fling * (0.85 + 0.3 * h1(i));
        const zt = inBroom ? lerp(d.z, czAt(x) + 0.5 * (h1(i + 2) - 0.5), smooth((x - 5.4) / 2)) : d.z;
        const y = floorAt(x, zt, w) + 0.2 * d.s;
        const gone = smooth((x - 11.6) / 0.8);
        m.visible = gone < 0.999 && id >= 2 && !(id === 3 && fu.fill > 0.5 && x < 3);
        m.position.set(x, y, zt);
        m.rotation.set(h1(i) * 3, h1(i + 5) * 3, -(x - d.x) / (0.3 * d.s));
        m.scale.setScalar(d.s * (1 - gone) + 1e-4);
      });
    }

    // ---------- food (shot 3) ----------
    {
      const on = id === 3;
      const bob = (x: number, z: number) => (w.k > 0.001 ? Math.max(0, floorAt(x, z, w) - floorRest(x, z)) : 0);
      FOODS.forEach((d, i) => {
        const g = this.foods[i];
        g.visible = on && foodState(d, t, this.fs);
        if (!g.visible) return;
        const s = this.fs, u = s[5], b = bob(s[0], s[2]);
        g.position.set(s[0], s[1] + b, s[2]);
        g.rotation.set(d.tilt[0] + d.spin[0] * u * 3, d.yaw + d.spin[1] * u * 3, d.tilt[1] + d.spin[2] * u * 3 + 0.08 * w.k * Math.sin((s[0] - w.x) * 1.5));
        g.scale.set(s[4], s[3], s[4]);
      });
      let n = 0;
      PEAS.forEach((d) => {
        if (on && foodState(d, t, this.fs)) {
          const s = this.fs; this.m4.compose(this.v1.set(s[0], s[1] + 0.28 + bob(s[0], s[2]), s[2]), this.q.identity(), this.v2.set(s[4], s[3], s[4]));
        } else this.m4.compose(this.v1.set(0, -50, 0), this.q.identity(), this.v2.set(1e-4, 1e-4, 1e-4));
        this.peas.setMatrixAt(n++, this.m4);
      });
      this.peas.instanceMatrix.needsUpdate = true;
      this.peas.visible = on;
    }

    // ---------- motes + shaft ----------
    {
      const cp = this.v2.copy(cam.position).sub(R.position);
      this.motes.forEach((s, i) => {
        const inShaft = i < 16;
        const bx = inShaft ? HOLE[0] + (h1(i * 3) - 0.5) * 3.2 : lerp(-7, 6, h1(i * 3));
        const bz = inShaft ? HOLE[1] + (h1(i * 5) - 0.5) * 3.0 : lerp(-3.8, 3.8, h1(i * 5));
        const per = 9 + 6 * h1(i * 7), ph = (((t / per + h1(i * 11)) % 1) + 1) % 1;
        const y = inShaft ? lerp(7.4, 0.6, ph) : lerp(0.8, 6.8, ph);
        s.position.set(bx + 0.4 * Math.sin(t * 0.5 + i), y, bz + 0.4 * Math.cos(t * 0.4 + i * 2));
        const d = s.position.distanceTo(cp);
        s.visible = d > 1.2;
        s.scale.setScalar((0.07 + 0.08 * h1(i * 13)) * (inShaft ? 1.4 : 1));
        (s.material as THREE.SpriteMaterial).opacity = (inShaft ? 0.9 : 0.5) * smooth(ph / 0.15) * (1 - smooth((ph - 0.85) / 0.15)) * smooth((d - 1.2) / 1.0);
      });
      this.shaftU.uT.value = t;
      this.shaftU.uK.value = id === 3 ? 1.25 : 1;
    }

    // ---------- fake lights (WORLD) ----------
    {
      const P = BU.uPLp.value, Cc = BU.uPLc.value, Rr = BU.uPLr.value, B = BELLY;
      const full = id === 3 ? fu.fill : 0;
      BU.uPool.value.set(B[0] + POOL_C[0], B[1] + POOL_C[1], B[2] + POOL_C[2], (1 - 0.6 * full) * (1 + 0.3 * Math.exp(-(((t - W.juice) / 0.35) ** 2))));
      P[0].set(B[0] + POOL_C[0], B[1] + 0.9, B[2] + POOL_C[2]); Cc[0].set(0.55, 1.0, 0.16).multiplyScalar(2.4 * (1 - 0.45 * full)); Rr[0] = 5.2;
      P[1].set(B[0] + HOLE[0], B[1] + 6.2, B[2] + HOLE[1]); Cc[1].set(1.0, 0.8, 0.55).multiplyScalar(2.2 + 1.0 * full); Rr[1] = 6.0;
      P[2].set(B[0] + w.x, B[1] + 2.6, B[2] - 0.8); Cc[2].set(1.0, 0.42, 0.26).multiplyScalar(2.6 * w.k * w.glow); Rr[2] = 4.0;
      const al = id === 2 ? st.alarm : 0, ec = id === 2 || id === 3 ? Math.max(st.echo * (1 - smooth((t - (W.echoes + 1.4)) / 0.8)), Math.exp(-(((t - W.growl - 0.1) / 0.35) ** 2)) * st.growl) : 0;
      if (al > 0.01) { P[3].set(B[0] + ALARM_L[0], B[1] + 1.4, B[2] + ALARM_L[2] - 0.6); Cc[3].set(1.0, 0.18, 0.12).multiplyScalar(2.4 * al * (f % 2 ? 0.6 : 1)); Rr[3] = 3.0; }
      else if (ec > 0.01) { const bp = this.bubble.position; P[3].set(B[0] + bp.x, B[1] + bp.y + 0.5, B[2] + bp.z); Cc[3].set(1.0, 0.86, 0.6).multiplyScalar(2.2 * ec * (0.8 + 0.2 * Math.sin(t * 30))); Rr[3] = 5.0; }
      else { P[3].set(B[0] + 3.5, B[1] + 3.5, B[2] + 2.5); Cc[3].set(1.0, 0.7, 0.4).multiplyScalar(0.9 * full); Rr[3] = 6.0; }
    }
  }

  private debugCam(f: number, cam: THREE.PerspectiveCamera) {
    const K = BELLY_CAM_KEYS;
    let i = 0;
    while (i < K.length - 2 && f >= K[i + 1].f) i++;
    const A = K[i], B = K[i + 1], u = glide(clamp01((f - A.f) / (B.f - A.f)));
    cam.position.set(lerp(A.pos[0], B.pos[0], u), lerp(A.pos[1], B.pos[1], u), lerp(A.pos[2], B.pos[2], u));
    cam.up.set(0, 1, 0); cam.lookAt(lerp(A.look[0], B.look[0], u), lerp(A.look[1], B.look[1], u), lerp(A.look[2], B.look[2], u));
    cam.fov = lerp(A.fov, B.fov, u); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
}
