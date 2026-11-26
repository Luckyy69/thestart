// OWNER: cast agent. Drawings for "The Sun Sneeze": brand-new bean-head figures in our Pen style (thick-thin plum ink,
// painted crescents) and every effect card ("ah... ah..." text, "ACHOO!" bursts, squint/glare lines, sweat, "!" / "?",
// sparkles, motion + speed lines, heat wiggles, nose-twitch marks, the flying scroll, the coffee splash).
// Design space 600 x 1000 units per card (bridge: 1000 units = 2.16 m). The card origin (canvas 300, 975) is the point
// between the feet ON the ground. Standing head centre canvas y 300 (1.458 m) for headK 1. Kids are drawn with a bigger
// head (headK, scaled about the neck) on a smaller card (Place.scale). Seated figures drop the whole upper body by
// pose.drop units and draw explicit knees. back=true draws the figure from behind (audience seen from the back rows).
// NEW for this short: a NOSE on every face (flare / heat-red / scrunch / twitch), the sneeze faces ("ahh" build-up with
// rolled-up eyes + flaring nostrils, "achoo" blast with squeezed eyes) and THE MEME FACE (the colossal "ACHOO!").
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, Blob } from "../bridge/toon";

export type P2 = [number, number];
const WHITE = "#ffffff", MOUTH = "#4a1020", THROAT = "#2a0510", TONGUE = "#ff6f86", TEAR = "#79d2ff", TEAR_HI = "#eaf9ff";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.37 + k * 47.77) * 24634.6345; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
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
const clipAll = (p: Pen, parts: P2[][], fn: () => void) => {
  const g = p.g; g.save(); g.beginPath();
  for (const pts of parts) { pts.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
  g.clip("nonzero"); fn(); g.restore();
};
/** soft radial glow (canvas gradient) at a design point */
const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  if (a <= 0.01) return;
  const g = p.g, [x, y] = p.P(x0, y0), gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
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
export type HairStyle = "bed" | "bald" | "under" | "afro" | "bun" | "short" | "pigtails" | "spiky" | "curly" | "tuft" | "bob" | "long";
export type Top = "gown" | "toga" | "doublet" | "tweed" | "pyjama" | "tee" | "dress" | "romper" | "jacket" | "jumper";
export type Shoe = "duck" | "sandal" | "buckle" | "chunky" | "slipper" | "trainer" | "onesie";
export type Kit = {
  seed: number; skin: string; hair: string; hairStyle: HairStyle;
  top: Top; topCol: string; topCol2: string; trim: string; legs: string; legs2: string; shoes: Shoe; shoeCol: string;
  /** head scale about the neck (kids 1.15-1.3); torso half width; nose size + kind; skirt hem (gown/dress) */
  headK?: number; legW?: number; tw?: number; noseK?: number; noseKind?: "button" | "bulb" | "long"; hem?: number;
  beard?: "long" | "goatee"; beardCol?: string; tache?: string; browCol?: string; glasses?: string; freckles?: boolean;
  laurel?: boolean; hat?: "tall"; ruff?: boolean; tie?: string; bow?: string; lashes?: boolean; badge?: boolean; shorts?: boolean;
};
export type HandK = "rest" | "open" | "point" | "grip" | "fist" | "thumb";
export type Hold = "mug" | "scroll" | "notebook" | "quill" | "pointer" | "teddy";
export type Pose = {
  /** ankle points (canvas, absolute) [screen-left, screen-right] */
  feet: [P2, P2];
  /** explicit knees (seated, canvas absolute); absent = standing 2-bone IK */
  knees?: [P2, P2];
  /** hand targets (canvas, absolute); hk hand shapes; ha hand angle override (rad, canvas); front = over the torso */
  hands: [P2, P2]; hk?: [HandK, HandK]; ha?: [number | null, number | null]; front?: [boolean, boolean];
  hold?: [Hold | null, Hold | null];
  /** upper body drop (seated / knees bend, units), lean about the hips (rad), extra head tilt (deg), shoulder shrug (units) */
  drop?: number; lean?: number; headTilt?: number; shrug?: number;
  /** sideways body shake (units); head offset along the neck (+ down = the sneeze whip, - up = the big inhale) */
  shake?: number; headDy?: number;
  /** gown / toga hem flare 0..1 (the blast wind); mug slosh -1..1 */
  flare?: number; slosh?: number;
};
export type Face = "sleepy" | "squint" | "ahh" | "achoo" | "dazed" | "phew" | "knowing" | "wise" | "idea" | "cross" | "uhoh" | "focus" | "serene"
  | "warm" | "smug" | "glare" | "curious" | "intrigued" | "listen" | "confused" | "itchy" | "meme" | "proud" | "smile" | "grin" | "shocked"
  | "excited" | "sly" | "puzzled" | "bored" | "happy" | "sniffy" | "beam";
/** k: build-up / blast amount; nose overrides (flare, red heat, scrunch, twitch); blow = hair blown back 0..1 */
export type FaceS = { e: Face; k?: number; look?: P2; shake?: number; flare?: number; red?: number; scrunch?: number; twitch?: number; blow?: number };

export const HEAD_A = 118;
export const U = (2 * HEAD_A) / 100;
export const LAYOUT = { hc: 300, chin: 404, top: 408, tbot: 622, hipY: 600, sh: [[222, 452], [378, 452]] as [P2, P2] };
export const MOUTH_DY = 21;
export const NOSE_DY = 8.5;
const EX = 15, EY = -3;
const ARM1 = 100, ARM2 = 94, THIGH = 178, SHIN = 176;
const L = LAYOUT;

type EyeK = "dot" | "up" | "wide" | "tiny" | "lid" | "heavy" | "happy" | "closed" | "squint" | "ahh" | "shut" | "meme" | "cross" | "sleepy";
type MouthK = "flat" | "meh" | "smirk" | "smile" | "grin" | "o" | "bigO" | "wobble" | "dash" | "ah" | "choo" | "mega" | "grimace" | "smug" | "tada" | "mm";
type FaceDef = {
  eye: EyeK; brow: [number, number]; brow2?: [number, number]; mouth: MouthK; look?: P2; blush?: number; red?: number; tilt?: number; crinkle?: boolean;
  flare?: number; scrunch?: number; nred?: number; pitch?: number; sweat?: boolean; flash?: boolean; puff?: boolean; tears?: boolean;
};
const FACES: Record<Face, FaceDef> = {
  sleepy: { eye: "sleepy", brow: [1, 4], mouth: "mm", blush: 0.25, tilt: 4 },
  squint: { eye: "squint", brow: [7, 2], mouth: "grimace", crinkle: true, flare: 0.25, tilt: -3 },
  ahh: { eye: "ahh", brow: [-9, -3], mouth: "ah", flare: 1, pitch: -1, tilt: 3 },
  achoo: { eye: "shut", brow: [8, 0], mouth: "choo", flare: 1, scrunch: 1, pitch: 1, crinkle: true, tilt: -4 },
  dazed: { eye: "dot", brow: [-6, 3], brow2: [-2, -6], mouth: "o", look: [0.5, 0.2], nred: 0.45, tilt: 6 },
  phew: { eye: "closed", brow: [-3, 1], mouth: "smile", nred: 0.4, blush: 0.3 },
  knowing: { eye: "lid", brow: [3, 0], brow2: [-7, -10], mouth: "smirk", nred: 0.35, tilt: -4 },
  wise: { eye: "lid", brow: [-4, -7], mouth: "smile", look: [0.7, -0.9], tilt: -2 },
  idea: { eye: "up", brow: [-9, -9], mouth: "grin", look: [0.6, -1], tilt: -4 },
  cross: { eye: "cross", brow: [-8, 2], mouth: "o", tilt: 2 },
  uhoh: { eye: "tiny", brow: [-8, 3], mouth: "wobble", sweat: true },
  focus: { eye: "dot", brow: [6, -1], brow2: [-6, -9], mouth: "flat", look: [0.4, 0.6] },
  serene: { eye: "closed", brow: [-3, 0], mouth: "smile", pitch: -0.7, blush: 0.2 },
  warm: { eye: "closed", brow: [-4, -2], mouth: "smile", pitch: -0.7, blush: 0.75, red: 0.18 },
  smug: { eye: "closed", brow: [-1, -9], brow2: [2, 0], mouth: "smug", pitch: -0.4, blush: 0.35, tilt: -5 },
  glare: { eye: "squint", brow: [9, 4], mouth: "grimace", crinkle: true, flare: 0.55, scrunch: 0.6, tilt: 3 },
  curious: { eye: "dot", brow: [3, 1], brow2: [-7, -8], mouth: "o", look: [0.4, -0.7] },
  intrigued: { eye: "wide", brow: [-8, -8], mouth: "o", look: [0.5, -0.9] },
  listen: { eye: "dot", brow: [-3, -3], mouth: "dash", look: [-0.6, -0.6] },
  confused: { eye: "dot", brow: [6, -1], brow2: [-9, -3], mouth: "wobble", look: [0.5, -0.4], tilt: 7 },
  itchy: { eye: "cross", brow: [-6, 3], mouth: "wobble", flare: 0.5, scrunch: 0.4, tilt: -2 },
  meme: { eye: "meme", brow: [13, 1], mouth: "mega", flare: 1.35, scrunch: 1, pitch: 0.35, blush: 1, red: 0.55, crinkle: true, puff: true, tears: true, tilt: -8 },
  proud: { eye: "happy", brow: [-6, -4], mouth: "grin", blush: 0.3 },
  smile: { eye: "dot", brow: [-2, -1], mouth: "smile" },
  grin: { eye: "happy", brow: [-6, -4], mouth: "grin" },
  shocked: { eye: "wide", brow: [-12, -10], mouth: "bigO", flash: true },
  excited: { eye: "wide", brow: [-10, -8], mouth: "tada", flash: true, blush: 0.3 },
  sly: { eye: "lid", brow: [7, -4], mouth: "smirk" },
  puzzled: { eye: "dot", brow: [3, 0], brow2: [-9, -10], mouth: "meh", look: [0.8, 0], tilt: 8 },
  bored: { eye: "heavy", brow: [-1, 4], mouth: "meh", tilt: 5 },
  happy: { eye: "happy", brow: [-5, -3], mouth: "smile", blush: 0.35 },
  sniffy: { eye: "dot", brow: [-5, 2], mouth: "mm", nred: 0.6, flare: 0.3, blush: 0.2 },
  beam: { eye: "happy", brow: [-7, -5], mouth: "tada", blush: 0.5 },
};

// ---------------- rig geometry (shared by the drawing and the exported contracts) ----------------
type Xf = (P: P2) => P2;
const rotAbout = (P: P2, c: P2, a: number): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
const bodyXf = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => { const r = rotAbout(P, [300, L.hipY], a); return [r[0] + dx, r[1] + dy]; }; };
const bodyInv = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => rotAbout([P[0] - dx, P[1] - dy], [300, L.hipY], -a); };
const kOf = (face: FaceS) => Math.min(1.15, face.k ?? 1);
const headTilt = (pose: Pose, face: FaceS) => rad((FACES[face.e].tilt ?? 0) * Math.min(1, face.k ?? 1) + (pose.headTilt ?? 0));
const headShake = (face: FaceS) => (face.e === "meme" || face.e === "uhoh" || face.e === "ahh" ? ((face.shake ?? 0) % 2 ? 1.8 : -1.8) * U * (face.e === "meme" ? 1 : face.e === "ahh" ? 0.35 * kOf(face) : 0.4) : 0);
/** head frame for Pen.rot: [angle, pivot x, pivot y, dx, dy] (pivot = the neck) */
const headRot = (pose: Pose, face: FaceS): number[] => {
  const N: P2 = [300, L.chin], Nw = bodyXf(pose)(N);
  return [(pose.lean ?? 0) + headTilt(pose, face), N[0], N[1], Nw[0] - N[0] + headShake(face), Nw[1] - N[1] + (pose.headDy ?? 0)];
};
const xfOf = (r: number[]): Xf => (P) => { const q = rotAbout(P, [r[1], r[2]], r[0]); return [q[0] + r[3], q[1] + r[4]]; };
const growOf = (face: FaceS) => (face.e === "meme" ? 1 + 0.1 * kOf(face) : 1);
/** the head's canvas transform: Pen.rot (tilt about the neck, offset) then a uniform scale headK about the moved neck */
const headXf = (pose: Pose, face: FaceS, kit: Kit): Xf => {
  const H = xfOf(headRot(pose, face)), hk = kit.headK ?? 1, Nw = H([300, L.chin]);
  return (P) => { const a = H(P); return [Nw[0] + (a[0] - Nw[0]) * hk, Nw[1] + (a[1] - Nw[1]) * hk]; };
};
/** vertical shift of the face features (head pitch: - looks up / inhale, + whips down), in canvas units */
const pitchOf = (face: FaceS) => (FACES[face.e].pitch ?? 0) * Math.min(1, face.k ?? 1) * 7 * U;
const shoulder = (pose: Pose, side: 0 | 1, tw: number): P2 => [300 + (side ? 1 : -1) * (78 * tw / 86), L.sh[side][1] - (pose.shrug ?? 0)];
const armIK = (pose: Pose, side: 0 | 1, tw = 86) => {
  const S = shoulder(pose, side, tw), s = side ? 1 : -1, Hd = bodyInv(pose)(pose.hands[side]);
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
export const jointsOf = (kit: Kit, pose: Pose, face: FaceS) => {
  const B = bodyXf(pose), Hx = headXf(pose, face, kit), g = growOf(face), D = FACES[face.e], pz = pitchOf(face), tw = kit.tw ?? 86;
  const ey = L.hc + (D.eye === "meme" ? -4 : EY) * U * g + pz;
  return {
    head: Hx([300, L.hc]), mouth: Hx([300, L.hc + MOUTH_DY * U * g + pz]), nose: Hx([300, L.hc + NOSE_DY * U * g + pz]), crown: Hx([300, L.hc - 1.05 * HEAD_A * g]),
    eyes: [Hx([300 - EX * U * g, ey]), Hx([300 + EX * U * g, ey])] as [P2, P2],
    temple: [Hx([300 - 0.86 * HEAD_A * g, L.hc - 0.35 * HEAD_A]), Hx([300 + 0.86 * HEAD_A * g, L.hc - 0.35 * HEAD_A])] as [P2, P2],
    hands: [B(armIK(pose, 0, tw).hand), B(armIK(pose, 1, tw).hand)] as [P2, P2],
    feet: [legIK(pose, 0).F, legIK(pose, 1).F] as [P2, P2],
    chest: B([300, 500]),
  };
};

// ---------------- hands + things held ----------------
const drawHand = (p: Pen, kind: HandK, H: P2, ang: number, skin: string, side: 0 | 1) => {
  const u = U, r = 8.6 * u, s = side ? 1 : -1, fw = 3.7 * u, ink = 2.1 * u;
  const fing = (a: number, len: number, from = 0.25, w = fw) => {
    const b: P2 = [H[0] + Math.cos(a) * r * from, H[1] + Math.sin(a) * r * from], tip: P2 = [H[0] + Math.cos(a) * (r + len), H[1] + Math.sin(a) * (r + len)];
    limb(p, [b, tip], skin, w, ink);
  };
  const palm = (rx = r, ry = r * 0.94) => { p.ell(H[0], H[1], rx + ink, ry + ink, INK, 0); p.ell(H[0], H[1], rx, ry, skin, 0); };
  switch (kind) {
    case "open": for (let i = 0; i < 4; i++) fing(ang + (-0.6 + i * 0.4), (10 - Math.abs(i - 1.5) * 1.6) * u); fing(ang - s * 1.4, 6 * u); palm(); break;
    case "point": palm(r * 0.95, r * 0.9); fing(ang, 12 * u, 0.1, fw * 1.05); p.arc(H[0] - Math.cos(ang) * 2 * u, H[1] - Math.sin(ang) * 2 * u, r * 0.5, r * 0.4, 200, 320, 1.4 * u); break;
    case "thumb": palm(r, r * 0.92); fing(-Math.PI / 2 + s * 0.15, 8 * u, 0.2, fw * 1.1); for (let i = 0; i < 3; i++) p.arc(H[0] + s * 3 * u, H[1] - 3 * u + i * 4.4 * u, 2.6 * u, 2 * u, s > 0 ? -70 : 110, s > 0 ? 70 : 250, 1.3 * u); break;
    case "grip": case "fist": {
      palm(r * 1.05, r * 0.95);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      for (let i = 0; i < 3; i++) p.arc(H[0] + Math.cos(ang) * 3 * u + (i - 1) * 4.6 * u * nx, H[1] + Math.sin(ang) * 3 * u + (i - 1) * 4.6 * u * ny, 2.8 * u, 2.4 * u, 0, 360, 1.3 * u);
      break;
    }
    default: palm();
  }
};
/** BEAN's mug: a fat sunshine-yellow mug with a smiling sun, coffee inside (slosh -1..1 tips it + slops a splash) */
const drawMug = (p: Pen, H: P2, side: 0 | 1, light: number, slosh: number) => {
  const u = U, s = side ? 1 : -1, c: P2 = [H[0] - s * 14 * u, H[1] - 6 * u], a = slosh * 0.5;
  const R = (pts: P2[]) => rotPts(pts, a, H);
  const handle = R(ellPts(c[0] - s * 16 * u, c[1] + 1 * u, 8 * u, 9 * u, 28));
  p.poly(handle, null, 5.6 * u); p.poly(handle, null, 0);
  p.stroke(handle.concat([handle[0]]), 2.6 * u, "#ffd23f");
  const body = R(rrect(c[0] - 15 * u, c[1] - 16 * u, c[0] + 15 * u, c[1] + 16 * u, 5 * u));
  p.gradFill(body, "#ffd23f", "#e09a1c", light, 0.3); p.poly(body, null, 2.8 * u);
  p.poly(R(ellPts(c[0], c[1] - 16 * u, 15 * u, 3.6 * u, 28)), "#7a4426", 1.8 * u);
  p.poly(R(ellPts(c[0] - 4 * u, c[1] - 16.6 * u, 6 * u, 1.4 * u, 16)), "#a8683e", 0);
  const sc = R([[c[0], c[1] + 2 * u]])[0]; // the little sun print
  for (let i = 0; i < 8; i++) { const b = (i / 8) * Math.PI * 2 + a; p.stroke([[sc[0] + Math.cos(b) * 7.5 * u, sc[1] + Math.sin(b) * 7.5 * u], [sc[0] + Math.cos(b) * 10.5 * u, sc[1] + Math.sin(b) * 10.5 * u]], 1.8 * u, "#ff7a1a"); }
  p.ell(sc[0], sc[1], 6 * u, 6 * u, "#ff9a2a", 1.4 * u);
  p.arc(sc[0], sc[1] + 0.5 * u, 3 * u, 2.2 * u, 20, 160, 1.1 * u);
  p.dot(sc[0] - 2 * u, sc[1] - 1.5 * u, 0.8 * u); p.dot(sc[0] + 2 * u, sc[1] - 1.5 * u, 0.8 * u);
  if (Math.abs(slosh) > 0.25) { // coffee slopping over the rim
    const k = (Math.abs(slosh) - 0.25) / 0.75, sg = Math.sign(slosh), rim = R([[c[0] + sg * 13 * u, c[1] - 16 * u]])[0];
    const b1: P2 = [rim[0] + sg * 10 * u * k, rim[1] - 14 * u * k], b2: P2 = [rim[0] + sg * 22 * u * k, rim[1] - 10 * u * k], b3: P2 = [rim[0] + sg * 14 * u * k, rim[1] + 2 * u];
    p.poly(thru(rim, b1, b2, 8).concat(thru(b2, b3, rim, 8).slice(1)), "#8a5030", 1.8 * u);
    p.dot(rim[0] + sg * 28 * u * k, rim[1] - 22 * u * k, 3.2 * u * k, "#8a5030");
  }
};
const drawHold = (p: Pen, what: Hold, H: P2, side: 0 | 1, light: number, pose: Pose) => {
  const u = U, s = side ? 1 : -1;
  if (what === "mug") drawMug(p, H, side, light, pose.slosh ?? 0);
  else if (what === "scroll") { // a papyrus scroll held upright, with wooden knobs
    const c: P2 = [H[0] - s * 4 * u, H[1] - 18 * u];
    p.poly(rrect(c[0] - 7 * u, c[1] - 30 * u, c[0] + 7 * u, c[1] + 30 * u, 6 * u), "#f2dfa8", 2.6 * u);
    for (let i = 0; i < 3; i++) p.arc(c[0], c[1] - 18 * u + i * 16 * u, 6 * u, 2 * u, 10, 170, 1.2 * u, "#b8945a");
    for (const e of [-1, 1]) p.ell(c[0], c[1] + e * 32 * u, 4.4 * u, 3.4 * u, "#9a5a2a", 1.8 * u);
  } else if (what === "notebook") { // a little leather notebook held open: scribbles + a tiny sun sketch
    const c: P2 = [H[0] - s * 22 * u, H[1] - 8 * u], a = -s * 0.12;
    p.poly(rotPts(rrect(c[0] - 25 * u, c[1] - 19 * u, c[0] + 25 * u, c[1] + 19 * u, 3 * u), a, c), "#7a3a24", 2.6 * u);
    for (const e of [-1, 1]) p.poly(rotPts(rrect(c[0] + (e < 0 ? -22 : 1) * u, c[1] - 16 * u, c[0] + (e < 0 ? -1 : 22) * u, c[1] + 16 * u, 1.5 * u), a, c), "#fbf3dc", 1.2 * u);
    for (let i = 0; i < 4; i++) p.stroke(rotPts([[c[0] - 19 * u, c[1] - 9 * u + i * 6 * u], [c[0] - (6 + 4 * (i % 2)) * u, c[1] - 9 * u + i * 6 * u]], a, c), 1.2 * u, "#6a6a8a");
    const sp = rotPts([[c[0] + 11 * u, c[1] - 3 * u]], a, c)[0];
    p.ell(sp[0], sp[1], 4.5 * u, 4.5 * u, null, 1.3 * u);
    for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2; p.stroke([[sp[0] + Math.cos(b) * 6.5 * u, sp[1] + Math.sin(b) * 6.5 * u], [sp[0] + Math.cos(b) * 9 * u, sp[1] + Math.sin(b) * 9 * u]], 1.1 * u, "#6a6a8a"); }
    p.stroke(rotPts([[c[0] + 4 * u, c[1] + 12 * u], [c[0] + 18 * u, c[1] + 12 * u]], a, c), 1.2 * u, "#6a6a8a");
  } else if (what === "quill") { // a long white quill feather, black nib
    const a = pose.ha?.[side] ?? rad(-112 + s * 10), tip: P2 = [H[0] - Math.cos(a) * 10 * u, H[1] - Math.sin(a) * 10 * u], end: P2 = [H[0] + Math.cos(a) * 48 * u, H[1] + Math.sin(a) * 48 * u];
    const nx = -Math.sin(a), ny = Math.cos(a), mid = lerp2(H, end, 0.55);
    const vane: P2[] = [...thru(lerp2(H, end, 0.12), [mid[0] + nx * 9 * u, mid[1] + ny * 9 * u], end, 10), ...thru(end, [mid[0] - nx * 6 * u, mid[1] - ny * 6 * u], lerp2(H, end, 0.12), 10).slice(1)];
    p.poly(vane, "#fbfbf6", 2.2 * u);
    for (let i = 1; i < 6; i++) { const b = lerp2(H, end, 0.15 + i * 0.13); p.stroke([b, [b[0] + nx * 6 * u + Math.cos(a) * 3 * u, b[1] + ny * 6 * u + Math.sin(a) * 3 * u]], 1 * u, "#c8c8d8"); }
    p.stroke([tip, end], 1.6 * u);
    p.dot(tip[0], tip[1], 1.6 * u, INK);
  } else if (what === "pointer") { // a long wooden lecture pointer, red rubber tip
    const a = pose.ha?.[side] ?? rad(-60), end: P2 = [H[0] + Math.cos(a) * 110 * u, H[1] + Math.sin(a) * 110 * u];
    limb(p, [[H[0] - Math.cos(a) * 8 * u, H[1] - Math.sin(a) * 8 * u], end], "#c89058", 3.2 * u, 1.4 * u);
    p.dot(end[0], end[1], 3.4 * u, INK); p.dot(end[0], end[1], 2.2 * u, "#e04848");
  } else { // teddy
    const c: P2 = [H[0] - s * 10 * u, H[1] - 14 * u];
    for (const e of [-1, 1]) p.ell(c[0] + e * 9 * u, c[1] - 14 * u, 5 * u, 5 * u, "#b8784a", 1.8 * u);
    p.ell(c[0], c[1] + 12 * u, 12 * u, 13 * u, "#b8784a", 2 * u);
    p.ell(c[0], c[1] - 5 * u, 12 * u, 11 * u, "#c8885a", 2 * u);
    p.ell(c[0], c[1] - 1 * u, 5 * u, 3.6 * u, "#f0d0a8", 1.2 * u);
    p.dot(c[0] - 4.5 * u, c[1] - 7 * u, 1.4 * u); p.dot(c[0] + 4.5 * u, c[1] - 7 * u, 1.4 * u); p.dot(c[0], c[1] - 2 * u, 1.4 * u);
  }
};

// ---------------- hair ----------------
const capHair = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, cut: number, u: number, light: number, thick: number, fringe: (xR: number, yR: number, xL: number, yL: number) => P2[], scale = 1.05) => {
  const n = hp.length, cutY = hc - cut * H.b, run: P2[] = [];
  for (let i = Math.floor(n / 2); i < n; i++) if (hp[i][1] < cutY) run.push([cx + (hp[i][0] - cx) * scale, hc + (hp[i][1] - hc) * scale]);
  if (run.length < 4) return;
  const [xR, yR] = run[run.length - 1], [xL, yL] = run[0];
  const pts = [...run, ...fringe(xR, yR, xL, yL)];
  p.shadedFill(pts, k.hair, mul(k.hair, SH_HAIR), light, H.a, 0.35);
  p.clip(pts, () => { const a = (light * 180) / Math.PI; p.arc(cx, hc - 4 * u, 0.8 * H.a, 0.78 * H.b, a - 24, a + 24, 3.6 * u, mix(k.hair, WHITE, 0.35)); });
  p.inkRing(pts, 4.2 * u, thick, 0.45);
};
/** a pointed hair lock from the head rim at angle a (deg), length len, bent toward dir */
const lock = (p: Pen, col: string, cx: number, hc: number, H: Blob, a: number, len: number, dir: number, curl: number, u: number, w = 0.15) => {
  const ar = rad(a), b0: P2 = [cx + Math.cos(ar - w) * H.a * 0.9, hc + Math.sin(ar - w) * H.b * 0.9], b1: P2 = [cx + Math.cos(ar + w) * H.a * 0.9, hc + Math.sin(ar + w) * H.b * 0.9];
  const M: P2 = [cx + Math.cos(ar) * H.a, hc + Math.sin(ar) * H.b], tip: P2 = [M[0] + Math.cos(dir) * len, M[1] + Math.sin(dir) * len];
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const c0: P2 = [lerp(b0[0], tip[0], 0.55) + nx * curl, lerp(b0[1], tip[1], 0.55) + ny * curl], c1: P2 = [lerp(b1[0], tip[0], 0.55) + nx * curl * 0.6, lerp(b1[1], tip[1], 0.55) + ny * curl * 0.6];
  p.poly([...qbez(b0, c0, tip, 8), ...qbez(tip, c1, b1, 8).slice(1)], col, 3.6 * u);
};
const bowAt = (p: Pen, x: number, y: number, u: number, col: string) => {
  for (const sd of [-1, 1]) p.poly([[x, y], [x + sd * 16 * u, y - 10 * u], [x + sd * 16 * u, y + 10 * u]], col, 2.4 * u);
  p.ell(x, y, 5 * u, 5 * u, col, 2.2 * u);
};
/** BEAN's two morning cowlicks (front + back views); blow streams them straight up */
const tufts = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, u: number, blow: number, mirror: number) => {
  for (const [dx, h, bend] of [[-14, 30, -1], [10, 40, 1]] as [number, number, number][]) {
    const b = bend * mirror, base: P2 = [cx + dx * mirror * u, hc - H.b * 0.9], tip: P2 = [base[0] + b * 22 * u * (1 - 0.7 * blow), base[1] - h * u * (1 + 0.5 * blow)];
    const ctl: P2 = [base[0] - b * 6 * u, base[1] - h * 0.75 * u];
    const pts: P2[] = [...thru([base[0] - 9 * u, base[1]], [ctl[0] - 5 * u, ctl[1]], tip, 10), ...thru(tip, [ctl[0] + 6 * u, ctl[1] + 4 * u], [base[0] + 9 * u, base[1]], 10).slice(1)];
    p.poly(pts, k.hair, 3.8 * u);
    p.stroke(thru([base[0], base[1] - 4 * u], [ctl[0], ctl[1] + 4 * u], lerp2(base, tip, 0.8), 8), 1.6 * u, mix(k.hair, WHITE, 0.3));
  }
};
/** behind-the-head hair masses (drawn before the face / back of the head) */
const hairBack = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, u: number, blow: number, light: number, thick: number) => {
  const hs = k.hairStyle, dk = mul(k.hair, [0.86, 0.84, 0.88]);
  if (hs === "bed") { // BEAN's bed hair: wild locks round the crown, one side squashed by the pillow; blow streams them up
    const n = 11;
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), a = 196 + f * 148 + (rnd(k.seed, i) - 0.5) * 10, flat = f < 0.28 ? 0.45 : 1;
      const Lh = (16 + 18 * rnd(k.seed, i + 3)) * u * flat * (f > 0.85 ? 0.6 : 1) * (1 + 1.6 * blow);
      let dir = rad(a) + (rnd(k.seed, i + 9) - 0.5) * 0.7 + (f < 0.28 ? 0.5 : 0);
      dir = lerp(dir, -Math.PI / 2 + (f - 0.5) * 1.5, blow);
      lock(p, i % 3 === 1 ? dk : k.hair, cx, hc, H, a, Lh, dir, (i % 2 ? 1 : -1) * 10 * u * (1 - 0.8 * blow), u);
    }
  } else if (hs === "bald") { // Aristotle: fluffy white puffs over the ears (behind the head rim)
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = cx + sd * (0.98 + 0.05 * Math.sin(i * 2)) * H.a + sd * blow * 6 * u, y = hc + (-0.32 + 0.24 * i) * H.b - blow * 10 * u, r = (15 - 2 * i) * u;
      const pt = ellPts(x, y, r, r * 0.9, 22);
      p.inkRing(pt, 3.8 * u, thick, 0.4); p.poly(shrink(pt, 0.94), k.hair, 0);
      p.arc(x - sd * 3 * u, y - 3 * u, r * 0.5, r * 0.4, 200, 300, 1.6 * u, "#c8ccd8");
    }
  } else if (hs === "afro") { // big 1970s hair: a puffy scalloped cloud round the top half
    const ring: P2[] = [];
    for (let i = 0; i <= 26; i++) { const a = rad(160 + (i / 26) * 220), r = 1.34 + 0.06 * Math.sin(i * 2.7 + k.seed) + 0.2 * blow * Math.max(0, -Math.sin(a)); ring.push([cx + Math.cos(a) * H.a * r * 1.08, hc - 0.12 * H.b + Math.sin(a) * H.b * r]); }
    const sm: P2[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a0 = ring[i], a1 = ring[i + 1], m = lerp2(a0, a1, 0.5), dx = m[0] - cx, dy = m[1] - hc, l = Math.hypot(dx, dy) || 1;
      sm.push(...qbez(a0, [m[0] + (dx / l) * 14 * u, m[1] + (dy / l) * 14 * u], a1, 5).slice(0, -1));
    }
    sm.push(ring[ring.length - 1], [cx + 0.95 * H.a, hc + 0.45 * H.b], [cx - 0.95 * H.a, hc + 0.45 * H.b]);
    p.inkRing(sm, 4.4 * u, thick, 0.4); p.shadedFill(sm, k.hair, mul(k.hair, SH_HAIR), light, H.a * 1.3, 0.35);
    for (let i = 0; i < 9; i++) { const a = rad(195 + i * 19), r = 1.15; p.arc(cx + Math.cos(a) * H.a * r, hc - 0.1 * H.b + Math.sin(a) * H.b * r, 9 * u, 7 * u, 180, 330, 1.6 * u, mix(k.hair, WHITE, 0.25)); }
  } else if (hs === "bun") { // a top-knot bun with a scrunchie
    const by = hc - 1.1 * H.b - 10 * u, bx = cx + 6 * u;
    p.ell(bx, by, 30 * u, 26 * u, k.hair, 3.8 * u);
    p.arc(bx - 6 * u, by - 4 * u, 18 * u, 14 * u, 200, 300, 2 * u, mix(k.hair, WHITE, 0.3));
    p.poly(rrect(bx - 22 * u, by + 14 * u, bx + 22 * u, by + 24 * u, 4 * u), k.bow ?? "#ff6fa8", 2.4 * u);
  } else if (hs === "pigtails") {
    for (const sd of [-1, 1]) {
      const x = cx + sd * 1.02 * H.a, y = hc - 0.15 * H.b, tx = x + sd * 34 * u * (1 - 0.3 * blow), ty = y + 26 * u - 40 * u * blow;
      p.poly([...thru([x, y - 12 * u], [x + sd * 30 * u, y - 16 * u], [tx, ty], 8), ...thru([tx, ty], [x + sd * 12 * u, y + 30 * u], [x, y + 12 * u], 8).slice(1)], k.hair, 3.6 * u);
      p.ell(x + sd * 4 * u, y, 7 * u, 7 * u, k.bow ?? "#ffd23f", 2.2 * u);
    }
  } else if (hs === "long" || hs === "bob") { // hair hanging behind
    const lo = hs === "long" ? 0.95 : 0.55;
    const pts: P2[] = [...thru([cx - 1.12 * H.a, hc + lo * H.b], [cx - 1.24 * H.a, hc - 0.4 * H.b], [cx, hc - 1.14 * H.b], 14), ...thru([cx, hc - 1.14 * H.b], [cx + 1.24 * H.a, hc - 0.4 * H.b], [cx + 1.12 * H.a, hc + lo * H.b], 14).slice(1),
      ...thru([cx + 1.12 * H.a, hc + lo * H.b], [cx, hc + (lo + 0.08) * H.b], [cx - 1.12 * H.a, hc + lo * H.b], 10).slice(1, -1)];
    p.inkRing(pts, 4.2 * u, thick); p.shadedFill(pts, dk, mul(k.hair, SH_HAIR), light, H.a);
  } else if (hs === "curly") {
    for (let i = 0; i < 12; i++) {
      const a = rad(150 + (i / 11) * 240), x = cx + Math.cos(a) * H.a * 1.02, y = hc + Math.sin(a) * H.b * 1.02, r = (14 + 3 * rnd(k.seed, i)) * u;
      const pt = ellPts(x, y, r, r * 0.92, 22);
      p.inkRing(pt, 3.8 * u, thick, 0.4); p.poly(shrink(pt, 0.94), k.hair, 0);
      p.arc(x - 3 * u, y - 3 * u, r * 0.45, r * 0.4, 200, 280, 1.6 * u, mix(k.hair, WHITE, 0.3));
    }
  } else if (hs === "under") { // Bacon: wavy chin-length hair under the hat
    for (const sd of [-1, 1]) {
      const q: P2[] = [[cx + sd * 0.8 * H.a, hc - 0.6 * H.b], [cx + sd * 1.18 * H.a, hc - 0.2 * H.b], [cx + sd * 1.2 * H.a, hc + 0.3 * H.b], [cx + sd * 1.12 * H.a, hc + 0.66 * H.b], [cx + sd * 0.9 * H.a, hc + 0.55 * H.b], [cx + sd * 0.86 * H.a, hc]];
      p.poly(thru(q[0], q[1], q[2], 6).concat(thru(q[2], q[3], q[4], 6).slice(1), [q[5]]), k.hair, 3.6 * u);
      for (let i = 0; i < 3; i++) p.arc(cx + sd * (1.0 + 0.04 * i) * H.a, hc + (-0.1 + 0.22 * i) * H.b, 8 * u, 6 * u, sd > 0 ? -80 : 100, sd > 0 ? 60 : 240, 1.4 * u, mix(k.hair, WHITE, 0.25));
    }
  } else if (hs === "spiky") {
    for (let i = 0; i < 9; i++) { const a = 200 + i * 17.5; lock(p, k.hair, cx, hc, H, a, (16 + 8 * rnd(k.seed, i)) * u * (1 + blow), rad(a) * (1 - blow) + blow * (-Math.PI / 2), 0, u, 0.2); }
  }
};
const hairFront = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, u: number, blow: number, light: number, thick: number) => {
  const hs = k.hairStyle;
  if (hs === "bed") {
    capHair(p, k, hp, cx, hc, H, 0.38, u, light, thick, (xR, yR, xL, yL) => {
      const out: P2[] = [], m = 7;
      for (let j = 1; j < m; j++) { const f = j / m; out.push([lerp(xR, xL, f) + (j % 2 ? 7 : 0) * u, lerp(yR, yL, f) + (j % 2 ? (13 + 7 * rnd(k.seed, j)) * u * (1 - 0.85 * blow) : -2 * u * blow)]); }
      return out;
    });
    tufts(p, k, cx, hc, H, u, blow, 1);
  } else if (hs === "bald") { // Aristotle: a shining dome, white tufts above the ears
    p.arc(cx - 0.35 * H.a, hc - 0.62 * H.b, 0.3 * H.a, 0.16 * H.b, 200, 290, 4 * u, "rgba(255,255,255,0.7)");
  } else if (hs === "afro" || hs === "short") {
    capHair(p, k, hp, cx, hc, H, hs === "afro" ? 0.46 : 0.5, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR + 2 * u], [cx + 18 * u, hc - 0.36 * H.b], [xL, yL + 2 * u], 12).slice(1, -1));
    if (hs === "afro") for (const sd of [-1, 1]) p.poly([[cx + sd * 0.94 * H.a, hc - 0.4 * H.b], [cx + sd * 1.02 * H.a, hc + 0.05 * H.b], [cx + sd * 0.9 * H.a, hc + 0.36 * H.b], [cx + sd * 0.8 * H.a, hc - 0.1 * H.b]], k.hair, 3 * u); // sideburns
  } else if (hs === "bun") {
    capHair(p, k, hp, cx, hc, H, 0.42, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR], [cx - 10 * u, hc - 0.5 * H.b], [xL, yL], 12).slice(1, -1));
    for (const sd of [-1, 1]) limb(p, thru([cx + sd * 0.86 * H.a, hc - 0.35 * H.b], [cx + sd * 1.0 * H.a, hc - 0.05 * H.b], [cx + sd * 0.9 * H.a, hc + 0.25 * H.b], 8), k.hair, 4 * u, 1.6 * u);
  } else if (hs === "pigtails" || hs === "bob" || hs === "long") {
    capHair(p, k, hp, cx, hc, H, hs === "pigtails" ? 0.36 : 0.3, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR + 4 * u], [cx + 4 * u, hc - 0.24 * H.b], [xL, yL + 4 * u], 12).slice(1, -1));
  } else if (hs === "spiky") {
    capHair(p, k, hp, cx, hc, H, 0.46, u, light, thick, (xR, yR, xL, yL) => { const out: P2[] = []; for (let j = 1; j < 8; j++) { const f = j / 8; out.push([lerp(xR, xL, f), lerp(yR, yL, f) + (j % 2 ? 14 : 0) * u]); } return out; });
  } else if (hs === "curly") {
    capHair(p, k, hp, cx, hc, H, 0.5, u, light, thick, (xR, yR, xL, yL) => { const out: P2[] = []; for (let j = 1; j < 8; j++) { const f = j / 8; out.push([lerp(xR, xL, f), lerp(yR, yL, f) + (j % 2 ? 9 : 0) * u]); } return out; });
    for (let i = 0; i < 6; i++) p.arc(cx + (i - 2.5) * 15 * u, hc - 0.74 * H.b + Math.abs(i - 2.5) * 3 * u, 6 * u, 5 * u, 180, 400, 1.6 * u, mul(k.hair, [0.5, 0.5, 0.56]));
    if (k.bow) bowAt(p, cx + 0.62 * H.a, hc - 0.8 * H.b, u, k.bow);
  } else if (hs === "tuft") { // toddler: one curl on top
    const base: P2 = [cx - 4 * u, hc - H.b * 0.98];
    limb(p, [...thru(base, [base[0] - 6 * u, base[1] - 16 * u * (1 + blow)], [base[0] + 8 * u, base[1] - 22 * u * (1 + blow)], 10), [base[0] + 12 * u, base[1] - 14 * u], [base[0] + 4 * u, base[1] - 12 * u]], k.hair, 4.6 * u, 1.8 * u);
  }
};
/** laurel wreath round the brow */
const laurel = (p: Pen, cx: number, hc: number, H: Blob, u: number, back: boolean) => {
  for (const sd of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const f = i / 5, a = rad(sd > 0 ? -6 - f * 74 : 186 + f * 74) * (back ? -1 : 1);
      const x = cx + Math.cos(a) * H.a * 1.02, y = hc - 0.12 * H.b + Math.sin(a) * H.b * 0.6;
      const dir = a + (back ? 1 : -1) * sd * Math.PI / 2;
      for (const o of [-1, 1]) {
        const la = dir + o * 0.6, lx = x + Math.cos(la) * 9 * u, ly = y + Math.sin(la) * 9 * u;
        p.poly(ellPts(lx, ly, 9 * u, 4.2 * u, 16, la), i % 2 ? "#5e9e32" : "#86c24a", 1.8 * u);
      }
    }
  }
};
/** Bacon's tall black capotain hat */
const tallHat = (p: Pen, cx: number, hc: number, H: Blob, u: number, light: number, thick: number) => {
  const by = hc - 0.9 * H.b, top = by - 112 * u, w0 = 0.86 * H.a, w1 = 0.7 * H.a;
  const crown: P2[] = [[cx - w0, by + 4 * u], [cx - w1, top + 10 * u], ...thru([cx - w1, top + 6 * u], [cx, top - 4 * u], [cx + w1, top + 6 * u], 12), [cx + w1, top + 10 * u], [cx + w0, by + 4 * u]];
  p.inkRing(crown, 4.4 * u, thick, 0.4); p.shadedFill(crown, "#2e2834", "#141018", light, H.a, 0.3);
  p.poly([[cx - w0 * 0.97, by - 22 * u], [cx + w0 * 0.97, by - 22 * u], [cx + w0, by - 4 * u], [cx - w0, by - 4 * u]], "#8a6a3a", 2.2 * u); // band
  p.poly(rrect(cx - 9 * u, by - 24 * u, cx + 9 * u, by - 2 * u, 2 * u), "#e8c45a", 2 * u); // buckle
  p.poly(rrect(cx - 4.5 * u, by - 19 * u, cx + 4.5 * u, by - 7 * u, 1 * u), "#2e2834", 0);
  p.arc(cx - w1 * 0.55, top + 40 * u, 10 * u, 30 * u, 200, 250, 3 * u, "rgba(255,255,255,0.22)");
  const brim = ellPts(cx, by + 2 * u, 1.24 * H.a, 13 * u, 40);
  p.inkRing(brim, 4.2 * u, thick, 0.4); p.poly(shrink(brim, 0.985), "#262029", 0);
  p.arc(cx, by - 2 * u, 1.2 * H.a, 9 * u, 200, 340, 2 * u, "rgba(255,255,255,0.18)");
};

// ---------------- faces ----------------
const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: P2, shake: number, k: number, skin: string) => {
  const lx = x + look[0] * 2.6 * u, ly = ey + look[1] * 2.4 * u, w = 3.9 * u;
  switch (kind) {
    case "dot": case "up": { const yy = ly - (kind === "up" ? 2.5 * u : 0); p.ell(lx, yy, 4.7 * u, 6.6 * u, INK, 0); p.dot(lx - 1.5 * u, yy - 2.6 * u, 1.5 * u, WHITE); break; }
    case "wide": p.ell(x, ey - u, 9.6 * u, 11.2 * u, WHITE, 2.6 * u); p.ell(lx, ly, 4.6 * u, 5.8 * u, INK, 0); p.dot(lx - 1.6 * u, ly - 2.2 * u, 1.6 * u, WHITE); break;
    case "tiny": p.ell(x, ey - u, 10.4 * u, 11.6 * u, WHITE, 2.6 * u); p.dot(x + (shake % 2 ? 0.6 : -0.6) * u, ey, 1.8 * u); break;
    case "cross": // both pupils toward the nose and down
      p.ell(x, ey - u, 9.4 * u, 10.6 * u, WHITE, 2.6 * u);
      p.ell(x - side * 4 * u, ey + 3.4 * u, 4.2 * u, 5 * u, INK, 0); p.dot(x - side * 4 * u - 1.3 * u, ey + 1.4 * u, 1.3 * u, WHITE); break;
    case "lid": p.ell(lx, ey + 0.6 * u, 5 * u, 5.4 * u, INK, 0, 0, 180); p.stroke([[x - 8.5 * u, ey + 0.4 * u], [x + 8.5 * u, ey + 0.4 * u]], w); break;
    case "heavy": p.ell(lx, ey + 3 * u, 4.6 * u, 3.4 * u, INK, 0, 0, 180); p.stroke([[x - side * 7 * u, ey + 2.2 * u], [x + side * 9 * u, ey + 4.2 * u]], w * 1.1); break;
    case "sleepy": // drowsy half-lids with a droopy lash
      p.ell(lx, ey + 2.6 * u, 4.8 * u, 4 * u, INK, 0, 0, 180);
      p.stroke(thru([x - 9 * u, ey + 1.6 * u], [x, ey + 0.2 * u], [x + 9 * u, ey + 1.6 * u], 8), w * 1.05);
      p.stroke([[x + side * 8 * u, ey + 1.6 * u], [x + side * 11 * u, ey + 3.6 * u]], 1.8 * u);
      break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6.6 * u, 200, 340, w); break;
    case "closed": p.arc(x, ey - 2 * u, 8 * u, 5 * u, 20, 160, w); break;
    case "squint": // screwed up against the glare: a hard lid line, a sliver of pupil, cheek pushed up
      p.stroke(thru([x - 9.5 * u, ey + 0.5 * u], [x, ey - 1.8 * u], [x + 9.5 * u, ey + 1.5 * u], 8), w * 1.2);
      p.ell(x + side * 0.5 * u, ey + 2.2 * u, 3.6 * u, 1.6 * u, INK, 0, 0, 180);
      p.stroke(thru([x - 7 * u, ey + 5.4 * u], [x, ey + 3.6 * u], [x + 7 * u, ey + 5.4 * u], 8), 2 * u);
      break;
    case "ahh": { // the pre-sneeze flutter: eyes roll up, the lids sink as k grows
      const lid = 0.25 + 0.55 * cl01(k), top = ey - 10.6 * u, bot = ey + 9.6 * u, lidY = lerp(top, bot, lid);
      const wpts = ellPts(x, ey - u, 9.2 * u, 10.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        p.ell(x + side * 0.6 * u, ey - 6.5 * u, 4.4 * u, 5.4 * u, INK, 0);
        p.poly([[x - 12 * u, top - 4 * u], [x + 12 * u, top - 4 * u], [x + 12 * u, lidY], [x - 12 * u, lidY]], mul(skin, [0.95, 0.88, 0.88]), 0);
      });
      p.poly(wpts, null, 2.6 * u);
      p.stroke(thru([x - 9.4 * u, lidY + 0.5 * u], [x, lidY + 1.6 * u], [x + 9.4 * u, lidY + 0.5 * u], 8), w * 0.95);
      for (let i = 0; i < 3; i++) p.stroke([[x + (i - 1) * 5 * u, lidY + 1.4 * u], [x + (i - 1) * 5.8 * u, lidY + 4.4 * u]], 1.5 * u);
      break;
    }
    case "shut": { const o = side * 8 * u; p.stroke([[x + o, ey - 6 * u], [x - side * 6.5 * u, ey + 0.4 * u], [x + o, ey + 6 * u]], w * 1.25); break; }
    case "meme": { // THE squeeze: huge >< with deep creases
      const o = side * 10.5 * u;
      p.stroke([[x + o, ey - 9.5 * u], [x - side * 8.5 * u, ey + 0.5 * u], [x + o, ey + 9.5 * u]], w * 1.55);
      for (const a of [-1, 0, 1]) p.stroke([[x + side * 13.5 * u, ey + a * 7 * u], [x + side * 19 * u, ey + a * 11 * u]], 2.2 * u);
      break;
    }
  }
};
/** the nose: a soft bulb with nostrils. flare widens + darkens the nostrils, red heats it up, scrunch adds wrinkles */
const nose = (p: Pen, kit: Kit, nx: number, ny: number, u: number, flare: number, red: number, scrunch: number, twitch: number, light: number) => {
  const kind = kit.noseKind ?? "button", nk = kit.noseK ?? 1, s = nk * (1 + 0.16 * cl01(flare)), x = nx + twitch * 2.2 * u;
  const rx = (kind === "bulb" ? 9.5 : 7.4) * u * s, ry = (kind === "bulb" ? 7.6 : 6.2) * u * s;
  const base = mix(mul(kit.skin, [0.97, 0.88, 0.86]), "#ff4a3a", 0.7 * cl01(red));
  if (red > 0.02) glow(p, x, ny, rx * 2.4, "#ff6a40", 0.55 * cl01(red));
  if (kind === "long") limb(p, [[x - 1.5 * u, ny - 15 * u], [x - 0.5 * u, ny - 4 * u]], mul(kit.skin, [0.95, 0.88, 0.86]), 5 * u, 1.3 * u);
  else if (kind === "bulb") p.arc(x + 1 * u, ny - 8 * u, 5 * u, 7 * u, 150, 230, 2.2 * u);
  p.shadedFill(ellPts(x, ny, rx, ry, 30), base, mul(base, [0.86, 0.8, 0.82]), light, rx, 0.4);
  p.arc(x, ny, rx, ry, 15, 165, 2.6 * u);
  p.dot(x - rx * 0.35, ny - ry * 0.35, 1.6 * u * s, "rgba(255,255,255,0.8)");
  const nr = (1.3 + 2.0 * cl01(flare)) * u * nk, nh = nr * (1.15 + 0.3 * cl01(flare));
  for (const sd of [-1, 1]) {
    p.ell(x + sd * rx * 0.42, ny + ry * 0.42, nr, nh * 0.8, INK, 0, 0, 360, sd * 20);
    if (flare > 0.4) p.arc(x + sd * rx * 0.95, ny + ry * 0.1, 3 * u, 4 * u, sd > 0 ? -60 : 120, sd > 0 ? 60 : 240, 1.6 * u); // nostril wings
  }
  if (scrunch > 0.05) for (let i = 0; i < 3; i++) p.arc(x, ny - ry - (3 + i * 3.4) * u, (4.6 - i * 0.6) * u * (0.6 + 0.4 * scrunch), 1.8 * u, 200, 340, 1.5 * u);
};
const dmouth = (p: Pen, pts: P2[], inner: () => void, ink: number) => { p.poly(pts, MOUTH, 0); p.clip(pts, inner); p.poly(pts, null, ink); };
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5 * u, my], [mx + 5 * u, my]], mw); break;
    case "flat": p.stroke([[mx - 9.5 * u, my + 1.5 * u], [mx + 9.5 * u, my + 1.5 * u]], mw); break;
    case "mm": p.arc(mx, my - 2 * u, 5.5 * u, 3.2 * u, 25, 155, 3.4 * u); break;
    case "meh": { const s: P2[] = []; for (let i = 0; i <= 10; i++) s.push([mx - 4 * u + i * 1.6 * u, my + 2 * u - i * 0.35 * u + 1.1 * u * Math.sin(i * 1.4)]); p.stroke(s, 3.4 * u); break; }
    case "smirk": p.arc(mx + 4 * u, my - 4 * u, 8 * u, 4.5 * u, 10, 120, mw); p.stroke([[mx - 6 * u, my - 0.4 * u], [mx + 3 * u, my + 0.6 * u]], mw); break;
    case "smug": p.stroke(thru([mx - 12 * u, my - 2 * u], [mx - 1 * u, my + 4.5 * u], [mx + 13 * u, my - 6 * u], 10), mw); p.arc(mx + 15 * u, my - 6 * u, 3 * u, 3 * u, 100, 260, 2 * u); break;
    case "smile": p.arc(mx, my - 3 * u, 8.5 * u, 5 * u, 20, 160, mw); break;
    case "o": p.ell(mx, my + u, 3.8 * u, 4.6 * u, MOUTH, 2.8 * u); break;
    case "bigO": dmouth(p, ellPts(mx, my + 3 * u, 8 * u, 10 * u, 30), () => p.ell(mx, my + 11 * u, 5 * u, 3.4 * u, TONGUE, 0), 3 * u); break;
    case "grin": {
      const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 10 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)];
      p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 13 * u, my - 0.5 * u], [mx + 13 * u, my - 0.5 * u]], 1.3 * u); break;
    }
    case "grimace": { // clenched teeth against the glare
      p.poly(rrect(mx - 12 * u, my - 4 * u, mx + 12 * u, my + 5 * u, 3.5 * u), WHITE, 3 * u); p.stroke([[mx - 11 * u, my + 0.5 * u], [mx + 11 * u, my + 0.5 * u]], 1.3 * u);
      for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.4 * u, my - 3.4 * u], [mx + i * 4.4 * u, my + 4.4 * u]], 1.1 * u);
      break;
    }
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.8 * u * Math.sin(i * 1.5 + (shake % 2) * 0.7)]); p.stroke(s, 3.2 * u); p.stroke([[mx + 9 * u, my], [mx + 11.5 * u, my - 3 * u]], 3 * u); break; }
    case "ah": { // the "ah... ah..." gasp: an open oval that grows taller with k
      const kk = cl01(k), w = (6 + 3 * kk) * u, h = (5.5 + 9 * kk) * u;
      dmouth(p, ellPts(mx, my + h * 0.35, w, h, 30), () => p.ell(mx, my + h * 1.15, w * 0.7, h * 0.4, TONGUE, 0), 3 * u);
      break;
    }
    case "choo": { // the blast: a wide shouting mouth, top teeth, tongue
      const s = 0.75 + 0.25 * cl01(k), w = 17 * u * s, d = 15 * u * s, top = my - 4 * u;
      const pts: P2[] = [...thru([mx - w, top], [mx, top - 3 * u], [mx + w, top], 10)];
      for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; pts.push([mx + w * Math.cos(a), top + d * Math.sin(a)]); }
      dmouth(p, pts, () => { p.poly([[mx - w, top - 8 * u], [mx + w, top - 8 * u], [mx + w, top + 3.4 * u], [mx - w, top + 3.4 * u]], WHITE, 0); p.ell(mx + 2 * u, top + d * 0.95, w * 0.55, d * 0.42, TONGUE, 0); }, 3 * u);
      break;
    }
    case "tada": {
      const w = 17 * u, d = 16 * u, top = my - 4 * u;
      const pts: P2[] = [...thru([mx - w, top - 2 * u], [mx, top + 1 * u], [mx + w, top - 2 * u], 10), ...Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI; return [mx + w * Math.cos(a), top - 2 * u + d * Math.sin(a)] as P2; }).slice(1)];
      dmouth(p, pts, () => { p.poly([[mx - w, top - 8 * u], [mx + w, top - 8 * u], [mx + w, top + 3.6 * u], [mx - w, top + 3.6 * u]], WHITE, 0); p.ell(mx + 1.5 * u, top + d * 0.95, w * 0.55, d * 0.42, TONGUE, 0); }, 3 * u);
      break;
    }
    case "mega": { // THE MEME "CHOO!": a colossal trapezoid shout, top teeth, the tongue flapping sideways, uvula
      const s = 0.55 + 0.45 * Math.min(1.12, k), w = 31 * u * s, wb = 22 * u * s, d = 29 * u * s, top = my - 4 * u * s, wob = ((shake % 3) - 1) * 1.8 * u;
      const pts: P2[] = [...thru([mx - w, top - 3 * u], [mx, top + 3 * u], [mx + w, top - 3 * u], 12)];
      pts.push(...thru([mx + w, top - 3 * u], [mx + w * 0.98, top + d * 0.6], [mx + wb, top + d], 8).slice(1));
      pts.push(...thru([mx + wb, top + d], [mx, top + d * 1.1], [mx - wb, top + d], 10).slice(1));
      pts.push(...thru([mx - wb, top + d], [mx - w * 0.98, top + d * 0.6], [mx - w, top - 3 * u], 8).slice(1, -1));
      dmouth(p, pts, () => {
        const g = p.g, [ax, ay] = p.P(mx, top), [bx, by] = p.P(mx, top + d);
        const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, THROAT); gr.addColorStop(1, MOUTH);
        g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
        p.poly([...thru([mx - w, top - 10 * u], [mx, top - 4 * u], [mx + w, top - 10 * u], 10), [mx + w, top + 3 * u], ...thru([mx + w * 0.9, top + 5 * u], [mx, top + 10 * u], [mx - w * 0.9, top + 5 * u], 10), [mx - w, top + 3 * u]], WHITE, 0);
        for (let i = -3; i <= 3; i++) p.stroke([[mx + i * w * 0.24, top - 2 * u], [mx + i * w * 0.24, top + (7 - Math.abs(i) * 0.6) * u]], 1.3 * u, "#c8c2cc");
        p.ell(mx, top + 12 * u, 2.6 * u, 3.6 * u, "#c8404e", 0);
        p.poly([...thru([mx - wb * 0.9 + wob, top + d * 1.02], [mx - 4 * u + wob, top + d * 0.52], [mx + wb * 0.5 + wob, top + d * 0.6], 10), ...thru([mx + wb * 0.5 + wob, top + d * 0.6], [mx + wb * 0.4, top + d * 1.1], [mx - wb * 0.9 + wob, top + d * 1.02], 10).slice(1)], TONGUE, 0);
        p.stroke([[mx - 6 * u + wob, top + d * 0.66], [mx - 2 * u + wob, top + d * 0.86]], 1.4 * u, "#d8505e");
      }, 3.6 * u);
      break;
    }
  }
};
const drawFace = (p: Pen, kit: Kit, cx: number, hc: number, H: Blob, f: FaceS, lid: number, g: number, light: number) => {
  const D = FACES[f.e], u = U * g, look = f.look ?? D.look ?? [0, 0], shake = f.shake ?? 0, k = f.k ?? 1, kk = Math.min(1, k);
  const pz = pitchOf(f);
  const ey = hc + (D.eye === "meme" ? -4 : EY) * u + pz, ex = EX * u;
  if (D.puff) for (const side of [-1, 1]) { // puffed cheeks: round strain lines
    const x = cx + side * 0.62 * H.a, y = hc + 0.3 * H.b + pz;
    p.arc(x, y, 0.3 * H.a, 0.3 * H.b, side > 0 ? -40 : 140, side > 0 ? 60 : 240, 2.4 * u);
  }
  if (D.tears) for (const side of [-1, 1]) { // squeezed-out tear beads at the eye corners
    const x0 = cx + side * (ex + 14 * u), y0 = ey + 9 * u;
    p.poly([[x0, y0 - 5 * u], [x0 + side * 3.5 * u, y0 + 2 * u], [x0, y0 + 5 * u], [x0 - side * 3.5 * u, y0 + 2 * u]], TEAR, 1.6 * u);
  }
  for (const side of [-1, 1]) {
    let ek = D.eye;
    if (lid >= 1 && !["happy", "closed", "shut", "meme", "squint", "ahh"].includes(ek)) ek = "closed";
    else if (lid > 0 && (ek === "dot" || ek === "up" || ek === "wide" || ek === "cross")) ek = "lid";
    else if (lid > 0 && ek === "lid") ek = "heavy";
    const x = cx + side * ex;
    eye(p, ek, x, ey, u, side, look, shake, k, kit.skin);
    if (kit.lashes && (ek === "dot" || ek === "wide" || ek === "up" || ek === "cross")) for (const a of [-0.5, 0]) p.stroke([[x + side * 4 * u, ey - 6 * u + a * 4 * u], [x + side * 9 * u, ey - 9 * u + a * 6 * u]], 1.8 * u);
    if (D.crinkle && ek !== "meme") for (const a of [-28, 0, 28]) { const b = side > 0 ? rad(a) : Math.PI - rad(a); p.stroke([[x + side * 11 * u + Math.cos(b) * 1 * u, ey + Math.sin(b) * 1 * u], [x + side * 11 * u + Math.cos(b) * 6 * u, ey + Math.sin(b) * 6 * u]], 1.8 * u); }
    const bw = D.brow2 && side > 0 ? D.brow2 : D.brow, bk = f.e === "ahh" ? 0.4 + 0.6 * kk : 1;
    const by = ey - (ek === "wide" || ek === "tiny" || ek === "cross" || ek === "ahh" ? 23 : 19) * u - (kit.glasses ? 3 * u : 0);
    const bc = kit.browCol ?? INK, bt = kit.browCol ? 7.4 : 5.2, b0: P2 = [x - side * 8.5 * u, by + bw[0] * bk * u], b1: P2 = [x + side * (kit.browCol ? 11 : 8.5) * u, by + bw[1] * bk * u];
    if (kit.browCol) tapered(p, b0, b1, (bt + 3) * u, (bt * 0.5 + 3) * u, INK); // bushy white brows keep an ink rim
    tapered(p, b0, b1, bt * u, bt * 0.5 * u, bc);
  }
  if (kit.glasses) { // big square 1978 frames
    for (const side of [-1, 1]) {
      const x = cx + side * (ex + 1 * u), pts = rrect(x - 13 * u, ey - 11 * u, x + 13 * u, ey + 10 * u, 5 * u);
      p.poly(pts, "rgba(200,230,255,0.16)", 0);
      p.stroke(pts.concat([pts[0]]), 5.8 * u, INK);
      p.stroke(pts.concat([pts[0]]), 2.6 * u, kit.glasses);
      p.stroke([[x - 7 * u, ey - 6 * u], [x - 2 * u, ey - 8.5 * u]], 1.8 * u, D.flash ? WHITE : "rgba(255,255,255,0.75)");
      if (D.flash) p.stroke([[x + 2 * u, ey + 4 * u], [x + 7 * u, ey - 2 * u]], 2.4 * u, "rgba(255,255,255,0.9)");
    }
    p.stroke([[cx - 3 * u, ey - 3 * u], [cx + 3 * u, ey - 3 * u]], 3 * u);
  }
  const mx = cx + (D.mouth === "smirk" || D.mouth === "meh" ? 3 * u : 0), my = hc + (MOUTH_DY + (kit.beard === "long" ? 4 : 0)) * u + pz;
  if (kit.beard === "long") { // Aristotle's great white wavy beard (cheeks to chest), the mouth sits in it
    const bc = kit.beardCol ?? "#f4f1ea", top = hc + 0.1 * H.b + pz * 0.5, bot = hc + 1.6 * H.b;
    const rim: P2[] = [];
    for (let i = 0; i <= 16; i++) { const f2 = i / 16, x = cx - 1.0 * H.a + f2 * 2.0 * H.a, sn = Math.sin(f2 * Math.PI); rim.push([x, top + (bot - top) * Math.pow(sn, 0.7) + (i % 2 ? 9 * u * sn : 0)]); }
    const inner = thru([cx + 0.86 * H.a, top - 0.05 * H.b], [cx, my + 16 * u], [cx - 0.86 * H.a, top - 0.05 * H.b], 12);
    p.poly([[cx - 1.0 * H.a, top - 0.25 * H.b], ...rim, [cx + 1.0 * H.a, top - 0.25 * H.b], ...inner], bc, 3.6 * u);
    for (let i = -3; i <= 3; i++) p.stroke(thru([cx + i * 14 * u, my + 18 * u], [cx + i * 15 * u + 5 * u, (my + bot) / 2 + 12 * u], [cx + i * 13 * u, bot - 16 * u], 8), 1.4 * u, mix(bc, "#9aa0b8", 0.5));
  } else if (kit.beard === "goatee") { // Bacon: a neat pointed beard
    p.poly([[mx - 11 * u, my + 7 * u], [mx + 11 * u, my + 7 * u], [mx + 7 * u, my + 24 * u], [mx, my + 38 * u], [mx - 7 * u, my + 24 * u]], kit.beardCol ?? "#7a5a3a", 3 * u);
  }
  mouth(p, D.mouth, mx, my, u, k, shake);
  const fl = f.flare ?? (D.flare ?? 0) * (f.e === "ahh" ? kk : 1);
  nose(p, kit, cx, hc + NOSE_DY * u + pz, u, fl, Math.max(f.red ?? 0, D.nred ?? 0), f.scrunch ?? D.scrunch ?? 0, f.twitch ?? 0, light);
  const tache = kit.tache ?? (kit.beard ? kit.beardCol ?? (kit.beard === "long" ? "#f4f1ea" : "#7a5a3a") : null);
  if (tache) { // moustache over the mouth (lifts with an open mouth); Bacon's curls up at the tips
    const open = ["bigO", "tada", "ah", "choo", "mega"].includes(D.mouth) ? (D.mouth === "mega" ? 10 : 5) * u : 0, curl = kit.beard === "goatee";
    const pts: P2[] = [[mx - 21 * u, my - (curl ? 9 : 1) * u], [mx - 12 * u, my - 10 * u], [mx, my - 8 * u], [mx + 12 * u, my - 10 * u], [mx + 21 * u, my - (curl ? 9 : 1) * u], [mx + 11 * u, my - 4.5 * u], [mx, my - 3 * u], [mx - 11 * u, my - 4.5 * u]];
    p.poly(pts.map(([x, y]) => [x, y - open] as P2), tache, 2.6 * u);
  }
  if (D.sweat) { const x = cx + 0.74 * H.a, y = hc - 0.42 * H.b; p.poly([[x, y - 8 * u], [x + 5 * u, y + 2 * u], [x + 4 * u, y + 6 * u], [x, y + 8 * u], [x - 4 * u, y + 6 * u], [x - 5 * u, y + 2 * u]], TEAR, 1.8 * u); }
};

// ---------------- the whole figure ----------------
const towel = (p: Pen, pts: P2[], col: string, seed: number, u: number) => { // fluffy towelling texture ticks
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  p.clip(pts, () => { for (let i = 0; i < 46; i++) { const x = x0 + rnd(seed, i) * (x1 - x0), y = y0 + rnd(seed, i + 70) * (y1 - y0); p.arc(x, y, 3.2 * u, 2.2 * u, 200, 340, 1.2 * u, col); } });
};
/** a whole figure in the 600 x 1000 design space (feet ~ y 950, origin 300, 975); back = seen from behind */
export const drawPerson = (p: Pen, kit: Kit, pose: Pose, face: FaceS, light: number, lid = 0, back = false) => {
  const u = U, thick = thickAngle(light), ow = 4.8 * u, olSave = p.ol, tw = kit.tw ?? 86, top = kit.top;
  p.ol = 4 * u;
  const seated = !!pose.knees, fl = pose.flare ?? 0;
  const bodyR = [pose.lean ?? 0, 300, L.hipY, pose.shake ?? 0, pose.drop ?? 0];
  const B = bodyXf(pose);
  const skirtHem = top === "gown" ? kit.hem ?? 800 : top === "toga" ? 930 : top === "dress" ? kit.hem ?? 790 : 0;
  const longSkirt = top === "gown" || top === "toga" || top === "dress";
  // ---- legs ----
  const leg = (side: 0 | 1) => {
    const s = side ? 1 : -1, { Hp, K, F } = legIK(pose, side);
    const pts = [...thru(Hp, lerp2(Hp, K, 0.5), K, 6), ...thru(K, lerp2(K, F, 0.5), F, 7).slice(1)];
    const lw = (top === "romper" ? 15 : 12) * u * (kit.legW ?? 1), bare = kit.shorts || top === "dress";
    if (top === "toga" && !seated) limb(p, [lerp2(K, F, 0.6), F], kit.skin, lw * 0.9, 3.6 * u);
    else if (bare) {
      limb(p, pts, kit.skin, lw * 0.85, 3.6 * u);
      if (kit.shorts || seated) limb(p, thru(Hp, lerp2(Hp, K, 0.5), lerp2(Hp, K, 0.86), 6), seated && top === "dress" ? kit.topCol : kit.legs, lw * 1.55, 3.6 * u);
    } else {
      limb(p, pts, kit.legs, lw, 4 * u);
      if (seated && longSkirt) limb(p, thru(Hp, lerp2(Hp, K, 0.5), K, 6), top === "toga" ? "#f6efe0" : kit.topCol, lw * 1.4, 4 * u); // the gown over the lap
      if (top === "gown" || top === "pyjama") { // pyjama stripes
        for (let i = 2; i < pts.length - 1; i += 2) { const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l, h = lw * 0.42; if (seated && top === "gown" && i < 7) continue; p.stroke([[b[0] - nx * h, b[1] - ny * h], [b[0] + nx * h, b[1] + ny * h]], 2.6 * u, kit.legs2); }
      }
      if (top === "tweed") { const a0 = lerp2(K, F, 0.55); p.poly([[a0[0] - 6 * u, a0[1]], [F[0] - 16 * u, F[1] + 2 * u], [F[0] + 16 * u, F[1] + 2 * u], [a0[0] + 6 * u, a0[1]]], kit.legs, 3.6 * u); } // bell bottoms
      if (top === "doublet") { // hose + garter bows
        limb(p, thru(K, lerp2(K, F, 0.5), F, 7), kit.legs2, lw * 0.82, 3.6 * u);
        for (const sd of [-1, 1]) p.poly([[K[0], K[1] + 4 * u], [K[0] + sd * 10 * u, K[1] - 2 * u], [K[0] + sd * 10 * u, K[1] + 10 * u]], "#c0303a", 1.6 * u);
      }
    }
    const cx = F[0] + s * 3 * u, cy = F[1] + 8 * u;
    if (kit.shoes === "duck") { // fluffy duck slippers, beaks to the camera
      const body = ellPts(cx, cy, 17 * u, 11.5 * u, 40);
      p.inkRing(body, 4 * u, thick); p.shadedFill(body, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 17 * u);
      if (!back) {
        p.poly([[cx - 2 * u, cy - 11 * u], [cx + 3 * u, cy - 17 * u], [cx + 4 * u, cy - 10 * u]], kit.shoeCol, 1.6 * u);
        p.poly([[cx - 8 * u, cy + 3 * u], [cx, cy - 1 * u], [cx + 8 * u, cy + 3 * u], [cx, cy + 9 * u]], "#ff8a1a", 1.8 * u);
        for (const h of [-1, 1]) { p.ell(cx + h * 6.5 * u, cy - 5 * u, 3.4 * u, 3.8 * u, WHITE, 1.4 * u); p.dot(cx + h * 6.5 * u + 0.6 * u, cy - 4.6 * u, 1.6 * u); }
      }
    } else if (kit.shoes === "sandal") {
      p.poly(ellPts(cx, cy - 1 * u, 13 * u, 7.5 * u, 30), kit.skin, 3.4 * u);
      for (const y of [-3, 2]) p.stroke([[cx - 12 * u, cy + y * u], [cx + 12 * u, cy + y * u]], 3 * u, kit.shoeCol);
      p.stroke([[cx - 13 * u, cy + 6 * u], [cx + 13 * u, cy + 6 * u]], 3.4 * u, mul(kit.shoeCol, [0.7, 0.7, 0.7]));
    } else if (kit.shoes === "onesie") {
      const ft = ellPts(cx, cy - 2 * u, 15 * u, 10 * u, 30);
      p.inkRing(ft, 4 * u, thick); p.shadedFill(ft, kit.legs, mul(kit.legs, SH_CLOTH), light, 15 * u);
      p.arc(cx, cy + 4 * u, 10 * u, 4 * u, 20, 160, 1.6 * u, mul(kit.legs, [0.7, 0.7, 0.8]));
    } else {
      const big = kit.shoes === "chunky" ? 1.12 : 1, ox = F[0] + s * 4 * u, sp = ellPts(ox, F[1] + 7 * u, 15 * u * big, 8.5 * u * big, 30);
      if (kit.shoes === "chunky") p.poly(rrect(ox - 15 * u, F[1] + 9 * u, ox + 15 * u, F[1] + 17 * u, 3 * u), "#5a3420", 2.4 * u);
      p.inkRing(sp, 4 * u, thick); p.shadedFill(sp, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 15 * u);
      p.arc(ox - 4 * u, F[1] + 4 * u, 6 * u, 3 * u, 200, 290, 1.8 * u, mix(kit.shoeCol, WHITE, 0.5));
      if (kit.shoes === "buckle" && !back) p.poly(rrect(ox - 6 * u, F[1] - 1 * u, ox + 6 * u, F[1] + 7 * u, 1.6 * u), "#e8c45a", 1.6 * u);
      if (kit.shoes === "trainer" && !back) p.stroke([[ox - 8 * u, F[1] + 8 * u], [ox + 6 * u, F[1] + 4 * u]], 2.4 * u, kit.trim);
      if (kit.shoes === "slipper") p.arc(ox, F[1] + 4 * u, 12 * u, 4 * u, 190, 350, 3 * u, WHITE);
    }
  };
  const drawLegs = !(back && seated);
  if (!seated && drawLegs) { leg(0); leg(1); }
  // ---- skirts (gown / toga / dress) ----
  if (!seated && skirtHem) {
    p.rot = bodyR;
    const w0 = tw * (top === "toga" ? 1.04 : 0.98), w1 = tw * (top === "toga" ? 1.24 : 1.1) + fl * 46, y0 = 586, sw = Math.sin((pose.shake ?? 0) * 0.3) * 6 * fl;
    const pts: P2[] = [[300 - w0, y0], [300 - w1 - 4 + sw, skirtHem - 34], ...thru([300 - w1 + sw, skirtHem - 4], [300 - w1 * 0.1, skirtHem + 9 + 6 * fl], [300 + w1 + sw, skirtHem - 4 - 12 * fl], 14), [300 + w1 + 4 + sw, skirtHem - 38 - 10 * fl], [300 + w0, y0]];
    const col = top === "toga" ? "#f6efe0" : kit.topCol;
    p.inkRing(pts, ow, thick, 0.4); p.gradFill(pts, col, mul(col, SH_CLOTH), light, 0.26, 0.3);
    if (top === "gown") {
      if (!back) {
        towel(p, pts, mul(kit.topCol, [0.8, 0.82, 0.9]), kit.seed, u);
        limb(p, thru([314, 604], [326 + fl * 10, (600 + skirtHem) / 2], [338 + fl * 20, skirtHem], 10), kit.topCol2, 9 * u, 1.6 * u); // the cream wrap-over edge
        p.poly(rrect(214, 650, 266, 708, 8), mul(kit.topCol, [0.92, 0.94, 0.98]), 1.8 * u); p.poly([[224, 652], [240, 634], [254, 652]], "#ff5a6a", 1.6 * u); // pocket + hanky
      } else p.stroke([[300, 600], [300, skirtHem]], 1.6 * u, mul(kit.topCol, [0.7, 0.7, 0.8]));
    } else if (top === "toga") {
      p.clip(pts, () => {
        for (let i = -3; i <= 3; i++) p.stroke(thru([300 + i * 22, 610], [300 + i * 26 + 6, 760], [300 + i * 30 + (i % 2) * 6, skirtHem], 8), 1.6 * u, "#d8ccb0");
        const band: P2[] = thru([300 - w1 - 10 + sw, skirtHem - 16], [300, skirtHem - 6], [300 + w1 + 10 + sw, skirtHem - 16 - 12 * fl], 16);
        limb(p, band, kit.trim, 9 * u, 1.4 * u);
        for (let i = 1; i < band.length - 1; i += 2) p.poly(rrect(band[i][0] - 3 * u, band[i][1] - 3 * u, band[i][0] + 3 * u, band[i][1] + 3 * u, 0.5 * u), mul(kit.trim, [0.7, 0.6, 0.4]), 0);
      });
    } else if (top === "dress") {
      p.clip(pts, () => { for (let i = 0; i < 14; i++) p.dot(220 + rnd(kit.seed, i) * 160, 620 + rnd(kit.seed, i + 30) * (skirtHem - 630), 5 * u, kit.topCol2); });
      limb(p, thru([300 - w1 + 6, skirtHem - 8], [300, skirtHem + 4], [300 + w1 - 6, skirtHem - 8 - 12 * fl], 10), WHITE, 5 * u, 1.2 * u);
    }
    p.rot = null;
  }
  if (top === "doublet" && !seated) { // puffed trunk hose over the thighs
    p.rot = bodyR;
    for (const sd of [-1, 1]) {
      const pts = ellPts(300 + sd * 42, 664, 56, 64, 36);
      p.inkRing(pts, ow, thick, 0.4); p.gradFill(pts, kit.legs, mul(kit.legs, SH_CLOTH), light, 0.3);
      p.clip(pts, () => { for (let i = -2; i <= 2; i++) p.stroke(thru([300 + sd * 42 + i * 20, 604], [300 + sd * 42 + i * 24, 664], [300 + sd * 42 + i * 20, 724], 8), 7 * u, kit.topCol2); });
    }
    p.rot = null;
  }
  // ---- arms ----
  const arm = (side: 0 | 1) => {
    p.rot = bodyR;
    const { S, E, hand } = armIK(pose, side, tw);
    const pts = [...thru(S, lerp2(S, E, 0.5), E, 6), ...thru(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    const aw = (top === "gown" || top === "romper" ? 13 : 10.5) * u, sl = top === "toga" ? ((side === 0) !== back ? kit.skin : kit.topCol2) : kit.topCol;
    if (top === "tee" || top === "dress") { limb(p, pts, kit.skin, aw * 0.8, 3.6 * u); limb(p, thru(S, lerp2(S, E, 0.3), lerp2(S, E, 0.55), 6), kit.topCol, aw * 1.35, 3.6 * u); }
    else {
      limb(p, pts, sl, aw, 4 * u);
      if (top === "gown") limb(p, [lerp2(E, hand, 0.7), lerp2(E, hand, 0.86)], kit.topCol2, aw * 1.3, 1.8 * u);
      else if (top === "doublet") { limb(p, [lerp2(S, E, 0.35), lerp2(S, E, 0.7)], kit.topCol2, aw * 0.35, 0.8 * u); limb(p, [lerp2(E, hand, 0.78), lerp2(E, hand, 0.9)], "#f6f4ee", aw * 1.25, 1.6 * u); }
      else if (top === "tweed" || top === "jacket") limb(p, [lerp2(E, hand, 0.8), lerp2(E, hand, 0.9)], kit.topCol2, aw * 0.9, 1.4 * u);
      else if (top === "pyjama") limb(p, [lerp2(E, hand, 0.78), lerp2(E, hand, 0.9)], kit.trim, aw * 1.05, 1.4 * u);
    }
    p.rot = null;
    if (back && pose.front?.[side]) return; // hands in front of the body: hidden from behind
    const Hw = B(hand), Ew = B(E), ang = pose.ha?.[side] ?? Math.atan2(Hw[1] - Ew[1], Hw[0] - Ew[0]);
    const hold = back ? null : pose.hold?.[side];
    if (hold && hold !== "quill" && hold !== "pointer") drawHold(p, hold, Hw, side, light, pose);
    drawHand(p, pose.hk?.[side] ?? "rest", Hw, ang, kit.skin, side);
    if (hold === "quill" || hold === "pointer") drawHold(p, hold, Hw, side, light, pose);
  };
  const front = back ? [false, false] : pose.front ?? [false, false];
  if (!front[0]) arm(0);
  if (!front[1]) arm(1);
  p.rot = bodyR;
  // ---- torso ----
  const T: Blob = { a: tw, b: (L.tbot - L.top) / 2, nTop: 2.4, nBot: 3.6, egg: 0.17, asym: 0, rot: 0, noise: 0.005, seed: kit.seed + 3 };
  const tp = blobPts(300, (L.top + L.tbot) / 2, T);
  const tcol = top === "toga" ? "#f6efe0" : kit.topCol;
  p.gradFill(tp, tcol, mul(tcol, SH_CLOTH), light, 0.24, 0.3);
  p.clip(tp, () => {
    if (back) { // seams, belts, collars from behind
      if (top === "gown") { towel(p, tp, mul(kit.topCol, [0.8, 0.82, 0.9]), kit.seed + 1, u); p.poly([[150, 586], [450, 586], [450, 612], [150, 612]], kit.trim, 1.8 * u); p.poly([[244, L.top - 8], [356, L.top - 8], [346, L.top + 26], [254, L.top + 26]], kit.topCol2, 2 * u); }
      else if (top === "toga") p.poly([[200, 420], [230, 410], [420, 620], [380, 640]], kit.topCol2, 2 * u);
      else if (top === "tweed" || top === "jacket") { p.stroke([[300, 430], [300, 640]], 1.6 * u, mul(kit.topCol, [0.6, 0.6, 0.66])); p.poly([[244, L.top - 6], [356, L.top - 6], [340, L.top + 18], [260, L.top + 18]], mul(kit.topCol, [0.85, 0.85, 0.9]), 2 * u); }
      else if (top === "pyjama") for (let x = 196; x < 410; x += 22) p.stroke([[x, 410], [x, 640]], 6 * u, kit.topCol2);
      else if (top === "tee") for (let y = 440; y < 640; y += 30) p.poly([[160, y], [440, y], [440, y + 14], [160, y + 14]], kit.topCol2, 0);
      else if (top === "jumper") for (let y = 470; y < 620; y += 36) p.stroke([[170, y], [430, y]], 6 * u, kit.trim);
      return;
    }
    if (top === "gown") {
      towel(p, tp, mul(kit.topCol, [0.8, 0.82, 0.9]), kit.seed + 1, u);
      p.poly([[256, L.top - 6], [344, L.top - 6], [300, 598]], kit.legs, 1.6 * u); // the pyjama top in the V
      for (let y = 440; y < 590; y += 22) p.stroke([[262 + (y - 440) * 0.26, y], [338 - (y - 440) * 0.26, y]], 2.6 * u, kit.legs2);
      for (const s of [-1, 1]) { // the fat shawl collar
        const pts: P2[] = [[300 + s * 26, L.top - 8], [300 + s * 64, L.top + 4], ...thru([300 + s * 58, 470], [300 + s * 40, 540], [300 + s * 6, 604], 8), [300 + s * 2, 586], ...thru([300 + s * 2, 586], [300 + s * 22, 520], [300 + s * 30, 446], 8).slice(1)];
        p.poly(pts, kit.topCol2, 2 * u);
        towel(p, pts, mul(kit.topCol2, [0.82, 0.8, 0.8]), kit.seed + 5 + s, u * 0.8);
      }
      p.poly([[150, 584], [450, 584], [450, 612], [150, 612]], kit.trim, 2 * u); // belt
    } else if (top === "toga") {
      p.poly([[246, L.top - 4], [284, L.top - 4], [262, 486], [200, 480], [196, 440]], kit.skin, 0); // bare shoulder (screen-left)
      p.stroke([[264, L.top - 2], [246, 484]], 1.6 * u, "#d8ccb0");
      p.poly([[306, L.top - 6], [392, L.top + 4], [404, 470], [250, 640], [196, 640], [190, 600]], kit.topCol2, 2.2 * u); // the himation drape
      for (let i = 0; i < 4; i++) p.stroke(thru([340 + i * 14, L.top + 10], [300 + i * 10, 520], [214 + i * 16, 630], 8), 1.6 * u, mul(kit.topCol2, [0.7, 0.72, 0.82]));
      p.ell(372, L.top + 22, 9 * u, 9 * u, "#e8c45a", 2 * u); // brooch
    } else if (top === "doublet") {
      for (const x of [248, 268, 332, 352]) p.stroke([[x, 450], [x + (x < 300 ? 8 : -8), 610]], 6 * u, kit.topCol2); // slashes
      for (let i = 0; i < 6; i++) p.poly([[200 + i * 34, 600], [234 + i * 34, 600], [230 + i * 34, 646], [204 + i * 34, 646]], kit.topCol, 1.6 * u); // peplum tabs
      p.stroke([[190, 598], [410, 598]], 3.4 * u, "#e8c45a");
      for (let y = 440; y < 600; y += 26) { p.dot(300, y, 3.6 * u); p.dot(300, y, 2.5 * u, "#e8c45a"); }
    } else if (top === "tweed" || top === "jacket") {
      if (top === "tweed") for (let i = 0; i < 70; i++) { const x = 200 + rnd(kit.seed, i) * 200, y = 420 + rnd(kit.seed, i + 90) * 210; p.stroke([[x, y], [x + 5, y + (i % 2 ? 5 : -5)]], 1.2 * u, mul(kit.topCol, [1.25, 1.2, 1.1])); }
      p.poly([[262, L.top - 6], [338, L.top - 6], [300, 572]], kit.topCol2, 1.6 * u); // shirt V
      for (const s of [-1, 1]) p.poly([[300 + s * 4, L.top - 2], [300 + s * 40, L.top - 6], [300 + s * 30, L.top + 22]], kit.topCol2, 2 * u); // big collar points
      if (kit.tie) { // the wide 70s kipper tie
        const tie: P2[] = [[290, L.top + 6], [310, L.top + 6], [326, 552], [300, 584], [274, 552]];
        p.poly(tie, kit.tie, 2 * u); p.clip(tie, () => { for (let y = 420; y < 600; y += 26) p.stroke([[260, y], [340, y + 26]], 6 * u, kit.trim); });
        p.poly(rrect(287, L.top + 2, 313, L.top + 22, 4), kit.tie, 2 * u);
      }
      for (const s of [-1, 1]) p.poly([[300 + s * 40, L.top - 8], [300 + s * 82, L.top + 10], [300 + s * 62, 480], [300 + s * 82, 494], [300 + s * 4, 590], [300 + s * 26, 470]], mul(kit.topCol, [0.86, 0.86, 0.9]), 2 * u); // wide lapels
      p.dot(318, 600, 3.6 * u); p.dot(318, 600, 2.4 * u, "#c8a060");
      if (kit.badge) { p.poly(rrect(222, 500, 270, 530, 4), WHITE, 1.6 * u); p.stroke([[230, 512], [262, 512]], 1.6 * u, "#3a6ad0"); p.stroke([[230, 520], [254, 520]], 1.2 * u, "#8890a0"); }
    } else if (top === "pyjama") {
      for (let x = 196; x < 410; x += 22) p.stroke([[x, 410], [x, 640]], 6 * u, kit.topCol2);
      for (const s of [-1, 1]) { const c: P2[] = [[300 + s * 4, L.top - 2], [300 + s * 44, L.top - 4], [300 + s * 30, L.top + 30], [300 + s * 6, 470]]; p.poly(c, kit.topCol, 2 * u); p.stroke([...c, c[0]], 2.4 * u, kit.trim); }
      for (const y of [490, 530, 570, 610]) p.dot(304, y, 3 * u, WHITE);
    } else if (top === "tee") {
      for (let y = 440; y < 640; y += 30) p.poly([[160, y], [440, y], [440, y + 14], [160, y + 14]], kit.topCol2, 0);
      p.arc(300, L.top - 4, 34, 16, 10, 170, 5 * u, kit.trim);
    } else if (top === "dress") {
      for (let i = 0; i < 10; i++) p.dot(220 + rnd(kit.seed, i + 3) * 160, 440 + rnd(kit.seed, i + 60) * 180, 5 * u, kit.topCol2);
      p.arc(300, L.top + 2, 40, 18, 10, 170, 7 * u, WHITE); p.arc(300, L.top + 2, 40, 18, 10, 170, 2 * u);
    } else if (top === "romper") {
      p.stroke([[300, L.top + 4], [300, 640]], 2 * u, mul(kit.topCol, [0.6, 0.6, 0.7]));
      p.ell(258, 540, 20, 18, kit.topCol2, 1.6 * u); p.dot(252, 536, 2 * u); p.dot(264, 536, 2 * u); // a little ducky patch
      p.poly([[262, 542], [274, 540], [264, 549]], "#ff8a1a", 0);
    } else if (top === "jumper") {
      p.poly([[250, L.top - 4], [350, L.top - 4], [340, L.top + 24], [260, L.top + 24]], kit.topCol2, 2 * u);
      for (let y = 470; y < 620; y += 36) p.stroke([[170, y], [430, y]], 6 * u, kit.trim);
    }
  });
  p.inkRing(tp, ow, thick);
  if (top === "gown" && !back) { // belt knot + tasselled ends (they fly out in the blast)
    const kx = 336, ky = 598;
    for (const [dx, len] of [[-8, 70], [10, 92]] as [number, number][]) {
      const end: P2 = [kx + dx + fl * 40 * (dx > 0 ? 1 : -1), ky + len - fl * 50];
      limb(p, thru([kx, ky], [kx + dx * 0.6 + fl * 20 * Math.sign(dx), ky + len * 0.5 - fl * 10], end, 8), kit.trim, 7 * u, 1.6 * u);
      for (let i = -1; i <= 1; i++) p.stroke([[end[0], end[1]], [end[0] + i * 3 * u, end[1] + 10 * u]], 1.8 * u, mul(kit.trim, [0.8, 0.7, 0.5]));
    }
    p.ell(kx, ky, 10 * u, 8 * u, kit.trim, 2 * u);
  }
  p.rot = null;
  // neck stub (shows when the head lifts on the inhale)
  if (!kit.ruff) {
    const Nb = B([300, L.top + 8]), Nt = xfOf(headRot(pose, face))([300, L.chin - 14]);
    if (Nt[1] < Nb[1] - 2) limb(p, [Nb, Nt], mul(kit.skin, [0.9, 0.82, 0.82]), ((kit.headK ?? 1) > 1.1 ? 36 : 44), 3 * u);
  } else { // the millstone ruff: a pleated white disc
    const rc = B([300, L.top - 2]), rx = 112, ry = 34, outer: P2[] = [];
    for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r = 1 + (i % 2 ? 0.05 : -0.02); outer.push([rc[0] + Math.cos(a) * rx * r, rc[1] + Math.sin(a) * ry * r]); }
    p.inkRing(outer, 4.2 * u, thick, 0.4); p.poly(outer, "#fbfbf6", 0);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; p.arc(rc[0] + Math.cos(a) * rx * 0.66, rc[1] + Math.sin(a) * ry * 0.66, 6 * u, 5 * u, 0, 360, 1.3 * u, "#b8bccb"); }
  }
  if (seated && drawLegs) { leg(0); leg(1); }
  /** a front hand up at the face (finger under the nose, stroking a beard, shading the eyes) is drawn over the head */
  const overHead = (side: 0 | 1) => front[side] && pose.hands[side][1] < L.chin + 40 + (pose.drop ?? 0);
  if (front[0] && !overHead(0)) arm(0);
  if (front[1] && !overHead(1)) arm(1);
  // ---- head (Pen.rot = tilt about the neck, canvas scale = headK about the moved neck) ----
  const meme = face.e === "meme", grow = growOf(face), kk = Math.min(1.2, face.k ?? 1);
  const hk = kit.headK ?? 1, g = p.g;
  p.rot = headRot(pose, face);
  const Nw = p.P(300, L.chin);
  g.save(); g.translate(Nw[0], Nw[1]); g.scale(hk, hk); g.translate(-Nw[0], -Nw[1]);
  const cx = 300, hc = L.hc;
  const H0 = headBlob(kit.seed, HEAD_A, 0), H: Blob = { ...H0, a: H0.a * grow * (meme ? 1.06 : 1), b: H0.b * grow * (meme ? 0.97 : 1), rot: H0.rot * 0.5 };
  if (meme) H.nBot = 2.9; // a rounder, puffed jaw
  const blow = Math.max(face.blow ?? 0, meme ? kk : face.e === "achoo" ? 0.3 * Math.min(1, kk) : 0);
  const hp = blobPts(cx, hc, H);
  if (back) { // ---- from behind: back of the head, ears, hair masses ----
    hairBack(p, kit, cx, hc, H, u * grow, blow, light, thick);
    for (const sd of [-1, 1]) p.ell(cx + sd * 0.98 * H.a, hc + 6 * u, 9 * u, 13 * u, kit.skin, 3 * u);
    p.inkRing(hp, ow, thick);
    const bald = kit.hairStyle === "bald" || kit.hairStyle === "tuft";
    p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), bald ? kit.skin : kit.hair, mul(bald ? kit.skin : kit.hair, bald ? SH_SKIN : SH_HAIR), light, H.a);
    if (!bald) p.clip(hp, () => { // a crown swirl + a few soft strand arcs (no pumpkin ribs)
      for (let i = 0; i < 3; i++) p.arc(cx + 6 * u, hc - 0.45 * H.b, (10 + i * 12) * u, (8 + i * 9) * u, 160 + i * 30, 330 + i * 20, 1.6 * u, mul(kit.hair, [0.72, 0.7, 0.78]));
      for (const sd of [-1, 1]) p.stroke(thru([cx + sd * 0.35 * H.a, hc - 0.2 * H.b], [cx + sd * 0.55 * H.a, hc + 0.3 * H.b], [cx + sd * 0.45 * H.a, hc + 0.85 * H.b], 8), 1.4 * u, mul(kit.hair, [0.72, 0.7, 0.78]));
      p.arc(cx - 0.3 * H.a, hc - 0.55 * H.b, 0.28 * H.a, 0.16 * H.b, 200, 290, 4 * u, mix(kit.hair, WHITE, 0.35));
    });
    else if (kit.hairStyle === "bald") p.clip(hp, () => p.poly([[cx - 2 * H.a, hc + 0.15 * H.b], [cx + 2 * H.a, hc + 0.15 * H.b], [cx + 2 * H.a, hc + 2 * H.b], [cx - 2 * H.a, hc + 2 * H.b]], kit.hair, 0));
    if (kit.hairStyle === "bed") tufts(p, kit, cx, hc, H, u, blow, -1);
    if (kit.hairStyle === "curly" && kit.bow) bowAt(p, cx - 0.62 * H.a, hc - 0.8 * H.b, u, kit.bow);
    if (kit.laurel) laurel(p, cx, hc, H, u, true);
    if (kit.hat === "tall") tallHat(p, cx, hc, H, u, light, thick);
    g.restore(); p.rot = null; p.ol = olSave;
    return;
  }
  hairBack(p, kit, cx, hc, H, u * grow, blow, light, thick);
  p.inkRing(hp, ow, thick);
  p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), kit.skin, mul(kit.skin, SH_SKIN), light, H.a);
  const D = FACES[face.e], red = (D.red ?? 0) * Math.min(1, kk), blush = (D.blush ?? 0) * Math.min(1, kk), pz = pitchOf(face);
  clipAll(p, [hp], () => {
    if (red > 0.05) { // the strain-red rising from the chin
      const [ax, ay] = p.P(cx, hc + H.b), [bx, by] = p.P(cx, hc - H.b), tp2 = Math.min(1, red);
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, rgba("#ff2f4a", 0.7 * tp2)); gr.addColorStop(Math.max(0.01, 0.62 * tp2), rgba("#ff4a5a", 0.45 * tp2)); gr.addColorStop(Math.min(0.999, 0.62 * tp2 + 0.3), rgba("#ff4a5a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
    const a = Math.max(red, blush) * 0.85;
    if (a > 0.02) for (const s of [-1, 1]) {
      const [x, y] = p.P(cx + s * 0.6 * H.a, hc + 0.3 * H.b + pz), R = 0.24 * H.a;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, rgba("#ff4d6a", 0.7 * a)); gr.addColorStop(1, rgba("#ff4d6a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
  });
  if (kit.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(cx + s * (0.4 + 0.09 * i) * H.a, hc + (0.2 + (i % 2) * 0.07) * H.b + pz, 1.5 * u * grow, rgba("#a85a3a", 0.7));
  hairFront(p, kit, hp, cx, hc, H, u * grow, blow, light, thick);
  if (kit.laurel) laurel(p, cx, hc, H, u, false);
  drawFace(p, kit, cx, hc, H, face, lid, grow, light);
  if (kit.hat === "tall") tallHat(p, cx, hc, H, u, light, thick);
  g.restore();
  p.rot = null;
  if (overHead(0)) arm(0);
  if (overHead(1)) arm(1);
  p.ol = olSave;
};

// ---------------- effect cards ----------------
/** "ah..." build-up lettering (512 x 256) */
export const fxAh = (p: Pen, word: string, col: string) => {
  const g = p.g; g.save(); g.translate(256, 128); g.rotate(-0.08);
  letter(p, word, 0, 0, word.length > 5 ? 118 : 138, col, 22, 9, 480);
  g.restore();
};
/** "ACHOO!" burst (800 x 480): a jagged starburst with a white shout */
export const fxAchoo = (p: Pen, word: string, col: string, seed: number) => {
  const n = 18, pts: P2[] = [], cx = 400, cy = 240;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 0.72 : 0.96 + 0.04 * rnd(seed, i); pts.push([cx + Math.cos(a) * 384 * r, cy + Math.sin(a) * 226 * r]); }
  p.poly(pts, col, 22);
  p.poly(shrink(pts, 0.74), mix(col, WHITE, 0.45), 0);
  p.arc(300, 150, 150, 70, 200, 250, 16, "rgba(255,255,255,0.85)");
  letter(p, word, cx, cy + 10, word.length > 6 ? 124 : 146, WHITE, 34, 0, 600);
};
/** squint/glare lines (256 x 256): three sun-yellow strokes fanning to the right from (40, 128) */
export const fxGlare = (p: Pen) => {
  for (const a of [-38, 0, 38]) { const b = rad(a), x0 = 40 + Math.cos(b) * 46, y0 = 128 + Math.sin(b) * 46, x1 = 40 + Math.cos(b) * 196, y1 = 128 + Math.sin(b) * 196; p.stroke([[x0, y0], [x1, y1]], 30, INK); p.stroke([[x0, y0], [x1, y1]], 15, "#fff3a0"); }
};
/** heat wiggles (192 x 256): rising wavy lines */
export const fxHeat = (p: Pen, ph: number) => {
  for (let j = 0; j < 3; j++) {
    const pts: P2[] = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([36 + j * 60 + 14 * Math.sin(t * Math.PI * 3 + ph + j), 236 - t * 210]); }
    p.stroke(pts, 18, INK); p.stroke(pts, 9, j === 1 ? "#ffb02a" : "#ff6a3a");
  }
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
/** speed streak (512 x 96): one tapered white whoosh line with an ink rim */
export const fxStreak = (p: Pen) => p.poly([[20, 48], [380, 30], [492, 48], [380, 66]], WHITE, 10);
/** nose twitch marks (256 x 128): little "( )" ticks either side */
export const fxTwitch = (p: Pen) => { for (const s of [-1, 1]) for (let i = 0; i < 2; i++) p.arc(128 + s * (44 + i * 24), 64, 16, 34, s > 0 ? -50 : 130, s > 0 ? 50 : 230, 9); };
/** a cute sneeze sparkle-droplet (128 x 160) */
export const fxDrop = (p: Pen) => {
  p.poly([[64, 14], [98, 82], [102, 112], [86, 140], [64, 148], [42, 140], [26, 112], [30, 82]], "#bfe9ff", 9);
  p.arc(62, 108, 22, 26, 200, 250, 7, WHITE);
  p.dot(80, 70, 6, WHITE);
};
/** Aristotle's scroll flying away (320 x 200) */
export const fxScroll = (p: Pen) => {
  p.poly(rrect(40, 60, 280, 140, 10), "#f2dfa8", 9);
  for (let i = 0; i < 4; i++) p.stroke([[80, 80 + i * 14], [240 - (i % 2) * 40, 80 + i * 14]], 4, "#b8945a");
  for (const x of [40, 280]) { p.ell(x, 100, 22, 50, "#e8d090", 8); p.ell(x, 46, 14, 10, "#9a5a2a", 6); p.ell(x, 154, 14, 10, "#9a5a2a", 6); }
};
/** coffee splash blob (256 x 256) for the meme mug */
export const fxCoffee = (p: Pen, v: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, r = 70 + 22 * Math.sin(i * 2.3 + v) + (i % 4 === 0 ? 30 : 0); pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r * 0.8]); }
  const sm: P2[] = [];
  for (let i = 0; i < pts.length; i++) sm.push(...qbez(lerp2(pts[i], pts[(i + 1) % 20], 0.5), pts[(i + 1) % 20], lerp2(pts[(i + 1) % 20], pts[(i + 2) % 20], 0.5), 4).slice(0, -1));
  p.poly(sm, "#8a5030", 10);
  p.arc(110, 110, 40, 26, 200, 260, 9, "rgba(255,230,200,0.8)");
};
/** the meme halo (512 x 512): a sunburst of sharp rays behind the head */
export const fxHalo = (p: Pen) => {
  const n = 22, pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 120 : 236 - (i % 4 === 0 ? 0 : 34); pts.push([256 + Math.cos(a) * r, 256 + Math.sin(a) * r]); }
  p.poly(pts, "#ffd23f", 14);
  p.poly(shrink(pts, 0.7), "#fff3a8", 0);
};
