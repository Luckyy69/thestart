// OWNER: sets (growl). Kit for the exam HALL + props: merged vertex-colour batches (Bat), the hall's OWN light shader
// rig (imat on an LSet: ambient sky/bounce, 12 soft point lights, the low sun through the LEFT window strip with an
// analytic aperture test: piers + VENETIAN BLIND slats, a "slit" mode (closed blinds, one open gap) and a theatrical
// SPOT), soft additive glows, a ray-marched window haze and sunbeam dust motes. Technique: freeze/sets_kit.ts.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export type C3 = [number, number, number];

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
  const sc = s.getAttribute("color");
  if (sc && !col) { out.setAttribute("color", new THREE.Float32BufferAttribute(Array.from(sc.array as ArrayLike<number>).slice(0, n * 3), 3)); return out; }
  const c = col ?? WHITE, ca = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
export const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => {
  const sc = typeof s === "number" ? V3(s, s, s) : V3(...s);
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
/** parent * child */
export const MM = (a: THREE.Matrix4, b: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(a, b);
const C = (h?: string) => (h ? new THREE.Color(h) : undefined);
export const boxM = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
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
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string, r1?: number) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r1 ?? r, r, L, seg, 1, false), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2, rs = 10) { this.add(new THREE.TorusGeometry(R, r, rs, 48, arc), mat, mx, col); }
  plane(mat: THREE.Material, w: number, h: number, mx: THREE.Matrix4, col?: string) { this.add(new THREE.PlaneGeometry(w, h), mat, mx, col); }
  build(parent: THREE.Object3D, cast = false, layer = -1) {
    const out: THREE.Mesh[] = [];
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      if (layer >= 0) mesh.layers.set(layer);
      parent.add(mesh); out.push(mesh);
    }
    this.m.clear();
    return out;
  }
}
/** a horizontal plane x0..x1, z0..z1 at y (uv in metres) with optional height bumps */
export const flat = (x0: number, z0: number, x1: number, z1: number, y: number, sx = 1, sz = 1, h?: (x: number, z: number) => number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, sx, sz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (h) p.setY(i, y + h(x, z));
    uv.setXY(i, x, -z);
  }
  if (h) g.computeVertexNormals();
  return g;
};
/** a vertical wall at z = z0 from x0..x1, y0..y1 minus rect holes [xa, xb, ya, yb]; uv in metres */
export const wallZ = (x0: number, x1: number, y0: number, y1: number, z0: number, holes: number[][] = []) => {
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
/** a side wall at x = x0 running along z (z0..z1); uv (z, y) in metres; holes [za, zb, ya, yb] */
export const wallX = (x0: number, z0: number, z1: number, y0: number, y1: number, holes: number[][] = []) => {
  const g = wallZ(z0, z1, y0, y1, 0, holes), p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const a = p.getX(i); p.setXYZ(i, x0, p.getY(i), a); }
  g.computeVertexNormals();
  return g;
};
/** a lumpy blob: a sphere (or upper half) with seeded bumps */
export const lump = (rx: number, ry: number, rz: number, seed: number, amp = 0.12, seg = 16, half = true) => {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI), p = g.getAttribute("position") as THREE.BufferAttribute, r = rng(seed);
  const a = [r() * 6, r() * 6, r() * 6], f = [2 + r() * 2, 2 + r() * 2, 3 + r() * 2];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * (Math.sin(x * f[0] + a[0]) * Math.sin(z * f[1] + a[1]) + 0.5 * Math.sin((x + z + y) * f[2] + a[2])) * (half ? Math.min(1, y * 3 + 0.2) : 1);
    p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
  }
  g.computeVertexNormals();
  return g;
};
/** a flat ribbon along a polyline in xz at height y (width w), uv (u across in m, v along in m); vertex colour edge darkening */
export const ribbon = (pts: THREE.Vector2[], w: number, y: number, edge = 0, edgeK = 0.8) => {
  const pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
  const across = edge > 0 ? [-w / 2, -w / 2 + edge, w / 2 - edge, w / 2] : [-w / 2, w / 2];
  let L = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x, tz = b.y - a.y, tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
    if (i > 0) L += pts[i].distanceTo(pts[i - 1]);
    for (const u of across) {
      pos.push(pts[i].x + nx * u, y, pts[i].y + nz * u); uv.push(u, L);
      const k = Math.abs(u) > w / 2 - 1e-4 && edge > 0 ? edgeK : 1; col.push(k, k, k);
    }
  }
  const n = across.length;
  for (let i = 0; i < pts.length - 1; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
};

// ============================================================ the light shader (own rig)
export const NL = 12, NT = 1;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform float uOpen; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uO; uniform vec4 uBox; uniform float uAO; uniform vec4 uTS[${NT}];
uniform vec3 uHazeC; uniform float uFogCap;
uniform vec4 uSl; uniform float uSlK; uniform float uMapK; uniform vec4 uSpP; uniform vec3 uSpD; uniform vec3 uSpC;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// the sun arriving along d (unit, toward the sun) through the window strip minus its piers (cols) and the venetian
// blind slats (rows: uWM.y slats, shadow half-width uWM.w); slit mode (uSlK): blinds shut except one open gap uSl
float apKb(vec3 p, vec3 d, float blinds){
  float den = dot(d, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + d * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.004 + 0.01 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float e = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  float pr = 0.0015 + 0.002 * t;
  float bl = 1.0;
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float e = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; bl = mix(0.1, 1.0, smoothstep(uWM.w - pr, uWM.w + pr, e)); }
  float pz = 0.006 + 0.008 * t;
  float sl = (1.0 - smoothstep(uSl.z - pz, uSl.z + pz, abs(a.x - uSl.x))) * (1.0 - smoothstep(uSl.w - pr, uSl.w + pr, abs(a.y - uSl.y)));
  return k * mix(1.0, mix(bl, sl, uSlK), blinds);
}
float apK(vec3 p, vec3 d){ return apKb(p, d, 1.0); }
float treeK(vec3 p, vec3 d){ return 1.0; }
float sunK(vec3 p){ return apKb(p, uSD, 1.0 - uMapK); }
float spotK(vec3 p){
  if (uSpC.x + uSpC.y + uSpC.z < 0.001) return 0.0;
  vec3 v = normalize(p - uSpP.xyz); return smoothstep(uSpP.w, uSpP.w + 0.012, dot(v, uSpD));
}
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(min(uBox.x - abs(l.x - uBox.w), l.z - uBox.y), uBox.z - l.y), 9.0);
  float a = smoothstep(0.0, 0.9, dw) * 0.35 + 0.65;
  float b = smoothstep(0.0, 0.32, l.y) * 0.25 + 0.75;
  float k = min(a, 1.0) * (l.y > 0.004 ? b : 1.0);
  return mix(1.0, k, uAO);
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.5 + 0.5 * ao);
  }
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = sunK(p); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * mix(1.0, 0.04 + 0.96 * sh, uMapK); }
  float sk = spotK(p);
  if (sk > 0.0) L += uSpC * sk * smoothstep(-0.2, 0.5, dot(n, -uSpD));
  return L;
}`;
const VS = /* glsl */ `#include <common>
#include <fog_pars_vertex>
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
  #include <fog_vertex>
  vec4 lp = vec4(position, 1.0); vec3 ln = normal;
#ifdef USE_INSTANCING
  lp = instanceMatrix * lp; ln = mat3(instanceMatrix) * ln;
#endif
  vec4 w = modelMatrix * lp; vW = w.xyz; vN = normalize(mat3(modelMatrix) * ln); vUv = uv; vC = color;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform vec3 uSelf; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uRim; uniform float uStripe;
#if defined(HAS_MAP) || defined(EMAP)
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
#include <common>
#include <fog_pars_fragment>
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
#ifdef CUT
  if (tx.a < 0.5) discard;
#endif
#ifdef WATER
  // ripples: perturb the normal with two drifting noise layers
  vec2 q = vW.xz * 1.7 + vec2(uTT * 0.13, -uTT * 0.09);
  float e = 0.08;
  float h0 = tn2(q) + 0.5 * tn2(q * 2.3 + 7.0), hx = tn2(q + vec2(e, 0.0)) + 0.5 * tn2((q + vec2(e, 0.0)) * 2.3 + 7.0), hz = tn2(q + vec2(0.0, e)) + 0.5 * tn2((q + vec2(0.0, e)) * 2.3 + 7.0);
  n = normalize(vec3(-(hx - h0) * 0.35, 1.0, -(hz - h0) * 0.35));
#endif
  vec3 lit = lightAt(vW, n, sh);
  vec3 c = uCol * vC * tx.rgb * (lit + uSelf) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm * vC;
#endif
#ifdef WINA
  c += uSelf * 0.0 + uEm * clamp((1.0 - tx.a) / 0.6, 0.0, 1.0) - uEm * vC;
#endif
  if (uStripe > 0.0) { float s = sin((vW.x - uO.x) * 0.9 + (vW.z - uO.z) * 0.45); c *= 1.0 + uStripe * smoothstep(-0.25, 0.25, s) - uStripe * 0.5; }
  vec3 v = normalize(cameraPosition - vW);
#ifdef WATER
  float fr = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 skyR = mix(uAU * 1.25, uHazeC * 1.1, pow(max(dot(-reflect(v, n), uSD), 0.0), 4.0));
  c = mix(c, skyR, 0.12 + 0.45 * fr);
#endif
  if (uRim > 0.0) c += uRim * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (uAU * 0.8 + uSC * 0.08 * sunK(vW));
#ifdef SPEC
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW) * uSpecK * 1.4 * mix(1.0, sh, uMapK);
  c += uSpC * pow(max(dot(n, normalize(-uSpD + v)), 0.0), uSpec) * spotK(vW) * uSpecK * 0.8;
#endif
  gl_FragColor = vec4(c, 1.0);
#ifdef USE_FOG
  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth) * uFogCap;
  vec3 fc = fogColor;
  if (uOpen > 0.5) fc = mix(fc, uHazeC, pow(max(dot(-v, uSD), 0.0), 5.0) * 0.8);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, fogFactor);
#endif
}`;
export type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
export const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uOpen: { value: 0 }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(1, 0, 0) },
      uWU: { value: V3(0, 0, 1) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(1, 1, 0.02, 0.02) },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 0 },
      uTS: { value: Array.from({ length: NT }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uHazeC: { value: new THREE.Color(1, 0.8, 0.6) }, uFogCap: { value: 1 },
      uSl: { value: new THREE.Vector4(0, 0, 0.1, 0.1) }, uSlK: { value: 0 }, uMapK: { value: 0 }, uSpP: { value: new THREE.Vector4(0, -99, 0, 0.9) }, uSpD: { value: V3(0, -1, 0) }, uSpC: { value: V3(0, 0, 0) },
    },
  };
};
export type LDef = { p: THREE.Vector3; c: C3; r: number };
export const setLights = (S: LSet, L: LDef[], au: C3, ad: C3) => {
  for (let i = 0; i < NL; i++) {
    const l = L[i];
    if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); }
  }
  (S.u.uAU.value as THREE.Vector3).set(...au); (S.u.uAD.value as THREE.Vector3).set(...ad);
};
export type MOpt = { col?: string; map?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number]; rim?: number; cut?: boolean; water?: boolean; wina?: boolean; stripe?: number };
export const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.cut) defines.CUT = "1";
  if (o.water) defines.WATER = "1";
  if (o.wina) defines.WINA = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V3(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
      uRim: { value: o.rim ?? 0 }, uStripe: { value: o.stripe ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true, fog: true,
  });
};
/** the hall rig (props.ts builds its props on it) */
let hallS: LSet | null = null;
export const hallRig = () => hallS ?? (hallS = lset());

// ============================================================ volumetrics + glows (NOINK)
export type Keep = { a: THREE.Vector3; h: number; r0: number; r1: number };
const KEEP_GLSL = /* glsl */ `uniform vec4 uKA[3]; uniform vec3 uKB[3];
float rayAxisD(vec3 ro, vec3 rd, vec3 a, float h){
  vec3 w = ro - a; float b = rd.y, d = dot(rd, w), e = w.y, den = max(1.0 - b * b, 1e-4);
  float t = clamp((e - b * d) / den, 0.0, h); vec3 q = a + vec3(0.0, t, 0.0);
  float s = max(dot(q - ro, rd), 0.0); return length(ro + rd * s - q);
}
float keepOut(vec3 ro, vec3 rd){
  float m = 1.0;
  for (int i = 0; i < 3; i++) { if (uKB[i].x <= 0.0) continue; m = min(m, smoothstep(uKB[i].y, uKB[i].z, rayAxisD(ro, rd, uKA[i].xyz, uKB[i].x))); }
  return m;
}`;
const keepU = (keeps: Keep[]) => ({
  uKA: { value: [0, 1, 2].map((i) => new THREE.Vector4(...(keeps[i] ? [keeps[i].a.x, keeps[i].a.y, keeps[i].a.z, 0] as [number, number, number, number] : [0, 0, 0, 0] as [number, number, number, number]))) },
  uKB: { value: [0, 1, 2].map((i) => (keeps[i] ? V3(keeps[i].h, keeps[i].r0, keeps[i].r1) : V3(0, 0, 0))) },
});
/** ray-marched haze inside the window prism: the piers show in the beams; keep-outs around the characters */
export class Haze {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, keeps: Keep[]) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uInv: { value: new THREE.Matrix3() }, uCen: { value: V3(0, 0, 0) }, uHC: { value: V3(1, 1, 1) }, uK: { value: 0 }, uFloor: { value: 0 }, ...keepU(keeps) },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uHC; uniform float uK; uniform float uFloor; varying vec3 vW;
        ${CORE}
        ${KEEP_GLSL}
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          vec3 rl = uInv * rd + vec3(1e-6); vec3 cl = uInv * (cameraPosition - uCen); vec3 pl = uInv * (vW - uCen);
          bool inside = all(lessThan(abs(cl), vec3(0.5)));
          if (gl_FrontFacing == inside) { gl_FragColor = vec4(0.0); return; }
          vec3 te = (sign(rl) * 0.5 - pl) / rl; float tB = max(min(min(te.x, te.y), te.z), 0.0);
          vec3 p0 = vW;
          if (inside) { p0 = cameraPosition; tB = length(vW - cameraPosition); }
          float acc = 0.0; float dt = tB / 28.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 28; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (p.y < uFloor + 0.01) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.04, along) * (1.0 - smoothstep(0.6, 1.0, along));
            float nz = 0.45 + 0.55 * tn2(p.xz * 1.6 + vec2(p.y * 1.4 - uTT * 0.1, uTT * 0.04));
            acc += apK(p, uSD) * fall * nz * smoothstep(0.6, 1.6, length(p - cameraPosition));
          }
          acc *= dt * uK * mix(0.12, 1.0, keepOut(cameraPosition, rd));
          vec3 hc = uHC * acc; hc = 0.3 * (vec3(1.0) - exp(-hc / 0.3));
          gl_FragColor = vec4(hc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  /** box: window centre c (local), axes U (along the window), Vv (up), half sizes, extruded along d (into the room) */
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, hx: number, hy: number, d: THREE.Vector3, len: number, col: C3, k: number, O: THREE.Vector3) {
    const a = U.clone().multiplyScalar(2 * hx + 0.1), b = Vv.clone().multiplyScalar(2 * hy + 0.1), e = d.clone().multiplyScalar(len);
    const cen = c.clone().addScaledVector(d, len / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    (this.mat.uniforms.uInv.value as THREE.Matrix3).setFromMatrix4(m).invert();
    (this.mat.uniforms.uCen.value as THREE.Vector3).copy(cen).add(O);
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(...col); this.mat.uniforms.uK.value = k; this.mat.uniforms.uFloor.value = O.y;
    this.mesh.visible = k > 0.002;
  }
}
/** dust motes: glow only inside the sunbeams */
export class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[], keeps: Keep[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.004 + 0.008 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 }, ...keepU(keeps) },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        ${KEEP_GLSL}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.15 + sin(uT * 0.09 + ph * 3.0) * 0.06,
            sin(uT * 0.15 * sp + ph * 2.0) * 0.12, cos(uT * 0.19 * sp + ph * 1.3) * 0.15);
          vec3 L = uSC * apK(p, uSD) * 0.6 + (uAU + uAD) * 0.015;
          float tw = 0.6 + 0.4 * sin(uT * (1.3 + 2.2 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.8, 1.6, dist) / max(1.0, dist * 0.2) * mix(0.15, 1.0, keepOut(cameraPosition, normalize(p - cameraPosition)));
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
          k *= 1.0 + tw * 0.3 * sin(uT * (2.1 + fract(p.x * 7.3) * 2.0) + p.x * 31.0 + p.y * 17.0);
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

// ============================================================ canvas painting helpers
export type G = CanvasRenderingContext2D;
export const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
export const otxt = (g: G, s: string, x: number, y: number, px: number, col: string, ink: string, lw: number) => {
  g.font = `bold ${Math.round(px)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.strokeStyle = ink; g.lineWidth = lw; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
};
export const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
/** a soft radial blot, wrapped so the tile stays seamless */
export const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W2: number, H: number) => {
  for (const ox of [-W2, 0, W2]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W2 || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};
export const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
export const star = (g: G, x: number, y: number, R: number, r: number, n = 5, rot = -Math.PI / 2) => { g.beginPath(); for (let k = 0; k < n * 2; k++) { const a = (k / (n * 2)) * Math.PI * 2 + rot, rr = k % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
