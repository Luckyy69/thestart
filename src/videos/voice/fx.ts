// OWNER: cast agent. Drawings for "Your Voice on Recordings" (all NEW designs, Pen style: thick-thin plum ink, painted
// crescents). Design space 600 x 1000 units per card (1000 units = 2.16 m); the card origin (canvas 300, 975) is the
// point between the feet ON the ground.
//   drawPerson   one kit-driven rig for the whole cast:
//                BEAN        cobalt hoodie with a yellow sound-wave print, hot-pink headphones round his neck, a chestnut
//                            wave-quiff, charcoal joggers, chunky sneakers.
//                MUM         auburn waves + mint headband, coral cable knit, a tea mug.
//                DAD         receding crop + big beard, green plaid flannel, a BBQ spatula.
//                FRIEND      afro puffs, orange star tee, braces, a game controller.
//                TEACHER     grey sides + shiny top, walrus moustache, half-moon glasses, tweed + red bow tie, an apple.
//                GRANDMA     lilac perm + bun, round glasses, lavender cardigan + pearls, knitting.
//                RESEARCHER  sleek top-knot, teal cat-eye glasses, lab coat over a plum turtleneck, clipboard + pen.
//                Faces: one feeling per line (listen, horrified, dread, defeated, curious, talk, nervous, shocked,
//                intrigued, focus, huh, soft, shy + the crowd's yep faces + the researcher's watch / sly / smug) and THE
//                MEME FACE (BEAN smitten with his own voice: pulsing heart eyes, blush hatching, dreamy open smile).
//   drawProfile  BEAN in side view (shot 2, the X-ray), facing screen-LEFT; PROFILE = its canvas landmarks.
//   drawCat      the ginger tabby, sitting, smug "yep" nod.
//   effects      hearts, heart halo, "!" / "?", sweat, sparkles, motion arcs, nod ticks, YEP speech bubbles.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, Blob } from "../bridge/toon";

export type P2 = [number, number];
const WHITE = "#ffffff", MOUTH = "#4a1020", THROAT = "#2a0510", TONGUE = "#ff6f86", TEAR = "#8fd8ff", TEAR_HI = "#eefaff", HEART = "#ff3d6e";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 57.13 + k * 39.71) * 31871.4417; return x - Math.floor(x); };
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
/** fill the whole clip region (inside clipAll / p.clip) */
const fillAll = (p: Pen, style: CanvasGradient | string) => { p.g.fillStyle = style; p.g.fillRect(-5000, -5000, 20000, 20000); };
const radial = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  const [x, y] = p.P(x0, y0), gr = p.g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  return gr;
};
const SH_SKIN: [number, number, number] = [0.95, 0.84, 0.84], SH_CLOTH: [number, number, number] = [0.62, 0.66, 0.78], SH_HAIR: [number, number, number] = [0.6, 0.6, 0.72];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo outside the ink) */
const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};
/** a heart outline (point down), centre (cx, cy), half-width r */
export const heartPts = (cx: number, cy: number, r: number, n = 40): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    out.push([cx + (x / 16) * r, cy + (y / 16) * r + 0.1 * r]);
  }
  return out;
};

// ======================================================================================================================
// THE CAST
// ======================================================================================================================
export type HairStyle = "quiff" | "wavy" | "crop" | "puffs" | "sides" | "perm" | "topknot";
export type Top = "hoodie" | "knit" | "flannel" | "tee" | "tweed" | "cardigan" | "coat";
export type Kit = {
  seed: number; skin: string; hair: string; hairStyle: HairStyle;
  top: Top; topCol: string; topCol2: string; trim: string;
  legs: string; legs2?: string; skirt?: string; shoes: "sneaker" | "loafer" | "slipper"; shoeCol: string; soleCol?: string;
  /** torso half-width (design units, default 86) */
  tw?: number;
  glasses?: { style: "round" | "half" | "cateye"; col: string };
  beard?: string; tache?: string; freckles?: boolean; headband?: string; bowtie?: string; pearls?: boolean; lashes?: boolean;
  /** headphones round the neck (BEAN) */
  phones?: string;
};
export type Who = "bean" | "mum" | "dad" | "friend" | "teacher" | "grandma" | "researcher";
export const KITS: Record<Who, Kit> = {
  bean: { seed: 41, skin: "#ffd8b6", hair: "#8a4a24", hairStyle: "quiff", top: "hoodie", topCol: "#3a64f2", topCol2: "#ffcf3a", trim: "#fff4dc", legs: "#383d55", legs2: "#f2f4fa", shoes: "sneaker", shoeCol: "#fbfaf4", soleCol: "#ffcf3a", freckles: true, phones: "#ff3fa4" },
  mum: { seed: 52, skin: "#ffd6b5", hair: "#b8462e", hairStyle: "wavy", top: "knit", topCol: "#f27a68", topCol2: "#ffe9d2", trim: "#ffe9d2", legs: "#4a6aa8", shoes: "slipper", shoeCol: "#ffb8c8", headband: "#6fe0c0", lashes: true },
  dad: { seed: 63, skin: "#f2c39a", hair: "#5a3420", hairStyle: "crop", top: "flannel", topCol: "#2f9a6a", topCol2: "#1c3a5a", trim: "#f6f1e6", legs: "#c9a46a", shoes: "loafer", shoeCol: "#5a3420", tw: 98, beard: "#5a3420" },
  friend: { seed: 74, skin: "#9a6240", hair: "#2a1a14", hairStyle: "puffs", top: "tee", topCol: "#ff8a1f", topCol2: "#ffffff", trim: "#ff4f8a", legs: "#33476e", shoes: "sneaker", shoeCol: "#ff4f8a", soleCol: "#ffffff", lashes: true },
  teacher: { seed: 85, skin: "#eab48e", hair: "#c9ccd6", hairStyle: "sides", top: "tweed", topCol: "#8f6a46", topCol2: "#bfe0ff", trim: "#5a3e26", legs: "#5a4636", shoes: "loafer", shoeCol: "#3a2418", tw: 92, glasses: { style: "half", col: "#c8a050" }, tache: "#c9ccd6", bowtie: "#e0353f" },
  grandma: { seed: 96, skin: "#ffe0cc", hair: "#ece6f6", hairStyle: "perm", top: "cardigan", topCol: "#b49ae6", topCol2: "#fff6e8", trim: "#f4d27a", legs: "#c9b6a6", skirt: "#7a5ab0", shoes: "slipper", shoeCol: "#e86a8a", tw: 90, glasses: { style: "round", col: "#d64a7a" }, pearls: true, lashes: true },
  researcher: { seed: 107, skin: "#d9a07a", hair: "#1e1a2a", hairStyle: "topknot", top: "coat", topCol: "#f6f8fb", topCol2: "#5a2f7a", trim: "#b4bfd2", legs: "#2a2a3a", shoes: "loafer", shoeCol: "#1e1a24", glasses: { style: "cateye", col: "#16b8a8" }, lashes: true },
};

export type HandK = "rest" | "open" | "grip" | "point" | "palm" | "fist" | "cup" | "hug";
export type Hold = "mug" | "spatula" | "pad" | "apple" | "knit" | "clipboard" | "pen";
export type Pose = {
  /** ankle points (canvas, absolute) [screen-left, screen-right] */
  feet: [P2, P2];
  /** explicit knees (seated, canvas absolute); absent = standing 2-bone IK */
  knees?: [P2, P2];
  /** hand targets (canvas, absolute); hk hand shapes; ha hand angle override (rad, canvas); front = over the torso;
   *  over = drawn over the HEAD too (hands on the cheeks, finger to the lips) */
  hands: [P2, P2]; hk?: [HandK, HandK]; ha?: [number | null, number | null]; front?: [boolean, boolean]; over?: [boolean, boolean];
  hold?: [Hold | null, Hold | null];
  /** upper body drop (seated, units), lean about the hips (rad), extra head tilt (deg), shoulder shrug (units, +up),
   *  sideways shake (units), head offset along the neck (+down) */
  drop?: number; lean?: number; headTilt?: number; shrug?: number; shake?: number; headDy?: number;
};
export type Face =
  | "listen" | "horrified" | "dread" | "defeated" | "curious" | "talk" | "nervous" | "shocked" | "intrigued" | "focus" | "huh" | "meme" | "soft" | "shy"
  | "aww" | "deadpan" | "grin" | "stern" | "sweet" | "watch" | "sly" | "smug";
/** k: amount (meme pulse); look: pupils (-1..1); shake: frame parity for trembles; talk: mouth open 0..1 (talking);
 *  nod: 0..1 chin down (the "yep" nod) */
export type FaceS = { e: Face; k?: number; look?: P2; shake?: number; talk?: number; nod?: number };

export const HEAD_A = 118;
export const U = (2 * HEAD_A) / 100;
export const LAYOUT = { hc: 300, chin: 404, top: 408, tbot: 622, hipY: 600, sh: [[222, 452], [378, 452]] as [P2, P2] };
/** mouth centre below the head centre, in head units U */
export const MOUTH_DY = 21;
const EX = 15, EY = -2;
const ARM1 = 100, ARM2 = 94, THIGH = 178, SHIN = 176;
const L = LAYOUT;

type EyeK = "dot" | "wide" | "tiny" | "worry" | "lid" | "heavy" | "happy" | "closed" | "side" | "heart";
type MouthK = "small" | "smile" | "flat" | "wobble" | "eek" | "cringe" | "bigO" | "drop" | "tongue" | "smirk" | "grin" | "o" | "frown" | "dreamy" | "talk" | "aww" | "shy";
type FaceDef = {
  eye: EyeK; brow: [number, number]; brow2?: [number, number]; mouth: MouthK; look?: P2; tilt?: number;
  blush?: number; hatch?: number; sweat?: boolean; gloom?: number; pale?: number; crinkle?: boolean; braces?: boolean;
};
const FACES: Record<Face, FaceDef> = {
  // ---- BEAN ----
  listen: { eye: "dot", brow: [-4, -3], mouth: "small", look: [0.75, 0.85], tilt: 4 },
  horrified: { eye: "tiny", brow: [-15, -5], mouth: "eek", tilt: -6, pale: 0.85, sweat: true },
  dread: { eye: "worry", brow: [-13, 3], mouth: "wobble", look: [0, 0.2], pale: 0.35, sweat: true },
  defeated: { eye: "heavy", brow: [-9, 5], mouth: "frown", look: [0.3, 1], tilt: 7, gloom: 1 },
  curious: { eye: "dot", brow: [-7, -8], brow2: [-11, -13], mouth: "o", look: [0.5, -0.7], tilt: -3 },
  talk: { eye: "dot", brow: [-5, -6], mouth: "talk", look: [0, 0] },
  nervous: { eye: "dot", brow: [-11, -1], mouth: "cringe", look: [1, 0.1], tilt: -4, sweat: true },
  shocked: { eye: "tiny", brow: [-18, -15], mouth: "drop", pale: 0.55 },
  intrigued: { eye: "dot", brow: [3, 1], brow2: [-11, -14], mouth: "smirk", look: [0.6, -0.3], tilt: 4 },
  focus: { eye: "dot", brow: [6, 1], mouth: "tongue", look: [0.15, 1] },
  huh: { eye: "dot", brow: [1, 0], brow2: [-12, -14], mouth: "o", look: [-0.9, -0.4], tilt: 7 },
  meme: { eye: "heart", brow: [-11, 1], mouth: "dreamy", tilt: -9, blush: 1.2, hatch: 1 },
  soft: { eye: "dot", brow: [-7, -2], mouth: "small", look: [0.55, 0.75], blush: 0.25, tilt: 3 },
  shy: { eye: "happy", brow: [-8, -1], mouth: "shy", tilt: 7, blush: 0.95, hatch: 0.55 },
  // ---- the crowd ("yep") ----
  aww: { eye: "happy", brow: [-8, -3], mouth: "aww", tilt: 6, blush: 0.5 },
  deadpan: { eye: "lid", brow: [2, 2], mouth: "flat" },
  grin: { eye: "dot", brow: [-6, -6], mouth: "grin", crinkle: true, braces: true },
  stern: { eye: "lid", brow: [6, -2], mouth: "flat" },
  sweet: { eye: "happy", brow: [-5, -2], mouth: "smile", blush: 0.65, crinkle: true },
  // ---- the researcher ----
  watch: { eye: "dot", brow: [1, -2], mouth: "small" },
  sly: { eye: "side", brow: [6, -1], brow2: [-11, -15], mouth: "smirk", tilt: -5 },
  smug: { eye: "closed", brow: [-2, -5], brow2: [-10, -13], mouth: "smirk", tilt: -6 },
};

// ---------------- rig geometry (shared by the drawing and the exported contracts) ----------------
type Xf = (P: P2) => P2;
const rotAbout = (P: P2, c: P2, a: number): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
const bodyXf = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => { const r = rotAbout(P, [300, L.hipY], a); return [r[0] + dx, r[1] + dy]; }; };
const bodyInv = (pose: Pose): Xf => { const a = pose.lean ?? 0, dx = pose.shake ?? 0, dy = pose.drop ?? 0; return (P) => rotAbout([P[0] - dx, P[1] - dy], [300, L.hipY], -a); };
const memeK = (face: FaceS) => (face.e === "meme" ? Math.min(1.2, face.k ?? 1) : 0);
const headTilt = (pose: Pose, face: FaceS) => rad((FACES[face.e].tilt ?? 0) * (face.e === "meme" ? Math.min(1, face.k ?? 1) : 1) + (pose.headTilt ?? 0));
const headShake = (face: FaceS) => (face.e === "horrified" || face.e === "dread" ? ((face.shake ?? 0) % 2 ? 1 : -1) * U * (face.e === "horrified" ? 0.9 : 0.45) : 0);
/** head frame for Pen.rot: [angle, pivot x, pivot y, dx, dy] (pivot = the neck); the nod dips the head */
const headRot = (pose: Pose, face: FaceS): number[] => {
  const N: P2 = [300, L.chin], Nw = bodyXf(pose)(N), nod = face.nod ?? 0;
  return [(pose.lean ?? 0) + headTilt(pose, face), N[0], N[1], Nw[0] - N[0] + headShake(face), Nw[1] - N[1] + (pose.headDy ?? 0) + 9 * nod];
};
const xfOf = (r: number[]): Xf => (P) => { const q = rotAbout(P, [r[1], r[2]], r[0]); return [q[0] + r[3], q[1] + r[4]]; };
const growOf = (face: FaceS) => 1 + 0.06 * memeK(face);
const twOf = (kit: Kit) => kit.tw ?? 86;
const shoulder = (pose: Pose, side: 0 | 1, kit: Kit): P2 => { const d = twOf(kit) - 86; return [L.sh[side][0] + (side ? d : -d), L.sh[side][1] - (pose.shrug ?? 0)]; };
/** 2-bone arm IK in body-local coords: shoulder, elbow, hand */
const armIK = (pose: Pose, side: 0 | 1, kit: Kit) => {
  const S = shoulder(pose, side, kit), s = side ? 1 : -1, Hd = bodyInv(pose)(pose.hands[side]);
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
  const B = bodyXf(pose), Hx = xfOf(headRot(pose, face)), g = growOf(face), ny = 5 * U * (face.nod ?? 0);
  return {
    head: Hx([300, L.hc]), mouth: Hx([300, L.hc + MOUTH_DY * U * g + ny]), crown: Hx([300, L.hc - 1.05 * HEAD_A * g]),
    eyes: [Hx([300 - EX * U * g, L.hc + EY * U * g + ny]), Hx([300 + EX * U * g, L.hc + EY * U * g + ny])] as [P2, P2],
    ears: [Hx([300 - 1.0 * HEAD_A * g, L.hc + 4 * U]), Hx([300 + 1.0 * HEAD_A * g, L.hc + 4 * U])] as [P2, P2],
    hands: [B(armIK(pose, 0, kit).hand), B(armIK(pose, 1, kit).hand)] as [P2, P2],
    chest: B([300, 500]), neck: B([300, L.top + 6]),
  };
};

// ---------------- hands + held things ----------------
const drawHand = (p: Pen, kind: HandK, H: P2, ang: number, skin: string, side: 0 | 1) => {
  const u = U, r = 8.6 * u, s = side ? 1 : -1, fw = 3.7 * u, ink = 2.1 * u;
  const fing = (a: number, len: number, from = 0.25, w = fw) => {
    const b: P2 = [H[0] + Math.cos(a) * r * from, H[1] + Math.sin(a) * r * from], tip: P2 = [H[0] + Math.cos(a) * (r + len), H[1] + Math.sin(a) * (r + len)];
    limb(p, [b, tip], skin, w, ink);
  };
  const palm = (rx = r, ry = r * 0.94) => { p.ell(H[0], H[1], rx + ink, ry + ink, INK, 0); p.ell(H[0], H[1], rx, ry, skin, 0); };
  switch (kind) {
    case "open": for (let i = 0; i < 4; i++) fing(ang + (-0.6 + i * 0.4), (10 - Math.abs(i - 1.5) * 1.6) * u); fing(ang - s * 1.4, 6 * u); palm(); break;
    case "cup": // hand flat on a cheek / an ear: fingers together, pointing along ang
      for (let i = 0; i < 4; i++) fing(ang + (-0.3 + i * 0.2), (9.5 - Math.abs(i - 1.5) * 1.3) * u, 0.25, fw * 0.95);
      fing(ang + s * 1.2, 5.5 * u); palm(r * 0.95, r);
      break;
    case "hug": // squeezing an arm: fingers wrapped round, knuckles showing
      palm(r * 1.02, r * 0.92);
      for (let i = 0; i < 4; i++) { const a = ang + (-0.45 + i * 0.3); p.arc(H[0] + Math.cos(a) * r * 0.7, H[1] + Math.sin(a) * r * 0.7, 2.6 * u, 2.2 * u, 0, 360, 1.2 * u); }
      break;
    case "palm": for (let i = 0; i < 4; i++) fing(ang + (-0.5 + i * 0.33), (8.5 - Math.abs(i - 1.5) * 1.4) * u); fing(ang + s * 1.3, 6 * u); palm(); p.arc(H[0], H[1] + 1 * u, r * 0.5, r * 0.35, 20, 160, 1.3 * u); break;
    case "point": palm(r * 0.95, r * 0.9); fing(ang, 12 * u, 0.1, fw * 1.05); p.arc(H[0] - Math.cos(ang) * 2 * u, H[1] - Math.sin(ang) * 2 * u, r * 0.5, r * 0.4, 200, 320, 1.4 * u); break;
    case "grip": case "fist": {
      palm(r * 1.05, r * 0.95);
      const nx = Math.cos(ang + Math.PI / 2), ny = Math.sin(ang + Math.PI / 2);
      for (let i = 0; i < 3; i++) p.arc(H[0] + Math.cos(ang) * 3 * u + (i - 1) * 4.6 * u * nx, H[1] + Math.sin(ang) * 3 * u + (i - 1) * 4.6 * u * ny, 2.8 * u, 2.4 * u, 0, 360, 1.3 * u);
      if (kind === "grip") fing(ang - s * 1.2, 4.5 * u, 0.4); // thumb over the top
      break;
    }
    default: palm();
  }
};
/** held things, drawn just before the hand (behind the fingers) */
const drawHold = (p: Pen, what: Hold, H: P2, side: 0 | 1, light: number) => {
  const u = U, s = side ? 1 : -1;
  if (what === "mug") { // MUM's tea: a big spotty mug, a wisp of steam
    const c: P2 = [H[0] - s * 13 * u, H[1] - 6 * u], body = rrect(c[0] - 14 * u, c[1] - 15 * u, c[0] + 14 * u, c[1] + 15 * u, 4 * u);
    p.ell(c[0] + s * 15 * u, c[1], 7 * u, 8.5 * u, null, 3.4 * u);
    p.gradFill(body, "#5ec8f0", "#2f86b8", light, 0.3);
    p.clip(body, () => { for (const [x, y] of [[-7, -6], [5, -9], [-2, 4], [8, 6], [-9, 9]]) p.dot(c[0] + x * u, c[1] + y * u, 2.4 * u, WHITE); });
    p.poly(body, null, 2.6 * u);
    p.ell(c[0], c[1] - 15 * u, 14 * u, 3.2 * u, "#c88a5a", 1.6 * u);
    p.stroke(thru([c[0] - 2 * u, c[1] - 20 * u], [c[0] + 4 * u, c[1] - 30 * u], [c[0] - 1 * u, c[1] - 40 * u], 8), 2.2 * u, "rgba(255,255,255,0.8)");
  } else if (what === "spatula") { // DAD's BBQ spatula, held up like a sceptre
    const a = rad(-100 + s * 6), d: P2 = [Math.cos(a), Math.sin(a)];
    const h0: P2 = [H[0] - d[0] * 14 * u, H[1] - d[1] * 14 * u], h1: P2 = [H[0] + d[0] * 26 * u, H[1] + d[1] * 26 * u], b1: P2 = [H[0] + d[0] * 58 * u, H[1] + d[1] * 58 * u];
    limb(p, [h0, h1], "#3a3a44", 4.6 * u, 1.4 * u);
    p.stroke([h1, lerp2(h1, b1, 0.3)], 2.2 * u, "#c8ccd6");
    const c = lerp2(h1, b1, 0.62), bl = rotPts(rrect(c[0] - 11 * u, c[1] - 15 * u, c[0] + 11 * u, c[1] + 15 * u, 2.5 * u), a + Math.PI / 2, c);
    p.gradFill(bl, "#e8ecf2", "#9aa2b2", light, 0.3); p.poly(bl, null, 2.4 * u);
    for (let i = -1; i <= 1; i++) p.stroke(rotPts([[c[0] + i * 5 * u, c[1] - 9 * u], [c[0] + i * 5 * u, c[1] + 9 * u]], a + Math.PI / 2, c), 1.6 * u, "#7a8292");
  } else if (what === "pad") { // FRIEND's game controller
    const c: P2 = [H[0] - s * 10 * u, H[1] - 2 * u], body = [...thru([c[0] - 24 * u, c[1] + 6 * u], [c[0], c[1] - 12 * u], [c[0] + 24 * u, c[1] + 6 * u], 10), ...thru([c[0] + 24 * u, c[1] + 6 * u], [c[0], c[1] + 14 * u], [c[0] - 24 * u, c[1] + 6 * u], 10).slice(1)];
    p.gradFill(body, "#9a7cf2", "#5a44b0", light, 0.3); p.poly(body, null, 2.6 * u);
    p.poly([[c[0] - 15 * u, c[1] - 1 * u], [c[0] - 9 * u, c[1] - 1 * u], [c[0] - 12 * u, c[1] - 5 * u]], WHITE, 0);
    for (const [x, y, col] of [[12, -4, "#ff4f8a"], [16, 0, "#ffd23f"], [8, 0, "#36d6a8"]] as [number, number, string][]) p.ell(c[0] + x * u, c[1] + y * u, 2.4 * u, 2.4 * u, col, 1 * u);
  } else if (what === "apple") { // TEACHER's shiny red apple
    const c: P2 = [H[0], H[1] - 14 * u], ap = [...thru([c[0], c[1] - 9 * u], [c[0] + 13 * u, c[1] - 12 * u], [c[0] + 12 * u, c[1] + 4 * u], 8), ...thru([c[0] + 12 * u, c[1] + 4 * u], [c[0] + 4 * u, c[1] + 14 * u], [c[0], c[1] + 11 * u], 6).slice(1), ...thru([c[0], c[1] + 11 * u], [c[0] - 4 * u, c[1] + 14 * u], [c[0] - 12 * u, c[1] + 4 * u], 6).slice(1), ...thru([c[0] - 12 * u, c[1] + 4 * u], [c[0] - 13 * u, c[1] - 12 * u], [c[0], c[1] - 9 * u], 8).slice(1, -1)];
    p.gradFill(ap, "#f2333f", "#a8162a", light, 0.3); p.poly(ap, null, 2.6 * u);
    p.arc(c[0] - 5 * u, c[1] - 3 * u, 4 * u, 5 * u, 200, 260, 2.2 * u, "rgba(255,255,255,0.85)");
    p.stroke([[c[0], c[1] - 9 * u], [c[0] + 1 * u, c[1] - 15 * u]], 2 * u, "#5a3420");
    p.poly([[c[0] + 1 * u, c[1] - 13 * u], [c[0] + 9 * u, c[1] - 17 * u], [c[0] + 4 * u, c[1] - 11 * u]], "#5ac85a", 1.4 * u);
  } else if (what === "knit") { // GRANDMA's knitting: a pink scarf on two needles
    const c: P2 = [H[0] - s * 18 * u, H[1] + 4 * u];
    for (const k of [-1, 1]) p.stroke([[c[0] - 22 * u, c[1] - 20 * u + k * 3 * u], [c[0] + 24 * u, c[1] - 14 * u + k * 3 * u]], 2.4 * u, "#c8a050");
    const sc = rrect(c[0] - 14 * u, c[1] - 18 * u, c[0] + 12 * u, c[1] + 20 * u, 3 * u);
    p.gradFill(sc, "#ff8ab8", "#d04a84", light, 0.3); p.poly(sc, null, 2.2 * u);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) p.arc(c[0] - 9 * u + j * 8 * u, c[1] - 12 * u + i * 9 * u, 3 * u, 3 * u, 30, 150, 1.2 * u, "#b03a70");
  } else if (what === "clipboard") { // the RESEARCHER's clipboard: voices A..F, ticks, one row circled
    const c: P2 = [H[0] - s * 26 * u, H[1] - 14 * u], a = -s * 0.14;
    p.poly(rotPts(rrect(c[0] - 26 * u, c[1] - 34 * u, c[0] + 26 * u, c[1] + 34 * u, 3 * u), a, c), "#3a4a6a", 2.8 * u);
    p.poly(rotPts(rrect(c[0] - 21 * u, c[1] - 26 * u, c[0] + 21 * u, c[1] + 30 * u, 1.5 * u), a, c), "#fbfaf4", 1.2 * u);
    for (let i = 0; i < 6; i++) {
      const y = c[1] - 18 * u + i * 8 * u;
      p.stroke(rotPts([[c[0] - 15 * u, y], [c[0] + (2 + 8 * rnd(3, i)) * u, y]], a, c), 1.4 * u, "#8a94aa");
      p.stroke(rotPts([[c[0] + 10 * u, y], [c[0] + 12 * u, y + 2 * u], [c[0] + 16 * u, y - 3 * u]], a, c), 1.4 * u, "#2fae6a");
    }
    p.poly(rotPts(ellPts(c[0] - 3 * u, c[1] + 6 * u, 16 * u, 5 * u, 24), a, c), null, 1.6 * u);
    p.poly(rotPts(rrect(c[0] - 9 * u, c[1] - 38 * u, c[0] + 9 * u, c[1] - 28 * u, 2 * u), a, c), "#cfd6e2", 1.8 * u);
  } else { // pen
    const a = rad(-118 + s * 8), tip: P2 = [H[0] - Math.cos(a) * 12 * u, H[1] - Math.sin(a) * 12 * u], end: P2 = [H[0] + Math.cos(a) * 20 * u, H[1] + Math.sin(a) * 20 * u];
    limb(p, [tip, end], "#16b8a8", 3.2 * u, 1.3 * u);
    p.dot(end[0], end[1], 2.2 * u, INK);
    p.dot(tip[0], tip[1], 1.4 * u, INK);
  }
};

// ---------------- hair ----------------
/** a curled lock from the head rim at angle a (deg) */
const lock = (p: Pen, col: string, cx: number, hc: number, H: Blob, a: number, len: number, dir: number, curl: number, u: number, w = 0.15) => {
  const ar = rad(a), b0: P2 = [cx + Math.cos(ar - w) * H.a * 0.9, hc + Math.sin(ar - w) * H.b * 0.9], b1: P2 = [cx + Math.cos(ar + w) * H.a * 0.9, hc + Math.sin(ar + w) * H.b * 0.9];
  const M: P2 = [cx + Math.cos(ar) * H.a, hc + Math.sin(ar) * H.b], tip: P2 = [M[0] + Math.cos(dir) * len, M[1] + Math.sin(dir) * len];
  const nx = -Math.sin(dir), ny = Math.cos(dir);
  const c0: P2 = [lerp(b0[0], tip[0], 0.55) + nx * curl, lerp(b0[1], tip[1], 0.55) + ny * curl], c1: P2 = [lerp(b1[0], tip[0], 0.55) + nx * curl * 0.6, lerp(b1[1], tip[1], 0.55) + ny * curl * 0.6];
  p.poly([...qbez(b0, c0, tip, 8), ...qbez(tip, c1, b1, 8).slice(1)], col, 3.6 * u);
};
/** a hair cap over the crown down to (cut) of the head height, closed by a fringe line */
const capHair = (p: Pen, col: string, hp: P2[], cx: number, hc: number, H: Blob, cut: number, u: number, light: number, thick: number, fringe: (xR: number, yR: number, xL: number, yL: number) => P2[], grow = 1.05) => {
  const n = hp.length, cutY = hc - cut * H.b, run: P2[] = [];
  for (let i = Math.floor(n / 2); i < n; i++) if (hp[i][1] < cutY) run.push([cx + (hp[i][0] - cx) * grow, hc + (hp[i][1] - hc) * grow]);
  if (run.length < 4) return;
  const [xR, yR] = run[run.length - 1], [xL, yL] = run[0];
  const pts = [...run, ...fringe(xR, yR, xL, yL)];
  p.shadedFill(pts, col, mul(col, SH_HAIR), light, H.a, 0.35);
  p.clip(pts, () => { const a = (light * 180) / Math.PI; p.arc(cx, hc - 4 * u, 0.8 * H.a, 0.78 * H.b, a - 24, a + 24, 3.6 * u, mix(col, WHITE, 0.35)); });
  p.inkRing(pts, 4.2 * u, thick, 0.45);
};
const blobRing = (p: Pen, pts: P2[], col: string, u: number, light: number, thick: number, R: number) => {
  p.inkRing(pts, 4 * u, thick, 0.4); p.shadedFill(shrink(pts, 0.97), col, mul(col, SH_HAIR), light, R, 0.35);
};
const hairBack = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, u: number, up: number, light: number, thick: number) => {
  const col = k.hair;
  if (k.hairStyle === "quiff") { // short tufts round the back of the crown (float up when smitten)
    for (let i = 0; i < 9; i++) {
      const f = i / 8, a = 196 + f * 148 + (rnd(k.seed, i) - 0.5) * 8, Lh = (12 + 12 * rnd(k.seed, i + 3)) * u * (1 + 0.8 * up);
      let dir = rad(a) + (rnd(k.seed, i + 9) - 0.5) * 0.5;
      dir = lerp(dir, -Math.PI / 2 + (f - 0.5) * 1.2, 0.7 * up);
      lock(p, i % 3 === 1 ? mul(col, [0.84, 0.82, 0.86]) : col, cx, hc, H, a, Lh, dir, (i % 2 ? 1 : -1) * 8 * u, u);
    }
  } else if (k.hairStyle === "wavy") { // shoulder-length waves behind the face
    const pts: P2[] = [];
    for (let i = 0; i <= 28; i++) { const a = rad(160 + (i / 28) * 220), r = 1.16 + 0.03 * Math.sin(i * 1.7); pts.push([cx + Math.cos(a) * H.a * r, hc - 0.1 * H.b + Math.sin(a) * H.b * r]); }
    const bot: P2[] = [];
    for (let i = 0; i <= 12; i++) { const f = i / 12, x = lerp(cx + 1.16 * H.a, cx - 1.16 * H.a, f); bot.push([x + 6 * u * Math.sin(f * 18), hc + 0.95 * H.b + 10 * u * Math.sin(f * Math.PI * 4) ** 2]); }
    const all = [...pts, [cx + 1.22 * H.a, hc + 0.5 * H.b] as P2, ...bot, [cx - 1.22 * H.a, hc + 0.5 * H.b] as P2];
    blobRing(p, all, mul(col, [0.9, 0.86, 0.88]), u, light, thick, H.a * 1.2);
    for (let i = 0; i < 5; i++) p.arc(cx + (i - 2) * 0.48 * H.a, hc + 0.72 * H.b, 10 * u, 14 * u, 200, 340, 1.6 * u, mul(col, [0.6, 0.55, 0.62]));
  } else if (k.hairStyle === "puffs") { // two big afro puffs high on the head
    for (const s of [-1, 1]) {
      const c: P2 = [cx + s * 0.86 * H.a, hc - 0.86 * H.b], pts: P2[] = [];
      for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2, r = 1 + 0.06 * Math.sin(i * 1.3 + s); pts.push([c[0] + Math.cos(a) * 46 * u * r, c[1] + Math.sin(a) * 42 * u * r]); }
      blobRing(p, pts, col, u, light, thick, 46 * u);
      for (let i = 0; i < 6; i++) p.arc(c[0] + (rnd(k.seed, i + s * 7) - 0.5) * 50 * u, c[1] + (rnd(k.seed, i + 20 + s) - 0.5) * 44 * u, 5 * u, 4 * u, 200, 340, 1.4 * u, mix(col, WHITE, 0.18));
      p.ell(c[0] - s * 30 * u, c[1] + 30 * u, 9 * u, 6 * u, k.trim, 2 * u); // hair tie
    }
  } else if (k.hairStyle === "perm") { // GRANDMA: a lilac perm of curls + a little bun on top
    const bun = ellPts(cx + 8 * u, hc - 1.12 * H.b, 34 * u, 26 * u, 34);
    blobRing(p, bun, col, u, light, thick, 34 * u);
    p.arc(cx + 8 * u, hc - 1.12 * H.b, 20 * u, 14 * u, 200, 520, 1.6 * u, mul(col, [0.75, 0.72, 0.82]));
    for (let i = 0; i < 13; i++) {
      const a = rad(172 + (i / 12) * 196), x = cx + Math.cos(a) * H.a * 1.0, y = hc - 0.06 * H.b + Math.sin(a) * H.b * 0.98, r = (15 + 3 * rnd(k.seed, i)) * u;
      const pt = ellPts(x, y, r, r * 0.92, 22);
      p.inkRing(pt, 3.6 * u, thick, 0.4); p.poly(shrink(pt, 0.94), col, 0);
      p.arc(x - 2 * u, y - 2 * u, r * 0.5, r * 0.45, 200, 300, 1.5 * u, mul(col, [0.78, 0.74, 0.86]));
    }
  } else if (k.hairStyle === "topknot") { // RESEARCHER: slick hair pulled up into a tall knot
    const knot = ellPts(cx - 4 * u, hc - 1.3 * H.b, 30 * u, 30 * u, 34);
    blobRing(p, knot, col, u, light, thick, 30 * u);
    p.arc(cx - 4 * u, hc - 1.3 * H.b, 17 * u, 16 * u, 150, 470, 2 * u, mix(col, WHITE, 0.25));
    p.poly(rrect(cx - 20 * u, hc - 1.06 * H.b - 6 * u, cx + 12 * u, hc - 1.06 * H.b + 6 * u, 4 * u), "#16b8a8", 2 * u); // band
  } else if (k.hairStyle === "sides") { // TEACHER: tufty grey sides above the ears
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const a = s > 0 ? -18 + i * 15 : 198 - i * 15;
      lock(p, col, cx, hc, H, a, (13 + 4 * rnd(k.seed, i)) * u, rad(a) + s * 0.4, (i % 2 ? 1 : -1) * 5 * u, u, 0.2);
    }
  }
};
const hairFront = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, u: number, up: number, light: number, thick: number) => {
  const col = k.hair;
  if (k.hairStyle === "quiff") {
    // a short cap, then the WAVE QUIFF: one big swoosh rising off the forehead and curling over (a sound wave!)
    capHair(p, col, hp, cx, hc, H, 0.46, u, light, thick, (xR, yR, xL, yL) => {
      const out: P2[] = [];
      for (let j = 1; j < 7; j++) { const f = j / 7; out.push([lerp(xR, xL, f), lerp(yR, yL, f) + (j % 2 ? 9 + 5 * rnd(k.seed, j) : 2) * u]); }
      return out;
    });
    const b0: P2 = [cx - 0.62 * H.a, hc - 0.66 * H.b], b1: P2 = [cx + 0.34 * H.a, hc - 0.86 * H.b];
    const lift = 1 + 0.35 * up, tip: P2 = [cx + 0.62 * H.a, hc - (1.32 + 0.12 * up) * H.b * lift];
    const top = thru(b0, [cx - 0.1 * H.a, hc - (1.5 + 0.1 * up) * H.b], tip, 14), curlIn = thru(tip, [cx + 0.44 * H.a, hc - 1.12 * H.b], [cx + 0.3 * H.a, hc - 1.2 * H.b], 8).slice(1);
    const under = thru([cx + 0.3 * H.a, hc - 1.2 * H.b], [cx - 0.04 * H.a, hc - 1.0 * H.b], b1, 10).slice(1);
    const sw: P2[] = [...top, ...curlIn, ...under, ...thru(b1, [cx - 0.2 * H.a, hc - 0.6 * H.b], b0, 8).slice(1, -1)];
    p.inkRing(sw, 4.2 * u, thick, 0.45);
    p.shadedFill(shrink(sw, 0.98), col, mul(col, SH_HAIR), light, H.a * 0.8, 0.35);
    p.stroke(thru([cx - 0.44 * H.a, hc - 0.86 * H.b], [cx - 0.08 * H.a, hc - 1.3 * H.b], [cx + 0.44 * H.a, hc - 1.28 * H.b], 10), 3.4 * u, mix(col, WHITE, 0.38));
    p.stroke(thru([cx - 0.3 * H.a, hc - 0.8 * H.b], [cx + 0.02 * H.a, hc - 1.12 * H.b], [cx + 0.26 * H.a, hc - 1.1 * H.b], 8), 1.6 * u, mul(col, [0.6, 0.55, 0.6]));
  } else if (k.hairStyle === "wavy") {
    capHair(p, col, hp, cx, hc, H, 0.3, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR], [cx + 0.32 * H.a, hc - 0.2 * H.b], [cx - 0.1 * H.a, hc - 0.5 * H.b], 10).slice(1).concat(thru([cx - 0.1 * H.a, hc - 0.5 * H.b], [cx - 0.6 * H.a, hc - 0.5 * H.b], [xL, yL], 8).slice(1, -1)), 1.08);
    if (k.headband) { // a mint headband over the crown
      const pts = thru([cx - 0.98 * H.a, hc - 0.38 * H.b], [cx, hc - 1.2 * H.b], [cx + 0.98 * H.a, hc - 0.38 * H.b], 16);
      limb(p, pts, k.headband, 8 * u, 1.8 * u);
      p.stroke(pts.slice(3, 9).map(([x, y]) => [x, y - 1.6 * u] as P2), 1.6 * u, mix(k.headband, WHITE, 0.5));
    }
  } else if (k.hairStyle === "crop") { // DAD: a short receding crop (a shiny forehead peninsula)
    capHair(p, col, hp, cx, hc, H, 0.52, u, light, thick, (xR, yR, xL, yL) => [
      ...thru([xR, yR], [cx + 0.5 * H.a, hc - 0.8 * H.b], [cx + 0.2 * H.a, hc - 0.92 * H.b], 8).slice(1),
      ...thru([cx + 0.2 * H.a, hc - 0.92 * H.b], [cx, hc - 0.82 * H.b], [cx - 0.2 * H.a, hc - 0.92 * H.b], 6).slice(1),
      ...thru([cx - 0.2 * H.a, hc - 0.92 * H.b], [cx - 0.5 * H.a, hc - 0.8 * H.b], [xL, yL], 8).slice(1, -1)]);
  } else if (k.hairStyle === "puffs") {
    capHair(p, col, hp, cx, hc, H, 0.5, u, light, thick, (xR, yR, xL, yL) => thru([xR, yR], [cx, hc - 0.66 * H.b], [xL, yL], 12).slice(1, -1));
    for (const s of [-1, 1]) p.stroke(thru([cx + s * 0.86 * H.a, hc - 0.4 * H.b], [cx + s * 0.94 * H.a, hc - 0.2 * H.b], [cx + s * 0.86 * H.a, hc - 0.08 * H.b], 6), 2 * u, col); // baby hairs
  } else if (k.hairStyle === "perm") {
    capHair(p, col, hp, cx, hc, H, 0.46, u, light, thick, (xR, yR, xL, yL) => {
      const out: P2[] = [];
      for (let j = 1; j < 8; j++) { const f = j / 8; out.push([lerp(xR, xL, f), lerp(yR, yL, f) + (j % 2 ? 8 : 0) * u]); }
      return out;
    });
    for (let i = 0; i < 5; i++) p.arc(cx + (i - 2) * 17 * u, hc - 0.6 * H.b - Math.abs(i - 2) * 2 * u, 6 * u, 5 * u, 180, 400, 1.6 * u, mul(col, [0.72, 0.68, 0.82]));
  } else if (k.hairStyle === "topknot") { // slicked straight back from a centre widow's peak
    capHair(p, col, hp, cx, hc, H, 0.42, u, light, thick, (xR, yR, xL, yL) => [...thru([xR, yR], [cx + 0.4 * H.a, hc - 0.66 * H.b], [cx, hc - 0.58 * H.b], 8).slice(1), ...thru([cx, hc - 0.58 * H.b], [cx - 0.4 * H.a, hc - 0.66 * H.b], [xL, yL], 8).slice(1, -1)]);
    for (const s of [-1, 1]) p.stroke(thru([cx + s * 0.1 * H.a, hc - 0.7 * H.b], [cx + s * 0.4 * H.a, hc - 0.96 * H.b], [cx + s * 0.2 * H.a, hc - 1.04 * H.b], 8), 1.6 * u, mix(col, WHITE, 0.3));
  } else if (k.hairStyle === "sides") { // shiny bald top
    p.arc(cx - 0.2 * H.a, hc - 0.62 * H.b, 0.32 * H.a, 0.18 * H.b, 200, 300, 4 * u, "rgba(255,255,255,0.7)");
  }
};

// ---------------- faces ----------------
const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: P2, shake: number, k: number, skin: string) => {
  const lx = x + look[0] * 2.6 * u, ly = ey + look[1] * 2.4 * u, w = 3.9 * u;
  switch (kind) {
    case "dot": p.ell(lx, ly, 4.7 * u, 6.6 * u, INK, 0); p.dot(lx - 1.5 * u, ly - 2.6 * u, 1.5 * u, WHITE); break;
    case "wide": p.ell(x, ey - u, 9.6 * u, 11.2 * u, WHITE, 2.6 * u); p.ell(lx, ly, 4.6 * u, 5.8 * u, INK, 0); p.dot(lx - 1.6 * u, ly - 2.2 * u, 1.6 * u, WHITE); break;
    case "tiny": { // horror: huge whites, pin pupils that tremble
      p.ell(x, ey - 1.5 * u, 11 * u, 12.6 * u, WHITE, 2.8 * u);
      p.dot(x + (shake % 2 ? 0.7 : -0.7) * u + look[0] * 2 * u, ey - 0.5 * u + look[1] * 2 * u, 2.1 * u);
      break;
    }
    case "worry": { // big wet eyes, wobbling pupils, a tear line
      p.ell(x, ey - u, 10 * u, 11.6 * u, WHITE, 2.6 * u);
      const ox = (shake % 2 ? 0.6 : -0.6) * u + look[0] * 2 * u;
      p.ell(x + ox, ey + 1.5 * u, 5.4 * u, 6.4 * u, INK, 0); p.dot(x + ox - 1.8 * u, ey - 1 * u, 2 * u, WHITE); p.dot(x + ox + 1.6 * u, ey + 3.2 * u, 1 * u, WHITE);
      p.arc(x, ey + 1 * u, 8.5 * u, 9.5 * u, 30, 150, 1.6 * u, TEAR);
      break;
    }
    case "lid": p.ell(lx, ey + 0.6 * u, 5 * u, 5.4 * u, INK, 0, 0, 180); p.stroke([[x - 8.5 * u, ey + 0.4 * u], [x + 8.5 * u, ey + 0.4 * u]], w); break;
    case "heavy": p.ell(lx, ey + 3 * u, 4.6 * u, 3.4 * u, INK, 0, 0, 180); p.stroke([[x - side * 7 * u, ey + 2.2 * u], [x + side * 9 * u, ey + 4.6 * u]], w * 1.1); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6.6 * u, 200, 340, w); break;
    case "closed": p.arc(x, ey - 2 * u, 8 * u, 5 * u, 20, 160, w); break;
    case "side": { // sly: lidded, pupils slid to `look`
      const px = x + look[0] * 4.4 * u, wpts = ellPts(x, ey, 9.4 * u, 7.2 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => { p.ell(px, ey + 1.6 * u, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.2 * u, ey - 0.2 * u, 1.3 * u, WHITE); p.poly([[x - 12 * u, ey - 10 * u], [x + 12 * u, ey - 10 * u], [x + 12 * u, ey - 1.4 * u], [x - 12 * u, ey - 1.4 * u]], mul(skin, [0.94, 0.86, 0.86]), 0); });
      p.poly(wpts, null, 2.4 * u);
      p.stroke([[x - 10.5 * u, ey - 1.4 * u], [x + 10.5 * u, ey - 1.4 * u]], w * 1.1);
      break;
    }
    case "heart": { // THE MEME: big pulsing heart eyes with a shine
      const r = (12.5 + 2.2 * Math.min(1.2, k)) * u, hp = heartPts(x, ey - 1 * u, r, 44);
      p.poly(hp, HEART, 3 * u);
      p.clip(hp, () => { p.ell(x + 4 * u, ey + 6 * u, r * 0.9, r * 0.7, mul(HEART, [0.78, 0.6, 0.7]), 0); });
      p.poly(hp, null, 3 * u);
      p.ell(x - r * 0.42, ey - r * 0.42, r * 0.22, r * 0.16, WHITE, 0, 0, 360, -30);
      p.dot(x - r * 0.12, ey - r * 0.6, r * 0.08, WHITE);
      break;
    }
  }
};
const dmouth = (p: Pen, pts: P2[], inner: () => void, ink: number) => { p.poly(pts, MOUTH, 0); p.clip(pts, inner); p.poly(pts, null, ink); };
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number, talk: number, braces: boolean) => {
  const mw = 4 * u;
  switch (kind) {
    case "small": p.arc(mx, my - 2 * u, 5.5 * u, 3.4 * u, 25, 155, mw * 0.9); break;
    case "smile": p.arc(mx, my - 3 * u, 8.5 * u, 5 * u, 20, 160, mw); break;
    case "flat": p.stroke([[mx - 8.5 * u, my + 1.5 * u], [mx + 8.5 * u, my + 1.5 * u]], mw); break;
    case "o": p.ell(mx, my + u, 3.8 * u, 4.6 * u, MOUTH, 2.8 * u); break;
    case "frown": p.arc(mx, my + 5 * u, 8.5 * u, 4.6 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + 4 * u, my - 4 * u, 8 * u, 4.5 * u, 10, 120, mw); p.stroke([[mx - 6 * u, my - 0.4 * u], [mx + 3 * u, my + 0.6 * u]], mw); break;
    case "wobble": {
      const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.8 * u * Math.sin(i * 1.5 + (shake % 2) * 0.8)]);
      p.stroke(s, 3.2 * u); break;
    }
    case "eek": case "cringe": { // horror grimace: a wide clenched rectangle of teeth (cringe = smaller, lopsided)
      const c = kind === "cringe", w = (c ? 12 : 16) * u, h = (c ? 6 : 8.5) * u, sk = c ? 2.5 * u : 0, wob = (shake % 2 ? 0.6 : -0.6) * u;
      const pts: P2[] = [[mx - w, my - h * 0.5 + sk + wob], ...thru([mx - w * 0.5, my - h * 0.8], [mx, my - h * 0.62], [mx + w * 0.5, my - h * 0.8], 6), [mx + w, my - h * 0.5 - sk], [mx + w * 0.9, my + h * 0.6 - sk], ...thru([mx + w * 0.5, my + h * 0.85], [mx, my + h * 0.7], [mx - w * 0.5, my + h * 0.85], 6), [mx - w * 0.9, my + h * 0.6 + sk]];
      p.poly(pts, WHITE, 0);
      p.clip(pts, () => {
        p.stroke([[mx - w, my + 0.2 * u], [mx + w, my - 0.2 * u]], 1.6 * u, "#8a7a8a");
        for (let i = -3; i <= 3; i++) p.stroke([[mx + i * w * 0.27, my - h], [mx + i * w * 0.27, my + h]], 1.4 * u, "#8a7a8a");
      });
      p.poly(pts, null, 3 * u);
      if (!c) for (const s of [-1, 1]) p.arc(mx + s * (w + 3 * u), my, 3 * u, 6 * u, s > 0 ? -70 : 110, s > 0 ? 70 : 250, 1.8 * u); // strained corners
      break;
    }
    case "bigO": dmouth(p, ellPts(mx, my + 3 * u, 8 * u, 10 * u, 30), () => p.ell(mx, my + 11 * u, 5 * u, 3.4 * u, TONGUE, 0), 3 * u); break;
    case "drop": { // jaw on the floor: a long tall oval, tongue, uvula
      const w = 9.5 * u, h = 18 * u;
      dmouth(p, ellPts(mx, my + h * 0.55, w, h, 34), () => {
        const g = p.g, [ax, ay] = p.P(mx, my - 4 * u), [bx, by] = p.P(mx, my + 2 * h);
        const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, THROAT); gr.addColorStop(1, MOUTH); fillAll(p, gr);
        p.ell(mx, my + h * 1.38, w * 0.78, h * 0.42, TONGUE, 0);
        p.ell(mx, my - h * 0.18, 2 * u, 3 * u, "#c8404e", 0);
      }, 3.2 * u);
      break;
    }
    case "tongue": p.ell(mx + 5 * u, my + 3 * u, 3.6 * u, 4.2 * u, TONGUE, 2.2 * u, 0, 180); p.stroke([[mx - 7 * u, my + 1 * u], [mx + 9 * u, my + 0.4 * u]], mw); break;
    case "grin": {
      const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 10 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)];
      p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 13 * u, my - 0.5 * u], [mx + 13 * u, my - 0.5 * u]], 1.3 * u);
      if (braces) { p.stroke([[mx - 11 * u, my - 2 * u], [mx + 11 * u, my - 2 * u]], 1.4 * u, "#8a94aa"); for (let i = -2; i <= 2; i++) p.poly(rrect(mx + i * 4.4 * u - 1.4 * u, my - 3.4 * u, mx + i * 4.4 * u + 1.4 * u, my - 0.6 * u, 0.5 * u), "#c8d0dc", 0.6 * u); }
      break;
    }
    case "aww": dmouth(p, [...thru([mx - 8 * u, my - 2 * u], [mx, my - 1 * u], [mx + 8 * u, my - 2 * u], 8), ...thru([mx + 8 * u, my - 2 * u], [mx, my + 8 * u], [mx - 8 * u, my - 2 * u], 10).slice(1)], () => p.ell(mx, my + 6 * u, 5 * u, 3 * u, TONGUE, 0), 2.8 * u); break;
    case "shy": { // a small wobbly closed smile, pulled to one side
      const s: P2[] = []; for (let i = 0; i <= 12; i++) { const f = i / 12; s.push([mx - 7 * u + f * 15 * u, my - 1 * u + 4 * u * Math.sin(f * Math.PI) - 2 * u * f + 0.6 * u * Math.sin(f * 14)]); }
      p.stroke(s, 3.4 * u); p.stroke([[mx + 8 * u, my - 3.4 * u], [mx + 10 * u, my - 5.6 * u]], 2.4 * u);
      break;
    }
    case "talk": { // open by `talk` 0..1: a soft O that stretches open
      const o = cl01(talk), w = (5 + 3 * o) * u, h = (1.4 + 8.5 * o) * u;
      if (o < 0.08) { p.arc(mx, my - 1.5 * u, 6 * u, 3 * u, 25, 155, mw * 0.9); break; }
      dmouth(p, ellPts(mx, my + h * 0.45, w, h, 28), () => p.ell(mx, my + h * 1.25, w * 0.7, h * 0.42, TONGUE, 0), 2.8 * u);
      break;
    }
    case "dreamy": { // THE MEME: a big blissful open smile, top teeth, a happy tongue
      const s = 0.85 + 0.15 * Math.min(1.2, k), w = 19 * u * s, d = 20 * u * s, top = my - 5 * u;
      const pts: P2[] = [...thru([mx - w, top - 3 * u], [mx, top + 2 * u], [mx + w, top - 3 * u], 10)];
      for (let i = 1; i < 18; i++) { const a = (i / 18) * Math.PI; pts.push([mx + w * Math.cos(a), top - 3 * u + d * Math.sin(a)]); }
      dmouth(p, pts, () => {
        p.poly([...thru([mx - w, top - 9 * u], [mx, top - 4 * u], [mx + w, top - 9 * u], 10), [mx + w, top + 2 * u], ...thru([mx + w * 0.85, top + 3 * u], [mx, top + 7 * u], [mx - w * 0.85, top + 3 * u], 10), [mx - w, top + 2 * u]], WHITE, 0);
        p.ell(mx + 1.5 * u, top + d * 0.92, w * 0.62, d * 0.42, TONGUE, 0);
        p.stroke([[mx + 1.5 * u, top + d * 0.62], [mx + 1.5 * u, top + d * 0.85]], 1.3 * u, "#d8505e");
      }, 3.2 * u);
      for (const sd of [-1, 1]) p.arc(mx + sd * (w + 3.5 * u), top + 1 * u, 4 * u, 6 * u, sd > 0 ? -60 : 120, sd > 0 ? 60 : 240, 2.2 * u);
      break;
    }
  }
};
const drawFace = (p: Pen, kit: Kit, cx: number, hc: number, H: Blob, f: FaceS, lid: number, g: number, hp: P2[]) => {
  const D = FACES[f.e], u = U * g, look = f.look ?? D.look ?? [0, 0], shake = f.shake ?? 0, k = f.k ?? 1, ny = 5 * U * (f.nod ?? 0);
  const ey = hc + EY * u + ny, ex = EX * u, gc = p.g;
  // ---- skin washes: pale (fear, from the top), gloom (defeated: violet + vertical lines), blush ----
  const pale = D.pale ?? 0, gloom = D.gloom ?? 0, blush = (D.blush ?? 0) * (f.e === "meme" ? Math.min(1.2, k) : 1);
  if (pale > 0.02 || gloom > 0.02 || blush > 0.02) clipAll(p, [hp], () => {
    const [ax, ay] = p.P(cx, hc - H.b), [bx, by] = p.P(cx, hc + 0.2 * H.b);
    if (pale > 0.02) { const gr = gc.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, rgba("#6a8ad8", 0.62 * pale)); gr.addColorStop(1, rgba("#6a8ad8", 0)); fillAll(p, gr); }
    if (gloom > 0.02) {
      const gr = gc.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, rgba("#4a3a8a", 0.72 * gloom)); gr.addColorStop(1, rgba("#4a3a8a", 0)); fillAll(p, gr);
      for (let i = -3; i <= 3; i++) p.stroke([[cx + i * 13 * u, hc - 1.1 * H.b], [cx + i * 13 * u, hc - (0.42 + 0.12 * (i % 2 ? 1 : 0)) * H.b]], 2.2 * u, rgba("#241726", 0.75 * gloom));
    }
    if (blush > 0.02) for (const s of [-1, 1]) fillAll(p, radial(p, cx + s * 0.6 * H.a, hc + 0.3 * H.b + ny, 0.3 * H.a * Math.min(1.25, 0.8 + 0.35 * blush), "#ff4d6a", Math.min(0.85, 0.7 * blush)));
  });
  if ((D.hatch ?? 0) > 0.02) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { // blush hatching ///
    const x = cx + s * 0.6 * H.a + (i - 1) * 6 * u, y = hc + 0.3 * H.b + ny;
    p.stroke([[x - 2.4 * u, y + 4 * u], [x + 2.4 * u, y - 4 * u]], 1.8 * u * (D.hatch ?? 0) + 0.6, "#e0304e");
  }
  if (kit.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(cx + s * (0.4 + 0.09 * i) * H.a, hc + (0.2 + (i % 2) * 0.07) * H.b + ny, 1.5 * u, rgba("#a85a3a", 0.7));
  for (const side of [-1, 1]) {
    let ek = D.eye;
    if (lid >= 1 && !["happy", "closed", "heart"].includes(ek)) ek = "closed";
    else if (lid > 0 && (ek === "dot" || ek === "wide")) ek = "lid";
    else if (lid > 0 && ek === "lid") ek = "heavy";
    const x = cx + side * ex;
    eye(p, ek, x, ey, u, side, look, shake, k, kit.skin);
    if (kit.lashes && (ek === "dot" || ek === "lid" || ek === "happy" || ek === "closed" || ek === "side")) for (let i = 0; i < 2; i++) p.stroke([[x + side * (6 + i * 2.6) * u, ey - (ek === "happy" ? 1 : 3.8 + i * 0.5) * u], [x + side * (9.5 + i * 3) * u, ey - (ek === "happy" ? 3 : 7 + i) * u]], 1.8 * u);
    if (D.crinkle) for (const a of [-28, 0, 28]) { const b = side > 0 ? rad(a) : Math.PI - rad(a); p.stroke([[x + side * 11 * u + Math.cos(b) * 1 * u, ey + Math.sin(b) * 1 * u], [x + side * 11 * u + Math.cos(b) * 5.4 * u, ey + Math.sin(b) * 5.4 * u]], 1.7 * u); }
    const [dI, dO] = side > 0 && D.brow2 ? D.brow2 : D.brow, big = ek === "wide" || ek === "tiny" || ek === "worry" || ek === "heart";
    const by = ey - (big ? 23 : 19) * u - (kit.glasses && kit.glasses.style !== "half" ? 2 * u : 0), bc = kit.hairStyle === "sides" || kit.hairStyle === "perm" ? mul(kit.hair, [0.7, 0.7, 0.76]) : INK;
    tapered(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], (kit.hairStyle === "sides" ? 7 : 5.2) * u, 2.6 * u, bc);
  }
  if (kit.glasses) {
    const G = kit.glasses;
    for (const side of [-1, 1]) {
      const x = cx + side * ex;
      if (G.style === "round") { p.ell(x, ey, 12.4 * u, 12 * u, "rgba(220,240,255,0.18)", 5.2 * u); p.arc(x, ey, 12.4 * u, 12 * u, 0, 360, 2.4 * u, G.col); }
      else if (G.style === "half") { const y0 = ey + 1.5 * u, rim = thru([x - 12 * u, y0], [x, y0 + 12 * u], [x + 12 * u, y0], 10); p.poly(rim, "rgba(220,240,255,0.2)", 4.6 * u); p.stroke([...rim, rim[0]], 2 * u, G.col); }
      else { // cat-eye: flicked outer corners
        const pts: P2[] = [[x - side * 11 * u, ey - 2 * u], ...thru([x - side * 11 * u, ey - 2 * u], [x, ey + 13 * u], [x + side * 12 * u, ey + 1 * u], 10).slice(1), [x + side * 16 * u, ey - 11 * u], ...thru([x + side * 16 * u, ey - 11 * u], [x + side * 2 * u, ey - 10 * u], [x - side * 11 * u, ey - 2 * u], 8).slice(1, -1)];
        p.poly(pts, "rgba(220,255,250,0.18)", 5 * u); p.stroke([...pts, pts[0]], 2.6 * u, G.col);
      }
      if (G.style !== "half") p.stroke([[x - 6 * u, ey - 6 * u], [x - 1.5 * u, ey - 8.5 * u]], 1.8 * u, "rgba(255,255,255,0.8)");
    }
    if (G.style !== "half") p.stroke([[cx - ex + 11 * u, ey - 2 * u], [cx + ex - 11 * u, ey - 2 * u]], 2.6 * u);
    else for (const s of [-1, 1]) p.stroke(thru([cx + s * (ex + 12 * u), ey + 2 * u], [cx + s * 0.95 * H.a, ey + 30 * u], [cx + s * 0.75 * H.a, hc + 0.9 * H.b], 8), 1.2 * u, G.col); // the chain
  }
  const mx = cx + (D.mouth === "smirk" ? 3 * u : 0), my = hc + MOUTH_DY * u + ny;
  if (kit.beard) { // DAD: a big round beard round the jaw
    const b: P2[] = [];
    for (let i = 0; i <= 24; i++) { const a = rad(-8 + (i / 24) * 196), sn = Math.max(0, Math.sin(a)); b.push([cx + Math.cos(a) * H.a * 1.05, hc + Math.sin(a) * H.b * 1.08 * (1 + 0.32 * sn * sn) + 2 * u + ny * sn]); }
    const inner = thru([cx - 0.92 * H.a, hc + 0.02 * H.b], [cx, hc + 0.46 * H.b + ny], [cx + 0.92 * H.a, hc + 0.02 * H.b], 12);
    p.poly([...b, ...inner.reverse()], kit.beard, 3.6 * u);
    for (let i = -3; i <= 3; i++) p.arc(cx + i * 11 * u, hc + 0.8 * H.b - Math.abs(i) * 2 * u + ny, 4 * u, 3 * u, 20, 160, 1.4 * u, mix(kit.beard, WHITE, 0.25));
  }
  mouth(p, D.mouth, mx, my, u, k, shake, f.talk ?? 0, !!D.braces);
  if (kit.beard || kit.tache) { // moustache over the mouth (DAD: brown, TEACHER: a grey walrus)
    const col = kit.tache ?? kit.beard!, wal = kit.tache ? 1.25 : 1;
    const pts: P2[] = [[mx - 19 * u * wal, my + 1 * u], [mx - 11 * u, my - 9 * u], [mx, my - 7 * u], [mx + 11 * u, my - 9 * u], [mx + 19 * u * wal, my + 1 * u], [mx + 10 * u, my - 3 * u], [mx, my - 2 * u], [mx - 10 * u, my - 3 * u]];
    p.poly(pts, col, 2.6 * u);
    for (let i = -2; i <= 2; i++) if (i) p.stroke([[mx + i * 6 * u, my - 6 * u], [mx + i * 7 * u, my - 2.5 * u]], 1.1 * u, mul(col, [0.7, 0.7, 0.76]));
  }
  // a little nose
  p.arc(cx + 1 * u, hc + 8 * u + ny * 0.8, 4.5 * u, 3.6 * u, 300, 470, 2.6 * u);
  if (D.sweat) { // a bead of sweat at the temple
    const x = cx + 0.74 * H.a, y = hc - 0.42 * H.b;
    p.poly([[x, y - 8 * u], [x + 5 * u, y + 2 * u], [x + 4 * u, y + 6 * u], [x, y + 8 * u], [x - 4 * u, y + 6 * u], [x - 5 * u, y + 2 * u]], TEAR, 1.8 * u);
    p.arc(x, y + 3 * u, 2.4 * u, 2.8 * u, 200, 250, 1.2 * u, TEAR_HI);
  }
};

// ---------------- headphones round the neck (BEAN) ----------------
const neckPhones = (p: Pen, col: string, u: number, light: number, thick: number) => {
  for (const s of [-1, 1]) {
    const c: P2 = [300 + s * 60, L.top + 12], cup = ellPts(c[0], c[1], 15 * u, 18 * u, 32, s * 0.3);
    p.inkRing(cup, 3.6 * u, thick, 0.4); p.shadedFill(shrink(cup, 0.97), col, mul(col, SH_CLOTH), light, 15 * u, 0.35);
    p.ell(c[0] + s * 3 * u, c[1], 8 * u, 10.5 * u, mix(col, "#ffffff", 0.45), 1.4 * u, 0, 360, s * 17);
    p.arc(c[0] - s * 3 * u, c[1] - 5 * u, 7 * u, 10 * u, 200, 250, 2 * u, "rgba(255,255,255,0.7)");
  }
  const band = thru([300 - 54, L.top + 2], [300, L.top + 46], [300 + 54, L.top + 2], 16);
  limb(p, band, "#f6f4fa", 5.5 * u, 1.8 * u);
};

/** a whole figure in the 600 x 1000 design space (feet ~ y 950, origin 300, 975). phones: draw BEAN's neck headphones */
export const drawPerson = (p: Pen, kit: Kit, pose: Pose, face: FaceS, light: number, lid = 0, phones = true) => {
  const u = U, thick = thickAngle(light), ow = 4.8 * u, olSave = p.ol;
  p.ol = 4 * u;
  const seated = !!pose.knees, tw = twOf(kit), coat = kit.top === "coat";
  const bodyR = [pose.lean ?? 0, 300, L.hipY, pose.shake ?? 0, pose.drop ?? 0];
  const B = bodyXf(pose);
  // ---- legs ----
  const leg = (side: 0 | 1) => {
    const s = side ? 1 : -1, { Hp, K, F } = legIK(pose, side);
    const pts = [...thru(Hp, lerp2(Hp, K, 0.5), K, 6), ...thru(K, lerp2(K, F, 0.5), F, 7).slice(1)];
    const lw = (kit.top === "hoodie" ? 15 : 12.5) * u;
    limb(p, pts, kit.legs, lw, 4 * u);
    if (kit.legs2) p.stroke(pts.slice(0, -2).map(([x, y]) => [x + s * lw * 0.36, y] as P2), 2.4 * u, kit.legs2); // jogger stripe
    const ank = lerp2(pts[pts.length - 3], F, 0.4);
    if (kit.top === "hoodie") limb(p, [ank, F], mul(kit.legs, [0.8, 0.8, 0.86]), lw * 0.74, 2.6 * u); // cuffed joggers
    if (kit.shoes === "sneaker") { // chunky sneaker, toe to the camera: coloured sole, laces
      const cx = F[0] + s * 3 * u, cy = F[1] + 8 * u, up = ellPts(cx, cy - 2 * u, 17 * u, 11 * u, 40);
      p.poly(rrect(cx - 18 * u, cy + 2 * u, cx + 18 * u, cy + 11 * u, 4 * u), kit.soleCol ?? WHITE, 2.4 * u);
      p.inkRing(up, 4 * u, thick); p.shadedFill(up, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 17 * u);
      for (let i = 0; i < 3; i++) p.stroke([[cx - 5 * u, cy - 9 * u + i * 3.4 * u], [cx + 5 * u, cy - 9 * u + i * 3.4 * u]], 1.4 * u, "#8a90a8");
      p.arc(cx, cy - 2 * u, 13 * u, 7 * u, 30, 150, 1.4 * u, kit.soleCol ?? "#c8ccd8");
    } else if (kit.shoes === "slipper") { // fluffy slipper with a pompom
      const cx = F[0] + s * 3 * u, cy = F[1] + 8 * u, sp = ellPts(cx, cy, 17 * u, 10 * u, 36);
      p.inkRing(sp, 4 * u, thick); p.shadedFill(sp, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 17 * u);
      p.ell(cx, cy - 8 * u, 6 * u, 6 * u, mix(kit.shoeCol, WHITE, 0.6), 1.8 * u);
    } else {
      const sp = ellPts(F[0] + s * 4 * u, F[1] + 7 * u, 15 * u, 8.5 * u, 30);
      p.inkRing(sp, 4 * u, thick); p.shadedFill(sp, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 15 * u);
      p.arc(F[0] + s * 4 * u - 4 * u, F[1] + 4 * u, 6 * u, 3 * u, 200, 290, 1.8 * u, mix(kit.shoeCol, WHITE, 0.5));
    }
  };
  if (!seated) { leg(0); leg(1); }
  // ---- arms ----
  const arm = (side: 0 | 1) => {
    p.rot = bodyR;
    const { S, E, hand } = armIK(pose, side, kit);
    const pts = [...thru(S, lerp2(S, E, 0.5), E, 6), ...thru(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    const aw = (kit.top === "hoodie" ? 13.5 : kit.top === "tee" ? 9.5 : 11.5) * u;
    if (kit.top === "tee") { limb(p, pts, kit.skin, aw, 4 * u); limb(p, [S, lerp2(S, E, 0.55)], kit.topCol, 14 * u, 4 * u); p.stroke([lerp2(S, E, 0.5), lerp2(S, E, 0.56)], 14 * u, kit.trim); }
    else {
      limb(p, pts, kit.topCol, aw, 4 * u);
      if (kit.top === "flannel") for (let i = 1; i < pts.length - 1; i += 2) p.stroke([pts[i], pts[i + 1]], 2.4 * u, kit.topCol2);
      if (kit.top === "tweed") p.ell(E[0], E[1], 7 * u, 9 * u, "#5a3e26", 1.4 * u); // elbow patch
      const cuff = kit.top === "hoodie" ? kit.topCol2 : kit.top === "coat" ? "#e3e8f1" : kit.top === "tweed" ? kit.topCol2 : mix(kit.topCol, WHITE, 0.2);
      limb(p, [lerp2(E, hand, 0.74), lerp2(E, hand, 0.9)], cuff, aw * 1.06, 1.6 * u);
    }
    p.rot = null;
    const Hw = B(hand), Ew = B(E), ang = pose.ha?.[side] ?? Math.atan2(Hw[1] - Ew[1], Hw[0] - Ew[0]);
    const hold = pose.hold?.[side];
    if (hold && hold !== "pen") drawHold(p, hold, Hw, side, light);
    drawHand(p, pose.hk?.[side] ?? "rest", Hw, ang, kit.skin, side);
    if (hold === "pen") drawHold(p, hold, Hw, side, light);
  };
  const front = pose.front ?? [false, false], over = pose.over ?? [false, false];
  if (!front[0] && !over[0]) arm(0);
  if (!front[1] && !over[1]) arm(1);
  p.rot = bodyR;
  // ---- torso ----
  const T: Blob = { a: tw, b: (L.tbot - L.top) / 2, nTop: 2.4, nBot: 3.6, egg: 0.17, asym: 0, rot: 0, noise: 0.005, seed: kit.seed + 3 };
  const tcy = (L.top + L.tbot) / 2, tp = blobPts(300, tcy, T);
  const body = coat ? kit.topCol2 : kit.topCol;
  if (kit.skirt) { // GRANDMA's long skirt flares from the waist
    const sk: P2[] = [[300 - tw * 0.9, 580], [300 + tw * 0.9, 580], [300 + tw * 1.18, 800], ...thru([300 + tw * 1.18, 800], [300, 816], [300 - tw * 1.18, 800], 10).slice(1)];
    p.gradFill(sk, kit.skirt, mul(kit.skirt, SH_CLOTH), light, 0.26); p.poly(sk, null, ow * 0.8);
    for (const x of [-0.5, 0, 0.5]) p.stroke([[300 + x * tw, 600], [300 + x * tw * 1.3, 808]], 1.6 * u, mul(kit.skirt, [0.7, 0.68, 0.76]));
  }
  p.gradFill(tp, body, mul(body, SH_CLOTH), light, 0.24, 0.3);
  p.clip(tp, () => {
    if (kit.top === "hoodie") { // the sound-wave print + kangaroo pocket + ribbed hem
      const bars = [0.25, 0.5, 0.85, 0.55, 1, 0.7, 0.35, 0.8, 0.45, 0.2];
      bars.forEach((h, i) => { const x = 300 + (i - 4.5) * 11, hh = 10 + 30 * h; p.poly(rrect(x - 3.4, 500 - hh, x + 3.4, 500 + hh, 3.4), kit.topCol2, 1.4 * u); });
      const pc = mul(kit.topCol, [0.86, 0.88, 0.92]);
      p.poly([[232, 552], [368, 552], [394, 612], [206, 612]], pc, 1.8 * u);
      for (const s of [-1, 1]) p.stroke(thru([300 + s * 66, 554], [300 + s * 86, 580], [300 + s * 92, 610], 8), 1.6 * u, mul(kit.topCol, [0.5, 0.56, 0.66]));
      p.poly([[150, L.tbot - 24], [450, L.tbot - 24], [450, 700], [150, 700]], mul(kit.topCol, [0.82, 0.84, 0.9]), 1.6 * u);
      for (let x = 160; x < 450; x += 13) p.stroke([[x, L.tbot - 20], [x, L.tbot + 4]], 1.2 * u, mul(kit.topCol, [0.6, 0.64, 0.74]));
    } else if (kit.top === "knit") { // cable knit: twisted cables + a rolled hem
      for (const x of [244, 300, 356]) for (let y = 430; y < 640; y += 22) { p.arc(x - 5, y, 9, 11, 300, 420, 2.2 * u, mul(kit.topCol, [0.74, 0.7, 0.72])); p.arc(x + 5, y + 11, 9, 11, 120, 240, 2.2 * u, mul(kit.topCol, [0.74, 0.7, 0.72])); }
      p.poly([[150, L.tbot - 22], [450, L.tbot - 22], [450, 700], [150, 700]], mul(kit.topCol, [0.9, 0.86, 0.88]), 1.6 * u);
    } else if (kit.top === "flannel") { // plaid: navy bars + thin cream lines, an open collar over a white tee
      for (let x = 160; x < 450; x += 36) p.stroke([[x, 400], [x, 650]], 9 * u, rgba(kit.topCol2, 0.55));
      for (let y = 420; y < 650; y += 36) p.stroke([[150, y], [450, y]], 9 * u, rgba(kit.topCol2, 0.45));
      for (let x = 178; x < 450; x += 36) p.stroke([[x, 400], [x, 650]], 1.2 * u, rgba(kit.trim, 0.7));
      p.poly([[270, L.top - 4], [330, L.top - 4], [300, 470]], kit.trim, 1.6 * u);
      p.stroke([[300, 470], [300, 640]], 1.6 * u, mul(kit.topCol, [0.5, 0.5, 0.56]));
      for (const y of [500, 540, 580]) p.ell(306, y, 3 * u, 3 * u, kit.trim, 1.2 * u);
    } else if (kit.top === "tee") { // a big white star
      const st: P2[] = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 22 : 52; st.push([300 + Math.cos(a) * r, 520 + Math.sin(a) * r]); }
      p.poly(st, kit.topCol2, 2.2 * u);
      p.arc(300, L.top - 4, 34, 22, 20, 160, 3 * u, kit.trim);
    } else if (kit.top === "tweed") { // tweed jacket: flecks, lapels over a pale blue shirt
      for (let i = 0; i < 70; i++) p.dot(170 + rnd(kit.seed, i) * 260, 420 + rnd(kit.seed, i + 99) * 220, 2 * u, mul(kit.topCol, [0.7, 0.66, 0.62]));
      p.poly([[262, L.top - 4], [338, L.top - 4], [320, 560], [280, 560]], kit.topCol2, 1.8 * u);
      for (const s of [-1, 1]) p.poly([[300 + s * 38, L.top - 4], [300 + s * 64, L.top + 10], [300 + s * 40, 470], [300 + s * 18, 560]], mul(kit.topCol, [0.86, 0.82, 0.78]), 2 * u);
      for (const y of [580, 610]) p.ell(300, y, 3.4 * u, 3.4 * u, kit.trim, 1.2 * u);
    } else if (kit.top === "cardigan") { // cardigan over a cream blouse, big buttons, a pocket hanky
      p.poly([[262, L.top - 4], [338, L.top - 4], [326, 650], [274, 650]], kit.topCol2, 1.8 * u);
      for (const y of [480, 524, 568, 612]) { p.dot(318, y, 4.2 * u); p.dot(318, y, 3.2 * u, kit.trim); }
      p.poly(rrect(214, 520, 254, 556, 4), mul(kit.topCol, [0.88, 0.86, 0.92]), 1.6 * u);
      p.poly([[222, 520], [236, 506], [246, 520]], "#ff8ab8", 1.2 * u);
    } else if (coat) { // turtleneck ribs (the coat goes on top)
      for (let y = 430; y < 640; y += 12) p.stroke([[262, y], [338, y]], 1 * u, mul(kit.topCol2, [0.75, 0.7, 0.8]));
    }
  });
  p.inkRing(tp, ow, thick);
  if (coat) { // open lab coat: lapels, a pocket with pens, a name badge
    for (const s of [-1, 1]) {
      const pts: P2[] = [[300 + s * 24, L.top - 2], [300 + s * (tw + 4), L.top + 26], [300 + s * (tw + 14), 600], [300 + s * (tw + 28), 792], [300 + s * 44, 792], [300 + s * 38, 560], [300 + s * 52, 470]];
      p.gradFill(pts, kit.topCol, mul(kit.topCol, [0.72, 0.76, 0.86]), light, 0.3); p.poly(pts, null, ow * 0.75);
      p.poly([[300 + s * 24, L.top - 2], [300 + s * 66, L.top + 12], [300 + s * 52, 470]], "#e3e8f1", 2 * u);
    }
    p.poly([[356, 492], [388, 492], [390, 532], [358, 532]], "#eef2f8", 1.8 * u);
    for (const [x, c] of [[364, "#16b8a8"], [372, "#e0484f"], [380, "#2a2a3a"]] as [number, string][]) p.band([[x, 494], [x, 472]], c, 2.4 * u, 1.1 * u, "round");
    p.poly(rrect(224, 482, 256, 512, 3), WHITE, 1.8 * u); p.poly([[229, 487], [251, 487], [251, 497], [229, 497]], "#16b8a8", 0); p.stroke([[230, 504], [250, 504]], 1.2 * u, "#8890a0");
    p.poly(rrect(262, L.top - 8, 338, L.top + 22, 10), kit.topCol2, 2 * u); // turtleneck collar
  }
  if (kit.top === "hoodie") { // hood bunched behind the neck + drawstrings
    const hood = ellPts(300, L.top + 4, 80, 28, 40);
    p.inkRing(hood, ow * 0.9, thick); p.shadedFill(hood, kit.topCol, mul(kit.topCol, SH_CLOTH), light, 80);
    p.ell(300, L.top + 6, 52, 14, kit.topCol2, 1.4 * u);
    for (const s of [-1, 1]) {
      const a: P2 = [300 + s * 15, L.top + 18], b: P2 = [300 + s * 24, L.top + 96];
      limb(p, thru(a, [300 + s * 22, L.top + 56], b, 8), kit.trim, 2.6 * u, 1.2 * u);
      p.poly(rrect(b[0] - 3.2 * u, b[1], b[0] + 3.2 * u, b[1] + 8 * u, 1.4 * u), kit.topCol2, 1.6 * u);
    }
  }
  if (kit.top === "knit") p.poly(rrect(258, L.top - 10, 342, L.top + 16, 12), mul(kit.topCol, [0.92, 0.88, 0.9]), 2 * u);
  if (kit.pearls) for (let i = 0; i <= 10; i++) { const a = rad(20 + i * 14); p.ell(300 + Math.cos(a) * 46, L.top + 6 + Math.sin(a) * 40, 4.6 * u, 4.6 * u, "#fffaf0", 1.2 * u); }
  if (kit.bowtie) { const c: P2 = [300, L.top + 4]; for (const s of [-1, 1]) p.poly([[c[0], c[1]], [c[0] + s * 26, c[1] - 14], [c[0] + s * 26, c[1] + 14]], kit.bowtie, 2.2 * u); p.ell(c[0], c[1], 7 * u, 6 * u, mul(kit.bowtie, [0.8, 0.7, 0.7]), 2 * u); }
  p.rot = null;
  if (seated) { leg(0); leg(1); }
  // neck
  const Nb = B([300, L.top + 8]), Nt = xfOf(headRot(pose, face))([300, L.chin - 16]);
  if (Nt[1] < Nb[1] - 2) limb(p, [Nb, Nt], mul(kit.skin, [0.9, 0.82, 0.82]), 44, 3 * u);
  if (kit.phones && phones) { p.rot = bodyR; neckPhones(p, kit.phones, u, light, thick); p.rot = null; }
  if (front[0] && !over[0]) arm(0);
  if (front[1] && !over[1]) arm(1);
  // ---- head ----
  const meme = face.e === "meme", grow = growOf(face);
  p.rot = headRot(pose, face);
  const cx = 300, hc = L.hc;
  const H0 = headBlob(kit.seed, HEAD_A, 0), H: Blob = { ...H0, a: H0.a * grow, b: H0.b * grow, rot: H0.rot * 0.5 };
  const up = meme ? Math.min(1, face.k ?? 1) : face.e === "shocked" ? 0.6 : face.e === "horrified" ? 0.35 : 0;
  hairBack(p, kit, cx, hc, H, u * grow, up, light, thick);
  const hp = blobPts(cx, hc, H);
  if (kit.hairStyle === "sides" || kit.hairStyle === "crop") for (const s of [-1, 1]) { const er = 13 * u; p.ell(cx + s * 0.98 * H.a, hc + 6 * u, er * 0.72, er, kit.skin, 3 * u); p.arc(cx + s * 0.98 * H.a, hc + 6 * u, er * 0.36, er * 0.5, s > 0 ? -60 : 120, s > 0 ? 60 : 240, 1.4 * u); }
  p.inkRing(hp, ow, thick);
  p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), kit.skin, mul(kit.skin, SH_SKIN), light, H.a);
  hairFront(p, kit, hp, cx, hc, H, u * grow, up, light, thick);
  drawFace(p, kit, cx, hc, H, face, lid, grow, hp);
  p.rot = null;
  if (over[0]) arm(0);
  if (over[1]) arm(1);
  p.ol = olSave;
};

// ======================================================================================================================
// BEAN IN PROFILE (shot 2, the X-ray). Faces screen-LEFT (-x). Same head size + centre as the front card.
// ======================================================================================================================
/** canvas landmarks of the profile head (before the head tilt): holo can lay the X-ray skull on these */
export const PROFILE = {
  head: [300, 300] as P2, eye: [214, 290] as P2, mouth: [190, 356] as P2, nose: [170, 322] as P2, ear: [322, 306] as P2,
  /** inner ear (cochlea) and the jaw hinge: the BONE path runs mouth -> jaw -> innerEar */
  innerEar: [300, 312] as P2, jaw: [262, 366] as P2, crown: [290, 182] as P2, chin: [212, 398] as P2, neck: [306, 410] as P2,
};
export type ProfS = { e: "defeated" | "curious" | "talk"; talk: number; look: number; lid: number; tilt: number; shrug: number; drop: number };
/** canvas transform of the profile head (tilt about the neck; + = chin up for this left-facing head) */
export const profHeadXf = (s: ProfS): Xf => { const a = rad(s.tilt); return (P) => { const q = rotAbout(P, PROFILE.neck, a); return [q[0], q[1] - s.shrug * 0.3 + s.drop]; }; };
export const drawProfile = (p: Pen, kit: Kit, s: ProfS, light: number) => {
  const u = U, thick = thickAngle(light), ow = 4.8 * u, olSave = p.ol, sk = kit.skin;
  p.ol = 4 * u;
  const dr = s.drop;
  // ---- legs (side view, toes to screen-left) ----
  for (const [hx, fx, far] of [[318, 334, true], [304, 292, false]] as [number, number, boolean][]) {
    const col = far ? mul(kit.legs, [0.8, 0.8, 0.86]) : kit.legs;
    const Hp: P2 = [hx, 598 + dr], K: P2 = [hx - 6, 770], F: P2 = [fx, 945];
    limb(p, [...thru(Hp, [hx - 2, 680], K, 6), ...thru(K, [hx - 4, 860], F, 6).slice(1)], col, 15 * u, 4 * u);
    if (kit.legs2 && !far) p.stroke(thru([Hp[0] + 2, Hp[1]], [hx, 680], [K[0] + 2, K[1]], 6), 2.4 * u, kit.legs2);
    const sh: P2[] = [...thru([F[0] + 18 * u, F[1] - 6 * u], [F[0] - 6 * u, F[1] - 14 * u], [F[0] - 34 * u, F[1] + 2 * u], 10), [F[0] - 36 * u, F[1] + 10 * u], [F[0] + 20 * u, F[1] + 10 * u]];
    p.poly(rrect(F[0] - 37 * u, F[1] + 6 * u, F[0] + 21 * u, F[1] + 14 * u, 3 * u), kit.soleCol ?? WHITE, 2.2 * u);
    p.inkRing(sh, 4 * u, thick); p.shadedFill(sh, kit.shoeCol, mul(kit.shoeCol, SH_CLOTH), light, 26 * u);
  }
  // ---- far arm (behind the torso) ----
  const shY = 456 - s.shrug + dr;
  limb(p, thru([324, shY + 6], [334, shY + 90], [326, shY + 170], 8), mul(kit.topCol, [0.72, 0.74, 0.84]), 13 * u, 4 * u);
  // ---- torso (side) ----
  const T: Blob = { a: 64, b: 108, nTop: 2.4, nBot: 3.4, egg: 0.12, asym: 0, rot: -0.04, noise: 0.005, seed: kit.seed + 5 };
  const tp = blobPts(312, 516 + dr, T);
  p.gradFill(tp, kit.topCol, mul(kit.topCol, SH_CLOTH), light, 0.24, 0.3);
  p.clip(tp, () => {
    p.poly([[220, 556 + dr], [300, 556 + dr], [310, 612 + dr], [220, 612 + dr]], mul(kit.topCol, [0.86, 0.88, 0.92]), 1.8 * u);
    p.poly([[200, 600 + dr], [420, 600 + dr], [420, 700], [200, 700]], mul(kit.topCol, [0.82, 0.84, 0.9]), 1.6 * u);
  });
  p.inkRing(tp, ow, thick);
  // hood bunched at the back
  const hy = 432 + dr - s.shrug * 0.5, hood = ellPts(352, hy, 40, 34, 30, -0.4);
  p.inkRing(hood, ow * 0.9, thick); p.shadedFill(hood, kit.topCol, mul(kit.topCol, SH_CLOTH), light, 40);
  p.arc(352, hy, 22, 18, 140, 300, 3 * u, kit.topCol2);
  // ---- neck + the headphones round it ----
  const Hx = profHeadXf(s);
  const neckB: P2 = [300, 430 + dr - s.shrug * 0.3], neckT = Hx([294, 380]);
  limb(p, [neckB, neckT], mul(sk, [0.9, 0.82, 0.82]), 46, 3 * u);
  if (kit.phones) { // side on: the near cup is a big disc
    const c: P2 = [282, 428 + dr - s.shrug * 0.3];
    limb(p, thru([c[0] - 8, c[1] - 22], [250, c[1] - 4], [c[0] - 10, c[1] + 22], 8), "#f6f4fa", 6 * u, 2 * u);
    const cup = ellPts(c[0], c[1], 17 * u, 18 * u, 32);
    p.inkRing(cup, 4 * u, thick, 0.4); p.shadedFill(shrink(cup, 0.97), kit.phones, mul(kit.phones, SH_CLOTH), light, 17 * u, 0.35);
    p.ell(c[0], c[1], 9 * u, 10 * u, mix(kit.phones, WHITE, 0.45), 1.6 * u);
    p.arc(c[0] - 4 * u, c[1] - 6 * u, 11 * u, 13 * u, 200, 250, 2.4 * u, "rgba(255,255,255,0.7)");
  }
  // ---- head ----
  p.rot = [rad(s.tilt), PROFILE.neck[0], PROFILE.neck[1], 0, -s.shrug * 0.3 + dr];
  const cx = 300, hc = 300;
  const H: Blob = { a: 124, b: 110, nTop: 1.9, nBot: 2.4, egg: -0.06, asym: -0.07, rot: 0.06, noise: 0.006, seed: kit.seed + 11 };
  for (let i = 0; i < 6; i++) { // back tufts
    const f = i / 5, an = 250 + f * 110, Lh = (12 + 10 * rnd(kit.seed, i + 40)) * u;
    lock(p, i % 2 ? mul(kit.hair, [0.84, 0.82, 0.86]) : kit.hair, cx, hc, H, an, Lh, rad(an) + 0.5, 7 * u, u);
  }
  const hp = blobPts(cx, hc, H);
  const nose = ellPts(PROFILE.nose[0] + 4, PROFILE.nose[1], 11 * u, 8.5 * u, 24, -0.2), chin = ellPts(PROFILE.chin[0] + 8, PROFILE.chin[1] - 14, 10 * u, 9 * u, 24);
  p.inkRing(hp, ow, thick);
  p.poly(chin, sk, 2.8 * u);
  p.poly(nose, sk, 2.8 * u);
  p.shadedFill(shrink(hp, 1 - (0.5 * ow) / H.a), sk, mul(sk, SH_SKIN), light, H.a);
  p.poly(shrink(chin, 0.9), sk, 0);
  p.clip(nose, () => p.dot(PROFILE.nose[0] + 2, PROFILE.nose[1] - 4, 4 * u, "rgba(255,255,255,0.6)"));
  // hair: a cap over the crown and back (clipped to the head), then the wave quiff over the forehead
  const hairPts: P2[] = [...thru([206, 228], [236, 176], [300, 180], 8), ...thru([300, 180], [400, 196], [424, 300], 10).slice(1), [418, 352], [388, 382], ...thru([388, 382], [366, 300], [352, 262], 8).slice(1), ...thru([352, 262], [300, 236], [244, 248], 8).slice(1)];
  p.clip(hp, () => { p.shadedFill(hairPts, kit.hair, mul(kit.hair, SH_HAIR), light, 120, 0.35); p.arc(300, 250, 90, 70, 200, 250, 3.6 * u, mix(kit.hair, WHITE, 0.35)); });
  if (s.e === "defeated") clipAll(p, [hp], () => { // gloom
    const [ax, ay] = p.P(cx, hc - H.b), [bx, by] = p.P(cx, hc + 0.2 * H.b), gr = p.g.createLinearGradient(ax, ay, bx, by);
    gr.addColorStop(0, rgba("#4a3a8a", 0.7)); gr.addColorStop(1, rgba("#4a3a8a", 0)); fillAll(p, gr);
    for (let i = -2; i <= 3; i++) p.stroke([[cx - 20 + i * 30, hc - 1.1 * H.b], [cx - 20 + i * 30, hc - (0.4 + 0.12 * (i % 2 ? 1 : 0)) * H.b]], 2.2 * u, rgba("#241726", 0.7));
  });
  p.inkRing(hp, ow, thick);
  p.stroke(thru([244, 248], [300, 236], [352, 262], 10), 3 * u);
  // ear (over the hair edge)
  const [ex, ey] = PROFILE.ear;
  p.ell(ex, ey, 9 * u, 12.5 * u, sk, 2.8 * u, 0, 360, 0.15);
  p.arc(ex + 0.5 * u, ey, 5 * u, 7.5 * u, -110, 110, 1.6 * u, mul(sk, [0.7, 0.55, 0.55]));
  p.dot(ex - 1 * u, ey + 1.5 * u, 1.8 * u, mul(sk, [0.75, 0.6, 0.6]));
  const sw: P2[] = [[210, 236], ...thru([210, 236], [196, 150], [266, 132], 10).slice(1), ...thru([266, 132], [300, 150], [282, 178], 6).slice(1), ...thru([282, 178], [262, 196], [276, 214], 6).slice(1), [300, 190], [250, 240]];
  p.inkRing(sw, 4.2 * u, thick, 0.45); p.shadedFill(shrink(sw, 0.98), kit.hair, mul(kit.hair, SH_HAIR), light, 70, 0.35);
  p.stroke(thru([212, 214], [214, 160], [262, 144], 8), 3 * u, mix(kit.hair, WHITE, 0.38));
  for (let i = 0; i < 3; i++) p.dot(222 + i * 9, 322 + (i % 2) * 6, 1.5 * u, rgba("#a85a3a", 0.7)); // freckles
  // eye + brow
  const [qx, qy] = PROFILE.eye, lid = s.lid;
  if (s.e === "defeated") { p.ell(qx - 1 * u, qy + 3 * u, 4.2 * u, 3.2 * u, INK, 0, 0, 180); p.stroke([[qx - 8 * u, qy + 1.6 * u], [qx + 6 * u, qy + 3.4 * u]], 4 * u); tapered(p, [qx + 8 * u, qy - 17 * u], [qx - 7 * u, qy - 13 * u], 5 * u, 2.6 * u); }
  else {
    if (lid >= 1) p.arc(qx, qy - 1 * u, 6 * u, 4 * u, 20, 160, 3.8 * u);
    else { const ly = qy + s.look * 2.4 * u; p.ell(qx - 1.5 * u, ly + (lid > 0 ? 1.5 * u : 0), 4.4 * u, (lid > 0 ? 3.6 : 6.4) * u, INK, 0); p.dot(qx - 2.8 * u, ly - 2.4 * u, 1.5 * u, WHITE); }
    const cy2 = s.e === "curious" ? 25 : 21;
    tapered(p, [qx + 8 * u, qy - (cy2 - 1) * u], [qx - 7 * u, qy - cy2 * u], 5.2 * u, 2.6 * u);
  }
  // mouth (side): talk opens a wedge; defeated a down-turned line; curious a little o
  const [mx, my] = PROFILE.mouth;
  if (s.talk > 0.08) {
    const o = cl01(s.talk), h = (3 + 10 * o) * u, sm = ellPts(mx + 8 * u, my + h * 0.4, (5 + 1.5 * o) * u, h * 0.6, 26, -0.25);
    dmouth(p, sm, () => p.ell(mx + 8 * u, my + h, 6 * u, 3.5 * u, TONGUE, 0), 2.6 * u);
  } else if (s.e === "defeated") p.stroke(thru([mx - 4 * u, my + 2 * u], [mx + 6 * u, my + 3 * u], [mx + 12 * u, my + 8 * u], 6), 3.6 * u);
  else if (s.e === "curious") p.ell(mx + 6 * u, my + 1 * u, 3 * u, 4 * u, MOUTH, 2.4 * u);
  else p.stroke(thru([mx - 4 * u, my], [mx + 6 * u, my + 2 * u], [mx + 12 * u, my - 1 * u], 6), 3.6 * u);
  p.rot = null;
  // ---- near arm (hangs in front of the torso) ----
  const slump = s.e === "defeated" ? 1 : 0;
  const S: P2 = [306, shY + 10], E: P2 = [288 + 10 * slump, shY + 96], Hd: P2 = [280 + 10 * slump, shY + 176];
  limb(p, [...thru(S, lerp2(S, E, 0.5), E, 6), ...thru(E, lerp2(E, Hd, 0.5), Hd, 6).slice(1)], kit.topCol, 13.5 * u, 4 * u);
  limb(p, [lerp2(E, Hd, 0.74), lerp2(E, Hd, 0.9)], kit.topCol2, 14 * u, 1.6 * u);
  drawHand(p, "rest", Hd, rad(95), sk, 0);
  p.ol = olSave;
};

// ======================================================================================================================
// THE CAT: a chubby ginger tabby, sitting, facing the camera. Drawn big: canvas origin (300, 975) on the floor, ears at
// y ~ 210 (card scale CAT_SC 0.25 makes her ~0.42 m tall).
// ======================================================================================================================
export type CatS = { nod: number; lid: number; tail: number; blink: number };
export const CAT_HEAD: P2 = [300, 430];
export const drawCat = (p: Pen, s: CatS, light: number) => {
  const thick = thickAngle(light), u = 2.6, olSave = p.ol, FUR = "#ff9a3c", FUR2 = "#d8642a", CREAM = "#fff1dc";
  p.ol = 4 * u;
  // tail curling up beside her
  const tw = s.tail, tail = thru([430, 900], [560 + 20 * tw, 860], [520 + 30 * tw, 700 - 20 * tw], 12);
  limb(p, tail, FUR, 34, 4 * u);
  for (let i = 3; i < tail.length - 1; i += 3) p.stroke([[tail[i][0] - 14, tail[i][1]], [tail[i][0] + 14, tail[i][1]]], 7, FUR2);
  // body: a pear
  const body = blobPts(300, 760, { a: 190, b: 205, nTop: 2.1, nBot: 2.6, egg: 0.3, asym: 0, rot: 0, noise: 0.004, seed: 5 });
  p.inkRing(body, 5 * u, thick); p.shadedFill(body, FUR, mul(FUR, [0.8, 0.66, 0.66]), light, 200, 0.4);
  p.clip(body, () => {
    for (const s2 of [-1, 1]) for (let i = 0; i < 3; i++) p.stroke(thru([300 + s2 * 200, 640 + i * 60], [300 + s2 * 150, 650 + i * 60], [300 + s2 * 120, 680 + i * 60], 8), 14, FUR2);
    p.ell(300, 760, 100, 150, CREAM, 0);
  });
  // front paws
  for (const s2 of [-1, 1]) { const pw = ellPts(300 + s2 * 58, 942, 46, 32, 28); p.inkRing(pw, 4 * u, thick); p.poly(shrink(pw, 0.96), CREAM, 0); for (let i = -1; i <= 1; i++) p.stroke([[300 + s2 * 58 + i * 14, 950], [300 + s2 * 58 + i * 14, 970]], 2.4 * u); }
  // head (the nod dips it)
  const hy = CAT_HEAD[1] + 26 * s.nod, hx = CAT_HEAD[0];
  for (const s2 of [-1, 1]) { // ears
    const ear: P2[] = [[hx + s2 * 150, hy - 70], [hx + s2 * 170, hy - 210 + 10 * s.nod], [hx + s2 * 60, hy - 140]];
    p.poly(ear, FUR, 4 * u); p.poly(shrink(ear, 0.55), "#ffb0b8", 0);
  }
  const head = blobPts(hx, hy, { a: 200, b: 160, nTop: 2.3, nBot: 2.2, egg: -0.08, asym: 0, rot: 0, noise: 0.004, seed: 8 });
  p.inkRing(head, 5 * u, thick); p.shadedFill(head, FUR, mul(FUR, [0.8, 0.66, 0.66]), light, 200, 0.4);
  p.clip(head, () => {
    for (let i = -1; i <= 1; i++) p.stroke([[hx + i * 34, hy - 165], [hx + i * 26, hy - 95]], 16, FUR2); // forehead stripes
    for (const s2 of [-1, 1]) for (let i = 0; i < 2; i++) p.stroke([[hx + s2 * 205, hy - 10 + i * 40], [hx + s2 * 150, hy + i * 40]], 12, FUR2);
    p.ell(hx, hy + 80, 110, 80, CREAM, 0);
  });
  // eyes: smug half-lids ("yep"), shut on a blink
  for (const s2 of [-1, 1]) {
    const ex = hx + s2 * 78, ey = hy - 10, lidY = ey - 2 + 10 * s.lid;
    if (s.blink >= 1) { p.arc(ex, ey, 30, 16, 20, 160, 4 * u); continue; }
    const wpts = ellPts(ex, ey, 34, 28, 30);
    p.poly(wpts, "#c8f06a", 0);
    p.clip(wpts, () => { p.ell(ex - s2 * 4, ey + 4, 9, 22, INK, 0); p.dot(ex - 8, ey - 4, 5, WHITE); p.poly([[ex - 40, ey - 40], [ex + 40, ey - 40], [ex + 40, lidY], [ex - 40, lidY]], FUR, 0); });
    p.poly(wpts, null, 3 * u);
    p.stroke([[ex - 36, lidY], [ex + 36, lidY]], 3.4 * u);
  }
  // nose + "w" mouth + whiskers + cheeks
  p.poly([[hx - 16, hy + 46], [hx + 16, hy + 46], [hx, hy + 62]], "#ff8aa0", 2.4 * u);
  p.stroke([...thru([hx - 30, hy + 74], [hx - 15, hy + 88], [hx, hy + 70], 6), ...thru([hx, hy + 70], [hx + 15, hy + 88], [hx + 30, hy + 74], 6).slice(1)], 3 * u);
  for (const s2 of [-1, 1]) for (let i = -1; i <= 1; i++) p.stroke([[hx + s2 * 80, hy + 70 + i * 14], [hx + s2 * 190, hy + 60 + i * 26]], 1.6 * u);
  clipAll(p, [head], () => { for (const s2 of [-1, 1]) fillAll(p, radial(p, hx + s2 * 110, hy + 60, 40, "#ff5a7a", 0.4)); });
  // a collar with a bell
  p.stroke(thru([hx - 120, hy + 140], [hx, hy + 172], [hx + 120, hy + 140], 10), 16, "#3a64f2");
  p.ell(hx, hy + 182, 18, 18, "#ffcf3a", 2.4 * u); p.stroke([[hx - 10, hy + 188], [hx + 10, hy + 188]], 1.6 * u);
  p.ol = olSave;
};

// ======================================================================================================================
// EFFECT CARDS
// ======================================================================================================================
/** a love heart (256 x 256) with a shine */
export const fxHeart = (p: Pen, col: string) => {
  const hp = heartPts(128, 124, 100, 48);
  p.poly(hp, col, 12);
  p.clip(hp, () => p.ell(150, 170, 90, 70, mul(col, [0.82, 0.66, 0.74]), 0));
  p.poly(hp, null, 12);
  p.ell(84, 84, 22, 15, WHITE, 0, 0, 360, -30);
  p.dot(110, 66, 7, WHITE);
};
/** the peak's halo (512 x 512): a pink ray burst with a big soft heart in the middle */
export const fxHeartHalo = (p: Pen) => {
  const n = 22, pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 128 : 246 - (i % 4 === 0 ? 0 : 34); pts.push([256 + Math.cos(a) * r, 256 + Math.sin(a) * r]); }
  p.poly(pts, "#ff8ac0", 6);
  p.poly(shrink(pts, 0.74), "#ffd6ea", 0);
  p.poly(heartPts(256, 250, 150, 48), "#ffb8d8", 0);
};
/** "!" or "?" pop (300 x 400) */
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
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
/** motion arcs (256 x 256): three nested arcs ")))" opening to the right */
export const fxMotion = (p: Pen) => {
  for (let i = 0; i < 3; i++) { const r = 50 + i * 34; p.arc(40, 128, r, r * 1.1, -38 + i * 4, 38 - i * 4, 22, INK); p.arc(40, 128, r, r * 1.1, -36 + i * 4, 36 - i * 4, 11, WHITE); }
};
/** nod ticks (256 x 128): two little curved dashes either side of a chin ("yep" nod) */
export const fxNod = (p: Pen) => { for (const s of [-1, 1]) { const c = thru([128 + s * 30, 30], [128 + s * 58, 62], [128 + s * 54, 100], 8); p.stroke(c, 20, INK); p.stroke(c, 9, WHITE); } };
/** a "YEP" speech bubble (512 x 320) with a tail toward the speaker (tail -1 left .. 1 right), word in col */
export const fxYep = (p: Pen, word: string, col: string, tail: number, seed: number) => {
  const cx = 256, cy = 136, rx = 222, ry = 104, n = 48, ring: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = 1 + 0.025 * Math.sin(i * 1.7 + seed); ring.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); }
  const ia = Math.round((Math.PI / 2 - tail * 0.5) / (Math.PI * 2) * n), tip: P2 = [cx + tail * 150, 306];
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { if (i === ia - 2) { out.push(ring[i], tip); i += 3; continue; } out.push(ring[i]); }
  p.poly(out, WHITE, 14);
  p.arc(170, 82, 110, 46, 200, 250, 12, "rgba(200,220,255,0.9)");
  const g = p.g; g.save(); g.translate(cx, cy + 6); g.rotate(-0.06 + 0.12 * (rnd(seed, 2) - 0.5));
  letter(p, word, 0, 0, word.length > 4 ? 104 : 132, col, 24, 0, 400);
  g.restore();
};
