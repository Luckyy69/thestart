// OWNER: cast agent. Every character card + effect card for "Hiccups Come From Tadpoles". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, HICS, shadowAt, xrayAt, tadpoleAt, morphAt,
// osborneAt). Cards yaw to the camera; card origin = the point between the feet ON the ground (canvas 300, 975).
// CONTRACTS (world metres; Ki = KITCHEN, Po = POND, Fa = FARM):
//   BEAN      stands at Ki+(0,0,0) (shots 1, 2, 4). Head centre ~Ki+(0,1.46,0), chest ~Ki+(0,1.03,0). Every hic (HICS
//             "bean") is a full-body hop: the card lifts up to ~4 cm (beanLift) + a "HIC!" card. He holds the fizzy
//             can in his SCREEN-RIGHT hand (side 1) = handAt(id,t,"bean",1).
//             The can is props' (canPose): the hand is camera-ray projected onto canPose(id,t).pos every frame.
//   TADPOLE   shot 3: a side-profile swimmer, head toward +x, laid out exactly on holo TADPOLE_LAYOUT: card centre
//             Po+(0,1.2,0) once it has swum in (from x -1.6 between W.scientists-0.3 and W.tadpoles-0.15), scale 1.
//             tadPointsAt(t): centre, head, mouth, throat, gills, lungs. Sets HOLO_HOOKS.tadpole + HOLO_HOOKS.chest.
//             The morph (morphAt 0..0.5 inside shot 3): BEAN hair, freckles, frog-slipper legs, arms, tail shrinks;
//             shot 4 (morph 0.5..1): BEAN with a shrinking tadpole tail + sparkles.
//   OSBORNE   shot 5 at Fa+(0,0,0), card scale OSB_SC (1: head ~Fa+(0,1.46,0), hat top <= ~1.8 m, under the odometer). Ages with osborneAt.age. Notebook
//             (tally) in his screen-left hand, pencil screen-right. THE MEME FACE only from MEME_T (the last giant HIC).
//   HOG       on the scale deck: card origin HOG_AT = Fa+(0.8, HOG_DECK_Y, -0.3) (deck top y 0.18), faces screen-left.
//   Exports: headAt / mouthAt / chestAt / handAt (id, t, who = "bean" | "osborne" | "tadpole" | "hog"),
//            tadPointsAt, beanLift, MINI_HICS (silent time-lapse jolts), MEME_T.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, KITCHEN, POND, FARM, SHOTS, HICS, V3, smooth, clamp01, camAt, shadowAt, xrayAt, tadpoleAt, morphAt, osborneAt, shotStart } from "./story";
import { canPose, canAxis } from "./props";
import { HOLO_HOOKS } from "./holo";
import {
  Pose, Face, FaceS, P2, HandK, Who, TadState, TadFace, HogState, TAD, drawPerson, drawTadpole, drawHog, jointsOf, lerp2,
  fxHic, fxJolt, fxSweat, fxMark, fxSparkle, fxBubble, fxSwish, fxRays, fxMini,
} from "./fx";

/** who draws what: the can is props.ts's 3D object (canPose); BEAN's screen-right hand is camera-ray projected onto
 *  canPose().pos every frame. true = also draw a can in-card (test stills without props only) */
export const CAST_DRAWS = { can: false };

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_AT: V3 = at(KITCHEN, 0, 0, 0);
/** tadpole card scale (holo TADPOLE_LAYOUT is in metres at scale 1) */
export const TAD_SC = 1;
/** tadpole card centre (= holo TADPOLE origin) at rest; head toward +x */
export const TAD_CENTRE: V3 = at(POND, 0, 1.2, 0);
const TAD_OY = (975 - TAD.o[1]) * SU * TAD_SC;
export const OSB_AT: V3 = at(FARM, 0, 0, 0);
export const OSB_SC = 1.0;
export const HOG_DECK_Y = 0.18; // sets: scale deck top (x 0.15..1.45, z -0.75..0.15)
export const HOG_AT: V3 = at(FARM, 0.8, HOG_DECK_Y, -0.3);
export const HOG_SC = 0.85;

// ---------------- helpers ----------------
const on = (t: number, w: number) => t >= w - LEAD;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };
const frameNo = (t: number) => Math.round(t * FPS);
const qp = (P: P2): P2 => [q(P[0], 2), q(P[1], 2)];
type Vp = { x: number; y: number; z: number };
/** camera position of the frame being built (set by castAt / the contract functions) */
let CP: Vp = { x: 0, y: 1.3, z: 2.6 };
/** camera-ray projection of world point P onto the camera-facing card standing at A with scale sc (canvas units) */
const proj = (A: V3, P: V3, sc = 1): P2 => {
  const cp = CP, yaw = Math.atan2(cp.x - A[0], cp.z - A[2]), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const k = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * k, Qy = cp.y + dy * k, Qz = cp.z + dz * k;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / (SU * sc), 2), q(975 - ly / (SU * sc), 2)];
};
/** BEAN's can hand from props' canPose: [hand point (canvas), can angle (canvas, top direction)] */
const canHand = (id: number, t: number, A: V3): [P2, number] => {
  const cq = canPose(id, t), H = proj(A, cq.pos), ax = canAxis(cq);
  const T = proj(A, [cq.pos[0] + ax[0] * 0.08, cq.pos[1] + ax[1] * 0.08, cq.pos[2] + ax[2] * 0.08]);
  return [H, q(Math.atan2(T[1] - H[1], T[0] - H[0]), 50)];
};
/** replace the can hand (side 1) of a BEAN pose with the props can grip */
const onCan = (pose: Pose, id: number, t: number, A: V3): Pose => {
  if (canPose(id, t).show <= 0.002) return { ...pose, hold: [pose.hold?.[0] ?? null, null] };
  const [H, a] = canHand(id, t, A);
  return { ...pose, hands: [pose.hands[0], H], can: a, ha: [pose.ha?.[0] ?? null, a + Math.PI / 2], hk: [pose.hk?.[0] ?? "rest", "grip"], front: [pose.front?.[0] ?? false, true] };
};
const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const m = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, k), d = k < 0.5 ? a : b;
  const ha = (i: 0 | 1) => { const x = a.ha?.[i] ?? null, y = b.ha?.[i] ?? null; return x !== null && y !== null ? lerp(x, y, k) : k < 0.5 ? x : y; };
  return {
    ...d,
    feet: [lerp2(a.feet[0], b.feet[0], k), lerp2(a.feet[1], b.feet[1], k)], hands: [lerp2(a.hands[0], b.hands[0], k), lerp2(a.hands[1], b.hands[1], k)], ha: [ha(0), ha(1)],
    drop: m(a.drop, b.drop), lean: m(a.lean, b.lean), headTilt: m(a.headTilt, b.headTilt), shrug: m(a.shrug, b.shrug), shake: m(a.shake, b.shake), headDy: m(a.headDy, b.headDy),
    jolt: m(a.jolt, b.jolt), can: lerp(a.can ?? -Math.PI / 2, b.can ?? -Math.PI / 2, k), hatUp: m(a.hatUp, b.hatUp),
  };
};
type Seg = [number, (t: number) => Pose, number?];
/** pose segments [start, pose, blend-in duration] */
const segPose = (t: number, segs: Seg[], dur = 0.3): Pose => {
  let i = 0;
  for (let j = 0; j < segs.length; j++) if (t >= segs[j][0]) i = j;
  const cur = segs[i][1](t);
  if (i === 0) return cur;
  const k = smooth((t - segs[i][0]) / (segs[i][2] ?? dur));
  return k >= 1 ? cur : mixPose(segs[i - 1][1](t), cur, k);
};

// ---------------- hics ----------------
/** silent quick hics through Osborne's time-lapse (visual only, small "hic" words) */
export const MINI_HICS: number[] = (() => {
  const out: number[] = [];
  for (let t = W.kept + 0.2; t < W.million - 0.35; t += 0.31) if (!HICS.some((h) => h[1] === "osborne" && Math.abs(h[0] - t) < 0.26)) out.push(q(t, 100));
  return out;
})();
export const MEME_T = HICS[HICS.length - 1][0];
type Hic = { j: number; u: number; size: number; i: number; mini: boolean };
const NOHIC: Hic = { j: 0, u: -1, size: 0, i: -1, mini: false };
/** jolt envelope: 0 -> 1 in 1.5 frames, decays over ~0.2 s */
const joltEnv = (u: number, decay = 0.16) => (u < 0 ? 0 : u < 0.05 ? smooth(u / 0.05) : Math.exp(-(u - 0.05) / decay));
export const hicOf = (who: string, t: number): Hic => {
  let best = NOHIC;
  HICS.forEach(([t0, w, size], i) => {
    if (w !== who) return;
    const u = t - (t0 - LEAD);
    if (u >= 0 && u < 1.2 && (best.i < 0 || u < best.u)) best = { j: joltEnv(u, size >= 1 ? 0.3 : 0.16), u, size, i, mini: false };
  });
  if (who === "osborne" && best.i < 0) for (let i = 0; i < MINI_HICS.length; i++) {
    const u = t - (MINI_HICS[i] - LEAD);
    if (u >= 0 && u < 0.3) { best = { j: joltEnv(u, 0.08), u, size: 0.35, i: 100 + i, mini: true }; break; }
  }
  return best;
};
/** card hop height (m) of BEAN on a hic */
export const beanLift = (_id: number, t: number) => { const h = hicOf("bean", t); return 0.045 * h.j * h.size; };
/** layer a hic jolt onto a pose: shoulders + chest heave up, head snaps up, the can hand jerks */
const withJolt = (pose: Pose, h: Hic, k = 1): Pose => {
  if (h.j <= 0.001) return pose;
  const a = h.j * h.size * k;
  const hands: [P2, P2] = [[pose.hands[0][0], pose.hands[0][1] - 14 * a], [pose.hands[1][0], pose.hands[1][1] - 18 * a]];
  return { ...pose, hands, shrug: (pose.shrug ?? 0) + 14 * a, headDy: (pose.headDy ?? 0) - 16 * a, jolt: Math.max(pose.jolt ?? 0, a), drop: (pose.drop ?? 0) - 6 * a };
};
const HIC_FACE_T = (h: Hic) => (h.mini ? 0.16 : 0.42 + 0.25 * h.size);

// ---------------- rigs ----------------
type Rig = { who: Who; pose: Pose; face: FaceS; swaps: number[]; A: V3; sc: number; flutter?: number };
const STAND: [P2, P2] = [[258, 948], [342, 948]];
const REST: [P2, P2] = [[214, 620], [386, 620]];
const UP = -Math.PI / 2;
const canGrip = (can: number) => can + Math.PI / 2;
/** BEAN poses (screen-right hand holds the can) */
const bp = (h0: P2, h1: P2, can = UP, extra: Partial<Pose> = {}, hk0: HandK = "rest"): Pose =>
  ({ feet: STAND, hands: [h0, h1], hk: [hk0, "grip"], hold: [null, "can"], front: [false, true], can, ha: [null, canGrip(can)], ...extra });
const SIP_H: P2 = [338, 378], SIP_CAN = Math.atan2(350 - 378, 300 - 338);
const sipPose = () => bp([204, 592], SIP_H, SIP_CAN, { headTilt: -3 }, "fist");
const jerkPose = () => bp([200, 600], [410, 452], -1.78, { shrug: 6 }, "fist");
const lowPose = () => bp(REST[0], [392, 516]);
const beanRig = (pose: Pose, face: FaceS, swaps: number[], lift: number): Rig => ({ who: "bean", pose, face, swaps, A: [BEAN_AT[0], BEAN_AT[1] + lift, BEAN_AT[2]], sc: 1 });
/** the hic overlays: jolt + the "hic" pop face for a moment */
const beanHic = (id: number, t: number, pose: Pose, face: FaceS): [Pose, FaceS] => {
  const h = hicOf("bean", t), A: V3 = [BEAN_AT[0], BEAN_AT[1] + beanLift(id, t), BEAN_AT[2]];
  const p2 = onCan(h.i < 0 ? pose : withJolt(pose, h), id, t, A);
  return [p2, h.i >= 0 && h.u < HIC_FACE_T(h) ? { e: "hic", k: h.j, shake: frameNo(t) } : face];
};
const bean1 = (t: number): Rig => {
  const tb = HICS[0][0] - LEAD;
  const pose0 = segPose(t, [[-9, sipPose], [tb, jerkPose, 0.08], [tb + 0.45, lowPose, 0.4], [W.ancestors - 0.25, () => ({ ...lowPose(), headTilt: -2, lean: -0.02 })]]);
  const sh = shadowAt(1, t);
  const e = faceAt(t, [[-9, "sip"], [0.75, "huh"], [W.ancestors - 0.15, "sideeye"]]);
  const look: P2 | undefined = e === "sideeye" ? [q(lerp(-1, 1, sh.x), 20), 0] : e === "huh" ? [0.8, 0.5] : undefined;
  const [pose, face] = beanHic(1, t, pose0, { e, look });
  return beanRig(pose, face, [0.75, W.ancestors - 0.15], beanLift(1, t));
};
const bean2 = (t: number): Rig => {
  const base = () => bp([192, 648], [408, 640]);
  const t2 = shotStart(2); // QA: start in shot 1's end pose + face so the 1->2 scan-wipe dissolve shows ONE BEAN
  const pose0 = segPose(t, [
    [-9, () => ({ ...lowPose(), headTilt: -2, lean: -0.02 })],
    [t2 + 0.25, base, 0.6],
    [W.gasp - 0.22, () => ({ ...bp([184, 626], [416, 618]), shrug: 14, headDy: -8, headTilt: -2 })],                      // the gasp: shoulders up
    [W.shut - 0.15, () => ({ ...bp([190, 636], [410, 628]), shrug: 8, headDy: -3 }), 0.12],                              // throat slams
    [W.hic + 0.5, () => ({ ...bp([148, 520], [452, 508]), hk: ["palm", "grip"], ha: [-2.75, canGrip(UP)], shrug: 22, headTilt: 3 })], // why? a shrug
  ]);
  // the diaphragm spasm (5.76): a little silent twitch
  const sp = joltEnv(t - (W.spasming - LEAD), 0.12);
  const pose1 = sp > 0.001 ? withJolt(pose0, { j: sp, u: 0, size: 0.45, i: 0, mini: true }) : pose0;
  const e = faceAt(t, [[-9, "sideeye"], [t2 + 0.4, "curious"], [W.spasming - 0.1, "uhoh"], [W.gasp - 0.12, "gasp"], [W.shut - 0.12, "clamp"], [W.hic + 0.5, "shrug"]]);
  const [pose, face] = beanHic(2, t, pose1, { e, shake: frameNo(t), look: e === "sideeye" ? [1, 0] : undefined });
  const x = xrayAt(2, t);
  void x;
  return beanRig(pose, face, [t2 + 0.4, W.spasming - 0.1, W.gasp - 0.12, W.hic + 0.5], beanLift(2, t));
};
const bean4 = (t: number): Rig => {
  const tb = HICS[2][0] - LEAD;
  const pose0 = segPose(t, [
    [-9, () => bp([176, 560], [424, 560], -1.3, {}, "open")],                                             // matches the hybrid's arms
    [W.millions + 0.25, sipPose, 0.45],                                                                    // back to sipping...
    [tb, jerkPose, 0.08],                                                                                  // HIC (still doing it)
    [tb + 0.45, lowPose, 0.4],
    [W.fizzy - 0.35, () => bp(REST[0], [438, 372], UP - 0.15, { headTilt: 4, lean: 0.02 }), 0.4],          // betrayed: holds the can up, glares
    [W.sometimes - 0.3, () => ({ ...bp([270, 562], [394, 548], UP, {}, "open"), front: [true, true] as [boolean, boolean] }), 0.4], // worried, hand on the tummy
  ]);
  const e = faceAt(t, [[-9, "content"], [W.millions + 0.4, "sip"], [tb + 0.5, "huh"], [W.fizzy - 0.25, "betrayed"], [W.sometimes - 0.2, "worried"]]);
  const [pose, face] = beanHic(4, t, pose0, { e, shake: frameNo(t), look: e === "huh" ? [0.8, 0.4] : e === "betrayed" ? [1, -0.4] : undefined });
  return beanRig(pose, face, [W.millions + 0.4, tb + 0.5, W.fizzy - 0.25, W.sometimes - 0.2], beanLift(4, t));
};

/** Osborne: notebook (screen-left), pencil (screen-right); a stoop with age; the time-lapse tally; THE MEME */
const osbPose = (book: P2, pen: P2, extra: Partial<Pose> = {}): Pose => ({
  feet: [[250, 948], [350, 948]], hands: [book, pen], hk: ["grip", "grip"], hold: ["book", "pencil"], front: [true, true], ha: [0.3, -0.9], ...extra,
});
export const osbStateAt = (t: number) => {
  const o = osborneAt(5, t), h = hicOf("osborne", t);
  const meme = t >= MEME_T - LEAD;
  return { o, h, meme, m: meme ? smooth((t - (MEME_T - LEAD)) / 0.08) : 0 };
};
const osb5 = (t: number): Rig => {
  const { o, h, meme, m } = osbStateAt(t), f = frameNo(t), age = o.age;
  const write = (amp: number, sp: number) => (u: number) => osbPose([262, 548], [q(338 + amp * Math.sin(u * sp), 2), q(552 + amp * 0.4 * Math.cos(u * sp * 1.3), 2)]);
  const pose0 = segPose(t, [
    [-9, write(3, 11)],
    [W.farmer - 0.3, () => osbPose([262, 548], [366, 236], { ha: [0.3, -1.8], hk: ["grip", "grip"] }), 0.35],            // tips his hat
    [W.osborne + 0.35, write(3, 11), 0.35],
    [W.kept - 0.1, write(7, 34), 0.3],                                                                                    // the time-lapse: tallying hics
    [MEME_T - LEAD, () => osbPose([150, 470], [452, 462], { hk: ["grip", "grip"], ha: [-2.6, -0.6], hatUp: 18 }), 0.08], // THE MEME: arms flung out
  ]);
  // the stoop (age), the meme tremble
  let pose: Pose = { ...pose0, drop: (pose0.drop ?? 0) + 10 * age, headDy: (pose0.headDy ?? 0) + 10 * age, shrug: (pose0.shrug ?? 0) - 7 * age, headTilt: (pose0.headTilt ?? 0) + 3 * age };
  if (meme) pose = { ...pose, shake: (f % 2 ? 1.6 : -1.6) * m, hatUp: q(lerp(0, 20 + 3 * Math.sin(t * 9), m), 2) }; // QA2: 30 -> 20, clears the odometer
  pose = withJolt(pose, h, meme ? 1.4 : 1);
  let e: Face = faceAt(t, [[-9, "focus"], [W.farmer - 0.15, "proud"], [W.osborne + 0.45, "focus"], [W.kept - 0.05, "grumpy"], [W.years - 0.1, "tired"], [W.million - 0.45, "exhausted"]]);
  if (h.i >= 0 && h.i < 100 && h.u > HIC_FACE_T(h) && h.u < 1.1 && HICS[h.i][0] < W.kept) e = "puzzled";
  let face: FaceS = { e, age, shake: f, look: e === "focus" ? [0.9, 0.4] : e === "proud" ? [0, 0] : undefined };
  if (meme) face = { e: "meme", age, shake: f, k: q(Math.min(1.12, m * (1 + 0.12 * Math.sin(clamp01((t - MEME_T) / 0.25) * Math.PI))), 50) };
  else if (h.i >= 0 && h.u < HIC_FACE_T(h)) face = { e: h.mini ? "wince" : "hic", age, shake: f, k: h.j };
  const lift = (0.04 * h.j * h.size) * (meme ? 1.2 : 1); // QA2: 2.2 -> 1.2, the giant-hic hop no longer shoves the hat into the odometer
  return { who: "osborne", pose, face, swaps: [W.farmer - 0.15, W.osborne + 0.45, W.kept - 0.05, W.years - 0.1], A: [OSB_AT[0], OSB_AT[1] + lift, OSB_AT[2]], sc: OSB_SC, flutter: meme ? Math.sin(t * 40) * m : 0 };
};

// ---------------- the tadpole ----------------
const TAD_IN0 = W.scientists - 0.3, TAD_IN1 = W.tadpoles - 0.15;
/** tadpole card origin + roll + drawing state at t (shot 3); morph from morphAt */
const tadAt = (t: number) => {
  const sw = smooth((t - TAD_IN0) / (TAD_IN1 - TAD_IN0)), vel = sw > 0 && sw < 1 ? Math.sin(Math.PI * sw) : 0;
  const x = -1.6 * (1 - sw), bob = 0.012 * Math.sin(t * 2.1) * (1 - vel);
  const roll = 0;
  const T = tadpoleAt(3, t), mo = morphAt(frameNo(t));
  const swimming = vel > 0.05;
  const ampK = swimming ? 1 : 0.42 + 0.2 * T.flow;
  let face: TadFace = swimming || t < TAD_IN0 ? "happy" : "hello";
  if (on(t, W.gulp - 0.45)) face = "open";
  if (T.gulp > 0.4) face = "puff";
  if (T.snap > 0.5) face = "snap";
  if (T.flow > 0.4) face = "proud";
  if (T.dry > 0.4) face = "wink";
  if (mo > 0.05) face = "happy";
  const st: TadState = {
    ph: q(t * (swimming ? 15 : 6.5), 50), amp: q(ampK, 50), puff: q(T.gulp * (1 - 0.85 * T.flow), 50), snap: q(T.snap * (1 - 0.6 * T.dry), 50),
    gill: q(T.flow, 50), gph: q(t * 9, 50), morph: q(Math.min(0.5, mo), 100), face, look: swimming ? [0.6, 0] : [0, 0], lid: 0,
  };
  const A: V3 = [TAD_CENTRE[0] + x, TAD_CENTRE[1] - TAD_OY + bob, TAD_CENTRE[2]];
  return { A, roll: q(roll, 200), st, vel };
};

// ---------------- frames / exported contracts ----------------
type Frame = { o: V3; c: number; s: number; yaw: number; sc: number; roll: number };
const frameOf = (cp: { x: number; z: number }, A: V3, sc: number, roll = 0): Frame => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]);
  return { o: A, c: Math.cos(yaw), s: Math.sin(yaw), yaw, sc, roll };
};
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  let lx = (P[0] - 300) * SU * F.sc, ly = (975 - P[1]) * SU * F.sc;
  if (F.roll) { const c = Math.cos(F.roll), s = Math.sin(F.roll), x2 = lx * c - ly * s; ly = lx * s + ly * c; lx = x2; }
  return [F.o[0] + F.c * lx + F.s * fwd, F.o[1] + ly, F.o[2] - F.s * lx + F.c * fwd];
};
const camPosAt = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, Math.round(t * FPS)))).pos; return { x: c[0], y: c[1], z: c[2] }; };
const NOWHERE: V3 = [0, -100, 0];
const personRig = (id: number, t: number, who: string): Rig | null => {
  if (who === "bean") return id === 1 ? bean1(t) : id === 2 ? bean2(t) : id === 4 ? bean4(t) : null;
  if (who === "osborne") return id === 5 ? osb5(t) : null;
  return null;
};
const withPerson = (id: number, t: number, who: string, fn: (F: Frame, J: ReturnType<typeof jointsOf>, r: Rig) => V3): V3 => {
  const save = CP, cp = camPosAt(id, t);
  CP = cp;
  const r = personRig(id, t, who);
  CP = save;
  if (!r) return NOWHERE;
  return fn(frameOf(cp, r.A, r.sc), jointsOf(r.who, r.pose, r.face), r);
};
const TADP = { centre: TAD.o, head: TAD.head, mouth: TAD.mouth, throat: TAD.throat, gills: TAD.gills, lungs: TAD.lungs };
/** the tadpole's world points (shot 3): centre (holo origin), head, mouth, throat (the snap), gills, lungs (belly) */
export const tadPointsAt = (t: number) => {
  const T = tadAt(t), F = frameOf(camPosAt(3, t), T.A, TAD_SC, T.roll), w = (P: P2) => toWorld(F, P, 0.04);
  return { centre: toWorld(F, TADP.centre, 0), head: w(TADP.head), mouth: w(TADP.mouth), throat: w(TADP.throat), gills: w(TADP.gills), lungs: w(TADP.lungs) };
};
/** world head centre. BEAN ~Ki+(0,1.46,0); Osborne ~Fa+(0,1.57,0); tadpole Po+(0,1.2,0) */
export const headAt = (id: number, t: number, who = "bean"): V3 => {
  if (who === "tadpole") return id === 3 ? tadPointsAt(t).head : NOWHERE;
  if (who === "hog") return id === 5 ? toWorld(frameOf(camPosAt(5, t), HOG_AT, HOG_SC), [140, 775]) : NOWHERE;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.head, 0.02));
};
export const mouthAt = (id: number, t: number, who = "bean"): V3 => {
  if (who === "tadpole") return id === 3 ? tadPointsAt(t).mouth : NOWHERE;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.mouth, 0.05));
};
/** world chest point (the X-ray anchor: ~Ki+(0,1.03,0)) */
export const chestAt = (id: number, t: number, who = "bean"): V3 => {
  if (who === "tadpole") return id === 3 ? tadPointsAt(t).lungs : NOWHERE;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.chest, 0.03));
};
/** world hand point: side 0 = screen-left, 1 = screen-right (BEAN's can hand) */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => withPerson(id, t, who, (F, J) => toWorld(F, J.hands[side], 0.05));

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const tierOf = (cam: CamInfo, A: V3, sc: number, hy = 1.2) => tier(cam.pos.distanceTo(new THREE.Vector3(A[0], A[1] + hy * sc, A[2])) / sc);
const IDX: Record<string, number> = { bean: 3, osborne: 7, tadpole: 11, hog: 13 };
const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo): Frame => {
  const F = frameOf(cam.pos, r.A, r.sc), [w, h, k] = tierOf(cam, r.A, r.sc), light = lightOf(cam);
  const lid = r.face.e === "meme" || r.face.e === "hic" ? 0 : q(lidAt(t, IDX[r.who] * 7, r.swaps), 2);
  const pose = r.pose, face = r.face, who = r.who, can = CAST_DRAWS.can, fl = q(r.flutter ?? 0, 10);
  out.places.push({
    key: `hc|${who}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}|${can ? 1 : 0}|${fl}`,
    draw: (p) => drawPerson(p, who, pose, face, light, lid, can, fl),
    x: F.o[0], y: F.o[1], z: F.o[2], yaw: F.yaw, scale: r.sc, size: [w, h, k],
  });
  return F;
};

// ---------------- effects ----------------
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) => {
  if (w < 0.004 || h < 0.004) return;
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
};
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const camVecs = (cam: CamInfo, P: V3) => {
  const n = new THREE.Vector3(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]).normalize();
  const up = new THREE.Vector3().crossVectors(n, cam.right).normalize();
  return { R: [cam.right.x, cam.right.y, cam.right.z] as V3, N: [n.x, n.y, n.z] as V3, U: [up.x, up.y, up.z] as V3 };
};
const at3 = (P: V3, R: V3, U: V3, N: V3, x: number, y: number, z: number) => add(add(add(P, R, x), U, y), N, z);
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.25 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
/** keep a camera-facing card (centre P, size w x h) inside the frame: clear of the edges and the watermark band */
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number } | null = null;
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t))));
  const fwd = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) };
};
const fit = (P: V3, w: number, h: number): V3 => fitS(P, w, h)[0];
/** fit + how far it had to move (m) */
const fitS = (P: V3, w: number, h: number): [V3, number] => {
  if (!VIEW) return [P, 0];
  const v = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return [P, 0];
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.94 - w / 2, top = hy * 0.76 - h / 2, bot = -hy * 0.9 + h / 2;
  const nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  return [add(add(P, [VIEW.right.x, VIEW.right.y, VIEW.right.z], nx - x), [VIEW.up.x, VIEW.up.y, VIEW.up.z], ny - y), Math.hypot(nx - x, ny - y)];
};
/** place a w x h card next to a head (radius hr) without covering the face: tries beside-up (preferred side first),
 *  the other side, beside the neck, above; the first that fits the frame wins, else the least-moved one, shrunk */
const besideHead = (head: V3, hr: number, w: number, h: number, side: number, R: V3, U: V3, N: V3): [V3, number] => {
  const c: [number, number][] = [[side * (hr + w * 0.42), hr * 0.7], [-side * (hr + w * 0.42), hr * 0.7], [side * (hr * 0.7 + w * 0.5), -hr * 1.05 - h * 0.3], [-side * (hr * 0.7 + w * 0.5), -hr * 1.05 - h * 0.3], [0, hr + h * 0.45], [side * 0.04, -hr * 1.15 - h * 0.5]];
  let best: [V3, number] = [head, 1], bd = Infinity;
  for (const [x, y] of c) {
    const [P, d] = fitS(at3(head, R, U, N, x, y, 0.25), w, h);
    if (d < 0.01) return [P, 1];
    if (d < bd) { bd = d; best = [fitS(at3(head, R, U, N, x, y, 0.25), w * 0.75, h * 0.75)[0], 0.75]; }
  }
  return best;
};
const HIC_COL: Record<string, string> = { bean: "#ff5fa2", osborne: "#f2a12a" };
/** the "HIC!" burst + jolt marks for a hic */
const hicFx = (out: Stage, t: number, who: string, h: Hic, head: V3, cam: CamInfo, size: number, headR: number) => {
  if (h.i < 0) return;
  const { R, U, N } = camVecs(cam, head), side = h.i % 2 ? 1 : -1;
  const tb = h.u >= 0 ? t - h.u : t;
  if (h.mini) { // time-lapse: little "hic" words popping around the head
    const k = env(t, tb, tb + 0.12, 0.06, 0.1);
    const a = hh(h.i, 3) * Math.PI * 2;
    if (k > 0.02) fxCard(out, `mini|${who}`, 384, 192, (p) => fxMini(p, "#fff1c8"), fit(at3(head, R, U, N, Math.cos(a) * headR * 1.35, headR * 0.5 + Math.sin(a) * headR * 0.6, 0.15), size * 0.42, size * 0.21), size * 0.42 * k, size * 0.21 * k, { rot: (hh(h.i, 5) - 0.5) * 0.5 });
    return;
  }
  const big = h.size >= 1, hold = big ? 2.4 : 0.55;
  const k = env(t, tb, tb + hold, 0.1, 0.28), sz = size * (0.7 + 0.3 * h.size) * (big ? 1.1 : 1);
  if (k > 0.02) {
    const [P0, ks] = big && who === "osborne" ? [fit(at3(head, R, U, N, side * 0.05, -headR * 1.3 - sz * 0.3, 0.25), sz, sz * 0.7), 1] as [V3, number] : besideHead(head, headR, sz, sz * 0.7, side, R, U, N), P = add(P0, U, 0.03 * Math.min(0.6, t - tb));
    fxCard(out, `hic|${who}|${h.i % 3}`, 800, 560, (p) => fxHic(p, "HIC!", HIC_COL[who] ?? "#ff5fa2", h.i % 3), P, sz * k * ks, sz * 0.7 * k * ks, { rot: side * -0.12 + 0.03 * Math.sin(t * 25) });
  }
  const m = env(t, tb, tb + 0.18, 0.04, 0.16);
  if (m > 0.02) for (const sd of [-1, 1]) fxCard(out, "jolt", 256, 256, fxJolt, at3(head, R, U, N, sd * (headR + 0.05), 0.02, 0.1), headR * 0.8 * m, headR * 0.8 * m, { rot: sd > 0 ? -0.2 : Math.PI + 0.2 });
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), fit([P[0] + (VIEW ? VIEW.right.x : 1) * size * 1.1, P[1] + 0.015 * Math.sin(t * 5), P[2] + (VIEW ? VIEW.right.z : 0) * size * 1.1], size, size * 1.33), size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
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
const sweatDrip = (out: Stage, t: number, from: number, to: number, P: V3, cam: CamInfo, rate: number, fall: number, size = 0.05) => {
  if (t < from || t > to + 1 / rate) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 2; j++) {
    const t0 = from + j / (2 * rate), ph = ((t - t0) * rate) % 1, cyc = Math.floor((t - t0) * rate);
    if (t < t0 || t0 + cyc / rate > to) continue;
    const k = Math.sin(Math.PI * Math.min(1, ph * 1.1));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, j ? 0.03 : -0.03, -fall * ph * ph, 0.1), size * k, size * 1.3 * k);
  }
};
/** flying sweat drops (the peak) */
const sweatFly = (out: Stage, t: number, t0: number, C: V3, cam: CamInfo, r0: number, size: number) => {
  if (t < t0) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < 6; j++) {
    const ph = ((t - t0) * 1.4 + hh(j, 7)) % 1, a = -0.3 + (j / 5) * (Math.PI + 0.6), r = r0 + 0.35 * ph, k = Math.sin(Math.PI * ph) * smooth((t - t0) / 0.1);
    fxCard(out, "sweat", 200, 260, fxSweat, at3(C, R, U, N, Math.cos(a) * r, Math.sin(a) * r * 0.8 - 0.25 * ph * ph, 0.12), size * k, size * 1.3 * k, { rot: -a + Math.PI / 2 });
  }
};
const bubbles = (out: Stage, t: number, from: number, to: number, P: V3, cam: CamInfo, rate: number, n: number, seed: number, size: number, dir: [number, number] = [0, 1]) => {
  if (t < from || t > to + 1.6) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const t0 = from + (j / n) / rate, life = 1.5, ph = (((t - t0) * rate) % 1 + 1) % 1, born = t - ph / rate;
    if (t < t0 || born > to) continue;
    const u = (t - born) / life;
    if (u > 1) continue;
    const k = Math.sin(Math.PI * Math.min(1, u * 1.05)) * (0.6 + 0.6 * hh(seed, j));
    const x = dir[0] * u * 0.35 + 0.03 * Math.sin(u * 9 + j), y = dir[1] * u * 0.25 + u * u * 0.3;
    fxCard(out, "bubble", 128, 128, fxBubble, at3(P, R, U, N, x + (hh(seed, j + 9) - 0.5) * 0.05, y, 0.1), size * k, size * k);
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  CP = { x: cam.pos.x, y: cam.pos.y, z: cam.pos.z };
  const f = frameNo(t);
  if (id === 3) { // ---- the tadpole ----
    const T = tadAt(t), F = frameOf(cam.pos, T.A, TAD_SC, T.roll), [w, h, k] = tierOf(cam, T.A, TAD_SC, 0.8), lt = lightOf(cam), st = T.st;
    const lid = st.face === "puff" ? 0 : q(lidAt(t, 77, [W.gulp - 0.45, W.shut2 - 0.1, W.lungs - 0.1]), 2);
    const st2: TadState = { ...st, lid };
    out.places.push({ key: `tad|${fkey(st2)}|${q(lt, 10)}`, draw: (p) => drawTadpole(p, st2, lt), x: T.A[0], y: T.A[1], z: T.A[2], yaw: F.yaw, roll: T.roll, scale: TAD_SC, size: [w, h, k] });
    const P = tadPointsAt(t), { R, U, N } = camVecs(cam, P.head), Tt = tadpoleAt(3, t), mo = morphAt(f);
    if (T.vel > 0.1) for (let j = 0; j < 2; j++) { // swim swishes behind the tail
      const tail = toWorld(F, [90, 505], 0.02);
      fxCard(out, "swish", 256, 128, fxSwish, at3(tail, R, U, N, -0.1 - 0.12 * j, 0.08 * (j ? -1 : 1), 0.05), 0.22 * T.vel, 0.11 * T.vel);
    }
    bubbles(out, t, SHOTS[2].a / FPS, W.gulp - 0.6, P.mouth, cam, 0.9, 3, 5, 0.045);                                          // little breath bubbles
    if (Tt.flow > 0.05) bubbles(out, t, W.water2 - 0.1, W.lungs + 0.3, P.gills, cam, 2.2, 7, 20, 0.05, [-0.8, 0.9]); // water out over the gills
    sparkles(out, t, W.tadpoles - 0.1, W.tadpoles + 0.9, P.head, cam, 0.3, 5, 31, 0.07);                                    // hello!
    if (Tt.dry > 0.05) sparkles(out, t, W.lungs, W.lungs + 0.6, P.head, cam, 0.25, 3, 37, 0.06);
    if (mo > 0) sparkles(out, t, 645 / FPS, 690 / FPS, P.head, cam, 0.35, 8, 41, 0.09);
    const snapK = env(t, W.shut2 - 0.12, W.shut2 + 0.12, 0.04, 0.15);
    if (snapK > 0.02) for (const sd of [-1, 1]) fxCard(out, "jolt", 256, 256, fxJolt, at3(P.throat, R, U, N, 0, sd * 0.16, 0.1), 0.12 * snapK, 0.12 * snapK, { rot: sd > 0 ? Math.PI / 2 : -Math.PI / 2 });
    return out;
  }
  if (id === 5) { // ---- Osborne + the hog ----
    const r = osb5(t), F = drawRig(out, r, t, cam), J = jointsOf(r.who, r.pose, r.face), w3 = (P: P2, fwd = 0.04) => toWorld(F, P, fwd);
    blob(out, OSB_AT[0], OSB_AT[1] + 0.012, OSB_AT[2], OSB_SC, 1 - 0.4 * clamp01((r.A[1] - OSB_AT[1]) / 0.08));
    const head = w3(J.head, 0.03), headR = 0.242 * OSB_SC, { h, meme, m, o } = osbStateAt(t), top = add(head, [0, 0.42, 0]);
    // the hog
    const startle = env(t, HICS[6][0] - LEAD, HICS[6][0] + 0.45, 0.05, 0.2), shock = meme ? smooth((t - (MEME_T - LEAD)) / 0.12) : 0;
    const lie = smooth((t - (W.kept + 0.15)) / 0.8) * (1 - shock);
    const mood: HogState["mood"] = shock > 0.3 ? "shocked" : startle > 0.3 ? "startled" : lie > 0.4 ? "bored" : "content";
    const hs: HogState = { mood, lie: q(lie, 40), age: q(o.age, 20), lid: q(lidAt(t, 91, []), 2) };
    const HA: V3 = [HOG_AT[0], HOG_AT[1] + 0.05 * Math.max(startle, shock) * (1 - lie), HOG_AT[2]];
    const HF = frameOf(cam.pos, HA, HOG_SC), [hw, hh2, hk] = tierOf(cam, HA, HOG_SC, 0.4), lt = lightOf(cam);
    out.places.push({ key: `hog|${fkey(hs)}|${q(lt, 10)}`, draw: (p) => drawHog(p, hs, lt), x: HA[0], y: HA[1], z: HA[2], yaw: HF.yaw, scale: HOG_SC, size: [hw, hh2, hk] });
    blob(out, HOG_AT[0], HOG_AT[1] + 0.012, HOG_AT[2], HOG_SC * 1.3, 0.8);
    const hogHead = toWorld(HF, [140, 760], 0.05);
    mark(out, t, HICS[6][0] + 0.02, HICS[6][0] + 0.8, add(hogHead, [0, 0.28, 0]), "!", 0.16);
    if (lie > 0.6 && !meme) mark(out, t, W.sixtyeight + 0.4, W.million - 0.6, add(hogHead, [0, 0.22, 0]), "?", 0.13);
    // Osborne's fx
    hicFx(out, t, "osborne", h, head, cam, 0.5, headR);
    if (h.i === 6) mark(out, t, HICS[6][0] + 0.45, W.kept - 0.2, top, "?", 0.17);
    sweatDrip(out, t, W.years, MEME_T - 0.3, w3([380, 250], 0.06), cam, 1.6, 0.14, 0.045);
    if (meme) {
      const { R, U, N } = camVecs(cam, head), mk = env(t, MEME_T - LEAD, 99, 0.1, 0.3);
      fxCard(out, "rays", 512, 512, fxRays, at3(head, R, U, N, 0, 0.02, -0.25), 1.25 * mk, 1.25 * mk, { rot: t * 0.5 });
      const jm = env(t, MEME_T - LEAD, MEME_T + 0.5, 0.05, 0.3), fj = frameNo(t) % 2;
      if (jm > 0.02) for (const sd of [-1, 1]) fxCard(out, "jolt", 256, 256, fxJolt, at3(head, R, U, N, sd * (headR * 1.25 + 0.04 * fj), 0.02, 0.1), 0.3 * jm, 0.3 * jm, { rot: sd > 0 ? -0.15 : Math.PI + 0.15 });
      sweatFly(out, t, MEME_T, head, cam, headR * 1.3, 0.05);
      sparkles(out, t, MEME_T, 99, head, cam, 0.4, 6, 51, 0.08);
      void m;
    }
    return out;
  }
  // ---- BEAN (shots 1, 2, 4) ----
  const r = id === 1 ? bean1(t) : id === 2 ? bean2(t) : bean4(t);
  const F = drawRig(out, r, t, cam), J = jointsOf("bean", r.pose, r.face), w3 = (P: P2, fwd = 0.04) => toWorld(F, P, fwd);
  const lift = r.A[1] - BEAN_AT[1];
  blob(out, BEAN_AT[0], BEAN_AT[1] + 0.012, BEAN_AT[2], 1, 1 - 0.5 * clamp01(lift / 0.05));
  const head = w3(J.head, 0.03), headR = 0.255, top = add(head, [0, 0.4, 0]), h = hicOf("bean", t);
  if (id !== 2) hicFx(out, t, "bean", h, head, cam, 0.5, headR); // shot 2: the X-ray holo draws its own HIC!
  else if (h.i >= 0) { const m = env(t, t - h.u, t - h.u + 0.18, 0.04, 0.16), { R, U, N } = camVecs(cam, head); if (m > 0.02) for (const sd of [-1, 1]) fxCard(out, "jolt", 256, 256, fxJolt, at3(head, R, U, N, sd * (headR + 0.05), 0.02, 0.1), headR * 0.8 * m, headR * 0.8 * m, { rot: sd > 0 ? -0.2 : Math.PI + 0.2 }); }
  if (id === 1) {
    mark(out, t, HICS[0][0] + 0.05, HICS[0][0] + 0.7, top, "!", 0.17);
    mark(out, t, W.water - 0.1, SHOTS[0].b / FPS + 0.5, top, "?", 0.15);
  } else if (id === 2) {
    mark(out, t, W.why - 0.1, SHOTS[1].b / FPS + 0.5, top, "?", 0.15);
  } else if (id === 4) {
    const mo = morphAt(f);
    if (mo < 1) { // the tadpole tail still shrinking away behind his legs + sparkles
      const k = 1 - smooth((mo - 0.5) / 0.5);
      if (k > 0.02) fxCard(out, `tail|${q(k, 20)}`, 256, 512, (p) => tailCard(p, k), w3([300, 820], -0.06), 0.2 * k, 0.42 * k, { rot: 0.15 * Math.sin(t * 14) });
      sparkles(out, t, 645 / FPS, 700 / FPS, add(head, [0, -0.3, 0]), cam, 0.45, 9, 43, 0.09);
    }
    if (r.face.e === "betrayed") mark(out, t, W.fizzy - 0.1, W.sometimes - 0.5, top, "!", 0.15);
    sweatDrip(out, t, W.sometimes, SHOTS[3].b / FPS + 0.5, w3([392, 236], 0.06), cam, 1.4, 0.16, 0.045);
  }
  return out;
};
/** the leftover tadpole tail in shot 4 (256 x 512): a finned brown tail curling down */
const tailCard = (p: Pen, k: number) => {
  void k;
  const pts: P2[] = [];
  for (let i = 0; i <= 14; i++) { const f2 = i / 14; pts.push([128 + 60 * Math.sin(f2 * 3) * f2, 30 + f2 * 440]); }
  const side = (wd: number, s: number) => pts.map((P, i) => [P[0] + s * wd * (1 - i / 14) + s * 4, P[1]] as P2);
  p.poly([...side(70, 1), ...side(70, -1).reverse()], "#f3c98e", 10);
  p.poly([...side(26, 1), ...side(26, -1).reverse()], "#a86a40", 6);
};
export { tadAt as tadRigAt };
// holo anchors: BEAN's chest (shot 2 X-ray) and the tadpole card centre (shot 3; head toward +x, scale TAD_SC)
HOLO_HOOKS.chest = (id, t) => (id === 1 || id === 2 || id === 4 ? chestAt(id, t) : undefined);
HOLO_HOOKS.tadpole = (id, t) => (id === 3 ? { pos: tadPointsAt(t).centre, dir: 1, scale: TAD_SC } : undefined);
