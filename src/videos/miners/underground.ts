// OWNER: underground agent. See /home/user/lookmatch/MINERS_BRIEF.md
// MINE (the ramp tunnel + the collapse of shot 4) and the REFUGE (the shelter room of shots 1, 6, 7).
// Both sets use their OWN light rig (point / spot lights evaluated per pixel in a small shader, like apollo/interiors.ts),
// so the outdoor sun / look never touches them: warm caged lamps with reflector shades, a pickup's headlights, a bare
// bulb, helmet lamps. Every bulb / lens is an HDR emissive (> 1) for the bloom. Volumetric lamp cones and dust motes
// (NOINK, additive) sit in the beams; the collapse adds falling rocks, pebbles, two roof slabs, the sealing block and
// billowing dust cards (NOINK) lit by the same lights. Everything is a pure function of (id, t) (seeded hashes only).
// Geometry is local to MINE / REFUGE (each set is a Group at its anchor); light positions are world space.
// Contracts for other owners (exported below, all LOCAL to their anchor, metres):
//   TUNNEL   : tunnelAt(z) -> { c: floor centre, side: unit +a vector } ; the tunnel runs from local z = +14 (closed end
//              behind the shot-4 camera) down to z = -46, 5.4 m wide, walls to 2.5 m, arch to 4.3 m; floor y = 0 for z >= 0
//              and ramps down for z < 0. Pickup truck at a = -1.25, z = -3.7..-8.9 (nose toward -z). Collapse zone
//              z = -8..-19; the sealing block drops at z = -20..-25. Floor y = 0 and clear for cards at z >= -1.5, a in [-2, 2].
//   REFUGE_L : refuge room x in [-5, 5], z in [-3, 3] (floor y = 0, walls to 1.85 m, ceiling ~2.75 m); doorway/stub to +z at
//              x in [0.6, 4.6], z 3..10. Bench seats (top y 0.45): back bench x -4.6..-1.85 at z -2.55, tally bench
//              x 1.4..4.4 at z -2.55, side benches along x -4.55 and x 4.55, z -1.8..1.8. Cabinet x -1.6..-0.4 (back wall,
//              centre -1.0), oxygen bottle (-0.1, -2.68), tally marks on the back wall x 1.3..4.5, y 0.7..1.8, bulb (0.2, 2.2, 0).
//              bottle (0.45, -2.65), tally marks on the back wall x 1.3..4.5, y 0.7..1.8, bulb at (0.2, 2.2, 0).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng, beamHD } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { MINE, REFUGE, W, dayAt, collapseAt, clamp01, smooth } from "./story";

// ============================================================ noise (deterministic)
const hsh = (i: number, j: number, k: number) => {
  let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const fd = (x: number) => x * x * (3 - 2 * x);
const vn = (x: number, y: number, z: number) => {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = fd(x - i), v = fd(y - j), w = fd(z - k);
  const L = (a: number, b: number, s: number) => a + (b - a) * s;
  return L(L(L(hsh(i, j, k), hsh(i + 1, j, k), u), L(hsh(i, j + 1, k), hsh(i + 1, j + 1, k), u), v),
    L(L(hsh(i, j, k + 1), hsh(i + 1, j, k + 1), u), L(hsh(i, j + 1, k + 1), hsh(i + 1, j + 1, k + 1), u), v), w);
};
const fbm = (x: number, y: number, z: number) => 0.5 * vn(x, y, z) + 0.3 * vn(2.03 * x + 5.1, 2.03 * y + 1.7, 2.03 * z + 9.2) + 0.2 * vn(4.1 * x + 2.3, 4.1 * y + 7.7, 4.1 * z + 3.3);
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ============================================================ light shader (own rig)
const NL = 12;
const VS = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 lp = vec4(position, 1.0); vec3 nn = normal;
#ifdef USE_INSTANCING
  lp = instanceMatrix * lp; nn = mat3(instanceMatrix) * nn;
#endif
  vec4 w = modelMatrix * lp; vW = w.xyz; vN = normalize(mat3(modelMatrix) * nn); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIGHT = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec4 uLD[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
float spotK(vec4 d, vec3 l){ if (d.w < -1.5) return 1.0; return smoothstep(d.w, d.w + (1.0 - d.w) * 0.5, dot(-l, d.xyz)); }
float attK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
vec3 lightAt(vec3 p, vec3 n){
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.25, 0.6, dot(n, l)) * attK(uLR[i], r2) * spotK(uLD[i], l);
  }
  return L;
}
vec3 lightVol(vec3 p, float spotOnly){
  vec3 L = vec3(0.0);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    float isSpot = uLD[i].w < -1.5 ? 0.0 : 1.0;
    L += uLC[i] * attK(uLR[i], r2) * spotK(uLD[i], l) * mix(1.0, isSpot, spotOnly);
  }
  return L;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK;
#ifdef HAS_MAP
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
${LIGHT}
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, vUv);
#endif
  vec3 c = uCol * tx.rgb * lightAt(vW, n) + uEm;
#ifdef SPEC
  vec3 v = normalize(cameraPosition - vW);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * attK(uLR[i] * 1.6, r2) * spotK(uLD[i], l) * uSpecK;
  }
#endif
  float al = 1.0;
#ifdef HAS_ALPHA
  al = tx.a;
#endif
  gl_FragColor = vec4(c, al);
}`;

type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[]; ld: THREE.Vector4[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0));
  const lc = Array.from({ length: NL }, () => V3(0, 0, 0));
  const lr = Array.from({ length: NL }, () => 1);
  const ld = Array.from({ length: NL }, () => new THREE.Vector4(0, -1, 0, -2));
  return { lp, lc, lr, ld, u: { uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uLD: { value: ld }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) } } };
};
type LDef = { p: THREE.Vector3; c: [number, number, number]; r: number; dir?: THREE.Vector3; cos?: number };
const setLights = (S: LSet, L: LDef[], au: [number, number, number], ad: [number, number, number]) => {
  for (let i = 0; i < NL; i++) {
    const l = L[i];
    if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; if (l.dir) S.ld[i].set(l.dir.x, l.dir.y, l.dir.z, l.cos ?? 0.5); else S.ld[i].set(0, -1, 0, -2); }
    else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); S.ld[i].set(0, -1, 0, -2); }
  }
  (S.u.uAU.value as THREE.Vector3).set(...au); (S.u.uAD.value as THREE.Vector3).set(...ad);
};
type MOpt = { col?: string; map?: THREE.Texture; em?: [number, number, number]; spec?: number; specK?: number; alpha?: boolean };
const imat = (S: LSet, o: MOpt) => {
  const defines: Record<string, string> = {};
  if (o.map) defines.HAS_MAP = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.alpha) defines.HAS_ALPHA = "1";
  return new THREE.ShaderMaterial({
    uniforms: { ...S.u, uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null } },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, transparent: !!o.alpha, depthWrite: !o.alpha,
  });
};

// ============================================================ volumetric bits (NOINK)
/** a soft additive light cone: apex at the lamp, pointing along dir */
const beamMat = (col: [number, number, number], k: number, len: number) => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: V3(...col) }, uK: { value: k }, uT: { value: 0 }, uLen: { value: len } },
  vertexShader: /* glsl */ `uniform float uLen; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
    void main(){ vAl = clamp(-position.y / uLen, 0.0, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vAng = uv.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform float uT; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
    void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
      float streak = 0.72 + 0.28 * sin(vAng * 6.2832 * 9.0 + sin(vAng * 6.2832 * 4.0 + uT * 0.4) * 1.7);
      float a = uK * pow(1.0 - vAl, 1.7) * smoothstep(0.0, 0.12, vAl) * e * e * streak;
      a *= smoothstep(0.5, 1.6, length(cameraPosition - vW));
      gl_FragColor = vec4(uCol * a, 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const beamGeo = (len: number, rad: number) => {
  const g = new THREE.CylinderGeometry(0.05, rad, len, 40, 10, true);
  g.translate(0, -len / 2, 0);
  return g;
};
class Beam {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; len: number;
  constructor(parent: THREE.Object3D, len: number, rad: number, col: [number, number, number], k: number) {
    this.len = len; this.mat = beamMat(col, k, len);
    this.mesh = new THREE.Mesh(beamGeo(len, rad), this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  /** apex + direction in the parent's space */
  set(apex: THREE.Vector3, dir: THREE.Vector3, k: number, t: number) {
    this.mesh.position.copy(apex);
    this.mesh.quaternion.setFromUnitVectors(V3(0, -1, 0), dir.clone().normalize());
    this.mat.uniforms.uK.value = k; this.mat.uniforms.uT.value = t;
    this.mesh.visible = k > 0.002;
  }
}
const quadGeo = () => new THREE.PlaneGeometry(1, 1);
/** dust motes floating in the lamp beams: lit only by the spot lights (and the bulb, weakly) */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: [number, number, number, number, number, number], k: number) {
    const q = quadGeo(), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.006 + 0.012 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: k }, uO: { value: V3(0, 0, 0) } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; uniform vec3 uO;
        varying vec3 vC; varying vec2 vQ; ${LIGHT}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = uO + iP + vec3(sin(uT * 0.31 * sp + ph) * 0.22 + sin(uT * 0.13 + ph * 3.0) * 0.1, sin(uT * 0.21 * sp + ph * 2.0) * 0.25 - 0.04 * uT * (0.5 + iS.w),
            cos(uT * 0.27 * sp + ph * 1.3) * 0.22);
          vec3 L = lightVol(p, 0.75);
          float tw = 0.55 + 0.45 * sin(uT * (2.0 + 3.0 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p);
          float s = iS.y * max(1.0, dist * 0.18);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.7, 1.5, dist) / max(1.0, dist * 0.18);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}
/** soft dust puff atlas (2 x 2 cells) */
const puffTex = () => {
  const t = ctex("mnPuffs", 512, 512, (g, r) => {
    g.clearRect(0, 0, 512, 512);
    for (let c = 0; c < 4; c++) {
      const ox = (c % 2) * 256, oy = Math.floor(c / 2) * 256;
      for (let i = 0; i < 90; i++) {
        const a = r() * Math.PI * 2, d = Math.pow(r(), 0.7) * 78, x = ox + 128 + Math.cos(a) * d, y = oy + 128 + Math.sin(a) * d * 0.8, rad = 9 + r() * 24 * (1 - d / 110);
        const gr = g.createRadialGradient(x, y, 0, x, y, rad), k = 0.1 + 0.16 * r();
        gr.addColorStop(0, `rgba(255,255,255,${k})`); gr.addColorStop(0.7, `rgba(255,255,255,${k * 0.6})`); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(ox, oy, 256, 256);
      }
      g.save(); g.globalCompositeOperation = "destination-in";
      const win = g.createRadialGradient(ox + 128, oy + 128, 40, ox + 128, oy + 128, 126);
      win.addColorStop(0, "rgba(255,255,255,1)"); win.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = win; g.fillRect(ox, oy, 256, 256); g.restore();
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.NoColorSpace;
  return t;
};
class Puffs {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; n: number; P: Float32Array; D: Float32Array; H: Float32Array;
  aP: THREE.InstancedBufferAttribute; aD: THREE.InstancedBufferAttribute; aH: THREE.InstancedBufferAttribute;
  constructor(parent: THREE.Object3D, S: LSet, n: number) {
    this.n = n;
    const q = quadGeo(), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position")); g.setAttribute("uv", q.getAttribute("uv"));
    this.P = new Float32Array(n * 3); this.D = new Float32Array(n * 4); this.H = new Float32Array(n);
    this.aP = new THREE.InstancedBufferAttribute(this.P, 3); this.aD = new THREE.InstancedBufferAttribute(this.D, 4); this.aH = new THREE.InstancedBufferAttribute(this.H, 1);
    for (const a of [this.aP, this.aD, this.aH]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iP", this.aP); g.setAttribute("iD", this.aD); g.setAttribute("iH", this.aH); g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uMap: { value: puffTex() }, uDust: { value: new THREE.Color("#b89c7c") } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iD; attribute float iH; uniform vec3 uDust;
        varying vec2 vUv; varying vec3 vC; varying float vA; ${LIGHT}
        void main(){
          vec3 L = lightVol(iP, 0.0) * 0.5 + uAU * 1.5 + vec3(0.1, 0.075, 0.055);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float c = cos(iD.z), s = sin(iD.z); vec2 q = vec2(c * position.x - s * position.y, s * position.x + c * position.y);
          vec3 w = iP + (right * q.x + up * q.y) * iD.x;
          float cell = floor(iD.w + 0.5); vUv = (uv + vec2(mod(cell, 2.0), floor(cell / 2.0))) * 0.5;
          vC = uDust * L + vec3(1.0, 0.72, 0.42) * iH; vA = iD.y * smoothstep(1.2, 3.2, length(cameraPosition - iP));
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `uniform sampler2D uMap; varying vec2 vUv; varying vec3 vC; varying float vA;
        void main(){ float a = texture2D(uMap, vUv).r * vA; if (a < 0.003) discard; gl_FragColor = vec4(vC, min(a * 1.25, 0.9)); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 7; parent.add(this.mesh);
    // depth-only pass of the dense cores: the world ink is suppressed behind thick dust
    const dm = this.mat.clone();
    dm.fragmentShader = dm.fragmentShader.replace("if (a < 0.003) discard;", "if (a < 0.2) discard;");
    // pull the cores' depth toward the lens along each vertex's own view ray (screen position unchanged): a puff
    // hugging a wall at a grazing angle would otherwise sit half behind it and leave the wall's ink over the dust
    dm.vertexShader = dm.vertexShader.replace("gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);",
      "vec3 tc = cameraPosition - w; float dl = length(tc); w += tc / dl * min(iD.x * 0.6, max(0.0, dl - 0.8)); gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);");
    // drawn AFTER the colour pass (transparent queue, renderOrder 8) so the pulled depth never clips the dust itself;
    // it only feeds the ink pass's "something nearer" test (and the DOF) behind thick dust
    dm.transparent = true; dm.depthWrite = true; dm.colorWrite = false;
    const dmesh = new THREE.Mesh(g, dm); dmesh.layers.set(NOINK); dmesh.frustumCulled = false; dmesh.renderOrder = 8; parent.add(dmesh);
    dm.uniforms = this.mat.uniforms;
  }
  set(i: number, p: THREE.Vector3, size: number, alpha: number, rot: number, cell: number, hot: number) {
    this.P[i * 3] = p.x; this.P[i * 3 + 1] = p.y; this.P[i * 3 + 2] = p.z;
    this.D[i * 4] = size; this.D[i * 4 + 1] = alpha; this.D[i * 4 + 2] = rot; this.D[i * 4 + 3] = cell; this.H[i] = hot;
  }
  flush() { this.aP.needsUpdate = true; this.aD.needsUpdate = true; this.aH.needsUpdate = true; }
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
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) {
    const c = clean(g); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mx?: THREE.Matrix4, uvK = 0) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    if (uvK > 0) uvBox(g, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), uvK);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(g, mat, mx);
  }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, open = false) {
    this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx);
  }
  build(parent: THREE.Object3D) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** box uvs in metres / k (so a texture tiles at a constant density) */
const uvBox = (g: THREE.BoxGeometry, w: number, h: number, d: number, k: number) => {
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, (uv.getX(i) * dims[f][0]) / k, (uv.getY(i) * dims[f][1]) / k); }
};
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V3(s, s, s));
/** geometry accumulator for hand-built grids */
class Acc {
  pos: number[] = []; nor: number[] = []; uv: number[] = [];
  tri(p: THREE.Vector3[], n: THREE.Vector3[], t: [number, number][]) { for (let k = 0; k < 3; k++) { this.pos.push(p[k].x, p[k].y, p[k].z); this.nor.push(n[k].x, n[k].y, n[k].z); this.uv.push(t[k][0], t[k][1]); } }
  quad(p: THREE.Vector3[], n: THREE.Vector3[], t: [number, number][]) { this.tri([p[0], p[1], p[2]], [n[0], n[1], n[2]], [t[0], t[1], t[2]]); this.tri([p[0], p[2], p[3]], [n[0], n[2], n[3]], [t[0], t[2], t[3]]); }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
  mesh(parent: THREE.Object3D, mat: THREE.Material) { const m = new THREE.Mesh(this.geo(), mat); m.frustumCulled = false; parent.add(m); return m; }
}
type Prof = { a: number[]; b: number[]; na: number[]; nb: number[]; s: number[]; len: number; closed: boolean };
/** rock-gallery cross-section: flat floor (closed) or walls from below the floor (open), vertical walls to hs, elliptic arch to h */
const profile = (w: number, hs: number, h: number, n: number, closed: boolean): Prof => {
  const hw = w / 2, ch = 0.3, dense: [number, number][] = [];
  if (closed) {
    for (let k = 0; k <= 20; k++) dense.push([hw - ch - ((w - 2 * ch) * k) / 20, 0]);
    dense.push([-hw, ch]);
  } else dense.push([-hw, -0.12]);
  for (let k = 1; k <= 12; k++) dense.push([-hw, (closed ? ch : -0.12) + ((hs - (closed ? ch : -0.12)) * k) / 12]);
  for (let k = 1; k < 40; k++) { const th = Math.PI - (Math.PI * k) / 40; dense.push([hw * Math.cos(th), hs + (h - hs) * Math.sin(th)]); }
  for (let k = 0; k <= 12; k++) dense.push([hw, hs - ((hs - (closed ? ch : -0.12)) * k) / 12]);
  if (closed) dense.push(dense[0]);
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const len = cum[cum.length - 1];
  const at = (s: number): [number, number] => {
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [dense[i - 1][0] + (dense[i][0] - dense[i - 1][0]) * u, dense[i - 1][1] + (dense[i][1] - dense[i - 1][1]) * u];
  };
  const P: Prof = { a: [], b: [], na: [], nb: [], s: [], len, closed };
  const cnt = closed ? n : n + 1;
  for (let j = 0; j < cnt; j++) { const s = (len * j) / n; const [a, b] = at(s); P.a.push(a); P.b.push(b); P.s.push(s); }
  for (let j = 0; j < cnt; j++) {
    const jp = closed ? (j + 1) % n : Math.min(cnt - 1, j + 1), jm = closed ? (j - 1 + n) % n : Math.max(0, j - 1);
    const ta = P.a[jp] - P.a[jm], tb = P.b[jp] - P.b[jm];
    let na = tb, nb = -ta; const l = Math.hypot(na, nb) || 1; na /= l; nb /= l;
    if (na * (P.a[j] - 0) + nb * (P.b[j] - h * 0.45) < 0) { na = -na; nb = -nb; }
    P.na.push(na); P.nb.push(nb);
  }
  return P;
};
/** grid of points P[i][j] -> smooth normals pointing toward `inward(i, j)` */
const gridNormals = (P: THREE.Vector3[][], closedJ: boolean, inward: (i: number, j: number) => THREE.Vector3) => {
  const ni = P.length, nj = P[0].length, N: THREE.Vector3[][] = [];
  for (let i = 0; i < ni; i++) {
    const row: THREE.Vector3[] = [];
    for (let j = 0; j < nj; j++) {
      const du = P[Math.min(ni - 1, i + 1)][j].clone().sub(P[Math.max(0, i - 1)][j]);
      const jp = closedJ ? (j + 1) % nj : Math.min(nj - 1, j + 1), jm = closedJ ? (j - 1 + nj) % nj : Math.max(0, j - 1);
      const dv = P[i][jp].clone().sub(P[i][jm]);
      const n = du.cross(dv);
      const inw = inward(i, j);
      if (n.lengthSq() < 1e-10) n.copy(inw); n.normalize();
      if (n.dot(inw) < 0) n.negate();
      row.push(n);
    }
    N.push(row);
  }
  return N;
};
/** emit grid quads (i, j) -> (i+1, j+1) where keep(i, j) */
const emitGrid = (acc: Acc, P: THREE.Vector3[][], N: THREE.Vector3[][], U: number[], Vv: number[], closedJ: boolean, keep: (i: number, j: number) => boolean) => {
  const ni = P.length, nj = P[0].length, jEnd = closedJ ? nj : nj - 1;
  for (let i = 0; i < ni - 1; i++) for (let j = 0; j < jEnd; j++) {
    if (!keep(i, j)) continue;
    const j1 = (j + 1) % nj, v1 = closedJ && j1 === 0 ? Vv[nj] : Vv[j + 1];
    acc.quad([P[i][j], P[i + 1][j], P[i + 1][j1], P[i][j1]], [N[i][j], N[i + 1][j], N[i + 1][j1], N[i][j1]], [[U[i], Vv[j]], [U[i + 1], Vv[j]], [U[i + 1], v1], [U[i], v1]]);
  }
};
/** end cap from a ring of points (fan in K rings toward `c`, bulged outward along `o`) */
const capGeo = (acc: Acc, ring: THREE.Vector3[], c: THREE.Vector3, o: THREE.Vector3, amp: number, seed: number) => {
  const K = 8, P: THREE.Vector3[][] = [];
  for (let k = 0; k <= K; k++) {
    const r = 1 - k / K, row: THREE.Vector3[] = [];
    for (const q of ring) {
      const p = c.clone().lerp(q, r);
      const d = amp * (1 - r * r) * (0.5 + 0.8 * fbm(p.x * 0.7 + seed, p.y * 0.7, p.z * 0.7));
      row.push(p.addScaledVector(o, d));
    }
    P.push(row);
  }
  const inw = o.clone().negate();
  const N = gridNormals(P, true, () => inw);
  const U = P.map((_, k) => k * 0.4), Vv = ring.map((_, j) => j * 0.3); Vv.push(ring.length * 0.3);
  emitGrid(acc, P, N, U, Vv, true, () => true);
};
/** faceted rock chunk (unit radius) */
const rockGeo = (seed: number, flat = 1) => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i));
    const k = 0.72 + 0.5 * vn(v.x * 1.7 + seed * 3.1, v.y * 1.7 + seed, v.z * 1.7);
    v.multiplyScalar(k); v.y *= flat; p.setXYZ(i, v.x, v.y, v.z);
  }
  const out = g.index ? g.toNonIndexed() : g; out.computeVertexNormals();
  const uv = out.getAttribute("uv") as THREE.BufferAttribute, pp = out.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pp.getX(i) + pp.getZ(i)) * 0.35, pp.getY(i) * 0.35);
  return out;
};

// ============================================================ textures
const rockTex = () => ctex("mnRock", 1024, 1024, (g, r) => {
  const Wd = 1024;
  g.fillStyle = "#7a5238"; g.fillRect(0, 0, Wd, Wd);
  const blot = (cols: string[], n: number, r0: number, r1: number, a: number) => {
    for (let i = 0; i < n; i++) {
      const x = r() * Wd, y = r() * Wd, rad = r0 + r() * (r1 - r0);
      for (const dx of [-Wd, 0, Wd]) for (const dy of [-Wd, 0, Wd]) {
        const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
        const c = cols[Math.floor(r() * cols.length) % cols.length];
        gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)");
        g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
      }
    }
    g.globalAlpha = 1;
  };
  blot(["#9a6a45", "#8b5a3a", "#6a432c", "#a8784d", "#5e3a27"], 70, 60, 220, 0.55);
  // strata bands (tilted)
  for (let k = 0; k < 9; k++) {
    const y0 = r() * Wd, th = 10 + r() * 40, col = ["rgba(196,146,92,0.30)", "rgba(70,40,26,0.30)", "rgba(170,110,70,0.28)"][k % 3];
    g.fillStyle = col; g.beginPath();
    for (let x = -10; x <= Wd + 10; x += 16) g.lineTo(x, y0 + Math.sin(x * 0.006 + k) * 30 + x * 0.12);
    for (let x = Wd + 10; x >= -10; x -= 16) g.lineTo(x, y0 + th + Math.sin(x * 0.007 + k * 2) * 26 + x * 0.12);
    g.closePath(); g.fill();
  }
  // copper-oxide streaks (blue-green), sparse
  for (let i = 0; i < 7; i++) {
    const x = r() * Wd, y = r() * Wd;
    g.strokeStyle = "rgba(70,150,135,0.45)"; g.lineWidth = 4 + r() * 8; g.lineCap = "round"; g.beginPath(); g.moveTo(x, y);
    let px = x, py = y; for (let s = 0; s < 6; s++) { px += (r() - 0.5) * 40; py += 10 + r() * 22; g.lineTo(px, py); } g.stroke();
  }
  // facet light / shadow chips
  for (let i = 0; i < 120; i++) {
    const x = r() * Wd, y = r() * Wd, s = 8 + r() * 22;
    g.fillStyle = r() < 0.5 ? "rgba(255,214,160,0.06)" : "rgba(30,16,10,0.08)";
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3 * (r() - 0.5)); g.lineTo(x + s * 0.4, y + s * (0.6 + r() * 0.5)); g.closePath(); g.fill();
  }
  // ink cracks
  for (let i = 0; i < 26; i++) {
    let x = r() * Wd, y = r() * Wd, a = r() * Math.PI * 2;
    g.strokeStyle = "rgba(26,14,8,0.85)"; g.lineWidth = 2 + r() * 2.5; g.lineJoin = "round"; g.beginPath(); g.moveTo(x, y);
    const segs = 4 + Math.floor(r() * 6);
    for (let s = 0; s < segs; s++) { a += (r() - 0.5) * 1.1; x += Math.cos(a) * (14 + r() * 26); y += Math.sin(a) * (14 + r() * 26); g.lineTo(x, y); }
    g.stroke();
    g.strokeStyle = "rgba(255,214,170,0.22)"; g.lineWidth = 1.5; g.stroke();
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.10)" : "rgba(255,230,200,0.08)"; g.fillRect(r() * Wd, r() * Wd, 1 + r() * 3, 1 + r() * 3); }
});
const floorTex = () => ctex("mnFloor", 1024, 1024, (g, r) => {
  const Wd = 1024;
  g.fillStyle = "#5e4434"; g.fillRect(0, 0, Wd, Wd);
  for (let i = 0; i < 90; i++) {
    const x = r() * Wd, y = r() * Wd, rad = 40 + r() * 160;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, ["rgba(120,88,62,0.5)", "rgba(52,36,28,0.5)", "rgba(96,70,50,0.45)"][i % 3]); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // tyre tracks along v
  for (const x0 of [250, 330, 690, 770]) { g.fillStyle = "rgba(40,28,22,0.25)"; g.fillRect(x0, 0, 44, Wd); for (let y = 0; y < Wd; y += 18) { g.fillStyle = "rgba(30,20,14,0.3)"; g.fillRect(x0 + 4, y, 36, 6); } }
  // gravel
  for (let i = 0; i < 700; i++) {
    const x = r() * Wd, y = r() * Wd, s = 2 + r() * r() * 9;
    g.fillStyle = ["#755a46", "#45332a", "#86684f", "#5f4738"][i % 4]; g.beginPath(); g.ellipse(x, y, s, s * 0.7, r() * 3, 0, 7); g.fill();
    if (s > 6) { g.strokeStyle = "rgba(20,12,8,0.6)"; g.lineWidth = 1.5; g.stroke(); }
  }
  for (let i = 0; i < 8000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,230,200,0.07)"; g.fillRect(r() * Wd, r() * Wd, 2, 2); }
});
const ductTex = () => ctex("mnDuct", 256, 256, (g) => {
  g.fillStyle = "#e8b21c"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = "rgba(120,70,0,0.55)"; g.fillRect(0, y, 256, 6); g.fillStyle = "rgba(255,240,170,0.35)"; g.fillRect(0, y + 8, 256, 4); }
  g.fillStyle = "rgba(90,60,30,0.25)"; g.fillRect(0, 160, 256, 96);
});
const dirtTex = () => ctex("mnDirt", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) { const x = r() * 512, y = 260 + r() * 260, rad = 30 + r() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(150,110,70,0.35)"); gr.addColorStop(1, "rgba(150,110,70,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = "rgba(120,85,55,0.18)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const cardTex = () => ctex("mnCard", 512, 512, (g, r) => {
  g.fillStyle = "#a08060"; g.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 9) { g.fillStyle = "rgba(90,60,30,0.12)"; g.fillRect(x, 0, 3, 512); }
  for (let i = 0; i < 30; i++) { const x = r() * 512, y = r() * 512, rad = 20 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(70,45,25,0.3)"); gr.addColorStop(1, "rgba(70,45,25,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  g.strokeStyle = "rgba(60,40,20,0.6)"; g.lineWidth = 4; g.strokeRect(40, 60, 200, 120); g.beginPath(); g.moveTo(300, 420); g.lineTo(470, 420); g.stroke();
  g.fillStyle = "rgba(160,40,30,0.55)"; g.beginPath(); g.moveTo(330, 120); g.lineTo(380, 70); g.lineTo(430, 120); g.closePath(); g.fill();
});
const metalTex = () => ctex("mnMetal", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(60,60,60,${0.1 + r() * 0.2})`; g.lineWidth = 1; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, rad = 8 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(140,70,30,0.45)"); gr.addColorStop(1, "rgba(140,70,30,0)"); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
});
const labelTex = (key: string, bg: string, band: string, txt: string, fg: string) => ctex(key, 256, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.fillStyle = band; g.fillRect(0, 90, 256, 80);
  g.fillStyle = fg; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 131);
});

// ============================================================ the TUNNEL
const Z0 = 14, Z1 = -46, DZ = 0.25, NR = Math.round((Z0 - Z1) / DZ), NP = 76;
const TW = 5.4, THS = 2.5, TH = 4.3;
const IB0 = Math.round((Z0 + 20) / DZ), IB1 = Math.round((Z0 + 25) / DZ); // the sealing block (z -20 .. -25)
const tcx = (z: number) => (z >= 0 ? 0 : -0.004 * z * z), dcx = (z: number) => (z >= 0 ? 0 : -0.008 * z);
const tfy = (z: number) => (z >= 0 ? 0 : z > -10 ? -0.003 * z * z : 0.06 * (z + 5));
/** tunnel frame at local z: floor centre + the horizontal side vector (+a = toward +x at the mouth end) */
export const tunnelAt = (z: number) => {
  const c = V3(tcx(z), tfy(z), z), fx = -dcx(z), n = Math.hypot(fx, 1);
  return { c, side: V3(1 / n, 0, fx / n) };
};
const tpt = (z: number, a: number, b: number) => { const f = tunnelAt(z); return f.c.addScaledVector(f.side, a).add(V3(0, b, 0)); };
const TRUCK_Z = -6.3;
const LAMP_Z = [8.5, 1.5, -5.5, -12.5, -29.9, -36.9];
const SET_Z = [12, 8.5, 5, 1.5, -2, -5.5, -9, -12.5, -16, -18.9, -26.4, -29.9, -33.4, -36.9, -40.4, -43.9];

type Fall = { mesh: THREE.InstancedMesh; items: { p0: THREE.Vector3; p1: THREE.Vector3; r: number; t0: number; ax: THREE.Vector3; w: number; bounce: number; q0: THREE.Quaternion }[] };

class Tunnel {
  root = new THREE.Group();
  S = lset();
  private lampMats: THREE.ShaderMaterial[] = [];
  private lamps: THREE.Group[] = [];
  private beams: Beam[] = [];
  private headBeams: Beam[] = [];
  private motes: Motes;
  private puffs: Puffs;
  private block: THREE.Mesh;
  private falls: Fall[] = [];
  private slabs: { mesh: THREE.Mesh; p0: THREE.Vector3; q0: THREE.Quaternion; land: THREE.Vector3; t0: number; dir: number }[] = [];
  private truck = new THREE.Group();
  private beacon: THREE.ShaderMaterial;
  private brokenBeam: THREE.Mesh;
  private brokenBase = new THREE.Matrix4();

  constructor() {
    const S = this.S, R = this.root;
    R.position.set(...MINE);
    const rockT = rockTex(), flT = floorTex();
    const rock = imat(S, { col: "#ffffff", map: rockT }), floor = imat(S, { col: "#ffffff", map: flT, spec: 18, specK: 0.12 });
    // ---- the gallery tube (closed profile, floor + rock) ----
    const pr = profile(TW, THS, TH, NP, true);
    const P: THREE.Vector3[][] = [];
    const U: number[] = [];
    for (let i = 0; i <= NR; i++) {
      const z = Z0 - i * DZ, f = tunnelAt(z), row: THREE.Vector3[] = [];
      U.push((i * DZ) / 3);
      for (let j = 0; j < NP; j++) {
        const a = pr.a[j], b = pr.b[j], p0 = f.c.clone().addScaledVector(f.side, a).add(V3(0, b, 0));
        const flo = smooth((pr.nb[j] + 0.75) / 0.5); // 0 on the floor, 1 on walls / roof
        const amp = 0.025 + 0.8 * flo;
        const d = amp * (0.62 * vn(p0.x * 0.28 + 11, p0.y * 0.28, p0.z * 0.28) + 0.38 * fbm(p0.x * 1.1, p0.y * 1.1 + 4, p0.z * 1.1));
        row.push(p0.addScaledVector(f.side, pr.na[j] * d).add(V3(0, pr.nb[j] * d, 0)));
      }
      P.push(row);
    }
    const N = gridNormals(P, true, (i, j) => { const z = Z0 - i * DZ; return tpt(z, 0, TH * 0.45).sub(P[i][j]); });
    const Vv = pr.s.map((s) => s / 3); Vv.push(pr.len / 3);
    const isFloor = (j: number) => pr.nb[j] < -0.9 && pr.nb[(j + 1) % NP] < -0.9;
    const roofJ = (j: number) => pr.b[j] >= 2.6 && pr.b[(j + 1) % NP] >= 2.6;
    const inBlock = (i: number, j: number) => i >= IB0 && i < IB1 && roofJ(j);
    const aF = new Acc(), aR = new Acc(), aB = new Acc();
    emitGrid(aF, P, N, U, Vv, true, (_i, j) => isFloor(j));
    emitGrid(aR, P, N, U, Vv, true, (i, j) => !isFloor(j) && !inBlock(i, j));
    emitGrid(aB, P, N, U, Vv, true, (i, j) => inBlock(i, j));
    // end caps (the mouth end behind the camera, the deep end)
    const capA = new Acc();
    capGeo(capA, P[0], tpt(Z0, 0, TH * 0.45), V3(0, 0, 1), 1.2, 3);
    const fe = tunnelAt(Z1), fwd = V3(0, 1, 0).cross(fe.side).normalize(); // -z-ish
    capGeo(capA, P[NR], tpt(Z1, 0, TH * 0.45), fwd, 1.6, 7);
    aF.mesh(R, floor); aR.mesh(R, rock); capA.mesh(R, rock);
    // ---- the sealing block: the roof patch + vertical skirts up 9 m ----
    const js = Array.from({ length: NP }, (_, j) => j).filter((j) => pr.b[j] >= 2.6);
    const jL = js[0], jR = js[js.length - 1];
    const skirt = (p: THREE.Vector3, q: THREE.Vector3, u0: number) => {
      const up = V3(0, 9, 0), L = p.distanceTo(q) / 3;
      const pa = [p, q, q.clone().add(up), p.clone().add(up)];
      const n = q.clone().sub(p).cross(up).normalize();
      aB.quad(pa, [n, n, n, n], [[u0, 0], [u0 + L, 0], [u0 + L, 3], [u0, 3]]);
    };
    for (let j = jL; j < jR; j++) { skirt(P[IB0][j + 1], P[IB0][j], j * 0.1); skirt(P[IB1][j], P[IB1][j + 1], j * 0.1); }
    for (let i = IB0; i < IB1; i++) { skirt(P[i][jL], P[i + 1][jL], i * 0.08); skirt(P[i + 1][jR], P[i][jR], i * 0.08); }
    this.block = aB.mesh(R, imat(S, { col: "#e8d8c8", map: rockT }));
    // ---- dark shell (never sky through a seam) ----
    const shell = new THREE.Mesh(new THREE.BoxGeometry(60, 40, 90), new THREE.MeshBasicMaterial({ color: "#090604", side: THREE.BackSide, fog: false }));
    shell.position.set(-6, 0, -16); shell.layers.set(NOINK); shell.frustumCulled = false; R.add(shell);

    // ---- timber sets ----
    const b = new Bat();
    const woodT = beamHD();
    const wood = imat(S, { col: "#c9a27a", map: woodT });
    for (const z of SET_Z) {
      const f = tunnelAt(z), y0 = f.c.y, fw = V3(0, 1, 0).cross(f.side).normalize();
      const M = new THREE.Matrix4().makeBasis(f.side, V3(0, 1, 0), fw.clone().negate()).setPosition(V3(f.c.x, 0, f.c.z));
      const lean = (hsh(Math.round(z * 10), 3, 1) - 0.5) * 0.04;
      for (const s of [-1, 1]) b.box(wood, s * 2.3 - 0.13, y0 - 0.05, -0.13, s * 2.3 + 0.13, y0 + 2.78, 0.13, M.clone().multiply(new THREE.Matrix4().makeRotationZ(lean * s)), 0.9);
      if (Math.abs(z + 12.5) < 0.01) continue; // this one's cap beam snaps in the collapse (own mesh)
      b.box(wood, -2.5, y0 + 2.75, -0.16, 2.5, y0 + 3.07, 0.16, M, 0.9);
      // wedge blocks on the cap
      for (const x of [-1.6, 0, 1.6]) b.box(wood, x - 0.18, y0 + 3.07, -0.1, x + 0.18, y0 + 3.2, 0.1, M, 0.9);
    }
    {
      const z = -12.5, f = tunnelAt(z), y0 = f.c.y, fw = V3(0, 1, 0).cross(f.side).normalize();
      const M = new THREE.Matrix4().makeBasis(f.side, V3(0, 1, 0), fw.clone().negate()).setPosition(V3(f.c.x, y0 + 2.91, f.c.z));
      const g = new THREE.BoxGeometry(5.0, 0.32, 0.32); uvBox(g, 5, 0.32, 0.32, 0.9); g.translate(2.5, 0, 0); // pivot at the left end
      this.brokenBase.copy(M).multiply(new THREE.Matrix4().makeTranslation(-2.5, 0, 0));
      this.brokenBeam = new THREE.Mesh(g, wood); this.brokenBeam.matrixAutoUpdate = false; this.brokenBeam.frustumCulled = false; R.add(this.brokenBeam);
    }
    // ---- pipes, duct, cables ----
    const tubeAlong = (a: number, bb: number, za: number, zb: number, sag = 0, hook = 3.5) => {
      const pts: THREE.Vector3[] = [];
      for (let z = za; z >= zb - 1e-6; z -= 0.5) {
        const ph = ((za - z) % hook) / hook, sg = sag * 4 * ph * (1 - ph);
        pts.push(tpt(z, a, bb - sg));
      }
      return new THREE.CatmullRomCurve3(pts);
    };
    const duct = imat(S, { col: "#ffffff", map: ductTex(), spec: 12, specK: 0.15 });
    const dg = new THREE.TubeGeometry(tubeAlong(-1.35, 3.55, 14.6, -45.5, 0.12, 3.5), 360, 0.3, 20, false);
    { const uv = dg.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i) * 60 / 0.6); }
    const dm = new THREE.Mesh(dg, duct); dm.frustumCulled = false; R.add(dm);
    const steel = imat(S, { col: "#55595c", map: metalTex(), spec: 40, specK: 0.5 });
    b.add(new THREE.TubeGeometry(tubeAlong(2.48, 0.72, 14.6, -45.5), 300, 0.085, 10, false), steel);
    b.add(new THREE.TubeGeometry(tubeAlong(2.48, 1.02, 14.6, -45.5), 300, 0.05, 8, false), imat(S, { col: "#2c4d7a", spec: 30, specK: 0.3 }));
    const cable = imat(S, { col: "#1a1716" });
    for (const [bb, sg] of [[2.3, 0.28], [2.42, 0.2], [2.18, 0.34]] as [number, number][]) b.add(new THREE.TubeGeometry(tubeAlong(2.2, bb, 14.6, -45.5, sg, 3.5), 600, 0.022, 6, false), cable);
    // pipe brackets on the timber posts
    for (const z of SET_Z) { const f = tunnelAt(z); const p = f.c.clone().addScaledVector(f.side, 2.36); b.box(steel, -0.05, 0.62, -0.05, 0.05, 1.1, 0.05, new THREE.Matrix4().setPosition(p)); }
    // ---- puddles ----
    const pud = imat(S, { col: "#2a303c", spec: 70, specK: 1.3 });
    const PUD: [number, number, number, number, number][] = [[6.2, 0.6, 1.4, 0.7, 0.3], [3.4, 1.7, 0.9, 0.5, 1.1], [-3.5, 0.9, 1.6, 0.8, 0.2], [-7.5, -1.4, 1.1, 0.6, 0.6], [10.2, -1.6, 1.0, 0.55, 0.9], [-10.8, 1.1, 1.3, 0.7, 0.4]];
    for (const [z, a, rx, rz, rot] of PUD) {
      const g = new THREE.CircleGeometry(1, 28);
      const pp = g.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), k = 1 + 0.2 * (vn(x * 2 + z, y * 2, 1) - 0.5) * (x * x + y * y); pp.setXY(i, x * k, y * k); }
      g.rotateX(-Math.PI / 2); g.scale(rx, 1, rz); g.rotateY(rot);
      const f = tunnelAt(z), slope = (tfy(z - 0.5) - tfy(z + 0.5));
      const m = new THREE.Matrix4().makeTranslation(...tpt(z, a, 0.04).toArray()).multiply(new THREE.Matrix4().makeRotationAxis(f.side, -Math.atan(slope)));
      b.add(g, pud, m);
    }
    // static rubble along the wall foot
    const rubG = [rockGeo(1, 0.7), rockGeo(2, 0.6), rockGeo(3, 0.8)];
    const rr = rng(77);
    for (let k = 0; k < 46; k++) {
      const z = Z0 - 1 - rr() * (Z0 - Z1 - 2), side = rr() < 0.5 ? -1 : 1, s = 0.12 + 0.3 * rr() * rr();
      b.add(rubG[k % 3], rock, TRS(...tpt(z, side * (2.45 - rr() * 0.4), s * 0.45).toArray() as [number, number, number], rr() * 6, rr(), 0, s));
    }
    b.build(R);

    // ---- pendant lamps (caged bulb under a conical reflector) ----
    for (let k = 0; k < LAMP_Z.length; k++) {
      const z = LAMP_Z[k], f = tunnelAt(z), grp = new THREE.Group();
      grp.position.copy(tpt(z, 0.95, 2.75));
      const em = imat(S, { col: "#fff4d6", em: [7, 5.2, 3] });
      this.lampMats.push(em);
      const lb = new Bat();
      lb.cyl(cable, 0.01, 0.01, 0.4, 6, TRS(0, -0.2, 0));
      lb.cyl(imat(S, { col: "#3d4a3c", spec: 30, specK: 0.4 }), 0.05, 0.2, 0.16, 20, TRS(0, -0.46, 0), true);
      lb.cyl(cable, 0.05, 0.05, 0.06, 12, TRS(0, -0.38, 0));
      lb.add(new THREE.SphereGeometry(0.065, 16, 12), em, TRS(0, -0.55, 0));
      for (let q = 0; q < 4; q++) lb.box(cable, -0.006, -0.62, 0.075, 0.006, -0.47, 0.087, TRS(0, 0, 0, (q * Math.PI) / 2));
      lb.build(grp);
      grp.traverse((o) => { o.frustumCulled = false; });
      grp.userData.side = f.side.clone();
      R.add(grp); this.lamps.push(grp);
      this.beams.push(new Beam(R, 2.9, 1.75, [1.0, 0.72, 0.4], 0.3));
    }
    // ---- pickup truck (nose toward -z) ----
    this.beacon = imat(S, { col: "#ffb030", em: [3, 1.4, 0.1] });
    this.buildTruck();
    for (let k = 0; k < 2; k++) this.headBeams.push(new Beam(R, 11, 2.6, [1.0, 0.86, 0.62], 0.09));
    // ---- falling rocks + pebbles, roof slabs ----
    const rf = rng(911), tc0 = W.collapses - 0.6;
    const roofCols = Array.from({ length: NP }, (_, j) => j).filter((j) => pr.b[j] >= 2.9);
    const rockMat = imat(S, { col: "#f2e2d0", map: rockT });
    const mkFall = (n: number, rMin: number, rMax: number, tA: number, tB: number, zA: number, zB: number, seed: number) => {
      const geo = rockGeo(seed, 0.8);
      const mesh = new THREE.InstancedMesh(geo, rockMat, n); mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const items: Fall["items"] = [];
      for (let k = 0; k < n; k++) {
        const z = zA + (zB - zA) * rf(), i = Math.max(1, Math.min(NR - 1, Math.round((Z0 - z) / DZ))), j = roofCols[Math.floor(rf() * roofCols.length) % roofCols.length];
        const r = rMin + (rMax - rMin) * rf() * rf();
        const p0 = P[i][j].clone().addScaledVector(N[i][j], -r * 0.45); // 55 % embedded in the roof
        const zz = Z0 - i * DZ, f = tunnelAt(zz);
        const a = THREE.MathUtils.clamp(f.side.dot(p0.clone().sub(f.c)) * 0.85 + (rf() - 0.5) * 0.6, -2.1, 2.1);
        const p1 = tpt(zz + (rf() - 0.3) * 0.8, a, r * 0.55);
        const ax = V3(rf() - 0.5, rf() - 0.5, rf() - 0.5).normalize();
        items.push({ p0, p1, r, t0: tA + (tB - tA) * Math.pow(rf(), 1.4), ax, w: 4 + 8 * rf(), bounce: 0.15 + 0.2 * rf(), q0: new THREE.Quaternion().setFromAxisAngle(V3(rf(), rf(), rf()).normalize(), rf() * 6) });
      }
      R.add(mesh); this.falls.push({ mesh, items });
    };
    mkFall(18, 0.22, 0.75, tc0 + 0.05, tc0 + 1.3, -10, -19.5, 4);
    mkFall(16, 0.18, 0.55, tc0 + 0.15, tc0 + 1.5, -10, -19.5, 5);
    mkFall(70, 0.04, 0.12, tc0 - 0.7, tc0 + 1.8, -9.6, -19.5, 6);
    mkFall(50, 0.03, 0.09, tc0 - 0.2, tc0 + 2.0, -9.4, -19.5, 8);
    for (const [z, a, t0, dir] of [[-15.0, -0.4, tc0 + 0.25, 1], [-10.6, 0.5, tc0 + 0.55, -1]] as [number, number, number, number][]) {
      const g = new THREE.BoxGeometry(2.3, 0.34, 1.7, 6, 1, 5);
      const pp = g.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), zz = pp.getZ(i); pp.setXYZ(i, x * (1 + 0.12 * (vn(zz * 2 + 9, 1, x) - 0.5)), y + 0.12 * (vn(x * 1.5, zz * 1.5, 3) - 0.5), zz * (1 + 0.15 * (vn(x * 2, 5, zz) - 0.5))); }
      const gg = g.toNonIndexed(); gg.computeVertexNormals();
      const m = new THREE.Mesh(gg, rockMat); m.frustumCulled = false; m.matrixAutoUpdate = false;
      const i = Math.round((Z0 - z) / DZ), top = roofCols.reduce((bj, j) => (Math.abs(pr.a[j] - a) < Math.abs(pr.a[bj] - a) ? j : bj), roofCols[0]);
      const p0 = P[i][top].clone().add(V3(0, -0.12, 0));
      const f = tunnelAt(z), q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.side, V3(0, 1, 0), V3(0, 1, 0).cross(f.side).normalize().negate()));
      R.add(m);
      this.slabs.push({ mesh: m, p0, q0, land: tpt(z + 0.6 * dir, a * 0.6 + 0.3 * dir, 0.32), t0, dir });
    }
    // ---- dust ----
    this.puffs = new Puffs(R, S, 150);
    this.motes = new Motes(R, S, 1200, 21, [-3.2, 0.2, -16, 3.2, 3.8, 13], 2.0);
    R.traverse((o) => { o.frustumCulled = false; });
  }

  private buildTruck() {
    const S = this.S, b = new Bat(), T = this.truck;
    const body = imat(S, { col: "#e9e4d8", map: dirtTex(), spec: 30, specK: 0.35 });
    const dark = imat(S, { col: "#26262a", spec: 20, specK: 0.2 });
    const tyre = imat(S, { col: "#1c1b1c" });
    const hub = imat(S, { col: "#9a9890", spec: 40, specK: 0.4 });
    const glass = imat(S, { col: "#1d2a3a", spec: 80, specK: 1.4 });
    const stripe = imat(S, { col: "#ff7a1a", em: [0.25, 0.08, 0] });
    const head = imat(S, { col: "#fff6e0", em: [8, 7, 5] });
    const tail = imat(S, { col: "#ff3020", em: [5, 0.5, 0.25] });
    b.box(body, -0.9, 0.45, -2.6, 0.9, 1.05, 2.6, undefined, 1.6);
    b.box(body, -0.88, 1.05, -2.6, 0.88, 1.2, -1.3, undefined, 1.6);
    b.box(body, -0.86, 1.05, -1.3, 0.86, 1.85, 0.35, undefined, 1.6);
    b.box(glass, -0.875, 1.3, -1.2, 0.875, 1.76, 0.26);
    b.box(glass, -0.76, 1.28, -1.316, 0.76, 1.78, -1.25);
    b.box(glass, -0.74, 1.32, 0.3, 0.74, 1.74, 0.366);
    for (const s of [-1, 1]) b.box(body, s * 0.82 - 0.05, 1.05, 0.35, s * 0.82 + 0.05, 1.45, 2.55, undefined, 1.6);
    b.box(body, -0.92, 1.05, 2.5, 0.92, 1.45, 2.6, undefined, 1.6);
    b.box(dark, -0.95, 0.42, -2.72, 0.95, 0.68, -2.58);
    b.box(dark, -0.95, 0.42, 2.58, 0.95, 0.62, 2.72);
    for (const s of [-1, 1]) b.box(stripe, s * 0.9 - 0.012 * s, 0.8, -2.5, s * 0.9 + 0.012 * s, 0.86, 2.5);
    b.box(head, -0.78, 0.84, -2.62, -0.52, 1.0, -2.585); b.box(head, 0.52, 0.84, -2.62, 0.78, 1.0, -2.585);
    b.box(tail, -0.9, 0.78, 2.6, -0.74, 1.0, 2.635); b.box(tail, 0.74, 0.78, 2.6, 0.9, 1.0, 2.635);
    b.box(dark, -0.7, 1.85, -0.9, 0.7, 1.9, -0.1);
    b.box(this.beacon, -0.12, 1.9, -0.6, 0.12, 2.02, -0.4);
    b.cyl(dark, 0.012, 0.012, 2.0, 6, TRS(-0.86, 2.4, 2.5));
    b.box(stripe, -0.86, 3.2, 2.5, -0.85, 3.38, 2.82);
    for (const sx of [-1, 1]) for (const sz of [-1.65, 1.65]) {
      b.cyl(tyre, 0.4, 0.4, 0.3, 24, TRS(sx * 0.82, 0.4, sz, 0, 0, Math.PI / 2));
      b.cyl(hub, 0.2, 0.2, 0.31, 16, TRS(sx * 0.82, 0.4, sz, 0, 0, Math.PI / 2));
    }
    // load in the bed: a drum and some crates
    b.cyl(imat(S, { col: "#2f5f8f", spec: 30, specK: 0.3 }), 0.28, 0.28, 0.85, 18, TRS(-0.4, 1.48, 1.6));
    b.box(imat(S, { col: "#b8874c", map: beamHD() }), 0.05, 1.05, 0.7, 0.7, 1.45, 1.3, undefined, 0.6);
    b.build(T);
    const f = tunnelAt(TRUCK_Z);
    T.position.copy(tpt(TRUCK_Z, -1.25, 0)); T.rotation.order = "YXZ"; T.rotation.y = Math.atan2(-f.side.z, f.side.x);
    T.rotation.x = -Math.atan((tfy(TRUCK_Z + 0.5) - tfy(TRUCK_Z - 0.5)));
    this.root.add(T);
  }

  update(id: number, t: number, f: number) {
    const S = this.S, O = this.root.position;
    const tc0 = W.collapses - 0.6, c = collapseAt(id, t), tau = t - tc0;
    const shake = id === 4 ? clamp01(tau / 0.15) * Math.exp(-Math.max(0, tau) / 1.4) : 0;
    const W2 = (p: THREE.Vector3) => p.clone().add(O);
    // ---- lamps (swing + flicker) ----
    const L: LDef[] = [];
    for (let k = 0; k < LAMP_Z.length; k++) {
      const z = LAMP_Z[k], grp = this.lamps[k], side = grp.userData.side as THREE.Vector3;
      const amp = 0.04 * Math.sin(t * 1.3 + k) * 0.3 + shake * 0.32 * (z < 2 ? 1 : 0.5);
      const ang = amp * Math.sin(Math.max(0, tau) * 6.5 + k * 1.7);
      const fwd = V3(0, 1, 0).cross(side).normalize();
      grp.quaternion.setFromAxisAngle(side, ang).multiply(new THREE.Quaternion().setFromAxisAngle(fwd, ang * 0.6 * Math.sin(k + tau * 4)));
      let fl = 1;
      if (id === 4 && tau > 0) {
        // stutter: value noise over 3-frame steps (no single-frame strobing), dips to -45 % that decay over ~1.6 s
        const fs = f / 3, f0 = Math.floor(fs), u = smooth(fs - f0);
        const dip = (h: number) => (h < 0.3 ? 0.45 : 0.08 * h);
        const hk = dip(hsh(f0, k, 9)) * (1 - u) + dip(hsh(f0 + 1, k, 9)) * u;
        fl = 1 - hk * Math.exp(-tau / 1.6);
        if (k === 3) fl *= 1 - smooth((tau - 0.45) / 0.3);         // the lamp at the collapse dies
        if (k >= 4) fl *= 1 - smooth((tau - 0.6) / 0.4);           // beyond the block: gone
      }
      const dir = V3(0, -1, 0).applyQuaternion(grp.quaternion);
      const bulb = W2(grp.position.clone().addScaledVector(dir, 0.55));
      L.push({ p: bulb, c: [4.6 * fl, 3.0 * fl, 1.55 * fl], r: 4.2, dir, cos: -0.2 });
      (this.lampMats[k].uniforms.uEm.value as THREE.Vector3).set(7 * fl, 5.2 * fl, 3 * fl);
      this.beams[k].set(grp.position.clone().addScaledVector(dir, 0.5), dir, 0.3 * fl, t);
    }
    // ---- truck lights ----
    const T = this.truck, tq = T.quaternion, bounce = 0.02 * shake * Math.sin(tau * 23);
    T.position.y = tpt(TRUCK_Z, -1.25, 0).y + bounce;
    const hd = V3(0, -0.06, -1).applyQuaternion(tq).normalize();
    const hl = [V3(-0.65, 0.92, -2.65), V3(0.65, 0.92, -2.65)].map((p) => p.applyQuaternion(tq).add(T.position));
    L.push({ p: W2(hl[0]), c: [6, 5.2, 3.8], r: 7, dir: hd, cos: 0.86 });
    L.push({ p: W2(hl[1]), c: [6, 5.2, 3.8], r: 7, dir: hd, cos: 0.86 });
    hl.forEach((p, k) => this.headBeams[k].set(p, hd, 0.12, t));
    L.push({ p: W2(V3(0, 0.9, 3.4).applyQuaternion(tq).add(T.position)), c: [0.35, 0.03, 0.015], r: 0.9 });
    const bc = 0.5 + 0.5 * Math.sin(t * 7.5);
    (this.beacon.uniforms.uEm.value as THREE.Vector3).set(3 * (0.3 + bc), 1.4 * (0.3 + bc), 0.1);
    L.push({ p: W2(V3(0, 2.1, -0.5).applyQuaternion(tq).add(T.position)), c: [0.7 * bc, 0.35 * bc, 0.03], r: 2.2 });
    // ---- the collapse flash (dust lit from inside) ----
    const flash = id === 4 ? Math.exp(-Math.pow((tau - 0.42) / 0.22, 2)) : 0;
    L.push({ p: W2(tpt(-13, 0, 1.6)), c: [7 * flash, 4.6 * flash, 2.4 * flash], r: 6 });
    setLights(S, L, [0.12, 0.1, 0.095], [0.07, 0.052, 0.04]);
    // ---- the cap beam that snaps ----
    const sn = id === 4 ? smooth((tau - 0.2) / 0.45) : id > 4 ? 1 : 0;
    const sw = sn * (0.62 + 0.04 * Math.sin(Math.max(0, tau - 0.65) * 14) * Math.exp(-Math.max(0, tau - 0.65) * 3));
    this.brokenBeam.matrix.copy(this.brokenBase).multiply(new THREE.Matrix4().makeRotationZ(-sw));
    // ---- the block drops (sealing the gallery) ----
    const bd = id === 4 ? clamp01((tau - 0.35) / 0.5) : id > 4 ? 1 : 0;
    this.block.position.y = -4.6 * bd * bd + (bd >= 1 ? 0.05 * Math.sin(Math.min(1, (tau - 0.85) / 0.3) * Math.PI) * Math.exp(-(tau - 0.85) * 4) : 0);
    // ---- falling rocks ----
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), sc = V3(1, 1, 1), p = V3(0, 0, 0);
    for (const fl of this.falls) {
      fl.items.forEach((it, k) => {
        const tt = id === 4 ? t - it.t0 : id > 4 ? 99 : -1;
        const h = it.p0.y - it.p1.y, tl = Math.sqrt((2 * Math.max(0.1, h)) / 9.81);
        if (tt <= 0) { p.copy(it.p0); q.copy(it.q0); }
        else {
          const u = Math.min(tt, tl) / tl;
          p.lerpVectors(it.p0, it.p1, u); p.y = it.p0.y - 4.9 * Math.min(tt, tl) ** 2;
          if (tt > tl) { const tb = tt - tl, hb = it.bounce * h * 0.25, tbl = 2 * Math.sqrt((2 * hb) / 9.81); if (tb < tbl) p.y = it.p1.y + Math.max(0, Math.sqrt(2 * 9.81 * hb) * tb - 4.9 * tb * tb); else p.y = it.p1.y; }
          const spin = it.w * Math.min(tt, tl) + it.w * 0.25 * (1 - Math.exp(-Math.max(0, tt - tl) * 4));
          q.copy(qa.setFromAxisAngle(it.ax, spin)).multiply(it.q0);
        }
        sc.setScalar(it.r);
        fl.mesh.setMatrixAt(k, m4.compose(p, q, sc));
      });
      fl.mesh.instanceMatrix.needsUpdate = true;
    }
    // ---- slabs: hinge down then drop ----
    for (const s of this.slabs) {
      const tt = id === 4 ? t - s.t0 : id > 4 ? 99 : -1;
      const hinge = clamp01(tt / 0.3), fallT = Math.max(0, tt - 0.3), h = s.p0.y - s.land.y, tl = Math.sqrt((2 * h) / 9.81);
      const uf = Math.min(1, fallT / tl);
      const pos = s.p0.clone().lerp(s.land, uf); pos.y = s.p0.y - 4.9 * Math.min(fallT, tl) ** 2 - 0.25 * hinge * hinge;
      const tilt = s.dir * (0.45 * smooth(hinge) + 0.35 * uf - 0.55 * smooth((fallT - tl) / 0.15));
      const qq = s.q0.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, tilt * 0.5)));
      s.mesh.matrix.compose(pos, qq, V3(1, 1, 1));
    }
    // ---- dust puffs ----
    const PF = this.puffs, rp = rng(4242);
    for (let k = 0; k < PF.n; k++) {
      const r1 = rp(), r2 = rp(), r3 = rp(), r4 = rp(), r5 = rp(), r6 = rp(), r7 = rp(), r8 = rp();
      const burst = k < 30; // the impact flash puffs
      const tb = burst ? tc0 + 0.3 + 0.5 * r1 : tc0 + 0.1 + 1.9 * Math.pow(r1, 1.2);
      const tt = id === 4 ? t - tb : -1;
      if (tt <= 0) { PF.set(k, V3(0, -999, 0), 0, 0, 0, 0, 0); continue; }
      const z0 = burst ? -10 - 6 * r2 : -9 - 11 * r2;
      const travel = burst ? 3 + 5 * r5 : 8 + 18 * r5;
      let z = z0 + travel * (1 - Math.exp(-tt / (burst ? 0.5 : 1.0)));
      z = Math.min(z, 4.2 + 1.2 * r8);
      const a = THREE.MathUtils.clamp((r3 - 0.5) * 3.4 * (1 + 0.4 * tt), -2.0, 2.0);
      const bb = Math.min(3.6, (burst ? 0.3 : 0.5 + 3.0 * r4) + 0.35 * tt);
      const pos = W2(tpt(z, a, bb));
      const size = (burst ? 0.8 + 1.6 * r6 : 1.5 + 1.7 * r6) * (0.45 + 0.9 * (1 - Math.exp(-tt / 0.9)));
      const alpha = smooth(tt / 0.25) * (0.42 + 0.33 * r7) * (burst ? Math.exp(-Math.max(0, tt - 0.6) / 1.2) * 0.9 + 0.1 : 1);
      const hot = flash * (burst ? 0.8 : 0.2);
      PF.set(k, pos, size, alpha, r8 * 6.28 + tt * (r2 - 0.5) * 0.6, Math.floor(r7 * 4) % 4, hot);
    }
    PF.flush();
    this.motes.mat.uniforms.uT.value = t;
    (this.motes.mat.uniforms.uO.value as THREE.Vector3).copy(O);
    this.motes.mat.uniforms.uK.value = 2.0 + 2.0 * c * (id === 4 ? 1 : 0);
  }
}

// ============================================================ the REFUGE
export const REFUGE_L = {
  room: { x0: -5, x1: 5, z0: -3, z1: 3, wallH: 1.85, ceil: 2.75 },
  door: { x0: 0.6, x1: 4.6, z: 3, stubEnd: 10 },
  benches: [{ x0: -4.6, x1: -1.85, z: -2.55, y: 0.45 }, { x0: 1.4, x1: 4.4, z: -2.55, y: 0.45 }, { x: -4.55, z0: -1.8, z1: 1.8, y: 0.45 }, { x: 4.55, z0: -1.8, z1: 1.8, y: 0.45 }],
  bulb: [0.2, 2.2, 0] as [number, number, number],
};
const tallyDraw = (g: CanvasRenderingContext2D, n: number, part: number) => {
  g.clearRect(0, 0, 1024, 384);
  const stroke = (x0: number, y0: number, x1: number, y1: number, u: number, seed: number) => {
    if (u <= 0) return;
    const r = rng(seed + 17), xe = x0 + (x1 - x0) * u, ye = y0 + (y1 - y0) * u;
    const path = (dx: number, dy: number) => { g.beginPath(); g.moveTo(x0 + dx, y0 + dy); const m = 3; for (let k = 1; k <= m; k++) { const s = k / m; g.lineTo(x0 + (xe - x0) * s + dx + (k < m ? (r() - 0.5) * 5 : 0), y0 + (ye - y0) * s + dy); } g.stroke(); };
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = "rgba(25,12,6,0.75)"; g.lineWidth = 13; path(3, 4);
    g.strokeStyle = "rgba(245,235,212,0.97)"; g.lineWidth = 8; path(0, 0);
    g.strokeStyle = "rgba(255,255,245,0.6)"; g.lineWidth = 3; path(-1, -1);
  };
  for (let k = 0; k < n + 1; k++) {
    const u = k < n ? 1 : part;
    if (u <= 0) continue;
    const grp = Math.floor(k / 5), i = k % 5, row = Math.floor(grp / 5), col = grp % 5;
    const gx = 50 + col * 190, gy = 40 + row * 170;
    const jit = (hsh(k, 5, 2) - 0.5) * 8;
    if (i < 4) stroke(gx + i * 32 + jit, gy + jit * 0.5, gx + i * 32 + jit * 1.6 + 6, gy + 128 + jit, u, k * 7);
    else stroke(gx - 14, gy + 104, gx + 122, gy + 18, u, k * 7);
  }
};
class Refuge {
  root = new THREE.Group();
  S = lset();
  private bulbMat: THREE.ShaderMaterial;
  private bulb = new THREE.Group();
  private beams: Beam[] = [];
  private motes: Motes;
  private tallyCv: HTMLCanvasElement;
  private tallyTex: THREE.CanvasTexture;
  private tallyKey = "";
  private helmets: { p: THREE.Vector3; d: THREE.Vector3 }[] = [];

  constructor() {
    const S = this.S, R = this.root;
    R.position.set(...REFUGE);
    const rockT = rockTex();
    const rock = imat(S, { col: "#f0dcc8", map: rockT });
    const floor = imat(S, { col: "#ffffff", map: floorTex() });
    const tallyMask = (x: number, y: number, z: number) => (z < -2.6 ? smooth((x - 1.0) / 0.3) * smooth((4.8 - x) / 0.3) * smooth((y - 0.45) / 0.25) * smooth((2.0 - y) / 0.15) : 0);
    const disp = (p: THREE.Vector3, amp: number) => amp * (0.6 * vn(p.x * 0.45 + 31, p.y * 0.45, p.z * 0.45) + 0.4 * fbm(p.x * 1.3, p.y * 1.3 + 9, p.z * 1.3)) * (1 - tallyMask(p.x, p.y, p.z));
    // ---- room: open profile along x, two caps ----
    const pr = profile(6, 1.85, 2.75, 64, false), nj = pr.a.length, NX = 50;
    const P: THREE.Vector3[][] = [], U: number[] = [];
    for (let i = 0; i <= NX; i++) {
      const x = -5 + (10 * i) / NX, row: THREE.Vector3[] = [];
      U.push((10 * i) / NX / 3);
      for (let j = 0; j < nj; j++) {
        const p0 = V3(x, pr.b[j], pr.a[j]);
        const d = disp(p0, pr.b[j] < 0.05 ? 0.15 : 0.55);
        row.push(p0.add(V3(0, pr.nb[j] * d, pr.na[j] * d)));
      }
      P.push(row);
    }
    const N = gridNormals(P, false, (i, j) => V3(-5 + (10 * i) / NX, 1.2, 0).sub(P[i][j]));
    const Vv = pr.s.map((s) => s / 3);
    const ra = new Acc();
    emitGrid(ra, P, N, U, Vv, false, (i, j) => {
      const c = P[i][j].clone().add(P[i + 1][j + 1]).multiplyScalar(0.5);
      return !(c.x > 0.95 && c.x < 4.25 && pr.a[j] > 2.0 && c.y < 2.1);
    });
    capGeo(ra, P[0], V3(-5, 1.1, 0), V3(-1, 0, 0), 0.7, 11);
    capGeo(ra, P[NX], V3(5, 1.1, 0), V3(1, 0, 0), 0.7, 13);
    // ---- stub toward +z (the way in) ----
    const ps = profile(4.0, 1.6, 2.45, 48, false), sj = ps.a.length, NZ = 28;
    const Q: THREE.Vector3[][] = [], US: number[] = [];
    for (let i = 0; i <= NZ; i++) {
      const z = 3.0 + (7 * i) / NZ, row: THREE.Vector3[] = [];
      US.push((7 * i) / NZ / 3);
      for (let j = 0; j < sj; j++) { const p0 = V3(2.6 + ps.a[j], ps.b[j], z); const d = disp(p0, 0.45); row.push(p0.add(V3(ps.na[j] * d, ps.nb[j] * d, 0))); }
      Q.push(row);
    }
    const NQ = gridNormals(Q, false, (i, j) => V3(2.6, 1.1, 3 + (7 * i) / NZ).sub(Q[i][j]));
    emitGrid(ra, Q, NQ, US, ps.s.map((s) => s / 3), false, () => true);
    capGeo(ra, Q[NZ], V3(2.6, 1.0, 10), V3(0, 0, 1), 0.8, 17);
    ra.mesh(R, rock);
    // ---- floor heightfield ----
    const fa = new Acc(), FX = 56, FZ = 70, F: THREE.Vector3[][] = [];
    for (let i = 0; i <= FX; i++) { const row: THREE.Vector3[] = []; for (let k = 0; k <= FZ; k++) { const x = -5.8 + (11.6 * i) / FX, z = -3.8 + (14.3 * k) / FZ; row.push(V3(x, -0.03 * fbm(x * 1.2, 3, z * 1.2), z)); } F.push(row); }
    const NF = gridNormals(F, false, () => V3(0, 1, 0));
    emitGrid(fa, F, NF, F.map((_, i) => (11.6 * i) / FX / 2.5), F[0].map((_, k) => (14.3 * k) / FZ / 2.5), false, () => true);
    fa.mesh(R, floor);
    const shell = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 24), new THREE.MeshBasicMaterial({ color: "#070504", side: THREE.BackSide, fog: false }));
    shell.position.set(0, 1, 3); shell.layers.set(NOINK); R.add(shell);

    // ---- furniture ----
    const b = new Bat();
    const wood = imat(S, { col: "#caa47c", map: beamHD() });
    const steelG = imat(S, { col: "#4f6a5e", map: metalTex(), spec: 28, specK: 0.35 });
    const dark = imat(S, { col: "#24221f" });
    const bench = (x0: number, z0: number, x1: number, z1: number) => {
      b.box(wood, x0, 0.39, z0, x1, 0.45, z1, undefined, 0.8);
      const along = x1 - x0 > z1 - z0, L = along ? x1 - x0 : z1 - z0, n = Math.max(2, Math.round(L / 1.2) + 1);
      for (let k = 0; k < n; k++) {
        const u = 0.12 + ((L - 0.24) * k) / (n - 1);
        const cx = along ? x0 + u : (x0 + x1) / 2, cz = along ? (z0 + z1) / 2 : z0 + u;
        b.box(wood, cx - 0.05, -0.02, cz - 0.05, cx + 0.05, 0.39, cz + 0.05, undefined, 0.8);
      }
    };
    bench(-4.6, -2.75, -1.85, -2.35); bench(1.4, -2.75, 4.4, -2.35); bench(-4.75, -1.8, -4.35, 1.8); bench(4.35, -1.8, 4.75, 1.8);
    // the steel cabinet (open, almost empty)
    {
      const x0 = -1.6, x1 = -0.4, z0 = -2.95, z1 = -2.45, h = 1.85, tk = 0.025;
      b.box(steelG, x0, 0, z0, x1, h, z0 + tk, undefined, 1);
      b.box(steelG, x0, 0, z0, x0 + tk, h, z1, undefined, 1); b.box(steelG, x1 - tk, 0, z0, x1, h, z1, undefined, 1);
      b.box(steelG, x0, h - tk, z0, x1, h, z1, undefined, 1); b.box(steelG, x0, 0, z0, x1, 0.08, z1, undefined, 1);
      for (const y of [0.5, 0.95, 1.4]) b.box(steelG, x0 + tk, y - 0.015, z0 + tk, x1 - tk, y, z1 - 0.01, undefined, 1);
      // doors, swung open ~115 degrees about the front hinges
      b.box(steelG, 0, 0.02, -0.012, 0.6, h - 0.02, 0.012, TRS(x0, 0, z1, -2.0), 1);
      b.box(steelG, -0.6, 0.02, -0.012, 0, h - 0.02, 0.012, TRS(x1, 0, z1, 2.0), 1);
      // contents: 2 tuna cans, 1 milk carton, 1 biscuit pack
      const tuna = imat(S, { col: "#ffffff", map: labelTex("mnTuna", "#c9ccd0", "#2a63b8", "ATÚN", "#ffffff"), spec: 40, specK: 0.4 });
      b.cyl(tuna, 0.045, 0.045, 0.04, 18, TRS(-1.25, 0.52, -2.68)); b.cyl(tuna, 0.045, 0.045, 0.04, 18, TRS(-1.11, 0.52, -2.64, 0.6));
      b.cyl(tuna, 0.045, 0.045, 0.04, 18, TRS(-1.18, 0.56, -2.66, 1.1));
      const milk = imat(S, { col: "#ffffff", map: labelTex("mnMilk", "#f4f2ea", "#3c8fd6", "LECHE", "#ffffff") });
      b.box(milk, -0.77, 0.95, -2.75, -0.67, 1.14, -2.65, TRS(0, 0, 0, 0.0));
      const bisc = imat(S, { col: "#ffffff", map: labelTex("mnBisc", "#d8442e", "#f2c84a", "GALLETAS", "#7a2210") });
      b.box(bisc, -1.3, 1.4, -2.78, -1.0, 1.46, -2.66);
    }
    // oxygen bottle (green, Chilean medical O2) + jerrycans + water bottles
    b.cyl(imat(S, { col: "#2d7046", spec: 40, specK: 0.5 }), 0.11, 0.11, 1.1, 20, TRS(-0.1, 0.55, -2.68));
    b.add(new THREE.SphereGeometry(0.11, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), imat(S, { col: "#f2f0ea" }), TRS(-0.1, 1.1, -2.68));
    b.cyl(imat(S, { col: "#8a8a86", spec: 50, specK: 0.6 }), 0.025, 0.03, 0.12, 10, TRS(-0.1, 1.25, -2.68));
    b.box(dark, -0.12, 1.28, -2.7, -0.02, 1.31, -2.66);
    const jer = imat(S, { col: "#e6e2d6", spec: 20, specK: 0.2 });
    b.box(jer, 0.75, 0, -2.85, 1.1, 0.45, -2.62, TRS(0, 0, 0, 0.1)); b.box(dark, 0.85, 0.45, -2.78, 0.95, 0.52, -2.7);
    const bottle = imat(S, { col: "#8fc6e8", spec: 60, specK: 0.8 });
    for (const [x, z] of [[-3.9, -2.5], [-3.75, -2.55], [2.1, -2.5]]) b.cyl(bottle, 0.04, 0.04, 0.26, 12, TRS(x, 0.58, z));
    // cardboard sheets on the floor (each at its own height: no coplanar faces)
    const card = imat(S, { col: "#b4a690", map: cardTex() });
    const CARDS: [number, number, number, number, number][] = [[-2.6, 0.4, 0.95, 1.4, 0.15], [-1.4, 0.9, 0.9, 1.3, -0.25], [-3.2, -0.9, 1.0, 1.2, 0.5], [0.6, 0.2, 0.9, 1.35, 0.08], [-0.4, -1.2, 1.1, 0.8, -0.1], [2.8, -0.4, 0.95, 1.4, 0.35], [-4.0, 1.4, 0.8, 1.2, 0.2]];
    CARDS.forEach(([x, z, w, d, rot], k) => b.box(card, -w / 2, 0.006 + k * 0.009, -d / 2, w / 2, 0.012 + k * 0.009, d / 2, TRS(x, 0, z, rot), 0.9));
    // a rolled blanket, a lunch box
    b.cyl(imat(S, { col: "#8b3a3a" }), 0.15, 0.15, 0.85, 14, TRS(-3.3, 0.61, -2.5, 0, 0, Math.PI / 2));
    b.box(imat(S, { col: "#4a6b9a", spec: 30, specK: 0.3 }), 3.3, 0.45, -2.7, 3.65, 0.65, -2.45);
    // rock bolts + plates in the ceiling
    for (const [x, z] of [[-3.5, -0.8], [-1.5, 0.9], [0.8, -1.0], [2.6, 0.7], [4.0, -0.6], [-3.2, 1.4]]) {
      let y = 2.75; for (const row of P) for (const q of row) if (Math.abs(q.x - x) < 0.25 && Math.abs(q.z - z) < 0.2) y = Math.min(y, q.y);
      b.box(dark, x - 0.09, y - 0.03, z - 0.09, x + 0.09, y + 0.15, z + 0.09); b.cyl(dark, 0.025, 0.025, 0.06, 8, TRS(x, y - 0.06, z));
    }
    // the doorway frame (hides the room / stub seam)
    b.box(wood, 0.6, -0.02, 2.75, 1.02, 2.12, 3.15, undefined, 0.9); b.box(wood, 4.18, -0.02, 2.75, 4.6, 2.12, 3.15, undefined, 0.9);
    b.box(wood, 0.5, 2.0, 2.72, 4.7, 2.36, 3.18, undefined, 0.9);
    // helmets with lamps (two light sources)
    const helm = imat(S, { col: "#f2c21e", spec: 50, specK: 0.6 });
    const lampEm = imat(S, { col: "#fffbe8", em: [9, 8.2, 6.2] });
    const helmet = (pos: THREE.Vector3, dir: THREE.Vector3) => {
      const yaw = Math.atan2(dir.x, dir.z), pitch = -Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      const M = TRS(pos.x, pos.y, pos.z, yaw, pitch);
      b.add(new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), helm, M.clone().multiply(TRS(0, -0.05, -0.04)));
      b.cyl(helm, 0.19, 0.19, 0.015, 24, M.clone().multiply(TRS(0, -0.05, -0.02)));
      b.cyl(dark, 0.045, 0.05, 0.06, 14, M.clone().multiply(TRS(0, 0.02, 0.1, 0, Math.PI / 2)));
      b.add(new THREE.CircleGeometry(0.038, 16), lampEm, M.clone().multiply(TRS(0, 0.02, 0.131)));
      this.helmets.push({ p: V3(0, 0.02, 0.15).applyMatrix4(M), d: dir.clone().normalize() });
    };
    helmet(V3(-3.0, 0.57, -2.55), V3(0.55, -0.22, 0.8));
    b.box(dark, -4.98, 1.62, 1.15, -4.7, 1.65, 1.25); // nail
    helmet(V3(-4.68, 1.75, 1.2), V3(0.82, -0.5, -0.3));
    helmet(V3(4.15, 0.62, -2.35), V3(-1.3, 0.5, -0.75));
    b.build(R);
    // ---- the bare bulb on its cable ----
    this.bulbMat = imat(S, { col: "#fff6e0", em: [9, 6.6, 3.6] });
    {
      const bb = new Bat();
      bb.cyl(dark, 0.008, 0.008, 0.55, 6, TRS(0, -0.275, 0));
      bb.cyl(dark, 0.025, 0.025, 0.07, 12, TRS(0, -0.58, 0));
      bb.add(new THREE.SphereGeometry(0.055, 18, 12), this.bulbMat, TRS(0, -0.66, 0, 0, 0, 0).multiply(new THREE.Matrix4().makeScale(1, 1.25, 1)));
      bb.build(this.bulb);
      this.bulb.position.set(0.2, 2.86, 0); R.add(this.bulb);
    }
    // ---- tally marks: own canvas, redrawn when the count changes ----
    this.tallyCv = document.createElement("canvas"); this.tallyCv.width = 1024; this.tallyCv.height = 384;
    this.tallyTex = new THREE.CanvasTexture(this.tallyCv); this.tallyTex.colorSpace = THREE.SRGBColorSpace; this.tallyTex.anisotropy = 8;
    const tm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), imat(S, { col: "#ffffff", map: this.tallyTex, alpha: true }));
    tm.position.set(2.9, 1.25, -2.965); tm.layers.set(NOINK); tm.renderOrder = 2; R.add(tm);
    // ---- beams + motes ----
    for (const [len, rad] of [[4.2, 1.3], [4.2, 1.3], [1.7, 0.55]]) this.beams.push(new Beam(R, len, rad, [1.0, 0.9, 0.72], 0.3));
    this.beams.push(new Beam(R, 2.3, 2.1, [1.0, 0.72, 0.4], 0.05));
    this.motes = new Motes(R, S, 1100, 33, [-4.8, 0.1, -2.8, 4.8, 2.6, 6.0], 2.4);
    R.traverse((o) => { o.frustumCulled = false; });
  }

  update(id: number, t: number) {
    const S = this.S, O = this.root.position, W2 = (p: THREE.Vector3) => p.clone().add(O);
    const sway = 0.05 * Math.sin(t * 0.9) + 0.02 * Math.sin(t * 2.3 + 1);
    this.bulb.rotation.set(sway, 0, 0.6 * sway);
    const bp = V3(0, -0.66, 0).applyEuler(this.bulb.rotation).add(this.bulb.position);
    const flick = 0.94 + 0.06 * Math.sin(t * 37) * Math.sin(t * 13.7);
    (this.bulbMat.uniforms.uEm.value as THREE.Vector3).set(9 * flick, 6.6 * flick, 3.6 * flick);
    const L: LDef[] = [
      { p: W2(bp), c: [3.6 * flick, 2.3 * flick, 1.1 * flick], r: 3.6 },
      ...this.helmets.map((h, k) => { const g = k === 2 ? 0.45 : 1; return { p: W2(h.p), c: [7 * g, 6.1 * g, 4.6 * g] as [number, number, number], r: 4.2, dir: h.d, cos: 0.86 }; }),
      { p: W2(V3(2.6, 1.8, 9)), c: [0.1, 0.12, 0.17], r: 5 },
      { p: W2(V3(0.2, 0.25, 0)), c: [0.4, 0.22, 0.1], r: 3.2 },
    ];
    setLights(S, L, [0.1, 0.08, 0.07], [0.06, 0.045, 0.035]);
    this.helmets.forEach((h, k) => this.beams[k].set(h.p.clone().addScaledVector(h.d, 0.04), h.d, k === 2 ? 0.12 : 0.3, t));
    this.beams[3].set(bp.clone().add(V3(0, -0.06, 0)), V3(0, -1, 0), 0.07 * flick, t);
    this.motes.mat.uniforms.uT.value = t;
    (this.motes.mat.uniforms.uO.value as THREE.Vector3).copy(O);
    // tally marks (pure function of dayAt; the newest stroke is scratched in progressively in shot 7)
    const n = dayAt(id, t);
    const part = id === 7 && n < 17 ? clamp01(((t - 23.8) * 4 - (n - 2)) * 1.6) : 0;
    const key = `${n}_${Math.round(part * 12)}`;
    if (key !== this.tallyKey) { this.tallyKey = key; tallyDraw(this.tallyCv.getContext("2d")!, n, Math.round(part * 12) / 12); this.tallyTex.needsUpdate = true; }
  }
}

// ============================================================ public class
export class Underground {
  root = new THREE.Group();
  private tunnel = new Tunnel();
  private refuge = new Refuge();
  constructor() { this.root.add(this.tunnel.root, this.refuge.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const lx = cam.position.x - MINE[0], lz = cam.position.z - MINE[2];
    this.tunnel.root.visible = Math.abs(lx) < 30 && lz > -50 && lz < 20 && Math.abs(cam.position.y) < 20;
    const rx = cam.position.x - REFUGE[0], rz = cam.position.z - REFUGE[2];
    this.refuge.root.visible = Math.abs(rx) < 9 && rz > -5 && rz < 11 && Math.abs(cam.position.y) < 10;
    if (this.tunnel.root.visible) this.tunnel.update(id, t, f);
    if (this.refuge.root.visible) this.refuge.update(id, t);
  }
}
