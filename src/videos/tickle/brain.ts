// OWNER: brain agent. See /home/user/lookmatch/TICKLE_BRIEF.md
// The X-RAY BRAIN hologram of "Why You Can't Tickle Yourself" (shot 2 at HOME, shot 6 at LAB), all driven by brainAt:
//   * BRAIN: a glowing cyan cartoon brain in side profile (front = screen right) with a little face, drawn live on a
//     canvas plane in front of BEAN's head; a bloom-only emissive twin for the outline + cerebellum glow.
//   * CEREBELLUM (brainAt.cereb): the striped lobe at the back-bottom turns GOLD with pulse rings + a gold pill label
//     "CEREBELLUM" (left of the head) with a leader line.
//   * SLOT card (a thought card above-right of the head, linked by thought dots):
//       FORECAST (brainAt.forecast): a wiggling hand + "TICKLE 98%" (counts up);
//       FEELING knob (from W.turns): a chunky volume knob whose pointer + lit arc turn DOWN with brainAt.volume;
//       "SEEN IT!" (brainAt.knows): a rubber stamp slams onto the card, the brain goes smug;
//       shot 6 (brainAt.panting): "TOO SLOW!" header + spinner + "LOADING..." + a slipping bar; the brain pants,
//       sweats, steams and overheats pink.
// Contracts: everything rides a head-local frame (origin = BEAN's head centre, x = card right = screen right, y = up,
// yawed toward the camera like world.ts cards, HOLO_D in front of the card). The cast can override the head centre
// through BRAIN_HOOKS.head. All pure functions of (id, t); transparent planes on NOINK; never frustum culled.
import * as THREE from "three";
import { rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { HOME, LAB, W, V3, FPS, brainAt, camAt, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: brain-only framing + a stand-in head for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
type P2 = [number, number];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
/** easeOutBack 0..1 (overshoot), for scale-ins */
const back = (u: number) => { const x = clamp01(u), c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const bump = (t: number, a: number, b: number, r = 0.2) => smooth((t - a) / r) * (1 - smooth((t - b) / r));
const cyc = (x: number) => ((x % 1) + 1) % 1;

// ============================== public contracts ==============================
/** cast override: BEAN's head centre (world) per (id, t); undefined -> default */
export const BRAIN_HOOKS: { head?: (id: number, t: number) => V3 | undefined } = {};
/** default BEAN head centres: shot 2 standing at HOME, shot 6 seated on the LAB stool */
export const HEAD_HOME: V3 = add(HOME, 0, 1.45, 0);
export const HEAD_LAB: V3 = add(LAB, 0, 1.3, 0.55);
export const headPos = (id: number, t: number): V3 => BRAIN_HOOKS.head?.(id, t) ?? (id === 6 ? HEAD_LAB : HEAD_HOME);
/** the hologram floats this far in front of the head (m, toward the camera) */
export const HOLO_D = 0.14;
/** head-local layout (metres; x right, y up from the head centre): plane centres + sizes.
 *  Whole hologram box x -0.33..0.28, y -0.17..0.68 (LAYOUT.box): cam, look near head+(-0.03, 0.24) and frame
 *  >= ~1.1 m tall (fov 30 -> >= 2.1 m away). */
export const LAYOUT = {
  brain: { c: [0, 0.12] as P2, size: 0.6 },          // brain drawn 0.36 m wide (head-local y -0.03..0.26)
  label: { c: [-0.16, -0.06] as P2, w: 0.44, h: 0.2 }, // gold pill "CEREBELLUM" centred at PILL (shot 2 only)
  slot: { c: [0.1, 0.52] as P2, size: 0.4 },          // the thought card (forecast / knob / stamp / loading)
  cereb: [-0.108, 0.048] as P2,                       // the cerebellum's centre
  pill: [-0.175, -0.11] as P2,
  box: { x0: -0.33, x1: 0.28, y0: -0.17, y1: 0.68 },
};
/** head frame: yaw toward the (story) camera like world.ts cards; R = right, N = toward the camera */
const frameAt = (id: number, t: number) => {
  const o = headPos(id, t), c = camAt(id, Math.round(t * FPS)).pos;
  const yaw = Math.atan2(c[0] - o[0], c[2] - o[2]);
  return { o, yaw, R: [Math.cos(yaw), 0, -Math.sin(yaw)] as V3, N: [Math.sin(yaw), 0, Math.cos(yaw)] as V3 };
};
type Frame = ReturnType<typeof frameAt>;
const toW = (F: Frame, x: number, y: number, d = HOLO_D): V3 => [F.o[0] + F.R[0] * x + F.N[0] * d, F.o[1] + y, F.o[2] + F.R[2] * x + F.N[2] * d];
/** world centre of the hologram brain (on the hologram plane) */
export const brainPos = (id: number, t: number): V3 => { const F = frameAt(id, t); return toW(F, LAYOUT.brain.c[0], LAYOUT.brain.c[1]); };
/** world centre of the cerebellum (gold lobe) */
export const cerebPos = (id: number, t: number): V3 => { const F = frameAt(id, t); return toW(F, LAYOUT.cereb[0], LAYOUT.cereb[1]); };
/** world centre of the thought card (forecast / knob / SEEN IT / LOADING) */
export const slotPos = (id: number, t: number): V3 => { const F = frameAt(id, t); return toW(F, LAYOUT.slot.c[0], LAYOUT.slot.c[1]); };

// ============================== brain expression (pure) ==============================
type Expr = { lx: number; ly: number; lid: number; smug: number; pant: number; squint: number; happy: number };
const exprAt = (id: number, t: number): Expr => {
  const B = brainAt(id, t);
  if (id === 6) return { lx: 0.2, ly: 0.25, lid: 0.34 + 0.08 * Math.sin(t * 15), smug: 0, pant: B.panting, squint: 0, happy: 0 };
  let lx = 0.25, ly = 0.05;
  const mixTo = (x: number, y: number, k: number) => { lx = lerp(lx, x, k); ly = lerp(ly, y, k); };
  mixTo(-1, -0.7, bump(t, W.cerebellum - 0.05, W.predicts + 0.05, 0.15));                 // glance at the label
  mixTo(1, 1, bump(t, W.predicts - 0.05, W.fingers - 0.35, 0.2));                          // up at the card
  mixTo(0.7, -1, bump(t, W.fingers - 0.25, W.knows - 0.15, 0.18));                        // down at the incoming fingers
  const smug = B.knows;
  mixTo(0.35, 0.1, smug);
  const turning = bump(t, W.turns - 0.1, W.turns + 1.0, 0.15);
  const BL = [9.3, 10.6, 13.4, 16.6, 18.4, 21.2]; // deterministic blinks
  let blink = 0;
  for (const b of BL) blink = Math.max(blink, 1 - clamp01(Math.abs(t - b) / 0.07));
  const happy = bump(t, W.cerebellum - 0.05, W.cerebellum + 0.9, 0.15);
  return { lx, ly, lid: Math.max(blink * (1 - smug), 0.52 * smug), smug, pant: 0, squint: turning * (1 - smug), happy };
};

// ============================== brain geometry (px, built once) ==============================
const BRN = 1280, BRM = LAYOUT.brain.size, BS = BRN / BRM; // brain canvas: 0.6 m square, 2133 px/m
const BU = 0.36 * BS;                                      // one brain unit (brain width) in px
const pb = (x: number, y: number): P2 => [x * BU, -y * BU]; // brain units (y up) -> canvas px about the centre
/** closed Catmull-Rom loop through pts, sampled n per segment */
const crLoop = (pts: P2[], n: number): P2[] => {
  const out: P2[] = [], N = pts.length;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return out;
};
// cerebrum silhouette (brain units, front = +x): frontal lobe right, occipital left, temporal lobe dipping below
const CEREBRUM: P2[] = [
  [0.5, 0.02], [0.47, 0.19], [0.36, 0.31], [0.18, 0.38], [-0.02, 0.39], [-0.22, 0.35], [-0.38, 0.25], [-0.48, 0.1],
  [-0.48, -0.04], [-0.4, -0.11], [-0.24, -0.11], [-0.12, -0.17], [0.04, -0.23], [0.2, -0.21], [0.3, -0.12], [0.42, -0.09],
];
const CB = { x: -0.3, y: -0.2, rx: 0.17, ry: 0.1, rot: 0.12 }; // cerebellum ellipse (brain units)
const buildBrain = (seed: number) => {
  const smoothPts = crLoop(CEREBRUM, 6).map(([x, y]) => pb(x, y));
  // scalloped cartoon outline: bulge each of ~22 arcs outward
  const n = 22, L = smoothPts.length, outline = new Path2D(), bumps: P2[] = [];
  for (let k = 0; k <= n; k++) bumps.push(smoothPts[Math.round((k / n) * L) % L]);
  // orientation (shoelace) -> outward normal sign
  let area = 0;
  for (let i = 0; i < L; i++) { const a = smoothPts[i], b = smoothPts[(i + 1) % L]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? -1 : 1;
  outline.moveTo(...bumps[0]);
  for (let k = 0; k < n; k++) {
    const a = bumps[k], b = bumps[k + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = (sg * dy) / len, ny = (-sg * dx) / len, bl = 0.32 * len;
    outline.quadraticCurveTo(mx + nx * bl, my + ny * bl, b[0], b[1]);
  }
  outline.closePath();
  const cb = new Path2D();
  const [cx, cy] = pb(CB.x, CB.y);
  cb.ellipse(cx, cy, CB.rx * BU, CB.ry * BU, -CB.rot, 0, TAU);
  const folia: Path2D[] = [];
  for (let i = -3; i <= 3; i++) {
    const p = new Path2D(), y = cy + i * CB.ry * BU * 0.26;
    p.moveTo(cx - CB.rx * BU * 1.1, y + 10); p.quadraticCurveTo(cx, y - 18 - i * 3, cx + CB.rx * BU * 1.1, y - 6);
    folia.push(p);
  }
  const stem = new Path2D();
  const s0 = pb(-0.14, -0.14), s1 = pb(-0.16, -0.38);
  stem.moveTo(s0[0] - 34, s0[1]); stem.bezierCurveTo(s0[0] - 30, s0[1] + 80, s1[0] - 26, s1[1] - 60, s1[0] - 22, s1[1]);
  stem.quadraticCurveTo(s1[0], s1[1] + 20, s1[0] + 22, s1[1]);
  stem.bezierCurveTo(s1[0] + 28, s1[1] - 60, s0[0] + 40, s0[1] + 60, s0[0] + 46, s0[1]); stem.closePath();
  // gyri: meandering cartoon "worms" (seeded), plus the two big fissures
  const r = rng(seed), gyri: P2[][] = [];
  const cv = document.createElement("canvas"); cv.width = cv.height = 4; const g = cv.getContext("2d")!;
  const inside = (p: P2) => g.isPointInPath(outline, p[0], p[1]);
  // a jittered grid of start points; each walker meanders in S-curls (curl flips every few steps)
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 5; gx++) {
    const st: P2 = pb(-0.4 + gx * 0.19 + (r() - 0.5) * 0.06, -0.08 + gy * 0.15 + (r() - 0.5) * 0.05);
    if (!inside(st)) continue;
    let h = r() * TAU, p = st, curl = r() < 0.5 ? 1 : -1;
    const pts: P2[] = [p];
    for (let k = 0; k < 9; k++) {
      if (k % 3 === 2) curl = -curl;
      h += curl * (0.55 + r() * 0.5);
      const q: P2 = [p[0] + Math.cos(h) * 0.05 * BU, p[1] + Math.sin(h) * 0.05 * BU];
      if (!inside(q) || !inside([q[0] + Math.cos(h) * 18, q[1] + Math.sin(h) * 18])) break;
      pts.push(q); p = q;
    }
    if (pts.length >= 4) gyri.push(pts);
  }
  const fissures: P2[][] = [
    [pb(0.06, 0.39), pb(0.08, 0.28), pb(0.03, 0.18), pb(0.07, 0.08), pb(0.02, -0.02)],      // central sulcus
    [pb(0.36, -0.08), pb(0.22, -0.04), pb(0.08, -0.07), pb(-0.06, -0.02), pb(-0.16, 0.0)],  // lateral fissure
  ];
  return { outline, cb, folia, stem, gyri, fissures, cbc: [cx, cy] as P2 };
};
const curve = (g: CanvasRenderingContext2D, pts: P2[]) => {
  g.beginPath(); g.moveTo(...pts[0]);
  for (let i = 1; i < pts.length - 1; i++) { const m: P2 = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; g.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  g.lineTo(...pts[pts.length - 1]); g.stroke();
};
const INK = "#071a33";
type Paint = string | CanvasGradient;
const text = (g: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: Paint, stroke: Paint = INK, sw = 0.16, weight = 900) => {
  g.font = `${weight} ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (sw > 0) { g.lineWidth = size * sw; g.strokeStyle = stroke; g.strokeText(s, x, y); }
  g.fillStyle = fill; g.fillText(s, x, y);
};

// ============================== hologram planes ==============================
class Holo {
  cv = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  group = new THREE.Group(); mats: THREE.MeshBasicMaterial[] = []; glowMap: THREE.CanvasTexture | null = null;
  constructor(w: number, h: number, mw: number, mh: number, ro: number, glow?: { cv: HTMLCanvasElement; col: THREE.Color }) {
    this.cv.width = w; this.cv.height = h; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const geo = new THREE.PlaneGeometry(mw, mh);
    const main = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
    main.renderOrder = ro; this.add(main);
    if (glow) {
      this.glowMap = new THREE.CanvasTexture(glow.cv); this.glowMap.colorSpace = THREE.SRGBColorSpace;
      const gm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.glowMap, color: glow.col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
      gm.position.z = -0.003; gm.renderOrder = ro - 1; this.add(gm);
    }
  }
  private add(m: THREE.Mesh) { m.layers.set(NOINK); m.frustumCulled = false; this.group.add(m); this.mats.push(m.material as THREE.MeshBasicMaterial); }
  set opacity(a: number) { for (const m of this.mats) m.opacity = a; this.group.visible = a > 0.002; }
}

const LBW = 1024, LBH = 466, LS = LBW / LAYOUT.label.w;   // label canvas: 0.44 x 0.2 m, 2327 px/m
const SLN = 1024, SLH = 1536, SLT = 512;                  // slot canvas: 0.4 x 0.6 m, 2560 px/m; card area = the lower 1024 (SLT px headroom for the stamp)
const EMN = 512, ES = EMN / BRN;                          // emissive twin of the brain canvas
const WIPE0 = BRN / 2 + 20 - 0.47 * BU, WIPE1 = BRN / 2 + 20 + 0.42 * BU; // materialise wipe: brain top .. brainstem tip (px)

export class Brain {
  root = new THREE.Group();
  private holo = new THREE.Group();
  private emi = document.createElement("canvas");
  private brain: Holo; private label: Holo; private slot: Holo;
  private geo = buildBrain(7);
  private last = "";
  private dbg: THREE.Group | null = null;

  constructor() {
    this.emi.width = this.emi.height = EMN;
    this.brain = new Holo(BRN, BRN, BRM, BRM, 22, { cv: this.emi, col: new THREE.Color(1.5, 1.9, 2.1) });
    this.label = new Holo(LBW, LBH, LAYOUT.label.w, LAYOUT.label.h, 25);
    this.slot = new Holo(SLN, SLH, LAYOUT.slot.size, (LAYOUT.slot.size * SLH) / SLN, 27);
    this.brain.group.position.set(LAYOUT.brain.c[0], LAYOUT.brain.c[1], 0);
    this.label.group.position.set(LAYOUT.label.c[0], LAYOUT.label.c[1], 0.004);
    this.slot.group.position.set(LAYOUT.slot.c[0], LAYOUT.slot.c[1] + (LAYOUT.slot.size * SLT) / SLN / 2, 0.008);
    this.holo.add(this.brain.group, this.label.group, this.slot.group);
    this.holo.visible = false;
    this.root.add(this.holo);
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    const B = brainAt(id, t);
    const show = id === 2 || id === 6 ? B.show : 0;
    this.holo.visible = show > 0.002;
    if (this.dbg) this.dbg.visible = id === 2 || id === 6;
    if (!this.holo.visible) return;
    const F = frameAt(id, t);
    const e = 0.82 + 0.18 * glide(show);
    this.holo.position.set(...toW(F, 0, 0)); this.holo.rotation.set(0, F.yaw, 0); this.holo.scale.setScalar(e);
    this.brain.opacity = show;
    const lab = this.labelK(id, t);
    this.label.opacity = show * smooth(lab / 0.15);
    const slotK = this.slotAlpha(id, t);
    this.slot.opacity = slotK > 0.002 ? show : 0;
    const key = `${id}_${t.toFixed(4)}`;
    if (key === this.last) return;
    this.last = key;
    this.drawBrain(id, t, show);
    if (lab > 0.002) this.drawLabel(id, t, lab);
    if (slotK > 0.002) this.drawSlot(id, t);
  }

  // ------------------------------ BRAIN ------------------------------
  private drawBrain(id: number, t: number, show: number) {
    const g = this.brain.g, G = this.geo, B = brainAt(id, t), X = exprAt(id, t);
    const cereb = B.cereb, pant = X.pant;
    const hot = pant * (0.75 + 0.25 * Math.sin(t * 9));
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BRN, BRN);
    g.lineCap = "round"; g.lineJoin = "round";
    // materialise: a scan wipe from the bottom up while show ramps in
    const rev = glide(show), wipeY = lerp(WIPE1, WIPE0, rev);
    g.save();
    if (rev < 0.999) { g.beginPath(); g.rect(0, wipeY, BRN, BRN - wipeY); g.clip(); }
    g.translate(BRN / 2, BRN / 2 + 20);
    const br = Math.sin(t * TAU * 2.3); // panting breath: squash + stretch + tremble
    if (pant > 0) { g.translate(2.5 * Math.sin(t * 41) * pant, 0); g.scale(1 + 0.035 * pant * br, 1 - 0.035 * pant * br); }
    if (X.smug > 0) g.rotate(-X.smug * 0.035 * Math.sin(Math.PI * clamp01((t - W.knows) / 0.35)));
    // dark soft backing so the hologram reads on BEAN's head + any background
    // (a tight soft shadow hugging the silhouette, not a big disc: it must not tint the set around it)
    g.save(); g.lineJoin = "round";
    for (const [w, a] of [[90, 0.12], [56, 0.18], [28, 0.25]] as [number, number][]) { g.strokeStyle = `rgba(2,10,30,${a})`; g.lineWidth = w; g.stroke(G.outline); g.stroke(G.cb); }
    g.fillStyle = "rgba(2,10,30,0.55)"; g.fill(G.outline); g.fill(G.cb);
    g.restore();
    // projector ring behind the brain (slow rotating dashes)
    g.save(); g.rotate(t * 0.35); g.setLineDash([26, 22]); g.strokeStyle = "rgba(120,235,255,0.28)"; g.lineWidth = 5;
    g.beginPath(); g.ellipse(0, 0, BU * 0.66, BU * 0.66, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    // ---- brainstem (behind) ----
    g.fillStyle = `rgba(${Math.round(lerp(70, 255, hot))},${Math.round(lerp(190, 120, hot))},${Math.round(lerp(240, 170, hot))},0.6)`; g.fill(G.stem);
    g.strokeStyle = "#7ff4ff"; g.lineWidth = 14; g.stroke(G.stem); g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.stroke(G.stem);
    // ---- cerebellum (behind the cerebrum) ----
    const gold = cereb * (id === 6 ? 0.8 + 0.2 * Math.sin(t * 31) * Math.sin(t * 7) : 1);
    const [cx, cy] = G.cbc;
    const cg = g.createRadialGradient(cx - 30, cy - 30, 10, cx, cy, CB.rx * BU * 1.1);
    cg.addColorStop(0, `rgba(${Math.round(lerp(150, 255, gold))},${Math.round(lerp(235, 240, gold))},${Math.round(lerp(255, 150, gold))},${lerp(0.55, 1, gold)})`);
    cg.addColorStop(1, `rgba(${Math.round(lerp(40, 255, gold))},150,${Math.round(lerp(220, 20, gold))},${lerp(0.55, 1, gold)})`);
    g.fillStyle = cg; g.fill(G.cb);
    g.save(); g.clip(G.cb);
    g.strokeStyle = gold > 0.5 ? `rgba(150,70,0,${0.55 + 0.3 * gold})` : "rgba(10,60,120,0.55)"; g.lineWidth = 11;
    for (const p of G.folia) g.stroke(p);
    g.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * gold})`; g.lineWidth = 4; g.save(); g.translate(-2, -6); for (const p of G.folia) g.stroke(p); g.restore();
    g.restore();
    g.strokeStyle = gold > 0.02 ? `rgb(255,${Math.round(lerp(244, 214, gold))},${Math.round(lerp(255, 90, gold))})` : "#7ff4ff"; g.lineWidth = 18; g.stroke(G.cb);
    g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.stroke(G.cb);
    // ---- cerebrum ----
    const fg = g.createRadialGradient(0.18 * BU, -0.2 * BU, 30, 0, 0, BU * 0.6);
    fg.addColorStop(0, `rgba(${Math.round(lerp(150, 255, hot))},${Math.round(lerp(240, 170, hot))},${Math.round(lerp(255, 200, hot))},0.72)`);
    fg.addColorStop(1, `rgba(${Math.round(lerp(28, 230, hot))},${Math.round(lerp(120, 60, hot))},${Math.round(lerp(215, 130, hot))},0.72)`);
    g.fillStyle = fg; g.fill(G.outline);
    g.save(); g.clip(G.outline);
    // sulci: dark groove + offset highlight = carved, squishy
    g.strokeStyle = hot > 0.3 ? "rgba(110,10,60,0.55)" : "rgba(6,48,110,0.6)"; g.lineWidth = 30;
    for (const w of G.gyri) curve(g, w);
    g.lineWidth = 34; for (const w of G.fissures) curve(g, w);
    g.strokeStyle = "rgba(235,255,255,0.9)"; g.lineWidth = 10;
    g.save(); g.translate(-7, -9); for (const w of G.gyri) curve(g, w); g.lineWidth = 12; for (const w of G.fissures) curve(g, w); g.restore();
    g.fillStyle = "rgba(200,250,255,0.05)"; // scan lines
    for (let y = -BU + ((t * 60) % 18); y < BU; y += 18) g.fillRect(-BU, y, 2 * BU, 6);
    g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.ellipse(0.02 * BU, -0.27 * BU, 0.3 * BU, 0.07 * BU, -0.06, 0, TAU); g.fill();
    g.restore();
    g.strokeStyle = hot > 0.4 ? "#ff9ad0" : "#7ff4ff"; g.lineWidth = 24; g.stroke(G.outline);
    g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.stroke(G.outline);
    // ---- cerebellum pulse rings (it's working!) ----
    if (cereb > 0.01) {
      for (let k = 0; k < 2; k++) {
        const uu = cyc((t - W.cerebellum) * (id === 6 ? 2.2 : 1.1) + k * 0.5);
        g.globalAlpha = cereb * (1 - uu) * 0.9; g.strokeStyle = "#ffd75a"; g.lineWidth = 10 * (1 - uu) + 3;
        g.beginPath(); g.ellipse(cx, cy, CB.rx * BU * (1.05 + 0.7 * uu), CB.ry * BU * (1.05 + 0.9 * uu), -CB.rot, 0, TAU); g.stroke();
      }
      const s0 = t - (W.cerebellum - 0.1); // first light: a burst of sparkle stars
      if (id === 2 && s0 > 0 && s0 < 1.0) {
        const r = rng(11), a = Math.sin(Math.PI * clamp01(s0 / 1.0));
        for (let k = 0; k < 7; k++) {
          const an = -0.6 - r() * 2.6, d = CB.rx * BU * (1.1 + 0.9 * glide(s0 / 0.7)) * (0.8 + 0.4 * r());
          this.sparkle(g, cx + Math.cos(an) * d, cy - Math.sin(an) * d * 0.8 + 40, (14 + 16 * r()) * a, a, "#fff2a8");
        }
      }
      g.globalAlpha = 1;
    }
    this.drawFace(g, t, X);
    if (pant > 0.01) this.drawSweat(g, t, pant);
    if (id === 2 && X.smug > 0.01) { // smug "ting" on the forehead
      const a = Math.sin(Math.PI * clamp01((t - (W.knows + 0.12)) / 0.5));
      if (a > 0.01) this.sparkle(g, 0.42 * BU, -0.3 * BU, 40 * a, a, "#ffffff");
    }
    g.restore();
    if (rev > 0.001 && rev < 0.999) { // scan-wipe edge line
      const y = wipeY, a = Math.sin(Math.PI * rev);
      const lg = g.createLinearGradient(0, y - 24, 0, y + 24);
      lg.addColorStop(0, "rgba(140,250,255,0)"); lg.addColorStop(0.5, `rgba(220,255,255,${0.95 * a})`); lg.addColorStop(1, "rgba(140,250,255,0)");
      g.fillStyle = lg; g.fillRect(BRN / 2 - BU * 0.56, y - 24, BU * 1.12, 48);
    }
    this.brain.tex.needsUpdate = true;
    this.drawEmissive(id, t, rev, gold, hot, pant, br);
  }
  private sparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, col: string) {
    if (r <= 0.5 || a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.fillStyle = col; g.translate(x, y); g.beginPath();
    for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU, rr = k % 2 ? r * 0.28 : r; g.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
    g.closePath(); g.fill(); g.restore();
  }
  private drawFace(g: CanvasRenderingContext2D, t: number, X: Expr) {
    const E: P2[] = [pb(0.19, 0.08), pb(0.36, 0.07)], rx = 0.062 * BU, ry = 0.078 * BU;
    g.fillStyle = `rgba(255,120,170,${0.45 + 0.35 * X.pant})`; // cheeks
    for (const p of [pb(0.13, -0.04), pb(0.43, -0.05)]) { g.beginPath(); g.ellipse(p[0], p[1], 0.05 * BU, 0.028 * BU, 0, 0, TAU); g.fill(); }
    E.forEach((c, i) => {
      g.save(); g.translate(c[0], c[1]);
      const sq = 1 - 0.25 * X.squint;
      g.beginPath(); g.ellipse(0, 0, rx, ry * sq, 0, 0, TAU);
      g.fillStyle = "#ffffff"; g.fill();
      g.save(); g.clip();
      const px = X.lx * rx * 0.42, py = -X.ly * ry * 0.4 * sq, pr = rx * (X.pant > 0 ? 0.46 : 0.55);
      g.fillStyle = INK; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
      g.fillStyle = "#3fd8ff"; g.beginPath(); g.arc(px, py, pr * 0.62, 0, TAU); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(px, py, pr * 0.34, 0, TAU); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(px - pr * 0.35, py - pr * 0.38, pr * 0.3, 0, TAU); g.fill();
      if (X.lid > 0.01) { // upper lid (smug = flat + tilted; pant = droopy)
        const tilt = (i ? -1 : 1) * 0.12 * X.smug + (i ? 1 : -1) * 0.15 * X.pant;
        g.save(); g.rotate(tilt);
        const ly = -ry * sq + 2 * ry * sq * X.lid;
        g.fillStyle = X.pant > 0.3 ? "#ff8fbf" : "#5fd0f5"; g.fillRect(-rx * 1.5, -ry * 1.6, rx * 3, ly + ry * 1.6);
        g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.moveTo(-rx * 1.3, ly); g.lineTo(rx * 1.3, ly); g.stroke();
        g.restore();
      }
      g.restore();
      g.strokeStyle = INK; g.lineWidth = 9; g.beginPath(); g.ellipse(0, 0, rx, ry * sq, 0, 0, TAU); g.stroke();
      // brows
      const by = -ry * sq - 26 - 10 * X.happy + 8 * X.squint;
      const ang = (i ? 1 : -1) * (0.28 * X.smug - 0.3 * X.pant - 0.15 * X.squint) + (i ? -1 : 1) * 0.08 * X.happy;
      g.save(); g.translate(0, by + X.smug * (i ? -18 : 6)); g.rotate(ang);
      g.strokeStyle = INK; g.lineWidth = 12; g.beginPath(); g.moveTo(-rx * 0.8, 4); g.quadraticCurveTo(0, -8, rx * 0.8, 4); g.stroke();
      g.restore();
      g.restore();
    });
    const m = pb(0.28, -0.09); // mouth
    g.save(); g.translate(m[0], m[1]);
    g.strokeStyle = INK; g.lineWidth = 10;
    if (X.pant > 0.01) {
      const o = 0.55 + 0.45 * Math.abs(Math.sin(t * TAU * 2.3));
      const w = 0.075 * BU, h = 0.06 * BU * o;
      g.fillStyle = "#3a0a24"; g.beginPath(); g.ellipse(0, h * 0.4, w, h, 0, 0, TAU); g.fill(); g.stroke();
      g.save(); g.translate(0, h * 0.7); g.rotate(0.25 * Math.sin(t * TAU * 1.15)); // tongue hanging out, swinging
      g.fillStyle = "#ff6f9a"; g.beginPath(); g.moveTo(-w * 0.55, 0); g.lineTo(-w * 0.5, w * 0.7); g.quadraticCurveTo(0, w * 1.25, w * 0.5, w * 0.7); g.lineTo(w * 0.55, 0); g.closePath(); g.fill();
      g.lineWidth = 7; g.stroke(); g.beginPath(); g.moveTo(0, w * 0.15); g.lineTo(0, w * 0.6); g.stroke();
      g.restore();
    } else if (X.smug > 0.01) { // smirk: one corner pulled up
      const s = X.smug;
      g.beginPath(); g.moveTo(-0.07 * BU, lerp(-4, 6, s)); g.quadraticCurveTo(0, 18, 0.07 * BU, lerp(-4, -22, s)); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.moveTo(0.062 * BU, -26 * s); g.lineTo(0.08 * BU, -12 * s); g.stroke();
    } else {
      const open = X.happy;
      g.beginPath(); g.moveTo(-0.055 * BU, -2); g.quadraticCurveTo(0, 20 + 26 * open, 0.055 * BU, -2);
      if (open > 0.05) { g.closePath(); g.fillStyle = "#3a0a24"; g.fill(); }
      g.stroke();
    }
    g.restore();
  }
  private drawSweat(g: CanvasRenderingContext2D, t: number, pant: number) {
    const r = rng(23); // flying sweat drops off the top (seeded cycles, faded in/out: no pops)
    for (let i = 0; i < 9; i++) {
      const per = 0.7 + r() * 0.35, ph = r(), side = i % 2 ? 1 : -1, th = (0.25 + r() * 0.55) * Math.PI, sz = 20 + 8 * r();
      const u = cyc(t / per + ph), a = Math.sin(Math.PI * u) * pant;
      const ox = Math.cos(th) * 0.42 * BU * side, oy = -Math.sin(th) * 0.36 * BU - 0.04 * BU;
      const vx = Math.cos(th) * side * 0.5 * BU, vy = -Math.sin(th) * 0.55 * BU;
      const x = ox + vx * u, y = oy + vy * u + 0.9 * BU * u * u;
      this.drop(g, x, y, sz, Math.atan2(vy + 1.8 * BU * u, vx) - Math.PI / 2, a);
    }
    const u = cyc(t / 1.3), a = Math.sin(Math.PI * u) * pant; // a big drop sliding down the forehead
    const fp = pb(0.47 + 0.02 * u, 0.24 - 0.26 * u);
    this.drop(g, fp[0] + 26, fp[1], 30 + 6 * u, 0, a);
    for (let k = 0; k < 3; k++) { // steam squiggles rising off the top
      const v = cyc(t * 0.9 + k / 3), a2 = Math.sin(Math.PI * v) * pant * 0.85;
      if (a2 < 0.01) continue;
      const x0 = (-0.2 + 0.2 * k) * BU, y0 = -0.43 * BU - v * 0.25 * BU;
      g.globalAlpha = a2; g.strokeStyle = "#ffffff"; g.lineWidth = 12;
      g.beginPath();
      for (let j = 0; j <= 12; j++) { const yy = y0 - j * 9, xx = x0 + 16 * Math.sin(j * 0.7 + t * 6 + k); if (j) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
      g.stroke(); g.globalAlpha = 1;
    }
  }
  private drop(g: CanvasRenderingContext2D, x: number, y: number, s: number, ang: number, a: number) {
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -s * 1.5); g.bezierCurveTo(s * 0.4, -s * 0.6, s, -s * 0.1, s, s * 0.35);
    g.arc(0, s * 0.35, s, 0, Math.PI); g.bezierCurveTo(-s, -s * 0.1, -s * 0.4, -s * 0.6, 0, -s * 1.5); g.closePath();
    g.fillStyle = "#bff4ff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(-s * 0.35, s * 0.2, s * 0.2, s * 0.32, 0.3, 0, TAU); g.fill();
    g.restore();
  }
  private drawEmissive(id: number, t: number, rev: number, gold: number, hot: number, pant: number, br: number) {
    const g = this.emi.getContext("2d")!, G = this.geo;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, EMN, EMN);
    g.save();
    if (rev < 0.999) { const y = lerp(WIPE1, WIPE0, rev) * ES; g.beginPath(); g.rect(0, y, EMN, EMN - y); g.clip(); }
    g.scale(ES, ES); g.translate(BRN / 2, BRN / 2 + 20);
    if (pant > 0) g.scale(1 + 0.035 * pant * br, 1 - 0.035 * pant * br);
    g.lineJoin = "round";
    const oc = hot > 0.4 ? "255,120,190" : "90,225,255";
    for (const [w, a] of [[70, 0.12], [40, 0.22], [20, 0.45]] as [number, number][]) { g.strokeStyle = `rgba(${oc},${a})`; g.lineWidth = w; g.stroke(G.outline); }
    if (gold > 0.01) {
      const pulse = 0.75 + 0.25 * Math.sin((t - W.cerebellum) * TAU * (id === 6 ? 2.2 : 1.1));
      for (const [w, a] of [[80, 0.15], [44, 0.3]] as [number, number][]) { g.strokeStyle = `rgba(255,190,60,${a * gold})`; g.lineWidth = w; g.stroke(G.cb); }
      g.fillStyle = `rgba(255,190,70,${0.55 * gold * pulse})`; g.fill(G.cb);
    }
    g.restore();
    if (this.brain.glowMap) this.brain.glowMap.needsUpdate = true;
  }

  // ------------------------------ LABEL ------------------------------
  /** the label shows in shot 2 from "cerebellum" until "turns" (it sits over BEAN's cheek, so it clears out after) */
  private labelK(id: number, t: number) { return id === 2 ? brainAt(id, t).cereb * (1 - smooth((t - (W.turns - 0.25)) / 0.35)) : 0; }
  private drawLabel(id: number, t: number, c: number) {
    const g = this.label.g;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LBW, LBH);
    g.lineCap = "round"; g.lineJoin = "round";
    const L = (x: number, y: number): P2 => [(x - LAYOUT.label.c[0]) * LS + LBW / 2, -(y - LAYOUT.label.c[1]) * LS + LBH / 2];
    const pc = L(LAYOUT.pill[0], LAYOUT.pill[1]), end = L(LAYOUT.cereb[0] - 0.01, LAYOUT.cereb[1] - 0.035), st = L(LAYOUT.pill[0] - 0.1, LAYOUT.pill[1] + 0.03);
    const k = smooth((c - 0.15) / 0.6); // leader line draws itself toward the cerebellum
    if (k > 0.01) {
      const mid: P2 = [st[0], lerp(st[1], end[1], 0.7)];
      const pts: P2[] = [];
      for (let i = 0; i <= 20; i++) { const u = (i / 20) * k, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), d = u * u; pts.push([a * st[0] + b * mid[0] + d * end[0], a * st[1] + b * mid[1] + d * end[1]]); }
      const stroke = (col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); };
      stroke(INK, 20); stroke("#ffd23a", 9);
      const tip = pts[pts.length - 1];
      g.fillStyle = INK; g.beginPath(); g.arc(tip[0], tip[1], 22, 0, TAU); g.fill();
      g.fillStyle = "#fff4b0"; g.beginPath(); g.arc(tip[0], tip[1], 13 + 3 * Math.sin(t * 8), 0, TAU); g.fill();
    }
    const s = 0.55 + 0.45 * back(c / 0.85); // the pill pops in with an overshoot
    g.save(); g.translate(pc[0], pc[1]); g.scale(s, s); g.rotate(-0.04);
    const w = 0.31 * LS, h = 0.082 * LS;
    g.fillStyle = "rgba(3,14,36,0.35)"; g.beginPath(); g.roundRect(-w / 2 + 10, -h / 2 + 14, w, h, h / 2); g.fill();
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, "#fff08a"); gr.addColorStop(0.5, "#ffcf2e"); gr.addColorStop(1, "#ff9e1a");
    g.fillStyle = gr; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.fill();
    g.strokeStyle = INK; g.lineWidth = 12; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.roundRect(-w / 2 + 26, -h / 2 + 12, w - 52, h * 0.22, h * 0.11); g.fill();
    text(g, "CEREBELLUM", 0, 6, 0.05 * LS, INK, INK, 0, 900);
    const sw = id === 2 ? clamp01((t - (W.cerebellum + 0.25)) / 0.5) : 0; // shine sweep once it lands
    if (sw > 0 && sw < 1) {
      g.save(); g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, h / 2); g.clip();
      g.fillStyle = "rgba(255,255,255,0.6)"; g.translate(lerp(-w * 0.7, w * 0.7, sw), 0); g.rotate(0.4); g.fillRect(-18, -h, 36, h * 2); g.restore();
    }
    g.restore();
    this.label.tex.needsUpdate = true;
  }

  // ------------------------------ SLOT (thought card) ------------------------------
  private knobK(t: number) { return smooth((t - (W.turns - 0.38)) / 0.32); }
  private slotAlpha(id: number, t: number) {
    if (id === 6) return 1;
    if (id !== 2) return 0;
    return Math.max(brainAt(id, t).forecast, this.knobK(t));
  }
  private drawSlot(id: number, t: number) {
    const g = this.slot.g, B = brainAt(id, t);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SLN, SLH); g.translate(0, SLT);
    g.lineCap = "round"; g.lineJoin = "round";
    const fc = id === 2 ? B.forecast : 0, kn = id === 2 ? this.knobK(t) : 0, ld = id === 6 ? 1 : 0;
    const frameK = Math.max(fc, kn, ld);
    // entrance: the card grows out of the thought dots
    const ent = id === 2 ? clamp01((t - (W.predicts - 0.1)) / 0.45) : 1;
    const s = t - (W.knows - 0.12), shake = id === 2 && s > 0 && s < 0.3 ? Math.sin(s * 70) * 14 * (1 - s / 0.3) : 0;
    const CX = 512, CY = 400, CW = 900, CH = 600;
    const dots: [number, number, number][] = [[250, 790, 40], [300, 900, 28], [340, 985, 18]];
    dots.forEach(([x, y, r], i) => {
      const a = frameK * smooth((ent * 1.6 - (2 - i) * 0.2) / 0.3);
      if (a < 0.01) return;
      const rr = r * (0.6 + 0.4 * back(a)) * (1 + 0.06 * Math.sin(t * 5 + i));
      g.globalAlpha = a; g.fillStyle = "rgba(8,30,64,0.8)"; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.strokeStyle = ld ? "#ff8aa0" : "#7ff4ff"; g.lineWidth = 9; g.stroke(); g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.stroke();
    });
    g.globalAlpha = 1;
    const cs = (0.55 + 0.45 * back(smooth((ent - 0.25) / 0.75))) * (0.9 + 0.1 * frameK);
    const ca = smooth((ent - 0.2) / 0.4) * frameK;
    if (ca < 0.005) { this.slot.tex.needsUpdate = true; return; }
    g.save(); g.globalAlpha = ca; g.translate(CX + shake, CY + shake * 0.4); g.scale(cs, cs); g.translate(-CX, -CY);
    const x0 = CX - CW / 2, y0 = CY - CH / 2, warn = ld;
    g.fillStyle = "rgba(3,14,36,0.4)"; g.beginPath(); g.roundRect(x0 + 14, y0 + 20, CW, CH, 54); g.fill();
    const bg = g.createLinearGradient(0, y0, 0, y0 + CH);
    bg.addColorStop(0, warn ? "rgba(52,14,40,0.9)" : "rgba(10,44,92,0.9)"); bg.addColorStop(1, warn ? "rgba(26,6,24,0.92)" : "rgba(4,20,48,0.92)");
    g.fillStyle = bg; g.beginPath(); g.roundRect(x0, y0, CW, CH, 54); g.fill();
    g.save(); g.clip();
    g.fillStyle = "rgba(160,245,255,0.06)";
    for (let y = y0 + ((t * 50) % 16); y < y0 + CH; y += 16) g.fillRect(x0, y, CW, 5);
    g.fillStyle = warn ? "#ff5a6e" : "#2fd6ff"; g.fillRect(x0, y0, CW, 124); // header strip
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x0, y0, CW, 30);
    g.restore();
    g.strokeStyle = warn ? "#ff8aa0" : "#7ff4ff"; g.lineWidth = 16; g.beginPath(); g.roundRect(x0, y0, CW, CH, 54); g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = 5; g.stroke();
    const hdr = (str: string, a: number, col = INK) => { if (a < 0.01) return; g.globalAlpha = ca * a; text(g, str, CX, y0 + 66, 84, col, col, 0); g.globalAlpha = ca; };
    if (id === 2) {
      const swap = smooth((t - (W.turns - 0.3)) / 0.25);
      hdr("FORECAST", 1 - swap); hdr("FEELING", swap);
      if (fc > 0.01) this.forecastBody(g, t, fc, ca);
      if (kn > 0.01) this.knobBody(g, t, kn, B.volume, ca);
    } else {
      hdr("TOO SLOW!", 0.75 + 0.25 * Math.sin(t * 14), "#ffffff");
      this.loadingBody(g, t, ca);
    }
    g.restore();
    if (id === 2) this.stamp(g, t, B.knows);
    this.slot.tex.needsUpdate = true;
  }
  private forecastBody(g: CanvasRenderingContext2D, t: number, fc: number, ca: number) {
    g.globalAlpha = ca * fc;
    // the little hand, fingers wiggling, coming in for a tickle
    const wig = t * 16;
    g.save(); g.translate(290 + 10 * Math.sin(t * 3), 470); g.rotate(-0.35);
    const fingers: [number, number, number][] = [[-52, -78, 92], [-16, -98, 108], [20, -96, 104], [55, -78, 88]];
    fingers.forEach(([x, y, L], i) => {
      g.save(); g.translate(x, y + 30); g.rotate(0.22 * Math.sin(wig + i * 1.3));
      g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(-19, -L + 18, 38, L, 19); g.fill(); g.strokeStyle = INK; g.lineWidth = 11; g.stroke();
      g.restore();
    });
    g.save(); g.translate(-82, 8); g.rotate(-0.9 + 0.12 * Math.sin(wig * 0.7));
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(-18, -70, 36, 82, 18); g.fill(); g.strokeStyle = INK; g.lineWidth = 11; g.stroke();
    g.restore();
    g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(-82, -40, 164, 140, 52); g.fill(); g.stroke();
    g.fillStyle = "#2fd6ff"; g.beginPath(); g.roundRect(-70, 92, 140, 46, 16); g.fill(); g.stroke(); // cuff
    g.fillStyle = "rgba(10,60,120,0.18)"; g.beginPath(); g.roundRect(-60, 30, 120, 50, 24); g.fill(); // palm shade
    g.restore();
    g.strokeStyle = "#ffd23a"; g.lineWidth = 10; // tickle squiggles off the fingertips
    for (let k = 0; k < 3; k++) {
      g.globalAlpha = ca * fc * (0.5 + 0.5 * Math.sin(t * 9 + k * 2));
      g.beginPath();
      for (let j = 0; j <= 8; j++) { const x = 360 + j * 9, y = 270 + k * 38 + 12 * Math.sin(j * 1.4 + t * 12) - j * 4; if (j) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = ca * fc;
    const pct = Math.round(98 * smooth((t - W.predicts) / 0.75));
    text(g, "TICKLE", 690, 300, 92, "#ffffff", INK, 0.18);
    const pop = 1 + 0.08 * Math.max(0, Math.sin(Math.PI * clamp01((t - (W.predicts + 0.7)) / 0.25)));
    g.save(); g.translate(690, 470); g.scale(pop, pop);
    const pg = g.createLinearGradient(0, -90, 0, 90); pg.addColorStop(0, "#fff38a"); pg.addColorStop(1, "#ffa51a");
    text(g, `${pct}%`, 0, 0, 200, pg, INK, 0.14);
    g.restore();
    g.globalAlpha = ca;
  }
  private knobBody(g: CanvasRenderingContext2D, t: number, kn: number, vol: number, ca: number) {
    const A = ca * kn;
    g.globalAlpha = A;
    const KX = 600, KY = 460, R = 150;
    const A0 = Math.PI * 0.75, SW = Math.PI * 1.5; // MIN lower-left, sweeping clockwise over the top to MAX lower-right
    // speaker with sound waves (they shrink with the volume)
    g.save(); g.translate(175, 460);
    g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 10;
    g.beginPath(); g.moveTo(-70, -34); g.lineTo(-30, -34); g.lineTo(18, -78); g.lineTo(18, 78); g.lineTo(-30, 34); g.lineTo(-70, 34); g.closePath(); g.fill(); g.stroke();
    for (let k = 0; k < 3; k++) {
      const a = clamp01(vol * 3 - k);
      if (a < 0.01) continue;
      g.globalAlpha = A * a; g.strokeStyle = "#ffd23a"; g.lineWidth = 13;
      g.beginPath(); g.arc(22, 0, 40 + k * 32, -0.75, 0.75); g.stroke();
    }
    const mute = smooth((0.06 - vol) / 0.05); // mute cross once it bottoms out
    if (mute > 0.01) { g.globalAlpha = A * mute; g.strokeStyle = "#ff5a6e"; g.lineWidth = 15; g.beginPath(); g.moveTo(50, -36); g.lineTo(118, 36); g.moveTo(118, -36); g.lineTo(50, 36); g.stroke(); }
    g.globalAlpha = A;
    g.restore();
    const NT = 13; // lit tick arc
    for (let i = 0; i < NT; i++) {
      const u = i / (NT - 1), an = A0 + SW * u, on = clamp01((vol - u) * NT + 0.5);
      const col = u < 0.5 ? "#5dff8a" : u < 0.8 ? "#ffd23a" : "#ff5a5a";
      const r0 = R + 34, r1 = R + 70 + (i % 3 === 0 ? 10 : 0);
      g.strokeStyle = "rgba(120,180,220,0.3)"; g.lineWidth = 20;
      g.beginPath(); g.moveTo(KX + Math.cos(an) * r0, KY + Math.sin(an) * r0); g.lineTo(KX + Math.cos(an) * r1, KY + Math.sin(an) * r1); g.stroke();
      if (on > 0.01) { g.globalAlpha = A * on; g.strokeStyle = col; g.lineWidth = 18; g.stroke(); g.globalAlpha = A; }
    }
    const ang = A0 + SW * vol + 0.03 * Math.sin(t * 7) * (1 - vol);
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.arc(KX + 8, KY + 14, R, 0, TAU); g.fill();
    g.save(); g.translate(KX, KY); g.rotate(ang);
    g.beginPath(); // chunky knob with grip notches
    for (let k = 0; k < 24; k++) { const a0 = (k / 24) * TAU, a1 = ((k + 0.5) / 24) * TAU; g.arc(0, 0, R, a0, a1); g.arc(0, 0, R - 12, a1, a1 + TAU / 48); }
    g.closePath();
    const kg = g.createRadialGradient(-40, -50, 10, 0, 0, R);
    kg.addColorStop(0, "#ffffff"); kg.addColorStop(0.5, "#b9e4f4"); kg.addColorStop(1, "#5a86a8");
    g.fillStyle = kg; g.fill(); g.strokeStyle = INK; g.lineWidth = 11; g.stroke();
    g.fillStyle = "#e9f8ff"; g.beginPath(); g.arc(0, 0, R * 0.62, 0, TAU); g.fill(); g.strokeStyle = "rgba(7,26,51,0.5)"; g.lineWidth = 6; g.stroke();
    g.strokeStyle = INK; g.lineWidth = 30; g.beginPath(); g.moveTo(R * 0.15, 0); g.lineTo(R * 0.88, 0); g.stroke();
    g.strokeStyle = "#ff5a3a"; g.lineWidth = 16; g.stroke();
    g.restore();
    text(g, "MIN", KX - 150, KY + 205, 46, "#bfefff", INK, 0.2);
    text(g, "MAX", KX + 150, KY + 205, 46, "#bfefff", INK, 0.2);
    const mv = bump(t, W.turns - 0.05, W.turns + 0.95, 0.15); // turning-down arrow while it moves
    if (mv > 0.01) {
      g.globalAlpha = A * mv;
      const rr = R + 100, a1 = -Math.PI * 0.72, a2 = -Math.PI * 1.12;
      g.strokeStyle = INK; g.lineWidth = 30; g.beginPath(); g.arc(KX, KY, rr, a1, a2, true); g.stroke();
      g.strokeStyle = "#ffffff"; g.lineWidth = 16; g.stroke();
      g.save(); g.translate(KX + Math.cos(a2) * rr, KY + Math.sin(a2) * rr); g.rotate(a2 - Math.PI / 2);
      g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 9;
      g.beginPath(); g.moveTo(-34, -10); g.lineTo(34, -10); g.lineTo(0, 40); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
    g.globalAlpha = ca;
  }
  private loadingBody(g: CanvasRenderingContext2D, t: number, ca: number) {
    const SX = 250, SY = 420; // spinner
    for (let k = 0; k < 10; k++) {
      const an = (k / 10) * TAU + t * 5.5, head = k / 10;
      g.globalAlpha = ca * (0.18 + 0.82 * head);
      g.fillStyle = k === 9 ? "#ffffff" : "#ffcf3a";
      g.beginPath(); g.arc(SX + Math.cos(an) * 95, SY + Math.sin(an) * 95, 14 + 12 * head, 0, TAU); g.fill();
    }
    g.globalAlpha = ca;
    text(g, "LOADING", 645, 380, 108, "#ffffff", INK, 0.16);
    const nd = Math.floor((t * 3.2) % 4);
    for (let k = 0; k < 3; k++) { g.globalAlpha = ca * (k < nd ? 1 : 0.22); g.fillStyle = "#ffcf3a"; g.beginPath(); g.arc(560 + k * 70, 470, 18, 0, TAU); g.fill(); }
    g.globalAlpha = ca;
    // progress bar that can't keep up (creeps, then slips back)
    const bx = 130, by = 560, bw = 760, bh = 64;
    const p = 0.62 + 0.1 * Math.sin(t * 2.3) - 0.04 * Math.abs(Math.sin(t * 7.1));
    g.fillStyle = "rgba(0,0,0,0.45)"; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.fill();
    g.save(); g.beginPath(); g.roundRect(bx + 8, by + 8, (bw - 16) * p, bh - 16, (bh - 16) / 2); g.clip();
    g.fillStyle = "#ff9a1a"; g.fillRect(bx, by, bw, bh);
    g.fillStyle = "#ffd23a";
    for (let x = bx - 80 + ((t * 120) % 56); x < bx + bw; x += 56) { g.beginPath(); g.moveTo(x, by + bh); g.lineTo(x + 28, by); g.lineTo(x + 52, by); g.lineTo(x + 24, by + bh); g.closePath(); g.fill(); }
    g.restore();
    g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.beginPath(); g.roundRect(bx, by, bw, bh, bh / 2); g.stroke();
  }
  /** "SEEN IT!": a rubber stamp drops, slams, lifts away and leaves red ink on the card */
  private stamp(g: CanvasRenderingContext2D, t: number, knows: number) {
    const s = t - (W.knows - 0.12);
    if (s < -0.3) return;
    const CX = 512, CY = 430;
    if (s >= 0 && knows > 0) { // ink mark (from the impact)
      const a = smooth(s / 0.07), sc = 1 + 0.22 * (1 - smooth(s / 0.12));
      g.save(); g.globalAlpha = a; g.translate(CX, CY); g.rotate(-0.2); g.scale(sc, sc);
      const w = 800, h = 250;
      g.fillStyle = "rgba(255,240,240,0.88)"; g.beginPath(); g.roundRect(-w / 2, -h / 2, w, h, 30); g.fill();
      g.strokeStyle = "#e3203a"; g.lineWidth = 22; g.beginPath(); g.roundRect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 26); g.stroke();
      g.lineWidth = 7; g.beginPath(); g.roundRect(-w / 2 + 34, -h / 2 + 34, w - 68, h - 68, 14); g.stroke();
      text(g, "SEEN IT!", 0, 8, 150, "#e3203a", "#e3203a", 0, 900);
      const r = rng(5); // worn-ink speckles (seeded)
      g.globalCompositeOperation = "destination-out";
      for (let k = 0; k < 70; k++) { g.globalAlpha = a * (0.5 + 0.5 * r()); g.beginPath(); g.arc((r() - 0.5) * w, (r() - 0.5) * h, 2 + r() * 7, 0, TAU); g.fill(); }
      g.globalCompositeOperation = "source-over";
      g.restore();
      const sp = rng(9), ua = 1 - smooth((s - 0.25) / 0.4); // ink splats
      if (ua > 0.01) for (let k = 0; k < 9; k++) {
        const an = sp() * TAU, d = 430 + sp() * 90 + 60 * smooth(s / 0.15), rr = 8 + sp() * 12;
        g.globalAlpha = ua * smooth(s / 0.06); g.fillStyle = "#e3203a";
        g.beginPath(); g.arc(CX + Math.cos(an) * d, CY + Math.sin(an) * d * 0.45, rr, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
    }
    // the stamp tool
    let y = 0, a = 1, sq = 1;
    if (s < 0) { const u = clamp01((s + 0.3) / 0.3); y = -420 * (1 - u * u); a = smooth(u / 0.45); }
    else if (s < 0.08) sq = 1 - 0.14 * Math.sin(Math.PI * (s / 0.08));
    else if (s >= 0.22) { const u = clamp01((s - 0.22) / 0.35); y = -330 * glide(u); a = 1 - smooth((u - 0.25) / 0.7); }
    if (a < 0.01) return;
    g.save(); g.globalAlpha = a; g.translate(CX, CY + y); g.rotate(-0.2); g.translate(0, 125); g.scale(1, sq); // pad bottom = the mark's bottom edge
    const pw = 820, ph = 70; // rubber pad + wooden block + neck + knob handle (pad bottom on the card at impact)
    g.fillStyle = "#b3122a"; g.strokeStyle = INK; g.lineWidth = 12;
    g.beginPath(); g.roundRect(-pw / 2, -ph, pw, ph, 14); g.fill(); g.stroke();
    const wg = g.createLinearGradient(0, -ph - 150, 0, -ph);
    wg.addColorStop(0, "#d79a5a"); wg.addColorStop(1, "#8f5a2a");
    g.fillStyle = wg; g.beginPath(); g.roundRect(-pw / 2 - 10, -ph - 140, pw + 20, 140, 20); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.roundRect(-pw / 2 + 20, -ph - 128, pw - 40, 22, 11); g.fill();
    g.fillStyle = "#8f5a2a"; g.beginPath(); g.roundRect(-46, -ph - 260, 92, 130, 20); g.fill(); g.stroke();
    const kg = g.createRadialGradient(-30, -ph - 340, 10, 0, -ph - 310, 110);
    kg.addColorStop(0, "#ff8a8a"); kg.addColorStop(1, "#c41e34");
    g.fillStyle = kg; g.beginPath(); g.ellipse(0, -ph - 310, 120, 84, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.ellipse(-40, -ph - 340, 36, 18, -0.3, 0, TAU); g.fill();
    g.restore();
    if (s < 0 && s > -0.2) { // motion lines while falling
      g.globalAlpha = 0.8 * a; g.strokeStyle = "#ffffff"; g.lineWidth = 10;
      for (const dx of [-330, -110, 110, 330]) { g.beginPath(); g.moveTo(CX + dx, CY + y - 600); g.lineTo(CX + dx, CY + y - 480); g.stroke(); }
      g.globalAlpha = 1;
    }
  }

  // ------------------------------ debug ------------------------------
  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    if (id !== 2 && id !== 6) return;
    const h = headPos(id, t);
    cam.position.set(h[0] - 0.03, h[1] + 0.24, h[2] + 2.3); cam.up.set(0, 1, 0); cam.lookAt(h[0] - 0.03, h[1] + 0.24, h[2]);
    cam.fov = 30; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    if (!this.dbg) {
      this.dbg = new THREE.Group();
      const skin = new THREE.MeshBasicMaterial({ color: "#f2c9a0" }), shirt = new THREE.MeshBasicMaterial({ color: "#5a7ad8" });
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.23, 40), skin);
      const body = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.0), shirt); body.position.y = -0.75;
      const eyeM = new THREE.MeshBasicMaterial({ color: "#111" });
      for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), eyeM); e.position.set(x, 0.0, 0.002); this.dbg.add(e); }
      this.dbg.add(head, body); this.root.add(this.dbg);
    }
    this.dbg.position.set(...h); this.dbg.rotation.set(0, Math.atan2(cam.position.x - h[0], cam.position.z - h[2]), 0);
  }
}
