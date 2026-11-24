// OWNER: flock agent. See /home/user/lookmatch/EMU_BRIEF.md
// Every emu in the short. One cartoon emu design drawn with the bridge Pen (flat card, ink outline, painted crescent) in a
// 1000 x 1000 design space (soles at y = 975, 1000 units = 1.9 m, head top ~1.7 m). Two render paths share the art:
//   HERO  : the nearest <= 64 birds within 22 m get their own canvas (bridge Pool / Actor, cardShade) at a resolution
//           tier by distance, drawn from the exact pose + expression + blink (continuous phases).
//   CROWD : everyone else is an instanced quad sampling one of two 2048 atlases (side / front, 6 x 6 cells of 341 px)
//           with the same cardShade lighting (atlas UV patched in), so the swap at 22 m does not show.
// Every bird is a pure function of (shot id, t): fixed layouts + analytic motion, seeded per-bird phase. Feet on y = 0,
// contact blob under each bird (instanced multiply quads), dust puffs from analytic trajectories. Collision-free by
// construction: lane flows where the bird ahead always arrives first, rigid formations, radial scatters.
import * as THREE from "three";
import { Pen, INK } from "../bridge/toon";
import { Pool, Actor, lidAt } from "../bridge/cast";
import { cardShade, blobMaterial, CARD_K } from "../bridge/cardshade";
import { NOINK } from "../bridge/ink";
import { untone } from "../bridge/shade";
import { W, FARM, DAM, HIDE, ROAD, SCORE, HOMESTEAD, SHOTS, LEAD, chaseAt, clamp01, smooth, V3 } from "./story";
import { LOOKS } from "./looks";

// ======================================================================================================== art
type P2 = [number, number];
export const SE = 0.0019; // metres per design unit
const LIGHT = -2.2; // painted light from the upper left (canvas angle)
const C = {
  body: "#74503a", bodyD: "#4a3022", bodyL: "#a07a56", bodyDD: "#33211a",
  skin: "#8cb0dc", skinD: "#6788bb", face: "#94b9e4", faceD: "#7194c6",
  beak: "#56483f", beakL: "#857467", leg: "#a59c94", legD: "#857c76", claw: "#2f2622",
  eye: "#fffaf0", iris: "#ff9419", irisD: "#d96a08", brow: "#2a1912", tuft: "#3b261b",
  mouth: "#5a1e28", tongue: "#e86e78",
  felt: "#9c8458", feltD: "#7a6440", band: "#5d4b30", badge: "#e8c45a",
  leaf: "#7fa05a", leafD: "#5a7a3c", leafL: "#a8c47a", twig: "#6b4a30",
};
const rnd = (s: number, k: number) => { const x = Math.sin(s * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const L2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const rot2 = (q: P2, a: number, c: P2): P2 => { const cs = Math.cos(a), sn = Math.sin(a), x = q[0] - c[0], y = q[1] - c[1]; return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]; };
const fr = (x: number) => x - Math.floor(x);
const ellP = (cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40, a0 = 0, a1 = Math.PI * 2): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push(rot2([cx + rx * Math.cos(a), cy + ry * Math.sin(a)], rot, [cx, cy])); }
  return out;
};
const bez = (a: P2, c: P2, b: P2, t: number): P2 => { const s = 1 - t; return [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]; };
const bezD = (a: P2, c: P2, b: P2, t: number): P2 => [2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1])];
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col: string) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};

export type Ex = { lid: number; low: number; brow: number; browR: number; up: number; px: number; py: number; pup: number; open: number; smile: number; happy: number; tongue: number };
const E = (o: Partial<Ex>): Ex => ({ lid: 0.12, low: 0, brow: 0, browR: 0, up: 0, px: 0, py: 0, pup: 1, open: 0, smile: 0, happy: 0, tongue: 0, ...o });
export const EX = {
  calm: E({}),
  dull: E({ lid: 0.42, low: 0.05 }),
  glare: E({ lid: 0.5, low: 0.24, brow: -1, browR: -1, up: -4, pup: 0.85 }),
  smug: E({ lid: 0.56, low: 0.12, brow: 0.5, browR: -0.5, smile: 1 }),
  surprise: E({ lid: 0, brow: 0.9, browR: 0.9, up: 18, pup: 0.5, open: 0.75 }),
  alarm: E({ lid: 0, brow: 0.8, browR: 0.8, up: 14, pup: 0.45, open: 0.3 }),
  happy: E({ happy: 1, open: 0.85, smile: 1, brow: 0.6, browR: 0.6, up: 10 }),
  sneaky: E({ lid: 0.38, low: 0.18, brow: -0.5, browR: -0.5 }),
  proud: E({ lid: 0.42, brow: 0.5, browR: 0.5, up: 6, smile: 0.7 }),
  cheeky: E({ lid: 0.3, brow: 0.6, browR: -0.3, smile: 1, open: 0.45, tongue: 1 }),
};
export type Gait = "stand" | "walk" | "run" | "peck" | "look" | "celeb" | "wave";
/** v: S side (faces +x on the canvas) / F front; hd: side f(orward) c(amera) b(ack); front c / l / r */
export type Pose = {
  v: "S" | "F"; g: Gait; ph: number; hd: "f" | "c" | "b" | "l" | "r"; ex: Ex;
  hat?: number; leaves?: number; neck?: number; lean?: number; blur?: number; seed?: number;
};
const exKey = (e: Ex) => Object.values(e).map((v) => Math.round(v * 40) / 40).join(",");
const poseKey = (o: Pose) => `${o.v}${o.g}${o.hd}|${Math.round(fr(o.ph) * 48)}|${exKey(o.ex)}|${o.hat ?? 0}|${o.leaves ?? 0}|${Math.round((o.neck ?? 0) / 4)}|${Math.round((o.lean ?? 0) * 20)}|${o.blur ? 1 : 0}|${(o.seed ?? 0) % 4}`;

/** shaggy ellipse: feather spikes, longer on the lower half (hanging) */
const shag = (c: P2, rx: number, ry: number, rot: number, n: number, frl: number, seed: number): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    let x = rx * ca, y = ry * sa;
    const down = Math.max(0, sa);
    if (i % 2) { const len = frl * (0.3 + 0.9 * down) * (0.65 + 0.7 * rnd(seed, i)); x += ca * len * 0.5 - 0.25 * len * down; y += sa * len * 0.4 + down * len * 0.8; }
    else { x -= ca * 4; y -= sa * 4; }
    pts.push(rot2([c[0] + x, c[1] + y], rot, c));
  }
  return pts;
};
const tubePts = (a: P2, k: P2, b: P2, w0: number, w1: number, t0 = 0, t1 = 1, n = 14): { l: P2[]; r: P2[] } => {
  const l: P2[] = [], r: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n, q = bez(a, k, b, t), d = bezD(a, k, b, t), dl = Math.hypot(d[0], d[1]) || 1, w = lerp(w0, w1, t) / 2;
    l.push([q[0] - (d[1] / dl) * w, q[1] + (d[0] / dl) * w]); r.push([q[0] + (d[1] / dl) * w, q[1] - (d[0] / dl) * w]);
  }
  return { l, r };
};
const featherBody = (p: Pen, pts: P2[], c: P2, rx: number, ry: number, rot: number, seed: number, back: number) => {
  p.clip(pts, () => {
    for (let j = 0; j < 26; j++) {
      const u = rnd(seed, 40 + j) * 2 - 1, v = rnd(seed, 80 + j) * 1.6 - 0.5;
      if (u * u + v * v > 1.1) continue;
      const q = rot2([c[0] + u * rx * 0.9, c[1] + v * ry * 0.8], rot, c);
      const len = 40 + 30 * rnd(seed, 120 + j);
      p.stroke([q, [q[0] - back * len * 0.45, q[1] + len * 0.55], [q[0] - back * len * 0.5, q[1] + len]], j % 3 ? 7 : 5, j % 3 ? C.bodyDD : C.bodyL);
    }
  });
};
/** leg K -> A -> F, the ankle bends backward (dir = facing, +1 right) */
const leg = (p: Pen, K: P2, F: P2, dir: number, far: boolean, toeA = 0, front = false) => {
  const L1 = 168, LL = 178;
  let dx = F[0] - K[0], dy = F[1] - K[1], d = Math.hypot(dx, dy);
  const dc = Math.min(L1 + LL - 2, Math.max(Math.abs(L1 - LL) + 2, d));
  dx *= dc / d; dy *= dc / d; const Fc: P2 = [K[0] + dx, K[1] + dy]; d = dc;
  const a = (L1 * L1 - LL * LL + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), ux = dx / d, uy = dy / d;
  const nx = -uy * dir, ny = ux * dir; // backward (away from facing)
  const A: P2 = front ? [K[0] + ux * a + (F[0] > 500 ? 1 : -1) * h * 0.35, K[1] + uy * a] : [K[0] + ux * a + nx * h, K[1] + uy * a + ny * h];
  const col = far ? C.legD : C.leg;
  p.line([K, A], col, 42); p.line([A, Fc], col, 30);
  p.dot(A[0], A[1], 25, INK); p.dot(A[0], A[1], 17, col);
  for (let i = 1; i <= 3; i++) { const q = L2(A, Fc, 0.25 + i * 0.16); p.stroke([[q[0] - 11, q[1]], [q[0] + 11, q[1] + 3]], 4, far ? "#5e5652" : "#6c6460"); }
  // toes
  if (front) {
    const s = F[0] > 500 ? 1 : -1;
    for (const [ang, len] of [[-0.55 * s, 70], [0, 46], [0.55 * s, 70]] as [number, number][]) {
      const tip: P2 = [Fc[0] + Math.sin(ang) * len * 1.25, Fc[1] + 12 + Math.cos(ang) * len * 0.22];
      p.line([Fc, tip], col, 24); p.dot(tip[0] + Math.sin(ang) * 10, tip[1] + 4, 8, C.claw);
    }
  } else {
    for (const [len, dy2] of [[92, -2], [74, 6], [56, 10]] as [number, number][]) {
      const tip = rot2([Fc[0] + dir * len, Fc[1] + dy2 + 4], toeA * dir, Fc);
      p.line([Fc, tip], col, 22); const tq = rot2([tip[0] + dir * 14, tip[1] + 2], toeA * dir, tip); p.stroke([tip, tq], 9, C.claw);
    }
    p.line([Fc, [Fc[0] - dir * 22, Fc[1] + 4]], col, 20);
  }
};
const legBlur = (p: Pen, c: P2, dir: number) => {
  const g = p.g; g.save(); g.globalAlpha = 0.9;
  for (let i = 0; i < 4; i++) p.arc(c[0], c[1], 125 - i * 22, 110 - i * 16, 10 + i * 40, 320 + i * 40, 22 - i * 3, i % 2 ? C.legD : C.leg);
  g.restore();
  for (let i = 0; i < 3; i++) p.arc(c[0], c[1], 132 - i * 30, 116 - i * 26, -20 + i * 70, 200 + i * 70, 6, INK);
  for (const s of [-1, 1]) { const f: P2 = [c[0] + s * 70 + dir * 20, 952]; p.line([f, [f[0] + dir * 70, 955]], C.leg, 22); }
};

/** emu eye: ball, orange iris, pupil, lids (lid / low 0..1), outline */
const eye = (p: Pen, c: P2, r: number, ex: Ex, look: P2, faceCol: string, lidTilt = 0) => {
  if (ex.happy > 0.5) { p.arc(c[0], c[1] + r * 0.35, r * 0.85, r * 0.75, 200, 340, 11); return; }
  const ball = ellP(c[0], c[1], r, r * 1.04, 0, 36);
  p.poly(ball, C.eye, 0);
  p.clip(ball, () => {
    const ix = c[0] + look[0] * r * 0.38, iy = c[1] + look[1] * r * 0.3, ir = r * 0.7;
    p.poly(ellP(ix, iy, ir, ir), C.iris, 0);
    p.poly(ellP(ix, iy + ir * 0.35, ir * 0.9, ir * 0.55, 0, 24, 0, Math.PI), C.irisD, 0);
    p.dot(ix, iy, ir * 0.48 * ex.pup, INK);
    p.dot(ix - ir * 0.3, iy - ir * 0.32, ir * 0.16, "#fffdf4");
    // lids
    if (ex.lid > 0.02) {
      const y = c[1] - r * 1.1 + 2.1 * r * ex.lid;
      const lp: P2[] = [[c[0] - r * 1.3, c[1] - r * 1.4], [c[0] + r * 1.3, c[1] - r * 1.4], rot2([c[0] + r * 1.3, y], lidTilt, [c[0], y]), rot2([c[0] - r * 1.3, y], lidTilt, [c[0], y])];
      p.poly(lp, faceCol, 0);
      p.stroke([rot2([c[0] - r * 1.2, y], lidTilt, [c[0], y]), rot2([c[0] + r * 1.2, y], lidTilt, [c[0], y])], 9);
    }
    if (ex.low > 0.02) {
      const y = c[1] + r * 1.1 - 2.1 * r * ex.low;
      p.poly([[c[0] - r * 1.3, c[1] + r * 1.4], [c[0] + r * 1.3, c[1] + r * 1.4], [c[0] + r * 1.3, y], [c[0] - r * 1.3, y]], faceCol, 0);
      p.stroke([[c[0] - r * 1.2, y + 3], [c[0] + r * 1.2, y - 3]], 6);
    }
  });
  p.poly(ball, null, 9);
};
/** brow: inner = end toward the beak (x direction dir), b = -1 angry (inner low) .. +1 worried (inner high) */
const brow = (p: Pen, c: P2, r: number, b: number, up: number, inner: number) => {
  const y = c[1] - r * 1.45 - up;
  const a: P2 = [c[0] - inner * r * 0.95, y - 8 * b * -1 + (b < 0 ? -6 : 0)], q: P2 = [c[0] + inner * r * 0.95, y + 14 * -b];
  taper(p, q, a, 19, 9, C.brow);
};

/** side head (faces dir), local frame rotated by ha */
const headSide = (p: Pen, h: P2, ha: number, dir: number, ex: Ex, o: Pose) => {
  const a = ha * dir, Lc = (x: number, y: number): P2 => rot2([h[0] + x * dir, h[1] + y], a, h);
  // tufts
  if (!o.hat) for (const [x0, y0, x1, y1] of [[-34, -40, -70, -92], [-12, -52, -26, -112], [10, -54, 18, -104], [-48, -24, -96, -52]]) {
    const b0 = Lc(x0, y0), b1 = Lc(x1, y1), m = Lc((x0 + x1) / 2 + 10, (y0 + y1) / 2);
    p.line([b0, m, b1], C.tuft, 13, true);
  }
  const hp = ellP(0, 0, 76, 64, 0, 40).map(([x, y]) => Lc(x, y));
  p.shadedFill(hp, C.face, C.faceD, LIGHT, 70, 0.4, 0.95, 1.25);
  p.poly(hp, null, 12);
  for (let i = 0; i < 5; i++) { const q = Lc(-50 + i * 12, -30 + (i % 2) * 14); p.stroke([q, Lc(-56 + i * 12, -18 + (i % 2) * 14)], 4, C.tuft); }
  // beak
  const op = ex.open * 0.42;
  const up = [[42, -24], [96, -18], [138, -6], [156, 6], [146, 14], [92, 12], [44, 18]].map(([x, y]) => Lc(x, y));
  const lowL = [[46, 10], [92, 12], [140, 16], [134, 28], [90, 30], [46, 32]].map(([x, y]) => rot2(Lc(x, y), op * dir, Lc(46, 12)));
  if (op > 0.01) {
    p.poly([Lc(46, 12), ...[[92, 12], [146, 14]].map(([x, y]) => Lc(x, y)), lowL[2], lowL[1], lowL[0]], C.mouth, 10);
    if (ex.tongue > 0) p.poly(ellP(0, 0, 34, 12).map(([x, y]) => rot2(Lc(100 + x, 22 + y), op * dir * 0.5, Lc(46, 12))), C.tongue, 7);
  }
  p.poly(lowL, C.beak, 10);
  p.shadedFill(up, C.beakL, C.beak, LIGHT, 60, 0.5, 0.6, 1.2);
  p.poly(up, null, 11);
  p.stroke([Lc(104, -6), Lc(118, -4)], 7);
  // mouth corner
  const sm = ex.smile;
  p.stroke([Lc(48, 14), Lc(34, 12 - sm * 16), Lc(26, 4 - sm * 20)], 7);
  // eye + brow
  const ec = Lc(10, -16), r = 31;
  eye(p, ec, r, ex, [dir * (0.4 + ex.px * 0.6), ex.py], C.face, dir * (ex.brow < 0 ? 0.18 : ex.brow > 0.4 ? -0.12 : 0));
  brow(p, ec, r, ex.brow, ex.up, dir);
  if (o.hat) hatSide(p, Lc, dir);
  if (o.leaves) leavesOn(p, Lc, dir, o.seed ?? 0);
};
const headFront = (p: Pen, h: P2, tilt: number, ex: Ex, o: Pose) => {
  const Lc = (x: number, y: number): P2 => rot2([h[0] + x, h[1] + y], tilt, h);
  if (!o.hat) for (const [x0, y0, x1, y1] of [[-20, -60, -40, -118], [2, -66, 6, -128], [22, -60, 46, -112], [-40, -50, -82, -86], [40, -50, 78, -90]]) {
    p.line([Lc(x0, y0), Lc((x0 + x1) / 2 + 6, (y0 + y1) / 2), Lc(x1, y1)], C.tuft, 12, true);
  }
  const hp = ellP(0, 0, 86, 76, 0, 44).map(([x, y]) => Lc(x, y));
  p.shadedFill(hp, C.face, C.faceD, LIGHT, 80, 0.4, 0.95, 1.25);
  p.poly(hp, null, 12);
  const look: P2 = [ex.px, ex.py];
  for (const s of [-1, 1]) {
    const ec = Lc(s * 40, -14), r = 31;
    eye(p, ec, r, { ...ex, brow: s < 0 ? ex.brow : ex.browR }, look, C.face, s * (ex.brow < 0 ? -0.2 : 0));
    brow(p, ec, r, s < 0 ? ex.brow : ex.browR, ex.up, -s);
  }
  // beak front: flat wide bill
  const op = ex.open;
  if (op > 0.02) {
    p.poly(ellP(0, 50 + op * 12, 40, 6 + op * 22).map(([x, y]) => Lc(x, y)), C.mouth, 10);
    if (ex.tongue > 0) p.poly(ellP(0, 62 + op * 22, 20, 10 + op * 6).map(([x, y]) => Lc(x, y)), C.tongue, 7);
    p.poly(ellP(0, 58 + op * 30, 38, 10, 0, 24, 0, Math.PI).map(([x, y]) => Lc(x, y)), C.beak, 10);
  }
  const bill = ellP(0, 34, 50, 21).map(([x, y]) => Lc(x, y));
  p.shadedFill(bill, C.beakL, C.beak, LIGHT, 50, 0.5, 0.6, 1.2);
  p.poly(bill, null, 11);
  p.dot(...Lc(-13, 28), 5, INK); p.dot(...Lc(13, 28), 5, INK);
  const sm = ex.smile;
  p.stroke([Lc(-46, 40 - sm * 10), Lc(-20, 48 + sm * 6), Lc(0, 50 + sm * 8), Lc(20, 48 + sm * 6), Lc(46, 40 - sm * 10)], 6);
  if (o.hat) hatFront(p, Lc);
  if (o.leaves) leavesOn(p, Lc, 1, o.seed ?? 0);
};
/** Australian slouch hat on a head frame (Lc): khaki felt, puggaree band, left brim pinned up with the badge */
const hatSide = (p: Pen, Lc: (x: number, y: number) => P2, dir: number) => {
  const T = (x: number, y: number) => { const q = rot2([x, y], -0.22, [0, -50]); return Lc(q[0], q[1]); };
  p.poly(ellP(-4, -46, 128, 15, 0, 36).map(([x, y]) => T(x, y)), C.feltD, 11);
  p.poly([...ellP(-4, -52, 66, 62, 0, 30, Math.PI, Math.PI * 2)].map(([x, y]) => T(x, y)), C.felt, 11);
  p.stroke([T(-30, -106), T(-6, -92), T(20, -108)], 7);
  p.poly([T(-68, -50), T(60, -50), T(61, -68), T(-67, -68)], C.band, 8);
  for (let i = 0; i < 4; i++) p.stroke([T(-56 + i * 30, -66), T(-46 + i * 30, -52)], 4, "#43351f");
  void dir;
};
const hatFront = (p: Pen, Lc: (x: number, y: number) => P2) => {
  const T = (x: number, y: number) => { const q = rot2([x, y], -0.2, [0, -56]); return Lc(q[0], q[1]); };
  p.poly(ellP(4, -56, 138, 24, 0, 40).map(([x, y]) => T(x, y)), C.feltD, 11);
  // pinned-up left brim + rising-sun badge
  p.poly([T(-132, -58), T(-150, -150), T(-128, -186), T(-92, -150), T(-78, -68)], C.felt, 11);
  p.dot(...T(-116, -122), 15, INK); p.dot(...T(-116, -122), 10, C.badge);
  for (let i = 0; i < 7; i++) { const a = Math.PI + (i / 6) * Math.PI; const c = T(-116, -122); p.stroke([c, [c[0] + Math.cos(a) * 22, c[1] + Math.sin(a) * 22]], 3, C.badge); }
  p.poly(ellP(0, -62, 74, 66, 0, 30, Math.PI, Math.PI * 2).map(([x, y]) => T(x, y)), C.felt, 11);
  p.stroke([T(-26, -120), T(0, -104), T(28, -122)], 7);
  p.poly([T(-74, -60), T(74, -60), T(74, -82), T(-74, -82)], C.band, 8);
  for (let i = 0; i < 5; i++) p.stroke([T(-60 + i * 30, -80), T(-50 + i * 30, -62)], 4, "#43351f");
};
const leavesOn = (p: Pen, Lc: (x: number, y: number) => P2, dir: number, seed: number) => {
  p.line([Lc(-30 * dir, -50), Lc(-60 * dir, -120), Lc(-90 * dir, -150)], C.twig, 10);
  p.line([Lc(-60 * dir, -120), Lc(-40 * dir, -170)], C.twig, 7);
  p.line([Lc(30 * dir, -56), Lc(54 * dir, -136)], C.twig, 9);
  for (let i = 0; i < 9; i++) {
    const ang = -2.6 + (i / 8) * 2.2 + (rnd(seed, i) - 0.5) * 0.3, rr = 60 + 30 * rnd(seed, i + 9);
    const b = Lc(Math.cos(ang) * 30 * dir, -40 + Math.sin(ang) * 22), tip = Lc(Math.cos(ang) * (30 + rr) * dir, -40 + Math.sin(ang) * (22 + rr));
    const m = L2(b, tip, 0.5), dx = tip[0] - b[0], dy = tip[1] - b[1], l = Math.hypot(dx, dy) || 1, w = 17;
    const lp: P2[] = [b, [m[0] - dy / l * w, m[1] + dx / l * w], tip, [m[0] + dy / l * w, m[1] - dx / l * w]];
    p.poly(lp, i % 3 === 0 ? C.leafL : i % 3 === 1 ? C.leaf : C.leafD, 8);
    p.stroke([b, L2(b, tip, 0.85)], 3, C.leafD);
  }
};
const wingSide = (p: Pen, base: P2, ang: number, dir: number) => {
  const pts: P2[] = [[0, -20], [-40, -30], [-90, -22], [-122, -6], [-100, 2], [-118, 14], [-80, 18], [-92, 30], [-46, 26], [0, 18]];
  const w = pts.map(([x, y]) => rot2([base[0] + x * dir, base[1] + y], ang * dir, base));
  p.poly(w, C.bodyD, 11);
  p.stroke([rot2([base[0] - 20 * dir, base[1]], ang * dir, base), rot2([base[0] - 80 * dir, base[1] + 4], ang * dir, base)], 5, C.bodyDD);
};
const wingFront = (p: Pen, base: P2, ang: number, s: number) => {
  const pts: P2[] = [[0, -22], [30, -26], [74, -14], [104, 6], [86, 10], [98, 26], [62, 22], [66, 38], [28, 26], [0, 22]];
  const w = pts.map(([x, y]) => rot2([base[0] + x * s, base[1] + y], ang * s, base));
  p.poly(w, C.bodyD, 11);
};

type Sk = { bc: P2; br: number; rx: number; ry: number; hip: P2; fN: P2; fF: P2; tN: number; tF: number; nb: P2; h: P2; ha: number; wing: number; nw: number };
const footCycle = (ph: number, A: number, H: number, base: number, stance: number): { x: number; y: number; ta: number } => {
  const s = fr(ph);
  if (s < stance) { const u = s / stance; return { x: base + A * (1 - 2 * u), y: 953, ta: 0 }; }
  const u = (s - stance) / (1 - stance), e = u * u * (3 - 2 * u);
  return { x: base - A + 2 * A * e, y: 953 - H * Math.sin(Math.PI * u), ta: 0.5 * Math.sin(Math.PI * u) };
};
const sideSkel = (o: Pose): Sk => {
  const ph = o.ph, ne = o.neck ?? 0, le = o.lean ?? 0;
  const k: Sk = { bc: [430, 548], br: -0.06, rx: 205, ry: 142, hip: [445, 655], fN: [478, 953], fF: [404, 953], tN: 0, tF: 0, nb: [585, 455], h: [655, 190 - ne], ha: 0.08, wing: 0.15, nw: 76 };
  if (o.g === "walk") {
    const n = footCycle(ph, 90, 60, 445, 0.55), f = footCycle(ph + 0.5, 90, 60, 435, 0.55);
    k.fN = [n.x, n.y]; k.fF = [f.x, f.y]; k.tN = n.ta; k.tF = f.ta;
    const b = 8 * Math.cos(4 * Math.PI * ph);
    k.bc[1] += b; k.hip[1] += b; k.nb[1] += b; k.h = [655 + 26 * Math.sin(4 * Math.PI * ph), 195 + b * 1.4]; k.wing = 0.12;
  } else if (o.g === "run") {
    const n = footCycle(ph, 175, 120, 440, 0.42), f = footCycle(ph + 0.5, 175, 120, 430, 0.42);
    k.fN = [n.x, n.y]; k.fF = [f.x, f.y]; k.tN = n.ta; k.tF = f.ta;
    const b = -24 * Math.abs(Math.sin(2 * Math.PI * ph));
    k.bc = [405, 572 + b]; k.br = -0.22; k.hip = [440, 672 + b]; k.nb = [560, 500 + b]; k.h = [812, 330 + b * 0.6 + 8 * Math.sin(4 * Math.PI * ph)]; k.ha = 0.18;
    k.wing = -0.35 + 0.25 * Math.sin(4 * Math.PI * ph); k.rx = 214; k.ry = 132;
    if (o.hd === "b") { k.h = [700, 300 + b * 0.6]; }
  } else if (o.g === "peck") {
    const s = fr(ph), d = s < 0.3 ? smooth(s / 0.3) : s < 0.5 ? 1 : 1 - smooth((s - 0.5) / 0.5);
    k.bc = [420, 565]; k.br = -0.16; k.hip = [440, 662]; k.nb = [575, 480];
    k.h = [lerp(690, 742, d), lerp(470, 852, d)]; k.ha = lerp(0.6, 1.25, d); k.nw = 70;
  } else if (o.g === "look") {
    k.bc = [430, 552]; k.br = 0.02; k.nb = [560, 440]; k.h = [572, 118]; k.ha = 0.02; k.nw = 64;
  } else if (o.g === "celeb") {
    const b = 26 * Math.abs(Math.sin(2 * Math.PI * ph));
    k.bc[1] += b; k.hip[1] += b; k.nb[1] += b; k.h = [640, 205 + b * 0.6]; k.ha = -0.35 + 0.15 * Math.sin(2 * Math.PI * ph);
    k.wing = -1.1 + 0.6 * Math.sin(4 * Math.PI * ph); k.fN = [492, 953]; k.fF = [392, 953];
  } else {
    k.h = [655 + le * 95, 190 - ne + le * 40]; k.ha = 0.08 + le * 0.15;
  }
  return k;
};
const drawSide = (p: Pen, o: Pose) => {
  const k = sideSkel(o), dir = 1, seed = o.seed ?? 3;
  // far leg, far wing hint
  if (o.blur) legBlur(p, [430, 850], dir);
  else leg(p, [k.hip[0] - 20, k.hip[1] - 10], k.fF, dir, true, k.tF);
  // neck (behind body), blue skin
  const nk: P2 = [lerp(k.nb[0], k.h[0], 0.5) + (o.g === "peck" ? 70 : o.g === "run" ? 10 : -30), lerp(k.nb[1], k.h[1], 0.5) + (o.g === "run" ? 40 : o.g === "peck" ? -60 : 0)];
  const nbIn: P2 = [k.nb[0] - 50, k.nb[1] + 40];
  const tb = tubePts(nbIn, nk, k.h, k.nw + 20, 46);
  const tubeP = [...tb.l, ...tb.r.slice().reverse()];
  p.shadedFill(tubeP, C.skin, C.skinD, LIGHT, 60, 0.3, 0.8, 1.2);
  p.poly(tubeP, null, 12);
  // body
  const bp = shag(k.bc, k.rx, k.ry, k.br, 66, 34, seed);
  p.shadedFill(bp, C.body, C.bodyD, LIGHT, k.rx, 0.35, 0.85, 1.2);
  featherBody(p, bp, k.bc, k.rx, k.ry, k.br, seed, dir);
  p.poly(bp, null, 13);
  // feathered collar over the neck base
  const cb = tubePts(nbIn, nk, k.h, k.nw + 34, 54, 0.12, 0.48, 8);
  const zig: P2[] = [];
  const zl = cb.l[cb.l.length - 1], zr = cb.r[cb.r.length - 1];
  for (let i = 0; i <= 6; i++) { const q = L2(zl, zr, i / 6), d = bezD(nbIn, nk, k.h, 0.48), dl = Math.hypot(d[0], d[1]); const s2 = i % 2 ? 22 : -4; zig.push([q[0] + (d[0] / dl) * s2, q[1] + (d[1] / dl) * s2]); }
  const shagSide = (pts: P2[], sgn: number) => pts.map((q, i) => (i % 2 ? [q[0] + sgn * 8, q[1] + 6] : q) as P2);
  const colP = [...shagSide(cb.l, -1).slice().reverse(), ...zig, ...shagSide(cb.r, 1)];
  p.poly([...colP, k.bc], C.body, 0);
  p.stroke([...colP], 12);
  p.stroke([L2(zl, zr, 0.3), [L2(zl, zr, 0.3)[0] - 6, L2(zl, zr, 0.3)[1] + 40]], 5, C.bodyDD);
  // near leg + wing
  if (!o.blur) leg(p, k.hip, k.fN, dir, false, k.tN);
  wingSide(p, rot2([k.bc[0] + 70, k.bc[1] - 40], k.br, k.bc), k.wing, dir);
  // head
  if (o.hd === "c") headFront(p, [k.h[0] - 10, k.h[1]], 0, o.ex, o);
  else if (o.hd === "b") headSide(p, k.h, -0.1, -1, o.ex, o);
  else headSide(p, k.h, k.ha, dir, o.ex, o);
};
const drawFront = (p: Pen, o: Pose) => {
  const ph = o.ph, ne = o.neck ?? 0, seed = o.seed ?? 3;
  let bc: P2 = [500, 545], h: P2 = [500, 192 - ne], tilt = 0, lift = [0, 0], wl = 0.25, wr = 0.25, sway = 0;
  if (o.g === "walk") { lift = [Math.max(0, Math.sin(2 * Math.PI * ph)) * 50, Math.max(0, -Math.sin(2 * Math.PI * ph)) * 50]; sway = 10 * Math.sin(2 * Math.PI * ph); bc = [500 + sway, 545 + 6 * Math.cos(4 * Math.PI * ph)]; h = [500 + sway * 1.6, 196 + 8 * Math.cos(4 * Math.PI * ph)]; tilt = sway * 0.006; }
  else if (o.g === "run") { lift = [Math.max(0, Math.sin(2 * Math.PI * ph)) * 110, Math.max(0, -Math.sin(2 * Math.PI * ph)) * 110]; sway = 14 * Math.sin(2 * Math.PI * ph); const b = -20 * Math.abs(Math.sin(2 * Math.PI * ph)); bc = [500 + sway, 560 + b]; h = [500 + sway * 1.4, 285 + b]; tilt = sway * 0.008; wl = wr = 0.6 + 0.3 * Math.sin(4 * Math.PI * ph); }
  else if (o.g === "peck") { const s = fr(ph), d = s < 0.3 ? smooth(s / 0.3) : s < 0.5 ? 1 : 1 - smooth((s - 0.5) / 0.5); bc = [500, 560]; h = [500, lerp(560, 790, d)]; }
  else if (o.g === "celeb") { const b = 26 * Math.abs(Math.sin(2 * Math.PI * ph)); bc = [500, 545 + b]; h = [500 + 18 * Math.sin(2 * Math.PI * ph), 205 + b * 0.6]; tilt = 0.12 * Math.sin(2 * Math.PI * ph); wl = wr = -1.0 + 0.55 * Math.sin(4 * Math.PI * ph); }
  else if (o.g === "wave") { h = [500, 196]; tilt = 0.08 * Math.sin(2 * Math.PI * ph); wr = -1.75 + 0.45 * Math.sin(2 * Math.PI * ph * 2); }
  else if (o.g === "look") { h = [500, 120]; }
  const hipY = bc[1] + 110;
  const feetX = [442, 558];
  // legs (behind body)
  for (let s = 0; s < 2; s++) {
    const fx = feetX[s] + (s ? 1 : -1) * 0, fy = 953 - lift[s];
    leg(p, [bc[0] + (s ? 48 : -48), hipY], [fx, fy], 1, false, 0, true);
  }
  // neck behind body unless pecking
  const nb: P2 = [bc[0], bc[1] - 60];
  const neck = () => {
    const nk: P2 = [lerp(nb[0], h[0], 0.5), lerp(nb[1], h[1], 0.5)];
    const tb = tubePts(nb, nk, [h[0], h[1] + 40], 94, 52);
    const tp = [...tb.l, ...tb.r.slice().reverse()];
    p.shadedFill(tp, C.skin, C.skinD, LIGHT, 60, 0.3, 0.8, 1.2);
    p.poly(tp, null, 12);
  };
  if (o.g !== "peck") neck();
  const bp = shag(bc, 172, 158, 0, 60, 34, seed);
  p.shadedFill(bp, C.body, C.bodyD, LIGHT, 170, 0.35, 0.85, 1.2);
  featherBody(p, bp, bc, 172, 158, 0, seed, 0.3);
  p.poly(bp, null, 13);
  // collar shag at the top of the body
  if (o.g !== "peck") {
    const zig: P2[] = [];
    for (let i = 0; i <= 8; i++) zig.push([bc[0] - 70 + i * 17.5 + (h[0] - bc[0]) * 0.15, bc[1] - 118 - (i % 2 ? 30 : 0) - 26 * Math.sin((i / 8) * Math.PI)]);
    p.poly([[bc[0] - 90, bc[1] - 60], ...zig, [bc[0] + 90, bc[1] - 60]], C.body, 0);
    p.stroke(zig, 12);
  }
  wingFront(p, [bc[0] - 138, bc[1] - 30], wl, -1);
  wingFront(p, [bc[0] + 138, bc[1] - 30], wr, 1);
  if (o.g === "peck") neck();
  if (o.hd === "l" || o.hd === "r") headSide(p, h, 0.05, o.hd === "r" ? 1 : -1, o.ex, o);
  else headFront(p, h, tilt, o.ex, o);
};
export const drawEmu = (p: Pen, o: Pose) => (o.v === "S" ? drawSide(p, o) : drawFront(p, o));

/** the camo bush (shot 13): a round scrub bush of gum leaves, flat bottom at y = 975 */
const drawBush = (p: Pen) => {
  const cl: [number, number, number][] = [[330, 760, 170], [520, 700, 200], [700, 770, 165], [440, 610, 150], [610, 590, 140], [250, 870, 120], [780, 880, 120], [500, 860, 190]];
  const out: P2[] = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    let best = 0;
    for (const [cx, cy, r] of cl) { const dx = Math.cos(a), dy = Math.sin(a); const ox = cx - 510, oy = cy - 780; const b = ox * dx + oy * dy, cc = ox * ox + oy * oy - r * r, disc = b * b - cc; if (disc > 0) best = Math.max(best, b + Math.sqrt(disc)); }
    best += i % 2 ? 14 : -6;
    out.push([510 + Math.cos(a) * best, Math.min(975, 780 + Math.sin(a) * best)]);
  }
  p.shadedFill(out, "#6f9150", "#40602e", LIGHT, 330, 0.4, 0.7, 1.2);
  p.clip(out, () => {
    for (let i = 0; i < 70; i++) {
      const x = 180 + rnd(5, i) * 660, y = 480 + rnd(6, i) * 480, a = rnd(7, i) * Math.PI * 2, l = 40 + 30 * rnd(8, i);
      const tip: P2 = [x + Math.cos(a) * l, y + Math.sin(a) * l], m = L2([x, y], tip, 0.5), w = 12;
      const dx = tip[0] - x, dy = tip[1] - y, ll = Math.hypot(dx, dy);
      p.poly([[x, y], [m[0] - dy / ll * w, m[1] + dx / ll * w], tip, [m[0] + dy / ll * w, m[1] - dx / ll * w]], i % 3 === 0 ? "#a8c47a" : i % 3 === 1 ? "#5a7a3c" : "#88a862", 0);
    }
  });
  p.poly(out, null, 13);
  for (const [x, y, x2, y2] of [[300, 640, 250, 560], [700, 620, 760, 540], [520, 520, 540, 440]]) p.line([[x, y], [x2, y2]], C.twig, 9);
};

// ======================================================================================================== atlas
const CELLS = 6, ATL = 2048, CELL = ATL / CELLS;
const sideCell = (o: Pose): number => {
  const alarm = o.ex.open > 0.2 && o.ex.pup < 0.6;
  switch (o.g) {
    case "run": return alarm ? 30 + (Math.floor(fr(o.ph) * 6) % 6) : Math.floor(fr(o.ph) * 8) % 8;
    case "walk": return 8 + (Math.floor(fr(o.ph) * 6) % 6);
    case "peck": return 14 + (Math.floor(fr(o.ph) * 4) % 4);
    case "look": return 21 + (o.hd === "c" ? 1 : o.hd === "b" ? 2 : 0);
    case "celeb": case "wave": return 24 + (Math.floor(fr(o.ph) * 4) % 4);
    default: return alarm ? 28 : o.ex.lid > 0.8 ? 29 : 18 + (o.hd === "c" ? 1 : o.hd === "b" ? 2 : 0);
  }
};
const frontCell = (o: Pose): number => {
  const alarm = o.ex.open > 0.2 && o.ex.pup < 0.6;
  switch (o.g) {
    case "run": return alarm ? 29 + (Math.floor(fr(o.ph) * 6) % 6) : Math.floor(fr(o.ph) * 6) % 6;
    case "walk": return 6 + (Math.floor(fr(o.ph) * 6) % 6);
    case "peck": return 12 + (Math.floor(fr(o.ph) * 4) % 4);
    case "celeb": return 20 + (Math.floor(fr(o.ph) * 4) % 4);
    case "wave": return 24 + (Math.floor(fr(o.ph) * 4) % 4);
    case "look": return o.hd === "l" ? 18 : o.hd === "r" ? 19 : 35;
    default: return alarm ? 28 : o.ex.lid > 0.8 ? 17 : o.hd === "l" ? 18 : o.hd === "r" ? 19 : 16;
  }
};
/** the pose an atlas cell shows (so the crowd and hero drawings of a bird match) */
const cellPose = (v: "S" | "F", c: number): Pose => {
  const P = (g: Gait, ph: number, hd: Pose["hd"] = "f", ex: Ex = EX.calm): Pose => ({ v, g, ph, hd, ex, seed: c });
  const blink = E({ lid: 1 }), al = EX.alarm, hap = EX.happy;
  if (v === "S") {
    if (c < 8) return P("run", c / 8);
    if (c < 14) return P("walk", (c - 8) / 6);
    if (c < 18) return P("peck", (c - 14) / 4 + 0.01);
    if (c < 21) return P("stand", 0, (["f", "c", "b"] as const)[c - 18]);
    if (c < 24) return P("look", 0, (["f", "c", "b"] as const)[c - 21]);
    if (c < 28) return P("celeb", (c - 24) / 4, "f", hap);
    if (c === 28) return P("stand", 0, "c", al);
    if (c === 29) return P("stand", 0, "f", blink);
    return P("run", (c - 30) / 6, "f", al);
  }
  if (c < 6) return P("run", c / 6, "c");
  if (c < 12) return P("walk", (c - 6) / 6, "c");
  if (c < 16) return P("peck", (c - 12) / 4 + 0.01, "c");
  if (c === 16) return P("stand", 0, "c");
  if (c === 17) return P("stand", 0, "c", blink);
  if (c === 18) return P("stand", 0, "l");
  if (c === 19) return P("stand", 0, "r");
  if (c < 24) return P("celeb", (c - 20) / 4, "c", hap);
  if (c < 28) return P("wave", (c - 24) / 4, "c", EX.proud);
  if (c === 28) return P("stand", 0, "c", al);
  if (c < 35) return P("run", (c - 29) / 6, "c", al);
  return P("look", 0, "c");
};
const makeAtlas = (v: "S" | "F") => {
  const cv = document.createElement("canvas"); cv.width = ATL; cv.height = ATL;
  const g = cv.getContext("2d")!;
  for (let c = 0; c < CELLS * CELLS; c++) {
    const cx = (c % CELLS) * CELL, cy = Math.floor(c / CELLS) * CELL, k = CELL / 1000;
    g.save(); g.beginPath(); g.rect(cx, cy, CELL, CELL); g.clip();
    g.setTransform(k, 0, 0, k, cx, cy);
    drawEmu(new Pen(g), cellPose(v, c));
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};
/** cardShade lighting with the map sampled from an atlas cell (per-instance aCell) */
const crowdMat = (tex: THREE.Texture) => {
  const m = cardShade(new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }));
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev(sh, r);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aCell; varying vec2 vCell;")
      .replace("#include <uv_vertex>", `#include <uv_vertex>\nvCell = vec2(mod(aCell, ${CELLS}.0), ${CELLS - 1}.0 - floor(aCell / ${CELLS}.0 + 0.01));`);
    sh.fragmentShader = sh.fragmentShader
      .replace(/texture2D\( map, /g, "atex( ")
      .replace("#include <common>", `#include <common>\nvarying vec2 vCell;\nvec2 atl(vec2 u){ u = clamp(u, 0.004, 0.996); return (vCell + u) / ${CELLS}.0; }`)
      .replace("#include <map_pars_fragment>", "#include <map_pars_fragment>\nvec4 atex(vec2 u){ return texture2D( map, atl(u) ); }")
      .replace("#include <map_fragment>", "#ifdef USE_MAP\n  diffuseColor *= atex( vMapUv );\n#endif");
  };
  m.customProgramCacheKey = () => "emuCrowd1";
  return m;
};
const dustTex = () => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  for (const [x, y, r] of [[64, 72, 40], [40, 78, 26], [88, 80, 28], [58, 50, 28], [80, 56, 22]]) {
    const gr = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r);
    gr.addColorStop(0, "rgba(255,240,220,0.95)"); gr.addColorStop(0.6, "rgba(235,200,160,0.75)"); gr.addColorStop(1, "rgba(220,170,130,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};
const blobTex = () => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  for (const [r, c] of [[0, "#8e8aa6"], [0.35, "#9894b0"], [0.6, "#c4c1d2"], [0.85, "#f2f1f5"], [1, "#ffffff"]] as const) gr.addColorStop(r, c);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; return t;
};

// ======================================================================================================== staging
/** one bird this frame. fx/fz = facing (world) used for view + mirror unless pose.v forced (vf). */
type Bird = { i: number; x: number; z: number; fx: number; fz: number; s: number; pose: Omit<Pose, "v">; vf?: "S" | "F"; key?: string; draw?: (p: Pen) => void; lift?: number };
type Puff = { x: number; z: number; age: number; s: number };
const N_CROWD = 8000, N_HERO = 64, D_HERO = 22, N_DUST = 1600;
const hsh = (i: number, k = 0) => rnd(i * 1.37 + 0.5, k + 11);

// layouts (built once)
type WaveB = { tx: number; tz: number; u: number; Ta: number; post: number; s: number; sd: number };
const D4: [number, number] = (() => { const l = Math.hypot(0.22, 1); return [0.22 / l, 1 / l]; })();
const N4: [number, number] = [D4[1], -D4[0]];
const buildWave = (): WaveB[] => {
  const out: WaveB[] = [], O: [number, number] = [-10, -110], hx = HOMESTEAD[0], hz = HOMESTEAD[2];
  const uH = (hx - O[0]) * D4[0] + (hz - O[1]) * D4[1], wH = (hx - O[0]) * N4[0] + (hz - O[1]) * N4[1];
  const umin = -150, umax = 110;
  for (let li = 0; li < 140; li++) {
    const w = -140 + li * 2.0, lj = hsh(li, 1);
    for (let ui = 0; ui < 120; ui++) {
      const i = li * 1000 + ui;
      const u = umin + ui * 2.3 + (hsh(i, 2) - 0.5) * 0.6 + (li % 2) * 1.15, ww = w + (hsh(i, 3) - 0.5) * 0.45;
      const tx = O[0] + u * D4[0] + ww * N4[0], tz = O[1] + u * D4[1] + ww * N4[1];
      if (tx < -78 || tx > 58 || tz < -235 || tz > -14) continue;
      if (Math.hypot(tx - hx, tz - hz) < 17) continue;
      if (Math.abs(ww - wH) < 15 && u > uH - 15) continue; // would run through the homestead yard
      const Ta = 11.95 + 1.35 * clamp01((umax - u) / (umax - umin)) + 0.18 * lj;
      out.push({ tx, tz, u, Ta, post: hsh(i, 4), s: 0.92 + 0.16 * hsh(i, 5), sd: hsh(i, 6) });
    }
  }
  return out;
};
type DamB = { x: number; z: number; r: number; ang: number; kind: number; s: number; sd: number; hx: number; hz: number };
const buildDam = (): DamB[] => {
  const out: DamB[] = [], hx = HIDE[0] - DAM[0], hz = HIDE[2] - DAM[2], hr = Math.hypot(hx, hz);
  for (let k = 0; k < 16; k++) {
    const r0 = 16 + k * 1.95, n = Math.floor((2 * Math.PI * r0) / 2.05), a0 = hsh(k, 7) * 6.28;
    for (let j = 0; j < n; j++) {
      const i = k * 1000 + j;
      if (hsh(i, 8) > 0.72) continue;
      const a = a0 + ((j + (hsh(i, 9) - 0.5) * 0.3) / n) * Math.PI * 2, r = r0 + (hsh(i, 10) - 0.5) * 0.45;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - hx, z - hz) < 12) continue;
      if (r < hr) { const ux = x / r, uz = z / r, along = hx * ux + hz * uz; if (along > r && Math.abs(hx * uz - hz * ux) < 5) continue; }
      const hd = hsh(i, 11) * 6.28;
      out.push({ x: DAM[0] + x, z: DAM[2] + z, r, ang: a, kind: r < 21 ? 0 : hsh(i, 12) < 0.55 ? 1 : 2, s: 0.92 + 0.16 * hsh(i, 5), sd: hsh(i, 6), hx: Math.cos(hd), hz: Math.sin(hd) });
    }
  }
  return out;
};
type GrpB = { x: number; z: number; g: number; look: boolean; s: number; sd: number; hx: number; hz: number };
const buildGroups = (): GrpB[] => {
  const cs: [number, number][] = [];
  for (let i = 0; cs.length < 16 && i < 400; i++) {
    const r = 16 + 62 * hsh(i, 20), a = hsh(i, 21) * 6.28, x = Math.cos(a) * r, z = Math.sin(a) * r - 10;
    if (Math.hypot(x - HOMESTEAD[0], z - HOMESTEAD[2]) < 24 || Math.hypot(x - SCORE[0], z - SCORE[2]) < 9) continue;
    if (cs.some(([cx, cz]) => Math.hypot(cx - x, cz - z) < 17)) continue;
    cs.push([x, z]);
  }
  const hex: [number, number][] = [];
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) hex.push([(a + b * 0.5) * 1.95, b * 1.69]);
  hex.sort((p, q) => Math.hypot(...p) - Math.hypot(...q));
  const out: GrpB[] = [];
  cs.forEach(([cx, cz], g) => {
    const n = 6 + Math.floor(hsh(g, 22) * 5);
    for (let k = 0; k <= n; k++) {
      const i = g * 100 + k, [ox, oz] = hex[k], hd = hsh(i, 11) * 6.28;
      out.push({ x: FARM[0] + cx + ox + (hsh(i, 23) - 0.5) * 0.3, z: FARM[2] + cz + oz + (hsh(i, 24) - 0.5) * 0.3, g, look: k === n, s: 0.92 + 0.16 * hsh(i, 5), sd: hsh(i, 6), hx: Math.cos(hd), hz: Math.sin(hd) });
    }
  });
  return out;
};
type PackB = { dx: number; dz: number; row: number; s: number; sd: number };
const buildPack = (): PackB[] => {
  const out: PackB[] = [];
  for (let row = 0; row < 11; row++) for (let col = 0; col < 3; col++) {
    const i = row * 10 + col;
    if (hsh(i, 30) < 0.12 && row > 0) continue;
    out.push({ dx: row * 2.7 + (col % 2) * 1.35 + (hsh(i, 31) - 0.5) * 0.4, dz: (col - 1) * 1.35 + (hsh(i, 32) - 0.5) * 0.12, row, s: 0.94 + 0.12 * hsh(i, 5), sd: hsh(i, 6) });
  }
  return out;
};
type FinB = { x: number; z: number; s: number; sd: number; front: boolean };
const buildFinale = (): FinB[] => {
  const out: FinB[] = [];
  const front: [number, number][] = [[-3.9, 1.4], [-2.4, 2.3], [2.5, 2.3], [4.0, 1.3], [-5.6, -0.4], [5.7, -0.5], [-7.2, 0.9], [7.3, 0.8]];
  front.forEach(([x, z], k) => out.push({ x: SCORE[0] + x, z: SCORE[2] + z, s: 0.96 + 0.08 * hsh(k, 5), sd: hsh(k, 6), front: true }));
  for (let r = 0; r < 9; r++) for (let c = -12; c <= 12; c++) {
    const i = 500 + r * 40 + c, x = c * 2.05 + (r % 2) * 1.0 + (hsh(i, 1) - 0.5) * 0.4, z = -3.2 - r * 2.2 + (hsh(i, 2) - 0.5) * 0.4;
    if (Math.abs(x) < 9 && r < 1) continue;
    out.push({ x: SCORE[0] + x, z: SCORE[2] + z, s: 0.92 + 0.16 * hsh(i, 5), sd: hsh(i, 6), front: false });
  }
  return out;
};

// truck chase helpers (shots 10, 11): pack x along ROAD and the leg phase (cadence capped at 4.6 Hz)
const packX = (id: number, t: number) => { const c = chaseAt(id, t); return c.truckX + c.lead; };
const packV = (id: number, t: number) => (id === 10 ? 8 : 9 + 7.6 * Math.max(0, t - 31.2));
const packPh = (id: number, t: number) => {
  if (id === 10) return 1.9 * (t - 28.3);
  const tt = Math.max(0, t - 31.2), ts = (4.6 * 4.2 - 9) / 7.6;
  return 1.9 * (31.2 - 28.3) + (tt <= ts ? (9 * tt + 3.8 * tt * tt) / 4.2 : (9 * ts + 3.8 * ts * ts) / 4.2 + 4.6 * (tt - ts));
};
/** dam scatter distance from the start of the scatter (accelerate to 18 m/s) */
const scatterD = (ts: number) => (ts <= 0 ? 0 : ts < 0.6 ? 15 * ts * ts : 5.4 + 18 * (ts - 0.6));
/** wave approach distance before arrival s seconds ahead (v 24 m/s, braking over the last .6 s) */
const waveD = (s: number) => (s <= 0 ? 0 : s < 0.6 ? (24 * s * s) / 1.2 : 24 * (s - 0.3));

const DEBUG = false;
/** shot 13: draw our own leafy bush card in front of the camo emu (set false if outback's HIDE bush covers it) */
const OWN_BUSH = true;

export class Flock {
  root = new THREE.Group();
  private pool = new Pool();
  private heroes: Actor[] = [];
  private crowd: THREE.InstancedMesh[] = [];
  private cellAttr: THREE.InstancedBufferAttribute[] = [];
  private blobs: THREE.InstancedMesh;
  private dust: THREE.InstancedMesh; private dustA: THREE.InstancedBufferAttribute;
  private dustMat: THREE.ShaderMaterial;
  private geo: THREE.PlaneGeometry;
  private wave = buildWave(); private dam = buildDam(); private groups = buildGroups(); private pack = buildPack(); private fin = buildFinale();
  private birds: Bird[] = []; private puffs: Puff[] = [];
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(0, 0, 0, "YXZ"); private v3 = new THREE.Vector3(); private s3 = new THREE.Vector3();
  private right = new THREE.Vector3(); private fwd = new THREE.Vector3();

  constructor() {
    const R = this.root;
    this.geo = new THREE.PlaneGeometry(1000 * SE, 1000 * SE); this.geo.translate(0, (975 - 500) * SE, 0);
    (["S", "F"] as const).forEach((v) => {
      const tex = makeAtlas(v), mat = crowdMat(tex);
      const im = new THREE.InstancedMesh(this.geo, mat, N_CROWD);
      const at = new THREE.InstancedBufferAttribute(new Float32Array(N_CROWD), 1); at.setUsage(THREE.DynamicDrawUsage);
      im.geometry = this.geo.clone(); im.geometry.setAttribute("aCell", at);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.count = 0;
      im.receiveShadow = true; im.castShadow = false; im.layers.set(NOINK); im.renderOrder = 1;
      im.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
      R.add(im); this.crowd.push(im); this.cellAttr.push(at);
    });
    const bg = new THREE.PlaneGeometry(1, 1); bg.rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(bg, blobMaterial(blobTex()), N_CROWD + N_HERO);
    this.blobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.blobs.frustumCulled = false; this.blobs.count = 0; this.blobs.layers.set(NOINK); this.blobs.renderOrder = 0.5;
    R.add(this.blobs);
    this.dustMat = new THREE.ShaderMaterial({
      uniforms: { map: { value: dustTex() }, col: { value: untone("#e2b98e") } },
      vertexShader: "attribute float aA; varying float vA; varying vec2 vUv; void main(){ vUv = uv; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform sampler2D map; uniform vec3 col; varying float vA; varying vec2 vUv; void main(){ vec4 t = texture2D(map, vUv); float a = t.a * vA; if (a < 0.01) discard; gl_FragColor = vec4(col * (0.75 + 0.35 * t.r), a); }",
      transparent: true, depthWrite: false,
    });
    const dg = new THREE.PlaneGeometry(1, 1);
    this.dustA = new THREE.InstancedBufferAttribute(new Float32Array(N_DUST), 1); this.dustA.setUsage(THREE.DynamicDrawUsage);
    dg.setAttribute("aA", this.dustA);
    this.dust = new THREE.InstancedMesh(dg, this.dustMat, N_DUST);
    this.dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.dust.frustumCulled = false; this.dust.count = 0; this.dust.layers.set(NOINK); this.dust.renderOrder = 2;
    R.add(this.dust);
    if (DEBUG) { const gm = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#c98a5a" })); gm.receiveShadow = true; R.add(gm); }
  }

  private hero(i: number) { while (this.heroes.length <= i) this.heroes.push(new Actor(this.root, this.geo)); return this.heroes[i]; }

  private add(b: Bird) { this.birds.push(b); }
  private puff(x: number, z: number, age: number, s = 1) { if (age >= 0 && age < 1) this.puffs.push({ x, z, age, s }); }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    if (DEBUG) this.debugCam(id, f, cam);
    this.birds = []; this.puffs = [];
    this.stage(id, t, cam);
    this.render(id, t, cam);
    void f;
  }

  private debugCam(id: number, _f: number, cam: THREE.PerspectiveCamera) {
    const set = (p: V3, l: V3, fov = 40) => { cam.position.set(...p); cam.lookAt(...l); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); };
    const t = _f / 30;
    if (id === 10 || id === 11) { const x = ROAD[0] + packX(id, t); set([x - 6, 2.2, ROAD[2] + 16], [x + 6, 1.1, ROAD[2]], 42); }
    if (id === 13) set([HIDE[0] + 2.5, 1.3, HIDE[2] + 3.4], [HIDE[0] + 0.3, 1.35, HIDE[2] - 0.2], 34);
    if (id === 9) set([DAM[0] - 30, 2.0, DAM[2] + 34], [DAM[0], 1, DAM[2]], 50);
  }

  // ------------------------------------------------------------------ per shot
  private stage(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const B = (o: Bird) => this.add(o);
    const blinkEx = (ex: Ex, i: number) => { const l = lidAt(t, i); return l > 0 ? { ...ex, lid: Math.max(ex.lid, l), low: l > 0.9 ? 0 : ex.low } : ex; };
    const toCam = (x: number, z: number): [number, number] => { const dx = cam.position.x - x, dz = cam.position.z - z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l]; };
    switch (id) {
      case 1: {
        // the standoff: one emu glares at the soldier (soldier at FARM + (-1.0, 0, 0) facing +x)
        const k1 = smooth((t - (W.declared - LEAD - 0.1)) / 0.35), jab = Math.max(0, Math.sin(Math.PI * clamp01((t - (W.birds - LEAD)) / 0.45)));
        const slow = t > 3.15 && t < 3.6;
        let ex: Ex = { ...EX.glare, lid: lerp(0.42, 0.56, k1), px: -0.1 + 0.3 * k1, brow: -1, browR: -1 };
        if (jab > 0.05) ex = { ...ex, open: 0.55 * jab, lid: 0.36, up: -6 };
        if (slow) { const u = (t - 3.15) / 0.45; ex = { ...ex, lid: Math.max(ex.lid, Math.sin(Math.PI * u) * 1.1) }; }
        else ex = blinkEx(ex, 1);
        B({ i: 1, x: FARM[0] + 1.0, z: FARM[2] - 0.2, fx: -1, fz: 0, s: 1, vf: "S", pose: { g: "stand", ph: 0, hd: "f", ex, lean: 0.25 + 0.35 * k1 + 0.45 * jab } });
        break;
      }
      case 2: {
        // "And lost.": the same emu now wears the soldier's slouch hat, smug, to camera
        const k = smooth((t - (W.lost - LEAD - 0.05)) / 0.3);
        let ex: Ex = { ...EX.smug, lid: lerp(0.4, 0.6, k), smile: lerp(0.5, 1, k), up: lerp(0, 8, k), browR: -0.5 };
        if (t > W.lost - LEAD - 0.12 && t < W.lost - LEAD + 0.1) ex = { ...ex, lid: 1 }; // the smug slow blink on "lost"
        B({ i: 1, x: FARM[0] + 0.45, z: FARM[2] - 0.1, fx: 0, fz: 1, s: 1, vf: "F", pose: { g: "stand", ph: 0, hd: "c", ex, hat: 1, neck: lerp(0, 22, k) } });
        break;
      }
      case 4: {
        for (let n = 0; n < this.wave.length; n++) {
          const b = this.wave[n], sr = b.Ta - t, D = waveD(sr);
          const x = b.tx - D4[0] * D, z = b.tz - D4[1] * D;
          if (z < -900) continue;
          const sp = sr <= 0 ? 0 : sr < 0.6 ? 40 * sr : 24, i = 10000 + n;
          if (sp > 5) { B({ i, x, z, fx: D4[0], fz: D4[1], s: b.s, pose: { g: "run", ph: b.sd - D / 5.5, hd: "c", ex: EX.calm } }); if (sp > 10 && n % 3 === 0) for (let k = 0; k < 3; k++) { const te = t - k * 0.25 - fr(b.sd * 7 + t * 4) * 0.25, Dk = waveD(b.Ta - te); if (waveD(b.Ta - te) > 3) this.puff(b.tx - D4[0] * Dk, b.tz - D4[1] * Dk, t - te, 1.3); } continue; }
          if (sp > 0.3) { B({ i, x, z, fx: D4[0], fz: D4[1], s: b.s, pose: { g: "walk", ph: b.sd - D / 1.8, hd: "c", ex: EX.calm } }); continue; }
          const a = -sr, side = b.post < 0.35 ? 1 : b.post < 0.7 ? -1 : 0;
          const fx = side ? N4[0] * side : D4[0], fz = side ? N4[1] * side : D4[1];
          if (b.post > 0.95) B({ i, x, z, fx, fz, s: b.s, pose: { g: "stand", ph: 0, hd: (["f", "c", "b"] as const)[Math.floor(fr(b.sd + a * 0.7) * 3)], ex: EX.calm } });
          else B({ i, x, z, fx, fz, s: b.s, pose: { g: "peck", ph: b.sd + a * 1.3, hd: "c", ex: EX.calm } });
        }
        break;
      }
      case 8: case 9: {
        const ts = t - (W.twelve - 0.1), firing = id === 9 && t < W.jams - LEAD, stare = id === 9 && t >= W.jams - LEAD && ts < 0;
        for (let n = 0; n < this.dam.length; n++) {
          const b = this.dam[n], i = 20000 + n;
          if (id === 9 && ts >= 0) {
            const D = scatterD(ts), ux = (b.x - DAM[0]) / b.r, uz = (b.z - DAM[2]) / b.r;
            B({ i, x: b.x + ux * D, z: b.z + uz * D, fx: ux, fz: uz, s: b.s, pose: { g: "run", ph: b.sd + D / 5, hd: "f", ex: EX.alarm } });
            for (let k = 0; k < 5; k++) { const te = t - k * 0.12 - fr(b.sd * 5) * 0.12, D2 = scatterD(te - (W.twelve - 0.1)); if (D2 > 0.3) this.puff(b.x + ux * D2, b.z + uz * D2, t - te, 1); }
            continue;
          }
          const near = Math.hypot(b.x - HIDE[0], b.z - HIDE[2]) < 30;
          if (stare || (firing && near && t > 26.4 + b.sd * 0.25)) {
            B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s, pose: { g: "stand", ph: 0, hd: "c", ex: stare ? blinkEx(EX.dull, i) : EX.alarm, neck: stare ? 0 : 30 } });
            continue;
          }
          if (b.kind === 0) { const wx = (DAM[0] - b.x) / b.r, wz = (DAM[2] - b.z) / b.r; B({ i, x: b.x, z: b.z, fx: wx, fz: wz, s: b.s, pose: { g: "peck", ph: b.sd + t * 0.55, hd: "c", ex: EX.calm } }); }
          else if (b.kind === 1) B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s, pose: { g: "peck", ph: b.sd + t * 0.9, hd: "c", ex: EX.calm } });
          else B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s, pose: { g: "stand", ph: 0, hd: (["f", "c", "b", "f"] as const)[Math.floor(fr(b.sd + t * 0.45) * 4)], ex: blinkEx(EX.calm, i) } });
        }
        break;
      }
      case 10: case 11: {
        const px = ROAD[0] + packX(id, t), ph = packPh(id, t), v = packV(id, t), blur = v > 22 ? 1 : 0;
        const late = id === 11 && t > W.cant - LEAD, early = id === 10 || t < W.run - LEAD;
        for (let n = 0; n < this.pack.length; n++) {
          const b = this.pack[n], i = 30000 + n, x = px + b.dx, z = ROAD[2] + b.dz;
          const back = (early && b.row >= 5 && b.sd > 0.3) || (late && b.row <= 3 && b.sd > 0.35);
          const ex = back ? (b.sd > 0.75 ? EX.cheeky : EX.smug) : id === 11 && !early ? EX.proud : EX.calm;
          B({ i, x, z, fx: 1, fz: 0, s: b.s, vf: "S", pose: { g: "run", ph: ph + b.sd, hd: back ? "b" : "f", ex: blinkEx(ex, i), blur: back ? 0 : blur } });
          // dust: puffs dropped every .08 s at the feet, analytic pack position at emission time
          for (let k = 0; k < 9; k++) { const te = Math.floor(t / 0.08 - k) * 0.08 + fr(b.sd * 3) * 0.08; if (te > t) continue; const xe = ROAD[0] + packX(id, te) + b.dx; this.puff(xe - 0.4, z + (hsh(n, k) - 0.5) * 0.4, (t - te) * (v > 15 ? 1.1 : 1.4), v > 15 ? 1.5 : 1.1); }
        }
        break;
      }
      case 12: {
        const up = t > W.lookout - LEAD - 0.05;
        for (let n = 0; n < this.groups.length; n++) {
          const b = this.groups[n], i = 40000 + n;
          if (b.look && up) {
            const k = fr(t / 1.6 + b.g * 0.37), hd = (["f", "c", "b", "c"] as const)[Math.floor(k * 4)];
            B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s * 1.04, vf: "S", pose: { g: "look", ph: 0, hd, ex: blinkEx(EX.sneaky, i) } });
          } else if (b.sd < 0.75 || b.look) B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s, pose: { g: "peck", ph: b.sd + t * 1.1, hd: "c", ex: EX.calm } });
          else B({ i, x: b.x, z: b.z, fx: b.hx, fz: b.hz, s: b.s, pose: { g: "stand", ph: 0, hd: (["f", "c", "b"] as const)[Math.floor(fr(b.sd + t * 0.5) * 3)], ex: EX.calm } });
        }
        break;
      }
      case 13: {
        // guerrilla: a camouflaged emu (leaves + twigs on its head) peeks over a bush at FARM origin
        const rise = smooth((t - (W.guerrilla - LEAD - 0.15)) / 0.3) - smooth((t - (W.warfare - LEAD + 0.25)) / 0.25);
        const shift = t < 40.55 ? -1 : t < 40.85 ? 1 : t < W.warfare - LEAD + 0.2 ? 0 : (t < 41.9 ? -1 : 1);
        const ex: Ex = blinkEx({ ...EX.sneaky, px: shift, lid: rise > 0.5 ? 0.15 : 0.38, brow: rise > 0.5 ? 0.6 : -0.5, browR: rise > 0.5 ? 0.6 : -0.5, up: rise * 10, pup: rise > 0.5 ? 0.6 : 1 }, 13);
        const ex0 = FARM[0] + 0.3, ez0 = FARM[2] - 0.2, [cx, cz] = toCam(ex0, ez0);
        B({ i: 13, x: ex0, z: ez0, fx: cx, fz: cz, s: 1, vf: "F", pose: { g: "stand", ph: 0, hd: "c", ex, leaves: 1, neck: -150 + 120 * rise, seed: 2 } });
        if (OWN_BUSH) B({ i: 14, x: ex0 + cx * 0.45, z: ez0 + cz * 0.45, fx: cx, fz: cz, s: 1.05, pose: { g: "stand", ph: 0, hd: "c", ex: EX.calm }, key: "bush", draw: drawBush });
        break;
      }
      case 14: {
        // the army goes home: a row of emus at the road edge waving goodbye (the hat emu in the middle)
        const xs = [-6.4, -4.0, -1.6, 0.9, 3.4, 5.9, 8.3], big = t > W.home - LEAD ? 1 : 0;
        xs.forEach((x0, k) => {
          const i = 50 + k, x = ROAD[0] + x0, z = ROAD[2] - 5.6 + (k % 2) * 0.5;
          const ex = k === 3 ? EX.smug : k === 5 ? EX.cheeky : k % 2 ? EX.happy : EX.proud;
          B({ i, x, z, fx: 0, fz: 1, s: 0.96 + 0.08 * hsh(k, 5), vf: "F", pose: { g: "wave", ph: t * (1.6 + 0.6 * big) + hsh(k, 6), hd: "c", ex: blinkEx(ex, i), hat: k === 3 ? 1 : 0 } });
        });
        for (let k = 0; k < 9; k++) { const i = 70 + k; B({ i, x: ROAD[0] - 7 + k * 2.1, z: ROAD[2] - 8.6 - (k % 2) * 0.9, fx: 0, fz: 1, s: 0.95, vf: "F", pose: { g: k % 3 ? "wave" : "stand", ph: t * 1.8 + hsh(k, 7), hd: "c", ex: EX.happy } }); }
        break;
      }
      case 17: {
        const one = t > W.one - LEAD, zero = t > W.zero - LEAD, proud = t > W.emus1 - LEAD;
        for (let n = 0; n < this.fin.length; n++) {
          const b = this.fin[n], i = 60000 + n;
          if (one) {
            const rate = zero ? 2.6 : 1.8;
            B({ i, x: b.x, z: b.z, fx: 0, fz: 1, s: b.s, vf: b.front ? "F" : undefined, pose: { g: "celeb", ph: b.sd + t * rate, hd: "c", ex: b.front && n % 3 === 1 ? EX.cheeky : EX.happy, hat: b.front && n === 2 ? 1 : 0 } });
          } else {
            const ex = proud ? EX.proud : EX.calm;
            B({ i, x: b.x, z: b.z, fx: 0, fz: 1, s: b.s, vf: b.front ? "F" : undefined, pose: { g: "stand", ph: 0, hd: b.front ? "c" : (["c", "l", "r"] as const)[n % 3], ex: blinkEx(ex, i), hat: b.front && n === 2 ? 1 : 0, neck: proud ? 18 : 0 } });
          }
        }
        break;
      }
      default: break;
    }
  }

  // ------------------------------------------------------------------ draw
  private render(id: number, _t: number, cam: THREE.PerspectiveCamera) {
    const cp = cam.position;
    this.right.setFromMatrixColumn(cam.matrixWorld, 0); this.fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const shot = SHOTS[id - 1], shadow = LOOKS[shot.look].light.actorShadow;
    const n = this.birds.length, dist = new Float32Array(n), vis = new Uint8Array(n);
    const near: number[] = [];
    const halfV = THREE.MathUtils.degToRad(cam.fov / 2) + 0.12, tanV = Math.tan(halfV), tanH = tanV * cam.aspect + 0.12;
    for (let k = 0; k < n; k++) {
      const b = this.birds[k], dx = b.x - cp.x, dy = 0.9 - cp.y, dz = b.z - cp.z;
      const d = Math.hypot(dx, dy, dz); dist[k] = d;
      const zf = dx * this.fwd.x + dy * this.fwd.y + dz * this.fwd.z;
      if (zf < -2 || d < 1.4) continue;
      const xr = Math.abs(dx * this.right.x + dz * this.right.z);
      if (zf > 0 && xr > zf * tanH + 2.5 * b.s) continue;
      vis[k] = 1;
      if (d < D_HERO) near.push(k);
    }
    near.sort((a, b) => dist[a] - dist[b]);
    const hero = new Set(near.slice(0, N_HERO));
    let hi = 0; const cnt = [0, 0]; let bi = 0;
    const used: Actor[] = [];
    for (let k = 0; k < n; k++) {
      if (!vis[k]) continue;
      const b = this.birds[k];
      const tcx = cp.x - b.x, tcz = cp.z - b.z, tl = Math.hypot(tcx, tcz) || 1;
      const c = (tcx * b.fx + tcz * b.fz) / tl;
      const v: "S" | "F" = b.vf ?? (c > 0.6 ? "F" : "S");
      const mirror = v === "S" ? b.fx * this.right.x + b.fz * this.right.z < 0 : hsh(b.i, 40) < 0.5 && !b.pose.hat && b.pose.g !== "wave";
      const pose: Pose = { ...b.pose, v, seed: b.pose.seed ?? b.i % 4 };
      if (v === "S" && (pose.hd === "l" || pose.hd === "r" || (pose.g === "peck" && pose.hd === "c"))) pose.hd = "f";
      if (v === "F" && (pose.hd === "f" || pose.hd === "b")) pose.hd = "c";
      const yaw = Math.atan2(tcx, tcz), elev = Math.atan2(cp.y - 1.0 * b.s, tl), pitch = elev > 0.3 ? (elev - 0.3) * 0.75 : 0;
      const s = b.s;
      if (hero.has(k)) {
        const a = this.hero(hi++), d = dist[k] / s;
        const [w, k2] = d < 4 ? [2048, 2.048] : d < 8 ? [1280, 1.28] : d < 15 ? [720, 0.72] : [420, 0.42];
        const draw = b.draw ?? ((p: Pen) => drawEmu(p, pose));
        a.r = this.pool.req(b.key ?? poseKey(pose), w, w, k2, draw);
        a.mesh.visible = true; a.mesh.position.set(b.x, 0, b.z);
        a.mesh.rotation.set(-pitch, yaw, 0); a.mesh.scale.set(mirror ? -s : s, s, s);
        a.mesh.castShadow = shadow;
        used.push(a);
      } else {
        const ai = v === "S" ? 0 : 1, ci = cnt[ai]++;
        if (ci >= N_CROWD) continue;
        this.e.set(-pitch, yaw, 0); this.q.setFromEuler(this.e);
        this.m4.compose(this.v3.set(b.x, 0, b.z), this.q, this.s3.set(mirror ? -s : s, s, s));
        this.crowd[ai].setMatrixAt(ci, this.m4);
        this.cellAttr[ai].setX(ci, v === "S" ? sideCell(pose) : frontCell(pose));
      }
      if (b.key === "bush") continue;
      if (bi < N_CROWD + N_HERO) {
        this.q.setFromAxisAngle(this.v3.set(0, 1, 0), yaw);
        const wide = v === "S" ? 1.15 : 0.85;
        this.m4.compose(this.v3.set(b.x, 0.024, b.z), this.q, this.s3.set(wide * s, 1, 0.62 * s));
        this.blobs.setMatrixAt(bi++, this.m4);
      }
    }
    for (let k = hi; k < this.heroes.length; k++) this.heroes[k].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (let ai = 0; ai < 2; ai++) { this.crowd[ai].count = Math.min(N_CROWD, cnt[ai]); this.crowd[ai].instanceMatrix.needsUpdate = true; this.cellAttr[ai].needsUpdate = true; }
    this.blobs.count = bi; this.blobs.instanceMatrix.needsUpdate = true;
    // dust
    let di = 0;
    for (const p of this.puffs) {
      if (di >= N_DUST) break;
      const dx = p.x - cp.x, dz = p.z - cp.z;
      if (dx * this.fwd.x + dz * this.fwd.z < 0 || Math.hypot(dx, dz) > 140) continue;
      const sz = p.s * (0.45 + 1.5 * p.age), y = 0.18 * p.s + 0.35 * p.age;
      this.m4.compose(this.v3.set(p.x, y, p.z), cam.quaternion, this.s3.set(sz, sz, 1));
      this.dust.setMatrixAt(di, this.m4); this.dustA.setX(di, 0.55 * (1 - p.age) * Math.min(1, p.age * 8)); di++;
    }
    this.dust.count = di; this.dust.instanceMatrix.needsUpdate = true; this.dustA.needsUpdate = true;
  }
}
