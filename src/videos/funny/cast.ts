// OWNER: cast agent. Every CHARACTER card for "Live Wire" (Canvas2D cards, ink outlines; drawings in cast_kit.ts,
// cast_bean.ts, cast_folk.ts). All pure functions of (id, t) keyed off story.ts state functions (hookAt, armAt, peakAt,
// surgeAt, museumAt, endAt). Expressions land 0-3 frames before their word (LEAD). One feeling per line; BEAN's MEME
// face ONLY in shot 3 (the peak).
// CONTRACTS (world metres):
//   BEAN: BEAN_SC 0.62 = his body scale (1 "bean unit" = SU * 0.62 m; standing ~1.36 m, head centre ~1.12 m). His card
//         is drawn on a WIDER canvas (card scale BEAN_CARD 0.8, BEAN centred) so his flared "chicken-wing" elbows fit.
//         Shot 1: soles at beanHallAt(t) (walks out of the kitchen until the BONK at f 12), card yaw 0 (faces +z), his
//         right ELBOW (screen-left) is drawn EXACTLY at ELBOW_HALL (== story ELBOW_L, 7 cm in front of the card) from
//         f 12 except during the wince (13-66, the arm is pulled in); from the glare (~66) to the end of the shot it is
//         back at ELBOW_HALL (the x-ray window + the dive target).
//         Shot 3 (THE MEME): soles at BEAN_HALL lifted 0.12 m (zapped off the floor: keeps the face above the captions).
//         Shot 5: BEAN_MU (billboard), ice pack on the elbow. Shot 6: BEAN_HALL, yaw 0, pillow taped on, deadpan,
//         walks out screen-right from BEAT.exit.
//   PINKY / RING (shot 4) at arm.ts PINKY_AT / RING_AT (FOLK_SC); the median-nerve fingers by OTHERS_AT sip tea.
//   SIGN-holder (shot 2) at arm.ts SIGN_AT (scale 0.45). SKELLY at SKELLY_AT (fixed yaw 0, SKELLY_SC), its humerus
//   centre = HUMERUS_PT. PORTRAITS: cards in the frames (yaw +PI/2), painting = 0.72 x 0.95 m centred on PORTRAITS[i].c.
//   The 2026 portrait is painted through the shot 6 camera at the portal mid-dissolve (f 992): it follows camAt.
//   Exports: headAt / handAt (who = "bean" | "pinky" | "ring" | "skelly" | "worker"), beanHallAt, the positions.
import { Pen } from "../bridge/toon";
import { Stage, CamInfo, SU, blob, prepStage, lidAt, q } from "../bridge/cast";
import { HALL, MUSEUM, V3, ELBOW_L, BEAT, FPS, LEAD, W, SHOTS, camAt, smooth, clamp01, hookAt, peakAt, surgeAt, museumAt, endAt, armAt } from "./story";
import { PINKY_AT, RING_AT, SIGN_AT, OTHERS_AT } from "./arm";
import { PLINTH_TOP, PORTRAITS } from "./sets";
import { P2, letter, spring, FaceS } from "./cast_kit";
import { BeanS, ArmB, drawBean, mixArm, palmB, B_HEAD, SH_R, SH_L } from "./cast_bean";
import {
  drawFinger, FingerS, FingerPose, PINKY_L, RING_L, OTHER_L, fingerFace, drawWorker, WORKER_FACE, drawSkelly, SK_HEAD, drawOld, drawNew, PT0, PT1,
} from "./cast_folk";

const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
// ---------------- CONTRACTS (world metres) ----------------
/** BEAN's body scale (standing kid ~1.36 m, head centre ~1.12 m); his card itself is BEAN_CARD (wider canvas) */
export const BEAN_SC = 0.62;
const BEAN_CARD = 0.8, BK = BEAN_SC / BEAN_CARD, U = SU * BEAN_SC;
/** BEAN in the hallway: soles after the walk (shots 1 from f 12, 3, 6). He walks in from KITCHEN_FROM (shot 1, f 0-12). */
export const BEAN_HALL: V3 = at(HALL, 0.1, 0, -1.15);
export const KITCHEN_FROM: V3 = at(HALL, 0.1, 0, -2.3);
/** BEAN's right elbow in the hallway (the x-ray window + the dive target): EXACTLY story.ts ELBOW_L */
export const ELBOW_HALL: V3 = at(HALL, ...ELBOW_L);
/** BEAN as a museum visitor (shot 5), ice pack on his elbow */
export const BEAN_MU: V3 = at(MUSEUM, 1.15, 0, 1.3);
/** SKELLY the skeleton on the plinth (shot 5), a FIXED-yaw card facing +z; its upper-arm bone (screen-left) centre */
export const SKELLY_AT: V3 = PLINTH_TOP, SKELLY_SC = 0.82;
export const HUMERUS_PT: V3 = at(MUSEUM, -0.3, 1.25, 0.03);
/** finger folk (shot 4) + the sign-holder (shot 2): soles from arm.ts */
export { PINKY_AT, RING_AT, SIGN_AT };
export const FOLK_SC = 0.55;
const WORKER_SC = 0.45;
/** BEAN's soles in the hallway at time t of shot 1 (walks out of the kitchen until the whack) */
export const beanHallAt = (t: number): V3 => { const w = hookAt(1, t).walk; return [KITCHEN_FROM[0], 0, KITCHEN_FROM[2] + (BEAN_HALL[2] - KITCHEN_FROM[2]) * w]; };

// ---------------- helpers ----------------
const F = (t: number) => Math.round(t * FPS);
const T = (f: number) => f / FPS;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v));
/** a bean-unit point on BEAN's card (soles A, yaw 0) -> world, fwd metres toward +z */
const beanW = (A: V3, P: P2, fwd = 0.04): V3 => [A[0] + (P[0] - 300) * U, A[1] + (975 - P[1]) * U, A[2] + fwd];
/** the elbow in bean units, solved from ELBOW_L (so the drawing hits the contract point exactly) */
const E_R: P2 = [300 + (ELBOW_HALL[0] - BEAN_HALL[0]) / U, 975 - ELBOW_HALL[1] / U];
const E_L: P2 = [600 - E_R[0], E_R[1]];
const blinkAt = (t: number, i: number, swaps: number[] = []) => q(lidAt(t, i, swaps), 2);

// ---------------- BEAN poses (bean units) ----------------
const WINGS: [ArmB, ArmB] = [
  { sh: SH_R, el: E_R, wr: [134, 466], hand: "grip", hang: 0.5 },
  { sh: SH_L, el: E_L, wr: [466, 466], hand: "grip", hang: -0.5 },
];
const WINCE: [ArmB, ArmB] = [
  { sh: SH_R, el: [196, 450], wr: [150, 578], hand: "splay", hang: 0.25 },
  { sh: SH_L, el: [458, 470], wr: [236, 446], hand: "cup", hang: 0.2 },
];
const HANG: [ArmB, ArmB] = [
  { sh: SH_R, el: [176, 446], wr: [182, 572], hand: "rest", hang: 0.15 },
  { sh: SH_L, el: [424, 446], wr: [418, 572], hand: "rest", hang: -0.15 },
];
const ZAP: [ArmB, ArmB] = [
  { sh: SH_R, el: [102, 418], wr: [132, 300], hand: "fist", hk: 0.36, xray: true },
  { sh: SH_L, el: [482, 414], wr: [454, 300], hand: "fist", hk: 0.36 },
];
const jitA = (A: ArmB, dx: number, dy: number): ArmB => ({ ...A, el: [A.el[0] + dx, A.el[1] + dy], wr: [A.wr[0] - dx, A.wr[1] + dy] });

type BeanRig = { A: V3; s: BeanS; sq: number; yaw?: number; blobK: number };
const T1_WINCE = T(BEAT.whack1);
const beanShot1 = (t: number, light: number): BeanRig => {
  const H = hookAt(1, t), f = F(t), A = beanHallAt(t);
  const walking = f < BEAT.whack1;
  const kW = clamp01(H.wince * 1.15);
  const arms: [ArmB, ArmB] = [mixArm(WINGS[0], WINCE[0], kW), mixArm(WINGS[1], WINCE[1], kW)];
  if (kW > 0.5) arms[0] = jitA(arms[0], (f % 2 ? 3 : -3) * kW, 0); // the pinky side tingles
  const d = t - T1_WINCE, sq = d >= 0 && d < 0.5 ? 0.08 * Math.exp(-d * 9) * Math.cos(d * 42) : 0;
  const jolt = d >= 0 && d < 0.5 ? 34 * Math.exp(-d * 9) * Math.sin(d * 38) : 0;
  let fe: FaceS = { e: "hum", look: [0, 0] }, tilt = 0.03;
  if (H.glare > 0.5) { fe = { e: "glare", look: [0.15, 0.05] }; tilt = 0.04; }
  else if (f >= BEAT.whack1) { fe = { e: "wince", shake: f }; tilt = -0.08; }
  const s: BeanS = {
    face: fe, lid: fe.e === "glare" ? blinkAt(t, 7, [W.definitely - 0.075 + LEAD]) : 0, tilt, light, arms,
    walk: walking ? (t * 2.6) % 1 : undefined,
    basket: { c: [lerp(300, 374, kW), lerp(535, 612, kW)], rot: 0.14 * kW, topSock: f < BEAT.whack1, jolt },
    sock: f >= BEAT.sock ? Math.min(1, (f - BEAT.sock) / 4 + 0.05) : 0,
  };
  const bob = walking ? 0.018 * Math.abs(Math.sin(t * 2.6 * Math.PI * 2)) : 0;
  return { A: [A[0], A[1] + bob, A[2]], s, sq, yaw: 0, blobK: 1 };
};
const LIFT = 0.12;
const beanShot3 = (t: number, light: number): BeanRig => {
  const f = F(t), P = peakAt(3, t), b = f % 2, amp = 1 - 0.6 * P.settle;
  const arms: [ArmB, ArmB] = [jitA(ZAP[0], (b ? 6 : -6) * amp, (b ? -4 : 4) * amp), jitA(ZAP[1], (b ? -6 : 6) * amp, (b ? 4 : -4) * amp)];
  const s: BeanS = { face: { e: "zap", shake: f, k: 1 }, lid: 0, tilt: (b ? 0.025 : -0.025) * amp, light, arms, stiff: true, meme: true, buzz: b, noseGlow: 1 };
  const A: V3 = [BEAN_HALL[0] + (b ? 0.006 : -0.006) * amp, LIFT + (b ? 0.006 : 0) * amp, BEAN_HALL[2]];
  return { A, s, sq: 0, yaw: 0, blobK: 0.55 };
};
const beanShot5 = (t: number, light: number): BeanRig => {
  const M = museumAt(5, t), f = F(t), pond = M.ponder > 0.5;
  const arms: [ArmB, ArmB] = [HANG[0], HANG[1]];
  if (pond) { const sc = Math.floor(f / 3) % 2 ? 8 : -8; arms[1] = { sh: SH_L, el: [512, 300], wr: [462 + sc, 150], hand: "pat", hang: -0.7 }; }
  const s: BeanS = { face: { e: pond ? "ponder" : "lookup", look: [-0.55, -0.8] }, lid: blinkAt(t, 12, [W.why - 0.05 + LEAD]), tilt: pond ? 0.12 : -0.06, light, arms, prop: "ice" };
  return { A: BEAN_MU, s, sq: 0, blobK: 1 };
};
/** the END pose (shot 6 + the 2026 portrait): arms down, the pillow taped on, deadpan into the lens */
const endBean = (light: number, lid: number, turn = 0, walk?: number): BeanS => {
  const sw = walk === undefined ? 0 : Math.sin(walk * Math.PI * 2) * 14;
  const arms: [ArmB, ArmB] = [{ ...HANG[0], wr: [HANG[0].wr[0] + sw, HANG[0].wr[1]] }, { ...HANG[1], wr: [HANG[1].wr[0] - sw, HANG[1].wr[1]] }];
  return { face: { e: "deadpan", look: [turn > 0.3 ? 0.9 : 0, 0] }, lid, tilt: 0, light, arms, prop: "pillow", turn, walk };
};
const T6_TURN = T(BEAT.exit) - 0.2;
const beanShot6 = (t: number, light: number): BeanRig => {
  const E = endAt(6, t), f = F(t);
  // a slow deliberate blink on the sting (1030), ordinary blinks otherwise, none during the portal dissolve
  const sl = f - (BEAT.sting - 2), slow = sl >= 0 && sl < 7 ? [0.5, 1, 1, 1, 1, 1, 0.5][sl] : 0;
  const lid = f < 1000 ? 0 : Math.max(slow, f > BEAT.sting + 6 || f < BEAT.sting - 12 ? blinkAt(t, 9) : 0);
  const turn = 0.6 * smooth((t - T6_TURN) / 0.15);
  const walking = E.exit > 0.001 && E.exit < 0.999;
  const s = endBean(light, lid, turn, walking ? (t * 2.4) % 1 : undefined);
  return { A: [BEAN_HALL[0] + 1.6 * E.exit, 0, BEAN_HALL[2]], s, sq: 0, yaw: 0, blobK: 1 };
};
const beanRig = (id: number, t: number, light = -2.3): BeanRig | null =>
  id === 1 ? beanShot1(t, light) : id === 3 ? beanShot3(t, light) : id === 5 ? beanShot5(t, light) : id === 6 ? beanShot6(t, light) : null;

// ---------------- the 2026 portrait <- the shot 6 camera (portal match) ----------------
const PORTAL_F = 992;
const PSC = PORTRAITS[3] ? PORTRAITS[3].w / (600 * SU) : 0.5556;
const portraitA = (i: number): V3 => { const c = PORTRAITS[i].c; return [c[0], c[1] - (975 - (PT0 + PT1) / 2) * SU * PSC, c[2]]; };
type Basis = { pos: V3; f: V3; r: V3; u: V3; th: number };
const basis = (id: number, fr: number): Basis => {
  const c = camAt(id, fr), d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]], l = Math.hypot(...d);
  const f: V3 = [d[0] / l, d[1] / l, d[2] / l], rr: V3 = [-f[2], 0, f[0]], rl = Math.hypot(...rr) || 1, r: V3 = [rr[0] / rl, 0, rr[2] / rl];
  const u: V3 = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  return { pos: c.pos, f, r, u, th: Math.tan((c.fov * Math.PI) / 360) };
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
type PMap = { M: [number, number, number, number, number, number]; jambL: number; jambR: number; lintel: number; floorY: number; casL: number; casR: number };
let PMAP: PMap | null = null;
const portalMap = (): PMap => {
  if (PMAP) return PMAP;
  const c6 = basis(6, PORTAL_F), cp = basis(5, PORTAL_F), A = portraitA(3), k = SU * PSC;
  const toCanvas = (P: V3): P2 => {
    const d: V3 = [P[0] - c6.pos[0], P[1] - c6.pos[1], P[2] - c6.pos[2]], z = dot(d, c6.f) || 1e-6;
    const nx = dot(d, c6.r) / z / c6.th, ny = dot(d, c6.u) / z / c6.th;
    const dir: V3 = [cp.f[0] + (cp.r[0] * nx + cp.u[0] * ny) * cp.th, cp.f[1] + (cp.r[1] * nx + cp.u[1] * ny) * cp.th, cp.f[2] + (cp.r[2] * nx + cp.u[2] * ny) * cp.th];
    const s = (A[0] - cp.pos[0]) / (Math.abs(dir[0]) > 1e-6 ? dir[0] : 1e-6), Qy = cp.pos[1] + dir[1] * s, Qz = cp.pos[2] + dir[2] * s;
    return [300 - (Qz - A[2]) / k, 975 - (Qy - A[1]) / k];
  };
  const bw = (bx: number, by: number): V3 => [BEAN_HALL[0] + (bx - 300) * U, (975 - by) * U, BEAN_HALL[2]];
  // (cam) full-height levers: the hall camera is pitched and close, so a 100-unit lever at the feet left the painted
  // head ~8 % low at 992 (double eyes in the dissolve). Feet + head now land exactly; x from the chest line.
  const P0 = toCanvas(bw(300, 975)), Py = toCanvas(bw(300, 375)), Pc = toCanvas(bw(300, 600)), Px = toCanvas(bw(450, 600));
  const a = (Px[0] - Pc[0]) / 150, b = (Px[1] - Pc[1]) / 150, c = (Py[0] - P0[0]) / -600, d = (Py[1] - P0[1]) / -600;
  const M: PMap["M"] = [a, b, c, d, P0[0] - a * 300 - c * 975, P0[1] - b * 300 - d * 975];
  const dz = HALL[2] - 1.4;
  PMAP = { M, jambL: toCanvas([HALL[0] - 0.45, 1.0, dz])[0], jambR: toCanvas([HALL[0] + 0.45, 1.0, dz])[0], lintel: toCanvas([HALL[0], 2.05, dz])[1], floorY: toCanvas([HALL[0], 0, dz])[1],
    // (qa2) the painted casings = the hall's real 9.5 cm architraves (front face z -1.33): they were a fixed 46 canvas
    // units (~5.5 cm), so the portal dissolve showed two pairs of jamb lines (986-998)
    casL: toCanvas([HALL[0] - 0.545, 1.0, HALL[2] - 1.33])[0], casR: toCanvas([HALL[0] + 0.545, 1.0, HALL[2] - 1.33])[0] };
  return PMAP;
};

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -999, 0];
const fingerHead = (A: V3, L: typeof PINKY_L): V3 => { const fc = fingerFace(L); return [A[0], A[1] + (975 - fc[1]) * SU * FOLK_SC, A[2] + 0.04]; };
/** the head centre of a character at (id, t) (for fx placement); "bean" | "pinky" | "ring" | "skelly" | "worker" */
export const headAt = (id: number, t: number, who = "bean"): V3 => {
  if (who === "pinky") return fingerHead(PINKY_AT, PINKY_L);
  if (who === "ring") return fingerHead(RING_AT, RING_L);
  if (who === "skelly") return [SKELLY_AT[0], SKELLY_AT[1] + (975 - SK_HEAD[1]) * SU * SKELLY_SC, SKELLY_AT[2] + 0.04];
  if (who === "worker") return [SIGN_AT[0], SIGN_AT[1] + (975 - WORKER_FACE[1]) * SU * WORKER_SC, SIGN_AT[2] + 0.04];
  const R = beanRig(id, t);
  return R ? beanW(R.A, B_HEAD) : NOWHERE;
};
/** BEAN's palm centre (side 0 = screen-left = his right hand, the pinky-zing hand in shot 1; 1 = screen-right) */
export const handAt = (id: number, t: number, who = "bean", side: 0 | 1 = 0): V3 => {
  if (who !== "bean") return headAt(id, t, who);
  const R = beanRig(id, t);
  return R ? beanW(R.A, palmB(R.s.arms[side]), 0.05) : NOWHERE;
};

// ---------------- drawing ----------------
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun;
  if (!sun) return -2.3;
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
/** canvas tier from the card's projected height on the 2560-px final (textures <= 2048) */
const tierOf = (id: number, t: number, cam: CamInfo, P: V3, cardH: number): [number, number, number] => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, F(t)))), th = Math.tan((c.fov * Math.PI) / 360);
  const d = Math.max(0.3, Math.hypot(P[0] - cam.pos.x, P[1] - cam.pos.y, P[2] - cam.pos.z)), px = (cardH / (2 * d * th)) * 2560;
  const h = px < 330 ? 400 : px < 700 ? 800 : px < 1150 ? 1280 : 2048;
  return [Math.round(h * 0.6), h, h / 1000];
};
const beanDraw = (s: BeanS, sq = 0) => (p: Pen) => {
  const g = p.g; g.save(); g.translate(300, 975); g.scale(BK * (1 + 0.5 * sq), BK * (1 - sq)); g.translate(-300, -975); drawBean(p, s); g.restore();
};
const qmark = (p: Pen) => letter(p, "?", 128, 132, 220, "#ffe46b", 30, 10);

export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  prepStage(light, cam);
  const out: Stage = { places: [], fx: [] }, lt = lightOf(cam), f = F(t);
  const push = (key: string, draw: (p: Pen) => void, P: V3, scale: number, yaw?: number, hi = false) => {
    const size = hi ? [1229, 2048, 2.048] as [number, number, number] : tierOf(id, t, cam, [P[0], P[1] + 1.0 * scale, P[2]], 2.16 * scale);
    out.places.push({ key, draw, x: P[0], y: P[1], z: P[2], scale, yaw, size });
  };
  // ---- BEAN ----
  const R = beanRig(id, t, lt);
  if (R) {
    push(`lw|bean|${fkey(R.s)}|${q(R.sq, 100)}`, beanDraw(R.s, R.sq), R.A, BEAN_CARD, R.yaw);
    blob(out, R.A[0], id === 3 ? 0 : R.A[1], R.A[2], 0.75, R.blobK);
    if (id === 5) { // the "?" over his head on "why funny"
      const M = museumAt(5, t), k = M.ponder > 0.01 ? Math.min(1.15, Math.max(0, spring(t - (W.why - 0.15 - LEAD), 14, 6))) * (1 - smooth((t - (W.probably - 0.3)) / 0.25)) : 0;
      const hd = beanW(R.A, B_HEAD, 0.1);
      if (k > 0.02) out.fx.push({ key: "lw|qmark", cw: 256, ch: 256, draw: qmark, x: hd[0] + 0.17, y: hd[1] + 0.28 + 0.02 * Math.sin(t * 5), z: hd[2], w: 0.24 * k, h: 0.24 * k });
    }
  }
  if (id === 2) { // the NO PADDING sign-holder
    const Ar = armAt(2, t), t0 = W.no - 0.15 - LEAD;
    const lift = t >= t0 ? Math.max(0, Math.min(1.08, spring(t - t0, 12, 6))) : 0, flip = smooth((t - t0) / 0.18);
    const up = Ar.noPad > 0.5;
    // (qa1) worried while the cable squeezes past him, at the slam and while the sparks build; shrug on NO PADDING
    const wf: FaceS = up && ((t > T(BEAT.whack2) - 0.04 && t < T(BEAT.whack2) + 0.9) || Ar.spark > 0.25) ? { e: "worry", look: [-0.4, -0.8], shake: Math.floor(t * 12) }
      : up ? { e: "shrug", look: [0, 0] } : Ar.squeeze > 0.02 && Ar.squeeze < 0.98 ? { e: "worry", look: [-0.55, -0.6], shake: Math.floor(t * 10) } : { e: "fine", look: [-0.5, -0.3] };
    const ws = { lift: q(lift, 30), flip: q(flip, 20), face: wf, lid: up ? 0 : blinkAt(t, 33), light: lt };
    push(`lw|worker|${fkey(ws)}`, (p) => drawWorker(p, ws), SIGN_AT, WORKER_SC);
    blob(out, SIGN_AT[0], SIGN_AT[1], SIGN_AT[2], 0.6, 1);
  }
  if (id === 4) { // PINKY + RING + the unbothered median-nerve fingers
    const S = surgeAt(4, t), tB = T(BEAT.bandaid);
    let pp: FingerPose = "calm", pe: FaceS = { e: "calm", look: [0, 0] };
    if (S.scream > 0.5) { pp = "scream"; pe = { e: "scream", shake: f, k: 1 }; }
    else if (S.fine > 0.5) { pp = t < tB + 0.25 ? "pat" : "fine"; pe = { e: "fine", look: [0, 0] }; }
    const ps: FingerS = { look: PINKY_L, pose: pp, face: pe, lid: pp === "calm" || pp === "fine" ? blinkAt(t, 41) : 0, ph: Math.floor(f / 4) % 2, bandaid: t >= tB ? q(Math.max(0, Math.min(1.15, spring(t - tB, 16, 6))), 20) : 0, light: lt, shake: pp === "scream" ? f % 2 : 0 };
    push(`lw|pinky|${fkey(ps)}`, (p) => drawFinger(p, ps), PINKY_AT, FOLK_SC);
    blob(out, PINKY_AT[0], PINKY_AT[1], PINKY_AT[2], 0.6, 1);
    const half = S.ring > 0.5;
    const rs: FingerS = { look: RING_L, pose: half ? "half" : "sip", face: { e: half ? "halfScream" : "sip", shake: f }, lid: 0, ph: 0, bandaid: 0, light: lt, shake: half ? f % 2 : 0 };
    push(`lw|ring|${fkey(rs)}`, (p) => drawFinger(p, rs), RING_AT, FOLK_SC);
    blob(out, RING_AT[0], RING_AT[1], RING_AT[2], 0.6, 1);
    OTHER_L.forEach((L, i) => {
      const A = at(OTHERS_AT, i * 0.62 - 0.3, 0, (i % 2) * 0.35);
      const os: FingerS = { look: L, pose: "sip", face: { e: "sip" }, lid: blinkAt(t, 60 + i), ph: 0, bandaid: 0, light: lt };
      push(`lw|other${i}|${fkey(os)}`, (p) => drawFinger(p, os), A, FOLK_SC * 0.92);
      blob(out, A[0], A[1], A[2], 0.55, 1);
    });
  }
  if (id === 5) { // SKELLY + the portrait row
    const M = museumAt(5, t);
    const mood = M.skLaugh > 0.5 ? "laugh" : M.smirk > 0.5 ? "smirk" : "idle";
    const look: P2 = mood === "smirk" ? [0.9, 0.1] : [0, 0.1];
    const ss = { mood, tap: M.tap > 0.5 ? 1 : 0, tok: Math.floor(f / 4) % 2, jaw: Math.floor(f / 3) % 2, lid: mood === "idle" ? blinkAt(t, 50) : 0, look, light: lt } as const;
    push(`lw|skelly|${fkey(ss)}`, (p) => drawSkelly(p, ss), SKELLY_AT, SKELLY_SC, 0);
    const laughs = [museumAt(5, t + 0.1).laugh0, M.laugh1, M.laugh2]; // (qa2) 1840 lands 1-2 frames BEFORE its guffaw (947), not 2 after
    for (let i = 0; i < 3 && i < PORTRAITS.length; i++) {
      const os = { who: i as 0 | 1 | 2, laugh: laughs[i] > 0.5, jig: Math.floor((f + i) / 3) % 2, lid: blinkAt(t, 70 + i) };
      push(`lw|old|${fkey(os)}`, (p) => drawOld(p, os), portraitA(i), PSC, Math.PI / 2, true);
    }
    if (PORTRAITS.length > 3) {
      const pm = portalMap(), side = M.laugh3 > 0.5 && f < 980; // a flat side-eye at the laughing 1950 dad, then back to the lens
      const lidP = f >= 940 && f < 984 ? blinkAt(t, 77) : 0;
      const bs = endBean(-2.3, lidP);
      bs.face = { e: "deadpan", look: side ? [-0.9, 0] : [0, 0] };
      const ns = { bean: bs, ...pm };
      push(`lw|new|${fkey({ l: lidP, s: side })}`, (p) => drawNew(p, ns), portraitA(3), PSC, Math.PI / 2, true);
    }
  }
  return out;
};
