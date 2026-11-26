// OWNER: cast agent. Every character card + effect card for "The Falling Jolt Before Sleep". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, JOLTS, JOLT_WINDOWS, xrayAt, apeAt, leafAt).
// CONTRACTS (world metres; Be = BEDROOM, Bl = BLOCK, Ju = JUNGLE):
//   BEAN in bed (shots 1, 3, 5): ONE card lying in the vertical plane z = Be.z - 0.4, rolled +90 deg (yaw fixed 0, so
//             keep cameras within ~40 deg of +z). Bed-space origin BEAN_O = Be+(-1.15, 0.55, -0.4) (mattress top under
//             the head end); the card covers x -1.15..+1.01, y 0.47..1.85. Head centre at rest = Be+(-0.75, 0.75, -0.4)
//             (headAt; head half-width 0.19 m, nightcap droops to x ~ -1.15), body along +x, toes ~ Be+(0.82, 0.6).
//             The pillow + duvet are IN the card (sets: no 3D pillow / duvet in x -1.15..1.0 in front of z -0.4).
//             Every JOLTS "bean" entry: he flies up (lift up to 0.38 m x size, joltLift), duvet flaps above him, hair
//             + cap stand up, then lands wide awake. HOLO_HOOKS.head is set to headAt (includes the jolt lift).
//   WINDOW SLEEPERS (shot 2): WINDOW_POS[i] = Bl+(i%2 ? 2 : -2, 1.5 + 3*floor(i/2), 0) (window centres on the facade
//             z = 0), BEAN is window BEAN_WIN = 4 (red-curtain window; awake, side-eyeing the others). Each sleeper card
//             lies at z = window.z - 0.45, mattress line at window.y - 0.42, scale WIN_SC (body ~1.2 m long, centred on
//             the window x). The 7 JOLT_WINDOWS jolt on their JOLTS times; 2 and 7 sleep on (snore / dream).
//   APE (shot 4): asleep on its back ON the branch top y = Ju.y + 6 (branch along x through Ju+(0,6,0)); card plane
//             z = +0.1 asleep -> +0.6 once it slides off the front (so the branch hides its dangling arm). Falls (my own
//             dreamy fall, to 1.55 m below), JOLT at apeAt.caught: THE MEME FACE, its screen-right hand grabs the
//             branch's front-top Ju+(0.1, 5.96, 0.45) (handAt(4,t,"ape",1)), boings up to dangle (body ~1.25 m below).
//   CAT (shot 4): sits at CAT_AT = Ju+(0.4, 0, 1.0) facing the camera, scale CAT_SC (head ~1.45 m up), looking up.
//   Exports: headAt / mouthAt / handAt (id, t, who = "bean" | "win0".."win9" | "ape" | "cat", side 0 = screen-left,
//            1 = screen-right), joltLift, WINDOW_POS, BEAN_WIN, BEAN_O, sleeperO, APE_BRANCH, CAT_AT, apeBodyAt.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, BEDROOM, BLOCK, JUNGLE, SHOTS, JOLTS, JOLT_WINDOWS, V3, smooth, clamp01, camAt, apeAt, leafAt, xrayAt, shotStart } from "./story";
import { HOLO_HOOKS } from "./holo";
import { WORDS } from "./words";
import { WINDOW_POS, BEAN_WINDOW } from "./sets";
import { LEAF_REST, LEAF_START } from "./props";
import { JUNGLE_BRANCH, JUNGLE_CAT, branchAt } from "./jungle";
import {
  P2, BedS, BedKit, Expr, BEAN_KIT, SLEEPERS, BED, bedHead, drawBed, ApeS, drawApe, APE, CatS, drawCat, CAT_HEAD,
  fxZ, fxJolt, fxLines, fxWhoosh, fxMark, fxSweat, fxSparkle, fxSnore, fxThought, fxLabel, fxPat, fxSigh, fxRays,
} from "./fx";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_O: V3 = at(BEDROOM, -1.15, 0.55, 0.1);
export const BEAN_SC = 1;
export const BEAN_WIN = BEAN_WINDOW;
export const WIN_SC = 0.45;
/** a window sleeper's bed-space origin: body x within sets' window centre +- 0.44, on the set's duvet slab, card z -0.6 */
export const sleeperO = (i: number): V3 => { const w = WINDOW_POS[i]; return [w[0] - 0.38 - 95 * SU * WIN_SC, w[1] + 0.03, w[2] + 0.15]; };
export const APE_BRANCH: V3 = [JUNGLE_BRANCH[0], JUNGLE_BRANCH[1], JUNGLE_BRANCH[2]];
export const APE_SC = 1;
export const CAT_AT: V3 = [JUNGLE_CAT[0], JUNGLE_CAT[1], JUNGLE_CAT[2]];
export const CAT_SC = 0.95;
/** the cat grows to 1.25 while the camera is on the ape's close-up (it is out of frame then), so it reads big + hungry
 *  under the dangling ape at phone size, without peeking cut-off at the frame bottom earlier in the shot */
export const catSc = (t: number) => CAT_SC + 0.3 * smooth((t - W.jolt2) / 0.3);
/** extra word cues (s) from the narration timings (not in story.W) */
const cue = (w: string, from = 0) => WORDS.find((x) => x.s >= from && x.w.toLowerCase().startsWith(w))!.s;
const C = { called: cue("called"), and: cue("and", 7) };

// ---------------- helpers ----------------
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const frameNo = (t: number) => Math.round(t * FPS);
const alt = (t: number) => (frameNo(t) % 2 ? 1 : -1);
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.25 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// ---------------- the jolt ----------------
type JK = { lift: number; duv: number; sep: number; flap: number; wave: number; splay: number; hair: number; cap: number; tau: number; on: boolean; size: number; pop: number };
const NOJ: JK = { lift: 0, duv: 0, sep: 0, flap: 0, wave: 0, splay: 0, hair: 0, cap: 0, tau: -99, on: false, size: 0, pop: 0 };
const lastJolt = (t: number, who: string): [number, number] | null => { let r: [number, number] | null = null; for (const [t0, w, s] of JOLTS) if (w === who && t >= t0 - 0.25) r = [t0, s]; return r; };
/** the comic jolt (design units for bed space): body shoots up, hangs, drops, bounces; the duvet is kicked higher,
 *  lags, flaps and settles; limbs splay; hair + cap stand on end (hair stays a bit messy: hairRest) */
const joltK = (t: number, who: string, hairRest = 0.3): JK => {
  const j = lastJolt(t, who);
  if (!j) return NOJ;
  const tau = t - j[0], size = j[1];
  if (tau > 2.5) return tau < 8 ? { ...NOJ, on: true, tau, size, hair: hairRest } : NOJ;
  const Hm = 175 * size;
  let up = 0;
  if (tau >= 0) {
    if (tau < 0.08) up = 1 - (1 - tau / 0.08) ** 2;
    else if (tau < 0.22) up = 1 + 0.05 * Math.sin(((tau - 0.08) / 0.14) * Math.PI);
    else if (tau < 0.36) up = 1 - ((tau - 0.22) / 0.14) ** 2;
    else if (tau < 0.62) up = 0.14 * Math.sin(((tau - 0.36) / 0.26) * Math.PI);
  }
  let d = 0;
  if (tau >= 0.02) {
    if (tau < 0.16) d = 1.85 * smooth((tau - 0.02) / 0.14);
    else if (tau < 0.32) d = 1.85 + 0.06 * Math.sin(((tau - 0.16) / 0.16) * Math.PI);
    else if (tau < 0.52) d = 1.85 * (1 - ((tau - 0.32) / 0.2) ** 2);
    else if (tau < 0.9) d = 0.12 * Math.sin(((tau - 0.52) / 0.38) * Math.PI);
  }
  const flap = tau > 0.04 && tau < 1.0 ? Math.sin(Math.PI * clamp01((tau - 0.04) / 0.96)) * Math.min(1, size * 1.3) : 0;
  const splay = tau < 0 ? 0 : tau < 0.06 ? smooth(tau / 0.06) : tau < 0.26 ? 1 : 1 - smooth((tau - 0.26) / 0.16);
  const hair = tau < 0 ? 0 : tau < 0.05 ? smooth(tau / 0.05) : 1 - (1 - hairRest) * smooth((tau - 0.45) / 0.5);
  const cap = tau < 0 ? 0 : tau < 0.05 ? smooth(tau / 0.05) : 1 - smooth((tau - 0.4) / 0.45);
  const pop = tau < 0 ? 0 : Math.min(1.15, smooth(tau / 0.06) * (1 + 0.15 * Math.sin(tau * 30) * Math.exp(-tau * 6)));
  return { lift: Hm * Math.max(0, up), duv: Hm * d, sep: smooth((d - 0.35) / 0.5), flap, wave: tau * 24, splay, hair, cap, tau, on: true, size, pop };
};
const BASE: BedS = { lift: 0, duv: 0, sep: 0, flap: 0, wave: 0, splay: 0, hairUp: 0, capUp: 0, tilt: -0.32, breathe: 0, wig: 0, trem: 0, pull: 0, arm: "rest", patK: 0, f: { e: "sleep" }, lid: 0, drool: 0, mask: 0, limpK: 0, patB: 0 };
const applyJ = (s: BedS, J: JK) => {
  s.lift = q(J.lift, 1); s.duv = q(J.duv, 1); s.sep = q(J.sep, 50); s.flap = q(J.flap, 50); s.wave = q(J.wave, 10);
  s.splay = q(J.splay, 50); s.hairUp = q(J.hair, 50); s.capUp = q(J.cap, 50);
};
const breath = (t: number, period = 3.2) => q(0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / period), 10);
/** the leaf (approx. props.leafAt path): from high above the bed down onto the pillow */
const leafPos = (t: number): V3 => { const u = leafAt(5, t).fall; return [lerp(LEAF_START[0], LEAF_REST[0], u), lerp(LEAF_START[1], LEAF_REST[1], u), LEAF_REST[2]]; };

// ---------------- BEAN in bed ----------------
type BeanR = { s: BedS; swaps: number[]; J: JK };
const beanBed = (id: number, t: number): BeanR => {
  const J = joltK(t, "bean"), s: BedS = { ...BASE, f: { e: "sleep" }, noPillow: true }, sh = frameNo(t);
  applyJ(s, J);
  const jolting = J.on && J.tau >= -LEAD && J.tau < 0.48;
  const landed = J.on && J.tau >= 0.48;
  const jumpTilt = (base0: number, base1: number) => q(lerp(lerp(base0, base1, smooth((J.tau - 0.1) / 0.2)), 0.04, s.splay), 50);
  if (jolting) { s.f = { e: "jolt", k: q(J.pop, 20), shake: sh }; s.arm = J.tau >= 0 ? "none" : "rest"; s.tilt = jumpTilt(-0.32, -0.14); }
  if (id === 1) {
    if (!J.on || J.tau < -LEAD) { s.f = { e: "dream" }; s.breathe = breath(t); s.tilt = q(-0.26 - 0.06 * smooth(t / 0.3), 50); }
    else if (landed) {
      const susp = t >= W.brain + 0.25 - LEAD;
      s.arm = "clutch"; s.pull = q(smooth((J.tau - 0.45) / 0.25), 20); s.tilt = -0.14;
      s.f = susp ? { e: "susp", look: [0.85, -0.55] } : { e: "wide", look: [0, -0.3], shake: sh };
      if (!susp) s.trem = q(alt(t) * 2.4 * (1 - smooth((t - 0.9) / 1.4)), 2);
      s.lid = q(lidAt(t, 31, [W.brain + 0.25]), 2);
    }
    return { s, swaps: [W.brain + 0.25], J };
  }
  if (id === 3) {
    const X = xrayAt(3, t);
    if (!J.on || J.tau < -LEAD) {
      const e: Expr = t < W.limp - 0.3 ? "sleep" : t < W.half - 0.2 ? "slack" : t < W.drop - 0.15 ? "half" : t < W.panics - 0.1 ? "uneasy" : "scrunch";
      s.f = { e, look: e === "half" ? [0.4, -0.4] : undefined, shake: sh };
      s.limpK = q(X.limp, 50); s.tilt = q(-0.32 - 0.12 * X.limp, 50);
      s.breathe = breath(t, 3.2 + 1.2 * X.limp);
      s.drool = q(smooth((t - (W.limp - 0.1)) / 1.2) * (1 - smooth((t - (W.drop - 0.15)) / 0.2)), 20);
      if (t >= W.panics - 0.1) s.trem = q(alt(t) * (1.5 + 2.5 * smooth((t - W.fires) / 0.8)), 2);
      if (t >= W.wefalling - 0.2) s.wig = q(Math.sin(t * 24), 4);
    } else if (landed) { s.arm = "clutch"; s.pull = q(smooth((J.tau - 0.45) / 0.25), 20); s.tilt = -0.14; s.f = { e: "wide", look: [0, -0.3], shake: sh }; }
    return { s, swaps: [], J };
  }
  // shot 5: asleep -> jolt -> wide -> PROUD head-pat ("your brain just saved you") -> stares at the leaf
  s.arm = jolting && J.tau >= 0 ? "none" : "pat";
  if (!J.on || J.tau < -LEAD) { s.f = { e: "sleep" }; s.breathe = breath(t); }
  else if (landed) {
    s.tilt = -0.14; s.capUp = q(Math.max(s.capUp, 0.85), 50); // the cap stays perked up (the leaf lands where it drooped)
    const p0 = W.saved - 0.45, p1 = W.tree2 - 0.5;
    s.patB = q(smooth((t - p0) / 0.3) * (1 - smooth((t - p1) / 0.35)), 30);
    s.patK = t > p0 + 0.25 && t < p1 ? q(Math.abs(Math.sin((t - p0) * Math.PI * 4.4)), 4) : 0;
    const e: Expr = t < W.saved - 0.3 ? "wide" : t < W.tree2 - 0.35 ? "proud" : "stare";
    let look: P2 = [0, -0.3];
    if (e === "stare") { const L = leafPos(t), H = bedW(BEAN_O, BEAN_SC, bedHead(s)); const dx = L[0] - H[0], dy = L[1] - H[1], n = Math.hypot(dx, dy) || 1; look = [q(dx / n, 10), q(-dy / n, 10)]; }
    s.f = { e, look, shake: sh };
    s.lid = e === "proud" ? 0 : q(lidAt(t, 37, [W.saved - 0.3, W.tree2 - 0.35]), 2);
  }
  return { s, swaps: [], J };
};

// ---------------- window sleepers ----------------
const sleeperBed = (i: number, t: number): { s: BedS; J: JK } => {
  const k = SLEEPERS[i], s: BedS = { ...BASE, f: { e: "sleep" }, noPillow: true }, sh = frameNo(t);
  const plush = !!k.extra?.some((x) => x === "teddy" || x === "unicorn");
  s.arm = plush ? "hug" : "rest"; s.breathe = breath(t + i * 0.7, 2.6 + 0.3 * (i % 3));
  if (i === BEAN_WIN) { // BEAN, wide awake since his jolt, side-eyes the windows that go off
    let look: P2 = [0.3, 0];
    for (const [t0, w] of JOLTS) if (w.startsWith("win") && t >= t0 - 0.05) { const j = Number(w.slice(3)); look = [j % 2 ? 1 : -1, j < BEAN_WIN ? 0.7 : j > BEAN_WIN + 1 ? -0.7 : 0]; }
    s.f = { e: "side", look }; s.arm = "clutch"; s.pull = 1; s.hairUp = 0.3; s.tilt = -0.14; s.breathe = 0;
    s.lid = q(lidAt(t, 43, []), 2);
    return { s, J: NOJ };
  }
  s.f = { e: i === 0 || i === 2 ? "snore" : i === 7 ? "dream" : "sleep" };
  if (!JOLT_WINDOWS.includes(i)) return { s, J: NOJ };
  const J = joltK(t, "win" + i, 0.35);
  if (!J.on || J.tau < -LEAD) return { s, J };
  applyJ(s, J);
  s.mask = q(smooth(J.tau / 0.08), 20);
  if (J.tau < 0.48) { s.f = { e: "jolt", k: q(J.pop, 20), shake: sh }; s.arm = J.tau >= 0 ? "none" : s.arm; s.tilt = q(lerp(-0.32, 0.04, s.splay), 50); }
  else { s.f = { e: "wide", look: [0, -0.2], shake: sh }; s.tilt = -0.2; s.lid = q(lidAt(t, 50 + i, []), 2); }
  return { s, J };
};

// ---------------- the ape ----------------
const camPosAt = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t)))).pos; return new THREE.Vector3(c[0], c[1], c[2]); };
const BODY_CY0 = 640;
/** my visible fall: apeAt's drop until 1.25 m, then a dreamy slow-mo drift to 1.55 m by the catch; at the catch a
 *  rubber-arm boing back up to 1.25 m */
const T_FALL = W.fall - 0.15, T_CATCH = W.jolt2 - 0.05; // meme face lands 3 frames before "jolt"
const dropVis = (t: number) => {
  if (t < T_FALL) return 0;
  if (t < T_CATCH) { const f = t - T_FALL, d = 0.5 * 9.8 * f * f * 0.35; if (d < 1.0) return d; const f1 = Math.sqrt(1.0 / 1.715); return Math.min(1.55, 1.0 + 0.55 * smooth((f - f1) / (T_CATCH - T_FALL - f1))); }
  const s = t - T_CATCH;
  return 1.25 + 0.3 * Math.exp(-4.5 * s) * Math.cos(13 * s);
};
/** the grab point on the branch's front-top edge */
const GRAB: V3 = at(APE_BRANCH, 0.1, -0.04, 0.45);
type ApeR = { s: ApeS; B: V3; A: V3; cy: number };
const apeRig = (t: number, cp: THREE.Vector3): ApeR => {
  const st = apeAt(4, t), sh = frameNo(t), caught = t >= T_CATCH - LEAD;
  const slide = st.slide, fallT = Math.max(0, t - T_FALL), dv = dropVis(t);
  const u = SU * APE_SC, toC = (dx: number, dy: number): P2 => [300 + dx / u, 0 + -dy / u]; // body-relative metres -> canvas offset (cy added later)
  let B: V3, rot: number, hands: [P2, P2], feet: [P2, P2], grip: [boolean, boolean] = [false, false];
  let e: ApeS["e"] = "snore", fur = 0, look: P2 = [0, 0.8], headRot = 0, snot = 0, k = 1;
  const z = lerp(0.1, 0.6, smooth(slide));
  if (!caught) {
    const by = APE_BRANCH[1] + 0.21 - 0.32 * smooth(slide) - dv;
    B = [APE_BRANCH[0], by, APE_BRANCH[2] + z];
    const tumble = smooth(fallT / 1.4);
    rot = q(-Math.PI / 2 + 0.35 * smooth(slide) + (Math.PI / 2 - 0.35 + 0.25) * tumble, 50);
    headRot = q(0.55 * (1 - tumble), 50);
    // asleep on its back: one hand on the belly, one dangling behind the branch; one knee up, one leg dangling
    const H0: [P2, P2] = [[-70, 200], [30, -60]], F0: [P2, P2] = [[150, 190], [210, -30]];
    // free fall (still asleep): limbs float up, loose
    const fl = Math.sin(t * 5) * 14;
    const H1: [P2, P2] = [[-170, -150 + fl], [170, -170 - fl]], F1: [P2, P2] = [[-80, 210 + fl], [90, 190 - fl]];
    const kf = smooth(Math.max(smooth(slide) * 0.5, tumble));
    hands = [[q(lerp(H0[0][0], H1[0][0], kf), 2), q(lerp(H0[0][1], H1[0][1], kf), 2)], [q(lerp(H0[1][0], H1[1][0], kf), 2), q(lerp(H0[1][1], H1[1][1], kf), 2)]];
    feet = [[q(lerp(F0[0][0], F1[0][0], kf), 2), q(lerp(F0[0][1], F1[0][1], kf), 2)], [q(lerp(F0[1][0], F1[1][0], kf), 2), q(lerp(F0[1][1], F1[1][1], kf), 2)]];
    const ph = (t % 2.4) / 2.4;
    snot = slide < 0.05 ? q(Math.max(0, Math.sin(ph * Math.PI * 2)), 10) : 0;
    e = slide > 0.05 ? "sleep" : ph < 0.5 ? "snore" : "sleep";
  } else {
    const s = t - T_CATCH, memeT = s < 1.15;
    const sw = 0.2 * Math.exp(-1.2 * s) * Math.sin(5.5 * s + 0.3);
    const dip = branchAt(4, t).dy, G: V3 = [GRAB[0], GRAB[1] + dip, GRAB[2]];
    const Lb = G[1] - (APE_BRANCH[1] + 0.21 - 0.32 - dv);
    B = [G[0] - APE.shoulder[0] * u + Math.sin(sw) * Lb, G[1] - Math.cos(sw) * Lb, APE_BRANCH[2] + 0.6];
    rot = q(-sw * 0.8, 50);
    const kick = Math.sin(t * 22);
    hands = [memeT ? [-190, -130 + 30 * Math.sin(t * 19)] : [-110, 140], [0, 0]];
    feet = memeT ? [[-110, 170 - 50 * kick], [110, 170 + 50 * kick]] : [[-50, 230], [50, 235]];
    grip = [false, true];
    e = memeT ? "meme" : s < 1.75 ? "gulp" : "phew";
    fur = memeT ? 1 : 1 - 0.85 * smooth((s - 1.15) / 0.5);
    look = [0.2, 1];
    k = q(Math.min(1.15, smooth(s / 0.08) * (1 + 0.12 * Math.sin(s * 26) * Math.exp(-s * 4))), 20);
    hands[0] = [q(hands[0][0], 2), q(hands[0][1], 2)];
  }
  // canvas placement: body centre canvas y (dynamic so the grabbing hand always fits on the card)
  let cy = BODY_CY0;
  if (caught) cy = Math.max(560, Math.min(820, 60 + (GRAB[1] - B[1]) / u));
  cy = q(cy, 1);
  const A: V3 = [B[0], B[1] - (975 - cy) * u, B[2]];
  const H: [P2, P2] = [[hands[0][0] + 300, hands[0][1] + cy], [hands[1][0] + 300, hands[1][1] + cy]];
  if (caught) H[1] = projC(A, [GRAB[0], GRAB[1] + branchAt(4, t).dy, GRAB[2]], APE_SC, cp);
  const C: P2 = [300, cy];
  void toC;
  const s: ApeS = { C, rot, headRot, hands: H, feet: [[feet[0][0] + 300, feet[0][1] + cy], [feet[1][0] + 300, feet[1][1] + cy]], grip, e, look, snot, fur: q(fur, 20), k, shake: sh, lid: 0, breathe: q(Math.sin(t * 2.6), 10) };
  return { s, B, A, cy };
};
/** camera-ray projection of world point P onto the camera-facing card standing at A (canvas units) */
const projC = (A: V3, P: V3, sc: number, cp: THREE.Vector3): P2 => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const k = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * k, Qy = cp.y + dy * k, Qz = cp.z + dz * k;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / (SU * sc), 2), q(975 - ly / (SU * sc), 2)];
};
/** canvas point on a camera-facing card at A -> world */
const cardW = (A: V3, P: P2, sc: number, cp: THREE.Vector3, fwd = 0): V3 => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]), c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = (P[0] - 300) * SU * sc, ly = (975 - P[1]) * SU * sc;
  return [A[0] + c * lx + s * fwd, A[1] + ly, A[2] - s * lx + c * fwd];
};
export const apeBodyAt = (id: number, t: number): V3 => (id === 4 ? apeRig(t, camPosAt(4, t)).B : [0, -100, 0]);

// ---------------- the cat ----------------
const catState = (t: number): CatS => {
  const sh = frameNo(t);
  const e: CatS["e"] = t < W.relax - 0.2 ? "sly" : t < W.fall - 0.2 ? "lick" : t < W.ground + 0.3 ? "drool" : "sigh"; // hungry, staring up at the dangling ape through "ground", then the sigh
  const paws = e === "sigh" ? 1 - smooth((t - (W.ground + 0.3)) / 0.6) : lerp(0.35, 1, smooth((t - (W.relax - 0.4)) / 0.5));
  const bounce = e === "drool" ? Math.abs(Math.sin(t * 9)) * 12 * (1 - smooth((t - W.ground) / 0.25)) : 0;
  const ape = apeAt(4, t);
  const look: P2 = [t > T_CATCH ? -0.2 : 0.15, ape.slide > 0.5 && t < T_CATCH ? -0.6 : -1];
  return { e, tail: q(Math.sin(t * (e === "drool" ? 6 : 1.8)), 10), paws: q(paws, 30), slump: q(e === "sigh" ? smooth((t - (W.ground + 0.3)) / 0.5) : 0, 30), look, shake: sh, bounce: q(bounce, 1) };
};

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -100, 0];
const bedW = (O: V3, sc: number, P: P2, dz = 0): V3 => [O[0] + P[0] * SU * sc, O[1] - P[1] * SU * sc, O[2] + dz];
const bedOf = (id: number, t: number, who: string): { O: V3; sc: number; s: BedS } | null => {
  if (who === "bean" && (id === 1 || id === 3 || id === 5)) return { O: BEAN_O, sc: BEAN_SC, s: beanBed(id, t).s };
  if (id === 2 && who.startsWith("win")) { const i = Number(who.slice(3)); return { O: sleeperO(i), sc: WIN_SC, s: sleeperBed(i, t).s }; }
  if (id === 2 && who === "bean") return { O: sleeperO(BEAN_WIN), sc: WIN_SC, s: sleeperBed(BEAN_WIN, t).s };
  return null;
};
const rotP = (P: P2, a: number): P2 => [P[0] * Math.cos(a) - P[1] * Math.sin(a), P[0] * Math.sin(a) + P[1] * Math.cos(a)];
/** world head centre (bed people include the jolt lift) */
export const headAt = (id: number, t: number, who = "bean"): V3 => {
  const b = bedOf(id, t, who);
  if (b) return bedW(b.O, b.sc, bedHead(b.s), 0.02);
  if (id === 4 && who === "ape") { const cp = camPosAt(4, t), r = apeRig(t, cp), hp = rotP([0, APE.headDy], r.s.rot); return cardW(r.A, [300 + hp[0], r.cy + hp[1]], APE_SC, cp, 0.03); }
  if (id === 4 && who === "cat") { const cp = camPosAt(4, t), c = catState(t); return cardW(CAT_AT, [CAT_HEAD[0], CAT_HEAD[1] + 40 * c.slump - c.bounce], catSc(t), cp, 0.03); }
  return NOWHERE;
};
export const mouthAt = (id: number, t: number, who = "bean"): V3 => {
  const b = bedOf(id, t, who);
  if (b) { const H = bedHead(b.s), m = rotP([0, 0.43 * BED.a], b.s.tilt); return bedW(b.O, b.sc, [H[0] + m[0], H[1] + m[1]], 0.04); }
  if (id === 4 && who === "ape") { const cp = camPosAt(4, t), r = apeRig(t, cp), hp = rotP([0, APE.headDy + 0.5 * APE.headA], r.s.rot + r.s.headRot); return cardW(r.A, [300 + hp[0], r.cy + hp[1]], APE_SC, cp, 0.04); }
  if (id === 4 && who === "cat") { const cp = camPosAt(4, t), c = catState(t); return cardW(CAT_AT, [CAT_HEAD[0], CAT_HEAD[1] + 67 + 40 * c.slump - c.bounce], catSc(t), cp, 0.04); }
  return NOWHERE;
};
/** world hand: side 0 = screen-left, 1 = screen-right. BEAN in bed: side 1 = the hand over the duvet (rest / pat) */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => {
  const b = bedOf(id, t, who);
  if (b) {
    const s = b.s, H = bedHead(s), Ht = rotP([0.1 * BED.a, -1.04 * BED.a], s.tilt), rest: P2 = [lerp(430, 482, s.limpK), lerp(-150, -2, s.limpK)];
    const P: P2 = side ? [lerp(rest[0], H[0] + Ht[0], s.patB), lerp(rest[1], H[1] + Ht[1], s.patB)] : [270, -150];
    return bedW(b.O, b.sc, P, 0.04);
  }
  if (id === 4 && who === "ape") { const cp = camPosAt(4, t), r = apeRig(t, cp); return cardW(r.A, r.s.hands[side], APE_SC, cp, 0.04); }
  return NOWHERE;
};
/** BEAN's jolt height (m) at t (cast's own curve; sets / audio can follow it) */
export const joltLift = (t: number, who = "bean") => { const J = joltK(t, who); return J.lift * SU * (who === "bean" ? BEAN_SC : WIN_SC); };
// holo: the X-ray board rides BEAN's real head (incl. the jolt)
HOLO_HOOKS.head = (id, t) => (id === 1 || id === 3 || id === 5 ? headAt(id, t, "bean") : undefined);

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const V = new THREE.Vector3();
const bedCard = (out: Stage, key: string, kit: BedKit, s: BedS, O: V3, sc: number, cam: CamInfo) => {
  const k = SU * sc, A: V3 = [O[0] + 975 * k, O[1] + 260 * k, O[2]];
  const hd = bedW(O, sc, bedHead(s));
  const [w, h, kk] = tier(cam.pos.distanceTo(V.set(hd[0], hd[1], hd[2])) / sc);
  const light = lightOf(cam);
  out.places.push({ key: `je|bed|${key}|${fkey(s)}|${q(light, 10)}`, draw: (p: Pen) => drawBed(p, kit, s, light), x: A[0], y: A[1], z: A[2], yaw: 0, roll: Math.PI / 2, scale: sc, size: [w, h, kk] });
};

// ---------------- effects ----------------
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) => {
  if (w < 0.004 || h < 0.004) return;
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
};
const camVecs = (cam: CamInfo, P: V3) => {
  const n = new THREE.Vector3(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]).normalize();
  const up = new THREE.Vector3().crossVectors(n, cam.right).normalize();
  return { R: [cam.right.x, cam.right.y, cam.right.z] as V3, N: [n.x, n.y, n.z] as V3, U: [up.x, up.y, up.z] as V3 };
};
const at3 = (P: V3, R: V3, U: V3, N: V3, x: number, y: number, z: number) => add(add(add(P, R, x), U, y), N, z);
/** keep a camera-facing card (centre P, size w x h) inside the frame: clear of the edges and the watermark band */
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number } | null = null;
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t))));
  const fwd = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) };
};
const fit = (P: V3, w: number, h: number): V3 => {
  if (!VIEW) return P;
  const v = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return P;
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.94 - w / 2, top = hy * 0.76 - h / 2, bot = -hy * 0.62 + h / 2;
  const nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  return add(add(P, [VIEW.right.x, VIEW.right.y, VIEW.right.z], nx - x), [VIEW.up.x, VIEW.up.y, VIEW.up.z], ny - y);
};
/** a card fixed on screen: dist m in front of the camera, at (sx, sy) of the half-frame (-1..1) */
const screenAt = (sx: number, sy: number, dist: number): V3 => {
  if (!VIEW) return [0, -100, 0];
  const hy = VIEW.th * dist, hx = hy * (9 / 16);
  const P = VIEW.pos.clone().addScaledVector(VIEW.fwd, dist).addScaledVector(VIEW.right, sx * hx).addScaledVector(VIEW.up, sy * hy);
  return [P.x, P.y, P.z];
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), fit([P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], size, size * 1.33), size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
/** Zzz drifting up-right from P, looping; g = envelope */
const zzz = (out: Stage, t: number, P: V3, cam: CamInfo, g: number, seed: number, size = 0.13, n = 3) => {
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const life = 2.0, ph = ((t / life) + j / n + hh(seed, 1) ) % 1;
    const s = size * (0.6 + 0.5 * ph) * Math.sin(Math.PI * Math.min(1, ph * 1.05)) * g;
    const col = j % 2 ? "#a8c8ff" : "#ffffff";
    fxCard(out, `z|${col}`, 256, 256, (p) => fxZ(p, col), at3(P, R, U, N, 0.06 + ph * size * 2.2 + 0.03 * Math.sin(ph * 7 + j), ph * size * 3.2, 0.12), s, s, { rot: -0.25 + 0.2 * Math.sin(ph * 5) });
  }
};
const sparkles = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.08) => {
  const g = env(t, t0, t1, 0.3, 0.4);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.2 + hh(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * hh(seed, j + 20));
    const col = j % 3 === 0 ? "#fff6a8" : j % 3 === 1 ? "#ffffff" : "#ffd0f0";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.6 * spread, 0.18), s, s, { rot: t * 0.8 + j });
  }
};
const sweat = (out: Stage, t: number, from: number, to: number, P: V3, cam: CamInfo, rate: number, fall: number, size = 0.05) => {
  if (t < from || t > to + 1 / rate) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 2; j++) {
    const t0 = from + j / (2 * rate), ph = ((t - t0) * rate) % 1, cyc = Math.floor((t - t0) * rate);
    if (t < t0 || t0 + cyc / rate > to) continue;
    const k = Math.sin(Math.PI * Math.min(1, ph * 1.1));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, j ? 0.03 : -0.03, -fall * ph * ph, 0.1), size * k, size * 1.3 * k);
  }
};
/** flying sweat beads round a head (meme / jolt) */
const sweatBurst = (out: Stage, t: number, t0: number, P: V3, cam: CamInfo, r: number, n: number, seed: number, size = 0.07) => {
  const s0 = t - t0;
  if (s0 < 0 || s0 > 0.9) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + hh(seed, j), d = r + s0 * (0.5 + 0.4 * hh(seed, j + 3)), k = Math.sin(Math.PI * Math.min(1, s0 / 0.9));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.6 * s0 * s0, 0.15), size * k, size * 1.3 * k, { rot: -Math.cos(a) * 0.8 });
  }
};
/** the JOLT! burst + speed lines under the body + duvet whooshes */
const joltFx = (out: Stage, t: number, J: JK, body: V3, head: V3, cam: CamInfo, scale: number, seed: number, word = "JOLT!") => {
  if (!J.on || J.tau < -0.02 || J.tau > 1.2) return;
  const tau = J.tau, { R, U, N } = camVecs(cam, body);
  const kb = word ? env(tau, 0, 0.6, 0.07, 0.25) : 0;
  if (kb > 0.02) {
    const w = 0.8 * scale, P = fit(at3(head, R, U, N, 0.66 * scale, 0.52 * scale, 0.2), w, w * 0.75);
    fxCard(out, `jolt|${word}|${seed % 3}`, 800, 600, (p) => fxJolt(p, word, ["#ff5a3a", "#ff3a8a", "#7a5aff"][seed % 3], seed), P, w * kb, w * 0.75 * kb, { rot: (seed % 2 ? 0.12 : -0.12) + 0.04 * alt(t) });
  }
  const kl = env(tau, 0.02, 0.3, 0.05, 0.12);
  if (kl > 0.02) for (let j = 0; j < 3; j++) fxCard(out, "lines", 256, 512, fxLines, at3(body, R, U, N, (j - 1) * 0.45 * scale, -0.32 * scale - 0.04 * j, 0.15), 0.14 * scale * kl, 0.3 * scale * kl);
  const kw = env(tau, 0.08, 0.6, 0.08, 0.2);
  if (kw > 0.02) for (const sd of [-1, 1]) fxCard(out, "whoosh", 512, 256, fxWhoosh, at3(body, R, U, N, sd * 0.95 * scale, 0.22 * scale, 0.15), 0.34 * scale * kw, 0.17 * scale * kw, { rot: sd * 0.5 + (sd > 0 ? Math.PI : 0) });
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  if (id === 1 || id === 3 || id === 5) {
    const r = beanBed(id, t), s = r.s, J = r.J;
    bedCard(out, "bean", BEAN_KIT, s, BEAN_O, BEAN_SC, cam);
    const head = headAt(id, t), body = bedW(BEAN_O, BEAN_SC, [560, BED.yc - s.lift], 0.05), top = add(head, [0, 0.36, 0]);
    const jolting = J.on && J.tau > -0.05 && J.tau < 1.2;
    joltFx(out, t, J, body, head, cam, 1, id, id === 3 ? "" : "JOLT!");
    if (jolting) sweatBurst(out, t, t - J.tau + 0.05, head, cam, 0.26, 5, 3 + id, 0.06);
    if (id === 1) {
      const tj = JOLTS[0][0];
      zzz(out, t, add(head, [0.05, 0.2, 0]), cam, env(t, -1, tj - 0.04, 0.2, 0.08), 3, 0.12);
      mark(out, t, tj + 0.42, 1.7, top, "!", 0.2);
      sweat(out, t, 0.9, W.brain + 0.2, add(head, [0.17, 0.12, 0]), cam, 1.4, 0.12, 0.045);
      // the tree thought bubble (his brain's theory)
      const tb = env(t, W.tree - 0.4, C.called - 0.45, 0.3, 0.2);
      if (tb > 0.02) { const { R, U, N } = camVecs(cam, head), w = 0.78; fxCard(out, "thought", 800, 800, fxThought, fit(at3(head, R, U, N, 0.5, 0.56, 0.2), w, w), w * tb, w * tb, { rot: 0.03 * Math.sin(t * 2) }); }
      const lb = env(t, C.called - 0.15, 99, 0.25, 0.2);
      if (lb > 0.02) fxCard(out, "label|HYPNIC JERK", 1024, 300, (p) => fxLabel(p, "HYPNIC JERK", "#ff5a4a"), screenAt(0, 0.6, 1.4), 0.62 * lb, 0.18 * lb, { rot: -0.03 });
    } else if (id === 3) {
      zzz(out, t, add(head, [0.05, 0.2, 0]), cam, env(t, shotStart(3) - 0.3, W.drop - 0.3, 0.3, 0.3), 5, 0.12);
      sweat(out, t, W.drop, JOLTS[8][0], add(head, [0.17, 0.12, 0]), cam, 1.8, 0.12, 0.045);
      mark(out, t, JOLTS[8][0] + 0.42, 99, top, "!", 0.2);
    } else {
      const tj = JOLTS[10][0];
      zzz(out, t, add(head, [0.05, 0.2, 0]), cam, env(t, shotStart(5) - 0.5, tj - 0.04, 0.2, 0.08), 7, 0.12);
      const pk = env(t, W.saved - 0.2, W.tree2 - 0.5, 0.2, 0.2);
      if (pk > 0.02) { const { R, U, N } = camVecs(cam, head); fxCard(out, "pat", 512, 256, fxPat, fit(at3(head, R, U, N, 0.38, 0.4, 0.2), 0.42, 0.21), 0.42 * pk, 0.21 * pk, { rot: 0.06 * alt(t) * (s.patK > 0.5 ? 1 : 0) }); }
      sparkles(out, t, W.saved - 0.2, W.tree2 - 0.5, add(head, [0, 0.1, 0]), cam, 0.35, 6, 71, 0.08);
      mark(out, t, W.in - 0.05, 99, top, "?", 0.18);
    }
    return out;
  }
  if (id === 2) {
    for (let i = 0; i < 10; i++) {
      const { s, J } = sleeperBed(i, t), O = sleeperO(i);
      bedCard(out, `w${i}`, SLEEPERS[i], s, O, WIN_SC, cam);
      const head = headAt(2, t, `win${i}`), body = bedW(O, WIN_SC, [560, BED.yc - s.lift], 0.5);
      if (JOLT_WINDOWS.includes(i)) joltFx(out, t, J, body, add(head, [0, 0, 0.5]), cam, 0.75, i);
      else if (i !== BEAN_WIN) zzz(out, t, add(head, [0.03, 0.12, 0.5]), cam, env(t, shotStart(2) - 0.5, 99, 0.3, 0.2), 20 + i, 0.14);
    }
    // QA: keep the labels' screen size constant while the fov narrows 45 -> 40 (at 40 the pill ran off the left edge)
    const fk = VIEW ? VIEW.th / Math.tan((22.5 * Math.PI) / 180) : 1;
    const lb = env(t, -1, C.and + 0.1, 0.25, 0.2) * fk;
    if (lb > 0.02) fxCard(out, "label|HYPNIC JERK", 1024, 300, (p) => fxLabel(p, "HYPNIC JERK", "#ff5a4a"), screenAt(0, 0.6, 1.4), 0.62 * lb, 0.18 * lb, { rot: -0.03 });
    const l7 = env(t, W.seventy - 0.1, shotStart(3) - 0.55, 0.2, 0.3) * fk; // QA: gone before the push-in (no ghost over the X-ray)
    if (l7 > 0.02) fxCard(out, "label|UP TO 70%", 1024, 300, (p) => fxLabel(p, "UP TO 70%", "#3a7aff"), screenAt(0, 0.6, 1.4), 0.6 * l7, 0.176 * l7, { rot: 0.03 });
    return out;
  }
  // ---- shot 4: the jungle ----
  const cp = cam.pos, lt = lightOf(cam);
  { // the ape
    const r = apeRig(t, cp), sc = APE_SC, [w, h, k] = tier(cp.distanceTo(V.set(r.B[0], r.B[1], r.B[2])) / sc);
    const yaw = Math.atan2(cp.x - r.A[0], cp.z - r.A[2]);
    out.places.push({ key: `je|ape|${fkey(r.s)}|${q(lt, 10)}`, draw: (p: Pen) => drawApe(p, r.s, lt), x: r.A[0], y: r.A[1], z: r.A[2], yaw, scale: sc, size: [w, h, k] });
    const head = headAt(4, t, "ape"), st = apeAt(4, t);
    const caught = t >= T_CATCH - LEAD;
    // asleep: SNORE bubble + Zzz (it sleeps right through the fall)
    const sb = env(t, shotStart(4) + 0.3, W.relax - 0.3, 0.3, 0.25) * (1 + 0.08 * Math.sin(t * Math.PI * 2 / 2.4));
    if (sb > 0.02) { const { R, U, N } = camVecs(cam, head), w2 = 0.62; fxCard(out, "snore", 640, 400, fxSnore, fit(at3(head, R, U, N, 0.48, 0.42, 0.2), w2, w2 * 0.625), w2 * sb, w2 * 0.625 * sb); }
    zzz(out, t, add(head, [0.05, 0.18, 0.1]), cam, env(t, shotStart(4), T_CATCH - LEAD - 0.07, 0.3, 0.06), 9, 0.15);
    // falling: speed lines streaming up past it
    const fk = env(t, W.fall - 0.05, T_CATCH - LEAD - 0.07, 0.15, 0.06);
    if (fk > 0.02) { const { R, U, N } = camVecs(cam, r.B); for (let j = 0; j < 4; j++) { const ph = ((t * 3 + j * 0.27) % 1); fxCard(out, "lines", 256, 512, fxLines, at3(r.B, R, U, N, (j - 1.5) * 0.3, 0.5 + ph * 0.6, 0.2), 0.16 * fk, 0.4 * fk); } }
    // THE PEAK: JOLT!, ray burst behind it, sweat flying
    if (caught) {
      const s0 = t - T_CATCH, { R, U, N } = camVecs(cam, head);
      const rk = env(t, T_CATCH - LEAD, T_CATCH + 1.1, 0.1, 0.35);
      if (rk > 0.02) fxCard(out, "rays", 512, 512, fxRays, at3(head, R, U, N, 0, 0, -0.35), 1.05 * rk, 1.05 * rk, { rot: s0 * 0.6 });
      const jk = env(t, T_CATCH - LEAD, T_CATCH + 0.85, 0.08, 0.25);
      if (jk > 0.02) { const w2 = 0.88; fxCard(out, "jolt|APE", 800, 600, (p) => fxJolt(p, "JOLT!", "#ff3a5a", 7), fit(at3(head, R, U, N, -0.3, 0.72, 0.3), w2, w2 * 0.75), w2 * jk, w2 * 0.75 * jk, { rot: -0.1 + 0.04 * alt(t) }); }
      sweatBurst(out, t, T_CATCH, head, cam, 0.32, 7, 13, 0.08);
      sweat(out, t, T_CATCH + 1.2, 99, add(head, [0.2, 0.12, 0.05]), cam, 1.6, 0.14, 0.05);
    }
    void st;
  }
  { // the cat
    const c = catState(t), [w, h, k] = tier(cp.distanceTo(V.set(CAT_AT[0], CAT_AT[1] + 1.4, CAT_AT[2])) / catSc(t));
    out.places.push({ key: `je|cat|${fkey(c)}|${q(lt, 10)}`, draw: (p: Pen) => drawCat(p, c, lt), x: CAT_AT[0], y: CAT_AT[1], z: CAT_AT[2], scale: catSc(t), size: [w, h, k] });
    blob(out, CAT_AT[0], CAT_AT[1] + 0.012, CAT_AT[2], 1.3 * catSc(t), 1);
    const head = headAt(4, t, "cat");
    const sk = env(t, W.ground + 0.35, 99, 0.25, 0.2);
    if (sk > 0.02) { const { R, U, N } = camVecs(cam, head), w2 = 0.55; fxCard(out, "sigh", 560, 360, fxSigh, fit(at3(head, R, U, N, 0.45, 0.1 + 0.05 * (t - W.ground - 0.35), 0.2), w2, w2 * 0.64), w2 * sk, w2 * 0.64 * sk); }
  }
  return out;
};
