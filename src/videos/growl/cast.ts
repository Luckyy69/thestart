// OWNER: cast. Every character card + effect card for "The Cleaning Crew". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, hookAt, bellyAt, fullAt, staffAt, endAt).
// Expressions land 0-3 frames before their word (LEAD). One feeling per line; the MEME face only at the hall peak.
// CONTRACTS (world metres; Ha = HALL, Be = BELLY, St = STAFF). Character cards are yaw-billboards (face the camera).
//   BEAN (shots 1, 5): soles at BEAN_AT = Ha(0, 0, 0), scale KSC 0.8 (seated: seat y 0.45, lap ~0.47, hoodie belly
//        y 0.82, head centre ~1.21 m, head half-width 0.17 m). His card yaw is clamped to +-0.9 rad round -z (he faces
//        the front of the hall), so cameras should look at him from the FRONT (z < 0).
//   BELLY_HOOK: the tiny hatch on his hoodie belly (the sign / gloved hand / "sorry" crew member come out of it), 5 cm
//        in front of the card toward -z: the dive target.
//   PUPILS (shots 1, 5): seated at PUPIL_SEATS (seat positions = BEAN's layout: desk 0.35 m toward -z of each seat).
//        The middle front seat Ha(0,0,-1.4) and the seat behind BEAN are left EMPTY so a front camera sees BEAN.
//   TEACHER (shots 1, 5): soles at TEACHER_AT = Ha(0.55, 0, -4.4) (behind the front desk at z -3.8), faces +z.
//   CREW (shot 2): asleep in hammocks at CREW_BEDS (lying, body centre ~y 0.85: the belly hammocks should hang there),
//        jump down to CREW_STAND on bellyAt.wake, SURF the squeeze wave (front x = -6 + 13 * bellyAt.squeeze: swap
//        squeezeX() for the belly's SQUEEZE_X), hop off at x ~4.6-6, walk to CREW_WATCH by the air bubble, cover their
//        ears on squish, are blown back on growl. Card scale CREW_SC 1.15 (~1.2 m tall). The GRRROWL letters are cast
//        FX cards (big wobbly letters + 2 echoes over the bubble).
//   FULL (shot 3): crew 0 is squashed under a pizza slice at SQUASH_AT (thumbs-up on fullAt.thumbs), 2 more stand by
//        the corner and bob on squeeze2; "mmf" bubble on muffle.
//   STAFF (shot 4): FOREMAN at FOREMAN_AT = St(-1.25, 0, -1.05) (scale 1.55) points up-right at the schedule board /
//        clock, blows the whistle (TWEET!); the crew sip coffee round St(0.4, 0, -0.3) and RUN out toward +x
//        (STAFF_EXIT = St(3.8, 0, 0)) on staffAt.run.
//   Exports: headAt / handAt (who = "bean" | "teacher" | "foreman" | "crew0".."crew4"), beanAt, BELLY_HOOK, positions.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, HALL, BELLY, STAFF, SHOTS, V3, smooth, clamp01, camAt, hookAt, bellyAt, fullAt, staffAt, endAt } from "./story";
import {
  P2, KidS, KidLook, ArmS, Expr, CrewS, CrewPose, CrewLook, TeacherS, drawKid, drawTeacher, drawCrew, spring, SKIN_B, BELLY_PT, T_HEAD,
  CREW_LOOKS, FOREMAN, HAND_WRIST, fxSweat, fxMark, MARK_COL, fxSparkle, fxSpeed, fxPuff, fxZ, fxWobble, fxWord, fxGrowl, fxShock,
  fxGlow, fxSpray, fxSteam, fxPencil, fxRays, fxPaper, fxImpact,
} from "./fx";
import { squeezeAt, broomAt, floorY, HAMMOCKS, PIZZA_AT } from "./belly";
import { DESKS } from "./sets";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ha = (x: number, y: number, z: number) => at(HALL, x, y, z);
const Be = (x: number, y: number, z: number) => at(BELLY, x, y, z);
const St = (x: number, y: number, z: number) => at(STAFF, x, y, z);
export const KSC = 0.8;
export const BEAN_AT: V3 = Ha(0, 0, 0);
const KHEAD: P2 = [300, 272], KBODY: P2 = [300, 528], KRX = 118, KRY = 166;
/** the dive target: the hatch on BEAN's hoodie belly, 5 cm in front of his card (toward -z) */
export const BELLY_HOOK: V3 = [BEAN_AT[0], BEAN_AT[1] + (975 - BELLY_PT[1]) * SU * KSC, BEAN_AT[2] - 0.05];
/** (cam integration) on sets.ts DESKS[] (i = row * 4 + col): BEAN = 6; the front-middle 2 and the seat behind him 10 stay empty (+ 8) */
export const PUPIL_SEATS: V3[] = [1, 3, 5, 7, 9, 11, 0, 4].map((i) => [DESKS[i][0], DESKS[i][1], DESKS[i][2]] as V3);
export const TEACHER_AT: V3 = Ha(0.55, 0, -4.4);
const TSC = 0.95;
export const CREW_SC = 1.15, CR = 180, FSC = 1.55;
export const CORNER: V3 = Be(-3, 0, 2.5);
/** (cam integration) the belly's 2 real HAMMOCKS (2 crew in each, head to toe along the sagging cloth) + crew 1 asleep on the
 *  floor by the crate under the alarm clock. Card anchor = the bottom of the lying body (it sinks 6 cm into the cloth). */
const bedIn = (h: number, dx: number, slope: number): V3 => [HAMMOCKS[h][0] + dx, HAMMOCKS[h][1] + 0.8 * (dx / 0.95) ** 2 - 0.06, HAMMOCKS[h][2] + dx * slope];
export const CREW_BEDS: V3[] = [bedIn(0, -0.42, 0.174), Be(-3.05, 0.0, 1.05), bedIn(1, -0.42, -0.165), bedIn(0, 0.42, 0.174), bedIn(1, 0.42, -0.165)];
export const CREW_STAND: V3[] = [Be(-5.0, 0, 1.4), Be(-4.0, 0, 0.6), Be(-2.3, 0, 1.3), Be(-4.9, 0, -0.25), Be(-1.6, 0, 0.6)]; // crew 3 lands at the broom (the pusher)
export const CREW_WATCH: V3[] = [Be(3.3, 0, 1.0), Be(3.95, 0, 1.7), Be(4.6, 0, 0.6), Be(3.6, 0, -0.2), Be(4.4, 0, -1.0)];
/** the surf lanes (BELLY z) across the juice pool */
export const SURF_Z = [3.0, 1.45, 0.75, -1.0, -2.6]; // (qa1) was [2.3, 1.2, 0.1, -1.0, -2.1]: lanes 2 + 4 surfed through the air bubble (z -2.15..0.15), lane 0 through the steered broom handle (z 2.0)
/** (cam integration) on the open floor at the FRONT of the pile (beside the belly's 3D hero pizza, PIZZA_AT is buried
 *  under peas from every camera that sees the pile), so the stray slice that flattens crew 0 reads on a phone */
export const SQUASH_AT: V3 = Be(3.0, 0, 0.9);
/** (cam) shot 3: the crew line up on the open floor in front of the pile (x > 2.6), crew 0 in the middle under the slice */
const CREW_FULL: V3[] = [SQUASH_AT, Be(3.1, 0, 2.6), Be(3.0, 0, -2.0), Be(3.2, 0, -0.75), Be(2.9, 0, 2.2)];
void PIZZA_AT;
export const FOREMAN_AT: V3 = St(-0.8, 0, -1.3); // (cam) right under the board/clock, clear of the crew's dash to the EXIT door
export const STAFF_CREW: V3[] = [St(-0.35, 0, -0.15), St(0.35, 0, -0.75), St(1.0, 0, -0.05), St(1.65, 0, -0.7), St(2.3, 0, -0.1)];
/** (cam integration) the staff room's EXIT door (staff.ts STAFF_EXIT, back wall left): the crew run out through it */
export const STAFF_EXIT: V3 = St(-2.17, 0, -2.4);
/** the squeeze-wave crest x (BELLY metres) of wave 1 / shot 3's squeeze2 (== belly.ts waveAt; squeezeAt(t).x parks at -6
 *  once a wave has passed, so the surf logic keeps this monotonic form; the HEIGHTS come from the belly's real floor) */
const squeezeX = (u: number) => -6 + 13 * u;
void squeezeAt;
/** feet on the belly's (deforming) floor */
const onFloor = (A: V3, t: number, lift = 0): V3 => [A[0], floorY(A[0], A[2], t) + lift, A[2]];
/** (QA2) the HIGHEST floor within r of A: a vertical card on a sloping floor stands on its crest (never sunk into it) */
const onCrest = (A: V3, t: number, r = 0.6): V3 => {
  let m = floorY(A[0], A[2], t);
  for (let k = 0; k < 12; k++) for (const d of [r / 2, r]) m = Math.max(m, floorY(A[0] + d * Math.cos(k * Math.PI / 6), A[2] + d * Math.sin(k * Math.PI / 6), t));
  return [A[0], m, A[2]];
};
/** where the broom pusher stands: on the floor under the point of the lifted handle at hand height (~0.8 m) */
const pushAt = (t: number): V3 => {
  const b = broomAt(t), x = b.head[0] - 0.62, z = b.head[2] + 0.38;
  return [x, floorY(x, z, t), z];
};

// ---------------- helpers ----------------
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
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
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** a yaw toward the camera, limited to +-lim round `centre` (seated kids stay clear of their desks) */
const clampYaw = (A: V3, cp: THREE.Vector3, centre: number, lim: number) => centre + Math.max(-lim, Math.min(lim, wrapA(yawOf(A, cp) - centre)));
/** canvas point on a card standing at A -> world (fwd = metres toward the viewer) */
const cardW = (A: V3, P: P2, sc: number, yaw: number, fwd = 0): V3 => {
  const c = Math.cos(yaw), s = Math.sin(yaw), lx = (P[0] - 300) * SU * sc, ly = (975 - P[1]) * SU * sc;
  return [A[0] + c * lx + s * fwd, A[1] + ly, A[2] - s * lx + c * fwd];
};
const blink = (t: number, i: number, swaps: number[] = []) => q(lidAt(t, i, swaps), 2);
const jit = (t: number, a: number, s = 0): number => a * (0.6 * Math.sin(t * 71 + s) + 0.4 * Math.sin(t * 113 + 1 + s));
const qa = (A: ArmS): ArmS => ({ ...A, w: [q(A.w[0], 1), q(A.w[1], 1)], sh: [q(A.sh[0], 1), q(A.sh[1], 1)] });
const mix2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const mixArm = (a: ArmS, b: ArmS, k: number): ArmS => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return { ...(k < 0.5 ? a : b), sh: mix2(a.sh, b.sh, k), w: mix2(a.w, b.w, k), bend: lerp(a.bend, b.bend, k), hang: lerp(a.hang ?? 0, b.hang ?? 0, k), hk: lerp(a.hk ?? 0.36, b.hk ?? 0.36, k) };
};

// ---------------- looks ----------------
const BEAN_LOOK: KidLook = { skin: SKIN_B, hair: "bean", hairCol: "#6a3b22", top: "#3a7dff", topDk: "#2a52b8", trim: "#ffd23a", bottom: "#3a3a52", shoes: "#ff3a4a", crest: true, nose: "#ff5a5a" };
type Pupil = { look: KidLook; seed: number; react: "gasp" | "stare" | "drop" | "snicker" | "lean"; sc: number };
const PUPILS: Pupil[] = [
  { seed: 31, sc: 0.78, react: "gasp", look: { skin: "#c99067", hair: "spiky", hairCol: "#2a2a3a", top: "#4ad06a", topDk: "#2a9a4a", trim: "#ffffff", bottom: "#3a4a6a", shoes: "#ffffff" } },
  { seed: 37, sc: 0.77, react: "drop", look: { skin: "#ffe2c2", hair: "bob", hairCol: "#f0b040", top: "#a86aff", topDk: "#7a44c8", trim: "#ffd23a", bottom: "#3a3a5a", shoes: "#ff6a9a" } },
  { seed: 41, sc: 0.8, react: "stare", look: { skin: "#8a5a3a", hair: "afro", hairCol: "#2a1a14", top: "#ffd23a", topDk: "#d8a020", trim: "#ff6a3a", bottom: "#3a8a8a", shoes: "#ff4a5a" } },
  { seed: 43, sc: 0.77, react: "snicker", look: { skin: "#f5c9a0", hair: "pigtails", hairCol: "#8a3a1a", top: "#ff7ab0", topDk: "#d84a88", trim: "#ffffff", bottom: "#4a5ac8", shoes: "#ffffff" } },
  { seed: 47, sc: 0.79, react: "lean", look: { skin: "#ecd0b6", hair: "curly", hairCol: "#d0602a", top: "#ff8a3a", topDk: "#d0602a", trim: "#3a8aff", bottom: "#3a3a5a", shoes: "#ffd23a", glasses: "#2a2a3a" } },
  { seed: 53, sc: 0.78, react: "gasp", look: { skin: "#ffe2c2", hair: "pony", hairCol: "#3a2214", top: "#3ad0c8", topDk: "#2a9a98", trim: "#ffffff", bottom: "#5a3a6a", shoes: "#ff4a5a", stripe: true } },
  { seed: 59, sc: 0.8, react: "stare", look: { skin: "#c99067", hair: "bun", hairCol: "#2a1a14", top: "#ff5a5a", topDk: "#c83a3a", trim: "#ffd23a", bottom: "#3a3a52", shoes: "#ffffff" } },
  { seed: 61, sc: 0.78, react: "stare", look: { skin: "#f5c9a0", hair: "spiky", hairCol: "#e8c060", top: "#6a8aff", topDk: "#4a5ac8", trim: "#ffffff", bottom: "#4a3a3a", shoes: "#4ad06a", stripe: true } },
];
const TEACHER_LOOK: KidLook = { skin: "#f5d0b0", hair: "teacher", hairCol: "#a8a8b8", top: "#e8b23a", topDk: "#b07a2a", trim: "#ffffff", bottom: "#7a3a4a", shoes: "#3a2a2a", nose: "#e8a890" };

// ---------------- kid layout (600 x 1000; head 272 a 100; seated: lap ~ y 672, desk top (0.75 m) ~ canvas 541) ----------------
const SHL: [P2, P2] = [[200, 410], [400, 410]];
type ArmP = Omit<ArmS, "sh">;
const karm = (i: 0 | 1, o: ArmP): ArmS => ({ sh: SHL[i], thick: 46, mirror: i === 1, ...o });
/** writing: the screen-left hand flat on the paper, the screen-right hand scribbling (u = scribble phase 0..1) */
const writeArms = (u: number, still = false): ArmS[] => {
  const s = still ? 0 : Math.sin(u * Math.PI * 2);
  return [karm(0, { w: [196, 494], bend: 30, hand: "rest", hang: -0.75, hk: 0.34 }), karm(1, { w: [398 + 10 * s, 490 + 4 * Math.cos(u * Math.PI * 2) * (still ? 0 : 1)], bend: -30, hand: "fist", hang: 0.7, hk: 0.34, pencil: 0 })];
};

// ---------------- rigs ----------------
type Card = { key: string; draw: (p: Pen) => void; A: V3; sc: number; yaw?: number; blob?: V3; blobSc?: number; blobK?: number; h?: number; mirror?: boolean };
type Rig = { cards: Card[]; heads: Record<string, V3>; hands: Record<string, [V3, V3]>; pts: Record<string, V3>; crew?: { A: V3; head: V3; pose: CrewPose; sc: number; i: number }[]; pupils?: { head: V3; react: Pupil["react"]; hand: V3; turn: number }[] };
const kidCard = (who: string, A: V3, s: KidS, lt: number, sc: number, yaw: number): Card =>
  ({ key: `gr|${who}|${fkey(s)}|${q(lt, 10)}`, draw: (p) => drawKid(p, s, lt), A, sc, yaw });
const palmOf = (A: ArmS): P2 => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const ang = Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), r = HAND_WRIST * 0.8 * (A.hk ?? 0.36);
  return [A.w[0] + Math.sin(ang) * r, A.w[1] - Math.cos(ang) * r];
};

// ---- the hall: BEAN + the pupils + the teacher ----
type BeanState = { e: Expr; look: P2; tilt: number; arms: ArmS[]; rumble: number; hatch: number; sign: number; wave: number; red: number; sink: number; mini: number; k: number; jit: number; lid: boolean; swaps: number[] };
/** per-shot face direction (unit xz) of a seated pupil: writing = -z; staring = toward BEAN */
const pupilFacing = (A: V3, stare: number): [number, number] => {
  const dx = BEAN_AT[0] - A[0], dz = BEAN_AT[2] - A[2], l = Math.hypot(dx, dz) || 1;
  const fx = lerp(0, dx / l, stare), fz = lerp(-1, dz / l, stare), n = Math.hypot(fx, fz) || 1;
  return [fx / n, fz / n];
};
/** 0 front .. +-0.7 three-quarter, +-1 back, from where a face points relative to the camera */
const turnOf = (A: V3, f: [number, number], cp: THREE.Vector3, right: THREE.Vector3) => {
  const tx = cp.x - A[0], tz = cp.z - A[2], l = Math.hypot(tx, tz) || 1, c = (f[0] * tx + f[1] * tz) / l;
  const side = f[0] * right.x + f[1] * right.z;
  if (c < -0.3) return Math.sign(side || 1);
  return q(Math.max(-0.7, Math.min(0.7, side * 0.9)), 10);
};
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number } | null = null;
/** screen-space look vector (canvas: +y down) from a head toward a world point */
const lookTo = (from: V3, to: V3): P2 => {
  if (!VIEW) return [0, 0];
  const d = new THREE.Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
  const x = d.dot(VIEW.right), y = -d.dot(VIEW.up), l = Math.hypot(x, y) || 1;
  return [q(x / l, 5), q(y / l, 5)];
};
const hallRig = (id: 1 | 5, t: number, cp: THREE.Vector3, lt: number, right: THREE.Vector3): Rig => {
  const cards: Card[] = [], heads: Record<string, V3> = {}, hands: Record<string, [V3, V3]> = {}, pts: Record<string, V3> = {};
  const B = id === 1 ? beanHook(t) : beanEnd(t);
  const E = endAt(5, t), stare = id === 5 ? E.stare : 0;
  // ---- BEAN ----
  const yaw = clampYaw(BEAN_AT, cp, Math.PI, 0.55);
  const A: V3 = add(BEAN_AT, [jit(t, B.jit), 0, 0]);
  const s: KidS = {
    look: BEAN_LOOK, head: KHEAD, a: 100, tilt: q(B.tilt, 50), face: { e: B.e, look: B.look, k: q(B.k, 20), shake: frameNo(t) }, lid: B.lid ? blink(t, 7, B.swaps) : 0, seed: 23,
    body: KBODY, rx: KRX, ry: KRY, arms: B.arms.map(qa), rumble: q(B.rumble, 20), ph: B.rumble > 0.01 ? frameNo(t) : 0,
    hatch: q(B.hatch, 20), sign: q(B.sign, 30), wave: q(B.wave, 20), red: q(B.red, 20), sink: q(B.sink, 30), mini: q(B.mini, 30),
    turn: turnOf(BEAN_AT, [0, -1], cp, right),
  };
  cards.push(kidCard("bean", A, s, lt, KSC, yaw));
  const sinkDy = 78 * B.sink, bodyDy = 34 * B.sink;
  heads.bean = cardW(A, [KHEAD[0], KHEAD[1] + sinkDy], KSC, yaw, 0.04);
  hands.bean = [cardW(A, palmOf(s.arms[0]), KSC, yaw, 0.05), cardW(A, palmOf(s.arms[1]), KSC, yaw, 0.05)];
  pts.belly = cardW(A, [BELLY_PT[0], BELLY_PT[1] + bodyDy], KSC, yaw, 0.05);
  pts.sign = cardW(A, [BELLY_PT[0] - 10, BELLY_PT[1] - 80], KSC, yaw, 0.06);
  pts.glove = cardW(A, [BELLY_PT[0] + 30, BELLY_PT[1] - 95], KSC, yaw, 0.06);
  pts.mini = cardW(A, [BELLY_PT[0] + 8, BELLY_PT[1] + bodyDy - 60], KSC, yaw, 0.06);
  // ---- the pupils ----
  const pupils: NonNullable<Rig["pupils"]> = [];
  PUPILS.forEach((P, i) => {
    const S = PUPIL_SEATS[i], delay = 0.06 * ((i * 3) % 5), st = id === 5 ? ramp(t, W.quietest - 0.25 + delay, 0.22) : 0;
    const f = pupilFacing(S, st), turn = turnOf(S, f, cp, right);
    const headW = cardW(S, KHEAD, P.sc, 0, 0);
    const look: P2 = st > 0.5 ? lookTo(headW, heads.bean) : [0.1 * Math.sin(i), 0.85];
    let e: Expr = "write", tilt = 0.06 * Math.sin(i * 2.1);
    const u = q(((t * 1.6 + hh(i, 3)) % 1), 4); // scribble on twos
    let arms = writeArms(u, st > 0.2);
    if (st > 0.5) {
      tilt = 0;
      e = P.react === "gasp" ? "gasp" : P.react === "snicker" ? (t > W.possible + 0.4 ? "snicker" : "stare") : "stare";
      if (P.react === "gasp") arms = [karm(0, { w: [262, 420], bend: 30, hand: "open", hang: 0.95, hk: 0.36 }), arms[1]];
      if (P.react === "drop") arms = [arms[0], karm(1, { w: [380, 470], bend: -30, hand: "splay", hang: -0.3, hk: 0.34 })];
      if (P.react === "snicker" && t > W.possible + 0.4) arms = [karm(0, { w: [258, 418], bend: 34, hand: "rest", hang: 1.1, hk: 0.36 }), arms[1]];
      if (P.react === "lean") tilt = -0.18 * Math.sign(f[0] * right.x + f[1] * right.z || 1);
    }
    const ps: KidS = { look: P.look, head: KHEAD, a: 100, tilt: q(tilt, 50), face: { e, look, shake: frameNo(t) }, lid: e === "write" || e === "snicker" ? 0 : blink(t, 40 + i, [W.quietest - 0.25 + delay]), seed: P.seed, body: KBODY, rx: KRX, ry: KRY, arms: arms.map(qa), turn };
    const py = clampYaw(S, cp, Math.PI, 0.55);
    cards.push(kidCard(`p${i}`, S, ps, lt, P.sc, py));
    const hd = cardW(S, KHEAD, P.sc, py, 0.04);
    pupils.push({ head: hd, react: P.react, hand: cardW(S, palmOf(ps.arms[1]), P.sc, py, 0.05), turn });
  });
  // ---- the teacher ----
  {
    const st = id === 5 ? ramp(t, W.quietest - 0.15, 0.3) : 0;
    const f: [number, number] = st > 0.5 ? (() => { const dx = BEAN_AT[0] - TEACHER_AT[0], dz = BEAN_AT[2] - TEACHER_AT[2], l = Math.hypot(dx, dz); return [dx / l, dz / l] as [number, number]; })() : [0, 1];
    const turn = turnOf(TEACHER_AT, f, cp, right);
    const headW = cardW(TEACHER_AT, T_HEAD, TSC, 0, 0);
    const ts: TeacherS = { look: TEACHER_LOOK, face: { e: st > 0.5 ? "glare" : "stern", look: st > 0.5 ? lookTo(headW, heads.bean) : [0.2, 0.7], shake: frameNo(t) }, lid: st > 0.5 ? 0 : blink(t, 88), tilt: q(st > 0.5 ? 0.05 : -0.04, 50), book: q(1 - st, 20), turn, light: lt };
    const ty = yawOf(TEACHER_AT, cp);
    cards.push({ key: `gr|teacher|${fkey(ts)}`, draw: (p) => drawTeacher(p, ts), A: TEACHER_AT, sc: TSC, yaw: ty, blob: TEACHER_AT, blobSc: 0.9 });
    heads.teacher = cardW(TEACHER_AT, T_HEAD, TSC, ty, 0.04);
    hands.teacher = [cardW(TEACHER_AT, [208, 520], TSC, ty, 0.05), cardW(TEACHER_AT, [392, 520], TSC, ty, 0.05)];
  }
  return { cards, heads, hands, pts, pupils };
};

/** shot 1: the hook (writing; the RUMBLE; puzzled look down; the hatch + sign + waving glove) */
const T1_DUCK = W.cleaning + 0.3; // (cam)
const T1_EEP = W.stomach - LEAD, T1_PUZ = W.doesnt - 0.15 - LEAD, T1_SIGN = W.means - 0.2 - LEAD, T1_STUN = W.means - 0.05 - LEAD;
const beanHook = (t: number): BeanState => {
  const H = hookAt(1, t);
  const scribble = q((t * 2.2) % 1, 4);
  let arms = writeArms(scribble, t > T1_EEP);
  let e: Expr = "focus", look: P2 = [0.2, 0.8], tilt = 0.03;
  const sw = [T1_EEP, T1_PUZ, T1_STUN];
  if (t < sw[0]) { e = "focus"; }
  else if (t < sw[1]) { e = "eep"; look = [0, 0.2]; tilt = -0.02; }
  else if (t < sw[2]) { e = "puzzled"; look = [0, 1]; tilt = 0.13; }
  else { e = "stunned"; look = [0.05, 1]; tilt = -0.05; }
  // (cam) the sign + glove duck back into the hatch after "cleaning" so the camera can dive in after them
  const sign = (t > T1_SIGN + 0.08 ? Math.min(1.15, Math.max(0, spring(t - T1_SIGN - 0.08, 15, 6))) : 0) * (1 - smooth((t - T1_DUCK) / 0.22));
  const wave = 0.25 + 0.5 * H.wave * Math.sin((t - W.cleaning) * 13);
  return { e, look, tilt, arms, rumble: H.rumble, hatch: ramp(t, T1_SIGN - 0.04, 0.14), sign, wave, red: 0, sink: 0, mini: 0, k: 1, jit: 0.004 * H.rumble, lid: e !== "focus", swaps: sw };
};
/** shot 5: the payoff (writing; feels it coming; THE MEME; everybody stares; sinks; the tiny crew member: "sorry") */
const T5_FEEL = W.always - 0.1 - LEAD, T5_PEAK = W.growls - 0.08 - LEAD, T5_SINK = W.possible + 0.3 - LEAD, T5_SORRY = W.possible + 0.9;
const beanEnd = (t: number): BeanState => {
  const E = endAt(5, t);
  const scribble = q((t * 2.2) % 1, 4);
  let arms = writeArms(scribble, t > T5_FEEL);
  const pk = t >= T5_PEAK ? Math.min(1.2, Math.max(0, spring(t - T5_PEAK, 16, 5))) : 0;
  // the peak: both fists grip the desk, shoulders hunch up
  const grip = [karm(0, { sh: [204, 392], w: [205, 486], bend: 40, hand: "fist", hang: 0.4, hk: 0.34 } as ArmP & { sh: P2 }), karm(1, { sh: [396, 392], w: [395, 486], bend: -40, hand: "fist", hang: -0.4, hk: 0.34 } as ArmP & { sh: P2 })];
  grip[0].sh = [204, 392]; grip[1].sh = [396, 392];
  const gk = t >= T5_PEAK ? clamp01((t - T5_PEAK) / 0.08) : 0;
  arms = arms.map((a, i) => mixArm(a, grip[i], gk * (1 - ramp(t, T5_SINK, 0.4) * 0.6)));
  let e: Expr = "focus", look: P2 = [0.2, 0.8], tilt = 0.03;
  const sw = [T5_FEEL, T5_PEAK, T5_SINK];
  if (t < sw[0]) { e = "focus"; }
  else if (t < sw[1]) { e = "eep"; look = [0, 0.6]; tilt = 0; }
  else if (t < sw[2]) { e = "meme"; look = t > W.quietest - 0.2 ? [Math.round(Math.sin(t * 5)) * 0.9, 0.1] : [0, 0]; tilt = 0.03 * Math.sin(t * 55); }
  else { e = "sheepish"; look = [0.85, 0.5]; tilt = 0.08; }
  const rumble = t >= T5_PEAK ? 1.7 * Math.exp(-(t - T5_PEAK) * 1.1) + 0.15 * (1 - E.sink) : 0;
  return {
    e, look, tilt, arms, rumble, hatch: ramp(t, T5_SORRY - 0.12, 0.14), sign: 0, wave: 0, red: ramp(t, T5_PEAK, 0.25) * (1 - 0.3 * E.sink), sink: E.sink,
    mini: t > T5_SORRY ? Math.min(1.1, Math.max(0, spring(t - T5_SORRY, 14, 6))) : 0, k: pk, jit: t >= T5_PEAK ? 0.006 * Math.exp(-(t - T5_PEAK) * 1.5) : 0,
    lid: e === "focus" || e === "sheepish", swaps: sw,
  };
};

// ---- the crew ----
const crewCard = (i: number, A: V3, s: CrewS, sc: number, blobK = 1, blobAt?: V3): Card =>
  ({ key: `gr|crew${i}|${fkey(s)}`, draw: (p) => drawCrew(p, s, 300, 975, CR), A, sc, blob: blobK > 0.02 ? (blobAt ?? A) : undefined, blobSc: 0.75 * sc, blobK });
/** canvas centre of a crew member's face (feet 300, 975; body r CR) */
const CREW_FACE: P2 = [300, 975 - 0.42 * CR - 0.92 * CR - 0.2 * CR];
const crewOut = (rig: Rig, i: number, A: V3, sc: number, pose: CrewPose, cp: THREE.Vector3) => {
  const yaw = yawOf(A, cp), head = cardW(A, CREW_FACE, sc, yaw, 0.04);
  rig.heads[`crew${i}`] = head;
  rig.hands[`crew${i}`] = [cardW(A, [300 - 1.05 * CR, CREW_FACE[1] + 0.65 * CR], sc, yaw, 0.05), cardW(A, [300 + 1.05 * CR, CREW_FACE[1] + 0.65 * CR], sc, yaw, 0.05)];
  (rig.crew ??= []).push({ A, head, pose, sc, i });
};
/** shot 2: the empty stomach */
const bellyRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const Bs = bellyAt(2, t), rig: Rig = { cards: [], heads: {}, hands: {}, pts: {} };
  const sx = squeezeX(Bs.squeeze);
  for (let i = 0; i < 5; i++) {
    const L = CREW_LOOKS[i], bed = CREW_BEDS[i], stand = CREW_STAND[i], watch = CREW_WATCH[i];
    const tAl = W.crew - 0.25 + 0.04 * i, tW = W.wakes - 0.1 + 0.07 * i, tL = tW + 0.42;
    let A: V3 = stand, pose: CrewPose = "stand", e: Expr = "grin", look: P2 = [0, 0], k = 0, board = 0, ph = 0, blobK = 1, lid = 0;
    const xEnd = 4.6 + 0.35 * i - 1.0 * (i === 4 ? 1 : 0);
    if (t < tW) { // asleep in the hammock; the alarm pops the eyes open
      A = bed; pose = "sleep"; e = t < tAl ? "sleep" : "alarm"; blobK = 0;
      if (t >= tAl) A = add(bed, [jit(t, 0.02, i), 0, 0]);
    } else if (t < tL) { // the jump down: an arc from the bed to the floor
      const u = (t - tW) / (tL - tW), y = lerp(bed[1], floorY(stand[0], stand[2], t), u) + 0.75 * Math.sin(Math.PI * u);
      A = [lerp(bed[0], stand[0], u), y, lerp(bed[2], stand[2], u)]; pose = "jump"; k = 1; e = u < 0.5 ? "alarm" : "grin"; blobK = clamp01(1 - (y - stand[1]) / 1.2);
    } else {
      const SO = 0.15; // (qa1) ride ON the crest (was 0.55 ahead of it: the hump hid the surfers from the trailing camera)
      const sxW = BELLY[0] + sx, xEndW = BELLY[0] + xEnd, ride0 = sxW + SO - stand[0];
      const rx = Math.min(Math.max(stand[0], sxW + SO + 0.12 * (i % 2)), xEndW);
      if (i === 3 && Bs.squeeze > 0.001 && t < W.but - 0.05) { // the PUSHER: runs behind the giant broom on the real floor
        A = pushAt(t); pose = "run"; e = "determined"; ph = q((t * 3.2) % 1, 8);
      } else if (Bs.squeeze <= 0.001 || ride0 < 0) { // landed, ready
        const land = t - tL;
        A = onFloor(stand, t); pose = land < 0.15 ? "jump" : t > W.every - 0.1 ? "stand" : "cheer"; k = land < 0.15 ? -1.2 * Math.sin(Math.PI * land / 0.15) : 0;
        e = t > W.giant - 0.2 - LEAD ? "determined" : "grin"; lid = blink(t, 20 + i);
      } else if (t < W.but - 0.05) { // SURF the squeeze wave, then hop off at the far end
        const xw = rx, on = smooth(ride0 / 0.5) * (1 - smooth((sxW + SO - xEndW) / 0.6));
        const lane = smooth(ride0 / 0.5); // the lane change follows the catch only (no jump when they hop off)
        const ax = xw - 0.3 * (i % 3) * on, az = lerp(stand[2], SURF_Z[i], lane);
        A = [ax, floorY(ax, az, t) + 0.1 * on + 0.04 * Math.sin(t * 9 + i) * on, az]; board = on; pose = on > 0.3 ? "surf" : "stand"; e = on > 0.3 ? "surf" : "grin"; ph = t;
        if (on <= 0.3 && sx > xEnd) { pose = "cheer"; e = "grin"; }
      } else if (t < W.food + 0.9) { // walk back to watch the air bubble
        const u = smooth((t - (W.but - 0.05)) / 1.4), from: V3 = i === 3 ? pushAt(W.but - 0.05) : Be(xEnd, 0, SURF_Z[i]);
        A = onFloor([lerp(from[0], watch[0], u), 0, lerp(from[2], watch[2], u)], t); pose = u < 1 ? "walk" : "stand"; ph = q((t * 2.2) % 1, 8); e = "happy"; lid = blink(t, 20 + i);
      } else {
        A = onFloor(watch, t); pose = "stand"; e = "happy"; lid = blink(t, 20 + i, [W.squish - 0.1]);
        look = [-0.9, -0.3];
        if (t > W.air - 0.2 - LEAD && i === 1) { pose = "point"; e = "happy"; }
        if (Bs.squish > 0.3) { pose = "ears"; e = "wince"; lid = 0; }
        if (Bs.growl > 0.3) { pose = "blown"; e = "alarm"; A = onFloor(add(watch, [0.15 * Bs.growl + jit(t, 0.02, i), 0, 0]), t); }
      }
    }
    const s: CrewS = { look: L, pose, face: { e, look, shake: frameNo(t) }, lid, k: q(k, 20), ph: q(ph % 1, 8), light: lt, board: q(board, 10) };
    rig.cards.push(crewCard(i, A, s, CREW_SC, blobK, [A[0], 0, A[2]]));
    crewOut(rig, i, A, CREW_SC, pose, cp);
  }
  return rig;
};
/** shot 3: the full stomach (crew 0 squashed under a pizza slice; two more bob on the hidden squeeze) */
const T3_DROP = W.does - 0.3 + 0.35, T3_LAND = T3_DROP + 0.32;
const fullRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const F = fullAt(3, t), rig: Rig = { cards: [], heads: {}, hands: {}, pts: {} };
  const wx = squeezeX(F.squeeze2); void wx;
  const T3_RUN0 = W.growl + 0.5, T3_RUN1 = T3_DROP - 0.35, blown = t < W.growl + 0.9; // (cam) continuity with shot 2's last frame
  if (t < T3_RUN1) { // crew 0: blown back at the bubble, then dashes to its spot under the pizza
    const u = smooth((t - T3_RUN0) / (T3_RUN1 - T3_RUN0)), from = add(CREW_WATCH[0], [0.15 + jit(t, 0.02, 0) * (blown ? 1 : 0), 0, 0]);
    const P0: V3 = [lerp(from[0], SQUASH_AT[0], u), 0, lerp(from[2], SQUASH_AT[2], u)], F0 = onFloor(P0, t);
    const A: V3 = u > 0 ? [F0[0], lerp(F0[1], onCrest(P0, t)[1], u), F0[2]] : F0; // (QA2) ends ON the crest (no height pop at the squash)
    const run = u > 0 && u < 1, pose: CrewPose = blown ? "blown" : run ? "run" : "lookup";
    const s: CrewS = { look: CREW_LOOKS[0], pose, face: { e: blown ? "alarm" : run ? "determined" : "lookup", look: run ? [-1, 0] : [0, -1], shake: frameNo(t) }, lid: 0, k: 0, ph: q((t * 3.5) % 1, 8), light: lt };
    rig.cards.push({ ...crewCard(0, A, s, CREW_SC, 1, [A[0], 0, A[2]]), mirror: run && cp.x > A[0] });
    crewOut(rig, 0, A, CREW_SC, pose, cp);
  } else { // crew 0 + the pizza
    const pz = clamp01((t - T3_DROP) / (T3_LAND - T3_DROP)), sq = t > T3_LAND ? Math.min(1.1, Math.max(0, spring(t - T3_LAND, 18, 6))) : 0;
    const thumbs = F.thumbs > 0.3;
    const pose: CrewPose = t < T3_LAND ? "lookup" : "squash";
    const e: Expr = t < T3_DROP - 0.4 ? "happy" : t < T3_LAND ? "lookup" : thumbs ? "grin" : "wince";
    const s: CrewS = { look: CREW_LOOKS[0], pose, face: { e, look: t < T3_LAND ? [0, -1] : [0.3, 0], shake: frameNo(t) }, lid: 0, k: q(sq, 20), ph: 0, light: lt, pizza: q(pz * pz, 20) };
    const A = onCrest(SQUASH_AT, t); // (QA2) was onFloor: the floor's rise toward the lens cut the card at the chin
    rig.cards.push(crewCard(0, A, s, CREW_SC));
    crewOut(rig, 0, A, CREW_SC, pose, cp);
  }
  for (const i of [1, 2, 3, 4]) { // the rest recover by the bubble, step back to a line in front of the pile, watch the food pour in, bob on the hidden squeeze
    const wu = smooth((t - (W.growl + 1.0)) / 0.9), W0 = add(CREW_WATCH[i], [0.15 + (blown ? jit(t, 0.02, i) : 0), 0, 0]);
    const A0: V3 = blown ? W0 : [lerp(W0[0], CREW_FULL[i][0], wu), 0, lerp(W0[2], CREW_FULL[i][2], wu)];
    const A = onFloor(A0, t), bob = A[1] - floorY(A0[0], A0[2], 0);
    let pose: CrewPose = blown ? "blown" : wu > 0 && wu < 1 ? "walk" : "stand", e: Expr = blown ? "alarm" : "happy", look: P2 = [0, 0];
    if (F.fill > 0.02 && F.fill < 0.9) { pose = "lookup"; e = "lookup"; look = [0, -1]; }
    else if (F.fill >= 0.9 && t < W.you - 0.2) { pose = "cheer"; e = "grin"; }
    if (!blown && bob > 0.15) { pose = "surf"; e = "surf"; }
    if (F.muffle > 0.3) { pose = "stand"; e = "happy"; look = [-0.6, -0.4]; }
    const s: CrewS = { look: CREW_LOOKS[i], pose, face: { e, look, shake: frameNo(t) }, lid: e === "happy" ? blink(t, 30 + i) : 0, k: 0, ph: q(t % 1, 8), light: lt };
    rig.cards.push(crewCard(i, A, s, CREW_SC, 1, A));
    crewOut(rig, i, A, CREW_SC, pose, cp);
  }
  return rig;
};
/** shot 4: the staff room (coffee; the schedule; the whistle; RUN) */
const T4_BOARD = W.schedule - 0.3 - LEAD, T4_TICK = W.before - 0.1 - LEAD, T4_WHISTLE = W.usually - 0.1 - LEAD, T4_RUN = W.eat - 0.1 - LEAD;
const staffRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const rig: Rig = { cards: [], heads: {}, hands: {}, pts: {} };
  { // the FOREMAN
    let pose: CrewPose = "stand", e: Expr = "boss", look: P2 = [0.4, 0.1];
    if (t >= T4_BOARD && t < T4_WHISTLE) { pose = "point"; e = t < T4_TICK ? "shout" : "boss"; look = [0.8, -0.6]; }
    else if (t >= T4_WHISTLE && t < T4_RUN + 0.1) { pose = "whistle"; e = "puff"; look = [0, 0]; }
    else if (t >= T4_RUN + 0.1) { pose = "point"; e = "shout"; look = [1, 0]; }
    const A: V3 = t >= T4_WHISTLE && t < T4_WHISTLE + 0.25 ? add(FOREMAN_AT, [jit(t, 0.015), 0, 0]) : FOREMAN_AT;
    const s: CrewS = { look: FOREMAN, pose, face: { e, look, shake: frameNo(t) }, lid: e === "boss" ? blink(t, 60, [T4_BOARD, T4_TICK]) : 0, k: 0, ph: 0, light: lt, hold: "clipboard" };
    rig.cards.push({ ...crewCard(9, A, s, FSC), key: `gr|foreman|${fkey(s)}` });
    const yaw = yawOf(A, cp);
    rig.heads.foreman = cardW(A, CREW_FACE, FSC, yaw, 0.04);
    rig.hands.foreman = [cardW(A, [300 - 0.85 * CR, CREW_FACE[1] + 0.45 * CR], FSC, yaw, 0.05), cardW(A, pose === "point" ? [300 + 1.65 * CR, CREW_FACE[1] - 0.85 * CR] : [300 + 0.34 * CR, CREW_FACE[1] + 0.4 * CR], FSC, yaw, 0.05)];
  }
  for (let i = 0; i < 5; i++) {
    const A0 = STAFF_CREW[i], tr = T4_RUN + 0.05 * i, ru = clamp01((t - tr) / 0.8);
    let mir = false, sc = CREW_SC;
    let A: V3 = A0, pose: CrewPose = "mug", e: Expr = "sip", look: P2 = [0, 0], k = 0, lid = 0, mugUp = 0;
    const sipU = (t * 0.5 + hh(i, 2)) % 1;
    mugUp = q(smooth(clamp01(1 - Math.abs(sipU - 0.5) * 4)), 4);
    if (t >= T4_BOARD && t < T4_WHISTLE) { pose = "mug"; mugUp = 0; e = t < T4_TICK ? "happy" : "alarm"; look = [-0.6, -0.8]; lid = e === "happy" ? blink(t, 70 + i) : 0; }
    else if (t >= T4_WHISTLE && t < tr) { const j = t - T4_WHISTLE; pose = j < 0.28 ? "jump" : "stand"; k = j < 0.28 ? Math.sin(Math.PI * j / 0.28) : 0; e = j < 0.28 ? "alarm" : "determined"; A = add(A0, [0, 0.25 * Math.sin(Math.PI * clamp01(j / 0.28)), 0]); }
    else if (t >= tr) { // (cam) dash LEFT to the EXIT door and down its tunnel, shrinking away into the glow
      pose = "run"; e = "determined"; mir = true;
      const DOOR: V3 = [STAFF_EXIT[0], 0, STAFF_EXIT[2] + 0.55], MID: V3 = St(-0.55, 0, -1.75), /* (QA2) behind the foreman (was -1.6, 0, 0: right in the chase camera's path) */ u2 = clamp01((ru - 0.6) / 0.4);
      const u1 = ru / 0.6, a = Math.min(1, u1 * 2), b = clamp01(u1 * 2 - 1); // in front of the foreman, then into the door
      A = u2 > 0 ? [DOOR[0], 0, lerp(DOOR[2], STAFF_EXIT[2] - 0.9, u2)] : b <= 0 ? [lerp(A0[0], MID[0], a), 0, lerp(A0[2], MID[2], a)] : [lerp(MID[0], DOOR[0], b), 0, lerp(MID[2], DOOR[2], b)];
      sc = CREW_SC * (1 - 0.98 * smooth(u2));
    }
    else if (sipU > 0.62) lid = blink(t, 70 + i);
    const s: CrewS = { look: CREW_LOOKS[i], pose, face: { e, look, shake: frameNo(t) }, lid, k: q(k, 20), ph: q((t * 3.5) % 1, 8), light: lt, mugUp };
    rig.cards.push({ ...crewCard(i, A, s, sc, A[2] > STAFF_EXIT[2] + 0.05 ? 1 : 0, [A[0], 0, A[2]]), mirror: mir });
    crewOut(rig, i, A, sc, pose, cp);
  }
  return rig;
};

const rigAt = (id: number, t: number, cp: THREE.Vector3, lt = 0, right = new THREE.Vector3(1, 0, 0)): Rig | null =>
  id === 1 || id === 5 ? hallRig(id, t, cp, lt, right) : id === 2 ? bellyRig(t, cp, lt) : id === 3 ? fullRig(t, cp, lt) : id === 4 ? staffRig(t, cp, lt) : null;

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -999, 0];
const rightOf = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t)))); const f = new THREE.Vector3(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize(); return new THREE.Vector3(-f.z, 0, f.x); };
/** world head centre (who = "bean" | "teacher" | "foreman" | "crew0".."crew4") */
export const headAt = (id: number, t: number, who = "bean"): V3 => rigAt(id, t, camPosAt(id, t), 0, rightOf(id, t))?.heads[who] ?? NOWHERE;
/** world palm centre: side 0 = screen-left, 1 = screen-right */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => rigAt(id, t, camPosAt(id, t), 0, rightOf(id, t))?.hands[who]?.[side] ?? NOWHERE;
/** BEAN's card anchor (soles) */
export const beanAt = (id: number, _t: number): V3 => (id === 1 || id === 5 ? BEAN_AT : NOWHERE);

// ---------------- drawing ----------------
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const V = new THREE.Vector3();
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
  if (c.sc < 0.02) return; // shrunk away (scale only: never a pop)
  const mid: V3 = [c.A[0], c.A[1] + 1.0 * c.sc, c.A[2]];
  const [w, h, k] = tierOf(mid, 2.16 * c.sc);
  out.places.push({ key: c.key, draw: c.draw, x: c.A[0], y: c.A[1], z: c.A[2], scale: c.sc, yaw: c.yaw, mirror: c.mirror, size: [w, h, k] });
  if (c.blob) blob(out, c.blob[0], c.blob[1] + 0.012, c.blob[2], c.blobSc ?? 0.8, c.blobK ?? 1);
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
/** the visible frame width (m) at a world point's depth */
const frameW = (P: V3) => { if (!VIEW) return 99; const z = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos).dot(VIEW.fwd); return Math.max(0.1, 2 * z * VIEW.th * (9 / 16)); };
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?" | "!!", size = 0.2) => {
  const k = env(t, t0, t1);
  if (k < 0.02) return;
  const w = m === "!!" ? size * 1.33 : size;
  fxCard(out, `mark${m}`, m === "!!" ? 400 : 300, 400, (p) => fxMark(p, m, MARK_COL[m]), [P[0], P[1] + 0.015 * size * 5 * Math.sin(t * 5), P[2]], w * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
type WordStyle = "grrr" | "ring" | "tweet" | "mmf" | "sorry";
const word = (out: Stage, t: number, t0: number, t1: number, P: V3, txt: string, style: WordStyle, w: number, rot = 0, din = 0.18, doFit = true) => {
  const k = env(t, t0, t1, din, 0.22);
  if (k < 0.02) return;
  const ph = style === "grrr" || style === "ring" ? q(t % 10, 12) : 0;
  fxCard(out, `word|${txt}|${style}|${ph}`, 800, 400, (p) => fxWord(p, txt, style, ph), doFit ? fit(P, w, w * 0.5) : P, w * k, w * 0.5 * k, { rot: rot + 0.04 * Math.sin(t * 4) });
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
const zzz = (out: Stage, t: number, P: V3, cam: CamInfo, size: number, seed: number) => {
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 3; j++) {
    const u = ((t * 0.55 + j / 3 + hh(seed, 1)) % 1), k = Math.sin(Math.PI * u);
    fxCard(out, "zzz", 256, 256, fxZ, at3(P, R, U, N, 0.15 * size + 0.35 * size * u + 0.06 * Math.sin(u * 7 + j), 0.1 * size + 0.9 * size * u, 0.1), size * (0.35 + 0.4 * u) * k, size * (0.35 + 0.4 * u) * k, { rot: 0.3 * Math.sin(u * 4 + j) });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  const lt = lightOf(cam);
  const rig = rigAt(id, t, cam.pos, lt, cam.right);
  if (!rig) return out;
  for (const c of rig.cards) placeCard(out, c);
  if (id === 1) hookFx(t, rig, cam, out);
  else if (id === 2) bellyFx(t, rig, cam, out);
  else if (id === 3) fullFx(t, rig, cam, out);
  else if (id === 4) staffFx(t, rig, cam, out);
  else if (id === 5) endFx(t, rig, cam, out);
  return out;
};

/** rumble ))) lines both sides of the belly + "grrr" */
const rumbleFx = (out: Stage, t: number, k: number, belly: V3, cam: CamInfo, size: number, grrr: boolean, t0: number, t1: number) => {
  if (k < 0.02) return;
  const { R, U, N } = camVecs(cam, belly);
  for (const sd of [-1, 1]) {
    const w = size * (0.8 + 0.15 * Math.sin(t * 40 + sd)) * Math.min(1, k);
    fxCard(out, "wobble", 256, 256, fxWobble, at3(belly, R, U, N, sd * size * 2.1, 0.02, 0.05), sd * w, w, { rot: 0.05 * Math.sin(t * 30) });
  }
  if (grrr) word(out, t, t0, t1, at3(belly, R, U, N, size * 2.3, size * 0.9, 0.1), "grrr", "grrr", size * 1.7, -0.1, 0.15, true);
};
const hookFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const H = hookAt(1, t), head = rig.heads.bean, { R, U, N } = camVecs(cam, head);
  rumbleFx(out, t, H.rumble, rig.pts.belly, cam, 0.13, true, T1_EEP + 0.05, W.hungry + 0.1);
  mark(out, t, T1_PUZ + 0.05, T1_SIGN - 0.05, at3(head, R, U, N, 0.22, 0.14, 0.05), "?", 0.12);
  // the sign lands: a little sparkle pop
  sparkles(out, t, T1_SIGN + 0.1, T1_SIGN + 0.6, rig.pts.sign, cam, 0.07, 4, 7, 0.04);
};

const bellyFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const Bs = bellyAt(2, t);
  for (const c of rig.crew ?? []) {
    const { R, U, N } = camVecs(cam, c.head);
    if (c.pose === "sleep" && c.i % 2 === 0) zzz(out, t, at3(c.head, R, U, N, 0.1, 0.2, 0.1), cam, 0.55, c.i);
    if (c.pose === "surf") for (let j = 0; j < 2; j++) {
      const u = ((t * 2.2 + j * 0.5 + c.i * 0.3) % 1), k = Math.sin(Math.PI * u);
      fxCard(out, `spray|${(c.i + j) % 3}`, 256, 256, (p) => fxSpray(p, (c.i + j) % 3), [c.A[0] - 0.95 - 0.5 * u, 0.2 + 0.5 * u - 0.6 * u * u, c.A[2] + (j ? 0.25 : -0.25)], 0.42 * k, 0.42 * k, { rot: -0.4 + u });
    }
    if (c.pose === "ears") for (const sd of [-1, 1]) { const w = 0.3 * (0.9 + 0.1 * Math.sin(t * 40)); fxCard(out, "wobble", 256, 256, fxWobble, at3(c.head, R, U, N, sd * 0.62, 0.05, 0.05), sd * w, w); }
  }
  // RING RING! at the corner alarm clock
  const { R, U, N } = camVecs(cam, CORNER);
  word(out, t, W.crew - 0.3, W.up + 0.2, at3(add(CORNER, [0.3, 2.3, 0.2]), R, U, N, 0, 0, 0), "RING!", "ring", 1.6, 0.12 * Math.sin(t * 30), 0.1);
  for (const c of rig.crew ?? []) if (c.i % 2 === 1) mark(out, t, W.crew - 0.2 + 0.05 * c.i, W.wakes - 0.1, at3(c.head, R, U, N, 0.1, 0.7, 0.1), "!", 0.42);
  // the clean floor sparkles behind the wave
  if (Bs.sweep > 0) for (let j = 0; j < 4; j++) { const x = -4 + 2.4 * j; if (x < squeezeX(Bs.squeeze) - 1.5) sparkles(out, t, W.pushing + 0.1 * j, W.no + 0.6, Be(x, 0.35, -1.5 + 1.4 * (j % 2)), cam, 0.8, 3, 50 + j, 0.32); }
  growlFx(t, out);
};
/** GRRROWL: big wobbly letters over the bubble + two fading echoes (shots 2 + 3: they outlive the 2->3 seam and shrink away) */
const growlFx = (t: number, out: Stage) => {
  const gk = env(t, W.growl - 0.1 - LEAD, W.growl + 0.75, 0.15, 0.3);
  if (gk > 0.02) {
    const P0 = Be(1.5, 4.85, -1), gw = Math.min(7.2, 0.86 * frameW(P0)), gh = gw * 0.4, ph = q(t * 3, 4), C = fit(P0, gw, gh);
    for (let j = 2; j >= 1; j--) {
      const u = ((t - W.growl) * 1.1 + j * 0.33) % 1, s = 1 + 0.35 * u;
      fxCard(out, `growl|e|${q(u * 0.7, 10)}|${ph}`, 1600, 640, (p) => fxGrowl(p, "GRRROWL", ph, 0.55 * (1 - u)), add(C, [0, 0, -0.3 * j]), gw * s * gk, gh * s * gk, { soft: true });
    }
    fxCard(out, `growl|${ph}`, 1600, 640, (p) => fxGrowl(p, "GRRROWL", ph), C, gw * gk, gh * gk, { rot: 0.03 * Math.sin(t * 20) });
  }
};

const fullFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  growlFx(t, out);
  const F = fullAt(3, t), c0 = rig.heads.crew0, { R, U, N } = camVecs(cam, c0);
  // the pizza lands: a puff of crumbs
  const lk = env(t, T3_LAND, T3_LAND + 0.15, 0.06, 0.2);
  if (lk > 0.02) for (let j = 0; j < 4; j++) { const a = j * 1.4 + 0.4; fxCard(out, "puff|y", 256, 256, (p) => fxPuff(p, "#fff2c8"), at3(SQUASH_AT, R, U, N, Math.cos(a) * 0.8, 0.3 + Math.abs(Math.sin(a)) * 0.4, 0.3), 0.5 * lk, 0.5 * lk, { rot: a }); }
  if (F.thumbs > 0.3) sparkles(out, t, W.sound, 99, add(rig.hands.crew0[1], [0, 0.15, 0]), cam, 0.15, 3, 61, 0.14);
  // "mmf": a tiny muffled bubble rising out of the food
  const mk = env(t, W.muffles - 0.1, W.sound + 0.4, 0.3, 0.25); // (cam) shrinks away before the 3->4 swoosh
  if (mk > 0.02) {
    const rise = (t - W.muffles) * 0.25, P = fit(Be(2.85, 1.15 + rise, 0.95), 0.8, 0.4); // (cam) just above the flattened crew member, in front of the pile
    fxCard(out, "word|mmf|mmf|0", 800, 400, (p) => fxWord(p, "mmf", "mmf"), P, 0.8 * mk, 0.4 * mk, { rot: 0.06 * Math.sin(t * 3), soft: false });
  }
};

const staffFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const fh = rig.heads.foreman, { R, U, N } = camVecs(cam, fh);
  // steam off the mugs while they sip
  for (const c of rig.crew ?? []) if (c.pose === "mug" && t < T4_BOARD) {
    const P = at3(c.head, R, U, N, 0.3, 0.05, 0.1);
    for (let j = 0; j < 2; j++) { const u = ((t * 0.7 + j * 0.5 + c.i * 0.23) % 1), k = Math.sin(Math.PI * u); fxCard(out, `steam|${j}`, 256, 256, (p) => fxSteam(p, j * 2), add(P, [0.03 * j, 0.15 + 0.35 * u, 0]), 0.22 * k, 0.3 * k, { soft: true }); }
  }
  // the clock tick makes the crew jump: "!"
  for (const c of rig.crew ?? []) if (c.i % 2 === 0) mark(out, t, T4_TICK, T4_WHISTLE - 0.05, at3(c.head, R, U, N, 0.05, 0.55, 0.1), "!", 0.28);
  // TWEET!
  word(out, t, T4_WHISTLE + 0.02, T4_RUN + 0.25, at3(fh, R, U, N, 0.8, 0.78, 0.2), "TWEET!", "tweet", 1.2, -0.12, 0.1);
  // RUN: speed lines + dust puffs
  for (const c of rig.crew ?? []) if (c.pose === "run" && c.sc > 0.5) {
    const { R: r2, U: u2, N: n2 } = camVecs(cam, c.A), sd = c.A[0] < STAFF_CREW[c.i][0] - 0.05 ? -1 : 1, ks = c.sc / CREW_SC; // sd -1: running screen-left
    for (let j = 0; j < 2; j++) fxCard(out, "speed", 256, 512, fxSpeed, at3(c.A, r2, u2, n2, sd * (-0.85 - 0.3 * j) * ks, (0.55 + 0.3 * j) * ks, -0.05), 0.16 * ks, 0.45 * ks, { rot: Math.PI / 2 });
    const u = (t * 4 + c.i * 0.3) % 1, k = Math.sin(Math.PI * u) * ks;
    fxCard(out, "puff|w", 256, 256, (p) => fxPuff(p, "#ffffff"), at3(c.A, r2, u2, n2, sd * (-0.55 - 0.4 * u) * ks, 0.15 + 0.1 * u, 0), 0.35 * k, 0.35 * k, { rot: u * 3 });
  }
};

const endFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const E = endAt(5, t), head = rig.heads.bean, belly = rig.pts.belly, { R, U, N } = camVecs(cam, head);
  // anticipation: one bead of sweat as he feels it coming
  const sk = env(t, T5_FEEL + 0.05, T5_PEAK - 0.02, 0.12, 0.05);
  if (sk > 0.02) fxCard(out, "sweat", 200, 260, fxSweat, at3(head, R, U, N, 0.2, 0.1, 0.06), 0.05 * sk, 0.065 * sk);
  if (t >= T5_PEAK && t * FPS < 981.5) { // (QA2) the peak FX live only in the meme close-up: none leak into the stare reveal (982)
    const s0 = t - T5_PEAK, kin = Math.min(1.15, Math.max(0, spring(s0, 12, 4.5)));
    // hot rays behind him, shockwave rings out of the belly, wobble lines, the monster GRRROOOWL, flying sweat + papers
    const rk = env(t, T5_PEAK, W.quietest - 0.45, 0.1, 0.25); // (cam) gone before the cut to the stare reveal
    fxCard(out, "rays|hot", 1024, 1024, (p) => fxRays(p, "#ffb03a", "#ff5a3a", 0.42), at3(head, R, U, N, 0, -0.1, -0.35), 2.4 * rk, 2.4 * rk, { rot: t * 0.4, soft: true });
    for (let j = 0; j < 3; j++) {
      const u = s0 * 2.2 - j * 0.28; // (QA2) faster (1.4): the rings are gone by ~975, no zigzag trailing over the banner
      const a = (1 - u) * smooth(u * 6);
      if (u > 0 && u < 1) fxCard(out, `shock|${q(a, 10)}`, 1024, 1024, (p) => fxShock(p, "#ffb03a", a), at3(belly, R, U, N, 0, 0.1, -0.3), 0.8 + 1.5 * u, 0.8 + 1.5 * u, { soft: true }); // (QA2) BEHIND him: rings burst round his silhouette, never a white zigzag across his hair
    }
    rumbleFx(out, t, Math.min(1, 1.6 * Math.exp(-s0 * 1.1)), belly, cam, 0.16, false, 0, 0);
    const gk = env(t, T5_PEAK + 0.02, W.growls + 0.5, 0.12, 0.25); // (cam) gone before the cut to the stare reveal (it would cover the teacher)
    if (gk > 0.02) {
      // in the free space ABOVE his head (never over the face): as big as fits under the frame's top 72 %
      // (QA2) BIG + punchy: the band may overlap the top of his hair (never the eyes: base 0.1 m over the head centre)
      const ph = q(t * 4, 4), P = at3(head, R, U, N, 0, 0, 0.25), fw = frameW(P), fh = fw * 16 / 9, base = 0.1;
      const v = VIEW ? new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos) : null, yS = v && VIEW ? v.dot(VIEW.up) : 0;
      const avail = 0.5 * fh * 0.72 - (yS + base);
      const w = Math.min(1.5, 0.86 * fw, Math.max(0.12 * fh, avail * 0.96) / 0.4), h = w * 0.4;
      const C = fit(add(P, [VIEW?.up.x ?? 0, VIEW?.up.y ?? 1, VIEW?.up.z ?? 0], base + h / 2), w, h);
      fxCard(out, `growl|hot|${ph}`, 1600, 640, (p) => fxGrowl(p, "GRRROOOWL", ph, 1, true), C, w * kin * gk, h * kin * gk, { rot: 0.04 * Math.sin(t * 25) });
    }
    if (s0 < 1.3) for (let j = 0; j < 4; j++) { // sweat drops fly off
      const a = -0.5 + j * 0.35 + (j > 1 ? 2.1 : 0), d = 0.2 + 0.55 * s0, k = Math.sin(Math.PI * Math.min(1, s0 / 1.3));
      fxCard(out, "sweat", 200, 260, fxSweat, at3(head, R, U, N, Math.cos(a) * d * (j > 1 ? -1 : 1), 0.12 + Math.sin(Math.abs(a)) * d * 0.5 - 0.3 * s0 * s0, 0.08), 0.06 * k, 0.078 * k, { rot: (j > 1 ? 0.6 : -0.6) });
    }
    if (s0 < 1.6) for (let j = 0; j < 3; j++) { // exam papers blown up off nearby desks
      const u = s0 / 1.6, k = Math.sin(Math.PI * u), sd = j % 2 ? 1 : -1;
      fxCard(out, "paper", 256, 320, fxPaper, add(at3(belly, R, U, N, sd * (0.35 + 0.6 * u + 0.15 * j), -0.05 + 0.9 * u - 0.5 * u * u + 0.1 * j, 0.15), [0, 0, 0]), 0.16 * k, 0.2 * k, { rot: sd * (0.4 + 4 * u) + j });
    }
    const ik = env(t, T5_PEAK, T5_PEAK + 0.12, 0.05, 0.12);
    if (ik > 0.02) fxCard(out, "impact|o", 512, 512, (p) => fxImpact(p, "#ffd23a"), at3(belly, R, U, N, 0, 0, 0.1), 0.45 * ik, 0.45 * ik, { rot: t * 2 });
  }
  // the stare: "!" over the pupils, the dropped pencil
  for (const [i, pp] of (rig.pupils ?? []).entries()) {
    const { R: r2, U: u2, N: n2 } = camVecs(cam, pp.head);
    if (i % 2 === 0) mark(out, t, W.quietest - 0.1 + 0.05 * i, W.possible + 0.2, at3(pp.head, r2, u2, n2, 0.15, 0.3, 0.05), "!", 0.16);
    if (pp.react === "drop") {
      const s1 = t - (W.quietest + 0.05);
      if (s1 > 0 && s1 < 0.55) fxCard(out, "pencil", 128, 512, fxPencil, add(pp.hand, [0, -2.2 * s1 * s1 + 0.15 * s1, 0]), 0.045, 0.18, { rot: 0.5 + s1 * 9 });
    }
    if (pp.react === "snicker" && t > W.possible + 0.4) sparkles(out, t, W.possible + 0.4, 99, at3(pp.head, r2, u2, n2, 0.2, 0.15, 0.05), cam, 0.08, 2, 70 + i, 0.05, ["#ffe46b"]);
  }
  // the teacher's glasses glint as she glares
  if (rig.heads.teacher) sparkles(out, t, W.quietest + 0.2, W.possible + 0.6, at3(rig.heads.teacher, R, U, N, -0.06, 0.03, 0.08), cam, 0.02, 1, 81, 0.12, ["#ffffff"]);
  // sink: a bead of sweat; sorry: the tiny crew member's speech bubble
  const s2 = env(t, T5_SINK + 0.1, 99, 0.2, 0.2);
  if (s2 > 0.02) fxCard(out, "sweat", 200, 260, fxSweat, at3(head, R, U, N, -0.19, 0.0 - 0.05 * E.sink, 0.06), 0.045 * s2, 0.058 * s2);
  word(out, t, T5_SORRY + 0.25, 99, at3(rig.pts.mini, R, U, N, 0.13, 0.09, 0.05), "sorry", "sorry", 0.16, 0.06, 0.15, false);
  void FPS;
};
// keep these referenced (glow card reserved for the lead's grade tweaks)
void fxGlow;
