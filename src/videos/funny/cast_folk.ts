// OWNER: cast. The supporting cast for "Live Wire" (NEW drawings, 600 x 1000 design space, soles at y 975):
//   drawFinger  PINKY (short, PINK-POLISHED nail cap, a 3-hair tuft) + RING (taller, a gold ring worn as a belt) + the
//               other finger folk: calm / sip tea / SCREAM (tuft up, bulging eyes, smoke curls) / RING's HALF scream
//               (only his left half zapped: half tuft up, one eye bulging, the other half sipping tea) / pat-down /
//               a band-aid, deadpan.
//   drawWorker  the NO PADDING sign-holder: a little yellow nerve CELL (dendrites poking out from under a hard hat,
//               a padded axon tail), hi-vis vest, clipboard; flips + lifts the NO PADDING sign with a shrug.
//   drawSkelly  SKELLY the friendly museum skeleton: idle grin, smirk (side-eye), taps its own humerus (tok tok),
//               jaw-clacking laugh. A museum tag on its toe.
//   drawOld     the 1840 gentleman (top hat, mutton chops, MONOCLE), the 1900 lady (huge feathered hat), the 1950 dad
//               (cardigan, pipe), in a dark old-oil style (umber ground, brush grain, craquelure, varnish); each
//               bursts into laughter (monocle pops out, feathers shake, the pipe drops).
//   drawNew     BEAN's 2026 portrait: the SAME composition as the shot 6 camera (cast.ts maps the hallway into it).
import { Pen, INK, blobPts, headBlob, thickAngle, mul } from "../bridge/toon";
import {
  P2, WHITE, rad, rnd, thru, ellPts, rgba, rrect, limb, glow, local, puffPts, starPts, SH_SKIN, SH_HAIR, SH_CLOTH, HandK, HAND_WRIST,
  drawHand, FaceS, face, mixP, letter, alpha,
} from "./cast_kit";
import { BeanS, drawBean } from "./cast_bean";

// ======================================================================================================================
// FINGER FOLK
// ======================================================================================================================
export type FingerLook = { skin: string; nail: string; h: number; w: number; ring?: boolean; hair: string; seed: number; polish?: boolean };
export const PINKY_L: FingerLook = { skin: "#ffcfb2", nail: "#ff7ab8", h: 800, w: 236, hair: "#7a4a2a", seed: 3, polish: true };
export const RING_L: FingerLook = { skin: "#f4c49e", nail: "#ffe0e4", h: 900, w: 250, ring: true, hair: "#5a3420", seed: 5 };
export const OTHER_L: FingerLook[] = [
  { skin: "#f0bf98", nail: "#ffe4e8", h: 960, w: 250, hair: "#4a2a18", seed: 7 },
  { skin: "#f6caa8", nail: "#ffe4e8", h: 880, w: 246, hair: "#6a3a22", seed: 9 },
  { skin: "#eab48e", nail: "#ffe4e8", h: 640, w: 300, hair: "#3a2214", seed: 11 },
];
export type FingerPose = "calm" | "sip" | "scream" | "half" | "pat" | "fine";
export type FingerS = { look: FingerLook; pose: FingerPose; face: FaceS; lid: number; ph: number; bandaid: number; light: number; shake?: number };
/** canvas head (face) centre of a finger */
export const fingerFace = (L: FingerLook): P2 => [300, 975 - 70 - L.h * 0.56];
const teacup = (p: Pen, x: number, y: number, s: number) => {
  p.ell(x, y + 20 * s, 40 * s, 9 * s, "#ffffff", 4);
  const cup: P2[] = [[x - 30 * s, y - 22 * s], [x + 30 * s, y - 22 * s], [x + 22 * s, y + 16 * s], [x - 22 * s, y + 16 * s]];
  p.poly(cup, "#ffffff", 4); p.clip(cup, () => p.poly([[x - 40 * s, y - 2 * s], [x + 40 * s, y - 2 * s], [x + 40 * s, y + 4 * s], [x - 40 * s, y + 4 * s]], "#7ab8ff", 0));
  p.arc(x + 32 * s, y - 4 * s, 12 * s, 12 * s, -80, 80, 5);
  p.ell(x, y - 22 * s, 30 * s, 6 * s, "#c87a3a", 3);
};
export const drawFinger = (p: Pen, s: FingerS) => {
  const olS = p.ol; p.ol = 5;
  const L = s.look, w = L.w, top = 975 - 70 - L.h, bot = 975 - 70, cx = 300, a = w * 0.5, lt = s.light;
  const FC = fingerFace(L), j = (s.shake ?? 0) % 2 ? 4 : -4;
  const zapR = s.pose === "scream", zapH = s.pose === "half";
  // legs
  for (const sd of [-1, 1]) { const hip: P2 = [cx + sd * 0.45 * a, bot - 10], ft: P2 = [cx + sd * 0.62 * a + (zapR ? sd * 20 : 0), 952]; limb(p, [hip, ft], L.skin, 0.36 * a, 5); p.ell(ft[0] + sd * 12, 958, 0.42 * a, 0.18 * a, "#5a3a6a", 5); }
  // the hair tuft (stands up when zapped)
  const tuft = (sd: number, up: boolean) => { for (let i = 0; i < 3; i++) { const bx = cx + sd * (10 + i * 22), b: P2 = [bx, top + 18]; const tp: P2 = up ? [bx + sd * (12 + i * 14) + j, top - 110 - i * 12] : [bx + sd * (40 + i * 12), top - 22 + i * 4]; p.stroke(thru(b, [b[0] + (tp[0] - b[0]) * 0.4 + (up ? 0 : sd * 10), b[1] + (tp[1] - b[1]) * 0.7], tp, 8), 11, L.hair); } };
  tuft(-1, zapR); tuft(1, zapR || zapH);
  // body capsule + knuckle creases
  const body = rrect(cx - a, top, cx + a, bot, a * 0.98, 10);
  p.shadedFill(body, L.skin, mul(L.skin, SH_SKIN), lt, a, 0.42);
  p.clip(body, () => {
    for (const k of [0.72, 0.9]) { const y = top + L.h * k; for (let i = 0; i < 3; i++) p.arc(cx, y + i * 12, a * 0.38, 10, 200, 340, 3.5, rgba("#a85a5a", 0.55)); }
    if (zapR) glow(p, cx, top + L.h * 0.4, a * 2.2, "#9af6ff", 0.35);
  });
  p.inkRing(body, 5.5, thickAngle(lt), 0.4);
  // the fingernail cap (PINKY's is polished hot pink)
  const nail = [...thru([cx - a * 0.86, top + 0.36 * w], [cx - a * 0.9, top + 0.02 * w], [cx, top + 0.02 * w], 10), ...thru([cx, top + 0.02 * w], [cx + a * 0.9, top + 0.02 * w], [cx + a * 0.86, top + 0.36 * w], 10).slice(1), ...thru([cx + a * 0.86, top + 0.36 * w], [cx, top + 0.46 * w], [cx - a * 0.86, top + 0.36 * w], 10).slice(1)];
  p.gradFill(nail, L.nail, mul(L.nail, [0.86, 0.8, 0.86]), lt, 0.35); p.poly(nail, null, 5);
  p.clip(nail, () => { p.ell(cx, top + 0.42 * w, a * 0.5, 0.1 * w, rgba(WHITE, 0.6), 0); p.stroke(thru([cx - a * 0.5, top + 0.12 * w], [cx - a * 0.15, top + 0.07 * w], [cx + a * 0.15, top + 0.1 * w], 6), 10, rgba(WHITE, 0.75)); });
  // the ring belt (RING)
  if (L.ring) { const y = top + L.h * 0.8; p.poly(rrect(cx - a - 6, y - 16, cx + a + 6, y + 16, 12), "#ffcf3a", 4.5); p.stroke([[cx - a, y - 4], [cx + a, y - 4]], 4, rgba(WHITE, 0.6)); p.poly([[cx, y - 34], [cx + 24, y - 12], [cx, y + 8], [cx - 24, y - 12]], "#5ac8ff", 4); p.dot(cx - 6, y - 20, 5, WHITE); }
  // face
  local(p, FC[0] + (zapR ? j * 0.5 : 0), FC[1] + (zapR ? 0.12 * a : 0), 0, () => face(p, s.face, a * 0.92 * (zapR ? 1.32 : 1), L.skin, s.lid, { nose: mul(L.skin, [0.95, 0.78, 0.78]) })); // (qa1) the scream face 1.32x: it read as a small 'o'
  if (s.bandaid > 0.01) local(p, cx + 0.38 * a, FC[1] - 0.62 * a, -0.5, () => { const k = Math.min(1.15, s.bandaid); const bd = rrect(-54 * k, -18, 54 * k, 18, 16); p.poly(bd, "#f2c08a", 4); p.poly(rrect(-18 * k, -14, 18 * k, 14, 5), "#fae0c0", 2.5); for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) p.dot(sd * (32 + i * 6) * k, -6 + i * 6, 2.2, rgba("#a0703a", 0.8)); });
  // arms
  const sh = (sd: number): P2 => [cx + sd * a * 0.92, top + L.h * 0.62];
  const arm = (sd: number, wr: P2, hand: HandK, el?: P2) => {
    const S = sh(sd), E = el ?? mixP(S, wr, 0.5);
    limb(p, [S, E, wr], L.skin, 0.3 * a, 5);
    const an = Math.atan2(wr[0] - E[0], -(wr[1] - E[1]));
    local(p, wr[0], wr[1], an, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, hand, L.skin, sd > 0)), 0.26);
  };
  const S0 = sh(-1), S1 = sh(1);
  switch (s.pose) {
    case "calm": arm(-1, [S0[0] - 40, S0[1] + 150], "rest"); arm(1, [S1[0] + 40, S1[1] + 150], "rest"); break;
    case "sip": arm(-1, [S0[0] - 30, S0[1] + 150], "rest"); arm(1, [cx + 70, FC[1] + 0.95 * a], "cup", [S1[0] + 60, S1[1] + 60]); teacup(p, cx + 70, FC[1] + 0.72 * a, 0.9); break;
    case "scream": arm(-1, [S0[0] - 110 + j, S0[1] - 230], "splay", [S0[0] - 90, S0[1] - 70]); arm(1, [S1[0] + 110 - j, S1[1] - 230], "splay", [S1[0] + 90, S1[1] - 70]); break;
    case "half": arm(-1, [cx - 70, FC[1] + 0.95 * a], "cup", [S0[0] - 60, S0[1] + 60]); teacup(p, cx - 70, FC[1] + 0.72 * a, 0.9); arm(1, [S1[0] + 110 - j, S1[1] - 230], "splay", [S1[0] + 90, S1[1] - 70]); break;
    case "pat": { const u = s.ph > 0.5; arm(-1, [cx - 40, top + L.h * (u ? 0.7 : 0.82)], "pat", [S0[0] - 40, S0[1] + 70]); arm(1, [cx + 40, top + L.h * (u ? 0.84 : 0.7)], "pat", [S1[0] + 40, S1[1] + 70]); break; }
    case "fine": arm(-1, [S0[0] - 30, S0[1] + 150], "rest"); arm(1, [S1[0] + 30, S1[1] + 150], "rest"); break;
  }
  // smoke curls over a fresh scream
  if (zapR) for (let i = 0; i < 3; i++) { const x = cx - 80 + i * 80, y = top - 150 - (i % 2) * 40; const c = puffPts(x + j, y, 34, 26, 6, 40 + i); p.poly(c, "#b8b4c8", 4); p.arc(x + j, y, 14, 10, 0, 270, 4, rgba(INK, 0.6)); }
  if (zapH) { const x = cx + 90, y = top - 140; const c = puffPts(x + j, y, 30, 22, 6, 44); p.poly(c, "#b8b4c8", 4); }
  p.ol = olS;
};

// ======================================================================================================================
// THE NO PADDING SIGN-HOLDER (a nerve cell in a hard hat)
// ======================================================================================================================
export type WorkerS = { lift: number; flip: number; face: FaceS; lid: number; light: number };
export const WORKER_FACE: P2 = [300, 590];
export const drawWorker = (p: Pen, s: WorkerS) => {
  const olS = p.ol; p.ol = 5;
  const C: P2 = [300, 640], R = 150, lt = s.light, Y = "#ffc44a";
  // the padded axon tail curling off behind him (myelin sausages = padding!)
  const tail = thru([C[0] - 120, C[1] + 100], [C[0] - 250, C[1] + 260], [C[0] - 160, 940], 10);
  for (let i = 0; i < tail.length - 1; i += 2) p.ell(tail[i][0], tail[i][1], 26, 18, "#ffe8f0", 4, 0, 360, 30);
  // legs + boots
  for (const sd of [-1, 1]) { limb(p, [[C[0] + sd * 52, C[1] + 110], [C[0] + sd * 62, 935]], Y, 44, 5); p.ell(C[0] + sd * 74, 950, 52, 26, "#6a3a1a", 5); }
  // dendrites poking out everywhere
  for (let i = 0; i < 7; i++) {
    const an = rad(-160 + i * 23), b: P2 = [C[0] + Math.cos(an) * R * 0.9, C[1] - 40 + Math.sin(an) * R * 0.9], t2: P2 = [b[0] + Math.cos(an) * 90, b[1] + Math.sin(an) * 90];
    p.stroke([b, t2], 26, INK); p.stroke([b, t2], 16, Y);
    for (const sd of [-1, 1]) { const tt: P2 = [t2[0] + Math.cos(an + sd * 0.7) * 40, t2[1] + Math.sin(an + sd * 0.7) * 40]; p.stroke([t2, tt], 18, INK); p.stroke([t2, tt], 9, Y); p.dot(tt[0], tt[1], 9, INK); p.dot(tt[0], tt[1], 5, "#ffe27a"); }
  }
  // the soma (body)
  const body = ellPts(C[0], C[1], R, R * 1.05, 48);
  p.shadedFill(body, Y, "#d88a2a", lt, R, 0.42);
  p.inkRing(body, 5.5, thickAngle(lt), 0.4);
  // hi-vis vest
  p.clip(body, () => {
    const v: P2[] = [[C[0] - 200, C[1] + 40], [C[0] - 40, C[1] + 20], [C[0], C[1] + 90], [C[0] + 40, C[1] + 20], [C[0] + 200, C[1] + 40], [C[0] + 200, C[1] + 260], [C[0] - 200, C[1] + 260]];
    p.poly(v, "#ff7a1a", 4.5);
    for (const y of [C[1] + 96, C[1] + 132]) p.poly([[C[0] - 200, y], [C[0] + 200, y], [C[0] + 200, y + 14], [C[0] - 200, y + 14]], "#e8f4ff", 0);
  });
  // the yellow hard hat
  const hat = [...thru([C[0] - 128, C[1] - 92], [C[0] - 110, C[1] - 210], [C[0], C[1] - 218], 10), ...thru([C[0], C[1] - 218], [C[0] + 110, C[1] - 210], [C[0] + 128, C[1] - 92], 10).slice(1)];
  p.gradFill(hat, "#ffe23a", "#d8a81a", lt, 0.3); p.poly(hat, null, 5);
  p.poly(rrect(C[0] - 160, C[1] - 104, C[0] + 160, C[1] - 80, 10), "#ffd21a", 5);
  p.stroke([[C[0], C[1] - 214], [C[0], C[1] - 104]], 10, rgba("#c8981a", 0.8));
  // face
  local(p, WORKER_FACE[0], WORKER_FACE[1], 0, () => face(p, s.face, 92, Y, s.lid, { nose: "#ff9a5a" }));
  // arms: the clipboard (screen-left), the sign (screen-right)
  const shL: P2 = [C[0] - 135, C[1] + 20], shR: P2 = [C[0] + 135, C[1] + 20], k = s.lift;
  // the sign: a stake + board; lift = 0 (low, held by his side) .. 1 (hoisted overhead); flip = which face shows
  // (qa1) idle: the board rests LOW at his side, inside the card (it covered his face and its right edge was cut by
  // the card boundary); the stake ends at the floor line. k = 1 (hoisted) is unchanged.
  const gx = C[0] + 110 + 5 * k, gy = C[1] + 250 - 620 * k;
  local(p, gx, gy, 0.05 - 0.08 * k, () => {
    p.poly(rrect(-12, -40, 12, 380 - 310 * Math.max(0, 1 - k), 5), "#b07a3a", 4);
    const c = Math.cos(Math.PI * (1 - s.flip)), sx = Math.max(0.04, Math.abs(c));
    local(p, 0, -120, 0, () => {
      const bd = rrect(-175, -95, 175, 95, 14);
      p.poly(bd, c > 0 ? "#fff4d8" : "#c89a5a", 6);
      if (c > 0) { p.poly(rrect(-160, -80, 160, 80, 10), null, 4); letter(p, "NO", 0, -36, 78, "#e8283a", 10, 0, 300); letter(p, "PADDING", 0, 40, 64, "#e8283a", 9, 0, 300); }
      else for (let i = -2; i <= 2; i++) p.stroke([[-170, i * 34], [170, i * 34 + 4]], 4, rgba("#7a4a1a", 0.5));
    }, sx, 1);
  }, 1, 1);
  const wrR: P2 = [gx - 4, gy + 60 - 140 * Math.max(0, 1 - k)], elR: P2 = [shR[0] + 70 - 20 * k, mixP(shR, wrR, 0.5)[1] + 30 * (1 - k)];
  limb(p, [shR, elR, wrR], Y, 34, 5);
  local(p, wrR[0], wrR[1], Math.atan2(wrR[0] - elR[0], -(wrR[1] - elR[1])), () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, "fist", Y, true)), 0.3);
  // screen-left: the clipboard (lowered) / a palm-up SHRUG when the sign goes up
  // (qa1) the clipboard is held at belly height (it used to cover his face while he waited)
  const wrL: P2 = k > 0.5 ? [shL[0] - 110, shL[1] - 90] : [C[0] - 90, C[1] + 150], elL: P2 = k > 0.5 ? [shL[0] - 100, shL[1] + 20] : [shL[0] - 70, shL[1] + 120];
  if (k <= 0.5) local(p, C[0] - 70, C[1] + 130, -0.25, () => { p.poly(rrect(-70, -90, 70, 90, 8), "#b07a3a", 4); p.poly(rrect(-56, -72, 56, 80, 4), WHITE, 3); for (let i = 0; i < 5; i++) p.stroke([[-40, -40 + i * 24], [40, -40 + i * 24]], 4, rgba(INK, 0.5)); p.poly(rrect(-24, -100, 24, -76, 5), "#c8c8d0", 3); });
  limb(p, [shL, elL, wrL], Y, 34, 5);
  local(p, wrL[0], wrL[1], Math.atan2(wrL[0] - elL[0], -(wrL[1] - elL[1])) + (k > 0.5 ? -0.9 : 0), () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, k > 0.5 ? "open" : "grip", Y, false)), 0.3);
  p.ol = olS;
};

// ======================================================================================================================
// SKELLY
// ======================================================================================================================
export type SkellyMood = "idle" | "smirk" | "laugh";
export type SkellyS = { mood: SkellyMood; tap: number; tok: number; jaw: number; lid: number; look: P2; light: number };
const BONE = "#f6eedb", BONE_DK = "#cbbd9a";
export const SK_HEAD: P2 = [300, 200];
export const SK_HUM: [P2, P2] = [[166, 306], [98, 438]];
const bone = (p: Pen, a: P2, b: P2, w: number, knob = 1.25) => {
  p.stroke([a, b], w + 10, INK); for (const q of [a, b]) for (const s of [-1, 1]) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; p.dot(q[0] + nx * s * w * 0.32, q[1] + ny * s * w * 0.32, w * 0.5 * knob + 5, INK); }
  p.stroke([a, b], w, BONE); for (const q of [a, b]) for (const s of [-1, 1]) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d; p.dot(q[0] + nx * s * w * 0.32, q[1] + ny * s * w * 0.32, w * 0.5 * knob, BONE); }
  p.stroke([mixP(a, b, 0.2), mixP(a, b, 0.8)], w * 0.25, rgba("#ffffff", 0.6));
};
const boneHand = (p: Pen, wr: P2, ang: number, kind: "rest" | "point" | "tap") => local(p, wr[0], wr[1], ang, () => {
  p.ell(0, -16, 22, 18, BONE, 4);
  const fingers = kind === "rest" ? [-0.25, -0.08, 0.08, 0.25] : [-0.1, 0.9, 1.0, 1.1];
  fingers.forEach((fa, i) => { const L = i === 0 && kind !== "rest" ? 64 : 44, b: P2 = [(i - 1.5) * 11, -28], t2: P2 = [b[0] + Math.sin(fa) * L, b[1] - Math.cos(fa) * L]; p.stroke([b, t2], 13, INK); p.stroke([b, t2], 6, BONE); p.dot(t2[0], t2[1], 5, BONE); });
});
export const drawSkelly = (p: Pen, s: SkellyS) => {
  const olS = p.ol; p.ol = 4.5;
  const lt = s.light, H = SK_HEAD, a = 96;
  // legs + feet + the museum toe tag
  for (const sd of [-1, 1]) {
    const hip: P2 = [300 + sd * 52, 680], kn: P2 = [300 + sd * 60, 815], an: P2 = [300 + sd * 62, 945];
    bone(p, hip, kn, 26); bone(p, kn, an, 22);
    p.ell(an[0] + sd * 22, 958, 40, 15, BONE, 4);
    if (sd > 0) { p.stroke([[an[0] + 50, 958], [an[0] + 70, 935]], 2.5, INK); local(p, an[0] + 84, 925, 0.3, () => { p.poly(rrect(-26, -15, 26, 15, 4), "#f4e2a8", 3); p.dot(-18, 0, 3, INK); p.stroke([[-8, -3], [18, -3]], 3, rgba(INK, 0.5)); p.stroke([[-8, 6], [12, 6]], 3, rgba(INK, 0.5)); }); }
  }
  // pelvis
  const pel: P2[] = [...thru([300 - 92, 610], [300 - 120, 660], [300 - 60, 700], 8), ...thru([300 - 60, 700], [300, 676], [300 + 60, 700], 8).slice(1), ...thru([300 + 60, 700], [300 + 120, 660], [300 + 92, 610], 8).slice(1), [300 + 30, 640], [300 - 30, 640]];
  p.shadedFill(pel, BONE, BONE_DK, lt, 110, 0.4); p.poly(pel, null, 4.5);
  for (const sd of [-1, 1]) p.ell(300 + sd * 50, 655, 16, 12, "#3a2a3a", 0);
  // spine
  for (let i = 0; i < 6; i++) p.ell(300, 590 - i * 22, 20, 10, BONE, 4);
  // ribcage
  const rib = ellPts(300, 448, 118, 122, 40);
  p.clip(rib, () => p.ell(300, 448, 118, 122, rgba("#3a2a3a", 0.12), 0));
  for (let i = 0; i < 5; i++) { const y = 372 + i * 34, w2 = 108 - Math.abs(i - 1.5) * 10; for (const sd of [-1, 1]) { const r = thru([300 + sd * 12, y], [300 + sd * w2, y - 12], [300 + sd * (w2 - 22), y + 30], 10); p.stroke(r, 22, INK); p.stroke(r, 13, BONE); } }
  p.poly(rrect(288, 350, 312, 520, 10), BONE, 4);
  // collarbones + neck
  for (const sd of [-1, 1]) bone(p, [300 + sd * 20, 318], [300 + sd * 132, 304], 14, 1);
  for (let i = 0; i < 3; i++) p.ell(300, 300 - i * 18, 16, 9, BONE, 4);
  // arms
  const tapping = s.tap > 0.5;
  bone(p, SK_HUM[0], SK_HUM[1], 24); // THE HUMERUS (screen-left upper arm)
  const wr0: P2 = [92, 566];
  bone(p, SK_HUM[1], wr0, 17); boneHand(p, wr0, Math.atan2(wr0[0] - SK_HUM[1][0], -(wr0[1] - SK_HUM[1][1])) + Math.PI, "rest");
  const shR: P2 = [434, 306];
  if (tapping) { // the far hand crosses the body and taps the humerus: tok tok
    const tip: P2 = s.tok > 0.5 ? [150, 364] : [178, 340], el: P2 = [372, 470], wr: P2 = mixP(el, tip, 0.78);
    bone(p, shR, el, 24); bone(p, el, wr, 17);
    boneHand(p, wr, Math.atan2(tip[0] - wr[0], -(tip[1] - wr[1])), "point");
  } else { const el: P2 = [500, 438], wr: P2 = [506, 566]; bone(p, shR, el, 24); bone(p, el, wr, 17); boneHand(p, wr, Math.PI - 0.05, "rest"); }
  // skull
  const laugh = s.mood === "laugh", tilt = laugh ? -0.14 + (s.jaw > 0.5 ? 0.03 : 0) : s.mood === "smirk" ? 0.08 : 0;
  local(p, H[0], H[1], tilt, () => {
    const jawO = laugh ? (s.jaw > 0.5 ? 46 : 14) : 0, jx = s.mood === "smirk" ? 8 : 0;
    // mandible
    const jaw: P2[] = [...thru([-0.62 * a + jx, 0.42 * a + jawO * 0.4], [-0.58 * a + jx, 0.95 * a + jawO], [0 + jx, 1.0 * a + jawO], 8), ...thru([0 + jx, 1.0 * a + jawO], [0.58 * a + jx, 0.95 * a + jawO], [0.62 * a + jx, 0.42 * a + jawO * 0.4], 8).slice(1), [0.5 * a + jx, 0.6 * a + jawO], [-0.5 * a + jx, 0.6 * a + jawO]];
    if (laugh) p.poly(rrect(-0.46 * a, 0.5 * a, 0.46 * a, 0.62 * a + jawO, 10), "#4a1830", 0);
    p.shadedFill(jaw, BONE, BONE_DK, lt, a, 0.4); p.poly(jaw, null, 4.5);
    for (let i = -3; i <= 3; i++) p.poly(rrect(jx + i * 0.13 * a - 0.055 * a, 0.6 * a + jawO - 0.13 * a, jx + i * 0.13 * a + 0.055 * a, 0.6 * a + jawO + 0.02 * a, 4), WHITE, 3);
    // cranium
    const hp = blobPts(0, -0.05 * a, { a: a, b: a * 0.92, nTop: 2.2, nBot: 2.6, egg: -0.12, asym: 0, rot: 0, noise: 0.01, seed: 17 }, 56);
    p.shadedFill(hp, BONE, BONE_DK, lt, a, 0.4);
    p.clip(hp, () => { p.stroke(thru([-0.2 * a, -0.95 * a] as P2, [0.05 * a, -0.6 * a] as P2, [-0.12 * a, -0.35 * a] as P2, 6), 3, rgba("#8a7a5a", 0.6)); p.stroke(thru([0.6 * a, -0.4 * a], [0.4 * a, -0.25 * a], [0.5 * a, -0.05 * a], 5), 3, rgba("#8a7a5a", 0.5)); });
    p.inkRing(hp, 5, thickAngle(lt), 0.4);
    // top teeth row
    for (let i = -3; i <= 3; i++) p.poly(rrect(i * 0.13 * a - 0.055 * a, 0.44 * a, i * 0.13 * a + 0.055 * a, 0.6 * a, 4), WHITE, 3);
    // nose hole
    p.poly([[-0.1 * a, 0.18 * a], [0.1 * a, 0.18 * a], [0, 0.34 * a]], "#3a2a3a", 3);
    // eye sockets (the whole performance lives here)
    for (const sd of [-1, 1]) {
      const ex = sd * 0.38 * a, ey = -0.08 * a;
      if (laugh) { p.ell(ex, ey, 0.25 * a, 0.22 * a, "#3a2a3a", 3); p.arc(ex, ey + 0.08 * a, 0.17 * a, 0.12 * a, 200, 340, 7, "#fff6d8"); continue; }
      const sly = s.mood === "smirk";
      const sock = ellPts(ex, ey, 0.26 * a, sly ? (sd < 0 ? 0.13 : 0.24) * a : 0.25 * a, 30, sly ? sd * 0.15 : 0);
      p.poly(sock, "#3a2a3a", 3.5);
      if (s.lid > 0.5) p.stroke([[ex - 0.18 * a, ey], [ex + 0.18 * a, ey]], 5, "#fff6d8");
      else p.dot(ex + s.look[0] * 0.1 * a, ey + s.look[1] * 0.07 * a, 0.075 * a, "#fff6d8");
      if (sly) p.stroke(thru([ex - sd * 0.22 * a, ey - (sd < 0 ? 0.2 : 0.36) * a], [ex, ey - (sd < 0 ? 0.24 : 0.44) * a], [ex + sd * 0.24 * a, ey - (sd < 0 ? 0.22 : 0.34) * a], 6), 7, INK);
    }
    if (s.mood === "smirk") p.stroke(thru([0.05 * a, 0.66 * a], [0.4 * a, 0.62 * a], [0.62 * a, 0.42 * a], 6), 6, INK);
  });
  p.ol = olS;
};

// ======================================================================================================================
// PORTRAITS (card: painting window x 0..600, y PT0..PT1; transparent outside)
// ======================================================================================================================
export const PT0 = 92, PT1 = 883;
const PL = -2.3; // painterly light from the upper left
/** old-oil finish: brush grain, craquelure, varnish, a dark vignette */
const oilFinish = (p: Pen, seed: number, age: number) => {
  const g = p.g;
  for (let i = 0; i < 140; i++) { const x = rnd(seed, i) * 600, y = PT0 + rnd(seed + 1, i) * (PT1 - PT0), an = rnd(seed + 2, i) * 0.8 - 0.4; p.stroke([[x, y], [x + Math.cos(an) * 26, y + Math.sin(an) * 26]], 5, rgba(rnd(seed + 3, i) > 0.5 ? "#ffffff" : "#000000", 0.05)); }
  if (age > 0) for (let i = 0; i < 26; i++) { let x = rnd(seed + 4, i) * 600, y = PT0 + rnd(seed + 5, i) * (PT1 - PT0); const pts: P2[] = [[x, y]]; for (let k = 0; k < 4; k++) { x += (rnd(seed + 6, i * 9 + k) - 0.5) * 70; y += (rnd(seed + 7, i * 9 + k) - 0.5) * 70; pts.push([x, y]); } p.stroke(pts, 1.4, rgba("#1a0e08", 0.15 * age)); }
  const vg = g.createRadialGradient(300, (PT0 + PT1) / 2 - 60, 120, 300, (PT0 + PT1) / 2, 520);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(20,10,4,${0.36 * age + 0.1})`);
  g.fillStyle = vg; g.fillRect(0, PT0, 600, PT1 - PT0);
  if (age > 0) { g.fillStyle = rgba("#d8a040", 0.12 * age); g.fillRect(0, PT0, 600, PT1 - PT0); }
};
const paintGround = (p: Pen, c0: string, c1: string) => {
  const g = p.g, gr = g.createLinearGradient(0, PT0, 600, PT1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  g.fillStyle = gr; g.fillRect(0, PT0, 600, PT1 - PT0);
  glow(p, 230, 330, 330, "#ffe0a0", 0.25);
};
const signature = (p: Pen, s: string, col: string) => { const g = p.g; g.save(); g.font = "italic 700 30px Georgia, 'Liberation Serif', serif"; g.fillStyle = col; g.textAlign = "right"; g.fillText(s, 570, PT1 - 22); g.restore(); };
export type OldS = { who: 0 | 1 | 2; laugh: boolean; jig: number; lid: number };
export const drawOld = (p: Pen, s: OldS) => {
  const olS = p.ol; p.ol = 5;
  p.clip(rrect(0, PT0, 600, PT1, 2), () => {
    const L = s.laugh, j = s.jig, a = 128, H: P2 = [300 + (L ? (j ? 6 : -6) : 0), 420 + (L ? (j ? 8 : 0) : 0)], tilt = L ? (j ? -0.2 : -0.14) : 0;
    const skin = ["#f2c8a2", "#f6d2b4", "#eebc96"][s.who];
    if (s.who === 0) paintGround(p, "#7a5a32", "#2e2010"); else if (s.who === 1) paintGround(p, "#5a7a5a", "#1e2e1e"); else paintGround(p, "#8a7a4a", "#3a3220");
    // shoulders / clothes
    const body = [...thru([40, PT1 + 10], [80, 640], [300, 600], 10), ...thru([300, 600], [520, 640], [560, PT1 + 10], 10).slice(1)];
    if (s.who === 0) { p.gradFill(body, "#2a2a3a", "#0e0e18", PL, 0.3); p.poly(body, null, 5); p.poly([[250, 600], [350, 600], [330, 720], [300, 760], [270, 720]], "#f4f0e4", 4.5); p.poly([[262, 610], [338, 610], [320, 660], [280, 660]], "#fffaf0", 4); }
    if (s.who === 1) { p.gradFill(body, "#7a3a6a", "#3a1430", PL, 0.3); p.poly(body, null, 5); p.poly(rrect(250, 560, 350, 640, 20), "#fff4f0", 4.5); for (let i = 0; i < 5; i++) p.arc(300, 590 + i * 10, 50, 8, 0, 180, 2, rgba(INK, 0.3)); for (let i = 0; i < 9; i++) { const an = rad(200 + i * 17.5); p.dot(300 + Math.cos(an) * 90, 655 + Math.sin(an) * -40 + 40, 9, "#fffaf0"); } }
    if (s.who === 2) { p.gradFill(body, "#d8a23a", "#8a5a1a", PL, 0.3); p.poly(body, null, 5); p.poly([[250, 600], [350, 600], [330, 760], [270, 760]], "#e8eef8", 4.5); p.poly([[290, 610], [310, 610], [318, 740], [300, 770], [282, 740]], "#a83a3a", 3.5); for (let i = 0; i < 4; i++) p.dot(342, 680 + i * 50, 7, "#6a3a1a"); }
    // head
    local(p, H[0], H[1], tilt, () => {
      if (s.who === 1) { const hb = puffPts(0, -0.55 * a, 1.05 * a, 0.62 * a, 9, 5); p.poly(hb, "#7a4a2a", 5); }
      if (s.who === 0) for (const sd of [-1, 1]) { const ch = puffPts(sd * 0.86 * a, 0.25 * a, 0.3 * a, 0.5 * a, 7, 3 + sd); p.poly(ch, "#6a3a1a", 4.5); }
      const hp = blobPts(0, 0, headBlob(s.who * 4 + 3, a, 0));
      p.shadedFill(hp, skin, mul(skin, SH_SKIN), PL, a, 0.4); p.inkRing(hp, 5.5, thickAngle(PL), 0.4);
      if (s.who === 0) for (const sd of [-1, 1]) { const ch = [...thru([sd * 0.98 * a, -0.25 * a], [sd * 1.08 * a, 0.3 * a], [sd * 0.62 * a, 0.62 * a], 8), ...thru([sd * 0.62 * a, 0.62 * a], [sd * 0.75 * a, 0.2 * a], [sd * 0.9 * a, -0.25 * a], 8).slice(1)]; p.gradFill(ch, "#7a4a22", "#3a200e", PL, 0.3); p.poly(ch, null, 4.5); }
      const fe: FaceS = { e: L ? "laugh" : s.who === 1 ? "jolly" : "proud", look: [0, 0], shake: j };
      face(p, fe, a, skin, L ? 0 : s.lid, { nose: mul(skin, [0.95, 0.8, 0.8]) });
      if (s.who === 0) { // top hat + monocle
        local(p, 0, -0.72 * a - (L ? (j ? 46 : 30) : 0), L ? (j ? 0.18 : 0.1) : 0, () => { p.poly(rrect(-0.62 * a, -1.5 * a, 0.62 * a, 0, 8), "#16161e", 5); p.poly(rrect(-0.62 * a, -0.36 * a, 0.62 * a, -0.2 * a, 3), "#6a1a2a", 0); p.poly(rrect(-1.0 * a, -0.1 * a, 1.0 * a, 0.08 * a, 10), "#16161e", 5); p.stroke([[-0.4 * a, -1.35 * a], [-0.4 * a, -0.5 * a]], 6, rgba(WHITE, 0.15)); });
        const mon: P2 = L ? [0.95 * a, 0.75 * a + (j ? 16 : 0)] : [0.37 * a, -0.06 * a];
        p.stroke(thru(mon, [0.9 * a, 0.9 * a], [0.7 * a, 1.6 * a], 8), 3, "#d8a83a");
        p.ell(mon[0], mon[1], 0.22 * a, 0.22 * a, rgba(WHITE, 0.2), 6); p.ell(mon[0], mon[1], 0.22 * a, 0.22 * a, null, 3); p.arc(mon[0], mon[1], 0.22 * a, 0.22 * a, 0, 360, 4, "#e8b84a");
        p.stroke([[mon[0] - 0.1 * a, mon[1] - 0.1 * a], [mon[0] - 0.02 * a, mon[1] - 0.15 * a]], 4, rgba(WHITE, 0.8));
        if (L) for (let i = 0; i < 3; i++) p.stroke([[mon[0] + 0.3 * a + i * 6, mon[1] - 0.3 * a + i * 14], [mon[0] + 0.45 * a + i * 6, mon[1] - 0.38 * a + i * 14]], 4);
      }
      if (s.who === 1) { // pinned-up hair + the HUGE feathered hat
        const hf: P2[] = [...thru([-0.99 * a, 0], [-0.8 * a, -0.95 * a], [0, -1.0 * a], 10), ...thru([0, -1.0 * a], [0.8 * a, -0.95 * a], [0.99 * a, 0], 10).slice(1), ...thru([0.99 * a, 0], [0.4 * a, -0.6 * a], [-0.99 * a, 0], 10).slice(1)];
        p.gradFill(hf, "#8a5a32", "#4a2a14", PL, 0.3); p.poly(hf, null, 5);
        local(p, 0, -0.85 * a, L ? (j ? 0.12 : -0.05) : -0.06, () => {
          for (let i = 0; i < 3; i++) { const fa = -0.9 + i * 0.5 + (L ? (j ? 0.15 : -0.15) * (i - 1) : 0), base: P2 = [0.3 * a, -0.35 * a], tip: P2 = [base[0] + Math.sin(fa) * 1.7 * a, base[1] - Math.cos(fa) * 1.7 * a]; const fe2 = [...thru(base, mixP(base, tip, 0.5).map((v, k) => v + (k === 0 ? 0.3 * a : 0)) as P2, tip, 10), ...thru(tip, mixP(base, tip, 0.5).map((v, k) => v - (k === 0 ? 0.2 * a : 0)) as P2, base, 10).slice(1)]; p.poly(fe2, ["#f4f0ff", "#ff9ad0", "#c8b0ff"][i], 4); p.stroke(thru(base, mixP(base, tip, 0.5), tip, 8), 3, rgba(INK, 0.5)); }
          const crown = [...thru([-0.7 * a, 0], [-0.6 * a, -0.6 * a], [0, -0.62 * a], 8), ...thru([0, -0.62 * a], [0.6 * a, -0.6 * a], [0.7 * a, 0], 8).slice(1)];
          p.poly(crown, "#5a2a6a", 5); p.poly(rrect(-1.5 * a, -0.08 * a, 1.5 * a, 0.12 * a, 20), "#5a2a6a", 5); p.poly(rrect(-0.72 * a, -0.2 * a, 0.72 * a, -0.04 * a, 4), "#ff6aa0", 3.5); p.poly(starPts(0.5 * a, -0.12 * a, 0.16 * a, 6, 0.5), "#ffd0e8", 3);
        });
      }
      if (s.who === 2) { // side-parted hair + glasses + the pipe
        const hf: P2[] = [...thru([-0.99 * a, -0.15 * a], [-0.8 * a, -0.98 * a], [0.1 * a, -1.02 * a], 10), ...thru([0.1 * a, -1.02 * a], [0.85 * a, -0.85 * a], [0.99 * a, -0.15 * a], 10).slice(1), [0.7 * a, -0.5 * a], ...thru([0.7 * a, -0.5 * a], [-0.1 * a, -0.65 * a], [-0.6 * a, -0.42 * a], 8).slice(1)];
        p.gradFill(hf, "#3a2a1a", "#1a120a", PL, 0.3); p.poly(hf, null, 5); p.stroke(thru([-0.4 * a, -0.85 * a], [0, -0.92 * a], [0.4 * a, -0.82 * a], 6), 7, rgba(WHITE, 0.35));
        for (const sd of [-1, 1]) p.poly(rrect(sd * 0.37 * a - 0.24 * a, -0.24 * a, sd * 0.37 * a + 0.24 * a, 0.1 * a, 10), rgba(WHITE, 0.12), 4.5);
        p.stroke([[-0.13 * a, -0.08 * a], [0.13 * a, -0.08 * a]], 4.5);
        const pip: P2 = L ? [0.5 * a, 1.2 * a + (j ? 26 : 0)] : [0.22 * a, 0.5 * a], pa = L ? (j ? 1.1 : 0.8) : 0.25;
        local(p, pip[0], pip[1], pa, () => { p.stroke([[0, 0], [0.55 * a, 0.05 * a]], 12, INK); p.stroke([[0, 0], [0.55 * a, 0.05 * a]], 6, "#3a2414"); p.poly(rrect(0.5 * a, -0.28 * a, 0.72 * a, 0.12 * a, 8), "#6a3a1a", 4); p.ell(0.61 * a, -0.27 * a, 0.1 * a, 0.03 * a, "#2a1a0a", 0); });
        const puff = puffPts(pip[0] + 0.75 * a, pip[1] - 0.6 * a, 26, 20, 6, 12); p.poly(puff, rgba("#e8e8f0", 0.8), 3);
      }
    });
    oilFinish(p, 7 + s.who * 13, 1);
    signature(p, ["1840", "1900", "1950"][s.who], "#c8a060");
  });
  p.ol = olS;
};
/** BEAN's 2026 portrait: the hallway doorway composition of the shot 6 camera. M maps bean units -> portrait canvas
 *  (affine [a, b, c, d, e, f] as canvas setTransform); bg gives the doorway jambs (canvas x of the inner edges, y of
 *  the lintel) seen through the same mapping. */
export type NewS = { bean: BeanS; M: [number, number, number, number, number, number]; jambL: number; jambR: number; lintel: number; floorY: number; casL?: number; casR?: number };
export const drawNew = (p: Pen, s: NewS) => {
  const g = p.g;
  p.clip(rrect(0, PT0, 600, PT1, 2), () => {
    // the sunny yellow kitchen through the doorway, cream hallway wall either side
    g.fillStyle = "#f4e6c8"; g.fillRect(0, PT0, 600, PT1 - PT0);
    const kg = g.createLinearGradient(0, PT0, 0, PT1); kg.addColorStop(0, "#ffe27a"); kg.addColorStop(1, "#f6c04a");
    g.fillStyle = kg; g.fillRect(s.jambL, Math.max(PT0, s.lintel), s.jambR - s.jambL, PT1 - Math.max(PT0, s.lintel));
    g.fillStyle = "#e8d8b8"; g.fillRect(s.jambL, s.floorY, s.jambR - s.jambL, PT1 - s.floorY);
    for (let i = 0; i < 6; i++) { g.fillStyle = rgba("#ffffff", 0.35); g.fillRect(s.jambL + 10, s.floorY - 150 + i * 22, s.jambR - s.jambL - 20, 3); }
    glow(p, (s.jambL + s.jambR) / 2 + 120, PT0 + 140, 260, "#fff8d8", 0.6);
    for (const [x0, x1] of [[s.casL ?? s.jambL - 46, s.jambL], [s.jambR, s.casR ?? s.jambR + 46]]) { p.poly([[x0, PT0 - 10], [x1, PT0 - 10], [x1, PT1 + 10], [x0, PT1 + 10]] as P2[], "#fbf8f0", 4); }
    g.save(); g.transform(...s.M); drawBean(p, s.bean); g.restore();
    oilFinish(p, 61, 0);
    signature(p, "2026", "#5a4a3a");
  });
};
void alpha; void SH_HAIR; void SH_CLOTH;
