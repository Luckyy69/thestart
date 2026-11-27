// OWNER: cast. Every character card + effect card for "Bald Fur". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, hookAt, catAt, iceAt, roomAt, endAt).
// CONTRACTS (world metres; St = STREET, Ic = ICE, Ro = ROOM). Character cards are yaw-billboards (face the camera).
//   BEAN street (shots 1, 3): soles at BEAN_ST = St(-0.45, 0, -0.25), scale 0.85 (1.45 m tall, head centre ~1.24 m,
//             head half-width ~0.18 m). Coral summer tee, hibiscus shorts, flip-flops, red nose; shivers (card
//             jitter + chattering teeth), knees knock.
//   HOOK FOREARM (shot 1): its own lit card, fixed yaw 0 (faces +z), centre HOOK_ARM = St(-0.40, 0.90, -0.08) (17 cm in
//             front of his chest), 0.27 m elbow -> wrist, fist up-left under his chin (fist ~St(-0.50, 1.05, -0.08),
//             elbow ~St(-0.29, 0.75, -0.08)). The dive target bump is HOOK_BUMP (on the card, +5 mm toward the lens).
//             Bumps rise with hookAt.bumps, hairs spring up ~0.3-0.8 s after W.goosebumps.
//   GHOST FUR (shot 1): soft card centred 0.8 m above BEAN_ST, 0.12 m behind him (away from the lens), ~1.5 m tall coat.
//   CAT (shot 3): sits on the bench at CAT_A = St(0.55, 0.46, -0.65) (base = seat), 0.38 m tall -> 2x FLOOF on catAt.puff
//             (overshoot to ~2.2x, 0.8 m), startle hop on the plop landing (catAt.plop = 1), the 2x ruler card stands
//             0.42 m to its screen-right. Looks at BEAN (screen-left) on pity.
//   ICE (shot 4): ANCESTOR soles at ANC_A = Ic(-0.6, 0, 0) (1.3 m, head ~1.29 m; majestic floof ~1.25 m wide), BEAN at
//             BEAN_ICE = Ic(0.65, 0, 0.1) (snow cap, icicle); BEAN raises the button in his screen-right hand (above his
//             shoulder, ~1.2 m) on iceAt.button, slaps it with the other on press, ONE hair boings on that arm.
//   ROOM (shots 5, 6, ONE rig: no pop across the continuous 5 -> 6 camera): BEAN sits cross-legged on the mattress at
//             BEAN_BED = Ro(0, 0.5, -0.75) (head ~1.25 m), headphones on; ghost fur (2.4 m) at the hit, ghost BEAR
//             (2.2 m tall, feet on the mattress, centre z -1.15) on roomAt.bear; he LEAPS to BEAN_END = Ro(0.35, 0, -0.1)
//             between J0 = W.very - 0.57 and J1 = W.very - 0.15 (lands into the RAWR pose; headphones drop to his neck),
//             facing the mirror. The CAT sits on CAT_SILL (sets export; fallback Ro(-1.8, 0.8, 0.3)) in shots 5-6
//             (puffs at the bear, slow pity blink on endAt.blink). The REFLECTION card sits 3 cm behind the glass
//             (sets MIRROR_GLASS; fallback centre Ro(1.35, 1.0, -0.55), normal toward Ro(0.35, *, -0.1), 0.5 x 1.3 m),
//             in the glass plane: reflected room + the bald bumpy BEAN sliding in with the leap.
//   The phone (props PHONE_AT if exported, / PHONE.c, else Ro(0.5, 0.56, -0.51)) emits pastel notes on roomAt.reveal.
//   Exports: headAt / handAt (id, t, who = "bean" | "cat" | "anc", side 0 = screen-left, 1 = screen-right), the
//            positions above, HOOK_BUMP, hookBumpAt(t), beanAt(id, t) (BEAN's card anchor).
// Expressions land 0-3 frames before their word (LEAD = 2 f). Only shot 5 "hits" uses the MEME face.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import * as SetsMod from "./sets";
import * as PropsMod from "./props";
import * as IceMod from "./ice";
import { W, LEAD, FPS, STREET, ROOM, ICE, SHOTS, V3, smooth, clamp01, camAt, hookAt, catAt, iceAt, roomAt, endAt } from "./story";
import {
  P2, BeanS, ArmS, LegS, Expr, CatMood, drawBean, drawForearm, drawCat, drawAncestor, drawMirror, FA_ELBOW, FA_WRIST, FA_HERO,
  HAND_WRIST, rotP, spring, CAT_K, ANC_K, ANC_BTN, MARK_COL,
  fxGhost, fxBear, fxSweat, fxMark, fxSparkle, fxShiver, fxBrrr, fxSnowflake, fxNote, fxNoteHand, fxButton, fxWord, fxRuler, fxLens,
  fxBreath, fxWarm, fxRays, fxSpeed, fxPoof, fxCuteNote,
} from "./fx";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_ST: V3 = at(STREET, -0.45, 0, -0.25);
export const CAT_A: V3 = at(STREET, 0.55, 0.46, -0.65);
export const ANC_A: V3 = at(ICE, -0.6, 0, 0);
export const BEAN_ICE: V3 = at(ICE, 0.65, 0, 0.1);
export const BEAN_BED: V3 = at(ROOM, 0, 0.5, -0.75);
export const BEAN_END: V3 = at(ROOM, 0.35, 0, -0.1);
export const HOOK_ARM: V3 = at(STREET, -0.4, 0.9, -0.08);
const BSC = 0.85, ARM_SC = 0.26, CAT_SC = 0.8, ANC_SC = 0.9 / ANC_K, ARM_ANG = -0.62;
/** world point of a forearm-card local point (fixed yaw 0) */
const armLocalW = (P: V3, ang: number, L: P2, fwd = 0): V3 => { const r = rotP(L, ang); return [P[0] + r[0] * SU * ARM_SC, P[1] - r[1] * SU * ARM_SC, P[2] + fwd]; };
export const HOOK_BUMP: V3 = armLocalW(HOOK_ARM, ARM_ANG, FA_HERO, 0.005);

// sets / props contracts (read loosely: the sandbox stubs may not export them yet)
type Glass = { c: V3; n: V3; w: number; h: number };
const v3 = (o: unknown): V3 | null => {
  if (!o) return null;
  if (Array.isArray(o) && o.length >= 3) return [Number(o[0]), Number(o[1]), Number(o[2])];
  const r = o as { x?: number; y?: number; z?: number };
  return typeof r.x === "number" ? [r.x, r.y ?? 0, r.z ?? 0] : null;
};
const SM = SetsMod as unknown as Record<string, unknown>, PM = PropsMod as unknown as Record<string, unknown>;
/** ice wind strength (ice.ts iceGust: big gust on "full coat", hush on "lost the coat"); 1 when absent */
const gustAt = (t: number): number => { const f = (IceMod as unknown as { iceGust?: (t: number) => number }).iceGust; return f ? f(t) : 1; };
const GLASS: Glass = (() => {
  const g = SM.MIRROR_GLASS as Record<string, unknown> | undefined;
  const c = v3(g?.centre ?? g?.center ?? g?.c ?? g?.pos) ?? at(ROOM, 1.35, 1.0, -0.55);
  let n = v3(g?.normal ?? g?.n);
  if (!n) { const dx = BEAN_END[0] - c[0], dz = BEAN_END[2] - c[2], l = Math.hypot(dx, dz) || 1; n = [dx / l, 0, dz / l]; }
  const nl = Math.hypot(n[0], n[1], n[2]) || 1;
  return { c, n: [n[0] / nl, n[1] / nl, n[2] / nl], w: Number(g?.w ?? g?.width ?? 0.5), h: Number(g?.h ?? g?.height ?? 1.3) };
})();
export const CAT_SILL: V3 = v3(SM.CAT_SILL) ?? at(ROOM, -1.8, 0.8, 0.3);
const PHONE: V3 = v3(PM.PHONE_AT) ?? v3((PM.PHONE as { c?: unknown } | undefined)?.c) ?? at(ROOM, 0.5, 0.56, -0.51);

// ---------------- helpers ----------------
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
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
/** canvas point on a camera-facing card standing at A -> world (fwd = metres toward the camera) */
const cardW = (A: V3, P: P2, sc: number, cp: THREE.Vector3, fwd = 0): V3 => {
  const yaw = yawOf(A, cp), c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = (P[0] - 300) * SU * sc, ly = (975 - P[1]) * SU * sc;
  return [A[0] + c * lx + s * fwd, A[1] + ly, A[2] - s * lx + c * fwd];
};
/** camera-ray projection of world point P onto the card standing at A (canvas units) */
const projC = (A: V3, P: V3, sc: number, cp: THREE.Vector3): P2 => {
  const yaw = yawOf(A, cp), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const k = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * k, Qy = cp.y + dy * k, Qz = cp.z + dz * k;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / (SU * sc), 2), q(975 - ly / (SU * sc), 2)];
};
const blink = (t: number, i: number, swaps: number[] = []) => q(lidAt(t, i, swaps), 2);
const jit = (t: number, a: number, s = 0): number => a * (0.6 * Math.sin(t * 71 + s) + 0.4 * Math.sin(t * 113 + 1 + s));

// ---------------- BEAN poses (600 x 1000 design; head centre 300, 300) ----------------
const HEAD: P2 = [300, 300], BODY: P2 = [300, 545], SHL: [P2, P2] = [[208, 472], [392, 472]], SEAT = 708;
const legsStand = (knock: number, squat = 0, tuck = 0): LegS[] => [
  { hip: [262, 655], foot: [252 - 14 * squat + 20 * tuck, 950 - 150 * tuck], bend: -22 * knock + 40 * squat + 40 * tuck },
  { hip: [338, 655], foot: [348 + 14 * squat - 20 * tuck, 950 - 110 * tuck], bend: 22 * knock - 40 * squat - 40 * tuck },
];
type ArmP = Omit<ArmS, "sh"> & { sh?: P2 };
const arm = (i: 0 | 1, o: ArmP): ArmS => ({ sh: SHL[i], thick: 40, mirror: i === 1, ...o });
const mixArm = (a: ArmS, b: ArmS, k: number): ArmS => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const n = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, k);
  return { ...(k < 0.5 ? a : b), sh: mix2(a.sh, b.sh, k), w: mix2(a.w, b.w, k), bend: n(a.bend, b.bend), hang: n(a.hang, b.hang), hk: lerp(a.hk ?? 0.36, b.hk ?? 0.36, k), bumps: n(a.bumps, b.bumps), hairs: n(a.hairs, b.hairs), sleeve: n(a.sleeve, b.sleeve) };
};
const mixArms = (a: ArmS[], b: ArmS[], k: number) => a.map((x, i) => mixArm(x, b[i], k));
const qArm = (A: ArmS): ArmS => ({ ...A, sh: [q(A.sh[0], 2), q(A.sh[1], 2)], w: [q(A.w[0], 2), q(A.w[1], 2)] });
/** arms crossed, fists tucked (the cold hug) */
const hugArms = (sl: number, j = 0): ArmS[] => [
  arm(0, { w: [372 + j, 560], bend: 40, hand: "fist", hang: 0.5, sleeve: sl }),
  arm(1, { w: [230 - j, 576], bend: -40, hand: "fist", hang: -0.5, sleeve: sl }),
];
/** in-card hand palm (canvas) of an arm: wrist + along the forearm */
const palmOf = (A: ArmS): P2 => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend * 0.5, (A.sh[1] + A.w[1]) / 2 + ny * A.bend * 0.5];
  const a = Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), r = HAND_WRIST * 0.8 * (A.hk ?? 0.36);
  return [A.w[0] + Math.sin(a) * r, A.w[1] - Math.cos(a) * r];
};

// ---------------- rigs ----------------
type Card = { key: string; draw: (p: Pen) => void; A: V3; sc: number; yaw?: number; blob?: V3; blobSc?: number; h?: number };
type Rig = { cards: Card[]; heads: Record<string, V3>; hands: Record<string, [V3 | null, V3 | null]>; pts: Record<string, V3>; bean?: BeanS };
const beanCard = (who: string, A: V3, s: BeanS, lt: number, blobAt?: V3): Card => ({ key: `go|${who}|${fkey(s)}|${q(lt, 10)}`, draw: (p) => drawBean(p, s, lt), A, sc: BSC, blob: blobAt, blobSc: 0.8 });
const beanHands = (A: V3, s: BeanS, cp: THREE.Vector3): [V3, V3] => [cardW(A, palmOf(s.arms[0]), BSC, cp, 0.04), cardW(A, palmOf(s.arms[1]), BSC, cp, 0.04)];

/** shot 1: the hook (forearm close-up, shiver, ghost fur, confused) */
const T1_GHOST = W.puff - 0.2 - LEAD, T1_FIZ = W.dont - 0.1 - LEAD;
const hookRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const H = hookAt(1, t);
  const calm = ramp(t, T1_GHOST, 0.2) * (1 - ramp(t, T1_FIZ, 0.3)); // he forgets the cold while proud
  const amp = 0.006 * (1 - 0.8 * calm), jx = jit(t, amp);
  const A: V3 = add(BEAN_ST, [jx, 0, 0]);
  let e: Expr, look: P2, tilt = 0;
  if (t < T1_GHOST) { e = "shiver"; look = [-0.6, 0.8]; }
  else if (t < T1_FIZ) { e = "proud"; look = [0.3, -0.2]; tilt = -0.07; }
  else { e = "confused"; look = [-0.1, 1]; tilt = 0.12; }
  const P: V3 = add(HOOK_ARM, [jx * 1.3, jit(t, amp * 0.8, 2), 0]);
  const elbow = armLocalW(P, ARM_ANG, FA_ELBOW), fist = armLocalW(P, ARM_ANG, [0, FA_WRIST[1] - HAND_WRIST * 0.8 * 1.25]);
  const sArm = { ang: ARM_ANG, bumps: q(H.bumps, 60), t: q(t, 30), t0: W.goosebumps };
  const ew = projC(A, elbow, BSC, cp);
  const s: BeanS = {
    outfit: "tee", head: [HEAD[0], HEAD[1]], a: 100, tilt: q(tilt, 50), face: { e, look, shake: frameNo(t) }, lid: e === "proud" ? 0 : blink(t, 7, [T1_GHOST, T1_FIZ]),
    body: BODY, rx: 112 + 6 * calm, ry: 125, cold: 1, legBumps: q(H.bumps, 20),
    arms: [arm(0, { w: [352, 512], bend: 46, hand: "open", hang: 1.25, sleeve: 0.35 }), qArm(arm(1, { w: ew, bend: -18, sleeve: 0.62, thick: 44 }))],
    legs: legsStand(1 - calm),
  };
  const armA: V3 = [P[0], P[1] - 475 * SU * ARM_SC, P[2]];
  const cards: Card[] = [
    beanCard("bean", A, s, lt, BEAN_ST),
    { key: `go|arm|${fkey(sArm)}|${q(lt, 10)}`, draw: (p) => drawForearm(p, sArm), A: armA, sc: ARM_SC, yaw: 0 },
  ];
  return { cards, heads: { bean: cardW(A, s.head, BSC, cp, 0.03) }, hands: { bean: [beanHands(A, s, cp)[0], fist] }, pts: { body: add(A, [0, 0.78, 0]), mouth: cardW(A, [300, 345], BSC, cp, 0.05) }, bean: s };
};
export const hookBumpAt = (t: number): V3 => { const amp = 0.006 * (1 - 0.8 * ramp(t, T1_GHOST, 0.2) * (1 - ramp(t, T1_FIZ, 0.3))); return armLocalW(add(HOOK_ARM, [jit(t, amp) * 1.3, jit(t, amp * 0.8, 2), 0]), ARM_ANG, FA_HERO, 0.005); };

/** shot 3: the cat floofs; BEAN tries */
const T3_LAND = W.cat - 0.05, T3_PUFF = W.puffs - 0.15;
const catPuff3 = (t: number) => Math.min(1.25, Math.max(0, spring(t - T3_PUFF, 12, 5)));
const catRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const C = catAt(3, t), L = LEAD;
  // ---- the cat ----
  const hop = t > T3_LAND ? 0.07 * Math.max(0, Math.sin(Math.PI * clamp01((t - T3_LAND) / 0.28))) : 0;
  const mood: CatMood = t < T3_LAND - L ? "calm" : t < T3_PUFF - L ? "startle" : t < W.traps + 0.15 - L ? "floof" : t < W.twice - 0.25 - L ? "cosy" : t < W.bumps2 + 0.3 - L ? "smug" : "pity";
  const clook: P2 = mood === "calm" ? [-0.5, 0.3] : mood === "startle" ? [0.9, 0.5] : mood === "pity" ? [-1, 0.15] : mood === "smug" ? [-0.4, 0] : [0, 0];
  const cs = { puff: q(catPuff3(t), 50), warm: q(C.warm, 30), mood, lid: mood === "cosy" || mood === "startle" ? 0 : blink(t, 29, [T3_LAND, T3_PUFF, W.bumps2 + 0.3]), look: clook };
  const cA: V3 = add(CAT_A, [jit(t, mood === "startle" ? 0.004 : 0, 5), hop, 0]);
  // ---- BEAN ----
  const kTry = ramp(t, W.you3 - 0.25, 0.3), kBump = ramp(t, W.bumps2 - 0.1, 0.25);
  const shiv = 1 - kTry;
  const jx = jit(t, 0.004 * shiv + 0.006 * C.tryk);
  const A: V3 = add(BEAN_ST, [jx, -0.02 * C.tryk, 0]);
  const tryArms: ArmS[] = [arm(0, { w: [160, 648], bend: -24, hand: "fist", hang: 0.2, sleeve: 0.35 }), arm(1, { w: [440, 648], bend: 24, hand: "fist", hang: -0.2, sleeve: 0.35 })];
  const lookArms: ArmS[] = [arm(0, { w: [196, 650], bend: -10, hand: "rest", hang: 0.2, sleeve: 0.35, bumps: 0.45 }), arm(1, { w: [446, 548], bend: 40, hand: "open", hang: -0.9, sleeve: 0.35, bumps: 0.45 })];
  const arms = mixArms(mixArms(hugArms(0.35, 4 * Math.sin(t * 40) * shiv), tryArms, kTry), lookArms, kBump).map(qArm);
  let e: Expr = "shiver", look: P2 = [0.9, 0.1], tilt = 0;
  const sw = [W.cat - 0.5 - L, W.puffs - 0.15 - L, W.twice - 0.25 - L, W.you3 - 0.25 - L, W.bumps2 - 0.1 - L];
  if (t < sw[0]) { e = "shiver"; }
  else if (t < sw[1]) { e = "oh"; look = [1, 0.2]; }
  else if (t < sw[2]) { e = "awe"; look = [1, -0.1]; tilt = -0.06; }
  else if (t < sw[3]) { e = "wow"; look = [1, -0.4]; }
  else if (t < sw[4]) { e = "strain"; tilt = 0.04 * Math.sin(t * 30); }
  else { e = "sad"; look = t < W.bumps2 + 0.3 - L ? [0.7, 0.9] : [1, 0.2]; tilt = 0.08; }
  const s: BeanS = {
    outfit: "tee", head: [HEAD[0], HEAD[1] + 10 * C.tryk], a: 100, tilt: q(tilt, 50), face: { e, look, shake: frameNo(t) },
    lid: e === "strain" ? 0 : blink(t, 7, sw), body: [BODY[0], BODY[1] + 8 * C.tryk], rx: 112, ry: 125, cold: 1, red: q(C.tryk, 20),
    arms, legs: legsStand(shiv * (1 - kBump), C.tryk), legBumps: q(0.45 * kBump, 20),
  };
  const cards: Card[] = [
    beanCard("bean", A, s, lt, BEAN_ST),
    { key: `go|cat|${fkey(cs)}|${q(lt, 10)}`, draw: (p) => drawCat(p, cs, lt), A: cA, sc: CAT_SC, blob: CAT_A, blobSc: 0.5 + 0.3 * clamp01(cs.puff) },
  ];
  const catTop = (1 + cs.puff) * 350 * CAT_K * SU * CAT_SC;
  return {
    cards, heads: { bean: cardW(A, s.head, BSC, cp, 0.03), cat: cardW(cA, [300, 975 - (1 + cs.puff) * 232 * CAT_K], CAT_SC, cp, 0.03) },
    hands: { bean: beanHands(A, s, cp) }, pts: { body: add(A, [0, 0.78, 0]), catMid: add(cA, [0, catTop * 0.45, 0]), catTop: add(cA, [0, catTop, 0]), mouth: cardW(A, [300, 345], BSC, cp, 0.05) }, bean: s,
  };
};

/** shot 4: the ice age */
const T4_PRESS = W.full - 0.55, T4_HERO = W.full + 0.1;
const iceRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const I = iceAt(4, t), L = LEAD;
  // ---- the ancestor ----
  const floof = Math.min(1.12, Math.max(0, spring(t - (W.full - 0.15), 10, 4.5)));
  const press = ramp(t, T4_PRESS, 0.25), hero = ramp(t, T4_HERO, 0.35);
  const ae: Expr = t < W.full - 0.15 - L ? "content" : t < W.lost + 0.05 - L ? "heroic" : "side";
  const as = { floof: q(floof, 50), press: q(press, 20), hero: q(hero, 20), face: { e: ae, look: (ae === "side" ? [1, 0.1] : [0, 0]) as P2, shake: frameNo(t) }, lid: ae === "content" ? blink(t, 19, [W.full - 0.15 - L, W.lost + 0.05 - L]) : 0, tilt: q(ae === "heroic" ? -0.1 : ae === "side" ? 0.06 : 0.03 * Math.sin(t * 2), 50), gust: q(gustAt(t), 20) };
  // ---- BEAN ----
  const jx = jit(t, 0.005);
  const A: V3 = add(BEAN_ICE, [jx, 0, 0]);
  const kB = I.button, kP = I.press;
  const holdUp = arm(1, { w: [448, 258], bend: -36, hand: "hold", hang: 0, hk: 0.5, sleeve: 0.35, press: q(kP, 10) });
  const slap = arm(0, { w: [410, 170], bend: 50, hand: "slap", hang: 0.9, hk: 0.42, sleeve: 0.35 });
  const hug = hugArms(0.35, 4 * Math.sin(t * 40));
  // QA2: the slap lands, then that arm drops back to the shivering hug (it no longer covers his deadpan face)
  const a0 = mixArm(hug[0], slap, kP * (1 - ramp(t, W.lost + 0.3, 0.35))), a1 = mixArm(hug[1], holdUp, kB);
  const boing = t > W.lost + 0.05 ? Math.min(1.25, Math.max(0, spring(t - (W.lost + 0.05), 16, 4))) : 0;
  a1.boing = q(boing, 30); a1.hand = kB > 0.15 ? "hold" : "fist"; if (kB > 0.15) a1.hk = 0.5;
  let e: Expr = "shiver", look: P2 = [-0.9, 0], tilt = 0;
  const sw = [W.full - 0.15 - L, W.kept - 0.2 - L, W.lost - 0.15 - L, W.lost + 0.25 - L];
  if (t < sw[0]) e = "shiver";
  else if (t < sw[1]) { e = "awe"; look = [-1, -0.2]; }
  else if (t < sw[2]) { e = "hopeful"; look = [0.6, -0.9]; tilt = 0.05; }
  else if (t < sw[3]) { e = "strain"; }
  else { e = "deadpan"; look = [0.8, -0.6]; }
  const s: BeanS = {
    outfit: "tee", head: [HEAD[0], HEAD[1]], a: 100, tilt: q(tilt, 50), face: { e, look, shake: frameNo(t) }, lid: e === "awe" || e === "strain" ? 0 : blink(t, 9, sw),
    body: BODY, rx: 112, ry: 125, cold: 1, snow: 1, icicle: true, arms: [qArm(a0), qArm(a1)], legs: legsStand(1), legBumps: 0.6,
  };
  const ancA = ANC_A;
  const cards: Card[] = [
    beanCard("bean", A, s, lt, BEAN_ICE),
    { key: `go|anc|${fkey(as)}|${q(lt, 10)}`, draw: (p) => drawAncestor(p, as, lt), A: ancA, sc: ANC_SC, blob: ANC_A, blobSc: 0.9 + 0.5 * clamp01(floof) },
  ];
  const ancC = (P: P2): P2 => [300 + (P[0] - 300) * ANC_K, 975 - (975 - P[1]) * ANC_K];
  const p1 = palmOf(s.arms[1]);
  return {
    cards, heads: { bean: cardW(A, s.head, BSC, cp, 0.03), anc: cardW(ancA, ancC([300, 320]), ANC_SC, cp, 0.03) },
    hands: { bean: beanHands(A, s, cp), anc: [null, null] },
    pts: { body: add(A, [0, 0.78, 0]), ancBody: cardW(ancA, ancC([300, 640]), ANC_SC, cp, 0.0), ancBtn: cardW(ancA, ancC(ANC_BTN), ANC_SC, cp, 0.06), btn: cardW(A, [p1[0], p1[1] - 112 * 0.5 * 0.9], BSC, cp, 0.06), boing: cardW(A, mix2(s.arms[1].w, s.arms[1].sh, 0.25), BSC, cp, 0.06), mouth: cardW(A, [300, 345], BSC, cp, 0.05) },
    bean: s,
  };
};

/** shots 5 + 6: the bedroom (ONE rig across the continuous camera) */
const T_OH = W.shiver - 0.2 - LEAD, T_HIT = W.hits - 0.08, T_ROAR = W.puffing - 0.1 - LEAD, T_SONG = W.for - 0.2 - LEAD;
const J0 = W.very - 0.15 - 0.42, J1 = W.very - 0.15, T_LIMP = W.bald + 0.25 - LEAD;
const memeK = (t: number) => { const s0 = t - T_HIT; return q(Math.min(1.15, smooth(s0 / 0.08) * (1 + 0.15 * Math.sin(s0 * 28) * Math.exp(-s0 * 4))), 20); };
const spikeAt = (t: number) => (t < T_HIT ? 0 : Math.min(1.3, Math.max(0, spring(t - T_HIT, 14, 5))) * (1 - 0.65 * roomAt(5, t).deflate));
const SEAT_A: V3 = [BEAN_BED[0], BEAN_BED[1] - (975 - SEAT) * SU * BSC, BEAN_BED[2]];
/** BEAN's card anchor in the room (sitting -> the leap -> standing at the mirror) */
const roomAnchor = (t: number): { A: V3; u: number } => {
  const u = ramp(t, J0, J1 - J0);
  if (u <= 0) return { A: SEAT_A, u };
  const A = mix3(SEAT_A, BEAN_END, u);
  return { A: add(A, [0, 0.38 * Math.sin(Math.PI * u), 0]), u };
};
const roomRig = (t: number, cp: THREE.Vector3, lt: number): Rig => {
  const R = roomAt(5, t), E = endAt(6, t), L = LEAD;
  const { A: A0, u } = roomAnchor(t);
  const standing = t >= J0;
  const shiv = ramp(t, T_OH, 0.15) * (1 - ramp(t, T_HIT, 0.1));
  const A: V3 = add(A0, [jit(t, 0.004 * shiv + 0.003 * ramp(t, T_HIT, 0.1) * (1 - ramp(t, T_ROAR, 0.3))), 0, 0]);
  const kM = ramp(t, T_HIT, 0.1), kR = ramp(t, T_ROAR, 0.2), kS = ramp(t, T_SONG, 0.25), kJ = ramp(t, J0, 0.18), kL = ramp(t, T_LIMP, 0.35);
  const hairUp = q(kM * (1 - 0.6 * R.deflate), 20);
  const chill = [arm(0, { w: [150, 640], bend: -30, hand: "rest", hang: 0.5, sleeve: 0.5 }), arm(1, { w: [450, 640], bend: 30, hand: "rest", hang: -0.5, sleeve: 0.5 })];
  const meme = [arm(0, { w: [92, 300], bend: 42, hand: "splay", hang: -0.15, sleeve: 0.5, hairs: 1, bumps: 1 }), arm(1, { w: [508, 300], bend: -42, hand: "splay", hang: 0.15, sleeve: 0.5, hairs: 1, bumps: 1 })];
  const roar = [arm(0, { w: [128, 262], bend: 34, hand: "claw", hang: -0.2, sleeve: 0.5, hairs: 1, bumps: 1 }), arm(1, { w: [472, 262], bend: -34, hand: "claw", hang: 0.2, sleeve: 0.5, hairs: 1, bumps: 1 })];
  const sheep = [arm(0, { w: [150, 640], bend: -30, hand: "rest", hang: 0.5, sleeve: 0.5, bumps: 0.6 }), arm(1, { w: [398, 222], bend: -46, hand: "scratch", hang: -0.7, sleeve: 0.5, bumps: 0.6 })];
  const rawr = [arm(0, { w: [150, 318], bend: 32, hand: "claw", hang: -0.25, sleeve: 0.5, bumps: 0.6 }), arm(1, { w: [462, 300], bend: -32, hand: "claw", hang: 0.25, sleeve: 0.5, bumps: 0.6 })];
  const limp = [arm(0, { w: [222, 540], bend: 26, hand: "rest", hang: 2.5, sleeve: 0.5, bumps: 0.6 }), arm(1, { w: [378, 540], bend: -26, hand: "rest", hang: -2.5, sleeve: 0.5, bumps: 0.6 })];
  let arms = mixArms(mixArms(mixArms(mixArms(mixArms(chill, meme, kM), roar, kR), sheep, kS), rawr, kJ), limp, kL);
  arms = arms.map((x) => qArm({ ...x, hairs: Math.min(x.hairs ?? 0, hairUp) }));
  // faces
  let e: Expr = "chill", look: P2 = [0, 0], tilt = 0, k = 1, facing = 0;
  const sw = [T_OH, T_HIT, T_ROAR, T_SONG, J0 + 0.12, T_LIMP];
  if (t < sw[0]) { e = "chill"; tilt = 0.07 * Math.sin(2 * Math.PI * 1.6 * t); }
  else if (t < sw[1]) { e = "oh"; look = [0, -0.4]; }
  else if (t < sw[2]) { e = "meme"; k = memeK(t); tilt = 0.06 * Math.sin(t * 21); }
  else if (t < sw[3]) { e = "roar"; look = [0, 0.2]; tilt = -0.05; }
  else if (t < sw[4]) { e = "sheepish"; look = [0.8, 0.7]; tilt = -0.12; }
  else if (t < sw[5]) { e = "roar"; look = [1, 0]; facing = 1; tilt = -0.04; }
  else { e = "deadpan"; look = [0, 0]; facing = 0.3; }
  const sp = q(spikeAt(t), 30);
  const s: BeanS = {
    outfit: "hoodie", head: [HEAD[0] + 8 * facing, HEAD[1] + (e === "chill" ? 4 * Math.sin(2 * Math.PI * 3.2 * t) : 0)], a: 100, tilt: q(tilt, 50),
    face: { e, look, k, shake: frameNo(t) }, lid: e === "meme" || e === "roar" || e === "sheepish" ? 0 : blink(t, 13, sw),
    body: BODY, rx: 114, ry: 125, rot: q(0.05 * facing * (1 - kL), 50), arms, spike: sp, phones: t < J0 + 0.2 ? 1 : 2, phonesUp: q(Math.min(1, sp) * 0.9, 20), facing,
  };
  if (standing) s.legs = legsStand(0, 0, q(Math.sin(Math.PI * u), 20)); else s.seat = SEAT;
  // ---- the cat on the sill ----
  const bearK = R.bear * (1 - R.deflate);
  const cm: CatMood = bearK > 0.2 ? "scared" : t >= W.very2 - L ? "pity" : "calm";
  const cs = { puff: q(Math.min(1.2, Math.max(0, spring(t - (W.scary - 0.35), 12, 5))) * (1 - R.deflate), 30), warm: 0, mood: cm, lid: cm === "pity" ? q(E.blink, 20) : cm === "calm" ? blink(t, 31) : 0, look: (cm === "pity" ? [0.9, 0.2] : cm === "scared" ? [0.6, -0.3] : [0.7, 0.3]) as P2 };
  // ---- the mirror reflection (glass plane) ----
  const scR = GLASS.h / (0.9 * 2.16), gw = GLASS.w / (SU * scR), kk = (BSC / scR) * 0.62;
  const refl: BeanS | null = standing ? { ...s, bald: true, spike: 0, headBumps: 1, face: { ...s.face, e: e === "roar" ? "tinyrawr" : e, look: [-look[0], look[1]] }, arms: s.arms.map((x) => ({ ...x, hairs: 0, bumps: 1 })) } : null;
  const slide = q(-(1 - u) * gw * 0.9, 2), bald = q(E.bald, 30), rk = q(env(t, J1 + 0.05, W.scary2 + 0.45, 0.2, 0.25), 20); // QA2: gone before the push to the glass
  const yawM = Math.atan2(GLASS.n[0], GLASS.n[2]);
  const mA: V3 = [GLASS.c[0] - GLASS.n[0] * 0.03, GLASS.c[1] - GLASS.h / 2 - 25 * SU * scR, GLASS.c[2] - GLASS.n[2] * 0.03];
  const mkey = `go|mirror|${refl ? fkey(refl) : "-"}|${slide}|${bald}|${rk}|${q(gw, 1)}|${q(lt, 10)}`;
  const blobAt: V3 = standing ? [A0[0], BEAN_END[1], A0[2]] : [A0[0], BEAN_BED[1], A0[2]];
  const cards: Card[] = [
    beanCard("bean", A, s, lt, u <= 0 || u >= 1 ? blobAt : undefined),
    { key: `go|catsill|${fkey(cs)}|${q(lt, 10)}`, draw: (p) => drawCat(p, cs, lt), A: CAT_SILL, sc: CAT_SC, blob: CAT_SILL, blobSc: 0.5 },
    { key: mkey, draw: (p) => drawMirror(p, refl, lt, gw, kk, slide, bald, rk), A: mA, sc: scR, yaw: yawM },
  ];
  return {
    cards, heads: { bean: cardW(A, s.head, BSC, cp, 0.03), cat: cardW(CAT_SILL, [300, 975 - 232 * CAT_K], CAT_SC, cp, 0.03) }, hands: { bean: beanHands(A, s, cp) },
    pts: { body: add(A, [0, 0.8, 0]), mouth: cardW(A, [300 + 8 * facing, 345], BSC, cp, 0.05), cupL: cardW(A, [200, 300], BSC, cp, 0.05), cupR: cardW(A, [400, 300], BSC, cp, 0.05), chest: cardW(A, [300, 560], BSC, cp, 0.0) },
    bean: s,
  };
};

const rigAt = (id: number, t: number, cp: THREE.Vector3, lt = 0): Rig | null =>
  id === 1 ? hookRig(t, cp, lt) : id === 3 ? catRig(t, cp, lt) : id === 4 ? iceRig(t, cp, lt) : id === 5 || id === 6 ? roomRig(t, cp, lt) : null;

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -100, 0];
/** world head centre (who = "bean" | "cat" | "anc") */
export const headAt = (id: number, t: number, who = "bean"): V3 => rigAt(id, t, camPosAt(id, t))?.heads[who] ?? NOWHERE;
/** world palm centre: side 0 = screen-left, 1 = screen-right (shot 1 side 1 = the close-up fist) */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => rigAt(id, t, camPosAt(id, t))?.hands[who]?.[side] ?? NOWHERE;
/** BEAN's card anchor (soles; in the room while seated: a virtual anchor 0.49 m under the mattress top) */
export const beanAt = (id: number, t: number): V3 => (id === 1 || id === 3 ? BEAN_ST : id === 4 ? BEAN_ICE : id === 5 || id === 6 ? roomAnchor(t).A : NOWHERE);

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
  out.places.push({ key: `${c.key}`, draw: c.draw, x: c.A[0], y: c.A[1], z: c.A[2], scale: c.sc, yaw: c.yaw, size: [w, h, k] });
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
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, MARK_COL[m]), fit([P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], size, size * 1.33), size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
const sparkles = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.08) => {
  const g = env(t, t0, t1, 0.3, 0.4);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.2 + hh(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * hh(seed, j + 20));
    const col = j % 3 === 0 ? "#fff6a8" : j % 3 === 1 ? "#ffffff" : "#bff0ff";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.6 * spread, 0.15), s, s, { rot: t * 0.8 + j });
  }
};
const drips = (out: Stage, t: number, from: number, to: number, P: V3, cam: CamInfo, rate: number, fall: number, size = 0.05, n = 2) => {
  if (t < from || t > to + 1 / rate) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const t0 = from + j / (n * rate), ph = ((t - t0) * rate) % 1, cyc = Math.floor((t - t0) * rate);
    if (t < t0 || t0 + cyc / rate > to) continue;
    const k = Math.sin(Math.PI * Math.min(1, ph * 1.1));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, (j - (n - 1) / 2) * 0.07, -fall * ph * ph, 0.1), size * k, size * 1.3 * k);
  }
};
const burst = (out: Stage, t: number, t0: number, P: V3, cam: CamInfo, r: number, n: number, seed: number, size = 0.07) => {
  const s0 = t - t0;
  if (s0 < 0 || s0 > 0.9) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + hh(seed, j), d = r + s0 * (0.5 + 0.4 * hh(seed, j + 3)), k = Math.sin(Math.PI * Math.min(1, s0 / 0.9));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.6 * s0 * s0, 0.15), size * k, size * 1.3 * k, { rot: -Math.cos(a) * 0.8 });
  }
};
/** shiver lines either side of a body + chattering */
const shiverFx = (out: Stage, t: number, g: number, C: V3, cam: CamInfo, half: number, size = 0.2) => {
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C), ph = q((t * 9) % (Math.PI * 2), 4);
  for (const sd of [-1, 1]) {
    const k = g * (0.85 + 0.15 * Math.sin(t * 17 + sd));
    fxCard(out, `shiver|${ph}`, 256, 512, (p) => fxShiver(p, ph), at3(C, R, U, N, sd * (half + 0.02 * Math.sin(t * 40)), 0.05, 0.06), size * 0.5 * k, size * k, { rot: sd * 0.12 });
  }
};
/** little breath clouds from a mouth, drifting up + away */
const breathFx = (out: Stage, t: number, t0: number, t1: number, P: V3, cam: CamInfo, dir: number, size = 0.09) => {
  if (t < t0 || t > t1 + 1.1) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 3; j++) {
    const s0 = t0 + j * 0.42 - 0.42 * 3, per = 1.26, cyc = Math.floor((t - s0) / per), b = s0 + cyc * per, s = t - b;
    if (b < t0 - 0.01 || b > t1 || s < 0 || s > 1.0) continue;
    const k = Math.sin(Math.PI * Math.min(1, s / 1.0)) * (0.6 + 0.6 * s);
    fxCard(out, `breath|${j % 2}`, 256, 256, (p) => fxBreath(p, 3 + (j % 2)), at3(P, R, U, N, dir * (0.05 + 0.14 * s), 0.02 + 0.1 * s, 0.1), size * k, size * 0.8 * k);
  }
};
const speedLines = (out: Stage, t: number, P: V3, cam: CamInfo, g: number, size = 0.3) => {
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 3; j++) {
    const ph = (t * 4 + j / 3) % 1, k = g * Math.sin(Math.PI * ph);
    fxCard(out, "speed", 256, 512, fxSpeed, at3(P, R, U, N, -0.25 - 0.18 * ph, (j - 1) * 0.16, 0.05), size * 0.4 * k, size * k, { rot: Math.PI / 2 });
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
  else if (id === 3) catFx(t, rig, cam, out);
  else if (id === 4) iceFx(t, rig, cam, out);
  else roomFx(id, t, rig, cam, out);
  return out;
};

const GHOST_COL = "#bfe6ff", GHOST_DOT = "#2a4a9a";
const hookFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const H = hookAt(1, t), head = rig.heads.bean, body = rig.pts.body;
  const top = add(head, [0.04, 0.34, 0.05]);
  shiverFx(out, t, 1 - ramp(t, T1_GHOST, 0.2) * (1 - ramp(t, T1_FIZ, 0.3)), body, cam, 0.36, 0.26);
  breathFx(out, t, 0.1, T1_GHOST - 0.2, rig.pts.mouth, cam, 1, 0.09);
  breathFx(out, t, T1_FIZ + 0.2, 99, rig.pts.mouth, cam, 1, 0.09);
  { // BRRR over his head (the cold hook)
    // QA: shown IN the forearm close-up (upper right, clear of the watermark) and gone before the pull-back reveals the
    // face (above the head it got clamped onto his eyes/mouth mid-move)
    const k = env(t, 0.12, 0.58, 0.25, 0.2), w = 0.14, ph = q((t * 3) % (Math.PI * 2), 8);
    if (k > 0.02) fxCard(out, `brrr|${ph}`, 768, 300, (p) => fxBrrr(p, ph), add(STREET, [-0.337, 0.945, 0.0]), w * k, w * 0.39 * k, { rot: 0.08 });
  }
  // big foreground snowflakes drifting past the close-up
  for (let j = 0; j < 4; j++) {
    const t0 = -0.3 + j * 0.45, s = t - t0;
    if (s < 0 || s > 2.2) continue;
    const k = Math.sin(Math.PI * Math.min(1, s / 2.2)), P = add(HOOK_ARM, [-0.2 + 0.14 * j + 0.04 * Math.sin(s * 2 + j), 0.32 - 0.3 * s, 0.07]);
    fxCard(out, `flake|${j % 2}`, 256, 256, (p) => fxSnowflake(p, j % 2), P, 0.035 * k, 0.035 * k, { rot: s * (0.8 + 0.3 * j) });
  }
  // the GHOST FUR: puffs out (springy) on "puff up fur", fizzles away on "don't even have"
  const tg = W.puff - 0.2, fiz = q(H.fizzle, 30);
  if (t >= tg && fiz < 0.999) {
    const { N } = camVecs(cam, body), kin = q(Math.min(1.15, Math.max(0, spring(t - tg, 11, 5))), 40), ph = q(t * 4, 2), w = 2.5;
    fxCard(out, `ghost|${kin}|${fiz}|${ph}`, 1024, 1024, (p) => fxGhost(p, kin, fiz, GHOST_COL, GHOST_DOT, 0, ph), add(body, N, -0.12), w, w, { soft: true });
  }
  sparkles(out, t, T1_GHOST + 0.2, T1_FIZ, add(head, [0.15, 0.1, 0]), cam, 0.18, 3, 11, 0.06);
  sparkles(out, t, W.dont - 0.1, W.dont + 0.45, body, cam, 0.62, 9, 13, 0.09);
  mark(out, t, T1_FIZ + 0.08, W.have + 0.2, top, "?", 0.2); // QA: gone before the dive (it slid over his face)
};

const catFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const C = catAt(3, t), head = rig.heads.bean, ch = rig.heads.cat, cm = rig.pts.catMid, cp = cam.pos;
  shiverFx(out, t, 1 - ramp(t, W.cat - 0.6, 0.3), rig.pts.body, cam, 0.34, 0.24);
  breathFx(out, t, shotStartT(3), W.cat - 0.6, rig.pts.mouth, cam, 1, 0.09);
  mark(out, t, T3_LAND - LEAD, T3_PUFF - 0.2, add(ch, [0.1, 0.22, 0.05]), "!", 0.17);
  sparkles(out, t, T3_PUFF, T3_PUFF + 0.6, cm, cam, 0.4, 7, 17, 0.08);
  // warm-air puffs drifting round the floof
  if (C.warm > 0.02) {
    const { R, U, N } = camVecs(cam, cm);
    for (let j = 0; j < 4; j++) {
      const ph = ((t - W.traps) * 0.5 + j / 4) % 1, a = j * 1.7 + t * 0.8, k = C.warm * Math.sin(Math.PI * Math.max(0, ph)) * (t > W.traps - 0.2 ? 1 : 0);
      if (k < 0.02) continue;
      fxCard(out, `warm|${j % 2}`, 256, 256, (p) => fxWarm(p, 5 + (j % 2)), at3(cm, R, U, N, (j % 2 ? 1 : -1) * (0.36 + 0.06 * Math.sin(a)), -0.1 + 0.5 * ph, 0.12), 0.14 * k, 0.14 * k, { rot: 0.3 * Math.sin(a) });
    }
  }
  // the 2x ruler slides in beside the cat
  // QA2: the near cards fade as the WHOOSH crash-zooms past them (they blew up huge in the 3->4 whiteout)
  const whoosh = 1 - ramp(t, SHOTS[2].b / FPS - 0.33, 0.25);
  const rk = C.ruler * (1 - ramp(t, W.bumps2 - 0.4, 0.25)) * whoosh; // QA: clears before the lens; scale from 0 (no 60 % pop)
  if (rk > 0.01) {
    const H = 0.95, w = H * 320 / 1024, h0 = 350 * CAT_K * SU * CAT_SC, y1 = q(1024 * (1 - h0 / H), 1), y2 = q(1024 * (1 - 2 * h0 / H), 1);
    const { R } = camVecs(cam, CAT_A), base = add(add(CAT_A, R, -0.5 - 0.4 * (1 - rk)), [0, H / 2, 0.05]);
    fxCard(out, `ruler|${y1}|${y2}`, 320, 1024, (p) => fxRuler(p, y1, y2), base, w * rk, H * rk);
  }
  // BEAN strains: sweat + red; then the tiny bumps: a lens + a sad little "boop"
  drips(out, t, W.you3 - 0.15, W.bumps2 + 0.2, add(head, [0.17, 0.1, 0.05]), cam, 2.2, 0.12, 0.045, 2);
  const lend = SHOTS[2].b / FPS - 0.35; // QA: lens + boop shrink away as the whoosh starts (the crash zoom blew them up)
  const lk = env(t, W.bumps2 - 0.1, lend, 0.25, 0.18) * whoosh;
  if (lk > 0.02) {
    const { R, U, N } = camVecs(cam, head), w = 0.42, P = fit(at3(head, R, U, N, 0.4, -0.12, 0.12), w, w);
    fxCard(out, `lens|${q(C.bumps, 20)}`, 600, 600, (p) => fxLens(p, q(C.bumps, 20)), P, w * lk, w * lk, { rot: -0.05 });
    const bk = env(t, W.bumps2 - 0.02, lend, 0.2, 0.15) * whoosh, bw = 0.4;
    fxCard(out, "boop", 800, 500, (p) => fxWord(p, "boop", "boop"), fit(add(P, [0.06, 0.2, 0.02]), bw, bw * 0.62), bw * bk, bw * 0.62 * bk, { rot: 0.1 });
  }
  void cp;
};

const iceFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const I = iceAt(4, t), ab = rig.pts.ancBody;
  shiverFx(out, t, 1 - ramp(t, W.lost + 0.2, 0.3) * 0.5, rig.pts.body, cam, 0.34, 0.24);
  breathFx(out, t, shotStartT(4), 99, rig.pts.mouth, cam, -1, 0.1);
  // the majestic floof: a gold ray burst behind + sparkles
  const fk = env(t, W.full - 0.15, W.full + 1.3, 0.2, 0.5);
  if (fk > 0.02) { const { N } = camVecs(cam, ab), w = 2.1; fxCard(out, `rays|gold`, 512, 512, (p) => fxRays(p, "#ffe14a", "#ffb04a"), add(ab, N, -0.3), w * fk, w * fk, { rot: t * 0.4, soft: true }); }
  sparkles(out, t, W.full - 0.1, 99, add(ab, [0, 0.3, 0]), cam, 0.7, 9, 23, 0.1);
  sparkles(out, t, T4_PRESS + 0.2, T4_PRESS + 0.6, rig.pts.ancBtn, cam, 0.08, 3, 25, 0.06);
  sparkles(out, t, W.kept - 0.1, W.lost - 0.15, rig.pts.btn, cam, 0.1, 3, 27, 0.06);
  // the press click + ONE hair: BOING
  if (I.press > 0.5) sparkles(out, t, W.lost - 0.05, W.lost + 0.25, rig.pts.btn, cam, 0.1, 4, 29, 0.08);
  const bk = env(t, W.lost + 0.05, 99, 0.18, 0.2);
  if (bk > 0.02) {
    const w = 0.5, ph = q(t % 10, 15);
    fxCard(out, `boing|${ph}`, 800, 500, (p) => fxWord(p, "BOING", "boing", ph), fit(add(rig.pts.boing, [0.1, 0.38, 0.06]), w, w * 0.62), w * bk, w * 0.62 * bk, { rot: -0.08 });
  }
};

const NOTE_COLS = ["#b07aff", "#ff6ac8", "#ffd23a", "#3ad0ff"];
const roomFx = (id: number, t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const R = roomAt(5, t), head = rig.heads.bean, body = rig.pts.body;
  const top = add(head, [0, 0.4, 0.05]);
  // music notes float out of the headphones (they stop when the bear rises)
  const N0 = W.music - 0.3, NEND = T_ROAR;
  for (const [ci, cup] of [rig.pts.cupL, rig.pts.cupR].entries()) {
    const { R: Rr, U, N } = camVecs(cam, cup), sd = ci ? 1 : -1;
    for (let j = 0; j < 5; j++) {
      const per = 1.6, s0 = N0 + j * 0.32 + ci * 0.16, cyc = Math.floor((t - s0) / per), b = s0 + cyc * per, s = t - b;
      if (b < N0 - 0.01 || b > NEND || s < 0 || s > 1.5) continue;
      const k = Math.sin(Math.PI * Math.min(1, s / 1.5)) * smooth(R.notes * 2), col = NOTE_COLS[(j + ci * 2 + cyc) % 4], kind = (j + cyc) % 2;
      if (k < 0.02) continue;
      fxCard(out, `note|${col}|${kind}`, 256, 256, (p) => fxNote(p, kind, col), at3(cup, Rr, U, N, sd * (0.1 + 0.28 * s) + 0.04 * Math.sin(s * 6 + j), 0.08 + 0.5 * s, 0.08), 0.15 * k, 0.15 * k, { rot: 0.3 * Math.sin(s * 5 + j) });
    }
  }
  // the PUFF button floats by his chest; a note with a little hand pokes it
  const kb = env(t, W.music - 0.1, W.button2 + 0.45, 0.3, 0.3);
  if (kb > 0.02) {
    const { R: Rr, U, N } = camVecs(cam, rig.pts.chest), bob = 0.02 * Math.sin(t * 3);
    const PB = at3(rig.pts.chest, Rr, U, N, 0.38, 0.04 + bob, 0.22), w = 0.3, // QA2: bigger, reads on a phone
    pr = q(R.press, 10);
    fxCard(out, `btn|${pr}`, 512, 512, (p) => fxButton(p, pr), PB, w * kb, w * kb);
    const tA = W.press - 0.65, tB = W.press - 0.08, u = smooth((t - tA) / (tB - tA)), home = at3(rig.pts.cupR, Rr, U, N, 0.1, 0.25, 0.1), dest = at3(PB, Rr, U, N, -0.17, 0.07, 0.02);
    const kn = env(t, tA, W.button2 + 0.45, 0.2, 0.3);
    if (kn > 0.02) fxCard(out, `notehand|${pr}`, 512, 384, (p) => fxNoteHand(p, pr, "#b07aff"), add(mix3(home, dest, u), [0, 0.04 * Math.sin(Math.PI * u), 0]), 0.29 * kn, 0.2175 * kn, { rot: 0.1 * Math.sin(t * 6) });
    sparkles(out, t, W.press, W.press + 0.4, PB, cam, 0.1, 4, 41, 0.06);
  }
  // "That shiver": shiver lines; THE HIT: the HUGE ghost fur explodes, rays, "!", sweat flies
  shiverFx(out, t, ramp(t, T_OH, 0.15) * (1 - ramp(t, T_HIT, 0.1)), body, cam, 0.38, 0.26);
  const { N } = camVecs(cam, body);
  if (t >= T_HIT && R.bear < 0.999) {
    const kin = q(Math.min(1.15, Math.max(0, spring(t - T_HIT, 9, 4))), 40), ph = q(t * 6, 2), w = 3.4, op = q(1 - R.bear, 20);
    fxCard(out, `ghostpk|${kin}|${ph}|${op}`, 1024, 1024, (p) => fxGhost(p, kin, 0, "#ff8ae8", "#4a1478", 1, ph, op, 0.6), add(add(body, [0, 0.12, 0]), N, -0.16), w, w, { soft: true });
  }
  const rk = env(t, T_HIT, T_ROAR, 0.12, 0.35);
  if (rk > 0.02) fxCard(out, "rays|peak", 512, 512, (p) => fxRays(p, "#ff4ad8", "#ffd23a"), add(add(body, [0, 0.2, 0]), N, -0.3), 2.0 * rk, 2.0 * rk, { rot: t * 0.6, soft: true });
  mark(out, t, T_HIT, T_ROAR - 0.15, add(top, [0.18, 0.05, 0]), "!", 0.2);
  mark(out, t, T_HIT + 0.06, T_ROAR - 0.15, add(top, [-0.2, 0.0, 0]), "!", 0.17);
  burst(out, t, T_HIT, head, cam, 0.24, 7, 51, 0.05);
  sparkles(out, t, T_HIT, T_ROAR, body, cam, 0.8, 8, 53, 0.09);
  // the ghost BEAR: rises behind him, roars, then sags + deflates (gone before the leap)
  if (R.bear > 0.001) {
    const kb2 = q(Math.min(1.12, Math.max(0, spring(t - (W.scary - 0.35), 10, 5))), 40), d = q(R.deflate, 30), op = q(1 - ramp(t, W.song2 + 0.45, 0.35), 20), ph = q(t * 3, 2);
    if (op > 0.01) {
      const H = 1.95, base: V3 = [ROOM[0] + 0.0, BEAN_BED[1] - 0.02, ROOM[2] - 1.15];
      fxCard(out, `bear|${kb2}|${d}|${op}|${ph}`, 1024, 1280, (p) => fxBear(p, kb2, d, "#7a2ab8", "#2a0a4a", ph, op), add(base, [0, H / 2 - H * (50 / 1280), 0]), H * 1024 / 1280, H, { soft: true });
      if (d > 0.05 && d < 0.98) for (let j = 0; j < 3; j++) { // pfff: air escaping
        const s = (d * 1.4 + j * 0.25) % 1, k = Math.sin(Math.PI * s), sd = j % 2 ? 1 : -1;
        fxCard(out, "poof", 256, 256, fxPoof, add(base, [sd * (0.5 + 0.5 * s), 1.0 + 0.4 * j * (1 - d) + 0.2 * s, 0.1]), 0.18 * k, 0.18 * k, { rot: s * 2 });
      }
    }
  }
  // "for a song": pastel notes from the tiny phone
  for (let j = 0; j < 4; j++) {
    const per = 1.4, s0 = W.for - 0.2 + j * 0.35, cyc = Math.floor((t - s0) / per), b = s0 + cyc * per, s = t - b;
    if (b < s0 - 0.01 || b > J1 || s < 0 || s > 1.3) continue;
    const k = Math.sin(Math.PI * Math.min(1, s / 1.3)), col = ["#ffb0d8", "#b0e8ff", "#fff0a0", "#c8b0ff"][(j + cyc) % 4];
    fxCard(out, `cute|${col}`, 256, 256, (p) => fxCuteNote(p, col), add(PHONE, [0.06 * Math.sin(s * 5 + j) + 0.08 * (j - 1.5), 0.12 + 0.42 * s, 0.05]), 0.08 * k, 0.08 * k, { rot: 0.2 * Math.sin(s * 4 + j) });
  }
  // the leap to the mirror + RAWR
  const lu = ramp(t, J0, J1 - J0);
  speedLines(out, t, body, cam, Math.sin(Math.PI * lu) * (lu > 0 && lu < 1 ? 1 : 0), 0.34);
  const wk = env(t, W.very - 0.15, W.scary2 + 0.45, 0.2, 0.25); // QA2: gone before the push (the lens passed through it)
  if (wk > 0.02) {
    const { R: Rr, U, N: Nn } = camVecs(cam, head), w = 0.5;
    fxCard(out, "rawr", 800, 500, (p) => fxWord(p, "RAWR!", "rawr"), fit(at3(head, Rr, U, Nn, 0.42, 0.16, 0.1), w, w * 0.62), w * wk, w * 0.62 * wk, { rot: -0.1 });
  }
  if (id === 6) sparkles(out, t, W.bald + 0.1, 99, mix3(GLASS.c, [GLASS.c[0], GLASS.c[1] + 0.3, GLASS.c[2]], 1), cam, 0.2, 3, 61, 0.05);
};
const shotStartT = (id: number) => SHOTS[id - 1].a / FPS;
