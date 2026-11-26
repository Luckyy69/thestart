// OWNER: cast agent. Drawings for "Hiccups Come From Tadpoles" (all NEW designs, Pen style: thick-thin plum ink,
// painted crescents). Design space 600 x 1000 units per card (bridge: 1000 units = 2.16 m); the card origin
// (canvas 300, 975) is the point between the feet ON the ground.
//   drawPerson  BEAN (lavender frog-print pyjamas, orange morning hair, frog slippers) and CHARLES OSBORNE (1922 Iowa
//               farmer: straw hat, red flannel, denim bib overalls, moustache) who AGES with `age` 0..1 (hair +
//               moustache go white, wrinkles, round glasses, a stoop). The hic faces ("hic" pop) and THE MEME FACE
//               (old Osborne's last giant HIC: bulging bloodshot eyes, balloon cheeks, bristling moustache, hat popped).
//   drawTadpole the big cute tadpole (feathery gills, gill slits, finned tail), gulp / snap / flow faces, and the
//               tadpole -> BEAN morph (hair, freckles, frog-slipper legs, little arms, the tail shrinking).
//   drawHog     a cute pink hog in side view (startled / bored lying down / shocked), greying with age.
//   effects     "HIC!" fizz-bubble bursts, jolt marks, sweat, "!" / "?", sparkles, bubbles, swim swishes, rays.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, Blob } from "../bridge/toon";

export type P2 = [number, number];
const WHITE = "#ffffff", MOUTH = "#4a1020", TONGUE = "#ff6f86", TEAR = "#8fd8ff", TEAR_HI = "#eefaff";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 73.31 + k * 51.17) * 21734.1931; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = cl01(x); return u * u * (3 - 2 * u); };
export const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const qbez = (a: P2, c: P2, b: P2, n = 12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
/** quadratic curve through k at its middle */
const thru = (a: P2, k: P2, b: P2, n = 12) => qbez(a, [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], b, n);
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
};
const shrink = (pts: P2[], k: number): P2[] => {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x / pts.length; cy += y / pts.length; }
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
const rotPts = (pts: P2[], a: number, c: P2): P2[] => pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; });
/** inked limb: ink stroke then colour stroke (round caps) */
const limb = (p: Pen, pts: P2[], col: string, w: number, ink: number) => { p.stroke(pts, w + 2 * ink, INK); p.stroke(pts, w, col); };
const tapered = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
/** soft radial glow at a design point (in-card canvas compositing) */
const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  if (a <= 0.01) return;
  const g = p.g, [x, y] = p.P(x0, y0), gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
};
/** draw fn() at canvas alpha a (in-card fades: glasses, wrinkles, freckles never pop) */
const faded = (p: Pen, a: number, fn: () => void) => { if (a <= 0.01) return; const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
const SH_SKIN: [number, number, number] = [0.95, 0.84, 0.84], SH_CLOTH: [number, number, number] = [0.62, 0.66, 0.78], SH_HAIR: [number, number, number] = [0.62, 0.6, 0.72];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo outside the ink) */
const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};

// ======================================================================================================================
// PEOPLE (front view)
// ======================================================================================================================
export type Who = "bean" | "osborne";
export type HandK = "rest" | "open" | "grip" | "point" | "palm" | "fist";
export type Hold = "can" | "pencil" | "book";
export type Pose = {
  /** ankle points (canvas) [screen-left, screen-right] */
  feet: [P2, P2];
  /** hand targets (canvas); hk shapes; ha hand angle override; front = drawn over the torso */
  hands: [P2, P2]; hk?: [HandK, HandK]; ha?: [number | null, number | null]; front?: [boolean, boolean]; hold?: [Hold | null, Hold | null];
  /** knees-bend drop (units, +down), lean about the hips (rad), head tilt (deg), shoulder shrug (units, +up),
   *  sideways shake (units), head offset along the neck (+down / -up) */
  drop?: number; lean?: number; headTilt?: number; shrug?: number; shake?: number; headDy?: number;
  /** hic jolt 0..1 (chest heaves, hair bounces) */
  jolt?: number;
  /** BEAN's can: canvas angle of the can's TOP direction (-PI/2 upright) */
  can?: number;
  /** Osborne's hat popped up off the head (units) */
  hatUp?: number;
};
export type Face = "sip" | "hic" | "huh" | "sideeye" | "curious" | "uhoh" | "gasp" | "clamp" | "shrug" | "content" | "betrayed" | "worried"
  | "focus" | "proud" | "puzzled" | "grumpy" | "tired" | "exhausted" | "meme" | "wince";
/** k: amount (meme); look: pupils (-1..1); shake: frame parity for trembles; age: Osborne 0..1 (1922 -> 1990) */
export type FaceS = { e: Face; k?: number; look?: P2; shake?: number; age?: number };

export const HEAD_A = 118;
export const U = (2 * HEAD_A) / 100;
export const LAYOUT = { hc: 300, chin: 404, top: 410, tbot: 626, hipY: 604, shY: 456 };
const L = LAYOUT;
export const MOUTH_DY = 22;
const EX = 15.5, EY = -3;
const ARM1 = 100, ARM2 = 94, THIGH = 178, SHIN = 176;

type EyeK = "dot" | "wide" | "pop" | "closed" | "happy" | "lid" | "side" | "squint" | "heavy" | "worry" | "meme" | "wince";
type MouthK = "pucker" | "clamp" | "o" | "flat" | "slant" | "wobble" | "gasp" | "meh" | "smile" | "grin" | "pout" | "frown" | "meme" | "tache";
type FaceDef = { eye: EyeK; brow: [number, number]; brow2?: [number, number]; mouth: MouthK; look?: P2; blush?: number; puff?: number; tilt?: number; sweat?: boolean; bags?: number; red?: number };
const FACES: Record<Face, FaceDef> = {
  sip: { eye: "closed", brow: [-3, -1], mouth: "pucker", blush: 0.35, tilt: -5 },
  hic: { eye: "pop", brow: [-13, -11], mouth: "clamp", puff: 0.7, tilt: -4, blush: 0.4 },
  huh: { eye: "dot", brow: [2, 0], brow2: [-9, -10], mouth: "o", look: [0.8, 0.5], tilt: 5 },
  sideeye: { eye: "side", brow: [5, 2], brow2: [-2, -6], mouth: "slant", tilt: -3 },
  curious: { eye: "dot", brow: [-6, -6], mouth: "o", look: [0, 1] },
  uhoh: { eye: "wide", brow: [-10, -4], mouth: "wobble", look: [0, 0.8], sweat: true },
  gasp: { eye: "wide", brow: [-13, -10], mouth: "gasp", tilt: -3 },
  clamp: { eye: "pop", brow: [-12, -12], mouth: "clamp", puff: 1, blush: 0.5 },
  shrug: { eye: "lid", brow: [-10, -7], mouth: "meh", tilt: 7 },
  content: { eye: "happy", brow: [-4, -2], mouth: "smile", blush: 0.3 },
  betrayed: { eye: "squint", brow: [8, -3], brow2: [-5, 4], mouth: "pout", look: [1, -0.3], tilt: 6 },
  worried: { eye: "worry", brow: [-12, 2], mouth: "wobble", sweat: true, blush: 0.2 },
  focus: { eye: "dot", brow: [5, -1], mouth: "tache", look: [0.9, 0.5] },
  proud: { eye: "happy", brow: [-6, -4], mouth: "grin", blush: 0.3 },
  puzzled: { eye: "dot", brow: [4, 1], brow2: [-10, -9], mouth: "o", look: [0, 0.9], tilt: 6 },
  grumpy: { eye: "lid", brow: [9, 2], mouth: "frown", tilt: -2 },
  tired: { eye: "heavy", brow: [-3, 5], mouth: "frown", bags: 0.7, tilt: 4 },
  exhausted: { eye: "heavy", brow: [-8, 6], mouth: "wobble", bags: 1, sweat: true, tilt: 6 },
  meme: { eye: "meme", brow: [-22, -14], mouth: "meme", puff: 1.35, red: 0.55, bags: 1, tilt: -3 },
  wince: { eye: "wince", brow: [7, 2], mouth: "clamp", puff: 0.3, tilt: 3 },
};

// ---------------- rig geometry ----------------
type Xf = (P: P2) => P2;
const rotAbout = (P: P2, c: P2, a: number): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
const bodyXf = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => { const r = rotAbout(P, [300, L.hipY], a); return [r[0] + dx, r[1] + dy]; }; };
const bodyInv = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => rotAbout([P[0] - dx, P[1] - dy], [300, L.hipY], -a); };
const headRot = (pose: Pose, face: FaceS): number[] => {
  const N: P2 = [300, L.chin], Nw = bodyXf(pose)(N), D = FACES[face.e];
  const sh = face.e === "meme" || face.e === "worried" || face.e === "exhausted" ? ((face.shake ?? 0) % 2 ? 1 : -1) * (face.e === "meme" ? 2.2 : 0.7) * U : 0;
  return [(pose.lean ?? 0) + rad((D.tilt ?? 0) + (pose.headTilt ?? 0)), N[0], N[1], Nw[0] - N[0] + sh, Nw[1] - N[1] + (pose.headDy ?? 0)];
};
const xfOf = (r: number[]): Xf => (P) => { const q = rotAbout(P, [r[1], r[2]], r[0]); return [q[0] + r[3], q[1] + r[4]]; };
const shoulder = (pose: Pose, side: 0 | 1, tw: number): P2 => [300 + (side ? 1 : -1) * (tw - 10), L.shY - (pose.shrug ?? 0)];
const armIK = (pose: Pose, side: 0 | 1, tw: number) => {
  const S = shoulder(pose, side, tw), s = side ? 1 : -1, Hd = bodyInv(pose)(pose.hands[side]);
  const d0 = Math.hypot(Hd[0] - S[0], Hd[1] - S[1]), d = Math.max(36, Math.min(d0, ARM1 + ARM2 - 2));
  const ang = Math.atan2(Hd[1] - S[1], Hd[0] - S[0]), hand: P2 = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
  const dx = hand[0] - S[0], dy = hand[1] - S[1], a = (ARM1 * ARM1 - ARM2 * ARM2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ARM1 * ARM1 - a * a));
  let px = -dy / d, py = dx / d; if (px * s * 0.7 + py < 0) { px = -px; py = -py; }
  return { S, E: [S[0] + (dx / d) * a + px * h, S[1] + (dy / d) * a + py * h] as P2, hand };
};
const legIK = (pose: Pose, side: 0 | 1) => {
  const s = side ? 1 : -1, Hp = bodyXf(pose)([300 + s * 36, L.hipY]), F = pose.feet[side];
  const d0 = Math.hypot(F[0] - Hp[0], F[1] - Hp[1]), d = Math.max(40, Math.min(d0, THIGH + SHIN - 3));
  const ang = Math.atan2(F[1] - Hp[1], F[0] - Hp[0]), Fc: P2 = [Hp[0] + Math.cos(ang) * d, Hp[1] + Math.sin(ang) * d];
  const dx = Fc[0] - Hp[0], dy = Fc[1] - Hp[1], a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d), h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  let px = -dy / d, py = dx / d; if (px * s < 0) { px = -px; py = -py; }
  return { Hp, K: [Hp[0] + (dx / d) * a + px * h, Hp[1] + (dy / d) * a + py * h] as P2, F: Fc };
};
const twOf = (who: Who) => (who === "osborne" ? 94 : 84);
const headAOf = (who: Who) => (who === "osborne" ? 112 : HEAD_A);
/** canvas points of a posed figure (world contracts are built from these) */
export const jointsOf = (who: Who, pose: Pose, face: FaceS) => {
  const B = bodyXf(pose), Hx = xfOf(headRot(pose, face)), tw = twOf(who), uu = U * (headAOf(who) / HEAD_A);
  const can = pose.can ?? -Math.PI / 2, hR = B(armIK(pose, 1, tw).hand);
  return {
    head: Hx([300, L.hc]), mouth: Hx([300, L.hc + MOUTH_DY * uu]), crown: Hx([300, L.hc - 1.0 * headAOf(who)]),
    eyes: [Hx([300 - EX * uu, L.hc + EY * uu]), Hx([300 + EX * uu, L.hc + EY * uu])] as [P2, P2],
    hands: [B(armIK(pose, 0, tw).hand), hR] as [P2, P2],
    chest: B([300, 500]), belly: B([300, 566]),
    /** BEAN's can: centre + top direction (canvas) */
    canC: [hR[0] + Math.cos(can) * 2.5 * U, hR[1] + Math.sin(can) * 2.5 * U] as P2, canDir: [Math.cos(can), Math.sin(can)] as P2,
  };
};

// ---------------- hands + held things ----------------
const drawHand = (p: Pen, kind: HandK, H: P2, ang: number, skin: string, side: 0 | 1) => {
  const u = U, r = 8.8 * u, s = side ? 1 : -1, fw = 3.8 * u, ink = 2.1 * u;
  const fing = (a: number, len: number, from = 0.25, w = fw) => {
    const b: P2 = [H[0] + Math.cos(a) * r * from, H[1] + Math.sin(a) * r * from], tip: P2 = [H[0] + Math.cos(a) * (r + len), H[1] + Math.sin(a) * (r + len)];
    limb(p, [b, tip], skin, w, ink);
  };
  const palm = (rx = r, ry = r * 0.94) => { p.ell(H[0], H[1], rx + ink, ry + ink, INK, 0); p.ell(H[0], H[1], rx, ry, skin, 0); };
  switch (kind) {
    case "open": for (let i = 0; i < 4; i++) fing(ang + (-0.62 + i * 0.41), (10 - Math.abs(i - 1.5) * 1.6) * u); fing(ang - s * 1.45, 6 * u); palm(); break;
    case "palm": for (let i = 0; i < 4; i++) fing(ang + (-0.5 + i * 0.33), (8.5 - Math.abs(i - 1.5) * 1.4) * u); fing(ang + s * 1.3, 6 * u); palm(); p.arc(H[0], H[1] + 1 * u, r * 0.5, r * 0.35, 20, 160, 1.3 * u); break;
    case "point": palm(r * 0.95, r * 0.9); fing(ang, 12 * u, 0.1, fw * 1.05); break;
    case "grip": case "fist": {
      palm(r * 1.05, r * 0.95);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      for (let i = 0; i < 3; i++) p.arc(H[0] + Math.cos(ang) * 3 * u + (i - 1) * 4.6 * u * nx, H[1] + Math.sin(ang) * 3 * u + (i - 1) * 4.6 * u * ny, 2.8 * u, 2.4 * u, 0, 360, 1.3 * u);
      break;
    }
    default: palm();
  }
};
/** BEAN's fizzy can (our own design: teal, a pink wave, white bubbles; no logo). Drawn in-card only when
 *  CAST_DRAWS.can is on; otherwise props builds it in 3D at canAt(). */
export const drawCan = (p: Pen, C: P2, a: number, light: number) => {
  const u = U, h = 15.5 * u, w = 9 * u, r = a + Math.PI / 2, R = (pts: P2[]) => rotPts(pts, r, C);
  const body = R(rrect(C[0] - w, C[1] - h, C[0] + w, C[1] + h, 3 * u));
  p.gradFill(body, "#2fc8b0", "#16806e", light, 0.3);
  p.clip(body, () => {
    p.poly(R([...thru([C[0] - w - 2, C[1] + 2 * u], [C[0], C[1] - 5 * u], [C[0] + w + 2, C[1] + 2 * u], 8), [C[0] + w + 2, C[1] + 8 * u], ...thru([C[0] + w + 2, C[1] + 8 * u], [C[0], C[1] + 1 * u], [C[0] - w - 2, C[1] + 8 * u], 8)]), "#ff5fa2", 0);
    for (const [x, y, rr] of [[-4, -9, 2.2], [3, -6, 1.6], [-1, -12, 1.2], [4, 11, 1.8]]) { const q = R([[C[0] + x * u, C[1] + y * u]])[0]; p.ell(q[0], q[1], rr * u, rr * u, WHITE, 0.8 * u); }
    p.poly(R(rrect(C[0] - w - 2, C[1] - h - 2, C[0] + w + 2, C[1] - h + 4 * u, 1)), "#d8e0ea", 0);
    p.poly(R(rrect(C[0] - w - 2, C[1] + h - 3 * u, C[0] + w + 2, C[1] + h + 2, 1)), "#c8d0da", 0);
    p.stroke(R([[C[0] - w * 0.55, C[1] - h * 0.6], [C[0] - w * 0.55, C[1] + h * 0.6]]), 2.2 * u, "rgba(255,255,255,0.55)");
  });
  p.poly(body, null, 2.6 * u);
};
const drawHold = (p: Pen, what: Hold, H: P2, side: 0 | 1, pose: Pose, flutter: number) => {
  const u = U, s = side ? 1 : -1;
  if (what === "book") { // Osborne's little tally notebook held open against his chest
    const c: P2 = [H[0] + s * 4 * u, H[1] - 14 * u], a = -s * 0.1 + flutter * 0.25;
    p.poly(rotPts(rrect(c[0] - 24 * u, c[1] - 17 * u, c[0] + 24 * u, c[1] + 17 * u, 2.5 * u), a, c), "#6a4a2e", 2.4 * u);
    for (const e of [-1, 1]) p.poly(rotPts(rrect(c[0] + (e < 0 ? -21 : 1) * u, c[1] - 15 * u, c[0] + (e < 0 ? -1 : 21) * u, c[1] + 15 * u, 1.2 * u), a, c), "#f6ecd0", 1.2 * u);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { // tally marks
      const x = c[0] - 18 * u + i * 6.5 * u, y = c[1] - 10 * u + j * 6.5 * u;
      p.stroke(rotPts([[x + (j % 2) * 1 * u, y - 2.4 * u], [x, y + 2.4 * u]], a, c), 1.1 * u, "#5a5a7a");
    }
    p.stroke(rotPts([[c[0] + 4 * u, c[1] - 9 * u], [c[0] + 17 * u, c[1] - 9 * u]], a, c), 1.2 * u, "#5a5a7a");
    p.stroke(rotPts([[c[0] + 4 * u, c[1] - 3 * u], [c[0] + 14 * u, c[1] - 3 * u]], a, c), 1.2 * u, "#5a5a7a");
  } else if (what === "pencil") {
    const a = pose.ha?.[side] ?? rad(-120), tip: P2 = [H[0] - Math.cos(a) * 12 * u, H[1] - Math.sin(a) * 12 * u], end: P2 = [H[0] + Math.cos(a) * 18 * u, H[1] + Math.sin(a) * 18 * u];
    limb(p, [tip, end], "#f2c43a", 3.4 * u, 1.3 * u);
    p.dot(end[0], end[1], 2.6 * u, INK); p.dot(end[0], end[1], 1.6 * u, "#f08a9a");
    p.dot(tip[0], tip[1], 1.6 * u, INK);
  }
};

// ---------------- hair ----------------
const lock = (p: Pen, col: string, cx: number, hc: number, H: Blob, a: number, len: number, dir: number, curl: number, u: number, w = 0.15) => {
  const ar = rad(a), b0: P2 = [cx + Math.cos(ar - w) * H.a * 0.9, hc + Math.sin(ar - w) * H.b * 0.9], b1: P2 = [cx + Math.cos(ar + w) * H.a * 0.9, hc + Math.sin(ar + w) * H.b * 0.9];
  const M: P2 = [cx + Math.cos(ar) * H.a, hc + Math.sin(ar) * H.b], tip: P2 = [M[0] + Math.cos(dir) * len, M[1] + Math.sin(dir) * len];
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const c0: P2 = [lerp(b0[0], tip[0], 0.55) + nx * curl, lerp(b0[1], tip[1], 0.55) + ny * curl], c1: P2 = [lerp(b1[0], tip[0], 0.55) + nx * curl * 0.6, lerp(b1[1], tip[1], 0.55) + ny * curl * 0.6];
  p.poly([...qbez(b0, c0, tip, 8), ...qbez(tip, c1, b1, 8).slice(1)], col, 3.6 * u);
};
const BEAN_HAIR = "#ec6a2c";
/** BEAN's morning hair: flame locks round the crown (one side flattened by the pillow); bounce lifts them on a hic.
 *  grow 0..1 scales the locks (the tadpole morph) */
const beanHairBack = (p: Pen, cx: number, hc: number, H: Blob, u: number, bounce: number, grow = 1, seed = 31) => {
  const dk = mul(BEAN_HAIR, [0.84, 0.8, 0.86]);
  for (let i = 0; i < 12; i++) {
    const f = i / 11, a = 192 + f * 156 + (rnd(seed, i) - 0.5) * 9, flat = f > 0.78 ? 0.5 : 1;
    const Lh = (18 + 20 * rnd(seed, i + 3)) * u * flat * (1 + 0.9 * bounce) * grow;
    let dir = rad(a) + (rnd(seed, i + 9) - 0.5) * 0.8 + (f > 0.78 ? -0.5 : 0);
    dir = lerp(dir, -Math.PI / 2 + (f - 0.5) * 1.2, 0.6 * bounce);
    if (Lh > 2 * u) lock(p, i % 3 === 1 ? dk : BEAN_HAIR, cx, hc, H, a, Lh, dir, (i % 2 ? 1 : -1) * 10 * u, u);
  }
};
const beanHairFront = (p: Pen, hp: P2[], cx: number, hc: number, H: Blob, u: number, light: number, thick: number, bounce: number, seed = 31) => {
  const n = hp.length, cutY = hc - 0.4 * H.b, run: P2[] = [];
  for (let i = Math.floor(n / 2); i < n; i++) if (hp[i][1] < cutY) run.push([cx + (hp[i][0] - cx) * 1.05, hc + (hp[i][1] - hc) * 1.05]);
  if (run.length < 4) return;
  const [xR, yR] = run[run.length - 1], [xL, yL] = run[0], fr: P2[] = [];
  for (let j = 1; j < 8; j++) { const f = j / 8; fr.push([lerp(xR, xL, f) + (j % 2 ? 6 : 0) * u, lerp(yR, yL, f) + (j % 2 ? (14 + 8 * rnd(seed, j)) * u * (1 - 0.5 * bounce) : -2 * u)]); }
  const pts = [...run, ...fr];
  p.shadedFill(pts, BEAN_HAIR, mul(BEAN_HAIR, SH_HAIR), light, H.a, 0.35);
  p.clip(pts, () => { const a = (light * 180) / Math.PI; p.arc(cx, hc - 6 * u, 0.8 * H.a, 0.78 * H.b, a - 26, a + 26, 3.6 * u, mix(BEAN_HAIR, WHITE, 0.38)); });
  p.inkRing(pts, 4.2 * u, thick, 0.45);
  // the cowlick: one big curl standing up (boings on a hic)
  const base: P2 = [cx + 8 * u, hc - H.b * 0.95], h = 44 * (1 + 0.5 * bounce), tip: P2 = [base[0] + 20 * u * (1 - 0.6 * bounce), base[1] - h * u];
  const curl: P2[] = [...thru([base[0] - 9 * u, base[1] + 4 * u], [base[0] - 6 * u, base[1] - h * 0.6 * u], tip, 10), ...thru(tip, [base[0] + 10 * u, base[1] - h * 0.45 * u], [base[0] + 8 * u, base[1] + 4 * u], 10).slice(1)];
  p.poly(curl, BEAN_HAIR, 3.8 * u);
  p.stroke(thru([base[0], base[1] - 4 * u], [base[0] + 1 * u, base[1] - h * 0.5 * u], lerp2(base, tip, 0.85), 8), 1.6 * u, mix(BEAN_HAIR, WHITE, 0.32));
};

// ---------------- faces ----------------
const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: P2, shake: number, k: number, skin: string) => {
  const lx = x + look[0] * 2.8 * u, ly = ey + look[1] * 2.6 * u, w = 4 * u;
  switch (kind) {
    case "dot": p.ell(lx, ly, 4.9 * u, 6.8 * u, INK, 0); p.dot(lx - 1.6 * u, ly - 2.7 * u, 1.6 * u, WHITE); break;
    case "wide": p.ell(x, ey - u, 9.8 * u, 11.4 * u, WHITE, 2.6 * u); p.ell(lx, ly, 4.6 * u, 5.8 * u, INK, 0); p.dot(lx - 1.6 * u, ly - 2.2 * u, 1.6 * u, WHITE); break;
    case "pop": { // the hic: eyes spring open, round and white, pin pupils
      const s = 1 + 0.18 * cl01(k);
      p.ell(x, ey - 1.5 * u, 11 * u * s, 12.4 * u * s, WHITE, 2.8 * u);
      p.dot(x + (shake % 2 ? 0.5 : -0.5) * u, ey - 0.5 * u, 2.3 * u);
      break;
    }
    case "worry": { // big wet worried eyes, wobbling pupils
      p.ell(x, ey - u, 10 * u, 11.6 * u, WHITE, 2.6 * u);
      const ox = (shake % 2 ? 0.6 : -0.6) * u;
      p.ell(x + ox, ey + 1.5 * u, 5.4 * u, 6.4 * u, INK, 0); p.dot(x + ox - 1.8 * u, ey - 1 * u, 2 * u, WHITE); p.dot(x + ox + 1.6 * u, ey + 3.2 * u, 1 * u, WHITE);
      p.arc(x, ey + 1 * u, 8.5 * u, 9.5 * u, 30, 150, 1.5 * u, TEAR);
      break;
    }
    case "closed": p.arc(x, ey - 1 * u, 8 * u, 5 * u, 20, 160, w); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6.6 * u, 200, 340, w); break;
    case "lid": p.ell(lx, ey + 0.8 * u, 5 * u, 5.4 * u, INK, 0, 0, 180); p.stroke([[x - 8.6 * u, ey + 0.5 * u], [x + 8.6 * u, ey + 0.5 * u]], w); break;
    case "heavy": // droopy tired lids
      p.ell(lx, ey + 3.4 * u, 4.6 * u, 3.6 * u, INK, 0, 0, 180);
      p.stroke(thru([x - 9 * u, ey + 2.6 * u], [x, ey + 1 * u], [x + 9 * u, ey + 2.6 * u], 8), w * 1.05);
      p.stroke([[x + side * 8.5 * u, ey + 2.6 * u], [x + side * 11.5 * u, ey + 5 * u]], 1.8 * u);
      break;
    case "side": { // the side-eye: flat suspicious lids, pupils slid over to `look`
      const px = x + look[0] * 4.4 * u, wpts = ellPts(x, ey, 9.6 * u, 7.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        p.ell(px, ey + 1.4 * u, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.2 * u, ey - 0.4 * u, 1.3 * u, WHITE);
        p.poly([[x - 12 * u, ey - 10 * u], [x + 12 * u, ey - 10 * u], [x + 12 * u, ey - 1.8 * u], [x - 12 * u, ey - 1.8 * u]], mul(skin, [0.95, 0.88, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke([[x - 10.5 * u, ey - 1.8 * u], [x + 10.5 * u, ey - 1.8 * u]], w * 1.1);
      break;
    }
    case "squint": // narrowed betrayed glare
      p.stroke(thru([x - 9.5 * u, ey + 0.4 * u], [x, ey - 1.4 * u], [x + 9.5 * u, ey + 0.4 * u], 8), w * 1.15);
      p.ell(x + look[0] * 3 * u, ey + 2.2 * u, 3.8 * u, 2.2 * u, INK, 0, 0, 180);
      break;
    case "wince": { const o = side * 8 * u; p.stroke([[x + o, ey - 5.5 * u], [x - side * 6 * u, ey + 0.4 * u], [x + o, ey + 5.5 * u]], w * 1.2); break; }
    case "meme": break; // memeFace
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, shake: number) => {
  const mw = 4 * u;
  switch (kind) {
    case "pucker": p.ell(mx + 2 * u, my, 4.4 * u, 3.6 * u, "#ff8fa0", 2.6 * u); break;
    case "clamp": { // the throat door slams: lips pressed tight, a squeeze crease each side
      p.stroke(thru([mx - 6 * u, my + 0.5 * u], [mx, my - 1.5 * u], [mx + 6 * u, my + 0.5 * u], 8), mw * 1.1);
      for (const s of [-1, 1]) p.arc(mx + s * 8 * u, my, 2.4 * u, 3.2 * u, s > 0 ? -70 : 110, s > 0 ? 70 : 250, 1.6 * u);
      break;
    }
    case "o": p.ell(mx, my + u, 4 * u, 4.8 * u, MOUTH, 2.8 * u); break;
    case "flat": p.stroke([[mx - 9 * u, my + 1 * u], [mx + 9 * u, my + 1 * u]], mw); break;
    case "slant": p.stroke([[mx - 8 * u, my + 2 * u], [mx + 9 * u, my - 1.5 * u]], mw); break;
    case "meh": { const s: P2[] = []; for (let i = 0; i <= 10; i++) s.push([mx - 8 * u + i * 1.6 * u, my + 1.6 * u * Math.sin(i * 0.9)]); p.stroke(s, 3.4 * u); break; }
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1 * u + 1.8 * u * Math.sin(i * 1.5 + (shake % 2) * 0.8)]); p.stroke(s, 3.2 * u); break; }
    case "gasp": { // the sharp inhale: a tall open oval
      const w = 7.5 * u, h = 11 * u, pts = ellPts(mx, my + h * 0.45, w, h, 30);
      p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + h * 1.25, w * 0.75, h * 0.45, TONGUE, 0)); p.poly(pts, null, 3 * u);
      break;
    }
    case "smile": p.arc(mx, my - 3 * u, 9 * u, 5.4 * u, 20, 160, mw); break;
    case "grin": {
      const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 10 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)];
      p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 13 * u, my - 0.5 * u], [mx + 13 * u, my - 0.5 * u]], 1.3 * u); break;
    }
    case "pout": p.arc(mx, my + 4 * u, 8 * u, 4.6 * u, 205, 335, mw); p.stroke([[mx + 8 * u, my + 2 * u], [mx + 10 * u, my + 4.5 * u]], 2.4 * u); break;
    case "frown": p.arc(mx, my + 4.5 * u, 8.5 * u, 4.4 * u, 200, 340, mw); break;
    case "tache": p.stroke([[mx - 5 * u, my + 2 * u], [mx + 5 * u, my + 2 * u]], 3 * u); break;
    case "meme": break;
  }
};
const nose = (p: Pen, skin: string, x: number, y: number, u: number, s: number, light: number, red = 0) => {
  const rx = 7.6 * u * s, ry = 6.2 * u * s, base = mix(mul(skin, [0.97, 0.88, 0.86]), "#ff6a5a", 0.6 * cl01(red));
  p.shadedFill(ellPts(x, y, rx, ry, 30), base, mul(base, [0.86, 0.8, 0.82]), light, rx, 0.4);
  p.arc(x, y, rx, ry, 15, 165, 2.6 * u);
  p.dot(x - rx * 0.35, y - ry * 0.35, 1.6 * u * s, "rgba(255,255,255,0.8)");
};
/** Osborne's moustache: a broom of a handlebar (bigger + whiter with age; bristles straight out at the meme) */
const tache = (p: Pen, mx: number, my: number, u: number, col: string, age: number, bristle: number, lift: number) => {
  const w = (22 + 6 * age + 8 * bristle) * u, d = (8 + 3 * age) * u, tipUp = (3 - 2 * age - 6 * bristle) * u, y = my - 7 * u - lift;
  const top: P2[] = thru([mx - w, y + tipUp], [mx - w * 0.45, y - d * 0.75], [mx, y - d * 0.35], 10);
  const top2: P2[] = thru([mx, y - d * 0.35], [mx + w * 0.45, y - d * 0.75], [mx + w, y + tipUp], 10).slice(1);
  const bot: P2[] = [];
  for (let i = 0; i <= 9; i++) { const f = i / 9, x = mx + w - f * 2 * w, sn = Math.sin(f * Math.PI); bot.push([x, y + tipUp * (1 - sn) + d * 0.9 * sn + (i % 2 ? 3 * u : 0) * sn]); }
  p.poly([...top, ...top2, ...bot.slice(1, -1)], col, 2.6 * u);
  for (let i = -3; i <= 3; i++) if (i) p.stroke([[mx + i * w * 0.22, y + d * 0.05], [mx + i * w * 0.26, y + d * 0.6]], 1.2 * u, mul(col, [0.75, 0.74, 0.8]));
  if (bristle > 0.05) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.stroke([[mx + s * (w - 2 * u), y + tipUp + (i - 1) * 3 * u], [mx + s * (w + 7 * u * bristle), y + tipUp + (i - 1) * 4.5 * u]], 1.8 * u);
};
/** THE MEME FACE (old Osborne, 430 million hics): eyes bulging out like ping-pong balls (bloodshot, pin pupils,
 *  dark exhausted bags), balloon cheeks holding the hic, lips clamped to a tiny knot, the moustache bristling */
const memeFace = (p: Pen, cx: number, hc: number, H: Blob, u: number, k: number, shake: number, skin: string, light: number, browCol: string) => {
  const kk = Math.min(1.15, k), ey = hc - 6 * u, ex = 19 * u, r = (14 + 3.5 * kk) * u, jit = (shake % 2 ? 0.8 : -0.8) * u;
  for (const s of [-1, 1]) { // balloon cheeks
    const c: P2 = [cx + s * 0.56 * H.a, hc + 0.36 * H.b], rx = 0.36 * H.a * (0.85 + 0.2 * kk), ry = 0.3 * H.b * (0.85 + 0.2 * kk);
    p.shadedFill(ellPts(c[0], c[1], rx, ry, 32), mix(skin, "#ff7a7a", 0.35), mix(skin, "#e05a6a", 0.5), light, rx, 0.4);
    p.arc(c[0], c[1], rx, ry, s > 0 ? -60 : 120, s > 0 ? 80 : 260, 2.6 * u);
    p.arc(c[0] - s * 4 * u, c[1] - 5 * u, 6 * u, 4 * u, 200, 280, 2 * u, "rgba(255,255,255,0.75)");
  }
  for (const s of [-1, 1]) { // exhausted bags + the bulging eyes
    const x = cx + s * ex;
    p.ell(x, ey + r * 0.9, r * 1.05, r * 0.5, mix(skin, "#7a4a8a", 0.45), 0);
    p.arc(x, ey + r * 0.95, r * 0.95, r * 0.42, 20, 160, 1.8 * u);
    p.arc(x, ey + r * 1.25, r * 0.8, r * 0.35, 30, 150, 1.4 * u);
    const ball = ellPts(x + jit, ey, r, r * 1.04, 40);
    p.poly(ball, WHITE, 3.2 * u);
    p.clip(ball, () => { // bloodshot veins
      for (let i = 0; i < 5; i++) {
        const a = rad(-160 + i * 70 + s * 10), a2 = a + 0.25;
        p.stroke([[x + jit + Math.cos(a) * r, ey + Math.sin(a) * r], [x + jit + Math.cos(a2) * r * 0.55, ey + Math.sin(a2) * r * 0.55], [x + jit + Math.cos(a) * r * 0.38, ey + Math.sin(a) * r * 0.4]], 1.1 * u, "#ff5a6a");
      }
      p.arc(x + jit + 3 * u, ey + 3 * u, r * 0.9, r * 0.9, 20, 120, 3 * u, "rgba(190,200,230,0.55)");
    });
    p.poly(ball, null, 3.2 * u);
    p.dot(x + jit - s * 2.4 * u, ey + 1 * u, 2.1 * u); // pin pupils, a touch cross-eyed
    p.dot(x + jit - 5 * u, ey - 6 * u, 2.4 * u, WHITE);
    const by = ey - r - 9 * u; // brows rocketed up
    tapered(p, [x - s * 9 * u, by + 2 * u], [x + s * 13 * u, by - 8 * u], 10 * u, 6 * u, INK);
    tapered(p, [x - s * 9 * u, by + 2 * u], [x + s * 13 * u, by - 8 * u], 7 * u, 3.4 * u, browCol);
    for (const a of [-1, 0, 1]) p.stroke([[x + s * (r + 4 * u), ey + a * 6 * u], [x + s * (r + 10 * u), ey + a * 9 * u]], 2 * u);
  }
};
const drawFace = (p: Pen, who: Who, cx: number, hc: number, H: Blob, f: FaceS, lid: number, light: number, skin: string, hairCol: string, uu: number) => {
  const D = FACES[f.e], u = uu, look = f.look ?? D.look ?? [0, 0], shake = f.shake ?? 0, k = f.k ?? 1, age = who === "osborne" ? f.age ?? 0 : 0;
  const ey = hc + EY * u, ex = EX * u, browCol = who === "osborne" ? mix("#4a2c18", "#f4f2ec", sm((age - 0.15) / 0.6)) : INK;
  const meme = f.e === "meme";
  const puff = D.puff ?? 0, blush = Math.max(D.blush ?? 0, puff * 0.6);
  if (puff > 0 && !meme) for (const s of [-1, 1]) p.arc(cx + s * 0.6 * H.a, hc + 0.32 * H.b, 0.3 * H.a * (0.8 + 0.25 * puff), 0.3 * H.b * (0.8 + 0.25 * puff), s > 0 ? -50 : 130, s > 0 ? 70 : 250, 2.2 * u);
  if (blush > 0.02) for (const s of [-1, 1]) glow(p, cx + s * 0.6 * H.a, hc + 0.3 * H.b, 0.25 * H.a, "#ff5a7a", 0.55 * blush);
  if (who === "bean") for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(cx + s * (0.42 + 0.09 * i) * H.a, hc + (0.18 + (i % 2) * 0.07) * H.b, 1.6 * u, rgba("#b05a3a", 0.75));
  if (age > 0.02) faded(p, sm((age - 0.1) / 0.5), () => { // wrinkles: forehead lines, crow's feet, smile folds
    for (let i = 0; i < 3; i++) p.arc(cx, hc - 0.5 * H.b + i * 7 * u, (22 - i * 3) * u, 4 * u, 200, 340, 1.4 * u, mul(skin, [0.68, 0.56, 0.56]));
    for (const s of [-1, 1]) {
      for (const a of [-24, 0, 24]) { const b = s > 0 ? rad(a) : Math.PI - rad(a); p.stroke([[cx + s * (ex + 12 * u) + Math.cos(b) * u, ey + Math.sin(b) * u], [cx + s * (ex + 12 * u) + Math.cos(b) * 6 * u, ey + Math.sin(b) * 6 * u]], 1.4 * u, mul(skin, [0.62, 0.5, 0.5])); }
      p.stroke(thru([cx + s * 14 * u, hc + 10 * u], [cx + s * 21 * u, hc + 20 * u], [cx + s * 19 * u, hc + 30 * u], 8), 1.6 * u, mul(skin, [0.66, 0.54, 0.54]));
    }
  });
  if (meme) memeFace(p, cx, hc, H, u, k, shake, skin, light, browCol);
  else for (const s of [-1, 1]) {
    let ek = D.eye;
    if (lid >= 1 && !["happy", "closed", "wince", "squint", "side"].includes(ek)) ek = "closed";
    else if (lid > 0 && (ek === "dot" || ek === "wide" || ek === "worry")) ek = "lid";
    else if (lid > 0 && ek === "lid") ek = "heavy";
    const x = cx + s * ex;
    if ((D.bags ?? 0) > 0) faded(p, D.bags ?? 0, () => { p.arc(x, ey + 8 * u, 8 * u, 4 * u, 20, 160, 1.6 * u, "#8a5a7a"); p.arc(x, ey + 11 * u, 6.5 * u, 3 * u, 30, 150, 1.2 * u, "#8a5a7a"); });
    eye(p, ek, x, ey, u, s, look, shake, k, skin);
    const bw = D.brow2 && s > 0 ? D.brow2 : D.brow;
    const by = ey - (ek === "wide" || ek === "pop" || ek === "worry" ? 22 : 18.5) * u - (age > 0.45 ? 3 * u : 0);
    const b0: P2 = [x - s * 8.5 * u, by + bw[0] * u], b1: P2 = [x + s * (who === "osborne" ? 11 : 8.5) * u, by + bw[1] * u];
    if (who === "osborne") { tapered(p, b0, b1, 10 * u, 6 * u, INK); tapered(p, b0, b1, 7 * u, 3.2 * u, browCol); }
    else tapered(p, b0, b1, 5.4 * u, 2.8 * u, INK);
  }
  if (who === "osborne" && !meme) faded(p, sm((age - 0.42) / 0.2), () => { // round wire glasses (fade in with age)
    for (const s of [-1, 1]) { const x = cx + s * (ex + 1 * u); p.ell(x, ey, 12 * u, 11 * u, "rgba(220,240,255,0.22)", 5 * u); p.arc(x, ey, 12 * u, 11 * u, 0, 360, 2.4 * u, "#c8a050"); p.stroke([[x - 6 * u, ey - 5 * u], [x - 2 * u, ey - 7.5 * u]], 1.8 * u, "rgba(255,255,255,0.8)"); }
    p.arc(cx, ey + 1 * u, 5 * u, 3 * u, 200, 340, 2.4 * u, "#c8a050");
  });
  const mx = cx, my = hc + MOUTH_DY * u;
  if (meme) { p.ell(mx, my + 3 * u, 5 * u, 4 * u, "#e86070", 2.6 * u); p.stroke([[mx - 2 * u, my + 3 * u], [mx + 2 * u, my + 3 * u]], 1.4 * u); } // lips clamped to a knot
  else mouth(p, D.mouth, mx, my, u, shake);
  const nred = who === "osborne" ? 0.25 * age + (meme ? 0.5 : 0) : 0;
  nose(p, skin, cx, hc + 8.5 * u, u, who === "osborne" ? 1.25 + 0.2 * age : 1, light, nred);
  if (who === "osborne") tache(p, mx, my, u, hairCol, age, meme ? Math.min(1, k) : 0, D.mouth === "grin" ? 3 * u : 0);
  if (D.sweat) { const x = cx + 0.74 * H.a, y = hc - 0.42 * H.b; p.poly([[x, y - 8 * u], [x + 5 * u, y + 2 * u], [x + 4 * u, y + 6 * u], [x, y + 8 * u], [x - 4 * u, y + 6 * u], [x - 5 * u, y + 2 * u]], TEAR, 1.8 * u); }
};

// ---------------- Osborne's straw hat ----------------
const strawHat = (p: Pen, cx: number, hc: number, H: Blob, u: number, light: number, thick: number, age: number, up: number, tilt: number, brimK = 1) => {
  const by = hc - 0.62 * H.b - up, g = p.g;
  g.save();
  const [px, py] = p.P(cx, by); g.translate(px, py); g.rotate(tilt); g.translate(-px, -py);
  const straw = mix("#efcf78", "#d8b468", age * 0.6), dk = mul(straw, [0.78, 0.7, 0.6]);
  const w0 = 0.86 * H.a, w1 = 0.74 * H.a, top = by - 36 * u;
  const crown: P2[] = [[cx - w0, by + 2 * u], [cx - w1, top + 14 * u], ...thru([cx - w1, top + 10 * u], [cx, top - 2 * u], [cx + w1, top + 10 * u], 12), [cx + w1, top + 14 * u], [cx + w0, by + 2 * u]];
  const brim = ellPts(cx, by, 1.62 * H.a, 22 * u * brimK, 48);
  // the back half of the brim, then the crown, then the front lip of the brim
  p.inkRing(brim, 4.4 * u, thick, 0.4); p.gradFill(brim, straw, dk, light, 0.3);
  p.clip(brim, () => { for (let i = 1; i < 4; i++) p.arc(cx, by, (1.62 - 0.14 * i) * H.a, (22 - 3 * i) * u * brimK, 0, 360, 1.2 * u, dk); });
  p.inkRing(crown, 4.4 * u, thick, 0.4); p.gradFill(crown, straw, dk, light, 0.3);
  p.clip(crown, () => {
    for (let r = 0, y = top + 8 * u; y < by; y += 7 * u, r++) for (let x = cx - w0; x < cx + w0; x += 9 * u) p.arc(x + (r % 2 ? 4.5 * u : 0), y, 4 * u, 2 * u, 200, 340, 1.1 * u, dk);
    p.poly([[cx - w0 - 4, by - 18 * u], [cx + w0 + 4, by - 18 * u], [cx + w0 + 4, by - 4 * u], [cx - w0 - 4, by - 4 * u]], "#b8322e", 1.6 * u); // red band
    p.stroke([[cx - 10 * u, top + 4 * u], [cx + 2 * u, top + 12 * u]], 2.4 * u, dk); // the crown pinch
  });
  p.arc(cx, by, 1.62 * H.a, 22 * u * brimK, 15, 165, 3 * u);
  faded(p, sm((age - 0.35) / 0.4), () => { // frayed with the years
    for (let i = 0; i < 5; i++) { const a = rad(20 + i * 30), x = cx + Math.cos(a) * 1.6 * H.a, y = by + Math.sin(a) * 21 * u; p.stroke([[x, y], [x + 3 * u, y + 6 * u]], 1.6 * u, dk); }
    p.ell(cx + 0.4 * H.a, by - 34 * u, 5 * u, 3.4 * u, "#5a3a20", 1.4 * u);
  });
  g.restore();
};

// ---------------- the whole figure ----------------
export const PJ = "#9a84ee", FROG = "#7ad25a";
const PJ2 = "#7a62d8", PJ_TRIM = "#7ee0b8";
const OS_SHIRT = "#c8423a", DENIM = "#4a6eb0", DENIM2 = "#7a9ad0";
/** a whole figure in the 600 x 1000 design space (feet ~ y 950, origin 300, 975) */
export const drawPerson = (p: Pen, who: Who, pose: Pose, face: FaceS, light: number, lid = 0, canInCard = false, flutter = 0) => {
  const u = U, thick = thickAngle(light), ow = 4.8 * u, olSave = p.ol, tw = twOf(who), age = face.age ?? 0, os = who === "osborne";
  p.ol = 4 * u;
  const bodyR = [pose.lean ?? 0, 300, L.hipY, pose.shake ?? 0, pose.drop ?? 0];
  const B = bodyXf(pose), J = jointsOf(who, pose, face);
  const skin = os ? "#f0c296" : "#ffdcbc";
  const hairCol = os ? mix("#5a3a22", "#f4f2ec", sm((age - 0.12) / 0.65)) : BEAN_HAIR;
  // ---- legs ----
  const leg = (side: 0 | 1) => {
    const s = side ? 1 : -1, { Hp, K, F } = legIK(pose, side);
    const pts = [...thru(Hp, lerp2(Hp, K, 0.5), K, 6), ...thru(K, lerp2(K, F, 0.5), F, 7).slice(1)];
    if (!os) {
      limb(p, pts, PJ, 13 * u, 4 * u);
      for (let i = 2; i < pts.length - 2; i += 3) p.dot(pts[i][0] + s * 2 * u, pts[i][1], 2.6 * u, FROG);
      limb(p, [lerp2(K, F, 0.84), lerp2(K, F, 0.96)], PJ_TRIM, 14.5 * u, 1.6 * u);
      // frog slippers: green, two goggle eyes on top, a pink grin
      const cx = F[0] + s * 3 * u, cy = F[1] + 8 * u, body = ellPts(cx, cy, 17 * u, 11 * u, 40);
      for (const h of [-1, 1]) p.ell(cx + h * 7 * u, cy - 10 * u, 5.4 * u, 5.4 * u, FROG, 2 * u);
      p.inkRing(body, 4 * u, thick); p.shadedFill(body, FROG, mul(FROG, SH_CLOTH), light, 17 * u);
      for (const h of [-1, 1]) { p.ell(cx + h * 7 * u, cy - 10.5 * u, 3.2 * u, 3.4 * u, WHITE, 0); p.dot(cx + h * 7 * u + 0.4 * u, cy - 10 * u, 1.6 * u); }
      p.arc(cx, cy + 1 * u, 9 * u, 4.5 * u, 20, 160, 2.2 * u, "#ff6f8a");
    } else {
      limb(p, pts, DENIM, 15 * u, 4 * u);
      p.stroke(thru(lerp2(Hp, K, 0.2), lerp2(Hp, K, 0.6), lerp2(K, F, 0.4), 8), 1.2 * u, DENIM2);
      limb(p, [lerp2(K, F, 0.8), lerp2(K, F, 0.93)], DENIM2, 17 * u, 1.6 * u); // rolled cuffs
      const ox = F[0] + s * 4 * u, sp = ellPts(ox, F[1] + 7 * u, 17 * u, 9.5 * u, 30);
      p.poly(rrect(ox - 17 * u, F[1] + 9 * u, ox + 17 * u, F[1] + 16 * u, 3 * u), "#3a2414", 2.4 * u);
      p.inkRing(sp, 4 * u, thick); p.shadedFill(sp, "#7a4a28", mul("#7a4a28", SH_CLOTH), light, 17 * u);
      p.arc(ox - 4 * u, F[1] + 3 * u, 6 * u, 3 * u, 200, 290, 1.8 * u, "#b08060");
    }
  };
  leg(0); leg(1);
  // ---- arms ----
  const arm = (side: 0 | 1) => {
    p.rot = bodyR;
    const { S, E, hand } = armIK(pose, side, tw);
    const pts = [...thru(S, lerp2(S, E, 0.5), E, 6), ...thru(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    if (!os) {
      limb(p, pts, PJ, 12 * u, 4 * u);
      const m = lerp2(S, E, 0.5); p.dot(m[0], m[1], 2.6 * u, FROG);
      limb(p, [lerp2(E, hand, 0.74), lerp2(E, hand, 0.86)], PJ_TRIM, 13 * u, 1.6 * u);
    } else { // red flannel, sleeves rolled to the elbow, tanned forearms
      limb(p, thru(E, lerp2(E, hand, 0.5), hand, 6), skin, 10 * u, 4 * u);
      limb(p, thru(S, lerp2(S, E, 0.5), E, 6), OS_SHIRT, 13 * u, 4 * u);
      p.stroke([lerp2(S, E, 0.35), lerp2(S, E, 0.37)], 13 * u, mul(OS_SHIRT, [0.7, 0.6, 0.6]));
      limb(p, [lerp2(S, E, 0.86), E], mix(OS_SHIRT, WHITE, 0.15), 15 * u, 1.6 * u);
    }
    p.rot = null;
    const Hw = B(hand), Ew = B(E), ang = pose.ha?.[side] ?? Math.atan2(Hw[1] - Ew[1], Hw[0] - Ew[0]);
    const hold = pose.hold?.[side];
    if (hold === "can" && canInCard) drawCan(p, J.canC, pose.can ?? -Math.PI / 2, light);
    if (hold === "book") drawHold(p, "book", Hw, side, pose, flutter);
    drawHand(p, pose.hk?.[side] ?? "rest", Hw, ang, skin, side);
    if (hold === "pencil") drawHold(p, "pencil", Hw, side, pose, flutter);
  };
  const front = pose.front ?? [false, false];
  if (!front[0]) arm(0);
  if (!front[1]) arm(1);
  p.rot = bodyR;
  // ---- torso (the jolt heaves the chest) ----
  const jo = pose.jolt ?? 0;
  const T: Blob = { a: tw * (1 + 0.04 * jo), b: ((L.tbot - L.top) / 2) * (1 - 0.02 * jo), nTop: 2.4, nBot: 3.6, egg: 0.17, asym: 0, rot: 0, noise: 0.005, seed: os ? 61 : 23 };
  const tp = blobPts(300, (L.top + L.tbot) / 2, T);
  if (!os) {
    p.gradFill(tp, PJ, mul(PJ, SH_CLOTH), light, 0.24, 0.3);
    p.clip(tp, () => {
      for (let i = 0; i < 20; i++) { // the frog print: little lime frog faces
        const row = Math.floor(i / 4), x = 206 + (i % 4) * 58 + (row % 2) * 29, y = 446 + row * 44;
        if (Math.abs(x - 300) < 18) continue;
        p.ell(x, y, 6.5 * u, 4.6 * u, FROG, 1.2 * u);
        for (const h of [-1, 1]) { p.ell(x + h * 3.6 * u, y - 4 * u, 2.4 * u, 2.4 * u, FROG, 1 * u); p.dot(x + h * 3.6 * u, y - 4 * u, 0.9 * u); }
        p.arc(x, y + 0.5 * u, 3 * u, 1.6 * u, 20, 160, 0.9 * u);
      }
      p.poly([[294, L.top], [306, L.top], [306, 640], [294, 640]], PJ2, 0); // placket
      for (const y of [480, 524, 568]) p.ell(306, y, 3.6 * u, 3.6 * u, WHITE, 1.2 * u);
      p.poly([[150, 606], [450, 606], [450, 640], [150, 640]], PJ_TRIM, 1.6 * u); // hem band
    });
    p.inkRing(tp, ow, thick);
    for (const s of [-1, 1]) { // a fat piped collar
      const c: P2[] = [[300 + s * 4, L.top - 4], [300 + s * 48, L.top - 6], [300 + s * 38, L.top + 30], [300 + s * 8, 462]];
      p.poly(c, PJ, 0); p.stroke([...c, c[0]], 5 * u, PJ_TRIM); p.poly(c, null, 1.6 * u);
    }
  } else {
    p.gradFill(tp, OS_SHIRT, mul(OS_SHIRT, SH_CLOTH), light, 0.24, 0.3);
    p.clip(tp, () => {
      for (let x = 160; x < 450; x += 30) p.stroke([[x, 400], [x, 650]], 5 * u, mul(OS_SHIRT, [0.72, 0.62, 0.62]));
      for (let y = 420; y < 650; y += 30) p.stroke([[150, y], [450, y]], 5 * u, mul(OS_SHIRT, [0.78, 0.66, 0.66]));
      for (let x = 160; x < 450; x += 30) p.stroke([[x + 15, 400], [x + 15, 650]], 1.2 * u, "#f0d0a0");
      const bib: P2[] = [[236, 492], [364, 492], [372, 640], [228, 640]]; // the overall bib + waist
      p.gradFill(bib, DENIM, mul(DENIM, SH_CLOTH), light, 0.3); p.poly(bib, null, 2.2 * u);
      p.poly([[150, 584], [450, 584], [450, 650], [150, 650]], DENIM, 0); p.stroke([[150, 584], [228, 584]], 2.2 * u); p.stroke([[372, 584], [450, 584]], 2.2 * u);
      p.poly(rrect(262, 512, 338, 556, 4), mul(DENIM, [0.9, 0.92, 1]), 1.8 * u); // bib pocket
      p.stroke([[318, 512], [322, 494]], 3.2 * u, "#f2c43a"); p.dot(322, 492, 1.6 * u, INK); // a pencil stub
      for (const y of [520, 600]) p.stroke([[240, y], [360, y]], 1 * u, "#f0d890");
      faded(p, sm((age - 0.3) / 0.4), () => { p.poly(rrect(244, 594, 284, 630, 3), "#c8a070", 1.4 * u); for (let i = 0; i < 4; i++) p.stroke([[248 + i * 10, 596], [248 + i * 10, 600]], 1 * u); }); // a patch with the years
    });
    p.inkRing(tp, ow, thick);
    for (const s of [-1, 1]) { // straps + brass buttons
      limb(p, [[300 + s * 70, L.top + 6], [300 + s * 58, 494]], DENIM, 9 * u, 1.6 * u);
      p.ell(300 + s * 58, 496, 5 * u, 5 * u, "#e8c45a", 1.6 * u); p.dot(300 + s * 58, 496, 1.2 * u, "#8a6a2a");
    }
    for (const s of [-1, 1]) p.poly([[300 + s * 4, L.top - 2], [300 + s * 40, L.top - 6], [300 + s * 28, L.top + 22]], "#f2e6cc", 2 * u); // collar points
  }
  p.rot = null;
  const Nb = B([300, L.top + 8]), Nt = xfOf(headRot(pose, face))([300, L.chin - 16]);
  if (Nt[1] < Nb[1] - 2) limb(p, [Nb, Nt], mul(skin, [0.9, 0.82, 0.82]), 44, 3 * u);
  if (front[0]) arm(0);
  // ---- head ----
  const g = p.g, meme = face.e === "meme";
  p.rot = headRot(pose, face);
  const cx = 300, hc = L.hc, A = headAOf(who), uu = U * (A / HEAD_A);
  const H0 = headBlob(os ? 67 : 29, A, 0);
  const H: Blob = { ...H0, b: os ? A * (1.02 + 0.04 * age) : H0.b, rot: H0.rot * 0.4, egg: os ? -0.04 + 0.05 * age : H0.egg };
  if (meme) { H.a *= 1.08; H.nBot = 2.9; }
  const hp = blobPts(cx, hc, H);
  const bounce = Math.max(jo, meme ? 1 : 0);
  if (!os) beanHairBack(p, cx, hc, H, u, bounce);
  else {
    const er = (12 + 3 * age) * uu; // ears (bigger with age)
    for (const s of [-1, 1]) { p.ell(cx + s * 0.98 * H.a, hc + 4 * uu, er * 0.75, er, skin, 3 * uu); p.arc(cx + s * 0.98 * H.a, hc + 4 * uu, er * 0.4, er * 0.55, s > 0 ? -60 : 120, s > 0 ? 60 : 240, 1.4 * uu); }
    if (meme) for (let i = 0; i < 9; i++) { const a = 205 + i * 16.25; lock(p, hairCol, cx, hc, H, a, (22 + 10 * rnd(5, i)) * uu, rad(a) * 0.5 - Math.PI / 4, (i % 2 ? 1 : -1) * 3 * uu, uu, 0.12); } // white hair standing on end
  }
  p.inkRing(hp, ow, thick);
  p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), skin, mul(skin, SH_SKIN), light, H.a);
  const red = FACES[face.e].red ?? 0;
  if (red > 0.02) p.clip(hp, () => { const [ax, ay] = p.P(cx, hc + H.b), [bx, by] = p.P(cx, hc - H.b), gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, rgba("#ff3a50", 0.55 * red)); gr.addColorStop(0.55, rgba("#ff5a5a", 0.3 * red)); gr.addColorStop(1, rgba("#ff5a5a", 0)); g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000); });
  if (!os) beanHairFront(p, hp, cx, hc, H, u, light, thick, bounce);
  else for (const s of [-1, 1]) p.poly([[cx + s * 0.97 * H.a, hc - 0.42 * H.b], [cx + s * 1.03 * H.a, hc - 0.05 * H.b], [cx + s * 0.9 * H.a, hc + 0.3 * H.b], [cx + s * 0.82 * H.a, hc - 0.1 * H.b]], hairCol, 2.6 * uu); // sideburns
  drawFace(p, who, cx, hc, H, face, lid, light, skin, hairCol, uu);
  if (os) strawHat(p, cx, hc, H, uu, light, thick, age, pose.hatUp ?? 0, meme ? -0.14 : 0, meme ? 0.6 : 1); // the meme: hat popped + tipped back
  p.rot = null;
  if (front[1]) arm(1);
  p.ol = olSave;
};

// ======================================================================================================================
// THE TADPOLE: a side-profile swimmer, head toward +x (screen right), face turned 3/4 to the camera. Laid out on
// holo.ts TADPOLE_LAYOUT at card scale 1 (1 m = 463 units): the layout origin (card centre) is canvas TAD.o = (300, 500);
// head centre (356, 500) r ~120, eye (411, 454), MOUTH (467, 518), throat (393, 523), gill slits (300..330, ~486),
// lungs (346, 593), tail toward -x (tip ~x 78).
// ======================================================================================================================
export type TadFace = "happy" | "hello" | "open" | "puff" | "snap" | "proud" | "wink";
export type TadState = {
  /** tail swim phase (rad) + amplitude 0..1 */
  ph: number; amp: number;
  /** cheeks puffed 0..1, throat snapped 0..1, gill flutter 0..1 (+ phase), morph 0..0.5 (tadpole -> BEAN) */
  puff: number; snap: number; gill: number; gph: number; morph: number;
  face: TadFace; look: P2; lid: number;
};
const M2U = 1 / 0.00216;
export const TAD = { o: [300, 500] as P2, head: [356, 500] as P2, eye: [411, 454] as P2, mouth: [467, 518] as P2, throat: [393, 523] as P2, gills: [314, 486] as P2, lungs: [346, 593] as P2, a: 128, b: 112, m2u: M2U };
const TAD_BACK = "#8a5634", TAD_BACK2 = "#c88a50", TAD_BELLY = "#ffe2b8", TAD_FIN = "#f3c98e", GILL = "#ff7f9a";
export const drawTadpole = (p: Pen, s: TadState, light: number) => {
  const u = U, thick = thickAngle(light), ow = 5 * u, olSave = p.ol;
  p.ol = 4 * u;
  const m2 = cl01(s.morph * 2), [hx, hy] = TAD.head, f = s.face;
  const pf = cl01(s.puff), A = TAD.a * (1 + 0.05 * pf), Bh = TAD.b * (1 + 0.08 * pf);
  // ---- tail: a finned membrane (dorsal + ventral) round a muscular core, undulating; shrinks with the morph ----
  const tl = 1 - 0.85 * m2, n = 18, cl: P2[] = [];
  for (let i = 0; i <= n; i++) { const g = i / n; cl.push([hx - 0.75 * A - g * 200 * tl, hy + 6 + s.amp * 46 * Math.pow(g, 1.4) * Math.sin(s.ph - g * 4.2)]); }
  const side = (w: (g: number) => number, sgn: number) => cl.map((P, i) => {
    const a = cl[Math.max(0, i - 1)], b = cl[Math.min(n, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [P[0] + (-dy / l) * w(i / n) * sgn, P[1] + (dx / l) * w(i / n) * sgn] as P2;
  });
  const fin = (g: number) => ((1 - Math.pow(g, 2.4)) * 74 * (0.45 + 0.55 * Math.sin(Math.PI * Math.min(1, g * 1.5 + 0.25))) + 5) * (0.4 + 0.6 * tl);
  const core = (g: number) => (46 * Math.pow(1 - g, 1.15) + 4) * (0.5 + 0.5 * tl);
  if (tl > 0.1) {
    const finPts = [...side(fin, 1), ...side(fin, -1).reverse()];
    p.inkRing(finPts, 4.2 * u, thick, 0.4);
    p.gradFill(finPts, TAD_FIN, mul(TAD_FIN, [0.82, 0.76, 0.72]), light, 0.3);
    const r1 = side((g) => fin(g) * 0.92, 1), r2 = side((g) => fin(g) * 0.92, -1);
    p.clip(finPts, () => { for (let i = 2; i < n; i += 2) p.stroke([r1[i], cl[i], r2[i]], 1.3 * u, mul(TAD_FIN, [0.84, 0.74, 0.64])); });
    const corePts = [...side(core, 1), ...side(core, -1).reverse()];
    p.gradFill(corePts, TAD_BACK2, TAD_BACK, light, 0.25); p.poly(corePts, null, 3 * u);
    p.clip(corePts, () => p.stroke(cl.map(([x, y]) => [x, y + 10] as P2), 6 * u, mul(TAD_BACK2, [1.1, 1.05, 1]))); // a lighter belly stripe
  }
  // ---- feathery external gills: three tufts sweeping up-back from behind the head (melt away in the morph) ----
  const gl = (0.8 + 0.3 * cl01(s.gill)) * (1 - m2);
  if (gl > 0.05) for (let j = 0; j < 3; j++) {
    const base: P2 = [hx - 0.52 * A + j * 10, hy - 0.62 * Bh + j * 16], wv = Math.sin(s.gph * 2 + j * 1.3) * (0.1 + 0.22 * s.gill);
    const dir = rad(-128 - j * 16) + wv, len = (34 - j * 5) * u * gl;
    const tip: P2 = [base[0] + Math.cos(dir) * len, base[1] + Math.sin(dir) * len];
    limb(p, thru(base, lerp2(base, tip, 0.5), tip, 8), GILL, 6 * u, 2 * u);
    for (let q2 = 1; q2 < 4; q2++) { const P = lerp2(base, tip, q2 / 4 + 0.06); for (const o of [-1, 1]) limb(p, [P, [P[0] + Math.cos(dir + o * 0.85) * 8 * u * gl, P[1] + Math.sin(dir + o * 0.85) * 8 * u * gl]], GILL, 3.2 * u, 1.2 * u); }
  }
  // ---- morph: little BEAN legs (frog slippers) under the belly + an arm ----
  if (m2 > 0.02) for (const sd of [-1, 1]) {
    const H0: P2 = [hx - 20 + sd * 34, hy + 0.8 * Bh], F: P2 = [H0[0] + sd * 8, H0[1] + 170 * m2];
    limb(p, thru(H0, [H0[0] + sd * 10, (H0[1] + F[1]) / 2], F, 8), PJ, 13 * u * Math.min(1, m2 * 1.5), 4 * u);
    const r = 15 * u * m2;
    p.ell(F[0] + 4 * u, F[1] + 6 * u, r, r * 0.66, FROG, 3 * u);
    for (const h of [-1, 1]) p.ell(F[0] + 4 * u + h * r * 0.42, F[1] - r * 0.1, r * 0.3, r * 0.3, WHITE, 1.4 * u);
    if (sd > 0) { const S: P2 = [hx + 10, hy + 0.55 * Bh], Hd: P2 = [hx + 10 + 50 * m2, hy + 0.55 * Bh + 50 * m2]; limb(p, [S, Hd], PJ, 11 * u * Math.min(1, m2 * 1.5), 4 * u); p.ell(Hd[0], Hd[1], 9 * u * m2, 8.5 * u * m2, "#ffdcbc", 2 * u); }
  }
  // ---- head-body: a big soft bean (egg toward the snout); puffed cheeks swell the lower front ----
  const H: Blob = { a: A, b: Bh, nTop: 2.15, nBot: 2.3 + 0.3 * pf, egg: 0.04, asym: 0.06 + 0.04 * pf, rot: -0.05, noise: 0.004, seed: 77 };
  const hp = blobPts(hx, hy, H);
  if (m2 > 0.02) beanHairBack(p, hx + 10, hy, H, u, 0, m2);
  p.inkRing(hp, ow, thick);
  const back = mix(TAD_BACK, "#e8b898", m2), back2 = mix(TAD_BACK2, "#ffdcbc", m2), belly = mix(TAD_BELLY, "#ffe6cc", m2);
  p.shadedFill(hp, back2, back, light, A, 0.35);
  p.clip(hp, () => {
    p.poly(ellPts(hx + 18, hy + 0.66 * Bh, A * 0.86, Bh * 0.6, 40), belly, 0); // cream belly + throat
    faded(p, 1 - m2, () => { for (let i = 0; i < 14; i++) { const a = rad(195 + rnd(3, i) * 120), r = 0.45 + 0.45 * rnd(4, i); p.dot(hx - 20 + Math.cos(a) * A * r, hy + Math.sin(a) * Bh * r, (2 + 2 * rnd(5, i)) * u, "#f2c070"); } });
    p.arc(hx - 0.2 * A, hy - 0.58 * Bh, 0.34 * A, 0.15 * Bh, 200, 300, 5 * u, "rgba(255,240,220,0.55)");
  });
  if (m2 > 0.02) {
    faded(p, m2, () => { for (let i = 0; i < 3; i++) p.dot(TAD.eye[0] - 10 + i * 9, hy + 0.12 * Bh + (i % 2) * 6, 1.8 * u, "#b05a3a"); });
    beanHairFront(p, hp, hx + 10, hy, H, u * Math.max(0.3, m2), light, thick, 0);
  }
  // gill slits behind the head (open with the flow)
  faded(p, 1 - m2, () => {
    for (let j = 0; j < 3; j++) {
      const x = TAD.gills[0] - 12 + j * 12, y = TAD.gills[1] - 4 + j * 6, o = cl01(s.gill) * 3 * u;
      if (o > 0.4 * u) p.poly(ellPts(x + 2, y, 2.4 * u + o * 0.3, 7 * u + o, 24, 0.25), "#c84a60", 0);
      p.arc(x, y, 4 * u, 10 * u, -70, 70, 2.4 * u);
    }
  });
  if (pf > 0.03) p.arc(hx + 0.42 * A, hy + 0.42 * Bh, 0.34 * A * (0.7 + 0.3 * pf), 0.3 * Bh * (0.7 + 0.3 * pf), -60, 110, 2.4 * u); // the puffed cheek
  glow(p, hx + 0.36 * A, hy + 0.3 * Bh, 0.24 * A, "#ff6a8a", 0.4 + 0.35 * pf);
  // ---- face (3/4 to camera): a big near eye + a smaller far eye at the snout, mouth at the front ----
  const eyes: [P2, number, number][] = [[[TAD.eye[0] + 50, TAD.eye[1] - 6], 0.72, 1], [TAD.eye, 1, 0]];
  for (const [E, k, far] of eyes) {
    const er = 19 * u * k, shut = s.lid >= 1 || f === "puff" || (f === "wink" && !far);
    if (shut) { p.arc(E[0], E[1] + 2 * u, er * 0.8, er * 0.6, 200, 340, 4.4 * u); continue; }
    const kk = f === "snap" ? 0.82 : 1;
    p.ell(E[0], E[1], er * 1.02, er * 1.12 * kk, WHITE, 3.4 * u);
    const lx = E[0] + s.look[0] * er * 0.22 + 2 * u, ly = E[1] + s.look[1] * er * 0.2 + (f === "snap" ? 2 * u : 0);
    p.ell(lx, ly + 2 * u, er * 0.66, er * 0.78 * kk, "#2a1830", 0);
    p.ell(lx, ly + 4 * u, er * 0.42, er * 0.48 * kk, "#5a3a6a", 0);
    p.dot(lx - er * 0.24, ly - er * 0.22, er * 0.26, WHITE); p.dot(lx + er * 0.24, ly + er * 0.3, er * 0.12, WHITE);
    if (f === "snap") tapered(p, [E[0] - 14 * u * k, E[1] - er * 1.3], [E[0] + 12 * u * k, E[1] - er * 1.05], 6 * u * k, 3.4 * u * k);
  }
  const [mx, my] = TAD.mouth;
  if (f === "open") { const pts = ellPts(mx - 6, my + 2, 10 * u, 13 * u, 30); p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx - 6, my + 14 * u, 8 * u, 5 * u, TONGUE, 0)); p.poly(pts, null, 3.2 * u); }
  else if (f === "puff") p.ell(mx - 2, my, 4.6 * u, 4 * u, "#ff8fa0", 2.6 * u);
  else if (f === "snap") { p.stroke([[mx - 22, my - 2], [mx + 2, my - 4]], 4.2 * u); p.arc(mx + 5, my - 4, 2.4 * u, 3.4 * u, -70, 70, 1.8 * u); }
  else if (f === "hello") { const pts = [...thru([mx - 34, my - 6], [mx - 14, my - 2], [mx + 4, my - 8], 10), ...thru([mx + 4, my - 8], [mx - 16, my + 30], [mx - 34, my - 6], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx - 16, my + 22, 8 * u, 5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); }
  else p.stroke(thru([mx - 36, my - 6], [mx - 16, my + 10], [mx + 4, my - 6], 10), 4 * u); // happy / proud / wink: a smile
  if (s.snap > 0.02 && m2 < 0.5) { // the throat door: a squeeze band across the throat
    const [tx, ty] = TAD.throat;
    p.stroke(thru([tx - 6, ty - 26], [tx + 6 * s.snap, ty + 20], [tx - 10, ty + 66], 10), 2.6 * u * s.snap + 0.5, mul(TAD_BELLY, [0.72, 0.6, 0.55]));
  }
  p.ol = olSave;
};
// ======================================================================================================================
// THE HOG (side view, facing screen-left; trotters on y ~965; ~0.9 m long at scale 1)
// ======================================================================================================================
export type HogState = { mood: "content" | "startled" | "bored" | "shocked"; lie: number; age: number; lid: number };
const HOG = "#ffaec0", HOG_DK = "#e8849c";
export const drawHog = (p: Pen, s: HogState, light: number) => {
  const u = U, thick = thickAngle(light), olSave = p.ol;
  p.ol = 4 * u;
  const lie = cl01(s.lie), by = 815 + 95 * lie, bx = 330, startle = s.mood === "startled" || s.mood === "shocked";
  const legL = 120 * (1 - lie) + 12;
  for (const [x, far] of [[236, 1], [404, 1], [256, 0], [424, 0]] as [number, number][]) { // legs (fold as it lies down)
    const top: P2 = [x, by + 50], bot: P2 = [x + (startle ? (x < 330 ? -14 : 14) : 0), Math.min(962, by + 50 + legL)];
    limb(p, [top, bot], far ? HOG_DK : HOG, 30, 4 * u);
    p.poly(rrect(bot[0] - 15, bot[1] - 8, bot[0] + 15, bot[1] + 5, 4), "#5a3a3a", 2.4 * u); // trotters
  }
  const tx = bx + 192, ty = by - 40; // curly tail
  limb(p, [...thru([tx - 10, ty + 10], [tx + 20, ty - 4], [tx + 30, ty + 20], 8), ...thru([tx + 30, ty + 20], [tx + 16, ty + 30], [tx + 18, ty + 12], 6).slice(1)], HOG, 5 * u, 2 * u);
  const body = blobPts(bx, by, { a: 200, b: 112 - 8 * lie, nTop: 2.3, nBot: 2.5, egg: 0, asym: 0, rot: 0.03, noise: 0.004, seed: 9 });
  p.inkRing(body, 5 * u, thick); p.shadedFill(body, HOG, HOG_DK, light, 200, 0.35);
  p.clip(body, () => { p.dot(bx + 60, by - 30, 34, mix(HOG, "#d8708a", 0.3)); p.arc(bx - 40, by - 70, 80, 30, 200, 300, 5 * u, "rgba(255,255,255,0.5)"); });
  const hx = bx - 190, hy = by - 40 - (startle ? 14 : 0) + 10 * lie; // head (facing left)
  const head = blobPts(hx, hy, { a: 88, b: 80, nTop: 2.2, nBot: 2.4, egg: 0, asym: 0, rot: 0, noise: 0.004, seed: 4 });
  for (const [ex, k] of [[hx + 40, 1], [hx - 10, 0]] as [number, number][]) { // ears: perked when startled, floppy when bored
    const up = startle ? 1 : 0, tip: P2 = [ex - 30 + up * 10, hy - 80 - up * 46 + (s.mood === "bored" ? 40 : 0)];
    const ear: P2[] = [[ex - 24, hy - 55], tip, [ex + 26, hy - 62]];
    p.poly(ear, k ? HOG_DK : HOG, 3.6 * u); p.poly(shrink(ear, 0.55), "#ff8aa6", 0);
  }
  p.inkRing(head, 5 * u, thick); p.shadedFill(head, HOG, HOG_DK, light, 88, 0.35);
  p.ell(hx - 80, hy + 16, 26, 32, "#ff9ab2", 3.4 * u); // snout
  for (const o of [-1, 1]) p.ell(hx - 82, hy + 16 + o * 11, 4.6, 7, "#8a3a4a", 0);
  const ex2 = hx - 30, ey2 = hy - 18;
  if (s.mood === "bored" || s.lid >= 1) { p.arc(ex2, ey2 + 4, 14, 8, 20, 160, 4 * u); p.ell(ex2, ey2 + 6, 10, 6, INK, 0, 0, 180); }
  else if (startle) { p.ell(ex2, ey2, 20, 23, WHITE, 3 * u); p.dot(ex2 - 4, ey2, 6); }
  else { p.ell(ex2, ey2, 9, 12, INK, 0); p.dot(ex2 - 3, ey2 - 5, 3.4, WHITE); }
  faded(p, s.age, () => { tapered(p, [ex2 - 18, ey2 - 30], [ex2 + 18, ey2 - 26], 14, 8, "#f4f2ec"); tapered(p, [hx - 98, hy + 52], [hx - 70, hy + 62], 10, 4, "#f4f2ec"); }); // grey brows + chin whiskers
  if (!startle) tapered(p, [ex2 - 16, ey2 - 24], [ex2 + 14, ey2 - 22 + (s.mood === "bored" ? 4 : -4)], 7, 4);
  glow(p, hx - 34, hy + 30, 34, "#ff5a7a", 0.5);
  if (s.mood === "shocked") p.ell(hx - 50, hy + 50, 9, 11, MOUTH, 2.6 * u);
  else p.arc(hx - 48, hy + 40, 16, 10, 30, 150, 3.4 * u);
  p.ol = olSave;
};

// ======================================================================================================================
// EFFECT CARDS
// ======================================================================================================================
/** "HIC!" (800 x 560): a fizzy bubble-cloud burst (callback to the drink) with bold lettering + escaping bubbles */
export const fxHic = (p: Pen, word: string, col: string, seed: number) => {
  const cx = 400, cy = 270, bumps = 11, ring: P2[] = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2, a1 = ((i + 1) / bumps) * Math.PI * 2, r0 = 0.86 + 0.08 * rnd(seed, i), r1 = 0.86 + 0.08 * rnd(seed, (i + 1) % bumps);
    const P0: P2 = [cx + Math.cos(a0) * 330 * r0, cy + Math.sin(a0) * 200 * r0], P1: P2 = [cx + Math.cos(a1) * 330 * r1, cy + Math.sin(a1) * 200 * r1];
    const am = (a0 + a1) / 2, C: P2 = [cx + Math.cos(am) * 330 * 1.12, cy + Math.sin(am) * 200 * 1.16];
    ring.push(...qbez(P0, C, P1, 6).slice(0, -1));
  }
  p.poly(ring, col, 20);
  p.poly(shrink(ring, 0.76), mix(col, WHITE, 0.4), 0);
  p.arc(290, 160, 150, 70, 200, 250, 16, "rgba(255,255,255,0.85)");
  for (const [x, y, r] of [[706, 86, 32], [762, 34, 18], [96, 476, 26], [48, 430, 14], [736, 478, 18]]) { p.ell(x, y, r, r, mix(col, WHITE, 0.55), 8); p.arc(x - r * 0.3, y - r * 0.3, r * 0.45, r * 0.4, 200, 280, 5, WHITE); }
  letter(p, word, cx, cy + 12, word.length > 4 ? 150 : 176, WHITE, 34, 0, 560);
};
/** jolt marks (256 x 256): three nested arcs ")))" opening to the right */
export const fxJolt = (p: Pen) => { for (let i = 0; i < 3; i++) { const r = 60 + i * 34; p.arc(30, 128, r, r * 1.2, -30 + i * 3, 30 - i * 3, 20, INK); p.arc(30, 128, r, r * 1.2, -28 + i * 3, 28 - i * 3, 9, WHITE); } };
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#a6dcff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, TEAR_HI);
};
/** "!" or "?" pop (300 x 400) */
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
/** four-point twinkle (256 x 256) */
export const fxSparkle = (p: Pen, col: string) => {
  const pts: P2[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 24 : 112; pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); }
  const smp: P2[] = [];
  for (let i = 0; i < pts.length; i++) smp.push(...qbez(pts[i], lerp2(lerp2(pts[i], pts[(i + 1) % 8], 0.5), [128, 128], 0.35), pts[(i + 1) % 8], 5).slice(0, -1));
  p.poly(smp, col, 9);
  p.dot(128, 128, 18, WHITE);
};
/** an underwater bubble (128 x 128): a clear ring with a highlight */
export const fxBubble = (p: Pen) => {
  p.ell(64, 64, 52, 52, "#d8fbff", 8);
  p.ell(64, 64, 40, 40, "#bff2f6", 0);
  p.arc(64, 64, 34, 34, 200, 260, 9, WHITE); p.dot(84, 84, 6, WHITE);
};
/** swim swish (256 x 128): two curved water lines */
export const fxSwish = (p: Pen) => { for (let i = 0; i < 2; i++) { const y = 44 + i * 40, c = thru([20, y], [128, y - 18], [236, y], 10); p.stroke(c, 18, INK); p.stroke(c, 8, "#e8fffb"); } };
/** speed streak (512 x 96) */
export const fxStreak = (p: Pen) => p.poly([[20, 48], [380, 30], [492, 48], [380, 66]], WHITE, 10);
/** the peak's ray-burst halo (512 x 512) */
export const fxRays = (p: Pen) => {
  const n = 20, pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 118 : 240 - (i % 4 === 0 ? 0 : 30); pts.push([256 + Math.cos(a) * r, 256 + Math.sin(a) * r]); }
  p.poly(pts, "#ffd25a", 6);
  p.poly(shrink(pts, 0.72), "#fff4c4", 0);
};
/** a small "hic" word for the time-lapse mini hics (384 x 192) */
export const fxMini = (p: Pen, col: string) => letter(p, "hic", 192, 100, 120, col, 22, 8, 360);
