// OWNER: props agent. See /home/user/lookmatch/OUCH_BRIEF.md
// Hard props of "Why We Say Ow" (all deterministic in (id, t); never frustum culled; transparent fx on NOINK):
//   1. X-RAY nerve signal (shot 2): two camera-yawed canvas holograms in BEAN's card plane (body 1.0 x 2.0 m + brain
//      0.6 m): a glowing cyan cartoon skeleton, a nerve line toe -> leg -> spine -> neck -> BRAIN, a red-hot comet pulse at
//      signalAt.p that leaves a burning trail, a red pain starburst on the toe, the brain flashing white/pink with rays
//      on signalAt.brain, a brain -> mouth branch on signalAt.mouth, and on "that ow" (W.owA) a calming cyan wave runs back
//      down the nerve: the toe starburst shrinks and the hot trail cools by "less" (W.less).
//   2. BEAN's coffee MUG (shots 1, 2, 8) at mugPos(); steam wisps; coffee SPLASH droplets (ballistic, ink-outlined) on the
//      stub, a second slosh as he faints (frozen mid-air through the X-ray), puddle splats on the floor.
//   3. LAB: chunky stopwatches beside each tub (running x5 from "ice"), red headphones on the "hearing" volunteer (with
//      sound arcs on the recorded "ow"), the scientist's clipboard.
//   4. CENSOR BAR + grawlix (#@$%!&*) on BEEPS (+ a tiny bored bar for the sailor in shot 7), at the mouth.
// Cast alignment: everything rides BEAN's card frame (origin HOME+(stubAt.x, hopAt, 0), yaw toward camAt like world.ts
// cards). The cast can override anchors through HOOKS (undefined -> default, null -> hide).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { HOME, LAB, TUB_A, TUB_B, W, V3, FPS, BEEPS, STUB1, STUB8, stubAt, signalAt, camAt, shotAt, shotStart, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: props-only framing for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp2 = (a: P2, b: P2, u: number): P2 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

// ============================== public contracts ==============================
/** BEAN's card frame: origin (feet, world), yaw (card faces the camera: atan2(cam.x-o.x, cam.z-o.z), as world.ts),
 *  R = card right, N = card normal (toward camera). local (x, y, d) -> world = o + R x + up y + N d */
export type Frame = { o: V3; yaw: number; R: V3; N: V3 };
export const frameOf = (o: V3, camPos: V3): Frame => {
  const yaw = Math.atan2(camPos[0] - o[0], camPos[2] - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)], N: [Math.sin(yaw), 0, Math.cos(yaw)] };
};
export const toW = (F: Frame, x: number, y: number, d = 0): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** BEAN's hop (shot 1, after the stub, until the faint): card origin y lift (m). Cast: lift BEAN's card by this. */
export const hopAt = (id: number, t: number) => {
  if (id !== 1) return 0;
  const s = t - STUB1, end = W.dramatic - 0.35 - STUB1;
  if (s <= 0.12 || s > end) return 0;
  return 0.07 * Math.abs(Math.sin((Math.PI * (s - 0.12)) / 0.38)) * (1 - smooth((s - (end - 0.5)) / 0.5));
};
/** BEAN card frame per shot (shots 1, 2, 8 at HOME) */
export const beanFrame = (id: number, t: number): Frame => {
  const o = add(HOME, stubAt(id, t).x, hopAt(id, t), 0);
  return frameOf(o, camAt(id, Math.round(t * FPS)).pos);
};
/** X-RAY pose (shot 2), card-local metres (x = card right, y = up from the feet; unmirrored card). The cast draws BEAN
 *  frozen so these joints sit on him (or overrides HOOKS.xray). Right (stubbed) leg toe = brief default (0.3, 0.06). */
export type XrayPose = { toe: P2; ankle: P2; knee: P2; hip: P2; ltoe: P2; lankle: P2; lknee: P2; lhip: P2; pelvis: P2; neck: P2; brain: P2; mouth: P2 };
export const XRAY_POSE: XrayPose = {
  toe: [0.3, 0.06], ankle: [0.18, 0.12], knee: [0.13, 0.44], hip: [0.075, 0.76],
  ltoe: [-0.02, 0.04], lankle: [-0.1, 0.1], lknee: [-0.1, 0.43], lhip: [-0.075, 0.76],
  pelvis: [0, 0.8], neck: [0, 1.2], brain: [0, 1.53], mouth: [0.03, 1.3],
};
/** X-ray holograms float this far in front of BEAN's card (m, along N) */
export const XRAY_D = 0.1;

/** anchor overrides the cast may set (undefined = props default, null = hide that prop) */
export const HOOKS: {
  xray?: (t: number) => XrayPose | undefined;
  mouth?: (id: number, t: number, who: string) => V3 | null | undefined;
  head?: (id: number, t: number, who: string) => { pos: V3; r: number } | null | undefined;
  hand?: (id: number, t: number, who: string) => V3 | null | undefined;
} = {};
const xrayPose = (_id: number, t: number) => HOOKS.xray?.(t) ?? XRAY_POSE;

/** world points of the X-ray (cast: align toe/brain/mouth to these) */
export const toePos = (id: number, t: number): V3 => { const F = beanFrame(id, t), p = xrayPose(id, t).toe; return toW(F, p[0], p[1], XRAY_D); };
export const brainPos = (id: number, t: number): V3 => { const F = beanFrame(id, t), p = xrayPose(id, t).brain; return toW(F, p[0], p[1], XRAY_D + 0.012); };

/** MUG: 0.12 m tall (grip point = mug centre). Card-local hand points: walk (0.27, 0.88) -> after the stub raised high
 *  (-0.34, 1.24) over 0.22 s -> faint flung (-0.4, 1.3) from W.dramatic. Shot 2 = the frozen end of shot 1.
 *  Shot 8: walk -> jolt to (0.3, 1.02). The cast puts BEAN's mug hand at mugPos().pos. tilt = rad about N. */
export const MUG_H = 0.12;
export const mugLocal = (id: number, t: number): { p: P2; tilt: number } => {
  if (id === 2) return mugLocal(1, shotStart(2) - 0.01);
  const walk: P2 = [0.27, 0.88 + 0.012 * Math.sin(t * 11)];
  if (id === 1) {
    const s = t - STUB1;
    if (s < 0) return { p: walk, tilt: 0.05 * Math.sin(t * 11) };
    const up = glide(s / 0.22), faint = glide((t - (W.dramatic - 0.15)) / 0.5);
    const p = lerp2(lerp2(walk, [-0.34, 1.24], up), [-0.4, 1.3], faint);
    const tilt = 0.75 * Math.sin(Math.PI * clamp01(s / 0.3)) + 0.12 * Math.sin(s * 9) * (1 - faint) * up + (0.55 + 0.08 * Math.sin(t * 2)) * faint;
    return { p, tilt };
  }
  if (id === 8) {
    const s = t - STUB8;
    if (s < 0) return { p: walk, tilt: 0.05 * Math.sin(t * 11) };
    return { p: lerp2(walk, [0.3, 1.02], glide(s / 0.2)), tilt: -0.7 * Math.sin(Math.PI * clamp01(s / 0.35)) * Math.exp(-s) - 0.12 * smooth(s / 0.3) };
  }
  return { p: [0, 0], tilt: 0 };
};
export const mugPos = (id: number, t: number): { show: boolean; pos: V3; tilt: number; yaw: number } => {
  const none = { show: false, pos: [0, 0, 0] as V3, tilt: 0, yaw: 0 };
  if (id !== 1 && id !== 2 && id !== 8) return none;
  const F = id === 2 ? beanFrame(1, shotStart(2) - 0.01) : beanFrame(id, t), m = mugLocal(id, t), h = HOOKS.hand?.(id, t, "bean");
  if (h === null) return none;
  return { show: true, pos: h ?? toW(F, m.p[0], m.p[1], 0.14), tilt: m.tilt, yaw: F.yaw };
};
/** coffee splashes [shot, t]: the stub, the faint slosh (mid-air across the cut, frozen through the X-ray), the callback */
export const SPLASHES: [number, number][] = [[1, STUB1 + 0.04], [1, shotStart(2) - 0.3], [8, STUB8 + 0.04]];

/** LAB: assumed tub-table top height (sets: put the tub table top here, or tell props) */
export const LAB_TABLE_Y = 0.78;
/** stopwatch centre (world): 0.17 m dial facing ~+z, standing on the table at the OUTER side of each tub */
export const stopwatchPos = (k: 0 | 1): V3 => add(k ? TUB_B : TUB_A, k ? 0.36 : -0.36, LAB_TABLE_Y + 0.1, 0.22);
/** stopwatch reading (s): runs x5 from the ice plunge (shots 4-7) */
export const stopwatchAt = (id: number, t: number) => (id >= 4 && id <= 7 ? Math.max(0, t - (W.ice - 0.1)) * 5 : 0);
/** HEADPHONES on the "hearing" volunteer (shot 4, from W.hearing-0.7): default head LAB+(-0.7,1.5,-0.35), radius 0.2;
 *  play = the recorded "ow" (W.ow3) -> sound arcs */
export const headphonesAt = (id: number, t: number): { show: number; head: V3; r: number; play: number } => {
  const h = HOOKS.head?.(id, t, "hearing");
  const show = id === 4 ? smooth((t - (W.hearing - 0.7)) / 0.35) : 0;
  const play = id === 4 ? smooth((t - (W.ow3 - 0.15)) / 0.15) * (1 - smooth((t - (W.ow3 + 0.7)) / 0.3)) : 0;
  if (h === null || show <= 0) return { show: 0, head: [0, 0, 0], r: 0.2, play: 0 };
  return { show, head: h?.pos ?? add(LAB, -0.7, 1.5, -0.35), r: h?.r ?? 0.2, play };
};
/** scientist's CLIPBOARD (0.24 x 0.32 m, centre): default LAB+(-1.38,1.02,0.32) in shot 4 only (HOOKS.hand "scientist") */
export const clipboardAt = (id: number, t: number): { show: number; pos: V3 } => {
  const h = HOOKS.hand?.(id, t, "scientist");
  if (h === null || (h === undefined && id !== 4)) return { show: 0, pos: [0, 0, 0] };
  return { show: 1, pos: h ?? add(LAB, -1.38, 1.02 + 0.01 * Math.sin(t * 1.3), 0.32) };
};

/** CENSOR: BEEPS from story + the sailor's bored little bars (shot 7) */
export const SAILOR_BEEPS: number[] = [W.allday + 0.15, W.allday + 0.85, W.less2 + 0.25];
const CENSOR_HOLD: Record<string, number> = { swearer: 1.15, bean: 9, sailor: 0.45 };
/** bar size (m) per who */
export const CENSOR_SIZE: Record<string, [number, number]> = { swearer: [0.5, 0.21], bean: [0.32, 0.165], sailor: [0.15, 0.055] };
const beepsOf = (who: string) => (who === "sailor" ? SAILOR_BEEPS : BEEPS.filter((b) => b[1] === who).map((b) => b[0]));
/** censor state: k 0..1 visible, scale (pop overshoot), shake (rad), since = s since the latest beep, t0 = that beep */
export const censorAt = (id: number, t: number, who: string): { k: number; scale: number; shake: number; since: number; t0: number } => {
  let k = 0, scale = 1, since = -1, t0 = -1;
  for (const e of beepsOf(who)) {
    if (shotAt(Math.round(e * FPS)).id !== id) continue;
    const u = t - e, D = CENSOR_HOLD[who] ?? 1;
    if (u < -0.04) continue;
    const kk = smooth((u + 0.04) / 0.1) * (1 - smooth((u - D) / 0.15));
    if (kk > k) { k = kk; scale = 0.7 + 0.3 * smooth((u + 0.04) / 0.1) + 0.16 * Math.sin(Math.PI * clamp01(u / 0.2)); }
    if (u >= 0) { since = u; t0 = e; }
  }
  const shake = k > 0 ? 0.045 * Math.sin(t * 61) * Math.exp(-Math.max(0, since) * 1.5) : 0;
  return { k, scale, shake, since, t0 };
};
/** mouth (world) for a censor: HOOKS.mouth or defaults (bean: card-local (0.03,1.3); swearer/sailor LAB+(0.7,1.3,0.08)) */
export const mouthPos = (id: number, t: number, who: string): V3 | null => {
  const h = HOOKS.mouth?.(id, t, who);
  if (h !== undefined) return h;
  if (who === "bean") return toW(beanFrame(id, t), 0.03, 1.3, 0.04);
  return add(LAB, 0.7, 1.3, 0.08);
};
/** bar centre (world): 0.07 m in front of the mouth toward the camera */
export const censorPos = (id: number, t: number, who: string): V3 | null => {
  const m = mouthPos(id, t, who);
  if (!m) return null;
  const c = camAt(id, Math.round(t * FPS)).pos, d = Math.hypot(c[0] - m[0], c[1] - m[1], c[2] - m[2]) || 1;
  return [m[0] + ((c[0] - m[0]) / d) * 0.07, m[1] + ((c[1] - m[1]) / d) * 0.07, m[2] + ((c[2] - m[2]) / d) * 0.07];
};

// ============================== nerve path ==============================
const wig = (pts: P2[], amp: number, seed: number): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 0.02));
    const nx = -(b[1] - a[1]) / (L || 1), ny = (b[0] - a[0]) / (L || 1);
    for (let j = 0; j < n; j++) {
      const u = j / n, w = amp * Math.sin((i * 7.1 + j * 0.9 + seed) * 1.3) * Math.sin(Math.PI * u);
      out.push([lerp(a[0], b[0], u) + nx * w, lerp(a[1], b[1], u) + ny * w]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const nervePath = (X: XrayPose): P2[] => wig([X.toe, [lerp(X.toe[0], X.ankle[0], 0.5), lerp(X.toe[1], X.ankle[1], 0.5) + 0.015], X.ankle, X.knee, X.hip, [0.03, X.pelvis[1] + 0.03], [0.008, lerp(X.pelvis[1], X.neck[1], 0.5)], X.neck, [X.brain[0], X.brain[1] - 0.12]], 0.008, 1);
const mouthPath = (X: XrayPose): P2[] => wig([[X.brain[0] + 0.04, X.brain[1] - 0.1], [X.mouth[0] + 0.03, lerp(X.brain[1] - 0.1, X.mouth[1], 0.5)], X.mouth], 0.006, 4);
const cumLen = (P: P2[]) => { const c = [0]; for (let i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return c; };
const alongPath = (P: P2[], u: number): P2 => {
  const c = cumLen(P), L = c[c.length - 1] * clamp01(u);
  for (let i = 1; i < P.length; i++) if (c[i] >= L) { const k = (L - c[i - 1]) / (c[i] - c[i - 1] || 1); return lerp2(P[i - 1], P[i], k); }
  return P[P.length - 1];
};
const subPath = (P: P2[], u0: number, u1: number): P2[] => {
  const c = cumLen(P), L = c[c.length - 1], a = L * clamp01(u0), b = L * clamp01(u1), out: P2[] = [alongPath(P, u0)];
  for (let i = 1; i < P.length - 1; i++) if (c[i] > a && c[i] < b) out.push(P[i]);
  out.push(alongPath(P, u1));
  return out;
};
/** pulse head (world) at signalAt.p */
export const pulsePos = (id: number, t: number): V3 => { const F = beanFrame(id, t), q = alongPath(nervePath(xrayPose(id, t)), signalAt(id, t).p); return toW(F, q[0], q[1], XRAY_D); };

// ============================== X-ray hologram ==============================
const BW = 1024, BH = 2048, BPM = 1024; // body canvas: 1.0 x 2.0 m (local x -0.5..0.5, y -0.04..1.96)
const BX0 = -0.5, BY1 = 1.96;
const BRN = 1024, BRM = 0.6;            // brain canvas: 0.6 m square centred on the brain
const HOTC = "#fff0b0", CY = "#7ff4ff", CYD = "rgba(110,235,255,";
type Sig = ReturnType<typeof signalAt>;
class Xray {
  group = new THREE.Group(); body: THREE.Group; brain: THREE.Group;
  private bcv = document.createElement("canvas"); private rcv = document.createElement("canvas");
  private btex: THREE.CanvasTexture; private rtex: THREE.CanvasTexture;
  private mats: THREE.MeshBasicMaterial[] = []; private last = "";
  constructor() {
    this.bcv.width = BW; this.bcv.height = BH; this.rcv.width = this.rcv.height = BRN;
    const mk = (cv: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    this.btex = mk(this.bcv); this.rtex = mk(this.rcv);
    const plane = (tex: THREE.Texture, w: number, h: number, ro: number) => {
      const g = new THREE.Group(), geo = new THREE.PlaneGeometry(w, h);
      const main = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
      const glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.9, 1.0, 1.0), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
      glow.position.z = 0.002; main.renderOrder = ro; glow.renderOrder = ro + 1;
      for (const m of [main, glow]) { m.layers.set(NOINK); m.frustumCulled = false; g.add(m); this.mats.push(m.material as THREE.MeshBasicMaterial); }
      return g;
    };
    this.body = plane(this.btex, BW / BPM, BH / BPM, 22);
    this.brain = plane(this.rtex, BRM, BRM, 24);
    this.group.add(this.body, this.brain); this.group.visible = false;
  }
  update(id: number, t: number) {
    const s = signalAt(id, t);
    this.group.visible = s.show > 0.002;
    if (!this.group.visible) return;
    const X = xrayPose(id, t), F = beanFrame(id, t);
    const e = 0.86 + 0.14 * glide(s.show); // scale-in about the hip so it never pops
    this.group.position.set(...toW(F, 0, 0, XRAY_D)); this.group.rotation.set(0, F.yaw, 0);
    this.body.position.set((BX0 + BW / BPM / 2) * e, (BY1 - BH / BPM / 2) * e + (1 - e) * 0.8, 0); this.body.scale.setScalar(e);
    this.brain.position.set(X.brain[0] * e, X.brain[1] * e + (1 - e) * 0.8, 0.012); this.brain.scale.setScalar(e);
    this.mats.forEach((m, i) => (m.opacity = s.show * (i % 2 ? 0.55 : 1)));
    const key = t.toFixed(3);
    if (key !== this.last) { this.last = key; this.drawBody(X, t, s); this.drawBrain(t, s); }
  }
  /** calm wave (on "that ow"): 0 at the brain -> 1 at the toe; cool = how much the pain has eased (by "less") */
  private calm(t: number) { return { wave: smooth((t - (W.owA + 0.05)) / (W.less - W.owA - 0.2)), cool: smooth((t - (W.less - 0.45)) / 0.6) }; }
  private drawBody(X: XrayPose, t: number, s: Sig) {
    const g = this.bcv.getContext("2d")!;
    const px = (p: P2): P2 => [(p[0] - BX0) * BPM, (BY1 - p[1]) * BPM];
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BW, BH);
    g.lineCap = "round"; g.lineJoin = "round";
    const line = (pts: P2[], col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => { const q = px(p); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.stroke(); };
    const glowLine = (pts: P2[], core: string, halo: string, w: number, a = 1) => {
      g.globalAlpha = 0.1 * a; line(pts, halo, w * 5.5); g.globalAlpha = 0.2 * a; line(pts, halo, w * 3.2);
      g.globalAlpha = 0.85 * a; line(pts, halo, w * 1.7); g.globalAlpha = a; line(pts, core, w * 0.7); g.globalAlpha = 1;
    };
    // dark soft body backing: the hologram reads on any background
    // (an elliptical soft mask keeps the backing + scan lines free of hard canvas edges)
    g.fillStyle = "rgba(4,16,40,0.45)"; g.fillRect(0, 0, BW, BH);
    g.fillStyle = "rgba(140,245,255,0.07)";
    for (let y = ((t * 40) % 16) - 16; y < BH; y += 16) g.fillRect(0, y, BW, 5);
    const c0 = px([0, 0.86]);
    g.save(); g.translate(c0[0], c0[1]); g.scale(1, 2.0);
    const bk = g.createRadialGradient(0, 0, 0, 0, 0, 480);
    bk.addColorStop(0, "rgba(0,0,0,1)"); bk.addColorStop(0.55, "rgba(0,0,0,0.75)"); bk.addColorStop(1, "rgba(0,0,0,0)");
    g.globalCompositeOperation = "destination-in"; g.fillStyle = bk; g.fillRect(-520, -520, 1040, 1040);
    g.restore(); g.globalCompositeOperation = "source-over";
    // ---- skeleton (cartoon bones) ----
    const BONE = "rgba(235,255,255,0.95)", HALO = CYD + "0.7)";
    const bone = (a: P2, b: P2, w: number) => {
      glowLine([a, b], BONE, HALO, w * BPM, 0.62);
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      for (const p of [a, b]) for (const sgn of [-1, 1]) { // knobby ends
        const q = px([p[0] + nx * w * 0.55 * sgn, p[1] + ny * w * 0.55 * sgn]);
        g.globalAlpha = 0.62; g.fillStyle = CYD + "0.75)"; g.beginPath(); g.arc(q[0], q[1], w * BPM * 0.62, 0, TAU); g.fill();
        g.fillStyle = "rgba(235,255,255,0.9)"; g.beginPath(); g.arc(q[0], q[1], w * BPM * 0.32, 0, TAU); g.fill(); g.globalAlpha = 1;
      }
    };
    bone(X.ankle, X.knee, 0.028); bone(X.knee, X.hip, 0.032); bone(X.lankle, X.lknee, 0.028); bone(X.lknee, X.lhip, 0.032);
    glowLine([X.ankle, X.toe], BONE, HALO, 0.022 * BPM, 0.62);
    glowLine([X.lankle, X.ltoe], BONE, HALO, 0.022 * BPM, 0.62);
    glowLine([[X.lhip[0] - 0.03, X.pelvis[1] + 0.06], [X.lhip[0] - 0.01, X.pelvis[1] - 0.03], [0, X.pelvis[1] - 0.06], [X.hip[0] + 0.01, X.pelvis[1] - 0.03], [X.hip[0] + 0.03, X.pelvis[1] + 0.06]], BONE, HALO, 0.018 * BPM, 0.55);
    const nv = 9;
    for (let i = 0; i < nv; i++) {
      const u = (i + 0.5) / nv, q = px([lerp(0, X.neck[0], u), lerp(X.pelvis[1] + 0.03, X.neck[1], u)]);
      g.globalAlpha = 0.6; g.fillStyle = CYD + "0.55)"; g.beginPath(); g.roundRect(q[0] - 26, q[1] - 13, 52, 26, 10); g.fill();
      g.fillStyle = "rgba(230,255,255,0.85)"; g.beginPath(); g.roundRect(q[0] - 17, q[1] - 7, 34, 14, 6); g.fill(); g.globalAlpha = 1;
    }
    for (let i = 0; i < 4; i++) {
      const y = lerp(X.neck[1] - 0.08, X.pelvis[1] + 0.2, i / 3.4), w = 0.17 - i * 0.012;
      const sx = lerp(0, X.neck[0], clamp01((y - X.pelvis[1] - 0.03) / (X.neck[1] - X.pelvis[1] - 0.03))); // QA1: ribs follow the leaning spine
      for (const sg of [-1, 1]) glowLine([[sx + 0.01 * sg, y], [sx + w * 0.7 * sg, y + 0.02], [sx + w * sg, y - 0.03], [sx + w * 0.85 * sg, y - 0.08]], "rgba(235,255,255,0.8)", CYD + "0.55)", 0.012 * BPM, 0.38);
    }
    // ---- nerve ----
    const NP = nervePath(X), MP = mouthPath(X), c = this.calm(t);
    glowLine(NP, "rgba(220,255,255,0.95)", CYD + "0.85)", 0.011 * BPM, 0.9);
    glowLine(MP, "rgba(220,255,255,0.9)", CYD + "0.8)", 0.009 * BPM, 0.55 + 0.35 * s.mouth);
    if (s.p > 0.002) { // hot burning trail toe -> pulse (cools to calm cyan-green by "less")
      const tr = subPath(NP, 0, s.p), fl = 0.85 + 0.15 * Math.sin(t * 23), hot = 1 - c.cool;
      if (hot > 0.01) glowLine(tr, HOTC, `rgba(255,${Math.round(80 + 40 * Math.sin(t * 17))},40,1)`, 0.016 * BPM, hot * fl);
      if (c.cool > 0.01) glowLine(tr, "#ffffff", "rgba(90,255,220,1)", 0.014 * BPM, c.cool);
    }
    if (s.mouth > 0.002) glowLine(subPath(MP, 0, s.mouth), HOTC, "rgba(255,120,60,1)", 0.014 * BPM, 1 - c.cool * 0.6);
    // ---- toe pain starburst ----
    const star = (x: number, y: number, r0: number, r1: number, n: number, rot: number, col: string, a: number) => {
      g.globalAlpha = a; g.fillStyle = col; g.beginPath();
      for (let k = 0; k < n * 2; k++) { const an = rot + (k / (n * 2)) * TAU, rr = k % 2 ? r0 : r1 * (0.85 + 0.25 * Math.sin(k * 2.7)); g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
      g.closePath(); g.fill(); g.globalAlpha = 1;
    };
    const tp = px(X.toe), pain = (1 - 0.6 * c.cool) * (0.92 + 0.12 * Math.sin(t * 14)), R0 = 150 * pain;
    const tg = g.createRadialGradient(tp[0], tp[1], 0, tp[0], tp[1], R0 * 1.8);
    tg.addColorStop(0, `rgba(255,${Math.round(90 + 140 * c.cool)},${Math.round(60 + 160 * c.cool)},0.75)`); tg.addColorStop(1, "rgba(255,60,40,0)");
    g.fillStyle = tg; g.fillRect(tp[0] - R0 * 2, tp[1] - R0 * 2, R0 * 4, R0 * 4);
    star(tp[0], tp[1], R0 * 0.42, R0, 9, t * 0.8, c.cool < 0.5 ? "#ff3b2a" : "#ff9a7a", 0.9);
    star(tp[0], tp[1], R0 * 0.25, R0 * 0.62, 9, t * 0.8 + 0.3, "#ffe07a", 0.95);
    g.fillStyle = "#ffffff"; g.beginPath(); g.arc(tp[0], tp[1], R0 * 0.16, 0, TAU); g.fill();
    // ---- calming wave (brain -> toe) on "that ow" ----
    if (c.wave > 0.001 && c.wave < 0.999) {
      const q = px(alongPath(NP, 1 - c.wave)), a = Math.sin(Math.PI * c.wave);
      for (let k = 0; k < 3; k++) { g.globalAlpha = a * (0.8 - k * 0.22); g.strokeStyle = k ? "rgba(120,255,220,1)" : "#ffffff"; g.lineWidth = 12 - k * 3; g.beginPath(); g.arc(q[0], q[1], 34 + k * 26, 0, TAU); g.stroke(); }
      g.globalAlpha = 1;
    }
    // ---- comet pulse ----
    if (s.p > 0.001 && s.p < 0.999) {
      const hq = px(alongPath(NP, s.p)), tail = subPath(NP, Math.max(0, s.p - 0.16), s.p);
      g.globalAlpha = 0.9; line(tail, "rgba(255,200,90,0.5)", 70); line(tail, "rgba(255,240,180,0.8)", 34); g.globalAlpha = 1;
      const hg = g.createRadialGradient(hq[0], hq[1], 0, hq[0], hq[1], 170);
      hg.addColorStop(0, "rgba(255,255,255,1)"); hg.addColorStop(0.2, "rgba(255,230,140,0.95)"); hg.addColorStop(0.5, "rgba(255,110,50,0.45)"); hg.addColorStop(1, "rgba(255,80,40,0)");
      g.fillStyle = hg; g.fillRect(hq[0] - 180, hq[1] - 180, 360, 360);
      const r = rng(Math.floor(t * 30) + 7);
      g.strokeStyle = "#fff6c8"; g.lineWidth = 6;
      for (let k = 0; k < 6; k++) {
        const an = r() * TAU, L = 60 + r() * 70; g.beginPath(); g.moveTo(hq[0], hq[1]);
        g.lineTo(hq[0] + Math.cos(an) * L * 0.5 + (r() - 0.5) * 30, hq[1] + Math.sin(an) * L * 0.5 + (r() - 0.5) * 30); g.lineTo(hq[0] + Math.cos(an) * L, hq[1] + Math.sin(an) * L); g.stroke();
      }
    }
    if (s.mouth > 0.97) { // mouth zap when the branch arrives
      const mq = px(X.mouth), u = clamp01((t - (W.mouth + 0.2)) / 0.5);
      star(mq[0], mq[1], 22, 70 + 30 * Math.sin(t * 12), 7, t, "#ffd060", (1 - u * 0.7) * 0.9);
    }
    this.btex.needsUpdate = true;
  }
  private drawBrain(t: number, s: Sig) {
    const g = this.rcv.getContext("2d")!, S = BRN / BRM;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BRN, BRN);
    g.translate(BRN / 2, BRN / 2); g.lineCap = "round"; g.lineJoin = "round";
    const c = this.calm(t), df = t - (W.split + 0.35);
    const flash = s.brain * Math.exp(-Math.max(0, df) * 1.6), hotK = s.brain * (1 - c.cool * 0.7);
    const thump = 1 + 0.06 * s.brain * Math.max(0, Math.sin(t * 9)) * (1 - c.cool) + 0.08 * flash;
    g.scale(thump, thump);
    const bw = 0.17 * S, bh = 0.125 * S;
    // cartoon brain: a scalloped cloud (round bumps), flatter underside
    const outline = new Path2D(), n = 14;
    const pt = (k: number): P2 => { const a = Math.PI + (k / n) * TAU, sy = Math.sin(a) > 0 ? 0.78 : 1.0; return [Math.cos(a) * bw, Math.sin(a) * bh * sy]; };
    outline.moveTo(...pt(0));
    for (let k = 0; k < n; k++) {
      const a = pt(k), b = pt(k + 1), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = Math.hypot(mx, my) || 1, bulge = 0.3 * Math.hypot(b[0] - a[0], b[1] - a[1]);
      outline.quadraticCurveTo(mx + (mx / L) * bulge, my + (my / L) * bulge, b[0], b[1]);
    }
    outline.closePath();
    const hr = bw * 1.6, gl = g.createRadialGradient(0, 0, bw * 0.3, 0, 0, hr);
    gl.addColorStop(0, `rgba(${Math.round(110 + 145 * hotK)},${Math.round(230 - 120 * hotK)},${Math.round(255 - 60 * hotK)},${0.45 + 0.45 * flash})`); gl.addColorStop(1, "rgba(80,200,255,0)");
    g.fillStyle = gl; g.fillRect(-hr, -hr, hr * 2, hr * 2);
    g.fillStyle = `rgba(${Math.round(60 + 195 * hotK)},${Math.round(Math.min(255, 170 - 60 * hotK + 85 * flash))},${Math.round(Math.min(255, 210 - 40 * hotK + 45 * flash))},${0.45 + 0.35 * hotK})`;
    g.fill(outline);
    g.save(); g.clip(outline);
    // gyri: bold S-curves per hemisphere
    g.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * flash})`; g.lineWidth = 12;
    const GY: [number, number, number, number, number, number][] = [
      [-0.85, -0.35, -0.55, -0.75, -0.3, -0.3], [-0.8, 0.15, -0.5, -0.15, -0.35, 0.3], [-0.6, 0.55, -0.35, 0.35, -0.12, 0.6],
      [-0.25, -0.8, -0.1, -0.45, -0.25, -0.1], [-0.2, 0.05, -0.05, 0.25, -0.2, 0.45],
    ];
    for (const sg of [-1, 1]) for (const q of GY) {
      g.beginPath(); g.moveTo(q[0] * bw * sg, q[1] * bh); g.bezierCurveTo(q[2] * bw * sg, q[3] * bh - 30, q[2] * bw * sg + 30 * sg, q[3] * bh + 40, q[4] * bw * sg, q[5] * bh); g.stroke();
    }
    g.restore();
    g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, -bh * 1.02); g.quadraticCurveTo(14, 0, 0, bh * 0.6); g.stroke();
    g.strokeStyle = hotK > 0.5 ? "#ffd0e8" : CY; g.lineWidth = 20; g.stroke(outline);
    g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.stroke(outline);
    g.strokeStyle = CY; g.lineWidth = 18; g.beginPath(); g.moveTo(0, bh * 0.8); g.lineTo(0, bh * 1.22); g.stroke();
    if (s.brain > 0.001) {
      const u = clamp01(df / 0.9), a = (1 - u) * s.brain;
      if (a > 0.01) {
        g.strokeStyle = `rgba(255,240,200,${a})`; g.lineWidth = 16;
        for (let k = 0; k < 12; k++) { const an = (k / 12) * TAU + 0.13, r0 = bw * (1.15 + 0.3 * u), r1 = r0 + 70 * (1 - u * 0.5); g.beginPath(); g.moveTo(Math.cos(an) * r0, Math.sin(an) * r0 * 0.85); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1 * 0.85); g.stroke(); }
        g.strokeStyle = `rgba(255,150,200,${a * 0.8})`; g.lineWidth = 14; g.beginPath(); g.ellipse(0, 0, bw * (1.1 + 0.6 * u), bh * (1.1 + 0.6 * u), 0, 0, TAU); g.stroke();
      }
      const blink = s.brain * (1 - c.cool) * (0.5 + 0.5 * Math.sin(t * 10)); // alarm blink until the "ow" calms it
      if (blink > 0.02) { g.fillStyle = `rgba(255,70,90,${0.4 * blink})`; g.fill(outline); }
    }
    this.rtex.needsUpdate = true;
  }
}

// ============================== materials / textures ==============================
const lamb = (col: THREE.ColorRepresentation, map: THREE.Texture | null = null) => twoTone(new THREE.MeshLambertMaterial({ color: col, map }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number) => twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const softTex = () => ctex("ouSoft", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.45, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** our own mug glaze: sunny yellow, orange bands, two little smiling suns (no logos) */
const mugTex = () => ctex("ouMug", 1024, 256, (g) => {
  g.fillStyle = "#ffc53a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#ff8a2a"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 230, 1024, 26);
  g.fillStyle = "#fff6e0"; g.fillRect(0, 34, 1024, 10); g.fillRect(0, 212, 1024, 10);
  for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.arc(30 + i * 57, 128 + (i % 2 ? 50 : -50), 9, 0, TAU); g.fill(); }
  for (const cx of [256, 768]) {
    g.save(); g.translate(cx, 128); g.fillStyle = "#ff6a1a";
    for (let k = 0; k < 12; k++) { g.save(); g.rotate((k / 12) * TAU); g.beginPath(); g.moveTo(-12, -62); g.lineTo(0, -88); g.lineTo(12, -62); g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, 0, 56, 0, TAU); g.fill(); g.lineWidth = 7; g.strokeStyle = "#3a1a10"; g.stroke();
    g.fillStyle = "#3a1a10"; g.beginPath(); g.arc(-18, -10, 7, 0, TAU); g.arc(18, -10, 7, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 4, 26, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    g.restore();
  }
});
const clipTex = () => ctex("ouClipPaper", 512, 680, (g) => {
  g.fillStyle = "#fbf9f1"; g.fillRect(0, 0, 512, 680);
  g.fillStyle = "#1f6e8c"; g.fillRect(0, 0, 512, 92);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 48px ${FONT}`; g.fillText("PAIN TEST", 256, 40); g.font = `700 22px ${FONT}`; g.fillText("ICE WATER  ·  0 °C  ·  TRIAL 7", 256, 76);
  g.textAlign = "left"; g.font = `700 28px ${FONT}`;
  ["Silent", "Say \"OW\"", "Hear \"OW\"", "Button"].forEach((s, i) => {
    const y = 140 + i * 56; g.fillStyle = "#26324a"; g.fillText(s, 40, y);
    g.strokeStyle = "#26324a"; g.lineWidth = 4; g.strokeRect(410, y - 18, 40, 36);
    if (i !== 2) { g.strokeStyle = "#2f8a3a"; g.lineWidth = 8; g.lineCap = "round"; g.beginPath(); g.moveTo(414, y); g.lineTo(428, y + 14); g.lineTo(458, y - 22); g.stroke(); }
    g.strokeStyle = "rgba(38,50,74,0.15)"; g.lineWidth = 2; g.beginPath(); g.moveTo(40, y + 28); g.lineTo(470, y + 28); g.stroke();
  });
  g.strokeStyle = "#26324a"; g.lineWidth = 5; g.beginPath(); g.moveTo(60, 400); g.lineTo(60, 620); g.lineTo(470, 620); g.stroke();
  ([[0.5, "#8aa0b8"], [0.66, "#ff8a2a"], [0.5, "#8aa0b8"], [0.64, "#3aa0d8"]] as [number, string][]).forEach(([h, c], i) => { g.fillStyle = c; g.fillRect(90 + i * 95, 620 - (210 * h) / 0.66, 60, (210 * h) / 0.66); });
  g.fillStyle = "#e0302a"; g.font = `900 40px ${FONT}`; g.fillText("+20%!", 200, 440);
});
const glyphTex = (ch: string, col: string) => ctex("ouGlyph_" + ch + col, 256, 256, (g) => {
  g.font = `900 200px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = 34; g.strokeStyle = "#140a14"; g.strokeText(ch, 128, 136);
  g.fillStyle = col; g.fillText(ch, 128, 136);
  g.lineWidth = 5; g.strokeStyle = "rgba(255,255,255,0.7)"; g.strokeText(ch, 124, 130);
});
const barTex = () => ctex("ouCensorBar", 512, 176, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(4, 4, 504, 168, 26); g.fill();
  g.fillStyle = "#050507"; g.beginPath(); g.roundRect(14, 14, 484, 148, 20); g.fill();
  g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.roundRect(26, 22, 460, 40, 14); g.fill();
});
const arcTex = () => ctex("ouSoundArc", 128, 256, (g) => {
  g.lineCap = "round"; g.strokeStyle = "#ffffff";
  for (let k = 0; k < 3; k++) { g.lineWidth = 16; g.beginPath(); g.arc(-30, 128, 50 + k * 40, -0.6, 0.6); g.stroke(); }
});

// ============================== coffee splash ==============================
type Drop = { v: V3; r: number; d: number };
const NDROP = 16, G = 9.8;
const makeDrops = (seed: number): Drop[] => {
  const r = rng(seed), out: Drop[] = [];
  for (let i = 0; i < NDROP; i++) out.push({ v: [(r() - 0.5) * 1.3, 1.3 + r() * 1.5, (r() - 0.35) * 0.7], r: 0.009 + r() * 0.012, d: r() * 0.04 });
  return out;
};

// ============================== props ==============================
const GLYPHS: [string, string][] = [["#", "#ffd23a"], ["@", "#ff4a3a"], ["$", "#7fe36a"], ["%", "#4ad0ff"], ["!", "#ffffff"], ["&", "#ff7ad0"], ["*", "#ffb03a"]];
const NGLYPH = 14;
export class Props {
  root = new THREE.Group();
  private xray = new Xray();
  private mug = new THREE.Group(); private mugInner = new THREE.Group(); private steam: THREE.Sprite[] = [];
  private drops: THREE.Mesh[][] = []; private puddles: THREE.Mesh[][] = []; private dropSeeds: Drop[][] = [];
  private watches: { g: THREE.Group; cv: HTMLCanvasElement; tex: THREE.CanvasTexture; last: number }[] = [];
  private phones = new THREE.Group(); private arcs: THREE.Sprite[] = [];
  private clip = new THREE.Group();
  private bars: Record<string, { g: THREE.Group; bar: THREE.Mesh; glyphs: THREE.Sprite[] }> = {};
  private vR = new THREE.Vector3(); private vU = new THREE.Vector3();

  constructor() {
    const R = this.root;
    R.add(this.xray.group);
    // ---- mug (0.12 tall, r 0.05) ----
    const prof: [number, number][] = [[0.001, 0], [0.04, 0], [0.046, 0.004], [0.048, 0.02], [0.05, 0.11], [0.052, 0.12], [0.047, 0.12], [0.044, 0.112], [0.043, 0.02], [0.001, 0.018]];
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y - MUG_H / 2)), 40), phong("#ffffff", mugTex(), "#ffffff", 50));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 10, 24, Math.PI * 1.1).rotateZ(-Math.PI * 0.55).translate(0.05, 0.002, 0), lamb("#ffb02a"));
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.0435, 32).rotateX(-Math.PI / 2).translate(0, MUG_H / 2 - 0.018, 0), lamb("#5a2e14"));
    for (const m of [body, handle, coffee]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.mugInner.add(m); }
    this.mug.add(this.mugInner); this.mug.visible = false; R.add(this.mug);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.05, 1.0, 0.95), transparent: true, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 14; s.visible = false; R.add(s); this.steam.push(s);
    }
    // ---- splash droplets + floor puddles ----
    const dropGeo = new THREE.SphereGeometry(1, 12, 8), dropMat = phong("#9a5a28", null, "#ffe8c8", 80);
    const pudGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
    const pudMat = lamb("#7a4420"); pudMat.polygonOffset = true; pudMat.polygonOffsetFactor = -2; pudMat.polygonOffsetUnits = -4;
    SPLASHES.forEach((_, si) => {
      this.dropSeeds.push(makeDrops(17 + si * 11));
      const ds: THREE.Mesh[] = [], ps: THREE.Mesh[] = [];
      for (let i = 0; i < NDROP; i++) {
        const d = new THREE.Mesh(dropGeo, dropMat); d.frustumCulled = false; d.castShadow = true; d.visible = false; R.add(d); ds.push(d);
        const p = new THREE.Mesh(pudGeo, pudMat); p.frustumCulled = false; p.receiveShadow = true; p.visible = false; R.add(p); ps.push(p);
      }
      this.drops.push(ds); this.puddles.push(ps);
    });
    // ---- stopwatches ----
    for (let k = 0; k < 2; k++) {
      const g = new THREE.Group(), cv = document.createElement("canvas"); cv.width = cv.height = 512;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const caseM = phong(k ? "#e84a3a" : "#2f8ad8", null, "#ffffff", 70), chrome = phong("#dfe4ea", null, "#ffffff", 110);
      const parts: THREE.Mesh[] = [
        new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 40).rotateX(Math.PI / 2), caseM),
        new THREE.Mesh(new THREE.TorusGeometry(0.081, 0.009, 10, 40).translate(0, 0, 0.02), chrome),
        new THREE.Mesh(mergeGeometries([strip(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 16).translate(0, 0.098, 0)), strip(new THREE.CylinderGeometry(0.022, 0.022, 0.012, 16).translate(0, 0.118, 0)), strip(new THREE.TorusGeometry(0.018, 0.005, 8, 20).translate(0, 0.137, 0))], false), chrome),
        new THREE.Mesh(mergeGeometries([strip(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 12).rotateZ(-0.7).translate(0.068, 0.07, 0)), strip(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 12).rotateZ(0.7).translate(-0.068, 0.07, 0))], false), chrome),
        new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.012).rotateX(-0.45).translate(0, -0.06, -0.045), caseM), // kick stand
      ];
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.074, 48), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(0.95, 0.95, 0.95) }));
      face.position.z = 0.0215;
      for (const m of [...parts, face]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; g.add(m); }
      g.visible = false; R.add(g); this.watches.push({ g, cv, tex, last: -1 });
    }
    // ---- headphones (unit head radius; scaled to r). Band arc sits just behind the card plane, cups straddle it ----
    const hpRed = phong("#e8323a", null, "#ffffff", 60), hpDark = lamb("#2a2a34");
    const band = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.075, 10, 40, Math.PI).translate(0, 0.05, -0.12), hpRed);
    const cups = new THREE.Mesh(mergeGeometries([-1, 1].map((s) => strip(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28).rotateZ(Math.PI / 2).translate(s * 1.1, 0, 0))), false), hpRed);
    const pads = new THREE.Mesh(mergeGeometries([-1, 1].map((s) => strip(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 24).rotateZ(Math.PI / 2).translate(s * 0.94, 0, 0))), false), hpDark);
    for (const m of [band, cups, pads]) { m.frustumCulled = false; m.castShadow = true; this.phones.add(m); }
    this.phones.visible = false; R.add(this.phones);
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: arcTex(), color: new THREE.Color(0.6, 1.4, 1.6), transparent: true, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 16; s.visible = false; R.add(s); this.arcs.push(s);
    }
    // ---- clipboard ----
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.01), lamb("#a8743e"));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.215, 0.285), new THREE.MeshBasicMaterial({ map: clipTex(), color: new THREE.Color(0.9, 0.9, 0.88) }));
    paper.position.set(0, -0.012, 0.0062);
    const clamp = new THREE.Mesh(mergeGeometries([strip(new THREE.BoxGeometry(0.09, 0.03, 0.012).translate(0, 0.148, 0.01)), strip(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 10).rotateZ(Math.PI / 2).translate(0, 0.165, 0.013))], false), phong("#cfd5dc", null, "#ffffff", 80));
    for (const m of [board, paper, clamp]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; this.clip.add(m); }
    this.clip.visible = false; R.add(this.clip);
    // ---- censor bars + grawlix ----
    for (const who of ["swearer", "bean", "sailor"]) {
      const g = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(1, 176 / 512), new THREE.MeshBasicMaterial({ map: barTex(), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
      bar.layers.set(NOINK); bar.frustumCulled = false; bar.renderOrder = 30; g.add(bar);
      const glyphs: THREE.Sprite[] = [];
      for (let i = 0; i < NGLYPH; i++) {
        const [ch, col] = GLYPHS[i % GLYPHS.length];
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTex(ch, col), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
        s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 31; s.visible = false; R.add(s); glyphs.push(s);
      }
      g.visible = false; R.add(g); this.bars[who] = { g, bar, glyphs };
    }
  }

  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    let p: V3 | null = null, d = 2.4;
    if (id === 2) { p = add(beanFrame(id, t).o, 0, 0.85, 0); d = 3.0; }
    else if (id === 1 || id === 8) { p = add(beanFrame(id, t).o, 0, 0.95, 0); d = 2.6; }
    else if (id === 4) { p = add(LAB, -0.8, 1.15, 0); d = 2.6; }
    else if (id === 6 || id === 7) { p = add(LAB, 0.7, 1.3, 0); d = 1.6; }
    if (!p) return;
    cam.position.set(p[0] + 0.5, p[1] + 0.1, p[2] + d); cam.lookAt(p[0], p[1], p[2]); cam.fov = 40; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  private drawWatch(k: number, sec: number) {
    const w = this.watches[k], g = w.cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 512, 512);
    g.translate(256, 256);
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU, big = i % 5 === 0;
      g.strokeStyle = big ? "#1c2230" : "#7a8090"; g.lineWidth = big ? 12 : 5;
      g.beginPath(); g.moveTo(Math.sin(a) * (big ? 196 : 214), -Math.cos(a) * (big ? 196 : 214)); g.lineTo(Math.sin(a) * 236, -Math.cos(a) * 236); g.stroke();
    }
    g.fillStyle = "#1c2230"; g.font = `900 54px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < 12; i += 3) { const a = (i / 12) * TAU; g.fillText(String(i === 0 ? 60 : i * 5), Math.sin(a) * 150, -Math.cos(a) * 150); }
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    g.fillStyle = "#1c2230"; g.beginPath(); g.roundRect(-92, 52, 184, 74, 14); g.fill();
    g.fillStyle = "#7dffb0"; g.font = `800 56px ${FONT}`; g.fillText(`${m}:${String(s).padStart(2, "0")}`, 0, 91);
    const a = ((sec % 60) / 60) * TAU;
    g.strokeStyle = "#e8302a"; g.lineWidth = 12; g.lineCap = "round";
    g.beginPath(); g.moveTo(-Math.sin(a) * 40, Math.cos(a) * 40); g.lineTo(Math.sin(a) * 210, -Math.cos(a) * 210); g.stroke();
    g.fillStyle = "#e8302a"; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
    w.tex.needsUpdate = true;
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const DBG = (globalThis as { __PROPDBG?: boolean }).__PROPDBG !== false && DEBUG_CAM;
    if (DBG) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    const camP = cam.position;
    // ---- X-ray ----
    this.xray.update(id, t);
    // ---- mug + steam ----
    const mp = mugPos(id, t);
    this.mug.visible = mp.show;
    if (mp.show) { this.mug.position.set(...mp.pos); this.mug.rotation.set(0, mp.yaw, 0); this.mugInner.rotation.set(0, -0.5, mp.tilt); }
    this.steam.forEach((s, i) => {
      const on = mp.show && id !== 2 ? 1 - smooth(Math.abs(mp.tilt) / 0.25) : 0;
      s.visible = on > 0.01;
      if (!s.visible) return;
      const u = (t * 0.45 + i / 3) % 1;
      s.position.set(mp.pos[0] + 0.012 * Math.sin(t * 2 + i * 2), mp.pos[1] + MUG_H / 2 + 0.02 + 0.16 * u, mp.pos[2]);
      s.scale.setScalar(0.04 + 0.08 * u);
      (s.material as THREE.SpriteMaterial).opacity = 0.32 * on * Math.sin(Math.PI * u);
    });
    // ---- splashes (shot 2 = frozen: the faint slosh hangs mid-air, the stub splash lies on the floor) ----
    SPLASHES.forEach(([sid, ts], si) => {
      const ds = this.drops[si], ps = this.puddles[si];
      const live = (sid === id && t >= ts) || (id === 2 && sid === 1);
      if (!live) { for (const m of ds) m.visible = false; for (const m of ps) m.visible = false; return; }
      const s = id === 2 ? (shotStart(2) - 0.01 - ts) : t - ts;
      const m0 = mugPos(sid, ts), F = beanFrame(sid, ts);
      const rim: V3 = [m0.pos[0], m0.pos[1] + MUG_H / 2, m0.pos[2]];
      this.dropSeeds[si].forEach((d, i) => {
        const dm = ds[i], pm = ps[i];
        const vx = F.R[0] * d.v[0] + F.N[0] * d.v[2], vz = F.R[2] * d.v[0] + F.N[2] * d.v[2];
        const tt = Math.max(0, s - d.d), tl = (d.v[1] + Math.sqrt(d.v[1] * d.v[1] + 2 * G * rim[1])) / G;
        const flying = s >= d.d && tt < tl;
        const melt = id === 2 ? 1 - smooth((t - shotStart(2)) / 0.4) : 1; // QA1: frozen drops read as black blobs in the X-ray: shrink away
        dm.visible = flying && melt > 0.02;
        if (flying) {
          const vy = d.v[1] - G * tt, sp = Math.hypot(vx, vy, vz), grow = smooth(tt / 0.06) * melt;
          dm.position.set(rim[0] + vx * tt, rim[1] + d.v[1] * tt - 0.5 * G * tt * tt, rim[2] + vz * tt);
          dm.lookAt(dm.position.x + vx, dm.position.y + vy, dm.position.z + vz); dm.rotateX(Math.PI / 2);
          dm.scale.set(d.r * grow, d.r * grow * (1 + 0.12 * sp), d.r * grow);
        }
        const landed = s >= d.d && tt >= tl;
        pm.visible = landed;
        if (landed) {
          const k = smooth((tt - tl) / 0.12), rr = d.r * (0.8 + 0.7 * k);
          pm.position.set(rim[0] + vx * tl, 0.004 + i * 0.0002, rim[2] + vz * tl); pm.scale.set(rr * (1 + (i % 3) * 0.2), 1, rr);
        }
      });
    });
    // ---- lab: stopwatches, headphones, clipboard ----
    const lab = id >= 4 && id <= 7;
    this.watches.forEach((w, k) => {
      w.g.visible = lab;
      if (!lab) return;
      w.g.position.set(...stopwatchPos(k as 0 | 1)); w.g.rotation.set(-0.12, k ? -0.35 : 0.35, 0);
      const sec = Math.round(stopwatchAt(id, t) * 10) / 10;
      if (sec !== w.last) { w.last = sec; this.drawWatch(k, sec); }
    });
    const hp = headphonesAt(id, t);
    this.phones.visible = hp.show > 0.002;
    const hyaw = Math.atan2(camP.x - hp.head[0], camP.z - hp.head[2]);
    if (this.phones.visible) {
      const sc = hp.r * (0.5 + 0.5 * glide(hp.show)) * (1 + 0.04 * hp.play * Math.sin(t * 30));
      this.phones.position.set(hp.head[0], hp.head[1] + 0.25 * hp.r * (1 - glide(hp.show)), hp.head[2]); this.phones.rotation.set(0, hyaw, 0); this.phones.scale.setScalar(sc);
    }
    this.arcs.forEach((s, i) => {
      s.visible = this.phones.visible && hp.play > 0.01;
      if (!s.visible) return;
      const sx = i ? 1 : -1, u = (t * 2.2) % 1, off = hp.r * (1.45 + 0.4 * u);
      s.position.set(hp.head[0] + Math.cos(hyaw) * off * sx, hp.head[1], hp.head[2] - Math.sin(hyaw) * off * sx);
      s.scale.set(hp.r * 0.5 * sx, hp.r, 1);
      (s.material as THREE.SpriteMaterial).opacity = hp.play * Math.sin(Math.PI * u);
    });
    const cb = clipboardAt(id, t);
    this.clip.visible = cb.show > 0;
    if (this.clip.visible) {
      const yaw = Math.atan2(camP.x - cb.pos[0], camP.z - cb.pos[2]);
      this.clip.position.set(...cb.pos); this.clip.rotation.set(-0.35, yaw + 0.25, 0.08 + 0.03 * Math.sin(t * 1.1));
    }
    // ---- censor bars + grawlix ----
    this.vR.setFromMatrixColumn(cam.matrixWorld, 0); this.vU.setFromMatrixColumn(cam.matrixWorld, 1);
    for (const who of Object.keys(this.bars)) {
      const B = this.bars[who], c = censorAt(id, t, who), at = c.k > 0.002 ? censorPos(id, t, who) : null;
      const [bw, bh] = CENSOR_SIZE[who];
      B.g.visible = !!at;
      if (at) {
        B.g.position.set(...at); B.g.quaternion.copy(cam.quaternion); B.g.rotateZ(c.shake - 0.06);
        const s = bw * c.scale * (0.6 + 0.4 * c.k);
        B.g.scale.set(s, s * (bh / bw) / (176 / 512), 1);
        (B.bar.material as THREE.MeshBasicMaterial).opacity = c.k;
      }
      const nG = who === "sailor" ? 4 : NGLYPH, D = CENSOR_HOLD[who] ?? 1, gap = who === "sailor" ? 0.1 : 0.075, cyc = nG * gap + 0.6, life = 0.75;
      B.glyphs.forEach((gs, i) => {
        gs.visible = false;
        if (!at || i >= nG || c.t0 < 0) return;
        // waves of glyphs: glyph i is born at t0 + i*gap; long holds (bean) keep emitting every cycle
        let u = c.since - i * gap, wave = 0;
        if (D > 2 && u > cyc) { wave = Math.floor(u / cyc); u = u % cyc; }
        if (u < 0 || u > life || c.since > D + 0.1) return;
        const r = rng(i * 13 + Math.floor(c.t0 * 7) + wave * 3);
        const side = i % 2 ? 1 : -1, an = side * (who === "swearer" ? 0.95 + r() * 0.7 : 0.25 + r() * 1.1); // swearer: burst out sideways, off the eyes
        const e = 1 - Math.pow(1 - u / life, 2), dist = bw * (0.3 + 0.55 * e);
        const dx = Math.sin(an) * dist + side * bw * 0.22, dy = Math.cos(an) * dist * 0.75 + bh * 0.2 - 0.06 * u * u;
        gs.visible = true;
        gs.position.set(at[0] + this.vR.x * dx + this.vU.x * dy, at[1] + this.vR.y * dx + this.vU.y * dy, at[2] + this.vR.z * dx + this.vU.z * dy);
        const pop = smooth(u / 0.08) * (1 + 0.35 * Math.sin(Math.PI * clamp01(u / 0.18))), sz = bh * (who === "sailor" ? 1.1 : 1.0) * pop;
        gs.scale.set(sz, sz, 1);
        const m = gs.material as THREE.SpriteMaterial; m.rotation = (r() - 0.5) * 0.8 + side * u * 0.6; m.opacity = c.k * (1 - smooth((u - life + 0.22) / 0.22));
      });
    }
  }
}
