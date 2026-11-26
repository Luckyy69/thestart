// OWNER: sets. "The Falling Jolt Before Sleep": BEAN's moonlit BEDROOM and the apartment BLOCK at night. All new.
//
// Both sets light themselves with their OWN small shader rig (technique from voice / hiccup sets): ambient (cool from
// above, dim violet from below), painted room AO, up to 12 soft point lights, and
//   BEDROOM: two lights THROUGH THE BIG BACK WINDOW (z -1.4): a low cold MOON (directional, from the back-left, el 28)
//     and a warm STREET LAMP (a point outside, upper right). Per pixel a surface is lit only if its ray toward the light
//     passes the window aperture minus its 3 x 2 glazing bars (penumbra widens with distance), so the moon lays long
//     barred stripes across the duvet / bed front / rug and the lamp a warm barred patch over the pillow + headboard;
//     a soft leafy dapple (a tree outside: the tree you're not in) drifts in the moon patch.
//     A ray-marched haze shaft (NOINK, additive) shows the bars in the air; dust motes glow only in the moonbeam.
//     The DUVET is a live mesh: it lifts, billows and flaps with BEAN's JOLTS (duvetAt) and breathes while he sleeps.
//     In "xray" the whole rig sinks to deep blue (glow-in-the-dark star stickers get brighter).
//   BLOCK: outdoors: the moon key follows the world sun (looks.ts, so the cards' long shadows agree), 10 warm lit
//     window rooms (one point light each), a street lamp, a door lamp; a big moon, stars, rooftops, a cat on the ridge.
// The world's sun shadow map darkens the moon (cards / furniture / lamp post / bike keep their long shadows).
// Side walls / ceiling of the bedroom hide when the camera is outside them (cutaway). Only the set of the current
// shot's place is visible.
//
// CONTRACTS (LOCAL to the place anchor, metres; world = anchor + local):
//   BEDROOM = (0,0,0). Floor y 0, back wall z -1.4 (0.2 thick), side walls x +-2.4, ceiling 2.6, open toward +z
//     (floor to z 4.6).
//     BED (long side on the back wall): frame x -1.12..1.0, z -1.38..0.24; mattress top y 0.55; cloud headboard at
//       x -1.17..-1.07 (top ~1.18), cloud footboard x 0.95..1.05 (top ~0.8).
//     BEAN lies at (0, 0.6, -0.4), head (-0.75, 0.75, -0.4) on the PILLOW (centre (-0.85, 0.635, -0.45), top ~0.725).
//     DUVET (set mesh): x -0.72..0.95, z -1.34..0.24 + a front drape to y ~0.3. Rest top along BEAN (z -0.4):
//       ~0.79 over the torso (x -0.6..0), ~0.74 over the legs, toes bump at x 0.8. Cast: draw BEAN's head/nightcap
//       (+ arms when patting) ABOVE that line; the duvet hides the rest. duvetAt(id,t).lift (m) is the duvet's jolt
//       curve (peak ~0.3 m at jolt + 0.14 s, back by + 0.5 s, small squash to + 0.85 s): lift BEAN ~1.2x with it.
//     WINDOW opening x -0.5..1.0, y 1.05..2.3 (centre (0.25, 1.675, -1.4)); red curtains either side; sill y 1.05.
//     NIGHTSTAND x -1.62..-1.2, z -1.36..-0.92, top 0.6: mushroom lamp (-1.5, 0.6, -1.22), alarm clock "23:47"
//       centre (-1.33, 0.645, -0.98); props: glass of water (-1.45, 0.6, -1.0).
//     Posters (-1.72, 1.72) JUNGLE + monkey, (1.86, 1.8) rocket; shelf y 1.3 x 1.5..2.2; snake plant (1.62, 0, -1.08);
//       dino slippers on the rug (~(-0.3..0.05, 0, 0.6)); oval rug centre (0.1, 0, 1.0) radii 0.95 x 0.6.
//     MOON direction (toward the moon) MOON_DIR = (-0.38, 0.47, -0.8): for cameras looking -z that is sunAz ~ -25,
//       sunEl ~ 28 in looks.ts (recommended for "night" / "xray" so card shadows agree with the window stripes).
//   BLOCK = (0,0,-40). Facade front plane z 0, x -3..3, sidewalk top y 0.12 (z -0.4..2.8), road y 0 beyond z 2.95.
//     Floors k = 0..4 at yk = 0.6 + 2.35 k; window openings x xc +- 0.62, y yk+0.3..yk+1.7, xc = -1.45 / +1.45.
//     WINDOW_POS[i] (i = 2 k + col, col 0 = left, k 0 = bottom): the sleeper's lying spot = mattress top centre
//       (xc, yk + 0.6, -0.75). Pillows at the -x end (heads toward -x like BEAN). Keep sleepers within x xc +- 0.44.
//     BEAN_WINDOW = 4 (middle floor, left): RED curtains. Roof eave 12.65, ridge 15.0; door x -0.55..0.55.
//     Street lamp (3.7, 0.12, 2.3) light ~3.55; red bike x 1.3..2.5, z 2.05; tree (-4.7, 0.12, 1.9); moon up-left.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { BEDROOM, BLOCK, SHOTS, Look, JOLTS, smooth, clamp01, camAt } from "./story";
import { LOOKS } from "./looks";

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export type C3 = [number, number, number];
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ exported contracts (world coordinates)
export const BEAN_BED = add(BEDROOM, 0, 0.6, -0.4);
export const BEAN_HEAD = add(BEDROOM, -0.75, 0.75, -0.4);
export const PILLOW = add(BEDROOM, -0.85, 0.635, -0.45);
export const PILLOW_R: C3 = [0.24, 0.09, 0.5];
export const MATTRESS_TOP = 0.55;
export const ROOM_WINDOW = { c: add(BEDROOM, 0.25, 1.675, -1.4), x0: BEDROOM[0] - 0.5, x1: BEDROOM[0] + 1.0, y0: 1.05, y1: 2.3 };
export const CLOCK = add(BEDROOM, -1.33, 0.645, -0.98);
export const NIGHTSTAND_TOP = add(BEDROOM, -1.41, 0.6, -1.14);
export const MOON_DIR: C3 = (() => { const v = V3(-0.38, 0.47, -0.8).normalize(); return [v.x, v.y, v.z]; })();
const BK = { FW: 3.0, Y0: 0.6, FH: 2.35, XC: [-1.45, 1.45], WW: 0.62, SILL: 0.3, TOP: 1.7, BED: 0.6, BZ: -0.75 };
export const BLOCK_FLOOR_Y = [0, 1, 2, 3, 4].map((k) => BLOCK[1] + BK.Y0 + BK.FH * k);
/** the 10 window sleepers' lying spots (mattress top centre), i = 2 * floor + col (col 0 = left, floor 0 = bottom) */
export const WINDOW_POS: C3[] = Array.from({ length: 10 }, (_, i) => add(BLOCK, BK.XC[i % 2], BK.Y0 + BK.FH * Math.floor(i / 2) + BK.BED, BK.BZ));
/** window opening centres on the facade plane (for the camera) */
export const WINDOW_CENTER: C3[] = Array.from({ length: 10 }, (_, i) => add(BLOCK, BK.XC[i % 2], BK.Y0 + BK.FH * Math.floor(i / 2) + (BK.SILL + BK.TOP) / 2, 0));
export const BEAN_WINDOW = 4;
export const STREET_LAMP = add(BLOCK, 3.7, 3.55, 2.3);

/** BEAN's duvet jolt curve (shared with the cast): 0 -> 1 at +0.14 s, back to 0 at +0.5 s, a small squash to +0.85 s */
export const joltCurve = (d: number) => {
  if (d < 0) return 0;
  if (d < 0.14) { const u = d / 0.14; return 1 - (1 - u) * (1 - u); }
  if (d < 0.5) { const u = (d - 0.14) / 0.36; return 1 - u * u; }
  if (d < 0.85) return -0.12 * Math.sin((Math.PI * (d - 0.5)) / 0.35);
  return 0;
};
/** the duvet (BEDROOM shots 1, 3, 5): lift (m) above rest, flap 0..1 (edge flutter), breathe -1..1 */
export const duvetAt = (id: number, t: number) => {
  let lift = 0, flap = 0;
  if (SHOTS[id - 1].place === "bedroom") for (const [tj, who, s] of JOLTS) {
    if (who !== "bean") continue;
    const d = t - tj + 0.03;
    lift += 0.3 * s * joltCurve(d);
    if (d > 0 && d < 1.1) flap += s * Math.sin(Math.PI * Math.min(1, d / 1.1)) * Math.exp(-d * 2.2);
  }
  return { lift, flap: clamp01(flap), breathe: Math.sin(t * 2.0) };
};

// ============================================================ geometry helpers (vertex colours, merged batches)
const WHITE = new THREE.Color(1, 1, 1);
export const clean = (g: THREE.BufferGeometry, col?: THREE.Color) => {
  const s = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const c = col ?? WHITE, ca = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
export const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => {
  const sc = typeof s === "number" ? V3(s, s, s) : V3(...s);
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
const C = (h?: string) => (h ? new THREE.Color(h) : undefined);
/** box with uvs in metres per face */
const boxM = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i) + cx, Y = p.getY(i) + cy, Z = p.getZ(i) + cz, ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, X, -Z); else if (ax > 0.5) uv.setXY(i, Z, Y); else uv.setXY(i, X, Y);
  }
  g.translate(cx, cy, cz);
  return g;
};
export class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4, col?: string) {
    const c = clean(g, C(col)); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col?: string, mx?: THREE.Matrix4) {
    this.add(boxM(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), mat, mx, col);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4, col?: string, seg = 2) { this.add(new RoundedBoxGeometry(w, h, d, seg, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx, col); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, col?: string, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx, col); }
  lathe(mat: THREE.Material, pts: [number, number][], mx: THREE.Matrix4, seg = 24, col?: string) { this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, mx, col); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 12, col?: string) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx, col); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m, col);
  }
  /** a board from a to b (in a plane containing x), half width hw along x, thickness t */
  slab(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, hw: number, t: number, col?: string) {
    const d = b.clone().sub(a), L = d.length(); d.normalize();
    const X = V3(1, 0, 0), Y = d.clone().cross(X);
    const m = new THREE.Matrix4().makeBasis(X, Y, d).setPosition(a.clone().add(b).multiplyScalar(0.5));
    this.add(boxM(-hw, -t / 2, -L / 2, hw, t / 2, L / 2), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2, rs = 10) { this.add(new THREE.TorusGeometry(R, r, rs, 40, arc), mat, mx, col); }
  build(parent: THREE.Object3D, cast = false) {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      parent.add(mesh); out.push(mesh);
    }
    this.m.clear();
    return out;
  }
}
const flat = (x0: number, z0: number, x1: number, z1: number, y: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
  return g;
};
/** a vertical wall at z = z0 from x0..x1, y0..y1 minus rect holes [xa, xb, ya, yb]; uv in metres */
const wallZ = (x0: number, x1: number, y0: number, y1: number, z0: number, holes: number[][] = []) => {
  const xs = [x0, x1, ...holes.flatMap((h) => [h[0], h[1]])].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b);
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]; if (b - a < 1e-4) continue;
    const mid = (a + b) / 2, cut = holes.filter((h) => mid > h[0] && mid < h[1]).map((h) => [h[2], h[3]]).sort((p, q) => p[0] - q[0]);
    let y = y0;
    const seg = (ya: number, yb: number) => { if (yb - ya < 1e-4) return; for (const [x, yy] of [[a, ya], [b, ya], [b, yb], [a, ya], [b, yb], [a, yb]]) { pos.push(x, yy, z0); uv.push(x, yy); } };
    for (const [ha, hb] of cut) { seg(y, Math.min(y1, Math.max(y, ha))); y = Math.max(y, hb); }
    seg(y, y1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
/** a hanging drape: vertical folds (facing +z), top edge at y=0 going down to -h, width w, gathered at `tie` (0..1) */
const drape = (w: number, h: number, folds: number, amp: number, seed: number, tie = 0.62) => {
  const g = new THREE.PlaneGeometry(w, h, Math.max(8, folds * 8), 10), p = g.getAttribute("position") as THREE.BufferAttribute, r = rng(seed);
  const ph = r() * 6.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), v = (h / 2 - y) / h;
    const gather = 1 - 0.42 * Math.exp(-(((v - tie) / 0.16) ** 2)) - 0.12 * Math.min(1, v / tie);
    p.setXYZ(i, x * gather, y - h / 2, amp * (0.55 + 0.45 * v) * Math.sin((x / w) * folds * Math.PI * 2 + ph + v * 0.6));
  }
  g.computeVertexNormals();
  return g;
};

// ============================================================ the light shader (own rig)
const NL = 12;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform float uOpen; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform vec3 uKP; uniform vec3 uKC; uniform float uTT; uniform vec3 uO; uniform vec4 uBox; uniform float uAO;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// a light arriving along d (unit, toward the light) through the window aperture minus its glazing bars, 0..1
float apK(vec3 p, vec3 d, float leaf){
  float den = dot(d, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + d * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.002 + 0.006 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float e = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float e = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (leaf > 0.0 && uWM.w > 0.0) { // the tree outside: a soft leafy dapple in the upper-left of the window, swaying
    vec2 s = a * 2.3 + vec2(sin(uTT * 0.33), cos(uTT * 0.27)) * 0.07;
    float nz = tn2(s + 11.0) * 0.62 + tn2(s * 2.7 + 5.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.5, 0.7 + pen * 2.0, nz) * smoothstep(-0.1, 0.6, a.y / uWH.y - 0.35 * a.x / uWH.x);
  }
  return k;
}
float sunK(vec3 p, float leaf){ return uOpen > 0.5 ? 1.0 : apK(p, uSD, leaf); }
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(uBox.x - abs(l.x), l.z - uBox.y), uBox.z - l.y);
  float a = smoothstep(0.0, 0.6, dw) * 0.45 + 0.55;
  float b = smoothstep(0.0, 0.32, l.y) * 0.3 + 0.7;
  float k = min(a, 1.0) * (l.y > 0.004 ? b : 1.0);
  return mix(1.0, k, uAO);
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.7 + 0.3 * sh) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.75 + 0.25 * sh) * (0.5 + 0.5 * ao);
  }
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = sunK(p, 1.0); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * (0.2 + 0.8 * sh); }
  if (uKC.x + uKC.y + uKC.z > 0.001) {
    vec3 d = uKP - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6)); float nl = dot(n, l);
    if (nl > 0.0) L += uKC * smoothstep(0.0, 0.25, nl) * apK(p, l, 0.0) / (1.0 + 0.05 * r2);
  }
  return L;
}`;
const VS = /* glsl */ `#include <common>
#include <shadowmap_pars_vertex>
attribute vec3 color;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
void main(){
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vC = color;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform vec3 uSelf; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep;
#if defined(HAS_MAP) || defined(EMAP)
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${CORE}
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  float sh = getShadowMask();
  vec2 uv = vUv * uRep;
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, uv);
#endif
  vec3 c = uCol * vC * tx.rgb * (lightAt(vW, n, sh) + uSelf) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm;
#endif
#ifdef SPEC
  vec3 v = normalize(cameraPosition - vW);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW, 0.0) * uSpecK * 1.4 * sh;
#endif
  gl_FragColor = vec4(c, 1.0);
}`;
export type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uOpen: { value: 0 }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(0, 0, 1) },
      uWU: { value: V3(1, 0, 0) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(1, 1, 0.02, 0) },
      uKP: { value: V3(0, -999, 0) }, uKC: { value: V3(0, 0, 0) },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 1 },
    },
  };
};
type LDef = { p: THREE.Vector3; c: C3; r: number };
const setLights = (S: LSet, L: LDef[], au: C3, ad: C3) => {
  for (let i = 0; i < NL; i++) {
    const l = L[i];
    if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); }
  }
  (S.u.uAU.value as THREE.Vector3).set(...au); (S.u.uAD.value as THREE.Vector3).set(...ad);
};
export type MOpt = { col?: string; map?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number] };
export const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V3(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};
/** the bedroom rig most recently built (props.ts builds its bed props on it, right after Sets in the same World) */
let lastRoomS: LSet | null = null;
export const roomRig = () => lastRoomS ?? (lastRoomS = lset());

// ============================================================ volumetrics + glows (NOINK, additive)
/** ray-marched haze inside the window prism: the bars show in the moonbeam */
class Haze {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uInv: { value: new THREE.Matrix3() }, uCen: { value: V3(0, 0, 0) }, uHC: { value: V3(1, 1, 1) }, uK: { value: 0 }, uFloor: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uHC; uniform float uK; uniform float uFloor; varying vec3 vW;
        ${CORE}
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          vec3 rl = uInv * rd + vec3(1e-6); vec3 cl = uInv * (cameraPosition - uCen); vec3 pl = uInv * (vW - uCen);
          bool inside = all(lessThan(abs(cl), vec3(0.5)));
          if (gl_FrontFacing == inside) { gl_FragColor = vec4(0.0); return; }
          vec3 te = (sign(rl) * 0.5 - pl) / rl; float tB = max(min(min(te.x, te.y), te.z), 0.0);
          vec3 p0 = vW;
          if (inside) { p0 = cameraPosition; tB = length(vW - cameraPosition); }
          float acc = 0.0; float dt = tB / 22.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 22; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (p.y < uFloor + 0.01) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.5, 1.0, along));
            float nz = 0.6 + 0.4 * tn2(p.xz * 2.1 + vec2(p.y * 1.9, uTT * 0.07));
            acc += apK(p, uSD, 1.0) * fall * nz * smoothstep(0.4, 1.3, length(p - cameraPosition));
          }
          acc *= dt * uK;
          gl_FragColor = vec4(uHC * acc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  /** window centre c (LOCAL), axes U V, half sizes hx hy, travel dir d (unit, into the room), length len; O = set origin */
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, hx: number, hy: number, d: THREE.Vector3, len: number, col: C3, k: number, O: THREE.Vector3) {
    const a = U.clone().multiplyScalar(2 * hx + 0.06), b = Vv.clone().multiplyScalar(2 * hy + 0.06), e = d.clone().multiplyScalar(len);
    const cen = c.clone().addScaledVector(d, len / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    (this.mat.uniforms.uInv.value as THREE.Matrix3).setFromMatrix4(m).invert();
    (this.mat.uniforms.uCen.value as THREE.Vector3).copy(cen).add(O);
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(...col); this.mat.uniforms.uK.value = k; this.mat.uniforms.uFloor.value = O.y;
    this.mesh.visible = k > 0.002;
  }
}
/** dust motes: glow only inside the moonbeam */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.0035 + 0.0065 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.15 + sin(uT * 0.09 + ph * 3.0) * 0.06,
            sin(uT * 0.15 * sp + ph * 2.0) * 0.12, cos(uT * 0.19 * sp + ph * 1.3) * 0.15);
          vec3 L = uSC * apK(p, uSD, 0.0) * 0.8 + (uAU + uAD) * 0.03;
          float tw = 0.6 + 0.4 * sin(uT * (1.3 + 2.2 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.7, 1.5, dist) / max(1.0, dist * 0.2);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}
export type GlowItem = { p: THREE.Vector3; c: C3; s: number; g: number; tw?: number };
/** soft round glows: camera-facing additive billboards; per-glow colour, size, group (4 groups, gk) and twinkle */
export class Glows {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; gk = new THREE.Vector4(1, 1, 1, 1);
  constructor(parent: THREE.Object3D, items: GlowItem[], near = 0.5) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(), n = items.length;
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const P = new Float32Array(n * 4), Cc = new Float32Array(n * 4);
    items.forEach((it, i) => { P.set([it.p.x, it.p.y, it.p.z, it.s], i * 4); Cc.set([...it.c, it.g + (it.tw ?? 0) * 0.1], i * 4); });
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iC", new THREE.InstancedBufferAttribute(Cc, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uG: { value: this.gk }, uT: { value: 0 }, uNear: { value: near } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iC; uniform vec4 uG; uniform float uT; uniform float uNear; varying vec3 vC; varying vec2 vQ;
        void main(){
          vec3 p = (modelMatrix * vec4(iP.xyz, 1.0)).xyz;
          float gi = floor(iC.w + 0.01), tw = (iC.w - gi) * 10.0;
          float k = gi < 0.5 ? uG.x : gi < 1.5 ? uG.y : gi < 2.5 ? uG.z : uG.w;
          k *= 1.0 + tw * 0.35 * sin(uT * (2.1 + fract(p.x * 7.3) * 2.0) + p.x * 31.0 + p.y * 17.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = p + (right * position.x + up * position.y) * iP.w;
          float dist = length(cameraPosition - p);
          vQ = position.xy * 2.0; vC = iC.rgb * k * smoothstep(uNear, uNear * 2.4, dist);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 9.0) * 0.8 + exp(-r2 * 3.0) * 0.25; a *= 1.0 - smoothstep(0.8, 1.0, r2); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 7; parent.add(this.mesh);
  }
}

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#2a2a2a", align: CanvasTextAlign = "center", weight = "bold") => {
  g.font = `${weight} ${Math.max(6, Math.round(px))}px ${FONT}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const otxt = (g: G, s: string, x: number, y: number, px: number, col: string, ink: string, lw: number) => {
  g.font = `bold ${Math.round(px)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.strokeStyle = ink; g.lineWidth = lw; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W2: number, H: number) => {
  for (const ox of [-W2, 0, W2]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W2 || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const star = (g: G, x: number, y: number, R: number, r0: number, n = 5, rot = -Math.PI / 2) => { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = rot + (i * Math.PI) / n, rr = i % 2 ? r0 : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
const crescent = (g: G, x: number, y: number, R: number, col: string, bg: string) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); g.fillStyle = bg; g.beginPath(); g.arc(x + R * 0.45, y - R * 0.25, R * 0.85, 0, 7); g.fill(); };

// ---------------- BEDROOM textures
/** wallpaper: soft periwinkle / lavender wide stripes with little gold crescents + stars, 0.8 m tile */
const wallTex = () => ctex("jeWallStripes", 1024, 1024, (g, r) => {
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#a4aef0" : "#b6b4f2"; g.fillRect(k * 128, 0, 128, 1024); }
  for (let k = 0; k < 8; k++) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(k * 128 + 2, 0, 3, 1024); g.fillStyle = "rgba(60,60,140,0.12)"; g.fillRect(k * 128 + 124, 0, 4, 1024); }
  for (let i = 0; i < 120; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 140, r() < 0.5 ? "220,220,255" : "120,120,200", 0.07, 1024, 1024);
  for (let j = 0; j < 6; j++) for (let k = 0; k < 8; k++) {
    const x = k * 128 + 64, y = j * 171 + (k % 2 ? 85 : 0) + 40, bg = k % 2 ? "#a4aef0" : "#b6b4f2";
    if ((j + k) % 2 === 0) crescent(g, x, y, 15, "#ffd970", bg);
    else { g.fillStyle = "#fff3c8"; star(g, x, y, 9, 3.8); g.fill(); }
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** wide caramel floorboards, 1.2 m tile */
const floorTex = () => ctex("jeFloorboards", 1024, 1024, (g, r) => {
  const bw = 1024 / 6;
  for (let i = 0; i < 6; i++) {
    let y = -r() * 700;
    while (y < 1024) {
      const L = 420 + r() * 600, l = 0.85 + r() * 0.2, h = 26 + r() * 8;
      g.fillStyle = `hsl(${h},${48 + r() * 10}%,${Math.round(52 * l)}%)`; g.fillRect(i * bw, y, bw, L);
      for (let k = 0; k < 16; k++) {
        g.strokeStyle = `rgba(110,60,25,${0.05 + r() * 0.1})`; g.lineWidth = 1 + r() * 2.5; g.beginPath();
        const x0 = i * bw + 6 + r() * (bw - 12); g.moveTo(x0, y); for (let s = 0; s <= 8; s++) g.lineTo(x0 + Math.sin(s * 0.8 + r() * 3) * 3, y + (s * L) / 8); g.stroke();
      }
      if (r() < 0.4) { g.fillStyle = "rgba(100,55,20,0.28)"; g.beginPath(); g.ellipse(i * bw + 24 + r() * (bw - 48), y + r() * L, 6 + r() * 6, 12 + r() * 9, 0, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,225,180,0.16)"; g.fillRect(i * bw + 3, y, 4, L);
      g.fillStyle = "rgba(60,30,12,0.6)"; g.fillRect(i * bw, y, bw, 3);
      y += L;
    }
    g.fillStyle = "rgba(50,25,10,0.65)"; g.fillRect(i * bw, 0, 3, 1024);
  }
  noise(g, 0, 0, 1024, 1024, r, 16000, 0.03);
});
/** oval rug: coral with a cream zig-zag border, mustard dots and a crescent */
const rugTex = () => ctex("jeRugOval", 1024, 1024, (g, r) => {
  g.fillStyle = "#ff6f6a"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#f8ead0"; g.beginPath(); g.arc(512, 512, 505, 0, 7); g.fill();
  g.fillStyle = "#ff6f6a"; g.beginPath(); g.arc(512, 512, 455, 0, 7); g.fill();
  g.strokeStyle = "#f8ead0"; g.lineWidth = 16; g.beginPath();
  for (let k = 0; k <= 72; k++) { const a = (k / 72) * Math.PI * 2, rr = k % 2 ? 400 : 432; g.lineTo(512 + Math.cos(a) * rr, 512 + Math.sin(a) * rr); }
  g.stroke();
  g.fillStyle = "#e8505a"; g.beginPath(); g.arc(512, 512, 330, 0, 7); g.fill();
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; g.fillStyle = "#ffc94a"; g.beginPath(); g.arc(512 + Math.cos(a) * 240, 512 + Math.sin(a) * 240, 26, 0, 7); g.fill(); }
  crescent(g, 512, 512, 110, "#ffc94a", "#e8505a");
  for (let k = 0; k < 9000; k++) { const a = r() * 6.28, d = r() * 505; g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "70,20,20"},0.06)`; g.fillRect(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 2, 4); }
});
/** BEAN's duvet (whole duvet, 2048): warm sunflower yellow, white stars, navy rings, a white cuff with red stripes at
 *  the head end (u < 0.11) and a scalloped navy hem along the front drape (v < 0.14) */
const duvetTex = () => ctex("jeDuvetSun", 2048, 2048, (g, r) => {
  g.fillStyle = "#ffbf3c"; g.fillRect(0, 0, 2048, 2048);
  for (let i = 0; i < 26; i++) for (let j = 0; j < 26; j++) if ((i + j) % 2 === 0) { g.fillStyle = "rgba(255,150,40,0.22)"; g.fillRect(i * 80, j * 80, 80, 80); }
  const rr = rng(5);
  for (let k = 0; k < 70; k++) {
    const x = 240 + rr() * 1800, y = rr() * 1700;
    if (k % 3 === 0) { g.strokeStyle = "#2c3f8f"; g.lineWidth = 9; g.beginPath(); g.arc(x, y, 22, 0, 7); g.stroke(); }
    else { g.fillStyle = "#ffffff"; g.strokeStyle = "#e07a1a"; g.lineWidth = 4; star(g, x, y, 30, 13, 5, -Math.PI / 2 + rr()); g.fill(); g.stroke(); }
  }
  for (let k = 0; k < 400; k++) blot(g, r() * 2048, r() * 2048, 40 + r() * 80, "180,90,20", 0.05, 2048, 2048);
  g.strokeStyle = "rgba(170,90,20,0.35)"; g.lineWidth = 5; g.setLineDash([18, 12]);
  for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(225 + k * 300, 0); g.lineTo(225 + k * 300, 1700); g.stroke(); }
  for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(225, k * 340); g.lineTo(2048, k * 340); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 225, 2048);
  for (const x of [60, 120, 180]) { g.fillStyle = "#e8343c"; g.fillRect(x, 0, 18, 2048); }
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(218, 0, 10, 2048);
  g.fillStyle = "#2c3f8f"; g.fillRect(0, 1760, 2048, 288);
  g.fillStyle = "#ffbf3c"; for (let x = 0; x < 2048; x += 64) { g.beginPath(); g.arc(x + 32, 1760, 32, 0, Math.PI); g.fill(); }
  for (let x = 0; x < 2048; x += 128) { g.fillStyle = "#fff3c8"; star(g, x + 64, 1900, 18, 8); g.fill(); }
  noise(g, 0, 0, 2048, 2048, r, 26000, 0.03);
});
const pillowTex = () => ctex("jePillowStripe", 512, 512, (g, r) => {
  g.fillStyle = "#fbf7ee"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 16; k++) { g.fillStyle = k % 4 === 0 ? "rgba(90,140,230,0.55)" : "rgba(90,140,230,0.2)"; g.fillRect(0, k * 32, 512, k % 4 === 0 ? 8 : 4); }
  noise(g, 0, 0, 512, 512, r, 4000, 0.03);
});
/** JUNGLE poster: sunset, palms, a cheeky monkey hanging from a vine by one hand (the twist, foreshadowed) */
const junglePosterTex = () => ctex("jePosterJungle", 512, 704, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 704); gr.addColorStop(0, "#ff7a4a"); gr.addColorStop(0.55, "#ffc15a"); gr.addColorStop(1, "#ffe8a0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 704);
  g.fillStyle = "#fff4c8"; g.beginPath(); g.arc(256, 420, 120, 0, 7); g.fill();
  g.fillStyle = "#2f7a46";
  for (const x of [60, 450]) {
    g.fillRect(x - 10, 360, 20, 344);
    for (let k = 0; k < 6; k++) { g.save(); g.translate(x, 365); g.rotate(-1.4 + k * 0.55); g.beginPath(); g.ellipse(70, 0, 80, 20, 0, 0, 7); g.fill(); g.restore(); }
  }
  g.fillStyle = "#1f5a34"; for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(r() * 512, 640 + r() * 60, 60 + r() * 40, 30, 0, 0, 7); g.fill(); }
  g.strokeStyle = "#3a6a2a"; g.lineWidth = 10; g.beginPath(); g.moveTo(330, 0); g.bezierCurveTo(320, 80, 290, 150, 300, 210); g.stroke();
  g.fillStyle = "#3a6a2a"; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(325 - k * 6, 30 + k * 38, 16, 8, 0.6 * (k % 2 ? 1 : -1), 0, 7); g.fill(); }
  g.strokeStyle = "#5a3418"; g.lineWidth = 16; g.lineCap = "round";
  g.beginPath(); g.moveTo(300, 210); g.lineTo(285, 270); g.stroke();
  g.fillStyle = "#7a4a22"; g.beginPath(); g.ellipse(270, 320, 52, 62, 0.15, 0, 7); g.fill();
  g.beginPath(); g.arc(262, 250, 46, 0, 7); g.fill();
  g.fillStyle = "#f2c89a"; g.beginPath(); g.ellipse(258, 262, 30, 24, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(214, 244, 14, 0, 7); g.arc(310, 244, 14, 0, 7); g.fill();
  g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(246, 248, 6, 0, 7); g.arc(272, 248, 6, 0, 7); g.fill();
  g.strokeStyle = "#2a1a10"; g.lineWidth = 4; g.beginPath(); g.arc(259, 266, 10, 0.2, Math.PI - 0.2); g.stroke();
  g.strokeStyle = "#5a3418"; g.lineWidth = 14; g.beginPath(); g.moveTo(240, 360); g.quadraticCurveTo(210, 420, 240, 440); g.moveTo(296, 360); g.quadraticCurveTo(320, 420, 300, 450); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.moveTo(310, 340); g.bezierCurveTo(380, 360, 380, 420, 350, 430); g.stroke();
  otxt(g, "JUNGLE", 256, 76, 92, "#fff4c8", "#5a1e14", 14);
  txt(g, "LAND OF THE ANCESTORS", 256, 140, 26, "#5a1e14");
  noise(g, 0, 0, 512, 704, r, 6000, 0.04);
  g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 3; g.beginPath(); g.moveTo(16, 688); g.lineTo(60, 644); g.stroke();
});
/** rocket poster: navy, a red rocket going to the moon */
const rocketPosterTex = () => ctex("jePosterRocket", 512, 704, (g, r) => {
  g.fillStyle = "#1e2a6a"; g.fillRect(0, 0, 512, 704);
  for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(255,250,220,${0.4 + r() * 0.6})`; g.beginPath(); g.arc(r() * 512, r() * 704, 1 + r() * 3, 0, 7); g.fill(); }
  g.fillStyle = "#fff1b8"; g.beginPath(); g.arc(380, 150, 90, 0, 7); g.fill();
  g.fillStyle = "rgba(220,200,140,0.6)"; for (const [x, y, s] of [[350, 120, 18], [410, 175, 12], [395, 110, 9], [345, 190, 10]]) { g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
  g.save(); g.translate(190, 450); g.rotate(0.45);
  g.fillStyle = "#ff8a2a"; g.beginPath(); g.moveTo(-30, 120); g.lineTo(0, 200); g.lineTo(30, 120); g.fill();
  g.fillStyle = "#ffd84a"; g.beginPath(); g.moveTo(-16, 120); g.lineTo(0, 165); g.lineTo(16, 120); g.fill();
  g.fillStyle = "#e8343c"; g.beginPath(); g.moveTo(-50, 70); g.lineTo(-90, 130); g.lineTo(-40, 120); g.fill(); g.beginPath(); g.moveTo(50, 70); g.lineTo(90, 130); g.lineTo(40, 120); g.fill();
  g.fillStyle = "#f4f0e6"; g.beginPath(); g.moveTo(0, -150); g.bezierCurveTo(70, -80, 60, 60, 45, 125); g.lineTo(-45, 125); g.bezierCurveTo(-60, 60, -70, -80, 0, -150); g.fill();
  g.fillStyle = "#e8343c"; g.beginPath(); g.moveTo(0, -150); g.bezierCurveTo(30, -120, 40, -95, 44, -80); g.lineTo(-44, -80); g.bezierCurveTo(-40, -95, -30, -120, 0, -150); g.fill();
  g.fillStyle = "#5ac8f0"; g.strokeStyle = "#1e2a6a"; g.lineWidth = 8; g.beginPath(); g.arc(0, -20, 24, 0, 7); g.fill(); g.stroke();
  g.restore();
  otxt(g, "TO THE", 256, 560, 48, "#ffd84a", "#0e1440", 8); otxt(g, "MOON!", 256, 630, 88, "#ffffff", "#0e1440", 12);
  noise(g, 0, 0, 512, 704, r, 6000, 0.04);
});
/** the clock's LED face: red "23:47" with a faint "88:88" ghost */
const clockTex = () => ctex("jeClock2347", 512, 256, (g) => {
  g.fillStyle = "#120406"; g.fillRect(0, 0, 512, 256);
  g.font = `bold 150px 'DejaVu Sans Mono', monospace`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(255,40,30,0.08)"; g.fillText("88:88", 256, 132);
  g.shadowColor = "rgba(255,60,40,0.9)"; g.shadowBlur = 18; g.fillStyle = "#ff3a2a"; g.fillText("23:47", 256, 132);
  g.shadowBlur = 0; g.fillStyle = "#ff3a2a"; g.beginPath(); g.arc(30, 40, 8, 0, 7); g.fill();
});
/** night view out of BEAN's window: deep sky, stars, a soft moon glow (upper left), lilac-blue rooftops + chimneys, a
 *  few warm lit windows, a TREE silhouette on the left (its leaves dapple the moonbeam), the street lamp glow (right) */
const viewTex = () => ctex("jeNightView", 1024, 768, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 768);
  gr.addColorStop(0, "#0c1440"); gr.addColorStop(0.45, "#1c2c6c"); gr.addColorStop(0.8, "#34489a"); gr.addColorStop(1, "#4a5cae");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 768);
  const mg = g.createRadialGradient(150, 60, 10, 150, 60, 420); mg.addColorStop(0, "rgba(200,220,255,0.55)"); mg.addColorStop(1, "rgba(200,220,255,0)"); g.fillStyle = mg; g.fillRect(0, 0, 1024, 768);
  for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(255,250,230,${0.3 + r() * 0.7})`; const s = r() < 0.08 ? 3 : 1.4; g.beginPath(); g.arc(r() * 1024, r() * 420, s, 0, 7); g.fill(); }
  for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(170,190,255,0.16)"; rrect(g, r() * 900, 100 + r() * 220, 140 + r() * 200, 16, 8); g.fill(); }
  const lg = g.createRadialGradient(1000, 520, 10, 1000, 520, 380); lg.addColorStop(0, "rgba(255,190,110,0.85)"); lg.addColorStop(0.3, "rgba(255,160,90,0.35)"); lg.addColorStop(1, "rgba(255,150,80,0)");
  g.fillStyle = lg; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = "#3a3f86"; g.beginPath(); g.moveTo(0, 768);
  let x = 0; while (x < 1024) { const w = 90 + r() * 110, h = 470 + r() * 70; g.lineTo(x, h); g.lineTo(x + w * 0.5, h - 40 - r() * 30); g.lineTo(x + w, h); if (r() < 0.5) { g.lineTo(x + w - 20, h - 8); g.lineTo(x + w - 20, h - 60); g.lineTo(x + w - 4, h - 60); g.lineTo(x + w - 4, h); } x += w; }
  g.lineTo(1024, 768); g.fill();
  g.fillStyle = "#2a2c66"; g.beginPath(); g.moveTo(0, 768); x = -30;
  while (x < 1024) { const w = 150 + r() * 120, h = 590 + r() * 40; g.lineTo(x, h); g.lineTo(x + w * 0.5, h - 80); g.lineTo(x + w, h); x += w; }
  g.lineTo(1024, 768); g.fill();
  for (let k = 0; k < 12; k++) { g.fillStyle = r() < 0.7 ? "rgba(255,200,110,0.95)" : "rgba(150,200,255,0.8)"; g.fillRect(40 + r() * 940, 610 + r() * 130, 14, 18); }
  g.fillStyle = "#14183e";
  for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(30 + r() * 230, 20 + r() * 330, 40 + r() * 55, 0, 7); g.fill(); }
  g.fillRect(120, 300, 30, 470);
});

// ---------------- BLOCK textures
/** warm peach stucco with soft patches, 2 m tile */
const stuccoTex = () => ctex("jeStuccoPeach", 1024, 1024, (g, r) => {
  g.fillStyle = "#f2b08a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 220; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 160, r() < 0.5 ? "255,214,180" : "214,140,110", 0.09, 1024, 1024);
  for (let i = 0; i < 30; i++) { g.strokeStyle = "rgba(150,80,60,0.12)"; g.lineWidth = 1.5; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 40; y += r() * 30; g.lineTo(x, y); } g.stroke(); }
  noise(g, 0, 0, 1024, 1024, r, 22000, 0.04);
});
/** slate roof tiles (scalloped), 2 m tile */
const slateTex = () => ctex("jeSlateScallop", 1024, 1024, (g, r) => {
  g.fillStyle = "#3e4a7a"; g.fillRect(0, 0, 1024, 1024);
  const w = 64, h = 48;
  for (let j = 0; j < 1024 / h + 1; j++) for (let i = -1; i < 1024 / w + 1; i++) {
    const x = i * w + (j % 2 ? w / 2 : 0), y = j * h;
    g.fillStyle = `hsl(${226 + r() * 14},${26 + r() * 10}%,${30 + r() * 10}%)`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + h * 0.6); g.arc(x + w / 2, y + h * 0.6, w / 2, 0, Math.PI); g.closePath(); g.fill();
    g.strokeStyle = "rgba(10,14,40,0.55)"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "rgba(200,210,255,0.12)"; g.fillRect(x + 4, y + 2, w - 8, 4);
  }
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.04);
});
const pavingTex = () => ctex("jePavingSlabs", 1024, 1024, (g, r) => {
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    g.fillStyle = `hsl(${222 + r() * 10},${8 + r() * 6}%,${58 + r() * 8}%)`; g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 600; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,60,0.12)" : "rgba(255,255,255,0.1)"; g.fillRect(i * 256 + r() * 256, j * 256 + r() * 256, 2 + r() * 3, 2 + r() * 3); }
  }
  g.strokeStyle = "rgba(30,30,50,0.55)"; g.lineWidth = 6; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, 1024); g.moveTo(0, k * 256); g.lineTo(1024, k * 256); g.stroke(); }
});
const asphaltTex = () => ctex("jeAsphaltNight", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a4e66"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 140, r() < 0.5 ? "90,94,120" : "40,42,60", 0.12, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 40000, 0.06);
  for (let i = 0; i < 8; i++) { g.strokeStyle = "rgba(20,20,30,0.35)"; g.lineWidth = 2; g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; g.lineTo(x, y); } g.stroke(); }
});
const brickTex = (key: string, base: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = "#5a5470"; g.fillRect(0, 0, 1024, 1024);
  const bw = 128, bh = 48;
  for (let j = 0; j < 1024 / bh + 1; j++) for (let i = -1; i < 1024 / bw + 1; i++) {
    const x = i * bw + (j % 2 ? bw / 2 : 0); const c = new THREE.Color(base); c.offsetHSL((r() - 0.5) * 0.02, (r() - 0.5) * 0.1, (r() - 0.5) * 0.08);
    g.fillStyle = "#" + c.getHexString(); g.fillRect(x + 3, j * bh + 3, bw - 6, bh - 6);
    g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 3, j * bh + 3, bw - 6, 5);
  }
  noise(g, 0, 0, 1024, 1024, r, 20000, 0.05);
});
/** a dark neighbour window: deep navy glass, a moonlit diagonal sheen, a drawn blind */
const darkWinTex = () => ctex("jeDarkWin", 256, 320, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 320); gr.addColorStop(0, "#2a3a7a"); gr.addColorStop(1, "#0e1434"); g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "rgba(160,190,255,0.16)"; g.beginPath(); g.moveTo(0, 200); g.lineTo(0, 120); g.lineTo(256, 0); g.lineTo(256, 80); g.fill();
  g.fillStyle = "rgba(20,24,60,0.7)"; g.fillRect(0, 0, 256, 90); for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, k * 15, 256, 3); }
});
const moonTex = () => ctex("jeMoonFace", 512, 512, (g) => {
  const hg = g.createRadialGradient(256, 256, 120, 256, 256, 256); hg.addColorStop(0, "rgba(200,220,255,0.55)"); hg.addColorStop(0.4, "rgba(170,200,255,0.18)"); hg.addColorStop(1, "rgba(150,180,255,0)");
  g.fillStyle = hg; g.fillRect(0, 0, 512, 512);
  const mg = g.createRadialGradient(230, 230, 20, 256, 256, 128); mg.addColorStop(0, "#fffbea"); mg.addColorStop(1, "#f2e6c0");
  g.fillStyle = mg; g.beginPath(); g.arc(256, 256, 124, 0, 7); g.fill();
  for (const [x, y, s] of [[220, 210, 26], [300, 260, 18], [250, 310, 22], [300, 190, 12], [200, 280, 10], [330, 320, 9]]) {
    g.fillStyle = "rgba(200,185,140,0.55)"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,240,0.4)"; g.beginPath(); g.arc(x - s * 0.2, y - s * 0.2, s * 0.7, 0, 7); g.fill();
  }
});
const skylineTex = () => ctex("jeSkylineFar", 2048, 512, (g, r) => {
  g.clearRect(0, 0, 2048, 512);
  g.fillStyle = "#28306a"; let x = 0;
  while (x < 2048) {
    const w = 80 + r() * 160, h = 200 + r() * 260; g.fillRect(x, 512 - h, w, h);
    if (r() < 0.4) { g.beginPath(); g.moveTo(x - 6, 512 - h); g.lineTo(x + w / 2, 512 - h - 50); g.lineTo(x + w + 6, 512 - h); g.fill(); }
    if (r() < 0.3) g.fillRect(x + w * 0.7, 512 - h - 40, 16, 40);
    for (let k = 0; k < 6; k++) if (r() < 0.25) { g.fillStyle = "rgba(255,196,110,0.9)"; g.fillRect(x + 10 + r() * (w - 24), 512 - h + 20 + r() * (h - 40), 10, 13); g.fillStyle = "#28306a"; }
    x += w + 4;
  }
});
const plaqueTex = () => ctex("jePlaque12", 256, 160, (g) => { g.fillStyle = "#1e5a8a"; rrect(g, 4, 4, 248, 152, 20); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 8; rrect(g, 16, 16, 224, 128, 14); g.stroke(); txt(g, "12", 128, 84, 96, "#ffffff"); });

// ============================================================ rigs per look
type RoomRig = { au: C3; ad: C3; moon: C3; lamp: C3; patchB: C3; winB: C3; fill: C3; warmB: C3; clock: number; view: number; haze: number; hazeC: C3; motes: number; stars: number; lampEm: number };
const ROOM_RIGS: Partial<Record<Look, RoomRig>> = {
  night: {
    au: [0.15, 0.19, 0.38], ad: [0.09, 0.08, 0.17], moon: [1.65, 1.95, 2.7], lamp: [3.0, 1.75, 0.7], patchB: [0.16, 0.2, 0.32], winB: [0.12, 0.16, 0.32],
    fill: [0.08, 0.1, 0.2], warmB: [0.2, 0.11, 0.045], clock: 1.0, view: 1.0, haze: 0.26, hazeC: [0.55, 0.7, 1.1], motes: 1.2, stars: 0.5, lampEm: 0.06,
  },
  xray: {
    au: [0.035, 0.07, 0.19], ad: [0.015, 0.03, 0.08], moon: [0.3, 0.55, 1.35], lamp: [0.12, 0.2, 0.55], patchB: [0.03, 0.07, 0.18], winB: [0.04, 0.09, 0.26],
    fill: [0.03, 0.06, 0.16], warmB: [0, 0, 0], clock: 0.6, view: 0.35, haze: 0.16, hazeC: [0.3, 0.55, 1.2], motes: 0.8, stars: 1.2, lampEm: 0,
  },
};

// ============================================================ the BEDROOM
const RX = 2.4, RZ = -1.4, RY = 2.6, RZF = 4.6, WT = 0.2;
const WIN = { x0: -0.5, x1: 1.0, y0: 1.05, y1: 2.3 };
const WFR = 0.045, WPZ = RZ - 0.11;           // glazing frame width, glazing plane
const LAMP_OUT = V3(2.7, 3.6, -3.4);          // the street lamp outside (its light lands on the pillow + headboard)
const DUV = { xa: -0.72, xb: 0.95, za: -1.34, zb: 0.24, nu: 64, nv: 46, drape: 0.3 };
class Room {
  root = new THREE.Group(); S: LSet;
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  viewMat!: THREE.ShaderMaterial; clockMat!: THREE.ShaderMaterial; starMat!: THREE.ShaderMaterial; lampMat!: THREE.ShaderMaterial;
  duvet!: THREE.Mesh;
  haze: Haze; motes: Motes; glows!: Glows;
  constructor() {
    this.S = lset(); lastRoomS = this.S;
    const R = this.root, S = this.S;
    R.position.set(...BEDROOM);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat();
    const floor = imat(S, { map: floorTex(), rep: [1 / 1.2, 1 / 1.2], spec: 30, specK: 0.22 });
    const paper = imat(S, { map: wallTex(), rep: [1 / 0.8, 1 / 0.8] });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.45 }), metal = imat(S, { spec: 90, specK: 0.9 });
    const wood = imat(S, { map: floorTex(), rep: [1 / 0.6, 1 / 0.6], spec: 40, specK: 0.25 });
    const ceilM = imat(S, { col: "#e8e6f6" });
    const TRIM = "#fbf6ee", ORANGE = "#ff8a3c", RED = "#e2323a", MINT = "#5fd0b0", GOLD = "#e8b23a";
    // ---- floor, back wall (4 thick boxes round the window), side walls, ceiling, skirting, cornice ----
    b.add(flat(-RX, RZ, RX, RZF, 0), floor);
    b.box(paper, -RX, 0, RZ - WT, WIN.x0, RY, RZ); b.box(paper, WIN.x1, 0, RZ - WT, RX, RY, RZ);
    b.box(paper, WIN.x0, 0, RZ - WT, WIN.x1, WIN.y0, RZ); b.box(paper, WIN.x0, WIN.y1, RZ - WT, WIN.x1, RY, RZ);
    bn.add(wallZ(RZ, RZF, 0, RY, 0).rotateY(-Math.PI / 2).translate(-RX, 0, 0), paper);
    bp.add(wallZ(RZ, RZF, 0, RY, 0).rotateY(-Math.PI / 2).translate(RX, 0, 0), paper);
    bc.add(flat(-RX, RZ, RX, RZF, RY), ceilM);
    b.box(paint, -RX, 0, RZ, RX, 0.12, RZ + 0.02, TRIM);
    b.box(paint, -RX, RY - 0.08, RZ, RX, RY, RZ + 0.05, TRIM);
    for (const [bb, x, s] of [[bn, -RX, 1], [bp, RX, -1]] as [Bat, number, number][]) { bb.box(paint, x, 0, RZ + 0.021, x + s * 0.02, 0.12, RZF, TRIM); bb.box(paint, x, RY - 0.08, RZ + 0.051, x + s * 0.05, RY, RZF, TRIM); }
    // ---- the WINDOW: architrave, sill, glazing frame + bars (match the shader's 3 x 2 aperture), curtains ----
    {
      const { x0, x1, y0, y1 } = WIN, A = 0.075;
      b.box(paint, x0 - A, y0 - 0.02, RZ, x0, y1 + A, RZ + 0.028, TRIM); b.box(paint, x1, y0 - 0.02, RZ, x1 + A, y1 + A, RZ + 0.028, TRIM);
      b.box(paint, x0, y1, RZ, x1, y1 + A, RZ + 0.028, TRIM);
      b.box(paint, x0 - 0.1, y0 - 0.035, RZ - WT + 0.01, x1 + 0.1, y0 + 0.001, RZ + 0.12, TRIM);
      const xi0 = x0 + WFR, xi1 = x1 - WFR, yi0 = y0 + WFR, yi1 = y1 - WFR, zf0 = WPZ - 0.025, zf1 = WPZ + 0.025, FR = "#f4efe6";
      b.box(paint, x0, y0 + 0.001, zf0, xi0, y1, zf1, FR); b.box(paint, xi1, y0 + 0.001, zf0, x1, y1, zf1, FR);
      b.box(paint, xi0, y0 + 0.001, zf0, xi1, yi0, zf1, FR); b.box(paint, xi0, yi1, zf0, xi1, y1, zf1, FR);
      const cw = (xi1 - xi0) / 3, bh = 0.03;
      for (const k of [1, 2]) { const x = xi0 + cw * k; b.box(paint, x - bh, yi0, zf0 + 0.008, x + bh, yi1, zf1 - 0.008, FR); }
      const ym = (yi0 + yi1) / 2; b.box(paint, xi0, ym - bh, zf0 + 0.006, xi1, ym + bh, zf1 - 0.006, FR);
      b.sph(metal, TRS(x0 + 0.75, ym, zf1 + 0.012, 0, 0, 0, 0.014), 8, GOLD);
      // things on the sill: a tiny cactus, a toy rocket
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.05, 0.06], [0.001, 0.06]], TRS(x0 + 0.12, y0, RZ + 0.02), 16, "#ff7a8a");
      fu.sph(plain, TRS(x0 + 0.12, y0 + 0.1, RZ + 0.02, 0, 0, 0, [0.028, 0.055, 0.028]), 10, "#4aa860");
      fu.sph(plain, TRS(x0 + 0.12, y0 + 0.165, RZ + 0.02, 0, 0, 0, 0.01), 6, "#ff6a9a");
      fu.lathe(gloss, [[0.001, 0], [0.028, 0.02], [0.03, 0.12], [0.001, 0.2]], TRS(x1 - 0.16, y0, RZ + 0.03), 14, "#f4f0e6");
      fu.sph(gloss, TRS(x1 - 0.16, y0 + 0.13, RZ + 0.06, 0, 0, 0, 0.013), 8, "#5ac8f0");
      for (const s of [-1, 1]) fu.box(gloss, x1 - 0.16 + s * 0.03, y0, RZ + 0.025, x1 - 0.16 + s * 0.045, y0 + 0.06, RZ + 0.035, RED);
      // curtain rod, red curtains gathered with gold tie-backs (BEAN's window: red, also seen from the BLOCK)
      const ry = y1 + 0.16, rz = RZ + 0.09, ch = ry - 1.02;
      b.rod(metal, V3(x0 - 0.62, ry, rz), V3(x1 + 0.62, ry, rz), 0.013, 10, GOLD);
      for (const x of [x0 - 0.64, x1 + 0.64]) b.sph(metal, TRS(x, ry, rz, 0, 0, 0, 0.026), 10, GOLD);
      const cur = imat(S, { spec: 20, specK: 0.12 });
      for (const [xc, sd] of [[x0 - 0.26, 3], [x1 + 0.26, 7]] as [number, number][]) {
        b.add(drape(0.56, ch, 4, 0.04, sd, 0.5), cur, TRS(xc, ry - 0.01, rz + 0.025), RED);
        b.torus(gloss, 0.075, 0.014, TRS(xc, ry - 0.01 - ch * 0.5, rz + 0.03, 0, Math.PI / 2, 0, [1, 1, 0.6]), GOLD);
      }
      // the view outside (self-lit painting, NOINK)
      this.viewMat = imat(S, { map: viewTex(), emap: true, em: [1, 1, 1] });
      const card = new THREE.Mesh(clean(new THREE.PlaneGeometry(9, 6.75)), this.viewMat);
      card.position.set(0.25, 2.2, RZ - 4.6); card.layers.set(NOINK); card.frustumCulled = false; R.add(card);
    }
    // ---- glow-in-the-dark star stickers on the wall + ceiling (NOINK decals, self-lit) ----
    {
      this.starMat = imat(S, { col: "#000000", em: [0.4, 0.75, 0.32] });
      const sg = new Bat(), r = rng(41);
      const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.42 : 1; if (i) sh.lineTo(Math.cos(a) * rr, -Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, -Math.sin(a) * rr); }
      const spots: [number, number][] = [[-2.15, 2.35], [-1.95, 2.15], [-2.25, 1.05], [-0.95, 2.47], [-0.75, 2.28], [1.25, 2.45], [1.55, 2.35], [2.2, 2.42], [2.05, 0.95], [-2.0, 0.85]];
      for (const [x, y] of spots) sg.add(new THREE.ShapeGeometry(sh), this.starMat, TRS(x, y, RZ + 0.004, 0, 0, r() * 1.2, 0.025 + r() * 0.02));
      for (let k = 0; k < 9; k++) sg.add(new THREE.ShapeGeometry(sh), this.starMat, TRS(-1.8 + r() * 3.6, RY - 0.004, -1.0 + r() * 2.6, 0, Math.PI / 2, r() * 1.2, 0.03 + r() * 0.02));
      for (const m of sg.build(R)) m.layers.set(NOINK);
    }
    // ---- the BED: frame, cloud headboard + footboard, mattress (fitted sheet), pillows ----
    {
      const z0 = -1.38, z1 = 0.24, zc = (z0 + z1) / 2;
      fu.rbox(wood, 2.12, 0.24, z1 - z0, 0.03, TRS(-0.055, 0.25, zc), "#ffffff");
      for (const x of [-1.07, 0.95]) for (const z of [z0 + 0.06, z1 - 0.06]) fu.cyl(wood, 0.035, 0.028, 0.14, 10, TRS(x, 0.07, z), "#ffffff");
      fu.rbox(plain, 2.02, 0.2, z1 - z0 - 0.04, 0.06, TRS(-0.065, 0.45, zc), "#a9c8f4");
      const cloud = (top: number, hump: number) => {
        const s = new THREE.Shape(), L = z1 - z0;
        s.moveTo(0, 0.12); s.lineTo(L, 0.12); s.lineTo(L, top - hump * 0.6);
        const n = 3;
        for (let i = n - 1; i >= 0; i--) {
          const a = (L * (i + 1)) / n, c = (L * i) / n, m = (a + c) / 2;
          s.bezierCurveTo(a, top + hump * 0.2, m + (a - c) * 0.25, top + hump, m, top + hump);
          s.bezierCurveTo(m - (a - c) * 0.25, top + hump, c, top + hump * 0.2, c, top - hump * 0.6 * (i === 0 ? 1 : 0.35));
        }
        s.lineTo(0, 0.12);
        return new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 14 });
      };
      // extrusion (local +z) -> world -x ; shape u -> world z
      fu.add(cloud(1.0, 0.18), gloss, new THREE.Matrix4().makeTranslation(-1.085, 0, z0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)), ORANGE);
      fu.add(cloud(0.66, 0.12), gloss, new THREE.Matrix4().makeTranslation(1.035, 0, z0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)), ORANGE);
      const pm = imat(S, { map: pillowTex() });
      fu.sph(pm, TRS(PILLOW[0] - BEDROOM[0], PILLOW[1] - BEDROOM[1], PILLOW[2] - BEDROOM[2], 0, 0, 0, PILLOW_R), 28);
      fu.sph(pm, TRS(-0.88, 0.7, -1.16, 0, 1.05, 0.05, [0.19, 0.06, 0.22]), 22);
    }
    // ---- the DUVET (live mesh) ----
    {
      const { nu, nv } = DUV, n = (nu + 1) * (nv + 1);
      const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3).fill(1), idx: number[] = [];
      for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = j * (nu + 1) + i; uv[k * 2] = i / nu; uv[k * 2 + 1] = 1 - j / nv; }
      for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, c = a + nu + 1; idx.push(a, c, a + 1, a + 1, c, c + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setIndex(idx);
      this.duvet = new THREE.Mesh(g, imat(S, { map: duvetTex(), spec: 12, specK: 0.08 }));
      this.duvet.frustumCulled = false; this.duvet.receiveShadow = true; R.add(this.duvet);
      this.shapeDuvet(0, 0, 0, 0);
    }
    // ---- NIGHTSTAND (mint), mushroom lamp, the ALARM CLOCK 23:47 ----
    {
      const x0 = -1.62, x1 = -1.2, z0 = -1.36, z1 = -0.92, top = 0.6;
      fu.rbox(gloss, x1 - x0, top - 0.08, z1 - z0, 0.025, TRS((x0 + x1) / 2, 0.08 + (top - 0.08) / 2, (z0 + z1) / 2), MINT);
      for (const x of [x0 + 0.04, x1 - 0.04]) for (const z of [z0 + 0.04, z1 - 0.04]) fu.cyl(wood, 0.018, 0.012, 0.1, 8, TRS(x, 0.05, z), "#ffffff");
      fu.box(gloss, x0 + 0.03, 0.36, z1, x1 - 0.03, 0.54, z1 + 0.012, "#7ee0c4");
      fu.sph(metal, TRS((x0 + x1) / 2, 0.45, z1 + 0.025, 0, 0, 0, 0.018), 10, GOLD);
      const lx = -1.5, lz = -1.22;
      fu.lathe(gloss, [[0.001, 0], [0.07, 0], [0.075, 0.02], [0.03, 0.04], [0.02, 0.2], [0.001, 0.2]], TRS(lx, top, lz), 18, "#fbf3e4");
      this.lampMat = imat(S, { spec: 40, specK: 0.3, em: [0.05, 0.03, 0.01] });
      fu.lathe(this.lampMat, [[0.001, 0.32], [0.08, 0.3], [0.13, 0.24], [0.14, 0.2], [0.12, 0.19], [0.001, 0.19]], TRS(lx, top, lz), 24, "#ff4a3a");
      for (let k = 0; k < 6; k++) { const a = k * 1.05 + 0.3, rr = k % 2 ? 0.085 : 0.05; fu.sph(plain, TRS(lx + Math.cos(a) * rr, top + 0.3 - rr * 0.35, lz + Math.sin(a) * rr, 0, 0, 0, [0.018, 0.008, 0.018]), 8, "#fff6e6"); }
      const cx = CLOCK[0] - BEDROOM[0], cz = CLOCK[2] - BEDROOM[2], M = TRS(cx, top + 0.045, cz, 0.42);
      fu.rbox(gloss, 0.17, 0.09, 0.08, 0.02, M, "#ff9a3a");
      fu.box(gloss, -0.06, 0.045, -0.02, 0.06, 0.055, 0.02, "#e8e0d0", M);
      fu.box(plain, -0.075, -0.035, 0.0405, 0.075, 0.035, 0.044, "#140608", M);
      this.clockMat = imat(S, { map: clockTex(), emap: true, em: [2.4, 2.4, 2.4] });
      const face = new THREE.Mesh(clean(new THREE.PlaneGeometry(0.14, 0.065)), this.clockMat);
      face.applyMatrix4(new THREE.Matrix4().multiplyMatrices(M, TRS(0, 0, 0.0448))); face.frustumCulled = false; R.add(face);
    }
    // ---- posters, shelf with books + a toy T-rex, the snake plant ----
    {
      for (const [x, y, w, h, tex, rot] of [[-1.72, 1.72, 0.46, 0.63, junglePosterTex(), -0.025], [1.86, 1.8, 0.44, 0.6, rocketPosterTex(), 0.02]] as [number, number, number, number, THREE.Texture, number][]) {
        const M = TRS(x, y, RZ + 0.004, 0, 0, rot);
        fu.add(new THREE.PlaneGeometry(w, h), imat(S, { map: tex, spec: 40, specK: 0.12 }), M);
        for (const dx of [-1, 1]) fu.sph(gloss, new THREE.Matrix4().multiplyMatrices(M, TRS((dx * w) / 2 - dx * 0.025, h / 2 - 0.025, 0.004, 0, 0, 0, [0.012, 0.012, 0.006])), 8, dx < 0 ? RED : "#ffd34a");
      }
      const sx0 = 1.5, sx1 = 2.2, sy = 1.3;
      fu.box(wood, sx0, sy - 0.03, RZ, sx1, sy, RZ + 0.2, "#ffffff");
      for (const x of [sx0 + 0.08, sx1 - 0.08]) fu.box(metal, x - 0.012, sy - 0.12, RZ, x + 0.012, sy - 0.03, RZ + 0.15, "#2a2a32");
      const r = rng(13); let bx = sx0 + 0.03; const bcol = ["#e8343c", "#2f6ad0", "#ffd34a", "#3aa06a", "#8a4ac8", "#f07a3a"];
      for (let k = 0; k < 7; k++) { const w = 0.03 + r() * 0.025, h = 0.16 + r() * 0.07; fu.box(plain, bx, sy, RZ + 0.03, bx + w, sy + h, RZ + 0.17, bcol[k % bcol.length]); fu.box(plain, bx + 0.004, sy + h * 0.7, RZ + 0.17, bx + w - 0.004, sy + h * 0.76, RZ + 0.173, "#fff4d8"); bx += w + 0.003; }
      const tx = 2.04, ty = sy, tz = RZ + 0.1;
      fu.sph(gloss, TRS(tx, ty + 0.07, tz, 0, 0, 0.3, [0.06, 0.045, 0.04]), 12, "#4ac060");
      fu.sph(gloss, TRS(tx + 0.06, ty + 0.13, tz, 0, 0, -0.2, [0.04, 0.03, 0.03]), 12, "#4ac060");
      fu.rod(gloss, V3(tx - 0.05, ty + 0.06, tz), V3(tx - 0.12, ty + 0.02, tz), 0.012, 6, "#4ac060");
      for (const s of [-1, 1]) fu.rod(gloss, V3(tx, ty + 0.04, tz + s * 0.02), V3(tx + 0.005, ty, tz + s * 0.025), 0.012, 6, "#3aa050");
      fu.sph(gloss, TRS(tx + 0.08, ty + 0.145, tz + 0.025, 0, 0, 0, 0.006), 6, "#1a1a1a");
      const px = 1.62, pz = -1.08;
      fu.lathe(gloss, [[0.001, 0], [0.12, 0], [0.15, 0.3], [0.165, 0.31], [0.165, 0.34], [0.14, 0.34], [0.001, 0.32]], TRS(px, 0, pz), 24, "#ffc23a");
      const pr = rng(77);
      for (let k = 0; k < 11; k++) {
        const L = 0.45 + pr() * 0.45, w = 0.035 + pr() * 0.02, a = (k / 11) * Math.PI * 2 + pr() * 0.4, rr = 0.03 + pr() * 0.07;
        const sh = new THREE.Shape(); sh.moveTo(-w, 0); sh.bezierCurveTo(-w * 1.4, L * 0.4, -w * 0.6, L * 0.8, 0, L); sh.bezierCurveTo(w * 0.6, L * 0.8, w * 1.4, L * 0.4, w, 0); sh.lineTo(-w, 0);
        fu.add(new THREE.ShapeGeometry(sh, 8), plain, TRS(px + Math.cos(a) * rr, 0.32, pz + Math.sin(a) * rr, -a + Math.PI / 2, 0, (pr() - 0.5) * 0.35), k % 2 ? "#3f8a3a" : "#5aa64a");
      }
    }
    // ---- oval rug + dino slippers ----
    {
      const rg = new THREE.CylinderGeometry(1, 1, 0.01, 64, 1); rg.translate(0, 0.005, 0);
      const uv = rg.getAttribute("uv") as THREE.BufferAttribute, p = rg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + p.getX(i) * 0.5, 0.5 - p.getZ(i) * 0.5);
      b.add(rg, imat(S, { map: rugTex() }), TRS(0.1, 0, 1.0, 0, 0, 0, [0.95, 1, 0.6]));
      for (const [x, z, a] of [[-0.32, 0.6, 0.25], [-0.05, 0.66, -0.12]] as [number, number, number][]) {
        const M = TRS(x, 0.01, z, a);
        const m = (x2: number, y: number, z2: number, s: number | C3 = 1) => new THREE.Matrix4().multiplyMatrices(M, TRS(x2, y, z2, 0, 0, 0, s));
        fu.sph(plain, m(0, 0.035, 0, [0.06, 0.04, 0.13]), 16, "#5ac860");
        fu.sph(plain, m(0, 0.05, 0.08, [0.055, 0.04, 0.06]), 14, "#5ac860");
        for (const s of [-1, 1]) { fu.sph(gloss, m(s * 0.03, 0.085, 0.1, 0.016), 8, "#ffffff"); fu.sph(gloss, m(s * 0.03, 0.088, 0.112, 0.007), 6, "#1a1a1a"); }
        for (let k = 0; k < 4; k++) fu.add(new THREE.ConeGeometry(0.014, 0.035, 6), plain, m(0, 0.075 - k * 0.004, 0.02 - k * 0.04), "#ffd34a");
        fu.box(plain, -0.04, 0.03, 0.125, 0.04, 0.034, 0.13, "#ffffff", M);
      }
    }
    b.build(R); fu.build(R); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    // ---- glows: the clock LEDs, the street-lamp glow just outside the window ----
    this.glows = new Glows(R, [
      { p: V3(CLOCK[0] - BEDROOM[0] + 0.01, 0.648, CLOCK[2] - BEDROOM[2] + 0.03), c: [0.5, 0.04, 0.03], s: 0.22, g: 0 },
      { p: V3(1.1, 2.1, RZ - 0.35), c: [0.22, 0.14, 0.06], s: 0.9, g: 1 },
    ]);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 700, 37, [-1.4, 0.6, -1.3, 2.2, 2.4, 1.8]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  /** the duvet's surface: rest shape + jolt lift / billow / flap + breathing */
  shapeDuvet(lift: number, flap: number, breathe: number, t: number) {
    const { xa, xb, za, zb, nu, nv, drape: dr } = DUV, g = this.duvet.geometry, P = g.getAttribute("position") as THREE.BufferAttribute;
    const vTop = Math.round(nv * 0.82); // rows up to here are the top, then the front drape
    const top = (x: number, z: number) => {
      const body = 0.15 * (1 - smooth((x + 0.05) / 0.45)) + 0.1 * smooth((x + 0.05) / 0.45);
      const env = smooth((x + 0.76) / 0.16) * (1 - smooth((x - 0.86) / 0.09));
      const hb = (body * env + 0.05 * Math.exp(-(((x - 0.8) / 0.07) ** 2))) * Math.exp(-(((z + 0.4) / 0.27) ** 2));
      const tuck = smooth((z + 1.36) / 0.25);
      const wr = 0.011 * Math.sin(x * 11 + z * 5) * Math.sin(z * 9 - x * 4) + 0.008 * Math.sin(x * 23 - z * 7);
      const cuff = 0.02 * (1 - smooth((x - xa) / 0.08));
      const br = 0.008 * breathe * Math.exp(-(((x + 0.3) / 0.3) ** 2)) * Math.exp(-(((z + 0.4) / 0.22) ** 2));
      return 0.564 + (0.04 + hb + wr + cuff + br) * tuck - 0.03 * smooth((z - 0.12) / 0.12);
    };
    const lf = (x: number, z: number) => lift * (0.82 * Math.exp(-(((z + 0.4) / 0.6) ** 2)) + 0.18) * (0.35 + 0.65 * smooth((x + 0.75) / 0.3)) * (1 - 0.3 * smooth((x - 0.6) / 0.35));
    const kick = Math.max(0, lift) * 1.4, wob = Math.max(0, lift + 0.1) * 6;
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * (nu + 1) + i, x = xa + ((xb - xa) * i) / nu;
      let y: number, z: number;
      if (j <= vTop) {
        z = za + ((zb - za) * j) / vTop;
        const edge = smooth((z + 0.3) / 0.54);
        y = top(x, z) + lf(x, z) + flap * 0.05 * edge * Math.sin(x * 8.5 - t * 26) * wob;
      } else {
        const s = (j - vTop) / (nv - vTop);
        const y0 = top(x, zb) + lf(x, zb) + flap * 0.05 * Math.sin(x * 8.5 - t * 26) * wob;
        z = zb + 0.035 * Math.sin((s * Math.PI) / 2) + kick * s * 0.35 + 0.012 * Math.sin(x * 14 + 1.3) * s;
        y = y0 - dr * s * (1 - kick * 0.6) + flap * 0.06 * s * Math.sin(x * 7 - t * 24);
      }
      P.setXYZ(k, x, y, z);
    }
    P.needsUpdate = true; g.computeVertexNormals();
  }
  update(id: number, t: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = ROOM_RIGS[SHOTS[id - 1].look] ?? ROOM_RIGS.night!;
    const sd = V3(...MOON_DIR);
    const wc = V3((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, WPZ);
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.moon); S.u.uOpen.value = 0;
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1);
    (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((WIN.x1 - WIN.x0) / 2 - WFR, (WIN.y1 - WIN.y0) / 2 - WFR);
    (S.u.uWM.value as THREE.Vector4).set(3, 2, 0.03, 0.42);
    (S.u.uKP.value as THREE.Vector3).copy(LAMP_OUT).add(O); (S.u.uKC.value as THREE.Vector3).set(...rg.lamp);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(RX, RZ, RY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t;
    setLights(S, [
      { p: W2(0.75, 0.95, -0.15), c: rg.patchB, r: 1.3 },                 // moon bounce off the duvet patch
      { p: W2(0.25, 1.7, -1.05), c: rg.winB, r: 1.3 },                    // window glow
      { p: W2(0.3, 1.9, 3.2), c: rg.fill, r: 3.6 },                       // cool front fill
      { p: W2(-1.0, 1.05, -0.75), c: rg.warmB, r: 0.95 },                 // warm lamp-patch bounce (pillow / headboard)
      { p: W2(-1.31, 0.66, -0.86), c: [0.5 * rg.clock, 0.04 * rg.clock, 0.03 * rg.clock], r: 0.16 }, // the clock's red glow
      { p: W2(0.5, 0.25, 0.9), c: [rg.patchB[0] * 0.6, rg.patchB[1] * 0.6, rg.patchB[2] * 0.6], r: 1.0 }, // moon on the rug
    ], rg.au, rg.ad);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view, rg.view);
    (this.clockMat.uniforms.uEm.value as THREE.Vector3).set(2.4 * rg.clock, 2.4 * rg.clock, 2.4 * rg.clock);
    (this.starMat.uniforms.uEm.value as THREE.Vector3).set(0.4 * rg.stars, 0.75 * rg.stars, 0.32 * rg.stars);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(rg.lampEm, rg.lampEm * 0.6, rg.lampEm * 0.2);
    this.glows.gk.set(rg.clock, rg.lamp[0] / 3.0, 0, 0); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(wc, V3(1, 0, 0), V3(0, 1, 0), (WIN.x1 - WIN.x0) / 2, (WIN.y1 - WIN.y0) / 2, sd.clone().negate(), 3.6, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const dv = duvetAt(id, t);
    this.shapeDuvet(dv.lift, dv.flap, dv.breathe, t);
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -RX + 0.1; this.posX.visible = c.x < RX - 0.1; this.ceil.visible = c.y < RY - 0.1;
  }
}

// ============================================================ the apartment BLOCK at night
type WinStyle = { wall: string; lamp: C3; curtain: string; duvet: string; box?: boolean };
const WSTY: WinStyle[] = [
  { wall: "#f6d08a", lamp: [2.2, 1.45, 0.62], curtain: "#5a8ae0", duvet: "#6ac0ff", box: true },
  { wall: "#c8e6a0", lamp: [2.0, 1.55, 0.75], curtain: "#f2c84a", duvet: "#ff8a6a" },
  { wall: "#f4b8c8", lamp: [2.3, 1.3, 0.85], curtain: "#7acb8a", duvet: "#ffd34a", box: true },
  { wall: "#b8d0f4", lamp: [1.6, 1.6, 1.4], curtain: "#f4f0e0", duvet: "#c98ae0" },
  { wall: "#ffe0a8", lamp: [2.4, 1.5, 0.6], curtain: "#e2323a", duvet: "#ffbf3c", box: true },     // BEAN (red curtains)
  { wall: "#d8c0f0", lamp: [2.0, 1.35, 0.95], curtain: "#4ac0c8", duvet: "#7ad08a" },
  { wall: "#a8e0d4", lamp: [1.9, 1.6, 0.9], curtain: "#f09a5a", duvet: "#ff7aa0" },
  { wall: "#ffd0b0", lamp: [2.3, 1.4, 0.7], curtain: "#9ab0d0", duvet: "#5a8ae0", box: true },
  { wall: "#f0e0a0", lamp: [2.1, 1.5, 0.75], curtain: "#c98ae0", duvet: "#ff6a6a" },
  { wall: "#c0e8b8", lamp: [2.0, 1.45, 0.85], curtain: "#ffd34a", duvet: "#6ab0f0", box: true },
];
class Block {
  root = new THREE.Group(); S: LSet;
  moon: THREE.Sprite; glows: Glows; stars: Glows;
  constructor() {
    this.S = lset();
    const R = this.root, S = this.S;
    R.position.set(...BLOCK);
    const b = new Bat(), fu = new Bat(), cast = new Bat();
    const stucco = imat(S, { map: stuccoTex(), rep: [0.5, 0.5] });
    const slate = imat(S, { map: slateTex(), rep: [0.5, 0.5] });
    const paving = imat(S, { map: pavingTex(), rep: [1 / 2.4, 1 / 2.4] });
    const asphalt = imat(S, { map: asphaltTex(), rep: [1 / 6, 1 / 6] });
    const brickL = imat(S, { map: brickTex("jeBrickBlue", "#6a78b4"), rep: [0.5, 0.5] }), brickR = imat(S, { map: brickTex("jeBrickRed", "#c0645a"), rep: [0.5, 0.5] });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.45 }), metal = imat(S, { spec: 90, specK: 0.9 });
    const wallI = imat(S, {}), dark = imat(S, { map: darkWinTex(), emap: true, em: [0.9, 0.9, 1.0] });
    const glowY = imat(S, { col: "#000000", em: [1.6, 1.4, 0.3] });
    const { FW, Y0, FH, XC, WW, SILL, TOP } = BK, TRIM = "#fbf2e2", ROOFTOP = 12.3, DOORTOP = 2.2;
    const yk = (k: number) => Y0 + FH * k;
    // ---- street: road, curb, sidewalk, centre dashes, a manhole ----
    b.add(flat(-60, 2.95, 60, 40, 0), asphalt);
    b.box(paving, -60, 0, -0.4, 60, 0.12, 2.8); b.box(plain, -60, 0, 2.8, 60, 0.125, 2.95, "#a8acc4");
    for (let x = -58; x < 60; x += 3.2) b.box(plain, x, 0, 7.42, x + 1.6, 0.006, 7.58, "#f4efd8");
    fu.cyl(metal, 0.4, 0.4, 0.01, 24, TRS(-1.6, 0.005, 5.2), "#3a3c52");
    // ---- the main facade (peach stucco), plinth, floor bands, quoins, side walls ----
    const holes = [0, 1, 2, 3, 4].flatMap((k) => XC.map((xc) => [xc - WW, xc + WW, yk(k) + SILL, yk(k) + TOP])); holes.push([-0.55, 0.55, 0.12, DOORTOP]);
    b.add(wallZ(-FW, FW, 0, ROOFTOP, 0, holes), stucco);
    b.add(wallZ(-6.2, 0, 0, ROOFTOP, 0).rotateY(-Math.PI / 2).translate(-FW, 0, 0), stucco);
    b.add(wallZ(-6.2, 0, 0, ROOFTOP, 0).rotateY(-Math.PI / 2).translate(FW, 0, 0), stucco);
    b.box(paint, -FW - 0.04, 0.12, -0.02, -0.7, 0.55, 0.05, "#c08a7a"); b.box(paint, 0.7, 0.12, -0.02, FW + 0.04, 0.55, 0.05, "#c08a7a");
    for (let k = 1; k <= 4; k++) b.box(paint, -FW - 0.04, yk(k) - 0.1, -0.01, FW + 0.04, yk(k) + 0.02, 0.09, TRIM);
    for (const s of [-1, 1]) for (let y = 0.6; y < ROOFTOP - 0.3; y += 0.56) { if (k4band(y)) continue; b.box(paint, s > 0 ? FW - 0.3 : -FW, y, -0.01, s > 0 ? FW : -FW + 0.3, y + 0.46, 0.04, "#f6c8a8"); }
    // cornice + roof (gable, ridge along x) + dormers + chimneys
    const e = ROOFTOP + 0.35, ridge = 15.0, zf = 0.34, zr = -3.05, zb = -6.45;
    b.box(paint, -FW - 0.2, ROOFTOP, -6.4, FW + 0.2, ROOFTOP + 0.18, 0.28, TRIM);
    b.box(paint, -FW - 0.25, ROOFTOP + 0.18, -6.45, FW + 0.25, e, 0.34, "#e8d8c8");
    b.slab(slate, V3(0, e, zf + 0.05), V3(0, ridge, zr), FW + 0.3, 0.12);
    b.slab(slate, V3(0, e, zb - 0.05), V3(0, ridge, zr), FW + 0.3, 0.12);
    for (const s of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(zb, e - 0.01); sh.lineTo(zf, e - 0.01); sh.lineTo(zr, ridge - 0.05); sh.lineTo(zb, e - 0.01); b.add(new THREE.ShapeGeometry(sh), stucco, new THREE.Matrix4().makeTranslation(s * FW, 0, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2))); }
    b.box(paint, -FW - 0.3, ridge - 0.06, zr - 0.12, FW + 0.3, ridge + 0.1, zr + 0.12, "#6a74a8");
    for (const xd of [-1.45, 1.45]) {
      fu.box(paint, xd - 0.5, 13.0, -2.4, xd + 0.5, 14.5, -1.3, "#f2b08a");
      const sh = new THREE.Shape(); sh.moveTo(-0.62, 0); sh.lineTo(0, 0.4); sh.lineTo(0.62, 0); sh.lineTo(-0.62, 0);
      fu.add(new THREE.ExtrudeGeometry(sh, { depth: 1.2, bevelEnabled: false }), slate, TRS(xd, 14.5, -2.5));
      fu.box(paint, xd - 0.38, 13.78, -1.3, xd + 0.38, 14.42, -1.26, TRIM);
      fu.add(new THREE.PlaneGeometry(0.62, 0.5), dark, TRS(xd, 14.1, -1.255));
      fu.box(paint, xd - 0.015, 13.85, -1.26, xd + 0.015, 14.35, -1.24, TRIM);
    }
    for (const [xc, zc, h] of [[-2.1, -2.4, 16.4], [2.2, -3.6, 16.8]] as [number, number, number][]) {
      cast.box(brickR, xc - 0.32, e, zc - 0.28, xc + 0.32, h, zc + 0.28);
      cast.box(paint, xc - 0.38, h, zc - 0.34, xc + 0.38, h + 0.12, zc + 0.34, "#e8d8c8");
      for (const dx of [-0.14, 0.14]) cast.lathe(gloss, [[0.001, 0], [0.09, 0], [0.07, 0.22], [0.09, 0.3], [0.001, 0.3]], TRS(xc + dx, h + 0.12, zc), 12, "#d0704a");
    }
    cast.rod(metal, V3(2.2, 16.9, -3.6), V3(2.2, 18.2, -3.6), 0.025, 6, "#3a3c52");
    for (const [y, w] of [[17.7, 0.7], [17.95, 0.5], [18.15, 0.3]] as [number, number][]) cast.rod(metal, V3(2.2 - w, y, -3.6), V3(2.2 + w, y, -3.6), 0.015, 5, "#3a3c52");
    { // the CAT on the ridge (glowing eyes)
      const cx = 0.4, cy = ridge + 0.1, cz = zr;
      cast.sph(plain, TRS(cx, cy + 0.2, cz, 0, 0, 0, [0.17, 0.22, 0.14]), 14, "#1c1a2a");
      cast.sph(plain, TRS(cx + 0.02, cy + 0.48, cz + 0.02, 0, 0, 0, [0.13, 0.12, 0.12]), 14, "#1c1a2a");
      for (const s of [-1, 1]) cast.add(new THREE.ConeGeometry(0.045, 0.1, 6), plain, TRS(cx + 0.02 + s * 0.08, cy + 0.6, cz + 0.02, 0, 0, s * -0.25), "#1c1a2a");
      cast.tube(plain, [V3(cx - 0.1, cy + 0.05, cz), V3(cx - 0.32, cy, cz + 0.05), V3(cx - 0.42, cy - 0.25, cz + 0.12), V3(cx - 0.36, cy - 0.5, cz + 0.2)], 0.028, 24, "#1c1a2a", 6);
      for (const s of [-1, 1]) fu.sph(glowY, TRS(cx + 0.02 + s * 0.045, cy + 0.5, cz + 0.13, 0, 0, 0, [0.02, 0.013, 0.01]), 8);
    }
    // ---- the 10 windows: surround, sill, frame, curtains, flower boxes, the room inside with a bed ----
    for (let i = 0; i < 10; i++) {
      const k = Math.floor(i / 2), xc = XC[i % 2], y0 = yk(k), st = WSTY[i];
      const ya = y0 + SILL, yb = y0 + TOP, x0 = xc - WW, x1 = xc + WW;
      b.box(stucco, x0 - 0.04, ya, -0.25, x0, yb, -0.002); b.box(stucco, x1, ya, -0.25, x1 + 0.04, yb, -0.002); b.box(stucco, x0 - 0.04, yb, -0.25, x1 + 0.04, yb + 0.04, -0.002);
      b.box(paint, x0 - 0.12, ya - 0.02, 0.0, x0, yb + 0.12, 0.06, TRIM); b.box(paint, x1, ya - 0.02, 0.0, x1 + 0.12, yb + 0.12, 0.06, TRIM);
      b.box(paint, x0, yb, 0.0, x1, yb + 0.12, 0.06, TRIM);
      b.box(paint, x0 - 0.18, ya - 0.1, -0.25, x1 + 0.18, ya, 0.17, TRIM);
      b.box(paint, xc - 0.1, yb + 0.02, 0.06, xc + 0.1, yb + 0.22, 0.1, "#f6e0c8");
      const zf2 = -0.12, F = "#ffffff";
      b.box(paint, x0, ya, zf2 - 0.03, x0 + 0.05, yb, zf2 + 0.03, F); b.box(paint, x1 - 0.05, ya, zf2 - 0.03, x1, yb, zf2 + 0.03, F);
      b.box(paint, x0 + 0.05, yb - 0.05, zf2 - 0.03, x1 - 0.05, yb, zf2 + 0.03, F); b.box(paint, x0 + 0.05, ya, zf2 - 0.03, x1 - 0.05, ya + 0.04, zf2 + 0.03, F);
      b.box(paint, x0 + 0.05, yb - 0.3, zf2 - 0.025, x1 - 0.05, yb - 0.26, zf2 + 0.025, F);
      b.box(paint, xc - 0.012, yb - 0.26, zf2 - 0.02, xc + 0.012, yb - 0.05, zf2 + 0.02, F);
      const cm = imat(S, { spec: 20, specK: 0.1 });
      for (const [cx, sd] of [[x0 + 0.1, i * 3 + 1], [x1 - 0.1, i * 3 + 2]] as [number, number][]) fu.add(drape(0.22, TOP - SILL + 0.02, 2, 0.02, sd, 0.55), cm, TRS(cx, yb - 0.01, -0.33), st.curtain);
      fu.rod(metal, V3(x0 - 0.02, yb - 0.02, -0.31), V3(x1 + 0.02, yb - 0.02, -0.31), 0.012, 6, "#c8a040");
      if (st.box) {
        fu.box(paint, x0 + 0.05, ya - 0.34, 0.17, x1 - 0.05, ya - 0.12, 0.42, "#2f8a7a");
        const r = rng(i * 17 + 3);
        for (let q = 0; q < 14; q++) { const fx = x0 + 0.12 + r() * (2 * WW - 0.24), fz = 0.24 + r() * 0.12; fu.sph(plain, TRS(fx, ya - 0.08 + r() * 0.06, fz, r() * 3, 0, 0, [0.07, 0.06, 0.07]), 8, r() < 0.5 ? "#3f8a3a" : "#5aa64a"); }
        for (let q = 0; q < 9; q++) fu.sph(gloss, TRS(x0 + 0.14 + r() * (2 * WW - 0.28), ya - 0.03 + r() * 0.05, 0.3 + r() * 0.1, 0, 0, 0, 0.035), 8, ["#ff6a8a", "#ffd34a", "#ffffff", "#ff8a3a"][q % 4]);
      }
      const ri = new Bat();
      ri.box(wallI, xc - 1.0, y0, -1.65, xc + 1.0, y0 + 2.25, -1.6, st.wall);
      ri.box(wallI, xc - 1.05, y0, -1.6, xc - 1.0, y0 + 2.25, -0.25, st.wall); ri.box(wallI, xc + 1.0, y0, -1.6, xc + 1.05, y0 + 2.25, -0.25, st.wall);
      ri.box(wallI, xc - 1.0, y0 - 0.05, -1.6, xc + 1.0, y0, -0.25, "#b07a4a"); ri.box(wallI, xc - 1.0, y0 + 2.25, -1.6, xc + 1.0, y0 + 2.3, -0.25, "#f4f0e8");
      ri.box(paint, xc - 0.55, y0, -1.15, xc + 0.6, y0 + 0.4, -0.38, "#a86a3a");
      ri.rbox(plain, 1.12, 0.16, 0.74, 0.05, TRS(xc + 0.03, y0 + 0.5, -0.77), "#f4f4f8");
      ri.rbox(plain, 0.98, 0.07, 0.78, 0.035, TRS(xc + 0.12, y0 + 0.6, -0.76), st.duvet);
      ri.sph(plain, TRS(xc - 0.42, y0 + 0.63, -0.8, 0, 0, 0, [0.14, 0.06, 0.28]), 14, "#ffffff");
      ri.rbox(gloss, 0.06, 0.75, 0.8, 0.025, TRS(xc - 0.58, y0 + 0.38, -0.77), "#c07a44");
      ri.box(paint, xc + 0.05, y0 + 1.2, -1.6, xc + 0.55, y0 + 1.6, -1.585, "#5a3a2a"); ri.box(plain, xc + 0.09, y0 + 1.24, -1.585, xc + 0.51, y0 + 1.56, -1.58, ["#ffd34a", "#6ac0ff", "#ff8a6a", "#7ad08a"][i % 4]);
      ri.lathe(gloss, [[0.001, 0], [0.1, 0], [0.08, 0.12], [0.001, 0.12]], TRS(xc - 0.62, y0 + 1.5, -1.52, 0, Math.PI, 0), 14, "#fff4d8");
      ri.build(R);
    }
    // ---- the DOOR: steps, recess, teal door with a fan light, number plaque, door lamp, bay trees ----
    {
      b.box(stucco, -0.59, 0.12, -0.25, -0.55, DOORTOP, -0.002); b.box(stucco, 0.55, 0.12, -0.25, 0.59, DOORTOP, -0.002); b.box(stucco, -0.59, DOORTOP, -0.25, 0.59, DOORTOP + 0.04, -0.002);
      b.box(paint, -0.7, 0.12, 0, -0.55, DOORTOP + 0.12, 0.06, TRIM); b.box(paint, 0.55, 0.12, 0, 0.7, DOORTOP + 0.12, 0.06, TRIM); b.box(paint, -0.55, DOORTOP, 0, 0.55, DOORTOP + 0.12, 0.06, TRIM);
      fu.box(gloss, -0.55, 0.15, -0.24, 0.55, 1.92, -0.2, "#1e8a8a");
      for (const [ya, yb2] of [[0.3, 0.95], [1.08, 1.8]]) for (const s of [-1, 1]) fu.box(gloss, s > 0 ? 0.06 : -0.48, ya, -0.2, s > 0 ? 0.48 : -0.06, yb2, -0.18, "#26a0a0");
      fu.box(gloss, -0.015, 0.15, -0.2, 0.015, 1.92, -0.17, "#167070");
      fu.sph(metal, TRS(0.16, 1.0, -0.15, 0, 0, 0, 0.035), 10, "#e8c050");
      fu.box(paint, -0.55, 1.92, -0.24, 0.55, 1.95, -0.2, TRIM);
      fu.add(new THREE.PlaneGeometry(1.08, 0.24), imat(S, { col: "#000000", em: [1.6, 1.05, 0.45] }), TRS(0, 2.075, -0.235));
      for (let q = 1; q < 5; q++) fu.box(paint, -0.55 + q * 0.22 - 0.01, 1.95, -0.232, -0.55 + q * 0.22 + 0.01, DOORTOP, -0.22, TRIM);
      fu.add(new THREE.PlaneGeometry(0.3, 0.19), imat(S, { map: plaqueTex() }), TRS(0.88, 1.75, 0.012));
      fu.box(paint, -0.75, 0.12, -0.02, 0.75, 0.2, 0.35, "#c8c4d8"); fu.box(paint, -0.65, 0.2, -0.02, 0.65, 0.28, 0.18, "#c8c4d8");
      fu.lathe(metal, [[0.001, 0], [0.05, 0], [0.08, 0.06], [0.06, 0.24], [0.001, 0.26]], TRS(0, 2.62, 0.14, 0, Math.PI, 0), 10, "#2a2c40");
      fu.rod(metal, V3(0, 2.62, 0.02), V3(0, 2.62, 0.14), 0.015, 6, "#2a2c40");
      fu.sph(imat(S, { col: "#000000", em: [1.8, 1.2, 0.55] }), TRS(0, 2.45, 0.14, 0, 0, 0, 0.05), 10);
      for (const s of [-1, 1]) {
        fu.lathe(gloss, [[0.001, 0], [0.16, 0], [0.2, 0.36], [0.001, 0.36]], TRS(s * 0.95, 0.12, 0.35), 16, "#d06a42");
        fu.rod(plain, V3(s * 0.95, 0.46, 0.35), V3(s * 0.95, 1.0, 0.35), 0.02, 6, "#5a3a22");
        fu.sph(plain, TRS(s * 0.95, 1.2, 0.35, 0, 0, 0, 0.27), 14, "#3f8a4a");
      }
    }
    fu.rod(metal, V3(FW - 0.16, 0.12, 0.08), V3(FW - 0.16, ROOFTOP, 0.08), 0.045, 10, "#4a4e68");
    // ---- neighbours: blue brick (left, gabled) and red brick (right, flat roof + water tank); dark windows ----
    {
      const L = { x0: -9.5, x1: -3.06, zf: -0.35, h: 9.6 };
      b.box(brickL, L.x0, 0, L.zf - 7, L.x1, L.h, L.zf);
      const sh = new THREE.Shape(); sh.moveTo(L.x0 - 0.1, 0); sh.lineTo((L.x0 + L.x1) / 2, 2.6); sh.lineTo(L.x1 + 0.1, 0); sh.lineTo(L.x0 - 0.1, 0);
      b.add(new THREE.ExtrudeGeometry(sh, { depth: 7.2, bevelEnabled: false }), slate, TRS(0, L.h, L.zf - 7.1));
      b.box(paint, L.x0, L.h - 0.15, L.zf, L.x1, L.h + 0.02, L.zf + 0.12, "#d8dcf0");
      const R2 = { x0: 3.06, x1: 9.5, zf: -0.2, h: 13.8 };
      b.box(brickR, R2.x0, 0, R2.zf - 7, R2.x1, R2.h, R2.zf);
      b.box(paint, R2.x0 - 0.05, R2.h, R2.zf - 7.05, R2.x1, R2.h + 0.4, R2.zf + 0.1, "#e8d8c8");
      b.box(paint, R2.x0 - 0.05, 3.0, R2.zf, R2.x1, 3.2, R2.zf + 0.1, "#e8d8c8");
      for (const [x0, x1, zf2, rows] of [[L.x0, L.x1, L.zf, [1.2, 4.2, 7.0]], [R2.x0, R2.x1, R2.zf, [1.0, 3.9, 6.6, 9.3, 12.0]]] as [number, number, number, number[]][]) {
        const cols = [x0 + 1.2, (x0 + x1) / 2, x1 - 1.2];
        for (const y of rows) for (const x of cols) {
          fu.box(paint, x - 0.5, y - 0.08, zf2, x + 0.5, y + 1.38, zf2 + 0.06, "#e8e4f0");
          fu.add(new THREE.PlaneGeometry(0.84, 1.3), dark, TRS(x, y + 0.65, zf2 + 0.065));
          fu.box(paint, x - 0.015, y, zf2 + 0.06, x + 0.015, y + 1.3, zf2 + 0.08, "#e8e4f0");
          fu.box(paint, x - 0.6, y - 0.16, zf2, x + 0.6, y - 0.08, zf2 + 0.16, "#e8e4f0");
        }
      }
      const tx = 7.2, tz = -3.5, ty = R2.h + 0.4;
      for (const dx of [-0.6, 0.6]) for (const dz of [-0.6, 0.6]) cast.rod(metal, V3(tx + dx, ty, tz + dz), V3(tx + dx * 0.8, ty + 1.6, tz + dz * 0.8), 0.04, 6, "#3a2a2a");
      cast.lathe(paint, [[0.001, 0], [0.95, 0], [0.95, 1.6], [1.02, 1.6], [0.001, 2.3]], TRS(tx, ty + 1.6, tz), 20, "#8a5a3a");
    }
    // ---- street furniture: the lamp post, the red bike, a street tree, a fire hydrant ----
    {
      const lx = 3.7, lz = 2.3;
      cast.lathe(metal, [[0.001, 0], [0.16, 0], [0.16, 0.12], [0.1, 0.2], [0.08, 0.6], [0.06, 0.7], [0.001, 0.7]], TRS(lx, 0.12, lz), 14, "#2a4a3a");
      cast.rod(metal, V3(lx, 0.8, lz), V3(lx, 3.3, lz), 0.05, 10, "#2a4a3a");
      cast.lathe(metal, [[0.001, 0], [0.1, 0], [0.14, 0.05], [0.001, 0.05]], TRS(lx, 3.3, lz), 10, "#2a4a3a");
      cast.lathe(metal, [[0.001, 0], [0.18, 0.0], [0.24, 0.05], [0.001, 0.2]], TRS(lx, 3.78, lz), 6, "#2a4a3a");
      for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2 + Math.PI / 6; cast.rod(metal, V3(lx + Math.cos(a) * 0.125, 3.35, lz + Math.sin(a) * 0.125), V3(lx + Math.cos(a) * 0.17, 3.78, lz + Math.sin(a) * 0.17), 0.012, 4, "#2a4a3a"); }
      fu.lathe(imat(S, { col: "#000000", em: [3.2, 2.2, 1.0] }), [[0.001, 0], [0.11, 0], [0.145, 0.42], [0.001, 0.42]], TRS(lx, 3.35, lz), 6);
      cast.sph(metal, TRS(lx, 4.0, lz, 0, 0, 0, 0.04), 8, "#2a4a3a");
      const bx = 1.9, by = 0.12, bz = 2.05, M = TRS(bx, by, bz, 0, 0.06);
      const m = (x: number, y: number, z = 0) => V3(x, y, z).applyMatrix4(M);
      const mm = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => new THREE.Matrix4().multiplyMatrices(M, TRS(x, y, z, ry, rx, rz, s));
      const wr = 0.33;
      for (const wx of [-0.55, 0.55]) {
        cast.torus(plain, wr, 0.035, mm(wx, wr, 0), "#1c1c26", Math.PI * 2, 8);
        cast.torus(metal, wr - 0.04, 0.008, mm(wx, wr, 0), "#c8ccd8", Math.PI * 2, 5);
        for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI; cast.rod(metal, m(wx + Math.cos(a) * 0.28, wr + Math.sin(a) * 0.28), m(wx - Math.cos(a) * 0.28, wr - Math.sin(a) * 0.28), 0.004, 4, "#c8ccd8"); }
      }
      const RED2 = "#e8343c";
      cast.rod(gloss, m(-0.55, wr), m(-0.1, wr), 0.022, 6, RED2); cast.rod(gloss, m(-0.1, wr), m(-0.22, 0.85), 0.024, 6, RED2);
      cast.rod(gloss, m(-0.55, wr), m(-0.24, 0.8), 0.022, 6, RED2); cast.rod(gloss, m(-0.1, wr), m(0.42, 0.82), 0.026, 6, RED2);
      cast.rod(gloss, m(-0.22, 0.82), m(0.42, 0.84), 0.024, 6, RED2); cast.rod(gloss, m(0.42, 0.84), m(0.55, wr), 0.022, 6, RED2);
      cast.rod(gloss, m(0.42, 0.84), m(0.38, 1.02), 0.02, 6, "#3a3a44");
      cast.rod(gloss, m(0.38, 1.02, -0.22), m(0.38, 1.02, 0.22), 0.016, 6, "#3a3a44");
      for (const s of [-1, 1]) cast.cyl(plain, 0.022, 0.022, 0.09, 8, mm(0.38, 1.02, s * 0.24, 0, Math.PI / 2), "#f2e6c8");
      cast.rbox(plain, 0.24, 0.06, 0.12, 0.03, mm(-0.22, 0.9, 0), "#4a3020");
      cast.rbox(plain, 0.3, 0.2, 0.32, 0.03, mm(0.62, 0.9, 0), "#f2dcb0");
      for (let q = 0; q < 6; q++) cast.sph(gloss, mm(0.55 + (q % 3) * 0.06, 1.02 + (q > 2 ? 0.04 : 0), -0.08 + (q % 2) * 0.12, 0, 0, 0, 0.04), 8, ["#ff6a8a", "#ffd34a", "#ffffff"][q % 3]);
      cast.rod(metal, m(-0.1, wr), m(-0.02, 0.02, 0.18), 0.012, 5, "#3a3a44");
      const tx = -4.7, tz = 1.9;
      cast.rod(plain, V3(tx, 0.12, tz), V3(tx, 2.6, tz), 0.12, 8, "#5a3a2a");
      cast.box(plain, tx - 0.5, 0.12, tz - 0.5, tx + 0.5, 0.15, tz + 0.5, "#3a2a20");
      const r = rng(91);
      for (let q = 0; q < 9; q++) cast.sph(plain, TRS(tx + (r() - 0.5) * 1.6, 3.2 + r() * 1.3, tz + (r() - 0.5) * 1.2, 0, 0, 0, 0.6 + r() * 0.35), 14, q % 2 ? "#3a8a4a" : "#2e7a42");
      cast.lathe(gloss, [[0.001, 0], [0.12, 0], [0.12, 0.05], [0.09, 0.08], [0.09, 0.5], [0.1, 0.52], [0.07, 0.62], [0.001, 0.64]], TRS(-2.5, 0.12, 2.35), 14, "#e8343c");
      for (const s of [-1, 1]) cast.cyl(gloss, 0.04, 0.04, 0.08, 8, TRS(-2.5 + s * 0.12, 0.5, 2.35, 0, 0, Math.PI / 2), "#e8343c");
    }
    b.build(R); fu.build(R); cast.build(R, true);
    { // far skyline silhouette (NOINK cut-out card)
      const m = new THREE.MeshBasicMaterial({ map: skylineTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(0.9, 0.95, 1.15) });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(160, 40), m); card.position.set(0, 14, -70); card.layers.set(NOINK); card.renderOrder = -0.5; R.add(card);
    }
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), color: new THREE.Color(1.6, 1.6, 1.55), fog: false, depthWrite: false, transparent: true }));
    this.moon.position.set(-22, 46, -78); this.moon.scale.setScalar(26); this.moon.layers.set(NOINK); this.moon.renderOrder = -0.4; R.add(this.moon);
    {
      const r = rng(55), items: GlowItem[] = [];
      for (let q = 0; q < 240; q++) {
        const az = (r() - 0.5) * 1.9, el = 0.12 + r() * 1.0, d = 300;
        items.push({ p: V3(Math.sin(az) * Math.cos(el) * d, 6 + Math.sin(el) * d, -Math.cos(az) * Math.cos(el) * d), c: r() < 0.15 ? [1.6, 1.5, 1.2] : [0.8, 0.85, 1.0], s: 0.9 + r() * r() * 2.6, g: 0, tw: 1 });
      }
      this.stars = new Glows(R, items, 1);
      this.stars.mesh.renderOrder = -0.3;
    }
    const spill: GlowItem[] = [];
    for (let i = 0; i < 10; i++) { const k = Math.floor(i / 2), xc = XC[i % 2], st = WSTY[i]; spill.push({ p: V3(xc, yk(k) + (SILL + TOP) / 2, 0.35), c: [st.lamp[0] * 0.035, st.lamp[1] * 0.03, st.lamp[2] * 0.03], s: 2.4, g: 0 }); }
    spill.push({ p: V3(3.7, 3.55, 2.3), c: [0.9, 0.6, 0.28], s: 2.2, g: 1 }, { p: V3(3.7, 3.55, 2.3), c: [0.3, 0.2, 0.09], s: 6.0, g: 1 });
    spill.push({ p: V3(0, 2.45, 0.2), c: [0.35, 0.24, 0.1], s: 1.3, g: 2 });
    this.glows = new Glows(R, spill, 1.5);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    (S.u.uSD.value as THREE.Vector3).copy(worldSun(id)); (S.u.uSC.value as THREE.Vector3).set(0.95, 1.12, 1.6); S.u.uOpen.value = 1;
    (S.u.uKC.value as THREE.Vector3).set(0, 0, 0); S.u.uAO.value = 0; S.u.uTT.value = t;
    const L: LDef[] = [];
    for (let i = 0; i < 10; i++) { const k = Math.floor(i / 2), xc = BK.XC[i % 2], st = WSTY[i]; L.push({ p: W2(xc + 0.25, BK.Y0 + BK.FH * k + 1.45, -0.9), c: st.lamp, r: 1.05 }); }
    L.push({ p: W2(3.7, 3.5, 2.3), c: [2.8, 1.8, 0.8], r: 3.0 });
    L.push({ p: W2(0, 2.4, 0.35), c: [0.9, 0.6, 0.26], r: 0.9 });
    setLights(S, L, [0.2, 0.24, 0.46], [0.08, 0.07, 0.14]);
    this.glows.mat.uniforms.uT.value = t; this.stars.mat.uniforms.uT.value = t;
  }
}
/** quoins skip the floor bands */
const k4band = (y: number) => { for (let k = 1; k <= 4; k++) { const yb = BK.Y0 + BK.FH * k; if (y < yb + 0.02 && y + 0.46 > yb - 0.1) return true; } return false; };
/** the world's camera-relative sun for a shot (same formula as world.shotSun): the block's moon key + card shadows */
const sunCache = new Map<number, THREE.Vector3>();
const worldSun = (id: number) => {
  let v = sunCache.get(id);
  if (v) return v;
  const s = SHOTS[id - 1], L = LOOKS[s.look];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  sunCache.set(id, v);
  return v;
};

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { bedroom: [-0.2, 1.55, 3.9, -0.2, 0.95, -0.6, 48], block: [0, 7.5, 26, 0, 8.2, 0, 50] };
export class Sets {
  root = new THREE.Group();
  private room = new Room();
  private block = new Block();
  constructor() { this.root.add(this.room.root, this.block.root); }
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const pc = cam as THREE.PerspectiveCamera, o = place === "block" ? BLOCK : BEDROOM, d = DEBUG_VIEW[place];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = d[6]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    this.room.root.visible = place === "bedroom";
    this.block.root.visible = place === "block";
    if (this.room.root.visible) this.room.update(id, t, cam);
    if (this.block.root.visible) this.block.update(id, t);
  }
}
