// OWNER: props agent. See /home/user/lookmatch/SNEEZE_BRIEF.md
// Hard props + 3D effects of "The Sun Sneeze" (deterministic in (id, t); never frustum culled; glows/effects on NOINK):
//   1. The GIANT 1978 CONFERENCE BANNER at STAGE+(0,2.6,-2.2) (shot 7, bannerAt): a 6 x 2.7 m navy cloth with 70s
//      stripes, chasing marquee bulbs and the name in 6 lines (an acrostic): AUTOSOMAL / DOMINANT / COMPELLING /
//      HELIO- / OPHTHALMIC / OUTBURST. It UNROLLS from a bottom roller on `reveal` (roller spins, swings, settles); the
//      words light up one by one on `words`; the initials are chunky 3D block letters sewn on the cloth: on `initials`
//      A C H O O turn gold, glow and extrude (the D greys out: it is not in the acronym!); on `achoo` the cloth SNAPS
//      back up like a blind, the D drops off, and A C H O O lift off, spin and slam together into a huge 3D "ACHOO!"
//      (a "!" pops in, gold sparkle burst), then bob gently until the end.
//   2. A 1970s carousel SLIDE PROJECTOR on an AV cart in the aisle (PROJ) whose haze beam (ray cards + dust motes)
//      switches on with the reveal and lights a warm pool on the banner.
//   3. Aristotle's SCROLL (shot 2): held open, flies out of his hand on his sneeze, tumbles, rolls up, lands.
//   4. Francis Bacon's NOTEBOOK + QUILL (shot 3): he writes "HEAT ✓" on `heat` and "SNEEZE ✗" on `wasnt`.
//   5. BEAN's MUG (shots 1, 4, 5): steam; it jolts and the coffee hops on each BEAN sneeze.
//   6. Volumetric SUNBEAM cards (shots 1, 2, 3, 5, 6): parallel crepuscular rays along the shot's sun direction.
//   7. The 3D SNEEZE BLAST per SNEEZES (t, who, size): shockwave rings, curved wind streaks, cloud puffs, cute sparkle
//      stars + droplets. The PEAK (size 1) blasts TOWARD the lens, hollow in the middle so the meme face stays clear.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { STREET, GREECE, ENGLAND, STAGE, V3, W, FPS, SHOTS, SNEEZES, bannerAt, doorAt, shotAt, camAt, smooth, clamp01, glide } from "./story";
import { LOOKS } from "./looks";
import * as CAST from "./cast";

const TAU = Math.PI * 2;
const DEBUG_CAM: number = 0; // TEMP: props-only framing for stills (0 = off; must be 0 when reporting)
const FONT = "'Inter', 'Inter Display', 'Liberation Sans', Arial, sans-serif";
const SERIF = "'DejaVu Serif', 'Liberation Serif', Georgia, serif";
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const easeOut3 = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const backOut = (x: number, s = 1.7) => { const u = clamp01(x) - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
const elastic = (x: number) => { const u = clamp01(x); return u >= 1 ? 1 : 1 - Math.exp(-6 * u) * Math.cos(u * 9.5); };

// ============================== public contracts ==============================
/** Banner: centre (world), size. Cloth plane z = BANNER.pos.z (letters stand 0.02-0.2 m in front). Valance board at
 *  y = pos.y + H/2 .. + 0.24, hanging cords up to +3.2 m. Text block: x -1.3..+1.3, y pos.y-1.04..pos.y+1.04. */
export const BANNER = { pos: add(STAGE, 0, 2.6, -2.2) as V3, W: 6, H: 2.7 };
const BH = BANNER.H, BW = BANNER.W;
/** the final huge "ACHOO!" (shot 7 after `achoo`): centre (world) + total width / letter height (m) */
export const ACHOO_AT: V3 = add(BANNER.pos, 0, 0.05, 0.7);
export const ACHOO_SIZE = { w: 2.7, h: 0.52 };
/** slide projector on its AV cart in the audience aisle: cart footprint centre (floor, world), ~0.6 x 0.5 m.
 *  Sets: keep ~0.7 x 0.6 m of floor free around PROJ.cart (an aisle at x = STAGE.x + 1.3). */
export const PROJ = { cart: add(STAGE, 1.3, 0, 4.1) as V3 };

/** default mouth points (until the cast's mouthAt is wired: cast.ts may export mouthAt(id, t, who) => V3 | null and
 *  it is used automatically). Family on the STREET pavement in front of the door, left to right. */
export const FAMILY_SPOTS: Record<string, V3> = {
  kid1: add(STREET, -0.95, 0, 0.9), dad: add(STREET, -0.55, 0, 0.3), kid2: add(STREET, -0.2, 0, 1.05),
  kid3: add(STREET, 0.2, 0, 1.05), mum: add(STREET, 0.55, 0, 0.3), kid4: add(STREET, 0.95, 0, 0.9),
};
const MOUTH_H: Record<string, number> = { dad: 1.5, mum: 1.4, kid1: 0.98, kid2: 0.8, kid3: 1.05, kid4: 0.88 };
const mouthDefault = (who: string, id: number): V3 => {
  if (who === "aristotle") return add(GREECE, 0, 1.45, 0.1);
  if (who === "bean") return id === 7 ? add(STAGE, 0, 1.12, 2.6) : add(STREET, 0, 1.38, 0.1);
  const s = FAMILY_SPOTS[who];
  return s ? add(s, 0, MOUTH_H[who] ?? 1.2, 0.1) : add(STREET, 0, 1.38, 0.1);
};
/** mouth point (world) used by the blasts: the cast's mouthAt if exported, else the defaults above */
export const mouthPos = (who: string, id: number, t: number): V3 => {
  const fn = (CAST as unknown as Record<string, unknown>).mouthAt;
  if (typeof fn === "function") {
    try {
      const r = (fn as (id: number, t: number, who: string) => unknown)(id, t, who);
      if (Array.isArray(r) && r.length === 3 && r.every((v) => Number.isFinite(v))) return r as V3;
      if (r && typeof r === "object" && "x" in r) { const v = r as { x: number; y: number; z: number }; if (Number.isFinite(v.x + v.y + v.z)) return [v.x, v.y, v.z]; }
    } catch { /* fall back */ }
  }
  return mouthDefault(who, id);
};
/** which shot shows a sneeze */
const sneezeShot = (t0: number) => shotAt(Math.round(t0 * FPS)).id;
const BLAST_LIFE = 1.6;
export type BlastInfo = { i: number; who: string; t0: number; size: number; age: number; origin: V3; dir: V3; peak: boolean };
/** blast direction: sideways in screen (alternating per character) + a bit toward the lens; the PEAK goes at the lens */
const SIDE: Record<string, number> = { bean: 1, aristotle: -1, dad: 1, mum: -1, kid1: 1, kid2: 1, kid3: -1, kid4: -1 }; // family sneeze inward (stays in frame)
let BLASTS: { origin: V3; dir: V3; peak: boolean; id: number }[] | null = null;
const blastFrame = (i: number): { origin: V3; dir: V3; peak: boolean; id: number } => {
  const [t0, who, size] = SNEEZES[i], id = sneezeShot(t0), c = camAt(id, Math.round(t0 * FPS));
  const o = mouthPos(who, id, t0), peak = size >= 0.95;
  const toCam = new THREE.Vector3(c.pos[0] - o[0], c.pos[1] - o[1], c.pos[2] - o[2]).normalize();
  const right = new THREE.Vector3().crossVectors(toCam, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(-1); // screen right
  const d = peak ? toCam.clone().multiplyScalar(0.97).addScaledVector(right, 0.12).add(new THREE.Vector3(0, 0.08, 0))
    : toCam.clone().multiplyScalar(0.55).addScaledVector(right, 0.75 * (SIDE[who] ?? 1)).add(new THREE.Vector3(0, 0.22, 0));
  d.normalize();
  return { origin: o, dir: [d.x, d.y, d.z], peak, id };
};
/** active sneeze blasts for this shot at t (age 0 .. BLAST_LIFE s) */
export const blastsAt = (id: number, t: number): BlastInfo[] => {
  if (!BLASTS) BLASTS = SNEEZES.map((_, i) => blastFrame(i));
  const out: BlastInfo[] = [];
  SNEEZES.forEach(([t0, who, size], i) => {
    const B = BLASTS![i], age = t - t0;
    if (B.id !== id || age < 0 || age > BLAST_LIFE) return;
    out.push({ i, who, t0, size, age, origin: B.origin, dir: B.dir, peak: B.peak });
  });
  return out;
};
/** blast strength envelope 0..1 (for camera kicks / hair blow): fast attack, ~0.3 s decay */
export const blastPower = (id: number, t: number) => blastsAt(id, t).reduce((m, b) => Math.max(m, b.size * smooth(b.age / 0.05) * Math.exp(-b.age * 3)), 0);

/** BEAN's base (feet) in the street: steps out of the door (doorAt.step) in shot 1, at STREET+(0,0,0) in 4/5 */
const beanBase = (id: number, t: number): V3 => (id === 1 ? add(STREET, 0, 0, -1.2 * (1 - doorAt(id, t).step)) : STREET);
/** BEAN's mug: shown in shots 1, 4, 5; pos = mug base centre (world) = BEAN base + MUG_HAND; BEAN's hand (screen
 *  right) holds its handle at `handle`. Jolts on every BEAN sneeze (jolt 0..1). */
export const MUG_HAND: V3 = [0.3, 1.0, 0.16];
export const mugAt = (id: number, t: number): { show: boolean; pos: V3; handle: V3; jolt: number } => {
  const show = id === 1 || id === 4 || id === 5;
  let jy = 0, jx = 0, jolt = 0;
  for (const [t0, who, size] of SNEEZES) {
    if (who !== "bean") continue;
    const a = t - t0;
    if (a < -0.6 || a > 1.5) continue;
    if (a < 0) { jy -= 0.012 * size * smooth((a + 0.6) / 0.6); continue; } // build-up: he draws the mug in
    const e = Math.exp(-a * 5) * size;
    jy += -0.012 * size * Math.exp(-a * 30) + 0.05 * e * Math.sin(a * 22); jx += -0.035 * e * Math.sin(a * 17 + 0.4);
    jolt = Math.max(jolt, e);
  }
  const b = beanBase(id, t), p = add(b, MUG_HAND[0] + jx, MUG_HAND[1] + jy, MUG_HAND[2]);
  return { show, pos: p, handle: add(p, 0.072, 0.055, 0), jolt };
};

/** Aristotle's scroll (shot 2): held in his hand (screen right) at SCROLL_HAND until his sneeze, then it flies up and
 *  out (tumbling, rolling up) and lands on the terrace (y = GREECE.y). held 0..1 (1 = in the hand). */
export const SCROLL_HAND: V3 = add(GREECE, 0.3, 1.05, 0.16);
const SNEEZE_ARI = SNEEZES.find((s) => s[1] === "aristotle")![0];
export const scrollAt = (id: number, t: number): { show: boolean; pos: V3; rot: V3; open: number; held: number } => {
  const show = id === 2;
  const a = t - SNEEZE_ARI;
  if (a <= 0) {
    const sw = 0.012 * Math.sin(t * 1.7);
    const pre = a > -0.6 ? smooth((a + 0.6) / 0.6) : 0; // build-up: the arm rises a little
    return { show, pos: add(SCROLL_HAND, 0, sw + 0.03 * pre, 0), rot: [-0.08 + 0.1 * pre, 0.22, 0.05 * Math.sin(t * 1.3)], open: 1, held: 1 };
  }
  const g = 7, v: V3 = [1.1, 2.7, 0.55];
  let tau = a;
  const tl = (v[1] + Math.sqrt(v[1] * v[1] + 2 * g * (SCROLL_HAND[1] - GREECE[1] - 0.025))) / g; // landing time
  const landed = tau >= tl; if (landed) tau = tl;
  const y = SCROLL_HAND[1] + v[1] * tau - 0.5 * g * tau * tau;
  const pos: V3 = [SCROLL_HAND[0] + v[0] * tau, Math.max(GREECE[1] + 0.025, y), SCROLL_HAND[2] + v[2] * tau];
  const rot: V3 = landed ? [Math.PI / 2, 0.2 + 2.5 * tl, 0] : [-0.08 + 6.5 * tau, 0.22 + 2.5 * tau, 3.2 * tau];
  return { show, pos, rot, open: 1 - smooth(a / 0.45), held: 1 - smooth(a / 0.05) };
};

/** Bacon's notebook (shot 3): open book held at NOTEBOOK_AT (his screen-left hand under it), pages tilted up toward
 *  the lens. quillAt: the quill nib (world) + the grip (his writing hand) and `writing` 0..1. */
export const NOTEBOOK_AT: V3 = add(ENGLAND, -0.14, 1.04, 0.2);
const NB_TILT = -0.55, NB_YAW = 0.12;
const WRITE = [{ t0: W.heat + 0.05, d: 0.75 }, { t0: W.wasnt + 0.05, d: 0.95 }];
const writeK = (t: number) => WRITE.map((w) => clamp01((t - w.t0) / w.d));
const _nbM = new THREE.Matrix4(), _nbV = new THREE.Vector3();
const nbMatrix = () => _nbM.compose(new THREE.Vector3(...NOTEBOOK_AT), new THREE.Quaternion().setFromEuler(new THREE.Euler(NB_TILT, NB_YAW, 0, "YXZ")), new THREE.Vector3(1, 1, 1));
const PAGE_W = 0.125, PAGE_H = 0.17;
/** right page local (u across 0..1, v down 0..1) -> world, through the notebook pose */
const pageToWorld = (u: number, v: number, lift: number): V3 => {
  _nbV.set(0.006 + u * PAGE_W, PAGE_H / 2 - v * PAGE_H, 0.016 + lift).applyMatrix4(nbMatrix());
  return [_nbV.x, _nbV.y, _nbV.z];
};
const LINE_V = [0.3, 0.66];
export const quillAt = (id: number, t: number): { show: boolean; nib: V3; grip: V3; writing: number } => {
  const k = writeK(t);
  let u = 0.85, v = 0.9, lift = 0.05, writing = 0;
  for (let i = 0; i < 2; i++) {
    const w = WRITE[i], a = t - w.t0;
    if (a > -0.35 && a < w.d + 0.3) {
      const on = smooth((a + 0.35) / 0.3) * (1 - smooth((a - w.d) / 0.3));
      const uu = 0.1 + 0.8 * k[i], vv = LINE_V[i] + 0.035 * Math.sin(t * 38) * (k[i] > 0 && k[i] < 1 ? 1 : 0);
      u = lerp(u, uu, on); v = lerp(v, vv, on); lift = lerp(lift, 0.003 + 0.006 * Math.abs(Math.sin(t * 19)), on); writing = Math.max(writing, on);
    }
  }
  const nib = pageToWorld(u, v, lift);
  return { show: id === 3, nib, grip: [nib[0] + 0.05, nib[1] + 0.08, nib[2] + 0.03], writing };
};

/** banner geometry state: L = unrolled 0..1, roll radius, visible cloth length, roller centre y (banner local) */
const ROLL_R0 = 0.07;
const bannerState = (id: number, t: number) => {
  const b = bannerAt(id, t);
  const L = clamp01(b.reveal) * (1 - b.achoo);
  const r = Math.sqrt(ROLL_R0 * ROLL_R0 + (1 - L) * BH * 0.0045 / Math.PI);
  const len = r + 0.015 + L * (BH - r - 0.015);
  return { ...b, L, r, len, yRoll: BH / 2 - len };
};

// ============================== shared helpers ==============================
const lamb = (col: THREE.ColorRepresentation, map: THREE.Texture | null = null) => twoTone(new THREE.MeshLambertMaterial({ color: col, map }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number) => twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const rbox = (w: number, h: number, d: number, r: number, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const cylY = (r: number, h: number, n = 24, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, n);
const cylX = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateZ(Math.PI / 2);
const cylZ = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateX(Math.PI / 2);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
class Bag {
  private m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mat: THREE.Material, ...gs: THREE.BufferGeometry[]) { const a = this.m.get(mat) ?? []; for (const g of gs) a.push(strip(g)); this.m.set(mat, a); }
  build(parent: THREE.Object3D, shadow = true) {
    for (const [mat, gs] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(gs, false), mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.frustumCulled = false; parent.add(mesh);
    }
    this.m.clear();
  }
}
const solid = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
};
const fxl = <T extends THREE.Object3D>(o: T, order: number) => { o.layers.set(NOINK); o.frustumCulled = false; o.renderOrder = order; return o; };
const v3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
type Ray = { a: V3; b: V3; w0: number; w1: number; k: number; seed: number };

// ============================== the effect atlas (4 x 4 cells of 256 px) ==============================
// 0 sparkle star | 1 water droplet (cute) | 2 toon cloud puff | 3 soft dot | 5 steam wisp | 6 coffee drop | 7 twinkle | 8 glow
const CELL = 256;
const atlasTex = () => ctex("snFxAtlas", 1024, 1024, (g) => {
  g.clearRect(0, 0, 1024, 1024);
  const cell = (i: number, f: (cx: number, cy: number) => void) => { g.save(); const cx = (i % 4) * CELL + 128, cy = Math.floor(i / 4) * CELL + 128; g.beginPath(); g.rect(cx - 128, cy - 128, CELL, CELL); g.clip(); f(cx, cy); g.restore(); };
  const star = (cx: number, cy: number, R: number, rr: number, n = 4) => { g.beginPath(); for (let k = 0; k < n * 2; k++) { const a = (k / (n * 2)) * TAU - Math.PI / 2, d = k % 2 ? rr : R; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
  cell(0, (cx, cy) => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 120); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(0.3, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(cx - 128, cy - 128, 256, 256);
    star(cx, cy, 112, 22); g.fillStyle = "#ffffff"; g.fill();
    g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); star(0, 0, 54, 12); g.fillStyle = "rgba(255,255,255,0.9)"; g.fill(); g.restore();
  });
  cell(1, (cx, cy) => { // droplet: point UP (trailing), round bottom
    g.beginPath(); g.moveTo(cx, cy - 100); g.bezierCurveTo(cx + 30, cy - 50, cx + 66, cy - 6, cx + 66, cy + 36); g.arc(cx, cy + 36, 66, 0, Math.PI); g.bezierCurveTo(cx - 66, cy - 6, cx - 30, cy - 50, cx, cy - 100); g.closePath();
    const gr = g.createLinearGradient(cx - 60, cy - 60, cx + 60, cy + 100); gr.addColorStop(0, "#d9f6ff"); gr.addColorStop(0.55, "#7fd3ff"); gr.addColorStop(1, "#3f8fe6");
    g.fillStyle = gr; g.fill(); g.lineWidth = 9; g.strokeStyle = "#1c3f8c"; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.ellipse(cx - 24, cy + 14, 13, 24, 0.35, 0, TAU); g.fill();
    g.beginPath(); g.arc(cx - 6, cy + 60, 7, 0, TAU); g.fill();
  });
  cell(2, (cx, cy) => { // toon cloud puff: white body, blue shade below, dark-blue outline
    const blobs: [number, number, number][] = [[-48, 14, 50], [0, -14, 62], [50, 10, 50], [-18, 36, 44], [26, 38, 44]];
    g.fillStyle = "#26407e"; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(cx + x, cy + y, rr + 7, 0, TAU); g.fill(); }
    g.fillStyle = "#c7dcf7"; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(cx + x, cy + y, rr, 0, TAU); g.fill(); }
    g.fillStyle = "#ffffff"; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(cx + x - rr * 0.12, cy + y - rr * 0.18, rr * 0.84, 0, TAU); g.fill(); }
  });
  cell(3, (cx, cy) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 120); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(cx - 128, cy - 128, 256, 256); });
  cell(5, (cx, cy) => { // steam wisp: soft S curl
    g.lineCap = "round";
    for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(255,255,255,${0.22 + k * 0.18})`; g.lineWidth = 46 - k * 14; g.beginPath(); g.moveTo(cx, cy + 112); g.bezierCurveTo(cx - 70, cy + 40, cx + 70, cy - 20, cx - 6, cy - 110); g.stroke(); }
  });
  cell(6, (cx, cy) => { g.fillStyle = "#3a1e10"; g.beginPath(); g.arc(cx, cy, 78, 0, TAU); g.fill(); g.fillStyle = "#7a4424"; g.beginPath(); g.arc(cx, cy, 66, 0, TAU); g.fill(); g.fillStyle = "rgba(255,230,200,0.85)"; g.beginPath(); g.ellipse(cx - 22, cy - 24, 16, 11, -0.6, 0, TAU); g.fill(); });
  cell(7, (cx, cy) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 60); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(cx - 128, cy - 128, 256, 256); star(cx, cy, 124, 7); g.fillStyle = "#fff"; g.fill(); });
  cell(8, (cx, cy) => { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 128); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.6)"); gr.addColorStop(0.55, "rgba(255,255,255,0.15)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(cx - 128, cy - 128, 256, 256); });
});
const A_STAR = 0, A_DROP = 1, A_PUFF = 2, A_DOT = 3, A_STEAM = 5, A_COFFEE = 6, A_TWINK = 7, A_GLOW = 8;

/** instanced camera-facing sprites from the atlas; filled per frame (begin / push / end) */
class Sprites {
  mesh: THREE.Mesh; private geo = new THREE.InstancedBufferGeometry(); private n = 0;
  private P: Float32Array; private S: Float32Array; private C: Float32Array;
  private aP: THREE.InstancedBufferAttribute; private aS: THREE.InstancedBufferAttribute; private aC: THREE.InstancedBufferAttribute;
  constructor(parent: THREE.Object3D, private max: number, additive: boolean, order: number) {
    const q = new THREE.PlaneGeometry(1, 1);
    this.geo.index = q.index; this.geo.setAttribute("position", q.getAttribute("position")); this.geo.setAttribute("uv", q.getAttribute("uv"));
    this.P = new Float32Array(max * 3); this.S = new Float32Array(max * 4); this.C = new Float32Array(max * 4);
    this.aP = new THREE.InstancedBufferAttribute(this.P, 3); this.aS = new THREE.InstancedBufferAttribute(this.S, 4); this.aC = new THREE.InstancedBufferAttribute(this.C, 4);
    for (const a of [this.aP, this.aS, this.aC]) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("iP", this.aP); this.geo.setAttribute("iS", this.aS); this.geo.setAttribute("iC", this.aC);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: atlasTex() } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; attribute vec4 iC; varying vec2 vUv; varying vec4 vC;
        void main(){ vec4 mv = modelViewMatrix * vec4(iP, 1.0); float c = cos(iS.y), s = sin(iS.y); vec2 o = position.xy * iS.x;
          mv.xy += vec2(c * o.x - s * o.y, s * o.x + c * o.y);
          vUv = (vec2(mod(iS.w, 4.0), 3.0 - floor(iS.w / 4.0)) + uv) / 4.0;
          vC = vec4(iC.rgb, iC.a * iS.z * smoothstep(0.12, 0.45, -mv.z)); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `uniform sampler2D uMap; varying vec2 vUv; varying vec4 vC;
        void main(){ vec4 t = texture2D(uMap, vUv); float a = t.a * vC.a; if (a < 0.003) discard; gl_FragColor = vec4(t.rgb * vC.rgb, a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, mat); fxl(this.mesh, order); parent.add(this.mesh);
    this.geo.instanceCount = 0; this.mesh.visible = false;
  }
  begin() { this.n = 0; }
  /** p world, size m, rot rad, alpha, atlas cell, colour multiplier x k */
  push(p: THREE.Vector3 | V3, size: number, rot: number, alpha: number, cell: number, col: THREE.Color, k = 1) {
    if (this.n >= this.max || !(alpha > 0.003) || !(size > 1e-4)) return;
    const i = this.n++;
    if (Array.isArray(p)) { this.P[i * 3] = p[0]; this.P[i * 3 + 1] = p[1]; this.P[i * 3 + 2] = p[2]; } else { this.P[i * 3] = p.x; this.P[i * 3 + 1] = p.y; this.P[i * 3 + 2] = p.z; }
    this.S[i * 4] = size; this.S[i * 4 + 1] = rot; this.S[i * 4 + 2] = Math.min(1, alpha); this.S[i * 4 + 3] = cell;
    this.C[i * 4] = col.r * k; this.C[i * 4 + 1] = col.g * k; this.C[i * 4 + 2] = col.b * k; this.C[i * 4 + 3] = 1;
  }
  end() {
    this.geo.instanceCount = this.n; this.mesh.visible = this.n > 0;
    if (this.n) for (const a of [this.aP, this.aS, this.aC]) a.needsUpdate = true;
  }
}

// ============================== ray cards (sunbeams + projector beam) ==============================
/** axial billboards from A to B (world), soft gaussian across, faded at both ends and near the lens; additive */
class RayCards {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; private geo = new THREE.InstancedBufferGeometry();
  private A: THREE.InstancedBufferAttribute; private B: THREE.InstancedBufferAttribute; private Wd: THREE.InstancedBufferAttribute;
  constructor(parent: THREE.Object3D, private max: number, fadeA: number, fadeB: number, order: number) {
    const N = 8, pos: number[] = [], idx: number[] = [];
    for (let j = 0; j <= N; j++) for (const s of [-1, 1]) pos.push(j / N, s, 0);
    for (let j = 0; j < N; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); this.geo.setIndex(idx);
    this.A = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.B = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.Wd = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.geo.setAttribute("iA", this.A); this.geo.setAttribute("iB", this.B); this.geo.setAttribute("iW", this.Wd);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color(1, 0.8, 0.5) }, uK: { value: 0 }, uT: { value: 0 }, uFade: { value: new THREE.Vector2(fadeA, fadeB) } },
      vertexShader: /* glsl */ `attribute vec3 iA; attribute vec3 iB; attribute vec4 iW; uniform float uT; varying vec2 vQ; varying float vK;
        void main(){ float a = position.x; vec3 P = mix(iA, iB, a); vec3 ax = iB - iA; vec3 vd = cameraPosition - P;
          vec3 cr = cross(ax, vd); float l = length(cr); vec3 sd = l > 1e-6 ? cr / l : vec3(1.0, 0.0, 0.0);
          float w = mix(iW.x, iW.y, a); P += sd * position.y * w * 0.5; vQ = vec2(a, position.y);
          float face = clamp(l / (length(ax) * length(vd) + 1e-6), 0.0, 1.0);
          vK = iW.z * (0.75 + 0.25 * sin(uT * (0.6 + iW.w) + iW.w * 17.0)) * smoothstep(0.6, 2.4, length(vd)) * (0.35 + 0.65 * face);
          gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform vec2 uFade; varying vec2 vQ; varying float vK;
        void main(){ float a = vQ.x; float g = exp(-vQ.y * vQ.y * 3.2) - 0.04;
          float e = smoothstep(0.0, uFade.x, a) * (1.0 - smoothstep(1.0 - uFade.y, 1.0, a));
          float k = uK * vK * max(g, 0.0) * e; if (k < 0.0005) discard; gl_FragColor = vec4(uCol * k, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, this.mat); fxl(this.mesh, order); parent.add(this.mesh);
    this.geo.instanceCount = 0;
  }
  set(rays: Ray[]) {
    const n = Math.min(rays.length, this.max);
    for (let i = 0; i < n; i++) { const r = rays[i]; this.A.setXYZ(i, ...r.a); this.B.setXYZ(i, ...r.b); this.Wd.setXYZW(i, r.w0, r.w1, r.k, r.seed); }
    this.A.needsUpdate = this.B.needsUpdate = this.Wd.needsUpdate = true; this.geo.instanceCount = n;
  }
}

/** the shot's sun direction (same as world.ts shotSun: az from the shot's mean view direction, el) */
const sunCache = new Map<number, THREE.Vector3>();
const shotSunDir = (id: number) => {
  let v = sunCache.get(id); if (v) return v;
  const s = SHOTS[id - 1], L = LOOKS[s.look];
  let fx2 = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx2 += x / n; fz += z / n; }
  const n = Math.hypot(fx2, fz) || 1; fx2 /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx2 * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx2 * Math.sin(az);
  v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  sunCache.set(id, v); return v;
};
/** sunbeam setup per shot: anchor (place), colour, strength */
const BEAMS: Record<number, { o: V3; col: [number, number, number]; k: number } | undefined> = {
  1: { o: add(STREET, 0, 1.6, 0), col: [1.0, 0.72, 0.42], k: 0.085 },
  2: { o: add(GREECE, 0, 1.6, 0), col: [1.0, 0.75, 0.45], k: 0.075 },
  3: { o: add(ENGLAND, 0, 1.6, 0), col: [1.0, 0.9, 0.66], k: 0.085 },
  5: { o: add(STREET, 0, 1.6, 0), col: [1.0, 0.86, 0.62], k: 0.14 },
  6: { o: add(STREET, 0, 1.6, 0), col: [1.0, 0.74, 0.44], k: 0.08 },
};

// ============================== 3D block letters (unit cap height, x centred, y -1..0) ==============================
const GLYPH_W: Record<string, number> = { A: 0.9, D: 0.82, C: 0.82, H: 0.8, O: 0.9, "!": 0.32 };
const glyphShapes = (ch: string): THREE.Shape[] => {
  const poly = (pts: number[][]) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return s; };
  const hole = (pts: number[][]) => { const p = new THREE.Path(); pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath(); return p; };
  switch (ch) {
    case "A": { const s = poly([[0, 0], [0.26, 0], [0.32, 0.19], [0.58, 0.19], [0.64, 0], [0.9, 0], [0.6, 1], [0.3, 1]]); s.holes.push(hole([[0.37, 0.38], [0.53, 0.38], [0.45, 0.66]])); return [s]; }
    case "H": return [poly([[0, 0], [0.25, 0], [0.25, 0.38], [0.55, 0.38], [0.55, 0], [0.8, 0], [0.8, 1], [0.55, 1], [0.55, 0.62], [0.25, 0.62], [0.25, 1], [0, 1]])];
    case "D": { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.38, 0); s.absellipse(0.38, 0.5, 0.44, 0.5, -Math.PI / 2, Math.PI / 2, false); s.lineTo(0, 1); s.closePath();
      const h = new THREE.Path(); h.moveTo(0.25, 0.24); h.lineTo(0.38, 0.24); h.absellipse(0.38, 0.5, 0.19, 0.26, -Math.PI / 2, Math.PI / 2, false); h.lineTo(0.25, 0.76); h.closePath(); s.holes.push(h); return [s]; }
    case "C": { const s = new THREE.Shape(), a0 = 0.62, cx = 0.45; s.absellipse(cx, 0.5, 0.45, 0.5, a0, TAU - a0, false);
      s.absellipse(cx, 0.5, 0.21, 0.265, TAU - a0, a0, true); s.closePath(); return [s]; }
    case "O": { const s = new THREE.Shape(); s.absellipse(0.45, 0.5, 0.45, 0.5, 0, TAU, false); const h = new THREE.Path(); h.absellipse(0.45, 0.5, 0.2, 0.27, 0, TAU, true); s.holes.push(h); return [s]; }
    default: { const bar = poly([[0.03, 1], [0.29, 1], [0.235, 0.33], [0.085, 0.33]]); const dot = new THREE.Shape(); dot.absarc(0.16, 0.12, 0.12, 0, TAU, false); return [bar, dot]; }
  }
};
const LETTER_DEPTH = 0.55;
const glyphGeo = (ch: string) => {
  const g = new THREE.ExtrudeGeometry(glyphShapes(ch), { depth: LETTER_DEPTH, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.035, bevelSegments: 3, curveSegments: 20 });
  g.translate(-GLYPH_W[ch] / 2, -1, 0.06); // x centred, top at y 0, back at z 0
  return strip(g);
};

// ============================== banner textures ==============================
const TEX_W = 2048, TEX_H = Math.round((2048 * BH) / BW), PXM = TEX_W / BW; // px per metre
const bx = (x: number) => (x + BW / 2) * PXM, by = (y: number) => (BH / 2 - y) * PXM;
const CAP = 0.27, PITCH = 0.36, LINE_Y = [0.9, 0.54, 0.18, -0.18, -0.54, -0.9];
const LINES: { init: string; rest: string; word: number }[] = [
  { init: "A", rest: "UTOSOMAL", word: 0 }, { init: "D", rest: "OMINANT", word: 1 }, { init: "C", rest: "OMPELLING", word: 2 },
  { init: "H", rest: "ELIO-", word: 3 }, { init: "O", rest: "PHTHALMIC", word: 3 }, { init: "O", rest: "UTBURST", word: 4 },
];
const IN_ACRONYM = [true, false, true, true, true, true];
const GAP = 0.04, COND = 0.9;
const EM_PX = (CAP / 0.727) * PXM;
type Layout = { colX: number; restX: number[]; restW: number[] };
let LAYOUT: Layout | null = null;
const measure = (): Layout => {
  if (LAYOUT) return LAYOUT;
  const cv = document.createElement("canvas"), g = cv.getContext("2d")!;
  g.font = `900 ${EM_PX.toFixed(1)}px ${FONT}`;
  const restW = LINES.map((l) => (g.measureText(l.rest).width * COND) / PXM);
  const widths = LINES.map((l, i) => GLYPH_W[l.init] * CAP + GAP + restW[i]);
  const bw = Math.max(...widths), colX = -bw / 2;
  LAYOUT = { colX, restX: LINES.map((l) => colX + GLYPH_W[l.init] * CAP + GAP), restW };
  return LAYOUT;
};
/** banner-local centre x of the initial on line i */
const initX = (i: number) => measure().colX + (GLYPH_W[LINES[i].init] * CAP) / 2;
const drawSun = (g: CanvasRenderingContext2D, cx: number, cy: number, R: number) => {
  g.save(); g.translate(cx, cy);
  for (let k = 0; k < 16; k++) { g.rotate(TAU / 16); g.fillStyle = k % 2 ? "#f2c230" : "#f08a24"; g.beginPath(); g.moveTo(-R * 0.16, -R * 0.78); g.lineTo(0, -R * 1.25); g.lineTo(R * 0.16, -R * 0.78); g.fill(); }
  for (const [rr, c] of [[0.82, "#d9452b"], [0.7, "#f08a24"], [0.58, "#f2c230"]] as [number, string][]) { g.fillStyle = c; g.beginPath(); g.arc(0, 0, R * rr, 0, TAU); g.fill(); }
  g.strokeStyle = "#5a2a10"; g.lineWidth = R * 0.06; g.lineCap = "round";
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * R * 0.2, -R * 0.06, R * 0.1, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  g.beginPath(); g.arc(0, R * 0.08, R * 0.24, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = "rgba(255,120,90,0.6)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * R * 0.34, R * 0.14, R * 0.09, R * 0.06, 0, 0, TAU); g.fill(); }
  g.restore();
};
const bannerBaseTex = () => {
  const t = ctex("snBannerBase", TEX_W, TEX_H, (g, r) => {
    const L = measure();
    const gr = g.createLinearGradient(0, 0, 0, TEX_H); gr.addColorStop(0, "#22327a"); gr.addColorStop(0.5, "#1b2a6c"); gr.addColorStop(1, "#16225a");
    g.fillStyle = gr; g.fillRect(0, 0, TEX_W, TEX_H);
    for (let i = 0; i < 26000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,20,0.12)" : "rgba(140,160,255,0.06)"; g.fillRect(r() * TEX_W, r() * TEX_H, 2 + r() * 3, 1); }
    for (let x = 0; x < TEX_W; x += 3) { g.fillStyle = `rgba(0,0,30,${0.03 + 0.03 * Math.sin(x * 0.07)})`; g.fillRect(x, 0, 1, TEX_H); }
    for (let k = 0; k < 7; k++) { const x = (k + 0.5) * (TEX_W / 7) + (r() - 0.5) * 60; const sg = g.createLinearGradient(x - 120, 0, x + 120, 0); sg.addColorStop(0, "rgba(120,150,255,0)"); sg.addColorStop(0.5, "rgba(120,150,255,0.07)"); sg.addColorStop(1, "rgba(120,150,255,0)"); g.fillStyle = sg; g.fillRect(x - 120, 0, 240, TEX_H); }
    // 70s triple stripes top + bottom
    const band = (y0: number, dir: number) => {
      const cols = ["#f5e6c4", "#d9452b", "#f08a24", "#f2c230"], hs = [0.025, 0.055, 0.055, 0.055];
      let y = y0;
      cols.forEach((c, i) => { g.fillStyle = c; const h = hs[i] * PXM; g.fillRect(0, dir > 0 ? y : y - h, TEX_W, h); y += dir * (h + 0.012 * PXM); });
    };
    band(by(1.255), 1); band(by(-1.2), -1);
    g.fillStyle = "#f5e6c4"; g.fillRect(0, by(1.35), TEX_W, by(1.255) - by(1.35));
    // side panels: smiling 70s suns + small titles
    for (const s of [-1, 1]) {
      const cx = bx(s * 2.32), cy = by(0.2);
      drawSun(g, cx, cy, 0.42 * PXM);
      g.fillStyle = "#f5e6c4"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `900 ${(s < 0 ? 0.2 : 0.13) * PXM}px ${FONT}`; g.fillText(s < 0 ? "1978" : "SYMPOSIUM", cx, by(-0.55));
      g.font = `800 ${(0.075 * PXM).toFixed(0)}px ${FONT}`; g.fillStyle = "#f2c230"; g.fillText(s < 0 ? "INTERNATIONAL" : "ON THE PHOTIC REFLEX", cx, by(-0.76));
      g.strokeStyle = "rgba(245,230,196,0.5)"; g.lineWidth = 0.012 * PXM; g.beginPath(); g.moveTo(bx(s * 2.32 - 0.45), by(-0.9)); g.lineTo(bx(s * 2.32 + 0.45), by(-0.9)); g.stroke();
    }
    // the ghost (unlit) text
    g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = `900 ${EM_PX.toFixed(1)}px ${FONT}`;
    LINES.forEach((l, i) => {
      const base = LINE_Y[i] - CAP / 2;
      g.save(); g.translate(bx(L.restX[i]), by(base)); g.scale(COND, 1);
      g.fillStyle = "rgba(5,10,40,0.55)"; g.fillText(l.rest, 0.008 * PXM, 0.01 * PXM);
      g.fillStyle = "#3d4f98"; g.fillText(l.rest, 0, 0);
      g.restore();
    });
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
};
/** mask: R = text coverage, G = word id box ((id+1)*40), B = soft halo */
const bannerMaskTex = () => {
  const L = measure();
  const mk = () => { const c = document.createElement("canvas"); c.width = TEX_W; c.height = TEX_H; return c; };
  const cR = mk(), cG = mk(), cB = mk();
  const gR = cR.getContext("2d")!, gG = cG.getContext("2d")!, gB = cB.getContext("2d")!;
  for (const g of [gR, gG, gB]) { g.fillStyle = "#000"; g.fillRect(0, 0, TEX_W, TEX_H); g.textAlign = "left"; g.textBaseline = "alphabetic"; g.font = `900 ${EM_PX.toFixed(1)}px ${FONT}`; }
  LINES.forEach((l, i) => {
    const base = LINE_Y[i] - CAP / 2;
    gR.save(); gR.translate(bx(L.restX[i]), by(base)); gR.scale(COND, 1); gR.fillStyle = "#fff"; gR.fillText(l.rest, 0, 0); gR.restore();
    gB.save(); gB.shadowColor = "#fff"; gB.shadowBlur = 26; gB.translate(bx(L.restX[i]), by(base)); gB.scale(COND, 1); gB.fillStyle = "#fff"; gB.fillText(l.rest, 0, 0); gB.fillText(l.rest, 0, 0); gB.restore();
    const v = (l.word + 1) * 40; gG.fillStyle = `rgb(${v},${v},${v})`;
    gG.fillRect(bx(L.restX[i] - 0.05), by(LINE_Y[i] + PITCH / 2 - 0.01), (L.restW[i] + 0.15) * PXM, PITCH * PXM - 0.02 * PXM);
  });
  const cB2 = mk(), gB2 = cB2.getContext("2d")!; gB2.filter = "blur(14px)"; gB2.drawImage(cB, 0, 0);
  const R = gR.getImageData(0, 0, TEX_W, TEX_H).data, G = gG.getImageData(0, 0, TEX_W, TEX_H).data, B = gB2.getImageData(0, 0, TEX_W, TEX_H).data, B0 = gB.getImageData(0, 0, TEX_W, TEX_H).data;
  const out = mk(), go = out.getContext("2d")!, id = go.createImageData(TEX_W, TEX_H);
  for (let k = 0; k < id.data.length; k += 4) { id.data[k] = R[k]; id.data[k + 1] = G[k]; id.data[k + 2] = Math.max(B[k], Math.round(B0[k] * 0.6)); id.data[k + 3] = 255; }
  go.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(out); t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 8;
  return t;
};
const woodTex = () => ctex("snWood", 512, 128, (g, r) => {
  g.fillStyle = "#8a4f24"; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 60; i++) { g.strokeStyle = r() < 0.5 ? "rgba(60,28,10,0.3)" : "rgba(200,130,70,0.2)"; g.lineWidth = 1 + r() * 3; const y = r() * 128; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (r() - 0.5) * 20, 340, y + (r() - 0.5) * 20, 512, y + (r() - 0.5) * 10); g.stroke(); }
});

// ============================== small prop textures ==============================
const parchTex = () => ctex("snScroll", 512, 576, (g, r) => {
  g.fillStyle = "#f1dfb0"; g.fillRect(0, 0, 512, 576);
  for (let i = 0; i < 1800; i++) { g.fillStyle = r() < 0.5 ? "rgba(140,90,30,0.06)" : "rgba(255,250,230,0.12)"; g.beginPath(); g.arc(r() * 512, r() * 576, 1 + r() * 4, 0, TAU); g.fill(); }
  const vg = g.createRadialGradient(256, 288, 120, 256, 288, 380); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(120,70,20,0.35)"); g.fillStyle = vg; g.fillRect(0, 0, 512, 576);
  g.fillStyle = "#4a2a14"; g.textAlign = "center"; g.font = `bold 64px ${SERIF}`; g.fillText("ΗΛΙΟΣ", 256, 86);
  g.save(); g.translate(130, 230); g.strokeStyle = "#a8361c"; g.lineWidth = 9; g.beginPath(); g.arc(0, 0, 46, 0, TAU); g.stroke();
  for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); g.lineTo(Math.cos(a) * 82, Math.sin(a) * 82); g.stroke(); } g.restore();
  g.strokeStyle = "#4a2a14"; g.lineWidth = 7; g.beginPath(); g.moveTo(230, 210); g.bezierCurveTo(260, 190, 290, 250, 320, 228); g.stroke();
  g.beginPath(); g.moveTo(320, 228); g.lineTo(300, 212); g.moveTo(320, 228); g.lineTo(302, 246); g.stroke();
  g.lineWidth = 9; g.beginPath(); g.moveTo(370, 140); g.lineTo(372, 220); g.lineTo(420, 268); g.quadraticCurveTo(420, 296, 384, 292); g.stroke(); // nose profile
  g.fillStyle = "#3a8ad8"; for (const [x, y] of [[440, 300], [452, 336]]) { g.beginPath(); g.moveTo(x, y - 16); g.quadraticCurveTo(x + 12, y + 4, x, y + 8); g.quadraticCurveTo(x - 12, y + 4, x, y - 16); g.fill(); }
  g.fillStyle = "#4a2a14"; g.font = `34px ${SERIF}`; g.textAlign = "left";
  ["διὰ τί ἡ τοῦ ἡλίου", "θερμότης πταρμὸν", "κινεῖ; ἡ ῥὶς ἱδροῖ...", "ΑΡΙΣΤΟΤΕΛΗΣ"].forEach((s, i) => g.fillText(s, 52, 390 + i * 46));
});
const leatherTex = () => ctex("snLeather", 256, 256, (g, r) => {
  g.fillStyle = "#6a2f1c"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(30,10,5,0.18)" : "rgba(200,120,80,0.08)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
  g.strokeStyle = "#d9a441"; g.lineWidth = 5; g.strokeRect(14, 14, 228, 228);
});
const leftPageTex = () => ctex("snPageL", 384, 512, (g, r) => {
  g.fillStyle = "#f6ecd2"; g.fillRect(0, 0, 384, 512);
  for (let i = 0; i < 600; i++) { g.fillStyle = "rgba(150,110,60,0.05)"; g.fillRect(r() * 384, r() * 512, 3, 3); }
  const sg = g.createLinearGradient(330, 0, 384, 0); sg.addColorStop(0, "rgba(120,80,40,0)"); sg.addColorStop(1, "rgba(120,80,40,0.35)"); g.fillStyle = sg; g.fillRect(330, 0, 54, 512);
  g.fillStyle = "#2a1c3a"; g.textAlign = "center"; g.font = `italic bold 40px ${SERIF}`; g.fillText("Exp. the Sunne", 192, 70);
  g.strokeStyle = "#2a1c3a"; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.arc(192, 190, 50, 0, TAU); g.stroke();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.beginPath(); g.moveTo(192 + Math.cos(a) * 62, 190 + Math.sin(a) * 62); g.lineTo(192 + Math.cos(a) * 84, 190 + Math.sin(a) * 84); g.stroke(); }
  g.beginPath(); g.arc(192, 380, 62, 0, TAU); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.arc(192 + s * 24, 370, 13, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); }
  g.beginPath(); g.arc(192, 402, 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  g.font = `italic 30px ${SERIF}`; g.fillStyle = "#2a1c3a"; g.fillText("eyes shut", 192, 488);
});

// ============================== Props ==============================
type Letter = { g: THREE.Group; mesh: THREE.Mesh; mat: THREE.MeshPhongMaterial; ch: string; line: number };
type BlastSlot = { idx: number; ring: THREE.Mesh[]; ringMat: THREE.ShaderMaterial[]; streak: THREE.Mesh; sMat: THREE.ShaderMaterial; iR: THREE.InstancedBufferAttribute; iD: THREE.InstancedBufferAttribute; iC: THREE.InstancedBufferAttribute; iP: THREE.InstancedBufferAttribute };
const N_STREAK = 22;
type Particle = { th: number; ph: number; sp: number; type: number; life: number; size: number; spin: number; col: THREE.Color; up: number };
const C_WHITE = new THREE.Color(1, 1, 1);
export class Props {
  root = new THREE.Group();
  private sprN: Sprites; private sprA: Sprites;
  // banner
  private banner = new THREE.Group(); private cloth: THREE.Mesh; private clothGeo = new THREE.BufferGeometry();
  private clothU: Record<string, THREE.IUniform>; private roller = new THREE.Group(); private rollCloth: THREE.Mesh; private tassels = new THREE.Group();
  private letters: Letter[] = []; private bang!: Letter; private bulbs!: THREE.InstancedMesh; private bulbPts: [number, number][] = [];
  // projector
  private proj = new THREE.Group(); private beam!: RayCards; private lensMat!: THREE.MeshBasicMaterial; private carousel = new THREE.Group();
  private motes: { a: number; u: number; v: number; s: number; ph: number }[] = [];
  // sunbeams
  private sun: RayCards; private sunId = -1;
  // scroll, notebook, quill, mug
  private scroll = new THREE.Group(); private parch!: THREE.Mesh; private rods: THREE.Group[] = [];
  private book = new THREE.Group(); private pageR!: { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; key: string };
  private quill = new THREE.Group();
  private mug = new THREE.Group(); private coffee!: THREE.Mesh;
  // blasts
  private slots: BlastSlot[] = []; private parts: Particle[][] = [];

  constructor() {
    const R = this.root;
    this.sprN = new Sprites(R, 700, false, 40); this.sprA = new Sprites(R, 600, true, 42);
    this.clothU = {
      uMask: { value: null }, uW: { value: [0, 0, 0, 0, 0] }, uLit: { value: new THREE.Color(1.0, 0.93, 0.74) }, uDim: { value: 1 },
      uPool: { value: new THREE.Vector4(0.5, 0.52, 0.36, 0.46) }, uPoolK: { value: 0 }, uGlowK: { value: 1 },
    };
    const built = this.buildBanner(); this.cloth = built.cloth; this.rollCloth = built.rollCloth;
    this.buildProjector(); this.buildScroll(); this.buildBook(); this.buildMug();
    this.sun = new RayCards(R, 14, 0.25, 0.3, 6);
    for (let i = 0; i < 3; i++) this.slots.push(this.buildSlot());
    this.parts = SNEEZES.map(([, , size], i) => {
      const r = rng(1000 + i * 37), peak = size >= 0.95, n = peak ? 46 : 24, out: Particle[] = [];
      for (let k = 0; k < n; k++) {
        const type = r() < 0.55 ? 0 : 1;
        const th = peak ? 0.6 + 0.7 * r() : 0.62 * Math.sqrt(r());
        out.push({ th, ph: r() * TAU, sp: 0.9 + 1.7 * r(), type, life: 0.75 + 0.6 * r(), size: type ? 0.022 + 0.018 * r() : 0.03 + 0.035 * r(), spin: (r() - 0.5) * 8,
          col: type ? C_WHITE.clone() : new THREE.Color().setHSL([0.13, 0.55, 0.5, 0.9][Math.floor(r() * 4) % 4], 1, 0.82), up: 0.3 + 0.5 * r() });
      }
      return out;
    });
  }

  // ------------------------------------------------------------------ banner
  private buildBanner() {
    const B = this.banner; B.position.set(...BANNER.pos); this.root.add(B);
    const NX = 60, NY = 30, pos = new Float32Array((NX + 1) * (NY + 1) * 3), uv = new Float32Array((NX + 1) * (NY + 1) * 2), idx: number[] = [];
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + 1, c = a + NX + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    this.clothGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); this.clothGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); this.clothGeo.setIndex(idx);
    this.clothGeo.userData = { NX, NY };
    this.clothU.uMask.value = bannerMaskTex();
    const m = twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", map: bannerBaseTex(), side: THREE.FrontSide }));
    const prev = m.onBeforeCompile, U = this.clothU;
    m.onBeforeCompile = (sh, rr) => {
      prev.call(m, sh, rr);
      Object.assign(sh.uniforms, U);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform sampler2D uMask; uniform float uW[5]; uniform vec3 uLit; uniform float uDim; uniform vec4 uPool; uniform float uPoolK; uniform float uGlowK;")
        .replace("#include <map_fragment>", `#include <map_fragment>
          vec4 bmk = texture2D( uMask, vMapUv );
          int bwid = int( floor( bmk.g * 255.0 / 40.0 + 0.5 ) ) - 1;
          float blit = 0.0;
          for ( int i = 0; i < 5; i ++ ) { if ( i == bwid ) blit = uW[ i ]; }
          blit *= uDim;
          diffuseColor.rgb = mix( diffuseColor.rgb, uLit, bmk.r * blit );
          vec2 bpd = ( vMapUv - uPool.xy ) / uPool.zw; float bpool = uPoolK * exp( -dot( bpd, bpd ) * 2.2 );`)
        .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
          totalEmissiveRadiance += uLit * ( bmk.r * blit * 0.55 + bmk.b * blit * 0.32 * uGlowK ) + diffuseColor.rgb * vec3( 1.0, 0.86, 0.62 ) * bpool;`);
    };
    m.customProgramCacheKey = () => "snBannerCloth1";
    const cloth = solid(this.clothGeo, m, B);
    // valance board + hanging cords
    const wood = lamb("#ffffff", woodTex()), gold = phong("#e2a93a", null, "#fff0c0", 70), brass = phong("#c99a3a", null, "#fff3c0", 90), dark = lamb("#2a2230");
    const vb = new Bag();
    vb.add(wood, at(rbox(BW + 0.3, 0.24, 0.16, 0.03), 0, BH / 2 + 0.12, -0.02));
    vb.add(gold, at(rbox(BW + 0.34, 0.035, 0.18, 0.012), 0, BH / 2 + 0.235, -0.02), at(rbox(BW + 0.34, 0.035, 0.18, 0.012), 0, BH / 2 + 0.01, -0.02));
    for (const s of [-1, 1]) {
      vb.add(gold, at(new THREE.SphereGeometry(0.075, 20, 14), s * (BW / 2 + 0.24), BH / 2 + 0.12, -0.02));
      vb.add(dark, at(cylY(0.008, 3.0, 8), s * (BW / 2 - 0.3), BH / 2 + 0.24 + 1.5, -0.02));
      vb.add(brass, at(cylY(0.03, 0.06, 14), s * (BW / 2 - 0.3), BH / 2 + 0.26, -0.02));
    }
    vb.build(B);
    // bottom roller (rotates)
    const rb = new Bag();
    rb.add(wood, cylX(ROLL_R0 * 0.8, BW + 0.04, 32));
    for (const s of [-1, 1]) rb.add(brass, at(cylX(ROLL_R0 * 1.35, 0.04, 28), s * (BW / 2 + 0.04), 0, 0), at(new THREE.SphereGeometry(ROLL_R0 * 1.2, 20, 14), s * (BW / 2 + 0.11), 0, 0));
    for (let k = 0; k < 3; k++) rb.add(gold, at(new THREE.BoxGeometry(0.03, 0.02, ROLL_R0 * 2.75).rotateX((k / 3) * Math.PI), BW / 2 + 0.04, 0, 0), at(new THREE.BoxGeometry(0.03, 0.02, ROLL_R0 * 2.75).rotateX((k / 3) * Math.PI), -BW / 2 - 0.04, 0, 0));
    rb.build(this.roller); B.add(this.roller);
    // rolled cloth body (radius = remaining roll)
    const rollCloth = solid(cylX(1, BW - 0.02, 48), lamb("#1e2d70"), B);
    // tassels hanging from the roller ends
    B.add(this.tassels);
    const tb = new Bag();
    for (const s of [-1, 1]) {
      tb.add(gold, at(cylY(0.006, 0.12, 8), s * (BW / 2 + 0.11), -0.06 - ROLL_R0, 0), at(new THREE.SphereGeometry(0.03, 14, 10), s * (BW / 2 + 0.11), -0.13 - ROLL_R0, 0));
      tb.add(gold, at(new THREE.ConeGeometry(0.045, 0.16, 16, 1), s * (BW / 2 + 0.11), -0.23 - ROLL_R0, 0));
    }
    tb.build(this.tassels);
    // 3D letters (one material each: colour + emissive animate)
    LINES.forEach((l, i) => {
      const mat = twoTone(new THREE.MeshPhongMaterial({ color: "#3d4f98", specular: "#ffffff", shininess: 60, emissive: new THREE.Color(0, 0, 0) }));
      const g = new THREE.Group(); B.add(g);
      const mesh = solid(glyphGeo(l.init), mat, g);
      this.letters.push({ g, mesh, mat, ch: l.init, line: i });
    });
    {
      const mat = twoTone(new THREE.MeshPhongMaterial({ color: "#ffc21a", specular: "#ffffff", shininess: 80, emissive: new THREE.Color(0, 0, 0) }));
      const g = new THREE.Group(); B.add(g);
      this.bang = { g, mesh: solid(glyphGeo("!"), mat, g), mat, ch: "!", line: -1 };
    }
    // marquee bulbs (both side edges + under the valance)
    for (let y = 1.1; y > -1.12; y -= 0.17) for (const s of [-1, 1]) this.bulbPts.push([s * (BW / 2 - 0.12), y]);
    for (let x = -BW / 2 + 0.32; x <= BW / 2 - 0.31; x += 0.2) this.bulbPts.push([x, BH / 2 - 0.045]);
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.026, 14, 10), new THREE.MeshBasicMaterial({ color: "#ffffff" }), this.bulbPts.length);
    this.bulbs.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.bulbPts.length * 3), 3);
    this.bulbs.frustumCulled = false; this.bulbs.castShadow = false; B.add(this.bulbs);
    return { cloth, rollCloth };
  }
  /** cloth z displacement (banner local): u 0..1 across, vf 0..1 down the visible length */
  private disp(u: number, vf: number, t: number, sw: number, flut: number) {
    const edge = Math.sin(Math.PI * u);
    return sw * vf * vf + edge * Math.sqrt(vf) * (0.006 + 0.03 * flut) * (0.6 * Math.sin(u * 17 + t * 1.3 + vf * 3) + 0.4 * Math.sin(u * 7 - vf * 5 + t * 0.9));
  }
  private updateBanner(id: number, t: number) {
    const B = this.banner; B.visible = id === 7;
    if (!B.visible) return;
    const s = bannerState(id, t);
    // swing of the bottom edge: while unrolling, then a damped settle; a flutter on the snap-up
    const tr = t - (W.official + 0.3), sw = tr > 0 ? 0.07 * Math.exp(-tr * 2.2) * Math.sin(tr * 6.5) : 0.06 * clamp01(s.reveal) * (1 - clamp01(s.reveal));
    const flut = s.achoo > 0 ? Math.sin(Math.PI * s.achoo) : 0;
    // ---- cloth ----
    const { NX, NY } = this.clothGeo.userData as { NX: number; NY: number };
    const P = this.clothGeo.attributes.position as THREE.BufferAttribute, UV = this.clothGeo.attributes.uv as THREE.BufferAttribute;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i, u = i / NX, vf = j / NY;
      P.setXYZ(k, (u - 0.5) * BW, BH / 2 - vf * s.len, this.disp(u, vf, t, sw, flut));
      UV.setXY(k, u, 1 - (vf * s.len) / BH);
    }
    P.needsUpdate = UV.needsUpdate = true; this.clothGeo.computeVertexNormals();
    // ---- roller (the cloth runs down the back of the roll) ----
    const rz = s.r + sw + 0.004;
    this.roller.position.set(0, s.yRoll, rz); this.roller.rotation.x = -(s.len / s.r);
    this.rollCloth.position.set(0, s.yRoll, rz); this.rollCloth.scale.set(1, s.r, s.r);
    this.tassels.position.set(0, s.yRoll, rz); this.tassels.rotation.x = -4 * sw - 0.35 * flut;
    // ---- word lighting ----
    const uw = this.clothU.uW.value as number[];
    for (let w = 0; w < 5; w++) uw[w] = clamp01(s.words - w);
    this.clothU.uDim.value = 1 - 0.4 * s.initials;
    const beamOn = smooth((t - (W.official - 0.45)) / 0.35);
    this.clothU.uPoolK.value = 0.32 * beamOn;
    // ---- letters ----
    const tA = W.achoo2 - 0.15, aA = t - tA;
    const gold = new THREE.Color("#ffc21a"), unlit = new THREE.Color("#3d4f98"), lit = new THREE.Color("#fff1cc"), grey = new THREE.Color("#2c3768");
    const goldEm = new THREE.Color(1.0, 0.62, 0.1);
    const pulse = 0.5 + 0.5 * Math.sin(t * 7.5);
    // final row: A C H O O ! (left to right)
    const row = ["A", "C", "H", "O", "O", "!"], gapF = 0.1, hF = ACHOO_SIZE.h;
    const totalU = row.reduce((a, c) => a + GLYPH_W[c], 0) + gapF * (row.length - 1);
    const finalX: number[] = []; { let x = -totalU / 2; for (const c of row) { finalX.push((x + GLYPH_W[c] / 2) * hF); x += GLYPH_W[c] + gapF; } }
    const fy = ACHOO_AT[1] - BANNER.pos[1] + hF / 2, fz = ACHOO_AT[2] - BANNER.pos[2];
    let ai = 0;
    this.letters.forEach((Lt, i) => {
      const l = LINES[i], acr = IN_ACRONYM[i];
      const wLit = clamp01(s.words - l.word), ini = acr ? s.initials : 0, D = !acr;
      const x0 = initX(i), yTop = LINE_Y[i] + CAP / 2;
      const vf = (BH / 2 - (yTop - CAP / 2)) / Math.max(0.01, s.len), u = x0 / BW + 0.5;
      const zc = this.disp(u, clamp01(vf), t, sw, 0) + 0.012;
      const vis = clamp01((yTop - (s.yRoll + s.r + 0.01)) / CAP); // grows from its top edge as the roll passes below
      const zk = lerp(0.14, 1, glide(ini)) * (D ? lerp(1, 0.6, s.initials) : 1);
      let px = x0, py = yTop, pz = zc + 0.004, sc = CAP, sy = vis, rx = 0, ry = 0, rzz = 0, szk = zk;
      if (aA > 0) {
        sy = 1;
        const lift = 1 - Math.exp(-aA / 0.035);
        if (D) { // the D drops off and tumbles away
          const a = Math.max(0, aA - 0.05);
          px = x0 - 0.35 * a; py = yTop + 0.9 * a - 5.5 * a * a; pz = zc + 0.3 * lift + 0.6 * a; rzz = 4.5 * a; rx = 2 * a;
        } else {
          const k = ai, p = clamp01((aA - 0.06 - 0.035 * k) / 0.5), e = backOut(p, 1.3);
          const sz0 = zc + 0.34 * lift;
          px = lerp(x0, finalX[k], e); py = lerp(yTop, fy, e) + 0.35 * Math.sin(Math.PI * p); pz = lerp(sz0, fz, easeOut3(p)) + 0.25 * Math.sin(Math.PI * p);
          sc = lerp(CAP, hF, e); ry = TAU * glide(p); szk = 1;
          const bb = smooth((aA - 0.56 - 0.035 * k) / 0.4);
          py += 0.035 * Math.sin(t * 3.2 - k * 0.9) * bb; rzz = 0.04 * Math.sin(t * 2.1 + k) * bb;
        }
      }
      if (acr) ai++;
      Lt.g.visible = sy > 0.002 && !(D && aA > 1.5);
      Lt.g.position.set(px, py, pz); Lt.g.rotation.set(rx, ry, rzz);
      Lt.g.scale.set(sc, sc * Math.max(sy, 0.002), sc * szk);
      const c = unlit.clone().lerp(lit, wLit);
      if (D) c.lerp(grey, s.initials);
      c.lerp(gold, glide(ini));
      Lt.mat.color.copy(c);
      Lt.mat.emissive.copy(lit).multiplyScalar(0.28 * wLit * (1 - ini) * (D ? 1 - s.initials : 1)).add(goldEm.clone().multiplyScalar((0.35 + 0.25 * pulse) * glide(ini)));
      if (Lt.g.visible && acr && ini > 0.01) {
        const wp = new THREE.Vector3(px, py - 0.5 * sc, pz + 0.15 * sc).add(B.position);
        this.sprA.push(wp, sc * 2.6, 0, 0.55 * ini * (0.8 + 0.2 * pulse), A_GLOW, new THREE.Color(1.0, 0.62, 0.15));
      }
    });
    // "!" pops in after the letters land
    const pb = elastic((aA - 0.42) / 0.55), bg = this.bang.g;
    bg.visible = aA > 0.42;
    if (bg.visible) {
      const k = 5, sc = hF * Math.max(0.002, pb), bob = 0.035 * Math.sin(t * 3.2 - k * 0.9) * smooth((aA - 1.0) / 0.4);
      bg.position.set(finalX[k], fy - hF * (1 - Math.max(0.002, pb)) * 0.5 + bob, fz); bg.scale.set(sc, sc, sc); bg.rotation.set(0, 0, -0.1 + 0.1 * pb);
      this.bang.mat.emissive.copy(goldEm).multiplyScalar(0.35 + 0.25 * pulse);
      this.sprA.push(new THREE.Vector3(finalX[k], fy - hF * 0.5, fz + 0.1).add(B.position), sc * 2.4, 0, 0.5 * (0.8 + 0.2 * pulse), A_GLOW, new THREE.Color(1.0, 0.62, 0.15));
    }
    // ACHOO! glow + sparkle burst when it forms
    if (aA > 0.3) {
      const k = smooth((aA - 0.3) / 0.4), c = v3(ACHOO_AT);
      this.sprA.push(c, ACHOO_SIZE.w * 1.5, 0, 0.3 * k * (0.85 + 0.15 * pulse), A_GLOW, new THREE.Color(1.0, 0.55, 0.12));
      const r = rng(77);
      for (let n = 0; n < 40; n++) {
        const a0 = r() * TAU, sp = 0.6 + 1.4 * r(), life = 0.9 + 0.7 * r(), tt = aA - 0.45 - r() * 0.15, zr = r(), sr = r();
        if (tt < 0 || tt > life) continue;
        const d = 1 - Math.exp(-tt * 2.6), p = c.clone().add(new THREE.Vector3(Math.cos(a0) * (ACHOO_SIZE.w * 0.42 + sp * d), Math.sin(a0) * (hF * 0.55 + sp * 0.6 * d) - 0.5 * tt * tt, 0.15 + 0.4 * zr * d));
        const fade = 1 - smooth((tt - life + 0.35) / 0.35), sz = (0.05 + 0.06 * sr) * (0.75 + 0.25 * Math.sin(t * 14 + n)) * smooth(tt / 0.08);
        this.sprA.push(p, sz, t * 2 + n, fade, n % 3 ? A_STAR : A_TWINK, n % 2 ? new THREE.Color(1.0, 0.8, 0.3) : C_WHITE, 1.6);
      }
    }
    // ---- bulbs ----
    const m4 = new THREE.Matrix4(), col = new THREE.Color(), on = smooth((t - (W.official + 0.2)) / 0.4), hot = new THREE.Color(3.2, 2.3, 1.1), bulbGlow = new THREE.Color(1.0, 0.7, 0.35);
    this.bulbPts.forEach(([x, y], i) => {
      const v = clamp01((y - (s.yRoll + s.r + 0.02)) / 0.06), u = x / BW + 0.5, vf = clamp01((BH / 2 - y) / Math.max(0.01, s.len));
      const z = this.disp(u, vf, t, sw, flut) + 0.03;
      m4.makeScale(Math.max(v, 1e-3), Math.max(v, 1e-3), Math.max(v, 1e-3)).setPosition(x, y, z); this.bulbs.setMatrixAt(i, m4);
      const chase = s.words > 0.05 && s.words < 4.98 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(i * 1.9 - t * 14)) : 1;
      const flash = s.initials > 0.02 ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 18)) : 1;
      const k = on * chase * lerp(1, flash, s.initials);
      col.setRGB(0.25, 0.16, 0.08).lerp(hot, k); this.bulbs.setColorAt(i, col);
      if (v > 0.5 && k > 0.05) this.sprA.push(new THREE.Vector3(x, y, z + 0.02).add(B.position), 0.16, 0, 0.35 * k * v, A_GLOW, bulbGlow);
    });
    this.bulbs.instanceMatrix.needsUpdate = true; if (this.bulbs.instanceColor) this.bulbs.instanceColor.needsUpdate = true;
  }

  // ------------------------------------------------------------------ projector
  private buildProjector() {
    const G = this.proj; G.position.set(...PROJ.cart); this.root.add(G);
    G.rotation.y = Math.atan2(PROJ.cart[0] - BANNER.pos[0], PROJ.cart[2] - BANNER.pos[2]); // local -z faces the banner
    const chrome = phong("#dfe4ea", null, "#ffffff", 120), black = lamb("#26232a"), cartC = lamb("#3c5a8a"), body = phong("#8a7a66", null, "#ffffff", 40);
    const face = phong("#c9c2b4", null, "#ffffff", 60), tray = phong("#2f2b30", null, "#99aaaa", 50), rubber = lamb("#1a181c");
    const b = new Bag();
    b.add(cartC, at(rbox(0.6, 0.035, 0.48, 0.01), 0, 0.92, 0), at(rbox(0.6, 0.035, 0.48, 0.01), 0, 0.32, 0));
    for (const [x, z] of [[-0.27, -0.21], [0.27, -0.21], [-0.27, 0.21], [0.27, 0.21]]) { b.add(chrome, at(cylY(0.014, 0.88, 12), x, 0.5, z)); b.add(rubber, at(new THREE.SphereGeometry(0.035, 12, 8), x, 0.035, z)); }
    b.add(black, at(rbox(0.3, 0.14, 0.22, 0.02), 0.05, 0.41, 0.0)); // a spare slide box on the lower shelf
    b.add(body, at(rbox(0.34, 0.14, 0.32, 0.025), 0, 1.01, 0));
    b.add(face, at(rbox(0.3, 0.1, 0.02, 0.008), 0, 1.0, -0.163));
    for (let i = 0; i < 7; i++) b.add(black, at(new THREE.BoxGeometry(0.012, 0.075, 0.016), 0.172, 1.01, -0.1 + i * 0.03));
    b.add(chrome, at(cylZ(0.048, 0.04, 28), -0.06, 1.0, -0.18), at(cylZ(0.04, 0.12, 28), -0.06, 1.0, -0.24));
    b.add(black, at(cylZ(0.0435, 0.02, 28), -0.06, 1.0, -0.21), at(cylZ(0.0435, 0.015, 28), -0.06, 1.0, -0.27));
    b.add(black, at(cylY(0.015, 0.03, 12), 0.11, 1.095, 0.1), at(rbox(0.05, 0.025, 0.03, 0.008), 0.08, 1.09, -0.12));
    b.add(rubber, new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.98, 0.16), new THREE.Vector3(0.2, 0.94, 0.3), new THREE.Vector3(0.24, 0.6, 0.27), new THREE.Vector3(0.26, 0.05, 0.4), new THREE.Vector3(0.4, 0.01, 0.6)]), 40, 0.008, 6, false));
    b.build(G);
    this.carousel.position.set(0, 1.105, 0.02); G.add(this.carousel);
    const cb = new Bag();
    cb.add(tray, cylY(0.16, 0.05, 48)); cb.add(chrome, at(cylY(0.04, 0.03, 20), 0, 0.035, 0));
    for (let k = 0; k < 36; k++) { const a = (k / 36) * TAU; cb.add(face, at(new THREE.BoxGeometry(0.004, 0.055, 0.05).rotateY(-a), Math.cos(a) * 0.12, 0.012, Math.sin(a) * 0.12)); }
    cb.build(this.carousel);
    this.lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.18, 0.15) });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 28), this.lensMat); lens.position.set(-0.06, 1.0, -0.302); lens.rotation.y = Math.PI; lens.frustumCulled = false; G.add(lens);
    this.beam = new RayCards(this.root, 9, 0.04, 0.12, 7);
    const r = rng(4242);
    for (let i = 0; i < 90; i++) this.motes.push({ a: 0.15 + 0.82 * r(), u: (r() - 0.5) * 0.9, v: (r() - 0.5) * 0.9, s: 0.006 + 0.01 * r() * r(), ph: r() * TAU });
  }
  private lensWorld() { const p = new THREE.Vector3(-0.06, 1.0, -0.31); this.proj.updateMatrixWorld(); return p.applyMatrix4(this.proj.matrixWorld); }
  private beamTarget(u: number, v: number) { return new THREE.Vector3(BANNER.pos[0] + u * 3.9, BANNER.pos[1] + 0.05 + v * 2.3, BANNER.pos[2] + 0.05); }
  private updateProjector(id: number, t: number) {
    const show = id === 7; this.proj.visible = show; this.beam.mesh.visible = show;
    if (!show) return;
    const on = smooth((t - (W.official - 0.45)) / 0.35) * (0.94 + 0.06 * Math.sin(t * 31) * Math.sin(t * 7.3));
    this.lensMat.color.setRGB(0.2 + 3.2 * on, 0.18 + 2.7 * on, 0.15 + 1.9 * on);
    const dt = Math.max(0, t - W.official), steps = Math.floor(dt / 1.6), part = (dt % 1.6) / 0.18;
    this.carousel.rotation.y = -(steps + smooth(part)) * (TAU / 36);
    const L = this.lensWorld(), rays: Ray[] = [];
    const tgt: [number, number, number, number][] = [[0, 0, 2.2, 1.0], [-0.22, 0.18, 1.6, 0.6], [0.22, -0.16, 1.6, 0.6], [-0.3, -0.25, 1.3, 0.45], [0.3, 0.25, 1.3, 0.45], [0, 0.32, 1.4, 0.4], [0, -0.32, 1.4, 0.4], [0.05, 0.02, 0.7, 1.4]];
    tgt.forEach(([u, v, w, k], i) => { const T = this.beamTarget(u, v); rays.push({ a: [L.x, L.y, L.z], b: [T.x, T.y, T.z], w0: 0.05, w1: w, k: k * 0.08, seed: i * 1.37 }); });
    this.beam.set(rays); this.beam.mat.uniforms.uK.value = on; this.beam.mat.uniforms.uT.value = t;
    (this.beam.mat.uniforms.uCol.value as THREE.Color).setRGB(1.0, 0.88, 0.68);
    this.sprA.push(L, 0.22, 0, 0.8 * on, A_GLOW, new THREE.Color(1, 0.86, 0.62), 2.0);
    const mc = new THREE.Color(1, 0.9, 0.7);
    for (const m of this.motes) {
      const a = m.a, T = this.beamTarget(m.u * 0.8, m.v * 0.8), p = L.clone().lerp(T, a);
      p.x += 0.12 * Math.sin(t * 0.31 + m.ph) * a; p.y += 0.1 * Math.sin(t * 0.23 + m.ph * 2) * a; p.z += 0.12 * Math.cos(t * 0.27 + m.ph);
      const tw = 0.55 + 0.45 * Math.sin(t * (1.2 + m.ph * 0.3) + m.ph * 5);
      this.sprA.push(p, m.s * (1 + a), 0, 0.85 * on * tw, A_DOT, mc, 1.4);
    }
  }

  // ------------------------------------------------------------------ scroll
  private buildScroll() {
    this.root.add(this.scroll);
    const wood = phong("#7a4420", null, "#ffd0a0", 30), knob = phong("#e2a93a", null, "#fff0c0", 80), par = lamb("#f1dfb0");
    const pg = new THREE.PlaneGeometry(1, 0.22, 20, 1), p = pg.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, -0.025 * (1 - 4 * x * x)); } pg.computeVertexNormals();
    this.parch = solid(pg, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", map: parchTex(), side: THREE.DoubleSide })), this.scroll);
    for (const s of [-1, 1]) {
      const rod = new THREE.Group(), b = new Bag();
      b.add(wood, cylY(0.009, 0.3, 12)); b.add(par, cylY(0.022, 0.215, 20));
      for (const e of [-1, 1]) b.add(knob, at(new THREE.SphereGeometry(0.017, 14, 10), 0, e * 0.155, 0));
      b.build(rod); rod.userData.s = s; this.scroll.add(rod); this.rods.push(rod);
    }
  }
  private updateScroll(id: number, t: number) {
    const S = scrollAt(id, t); this.scroll.visible = S.show;
    if (!S.show) return;
    this.scroll.position.set(...S.pos); this.scroll.rotation.set(S.rot[0], S.rot[1], S.rot[2], "YXZ");
    const w = 0.025 + 0.2 * S.open;
    this.parch.scale.set(w, 1, 1); this.parch.visible = S.open > 0.02;
    this.rods.forEach((r) => r.position.set((r.userData.s as number) * (w / 2 + 0.018), 0, -0.004));
  }

  // ------------------------------------------------------------------ notebook + quill
  private buildBook() {
    this.root.add(this.book, this.quill);
    const leather = lamb("#ffffff", leatherTex()), paper = lamb("#efe3c4");
    const cv = document.createElement("canvas"); cv.width = 384; cv.height = 512;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    this.pageR = { cv, tex, key: "" };
    for (const s of [-1, 1]) {
      const sideG = new THREE.Group(); sideG.rotation.y = -s * 0.16; this.book.add(sideG);
      const sb = new Bag();
      sb.add(leather, at(rbox(PAGE_W + 0.012, PAGE_H + 0.014, 0.006, 0.002, 2), s * (PAGE_W / 2 + 0.004), 0, 0.003));
      sb.add(paper, at(new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.008), s * (PAGE_W / 2 + 0.006), 0, 0.01));
      sb.build(sideG);
      const pg = new THREE.Mesh(new THREE.PlaneGeometry(PAGE_W, PAGE_H), lamb("#ffffff", s < 0 ? leftPageTex() : tex));
      pg.position.set(s * (PAGE_W / 2 + 0.006), 0, 0.0145); pg.receiveShadow = true; pg.frustumCulled = false; sideG.add(pg);
    }
    const b = new Bag(); b.add(leather, at(cylY(0.008, PAGE_H + 0.014, 10), 0, 0, 0.002)); b.build(this.book);
    this.book.position.set(...NOTEBOOK_AT); this.book.rotation.set(NB_TILT, NB_YAW, 0, "YXZ");
    // quill: curved feather vane + shaft + nib (nib at local origin, feather along +y)
    const vane = new THREE.Shape(); vane.moveTo(0, 0.05); vane.bezierCurveTo(0.03, 0.1, 0.035, 0.2, 0.012, 0.27); vane.bezierCurveTo(-0.01, 0.22, -0.02, 0.12, 0, 0.05);
    const vg = new THREE.ShapeGeometry(vane, 16), vp = vg.attributes.position;
    for (let i = 0; i < vp.count; i++) { const y = vp.getY(i); vp.setZ(i, 0.04 * Math.sin((y / 0.27) * Math.PI * 0.5) ** 2); } vg.computeVertexNormals();
    const qb = new Bag();
    qb.add(twoTone(new THREE.MeshLambertMaterial({ color: "#f4f0e6", side: THREE.DoubleSide })), vg);
    qb.add(lamb("#d8cdb0"), new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.0, 0), new THREE.Vector3(0.004, 0.14, 0.012), new THREE.Vector3(0.012, 0.27, 0.04)]), 16, 0.0025, 6));
    qb.add(lamb("#1a1420"), at(new THREE.ConeGeometry(0.0035, 0.018, 8).rotateX(Math.PI), 0, 0.007, 0));
    qb.build(this.quill); this.quill.scale.setScalar(0.8);
  }
  private drawPage(k: number[]) {
    const key = k.map((v) => v.toFixed(3)).join("|");
    if (key === this.pageR.key) return; this.pageR.key = key;
    const g = this.pageR.cv.getContext("2d")!, r = rng(9);
    g.fillStyle = "#f6ecd2"; g.fillRect(0, 0, 384, 512);
    for (let i = 0; i < 600; i++) { g.fillStyle = "rgba(150,110,60,0.05)"; g.fillRect(r() * 384, r() * 512, 3, 3); }
    const sg = g.createLinearGradient(0, 0, 54, 0); sg.addColorStop(0, "rgba(120,80,40,0.35)"); sg.addColorStop(1, "rgba(120,80,40,0)"); g.fillStyle = sg; g.fillRect(0, 0, 54, 512);
    g.strokeStyle = "rgba(90,110,160,0.25)"; g.lineWidth = 2; for (let y = 120; y < 500; y += 46) { g.beginPath(); g.moveTo(30, y); g.lineTo(360, y); g.stroke(); }
    const write = (txt: string, y: number, p: number, size: number, col: string, mark: "tick" | "cross") => {
      if (p <= 0) return;
      g.save(); g.beginPath(); g.rect(0, y - 80, 30 + p * 354, 120); g.clip();
      g.fillStyle = col; g.font = `italic bold ${size}px ${SERIF}`; g.textAlign = "left"; g.textBaseline = "alphabetic";
      g.translate(26, y); g.rotate(-0.04); g.fillText(txt, 0, 0);
      g.strokeStyle = col; g.lineWidth = 10; g.lineCap = "round";
      const mx = g.measureText(txt).width + 18;
      if (mark === "tick") { g.beginPath(); g.moveTo(mx, -28); g.lineTo(mx + 20, 0); g.lineTo(mx + 52, -48); g.stroke(); }
      else { g.beginPath(); g.moveTo(mx + 4, -42); g.lineTo(mx + 46, 2); g.moveTo(mx + 46, -42); g.lineTo(mx + 4, 2); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(90, 30, 180, 14, mx + 50, 26); g.stroke(); }
      g.restore();
    };
    write("HEAT", LINE_V[0] * 512 + 26, k[0], 66, "#2a1c3a", "tick");
    write("SNEEZE", LINE_V[1] * 512 + 26, k[1], 46, "#a8261c", "cross");
    this.pageR.tex.needsUpdate = true;
  }
  private updateBook(id: number, t: number) {
    const show = id === 3; this.book.visible = this.quill.visible = show;
    if (!show) return;
    this.drawPage(writeK(t));
    const q = quillAt(id, t);
    this.quill.position.set(...q.nib);
    this.quill.rotation.set(-0.35 + 0.1 * Math.sin(t * 19) * q.writing, 0.3, -0.5 - 0.12 * Math.sin(t * 38) * q.writing, "YXZ");
  }

  // ------------------------------------------------------------------ mug
  private buildMug() {
    this.root.add(this.mug);
    const dots = ctex("snMugDots", 256, 128, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 256, 128); g.fillStyle = "#fff0c8"; for (let y = 16; y < 128; y += 32) for (let x = (y / 32) % 2 >= 1 ? 16 : 0; x < 256; x += 32) { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); } });
    const red = phong("#e8433a", dots, "#ffffff", 90), redPlain = phong("#e8433a", null, "#ffffff", 90);
    const cream = phong("#fff4e0", null, "#ffffff", 60);
    const outer = new THREE.LatheGeometry([[0.0, 0], [0.042, 0], [0.046, 0.006], [0.047, 0.1], [0.044, 0.105]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
    const inner = new THREE.LatheGeometry([[0.044, 0.105], [0.04, 0.1], [0.039, 0.012], [0.0, 0.012]].map(([x, y]) => new THREE.Vector2(x, y)), 40);
    const b = new Bag();
    b.add(red, outer); b.add(cream, inner);
    b.add(redPlain, at(new THREE.TorusGeometry(0.027, 0.009, 10, 24, Math.PI * 1.15).rotateZ(-Math.PI * 0.575), 0.05, 0.055, 0));
    b.build(this.mug);
    this.coffee = solid(new THREE.CircleGeometry(0.0395, 32).rotateX(-Math.PI / 2), lamb("#5a3018"), this.mug); this.coffee.position.y = 0.084; this.coffee.castShadow = false;
  }
  private updateMug(id: number, t: number) {
    const M = mugAt(id, t); this.mug.visible = M.show;
    if (!M.show) return;
    this.mug.position.set(...M.pos);
    this.mug.rotation.set(0.12 * M.jolt * Math.sin(t * 20), -0.5, 0.18 * M.jolt * Math.sin(t * 15 + 1));
    this.coffee.rotation.set(0.25 * M.jolt * Math.sin(t * 24), 0, 0.25 * M.jolt * Math.cos(t * 21));
    const top = v3(M.pos).add(new THREE.Vector3(0, 0.11, 0)), steam = new THREE.Color(1, 0.98, 0.95);
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.45 + k / 4) % 1, p = top.clone().add(new THREE.Vector3(0.018 * Math.sin(t * 1.3 + k * 2.1) + 0.03 * ph * Math.sin(k * 3), ph * 0.16, 0.01 * Math.cos(t + k)));
      const a = 0.32 * Math.sin(Math.PI * ph) * (1 - M.jolt * 0.8);
      this.sprN.push(p, 0.05 + 0.07 * ph, 0.3 * Math.sin(t + k), a, A_STEAM, steam);
    }
    for (const [t0, who, size] of SNEEZES) {
      if (who !== "bean") continue;
      const a = t - t0; if (a < 0 || a > 0.7) continue;
      const r = rng(Math.round(t0 * 100));
      for (let n = 0; n < 6; n++) {
        const vy = (0.9 + 0.7 * r()) * size + 0.3, vx = (r() - 0.5) * 0.25, vz = (r() - 0.5) * 0.2, sz = 0.016 + 0.01 * r(), g = 7.5, tl = (2 * vy) / g;
        const tt = a - 0.02 * n; if (tt < 0 || tt > tl) continue;
        const p = top.clone().add(new THREE.Vector3(vx * tt, -0.02 + vy * tt - 0.5 * g * tt * tt, vz * tt));
        this.sprN.push(p, sz * smooth(tt / 0.04), 0, 1 - smooth((tt - tl + 0.06) / 0.06), A_COFFEE, C_WHITE);
      }
    }
  }

  // ------------------------------------------------------------------ sunbeams
  private updateSun(id: number, t: number) {
    const B = BEAMS[id]; this.sun.mesh.visible = !!B;
    if (!B) return;
    if (this.sunId !== id) {
      this.sunId = id;
      const d = shotSunDir(id), right = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, d).normalize();
      const r = rng(500 + id * 13), rays: Ray[] = [];
      for (let i = 0; i < 12; i++) {
        const ox = (r() - 0.5) * 14, oy = -1.2 + r() * 4.5, w = 0.5 + 2.2 * r() * r(), n0 = 4 + 5 * r(), n1 = 45 + 30 * r();
        const q = v3(B.o).addScaledVector(right, ox).addScaledVector(up, oy);
        const a = q.clone().addScaledVector(d, n1), b = q.clone().addScaledVector(d, n0);
        rays.push({ a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], w0: w * 1.15, w1: w, k: (0.5 + 0.5 * r()) * B.k, seed: r() * 3 });
      }
      this.sun.set(rays); (this.sun.mat.uniforms.uCol.value as THREE.Color).setRGB(...B.col);
    }
    this.sun.mat.uniforms.uK.value = 1; this.sun.mat.uniforms.uT.value = t;
  }

  // ------------------------------------------------------------------ sneeze blasts
  private buildSlot(): BlastSlot {
    const ring: THREE.Mesh[] = [], ringMat: THREE.ShaderMaterial[] = [];
    for (let k = 0; k < 2; k++) {
      const m = new THREE.ShaderMaterial({
        uniforms: { uA: { value: 0 }, uW: { value: 0.12 }, uT: { value: 0 } },
        vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `uniform float uA; uniform float uW; uniform float uT; varying vec2 vP;
          void main(){ float r = length(vP), ang = atan(vP.y, vP.x);
            float wob = 0.018 * sin(ang * 9.0 + uT * 5.0) + 0.012 * sin(ang * 23.0 - uT * 7.0);
            float rr = r + wob; float rim = smoothstep(1.0 - uW, 1.0 - uW * 0.35, rr) * (1.0 - smoothstep(0.96, 1.0, rr));
            float fill = 0.1 * smoothstep(0.35, 1.0 - uW, rr) * (1.0 - smoothstep(0.96, 1.0, rr));
            float streak = 0.78 + 0.22 * sin(ang * 31.0 + rr * 12.0);
            float a = uA * (rim * streak + fill); if (a < 0.003) discard;
            vec3 c = mix(vec3(0.62, 0.86, 1.0), vec3(1.0), smoothstep(1.0 - uW, 1.0 - uW * 0.5, rr));
            gl_FragColor = vec4(c, a); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.03, 96), m); fxl(mesh, 44); mesh.visible = false; this.root.add(mesh);
      ring.push(mesh); ringMat.push(m);
    }
    // wind streaks: instanced curved ribbons, computed on the GPU from (dir, curl, timing)
    const M = 12, pos: number[] = [], idx: number[] = [];
    for (let j = 0; j <= M; j++) for (const s of [-1, 1]) pos.push(j / M, s, 0);
    for (let j = 0; j < M; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const iD = new THREE.InstancedBufferAttribute(new Float32Array(N_STREAK * 3), 3), iC = new THREE.InstancedBufferAttribute(new Float32Array(N_STREAK * 3), 3), iP = new THREE.InstancedBufferAttribute(new Float32Array(N_STREAK * 4), 4);
    const iR = new THREE.InstancedBufferAttribute(new Float32Array(N_STREAK * 3), 3); geo.setAttribute("iR", iR);
    geo.setAttribute("iD", iD); geo.setAttribute("iC", iC); geo.setAttribute("iP", iP); geo.instanceCount = N_STREAK;
    const sMat = new THREE.ShaderMaterial({
      uniforms: { uO: { value: new THREE.Vector3() }, uAge: { value: 0 }, uReach: { value: 1 }, uW: { value: 0.02 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iR; attribute vec3 iD; attribute vec3 iC; attribute vec4 iP; uniform vec3 uO; uniform float uAge; uniform float uReach; uniform float uW;
        varying vec2 vQ; varying float vA;
        float ease(float x){ x = clamp(x, 0.0, 1.0); return 1.0 - (1.0 - x) * (1.0 - x) * (1.0 - x); }
        void main(){ float tt = uAge - iP.x, dur = 0.5 * iP.y;
          float h = uReach * iP.w * ease(tt / dur), tl = uReach * iP.w * ease((tt - 0.16 * iP.y) / dur);
          float a = position.x, s = mix(tl, h, a);
          vec3 P = uO + iR + iD * s + iC * s * s; vec3 T = iD + 2.0 * iC * s; vec3 vd = cameraPosition - P;
          vec3 cr = cross(T, vd); float l = length(cr); vec3 sd = l > 1e-5 ? cr / l : vec3(1.0, 0.0, 0.0);
          float w = uW * iP.z * pow(max(sin(3.14159 * a), 0.0), 0.6) * (0.6 + 0.4 * a);
          P += sd * position.y * w; vQ = vec2(a, position.y);
          vA = step(0.0, tt) * (1.0 - smoothstep(0.55, 0.95, tt / iP.y)) * smoothstep(0.004, 0.03, h - tl) * smoothstep(0.2, 0.6, length(vd));
          gl_Position = projectionMatrix * viewMatrix * vec4(P, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uK; varying vec2 vQ; varying float vA;
        void main(){ float e = abs(vQ.y); float a = uK * vA * (1.0 - smoothstep(0.55, 1.0, e)) * smoothstep(0.0, 0.25, vQ.x);
          if (a < 0.003) discard; vec3 c = mix(vec3(1.0), vec3(0.5, 0.78, 1.0), smoothstep(0.15, 0.85, e)); gl_FragColor = vec4(c, a); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const streak = new THREE.Mesh(geo, sMat); fxl(streak, 43); streak.visible = false; this.root.add(streak);
    return { idx: -1, ring, ringMat, streak, sMat, iR, iD, iC, iP };
  }
  private basis(dir: V3) {
    const f = v3(dir).normalize(), ref = Math.abs(f.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const r = new THREE.Vector3().crossVectors(f, ref).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize();
    return { f, r, u };
  }
  private coneDir(th: number, ph: number, bs: { f: THREE.Vector3; r: THREE.Vector3; u: THREE.Vector3 }) {
    return bs.f.clone().multiplyScalar(Math.cos(th)).addScaledVector(bs.r, Math.sin(th) * Math.cos(ph)).addScaledVector(bs.u, Math.sin(th) * Math.sin(ph));
  }
  private updateBlasts(id: number, t: number, cam: THREE.Camera) {
    const act = blastsAt(id, t);
    this.slots.forEach((s) => { s.ring.forEach((m) => (m.visible = false)); s.streak.visible = false; });
    const camP = new THREE.Vector3().setFromMatrixPosition(cam.matrixWorld);
    act.slice(0, this.slots.length).forEach((b, si) => {
      const S = this.slots[si], bs = this.basis(b.dir), O = v3(b.origin).addScaledVector(bs.f, 0.06), sz = b.size;
      const dCam = camP.distanceTo(O);
      if (S.idx !== b.i) {
        S.idx = b.i; const r = rng(300 + b.i * 17);
        for (let k = 0; k < N_STREAK; k++) {
          const th = b.peak ? 0.75 + 0.6 * r() : 0.05 + 0.42 * r(), ph = r() * TAU, d = this.coneDir(th, ph, bs);
          const rad = this.coneDir(Math.PI / 2, ph, bs).multiplyScalar(b.peak ? 0.2 + 0.08 * r() : 0); S.iR.setXYZ(k, rad.x, rad.y, rad.z);
          const curl = bs.u.clone().multiplyScalar((r() - 0.3) * 0.25).addScaledVector(bs.r, (r() - 0.5) * 0.2).add(new THREE.Vector3(0, -0.05, 0));
          S.iD.setXYZ(k, d.x, d.y, d.z); S.iC.setXYZ(k, curl.x, curl.y, curl.z);
          S.iP.setXYZW(k, r() * 0.12, 0.8 + 0.5 * r(), 0.6 + 0.8 * r(), 0.55 + 0.45 * r());
        }
        S.iR.needsUpdate = S.iD.needsUpdate = S.iC.needsUpdate = S.iP.needsUpdate = true;
      }
      const reach = b.peak ? 0.65 : 0.8 + 1.4 * sz;
      S.streak.visible = true; (S.sMat.uniforms.uO.value as THREE.Vector3).copy(O); S.sMat.uniforms.uAge.value = b.age;
      S.sMat.uniforms.uReach.value = reach; S.sMat.uniforms.uW.value = b.peak ? 0.016 : 0.016 + 0.012 * sz; S.sMat.uniforms.uK.value = b.peak ? 0.95 : 0.85;
      // ---- shockwave rings ----
      S.ring.forEach((m, k) => {
        const a = b.age - k * 0.09; if (a < 0 || a > 0.7) return;
        const e = easeOut3(a / 0.55), travel = b.peak ? Math.max(0, Math.min(0.32, dCam - 0.9)) * e : (0.15 + 0.5 * sz) * e;
        const rad = b.peak ? 0.12 + (0.95 - 0.25 * k) * e : (0.05 + (0.32 + 0.4 * sz) * e) * (1 - 0.25 * k);
        m.visible = true; m.position.copy(O).addScaledVector(bs.f, travel); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bs.f);
        m.scale.setScalar(rad);
        const mt = S.ringMat[k]; mt.uniforms.uA.value = (b.peak ? 0.9 : 0.8) * smooth(a / 0.04) * (1 - smooth((a - 0.2) / 0.45)); mt.uniforms.uW.value = b.peak ? 0.16 : 0.22; mt.uniforms.uT.value = t;
      });
      // ---- cloud puffs ----
      const nP = b.peak ? 9 : 6;
      for (let k = 0; k < nP; k++) {
        const a = b.age - 0.01 * k; if (a < 0 || a > 0.9) continue;
        const ph = (k / nP) * TAU + b.i, e = easeOut3(a / 0.6);
        const ringR = b.peak ? 0.16 + 0.42 * e : (0.03 + 0.14 * e) * sz;
        const p = O.clone().addScaledVector(bs.f, b.peak ? 0.05 + 0.22 * e : (0.06 + 0.45 * e) * (0.6 + sz)).addScaledVector(bs.r, Math.cos(ph) * ringR).addScaledVector(bs.u, Math.sin(ph) * ringR);
        const size = b.peak ? 0.1 + 0.22 * e : (0.05 + 0.16 * e) * (0.5 + sz);
        this.sprN.push(p, size * smooth(a / 0.04), ph, 0.95 * (1 - smooth((a - 0.35) / 0.45)), A_PUFF, C_WHITE);
      }
      // ---- sparkles + droplets (ballistic, drag, floaty gravity) ----
      const parts = this.parts[b.i];
      parts.forEach((q, k) => {
        const a = b.age - 0.015 * (k % 6); if (a < 0 || a > q.life) return;
        const d = this.coneDir(q.th, q.ph + b.i, bs), sp = q.sp * (b.peak ? 0.95 : 0.7 + 0.6 * sz), kd = 2.4, dr = (1 - Math.exp(-kd * a)) / kd;
        const p = O.clone().addScaledVector(d, sp * dr).add(new THREE.Vector3(0, q.up * sp * dr * 0.4 - 1.6 * a * a, 0));
        if (p.distanceTo(camP) < 0.45) return;
        const fade = 1 - smooth((a - q.life + 0.3) / 0.3), grow = smooth(a / 0.07);
        if (q.type === 1) { // droplet: round end leading, point trailing
          const ex = Math.exp(-kd * a), vel = d.clone().multiplyScalar(sp * ex).add(new THREE.Vector3(0, q.up * sp * ex * 0.4 - 3.2 * a, 0));
          vel.transformDirection(cam.matrixWorldInverse);
          const rot = Math.atan2(-vel.y, -vel.x) - Math.PI / 2;
          this.sprN.push(p, q.size * grow * (1 + 0.3 * sz), rot, fade, A_DROP, q.col);
        } else {
          const tw = 0.7 + 0.3 * Math.sin(t * 22 + k * 3);
          this.sprA.push(p, q.size * grow * tw * (1 + 0.4 * sz), q.spin * a, fade, k % 3 ? A_STAR : A_TWINK, q.col, 1.5);
        }
      });
    });
  }

  // ------------------------------------------------------------------ debug framing (stills only)
  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    let p: V3, l: V3, fov = 40;
    const o = DEBUG_CAM;
    if (id === 7) {
      if (o === 2) { p = add(STAGE, 2.4, 1.7, 6.6); l = add(PROJ.cart, -0.2, 1.0, -1.0); fov = 40; }
      else if (o === 3) { p = add(STAGE, 0, 2.5, 3.0); l = add(STAGE, 0, 2.55, -2.0); fov = 44; }
      else { p = add(STAGE, 0, 2.0, 7.5); l = add(STAGE, 0, 2.4, -2.2); fov = 44; }
    } else if (id === 2) { p = add(GREECE, 0.7, 1.45, 1.6); l = add(scrollAt(id, Math.min(t, SNEEZE_ARI)).pos, 0.1, 0.1, 0); fov = 44; }
    else if (id === 3) { p = add(ENGLAND, -0.1, 1.35, 0.85); l = add(NOTEBOOK_AT, 0, 0, 0); fov = 36; }
    else if (id === 1 || id === 5 || id === 4) { if (o === 2) return; p = add(STREET, 0.25, 1.3, 1.1); l = add(STREET, 0.15, 1.15, 0); fov = 50; }
    else return;
    cam.position.set(...p); cam.up.set(0, 1, 0); cam.lookAt(...l); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    cam.updateMatrixWorld();
    this.sprN.begin(); this.sprA.begin();
    this.updateBanner(id, t);
    this.updateProjector(id, t);
    this.updateScroll(id, t);
    this.updateBook(id, t);
    this.updateMug(id, t);
    this.updateSun(id, t);
    this.updateBlasts(id, t, cam);
    this.sprN.end(); this.sprA.end();
  }
}
