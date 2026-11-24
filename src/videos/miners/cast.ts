// OWNER: cast agent. Every character and effect card per shot.
// Characters are bridge cards (person/bodyFront) with accessories painted onto the SAME canvas (fx.ts: hard hat + lamp,
// reflective stripes, beard by day count, sunglasses, hi-vis vest, hand flag, candle, photo, spoon + can, hug arm,
// cross-legged floor sitting). World-placed glow cards for helmet lamps and candle flames.
// Layout contract (all relative to the place anchors in story.ts; floor / ground y = 0):
//   REFUGE  room interior x -5..5, z -3..3 (camera side +z). Benches: seat top 0.45 m, card base 0.36:
//           back wall z -2.55 at x -4.2 -3.3 -2.4 | 0.4 1.3 2.2 3.1 4.0 (cabinet gap x -1.6..-0.4 at the back wall);
//           left wall x -4.5 at z -1.5 -0.6 0.3 1.2; right wall x 4.5 at z -1.4 -0.5 0.4.
//           Standing by the food cabinet (back wall, x ~ -1.0): (-1.9,-1.9) (-0.1,-1.9) (-1.2,-1.35) (2.9,-1.6).
//           Cross-legged on the floor (cardboard): z -1.0 at x -3.2 -2.2 1.0 2.0 3.2 | z 0.0 at x -3.0 -1.9 -0.9 0 1.0 2.1
//           (the spoon man of shot 7 is at (0, 0), head ~0.86 m up) | z 1.1 at x -2.4 -1.2 and (2.7, 0.9).
//   MINE    shot 4: three miners in the ramp at MINE + (-0.9,0,2.0) (0.8,0,0.6) (-0.1,0,-1.2).
//   CAMP    families within CAMP + x -6..8, z -2..9 (shrine expected near CAMP + (0,0,-2)); hugs in shot 17 around
//           CAMP + (-2.2,0,3.2) (2.4,0,4.2) (0.2,0,6.4).
//   DRILL   crew shot 9 at DRILL + (3.0,0,3.5) (-2.6,0,4.2) (5.0,0,0.5) (1.0,0,6.0) (-4.5,0,1.5); shot 11 at (1.6,0,1.8)
//           (-1.4,0,1.4) (2.6,0,-0.6) (-0.6,0,2.8); shot 12: the NOTE card centre NOTE_AT = DRILL + (0.67, 1.29, 1.26),
//           0.3 x 0.225 m, held by a rescuer at DRILL + (0.51, 0, 0.89); cheering crew at (-0.8,0,0.1) (1.3,0,0.1) (-0.3,0,-0.8).
//   SHAFT   engineers at SHAFT + (1.3,0,0.9) (-1.4,0,0.7) (2.3,0,-0.5) (-2.4,0,-0.6); crowd (28) behind the shaft along
//           SHAFT + (-6.6,0,-8.8) +- 9 m sideways (0.8,0,-0.6); the rescued miner rides inside the capsule (axis at SHAFT,
//           base = SHAFT.y + capsuleAt().y, scale 0.8) and emerges from the doorway (born at r 0.32 along (0.6,0,0.8), grows over 6 frames) from W.light - 0.02 s.
import * as THREE from "three";
import { Stage, CamInfo, Who, Place, person, blob, prepStage, lidAt, hh, q, SU } from "../bridge/cast";
import { Pen, SKINS, INK, Outfit, Expr, FrontOpts, KID } from "../bridge/toon";
import { W, LEAD, REFUGE, MINE, CAMP, DRILL, SHAFT, smooth, clamp01, V3, dayAt, collapseAt, capsuleAt } from "./story";
import { Acc, accKey, accBehind, accFront, geoOf, Geo, lampPt, holdPt, crossBottom, fxGlow, fxQuestion, fxBang, fxSweat, fxDust, fxSparkle, fxTwoSpoons, fxNote, fxNoteArms, NOTE_CW, NOTE_CH } from "./fx";

const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1; // same head-shape seed as bridge/cast person()
type Mode = "stand" | "sit" | "floor";
const on = (t: number, word: number) => t >= word - LEAD;
const grow = (t: number, word: number, dur = 0.22) => smooth((t - (word - LEAD)) / dur);
const spring = (t: number, word: number, dur = 0.3) => { const u = clamp01((t - (word - LEAD)) / dur); return smooth(u) * (1 + 0.16 * Math.sin(u * Math.PI)); };
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: { flat?: boolean; rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
const tmp = new THREE.Vector3();

/** world position of a design-space point on a camera-facing card at (x,y,z) */
const cardPt = (cam: CamInfo, x: number, y: number, z: number, sc: number, pt: [number, number], g: Geo, tilt = 0, toCam = 0.05): V3 => {
  let [px, py] = pt;
  if (tilt) { const a = (tilt * Math.PI) / 180, hx = 300, hy = g.hipY, c = Math.cos(a), s = Math.sin(a); [px, py] = [hx + (px - hx) * c - (py - hy) * s, hy + (px - hx) * s + (py - hy) * c]; }
  const yaw = Math.atan2(cam.pos.x - x, cam.pos.z - z), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const dx = (px - 300) * SU * sc, dy = (975 - py) * SU * sc;
  return [x + rx * dx + Math.sin(yaw) * toCam, y + dy, z + rz * dx + Math.cos(yaw) * toCam];
};

type Look = { expr: Expr; look?: number; tilt?: number; wave?: number; prop?: FrontOpts["prop"]; swaps?: number[]; blink?: number };
/** one character with painted accessories */
const dude = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, acc: Acc, x: number, y: number, z: number,
  mode: Mode, L: Look, sc = 1, shadow = mode !== "sit"): Place => {
  const who: Who = { i, o, okey };
  const cardMode = mode === "sit" ? "sit" : "stand";
  const a2: Acc = mode === "floor" ? { ...acc, cross: true } : acc;
  const prop = a2.candle || a2.photo !== undefined ? "icecream" : L.prop ?? null;
  const wave = a2.flag !== undefined ? (L.wave ?? 0.5) : L.wave;
  const fo: FrontOpts = { mode: cardMode, expr: L.expr, blink: L.blink ?? lidAt(t, i, L.swaps ?? []), look: L.look ?? 0, tilt: L.tilt ?? 0, wave, prop };
  const g = geoOf(seedOf(i), cardMode, 0, o.build ?? "adult");
  const yb = mode === "floor" ? y - (975 - crossBottom(g)) * SU * sc : y;
  const pl = person(cam, who, x, yb, z, { side: false, mirror: false }, fo, {}, sc);
  const tilt = fo.tilt ?? 0, inner = pl.draw, hipY = g.hipY;
  const colors = { jacket: o.jacket, pants: o.pants, boots: o.boots, skin: o.skin ?? SKINS[0] };
  pl.key += `|${okey}|${accKey(a2)}`;
  pl.draw = (p: Pen) => {
    p.rot = tilt ? [(tilt * Math.PI) / 180, 300, hipY] : null;
    accBehind(p, g, a2);
    p.rot = null;
    inner(p);
    p.rot = tilt ? [(tilt * Math.PI) / 180, 300, hipY] : null;
    accFront(p, g, a2, colors);
    p.rot = null;
  };
  out.places.push(pl);
  if (shadow) blob(out, x, y, z, sc);
  // light cards (unlit soft glows in front of the card)
  if (acc.helmet && acc.lamp) {
    const [lx, ly, lz] = cardPt(cam, x, yb, z, sc, lampPt(g), g, tilt, 0.06);
    fxCard(out, "glowLamp", 256, 256, (p) => fxGlow(p, [255, 226, 150], 0.12), lx, ly, lz, 0.34 * sc, 0.34 * sc, { soft: true });
  }
  if (acc.candle) {
    const [hx, hy] = holdPt(g), [lx, ly, lz] = cardPt(cam, x, yb, z, sc, [hx, hy - 40 * g.u], g, tilt, 0.06);
    const fl = 0.9 + 0.1 * Math.sin(t * 17 + i * 3.1);
    fxCard(out, "glowCandle", 256, 256, (p) => fxGlow(p, [255, 170, 70], 0.1), lx, ly, lz, 0.3 * sc * fl, 0.3 * sc * fl, { soft: true });
  }
  return pl;
};
const headY = (o: Outfit, mode: Mode, sc = 1) => { const g = geoOf(1, mode === "sit" ? "sit" : "stand", 0, o.build ?? "adult"); return (975 - g.crown) * SU * sc; };
const qmark = (out: Stage, t: number, i: number, x: number, y: number, z: number, word: number, bang = false) => {
  const k = spring(t, word);
  if (k <= 0.01) return;
  const bob = 0.02 * Math.sin(t * 5 + i);
  fxCard(out, bang ? "bang" : "qmark", 300, 400, bang ? fxBang : fxQuestion, x, y + bob + 0.06 * k, z, 0.21 * k, 0.28 * k, { rot: 0.12 * Math.sin(t * 3 + i * 1.7) });
};
const sweat = (out: Stage, t: number, i: number, x: number, y: number, z: number, cam: CamInfo) => {
  const ph = ((t * 0.9 + hh(i, 4)) % 1), k = smooth(ph / 0.15) * (1 - smooth((ph - 0.75) / 0.25));
  if (k < 0.02) return;
  const s = hh(i, 5) < 0.5 ? -1 : 1, ox = 0.2 * s;
  fxCard(out, "sweat", 200, 260, fxSweat, x + cam.right.x * ox, y - 0.12 * ph, z + cam.right.z * ox, 0.07 * k, 0.09 * k);
};

// ---------------- outfits ----------------
const HAIR = ["#3a2a20", "#1d1a1a", "#5a3b2a", "#7a5a3a", "#2a2220"];
const BEARD = ["#2e2320", "#1d1a1a", "#4a3426", "#5a4434", "#3a2e2a"];
const ORANGE = "#f08a2c", BLUE = "#2f5fa8", GREEN = "#3f8a4a";
/** a miner: coverall colour by index, coverall trousers to match */
const MINER = (v: number, green = false): Outfit => {
  const c = green ? GREEN : v % 3 === 1 ? BLUE : ORANGE;
  return { jacket: c, pants: c, boots: "#3a2c24", hat: "hair", hair: HAIR[v % 5], skin: SKINS[(v * 3 + 1) % 4], belt: null };
};
const minerAcc = (v: number, day: number, lamp: boolean, green = false): Acc => {
  const grow = 0.7 + 0.6 * hh(v, 31), shaved = v % 9 === 4;
  const b = shaved ? 0 : clamp01(((day - 1) / 42) * grow);
  return { helmet: v % 4 === 3 ? "#ffffff" : "#f2c84b", lamp, stripes: "#e9eef0", zip: true, beard: q(b, 20), beardCol: BEARD[v % 5], shades: green };
};
const RESCUER = (v: number): Outfit => ({ jacket: "#d0423b", pants: "#c03a35", boots: "#2a2220", hat: "hair", hair: HAIR[(v + 1) % 5], skin: SKINS[v % 4] });
const ENGINEER = (v: number): Outfit => ({ jacket: ["#f4f2ec", "#3b4f7a", "#e8eef4"][v % 3], pants: ["#2b2f3a", "#3b3f52"][v % 2], boots: INK, hat: "hair", hair: HAIR[(v + 3) % 5], skin: SKINS[(v + 2) % 4] });
const FOLK = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#e0b43a", "#8c3b4a", "#2f5f6a", "#5d7a3a", "#b5653f", "#7b5ac9", "#c25a7a"];
  const o: Outfit = { jacket: coats[v % 8], pants: ["#3b3f52", "#2b2f3a", "#5a6a8a"][v % 3], boots: ["#4a3426", "#1d1a1a"][v % 2], hat: "hair", hair: HAIR[(v + 2) % 5], skin: SKINS[(v + 1) % 4] };
  if (v % 3 === 1) return { ...o, dress: ["#d9a441", "#c25a7a", "#5a8fc2", "#e07a2c"][v % 4] };
  if (v % 7 === 5) return { ...o, hat: "cap", cap: ["#e2453c", "#2f6a43", "#f4f2ec"][v % 3], moustache: "#d8d4cc", hair: "#d8d4cc" }; // older man
  return o;
};
const KIDO = (v: number): Outfit => ({ ...KID, jacket: ["#f08a2c", "#e2453c", "#3f8a4a", "#5a8fc2"][v % 4], pants: ["#3b5b9a", "#3b3f52"][v % 2], skin: SKINS[(v + 1) % 4], hat: v % 2 ? "cap" : "hair", cap: "#1f45b0", hair: HAIR[v % 5] });

// ---------------- the refuge (shots 1, 6, 7) ----------------
type Spot = { x: number; z: number; mode: Mode };
const REF_SPOTS: Spot[] = [
  ...[-4.2, -3.3, -2.4, 0.4, 1.3, 2.2, 3.1, 4.0].map((x) => ({ x, z: -2.55, mode: "sit" as Mode })),
  ...[-1.5, -0.6, 0.3, 1.2].map((z) => ({ x: -4.5, z, mode: "sit" as Mode })),
  ...[-1.4, -0.5, 0.4].map((z) => ({ x: 4.5, z, mode: "sit" as Mode })),
  { x: -1.9, z: -1.9, mode: "stand" }, { x: -0.1, z: -1.9, mode: "stand" }, { x: -1.2, z: -1.35, mode: "stand" }, { x: 2.9, z: -1.6, mode: "stand" },
  ...[-3.2, -2.2, 1.0, 2.0, 3.2].map((x) => ({ x, z: -1.0, mode: "floor" as Mode })),
  ...[-3.0, -1.9, -0.9, 0, 1.0, 2.1].map((x) => ({ x, z: 0.0, mode: "floor" as Mode })),
  { x: -2.4, z: 1.1, mode: "floor" }, { x: -1.2, z: 1.2, mode: "floor" }, { x: 2.7, z: 0.9, mode: "floor" },
];
const SPOON = REF_SPOTS.findIndex((s) => s.x === 0 && s.z === 0);
const refuge = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const day = dayAt(id, t);
  const tuna: V3 = [REFUGE[0], 0, REFUGE[2]];
  REF_SPOTS.forEach((s, k) => {
    // shot 7: the floor sitter at (2.1, 0) would fill the bottom of the tally close-up with a half-cut face -> (2.6, 0.4)
    // (off-screen in shot 7's other set-ups)
    const mv = id === 7 && s.x === 2.1 && s.z === 0;
    const x = REFUGE[0] + (mv ? 2.6 : s.x), z = REFUGE[2] + (mv ? 0.4 : s.z), y = s.mode === "sit" ? 0.36 : 0;
    const i = 100 + k, v = k * 7 + 3;
    const acc = minerAcc(v, day, hh(k, 2) < 0.62 || s.mode === "stand");
    let L: Look = { expr: "neutral" };
    if (id === 1) {
      const sleepy = hh(k, 6) < 0.18;
      L = { expr: sleepy ? "neutral" : (["neutral", "nervous", "stern", "neutral", "dazed"] as Expr[])[k % 5], blink: sleepy ? 1 : undefined, look: Math.round(Math.sin(t * 0.5 + k)) };
    } else if (id === 6) {
      // the food: everyone looks at the cabinet; on "two" faces fall
      const lk = Math.sign((REFUGE[0] - 1.0 - x) * cam.right.x + (REFUGE[2] - 2.7 - z) * cam.right.z);
      L = { expr: on(t, W.two) ? (k % 3 ? "nervous" : "shock") : on(t, W.food) ? (k % 2 ? "neutral" : "smile") : "stern", look: lk, swaps: [W.food, W.two] };
    } else if (id === 7) {
      const lk = Math.sign((tuna[0] - x) * cam.right.x + (tuna[2] - z) * cam.right.z);
      L = { expr: k === SPOON ? (on(t, W.tuna) ? "smile_closed" : "neutral") : on(t, W.every) ? "nervous" : (["neutral", "lick", "smile"] as Expr[])[k % 3], look: k === SPOON ? 0 : lk, swaps: [W.share, W.tuna, W.every] };
    }
    const a2 = k === SPOON && id === 7 ? { ...acc, spoon: true, lamp: false } : acc;
    dude(out, cam, t, i, MINER(v), `m${v % 15}`, a2, x, y, z, s.mode, L);
  });
  if (id === 7) {
    // the ration: "x2" spoons pop beside the spoon man on "spoonfuls"
    const k = spring(t, W.spoonfuls, 0.3) * (1 - smooth((t - (W.every + 0.6)) / 0.3));
    if (k > 0.01) fxCard(out, "twospoons", 420, 300, fxTwoSpoons, REFUGE[0] + 0.1 + cam.right.x * 0.0, 1.36 + 0.02 * Math.sin(t * 4), REFUGE[2] + 0.1 + cam.right.z * 0.0, 0.3 * k, 0.214 * k, { rot: 0.08 });
  }
};

// ---------------- the ramp tunnel (shot 4): the collapse behind three miners ----------------
const tunnel = (t: number, cam: CamInfo, out: Stage) => {
  const c = collapseAt(4, t);
  const P: V3[] = [[-0.9, 0, 2.0], [0.8, 0, 0.6], [-0.1, 0, -1.2]];
  P.forEach(([px, , pz], k) => {
    const x = MINE[0] + px, z = MINE[2] + pz, v = 40 + k * 5, i = 200 + k;
    const tl = t - (W.collapses - 0.6 - LEAD);
    const hop = tl > 0 ? 0.08 * Math.max(0, Math.sin(tl * 9)) * Math.exp(-tl * 2) : 0;
    const L: Look = tl > 0 ? { expr: tl < 1.6 ? "shock" : "nervous", look: tl < 1.6 ? 0 : k % 2 ? 1 : -1, tilt: q(-6 * (k % 2 ? -1 : 1) * smooth(tl / 0.3), 10), swaps: [W.collapses - 0.6] }
      : { expr: (["smile", "neutral", "grin"] as Expr[])[k], look: k === 1 ? -1 : 1 };
    dude(out, cam, t, i, MINER(v), `t${k}`, minerAcc(v, 1, true), x, hop, z, "stand", L);
    if (tl > 1.0) sweat(out, t, i, x, 1.62, z, cam);
  });
  // grit/dust puffs around their feet and shoulders (the big billow is the underground set's)
  for (let j = 0; j < 7; j++) {
    const k = smooth((c - 0.15 - 0.08 * j) / 0.5);
    if (k < 0.01) continue;
    const dx = (hh(j, 41) - 0.5) * 3.2, dz = 2.4 - hh(j, 42) * 4, y = 0.3 + hh(j, 43) * 1.6 + 0.25 * k;
    fxCard(out, `dustL${j % 4}`, 256, 256, (p) => fxDust(p, j % 4, "#b49a7e", 0.3), MINE[0] + dx, y, MINE[2] + dz, 1.4 * k, 1.1 * k, { soft: true, rot: hh(j, 44) * 3 });
  }
};

// ---------------- Camp Hope ----------------
type Fam = { x: number; z: number; kid: boolean; v: number };
const FAMS: Fam[] = Array.from({ length: 26 }, (_, k) => {
  const ring = k < 10 ? 0 : k < 19 ? 1 : 2, n = [10, 9, 7][ring], j = k - [0, 10, 19][ring];
  const a = -1.1 + (2.2 * (j + 0.5 * (ring % 2))) / n + (hh(k, 51) - 0.5) * 0.15, r = [3.2, 5.6, 8.0][ring] + (hh(k, 52) - 0.5) * 0.7;
  return { x: 1 + r * Math.sin(a), z: -2 + r * Math.cos(a), kid: k % 6 === 4, v: k };
});
const camp = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const dusk = id === 2 || id === 10;
  const hugging = id === 17;
  FAMS.forEach((f, k) => {
    if (hugging && (k === 2 || k === 5 || k === 8)) return; // these three are in the hug pairs below
    const x = CAMP[0] + f.x, z = CAMP[2] + f.z, i = 300 + k;
    const o = f.kid ? KIDO(k) : FOLK(k);
    let acc: Acc = {}, L: Look = { expr: "neutral" }, mode: Mode = "stand";
    if (dusk) {
      acc = k % 3 === 0 ? { candle: true } : k % 3 === 1 ? { photo: k } : {};
      L = id === 2 ? { expr: on(t, W.dead) ? (k % 2 ? "nervous" : "pained") : "nervous", swaps: [W.dead] }
        : { expr: on(t, W.nothing) ? (k % 2 ? "nervous" : "neutral") : "nervous", look: on(t, W.nothing) ? 0 : Math.round(Math.sin(t + k)), swaps: [W.nothing] };
      if (!f.kid && k % 5 === 2) mode = "floor";
    } else if (id === 8) {
      acc = k % 4 === 0 ? { flag: q((t * 1.4 + hh(k, 3)) % 1, 6) } : k % 4 === 2 ? { photo: k } : {};
      L = { expr: on(t, W.wait) ? (["neutral", "nervous", "stern"] as Expr[])[k % 3] : on(t, W.families) ? (k % 2 ? "smile" : "neutral") : "neutral", look: Math.round(Math.sin(t * 0.8 + k * 1.3)), swaps: [W.families, W.wait] };
      if (!f.kid && k % 7 === 3) mode = "floor";
    } else if (hugging) {
      acc = k % 3 !== 2 ? { flag: q((t * 1.6 + hh(k, 3)) % 1, 6) } : {};
      const tl = t - (W.home - LEAD), hop = tl > 0 ? 0.08 * Math.max(0, Math.sin(tl * 8 + k)) : 0;
      L = { expr: on(t, W.home) ? (["laugh", "grin", "relief_open"] as Expr[])[k % 3] : (["smile", "relief", "smile_closed"] as Expr[])[k % 3],
        wave: acc.flag !== undefined ? q(0.5 + 0.5 * Math.sin(t * 7 + k), 10) : on(t, W.days69) && k % 3 === 2 ? q(0.5 + 0.5 * Math.sin(t * 8 + k), 10) : undefined, swaps: [W.days69, W.home] };
      dude(out, cam, t, i, o, f.kid ? `k${k % 4}` : `f${k}`, acc, x, hop, z, "stand", L, f.kid ? 0.8 : 1, true);
      return;
    }
    dude(out, cam, t, i, o, f.kid ? `k${k % 4}` : `f${k}`, acc, x, 0, z, f.kid ? "stand" : mode, L, f.kid ? 0.8 : 1);
  });
  if (hugging) hugs(t, cam, out);
};
/** shot 17: three rescued miners (green coveralls, sunglasses, full beards) hugging family */
const hugs = (t: number, cam: CamInfo, out: Stage) => {
  const P: [number, number, number][] = [[-2.2, 3.2, 2], [2.4, 4.2, 5], [0.2, 6.4, 8]];
  P.forEach(([px, pz, fk], k) => {
    const x = CAMP[0] + px, z = CAMP[2] + pz, v = 60 + k * 4;
    const sway = q(Math.sin(t * 2.2 + k) * 2, 4);
    // the miner (front, nearer the camera) with his arm across the partner's shoulders; partner just screen-right, behind
    const toC = tmp.set(cam.pos.x - x, 0, cam.pos.z - z).normalize();
    const bx = x + cam.right.x * 0.48 - toC.x * 0.16, bz = z + cam.right.z * 0.48 - toC.z * 0.16; // 0.48: her face clear of his
    const partner = FAMS[fk], po = partner.kid ? KIDO(fk) : FOLK(fk);
    dude(out, cam, t, 300 + fk, po, `f${fk}`, {}, bx, 0, bz, "stand", { expr: on(t, W.home) ? "laugh" : "relief", tilt: q(-7 + sway, 4), swaps: [W.home] }, partner.kid ? 0.8 : 1);
    const acc: Acc = { ...minerAcc(v, 69, false, true), helmet: undefined, hug: true };
    dude(out, cam, t, 400 + k, MINER(v, true), `h${k}`, acc, x, 0, z, "stand", { expr: on(t, W.home) ? "relief_open" : "smile_closed", tilt: q(7 + sway, 4), swaps: [W.home] });
  });
  if (t > W.home - 0.3) for (let k = 0; k < 4; k++) {
    const u = q(((t - W.home) * 1.3 + k * 0.23) % 1, 24), gk = grow(t, W.home, 0.25);
    const [px, pz] = [P[k % 3][0] + 0.2, P[k % 3][1]];
    fxCard(out, `spark${u}`, 240, 240, (p) => fxSparkle(p, u), CAMP[0] + px, 2.05 + 0.15 * (k % 2), CAMP[2] + pz, 0.3 * gk, 0.3 * gk);
  }
};

// ---------------- the drill site ----------------
const crew = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const P: [number, number][] = id === 9 ? [[3.0, 3.5], [-2.6, 4.2], [5.0, 0.5], [1.0, 6.0], [-4.5, 1.5]] : [[1.6, 1.8], [-1.4, 1.4], [2.6, -0.6], [-0.6, 2.8]];
  const rod: V3 = [DRILL[0], 0, DRILL[2]];
  P.forEach(([px, pz], k) => {
    const x = DRILL[0] + px, z = DRILL[2] + pz, i = 500 + k;
    const lk = Math.sign((rod[0] - x) * cam.right.x + (rod[2] - z) * cam.right.z);
    let L: Look;
    if (id === 9) {
      L = { expr: on(t, W.blind) ? (k % 2 ? "nervous" : "stern") : on(t, W.holes) ? "stern" : "neutral", look: lk, swaps: [W.holes, W.blind] };
    } else {
      const lean = smooth((t - (W.note - LEAD)) / 0.35);
      L = { expr: on(t, W.taped) ? (["grin", "shock", "relief_open", "shock"] as Expr[])[k] : on(t, W.note) ? "shock" : on(t, W.drill) ? "nervous" : "neutral",
        look: on(t, W.drill) ? lk : 0, tilt: q(lk * 8 * lean, 10), swaps: [W.drill, W.note, W.taped] };
    }
    dude(out, cam, t, i, RESCUER(k), `r${k}`, { helmet: "#ffffff", stripes: "#e9eef0", zip: true }, x, 0, z, "stand", L);
    const hy = headY(RESCUER(k), "stand");
    if (id === 9) { sweat(out, t, i, x, 1.55, z, cam); if (k < 2) qmark(out, t, i, x + 0.05, hy + 0.32, z, W.blind + 0.08 * k); }
    if (id === 11 && k % 2 === 0) qmark(out, t, i, x + 0.05, hy + 0.32, z, W.note + 0.05 * k, true);
  });
};
/** shot 12: the note unfolded, held up at chest height by a rescuer (his face clear above it, in front of the mast);
 *  the crew bursts into a cheer on "the thirty-three". The holder and the sheet sit on the close-ups' line of sight, in
 *  front of the mast's near post so nothing of the rig ever crosses the lettering or his face. */
export const NOTE_AT: V3 = [DRILL[0] + 0.67, 1.29, DRILL[2] + 1.26];
const NOTE_W = 0.3, NOTE_H = 0.225;
const HOLDER: [number, number] = [DRILL[0] + 0.51, DRILL[2] + 0.89];
const noteShot = (t: number, cam: CamInfo, out: Stage) => {
  const cheer = on(t, W.the33), tl = t - (W.the33 - LEAD);
  // the holder, ~0.4 m behind the note (away from the lens); his own arms are replaced by the sleeves card below
  dude(out, cam, t, 510, RESCUER(0), "r0", { helmet: "#ffffff", stripes: "#e9eef0", zip: true, noArms: true }, HOLDER[0], 0, HOLDER[1], "stand",
    { expr: cheer ? "laugh" : on(t, W.fine) ? "relief_open" : "shock", swaps: [W.fine, W.the33] });
  ([[-0.8, 0.1], [1.3, 0.1], [-0.3, -0.8]] as [number, number][]).forEach(([px, pz], k) => {
    const hop = tl > 0 ? 0.12 * Math.max(0, Math.sin(tl * 8 + k * 1.4)) * Math.exp(-tl * 0.5) : 0;
    dude(out, cam, t, 511 + k, RESCUER(k + 1), `r${k + 1}`, { helmet: "#ffffff", stripes: "#e9eef0", zip: true }, DRILL[0] + px, hop, DRILL[2] + pz, "stand",
      { expr: cheer ? (["laugh", "grin", "relief_open"] as Expr[])[k] : on(t, W.we) ? "shock" : "nervous", wave: cheer ? q(0.5 + 0.5 * Math.sin(t * 9 + k), 10) : undefined, swaps: [W.we, W.the33] }, 1, true);
  });
  // the NOTE: a crisp 2048 x 1536 card, a slight hand tremble (and a lift on the cheer)
  const lift = cheer ? 0.06 * smooth(tl / 0.4) : 0, tr = 0.003 * Math.sin(t * 7.3), ny = NOTE_AT[1] + lift + tr;
  fxCard(out, "note", NOTE_CW, NOTE_CH, fxNote, NOTE_AT[0], ny, NOTE_AT[2], NOTE_W, NOTE_H, { rot: q(-0.03 + 0.01 * Math.sin(t * 2.1), 200) });
  // the sleeves: 3 cm behind the sheet (along the view ray), arm tips on the thumbs at the sheet's lower corners
  const vx = NOTE_AT[0] - cam.pos.x, vz = NOTE_AT[2] - cam.pos.z, vn = Math.hypot(vx, vz) || 1;
  const aw = (NOTE_W * 0.892) / 0.733, ah = aw * 1.5, ay = ny - 0.42 * NOTE_H - (0.5 - 70 / 900) * ah;
  fxCard(out, "noteArms", 600, 900, (p) => fxNoteArms(p, RESCUER(0).jacket), NOTE_AT[0] + (vx / vn) * 0.03, ay, NOTE_AT[2] + (vz / vn) * 0.03, aw, ah);
  if (cheer) for (let k = 0; k < 4; k++) {
    const u = q((tl * 1.3 + k * 0.23) % 1, 24), gk = grow(t, W.the33, 0.25), sx = k % 2 ? 0.2 : -0.21;
    fxCard(out, `spark${u}`, 240, 240, (p) => fxSparkle(p, u), NOTE_AT[0] + cam.right.x * sx, ny + 0.15 + 0.05 * k, NOTE_AT[2] + cam.right.z * sx, 0.1 * gk, 0.1 * gk);
  }
};

// ---------------- the rescue at night ----------------
const ENG: [number, number][] = [[1.3, 0.9], [-1.4, 0.7], [2.3, -0.5], [-2.4, -0.6]];
const CROWD = Array.from({ length: 28 }, (_, k) => {
  const row = k % 3, s = (k / 27 - 0.5) * 18 + (hh(k, 61) - 0.5) * 0.6, back = row * 1.2 + (hh(k, 62) - 0.5) * 0.5;
  return { x: -6.6 + 0.8 * s - 0.6 * back, z: -8.8 - 0.6 * s - 0.8 * back, kid: k % 8 === 5 };
});
const rescue = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const cap: V3 = [SHAFT[0], 0, SHAFT[2]];
  const cheer = id === 16 && on(t, W.rode);
  ENG.forEach(([px, pz], k) => {
    const x = SHAFT[0] + px, z = SHAFT[2] + pz, i = 600 + k;
    const lk = Math.sign((cap[0] - x) * cam.right.x + (cap[2] - z) * cam.right.z);
    let L: Look;
    if (id === 15) L = { expr: on(t, W.phoenix) ? (k % 2 ? "smile" : "grin") : on(t, W.engineers) ? "stern" : "neutral", look: on(t, W.capsule) ? lk : 0,
      wave: k === 0 && on(t, W.capsule) && !on(t, W.phoenix + 0.8) ? q(0.3 + 0.2 * Math.sin(t * 3), 10) : undefined, swaps: [W.engineers, W.capsule, W.phoenix] };
    else L = { expr: on(t, W.light) ? (["laugh", "relief_open", "grin", "laugh"] as Expr[])[k] : cheer ? "smile" : "nervous", look: lk,
      wave: on(t, W.light) && k % 2 ? q(0.5 + 0.5 * Math.sin(t * 9 + k), 10) : undefined, swaps: [W.rode, W.light] };
    dude(out, cam, t, i, ENGINEER(k), `e${k}`, { helmet: "#ffffff", vest: "#ff8a1e", zip: k % 3 === 1 }, x, 0, z, "stand", L);
  });
  CROWD.forEach((c, k) => {
    const x = SHAFT[0] + c.x, z = SHAFT[2] + c.z, i = 700 + k;
    const tl = t - (W.rode - LEAD), hop = cheer ? 0.08 * Math.max(0, Math.sin(tl * 8 + k)) : 0;
    const flag = k % 3 !== 1;
    const acc: Acc = flag ? { flag: q((t * 1.5 + hh(k, 3)) % 1, 6) } : {};
    const L: Look = { expr: cheer ? (["laugh", "grin", "relief_open", "shock"] as Expr[])[k % 4] : (["nervous", "neutral", "smile"] as Expr[])[k % 3],
      wave: flag ? q(cheer ? 0.5 + 0.5 * Math.sin(t * 8 + k) : 0.3, 10) : cheer ? q(0.5 + 0.5 * Math.sin(t * 9 + k), 10) : undefined, swaps: [W.rode] };
    dude(out, cam, t, i, c.kid ? KIDO(k) : FOLK(k + 3), c.kid ? `k${k % 4}` : `c${k % 20}`, acc, x, hop, z, "stand", L, c.kid ? 0.8 : 1);
  });
  if (id === 16) {
    // the rescued man: NOT drawn while inside the capsule (the shell has no real opening). Once the door is fully open
    // (props: by W.light - 0.02) he emerges from the doorway: born at the door plane just outside the shell
    // (r 0.32 along the door direction (0.6, 0, 0.8)) at a tiny scale, growing from his feet and sliding out to
    // (0.45, 0, 0.6) over 6 frames -> never half-inside the shell, never a jump; then he settles and waves.
    const cy = capsuleAt(16, t).y, t0 = W.light - 0.02;
    if (t >= t0) {
      const u = clamp01((t - t0) / 0.2), st = smooth(u);
      const d = 0.32 + (0.75 - 0.32) * st, sc = 0.06 + 0.94 * st;
      const x = cap[0] + 0.6 * d, z = cap[2] + 0.8 * d, set = clamp01((t - t0 - 0.2) / 0.4);
      const v = 77, acc: Acc = { ...minerAcc(v, 69, false, true), helmet: "#ffffff", lamp: false };
      dude(out, cam, t, 650, MINER(v, true), "rescued", acc, x, SHAFT[1] + cy, z, "stand",
        { expr: u >= 1 ? "grin" : "smile_closed", wave: set > 0.3 ? q(0.5 + 0.5 * Math.sin(t * 7), 10) : undefined, swaps: [t0 + 0.2] }, sc, st > 0.5);
    }
  }
};

export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  if (id === 1 || id === 6 || id === 7) refuge(id, t, cam, out);
  if (id === 4) tunnel(t, cam, out);
  if (id === 2 || id === 8 || id === 10 || id === 17) camp(id, t, cam, out);
  if (id === 9 || id === 11) crew(id, t, cam, out);
  if (id === 12) noteShot(t, cam, out);
  if (id === 15 || id === 16) rescue(id, t, cam, out);
  return out;
};
