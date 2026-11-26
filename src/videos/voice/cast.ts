// OWNER: cast agent. Every character card + effect card for "Your Voice on Recordings". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, phoneAt, micAt, ratingAt) and props.ts
// (phoneGrip, tabletTap). Cards yaw to the camera; card origin = the point between the feet ON the ground (canvas 300, 975).
// CONTRACTS (world metres; Ro = ROOM, La = LAB):
//   BEAN      shots 1, 3, 5: stands at BEAN_ROOM = Ro+(0,0,0); head centre ~Ro+(0,1.46,0), mouth ~Ro+(0,1.35,0.05).
//             His SCREEN-RIGHT hand (side 1) holds the phone: camera-ray projected onto props.phoneGrip(id,t) every frame.
//             Shot 2 (the X-ray): drawn in PROFILE facing his own +z (screen-left from a camera at +x), same head centre;
//             profPointsAt(t) gives the world head / eye / mouth / nose / ear / innerEar / jaw / crown / chin + dir (+1 =
//             face points screen-right, -1 screen-left) for holo's skull + sound paths. talkAt(id,t) 0..1 = mouth open
//             (shot 2 from W.talk, shot 3 into the mic): emit rings on the opens.
//             Shot 4: sits on the stool, card plane BEAN_LAB = La+(0,0,0.4); seat top SEAT_Y 0.60 m, feet on a footrest
//             at FOOTREST_Y 0.27 m, head centre ~La+(0,1.30,0.4) (headAt; PROP_HOOKS.head/headR are set here: the props
//             headphones sit on it). His SCREEN-LEFT finger (side 0) taps props.tabletTap(id,t) until the hug (MEME_HUG).
//             THE MEME FACE from MEME_T (W.higher - 0.3): heart eyes, blush, dreamy smile; arms wrap round himself from
//             MEME_HUG (34.0 s).
//   CROWD     shot 3 only, around BEAN (CROWD_AT): pop in (scale from the feet) staggered from W.heard - 0.6, nod "yep"
//             together, YEP bubbles; they shrink away never (they hold to the cut). Kept out of the mic strip (x .3..2.5,
//             z .2...8). The cat sits on the floor (card scale CAT_SC).
//   RESEARCHER shot 4 at RESEARCHER_AT = La+(1.2,0,-0.5): clipboard + pen, "shh" + sly side-eye on "without knowing
//             theirs was in there", smug at the peak.
//   Exports: headAt / mouthAt / handAt(id,t,who,side 0=screen-left 1=screen-right) / earAt / talkAt / profPointsAt,
//            HEAD_R (0.255 m head half-width at scale 1), CROWD_AT, MEME_T, MEME_HUG.
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, ROOM, LAB, SHOTS, V3, smooth, clamp01, camAt } from "./story";
import { WORDS } from "./voice";
import { phoneGrip, phonePose, tabletTap, PROP_HOOKS } from "./props";
import {
  KITS, Who, Pose, Face, FaceS, P2, HandK, Hold, ProfS, CatS, PROFILE, CAT_HEAD, HEAD_A,
  drawPerson, drawProfile, drawCat, jointsOf, profHeadXf, lerp2,
  fxHeart, fxHeartHalo, fxMark, fxSweat, fxSparkle, fxMotion, fxNod, fxYep,
} from "./fx";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_ROOM: V3 = at(ROOM, 0, 0, 0);
export const BEAN_LAB: V3 = at(LAB, 0, 0, 0.4);
export const RESEARCHER_AT: V3 = at(LAB, 1.2, 0, -0.5);
/** LAB desk top (sets) */
const DESK_Y = 0.76;
export const SEAT_Y = 0.62, FOOTREST_Y = 0.27;
/** canvas drop of the seated upper body: the bum (torso bottom, canvas 622) rests on SEAT_Y */
const SEAT_DROP = Math.round(975 - SEAT_Y / SU - 622);
export const HEAD_R = HEAD_A * SU;
export const CAT_SC = 0.25;
type CrowdId = "mum" | "dad" | "friend" | "teacher" | "grandma" | "cat";
/** the crowd round BEAN in shot 3 (ROOM-relative card origins), card scale, pop-in order, YEP word + colour */
/** bub: the YEP bubble centre offset from the head (m, camera right / up) */
export const CROWD_AT: Record<CrowdId, { at: V3; sc: number; i: number; word: string; col: string; bub: [number, number] }> = {
  mum: { at: at(ROOM, -0.68, 0, 0.7), sc: 1.04, i: 0, word: "Yep!", col: "#ff6f8a", bub: [-0.12, 0.46] },
  dad: { at: at(ROOM, 0.5, 0, -0.5), sc: 1.1, i: 1, word: "YEP.", col: "#2f9a6a", bub: [0.1, 0.5] },
  grandma: { at: at(ROOM, 0.78, 0, 1.05), sc: 0.92, i: 2, word: "Yes dear", col: "#9a6ae0", bub: [0.12, 0.38] },
  friend: { at: at(ROOM, 1.15, 0, 0.1), sc: 0.97, i: 3, word: "YUP!", col: "#ff8a1f", bub: [0.02, 0.48] },
  teacher: { at: at(ROOM, -1.06, 0, 1.35), sc: 1.08, i: 4, word: "Indeed.", col: "#3a64f2", bub: [0.02, 0.5] },
  cat: { at: at(ROOM, 0.38, 0, 1.6), sc: CAT_SC, i: 5, word: "Mrrp.", col: "#ff9a3c", bub: [0.16, 0.2] },
};
const CROWD_T0 = W.heard - 0.95; // QA1: all in before "heard" (670); layout above keeps BEAN clear (QA1)
/** YEP bubbles in turn (about two up at once), all gone before "your whole life" lands */
const yepT = (i: number) => CROWD_T0 + 0.3 + 0.27 * i, YEP_HOLD = 0.95;
export const MEME_T = W.higher - 0.3, MEME_HUG = W.elses - 0.45;

/** extra word cues (s) from the narration timings (not in story.W) */
const cue = (w: string, from = 0) => WORDS.find((x) => x.s >= from && x.w.toLowerCase().startsWith(w))!.s;
const C = { when: cue("when"), without: cue("without"), their: cue("their", 31) };

// ---------------- helpers ----------------
const on = (t: number, w: number) => t >= w - LEAD;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const frameNo = (t: number) => Math.round(t * FPS);
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
const mixPose = (a: Pose, b: Pose, k: number): Pose => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const m = (x?: number, y?: number) => lerp(x ?? 0, y ?? 0, k), d = k < 0.5 ? a : b;
  const ha = (i: 0 | 1) => { const x = a.ha?.[i] ?? null, y = b.ha?.[i] ?? null; return x !== null && y !== null ? lerp(x, y, k) : k < 0.5 ? x : y; };
  return {
    ...d,
    feet: [lerp2(a.feet[0], b.feet[0], k), lerp2(a.feet[1], b.feet[1], k)], hands: [lerp2(a.hands[0], b.hands[0], k), lerp2(a.hands[1], b.hands[1], k)], ha: [ha(0), ha(1)],
    knees: a.knees && b.knees ? [lerp2(a.knees[0], b.knees[0], k), lerp2(a.knees[1], b.knees[1], k)] : d.knees,
    drop: m(a.drop, b.drop), lean: m(a.lean, b.lean), headTilt: m(a.headTilt, b.headTilt), shrug: m(a.shrug, b.shrug), shake: m(a.shake, b.shake), headDy: m(a.headDy, b.headDy),
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
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };
/** quantise a pose's hand targets (caching + no sub-pixel shimmer) */
const qPose = (p: Pose): Pose => ({ ...p, hands: [[q(p.hands[0][0], 2), q(p.hands[0][1], 2)], [q(p.hands[1][0], 2), q(p.hands[1][1], 2)]] });
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.25 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};

// ---------------- rigs ----------------
type Rig = { who: Who; pose: Pose; face: FaceS; swaps: number[]; A: V3; sc: number; phones: boolean };
const STAND: [P2, P2] = [[262, 948], [338, 948]];
const REST: [P2, P2] = [[212, 622], [388, 622]];
const UPA = -Math.PI / 2;
/** BEAN's phone hand (side 1) on props' grip (shots 1, 3, 5) */
const withPhone = (pose: Pose, id: number, t: number, A: V3): Pose => {
  if (phonePose(id, t).show <= 0) return pose;
  const H = proj(A, phoneGrip(id, t));
  return { ...pose, hands: [pose.hands[0], H], hk: [pose.hk?.[0] ?? "rest", "grip"], ha: [pose.ha?.[0] ?? null, -1.9], front: [pose.front?.[0] ?? false, true], over: [pose.over?.[0] ?? false, false] };
};
const bp = (h0: P2, extra: Partial<Pose> = {}, hk0: HandK = "rest"): Pose => ({ feet: STAND, hands: [h0, REST[1]], hk: [hk0, "grip"], ...extra });
/** small hop (m) of BEAN's card */
const hop = (t: number, t0: number, h = 0.035) => { const u = (t - t0) / 0.32; return u < 0 || u > 1 ? 0 : h * Math.sin(Math.PI * u); };

// ---- shot 1: listen -> horrified ("recordings") -> dread ("Bad news.") ----
const bean1 = (t: number): Rig => {
  const pose0 = segPose(t, [
    [-9, () => bp(REST[0], { headTilt: 2 })],
    [W.recordings - 0.12, () => bp([238, 418], { lean: -0.07, shrug: 12, ha: [UPA - 0.5, null], front: [true, true] }, "open"), 0.12], // recoils, palm up
    [W.bad - 0.15, () => bp([292, 560], { shrug: 16, headDy: 5, front: [true, true], ha: [-0.4, null] }, "fist"), 0.3],            // clutches his hoodie
    [W.real - 0.15, () => bp([222, 640], { shrug: -8, drop: 5, headTilt: 3 }), 0.4],
  ]);
  const lift = hop(t, W.recordings - 0.1);
  const A: V3 = [BEAN_ROOM[0], BEAN_ROOM[1] + lift, BEAN_ROOM[2]];
  const e = faceAt(t, [[-9, "listen"], [W.recordings - 0.1, "horrified"], [W.bad - 0.12, "dread"], [W.real - 0.12, "defeated"]]);
  return { who: "bean", pose: qPose(withPhone(pose0, 1, t, A)), face: { e, shake: frameNo(t) }, swaps: [W.recordings - 0.1, W.bad - 0.12, W.real - 0.12], A, sc: 1, phones: true };
};
// ---- shot 3: curious at the mic -> talks into it -> nervous ("weird voice") -> SHOCKED ("your whole life") ----
const bean3 = (t: number): Rig => {
  const tk = talkAt(3, t);
  const pose0 = segPose(t, [
    [-9, () => bp(REST[0], { headTilt: -2 })],
    [W.microphone - 0.1, () => bp([206, 560 - 10 * tk], { headDy: -2 }, "open"), 0.35],
    [W.weird - 0.2, () => bp([290, 574], { shrug: 10, front: [true, false], ha: [-0.3, null] }, "fist"), 0.3],
    [W.life - 0.12, () => bp([232, 338], { shrug: 18, over: [true, false], ha: [UPA + 0.3, null] }, "cup"), 0.14],      // hand flies to his cheek
  ]);
  const lift = hop(t, W.life - 0.12, 0.05);
  const A: V3 = [BEAN_ROOM[0], BEAN_ROOM[1] + lift, BEAN_ROOM[2]];
  const e = faceAt(t, [[-9, "curious"], [W.microphone, "talk"], [W.weird - 0.15, "nervous"], [W.life - 0.12, "shocked"]]);
  const look: P2 | undefined = e === "curious" ? [0.55, 0.6] : e === "nervous" ? [q(Math.max(-1, Math.min(1, 1.6 * Math.sin(t * 3.1))), 4), 0.1] : undefined;
  return { who: "bean", pose: qPose(withPhone(pose0, 3, t, A)), face: { e, shake: frameNo(t), talk: q(tk, 10), look }, swaps: [W.microphone, W.weird - 0.15, W.life - 0.12], A, sc: 1, phones: true };
};
// ---- shot 5: soft ("You don't hate your voice") -> shy warm smile ("recognize it") ----
const bean5 = (t: number): Rig => {
  const rub = Math.sin(t * 7) * 6;
  const pose0 = segPose(t, [
    [-9, () => bp(REST[0], { headTilt: 1 })],
    [W.recognize - 0.3, () => bp([206, 360 + rub], { shrug: 6, headTilt: 4 }, "open"), 0.45], // rubs the back of his neck
  ]);
  const e = faceAt(t, [[-9, "soft"], [W.recognize - 0.25, "shy"]]);
  return { who: "bean", pose: qPose(withPhone(pose0, 5, t, BEAN_ROOM)), face: { e, shake: frameNo(t) }, swaps: [W.recognize - 0.25], A: BEAN_ROOM, sc: 1, phones: true };
};
// ---- shot 4: seated in the booth ----
const KNEES: [P2, P2] = [[248, 716], [352, 716]];
const FEET_RUNG: [P2, P2] = [[268, Math.round(975 - FOOTREST_Y / SU)], [332, Math.round(975 - FOOTREST_Y / SU)]];
const seat = (h0: P2, h1: P2, extra: Partial<Pose> = {}, hk: [HandK, HandK] = ["point", "rest"]): Pose =>
  ({ feet: FEET_RUNG, knees: KNEES, hands: [h0, h1], hk, front: [true, true], drop: SEAT_DROP, ...extra });
const bean4 = (t: number): Rig => {
  const A = BEAN_LAB;
  const tap = (): P2 => proj(A, tabletTap(4, t));
  const sway = Math.sin((t - MEME_HUG) * 4.2);
  const pose0 = segPose(t, [
    [-9, () => seat(proj(A, at(LAB, -0.17, DESK_Y + 0.03, 0.64)), proj(A, at(LAB, 0.17, DESK_Y + 0.03, 0.64)), { headTilt: 2, ha: [0.4, Math.PI - 0.4] }, ["rest", "rest"])], // hands resting on the desk: "here's the twist"
    [W.study - 0.35, () => seat(tap(), proj(A, at(LAB, 0.17, DESK_Y + 0.03, 0.64)), { headTilt: 3, lean: 0.03, ha: [1.9, null] }), 0.4],                 // taps the ratings
    [W.own - 0.35, () => seat(tap(), [384, 380], { headTilt: -4, over: [false, true], ha: [1.9, UPA - 0.2] }, ["point", "cup"]), 0.3], // a hand to the headphones: "huh?"
    [MEME_T, () => seat(tap(), proj(A, at(LAB, 0.2, DESK_Y + 0.12, 0.6)), { shrug: 6, ha: [1.9, null] }, ["point", "open"]), 0.2],                     // drags D to the top...
    [MEME_HUG, () => seat([364, 560], [236, 560], { shrug: 12, lean: 0.06 * sway, headTilt: 3 * sway, ha: [-0.5, Math.PI + 0.5] }, ["hug", "hug"]), 0.3], // ...and HUGS HIMSELF
  ]);
  // happy feet kick at the peak
  const kick = t > MEME_HUG ? smooth((t - MEME_HUG) / 0.3) : 0;
  const pose: Pose = kick > 0 ? { ...pose0, feet: [[268 - 10 * kick, FEET_RUNG[0][1] - 26 * kick * Math.max(0, Math.sin(t * 9))], [332 + 10 * kick, FEET_RUNG[1][1] - 26 * kick * Math.max(0, -Math.sin(t * 9))]] } : pose0;
  const meme = t >= MEME_T - LEAD;
  const e = faceAt(t, [[-9, "intrigued"], [W.study - 0.25, "focus"], [W.own - 0.3, "huh"], [MEME_T, "meme"]]);
  const k = meme ? q(Math.min(1.15, smooth((t - MEME_T) / 0.18) * (1 + 0.1 * Math.sin((t - MEME_T) * 9))), 20) : 1;
  return { who: "bean", pose: qPose(pose), face: { e, k, shake: frameNo(t) }, swaps: [W.study - 0.25, W.own - 0.3], A, sc: 1, phones: false };
};
// ---- the researcher (shot 4) ----
const researcher = (t: number): Rig => {
  const w = Math.sin(t * 11) * 3;
  const pose0 = segPose(t, [
    [-9, () => ({ feet: STAND, hands: [[250, 560], [334 + w, 556]], hk: ["grip", "grip"], hold: ["clipboard", "pen"], front: [true, true] } as Pose)],
    [C.without - 0.25, () => ({ feet: STAND, hands: [[250, 566], [308, 372]], hk: ["grip", "point"], hold: ["clipboard", null] as [Hold | null, Hold | null], front: [true, false], over: [false, true], ha: [null, UPA - 0.1], headTilt: -3 } as Pose), 0.3], // "shh..."
    [C.their - 0.1, () => ({ feet: STAND, hands: [[250, 560], [334, 548]], hk: ["grip", "grip"], hold: ["clipboard", "pen"], front: [true, true] } as Pose), 0.35],
    [W.higher - 0.1, () => ({ feet: STAND, hands: [[250, 560], [336 + 2 * w, 552 - Math.abs(w)]], hk: ["grip", "grip"], hold: ["clipboard", "pen"], front: [true, true] } as Pose), 0.3], // writes a big tick
  ]);
  const e = faceAt(t, [[-9, "watch"], [C.without - 0.2, "sly"], [C.their - 0.05, "watch"], [W.higher, "smug"]]);
  const look: P2 = e === "sly" ? [-1, 0.2] : [-0.8, 0.3];
  return { who: "researcher", pose: qPose(pose0), face: { e, look, shake: frameNo(t) }, swaps: [C.without - 0.2, C.their - 0.05, W.higher], A: RESEARCHER_AT, sc: 1.06, phones: false };
};
// ---- the crowd (shot 3) ----
const appear = (t: number, i: number) => { const t0 = CROWD_T0 + 0.13 * i; return t < t0 ? 0 : q(Math.min(1, env(t, t0, 99, 0.32, 0.1)), 50); };
/** the unison "yep" nod 0..1 (on twos), from just after each one lands */
const nodAt = (t: number, i: number) => {
  const tn = CROWD_T0 + 0.13 * i + 0.4, tq = Math.floor(t * 15) / 15;
  if (tq < tn) return 0;
  return q(0.5 - 0.5 * Math.cos(2 * Math.PI * 1.7 * (tq - tn) + 0.3 * i), 8);
};
const CROWD_FACE: Record<Exclude<CrowdId, "cat">, Face> = { mum: "aww", dad: "deadpan", friend: "grin", teacher: "stern", grandma: "sweet" };
const crowdPose = (id: Exclude<CrowdId, "cat">): Pose => {
  switch (id) {
    case "mum": return { feet: STAND, hands: [[226, 612], [360, 540]], hk: ["rest", "grip"], hold: [null, "mug"], front: [false, true] };
    case "dad": return { feet: [[256, 948], [344, 948]], hands: [[190, 596], [394, 470]], hk: ["fist", "grip"], hold: [null, "spatula"], front: [false, true] };
    case "friend": return { feet: STAND, hands: [[278, 560], [322, 564]], hk: ["grip", "grip"], hold: ["pad", null], front: [true, true] };
    case "teacher": return { feet: STAND, hands: [[230, 616], [384, 512]], hk: ["rest", "palm"], ha: [null, UPA - 0.2], hold: [null, "apple"], front: [false, true] };
    case "grandma": return { feet: STAND, hands: [[272, 596], [330, 598]], hk: ["grip", "grip"], hold: ["knit", null], front: [true, true] };
  }
};

// ---------------- frames / exported contracts ----------------
type Frame = { o: V3; c: number; s: number; yaw: number; sc: number; mirror: boolean };
const frameOf = (cp: { x: number; z: number }, A: V3, sc: number, mirror = false): Frame => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]);
  return { o: A, c: Math.cos(yaw), s: Math.sin(yaw), yaw, sc, mirror };
};
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  const lx = (P[0] - 300) * SU * F.sc * (F.mirror ? -1 : 1), ly = (975 - P[1]) * SU * F.sc;
  return [F.o[0] + F.c * lx + F.s * fwd, F.o[1] + ly, F.o[2] - F.s * lx + F.c * fwd];
};
const camPosAt = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, Math.round(t * FPS)))).pos; return { x: c[0], y: c[1], z: c[2] }; };
const camRightAt = (id: number, t: number) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, Math.round(t * FPS)))), fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2], n = Math.hypot(fx, fz) || 1;
  return { x: -fz / n, z: fx / n };
};
const NOWHERE: V3 = [0, -100, 0];
const personRig = (id: number, t: number, who: string): Rig | null => {
  if (who === "bean") return id === 1 ? bean1(t) : id === 3 ? bean3(t) : id === 4 ? bean4(t) : id === 5 ? bean5(t) : null;
  if (who === "researcher") return id === 4 ? researcher(t) : null;
  if (id === 3 && who in CROWD_AT && who !== "cat") {
    const c = CROWD_AT[who as CrowdId], k = appear(t, c.i);
    return { who: who as Who, pose: crowdPose(who as Exclude<CrowdId, "cat">), face: { e: CROWD_FACE[who as Exclude<CrowdId, "cat">], nod: nodAt(t, c.i) }, swaps: [], A: c.at, sc: c.sc * Math.max(0.001, k), phones: false };
  }
  return null;
};
const withPerson = (id: number, t: number, who: string, fn: (F: Frame, J: ReturnType<typeof jointsOf>, r: Rig) => V3): V3 => {
  const save = CP, cp = camPosAt(id, t);
  CP = cp;
  const r = personRig(id, t, who);
  CP = save;
  if (!r) return NOWHERE;
  return fn(frameOf(cp, r.A, r.sc), jointsOf(KITS[r.who], r.pose, r.face), r);
};

// ---- shot 2: the profile ----
/** BEAN mouthing words 0..1 (shot 2 from W.talk, shot 3 into the microphone): ~4.4 syllables/s with breaths */
export const talkAt = (id: number, t: number) => {
  let w = 0;
  if (id === 2) w = smooth((t - (W.talk - 0.12)) / 0.15) * (1 - smooth((t - (W.deeper + 0.5)) / 0.2));
  else if (id === 3) w = smooth((t - (W.microphone - 0.05)) / 0.12) * (1 - smooth((t - (W.part + 0.3)) / 0.15));
  if (w <= 0) return 0;
  const ph = t * 4.4 * Math.PI, breath = 0.5 + 0.5 * Math.cos(t * 2 * Math.PI / 1.9);
  return w * Math.pow(Math.abs(Math.sin(ph)), 0.7) * (0.55 + 0.45 * breath);
};
const profAt = (t: number): ProfS => {
  const defeated = t < C.when - 0.15, tk = talkAt(2, t);
  const tilt = defeated ? -9 : 3 + 2 * tk;
  const lid = defeated ? 0 : q(lidAt(t, 17, [C.when - 0.15]), 2);
  return { e: defeated ? "defeated" : "curious", talk: q(tk, 10), look: defeated ? 1 : q(-0.4 + 0.2 * Math.sin(t * 0.7), 10), lid, tilt: q(tilt, 4), shrug: defeated ? -8 : 0, drop: defeated ? 4 : q(1.5 * Math.sin(t * 2.2), 4) };
};
/** does the profile face screen-right from this camera? (BEAN looks along his own +z) */
const profMirror = (right: { x: number; z: number }) => right.z > 0;
/** world landmarks of the profile head (shot 2). dir: +1 face toward screen-right, -1 screen-left */
export const profPointsAt = (t: number) => {
  const cp = camPosAt(2, t), mir = profMirror(camRightAt(2, t)), F = frameOf(cp, BEAN_ROOM, 1, mir), s = profAt(t), X = profHeadXf(s);
  const w = (P: P2, fwd = 0.02) => toWorld(F, X(P), fwd);
  return {
    head: w(PROFILE.head, 0), eye: w(PROFILE.eye), mouth: w(PROFILE.mouth, 0.04), nose: w(PROFILE.nose, 0.04), ear: w(PROFILE.ear, 0.03), innerEar: w(PROFILE.innerEar, 0),
    jaw: w(PROFILE.jaw, 0), crown: w(PROFILE.crown, 0), chin: w(PROFILE.chin, 0.02), dir: mir ? 1 : -1, talk: s.talk,
  };
};

/** world head centre. BEAN ~Ro+(0,1.46,0) standing, ~La+(0,1.30,0.4) seated; researcher ~La+(1.2,1.55,-0.5) */
export const headAt = (id: number, t: number, who = "bean"): V3 => {
  if (id === 2 && who === "bean") return profPointsAt(t).head;
  if (who === "cat") return id === 3 ? toWorld(frameOf(camPosAt(3, t), CROWD_AT.cat.at, CAT_SC * Math.max(0.001, appear(t, 5))), CAT_HEAD, 0.02) : NOWHERE;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.head, 0.02));
};
export const mouthAt = (id: number, t: number, who = "bean"): V3 => {
  if (id === 2 && who === "bean") return profPointsAt(t).mouth;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.mouth, 0.05));
};
/** world ear: shot 2 the profile ear; otherwise side 0 = screen-left, 1 = screen-right ear */
export const earAt = (id: number, t: number, who = "bean", side: 0 | 1 = 1): V3 => {
  if (id === 2 && who === "bean") return profPointsAt(t).ear;
  return withPerson(id, t, who, (F, J) => toWorld(F, J.ears[side], 0));
};
/** world hand point: side 0 = screen-left, 1 = screen-right (BEAN's phone hand) */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => {
  if (id === 2 && who === "bean") { const cp = camPosAt(2, t), mir = profMirror(camRightAt(2, t)), s = profAt(t), sl = s.e === "defeated" ? 1 : 0; return toWorld(frameOf(cp, BEAN_ROOM, 1, mir), [280 + 10 * sl, 456 - s.shrug + s.drop + 176], 0.05); }
  return withPerson(id, t, who, (F, J) => toWorld(F, J.hands[side], 0.05));
};
// props: the headphones sit on BEAN's seated head (shot 4)
PROP_HOOKS.head = (id, t) => (id === 4 ? headAt(4, t) : undefined);
PROP_HOOKS.headR = HEAD_R;

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const tierOf = (cam: CamInfo, A: V3, sc: number, hy = 1.2) => tier(cam.pos.distanceTo(new THREE.Vector3(A[0], A[1] + hy * sc, A[2])) / Math.max(0.05, sc));
const QA1_KEYS = [30, 84, 139, 217, 271, 360, 459, 494, 584, 670, 719];
const IDX: Record<string, number> = { bean: 3, mum: 5, dad: 7, friend: 11, teacher: 13, grandma: 17, researcher: 19 };
const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo): Frame => {
  const F = frameOf(cam.pos, r.A, r.sc), [w, h, k] = tierOf(cam, r.A, r.sc), light = lightOf(cam);
  const fN = Math.round(t * FPS), onKey = r.who === "bean" && fN < 745 && QA1_KEYS.some((k) => Math.abs(fN - k) <= 2); // QA1: eyes open on key words
  const lid = r.face.e === "meme" || onKey ? 0 : q(lidAt(t, IDX[r.who] * 7, r.swaps), 2);
  const pose = r.pose, face = r.face, kit = KITS[r.who], ph = r.phones;
  out.places.push({
    key: `vo|${r.who}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}|${ph ? 1 : 0}`,
    draw: (p: Pen) => drawPerson(p, kit, pose, face, light, lid, ph),
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
/** keep a camera-facing card (centre P, size w x h) inside the frame: clear of the edges and the watermark band */
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number; whip?: boolean } | null = null;
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t))));
  const fwd = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  const fn = frameNo(t), whip = (id === 3 && fn > SHOTS[3].a - 16) || (id === 4 && fn < SHOTS[3].a + 6); // the 3->4 whip: let off-frame cards fly off with the world
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)), whip };
};
const fitS = (P: V3, w: number, h: number): [V3, number] => {
  if (!VIEW) return [P, 0];
  const v = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return [P, 0];
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.94 - w / 2, top = hy * 0.76 - h / 2, bot = -hy * 0.9 + h / 2;
  let nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  if (VIEW.whip) { const g = 1 - smooth((Math.abs(x) / hx - 0.9) / 0.25); nx = x + (nx - x) * g; ny = y + (ny - y) * g; } // whip: release the clamp as the card leaves the frame
  return [add(add(P, [VIEW.right.x, VIEW.right.y, VIEW.right.z], nx - x), [VIEW.up.x, VIEW.up.y, VIEW.up.z], ny - y), Math.hypot(nx - x, ny - y)];
};
const fit = (P: V3, w: number, h: number): V3 => fitS(P, w, h)[0];
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2, side = 1) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  const R: V3 = VIEW ? [VIEW.right.x, VIEW.right.y, VIEW.right.z] : [1, 0, 0];
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), fit(add([P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], R, side * size * 1.1), size, size * 1.33), size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
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
/** motion arcs either side of a head */
const motion = (out: Stage, t: number, t0: number, head: V3, cam: CamInfo, r: number, size = 0.26, dur = 0.45) => {
  const m = env(t, t0, t0 + dur, 0.05, 0.25);
  if (m < 0.02) return;
  const { R, U, N } = camVecs(cam, head), fj = frameNo(t) % 2;
  for (const sd of [-1, 1]) fxCard(out, "motion", 256, 256, fxMotion, at3(head, R, U, N, sd * (r + 0.06 + 0.012 * fj), 0.03, 0.1), size * m, size * m, { rot: sd > 0 ? -0.15 : Math.PI + 0.15 });
};
const HEART_COLS = ["#ff3d6e", "#ff7ab0", "#ff5a8a", "#ff9ac8"];
/** hearts floating up and away from C, looping (n hearts, seeded); g = envelope */
const floatHearts = (out: Stage, t: number, t0: number, C: V3, cam: CamInfo, n: number, seed: number, size: number, spread: number, g = 1) => {
  if (t < t0 || g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const life = 1.5, ph = ((t - t0) / life + hh(seed, j)) % 1, born = t - ph * life;
    if (born < t0 - 0.01) continue;
    const s = size * (0.6 + 0.6 * hh(seed, j + 7)) * Math.sin(Math.PI * Math.min(1, ph * 1.15)) * g;
    const side = j % 2 ? 1 : -1, x = side * (spread * (0.35 + 0.65 * hh(seed, j + 3))) + 0.05 * Math.sin(ph * 9 + j), y = -0.05 + ph * 0.55;
    const col = HEART_COLS[j % 4];
    fxCard(out, `heart|${col}`, 256, 256, (p) => fxHeart(p, col), at3(C, R, U, N, x, y, 0.2 + 0.02 * j), s, s, { rot: 0.25 * Math.sin(ph * 6 + j) });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  CP = { x: cam.pos.x, y: cam.pos.y, z: cam.pos.z };
  if (id === 2) { // ---- the X-ray: BEAN in profile ----
    const mir = profMirror({ x: cam.right.x, z: cam.right.z }), s = profAt(t), F = frameOf(cam.pos, BEAN_ROOM, 1, mir), [w, h, k] = tierOf(cam, BEAN_ROOM, 1);
    const lt0 = lightOf(cam), lt = mir ? q(Math.PI - lt0, 10) : lt0;
    out.places.push({ key: `vo|prof|${fkey(s)}|${q(lt, 10)}`, draw: (p) => drawProfile(p, KITS.bean, s, lt), x: F.o[0], y: F.o[1], z: F.o[2], yaw: F.yaw, mirror: mir, scale: 1, size: [w, h, k] });
    blob(out, BEAN_ROOM[0], BEAN_ROOM[1] + 0.012, BEAN_ROOM[2], 1, 1);
    const P = profPointsAt(t), top = add(P.crown, [0, 0.18, 0]);
    mark(out, t, W.twice - 0.1, W.air - 0.35, top, "?", 0.15, -P.dir);
    return out;
  }
  if (id === 3) { // ---- the crowd ----
    for (const who of ["mum", "dad", "friend", "teacher", "grandma"] as const) {
      const c = CROWD_AT[who], kk = appear(t, c.i);
      if (kk <= 0.01) continue;
      const r = personRig(3, t, who)!;
      // pupils toward BEAN
      const dx = (BEAN_ROOM[0] - c.at[0]) * cam.right.x + (BEAN_ROOM[2] - c.at[2]) * cam.right.z;
      r.face = { ...r.face, look: [dx > 0 ? 0.85 : -0.85, 0.15] };
      const F = drawRig(out, r, t, cam), J = jointsOf(KITS[who], r.pose, r.face);
      blob(out, c.at[0], c.at[1] + 0.012, c.at[2], c.sc * kk, kk);
      const head = toWorld(F, J.head, 0.03), hr = HEAD_R * c.sc;
      // YEP bubble: springs in after the landing, beside-up of the head toward the outside
      const tb = yepT(c.i), yk = env(t, tb, tb + YEP_HOLD, 0.18, 0.2);
      if (yk > 0.02) {
        const side = dx > 0 ? -1 : 1, bw = 0.4 * c.sc, bh = bw * 0.625, { R, U, N } = camVecs(cam, head);
        const P = fit(at3(head, R, U, N, c.bub[0], c.bub[1], 0.12), bw, bh);
        fxCard(out, `yep|${who}`, 512, 320, (p) => fxYep(p, c.word, c.col, -Math.sign(c.bub[0]) * 0.7, c.i), P, bw * yk, bh * yk, { rot: side * -0.05 });
      }
      // nod ticks at the bottom of each nod
      const nd = nodAt(t, c.i);
      if (nd > 0.75) { const { R, U, N } = camVecs(cam, head); fxCard(out, "nod", 256, 128, fxNod, at3(head, R, U, N, 0, -hr * 1.08, 0.1), hr * 1.1, hr * 0.55); }
    }
    { // the cat
      const c = CROWD_AT.cat, kk = appear(t, c.i);
      if (kk > 0.01) {
        const sc = c.sc * kk, F = frameOf(cam.pos, c.at, sc), [w, h, k] = tierOf(cam, c.at, sc, 1.2), lt = lightOf(cam);
        const cs: CatS = { nod: nodAt(t, c.i), lid: 0.55, tail: q(Math.sin(t * 2.3), 10), blink: lidAt(t, 91, []) >= 1 ? 1 : 0 };
        out.places.push({ key: `vo|cat|${fkey(cs)}|${q(lt, 10)}`, draw: (p) => drawCat(p, cs, lt), x: c.at[0], y: c.at[1], z: c.at[2], yaw: F.yaw, scale: sc, size: [w, h, k] });
        blob(out, c.at[0], c.at[1] + 0.012, c.at[2], 0.8 * kk, kk);
        const head = toWorld(F, CAT_HEAD, 0.02), tb = yepT(c.i), yk = env(t, tb, tb + YEP_HOLD, 0.18, 0.2);
        if (yk > 0.02) { const { R, U, N } = camVecs(cam, head), bw = 0.28, bh = bw * 0.625; fxCard(out, "yep|cat", 512, 320, (p) => fxYep(p, c.word, c.col, -0.8, 7), fit(at3(head, R, U, N, c.bub[0], c.bub[1], 0.12), bw, bh), bw * yk, bh * yk, { rot: 0.05 }); }
      }
    }
  }
  if (id === 4) { // ---- the researcher ----
    const r = researcher(t), F = drawRig(out, r, t, cam), J = jointsOf(KITS.researcher, r.pose, r.face);
    blob(out, RESEARCHER_AT[0], RESEARCHER_AT[1] + 0.012, RESEARCHER_AT[2], r.sc, 1);
    const head = toWorld(F, J.head, 0.03), { R, U, N } = camVecs(cam, head);
    const gl = env(t, C.without + 0.05, C.without + 0.4, 0.08, 0.2); // a glint off the cat-eye glasses
    if (gl > 0.02) fxCard(out, "spark|#ffffff", 256, 256, (p) => fxSparkle(p, "#ffffff"), toWorld(F, J.eyes[1], 0.08), 0.12 * gl, 0.12 * gl, { rot: t * 2 });
    void R; void U; void N;
  }
  // ---- BEAN (shots 1, 3, 4, 5) ----
  const r = id === 1 ? bean1(t) : id === 3 ? bean3(t) : id === 4 ? bean4(t) : bean5(t);
  const F = drawRig(out, r, t, cam), J = jointsOf(KITS.bean, r.pose, r.face), w3 = (P: P2, fwd = 0.04) => toWorld(F, P, fwd);
  if (id !== 4) { const lift = r.A[1] - BEAN_ROOM[1]; blob(out, BEAN_ROOM[0], BEAN_ROOM[1] + 0.012, BEAN_ROOM[2], 1, 1 - 0.5 * clamp01(lift / 0.05)); }
  const head = w3(J.head, 0.03), top = add(head, [0, 0.42, 0]);
  if (id === 1) {
    mark(out, t, W.recordings - 0.05, W.bad - 0.35, top, "!", 0.19);
    motion(out, t, W.recordings - 0.1, head, cam, HEAD_R, 0.26);
    sweatDrip(out, t, W.bad, SHOTS[0].b / FPS + 0.5, w3([392, 236], 0.06), cam, 1.5, 0.15, 0.045);
  } else if (id === 3) {
    sweatDrip(out, t, W.weird, W.life - 0.15, w3([392, 236], 0.06), cam, 1.6, 0.15, 0.045);
    mark(out, t, W.life - 0.08, 99, top, "!", 0.21, -1);
    motion(out, t, W.life - 0.12, head, cam, HEAD_R, 0.3, 0.6);
  } else if (id === 4) {
    mark(out, t, W.own - 0.1, MEME_T - 0.2, top, "?", 0.16);
    if (t >= MEME_T - LEAD) { // THE PEAK: a heart halo behind his head, hearts streaming up, sparkles
      const { R, U, N } = camVecs(cam, head), hk = env(t, MEME_T - LEAD, 99, 0.25, 0.3), pulse = 1 + 0.06 * Math.sin((t - MEME_T) * 9);
      fxCard(out, "halo", 512, 512, fxHeartHalo, at3(head, R, U, N, 0, 0.04, -0.3), 1.05 * hk * pulse, 1.05 * hk * pulse, { rot: (t - MEME_T) * 0.4 });
      fxCard(out, "heart|#ff3d7f", 256, 256, (p) => fxHeart(p, "#ff3d7f"), at3(head, R, U, N, -0.03, 0.06, -0.22), 1.28 * hk * pulse, 1.28 * hk * pulse); // the big upright heart his head sits in
      floatHearts(out, t, MEME_T, add(head, [0, -0.12, 0]), cam, 9, 61, 0.13, 0.42, hk);
      sparkles(out, t, MEME_T + 0.1, 99, head, cam, 0.45, 7, 67, 0.09);
    }
  } else if (id === 5) {
    sparkles(out, t, W.recognize - 0.2, 99, head, cam, 0.4, 5, 71, 0.07);
    floatHearts(out, t, W.recognize - 0.1, add(head, [0, 0.05, 0]), cam, 3, 73, 0.07, 0.3, env(t, W.recognize - 0.1, 99, 0.4));
  }
  return out;
};
