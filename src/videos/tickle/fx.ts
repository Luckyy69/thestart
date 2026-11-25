// OWNER: cast agent. Drawings for "Why You Can't Tickle Yourself": brand-new bean-head figures in our Pen style
// (thick-thin plum ink, painted crescents) and every effect card (tickle squiggles, limp "nothing" squiggles, HAHA
// bursts, tears of laughter, sweat, "?" / "!" pops, sparkles, motion lines, "hee hee").
// Design space 600 x 1000 units per card (bridge: 1000 units = 2.16 m). The card origin (canvas 300, 975) is the point
// between the feet ON the ground. Standing head centre canvas y 300 (1.458 m). Seated figures drop the whole upper body
// by pose.drop units and draw explicit knees (front view: thighs foreshortened toward the camera).
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, Blob } from "../bridge/toon";

export type P2 = [number, number];
const WHITE = "#ffffff", MOUTH = "#4a1020", THROAT = "#2a0510", TONGUE = "#ff6f86", TEAR = "#79d2ff", TEAR_HI = "#eaf9ff";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.37 + k * 47.77) * 24634.6345; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** quadratic bezier with control c */
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
/** points rotated by a about c */
const rotPts = (pts: P2[], a: number, c: P2): P2[] => pts.map(([x, y]) => { const dx = x - c[0], dy = y - c[1]; return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)]; });
/** inked limb: ink stroke then colour stroke (round caps) */
const limb = (p: Pen, pts: P2[], col: string, w: number, ink: number) => { p.stroke(pts, w + 2 * ink, INK); p.stroke(pts, w, col); };
const tapered = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
const clipAll = (p: Pen, parts: P2[][], fn: () => void) => {
  const g = p.g; g.save(); g.beginPath();
  for (const pts of parts) { pts.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
  g.clip("nonzero"); fn(); g.restore();
};
const SH_SKIN: [number, number, number] = [0.95, 0.84, 0.84], SH_CLOTH: [number, number, number] = [0.62, 0.66, 0.78], SH_HAIR: [number, number, number] = [0.6, 0.6, 0.72];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo outside the ink) */
const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};

// ---------------- characters ----------------
export type Kit = {
  seed: number; skin: string; hair: string; hairStyle: "nest" | "bob" | "curls";
  top: "hoodie" | "cardigan" | "jumper"; topCol: string; topCol2: string; trim: string;
  legs: string; legs2: string; tartan?: boolean; shoes: "monster" | "brogue"; shoeCol: string;
  coat?: boolean; glasses?: string; beard?: string; freckles?: boolean; earPen?: boolean; badge?: boolean;
};
export type HandK = "rest" | "wiggle" | "grip" | "palm" | "open" | "point" | "pinch";
export type Hold = "clipboard" | "pencil" | "mug";
export type Pose = {
  /** ankle points (canvas, absolute) [screen-left, screen-right] */
  feet: [P2, P2];
  /** explicit knees (seated / kicking, canvas absolute); absent = standing 2-bone IK */
  knees?: [P2, P2];
  /** hand targets (canvas, absolute); hk hand shapes; ha hand angle override (rad, canvas); front = over the torso */
  hands: [P2, P2]; hk?: [HandK, HandK]; ha?: [number | null, number | null]; front?: [boolean, boolean];
  hold?: [Hold | null, Hold | null];
  /** upper body drop (seated, canvas units), lean about the hips (rad), extra head tilt (deg), shoulder shrug (units) */
  drop?: number; lean?: number; headTilt?: number; shrug?: number;
  /** sideways body shake (units), finger wiggle phase, palm finger twitch 0..1 */
  shake?: number; wig?: number; twitch?: number;
};
export type Face = "stone" | "stone2" | "shrug" | "nope" | "smart" | "watch" | "calm" | "deadpan" | "bored" | "curious" | "focus" | "wow"
  | "uhoh" | "meme" | "pant" | "content" | "peek" | "giggle" | "sly" | "tada" | "notes" | "amazed" | "smile" | "grin";
export type FaceS = { e: Face; k?: number; look?: P2; shake?: number };

export const HEAD_A = 118;
export const U = (2 * HEAD_A) / 100;
export const LAYOUT = { hc: 300, chin: 404, top: 408, tbot: 622, hipY: 600, sh: [[222, 452], [378, 452]] as [P2, P2] };
/** mouth centre below the head centre, in head units U */
export const MOUTH_DY = 21;
const EX = 15, EY = -2;
const ARM1 = 100, ARM2 = 94, THIGH = 178, SHIN = 176;
const L = LAYOUT;

type EyeK = "dot" | "up" | "wide" | "tiny" | "lid" | "heavy" | "happy" | "laugh" | "closed";
type MouthK = "flat" | "meh" | "smirk" | "smile" | "grin" | "tada" | "o" | "bigO" | "wobble" | "tongue" | "pant" | "mega" | "giggle" | "dash";
type FaceDef = { eye: EyeK; brow: [number, number]; brow2?: [number, number]; mouth: MouthK; look?: P2; red?: number; blush?: number; tilt?: number; crinkle?: boolean; streams?: number; sweat?: boolean; flash?: boolean };
const FACES: Record<Face, FaceDef> = {
  stone: { eye: "lid", brow: [2, 2], mouth: "flat" },
  stone2: { eye: "lid", brow: [2, 2], brow2: [-6, -9], mouth: "flat" },
  shrug: { eye: "dot", brow: [-8, -6], mouth: "meh", tilt: 6 },
  nope: { eye: "lid", brow: [3, 0], brow2: [-6, -9], mouth: "smirk", tilt: -4 },
  smart: { eye: "up", brow: [-7, -8], mouth: "smile", look: [0.7, -1], tilt: -3 },
  watch: { eye: "up", brow: [-6, -5], mouth: "o", look: [0, -1] },
  calm: { eye: "closed", brow: [-2, 2], mouth: "smile", blush: 0.25 },
  deadpan: { eye: "lid", brow: [0, 0], mouth: "flat" },
  bored: { eye: "heavy", brow: [-1, 4], mouth: "meh", tilt: 5 },
  curious: { eye: "dot", brow: [3, 1], brow2: [-7, -8], mouth: "o", look: [1, 0.2] },
  focus: { eye: "dot", brow: [6, 0], mouth: "tongue", look: [-0.3, 0.7] },
  wow: { eye: "wide", brow: [-9, -8], mouth: "bigO" },
  uhoh: { eye: "tiny", brow: [-8, 3], mouth: "wobble", sweat: true },
  meme: { eye: "laugh", brow: [-10, 4], mouth: "mega", red: 1, crinkle: true, streams: 1, tilt: -7 },
  pant: { eye: "happy", brow: [-6, 2], mouth: "pant", red: 0.5, blush: 1, sweat: true, streams: 0.45, crinkle: true },
  content: { eye: "closed", brow: [-3, 0], mouth: "smile", blush: 0.45 },
  peek: { eye: "dot", brow: [1, 0], brow2: [-7, -8], mouth: "smirk", look: [0.9, 0.8] },
  giggle: { eye: "happy", brow: [-7, -2], mouth: "giggle", blush: 1, tilt: -6, crinkle: true },
  sly: { eye: "lid", brow: [7, -4], mouth: "smirk" },
  tada: { eye: "happy", brow: [-9, -7], mouth: "tada", blush: 0.45 },
  notes: { eye: "dot", brow: [3, 0], mouth: "dash", look: [0.4, 1] },
  amazed: { eye: "wide", brow: [-11, -9], mouth: "bigO", flash: true },
  smile: { eye: "dot", brow: [-2, -1], mouth: "smile" },
  grin: { eye: "happy", brow: [-6, -4], mouth: "grin" },
};

// ---------------- rig geometry (shared by the drawing and the exported contracts) ----------------
type Xf = (P: P2) => P2;
const rotAbout = (P: P2, c: P2, a: number): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
const bodyXf = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => { const r = rotAbout(P, [300, L.hipY], a); return [r[0] + dx, r[1] + dy]; }; };
const bodyInv = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => rotAbout([P[0] - dx, P[1] - dy], [300, L.hipY], -a); };
const headTilt = (pose: Pose, face: FaceS) => rad((FACES[face.e].tilt ?? 0) * Math.min(1, face.k ?? 1) + (pose.headTilt ?? 0));
const headShake = (face: FaceS) => (face.e === "meme" || face.e === "uhoh" ? ((face.shake ?? 0) % 2 ? 1.8 : -1.8) * U * (face.e === "uhoh" ? 0.4 : 1) : 0);
/** head frame for Pen.rot: [angle, pivot x, pivot y, dx, dy] (pivot = the neck) */
const headRot = (pose: Pose, face: FaceS): number[] => {
  const N: P2 = [300, L.chin], Nw = bodyXf(pose)(N);
  return [(pose.lean ?? 0) + headTilt(pose, face), N[0], N[1], Nw[0] - N[0] + headShake(face), Nw[1] - N[1]];
};
const xfOf = (r: number[]): Xf => (P) => { const q = rotAbout(P, [r[1], r[2]], r[0]); return [q[0] + r[3], q[1] + r[4]]; };
const growOf = (face: FaceS) => (face.e === "meme" ? 1 + 0.12 * Math.min(1, face.k ?? 1) : 1);
const shoulder = (pose: Pose, side: 0 | 1): P2 => [L.sh[side][0], L.sh[side][1] - (pose.shrug ?? 0)];
/** 2-bone arm IK in body-local coords: shoulder, elbow, hand */
const armIK = (pose: Pose, side: 0 | 1) => {
  const S = shoulder(pose, side), s = side ? 1 : -1, Hd = bodyInv(pose)(pose.hands[side]);
  const d0 = Math.hypot(Hd[0] - S[0], Hd[1] - S[1]), d = Math.max(36, Math.min(d0, ARM1 + ARM2 - 2));
  const ang = Math.atan2(Hd[1] - S[1], Hd[0] - S[0]), hand: P2 = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
  const dx = hand[0] - S[0], dy = hand[1] - S[1], a = (ARM1 * ARM1 - ARM2 * ARM2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ARM1 * ARM1 - a * a));
  let px = -dy / d, py = dx / d; if (px * s * 0.7 + py < 0) { px = -px; py = -py; } // elbows hang down-and-out
  const E: P2 = [S[0] + (dx / d) * a + px * h, S[1] + (dy / d) * a + py * h];
  return { S, E, hand };
};
const legIK = (pose: Pose, side: 0 | 1) => {
  const s = side ? 1 : -1, Hp = bodyXf(pose)([300 + s * 36, L.hipY - (pose.knees ? 10 : 0)]), F = pose.feet[side];
  if (pose.knees) return { Hp, K: pose.knees[side], F };
  const d0 = Math.hypot(F[0] - Hp[0], F[1] - Hp[1]), d = Math.max(40, Math.min(d0, THIGH + SHIN - 3));
  const ang = Math.atan2(F[1] - Hp[1], F[0] - Hp[0]), Fc: P2 = [Hp[0] + Math.cos(ang) * d, Hp[1] + Math.sin(ang) * d];
  const dx = Fc[0] - Hp[0], dy = Fc[1] - Hp[1], a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d), h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
  let px = -dy / d, py = dx / d; if (px * s < 0) { px = -px; py = -py; }
  return { Hp, K: [Hp[0] + (dx / d) * a + px * h, Hp[1] + (dy / d) * a + py * h] as P2, F: Fc };
};
/** canvas points of a posed figure (the exported world contracts are built from these) */
export const jointsOf = (pose: Pose, face: FaceS) => {
  const B = bodyXf(pose), Hx = xfOf(headRot(pose, face)), g = growOf(face), D = FACES[face.e];
  const ey = L.hc + (D.eye === "laugh" ? -4 : EY) * U * g;
  return {
    head: Hx([300, L.hc]), mouth: Hx([300, L.hc + MOUTH_DY * U * g]), crown: Hx([300, L.hc - 1.05 * HEAD_A * g]),
    eyes: [Hx([300 - EX * U * g, ey]), Hx([300 + EX * U * g, ey])] as [P2, P2],
    temple: [Hx([300 - 0.86 * HEAD_A * g, L.hc - 0.35 * HEAD_A]), Hx([300 + 0.86 * HEAD_A * g, L.hc - 0.35 * HEAD_A])] as [P2, P2],
    hands: [B(armIK(pose, 0).hand), B(armIK(pose, 1).hand)] as [P2, P2],
    feet: [legIK(pose, 0).F, legIK(pose, 1).F] as [P2, P2],
    ribs: [B([300 - 84, 535]), B([300 + 84, 535])] as [P2, P2],
  };
};

// ---------------- hands ----------------
const drawHand = (pose: Pose, p: Pen, kind: HandK, H: P2, ang: number, skin: string, side: 0 | 1) => {
  const u = U, r = 8.6 * u, s = side ? 1 : -1, fw = 3.7 * u, ink = 2.1 * u;
  const fing = (a: number, len: number, from = 0.25, w = fw) => {
    const b: P2 = [H[0] + Math.cos(a) * r * from, H[1] + Math.sin(a) * r * from], tip: P2 = [H[0] + Math.cos(a) * (r + len), H[1] + Math.sin(a) * (r + len)];
    limb(p, [b, tip], skin, w, ink);
  };
  const palm = (rx = r, ry = r * 0.94) => { p.ell(H[0], H[1], rx + ink, ry + ink, INK, 0); p.ell(H[0], H[1], rx, ry, skin, 0); };
  switch (kind) {
    case "wiggle": { // tickle claws: four wiggling fingers + thumb
      const w = pose.wig ?? 0;
      for (let i = 0; i < 4; i++) {
        const a = ang + (-0.66 + i * 0.44) + 0.32 * Math.sin(w * 2.1 + i * 1.7), len = (9 + 3 * Math.sin(w * 1.7 + i * 2.3)) * u;
        fing(a, len);
      }
      fing(ang - s * 1.35, 5 * u);
      palm(); break;
    }
    case "open": { // spread palm (shrug / ta-da)
      for (let i = 0; i < 4; i++) fing(ang + (-0.6 + i * 0.4), (10 - Math.abs(i - 1.5) * 1.6) * u);
      fing(ang - s * 1.4, 6 * u);
      palm(); break;
    }
    case "point": { // index finger out of a fist
      palm(r * 0.95, r * 0.9);
      fing(ang, 12 * u, 0.1, fw * 1.05);
      p.arc(H[0] - Math.cos(ang) * 2 * u, H[1] - Math.sin(ang) * 2 * u, r * 0.5, r * 0.4, 200, 320, 1.4 * u);
      break;
    }
    case "pinch": { // "just a tiny bit": thumb and index with a little gap
      palm(r * 0.95, r * 0.9);
      fing(ang - 0.3, 9 * u, 0.1); fing(ang + 0.55, 8 * u, 0.1);
      break;
    }
    case "grip": { // fist round a handle: knuckle bumps
      palm(r * 1.05, r * 0.95);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      for (let i = 0; i < 3; i++) p.arc(H[0] + Math.cos(ang) * 3 * u + (i - 1) * 4.6 * u * nx, H[1] + Math.sin(ang) * 3 * u + (i - 1) * 4.6 * u * ny, 2.8 * u, 2.4 * u, 0, 360, 1.3 * u);
      break;
    }
    case "palm": { // palm up, open, fingers pointing outward (twitching when tickled)
      const tw = pose.twitch ?? 0, cx = H[0] + s * 3 * u, cy = H[1];
      const cup: P2[] = [...thru([cx - s * 11 * u, cy - 3 * u], [cx, cy + 8 * u], [cx + s * 11 * u, cy - 4 * u], 10), ...thru([cx + s * 11 * u, cy - 4 * u], [cx, cy - 1 * u], [cx - s * 11 * u, cy - 3 * u], 8).slice(1)];
      for (let i = 0; i < 4; i++) {
        const fx = cx + s * (4 + i * 3.2) * u, curl = tw * (i % 2 ? 1 : 0.6);
        limb(p, [[fx, cy - 2 * u], [fx + s * 2 * u, cy - (6 + 4 * curl) * u]], skin, 3.2 * u, 1.8 * u);
      }
      p.poly(cup, skin, 2.6 * u);
      p.arc(cx, cy - 1 * u, 7 * u, 3 * u, 20, 160, 1.2 * u, mul(skin, [0.8, 0.66, 0.66]));
      limb(p, [[cx - s * 9 * u, cy - 2 * u], [cx - s * 11 * u, cy - 9 * u]], skin, 3.4 * u, 1.9 * u);
      break;
    }
    default: palm();
  }
};
const drawHold = (p: Pen, what: Hold, H: P2, side: 0 | 1, light: number) => {
  const u = U, s = side ? 1 : -1;
  if (what === "clipboard") { // tilted board, white sheet with a little graph, silver clip
    const c: P2 = [H[0] - s * 26 * u, H[1] - 12 * u], a = -s * 0.18;
    p.poly(rotPts(rrect(c[0] - 26 * u, c[1] - 34 * u, c[0] + 26 * u, c[1] + 34 * u, 3 * u), a, c), "#b07a46", 2.8 * u);
    p.poly(rotPts(rrect(c[0] - 21 * u, c[1] - 26 * u, c[0] + 21 * u, c[1] + 30 * u, 1.5 * u), a, c), "#fbfaf4", 1.2 * u);
    for (let i = 0; i < 4; i++) p.stroke(rotPts([[c[0] - 16 * u, c[1] - 14 * u + i * 7 * u], [c[0] + (8 - 6 * (i % 2)) * u, c[1] - 14 * u + i * 7 * u]], a, c), 1.3 * u, "#7a8aa8");
    p.stroke(rotPts([[c[0] - 15 * u, c[1] + 24 * u], [c[0] - 6 * u, c[1] + 18 * u], [c[0] + 2 * u, c[1] + 20 * u], [c[0] + 14 * u, c[1] + 8 * u]], a, c), 1.8 * u, "#e0484f");
    p.poly(rotPts(rrect(c[0] - 9 * u, c[1] - 38 * u, c[0] + 9 * u, c[1] - 28 * u, 2 * u), a, c), "#cfd6e2", 1.8 * u);
  } else if (what === "pencil") {
    const a = rad(-118 + s * 8), tip: P2 = [H[0] - Math.cos(a) * 12 * u, H[1] - Math.sin(a) * 12 * u], end: P2 = [H[0] + Math.cos(a) * 20 * u, H[1] + Math.sin(a) * 20 * u];
    limb(p, [tip, end], "#ffc93c", 3.4 * u, 1.3 * u);
    p.dot(end[0], end[1], 2.6 * u, "#ff8fa0");
    p.dot(tip[0], tip[1], 1.4 * u, INK);
  } else { // cosy cocoa mug with a heart
    const c: P2 = [H[0] - s * 13 * u, H[1] - 4 * u], body = rrect(c[0] - 13 * u, c[1] - 14 * u, c[0] + 13 * u, c[1] + 14 * u, 4 * u);
    p.ell(c[0] - s * 14 * u, c[1], 7 * u, 8 * u, null, 3.4 * u);
    p.gradFill(body, "#e8463c", "#a8282a", light, 0.3); p.poly(body, null, 2.6 * u);
    p.ell(c[0], c[1] - 14 * u, 13 * u, 3 * u, "#6a3a22", 1.6 * u);
    const hx = c[0], hy = c[1] + 2 * u;
    p.poly([[hx, hy + 5 * u], [hx - 5 * u, hy], [hx - 4 * u, hy - 3.4 * u], [hx, hy - 1.6 * u], [hx + 4 * u, hy - 3.4 * u], [hx + 5 * u, hy]], "#fff4e8", 0);
  }
};

// ---------------- hair ----------------
const nestBehind = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, u: number, up: number) => {
  const n = 8 + Math.round(up * 4);
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1), a = rad(200 + f * 140 + (rnd(k.seed, i) - 0.5) * 8);
    const Lh = (18 + 16 * rnd(k.seed, i + 3)) * u * (1 + 1.25 * up);
    let dir = a + (rnd(k.seed, i + 9) - 0.5) * 0.5;
    dir = lerp(dir, -Math.PI / 2 + (f - 0.5) * 1.1, up);
    const b0: P2 = [cx + Math.cos(a - 0.15) * H.a * 0.9, hc + Math.sin(a - 0.15) * H.b * 0.9], b1: P2 = [cx + Math.cos(a + 0.15) * H.a * 0.9, hc + Math.sin(a + 0.15) * H.b * 0.9];
    const M: P2 = [cx + Math.cos(a) * H.a, hc + Math.sin(a) * H.b], tip: P2 = [M[0] + Math.cos(dir) * Lh, M[1] + Math.sin(dir) * Lh];
    const curl = (i % 2 ? 1 : -1) * 11 * u * (1 - 0.7 * up), nx = -Math.sin(dir), ny = Math.cos(dir);
    const c0: P2 = [lerp(b0[0], tip[0], 0.55) + nx * curl, lerp(b0[1], tip[1], 0.55) + ny * curl], c1: P2 = [lerp(b1[0], tip[0], 0.55) + nx * curl * 0.6, lerp(b1[1], tip[1], 0.55) + ny * curl * 0.6];
    p.poly([...qbez(b0, c0, tip, 8), ...qbez(tip, c1, b1, 8).slice(1)], i % 3 === 1 ? mul(k.hair, [0.86, 0.84, 0.86]) : k.hair, 3.6 * u);
  }
};
const capHair = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, cut: number, u: number, light: number, thick: number, fringe: (xR: number, yR: number, xL: number, yL: number) => P2[]) => {
  const n = hp.length, cutY = hc - cut * H.b, run: P2[] = [];
  for (let i = Math.floor(n / 2); i < n; i++) if (hp[i][1] < cutY) run.push([cx + (hp[i][0] - cx) * 1.05, hc + (hp[i][1] - hc) * 1.05]);
  if (run.length < 4) return;
  const [xR, yR] = run[run.length - 1], [xL, yL] = run[0];
  const pts = [...run, ...fringe(xR, yR, xL, yL)];
  p.shadedFill(pts, k.hair, mul(k.hair, SH_HAIR), light, H.a, 0.35);
  p.clip(pts, () => { const a = (light * 180) / Math.PI; p.arc(cx, hc - 4 * u, 0.8 * H.a, 0.78 * H.b, a - 24, a + 24, 3.6 * u, mix(k.hair, WHITE, 0.35)); });
  p.inkRing(pts, 4.2 * u, thick, 0.45);
};
const hairBack = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, u: number, up: number, light: number, thick: number) => {
  if (k.hairStyle === "nest") nestBehind(p, k, cx, hc, H, u, up);
  else if (k.hairStyle === "bob") {
    const pts: P2[] = [...thru([cx - 1.14 * H.a, hc + 0.58 * H.b], [cx - 1.24 * H.a, hc - 0.4 * H.b], [cx, hc - 1.14 * H.b], 14), ...thru([cx, hc - 1.14 * H.b], [cx + 1.24 * H.a, hc - 0.4 * H.b], [cx + 1.14 * H.a, hc + 0.58 * H.b], 14).slice(1),
      ...thru([cx + 1.14 * H.a, hc + 0.58 * H.b], [cx, hc + 0.66 * H.b], [cx - 1.14 * H.a, hc + 0.58 * H.b], 10).slice(1, -1)];
    p.inkRing(pts, 4.2 * u, thick); p.shadedFill(pts, mul(k.hair, [0.85, 0.82, 0.86]), mul(k.hair, SH_HAIR), light, H.a);
  } else { // curls: a ring of tight curls round the crown
    for (let i = 0; i < 11; i++) {
      const a = rad(178 + (i / 10) * 184), x = cx + Math.cos(a) * H.a, y = hc + Math.sin(a) * H.b, r = (12 + 3 * rnd(k.seed, i)) * u;
      const pt = ellPts(x, y, r, r * 0.92, 22);
      p.inkRing(pt, 3.8 * u, thick, 0.4); p.poly(shrink(pt, 0.94), k.hair, 0);
      p.arc(x - 3 * u, y - 3 * u, r * 0.45, r * 0.4, 200, 280, 1.6 * u, mix(k.hair, WHITE, 0.3));
    }
  }
};
const hairFront = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, u: number, up: number, light: number, thick: number) => {
  if (k.hairStyle === "nest") {
    capHair(p, k, hp, cx, hc, H, 0.4, u, light, thick, (xR, yR, xL, yL) => { // messy swept fringe
      const out: P2[] = [], m = 7;
      for (let j = 1; j < m; j++) { const f = j / m; out.push([lerp(xR, xL, f) - (j % 2 ? 6 : 0) * u, lerp(yR, yL, f) + (j % 2 ? (12 + 6 * rnd(k.seed, j)) * u * (1 - 0.6 * up) : 1 * u)]); }
      return out;
    });
    // the cowlick: a curl on top that becomes a boinging spring when he loses it
    const base: P2 = [cx + 10 * u, hc - H.b * 0.98];
    const pts: P2[] = [base];
    if (up < 0.5) pts.push(...thru(base, [base[0] + 4 * u, base[1] - 20 * u], [base[0] + 18 * u, base[1] - 30 * u], 10).slice(1), [base[0] + 24 * u, base[1] - 27 * u]);
    else for (let i = 1; i <= 10; i++) pts.push([base[0] + (i % 2 ? 7 : -7) * u, base[1] - i * 5.4 * u * up]);
    limb(p, pts, k.hair, 4.6 * u, 1.9 * u);
  } else if (k.hairStyle === "bob") {
    capHair(p, k, hp, cx, hc, H, 0.32, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR + 4 * u], [cx + 4 * u, hc - 0.26 * H.b], [xL, yL + 4 * u], 12).slice(1, -1));
    for (const s of [-1, 1]) {
      const pts: P2[] = [[cx + s * 0.9 * H.a, hc - 0.45 * H.b], [cx + s * 1.12 * H.a, hc - 0.05 * H.b], [cx + s * 1.1 * H.a, hc + 0.58 * H.b], [cx + s * 0.86 * H.a, hc + 0.6 * H.b], [cx + s * 0.84 * H.a, hc + 0.05 * H.b]];
      p.poly(pts, k.hair, 3.6 * u);
    }
  } else {
    capHair(p, k, hp, cx, hc, H, 0.52, u, light, thick, (xR, yR, xL, yL) => {
      const out: P2[] = [], m = 8;
      for (let j = 1; j < m; j++) { const f = j / m; out.push([lerp(xR, xL, f), lerp(yR, yL, f) + (j % 2 ? 7 : 0) * u]); }
      return out;
    });
    for (let i = 0; i < 6; i++) p.arc(cx + (i - 2.5) * 15 * u, hc - 0.74 * H.b + Math.abs(i - 2.5) * 3 * u, 6 * u, 5 * u, 180, 400, 1.6 * u, mul(k.hair, [0.5, 0.5, 0.56]));
  }
};

// ---------------- faces ----------------
const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: P2, shake: number) => {
  const lx = x + look[0] * 2.6 * u, ly = ey + look[1] * 2.4 * u, w = 3.9 * u;
  switch (kind) {
    case "dot": case "up": {
      const yy = ly - (kind === "up" ? 2.5 * u : 0);
      p.ell(lx, yy, 4.7 * u, 6.6 * u, INK, 0); p.dot(lx - 1.5 * u, yy - 2.6 * u, 1.5 * u, WHITE); break;
    }
    case "wide": p.ell(x, ey - u, 9.6 * u, 11.2 * u, WHITE, 2.6 * u); p.ell(lx, ly, 4.6 * u, 5.8 * u, INK, 0); p.dot(lx - 1.6 * u, ly - 2.2 * u, 1.6 * u, WHITE); break;
    case "tiny": p.ell(x, ey - u, 10.4 * u, 11.6 * u, WHITE, 2.6 * u); p.dot(x + (shake % 2 ? 0.6 : -0.6) * u, ey, 1.8 * u); break;
    case "lid": p.ell(lx, ey + 0.6 * u, 5 * u, 5.4 * u, INK, 0, 0, 180); p.stroke([[x - 8.5 * u, ey + 0.4 * u], [x + 8.5 * u, ey + 0.4 * u]], w); break;
    case "heavy": p.ell(lx, ey + 3 * u, 4.6 * u, 3.4 * u, INK, 0, 0, 180); p.stroke([[x - side * 7 * u, ey + 2.2 * u], [x + side * 9 * u, ey + 4.2 * u]], w * 1.1); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6.6 * u, 200, 340, w); break;
    case "closed": p.arc(x, ey - 2 * u, 8 * u, 5 * u, 20, 160, w); break;
    case "laugh": { // tight >  < squeeze
      const o = side * 8.5 * u;
      p.stroke([[x + o, ey - 7.5 * u], [x - side * 7.5 * u, ey], [x + o, ey + 7.5 * u]], w * 1.35);
      break;
    }
  }
};
const dmouth = (p: Pen, pts: P2[], inner: () => void, ink: number) => { p.poly(pts, MOUTH, 0); p.clip(pts, inner); p.poly(pts, null, ink); };
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5 * u, my], [mx + 5 * u, my]], mw); break;
    case "flat": p.stroke([[mx - 9.5 * u, my + 1.5 * u], [mx + 9.5 * u, my + 1.5 * u]], mw); break;
    case "meh": { const s: P2[] = []; for (let i = 0; i <= 10; i++) s.push([mx - 4 * u + i * 1.6 * u, my + 2 * u - i * 0.35 * u + 1.1 * u * Math.sin(i * 1.4)]); p.stroke(s, 3.4 * u); break; }
    case "smirk": p.arc(mx + 4 * u, my - 4 * u, 8 * u, 4.5 * u, 10, 120, mw); p.stroke([[mx - 6 * u, my - 0.4 * u], [mx + 3 * u, my + 0.6 * u]], mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8.5 * u, 5 * u, 20, 160, mw); break;
    case "o": p.ell(mx, my + u, 3.8 * u, 4.6 * u, MOUTH, 2.8 * u); break;
    case "bigO": dmouth(p, ellPts(mx, my + 3 * u, 8 * u, 10 * u, 30), () => p.ell(mx, my + 11 * u, 5 * u, 3.4 * u, TONGUE, 0), 3 * u); break;
    case "grin": {
      const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 10 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)];
      p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 13 * u, my - 0.5 * u], [mx + 13 * u, my - 0.5 * u]], 1.3 * u); break;
    }
    case "tada": case "giggle": case "pant": {
      const s = kind === "tada" ? 1 : kind === "giggle" ? 0.72 : 0.66, w = 17 * u * s, d = (kind === "pant" ? 20 * (0.75 + 0.25 * k) : 16) * u * s, top = my - 4 * u;
      const pts: P2[] = kind === "pant" ? ellPts(mx, my + 3 * u, w * 0.75, d * 0.62, 30)
        : [...thru([mx - w, top - 2 * u], [mx, top + 1 * u], [mx + w, top - 2 * u], 10), ...Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI; return [mx + w * Math.cos(a), top - 2 * u + d * Math.sin(a)] as P2; }).slice(1)];
      dmouth(p, pts, () => {
        if (kind !== "pant") p.poly([[mx - w, top - 8 * u], [mx + w, top - 8 * u], [mx + w, top + 3.6 * u], [mx - w, top + 3.6 * u]], WHITE, 0);
        p.ell(mx + 1.5 * u, top + d * 0.95, w * 0.55, d * 0.42, TONGUE, 0);
      }, 3 * u);
      break;
    }
    case "wobble": {
      const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.8 * u * Math.sin(i * 1.5 + (shake % 2) * 0.7)]);
      p.stroke(s, 3.2 * u); p.stroke([[mx + 9 * u, my], [mx + 11.5 * u, my - 3 * u]], 3 * u); break;
    }
    case "tongue": {
      p.ell(mx + 6 * u, my + 3.2 * u, 3.6 * u, 4 * u, TONGUE, 2.2 * u, 0, 180);
      p.stroke([[mx - 7 * u, my + 1 * u], [mx + 9 * u, my + 0.4 * u]], mw); break;
    }
    case "mega": { // THE MEME LAUGH: a giant D mouth, top teeth, wobbling tongue, little uvula
      const s = 0.5 + 0.5 * Math.min(1.15, k), w = 30 * u * s, d = 36 * u * s, top = my - 7 * u * s, wob = ((shake % 3) - 1) * 1.6 * u;
      const pts: P2[] = [...thru([mx - w, top - 4 * u], [mx, top + 2 * u], [mx + w, top - 4 * u], 12)];
      for (let i = 1; i < 20; i++) { const a = (i / 20) * Math.PI; pts.push([mx + w * Math.cos(a), top - 4 * u + (d + 4 * u) * Math.sin(a)]); }
      dmouth(p, pts, () => {
        const g = p.g, [ax, ay] = p.P(mx, top), [bx, by] = p.P(mx, top + d);
        const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, THROAT); gr.addColorStop(1, MOUTH);
        g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
        p.poly([...thru([mx - w, top - 10 * u], [mx, top - 4 * u], [mx + w, top - 10 * u], 10), [mx + w, top + 3 * u], ...thru([mx + w * 0.9, top + 4 * u], [mx, top + 9 * u], [mx - w * 0.9, top + 4 * u], 10), [mx - w, top + 3 * u]], WHITE, 0);
        for (let i = -3; i <= 3; i++) p.stroke([[mx + i * w * 0.24, top - 2 * u], [mx + i * w * 0.24, top + (6.5 - Math.abs(i) * 0.6) * u]], 1.3 * u, "#c8c2cc");
        p.ell(mx, top + 10.5 * u, 2.4 * u, 3.2 * u, "#c8404e", 0);
        p.ell(mx + wob, top + d * 0.86, w * 0.6, d * 0.36, TONGUE, 0);
        p.stroke([[mx + wob, top + d * 0.62], [mx + wob, top + d * 0.82]], 1.4 * u, "#d8505e");
      }, 3.4 * u);
      for (const sd of [-1, 1]) p.arc(mx + sd * (w + 4 * u), top + 2 * u, 5 * u, 7 * u, sd > 0 ? -60 : 120, sd > 0 ? 60 : 240, 2.4 * u);
      break;
    }
  }
};
const drawFace = (p: Pen, kit: Kit, cx: number, hc: number, H: Blob, f: FaceS, lid: number, g: number) => {
  const D = FACES[f.e], u = U * g, look = f.look ?? D.look ?? [0, 0], shake = f.shake ?? 0, k = f.k ?? 1;
  const ey = hc + (D.eye === "laugh" ? -4 : EY) * u, ex = EX * u;
  if ((D.streams ?? 0) > 0) for (const side of [-1, 1]) { // tears of laughter streaming off the cheeks
    const x0 = cx + side * (ex + 7 * u), L2 = D.streams! * Math.min(1, k);
    const pts = thru([x0, ey + 2 * u], [x0 + side * 9 * u * L2, ey + 16 * u * L2], [x0 + side * 12 * u * L2, ey + 34 * u * L2], 10);
    limb(p, pts, TEAR, 5 * u, 1.6 * u);
    p.stroke(pts.slice(1, 5), 1.6 * u, TEAR_HI);
  }
  for (const side of [-1, 1]) {
    let ek = D.eye;
    if (lid >= 1 && !["happy", "laugh", "closed"].includes(ek)) ek = "closed";
    else if (lid > 0 && (ek === "dot" || ek === "up" || ek === "wide")) ek = "lid";
    else if (lid > 0 && ek === "lid") ek = "heavy";
    const x = cx + side * ex;
    eye(p, ek, x, ey, u, side, look, shake);
    if (D.crinkle) for (const a of [-28, 0, 28]) { const b = side > 0 ? rad(a) : Math.PI - rad(a); p.stroke([[x + side * 11 * u + Math.cos(b) * 1 * u, ey + Math.sin(b) * 1 * u], [x + side * 11 * u + Math.cos(b) * 6 * u, ey + Math.sin(b) * 6 * u]], 1.8 * u); }
    const [dI, dO] = side > 0 && D.brow2 ? D.brow2 : D.brow, by = ey - (ek === "wide" || ek === "tiny" ? 23 : 19) * u - (kit.glasses ? 2 * u : 0), bc = kit.hairStyle === "curls" ? kit.hair : INK;
    tapered(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5.2 * u, 2.6 * u, bc);
  }
  if (kit.glasses) { // big round 90s frames
    for (const side of [-1, 1]) {
      const x = cx + side * ex;
      p.ell(x, ey, 12.6 * u, 12 * u, null, 5.4 * u);
      p.arc(x, ey, 12.6 * u, 12 * u, 0, 360, 2.4 * u, kit.glasses);
      p.stroke([[x - 6 * u, ey - 7 * u], [x - 1 * u, ey - 9.5 * u]], 1.8 * u, D.flash ? WHITE : "rgba(255,255,255,0.75)");
      if (D.flash) p.stroke([[x + 2 * u, ey + 4 * u], [x + 7 * u, ey - 2 * u]], 2.4 * u, "rgba(255,255,255,0.9)");
    }
    p.stroke([[cx - ex + 12.6 * u, ey - 2 * u], [cx + ex - 12.6 * u, ey - 2 * u]], 2.6 * u);
  }
  const mx = cx + (D.mouth === "smirk" || D.mouth === "meh" ? 3 * u : 0), my = hc + MOUTH_DY * u;
  if (kit.beard) {
    const b: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = rad(-6 + (i / 24) * 192), sn = Math.max(0, Math.sin(a)); b.push([cx + Math.cos(a) * H.a * 1.04, hc + Math.sin(a) * H.b * 1.06 * (1 + 0.28 * sn * sn) + 2 * u]); }
    const inner = thru([cx - 0.92 * H.a, hc + 0.06 * H.b], [cx, hc + 0.5 * H.b], [cx + 0.92 * H.a, hc + 0.06 * H.b], 12);
    p.poly([...b, ...inner.reverse()], kit.beard, 3.6 * u);
    for (let i = -3; i <= 3; i++) p.arc(cx + i * 11 * u, hc + 0.78 * H.b - Math.abs(i) * 2 * u, 4 * u, 3 * u, 20, 160, 1.4 * u, mix(kit.beard, WHITE, 0.25));
  }
  mouth(p, D.mouth, mx, my, u, k, shake);
  if (kit.beard) { // moustache over the mouth
    const up = D.mouth === "bigO" || D.mouth === "tada" ? 4 * u : 0;
    const pts: P2[] = [[mx - 19 * u, my - 1 * u], [mx - 11 * u, my - 9 * u], [mx, my - 7 * u], [mx + 11 * u, my - 9 * u], [mx + 19 * u, my - 1 * u], [mx + 10 * u, my - 4 * u], [mx, my - 2.6 * u], [mx - 10 * u, my - 4 * u]];
    p.poly(pts.map(([x, y]) => [x, y - up] as P2), kit.beard, 2.6 * u);
  }
  if (D.sweat) { // a bead of sweat at the temple
    const x = cx + 0.74 * H.a, y = hc - 0.42 * H.b;
    p.poly([[x, y - 8 * u], [x + 5 * u, y + 2 * u], [x + 4 * u, y + 6 * u], [x, y + 8 * u], [x - 4 * u, y + 6 * u], [x - 5 * u, y + 2 * u]], TEAR, 1.8 * u);
  }
};

/** a whole figure in the 600 x 1000 design space (feet ~ y 950, origin 300, 975) */
export const drawPerson = (p: Pen, kit: Kit, pose: Pose, face: FaceS, light: number, lid = 0) => {
  const D = FACES[face.e], kk = Math.min(1.2, face.k ?? 1), u = U, thick = thickAngle(light), ow = 4.8 * u, olSave = p.ol;
  p.ol = 4 * u;
  const seated = !!pose.knees, hoodie = kit.top === "hoodie", coat = !!kit.coat;
  const bodyR = [pose.lean ?? 0, 300, L.hipY, pose.shake ?? 0, pose.drop ?? 0];
  const B = bodyXf(pose);
  // ---- legs ----
  const leg = (side: 0 | 1) => {
    const s = side ? 1 : -1, { Hp, K, F } = legIK(pose, side);
    const pts = [...thru(Hp, lerp2(Hp, K, 0.5), K, 6), ...thru(K, lerp2(K, F, 0.5), F, 7).slice(1)];
    const lw = (hoodie ? 15 : 11) * u;
    limb(p, pts, kit.legs, lw, 4 * u);
    if (kit.tartan) { // tartan pyjama bottoms: cross bars + a cream pin stripe
      let acc = 0;
      for (let i = 1; i < pts.length - 2; i++) {
        const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += l;
        if (Math.floor(acc / 30) !== Math.floor((acc - l) / 30)) {
          const nx = -(b[1] - a[1]) / (l || 1), ny = (b[0] - a[0]) / (l || 1), h = lw * 0.42;
          p.stroke([[b[0] - nx * h, b[1] - ny * h], [b[0] + nx * h, b[1] + ny * h]], 3.4 * u, mul(kit.legs, [0.62, 0.5, 0.56]));
        }
      }
      p.stroke(pts.slice(0, -2).map(([x, y]) => [x + s * 3 * u, y] as P2), 1.5 * u, kit.legs2);
    }
    const ank = lerp2(pts[pts.length - 3], F, 0.4);
    limb(p, [ank, F], hoodie ? kit.trim : mix(kit.legs, INK, 0.2), lw * 0.78, 3 * u);
    if (kit.shoes === "monster") { // fuzzy monster slippers, toes to the camera: googly eyes, little horns, tiny teeth
      const cx = F[0] + s * 3 * u, cy = F[1] + 8 * u, pts2: P2[] = [];
      for (let i = 0; i < 56; i++) { const a = (i / 56) * Math.PI * 2, r = 1 + (Math.sin(a) < 0 ? 0.07 * Math.abs(Math.sin(i * Math.PI / 4)) : 0); pts2.push([cx + Math.cos(a) * 17 * u * r, cy + Math.sin(a) * 12 * u * r]); }
      for (const h of [-1, 1]) p.poly([[cx + h * 6 * u, cy - 9 * u], [cx + h * 12 * u, cy - 20 * u], [cx + h * 13 * u, cy - 7 * u]], "#ffe6a0", 2.2 * u);
      p.inkRing(pts2, 4 * u, thick); p.shadedFill(pts2, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 17 * u);
      for (const h of [-1, 1]) { p.ell(cx + h * 6 * u, cy - 4 * u, 4.6 * u, 4.6 * u, WHITE, 1.6 * u); p.dot(cx + h * 6 * u + 0.8 * u, cy - 3.4 * u, 2 * u); }
      for (let i = -1; i <= 1; i++) p.poly([[cx + i * 5 * u - 2.4 * u, cy + 6 * u], [cx + i * 5 * u + 2.4 * u, cy + 6 * u], [cx + i * 5 * u, cy + 9.5 * u]], WHITE, 1 * u);
    } else {
      const sp = ellPts(F[0] + s * 4 * u, F[1] + 7 * u, 15 * u, 8.5 * u, 30);
      p.inkRing(sp, 4 * u, thick); p.shadedFill(sp, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 15 * u);
      p.arc(F[0] + s * 4 * u - 4 * u, F[1] + 4 * u, 6 * u, 3 * u, 200, 290, 1.8 * u, mix(kit.shoeCol, WHITE, 0.5));
    }
  };
  if (!seated) { leg(0); leg(1); }
  // ---- arms ----
  const sleeve = coat ? "#f4f7fb" : kit.topCol;
  const arm = (side: 0 | 1) => {
    p.rot = bodyR;
    const { S, E, hand } = armIK(pose, side);
    const pts = [...thru(S, lerp2(S, E, 0.5), E, 6), ...thru(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    const aw = (hoodie ? 13 : 10.5) * u;
    limb(p, pts, sleeve, aw, 4 * u);
    if (coat) p.stroke([pts[2], pts[5]], 1.4 * u, "#c4ccdc");
    limb(p, [lerp2(E, hand, 0.74), lerp2(E, hand, 0.9)], coat ? kit.topCol : kit.topCol2, aw * (coat ? 0.8 : 1.08), 1.6 * u);
    p.rot = null;
    const Hw = B(hand), Ew = B(E), ang = pose.ha?.[side] ?? Math.atan2(Hw[1] - Ew[1], Hw[0] - Ew[0]);
    const hold = pose.hold?.[side];
    if (hold && hold !== "pencil") drawHold(p, hold, Hw, side, light);
    drawHand(pose, p, pose.hk?.[side] ?? "rest", Hw, ang, kit.skin, side);
    if (hold === "pencil") drawHold(p, hold, Hw, side, light);
  };
  const front = pose.front ?? [false, false];
  if (!front[0]) arm(0);
  if (!front[1]) arm(1);
  p.rot = bodyR;
  // ---- torso ----
  const T: Blob = { a: 86, b: (L.tbot - L.top) / 2, nTop: 2.4, nBot: 3.6, egg: 0.17, asym: 0, rot: 0, noise: 0.005, seed: kit.seed + 3 };
  const tcy = (L.top + L.tbot) / 2, tp = blobPts(300, tcy, T);
  p.gradFill(tp, kit.topCol, mul(kit.topCol, SH_CLOTH), light, 0.24, 0.3);
  p.clip(tp, () => {
    if (hoodie) {
      const pc = mul(kit.topCol, [0.88, 0.9, 0.92]);
      p.poly([[236, 534], [364, 534], [392, 604], [208, 604]], pc, 1.8 * u);
      for (const s of [-1, 1]) p.stroke(thru([300 + s * 64, 536], [300 + s * 86, 566], [300 + s * 92, 602], 8), 1.6 * u, mul(kit.topCol, [0.55, 0.6, 0.66]));
      p.poly([[150, L.tbot - 26], [450, L.tbot - 26], [450, 700], [150, 700]], kit.topCol2, 1.6 * u);
      for (let x = 160; x < 450; x += 13) p.stroke([[x, L.tbot - 22], [x, L.tbot + 4]], 1.2 * u, mul(kit.topCol2, [0.7, 0.74, 0.8]));
    } else if (kit.top === "cardigan") {
      for (const x of [252, 348]) { const z: P2[] = []; for (let y = 440, i = 0; y < 640; y += 12, i++) z.push([x + (i % 2 ? 4 : -4), y]); p.stroke(z, 1.6 * u, mul(kit.topCol, [0.72, 0.7, 0.72])); }
      p.poly([[258, L.top - 6], [342, L.top - 6], [300, 492]], kit.topCol2, 1.8 * u);
      p.stroke([[300, 496], [300, 640]], 1.4 * u, mul(kit.topCol, [0.6, 0.6, 0.64]));
      for (const y of [516, 552, 588]) { p.dot(306, y, 3.4 * u); p.dot(306, y, 2.4 * u, kit.trim); }
    } else {
      const zz: P2[] = [];
      for (let i = 0; i <= 14; i++) zz.push([195 + i * 15, 482 + (i % 2 ? -14 : 14)]);
      p.stroke(zz, 12 * u, kit.topCol2); p.stroke(zz.map(([x, y]) => [x, y + 34] as P2), 5 * u, kit.trim);
      p.stroke(zz.map(([x, y]) => [x, y - 34] as P2), 5 * u, kit.trim);
      for (const s of [-1, 1]) p.poly([[300 + s * 2, L.top - 4], [300 + s * 40, L.top - 10], [300 + s * 30, L.top + 30]], WHITE, 1.8 * u);
    }
  });
  p.inkRing(tp, ow, thick);
  if (coat) { // open white lab coat over the knit
    for (const s of [-1, 1]) {
      const pts: P2[] = [[300 + s * 22, L.top - 2], [300 + s * 88, L.top + 26], [300 + s * 100, 600], [300 + s * 114, 774], [300 + s * 42, 774], [300 + s * 36, 560], [300 + s * 50, 470]];
      p.gradFill(pts, "#f6f8fb", "#b4bfd2", light, 0.3); p.poly(pts, null, ow * 0.75);
      p.poly([[300 + s * 22, L.top - 2], [300 + s * 64, L.top + 12], [300 + s * 50, 470]], "#e3e8f1", 2 * u);
    }
    p.poly([[356, 492], [388, 492], [390, 532], [358, 532]], "#eef2f8", 1.8 * u);
    if (kit.badge) { p.poly(rrect(226, 478, 254, 516, 3), WHITE, 1.8 * u); p.poly([[231, 484], [249, 484], [249, 498], [231, 498]], "#7ab0e8", 0); p.stroke([[232, 506], [248, 506]], 1.2 * u, "#8890a0"); p.stroke([[240, 466], [240, 478]], 1.4 * u, "#3a6ad0"); }
    else p.poly([[360, 484], [386, 484], [386, 506], [360, 506]], "#dfe6f0", 1.2 * u);
    for (const [x, c] of [[364, "#2f62d8"], [372, "#e0484f"], [380, "#2a2a3a"]] as [number, string][]) p.band([[x, 494], [x, 472]], c, 2.4 * u, 1.1 * u, "round");
  }
  if (hoodie) { // hood bunched behind the neck + drawstrings
    const hood = ellPts(300, L.top + 4, 78, 28, 40);
    p.inkRing(hood, ow * 0.9, thick); p.shadedFill(hood, kit.topCol2, mul(kit.topCol2, SH_CLOTH), light, 78);
    p.ell(300, L.top + 6, 50, 14, mul(kit.topCol2, [0.6, 0.62, 0.7]), 0);
    for (const s of [-1, 1]) {
      const a: P2 = [300 + s * 15, L.top + 18], b: P2 = [300 + s * 23, L.top + 92];
      limb(p, thru(a, [300 + s * 21, L.top + 54], b, 8), kit.trim, 2.6 * u, 1.2 * u);
      p.poly(rrect(b[0] - 3.2 * u, b[1], b[0] + 3.2 * u, b[1] + 8 * u, 1.4 * u), mix(kit.trim, WHITE, 0.3), 1.6 * u);
    }
  }
  p.rot = null;
  if (seated) { leg(0); leg(1); }
  if (front[0]) arm(0);
  if (front[1]) arm(1);
  // ---- head ----
  const meme = face.e === "meme", grow = growOf(face);
  p.rot = headRot(pose, face);
  const cx = 300, hc = L.hc;
  const H0 = headBlob(kit.seed, HEAD_A, 0), H: Blob = { ...H0, a: H0.a * grow, b: H0.b * grow, rot: H0.rot * 0.5 };
  const up = meme ? kk : face.e === "uhoh" ? 0.18 : face.e === "pant" ? 0.25 : 0;
  hairBack(p, kit, cx, hc, H, u * grow, up, light, thick);
  const hp = blobPts(cx, hc, H);
  p.inkRing(hp, ow, thick);
  p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), kit.skin, mul(kit.skin, SH_SKIN), light, H.a);
  const red = (D.red ?? 0) * kk, blush = (D.blush ?? 0) * kk, g = p.g;
  clipAll(p, [hp], () => {
    if (red > 0.05) { // the giggle-red rises from the chin
      const [ax, ay] = p.P(cx, hc + H.b), [bx, by] = p.P(cx, hc - H.b), top = Math.min(1, red);
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, rgba("#ff2f4a", 0.78 * top)); gr.addColorStop(Math.max(0.01, 0.62 * top), rgba("#ff4a5a", 0.5 * top)); gr.addColorStop(Math.min(0.999, 0.62 * top + 0.3), rgba("#ff4a5a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
    const a = Math.max(red, blush) * 0.85;
    if (a > 0.02) for (const s of [-1, 1]) {
      const [x, y] = p.P(cx + s * 0.6 * H.a, hc + 0.3 * H.b), R = 0.24 * H.a;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, rgba("#ff4d6a", 0.7 * a)); gr.addColorStop(1, rgba("#ff4d6a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
  });
  if (kit.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(cx + s * (0.4 + 0.09 * i) * H.a, hc + (0.2 + (i % 2) * 0.07) * H.b, 1.5 * u * grow, rgba("#a85a3a", 0.7));
  hairFront(p, kit, hp, cx, hc, H, u * grow, up, light, thick);
  if (kit.earPen) { const x = cx - 1.0 * H.a, y = hc - 0.05 * H.b; limb(p, [[x - 6 * u, y + 10 * u], [x + 10 * u, y - 20 * u]], "#ffc93c", 3.2 * u, 1.3 * u); p.dot(x + 10 * u, y - 20 * u, 1.8 * u, "#ff8fa0"); }
  drawFace(p, kit, cx, hc, H, face, lid, grow);
  p.rot = null;
  p.ol = olSave;
};

// ---------------- effect cards ----------------
/** HAHA! burst (640 x 420): a curvy-spiked bubble with white letters */
export const fxHaha = (p: Pen, word: string, col: string, seed: number) => {
  const n = 16, pts: P2[] = [], C: P2 = [320, 210];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 0.5) / n) * Math.PI * 2, a2 = ((i + 1) / n) * Math.PI * 2, ro = 0.97 + 0.08 * rnd(seed, i), ri = 0.76;
    const P0: P2 = [320 + Math.cos(a0) * 300 * ri, 210 + Math.sin(a0) * 190 * ri], T: P2 = [320 + Math.cos(a1) * 300 * ro, 210 + Math.sin(a1) * 190 * ro], P1: P2 = [320 + Math.cos(a2) * 300 * ri, 210 + Math.sin(a2) * 190 * ri];
    pts.push(...qbez(P0, lerp2(lerp2(P0, T, 0.5), C, 0.12), T, 4).slice(0, -1), ...qbez(T, lerp2(lerp2(T, P1, 0.5), C, 0.12), P1, 4).slice(0, -1));
  }
  const sc = (k: number) => pts.map(([x, y]) => [320 + (x - 320) * k, 210 + (y - 210) * k] as P2);
  p.poly(sc(0.97), col, 22);
  p.poly(sc(0.7), mix(col, WHITE, 0.35), 0);
  p.arc(240, 140, 110, 56, 200, 250, 14, "rgba(255,255,255,0.85)");
  letter(p, word, 320, 220, word.length > 5 ? 112 : word.length > 3 ? 136 : 168, WHITE, 30, 0, 460);
};
/** tickle squiggle (256 x 256): a curly loop chain, variant v */
export const fxSquiggle = (p: Pen, v: number, col: string) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80, a = 2 * Math.PI * 3 * t + v * 0.9; pts.push([46 + 164 * t - 20 * Math.sin(a), 128 - 32 * Math.cos(a) * (0.75 + 0.25 * Math.sin(t * 3 + v))]); }
  limb(p, pts, col, 11, 7);
};
/** limp "nothing happening" squiggle (256 x 256): grey, drooping (sag 0..1) */
export const fxLimp = (p: Pen, sag: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push([50 + 150 * t, 80 + sag * 110 * t * t + 12 * Math.sin(t * Math.PI * 3) * (1 - sag * 0.7)]); }
  limb(p, pts, "#c9ccd6", 10, 6);
};
/** tear drop (128 x 160) */
export const fxTear = (p: Pen) => {
  p.poly([[64, 12], [100, 80], [104, 112], [88, 140], [64, 150], [40, 140], [24, 112], [28, 80]], TEAR, 9);
  p.arc(62, 108, 22, 26, 200, 250, 7, TEAR_HI);
};
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#a6dcff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, TEAR_HI);
};
/** four-point twinkle (256 x 256) */
export const fxSparkle = (p: Pen, col: string) => {
  const pts: P2[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 24 : 112; pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); }
  const sm: P2[] = [];
  for (let i = 0; i < pts.length; i++) sm.push(...qbez(pts[i], lerp2(lerp2(pts[i], pts[(i + 1) % 8], 0.5), [128, 128], 0.35), pts[(i + 1) % 8], 5).slice(0, -1));
  p.poly(sm, col, 9);
  p.dot(128, 128, 18, WHITE);
};
/** "!" or "?" pop (300 x 400) */
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
/** motion arcs (256 x 256): three nested arcs ")))" opening to the right */
export const fxMotion = (p: Pen) => {
  for (let i = 0; i < 3; i++) { const r = 50 + i * 34; p.arc(40, 128, r, r * 1.1, -38 + i * 4, 38 - i * 4, 22, INK); p.arc(40, 128, r, r * 1.1, -36 + i * 4, 36 - i * 4, 11, WHITE); }
};
/** "hee hee" (400 x 220) */
export const fxHehe = (p: Pen, word: string) => {
  const g = p.g; g.save(); g.translate(200, 110); g.rotate(-0.12);
  letter(p, word, 0, 0, 96, "#ff7aa8", 20, 8, 380);
  g.restore();
};
