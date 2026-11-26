// OWNER: holo agent. See /home/user/lookmatch/VOICE_BRIEF.md
// The science overlays of "Your Voice on Recordings" (pure functions of (id, t); never frustum culled, all NOINK):
//   1. SHOT 2 X-RAY HEAD (xrayAt): a big glowing SIDE-VIEW cutaway of BEAN's head floating over his head card: navy
//      glass, cyan rim, skull, eye socket, teeth, the JAW BONE, neck vertebrae, the outer ear + a glowing snail COCHLEA
//      ("EAR" pill). The jaw talks. `twice`: both routes flash as ghost tracks + "x2 / YOU HEAR YOURSELF TWICE".
//      `air`: BLUE sound rings leave the mouth, loop out through the air over the head and dive into the ear ("AIR").
//      `bone`: ORANGE vibrations buzz along the jaw bone straight to the inner ear, orange ripples fill the skull
//      ("BONE"). `ears`: the cochlea flashes. `deep`: the little waveform at the ear turns big, slow, bassy + gold,
//      with a "DEEPER" tab.
//   2. SHOT 3 MIC CAPTURE (micAt): only the BLUE air rings stream from BEAN's mouth into the microphone grille
//      (`catch`, "AIR" pill, the grille glows), an orange "BONE" pill is struck out beside his head, and a floating
//      "REC" panel (red dot, "AIR ONLY") shows a THIN, high, wiggly waveform. Fades with micAt.mic.
// Technique (after hiccup/holo.ts): canvas boards in an anchor frame yawed to the camera, a depth-only twin, an additive
// HDR glow twin in front (bloom source).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { ROOM, W, V3, FPS, xrayAt, micAt, camAt, shotStart, smooth, clamp01, glide } from "./story";
import { WORDS } from "./words";
import { micPose, MIC_GRILLE, BEAN_MOUTH } from "./props";

const TAU = Math.PI * 2;
const DEBUG = false; // TEMP: recommended framings + stand-ins for stills (must be false when reporting)
const DBG_DIR: 0 | 1 | -1 = 0; // TEMP (DEBUG only): force the profile direction
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const back = (u: number) => { const x = clamp01(u), c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bump = (t: number, a: number, b: number, r = 0.2) => smooth((t - a) / r) * (1 - smooth((t - b) / r));
const cyc = (x: number) => ((x % 1) + 1) % 1;

// ============================== public contracts ==============================
/** overrides from other owners: BEAN's head centre (cast headAt), his mouth (cast mouthAt) and the mic grille (props) */
export const HOLO_HOOKS: {
  head?: (id: number, t: number) => V3 | undefined;
  mouth?: (id: number, t: number) => V3 | undefined;
  mic?: (id: number, t: number) => V3 | undefined;
} = {};
/** BEAN's head centre (default; cast may override with HOLO_HOOKS.head) */
export const HEAD: V3 = add(ROOM, 0, 1.45, 0);
export const headPos = (id: number, t: number): V3 => HOLO_HOOKS.head?.(id, t) ?? HEAD;
/** BEAN's mouth (front card): props BEAN_MOUTH = ROOM+(0,1.36,0.05), following the head */
export const mouthPos = (id: number, t: number): V3 => HOLO_HOOKS.mouth?.(id, t) ?? add(headPos(id, t), BEAN_MOUTH[0] - HEAD[0], BEAN_MOUTH[1] - HEAD[1], BEAN_MOUTH[2] - HEAD[2]);
/** the X-ray head floats this far in front of the head card (toward the camera) */
export const XRAY_D = 0.14;
/** head-local layout of the X-ray (m; x = toward BEAN's FACE (mirrored by xrayDir), y = up, origin = head centre).
 *  The glass head spans x -0.28..0.33 (nose tip), y -0.25 (jaw)..0.32 (crown); the neck fades out by y -0.44.
 *  The AIR loop runs mouth -> out front -> over the head (top y 0.48) -> down the back (x -0.43) -> into the ear.
 *  Content box incl. labels + the title: x -0.52..0.56, y -0.4..0.66. */
export const XRAY_LAYOUT = {
  box: { x0: -0.54, x1: 0.58, y0: -0.48, y1: 0.68 },
  mouth: [0.275, -0.1] as P2, ear: [-0.1, -0.01] as P2, cochlea: [-0.07, -0.02] as P2,
  title: { c: [-0.07, 0.6] as P2, w: 0.74, h: 0.095 }, x2: [0.4, 0.61] as P2,
  airTag: [0.4, -0.245] as P2, boneTag: [0.14, -0.34] as P2, earTag: [-0.36, -0.2] as P2,
  /** the waveform panel (inside the skull, above the ear); grows 1.7x on `deep` with a "DEEPER" tab on top */
  wave: { c: [-0.05, 0.165] as P2, w: 0.25, h: 0.095 },
};
type Frame = { o: V3; yaw: number; R: V3; N: V3 };
const frameFrom = (o: V3, cam: THREE.Vector3): Frame => {
  const yaw = Math.atan2(cam.x - o[0], cam.z - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)], N: [Math.sin(yaw), 0, Math.cos(yaw)] };
};
const toW = (F: Frame, x: number, y: number, d: number): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** which way the X-ray profile faces on screen (+1 = face to screen RIGHT): BEAN faces +z, so it is the side +z falls on
 *  for the shot-2 camera (frozen per shot, sampled at "twice"); straight-on cameras get +1 */
let dirCache: 1 | -1 | 0 = 0;
export const xrayDir = (): 1 | -1 => {
  if (DEBUG && DBG_DIR) return DBG_DIR;
  if (dirCache) return dirCache;
  const c = camAt(2, Math.round(W.twice * FPS));
  const fx = c.look[0] - c.pos[0], fz = c.look[2] - c.pos[2], n = Math.hypot(fx, fz) || 1;
  const rz = fx / n; // camera right = forward x up = (-fz, 0, fx); BEAN forward (0,0,1) . right = fx
  dirCache = rz < -0.2 ? -1 : 1;
  return dirCache;
};
/** world point of a head-local X-ray point (unmirrored layout x), seen from a camera at camPos */
export const xrayPoint = (id: number, t: number, x: number, y: number, camPos: V3): V3 => toW(frameFrom(headPos(id, t), new THREE.Vector3(...camPos)), x * xrayDir(), y, XRAY_D);
/** recommended shot-2 camera (straight on, held): everything readable, captions (70 %) fall on BEAN's chest below the
 *  labels, the title clears the watermark. look head+(0,-0.08,0) from 3.3 m, fov 36 */
export const xrayCam = (id: number, t: number) => { const h = headPos(id, t); return { pos: add(h, 0, -0.04, 3.3), look: add(h, 0, -0.08, 0), fov: 36 }; };

/** the microphone GRILLE centre (shot 3): the live props micPose(id, t).grille (static props MIC_GRILLE = ROOM+(0.3,1.36,0.34)) */
export const MIC_POS: V3 = MIC_GRILLE;
export const micPos = (id: number, t: number): V3 => HOLO_HOOKS.mic?.(id, t) ?? micPose(id, t).grille;
/** the "REC" panel floats this far above the grille (centre), 0.36 x 0.17 m */
export const REC_OFF: V3 = [-0.04, 0.42, 0];
export const REC_SIZE = { w: 0.36, h: 0.17 };
export const recPos = (id: number, t: number): V3 => { const m = micPos(id, t); return add(m, REC_OFF[0], REC_OFF[1], REC_OFF[2]); };
/** recommended shot-3 framing while the mic catches (W.microphone .. W.weird): mouth, mic, REC panel and the struck
 *  "BONE" pill all in, captions below the mic. */
export const micCam = (id: number, t: number) => { const m = mouthPos(id, t), c = micPos(id, t); const cx = (m[0] - 0.36 + c[0] + 0.14) / 2; return { pos: [cx, m[1] + 0.12, m[2] + 3.3] as V3, look: [cx, m[1] + 0.06, m[2]] as V3, fov: 34 }; };

// ============================== canvas helpers ==============================
const INK = "#071033";
type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
const BLUE = "#3fb4ff", BLUE_HI = "#c8f0ff", ORANGE = "#ff8a1e", ORANGE_HI = "#ffe08a", CYAN = "#69dcff";
const text = (g: Ctx, s: string, x: number, y: number, size: number, fill: Paint, stroke: Paint = INK, sw = 0.18, weight = 900) => {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (sw > 0) { g.lineWidth = size * sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};
const rrect = (g: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const strokePts = (g: Ctx, pts: P2[]) => { if (pts.length < 2) return; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.stroke(); };
const blob = (g: Ctx, x: number, y: number, r: number, inner: string, outer: string) => {
  if (r <= 0.5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
};
const crPts = (pts: P2[], n: number, closed: boolean): P2[] => {
  const out: P2[] = [], N = pts.length, seg = closed ? N : N - 1;
  const at = (i: number) => (closed ? pts[(i + N) % N] : pts[Math.max(0, Math.min(N - 1, i))]);
  for (let i = 0; i < seg; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  if (!closed) out.push(pts[N - 1]);
  return out;
};
const pathOf = (pts: P2[], closed: boolean) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(...q) : p.moveTo(...q))); if (closed) p.closePath(); return p; };
type Poly = { pts: P2[]; cum: number[]; len: number };
const poly = (px: P2[], n = 12): Poly => {
  const pts = crPts(px, n, false), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
const polyAt = (p: Poly, u: number): { x: number; y: number; a: number } => {
  const L = clamp01(u) * p.len;
  let i = 1;
  while (i < p.pts.length - 1 && p.cum[i] < L) i++;
  const a = p.pts[i - 1], b = p.pts[i], k = (L - p.cum[i - 1]) / Math.max(1e-6, p.cum[i] - p.cum[i - 1]);
  return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
};
const polySub = (p: Poly, u0: number, u1: number): P2[] => {
  const L0 = clamp01(u0) * p.len, L1 = clamp01(u1) * p.len, out: P2[] = [];
  const s = polyAt(p, u0); out.push([s.x, s.y]);
  for (let i = 0; i < p.pts.length; i++) if (p.cum[i] > L0 && p.cum[i] < L1) out.push(p.pts[i]);
  const e = polyAt(p, u1); out.push([e.x, e.y]);
  return out;
};
/** a sound ring: an arc bulging along the travel angle a (canvas px), with ink + colour + white core, glow on q */
const ring = (g: Ctx, q: Ctx, x: number, y: number, a: number, r: number, w: number, alpha: number, col: string, hi: string, span = 0.95) => {
  if (alpha < 0.01 || r < 1) return;
  const cx = x - Math.cos(a) * r, cy = y - Math.sin(a) * r;
  g.save(); g.globalAlpha *= Math.min(1, alpha); g.lineCap = "round";
  g.beginPath(); g.arc(cx, cy, r, a - span, a + span);
  g.strokeStyle = "rgba(4,10,40,0.85)"; g.lineWidth = w * 1.7; g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  g.strokeStyle = hi; g.lineWidth = w * 0.36; g.stroke();
  g.restore();
  q.save(); q.globalAlpha *= Math.min(1, alpha); q.lineCap = "round";
  q.beginPath(); q.arc(cx, cy, r, a - span, a + span); q.strokeStyle = col; q.lineWidth = w * 3.2; q.stroke();
  q.restore();
};
/** a label pill that scales in (back easing) with an optional leader to `to` (canvas px) */
const pill = (g: Ctx, q: Ctx | null, x: number, y: number, w: number, h: number, fill: Paint, label: string, k: number, t: number, to?: P2, txt = "#ffffff", fs = 0.6, glowCol = "#69dcff", pulse = 0) => {
  if (k < 0.01) return;
  if (to) {
    const a = smooth(k * 1.6), ex = lerp(x, to[0], a), ey = lerp(y, to[1], a);
    g.save(); g.globalAlpha *= a; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokeStyle = INK; g.lineWidth = h * 0.22; g.stroke(); g.strokeStyle = glowCol; g.lineWidth = h * 0.1; g.stroke();
    g.fillStyle = glowCol; g.beginPath(); g.arc(ex, ey, h * 0.14, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = h * 0.06; g.stroke();
    g.restore();
  }
  const s = back(k) * (1 + 0.12 * pulse);
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(0.02 * Math.sin(t * 2.1 + x * 0.01));
  const pad = h * 0.12;
  g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, h / 2 + pad); g.fill();
  g.fillStyle = fill; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.3)"; rrect(g, -w / 2 + h * 0.3, -h / 2 + h * 0.1, w - h * 0.6, h * 0.24, h * 0.12); g.fill();
  text(g, label, 0, h * 0.05, h * fs, txt, INK, txt === INK ? 0 : 0.24, 900);
  g.restore();
  if (q) { q.save(); q.globalAlpha *= (0.32 + 0.4 * pulse) * Math.min(1, k); q.strokeStyle = glowCol; q.lineWidth = h * 0.4; rrect(q, x - w / 2 - h * 0.15, y - h / 2 - h * 0.15, w + h * 0.3, h * 1.3, h * 0.65); q.stroke(); q.restore(); }
};

class Plane {
  cv = document.createElement("canvas"); g: Ctx; tex: THREE.CanvasTexture;
  constructor(w: number, h: number) {
    this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
}
const GS = 0.25; // glow canvas scale
/** a camera-facing hologram board: main canvas + depth twin + additive HDR glow twin (in front) */
class Board {
  group = new THREE.Group();
  main: Plane; glow: Plane; W: number; H: number; dir: 1 | -1 = 1;
  private meshes: THREE.Mesh[] = []; private mats: THREE.MeshBasicMaterial[] = [];
  constructor(public box: { x0: number; x1: number; y0: number; y1: number }, public S: number, ro: number, glowK = 1.7, depth = true) {
    this.W = Math.round((box.x1 - box.x0) * S); this.H = Math.round((box.y1 - box.y0) * S);
    this.main = new Plane(this.W, this.H); this.glow = new Plane(Math.round(this.W * GS), Math.round(this.H * GS));
    const geo = new THREE.PlaneGeometry(box.x1 - box.x0, box.y1 - box.y0);
    const mk = (m: THREE.MeshBasicMaterial, z: number, r: number) => {
      const me = new THREE.Mesh(geo, m); me.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, z); me.renderOrder = r;
      me.layers.set(NOINK); me.frustumCulled = false; this.group.add(me); this.meshes.push(me); this.mats.push(m);
    };
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0, ro);
    if (depth) mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, alphaTest: 0.5, colorWrite: false, depthWrite: true, fog: false, side: THREE.DoubleSide }), 0, ro + 1);
    mk(new THREE.MeshBasicMaterial({ map: this.glow.tex, color: new THREE.Color(glowK, glowK, glowK), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0.004, ro + 2);
    this.group.visible = false;
  }
  setDir(d: 1 | -1) { this.dir = d; const cx = ((this.box.x0 + this.box.x1) / 2) * d; for (const m of this.meshes) m.position.x = cx; }
  opacity(a: number) { for (const m of this.mats) m.opacity = a; }
  /** local metres -> canvas px (mirrored by dir) */
  P = (x: number, y: number): P2 => {
    const mx0 = this.dir > 0 ? this.box.x0 : -this.box.x1;
    return [(x * this.dir - mx0) * this.S, (this.box.y1 - y) * this.S];
  };
  /** clears both canvases and saves their state (glow ctx pre-scaled to main px); callers restore both */
  begin(): [Ctx, Ctx] {
    const g = this.main.g, q = this.glow.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.W, this.H); g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = 1;
    q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, this.glow.cv.width, this.glow.cv.height); q.save(); q.scale(GS, GS); q.lineCap = "round"; q.lineJoin = "round"; q.globalAlpha = 1;
    return [g, q];
  }
  flush() { this.main.tex.needsUpdate = true; this.glow.tex.needsUpdate = true; }
}

/** BEAN's lip-flap from the narration (0..1): "when YOU talk" */
const talkAt = (t: number) => {
  let o = 0;
  for (const w of WORDS) {
    if (t < w.s - 0.05) break;
    if (t <= w.e + 0.05) { const u = clamp01((t - w.s + 0.05) / (w.e - w.s + 0.1)); o = Math.max(o, Math.pow(Math.sin(Math.PI * u), 0.7) * (0.65 + 0.35 * Math.abs(Math.sin(t * 17)))); }
  }
  return o;
};

// ============================== 1. shot-2 X-RAY HEAD ==============================
const XL = XRAY_LAYOUT;
// head profile (x toward the face), clockwise from the back of the neck; J marks jaw points (they swing open)
const HEAD_PTS: [number, number, number][] = [
  [-0.13, -0.5, 0], [-0.135, -0.33, 0], [-0.165, -0.215, 0], [-0.245, -0.12, 0], [-0.278, 0.02, 0], [-0.262, 0.17, 0], [-0.19, 0.27, 0],
  [-0.06, 0.322, 0], [0.08, 0.318, 0], [0.19, 0.262, 0], [0.252, 0.15, 0], [0.262, 0.075, 0], [0.272, 0.035, 0], [0.318, -0.005, 0],
  [0.33, -0.032, 0], [0.292, -0.052, 0], [0.282, -0.072, 0], [0.272, -0.094, 0], [0.252, -0.104, 0],
  [0.268, -0.118, 1], [0.27, -0.142, 1], [0.252, -0.18, 1], [0.212, -0.222, 1], [0.13, -0.24, 1], [0.065, -0.245, 1], [0.05, -0.3, 0], [0.06, -0.5, 0],
];
const CONDYLE: P2 = [-0.035, -0.065];
const jawRot = (p: P2, ang: number): P2 => { const dx = p[0] - CONDYLE[0], dy = p[1] - CONDYLE[1], c = Math.cos(ang), s = Math.sin(ang); return [CONDYLE[0] + dx * c + dy * s, CONDYLE[1] - dx * s + dy * c]; };
// AIR route: out of the mouth, forward, over the head, down the back, into the ear
const AIR_PTS: P2[] = [[0.3, -0.1], [0.4, -0.095], [0.475, 0.0], [0.48, 0.17], [0.39, 0.34], [0.2, 0.45], [-0.04, 0.475], [-0.26, 0.41], [-0.4, 0.26], [-0.43, 0.1], [-0.35, 0.02], [-0.22, -0.005], [-0.12, -0.012]];
// BONE route: teeth -> along the jaw bone -> up the jaw hinge -> the cochlea
const BONE_PTS: P2[] = [[0.215, -0.11], [0.19, -0.168], [0.11, -0.2], [0.02, -0.19], [-0.035, -0.15], [-0.045, -0.09], [-0.06, -0.04], [-0.07, -0.02]];
// skull bits (head-local)
const CRANIUM: P2[] = [[-0.235, -0.07], [-0.25, 0.04], [-0.238, 0.16], [-0.17, 0.25], [-0.05, 0.293], [0.08, 0.29], [0.18, 0.238], [0.228, 0.15], [0.236, 0.08], [0.215, 0.03]];
const MAXILLA: P2[] = [[0.236, 0.02], [0.26, -0.01], [0.27, -0.04], [0.245, -0.06], [0.235, -0.082], [0.1, -0.075], [0.02, -0.06]];
const MANDIBLE: P2[] = [[-0.03, -0.065], [-0.045, -0.12], [-0.035, -0.165], [0.03, -0.198], [0.13, -0.208], [0.2, -0.19], [0.236, -0.15], [0.236, -0.112]];

type XSt = ReturnType<typeof xrayAt>;
class XrayHolo {
  b = new Board(XL.box, 1500, 30, 1.25);
  private last = "";
  private air!: Poly; private bone!: Poly; private dir: 1 | -1 = 1;
  private build(dir: 1 | -1) {
    this.dir = dir; this.b.setDir(dir);
    const P = this.b.P;
    this.air = poly(AIR_PTS.map(([x, y]) => P(x, y)));
    this.bone = poly(BONE_PTS.map(([x, y]) => P(x, y)));
  }
  update(id: number, t: number, cam: THREE.Camera) {
    const X = xrayAt(id, t), show = id === 2 ? X.show : 0;
    this.b.group.visible = show > 0.002;
    if (!this.b.group.visible) return;
    const d = xrayDir();
    if (!this.air || d !== this.dir) this.build(d);
    const F = frameFrom(headPos(id, t), cam.position);
    this.b.group.position.set(...toW(F, 0, 0, XRAY_D)); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.group.scale.setScalar(0.92 + 0.08 * glide(show));
    this.b.opacity(1);
    const key = t.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    this.draw(t, X, show);
  }
  private headPath(open: number) {
    const P = this.b.P, ang = -0.2 * open;
    const pts = HEAD_PTS.map(([x, y, j]) => (j ? jawRot([x, y], ang) : [x, y]) as P2);
    return pathOf(crPts(pts.map(([x, y]) => P(x, y)), 8, true), true);
  }
  private draw(t: number, X: XSt, show: number) {
    const B = this.b, P = B.P, S = B.S, [g, q] = B.begin();
    const open = talkAt(t), jaw = -0.2 * open;
    const head = this.headPath(open);
    // ---- scan reveal: clip top -> bottom ----
    const wy = lerp(-0.05 * B.H, B.H * 1.02, glide(show));
    if (show < 0.999) for (const c of [g, q]) { c.beginPath(); c.rect(0, 0, B.W, wy); c.clip(); }
    // ---- dark halo behind the glass (contrast against the room) ----
    for (const [w, a] of [[110, 0.1], [60, 0.16], [28, 0.26]] as [number, number][]) { g.strokeStyle = `rgba(2,6,26,${a})`; g.lineWidth = w; g.stroke(head); }
    // ---- glass ----
    const [cx, cy] = P(0, 0.02);
    const bg = g.createRadialGradient(cx, cy, 20, cx, cy, 0.42 * S);
    bg.addColorStop(0, "rgba(26,52,132,0.97)"); bg.addColorStop(0.7, "rgba(12,24,82,0.97)"); bg.addColorStop(1, "rgba(28,14,86,0.97)");
    g.fillStyle = bg; g.fill(head);
    g.save(); g.clip(head); q.save(); q.clip(head);
    g.strokeStyle = "rgba(120,200,255,0.07)"; g.lineWidth = 2;
    for (let x = 0; x < B.W; x += 0.04 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, B.H); g.stroke(); }
    for (let y = 0; y < B.H; y += 0.04 * S) { g.beginPath(); g.moveTo(0, y); g.lineTo(B.W, y); g.stroke(); }
    g.fillStyle = "rgba(180,235,255,0.04)";
    for (let y = (t * 60) % 15; y < B.H; y += 15) g.fillRect(0, y, B.W, 5);
    this.drawSkullRipples(g, q, t, X);
    this.drawSkull(g, q, t, X, jaw);
    this.drawEar(g, q, t, X);
    const sh = g.createLinearGradient(0, P(0, 0.32)[1], 0, P(0, 0.1)[1]); // glass sheen
    sh.addColorStop(0, "rgba(255,255,255,0.12)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sh; g.fillRect(0, 0, B.W, B.H);
    g.restore(); q.restore();
    // ---- rim ----
    g.strokeStyle = CYAN; g.lineWidth = 19; g.stroke(head);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 6; g.stroke(head);
    q.strokeStyle = "rgba(70,200,255,0.18)"; q.lineWidth = 60; q.stroke(head);
    q.strokeStyle = "rgba(90,220,255,0.38)"; q.lineWidth = 20; q.stroke(head);
    this.drawFace(g, q, t, X, open);
    // ---- neck fade (under the collar) ----
    for (const c of [g, q]) {
      c.save(); c.globalCompositeOperation = "destination-out";
      const b0 = P(0, -0.3)[1], b1 = P(0, -0.44)[1];
      const lb = c.createLinearGradient(0, b0, 0, b1); lb.addColorStop(0, "rgba(0,0,0,0)"); lb.addColorStop(1, "rgba(0,0,0,1)");
      c.fillStyle = lb; c.fillRect(0, b0, B.W, B.H - b0);
      c.restore();
    }
    // ---- the two routes ----
    this.drawGhosts(g, q, t, X);
    this.drawBone(g, q, t, X);
    this.drawAir(g, q, t, X, open);
    this.drawWave(g, q, t, X);
    const lo = 1 - smooth((t - (W.deeper + 0.35)) / 0.3); // QA1: labels clear before the push into the head (2->3)
    if (lo > 0.01) { g.save(); q.save(); g.globalAlpha *= lo; q.globalAlpha *= lo; this.drawLabels(g, q, t, X); g.restore(); q.restore(); }
    g.restore(); q.restore();
    if (show > 0.001 && show < 0.999) { // scan line
      const a = Math.sin(Math.PI * show), lg = g.createLinearGradient(0, wy - 26, 0, wy + 26);
      lg.addColorStop(0, "rgba(140,240,255,0)"); lg.addColorStop(0.5, `rgba(230,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,240,255,0)");
      g.save(); g.clip(head); g.fillStyle = lg; g.fillRect(0, wy - 26, B.W, 52); g.restore();
      q.save(); q.scale(GS, GS); q.clip(head); q.fillStyle = `rgba(120,230,255,${0.8 * a})`; q.fillRect(0, wy - 10, B.W, 20); q.restore();
    }
    B.flush();
  }
  /** orange vibration ripples spreading from the teeth through the whole skull (bone path) */
  private drawSkullRipples(g: Ctx, q: Ctx, t: number, X: XSt) {
    const k = X.bone * (1 - 0.3 * X.deep);
    if (k < 0.01) return;
    const P = this.b.P, S = this.b.S, [mx, my] = P(0.2, -0.11);
    const rate = 1.1 + 0.6 * X.ears;
    for (let i = 0; i < 4; i++) {
      const u = cyc(t * rate * 0.5 + i / 4), r = (0.03 + 0.5 * u) * S, a = k * Math.sin(Math.PI * u) * 0.55;
      if (a < 0.01) continue;
      g.save(); g.globalAlpha = a; g.strokeStyle = "rgba(255,170,60,0.85)"; g.lineWidth = 0.02 * S * (1 - 0.5 * u);
      g.beginPath(); g.arc(mx, my, r, 0, TAU); g.stroke(); g.restore();
      q.save(); q.globalAlpha = a * 0.35; q.strokeStyle = "#ffb848"; q.lineWidth = 0.04 * S; q.beginPath(); q.arc(mx, my, r, 0, TAU); q.stroke(); q.restore();
    }
    blob(g, mx, my, 0.45 * S, `rgba(255,140,40,${0.16 * k})`, "rgba(255,140,40,0)"); // warm wash in the skull
  }
  private drawSkull(g: Ctx, q: Ctx, t: number, X: XSt, jaw: number) {
    const P = this.b.P, S = this.b.S, bk = X.bone;
    const vib = bk * (0.6 + 0.4 * X.ears) * 0.004 * S * Math.sin(t * 90);
    const boneCol = (a: number) => `rgba(${Math.round(lerp(205, 255, bk))},${Math.round(lerp(235, 214, bk))},${Math.round(lerp(255, 170, bk))},${a})`;
    const line = (pts: P2[], w: number, sh = 0) => {
      const p = pathOf(crPts(pts.map(([x, y]) => { const [a, b] = P(x, y); return [a + sh, b] as P2; }), 8, false), false);
      g.strokeStyle = boneCol(0.22); g.lineWidth = w * 2.6; g.stroke(p);
      g.strokeStyle = boneCol(0.85); g.lineWidth = w; g.stroke(p);
    };
    for (let y = -0.25; y > -0.46; y -= 0.052) { const [vx, vy] = P(-0.045, y); g.fillStyle = boneCol(0.2); rrect(g, vx - 0.03 * S, vy - 0.018 * S, 0.06 * S, 0.036 * S, 10); g.fill(); g.strokeStyle = boneCol(0.45); g.lineWidth = 4; g.stroke(); } // vertebrae
    line(CRANIUM, 11, vib);
    line(MAXILLA, 9, vib);
    const [ox, oy] = P(0.165, 0.07); // eye socket
    g.strokeStyle = boneCol(0.7); g.lineWidth = 8; g.beginPath(); g.ellipse(ox + vib, oy, 0.05 * S, 0.046 * S, 0, 0, TAU); g.stroke();
    line([[0.12, 0.0], [0.04, -0.012], [-0.03, -0.03]], 8, vib); // cheekbone
    for (let i = 0; i < 5; i++) { const [tx, ty] = P(0.225 - i * 0.03, -0.088); g.fillStyle = boneCol(0.9); rrect(g, tx - 0.011 * S + vib, ty - 0.006 * S, 0.022 * S, 0.026 * S, 6); g.fill(); } // upper teeth
    // the JAW BONE (swings with the talk), glows orange when the bone path is on
    const jp = MANDIBLE.map((p) => jawRot(p, jaw));
    const jpath = pathOf(crPts(jp.map(([x, y]) => P(x, y)), 8, false), false);
    if (bk > 0.01) { q.save(); q.globalAlpha = bk; q.strokeStyle = ORANGE; q.lineWidth = 46; q.stroke(jpath); q.restore(); g.strokeStyle = `rgba(255,140,30,${0.35 * bk})`; g.lineWidth = 46; g.stroke(jpath); }
    g.strokeStyle = boneCol(0.3); g.lineWidth = 34; g.stroke(jpath);
    g.strokeStyle = boneCol(0.95); g.lineWidth = 13; g.stroke(jpath);
    for (let i = 0; i < 5; i++) { const [tx, ty] = P(...jawRot([0.222 - i * 0.03, -0.122], jaw)); g.fillStyle = boneCol(0.9); rrect(g, tx - 0.011 * S, ty - 0.02 * S, 0.022 * S, 0.024 * S, 6); g.fill(); }
  }
  private drawEar(g: Ctx, q: Ctx, t: number, X: XSt) {
    const P = this.b.P, S = this.b.S;
    // outer ear (pinna): a soft C round the ear hole
    const pin: P2[] = [[-0.075, 0.055], [-0.115, 0.065], [-0.148, 0.03], [-0.15, -0.025], [-0.128, -0.07], [-0.095, -0.085], [-0.075, -0.07]];
    const pp = pathOf(crPts(pin.map(([x, y]) => P(x, y)), 8, false), false);
    g.strokeStyle = "rgba(150,220,255,0.25)"; g.lineWidth = 30; g.stroke(pp);
    g.strokeStyle = "rgba(220,245,255,0.85)"; g.lineWidth = 9; g.stroke(pp);
    // the cochlea (inner ear): a glowing snail
    const [cx, cy] = P(...XL.cochlea);
    const hit = Math.max(0.35 * X.air * (0.5 + 0.5 * Math.sin(t * 9)), X.bone * 0.6, bump(t, W.ears - 0.2, W.ears + 0.7, 0.15), 0.8 * X.deep);
    const col = X.bone > 0.3 ? "#ffd27a" : "#bff0ff";
    blob(q, cx, cy, (0.07 + 0.04 * hit) * S, `rgba(255,220,140,${0.4 + 0.5 * hit})`, "rgba(255,180,80,0)");
    blob(g, cx, cy, 0.06 * S, `rgba(255,230,170,${0.25 + 0.4 * hit})`, "rgba(255,200,120,0)");
    const sp: P2[] = [];
    for (let a = 0; a <= 3.4 * Math.PI; a += 0.12) { const r = 0.042 * (1 - a / (4.1 * Math.PI)); sp.push([cx + Math.cos(a + t * 0.6) * r * S * this.dir, cy + Math.sin(a + t * 0.6) * r * S]); }
    g.strokeStyle = INK; g.lineWidth = 15; strokePts(g, sp);
    g.strokeStyle = col; g.lineWidth = 9; strokePts(g, sp);
    q.strokeStyle = col; q.lineWidth = 22; strokePts(q, sp);
  }
  /** cartoon eye + brow on the glass (curious), mouth gap */
  private drawFace(g: Ctx, q: Ctx, t: number, X: XSt, open: number) {
    const P = this.b.P, S = this.b.S;
    const [ex, ey] = P(0.19, 0.075);
    const blink = bump(t, 6.0, 6.12, 0.05) + bump(t, 10.6, 10.72, 0.05) + bump(t, 14.2, 14.32, 0.05);
    const sy = 1 - 0.9 * clamp01(blink) + 0.12 * X.deep;
    g.save(); g.translate(ex, ey); g.scale(1, sy);
    g.fillStyle = "#f4fbff"; g.beginPath(); g.ellipse(0, 0, 0.034 * S, 0.042 * S, 0, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 7; g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(0.014 * S * this.dir, 0.004 * S, 0.017 * S, 0, TAU); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0.02 * S * this.dir, -0.004 * S, 0.006 * S, 0, TAU); g.fill();
    g.restore();
    q.fillStyle = "rgba(200,240,255,0.25)"; q.beginPath(); q.arc(ex, ey, 0.05 * S, 0, TAU); q.fill();
    const by = 0.142 + 0.012 * Math.max(X.twice, X.deep); // brow (raises when curious / deep)
    g.strokeStyle = CYAN; g.lineWidth = 12; g.beginPath(); g.moveTo(...P(0.15, by - 0.008)); g.quadraticCurveTo(...P(0.19, by + 0.012), ...P(0.232, by - 0.004)); g.stroke();
    // mouth slit
    const [m0x, m0y] = P(0.272, -0.104), [m1x, m1y] = P(...jawRot([0.268, -0.118], -0.2 * open)), [m2x, m2y] = P(0.2, -0.11);
    g.fillStyle = "rgba(3,6,30,0.95)"; g.beginPath(); g.moveTo(m0x, m0y); g.lineTo(m2x, m2y); g.lineTo(m1x, m1y); g.closePath(); g.fill();
  }
  /** "twice": both routes flash as ghost dashed tracks */
  private drawGhosts(g: Ctx, q: Ctx, t: number, X: XSt) {
    const k = X.twice;
    if (k < 0.01) return;
    const pulse = 0.5 + 0.5 * Math.sin((t - W.twice) * 9);
    const flash = bump(t, W.twice - 0.1, W.twice + 1.1, 0.25);
    for (const [p, col, on] of [[this.air, BLUE, X.air], [this.bone, ORANGE, X.bone]] as [Poly, string, number][]) {
      const a = k * (0.32 + 0.5 * flash * pulse) * (1 - 0.6 * on);
      if (a < 0.01) continue;
      g.save(); g.globalAlpha = a; g.setLineDash([22, 20]); g.lineDashOffset = -t * 90;
      g.strokeStyle = col; g.lineWidth = 10; strokePts(g, p.pts); g.restore();
      q.save(); q.globalAlpha = a * 0.6; q.strokeStyle = col; q.lineWidth = 26; strokePts(q, p.pts); q.restore();
    }
  }
  private drawAir(g: Ctx, q: Ctx, t: number, X: XSt, open: number) {
    const B = this.b, P = B.P, S = B.S, p = this.air;
    const [mx, my] = P(...XL.mouth);
    // "when you talk": little arcs puff out of the mouth from the start
    const talk = clamp01((t - shotStart(2)) / 0.4) * (1 - 0.8 * X.air);
    for (let i = 0; i < 3; i++) {
      const u = cyc(t * 1.3 + i / 3), a = talk * Math.sin(Math.PI * u) * (0.5 + 0.5 * open);
      ring(g, q, mx + (0.03 + 0.09 * u) * S * this.dir, my, this.dir > 0 ? 0 : Math.PI, (0.025 + 0.04 * u) * S, 0.011 * S, a, BLUE, BLUE_HI, 0.85);
    }
    const k = Math.max(X.air, smooth((t - (W.air - 0.75)) / 0.4)); // QA1: the loop reads fully by "air" (271)
    if (k < 0.01) return;
    const front = glide(clamp01((t - (W.air - 0.7)) / 0.6));
    const track = polySub(p, 0, front); // guide track (dotted) up to the front
    g.save(); g.globalAlpha = 0.6 * k; g.setLineDash([3, 26]); g.lineCap = "round"; g.strokeStyle = BLUE_HI; g.lineWidth = 11; strokePts(g, track); g.restore();
    q.save(); q.globalAlpha = 0.35 * k; q.strokeStyle = BLUE; q.lineWidth = 30; strokePts(q, track); q.restore();
    const N = 9, rate = 0.42; // rings flowing along
    for (let i = 0; i < N; i++) {
      const u = cyc(t * rate + i / N);
      if (u > front) continue;
      const s = polyAt(p, u);
      const size = (0.034 + 0.03 * Math.sin(Math.PI * Math.min(1, u * 1.15))) * (1 - 0.45 * smooth((u - 0.85) / 0.15));
      const a = k * smooth(u / 0.05) * (1 - smooth((u - 0.93) / 0.07)) * (1 - smooth((u - front + 0.03) / 0.03));
      ring(g, q, s.x, s.y, s.a, size * S, 0.014 * S, a, BLUE, BLUE_HI);
    }
    const e = polyAt(p, 0.985), arr = smooth((front - 0.9) / 0.1) * k; // arrowhead into the ear
    if (arr > 0.01) {
      g.save(); g.globalAlpha = arr; g.translate(e.x, e.y); g.rotate(e.a);
      const z = 0.034 * S;
      g.beginPath(); g.moveTo(z * 0.9, 0); g.lineTo(-z * 0.6, -z * 0.75); g.lineTo(-z * 0.25, 0); g.lineTo(-z * 0.6, z * 0.75); g.closePath();
      g.fillStyle = BLUE_HI; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
      g.restore();
    }
  }
  private drawBone(g: Ctx, q: Ctx, t: number, X: XSt) {
    const k = Math.max(X.bone, smooth((t - (W.skull - 0.7)) / 0.4)); // QA1: the bone path reads by "skull" (360)
    if (k < 0.01) return;
    const S = this.b.S, p = this.bone;
    const front = glide(clamp01((t - (W.skull - 0.65)) / 0.7));
    const speed = 1 + 0.8 * X.ears;
    const n = 90, amp = 0.012 * S * (0.7 + 0.5 * X.ears), lam = 0.03 * S, pts: P2[] = []; // the buzzing zigzag
    for (let i = 0; i <= n; i++) {
      const u = (i / n) * front, s = polyAt(p, u), L = u * p.len;
      const w = Math.sin((L / lam) * TAU - t * 26 * speed) * amp;
      pts.push([s.x - Math.sin(s.a) * w, s.y + Math.cos(s.a) * w]);
    }
    g.save(); g.globalAlpha = k;
    g.strokeStyle = "rgba(40,10,0,0.75)"; g.lineWidth = 0.026 * S; strokePts(g, pts);
    g.strokeStyle = ORANGE; g.lineWidth = 0.016 * S; strokePts(g, pts);
    g.strokeStyle = ORANGE_HI; g.lineWidth = 0.006 * S; strokePts(g, pts);
    g.restore();
    q.save(); q.globalAlpha = k; q.strokeStyle = ORANGE; q.lineWidth = 0.05 * S; strokePts(q, pts); q.restore();
    for (let i = 0; i < 4; i++) { // travelling hot pulses
      const u = cyc(t * 0.9 * speed + i / 4);
      if (u > front) continue;
      const s = polyAt(p, u), a = k * Math.sin(Math.PI * u);
      blob(q, s.x, s.y, 0.05 * S, `rgba(255,220,120,${a})`, "rgba(255,140,30,0)");
      blob(g, s.x, s.y, 0.022 * S, `rgba(255,248,210,${a})`, "rgba(255,180,60,0)");
    }
  }
  /** the little waveform at the ear; turns big, slow and bassy on `deep` */
  private drawWave(g: Ctx, q: Ctx, t: number, X: XSt) {
    const P = this.b.P, S = this.b.S, wv = XL.wave;
    const pop = back(clamp01((t - (W.air + 0.3)) / 0.45));
    if (pop < 0.01 || X.air < 0.01) return;
    const d = glide(X.deep);
    const sc = pop * (1 + 0.7 * d + 0.06 * bump(t, W.deeper, W.deeper + 0.5, 0.1) * Math.sin((t - W.deeper) * 30));
    const [cx, cy] = P(...wv.c), w = wv.w * S * sc, h = wv.h * S * sc;
    const [ex, ey] = P(...XL.cochlea); // leader to the ear
    g.save(); g.globalAlpha = smooth(pop); g.strokeStyle = "rgba(220,245,255,0.75)"; g.lineWidth = 6; g.setLineDash([10, 10]);
    g.beginPath(); g.moveTo(cx, cy + h / 2); g.lineTo(ex, ey - 0.035 * S); g.stroke(); g.restore();
    g.save();
    g.fillStyle = INK; rrect(g, cx - w / 2 - 7, cy - h / 2 - 7, w + 14, h + 14, h * 0.3 + 7); g.fill();
    const pg = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
    pg.addColorStop(0, `rgb(${Math.round(lerp(13, 70, d))},${Math.round(lerp(42, 26, d))},${Math.round(lerp(90, 50, d))})`); pg.addColorStop(1, `rgb(${Math.round(lerp(6, 34, d))},${Math.round(lerp(22, 10, d))},${Math.round(lerp(58, 30, d))})`);
    g.fillStyle = pg; rrect(g, cx - w / 2, cy - h / 2, w, h, h * 0.3); g.fill();
    g.strokeStyle = d > 0.3 ? ORANGE_HI : CYAN; g.lineWidth = 5; g.stroke();
    rrect(g, cx - w / 2, cy - h / 2, w, h, h * 0.3); g.clip();
    g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - w / 2, cy); g.lineTo(cx + w / 2, cy); g.stroke();
    // thin + fast (air) mixed with bone, then deep: big, slow, thick, warm
    const freq = lerp(9, 2.4, d), amp = lerp(0.2 + 0.08 * X.bone, 0.4, d) * h, spd = lerp(14, 6, d);
    const wpts: P2[] = [];
    for (let i = 0; i <= 120; i++) {
      const u = i / 120, env = Math.pow(Math.sin(Math.PI * u), 0.6);
      const y = Math.sin(u * freq * TAU - t * spd) * (1 - 0.25 * d) + 0.35 * (1 - d) * Math.sin(u * freq * 2.7 * TAU - t * spd * 1.6);
      wpts.push([cx - w / 2 + u * w, cy + y * amp * env]);
    }
    const wc = d > 0.01 ? `rgb(255,${Math.round(lerp(220, 175, d))},${Math.round(lerp(255, 60, d))})` : X.bone > 0.3 ? "#ffd8a0" : BLUE_HI;
    g.strokeStyle = INK; g.lineWidth = lerp(9, 20, d); strokePts(g, wpts);
    g.strokeStyle = wc; g.lineWidth = lerp(5, 12, d); strokePts(g, wpts);
    g.restore();
    q.save(); q.globalAlpha = 0.7 * smooth(pop); q.strokeStyle = d > 0.3 ? ORANGE : BLUE; q.lineWidth = lerp(14, 34, d); strokePts(q, wpts); q.restore();
    if (X.deep > 0.01) { // bass "rumble" arcs either side + the DEEPER tab on top
      for (let i = 0; i < 2; i++) for (const sgn of [-1, 1]) {
        const a = X.deep * (0.55 + 0.45 * Math.sin(t * 8 - i * 1.4));
        const xx = cx + sgn * (w / 2 + 0.03 * S + i * 0.032 * S);
        g.save(); g.globalAlpha = a; g.strokeStyle = INK; g.lineWidth = 15; g.beginPath();
        g.arc(xx - sgn * 0.05 * S, cy, 0.05 * S + i * 0.01 * S, sgn > 0 ? -0.8 : Math.PI - 0.8, sgn > 0 ? 0.8 : Math.PI + 0.8); g.stroke();
        g.strokeStyle = ORANGE_HI; g.lineWidth = 8; g.stroke(); g.restore();
      }
      pill(g, q, cx, cy - h / 2 - 0.04 * S, 0.27 * S, 0.085 * S, ORANGE, "DEEPER", X.deep * (1 - smooth((t - (W.deeper + 0.35)) / 0.3)), t, undefined, "#ffffff", 0.6, ORANGE, bump(t, W.deeper, W.deeper + 0.4, 0.1));
    }
  }
  private drawLabels(g: Ctx, q: Ctx, t: number, X: XSt) {
    const P = this.b.P, S = this.b.S;
    // EAR (from the reveal; bounces on "ears")
    const earK = clamp01((t - (shotStart(2) + 0.25)) / 0.45);
    pill(g, q, ...P(...XL.earTag), 0.19 * S, 0.085 * S, "#e8f8ff", "EAR", earK, t, P(...XL.ear), INK, 0.6, CYAN, bump(t, W.ears - 0.15, W.ears + 0.45, 0.12));
    // AIR / BONE
    const at = polyAt(this.air, 0.07);
    pill(g, q, ...P(...XL.airTag), 0.19 * S, 0.085 * S, BLUE, "AIR", clamp01((t - (W.air - 0.45)) / 0.4), t, [at.x, at.y + 0.02 * S], "#ffffff", 0.6, BLUE, bump(t, W.air - 0.1, W.air + 0.5, 0.15));
    pill(g, q, ...P(...XL.boneTag), 0.235 * S, 0.085 * S, ORANGE, "BONE", clamp01((t - (W.skull - 0.45)) / 0.4), t, P(0.1, -0.2), "#ffffff", 0.6, ORANGE, bump(t, W.skull - 0.1, W.skull + 0.5, 0.15) + bump(t, W.bones - 0.1, W.bones + 0.4, 0.12));
    // title: x2 / YOU HEAR YOURSELF TWICE (blue half | orange half = the two routes); never mirrored
    const k = X.twice;
    if (k > 0.01) {
      const T = XL.title, [tx, ty] = P(T.c[0] * this.dir, T.c[1]);
      const w = T.w * S, h = T.h * S;
      const gr = g.createLinearGradient(tx - w / 2, 0, tx + w / 2, 0);
      gr.addColorStop(0, "#1f7fe0"); gr.addColorStop(0.47, "#2a95f5"); gr.addColorStop(0.53, "#ff8a1e"); gr.addColorStop(1, "#f06a10");
      pill(g, q, tx, ty, w, h, gr, "YOU HEAR YOURSELF TWICE", k, t, undefined, "#ffffff", 0.5, "#9fdcff", bump(t, W.twice - 0.05, W.twice + 0.5, 0.15));
      const [bx, by] = P(XL.x2[0] * this.dir, XL.x2[1]), s = back(clamp01((t - (W.twice - 0.1)) / 0.4)) * (1 + 0.15 * bump(t, W.twice + 0.05, W.twice + 0.45, 0.1));
      if (s > 0.01) { // the x2 badge
        const r = 0.075 * S;
        g.save(); g.translate(bx, by); g.scale(s, s); g.rotate(-0.12 + 0.04 * Math.sin(t * 2.6));
        g.beginPath();
        for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU, rr = i % 2 ? r * 0.84 : r * 1.06; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.lineWidth = r * 0.22; g.strokeStyle = INK; g.stroke(); g.fillStyle = "#ffe14a"; g.fill();
        text(g, "×2", 0, r * 0.06, r * 1.0, "#ffffff", INK, 0.22, 900);
        g.restore();
        blob(q, bx, by, r * 1.6, `rgba(255,225,80,${0.45 * Math.min(1, s)})`, "rgba(255,225,80,0)");
      }
    }
  }
}

// ============================== 2. shot-3 MIC CAPTURE ==============================
const MB = { x0: -0.9, x1: 0.75, y0: -0.3, y1: 0.5 };
/** intersect the ray cam -> p with the board plane (o, N) and return board-local (x, y) */
const onPlane = (F: Frame, cam: THREE.Vector3, p: V3): P2 => {
  const N = F.N, dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
  const den = dx * N[0] + dz * N[2];
  const num = (F.o[0] - cam.x) * N[0] + (F.o[2] - cam.z) * N[2];
  const s = Math.abs(den) < 1e-6 ? 1 : num / den;
  const wx = cam.x + dx * s, wy = cam.y + dy * s, wz = cam.z + dz * s;
  return [(wx - F.o[0]) * F.R[0] + (wz - F.o[2]) * F.R[2], wy - F.o[1]];
};
type MSt = ReturnType<typeof micAt>;
class MicHolo {
  b = new Board(MB, 1000, 30, 1.3, false);
  rec = new Board({ x0: -REC_SIZE.w / 2, x1: REC_SIZE.w / 2, y0: -REC_SIZE.h / 2, y1: REC_SIZE.h / 2 }, 1500, 33, 1.0);
  update(id: number, t: number, cam: THREE.Camera) {
    const M = micAt(id, t);
    const vis = id === 3 && M.mic > 0.002;
    this.b.group.visible = vis; this.rec.group.visible = vis && M.catch > 0.002;
    if (!vis) return;
    // the board sits midway in depth between the mouth and the mic, facing the camera
    const mo = mouthPos(id, t), mi = micPos(id, t);
    const o: V3 = [(mo[0] + mi[0]) / 2, mo[1], (mo[2] + mi[2]) / 2];
    const F = frameFrom(o, cam.position);
    this.b.group.position.set(...o); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.opacity(1);
    this.draw(t, M, onPlane(F, cam.position, mo), onPlane(F, cam.position, mi));
    if (this.rec.group.visible) {
      const rp = recPos(id, t), RF = frameFrom(rp, cam.position);
      this.rec.group.position.set(...rp); this.rec.group.rotation.set(0, RF.yaw, 0);
      this.rec.group.scale.setScalar(Math.max(0.001, back(clamp01((t - (W.airpart - 0.15)) / 0.45)) * (0.6 + 0.4 * M.mic)));
      this.rec.opacity(clamp01(M.catch * 1.5) * clamp01(M.mic * 1.4));
      this.drawRec(t);
    }
  }
  private draw(t: number, M: MSt, mo: P2, mi: P2) {
    const B = this.b, P = B.P, S = B.S, [g, q] = B.begin();
    g.globalAlpha = M.mic; q.globalAlpha = M.mic;
    const side = mi[0] >= mo[0] ? 1 : -1;
    const [ax, ay] = P(mo[0] + side * 0.07, mo[1]), [bx, by] = P(mi[0] - side * 0.065, mi[1]);
    const ang = Math.atan2(by - ay, bx - ax), Lm = Math.hypot(bx - ax, by - ay) / S, zk = Math.max(0.6, Math.min(1, Lm / 0.3));
    const cxp: P2 = [(ax + bx) / 2, (ay + by) / 2 - 0.06 * zk * S];
    const at = (u: number): { x: number; y: number; a: number } => {
      const x = (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * cxp[0] + u * u * bx, y = (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * cxp[1] + u * u * by;
      const dx = 2 * (1 - u) * (cxp[0] - ax) + 2 * u * (bx - cxp[0]), dy = 2 * (1 - u) * (cxp[1] - ay) + 2 * u * (by - cxp[1]);
      return { x, y, a: Math.atan2(dy, dx) };
    };
    // before the catch: loose sound arcs puff out of his mouth toward the mic
    const pre = smooth((t - (W.microphone - 0.1)) / 0.4) * (1 - M.catch);
    for (let i = 0; i < 3; i++) {
      const u = cyc(t * 1.2 + i / 3);
      ring(g, q, ax + Math.cos(ang) * u * 0.12 * S, ay + Math.sin(ang) * u * 0.12 * S, ang, (0.02 + 0.035 * u) * S, 0.011 * S, pre * Math.sin(Math.PI * u), BLUE, BLUE_HI, 0.8);
    }
    const k = M.catch;
    if (k > 0.01) {
      const front = glide(clamp01((t - (W.airpart - 0.25)) / 0.5));
      const track: P2[] = [];
      for (let i = 0; i <= 40; i++) { const s = at((i / 40) * front); track.push([s.x, s.y]); }
      g.save(); g.globalAlpha *= 0.6 * k; g.setLineDash([3, 22]); g.strokeStyle = BLUE_HI; g.lineWidth = 9; strokePts(g, track); g.restore();
      q.save(); q.globalAlpha *= 0.4 * k; q.strokeStyle = BLUE; q.lineWidth = 26; strokePts(q, track); q.restore();
      const N = Lm < 0.22 ? 3 : Lm < 0.32 ? 4 : 5;
      let hit = 0;
      for (let i = 0; i < N; i++) {
        const u = cyc(t * 0.95 + i / N);
        if (u > front) continue;
        const s = at(u), sz = zk * (0.038 + 0.03 * Math.sin(Math.PI * u)) * (1 - 0.4 * smooth((u - 0.8) / 0.2));
        const a = k * smooth(u / 0.06) * (1 - smooth((u - 0.9) / 0.1));
        ring(g, q, s.x, s.y, s.a, sz * S, 0.014 * zk * S, a, BLUE, BLUE_HI);
        hit = Math.max(hit, smooth((u - 0.85) / 0.15) * (1 - smooth((u - 0.97) / 0.03)));
      }
      // the grille drinks it in
      blob(q, bx, by, (0.09 + 0.03 * hit) * S, `rgba(120,210,255,${0.55 * k + 0.3 * hit})`, "rgba(80,180,255,0)");
      blob(g, bx, by, 0.05 * S, `rgba(200,240,255,${0.3 * k + 0.25 * hit})`, "rgba(150,220,255,0)");
      const mid = at(0.5); // AIR pill above the stream
      pill(g, q, mid.x - side * 0.03 * S, mid.y + 0.125 * S, 0.17 * S, 0.075 * S, BLUE, "AIR", clamp01((t - (W.airpart - 0.05)) / 0.4), t, undefined, "#ffffff", 0.6, BLUE, bump(t, W.airpart, W.airpart + 0.45, 0.12));
      // BONE struck out on the far side of his head
      const bk = clamp01((t - (W.part - 0.4)) / 0.4); // QA1: in by "part" (584)
      if (bk > 0.01) {
        const [hx, hy] = P(mo[0] - side * 0.24, mo[1] + 0.31), w = 0.21 * S, h = 0.075 * S;
        pill(g, q, hx, hy, w, h, ORANGE, "BONE", bk, t, undefined, "#ffffff", 0.58, ORANGE);
        const sk = back(clamp01((t - (W.part - 0.1)) / 0.35)); // a red "no" badge
        if (sk > 0.01) {
          const r = h * 0.62, bx2 = hx + w / 2 + r * 0.35, by2 = hy - h * 0.1;
          g.save(); g.translate(bx2, by2); g.scale(sk, sk); g.rotate(0.15);
          g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * 1.18, 0, TAU); g.fill();
          g.fillStyle = "#ff3b4a"; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
          g.strokeStyle = "#ffffff"; g.lineWidth = r * 0.3; g.lineCap = "round";
          g.beginPath(); g.moveTo(-r * 0.42, -r * 0.42); g.lineTo(r * 0.42, r * 0.42); g.moveTo(r * 0.42, -r * 0.42); g.lineTo(-r * 0.42, r * 0.42); g.stroke();
          g.restore();
          blob(q, bx2, by2, r * 2, `rgba(255,60,70,${0.6 * Math.min(1, sk)})`, "rgba(255,60,70,0)");
        }
      }
    }
    g.restore(); q.restore();
    B.flush();
  }
  private drawRec(t: number) {
    const B = this.rec, S = B.S, [g, q] = B.begin(), W2 = B.W, H2 = B.H;
    const pad = 10, r = H2 * 0.22;
    g.fillStyle = INK; rrect(g, pad - 8, pad - 8, W2 - 2 * pad + 16, H2 - 2 * pad + 16, r + 8); g.fill();
    const bg = g.createLinearGradient(0, 0, 0, H2); bg.addColorStop(0, "#1a2244"); bg.addColorStop(1, "#0b1028");
    g.fillStyle = bg; rrect(g, pad, pad, W2 - 2 * pad, H2 - 2 * pad, r); g.fill();
    g.strokeStyle = "#ff4a5a"; g.lineWidth = 7; g.stroke();
    q.strokeStyle = "rgba(255,70,90,0.5)"; q.lineWidth = 22; rrect(q, pad, pad, W2 - 2 * pad, H2 - 2 * pad, r); q.stroke();
    // header: (red dot) REC  |  AIR ONLY
    const hy = H2 * 0.29, blink = 0.55 + 0.45 * Math.cos(t * 7);
    blob(q, 0.055 * S, hy, 0.04 * S, `rgba(255,60,70,${blink})`, "rgba(255,60,70,0)");
    g.fillStyle = `rgb(255,${Math.round(50 + 40 * blink)},${Math.round(60 + 40 * blink)})`; g.beginPath(); g.arc(0.055 * S, hy, 0.016 * S, 0, TAU); g.fill();
    g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    g.textBaseline = "middle"; g.textAlign = "left"; g.font = `900 ${0.044 * S}px ${FONT}`; g.fillStyle = "#ffffff"; g.fillText("REC", 0.082 * S, hy + 2);
    g.textAlign = "right"; g.font = `900 ${0.033 * S}px ${FONT}`; g.fillStyle = "#8fd4ff"; g.fillText("AIR ONLY", W2 - 0.03 * S, hy + 2);
    // thin, high, wiggly waveform
    const wy = H2 * 0.66, x0 = 0.03 * S, x1 = W2 - 0.03 * S, pts: P2[] = [];
    const grow = smooth((t - (W.airpart - 0.05)) / 0.5);
    g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, wy); g.lineTo(x1, wy); g.stroke();
    for (let i = 0; i <= 160; i++) {
      const u = i / 160, x = lerp(x0, x1, u);
      const reveal = smooth((grow * 1.15 - u) / 0.15);
      const y = (Math.sin(u * 15 * TAU - t * 22) * 0.6 + Math.sin(u * 37 * TAU - t * 31) * 0.4) * H2 * 0.15 * (0.5 + 0.5 * Math.abs(Math.sin(u * 3.1 + t * 2))) * reveal;
      pts.push([x, wy + y]);
    }
    g.strokeStyle = INK; g.lineWidth = 7; strokePts(g, pts);
    g.strokeStyle = BLUE_HI; g.lineWidth = 3.2; strokePts(g, pts);
    q.strokeStyle = BLUE; q.lineWidth = 12; strokePts(q, pts);
    g.restore(); q.restore();
    B.flush();
  }
}

// ============================== root ==============================
export class Holo {
  root = new THREE.Group();
  private xray = new XrayHolo(); private mic = new MicHolo();
  private dbg: THREE.Group | null = null;
  constructor() { this.root.add(this.xray.b.group, this.mic.b.group, this.mic.rec.group); }
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG) this.debug(id, t, cam as THREE.PerspectiveCamera);
    this.xray.update(id, t, cam);
    this.mic.update(id, t, cam);
  }
  /** TEMP stand-ins + recommended cameras (stills only) */
  private debug(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const c = id === 2 ? xrayCam(id, t) : id === 3 && t < W.weird + 0.5 ? micCam(id, t) : null;
    if (c) { cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    if (!this.dbg) {
      const mat = (col: string) => new THREE.MeshBasicMaterial({ color: col });
      const g = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), mat("#f2c9a0")); head.position.set(0, 1.45, 0);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), mat("#5a7ad0")); body.position.set(0, 0.85, -0.01);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), mat("#3a4a8a")); bg.position.set(0, 1.4, -1.39);
      const mic = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 12), mat("#c8ccd8")); mic.position.set(...MIC_POS);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.3), mat("#333844")); stand.position.set(MIC_POS[0], MIC_POS[1] - 0.68, MIC_POS[2]);
      g.add(head, body, bg, mic, stand); g.position.set(...ROOM);
      g.traverse((o) => { o.frustumCulled = false; });
      this.dbg = g; this.root.add(g);
    }
    this.dbg.visible = id <= 3;
    this.dbg.children[3].visible = false; this.dbg.children[4].visible = false; // props draws the real mic
  }
}
