// OWNER: cast agent. Every character card and effect card per shot for "The Sun Sneeze".
// Characters are our own bean-head drawings (fx.ts drawPerson) on bridge Actor cards. Card origin = the point between
// the feet ON the ground (canvas 300, 975); cards yaw to the camera; kids use Place.scale. Everything is a pure function
// of (id, t) keyed off the story.ts W cues and state functions (SNEEZES, doorAt, noseAt, baconAt, bannerAt).
// CONTRACTS (world, metres; St = STREET, Gr = GREECE, En = ENGLAND, Sg = STAGE):
//   shot 1  BEAN starts in the dark hallway at St+(0,DOOR_Y,-1.7) and walks out through the door (z -1.2) to St+(0,0,0)
//           while doorAt(1).step goes 0 -> 1. Standing head centre St+(0,1.458,0).
//   shot 2  ARISTOTLE stands at Gr+(0,0,0) (scroll drawn in his screen-left hand; it flies off as an fx card at the sneeze).
//   shot 3  FRANCIS BACON stands at En+(0,0,0) (notebook screen-left hand, quill screen-right hand, drawn in-card).
//   shot 4/5 BEAN stands at St+(0,0,0); NERVES_HOOKS.head = headAt (head centre ~St+(0,1.458,0); it lifts ~2 cm on the
//           inhale and whips ~5 cm down on the blast).
//   shot 6  the family walks out of the door (queue in the hallway at z -1.7..-3.4) to FAMILY spots (see FAMILY below).
//   shot 7  SCIENTIST stands at Sg+(0,0,-0.8) (behind the podium), facing +z. The audience sits facing the stage
//           (-z) in SEATS (rows z 2.5 / 3.5 / 4.5, seat top 0.45 m, x every 0.8 m); BEAN sits in Sg+(0,0,2.5).
//           Seen from behind (camera at +z) they are drawn from the BACK.
//   HELD PROPS are props.ts 3D objects; the hands are camera-ray projected onto them every frame: BEAN's screen-right
//   hand grips mugAt().handle (shots 1/4/5), Aristotle's screen-right hand holds scrollAt().pos until the sneeze,
//   Bacon's screen-left hand sits under NOTEBOOK_AT and his screen-right hand on quillAt().grip. Only the scientist's
//   pointer and the toddler's teddy are drawn in-card.
//   Exports: headAt / mouthAt / noseAt / faceDirAt / handAt (id, t, who = "bean").
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import { W, LEAD, FPS, STREET, GREECE, ENGLAND, STAGE, SHOTS, SNEEZES, V3, smooth, clamp01, shotStart, camAt, doorAt, noseAt as noseState, baconAt, bannerAt } from "./story";
import { NERVES_HOOKS } from "./nerves";
import { mugAt, scrollAt, quillAt, NOTEBOOK_AT } from "./props";
import {
  Kit, Pose, Face, FaceS, P2, HandK, drawPerson, jointsOf, lerp2, fxAh, fxAchoo, fxGlare, fxHeat, fxSweat, fxSparkle, fxMark, fxMotion, fxStreak, fxTwitch,
  fxDrop, fxScroll, fxCoffee, fxHalo,
} from "./fx";

export const CAST_DRAWS = { mug: false, scroll: false, notebook: false, quill: false, pointer: true, teddy: true };
export type CastId = "bean" | "aristotle" | "bacon" | "sci" | "dad" | "mum" | "kid1" | "kid2" | "kid3" | "kid4" | `aud${number}`;

// ---------------- the cast (all new designs) ----------------
const KITS: Record<string, Kit> = {
  bean: { seed: 21, skin: "#ffdcbc", hair: "#d8642a", hairStyle: "bed", top: "gown", topCol: "#3a6fd8", topCol2: "#fbeed2", trim: "#ffb238", legs: "#ffd0dc", legs2: "#ff7fa8", shoes: "duck", shoeCol: "#ffd23f", freckles: true, hem: 790 },
  aristotle: { seed: 52, skin: "#f2c49c", hair: "#f4f1ea", hairStyle: "bald", top: "toga", topCol: "#f6efe0", topCol2: "#4f7fc8", trim: "#e8b83a", legs: "#f6efe0", legs2: "#f6efe0", shoes: "sandal", shoeCol: "#8a5a2a", beard: "long", beardCol: "#f4f1ea", browCol: "#f6f3ee", noseKind: "bulb", noseK: 1.15, laurel: true, tw: 92 },
  bacon: { seed: 63, skin: "#f4d0b0", hair: "#6a4a30", hairStyle: "under", top: "doublet", topCol: "#2e2a3a", topCol2: "#b03040", trim: "#e8c45a", legs: "#2e2a3a", legs2: "#d8d4dc", shoes: "buckle", shoeCol: "#1e1a22", beard: "goatee", beardCol: "#7a5434", ruff: true, hat: "tall", noseKind: "long" },
  sci: { seed: 78, skin: "#f0c8a0", hair: "#5a3420", hairStyle: "afro", top: "tweed", topCol: "#8a5a34", topCol2: "#f4ead0", trim: "#ffb03a", tie: "#d8602a", legs: "#6a3a28", legs2: "#6a3a28", shoes: "chunky", shoeCol: "#4a2a1a", glasses: "#3a2a20", tache: "#5a3420", badge: true, noseKind: "bulb" },
  dad: { seed: 84, skin: "#ffd8b8", hair: "#d8642a", hairStyle: "short", top: "pyjama", topCol: "#3a74c8", topCol2: "#cfe2ff", trim: "#ffffff", legs: "#3a74c8", legs2: "#cfe2ff", shoes: "slipper", shoeCol: "#7a4a2a", tache: "#d8642a", tw: 94, noseKind: "bulb" },
  mum: { seed: 91, skin: "#f8d4b4", hair: "#6a3a24", hairStyle: "bun", top: "gown", topCol: "#ff8fb8", topCol2: "#fff4f8", trim: "#ffe066", legs: "#b8a0ff", legs2: "#ffffff", shoes: "slipper", shoeCol: "#ff6fa8", lashes: true, bow: "#7ad0ff", hem: 830 },
  kid1: { seed: 101, skin: "#ffdcbc", hair: "#d8642a", hairStyle: "pigtails", top: "pyjama", topCol: "#8a5ad8", topCol2: "#a87ae8", trim: "#ffd23f", legs: "#8a5ad8", legs2: "#ffd23f", shoes: "slipper", shoeCol: "#ffd23f", headK: 1.34, legW: 1.25, freckles: true, lashes: true, bow: "#ffd23f" },
  kid2: { seed: 113, skin: "#f6d0ae", hair: "#5a3420", hairStyle: "spiky", top: "tee", topCol: "#e8463c", topCol2: "#ffffff", trim: "#2ec4b6", legs: "#3a5aa8", legs2: "#3a5aa8", shorts: true, shoes: "trainer", shoeCol: "#f4f4f4", headK: 1.36, legW: 1.3 },
  kid3: { seed: 127, skin: "#ffdcbc", hair: "#e0702e", hairStyle: "curly", top: "dress", topCol: "#ff5a6a", topCol2: "#ffffff", trim: "#ffffff", legs: "#ff5a6a", legs2: "#ff5a6a", shoes: "slipper", shoeCol: "#ff8fb1", headK: 1.4, legW: 1.3, bow: "#7ad0ff", freckles: true, lashes: true, hem: 770 },
  kid4: { seed: 139, skin: "#f6d0ae", hair: "#6a3a24", hairStyle: "tuft", top: "romper", topCol: "#5ac8a8", topCol2: "#ffe066", trim: "#ffe066", legs: "#5ac8a8", legs2: "#5ac8a8", shoes: "onesie", shoeCol: "#5ac8a8", headK: 1.5, legW: 1.4, tw: 84, noseK: 0.9 },
};
// the 1978 audience: wide lapels, big hair, mustard + brown + teal
const AUD_HAIR: Kit["hairStyle"][] = ["afro", "bob", "short", "long", "curly", "bald", "bun", "spiky", "afro", "long", "short", "curly", "bob", "short", "afro", "long"];
const AUD_HC = ["#3a2418", "#c89048", "#5a3420", "#e8c070", "#2a1a14", "#d8d0c8", "#8a4a2a", "#1a1414", "#6a4228", "#a8602a", "#4a2c1c", "#d89048", "#2a1a14", "#9a9088", "#5a3420", "#e0a050"];
const AUD_TOP = ["#c8962a", "#8a5a34", "#2a8a8a", "#c8562a", "#6a4a8a", "#4a7a3a", "#a83a3a", "#3a5a9a"];
const AUD_SKIN = ["#ffd8b8", "#f0c090", "#c98d62", "#ffe0c4", "#a8704a", "#f6d0ae"];
for (let i = 0; i < 16; i++) KITS[`aud${i}`] = {
  seed: 200 + i * 7, skin: AUD_SKIN[i % 6], hair: AUD_HC[i], hairStyle: AUD_HAIR[i], top: i % 3 === 1 ? "jumper" : "jacket", topCol: AUD_TOP[i % 8], topCol2: i % 2 ? "#f4ead0" : "#d8e8f4",
  trim: AUD_TOP[(i + 3) % 8], tie: i % 3 === 0 ? AUD_TOP[(i + 5) % 8] : undefined, legs: "#4a3a30", legs2: "#4a3a30", shoes: "chunky", shoeCol: "#3a2418", glasses: i % 4 === 2 ? "#2a2a2a" : undefined,
};
const IDX: Record<string, number> = { bean: 1, aristotle: 2, bacon: 3, sci: 4, dad: 5, mum: 6, kid1: 7, kid2: 8, kid3: 9, kid4: 10 };

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
/** sets: doorway z -1.45, threshold floor y 0.30 (z -1.5..-0.9), step y 0.15 (z -0.9..-0.6), pavement y 0 */
export const DOOR_Y = 0.3;
export const DOOR_Z = -1.45;
/** street floor height under a card at local z (feet step down smoothly over ~8 cm at each riser) */
export const floorY = (z: number) => { const l = z - STREET[2]; return STREET[1] + 0.15 * (1 - smooth((l + 0.94) / 0.08)) + 0.15 * (1 - smooth((l + 0.64) / 0.08)); };
export const BEAN_STREET: V3 = at(STREET, 0, 0, 0);
export const ARISTOTLE: V3 = at(GREECE, 0, 0, 0);
export const BACON: V3 = at(ENGLAND, 0, 0, 0);
/** the stage deck top (sets): the scientist stands on it behind the podium */
export const STAGE_Y = 0.6;
export const SCIENTIST: V3 = at(STAGE, 2.7, STAGE_Y, -0.8);
/** shot 6 spots (STREET-relative) + card scale */
export const FAMILY: Record<string, { at: V3; sc: number }> = {
  // = the sets owner's pavement spots
  dad: { at: at(STREET, -0.95, 0, 0.3), sc: 1.04 }, mum: { at: at(STREET, 0.95, 0, 0.3), sc: 0.97 },
  kid1: { at: at(STREET, -1.65, 0, 1.25), sc: 0.66 }, kid2: { at: at(STREET, -0.55, 0, 1.45), sc: 0.6 },
  kid3: { at: at(STREET, 0.55, 0, 1.45), sc: 0.55 }, kid4: { at: at(STREET, 1.65, 0, 1.25), sc: 0.44 },
};
const FAM_ORDER = ["dad", "mum", "kid1", "kid2", "kid3", "kid4"];
/** audience seats (STAGE-relative card origins on the floor, seat top 0.45 m) */
export const SEAT_Y = 0.45;
export const SEATS: V3[] = [
  ...[-2.4, -1.6, -0.8, 0, 0.8, 1.6, 2.4].map((x) => at(STAGE, x, 0, 2.5)),
  ...[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((x) => at(STAGE, x, 0, 3.5)),
  ...[-1.6, -0.8, 0.8, 1.6].map((x) => at(STAGE, x, 0, 4.5)),
];
export const BEAN_SEAT: V3 = at(STAGE, 0, 0, 2.5);

// ---------------- helpers ----------------
const on = (t: number, w: number) => t >= w - LEAD;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const faceAt = (t: number, keys: [number, Face][]) => { let e = keys[0][1]; for (const [w, f] of keys) if (on(t, w)) e = f; return e; };
const frameNo = (t: number) => Math.round(t * FPS);
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
    drop: m(a.drop, b.drop), lean: m(a.lean, b.lean), headTilt: m(a.headTilt, b.headTilt), shrug: m(a.shrug, b.shrug), shake: m(a.shake, b.shake),
    headDy: m(a.headDy, b.headDy), flare: m(a.flare, b.flare), slosh: m(a.slosh, b.slosh),
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
const qp = (P: P2): P2 => [q(P[0], 2), q(P[1], 2)];
type Vp = { x: number; y: number; z: number };
/** camera position of the frame being built (set by rigsAt) */
let CP: Vp = { x: 0, y: 1.5, z: 5 };
/** camera-ray projection of world point P onto the camera-facing card standing at A with scale sc (canvas units) */
const proj = (A: V3, P: V3, sc = 1): P2 => {
  const cp = CP, yaw = Math.atan2(cp.x - A[0], cp.z - A[2]), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const s = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * s, Qy = cp.y + dy * s, Qz = cp.z + dz * s;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / (SU * sc), 2), q(975 - ly / (SU * sc), 2)];
};

// ---------------- poses ----------------
const STAND: [P2, P2] = [[258, 948], [342, 948]];
const REST: [P2, P2] = [[208, 616], [392, 616]];
const stand = (): Pose => ({ feet: STAND, hands: REST, hk: ["rest", "rest"] });
/** BEAN's card origin per shot (shot 1 = props' beanBase: out of the door plane z -1.2 to 0 with doorAt.step) */
const beanA = (id: number, t: number): V3 => { if (id !== 1) return BEAN_STREET; const z = STREET[2] - 1.2 * (1 - doorAt(1, t).step); return [STREET[0], floorY(z), z]; };
/** BEAN's screen-right hand gripping the props mug handle */
let MUGP: P2 = [390, 560];
const beanBase = (): Pose => ({ feet: STAND, hands: [REST[0], MUGP], hk: ["rest", "grip"], ha: [null, Math.PI * 0.5], front: [false, true] });
/** walking on the spot (feet lift alternately, a little body bob); u in steps */
const walkMod = (pose: Pose, u: number, amt: number): Pose => {
  if (amt <= 0) return pose;
  const ph = u * Math.PI, l = Math.max(0, Math.sin(ph)) * 22 * amt, r = Math.max(0, -Math.sin(ph)) * 22 * amt;
  return { ...pose, feet: [[pose.feet[0][0], q(pose.feet[0][1] - l, 2)], [pose.feet[1][0], q(pose.feet[1][1] - r, 2)]], drop: q((pose.drop ?? 0) + 5 * amt * Math.abs(Math.sin(ph)), 2), headTilt: q((pose.headTilt ?? 0) + 2.5 * amt * Math.sin(ph), 4) };
};
const SEAT_KNEES: [P2, P2] = [[238, 778], [362, 778]], SEAT_FEET: [P2, P2] = [[250, 946], [350, 946]], DC = 148;
const seated = (): Pose => ({ feet: SEAT_FEET, knees: SEAT_KNEES, hands: [[258, 722], [342, 722]], hk: ["rest", "rest"], front: [true, true], drop: DC });

// ---------------- sneezes (SNEEZES: build-up "ah... ah..." then the blast) ----------------
type Sn = { ph: 0 | 1 | 2 | 3; k: number; tb: number; size: number; u: number; b: number };
const BUILD = (size: number) => (size >= 1 ? 1.0 : 0.6);
const BLAST = (size: number) => (size >= 1 ? 1.1 : 0.42);
/** sneeze phase for who at t: 1 build (k 0..1 in two "ah" steps), 2 blast, 3 after (k 1 -> 0) */
export const sneezeOf = (who: string, t: number): Sn => {
  for (const [t0, w, size] of SNEEZES) {
    if (w !== who) continue;
    const b = BUILD(size), tb = t0 - LEAD, bl = BLAST(size);
    if (t >= tb - b && t < tb) { const x = (t - (tb - b)) / b; return { ph: 1, k: x < 0.5 ? 0.6 * smooth(x / 0.4) : 0.6 + 0.4 * smooth((x - 0.55) / 0.4), tb, size, u: t - tb, b }; }
    if (t >= tb && t < tb + bl) return { ph: 2, k: 1, tb, size, u: t - tb, b };
    if (t >= tb + bl && t < tb + bl + 0.9) return { ph: 3, k: 1 - smooth((t - tb - bl) / 0.9), tb, size, u: t - tb, b };
  }
  return { ph: 0, k: 0, tb: 0, size: 0, u: 0, b: 0 };
};
/** the head whip envelope after the blast (0 -> 1 in 2 frames, decays) */
const whip = (u: number) => (u < 0.06 ? smooth(u / 0.06) : Math.exp(-(u - 0.06) / 0.2));
type Rig = { who: string; kit: Kit; pose: Pose; face: FaceS; swaps: number[]; A: V3; sc: number; back?: boolean };
/** layer the sneeze onto a rig: free = the hand that goes under the nose then flings out (null = none) */
const sneezeRig = (r: Rig, t: number, free: 0 | 1 | null, dir = 1): Rig => {
  const sn = sneezeOf(r.who, t), f = frameNo(t);
  if (sn.ph === 0 || sn.ph === 3) return r;
  const pose: Pose = { ...r.pose, hands: [...r.pose.hands] as [P2, P2], hk: [...(r.pose.hk ?? ["rest", "rest"])] as [HandK, HandK], ha: [...(r.pose.ha ?? [null, null])] as [number | null, number | null], front: [...(r.pose.front ?? [false, false])] as [boolean, boolean] };
  let face: FaceS;
  if (sn.ph === 1) {
    const k = q(sn.k, 40);
    face = { e: "ahh", k, shake: f % 2, blow: 0 };
    pose.headDy = q(-10 * k, 2); pose.shrug = q((pose.shrug ?? 0) + 9 * k, 2);
    pose.shake = k > 0.7 ? (f % 2 ? 1.6 : -1.6) * k : 0;
    if (free !== null) {
      const J = jointsOf(r.kit, pose, face), s = free ? 1 : -1, g = smooth((sn.u + sn.b) / 0.25);
      const tgt: P2 = [J.nose[0] + s * 30, J.nose[1] + 22];
      pose.hands[free] = qp(lerp2(pose.hands[free], tgt, clamp01(g)));
      if (g > 0.5) { pose.hk![free] = "point"; pose.ha![free] = free ? Math.PI + 0.25 : -0.25; pose.front![free] = true; }
    }
  } else {
    const w = whip(sn.u), sz = 0.6 + 0.4 * sn.size;
    face = { e: "achoo", k: 1, blow: q(0.6 * w, 10) };
    pose.headDy = q(24 * w * sz, 2); pose.drop = q((pose.drop ?? 0) + 14 * w * sz, 2); pose.headTilt = q((pose.headTilt ?? 0) + 8 * w * dir, 4);
    pose.shrug = q((pose.shrug ?? 0) - 5 * w, 2); pose.flare = q(Math.max(pose.flare ?? 0, w * sn.size), 20);
    pose.slosh = q(Math.max(pose.slosh ?? 0, 0.9 * w), 20);
    if (free !== null) { const s = free ? 1 : -1; pose.hands[free] = qp(lerp2(pose.hands[free], [300 + s * 176, 380], smooth(w * 2))); pose.hk![free] = "open"; pose.ha![free] = free ? -0.5 : Math.PI + 0.5; pose.front![free] = false; }
  }
  return { ...r, pose, face, swaps: r.swaps };
};

// ---------------- rigs ----------------
const BEAN = (pose: Pose, face: FaceS, swaps: number[], A: V3 = BEAN_STREET): Rig => ({ who: "bean", kit: KITS.bean, pose, face, swaps, A, sc: 1 });
/** shot 1: out of the dark doorway into the blinding sunrise, squint, ah.. ah.. ACHOO, sniff, "maybe you're one of them" */
const bean1 = (t: number): Rig => {
  const d = doorAt(1, t);
  MUGP = proj(beanA(1, t), mugAt(1, t).handle);
  let pose = walkMod(beanBase(), (t - 0.1) / 0.3, d.step > 0 && d.step < 1 ? Math.min(1, d.step * 6, (1 - d.step) * 6) : 0);
  pose = segPose(t, [
    [-9, () => pose],
    [W.maybe - 0.3, () => ({ ...beanBase(), hands: [[162, 452], MUGP], hk: ["point", "grip"], ha: [-Math.PI + 0.75, Math.PI * 0.5] })], // "maybe you're one of them": points at the viewer
  ], 0.3);
  const e = faceAt(t, [[-9, "sleepy"], [0.62, "squint"], [W.sneeze0 + 0.45, "sniffy"], [W.maybe - 0.1, "knowing"]]);
  const r = BEAN(pose, { e, look: e === "knowing" ? [0, 0.2] : undefined }, [0.62, W.sneeze0 + 0.45, W.maybe - 0.1], beanA(1, t));
  return sneezeRig(r, t, 0);
};
/** shot 4: X-ray. listens, glares at the flood, confused, itchy nose, then the big build-up */
const bean4 = (t: number, id = 4): Rig => {
  MUGP = proj(BEAN_STREET, mugAt(id, t).handle);
  const nose = (pz: number): P2 => [258, 322 + pz];
  const pose = segPose(t, [
    [-9, (u) => ({ ...beanBase(), hands: [[148, q(300 + 4 * Math.sin(u * 3), 2)], MUGP], hk: ["point", "grip"], ha: [-Math.PI / 2 + 0.35, Math.PI * 0.5] })],
    [W.nerveA - 0.4, () => beanBase()],
    [W.bright - 0.3, () => ({ ...beanBase(), hands: [[248, 238], MUGP], hk: ["open", "grip"], ha: [0, Math.PI * 0.5], front: [true, true] })], // hand shading the eyes
    [W.mixes - 0.3, (u) => ({ ...beanBase(), hands: [[q(190 - 3 * Math.sin(u * 18), 2), 214], MUGP], hk: ["fist", "grip"] })], // scratching his head
    [W.light1 - 0.3, () => ({ ...beanBase(), hands: [nose(-2), MUGP], hk: ["point", "grip"], ha: [-0.25, Math.PI * 0.5], front: [true, true] })],
  ], 0.3);
  const e = faceAt(t, [[-9, "curious"], [W.crossed - 0.1, "intrigued"], [W.nerveA - 0.2, "listen"], [W.bright - 0.25, "glare"], [W.mixes - 0.1, "confused"], [W.light1 - 0.1, "itchy"]]);
  const f = frameNo(t), tw = e === "itchy" ? q(Math.sin(t * 34) * (0.6 + 0.4 * Math.sin(t * 5)), 4) : 0;
  return sneezeRig(BEAN(pose, { e, twitch: tw, shake: f % 2 }, [W.crossed - 0.1, W.nerveA - 0.2, W.bright - 0.25, W.mixes - 0.1, W.light1 - 0.1]), t, 0);
};
const MEME_T = W.achoo;
/** shot 5: THE MEME FACE. the colossal ACHOO (hair blown back, cheeks puffed, eyes squeezed, mug flung, gown flapping) */
const bean5 = (t: number): Rig => {
  const sn = sneezeOf("bean", t);
  if (sn.ph === 1) return sneezeRig(bean4(t, 5), t, 0); // the last frames of the inhale
  MUGP = proj(BEAN_STREET, mugAt(5, t).handle);
  const f = frameNo(t), m = smooth((t - (MEME_T - LEAD)) / 0.07), rec = smooth((t - (MEME_T + 1.05)) / 0.45);
  const k = q(Math.min(1.12, smooth((t - (MEME_T - LEAD)) / 0.08) * (1 + 0.12 * Math.sin(clamp01((t - MEME_T) / 0.25) * Math.PI))), 50);
  const meme: Pose = {
    feet: [[226, 948], [374, 948]], hands: [[144, q(296 + 6 * (f % 2), 2)], MUGP], hk: ["open", "grip"], ha: [-2.45, Math.PI * 0.5], front: [false, true],
    drop: q(22 * m, 2), headDy: q(10 * m, 2), shake: m * 3.2 * (f % 2 ? 1 : -1), flare: q(m, 20), shrug: 6, lean: 0, headTilt: q(m * 3 * Math.sin(t * 40), 4),
  };
  const calm: Pose = { ...beanBase(), flare: 0.25, headTilt: 4 };
  const pose = mixPose(meme, calm, rec);
  const face: FaceS = rec < 0.5 ? { e: "meme", k: rec > 0 ? 1 : k, shake: f % 6 } : { e: "phew", blow: q(0.6 * (1 - rec), 10) };
  return BEAN(pose, face, [MEME_T + 1.25]);
};
/** shot 7: BEAN in the front row, watching (from behind), then sneezes on cue */
const bean7 = (t: number): Rig => {
  const pose: Pose = { ...seated(), hands: [[262, 712], [338, 712]] };
  const e = faceAt(t, [[-9, "curious"], [W.official, "intrigued"], [W.achoo2 + 0.5, "phew"]]);
  const r: Rig = { who: "bean", kit: KITS.bean, pose, face: { e, look: [0, -1] }, swaps: [W.official, W.achoo2 + 0.5], A: BEAN_SEAT, sc: 1 };
  return sneezeRig(r, t, 1);
};

/** shot 2: Aristotle strokes his beard, has a theory, the sun heats his nose, it sweats ... ACHOO, the scroll flies */
const aristotle2 = (t: number): Rig => {
  const ns = noseState(2, t), S = scrollAt(2, t), sp = proj(ARISTOTLE, S.pos);
  const held = S.held, sh: P2 = qp(lerp2([450, 360], sp, held)); // the scroll hand (screen-right), flung open as the scroll flies
  const pose = segPose(t, [
    [-9, (u) => ({ feet: STAND, hands: [[q(268 - 8 * Math.sin(u * 5), 2), q(436 + 10 * Math.abs(Math.sin(u * 5)), 2)], sh], hk: ["rest", "grip"], front: [true, true] })], // strokes his beard
    [W.theory - 0.3, () => ({ feet: STAND, hands: [[164, 262], sh], hk: ["point", "grip"], ha: [-Math.PI / 2 + 0.1, null], front: [false, true] })], // a finger up: a theory!
    [W.heats - 0.4, () => ({ feet: STAND, hands: [[228, 352], sh], hk: ["point", "grip"], ha: [-0.35, null], front: [true, true] })], // points at his own nose
    [W.sweats - 0.3, () => ({ feet: STAND, hands: [[196, 540], sh], hk: ["open", "grip"], ha: [Math.PI + 0.3, null], front: [false, true] })],
  ], 0.3);
  pose.hands = [pose.hands[0], sh];
  if (held < 0.5) { pose.hk = [pose.hk?.[0] ?? "rest", "open"]; pose.ha = [pose.ha?.[0] ?? null, -0.5]; pose.front = [pose.front?.[0] ?? false, false]; }
  else pose.ha = [pose.ha?.[0] ?? null, -Math.PI / 2];
  const e = faceAt(t, [[-9, "wise"], [W.theory - 0.1, "idea"], [W.heats - 0.25, "cross"], [W.sweats - 0.15, "uhoh"], [W.sneeze1 + 0.42, "dazed"]]);
  const r: Rig = { who: "aristotle", kit: KITS.aristotle, pose, face: { e, red: q(ns.heat, 20), shake: frameNo(t) % 2 }, swaps: [W.theory - 0.1, W.heats - 0.25, W.sneeze1 + 0.42], A: ARISTOTLE, sc: 1 };
  const out = sneezeRig(r, t, 0, -1);
  out.face = { ...out.face, red: q(Math.max(ns.heat * (out.face.e === "achoo" ? 0.6 : 1), out.face.red ?? 0), 20) };
  return out;
};
/** shot 3: Bacon writes, faces the sun with his eyes closed, heat but no sneeze (smug), "it's your eyes": eyes open -> glare */
const bacon3 = (t: number): Rig => {
  const bs = baconAt(3, t);
  const nb = proj(BACON, [NOTEBOOK_AT[0], NOTEBOOK_AT[1] - 0.07, NOTEBOOK_AT[2]]), qg = proj(BACON, quillAt(3, t).grip);
  const pose: Pose = { feet: STAND, hands: [qp(nb), qp(qg)], hk: ["rest", "grip"], ha: [0, -2.2], front: [true, true], headTilt: q(-3 * smooth((t - (W.faced - 0.3)) / 0.4) * (1 - smooth((t - W.eyes0) / 0.3)), 4) };
  let e = faceAt(t, [[-9, "focus"], [W.faced - 0.2, "curious"], [W.closed - 0.2, "serene"], [W.heat - 0.15, "warm"], [W.wasnt - 0.1, "smug"]]);
  if (bs.closed < 0.5 && on(t, W.eyes0 - 0.25)) e = "glare";
  const tw = e === "glare" ? q(Math.sin(t * 30) * smooth((t - W.eyes0) / 0.3), 4) : 0;
  return { who: "bacon", kit: KITS.bacon, pose, face: { e, look: e === "curious" ? [0.5, -1] : undefined, twitch: tw }, swaps: [W.faced - 0.2, W.heat - 0.15, W.wasnt - 0.1], A: BACON, sc: 1 };
};

// ---- shot 6: the family ----
/** world spot of family member i walking out (s 0..1) from the hallway queue through the door */
const famPos = (who: string, t: number): { A: V3; walk: number; s: number } => {
  const i = FAM_ORDER.indexOf(who), T = FAMILY[who].at, t0 = shotStart(6) - 0.15 + i * 0.22, dur = 0.85 + 0.1 * i;
  const s = smooth((t - t0) / dur);
  const Q: V3 = [STREET[0] + (i % 2 ? 0.1 : -0.1), DOOR_Y, STREET[2] + DOOR_Z - 0.35 - 0.34 * i], D: V3 = [STREET[0], DOOR_Y, STREET[2] + DOOR_Z + 0.3];
  const l1 = Math.hypot(D[0] - Q[0], D[2] - Q[2]), l2 = Math.hypot(T[0] - D[0], T[2] - D[2]), sp = l1 / (l1 + l2);
  const A: V3 = s < sp ? lerp3(Q, D, s / sp) : lerp3(D, T, (s - sp) / (1 - sp));
  A[1] = floorY(A[2]);
  return { A, walk: s > 0 && s < 1 ? Math.min(1, s * 8, (1 - s) * 8) : 0, s };
};
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const family6 = (who: string, t: number): Rig => {
  const { A, walk, s } = famPos(who, t), kit = KITS[who], sc = FAMILY[who].sc, i = FAM_ORDER.indexOf(who);
  const arrive = shotStart(6) - 0.15 + i * 0.22 + 0.85 + 0.1 * i;
  let pose = walkMod(stand(), (t - arrive) / 0.28, walk);
  if (who === "kid4") pose = { ...pose, hands: [[232, 560], REST[1]], hk: ["grip", "rest"], hold: ["teddy", null], front: [true, false] };
  if (who === "dad") pose = segPose(t, [[-9, () => pose], [W.parent - 0.3, () => ({ ...stand(), hands: [REST[0], [330, 520]], hk: ["rest", "thumb"], front: [false, true] })], [W.parent + 1.3, () => pose]], 0.3); // "if one parent has it": thumb to his chest
  if (who === "mum") pose = segPose(t, [[-9, () => pose], [W.fifty - 0.3, () => ({ ...stand(), hands: [[282, 520], [318, 520]], hk: ["rest", "rest"], front: [true, true] })]], 0.3); // hands clasped, watching the kids
  const sneezer = who !== "kid2" && who !== "kid4";
  const myT = SNEEZES.find((x) => x[1] === who)?.[0] ?? 99;
  let e: Face = s < 0.6 ? "sleepy" : "squint";
  const swaps: number[] = [];
  if (sneezer) {
    if (on(t, myT + 0.42)) e = who === "dad" ? "proud" : who === "mum" ? "happy" : "beam";
    swaps.push(myT + 0.42);
    if (who === "dad" && on(t, W.parent - 0.1) && !on(t, W.parent + 1.3)) e = "proud";
  } else {
    const q0 = who === "kid2" ? W.fifty + 0.2 : W.chance + 0.35;
    if (on(t, q0)) e = "puzzled";
    swaps.push(q0);
  }
  const look: P2 | undefined = e === "puzzled" ? [who === "kid2" ? -1 : -1, 0.2] : undefined;
  const r: Rig = { who, kit, pose, face: { e, look }, swaps, A, sc };
  return sneezeRig(r, t, sneezer ? (i % 2 ? 0 : 1) : null, i % 2 ? -1 : 1);
};

// ---- shot 7: the 1978 conference ----
const sci7 = (t: number): Rig => {
  const ban = bannerAt(7, t), f = frameNo(t);
  const wordA = (w: number) => -2.75 + 0.8 * clamp01((w - 0.5) / 4); // the banner is to his left (he stands at x +2.7): the pointer sweeps its words left -> right
  const pose = segPose(t, [
    [-9, () => ({ feet: STAND, hands: [[150, 392], [450, 392]], hk: ["open", "grip"], ha: [-2.4, -0.4], hold: [null, "pointer"] })], // "here's the best part!"
    [W.official - 0.35, () => ({ feet: STAND, hands: [[214, 600], [420, 330]], hk: ["rest", "grip"], ha: [null, -2.5], hold: [null, "pointer"] })],
    [W.autosomal - 0.2, () => ({ feet: STAND, hands: [[214, 600], [420, 318]], hk: ["rest", "grip"], ha: [null, q(wordA(ban.words), 50)], hold: [null, "pointer"] })],
    [W.short - 0.3, () => ({ feet: STAND, hands: [[256, 560], [396, 600]], hk: ["rest", "grip"], ha: [null, -0.9], hold: [null, "pointer"], lean: 0.04, front: [true, false] })], // "or for short...": leans to the mic
    [W.achoo2 + 0.12, () => ({ feet: STAND, hands: [[160, 340], [440, 340]], hk: ["open", "grip"], ha: [-2.3, -0.7], hold: [null, "pointer"], lean: -0.05, drop: 6 })], // blown back
    [W.achoo2 + 1.2, () => ({ feet: STAND, hands: [[214, 600], [418, 470]], hk: ["rest", "thumb"], hold: [null, null] })], // bless you: thumbs up
  ], 0.22);
  const e = faceAt(t, [[-9, "excited"], [W.official - 0.1, "beam"], [W.autosomal - 0.1, "proud"], [W.short - 0.1, "sly"], [W.achoo2 + 0.12, "shocked"], [W.achoo2 + 1.2, "grin"]]);
  const hit = smooth((t - (W.achoo2 + 0.1)) / 0.08) * (1 - smooth((t - (W.achoo2 + 0.5)) / 0.7));
  return { who: "sci", kit: KITS.sci, pose, face: { e, blow: q(hit, 10), shake: f % 2 }, swaps: [W.official - 0.1, W.autosomal - 0.1, W.short - 0.1, W.achoo2 + 1.2], A: SCIENTIST, sc: 1 };
};
const audience7 = (t: number): Rig[] => {
  const out: Rig[] = [];
  const hit = (x: number, z: number) => { const d = Math.hypot(x - BEAN_SEAT[0], z - BEAN_SEAT[2]); return d < 1.3 ? smooth((t - (W.achoo2 + 0.04 + d * 0.06)) / 0.08) * (1 - smooth((t - (W.achoo2 + 0.6)) / 0.8)) : 0; };
  let n = 0;
  SEATS.forEach((A) => {
    if (A[0] === BEAN_SEAT[0] && A[2] === BEAN_SEAT[2]) return;
    const i = n++, kit = KITS[`aud${i % 16}`], h = hit(A[0], A[2]), side = A[0] < BEAN_SEAT[0] ? -1 : 1;
    const nod = Math.sin(t * 1.3 + i * 1.7) > 0.96 ? 3 : 0; // the odd little nod
    const pose: Pose = { ...seated(), lean: q(side * 0.16 * h, 50), headDy: nod, headTilt: q(side * 8 * h, 2) };
    out.push({ who: `aud${i}`, kit, pose, face: { e: h > 0.3 ? "shocked" : "curious", look: [0, -1], blow: q(h, 5) }, swaps: [], A, sc: 1 });
  });
  return out;
};

const rigsAt = (id: number, t: number, cp: Vp): Rig[] => {
  CP = cp;
  if (id === 1) return [bean1(t)];
  if (id === 2) return [aristotle2(t)];
  if (id === 3) return [bacon3(t)];
  if (id === 4) return [bean4(t)];
  if (id === 5) return [bean5(t)];
  if (id === 6) return FAM_ORDER.map((w) => family6(w, t));
  return [sci7(t), bean7(t), ...audience7(t)];
};

// ---------------- frames / exported contracts ----------------
type Frame = { o: V3; c: number; s: number; yaw: number; sc: number; back: boolean };
/** who faces the stage (-z) in shot 7: seen from behind when the camera is behind them */
const facesStage = (id: number, who: string) => id === 7 && who !== "sci";
const frameOf = (cp: Vp, A: V3, sc: number, id: number, who: string): Frame => {
  const yaw = Math.atan2(cp.x - A[0], cp.z - A[2]);
  return { o: A, c: Math.cos(yaw), s: Math.sin(yaw), yaw, sc, back: facesStage(id, who) && cp.z > A[2] };
};
const toWorld = (F: Frame, P: P2, fwd = 0): V3 => {
  const lx = (P[0] - 300) * SU * F.sc, ly = (975 - P[1]) * SU * F.sc;
  return [F.o[0] + F.c * lx + F.s * fwd, F.o[1] + ly, F.o[2] - F.s * lx + F.c * fwd];
};
const camPosAt = (id: number, t: number): Vp => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, Math.round(t * FPS)))).pos; return { x: c[0], y: c[1], z: c[2] }; };
const NOWHERE: V3 = [0, -100, 0];
const withRig = (id: number, t: number, who: string, fn: (r: Rig, F: Frame, J: ReturnType<typeof jointsOf>) => V3): V3 => {
  const cp = camPosAt(id, t), r = rigsAt(id, t, cp).find((x) => x.who === who);
  if (!r) return NOWHERE;
  return fn(r, frameOf(cp, r.A, r.sc, id, who), jointsOf(r.kit, r.pose, r.face));
};
/** world head centre. BEAN standing ~St+(0,1.458,0); seated in the front row ~Sg+(0,1.14,2.5) */
export const headAt = (id: number, t: number, who: string = "bean"): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.head, 0.02));
/** world mouth point (on the FACE side: in front of a front card, behind a card seen from the back) */
export const mouthAt = (id: number, t: number, who: string = "bean"): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.mouth, F.back ? -0.14 : 0.05));
/** world nose tip */
export const noseAt = (id: number, t: number, who: string = "bean"): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.nose, F.back ? -0.16 : 0.06));
/** unit direction the face points (the sneeze blast direction): toward the camera, or toward the stage (-z) from behind */
export const faceDirAt = (id: number, t: number, who: string = "bean"): V3 => withRig(id, t, who, (_r, F) => (F.back ? [0, 0, -1] : [F.s, 0, F.c]));
/** world hand point: side 0 = screen-left, 1 = screen-right */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => withRig(id, t, who, (_r, F, J) => toWorld(F, J.hands[side], 0.04));
NERVES_HOOKS.head = (id, t) => (id === 4 || id === 5 ? headAt(id, t, "bean") : undefined);

// ---------------- drawing ----------------
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const drawRig = (out: Stage, r: Rig, t: number, cam: CamInfo, id: number): Frame => {
  const F = frameOf(cam.pos, r.A, r.sc, id, r.who);
  const d = cam.pos.distanceTo(new THREE.Vector3(r.A[0], r.A[1] + 1.2 * r.sc, r.A[2])) / r.sc;
  const [w, h, k] = tier(d);
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  const light = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
  const lid = F.back ? 0 : q(lidAt(t, (IDX[r.who] ?? 11) * 7, r.swaps), 2);
  const pose = r.pose, face = r.face, kit = r.kit, back = F.back;
  out.places.push({
    key: `sn|${r.who}|${back ? "B" : "F"}|${fkey(pose)}|${fkey(face)}|${lid}|${q(light, 10)}`,
    draw: (p) => drawPerson(p, kit, pose, face, light, lid, back),
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
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.25 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
const at3 = (P: V3, R: V3, U: V3, N: V3, x: number, y: number, z: number) => add(add(add(P, R, x), U, y), N, z);
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
const sparkBurst = (out: Stage, t: number, t0: number, C: V3, cam: CamInfo, r0: number, r1: number, size = 0.1) => {
  const u = (t - t0) / 0.7;
  if (u < 0 || u > 1) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < 10; j++) {
    const a = (j / 10) * Math.PI * 2 + 0.3, r = r0 + (r1 - r0) * smooth(u), s = size * Math.sin(Math.PI * u) * (j % 2 ? 0.7 : 1);
    const col = j % 2 ? "#fff6a8" : "#bfe9ff";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, Math.cos(a) * r, Math.sin(a) * r, 0.18), s, s, { rot: u * 2 + j });
  }
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0 - LEAD, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), [P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
/** squint/glare lines fanning out beside the eyes (toward the sun side) */
const glare = (out: Stage, t: number, t0: number, t1: number, eyes: [V3, V3], cam: CamInfo, size: number) => {
  const k = env(t, t0, t1, 0.15, 0.25);
  if (k < 0.02) return;
  const { R, U, N } = camVecs(cam, eyes[0]), f = frameNo(t);
  for (const sd of [0, 1] as const) {
    const s = size * k * (f % 4 < 2 ? 1 : 0.92);
    fxCard(out, "glare", 256, 256, fxGlare, at3(eyes[sd], R, U, N, (sd ? 1 : -1) * size * 0.75, size * 0.18, 0.08), s, s, { rot: sd ? 0.25 : Math.PI - 0.25 });
  }
};
const AH_COL = "#fff1a8";
/** "ah..." "ah..." "AH...!" climbing beside the head during a build-up (shrinks away at the blast) */
const ahs = (out: Stage, t: number, sn: Sn, head: V3, cam: CamInfo, size: number, big = false) => {
  if (sn.ph !== 1 && !(sn.ph === 2 && sn.u < 0.15)) return;
  const { R, U, N } = camVecs(cam, head), words = big ? ["ah...", "ah...", "AH...!"] : ["ah...", "AH..."];
  words.forEach((w, i) => {
    const t0 = sn.tb - sn.b + (i * sn.b) / words.length, k = env(t, t0, sn.tb - 0.02, 0.14, 0.12);
    if (k < 0.02) return;
    const s = size * (0.75 + 0.25 * i) * k, side = i % 2 ? 1 : -1;
    fxCard(out, `ah|${w}`, 512, 256, (p) => fxAh(p, w, AH_COL), at3(head, R, U, N, side * size * 0.95, size * (0.38 + 0.3 * i), 0.2), s, s * 0.5, { rot: side * -0.1 + 0.03 * Math.sin(t * 20) });
  });
};
const ACHOO_COLS: Record<string, string> = { bean: "#ff6a3a", aristotle: "#ff8a2a", dad: "#3fa0ff", mum: "#ff5a9a", kid1: "#a86aff", kid3: "#ff4a5a" };
/** the "ACHOO!" burst + whip motion arcs at a blast */
const blastFx = (out: Stage, t: number, who: string, sn: Sn, head: V3, mouth: V3, cam: CamInfo, size: number, word = "ACHOO!") => {
  if (sn.ph !== 2 && sn.ph !== 3) return;
  const { R, U, N } = camVecs(cam, head), k = env(t, sn.tb, sn.tb + 0.55, 0.1, 0.3), side = hh(IDX[who] ?? 3, 2) > 0.5 ? 1 : -1;
  if (k > 0.02) fxCard(out, `achoo|${word}|${who}`, 800, 480, (p) => fxAchoo(p, word, ACHOO_COLS[who] ?? "#ff6a3a", IDX[who] ?? 3), at3(head, R, U, N, side * size * 0.55, size * 0.62 + 0.05 * (t - sn.tb), 0.22), size * 1.1 * k, size * 0.66 * k, { rot: side * -0.12 });
  const m = env(t, sn.tb, sn.tb + 0.25, 0.05, 0.2);
  if (m > 0.02) for (const sd of [-1, 1]) fxCard(out, "motion", 256, 256, fxMotion, at3(head, R, U, N, sd * size * 0.62, size * 0.1, 0.1), 0.32 * size * m, 0.32 * size * m, { rot: sd > 0 ? 0.3 : Math.PI - 0.3 });
};
const heatFx = (out: Stage, t: number, P: V3, cam: CamInfo, k: number, size: number) => {
  if (k < 0.03) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 2; j++) {
    const ph = (t * 0.9 + j * 0.5) % 1, s = size * k * Math.sin(Math.PI * ph), v = q((t * 3) % (Math.PI * 2), 4);
    fxCard(out, `heat|${v}`, 192, 256, (p) => fxHeat(p, v), at3(P, R, U, N, (j ? 1 : -1) * size * 0.55, size * 0.1 + ph * size * 0.5, 0.12), s * 0.75, s, {});
  }
};
const sweatDrip = (out: Stage, t: number, from: number, P: V3, cam: CamInfo, rate: number, fall: number, size = 0.06) => {
  if (t < from) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 2; j++) {
    const ph = ((t - from) * rate + j * 0.5) % 1, k = Math.sin(Math.PI * Math.min(1, ph * 1.1)) * smooth((t - from) / 0.2);
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, (j ? 0.03 : -0.03), -fall * ph * ph, 0.1), size * k, size * 1.3 * k, {});
  }
};
const twitchFx = (out: Stage, t: number, nose: V3, cam: CamInfo, k: number, size = 0.16) => {
  if (k < 0.05 || frameNo(t) % 4 >= 2) return; // flickers on 2s, as a twitch should
  const { R, U, N } = camVecs(cam, nose);
  fxCard(out, "twitch", 256, 128, fxTwitch, at3(nose, R, U, N, 0, 0.01, 0.1), size * k, size * 0.5 * k, {});
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  for (const r of rigsAt(id, t, cam.pos)) {
    const F = drawRig(out, r, t, cam, id), J = jointsOf(r.kit, r.pose, r.face);
    const w3 = (P: P2, fwd = 0.04) => toWorld(F, P, F.back ? -fwd : fwd);
    const head = w3(J.head, 0.03), mouth = w3(J.mouth, 0.06), nose = w3(J.nose, 0.07), sc = r.sc;
    const eyes: [V3, V3] = [w3(J.eyes[0], 0.06), w3(J.eyes[1], 0.06)];
    if (!r.pose.knees) blob(out, r.A[0], r.A[1] + 0.012, r.A[2], sc, 1);
    const sn = sneezeOf(r.who, t), top = add(head, [0, (r.kit.hat ? 0.66 : r.kit.hairStyle === "afro" ? 0.52 : 0.42) * sc * (r.kit.headK ?? 1), 0]);
    if (r.who.startsWith("aud")) continue;
    // every sneeze: the "ah... ah..." build + the ACHOO burst (the peak has its own, bigger show below)
    if (!(id === 5 || (id === 4 && r.who === "bean" && sn.size >= 1))) {
      ahs(out, t, sn, head, cam, 0.34 * sc * (id === 7 ? 1.3 : 1));
      blastFx(out, t, r.who, sn, head, mouth, cam, (0.5 + 0.35 * sn.size) * sc * (id === 7 ? 1.5 : 1));
    }
    if (id === 1) {
      glare(out, t, 0.62, W.sneeze0 - 0.65, eyes, cam, 0.12);
      sparkles(out, t, W.them - 0.1, SHOTS[0].b / FPS + 0.5, w3(J.hands[1], 0.1), cam, 0.06, 3, 11, 0.06);
    } else if (id === 2) {
      const ns = noseState(2, t);
      heatFx(out, t, nose, cam, ns.heat * (sn.ph === 0 ? 1 : 0.4), 0.1);
      if (ns.sweat > 0.05 && sn.ph < 2) sweatDrip(out, t, W.sweats - 0.15, add(nose, [0, -0.03, 0]), cam, 1.3, 0.22, 0.05);
      if (r.face.e === "uhoh") mark(out, t, W.sweats, W.sneeze1 - 0.65, top, "!", 0.16);
    } else if (id === 3) {
      const bs = baconAt(3, t);
      heatFx(out, t, add(top, [0, -0.02, 0]), cam, bs.heat * (1 - smooth((t - W.notnose) / 0.4)), 0.2);
      if (bs.heat > 0.3 && !on(t, W.eyes0)) sweatDrip(out, t, W.heat, w3(J.temple[1], 0.06), cam, 1.0, 0.12, 0.05);
      mark(out, t, W.wasnt, W.notnose - 0.2, top, "!", 0.18);
      glare(out, t, W.eyes0 - 0.15, SHOTS[2].b / FPS + 1, eyes, cam, 0.12);
      twitchFx(out, t, nose, cam, smooth((t - W.eyes0) / 0.3));
    } else if (id === 4 && r.who === "bean") {
      glare(out, t, W.bright - 0.2, W.mixes - 0.35, eyes, cam, 0.12);
      mark(out, t, W.signals, W.light1 - 0.3, top, "?", 0.18);
      twitchFx(out, t, nose, cam, r.face.e === "itchy" ? 1 : 0);
      ahs(out, t, sn, head, cam, 0.4, true);
    } else if (id === 5) {
      ahs(out, t, sn, head, cam, 0.4, true);
      const m = env(t, MEME_T - LEAD, MEME_T + 1.0, 0.08, 0.35), { R, U, N } = camVecs(cam, head), f = frameNo(t);
      if (m > 0.02) {
        // the sunburst halo BEHIND his head, the ACHOO! shout above it
        fxCard(out, "halo", 512, 512, fxHalo, at3(head, R, U, N, 0, 0.04, -0.18), 1.5 * m, 1.5 * m, { rot: t * 0.6 });
        fxCard(out, "achoo|ACHOO!|meme", 800, 480, (p) => fxAchoo(p, "ACHOO!", "#ff4a2a", 5), at3(head, R, U, N, 0.04, 0.5, 0.25), 0.78 * m, 0.47 * m, { rot: -0.08 + 0.03 * Math.sin(t * 30) });
        for (const sd of [-1, 1]) fxCard(out, "motion", 256, 256, fxMotion, at3(head, R, U, N, sd * (0.42 + 0.015 * (f % 2)), 0.02, 0.1), 0.2 * m, 0.2 * m, { rot: sd > 0 ? 0 : Math.PI });
        for (let j = 0; j < 8; j++) { // speed streaks blasting out from the mouth toward the edges of frame
          const a = (j / 8) * Math.PI * 2 + 0.2, ph = ((t - MEME_T) * 2.2 + hh(j, 4)) % 1, r0 = 0.36 + 0.5 * ph;
          fxCard(out, "streak", 512, 96, fxStreak, at3(mouth, R, U, N, Math.cos(a) * r0, Math.sin(a) * r0 * 0.9, 0.12), 0.22 * m * Math.sin(Math.PI * ph), 0.04 * m, { rot: a });
        }
        for (let j = 0; j < 7; j++) { // cute sparkle droplets
          const a = -0.6 + (j / 6) * 4.4, ph = ((t - MEME_T) * 1.6 + hh(j, 8)) % 1, r0 = 0.3 + 0.5 * ph;
          fxCard(out, "drop", 128, 160, fxDrop, at3(mouth, R, U, N, Math.cos(a) * r0, Math.sin(a) * r0 - 0.2 * ph * ph, 0.16), 0.04 * m * Math.sin(Math.PI * ph), 0.05 * m * Math.sin(Math.PI * ph), { rot: a + Math.PI / 2 });
        }
      }
      sparkBurst(out, t, MEME_T - LEAD, head, cam, 0.36, 0.85, 0.14);
    } else if (id === 6) {
      if (sn.ph === 0 && (r.face.e === "squint")) glare(out, t, -9, 99, eyes, cam, 0.11 * sc * (r.kit.headK ?? 1));
      if (r.face.e === "puzzled") mark(out, t, r.swaps[0], 99, top, "?", 0.18 * sc * 1.4);
      if (r.face.e === "beam" || r.face.e === "proud") sparkles(out, t, (r.swaps[0] ?? 0), 99, head, cam, 0.22 * sc, 3, IDX[r.who] ?? 1, 0.07);
    } else if (id === 7) {
      if (r.who === "sci") { mark(out, t, W.achoo2 + 0.12, W.achoo2 + 1.1, top, "!", 0.2); sparkles(out, t, W.achoo2 + 1.25, 99, head, cam, 0.3, 4, 41, 0.08); }
    }
  }
  return out;
};
