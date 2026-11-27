// OWNER: cast. Every character card + effect card for "Wrong Address". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, hookAt, hqAt, gymAt, endAt). Expressions land
// 0-3 frames before their word (LEAD). One feeling per line; the MEME FREEZE face exists only at the gym peak.
// CONTRACTS (world metres; Pa = PARK, Hq = HQ, Gy = GYM). Character cards are yaw-billboards (face the camera).
//   BEAN park (shots 1, 5): soles at BEAN_PK = Pa(-0.15, 0, -0.2), scale 0.85 (1.45 m tall, head centre ~1.24 m, head
//          half-width ~0.18 m). Holds the HUGE 3-scoop cone in his screen-right hand (scoops up to ~1.5 m).
//   MOUTH_HOOK (shot 1): the centre of his wide-open "aah" mouth (hookAt.open), 3 cm in front of the card: the dive target.
//   The head-top LID hinges on his screen-right temple; the little BRAIN + "0 PAIN SENSORS" sign rise to ~1.6 m.
//   BRAIN (shot 3): card at BRAIN_AT = Hq(0, 0, -0.5), scale 1 (chair + brain ~1.3 m; brain centre ~1.09 m, 0.76 m wide).
//          Slams with its screen-left glove at ~BRAIN_SLAM, points up-right at FOREHEAD.
//   GYM (shot 4): the six seated kids sit BEHIND the table, KID_Z = Gy z -1.4 (table front edge must be at z >= -1.15),
//          heads ~1.12 m; FAST x -1.5, -1.0, BEAN -0.45 | SLOW x 0.48, 1.25, 1.65. BEAN_GYM = Gy(-0.45, 0, -1.4).
//          SCHOOLKID soles at GIRL_AT = Gy(0.1, 0, 0.1) (sc 0.8), DAD at DAD_AT = Gy(0.65, 0, 0.0) (sc 1.0, 1.87 m).
//   Exports: headAt / handAt (id, t, who = "bean" | "brain" | "girl" | "dad", side 0 = screen-left, 1 = screen-right),
//            beanAt(id, t), MOUTH_HOOK, the positions above.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, PARK, HQ, GYM, SHOTS, V3, smooth, clamp01, camAt, hookAt, gymAt, endAt } from "./story";
import {
  P2, PersonS, ArmS, LegS, Look, Expr, ItemS, drawPerson, drawBrain, palmOf, spring, SKIN_B, BRAIN_C, BRAIN_R, MARK_COL,
  fxSweat, fxMark, fxSparkle, fxSnowflake, fxShard, fxVapour, fxRays, fxGlow, fxSpeed, fxPoof, fxSplat, fxHeart, fxClick, fxImpact,
  fxWord, fxFrostBurst, fxIceBlock, BrainS,
} from "./fx";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_PK: V3 = at(PARK, -0.15, 0, -0.2);
// (integration) the BRAIN sits on hq.ts's 3D swivel chair (seat top y 0.5, front edge z -0.25): the card stands just in
// front of the seat, lowered so the brain's bottom (canvas y ~615) rests on the seat top; the card draws no chair.
export const BRAIN_AT: V3 = at(HQ, 0, 0.5 - (975 - 615) * 0.00216, -0.2);
/** the big red button (hq.ts HQ_BUTTON, top of its dome) */
const HQ_BTN: V3 = at(HQ, 0.42, 0.96, -1.085);
export const KID_Z = -1.06; // (integration) right behind the table (back edge z -0.86)
/** seated kids turn toward the lens at most this much (keeps their cards clear of the table) */
const KID_YAW = 0.7;
export const BEAN_GYM: V3 = at(GYM, -0.45, 0, KID_Z);
export const GIRL_AT: V3 = at(GYM, 0.1, 0, 0.1);
export const DAD_AT: V3 = at(GYM, 0.65, 0, 0.0);
const BSC = 0.85, GIRL_SC = 0.8, DAD_SC = 1.0, BRAIN_SC = 1.0;
/** world point of a canvas point on a card facing +z (yaw 0) */
const flatW = (A: V3, P: P2, sc: number, fwd = 0): V3 => [A[0] + (P[0] - 300) * SU * sc, A[1] + (975 - P[1]) * SU * sc, A[2] + fwd];
/** the dive target: centre of the wide-open "aah" mouth (head 300,300 a 100: mouth centre ~ y 357) */
export const MOUTH_HOOK: V3 = flatW(BEAN_PK, [300, 357], BSC, 0.03);
export const BRAIN_SLAM: V3 = [HQ_BTN[0], HQ_BTN[1], HQ_BTN[2] + 0.06];

// ---------------- helpers ----------------
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const add2 = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const frameNo = (t: number) => Math.round(t * FPS);
const ramp = (t: number, t0: number, d: number) => smooth((t - t0) / d);
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.22 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
const camPosAt = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t)))).pos; return new THREE.Vector3(c[0], c[1], c[2]); };
const yawOf = (A: V3, cp: THREE.Vector3) => Math.atan2(cp.x - A[0], cp.z - A[2]);
/** canvas point on a camera-facing card standing at A -> world (fwd = metres toward the camera) */
const cardW = (A: V3, P: P2, sc: number, cp: THREE.Vector3, fwd = 0, yawO?: number): V3 => {
  const yaw = yawO ?? yawOf(A, cp), c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = (P[0] - 300) * SU * sc, ly = (975 - P[1]) * SU * sc;
  return [A[0] + c * lx + s * fwd, A[1] + ly, A[2] - s * lx + c * fwd];
};
const blink = (t: number, i: number, swaps: number[] = []) => q(lidAt(t, i, swaps), 2);
const jit = (t: number, a: number, s = 0): number => a * (0.6 * Math.sin(t * 71 + s) + 0.4 * Math.sin(t * 113 + 1 + s));
const qa = (A: ArmS): ArmS => ({ ...A, w: [q(A.w[0], 2), q(A.w[1], 2)], sh: [q(A.sh[0], 2), q(A.sh[1], 2)] });
const mixArm = (a: ArmS, b: ArmS, k: number): ArmS => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const n = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, k);
  return { ...(k < 0.5 ? a : b), sh: mix2(a.sh, b.sh, k), w: mix2(a.w, b.w, k), bend: n(a.bend, b.bend), hang: n(a.hang, b.hang), hk: lerp(a.hk ?? 0.36, b.hk ?? 0.36, k) };
};

// ---------------- looks ----------------
const BEAN: Look = { skin: SKIN_B, hair: "bean", hairCol: "#6a3b22", top: "#3a8dff", topDk: "#2a5ab8", bottom: "#ffb02e", shoes: "#ff3a4a", print: "cone", nose: "#ff5a5a" };
const KIDS: { x: number; fast: boolean; look: Look; sc: number; seed: number }[] = [
  { x: -1.5, fast: true, sc: 0.82, seed: 31, look: { skin: "#c99067", hair: "spiky", hairCol: "#2a2a3a", top: "#4ad06a", topDk: "#2a9a4a", bottom: "#3a4a8a", shoes: "#ffffff", print: "bolt" } },
  { x: -1.0, fast: true, sc: 0.8, seed: 37, look: { skin: "#ffe2c2", hair: "bob", hairCol: "#f0b040", top: "#a86aff", topDk: "#7a44c8", bottom: "#ff6a9a", shoes: "#ff6a9a", print: "star" } },
  { x: -0.45, fast: true, sc: BSC, seed: 23, look: BEAN },
  { x: 0.48, fast: false, sc: 0.84, seed: 41, look: { skin: "#8a5a3a", hair: "afro", hairCol: "#2a1a14", top: "#ffd23a", topDk: "#d8a020", bottom: "#3a8a8a", shoes: "#ff4a5a", print: "stripe" } },
  { x: 1.25, fast: false, sc: 0.8, seed: 43, look: { skin: "#f5c9a0", hair: "bun", hairCol: "#8a3a1a", top: "#ff7ab0", topDk: "#d84a88", bottom: "#4a5ac8", shoes: "#ffffff", print: "star" } },
  { x: 1.65, fast: false, sc: 0.82, seed: 47, look: { skin: "#ecd0b6", hair: "cap", hairCol: "#4a2a1a", top: "#ff5a3a", topDk: "#c83a2a", bottom: "#3a3a5a", shoes: "#ffd23a", print: "none", cap: "#2a6aff" } },
];
const GIRL: Look = { skin: "#f5c9a0", hair: "pigtails", hairCol: "#3a2214", top: "#ff6ab0", topDk: "#d84a90", bottom: "#7a4ac8", shoes: "#ffd23a", coat: true, goggles: true };
const DAD: Look = { skin: "#ffd8b8", hair: "dad", hairCol: "#5a3b2a", top: "#bfe0ff", topDk: "#8ab0d8", bottom: "#4a4a6a", shoes: "#6a3a2a", vest: "#2a8a7a", glasses: "#2a2a3a", moustache: "#5a3b2a" };

// ---------------- kid layout (600 x 1000 design; head 300,300 a 100) ----------------
const HEAD: P2 = [300, 300], BODY: P2 = [300, 545], SHL: [P2, P2] = [[208, 472], [392, 472]];
const legsStand = (): LegS[] => [{ hip: [262, 655], foot: [252, 950], bend: 0 }, { hip: [338, 655], foot: [348, 950], bend: 0 }];
type ArmP = Omit<ArmS, "sh"> & { sh?: P2 };
const arm = (i: 0 | 1, o: ArmP, dy = 0): ArmS => ({ sh: [SHL[i][0], SHL[i][1] + dy], thick: 40, mirror: i === 1, sleeve: 0.32, ...o, w: [o.w[0], o.w[1] + dy] });
const restArm = (i: 0 | 1, dy = 0) => arm(i, { w: i ? [418, 668] : [182, 668], bend: i ? -14 : 14, hand: "rest", hang: i ? -0.15 : 0.15 }, dy);
const cone = (bite = 0, drip = 0, scoops = 3, extra: Partial<Extract<ItemS, { k: "cone" }>> = {}): ItemS => ({ k: "cone", bite: q(bite, 10), drip: q(drip % 1, 12), scoops, ...extra });
/** BEAN holding the cone up beside his face (screen-right) */
const coneArm = (it: ItemS, dy = 0) => arm(1, { w: [452, 490], bend: -52, hand: "fist", hang: -0.45, item: it }, dy);

// ---------------- rigs ----------------
type Card = { key: string; draw: (p: Pen) => void; A: V3; sc: number; yaw?: number; blob?: V3; blobSc?: number };
type KidOut = { A: V3; head: V3; fast: boolean; sc: number; mouth: V3; spoon: V3; u: number };
type Rig = { cards: Card[]; heads: Record<string, V3>; hands: Record<string, [V3 | null, V3 | null]>; pts: Record<string, V3>; kids?: KidOut[] };
const personCard = (who: string, A: V3, s: PersonS, lt: number, sc: number, blobAt?: V3, blobSc = 0.8): Card =>
  ({ key: `fz|${who}|${fkey(s)}|${q(lt, 10)}`, draw: (p) => drawPerson(p, s, lt), A, sc, blob: blobAt, blobSc });
const handsOf = (A: V3, s: PersonS, sc: number, cp: THREE.Vector3, yaw?: number): [V3, V3] => [cardW(A, palmOf(s.arms[0]), sc, cp, 0.04, yaw), cardW(A, palmOf(s.arms[1]), sc, cp, 0.04, yaw)];

/** shot 1: the hook (chomp, frost, OUCH, the lid + brain + sign, the "aah" for the dive) */
const T1_OUCH = W.freeze - 0.05 - LEAD, T1_LID = W.your2 - 0.35 - LEAD, T1_OPEN = 3.4 - LEAD;
const hookRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const H = hookAt(1, t);
  const ouch = ramp(t, T1_OUCH, 0.12) * (1 - ramp(t, T1_LID - 0.15, 0.25));
  const A: V3 = add(BEAN_PK, [jit(t, 0.006 * ouch), 0, 0]);
  // the cone: at his mouth for the chomp, then lowered beside his face
  const chomp = 1 - ramp(t, 0.12, 0.28);
  const atMouth = arm(1, { w: [372, 520], bend: -30, hand: "fist", hang: -0.5 });
  const a1 = mixArm(coneArm(cone()), atMouth, chomp);
  a1.item = cone(H.bite > 0.4 ? 1 : 0, t * 0.6, 3, { tilt: q(-0.25 * chomp, 20) });
  // screen-left hand: clutches the forehead on OUCH
  const clutch = arm(0, { w: [178, 262], bend: 46, hand: "open", hang: 1.05, hk: 0.4 });
  const a0 = mixArm(restArm(0), clutch, ouch);
  if (ouch > 0.5) a0.hand = "open";
  let e: Expr = "chomp", look: P2 = [0, 0], tilt = 0;
  const sw = [T1_OUCH, T1_LID, T1_OPEN];
  if (t < sw[0]) { e = "chomp"; tilt = -0.05; }
  else if (t < sw[1]) { e = "ouch"; tilt = 0.08 + 0.03 * Math.sin(t * 40); }
  else if (t < sw[2]) { e = "lookup"; look = [0.35, -1]; tilt = 0.04; }
  else { e = "aah"; tilt = -0.06; }
  const s: PersonS = {
    look: BEAN, head: HEAD, a: 100, tilt: q(tilt, 50), face: { e, look, k: q(H.open, 20), shake: frameNo(t) }, lid: e === "ouch" || e === "chomp" || e === "aah" ? 0 : blink(t, 7, sw),
    body: BODY, rx: 112, ry: 125, arms: [qa(a0), qa(a1)], legs: legsStand(), frost: q(H.frost * (1 - 0.6 * H.lid), 20),
    cap: q(Math.min(1.12, Math.max(0, spring(t - T1_LID, 12, 6))) * (1 - ramp(t, 3.55, 0.22)), 30),
    brain: q(H.brain, 20), shrug: q(H.shrug, 20), brainE: t < W.pain - 0.3 - LEAD ? "happy" : "shrug",
  };
  return {
    cards: [personCard("bean", A, s, lt, BSC, BEAN_PK)],
    heads: { bean: cardW(A, HEAD, BSC, cp, 0.03) }, hands: { bean: handsOf(A, s, BSC, cp) },
    pts: { body: add(A, [0, 0.78, 0]), mouth: cardW(A, [300, 357], BSC, cp, 0.05), scoop: cardW(A, add2(palmOf(s.arms[1]), [0, -150]), BSC, cp, 0.05), brain: cardW(A, [300, 160], BSC, cp, 0.05), forehead: cardW(A, [300, 235], BSC, cp, 0.06) },
  };
};

/** shot 3: the BRAIN at the console */
const T3_ALERT = W.nerve2 - LEAD, T3_FORE = W.forehead - 0.12 - LEAD, T3_CONF = W.confused - 0.15 - LEAD, T3_BLAME = W.blames - 0.08 - LEAD;
const BSH: [P2, P2] = [[300 - 0.86 * BRAIN_R, BRAIN_C[1] + 0.12 * BRAIN_R], [300 + 0.86 * BRAIN_R, BRAIN_C[1] + 0.12 * BRAIN_R]];
const barm = (i: 0 | 1, o: Omit<ArmS, "sh">, bob = 0): ArmS => ({ sh: [BSH[i][0], BSH[i][1] + bob], thick: 30, mirror: i === 1, glove: "#ffffff", hk: 0.3, ...o });
/** canvas point of the big red button seen through the brain card's plane from the lens at cp */
const btnCanvas = (cp: THREE.Vector3): P2 => {
  const A = BRAIN_AT, yaw = yawOf(A, cp), c = Math.cos(yaw), sn = Math.sin(yaw);
  const n = [sn, 0, c], d = [HQ_BTN[0] - cp.x, HQ_BTN[1] - cp.y, HQ_BTN[2] - cp.z];
  const k = (n[0] * (A[0] - cp.x) + n[2] * (A[2] - cp.z)) / (n[0] * d[0] + n[2] * d[2]);
  const X = [cp.x + k * d[0] - A[0], cp.y + k * d[1] - A[1], cp.z + k * d[2] - A[2]];
  const lx = X[0] * c - X[2] * sn, ly = X[1];
  return [q(300 + lx / (SU * BRAIN_SC), 1), q(975 - ly / (SU * BRAIN_SC), 1)];
};
const hqRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const hop = t > T3_ALERT ? 22 * Math.max(0, Math.sin(Math.PI * clamp01((t - T3_ALERT) / 0.3))) : 0;
  const slamK = ramp(t, T3_BLAME, 0.1), sk = Math.max(0, Math.sin(Math.PI * clamp01((t - T3_BLAME) / 0.25)));
  const bob = q(-hop + 10 * sk + 4 * Math.sin(t * 2.2), 2);
  const idle = [barm(0, { w: [110, 600], bend: 30, hand: "rest", hang: 0.6 }, bob), barm(1, { w: [470, 430], bend: -40, hand: "fist", hang: -0.3, item: { k: "mug" } }, bob)];
  const alert = [barm(0, { w: [70, 330], bend: 40, hand: "splay", hang: -0.2 }, bob), barm(1, { w: [530, 330], bend: -40, hand: "splay", hang: 0.2 }, bob)];
  const scratch = [barm(0, { w: [110, 600], bend: 30, hand: "rest", hang: 0.6 }, bob), barm(1, { w: [450, 250], bend: -60, hand: "scratch", hang: -1.3 }, bob)];
  // (integration) SLAM: the screen-right glove lands on the 3D button (its projection on the card plane from the lens),
  // then rises to point up-right at the FOREHEAD lamp; the screen-left fist shakes
  const B = btnCanvas(cp), up = ramp(t, T3_BLAME + 0.32, 0.2), lift = 1 - ramp(t, T3_BLAME, 0.07);
  const slamW: P2 = [B[0] - 12, B[1] - 26 - 60 * lift];
  const blame = [barm(0, { w: [80, 360 + 12 * Math.sin(t * 30)], bend: 40, hand: "fist", hang: -0.2 }, bob),
    mixArm(barm(1, { w: slamW, bend: -30, hand: "slam", hang: 0.3 }, bob), barm(1, { w: [560, 250], bend: -10, hand: "point", hang: 0.05 }, bob), up)];
  const kA = ramp(t, T3_ALERT, 0.15), kC = ramp(t, T3_CONF, 0.2), kB = slamK;
  const arms = [0, 1].map((i) => {
    let A = mixArm(idle[i], alert[i], kA);
    A = mixArm(A, scratch[i], kC); A = mixArm(A, blame[i], kB);
    if (kA > 0.5 && i === 1) A.item = undefined;
    return qa(A);
  });
  let e: Expr = "chill", look: P2 = [0.2, 0.1];
  const sw = [T3_ALERT, T3_FORE, T3_CONF, T3_BLAME];
  if (t < sw[0]) { e = "chill"; }
  else if (t < sw[1]) { e = "alert"; look = [-0.7, -0.9]; }
  else if (t < sw[2]) { e = "alert"; look = [0.8, -0.9]; }
  else if (t < sw[3]) { e = "confused"; look = [Math.sin(t * 5) * 0.8, -0.5]; }
  else { e = "angry"; look = [0.8, -0.7]; }
  const s: BrainS = { face: { e, look, shake: frameNo(t) }, lid: e === "chill" || e === "confused" ? blink(t, 17, sw) : 0, facing: 0.3, arms, bob, light: lt, spin: q(0.15 * Math.sin(t * 0.8) + 0.2 * kB, 20) };
  const A = BRAIN_AT;
  const hc = cardW(A, [BRAIN_C[0], BRAIN_C[1] + bob], BRAIN_SC, cp, 0.03);
  return {
    cards: [{ key: `fz|brain|${fkey(s)}|${q(lt, 10)}`, draw: (p) => drawBrain(p, s), A, sc: BRAIN_SC }],
    heads: { brain: hc }, hands: { brain: [cardW(A, palmOf(arms[0]), BRAIN_SC, cp, 0.05), cardW(A, palmOf(arms[1]), BRAIN_SC, cp, 0.05)] },
    pts: { top: cardW(A, [BRAIN_C[0], BRAIN_C[1] + bob - BRAIN_R], BRAIN_SC, cp, 0.05), slam: cardW(A, palmOf(arms[1]), BRAIN_SC, cp, 0.08), point: cardW(A, palmOf(arms[1]), BRAIN_SC, cp, 0.05) },
  };
};

/** shot 4: the science fair */
const T4_FAST = W.fast - 0.6 - LEAD, T4_SLOW = W.slow - 0.4 - LEAD, T4_POINT = W.fast2 - 0.15 - LEAD, T4_PEAK = W.twice - 0.08 - LEAD;
/** (qa2) BEAN's meme freeze explodes 2 frames after the CUT from the 2x chart (766) onto him: "brain" (769) "freeze" (776) */
const T4_MEME = 768 / FPS;
const SEAT_DY = 60, STOOL = 735;
const loopU = (t: number, rate: number, seed: number) => (t * rate + hh(seed, 3)) % 1;
const gymRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const G = gymAt(4, t);
  const cards: Card[] = [], kidsOut: KidOut[] = [];
  const heads: Record<string, V3> = {}, hands: Record<string, [V3 | null, V3 | null]> = {};
  const peakS = t - T4_MEME, memeK = t >= T4_MEME ? q(Math.min(1.2, Math.max(0, spring(peakS, 16, 5))), 20) : 0;
  KIDS.forEach((K, i) => {
    const A: V3 = at(GYM, K.x, 0, KID_Z), dy = SEAT_DY, isBean = i === 2, peak = t >= (isBean ? T4_MEME : T4_PEAK);
    const fastK = K.fast ? G.fast : 0, slowK = K.fast ? 0 : G.slow;
    let arms: ArmS[], e: Expr, look: P2 = [0, 0.1], tilt = 0, u = 0;
    if (K.fast) {
      u = loopU(t, 2.6 + 0.3 * (i % 2), K.seed);
      const up = fastK * Math.pow(Math.sin(Math.PI * u), 0.7);
      const bowl = arm(0, { w: [236, 560], bend: 30, hand: "fist", hang: 1.2, item: { k: "bowl", col: ["#ffd23a", "#6ad0ff", "#ff8a5a"][i % 3], fill: i === 1 ? "#a0603a" : "#ff8fb8" }, itemAt: [24, -6] }, dy);
      const spoonArm = arm(1, { w: [lerp(392, 352, up), lerp(560, 440, up)], bend: -36, hand: "fist", hang: -0.6, item: { k: "spoon", load: q(u < 0.5 ? 1 : 0.2, 2), tilt: -0.3 }, itemAt: [-6, -18] }, dy);
      arms = [bowl, spoonArm];
      e = fastK > 0.5 ? "shovel" : "eager"; look = fastK > 0.5 ? [0, 0.5] : [0.4, 0.2];
      tilt = fastK * 0.05 * Math.sin(u * Math.PI * 2);
      if (peak) {
        if (isBean) { e = "meme"; tilt = 0.04 * Math.sin(t * 50); arms = [bowl, arm(1, { w: [420, 450], bend: -40, hand: "fist", hang: -0.4, item: { k: "spoon", load: 0.6, tilt: -0.3 }, itemAt: [-6, -18] }, dy)]; }
        else { e = "wince"; tilt = 0.06 + 0.02 * Math.sin(t * 40); arms = [bowl, arm(1, { w: [392, 300], bend: -46, hand: "fist", hang: -1.05, hk: 0.4 }, dy)]; } // (qa2) a fist to the temple: an open hand cropped by the close-up edge read as a V sign
      }
    } else {
      u = loopU(t, 0.75, K.seed);
      const lick = slowK * smooth(clamp01(1 - Math.abs(u - 0.5) * 3));
      const cArm = arm(1, { w: [lerp(440, 372, lick), lerp(520, 405, lick)], bend: -44, hand: "pinky", hang: -0.5, item: cone(0, t * 0.4, 1, { lick: q(lick, 10) }) }, dy);
      arms = [arm(0, { w: [210, 600], bend: 20, hand: "rest", hang: 0.6 }, dy), cArm];
      e = slowK > 0.5 ? (lick > 0.35 ? "dainty" : "chill") : "happy"; look = [-0.3, 0];
      if (peak) { e = "smug"; look = [-1, 0.1]; }
    }
    const s: PersonS = {
      look: K.look, head: [HEAD[0], HEAD[1] + dy], a: 100, tilt: q(tilt, 50), face: { e, look, k: isBean ? memeK : 1, shake: frameNo(t) },
      lid: ["shovel", "meme", "wince", "dainty"].includes(e) ? 0 : blink(t, 50 + i, [T4_FAST, T4_SLOW, T4_PEAK]), seed: K.seed,
      body: [BODY[0], BODY[1] + dy], rx: 112, ry: 125, arms: arms.map(qa), legs: [{ hip: [262, 700], foot: [250, 950], bend: 8 }, { hip: [338, 700], foot: [350, 950], bend: -8 }], stool: STOOL,
      ice: isBean && peak ? memeK : 0, frost: isBean && peak ? q(Math.min(1, memeK), 10) : 0, frozen: isBean && peak ? 0.6 : 0,
    };
    const Aj: V3 = isBean && peak ? add(A, [jit(t, 0.006), 0, 0]) : A;
    const kc = personCard(`kid${i}`, Aj, s, lt, K.sc, A, 0.7);
    kc.yaw = Math.max(-KID_YAW, Math.min(KID_YAW, yawOf(Aj, cp)));
    cards.push(kc);
    const ky = kc.yaw, head = cardW(Aj, s.head, K.sc, cp, 0.03, ky);
    if (isBean) { heads.bean = head; hands.bean = handsOf(Aj, s, K.sc, cp, ky); }
    kidsOut.push({ A: Aj, head, fast: K.fast, sc: K.sc, mouth: cardW(Aj, [300, s.head[1] + 50], K.sc, cp, 0.05, ky), spoon: cardW(Aj, add2(palmOf(s.arms[1]), [0, -50]), K.sc, cp, 0.06, ky), u });
  });
  // ---- the SCHOOLKID ----
  {
    const click = ramp(t, W.schoolkid - 0.15 - LEAD, 0.2), press = q(env(t, W.schoolkid - 0.05, W.schoolkid + 0.12, 0.08, 0.15), 10);
    const hold = arm(1, { w: [lerp(410, 452, click), lerp(600, 470, click)], bend: -40, hand: "fist", hang: -0.4, item: { k: "stopwatch", press: q(click * 0.6 + press * 0.4, 10) }, itemAt: [0, -40] });
    const point = arm(0, { w: [60, 430], bend: 6, hand: "point", hang: 0.0 });
    const a0 = mixArm(arm(0, { w: [190, 660], bend: 14, hand: "rest", hang: 0.2 }), point, G.point * (1 - ramp(t, T4_PEAK + 0.15, 0.3))); // (qa2) drops the point (off screen, on the chart) so her hand stays out of BEAN's close-up
    let e: Expr = "focus", look: P2 = [-0.6, 0.2];
    const sw = [W.schoolkid - 0.15 - LEAD, T4_FAST, T4_SLOW, T4_POINT, T4_PEAK];
    if (t < sw[0]) { e = "happy"; look = [-0.5, 0.3]; }
    else if (t < sw[1]) { e = "focus"; look = [0.3, 0.2]; }
    else if (t < sw[2]) { e = "focus"; look = [-0.8, 0.3]; }
    else if (t < sw[3]) { e = "focus"; look = [0.8, 0.3]; }
    else if (t < sw[4]) { e = "proud"; look = [-0.9, 0]; }
    else { e = "gasp"; look = [-0.9, 0.2]; }
    const s: PersonS = { look: GIRL, head: HEAD, a: 100, tilt: q(e === "proud" ? -0.06 : 0.02 * Math.sin(t * 1.3), 50), face: { e, look, shake: frameNo(t) }, lid: e === "proud" ? 0 : blink(t, 61, sw), seed: 53, body: BODY, rx: 106, ry: 122, arms: [qa(a0), qa(hold)], legs: legsStand() };
    cards.push(personCard("girl", GIRL_AT, s, lt, GIRL_SC, GIRL_AT, 0.7));
    heads.girl = cardW(GIRL_AT, HEAD, GIRL_SC, cp, 0.03); hands.girl = handsOf(GIRL_AT, s, GIRL_SC, cp);
  }
  // ---- her DAD ----
  {
    const DH: P2 = [300, 215], DB: P2 = [300, 475], dsh: [P2, P2] = [[182, 352], [418, 352]];
    const darm = (i: 0 | 1, o: Omit<ArmS, "sh">): ArmS => ({ sh: dsh[i], thick: 44, mirror: i === 1, sleeve: 0.95, ...o });
    const up = ramp(t, W.dad - 0.15 - LEAD, 0.25) * (1 - ramp(t, W.half - 0.4, 0.35)), wr = ramp(t, W.half - 0.3, 0.3);
    const board = darm(0, { w: [lerp(230, 150, up), lerp(560, 260, up)], bend: lerp(40, 20, up), hand: "fist", hang: 0.9, item: { k: "clipboard", tilt: q(lerp(0.35, -0.1, up), 20) }, itemAt: [40, -10] });
    const sc = 0.5 + 0.5 * Math.sin(t * 22);
    const pen = darm(1, { w: [lerp(410, 330 + 10 * sc * wr, wr), lerp(640, 560 + 6 * sc * wr, wr)], bend: -30, hand: wr > 0.5 ? "point" : "rest", hang: wr > 0.5 ? -1.4 : -0.1 });
    let e: Expr = "happy", look: P2 = [-0.4, 0.2];
    const sw = [W.dad - 0.15 - LEAD, W.half - 0.3, T4_PEAK];
    if (t < sw[0]) { e = "happy"; }
    else if (t < sw[1]) { e = "proud"; }
    else if (t < sw[2]) { e = "focus"; look = [-0.5, 0.8]; }
    else { e = "gasp"; look = [-0.9, 0.1]; }
    const s: PersonS = { look: DAD, head: DH, a: 92, tilt: q(0.02 * Math.sin(t * 1.1 + 1), 50), face: { e, look, shake: frameNo(t) }, lid: e === "proud" ? 0 : blink(t, 67, sw), seed: 59, body: DB, rx: 128, ry: 172, arms: [qa(board), qa(pen)], legs: [{ hip: [258, 615], foot: [250, 950], bend: 0 }, { hip: [342, 615], foot: [350, 950], bend: 0 }] };
    cards.push(personCard("dad", DAD_AT, s, lt, DAD_SC, DAD_AT, 0.9));
    heads.dad = cardW(DAD_AT, DH, DAD_SC, cp, 0.03); hands.dad = handsOf(DAD_AT, s, DAD_SC, cp);
  }
  return { cards, heads, hands, pts: {}, kids: kidsOut };
};

/** shot 5: the dusk park (the fix, the tongue, think, NAH, the ice block) */
const T5_FIX = W.fix - 0.15 - LEAD, T5_TONGUE = W.tongue - 0.25 - LEAD, T5_THINK = W.or - 0.1 - LEAD, T5_NAH = W.nah - 0.05 - LEAD, T5_ICE = W.nah + 0.25 - LEAD;
const endRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const E = endAt(5, t);
  const fixK = ramp(t, T5_FIX, 0.2) * (1 - ramp(t, W.press - 0.2, 0.25)), thinkK = ramp(t, T5_THINK, 0.3) * (1 - ramp(t, T5_NAH, 0.08)), ice = E.ice;
  // (qa2) the shove lands on "Nah": the hand reaches the mouth ~frame 988 (the gulp SFX), the cone shrinks INTO the mouth
  const nahK = ramp(t, T5_NAH, 0.14), gulpK = ramp(t, T5_NAH + 0.1, 0.1);
  const A: V3 = add(BEAN_PK, [jit(t, 0.003 * ramp(t, T5_NAH, 0.05) * (1 - ice)), 0, 0]);
  // screen-left hand: an INDEX finger straight up beside the head (the fix?) | the index finger on the chin (hmm...)
  const finger = arm(0, { w: [128, 318], bend: 34, hand: "point", hang: 0.62, hk: 0.42 });
  const scr = Math.sin(t * 9) * 4 * thinkK;
  const chin = arm(0, { w: [244 + scr, 494 - scr * 0.5], bend: 58, hand: "scratch", hang: -0.1, hk: 0.36 });
  let a0 = mixArm(mixArm(restArm(0), finger, fixK), chin, thinkK);
  a0 = mixArm(a0, restArm(0), nahK);
  // the cone: held up beside him; raised to eye level to look at (think); SHOVED in (nah); gone into the mouth
  const held = coneArm(cone());
  const lookC = arm(1, { w: [436, 456], bend: -50, hand: "fist", hang: -0.5 });
  const shove = arm(1, { w: [352, 430], bend: -40, hand: "fist", hang: -0.9 });
  let a1 = mixArm(mixArm(held, lookC, thinkK), shove, nahK);
  a1 = mixArm(a1, restArm(1), ramp(t, T5_NAH + 0.24, 0.14));
  const coneK = 1 - gulpK;
  a1.item = coneK > 0.02 ? cone(0, t * 0.5, 3, { tilt: q(-1.2 * nahK, 20), sc: q(Math.max(0.02, coneK), 20) }) : undefined;
  let e: Expr = "yum", lookE: P2 = [0, 0], tilt = 0;
  const sw = [T5_FIX, W.press - 0.2 - LEAD, T5_TONGUE, T5_THINK, T5_NAH, T5_NAH + 0.12, T5_ICE];
  if (t < sw[0]) { e = "yum"; }
  else if (t < sw[1]) { e = "fix"; tilt = -0.06; }
  else if (t < sw[2]) { e = "happy"; lookE = [0, -0.3]; }
  else if (t < sw[3]) { e = "puff"; tilt = 0.05 * Math.sin(t * 2.5); }
  else if (t < sw[4]) { e = "think"; lookE = [0.95, 0.35]; tilt = 0.08; }
  else if (t < sw[5]) { e = "aah"; tilt = 0.06; }
  else if (t < sw[6]) { e = "stuffed"; tilt = -0.03; }
  else { e = "deadpan"; lookE = [0, 0]; }
  const s: PersonS = {
    look: BEAN, head: HEAD, a: 100, tilt: q(tilt, 50), face: { e, look: lookE, shake: frameNo(t) }, lid: ["puff", "stuffed", "fix", "deadpan", "aah"].includes(e) ? 0 : blink(t, 9, sw),
    body: BODY, rx: 112, ry: 125, arms: [qa(a0), qa(a1)], legs: legsStand(), frozen: q(ice, 20), frost: q(ice, 20),
  };
  return {
    cards: [personCard("bean5", A, s, lt, BSC, BEAN_PK)],
    heads: { bean: cardW(A, HEAD, BSC, cp, 0.03) }, hands: { bean: handsOf(A, s, BSC, cp) },
    pts: { body: add(A, [0, 0.78, 0]), mouth: cardW(A, [300, 345], BSC, cp, 0.05), finger: cardW(A, add2(palmOf(s.arms[0]), [0, -60]), BSC, cp, 0.05), cone: cardW(A, add2(palmOf(s.arms[1]), [0, -120]), BSC, cp, 0.05) },
  };
};

const rigAt = (id: number, t: number, cp: THREE.Vector3, lt = 0): Rig | null =>
  id === 1 ? hookRig(t, cp, lt) : id === 3 ? hqRig(t, cp, lt) : id === 4 ? gymRig(t, cp, lt) : id === 5 ? endRig(t, cp, lt) : null;

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -999, 0];
/** world head centre (who = "bean" | "brain" | "girl" | "dad") */
export const headAt = (id: number, t: number, who = "bean"): V3 => rigAt(id, t, camPosAt(id, t))?.heads[who] ?? NOWHERE;
/** world palm centre: side 0 = screen-left, 1 = screen-right */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => rigAt(id, t, camPosAt(id, t))?.hands[who]?.[side] ?? NOWHERE;
/** BEAN's card anchor (soles) */
export const beanAt = (id: number, _t: number): V3 => (id === 1 || id === 5 ? BEAN_PK : id === 4 ? BEAN_GYM : NOWHERE);

// ---------------- drawing ----------------
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const V = new THREE.Vector3();
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number } | null = null;
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t))));
  const fwd = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) };
};
/** canvas tier from the card's projected height on the 2560-px final (textures <= 2048) */
const tierOf = (P: V3, cardH: number): [number, number, number] => {
  const d = VIEW ? Math.max(0.3, V.set(P[0], P[1], P[2]).distanceTo(VIEW.pos)) : 5, th = VIEW?.th ?? 0.414;
  const px = (cardH / (2 * d * th)) * 2560;
  const h = px < 330 ? 400 : px < 700 ? 800 : px < 1150 ? 1280 : 2048;
  return [Math.round(h * 0.6), h, h / 1000];
};
const placeCard = (out: Stage, c: Card) => {
  const mid: V3 = [c.A[0], c.A[1] + 1.0 * c.sc, c.A[2]];
  const [w, h, k] = tierOf(mid, 2.16 * c.sc);
  out.places.push({ key: c.key, draw: c.draw, x: c.A[0], y: c.A[1], z: c.A[2], scale: c.sc, yaw: c.yaw, size: [w, h, k] });
  if (c.blob) blob(out, c.blob[0], c.blob[1] + 0.012, c.blob[2], c.blobSc ?? 0.8, 1);
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
/** keep a camera-facing card (centre P, size w x h) in frame: clear of the edges, the watermark and the captions */
const fit = (P: V3, w: number, h: number): V3 => {
  if (!VIEW) return P;
  const v = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return P;
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.92 - w / 2, top = hy * 0.72 - h / 2, bot = -hy * 0.12 + h / 2;
  const nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  return add(add(P, [VIEW.right.x, VIEW.right.y, VIEW.right.z], nx - x), [VIEW.up.x, VIEW.up.y, VIEW.up.z], ny - y);
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?" | "!!", size = 0.2) => {
  const k = env(t, t0, t1);
  if (k < 0.02) return;
  const w = m === "!!" ? size * 1.33 : size;
  fxCard(out, `mark${m}`, m === "!!" ? 400 : 300, 400, (p) => fxMark(p, m, MARK_COL[m]), fit([P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], w, size * 1.33), w * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
const word = (out: Stage, t: number, t0: number, t1: number, P: V3, txt: string, style: "ouch" | "alarm" | "ahh" | "nah" | "chomp", w: number, rot = 0, din = 0.18) => {
  const k = env(t, t0, t1, din, 0.22);
  if (k < 0.02) return;
  const ph = style === "ahh" ? q(t % 10, 8) : style === "ouch" ? q((Math.floor(t * 12) % 2) * 0.1, 10) : 0;
  fxCard(out, `word|${txt}|${style}|${ph}`, 800, 500, (p) => fxWord(p, txt, style, ph), fit(P, w, w * 0.62), w * k, w * 0.62 * k, { rot: rot + 0.04 * Math.sin(t * 4) });
};
const sparkles = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.08, cols = ["#fff6a8", "#ffffff", "#bff0ff"]) => {
  const g = env(t, t0, t1, 0.3, 0.4);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.2 + hh(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * hh(seed, j + 20));
    const col = cols[j % cols.length];
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.6 * spread, 0.15), s, s, { rot: t * 0.8 + j });
  }
};
/** frost crystals drifting / twinkling round a point */
const crystals = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.06) => {
  const g = env(t, t0, t1, 0.25, 0.35);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 0.6 + hh(seed, j)) % 1, s = size * g * Math.sin(Math.PI * ph) * (0.7 + 0.6 * hh(seed, j + 20));
    fxCard(out, `flake|${j % 2}`, 256, 256, (p) => fxSnowflake(p, j % 2), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.2 * spread + 0.1 * ph, 0.12), s, s, { rot: t * 0.6 + j });
  }
};
const vapour = (out: Stage, t: number, t0: number, t1: number, P: V3, cam: CamInfo, size = 0.25, n = 3, seed = 3) => {
  if (t < t0 || t > t1 + 1.2) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const per = 1.4, s0 = t0 + j * (per / n) - per, cyc = Math.floor((t - s0) / per), b = s0 + cyc * per, s = (t - b) / per;
    if (b > t1) continue;
    const k = Math.sin(Math.PI * s) * clamp01((t - t0) / 0.3);
    if (k < 0.02) continue;
    fxCard(out, `vap|${(j + seed) % 3}`, 256, 256, (p) => fxVapour(p, (j + seed) % 3), at3(P, R, U, N, (j - (n - 1) / 2) * 0.08 + 0.05 * Math.sin(s * 3 + j), -0.05 + 0.2 * s, 0.1), size * (0.6 + 0.6 * s) * k, size * 0.8 * (0.6 + 0.6 * s) * k, { soft: true, rot: 0.3 * Math.sin(s * 2 + j) });
  }
};
const burstShards = (out: Stage, t: number, t0: number, P: V3, cam: CamInfo, r: number, n: number, seed: number, size = 0.08, dur = 0.8) => {
  const s0 = t - t0;
  if (s0 < 0 || s0 > dur) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + hh(seed, j), d = r + s0 * (0.9 + 0.6 * hh(seed, j + 3)), k = Math.sin(Math.PI * Math.min(1, s0 / dur));
    fxCard(out, `shard|${j % 3}`, 256, 256, (p) => fxShard(p, j % 3), at3(P, R, U, N, Math.cos(a) * d, Math.sin(a) * d * 0.85 - 0.4 * s0 * s0, 0.15), size * k, size * k, { rot: -a + Math.PI / 2 + s0 * 3 });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  const lt = lightOf(cam);
  const rig = rigAt(id, t, cam.pos, lt);
  if (!rig) return out;
  for (const c of rig.cards) placeCard(out, c);
  if (id === 1) hookFx(t, rig, cam, out);
  else if (id === 3) hqFx(t, rig, cam, out);
  else if (id === 4) gymFx(t, rig, cam, out);
  else if (id === 5) endFx(t, rig, cam, out);
  return out;
};

const hookFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const H = hookAt(1, t), head = rig.heads.bean, { R, U, N } = camVecs(cam, head);
  // the chomp: a little sparkle pop at the scoop
  sparkles(out, t, 0.02, 0.3, rig.pts.scoop, cam, 0.08, 3, 3, 0.05, ["#ffffff", "#ffd2e4"]);
  // brain freeze: frost crystals on the forehead, cold vapour off the cone, OUCH
  crystals(out, t, 0.3, T1_LID - 0.1, rig.pts.forehead, cam, 0.14, 4, 5, 0.05 * H.frost + 0.01);
  vapour(out, t, 0.1, 3.2, rig.pts.scoop, cam, 0.16, 2, 1);
  word(out, t, T1_OUCH + 0.04, T1_LID - 0.25, at3(head, R, U, N, -0.34, 0.2, 0.12), "OUCH!", "ouch", 0.36, -0.14, 0.12);
  // the lid pops: sparkles over the brain (the SIGN carries the gag)
  sparkles(out, t, T1_LID + 0.15, T1_LID + 0.7, rig.pts.brain, cam, 0.12, 4, 7, 0.05);
};

const hqFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const top = rig.pts.top, { R, U, N } = camVecs(cam, top);
  mark(out, t, T3_ALERT, T3_ALERT + 0.9, at3(top, R, U, N, 0.18, 0.18, 0.05), "!", 0.22);
  mark(out, t, T3_FORE, T3_FORE + 0.7, at3(top, R, U, N, 0.38, 0.12, 0.05), "!!", 0.2);
  mark(out, t, T3_CONF + 0.05, T3_BLAME - 0.12, at3(top, R, U, N, -0.3, 0.22, 0.05), "?", 0.26);
  mark(out, t, T3_CONF + 0.25, T3_BLAME - 0.12, at3(top, R, U, N, 0.12, 0.34, 0.05), "?", 0.18);
  // the SLAM: impact star at the glove, the FOREHEAD! alarm word up-right
  const sk = env(t, T3_BLAME + 0.05, T3_BLAME + 0.3, 0.06, 0.15);
  if (sk > 0.02) fxCard(out, "impact|y", 512, 512, (p) => fxImpact(p, "#ffe14a"), add(rig.pts.slam, [0, 0, 0.05]), 0.5 * sk, 0.5 * sk, { rot: t * 2 });
  word(out, t, T3_BLAME + 0.06, W.face + 0.3, at3(top, R, U, N, 0.25, 0.5, 0.2), "FOREHEAD!", "alarm", 0.95, 0.06, 0.16); // (cam) gone before the push into the eye window
  sparkles(out, t, T3_BLAME, T3_BLAME + 0.5, rig.pts.slam, cam, 0.12, 4, 9, 0.07);
};

const gymFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const G = gymAt(4, t), kids = rig.kids ?? [];
  // the stopwatch CLICK
  const gh = rig.hands.girl?.[1];
  if (gh) { const k = env(t, W.schoolkid - 0.05, W.schoolkid + 0.5, 0.1, 0.2); if (k > 0.02) fxCard(out, "click", 512, 256, fxClick, fit(add(gh, [0.05, 0.22, 0.05]), 0.36, 0.18), 0.36 * k, 0.18 * k); }
  // FAST: splats fly off the shovelling spoons + speed lines; SLOW: little hearts
  kids.forEach((K, i) => {
    const { R, U, N } = camVecs(cam, K.head);
    if (K.fast && G.fast > 0.5 && t < T4_PEAK + 0.1) {
      for (let j = 0; j < 2; j++) {
        const u = (K.u + j * 0.5) % 1, k = Math.sin(Math.PI * u);
        const col = ["#ff8fb8", "#8ff0c8", "#a0603a"][(i + j) % 3], sd = (i + j) % 2 ? 1 : -1;
        fxCard(out, `splat|${col}|${j}`, 256, 256, (p) => fxSplat(p, col, j + 2), at3(K.spoon, R, U, N, sd * (0.05 + 0.3 * u), 0.05 + 0.35 * u - 0.45 * u * u, 0.12), 0.07 * k, 0.07 * k, { rot: u * 4 });
      }
      for (const sd of [-1, 1]) { const k = 0.8 * G.fast; fxCard(out, "speed", 256, 512, fxSpeed, at3(K.head, R, U, N, sd * 0.3 * K.sc / 0.85, -0.18, 0.05), 0.07 * k, 0.17 * k, { rot: sd * 0.25 }); }
    }
    if (!K.fast && G.slow > 0.5 && t < T4_PEAK + 0.6) {
      const u = (t * 0.6 + i * 0.37) % 1, k = Math.sin(Math.PI * u) * G.slow;
      fxCard(out, "heart|p", 256, 256, (p) => fxHeart(p, "#ff7ab0"), at3(K.head, R, U, N, 0.2 + 0.05 * Math.sin(u * 6), 0.12 + 0.25 * u, 0.06), 0.07 * k, 0.07 * k, { rot: 0.2 * Math.sin(u * 5) });
    }
    if (K.fast && i !== 2) { // the other fast kids WINCE at the peak: sweat drops
      const k = env(t, T4_PEAK + 0.06, 99, 0.15, 0.2);
      if (k > 0.02) fxCard(out, "sweat", 200, 260, fxSweat, at3(K.head, R, U, N, 0.2, 0.15, 0.06), 0.06 * k, 0.078 * k);
    }
  });
  // THE PEAK: BEAN's MEME FREEZE: frost explosion behind his head, ice shards burst, "!!", vapour, crystals
  const bean = rig.heads.bean;
  if (bean && t >= T4_MEME) {
    const { R, U, N } = camVecs(cam, bean), s0 = t - T4_MEME;
    const kin = q(Math.min(1.12, Math.max(0, spring(s0, 11, 4.5))), 30), w = 1.5;
    fxCard(out, `fburst|${kin}|${q(t * 2, 2)}`, 1024, 1024, (p) => fxFrostBurst(p, kin, t * 2), at3(bean, R, U, N, 0, 0.05, -0.25), w, w, { soft: true });
    const rk = env(t, T4_MEME, 99, 0.12, 0.3);
    fxCard(out, "rays|ice", 512, 512, (p) => fxRays(p, "#9ae0ff", "#ffffff", 0.45), at3(bean, R, U, N, 0, 0.05, -0.3), 2.4 * rk, 2.4 * rk, { rot: t * 0.5, soft: true });
    burstShards(out, t, T4_MEME, at3(bean, R, U, N, 0, 0.05, 0), cam, 0.22, 9, 31, 0.09, 0.9);
    mark(out, t, T4_MEME + 0.04, 789 / FPS, at3(bean, R, U, N, 0.3, 0.34, 0.1), "!!", 0.12); // (qa2) shrinks away before the whip (fit() dragged it across the whip) // (cam) smaller: clear of the face in the close-up
    crystals(out, t, T4_MEME, 99, bean, cam, 0.4, 6, 33, 0.07);
    vapour(out, t, T4_MEME + 0.1, 99, at3(bean, R, U, N, 0, 0.25, 0), cam, 0.3, 3, 5);
  }
};

const endFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const E = endAt(5, t), head = rig.heads.bean, { R, U, N } = camVecs(cam, head);
  // "The fix?": a twinkle on the raised finger
  sparkles(out, t, T5_FIX + 0.05, W.press - 0.3, rig.pts.finger, cam, 0.06, 3, 41, 0.06);
  // warm tongue: a warm glow round his head + "ahh" + hearts
  const gk = env(t, T5_TONGUE + 0.1, T5_THINK - 0.2, 0.35, 0.3) * E.tongue;
  if (gk > 0.02) fxCard(out, "glow|warm", 256, 256, (p) => fxGlow(p, "#ffb070", 0.75), at3(head, R, U, N, 0, 0.0, -0.08), 0.9 * gk, 0.9 * gk, { soft: true });
  word(out, t, W.warm + 0.3, T5_THINK - 0.25, at3(head, R, U, N, 0.36, 0.28, 0.12), "ahh", "ahh", 0.4, 0.1, 0.3);
  for (let j = 0; j < 3; j++) {
    const u = ((t - T5_TONGUE) * 0.7 + j / 3) % 1, k = Math.sin(Math.PI * u) * gk;
    if (k > 0.02 && t > T5_TONGUE) fxCard(out, "heart|w", 256, 256, (p) => fxHeart(p, "#ff8a7a"), at3(head, R, U, N, -0.25 + 0.04 * Math.sin(u * 6 + j) - 0.06 * j, 0.1 + 0.3 * u, 0.08), 0.06 * k, 0.06 * k, { rot: 0.2 * Math.sin(u * 5) });
  }
  // think: a "?" over his head
  mark(out, t, W.eat - 0.1, T5_NAH - 0.1, at3(head, R, U, N, 0.24, 0.3, 0.05), "?", 0.18);
  // NAH: speed lines on the shove, a poof
  const sk = Math.sin(Math.PI * clamp01((t - T5_NAH) / 0.25)) * (t > T5_NAH ? 1 : 0);
  if (sk > 0.02) fxCard(out, "speed", 256, 512, fxSpeed, at3(rig.pts.mouth, R, U, N, 0.38, -0.05, 0.05), 0.12 * sk, 0.3 * sk, { rot: Math.PI / 2 });
  const pk = env(t, T5_ICE - 0.02, T5_ICE + 0.1, 0.06, 0.15);
  if (pk > 0.02) for (let j = 0; j < 4; j++) { const a = j * 1.57 + 0.6; fxCard(out, "poof", 256, 256, fxPoof, at3(rig.pts.body, R, U, N, Math.cos(a) * 0.45, Math.sin(a) * 0.55, 0.3), 0.18 * pk, 0.18 * pk, { rot: a }); }
  // THE ICE BLOCK: springs up round him, glossy; frozen "nah" bubble; glints
  if (t > T5_ICE) { // (qa2) gate on the spring's own start (E.ice starts 2 frames later: the block popped in at 60 %)
    const kin = q(Math.min(1.08, Math.max(0, spring(t - T5_ICE, 14, 6))), 30), h = 1.62, w = h * 0.6;
    const C: V3 = at3(rig.pts.body, R, U, N, 0, 0.02, 0.22);
    fxCard(out, `iceblock|${q(Math.min(1, kin), 20)}`, 600, 1000, (p) => fxIceBlock(p, Math.min(1, kin * 1.2)), C, w * (0.85 + 0.15 * kin), h * kin, { soft: true });
    word(out, t, T5_ICE + 0.35, 99, at3(head, R, U, N, 0.42, 0.1, 0.35), "nah", "nah", 0.26, -0.08, 0.2);
    sparkles(out, t, T5_ICE + 0.2, 99, at3(rig.pts.body, R, U, N, 0, 0.35, 0.3), cam, 0.35, 4, 47, 0.08, ["#ffffff", "#d8f4ff"]);
    vapour(out, t, T5_ICE + 0.2, 99, at3(rig.pts.body, R, U, N, 0, -0.55, 0.3), cam, 0.35, 3, 7);
  }
};
