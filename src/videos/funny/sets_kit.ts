// OWNER: sets (funny). Kit for the HALLWAY + MUSEUM: merged vertex-colour batches (Bat), each place's OWN light shader
// rig (imat on an LSet: ambient sky/bounce, 12 soft point lights, the low sun through up to TWO window apertures with an
// analytic test: bays + piers, ARCHED tops, glazing bars, leaf silhouettes (a plant on the sill), plus a DOOR CHAIN:
// points behind the hallway's back wall (the kitchen) see the hall window only THROUGH the doorway), a theatrical SPOT,
// and soft additive glows. Technique: growl/sets_kit.ts (copied + extended; haze + motes are lightfx's).
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
export const NL = 12;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC;
uniform vec3 uWC[2]; uniform vec3 uWN[2]; uniform vec3 uWU[2]; uniform vec3 uWV[2]; uniform vec2 uWH[2]; uniform vec4 uWB[2]; uniform vec4 uWG[2];
uniform vec3 uLf[8]; uniform vec4 uDoor; uniform float uDZ; uniform float uDK;
uniform float uTT; uniform vec3 uO; uniform vec3 uBA0; uniform vec3 uBA1; uniform vec3 uBB0; uniform vec3 uBB1; uniform float uAO;
uniform vec3 uHazeC; uniform float uFogCap; uniform float uMapK; uniform vec4 uSpP; uniform vec3 uSpD; uniform vec3 uSpC;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// the sun arriving along d (unit, toward the sun) through window i: a strip of uWB.x bays split by piers (half uWB.y),
// optional ARCHED bay tops (uWB.z), glazing bars (uWG: cols per bay, rows, bar half-width), leaf blobs (window 0)
float apW(int i, vec3 p, vec3 d){
  vec4 B = uWB[i]; if (B.w < 0.5) return 0.0;
  vec3 N = uWN[i];
  float den = dot(d, N); if (den > -0.01) return 0.0;
  float t = dot(uWC[i] - p, N) / den; if (t < 0.0) return 0.0;
  vec3 q = p + d * t - uWC[i]; vec2 a = vec2(dot(q, uWU[i]), dot(q, uWV[i])); vec2 H = uWH[i];
  float pen = 0.003 + 0.008 * t;
  float k = (1.0 - smoothstep(H.x - pen, H.x + pen, abs(a.x))) * (1.0 - smoothstep(H.y - pen, H.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  float cw = 2.0 * H.x / max(B.x, 1.0);
  float lx = (fract((a.x + H.x) / cw) - 0.5) * cw;
  float ho = cw * 0.5 - B.y;
  if (B.y > 0.0) k *= smoothstep(-pen, pen, ho - abs(lx));
  if (B.z > 0.5) { float yt = H.y - ho; if (a.y > yt) k *= 1.0 - smoothstep(ho - pen, ho + pen, length(vec2(lx, a.y - yt))); }
  vec4 G = uWG[i]; float pr = 0.002 + 0.004 * t;
  if (G.x > 1.5) { float sc = 2.0 * ho / G.x; float e = abs(fract((lx + ho) / sc + 0.5) - 0.5) * sc; k *= smoothstep(G.z - pr, G.z + pr, e); }
  if (G.y > 1.5) { float rh = 2.0 * H.y / G.y; float e = abs(fract((a.y + H.y) / rh + 0.5) - 0.5) * rh; k *= smoothstep(G.z - pr, G.z + pr, e); }
  if (i == 0) for (int j = 0; j < 8; j++) { vec3 L = uLf[j]; if (L.z > 0.0) k *= smoothstep(L.z - pen * 1.5, L.z + pen * 1.5, length(a - L.xy)); }
  return k;
}
float doorK(vec3 p, vec3 d){
  if (d.z < 0.01) return 0.0;
  float t = (uDZ - p.z) / d.z; vec3 q = p + d * t; float pen = 0.003 + 0.008 * t;
  return (1.0 - smoothstep(uDoor.y - pen, uDoor.y + pen, abs(q.x - uDoor.x))) * (1.0 - smoothstep(uDoor.w - pen, uDoor.w + pen, abs(q.y - uDoor.z)));
}
float apK(vec3 p, vec3 d){
  if (uDK > 0.5 && p.z < uDZ) return apW(0, p, d) * doorK(p, d) + apW(1, p, d);
  return apW(0, p, d) + apW(1, p, d);
}
float sunK(vec3 p){ return apK(p, uSD); }
float spotK(vec3 p){
  if (uSpC.x + uSpC.y + uSpC.z < 0.001) return 0.0;
  vec3 v = normalize(p - uSpP.xyz); return smoothstep(uSpP.w, uSpP.w + 0.02, dot(v, uSpD));
}
float boxAO(vec3 l, vec3 b0, vec3 b1){
  float dw = min(min(min(l.x - b0.x, b1.x - l.x), min(l.z - b0.z, b1.z - l.z)), b1.y - l.y);
  float a = smoothstep(0.0, 0.7, dw) * 0.32 + 0.68;
  float b = smoothstep(0.0, 0.3, l.y - b0.y) * 0.22 + 0.78;
  return min(a, 1.0) * (l.y - b0.y > 0.004 ? b : 1.0);
}
float roomAO(vec3 p){
  vec3 l = p - uO;
  bool inB = uBB1.x > uBB0.x && all(greaterThan(l, uBB0 - vec3(0.02))) && all(lessThan(l, uBB1 + vec3(0.02)));
  float k = inB ? boxAO(l, uBB0, uBB1) : boxAO(l, uBA0, uBA1);
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
  if (ndl > 0.0) { float k = sunK(p); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * mix(1.0, 0.05 + 0.95 * sh, uMapK); }
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
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform vec3 uSelf; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uRim;
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
  vec3 lit = lightAt(vW, n, sh);
  vec3 c = uCol * vC * tx.rgb * (lit + uSelf) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm * vC;
#endif
  vec3 v = normalize(cameraPosition - vW);
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
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
}`;
export type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const v4 = (a = 0, b = 0, c = 0, d = 0) => new THREE.Vector4(a, b, c, d);
export const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) },
      uWC: { value: [V3(0, 0, 0), V3(0, 0, 0)] }, uWN: { value: [V3(1, 0, 0), V3(1, 0, 0)] }, uWU: { value: [V3(0, 0, 1), V3(0, 0, 1)] }, uWV: { value: [V3(0, 1, 0), V3(0, 1, 0)] },
      uWH: { value: [new THREE.Vector2(0.5, 0.5), new THREE.Vector2(0.5, 0.5)] }, uWB: { value: [v4(1), v4(1)] }, uWG: { value: [v4(), v4()] },
      uLf: { value: Array.from({ length: 8 }, () => V3(0, 0, 0)) }, uDoor: { value: v4() }, uDZ: { value: 0 }, uDK: { value: 0 },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBA0: { value: V3(-1, 0, -1) }, uBA1: { value: V3(1, 3, 1) }, uBB0: { value: V3(0, 0, 0) }, uBB1: { value: V3(0, 0, 0) }, uAO: { value: 0 },
      uHazeC: { value: new THREE.Color(1, 0.8, 0.6) }, uFogCap: { value: 1 }, uMapK: { value: 0 },
      uSpP: { value: v4(0, -99, 0, 0.9) }, uSpD: { value: V3(0, -1, 0) }, uSpC: { value: V3(0, 0, 0) },
    },
  };
};
/** a window aperture: centre c (world), inward normal n, along u, up v, half sizes, bays, pier half-width, arched,
 *  glazing (cols per bay, rows, bar half-width) */
export type Aperture = { c: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; hw: number; hh: number; bays: number; pier: number; arch: boolean; cols: number; rows: number; bar: number };
export const setAperture = (S: LSet, i: number, A: Aperture | null) => {
  const B = (S.u.uWB.value as THREE.Vector4[])[i];
  if (!A) { B.w = 0; return; }
  (S.u.uWC.value as THREE.Vector3[])[i].copy(A.c); (S.u.uWN.value as THREE.Vector3[])[i].copy(A.n);
  (S.u.uWU.value as THREE.Vector3[])[i].copy(A.u); (S.u.uWV.value as THREE.Vector3[])[i].copy(A.v);
  (S.u.uWH.value as THREE.Vector2[])[i].set(A.hw, A.hh); B.set(A.bays, A.pier, A.arch ? 1 : 0, 1);
  (S.u.uWG.value as THREE.Vector4[])[i].set(A.cols, A.rows, A.bar, 0);
};
export type LDef = { p: THREE.Vector3; c: C3; r: number };
export const setLights = (S: LSet, L: LDef[], au: C3, ad: C3) => {
  for (let i = 0; i < NL; i++) {
    const l = L[i];
    if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); }
  }
  (S.u.uAU.value as THREE.Vector3).set(...au); (S.u.uAD.value as THREE.Vector3).set(...ad);
};
export type MOpt = { col?: string; map?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number]; rim?: number; cut?: boolean };
export const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.cut) defines.CUT = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V3(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
      uRim: { value: o.rim ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true, fog: true,
  });
};
/** mix two rigs of numbers / number arrays */
export const mixRec = <T extends Record<string, unknown>>(a: T, b: T, k: number): T => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(a)) {
    const x = a[key], y = b[key];
    o[key] = Array.isArray(x) ? (x as number[]).map((v, i) => v + ((y as number[])[i] - v) * k) : typeof x === "number" ? x + ((y as number) - x) * k : x;
  }
  return o as T;
};

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
