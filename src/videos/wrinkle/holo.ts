// OWNER: holo agent. See /home/user/lookmatch/WRINKLE_BRIEF.md
// SHOT 2 X-RAY HAND (holoAt): one big camera-facing hologram board pinned at BEAN's raised hand in the bath (default
// palm centre BATH+(0.35,1.25,0.15), the palm faces +z, ~0.52 m wrist -> middle fingertip; thumb toward BEAN's face =
// screen-left). Pure function of (id, t); never frustum culled; all NOINK; drawn ON TOP (depthTest off) so the foam and
// BEAN's card never cut it; a depth-only twin keeps the world's ink lines off it.
//   show   : a scan bar sweeps wrist -> fingertips and reveals a glowing glass HAND (cyan rim) with cartoon bones.
//   nerves : a yellow NERVE runs up the wrist and branches to all 5 fingertips; the light flows up it, pulses ride it,
//            a "NERVES" pill.
//   snip   : cartoon SCISSORS glide in, open, SNIP the ring finger's (SNIP_FINGER) nerve in the palm: a spark, the cut
//            ends spring apart, the nerve above the cut flickers and goes DARK; a "SNIP!" burst.
//   wrinkle: the other 4 fingertips go peach and fold into deep animated grooves (a green tick pops over each, a
//            "WRINKLY" pill); the snipped one stays glassy, smooth and SHINY (a gloss streak + twinkle, "SMOOTH?!").
//   stamp  : a big red "ON PURPOSE!" rubber stamp slams onto the palm (shadow first, squash, shock ring, board shake);
//            the hologram flips to an ELECTRIC look (white-hot rim, crackling arcs, faster nerve pulses).
// Technique after jerk/holo.ts: a canvas board in an anchor frame yawed to the camera + an additive HDR glow twin; the
// canvases draw in board-local METRES (y up) through a canvas transform.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { BATH, W, V3, SNIP_FINGER, holoAt, shotStart, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG = false; // TEMP: recommended framing + stand-ins for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const back = (u: number, c = 1.8) => { const x = clamp01(u); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const cyc = (x: number) => ((x % 1) + 1) % 1;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ============================== public contracts ==============================
/** overrides from the cast owner: the palm centre of BEAN's raised hand per (id, t) */
export const HOLO_HOOKS: { hand?: (id: number, t: number) => V3 | undefined } = {};
/** default palm centre of BEAN's raised hand (BEAN sits at BATH+(0,0.35,0) facing +z; this is his LEFT hand, screen right) */
export const HAND: V3 = add(BATH, 0.35, 1.25, 0.15);
export const handPos = (id: number, t: number): V3 => HOLO_HOOKS.hand?.(id, t) ?? HAND;
/** finger order: 0 thumb (board -x, toward BEAN's face), 1 index, 2 middle, 3 ring (= SNIP_FINGER), 4 pinky (board +x) */
type Finger = { base: P2; a: number; len: number; r: number; segs: number[] };
const FINGERS: Finger[] = [
  { base: [-0.105, -0.04], a: -0.95, len: 0.17, r: 0.036, segs: [0.55, 0.45] },
  { base: [-0.072, 0.088], a: -0.2, len: 0.18, r: 0.033, segs: [0.42, 0.32, 0.26] },
  { base: [-0.018, 0.102], a: -0.05, len: 0.2, r: 0.034, segs: [0.42, 0.32, 0.26] },
  { base: [0.038, 0.094], a: 0.1, len: 0.183, r: 0.032, segs: [0.42, 0.32, 0.26] },
  { base: [0.088, 0.068], a: 0.3, len: 0.14, r: 0.029, segs: [0.42, 0.32, 0.26] },
];
const fdir = (f: Finger): P2 => [Math.sin(f.a), Math.cos(f.a)];
const ftip = (f: Finger): P2 => { const d = fdir(f); return [f.base[0] + d[0] * f.len, f.base[1] + d[1] * f.len]; };
/** board-local layout (m): origin = palm centre, x = screen right (for a camera in front), y = up */
export const HOLO_LAYOUT = {
  box: { x0: -0.44, x1: 0.36, y0: -0.36, y1: 0.52 },
  wrist: -0.22,                                       // the hand fades out below this (into BEAN's arm)
  tips: FINGERS.map(ftip),                            // fingertips 0 thumb .. 4 pinky
  cut: [0.054, 0.115] as P2,                           // where the scissors snip the ring finger's nerve
  wrinkTag: { c: [-0.155, 0.43] as P2, w: 0.27, h: 0.066 },  // "WRINKLY ✓"
  smoothTag: { c: [0.155, 0.43] as P2, w: 0.245, h: 0.066 }, // "SMOOTH?!"
  nerveTag: { c: [0.215, -0.165] as P2, w: 0.2, h: 0.058 }, // "NERVES"
  snipBurst: { c: [0.2, 0.335] as P2, rx: 0.1, ry: 0.075 }, // "SNIP!"
  stamp: { c: [0.012, -0.065] as P2, w: 0.5, h: 0.134, rot: 0.14 }, // "ON PURPOSE!" (QA: narrower + right: BEAN's shock face shows)
};
const L = HOLO_LAYOUT;
type Frame = { o: V3; yaw: number; R: V3; N: V3 };
const frameFrom = (o: V3, cam: THREE.Vector3): Frame => {
  const yaw = Math.atan2(cam.x - o[0], cam.z - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)], N: [Math.sin(yaw), 0, Math.cos(yaw)] };
};
const toW = (F: Frame, x: number, y: number, d: number): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** world point of a board-local hologram point (e.g. HOLO_LAYOUT.tips[i]) seen from a camera at camPos */
export const holoPoint = (id: number, t: number, x: number, y: number, camPos: V3): V3 => toW(frameFrom(handPos(id, t), new THREE.Vector3(...camPos)), x, y, 0);
/** IDEAL shot-2 framing (held, straight on, a hair down): the labels' tops at ~12 % (clear of the watermark), the
 *  fingers + labels at 12-35 %, the palm + stamp at ~50 %, the wrist at ~63 % (the captions at 70 % fall on the arm).
 *  Camera 1.87 m in front of the palm, fov 40, look 4 cm left of / below the palm centre (BEAN's face peeks at the
 *  left edge). Recommended: land on it by ~frame 236 (the scan is done at 219) and hold through the stamp (frame 389). */
export const xrayCam = (_id: number, _t: number) => {
  const h = HOLO_HOOKS.hand?.(2, shotStart(2)) ?? HAND;
  return { pos: add(h, -0.04, 0.07, 1.87), look: add(h, -0.04, -0.01, 0), fov: 40 };
};

// ============================== canvas helpers (metre space, y up) ==============================
const INK = "#071033";
type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
const mixC = (a: number[], b: number[], u: number) => a.map((v, i) => Math.round(lerp(v, b[i], clamp01(u))));
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const text = (g: Ctx, s: string, x: number, y: number, size: number, fill: Paint, stroke: Paint = INK, sw = 0.2, rot = 0) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(0.001, -0.001);
  g.font = `900 ${size * 1000}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (sw > 0) { g.lineWidth = size * 1000 * sw; g.strokeStyle = stroke; g.strokeText(s, 0, 0); }
  g.fillStyle = fill; g.fillText(s, 0, 0);
  g.restore();
};
const rrect = (g: Ctx, x: number, y: number, w: number, h: number, r: number) => {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const blob = (g: Ctx, x: number, y: number, r: number, inner: string, outer: string) => {
  if (r <= 0.001) return;
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
const poly = (px: P2[]): Poly => {
  const pts = crPts(px, 10, false), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
const polyAt = (p: Poly, u: number): P2 => {
  const Lh = clamp01(u) * p.len;
  let i = 1;
  while (i < p.pts.length - 1 && p.cum[i] < Lh) i++;
  const a = p.pts[i - 1], b = p.pts[i], k = (Lh - p.cum[i - 1]) / Math.max(1e-6, p.cum[i] - p.cum[i - 1]);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
};
/** the polyline between fractions u0..u1 */
const polyRange = (p: Poly, u0: number, u1: number): P2[] => {
  u0 = clamp01(u0); u1 = clamp01(u1);
  if (u1 <= u0) return [];
  const out: P2[] = [polyAt(p, u0)];
  for (let i = 1; i < p.pts.length - 1; i++) { const u = p.cum[i] / p.len; if (u > u0 && u < u1) out.push(p.pts[i]); }
  out.push(polyAt(p, u1));
  return out;
};
const nearestU = (p: Poly, q: P2) => {
  let best = 0, bd = 1e9;
  p.pts.forEach((pt, i) => { const d = Math.hypot(pt[0] - q[0], pt[1] - q[1]); if (d < bd) { bd = d; best = p.cum[i] / p.len; } });
  return best;
};
const strokePts = (g: Ctx, pts: P2[]) => { if (pts.length < 2) return; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.stroke(); };
const capsule = (a: P2, b: P2, r: number) => {
  const th = Math.atan2(b[1] - a[1], b[0] - a[0]), p = new Path2D();
  p.arc(b[0], b[1], r, th - Math.PI / 2, th + Math.PI / 2); p.arc(a[0], a[1], r, th + Math.PI / 2, th + Math.PI * 1.5); p.closePath();
  return p;
};
/** a green tick (centre x,y, size s) */
const tick = (g: Ctx, x: number, y: number, s: number, col = "#45f07a") => {
  const pts: P2[] = [[x - s * 0.5, y + s * 0.02], [x - s * 0.15, y - s * 0.35], [x + s * 0.55, y + s * 0.45]];
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = INK; g.lineWidth = s * 0.42; strokePts(g, pts);
  g.strokeStyle = col; g.lineWidth = s * 0.24; strokePts(g, pts);
  g.restore();
};
/** a label pill (metres) that scales in (back easing) with an optional leader to `to` */
const pill = (g: Ctx, q: Ctx, x: number, y: number, w: number, h: number, fill: Paint, label: string, k: number, t: number, to?: P2, txt = "#ffffff", glowCol = "#5fd8ff", pulse = 0, tickL = false) => {
  if (k < 0.01) return;
  if (to) {
    const a = smooth(k * 1.6), ex = lerp(x, to[0], a), ey = lerp(y, to[1], a);
    g.save(); g.globalAlpha *= a; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokeStyle = INK; g.lineWidth = h * 0.2; g.stroke(); g.strokeStyle = glowCol; g.lineWidth = h * 0.09; g.stroke();
    g.fillStyle = glowCol; g.beginPath(); g.arc(ex, ey, h * 0.14, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = h * 0.05; g.stroke();
    g.restore();
  }
  const s = back(k) * (1 + 0.1 * pulse);
  g.save(); g.globalAlpha *= Math.min(1, k * 3); g.translate(x, y); g.scale(s, s); g.rotate(0.025 * Math.sin(t * 2.1 + x * 7));
  const pad = h * 0.13;
  g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, h / 2 + pad); g.fill();
  g.fillStyle = fill; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.3)"; rrect(g, -w / 2 + h * 0.3, h / 2 - h * 0.34, w - h * 0.6, h * 0.22, h * 0.11); g.fill();
  if (tickL) { text(g, label, -h * 0.4, -h * 0.03, h * 0.62, txt, INK, 0.24); tick(g, w / 2 - h * 0.5, 0.004, h * 0.62); }
  else text(g, label, 0, -h * 0.03, h * 0.62, txt, txt === INK ? "rgba(255,255,255,0.6)" : INK, txt === INK ? 0.06 : 0.24);
  g.restore();
  q.save(); q.globalAlpha *= (0.35 + 0.45 * pulse) * Math.min(1, k); q.strokeStyle = glowCol; q.lineWidth = h * 0.4; rrect(q, x - w / 2 - h * 0.15, y - h / 2 - h * 0.15, w + h * 0.3, h * 1.3, h * 0.65); q.stroke(); q.restore();
};

class Plane {
  cv = document.createElement("canvas"); g: Ctx; tex: THREE.CanvasTexture;
  constructor(w: number, h: number) {
    this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
}
const GS = 0.25; // glow canvas scale
/** a camera-facing hologram board drawn OVER the scene (no depth test): main canvas + additive HDR glow twin */
class Board {
  group = new THREE.Group();
  main: Plane; glow: Plane; W: number; H: number;
  private mats: THREE.MeshBasicMaterial[] = [];
  private depthOp = { value: 1 };
  constructor(public box: { x0: number; x1: number; y0: number; y1: number }, public S: number, ro: number, glowK = 1.6) {
    this.W = Math.round((box.x1 - box.x0) * S); this.H = Math.round((box.y1 - box.y0) * S);
    this.main = new Plane(this.W, this.H); this.glow = new Plane(Math.round(this.W * GS), Math.round(this.H * GS));
    const geo = new THREE.PlaneGeometry(box.x1 - box.x0, box.y1 - box.y0);
    const mk = (m: THREE.MeshBasicMaterial, z: number, r: number) => {
      const me = new THREE.Mesh(geo, m); me.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, z); me.renderOrder = r;
      me.layers.set(NOINK); me.frustumCulled = false; this.group.add(me); this.mats.push(m);
    };
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0, ro);
    mk(new THREE.MeshBasicMaterial({ map: this.glow.tex, color: new THREE.Color(glowK, glowK, glowK), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0.004, ro + 1);
    // an invisible depth-only twin (drawn last) writes a NEAR depth where the board is opaque, so the world's ink lines
    // (tub rim, tiles, BEAN's card outline) are not drawn across the hand / labels / stamp
    const dm = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.main.tex }, op: this.depthOp },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz *= 0.7; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform sampler2D map; uniform float op; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a * op < 0.3) discard; gl_FragColor = vec4(0.0); }",
      transparent: true, depthWrite: true, depthTest: true, depthFunc: THREE.AlwaysDepth, colorWrite: false,
      side: THREE.DoubleSide,
    });
    const dme = new THREE.Mesh(geo, dm); dme.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, 0.002); dme.renderOrder = 100000;
    dme.layers.set(NOINK); dme.frustumCulled = false; this.group.add(dme);
    this.group.visible = false;
  }
  opacity(a: number) { for (const m of this.mats) m.opacity = a; this.depthOp.value = a; }
  tf(c: Ctx, s: number) { c.setTransform(s, 0, 0, -s, -this.box.x0 * s, this.box.y1 * s); }
  begin(): [Ctx, Ctx] {
    const g = this.main.g, q = this.glow.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.W, this.H); g.save(); this.tf(g, this.S); g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = 1;
    q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, this.glow.cv.width, this.glow.cv.height); q.save(); this.tf(q, this.S * GS); q.lineCap = "round"; q.lineJoin = "round"; q.globalAlpha = 1;
    return [g, q];
  }
  flush() { this.main.tex.needsUpdate = true; this.glow.tex.needsUpdate = true; }
}

// ============================== shapes (board-local metres) ==============================
const PALM: P2[] = [[-0.1, 0.098], [-0.03, 0.118], [0.045, 0.11], [0.1, 0.082], [0.118, 0.0], [0.105, -0.1], [0.078, -0.18], [0.0, -0.198], [-0.075, -0.18], [-0.11, -0.11], [-0.125, -0.02]];
const palmPath = () => pathOf(crPts(PALM, 8, true), true);
const wristPath = () => { const p = new Path2D(); p.moveTo(-0.082, -0.12); p.lineTo(0.082, -0.12); p.lineTo(0.074, -0.4); p.lineTo(-0.074, -0.4); p.closePath(); return p; };
const fingerPath = (f: Finger, shrink = 0) => {
  const d = fdir(f), tp = ftip(f), r = f.r * (1 - shrink);
  return capsule([f.base[0] - d[0] * 0.035, f.base[1] - d[1] * 0.035], [tp[0] - d[0] * f.r, tp[1] - d[1] * f.r], r);
};
const CARPAL_C: P2 = [0.0, -0.13];
/** nerve routes: the trunk up the wrist, a split in the palm, along each finger (offset to one side of the bones) */
const TRUNK: P2[] = [[0.012, -0.4], [0.01, -0.26], [0.0, -0.17], [-0.005, -0.1]];
const nerveRoute = (i: number): P2[] => {
  const f = FINGERS[i], d = fdir(f), n: P2 = [d[1], -d[0]], off = f.r * 0.42 * (i === 0 ? -1 : 1), tp = ftip(f);
  const sp: P2 = [-0.005, -0.1];
  const mid: P2 = [lerp(sp[0], f.base[0], 0.5) + n[0] * off * 0.5, lerp(sp[1], f.base[1], 0.5) + n[1] * off * 0.5];
  const along = (u: number): P2 => [f.base[0] + d[0] * f.len * u + n[0] * off, f.base[1] + d[1] * f.len * u + n[1] * off];
  return [...TRUNK, mid, along(0.0), along(0.45), along(0.78), [tp[0] - d[0] * f.r * 0.75, tp[1] - d[1] * f.r * 0.75]];
};

type HSt = ReturnType<typeof holoAt>;

class XrayHand {
  b = new Board(L.box, 1800, 40, 0.85);
  private last = "";
  private routes = FINGERS.map((_, i) => poly(nerveRoute(i)));
  private cutU = nearestU(this.routes[SNIP_FINGER], L.cut);
  private stampCv: HTMLCanvasElement | null = null; // built lazily on the first stamp frame (fonts are loaded by then)
  update(id: number, t: number, cam: THREE.Camera) {
    const X = holoAt(id, t), show = id === 2 ? X.show : 0;
    this.b.group.visible = show > 0.002;
    if (!this.b.group.visible) return;
    const F = frameFrom(handPos(id, t), cam.position);
    // stamp impact shake (board-local, decays in ~0.25 s)
    const age = t - (W.purpose + 0.1), sh = age > 0 ? 0.01 * Math.exp(-age / 0.09) * Math.sin(age * 70) : 0;
    this.b.group.position.set(...toW(F, sh, -sh * 0.6, 0)); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.group.scale.setScalar(0.96 + 0.04 * glide(show));
    this.b.opacity(1);
    const key = id + ":" + t.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    this.draw(t, X, show);
  }
  // ---------------- the stamp (drawn once: grungy red ink on cream, with speckle holes) ----------------
  private makeStamp() {
    const S = 1800, { w, h } = L.stamp, pad = 0.02;
    const cv = document.createElement("canvas"); cv.width = Math.round((w + 2 * pad) * S); cv.height = Math.round((h + 2 * pad) * S);
    const g = cv.getContext("2d")!;
    g.setTransform(S, 0, 0, -S, (w / 2 + pad) * S, (h / 2 + pad) * S); g.lineJoin = "round";
    const RED = "#e8132c";
    g.fillStyle = INK; rrect(g, -w / 2 - 0.006, -h / 2 - 0.006, w + 0.012, h + 0.012, 0.03); g.fill();
    g.fillStyle = "#fff4e4"; rrect(g, -w / 2, -h / 2, w, h, 0.026); g.fill();
    g.strokeStyle = RED; g.lineWidth = 0.013; rrect(g, -w / 2 + 0.013, -h / 2 + 0.013, w - 0.026, h - 0.026, 0.018); g.stroke();
    g.lineWidth = 0.004; rrect(g, -w / 2 + 0.03, -h / 2 + 0.03, w - 0.06, h - 0.06, 0.01); g.stroke();
    g.font = `900 100px ${FONT}`;
    const tw = g.measureText("ON PURPOSE!").width * 0.001; // metres at size 0.1
    text(g, "ON PURPOSE!", 0, -0.004, Math.min(0.085, (0.1 * (w - 0.085)) / Math.max(0.1, tw)), RED, RED, 0.03);
    // speckles + dry-brush streaks in cream over the ink
    for (let i = 0; i < 260; i++) {
      const x = (hash(i * 3.1) - 0.5) * w, y = (hash(i * 7.7 + 2) - 0.5) * h, r = 0.0012 + 0.004 * hash(i * 1.3 + 9) ** 3;
      g.fillStyle = "rgba(255,244,228,0.9)"; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    for (let i = 0; i < 6; i++) {
      const y = (hash(i * 5.3 + 1) - 0.5) * h * 0.8;
      g.strokeStyle = "rgba(255,244,228,0.55)"; g.lineWidth = 0.002 + 0.002 * hash(i); g.beginPath(); g.moveTo(-w / 2 + 0.01, y); g.lineTo(w / 2 - 0.01, y + 0.01 * (hash(i + 4) - 0.5)); g.stroke();
    }
    return cv;
  }

  private draw(t: number, X: HSt, show: number) {
    const B = this.b, [g, q] = B.begin();
    const tImp = W.purpose + 0.1, E = smooth((t - tImp) / 0.12); // electric phase after the stamp lands
    // ---- a soft dark backdrop so the glass reads against the warm bathroom ----
    g.save(); g.translate(-0.03, 0.06); g.scale(1, 1.18);
    blob(g, 0, 0, 0.4, `rgba(4,10,40,${0.42 * smooth(show * 1.4) + 0.2 * E})`, "rgba(4,10,40,0)");
    g.restore();
    // ---- scan reveal: clip wrist -> fingertips ----
    const wy = lerp(L.box.y0 - 0.05, L.box.y1 + 0.05, glide(show));
    if (show < 0.999) for (const c of [g, q]) { c.save(); c.beginPath(); c.rect(L.box.x0 - 1, L.box.y0 - 1, 10, wy - L.box.y0 + 1); c.clip(); }
    this.drawHand(g, q, t, X, E);
    // the arm end fades out below the wrist
    for (const c of [g, q]) {
      c.save(); c.globalCompositeOperation = "destination-out";
      const fg = c.createLinearGradient(0, L.wrist - 0.02, 0, L.wrist - 0.12); fg.addColorStop(0, "rgba(0,0,0,0)"); fg.addColorStop(1, "rgba(0,0,0,1)");
      c.fillStyle = fg; c.fillRect(L.box.x0, L.box.y0 - 0.1, L.box.x1 - L.box.x0, L.wrist - L.box.y0 + 0.08); c.restore();
    }
    if (show < 0.999) { g.restore(); q.restore(); }
    this.drawScissors(g, q, t, X);
    this.drawLabels(g, q, t, X);
    this.drawStamp(g, q, t, X);
    g.restore(); q.restore();
    if (show > 0.001 && show < 0.999) { // the scan bar
      const a = Math.sin(Math.PI * show);
      g.save(); B.tf(g, B.S);
      const lg = g.createLinearGradient(0, wy - 0.03, 0, wy + 0.03);
      lg.addColorStop(0, "rgba(140,240,255,0)"); lg.addColorStop(0.5, `rgba(230,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,240,255,0)");
      g.fillStyle = lg; g.fillRect(-0.3, wy - 0.03, 0.56, 0.06); g.restore();
      q.save(); B.tf(q, B.S * GS); q.fillStyle = `rgba(120,230,255,${0.8 * a})`; q.fillRect(-0.3, wy - 0.012, 0.56, 0.024); q.restore();
    }
    B.flush();
  }

  // ---------------- the glass hand, bones, nerves, fingertips ----------------
  private drawHand(g: Ctx, q: Ctx, t: number, X: HSt, E: number) {
    const fl = E * (0.75 + 0.25 * hash(Math.floor(t * 15)));
    const rc = mixC([95, 216, 255], [200, 250, 255], fl);
    const wr = FINGERS.map((_, i) => this.wrinkleOf(i, X));
    const palm = palmPath(), wrist = wristPath(), fingers = FINGERS.map((f, i) => fingerPath(f, 0.05 * wr[i]));
    const shapes = [wrist, palm, ...fingers];
    for (const [w, a] of [[0.045, 0.14], [0.025, 0.22], [0.012, 0.32]] as [number, number][]) { g.strokeStyle = `rgba(2,6,26,${a})`; g.lineWidth = w; for (const s of shapes) g.stroke(s); }
    g.strokeStyle = rgb(rc); g.lineWidth = 0.013 + 0.003 * E; for (const s of shapes) g.stroke(s);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 0.0055; for (const s of shapes) g.stroke(s);
    q.strokeStyle = rgb(rc, 0.3 + 0.25 * fl); q.lineWidth = 0.018; for (const s of shapes) q.stroke(s);
    q.strokeStyle = rgb(rc, 0.07 + 0.08 * fl); q.lineWidth = 0.045; for (const s of shapes) q.stroke(s);
    const gl = g.createLinearGradient(0, 0.3, 0, -0.25);
    gl.addColorStop(0, "rgba(34,70,160,0.9)"); gl.addColorStop(1, "rgba(14,26,86,0.9)");
    g.fillStyle = gl; for (const s of shapes) g.fill(s);
    const clip = new Path2D(); for (const s of shapes) clip.addPath(s);
    // inside: grid + drifting scan lines + bones
    g.save(); g.clip(clip, "nonzero");
    g.strokeStyle = "rgba(120,200,255,0.09)"; g.lineWidth = 0.0012;
    for (let x = -0.3; x < 0.3; x += 0.018) { g.beginPath(); g.moveTo(x, -0.4); g.lineTo(x, 0.35); g.stroke(); }
    for (let y = -0.4; y < 0.35; y += 0.018) { g.beginPath(); g.moveTo(-0.3, y); g.lineTo(0.3, y); g.stroke(); }
    g.fillStyle = "rgba(180,235,255,0.05)";
    for (let y = ((t * 0.05) % 0.012) - 0.4; y < 0.35; y += 0.012) g.fillRect(-0.3, y, 0.6, 0.004);
    this.drawBones(g);
    g.restore();
    // fingertip pads (peach + grooves on the wrinkly 4; glassy shine on the snipped one)
    this.drawNerves(g, q, t, X, E);
    FINGERS.forEach((f, i) => this.drawTip(g, q, t, f, i, wr[i], X));
    // glass sheen (top-left)
    const shn = g.createLinearGradient(-0.2, 0.2, 0.05, -0.05); shn.addColorStop(0, "rgba(255,255,255,0.12)"); shn.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.clip(clip); g.fillStyle = shn; g.fillRect(-0.3, -0.25, 0.6, 0.6); g.restore();
    // electric crackle arcs along the fingers after the stamp
    if (E > 0.01) {
      const k = Math.floor(t * 15);
      g.save(); g.lineCap = "round"; g.lineJoin = "round";
      for (let j = 0; j < 7; j++) {
        const fi = Math.floor(hash(k * 13 + j) * 5), f = FINGERS[fi], tp = ftip(f), d = fdir(f), u = 0.2 + 0.75 * hash(k * 7 + j * 3);
        const side = hash(k + j * 11) > 0.5 ? 1 : -1, n: P2 = [d[1] * side, -d[0] * side];
        const ox = f.base[0] + (tp[0] - f.base[0]) * u + n[0] * f.r * 1.05, oy = f.base[1] + (tp[1] - f.base[1]) * u + n[1] * f.r * 1.05;
        const pts: P2[] = [];
        for (let m = 0; m < 5; m++) { const s = (m - 2) * 0.012, jit = (hash(k * 31 + j * 5 + m) - 0.5) * 0.016; pts.push([ox + d[0] * s + n[0] * (jit + 0.006), oy + d[1] * s + n[1] * (jit + 0.006)]); }
        g.globalAlpha = E * (0.5 + 0.5 * hash(k * 3 + j));
        g.strokeStyle = "rgba(160,240,255,1)"; g.lineWidth = 0.005; strokePts(g, pts);
        g.strokeStyle = "#ffffff"; g.lineWidth = 0.002; strokePts(g, pts);
        q.save(); q.globalAlpha = g.globalAlpha * 0.7; q.strokeStyle = "#9feaff"; q.lineWidth = 0.016; strokePts(q, pts); q.restore();
      }
      g.restore();
    }
  }
  private drawBones(g: Ctx) {
    const boneSeg = (a: P2, b: P2, w: number) => {
      const p = capsule(a, b, w * 0.5), k1 = new Path2D(), k2 = new Path2D();
      k1.arc(a[0], a[1], w * 0.72, 0, TAU); k2.arc(b[0], b[1], w * 0.72, 0, TAU);
      g.strokeStyle = "rgba(210,238,255,0.16)"; g.lineWidth = w * 0.9; for (const s of [p, k1, k2]) g.stroke(s);
      g.fillStyle = "rgba(226,244,255,0.62)"; g.fill(p); g.fill(k1); g.fill(k2);
      g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = w * 0.16; strokePts(g, [[lerp(a[0], b[0], 0.2), lerp(a[1], b[1], 0.2)], [lerp(a[0], b[0], 0.8), lerp(a[1], b[1], 0.8)]]);
    };
    // forearm (radius + ulna) and carpals
    boneSeg([-0.035, -0.42], [-0.04, -0.195], 0.026); boneSeg([0.04, -0.42], [0.042, -0.2], 0.022);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.3; g.fillStyle = "rgba(226,244,255,0.55)"; g.beginPath(); g.ellipse(CARPAL_C[0] + Math.cos(a) * 0.04, CARPAL_C[1] + Math.sin(a) * 0.028, 0.017, 0.014, a, 0, TAU); g.fill(); }
    FINGERS.forEach((f, i) => {
      const d = fdir(f), gap = 0.007, w = f.r * 0.62;
      // metacarpal: carpals -> finger base
      const mc0: P2 = i === 0 ? [-0.05, -0.12] : [lerp(CARPAL_C[0], f.base[0], 0.28), CARPAL_C[1] + 0.045], mc1: P2 = [f.base[0] - d[0] * gap * 2, f.base[1] - d[1] * gap * 2];
      boneSeg(mc0, mc1, w * 1.05);
      let u = 0;
      for (const s of f.segs) {
        const a: P2 = [f.base[0] + d[0] * (f.len * u + gap), f.base[1] + d[1] * (f.len * u + gap)];
        u += s * 0.88;
        const b: P2 = [f.base[0] + d[0] * (f.len * u - gap), f.base[1] + d[1] * (f.len * u - gap)];
        boneSeg(a, b, w * (1 - u * 0.25));
      }
    });
  }
  /** this finger's wrinkle amount (staggered; the snipped finger never wrinkles) */
  private wrinkleOf(i: number, X: HSt) {
    if (i === SNIP_FINGER) return 0;
    const order = [3, 0, 1, 99, 2][i];
    return smooth(X.wrinkle * 1.45 - order * 0.12);
  }
  private drawTip(g: Ctx, q: Ctx, t: number, f: Finger, i: number, w: number, X: HSt) {
    const tp = ftip(f), d = fdir(f);
    const r = f.r * (1 - 0.05 * w), padL = f.len * 0.4;
    g.save(); g.translate(tp[0], tp[1]); g.rotate(-f.a); // local: +y = out along the finger, the tip at y 0
    const fpath = capsule([0, -f.len - 0.04], [0, -f.r], r);
    g.save(); g.clip(fpath);
    if (i === SNIP_FINGER) {
      const s = smooth(X.wrinkle * 1.4);
      if (s > 0.001) {
        // glassy, smooth and SHINY: a cool pad + a long gloss streak + a highlight dot
        const pg = g.createLinearGradient(0, -padL, 0, 0); pg.addColorStop(0, "rgba(150,220,255,0)"); pg.addColorStop(0.3, `rgba(170,232,255,${0.95 * s})`); pg.addColorStop(1, `rgba(215,248,255,${s})`);
        g.fillStyle = pg; g.fillRect(-r, -padL, 2 * r, padL + 0.01);
        g.fillStyle = `rgba(255,255,255,${0.85 * s})`; g.beginPath(); g.ellipse(-r * 0.38, -padL * 0.42, r * 0.17, padL * 0.36, 0.08, 0, TAU); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.6 * s})`; g.beginPath(); g.ellipse(r * 0.35, -r * 0.55, r * 0.12, r * 0.12, 0, 0, TAU); g.fill();
      }
    } else if (w > 0.001) {
      // pruney: a warm peach pad folding into deep wavy grooves
      const pg = g.createLinearGradient(0, -padL * 1.2, 0, 0); pg.addColorStop(0, "rgba(255,160,120,0)"); pg.addColorStop(0.3, `rgba(255,160,120,${w})`); pg.addColorStop(1, `rgba(255,200,165,${w})`);
      g.fillStyle = pg; g.fillRect(-r - 0.01, -padL * 1.2, 2 * r + 0.02, padL * 1.2 + 0.01);
      const nG = 4;
      for (let k = 0; k < nG; k++) {
        const gk = smooth(w * 1.6 - (k / nG) * 0.6); // grooves fold in from the tip down
        if (gk < 0.01) continue;
        const y0 = -r * 0.55 - (k / (nG - 1)) * (padL - r * 0.6), bow = r * 0.36 * gk, amp = 0.005 * gk, ph = i * 1.7 + k * 2.3;
        const pts: P2[] = [];
        for (let m = 0; m <= 16; m++) { const x = lerp(-r * 1.05, r * 1.05, m / 16), xn = x / r; pts.push([x, y0 + bow * (1 - xn * xn) * 0.5 - bow * 0.25 + amp * Math.sin(m * 1.25 + ph + 1.5 * Math.sin(t * 2 + k))]); }
        g.strokeStyle = `rgba(120,30,50,${gk})`; g.lineWidth = 0.0085 * gk; strokePts(g, pts);
        g.strokeStyle = `rgba(255,240,225,${0.85 * gk})`; g.lineWidth = 0.0028 * gk; strokePts(g, pts.map(([x, y]) => [x, y + 0.0062] as P2));
      }
      q.save(); q.translate(tp[0], tp[1]); q.rotate(-f.a); q.globalAlpha = 0.35 * w; q.fillStyle = "#ff9a70"; q.fillRect(-r, -padL, 2 * r, padL); q.restore();
    }
    g.restore();
    if (w > 0.01) { g.strokeStyle = `rgba(255,160,120,${0.9 * w})`; g.lineWidth = 0.004; g.beginPath(); g.arc(0, -f.r, r, 0.15, Math.PI - 0.15); g.stroke(); }
    g.restore();
    // the twinkle on the smooth one (pulsing)
    if (i === SNIP_FINGER) {
      const s = smooth(X.wrinkle * 1.4) * (0.6 + 0.4 * Math.sin(t * 7));
      if (s > 0.01) {
        const cx = tp[0] - d[0] * f.r * 0.7 - 0.012, cy = tp[1] - d[1] * f.r * 0.7 + 0.006, R = 0.026 * s;
        g.save(); g.fillStyle = "#ffffff"; g.beginPath();
        for (let m = 0; m < 8; m++) { const a = (m / 8) * TAU + t * 1.5, rr = m % 2 ? R * 0.25 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.restore();
        blob(q, cx, cy, 0.04, `rgba(220,250,255,${0.9 * s})`, "rgba(200,240,255,0)");
      }
    }
  }
  private drawNerves(g: Ctx, q: Ctx, t: number, X: HSt, E: number) {
    const n = X.nerves, snipT = W.cut + 0.05; // the blades close at snip = 1
    const cut = t >= snipT - 0.01;
    const age = t - snipT;
    const dark = cut ? smooth(age / 0.35) : 0;
    const flick = cut && age < 0.4 ? (hash(Math.floor(t * 30)) > 0.5 ? 1 : 0.35) : 1;
    const gap = cut ? 0.012 + 0.018 * back(clamp01(age / 0.25), 2.2) : 0;
    // unlit: a faint dim line (so the light-up reads as a change)
    this.routes.forEach((p) => { g.strokeStyle = "rgba(120,132,96,0.55)"; g.lineWidth = 0.0045; strokePts(g, p.pts); });
    this.routes.forEach((p, i) => {
      const lit = clamp01(n * 1.5 - 0.06 * Math.abs(i - 2)); // the light flows up from the wrist
      if (lit <= 0) return;
      const glowA = 0.32 + 0.3 * E;
      const seg = (u0: number, u1: number, col: number[], core: number, a = 1) => {
        const pts = polyRange(p, u0, u1);
        if (pts.length < 2) return;
        g.save(); g.globalAlpha = a;
        g.strokeStyle = INK; g.lineWidth = 0.0125; strokePts(g, pts);
        g.strokeStyle = rgb(col); g.lineWidth = 0.0085; strokePts(g, pts);
        g.strokeStyle = rgb(mixC(col, [255, 255, 255], core)); g.lineWidth = 0.0032; strokePts(g, pts);
        g.restore();
        q.save(); q.globalAlpha = a * glowA * (col[0] > 200 ? 1 : 0.15); q.strokeStyle = rgb(col); q.lineWidth = 0.022; strokePts(q, pts); q.restore();
      };
      const Y = [255, 226, 58];
      if (i === SNIP_FINGER && cut) {
        const uc = this.cutU, gu = gap / p.len;
        seg(0, Math.min(lit, uc - gu), Y, 0.6);
        // the dead end above the cut: flickers, then goes dark grey
        seg(uc + gu, lit, mixC(Y, [70, 78, 96], dark), 0.6 * (1 - dark), flick);
      } else seg(0, lit, Y, 0.6 + 0.2 * E);
      // pulses riding up the nerve once lit
      if (lit > 0.98) {
        for (let k = 0; k < 2; k++) {
          const u = cyc(t * (0.85 + 0.3 * E) + i * 0.19 + k * 0.5);
          if (i === SNIP_FINGER && cut && u > this.cutU - gap / p.len) continue;
          const [x, y] = polyAt(p, u), a = Math.sin(Math.PI * u);
          g.fillStyle = `rgba(255,255,230,${a})`; g.beginPath(); g.arc(x, y, 0.0075, 0, TAU); g.fill();
          blob(q, x, y, 0.028, `rgba(255,240,140,${0.7 * a})`, "rgba(255,220,80,0)");
        }
      }
    });
    // the snip spark
    if (t > snipT - 0.02) {
      const sa = Math.max(0, t - snipT), k = Math.exp(-sa / 0.2) * smooth((t - (snipT - 0.02)) / 0.03);
      if (k > 0.01) {
        const [cx, cy] = L.cut, R = 0.025 + 0.06 * (1 - Math.exp(-sa / 0.08));
        g.save(); g.lineCap = "round";
        for (let m = 0; m < 9; m++) {
          const a = (m / 9) * TAU + 0.3, r0 = R * 0.35, r1 = R * (0.8 + 0.4 * hash(m));
          g.strokeStyle = `rgba(255,248,180,${k})`; g.lineWidth = 0.006 * k + 0.001; strokePts(g, [[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1]]);
        }
        for (let m = 0; m < 7; m++) { // flying sparks
          const a = hash(m * 4.1) * TAU, sp = 0.18 + 0.15 * hash(m * 2.3), x = cx + Math.cos(a) * sp * sa, y = cy + Math.sin(a) * sp * sa - 0.3 * sa * sa;
          g.fillStyle = `rgba(255,236,120,${k})`; g.beginPath(); g.arc(x, y, 0.004, 0, TAU); g.fill();
        }
        g.restore();
        blob(q, cx, cy, 0.09, `rgba(255,245,170,${0.95 * k})`, "rgba(255,220,90,0)");
      }
    }
  }

  // ---------------- the scissors ----------------
  private drawScissors(g: Ctx, q: Ctx, t: number, X: HSt) {
    const tIn = W.cut - 0.62, app = smooth((t - tIn) / 0.42), ex = smooth((t - (W.cut + 0.5)) / 0.45);
    const alpha = smooth(app * 2.5) * (1 - ex);
    if (alpha < 0.005) return;
    const rot = 0.3, SC = 1.45; // the blades point left and a little down onto the cut; drawn 1.45x
    const openA = 0.62 * smooth((t - (W.cut - 0.55)) / 0.3) * (1 - X.snip) + 0.1 * smooth((t - (W.cut + 0.2)) / 0.2) * (1 - ex);
    const c = Math.cos(rot), s = Math.sin(rot);
    // the cut sits 0.06 along the blades from the pivot
    const px0 = L.cut[0] + c * 0.06 * SC, py0 = L.cut[1] + s * 0.06 * SC;
    const fx = lerp(0.34, 0, glide(app)) + 0.32 * glide(ex), fy = lerp(-0.12, 0, glide(app)) + 0.05 * ex;
    const dt = t - W.cut, recoil = dt > 0 ? 0.008 * Math.exp(-dt / 0.08) * Math.sin(dt * 60) : 0;
    g.save(); g.globalAlpha = alpha;
    g.translate(px0 + fx + recoil, py0 + fy); g.rotate(rot + Math.PI); g.scale(SC, SC); // local +x = toward the blade tips
    const blade = (sgn: number) => {
      g.save(); g.rotate(sgn * openA * 0.5);
      const p = new Path2D(); p.moveTo(-0.008, 0.0); p.quadraticCurveTo(0.03, sgn * 0.017, 0.095, sgn * 0.002); p.lineTo(0.093, -sgn * 0.003); p.quadraticCurveTo(0.04, -sgn * 0.004, -0.008, -sgn * 0.006); p.closePath();
      g.strokeStyle = INK; g.lineWidth = 0.007; g.stroke(p);
      const bg = g.createLinearGradient(0, sgn * 0.014, 0, -sgn * 0.004); bg.addColorStop(0, "#f4f8fc"); bg.addColorStop(1, "#8b9bb0");
      g.fillStyle = bg; g.fill(p);
      g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 0.0025; g.beginPath(); g.moveTo(0.006, sgn * 0.004); g.quadraticCurveTo(0.04, sgn * 0.01, 0.08, sgn * 0.003); g.stroke();
      // the handle loop on the other side of the pivot
      g.strokeStyle = INK; g.lineWidth = 0.014; g.beginPath(); g.moveTo(-0.004, -sgn * 0.002); g.lineTo(-0.04, -sgn * 0.014); g.stroke();
      g.beginPath(); g.ellipse(-0.064, -sgn * 0.022, 0.028, 0.017, -sgn * 0.3, 0, TAU);
      g.lineWidth = 0.016; g.stroke(); g.strokeStyle = "#ff3b4e"; g.lineWidth = 0.0095; g.stroke();
      g.strokeStyle = "#ff3b4e"; g.lineWidth = 0.008; g.beginPath(); g.moveTo(-0.004, -sgn * 0.002); g.lineTo(-0.04, -sgn * 0.014); g.stroke();
      g.restore();
    };
    blade(-1); blade(1);
    g.fillStyle = "#ffd04a"; g.strokeStyle = INK; g.lineWidth = 0.003; g.beginPath(); g.arc(0, 0, 0.0065, 0, TAU); g.fill(); g.stroke();
    g.restore();
    q.save(); q.globalAlpha = 0.3 * alpha; q.fillStyle = "#cfe8ff"; q.beginPath(); q.arc(px0 + fx, py0 + fy, 0.06, 0, TAU); q.fill(); q.restore();
  }

  // ---------------- labels ----------------
  private drawLabels(g: Ctx, q: Ctx, t: number, X: HSt) {
    // NERVES (from the light-up to the snip)
    const nk = clamp01((t - (W.nerve - 0.05)) / 0.35) * (1 - smooth((t - (W.cut + 0.25)) / 0.25));
    const NT = L.nerveTag;
    pill(g, q, NT.c[0], NT.c[1], NT.w, NT.h, "#ffc21a", "NERVES", nk, t, [0.009, -0.2], INK, "#ffe23a");
    // SNIP! burst (pops on the snip, gone as the wrinkles come)
    const sk = clamp01((t - (W.cut + 0.02)) / 0.3), sOut = smooth((t - (W.never - 0.25)) / 0.3);
    if (sk > 0.01 && sOut < 0.999) {
      const SB = L.snipBurst, s = back(sk, 2.4) * (1 - 0.3 * sOut);
      g.save(); g.globalAlpha = Math.min(1, sk * 3) * (1 - sOut); g.translate(SB.c[0], SB.c[1]); g.scale(s, s); g.rotate(0.12 + 0.03 * Math.sin(t * 9));
      const star = new Path2D();
      for (let m = 0; m < 22; m++) { const a = (m / 22) * TAU, rr = m % 2 ? 0.7 : 1 + 0.08 * hash(m); star.lineTo(Math.cos(a) * SB.rx * rr, Math.sin(a) * SB.ry * rr); }
      star.closePath();
      g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(star); g.fillStyle = "#fff15a"; g.fill(star);
      text(g, "SNIP!", 0, -0.002, 0.052, "#ff2f45", INK, 0.22);
      g.restore();
      q.save(); q.globalAlpha = 0.4 * sk * (1 - sOut); blob(q, SB.c[0], SB.c[1], 0.12, "rgba(255,240,120,0.9)", "rgba(255,220,80,0)"); q.restore();
    }
    // WRINKLY ticks over the 4 tips + the pill; SMOOTH?! on the snipped one
    FINGERS.forEach((f, i) => {
      if (i === SNIP_FINGER) return;
      const k = clamp01((this.wrinkleOf(i, X) - 0.55) / 0.45);
      if (k < 0.01) return;
      const tp = ftip(f), d = fdir(f), s = back(k, 2.2);
      g.save(); g.globalAlpha = Math.min(1, k * 3); g.translate(tp[0] + d[0] * 0.04, tp[1] + d[1] * 0.04); g.scale(s, s); tick(g, 0, 0, 0.032); g.restore();
    });
    const wk = clamp01((t - (W.wrinkles - 0.05)) / 0.35), WT = L.wrinkTag;
    pill(g, q, WT.c[0], WT.c[1], WT.w, WT.h, "#ff7a52", "WRINKLY", wk, t, undefined, "#ffffff", "#ffb07a", 0, true);
    const mk = clamp01((t - (W.wrinkles + 0.35)) / 0.35), MT = L.smoothTag, rt = ftip(FINGERS[SNIP_FINGER]);
    pill(g, q, MT.c[0], MT.c[1], MT.w, MT.h, "#5fd8ff", "SMOOTH?!", mk, t, [rt[0] + 0.004, rt[1] + 0.012], INK, "#9feaff", 0.3 + 0.3 * Math.sin(t * 6));
  }

  // ---------------- the ON PURPOSE! stamp ----------------
  private drawStamp(g: Ctx, q: Ctx, t: number, X: HSt) {
    const k = X.stamp;
    if (k < 0.002) return;
    const S = L.stamp, tImp = W.purpose + 0.1, age = t - tImp;
    const fall = clamp01(k), hit = age >= 0;
    // falling from above the lens: big + faint, then lands; a squash bounce after the hit
    const sc = hit ? 1 + 0.07 * Math.exp(-age / 0.09) * Math.cos(age * 38) : 1 + 1.5 * (1 - fall) * (1 - fall);
    const sy = hit ? 1 - 0.06 * Math.exp(-age / 0.06) : 1;
    const a = smooth(fall * 2.5);
    // the shadow it casts while falling
    g.save(); g.translate(S.c[0] + 0.012, S.c[1] - 0.014); g.rotate(S.rot);
    g.fillStyle = `rgba(2,6,26,${0.45 * fall})`; rrect(g, -S.w / 2, -S.h / 2, S.w, S.h, 0.03); g.fill();
    g.restore();
    g.save(); g.globalAlpha = a; g.translate(S.c[0], S.c[1]); g.rotate(S.rot); g.scale(sc, sc * sy);
    const Wd = S.w + 0.04, Hd = S.h + 0.04;
    g.save(); g.scale(1, -1); g.drawImage((this.stampCv ??= this.makeStamp()), -Wd / 2, -Hd / 2, Wd, Hd); g.restore(); // the canvas is y-down
    g.restore();
    if (hit) {
      // shock ring + red ink dust
      const rk = clamp01(age / 0.35), ra = (1 - rk) * (1 - rk);
      if (ra > 0.01) {
        const gw = S.w + 0.18 * glide(rk), gh = S.h + 0.18 * glide(rk);
        g.save(); g.translate(S.c[0], S.c[1]); g.rotate(S.rot);
        g.strokeStyle = `rgba(255,255,255,${0.9 * ra})`; g.lineWidth = 0.008 * (1 - rk) + 0.001; rrect(g, -gw / 2, -gh / 2, gw, gh, 0.04); g.stroke();
        for (let m = 0; m < 12; m++) {
          const ang = hash(m * 3.7) * TAU, dd = 0.05 + 0.25 * glide(rk) * (0.6 + 0.4 * hash(m)), x = Math.cos(ang) * (S.w / 2) * 0.9 + Math.cos(ang) * dd, y = Math.sin(ang) * (S.h / 2) + Math.sin(ang) * dd * 0.5;
          g.fillStyle = `rgba(232,19,44,${ra})`; g.beginPath(); g.arc(x, y, 0.006 * (1 - rk) + 0.002, 0, TAU); g.fill();
        }
        g.restore();
        q.save(); q.globalAlpha = 0.8 * ra; q.translate(S.c[0], S.c[1]); q.rotate(S.rot); q.strokeStyle = "#ffffff"; q.lineWidth = 0.03; rrect(q, -gw / 2, -gh / 2, gw, gh, 0.04); q.stroke(); q.restore();
      }
      // a white flash over the whole hand at the hit
      const fk = Math.exp(-age / 0.07);
      if (fk > 0.02) blob(q, 0, 0.02, 0.42, `rgba(255,255,255,${0.7 * fk})`, "rgba(200,240,255,0)");
    }
  }
}

// ============================== root ==============================
export class Holo {
  root = new THREE.Group();
  private hand = new XrayHand();
  private dbg: THREE.Group | null = null;
  constructor() { this.root.add(this.hand.b.group); }
  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    if (DEBUG) this.debug(id, t, cam);
    this.hand.update(id, t, cam);
  }
  /** TEMP stand-ins + the recommended camera (stills only) */
  private debug(id: number, t: number, cam: THREE.PerspectiveCamera) {
    if (id === 2) { const c = xrayCam(id, t); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    if (!this.dbg) {
      const mat = (col: string) => new THREE.MeshBasicMaterial({ color: col });
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat("#e8b48a")); wall.position.set(0, 1.5, -1.2);
      const tub = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 0.8), mat("#f4f0ea")); tub.position.set(0, 0.31, 0);
      const foam = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 0.7), mat("#ffffff")); foam.position.set(0, 0.7, 0);
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.26, 40), mat("#f2c9a0")); head.position.set(0, 1.15, 0.05);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.05), mat("#f2c9a0")); arm.position.set(0.35, 0.95, 0.12);
      g.add(wall, tub, foam, head, arm); g.position.set(...BATH);
      g.traverse((o) => { o.frustumCulled = false; });
      this.dbg = g; this.root.add(g);
    }
    this.dbg.visible = id === 2;
  }
}
