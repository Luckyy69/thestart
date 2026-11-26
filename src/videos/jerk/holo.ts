// OWNER: holo agent. See /home/user/lookmatch/JERK_BRIEF.md
// SHOT 3 X-RAY (xrayAt) of BEAN asleep in bed: one big camera-facing hologram board anchored to BEAN's head (default
// BEDROOM+(-0.75,0.75,-0.4), body lying along +x). Pure function of (id, t); never frustum culled; all NOINK;
// drawn ON TOP of the bed (depthTest off) so the duvet never cuts it.
//   show   : a scan bar sweeps head -> toes and reveals a glowing glass BODY (cyan rim, faint skeleton) with 6 plump RED
//            MUSCLES (pec, abs, bicep, forearm, quad, calf) that have tiny sleepy eyes. "MUSCLES" pill on "muscles".
//   limp   : a wave head -> toes: each muscle sags like jelly (wobbles), goes GREY, eyes shut -> "MUSCLES: LIMP".
//   brain2 : a glass ZOOM BUBBLE inflates out of his head: a pink cartoon BRAIN in a nightcap, asleep, Zzz.
//   halfEye: ONE eye drags half open -> "HALF AWAKE" pill.
//   drop   : red down-chevrons by the body + a red signal zips up the spine into the brain; alarm: a flashing
//            "DROP DETECTED" banner, body + bubble rims flash red, the brain's eyes pop open.
//   panics : eyes bulge, tiny pupils, sweat, the brain shakes, the NIGHTCAP SHOOTS OFF.
//   panic  : noodle arms grab a MEGAPHONE: "WE'RE FALLING!" burst.
//   fire   : lightning bolts fan out of the brain stem into EVERY muscle (they buzz, glow yellow, eyes pop); on
//            "once" a white flash: every muscle SNAPS back red and FLEXES, the body jolts up with BEAN, the alarm clears.
// Technique (after voice/holo.ts): a canvas board in an anchor frame yawed to the camera + an additive HDR glow twin.
// The canvases are drawn in board-local METRES (y up) through a canvas transform.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { BEDROOM, W, V3, JOLTS, xrayAt, shotStart, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG = false; // TEMP: recommended framing + stand-ins for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const back = (u: number, c = 1.8) => { const x = clamp01(u); return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bump = (t: number, a: number, b: number, r = 0.2) => smooth((t - a) / r) * (1 - smooth((t - b) / r));
const cyc = (x: number) => ((x % 1) + 1) % 1;
const hash = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ============================== public contracts ==============================
/** override from the cast owner: BEAN's head centre per (id, t) INCLUDING his jolt lift (xrayLift is then not added) */
export const HOLO_HOOKS: { head?: (id: number, t: number) => V3 | undefined } = {};
/** BEAN's head centre lying in bed (default) */
export const HEAD: V3 = add(BEDROOM, -0.75, 0.75, -0.4);
/** default vertical jolt lift (m) of BEAN for the JOLTS "bean" entries: up to 0.3*size at +0.21 s, down by +0.42 s, a
 *  small bounce to +0.62 s. The cast can use it so the card and the X-ray fly together. */
export const xrayLift = (t: number) => {
  let h = 0;
  for (const [tj, who, s] of JOLTS) {
    if (who !== "bean") continue;
    const d = t - tj, T = 0.42;
    if (d < 0 || d > T + 0.2) continue;
    h += d < T ? 0.3 * s * 4 * (d / T) * (1 - d / T) : 0.03 * s * Math.sin((Math.PI * (d - T)) / 0.2);
  }
  return h;
};
export const headPos = (id: number, t: number): V3 => HOLO_HOOKS.head?.(id, t) ?? add(HEAD, 0, xrayLift(t), 0);
/** the board sits this far in front of the head point (toward the camera) */
export const XRAY_D = 0.06;
/** board-local layout (m): origin = BEAN's head centre, x = along his body toward his TOES (= screen right for a camera
 *  in front, +z), y = up. The glass body: head ellipse rx 0.24 ry 0.23; torso x 0.15..0.9; legs to the toes at x 1.46;
 *  his back lies at y -0.2 (= mattress top 0.55 for the default head). */
export const XRAY_LAYOUT = {
  box: { x0: -0.46, x1: 1.9, y0: -0.4, y1: 1.9 },
  head: { c: [0, 0] as P2, rx: 0.24, ry: 0.23 },
  mini: [0.03, 0.06] as P2,                           // the little brain inside his head
  bubble: { c: [0.36, 1.03] as P2, r: 0.46 },         // the zoom bubble with the big BRAIN (rx 0.34, ry 0.255)
  banner: { c: [0.56, 1.68] as P2, w: 1.38, h: 0.2 }, // "DROP DETECTED"
  burst: { c: [1.36, 1.1] as P2, rx: 0.41, ry: 0.35 }, // "WE'RE FALLING!"
  halfTag: { c: [1.18, 1.4] as P2, w: 0.64, h: 0.13 }, // "HALF AWAKE"
  musTag: { c: [1.1, 0.44] as P2, h: 0.13 },          // "MUSCLES" -> "MUSCLES: LIMP"
  drop: [1.22, 0.3] as P2,                            // red down chevrons
};
type Mus = { name: string; a: P2; b: P2; w: number; up: 1 | -1; arm?: boolean };
/** the muscles (board-local, see XRAY_LAYOUT); the limp wave runs in this order (head -> toes) */
export const MUSCLES: Mus[] = [
  { name: "pec", a: [0.3, 0.05], b: [0.52, 0.07], w: 0.055, up: 1 },
  { name: "abs", a: [0.56, 0.065], b: [0.8, 0.035], w: 0.05, up: 1 },
  { name: "bicep", a: [0.27, -0.045], b: [0.52, -0.075], w: 0.056, up: 1, arm: true },
  { name: "forearm", a: [0.56, -0.085], b: [0.75, -0.09], w: 0.044, up: 1, arm: true },
  { name: "quad", a: [0.84, -0.02], b: [1.17, -0.06], w: 0.07, up: 1 },
  { name: "calf", a: [1.05, -0.165], b: [1.31, -0.15], w: 0.052, up: -1 },
];
type Frame = { o: V3; yaw: number; R: V3; N: V3 };
const frameFrom = (o: V3, cam: THREE.Vector3): Frame => {
  const yaw = Math.atan2(cam.x - o[0], cam.z - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)], N: [Math.sin(yaw), 0, Math.cos(yaw)] };
};
const toW = (F: Frame, x: number, y: number, d: number): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** world point of a board-local X-ray point, seen from a camera at camPos */
export const xrayPoint = (id: number, t: number, x: number, y: number, camPos: V3): V3 => toW(frameFrom(headPos(id, t), new THREE.Vector3(...camPos)), x, y, XRAY_D);
/** IDEAL shot-3 framing (held, straight on, ~7 deg down): the whole X-ray fills the frame; banner top at ~10 % (clears
 *  the watermark), body at ~52-62 %, captions (70 %) fall below the body. Camera 4.2 m in front of BEAN's head, fov 50. */
export const xrayCam = (_id: number, _t: number) => { const h = HOLO_HOOKS.head?.(3, shotStart(3)) ?? HEAD; return { pos: add(h, 0.62, 0.95, 4.45), look: add(h, 0.62, 0.42, 0), fov: 50 }; };

// ============================== canvas helpers (metre space, y up) ==============================
const INK = "#071033";
type Ctx = CanvasRenderingContext2D;
type Paint = string | CanvasGradient;
const RED = "#ff2f45", YEL = "#ffe23a";
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
const strokePts = (g: Ctx, pts: P2[]) => { if (pts.length < 2) return; g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) g.lineTo(...pts[i]); g.stroke(); };
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
const smoothPath = (pts: P2[]) => pathOf(crPts(pts, 8, true), true);
type Poly = { pts: P2[]; cum: number[]; len: number };
const poly = (px: P2[]): Poly => {
  const pts = crPts(px, 10, false), cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
};
const polyAt = (p: Poly, u: number): P2 => {
  const L = clamp01(u) * p.len;
  let i = 1;
  while (i < p.pts.length - 1 && p.cum[i] < L) i++;
  const a = p.pts[i - 1], b = p.pts[i], k = (L - p.cum[i - 1]) / Math.max(1e-6, p.cum[i] - p.cum[i - 1]);
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
};
/** a label pill (metres) that scales in (back easing) with an optional leader to `to`; label -> label2 cross-fade by mix2 */
const pill = (g: Ctx, q: Ctx, x: number, y: number, w: number, h: number, fill: Paint, label: string, k: number, t: number, to?: P2, txt = "#ffffff", glowCol = "#5fd8ff", pulse = 0, label2?: string, mix2 = 0) => {
  if (k < 0.01) return;
  if (to) {
    const a = smooth(k * 1.6), ex = lerp(x, to[0], a), ey = lerp(y, to[1], a);
    g.save(); g.globalAlpha *= a; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokeStyle = INK; g.lineWidth = h * 0.22; g.stroke(); g.strokeStyle = glowCol; g.lineWidth = h * 0.1; g.stroke();
    g.fillStyle = glowCol; g.beginPath(); g.arc(ex, ey, h * 0.15, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = h * 0.06; g.stroke();
    g.restore();
  }
  const s = back(k) * (1 + 0.12 * pulse);
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(0.025 * Math.sin(t * 2.1 + x * 7));
  const pad = h * 0.13;
  g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, h / 2 + pad); g.fill();
  g.fillStyle = fill; rrect(g, -w / 2, -h / 2, w, h, h / 2); g.fill();
  g.fillStyle = "rgba(255,255,255,0.3)"; rrect(g, -w / 2 + h * 0.3, h / 2 - h * 0.34, w - h * 0.6, h * 0.22, h * 0.11); g.fill();
  if (mix2 < 0.999) { g.save(); g.globalAlpha *= 1 - mix2; text(g, label, 0, -h * 0.03, h * 0.6, txt, INK, 0.24); g.restore(); }
  if (label2 && mix2 > 0.001) { g.save(); g.globalAlpha *= mix2; text(g, label2, 0, -h * 0.03, h * 0.6, txt, INK, 0.24); g.restore(); }
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
    // QA: an invisible depth-only twin (drawn last) writes a NEAR depth where the board is opaque, so the world's ink
    // lines (curtain rod, window mullions, bed edges) are not drawn across the labels / bubble / body
    const dm = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.main.tex }, op: this.depthOp },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); mv.xyz *= 0.7; gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform sampler2D map; uniform float op; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a * op < 0.3) discard; gl_FragColor = vec4(0.0); }",
      transparent: true, depthWrite: true, depthTest: true, depthFunc: THREE.AlwaysDepth, colorWrite: false, // (GL writes no depth with the depth test off)
      side: THREE.DoubleSide,
    });
    const dme = new THREE.Mesh(geo, dm); dme.position.set((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2, 0.002); dme.renderOrder = 100000;
    dme.layers.set(NOINK); dme.frustumCulled = false; this.group.add(dme);
    this.group.visible = false;
  }
  private depthOp = { value: 1 };
  opacity(a: number) { for (const m of this.mats) m.opacity = a; this.depthOp.value = a; }
  /** metre transform (board-local, y up) for a context at pixel scale s */
  tf(c: Ctx, s: number) { c.setTransform(s, 0, 0, -s, -this.box.x0 * s, this.box.y1 * s); }
  /** clears both canvases; both contexts then draw in board-local metres (y up). Callers restore both. */
  begin(): [Ctx, Ctx] {
    const g = this.main.g, q = this.glow.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.W, this.H); g.save(); this.tf(g, this.S); g.lineCap = "round"; g.lineJoin = "round"; g.globalAlpha = 1;
    q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, this.glow.cv.width, this.glow.cv.height); q.save(); this.tf(q, this.S * GS); q.lineCap = "round"; q.lineJoin = "round"; q.globalAlpha = 1;
    return [g, q];
  }
  flush() { this.main.tex.needsUpdate = true; this.glow.tex.needsUpdate = true; }
}

// ============================== shapes (board-local metres) ==============================
const L = XRAY_LAYOUT;
const TORSO: P2[] = [[0.16, 0.0], [0.32, 0.085], [0.56, 0.1], [0.8, 0.07], [0.9, -0.05], [0.84, -0.19], [0.55, -0.205], [0.25, -0.2], [0.15, -0.12]];
const LEGS: P2[] = [[0.76, 0.05], [1.02, 0.02], [1.29, -0.03], [1.33, 0.07], [1.4, 0.105], [1.465, 0.06], [1.455, -0.12], [1.38, -0.2], [1.05, -0.212], [0.8, -0.2]];
const ARM: P2[] = [[0.23, 0.012], [0.4, -0.01], [0.56, -0.04], [0.74, -0.04], [0.805, -0.09], [0.765, -0.142], [0.56, -0.132], [0.38, -0.112], [0.22, -0.09]];
const headPath = () => { const p = new Path2D(); p.ellipse(L.head.c[0], L.head.c[1], L.head.rx, L.head.ry, 0, 0, TAU); return p; };
// the drop signal route: belly -> spine -> neck -> the little brain -> up the zoom cone -> the big brain's stem
const SIGNAL: P2[] = [[0.62, -0.1], [0.45, -0.14], [0.28, -0.14], [0.14, -0.1], [0.06, -0.02], [L.mini[0], L.mini[1]], [0.18, 0.4], [L.bubble.c[0], L.bubble.c[1] - 0.3]];
// brain (brain-local metres; centre 0, rx 0.34, ry 0.255): the bumpy outline + gyri
const BR = { rx: 0.34, ry: 0.255 };
const BRAIN_PTS: P2[] = (() => {
  const out: P2[] = [];
  for (let i = 0; i < 144; i++) {
    const a = (i / 144) * TAU, r = 1 + 0.05 * Math.abs(Math.sin(6 * a + 0.35));
    const y = Math.sin(a) * BR.ry * r;
    out.push([Math.cos(a) * BR.rx * r, y < 0 ? y * 0.84 : y]);
  }
  return out;
})();
const GYRI: P2[][] = [
  [[-0.27, 0.06], [-0.2, 0.13], [-0.12, 0.09], [-0.05, 0.16]], [[0.05, 0.16], [0.12, 0.09], [0.2, 0.13], [0.27, 0.06]],
  [[-0.3, -0.04], [-0.25, 0.02], [-0.21, -0.02]], [[0.21, -0.02], [0.25, 0.02], [0.3, -0.04]],
  [[-0.17, 0.21], [-0.08, 0.205], [-0.04, 0.23]], [[0.04, 0.23], [0.08, 0.205], [0.17, 0.21]], [[0, 0.262], [0.004, 0.19], [-0.004, 0.13]],
];

type XSt = ReturnType<typeof xrayAt>;
type Mood = { half: number; alarm: number; pan: number; yell: number; fire: number; snap: number; flash: number; tSnap: number };
type MSt = { T: number; wob: number; charge: number; str: number; flex: number; buzz: number; li: number; snap: number };

class XrayHolo {
  b = new Board(L.box, 860, 40, 0.9);
  private last = "";
  private signal = poly(SIGNAL);
  update(id: number, t: number, cam: THREE.Camera) {
    const X = xrayAt(id, t), show = id === 3 ? X.show : 0;
    this.b.group.visible = show > 0.002;
    if (!this.b.group.visible) return;
    const F = frameFrom(headPos(id, t), cam.position);
    this.b.group.position.set(...toW(F, 0, 0, XRAY_D)); this.b.group.rotation.set(0, F.yaw, 0);
    this.b.group.scale.setScalar(0.97 + 0.03 * glide(show));
    this.b.opacity(1);
    const key = id + ":" + t.toFixed(4);
    if (key === this.last) return;
    this.last = key;
    this.draw(t, X, show);
  }
  private draw(t: number, X: XSt, show: number) {
    const B = this.b, [g, q] = B.begin();
    const tSnap = W.once - 0.1;
    const snap = smooth((t - (tSnap - 0.03)) / 0.08);
    const M: Mood = {
      half: X.halfEye, alarm: X.alarm * (1 - snap), pan: smooth((t - (W.panics - 0.15)) / 0.2) * (1 - snap), yell: X.panic, fire: X.fire, snap,
      flash: t >= tSnap - 0.04 ? Math.exp(-Math.max(0, t - tSnap) / 0.13) * smooth((t - (tSnap - 0.04)) / 0.04) : 0, tSnap,
    };
    // ---- scan reveal: clip head -> toes ----
    const wx = lerp(L.box.x0 - 0.05, L.box.x1 + 0.05, glide(show));
    if (show < 0.999) for (const c of [g, q]) { c.beginPath(); c.rect(L.box.x0 - 1, L.box.y0 - 1, wx - L.box.x0 + 1, 10); c.clip(); }
    this.drawBody(g, q, t, X, M);
    const grow = back(clamp01((t - (W.brain2 - 0.45)) / 0.55), 1.4);
    if (grow > 0.001) this.drawBubble(g, q, t, M, grow);
    this.drawBolts(g, q, t, X, M);
    this.drawLabels(g, q, t, X, M);
    // the snap flash (the whole body lights up white)
    if (M.flash > 0.01) {
      blob(q, 0.6, 0.0, 1.1, `rgba(255,250,220,${0.75 * M.flash})`, "rgba(255,240,180,0)");
      g.save(); g.globalAlpha = 0.5 * M.flash; g.fillStyle = "#fffbe6"; g.fill(headPath()); g.fill(smoothPath(TORSO)); g.fill(smoothPath(LEGS)); g.restore();
    }
    g.restore(); q.restore();
    if (show > 0.001 && show < 0.999) { // the scan bar
      const a = Math.sin(Math.PI * show);
      g.save(); B.tf(g, B.S);
      const lg = g.createLinearGradient(wx - 0.05, 0, wx + 0.05, 0);
      lg.addColorStop(0, "rgba(140,240,255,0)"); lg.addColorStop(0.5, `rgba(230,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,240,255,0)");
      g.fillStyle = lg; g.fillRect(wx - 0.05, -0.32, 0.1, 0.62); g.restore();
      q.save(); B.tf(q, B.S * GS); q.fillStyle = `rgba(120,230,255,${0.8 * a})`; q.fillRect(wx - 0.02, -0.32, 0.04, 0.62); q.restore();
    }
    B.flush();
  }

  // ---------------- the glass body + muscles ----------------
  private rimCol(t: number, M: Mood) {
    const al = M.alarm * (0.5 + 0.5 * Math.sin(t * 17)), fl = M.fire * (1 - M.snap) * (0.6 + 0.4 * hash(Math.floor(t * 15)));
    return mixC(mixC([95, 216, 255], [255, 60, 80], al), [255, 236, 90], fl);
  }
  private drawBody(g: Ctx, q: Ctx, t: number, X: XSt, M: Mood) {
    const head = headPath(), torso = smoothPath(TORSO), legs = smoothPath(LEGS), arm = smoothPath(ARM);
    const shapes = [legs, torso, head];
    const rc = this.rimCol(t, M);
    // dark halo for contrast against the room
    for (const [w, a] of [[0.12, 0.12], [0.065, 0.2], [0.03, 0.3]] as [number, number][]) { g.strokeStyle = `rgba(2,6,26,${a})`; g.lineWidth = w; for (const s of shapes) g.stroke(s); }
    // union rim: wide colour, white core, then the glass on top
    g.strokeStyle = rgb(rc); g.lineWidth = 0.036; for (const s of shapes) g.stroke(s);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 0.016; for (const s of shapes) g.stroke(s);
    q.strokeStyle = rgb(rc, 0.32); q.lineWidth = 0.05; for (const s of shapes) q.stroke(s);
    q.strokeStyle = rgb(rc, 0.1); q.lineWidth = 0.12; for (const s of shapes) q.stroke(s);
    const gl = g.createLinearGradient(0, 0.12, 0, -0.22);
    gl.addColorStop(0, "rgba(30,62,150,0.93)"); gl.addColorStop(1, "rgba(12,22,78,0.93)");
    g.fillStyle = gl; for (const s of shapes) g.fill(s);
    // inside: grid + scan lines + skeleton
    const clip = new Path2D(); clip.addPath(head); clip.addPath(torso); clip.addPath(legs);
    g.save(); g.clip(clip, "nonzero");
    g.strokeStyle = "rgba(120,200,255,0.08)"; g.lineWidth = 0.003;
    for (let x = -0.3; x < 1.5; x += 0.04) { g.beginPath(); g.moveTo(x, -0.3); g.lineTo(x, 0.3); g.stroke(); }
    for (let y = -0.24; y < 0.26; y += 0.04) { g.beginPath(); g.moveTo(-0.3, y); g.lineTo(1.5, y); g.stroke(); }
    g.fillStyle = "rgba(180,235,255,0.05)";
    for (let x = ((t * 0.12) % 0.025) - 0.3; x < 1.5; x += 0.025) g.fillRect(x, -0.3, 0.008, 0.6);
    this.drawSkeleton(g);
    g.restore();
    this.drawMiniBrain(g, q, t, M);
    // muscles behind the arm
    const mus = MUSCLES.map((m, i) => this.muscleState(i, t, X, M));
    MUSCLES.forEach((m, i) => { if (!m.arm) this.drawMuscle(g, q, m, mus[i], t); });
    // the arm on top: thinner rim + glass
    g.strokeStyle = rgb(rc); g.lineWidth = 0.022; g.stroke(arm);
    g.strokeStyle = "#f2fdff"; g.lineWidth = 0.008; g.stroke(arm);
    g.fillStyle = "rgba(26,52,136,0.9)"; g.fill(arm);
    q.strokeStyle = rgb(rc, 0.3); q.lineWidth = 0.05; q.stroke(arm);
    g.save(); g.clip(arm); g.strokeStyle = "rgba(220,240,255,0.3)"; g.lineWidth = 0.012; strokePts(g, [[0.26, -0.05], [0.53, -0.085]]); strokePts(g, [[0.55, -0.09], [0.76, -0.095]]); g.restore();
    MUSCLES.forEach((m, i) => { if (m.arm) this.drawMuscle(g, q, m, mus[i], t); });
    // glass sheen
    const sh = g.createLinearGradient(0, 0.1, 0, -0.05); sh.addColorStop(0, "rgba(255,255,255,0.1)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    g.save(); g.clip(clip); g.fillStyle = sh; g.fillRect(-0.3, -0.05, 1.8, 0.16); g.restore();
  }
  private drawSkeleton(g: Ctx) {
    const bone = (pts: P2[], w: number, a = 0.4) => { const p = pathOf(crPts(pts, 6, false), false); g.strokeStyle = `rgba(210,236,255,${a * 0.35})`; g.lineWidth = w * 2.4; g.stroke(p); g.strokeStyle = `rgba(220,240,255,${a})`; g.lineWidth = w; g.stroke(p); };
    g.strokeStyle = "rgba(220,240,255,0.3)"; g.lineWidth = 0.01; g.beginPath(); g.ellipse(0, 0.005, 0.19, 0.18, 0, 0, TAU); g.stroke(); // skull
    for (let x = 0.2; x < 0.86; x += 0.045) { g.fillStyle = "rgba(220,240,255,0.28)"; rrect(g, x - 0.016, -0.172, 0.032, 0.026, 0.008); g.fill(); } // spine
    for (let i = 0; i < 5; i++) { const x = 0.3 + i * 0.055; bone([[x, -0.155], [x + 0.025, -0.04], [x + 0.01, 0.055]], 0.008, 0.28); } // ribs
    bone([[0.8, -0.16], [0.86, -0.1], [0.84, -0.02]], 0.012, 0.3); // hip
    bone([[0.86, -0.11], [1.1, -0.12]], 0.018, 0.35); bone([[1.12, -0.12], [1.36, -0.12]], 0.015, 0.35); bone([[1.37, -0.13], [1.41, 0.05]], 0.012, 0.3); // leg + foot
  }
  private drawMiniBrain(g: Ctx, q: Ctx, t: number, M: Mood) {
    const [mx, my] = L.mini, al = M.alarm * (0.5 + 0.5 * Math.sin(t * 17)), hot = Math.max(al, M.fire * (1 - M.snap));
    blob(q, mx, my, 0.12, rgb(mixC([255, 150, 210], [255, 220, 110], hot), 0.45 + 0.4 * hot), "rgba(255,120,200,0)");
    g.save(); g.translate(mx, my); g.scale(0.27, 0.27);
    const p = pathOf(BRAIN_PTS, true);
    g.fillStyle = rgb(mixC([255, 159, 207], [255, 80, 90], al)); g.fill(p);
    g.strokeStyle = INK; g.lineWidth = 0.035; g.stroke(p);
    g.strokeStyle = "rgba(180,40,110,0.8)"; g.lineWidth = 0.025; for (const gy of GYRI) g.stroke(pathOf(crPts(gy, 6, false), false));
    g.restore();
  }
  private muscleState(i: number, t: number, X: XSt, M: Mood): MSt {
    const d = i / (MUSCLES.length - 1);
    const li = smooth(clamp01((X.limp - d * 0.45) / 0.55));
    const T = li * (1 - M.snap);
    const tl = W.muscles - 0.1 + 1.2 * (d * 0.45 + 0.27); // when this muscle flops
    const wob = t > tl ? Math.sin((t - tl) * 15) * Math.exp(-(t - tl) * 2.6) * (1 - M.snap) : 0;
    const start = W.fires - 0.12 + 0.065 * i;
    const str = X.fire * smooth((t - start) / 0.06);
    const charge = str * (1 - M.snap);
    const ds = Math.max(0, t - M.tSnap);
    const flex = M.snap * 0.42 * Math.exp(-ds / 0.32) * (0.6 + 0.4 * Math.cos(ds * 16));
    const buzz = charge * 0.006 * Math.sin(t * 95 + i * 2.1);
    return { T, wob, charge, str, flex, buzz, li, snap: M.snap };
  }
  private drawMuscle(g: Ctx, q: Ctx, m: Mus, s: MSt, t: number) {
    const { T, wob, charge, flex, buzz } = s;
    const ax = m.a[0], ay = m.a[1], bx = m.b[0], by = m.b[1], len = Math.hypot(bx - ax, by - ay);
    const dx = (bx - ax) / len, dy = (by - ay) / len, nx = -dy, ny = dx; // normal points "up" (+y)
    const w = m.w * (1 + flex);
    const top: P2[] = [], bot: P2[] = [], mid: P2[] = [];
    const n = 22;
    const upK = m.up > 0 ? 1.2 : 0.82, dnK = m.up > 0 ? 0.82 : 1.2;
    for (let k = 0; k <= n; k++) {
      const u = k / n, s0 = Math.pow(Math.sin(Math.PI * u), 0.45), bell = Math.sin(Math.PI * u);
      // limp: the middle sags (gravity), it flattens on top and pools at the bottom, a jelly wobble
      const sag = T * m.w * 1.05 * bell + wob * m.w * 0.55 * bell;
      const cx = ax + dx * len * u + buzz * Math.sin(u * 30), cy = ay + dy * len * u - sag + buzz;
      const wt = w * upK * s0 * (1 - 0.55 * T) * (1 + 0.25 * flex * bell), wb = w * dnK * s0 * (1 + 0.3 * T);
      top.push([cx + nx * wt, cy + ny * wt]); bot.push([cx - nx * wb, cy - ny * wb]); mid.push([cx, cy + (wt - wb) * 0.5]);
    }
    const p = pathOf([...top, ...bot.slice().reverse()], true);
    const fl = 0.6 + 0.4 * hash(Math.floor(t * 15) + m.a[0] * 100);
    const cTop = mixC(mixC([255, 108, 108], [150, 156, 176], T), [255, 250, 190], charge * fl);
    const cBot = mixC(mixC([206, 18, 48], [78, 82, 102], T), [255, 196, 30], charge * fl);
    const c = mid[Math.round(n / 2)];
    const gr = g.createLinearGradient(c[0] + nx * w, c[1] + ny * w, c[0] - nx * w, c[1] - ny * w);
    gr.addColorStop(0, rgb(cTop)); gr.addColorStop(1, rgb(cBot));
    // glow
    const ga = Math.max(0.35 * (1 - T), 0.7 * charge, 0.5 * flex);
    if (ga > 0.01) { q.save(); q.globalAlpha = ga; q.fillStyle = charge > 0.3 ? "#ffe060" : "#ff3048"; q.fill(p); q.strokeStyle = q.fillStyle; q.lineWidth = 0.05; q.stroke(p); q.restore(); }
    g.strokeStyle = INK; g.lineWidth = 0.02; g.stroke(p);
    g.fillStyle = gr; g.fill(p);
    // striations + highlight
    g.save(); g.clip(p);
    g.strokeStyle = rgb(mixC(mixC([255, 160, 160], [210, 214, 224], T), [255, 255, 255], charge), 0.55); g.lineWidth = 0.005;
    for (const o of [-0.45, 0, 0.45]) {
      const pts: P2[] = [];
      for (let k = 3; k <= n - 3; k++) { const u = k / n, s0 = Math.pow(Math.sin(Math.PI * u), 0.6); pts.push([mid[k][0] + nx * o * w * s0, mid[k][1] + ny * o * w * s0 * (1 - 0.4 * T)]); }
      strokePts(g, pts);
    }
    g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - T) + 0.3 * charge})`; g.lineWidth = 0.011;
    strokePts(g, top.slice(5, 13).map(([x, y]) => [x - nx * w * 0.32, y - ny * w * 0.32] as P2));
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.009; g.stroke(p);
    // tiny face: sleepy -> shut (limp) -> shocked (zapped) -> wide awake (snap)
    const er = Math.max(0.0125, m.w * 0.3), ang = Math.atan2(dy, dx), fc = mid[Math.round(n * 0.52)];
    const open = Math.max(0.4 * (1 - smooth(s.li * 1.6)), smooth(charge * 3), 0.95 * s.snap);
    const oa = smooth((open - 0.04) / 0.12);
    const pr = lerp(0.5, 0.28, smooth(charge * 3));
    g.save(); g.translate(fc[0], fc[1] + (m.up > 0 ? er * 0.1 : -er * 0.15)); g.rotate(ang);
    for (const sx of [-1, 1]) {
      const ex = sx * er * 1.45;
      if (oa < 0.99) { g.save(); g.globalAlpha *= 1 - oa; g.strokeStyle = INK; g.lineWidth = er * 0.42; g.beginPath(); g.moveTo(ex - er, 0); g.quadraticCurveTo(ex, -er * 0.8, ex + er, 0); g.stroke(); g.restore(); }
      if (oa > 0.01) {
        g.save(); g.globalAlpha *= oa;
        g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(ex, 0, er, er * (0.35 + 0.75 * open), 0, 0, TAU); g.fill();
        g.strokeStyle = INK; g.lineWidth = er * 0.32; g.stroke();
        g.fillStyle = INK; g.beginPath(); g.arc(ex, -er * 0.1 * (1 - open), er * pr * Math.min(1, 0.4 + open), 0, TAU); g.fill();
        g.restore();
      }
    }
    const mo = smooth(charge * 2);
    if (mo > 0.01) { g.fillStyle = INK; g.beginPath(); g.ellipse(0, -er * 1.55, er * 0.5, er * 0.62 * mo, 0, 0, TAU); g.fill(); }
    g.restore();
  }

  // ---------------- the zoom bubble + the BRAIN ----------------
  private drawBubble(g: Ctx, q: Ctx, t: number, M: Mood, grow: number) {
    const bub = L.bubble, gk = Math.min(1, grow);
    const cx = lerp(L.mini[0], bub.c[0], gk), cy = lerp(L.mini[1], bub.c[1], gk), r = bub.r * lerp(0.15, 1, grow);
    const rc = mixC([95, 216, 255], [255, 60, 80], M.alarm * (0.5 + 0.5 * Math.sin(t * 17)));
    // zoom cone from the little brain to the bubble (tangent lines)
    const [mx, my] = L.mini, ddx = cx - mx, ddy = cy - my, D = Math.hypot(ddx, ddy);
    if (D > r * 1.05) {
      const th = Math.atan2(ddy, ddx), ph = Math.acos(r / D);
      const t1: P2 = [cx + r * Math.cos(th + Math.PI - ph), cy + r * Math.sin(th + Math.PI - ph)], t2: P2 = [cx + r * Math.cos(th + Math.PI + ph), cy + r * Math.sin(th + Math.PI + ph)];
      const a0: P2 = [mx - 0.07, my + 0.01], a1: P2 = [mx + 0.07, my - 0.01];
      g.save(); g.globalAlpha = smooth(gk * 1.5);
      const cg = g.createLinearGradient(mx, my, cx, cy); cg.addColorStop(0, "rgba(120,220,255,0.32)"); cg.addColorStop(1, "rgba(120,220,255,0.06)");
      g.fillStyle = cg; g.beginPath(); g.moveTo(...a0); g.lineTo(...t1); g.lineTo(...t2); g.lineTo(...a1); g.closePath(); g.fill();
      g.setLineDash([0.02, 0.018]); g.lineDashOffset = -t * 0.12; g.strokeStyle = rgb(rc, 0.85); g.lineWidth = 0.009;
      strokePts(g, [a0, t1]); strokePts(g, [a1, t2]); g.setLineDash([]);
      g.restore();
    }
    // bubble glass
    for (const [w, a] of [[0.12, 0.12], [0.06, 0.2]] as [number, number][]) { g.strokeStyle = `rgba(2,6,26,${a})`; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    const bg = g.createRadialGradient(cx, cy + r * 0.3, r * 0.1, cx, cy, r);
    bg.addColorStop(0, "rgba(40,70,170,0.95)"); bg.addColorStop(1, "rgba(12,20,70,0.95)");
    g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    if (M.alarm > 0.01) { g.fillStyle = `rgba(255,40,60,${0.25 * M.alarm * (0.5 + 0.5 * Math.sin(t * 17))})`; g.fill(); }
    g.strokeStyle = rgb(rc); g.lineWidth = 0.026; g.stroke(); g.strokeStyle = "#f2fdff"; g.lineWidth = 0.009; g.stroke();
    q.strokeStyle = rgb(rc, 0.4); q.lineWidth = 0.08; q.beginPath(); q.arc(cx, cy, r, 0, TAU); q.stroke();
    // the brain (brain-local metres)
    const sc = lerp(0.15, 1, grow) * (1 + 0.07 * bump(t, M.tSnap, M.tSnap + 0.25, 0.06));
    const shake = (M.pan * 0.008 + M.yell * 0.01) * Math.sin(t * 71);
    const bob = 0.012 * Math.sin(t * 1.9) * (1 - M.alarm);
    g.save(); q.save();
    for (const c of [g, q]) { c.translate(cx + shake, cy + bob + shake * 0.4); c.scale(sc, sc); }
    this.drawBrain(g, q, t, M);
    g.restore(); q.restore();
    // glass sheen on top
    g.save(); g.beginPath(); g.arc(cx, cy, r * 0.94, 0, TAU); g.clip();
    g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 0.02; g.beginPath(); g.arc(cx, cy, r * 0.84, 1.95, 2.75); g.stroke();
    g.restore();
  }
  private drawBrain(g: Ctx, q: Ctx, t: number, M: Mood) {
    const p = pathOf(BRAIN_PTS, true);
    const hot = M.alarm * (0.5 + 0.5 * Math.sin(t * 17));
    // stem (the bolts leave from its tip)
    g.fillStyle = "#e86aa8"; rrect(g, -0.045, -0.3, 0.09, 0.12, 0.035); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.016; g.stroke();
    if (M.fire > 0.01) blob(q, 0, -0.3, 0.16, `rgba(255,240,120,${M.fire})`, "rgba(255,200,60,0)");
    // body
    blob(q, 0, 0.02, 0.42, `rgba(255,120,190,${0.12 + 0.15 * hot})`, "rgba(255,100,180,0)");
    const fill = g.createLinearGradient(0, 0.26, 0, -0.22);
    fill.addColorStop(0, rgb(mixC([255, 182, 220], [255, 140, 140], hot))); fill.addColorStop(1, rgb(mixC([240, 110, 175], [230, 60, 80], hot)));
    g.strokeStyle = INK; g.lineWidth = 0.034; g.stroke(p);
    g.fillStyle = fill; g.fill(p);
    g.save(); g.clip(p);
    for (const gy of GYRI) { const gp = pathOf(crPts(gy, 8, false), false); g.strokeStyle = "rgba(170,40,110,0.75)"; g.lineWidth = 0.016; g.stroke(gp); g.save(); g.translate(0.004, 0.008); g.strokeStyle = "rgba(255,230,245,0.55)"; g.lineWidth = 0.007; g.stroke(gp); g.restore(); }
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(-0.14, 0.17, 0.08, 0.03, 0.3, 0, TAU); g.fill();
    g.restore();
    // cheeks
    const ck = 0.45 - 0.3 * M.pan;
    blob(g, -0.21, -0.1, 0.05, `rgba(255,90,140,${ck})`, "rgba(255,90,140,0)"); blob(g, 0.21, -0.1, 0.05, `rgba(255,90,140,${ck})`, "rgba(255,90,140,0)");
    this.drawFace(g, q, t, M);
    this.drawCap(g, t);
    this.drawZzz(g, t, M);
    this.drawSweat(g, t, M);
    this.drawMegaphone(g, q, t, M);
  }
  private eye(g: Ctx, x: number, y: number, r: number, open: number, pupil: number, look: P2, lidTilt: number) {
    const oa = smooth((open - 0.03) / 0.12), ca = 1 - oa;
    if (ca > 0.01) { // closed: a sleepy curve with lashes
      g.save(); g.globalAlpha *= ca; g.strokeStyle = INK; g.lineWidth = r * 0.3;
      g.beginPath(); g.moveTo(x - r * 0.9, y); g.quadraticCurveTo(x, y - r * 0.75, x + r * 0.9, y); g.stroke();
      g.lineWidth = r * 0.16; for (const k of [-0.6, 0, 0.6]) { const bx = x + k * r * 0.75, by = y - r * 0.37 * (1 - k * k * 0.6); g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + k * r * 0.25, by - r * 0.3); g.stroke(); }
      g.restore();
    }
    if (oa < 0.01) return;
    const ry = r * 1.1, lidY = y + ry - 2 * ry * clamp01(Math.max(open, 0.12));
    g.save(); g.globalAlpha *= oa;
    const e = new Path2D(); e.ellipse(x, y, r, ry, 0, 0, TAU);
    g.fillStyle = "#ffffff"; g.fill(e);
    g.save(); g.clip(e);
    const px = x + look[0] * r * 0.45, py = y + look[1] * r * 0.45;
    g.fillStyle = INK; g.beginPath(); g.arc(px, py, r * pupil, 0, TAU); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px + r * pupil * 0.35, py + r * pupil * 0.35, r * pupil * 0.32, 0, TAU); g.fill();
    if (open < 0.995) { // the heavy lid
      g.translate(x, lidY); g.rotate(lidTilt);
      g.fillStyle = "#f08cc0"; g.fillRect(-r * 1.6, 0, r * 3.2, ry * 2.6);
      g.strokeStyle = INK; g.lineWidth = r * 0.22; g.beginPath(); g.moveTo(-r * 1.6, 0); g.lineTo(r * 1.6, 0); g.stroke();
    }
    g.restore();
    g.strokeStyle = INK; g.lineWidth = r * 0.2; g.stroke(e);
    g.restore();
  }
  private drawFace(g: Ctx, q: Ctx, t: number, M: Mood) {
    const ex = 0.115, ey = -0.035;
    const angry = M.fire * (1 - M.snap);
    const r = 0.068 * (1 + 0.32 * M.pan + 0.12 * M.snap);
    // left eye (screen left): half open on "half awake"; both pop on the alarm
    const openL = Math.max(0.5 * M.half, M.alarm, M.pan, M.snap, M.yell);
    const openR = Math.max(0.85 * M.alarm, M.pan, M.snap, M.yell);
    const pupil = lerp(lerp(0.5, 0.42, M.alarm), 0.22, Math.max(M.pan, M.yell * (1 - M.snap))) * (1 + 0.3 * M.snap);
    const lookDown = clamp01(M.alarm * 1.2 - M.pan);
    const look: P2 = [lerp(0.3, -0.1, lookDown) * (1 - M.pan) + 0.2 * Math.sin(t * 9) * M.pan * (1 - M.yell), lerp(-0.4, -0.9, lookDown) * (1 - M.snap)];
    this.eye(g, -ex, ey, r, openL, pupil, look, lerp(-0.2, 0, M.alarm) - 0.3 * angry);
    this.eye(g, ex, ey, r, openR, pupil, look, 0.3 * angry);
    q.fillStyle = `rgba(255,255,255,${0.05 * Math.max(openL, openR)})`; q.beginPath(); q.arc(0, ey, 0.2, 0, TAU); q.fill();
    // brows: droopy (half awake) -> high (alarm / panic / snap) -> angry V (fire)
    const ba = Math.max(M.half, M.alarm, M.pan, M.snap, angry);
    if (ba > 0.01) {
      const by = ey + r * 1.3 + 0.03 * Math.max(M.alarm, M.pan, M.snap * 0.7);
      g.save(); g.globalAlpha *= ba; g.strokeStyle = INK; g.lineWidth = 0.022;
      for (const s of [-1, 1]) {
        const droop = s < 0 ? 0.025 * M.half * (1 - M.alarm) : 0;
        const iy = by - 0.04 * angry + 0.01 * M.pan, oy = by - droop + 0.012 * angry - 0.01 * M.pan;
        g.beginPath(); g.moveTo(s * 0.055, iy); g.quadraticCurveTo(s * 0.115, (iy + oy) / 2 + 0.018, s * 0.175, oy); g.stroke();
      }
      g.restore();
    }
    // mouth
    const my = -0.155, aYell = M.yell, top = Math.max(M.alarm, M.pan, M.snap);
    const aO = Math.max(M.alarm * (1 - M.pan), M.snap) * (1 - aYell);
    const aWob = M.pan * (1 - aYell) * (1 - M.snap);
    const aGrog = M.half * (1 - top) * (1 - aYell);
    const aSleep = (1 - M.half) * (1 - top) * (1 - aYell);
    if (aSleep > 0.01) { // a dozy little "o", breathing
      const br = 0.018 + 0.006 * Math.sin(t * 2.2);
      g.save(); g.globalAlpha *= aSleep; g.fillStyle = "#5a1030"; g.beginPath(); g.ellipse(0.01, my + 0.01, br * 1.1, br, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.012; g.stroke(); g.restore();
    }
    if (aGrog > 0.01) { // groggy wavy line
      g.save(); g.globalAlpha *= aGrog; g.strokeStyle = INK; g.lineWidth = 0.016; g.beginPath(); g.moveTo(-0.05, my + 0.01);
      g.bezierCurveTo(-0.02, my + 0.03, 0.01, my - 0.01, 0.05, my + 0.012); g.stroke(); g.restore();
    }
    if (aO > 0.01) { // stunned "o"
      g.save(); g.globalAlpha *= aO; g.fillStyle = "#5a1030"; g.beginPath(); g.ellipse(0, my, 0.03, 0.04, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(); g.restore();
    }
    if (aWob > 0.01) { // panicked wobbly grimace with teeth
      g.save(); g.globalAlpha *= aWob;
      const mp = new Path2D(), w2 = 0.085, h2 = 0.05;
      for (let i = 0; i <= 10; i++) { const u = i / 10, x = -w2 + 2 * w2 * u, y = my + h2 * 0.5 + 0.008 * Math.sin(u * 18 + t * 40); if (i) mp.lineTo(x, y); else mp.moveTo(x, y); }
      for (let i = 10; i >= 0; i--) { const u = i / 10; mp.lineTo(-w2 + 2 * w2 * u, my - h2 * 0.5 - 0.008 * Math.sin(u * 15 - t * 37)); }
      mp.closePath();
      g.fillStyle = "#ffffff"; g.fill(mp); g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(mp);
      g.save(); g.clip(mp); g.lineWidth = 0.008; g.beginPath(); g.moveTo(-w2, my); g.lineTo(w2, my); for (let i = 1; i < 5; i++) { const x = -w2 + (2 * w2 * i) / 5; g.moveTo(x, my - h2); g.lineTo(x, my + h2); } g.stroke(); g.restore();
      g.restore();
    }
    if (aYell > 0.01) { // the scream: a huge open mouth with a tongue
      g.save(); g.globalAlpha *= Math.min(1, aYell * 1.5);
      const s = 0.6 + 0.4 * aYell + 0.06 * Math.sin(t * 30);
      const mp = new Path2D(); mp.ellipse(-0.005, my - 0.01, 0.075 * s, 0.065 * s, 0, 0, TAU);
      g.fillStyle = "#4a0a24"; g.fill(mp);
      g.save(); g.clip(mp); g.fillStyle = "#ff5a7a"; g.beginPath(); g.ellipse(-0.005, my - 0.07 * s, 0.05 * s, 0.035 * s, 0, 0, TAU); g.fill();
      g.fillStyle = "#ffffff"; g.fillRect(-0.06 * s, my + 0.035 * s, 0.11 * s, 0.02 * s); g.restore();
      g.strokeStyle = INK; g.lineWidth = 0.016; g.stroke(mp);
      g.restore();
    }
  }
  private drawCap(g: Ctx, t: number) {
    const d = Math.max(0, t - (W.panics - 0.1));
    const a = 1 - smooth(d / 0.5);
    if (a < 0.01) return;
    const fx = -0.35 * d, fy = 1.6 * d - 1.2 * d * d, rot = 0.32 + 4.5 * d + 0.04 * Math.sin(t * 1.9), tipY = 0.27 + 0.02 * Math.sin(t * 2.3);
    g.save(); g.globalAlpha *= a; g.translate(-0.09 + fx, 0.225 + fy); g.rotate(rot);
    const cone = new Path2D();
    cone.moveTo(-0.19, 0.02); cone.quadraticCurveTo(-0.04, 0.4, -0.33, tipY); cone.quadraticCurveTo(0.02, 0.27, 0.19, 0.02); cone.closePath();
    g.strokeStyle = INK; g.lineWidth = 0.03; g.stroke(cone);
    g.fillStyle = "#3d6fe6"; g.fill(cone);
    g.save(); g.clip(cone); g.strokeStyle = "#9cc0ff"; g.lineWidth = 0.035; for (const k of [0.1, 0.19, 0.27]) { g.beginPath(); g.moveTo(-0.4, k + 0.05); g.lineTo(0.3, k - 0.08); g.stroke(); } g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(cone);
    g.fillStyle = "#f4f8ff"; rrect(g, -0.21, -0.025, 0.42, 0.065, 0.03); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke();
    g.beginPath(); g.arc(-0.33, tipY, 0.045, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  private drawZzz(g: Ctx, t: number, M: Mood) {
    const a0 = (1 - M.half) * (1 - M.alarm);
    if (a0 < 0.01) return;
    for (let i = 0; i < 3; i++) {
      const u = cyc(t * 0.55 + i / 3), a = a0 * Math.sin(Math.PI * u);
      if (a < 0.01) continue;
      g.save(); g.globalAlpha *= a;
      text(g, "z", 0.31 + 0.12 * u + 0.02 * Math.sin(u * 9), 0.2 + 0.24 * u, 0.06 + 0.05 * u, "#e8f4ff", INK, 0.22, 0.2);
      g.restore();
    }
  }
  private drawSweat(g: Ctx, t: number, M: Mood) {
    const a0 = M.pan * (1 - M.snap);
    if (a0 < 0.01) return;
    for (let i = 0; i < 4; i++) {
      const s = i % 2 ? 1 : -1, u = cyc(t * 1.4 + i * 0.27), a = a0 * Math.sin(Math.PI * u);
      if (a < 0.02) continue;
      const x = s * (0.3 + 0.12 * u), y = 0.12 + 0.1 * u - 0.25 * u * u;
      g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(s * (0.6 + u));
      g.beginPath(); g.moveTo(0, 0.035); g.quadraticCurveTo(0.03, -0.01, 0, -0.025); g.quadraticCurveTo(-0.03, -0.01, 0, 0.035);
      g.fillStyle = "#bfe9ff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.008; g.stroke();
      g.restore();
    }
  }
  private drawMegaphone(g: Ctx, q: Ctx, t: number, M: Mood) {
    const k = M.yell;
    if (k < 0.01) return;
    const s = back(clamp01(k * 1.1), 2.2), ang = 0.12 + 0.03 * Math.sin(t * 23);
    const m0: P2 = [0.085, -0.17], Lm = 0.3;
    const along = (d: number, o: number): P2 => [m0[0] + (Math.cos(ang) * d - Math.sin(ang) * o) * s, m0[1] + (Math.sin(ang) * d + Math.cos(ang) * o) * s];
    // noodle arms (behind the horn)
    const arm = (from: P2, ctl: P2, to: P2) => {
      g.save(); g.globalAlpha *= smooth(k * 2);
      g.beginPath(); g.moveTo(...from); g.quadraticCurveTo(...ctl, ...to);
      g.strokeStyle = INK; g.lineWidth = 0.04; g.stroke(); g.strokeStyle = "#f58cc2"; g.lineWidth = 0.022; g.stroke();
      g.fillStyle = "#ffd0e6"; g.beginPath(); g.arc(...to, 0.032, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.012; g.stroke();
      g.restore();
    };
    arm([0.3, -0.1], [0.38, -0.3], along(0.2, -0.075));
    arm([-0.3, -0.1], [-0.22, -0.34], along(0.06, -0.04));
    g.save(); g.translate(...m0); g.rotate(ang); g.scale(s, s);
    const horn = new Path2D(); horn.moveTo(0, -0.032); horn.lineTo(Lm, -0.12); horn.lineTo(Lm, 0.12); horn.lineTo(0, 0.032); horn.closePath();
    g.strokeStyle = INK; g.lineWidth = 0.03; g.stroke(horn);
    const hg = g.createLinearGradient(0, 0.12, 0, -0.12); hg.addColorStop(0, "#ffb347"); hg.addColorStop(1, "#ff6a1e");
    g.fillStyle = hg; g.fill(horn);
    g.save(); g.clip(horn); g.fillStyle = "#ffffff"; g.fillRect(Lm * 0.55, -0.2, 0.05, 0.4); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, 0.03, Lm, 0.03); g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(horn);
    g.fillStyle = "#ffe3a0"; g.beginPath(); g.ellipse(Lm, 0, 0.035, 0.12, 0, 0, TAU); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.016; g.stroke();
    g.fillStyle = "#3a1a10"; g.beginPath(); g.ellipse(Lm + 0.005, 0, 0.02, 0.085, 0, 0, TAU); g.fill();
    g.fillStyle = "#333a4c"; rrect(g, -0.04, -0.03, 0.05, 0.06, 0.015); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.01; g.stroke();
    // shout arcs out of the bell
    for (let i = 0; i < 3; i++) {
      const u = cyc(t * 2.2 + i / 3), a = k * Math.sin(Math.PI * u);
      if (a < 0.01) continue;
      g.save(); g.globalAlpha *= a;
      g.beginPath(); g.arc(Lm + 0.02 + 0.11 * u, 0, 0.1 + 0.1 * u, -0.7, 0.7);
      g.strokeStyle = INK; g.lineWidth = 0.032; g.stroke(); g.strokeStyle = YEL; g.lineWidth = 0.016; g.stroke(); g.restore();
      q.save(); q.globalAlpha *= a * 0.6; q.translate(...m0); q.rotate(ang); q.scale(s, s); q.beginPath(); q.arc(Lm + 0.02 + 0.11 * u, 0, 0.1 + 0.1 * u, -0.7, 0.7); q.strokeStyle = YEL; q.lineWidth = 0.05; q.stroke(); q.restore();
    }
    g.restore();
  }

  // ---------------- lightning ----------------
  private drawBolts(g: Ctx, q: Ctx, t: number, X: XSt, M: Mood) {
    if (X.fire < 0.01) return;
    const o0: P2 = [L.bubble.c[0], L.bubble.c[1] - 0.3], seed = Math.floor(t * 15);
    MUSCLES.forEach((m, i) => {
      const st = this.muscleState(i, t, X, M), o: P2 = [o0[0] + (i - 2.5) * 0.035, o0[1] + 0.02 * Math.abs(i - 2.5)];
      const a = st.str * (0.7 + 0.3 * hash(seed * 3 + i)) * (1 - 0.3 * M.snap);
      if (a < 0.02) return;
      const mxp = (m.a[0] + m.b[0]) / 2, myp = (m.a[1] + m.b[1]) / 2 - st.T * m.w * 0.95 + m.w * 0.3 * m.up;
      const strike = smooth((t - (W.fires - 0.12 + 0.065 * i)) / 0.08); // the bolt reaches down
      const ex = lerp(o[0], mxp, strike), ey = lerp(o[1], myp, strike);
      const n = 9, pts: P2[] = [];
      const dx = ex - o[0], dy = ey - o[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      for (let k = 0; k <= n; k++) {
        const u = k / n, j = k === 0 || k === n ? 0 : (hash(seed * 17 + i * 31 + k * 7) - 0.5) * 0.14 * Math.sin(Math.PI * u) * Math.min(1, len / 0.4);
        pts.push([o[0] + dx * u + nx * j, o[1] + dy * u + ny * j]);
      }
      const wB = 1 + 0.8 * M.flash;
      g.save(); g.globalAlpha *= Math.min(1, a);
      g.strokeStyle = INK; g.lineWidth = 0.03 * wB; strokePts(g, pts);
      g.strokeStyle = YEL; g.lineWidth = 0.018 * wB; strokePts(g, pts);
      g.strokeStyle = "#ffffff"; g.lineWidth = 0.007 * wB; strokePts(g, pts);
      for (const fk of [3, 6]) { // forks
        const b0 = pts[fk], fa = (hash(seed * 5 + i * 13 + fk) - 0.5) * 1.6, fl = (0.06 + 0.05 * hash(seed + i + fk * 3)) * strike;
        const an = Math.atan2(dy, dx) + fa;
        const f1: P2 = [b0[0] + Math.cos(an) * fl, b0[1] + Math.sin(an) * fl];
        const f2: P2 = [f1[0] + Math.cos(an + 0.6) * fl * 0.6, f1[1] + Math.sin(an + 0.6) * fl * 0.6];
        g.strokeStyle = INK; g.lineWidth = 0.018; strokePts(g, [b0, f1, f2]); g.strokeStyle = YEL; g.lineWidth = 0.009; strokePts(g, [b0, f1, f2]);
      }
      g.restore();
      q.save(); q.globalAlpha *= Math.min(1, a); q.strokeStyle = "#ffe880"; q.lineWidth = 0.045 * wB; q.globalAlpha *= 0.6; strokePts(q, pts); q.restore();
      const hit = smooth((strike - 0.8) / 0.2) * a;
      if (hit > 0.01) { blob(q, ex, ey, 0.12, `rgba(255,250,170,${0.9 * hit})`, "rgba(255,220,80,0)"); blob(g, ex, ey, 0.045, `rgba(255,255,230,${0.9 * hit})`, "rgba(255,240,150,0)"); }
    });
  }

  // ---------------- labels, alarm, drop ----------------
  private drawLabels(g: Ctx, q: Ctx, t: number, X: XSt, M: Mood) {
    // MUSCLES -> MUSCLES: LIMP (red -> grey), leader to the quad; clears before the drop
    const mk = clamp01((t - (W.muscles - 0.35)) / 0.4) * (1 - smooth((t - (W.drop - 0.5)) / 0.35));
    if (mk > 0.01) {
      const lm = smooth((t - (W.limp - 0.25)) / 0.3), T = L.musTag, qd = MUSCLES[4];
      const tgt: P2 = [(qd.a[0] + qd.b[0]) / 2 + 0.02, (qd.a[1] + qd.b[1]) / 2 + qd.w * lerp(1.1, 0.25, lm)];
      pill(g, q, T.c[0], T.c[1], lerp(0.58, 0.94, lm), T.h, rgb(mixC([235, 40, 64], [120, 126, 142], lm)), "MUSCLES", mk, t, tgt, "#ffffff", lm > 0.5 ? "#c8ccd8" : "#ff5a6a", bump(t, W.limp - 0.1, W.limp + 0.4, 0.12), "MUSCLES: LIMP", lm);
    }
    // HALF AWAKE (leader to the brain)
    const hk = X.halfEye * (1 - smooth((t - (W.panics - 0.35)) / 0.3));
    if (hk > 0.01) {
      const bub = L.bubble, T = L.halfTag;
      pill(g, q, T.c[0], T.c[1], T.w, T.h, "#7b5cff", "HALF AWAKE", hk, t, [bub.c[0] + 0.3, bub.c[1] + 0.13], "#ffffff", "#b9a6ff", bump(t, W.awake - 0.1, W.awake + 0.4, 0.12));
    }
    // the drop: red chevrons falling beside the body + a red signal up the spine into the brain
    const dk = smooth((t - (W.drop - 0.3)) / 0.2) * (1 - smooth((t - (W.panics + 0.2)) / 0.4)) * (1 - M.snap);
    if (dk > 0.01) {
      const [x0, y0] = L.drop;
      for (let i = 0; i < 3; i++) {
        const u = cyc(t * 1.6 + i / 3), a = dk * Math.sin(Math.PI * u), y = y0 + 0.16 - 0.32 * u;
        g.save(); g.globalAlpha *= a; g.translate(x0, y);
        g.beginPath(); g.moveTo(-0.09, 0.05); g.lineTo(0, -0.04); g.lineTo(0.09, 0.05);
        g.strokeStyle = INK; g.lineWidth = 0.05; g.stroke(); g.strokeStyle = RED; g.lineWidth = 0.028; g.stroke();
        g.restore();
        q.save(); q.globalAlpha *= a * 0.7; q.translate(x0, y); q.beginPath(); q.moveTo(-0.09, 0.05); q.lineTo(0, -0.04); q.lineTo(0.09, 0.05); q.strokeStyle = RED; q.lineWidth = 0.07; q.stroke(); q.restore();
      }
    }
    const su = clamp01((t - (W.drop - 0.45)) / 0.45), sa = bump(t, W.drop - 0.45, W.drop + 0.02, 0.06);
    if (sa > 0.01) {
      for (let k = 0; k < 6; k++) {
        const [px, py] = polyAt(this.signal, su - k * 0.025), a = sa * (1 - k / 6);
        blob(q, px, py, 0.07, `rgba(255,60,70,${a})`, "rgba(255,60,70,0)");
        g.save(); g.globalAlpha *= a; g.fillStyle = k ? RED : "#ffffff"; g.beginPath(); g.arc(px, py, 0.024 * (1 - k * 0.1), 0, TAU); g.fill(); g.restore();
      }
    }
    // DROP DETECTED banner
    // QA: the banner rides the board up on the final jolt; counter it (it would hit the watermark) and fade it from the snap
    const lift = headPos(3, t)[1] - headPos(3, W.drop)[1];
    const bk = X.alarm * (1 - smooth((t - (W.once + 0.2)) / 0.35)) * (1 - smooth((t - M.tSnap) / 0.3));
    if (bk > 0.01) {
      const Bn = { ...L.banner, c: [L.banner.c[0], L.banner.c[1] - 0.8 * lift] as P2 }, s = back(clamp01(bk * 1.05), 2.0), fl = 0.5 + 0.5 * Math.sin(t * 17);
      g.save(); g.translate(Bn.c[0], Bn.c[1] + 0.006 * Math.sin(t * 31) * (1 - M.snap)); g.scale(s, s); g.rotate(-0.025);
      const w = Bn.w, h = Bn.h, pad = 0.022;
      g.fillStyle = INK; rrect(g, -w / 2 - pad, -h / 2 - pad, w + 2 * pad, h + 2 * pad, 0.05); g.fill();
      g.fillStyle = rgb(mixC([150, 10, 26], [255, 40, 60], fl)); rrect(g, -w / 2, -h / 2, w, h, 0.035); g.fill();
      g.save(); rrect(g, -w / 2, -h / 2, w, h, 0.035); g.clip(); // hazard stripes along top + bottom
      for (const yy of [h / 2 - 0.028, -h / 2]) {
        g.fillStyle = YEL; g.fillRect(-w / 2, yy, w, 0.028);
        g.fillStyle = INK; for (let x = -w / 2 - 0.06 + ((t * 0.25) % 0.06); x < w / 2; x += 0.06) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + 0.03, yy); g.lineTo(x + 0.045, yy + 0.028); g.lineTo(x + 0.015, yy + 0.028); g.closePath(); g.fill(); }
      }
      g.restore();
      text(g, "DROP DETECTED", 0.0, -0.004, 0.105, "#ffffff", INK, 0.24);
      for (const sx of [-1, 1]) { // warning triangles
        const ts = 1 + 0.12 * fl;
        g.save(); g.translate(sx * (w / 2 - 0.085), 0); g.scale(ts, ts);
        g.beginPath(); g.moveTo(0, 0.06); g.lineTo(0.062, -0.047); g.lineTo(-0.062, -0.047); g.closePath();
        g.fillStyle = YEL; g.fill(); g.strokeStyle = INK; g.lineWidth = 0.012; g.stroke();
        text(g, "!", 0, -0.01, 0.07, INK, INK, 0);
        g.restore();
      }
      g.restore();
      q.save(); q.globalAlpha *= bk * (0.45 + 0.45 * fl); q.fillStyle = "#ff2030"; rrect(q, Bn.c[0] - Bn.w / 2 - 0.05, Bn.c[1] - Bn.h / 2 - 0.05, Bn.w + 0.1, Bn.h + 0.1, 0.08); q.fill(); q.restore();
    }
    // WE'RE FALLING! burst
    const pk = X.panic;
    if (pk > 0.01) {
      const Bu = { ...L.burst, c: [L.burst.c[0], L.burst.c[1] - 0.5 * lift] as P2 }, s = back(clamp01(pk * 1.05), 2.4), jf = Math.floor(t * 15);
      const jx = (hash(jf) - 0.5) * 0.012, jy = (hash(jf + 7) - 0.5) * 0.012;
      g.save(); g.globalAlpha *= Math.min(1, pk * 2); g.translate(Bu.c[0] + jx, Bu.c[1] + jy); g.scale(s, s); g.rotate(0.06);
      const sp = new Path2D(), N = 18;
      for (let i = 0; i < N * 2; i++) {
        const a = (i / (N * 2)) * TAU, rr = i % 2 ? 0.8 + 0.05 * hash(i * 3) : 1.06 + 0.1 * hash(i + 11);
        const x = Math.cos(a) * Bu.rx * rr, y = Math.sin(a) * Bu.ry * rr;
        if (i) sp.lineTo(x, y); else sp.moveTo(x, y);
      }
      sp.closePath();
      g.strokeStyle = INK; g.lineWidth = 0.04; g.stroke(sp);
      g.fillStyle = YEL; g.fill(sp);
      g.fillStyle = "#fff6c4"; g.beginPath(); g.ellipse(-0.02, 0.03, Bu.rx * 0.62, Bu.ry * 0.55, 0, 0, TAU); g.fill();
      g.strokeStyle = INK; g.lineWidth = 0.014; g.stroke(sp);
      const sh = 0.004 * Math.sin(t * 60);
      text(g, "WE'RE", sh, 0.085, 0.112, "#e8102a", INK, 0.2, -0.04);
      text(g, "FALLING!", -sh, -0.065, 0.104, "#e8102a", INK, 0.2, -0.04);
      g.restore();
      q.save(); q.globalAlpha *= 0.18 * Math.min(1, pk); blob(q, Bu.c[0], Bu.c[1], 0.42, "rgba(255,230,80,0.9)", "rgba(255,200,60,0)"); q.restore();
    }
  }
}

// ============================== root ==============================
export class Holo {
  root = new THREE.Group();
  private xray = new XrayHolo();
  private dbg: THREE.Group | null = null;
  constructor() { this.root.add(this.xray.b.group); }
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG) this.debug(id, t, cam as THREE.PerspectiveCamera);
    this.xray.update(id, t, cam);
  }
  /** TEMP stand-ins + the recommended camera (stills only) */
  private debug(id: number, t: number, cam: THREE.PerspectiveCamera) {
    if (id === 3) { const c = xrayCam(id, t); cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.fov = c.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    if (!this.dbg) {
      const mat = (col: string) => new THREE.MeshBasicMaterial({ color: col });
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), mat("#1c2a5c")); wall.position.set(0, 1.5, -1.4);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 1.4), mat("#2c3a78")); bed.position.set(0, 0.275, -0.6);
      const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.3), mat("#4a5fb0")); duvet.position.set(0.25, 0.64, -0.6);
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.24, 40), mat("#f2c9a0")); head.position.set(-0.75, 0.75, -0.4);
      g.add(wall, bed, duvet, head); g.position.set(...BEDROOM);
      g.traverse((o) => { o.frustumCulled = false; });
      this.dbg = g; this.root.add(g);
    }
    this.dbg.visible = id === 3;
  }
}
