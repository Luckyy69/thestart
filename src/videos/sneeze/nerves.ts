// OWNER: nerves agent. See /home/user/lookmatch/SNEEZE_BRIEF.md
// The X-RAY HEAD of "The Sun Sneeze" (shot 4 at STREET), all driven by nervesAt(id, t):
//   * a big glowing hologram HEAD in side profile (face = screen right) floating over BEAN's head: navy X-ray backing,
//     cyan rim, faint skull / jaw / vertebrae, a lavender brain with a little face, the eyeball and the nose.
//   * the green SNEEZE nerve (brain -> nose) and the gold LIGHT nerve (eye -> brain) run side by side through one
//     shared trunk and CROSS in the middle (`crossed`: ghost lanes + the "CROSSED WIRES!" pill; `sneezeNerve` /
//     `lightNerve`: each cable draws itself, with a name tag).
//   * `flood`: low-sun beams pour into the eye from screen right, the eye blazes, gold pulses race to the brain.
//   * `jump`: electric sparks arc from the gold cable to the green one, green pulses race to the nose, the nose lights
//     up (pink-hot, tingle rays), building to the ACHOO cut.
//   * `thought`: the brain looks confused; a white thought cloud "LIGHT? / ...MUST BE SOMETHING / IN THE NOSE!"
//     (lines timed to the voice).
// Technique (after tickle/brain.ts): one 1900 px/m canvas plane in a head-local frame yawed toward the camera, a
// depth-only twin (keeps world ink lines off it) and an additive HDR glow twin IN FRONT (bloom source). All NOINK,
// never frustum culled, pure functions of (id, t).
import * as THREE from "three";
import { rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { STREET, W, V3, FPS, nervesAt, camAt, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: recommended framing + a stand-in head for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const back = (u: number) => { const x = clamp01(u), c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bump = (t: number, a: number, b: number, r = 0.2) => smooth((t - a) / r) * (1 - smooth((t - b) / r));
const cyc = (x: number) => ((x % 1) + 1) % 1;

// ============================== public contracts ==============================
/** cast override: BEAN's head centre (world) per (id, t); undefined -> default HEAD */
export const NERVES_HOOKS: { head?: (id: number, t: number) => V3 | undefined } = {};
export const HEAD: V3 = add(STREET, 0, 1.45, 0);
export const headPos = (id: number, t: number): V3 => NERVES_HOOKS.head?.(id, t) ?? HEAD;
/** the hologram floats this far in front of the head centre (m, toward the camera): in front of BEAN's face card */
export const HOLO_D = 0.2;
/** head-local layout in metres (x = screen right, y = up, origin = head centre). Whole hologram box x -0.36..0.42,
 *  y -0.41..0.64. Recommended framing: look at head+(0.03, 0.1), camera 2.7 m in front, fov 32 (frame ~1.43 x 0.81 m
 *  at the hologram plane): captions (70 %) then fall on the jaw/neck (y ~ -0.19) below every label, and the bubble top
 *  (y 0.63) stays under the watermark band. */
export const NERVE_LAYOUT = {
  box: { x0: -0.36, x1: 0.42, y0: -0.41, y1: 0.64 },
  eye: [0.2, 0.055] as P2, nose: [0.29, -0.035] as P2, cross: [0, -0.01] as P2, brain: [-0.05, 0.17] as P2,
  bubble: { c: [0.04, 0.49] as P2, w: 0.62, h: 0.23 },
  label: { c: [-0.02, -0.112] as P2, w: 0.34, h: 0.075 },
  lightTag: [0.3, 0.2] as P2, sneezeTag: [0.3, -0.118] as P2,
  look: [0.03, 0.1] as P2,
};
const frameAt = (id: number, t: number) => {
  const o = headPos(id, t), c = camAt(id, Math.round(t * FPS)).pos;
  const yaw = Math.atan2(c[0] - o[0], c[2] - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)] as V3, N: [Math.sin(yaw), 0, Math.cos(yaw)] as V3 };
};
type Frame = ReturnType<typeof frameAt>;
const toW = (F: Frame, x: number, y: number, d = HOLO_D): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** world position of a head-local point on the hologram plane */
export const holoPoint = (id: number, t: number, x: number, y: number): V3 => toW(frameAt(id, t), x, y);
/** world positions of the X-ray eye, nose and the crossing (e.g. for a push-in / the ACHOO transition) */
export const eyePos = (id: number, t: number): V3 => holoPoint(id, t, ...NERVE_LAYOUT.eye);
export const nosePos = (id: number, t: number): V3 => holoPoint(id, t, ...NERVE_LAYOUT.nose);
export const crossPos = (id: number, t: number): V3 => holoPoint(id, t, ...NERVE_LAYOUT.cross);
/** recommended camera for shot 4 (pos, look, fov) */
export const nervesCam = (id: number, t: number, dist = 2.7) => {
  const F = frameAt(id, t), L = NERVE_LAYOUT.look;
  return { pos: toW(F, L[0], L[1], dist), look: toW(F, L[0], L[1], 0), fov: 32 };
};

// ============================== canvas geometry ==============================
const B = NERVE_LAYOUT.box;
const S = 1900; // px per metre
const CW = Math.round((B.x1 - B.x0) * S), CH = Math.round((B.y1 - B.y0) * S); // 1482 x 1995
const GS = 0.25; // glow canvas scale
const P = (x: number, y: number): P2 => [(x - B.x0) * S, (B.y1 - y) * S];
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
const openPath = (pts: P2[]) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(...q) : p.moveTo(...q))); return p; };
const mpath = (m: P2[], n: number) => openPath(crPts(m.map(([x, y]) => P(x, y)), n, false));
type Poly = { pts: P2[]; cum: number[]; len: number };
const poly = (mpts: P2[]): Poly => {
  const pts = crPts(mpts.map(([x, y]) => P(x, y)), 14, false), cum = [0];
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

// the head silhouette (face to the right, cartoon bulb nose)
const HEAD_PTS: P2[] = [
  [-0.27, 0.08], [-0.235, 0.22], [-0.13, 0.31], [0.0, 0.335], [0.12, 0.31], [0.205, 0.235], [0.243, 0.14], [0.25, 0.095],
  [0.238, 0.06], [0.248, 0.025], [0.29, 0.004], [0.33, -0.018], [0.336, -0.048], [0.31, -0.07], [0.268, -0.075],
  [0.272, -0.098], [0.262, -0.122], [0.272, -0.148], [0.255, -0.19], [0.215, -0.225], [0.14, -0.245], [0.075, -0.255],
  [0.06, -0.3], [0.05, -0.345], [-0.035, -0.372], [-0.12, -0.345], [-0.135, -0.29], [-0.2, -0.17], [-0.262, -0.06],
];
const LANE_T = 0.008, LANE_B = -0.028;
// green SNEEZE nerve, brain -> nose; gold LIGHT nerve, eye -> brain. They swap lanes at the crossing (0, -0.01).
const GREEN_M: P2[] = [[-0.12, 0.08], [-0.15, 0.035], [-0.12, LANE_T], [-0.06, LANE_T], [-0.03, 0.004], [0, -0.01], [0.03, -0.024], [0.06, LANE_B], [0.12, LANE_B], [0.18, -0.031], [0.232, -0.036], [0.272, -0.038]];
const GOLD_M: P2[] = [[0.19, 0.055], [0.163, 0.036], [0.12, LANE_T + 0.002], [0.06, LANE_T], [0.03, 0.004], [0, -0.01], [-0.03, -0.024], [-0.06, LANE_B], [-0.12, LANE_B], [-0.18, -0.022], [-0.215, 0.02], [-0.222, 0.075], [-0.208, 0.128]];
const GREEN = poly(GREEN_M), GOLD = poly(GOLD_M);
const XG = P(0, -0.01);
const UG_CROSS = nearestU(GREEN, XG);
const CABLE_W = 0.022 * S;

const buildGeo = () => {
  const head = loopPath(crPts(HEAD_PTS.map(([x, y]) => P(x, y)), 10, true));
  // brain: scalloped ellipse
  const [bx, by] = NERVE_LAYOUT.brain, rx = 0.19, ry = 0.12, n = 18;
  const bpts: P2[] = [];
  for (let k = 0; k < n; k++) { const a = (k / n) * TAU; bpts.push(P(bx + rx * Math.cos(a) * (1 - 0.06 * Math.max(0, -Math.sin(a))), by + ry * Math.sin(a))); }
  const brain = new Path2D(), c = P(bx, by);
  brain.moveTo(...bpts[0]);
  for (let k = 0; k < n; k++) {
    const a = bpts[k], b = bpts[(k + 1) % n], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const ox = mx - c[0], oy = my - c[1], ol = Math.hypot(ox, oy) || 1, bl = 0.36 * Math.hypot(b[0] - a[0], b[1] - a[1]);
    brain.quadraticCurveTo(mx + (ox / ol) * bl, my + (oy / ol) * bl, b[0], b[1]);
  }
  brain.closePath();
  // gyri: seeded squiggly worms
  const r = rng(31), gyri: Path2D[] = [];
  for (let row = 0; row < 4; row++) {
    const y0 = by + 0.075 - row * 0.05, p = new Path2D();
    let x = bx - 0.2 + r() * 0.03, y = y0;
    p.moveTo(...P(x, y));
    for (let k = 0; k < 9; k++) {
      const nx = x + 0.045 + r() * 0.01, ny = y0 + (r() - 0.5) * 0.02, amp = (k % 2 ? 1 : -1) * (0.022 + r() * 0.012);
      const cc = P((x + nx) / 2, (y + ny) / 2 + amp);
      p.quadraticCurveTo(cc[0], cc[1], ...P(nx, ny)); x = nx; y = ny;
    }
    gyri.push(p);
  }
  const fiss = mpath([[0.02, 0.285], [0.035, 0.22], [0.0, 0.16], [0.03, 0.1]], 8);
  // skull bits (faint bone)
  const cranium = mpath([[-0.24, -0.03], [-0.245, 0.11], [-0.19, 0.245], [-0.06, 0.31], [0.08, 0.3], [0.185, 0.225], [0.222, 0.12], [0.218, 0.095]], 10);
  const jaw = mpath([[0.238, -0.165], [0.2, -0.205], [0.12, -0.222], [0.04, -0.205], [-0.01, -0.15], [-0.03, -0.085]], 10);
  const cheek = mpath([[0.235, 0.005], [0.2, -0.06], [0.215, -0.11]], 8);
  const verts: P2[] = [[-0.035, -0.26], [-0.04, -0.305]];
  return { head, brain, gyri, fiss, cranium, jaw, cheek, verts };
};

const INK = "#0a0d2e";
type Paint = string | CanvasGradient;
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: Paint, stroke: Paint = INK, sw = 0.18, weight = 900) => {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (sw > 0) { g.lineWidth = size * sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};
const rrect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const strokePts = (g: CanvasRenderingContext2D, pts: P2[]) => { if (pts.length < 2) return; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.stroke(); };
const star = (g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, col: string, rot = 0) => {
  if (r <= 0.5 || a <= 0.01) return;
  g.save(); g.globalAlpha *= Math.min(1, a); g.fillStyle = col; g.translate(x, y); g.rotate(rot); g.beginPath();
  for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU, rr = k % 2 ? r * 0.26 : r; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
  g.closePath(); g.fill(); g.restore();
};
const blob = (g: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string) => {
  if (r <= 0.5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
};

// ============================== state ==============================
type St = ReturnType<typeof nervesAt> & { nose: number; noseHot: number; mixes: number; l1: number; l2: number; l3: number; lid: number };
const stateAt = (id: number, t: number): St => {
  const N = nervesAt(id, t);
  const nose = smooth((t - (W.signals - 0.05)) / 0.7) * N.jump;
  const noseHot = clamp01(nose * (0.75 + 0.25 * smooth((t - (W.nose1 - 0.1)) / 0.3)) + 0.15 * bump(t, W.nose1 - 0.1, W.nose1 + 0.35, 0.12));
  return {
    ...N, nose, noseHot,
    mixes: bump(t, W.mixes - 0.15, W.signals + 0.5, 0.2),
    l1: smooth((t - (W.light1 - 0.12)) / 0.25), l2: smooth((t - 36.55) / 0.3), l3: smooth((t - 37.24) / 0.3),
    lid: smooth((t - (W.floods - 0.1)) / 0.35) * 0.45,
  };
};

class Plane {
  cv = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  constructor(w: number, h: number) {
    this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
}

export class Nerves {
  root = new THREE.Group();
  private holo = new THREE.Group();
  private main = new Plane(CW, CH);
  private glow = new Plane(Math.round(CW * GS), Math.round(CH * GS));
  private mats: THREE.MeshBasicMaterial[] = [];
  private geo = buildGeo();
  private last = "";
  private dbg: THREE.Group | null = null;

  constructor() {
    const geo = new THREE.PlaneGeometry(CW / S, CH / S);
    const mk = (m: THREE.MeshBasicMaterial, z: number, ro: number) => {
      const me = new THREE.Mesh(geo, m); me.position.set((B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, z); me.renderOrder = ro;
      me.layers.set(NOINK); me.frustumCulled = false; this.holo.add(me); this.mats.push(m);
    };
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0, 30);
    // depth-only twin: keeps the world's ink pass from drawing background outlines across the hologram
    mk(new THREE.MeshBasicMaterial({ map: this.main.tex, transparent: true, alphaTest: 0.5, colorWrite: false, depthWrite: true, fog: false, side: THREE.DoubleSide }), 0, 31);
    // HDR additive glow IN FRONT: pulses, sparks, eye + nose blaze bloom
    mk(new THREE.MeshBasicMaterial({ map: this.glow.tex, color: new THREE.Color(1.7, 1.7, 1.7), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }), 0.004, 32);
    this.holo.visible = false;
    this.root.add(this.holo);
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    const N = nervesAt(id, t);
    const show = id === 4 ? N.show : 0;
    this.holo.visible = show > 0.002;
    if (this.dbg) this.dbg.visible = id === 4;
    if (!this.holo.visible) return;
    const F = frameAt(id, t);
    this.holo.position.set(...toW(F, 0, 0)); this.holo.rotation.set(0, F.yaw, 0);
    this.holo.scale.setScalar(0.9 + 0.1 * glide(show));
    for (const m of this.mats) m.opacity = show;
    const key = `${id}_${t.toFixed(4)}`;
    if (key === this.last) return;
    this.last = key;
    this.draw(id, t, show);
  }

  // ------------------------------ drawing ------------------------------
  private draw(id: number, t: number, show: number) {
    const g = this.main.g, q = this.glow.g, X = stateAt(id, t);
    const rev = glide(show), wipe = lerp(P(0, -0.41)[1], P(0, 0.4)[1], rev);
    for (const [c, k] of [[g, 1], [q, GS]] as [CanvasRenderingContext2D, number][]) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW * k, CH * k); c.save(); c.scale(k, k);
      c.lineCap = "round"; c.lineJoin = "round"; c.globalAlpha = 1;
      if (rev < 0.999) { c.beginPath(); c.rect(0, wipe, CW, CH); c.clip(); }
    }
    this.drawHead(g, q, t, X);
    this.drawBeams(g, q, t, X);
    this.drawNerves(g, q, t, X);
    this.drawBrain(g, q, t, X);
    this.drawEye(g, q, t, X);
    this.drawNose(g, q, t, X);
    this.drawSparks(g, q, t, X);
    this.drawTags(g, t, X);
    this.drawLabel(g, q, t, X);
    this.drawBubble(g, t, X);
    g.restore(); q.restore();
    if (rev > 0.001 && rev < 0.999) { // scan-wipe edge line
      const a = Math.sin(Math.PI * rev), [x0] = P(-0.3, 0), [x1] = P(0.36, 0);
      const lg = g.createLinearGradient(0, wipe - 26, 0, wipe + 26);
      lg.addColorStop(0, "rgba(140,240,255,0)"); lg.addColorStop(0.5, `rgba(230,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,240,255,0)");
      g.save(); g.clip(this.geo.head); g.fillStyle = lg; g.fillRect(x0, wipe - 26, x1 - x0, 52); g.restore();
      q.setTransform(GS, 0, 0, GS, 0, 0); q.save(); q.clip(this.geo.head); q.fillStyle = `rgba(120,230,255,${0.8 * a})`; q.fillRect(x0, wipe - 10, x1 - x0, 20); q.restore();
    }
    this.main.tex.needsUpdate = true; this.glow.tex.needsUpdate = true;
  }

  private drawHead(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const G = this.geo;
    g.save();
    // soft dark halo hugging the silhouette so it reads over any background
    for (const [w, a] of [[110, 0.1], [64, 0.16], [30, 0.24]] as [number, number][]) { g.strokeStyle = `rgba(3,6,28,${a})`; g.lineWidth = w; g.stroke(G.head); }
    const [hx, hy] = P(0.02, 0.06);
    const bg = g.createRadialGradient(hx, hy, 40, hx, hy, 0.42 * S);
    bg.addColorStop(0, "rgba(22,40,110,0.94)"); bg.addColorStop(0.7, "rgba(12,20,72,0.95)"); bg.addColorStop(1, "rgba(30,14,80,0.96)");
    g.fillStyle = bg; g.fill(G.head);
    g.save(); g.clip(G.head);
    if (X.flood > 0.01) { // warm wash: the light pours in
      const [ex, ey] = P(...NERVE_LAYOUT.eye), wg = g.createRadialGradient(ex, ey, 10, ex, ey, 0.5 * S);
      wg.addColorStop(0, `rgba(255,200,90,${0.42 * X.flood})`); wg.addColorStop(1, "rgba(255,170,60,0)");
      g.fillStyle = wg; g.fillRect(0, 0, CW, CH);
    }
    // hologram grid + moving scanlines
    g.strokeStyle = "rgba(120,200,255,0.08)"; g.lineWidth = 2;
    for (let x = 0; x < CW; x += 0.04 * S) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, CH); g.stroke(); }
    for (let y = 0; y < CH; y += 0.04 * S) { g.beginPath(); g.moveTo(0, y); g.lineTo(CW, y); g.stroke(); }
    g.fillStyle = "rgba(180,235,255,0.05)";
    for (let y = (t * 70) % 16; y < CH; y += 16) g.fillRect(0, y, CW, 5);
    // faint bone
    g.strokeStyle = "rgba(170,215,255,0.22)"; g.lineWidth = 22; g.stroke(G.cranium); g.stroke(G.jaw); g.stroke(G.cheek);
    g.strokeStyle = "rgba(220,240,255,0.28)"; g.lineWidth = 6; g.stroke(G.cranium); g.stroke(G.jaw); g.stroke(G.cheek);
    const [ex, ey] = P(...NERVE_LAYOUT.eye); // eye socket ring
    g.strokeStyle = "rgba(170,215,255,0.2)"; g.lineWidth = 14; g.beginPath(); g.arc(ex - 6, ey, 0.058 * S, 0, TAU); g.stroke();
    for (const [x, y] of G.verts) { const [vx, vy] = P(x, y); g.fillStyle = "rgba(170,215,255,0.18)"; rrect(g, vx - 0.03 * S, vy - 0.016 * S, 0.06 * S, 0.032 * S, 14); g.fill(); }
    const sh = g.createLinearGradient(0, P(0, 0.33)[1], 0, P(0, 0.15)[1]); // glass sheen
    sh.addColorStop(0, "rgba(255,255,255,0.12)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = sh; g.fillRect(0, 0, CW, CH);
    g.restore();
    g.strokeStyle = "#69dcff"; g.lineWidth = 22; g.stroke(G.head); // rim: cyan + white core
    g.strokeStyle = "#f2fdff"; g.lineWidth = 7; g.stroke(G.head);
    g.restore();
    q.strokeStyle = "rgba(70,200,255,0.16)"; q.lineWidth = 60; q.stroke(G.head);
    q.strokeStyle = "rgba(90,220,255,0.35)"; q.lineWidth = 22; q.stroke(G.head);
  }

  private drawBeams(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const f = X.flood;
    if (f < 0.005) return;
    const [ex, ey] = P(NERVE_LAYOUT.eye[0] + 0.02, NERVE_LAYOUT.eye[1]);
    const R = CW + 40, x0 = lerp(R, ex, glide(f)); // the beam front races in from the right edge
    const top = P(0.43, 0.14)[1], bot = P(0.43, 0.012)[1];
    const wedge = new Path2D(); wedge.moveTo(R, top); wedge.lineTo(ex, ey - 0.012 * S); wedge.lineTo(ex, ey + 0.012 * S); wedge.lineTo(R, bot); wedge.closePath();
    const clipX = new Path2D(); clipX.rect(x0, 0, CW + 100, CH);
    g.save(); q.save(); g.clip(clipX); q.clip(clipX);
    const lg = g.createLinearGradient(R, 0, ex, 0);
    lg.addColorStop(0, `rgba(255,214,120,${0.35 * f})`); lg.addColorStop(1, `rgba(255,250,220,${0.85 * f})`);
    g.fillStyle = lg; g.fill(wedge);
    q.fillStyle = `rgba(255,200,90,${0.25 * f})`; q.fill(wedge);
    [0.135, 0.105, 0.075, 0.045, 0.018].forEach((y, i) => {
      const yy = P(0, y)[1], w = (0.006 + 0.003 * (i % 2)) * S * (0.85 + 0.15 * Math.sin(t * 9 + i * 2));
      g.strokeStyle = `rgba(255,252,230,${0.8 * f})`; g.lineWidth = w; g.beginPath(); g.moveTo(R, yy); g.lineTo(ex, ey); g.stroke();
      q.strokeStyle = `rgba(255,220,130,${0.45 * f})`; q.lineWidth = w * 1.8; q.beginPath(); q.moveTo(R, yy); q.lineTo(ex, ey); q.stroke();
    });
    const r = rng(77); // photons streaming in
    for (let k = 0; k < 16; k++) {
      const yy = P(0, 0.02 + r() * 0.11)[1], sp = 0.9 + r() * 0.6, ph = r(), sz = r(), u = cyc(t * sp + ph);
      const x = lerp(R, ex, u), y = lerp(yy, ey, u), a = f * Math.sin(Math.PI * u);
      if (x < x0) continue;
      star(g, x, y, (14 + 10 * sz) * (1 - 0.5 * u), a, "#fffbe8", t * 3 + k);
      blob(q, x, y, 30, `rgba(255,230,150,${0.9 * a})`, "rgba(255,200,80,0)");
    }
    g.restore(); q.restore();
  }

  private cable(g: CanvasRenderingContext2D, pts: P2[], base: string, dark: string, hi: string, w: number) {
    g.strokeStyle = INK; g.lineWidth = w + 13; strokePts(g, pts);
    g.strokeStyle = base; g.lineWidth = w; strokePts(g, pts);
    g.strokeStyle = dark; g.lineWidth = w * 0.18; g.save(); g.translate(0, w * 0.2); strokePts(g, pts); g.restore();
    g.strokeStyle = hi; g.lineWidth = w * 0.28; g.save(); g.translate(-1, -w * 0.22); strokePts(g, pts); g.restore();
  }
  private drawNerves(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const W2 = CABLE_W;
    const ghost = X.crossed * (1 - 0.8 * Math.min(X.sneezeNerve, X.lightNerve)); // ghost lanes on `crossed`
    if (ghost > 0.01) {
      g.save(); g.setLineDash([16, 18]); g.lineDashOffset = -t * 60; g.lineWidth = 7;
      g.strokeStyle = `rgba(70,255,140,${0.55 * ghost})`; strokePts(g, GREEN.pts);
      g.strokeStyle = `rgba(255,200,60,${0.55 * ghost})`; strokePts(g, GOLD.pts);
      g.restore();
    }
    const sn = X.sneezeNerve, ln = X.lightNerve;
    if (sn > 0.002) { // green first (under), gold over at the crossing
      const pts = polySub(GREEN, 0, sn);
      this.cable(g, pts, X.jump > 0.3 ? "#5dff9e" : "#2fe07c", "#0d8a48", "#dcffe9", W2);
      q.strokeStyle = `rgba(60,255,140,${0.2 + 0.25 * X.jump})`; q.lineWidth = W2 * 2; strokePts(q, pts);
      if (sn > 0.97) this.fan(g, smooth((sn - 0.97) / 0.03), X.nose);
      if (sn < 0.999) { const e = polyAt(GREEN, sn); star(g, e.x, e.y, 34, 1, "#eafff2", t * 4); blob(q, e.x, e.y, 70, "rgba(120,255,170,1)", "rgba(60,255,140,0)"); }
    }
    if (ln > 0.002) {
      const pts = polySub(GOLD, 0, ln);
      this.cable(g, pts, X.flood > 0.3 ? "#ffd84a" : "#ffbf24", "#a86400", "#fff6c8", W2);
      q.strokeStyle = `rgba(255,190,60,${0.2 + 0.25 * X.flood})`; q.lineWidth = W2 * 2; strokePts(q, pts);
      if (ln < 0.999) { const e = polyAt(GOLD, ln); star(g, e.x, e.y, 34, 1, "#fffbe0", t * 4); blob(q, e.x, e.y, 70, "rgba(255,230,140,1)", "rgba(255,190,60,0)"); }
    }
    const ck = Math.min(sn, ln); // a ring where they cross
    if (ck > 0.6) {
      const a = smooth((ck - 0.6) / 0.4), pu = 0.5 + 0.5 * Math.sin(t * 6);
      g.strokeStyle = `rgba(255,255,255,${0.6 * a})`; g.lineWidth = 5; g.beginPath(); g.arc(XG[0], XG[1], 0.042 * S * (1 + 0.08 * pu), 0, TAU); g.stroke();
    }
    if (X.flood > 0.01 && ln > 0.99) // gold pulses eye -> brain on `flood`
      for (let k = 0; k < 6; k++) this.pulse(g, q, GOLD, cyc((t - W.floods) * 1.35 + k / 6), X.flood, "#fffbe6", "rgba(255,225,120,1)", "rgba(255,190,60,0)", 1 + 0.3 * X.flood);
    if (X.jump > 0.01 && sn > 0.99) // green pulses crossing -> nose on `jump`
      for (let k = 0; k < 5; k++) this.pulse(g, q, GREEN, lerp(UG_CROSS, 1, cyc((t - W.signals) * 1.9 + k / 5)), X.jump, "#f0fff5", "rgba(150,255,190,1)", "rgba(60,255,140,0)", 1.15);
  }
  private pulse(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, p: Poly, u: number, a: number, core: string, gin: string, gout: string, sz: number) {
    const e = polyAt(p, u), fade = a * Math.min(1, u * 12, (1 - u) * 12);
    if (fade < 0.01) return;
    g.save(); g.globalAlpha = fade; g.translate(e.x, e.y); g.rotate(e.a);
    g.fillStyle = core; g.beginPath(); g.ellipse(0, 0, 30 * sz, 11 * sz, 0, 0, TAU); g.fill(); g.restore();
    q.save(); q.globalAlpha = fade; blob(q, e.x, e.y, 64 * sz, gin, gout); q.restore();
  }
  private fan(g: CanvasRenderingContext2D, k: number, nose: number) {
    const s = P(0.268, -0.038), ends: P2[] = [[0.3, -0.012], [0.31, -0.038], [0.298, -0.062]];
    for (const [x, y] of ends) {
      const e = P(lerp(0.268, x, k), lerp(-0.038, y, k));
      g.strokeStyle = INK; g.lineWidth = 16; g.beginPath(); g.moveTo(...s); g.lineTo(...e); g.stroke();
      g.strokeStyle = nose > 0.3 ? "#b6ffd2" : "#2fe07c"; g.lineWidth = 8; g.beginPath(); g.moveTo(...s); g.lineTo(...e); g.stroke();
      g.fillStyle = "#dcffe9"; g.beginPath(); g.arc(e[0], e[1], 7 * k + 0.1, 0, TAU); g.fill();
    }
  }

  private drawBrain(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const G = this.geo, [bx, by] = P(...NERVE_LAYOUT.brain);
    const flick = X.mixes * (0.6 + 0.4 * Math.sin(t * 37) * Math.sin(t * 13)); // signals mixing: gold/green flicker
    const fg = g.createRadialGradient(bx + 0.06 * S, by - 0.06 * S, 20, bx, by, 0.24 * S);
    fg.addColorStop(0, "rgba(236,200,255,0.92)"); fg.addColorStop(1, "rgba(150,110,235,0.9)");
    g.fillStyle = fg; g.fill(G.brain);
    g.save(); g.clip(G.brain);
    if (flick > 0.01) {
      const mg = g.createLinearGradient(bx - 0.19 * S, 0, bx + 0.19 * S, 0);
      mg.addColorStop(0, `rgba(255,200,60,${0.4 * flick})`); mg.addColorStop(1, `rgba(60,255,140,${0.4 * flick})`);
      g.fillStyle = mg; g.fillRect(0, 0, CW, CH);
    }
    g.strokeStyle = "rgba(90,40,170,0.6)"; g.lineWidth = 22; for (const p of G.gyri) g.stroke(p); g.lineWidth = 26; g.stroke(G.fiss);
    g.strokeStyle = "rgba(255,245,255,0.85)"; g.lineWidth = 8; g.save(); g.translate(-5, -7); for (const p of G.gyri) g.stroke(p); g.stroke(G.fiss); g.restore();
    g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.ellipse(bx + 0.02 * S, by - 0.085 * S, 0.12 * S, 0.022 * S, -0.05, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 14; g.stroke(G.brain);
    g.strokeStyle = "#f3e2ff"; g.lineWidth = 5; g.stroke(G.brain);
    q.strokeStyle = `rgba(200,140,255,${0.3 + 0.4 * flick})`; q.lineWidth = 40; q.stroke(G.brain);
    if (flick > 0.01) { q.fillStyle = `rgba(255,220,140,${0.25 * flick})`; q.fill(G.brain); }
    this.brainFace(g, t, X);
    if (X.thought > 0.01) { // confused "?" marks
      for (let k = 0; k < 2; k++) {
        const u = cyc((t - W.light1) * 0.6 + k * 0.5), a = X.thought * Math.sin(Math.PI * u);
        const [x, y] = P(-0.19 + k * 0.08, 0.27 + 0.06 * u);
        g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate((k ? 0.25 : -0.25) + 0.1 * Math.sin(t * 5 + k));
        text(g, "?", 0, 0, 0.065 * S, "#ffffff", INK, 0.2); g.restore();
      }
    }
  }
  private brainFace(g: CanvasRenderingContext2D, t: number, X: St) {
    const conf = X.thought;
    const surprise = Math.max(smooth((t - (W.floods - 0.1)) / 0.3), bump(t, W.signals - 0.4, W.light1 - 0.3, 0.15)) * (1 - conf);
    const toLight = smooth((t - (W.floods - 0.2)) / 0.3);
    let lx = lerp(0.5, 0.9, toLight), ly = lerp(0.1, 0.2, toLight);
    lx = lerp(lx, 0.6, conf); ly = lerp(ly, -0.9, conf * smooth((t - (W.nose1 - 0.5)) / 0.3)); // looks down at the nose
    let blink = 0;
    for (const b of [24.1, 27.6, 30.2, 32.6]) blink = Math.max(blink, 1 - clamp01(Math.abs(t - b) / 0.07));
    const eyes: P2[] = [P(0.045, 0.185), P(0.1, 0.18)], rx = 0.019 * S, ry = 0.024 * S * (1 + 0.15 * surprise);
    eyes.forEach((c, i) => {
      g.save(); g.translate(c[0], c[1]);
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
      g.save(); g.clip();
      const pr = rx * (0.62 - 0.14 * surprise), px = lx * rx * 0.4, py = -ly * ry * 0.4;
      g.fillStyle = INK; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(px - pr * 0.35, py - pr * 0.35, pr * 0.32, 0, TAU); g.fill();
      if (blink > 0.01) { g.fillStyle = "#c9a8ff"; g.fillRect(-rx * 1.3, -ry * 1.2, rx * 2.6, 2 * ry * 1.2 * blink); }
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
      const by = -ry - 16 - 10 * surprise - (i ? 18 : -4) * conf, ang = conf * (i ? -0.35 : 0.3); // brows
      g.save(); g.translate(0, by); g.rotate(ang); g.strokeStyle = INK; g.lineWidth = 9;
      g.beginPath(); g.moveTo(-rx * 0.9, 4); g.quadraticCurveTo(0, -8 - 6 * surprise, rx * 0.9, 4); g.stroke(); g.restore();
      g.restore();
    });
    const [mx, my] = P(0.074, 0.137);
    g.save(); g.translate(mx, my); g.strokeStyle = INK; g.lineWidth = 8;
    if (conf > 0.05) { // wobbly squiggle
      g.beginPath();
      for (let k = 0; k <= 12; k++) { const x = lerp(-0.03, 0.03, k / 12) * S, y = Math.sin(k * 1.4 + t * 6) * 6 * conf; if (k) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    } else if (surprise > 0.05) { g.fillStyle = "#4a1060"; g.beginPath(); g.ellipse(0, 4, 0.011 * S * (0.6 + 0.4 * surprise), 0.015 * S * surprise + 3, 0, 0, TAU); g.fill(); g.stroke(); }
    else { g.beginPath(); g.moveTo(-0.022 * S, 0); g.quadraticCurveTo(0, 16, 0.022 * S, 0); g.stroke(); }
    g.restore();
  }

  private drawEye(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const [ex, ey] = P(...NERVE_LAYOUT.eye), rx = 0.038 * S, ry = 0.044 * S, f = X.flood;
    g.save(); g.translate(ex, ey);
    const eg = g.createRadialGradient(rx * 0.3, -ry * 0.2, 4, 0, 0, ry * 1.1);
    eg.addColorStop(0, `rgb(255,${Math.round(lerp(255, 250, f))},${Math.round(lerp(255, 200, f))})`);
    eg.addColorStop(1, `rgb(${Math.round(lerp(190, 255, f))},${Math.round(lerp(225, 210, f))},${Math.round(lerp(255, 110, f))})`);
    g.fillStyle = eg; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
    g.save(); g.clip();
    const ix = rx * 0.55, pr = ry * (0.42 - 0.14 * f); // iris at the front (looking right, into the light); pupil shrinks
    g.fillStyle = "#2a6ad8"; g.beginPath(); g.ellipse(ix, 0, rx * 0.42, ry * 0.5, 0, 0, TAU); g.fill();
    g.fillStyle = INK; g.beginPath(); g.ellipse(ix + 4, 0, pr * 0.55, pr, 0, 0, TAU); g.fill();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(ix - 6, -ry * 0.22, ry * 0.13, 0, TAU); g.fill();
    const lidY = -ry + ry * (0.1 + 1.6 * X.lid);
    if (X.lid > 0.01) { g.fillStyle = "#7a5ad8"; g.fillRect(-rx * 1.4, -ry * 1.2, rx * 2.8, lidY + ry * 1.2); }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
    if (X.lid > 0.01) { g.beginPath(); g.moveTo(-rx * 0.95, lidY); g.lineTo(rx * 1.05, lidY + 4); g.stroke(); }
    g.restore();
    if (f > 0.01) { // blaze
      const pu = 0.85 + 0.15 * Math.sin(t * 11);
      star(g, ex + rx * 0.7, ey, 0.07 * S * f * pu, f, "#fffdf0", t * 0.8);
      blob(q, ex + rx * 0.4, ey, 0.085 * S * f, `rgba(255,240,180,${0.75 * f})`, "rgba(255,200,80,0)");
    }
  }

  private drawNose(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const [nx, ny] = P(...NERVE_LAYOUT.nose), n = X.noseHot;
    g.save(); g.clip(this.geo.head);
    const cg = g.createRadialGradient(nx + 10, ny, 6, nx, ny, 0.06 * S);
    cg.addColorStop(0, `rgba(${Math.round(lerp(180, 255, n))},${Math.round(lerp(220, 240, n))},${Math.round(lerp(255, 250, n))},${lerp(0.25, 1, n)})`);
    cg.addColorStop(0.55, `rgba(${Math.round(lerp(120, 255, n))},${Math.round(lerp(180, 90, n))},${Math.round(lerp(255, 140, n))},${lerp(0.2, 0.9, n)})`);
    cg.addColorStop(1, "rgba(255,60,120,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(nx, ny, 0.06 * S, 0, TAU); g.fill();
    g.strokeStyle = n > 0.2 ? `rgba(255,200,225,${0.6 + 0.4 * n})` : "rgba(170,215,255,0.35)"; g.lineWidth = 7; // nasal cavity
    g.beginPath(); g.ellipse(nx, ny, 0.026 * S, 0.02 * S, -0.2, 0, TAU); g.stroke();
    g.restore();
    if (n > 0.01) {
      const pu = 0.8 + 0.2 * Math.sin(t * 14);
      blob(q, nx + 0.01 * S, ny, 0.12 * S * n * pu, `rgba(255,120,170,${n})`, "rgba(255,60,120,0)");
      blob(q, nx + 0.01 * S, ny, 0.05 * S * n, `rgba(255,240,250,${n})`, "rgba(255,150,200,0)");
      for (let k = 0; k < 5; k++) { // tingle rays outside the nose
        const an = -1.0 + k * 0.5, u = cyc(t * 1.6 + k * 0.23), a = n * Math.sin(Math.PI * u);
        const r0 = 0.07 * S + u * 0.03 * S, r1 = r0 + 0.03 * S, c = Math.cos(an), s = Math.sin(an), ox = nx + 0.03 * S;
        g.beginPath(); g.moveTo(ox + c * r0, ny + s * r0); g.lineTo(ox + c * r1, ny + s * r1);
        g.strokeStyle = `rgba(10,13,46,${a})`; g.lineWidth = 15; g.stroke();
        g.strokeStyle = `rgba(255,120,170,${a})`; g.lineWidth = 9; g.stroke();
      }
      star(g, nx + 0.055 * S, ny - 0.03 * S, 0.03 * S * n * (0.7 + 0.3 * Math.sin(t * 9)), n, "#ffffff", t * 2);
    }
  }

  private drawSparks(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const j = X.jump;
    if (j < 0.01) return;
    const fr = Math.floor(t * 20);
    [-0.09, -0.055, 0.035, 0.075].forEach((x, k) => {
      const on = Math.sin(Math.PI * cyc(t * 2.6 + k * 0.29));
      if (on < 0.15) return;
      const a = j * smooth((on - 0.15) / 0.3);
      const gy = x < 0 ? LANE_B : LANE_T, ny = x < 0 ? LANE_T : LANE_B, dir = x < 0 ? -1 : 1; // gold lane -> green lane
      // a bolt that leaps OUT of the gold cable, arcs over the gap and lands on the green one
      const p0 = P(x, gy), p1 = P(x + 0.035, ny), bulge = -dir * 0.035 * S, r = rng(fr * 13 + k * 101), pts: P2[] = [p0];
      for (let s = 1; s < 8; s++) {
        const u = s / 8, arc = Math.sin(Math.PI * u) * bulge;
        pts.push([lerp(p0[0], p1[0], u) + (r() - 0.5) * 0.012 * S, lerp(p0[1], p1[1], u) + arc + (r() - 0.5) * 0.012 * S]);
      }
      pts.push(p1);
      g.save(); g.globalAlpha = a;
      g.strokeStyle = INK; g.lineWidth = 15; strokePts(g, pts);
      g.strokeStyle = "#fff59a"; g.lineWidth = 10; strokePts(g, pts);
      g.strokeStyle = "#ffffff"; g.lineWidth = 4; strokePts(g, pts);
      g.restore();
      q.save(); q.globalAlpha = 0.7 * a; q.strokeStyle = "rgba(230,255,170,1)"; q.lineWidth = 22; strokePts(q, pts); q.restore();
      star(g, p0[0], p0[1], 22 * a, a, "#fff4b0", fr * 0.5 + k);
      star(g, p1[0], p1[1], 30 * a, a, "#d8ffe4", fr * 0.7 + k);
    });
    const s0 = t - (W.signals - 0.3); // the first jump: a burst of stars off the crossing
    if (s0 > 0 && s0 < 1.0) {
      const r = rng(5), a = Math.sin(Math.PI * clamp01(s0 / 1.0));
      for (let k = 0; k < 10; k++) {
        const an = r() * TAU, d = 0.05 * S * (0.6 + 1.4 * glide(s0 / 0.8)) * (0.7 + 0.5 * r()), sz = r();
        star(g, XG[0] + Math.cos(an) * d, XG[1] + Math.sin(an) * d * 0.7, (16 + 18 * sz) * a, a, k % 2 ? "#fff4b0" : "#c8ffd8", an);
      }
      blob(q, XG[0], XG[1], 0.12 * S * a, `rgba(255,255,220,${a})`, "rgba(150,255,150,0)");
    }
  }

  private tag(g: CanvasRenderingContext2D, c: P2, big: string, fill: string, k: number, to: P2, t: number) {
    if (k < 0.01) return;
    const [x, y] = P(...c), w = 0.16 * S, h = 0.068 * S, s = back(k), [tx, ty] = P(...to);
    const lx = lerp(x, tx, k), ly = lerp(y, ty, k);
    g.save(); g.globalAlpha = smooth(k * 1.5); // leader
    g.beginPath(); g.moveTo(x, y); g.lineTo(lx, ly);
    g.strokeStyle = INK; g.lineWidth = 12; g.stroke(); g.strokeStyle = fill; g.lineWidth = 5; g.stroke();
    g.fillStyle = fill; g.beginPath(); g.arc(lx, ly, 10, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    g.restore();
    g.save(); g.translate(x, y); g.scale(s, s); g.rotate(0.03 * Math.sin(t * 2));
    g.fillStyle = INK; rrect(g, -w / 2 - 7, -h / 2 - 7, w + 14, h + 14, h / 2 + 7); g.fill();
    g.fillStyle = fill; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; rrect(g, -w / 2 + 14, -h / 2 + 6, w - 28, h * 0.28, h * 0.14); g.fill();
    text(g, big, 0, -h * 0.1, 0.031 * S, INK, INK, 0, 900);
    text(g, "NERVE", 0, h * 0.29, 0.016 * S, INK, INK, 0, 800);
    g.restore();
  }
  private drawTags(g: CanvasRenderingContext2D, t: number, X: St) {
    this.tag(g, NERVE_LAYOUT.sneezeTag, "SNEEZE", "#45f08e", smooth((X.sneezeNerve - 0.55) / 0.45), [0.215, -0.035], t);
    this.tag(g, NERVE_LAYOUT.lightTag, "LIGHT", "#ffcf3a", smooth((X.lightNerve - 0.05) / 0.4), [0.2, 0.1], t);
  }

  private drawLabel(g: CanvasRenderingContext2D, q: CanvasRenderingContext2D, t: number, X: St) {
    const k = X.crossed;
    if (k < 0.01) return;
    const L = NERVE_LAYOUT.label, [x, y] = P(...L.c), w = L.w * S, h = L.h * S, s = back(k);
    const shake = bump(t, W.signals - 0.4, W.signals + 0.6, 0.1) * 5 * Math.sin(t * 60);
    g.save(); g.globalAlpha = smooth(k * 1.4); // arrow up to the crossing
    const ay0 = y - h / 2 - 8, ay1 = XG[1] + 0.034 * S;
    g.beginPath(); g.moveTo(XG[0], ay0); g.lineTo(XG[0], ay1 + 8);
    g.strokeStyle = INK; g.lineWidth = 16; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.stroke();
    g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 6;
    g.beginPath(); g.moveTo(XG[0], ay1 - 14); g.lineTo(XG[0] - 20, ay1 + 14); g.lineTo(XG[0] + 20, ay1 + 14); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.save(); g.translate(x + shake, y); g.scale(s, s); g.rotate(-0.035);
    g.fillStyle = INK; rrect(g, -w / 2 - 9, -h / 2 - 9, w + 18, h + 18, h / 2 + 9); g.fill();
    const lg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    lg.addColorStop(0, "#ffc928"); lg.addColorStop(0.48, "#ffd84a"); lg.addColorStop(0.52, "#4cf595"); lg.addColorStop(1, "#2fe07c");
    g.fillStyle = lg; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; rrect(g, -w / 2 + 16, -h / 2 + 7, w - 32, h * 0.28, h * 0.14); g.fill();
    text(g, "CROSSED WIRES!", 0, 3, 0.037 * S, "#ffffff", INK, 0.24, 900);
    g.restore();
    q.save(); q.globalAlpha = 0.3 * k; q.fillStyle = "rgba(255,230,140,1)"; rrect(q, x - w / 2, y - h / 2, w, h, h / 2); q.fill(); q.restore();
  }

  private drawBubble(g: CanvasRenderingContext2D, t: number, X: St) {
    const k = X.thought;
    if (k < 0.01) return;
    const Bb = NERVE_LAYOUT.bubble, [cx, cy] = P(...Bb.c), w = Bb.w * S, h = Bb.h * S;
    ([[0.0, 0.31, 0.011], [0.012, 0.338, 0.016], [0.024, 0.37, 0.022]] as [number, number, number][]).forEach(([x, y, r], i) => {
      const a = smooth(k * 3 - i * 0.6); // trailing dots from the brain top
      if (a < 0.01) return;
      const [px, py] = P(x, y), rr = r * S * back(a);
      g.fillStyle = INK; g.beginPath(); g.arc(px, py, rr + 7 * a, 0, TAU); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px, py, rr, 0, TAU); g.fill();
    });
    const s = back(smooth((k - 0.3) / 0.7));
    if (s < 0.01) return;
    g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate(0.015 * Math.sin(t * 2.2));
    const n = 14, cloud = new Path2D(); // scalloped ellipse
    cloud.moveTo(w * 0.5, 0);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU, am = (a0 + a1) / 2, bulge = 1.22 + 0.06 * Math.sin(i * 2.3);
      cloud.quadraticCurveTo(Math.cos(am) * w * 0.5 * bulge, Math.sin(am) * h * 0.5 * bulge, Math.cos(a1) * w * 0.5, Math.sin(a1) * h * 0.5);
    }
    cloud.closePath();
    g.save(); g.translate(10, 14); g.fillStyle = "rgba(3,6,28,0.35)"; g.fill(cloud); g.restore();
    g.lineWidth = 26; g.strokeStyle = INK; g.stroke(cloud);
    const cg = g.createLinearGradient(0, -h / 2, 0, h / 2); cg.addColorStop(0, "#ffffff"); cg.addColorStop(1, "#e6eeff");
    g.fillStyle = cg; g.fill(cloud);
    const line = (s2: string, y: number, size: number, fill: string, a: number, sw = 0.2) => {
      if (a < 0.01) return;
      g.save(); g.globalAlpha = a; g.translate(0, y); g.scale(back(a), back(a)); text(g, s2, 0, 0, size, fill, INK, sw, 900); g.restore();
    };
    line("LIGHT?", -0.066 * S, 0.064 * S, "#ffc21f", X.l1, 0.22);
    line("...MUST BE SOMETHING", 0.0 * S, 0.034 * S, INK, X.l2, 0);
    line("IN THE NOSE!", 0.062 * S, 0.054 * S, "#35e884", X.l3, 0.22);
    g.restore();
  }

  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    if (id !== 4) return;
    const c = nervesCam(id, t);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look);
    cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    if (!this.dbg) {
      this.dbg = new THREE.Group();
      const skin = new THREE.MeshBasicMaterial({ color: "#f2c9a0" }), gown = new THREE.MeshBasicMaterial({ color: "#c0506a" });
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.23, 40), skin);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.1), gown); body.position.y = -0.8;
      const hair = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), new THREE.MeshBasicMaterial({ color: "#d0541c" })); hair.position.set(0.05, 0.26, -0.001);
      this.dbg.add(head, body, hair); this.root.add(this.dbg);
    }
    const h = headPos(id, t);
    this.dbg.position.set(...h); this.dbg.rotation.set(0, Math.atan2(cam.position.x - h[0], cam.position.z - h[2]), 0);
  }
}
