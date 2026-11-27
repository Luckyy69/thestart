// OWNER: sets. "Rain Tires": BEAN's golden BATHROOM (shots 1, 2, 6) and the cosy wet-marble LAB (shot 4). All new.
//
// Both sets light themselves with their OWN small shader rig (technique: jerk sets): ambient (blue from above, warm
// from below), painted room AO, up to 12 soft point lights, and a LOW GOLDEN SUN that only enters through a window:
// per pixel a surface is lit only if its ray toward the sun passes the window aperture minus its glazing bars (and
// the arch), so the sun lays barred window patches over BEAN, the foam, the tub and the floor (LAB: across the table,
// the contestants and the back wall). The world's sun shadow map darkens the patch (cards, sill bottles, the hanging
// plant and the tub keep long shadows). A ray-marched steam shaft (NOINK, additive) shows the bars in the air;
// sparkles glow only in the beam; soft steam puffs rise from the tub.
//   bath    : golden late afternoon, blue shade.
//   shot 2  : (keyed on id 2, whatever its look) the room dims while the holo shows (holoAt.show) and goes COLD
//             ELECTRIC BLUE on the "ON PURPOSE" stamp (holoAt.stamp, ~f383-389): the turn.
//   bathend : the same low sun, a little pinker, RAIN on the window (streaks + drops) and rain-drop shadows sliding
//             down the sun patch.
//   lab -> peak : golden; at the peak (LOOK_RAMPS lab->peak 772..782) the rig is pushed to a hot punch.
//
// SUN: BATH uses the looks owner's world sun BATH_SUN_DIR = (-0.79, 0.24, -0.56) (from the BACK-LEFT) through the
//   arched back window. LAB uses SUN_DIR = sunAz -110, sunEl 17 (from screen-left, a touch behind the camera) through
//   its left-wall window: looks.ts "lab"/"peak" should use az -110 / el 17 so card shadows agree.
//
// CONTRACTS (world = place anchor + local, metres). BATH = story BATH, LAB = story LAB.
//   BATH: floor y 0, back wall z -0.55 (tiles to y 1.25, butter paint above), side walls x -1.25 / 1.3, ceiling 2.6,
//     open toward +z (floor to z 3.6; >= 3 m clear in front of the tub for cameras; nothing between the tub and the
//     shot-2 camera at ~(0.31, 1.32, 2.02)).
//     TUB (clawfoot, along x): outer x -0.85..0.85, z -0.38..0.38, RIM y 0.62 (lip top 0.65), inner floor y 0.22.
//     BEAN_SEAT = BATH + (0, 0.35, 0), facing +z, chest-deep in foam. FOAM_TOP = 0.8 (foam line in front of BEAN, the
//       front of the foam is z 0.05..0.36); foam mounds to ~0.9 at the tub ends. props.ts foamY(x, z, t) = surface.
//     WINDOW (the SUN window, back-left, frosted, rain in shot 6): arched, x -1.0..-0.35, y 1.05..2.025 (rect to
//       1.7, arch centre (-0.675, 1.7) r 0.325), sash at z -0.63. Deep sill y 1.05 with bottles + a candle.
//     MIRROR (fogged, a wiped smiley) centre (0.47, 1.78, -0.55); towel rail y 1.32 x 0.24..0.74; hanging plant pot
//       (-0.78, 2.02, -0.3); taps on the back rim at x 0.66; bath mat z 0.58..1.12; stool (1.05, 0, 0.6).
//   LAB: floor y 0, back wall z -1.6, left wall x -1.9 (the SUN window z -1.2..0.9, y 0.9..2.2), right wall x 1.9.
//     TABLE top y 0.8, x -1.0..1.0, z -0.22..0.38 (front panel z 0.38, name plates "SMOOTH" left / "WRINKLY" right).
//     LAB_SEATS (= cast): SMOOTH LAB + (-0.55, 0, -0.3), WRINKLY LAB + (0.55, 0, -0.3); no stools (hidden by the table).
//     BOWLS (= cast LAB_BOWLS, base on the table top): SMOOTH water (-0.66, 0.8, 0.05) -> empty (-0.24, 0.8, 0.05);
//       WRINKLY water (0.66, 0.8, 0.05) -> empty (0.24, 0.8, 0.05). Bowl radius 0.12, rim height 0.07.
//     STOPWATCH: a big DESK stopwatch front-centre on the table, dial centre (0, 0.98, 0.3), r 0.15 (the wall behind
//       the referee stays clear); BANNER "WET MARBLE CHALLENGE" centre (0, 2.07, -1.55) 1.8 x 0.46.
//     REFEREE (= cast REF_AT) LAB + (0, 0, -0.85). The trophy is cast's (fx card).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { BATH, LAB, SHOTS, V3 as SV3, W, holoAt, labAt, smooth, clamp01 } from "./story";

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export type C3 = [number, number, number];
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ exported contracts (world coordinates)
export const SUN_AZ = -110, SUN_EL = 17;
/** LAB: toward the sun (world), for cameras looking -z: az SUN_AZ, el SUN_EL (through the lab's left-wall window) */
export const SUN_DIR: C3 = (() => { const a = THREE.MathUtils.degToRad(SUN_AZ), e = THREE.MathUtils.degToRad(SUN_EL); return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; })();
/** BATH: the looks owner's world sun (toward the sun): from the BACK-LEFT, through the arched back window */
export const BATH_SUN_DIR: C3 = (() => { const v = new THREE.Vector3(-0.79, 0.24, -0.56).normalize(); return [v.x, v.y, v.z]; })();
export const TUB = { x0: BATH[0] - 0.85, x1: BATH[0] + 0.85, z0: BATH[2] - 0.38, z1: BATH[2] + 0.38, rim: BATH[1] + 0.62, lip: BATH[1] + 0.65, floor: BATH[1] + 0.22, a: 0.85, b: 0.38 };
export const BEAN_SEAT = add(BATH, 0, 0.35, 0);
export const FOAM_TOP = BATH[1] + 0.8;
export const WINDOW = { c: add(BATH, -0.675, 1.54, -0.63), x0: BATH[0] - 1.0, x1: BATH[0] - 0.35, y0: BATH[1] + 1.05, y1: BATH[1] + 2.025, archC: add(BATH, -0.675, 1.7, -0.63), archR: 0.325 };
export const MIRROR = add(BATH, 0.47, 1.78, -0.55);
export const LAB_TABLE = { y: LAB[1] + 0.8, x0: LAB[0] - 1.0, x1: LAB[0] + 1.0, z0: LAB[2] - 0.22, z1: LAB[2] + 0.38 };
export const LAB_SEATS = { smooth: add(LAB, -0.55, 0, -0.3), wrinkly: add(LAB, 0.55, 0, -0.3) }; // = cast LAB_SEATS (card anchors)
export const BOWL_R = 0.12, BOWL_H = 0.08;
export const BOWLS = {
  smooth: { full: add(LAB, -0.66, 0.8, 0.05), empty: add(LAB, -0.24, 0.8, 0.05) },   // = cast LAB_BOWLS
  wrinkly: { full: add(LAB, 0.66, 0.8, 0.05), empty: add(LAB, 0.24, 0.8, 0.05) },
};
export const STOPWATCH = add(LAB, 0, 0.98, 0.3); // a big desk stopwatch, front-centre on the table (clear of the referee)
export const BANNER = add(LAB, 0, 2.07, -1.55);
export const REFEREE = add(LAB, 0, 0, -0.85); // = cast REF_AT

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
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2, rs = 10) { this.add(new THREE.TorusGeometry(R, r, rs, 48, arc), mat, mx, col); }
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
/** a side wall at x = x0 running along z (z0..z1), facing +x or -x; uv (z, y) in metres; holes [za, zb, ya, yb] */
const wallX = (x0: number, z0: number, z1: number, y0: number, y1: number, holes: number[][] = []) => {
  const g = wallZ(z0, z1, y0, y1, 0, holes), p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const a = p.getX(i); p.setXYZ(i, x0, p.getY(i), a); }
  g.computeVertexNormals();
  return g;
};
/** a hanging drape: vertical folds (facing +z), top edge at y=0 going down to -h, width w */
const drape = (w: number, h: number, folds: number, amp: number, seed: number, tie = 0.62, gatherK = 0.42) => {
  const g = new THREE.PlaneGeometry(w, h, Math.max(8, folds * 8), 10), p = g.getAttribute("position") as THREE.BufferAttribute, r = rng(seed);
  const ph = r() * 6.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), v = (h / 2 - y) / h;
    const gather = 1 - gatherK * Math.exp(-(((v - tie) / 0.16) ** 2)) - 0.12 * Math.min(1, v / tie);
    p.setXYZ(i, x * gather, y - h / 2, amp * (0.55 + 0.45 * v) * Math.sin((x / w) * folds * Math.PI * 2 + ph + v * 0.6));
  }
  g.computeVertexNormals();
  return g;
};

// ============================================================ the light shader (own rig)
const NL = 12;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uO; uniform vec4 uBox; uniform float uAO; uniform float uRain; uniform vec3 uArch;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// the sun arriving along d (unit, toward the sun) through the window aperture minus its glazing bars, 0..1
float apK(vec3 p, vec3 d, float leaf){
  float den = dot(d, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + d * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.003 + 0.007 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (uArch.x > 0.5 && a.y > uArch.y) k *= 1.0 - smoothstep(uArch.z - pen, uArch.z + pen, length(vec2(a.x, a.y - uArch.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float e = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float e = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (leaf > 0.0 && uWM.w > 0.0) { // a tree outside: a soft leafy dapple in the top of the window, swaying
    vec2 s = a * 2.6 + vec2(sin(uTT * 0.31), cos(uTT * 0.23)) * 0.06;
    float nz = tn2(s + 11.0) * 0.62 + tn2(s * 2.7 + 5.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.52, 0.72 + pen * 2.0, nz) * smoothstep(0.1, 0.9, a.y / uWH.y);
  }
  if (leaf > 0.0 && uRain > 0.0) { // rain running down the glass: drop shadows slide down the patch
    vec2 s = vec2(a.x * 9.0, a.y * 3.0 + uTT * 1.6);
    float col = floor(s.x), off = th2(vec2(col, 3.0));
    float y = fract(s.y * 0.5 + off * 7.0), xx = fract(s.x) - 0.5 - 0.15 * sin(s.y * 3.0 + col);
    float drop = smoothstep(0.14, 0.04, abs(xx)) * smoothstep(0.0, 0.12, y) * smoothstep(0.55, 0.2, y);
    k *= 1.0 - uRain * 0.55 * drop * step(0.45, off);
    k *= 1.0 - uRain * 0.18 * smoothstep(0.55, 0.8, tn2(a * 14.0 + vec2(0.0, uTT * 0.4)));
  }
  return k;
}
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(min(uBox.x - abs(l.x), l.z - uBox.y), uBox.z - l.y), 9.0);
  float a = smoothstep(0.0, 0.6, dw) * 0.4 + 0.6;
  float b = smoothstep(0.0, 0.32, l.y) * 0.3 + 0.7;
  float k = min(a, 1.0) * (l.y > 0.004 ? b : 1.0);
  return mix(1.0, k, uAO);
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.72 + 0.28 * sh) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.75 + 0.25 * sh) * (0.5 + 0.5 * ao);
  }
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = apK(p, uSD, 1.0); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * (0.12 + 0.88 * sh); }
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
  vec4 lp = vec4(position, 1.0); vec3 ln = normal;
#ifdef USE_INSTANCING
  lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
#endif
  vec4 w = modelMatrix * lp; vW = w.xyz; vN = normalize(mat3(modelMatrix) * ln); vUv = uv; vC = color;
#ifdef USE_INSTANCING_COLOR
  vC *= instanceColor;
#endif
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform vec3 uSelf; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uRim;
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
  vec3 lit = lightAt(vW, n, sh);
  vec3 c = uCol * vC * tx.rgb * (lit + uSelf) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm;
#endif
  vec3 v = normalize(cameraPosition - vW);
  if (uRim > 0.0) c += uRim * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (uAU * 0.8 + uSC * 0.08 * apK(vW, uSD, 0.0));
#ifdef SPEC
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * apK(vW, uSD, 0.0) * uSpecK * 1.4 * sh;
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
      uSD: { value: V3(...SUN_DIR) }, uSC: { value: V3(0, 0, 0) }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(1, 0, 0) },
      uWU: { value: V3(0, 0, 1) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(2, 2, 0.02, 0) },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 1 }, uRain: { value: 0 }, uArch: { value: V3(0, 0, 1) },
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
export type MOpt = { col?: string; map?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number]; rim?: number };
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
      uRim: { value: o.rim ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};
/** the two rigs (props.ts builds its props on them) */
let bathS: LSet | null = null, labS: LSet | null = null;
export const bathRig = () => bathS ?? (bathS = lset());
export const labRig = () => labS ?? (labS = lset());

// ============================================================ volumetrics + glows (NOINK, additive)
/** ray-marched steam haze inside the window prism: the bars show in the beam */
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
          float acc = 0.0; float dt = tB / 24.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 24; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (p.y < uFloor + 0.01) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(0.55, 1.0, along));
            float nz = 0.45 + 0.55 * tn2(p.xz * 2.4 + vec2(p.y * 2.1 - uTT * 0.12, uTT * 0.05));
            acc += apK(p, uSD, 1.0) * fall * nz * smoothstep(0.5, 1.4, length(p - cameraPosition));
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
  // eL / eT widen the march box toward -U / +V (apK still bounds the beam): its side faces then cross no card, so the
  // depth-tested front face never steps across BEAN (that drew a hard haze seam down his face)
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, hx: number, hy: number, d: THREE.Vector3, len: number, col: C3, k: number, O: THREE.Vector3, eL = 0, eT = 0) {
    const a = U.clone().multiplyScalar(2 * hx + 0.06 + eL), b = Vv.clone().multiplyScalar(2 * hy + 0.06 + eT), e = d.clone().multiplyScalar(len);
    const cen = c.clone().addScaledVector(d, len / 2).addScaledVector(U, -eL / 2).addScaledVector(Vv, eT / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    (this.mat.uniforms.uInv.value as THREE.Matrix3).setFromMatrix4(m).invert();
    (this.mat.uniforms.uCen.value as THREE.Vector3).copy(cen).add(O);
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(...col); this.mat.uniforms.uK.value = k; this.mat.uniforms.uFloor.value = O.y;
    this.mesh.visible = k > 0.002;
  }
}
/** sparkles: glow only inside the sunbeam (steam droplets / dust) */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.003 + 0.006 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.12 + sin(uT * 0.09 + ph * 3.0) * 0.05,
            sin(uT * 0.15 * sp + ph * 2.0) * 0.1, cos(uT * 0.19 * sp + ph * 1.3) * 0.12);
          vec3 L = uSC * apK(p, uSD, 0.0) * 0.7 + (uAU + uAD) * 0.02;
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
/** soft STEAM puffs rising from the tub (NOINK, normal blend, low alpha): lit warm in the sunbeam, cool in the shade */
class Steam {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 4), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      // start points over the tub's foam, avoiding a column in front of BEAN's face (|x| < 0.3 near the front)
      let x = (r() * 2 - 1) * 0.8;
      const z = (r() * 2 - 1) * 0.3;
      if (Math.abs(x) < 0.3) x = (x < 0 ? -1 : 1) * (0.3 + r() * 0.5);
      P.set([x, 0.85, z - 0.1, 0.22 + r() * 0.3], i * 4);
      D.set([r(), 0.06 + r() * 0.07, (x < 0 ? -1 : 1) * r(), r()], i * 4);
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 }, uTint: { value: V3(1, 1, 1) } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iS; uniform float uT; varying vec3 vC; varying vec2 vQ; varying float vA;
        uniform vec3 uTint;
        ${CORE}
        void main(){
          float life = fract(uT * iS.y + iS.x);
          vec3 p = (modelMatrix * vec4(iP.xyz, 1.0)).xyz + vec3(iS.z * 0.25 * life + 0.05 * sin(uT * 0.7 + iS.x * 9.0), life * 1.5, -0.12 * life);
          float s = iP.w * (0.55 + 0.9 * life);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float rot = iS.w * 6.28 + uT * 0.2 * iS.z;
          vec2 qq = mat2(cos(rot), -sin(rot), sin(rot), cos(rot)) * position.xy;
          vec3 w = p + (right * qq.x + up * qq.y) * s;
          vQ = position.xy * 2.0;
          float dist = length(cameraPosition - p);
          vA = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.55, 1.0, life)) * smoothstep(0.9, 1.8, dist);
          vC = (uAU * 1.6 + uAD * 0.6 + uSC * apK(p, uSD, 0.0) * 0.55) * uTint;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uK; varying vec3 vC; varying vec2 vQ; varying float vA;
        void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 2.6) * (1.0 - smoothstep(0.7, 1.0, r2));
          a *= 0.75 + 0.25 * sin(vQ.x * 3.1 + vQ.y * 2.3);
          gl_FragColor = vec4(vC, a * vA * uK); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; parent.add(this.mesh);
  }
}

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
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
const duckIcon = (g: G, x: number, y: number, s: number, body = "#ffd23a", beak = "#ff8a2a") => {
  g.fillStyle = body; g.beginPath(); g.ellipse(x, y + s * 0.25, s * 0.62, s * 0.4, 0, 0, 7); g.fill();
  g.beginPath(); g.arc(x - s * 0.3, y - s * 0.22, s * 0.3, 0, 7); g.fill();
  g.fillStyle = beak; g.beginPath(); g.ellipse(x - s * 0.66, y - s * 0.16, s * 0.18, s * 0.08, 0, 0, 7); g.fill();
  g.fillStyle = "#1c1c28"; g.beginPath(); g.arc(x - s * 0.36, y - s * 0.28, s * 0.06, 0, 7); g.fill();
};

// ---------------- BATH textures
/** aqua glazed wall tiles, 10 cm, white grout, glaze sheen, a few hand-painted duck / bubble tiles; 0.8 m tile */
const tileTex = () => ctex("wrTileAqua", 1024, 1024, (g, r) => {
  const n = 8, s = 1024 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const l = 56 + r() * 7, h = 174 + r() * 8;
    g.fillStyle = `hsl(${h},${52 + r() * 10}%,${l}%)`; g.fillRect(i * s, j * s, s, s);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(0.45, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(0,40,60,0.12)");
    g.fillStyle = gr; g.fillRect(i * s, j * s, s, s);
    const k = (i * 7 + j * 3) % 11;
    if (k === 0) duckIcon(g, i * s + s * 0.52, j * s + s * 0.5, s * 0.34, "#fff4c0", "#ffb07a");
    else if (k === 5) { g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 5; for (const [bx, by, br] of [[0.35, 0.6, 0.16], [0.62, 0.38, 0.11], [0.68, 0.7, 0.07]]) { g.beginPath(); g.arc(i * s + bx * s, j * s + by * s, br * s, 0, 7); g.stroke(); } }
  }
  g.strokeStyle = "#f2fbf8"; g.lineWidth = 9;
  for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, 1024); g.moveTo(0, k * s); g.lineTo(1024, k * s); g.stroke(); }
  g.strokeStyle = "rgba(30,90,100,0.35)"; g.lineWidth = 2;
  for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s + 5, 0); g.lineTo(k * s + 5, 1024); g.moveTo(0, k * s + 5); g.lineTo(1024, k * s + 5); g.stroke(); }
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.025);
});
/** butter-yellow painted plaster with white soap-bubble rings, 1 m tile */
const paintTex = () => ctex("wrPaintButter", 1024, 1024, (g, r) => {
  g.fillStyle = "#ffdf96"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 140; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 150, r() < 0.5 ? "255,240,200" : "230,180,110", 0.08, 1024, 1024);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const x = i * 128 + (j % 2 ? 64 : 0) + 32, y = j * 128 + 64, rr = 10 + ((i * 5 + j * 3) % 3) * 5;
    g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 4; g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.22, 0, 7); g.fill();
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** floor: cream + coral diamond tiles, 1 m tile */
const floorTex = () => ctex("wrFloorDiamond", 1024, 1024, (g, r) => {
  g.fillStyle = "#fff2dc"; g.fillRect(0, 0, 1024, 1024);
  const n = 5, s = 1024 / n;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const cx = i * s, cy = j * s, h = s * 0.5;
    g.fillStyle = `hsl(${10 + r() * 8},${62 + r() * 10}%,${66 + r() * 5}%)`;
    g.beginPath(); g.moveTo(cx, cy - h); g.lineTo(cx + h, cy); g.lineTo(cx, cy + h); g.lineTo(cx - h, cy); g.closePath(); g.fill();
    g.strokeStyle = "rgba(160,90,70,0.35)"; g.lineWidth = 4; g.stroke();
  }
  for (let i = 0; i < 80; i++) blot(g, r() * 1024, r() * 1024, 50 + r() * 120, "120,80,60", 0.05, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.03);
});
/** fluffy sky-blue bath mat with white waves and a fringe */
const matTex = () => ctex("wrBathMat", 1024, 512, (g, r) => {
  g.fillStyle = "#7cc8ff"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#ffffff"; g.lineWidth = 22; g.lineCap = "round";
  for (const y of [150, 256, 362]) { g.beginPath(); for (let x = 60; x <= 964; x += 8) g.lineTo(x, y + Math.sin(x / 50) * 22); g.stroke(); }
  for (let k = 0; k < 26000; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.14)" : "rgba(20,70,140,0.12)"; g.fillRect(r() * 1024, r() * 512, 2, 4); }
  g.fillStyle = "#ffffff"; for (let x = 0; x < 1024; x += 16) { g.fillRect(x, 0, 6, 26); g.fillRect(x, 486, 6, 26); }
});
/** coral + cream striped towel */
const towelTex = () => ctex("wrTowel", 512, 512, (g, r) => {
  g.fillStyle = "#ff8a7a"; g.fillRect(0, 0, 512, 512);
  for (const [y, h, c] of [[60, 40, "#fff4e0"], [120, 14, "#fff4e0"], [380, 14, "#fff4e0"], [412, 40, "#fff4e0"], [100, 8, "#ffd23a"], [470, 8, "#ffd23a"]] as [number, number, string][]) { g.fillStyle = c; g.fillRect(0, y, 512, h); }
  for (let k = 0; k < 16000; k++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(120,30,30,0.12)"; g.fillRect(r() * 512, r() * 512, 2, 3); }
});
/** fogged mirror: a misty blue-white with a wiped smiley, drips, a sheen */
const mirrorTex = () => ctex("wrMirrorFog", 512, 640, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 512, 640); gr.addColorStop(0, "#d8eef4"); gr.addColorStop(0.5, "#b8d8e6"); gr.addColorStop(1, "#e8f2f0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 640, 40 + r() * 90, "255,255,255", 0.25, 512, 640);
  g.strokeStyle = "rgba(70,110,140,0.75)"; g.lineWidth = 26; g.lineCap = "round";
  g.beginPath(); g.arc(256, 300, 120, 0.25, Math.PI - 0.25); g.stroke();
  g.beginPath(); g.arc(205, 245, 6, 0, 7); g.stroke(); g.beginPath(); g.arc(307, 245, 6, 0, 7); g.stroke();
  for (let k = 0; k < 9; k++) { g.lineWidth = 6; g.strokeStyle = "rgba(70,110,140,0.45)"; const x = 150 + k * 25 + r() * 10; g.beginPath(); g.moveTo(x, 400 + r() * 20); g.lineTo(x + r() * 4, 470 + r() * 80); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.4)"; g.beginPath(); g.moveTo(60, 40); g.lineTo(130, 40); g.lineTo(40, 200); g.lineTo(40, 90); g.fill();
});
/** the frosted back window: warm low-sun glow, frosted swirl, little bubble decals */
const frostTex = () => ctex("wrFrostGold", 512, 768, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, "#ffd9a0"); gr.addColorStop(0.55, "#ffbf86"); gr.addColorStop(1, "#ff9e8a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 768);
  const sg = g.createRadialGradient(140, 520, 10, 140, 520, 360); sg.addColorStop(0, "rgba(255,250,220,1)"); sg.addColorStop(0.35, "rgba(255,230,170,0.6)"); sg.addColorStop(1, "rgba(255,200,150,0)");
  g.fillStyle = sg; g.fillRect(0, 0, 512, 768);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 768, 30 + r() * 80, "255,255,255", 0.12, 512, 768);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 5;
  for (let k = 0; k < 14; k++) { const x = r() * 512, y = r() * 768, rr = 10 + r() * 26; g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); }
  noise(g, 0, 0, 512, 768, r, 9000, 0.05);
});
/** striped shower curtain (sunny yellow + white, little ducks) */
const curtainTex = () => ctex("wrCurtainDucks", 512, 512, (g) => {
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#ffffff" : "#ffd84a"; g.fillRect(k * 64, 0, 64, 512); }
  for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) duckIcon(g, k * 128 + 96, j * 128 + 64 + (k % 2) * 40, 24, "#ff9a3a", "#e8343c");
});
/** the left (sun) window glass: bright gold sky, frosted lower sash */
const sunGlassTex = () => ctex("wrSunGlass", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffe6b0"); gr.addColorStop(1, "#ffc890"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const sg = g.createRadialGradient(256, 300, 10, 256, 300, 260); sg.addColorStop(0, "rgba(255,255,240,1)"); sg.addColorStop(1, "rgba(255,240,200,0)"); g.fillStyle = sg; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(0, 256, 512, 256);
  noise(g, 0, 256, 512, 256, r, 6000, 0.06);
});

// ---------------- LAB textures
/** pale mint lab wall with a soft painted mottle; 1 m tile */
const labWallTex = () => ctex("wrLabWall", 1024, 1024, (g, r) => {
  g.fillStyle = "#bfe8d8"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 160, r() < 0.5 ? "230,255,245" : "120,190,170", 0.08, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** wainscot: white subway tiles, 0.6 m tile */
const subwayTex = () => ctex("wrSubway", 1024, 1024, (g, r) => {
  g.fillStyle = "#9ab8c0"; g.fillRect(0, 0, 1024, 1024);
  const bw = 256, bh = 1024 / 12;
  for (let j = 0; j < 12; j++) for (let i = -1; i < 5; i++) {
    const x = i * bw + (j % 2 ? bw / 2 : 0), y = j * bh;
    g.fillStyle = `hsl(195,${20 + r() * 10}%,${90 + r() * 5}%)`; rrect(g, x + 4, y + 4, bw - 8, bh - 8, 10); g.fill();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(x + 12, y + 8, bw - 24, 6);
  }
  noise(g, 0, 0, 1024, 1024, r, 10000, 0.03);
});
/** blue + white checker lino, 0.9 m tile */
const linoTex = () => ctex("wrLino", 1024, 1024, (g, r) => {
  const n = 4, s = 1024 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { g.fillStyle = (i + j) % 2 ? `hsl(214,${55 + r() * 8}%,${58 + r() * 4}%)` : `hsl(40,40%,${93 + r() * 3}%)`; g.fillRect(i * s, j * s, s, s); }
  for (let i = 0; i < 120; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 120, "80,80,120", 0.05, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 16000, 0.03);
});
/** honey wood (bench top), 1 m tile */
const woodTex = () => ctex("wrWoodHoney", 1024, 1024, (g, r) => {
  const bw = 1024 / 5;
  for (let i = 0; i < 5; i++) {
    g.fillStyle = `hsl(${30 + r() * 6},${60 + r() * 10}%,${56 + r() * 6}%)`; g.fillRect(0, i * bw, 1024, bw);
    for (let k = 0; k < 18; k++) { g.strokeStyle = `rgba(130,70,20,${0.06 + r() * 0.1})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const y0 = i * bw + 6 + r() * (bw - 12); g.moveTo(0, y0); for (let s = 0; s <= 10; s++) g.lineTo((s * 1024) / 10, y0 + Math.sin(s * 0.9 + r() * 3) * 4); g.stroke(); }
    g.fillStyle = "rgba(255,230,180,0.2)"; g.fillRect(0, i * bw + 3, 1024, 4);
    g.fillStyle = "rgba(90,45,15,0.55)"; g.fillRect(0, i * bw, 1024, 3);
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.03);
});
/** the banner: cream cloth, red + teal lettering, little marbles */
const bannerTex = () => ctex("wrBannerMarble", 2048, 512, (g, r) => {
  g.fillStyle = "#fff4dc"; g.fillRect(0, 0, 2048, 512);
  g.strokeStyle = "#e8343c"; g.lineWidth = 22; rrect(g, 22, 22, 2004, 468, 30); g.stroke();
  g.setLineDash([26, 18]); g.strokeStyle = "#1e9a9a"; g.lineWidth = 8; rrect(g, 50, 50, 1948, 412, 20); g.stroke(); g.setLineDash([]);
  otxt(g, "WET MARBLE", 1024, 178, 196, "#e8343c", "#3a1420", 26);
  otxt(g, "CHALLENGE!", 1024, 372, 156, "#1e9a9a", "#0e3a3a", 22);
  const cols = ["#ff5a7a", "#4ab0ff", "#ffd23a", "#5ad07a", "#b07aff"];
  for (const [x, y, k] of [[150, 150, 0], [220, 360, 1], [1890, 150, 2], [1830, 360, 3], [120, 270, 4], [1930, 270, 0]] as [number, number, number][]) {
    g.fillStyle = cols[k]; g.beginPath(); g.arc(x, y, 46, 0, 7); g.fill(); g.strokeStyle = "#2a1a2a"; g.lineWidth = 8; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(x - 15, y - 16, 13, 0, 7); g.fill();
  }
  noise(g, 0, 0, 2048, 512, r, 20000, 0.03);
});
/** the stopwatch face: white dial, 60 ticks, red first-quarter sector, numbers */
const dialTex = () => ctex("wrDial", 1024, 1024, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 1024, 1024);
  const sg = g.createRadialGradient(400, 380, 50, 512, 512, 512); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(1, "rgba(180,160,140,0.35)"); g.fillStyle = sg; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "rgba(255,90,90,0.18)"; g.beginPath(); g.moveTo(512, 512); g.arc(512, 512, 430, -Math.PI / 2, 0); g.fill();
  g.strokeStyle = "#2a2a36";
  for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2, big = k % 5 === 0; g.lineWidth = big ? 16 : 6; g.beginPath(); g.moveTo(512 + Math.sin(a) * (big ? 380 : 420), 512 - Math.cos(a) * (big ? 380 : 420)); g.lineTo(512 + Math.sin(a) * 470, 512 - Math.cos(a) * 470); g.stroke(); }
  g.fillStyle = "#2a2a36"; g.font = `bold 92px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillText(String(k === 0 ? 60 : k * 5), 512 + Math.sin(a) * 300, 512 - Math.cos(a) * 300); }
  g.font = `bold 54px ${FONT}`; g.fillStyle = "#e8343c"; g.fillText("SEC", 512, 690);
});
/** contestant name plates */
const plateTex = (name: string, bg: string, ink: string) => ctex("wrPlate" + name, 768, 256, (g) => {
  g.fillStyle = bg; rrect(g, 6, 6, 756, 244, 40); g.fill(); g.strokeStyle = ink; g.lineWidth = 12; rrect(g, 22, 22, 724, 212, 30); g.stroke();
  otxt(g, name, 384, 134, name.length > 6 ? 128 : 140, "#ffffff", ink, 18);
});
/** a poster: a big friendly hand with pruney fingertips, "GRIP!" */
const handPosterTex = () => ctex("wrPosterHand", 512, 704, (g, r) => {
  g.fillStyle = "#fff6e0"; g.fillRect(0, 0, 512, 704);
  g.fillStyle = "#2f6ad0"; g.fillRect(0, 0, 512, 110); otxt(g, "GRIP!", 256, 58, 76, "#ffffff", "#0e2a6a", 10);
  g.save(); g.translate(256, 450);
  g.fillStyle = "#ffc7a0"; g.strokeStyle = "#5a2a1a"; g.lineWidth = 10;
  for (let k = 0; k < 4; k++) {
    const x = -90 + k * 60, up = k === 1 || k === 2 ? 30 : 0;
    rrect(g, x - 26, -210 - up, 52, 220, 26); g.fill(); g.stroke();
    g.lineWidth = 5; for (let q = 0; q < 3; q++) { const y = -190 - up + q * 15; g.beginPath(); g.moveTo(x - 15, y); g.quadraticCurveTo(x, y - 8, x + 15, y); g.stroke(); }
    g.lineWidth = 10;
  }
  g.beginPath(); g.ellipse(0, 70, 125, 140, 0, 0, 7); g.fill(); g.stroke();
  g.save(); g.rotate(-0.9); rrect(g, 60, -20, 150, 54, 27); g.fill(); g.stroke(); g.restore();
  g.restore();
  noise(g, 0, 0, 512, 704, r, 6000, 0.04);
});
/** a periodic-ish chart: coloured squares */
const chartTex = () => ctex("wrChart", 768, 512, (g, r) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 768, 512);
  const cols = ["#ff8a7a", "#ffd23a", "#7ad0a0", "#7ab0ff", "#c09aff", "#ffb06a"];
  for (let j = 0; j < 6; j++) for (let i = 0; i < 12; i++) {
    if (j < 2 && i > 1 && i < 10) continue;
    g.fillStyle = cols[(i + j * 2) % cols.length]; g.fillRect(40 + i * 58, 60 + j * 72, 52, 64);
    g.fillStyle = "rgba(40,30,40,0.6)"; g.fillRect(48 + i * 58, 70 + j * 72, 18 + r() * 14, 10);
  }
  noise(g, 0, 0, 768, 512, r, 4000, 0.04);
});

// ============================================================ rigs per look
type Rig = { au: C3; ad: C3; sun: C3; patchB: C3; fill: C3; warmB: C3; win: number; haze: number; hazeC: C3; motes: number; steam: number; steamT: C3; rain: number; mirror: number };
const BATH_RIGS: Record<"bath" | "xray" | "bathend" | "dim", Rig> = {
  bath: {
    au: [0.32, 0.4, 0.78], ad: [0.2, 0.14, 0.14], sun: [3.6, 2.15, 0.95], patchB: [0.5, 0.28, 0.1], fill: [0.12, 0.14, 0.26], warmB: [0.42, 0.24, 0.09],
    win: 1.35, haze: 1.0, hazeC: [1.0, 0.72, 0.42], motes: 1.4, steam: 0.32, steamT: [1, 1, 1], rain: 0, mirror: 1,
  },
  dim: { // the holo is up: the room sinks, still a little warm
    au: [0.12, 0.16, 0.34], ad: [0.06, 0.05, 0.07], sun: [1.3, 0.8, 0.42], patchB: [0.1, 0.06, 0.03], fill: [0.04, 0.05, 0.1], warmB: [0.08, 0.04, 0.02],
    win: 0.5, haze: 0.25, hazeC: [0.9, 0.6, 0.4], motes: 0.6, steam: 0.18, steamT: [0.8, 0.85, 1], rain: 0, mirror: 0.6,
  },
  xray: { // ON PURPOSE: cold electric blue
    au: [0.06, 0.16, 0.42], ad: [0.02, 0.05, 0.12], sun: [0.35, 0.9, 2.4], patchB: [0.02, 0.08, 0.2], fill: [0.03, 0.08, 0.2], warmB: [0, 0.02, 0.06],
    win: 0.35, haze: 0.35, hazeC: [0.35, 0.7, 1.4], motes: 1.2, steam: 0.2, steamT: [0.55, 0.85, 1.3], rain: 0, mirror: 0.5,
  },
  bathend: {
    au: [0.3, 0.36, 0.74], ad: [0.2, 0.13, 0.15], sun: [3.5, 1.95, 1.0], patchB: [0.46, 0.24, 0.12], fill: [0.12, 0.13, 0.26], warmB: [0.38, 0.2, 0.1],
    win: 1.15, haze: 0.9, hazeC: [1.0, 0.66, 0.5], motes: 1.2, steam: 0.3, steamT: [1, 0.97, 1.02], rain: 1, mirror: 1,
  },
};
const LAB_RIGS: Record<"lab" | "peak", Rig> = {
  lab: {
    au: [0.36, 0.42, 0.74], ad: [0.2, 0.15, 0.13], sun: [3.3, 2.1, 1.05], patchB: [0.3, 0.18, 0.08], fill: [0.14, 0.16, 0.28], warmB: [0.2, 0.12, 0.05],
    win: 1, haze: 0.3, hazeC: [1.0, 0.75, 0.45], motes: 1.2, steam: 0, steamT: [1, 1, 1], rain: 0, mirror: 1,
  },
  peak: {
    au: [0.44, 0.36, 0.66], ad: [0.26, 0.14, 0.14], sun: [4.2, 2.2, 1.15], patchB: [0.4, 0.18, 0.12], fill: [0.2, 0.14, 0.26], warmB: [0.3, 0.12, 0.08],
    win: 1.2, haze: 0.16, hazeC: [1.2, 0.65, 0.5], motes: 1.6, steam: 0, steamT: [1, 1, 1], rain: 0, mirror: 1,
  },
};
const mixRig = (a: Rig, b: Rig, k: number): Rig => {
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof Rig)[]) {
    const x = a[key], y = b[key];
    o[key] = Array.isArray(x) ? (x as number[]).map((v, i) => v + ((y as number[])[i] - v) * k) : (x as number) + ((y as number) - (x as number)) * k;
  }
  return o as Rig;
};
/** set the sun aperture (a window in a wall facing +x into the room at x = wx) */
const sunAperture = (S: LSet, O: THREE.Vector3, wx: number, z0: number, z1: number, y0: number, y1: number, fr: number, cols: number, rows: number, leaf: number) => {
  (S.u.uSD.value as THREE.Vector3).set(...SUN_DIR);
  (S.u.uWC.value as THREE.Vector3).set(O.x + wx, O.y + (y0 + y1) / 2, O.z + (z0 + z1) / 2);
  (S.u.uWN.value as THREE.Vector3).set(1, 0, 0); (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
  (S.u.uWH.value as THREE.Vector2).set((z1 - z0) / 2 - fr, (y1 - y0) / 2 - fr);
  (S.u.uWM.value as THREE.Vector4).set(cols, rows, 0.028, leaf);
  (S.u.uArch.value as THREE.Vector3).set(0, 0, 1);
};
/** the bath's sun aperture: the arched window in the back wall (plane z = wz, facing +z), sun from BATH_SUN_DIR */
const backAperture = (S: LSet, O: THREE.Vector3, wz: number) => {
  const { x0, x1, y0, yS, r, fr } = AW, top = yS + r, yc = (y0 + top) / 2;
  (S.u.uSD.value as THREE.Vector3).set(...BATH_SUN_DIR);
  (S.u.uWC.value as THREE.Vector3).set(O.x + (x0 + x1) / 2, O.y + yc, O.z + wz);
  (S.u.uWN.value as THREE.Vector3).set(0, 0, 1); (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
  (S.u.uWH.value as THREE.Vector2).set((x1 - x0) / 2 - fr, (top - y0) / 2 - fr);
  (S.u.uWM.value as THREE.Vector4).set(2, 3, 0.016, 0.22);
  (S.u.uArch.value as THREE.Vector3).set(1, yS - yc, r - fr);
};
/** a window in a wall at x = wx facing +x: architrave, sill, sash frame + bars matching the aperture */
const sideWindow = (b: Bat, paint: THREE.Material, wx: number, wf: number, z0: number, z1: number, y0: number, y1: number, fr: number, cols: number, rows: number, TRIM: string, FR: string) => {
  const A = 0.07;
  b.box(paint, wf, y0 - 0.02, z0 - A, wf + 0.028, y1 + A, z0, TRIM); b.box(paint, wf, y0 - 0.02, z1, wf + 0.028, y1 + A, z1 + A, TRIM);
  b.box(paint, wf, y1, z0, wf + 0.028, y1 + A, z1, TRIM);
  b.box(paint, wf - 0.2, y0 - 0.035, z0 - 0.1, wf + 0.1, y0 + 0.001, z1 + 0.1, TRIM);
  const zi0 = z0 + fr, zi1 = z1 - fr, yi0 = y0 + fr, yi1 = y1 - fr, x0 = wx - 0.025, x1 = wx + 0.025;
  b.box(paint, x0, y0 + 0.001, z0, x1, y1, zi0, FR); b.box(paint, x0, y0 + 0.001, zi1, x1, y1, z1, FR);
  b.box(paint, x0, y0 + 0.001, zi0, x1, yi0, zi1, FR); b.box(paint, x0, yi1, zi0, x1, y1, zi1, FR);
  const bh = 0.028;
  for (let k = 1; k < cols; k++) { const z = zi0 + ((zi1 - zi0) * k) / cols; b.box(paint, x0 + 0.006, yi0, z - bh, x1 - 0.006, yi1, z + bh, FR); }
  for (let k = 1; k < rows; k++) { const y = yi0 + ((yi1 - yi0) * k) / rows; b.box(paint, x0 + 0.004, y - bh, zi0, x1 - 0.004, y + bh, zi1, FR); }
};
/** the reveals (4 thin faces) of a side-wall window hole from x = xa to xb */
const reveals = (b: Bat, mat: THREE.Material, xa: number, xb: number, z0: number, z1: number, y0: number, y1: number) => {
  b.box(mat, xa, y0, z0 - 0.001, xb, y1, z0); b.box(mat, xa, y0, z1, xb, y1, z1 + 0.001);
  b.box(mat, xa, y1, z0, xb, y1 + 0.001, z1); b.box(mat, xa, y0 - 0.001, z0, xb, y0, z1);
};
/** a heart-shaped leaf (pothos) in XY, stem at origin, tip +y */
const leafShape = (L: number) => {
  const s = new THREE.Shape(), w = L * 0.55;
  s.moveTo(0, 0); s.bezierCurveTo(-w, -L * 0.15, -w * 1.05, L * 0.6, 0, L); s.bezierCurveTo(w * 1.05, L * 0.6, w, -L * 0.15, 0, 0);
  return new THREE.ShapeGeometry(s, 8);
};

// ============================================================ the BATHROOM
const BX0 = -1.25, BX1 = 1.3, BZ = -0.55, BY = 2.6, BZF = 3.6, WT = 0.16, TH = 1.25;
// the arched SUN window in the back wall (back-left): rect y0..yS, a half-circle arch r above; 2 x 3 panes (the
// muntins sit at x centre and at y0 + H/3, y0 + 2H/3 = yS, matching the aperture's bars)
const AW = { x0: -1.0, x1: -0.35, y0: 1.05, yS: 1.7, r: 0.325, fr: 0.035 };
const AWZ = BZ - 0.08; // the sash plane
const TUB_PROFILE: [number, number][] = [[0.16, 0.14], [0.11, 0.16], [0.065, 0.22], [0.032, 0.33], [0.012, 0.46], [0.0, 0.56], [-0.016, 0.605], [-0.026, 0.628], [-0.022, 0.648],
  [-0.006, 0.656], [0.012, 0.648], [0.03, 0.62], [0.042, 0.55], [0.06, 0.4], [0.085, 0.28], [0.12, 0.225], [0.16, 0.215]];
const TUB_OUTER_ROWS = 7; // profile rows 0..6 are the painted outside
const sEll = (th: number, e: number): [number, number] => {
  const c = Math.cos(th), s = Math.sin(th);
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / e), Math.sign(s) * Math.pow(Math.abs(s), 2 / e)];
};
/** the clawfoot tub shell: a superellipse ring (semi-axes a, b, exponent e) swept along an inset/height profile */
const tubGeo = (a: number, b: number, e: number, outer: string, inner: string) => {
  const prof = TUB_PROFILE, N = 80, M = prof.length, pos: number[] = [], col: number[] = [], idx: number[] = [];
  const co = new THREE.Color(outer), ci = new THREE.Color(inner);
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
    const [x, z] = sEll((i / N) * Math.PI * 2, e), d = prof[j][0], c = j < TUB_OUTER_ROWS ? co : ci;
    pos.push(x * (a - d), prof[j][1], z * (b - d)); col.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < M - 1; j++) for (let i = 0; i < N; i++) { const a0 = j * N + i, a1 = j * N + ((i + 1) % N), b0 = a0 + N, b1 = a1 + N; idx.push(a0, a1, b0, a1, b1, b0); }
  for (const [j, y, c] of [[0, prof[0][1], co], [M - 1, prof[M - 1][1], ci]] as [number, number, THREE.Color][]) {
    const k = pos.length / 3; pos.push(0, y, 0); col.push(c.r, c.g, c.b);
    for (let i = 0; i < N; i++) idx.push(k, j * N + ((i + 1) % N), j * N + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** a thin gold band around the tub at height y (pushed out by d) */
const tubStripe = (a: number, b: number, e: number, d: number, y: number, h: number) => {
  const N = 96, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < N; i++) { const [x, z] = sEll((i / N) * Math.PI * 2, e); pos.push(x * (a + d), y - h, z * (b + d), x * (a + d), y + h, z * (b + d)); }
  for (let i = 0; i < N; i++) { const a0 = i * 2, a1 = ((i + 1) % N) * 2; idx.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};
class Bath {
  root = new THREE.Group(); S: LSet;
  ceil = new THREE.Group(); posX = new THREE.Group(); negX = new THREE.Group();
  glassMat!: THREE.ShaderMaterial; mirrorMat!: THREE.ShaderMaterial;
  haze: Haze; motes: Motes; steam: Steam; glows: Glows;
  constructor() {
    this.S = bathRig();
    const R = this.root, S = this.S;
    R.position.set(...BATH);
    R.add(this.ceil, this.posX, this.negX);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat(), cast = new Bat();
    const tiles = imat(S, { map: tileTex(), rep: [1 / 0.8, 1 / 0.8], spec: 40, specK: 0.35 });
    const paintW = imat(S, { map: paintTex(), rep: [1, 1] });
    const floor = imat(S, { map: floorTex(), rep: [1, 1], spec: 40, specK: 0.25 });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 90, specK: 1.0 });
    const enamel = imat(S, { spec: 70, specK: 0.7, rim: 0.3 });
    const TRIM = "#fffaf0", TEAL = "#1e8a8a", GOLD = "#f0b83a", CORAL = "#ff8a92";
    // ---- floor, back wall (tile dado + paint, the arched window hole), side walls, ceiling ----
    b.add(flat(BX0, BZ, BX1, BZF, 0), floor);
    const AWH = [[AW.x0, AW.x1, AW.y0, AW.yS + AW.r]];
    b.add(wallZ(BX0, BX1, 0, TH, BZ, AWH), tiles);
    b.add(wallZ(BX0, BX1, TH, BY, BZ, AWH), paintW);
    {
      const { x0, x1, yS, r } = AW, xc = (x0 + x1) / 2;
      // arch corner fillers (front face + reveal) above the rect hole's arch, and the straight reveals
      const sh = new THREE.Shape();
      sh.moveTo(x0, yS); sh.lineTo(x0, yS + r); sh.lineTo(x1, yS + r); sh.lineTo(x1, yS); sh.absarc(xc, yS, r, 0, Math.PI, false);
      b.add(new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false, curveSegments: 24 }), paintW, TRS(0, 0, BZ - WT));
      b.box(paintW, x0 - 0.002, AW.y0, BZ - WT, x0, yS, BZ - 0.002); b.box(paintW, x1, AW.y0, BZ - WT, x1 + 0.002, yS, BZ - 0.002);
      b.box(paint, x0 - 0.08, AW.y0 - 0.04, BZ - WT, x1 + 0.08, AW.y0, BZ + 0.15, TRIM); // the deep sill (bottles live here)
      for (const x of [x0 - 0.06, x1 + 0.06]) b.box(paint, x - 0.015, AW.y0 - 0.12, BZ, x + 0.015, AW.y0 - 0.04, BZ + 0.12, TRIM);
      // architrave round the opening (jambs + arch)
      b.box(paint, x0 - 0.06, AW.y0, BZ, x0, yS, BZ + 0.025, TRIM); b.box(paint, x1, AW.y0, BZ, x1 + 0.06, yS, BZ + 0.025, TRIM);
      b.torus(paint, r + 0.03, 0.03, TRS(xc, yS, BZ + 0.012, 0, 0, 0, [1, 1, 0.45]), TRIM, Math.PI, 8);
      // sash: jambs, arch ring, muntins (match the aperture: 2 x 3 panes)
      const zf = AWZ, fr = AW.fr, H = yS + r - AW.y0;
      fu.box(paint, x0, AW.y0, zf - 0.02, x0 + fr, yS, zf + 0.02, TRIM); fu.box(paint, x1 - fr, AW.y0, zf - 0.02, x1, yS, zf + 0.02, TRIM);
      fu.box(paint, x0, AW.y0, zf - 0.02, x1, AW.y0 + fr, zf + 0.02, TRIM);
      fu.torus(paint, r - fr / 2, fr / 2, TRS(xc, yS, zf, 0, 0, 0, [1, 1, 1.2]), TRIM, Math.PI, 8);
      fu.box(paint, xc - 0.015, AW.y0, zf - 0.015, xc + 0.015, yS + r - 0.01, zf + 0.015, TRIM);
      for (const y of [AW.y0 + H / 3, AW.y0 + (2 * H) / 3]) fu.box(paint, x0, y - 0.015, zf - 0.015, x1, y + 0.015, zf + 0.015, TRIM);
      // glass (self-lit frosted glow + rain), NOINK
      this.glassMat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: frostTex() }, uK: { value: 1 }, uRain: { value: 0 }, uT: { value: 0 }, uTint: { value: V3(1, 1, 1) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `uniform sampler2D uMap; uniform float uK; uniform float uRain; uniform float uT; uniform vec3 uTint; varying vec2 vUv;
          float h1(float x){ return fract(sin(x * 91.7) * 43758.5453); }
          void main(){
            vec3 c = texture2D(uMap, vUv).rgb;
            // rain: a cooler, greyer glass with bright drops + running streaks (the ancestors' rain)
            if (uRain > 0.0) {
              c = mix(c, c * vec3(0.72, 0.78, 0.95) + vec3(0.02, 0.03, 0.08), 0.55 * uRain);
              float wet = 0.0;
              for (int k = 0; k < 3; k++) {
                float sc = 7.0 + float(k) * 4.0; vec2 p = vUv * vec2(sc, sc * 0.8);
                float col = floor(p.x), r = h1(col + float(k) * 17.0);
                float sp = 0.25 + 0.5 * r;
                float y = fract(p.y + uT * sp + r * 9.0);
                float xx = fract(p.x) - 0.5 + 0.12 * sin(p.y * 2.0 + col);
                float head = smoothstep(0.17, 0.06, length(vec2(xx * 1.3, (y - 0.15) * 2.2)));
                float trail = smoothstep(0.07, 0.0, abs(xx)) * smoothstep(0.15, 0.8, y) * 0.55;
                wet += (head + trail) * step(0.35, r);
                vec2 q = fract(vUv * vec2(19.0, 15.0) + float(k) * 0.37) - 0.5; float dr = h1(floor(vUv.x * 19.0 + float(k) * 0.37) * 7.0 + floor(vUv.y * 15.0 + float(k) * 0.37) * 13.0 + float(k));
                wet += smoothstep(0.14, 0.06, length(q)) * step(0.7, dr) * 0.7;
              }
              c += vec3(0.8, 0.86, 1.0) * wet * 0.5 * uRain;
            }
            gl_FragColor = vec4(c * uK * uTint, 1.0);
          }`,
      });
      const gsh = new THREE.Shape(); gsh.moveTo(x0, AW.y0); gsh.lineTo(x1, AW.y0); gsh.lineTo(x1, yS); gsh.absarc(xc, yS, r, 0, Math.PI, false); gsh.lineTo(x0, AW.y0);
      const gg = new THREE.ShapeGeometry(gsh, 24), gp = gg.getAttribute("position") as THREE.BufferAttribute, guv = gg.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < gp.count; i++) guv.setXY(i, (gp.getX(i) - x0) / (x1 - x0), (gp.getY(i) - AW.y0) / (yS + r - AW.y0));
      const glass = new THREE.Mesh(gg, this.glassMat); glass.position.z = BZ - 0.1; glass.layers.set(NOINK); glass.frustumCulled = false; R.add(glass);
      // a back plate behind the glass so nothing shows through around the arch
      b.box(paintW, x0 - 0.1, AW.y0 - 0.1, BZ - WT - 0.002, x1 + 0.1, yS + r + 0.1, BZ - WT);
    }
    b.box(paint, BX0, TH - 0.03, BZ, AW.x0 - 0.06, TH + 0.035, BZ + 0.035, TEAL); b.box(paint, AW.x1 + 0.06, TH - 0.03, BZ, BX1, TH + 0.035, BZ + 0.035, TEAL); // dado trim
    b.box(paint, BX0, 0, BZ, BX1, 0.09, BZ + 0.025, TEAL);                             // skirting tile
    b.box(paint, BX0, BY - 0.07, BZ, BX1, BY, BZ + 0.05, TRIM);                        // cornice
    {
      bn.add(wallX(BX0, BZ, BZF, 0, TH), tiles); bn.add(wallX(BX0, BZ, BZF, TH, BY), paintW);
      bn.box(paint, BX0, TH - 0.03, BZ, BX0 + 0.035, TH + 0.035, BZF, TEAL); bn.box(paint, BX0, 0, BZ, BX0 + 0.025, 0.09, BZF, TEAL);
      bp.add(wallX(BX1, BZ, BZF, 0, TH), tiles); bp.add(wallX(BX1, BZ, BZF, TH, BY), paintW);
      bp.box(paint, BX1 - 0.035, TH - 0.03, BZ, BX1, TH + 0.035, BZF, TEAL); bp.box(paint, BX1 - 0.025, 0, BZ, BX1, 0.09, BZF, TEAL);
      bc.add(flat(BX0, BZ, BX1, BZF, BY), imat(S, { col: "#fff4e4" }));
    }
    // ---- the CLAWFOOT TUB: coral outside, white enamel inside, gold feet, stripe + taps ----
    {
      const tub = new THREE.Mesh(tubGeo(0.85, 0.38, 2.6, CORAL, "#fffaf4"), enamel);
      tub.castShadow = true; tub.receiveShadow = true; tub.frustumCulled = false; R.add(tub);
      fu.add(tubStripe(0.85, 0.38, 2.6, 0.004, 0.5, 0.008), metal, undefined, GOLD);
      for (const [x, z] of [[-0.6, -0.2], [0.6, -0.2], [-0.6, 0.2], [0.6, 0.2]] as [number, number][]) {
        const sx = Math.sign(x), sz = Math.sign(z);
        cast.tube(metal, [V3(x * 0.92, 0.22, z * 0.9), V3(x * 1.02, 0.13, z * 1.08), V3(x * 1.05 + sx * 0.02, 0.05, z * 1.18 + sz * 0.02)], 0.032, 12, GOLD, 8);
        cast.sph(metal, TRS(x * 1.05 + sx * 0.03, 0.035, z * 1.18 + sz * 0.03, 0, 0, 0, [0.055, 0.035, 0.055]), 12, GOLD);
        for (let k = -1; k <= 1; k++) cast.sph(metal, TRS(x * 1.05 + sx * 0.03 + k * 0.03, 0.02, z * 1.18 + sz * 0.065, 0, 0, 0, 0.02), 8, GOLD);
      }
      const tx = 0.66, tz = -0.31;
      fu.rod(metal, V3(tx, 0.6, tz), V3(tx, 0.86, tz), 0.022, 12, GOLD);
      fu.tube(metal, [V3(tx, 0.86, tz), V3(tx - 0.02, 0.95, tz + 0.02), V3(tx - 0.09, 0.96, tz + 0.06), V3(tx - 0.14, 0.88, tz + 0.08)], 0.02, 20, GOLD, 10);
      for (const [dx, c] of [[-0.1, "#e8343c"], [0.1, "#3a8ae8"]] as [number, string][]) {
        fu.rod(metal, V3(tx + dx, 0.62, tz), V3(tx + dx, 0.72, tz), 0.014, 8, GOLD);
        for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2 + 0.4; fu.rod(metal, V3(tx + dx, 0.735, tz), V3(tx + dx + Math.cos(a) * 0.045, 0.735, tz + Math.sin(a) * 0.045), 0.009, 6, GOLD); }
        fu.sph(gloss, TRS(tx + dx, 0.755, tz, 0, 0, 0, 0.018), 10, c);
      }
    }
    // ---- on the deep window sill: bottles, bath salts, a candle (their long shadows fall toward the lens) ----
    {
      const y = AW.y0, z = BZ + 0.07;
      cast.lathe(gloss, [[0.001, 0], [0.042, 0], [0.046, 0.02], [0.046, 0.19], [0.03, 0.22], [0.012, 0.23], [0.001, 0.23]], TRS(-0.95, y, z), 20, "#5ad0b0");
      cast.rod(metal, V3(-0.95, y + 0.23, z), V3(-0.95, y + 0.27, z), 0.008, 8, "#fff4e4");
      cast.rod(metal, V3(-0.95, y + 0.27, z), V3(-0.905, y + 0.27, z), 0.007, 8, "#fff4e4");
      cast.rbox(plain, 0.05, 0.07, 0.006, 0.002, TRS(-0.95, y + 0.11, z + 0.047), "#ffffff");
      cast.lathe(gloss, [[0.001, 0], [0.05, 0], [0.056, 0.03], [0.05, 0.12], [0.022, 0.15], [0.001, 0.15]], TRS(-0.83, y, z + 0.02), 20, "#ff8ab4");
      cast.cyl(gloss, 0.024, 0.024, 0.03, 14, TRS(-0.83, y + 0.165, z + 0.02), "#ffffff");
      cast.rbox(gloss, 0.12, 0.03, 0.04, 0.014, TRS(-0.66, y + 0.016, z + 0.03, 0.3), "#ffa23a");
      cast.lathe(gloss, [[0.001, 0], [0.045, 0], [0.048, 0.1], [0.04, 0.11], [0.001, 0.11]], TRS(-0.5, y, z), 20, "#8ac8ff");
      cast.cyl(plain, 0.036, 0.032, 0.035, 14, TRS(-0.5, y + 0.128, z), "#c89a6a");
      cast.cyl(plain, 0.028, 0.028, 0.07, 14, TRS(-0.38, y + 0.035, z + 0.02), "#fff4dc");
      fu.sph(imat(S, { col: "#000000", em: [2.2, 1.4, 0.5] }), TRS(-0.38, y + 0.09, z + 0.02, 0, 0, 0, [0.008, 0.016, 0.008]), 8);
    }
    // ---- towel rail + striped towel (right, under the mirror) ----
    {
      const y = 1.32, x0 = 0.24, x1 = 0.74, z = BZ + 0.07;
      fu.rod(metal, V3(x0, y, z), V3(x1, y, z), 0.012, 10, GOLD);
      for (const x of [x0, x1]) { fu.rod(metal, V3(x, y, z), V3(x, y, BZ), 0.01, 8, GOLD); fu.sph(metal, TRS(x, y, z, 0, 0, 0, 0.018), 10, GOLD); }
      const tm = imat(S, { map: towelTex() });
      fu.add(drape(0.38, 0.5, 3, 0.018, 21, 0.9, 0.1), tm, TRS(0.49, y + 0.014, z + 0.022));
      fu.add(drape(0.38, 0.32, 3, 0.014, 22, 0.9, 0.1), tm, TRS(0.49, y + 0.014, z - 0.022));
    }
    // ---- fogged oval MIRROR with a gold frame ----
    {
      const mx = MIRROR[0] - BATH[0], my = MIRROR[1] - BATH[1];
      fu.torus(metal, 1, 0.08, TRS(mx, my, BZ + 0.022, 0, 0, 0, [0.22, 0.29, 0.25]), GOLD, Math.PI * 2, 10);
      this.mirrorMat = imat(S, { map: mirrorTex(), spec: 80, specK: 0.8, self: [0.2, 0.22, 0.26] });
      const mg = new THREE.CircleGeometry(1, 48), muv = mg.getAttribute("uv") as THREE.BufferAttribute;
      fu.add(mg, this.mirrorMat, TRS(mx, my, BZ + 0.012, 0, 0, 0, [0.215, 0.285, 1])); void muv;
      fu.sph(metal, TRS(mx, my + 0.31, BZ + 0.03, 0, 0, 0, 0.025), 10, GOLD);
    }
    // ---- hanging plant in a macrame hanger (top left): its trailing leaves cast shadows in the beam ----
    {
      const px = -0.78, py = 2.02, pz = -0.3;
      cast.lathe(gloss, [[0.001, -0.08], [0.06, -0.07], [0.1, 0.0], [0.11, 0.06], [0.1, 0.07], [0.001, 0.07]], TRS(px, py, pz), 20, "#e8784a");
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; cast.rod(plain, V3(px + Math.cos(a) * 0.1, py + 0.02, pz + Math.sin(a) * 0.1), V3(px, BY - 0.02, pz), 0.005, 4, "#f4e6c8"); }
      const r = rng(19), lm = imat(S, { spec: 40, specK: 0.35 });
      for (let v = 0; v < 6; v++) {
        const a0 = (v / 6) * Math.PI * 2 + r(), len = 0.35 + r() * 0.45, pts: THREE.Vector3[] = [];
        for (let s = 0; s <= 6; s++) { const u = s / 6; pts.push(V3(px + Math.cos(a0) * (0.1 + 0.08 * u), py + 0.06 - len * u * u * 1.1 + 0.04 * Math.sin(u * 3), pz + Math.sin(a0) * (0.1 + 0.06 * u))); }
        cast.tube(plain, pts, 0.005, 20, "#3f8a3a", 5);
        for (let s = 1; s <= 6; s++) {
          const q = pts[s], ang = r() * 6.28;
          cast.add(leafShape(0.07 + r() * 0.03), lm, TRS(q.x + Math.cos(ang) * 0.015, q.y, q.z + Math.sin(ang) * 0.015, ang, -0.6 + r() * 0.4, Math.PI + (r() - 0.5) * 1.2), s % 2 ? "#4cae4a" : "#3a9440");
        }
      }
      for (let k = 0; k < 7; k++) { const a = r() * 6.28; cast.add(leafShape(0.09), lm, TRS(px + Math.cos(a) * 0.05, py + 0.06, pz + Math.sin(a) * 0.05, a, -0.9 + r() * 0.3, 0), "#5ac04a"); }
    }
    // ---- shower curtain rail + the gathered curtain at the right end (wider shots) ----
    {
      const ry = 2.2, cm = imat(S, { map: curtainTex(), rep: [2, 1.5], spec: 20, specK: 0.15 });
      fu.rod(metal, V3(0.95, ry, BZ), V3(0.95, ry, 0.45), 0.012, 8, GOLD);
      fu.rod(metal, V3(-0.95, ry, 0.45), V3(0.95, ry, 0.45), 0.012, 8, GOLD);
      fu.rod(metal, V3(-0.95, ry, BZ), V3(-0.95, ry, 0.45), 0.012, 8, GOLD);
      fu.add(drape(0.34, 1.45, 4, 0.05, 31, 0.72, 0.3), cm, TRS(0.97, ry - 0.01, 0.05, Math.PI / 2));
      for (let k = 0; k < 6; k++) fu.torus(metal, 0.022, 0.005, TRS(0.95, ry, -0.12 + k * 0.06, Math.PI / 2), GOLD, Math.PI * 2, 6);
    }
    // ---- bath mat, a little wooden stool with folded towels + a baby duck ----
    {
      fu.add(new RoundedBoxGeometry(1.1, 0.02, 0.54, 2, 0.009), imat(S, { map: matTex() }), TRS(0.05, 0.01, 0.85));
      const sx = 1.05, sz = 0.6;
      fu.cyl(gloss, 0.17, 0.17, 0.04, 24, TRS(sx, 0.42, sz), "#d8925a");
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; fu.rod(gloss, V3(sx + Math.cos(a) * 0.1, 0.4, sz + Math.sin(a) * 0.1), V3(sx + Math.cos(a) * 0.15, 0, sz + Math.sin(a) * 0.15), 0.018, 8, "#c8824a"); }
      fu.rbox(plain, 0.26, 0.06, 0.2, 0.025, TRS(sx, 0.47, sz, 0.1), "#7cc8ff");
      fu.rbox(plain, 0.24, 0.06, 0.19, 0.025, TRS(sx, 0.53, sz, -0.05), "#fff4e0");
      fu.sph(gloss, TRS(sx, 0.595, sz, 0, 0, 0, [0.045, 0.035, 0.035]), 12, "#ffd23a");
      fu.sph(gloss, TRS(sx - 0.03, 0.64, sz, 0, 0, 0, 0.025), 12, "#ffd23a");
      fu.sph(gloss, TRS(sx - 0.057, 0.635, sz, 0, 0, 0, [0.014, 0.007, 0.01]), 8, "#ff8a2a");
    }
    b.build(R); fu.build(R); cast.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.glows = new Glows(R, [
      { p: V3((AW.x0 + AW.x1) / 2, 1.55, BZ - 0.05), c: [0.42, 0.28, 0.14], s: 1.5, g: 0 },     // the sun window's halo
      { p: V3(-0.38, 1.14, BZ + 0.09), c: [0.5, 0.3, 0.1], s: 0.12, g: 1, tw: 1 },              // the candle
    ], 0.4);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 700, 37, [-1.1, 0.7, -0.5, 1.1, 2.3, 1.3]);
    this.steam = new Steam(R, S, 46, 5);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const look = SHOTS[id - 1].look;
    let rg: Rig = BATH_RIGS.bath;
    if (look === "bathend") rg = BATH_RIGS.bathend;
    else if (id === 2 || look === "xray") { const h = holoAt(id, t); rg = mixRig(mixRig(BATH_RIGS.bath, BATH_RIGS.dim, 0.7 * h.show), BATH_RIGS.xray, h.stamp); }
    backAperture(S, O, AWZ);
    (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    (S.u.uO.value as THREE.Vector3).set(O.x + (BX0 + BX1) / 2, O.y, O.z); (S.u.uBox.value as THREE.Vector4).set((BX1 - BX0) / 2, BZ, BY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uRain.value = rg.rain;
    setLights(S, [
      { p: W2(0.25, 1.05, -0.15), c: rg.patchB, r: 1.0 },            // sun bounce off the lit foam onto the tiles
      { p: W2(-0.67, 1.45, BZ + 0.45), c: rg.warmB, r: 1.0 },         // glow in front of the sun window
      { p: W2(0.2, 1.8, 3.0), c: rg.fill, r: 3.4 },                  // cool front fill
      { p: W2(-0.38, 1.16, BZ + 0.12), c: [0.18 * rg.mirror, 0.09 * rg.mirror, 0.03 * rg.mirror], r: 0.22 }, // candle
      { p: W2(0.6, 0.35, 0.9), c: [rg.patchB[0] * 0.5, rg.patchB[1] * 0.5, rg.patchB[2] * 0.5], r: 1.0 }, // sun on the mat
    ], rg.au, rg.ad);
    this.glassMat.uniforms.uK.value = rg.win; this.glassMat.uniforms.uRain.value = rg.rain; this.glassMat.uniforms.uT.value = t;
    (this.glassMat.uniforms.uTint.value as THREE.Vector3).set(rg.sun[0] / 3.4, rg.sun[1] / 2.05, rg.sun[2] / 0.95).lerp(V3(1, 1, 1), 0.5);
    (this.mirrorMat.uniforms.uSelf.value as THREE.Vector3).set(0.2 * rg.mirror, 0.22 * rg.mirror, 0.26 * rg.mirror);
    this.glows.gk.set(rg.win, rg.mirror, rg.win, 0); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(V3((AW.x0 + AW.x1) / 2, (AW.y0 + AW.yS + AW.r) / 2, AWZ), V3(1, 0, 0), V3(0, 1, 0), (AW.x1 - AW.x0) / 2, (AW.yS + AW.r - AW.y0) / 2, V3(...BATH_SUN_DIR).negate(), 3.0, rg.hazeC, rg.haze, O, 1.2, 0.6);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    this.steam.mat.uniforms.uT.value = t; this.steam.mat.uniforms.uK.value = rg.steam; (this.steam.mat.uniforms.uTint.value as THREE.Vector3).set(...rg.steamT);
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > BX0 + 0.1; this.posX.visible = c.x < BX1 - 0.1; this.ceil.visible = c.y < BY - 0.1;
  }
}

// ============================================================ the LAB
const LX0 = -1.9, LX1 = 1.9, LZ = -1.6, LY = 2.8, LZF = 3.6, WAIN = 0.95;
const LW = { z0: -1.2, z1: 0.9, y0: 0.9, y1: 2.2, fr: 0.05 };
const LWX = LX0 - 0.08;
class Lab {
  root = new THREE.Group(); S: LSet;
  ceil = new THREE.Group(); negX = new THREE.Group(); posX = new THREE.Group();
  hand = new THREE.Group(); crown = new THREE.Group();
  haze: Haze; motes: Motes; glows: Glows; sunGlassMat: THREE.ShaderMaterial;
  constructor() {
    this.S = labRig();
    const R = this.root, S = this.S;
    R.position.set(...LAB);
    R.add(this.ceil, this.negX, this.posX);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat();
    const wall = imat(S, { map: labWallTex(), rep: [1, 1] }), sub = imat(S, { map: subwayTex(), rep: [1 / 0.6, 1 / 0.6], spec: 40, specK: 0.3 });
    const lino = imat(S, { map: linoTex(), rep: [1 / 0.9, 1 / 0.9], spec: 40, specK: 0.25 }), wood = imat(S, { map: woodTex(), rep: [1, 1], spec: 40, specK: 0.3 });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 90, specK: 1.0 });
    const TRIM = "#fffaf0", TEAL = "#1e8a8a", RED = "#e8343c", GOLD = "#f0b83a";
    // ---- floor, back wall (subway dado + mint paint), side walls (left: the sun window), ceiling ----
    b.add(flat(LX0, LZ, LX1, LZF, 0), lino);
    b.add(wallZ(LX0, LX1, 0, WAIN, LZ), sub); b.add(wallZ(LX0, LX1, WAIN, LY, LZ), wall);
    b.box(paint, LX0, WAIN - 0.03, LZ, LX1, WAIN + 0.04, LZ + 0.04, TEAL); b.box(paint, LX0, 0, LZ, LX1, 0.1, LZ + 0.025, TEAL);
    b.box(paint, LX0, LY - 0.08, LZ, LX1, LY, LZ + 0.05, TRIM);
    {
      const hole = [[LW.z0, LW.z1, LW.y0, LW.y1]];
      bn.add(wallX(LX0, LZ, LZF, 0, WAIN, hole), sub); bn.add(wallX(LX0, LZ, LZF, WAIN, LY, hole), wall);
      bn.add(wallX(LX0 - 0.16, LZ, LZF, 0, LY), wall);
      reveals(bn, wall, LX0 - 0.16, LX0, LW.z0, LW.z1, LW.y0, LW.y1);
      sideWindow(bn, paint, LWX, LX0, LW.z0, LW.z1, LW.y0, LW.y1, LW.fr, 3, 2, TRIM, "#fff4e4");
      this.sunGlassMat = imat(S, { map: sunGlassTex(), emap: true, em: [1.6, 1.6, 1.6] });
      const sg = new THREE.Mesh(clean(new THREE.PlaneGeometry(LW.z1 - LW.z0, LW.y1 - LW.y0)), this.sunGlassMat);
      sg.rotation.y = Math.PI / 2; sg.position.set(LX0 - 0.14, (LW.y0 + LW.y1) / 2, (LW.z0 + LW.z1) / 2); sg.layers.set(NOINK); sg.frustumCulled = false; this.negX.add(sg);
      bp.add(wallX(LX1, LZ, LZF, 0, WAIN), sub); bp.add(wallX(LX1, LZ, LZF, WAIN, LY), wall);
      bc.add(flat(LX0, LZ, LX1, LZF, LY), imat(S, { col: "#f4f8f0" }));
    }
    // ---- the TABLE: honey top, cream front panel with stripes, name plates; stools behind ----
    {
      const T = { x0: -1.0, x1: 1.0, z0: -0.22, z1: 0.38, y: 0.8 };
      fu.rbox(wood, T.x1 - T.x0, 0.05, T.z1 - T.z0 + 0.04, 0.015, TRS(0, T.y - 0.025, (T.z0 + T.z1) / 2), "#ffffff");
      fu.box(paint, T.x0 + 0.03, 0.1, T.z1 - 0.03, T.x1 - 0.03, T.y - 0.05, T.z1 - 0.01, "#fff1dc");
      fu.box(paint, T.x0 + 0.03, 0.6, T.z1 - 0.01, T.x1 - 0.03, 0.66, T.z1 + 0.003, RED);
      fu.box(paint, T.x0 + 0.03, 0.1, T.z1 - 0.01, T.x1 - 0.03, 0.14, T.z1 + 0.003, TEAL);
      for (const x of [T.x0 + 0.03, T.x1 - 0.06]) fu.box(paint, x, 0, T.z0 + 0.02, x + 0.03, T.y - 0.05, T.z1 - 0.03, "#fff1dc");
      for (const [name, x, bg, ink] of [["SMOOTH", -0.46, "#4a9ae8", "#0e2a5a"], ["WRINKLY", 0.46, "#ff8a3a", "#5a2008"]] as [string, number, string, string][]) {
        fu.rbox(gloss, 0.44, 0.16, 0.02, 0.008, TRS(x, 0.4, T.z1 + 0.01), bg);
        fu.add(new THREE.PlaneGeometry(0.42, 0.14), imat(S, { map: plateTex(name, bg, ink), self: [0.08, 0.06, 0.05] }), TRS(x, 0.4, T.z1 + 0.0215));
        for (const s of [-1, 1]) fu.sph(metal, TRS(x + s * 0.195, 0.455, T.z1 + 0.024, 0, 0, 0, 0.01), 8, GOLD);
      }
      for (const [x, z, c, h] of [[-0.92, -0.08, "#7ad0ff", 0.12], [0.92, -0.1, "#ff7ab0", 0.1]] as [number, number, string, number][]) {
        cast.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, h], [0.05, h + 0.012], [0.001, h + 0.012]], TRS(x, T.y, z), 18, "#e8f6ff");
        fu.cyl(imat(S, { col: c, self: [0.25, 0.25, 0.25] }), 0.043, 0.043, h * 0.6, 16, TRS(x, T.y + h * 0.3 + 0.002, z));
      }
    }
    // ---- the big desk STOPWATCH, front-centre on the table (faces the lens): red case, chrome bezel, the dial, a
    //      crown + button on top, two little feet; the hand ticks ----
    {
      const sx = STOPWATCH[0] - LAB[0], sy = STOPWATCH[1] - LAB[1], z = STOPWATCH[2] - LAB[2], R0 = 0.15;
      fu.cyl(gloss, R0, R0, 0.06, 48, TRS(sx, sy, z, 0, Math.PI / 2), RED);
      fu.torus(metal, R0 - 0.012, 0.016, TRS(sx, sy, z + 0.032), "#e0e6f0", Math.PI * 2, 10);
      fu.add(new THREE.CircleGeometry(R0 - 0.02, 64), imat(S, { map: dialTex(), self: [0.12, 0.11, 0.1] }), TRS(sx, sy, z + 0.0305));
      fu.cyl(metal, 0.03, 0.034, 0.035, 16, TRS(sx, sy + R0 + 0.012, z), "#e0e6f0");
      fu.torus(metal, 0.032, 0.009, TRS(sx, sy + R0 + 0.085, z), "#e0e6f0", Math.PI * 2, 8);
      const cb = new Bat(); cb.cyl(gloss, 0.024, 0.024, 0.03, 16, TRS(0, 0.015, 0), RED); cb.build(this.crown);
      this.crown.position.set(sx, sy + R0 + 0.03, z); R.add(this.crown);
      for (const s2 of [-1, 1]) {
        fu.cyl(metal, 0.014, 0.014, 0.035, 12, TRS(sx + s2 * 0.115, sy + 0.115, z, 0, 0, -s2 * 0.78), "#e0e6f0");
        fu.sph(gloss, TRS(sx + s2 * 0.08, 0.8 + 0.012, z, 0, 0, 0, [0.03, 0.014, 0.03]), 12, "#2a2a36");
      }
      const hb = new Bat();
      hb.box(gloss, -0.006, -0.025, 0, 0.006, 0.1, 0.006, RED);
      hb.add(new THREE.ConeGeometry(0.014, 0.028, 3), gloss, TRS(0, 0.11, 0.003), RED);
      hb.cyl(metal, 0.015, 0.015, 0.008, 16, TRS(0, 0, 0.004, 0, Math.PI / 2), "#2a2a36");
      hb.build(this.hand);
      this.hand.position.set(sx, sy, z + 0.033); R.add(this.hand);
    }
    // ---- the BANNER on two ropes with bunting below ----
    {
      const bx = BANNER[0] - LAB[0], by = BANNER[1] - LAB[1], z = BANNER[2] - LAB[2], w = 1.8, h = 0.46;
      const g = new THREE.PlaneGeometry(w, h, 24, 4), p = g.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), u = x / (w / 2); p.setY(i, p.getY(i) - 0.035 * (1 - u * u)); p.setZ(i, 0.02 * Math.sin(u * 7.0) * (1 - u * u)); }
      g.computeVertexNormals();
      fu.add(g, imat(S, { map: bannerTex(), spec: 20, specK: 0.1, self: [0.05, 0.04, 0.03] }), TRS(bx, by, z));
      for (const s of [-1, 1]) { fu.rod(plain, V3(bx + (s * w) / 2, by + h / 2, z), V3(bx + s * (w / 2 + 0.12), by + h / 2 + 0.2, LZ + 0.01), 0.006, 5, "#7a5a3a"); fu.sph(metal, TRS(bx + s * (w / 2 + 0.12), by + h / 2 + 0.2, LZ + 0.012, 0, 0, 0, 0.018), 8, GOLD); }
      const cols = [RED, "#ffd23a", "#4ab0ff", "#5ad07a", "#ff8a3a", "#b07aff"];
      for (const s of [-1, 1]) {
        const n = 6;
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) / n, x = s * (0.32 + u * 1.3), y = by - h / 2 - 0.08 - 0.12 * Math.sin(u * Math.PI);
          const sh = new THREE.Shape(); sh.moveTo(-0.06, 0); sh.lineTo(0.06, 0); sh.lineTo(0, -0.11); sh.lineTo(-0.06, 0);
          fu.add(new THREE.ShapeGeometry(sh), plain, TRS(x, y, LZ + 0.03, 0, 0, s * (u - 0.5) * 0.25), cols[(k + (s > 0 ? 3 : 0)) % cols.length]);
        }
        const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(V3(s * (0.32 + u * 1.3), by - h / 2 - 0.08 - 0.12 * Math.sin(u * Math.PI), LZ + 0.03)); }
        fu.tube(plain, pts, 0.004, 30, "#7a5a3a", 4);
      }
    }
    // ---- shelves with glowing flasks (left), the GRIP poster (right), a chart, a plant ----
    {
      const y = 1.32, x0 = -1.62, x1 = -0.98;
      fu.box(wood, x0, y - 0.03, LZ, x1, y, LZ + 0.2, "#ffffff"); fu.box(wood, x0, y + 0.37, LZ, x1, y + 0.4, LZ + 0.2, "#ffffff");
      const fl: [number, number, string, number][] = [[-1.55, y, "#5ad07a", 0], [-1.4, y, "#ff5a7a", 1], [-1.24, y, "#4ab0ff", 2], [-1.08, y, "#ffd23a", 0], [-1.5, y + 0.4, "#b07aff", 1], [-1.3, y + 0.4, "#ff8a3a", 2], [-1.12, y + 0.4, "#5ad0d0", 0]];
      for (const [x, yy, c, kind] of fl) {
        const z = LZ + 0.1, glass = "#e8f6ff", liq = imat(S, { col: c, self: [0.3, 0.3, 0.3], spec: 60, specK: 0.6 });
        if (kind === 0) { cast.lathe(gloss, [[0.001, 0], [0.055, 0], [0.06, 0.03], [0.02, 0.12], [0.018, 0.17], [0.022, 0.18], [0.001, 0.18]], TRS(x, yy, z), 18, glass); fu.lathe(liq, [[0.001, 0.004], [0.057, 0.004], [0.061, 0.03], [0.04, 0.07], [0.001, 0.07]], TRS(x, yy, z), 18); }
        else if (kind === 1) { cast.lathe(gloss, [[0.001, 0], [0.045, 0], [0.045, 0.14], [0.05, 0.15], [0.001, 0.15]], TRS(x, yy, z), 18, glass); fu.cyl(liq, 0.047, 0.047, 0.08, 16, TRS(x, yy + 0.045, z)); }
        else { cast.lathe(gloss, [[0.001, 0], [0.02, 0], [0.06, 0.06], [0.05, 0.11], [0.018, 0.14], [0.018, 0.2], [0.001, 0.2]], TRS(x, yy, z), 18, glass); fu.sph(liq, TRS(x, yy + 0.055, z, 0, 0, 0, [0.062, 0.045, 0.062]), 14); }
      }
      fu.add(new THREE.PlaneGeometry(0.4, 0.55), imat(S, { map: handPosterTex(), spec: 30, specK: 0.1 }), TRS(1.2, 1.55, LZ + 0.004, 0, 0, 0.03));
      fu.add(new THREE.PlaneGeometry(0.6, 0.4), imat(S, { map: chartTex(), spec: 30, specK: 0.1 }), TRS(-1.3, 2.25, LZ + 0.004, 0, 0, -0.02));
      for (const [x, y2] of [[1.2, 1.81], [-1.3, 2.43]] as [number, number][]) fu.sph(gloss, TRS(x, y2, LZ + 0.01, 0, 0, 0, [0.014, 0.014, 0.008]), 8, RED);
      const px = 1.55, pz = -1.3;
      fu.lathe(gloss, [[0.001, 0], [0.14, 0], [0.18, 0.32], [0.19, 0.34], [0.001, 0.34]], TRS(px, 0, pz), 22, "#ff8a3a");
      const r = rng(23), lm = imat(S, { spec: 40, specK: 0.3 });
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 + r() * 0.3; cast.add(leafShape(0.32 + r() * 0.14), lm, TRS(px + Math.cos(a) * 0.05, 0.32, pz + Math.sin(a) * 0.05, -a + Math.PI / 2, -0.25 - r() * 0.5, 0), k % 2 ? "#3f9a3a" : "#5ab44a"); }
    }
    b.build(R); fu.build(R); cast.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.glows = new Glows(R, [{ p: V3(LX0 + 0.05, 1.6, -0.15), c: [0.35, 0.24, 0.12], s: 2.0, g: 0 }], 0.5);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 600, 71, [-1.8, 0.8, -1.5, 1.6, 2.6, 1.0]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const pk = SHOTS[id - 1].look === "peak" ? 1 : smooth((f - 772) / 10);
    const rg = mixRig(LAB_RIGS.lab, LAB_RIGS.peak, pk);
    sunAperture(S, O, LWX, LW.z0, LW.z1, LW.y0, LW.y1, LW.fr, 3, 2, 0.3);
    (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    (S.u.uO.value as THREE.Vector3).set(O.x, O.y, O.z); (S.u.uBox.value as THREE.Vector4).set(LX1, LZ, LY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uRain.value = 0;
    setLights(S, [
      { p: W2(0, 1.05, 0.0), c: rg.patchB, r: 1.3 },                // sun bounce off the table top
      { p: W2(LX0 + 0.5, 1.6, -0.1), c: rg.warmB, r: 1.2 },          // glow by the window
      { p: W2(0.3, 1.9, 3.0), c: rg.fill, r: 3.8 },                  // cool front fill
      { p: W2(0.0, 1.5, LZ + 0.6), c: [rg.patchB[0] * 0.6, rg.patchB[1] * 0.6, rg.patchB[2] * 0.6], r: 1.2 }, // the back wall patch
    ], rg.au, rg.ad);
    (this.sunGlassMat.uniforms.uEm.value as THREE.Vector3).set(rg.sun[0] * 0.5, rg.sun[1] * 0.7, rg.sun[2] * 1.2);
    this.glows.gk.set(rg.win, 0, 0, 0); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(V3(LWX, (LW.y0 + LW.y1) / 2, (LW.z0 + LW.z1) / 2), V3(0, 0, 1), V3(0, 1, 0), (LW.z1 - LW.z0) / 2, (LW.y1 - LW.y0) / 2, V3(...SUN_DIR).negate(), 4.0, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    // the stopwatch: the crown presses at "go" and at the win; the hand ticks in eighths, 1 turn / 4 s, from W.people
    const go = W.people, tEnd = W.wrinkly2 - 0.1;
    const el = id === 4 ? Math.max(0, Math.min(t, tEnd) - go) : 0;
    const press = id === 4 ? Math.exp(-(((t - (go - 0.12)) / 0.08) ** 2)) + Math.exp(-(((t - tEnd) / 0.08) ** 2)) : 0;
    this.crown.position.y = STOPWATCH[1] - LAB[1] + 0.18 - 0.016 * clamp01(press);
    const e8 = el * 8, tick = (Math.floor(e8) + smooth((e8 - Math.floor(e8)) / 0.35)) / 8;
    this.hand.rotation.z = -(tick / 4) * Math.PI * 2 * (labAt(id, t).go > 0 ? 1 : 0);
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > LX0 + 0.1; this.posX.visible = c.x < LX1 - 0.1; this.ceil.visible = c.y < LY - 0.1;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { bath: [0, 1.25, 2.6, 0, 1.05, 0, 45], lab: [0, 1.6, 3.2, 0, 1.0, 0, 45] };
export class Sets {
  root = new THREE.Group();
  private bath = new Bath();
  private lab = new Lab();
  constructor() { this.root.add(this.bath.root, this.lab.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const o: SV3 = place === "lab" ? LAB : BATH, d = DEBUG_VIEW[place];
      cam.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); cam.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    this.bath.root.visible = place === "bath";
    this.lab.root.visible = place === "lab";
    if (this.bath.root.visible) this.bath.update(id, t, cam);
    if (this.lab.root.visible) this.lab.update(id, t, f, cam);
  }
}
