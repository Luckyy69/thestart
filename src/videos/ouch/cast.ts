// OWNER: cast agent. Every character card and effect card per shot for "Why We Say Ow".
// Characters are our own standing bean-head drawings (fx.ts drawGuy) on bridge Actor cards. Card origin = the point
// between the feet ON the ground (canvas 300, 975); cards yaw to the camera and roll about their normal (the lean of
// BEAN's faint, and "up" on the tiny planet). Everything is a pure function of (id, t) keyed off story.ts W cues.
// CONTRACTS (world, metres):
//   HOME   BEAN card origin HOME+(stubAt.x, 0, 0.1) (shots 1 + 8); shot 2 frozen at HOME+(0,0,0.1) in the faint pose.
//          His STUBBED toe is the screen-right foot: at the hit it touches the table leg at ~HOME+(0.31,0.04,0.1).
//          Mug = his screen-left hand: handAt(id,t,"bean",0). Toe: toeAt(id,t). Brain/head: headAt(id,t,"bean").
//   GLOBE  each person at globe.ts STAND[key].pos, card rolled to STAND.up, 0.75 scale (~1.3 m), shaded by globeSun;
//          the stubbed (screen-right) toe swings ~0.3 m east into STAND.stub at C.t - 0.28.
//   LAB    volunteer A (OW sayer / FOUCH) LAB+(-0.85,0,-0.34), volunteer B (headphones, THE SWEARER / sailor)
//          LAB+(0.85,0,-0.34); their in-ice hand reaches TUB x at y 0.85, z -0.34 (keep tub/table back faces z > -0.26).
//          Scientist 1 LAB+(0,0,-0.78) (shots 4-5). Scientist 2 walks in LAB+(2.0 -> 1.3, 0, -0.95) in shot 5, stays there
//          in shot 6, stands at LAB+(0,0,-0.78) in shot 7. Clipboard = handAt(id,t,"sci1"|"sci2",1).
//   The CENSOR BAR + grawlix are drawn HERE (cast), glued to mouthAt (props: do not draw a second bar).
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, HOME, LAB, TUB_A, TUB_B, SHOTS, V3, smooth, clamp01, stubAt, STUB1, STUB8, COUNTRIES, labAt, BEEPS, signalAt, shotStart, camAt } from "./story";
import { hopAt, HOOKS, XrayPose } from "./props";
import { STAND as GSTAND, globeSun } from "./globe";
import {
  Kit, Pose, FaceS, Face, P2, LAYOUT, MOUTH_DY, drawGuy, fxBurst, fxBubble, fxCensor, fxGrawlix, fxShiver, fxPuff, fxSteam, fxTear, fxSweat, fxStar, fxMark,
  fxThrob, fxTinyOw,
} from "./fx";

export type CastId = "bean" | "uk" | "fr" | "es" | "dk" | "volA" | "volB" | "sci1" | "sci2" | "fouch" | "sailor";
const on = (t: number, w: number) => t >= w - LEAD;
const spring = (t: number, w: number, dur = 0.3) => { const u = clamp01((t - (w - LEAD)) / dur); return smooth(u) * (1 + 0.18 * Math.sin(u * Math.PI)); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 20) : v));
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };
const qp = (P: P2): P2 => [q(P[0], 0.5), q(P[1], 0.5)];

// ---------------- the cast ----------------
const KITS: Record<CastId, Kit> = {
  bean: { seed: 3, skin: "#ffe2c2", hair: "#5a3b2a", style: "bed", top: "pj", shirt: "#4f7fd8", stripe: "#dbe8ff", pants: "#4f7fd8", shoes: "#c78a5a", slippers: true },
  uk: { seed: 5, skin: "#f5c9a0", hair: "#8a5a3a", style: "crop", top: "polo", shirt: "#2f55a8", pants: "#6b6455", shoes: "#4a3020", hat: "flatcap", hatCol: "#8a7656", moustache: "#7a4a2a" },
  fr: { seed: 2, skin: "#ffe2c2", hair: "#2a2028", style: "crop", top: "breton", shirt: "#f6f4ee", stripe: "#1d2a5c", pants: "#2c2c3c", shoes: "#2a2028", hat: "beret", hatCol: "#26222e", moustache: "#2a2028", scarf: "#d8323a" },
  es: { seed: 6, skin: "#ecc29a", hair: "#2a1a14", style: "bun", top: "tee", shirt: "#e0383a", pants: "#2a2a36", shoes: "#2a1a14", hat: "flower", hatCol: "#ff4a6a", earring: true },
  dk: { seed: 4, skin: "#ffe6d0", hair: "#f2d36a", style: "swoop", top: "sweater", shirt: "#27407a", stripe: "#f2f4f8", pants: "#5a6a80", shoes: "#4a3a2a", hat: "beanie", hatCol: "#d8323a", scarf2: "#ffffff", brows: "#c9a640" },
  volA: { seed: 7, skin: "#ffe2c2", hair: "#3a2a22", style: "flop", top: "tee", shirt: "#2fa6a0", pants: "#4a5a78", shoes: "#2a2a36" },
  volB: { seed: 8, skin: "#f5c9a0", hair: "#5a3020", style: "tuft", top: "hoodie", shirt: "#f08a2c", pants: "#3b3f52", shoes: "#2a2a36" },
  sci1: { seed: 9, skin: "#f3d2ae", hair: "#1c1820", style: "bob", top: "shirt", shirt: "#9bc3e8", pants: "#3b3f52", shoes: "#2a2028", coat: true, glasses: "square" },
  sci2: { seed: 11, skin: "#f5c9a0", hair: "#d8d8dc", style: "bald", top: "shirt", shirt: "#c9a0d8", pants: "#4a4a58", shoes: "#2a2028", coat: true, glasses: "round", moustache: "#d8d8dc", brows: "#a8a8b0" },
  fouch: { seed: 12, skin: "#ffe2c2", hair: "#d8742a", style: "curly", top: "tee", shirt: "#7cc95a", pants: "#4a5a78", shoes: "#2a2a36", glasses: "round" },
  sailor: { seed: 13, skin: "#eec0a0", hair: "#9a9aa2", style: "crop", top: "stripes", shirt: "#f4f2ea", stripe: "#1d2a5c", pants: "#1d2236", shoes: "#141826", hat: "captain", beard: "#b8b8c0", anchor: true, brows: "#7a7a82" },
};
const IDX: Record<CastId, number> = { bean: 1, uk: 10, fr: 11, es: 12, dk: 13, volA: 20, volB: 21, sci1: 30, sci2: 31, fouch: 22, sailor: 23 };

// ---------------- standing poses (canvas units) ----------------
const STAND: [P2, P2] = [[262, 950], [338, 950]];
const SIDES: [P2, P2] = [[206, 566], [394, 566]];
const TOE_HIT: P2 = [444, 948];
const RAISED: P2 = [392, 772];

// ---------------- frames ----------------
type Rig = { who: CastId; kit: Kit; pose: Pose; face: FaceS; swaps: number[]; A: V3; roll: number; sc: number; up?: V3; shake?: number };
type Frame = { o: V3; c: number; s: number; yaw: number; roll: number; sc: number };
const camPosOf = (id: number, t: number) => { const c = camAtSafe(id, t); return new THREE.Vector3(c[0], c[1], c[2]); };
const camAtSafe = (id: number, t: number): V3 => camAt(id, Math.max(SHOTS[id - 1].a, Math.min(SHOTS[id - 1].b, t * FPS))).pos;
const frameOf = (camPos: { x: number; z: number; y: number }, r: Rig): Frame => {
  const yaw = Math.atan2(camPos.x - r.A[0], camPos.z - r.A[2]), c = Math.cos(yaw), s = Math.sin(yaw);
  let roll = r.roll;
  if (r.up) { // align the card's up with the surface normal (tiny planet)
    const n = r.up, nr = n[0] * c - n[2] * s;
    roll += Math.atan2(-nr, n[1]);
  }
  return { o: r.A, c, s, yaw, roll, sc: r.sc };
};
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  const lx = (P[0] - 300) * SU * F.sc, ly = (975 - P[1]) * SU * F.sc, cr = Math.cos(F.roll), sr = Math.sin(F.roll);
  const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
  return [F.o[0] + F.c * rx + F.s * fwd, F.o[1] + ry, F.o[2] - F.s * rx + F.c * fwd];
};
/** canvas helpers matching drawGuy's rig */
const rotHip = (P: P2, a: number): P2 => { const c = Math.cos(a), s = Math.sin(a), dx = P[0] - 300, dy = P[1] - LAYOUT.hipY; return [300 + dx * c - dy * s, LAYOUT.hipY + dx * s + dy * c]; };
const handCanvas = (pose: Pose, side: 0 | 1): P2 => {
  const lean = pose.lean ?? 0, S = rotHip(LAYOUT.sh[side], lean), H = pose.hands[side];
  const d = Math.hypot(H[0] - S[0], H[1] - S[1]), m = Math.min(1, 182 / (d || 1));
  return [S[0] + (H[0] - S[0]) * m, S[1] + (H[1] - S[1]) * m - (pose.lift ?? 0)];
};
const HEAD_U = 2.36;
const headCanvas = (r: Rig, dy = 0): P2 => {
  const lean = r.pose.lean ?? 0, tilt = ((r.pose.headTilt ?? 0) + (TILTS[r.face.e] ?? 0)) * Math.PI / 180, hc = rotHip([300, LAYOUT.hc], lean), a = lean + tilt;
  return [hc[0] - Math.sin(a) * dy, hc[1] + Math.cos(a) * dy - (r.pose.lift ?? 0)];
};
const TILTS: Partial<Record<Face, number>> = { sleepy: 4, drama: -10, peek: -8, relief: -4, defeated: 6 };
const mouthCanvas = (r: Rig): P2 => headCanvas(r, (MOUTH_DY + 4) * HEAD_U * (r.face.e === "meme" ? 1 + 0.14 * (r.face.k ?? 1) : 1)); // meme: drawGuy grows the head 14%
const toeCanvas = (pose: Pose): P2 => { const F = pose.feet[1]; const raised = F[1] < 900; return [F[0] + (raised ? 42 : 46), F[1] + (raised ? 4 : 18) - (pose.lift ?? 0)]; };

// ---------------- BEAN ----------------
const sinc = (x: number) => Math.abs(Math.sin(x));
/** the hop after a stub: standing foot planted, stubbed foot held up in the screen-right hand */
const hopPose = (since: number, mugHand: P2, amp = 46, period = 0.36): Pose => {
  const k = smooth(since / 0.14), hop = since > 0.14 ? amp * sinc((Math.PI * (since - 0.14)) / period) : 0;
  return {
    feet: [lerp2(STAND[0], [292, 950], k), lerp2(TOE_HIT, RAISED, k)], hands: [mugHand, lerp2(SIDES[1], [404, 760], k)], front: [false, true],
    lift: q(hop, 0.5), toe: 1, throb: q(0.5 + 0.5 * Math.sin(since * 14), 4), sy: since < 0.12 ? q(1 - 0.06 * Math.sin((since / 0.12) * Math.PI), 50) : 1,
  };
};
const walkPose = (dist: number, mugHand: P2): Pose => {
  const ph = (dist / 0.32) * Math.PI, s = Math.sin(ph);
  return { feet: [[272 - 18 * s, 950 - 26 * Math.max(0, s)], [328 + 18 * s, 950 - 26 * Math.max(0, -s)]], hands: [mugHand, [394 - 14 * s, 560]], lift: q(8 * Math.abs(Math.cos(ph)), 0.5) };
};
const MUG_CHEST: P2 = [212, 470], MUG_SIP: P2 = [262, 372], FOREHEAD: P2 = [166, 214];
/** the Oscar-worthy faint: arched back, mug hand to the brow, stubbed foot clutched, on tiptoe */
const BROW: P2 = [128, 236], FLUNG: P2 = [548, 300];
const faintPose = (k: number, since: number): Pose => { // QA1: Oscar swoon: mug hand to the brow, the free arm flung out wide, foot kicked up
  const h = hopPose(Math.max(since, 0.5), MUG_CHEST, 46 * (1 - k));
  return { ...h, feet: [h.feet[0], lerp2(RAISED, [452, 742], k)], hands: [lerp2(MUG_CHEST, BROW, k), lerp2([404, 760], FLUNG, k)], front: [true, true], open: [false, true], lean: q(-0.27 * k, 50), lift: q(16 * k, 0.5), headTilt: -8 * k };
};
const FAINT_AT = W.dramatic - 0.6; // lands on "dramatic" (props hopAt fades out by dramatic - 0.35)
const bean1 = (t: number): Rig => {
  const st = stubAt(1, t), since = t - STUB1;
  let pose: Pose, roll = 0;
  if (since < 0) {
    const pw = walkPose(st.x + 0.7, MUG_CHEST), k = smooth((since + 0.22) / 0.22);
    pose = { ...pw, feet: [lerp2(pw.feet[0], [262, 950], k), lerp2(pw.feet[1], TOE_HIT, k)], lift: q((pw.lift ?? 0) * (1 - k), 0.5) };
  } else if (t < FAINT_AT) pose = { ...hopPose(since, lerp2(MUG_CHEST, [150, 380], smooth(since / 0.25))), lift: 0 }; // the hop itself = props hopAt (card y)
  else {
    const k = smooth((t - FAINT_AT) / 0.55);
    pose = faintPose(k, since);
    if (k < 1) pose.hands[0] = lerp2([150, 380], BROW, k);
    roll = 0.12 * k + 0.025 * Math.sin((t - FAINT_AT) * 3.2) * k;
  }
  const e = faceAt(t, [[-9, "sip"], [STUB1, "shock"], [STUB1 + 0.22, "pain"], [W.ow0, "ow"], [W.brain0, "pain"], [FAINT_AT, "drama"], [W.dramatic + 0.45, "peek"]]);
  return { who: "bean", kit: KITS.bean, pose, face: { e, k: e === "ow" ? q(spring(t, W.ow0, 0.25), 10) : 1, shake: Math.floor(t * 15) % 3 }, swaps: [W.ow0, FAINT_AT], A: [HOME[0] + st.x, hopAt(1, t), HOME[2]], roll: q(roll, 200), sc: 1 };
};
const T_FREEZE = SHOTS[0].b / FPS - 0.001;
const bean2 = (t: number): Rig => {
  const r = bean1(T_FREEZE), sg = signalAt(2, t);
  const e: Face = on(t, W.owA) ? "relief" : sg.mouth > 0.02 ? "ow" : "peek";
  return { ...r, face: { e, k: e === "ow" ? q(sg.mouth, 10) : 1 }, swaps: [W.owA] };
};
const bean8 = (t: number): Rig => {
  const st = stubAt(8, t), since = t - STUB8, beep = BEEPS.find((b) => b[1] === "bean")![0];
  let pose: Pose;
  if (since < 0) {
    const sip = smooth((t - (STUB8 - 1.25)) / 0.25) * (1 - smooth((t - (STUB8 - 0.6)) / 0.25));
    const pw = walkPose(st.x + 1.2, lerp2(MUG_CHEST, MUG_SIP, sip)), k = smooth((since + 0.22) / 0.22);
    pose = { ...pw, feet: [lerp2(pw.feet[0], [262, 950], k), lerp2(pw.feet[1], TOE_HIT, k)], lift: q((pw.lift ?? 0) * (1 - k), 0.5) };
  } else pose = hopPose(since, lerp2(MUG_CHEST, [138, 440], smooth(since / 0.2)), 26, 0.42);
  const e = faceAt(t, [[-9, "content"], [STUB8 - 1.25, "sip"], [STUB8 - 0.6, "content"], [STUB8, "shock"], [STUB8 + 0.06, "rage"], [beep, "swear"]]);
  return { who: "bean", kit: KITS.bean, pose, face: { e, k: e === "rage" ? q(spring(t, STUB8 + 0.06, 0.1), 10) : 1, shake: Math.floor(t * 15) % 3 }, swaps: [STUB8 - 1.25, STUB8], A: [HOME[0] + st.x, 0, HOME[2]], roll: 0, sc: 1 };
};

// ---------------- the tiny planet ----------------
/** shot 3: people stand at globe.ts STAND[key] (pos, up = outward normal; stub 0.28 m to their east), cards at 0.75 scale
 *  (~1.3 m tall, houses are 2-2.6 m), rolled so card-up follows the normal, shaded by globeSun */
const PLANET_SC = 0.75;
const IDLE_HANDS: Record<string, [P2, P2]> = { uk: [[214, 592], [386, 592]], fr: [[206, 566], [394, 566]], es: [[214, 592], [386, 592]], dk: [[230, 540], [370, 540]] };
const planetRig = (i: number, t: number): Rig => {
  const C = COUNTRIES[i], who = C.key as CastId, hit = C.t - 0.28, since = t - hit, sp = GSTAND[C.key];
  let pose: Pose;
  if (since < -0.4) { const sw = Math.sin(t * 2.2 + i); pose = { feet: STAND, hands: IDLE_HANDS[C.key], lift: 0, headTilt: q(3 * sw, 2) }; }
  else if (since < 0) { const k = smooth((since + 0.4) / 0.4); pose = { feet: [lerp2(STAND[0], [262, 950], k), lerp2(STAND[1], TOE_HIT, k)], hands: IDLE_HANDS[C.key], lift: q(10 * Math.sin(k * Math.PI), 0.5) }; }
  else { const calm = smooth((since - 1.9) / 0.6); pose = hopPose(since, lerp2([150, 400], [206, 566], calm), 42 * (1 - calm), 0.34 + 0.03 * i); }
  const e = faceAt(t, [[-9, i % 2 ? "content" : "smile"], [hit, "shock"], [C.t, "ow"], [C.t + 1.5, "pain"]]);
  return { who, kit: KITS[who], pose, face: { e, k: e === "ow" ? q(spring(t, C.t, 0.25), 10) : 1 }, swaps: [hit, C.t + 1.5], A: sp.pos, roll: 0, sc: PLANET_SC, up: sp.up };
};

// ---------------- the lab ----------------
const VOL_A: V3 = [LAB[0] - 0.85, 0, LAB[2] - 0.34], VOL_B: V3 = [LAB[0] + 0.85, 0, LAB[2] - 0.34], SCI_C: V3 = [LAB[0], 0, LAB[2] - 0.78];
const ICE_Y = 0.79; // QA2: the card sits behind the tub back wall, so the hand must sit lower to read as dunked under the 0.86 surface
const iceHand = (vol: V3, tub: V3): P2 => [300 + (tub[0] - vol[0]) / SU, 975 - ICE_Y / SU];
const shiverX = (t: number, i: number, k: number) => k * 0.007 * (Math.floor(t * 30 + i) % 2 ? 1 : -1);
const volunteer = (id: number, t: number, who: "volA" | "volB" | "fouch" | "sailor"): Rig => {
  const L = labAt(id, t), isA = who === "volA" || who === "fouch", base = isA ? VOL_A : VOL_B, tub = isA ? TUB_A : TUB_B;
  const ice = iceHand(base, tub), inK = id === 4 ? L.inIce : 1;
  let iceK = inK, free: P2 = isA ? [206, 566] : [394, 566], e: Face = "worried", k = 1, look = 0, swaps: number[] = [];
  if (who === "volA") {
    if (id === 4) { e = faceAt(t, [[-9, "worried"], [W.ice, "cold"], [W.ow2, "ow"], [W.twenty, "proud"], [W.hearing, "cold"], [W.yourself, "proud"]]); swaps = [W.ice, W.ow2, W.twenty, W.hearing, W.yourself]; if (e === "ow") k = q(spring(t, W.ow2, 0.25), 10); }
    else { e = "cold"; look = id === 5 || id === 6 ? 1 : 0; if (id === 5 && !on(t, W.another)) { e = "proud"; look = 0; } swaps = id === 5 ? [W.another] : []; } // QA2: match shot 4's end pose through the 4->5 dissolve
  } else if (who === "volB") {
    if (id === 4) {
      e = faceAt(t, [[-9, "worried"], [W.ice, "cold"], [W.hearing, "deadpan"], [W.yourself, "defeated"]]); swaps = [W.ice, W.hearing, W.yourself]; // QA2: deadpan holds through "Didn't help"
      const out = smooth((t - (W.didnt - LEAD)) / 0.3); iceK = inK * (1 - out); if (out > 0) free = lerp2(free, [404, 360], out);
    } else if (id === 5) { e = "strain"; k = q(0.4 + 0.6 * smooth((t - W.another) / (W.swearing - W.another)), 10); }
    else { e = faceAt(t, [[-9, "strain"], [W.swearing, "meme"], [W.third - 0.25, "memeAfter"]]); swaps = [W.third - 0.25]; if (e === "meme") k = q(Math.min(1.1, spring(t, W.swearing, 0.18)), 20); }
  } else if (who === "fouch") {
    e = faceAt(t, [[-9, "cold"], [W.madeup, "intense"], [W.words, "fouch"], [W.work, "defeated"]]); swaps = [W.madeup, W.work];
    if (e === "fouch") k = q(spring(t, W.words, 0.2), 10);
    if (on(t, W.words) && !on(t, W.work)) free = [150, 330];
  } else {
    e = faceAt(t, [[-9, "bored"], [W.allday, "mutter"], [W.less2, "bored"], [W.boost, "grumpy"]]); swaps = [W.allday, W.less2];
  }
  const handIn = lerp2(free, ice, iceK), hands: [P2, P2] = isA ? [free, handIn] : [handIn, free];
  const cold = iceK > 0.3 || e === "defeated";
  const A: V3 = [base[0] + shiverX(t, IDX[who], cold && e !== "meme" && who !== "sailor" ? 1 : 0), 0, base[2]];
  return { who, kit: KITS[who], pose: { feet: STAND, hands: [qp(hands[0]), qp(hands[1])], front: isA ? [false, true] : [true, false], blue: q(Math.max(iceK, e === "defeated" || (id === 4 && e === "deadpan") ? 1 : 0), 10) }, face: { e, k, look, shake: Math.floor(t * 15) % 6 }, swaps, A, roll: 0, sc: 1, shake: e === "meme" ? 1 : 0 };
};
const sci1 = (id: number, t: number): Rig => {
  let e: Face = "smile", hands: [P2, P2] = [[214, 592], [386, 592]], look = 0, swaps: number[] = [];
  if (id === 4) {
    e = faceAt(t, [[-9, "smile"], [W.mean, "evil"], [W.hold, "smile"], [W.could, "sly"], [W.ow2, "wow"], [W.hearing, "look"], [W.didnt, "grumpy"], [W.yourself, "point"]]);
    swaps = [W.mean, W.hold, W.could, W.ow2, W.hearing, W.didnt, W.yourself];
    const CLIP: P2 = [372, 520], r = Math.sin(t * 16) * 10; // screen-right hand always holds the clipboard (props)
    hands = [[214, 592], CLIP];
    if (on(t, W.singapore) && !on(t, W.mean)) hands = [[176, 330], CLIP]; // a little wave hello
    if (on(t, W.mean) && !on(t, W.hold)) hands = [[322 + r, 512 - r * 0.4], CLIP]; // sly rub against the clipboard
    if (on(t, W.hold) && !on(t, W.could)) hands = [[150, 580], CLIP];
    if (on(t, W.yourself)) hands = [[132, 470], CLIP];
    if (e === "look") look = 1;
    if (e === "wow") look = -1;
  } else { e = faceAt(t, [[-9, "look"], [W.stronger, "wow"]]); look = 1; hands = [[214, 592], [372, 520]]; if (id === 5 && !on(t, W.another)) { e = "point"; look = 0; hands = [[132, 470], [372, 520]]; } swaps = [W.another, W.stronger]; } // QA2: no double-exposure in the 4->5 dissolve
  return { who: "sci1", kit: KITS.sci1, pose: { feet: STAND, hands, front: [true, true], open: [on(t, W.yourself) && (id === 4 || (id === 5 && !on(t, W.another))), false] }, face: { e, look }, swaps, A: SCI_C, roll: 0, sc: 1 };
};
const SCI2_IN: V3 = [LAB[0] + 2.0, 0, LAB[2] - 0.95], SCI2_AT: V3 = [LAB[0] + 1.3, 0, LAB[2] - 0.95];
const sci2 = (id: number, t: number): Rig => {
  let A = SCI2_AT, e: Face = "serious", hands: [P2, P2] = [[214, 592], [372, 520]], feet = STAND, look = 0;
  if (id === 5) {
    const u = smooth((t - (W.another - 0.05)) / 1.1); // QA2: walk in while the camera pans to him, arrive before "stronger" A = [lerp(SCI2_IN[0], SCI2_AT[0], u), 0, SCI2_AT[2]];
    if (u > 0 && u < 1) { const s = Math.sin(u * Math.PI * 4); feet = [[272 - 18 * s, 950 - 22 * Math.max(0, s)], [328 + 18 * s, 950 - 22 * Math.max(0, -s)]]; }
    e = faceAt(t, [[-9, "serious"], [W.stronger, "intense"]]);
    if (on(t, W.stronger)) hands = [[214, 592], [404, 300]];
    look = -1;
  } else if (id === 6) { e = faceAt(t, [[-9, "intense"], [W.swearing, "shock"], [W.third, "wow"]]); look = -1; }
  else { A = SCI_C; e = faceAt(t, [[-9, "serious"], [W.didnt2, "grumpy"], [W.allday, "sly"]]); look = on(t, W.allday) ? 1 : -1; }
  return { who: "sci2", kit: KITS.sci2, pose: { feet, hands, front: [true, true], open: [false, id === 5 && on(t, W.stronger)] }, face: { e, look }, swaps: [W.stronger, W.swearing, W.didnt2, W.allday], A, roll: 0, sc: 1 };
};

const DEBUG_SC = 0; // TEMP: shrink cards to see whole figures with the first-pass cameras (set to 0 before shipping)
const rigsAt = (id: number, t: number): Rig[] => {
  const rs = rigsAt0(id, t);
  if (DEBUG_SC && id !== 3) {
    const c = camAt(id, Math.max(SHOTS[id - 1].a, Math.min(SHOTS[id - 1].b, t * FPS))), m = [0, 2].map((k) => rs.reduce((a, r) => a + r.A[k], 0) / rs.length);
    for (const r of rs) { r.sc = DEBUG_SC; r.A = [c.look[0] + (r.A[0] - m[0]) * DEBUG_SC, c.look[1] - 0.42, c.look[2] + (r.A[2] - m[1]) * DEBUG_SC]; }
  }
  return rs;
};
const rigsAt0 = (id: number, t: number): Rig[] => {
  if (id === 1) return [bean1(t)];
  if (id === 2) return [bean2(t)];
  if (id === 8) return [bean8(t)];
  if (id === 3) return [0, 1, 2, 3].map((i) => planetRig(i, t));
  if (id === 4) return [sci1(4, t), volunteer(4, t, "volA"), volunteer(4, t, "volB")];
  if (id === 5) return [sci1(5, t), sci2(5, t), volunteer(5, t, "volA"), volunteer(5, t, "volB")];
  if (id === 6) return [sci2(6, t), volunteer(6, t, "volA"), volunteer(6, t, "volB")];
  if (id === 7) return [sci2(7, t), volunteer(7, t, "fouch"), volunteer(7, t, "sailor")];
  return [];
};
const pick = (id: number, t: number, who: CastId) => rigsAt(id, t).find((r) => r.who === who) ?? null;
const frameAt = (id: number, t: number, r: Rig) => { const c = camPosOf(id, t); return frameOf(c, r); };

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -100, 0];
/** world head centre (brain) of a character */
export const headAt = (id: number, t: number, who: CastId): V3 => { const r = pick(id, t, who); return r ? toWorld(frameAt(id, t, r), headCanvas(r), 0.03) : NOWHERE; };
/** world mouth point (bubbles, censor bar, breath) */
export const mouthAt = (id: number, t: number, who: CastId): V3 => { const r = pick(id, t, who); return r ? toWorld(frameAt(id, t, r), mouthCanvas(r), 0.05) : NOWHERE; };
/** world hand point: side 0 = screen-left hand (BEAN's mug), 1 = screen-right (scientists' clipboard) */
export const handAt = (id: number, t: number, who: CastId, side: 0 | 1): V3 => { const r = pick(id, t, who); return r ? toWorld(frameAt(id, t, r), handCanvas(r.pose, side), 0.04) : NOWHERE; };
/** BEAN's stubbed big toe (screen-right foot) */
export const toeAt = (id: number, t: number): V3 => { const r = pick(id, t, "bean"); return r ? toWorld(frameAt(id, t, r), toeCanvas(r.pose), 0.04) : NOWHERE; };
/** world card origin (feet) */
export const feetAt = (id: number, t: number, who: CastId): V3 => { const r = pick(id, t, who); return r ? r.A : NOWHERE; };

// ---------------- props alignment (HOOKS read by props.ts) ----------------
const legJoints = (pose: Pose, side: 0 | 1): { hip: P2; knee: P2; ankle: P2 } => { // same IK as fx.ts drawGuy
  const s = side ? 1 : -1, Hp: P2 = [300 + s * 30, LAYOUT.hipY], Ft = pose.feet[side], T = 186;
  const d0 = Math.hypot(Ft[0] - Hp[0], Ft[1] - Hp[1]), d = Math.max(40, Math.min(d0, 2 * T - 3));
  const ang = Math.atan2(Ft[1] - Hp[1], Ft[0] - Hp[0]), F: P2 = [Hp[0] + Math.cos(ang) * d, Hp[1] + Math.sin(ang) * d];
  const dx = F[0] - Hp[0], dy = F[1] - Hp[1], a = d / 2, h = Math.sqrt(Math.max(0, T * T - a * a));
  let px = -dy / d, py = dx / d; if (px * s < 0) { px = -px; py = -py; }
  return { hip: Hp, knee: [Hp[0] + (dx / d) * a + px * h, Hp[1] + (dy / d) * a + py * h], ankle: F };
};
/** BEAN's frozen X-ray joints in props' card-local metres (props' frame has no roll: the roll is baked in here) */
const xrayOf = (r: Rig): XrayPose => {
  const lift = r.pose.lift ?? 0, cr = Math.cos(r.roll), sr = Math.sin(r.roll);
  const L = (P: P2): P2 => { const x = (P[0] - 300) * SU, y = (975 - P[1] + lift) * SU; return [x * cr - y * sr, x * sr + y * cr]; };
  const Lc = (P: P2): P2 => L([P[0], P[1] + lift]); // points already lifted by the helpers
  const R = legJoints(r.pose, 1), Lf = legJoints(r.pose, 0), lean = r.pose.lean ?? 0;
  return {
    toe: Lc(toeCanvas(r.pose)), ankle: L(R.ankle), knee: L(R.knee), hip: L(R.hip),
    ltoe: L([Lf.ankle[0] - 30, Lf.ankle[1] + 16]), lankle: L(Lf.ankle), lknee: L(Lf.knee), lhip: L(Lf.hip),
    pelvis: L(rotHip([300, LAYOUT.hipY - 10], lean)), neck: L(rotHip([300, LAYOUT.chin + 4], lean)), brain: Lc(headCanvas(r, -12)), mouth: Lc(mouthCanvas(r)),
  };
};
HOOKS.xray = (t) => xrayOf(bean2(t));
HOOKS.mouth = (id, t, who) => who === "bean" ? (id === 1 || id === 2 || id === 8 ? mouthAt(id, t, "bean") : undefined)
  : who === "swearer" ? (id === 5 || id === 6 ? mouthAt(id, t, "volB") : undefined) : who === "sailor" ? (id === 7 ? mouthAt(7, t, "sailor") : undefined) : undefined;
HOOKS.hand = (id, t, who) => who === "bean" ? (id === 1 || id === 2 || id === 8 ? handAt(id, t, "bean", 0) : undefined)
  : who === "scientist" ? (id === 4 || id === 5 ? handAt(id, t, "sci1", 1) : id === 6 || id === 7 ? handAt(id, t, "sci2", 1) : undefined) : undefined;
HOOKS.head = (id, t, who) => (who === "hearing" && id === 4 ? { pos: headAt(4, t, "volB"), r: 0.27 } : undefined);

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo) => {
  const F = frameOf(cam.pos, r);
  const d = cam.pos.distanceTo(new THREE.Vector3(r.A[0], r.A[1] + 1.2, r.A[2])) / r.sc;
  const [w, h, k] = tier(d);
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  const light = Math.round((Math.atan2(sy, sx) + F.roll) / (Math.PI / 4)) * (Math.PI / 4);
  const lid = q(lidAt(t, IDX[r.who], r.swaps), 2);
  const pose = r.pose, face = r.face, kit = r.kit;
  out.places.push({
    key: `ow|${r.who}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}`,
    draw: (p) => drawGuy(p, kit, pose, face, light, lid),
    x: F.o[0], y: F.o[1], z: F.o[2], yaw: F.yaw, roll: F.roll, scale: r.sc, size: [w, h, k],
  });
  return F;
};

// ---------------- effects ----------------
let UP_FIX = false; // QA1: cross(right, n) points DOWN on screen; shots 1-3 use the true screen-up (set per castAt call)
const camVecs = (cam: CamInfo, at: V3) => {
  const n = new THREE.Vector3(cam.pos.x - at[0], cam.pos.y - at[1], cam.pos.z - at[2]).normalize();
  const up = UP_FIX ? new THREE.Vector3().crossVectors(n, cam.right).normalize() : new THREE.Vector3().crossVectors(cam.right, n).normalize();
  return { R: [cam.right.x, cam.right.y, cam.right.z] as V3, N: [n.x, n.y, n.z] as V3, U: [up.x, up.y, up.z] as V3 };
};
/** pop-in envelope: springs in at t0, holds, fades out over 0.3 s at t1 */
const env = (t: number, t0: number, t1: number, dur = 0.22) => {
  if (t < t0) return 0;
  const u = clamp01((t - t0) / dur), s = smooth(u) * (1 + 0.22 * Math.sin(u * Math.PI)), o = 1 - smooth((t - t1) / 0.3);
  return Math.max(0, s * o);
};
/** comic OW! burst beside the head (screen-side sd), alpha + spring */
const owBurst = (out: Stage, t: number, t0: number, head: V3, cam: CamInfo, word: string, size: number, sd = 1, rot = 0, life = 1.6, dx = 0.62, dy = 0.35) => {
  const k = env(t, t0 - LEAD, t0 + life);
  if (k < 0.02) return;
  const { R, N, U } = camVecs(cam, head), wob = 0.06 * Math.sin((t - t0) * 9);
  const P = add(add(add(head, R, sd * size * dx), U, size * dy), N, 0.12);
  fxCard(out, `burst|${word}|${q(Math.min(1, k), 10)}`, 768, 640, (p) => fxBurst(p, word, 3, Math.min(1, k)), P, size * k, size * 0.83 * k, { rot: rot + sd * -0.12 + wob });
};
const bubble = (out: Stage, t: number, t0: number, t1: number, head: V3, cam: CamInfo, word: string, size: number, sd = 1, rot = 0, fizzleAt = 99, dx = 0.55, dy = 0.55, font = 0) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  const fz = q(smooth((t - fizzleAt) / 0.5), 10), a = q(Math.min(1, k) * (1 - 0.35 * fz), 10);
  const { R, N, U } = camVecs(cam, head), cr = Math.cos(rot), sr = Math.sin(rot);
  const ox = sd * size * dx, oy = size * dy - fz * size * 0.12; // offset in the (rolled) card plane
  const P = add(add(add(head, R, ox * cr - oy * sr), U, ox * sr + oy * cr), N, 0.1);
  fxCard(out, `bub|${word}|${sd}|${a}|${fz}|${font}`, 640, 480, (p) => fxBubble(p, word, -sd, a, fz, undefined, font), P, size * k, size * 0.75 * k, { rot });
};
const tearsJet = (out: Stage, t: number, t0: number, t1: number, head: V3, cam: CamInfo, roll = 0, power = 1) => {
  if (t < t0 || t > t1 + 0.6) return;
  const { R, U, N } = camVecs(cam, head), cr = Math.cos(roll), sr = Math.sin(roll);
  for (let j = 0; j < 8; j++) {
    const side = j % 2 ? 1 : -1, ph = ((t - t0) * 2.2 + j * 0.27) % 1, birth = t0 + j * 0.06;
    if (t < birth || t - ph / 2.2 > t1) continue;
    const vx = side * (0.5 + 0.2 * hh(j, 3)) * power, vy = 0.55 * power, tt = ph * 0.45;
    const x = side * 0.07 + vx * tt, y = 0.01 + vy * tt - 2.6 * tt * tt;
    const s = 0.045 * (0.7 + 0.5 * hh(j, 5)) * smooth(ph / 0.1);
    fxCard(out, "tear", 128, 160, fxTear, add(add(add(head, R, x * cr - y * sr), U, x * sr + y * cr), N, 0.08), s, s * 1.25, { rot: roll + Math.atan2(vx, -(vy - 5.2 * tt)) * 0.5 });
  }
};
const sweat = (out: Stage, t: number, i: number, head: V3, cam: CamInfo, from: number, rate = 0.9) => {
  if (t < from) return;
  const { R } = camVecs(cam, head);
  for (let j = 0; j < (rate > 1 ? 2 : 1); j++) {
    const ph = ((t - from) * rate + hh(i, 4 + j)) % 1, k = smooth(ph / 0.15) * (1 - smooth((ph - 0.75) / 0.25)) * smooth((t - from) / 0.15);
    if (k < 0.02) continue;
    const s = (j + i) % 2 ? -1 : 1, ox = 0.27 * s + 0.05 * s * ph;
    fxCard(out, "sweat", 200, 260, fxSweat, add(add(head, R, ox), [0, 0.06 - 0.05 * ph, 0]), 0.07 * k, 0.09 * k, { rot: -s * 0.4 });
  }
};
const stars = (out: Stage, t: number, t0: number, t1: number, head: V3, cam: CamInfo, roll = 0) => {
  const k = env(t, t0, t1, 0.3);
  if (k < 0.02) return;
  const { R, U, N } = camVecs(cam, head), cr = Math.cos(roll), sr = Math.sin(roll);
  for (let j = 0; j < 4; j++) {
    const a = t * 5 + (j * Math.PI) / 2, x = Math.cos(a) * 0.3, y = 0.3 + Math.sin(a) * 0.07, front = Math.sin(a) > 0 ? 0.18 : -0.05;
    const s = 0.1 * Math.min(1, k) * (0.8 + 0.2 * Math.sin(a));
    fxCard(out, "star", 200, 200, (p) => fxStar(p), add(add(add(head, R, x * cr - y * sr), U, x * sr + y * cr), N, front), s, s, { rot: a * 0.3 });
  }
};
const mark = (out: Stage, t: number, t0: number, t1: number, at: V3, m: "!" | "?", size = 0.22) => {
  const k = env(t, t0 - LEAD, t1);
  if (k <= 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff6a4a" : "#ffe46b"), [at[0], at[1] + 0.02 * Math.sin(t * 5), at[2]], size * k, size * 1.33 * k, { rot: 0.14 * Math.sin(t * 3) });
};
const shiver = (out: Stage, t: number, i: number, head: V3, cam: CamInfo, k: number) => {
  if (k < 0.05) return;
  const { R, N } = camVecs(cam, head), v = Math.floor(t * 12) % 3, a = Math.floor(t * 30) % 2 ? 0.01 : -0.01;
  for (const s of [-1, 1]) fxCard(out, `shiv|${v}`, 128, 384, (p) => fxShiver(p, v + i), add(add(add(head, R, s * 0.36 + a), [0, -0.32, 0]), N, 0.05), 0.11 * k, 0.33 * k, { rot: s * 0.08 });
};
const breath = (out: Stage, t: number, i: number, mouth: V3, cam: CamInfo, k: number, period = 1.6) => {
  if (k < 0.05) return;
  const ph = ((t + hh(i, 2) * period) % period) / period, u = ph / 0.6;
  if (u >= 1) return;
  const { R, N } = camVecs(cam, mouth), a = q(0.75 * k * smooth(u / 0.2) * (1 - smooth((u - 0.4) / 0.6)), 10);
  if (a < 0.03) return;
  const s = 0.08 + 0.2 * u;
  fxCard(out, `breath|${a}`, 256, 256, (p) => fxPuff(p, i, a, "#eaf6ff"), add(add(add(mouth, R, 0.06 + 0.16 * u), [0, 0.03 + 0.06 * u, 0]), N, 0.08), s, s * 0.8, { soft: true });
};
const steam = (out: Stage, t: number, i: number, head: V3, cam: CamInfo, k: number) => {
  if (k < 0.05) return;
  const { R, N } = camVecs(cam, head);
  for (let j = 0; j < 6; j++) {
    const s = j % 2 ? 1 : -1, ph = (t * 1.9 + j * 0.33 + hh(i, j)) % 1, a = q(k * smooth(ph / 0.15) * (1 - smooth((ph - 0.55) / 0.45)), 10);
    if (a < 0.04) continue;
    const sz = 0.1 + 0.16 * ph;
    fxCard(out, `steam|${j % 3}|${a}`, 256, 256, (p) => fxSteam(p, j % 3, a), add(add(add(head, R, s * (0.3 + 0.12 * ph)), [0, 0.02 + 0.4 * ph, 0]), N, 0.04), sz, sz, { soft: true, rot: s * ph * 0.6 });
  }
};
/** censor bar on the mouth (+ grawlix symbols bursting out of it at each beep) */
const censor = (out: Stage, t: number, t0: number, t1: number, mouth: V3, cam: CamInfo, w: number, roll = 0, bursts: number[] = [t0], seed = 1, power = 1) => {
  const k = t >= t0 - 1 / FPS && t < t1 ? smooth((t - (t0 - 1 / FPS)) / (1.5 / FPS)) * (1 - smooth((t - (t1 - 0.12)) / 0.12)) : 0; // snaps on like a real censor bar
  const { R, U, N } = camVecs(cam, mouth);
  if (k > 0.02) {
    const j = Math.floor(t * 20) % 2 ? 0.004 : -0.004;
    fxCard(out, "censor", 512, 160, fxCensor, add(add(mouth, N, 0.07), R, j), w * (0.85 + 0.15 * k), w * 0.31 * (0.85 + 0.15 * k), { rot: roll });
  }
  for (const b of bursts) for (let g = 0; g < 9; g++) {
    const tau = t - (b - LEAD + g * 0.07);
    if (tau <= 0 || tau > 1.1) continue;
    const ang = -Math.PI / 2 + (hh(seed + g, b) - 0.5) * 2.6, sp = (0.55 + 0.35 * hh(g, seed + 3)) * power;
    const dist = sp * (1 - Math.exp(-tau * 3.2)) / 1.4, x = Math.cos(ang) * dist * 1.3, y = -Math.sin(ang) * dist * 0.9 + 0.02;
    const s = 0.12 * power * smooth(tau / 0.12) * (1 - smooth((tau - 0.75) / 0.35)) * (1 + 0.3 * Math.sin(tau * 12) * Math.exp(-tau * 4));
    if (s < 0.01) continue;
    const gi = g === 4 ? 101 : g === 7 ? 100 : (g * 3 + Math.floor(b * 7)) % 8;
    fxCard(out, `grx${gi}`, 256, 256, (p) => fxGrawlix(p, gi), add(add(add(mouth, R, x), U, y), N, 0.1), s, s, { rot: roll + (hh(g, 9) - 0.5) * 0.8 + tau * (g % 2 ? 1.5 : -1.5) });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  UP_FIX = id <= 3;
  if (id === 3) cam = { ...cam, sun: globeSun(cam.pos) };
  prepStage(light, cam);
  for (const r of rigsAt(id, t)) {
    const F = drawRig(out, r, t, cam), head = toWorld(F, headCanvas(r), 0.03), mouth = toWorld(F, mouthCanvas(r), 0.05), i = IDX[r.who];
    const lift = (r.pose.lift ?? 0) * SU;
    if (!r.up) blob(out, r.A[0], id === 1 || id === 2 || id === 8 ? 0.012 : 0, r.A[2], 1, 1 - Math.min(0.6, lift * 4));
    if (r.who === "bean") {
      if (id === 1) {
        owBurst(out, t, W.ow0, head, cam, "OW!", 0.78, 1, 0, 2.2, 0.62, 0.3);
        tearsJet(out, t, W.ow0, FAINT_AT + 0.6, head, cam, F.roll, 1);
        stars(out, t, STUB1 + 0.05, W.ow0 - 0.1, head, cam);
        const toe = toWorld(F, toeCanvas(r.pose), 0.06), tk = env(t, STUB1, 99, 0.15);
        if (tk > 0.02) fxCard(out, "throb", 256, 256, fxThrob, add(toe, [0, 0.07, 0]), 0.24 * tk * (0.9 + 0.1 * Math.sin(t * 14)), 0.24 * tk, {});
        if (on(t, W.dramatic - 0.3)) sweat(out, t, 1, head, cam, W.dramatic - 0.3, 1.3);
      } else if (id === 2) {
        const toe = toWorld(F, toeCanvas(r.pose), 0.06);
        fxCard(out, "throb", 256, 256, fxThrob, add(toe, [0, 0.04, 0]), 0.16, 0.16, {});
        if (on(t, W.owA)) mark(out, t, W.owA + 0.4, 99, add(head, [0, 0.42, 0]), "!", 0.18);
      } else {
        const beep = BEEPS.find((b) => b[1] === "bean")![0];
        mark(out, t, STUB8 - 0.02, beep - 0.05, add(head, [0, 0.4, 0]), "!", 0.2);
        steam(out, t, 1, head, cam, smooth((t - (STUB8 + 0.05)) / 0.15));
        const toe = toWorld(F, toeCanvas(r.pose), 0.06), tk = env(t, STUB8, 99, 0.15);
        if (tk > 0.02) fxCard(out, "throb", 256, 256, fxThrob, add(toe, [0, 0.04, 0]), 0.16 * tk, 0.16 * tk, {});
      }
    } else if (id === 3) {
      const C = COUNTRIES[i - 10], sd = i === 12 ? -1 : 1; // QA1: the open-sky side of each close-up (UK lamp post is screen-left)
      bubble(out, t, C.t, C.t + 2.4, head, cam, C.word, 0.95, sd, F.roll, 99, 0.3, 0.6, 172); // QA1: big, above-beside the head, inside the close-up
      tearsJet(out, t, C.t, C.t + 1.2, head, cam, F.roll, 0.6);
    } else {
      const inIce = r.pose.blue ?? 0;
      if (r.who === "volA" && id === 4) {
        bubble(out, t, W.ow2, W.twenty - 0.1, head, cam, "OW!", 0.5, -1);
        bubble(out, t, W.yourself, W.yourself + 1.3, head, cam, "OW!", 0.42, -1);
      }
      if (r.who === "volB" && id === 4) {
        const ear = toWorld(F, headCanvas(r), 0.06), { R } = camVecs(cam, ear);
        for (let j = 0; j < 2; j++) {
          const k = env(t, W.ow3 + j * 0.35, W.ow3 + j * 0.35 + 0.5, 0.15), a = q(Math.min(1, k) * 0.9, 10);
          if (k > 0.03) fxCard(out, `tinyow|${a}`, 256, 256, (p) => fxTinyOw(p, a), add(add(ear, R, 0.36 + 0.06 * j), [0, 0.05 + 0.05 * j, 0]), 0.16, 0.16, { soft: true });
        }
        mark(out, t, W.didnt, W.didnt + 1.2, add(head, [0, 0.42, 0]), "?", 0.18);
      }
      if (r.who === "volB" && id === 5) sweat(out, t, i, head, cam, W.another, 1.4);
      if (r.who === "volB" && id === 6) {
        const memeK = r.face.e === "meme" ? 1 : 0;
        steam(out, t, i, head, cam, memeK * smooth((t - W.swearing) / 0.2));
        sweat(out, t, i, head, cam, W.swearing, 2.4);
      }
      if (r.who === "fouch") {
        bubble(out, t, W.words, W.work + 1.0, head, cam, "FOUCH!", 0.62, 1, 0, W.didnt2);
      }
      if (r.who === "sailor") {
      }
      if (r.who === "sci2" && id === 6) mark(out, t, W.swearing + 0.1, W.third, add(head, [0, 0.42, 0]), "!", 0.2);
      if (r.who === "sci1" && id === 4) mark(out, t, W.ow2 + 0.1, W.ow2 + 1.2, add(head, [0, 0.42, 0]), "!", 0.16);
      const cold = inIce > 0.3 && r.face.e !== "meme" && r.who !== "sailor";
      if (r.who.startsWith("vol") || r.who === "fouch" || r.who === "sailor") {
        shiver(out, t, i, head, cam, cold ? smooth(inIce) : 0);
        if (r.face.e !== "fouch" && r.face.e !== "meme" && r.face.e !== "ow") breath(out, t, i, mouth, cam, inIce > 0.3 ? 1 : 0);
      }
    }
  }
  return out;
};
void TUB_B; void shotStart; void lerp; void censor;
