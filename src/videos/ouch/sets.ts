// OWNER: sets. The HOME hallway (golden low-sun morning) and the university pain LAB (2015-ish).
// Both sets use their OWN light rig in a small shader (like burp/interiors.ts): point lights + one "sun through a window"
// term evaluated per pixel by an aperture test (a surface point is sunlit only if the ray toward the sun passes through the
// window rectangle, minus its mullions / blind slats, with a penumbra that widens with distance and a soft leaf dapple),
// so the low sun throws crisp long stripes across the floor and walls. On top, the world's sun shadow map is sampled
// (three's shadow chunks) so the cast cards still throw long shadows onto the sets. The haze shaft is RAY-MARCHED
// through the window prism (NOINK, additive): the mullion / slat stripes show in the air too. Dust motes glow only in the
// sun. Faces between the camera and the room hide automatically (cutaway). The rig follows LOOK_RAMPS itself
// (morning -> xray, lab -> drama -> peak) because the world's light never touches these materials.
// Contracts (LOCAL to the set anchor, metres):
//   HOME: floor y 0 (rug top y 0.012, rug x -2.0..0.6, z -0.25..0.75), back wall z -1.2, side walls x +-3, ceiling 2.6,
//     open toward +z. SIDE TABLE: front-left leg centre (0.35, 0, 0) r 0.04 (other legs (0.85,0,0), (0.35,0,-0.7),
//     (0.85,0,-0.7)), top y 0.78, x 0.29..0.91, z -0.76..0.06 (lamp + key bowl + mail on it).
//     Window (back wall) x -2.35..-1.25, y 0.55..2.05; doorway x 1.55..2.45 (h 2.1); coat hooks x -0.95..-0.15, y 1.7;
//     light switch (1.42, 1.2). Sun stripes cross the walk line z~0 between x -1.6 and 0.2.
//   LAB: floor y 0, back wall z -1.65, side walls x +-3.5, ceiling 3.1. TABLE top y 0.78 (= props LAB_TABLE_Y), x -1.35..1.35, z -0.25..0.39.
//     Tubs (outer) TUB +-0.27 x, +-0.2 z, y 0.78..0.95; WATER SURFACE y 0.86; DUNK POINT TUB+(0, 0.85, -0.06).
//     SCORE SCREEN face plane z -1.575, centre (0, 1.9), 2.4 x 1.2 (header + 6 bar rows, labels left).
//     Red drama spot: from (0.85, 2.88, -0.34) straight down onto TUB_B's volunteer (0.85, 0, -0.34). Bench x 1.55..3.45, z -1.65..-1.15.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { HOME, LAB, SHOTS, LOOK_RAMPS, Look, W, BEEPS, FPS, labAt, smooth, clamp01 } from "./story";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];

// ============================================================ light shader (own rig)
const NL = 10;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uPP; uniform vec3 uPD; uniform vec3 uPC; uniform vec2 uPK;
float sh2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(sh2(i), sh2(i + vec2(1, 0)), f.x), mix(sh2(i + vec2(0, 1)), sh2(i + vec2(1, 1)), f.x), f.y); }
float attK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
float sunK(vec3 p, float dap){
  float den = dot(uSD, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + uSD * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.004 + 0.012 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float d = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float d = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (dap > 0.0 && uWM.w > 0.0) {
    vec2 s = a * 2.6 + vec2(sin(uTT * 0.37), cos(uTT * 0.29)) * 0.12;
    float nz = vn2(s + 3.0) * 0.6 + vn2(s * 2.7 + 9.0) * 0.4;
    k *= 1.0 - uWM.w * smoothstep(0.5, 0.72 + pen * 2.0, nz);
  }
  return k;
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.6 + 0.4 * sh);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.25, 0.6, dot(n, l)) * attK(uLR[i], r2) * (0.75 + 0.25 * sh);
  }
  vec3 dp = uPP - p; float pr2 = dot(dp, dp); vec3 pl = dp * inversesqrt(max(pr2, 1e-6));
  L += uPC * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * smoothstep(-0.1, 0.5, dot(n, pl)) / (1.0 + 0.3 * pr2);
  float ndl = dot(n, uSD);
  if (ndl > 0.0) L += uSC * smoothstep(0.0, 0.25, ndl) * sunK(p, 1.0) * sh;
  return L;
}`;
const VS = /* glsl */ `#include <common>
#include <shadowmap_pars_vertex>
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep;
#if defined(HAS_MAP) || defined(EMAP)
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${CORE}
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  float sh = getShadowMask();
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, vUv * uRep);
#endif
  vec3 c = uCol * tx.rgb * lightAt(vW, n, sh) + uEm;
#ifdef EMAP
  c = texture2D(uMap, vUv * uRep).rgb * uEm;
#endif
#ifdef SPEC
  vec3 v = normalize(cameraPosition - vW);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * attK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW, 0.0) * uSpecK * 1.5 * sh;
  vec3 pl = normalize(uPP - vW);
  c += uPC * 0.15 * pow(max(dot(n, normalize(pl + v)), 0.0), uSpec) * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * uSpecK;
#endif
  gl_FragColor = vec4(c, 1.0);
}`;

type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(0, 0, 1) },
      uWU: { value: V3(1, 0, 0) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(1, 1, 0.02, 0) },
      uTT: { value: 0 }, uPP: { value: V3(0, -999, 0) }, uPD: { value: V3(0, -1, 0) }, uPC: { value: V3(0, 0, 0) }, uPK: { value: new THREE.Vector2(0.9, 0.95) },
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
type MOpt = { col?: string; map?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number] };
const imat = (S: LSet, o: MOpt) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 },
      uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};

// ============================================================ volumetrics (NOINK)
/** ray-marched haze inside the window prism: the stripes (mullions / slats) show in the air */
class Haze {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uInv: { value: new THREE.Matrix3() }, uCen: { value: V3(0, 0, 0) }, uCol: { value: V3(1, 1, 1) }, uK: { value: 0 }, uFloor: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uCol; uniform float uK; uniform float uFloor; varying vec3 vW;
        ${CORE}
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          vec3 rl = uInv * rd + vec3(1e-6); vec3 cl = uInv * (cameraPosition - uCen); vec3 pl = uInv * (vW - uCen);
          bool inside = all(lessThan(abs(cl), vec3(0.5)));
          if (gl_FrontFacing == inside) { gl_FragColor = vec4(0.0); return; }
          vec3 te = (sign(rl) * 0.5 - pl) / rl; float tB = max(min(min(te.x, te.y), te.z), 0.0);
          vec3 p0 = vW;
          if (inside) { p0 = cameraPosition; tB = length(vW - cameraPosition); }
          float acc = 0.0; float dt = tB / 18.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 18; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (p.y < uFloor + 0.01) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.5, 1.0, along));
            float nz = 0.65 + 0.35 * vn2(p.xz * 2.3 + vec2(p.y * 1.7, uTT * 0.06));
            acc += sunK(p, 0.0) * fall * nz * smoothstep(0.35, 1.2, length(p - cameraPosition));
          }
          acc *= dt * uK;
          gl_FragColor = vec4(uCol * acc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  /** window centre c (LOCAL to the set), axes U V (unit), half sizes hx hy, travel dir d (unit), length len; O = set origin */
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, hx: number, hy: number, d: THREE.Vector3, len: number, col: C3, k: number, O: THREE.Vector3) {
    const a = U.clone().multiplyScalar(2 * hx + 0.04), b = Vv.clone().multiplyScalar(2 * hy + 0.04), e = d.clone().multiplyScalar(len);
    const cen = c.clone().addScaledVector(d, len / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    (this.mat.uniforms.uInv.value as THREE.Matrix3).setFromMatrix4(m).invert();
    (this.mat.uniforms.uCen.value as THREE.Vector3).copy(cen).add(O);
    (this.mat.uniforms.uCol.value as THREE.Vector3).set(...col); this.mat.uniforms.uK.value = k; this.mat.uniforms.uFloor.value = O.y;
    this.mesh.visible = k > 0.002;
  }
}
/** a soft additive spot cone (top radius r0 at the lamp, r1 at the floor) */
class Cone {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, r0: number, r1: number, h: number) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: V3(1, 0.2, 0.1) }, uK: { value: 0 }, uT: { value: 0 } },
      vertexShader: `varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vAl = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vAng = uv.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uK; uniform float uT; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
          float streak = 0.75 + 0.25 * sin(vAng * 6.2832 * 9.0 + sin(vAng * 6.2832 * 4.0 + uT * 0.5) * 1.4 + vAl * 3.0);
          float a = uK * pow(e, 1.6) * streak * smoothstep(0.0, 0.15, vAl) * (0.35 + 0.65 * vAl);
          a *= smoothstep(0.4, 1.4, length(cameraPosition - vW));
          gl_FragColor = vec4(uCol * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const g = new THREE.CylinderGeometry(r0, r1, h, 64, 6, true); g.translate(0, -h / 2, 0);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
}
/** dust motes: glow only inside the sun stripes */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[]) {
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
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.23 * sp + ph) * 0.16 + sin(uT * 0.11 + ph * 3.0) * 0.07,
            sin(uT * 0.17 * sp + ph * 2.0) * 0.14, cos(uT * 0.21 * sp + ph * 1.3) * 0.16);
          vec3 L = uSC * sunK(p, 0.0) * 0.8 + (uAU + uAD) * 0.05;
          float tw = 0.6 + 0.4 * sin(uT * (1.5 + 2.5 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.6, 1.4, dist) / max(1.0, dist * 0.2);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}

// ============================================================ geometry helpers
const clean = (g: THREE.BufferGeometry) => {
  const s = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.getAttribute("position").count * 2), 2));
  return out;
};
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => {
  const sc = typeof s === "number" ? V3(s, s, s) : V3(...s);
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) {
    const c = clean(g); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mx?: THREE.Matrix4) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(g, mat, mx);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4) { this.add(new RoundedBoxGeometry(w, h, d, 2, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx); }
  lathe(mat: THREE.Material, pts: [number, number][], mx: THREE.Matrix4, seg = 32) { this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, mx); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 16) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 10) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), mat); }
  build(parent: THREE.Object3D, cast = false) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
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
/** same, on a side wall at x = xw (u = z) */
const wallX = (xw: number, z0: number, z1: number, y0: number, y1: number) => {
  const g = wallZ(z0, z1, y0, y1, 0);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setXYZ(i, xw, p.getY(i), u); }
  g.computeVertexNormals();
  return g;
};
const flat = (x0: number, z0: number, x1: number, z1: number, y: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
  return g;
};

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#2a2a2a", align: CanvasTextAlign = "center", font = "sans-serif") => {
  g.font = `bold ${Math.max(6, Math.round(px))}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const rr = (g: G, x: number, y: number, w: number, h: number, rad: number) => { g.beginPath(); g.roundRect(x, y, w, h, rad); };
const repT = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;

// ---- HOME textures
/** honey-oak floorboards: 2.4 m (u) x 1.2 m (v) per tile, boards along x, 0.15 m wide */
const oakTex = () => repT(ctex("ouOak", 2048, 1024, (g, r) => {
  const pxm = 2048 / 2.4, rows = 8, h = 1024 / rows;
  for (let j = 0; j < rows; j++) {
    const y = j * h;
    let x = -r() * 900;
    while (x < 2048) {
      const L = (0.9 + r() * 1.1) * pxm, hue = 30 + r() * 8, lig = 52 + r() * 12;
      const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, hsl(hue, 58, lig + 4)); gr.addColorStop(1, hsl(hue - 2, 60, lig - 5));
      g.fillStyle = gr; g.fillRect(x, y, L, h);
      g.save(); g.beginPath(); g.rect(x, y, L, h); g.clip();
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = `rgba(90,45,15,${0.08 + r() * 0.14})`; g.lineWidth = 1 + r() * 2.2; g.beginPath();
        const yy = y + r() * h; g.moveTo(x, yy);
        for (let s = 0; s <= 8; s++) g.lineTo(x + (L * s) / 8, yy + Math.sin(s * 0.9 + k) * (2 + r() * 4));
        g.stroke();
      }
      if (r() < 0.45) { const kx = x + r() * L, ky = y + h * (0.3 + 0.4 * r()); g.strokeStyle = "rgba(80,38,12,0.35)"; g.lineWidth = 2; for (let q = 1; q < 4; q++) { g.beginPath(); g.ellipse(kx, ky, q * 7, q * 3, 0, 0, 7); g.stroke(); } }
      noise(g, x, y, L, h, r, Math.floor((L * h) / 250), 0.05);
      g.restore();
      g.fillStyle = "rgba(60,30,10,0.85)"; g.fillRect(x, y, 4, h);
      g.fillStyle = "rgba(255,230,190,0.25)"; g.fillRect(x + 4, y, 2, h);
      g.fillStyle = "#4a2a14"; for (const ny of [y + h * 0.3, y + h * 0.7]) { g.beginPath(); g.arc(x + 14, ny, 2.6, 0, 7); g.fill(); }
      x += L;
    }
    g.fillStyle = "rgba(55,28,10,0.9)"; g.fillRect(0, y, 2048, 4);
    g.fillStyle = "rgba(255,235,200,0.25)"; g.fillRect(0, y + 4, 2048, 2);
  }
}));
/** kilim runner 2.6 x 1.0 */
const rugTex = () => ctex("ouRug", 2048, 800, (g, r) => {
  g.fillStyle = "#b8392c"; g.fillRect(0, 0, 2048, 800);
  g.fillStyle = "#f1e2c2"; g.fillRect(40, 40, 1968, 720); g.fillStyle = "#24365e"; g.fillRect(70, 70, 1908, 660);
  g.fillStyle = "#c9452f"; g.fillRect(110, 110, 1828, 580);
  g.fillStyle = "#e9b43a";
  for (let x = 70; x < 1948; x += 60) for (const [y0, s] of [[70, 1], [730, -1]]) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 30, y0 + 38 * s); g.lineTo(x + 60, y0); g.fill(); }
  for (let k = 0; k < 5; k++) {
    const cx = 290 + k * 367, cy = 400;
    const ring = (s: number, c: string) => { g.fillStyle = c; g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.9, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s * 0.9, cy); g.fill(); };
    ring(230, "#f1e2c2"); ring(190, "#24365e"); ring(150, "#e9b43a"); ring(105, "#2f7a6a"); ring(60, "#f1e2c2"); ring(25, "#b8392c");
    g.fillStyle = "#f1e2c2"; for (const [dx, dy] of [[-170, -200], [170, -200], [-170, 200], [170, 200]]) { g.beginPath(); g.arc(cx + dx, cy + dy * 0.85, 16, 0, 7); g.fill(); }
  }
  for (let y = 0; y < 800; y += 6) { g.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.05})`; g.fillRect(0, y, 2048, 2); }
  noise(g, 0, 0, 2048, 800, r, 22000, 0.06);
  g.fillStyle = "#efe3c6"; g.fillRect(0, 0, 40, 800); g.fillRect(2008, 0, 40, 800);
  g.strokeStyle = "rgba(120,100,70,0.6)"; g.lineWidth = 2; for (let y = 4; y < 800; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(40, y + 2); g.moveTo(2008, y); g.lineTo(2048, y + 2); g.stroke(); }
});
/** cream wallpaper with a small sprig pattern, 0.6 m tile */
const paperTex = () => repT(ctex("ouPaper", 1024, 1024, (g, r) => {
  g.fillStyle = "#f3e3c4"; g.fillRect(0, 0, 1024, 1024);
  for (let x = 0; x < 1024; x += 128) { g.fillStyle = "rgba(214,180,130,0.22)"; g.fillRect(x, 0, 46, 1024); }
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const x = i * 128 + (j % 2) * 64 + 23, y = j * 128 + 40;
    g.strokeStyle = "#7d9a6a"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 26); g.quadraticCurveTo(x + 4, y + 8, x - 2, y - 8); g.stroke();
    g.fillStyle = "#87a873"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 9, y + 6, 8, 4, s * 0.6, 0, 7); g.fill(); }
    g.fillStyle = "#d9785a"; g.beginPath(); g.arc(x - 2, y - 10, 6, 0, 7); g.fill(); g.fillStyle = "#f2c25a"; g.beginPath(); g.arc(x - 2, y - 10, 2.5, 0, 7); g.fill();
  }
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.035);
}));
/** sage wainscot panels: 0.75 m wide x 0.95 m tall tile */
const dadoTex = () => repT(ctex("ouDado", 512, 640, (g, r) => {
  g.fillStyle = "#7f9c88"; g.fillRect(0, 0, 512, 640);
  const px = 50, py = 70, w = 412, h = 470;
  g.fillStyle = "#6c8a76"; g.fillRect(px, py, w, h);
  g.fillStyle = "#93b09b"; g.fillRect(px, py, w, 10); g.fillRect(px, py, 10, h);
  g.fillStyle = "#536f5e"; g.fillRect(px, py + h - 10, w, 10); g.fillRect(px + w - 10, py, 10, h);
  g.fillStyle = "#7a9784"; g.fillRect(px + 26, py + 26, w - 52, h - 52);
  g.strokeStyle = "rgba(40,60,48,0.6)"; g.lineWidth = 3; g.strokeRect(px + 26, py + 26, w - 52, h - 52);
  for (let k = 0; k < 40; k++) { g.strokeStyle = `rgba(255,255,255,${0.03 + r() * 0.03})`; g.lineWidth = 2; const y = r() * 640; g.beginPath(); g.moveTo(0, y); g.lineTo(512, y + r() * 4); g.stroke(); }
  noise(g, 0, 0, 512, 640, r, 5000, 0.04);
}));
/** the garden outside the window (low golden morning sun) */
const gardenTex = () => ctex("ouGarden", 1024, 1024, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 700);
  sky.addColorStop(0, "#7fa6d8"); sky.addColorStop(0.45, "#f3c58e"); sky.addColorStop(0.75, "#ffd9a0"); sky.addColorStop(1, "#ffe9c4");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 1024);
  const sun = g.createRadialGradient(170, 560, 0, 170, 560, 420); sun.addColorStop(0, "rgba(255,250,225,1)"); sun.addColorStop(0.12, "rgba(255,236,180,0.95)"); sun.addColorStop(0.4, "rgba(255,200,120,0.35)"); sun.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#b78a8c";
  for (let k = 0; k < 7; k++) { const x = k * 160 - 40 + r() * 40, w = 150 + r() * 50, y = 600 + r() * 40; g.fillRect(x, y, w, 300); g.beginPath(); g.moveTo(x - 10, y); g.lineTo(x + w / 2, y - 60 - r() * 30); g.lineTo(x + w + 10, y); g.fill(); g.fillRect(x + w * 0.7, y - 70, 18, 50); }
  g.fillStyle = "rgba(255,214,160,0.45)"; g.fillRect(0, 560, 1024, 200);
  for (let k = 0; k < 9; k++) {
    const x = r() * 1024, y = 640 + r() * 60, s = 70 + r() * 90;
    g.fillStyle = "#4f6b4a"; for (let q = 0; q < 7; q++) { g.beginPath(); g.arc(x + (r() - 0.5) * s, y - r() * s, s * (0.35 + r() * 0.3), 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,200,120,0.35)"; g.beginPath(); g.arc(x - s * 0.25, y - s * 0.6, s * 0.3, 0, 7); g.fill();
  }
  g.fillStyle = "#6f9a4c"; g.fillRect(0, 800, 1024, 224);
  g.fillStyle = "#d8b07a";
  for (let x = 0; x < 1024; x += 44) { g.fillRect(x, 700, 32, 120); g.beginPath(); g.moveTo(x, 700); g.lineTo(x + 16, 684); g.lineTo(x + 32, 700); g.fill(); }
  g.fillRect(0, 730, 1024, 12); g.fillRect(0, 785, 1024, 12);
  g.fillStyle = "rgba(90,60,40,0.35)"; for (let x = 0; x < 1024; x += 44) g.fillRect(x + 26, 700, 6, 120);
  g.fillStyle = "#8a5a3a"; g.fillRect(760, 600, 8, 300); g.fillStyle = "#c8503a"; g.beginPath(); g.moveTo(730, 610); g.lineTo(764, 580); g.lineTo(798, 610); g.fill();
  for (let k = 0; k < 18; k++) { g.fillStyle = ["#e0566a", "#f08a5a", "#f6d05a"][k % 3]; g.beginPath(); g.arc(r() * 1024, 820 + r() * 50, 7 + r() * 6, 0, 7); g.fill(); }
});
const artTex = (key: string, kind: number) => ctex(key, 512, 400, (g, r) => {
  if (kind === 0) {
    const s = g.createLinearGradient(0, 0, 0, 400); s.addColorStop(0, "#6fb6e8"); s.addColorStop(0.55, "#bfe3f2"); s.addColorStop(0.56, "#2f7fb6"); s.addColorStop(1, "#1e5a8e");
    g.fillStyle = s; g.fillRect(0, 0, 512, 400); g.fillStyle = "#ffd35a"; g.beginPath(); g.arc(400, 90, 40, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(240, 200); g.lineTo(240, 90); g.lineTo(310, 200); g.fill(); g.fillStyle = "#c8402a"; g.fillRect(200, 200, 130, 20);
    for (let k = 0; k < 9; k++) { g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 3; g.beginPath(); const y = 250 + k * 16; const x = r() * 300; g.moveTo(x, y); g.lineTo(x + 120, y); g.stroke(); }
  } else if (kind === 1) {
    const s = g.createLinearGradient(0, 0, 0, 400); s.addColorStop(0, "#f7a978"); s.addColorStop(1, "#ffe3b0"); g.fillStyle = s; g.fillRect(0, 0, 512, 400);
    for (const [c, y0] of [["#8c6aa8", 170], ["#5a4a8a", 230], ["#36406e", 290]] as [string, number][]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, 400); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.013 + y0)) * 110 * r() - 20); g.lineTo(512, 400); g.fill(); }
  } else if (kind === 2) {
    g.fillStyle = "#5fa8a0"; g.fillRect(0, 0, 512, 400);
    g.fillStyle = "#f0973a"; g.beginPath(); g.ellipse(256, 250, 130, 120, 0, 0, 7); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 120, 190); g.lineTo(256 + s * 95, 80); g.lineTo(256 + s * 40, 150); g.fill(); }
    g.fillStyle = "#fff"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 50, 230, 26, 30, 0, 0, 7); g.fill(); }
    g.fillStyle = "#1a1a1a"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 50, 234, 10, 20, 0, 0, 7); g.fill(); }
    g.fillStyle = "#e0607a"; g.beginPath(); g.moveTo(244, 280); g.lineTo(268, 280); g.lineTo(256, 294); g.fill();
    g.strokeStyle = "#1a1a1a"; g.lineWidth = 3; for (const s of [-1, 1]) for (const d of [-8, 6]) { g.beginPath(); g.moveTo(256 + s * 30, 296 + d * 0.3); g.lineTo(256 + s * 120, 290 + d); g.stroke(); }
  } else {
    g.fillStyle = "#f6ecd6"; g.fillRect(0, 0, 512, 400);
    const cols = ["#e8573a", "#f2b03a", "#2f7a8a", "#24365e"];
    for (let k = 0; k < 4; k++) { g.fillStyle = cols[k]; g.beginPath(); g.arc(256, 400, 330 - k * 75, Math.PI, 0); g.fill(); }
    g.fillStyle = "#f6ecd6"; g.beginPath(); g.arc(256, 400, 40, Math.PI, 0); g.fill();
  }
  noise(g, 0, 0, 512, 400, r, 3000, 0.05);
});
const photoTex = () => ctex("ouPhoto", 256, 320, (g) => {
  g.fillStyle = "#f8f2e4"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#9fd0ee"; g.fillRect(20, 20, 216, 230); g.fillStyle = "#7fc06a"; g.fillRect(20, 190, 216, 60);
  for (const [x, c] of [[90, "#e87a4a"], [160, "#4a7ad0"]] as [number, string][]) { g.fillStyle = c; g.fillRect(x - 22, 140, 44, 60); g.fillStyle = "#f5c9a0"; g.beginPath(); g.arc(x, 118, 24, 0, 7); g.fill(); }
});
const mailTex = () => ctex("ouMail", 256, 180, (g) => { g.fillStyle = "#fbf6ea"; g.fillRect(0, 0, 256, 180); g.fillStyle = "#c8402a"; g.fillRect(196, 14, 44, 52); g.fillStyle = "#555"; for (let k = 0; k < 3; k++) g.fillRect(60, 90 + k * 22, 130, 8); });
const stairTex = () => repT(ctex("ouStairWall", 512, 512, (g, r) => { g.fillStyle = "#c9d6e6"; g.fillRect(0, 0, 512, 512); noise(g, 0, 0, 512, 512, r, 4000, 0.04); g.fillStyle = "#e9eef5"; g.fillRect(0, 440, 512, 72); }));

// ---- LAB textures
const vinylTex = () => repT(ctex("ouVinyl", 1024, 1024, (g, r) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 256, y = j * 256;
    g.fillStyle = (i + j) % 2 ? "#a8b6c4" : "#b8c4d0"; g.fillRect(x, y, 256, 256);
    for (let k = 0; k < 260; k++) { g.fillStyle = ["#7f8fa2", "#e6edf3", "#6c7e94", "#c9d3dc"][k % 4]; g.fillRect(x + r() * 256, y + r() * 256, 2 + r() * 5, 1.5 + r() * 3); }
    g.strokeStyle = "rgba(60,72,88,0.55)"; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, 253, 253);
  }
}));
const labTileTex = () => repT(ctex("ouLabTile", 512, 512, (g, r) => {
  g.fillStyle = "#8a9aa6"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const gr = g.createLinearGradient(i * 128, j * 128, i * 128 + 128, j * 128 + 128);
    const l = 78 + r() * 5; gr.addColorStop(0, hsl(178, 30, l + 5)); gr.addColorStop(1, hsl(182, 28, l - 3));
    g.fillStyle = gr; g.fillRect(i * 128 + 4, j * 128 + 4, 120, 120);
    g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(i * 128 + 8, j * 128 + 8, 60, 6);
  }
}));
const labPaintTex = () => repT(ctex("ouLabPaint", 512, 512, (g, r) => { g.fillStyle = "#e9ece6"; g.fillRect(0, 0, 512, 512); noise(g, 0, 0, 512, 512, r, 9000, 0.03); }));
const ceilTileTex = () => repT(ctex("ouCeil", 512, 512, (g, r) => {
  g.fillStyle = "#e6e8e4"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 2500; k++) { g.fillStyle = "rgba(120,120,110,0.25)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.fillStyle = "#b3b8bc"; g.fillRect(0, 0, 512, 8); g.fillRect(0, 0, 8, 512);
}));
const cityTex = () => ctex("ouCity", 1024, 1024, (g, r) => {
  const s = g.createLinearGradient(0, 0, 0, 800); s.addColorStop(0, "#5f9be0"); s.addColorStop(0.6, "#bfe0f6"); s.addColorStop(1, "#ffe8c0");
  g.fillStyle = s; g.fillRect(0, 0, 1024, 1024);
  const sun = g.createRadialGradient(120, 620, 0, 120, 620, 380); sun.addColorStop(0, "rgba(255,248,220,1)"); sun.addColorStop(0.2, "rgba(255,230,170,0.6)"); sun.addColorStop(1, "rgba(255,230,170,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 9; k++) {
    const x = k * 120 - 30 + r() * 40, w = 90 + r() * 50, top = 220 + r() * 320;
    g.fillStyle = ["#c9d4e2", "#e2dccf", "#aebfd2"][k % 3]; g.fillRect(x, top, w, 900);
    g.fillStyle = "rgba(60,90,130,0.45)"; for (let y = top + 16; y < 900; y += 26) for (let xx = x + 8; xx < x + w - 10; xx += 18) g.fillRect(xx, y, 10, 14);
    g.fillStyle = "rgba(255,240,210,0.35)"; g.fillRect(x, top, 10, 900);
  }
  for (let k = 0; k < 6; k++) {
    const x = r() * 1024, y = 840; g.strokeStyle = "#6a5040"; g.lineWidth = 10; g.beginPath(); g.moveTo(x, 1024); g.quadraticCurveTo(x + 30, 900, x + 10, y - 60); g.stroke();
    g.fillStyle = "#3f7a4a"; for (let q = 0; q < 7; q++) { const a = (q / 7) * Math.PI * 2; g.beginPath(); g.ellipse(x + 10 + Math.cos(a) * 50, y - 60 + Math.sin(a) * 18, 60, 14, a, 0, 7); g.fill(); }
  }
  g.fillStyle = "#4f8a4a"; for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(r() * 1024, 930 + r() * 60, 40 + r() * 40, 0, 7); g.fill(); }
});
const posterTex = (key: string, kind: number) => ctex(key, 512, 720, (g, r) => {
  g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, 512, 720);
  if (kind === 0) {
    g.fillStyle = "#2a6fd6"; g.fillRect(0, 0, 512, 110); txt(g, "COLD WATER", 256, 40, 46, "#fff"); txt(g, "TEST  ·  3 °C", 256, 86, 30, "#d6e8ff");
    g.fillStyle = "#bfe6ff"; g.fillRect(110, 360, 292, 200); g.strokeStyle = "#1d3a6a"; g.lineWidth = 8; g.strokeRect(110, 300, 292, 260);
    g.fillStyle = "#f2c09a"; g.fillRect(230, 170, 56, 260); g.strokeStyle = "#7a4a2a"; g.lineWidth = 5; g.strokeRect(230, 170, 56, 260);
    for (let k = 0; k < 5; k++) { g.fillStyle = "#ffffff"; g.fillRect(130 + k * 55, 370 + (k % 2) * 30, 34, 30); }
    txt(g, "HOW LONG?", 256, 640, 52, "#c8302a");
  } else if (kind === 1) {
    g.fillStyle = "#c8302a"; g.fillRect(0, 0, 512, 110); txt(g, "THE PAIN", 256, 40, 44, "#fff"); txt(g, "PATHWAY", 256, 86, 34, "#ffe0d8");
    g.fillStyle = "#f4b2b8"; g.beginPath(); g.ellipse(256, 230, 120, 90, 0, 0, 7); g.fill(); g.strokeStyle = "#a0405a"; g.lineWidth = 5; g.stroke();
    for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(200 + k * 22, 220 + (k % 2) * 20, 24, 0, 3); g.stroke(); }
    g.strokeStyle = "#ffb020"; g.lineWidth = 10; g.setLineDash([22, 12]); g.beginPath(); g.moveTo(256, 320); g.lineTo(256, 520); g.lineTo(330, 640); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#ffb020"; g.beginPath(); g.arc(330, 650, 24, 0, 7); g.fill(); txt(g, "TOE", 420, 650, 34, "#333");
  } else {
    g.fillStyle = "#f2c21e"; g.fillRect(0, 0, 512, 110); txt(g, "LAB RULES", 256, 56, 50, "#1a1a1a");
    for (let k = 0; k < 6; k++) { g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(70, 180 + k * 85, 16, 0, 7); g.fill(); g.fillStyle = "#9aa2ae"; g.fillRect(110, 172 + k * 85, 150 + r() * 220, 18); }
  }
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 714);
});
const signTex = () => ctex("ouLabSign", 1024, 192, (g) => {
  g.fillStyle = "#14243e"; g.fillRect(0, 0, 1024, 192); g.strokeStyle = "#3fc8ff"; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 172);
  txt(g, "PAIN RESEARCH LAB", 512, 98, 92, "#e8f6ff");
});
const clockTex = () => ctex("ouClock", 512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#1a1a1a"; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.save(); g.translate(256 + Math.sin(a) * 210, 256 - Math.cos(a) * 210); g.rotate(a); g.fillRect(-6, -22, 12, 44); g.restore(); }
});
const towelTex = () => ctex("ouTowel", 256, 256, (g) => { g.fillStyle = "#e9f2f8"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#5a9ad0"; g.fillRect(0, 40, 256, 18); g.fillRect(0, 200, 256, 18); });
const frostTex = () => ctex("ouFrost", 512, 512, (g, r) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
  const gb = g.createLinearGradient(0, 512, 0, 0); gb.addColorStop(0, "rgba(255,255,255,0.75)"); gb.addColorStop(0.22, "rgba(255,255,255,0.18)"); gb.addColorStop(0.6, "rgba(255,255,255,0.02)"); gb.addColorStop(0.9, "rgba(255,255,255,0.12)"); gb.addColorStop(1, "rgba(255,255,255,0.4)");
  g.fillStyle = gb; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 260; k++) {
    const x = r() * 512, y = 512 - Math.pow(r(), 2.2) * 512, s = 3 + r() * 10;
    if (r() < 0.6) { g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`; g.lineWidth = 1.4; for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.stroke(); } }
    else { g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.4})`; g.beginPath(); g.arc(x, y, 1 + r() * 2.5, 0, 7); g.fill(); }
  }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.save(); g.translate(256, 256); g.rotate(-0.25); g.fillRect(-300, -120, 600, 14); g.fillRect(-300, -90, 600, 5); g.restore();
});

// ============================================================ look mixing (own rig follows LOOK_RAMPS, within the shot)
const lookW = (id: number, f: number): Partial<Record<Look, number>> => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && (s.look === r[0] || s.look === r[1]) && s.a <= r[3] && r[2] <= s.b);
  if (!rp) return { [s.look]: 1 };
  const g = smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2]));
  return { [rp[0]]: 1 - g, [rp[1]]: g };
};
type Rig = Record<string, number | C3>;
const mixRig = <T extends Rig>(w: Partial<Record<Look, number>>, rigs: Partial<Record<Look, T>>, fallback: Look): T => {
  const out: Rig = {};
  for (const [k, wt] of Object.entries(w) as [Look, number][]) {
    const R = rigs[k] ?? rigs[fallback]!;
    for (const key of Object.keys(R)) {
      const v = R[key];
      if (typeof v === "number") out[key] = ((out[key] as number) ?? 0) + v * wt;
      else { const o = (out[key] as C3) ?? [0, 0, 0]; out[key] = [o[0] + v[0] * wt, o[1] + v[1] * wt, o[2] + v[2] * wt]; }
    }
  }
  return out as T;
};
const sc3 = (a: C3, k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];

// ============================================================ the HOME hallway
const HX = 3, HZ = -1.2, HY = 2.6, HZF = 5.0;
const HWIN = { x0: -2.35, x1: -1.25, y0: 0.55, y1: 2.05 };
const DOOR = { x0: 1.55, x1: 2.45, h: 2.1 };
type HomeRig = { au: C3; ad: C3; sun: C3; lamp: C3; lampEm: C3; bounce: C3; win: C3; hall: C3; fill: C3; view: C3; haze: number; hazeC: C3; motes: number };
const HOME_RIGS: Partial<Record<Look, HomeRig>> = {
  morning: { au: [0.27, 0.29, 0.4], ad: [0.2, 0.14, 0.1], sun: [4.6, 2.9, 1.45], lamp: [0.85, 0.52, 0.24], lampEm: [2.4, 1.6, 0.75], bounce: [0.62, 0.38, 0.18], win: [0.5, 0.4, 0.34], hall: [0.2, 0.27, 0.44], fill: [0.2, 0.22, 0.32], view: [1.25, 1.25, 1.25], haze: 0.9, hazeC: [1.0, 0.72, 0.4], motes: 1.2 },
  xray: { au: [0.05, 0.09, 0.2], ad: [0.02, 0.035, 0.08], sun: [0.35, 0.7, 1.4], lamp: [0, 0, 0], lampEm: [0.12, 0.18, 0.3], bounce: [0.04, 0.1, 0.22], win: [0.08, 0.2, 0.45], hall: [0.04, 0.08, 0.2], fill: [0.05, 0.09, 0.2], view: [0.18, 0.26, 0.45], haze: 0.28, hazeC: [0.35, 0.7, 1.2], motes: 0.7 },
};
class Home {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  lampMat: THREE.ShaderMaterial; viewMat: THREE.ShaderMaterial; glass: THREE.MeshBasicMaterial;
  haze: Haze; motes: Motes;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...HOME);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat(); // fu = furniture (casts world shadows)
    const oak = imat(S, { map: oakTex(), rep: [1 / 2.4, 1 / 1.2], spec: 24, specK: 0.18 });
    const paper = imat(S, { map: paperTex(), rep: [1 / 0.6, 1 / 0.6] }), dado = imat(S, { map: dadoTex(), rep: [1 / 0.75, 1 / 0.95] });
    const trim = imat(S, { col: "#f6efe2", spec: 30, specK: 0.15 }), ceilM = imat(S, { col: "#f4ede0" });
    const wood = imat(S, { col: "#8a5530", spec: 30, specK: 0.3 }), woodD = imat(S, { col: "#5e3720", spec: 30, specK: 0.25 });
    const brass = imat(S, { col: "#d9a640", spec: 60, specK: 0.9 });
    const DY = 0.95;
    // ---- floor + rug ----
    b.add(flat(-HX, HZ, HX, HZF, 0), oak);
    fu.box(imat(S, { map: rugTex() }), -2.0, 0.0, -0.25, 0.6, 0.012, 0.75);
    // ---- walls ----
    const holes = [[HWIN.x0, HWIN.x1, HWIN.y0, HWIN.y1], [DOOR.x0, DOOR.x1, -1, DOOR.h]];
    b.add(wallZ(-HX, HX, 0, DY, HZ, holes), dado); b.add(wallZ(-HX, HX, DY, HY, HZ, holes), paper);
    bn.add(wallX(-HX, HZ, HZF, 0, DY), dado); bn.add(wallX(-HX, HZ, HZF, DY, HY), paper);
    bp.add(wallX(HX, HZ, HZF, 0, DY), dado); bp.add(wallX(HX, HZ, HZF, DY, HY), paper);
    bc.add(flat(-HX, HZ, HX, HZF, HY), ceilM);
    // skirting, chair rail, cornice (proud of the wall)
    for (const [a, c] of [[-HX, DOOR.x0 - 0.08], [DOOR.x1 + 0.08, HX]]) b.box(trim, a, 0, HZ, c, 0.14, HZ + 0.022);
    for (const [a, c] of [[-HX, HWIN.x0 - 0.06], [HWIN.x1 + 0.06, DOOR.x0 - 0.08], [DOOR.x1 + 0.08, HX]]) b.box(trim, a, DY - 0.02, HZ, c, DY + 0.035, HZ + 0.035);
    b.box(trim, -HX, HY - 0.09, HZ, HX, HY, HZ + 0.06);
    for (const [bb, x, s] of [[bn, -HX, 1], [bp, HX, -1]] as [Bat, number, number][]) {
      bb.box(trim, x, 0, HZ, x + s * 0.022, 0.14, HZF); bb.box(trim, x, DY - 0.02, HZ, x + s * 0.035, DY + 0.035, HZF); bb.box(trim, x, HY - 0.09, HZ, x + s * 0.06, HY, HZF);
    }
    // ---- the window: frame, mullions (= the sun aperture: 2 cols x 3 rows), sill, radiator, curtains, garden view ----
    {
      const { x0, x1, y0, y1 } = HWIN, fw = 0.06;
      for (const [a, c, d, e] of [[x0 - fw, x0, y0 - fw, y1 + fw], [x1, x1 + fw, y0 - fw, y1 + fw], [x0, x1, y1, y1 + fw], [x0, x1, y0 - fw, y0]]) b.box(trim, a, d, HZ - 0.16, c, e, HZ + 0.04);
      const xm = (x0 + x1) / 2; b.box(trim, xm - 0.02, y0, HZ - 0.1, xm + 0.02, y1, HZ - 0.06);
      for (const k of [1, 2]) { const y = y0 + ((y1 - y0) * k) / 3; b.box(trim, x0, y - 0.02, HZ - 0.1, x1, y + 0.02, HZ - 0.06); }
      b.box(trim, x0 - 0.12, y0 - 0.08, HZ + 0.001, x1 + 0.12, y0 - 0.04, HZ + 0.13);
      const rad = imat(S, { col: "#f2f0ea", spec: 40, specK: 0.4 });
      for (let k = 0; k < 14; k++) fu.rbox(rad, 0.055, 0.36, 0.07, 0.02, TRS(x0 + 0.05 + k * 0.077, 0.29, HZ + 0.09));
      fu.rod(brass, V3(x0 + 0.02, 0.14, HZ + 0.09), V3(x1 - 0.02, 0.14, HZ + 0.09), 0.012);
      const cur = imat(S, { col: "#d4713f" });
      for (const [x, s] of [[x0 - 0.2, -1], [x1 + 0.2, 1]] as [number, number][]) {
        for (let k = 0; k < 5; k++) { // pleated curtain, gathered at the tie-back
          const dx = (k - 2) * 0.045, top = V3(x + dx * 1.6, 2.36, HZ + 0.1 + (k % 2) * 0.025), mid = V3(x + dx * 0.5, 1.25, HZ + 0.13), bot = V3(x + dx * 1.4 + s * 0.03, 0.2, HZ + 0.11 + (k % 2) * 0.02);
          fu.tube(cur, [top, V3(x + dx * 1.2, 1.8, HZ + 0.12), mid, V3(x + dx * 1.0, 0.7, HZ + 0.12), bot], 0.032, 24);
        }
        fu.rbox(imat(S, { col: "#e9c070" }), 0.24, 0.05, 0.1, 0.02, TRS(x, 1.25, HZ + 0.16));
      }
      fu.rod(woodD, V3(x0 - 0.42, 2.38, HZ + 0.12), V3(x1 + 0.42, 2.38, HZ + 0.12), 0.018);
      for (const x of [x0 - 0.44, x1 + 0.44]) fu.sph(woodD, TRS(x, 2.38, HZ + 0.12, 0, 0, 0, 0.035));
      this.viewMat = imat(S, { map: gardenTex(), emap: true, em: [1.2, 1.2, 1.2] });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), this.viewMat);
      card.position.set((x0 + x1) / 2 - 0.5, 1.6, HZ - 1.6); card.layers.set(NOINK); R.add(card);
      this.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.08, 0.07, 0.06), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: frostTex() });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), this.glass); gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, HZ - 0.12); gl.layers.set(NOINK); gl.renderOrder = 4; R.add(gl);
    }
    // ---- the doorway: casing + a little cool-lit stair hall beyond ----
    {
      const { x0, x1, h } = DOOR, cw = 0.08;
      b.box(trim, x0 - cw, 0, HZ, x0, h + cw, HZ + 0.03); b.box(trim, x1, 0, HZ, x1 + cw, h + cw, HZ + 0.03); b.box(trim, x0 - cw, h + cw, HZ, x1 + cw, h + cw + 0.03, HZ + 0.035);
      b.box(trim, x0, h - 0.002, HZ - 0.15, x1, h, HZ); for (const x of [x0, x1]) b.box(trim, x - 0.002, 0, HZ - 0.15, x + 0.002, h, HZ);
      const hall = imat(S, { col: "#c6d2e2" }), hallW = imat(S, { map: stairTex(), rep: [1 / 1.4, 1 / 2.6] });
      const z0 = HZ - 0.15, z1 = HZ - 2.4;
      b.add(flat(x0 - 0.5, z1, x1 + 0.7, HZ, 0), oak);
      b.add(new THREE.PlaneGeometry(2.25, 2.6).translate(0, 1.3, 0), hallW, TRS(x0 - 0.5, 0, (z0 + z1) / 2, Math.PI / 2));
      b.add(new THREE.PlaneGeometry(2.25, 2.6).translate(0, 1.3, 0), hall, TRS(x1 + 0.7, 0, (z0 + z1) / 2, -Math.PI / 2));
      b.add(new THREE.PlaneGeometry(x1 - x0 + 1.2, 2.6).translate(0, 1.3, 0), hall, TRS((x0 + x1) / 2 + 0.1, 0, z1));
      b.add(new THREE.PlaneGeometry(x1 - x0 + 1.2, 2.25).rotateX(Math.PI / 2), hall, TRS((x0 + x1) / 2 + 0.1, 2.6, (z0 + z1) / 2));
      for (let k = 0; k < 9; k++) b.box(wood, x0 - 0.5, 0.001, z1 + 0.25 * (8 - k) + 0.05, x0 + 0.5, 0.19 * (k + 1), z1 + 0.25 * (8 - k) + 0.3);
      b.rod(woodD, V3(x0 + 0.5, 1.0, z0 - 0.3), V3(x0 + 0.5, 2.55, z1 + 0.05), 0.025);
      b.add(new THREE.PlaneGeometry(0.4, 0.3), imat(S, { map: artTex("ouArt3", 3) }), TRS(x1 + 0.69, 1.55, z0 - 1.0, -Math.PI / 2));
    }
    // light switch next to the doorway
    b.rbox(imat(S, { col: "#fbfaf6" }), 0.08, 0.12, 0.012, 0.005, TRS(1.42, 1.2, HZ + 0.008));
    b.rbox(imat(S, { col: "#e9e6de" }), 0.02, 0.04, 0.016, 0.006, TRS(1.42, 1.205, HZ + 0.016, 0, -0.25));
    // ---- the SIDE TABLE (front-left leg at (0.35, 0, 0)) ----
    {
      const leg: [number, number][] = [[0.001, 0], [0.032, 0], [0.034, 0.03], [0.026, 0.06], [0.03, 0.12], [0.04, 0.2], [0.03, 0.36], [0.024, 0.52], [0.034, 0.58], [0.04, 0.6], [0.04, 0.735], [0.001, 0.735]];
      for (const [x, z] of [[0.35, 0], [0.85, 0], [0.35, -0.7], [0.85, -0.7]]) fu.lathe(wood, leg, TRS(x, 0, z), 18);
      fu.rbox(wood, 0.62, 0.045, 0.82, 0.012, TRS(0.6, 0.7575, -0.35));
      fu.box(woodD, 0.33, 0.6, -0.73, 0.87, 0.734, -0.69); fu.box(woodD, 0.39, 0.6, -0.02, 0.81, 0.734, 0.02);
      fu.box(woodD, 0.33, 0.6, -0.69, 0.37, 0.734, -0.04); fu.box(woodD, 0.83, 0.6, -0.69, 0.87, 0.734, -0.04);
      fu.box(imat(S, { col: "#9a6238" }), 0.42, 0.625, 0.02, 0.78, 0.71, 0.032); fu.sph(brass, TRS(0.6, 0.668, 0.045, 0, 0, 0, 0.016));
      fu.box(woodD, 0.37, 0.12, -0.67, 0.83, 0.14, -0.03);
      fu.lathe(imat(S, { col: "#2f6f8a", spec: 60, specK: 0.7 }), [[0.001, 0], [0.08, 0], [0.085, 0.03], [0.07, 0.1], [0.09, 0.2], [0.05, 0.3], [0.015, 0.33], [0.012, 0.4], [0.001, 0.4]], TRS(0.68, 0.781, -0.52), 24);
      this.lampMat = imat(S, { col: "#f4dcae", em: [2.4, 1.6, 0.75] });
      fu.lathe(this.lampMat, [[0.16, 0], [0.155, 0.01], [0.09, 0.2], [0.085, 0.21]], TRS(0.68, 1.08, -0.52), 32);
      fu.lathe(imat(S, { col: "#d8573a", spec: 40, specK: 0.5 }), [[0.001, 0], [0.05, 0], [0.09, 0.03], [0.1, 0.05], [0.094, 0.05], [0.045, 0.012], [0.001, 0.012]], TRS(0.5, 0.781, -0.18), 24);
      fu.rod(brass, V3(0.47, 0.81, -0.18), V3(0.53, 0.815, -0.16), 0.006); fu.cyl(brass, 0.014, 0.014, 0.004, 12, TRS(0.455, 0.81, -0.19));
      fu.box(imat(S, { map: mailTex() }), 0.68, 0.781, -0.2, 0.84, 0.792, -0.08);
      const pf = TRS(0.49, 0.781, -0.61, -0.3, -0.12);
      fu.box(woodD, -0.07, 0, -0.01, 0.07, 0.18, 0.01, pf);
      fu.add(new THREE.PlaneGeometry(0.11, 0.145).translate(0, 0.09, 0.011), imat(S, { map: photoTex() }), pf);
    }
    // ---- coat hooks + coats, boots, umbrella ----
    {
      fu.rbox(wood, 0.82, 0.12, 0.025, 0.01, TRS(-0.55, 1.72, HZ + 0.0135));
      for (const x of [-0.85, -0.62, -0.4, -0.18]) { fu.rod(brass, V3(x, 1.72, HZ + 0.02), V3(x, 1.75, HZ + 0.1), 0.009); fu.sph(brass, TRS(x, 1.755, HZ + 0.105, 0, 0, 0, 0.014)); }
      const coat = (x: number, col: string, h: number, w: number, tilt: number) => {
        fu.lathe(imat(S, { col }), [[0.02, 0], [w * 0.45, 0.03], [w * 0.55, h * 0.4], [w * 0.5, h * 0.75], [w * 0.3, h * 0.95], [0.03, h]], TRS(x, 1.74 - h, HZ + 0.12, 0, 0, tilt, [1, 1, 0.42]), 22);
      };
      coat(-0.85, "#e8b83a", 0.95, 0.42, 0.02);
      coat(-0.4, "#4a6a9a", 0.8, 0.38, -0.03);
      fu.sph(imat(S, { col: "#4a6a9a" }), TRS(-0.4, 1.68, HZ + 0.15, 0, 0, 0, [0.11, 0.1, 0.07]));
      const sc = imat(S, { col: "#c8402a" }), sc2 = imat(S, { col: "#f4e6c8" });
      for (let k = 0; k < 7; k++) { fu.box(k % 2 ? sc2 : sc, -0.64, 1.62 - k * 0.09, HZ + 0.07, -0.58, 1.71 - k * 0.09, HZ + 0.09); fu.box(k % 2 ? sc : sc2, -0.67, 1.6 - k * 0.075, HZ + 0.095, -0.61, 1.675 - k * 0.075, HZ + 0.11); }
      fu.lathe(imat(S, { col: "#2f8a6a" }), [[0.001, 0.16], [0.06, 0.15], [0.095, 0.08], [0.1, 0.0], [0.001, 0.0]], TRS(-0.18, 1.6, HZ + 0.14, 0, 0.5, 0.1), 20);
      fu.sph(imat(S, { col: "#f4e6c8" }), TRS(-0.18, 1.75, HZ + 0.22, 0, 0, 0, 0.035));
      fu.box(imat(S, { col: "#5a4a3a" }), -1.0, 0, HZ + 0.05, -0.1, 0.01, HZ + 0.45);
      const boot = imat(S, { col: "#2f4a38", spec: 40, specK: 0.4 });
      for (const x of [-0.82, -0.68]) { fu.rbox(boot, 0.1, 0.3, 0.12, 0.04, TRS(x, 0.161, HZ + 0.2)); fu.rbox(boot, 0.1, 0.08, 0.26, 0.035, TRS(x, 0.051, HZ + 0.26)); }
      fu.lathe(imat(S, { col: "#8a2a4a" }), [[0.001, 0], [0.05, 0.1], [0.06, 0.55], [0.012, 0.75], [0.001, 0.76]], TRS(-0.3, 0.12, HZ + 0.14, 0, -0.12, -0.12), 12);
      fu.rod(woodD, V3(-0.3, 0.011, HZ + 0.12), V3(-0.39, 0.95, HZ + 0.22), 0.008);
    }
    // ---- framed pictures ----
    const frame = (bb: Bat, M: THREE.Matrix4, w: number, h: number, key: string, kind: number, col = "#2f2620") => {
      const fm = imat(S, { col, spec: 40, specK: 0.3 }), f = 0.035;
      bb.box(fm, -w / 2 - f, -h / 2 - f, 0.001, w / 2 + f, -h / 2, 0.03, M); bb.box(fm, -w / 2 - f, h / 2, 0.001, w / 2 + f, h / 2 + f, 0.03, M);
      bb.box(fm, -w / 2 - f, -h / 2, 0.001, -w / 2, h / 2, 0.03, M); bb.box(fm, w / 2, -h / 2, 0.001, w / 2 + f, h / 2, 0.03, M);
      bb.box(imat(S, { col: "#f8f4ea" }), -w / 2, -h / 2, 0.004, w / 2, h / 2, 0.01, M);
      bb.add(new THREE.PlaneGeometry(w * 0.8, h * 0.8).translate(0, 0, 0.014), imat(S, { map: artTex(key, kind) }), M);
    };
    frame(fu, TRS(0.62, 1.62, HZ), 0.62, 0.48, "ouArt0", 0, "#c9a24a");
    frame(fu, TRS(1.12, 1.9, HZ), 0.26, 0.32, "ouArt2", 2);
    frame(fu, TRS(0.12, 2.0, HZ), 0.3, 0.24, "ouArt1", 1, "#f2efe8");
    frame(bn, TRS(-HX, 1.6, -0.2, Math.PI / 2), 0.7, 0.55, "ouArt1b", 1, "#5e3720");
    frame(bp, TRS(HX, 1.6, 0.0, -Math.PI / 2), 0.5, 0.4, "ouArt0b", 3, "#2f2620");
    // ---- the big plant in the back-left corner (in the sun) ----
    {
      fu.lathe(imat(S, { col: "#c8643a", spec: 20, specK: 0.2 }), [[0.001, 0], [0.13, 0], [0.17, 0.32], [0.19, 0.34], [0.19, 0.38], [0.16, 0.38], [0.001, 0.36]], TRS(-2.62, 0.001, -0.85), 28);
      const leaf = imat(S, { col: "#3f8a4a", spec: 40, specK: 0.35 }), stem = imat(S, { col: "#4f7a3a" });
      const r = rng(5);
      for (let k = 0; k < 11; k++) {
        const a = (k / 11) * Math.PI * 2 + r() * 0.4, h = 0.75 + r() * 0.75, o = 0.12 + r() * 0.3;
        const tip = V3(-2.62 + Math.cos(a) * o, h, -0.85 + Math.sin(a) * o * 0.8);
        fu.tube(stem, [V3(-2.62, 0.36, -0.85), V3(-2.62 + Math.cos(a) * o * 0.4, (0.36 + h) / 2, -0.85 + Math.sin(a) * o * 0.3), tip], 0.008, 12);
        fu.sph(leaf, TRS(tip.x + Math.cos(a) * 0.12, tip.y + 0.02, tip.z + Math.sin(a) * 0.1, -a, 0, -0.35 - r() * 0.3, [0.2, 0.012, 0.12]), 18);
      }
    }
    // a shoe bench on the left wall
    fu.rbox(wood, 0.4, 0.05, 1.0, 0.01, TRS(-HX + 0.22, 0.45, 0.7)); for (const z of [0.25, 1.15]) fu.box(woodD, -HX + 0.04, 0.001, z - 0.02, -HX + 0.4, 0.426, z + 0.02);
    fu.rbox(imat(S, { col: "#e8c96a" }), 0.32, 0.08, 0.36, 0.03, TRS(-HX + 0.22, 0.515, 0.55));
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 900, 31, [-2.8, 0.05, -1.15, 1.2, 2.1, 1.6]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), HOME_RIGS, "morning");
    // the low sun: from behind-left, ~25 deg up (stripes run diagonally toward the camera, across BEAN's walk)
    const sd = V3(-0.6, 0.42, -0.66).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    const wc = V3((HWIN.x0 + HWIN.x1) / 2, (HWIN.y0 + HWIN.y1) / 2, HZ - 0.08);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1);
    (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((HWIN.x1 - HWIN.x0) / 2, (HWIN.y1 - HWIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(2, 3, 0.022, 0.32);
    S.u.uTT.value = t;
    const dn = sd.clone().negate(), pool = wc.clone().addScaledVector(dn, (wc.y / -dn.y) * 0.8);
    setLights(S, [
      { p: W2(0.68, 1.05, -0.52), c: rg.lamp, r: 0.75 },
      { p: W2(pool.x, 0.3, Math.min(pool.z, 1.2)), c: rg.bounce, r: 1.9 },
      { p: W2(wc.x, wc.y, HZ + 0.6), c: rg.win, r: 1.5 },
      { p: W2(2.0, 1.6, HZ - 1.3), c: rg.hall, r: 1.6 },
      { p: W2(0, 1.5, 3.0), c: rg.fill, r: 3.2 },
      { p: W2(-2.5, 1.2, 0.8), c: sc3(rg.bounce, 0.35), r: 1.6 },
    ], rg.au, rg.ad);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(...rg.lampEm);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(...rg.view);
    this.glass.color.setRGB(0.065 * rg.view[0], 0.06 * rg.view[1], 0.055 * rg.view[2]);
    this.haze.set(wc, V3(1, 0, 0), V3(0, 1, 0), (HWIN.x1 - HWIN.x0) / 2, (HWIN.y1 - HWIN.y0) / 2, dn, 3.6, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -HX + 0.1; this.posX.visible = c.x < HX - 0.1; this.ceil.visible = c.y < HY - 0.1;
  }
}

// ============================================================ the LAB
const LX = 3.5, LZ = -1.65, LY = 3.1, LZF = 6.5;
const LWIN = { x0: -3.15, x1: -1.75, y0: 0.95, y1: 2.45 };
const TOP = 0.78, TUB = { hx: 0.27, hz: 0.2, h: 0.17 }, WATER = TOP + 0.08;
const SCR = { w: 2.4, h: 1.2, y: 1.9, z: -1.575 };
const SPOT = { x: 0.85, y: LY - 0.22, z: -0.34 };
type LabRig = { au: C3; ad: C3; sun: C3; tube: C3; tubeEm: C3; scrG: C3; fill: C3; spot: C3; red: C3; haze: number; cone: number; scrK: number; mist: number; view: number };
const LAB_RIGS: Partial<Record<Look, LabRig>> = {
  lab: { au: [0.3, 0.33, 0.38], ad: [0.14, 0.16, 0.19], sun: [3.4, 2.6, 1.6], tube: [0.7, 0.76, 0.82], tubeEm: [2.4, 2.5, 2.6], scrG: [0.14, 0.28, 0.6], fill: [0.16, 0.18, 0.24], spot: [0, 0, 0], red: [0, 0, 0], haze: 0.32, cone: 0, scrK: 1.25, mist: 1, view: 1.15 },
  drama: { au: [0.07, 0.035, 0.06], ad: [0.04, 0.015, 0.03], sun: [0.7, 0.35, 0.2], tube: [0.06, 0.05, 0.06], tubeEm: [0.25, 0.22, 0.25], scrG: [0.1, 0.18, 0.4], fill: [0.05, 0.03, 0.06], spot: [9, 1.1, 0.5], red: [1.2, 0.12, 0.08], haze: 0.08, cone: 0.32, scrK: 1.1, mist: 0.8, view: 0.35 },
  peak: { au: [0.13, 0.03, 0.09], ad: [0.06, 0.01, 0.04], sun: [0.6, 0.2, 0.3], tube: [0.05, 0.03, 0.05], tubeEm: [0.2, 0.15, 0.2], scrG: [0.25, 0.1, 0.3], fill: [0.08, 0.02, 0.07], spot: [10, 1.4, 2.2], red: [1.6, 0.15, 0.5], haze: 0.06, cone: 0.42, scrK: 1.2, mist: 0.9, view: 0.3 },
};
const ROWS = [
  { key: "barBase", label: "SILENT", col: "#8fb0dc", badge: "", done: 0.95 },
  { key: "barOw", label: "SAID “OW”", col: "#3fd6ff", badge: "+20%", done: 1.15 },
  { key: "barHear", label: "HEARD “OW”", col: "#b98cff", badge: "+0%", done: 0.95 },
  { key: "barSwear", label: "SWORE #@$%!", col: "#ff3b4a", badge: "+33%", done: 1.28 },
  { key: "barFake", label: "FAKE SWEARS", col: "#ffc23a", badge: "+0%", done: 0.95 },
  { key: "barSailor", label: "SWEARS ALL DAY", col: "#3fe0b0", badge: "+8%", done: 1.03 },
];
type LabState = ReturnType<typeof labAt>;
class Screen {
  cv: HTMLCanvasElement; g: G; tex: THREE.CanvasTexture; last = "";
  constructor() {
    this.cv = document.createElement("canvas"); this.cv.width = 2048; this.cv.height = 1024;
    this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
  draw(L: LabState, t: number, pulse: number) {
    const vals = ROWS.map((r) => (L as unknown as Record<string, number>)[r.key] ?? 0);
    const clock = L.inIce > 0.5 ? Math.max(0, Math.floor(t - W.ice)) : 0;
    const key = vals.map((v) => v.toFixed(3)).join(",") + `|${clock}|${L.drama.toFixed(2)}|${pulse.toFixed(2)}|${L.inIce > 0.5 ? Math.floor(t * 2) % 2 : 9}`;
    if (key === this.last) return;
    this.last = key;
    const g = this.g;
    const bg = g.createLinearGradient(0, 0, 0, 1024); bg.addColorStop(0, "#10224a"); bg.addColorStop(1, "#060d22");
    g.fillStyle = bg; g.fillRect(0, 0, 2048, 1024);
    g.strokeStyle = "rgba(90,140,220,0.08)"; g.lineWidth = 2;
    for (let x = 0; x < 2048; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
    for (let y = 0; y < 1024; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
    // header (turns red with the drama)
    const hd = L.drama;
    g.fillStyle = `rgb(${Math.round(30 + 170 * hd)},${Math.round(60 - 40 * hd)},${Math.round(120 - 90 * hd)})`; g.fillRect(0, 0, 2048, 150);
    txt(g, "ICE WATER TEST", 50, 78, 92, "#ffffff", "left");
    txt(g, "TIME IN ICE", 1450, 78, 54, "#bfe1ff", "right");
    g.fillStyle = "#050a18"; rr(g, 1480, 22, 520, 108, 18); g.fill();
    txt(g, `${String(Math.floor(clock / 60)).padStart(2, "0")}:${String(clock % 60).padStart(2, "0")}`, 1760, 80, 96, "#7dffb0", "center", "monospace");
    if (L.inIce > 0.5 && Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#ff4040"; g.beginPath(); g.arc(1530, 76, 16, 0, 7); g.fill(); }
    // rows
    const y0 = 175, rh = 138, bx = 720, bw = 1060, full = 1.4;
    for (let i = 0; i < ROWS.length; i++) {
      const R = ROWS[i], v = vals[i], y = y0 + i * rh, a = clamp01(v * 5), cy = y + rh / 2;
      g.globalAlpha = 1;
      g.fillStyle = "rgba(255,255,255,0.05)"; rr(g, 30, y + 10, 1988, rh - 20, 18); g.fill();
      g.setLineDash([16, 12]); g.strokeStyle = "rgba(140,170,220,0.25)"; g.lineWidth = 3; rr(g, bx, cy - 36, bw, 72, 36); g.stroke(); g.setLineDash([]);
      if (a < 1) { g.globalAlpha = 1 - a; txt(g, "? ? ?", 380, cy, 60, "rgba(150,175,220,0.5)"); }
      if (a <= 0) continue;
      g.globalAlpha = a;
      g.fillStyle = R.col; g.beginPath(); g.arc(90, cy, 40, 0, 7); g.fill();
      txt(g, String(i + 1), 90, cy + 2, 50, "#0a1430");
      txt(g, R.label, 150, cy + 2, R.label.length > 12 ? 60 : 70, "#ffffff", "left");
      const w = Math.max(72, Math.min(1, v / full) * bw);
      g.fillStyle = R.col; rr(g, bx, cy - 36, w, 72, 36); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)"; rr(g, bx + 18, cy - 28, Math.max(w - 36, 20), 14, 7); g.fill();
      if (i === 3 && pulse > 0.01) { g.globalAlpha = a * pulse; g.fillStyle = "#ffd0d8"; rr(g, bx, cy - 36, w, 72, 36); g.fill(); g.globalAlpha = a; }
      const secs = `${Math.round(v * 60)} s`;
      if (w > 230) txt(g, secs, bx + w - 26, cy + 3, 56, "#0a1430", "right", "monospace");
      else txt(g, secs, bx + w + 20, cy + 3, 56, "#ffffff", "left", "monospace");
      const done = clamp01((v - R.done) * 20);
      if (R.badge && done > 0) {
        g.globalAlpha = a * done;
        const nog = R.badge === "+0%", bw0 = nog ? 250 : 180; // QA2: "no gain" reads clearer than "+0%"
        g.fillStyle = nog ? "#59627a" : "#2fd06a"; rr(g, 2010 - bw0, cy - 40, bw0, 80, 40); g.fill();
        txt(g, nog ? "NO GAIN" : R.badge, 2010 - bw0 / 2, cy + 3, nog ? 44 : 54, "#ffffff");
      }
      g.globalAlpha = 1;
    }
    // the "normal" line at value 1
    const nx = bx + bw / full;
    g.globalAlpha = clamp01(vals[0] * 5);
    g.setLineDash([12, 10]); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 4; g.beginPath(); g.moveTo(nx, y0 + 6); g.lineTo(nx, y0 + ROWS.length * rh - 6); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
    this.tex.needsUpdate = true;
  }
}
/** cold mist puffs over a tub: rise, spill over the rim, sink down the sides (NOINK) */
const mistMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uK: { value: 1 }, uCol: { value: V3(0.8, 0.9, 1) } },
  vertexShader: /* glsl */ `attribute vec4 iS; uniform float uT; varying vec2 vQ; varying float vA;
    void main(){
      float life = fract(uT * (0.09 + 0.05 * iS.z) + iS.w);
      float ang = iS.x * 6.2832; vec2 dir = vec2(cos(ang), sin(ang));
      float spread = smoothstep(0.0, 0.5, life);
      vec2 xz = dir * (0.05 + 0.15 * iS.y + 0.2 * spread) * vec2(1.0, 0.75);
      float over = smoothstep(0.45, 1.0, life);
      float y = ${WATER.toFixed(3)} + 0.03 + 0.07 * sin(life * 3.1416) - over * 0.12;
      vec3 p = (modelMatrix * vec4(xz.x, y, xz.y, 1.0)).xyz;
      vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
      float s = 0.07 + 0.11 * life;
      vQ = position.xy * 2.0; vA = smoothstep(0.0, 0.15, life) * (1.0 - smoothstep(0.7, 1.0, life)) * (0.5 + 0.5 * iS.z);
      gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
  fragmentShader: `uniform float uK; uniform vec3 uCol; varying vec2 vQ; varying float vA;
    void main(){ float a = exp(-dot(vQ, vQ) * 2.2) * vA * uK * 0.3; gl_FragColor = vec4(uCol, a); }`,
  transparent: true, depthWrite: false,
});
const waterMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uDunk: { value: new THREE.Vector2(0, -0.15) }, uIce: { value: 0 }, uTi: { value: 0 }, uLit: { value: V3(1, 1, 1) }, uDeep: { value: V3(0.08, 0.32, 0.42) }, uSun: { value: V3(1, 0.9, 0.7) } },
  vertexShader: `varying vec3 vW; varying vec2 vL; void main(){ vL = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform float uT; uniform vec2 uDunk; uniform float uIce; uniform float uTi; uniform vec3 uLit; uniform vec3 uDeep; uniform vec3 uSun; varying vec3 vW; varying vec2 vL;
    void main(){
      vec2 p = vL;
      vec2 gr = vec2(cos(p.x * 31.0 + uT * 1.3) * 0.5 + cos((p.x + p.y) * 23.0 - uT * 1.1) * 0.4, sin(p.y * 27.0 + uT * 1.6) * 0.5 + cos((p.x - p.y) * 19.0 + uT * 0.9) * 0.4) * 0.06;
      vec2 dd = p - uDunk; float r = length(dd);
      float age = max(uTi, 0.0);
      float ring = sin(r * 70.0 - age * 9.0) * exp(-r * 6.0) * (0.35 + 0.65 * exp(-age * 0.4)) * uIce;
      gr += normalize(dd + 1e-4) * ring * 0.25;
      vec3 n = normalize(vec3(-gr.x, 1.0, -gr.y));
      vec3 v = normalize(cameraPosition - vW);
      float fr = 0.04 + 0.96 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
      vec3 rf = reflect(-v, n);
      float panel = smoothstep(0.75, 0.95, rf.y) * (0.55 + 0.45 * step(0.5, fract(rf.x * 3.0 + 0.25)));
      vec3 col = uDeep * uLit + uLit * panel * 0.9 * fr + uSun * pow(max(dot(rf, normalize(vec3(-0.58, 0.42, -0.7))), 0.0), 120.0) * 2.0;
      col += vec3(0.7, 0.9, 1.0) * uLit * max(ring, 0.0) * 0.35;
      gl_FragColor = vec4(col, clamp(0.55 + fr * 0.45, 0.0, 0.95)); }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
const acrylMat = (frost: THREE.Texture, tint: C3, body: boolean) => new THREE.ShaderMaterial({
  uniforms: { uFrost: { value: frost }, uLit: { value: V3(1, 1, 1) }, uTint: { value: V3(...tint) } },
  defines: body ? { BODY: "1" } : {},
  vertexShader: `varying vec3 vW; varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D uFrost; uniform vec3 uLit; uniform vec3 uTint; varying vec3 vW; varying vec3 vN; varying vec2 vUv;
    void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
#ifdef BODY
      gl_FragColor = vec4(uTint * uLit * (0.6 + 0.4 * vUv.y), 0.5 + 0.25 * (1.0 - vUv.y));
#else
      float fr = 0.06 + 0.7 * pow(1.0 - e, 3.0);
      float fz = texture2D(uFrost, vUv).r;
      gl_FragColor = vec4(uTint * uLit * (0.8 + fz * 0.6), clamp(fr + fz * 0.7, 0.0, 0.92));
#endif
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
});
class Tub {
  g = new THREE.Group(); water: THREE.ShaderMaterial; body: THREE.ShaderMaterial; wall: THREE.ShaderMaterial; mist: THREE.ShaderMaterial;
  cubes: { m: THREE.Mesh; x: number; z: number; ph: number; s: number }[] = [];
  constructor(parent: THREE.Object3D, S: LSet, x: number, seed: number, b: Bat, iceMat: THREE.ShaderMaterial) {
    const G0 = this.g; G0.position.set(x, 0, 0); parent.add(G0);
    const { hx, hz, h } = TUB, y0 = TOP + 0.001, y1 = TOP + h;
    // solid acrylic rim + base + corner edges (inked: they draw the box)
    const rim = imat(S, { col: "#d8f0ff", spec: 80, specK: 1.0, em: [0.05, 0.08, 0.1] });
    b.box(rim, x - hx - 0.012, y1 - 0.018, -hz - 0.012, x + hx + 0.012, y1, -hz + 0.006);
    b.box(rim, x - hx - 0.012, y1 - 0.018, hz - 0.006, x + hx + 0.012, y1, hz + 0.012);
    b.box(rim, x - hx - 0.012, y1 - 0.018, -hz + 0.006, x - hx + 0.006, y1, hz - 0.006);
    b.box(rim, x + hx - 0.006, y1 - 0.018, -hz + 0.006, x + hx + 0.012, y1, hz - 0.006);
    b.box(rim, x - hx - 0.01, y0, -hz - 0.01, x + hx + 0.01, y0 + 0.014, hz + 0.01);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(rim, x + sx * hx - 0.007, y0 + 0.014, sz * hz - 0.007, x + sx * hx + 0.007, y1 - 0.018, sz * hz + 0.007);
    b.cyl(imat(S, { col: "#f4f4f4", spec: 60, specK: 0.6 }), 0.008, 0.008, 0.22, 10, TRS(x + hx - 0.06, y1 + 0.02, -hz + 0.022));
    b.cyl(imat(S, { col: "#d83030" }), 0.0035, 0.0035, 0.1, 8, TRS(x + hx - 0.06, y1 - 0.03, -hz + 0.031));
    // water body (below the surface), the surface, the frosted walls
    this.body = acrylMat(frostTex(), [0.2, 0.62, 0.85], true);
    const bodyG = new THREE.BoxGeometry(2 * hx - 0.02, WATER - 0.004 - (y0 + 0.016), 2 * hz - 0.02); bodyG.translate(0, (WATER - 0.004 + y0 + 0.016) / 2, 0);
    const bm = new THREE.Mesh(bodyG, this.body); bm.renderOrder = 2; bm.layers.set(NOINK); G0.add(bm);
    this.water = waterMat();
    const wg = new THREE.PlaneGeometry(2 * hx - 0.02, 2 * hz - 0.02); wg.rotateX(-Math.PI / 2); wg.translate(0, WATER, 0);
    const wm = new THREE.Mesh(wg, this.water); wm.renderOrder = 3; wm.layers.set(NOINK); G0.add(wm);
    this.wall = acrylMat(frostTex(), [0.85, 0.95, 1.0], false);
    const sides = new THREE.BoxGeometry(2 * hx, h - 0.02, 2 * hz); sides.translate(0, (y0 + y1) / 2, 0);
    const idx = sides.getIndex()!; sides.setIndex(Array.from(idx.array).filter((_, i) => { const face = Math.floor(i / 6); return face !== 2 && face !== 3; }));
    const am = new THREE.Mesh(sides, this.wall); am.renderOrder = 4; am.layers.set(NOINK); G0.add(am);
    const r = rng(seed);
    for (let k = 0; k < 10; k++) {
      const s = 0.055 + r() * 0.03;
      const m = new THREE.Mesh(new RoundedBoxGeometry(s, s * 0.85, s, 2, s * 0.18), iceMat);
      let px = 0, pz = 0;
      for (let tries = 0; tries < 30; tries++) { px = (r() * 2 - 1) * (hx - 0.06); pz = (r() * 2 - 1) * (hz - 0.06); if (Math.hypot(px, pz + 0.06) > 0.1) break; }
      m.receiveShadow = true; m.frustumCulled = false; G0.add(m);
      this.cubes.push({ m, x: px, z: pz, ph: r() * 6.28, s });
    }
    const n = 46, q = new THREE.PlaneGeometry(1, 1), gi = new THREE.InstancedBufferGeometry();
    gi.index = q.index; gi.setAttribute("position", q.getAttribute("position"));
    const D = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) D[i] = r();
    gi.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4)); gi.instanceCount = n;
    this.mist = mistMat();
    const mm = new THREE.Mesh(gi, this.mist); mm.layers.set(NOINK); mm.frustumCulled = false; mm.renderOrder = 6; G0.add(mm);
  }
  update(t: number, inIce: number, lit: C3, mistK: number, tIce: number) {
    const W0 = this.water.uniforms;
    W0.uT.value = t; W0.uIce.value = inIce; W0.uTi.value = t - tIce; (W0.uLit.value as THREE.Vector3).set(...lit);
    (this.body.uniforms.uLit.value as THREE.Vector3).set(...lit); (this.wall.uniforms.uLit.value as THREE.Vector3).set(...lit);
    this.mist.uniforms.uT.value = t; this.mist.uniforms.uK.value = mistK;
    (this.mist.uniforms.uCol.value as THREE.Vector3).set(0.75 * lit[0] + 0.15, 0.85 * lit[1] + 0.15, 0.95 * lit[2] + 0.2);
    const since = Math.max(0, t - tIce), push = inIce * (0.5 + 0.5 * Math.exp(-since * 1.5));
    for (const c of this.cubes) {
      const dx = c.x, dz = c.z + 0.06, d = Math.hypot(dx, dz) || 1, k = push * 0.035 * Math.exp(-d * 4);
      const bob = 0.005 * Math.sin(t * 1.7 + c.ph) + inIce * 0.008 * Math.exp(-since * 2) * Math.sin(since * 14 + c.ph);
      const lim = (v: number, m: number) => Math.max(-m + c.s * 0.75, Math.min(m - c.s * 0.75, v));
      c.m.position.set(lim(c.x + (dx / d) * k, TUB.hx), WATER + c.s * 0.1 + bob, lim(c.z + (dz / d) * k, TUB.hz));
      c.m.rotation.set(0.12 * Math.sin(t * 0.9 + c.ph), c.ph + 0.15 * Math.sin(t * 0.3 + c.ph), 0.1 * Math.cos(t * 1.1 + c.ph));
    }
  }
}
class Lab {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  tubeMat: THREE.ShaderMaterial; viewMat: THREE.ShaderMaterial; scrMat: THREE.ShaderMaterial; spotMat: THREE.ShaderMaterial;
  screen = new Screen(); haze: Haze; motes: Motes; cone: Cone; tubs: Tub[] = [];
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...LAB);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat();
    const vinyl = imat(S, { map: vinylTex(), rep: [1 / 1.2, 1 / 1.2], spec: 60, specK: 0.35 });
    const tile = imat(S, { map: labTileTex(), rep: [1 / 0.6, 1 / 0.6], spec: 50, specK: 0.3 }), paint = imat(S, { map: labPaintTex() });
    const ceilM = imat(S, { map: ceilTileTex(), rep: [1 / 0.6, 1 / 0.6] });
    const steel = imat(S, { col: "#b9c2ca", spec: 60, specK: 0.7 }), dark = imat(S, { col: "#2a3038" }), white = imat(S, { col: "#f2f4f2", spec: 40, specK: 0.3 });
    const DY = 1.1;
    b.add(flat(-LX, LZ, LX, LZF, 0), vinyl);
    const holes = [[LWIN.x0, LWIN.x1, LWIN.y0, LWIN.y1]];
    b.add(wallZ(-LX, LX, 0, DY, LZ, holes), tile); b.add(wallZ(-LX, LX, DY, LY, LZ, holes), paint);
    bn.add(wallX(-LX, LZ, LZF, 0, DY), tile); bn.add(wallX(-LX, LZ, LZF, DY, LY), paint);
    bp.add(wallX(LX, LZ, LZF, 0, DY), tile); bp.add(wallX(LX, LZ, LZF, DY, LY), paint);
    bc.add(flat(-LX, LZ, LX, LZF, LY), ceilM);
    const rail = imat(S, { col: "#5f7f8f", spec: 40, specK: 0.3 }), cove = imat(S, { col: "#4a5a66" });
    for (const [a, c] of [[-LX, LWIN.x0 - 0.06], [LWIN.x1 + 0.06, LX]]) b.box(rail, a, DY - 0.04, LZ, c, DY + 0.04, LZ + 0.04);
    b.box(cove, -LX, 0, LZ, LX, 0.1, LZ + 0.02);
    for (const [bb, x, s] of [[bn, -LX, 1], [bp, LX, -1]] as [Bat, number, number][]) { bb.box(rail, x, DY - 0.04, LZ, x + s * 0.04, DY + 0.04, LZF); bb.box(cove, x, 0, LZ, x + s * 0.02, 0.1, LZF); }
    // ---- window with venetian blinds (16 slats = the sun aperture) + campus view ----
    {
      const { x0, x1, y0, y1 } = LWIN, fw = 0.05, al = imat(S, { col: "#d7dde2", spec: 50, specK: 0.5 });
      for (const [a, c, d, e] of [[x0 - fw, x0, y0 - fw, y1 + fw], [x1, x1 + fw, y0 - fw, y1 + fw], [x0, x1, y1, y1 + fw], [x0, x1, y0 - fw, y0]]) b.box(al, a, d, LZ - 0.12, c, e, LZ + 0.03);
      b.box(al, x0 - 0.08, y0 - 0.07, LZ + 0.001, x1 + 0.08, y0 - 0.04, LZ + 0.12);
      const slat = imat(S, { col: "#eef0ee", spec: 30, specK: 0.3 }), n = 16, sh = (y1 - y0) / n;
      for (let k = 0; k < n; k++) b.box(slat, x0 + 0.01, -0.004, -0.035, x1 - 0.01, 0.004, 0.035, TRS(0, y0 + (k + 1) * sh - 0.012, LZ + 0.07, 0, 0.55));
      b.box(al, x0 - 0.02, y1 + 0.01, LZ + 0.02, x1 + 0.02, y1 + 0.07, LZ + 0.11);
      for (const x of [x0 + 0.15, x1 - 0.15]) b.rod(dark, V3(x, y0 + 0.02, LZ + 0.075), V3(x, y1, LZ + 0.075), 0.003, 4);
      this.viewMat = imat(S, { map: cityTex(), emap: true, em: [1.15, 1.15, 1.15] });
      const card = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 4.5), this.viewMat); card.position.set((x0 + x1) / 2 - 0.4, 1.8, LZ - 1.6); card.layers.set(NOINK); R.add(card);
    }
    // ---- the SCORE SCREEN + sign ----
    {
      fu.rbox(imat(S, { col: "#1c2028", spec: 60, specK: 0.5 }), SCR.w + 0.1, SCR.h + 0.1, 0.07, 0.02, TRS(0, SCR.y, LZ + 0.036));
      this.scrMat = imat(S, { map: this.screen.tex, emap: true, em: [1.25, 1.25, 1.25] });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), this.scrMat); p.position.set(0, SCR.y, SCR.z); p.frustumCulled = false; R.add(p);
      fu.cyl(imat(S, { col: "#3fd6ff", em: [0.4, 1.4, 2.2] }), 0.008, 0.008, 0.004, 10, TRS(SCR.w / 2 - 0.04, SCR.y - SCR.h / 2 - 0.03, LZ + 0.073, 0, Math.PI / 2));
      fu.box(dark, -0.82, 2.72, LZ + 0.001, 0.82, 3.0, LZ + 0.03);
      fu.add(new THREE.PlaneGeometry(1.56, 0.25), imat(S, { map: signTex(), emap: true, em: [1.3, 1.3, 1.3] }), TRS(0, 2.86, LZ + 0.033));
    }
    // ---- the tub TABLE ----
    {
      const top = imat(S, { col: "#f4f6f4", spec: 50, specK: 0.4 }), edge = imat(S, { col: "#3a4a5a" });
      fu.box(top, -1.35, TOP - 0.035, -0.25, 1.35, TOP, 0.39); fu.box(edge, -1.36, TOP - 0.05, -0.25, 1.36, TOP - 0.035, 0.4);
      for (const [x, z] of [[-1.28, -0.19], [1.28, -0.19], [-1.28, 0.33], [1.28, 0.33]]) fu.cyl(steel, 0.022, 0.022, TOP - 0.05, 12, TRS(x, (TOP - 0.05) / 2, z));
      fu.box(steel, -1.3, 0.16, -0.21, 1.3, 0.18, 0.35);
      fu.rbox(imat(S, { map: towelTex() }), 0.34, 0.12, 0.28, 0.04, TRS(-0.95, 0.241, 0.02)); fu.rbox(imat(S, { map: towelTex() }), 0.32, 0.1, 0.26, 0.04, TRS(-0.92, 0.352, 0.0, 0.2));
      fu.rbox(imat(S, { col: "#6ab0e0" }), 0.24, 0.12, 0.13, 0.01, TRS(0.95, 0.241, 0.0));
      fu.rbox(imat(S, { map: towelTex() }), 0.42, 0.02, 0.26, 0.008, TRS(0, TOP + 0.011, 0.04, 0.1));
    }
    const iceMat = imat(S, { col: "#e6f6ff", em: [0.18, 0.24, 0.3], spec: 90, specK: 1.4 });
    // ---- bench with lab gear (right of the screen, on the back wall) ----
    {
      const bx0 = 1.55, bx1 = 3.45, bz1 = LZ + 0.5, bh = 0.9;
      fu.box(imat(S, { col: "#2e3a46", spec: 40, specK: 0.3 }), bx0, bh - 0.04, LZ + 0.001, bx1, bh, bz1);
      fu.box(imat(S, { col: "#dfe6ea" }), bx0 + 0.02, 0.001, LZ + 0.002, bx1 - 0.02, bh - 0.04, bz1 - 0.04);
      for (let k = 0; k < 3; k++) { const x = bx0 + 0.05 + k * 0.62; fu.box(imat(S, { col: "#c8d2da" }), x, 0.1, bz1 - 0.04, x + 0.58, bh - 0.08, bz1 - 0.03); fu.box(steel, x + 0.25, bh - 0.18, bz1 - 0.03, x + 0.33, bh - 0.16, bz1 - 0.012); }
      const glass = imat(S, { col: "#bfe8f2", spec: 90, specK: 1.2, em: [0.04, 0.08, 0.1] });
      const liquid = (c: string) => imat(S, { col: c, em: [0.05, 0.05, 0.05] });
      fu.lathe(glass, [[0.001, 0], [0.06, 0], [0.06, 0.16], [0.068, 0.17], [0.06, 0.17]], TRS(1.75, bh + 0.001, LZ + 0.25), 24);
      fu.cyl(liquid("#3fb0e0"), 0.055, 0.055, 0.08, 20, TRS(1.75, bh + 0.045, LZ + 0.25));
      fu.lathe(glass, [[0.001, 0], [0.08, 0], [0.085, 0.04], [0.03, 0.17], [0.022, 0.24], [0.025, 0.25]], TRS(1.98, bh + 0.001, LZ + 0.22), 24);
      fu.lathe(liquid("#e85a8a"), [[0.001, 0], [0.075, 0], [0.078, 0.035], [0.05, 0.09], [0.001, 0.09]], TRS(1.98, bh + 0.005, LZ + 0.22), 24);
      const ms = imat(S, { col: "#eef0f2", spec: 50, specK: 0.5 });
      fu.rbox(ms, 0.16, 0.03, 0.22, 0.01, TRS(2.3, bh + 0.016, LZ + 0.3)); fu.rbox(ms, 0.05, 0.3, 0.06, 0.015, TRS(2.3, bh + 0.17, LZ + 0.24, 0, 0.12));
      fu.cyl(dark, 0.022, 0.022, 0.16, 14, TRS(2.3, bh + 0.31, LZ + 0.3, 0, 0.6)); fu.box(dark, 2.22, bh + 0.11, LZ + 0.28, 2.38, bh + 0.12, LZ + 0.4);
      fu.rbox(dark, 0.56, 0.36, 0.03, 0.01, TRS(2.85, bh + 0.36, LZ + 0.2)); fu.box(dark, 2.82, bh + 0.001, LZ + 0.15, 2.88, bh + 0.2, LZ + 0.185); fu.box(dark, 2.72, bh + 0.001, LZ + 0.08, 2.98, bh + 0.01, LZ + 0.14);
      fu.add(new THREE.PlaneGeometry(0.52, 0.32), imat(S, { map: posterTex("ouMonitor", 1), emap: true, em: [1.05, 1.05, 1.1] }), TRS(2.85, bh + 0.36, LZ + 0.217));
      fu.rbox(imat(S, { col: "#d8dce0" }), 0.42, 0.015, 0.14, 0.005, TRS(2.85, bh + 0.009, LZ + 0.38));
      fu.box(imat(S, { col: "#f0c22a" }), 3.1, bh + 0.001, LZ + 0.3, 3.38, bh + 0.08, LZ + 0.4);
      const tcols = ["#e8573a", "#3fb0e0", "#7ad05a", "#e8573a", "#b98cff", "#3fb0e0"];
      for (let k = 0; k < 6; k++) { fu.cyl(glass, 0.011, 0.011, 0.16, 10, TRS(3.13 + k * 0.045, bh + 0.1, LZ + 0.35)); fu.cyl(liquid(tcols[k]), 0.0095, 0.0095, 0.07, 10, TRS(3.13 + k * 0.045, bh + 0.06, LZ + 0.35)); }
      fu.box(white, bx0 + 0.1, 1.72, LZ + 0.001, bx1 - 0.1, 1.75, LZ + 0.28);
      for (let k = 0; k < 7; k++) { const hh = 0.16 + (k % 3) * 0.04; fu.rbox(imat(S, { col: ["#7a4a2a", "#e9ecef", "#2a6fd6", "#f2f2f2"][k % 4] }), 0.08, hh, 0.08, 0.015, TRS(bx0 + 0.25 + k * 0.22, 1.751 + hh / 2, LZ + 0.15)); }
      fu.rbox(imat(S, { col: "#2fa060" }), 0.34, 0.26, 0.1, 0.02, TRS(3.05, 2.12, LZ + 0.051));
      fu.box(white, 3.02, 2.1, LZ + 0.1, 3.08, 2.14, LZ + 0.104); fu.box(white, 3.03, 2.07, LZ + 0.1, 3.07, 2.17, LZ + 0.103);
    }
    // ---- left side: a cart with an ice cooler, lab coat on a hook, posters, clock, sink ----
    {
      const cart = imat(S, { col: "#8a9aa8", spec: 50, specK: 0.4 });
      for (const y of [0.15, 0.75]) fu.box(cart, -3.4, y, -1.0, -2.75, y + 0.03, -0.45);
      for (const [x, z] of [[-3.38, -0.98], [-2.77, -0.98], [-3.38, -0.47], [-2.77, -0.47]]) fu.cyl(cart, 0.012, 0.012, 0.78, 8, TRS(x, 0.39, z));
      fu.rbox(imat(S, { col: "#2a7ad0", spec: 40, specK: 0.4 }), 0.5, 0.3, 0.38, 0.04, TRS(-3.07, 0.931, -0.72));
      fu.rbox(imat(S, { col: "#f2f4f6" }), 0.52, 0.06, 0.4, 0.025, TRS(-3.07, 1.11, -0.72));
      fu.rbox(imat(S, { col: "#cfd8de" }), 0.46, 0.18, 0.36, 0.03, TRS(-3.07, 0.271, -0.72));
      bn.lathe(imat(S, { col: "#f6f8f8" }), [[0.02, 0], [0.17, 0.03], [0.2, 0.45], [0.18, 0.8], [0.1, 0.95], [0.02, 1.0]], TRS(-LX + 0.1, 0.92, 0.9, Math.PI / 2, 0, 0, [1, 1, 0.4]), 20);
      bn.rod(steel, V3(-LX, 1.92, 0.9), V3(-LX + 0.09, 1.94, 0.9), 0.008);
      bn.add(new THREE.PlaneGeometry(0.52, 0.72), imat(S, { map: posterTex("ouPosterA", 0) }), TRS(-LX + 0.006, 1.7, -0.35, Math.PI / 2));
      bn.add(new THREE.PlaneGeometry(0.44, 0.6), imat(S, { map: posterTex("ouPosterC", 2) }), TRS(-LX + 0.006, 1.65, 2.0, Math.PI / 2));
      b.add(new THREE.PlaneGeometry(0.36, 0.5), imat(S, { map: posterTex("ouPosterB", 1) }), TRS(-1.48, 1.75, LZ + 0.006));
      bp.add(new THREE.PlaneGeometry(0.52, 0.72), imat(S, { map: posterTex("ouPosterB2", 1) }), TRS(LX - 0.006, 1.7, 0.4, -Math.PI / 2));
      bp.cyl(white, 0.2, 0.2, 0.04, 40, TRS(LX - 0.02, 2.45, 1.6, 0, 0, Math.PI / 2));
      bp.add(new THREE.CircleGeometry(0.18, 40), imat(S, { map: clockTex() }), TRS(LX - 0.042, 2.45, 1.6, -Math.PI / 2));
      bp.box(dark, -0.004, -0.004, -0.002, 0.004, 0.1, 0.002, TRS(LX - 0.047, 2.45, 1.6, -Math.PI / 2, 0, -0.6));
      bp.box(dark, -0.003, -0.003, -0.002, 0.003, 0.15, 0.002, TRS(LX - 0.05, 2.45, 1.6, -Math.PI / 2, 0, 2.4));
      bp.rbox(white, 0.18, 0.2, 0.45, 0.04, TRS(LX - 0.1, 0.85, 2.8)); bp.rod(steel, V3(LX - 0.02, 1.05, 2.8), V3(LX - 0.14, 1.12, 2.8), 0.012);
    }
    // ---- ceiling troffers + the drama spot can ----
    this.tubeMat = imat(S, { col: "#ffffff", em: [2.4, 2.5, 2.6] });
    for (const [x, z] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 1.5], [1.3, 1.5]]) {
      bc.box(imat(S, { col: "#c8ced2" }), x - 0.33, LY - 0.04, z - 0.63, x + 0.33, LY - 0.002, z + 0.63);
      bc.box(this.tubeMat, x - 0.28, LY - 0.05, z - 0.58, x + 0.28, LY - 0.04, z + 0.58);
    }
    this.spotMat = imat(S, { col: "#20242a" });
    bc.cyl(imat(S, { col: "#2a2e34", spec: 50, specK: 0.5 }), 0.09, 0.12, 0.2, 24, TRS(SPOT.x, LY - 0.12, SPOT.z), true);
    bc.cyl(this.spotMat, 0.105, 0.105, 0.004, 24, TRS(SPOT.x, LY - 0.205, SPOT.z));
    bc.rod(dark, V3(-1.6, LY - 0.02, SPOT.z), V3(1.6, LY - 0.02, SPOT.z), 0.015);
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    const tb = new Bat();
    this.tubs.push(new Tub(R, S, -0.7, 41, tb, iceMat), new Tub(R, S, 0.7, 57, tb, iceMat));
    tb.build(R, true);
    this.haze = new Haze(R, S);
    this.cone = new Cone(R, 0.1, 0.95, SPOT.y);
    this.cone.mesh.position.set(SPOT.x, SPOT.y, SPOT.z);
    this.motes = new Motes(R, S, 800, 47, [-3.3, 0.1, -1.6, 2.0, 2.8, 1.8]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), LAB_RIGS, "lab");
    const L = labAt(id, t);
    // the fluorescents stutter as they die on the turn (shot 5), deterministic
    let fl = 1;
    if (id === 5) { const u = t - SHOTS[4].a / FPS; if (u < 0.7) fl = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(u * 41)) * (Math.sin(u * 13) > -0.2 ? 1 : 0.3); }
    let pulse = 0;
    if (id === 6) for (const [bt, who] of BEEPS) if (who === "swearer" && t >= bt) pulse = Math.max(pulse, Math.exp(-(t - bt) * 3.5));
    const tube = sc3(rg.tube, fl), sk = 1 + pulse * 0.45;
    const sd = V3(-0.58, 0.42, -0.7).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    const wc = V3((LWIN.x0 + LWIN.x1) / 2, (LWIN.y0 + LWIN.y1) / 2, LZ - 0.02);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1);
    (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((LWIN.x1 - LWIN.x0) / 2, (LWIN.y1 - LWIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(1, 16, 0.02, 0.18);
    S.u.uTT.value = t;
    (S.u.uPP.value as THREE.Vector3).copy(W2(SPOT.x, SPOT.y, SPOT.z)); (S.u.uPD.value as THREE.Vector3).set(0, -1, 0);
    (S.u.uPC.value as THREE.Vector3).set(...sc3(rg.spot, sk)); (S.u.uPK.value as THREE.Vector2).set(Math.cos(0.33), Math.cos(0.24));
    setLights(S, [
      { p: W2(-1.3, LY - 0.35, -0.6), c: tube, r: 2.2 }, { p: W2(1.3, LY - 0.35, -0.6), c: tube, r: 2.2 },
      { p: W2(-1.3, LY - 0.35, 1.5), c: tube, r: 2.2 }, { p: W2(1.3, LY - 0.35, 1.5), c: tube, r: 2.2 },
      { p: W2(0, SCR.y, LZ + 0.5), c: rg.scrG, r: 1.5 },
      { p: W2(0, 1.6, 3.2), c: rg.fill, r: 3.2 },
      { p: W2(SPOT.x, 1.3, -0.2), c: sc3(rg.red, sk), r: 1.7 },
      { p: W2(-1.0, 0.4, 0.4), c: sc3(rg.sun, 0.12), r: 1.6 },
    ], rg.au, rg.ad);
    (this.tubeMat.uniforms.uEm.value as THREE.Vector3).set(...sc3(rg.tubeEm, fl));
    (this.spotMat.uniforms.uEm.value as THREE.Vector3).set(...sc3(rg.spot, 0.6 * sk));
    (this.scrMat.uniforms.uEm.value as THREE.Vector3).set(rg.scrK, rg.scrK, rg.scrK);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view, rg.view);
    this.screen.draw(L, t, pulse);
    const lit: C3 = [0, 1, 2].map((i) => rg.au[i] * 1.4 + tube[i] * 0.7 + rg.red[i] * 0.35) as C3;
    for (const tb of this.tubs) tb.update(t, L.inIce, lit, rg.mist, W.ice);
    this.haze.set(wc, V3(1, 0, 0), V3(0, 1, 0), (LWIN.x1 - LWIN.x0) / 2, (LWIN.y1 - LWIN.y0) / 2, sd.clone().negate(), 4.2, [1.0, 0.85, 0.6], rg.haze, O);
    this.cone.mat.uniforms.uK.value = rg.cone * sk; this.cone.mat.uniforms.uT.value = t;
    (this.cone.mat.uniforms.uCol.value as THREE.Vector3).set(...sc3(rg.spot, 0.11));
    this.cone.mesh.visible = rg.cone > 0.003;
    this.motes.mat.uniforms.uT.value = t;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -LX + 0.1; this.posX.visible = c.x < LX - 0.1; this.ceil.visible = c.y < LY - 0.1;
  }
}

const DEBUG_CAM = false;
// ============================================================ public class
export class Sets {
  root = new THREE.Group();
  private home = new Home();
  private lab = new Lab();
  constructor() { this.root.add(this.home.root, this.lab.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM) { const pc = cam as THREE.PerspectiveCamera, o = place === "lab" ? LAB : HOME, d = place === "lab" ? [0, 1.7, 4.6, 0, 1.35, -0.6] : [-0.2, 1.35, 3.6, -0.7, 0.8, -0.6];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = 52; pc.updateProjectionMatrix(); pc.updateMatrixWorld(); }
    this.home.root.visible = place === "home";
    this.lab.root.visible = place === "lab";
    if (this.home.root.visible) this.home.update(id, t, f, cam);
    if (this.lab.root.visible) this.lab.update(id, t, f, cam);
  }
}
