// OWNER: cast. BEAN for "Live Wire" (NEW drawing): bean head, messy brown hair + cowlick, red nose, royal-blue STRIPED
// tee, mango shorts, striped socks (he's at home: no shoes). Props: the heaped LAUNDRY BASKET (shirts, towel, jeans,
// socks, a rubber duck on top), the sock that lands on his head, the ICE PACK (museum), the PILLOW taped to his elbow
// (end + the 2026 portrait). THE MEME (peak only): electrocuted: hair blasted into spikes, two huge mismatched
// bloodshot eyeballs, a rigid rectangle grimace of teeth, a light-bulb nose, his right arm flashing X-RAY (bones + the
// glowing yellow ulnar nerve, white-hot at the elbow), laundry + the rubber duck blasting upward. Two drawings (buzz).
// Coordinates: "bean units" (1 unit = SU * BEAN_SC m), soles at y 975, body centre x 300. The caller sets the
// canvas transform (cast.ts), so the same drawing serves the wide hallway card, the museum and the 2026 portrait.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix } from "../bridge/toon";
import {
  P2, WHITE, rad, rnd, cl01, thru, ellPts, rgba, rrect, limb, glow, local, puffPts, zig, starPts, SH_SKIN, SH_HAIR, SH_CLOTH,
  HandK, HAND_WRIST, drawHand, FaceS, face, mixP, lerp,
} from "./cast_kit";

export const SKIN_B = "#ffdcc0";
const HAIR = "#6a3b22", TEE = "#2f6dff", TEE_DK = "#1f45b0", STRIPE = "#bfe0ff", SHORTS = "#ffa53a", SHORTS_DK = "#d0782a";
const SOCK = "#ffffff", SOCK_ST = "#ff4a5a";
/** body landmarks (bean units) */
export const B_HEAD: P2 = [300, 139];
export const B_A = 118;
export const B_BODY: P2 = [300, 428];
const RX = 116, RY = 148;
export const SH_R: P2 = [208, 302], SH_L: P2 = [392, 302];

export type ArmB = { sh: P2; el: P2; wr: P2; hand: HandK; hang?: number; hk?: number; xray?: boolean };
export type BasketS = { c: P2; rot: number; topSock: boolean; jolt?: number };
export type BeanS = {
  face: FaceS; lid: number; tilt: number; light: number;
  arms: [ArmB, ArmB];
  /** walk phase 0..1 (undefined = standing); stiff = the zapped rigid stance */ walk?: number; stiff?: boolean;
  basket?: BasketS; sock?: number; prop?: "ice" | "pillow";
  /** 0/1 the meme (buzz = which of the 2 drawings) */ meme?: boolean; buzz?: number;
  turn?: number; noseGlow?: number;
};

export const mixArm = (a: ArmB, b: ArmB, k: number): ArmB => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  return { ...(k < 0.5 ? a : b), sh: mixP(a.sh, b.sh, k), el: mixP(a.el, b.el, k), wr: mixP(a.wr, b.wr, k), hang: lerp(a.hang ?? 0, b.hang ?? 0, k), hk: lerp(a.hk ?? 0.34, b.hk ?? 0.34, k) };
};
const handAng = (A: ArmB) => Math.atan2(A.wr[0] - A.el[0], -(A.wr[1] - A.el[1])) + (A.hang ?? 0);
/** the palm centre of an arm (bean units) */
export const palmB = (A: ArmB): P2 => { const an = handAng(A), r = HAND_WRIST * 0.8 * (A.hk ?? 0.34); return [A.wr[0] + Math.sin(an) * r, A.wr[1] - Math.cos(an) * r]; };

// ---------------- pieces ----------------
const legs = (p: Pen, s: BeanS) => {
  const a = B_A, ph = s.walk;
  for (const sd of [-1, 1]) {
    const sw = ph === undefined ? 0 : Math.sin((ph + (sd > 0 ? 0.5 : 0)) * Math.PI * 2);
    const lift = ph === undefined ? 0 : Math.max(0, sw) * 34;
    const hip: P2 = [300 + sd * 52, 590], foot: P2 = s.stiff ? [300 + sd * 92, 948] : [300 + sd * 62 + sw * 16, 948 - lift];
    const knee: P2 = s.stiff ? [300 + sd * 76, 770] : [(hip[0] + foot[0]) / 2 + sd * 4, (hip[1] + foot[1]) / 2 - lift * 0.3];
    const pts = thru(hip, knee, foot, 12);
    limb(p, pts, SKIN_B, 0.4 * a, 5);
    // striped socks up the shin
    const sk = pts.slice(9);
    limb(p, sk, SOCK, 0.46 * a, 5);
    for (let i = 0; i < 3; i++) { const q = mixP(sk[0], sk[sk.length - 1], 0.12 + i * 0.22); p.stroke([[q[0] - 0.22 * a, q[1]], [q[0] + 0.22 * a, q[1]]], 9, SOCK_ST); }
    const fx = foot[0] + sd * 14, fy = foot[1] + 10;
    p.ell(fx, fy, 0.4 * a, 0.17 * a, SOCK, 5);
    p.ell(fx + sd * 0.22 * a, fy + 2, 0.13 * a, 0.1 * a, SOCK_ST, 0);
  }
  // shorts
  const sp: P2[] = [[300 - 1.0 * a, 560], [300 + 1.0 * a, 560], [300 + 1.08 * a, 690], [300 + 0.12 * a, 700], [300, 660], [300 - 0.12 * a, 700], [300 - 1.08 * a, 690]];
  p.gradFill(sp, SHORTS, SHORTS_DK, s.light, 0.3); p.poly(sp, null, 5);
  p.stroke([[300, 600], [300, 655]], 3, rgba(INK, 0.5));
};
const torso = (p: Pen, s: BeanS) => {
  const c = B_BODY, pts = blobPts(c[0], c[1], { a: RX, b: RY, nTop: 2.1, nBot: 2.8, egg: 0.08, asym: 0, rot: 0, noise: 0.01, seed: 26 }, 60);
  p.shadedFill(pts, TEE, TEE_DK, s.light, RX, 0.4);
  p.clip(pts, () => {
    for (let i = 0; i < 5; i++) { const y = c[1] - 0.62 * RY + i * 0.34 * RY; p.poly(rrect(c[0] - 2 * RX, y, c[0] + 2 * RX, y + 0.13 * RY, 2), rgba(STRIPE, 0.85), 0); }
    p.ell(c[0], c[1] - RY * 1.0, 0.36 * RX, 0.16 * RY, TEE_DK, 4);
    p.poly([[c[0] - 2 * RX, c[1] + 0.86 * RY], [c[0] + 2 * RX, c[1] + 0.86 * RY], [c[0] + 2 * RX, c[1] + 2 * RY], [c[0] - 2 * RX, c[1] + 2 * RY]], rgba(INK, 0.12), 0);
  });
  p.inkRing(pts, 5, thickAngle(s.light), 0.4);
};
/** messy bean hair: the cap + 3 stray tufts + the cowlick */
const hairFront = (p: Pen, a: number, light: number, shift: number) => {
  const col = HAIR, hd = mul(col, SH_HAIR), sx = shift * a * 0.45;
  const cap: P2[] = [...thru([-0.99 * a, -0.05 * a], [-0.78 * a, -0.86 * a], [0.02 * a, -1.02 * a], 10), ...thru([0.02 * a, -1.02 * a], [0.78 * a, -0.86 * a], [0.99 * a, -0.1 * a], 10).slice(1),
    ...thru([0.99 * a, -0.1 * a], [0.85 * a, -0.45 * a], [0.55 * a + sx, -0.5 * a], 6).slice(1), [0.38 * a + sx, -0.36 * a], [0.3 * a + sx, -0.46 * a],
    ...thru([0.3 * a + sx, -0.46 * a], [0.05 * a + sx, -0.3 * a], [-0.2 * a + sx, -0.42 * a], 8).slice(1), [-0.3 * a + sx, -0.3 * a], [-0.45 * a + sx, -0.44 * a],
    ...thru([-0.45 * a + sx, -0.44 * a], [-0.8 * a, -0.3 * a], [-0.99 * a, -0.05 * a], 6).slice(1)];
  p.gradFill(cap, col, hd, light, 0.3); p.poly(cap, null, 5);
  p.stroke(thru([0.12 * a, -0.9 * a], [0.42 * a, -0.82 * a], [0.66 * a, -0.6 * a], 6), 0.05 * a, rgba(WHITE, 0.5));
  for (const [x0, y0, x1, y1] of [[-0.62, -0.84, -0.86, -1.02], [0.58, -0.86, 0.86, -0.98]] as const) { const tf = thru([x0 * a, y0 * a], [(x0 + x1) / 2 * a, (y0 + y1) / 2 * a - 0.08 * a], [x1 * a, y1 * a], 6); p.stroke(tf, 0.1 * a + 10, INK); p.stroke(tf, 0.1 * a, col); }
  const cw = thru([-0.08 * a, -0.98 * a], [-0.22 * a, -1.28 * a], [0.22 * a, -1.36 * a], 8); p.stroke(cw, 0.13 * a + 10, INK); p.stroke(cw, 0.13 * a, col);
};
/** THE MEME hair: every hair blasted straight up into spikes, sparks crackling at the tips, a wisp of smoke */
const zapHair = (p: Pen, a: number, buzz: number) => {
  const n = 11;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), ang = rad(-90 + (u - 0.5) * 120 + (buzz ? 3 : -3) * Math.sin(i * 2.1)), L = a * (1.05 + 0.5 * Math.sin(u * Math.PI) + 0.18 * rnd(9 + buzz, i)), w = 0.2 * a;
    const B: P2 = [Math.cos(ang) * a * 0.72, Math.sin(ang) * a * 0.72 - 0.1 * a], T: P2 = [B[0] + Math.cos(ang) * L, B[1] + Math.sin(ang) * L];
    const nn: P2 = [-Math.sin(ang) * w, Math.cos(ang) * w];
    const pts: P2[] = [[B[0] + nn[0], B[1] + nn[1]], [T[0] + nn[0] * 0.08, T[1] + nn[1] * 0.08], T, [B[0] - nn[0], B[1] - nn[1]]];
    p.poly(pts, i % 2 ? HAIR : mul(HAIR, [1.15, 1.1, 1.05]), 5);
    p.stroke([[B[0] + nn[0] * 0.3, B[1] + nn[1] * 0.3], [T[0] * 0.75 + B[0] * 0.25, T[1] * 0.75 + B[1] * 0.25]], 0.035 * a, rgba(WHITE, 0.35));
    if ((i + buzz) % 3 === 0) { glow(p, T[0], T[1], 0.3 * a, "#9af6ff", 0.8); p.poly(starPts(T[0], T[1], 0.16 * a, 4, 0.25, buzz ? 0.4 : 0), "#eaffff", 3); }
  }
};
const head = (p: Pen, s: BeanS, skin: string) => {
  const a = B_A, sh = s.turn ?? 0, lt = s.light - s.tilt;
  local(p, B_HEAD[0], B_HEAD[1], s.tilt, () => {
    if (s.meme) zapHair(p, a, s.buzz ?? 0);
    for (const sd of [-1, 1]) if (!(sh > 0.3 && sd > 0) && !(sh < -0.3 && sd < 0)) { p.ell(sd * 0.98 * a, 0.08 * a, 0.16 * a, 0.21 * a, skin, 4.5); p.arc(sd * 0.98 * a, 0.08 * a, 0.07 * a, 0.1 * a, sd > 0 ? 120 : -60, sd > 0 ? 240 : 60, 3, rgba(INK, 0.5)); }
    const hp = blobPts(0, 0, headBlob(23, a, 0));
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), lt, a, 0.4);
    if (s.meme) p.clip(hp, () => glow(p, 0, -0.2 * a, 1.3 * a, "#8af4ff", 0.25));
    p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
    face(p, s.face, a, skin, s.lid, { nose: "#ff4a4a", shift: sh, noseGlow: s.noseGlow, noBrow: false });
    if (s.meme) { // a thin hairline band: the scalp under the blasted hair
      const band = [...thru([-0.92 * a, -0.42 * a], [0, -1.0 * a], [0.92 * a, -0.42 * a], 12), ...thru([0.92 * a, -0.42 * a], [0, -0.82 * a], [-0.92 * a, -0.42 * a], 12).slice(1)];
      p.poly(band, HAIR, 4.5);
    } else hairFront(p, a, lt, sh);
    if ((s.sock ?? 0) > 0.01) sockOnHead(p, a, s.sock!);
  });
};
/** a white tube sock with red stripes flopped over his hair, the toe dangling past his ear (screen-right) */
const sockOnHead = (p: Pen, a: number, k: number) => {
  const sq = 1 + 0.12 * Math.sin(Math.min(1, k) * Math.PI) * (k < 1 ? 1 : 0);
  // (lead) centred ~0.2 m above the head centre = where the fx flying sock lands at f 40 (fx: headAt + (0, 0.2, 0.03))
  local(p, -0.24 * a, -1.36 * a, -0.15, () => {
    const body = [...thru([-0.55 * a, -0.05 * a], [0.1 * a, -0.28 * a], [0.75 * a, 0.02 * a], 10), ...thru([0.75 * a, 0.02 * a], [0.98 * a, 0.25 * a], [0.94 * a, 0.62 * a], 8).slice(1),
      ...thru([0.94 * a, 0.62 * a], [1.06 * a, 0.86 * a], [0.86 * a, 0.92 * a], 6).slice(1), ...thru([0.86 * a, 0.92 * a], [0.7 * a, 0.8 * a], [0.68 * a, 0.42 * a], 6).slice(1),
      ...thru([0.68 * a, 0.42 * a], [0.5 * a, 0.14 * a], [-0.52 * a, 0.16 * a], 10).slice(1)];
    p.poly(body, SOCK, 5);
    p.clip(body, () => {
      for (let i = 0; i < 3; i++) { const x = -0.35 * a + i * 0.22 * a; p.poly([[x, -0.4 * a], [x + 0.09 * a, -0.4 * a], [x + 0.09 * a, 0.4 * a], [x, 0.4 * a]], SOCK_ST, 0); }
      p.ell(0.9 * a, 0.8 * a, 0.22 * a, 0.2 * a, SOCK_ST, 0);
      p.ell(0.2 * a, 0.2 * a, 1.2 * a, 0.12 * a, rgba("#8a8aa8", 0.25), 0);
    });
    p.poly(body, null, 5);
    p.poly(rrect(-0.66 * a, -0.08 * a, -0.48 * a, 0.2 * a, 0.06 * a), "#f2f2f6", 4);
  }, 0.78, 0.78 / sq);
};

// ---------------- arms ----------------
const armDraw = (p: Pen, A: ArmB, skin: string) => {
  const w = 44, pts: P2[] = [A.sh, ...thru(A.sh, mixP(A.sh, A.el, 0.5), A.el, 4).slice(1, -1), A.el, A.wr];
  limb(p, pts, skin, w, 5);
  // the short tee sleeve over the top of the upper arm
  const sl: P2[] = [A.sh, mixP(A.sh, A.el, 0.36)];
  limb(p, sl, TEE, w + 16, 5);
  const an = handAng(A), hk = A.hk ?? 0.34;
  local(p, A.wr[0], A.wr[1], an, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, A.hand, skin, A.sh[0] > 300)), hk);
};
/** the X-RAY arm: a dark see-through silhouette, glowing bones, and the ulnar NERVE white-hot behind the elbow */
const xrayArm = (p: Pen, A: ArmB, buzz: number) => {
  const pts: P2[] = [A.sh, A.el, A.wr], w = 60;
  p.stroke(pts, w + 26, rgba("#7af0ff", 0.45));
  limb(p, pts, "#24408e", w, 5);
  const fist: P2 = palmB(A);
  p.ell(fist[0], fist[1], 60, 54, "#24408e", 5);
  limb(p, [A.sh, mixP(A.sh, A.el, 0.3)], TEE, w + 14, 5); // the tee sleeve stays: it's HIS arm
  const BONE = "#f4fbff", bg = (q: P2[], bw: number) => { p.stroke(q, bw + 10, rgba("#9af6ff", 0.6)); p.stroke(q, bw, BONE); };
  // humerus (knobby ends) + radius / ulna + finger bones
  const d = Math.hypot(A.el[0] - A.sh[0], A.el[1] - A.sh[1]) || 1, nx = -(A.el[1] - A.sh[1]) / d, ny = (A.el[0] - A.sh[0]) / d;
  bg([mixP(A.sh, A.el, 0.1), mixP(A.sh, A.el, 0.9)], 13);
  for (const k of [0.08, 0.92]) for (const s of [-1, 1]) { const q = mixP(A.sh, A.el, k); p.dot(q[0] + nx * s * 8, q[1] + ny * s * 8, 9, BONE); }
  const d2 = Math.hypot(A.wr[0] - A.el[0], A.wr[1] - A.el[1]) || 1, mx = -(A.wr[1] - A.el[1]) / d2, my = (A.wr[0] - A.el[0]) / d2;
  for (const s of [-1, 1]) bg([[A.el[0] + mx * s * 7 + (A.wr[0] - A.el[0]) * 0.08, A.el[1] + my * s * 7 + (A.wr[1] - A.el[1]) * 0.08], [A.wr[0] + mx * s * 6, A.wr[1] + my * s * 6]], 7);
  for (let i = 0; i < 4; i++) { const x = fist[0] - 33 + i * 22; bg([[x, fist[1] - 34], [x, fist[1] - 14]], 8); bg([[x, fist[1] - 4], [x + 2, fist[1] + 16]], 8); }
  bg([[fist[0] - 30, fist[1] + 30], [fist[0] + 30, fist[1] + 30]], 7);
  // the NERVE: a glowing yellow cable down the inner arm, kinked round the elbow knob
  const kn: P2 = [A.el[0] - nx * 22, A.el[1] - ny * 22];
  const nerve: P2[] = [...thru(mixP(A.sh, A.el, 0.05), mixP(mixP(A.sh, A.el, 0.55), kn, 0.4), kn, 8), ...thru(kn, mixP(kn, mixP(A.el, A.wr, 0.5), 0.6), fist, 8).slice(1)];
  p.stroke(nerve, 16, rgba("#ffe24a", 0.5));
  p.stroke(nerve, 7, "#fff27a");
  glow(p, kn[0], kn[1], 70, "#ffffff", 0.9); glow(p, kn[0], kn[1], 110, "#7af0ff", 0.55);
  p.poly(starPts(kn[0], kn[1], 34, 6, 0.3, buzz ? 0.3 : 0), "#ffffff", 3);
  // crackle arcs round the arm
  for (let i = 0; i < 3; i++) { const q = mixP(A.sh, A.wr, 0.2 + i * 0.3), o = (i % 2 ? 1 : -1) * 40; p.stroke(zig([q[0] + nx * o, q[1] + ny * o - 20], [q[0] + nx * o * 1.6, q[1] + ny * o + 26], 4, 9, i + buzz * 5), 5, "#d8fdff"); }
};

// ---------------- props ----------------
const CLOTH = ["#ffffff", "#ff8fb8", "#4a7ae0", "#7ad07a", "#ffd23a", "#c07aff"];
/** the heaped wicker laundry basket (local: centre 0,0; W half-width) */
const basket = (p: Pen, b: BasketS, light: number) => {
  const W = 178, H = 140;
  local(p, b.c[0], b.c[1] - (b.jolt ?? 0), b.rot, () => {
    // heap of laundry above the rim
    const heap: [number, number, number, number, number][] = [[-120, -92, 70, 46, 2], [-30, -116, 92, 58, 0], [86, -100, 78, 50, 1], [-80, -150, 62, 40, 3], [40, -158, 70, 42, 5], [128, -84, 50, 36, 4]];
    heap.forEach(([x, y, rx, ry, c], i) => {
      const pts = puffPts(x, y, rx, ry, 7, 11 + i, 1.08);
      p.gradFill(pts, CLOTH[c], mul(CLOTH[c], SH_CLOTH), light, 0.35); p.poly(pts, null, 4.5);
      p.stroke(thru([x - rx * 0.6, y + ry * 0.1], [x, y - ry * 0.25], [x + rx * 0.55, y + ry * 0.15], 6), 3, rgba(INK, 0.35));
    });
    // jeans leg flopping over the rim (screen-right) + a green sock over the left rim
    p.poly([[W - 70, -H / 2 - 20], [W + 4, -H / 2 - 18], [W + 22, -H / 2 + 70], [W - 22, -H / 2 + 74]], "#3f62b8", 4.5);
    p.stroke([[W - 10, -H / 2 + 50], [W + 14, -H / 2 + 48]], 3, rgba(WHITE, 0.5));
    p.poly([[-W + 30, -H / 2 - 16], [-W - 8, -H / 2 + 8], [-W - 14, -H / 2 + 56], [-W + 12, -H / 2 + 60], [-W + 14, -H / 2 + 18]], "#7ad07a", 4);
    if (b.topSock) { // the red striped sock about to fly off (fx takes it over at the BONK)
      local(p, -10, -188, 0.25, () => { p.poly(rrect(-58, -16, 40, 16, 14), SOCK, 4); for (let i = 0; i < 3; i++) p.poly(rrect(-46 + i * 26, -15, -34 + i * 26, 15, 2), SOCK_ST, 0); p.ell(46, 6, 22, 18, SOCK, 4); p.poly(rrect(-58, -16, 40, 16, 14), null, 4); });
    }
    // the RUBBER DUCK on the summit
    local(p, 70, -196, -0.1, () => duck(p, 34, "calm"));
    // the basket: tapered wicker tub with a rim + handle holes
    const tub: P2[] = [[-W, -H / 2], [W, -H / 2], [W * 0.84, H / 2], [-W * 0.84, H / 2]];
    p.gradFill(tub, "#e8b062", "#a8682a", light, 0.3);
    p.clip(tub, () => {
      for (let i = 0; i < 5; i++) { const y = -H / 2 + 22 + i * 26; p.stroke([[-W, y], [W, y]], 6, rgba("#8a4a1a", 0.45)); }
      for (let i = -6; i <= 6; i++) p.stroke([[i * 28, -H / 2], [i * 24, H / 2]], 4, rgba("#fff0c0", 0.35));
      p.poly([[-W, H / 2 - 30], [W, H / 2 - 30], [W, H / 2], [-W, H / 2]], rgba(INK, 0.15), 0);
    });
    p.poly(tub, null, 5);
    p.poly(rrect(-W - 10, -H / 2 - 12, W + 10, -H / 2 + 14, 12), "#f4c47a", 5);
    for (const s of [-1, 1]) p.poly(rrect(s * W * 0.62 - 26, -H / 2 + 26, s * W * 0.62 + 26, -H / 2 + 44, 9), "#5a2a12", 3);
  });
};
/** a yellow rubber duck (local: body centre 0,0, size r) */
export const duck = (p: Pen, r: number, mood: "calm" | "shock") => {
  p.ell(0, 0.2 * r, 1.05 * r, 0.7 * r, "#ffd21a", Math.max(3, 0.1 * r));
  p.poly(thru([0.7 * r, -0.1 * r], [1.25 * r, -0.5 * r], [1.05 * r, 0.2 * r], 6), "#ffd21a", Math.max(3, 0.1 * r));
  p.ell(-0.35 * r, -0.55 * r, 0.55 * r, 0.52 * r, "#ffd21a", Math.max(3, 0.1 * r));
  p.poly([[-0.85 * r, -0.62 * r], [-1.35 * r, -0.5 * r], [-0.85 * r, -0.38 * r]], "#ff8a1a", Math.max(2.5, 0.08 * r));
  if (mood === "calm") p.dot(-0.5 * r, -0.7 * r, 0.09 * r);
  else { p.ell(-0.45 * r, -0.72 * r, 0.2 * r, 0.22 * r, WHITE, Math.max(2, 0.06 * r)); p.dot(-0.45 * r, -0.72 * r, 0.05 * r); }
  p.ell(0.15 * r, 0.12 * r, 0.42 * r, 0.24 * r, rgba("#ffffff", 0.35), 0);
};
/** the blue gel ICE PACK strapped round the elbow with a white bandage */
const icePack = (p: Pen, at: P2, ang: number) => local(p, at[0], at[1], ang, () => {
  const pk = rrect(-62, -48, 62, 48, 22);
  p.poly(pk, "#8ad8ff", 5);
  p.clip(pk, () => { p.ell(-18, -20, 40, 18, rgba(WHITE, 0.55), 0); for (let i = 0; i < 5; i++) p.poly(starPts(-30 + i * 16, 20 - (i % 2) * 14, 7, 6, 0.4), rgba(WHITE, 0.8), 0); });
  p.poly(pk, null, 5);
  for (const y of [-26, 22]) p.poly(rrect(-72, y - 9, 72, y + 9, 5), "#f6f2ea", 4);
});
/** a big white PILLOW duct-taped to his elbow */
const pillow = (p: Pen, at: P2, ang: number, light: number) => local(p, at[0], at[1], ang, () => {
  const pl = puffPts(0, 0, 118, 86, 10, 21, 1.06);
  p.gradFill(pl, "#fbfbff", "#c8cce8", light, 0.35);
  p.clip(pl, () => { for (let i = -5; i <= 5; i++) p.stroke([[i * 24, -100], [i * 24 + 10, 100]], 3, rgba("#7aa0e0", 0.35)); });
  p.poly(pl, null, 5);
  for (const s of [-1, 1]) p.stroke([[-112, -58 * s], [-132, -76 * s]], 5); // corners
  for (const s of [-1, 1]) p.stroke([[112, -58 * s], [132, -76 * s]], 5);
  for (const [x, a2] of [[-40, 0.5], [44, -0.45]] as const) local(p, x, 0, a2, () => { const t = rrect(-22, -104, 22, 104, 4); p.poly(t, "#b8bcc8", 4); p.stroke([[-14, -70], [14, -70]], 2, rgba(INK, 0.3)); p.stroke([[-14, 60], [14, 60]], 2, rgba(INK, 0.3)); });
});

/** draw BEAN (bean units; soles y 975, centre x 300) */
export const drawBean = (p: Pen, s: BeanS) => {
  const olS = p.ol; p.ol = 5;
  const skin = SKIN_B;
  legs(p, s);
  const xr = s.arms.map((A) => !!A.xray);
  torso(p, s);
  p.poly(rrect(B_HEAD[0] - 0.24 * B_A, B_HEAD[1] + 0.5 * B_A, B_HEAD[0] + 0.24 * B_A, B_BODY[1] - RY + 16, 12), skin, 0);
  head(p, s, skin);
  if (s.basket) basket(p, s.basket, s.light);
  s.arms.forEach((A, i) => { if (xr[i]) xrayArm(p, A, s.buzz ?? 0); else armDraw(p, A, skin); });
  const R = s.arms[0], an = Math.atan2(R.el[1] - R.sh[1], R.el[0] - R.sh[0]);
  if (s.prop === "ice") icePack(p, mixP(R.sh, R.el, 0.82), an + Math.PI / 2);
  if (s.prop === "pillow") pillow(p, [R.el[0] - 34, R.el[1] - 4], an - Math.PI / 2 + 0.25, s.light);
  if (s.meme) { // laundry + the rubber duck blasting upward round him
    const bz = s.buzz ?? 0;
    local(p, 92, -24 + bz * 6, -0.5 + bz * 0.08, () => { // a pair of pants (undies) with hearts
      const up: P2[] = [[-60, -34], [60, -34], [56, 6], [14, 40], [0, 16], [-14, 40], [-56, 6]];
      p.poly(up, "#ff8fb8", 4.5); p.clip(up, () => { for (let i = 0; i < 4; i++) p.dot(-34 + i * 22, -8 + (i % 2) * 14, 7, "#ffffff"); }); p.poly(up, null, 4.5);
      p.poly(rrect(-62, -40, 62, -26, 6), "#ffffff", 4);
    });
    local(p, 446, -104 - bz * 6, 0.3 - bz * 0.1, () => duck(p, 36, "shock"));
    for (const [x, y] of [[60, 70], [470, 20], [130, -150]] as const) p.stroke(zig([x, y], [x + 30, y + 60], 4, 10, x + bz), 5, "#d8fdff");
  }
  void cl01; void ellPts; void mix;
  p.ol = olS;
};
