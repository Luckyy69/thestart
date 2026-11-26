// OWNER: holo agent. See /home/user/lookmatch/HICCUP_BRIEF.md
// Every readable science overlay of "Hiccups Come From Tadpoles" (pure functions of (id, t); never frustum culled):
//   1. SHOT 2 X-RAY (xrayAt): a glowing cutaway of BEAN's torso + neck over his card: navy glass, cyan rim, ribs,
//      pink lungs, the windpipe, the pink DIAPHRAGM dome that SPASMS down (`diaphragm`: zaps + down arrows, the lungs
//      stretch), air rushing down the windpipe (`air`: white air puffs into the lungs), and the little orange THROAT
//      DOOR (the glottis) that SLAMS shut across the windpipe (`door`: "SLAM!", the air piles up against it), then the
//      door bangs again on the hic -> a big "HIC!" burst + sound rings. Pills: "DIAPHRAGM", "THROAT DOOR".
//   2. SHOT 3 GILLS DIAGRAM (tadpoleAt) around the tadpole card: three blue water lanes flow IN the mouth (`gulp`
//      pulls the first water in) and OUT over the gills (`flow`), an X-ray inset bubble in its belly with the same
//      orange throat door that SNAPS shut over the lung pipe (`snap`, creeping water drops knocked away) and two
//      little lungs that get a green check "DRY" badge (`dry`). Pill "GILLS". Fades out on the morph.
//   3. SHOT 5 HIC-O-METER (osborneAt): a real 3D brass odometer (9 ivory drums, commas, rivets, a crank, an enamel
//      "HIC-O-METER" plaque) that drops in on "kept going", ticks through the time-lapse, then ROLLS to 430,000,000
//      (proper odometer carries, motion-blurred fast drums), a gold glint on "hics". Below the drums an enamel plate
//      keeps a TALLY of HIC marks that fills during the time-lapse. The machine jolts on every Osborne hic.
// Technique (after sneeze/nerves.ts + burp/props.ts): canvas planes in an anchor frame yawed to the camera, a
// depth-only twin, an additive HDR glow twin in front (bloom source), all NOINK; the odometer is lit twoTone geometry
// with ink outlines.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { KITCHEN, POND, FARM, W, V3, FPS, HICS, xrayAt, tadpoleAt, osborneAt, morphAt, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG = false; // TEMP: recommended framings + stand-ins for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const back = (u: number) => { const x = clamp01(u), c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bump = (t: number, a: number, b: number, r = 0.2) => smooth((t - a) / r) * (1 - smooth((t - b) / r));
const cyc = (x: number) => ((x % 1) + 1) % 1;

// ============================== public contracts ==============================
/** overrides from other owners (cast): BEAN's chest, the tadpole pose and the odometer anchor per (id, t) */
export const HOLO_HOOKS: {
  chest?: (id: number, t: number) => V3 | undefined;
  tadpole?: (id: number, t: number) => { pos: V3; dir: 1 | -1; scale: number } | undefined;
  odo?: (id: number, t: number) => V3 | undefined;
} = {};
/** BEAN's chest (shot 2 X-ray anchor); head is chest + (0, 0.4, 0) */
export const CHEST: V3 = add(KITCHEN, 0, 1.05, 0);
export const chestPos = (id: number, t: number): V3 => HOLO_HOOKS.chest?.(id, t) ?? CHEST;
/** the X-ray floats this far in front of the chest (toward the camera) */
export const XRAY_D = 0.16;
/** chest-local layout (m; x = screen right, y = up, origin = chest). The torso cutaway spans x +-0.28, y -0.38..0.30
 *  (its neck top fades out at the chin, ~chest+0.25). Recommended framing: xrayCam (captions at 70 % then fall at
 *  local y ~-0.21, on the dropped dome, between the "DIAPHRAGM" pill below and the lungs above). */
export const XRAY_LAYOUT = {
  box: { x0: -0.37, x1: 0.37, y0: -0.4, y1: 0.36 },
  door: [0, 0.175] as P2, hinge: [-0.045, 0.175] as P2, mouth: [0, 0.3] as P2,
  diaphragm: [0, -0.17] as P2, lungL: [-0.13, -0.03] as P2, lungR: [0.13, -0.03] as P2,
  doorTag: { c: [0.19, 0.105] as P2, w: 0.3, h: 0.068 }, diaTag: { c: [0, -0.318] as P2, w: 0.33, h: 0.072 },
  /** the holo draws its own big "HIC!" burst here on shot 2 at HICS[1] (cast: skip BEAN's shot-2 HIC card, or put it right of the head) */
  hic: [-0.2, 0.12] as P2, slam: [-0.2, 0.12] as P2,
};
type Frame = { o: V3; yaw: number; R: V3; N: V3 };
const frameFrom = (o: V3, cam: THREE.Vector3): Frame => {
  const yaw = Math.atan2(cam.x - o[0], cam.z - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)], N: [Math.sin(yaw), 0, Math.cos(yaw)] };
};
const toW = (F: Frame, x: number, y: number, d: number): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** world point of a chest-local X-ray point, seen from a camera at camPos */
export const xrayPoint = (id: number, t: number, x: number, y: number, camPos: V3): V3 => toW(frameFrom(chestPos(id, t), new THREE.Vector3(...camPos)), x, y, XRAY_D);
/** recommended shot-2 camera (straight on, held): look chest+(0,0.05,0) from 2.05 m, fov 38 */
export const xrayCam = (id: number, t: number) => { const c = chestPos(id, t); return { pos: add(c, 0, 0.05, 2.05), look: add(c, 0, 0.05, 0), fov: 38 }; };

/** the tadpole (shot 3): card centre POND+(0,1.2,0), head toward +x (dir 1) */
export const TADPOLE: V3 = add(POND, 0, 1.2, 0);
export const tadpolePose = (id: number, t: number) => HOLO_HOOKS.tadpole?.(id, t) ?? { pos: TADPOLE, dir: 1 as 1 | -1, scale: 1 };
/** the gill diagram floats this far in front of the tadpole card */
export const GILL_D = 0.22;
/** tadpole-local layout the diagram assumes (m, x toward the head, origin = card centre; mirrored by dir): head centre
 *  (0.12, 0.0) r ~0.26, eye (0.24, 0.1), MOUTH (0.36, -0.04), GILL slits x 0.0..0.06 at y ~0.03, belly lungs
 *  (0.1, -0.2) shown in an X-ray inset bubble r 0.115, tail toward -x. Water lanes run from x 0.64 (in front of the
 *  mouth) through the throat (0.2, -0.05) and out over the gills up-back to (-0.2, 0.33). */
export const TADPOLE_LAYOUT = {
  box: { x0: -0.48, x1: 0.7, y0: -0.34, y1: 0.42 },
  mouth: [0.36, -0.04] as P2, throat: [0.2, -0.05] as P2, gills: [0.03, 0.03] as P2, eye: [0.24, 0.1] as P2,
  inset: { c: [0.11, -0.165] as P2, r: 0.145 }, door: [0.158, -0.093] as P2, lungs: [0.1, -0.2] as P2,
  gillTag: { c: [-0.3, -0.02] as P2, w: 0.2, h: 0.064 }, dryTag: { c: [-0.15, -0.235] as P2, w: 0.22, h: 0.078 },
};
export const gillPoint = (id: number, t: number, x: number, y: number, camPos: V3): V3 => {
  const p = tadpolePose(id, t);
  return toW(frameFrom(p.pos, new THREE.Vector3(...camPos)), x * p.dir * p.scale, y * p.scale, GILL_D * p.scale);
};
/** recommended shot-3 framing once the tadpole has landed: diagram centre x 0.12, 2.9 m, fov 36 (captions at local -0.35) */
export const gillCam = (id: number, t: number) => { const p = tadpolePose(id, t); return { pos: add(p.pos, 0.12 * p.dir, 0.1, 2.9), look: add(p.pos, 0.12 * p.dir, 0.0, 0), fov: 36 }; };

/** the HIC-O-METER (shot 5): centre of its front, floating above Osborne's hat, in front of his card. Size 0.8 x 0.36 m
 *  (drum digits 0.045 m tall). It yaws to face the camera. */
export const ODO_POS: V3 = add(FARM, 0, 1.95, 0.35);
/** odometer scale (1 = 0.8 x 0.36 m) */
export const ODO_SCALE = 0.9;
export const ODO_SIZE = { w: 0.8 * ODO_SCALE, h: 0.36 * ODO_SCALE };
export const odoPos = (id: number, t: number): V3 => HOLO_HOOKS.odo?.(id, t) ?? ODO_POS;
/** recommended shot-5 end framing (the peak): Osborne's face at ~50 %, the odometer in the top third, captions on his chest */
export const odoCam = () => ({ pos: add(FARM, 0.12, 1.55, 3.0), look: add(FARM, 0, 1.5, 0), fov: 36 });

// ============================== canvas helpers ==============================
const INK = "#0a0d2e";
type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
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
const star = (g: Ctx, x: number, y: number, r: number, a: number, col: string, rot = 0) => {
  if (r <= 0.5 || a <= 0.01) return;
  g.save(); g.globalAlpha *= Math.min(1, a); g.fillStyle = col; g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU, rr = k % 2 ? r * 0.26 : r; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  g.closePath(); g.fill(); g.restore();
};
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
const loopPath = (pts: P2[]) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(...q) : p.moveTo(...q))); p.closePath(); return p; };
type Poly = { pts: P2[]; cum: number[]; len: number };
const poly = (px: P2[]): Poly => {
  const pts = crPts(px, 12, false), cum = [0];
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
const nearestU = (p: Poly, q: P2) => { let bi = 0, bd = 1e9; p.pts.forEach((r, i) => { const d = Math.hypot(r[0] - q[0], r[1] - q[1]); if (d < bd) { bd = d; bi = i; } }); return p.cum[bi] / p.len; };
/** comic burst (jagged star) with ink rim */
const burst = (g: Ctx, x: number, y: number, r: number, fill: string, rim: string, rot: number, n = 14, seed = 1) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * TAU, h = Math.sin(k * 12.9898 + seed * 78.233) * 43758.5453, j = h - Math.floor(h);
    const rr = k % 2 ? r * (0.68 + 0.08 * j) : r * (0.95 + 0.18 * j);
    g.lineTo(Math.cos(a) * rr * 1.18, Math.sin(a) * rr);
  }
  g.closePath(); g.lineJoin = "round";
  g.lineWidth = r * 0.16; g.strokeStyle = INK; g.stroke();
  g.fillStyle = rim; g.fill();
  g.scale(0.8, 0.8); g.fillStyle = fill; g.fill();
  g.restore();
};
/** a label pill that pops in (back easing) with an optional leader to `to` (canvas px) */
const pill = (g: Ctx, q: Ctx | null, x: number, y: number, w: number, h: number, fill: string, label: string, k: number, t: number, to?: P2, txt = "#ffffff", fs = 0.56) => {
  if (k < 0.01) return;
  if (to) {
    const a = smooth(k * 1.6), ex = lerp(x, to[0], a), ey = lerp(y, to[1], a);
    g.save(); g.globalAlpha = a; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokeStyle = INK; g.lineWidth = h * 0.24; g.stroke(); g.strokeStyle = fill; g.lineWidth = h * 0.11; g.stroke();
    g.fillStyle = fill; g.beginPath(); g.arc(ex, ey, h * 0.15, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = h * 0.07; g.stroke();
    g.restore();
  }
  const s = back(k);
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(0.025 * Math.sin(t * 2.1 + x));
  const pad = h * 0.13;
  g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, h / 2 + pad); g.fill();
  g.fillStyle = fill; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.32)"; rrect(g, -w / 2 + h * 0.3, -h / 2 + h * 0.1, w - h * 0.6, h * 0.26, h * 0.13); g.fill();
  text(g, label, 0, h * 0.04, h * fs, txt, INK, txt === INK ? 0 : 0.26, 900);
  g.restore();
  if (q) { q.save(); q.globalAlpha = 0.3 * k; q.strokeStyle = fill; q.lineWidth = h * 0.35; rrect(q, x - w / 2 - h * 0.2, y - h / 2 - h * 0.2, w + h * 0.4, h * 1.4, h * 0.7); q.stroke(); q.restore(); }
};
/** the cartoon THROAT DOOR (shared by shots 2 + 3): a little orange plank on a gold hinge. ang = canvas radians. */
const door = (g: Ctx, q: Ctx, hx: number, hy: number, len: number, th: number, ang: number, flash: number) => {
  g.save(); g.translate(hx, hy); g.rotate(ang);
  const r = th * 0.4;
  g.fillStyle = INK; rrect(g, -th * 0.45, -th / 2 - th * 0.22, len + th * 0.6, th * 1.44, r + th * 0.2); g.fill();
  const gr = g.createLinearGradient(0, -th / 2, 0, th / 2);
  gr.addColorStop(0, flash > 0.01 ? "#ffd7a8" : "#ffab5c"); gr.addColorStop(0.5, "#ff7a2e"); gr.addColorStop(1, "#d8461a");
  g.fillStyle = gr; rrect(g, -th * 0.2, -th / 2, len + th * 0.1, th, r); g.fill();
  g.strokeStyle = "rgba(120,30,0,0.55)"; g.lineWidth = th * 0.1; // plank line
  g.beginPath(); g.moveTo(th * 0.6, 0); g.lineTo(len - th * 0.4, 0); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.45)"; rrect(g, th * 0.3, -th * 0.38, len - th * 0.8, th * 0.18, th * 0.09); g.fill();
  g.fillStyle = "#ffe066"; g.beginPath(); g.arc(len - th * 0.35, th * 0.05, th * 0.17, 0, TAU); g.fill(); // knob
  g.strokeStyle = INK; g.lineWidth = th * 0.08; g.stroke();
  g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(0, 0, th * 0.42, 0, TAU); g.fill(); // hinge
  g.lineWidth = th * 0.14; g.strokeStyle = INK; g.stroke();
  g.fillStyle = "#fff6c0"; g.beginPath(); g.arc(-th * 0.1, -th * 0.12, th * 0.12, 0, TAU); g.fill();
  g.restore();
  q.save(); q.translate(hx, hy); q.rotate(ang);
  q.fillStyle = `rgba(255,150,60,${0.15 + 0.6 * flash})`; rrect(q, -th * 0.5, -th * 0.8, len + th, th * 1.6, th * 0.8); q.fill();
  q.restore();
};
/** a fat cartoon arrow (canvas px) pointing along angle a */
const fatArrow = (g: Ctx, x: number, y: number, a: number, s: number, fill: string, alpha: number) => {
  if (alpha < 0.01) return;
  g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(a); g.lineJoin = "round";
  g.beginPath(); g.moveTo(s, 0); g.lineTo(0, -s * 0.75); g.lineTo(0, -s * 0.3); g.lineTo(-s * 0.9, -s * 0.3); g.lineTo(-s * 0.9, s * 0.3); g.lineTo(0, s * 0.3); g.lineTo(0, s * 0.75); g.closePath();
  g.lineWidth = s * 0.22; g.strokeStyle = INK; g.stroke(); g.fillStyle = fill; g.fill();
  g.restore();
};
/** a check mark (canvas px) that draws itself (k 0..1) */
const check = (g: Ctx, x: number, y: number, s: number, col: string, k: number) => {
  if (k < 0.01) return;
  const p: P2[] = [[x - s * 0.55, y + s * 0.02], [x - s * 0.15, y + s * 0.42], [x + s * 0.6, y - s * 0.45]];
  const L1 = Math.hypot(p[1][0] - p[0][0], p[1][1] - p[0][1]), L2 = Math.hypot(p[2][0] - p[1][0], p[2][1] - p[1][1]), L = (L1 + L2) * clamp01(k);
  const pts: P2[] = [p[0]];
  if (L <= L1) pts.push([lerp(p[0][0], p[1][0], L / L1), lerp(p[0][1], p[1][1], L / L1)]);
  else { pts.push(p[1]); const u = (L - L1) / L2; pts.push([lerp(p[1][0], p[2][0], u), lerp(p[1][1], p[2][1], u)]); }
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = s * 0.42; strokePts(g, pts);
  g.strokeStyle = col; g.lineWidth = s * 0.24; strokePts(g, pts);
  g.restore();
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
  constructor(public box: { x0: number; x1: number; y0: number; y1: number }, public S: number, ro: number, glowK = 1.7) {
    this.W = Math.round((box.x1 - box.x0) * S); this.H = Math.round((box.y1 - box.y0) * S);
    this.main = new Plane(this.W, this.H); this.glow = new Plane(Math.round(this.W * GS), Math.round(this.H * GS));
    const geo = new THREE.PlaneGeometry(box.x1 - box.x0, box.y1 - box.y0);
    const mk = (m: THREE.MeshBasicMaterial, z: number, r: number) => {
      const me = new THREE.Mesh(geo, m); me.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, z); me.renderOrder = r;
      me.layers.set(NOINK); me.frustumCulled = false; this.group.add(me); this.meshes.push(me); this.mats.push(m);
    };
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0, ro);
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, alphaTest: 0.5, colorWrite: false, depthWrite: true, fog: false, side: THREE.DoubleSide }), 0, ro + 1);
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
  /** scan-wipe reveal top -> bottom (clip both canvases); returns the wipe y (px) */
  wipe(rev: number): number {
    const y = lerp(0, this.H, glide(rev));
    if (rev < 0.999) for (const c of [this.main.g, this.glow.g]) { c.beginPath(); c.rect(0, 0, this.W, y); c.clip(); }
    return y;
  }
}

// ============================== 1. shot-2 X-RAY ==============================
const XL = XRAY_LAYOUT;
const TORSO_R: P2[] = [[0.07, 0.31], [0.07, 0.215], [0.1, 0.178], [0.18, 0.158], [0.245, 0.128], [0.274, 0.065], [0.279, -0.05], [0.268, -0.18], [0.252, -0.3], [0.238, -0.385]];
const LUNG_R: P2[] = [[0.036, 0.06], [0.068, 0.112], [0.122, 0.112], [0.18, 0.068], [0.212, -0.02], [0.222, -0.11], [0.205, -0.16], [0.14, -0.15], [0.07, -0.142], [0.036, -0.105], [0.048, -0.04]];
const TREE_R: P2[][] = [[[0.03, 0.005], [0.09, -0.035], [0.15, -0.02], [0.18, 0.03]], [[0.09, -0.035], [0.13, -0.09], [0.175, -0.12]], [[0.13, -0.09], [0.085, -0.115]], [[0.09, -0.035], [0.105, 0.04], [0.1, 0.085]], [[0.15, -0.02], [0.19, -0.07]]];
const T_CLOSE = W.shut - 0.08; // the door is half shut (xrayAt.door 0.5) here
const T_HIC = HICS[1][0]; // the shot-2 hic
const DOOR_OPEN = -1.42, DOOR_LEN = 0.092, DOOR_TH = 0.025, PIPE_W = 0.088, LUMEN_W = 0.056;
const doorAngle = (t: number, d: number) => {
  let a = DOOR_OPEN * (1 - d);
  const d1 = t - (W.shut - 0.04);
  if (d1 > 0) a += 0.26 * Math.sin(d1 * 34) * Math.exp(-d1 * 7);
  const d2 = t - T_HIC;
  if (d2 > 0) a += 0.2 * Math.sin(d2 * 44) * Math.exp(-d2 * 6);
  return a;
};
type XSt = ReturnType<typeof xrayAt>;
type Dome = { apex: number; edge: number; ctrl: number; y: (x: number) => number };

class XrayHolo {
  b = new Board(XL.box, 1600, 30, 1.15);
  private torso: Path2D;
  private airL: Poly; private airR: Poly; private uDoor: number;
  private last = "";
  constructor() {
    const P = this.b.P;
    const loop: P2[] = [...TORSO_R, ...TORSO_R.slice().reverse().map(([x, y]) => [-x, y] as P2)];
    this.torso = loopPath(crPts(loop.map(([x, y]) => P(x, y)), 8, true));
    this.airL = poly([[0, 0.36], [0, 0.25], [0, 0.12], [0, 0.04], [-0.04, 0.005], [-0.085, -0.03], [-0.12, -0.075]].map(([x, y]) => P(x, y)));
    this.airR = poly([[0, 0.36], [0, 0.25], [0, 0.12], [0, 0.04], [0.04, 0.005], [0.085, -0.03], [0.12, -0.075]].map(([x, y]) => P(x, y)));
    this.uDoor = nearestU(this.airL, P(0, XL.door[1]));
  }
  update(id: number, t: number, cam: THREE.Camera) {
    const X = xrayAt(id, t), show = id === 2 ? X.show : 0;
    this.b.group.visible = show > 0.002;
    if (!this.b.group.visible) return;
    const F = frameFrom(chestPos(id, t), cam.position);
    this.b.group.position.set(...toW(F, 0, 0, XRAY_D)); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.group.scale.setScalar(0.94 + 0.06 * glide(show));
    this.b.opacity(1);
    const key = t.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    this.draw(t, X, show);
  }
  private dome(t: number, X: XSt): Dome {
    const d = X.diaphragm, jit = bump(t, W.spasming - 0.25, W.spasming + 0.55, 0.1) * 0.007 * Math.sin(t * 71) + 0.004 * bump(t, T_HIC - 0.05, T_HIC + 0.4, 0.06) * Math.sin(t * 60);
    const apex = lerp(-0.13, -0.207, d) + jit, edge = lerp(-0.205, -0.25, d) + jit * 0.5;
    return { apex, edge, ctrl: 2 * apex - edge, y: (x: number) => { const u = (x / 0.27 + 1) / 2; return (1 - u) * (1 - u) * edge + 2 * u * (1 - u) * (2 * apex - edge) + u * u * edge; } };
  }
  private draw(t: number, X: XSt, show: number) {
    const B = this.b, P = B.P, S = B.S, [g, q] = B.begin();
    const wy = B.wipe(show);
    const dome = this.dome(t, X);
    const ex = Math.max(0.75 * X.diaphragm, X.air), air = X.air;
    // ---- torso glass ----
    for (const [w, a] of [[90, 0.1], [50, 0.16], [24, 0.24]] as [number, number][]) { g.strokeStyle = `rgba(3,6,28,${a})`; g.lineWidth = w; g.stroke(this.torso); }
    const [cx, cy] = P(0, 0);
    const bg = g.createRadialGradient(cx, cy, 30, cx, cy, 0.42 * S);
    bg.addColorStop(0, "rgba(24,46,120,0.95)"); bg.addColorStop(0.75, "rgba(12,22,76,0.95)"); bg.addColorStop(1, "rgba(30,14,84,0.96)");
    g.fillStyle = bg; g.fill(this.torso);
    g.save(); g.clip(this.torso);
    g.strokeStyle = "rgba(120,200,255,0.08)"; g.lineWidth = 2;
    for (let x = 0; x < B.W; x += 0.04 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, B.H); g.stroke(); }
    for (let y = 0; y < B.H; y += 0.04 * S) { g.beginPath(); g.moveTo(0, y); g.lineTo(B.W, y); g.stroke(); }
    g.fillStyle = "rgba(180,235,255,0.045)";
    for (let y = (t * 70) % 16; y < B.H; y += 16) g.fillRect(0, y, B.W, 5);
    for (let y = 0.24; y > -0.38; y -= 0.045) { const [vx, vy] = P(0, y); g.fillStyle = "rgba(170,215,255,0.12)"; rrect(g, vx - 0.028 * S, vy - 0.016 * S, 0.056 * S, 0.032 * S, 10); g.fill(); } // spine
    this.drawLungs(g, q, t, dome, ex, air);
    for (let k = 0; k < 5; k++) { // ribs over the lungs
      const y = 0.11 - k * 0.058;
      for (const s of [-1, 1]) {
        const p0 = P(s * 0.02, y), c = P(s * 0.17, y + 0.035), p1 = P(s * 0.262, y - 0.07 - k * 0.006);
        g.beginPath(); g.moveTo(...p0); g.quadraticCurveTo(...c, ...p1);
        g.strokeStyle = "rgba(190,225,255,0.16)"; g.lineWidth = 20; g.stroke();
        g.strokeStyle = "rgba(235,248,255,0.22)"; g.lineWidth = 6; g.stroke();
      }
    }
    this.drawPipe(g, q, t, X);
    this.drawAir(g, q, t, X);
    this.drawDome(g, q, t, dome);
    const sh = g.createLinearGradient(0, P(0, 0.3)[1], 0, P(0, 0.05)[1]); // glass sheen
    sh.addColorStop(0, "rgba(255,255,255,0.1)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sh; g.fillRect(0, 0, B.W, B.H);
    g.restore();
    g.strokeStyle = "#69dcff"; g.lineWidth = 20; g.stroke(this.torso);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 6; g.stroke(this.torso);
    q.strokeStyle = "rgba(70,200,255,0.16)"; q.lineWidth = 56; q.stroke(this.torso);
    q.strokeStyle = "rgba(90,220,255,0.35)"; q.lineWidth = 20; q.stroke(this.torso);
    this.drawDoor(g, q, t, X);
    for (const c of [g, q]) { // fade the neck top (under the chin) and the waist out
      c.save(); c.globalCompositeOperation = "destination-out";
      const top = P(0, 0.36)[1], t1 = P(0, 0.245)[1], b0 = P(0, -0.33)[1], b1 = P(0, -0.4)[1];
      const lg = c.createLinearGradient(0, top, 0, t1); lg.addColorStop(0, "rgba(0,0,0,1)"); lg.addColorStop(0.35, "rgba(0,0,0,0.85)"); lg.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = lg; c.fillRect(0, top, B.W, t1 - top);
      const lb = c.createLinearGradient(0, b0, 0, b1); lb.addColorStop(0, "rgba(0,0,0,0)"); lb.addColorStop(1, "rgba(0,0,0,1)");
      c.fillStyle = lb; c.fillRect(0, b0, B.W, b1 - b0 + 2);
      c.restore();
    }
    this.drawEffects(g, q, t, dome);
    g.restore(); q.restore();
    if (show > 0.001 && show < 0.999) { // scan-wipe edge
      const a = Math.sin(Math.PI * show), lg = g.createLinearGradient(0, wy - 24, 0, wy + 24);
      lg.addColorStop(0, "rgba(140,240,255,0)"); lg.addColorStop(0.5, `rgba(230,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,240,255,0)");
      g.save(); g.clip(this.torso); g.fillStyle = lg; g.fillRect(0, wy - 24, B.W, 48); g.restore();
      q.save(); q.scale(GS, GS); q.clip(this.torso); q.fillStyle = `rgba(120,230,255,${0.8 * a})`; q.fillRect(0, wy - 9, B.W, 18); q.restore();
    }
    B.flush();
  }
  private lungPts(side: number, dome: Dome, ex: number, air: number, pts: P2[] = LUNG_R): P2[] {
    return pts.map(([x, y]) => {
      const sx = side * x * (1 + 0.075 * air);
      let yy = y - ex * 0.06 * clamp01((0.1 - y) / 0.26);
      yy = Math.max(yy, dome.y(sx) + 0.016);
      return [sx, yy];
    });
  }
  private drawLungs(g: Ctx, q: Ctx, t: number, dome: Dome, ex: number, air: number) {
    const P = this.b.P, S = this.b.S;
    const breathe = 1 + 0.015 * Math.sin(t * 3.1);
    for (const side of [-1, 1]) {
      const path = loopPath(crPts(this.lungPts(side, dome, ex, air).map(([x, y]) => P(x * breathe, y)), 8, true));
      const [lx, ly] = P(side * 0.13, -0.02);
      const lg = g.createRadialGradient(lx - side * 0.03 * S, ly - 0.05 * S, 10, lx, ly, 0.17 * S);
      lg.addColorStop(0, air > 0.3 ? "#ffd6e2" : "#ffc0d2"); lg.addColorStop(0.6, "#ff86a8"); lg.addColorStop(1, "#e2507e");
      g.globalAlpha = 0.93; g.fillStyle = lg; g.fill(path); g.globalAlpha = 1;
      g.save(); g.clip(path);
      if (air > 0.01) { // fresh air glow inside
        const ag = g.createRadialGradient(lx, ly, 0, lx, ly, 0.14 * S); ag.addColorStop(0, `rgba(230,250,255,${0.5 * air})`); ag.addColorStop(1, "rgba(200,240,255,0)");
        g.fillStyle = ag; g.fillRect(lx - 0.2 * S, ly - 0.2 * S, 0.4 * S, 0.4 * S);
      }
      g.strokeStyle = "rgba(255,240,246,0.75)"; g.lineWidth = 9;
      for (const br of TREE_R) strokePts(g, this.lungPts(side, dome, ex, air, br).map(([x, y]) => P(x * breathe, y)));
      g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.ellipse(lx - side * 0.04 * S, ly - 0.08 * S, 0.035 * S, 0.018 * S, side * 0.5, 0, TAU); g.fill();
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 11; g.stroke(path);
      g.strokeStyle = "#ffe3ec"; g.lineWidth = 4; g.stroke(path);
      q.save(); q.clip(this.torso); q.strokeStyle = `rgba(255,120,170,${0.12 + 0.2 * air})`; q.lineWidth = 16; q.stroke(path); q.restore();
    }
  }
  private drawPipe(g: Ctx, q: Ctx, t: number, X: XSt) {
    const P = this.b.P, S = this.b.S;
    const trach: P2[] = [P(0, 0.36), P(0, 0.04)];
    const bl: P2[] = crPts([[0, 0.07], [-0.035, 0.02], [-0.075, -0.012], [-0.1, -0.03]].map(([x, y]) => P(x, y)), 8, false);
    const mid = P(0, 0)[0], br: P2[] = bl.map(([x, y]) => [2 * mid - x, y]);
    const lay = (w: number, col: string) => { g.strokeStyle = col; g.lineWidth = w; strokePts(g, trach); g.lineWidth = w * 0.7; strokePts(g, bl); strokePts(g, br); };
    lay(PIPE_W * S + 14, INK);
    lay(PIPE_W * S, "#a9ecff");
    g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 7; // cartilage rings
    for (let y = 0.27; y > 0.06; y -= 0.024) { if (Math.abs(y - XL.door[1]) < 0.02) continue; const [x0, yy] = P(-PIPE_W / 2, y), [x1] = P(PIPE_W / 2, y); g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo((x0 + x1) / 2, yy + 9, x1, yy); g.stroke(); }
    lay(LUMEN_W * S, X.air > 0.05 && X.door < 0.5 ? "#1d4590" : "#152e6a");
    q.strokeStyle = `rgba(120,230,255,${0.12 + 0.2 * X.air * (1 - X.door)})`; q.lineWidth = 0.05 * S; strokePts(q, [P(0, 0.33), P(0, 0.21)]); strokePts(q, [P(0, 0.14), P(0, 0.04)]);
    if (X.air > 0.02 && X.door < 0.99) { // rushing speed dashes inside the windpipe
      g.save(); g.setLineDash([0.03 * S, 0.035 * S]); g.lineDashOffset = -t * 0.9 * S; g.lineWidth = 6; g.strokeStyle = `rgba(220,250,255,${0.7 * X.air * (1 - X.door)})`;
      for (const dx of [-0.014, 0.014]) strokePts(g, [P(dx, 0.33), P(dx, 0.06)]);
      g.restore();
    }
  }
  private drawAir(g: Ctx, q: Ctx, t: number, X: XSt) {
    if (X.air < 0.01) return;
    const t0 = W.gasp - 0.1, T = 0.6, dt = 0.036, tArrive = this.uDoor * T;
    for (let k = 0; ; k++) {
      const s = t0 + k * dt;
      if (s > t || s > T_CLOSE + 0.35) break;
      const path = k % 2 ? this.airR : this.airL;
      let u = (t - s) / T, a = 1;
      if (s + tArrive > T_CLOSE) { // piles up on the shut door, bounces back and fades
        const arr = Math.max(s + tArrive, T_CLOSE), da = t - arr;
        if (da > 0) { const st = (k % 5) * 0.012; u = this.uDoor - 0.03 - st - 0.06 * Math.abs(Math.sin(da * 9)) * Math.exp(-da * 4); a = 1 - smooth((da - 0.5) / 0.5); }
      } else a = 1 - smooth((u - 0.82) / 0.18);
      if (u > 1 || a < 0.01) continue;
      const e = polyAt(path, u), wob = Math.sin(k * 2.3 + t * 9) * 4;
      const fade = a * X.air * Math.min(1, u * 8);
      g.save(); g.globalAlpha = fade; g.translate(e.x + wob, e.y); g.rotate(e.a);
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, 0, 17, 8.5, 0, 0, TAU); g.fill(); g.restore();
      q.save(); q.globalAlpha = 0.6 * fade; blob(q, e.x, e.y, 26, "rgba(200,250,255,1)", "rgba(120,230,255,0)"); q.restore();
    }
  }
  private drawDome(g: Ctx, q: Ctx, t: number, D: Dome) {
    const P = this.b.P, S = this.b.S;
    const a = P(-0.27, D.edge), c = P(0, D.ctrl), b = P(0.27, D.edge);
    const curve = new Path2D(); curve.moveTo(...a); curve.quadraticCurveTo(...c, ...b);
    const sp = bump(t, W.spasming - 0.25, W.spasming + 0.55, 0.1);
    g.strokeStyle = INK; g.lineWidth = 0.044 * S + 14; g.stroke(curve);
    const pg = g.createLinearGradient(0, P(0, D.apex + 0.03)[1], 0, P(0, D.edge - 0.02)[1]);
    pg.addColorStop(0, sp > 0.2 ? "#ffa0c8" : "#ff7ab2"); pg.addColorStop(1, "#e83d86");
    g.strokeStyle = pg; g.lineWidth = 0.044 * S; g.stroke(curve);
    g.strokeStyle = "rgba(150,20,70,0.5)"; g.lineWidth = 5; // muscle striations
    for (let k = 1; k < 18; k++) {
      const u = k / 18, x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0], y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1];
      const dx = 2 * (1 - u) * (c[0] - a[0]) + 2 * u * (b[0] - c[0]), dy = 2 * (1 - u) * (c[1] - a[1]) + 2 * u * (b[1] - c[1]), n = Math.hypot(dx, dy);
      const nx = -dy / n, ny = dx / n, h = 0.014 * S;
      g.beginPath(); g.moveTo(x - nx * h + (dx / n) * 6, y - ny * h + (dy / n) * 6); g.lineTo(x + nx * h - (dx / n) * 6, y + ny * h - (dy / n) * 6); g.stroke();
    }
    g.save(); g.translate(0, -0.011 * S); g.strokeStyle = "rgba(255,235,245,0.85)"; g.lineWidth = 6; g.stroke(curve); g.restore();
    q.save(); q.clip(this.torso); q.strokeStyle = `rgba(255,90,170,${0.18 + 0.4 * sp})`; q.lineWidth = 0.05 * S; q.stroke(curve); q.restore();
    if (sp > 0.01) { // SPASM: zaps at both ends
      for (const s of [-1, 1]) {
        const fr = Math.floor(t * 18), [zx, zy] = P(s * 0.2, D.y(s * 0.2) - 0.035), pts: P2[] = [];
        for (let k = 0; k < 5; k++) pts.push([zx - s * 0.03 * S + s * k * 0.016 * S, zy - 0.02 * S + (k % 2 ? -1 : 1) * (0.016 + 0.005 * ((fr + k) % 3)) * S]);
        g.save(); g.globalAlpha = sp; g.strokeStyle = INK; g.lineWidth = 15; strokePts(g, pts); g.strokeStyle = "#fff36a"; g.lineWidth = 7; strokePts(g, pts); g.restore();
        star(g, ...P(s * 0.25, D.edge + 0.02), 22 * sp, sp, "#fffbd0", t * 5 + s);
      }
    }
    const dn = bump(t, W.spasming - 0.25, W.gasp + 0.4, 0.18); // down arrows under the dome
    for (const s of [-1, 1]) {
      const [ax, ay] = P(s * 0.205, D.y(s * 0.205) - 0.045 - 0.02 * cyc(t * 2.2));
      fatArrow(g, ax, ay, Math.PI / 2, 0.036 * S, "#ffffff", dn * (0.6 + 0.4 * Math.sin(Math.PI * cyc(t * 2.2))));
    }
  }
  private drawDoor(g: Ctx, q: Ctx, t: number, X: XSt) {
    const P = this.b.P, S = this.b.S, [hx, hy] = P(...XL.hinge);
    const flash = Math.max(bump(t, T_CLOSE - 0.02, T_CLOSE + 0.1, 0.06), bump(t, T_HIC - 0.02, T_HIC + 0.12, 0.06));
    door(g, q, hx, hy, DOOR_LEN * S, DOOR_TH * S, -doorAngle(t, X.door), flash);
  }
  private drawEffects(g: Ctx, q: Ctx, t: number, D: Dome) {
    const P = this.b.P, S = this.b.S;
    for (const [t0, k0] of [[T_CLOSE, 1], [T_HIC, 1.25]] as [number, number][]) { // impact lines round the slammed door
      const d = t - t0;
      if (d < 0 || d > 0.5) continue;
      const a = 1 - d / 0.5, [dx, dy] = P(0.0, XL.door[1]);
      for (let k = 0; k < 8; k++) {
        const an = (k / 8) * TAU + 0.2, r0 = (0.055 + 0.07 * glide(d / 0.35)) * S * k0, r1 = r0 + 0.03 * S * a;
        g.save(); g.globalAlpha = a; g.beginPath(); g.moveTo(dx + Math.cos(an) * r0, dy + Math.sin(an) * r0); g.lineTo(dx + Math.cos(an) * r1, dy + Math.sin(an) * r1);
        g.strokeStyle = INK; g.lineWidth = 13; g.stroke(); g.strokeStyle = "#fff1a0"; g.lineWidth = 6; g.stroke(); g.restore();
      }
      q.save(); q.globalAlpha = 0.5 * a; blob(q, dx, dy, 0.06 * S * k0, "rgba(255,220,150,1)", "rgba(255,150,60,0)"); q.restore();
    }
    const dh = t - T_HIC;
    if (dh > 0 && dh < 1.4) { // HIC sound rings
      const [dx, dy] = P(0, XL.door[1]);
      for (let k = 0; k < 3; k++) {
        const u = dh / 0.9 - k * 0.18;
        if (u <= 0 || u >= 1) continue;
        const r = (0.06 + 0.2 * glide(u)) * S, a = 1 - u;
        g.save(); g.globalAlpha = a; g.beginPath(); g.arc(dx, dy, r, Math.PI * 0.95, Math.PI * 1.75);
        g.strokeStyle = INK; g.lineWidth = 15; g.stroke(); g.strokeStyle = "#ffe36a"; g.lineWidth = 8; g.stroke(); g.restore();
      }
    }
    const dk = smooth((t - (W.diaphragm - 0.15)) / 0.3), T2 = XL.diaTag;
    { const [x, y] = P(...T2.c); pill(g, null, x, y, T2.w * S, T2.h * S, "#ff4f9a", "DIAPHRAGM", dk, t, P(0, D.edge - 0.045)); }
    const tk = smooth((t - (W.throat - 0.15)) / 0.3), T3 = XL.doorTag;
    { const [x, y] = P(...T3.c); pill(g, null, x, y, T3.w * S, T3.h * S, "#ff7a2e", "THROAT DOOR", tk, t, P(0.04, XL.door[1] - 0.01), "#ffffff", 0.5); }
    const ds = t - T_CLOSE; // SLAM!
    if (ds > -0.02 && ds < 0.95) {
      const k = back(clamp01(ds / 0.16)) * (1 - smooth((ds - 0.75) / 0.2)), [x, y] = P(...XL.slam);
      if (k > 0.01) {
        g.save(); g.translate(x, y); g.scale(k, k); g.rotate(-0.12);
        burst(g, 0, 0, 0.075 * S, "#ffffff", "#ffb03a", 0.1, 12, 3);
        text(g, "SLAM!", 0, 2, 0.042 * S, "#ff5a1f", INK, 0.22);
        g.restore();
      }
    }
    if (dh > -0.02) { // the big HIC!
      const k = back(clamp01(dh / 0.2)), [x, y] = P(...XL.hic), wob = 0.06 * Math.sin(dh * 16) * Math.exp(-dh * 3);
      g.save(); g.translate(x, y); g.scale(k, k); g.rotate(-0.1 + wob);
      burst(g, 0, 0, 0.11 * S, "#fff36a", "#ff8a1f", 0.05 + 0.04 * Math.sin(t * 7), 16, 7);
      text(g, "HIC!", 0, 4, 0.08 * S, "#ff2d55", INK, 0.24);
      g.restore();
    }
  }
}

// ============================== 2. shot-3 GILLS DIAGRAM ==============================
const TL = TADPOLE_LAYOUT;
const LANES: P2[][] = [
  [[0.64, 0.04], [0.5, 0.0], [0.36, -0.02], [0.22, -0.015], [0.1, 0.04], [0.0, 0.12], [-0.07, 0.22], [-0.12, 0.34]],
  [[0.64, -0.06], [0.5, -0.055], [0.36, -0.05], [0.2, -0.045], [0.07, 0.0], [-0.04, 0.08], [-0.13, 0.18], [-0.2, 0.3]],
  [[0.62, -0.15], [0.49, -0.115], [0.36, -0.08], [0.2, -0.075], [0.05, -0.04], [-0.07, 0.03], [-0.18, 0.12], [-0.27, 0.24]],
];
const LUNG_PIPE: P2[] = [[0.205, -0.055], [0.175, -0.075], [0.14, -0.108], [0.11, -0.14]];
const T_SNAP = W.shut2 - 0.06;

class GillHolo {
  b = new Board(TL.box, 1500, 30);
  private lastKey = "";
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const T = tadpoleAt(id, t), fade = 1 - smooth(morphAt(f) / 0.45);
    const show = id === 3 ? Math.max(T.gulp, T.snap, T.flow) * fade : 0;
    this.b.group.visible = show > 0.002;
    if (!this.b.group.visible) return;
    const p = tadpolePose(id, t);
    if (p.dir !== this.b.dir) { this.b.setDir(p.dir); this.lastKey = ""; }
    const F = frameFrom(p.pos, cam.position);
    this.b.group.position.set(...toW(F, 0, 0, GILL_D * p.scale)); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.group.scale.setScalar(p.scale);
    this.b.opacity(fade);
    const key = t.toFixed(4) + p.dir;
    if (key === this.lastKey) return;
    this.lastKey = key;
    this.draw(t, T);
  }
  private draw(t: number, T: ReturnType<typeof tadpoleAt>) {
    const B = this.b, P = B.P, S = B.S, [g, q] = B.begin();
    const lanes = LANES.map((l) => poly(l.map(([x, y]) => P(x, y))));
    const rv = Math.max(0.36 * T.gulp, 0.36 + 0.64 * glide(T.flow));
    const inK = T.gulp;
    lanes.forEach((L, i) => { // water ribbons
      if (inK < 0.01) return;
      const pts = polySub(L, 0, rv), a = inK;
      g.save(); g.globalAlpha = a;
      g.strokeStyle = "rgba(10,13,46,0.55)"; g.lineWidth = 0.05 * S + 10; strokePts(g, pts);
      g.strokeStyle = "rgba(70,180,255,0.55)"; g.lineWidth = 0.05 * S; strokePts(g, pts);
      g.setLineDash([0.025 * S, 0.04 * S]); g.lineDashOffset = -t * 0.35 * S - i * 30; g.strokeStyle = "rgba(225,248,255,0.85)"; g.lineWidth = 7; strokePts(g, pts); g.setLineDash([]);
      g.restore();
      q.save(); q.globalAlpha = 0.45 * a; q.strokeStyle = "rgba(60,170,255,1)"; q.lineWidth = 0.07 * S; strokePts(q, pts); q.restore();
      for (let k = 0; k < 7; k++) { // chevrons riding the flow
        const u = cyc(k / 7 + t * 0.42 + i * 0.05);
        if (u > rv - 0.02) continue;
        const e = polyAt(L, u), fa = a * Math.min(1, u * 10, (rv - u) * 14);
        this.chevron(g, e.x, e.y, e.a, 0.026 * S, fa);
      }
      if (rv > 0.05) { const e = polyAt(L, rv); fatArrow(g, e.x, e.y, e.a, 0.036 * S, "#4fc3ff", a); }
    });
    const gk = smooth((t - (W.gills - 0.15)) / 0.3) * T.flow;
    if (T.flow > 0.6) { // gill outflow sparkle
      const [gx, gy] = P(...TL.gills);
      for (let k = 0; k < 4; k++) { const u = cyc(t * 1.4 + k / 4), a = Math.sin(Math.PI * u) * smooth((T.flow - 0.6) / 0.4); star(g, gx - u * 0.12 * S * B.dir + k * 6, gy + u * 0.16 * S - k * 10, 14 + 8 * (k % 2), a, "#e8fbff", t * 3 + k); }
      q.save(); q.globalAlpha = 0.5 * T.flow; blob(q, gx, gy, 0.1 * S, "rgba(120,220,255,1)", "rgba(60,170,255,0)"); q.restore();
    }
    { const G2 = TL.gillTag, [x, y] = P(...G2.c); pill(g, q, x, y, G2.w * S, G2.h * S, "#2aa8ff", "GILLS", gk, t, P(TL.gills[0] - 0.04, TL.gills[1])); }
    this.drawInset(g, q, t, T);
    g.restore(); q.restore();
    B.flush();
  }
  private chevron(g: Ctx, x: number, y: number, a: number, s: number, alpha: number) {
    if (alpha < 0.01) return;
    g.save(); g.globalAlpha = alpha; g.translate(x, y); g.rotate(a);
    g.beginPath(); g.moveTo(-s * 0.6, -s * 0.8); g.lineTo(s * 0.5, 0); g.lineTo(-s * 0.6, s * 0.8);
    g.strokeStyle = INK; g.lineWidth = s * 0.62; g.stroke(); g.strokeStyle = "#7fd6ff"; g.lineWidth = s * 0.34; g.stroke();
    g.restore();
  }
  private drawInset(g: Ctx, q: Ctx, t: number, T: ReturnType<typeof tadpoleAt>) {
    const P = this.b.P, S = this.b.S;
    const k = smooth((t - (W.gulp + 0.05)) / 0.35);
    if (k < 0.01) return;
    const [cx, cy] = P(...TL.inset.c), sc = back(k), R = TL.inset.r * S * sc, zk = 1.3; // contents drawn 1.3x round the inset centre
    const circ = new Path2D(); circ.arc(cx, cy, R, 0, TAU);
    const [ox, oy] = P(0.1, -0.15); // the content's own centre
    const tr = (p: P2): P2 => [cx + (p[0] - ox) * sc * zk, cy + (p[1] - oy) * sc * zk];
    g.save(); g.globalAlpha = smooth(k * 2);
    g.strokeStyle = "rgba(3,6,28,0.25)"; g.lineWidth = 40; g.stroke(circ);
    const bg = g.createRadialGradient(cx, cy - R * 0.3, 10, cx, cy, R);
    bg.addColorStop(0, "rgba(28,52,128,0.95)"); bg.addColorStop(1, "rgba(12,20,72,0.96)");
    g.fillStyle = bg; g.fill(circ);
    g.save(); g.clip(circ);
    g.strokeStyle = "rgba(120,200,255,0.1)"; g.lineWidth = 2;
    for (let x = cx - R; x < cx + R; x += 0.03 * S) { g.beginPath(); g.moveTo(x, cy - R); g.lineTo(x, cy + R); g.stroke(); }
    for (let y = cy - R; y < cy + R; y += 0.03 * S) { g.beginPath(); g.moveTo(cx - R, y); g.lineTo(cx + R, y); g.stroke(); }
    const pp = crPts(LUNG_PIPE.map(([x, y]) => P(x, y)), 8, false).map(tr); // the lung pipe
    g.strokeStyle = INK; g.lineWidth = 0.04 * S * sc * zk + 10; strokePts(g, pp);
    g.strokeStyle = "#a9ecff"; g.lineWidth = 0.04 * S * sc * zk; strokePts(g, pp);
    g.strokeStyle = "#152e6a"; g.lineWidth = 0.024 * S * sc * zk; strokePts(g, pp);
    const dry = T.dry, [lx, ly] = tr(P(...TL.lungs)), fork = tr(P(0.11, -0.14)); // two little lungs
    for (const s of [-1, 1]) { const e: P2 = [lx + s * 0.028 * S * sc * zk, ly - 0.035 * S * sc * zk]; g.strokeStyle = INK; g.lineWidth = 0.018 * S * sc * zk + 6; strokePts(g, [fork, e]); g.strokeStyle = "#a9ecff"; g.lineWidth = 0.018 * S * sc * zk; strokePts(g, [fork, e]); }
    for (const s of [-1, 1]) {
      const x = lx + s * 0.034 * S * sc * zk, y = ly, rx = 0.03 * S * sc * zk, ry = 0.046 * S * sc * zk;
      const lg = g.createRadialGradient(x - s * rx * 0.3, y - ry * 0.4, 2, x, y, ry * 1.1);
      lg.addColorStop(0, "#ffd0de"); lg.addColorStop(1, "#ff6f99");
      g.fillStyle = lg; g.beginPath(); g.ellipse(x, y, rx, ry, -s * 0.18, 0, TAU); g.fill();
      g.strokeStyle = dry > 0.5 ? "#3ee07a" : INK; g.lineWidth = 8; g.stroke();
      g.fillStyle = "rgba(255,255,255,0.45)"; g.beginPath(); g.ellipse(x - s * rx * 0.25, y - ry * 0.45, rx * 0.35, ry * 0.18, -s * 0.3, 0, TAU); g.fill();
    }
    const lp = poly(pp), uD = nearestU(lp, tr(P(...TL.door))), ds = t - T_SNAP;
    for (let i = 0; i < 4; i++) { // water drops creeping toward the lungs (gulp), knocked back by the snap
      const s0 = W.gulp + 0.1 + i * 0.28;
      if (t < s0) continue;
      let u = Math.min(uD - 0.1 - i * 0.05, (t - s0) * 0.35), a = Math.min(1, (t - s0) * 5);
      if (ds > 0) { u -= 0.5 * glide(ds / 0.4); a *= 1 - smooth(ds / 0.45); }
      if (a < 0.01 || u < 0) continue;
      const e = polyAt(lp, u);
      g.save(); g.globalAlpha = a; g.translate(e.x, e.y); g.rotate(e.a + Math.PI / 2);
      g.fillStyle = "#4fc3ff"; g.strokeStyle = INK; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, 14); g.quadraticCurveTo(10, -2, 0, -9); g.quadraticCurveTo(-10, -2, 0, 14); g.fill(); g.stroke(); g.restore();
    }
    // the throat door on the lung pipe: open = along the pipe wall, SNAP = across it
    const a0 = lp.pts[0], a1 = lp.pts[lp.pts.length - 1], al = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
    const along: P2 = [(a1[0] - a0[0]) / al, (a1[1] - a0[1]) / al], across: P2 = [-along[1], along[0]];
    const [dx, dy] = tr(P(...TL.door)), half = 0.022 * S * sc * zk;
    const hx = dx - across[0] * half, hy = dy - across[1] * half;
    const aClosed = Math.atan2(across[1], across[0]), aOpen = Math.atan2(along[1], along[0]);
    let ang = lerp(aOpen, aClosed, T.snap);
    if (ds > 0) ang += 0.3 * Math.sin(ds * 32) * Math.exp(-ds * 7);
    door(g, q, hx, hy, half * 2.05, 0.017 * S * sc * zk, ang, bump(t, T_SNAP - 0.02, T_SNAP + 0.12, 0.06));
    g.restore();
    g.strokeStyle = "#69dcff"; g.lineWidth = 12; g.stroke(circ);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 4; g.stroke(circ);
    g.restore();
    q.save(); q.globalAlpha = k; q.strokeStyle = "rgba(90,220,255,0.4)"; q.lineWidth = 26; q.stroke(circ); q.restore();
    if (ds > -0.02 && ds < 0.9) { // SNAP! burst + ring
      const kk = back(clamp01(ds / 0.15)) * (1 - smooth((ds - 0.7) / 0.2)), [sx, sy] = P(0.36, -0.2);
      if (kk > 0.01) {
        g.save(); g.translate(sx, sy); g.scale(kk, kk); g.rotate(0.1);
        burst(g, 0, 0, 0.085 * S, "#ffffff", "#ff9a3a", 0, 12, 5);
        text(g, "SNAP!", 0, 2, 0.048 * S, "#ff5a1f", INK, 0.22);
        g.restore();
      }
      const ra = 1 - clamp01(ds / 0.5);
      if (ra > 0 && ds > 0) { g.save(); g.globalAlpha = ra; g.strokeStyle = "#fff1a0"; g.lineWidth = 8; g.beginPath(); g.arc(dx, dy, (0.03 + 0.06 * glide(ds / 0.5)) * S, 0, TAU); g.stroke(); g.restore(); }
      q.save(); q.globalAlpha = Math.max(0, ra); blob(q, dx, dy, 0.08 * S, "rgba(255,210,140,1)", "rgba(255,150,60,0)"); q.restore();
    }
    if (T.dry > 0.01) { // check-mark DRY badge
      const D2 = TL.dryTag, [x, y] = P(...D2.c), w = D2.w * S, h = D2.h * S, s = back(T.dry);
      const ix = cx - R * 0.98 * this.b.dir, iy = cy + R * 0.05;
      g.save(); g.globalAlpha = smooth(T.dry * 1.6); g.lineCap = "round";
      g.beginPath(); g.moveTo(x, y); g.lineTo(ix, iy); g.strokeStyle = INK; g.lineWidth = h * 0.24; g.stroke(); g.strokeStyle = "#3ee07a"; g.lineWidth = h * 0.11; g.stroke();
      g.restore();
      g.save(); g.translate(x, y); g.scale(s, s); g.rotate(-0.05);
      const pad = h * 0.13;
      g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, h / 2 + pad); g.fill();
      g.fillStyle = "#3ee07a"; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
      g.fillStyle = "rgba(255,255,255,0.32)"; rrect(g, -w / 2 + h * 0.3, -h / 2 + h * 0.1, w - h * 0.6, h * 0.26, h * 0.13); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(-w / 2 + h * 0.5, 0, h * 0.36, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = h * 0.07; g.stroke();
      check(g, -w / 2 + h * 0.5, 0, h * 0.42, "#21c15e", smooth((T.dry - 0.3) / 0.6));
      text(g, "DRY", h * 0.42, h * 0.04, h * 0.58, "#ffffff", INK, 0.26);
      g.restore();
      for (let i = 0; i < 3; i++) { const u = cyc(t * 0.9 + i / 3); star(g, lx + (i - 1) * 0.05 * S, ly - 0.06 * S - u * 0.05 * S, 16, T.dry * Math.sin(Math.PI * u), "#d8ffe6", t * 2 + i); }
      q.save(); q.globalAlpha = 0.4 * T.dry; blob(q, lx, ly, 0.08 * S, "rgba(120,255,170,1)", "rgba(60,255,140,0)"); q.restore();
    }
  }
}

// ============================== 3. shot-5 HIC-O-METER ==============================
const DR = 0.085, DWID = 0.056, PITCH = 0.064, COMMA = 0.03, WIN = 0.038, FRONT0 = 0.078, FRONT1 = 0.1, HW = 0.37, HH = 0.165;
const DRUM_X: number[] = (() => { const out: number[] = []; let x = -0.318; for (let i = 0; i < 9; i++) { out.push(x + PITCH / 2); x += PITCH; if (i === 2 || i === 5) x += COMMA; } return out; })();
const OSB_HICS = HICS.filter((h) => h[1] === "osborne");
/** what the drums show: the time-lapse ticks the low drums, then the roll to 430,000,000 */
const odoValue = (id: number, t: number) => {
  const O = osborneAt(id, t);
  return Math.max(O.count, Math.floor(Math.pow(O.age, 1.3) * 9000));
};
/** drum i (0 = most significant) position in digits, with odometer carries */
const drumDigit = (v: number, i: number) => {
  const p = Math.pow(10, 8 - i), d = Math.floor(v / p) % 10;
  if (p === 1) return d;
  const r = (v % p) / p;
  return d + smooth((r * 10 - 9.0) / 1.0);
};
const tallyAt = (id: number, t: number) => {
  const O = osborneAt(id, t);
  let n = Math.floor(O.age * 46);
  for (const h of OSB_HICS) if (t >= h[0]) n += 1;
  return Math.min(60, n);
};
const drumTex = (blur: number) => ctex("hiccupDrum" + blur, 2048, 256, (g) => {
  g.fillStyle = "#f6ecd2"; g.fillRect(0, 0, 2048, 256);
  const cell = 204.8, spread = [0, 0.18, 0.4, 0.75][blur], n = [1, 5, 9, 15][blur];
  for (let d = 0; d < 10; d++) {
    for (let j = 0; j < n; j++) {
      const off = n === 1 ? 0 : (j / (n - 1) - 0.5) * 2 * spread * cell;
      for (const wrap of [0, -2048, 2048]) {
        const cx = (d + 0.5) * cell + off + wrap;
        if (cx < -cell || cx > 2048 + cell) continue;
        g.save(); g.translate(cx, 128); g.rotate(-Math.PI / 2); g.globalAlpha = blur ? Math.min(1, 1.6 / n) : 1;
        g.font = `900 176px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#16120c";
        g.fillText(String(d), 0, 10);
        g.restore();
      }
    }
  }
  const gr = g.createLinearGradient(0, 0, 0, 256); // edge shading along the axis
  gr.addColorStop(0, "rgba(120,90,40,0.45)"); gr.addColorStop(0.12, "rgba(120,90,40,0)"); gr.addColorStop(0.88, "rgba(120,90,40,0)"); gr.addColorStop(1, "rgba(120,90,40,0.45)");
  g.globalAlpha = 1; g.fillStyle = gr; g.fillRect(0, 0, 2048, 256);
});
const plaqueTex = () => ctex("hiccupPlaque", 1024, 160, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "#26201a"); gr.addColorStop(1, "#0e0b08");
  g.fillStyle = gr; rrect(g, 0, 0, 1024, 160, 40); g.fill();
  g.strokeStyle = "#e9b949"; g.lineWidth = 10; rrect(g, 14, 14, 996, 132, 30); g.stroke();
  g.font = `900 104px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  const tg = g.createLinearGradient(0, 30, 0, 130); tg.addColorStop(0, "#fff1b8"); tg.addColorStop(0.5, "#f2c14e"); tg.addColorStop(1, "#b77b16");
  g.fillStyle = tg; g.fillText("HIC-O-METER", 512, 86);
});
const glintTex = () => ctex("hiccupGlint", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
});
const sparkTex = () => ctex("hiccupSpark", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 22); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = "#fff";
  g.beginPath(); g.moveTo(4, 64); g.quadraticCurveTo(64, 60, 124, 64); g.quadraticCurveTo(64, 68, 4, 64); g.fill();
  g.beginPath(); g.moveTo(64, 4); g.quadraticCurveTo(68, 64, 64, 124); g.quadraticCurveTo(60, 64, 64, 4); g.fill();
});

class Odometer {
  group = new THREE.Group(); private body = new THREE.Group();
  private drums: THREE.Mesh[] = []; private drumMats: THREE.MeshLambertMaterial[] = [];
  private blurTex: THREE.CanvasTexture[] = [0, 1, 2, 3].map((b) => drumTex(b));
  private crank = new THREE.Group();
  private tally = new Plane(1536, 192); private tallyLast = -1;
  private glint: THREE.Mesh; private sparks: THREE.Sprite[] = []; private flash: THREE.Sprite;
  constructor() {
    for (const tx of this.blurTex) tx.anisotropy = 8;
    const brass = twoTone(new THREE.MeshPhongMaterial({ color: "#ffc650", specular: "#fff3c8", shininess: 55, emissive: new THREE.Color(0.1, 0.065, 0.015) }));
    const brassDk = twoTone(new THREE.MeshPhongMaterial({ color: "#dc9632", specular: "#ffe0a0", shininess: 40, emissive: new THREE.Color(0.07, 0.04, 0.01) }));
    const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const frame: THREE.BufferGeometry[] = [ // front frame round the drum window
      box(-HW, HW, WIN, HH, FRONT0, FRONT1), box(-HW, HW, -HH, -WIN, FRONT0, FRONT1),
      box(-HW, -0.318, -WIN, WIN, FRONT0, FRONT1), box(0.318, HW, -WIN, WIN, FRONT0, FRONT1),
    ];
    const seps: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 8; i++) seps.push(box(DRUM_X[i] + DWID / 2, DRUM_X[i + 1] - DWID / 2, -WIN, WIN, FRONT0 - 0.004, FRONT1 - 0.006));
    const housing = [box(-HW + 0.01, HW - 0.01, -HH + 0.01, HH - 0.01, -0.07, 0.07), // housing + rounded top roll + base lip
      new THREE.CylinderGeometry(0.045, 0.045, 2 * HW + 0.02, 28).rotateZ(Math.PI / 2).translate(0, HH, -0.005),
      box(-HW - 0.02, HW + 0.02, -HH - 0.03, -HH + 0.005, -0.085, 0.115)];
    const mk = (geo: THREE.BufferGeometry, m: THREE.Material) => { const me = new THREE.Mesh(geo, m); me.frustumCulled = false; this.body.add(me); return me; };
    const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);
    mk(merge(frame), brass);
    mk(merge([...housing, ...seps]), brassDk);
    const riv: THREE.BufferGeometry[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) riv.push(new THREE.SphereGeometry(0.011, 12, 8).translate(sx * 0.345, sy > 0 ? 0.13 : -0.142, FRONT1));
    mk(merge(riv), brass);
    const commas: THREE.BufferGeometry[] = [];
    for (const i of [2, 5]) {
      const cx = (DRUM_X[i] + DRUM_X[i + 1]) / 2;
      commas.push(new THREE.SphereGeometry(0.0085, 12, 8).translate(cx, -0.022, FRONT1 + 0.002));
      commas.push(new THREE.CylinderGeometry(0.004, 0.0015, 0.018, 8).rotateZ(-0.5).translate(cx - 0.004, -0.034, FRONT1 + 0.002));
    }
    mk(merge(commas), twoTone(new THREE.MeshLambertMaterial({ color: "#1a120a" })));
    // drums (axis x); rotation.x = -2 pi (digit + 0.5) / 10 puts that digit in the window
    const dgeo = new THREE.CylinderGeometry(DR, DR, DWID, 48, 1, true).rotateZ(-Math.PI / 2);
    for (let i = 0; i < 9; i++) {
      const m = twoTone(new THREE.MeshLambertMaterial({ map: this.blurTex[0], emissive: new THREE.Color(0.16, 0.13, 0.08), side: THREE.DoubleSide }));
      const d = mk(dgeo, m); d.position.set(DRUM_X[i], 0, 0); this.drums.push(d); this.drumMats.push(m);
    }
    const plq = mk(new THREE.PlaneGeometry(0.4, 0.0625), twoTone(new THREE.MeshLambertMaterial({ map: plaqueTex(), alphaTest: 0.5, emissive: new THREE.Color(0.25, 0.2, 0.12) })));
    plq.position.set(0, 0.1, FRONT1 + 0.003);
    this.tally.tex.anisotropy = 8;
    const tp = mk(new THREE.PlaneGeometry(0.6, 0.075), twoTone(new THREE.MeshLambertMaterial({ map: this.tally.tex, emissive: new THREE.Color(0.22, 0.2, 0.16) })));
    tp.position.set(0, -0.098, FRONT1 + 0.003);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 16).rotateZ(Math.PI / 2).translate(0.025, 0, 0), brassDk); // crank
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.09, 0.018).translate(0.05, 0.04, 0), brass);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.04, 16).rotateZ(Math.PI / 2).translate(0.075, 0.075, 0), twoTone(new THREE.MeshLambertMaterial({ color: "#c43a2a" })));
    for (const me of [axle, arm, knob]) { me.frustumCulled = false; this.crank.add(me); }
    this.crank.position.set(HW, 0, 0); this.body.add(this.crank);
    this.glint = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.34), new THREE.MeshBasicMaterial({ map: glintTex(), color: new THREE.Color(2.6, 2.1, 1.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    this.glint.rotation.z = -0.45; this.glint.layers.set(NOINK); this.glint.frustumCulled = false; this.glint.renderOrder = 20; this.body.add(this.glint);
    const sm = new THREE.SpriteMaterial({ map: sparkTex(), color: new THREE.Color(3, 2.5, 1.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false });
    for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(sm.clone()); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 21; this.body.add(s); this.sparks.push(s); }
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex(), color: new THREE.Color(1.6, 1.2, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false }));
    this.flash.layers.set(NOINK); this.flash.frustumCulled = false; this.flash.renderOrder = 19; this.body.add(this.flash);
    this.group.add(this.body); this.group.visible = false;
  }
  update(id: number, t: number, cam: THREE.Camera) {
    const O = osborneAt(id, t), show = id === 5 ? O.show : 0;
    this.group.visible = show > 0.002;
    if (!this.group.visible) return;
    const p = odoPos(id, t), F = frameFrom(p, cam.position);
    let jy = 0, jr = 0; // jolts on every Osborne hic
    for (const h of OSB_HICS) { const d = t - h[0]; if (d > 0 && d < 1.2) { const e = Math.exp(-d * 6) * h[2]; jy += 0.05 * e * Math.sin(d * 26); jr += 0.07 * e * Math.sin(d * 21 + 1); } }
    const drop = 1 - glide(show); // drops in from above with a bounce
    this.group.position.set(p[0], p[1] + 0.5 * drop * drop + jy + 0.008 * Math.sin(t * 1.7), p[2]);
    this.group.rotation.set(-0.06 + 0.04 * Math.sin(t * 1.1), F.yaw + 0.05 * Math.sin(t * 0.8), jr + 0.25 * drop);
    this.group.scale.setScalar(ODO_SCALE * (0.6 + 0.4 * back(show)));
    const v = odoValue(id, t), v0 = odoValue(id, t - 1 / FPS);
    for (let i = 0; i < 9; i++) {
      const dig = drumDigit(v, i), sp = Math.abs(v - v0) / Math.pow(10, 8 - i);
      this.drums[i].rotation.x = (-TAU * (dig + 0.5)) / 10;
      const lvl = sp < 0.12 ? 0 : sp < 0.35 ? 1 : sp < 0.9 ? 2 : 3;
      if (this.drumMats[i].map !== this.blurTex[lvl]) this.drumMats[i].map = this.blurTex[lvl];
    }
    this.crank.rotation.x = -(t - W.kept) * 5 - 60 * glide(clamp01((t - (W.million - 0.9)) / 1.1));
    const n = tallyAt(id, t);
    if (n !== this.tallyLast) { this.tallyLast = n; this.drawTally(n); }
    const gu = (t - (W.million + 0.15)) / 0.45; // the finish: glint sweep + sparkles + warm flash on "hics"
    this.glint.visible = gu > 0 && gu < 1;
    if (this.glint.visible) { this.glint.position.set(lerp(-0.45, 0.45, gu), 0, FRONT1 + 0.03); (this.glint.material as THREE.MeshBasicMaterial).opacity = Math.sin(Math.PI * gu); }
    const fk = bump(t, W.hics - 0.05, W.hics + 0.5, 0.12);
    this.flash.visible = fk > 0.01;
    if (this.flash.visible) { this.flash.position.set(0, 0, FRONT1 + 0.05); this.flash.scale.setScalar(0.9 * fk); this.flash.material.opacity = 0.6 * fk; }
    this.sparks.forEach((s, i) => {
      const u = (t - (W.hics - 0.1) - i * 0.07) / 0.9, a = u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0;
      s.visible = a > 0.01;
      if (!s.visible) return;
      const h = Math.sin(i * 91.7) * 43758.5, j = h - Math.floor(h), x = -0.36 + 0.72 * ((i * 0.37 + j * 0.3) % 1), y = (i % 2 ? 1 : -1) * (0.05 + 0.1 * j);
      s.position.set(x, y + 0.04 * u, FRONT1 + 0.04); s.scale.setScalar(0.06 + 0.06 * a); s.material.rotation = u * 2 + i; s.material.opacity = a;
    });
  }
  private drawTally(n: number) {
    const g = this.tally.g, Wd = 1536, Hd = 192;
    g.setTransform(1, 0, 0, 1, 0, 0);
    const gr = g.createLinearGradient(0, 0, 0, Hd); gr.addColorStop(0, "#fbf2da"); gr.addColorStop(1, "#e8d8b2");
    g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd);
    g.strokeStyle = "#7a5414"; g.lineWidth = 10; rrect(g, 8, 8, Wd - 16, Hd - 16, 26); g.stroke();
    g.font = `900 96px ${FONT}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillStyle = "#c0281e";
    g.fillText("HICS", 40, 100);
    const x0 = 300, gw = 100, top = 46, bot = 150; // groups of 5 (4 strokes + a slash), 12 groups max
    g.lineCap = "round"; g.strokeStyle = "#1c140c"; g.lineWidth = 11;
    for (let i = 0; i < n; i++) {
      const grp = Math.floor(i / 5), k = i % 5, gx = x0 + grp * gw, jit = Math.sin(i * 7.3) * 4;
      if (gx > Wd - 80) break;
      g.beginPath();
      if (k < 4) { g.moveTo(gx + k * 17 + jit * 0.5, top + jit); g.lineTo(gx + k * 17 - jit * 0.5, bot); }
      else { g.moveTo(gx - 10, bot - 14); g.lineTo(gx + 70, top + 14); }
      g.stroke();
    }
    this.tally.tex.needsUpdate = true;
  }
}

// ============================== the Holo root ==============================
export class Holo {
  root = new THREE.Group();
  private xray = new XrayHolo(); private gills = new GillHolo(); private odo = new Odometer();
  private dbg: Record<number, THREE.Group> = {};
  constructor() { this.root.add(this.xray.b.group, this.gills.b.group, this.odo.group); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    if (DEBUG) this.debug(id, t, cam as THREE.PerspectiveCamera);
    this.xray.update(id, t, cam);
    this.gills.update(id, t, f, cam);
    this.odo.update(id, t, cam);
  }
  /** TEMP stand-ins + recommended cameras (stills only) */
  private debug(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const c = id === 2 ? xrayCam(id, t) : id === 3 ? gillCam(id, t) : id === 5 ? odoCam() : null;
    if (c) { cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    const mat = (col: string) => new THREE.MeshBasicMaterial({ color: col });
    if (!this.dbg[1]) {
      const bean = new THREE.Group();
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), mat("#f2c9a0")); head.position.set(0, 1.45, 0);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.9), mat("#5a7ad0")); body.position.set(0, 0.85, -0.01);
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), mat("#e8b878")); bg.position.set(0, 1.2, -0.8);
      bean.add(head, body, bg); bean.position.set(...KITCHEN); this.dbg[1] = bean;
      const tad = new THREE.Group();
      const th = new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), mat("#6a8a3a")); th.position.set(0.12, 0, 0);
      const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.18), mat("#7a9a4a")); tail.position.set(-0.4, 0.02, -0.01);
      const eye = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), mat("#ffffff")); eye.position.set(0.24, 0.1, 0.01);
      const wbg = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), mat("#2a8a7a")); wbg.position.set(0, 0.3, -1.5);
      tad.add(th, tail, eye, wbg); tad.position.set(...TADPOLE); this.dbg[3] = tad;
      const osb = new THREE.Group();
      const oh = new THREE.Mesh(new THREE.CircleGeometry(0.22, 40), mat("#f2c9a0")); oh.position.set(0, 1.45, 0);
      const hat = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.12), mat("#e0c060")); hat.position.set(0, 1.66, 0.01);
      const ob = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.95), mat("#3a5a9a")); ob.position.set(0, 0.8, -0.01);
      const barn = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), mat("#a83a2a")); barn.position.set(0, 1.5, -2);
      osb.add(oh, hat, ob, barn); osb.position.set(...FARM); this.dbg[5] = osb;
      for (const k of [1, 3, 5]) { this.dbg[k].traverse((o) => { o.frustumCulled = false; }); this.root.add(this.dbg[k]); }
    }
    this.dbg[1].visible = id === 1 || id === 2 || id === 4; this.dbg[3].visible = id === 3; this.dbg[5].visible = id === 5;
  }
}
