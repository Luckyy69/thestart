// OWNER: cast agent. Every character card and effect card per shot for "Why You Can't Tickle Yourself".
// Characters are our own bean-head drawings (fx.ts drawPerson) on bridge Actor cards. Card origin = the point between the
// feet ON the ground (canvas 300, 975); cards yaw to the camera. Everything is a pure function of (id, t) keyed off the
// story.ts W cues and state functions (selfTickleAt, robotAt, slowBotAt).
// CONTRACTS (world, metres; L = LAB, H = HOME):
//   HOME  BEAN stands at BEAN_HOME = H+(0,0,0) (shots 1-2); head centre H+(0,1.458,0) (headAt).
//         Shot 7: BEAN sits in the armchair, card plane BEAN_CHAIR = H+(-1.6,0,0.15) (in front of the chair centre
//         H+(-1.6,0,-0.3) so the chair never cuts his legs), seat top SEAT_CHAIR 0.44 m, head ~H+(-1.6,1.13,0.15).
//         His screen-right slipper is stretched out so that, from the camera, it sits on props.SLOW_TARGET (footAt(7,t,1)).
//   LAB   BEAN sits on the stool, card plane BEAN_LAB = L+(0,0,0.55), bum 0.60 m, head centre ~L+(0,1.30,0.55).
//         From the camera his screen-left hand (his right, PALM UP) sits on props.palmPos() and his screen-right fist
//         on props.handlePos(id,t) (camera-ray projection onto his card, so they line up from any camera).
//         Scientists stand behind the table: SCI_A (big red glasses, rust cardigan, clipboard) L+(-0.6,0,-0.5),
//         SCI_B (beard, 90s zigzag jumper) L+(0.6,0,-0.5). Shot 3: SCI_A's screen-left / SCI_B's screen-right hand hold
//         props.sheetCorners until the whip, then both fling "ta-da". SCI_B's screen-left fist grips props.dialPos().pos
//         during "delay" (34.38-36.4 s) and "longer" (40.6-41.8 s).
//   brain.ts BRAIN_HOOKS.head is set here (headAt) for shots 2 and 6.
//   Exports: headAt / mouthAt / eyesAt / handAt(id,t,who,side 0=screen-left 1=screen-right) / footAt / feetAt.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { BRAIN_HOOKS } from "./brain";
import { handlePos, palmPos, dialPos, sheetCorners, SLOW_TARGET } from "./props";
import { W, LEAD, FPS, HOME, LAB, RIG, SHOTS, V3, smooth, clamp01, selfTickleAt, robotAt, slowBotAt, shotStart, camAt } from "./story";
import {
  Kit, Pose, Face, FaceS, P2, drawPerson, jointsOf, lerp2, fxHaha, fxSquiggle, fxLimp, fxTear, fxSweat, fxSparkle, fxMark, fxMotion, fxHehe,
} from "./fx";

export type CastId = "bean" | "sciA" | "sciB";
const KITS: Record<CastId, Kit> = {
  bean: { seed: 21, skin: "#ffdcbc", hair: "#c8602a", hairStyle: "nest", top: "hoodie", topCol: "#22b3a3", topCol2: "#16867c", trim: "#ffc93c", legs: "#dd4450", legs2: "#fff1d6", tartan: true, shoes: "monster", shoeCol: "#9a63e0", freckles: true },
  sciA: { seed: 33, skin: "#f6d2b4", hair: "#5b2a1d", hairStyle: "bob", top: "cardigan", topCol: "#c0562f", topCol2: "#f3e6c8", trim: "#f2d28a", legs: "#3e3a52", legs2: "#3e3a52", shoes: "brogue", shoeCol: "#4a2c20", coat: true, glasses: "#d23a3a", badge: true, earPen: true },
  sciB: { seed: 47, skin: "#c98d62", hair: "#4a2c1e", hairStyle: "curls", top: "jumper", topCol: "#6a4cc0", topCol2: "#2ec4b6", trim: "#ffd23f", legs: "#3b4256", legs2: "#3b4256", shoes: "brogue", shoeCol: "#2a1a16", coat: true, beard: "#6a3f28" },
};
const IDX: Record<CastId, number> = { bean: 1, sciA: 2, sciB: 3 };

// ---------------- places ----------------
export const BEAN_HOME: V3 = [HOME[0], 0, HOME[2]];
export const STOOL: V3 = [LAB[0], 0, LAB[2] + 0.55];
export const BEAN_LAB: V3 = [LAB[0], 0, LAB[2] + 0.55];
export const ARMCHAIR: V3 = [HOME[0] - 1.6, 0, HOME[2] - 0.3];
export const BEAN_CHAIR: V3 = [HOME[0] - 1.6, 0, HOME[2] + 0.15];
export const SCI_A: V3 = [LAB[0] - 0.6, 0, LAB[2] - 0.5];
export const SCI_B: V3 = [LAB[0] + 0.6, 0, LAB[2] - 0.5];
const DS = 73, DC = 150; // seated drops (canvas units): stool head 1.30 m / bum 0.60 m, armchair head 1.13 m / bum 0.44 m
export const SEAT_STOOL = 0.6, SEAT_CHAIR = 0.44;
/** where BEAN's hands go (props.ts contracts): screen-left = his right palm (palm up), screen-right = the joystick grip */
export const handleAt = (id: number, t: number): V3 => handlePos(id, t);
export const PALM: V3 = palmPos();
export const DIAL: V3 = dialPos().pos;

// ---------------- helpers ----------------
const on = (t: number, w: number) => t >= w - LEAD;
const spring = (t: number, w: number, dur = 0.3) => { const u = clamp01((t - (w - LEAD)) / dur); return smooth(u) * (1 + 0.18 * Math.sin(u * Math.PI)); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };
const frameNo = (t: number) => Math.round(t * FPS);
type Vp = { x: number; y: number; z: number };
/** camera-ray projection of world point P onto the camera-facing card standing at A (canvas units) */
const proj = (cp: Vp, A: V3, P: V3): P2 => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const s = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * s, Qy = cp.y + dy * s, Qz = cp.z + dz * s;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / SU, 2), q(975 - ly / SU, 2)];
};
const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const m = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, k);
  const d = k < 0.5 ? a : b;
  const ha = (i: 0 | 1) => { const x = a.ha?.[i] ?? null, y = b.ha?.[i] ?? null; return x !== null && y !== null ? lerp(x, y, k) : k < 0.5 ? x : y; };
  return {
    ...d,
    feet: [lerp2(a.feet[0], b.feet[0], k), lerp2(a.feet[1], b.feet[1], k)],
    knees: a.knees && b.knees ? [lerp2(a.knees[0], b.knees[0], k), lerp2(a.knees[1], b.knees[1], k)] : d.knees,
    hands: [lerp2(a.hands[0], b.hands[0], k), lerp2(a.hands[1], b.hands[1], k)],
    ha: [ha(0), ha(1)],
    drop: m(a.drop, b.drop), lean: m(a.lean, b.lean), headTilt: m(a.headTilt, b.headTilt), shrug: m(a.shrug, b.shrug), shake: m(a.shake, b.shake), twitch: m(a.twitch, b.twitch), wig: b.wig ?? a.wig,
  };
};
type Seg = [number, (t: number) => Pose];
const segPose = (t: number, segs: Seg[], dur = 0.28): Pose => {
  let i = 0;
  for (let j = 0; j < segs.length; j++) if (t >= segs[j][0]) i = j;
  const cur = segs[i][1](t);
  if (i === 0) return cur;
  const k = smooth((t - segs[i][0]) / dur);
  return k >= 1 ? cur : mixPose(segs[i - 1][1](t), cur, k);
};

// ---------------- poses ----------------
const STAND: [P2, P2] = [[258, 948], [342, 948]];
const REST: [P2, P2] = [[208, 616], [392, 616]];
const standBase = (): Pose => ({ feet: STAND, hands: REST, hk: ["rest", "rest"] });
/** tickle claws: ready in front of the chest (reach 0) -> digging into his own ribs (reach 1), fingers wiggling */
const tickle = (reach: number, t: number): Pose => {
  const a0 = lerp(-1.05, -0.08, reach);
  return {
    feet: STAND, hands: [lerp2([232, 470], [228, 540], reach), lerp2([368, 470], [372, 540], reach)], hk: ["wiggle", "wiggle"],
    ha: [a0, Math.PI - a0], front: [true, true], wig: q(t * 14, 1),
  };
};
const SHRUG: Pose = { feet: STAND, hands: [[164, 512], [436, 512]], hk: ["open", "open"], ha: [-2.25, -0.89], shrug: 16 };
/** "That's not you": a finger wag */
const wag = (t: number): Pose => ({ feet: STAND, hands: [[226, 600], [448, 344]], hk: ["rest", "point"], ha: [null, -Math.PI / 2 + 0.36 * Math.sin(t * 15)], front: [false, true] });
/** "That's your brain": index finger taps the temple */
const tap = (t: number): Pose => ({ feet: STAND, hands: [REST[0], [446, q(276 + 7 * Math.abs(Math.sin(t * 9)), 2)]], hk: ["rest", "point"], ha: [null, Math.PI + 0.3] });

const SEAT_KNEES: [P2, P2] = [[236, 702], [364, 702]], SEAT_FEET: [P2, P2] = [[248, 866], [352, 866]], LAP: [P2, P2] = [[252, 690], [348, 690]];
const seated = (): Pose => ({ feet: SEAT_FEET, knees: SEAT_KNEES, hands: LAP, hk: ["rest", "rest"], front: [true, true], drop: DS });
const CH_KNEES: [P2, P2] = [[238, 778], [362, 778]], CH_FEET: [P2, P2] = [[250, 946], [350, 946]];

// ---------------- rigs ----------------
type Rig = { who: CastId; kit: Kit; pose: Pose; face: FaceS; swaps: number[]; A: V3; kick?: [number, number] };

const bean1 = (t: number): Rig => {
  const pose = segPose(t, [
    [-9, (u) => tickle(selfTickleAt(1, u).reach, u)],
    [W.nothing - 0.25, () => SHRUG],
    [W.notyou - 0.25, wag],
    [W.brain0 - 0.32, tap],
  ]);
  const e = faceAt(t, [[-9, "stone"], [W.wait, "stone2"], [W.nothing, "shrug"], [W.notyou, "nope"], [W.brain0, "smart"]]);
  return { who: "bean", kit: KITS.bean, pose, face: { e, k: 1 }, swaps: [W.wait, W.nothing, W.notyou, W.brain0], A: BEAN_HOME };
};
const bean2 = (t: number): Rig => {
  let pose = mixPose(tap(t), standBase(), smooth((t - shotStart(2)) / 0.55)); // continuous with the end of shot 1
  const st = selfTickleAt(2, t);
  if (st.reach > 0) pose = mixPose(pose, tickle(st.reach, t), smooth(st.reach / 0.3));
  const e = faceAt(t, [[-9, "watch"], [W.turns, "calm"], [W.fingers - 0.3, "deadpan"]]);
  return { who: "bean", kit: KITS.bean, pose, face: { e }, swaps: [W.turns, W.fingers - 0.3], A: BEAN_HOME };
};
const MEME_T = W.tickled; // the peak: "it tickled."
const beanLab = (id: number, t: number, cp: Vp): Rig => {
  const pose = seated(), rb = robotAt(id, t), f = frameNo(t);
  let kick: [number, number] = [0, 0];
  if (id >= 4) {
    const grip = proj(cp, BEAN_LAB, handleAt(id, t)), palm = proj(cp, BEAN_LAB, PALM);
    const kH = id === 4 ? smooth((t - (W.handle - 0.65)) / 0.45) : 1, kP = id === 4 ? smooth((t - (W.tickles - 0.95)) / 0.45) : 1;
    pose.hands = [lerp2(LAP[0], palm, kP), lerp2(LAP[1], grip, kH)];
    pose.hk = [kP > 0.55 ? "palm" : "rest", kH > 0.55 ? "grip" : "rest"];
    pose.ha = [null, kH > 0.55 ? -1.9 : null];
    pose.twitch = rb.tickle > 0.02 ? q((0.5 + 0.5 * Math.sin(t * (9 + 22 * rb.tickle))) * Math.min(1, rb.tickle * 2.5), 10) : 0;
  }
  let e: Face = "curious", k = 1;
  const swaps: number[] = [];
  if (id === 3) { e = faceAt(t, [[-9, "curious"], [W.robot - 0.2, "wow"]]); swaps.push(W.robot - 0.2); }
  else if (id === 4) { e = faceAt(t, [[-9, "wow"], [W.handle, "focus"], [W.tickles, "peek"], [W.barely, "bored"], [W.delay, "curious"]]); swaps.push(W.handle, W.tickles, W.barely, W.delay); }
  else if (id === 5) {
    e = faceAt(t, [[-9, "bored"], [W.suddenly, "uhoh"], [MEME_T, "meme"]]); swaps.push(W.suddenly);
    if (e === "uhoh") k = 1;
    if (e === "meme") {
      k = q(Math.min(1.12, spring(t, MEME_T, 0.16)) + 0.08 * smooth((t - W.tickled2) / 0.3), 50);
      const m = smooth((t - (MEME_T - LEAD)) / 0.12), h = 1 + 0.6 * smooth((t - W.tickled2) / 0.4);
      pose.lean = q(m * (-0.05 + 0.06 * Math.sin(t * Math.PI * 2 * 2.4)), 200);
      pose.headTilt = q(m * 6 * Math.sin(t * Math.PI * 2 * 3.1), 4);
      pose.shake = m * 3 * h * (f % 2 ? 1 : -1);
      pose.drop = q(DS - m * 9 * h * Math.abs(Math.sin(t * Math.PI * 4.4)), 2);
      kick = [0, 1].map((sd) => m * Math.max(0, Math.sin(t * Math.PI * 2 * 2.3 * h + sd * Math.PI))) as [number, number];
    }
  } else { // id 6: worn out, still giggling
    e = "pant";
    pose.drop = q(DS - 4 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 1.7)), 2);
    pose.lean = q(0.02 * Math.sin(t * Math.PI * 2 * 0.9), 200);
    kick = [0, 1].map((sd) => 0.35 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.3 + sd * Math.PI))) as [number, number];
  }
  if (kick[0] > 0 || kick[1] > 0) {
    const kn = pose.knees!, ft = pose.feet;
    pose.knees = [0, 1].map((sd) => { const s = sd ? 1 : -1; return [q(kn[sd][0] + s * 10 * kick[sd], 2), q(kn[sd][1] - 26 * kick[sd], 2)]; }) as [P2, P2];
    pose.feet = [0, 1].map((sd) => { const s = sd ? 1 : -1; return [q(ft[sd][0] + s * 62 * kick[sd], 2), q(ft[sd][1] - 150 * kick[sd], 2)]; }) as [P2, P2];
  }
  return { who: "bean", kit: KITS.bean, pose, face: { e, k, shake: f % 6 }, swaps, A: BEAN_LAB, kick };
};
const bean7 = (t: number, cp: Vp): Rig => {
  const g = smooth((t - (W.slow - 0.1)) / 0.25), b = Math.abs(Math.sin(t * Math.PI * 6.2)) * g;
  const st = proj(cp, BEAN_CHAIR, SLOW_TARGET), ft: P2 = [st[0], st[1] - 8 * 2.36]; // slipper sole centre on the feather tip
  const pose: Pose = {
    feet: [[q(CH_FEET[0][0] - 8 * g * Math.sin(t * 17), 2), CH_FEET[0][1]], [q(ft[0] + 5 * g * Math.sin(t * 17 + 1.3), 2), q(ft[1] - 8 * b, 2)]],
    knees: [CH_KNEES[0], [q((CH_KNEES[1][0] + ft[0]) / 2 + 6, 2), q(Math.min(CH_KNEES[1][1], ft[1] - 40), 2)]], hands: [[256, q(664 - 6 * b, 2)], [352, 748]], hk: ["rest", "rest"], hold: ["mug", null], front: [true, true],
    drop: q(DC - 5 * b, 2), shrug: q(6 * b, 2), headTilt: q(5 * g * Math.sin(t * Math.PI * 2 * 2), 4),
  };
  const e = faceAt(t, [[-9, "content"], [W.robot2, "peek"], [W.slow - 0.05, "giggle"]]);
  return { who: "bean", kit: KITS.bean, pose, face: { e, look: e === "peek" ? [0.7, 1] : undefined }, swaps: [W.robot2, W.slow - 0.05], A: BEAN_CHAIR };
};

const SCI_REST: [P2, P2] = [[212, 612], [388, 612]];
const sciBase = (): Pose => ({ feet: STAND, hands: SCI_REST, hk: ["rest", "rest"] });
const notes = (t: number, speed = 1): Pose => ({
  feet: STAND, hands: [[250, 548], [q(316 + 7 * Math.sin(t * 9 * speed), 2), q(532 + 3 * Math.sin(t * 14 * speed), 2)]], hk: ["rest", "rest"],
  hold: ["clipboard", "pencil"], front: [true, true],
});
const sciA = (id: number, t: number, cp: Vp): Rig => {
  let pose: Pose, e: Face = "notes";
  const swaps: number[] = [];
  if (id === 3) {
    pose = segPose(t, [
      [-9, (u) => ({ feet: STAND, hands: [[q(282 + 5 * Math.sin(u * 16), 2), 528], [q(318 - 5 * Math.sin(u * 16), 2), 524]], hk: ["rest", "rest"], front: [true, true] })],
      [W.beat + 0.3, (u) => ({ feet: STAND, hands: [proj(cp, SCI_A, sheetCorners(3, u)[0]), [404, 600]], hk: ["grip", "rest"] })],
      [W.robot - 0.22, () => ({ feet: STAND, hands: [[148, 262], [452, 240]], hk: ["open", "open"], ha: [-2.3, -0.8] })],
    ], 0.3);
    e = faceAt(t, [[-9, "sly"], [W.robot, "tada"]]); swaps.push(W.robot);
  } else if (id === 4) {
    pose = segPose(t, [
      [-9, () => ({ feet: STAND, hands: [[148, 262], [452, 240]], hk: ["open", "open"], ha: [-2.3, -0.8] })], // matches shot 3's end through the dissolve
      [shotStart(4) + 0.35, (u) => notes(u)],
      [W.fraction - 0.32, () => ({ ...notes(0), hands: [[250, 548], [410, 384]], hk: ["rest", "pinch"], ha: [null, -1.95], front: [true, false] })],
      [W.second + 0.7, (u) => notes(u)],
    ]);
    e = faceAt(t, [[-9, "tada"], [shotStart(4) + 0.5, "notes"], [W.fraction, "smile"], [W.second + 0.7, "notes"]]); swaps.push(shotStart(4) + 0.5, W.fraction, W.second + 0.7);
  } else if (id === 5) {
    const fast = on(t, W.longer) && !on(t, W.tickled2);
    pose = notes(t, fast ? 2.6 : on(t, MEME_T) ? 0 : 1);
    e = faceAt(t, [[-9, "notes"], [MEME_T + 0.1, "amazed"], [W.longer, "notes"], [W.tickled2, "amazed"]]); swaps.push(MEME_T + 0.1, W.longer, W.tickled2);
  } else { pose = notes(t, 2.2); e = "amazed"; }
  return { who: "sciA", kit: KITS.sciA, pose, face: { e }, swaps, A: SCI_A };
};
const sciB = (id: number, t: number, cp: Vp): Rig => {
  let pose: Pose, e: Face = "smile", look: P2 | undefined;
  const swaps: number[] = [];
  const dial = (t0: number, t1: number, turn: number) => (u: number): Pose => ({
    feet: STAND, hands: [proj(cp, SCI_B, DIAL), SCI_REST[1]], hk: ["grip", "rest"], front: [true, false],
    ha: [q(-1.5 + turn * smooth((u - t0) / Math.max(0.1, t1 - t0)), 50), null],
  });
  if (id === 3) {
    pose = segPose(t, [
      [-9, (u) => ({ feet: STAND, hands: [[196, 600], proj(cp, SCI_B, sheetCorners(3, u)[1])], hk: ["rest", "grip"] })],
      [W.robot - 0.22, () => ({ feet: STAND, hands: [[150, 236], [450, 262]], hk: ["open", "open"], ha: [-2.3, -0.8] })],
    ], 0.24);
    e = faceAt(t, [[-9, "sly"], [W.robot, "tada"]]); swaps.push(W.robot);
  } else if (id === 4) {
    pose = segPose(t, [[-9, () => ({ feet: STAND, hands: [[150, 236], [450, 262]], hk: ["open", "open"], ha: [-2.3, -0.8] })], [shotStart(4) + 0.45, sciBase], [W.delay - 0.55, dial(W.delay, W.second, 0.9)], [W.second + 0.5, sciBase]], 0.4);
    e = faceAt(t, [[-9, "tada"], [shotStart(4) + 0.6, "smile"], [W.delay - 0.2, "focus"], [W.second + 0.5, "sly"]]); swaps.push(shotStart(4) + 0.6, W.delay - 0.2, W.second + 0.5);
    if (e === "smile") look = [-1, 0.4];
  } else if (id === 5) {
    pose = segPose(t, [[-9, sciBase], [W.longer - 0.5, dial(W.longer, W.longer + 1.0, 1.3)], [W.tickled2 + 0.4, sciBase]], 0.4);
    e = faceAt(t, [[-9, "sly"], [W.suddenly, "focus"], [MEME_T, "amazed"], [W.longer - 0.3, "grin"], [W.tickled2 + 0.3, "amazed"]]);
    swaps.push(W.suddenly, MEME_T, W.longer - 0.3, W.tickled2 + 0.3);
    if (e === "focus") look = [-1, 0.5];
  } else { pose = sciBase(); e = "amazed"; }
  return { who: "sciB", kit: KITS.sciB, pose, face: { e, look }, swaps, A: SCI_B };
};

const rigsAt = (id: number, t: number, cp: Vp): Rig[] => {
  if (id === 1) return [bean1(t)];
  if (id === 2) return [bean2(t)];
  if (id === 7) return [bean7(t, cp)];
  return [sciA(id, t, cp), sciB(id, t, cp), beanLab(id, t, cp)];
};

// ---------------- frames / exported contracts ----------------
type Frame = { o: V3; c: number; s: number; yaw: number };
const frameOf = (cp: Vp, A: V3): Frame => { const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]); return { o: A, c: Math.cos(yaw), s: Math.sin(yaw), yaw }; };
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  const lx = (P[0] - 300) * SU, ly = (975 - P[1]) * SU;
  return [F.o[0] + F.c * lx + F.s * fwd, F.o[1] + ly, F.o[2] - F.s * lx + F.c * fwd];
};
const camPosAt = (id: number, t: number): Vp => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, t * FPS))).pos; return { x: c[0], y: c[1], z: c[2] }; };
const NOWHERE: V3 = [0, -100, 0];
const withRig = (id: number, t: number, who: CastId, fn: (r: Rig, F: Frame, J: ReturnType<typeof jointsOf>) => V3): V3 => {
  const cp = camPosAt(id, t), r = rigsAt(id, t, cp).find((x) => x.who === who);
  if (!r) return NOWHERE;
  return fn(r, frameOf(cp, r.A), jointsOf(r.pose, r.face));
};
/** world head centre (brain hologram anchor). BEAN standing ~HOME+(0,1.458,0); on the stool ~LAB+(0,1.30,0.55) */
export const headAt = (id: number, t: number, who: CastId = "bean"): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.head, 0.03));
/** world mouth point */
export const mouthAt = (id: number, t: number, who: CastId = "bean"): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.mouth, 0.05));
/** world eye points [screen-left, screen-right] (as a 6-vector: use eyesAt(..)[0] / [1]) */
export const eyesAt = (id: number, t: number, who: CastId = "bean"): [V3, V3] => [withRig(id, t, who, (_r, F, J) => toWorld(F, J.eyes[0], 0.05)), withRig(id, t, who, (_r, F, J) => toWorld(F, J.eyes[1], 0.05))];
/** world hand point on the card: side 0 = screen-left (BEAN: the handle fist), 1 = screen-right (BEAN: the open palm) */
export const handAt = (id: number, t: number, who: CastId, side: 0 | 1): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.hands[side], 0.04));
/** BEAN's slipper (side 0 screen-left, 1 screen-right) */
export const footAt = (id: number, t: number, side: 0 | 1): V3 => withRig(id, t, "bean", (_r, F, J) => toWorld(F, [J.feet[side][0], J.feet[side][1] + 8 * 2.36], 0.05));
/** card origin (feet on the ground) */
export const feetAt = (id: number, t: number, who: CastId): V3 => withRig(id, t, who, (r) => r.A);

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo): Frame => {
  const F = frameOf(cam.pos, r.A);
  const d = cam.pos.distanceTo(new THREE.Vector3(r.A[0], r.A[1] + 1.2, r.A[2]));
  const [w, h, k] = tier(d);
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  const light = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
  const lid = q(lidAt(t, IDX[r.who] * 7, r.swaps), 2);
  const pose = r.pose, face = r.face, kit = r.kit;
  out.places.push({
    key: `ti|${r.who}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}`,
    draw: (p) => drawPerson(p, kit, pose, face, light, lid),
    x: F.o[0], y: F.o[1], z: F.o[2], yaw: F.yaw, scale: 1, size: [w, h, k],
  });
  return F;
};

// ---------------- effects ----------------
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) => {
  if (w < 0.004 || h < 0.004) return;
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
};
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const camVecs = (cam: CamInfo, at: V3) => {
  const n = new THREE.Vector3(cam.pos.x - at[0], cam.pos.y - at[1], cam.pos.z - at[2]).normalize();
  const up = new THREE.Vector3().crossVectors(n, cam.right).normalize();
  return { R: [cam.right.x, cam.right.y, cam.right.z] as V3, N: [n.x, n.y, n.z] as V3, U: [up.x, up.y, up.z] as V3 };
};
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.25 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
const at3 = (P: V3, R: V3, U: V3, N: V3, x: number, y: number, z: number) => add(add(add(P, R, x), U, y), N, z);

/** grey, drooping "nothing happening" squiggles at a rib (each one sags and fades, then another tries) */
const limp = (out: Stage, t: number, rib: V3, side: number, cam: CamInfo, k: number, seed: number) => {
  if (k < 0.02) return;
  const { R, U, N } = camVecs(cam, rib);
  for (let j = 0; j < 2; j++) {
    const ph = ((t * 0.85 + j * 0.5 + hh(seed, j)) % 1), s = k * Math.sin(Math.PI * clamp01(ph / 0.9)) * (0.22 + 0.04 * j);
    const sag = q(smooth(ph / 0.85), 10);
    fxCard(out, `limp|${sag}`, 256, 256, (p) => fxLimp(p, sag), at3(rib, R, U, N, side * (0.2 + 0.05 * j), 0.06 - 0.08 * j, 0.12), s, s, { rot: side > 0 ? 0 : Math.PI });
  }
};
const SQ_COLS = ["#ff4f9a", "#ffd23a", "#3fd8ff", "#7dff6a", "#ff8a2a"];
/** colourful tickle squiggles buzzing round a point (power 0..1) */
const squiggles = (out: Stage, t: number, P: V3, cam: CamInfo, power: number, seed: number, grey = false) => {
  if (power < 0.02) return;
  const { R, U, N } = camVecs(cam, P), n = 2 + Math.round(4 * Math.min(1, power));
  for (let j = 0; j < n; j++) {
    const ph = (t * (1.6 + 1.4 * power) + j / n + hh(seed, j)) % 1, a = (j / n) * Math.PI * 2 + 0.6 * Math.sin(t * 1.3 + j);
    const r = 0.06 + 0.05 * power + 0.03 * ph, s = (0.05 + 0.08 * power) * Math.sin(Math.PI * ph);
    const v = (Math.floor(t * 12) + j) % 4, col = grey ? "#d8dbe4" : SQ_COLS[(j + seed) % SQ_COLS.length];
    fxCard(out, `sq|${v}|${col}`, 256, 256, (p) => fxSquiggle(p, v, col), at3(P, R, U, N, Math.cos(a) * r, Math.sin(a) * r * 0.8 + 0.03, 0.12), s, s, { rot: -a });
  }
};
const HAHA: [number, number, number, string, string][] = [
  [-0.36, 0.16, 0.24, "HA!", "#ff4f9a"], [0.37, 0.32, 0.3, "HAHA!", "#ffbf1f"], [-0.32, 0.47, 0.26, "HAHA!", "#22c4ff"],
  [0.35, 0.04, 0.22, "HA!", "#ff7a2a"], [0.04, 0.62, 0.32, "HAHAHA!", "#ff4f9a"], [-0.38, -0.04, 0.22, "HA!", "#ffbf1f"],
];
/** HAHA! bursts popping round the head (scale in / out, gently drifting up) */
const hahas = (out: Stage, t: number, t0: number, t1: number, head: V3, cam: CamInfo, gap: number, size = 1, pale = false) => {
  const { R, U, N } = camVecs(cam, head);
  for (let i = 0; i < 60; i++) {
    const b = t0 + i * gap;
    if (b > t1) break;
    if (t < b || t > b + 1.05) continue;
    const S = HAHA[i % HAHA.length], k = env(t, b, b + 0.72, 0.15, 0.28), word = pale ? (i % 2 ? "ha.." : "ha!") : S[3], col = pale ? "#ffb3cf" : S[4];
    const w = S[2] * k * size * (pale ? 0.62 : 1);
    fxCard(out, `haha|${word}|${col}|${i % 3}`, 640, 420, (p) => fxHaha(p, word, col, i % 3), at3(head, R, U, N, S[0] * (pale ? 0.85 : 1), S[1] * (pale ? 0.7 : 1) + 0.07 * (t - b), 0.22), w, w * 0.656, { rot: (i % 2 ? 0.16 : -0.16) + 0.05 * Math.sin((t - b) * 11) });
  }
};
/** tears of laughter squirting sideways out of both eyes */
const tearJets = (out: Stage, t: number, t0: number, eyes: [V3, V3], cam: CamInfo, power: number) => {
  if (t < t0 || power < 0.02) return;
  const { R, U, N } = camVecs(cam, eyes[0]);
  for (let j = 0; j < 10; j++) {
    const sd = j % 2, side = sd ? 1 : -1, birth = t0 + j * 0.035;
    if (t < birth) continue;
    const ph = ((t - birth) * 2.4 + hh(j, 7)) % 1, tt = ph * 0.5;
    const x = side * (0.05 + (0.55 + 0.25 * hh(j, 3)) * tt * power), y = 0.02 + 0.5 * tt * power - 2.4 * tt * tt;
    const s = 0.04 * (0.75 + 0.5 * hh(j, 5)) * Math.sin(Math.PI * Math.min(1, ph / 0.95)) * Math.min(1, (t - birth) / 0.1);
    fxCard(out, "tear", 128, 160, fxTear, at3(eyes[sd], R, U, N, x, y, 0.1), s, s * 1.25, { rot: side * (0.6 + 1.6 * ph) });
  }
};
/** shake arcs either side of the head ")))" / "(((" */
const shakeLines = (out: Stage, t: number, head: V3, cam: CamInfo, k: number, dist = 0.42) => {
  if (k < 0.03) return;
  const { R, U, N } = camVecs(cam, head), f = frameNo(t);
  for (const side of [-1, 1]) {
    const s = 0.17 * k * (f % 2 ? 1 : 0.88);
    fxCard(out, "motion", 256, 256, fxMotion, at3(head, R, U, N, side * (dist + 0.02 * (f % 2)), 0.05, 0.1), s, s, { rot: side > 0 ? 0 : Math.PI });
  }
};
const sparkles = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.09) => {
  const g = env(t, t0, t1, 0.3, 0.4);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.1 + hh(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * hh(seed, j + 20));
    const col = j % 3 === 0 ? "#fff6a8" : j % 3 === 1 ? "#ffffff" : "#ffd0f0";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.4 * spread, 0.15), s, s, { rot: t * 0.8 + j });
  }
};
/** a ring of sparkles bursting out from a point at t0 */
const sparkBurst = (out: Stage, t: number, t0: number, C: V3, cam: CamInfo, r0: number, r1: number) => {
  const u = (t - t0) / 0.7;
  if (u < 0 || u > 1) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < 10; j++) {
    const a = (j / 10) * Math.PI * 2 + 0.3, r = r0 + (r1 - r0) * smooth(u), s = 0.1 * Math.sin(Math.PI * u) * (j % 2 ? 0.7 : 1);
    const col = j % 2 ? "#fff6a8" : "#ffd0f0";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, Math.cos(a) * r, Math.sin(a) * r, 0.18), s, s, { rot: u * 2 + j });
  }
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), [P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
const sweat = (out: Stage, t: number, from: number, temple: V3, cam: CamInfo, rate: number, side = 1) => {
  if (t < from) return;
  const { R, U, N } = camVecs(cam, temple);
  for (let j = 0; j < 2; j++) {
    const ph = ((t - from) * rate + j * 0.5) % 1, k = Math.sin(Math.PI * ph) * smooth((t - from) / 0.2);
    fxCard(out, "sweat", 200, 260, fxSweat, at3(temple, R, U, N, side * (0.06 + 0.07 * ph + 0.03 * j), 0.02 - 0.1 * ph, 0.1), 0.06 * k, 0.078 * k, { rot: -side * 0.35 });
  }
};
const hehe = (out: Stage, t: number, t0: number, head: V3, cam: CamInfo) => {
  if (t < t0) return;
  const { R, U, N } = camVecs(cam, head);
  for (let i = 0; i < 8; i++) {
    const b = t0 + i * 0.62;
    if (t < b || t > b + 1.0) continue;
    const k = env(t, b, b + 0.6, 0.16, 0.3), word = i % 2 ? "hee hee!" : "hehe!", side = i % 2 ? -1 : 1;
    fxCard(out, `hehe|${word}`, 400, 220, (p) => fxHehe(p, word), at3(head, R, U, N, side * 0.34, 0.2 + 0.08 * (t - b) + (i % 2) * 0.1, 0.15), 0.3 * k, 0.165 * k, { rot: side * 0.08 });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  for (const r of rigsAt(id, t, cam.pos)) {
    const F = drawRig(out, r, t, cam), J = jointsOf(r.pose, r.face);
    const w3 = (P: P2, fwd = 0.04) => toWorld(F, P, fwd);
    const head = w3(J.head, 0.03), meme = r.face.e === "meme";
    if (!r.pose.knees) blob(out, r.A[0], 0.012, r.A[2], 1, 1);
    if (r.who === "bean") {
      if (id === 1 || id === 2) {
        const st = selfTickleAt(id, t), lk = smooth((st.reach - 0.55) / 0.3) * (id === 1 ? 1 - smooth((t - (W.nothing - 0.1)) / 0.25) : 1);
        limp(out, t, w3(J.ribs[0], 0.06), -1, cam, lk, 3);
        limp(out, t, w3(J.ribs[1], 0.06), 1, cam, lk, 5);
        if (id === 1) {
          mark(out, t, W.right - 0.05, W.notyou - 0.35, add(head, [0, 0.42, 0]), "?", 0.2);
          sparkles(out, t, W.brain0 - 0.1, SHOTS[0].b / FPS + 0.6, w3([J.hands[1][0] - 40, J.hands[1][1] - 10], 0.08), cam, 0.06, 3, 11, 0.06);
        }
      } else if (id === 7) {
        mark(out, t, W.robot2 + 0.05, W.slow - 0.25, add(head, [0, 0.38, 0]), "?", 0.16);
        const tk = slowBotAt(7, t).tickle;
        squiggles(out, t, w3([J.feet[1][0], J.feet[1][1] + 8], 0.08), cam, 0.55 * tk, 4);
        hehe(out, t, W.slow, head, cam);
        sparkles(out, t, W.slow, 99, add(head, [0, 0.05, 0]), cam, 0.32, 5, 17, 0.07);
      } else {
        const rb = robotAt(id, t), palm = w3(J.hands[0], 0.1), grip = w3(J.hands[1], 0.1);
        if (id === 3) {
          mark(out, t, W.robot - 0.05, W.robot + 1.4, add(head, [0, 0.4, 0]), "!", 0.18);
        }
        if (id === 3 || id === 4) sparkles(out, t, W.robot - 0.25, W.robot + 1.3, [RIG[0], RIG[1] + 0.32, RIG[2] + 0.05], cam, 0.42, 9, 23, 0.1);
        if (id >= 4) {
          // the handle hand moving: little motion arcs on the outside of the fist
          const mv = Math.abs(Math.cos(rb.phase)) * rb.run;
          if (id === 4 && mv > 0.05) { const { R, U, N } = camVecs(cam, grip); fxCard(out, "motion", 256, 256, fxMotion, at3(grip, R, U, N, 0.09, 0.01, 0.05), 0.09 * mv, 0.09 * mv, { rot: 0 }); }
          const weak = id === 4 || (id === 5 && !on(t, MEME_T));
          if (weak) {
            if (id === 4 && on(t, W.barely)) limp(out, t, palm, -1, cam, smooth((t - W.barely) / 0.3), 9);
            else squiggles(out, t, palm, cam, rb.tickle * 1.6, 7, true);
          } else squiggles(out, t, palm, cam, id === 6 ? 0.75 : rb.tickle, 7);
          if (id === 4) sparkles(out, t, W.second - 0.15, W.second + 0.9, [DIAL[0], DIAL[1] + 0.12, DIAL[2]], cam, 0.1, 4, 29, 0.08);
        }
        if (id === 5) {
          const tp = w3(J.temple[1], 0.06);
          if (r.face.e === "uhoh") sweat(out, t, W.suddenly + 0.1, tp, cam, 1.1);
          if (meme) {
            const h = 1 + 0.25 * smooth((t - W.tickled2) / 0.3);
            hahas(out, t, MEME_T - LEAD, SHOTS[4].b / FPS + 1, head, cam, 0.27, h);
            tearJets(out, t, MEME_T + 0.05, [w3(J.eyes[0], 0.06), w3(J.eyes[1], 0.06)], cam, h);
            shakeLines(out, t, head, cam, smooth((t - MEME_T) / 0.15), 0.44);
            sparkBurst(out, t, MEME_T - LEAD, head, cam, 0.2, 0.62);
            if (on(t, W.longer)) sparkles(out, t, W.longer, W.longer + 1.2, [DIAL[0], DIAL[1] + 0.12, DIAL[2]], cam, 0.1, 4, 31, 0.08);
            for (const sd of [0, 1] as const) {
              const kk = r.kick?.[sd] ?? 0;
              if (kk > 0.45) { const ft = w3(J.feet[sd], 0.08), { R, U, N } = camVecs(cam, ft), s = 0.12 * smooth((kk - 0.45) / 0.3); fxCard(out, "motion", 256, 256, fxMotion, at3(ft, R, U, N, (sd ? 1 : -1) * 0.08, 0.02, 0.05), s, s, { rot: sd ? -0.4 : Math.PI + 0.4 }); }
            }
          }
        }
        if (id === 6) {
          hahas(out, t, shotStart(6) + 0.1, SHOTS[5].b / FPS + 1, head, cam, 0.6, 0.9, true);
          sweat(out, t, shotStart(6), w3(J.temple[0], 0.06), cam, 1.3, -1);
        }
      }
    } else {
      const top = add(head, [0, 0.42, 0]);
      if (id === 5) mark(out, t, MEME_T + (r.who === "sciA" ? 0.12 : 0.2), MEME_T + 1.3, top, "!", 0.17);
      if (id === 3 && r.who === "sciB") { // the sheet yank: whoosh arcs at the flung hand
        const k = env(t, W.robot - 0.3, W.robot + 0.15, 0.1, 0.2), hp = w3(J.hands[1], 0.08), { R, U, N } = camVecs(cam, hp);
        fxCard(out, "motion", 256, 256, fxMotion, at3(hp, R, U, N, 0.08, -0.06, 0.05), 0.14 * k, 0.14 * k, { rot: -0.8 });
      }
    }
  }
  return out;
};
// the X-ray brain (brain.ts) rides on BEAN's real head centre in shots 2 and 6
BRAIN_HOOKS.head = (id, t) => (id === 2 || id === 6 ? headAt(id, t, "bean") : undefined);
