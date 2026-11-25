// OWNER: cast agent. Every character card (BEAN, the 1985 crew, NEWMAN) and effect card per shot.
// Characters are our own floating astronaut drawings (fx.ts drawAstro) on bridge Actor cards. Nobody stands: in the
// station / middeck they FLOAT (no contact blob, no feet on a floor), drifting a few cm and rolling a few degrees,
// deterministically. Card roll is done on the mesh (no redraw) and the card origin is solved so the CHEST anchor stays
// put (cardFrame), which also lets Newman fly rolled 90 degrees ("Superman") with his face counter-rotated upright.
// Layout contract: every anchor comes from props.ts chestPos (+ a few cm of deterministic drift), and the holding hand
// (screen-right) is solved onto props canPos, so cans and hands stay in sync. Exceptions / extras exported here:
//   BEAN_SEAT_CHEST  shot 2 seated chest EARTH+(0,0.55,0.1) (card origin EARTH+(0,0,0.1), feet on the lawn, seat ~0.3 m)
//   NEWMAN_RAIL      shot 8 grip point after the catch (a handrail should pass through it)
//   SHOT9_WINDOW     shot 9 Newman's chest inside the station's exterior window
//   bellyAt / mouthAt  live stomach + mouth points of the drawn card
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, STATION, EARTH, ORBIT, SHOTS, V3, smooth, clamp01, BURPS, BurpKind, newmanAt, NEWMAN_X0, NEWMAN_X1, camAt } from "./story";
import { chestPos, canPos, sodaAt } from "./props";
import { Kit, Pose, FaceS, Face, Legs, drawAstro, layout, fxBurpRing, fxFailPuff, fxWetBlob, fxDrop, fxSweat, fxSpeed, fxSparkle, fxQuestion } from "./fx";

type P2 = [number, number];
export type CastId = "bean" | "crew0" | "crew1" | "crew2" | "newman";
const on = (t: number, w: number) => t >= w - LEAD;
const spring = (t: number, w: number, dur = 0.3) => { const u = clamp01((t - (w - LEAD)) / dur); return smooth(u) * (1 + 0.18 * Math.sin(u * Math.PI)); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 20) : v));

// ---------------- the cast ----------------
const BEAN: Kit = { seed: 3, skin: "#ffe2c2", hair: "#5a3b2a", style: "tuft", shirt: "#26386e", pants: "#a8946a", socks: "#f2efe6", patch: true };
const BEAN_EARTH: Kit = { ...BEAN, style: "flop", shirt: "#ee7a3c", tee: true, patch: false, pants: "#4a6488", socks: "#ffffff" };
const KITS: Record<CastId, Kit> = {
  bean: BEAN,
  // the 1985 crew: rugby shirt + 80s moustache (centre), zero-g perm + headband, feathered blond + aviators
  crew0: { seed: 5, skin: "#f5c9a0", hair: "#4a2e1e", style: "curly", moustache: "#3a2416", shirt: "#23427e", stripe: "#e0b440", pants: "#b8a27a", socks: "#ece6da" },
  crew1: { seed: 2, skin: "#ffe2c2", hair: "#b5562c", style: "poof", headband: "#ff5fa2", shirt: "#2fa6a0", pants: "#7a6a55", socks: "#ffffff" },
  crew2: { seed: 6, skin: "#ecd0b6", hair: "#e3bc56", style: "feather", glasses: "aviator", shirt: "#9c2f3f", pants: "#5a5f6a", socks: "#dcdcdc" },
  newman: { seed: 4, skin: "#f5c9a0", hair: "#3a2a22", style: "crop", glasses: "round", tape: "NEWMAN", patch: true, shirt: "#5a86c4", pants: "#6b6455", socks: "#f2efe6" },
};
const IDX: Record<CastId, number> = { bean: 1, crew0: 10, crew1: 11, crew2: 12, newman: 20 };

/** where Newman's screen-right hand grips after the catch (shot 8): a handrail should pass through here */
const L0 = layout(false), LS = layout(true);
/** interiors catch bar: x 4.05, y 1.45, z -0.45..0.45; chest ends at STATION+(3.6,1.35,0), card yaw eases to 0 on the catch */
const RAIL_HAND: P2 = [300 + 0.45 / SU, 490 + 0.1 / SU];
/** shot 9: Newman's chest inside the station's exterior window (exterior owner: put the lit window here, glass in front) */
export const SHOT9_WINDOW: V3 = [ORBIT[0] - 200, ORBIT[1] + 0, ORBIT[2] + 2.0];

// ---------------- card frame: chest-anchored, rolled, camera-facing ----------------
type Frame = { o: V3; c: number; s: number; yaw: number; roll: number; sc: number };
const frameOf = (camPos: { x: number; z: number }, A: V3, La: P2, roll: number, sc: number, yawFix?: [number, number]): Frame => {
  let yaw = Math.atan2(camPos.x - A[0], camPos.z - A[2]);
  if (yawFix) yaw = lerp(yaw, yawFix[0], yawFix[1]);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = (La[0] - 300) * SU * sc, ly = (975 - La[1]) * SU * sc, cr = Math.cos(roll), sr = Math.sin(roll);
  const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
  return { o: [A[0] - c * rx, A[1] - ry, A[2] + s * rx], c, s, yaw, roll, sc };
};
/** inverse of toWorld: the canvas point (design units) under a world point */
const toCanvas = (F: Frame, P: V3): P2 => {
  const rx = F.c * (P[0] - F.o[0]) - F.s * (P[2] - F.o[2]), ry = P[1] - F.o[1], cr = Math.cos(F.roll), sr = Math.sin(F.roll);
  const lx = rx * cr + ry * sr, ly = -rx * sr + ry * cr;
  return [300 + lx / (SU * F.sc), 975 - ly / (SU * F.sc)];
};
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  const lx = (P[0] - 300) * SU * F.sc, ly = (975 - P[1]) * SU * F.sc, cr = Math.cos(F.roll), sr = Math.sin(F.roll);
  const rx = lx * cr - ly * sr, ry = lx * sr + ly * cr;
  return [F.o[0] + F.c * rx + F.s * fwd, F.o[1] + ry, F.o[2] - F.s * rx + F.c * fwd];
};
const drift = (i: number, t: number, k = 1): [V3, number] => [[
  0.03 * k * Math.sin((2 * Math.PI * t) / 4.3 + 6.28 * hh(i, 1)), 0.035 * k * Math.sin((2 * Math.PI * t) / 3.7 + 6.28 * hh(i, 2)), 0], 0.035 * k * Math.sin((2 * Math.PI * t) / 5.3 + 6.28 * hh(i, 3))];

// ---------------- poses ----------------
type Hands = { h: [P2, P2]; f?: [boolean, boolean] };
const HANDS = {
  float: { h: [[176, 505], [424, 505]] },
  fists: { h: [[206, 566], [394, 566]] },
  hips: { h: [[214, 592], [386, 592]] },
  limp: { h: [[170, 438], [430, 438]] },
  belly1: { h: [[176, 505], [334, 560]], f: [false, true] },
  belly2: { h: [[262, 566], [338, 566]], f: [true, true] },
  scratch: { h: [[176, 520], [404, 262]] },
} satisfies Record<string, Hands>;
/** blend between pose keys over 0.2 s (quantized, so cached canvases stay few) */
const seq = <T,>(t: number, keys: [number, T][], dur = 0.2): { a: T; b: T; k: number } => {
  let i = 0;
  while (i < keys.length - 1 && t >= keys[i + 1][0] - LEAD) i++;
  const k = i === 0 && t < keys[0][0] - LEAD ? 0 : q(smooth((t - (keys[i][0] - LEAD)) / dur), 6);
  return { a: keys[Math.max(0, i - 1)][1], b: keys[i][1], k: i === 0 ? 1 : k };
};
const blendH = (A: Hands, B: Hands, k: number): Hands => ({ h: [lerp2(A.h[0], B.h[0], k), lerp2(A.h[1], B.h[1], k)], f: (k < 0.5 ? A.f : B.f) ?? [false, false] });
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };

type Rig = { who: CastId; kit: Kit; pose: Pose; face: FaceS; swaps: number[]; A: V3; La: P2; roll: number; sc: number; yawFix?: [number, number]; hold: 0 | 1 | -1; sit?: boolean; dirS?: number };

const beanFloat = (id: number, t: number): Rig => {
  const [d, roll] = drift(IDX.bean, t), C = chestPos(id, t, "bean");
  const A: V3 = [C[0] + d[0], C[1] + d[1], C[2]];
  let face: FaceS, hands: Hands, legs: Legs = "tuck", legs2: Legs = "tuck", lk = 0, swaps: number[];
  if (id === 1) {
    const fail = BURPS[0][0];
    const e = faceAt(t, [[-9, "strain"], [W.notwont, "annoyed"], [W.cant2, "defeated"]]);
    const kS = t < fail ? 0.8 + 0.2 * smooth(t / 0.45) : 1 - 0.55 * smooth((t - fail) / 0.2);
    face = { e, k: e === "strain" ? q(kS, 10) : 1 };
    const s = seq(t, [[-9, HANDS.fists], [W.notwont, HANDS.hips], [W.cant2, HANDS.limp]]);
    hands = blendH(s.a, s.b, s.k);
    if (on(t, W.cant2)) { legs2 = "dangle"; lk = q(smooth((t - (W.cant2 - LEAD)) / 0.5), 6); }
    swaps = [W.notwont, W.cant2];
  } else {
    const wb = W.wetburp - 0.05, emb = W.wetburp + 0.5;
    const e = faceAt(t, [[-9, "neutral"], [W.space, "worried"], [W.burps, "queasy"], [wb + LEAD, "wetburp"], [emb, "embarrassed"]]);
    face = { e, k: e === "wetburp" ? q(spring(t, wb + LEAD, 0.25), 8) : 1, shake: Math.floor(t * 15) % 3, look: e === "worried" ? q(0.6 * Math.sin(t * 1.3), 4) : 0 };
    const s = seq(t, [[-9, HANDS.float], [W.space, HANDS.belly1], [W.burps, HANDS.belly2], [emb, HANDS.scratch]]);
    hands = blendH(s.a, s.b, s.k);
    swaps = [W.space, W.burps, emb];
  }
  return { who: "bean", kit: BEAN, pose: { legs, legs2, lk, hands: hands.h, front: hands.f }, face, swaps, A, La: L0.chest, roll, sc: 1, hold: -1 };
};

const BEAN_CHAIR: V3 = [EARTH[0], EARTH[1], EARTH[2] + 0.1];
/** BEAN's seated chest in shot 2 (props: use this, not chestPos' default EARTH+(0,0.9,0)) */
export const BEAN_SEAT_CHEST: V3 = [BEAN_CHAIR[0], BEAN_CHAIR[1] + (975 - LS.chest[1]) * SU, BEAN_CHAIR[2]];
const beanEarth = (t: number): Rig => {
  const sip = sodaAt(2, t);
  const e: Face = on(t, W.burp1 - 0.05 + LEAD) ? "ahh" : sip > 0.35 ? "sip" : "relaxed";
  const cy = LS.chest[1];
  const pat = on(t, W.gas) ? q(0.5 + 0.5 * Math.sin((t - W.gas) * 7), 4) * (1 - smooth((t - W.down) / 0.3)) : 0;
  const left: P2 = [lerp(208, 264, smooth((t - (W.gas - 0.3)) / 0.3)), cy + 62 - 8 * pat];
  const r: Rig = { who: "bean", kit: BEAN_EARTH, pose: { legs: "sit", sit: true, hands: [left, [440, cy]], front: [on(t, W.gas - 0.15), true], headTilt: e === "ahh" ? -4 : 0 }, face: { e },
    swaps: [W.burp1], A: BEAN_SEAT_CHEST, La: LS.chest, roll: 0, sc: 1, hold: 1, sit: true };
  return gripCan(r, 2, t, canPos(2, t, "bean").pos);
};
/** put the holding hand on the props can (world) */
const gripCan = (r: Rig, id: number, t: number, P: V3): Rig => {
  const F = frameFor(r, camPosOf(id, t)), c = toCanvas(F, P), h = r.pose.hands.slice() as [P2, P2];
  h[r.hold === 1 ? 1 : 0] = [q(c[0], 1), q(c[1], 1)];
  return { ...r, pose: { ...r.pose, hands: h } };
};

const L_HANDS = {
  pump: { h: [[182, 350], [0, 0]] },
  float: { h: [[176, 505], [0, 0]] },
  belly: { h: [[266, 562], [0, 0]], f: [true, false] },
  scratch: { h: [[196, 262], [0, 0]] },
} satisfies Record<string, Hands>;
const crew = (id: number, t: number, who: "crew0" | "crew1" | "crew2"): Rig => {
  const i = IDX[who], [d, roll] = drift(i, t), C = chestPos(id, t, who);
  const A: V3 = [C[0] + d[0], C[1] + d[1], C[2] + d[2]];
  const stag = (+who.slice(4) - 1) * 0.12; // props' staggered sips
  let face: FaceS, other: Hands, swaps: number[], sc = 1;
  if (id === 6) {
    const e = faceAt(t, [[-9, "excited"], [W.sip + stag, "happySip"], [W.bubbles + stag, "nervous"]]);
    face = { e, look: e === "nervous" ? (who === "crew1" ? 0 : who === "crew0" ? 1 : -1) : 0 };
    const s = seq(t, [[-9, L_HANDS.pump], [W.sip + stag - 0.25, L_HANDS.float], [W.bubbles + stag, L_HANDS.belly]]);
    other = blendH(s.a, s.b, s.k);
    swaps = [W.sip + stag, W.bubbles + stag];
  } else {
    const tb = BURPS.find((b) => b[1] === "wet" && b[2] === who)![0], sheep = tb + 0.65;
    const e = faceAt(t, [[-9, "meme"], [tb + LEAD, "memeBurp"], [sheep, "sheepish"]]);
    // the build: cheeks swell into "Wet.", a pop of the eyes on the word, then a trembling hold until the burp
    const pop = on(t, W.wet2) ? Math.exp(-Math.max(0, t - (W.wet2 - LEAD)) * 5) : 0;
    const kM = q(Math.min(1.15, 0.86 + 0.14 * smooth((t - 33.6) / 0.15) + 0.12 * pop + 0.1 * smooth((t - W.wet2) / 1.0)), 20);
    face = { e, k: e === "meme" ? kM : e === "memeBurp" ? q(spring(t, tb + LEAD, 0.25), 8) : 1, shake: Math.floor(t * 15) % 6 };
    if (e === "meme") sc = 1 + 0.025 * pop;
    const s = seq(t, [[-9, L_HANDS.belly], [sheep, L_HANDS.scratch]]);
    other = blendH(s.a, s.b, s.k);
    swaps = [sheep];
  }
  const r: Rig = { who, kit: KITS[who], pose: { legs: "tuck", hands: [other.h[0], [420, 536]], front: [!!other.f?.[0], true] }, face, swaps, A, La: L0.chest,
    roll: id === 7 && face.e === "meme" ? roll * 0.4 : roll, sc, hold: 1 };
  return gripCan(r, id, t, canPos(id, t, who).pos);
};

const tCatch = W.hard - LEAD + 0.965 * (W.fooddown + 0.5 - W.hard);
const FIX8 = 0; // card square to the module axis when caught, so the hand lands on the bar (z = 0)
const newman8 = (t: number, dirS: number): Rig => {
  const n = newmanAt(8, t), launched = on(t, W.hard), up = smooth((t - tCatch) / 0.45);
  const [d, r0] = drift(IDX.newman, t, launched ? 0 : 1), C = chestPos(8, t, "newman");
  const A: V3 = [C[0] + d[0], C[1] + d[1], C[2]];
  const rk = smooth((t - (W.pushed - 0.2)) / 0.5) * (1 - up);
  const roll = -dirS * (Math.PI / 2) * rk + r0 * (1 - rk);
  const ext = clamp01((n.x - NEWMAN_X0) / 0.45);
  let legs: Legs = "tuck", legs2: Legs = "tuck", lk = 0;
  if (rk > 0 && !launched) { legs2 = "crouch"; lk = q(n.crouch > 0 ? n.crouch : rk, 6); }
  if (launched) { legs = "crouch"; legs2 = "stretch"; lk = q(ext, 8); }
  if (up > 0) { legs = "stretch"; legs2 = "tuck"; lk = q(up, 6); }
  const fist = dirS > 0 ? 0 : 1;
  const flyH: [P2, P2] = fist === 0 ? [[214, 268], [386, 612]] : [[214, 612], [386, 268]];
  const pre = seq(t, [[-9, HANDS.float], [W.trick - 0.1, { h: [[176, 505], [404, 318]] } as Hands], [W.pushed, { h: [[214, 600], [386, 600]] } as Hands]]);
  let hands = blendH(pre.a, pre.b, pre.k).h;
  if (launched) hands = [lerp2([214, 600], flyH[0], q(ext, 6)), lerp2([386, 600], flyH[1], q(ext, 6))];
  if (up > 0) hands = [lerp2(hands[0], [176, 505], q(up, 6)), lerp2(hands[1], RAIL_HAND, q(up, 6))];
  const e = faceAt(t, [[-9, "neutral"], [W.trick, "sly"], [W.pushed, "determined"], [W.split, "wide"], [W.perfect, "blissful"]]);
  return {
    who: "newman", kit: KITS.newman, pose: { legs, legs2, lk, hands, headRot: q(roll, 30) }, face: { e }, swaps: [W.trick, W.pushed, W.split, W.perfect],
    A, La: L0.chest, roll, sc: 1, yawFix: [FIX8, smooth((t - (tCatch - 0.5)) / 0.5)], hold: -1, dirS,
  };
};
const newman9 = (t: number): Rig => {
  const [d, roll] = drift(IDX.newman, t);
  const e = faceAt(t, [[-9, "blissful"]]);
  return { who: "newman", kit: KITS.newman, pose: { legs: "tuck", hands: [[176, 505], [404, 318]] }, face: { e }, swaps: [], A: [SHOT9_WINDOW[0] + d[0], SHOT9_WINDOW[1] + d[1], SHOT9_WINDOW[2]], La: L0.chest, roll, sc: 1, hold: -1 };
};

const camPosOf = (id: number, t: number) => { const c = camAt(id, t * FPS); return { x: c.pos[0], y: c.pos[1], z: c.pos[2], rx: 0 }; };
const dirOf = (id: number, t: number) => { // screen-right sign of world +x for the shot camera
  const c = camAt(id, t * FPS), fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2];
  return -fz >= 0 ? 1 : -1; // right = forward x up = (-fz, 0, fx)
};
const rigsAt = (id: number, t: number): Rig[] => {
  if (id === 1 || id === 3) return [beanFloat(id, t)];
  if (id === 2) return [beanEarth(t)];
  if (id === 6 || id === 7) return [crew(id, t, "crew1"), crew(id, t, "crew0"), crew(id, t, "crew2")];
  if (id === 8) return [newman8(t, dirOf(8, t))];
  if (id === 9) return [newman9(t)];
  return [];
};
const frameFor = (r: Rig, camPos: { x: number; z: number }) => frameOf(camPos, r.A, r.La, r.roll, r.sc, r.yawFix);
const handCanvas = (r: Rig): P2 => {
  const L = r.sit ? LS : L0, S = L.sh[r.hold === 1 ? 1 : 0], H = r.pose.hands[r.hold === 1 ? 1 : 0];
  const d = Math.hypot(H[0] - S[0], H[1] - S[1]), m = Math.min(1, 178 / (d || 1));
  return [S[0] + (H[0] - S[0]) * m, S[1] + (H[1] - S[1]) * m];
};
const mouthCanvas = (r: Rig): P2 => {
  const L = r.sit ? LS : L0, a = r.pose.headRot ?? 0, dx = 0, dy = L.mouth[1] - L.hc;
  return [300 + dx * Math.cos(a) - dy * Math.sin(a), L.hc + dx * Math.sin(a) + dy * Math.cos(a)];
};
const pick = (id: number, t: number, who: CastId) => rigsAt(id, t).find((r) => r.who === who) ?? null;

// ---------------- exported contracts for props / sets ----------------
/** world chest centre of a character (stomach hologram default: this + 0.55 m along the camera right) */
export const chestAt = (id: number, t: number, who: CastId): V3 => { const r = pick(id, t, who); return r ? r.A : [0, -100, 0]; };
/** world point of the belly (where the stomach really is) */
export const bellyAt = (id: number, t: number, who: CastId): V3 => {
  const r = pick(id, t, who); if (!r) return [0, -100, 0];
  return toWorld(frameFor(r, camPosOf(id, t)), (r.sit ? LS : L0).belly, 0.02);
};
/** world mouth point (burp fx origin) */
export const mouthAt = (id: number, t: number, who: CastId): V3 => {
  const r = pick(id, t, who); if (!r) return [0, -100, 0];
  return toWorld(frameFor(r, camPosOf(id, t)), mouthCanvas(r), 0.04);
};
/** Newman's gripping hand after the catch (shot 8): the handrail should pass through this point */
export const NEWMAN_RAIL: V3 = (() => {
  const t = SHOTS[7].b / FPS - 0.2, r = newman8(t, dirOf(8, t));
  return toWorld(frameFor(r, camPosOf(8, t)), RAIL_HAND, -0.04);
})();

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo) => {
  const F = frameFor(r, cam.pos);
  const d = cam.pos.distanceTo(new THREE.Vector3(...r.A)) / r.sc;
  const [w, h, k] = tier(d);
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  const light = Math.round((Math.atan2(sy, sx) + r.roll) / (Math.PI / 4)) * (Math.PI / 4);
  const lid = q(lidAt(t, IDX[r.who], r.swaps), 2);
  const pose = r.pose, face = r.face, kit = r.kit;
  out.places.push({
    key: `astro|${r.who}|${kit.tee ? "t" : "p"}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}`,
    draw: (p) => drawAstro(p, kit, pose, face, light, lid),
    x: F.o[0], y: F.o[1], z: F.o[2], yaw: F.yaw, roll: F.roll, scale: r.sc, size: [w, h, k],
  });
  return F;
};

// ---------------- effects ----------------
const camVecs = (cam: CamInfo, at: V3) => {
  const n = new THREE.Vector3(cam.pos.x - at[0], cam.pos.y - at[1], cam.pos.z - at[2]).normalize();
  const R: V3 = [cam.right.x, cam.right.y, cam.right.z], N: V3 = [n.x, n.y, n.z];
  return { R, N };
};
const burpRings = (out: Stage, t: number, t0: number, at: V3, cam: CamInfo, size: number, n = 3) => {
  const { N } = camVecs(cam, at);
  for (let j = 0; j < n; j++) {
    const u = (t - (t0 + 0.13 * j)) / 0.95;
    if (u <= 0 || u >= 1) continue;
    const a = q(Math.pow(1 - u, 1.1) * smooth(u / 0.08), 10);
    if (a < 0.05) continue;
    const s = size * (0.6 + 0.8 * u) * (1 - 0.12 * j);
    fxCard(out, `bring|${a}`, 512, 512, (p) => fxBurpRing(p, a), add(add(at, N, 0.16 + 0.3 * u), [0, 0.03 + 0.06 * u, 0]), s, s, { soft: true });
  }
};
const failPuff = (out: Stage, t: number, t0: number, at: V3, cam: CamInfo) => {
  const u = (t - t0) / 0.9;
  if (u <= 0 || u >= 1) return;
  const { N, R } = camVecs(cam, at);
  const a = q(1 - smooth((u - 0.45) / 0.55), 10), s = 0.15 * (0.3 + 0.7 * smooth(u / 0.18));
  if (a < 0.05) return;
  fxCard(out, `fpuff|${a}`, 256, 256, (p) => fxFailPuff(p, a), add(add(add(at, N, 0.08), R, 0.05 * u), [0, -0.07 * u, 0]), s, s, { soft: true, rot: -0.3 * u });
};
const wetBurp = (out: Stage, t: number, t0: number, at: V3, cam: CamInfo, seed: number, big = 1) => {
  const { N, R } = camVecs(cam, at);
  for (let j = 0; j < 11; j++) {
    const drop = j >= 5, tj = t0 + 0.05 * j * (drop ? 0.6 : 1), tau = t - tj;
    if (tau <= 0 || tau > 2.8) continue;
    const side = j % 2 ? 1 : -1, ang = side > 0 ? -0.35 + 0.75 * hh(seed, j) : Math.PI + 0.35 - 0.75 * hh(seed, j); // sideways fans, clear of the eyes
    const sp = (0.28 + 0.22 * hh(seed, j + 20)) * big * (drop ? 1.3 : 1);
    const dist = (sp * (1 - Math.exp(-tau * 0.9))) / 0.9;
    const dx = Math.cos(ang) * dist * 1.3, dy = Math.sin(ang) * dist * 0.6 - 0.03;
    const P = add(add(add(at, R, dx), [0, dy, 0]), N, 0.06 + 0.12 * dist);
    const a = q(1 - smooth((tau - 2.1) / 0.7), 10), grow = smooth(tau / 0.15);
    if (a < 0.05 || grow < 0.02) continue;
    if (drop) {
      const s = (0.028 + 0.02 * hh(seed, j + 40)) * big * grow;
      fxCard(out, `drop|${a}`, 128, 128, (p) => fxDrop(p, a), P, s, s, { soft: true });
    } else {
      const s = (0.07 + 0.06 * hh(seed, j + 30)) * big * grow, ph = Math.floor(tau * 8 + j) % 8, sd = j + seed;
      fxCard(out, `wblob|${sd % 5}|${ph}|${a}`, 256, 256, (p) => fxWetBlob(p, sd % 5, ph, a), P, s, s * 0.92, { soft: true, rot: 0.4 * Math.sin(tau * 2 + j) });
    }
  }
};
const sweat = (out: Stage, t: number, i: number, head: V3, cam: CamInfo, from: number, rate = 0.9) => {
  if (t < from) return;
  const { R } = camVecs(cam, head);
  for (let j = 0; j < (rate > 1 ? 2 : 1); j++) {
    const ph = ((t - from) * rate + hh(i, 4 + j)) % 1, k = smooth(ph / 0.15) * (1 - smooth((ph - 0.75) / 0.25)) * smooth((t - from) / 0.15);
    if (k < 0.02) continue;
    const s = (j + i) % 2 ? -1 : 1, ox = 0.26 * s + 0.05 * s * ph;
    fxCard(out, "sweat", 200, 260, fxSweat, add(add(head, R, ox), [0, 0.05 - 0.04 * ph + (rate > 1 ? 0.05 * ph : 0), 0]), 0.07 * k, 0.09 * k, { rot: -s * 0.4 });
  }
};
const sparkles = (out: Stage, t: number, t0: number, at: V3, cam: CamInfo, n = 3, size = 0.16, spread = 0.3, life = 99) => {
  if (t < t0 - LEAD) return;
  const k = smooth((t - (t0 - LEAD)) / 0.2) * (1 - smooth((t - t0 - life) / 0.3));
  if (k < 0.02) return;
  const { R, N } = camVecs(cam, at);
  for (let j = 0; j < n; j++) {
    const u = q(((t - t0) * 1.4 + j * 0.31) % 1, 24), s = (j % 2 ? 1 : -1) * spread * (0.6 + 0.4 * hh(j, 71));
    fxCard(out, `spark${u}`, 240, 240, (p) => fxSparkle(p, u), add(add(add(at, R, s), [0, 0.1 * j, 0]), N, 0.05), size * k, size * k);
  }
};
const question = (out: Stage, t: number, w: number, until: number, at: V3) => {
  const k = spring(t, w) * (1 - smooth((t - until) / 0.25));
  if (k <= 0.01) return;
  fxCard(out, "qmark", 300, 400, fxQuestion, [at[0], at[1] + 0.02 * Math.sin(t * 5), at[2]], 0.2 * k, 0.27 * k, { rot: 0.14 * Math.sin(t * 3) });
};
// ---------------- per shot ----------------
const burpOf = (who: CastId, kind: BurpKind, from = 0) => BURPS.filter((b) => b[2] === who && b[1] === kind && b[0] >= from).map((b) => b[0]);
const headOf = (F: Frame, r: Rig): V3 => toWorld(F, [300, (r.sit ? LS : L0).hc], 0.03);

export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  for (const r of rigsAt(id, t)) {
    const F = drawRig(out, r, t, cam), mouth = toWorld(F, mouthCanvas(r), 0.05), head = headOf(F, r);
    if (id === 1) {
      for (const tb of burpOf("bean", "fail")) failPuff(out, t, tb, mouth, cam);
      if (!on(t, W.notwont)) sweat(out, t, 1, head, cam, 0.15, 1.1);
    } else if (id === 2) {
      blob(out, BEAN_CHAIR[0], 0, BEAN_CHAIR[2] + 0.12, 0.8);
      for (const tb of burpOf("bean", "clean")) burpRings(out, t, tb, mouth, cam, 0.42);
    } else if (id === 3) {
      question(out, t, W.nothing, W.mix - 0.3, add(head, [0, 0.38, 0]));
      for (const tb of burpOf("bean", "wet")) wetBurp(out, t, tb, mouth, cam, 7, 0.9);
      if (on(t, W.burps)) sweat(out, t, 1, head, cam, W.burps + 0.4);
      if (on(t, W.wetburp + 0.5)) sweat(out, t, 2, head, cam, W.wetburp + 0.6);
    } else if (id === 6 || id === 7) {
      const i = IDX[r.who];
      if (id === 6) {
        if (on(t, W.bubbles)) sweat(out, t, i, head, cam, W.bubbles + 0.1 + 0.07 * (i - 10));
      } else {
        for (const tb of burpOf(r.who, "wet")) wetBurp(out, t, tb, mouth, cam, i, r.who === "crew0" ? 1.15 : 0.9);
        if (r.face.e === "meme") sweat(out, t, i, add(head, [0, 0.04, 0]), cam, 33.55, 2.2);
        if (r.face.e === "sheepish") sweat(out, t, i + 3, head, cam, 35.5);
      }
    } else if (id === 8) {
      const n = newmanAt(8, t), n2 = newmanAt(8, t + 1 / FPS), v = (n2.x - n.x) * FPS;
      const k = clamp01(v / 1.6) * smooth((t - W.hard) / 0.1);
      if (k > 0.03) for (let j = 0; j < 3; j++) {
        const vv = Math.floor(t * 10 + j) % 3, a = q(0.85 * k, 10), dS = r.dirS ?? 1;
        fxCard(out, `speed|${vv}|${a}`, 768, 256, (p) => fxSpeed(p, vv, a), [r.A[0] - dS * (1.05 + 0.35 * j), r.A[1] + (j - 1) * 0.2, r.A[2] + 0.05], 1.3 * (0.6 + 0.4 * k), 0.42, { soft: true, rot: dS > 0 ? 0 : Math.PI });
      }
      sparkles(out, t, W.trick, add(head, [0, 0.12, 0]), cam, 2, 0.13, 0.34, 0.9);
      for (const tb of burpOf("newman", "clean")) { burpRings(out, t, tb, mouth, cam, 0.5); sparkles(out, t, tb + 0.1, add(head, [0, 0.1, 0]), cam, 3, 0.17, 0.4); }
    } else if (id === 9) {
      for (const tb of burpOf("newman", "tiny")) burpRings(out, t, tb, mouth, cam, 0.45, 2);
    }
  }
  return out;
};
