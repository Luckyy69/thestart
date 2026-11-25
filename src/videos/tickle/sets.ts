// OWNER: sets. "Why You Can't Tickle Yourself": BEAN's cosy HOME living room (early-morning golden hour) and the 1990s
// London neuroscience LAB. Everything here is new: geometry, paintings, colours.
// Both sets light themselves with their OWN small shader rig (the world's lights never touch these materials):
//   - an ambient that is warm from below / cool-blue from above (blue shade), a corner-darkening term (painted AO),
//   - up to 10 soft point lights, one theatrical spot (cone, soft edge),
//   - "low sun through a window": per pixel a surface point is sunlit only if the ray toward the sun passes through
//     the window rectangle minus its glazing bars (HOME: 3 x 4 sash panes) or venetian slats (LAB), with a penumbra that
//     widens with distance, so the low sun throws long crisp stripes over the floor, the furniture and the walls,
//   - the world's sun shadow map (three's shadow chunks) so the cast cards still throw their long shadows on the sets.
// The haze shaft is RAY-MARCHED through the window prism (NOINK, additive): the bars / slats show in the air too. Dust
// motes glow only inside the sun. Side walls / ceiling hide when the camera is outside them (cutaway). The rigs follow
// SHOTS + LOOK_RAMPS themselves (morning -> xray at HOME; reveal / lab -> peak -> xray in the LAB).
//
// CONTRACTS (LOCAL to the place anchor, metres; HOME = (0,0,0), LAB = (-3000,0,0), RIG = LAB + (0, 0.78, 0)):
//   HOME: floor y 0, back wall z -1.4, side walls x +-3.2, ceiling 2.75, open toward +z (floor to z 5.5).
//     BIG WINDOW (back wall) x -2.5..-0.6, y 0.5..2.25 (3 x 4 panes); sun travels toward +x +z, low (~25 deg):
//     the stripe pool runs from the armchair (-1.6, 0, -0.3) through BEAN's spot (0, 0, 0) toward the camera.
//     ARMCHAIR centre (-1.6, 0, -0.3), yaw +0.18 (faces the camera, a touch to +x): seat cushion top y 0.47, seat area
//       x -1.88..-1.32, z -0.45..0.1 (front edge z ~0.1); arm tops y 0.71 at local x +-0.38; back top y ~1.0 at z -0.68.
//       Floor in front of it (z 0.15..1.2) is clear for the slow robot.
//     Rug (oval) centre (-0.45, 0.35), 3.2 x 2.1, top y 0.014. Floor lamp (-2.62, 0, 0.12) shade y 1.45..1.76.
//     TV cabinet x 0.7..2.0, z -1.38..-0.95, top y 0.56. Bookshelf x 2.15..3.15. Cat bed (1.35, 0, -0.55).
//   LAB: floor y 0, back wall z -2.0, side walls x +-3.6, ceiling 3.0, open toward +z (floor to z 6.5).
//     LAB TABLE top y 0.78 (= RIG y), x -0.92..0.92, z -0.46..0.46: the WHOLE TOP IS FREE for the robot (props).
//     STOOL for BEAN at (0, 0, 0.55): seat top y 0.62, radius 0.18.
//     SCIENTISTS stand behind the table at (-0.62, 0, -0.85) and (0.62, 0, -0.85) (floor free x -1.2..1.2, z -1.9..-0.5).
//     WHITEBOARD (behind them) x -0.95..0.95, y 1.0..2.1 on the back wall. WINDOW with venetian blinds x -2.75..-1.25,
//     y 1.0..2.4 (sun stripes fall across the table + BEAN). Computer desk x 1.2..3.3 (beige PCs, green CRT, binders).
//     THEATRICAL SPOT: a can at (0, 2.82, 0.75) aimed at (0, 0.78, 0.1) (on in "reveal", warm; gold-pink in "peak").
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { HOME, LAB, SHOTS, LOOK_RAMPS, Look, W, smooth, clamp01 } from "./story";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];

// ============================================================ the light shader (own rig)
const NL = 10;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uPP; uniform vec3 uPD; uniform vec3 uPC; uniform vec2 uPK; uniform vec3 uO; uniform vec4 uBox; uniform float uAO;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// sun through the window aperture (bars / slats), 0..1
float sunK(vec3 p, float leaf){
  float den = dot(uSD, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + uSD * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.003 + 0.011 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float d = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float d = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (leaf > 0.0 && uWM.w > 0.0) { // soft dapple of leaves outside, drifting slowly
    vec2 s = a * 2.2 + vec2(sin(uTT * 0.31), cos(uTT * 0.23)) * 0.1;
    float nz = tn2(s + 7.0) * 0.62 + tn2(s * 2.9 + 3.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.52, 0.74 + pen * 2.0, nz);
  }
  return k;
}
// painted AO: darken toward the floor/wall/ceiling corners of the room box
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(uBox.x - abs(l.x), l.z - uBox.y), uBox.z - l.y);
  float a = smoothstep(0.0, 0.55, dw) * 0.5 + 0.5;
  float b = smoothstep(0.0, 0.3, l.y) * 0.3 + 0.7;
  float k = min(a, 1.0) * (l.y > 0.004 ? b : 1.0);
  return mix(1.0, k, uAO);
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.65 + 0.35 * sh) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.75 + 0.25 * sh) * (0.5 + 0.5 * ao);
  }
  vec3 dp = uPP - p; float pr2 = dot(dp, dp); vec3 pl = dp * inversesqrt(max(pr2, 1e-6));
  L += uPC * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * smoothstep(-0.1, 0.45, dot(n, pl)) / (1.0 + 0.25 * pr2) * (0.6 + 0.4 * sh);
  float ndl = dot(n, uSD);
  if (ndl > 0.0) L += uSC * smoothstep(0.0, 0.22, ndl) * sunK(p, 1.0) * sh;
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
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uRot;
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
  if (uRot != 0.0) { float c = cos(uRot), s = sin(uRot); uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y); }
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, uv);
#endif
  vec3 c = uCol * vC * tx.rgb * lightAt(vW, n, sh) + uEm * vC;
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
  vec3 pl = normalize(uPP - vW);
  c += uPC * 0.2 * pow(max(dot(n, normalize(pl + v)), 0.0), uSpec) * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * uSpecK;
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
      uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 1 },
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
type MOpt = { col?: string; map?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number]; rot?: number };
const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 },
      uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) }, uRot: { value: o.rot ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};

// ============================================================ volumetrics (NOINK, additive)
/** ray-marched haze inside the window prism: the bars / slats show in the air */
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
            float fall = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(0.45, 1.0, along));
            float nz = 0.6 + 0.4 * tn2(p.xz * 2.1 + vec2(p.y * 1.9, uTT * 0.07));
            acc += sunK(p, 0.0) * fall * nz * smoothstep(0.4, 1.3, length(p - cameraPosition));
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
/** a soft additive light cone (radius r0 at the lamp, r1 at length h), local -y is the beam */
class Cone {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, r0: number, r1: number, h: number) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: V3(1, 0.8, 0.5) }, uK: { value: 0 }, uT: { value: 0 } },
      vertexShader: `varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vAl = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vAng = uv.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uK; uniform float uT; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
          float streak = 0.78 + 0.22 * sin(vAng * 6.2832 * 7.0 + sin(vAng * 6.2832 * 3.0 + uT * 0.4) * 1.6 + vAl * 2.0);
          float a = uK * pow(e, 1.8) * streak * smoothstep(0.0, 0.12, vAl) * (0.3 + 0.7 * vAl);
          a *= smoothstep(0.5, 1.5, length(cameraPosition - vW));
          gl_FragColor = vec4(uCol * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const g = new THREE.CylinderGeometry(r0, r1, h, 64, 8, true); g.translate(0, -h / 2, 0);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
}
/** dust motes: glow only inside the sun (and faintly in the spot) */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.0035 + 0.007 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
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
          vec3 dp = uPP - p; float pr2 = dot(dp, dp); vec3 pl = dp * inversesqrt(max(pr2, 1e-6));
          vec3 L = uSC * sunK(p, 0.0) * 0.8 + uPC * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * 0.12 + (uAU + uAD) * 0.04;
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

// ============================================================ geometry helpers (vertex colours, merged batches)
const WHITE = new THREE.Color(1, 1, 1);
const clean = (g: THREE.BufferGeometry, col?: THREE.Color) => {
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
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => {
  const sc = typeof s === "number" ? V3(s, s, s) : V3(...s);
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
const C = (h?: string) => (h ? new THREE.Color(h) : undefined);
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4, col?: string) {
    const c = clean(g, C(col)); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mx?: THREE.Matrix4, col?: string) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(g, mat, mx, col);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4, col?: string, seg = 2) { this.add(new RoundedBoxGeometry(w, h, d, seg, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx, col); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, col?: string, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx, col); }
  lathe(mat: THREE.Material, pts: [number, number][], mx: THREE.Matrix4, seg = 32, col?: string) { this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, mx, col); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 16, col?: string) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx, col); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 10, col?: string) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2) { this.add(new THREE.TorusGeometry(R, r, 8, 40, arc), mat, mx, col); }
  build(parent: THREE.Object3D, cast = false) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** a single (non-batched) mesh with the colour attribute the shader needs */
const solo = (g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) => {
  const c = clean(g); if (mx) c.applyMatrix4(mx);
  const m = new THREE.Mesh(c, mat); m.frustumCulled = false; m.receiveShadow = true; return m;
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
/** a plane facing +z (w x h) with a gentle bulge (CRT glass) */
const bulge = (w: number, h: number, k: number) => {
  const g = new THREE.PlaneGeometry(w, h, 16, 12), p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2); p.setZ(i, k * (1 - 0.5 * x * x) * (1 - 0.5 * y * y)); }
  g.computeVertexNormals(); return g;
};

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const MONO = "'DejaVu Sans Mono', 'JetBrains Mono', monospace";
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#2a2a2a", align: CanvasTextAlign = "center", font = FONT, weight = "bold") => {
  g.font = `${weight} ${Math.max(6, Math.round(px))}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
/** marker handwriting: per-letter jitter + slight tilt */
const hand = (g: G, s: string, x: number, y: number, px: number, col: string, r: () => number, align: "left" | "center" = "left") => {
  g.font = `bold ${Math.round(px)}px ${FONT}`; g.textBaseline = "middle"; g.textAlign = "left"; g.fillStyle = col;
  let w = 0; for (const ch of s) w += g.measureText(ch).width * 0.92;
  let cx = align === "center" ? x - w / 2 : x;
  for (const ch of s) {
    g.save(); g.translate(cx, y + (r() - 0.5) * px * 0.12); g.rotate((r() - 0.5) * 0.14); g.fillText(ch, 0, 0); g.restore();
    cx += g.measureText(ch).width * 0.92;
  }
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const repT = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;
const mline = (g: G, pts: number[][], col: string, w: number) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };

// ---------------- HOME textures
/** honey + amber herringbone parquet: tile 0.6 m = 8 blocks of 0.075 m (blocks 4:1), drawn on 1024 px */
const herringTex = () => repT(ctex("tiHerring", 1024, 1024, (g, r) => {
  const U = 1024 / 8, L = 4, T = 2 * L; // unit = block width; tile = 2L units
  g.fillStyle = "#5a3014"; g.fillRect(0, 0, 1024, 1024);
  const piece = (x: number, y: number, w: number, h: number, horiz: boolean, seed: number) => {
    const r2 = rng(seed);
    const hue = 27 + r2() * 9, lig = 50 + r2() * 14, sat = 55 + r2() * 12;
    for (const ox of [-T, 0, T]) for (const oy of [-T, 0, T]) {
      const X = (x + ox) * U, Y = (y + oy) * U, Wd = w * U, H = h * U;
      if (X > 1024 || Y > 1024 || X + Wd < 0 || Y + H < 0) continue;
      const gr = horiz ? g.createLinearGradient(X, Y, X, Y + H) : g.createLinearGradient(X, Y, X + Wd, Y);
      gr.addColorStop(0, hsl(hue, sat, lig + 5)); gr.addColorStop(1, hsl(hue - 3, sat + 4, lig - 6));
      g.fillStyle = gr; g.fillRect(X + 2, Y + 2, Wd - 4, H - 4);
      g.save(); g.beginPath(); g.rect(X + 2, Y + 2, Wd - 4, H - 4); g.clip();
      const r3 = rng(seed + 7);
      for (let k = 0; k < 7; k++) {
        g.strokeStyle = `rgba(95,45,12,${0.1 + r3() * 0.16})`; g.lineWidth = 1 + r3() * 2; g.beginPath();
        if (horiz) { const yy = Y + r3() * H; g.moveTo(X, yy); for (let s = 0; s <= 6; s++) g.lineTo(X + (Wd * s) / 6, yy + Math.sin(s * 1.1 + k) * (1 + r3() * 3)); }
        else { const xx = X + r3() * Wd; g.moveTo(xx, Y); for (let s = 0; s <= 6; s++) g.lineTo(xx + Math.sin(s * 1.1 + k) * (1 + r3() * 3), Y + (H * s) / 6); }
        g.stroke();
      }
      g.fillStyle = "rgba(255,235,195,0.22)"; if (horiz) g.fillRect(X + 2, Y + 2, Wd - 4, 3); else g.fillRect(X + 2, Y + 2, 3, H - 4);
      g.restore();
    }
  };
  // lattice o = a(1,1) + b(L,-L); one tile holds a = 0..T-1 (b = 0); H at o + [0,L]x[0,1], V at o + [L,L+1]x[1-L,1]
  const md = (v: number) => ((v % T) + T) % T;
  for (let a = 0; a < T; a++) {
    piece(md(a), md(a), L, 1, true, 100 + a);
    piece(md(a + L), md(a + 1 - L), 1, L, false, 200 + a);
  }
  noise(g, 0, 0, 1024, 1024, r, 16000, 0.035);
}));
/** warm apricot plaster: soft mottle, 1.2 m tile */
const plasterTex = () => repT(ctex("tiPlaster", 1024, 1024, (g, r) => {
  g.fillStyle = "#f3b48a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 220; i++) {
    const x = r() * 1024, y = r() * 1024, s = 40 + r() * 140, c = r() < 0.5 ? "255,214,170" : "214,130,96";
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
      gr.addColorStop(0, `rgba(${c},0.10)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
    }
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.03);
}));
/** deep teal tongue-and-groove boards (0.1 m), 1.0 m tile */
const boardsTex = () => repT(ctex("tiBoards", 1024, 1024, (g, r) => {
  const n = 10, w = 1024 / n;
  for (let i = 0; i < n; i++) {
    const l = 30 + r() * 4;
    const gr = g.createLinearGradient(i * w, 0, i * w + w, 0); gr.addColorStop(0, hsl(178, 42, l + 4)); gr.addColorStop(0.8, hsl(180, 44, l)); gr.addColorStop(1, hsl(182, 46, l - 6));
    g.fillStyle = gr; g.fillRect(i * w, 0, w, 1024);
    g.fillStyle = "rgba(8,30,32,0.75)"; g.fillRect(i * w, 0, 5, 1024);
    g.fillStyle = "rgba(170,235,225,0.28)"; g.fillRect(i * w + 5, 0, 3, 1024);
    for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(i * w + 10 + r() * (w - 20), 0, 2, 1024); }
  }
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.035);
}));
/** oval rug: terracotta / mustard / teal / cream rings with a zigzag band */
const rugTex = () => ctex("tiRug", 1536, 1024, (g, r) => {
  g.fillStyle = "#c2563a"; g.fillRect(0, 0, 1536, 1024);
  const cx = 768, cy = 512;
  const ring = (k: number, col: string) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, 768 * k, 512 * k, 0, 0, 7); g.fill(); };
  ring(0.95, "#f1dcb4"); ring(0.91, "#2f6f6a"); ring(0.8, "#e8a93a"); ring(0.74, "#f1dcb4");
  ring(0.7, "#c2563a"); ring(0.52, "#f1dcb4"); ring(0.48, "#2f6f6a"); ring(0.3, "#e8a93a"); ring(0.18, "#c2563a"); ring(0.08, "#f1dcb4");
  g.fillStyle = "#f1dcb4";
  for (let a = 0; a < 72; a++) {
    const t0 = (a / 72) * Math.PI * 2, t1 = ((a + 0.5) / 72) * Math.PI * 2, t2 = ((a + 1) / 72) * Math.PI * 2;
    const P = (t: number, k: number): [number, number] => [cx + Math.cos(t) * 768 * k, cy + Math.sin(t) * 512 * k];
    g.beginPath(); g.moveTo(...P(t0, 0.56)); g.lineTo(...P(t1, 0.66)); g.lineTo(...P(t2, 0.56)); g.lineTo(...P(t1, 0.6)); g.fill();
  }
  g.fillStyle = "#2f6f6a";
  for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; g.beginPath(); g.arc(cx + Math.cos(t) * 768 * 0.39, cy + Math.sin(t) * 512 * 0.39, 11, 0, 7); g.fill(); }
  for (let i = 0; i < 26000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)"; g.fillRect(r() * 1536, r() * 1024, 2, 2 + r() * 3); }
});
/** the morning view: rooftops + chimney pots, a low sun glowing on the LEFT, a spire */
const roofsTex = () => ctex("tiRoofs", 1024, 1024, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 760);
  sky.addColorStop(0, "#86a9dc"); sky.addColorStop(0.4, "#e9b9a0"); sky.addColorStop(0.7, "#ffc88a"); sky.addColorStop(1, "#ffe2b0");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 1024);
  const sun = g.createRadialGradient(150, 470, 0, 150, 470, 520); sun.addColorStop(0, "rgba(255,252,230,1)"); sun.addColorStop(0.08, "rgba(255,240,190,1)"); sun.addColorStop(0.3, "rgba(255,200,120,0.45)"); sun.addColorStop(1, "rgba(255,190,110,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(255,236,214,0.55)"; g.beginPath(); g.ellipse(300 + k * 170 + r() * 60, 150 + r() * 160, 90 + r() * 60, 16 + r() * 8, 0, 0, 7); g.fill(); }
  g.fillStyle = "#d9a39a";
  for (let x = -20; x < 1044; x += 70) { const h = 520 + r() * 50; g.fillRect(x, h, 72, 600); g.beginPath(); g.moveTo(x - 4, h); g.lineTo(x + 36, h - 26); g.lineTo(x + 76, h); g.fill(); }
  g.beginPath(); g.moveTo(690, 520); g.lineTo(712, 300); g.lineTo(734, 520); g.fill(); g.fillRect(686, 500, 52, 100);
  g.fillStyle = "rgba(255,212,170,0.5)"; g.fillRect(0, 480, 1024, 150);
  for (let k = 0; k < 5; k++) {
    const x = k * 230 - 60, y = 640 + (k % 2) * 30, w = 240;
    g.fillStyle = "#8a5a6a"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y - 70); g.lineTo(x + w, y); g.fill();
    g.fillStyle = "#c07a5a"; g.fillRect(x + 6, y, w - 12, 400);
    g.fillStyle = "rgba(255,190,120,0.35)"; g.fillRect(x + 6, y, 24, 400);
    for (let j = 0; j < 3; j++) { const wx = x + 30 + j * 70; g.fillStyle = "#f5e6c8"; g.fillRect(wx - 4, y + 56, 48, 70); g.fillStyle = r() < 0.4 ? "#ffd27a" : "#5a6a8a"; g.fillRect(wx, y + 60, 40, 62); g.fillStyle = "#f5e6c8"; g.fillRect(wx + 18, y + 60, 4, 62); g.fillRect(wx, y + 88, 40, 4); }
    const cx2 = x + w * 0.72; g.fillStyle = "#a8604a"; g.fillRect(cx2, y - 110, 46, 80); g.fillStyle = "#e9d2b0"; g.fillRect(cx2 - 4, y - 116, 54, 10);
    g.fillStyle = "#c86a3a"; for (let q = 0; q < 3; q++) g.fillRect(cx2 + 2 + q * 15, y - 134, 11, 20);
  }
  for (let k = 0; k < 7; k++) {
    const x = r() * 1024, y = 900 + r() * 50, s = 60 + r() * 70;
    g.fillStyle = "#5a7a4a"; for (let q = 0; q < 7; q++) { g.beginPath(); g.arc(x + (r() - 0.5) * s, y - r() * s, s * (0.35 + r() * 0.3), 0, 7); g.fill(); }
    g.fillStyle = "rgba(255,206,120,0.4)"; g.beginPath(); g.arc(x - s * 0.25, y - s * 0.5, s * 0.32, 0, 7); g.fill();
  }
  g.strokeStyle = "#5a4a5a"; g.lineWidth = 3; for (let k = 0; k < 4; k++) { const x = 420 + k * 60 + r() * 30, y = 260 + r() * 60; g.beginPath(); g.moveTo(x - 10, y); g.quadraticCurveTo(x - 5, y - 6, x, y); g.quadraticCurveTo(x + 5, y - 6, x + 10, y); g.stroke(); }
});
/** framed prints for HOME: 0 moon, 1 sunrise mountains, 2 a whale, 3 a pear, 4 "GOOD MORNING", 5 a record */
const printTex = (kind: number) => ctex("tiPrint" + kind, 512, 640, (g, r) => {
  const W2 = 512, H = 640;
  if (kind === 0) {
    g.fillStyle = "#1f2a5a"; g.fillRect(0, 0, W2, H);
    for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,240,200,${0.4 + r() * 0.6})`; g.beginPath(); g.arc(r() * W2, r() * H, 1 + r() * 3, 0, 7); g.fill(); }
    g.fillStyle = "#f6e6b0"; g.beginPath(); g.arc(256, 280, 150, 0, 7); g.fill();
    g.fillStyle = "#1f2a5a"; g.beginPath(); g.arc(316, 240, 140, 0, 7); g.fill();
    txt(g, "GOODNIGHT", 256, 560, 52, "#f6e6b0");
  } else if (kind === 1) {
    const s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, "#f6c58a"); s.addColorStop(0.6, "#f29a7a"); s.addColorStop(1, "#c86a7a"); g.fillStyle = s; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#fff2c8"; g.beginPath(); g.arc(256, 330, 90, 0, 7); g.fill();
    for (const [c, y0] of [["#a65a7a", 360], ["#7a4a7a", 440], ["#4a3a6a", 520]] as [string, number][]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W2; x += 32) g.lineTo(x, y0 - Math.abs(Math.sin(x * 0.011 + y0)) * 120 - r() * 20); g.lineTo(W2, H); g.fill(); }
  } else if (kind === 2) {
    g.fillStyle = "#f4e8d0"; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#3a7ab8"; g.beginPath(); g.ellipse(256, 340, 190, 120, 0, 0, 7); g.fill();
    g.beginPath(); g.moveTo(430, 330); g.lineTo(500, 260); g.lineTo(490, 400); g.fill();
    g.fillStyle = "#cfe4f2"; g.beginPath(); g.ellipse(240, 400, 150, 50, 0, 0, Math.PI); g.fill();
    g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(150, 320, 12, 0, 7); g.fill();
    g.strokeStyle = "#3a7ab8"; g.lineWidth = 8; for (const dx of [-20, 0, 20]) { g.beginPath(); g.moveTo(200, 220); g.quadraticCurveTo(200 + dx, 160, 200 + dx * 3, 130); g.stroke(); }
    txt(g, "HELLO WHALE", 256, 560, 44, "#c2563a");
  } else if (kind === 3) {
    g.fillStyle = "#e9c040"; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#7ab04a"; g.beginPath(); g.moveTo(256, 140); g.bezierCurveTo(170, 230, 150, 300, 150, 380); g.bezierCurveTo(150, 520, 362, 520, 362, 380); g.bezierCurveTo(362, 300, 342, 230, 256, 140); g.fill();
    g.fillStyle = "#5a3a1a"; g.fillRect(250, 100, 12, 50); g.fillStyle = "#3f8a4a"; g.beginPath(); g.ellipse(296, 118, 40, 16, -0.4, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(210, 330, 20, 50, 0.3, 0, 7); g.fill();
  } else if (kind === 4) {
    g.fillStyle = "#2f6f6a"; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#f6b04a"; g.beginPath(); g.arc(256, 420, 170, Math.PI, 0); g.fill();
    for (let k = 0; k < 9; k++) { const a = Math.PI + (k / 8) * Math.PI; g.strokeStyle = "#f6b04a"; g.lineWidth = 12; g.beginPath(); g.moveTo(256 + Math.cos(a) * 195, 420 + Math.sin(a) * 195); g.lineTo(256 + Math.cos(a) * 240, 420 + Math.sin(a) * 240); g.stroke(); }
    g.fillStyle = "#f4e8d0"; g.fillRect(0, 420, W2, 220);
    txt(g, "GOOD", 256, 490, 66, "#c2563a"); txt(g, "MORNING", 256, 570, 66, "#c2563a");
  } else {
    g.fillStyle = "#e9573a"; g.fillRect(0, 0, W2, H);
    g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(256, 300, 200, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 2; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(256, 300, 80 + k * 7.5, 0, 7); g.stroke(); }
    g.fillStyle = "#f6d04a"; g.beginPath(); g.arc(256, 300, 66, 0, 7); g.fill(); g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(256, 300, 8, 0, 7); g.fill();
    txt(g, "SIDE A", 256, 570, 46, "#f6e6c8");
  }
  noise(g, 0, 0, W2, H, r, 4000, 0.04);
});
const tvTex = () => ctex("tiTVScreen", 512, 384, (g) => {
  const gr = g.createLinearGradient(0, 0, 512, 384); gr.addColorStop(0, "#2a3448"); gr.addColorStop(0.5, "#141a26"); gr.addColorStop(1, "#0a0e16"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "rgba(255,220,170,0.22)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(170, 0); g.lineTo(90, 384); g.lineTo(-40, 384); g.fill();
  g.fillStyle = "rgba(255,220,170,0.1)"; g.beginPath(); g.moveTo(200, 0); g.lineTo(240, 0); g.lineTo(160, 384); g.lineTo(120, 384); g.fill();
});

// ---------------- LAB textures
/** 1990s speckled vinyl tiles (0.3 m), cream + sage checker with a few rust tiles, 1.2 m tile */
const labFloorTex = () => repT(ctex("tiLabFloor", 1024, 1024, (g, r) => {
  const n = 4, s = 1024 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const base = (i * 7 + j * 3) % 11 === 4 ? [16, 40, 52] : (i + j) % 2 ? [42, 22, 76] : [96, 16, 64];
    g.fillStyle = hsl(base[0], base[1], base[2]); g.fillRect(i * s, j * s, s, s);
    for (let k = 0; k < 700; k++) { g.fillStyle = ["rgba(60,50,40,0.35)", "rgba(255,255,255,0.4)", "rgba(120,90,60,0.3)", "rgba(40,60,50,0.3)"][k % 4]; g.fillRect(i * s + r() * s, j * s + r() * s, 1.5 + r() * 4, 1 + r() * 3); }
    g.strokeStyle = "rgba(70,60,50,0.55)"; g.lineWidth = 3; g.strokeRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
    for (let k = 0; k < 3; k++) { g.strokeStyle = "rgba(40,30,20,0.12)"; g.lineWidth = 2; g.beginPath(); const x = i * s + r() * s, y = j * s + r() * s; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 40); g.stroke(); }
  }
}));
/** gloss-painted brick (cream), 13 courses per metre: 1.0 m tile */
const brickTex = () => repT(ctex("tiPaintBrick", 1024, 1024, (g, r) => {
  g.fillStyle = "#c6bca2"; g.fillRect(0, 0, 1024, 1024);
  const rows = 13, h = 1024 / rows, bw = 1024 / 4.5;
  for (let j = 0; j < rows; j++) {
    const off = (j % 2) * bw * 0.5;
    for (let x = -bw + off; x < 1024 + bw; x += bw) {
      const l = 86 + r() * 5;
      g.fillStyle = hsl(44, 38, l); g.fillRect(x + 4, j * h + 4, bw - 8, h - 8);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 8, j * h + 6, bw - 16, 4);
      g.fillStyle = "rgba(120,100,60,0.12)"; g.fillRect(x + 4, j * h + h - 10, bw - 8, 6);
    }
  }
  noise(g, 0, 0, 1024, 1024, r, 8000, 0.03);
}));
/** institutional green gloss dado (with scuffs), 1 m tile */
const greenTex = () => repT(ctex("tiLabGreen", 512, 512, (g, r) => {
  g.fillStyle = "#4f8a6a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`; g.fillRect(0, r() * 512, 512, 2 + r() * 6); }
  for (let k = 0; k < 18; k++) { g.fillStyle = "rgba(30,50,40,0.12)"; g.beginPath(); g.ellipse(r() * 512, 380 + r() * 130, 10 + r() * 30, 3 + r() * 5, 0, 0, 7); g.fill(); }
  noise(g, 0, 0, 512, 512, r, 5000, 0.03);
}));
const ceilTex = () => repT(ctex("tiLabCeil", 512, 512, (g, r) => {
  g.fillStyle = "#ece6d6"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 3000; k++) { g.fillStyle = "rgba(120,110,90,0.22)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.fillStyle = "#b8b2a2"; g.fillRect(0, 0, 512, 8); g.fillRect(0, 0, 8, 512);
}));
/** the whiteboard: brain diagram (cerebellum), forward model, a "tickly vs delay" graph, a hand doodle (1.9 x 1.1 m) */
const boardTex = () => ctex("tiBoard", 2048, 1186, (g, r) => {
  g.fillStyle = "#fbfcfa"; g.fillRect(0, 0, 2048, 1186);
  for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(120,140,170,${0.04 + r() * 0.04})`; g.beginPath(); g.ellipse(r() * 2048, r() * 1186, 80 + r() * 200, 20 + r() * 50, (r() - 0.5) * 0.5, 0, 7); g.fill(); }
  const blue = "#1f4fb0", red = "#d0302a", blk = "#1d1d22", grn = "#1f8a4a";
  hand(g, "WHY CAN'T YOU TICKLE YOURSELF?", 1024, 90, 66, blk, r, "center");
  mline(g, [[520, 138], [1530, 134]], blk, 5);
  // brain side view (left)
  const bx = 420, by = 500;
  g.strokeStyle = blue; g.lineWidth = 10; g.lineJoin = "round"; g.beginPath();
  g.moveTo(bx - 260, by + 60); g.bezierCurveTo(bx - 320, by - 120, bx - 120, by - 250, bx + 40, by - 230);
  g.bezierCurveTo(bx + 230, by - 230, bx + 330, by - 90, bx + 280, by + 60); g.bezierCurveTo(bx + 250, by + 120, bx + 150, by + 120, bx + 90, by + 110);
  g.bezierCurveTo(bx - 20, by + 150, bx - 200, by + 140, bx - 260, by + 60); g.stroke();
  g.lineWidth = 6;
  for (const [x0, y0, x1, y1] of [[-200, -60, -60, -150], [-150, 40, 20, -60], [40, -170, 120, -40], [150, -140, 230, -20], [-60, 70, 160, 40]]) {
    g.beginPath(); g.moveTo(bx + x0, by + y0); g.bezierCurveTo(bx + x0 + 40, by + y0 - 60, bx + x1 - 40, by + y1 + 60, bx + x1, by + y1); g.stroke();
  }
  g.strokeStyle = red; g.lineWidth = 10; g.beginPath(); g.ellipse(bx + 190, by + 150, 110, 62, -0.15, 0, 7); g.stroke();
  g.lineWidth = 4; g.save(); g.beginPath(); g.ellipse(bx + 190, by + 150, 108, 60, -0.15, 0, 7); g.clip();
  for (let k = -12; k < 14; k++) { g.beginPath(); g.moveTo(bx + 80 + k * 18, by + 230); g.lineTo(bx + 160 + k * 18, by + 70); g.stroke(); } g.restore();
  g.strokeStyle = blue; g.lineWidth = 10; g.beginPath(); g.moveTo(bx + 40, by + 120); g.lineTo(bx + 60, by + 330); g.moveTo(bx + 110, by + 130); g.lineTo(bx + 110, by + 330); g.stroke();
  mline(g, [[bx + 300, by + 190], [bx + 400, by + 250]], red, 6);
  hand(g, "CEREBELLUM", bx + 250, by + 300, 54, red, r);
  hand(g, "predicts the touch!", bx + 250, by + 370, 38, red, r);
  // forward model diagram (middle top)
  const fx = 1040, fy = 320;
  const boxH = (x: number, y: number, w: number, s: string, c: string) => { g.strokeStyle = c; g.lineWidth = 6; g.strokeRect(x - w / 2, y - 42, w, 84); hand(g, s, x, y, 36, c, r, "center"); };
  const arrow = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    mline(g, [[x0, y0], [x1, y1]], c, 6); const a = Math.atan2(y1 - y0, x1 - x0);
    g.fillStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - 26 * Math.cos(a - 0.4), y1 - 26 * Math.sin(a - 0.4)); g.lineTo(x1 - 26 * Math.cos(a + 0.4), y1 - 26 * Math.sin(a + 0.4)); g.fill();
  };
  boxH(fx, fy, 260, "MOVE", blk); arrow(fx + 132, fy, fx + 250, fy, blk); boxH(fx + 390, fy, 260, "TOUCH", blk);
  arrow(fx, fy + 44, fx, fy + 160, grn); boxH(fx, fy + 210, 300, "PREDICT", grn);
  arrow(fx + 152, fy + 210, fx + 260, fy + 210, grn); g.strokeStyle = red; g.lineWidth = 6; g.beginPath(); g.arc(fx + 330, fy + 210, 60, 0, 7); g.stroke();
  hand(g, "=", fx + 314, fy + 208, 64, red, r); arrow(fx + 390, fy + 44, fx + 360, fy + 150, blk);
  hand(g, "no surprise = no tickle", fx - 150, fy + 330, 42, blk, r);
  // graph: tickly vs delay (right)
  const gx = 1520, gy = 900, gw = 420, gh = 330;
  mline(g, [[gx, gy - gh - 20], [gx, gy], [gx + gw + 20, gy]], blk, 6);
  hand(g, "TICKLY", gx - 20, gy - gh - 50, 36, blk, r); hand(g, "DELAY (s)", gx + gw - 180, gy + 52, 34, blk, r);
  for (let k = 0; k <= 3; k++) { const x = gx + (k / 3) * gw; mline(g, [[x, gy - 10], [x, gy + 10]], blk, 4); hand(g, ["0", ".1", ".2", ".3"][k], x - 14, gy + 52, 30, blk, r); }
  const pts = [[0, 0.12], [1 / 3, 0.38], [2 / 3, 0.7], [1, 0.92]].map(([u, v]) => [gx + u * gw, gy - v * gh]);
  mline(g, pts, red, 7);
  for (const [x, y] of pts) { g.fillStyle = red; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
  hand(g, "!!", gx + gw - 10, gy - gh - 40, 60, red, r);
  // hand doodle with a feather (bottom middle)
  const hx = 1000, hy = 900;
  g.strokeStyle = blk; g.lineWidth = 6; g.beginPath(); g.ellipse(hx, hy, 90, 70, 0, 0, 7); g.stroke();
  for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(hx - 70 + k * 46, hy - 50); g.lineTo(hx - 80 + k * 50, hy - 160 + Math.abs(k - 1.5) * 20); g.stroke(); }
  g.beginPath(); g.moveTo(hx + 80, hy - 10); g.lineTo(hx + 150, hy - 70); g.stroke();
  g.strokeStyle = "#e08a1a"; g.lineWidth = 6; g.beginPath(); g.moveTo(hx + 230, hy + 10); g.quadraticCurveTo(hx + 140, hy - 40, hx + 50, hy + 20); g.stroke();
  for (let k = 0; k < 8; k++) { const u = k / 8; g.beginPath(); g.moveTo(hx + 230 - u * 160, hy + 10 - Math.sin(u * 3) * 30); g.lineTo(hx + 220 - u * 160, hy - 30 - Math.sin(u * 3) * 30); g.stroke(); }
  hand(g, "SELF  vs  ROBOT", hx - 170, hy + 150, 42, blue, r);
  hand(g, "Expt 3  -  1998", 110, 1120, 36, blk, r);
  for (const [x, y, c] of [[60, 60, "#e8573a"], [1990, 60, "#2a6fd6"], [1990, 1120, "#f2c21e"]] as [number, number, string][]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, 22, 0, 7); g.fill(); }
});
/** green-phosphor CRT text */
const crtTex = () => ctex("tiCRT", 512, 384, (g, r) => {
  g.fillStyle = "#04140a"; g.fillRect(0, 0, 512, 384);
  const lines = ["C:\\TICKLE> RUN EXPT3", "", "SUBJECT ........ 07", "CONDITION ...... ROBOT", "FORCE (N) ...... 0.4", "DELAY (ms) ..... 000", "", "RATING:  1  2  3  4  5", "", "READY"];
  lines.forEach((s, i) => txt(g, s, 26, 30 + i * 34, 23, "#58ff8a", "left", MONO));
  for (let y = 0; y < 384; y += 3) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, y, 512, 1); }
  const v = g.createRadialGradient(256, 192, 120, 256, 192, 330); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.7)"); g.fillStyle = v; g.fillRect(0, 0, 512, 384);
  noise(g, 0, 0, 512, 384, r, 1500, 0.04);
});
/** second CRT: a 16-colour brain scan + bars */
const crt2Tex = () => ctex("tiCRT2", 512, 384, (g) => {
  g.fillStyle = "#000a40"; g.fillRect(0, 0, 512, 384);
  g.fillStyle = "#c0c0c0"; g.fillRect(0, 0, 512, 34); txt(g, "SCAN.EXE   File  View  Help", 14, 17, 20, "#000", "left", MONO);
  g.fillStyle = "#ff55ff"; g.beginPath(); g.ellipse(170, 200, 120, 95, 0, 0, 7); g.fill();
  g.fillStyle = "#55ffff"; g.beginPath(); g.ellipse(160, 195, 90, 70, 0, 0, 7); g.fill();
  g.fillStyle = "#ffff55"; g.beginPath(); g.ellipse(230, 260, 40, 26, 0, 0, 7); g.fill();
  g.fillStyle = "#ff5555"; g.beginPath(); g.ellipse(230, 260, 20, 12, 0, 0, 7); g.fill();
  for (let k = 0; k < 5; k++) { g.fillStyle = ["#55ff55", "#ffff55", "#ff5555", "#55ffff", "#ff55ff"][k]; const h = 40 + k * 38; g.fillRect(330 + k * 32, 340 - h, 24, h); }
  for (let y = 0; y < 384; y += 3) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y, 512, 1); }
});
/** London through the blinds: a brick terrace opposite, a red bus, warm low sun at the left */
const streetTex = () => ctex("tiStreet", 1024, 1024, (g, r) => {
  const s = g.createLinearGradient(0, 0, 0, 700); s.addColorStop(0, "#8fb0d8"); s.addColorStop(0.6, "#f2d0a8"); s.addColorStop(1, "#ffe0b0");
  g.fillStyle = s; g.fillRect(0, 0, 1024, 1024);
  const sun = g.createRadialGradient(80, 420, 0, 80, 420, 420); sun.addColorStop(0, "rgba(255,250,225,1)"); sun.addColorStop(0.15, "rgba(255,228,170,0.7)"); sun.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 4; k++) {
    const x = k * 280 - 40, top = 560 + (k % 2) * 40;
    g.fillStyle = ["#b0603f", "#c4774f", "#a85a3f", "#bc6a48"][k]; g.fillRect(x, top, 280, 900);
    g.fillStyle = "#f0e6d2"; g.fillRect(x, top, 280, 18); g.fillRect(x, top + 330, 280, 10);
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const wx = x + 30 + i * 85, wy = top + 60 + j * 150; g.fillStyle = "#f0e6d2"; g.fillRect(wx - 6, wy - 6, 62, 112);
      g.fillStyle = r() < 0.3 ? "#ffd890" : "#3a4a66"; g.fillRect(wx, wy, 50, 100); g.fillStyle = "#f0e6d2"; g.fillRect(wx, wy + 48, 50, 4); g.fillRect(wx + 23, wy, 4, 100);
    }
    g.fillStyle = "rgba(255,200,140,0.3)"; g.fillRect(x, top, 30, 900);
    g.fillStyle = "#8a4a36"; g.fillRect(x + 180, top - 70, 56, 70); g.fillStyle = "#e9d2b0"; g.fillRect(x + 176, top - 76, 64, 10);
    g.fillStyle = "#c86a3a"; for (let q = 0; q < 3; q++) g.fillRect(x + 182 + q * 18, top - 96, 13, 22);
  }
  g.fillStyle = "#4f7a44"; for (let q = 0; q < 9; q++) { g.beginPath(); g.arc(900 + (r() - 0.5) * 160, 600 + (r() - 0.5) * 120, 70 + r() * 40, 0, 7); g.fill(); }
});
/** binder spines (one binder = one 64 px column) */
const binderTex = () => ctex("tiBinders", 1024, 512, (g, r) => {
  const cols = ["#2a4a8a", "#c8302a", "#2f7a4a", "#e8b83a", "#5a5a66", "#1f6a8a", "#8a3a6a", "#d86a2a"];
  const labels = ["DATA 97", "DATA 98", "SUBJECTS", "EXPT 1", "EXPT 2", "EXPT 3", "PAPERS", "GRANTS"];
  for (let i = 0; i < 16; i++) {
    const x = i * 64; g.fillStyle = cols[i % 8]; g.fillRect(x, 0, 64, 512);
    g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(x + 4, 0, 6, 512); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + 58, 0, 6, 512);
    g.fillStyle = "#f6f0e0"; g.fillRect(x + 12, 70, 40, 170);
    g.save(); g.translate(x + 32, 155); g.rotate(-Math.PI / 2); txt(g, labels[(i + Math.floor(r() * 3)) % 8], 0, 0, 19, "#222"); g.restore();
    g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(x + 32, 400, 11, 0, 7); g.fill(); g.fillStyle = cols[i % 8]; g.beginPath(); g.arc(x + 32, 400, 5, 0, 7); g.fill();
  }
});
/** posters + notices for the LAB: 0 neuron poster, 1 1998 calendar, 2 "QUIET PLEASE", 3 notice board */
const labPosterTex = (kind: number) => ctex("tiLabPoster" + kind, 512, 704, (g, r) => {
  g.fillStyle = "#fbf8ee"; g.fillRect(0, 0, 512, 704);
  if (kind === 0) {
    g.fillStyle = "#14285a"; g.fillRect(0, 0, 512, 704);
    txt(g, "THE NEURON", 256, 70, 54, "#f6e6a0");
    g.strokeStyle = "#ffb0d0"; g.lineWidth = 12; g.lineCap = "round";
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.moveTo(256, 300); g.quadraticCurveTo(256 + Math.cos(a) * 80, 300 + Math.sin(a) * 60, 256 + Math.cos(a + 0.3) * 150, 300 + Math.sin(a + 0.3) * 120); g.stroke(); }
    g.fillStyle = "#ff7ab0"; g.beginPath(); g.arc(256, 300, 60, 0, 7); g.fill(); g.fillStyle = "#ffe0ec"; g.beginPath(); g.arc(246, 290, 22, 0, 7); g.fill();
    g.strokeStyle = "#ffb0d0"; g.lineWidth = 14; g.beginPath(); g.moveTo(256, 360); g.bezierCurveTo(240, 460, 300, 520, 270, 620); g.stroke();
    g.fillStyle = "#f6e6a0"; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(250 + Math.sin(k) * 14, 400 + k * 46, 24, 12, 0.2, 0, 7); g.fill(); }
  } else if (kind === 1) {
    g.fillStyle = "#3a7ab8"; g.fillRect(0, 0, 512, 300);
    g.fillStyle = "#f6e6c8"; g.beginPath(); g.moveTo(60, 300); g.lineTo(150, 120); g.lineTo(240, 300); g.fill(); g.fillStyle = "#2f7a4a"; g.fillRect(0, 240, 512, 60);
    g.fillStyle = "#c8302a"; g.fillRect(320, 150, 120, 100); g.fillStyle = "#2a2a2a"; for (const x of [345, 415]) { g.beginPath(); g.arc(x, 250, 16, 0, 7); g.fill(); }
    txt(g, "MARCH  1998", 256, 345, 46, "#c8302a");
    for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) {
      g.strokeStyle = "#bbb"; g.lineWidth = 2; g.strokeRect(36 + i * 63, 385 + j * 60, 63, 60);
      const d = j * 7 + i; if (d < 31) txt(g, String(d + 1), 52 + i * 63, 400 + j * 60, 18, "#555");
    }
    g.strokeStyle = "#d0302a"; g.lineWidth = 5; g.beginPath(); g.arc(36 + 3 * 63 + 31, 385 + 2 * 60 + 30, 28, 0, 7); g.stroke();
  } else if (kind === 2) {
    g.fillStyle = "#f2c21e"; g.fillRect(0, 0, 512, 704);
    g.fillStyle = "#1a1a1a"; g.fillRect(24, 24, 464, 656); g.fillStyle = "#f2c21e"; g.fillRect(36, 36, 440, 632);
    txt(g, "QUIET", 256, 170, 96, "#1a1a1a"); txt(g, "PLEASE", 256, 280, 84, "#1a1a1a");
    txt(g, "EXPERIMENT", 256, 440, 52, "#c8302a"); txt(g, "IN PROGRESS", 256, 510, 52, "#c8302a");
    g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(256, 600, 34, 0, 7); g.fill(); g.fillStyle = "#f2c21e"; g.fillRect(224, 594, 64, 12);
  } else {
    g.fillStyle = "#b98a5a"; g.fillRect(0, 0, 512, 704);
    for (let k = 0; k < 400; k++) { g.fillStyle = "rgba(80,50,20,0.25)"; g.fillRect(r() * 512, r() * 704, 3, 3); }
    const papers = [[40, 40, 200, 260, "#ffffff"], [270, 60, 200, 150, "#fff59a"], [260, 240, 220, 280, "#ffffff"], [50, 330, 180, 200, "#bfe6ff"], [80, 560, 340, 110, "#ffd0e0"]] as [number, number, number, number, string][];
    for (const [x, y, w, h, c] of papers) {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.12); g.fillStyle = "rgba(0,0,0,0.2)"; g.fillRect(-w / 2 + 6, -h / 2 + 6, w, h);
      g.fillStyle = c; g.fillRect(-w / 2, -h / 2, w, h); g.fillStyle = "#666"; for (let q = 0; q < Math.floor(h / 30); q++) g.fillRect(-w / 2 + 16, -h / 2 + 24 + q * 26, w * (0.4 + r() * 0.45), 6);
      g.fillStyle = ["#d0302a", "#2a6fd6", "#2fa060"][Math.floor(r() * 3)]; g.beginPath(); g.arc(0, -h / 2 + 10, 9, 0, 7); g.fill(); g.restore();
    }
    txt(g, "SEMINAR FRI 4PM", 250, 615, 30, "#222");
  }
  noise(g, 0, 0, 512, 704, r, 3000, 0.035);
});
const signTex = () => ctex("tiLabSign", 1024, 160, (g) => {
  g.fillStyle = "#1c2f5a"; g.fillRect(0, 0, 1024, 160); g.strokeStyle = "#e8e2c8"; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 140);
  txt(g, "MOTOR CONTROL LAB  ·  ROOM 3.07", 512, 82, 44, "#f2ecd6");
});
const clockTex = () => ctex("tiClock", 512, 512, (g) => {
  g.fillStyle = "#fbfaf4"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2, l = k % 5 ? 14 : 34; g.strokeStyle = "#1a1a1a"; g.lineWidth = k % 5 ? 4 : 10; g.beginPath(); g.moveTo(256 + Math.cos(a) * (226 - l), 256 + Math.sin(a) * (226 - l)); g.lineTo(256 + Math.cos(a) * 226, 256 + Math.sin(a) * 226); g.stroke(); }
});
const kbTex = () => ctex("tiKeys", 512, 192, (g) => {
  g.fillStyle = "#d8d0bc"; g.fillRect(0, 0, 512, 192);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 15; i++) { g.fillStyle = "#eee8d8"; g.fillRect(12 + i * 33, 14 + j * 34, 28, 28); g.fillStyle = "rgba(0,0,0,0.15)"; g.fillRect(12 + i * 33, 38 + j * 34, 28, 4); }
});
const paperTex = () => ctex("tiPaper", 256, 320, (g, r) => { g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#888"; for (let k = 0; k < 9; k++) g.fillRect(24, 30 + k * 30, 120 + r() * 90, 6); });

// ============================================================ look mixing (the rigs follow SHOTS + LOOK_RAMPS)
const lookW = (id: number, f: number): Partial<Record<Look, number>> => {
  const s = SHOTS[id - 1];
  const cands = LOOK_RAMPS.filter((r) => s.place === r[4] && (s.look === r[0] || s.look === r[1]) && s.a <= r[3] && r[2] <= s.b);
  if (!cands.length) return { [s.look]: 1 };
  let rp = cands[0];
  for (const c of cands) if (f >= c[2]) rp = c;
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

// ============================================================ the HOME living room
const HX = 3.2, HZ = -1.4, HY = 2.75, HZF = 5.5;
const HWIN = { x0: -2.5, x1: -0.6, y0: 0.5, y1: 2.25 };
const CHAIR = { x: -1.6, z: -0.3, yaw: 0.18 };
type HomeRig = { au: C3; ad: C3; sun: C3; lamp: C3; lampEm: C3; bounce: C3; win: C3; fill: C3; warm: C3; view: number; haze: number; hazeC: C3; motes: number; tv: number };
const HOME_RIGS: Partial<Record<Look, HomeRig>> = {
  morning: { au: [0.26, 0.3, 0.46], ad: [0.24, 0.16, 0.12], sun: [3.5, 2.15, 1.0], lamp: [0.9, 0.55, 0.24], lampEm: [2.6, 1.7, 0.8], bounce: [0.42, 0.25, 0.11], win: [0.45, 0.38, 0.36], fill: [0.22, 0.24, 0.36], warm: [0.3, 0.17, 0.08], view: 1.02, haze: 0.22, hazeC: [1.0, 0.7, 0.38], motes: 1.3, tv: 1 },
  xray: { au: [0.045, 0.085, 0.2], ad: [0.02, 0.035, 0.085], sun: [0.3, 0.6, 1.3], lamp: [0, 0, 0], lampEm: [0.1, 0.16, 0.3], bounce: [0.03, 0.08, 0.2], win: [0.06, 0.16, 0.42], fill: [0.05, 0.09, 0.22], warm: [0, 0, 0], view: 0.2, haze: 0.12, hazeC: [0.3, 0.65, 1.2], motes: 0.8, tv: 0.3 },
};
class Home {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  lampMat: THREE.ShaderMaterial; viewMat: THREE.ShaderMaterial; tvMat: THREE.ShaderMaterial; glass: THREE.MeshBasicMaterial;
  haze: Haze; motes: Motes;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...HOME);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat(); // fu = furniture (casts world shadows)
    const floor = imat(S, { map: herringTex(), rep: [1 / 0.6, 1 / 0.6], rot: Math.PI / 4, spec: 26, specK: 0.22 });
    const plaster = imat(S, { map: plasterTex(), rep: [1 / 1.2, 1 / 1.2] }), boards = imat(S, { map: boardsTex(), rep: [1, 1] });
    const paint = imat(S, { spec: 30, specK: 0.15 }); // vertex coloured painted wood / trims
    const ceilM = imat(S, { col: "#f6ead8" });
    const plain = imat(S, {}); // vertex coloured matte
    const gloss = imat(S, { spec: 50, specK: 0.45 }); // vertex coloured glossy (ceramics, metal, lacquer)
    const TRIM = "#f8efe0", WOOD = "#9a5a2e", WOODD = "#6a3a1c", BRASS = "#d9a640", MUST = "#e0a12a";
    const DY = 0.92;
    // ---- floor (herringbone) ----
    b.add(flat(-HX, HZ, HX, HZF, 0), floor);
    // ---- walls: teal boards below, apricot plaster above ----
    const holes = [[HWIN.x0, HWIN.x1, HWIN.y0, HWIN.y1]];
    b.add(wallZ(-HX, HX, 0, DY, HZ, holes), boards); b.add(wallZ(-HX, HX, DY, HY, HZ, holes), plaster);
    bn.add(wallX(-HX, HZ, HZF, 0, DY), boards); bn.add(wallX(-HX, HZ, HZF, DY, HY), plaster);
    bp.add(wallX(HX, HZ, HZF, 0, DY), boards); bp.add(wallX(HX, HZ, HZF, DY, HY), plaster);
    bc.add(flat(-HX, HZ, HX, HZF, HY), ceilM);
    // skirting (dark teal, proud), dado rail (cream), picture rail + cornice
    b.box(paint, -HX, 0, HZ, HX, 0.12, HZ + 0.025, undefined, "#1d4c4b");
    for (const [a, c] of [[-HX, HWIN.x0 - 0.1], [HWIN.x1 + 0.1, HX]]) b.box(paint, a, DY - 0.015, HZ, c, DY + 0.035, HZ + 0.035, undefined, TRIM);
    b.box(paint, -HX, 2.33, HZ, HX, 2.36, HZ + 0.025, undefined, TRIM);
    b.box(paint, -HX, HY - 0.1, HZ, HX, HY, HZ + 0.07, undefined, TRIM);
    for (const [bb, x, s] of [[bn, -HX, 1], [bp, HX, -1]] as [Bat, number, number][]) {
      bb.box(paint, x, 0, HZ, x + s * 0.025, 0.12, HZF, undefined, "#1d4c4b"); bb.box(paint, x, DY - 0.015, HZ, x + s * 0.035, DY + 0.035, HZF, undefined, TRIM);
      bb.box(paint, x, 2.33, HZ, x + s * 0.025, 2.36, HZF, undefined, TRIM); bb.box(paint, x, HY - 0.1, HZ, x + s * 0.07, HY, HZF, undefined, TRIM);
    }
    // ---- the BIG WINDOW: deep reveal, 3 x 4 sash bars (= the sun aperture), sill with plants, radiator, velvet curtains ----
    {
      const { x0, x1, y0, y1 } = HWIN, D = 0.26, fw = 0.07;
      b.box(plaster, x0 - 0.002, y0, HZ - D, x0, y1, HZ); b.box(plaster, x1, y0, HZ - D, x1 + 0.002, y1, HZ);
      b.box(plaster, x0, y1, HZ - D, x1, y1 + 0.002, HZ);
      for (const [a, c, d, e] of [[x0 - fw, x0, y0 - 0.02, y1 + fw], [x1, x1 + fw, y0 - 0.02, y1 + fw], [x0 - fw, x1 + fw, y1, y1 + fw]]) b.box(paint, a, d, HZ, c, e, HZ + 0.03, undefined, TRIM);
      const zb = HZ - 0.18;
      for (const [a, c, d, e] of [[x0, x0 + 0.05, y0, y1], [x1 - 0.05, x1, y0, y1], [x0, x1, y1 - 0.05, y1], [x0, x1, y0, y0 + 0.05]]) b.box(paint, a, d, zb - 0.03, c, e, zb + 0.03, undefined, TRIM);
      for (const k of [1, 2]) { const x = x0 + ((x1 - x0) * k) / 3; b.box(paint, x - 0.018, y0 + 0.05, zb - 0.02, x + 0.018, y1 - 0.05, zb + 0.02, undefined, TRIM); }
      for (const k of [1, 2, 3]) { const y = y0 + ((y1 - y0) * k) / 4, th = k === 2 ? 0.03 : 0.018; b.box(paint, x0 + 0.05, y - th, zb - 0.025, x1 - 0.05, y + th, zb + (k === 2 ? 0.035 : 0.022), undefined, TRIM); }
      fu.box(paint, x0 - 0.14, y0 - 0.06, HZ - D, x1 + 0.14, y0, HZ + 0.12, undefined, TRIM);
      const pot = (x: number, h: number, r0: number, col: string) => fu.lathe(gloss, [[0.001, 0], [r0 * 0.75, 0], [r0, h * 0.92], [r0 * 1.08, h], [r0 * 0.95, h], [0.001, h * 0.9]], TRS(x, y0 + 0.001, HZ - 0.05), 24, col);
      pot(x0 + 0.25, 0.14, 0.075, "#f4e8d2"); pot(x0 + 0.62, 0.1, 0.055, "#c2563a"); pot(x1 - 0.3, 0.12, 0.07, "#2f6f6a");
      const r = rng(11);
      for (let k = 0; k < 9; k++) { // pothos vines spill over the sill
        const a = (k / 9) * Math.PI * 2, L = 0.25 + r() * 0.35, p0 = V3(x0 + 0.25, y0 + 0.14, HZ - 0.05);
        const pts = [p0, V3(p0.x + Math.cos(a) * 0.1, p0.y + 0.05, p0.z + Math.sin(a) * 0.06 + 0.04), V3(p0.x + Math.cos(a) * 0.16, y0 - 0.02, HZ + 0.15), V3(p0.x + Math.cos(a) * 0.2, y0 - L, HZ + 0.17)];
        fu.tube(plain, pts, 0.005, 16, "#3f7a3a", 5);
        const cv = new THREE.CatmullRomCurve3(pts);
        for (let q = 1; q < 6; q++) { const P = cv.getPoint(q / 6); fu.sph(gloss, TRS(P.x + 0.02 * (q % 2 ? 1 : -1), P.y, P.z + 0.015, a, 0.4, q % 2 ? 0.5 : -0.5, [0.035, 0.006, 0.028]), 10, q % 3 ? "#4f9a42" : "#7ab84a"); }
      }
      fu.cyl(gloss, 0.03, 0.035, 0.16, 12, TRS(x0 + 0.62, y0 + 0.17, HZ - 0.05), "#4f8a4a"); fu.sph(gloss, TRS(x0 + 0.62, y0 + 0.25, HZ - 0.05, 0, 0, 0, 0.03), 12, "#4f8a4a");
      fu.cyl(gloss, 0.016, 0.018, 0.07, 10, TRS(x0 + 0.66, y0 + 0.2, HZ - 0.05, 0, 0, -0.9), "#4f8a4a"); fu.sph(gloss, TRS(x0 + 0.62, y0 + 0.285, HZ - 0.05, 0, 0, 0, 0.012), 8, "#f27a9a");
      for (let k = 0; k < 14; k++) { const a = r() * 6.28, h = 0.08 + r() * 0.08; fu.sph(plain, TRS(x1 - 0.3 + Math.cos(a) * 0.04, y0 + 0.12 + h, HZ - 0.05 + Math.sin(a) * 0.04, a, 0, 0, [0.03, 0.022, 0.03]), 8, k % 2 ? "#5aa04a" : "#79b858"); }
      for (let k = 0; k < 18; k++) fu.rbox(gloss, 0.06, 0.42, 0.08, 0.025, TRS(x0 + 0.2 + k * 0.09, 0.3, HZ + 0.075), "#f2ece0");
      fu.rod(gloss, V3(x0 + 0.17, 0.12, HZ + 0.075), V3(x0 + 0.17, 0.02, HZ + 0.075), 0.012, 8, BRASS);
      fu.rod(gloss, V3(x0 - 0.5, 2.46, HZ + 0.12), V3(x1 + 0.5, 2.46, HZ + 0.12), 0.018, 12, BRASS);
      for (const x of [x0 - 0.52, x1 + 0.52]) fu.sph(gloss, TRS(x, 2.46, HZ + 0.12, 0, 0, 0, 0.04), 12, BRASS);
      for (const x of [x0 - 0.45, x1 + 0.45]) fu.rod(gloss, V3(x, 2.46, HZ + 0.12), V3(x, 2.46, HZ + 0.005), 0.01, 8, BRASS);
      for (const [x, s] of [[x0 - 0.22, -1], [x1 + 0.22, 1]] as [number, number][]) {
        for (let k = 0; k < 6; k++) {
          const dx = (k - 2.5) * 0.05, zz = HZ + 0.1 + (k % 2) * 0.03;
          fu.tube(plain, [V3(x + dx * 1.5, 2.44, zz), V3(x + dx * 1.2, 1.9, zz + 0.01), V3(x + dx * 0.45 + s * 0.02, 1.15, HZ + 0.14), V3(x + dx * 1.1 + s * 0.05, 0.6, zz + 0.02), V3(x + dx * 1.6 + s * 0.07, 0.03, zz + 0.03)], 0.034, 28, k % 2 ? MUST : "#cf8e1e", 10);
        }
        fu.torus(gloss, 0.075, 0.012, TRS(x + s * 0.02, 1.15, HZ + 0.14, 0, Math.PI / 2), "#c2563a");
      }
      this.viewMat = imat(S, { map: roofsTex(), emap: true, em: [1.2, 1.2, 1.2] });
      const card = solo(new THREE.PlaneGeometry(5.2, 5.2), this.viewMat); card.position.set((x0 + x1) / 2 - 0.4, 1.5, HZ - 2.0); card.layers.set(NOINK); R.add(card);
      this.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.05, 0.045, 0.04), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), this.glass); gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, zb - 0.035); gl.layers.set(NOINK); gl.renderOrder = 4; gl.frustumCulled = false; R.add(gl);
    }
    // ---- the ARMCHAIR (squashy, rust-red, button back, rolled arms) ----
    {
      const CM = TRS(CHAIR.x, 0, CHAIR.z, CHAIR.yaw);
      const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => TRS(x, y, z, ry, rx, rz, s).premultiply(CM);
      const RED = "#c4482e", REDD = "#a63a24";
      fu.rbox(plain, 0.86, 0.3, 0.8, 0.1, M(0, 0.25, -0.02), REDD, 4);
      fu.rbox(plain, 0.6, 0.15, 0.62, 0.07, M(0, 0.395, 0.06), RED, 4);
      fu.rbox(plain, 0.8, 0.66, 0.24, 0.12, M(0, 0.68, -0.32, 0, -0.14), RED, 4);
      for (const s of [-1, 1]) {
        fu.rbox(plain, 0.18, 0.34, 0.78, 0.09, M(s * 0.38, 0.5, 0.0), RED, 4);
        fu.cyl(plain, 0.09, 0.09, 0.8, 20, M(s * 0.38, 0.62, 0.0, 0, Math.PI / 2), REDD);
      }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) fu.sph(gloss, M(-0.2 + i * 0.2, 0.62 + j * 0.2, -0.185 - j * 0.028, 0, 0, 0, 0.018), 8, "#7a2414");
      for (const [x, z] of [[-0.36, 0.3], [0.36, 0.3], [-0.36, -0.34], [0.36, -0.34]]) fu.lathe(gloss, [[0.001, 0], [0.022, 0], [0.03, 0.08], [0.035, 0.1], [0.001, 0.1]], M(x, 0, z), 12, WOODD);
      fu.rbox(plain, 0.26, 0.04, 0.6, 0.02, M(0.4, 0.715, 0.02, 0, 0, 0.15), "#f2d6a0");
      fu.rbox(plain, 0.04, 0.3, 0.5, 0.02, M(0.5, 0.56, 0.05), "#f2d6a0");
      for (let k = 0; k < 5; k++) fu.box(plain, 0.515, 0.42, -0.18 + k * 0.1, 0.522, 0.7, -0.15 + k * 0.1, M(0, 0, 0), "#e2b870");
      fu.rbox(plain, 0.36, 0.3, 0.12, 0.06, M(-0.12, 0.62, -0.15, 0.2, -0.25, 0.08), "#2f6f6a", 3);
    }
    // ---- a little round side table with a mug + books, and the floor lamp ----
    {
      const sx = -2.42, sz = -0.45;
      fu.cyl(gloss, 0.2, 0.2, 0.03, 32, TRS(sx, 0.55, sz), WOOD); fu.cyl(gloss, 0.025, 0.03, 0.52, 12, TRS(sx, 0.27, sz), WOODD);
      fu.cyl(gloss, 0.14, 0.16, 0.025, 24, TRS(sx, 0.012, sz), WOODD);
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.045, 0.09], [0.04, 0.09], [0.001, 0.08]], TRS(sx + 0.06, 0.565, sz + 0.06), 18, "#f6f0e2");
      fu.torus(gloss, 0.025, 0.007, TRS(sx + 0.108, 0.615, sz + 0.06), "#f6f0e2");
      fu.cyl(plain, 0.038, 0.038, 0.004, 18, TRS(sx + 0.06, 0.645, sz + 0.06), "#6a3a1c");
      fu.rbox(plain, 0.2, 0.035, 0.14, 0.006, TRS(sx - 0.06, 0.583, sz - 0.04, 0.3), "#2a6fb0"); fu.rbox(plain, 0.18, 0.03, 0.13, 0.006, TRS(sx - 0.06, 0.615, sz - 0.04, 0.1), "#e8b83a");
      const lx = -2.62, lz = 0.12;
      fu.cyl(gloss, 0.15, 0.17, 0.035, 28, TRS(lx, 0.018, lz), "#2a2a30");
      fu.rod(gloss, V3(lx, 0.03, lz), V3(lx, 1.5, lz), 0.014, 10, BRASS);
      this.lampMat = imat(S, { col: "#f6dca8", em: [2.6, 1.7, 0.8] });
      fu.lathe(this.lampMat, [[0.21, 0], [0.205, 0.008], [0.16, 0.3], [0.155, 0.308]], TRS(lx, 1.45, lz), 36);
      fu.torus(gloss, 0.208, 0.008, TRS(lx, 1.45, lz, 0, Math.PI / 2), BRASS); fu.torus(gloss, 0.158, 0.007, TRS(lx, 1.758, lz, 0, Math.PI / 2), BRASS);
    }
    // ---- corner monstera (back-left) ----
    {
      const px = -2.85, pz = -1.0;
      fu.lathe(gloss, [[0.001, 0], [0.15, 0], [0.19, 0.38], [0.21, 0.4], [0.21, 0.44], [0.18, 0.44], [0.001, 0.42]], TRS(px, 0.001, pz), 30, "#f2ece0");
      for (let k = 0; k < 3; k++) fu.torus(gloss, 0.165 + k * 0.012, 0.006, TRS(px, 0.12 + k * 0.1, pz, 0, Math.PI / 2), "#2f6f6a");
      const r = rng(23);
      for (let k = 0; k < 13; k++) {
        const a = (k / 13) * Math.PI * 2 + r() * 0.5, h = 0.8 + r() * 1.0, o = 0.15 + r() * 0.35;
        const tip = V3(px + Math.cos(a) * o, h, pz + Math.sin(a) * o * 0.8);
        tip.z = Math.max(tip.z, HZ + 0.2); tip.x = Math.max(tip.x, -HX + 0.22);
        fu.tube(plain, [V3(px, 0.42, pz), V3(px + Math.cos(a) * o * 0.4, (0.42 + h) / 2 + 0.1, pz + Math.sin(a) * o * 0.3), tip], 0.008, 12, "#4a7a32", 5);
        for (const s of [-1, 1]) fu.sph(gloss, TRS(tip.x + Math.cos(a) * 0.12, tip.y + 0.02, tip.z + Math.sin(a) * 0.1, -a + s * 0.3, 0, -0.3 - r() * 0.3, [0.17, 0.012, 0.1]), 16, k % 3 ? "#2f7a3e" : "#3f9a4a");
      }
    }
    // ---- framed prints ----
    const frame = (bb: Bat, M: THREE.Matrix4, w: number, h: number, kind: number, col = "#2f2620") => {
      const f = 0.04, mm = 0.05;
      bb.box(gloss, -w / 2 - f, -h / 2 - f, 0.001, w / 2 + f, -h / 2, 0.035, M, col); bb.box(gloss, -w / 2 - f, h / 2, 0.001, w / 2 + f, h / 2 + f, 0.035, M, col);
      bb.box(gloss, -w / 2 - f, -h / 2, 0.001, -w / 2, h / 2, 0.035, M, col); bb.box(gloss, w / 2, -h / 2, 0.001, w / 2 + f, h / 2, 0.035, M, col);
      bb.box(plain, -w / 2, -h / 2, 0.004, w / 2, h / 2, 0.012, M, "#faf4e6");
      bb.add(new THREE.PlaneGeometry(w - 2 * mm, h - 2 * mm).translate(0, 0, 0.016), imat(S, { map: printTex(kind) }), M);
    };
    // behind BEAN: a gallery of 3
    frame(fu, TRS(0.12, 1.78, HZ), 0.46, 0.58, 4, "#c99a3a");
    frame(fu, TRS(0.52, 1.98, HZ), 0.2, 0.25, 0, "#1d1d22");
    frame(fu, TRS(0.52, 1.62, HZ), 0.2, 0.25, 3, "#f6f0e2");
    // ---- TV cabinet (mid-century, teal + mustard doors, peg legs) with a boxy TV, records, a plant ----
    {
      const x0 = 0.7, x1 = 2.0, z0 = HZ + 0.02, z1 = HZ + 0.45, y0 = 0.16, y1 = 0.56;
      fu.rbox(gloss, x1 - x0, y1 - y0, z1 - z0, 0.02, TRS((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), WOOD);
      for (let k = 0; k < 3; k++) { const cx = x0 + 0.03 + (k + 0.5) * ((x1 - x0 - 0.06) / 3); fu.rbox(gloss, (x1 - x0 - 0.06) / 3 - 0.02, y1 - y0 - 0.08, 0.02, 0.01, TRS(cx, (y0 + y1) / 2, z1 + 0.005), k === 1 ? "#e0a12a" : "#2f6f6a"); fu.cyl(gloss, 0.012, 0.012, 0.03, 10, TRS(cx, (y0 + y1) / 2 + 0.06, z1 + 0.025, 0, Math.PI / 2), BRASS); }
      for (const [x, z] of [[x0 + 0.08, z0 + 0.06], [x1 - 0.08, z0 + 0.06], [x0 + 0.08, z1 - 0.06], [x1 - 0.08, z1 - 0.06]]) fu.cyl(gloss, 0.018, 0.012, 0.16, 10, TRS(x, 0.08, z), WOODD);
      const tx = 1.25, tz = HZ + 0.24;
      fu.rbox(gloss, 0.62, 0.44, 0.36, 0.06, TRS(tx, y1 + 0.235, tz), "#e9e2d0", 3);
      fu.rbox(gloss, 0.52, 0.36, 0.02, 0.03, TRS(tx - 0.03, y1 + 0.235, tz + 0.172), "#3a3a40");
      this.tvMat = imat(S, { map: tvTex(), emap: true, em: [1, 1, 1] });
      fu.add(bulge(0.46, 0.31, 0.012).translate(0, 0, 0.002), this.tvMat, TRS(tx - 0.03, y1 + 0.235, tz + 0.183));
      for (let k = 0; k < 2; k++) fu.cyl(gloss, 0.016, 0.016, 0.02, 12, TRS(tx + 0.26, y1 + 0.3 - k * 0.07, tz + 0.18, 0, Math.PI / 2), "#c2563a");
      fu.rod(gloss, V3(tx + 0.1, y1 + 0.46, tz - 0.05), V3(tx + 0.28, y1 + 0.75, tz - 0.1), 0.004, 6, "#9a9aa0"); fu.rod(gloss, V3(tx + 0.06, y1 + 0.46, tz - 0.05), V3(tx - 0.12, y1 + 0.78, tz - 0.08), 0.004, 6, "#9a9aa0");
      for (let k = 0; k < 5; k++) fu.box(plain, 1.68, y1 + 0.001 + k * 0.012, HZ + 0.1, 1.98, y1 + 0.011 + k * 0.012, HZ + 0.4, TRS(k * 0.004, 0, 0, 0), ["#e9573a", "#1a1a1a", "#2a6fb0", "#f2c21e", "#2f7a4a"][k]);
      fu.lathe(gloss, [[0.001, 0], [0.05, 0], [0.06, 0.11], [0.001, 0.11]], TRS(1.83, y1 + 0.062, HZ + 0.25), 18, "#c2563a");
      for (let k = 0; k < 7; k++) fu.sph(gloss, TRS(1.83 + Math.cos(k) * 0.05, y1 + 0.2 + (k % 3) * 0.05, HZ + 0.25 + Math.sin(k) * 0.05, k, 0.3, 0.4, [0.06, 0.008, 0.035]), 10, "#4f9a42");
      fu.rbox(gloss, 0.16, 0.26, 0.16, 0.02, TRS(0.85, y1 + 0.13, HZ + 0.22), WOODD); fu.cyl(plain, 0.05, 0.05, 0.01, 18, TRS(0.85, y1 + 0.16, HZ + 0.3, 0, Math.PI / 2), "#2a2a2a");
      frame(fu, TRS(1.0, 1.65, HZ), 0.44, 0.54, 1, "#f6f0e2");
      frame(fu, TRS(1.62, 1.72, HZ), 0.5, 0.62, 5, "#1d1d22");
    }
    // ---- CAT BED (plush donut) + a ball of yarn + a toy mouse ----
    {
      const cx = 1.35, cz = -0.55;
      fu.torus(plain, 0.22, 0.085, TRS(cx, 0.085, cz, 0, Math.PI / 2), "#e8a0a0");
      fu.cyl(plain, 0.22, 0.22, 0.05, 32, TRS(cx, 0.03, cz), "#f2d8c8");
      fu.sph(plain, TRS(cx + 0.33, 0.055, cz + 0.2, 0, 0, 0, 0.055), 14, "#3a8ad0");
      fu.tube(plain, [V3(cx + 0.33, 0.06, cz + 0.25), V3(cx + 0.45, 0.006, cz + 0.4), V3(cx + 0.3, 0.006, cz + 0.6), V3(cx + 0.5, 0.006, cz + 0.75)], 0.004, 20, "#3a8ad0", 5);
      fu.sph(plain, TRS(cx - 0.05, 0.075, cz + 0.02, 0.6, 0, 0, [0.05, 0.03, 0.035]), 12, "#9a9aa6");
    }
    // ---- BOOKSHELF (back-right corner) ----
    {
      const x0 = 2.15, x1 = 3.15, z0 = HZ + 0.005, z1 = HZ + 0.34, top = 2.2;
      fu.box(gloss, x0, 0, z0, x0 + 0.03, top, z1, undefined, TRIM); fu.box(gloss, x1 - 0.03, 0, z0, x1, top, z1, undefined, TRIM);
      fu.box(gloss, x0, top - 0.03, z0, x1, top, z1, undefined, TRIM); fu.box(plain, x0 + 0.03, 0.05, z0, x1 - 0.03, top - 0.03, z0 + 0.01, undefined, "#2f6f6a");
      const shelves = [0.05, 0.47, 0.88, 1.3, 1.72];
      for (const y of shelves) fu.box(gloss, x0 + 0.03, y, z0 + 0.01, x1 - 0.03, y + 0.025, z1, undefined, TRIM);
      const r = rng(77), cols = ["#c2563a", "#e0a12a", "#2f6f6a", "#2a5a9a", "#f2e6c8", "#7a3a5a", "#3f8a4a", "#1d1d22", "#e9573a", "#88aacc"];
      shelves.slice(0, 4).forEach((y, si) => {
        let x = x0 + 0.05; const end = x1 - 0.05;
        while (x < end - 0.03) {
          if (r() < 0.12 && si !== 1) {
            const w = 0.14;
            if (x + w > end) break;
            if (r() < 0.5) { fu.lathe(gloss, [[0.001, 0], [0.045, 0], [0.055, 0.1], [0.001, 0.1]], TRS(x + w / 2, y + 0.026, (z0 + z1) / 2), 16, "#f4e8d2"); for (let k = 0; k < 5; k++) fu.sph(gloss, TRS(x + w / 2 + Math.cos(k * 1.3) * 0.04, y + 0.17 + (k % 2) * 0.05, (z0 + z1) / 2 + Math.sin(k * 1.3) * 0.04, k, 0.3, 0.5, [0.05, 0.008, 0.03]), 10, "#4f9a42"); }
            else fu.lathe(gloss, [[0.001, 0], [0.05, 0], [0.05, 0.16], [0.03, 0.18], [0.001, 0.18]], TRS(x + w / 2, y + 0.026, (z0 + z1) / 2), 16, "#c2563a");
            x += w; continue;
          }
          const w = 0.025 + r() * 0.035, h = 0.24 + r() * 0.13, d = 0.2 + r() * 0.08, lean = r() < 0.08 ? 0.25 : 0;
          if (x + w + (lean ? 0.06 : 0) > end) break;
          const col = cols[Math.floor(r() * cols.length)];
          const BM = TRS(x + w / 2 + (lean ? 0.05 : 0), y + 0.026, z0 + 0.03 + d / 2, 0, 0, -lean);
          fu.box(plain, -w / 2, 0, -d / 2, w / 2, h, d / 2, BM, col);
          if (r() < 0.6) fu.box(plain, -w / 2 - 0.001, h * 0.75, d / 2 - 0.001, w / 2 + 0.001, h * 0.8, d / 2 + 0.002, BM, "#f2d68a");
          x += w + 0.003 + (lean ? 0.08 : 0);
        }
      });
      fu.rbox(gloss, 0.4, 0.1, 0.3, 0.015, TRS(x0 + 0.3, 1.746 + 0.05, (z0 + z1) / 2), WOOD);
      fu.cyl(gloss, 0.13, 0.13, 0.012, 32, TRS(x0 + 0.28, 1.853, (z0 + z1) / 2), "#1a1a1a"); fu.cyl(plain, 0.04, 0.04, 0.003, 18, TRS(x0 + 0.28, 1.861, (z0 + z1) / 2), "#e9573a");
      fu.rod(gloss, V3(x0 + 0.45, 1.87, z0 + 0.06), V3(x0 + 0.36, 1.87, (z0 + z1) / 2 + 0.06), 0.005, 6, "#c0c0c8");
      fu.lathe(gloss, [[0.001, 0], [0.06, 0], [0.07, 0.12], [0.001, 0.12]], TRS(x1 - 0.18, 1.746, (z0 + z1) / 2), 18, "#2f6f6a");
      const rr2 = rng(5);
      for (let k = 0; k < 6; k++) { const L = 0.3 + rr2() * 0.5, p0 = V3(x1 - 0.18, 1.86, (z0 + z1) / 2); const pts = [p0, V3(p0.x + (rr2() - 0.5) * 0.15, 1.8, z1 + 0.03), V3(p0.x + (rr2() - 0.5) * 0.25, 1.86 - L, z1 + 0.05)]; fu.tube(plain, pts, 0.004, 12, "#3f7a3a", 5); const cv = new THREE.CatmullRomCurve3(pts); for (let q = 1; q < 5; q++) { const P = cv.getPoint(q / 5); fu.sph(gloss, TRS(P.x, P.y, P.z + 0.01, k + q, 0.5, 0.5, [0.03, 0.006, 0.024]), 8, "#5aa04a"); } }
    }
    // ---- side walls: prints; a teal pouf on the right ----
    frame(bn, TRS(-HX, 1.7, 0.6, Math.PI / 2), 0.6, 0.74, 2, "#c99a3a");
    frame(bp, TRS(HX, 1.7, 0.4, -Math.PI / 2), 0.6, 0.74, 1, "#1d1d22");
    fu.rbox(plain, 0.5, 0.3, 0.5, 0.14, TRS(2.55, 0.15, 0.7), "#2f6f6a", 4);
    // ---- a paper-globe pendant ----
    bc.rod(plain, V3(-0.4, HY, 0.6), V3(-0.4, 2.35, 0.6), 0.004, 6, "#1a1a1a");
    bc.sph(plain, TRS(-0.4, 2.2, 0.6, 0, 0, 0, 0.18), 24, "#fbf2de");
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    // the oval RUG: a thin disc (own mesh; receives the stripes)
    {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 0.014, 72, 1, false);
      const uv = g.getAttribute("uv") as THREE.BufferAttribute, p = g.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) + 0.5, 0.5 - p.getZ(i));
      const m = solo(g, imat(S, { map: rugTex() }), TRS(-0.45, 0.007, 0.35, 0, 0, 0, [3.2, 1, 2.1]));
      R.add(m);
    }
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 1100, 31, [-2.9, 0.05, -1.3, 1.4, 2.3, 2.4]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), HOME_RIGS, "morning");
    // the low sun (~25 deg) from behind-left: the stripe pool runs from the armchair through BEAN toward the camera
    const sd = V3(-0.38, 0.42, -0.8).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    const wc = V3((HWIN.x0 + HWIN.x1) / 2, (HWIN.y0 + HWIN.y1) / 2, HZ - 0.18);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1);
    (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((HWIN.x1 - HWIN.x0) / 2 - 0.05, (HWIN.y1 - HWIN.y0) / 2 - 0.05);
    (S.u.uWM.value as THREE.Vector4).set(3, 4, 0.02, 0.3);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(HX, HZ, HY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t;
    const dn = sd.clone().negate(), pool = wc.clone().addScaledVector(dn, wc.y / -dn.y);
    setLights(S, [
      { p: W2(-2.62, 1.6, 0.12), c: rg.lamp, r: 0.9 },
      { p: W2(pool.x, 0.25, pool.z), c: rg.bounce, r: 1.8 },
      { p: W2(wc.x, wc.y, HZ + 0.7), c: rg.win, r: 1.6 },
      { p: W2(0.3, 1.6, 3.4), c: rg.fill, r: 3.4 },
      { p: W2(-1.4, 0.3, -0.6), c: sc3(rg.bounce, 0.4), r: 1.2 },
      { p: W2(1.8, 1.2, 0.4), c: rg.warm, r: 2.0 },
      { p: W2(-0.4, 2.15, 0.6), c: sc3(rg.lamp, 0.25), r: 1.2 },
    ], rg.au, rg.ad);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(...rg.lampEm);
    const vb = (1.02 - rg.view) * 0.15;
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view + vb * 0.4, rg.view + vb);
    (this.tvMat.uniforms.uEm.value as THREE.Vector3).set(rg.tv, rg.tv, rg.tv);
    this.glass.color.setRGB(0.05 * rg.view, 0.045 * rg.view, 0.04 * rg.view);
    this.haze.set(wc, V3(1, 0, 0), V3(0, 1, 0), (HWIN.x1 - HWIN.x0) / 2, (HWIN.y1 - HWIN.y0) / 2, dn, 4.2, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -HX + 0.1; this.posX.visible = c.x < HX - 0.1; this.ceil.visible = c.y < HY - 0.1;
  }
}

// ============================================================ the LAB (1990s London)
const LX = 3.6, LZ = -2.0, LY = 3.0, LZF = 6.5;
const LWIN = { x0: -2.75, x1: -1.25, y0: 1.0, y1: 2.4 };
const TOP = 0.78;
const SPOT = { p: V3(0, 2.82, 0.75), aim: V3(0, TOP, 0.1) };
type LabRig = { au: C3; ad: C3; sun: C3; tube: C3; tubeEm: C3; spot: C3; cone: number; crt: number; view: number; haze: number; hazeC: C3; fill: C3; warm: C3; motes: number };
const LAB_RIGS: Partial<Record<Look, LabRig>> = {
  lab: { au: [0.3, 0.34, 0.42], ad: [0.2, 0.17, 0.14], sun: [3.6, 2.4, 1.3], tube: [0.75, 0.8, 0.74], tubeEm: [2.2, 2.3, 2.1], spot: [0, 0, 0], cone: 0, crt: 1.25, view: 1.15, haze: 0.28, hazeC: [1.0, 0.78, 0.48], fill: [0.22, 0.25, 0.34], warm: [0.25, 0.16, 0.08], motes: 1.0 },
  reveal: { au: [0.1, 0.1, 0.17], ad: [0.07, 0.05, 0.06], sun: [1.6, 0.9, 0.5], tube: [0.06, 0.06, 0.07], tubeEm: [0.25, 0.26, 0.26], spot: [5.2, 3.6, 2.0], cone: 0.2, crt: 1.3, view: 0.55, haze: 0.15, hazeC: [1.0, 0.7, 0.42], fill: [0.07, 0.08, 0.14], warm: [0.16, 0.08, 0.04], motes: 1.0 },
  peak: { au: [0.2, 0.12, 0.2], ad: [0.24, 0.1, 0.08], sun: [4.8, 2.6, 1.3], tube: [0.85, 0.6, 0.42], tubeEm: [2.5, 1.9, 1.4], spot: [5.6, 3.2, 2.0], cone: 0.3, crt: 1.3, view: 1.1, haze: 0.35, hazeC: [1.0, 0.6, 0.5], fill: [0.22, 0.1, 0.2], warm: [0.55, 0.24, 0.14], motes: 1.4 },
  xray: { au: [0.04, 0.08, 0.19], ad: [0.02, 0.035, 0.08], sun: [0.3, 0.6, 1.25], tube: [0.02, 0.05, 0.12], tubeEm: [0.15, 0.25, 0.45], spot: [0.3, 0.8, 1.6], cone: 0.15, crt: 0.9, view: 0.22, haze: 0.12, hazeC: [0.3, 0.6, 1.2], fill: [0.04, 0.08, 0.2], warm: [0, 0, 0], motes: 0.8 },
};
class Lab {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  tubeMat: THREE.ShaderMaterial; viewMat: THREE.ShaderMaterial; crtMats: THREE.ShaderMaterial[] = []; spotMat: THREE.ShaderMaterial; ledMat: THREE.ShaderMaterial;
  haze: Haze; motes: Motes; cone: Cone;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...LAB);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat();
    const floor = imat(S, { map: labFloorTex(), rep: [1 / 1.2, 1 / 1.2], spec: 50, specK: 0.3 });
    const brick = imat(S, { map: brickTex(), rep: [1, 1], spec: 40, specK: 0.12 }), green = imat(S, { map: greenTex(), rep: [1, 1], spec: 50, specK: 0.25 });
    const ceilM = imat(S, { map: ceilTex(), rep: [1 / 0.6, 1 / 0.6] });
    const plain = imat(S, {}), gloss = imat(S, { spec: 50, specK: 0.45 }), metal = imat(S, { spec: 70, specK: 0.8 });
    const BEIGE = "#dcd2b8", BEIGED = "#c4b898", STEEL = "#b8bec4", DARK = "#2a2e34", CREAM = "#efe8d4";
    const DY = 1.0;
    b.add(flat(-LX, LZ, LX, LZF, 0), floor);
    const holes = [[LWIN.x0, LWIN.x1, LWIN.y0, LWIN.y1]];
    b.add(wallZ(-LX, LX, 0, DY, LZ, holes), green); b.add(wallZ(-LX, LX, DY, LY, LZ, holes), brick);
    bn.add(wallX(-LX, LZ, LZF, 0, DY), green); bn.add(wallX(-LX, LZ, LZF, DY, LY), brick);
    bp.add(wallX(LX, LZ, LZF, 0, DY), green); bp.add(wallX(LX, LZ, LZF, DY, LY), brick);
    bc.add(flat(-LX, LZ, LX, LZF, LY), ceilM);
    for (const [a, c] of [[-LX, LWIN.x0 - 0.08], [LWIN.x1 + 0.08, LX]]) b.box(gloss, a, DY - 0.03, LZ, c, DY + 0.03, LZ + 0.035, undefined, "#2a5a44");
    b.box(gloss, -LX, 0, LZ, LX, 0.1, LZ + 0.02, undefined, "#24282c");
    b.box(gloss, -LX, 0.42, LZ, LX, 0.5, LZ + 0.05, undefined, "#e9e4d6"); // cable trunking
    for (const [bb, x, s] of [[bn, -LX, 1], [bp, LX, -1]] as [Bat, number, number][]) { bb.box(gloss, x, DY - 0.03, LZ, x + s * 0.035, DY + 0.03, LZF, undefined, "#2a5a44"); bb.box(gloss, x, 0, LZ, x + s * 0.02, 0.1, LZF, undefined, "#24282c"); }
    // exposed pipes high on the back wall
    b.rod(gloss, V3(-LX, 2.78, LZ + 0.08), V3(LX, 2.78, LZ + 0.08), 0.035, 14, "#d8d0bc"); b.rod(gloss, V3(-LX, 2.66, LZ + 0.07), V3(LX, 2.66, LZ + 0.07), 0.022, 12, "#b84a3a");
    for (let x = -3.2; x < 3.4; x += 1.1) b.box(metal, x - 0.02, 2.62, LZ, x + 0.02, 2.83, LZ + 0.12, undefined, "#8a9096");
    // ---- WINDOW with venetian blinds (14 slats = the sun aperture) + the street; a tea station below ----
    {
      const { x0, x1, y0, y1 } = LWIN, fw = 0.06, D = 0.24;
      b.box(brick, x0 - 0.002, y0, LZ - D, x0, y1, LZ); b.box(brick, x1, y0, LZ - D, x1 + 0.002, y1, LZ); b.box(brick, x0, y1, LZ - D, x1, y1 + 0.002, LZ);
      for (const [a, c, d, e] of [[x0 - fw, x0, y0 - fw, y1 + fw], [x1, x1 + fw, y0 - fw, y1 + fw], [x0, x1, y1, y1 + fw], [x0, x1, y0 - fw, y0]]) b.box(gloss, a, d, LZ - 0.2, c, e, LZ - 0.12, undefined, "#e9e4d6");
      const xm = (x0 + x1) / 2; b.box(gloss, xm - 0.025, y0, LZ - 0.2, xm + 0.025, y1, LZ - 0.14, undefined, "#e9e4d6");
      b.box(gloss, x0, (y0 + y1) / 2 + 0.15, LZ - 0.2, xm - 0.025, (y0 + y1) / 2 + 0.2, LZ - 0.14, undefined, "#e9e4d6");
      b.box(gloss, xm + 0.025, (y0 + y1) / 2 + 0.15, LZ - 0.2, x1, (y0 + y1) / 2 + 0.2, LZ - 0.14, undefined, "#e9e4d6");
      fu.box(gloss, x0 - 0.1, y0 - 0.08, LZ - D, x1 + 0.1, y0 - 0.03, LZ + 0.1, undefined, "#e9e4d6");
      const n = 14, sh = (y1 - y0) / n;
      for (let k = 0; k < n; k++) b.box(gloss, x0 + 0.02, -0.003, -0.032, x1 - 0.02, 0.003, 0.032, TRS(0, y0 + (k + 1) * sh - 0.015, LZ + 0.06, 0, 0.6), "#f2ecd8");
      b.box(gloss, x0 - 0.02, y1 + 0.005, LZ + 0.02, x1 + 0.02, y1 + 0.08, LZ + 0.1, undefined, "#e9e4d6");
      for (const x of [x0 + 0.2, x1 - 0.2]) b.rod(plain, V3(x, y0 + 0.02, LZ + 0.06), V3(x, y1, LZ + 0.06), 0.003, 4, "#d8d0bc");
      b.rod(plain, V3(x1 - 0.08, y1, LZ + 0.1), V3(x1 - 0.08, y0 + 0.3, LZ + 0.1), 0.004, 4, "#e8e2d0"); b.cyl(plain, 0.012, 0.012, 0.04, 8, TRS(x1 - 0.08, y0 + 0.28, LZ + 0.1), "#e8e2d0");
      this.viewMat = imat(S, { map: streetTex(), emap: true, em: [1.15, 1.15, 1.15] });
      const card = solo(new THREE.PlaneGeometry(5, 5), this.viewMat); card.position.set((x0 + x1) / 2 - 0.6, 1.6, LZ - 2.2); card.layers.set(NOINK); R.add(card);
      fu.box(gloss, x0 - 0.05, 0, LZ + 0.005, x1 + 0.05, 0.86, LZ + 0.5, undefined, CREAM);
      fu.box(gloss, x0 - 0.08, 0.86, LZ + 0.005, x1 + 0.08, 0.9, LZ + 0.53, undefined, "#a87a4a");
      for (let k = 0; k < 2; k++) { const cx = x0 + 0.38 + k * 0.75; fu.box(gloss, cx - 0.35, 0.1, LZ + 0.5, cx + 0.35, 0.8, LZ + 0.515, undefined, "#e2dac4"); fu.box(metal, cx + (k ? -0.3 : 0.27), 0.6, LZ + 0.515, cx + (k ? -0.27 : 0.3), 0.7, LZ + 0.535, undefined, STEEL); }
      const kx = x0 + 0.3, kz = LZ + 0.25;
      fu.lathe(metal, [[0.001, 0], [0.1, 0], [0.11, 0.06], [0.1, 0.18], [0.06, 0.24], [0.02, 0.25], [0.001, 0.25]], TRS(kx, 0.9, kz), 24, "#d8dce2");
      fu.rod(gloss, V3(kx - 0.06, 1.13, kz), V3(kx + 0.06, 1.13, kz), 0.014, 8, DARK); fu.rod(metal, V3(kx + 0.09, 0.98, kz), V3(kx + 0.17, 1.06, kz), 0.014, 8, "#d8dce2");
      for (let k = 0; k < 3; k++) { const mx = x0 + 0.6 + k * 0.16, col = ["#f6f0e2", "#c8302a", "#2a5a9a"][k]; fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.1], [0.038, 0.1], [0.001, 0.095]], TRS(mx, 0.9, LZ + 0.3), 18, col); fu.torus(gloss, 0.022, 0.006, TRS(mx + 0.045, 0.95, LZ + 0.3), col); }
      fu.cyl(gloss, 0.08, 0.08, 0.1, 24, TRS(x1 - 0.45, 0.95, LZ + 0.25), "#2a6a4a"); fu.cyl(gloss, 0.082, 0.082, 0.02, 24, TRS(x1 - 0.45, 1.01, LZ + 0.25), "#e0b040");
      fu.lathe(gloss, [[0.001, 0], [0.07, 0], [0.08, 0.13], [0.001, 0.13]], TRS(x1 - 0.18, 0.9, LZ + 0.25), 18, "#f4e8d2");
      const r = rng(9);
      for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, L = 0.18 + r() * 0.12; fu.tube(plain, [V3(x1 - 0.18, 1.02, LZ + 0.25), V3(x1 - 0.18 + Math.cos(a) * L * 0.6, 1.14, LZ + 0.25 + Math.sin(a) * L * 0.4), V3(x1 - 0.18 + Math.cos(a) * L, 1.0, LZ + 0.25 + Math.sin(a) * L * 0.7)], 0.007, 10, k % 2 ? "#8ac85a" : "#e8f2c8", 4); }
    }
    // ---- the WHITEBOARD (behind the scientists) + the lab sign above ----
    {
      const x0 = -0.95, x1 = 0.95, y0 = 1.0, y1 = 2.1;
      fu.box(metal, x0 - 0.035, y0 - 0.035, LZ + 0.001, x1 + 0.035, y1 + 0.035, LZ + 0.03, undefined, "#c8ccd0");
      fu.add(new THREE.PlaneGeometry(x1 - x0, y1 - y0).translate(0, 0, 0.032), imat(S, { map: boardTex(), spec: 40, specK: 0.25 }), TRS(0, (y0 + y1) / 2, LZ));
      fu.box(metal, x0 + 0.05, y0 - 0.06, LZ + 0.03, x1 - 0.05, y0 - 0.035, LZ + 0.1, undefined, "#c8ccd0");
      for (let k = 0; k < 4; k++) fu.cyl(gloss, 0.011, 0.011, 0.13, 10, TRS(-0.5 + k * 0.16, y0 - 0.024, LZ + 0.07, 0.1 * k, 0, Math.PI / 2), ["#1f4fb0", "#d0302a", "#1d1d22", "#1f8a4a"][k]);
      fu.rbox(plain, 0.14, 0.04, 0.06, 0.01, TRS(0.55, y0 - 0.015, LZ + 0.07), "#3a3a40"); fu.box(plain, 0.48, y0 - 0.035, LZ + 0.045, 0.62, y0 - 0.026, LZ + 0.095, undefined, "#e8e0c8");
      fu.box(gloss, -1.0, 2.3, LZ + 0.001, 1.0, 2.5, LZ + 0.03, undefined, "#1c2f5a");
      fu.add(new THREE.PlaneGeometry(1.96, 0.3).translate(0, 0, 0.032), imat(S, { map: signTex() }), TRS(0, 2.4, LZ));
    }
    // calendar between the window and the whiteboard
    {
      const M = TRS(-1.105, 1.62, LZ + 0.002);
      fu.box(plain, -0.11, -0.15, 0, 0.11, 0.15, 0.006, M, "#ffffff");
      fu.add(new THREE.PlaneGeometry(0.22, 0.3).translate(0, 0, 0.007), imat(S, { map: labPosterTex(1) }), M);
      fu.rod(plain, V3(-1.105, 1.79, LZ + 0.004), V3(-1.105, 1.8, LZ + 0.02), 0.004, 6, "#888888");
    }
    // ---- computer desk (right): beige PCs, 2 CRTs, keyboards, a dot-matrix printer, cables, a brain model; binders ----
    {
      const x0 = 1.2, x1 = 3.3, z0 = LZ + 0.005, z1 = LZ + 0.78, ht = 0.74;
      fu.box(gloss, x0, ht - 0.035, z0, x1, ht, z1, undefined, "#d8cbb0"); fu.box(plain, x0, ht - 0.05, z1 - 0.01, x1, ht - 0.035, z1 + 0.005, undefined, "#7a6a50");
      for (const x of [x0 + 0.03, x1 - 0.03]) for (const z of [z0 + 0.05, z1 - 0.05]) fu.box(metal, x - 0.02, 0, z - 0.02, x + 0.02, ht - 0.035, z + 0.02, undefined, "#5a6068");
      fu.box(gloss, x1 - 0.48, 0.02, z0 + 0.02, x1 - 0.06, ht - 0.04, z1 - 0.08, undefined, "#c8bca0");
      for (let k = 0; k < 3; k++) { fu.box(gloss, x1 - 0.46, 0.06 + k * 0.22, z1 - 0.08, x1 - 0.08, 0.24 + k * 0.22, z1 - 0.065, undefined, "#d8ccb0"); fu.box(metal, x1 - 0.32, 0.17 + k * 0.22, z1 - 0.065, x1 - 0.22, 0.19 + k * 0.22, z1 - 0.05, undefined, STEEL); }
      // a beige tower under the desk
      fu.rbox(gloss, 0.2, 0.46, 0.44, 0.015, TRS(1.45, 0.235, LZ + 0.4), BEIGE); fu.box(plain, 1.36, 0.36, LZ + 0.621, 1.54, 0.375, LZ + 0.623, undefined, "#3a3a40"); fu.box(plain, 1.36, 0.3, LZ + 0.621, 1.54, 0.315, LZ + 0.623, undefined, "#3a3a40");
      const crt = (cx: number, cz: number, yaw: number, tex: THREE.Texture, s = 1) => {
        const B = TRS(cx, ht, cz, yaw, 0, 0, s);
        const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, sc: number | C3 = 1) => TRS(x, y, z, ry, rx, rz, sc).premultiply(B);
        fu.rbox(gloss, 0.44, 0.12, 0.42, 0.015, M(0, 0.06, 0), BEIGE);
        fu.box(plain, 0.06, 0.07, 0.211, 0.18, 0.085, 0.213, M(0, 0, 0), "#3a3a40");
        fu.box(gloss, -0.19, 0.03, 0.211, -0.15, 0.05, 0.216, M(0, 0, 0), "#e8e2d0");
        fu.cyl(gloss, 0.12, 0.14, 0.03, 24, M(0, 0.135, -0.02), BEIGED);
        fu.rbox(gloss, 0.4, 0.36, 0.3, 0.04, M(0, 0.34, -0.05), BEIGE, 3);
        fu.rbox(gloss, 0.3, 0.26, 0.22, 0.06, M(0, 0.34, -0.27), BEIGED, 3);
        fu.box(plain, -0.17, 0.2, 0.105, 0.17, 0.48, 0.107, M(0, 0, -0.05), "#3a3a3e");
        const mat = imat(S, { map: tex, emap: true, em: [1.2, 1.2, 1.2] }); this.crtMats.push(mat);
        fu.add(bulge(0.31, 0.24, 0.012).translate(0, 0, 0.002), mat, M(0, 0.345, 0.057));
        fu.box(plain, 0.13, 0.19, 0.103, 0.15, 0.2, 0.12, M(0, 0, -0.05), "#58ff8a");
        return B;
      };
      const B1 = crt(1.62, LZ + 0.35, -0.12, crtTex());
      crt(2.32, LZ + 0.33, 0.1, crt2Tex(), 0.95);
      this.ledMat = imat(S, { col: "#000000", em: [0.4, 2.2, 0.8] });
      const cur = solo(new THREE.PlaneGeometry(0.009, 0.0035), this.ledMat, new THREE.Matrix4().makeTranslation(-0.093 + 0.0045, 0.256, 0.072).premultiply(B1));
      R.add(cur);
      for (const [kx2, kz2, yaw] of [[1.62, LZ + 0.64, -0.1], [2.3, LZ + 0.62, 0.12]] as [number, number, number][]) {
        fu.rbox(gloss, 0.44, 0.03, 0.16, 0.01, TRS(kx2, ht + 0.015, kz2, yaw, 0.06), BEIGE);
        fu.add(new THREE.PlaneGeometry(0.42, 0.14).rotateX(-Math.PI / 2).translate(0, 0.0315, 0), imat(S, { map: kbTex() }), TRS(kx2, ht, kz2, yaw, 0.06));
        fu.rbox(gloss, 0.06, 0.03, 0.1, 0.02, TRS(kx2 + 0.3, ht + 0.015, kz2, yaw), BEIGE);
        fu.tube(plain, [V3(kx2 + 0.3, ht + 0.02, kz2 - 0.05), V3(kx2 + 0.28, ht + 0.01, kz2 - 0.2), V3(kx2 + 0.1, ht + 0.01, kz2 - 0.3)], 0.003, 12, "#cfc6b0", 4);
      }
      fu.rbox(gloss, 0.42, 0.12, 0.3, 0.02, TRS(2.95, ht + 0.06, LZ + 0.25), BEIGED);
      fu.box(plain, 2.79, ht + 0.12, LZ + 0.12, 3.11, ht + 0.126, LZ + 0.36, undefined, "#5a5a60");
      fu.add(new THREE.PlaneGeometry(0.28, 0.3).translate(0, 0.15, 0), imat(S, { map: paperTex() }), TRS(2.95, ht + 0.12, LZ + 0.13, 0, -0.25));
      fu.box(plain, 2.8, ht + 0.001, LZ + 0.42, 3.1, ht + 0.06, LZ + 0.7, undefined, "#fffdf2");
      fu.cyl(gloss, 0.07, 0.08, 0.03, 18, TRS(1.32, ht + 0.015, LZ + 0.15), "#c8302a");
      fu.rod(gloss, V3(1.32, ht + 0.03, LZ + 0.15), V3(1.36, ht + 0.42, LZ + 0.12), 0.01, 8, "#c8302a"); fu.rod(gloss, V3(1.36, ht + 0.42, LZ + 0.12), V3(1.52, ht + 0.52, LZ + 0.2), 0.01, 8, "#c8302a");
      fu.lathe(gloss, [[0.02, 0], [0.04, 0.02], [0.08, 0.12], [0.075, 0.12]], TRS(1.55, ht + 0.48, LZ + 0.22, 0, 0, 2.5), 18, "#c8302a");
      // plastic brain model on a stand
      fu.cyl(gloss, 0.05, 0.06, 0.03, 16, TRS(2.7, ht + 0.015, LZ + 0.62), DARK);
      fu.rod(metal, V3(2.7, ht + 0.03, LZ + 0.62), V3(2.7, ht + 0.1, LZ + 0.62), 0.006, 6, STEEL);
      fu.sph(gloss, TRS(2.7, ht + 0.17, LZ + 0.62, 0.4, 0, 0, [0.1, 0.075, 0.08]), 18, "#f2a0b0");
      fu.sph(gloss, TRS(2.65, ht + 0.12, LZ + 0.6, 0.4, 0, 0, [0.045, 0.03, 0.04]), 14, "#e06a8a");
      for (let k = 0; k < 5; k++) fu.torus(plain, 0.075, 0.004, TRS(2.7 + (k - 2) * 0.03, ht + 0.17, LZ + 0.62, Math.PI / 2 + 0.4, 0, 0, [1, 0.8, 1]), "#d0708a", Math.PI);
      // cables from the PCs, down behind the desk and across the floor (taped) toward the lab table
      fu.tube(plain, [V3(1.62, ht + 0.06, LZ + 0.12), V3(1.5, 0.4, LZ + 0.1), V3(1.35, 0.012, LZ + 0.5), V3(1.0, 0.012, -1.0), V3(0.88, 0.012, -0.47), V3(0.82, 0.3, -0.4)], 0.012, 50, "#2a2a2e", 6);
      fu.tube(plain, [V3(2.32, ht + 0.06, LZ + 0.1), V3(2.1, 0.3, LZ + 0.06), V3(1.4, 0.01, LZ + 0.55), V3(1.04, 0.01, -1.05), V3(0.9, 0.01, -0.5), V3(0.84, 0.35, -0.41)], 0.009, 50, "#5a5a62", 6);
      fu.tube(plain, [V3(1.5, ht, LZ + 0.05), V3(1.4, 0.5, LZ + 0.03), V3(1.3, 0.2, LZ + 0.1), V3(1.2, 0.009, LZ + 0.4)], 0.006, 30, "#e8e2d0", 5);
      for (const [x, z] of [[1.17, -1.25], [0.98, -0.8]] as [number, number][]) fu.box(plain, -0.06, 0, -0.04, 0.06, 0.028, 0.04, TRS(x, 0, z, -0.5), "#f2c21e");
      // binder shelves above the desk
      for (const y of [1.55, 2.05]) {
        fu.box(gloss, x0 + 0.05, y, LZ + 0.005, x1 - 0.05, y + 0.025, LZ + 0.32, undefined, "#d8cbb0");
        for (const x of [x0 + 0.2, x1 - 0.2]) fu.box(metal, x - 0.012, y - 0.15, LZ + 0.005, x + 0.012, y, LZ + 0.3, undefined, "#5a6068");
      }
      const bmat = imat(S, { map: binderTex() });
      const r = rng(3);
      for (const y of [1.575, 2.075]) {
        let x = x0 + 0.1;
        while (x < x1 - 0.2) {
          if (r() < 0.1) { fu.box(plain, x, y, LZ + 0.03, x + 0.3, y + 0.08, LZ + 0.3, undefined, ["#2a4a8a", "#c8302a"][Math.floor(r() * 2)]); x += 0.32; continue; }
          const w = 0.06, h = 0.31, i = Math.floor(r() * 16), lean = r() < 0.1 ? 0.18 : 0;
          const g = new THREE.BoxGeometry(w, h, 0.27); const uv = g.getAttribute("uv") as THREE.BufferAttribute;
          for (let q = 0; q < uv.count; q++) uv.setXY(q, (i + uv.getX(q)) / 16, uv.getY(q));
          fu.add(g, bmat, TRS(x + w / 2 + (lean ? 0.04 : 0), y + h / 2, LZ + 0.17, 0, 0, -lean));
          x += w + 0.004 + (lean ? 0.06 : 0);
        }
      }
      // grey filing cabinet at the far right + a plant on it
      fu.box(gloss, 3.32, 0, LZ + 0.005, 3.58, 1.32, LZ + 0.6, undefined, "#9aa0a6");
      for (let k = 0; k < 4; k++) { fu.box(gloss, 3.33, 0.05 + k * 0.32, LZ + 0.6, 3.57, 0.33 + k * 0.32, LZ + 0.615, undefined, "#a8aeb4"); fu.box(metal, 3.41, 0.25 + k * 0.32, LZ + 0.615, 3.49, 0.27 + k * 0.32, LZ + 0.635, undefined, "#d8dce0"); }
      fu.lathe(gloss, [[0.001, 0], [0.08, 0], [0.09, 0.16], [0.001, 0.16]], TRS(3.45, 1.32, LZ + 0.3), 18, "#c8643a");
      for (let k = 0; k < 9; k++) fu.sph(gloss, TRS(3.45 + Math.cos(k * 0.7) * 0.07, 1.55 + (k % 3) * 0.08, LZ + 0.3 + Math.sin(k * 0.7) * 0.07, k, 0.4, 0.3, [0.09, 0.012, 0.05]), 10, "#3f8a4a");
    }
    // ---- the LAB TABLE (top y 0.78, x -0.92..0.92, z -0.46..0.46) ----
    {
      const X = 0.92, Z = 0.46;
      fu.box(gloss, -X, TOP - 0.035, -Z, X, TOP, Z, undefined, "#6a5444"); // iroko worktop (oiled, muted so the grey robot reads)
      fu.box(gloss, -X - 0.01, TOP - 0.055, -Z - 0.01, X + 0.01, TOP - 0.005, -Z, undefined, "#7a4626");
      fu.box(gloss, -X - 0.01, TOP - 0.055, Z, X + 0.01, TOP - 0.005, Z + 0.01, undefined, "#7a4626");
      fu.box(gloss, -X - 0.01, TOP - 0.055, -Z, -X, TOP - 0.005, Z, undefined, "#7a4626");
      fu.box(gloss, X, TOP - 0.055, -Z, X + 0.01, TOP - 0.005, Z, undefined, "#7a4626");
      const lx = X - 0.05, lz = Z - 0.05;
      for (const [x, z] of [[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]]) { fu.box(metal, x - 0.025, 0.015, z - 0.025, x + 0.025, TOP - 0.055, z + 0.025, undefined, "#4a5058"); fu.cyl(plain, 0.03, 0.03, 0.015, 10, TRS(x, 0.0075, z), "#1a1a1a"); }
      fu.box(metal, -lx + 0.025, 0.14, -lz - 0.02, lx - 0.025, 0.17, -lz + 0.02, undefined, "#4a5058");
      for (const x of [-lx, lx]) fu.box(metal, x - 0.02, 0.14, -lz + 0.025, x + 0.02, 0.17, lz - 0.025, undefined, "#4a5058");
      fu.box(metal, -lx + 0.025, TOP - 0.1, -lz - 0.02, lx - 0.025, TOP - 0.056, -lz + 0.01, undefined, "#4a5058");
      fu.rbox(gloss, 0.36, 0.18, 0.26, 0.02, TRS(-0.5, 0.261, -0.22), "#c8302a"); fu.rod(metal, V3(-0.62, 0.38, -0.22), V3(-0.38, 0.38, -0.22), 0.01, 8, "#2a2a2e");
      fu.box(plain, 0.25, 0.171, -0.36, 0.6, 0.3, -0.08, undefined, "#c8a87a");
      for (let k = 0; k < 4; k++) fu.sph(plain, TRS(0.3 + k * 0.07, 0.32, -0.22 + (k % 2) * 0.05, 0, 0, 0, [0.03, 0.025, 0.03]), 10, "#f6d84a");
    }
    // ---- BEAN's STOOL at (0, 0, 0.55): red vinyl seat top y 0.62, chrome legs + foot ring ----
    {
      const sx = 0, sz = 0.55;
      fu.cyl(plain, 0.18, 0.17, 0.06, 36, TRS(sx, 0.59, sz), "#c8302a");
      fu.torus(gloss, 0.176, 0.012, TRS(sx, 0.596, sz, 0, Math.PI / 2), "#a02418");
      fu.cyl(metal, 0.15, 0.15, 0.02, 30, TRS(sx, 0.55, sz), "#c8ccd2");
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; fu.rod(metal, V3(sx + Math.cos(a) * 0.11, 0.55, sz + Math.sin(a) * 0.11), V3(sx + Math.cos(a) * 0.2, 0.015, sz + Math.sin(a) * 0.2), 0.013, 10, "#d8dce2"); fu.cyl(plain, 0.018, 0.018, 0.02, 10, TRS(sx + Math.cos(a) * 0.2, 0.01, sz + Math.sin(a) * 0.2), "#1a1a1a"); }
      fu.torus(metal, 0.168, 0.01, TRS(sx, 0.24, sz, 0, Math.PI / 2), "#d8dce2");
    }
    // ---- side walls: notice board, posters, a rubber plant, a sink, a coat rack with a spare lab coat, a clock ----
    {
      bn.box(gloss, -LX, 1.2, -1.2, -LX + 0.03, 2.1, 0.2, undefined, "#7a5a3a");
      bn.add(new THREE.PlaneGeometry(1.34, 0.84).translate(0, 0, 0.032), imat(S, { map: labPosterTex(3) }), TRS(-LX, 1.65, -0.5, Math.PI / 2));
      const poster = (bb: Bat, M: THREE.Matrix4, w: number, h: number, kind: number) => { bb.box(plain, -w / 2, -h / 2, 0, w / 2, h / 2, 0.006, M, "#ffffff"); bb.add(new THREE.PlaneGeometry(w, h).translate(0, 0, 0.007), imat(S, { map: labPosterTex(kind) }), M); };
      poster(bn, TRS(-LX, 1.7, 0.9, Math.PI / 2), 0.5, 0.69, 0);
      poster(bp, TRS(LX, 1.75, -0.6, -Math.PI / 2), 0.5, 0.69, 2);
      fu.lathe(gloss, [[0.001, 0], [0.15, 0], [0.18, 0.34], [0.2, 0.36], [0.001, 0.36]], TRS(-3.2, 0.001, -1.6), 24, "#b85a3a");
      const r = rng(41);
      for (let k = 0; k < 16; k++) { const h = 0.6 + k * 0.08, a = k * 2.4; fu.sph(gloss, TRS(-3.2 + Math.cos(a) * 0.16, h, -1.6 + Math.sin(a) * 0.14, -a, 0.2, -0.4, [0.13, 0.014, 0.06]), 14, r() < 0.5 ? "#2f5a32" : "#3f7a3e"); }
      fu.rod(plain, V3(-3.2, 0.36, -1.6), V3(-3.2, 1.9, -1.6), 0.012, 8, "#5a4a2a");
      bn.box(gloss, -LX, 0, 1.6, -LX + 0.55, 0.86, 2.4, undefined, CREAM);
      bn.box(gloss, -LX, 0.86, 1.58, -LX + 0.58, 0.9, 2.42, undefined, "#d8dce0");
      bn.rod(metal, V3(-LX + 0.08, 0.9, 2.0), V3(-LX + 0.08, 1.15, 2.0), 0.015, 10, STEEL); bn.rod(metal, V3(-LX + 0.08, 1.15, 2.0), V3(-LX + 0.25, 1.15, 2.0), 0.015, 10, STEEL);
      bn.rbox(plain, 0.05, 0.36, 0.7, 0.01, TRS(-LX + 0.03, 1.45, 2.0), "#f6f6f2");
      bp.box(gloss, LX - 0.03, 1.75, 1.0, LX, 1.85, 2.0, undefined, "#9a6236");
      for (const z of [1.2, 1.5, 1.8]) bp.rod(metal, V3(LX - 0.03, 1.8, z), V3(LX - 0.12, 1.84, z), 0.01, 8, STEEL);
      bp.lathe(plain, [[0.02, 0], [0.17, 0.03], [0.2, 0.45], [0.18, 0.8], [0.1, 0.95], [0.02, 1.0]], TRS(LX - 0.12, 0.82, 1.5, -Math.PI / 2, 0, 0, [1, 1, 0.38]), 20, "#f6f8f6");
      bp.cyl(gloss, 0.17, 0.17, 0.04, 40, TRS(LX - 0.02, 2.35, 0.4, 0, 0, Math.PI / 2), "#1a1a1a");
      bp.add(new THREE.CircleGeometry(0.15, 40), imat(S, { map: clockTex() }), TRS(LX - 0.041, 2.35, 0.4, -Math.PI / 2));
      bp.box(plain, -0.004, -0.004, -0.002, 0.004, 0.09, 0.002, TRS(LX - 0.046, 2.35, 0.4, -Math.PI / 2, 0, -0.9), "#1a1a1a");
      bp.box(plain, -0.003, -0.003, -0.002, 0.003, 0.13, 0.002, TRS(LX - 0.05, 2.35, 0.4, -Math.PI / 2, 0, 2.1), "#1a1a1a");
    }
    // ---- ceiling: 4 fluorescent troffers + the theatrical spot can on a lighting bar ----
    this.tubeMat = imat(S, { col: "#000000", em: [2.2, 2.3, 2.1] });
    for (const [x, z] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 1.5], [1.3, 1.5]]) {
      bc.box(gloss, x - 0.33, LY - 0.05, z - 0.63, x + 0.33, LY - 0.002, z + 0.63, undefined, "#d8d4c8");
      bc.box(this.tubeMat, x - 0.28, LY - 0.058, z - 0.58, x + 0.28, LY - 0.05, z + 0.58);
      for (let k = 1; k < 6; k++) bc.box(metal, x - 0.28, LY - 0.066, z - 0.58 + k * 0.193 - 0.004, x + 0.28, LY - 0.058, z - 0.58 + k * 0.193 + 0.004, undefined, "#c8ccd0");
    }
    bc.rod(metal, V3(-1.8, LY - 0.25, SPOT.p.z), V3(1.8, LY - 0.25, SPOT.p.z), 0.022, 12, "#2a2a2e");
    for (const x of [-1.6, 1.6]) bc.rod(metal, V3(x, LY, SPOT.p.z), V3(x, LY - 0.25, SPOT.p.z), 0.008, 6, "#2a2a2e");
    {
      const d = SPOT.aim.clone().sub(SPOT.p).normalize(), q = new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), d);
      const M = new THREE.Matrix4().compose(SPOT.p, q, V3(1, 1, 1));
      bc.add(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 28, 1, true).translate(0, 0.08, 0), metal, M, "#1d1f24");
      bc.add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 28).translate(0, 0.23, 0), metal, M, "#1d1f24");
      this.spotMat = imat(S, { col: "#000000", em: [0, 0, 0] });
      bc.add(new THREE.CylinderGeometry(0.12, 0.12, 0.004, 28).translate(0, -0.06, 0), this.spotMat, M);
      for (const s of [-1, 1]) bc.add(new THREE.BoxGeometry(0.02, 0.16, 0.24).translate(s * 0.15, 0.06, 0), metal, M, "#1d1f24");
      bc.rod(metal, SPOT.p.clone().add(V3(0, 0.12, 0)), V3(0, LY - 0.25, SPOT.p.z), 0.012, 8, "#1d1f24");
      for (const s of [-1, 1]) bc.add(new THREE.BoxGeometry(0.3, 0.004, 0.14).translate(0, 0, 0.07).rotateX(-0.5).translate(0, -0.08, 0.13).applyMatrix4(new THREE.Matrix4().makeRotationY(s > 0 ? 0 : Math.PI)), metal, M, "#1d1f24"); // barn doors
    }
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.haze = new Haze(R, S);
    const sv = SPOT.aim.clone().sub(SPOT.p), sl = sv.length();
    sv.normalize();
    this.cone = new Cone(R, 0.11, 0.8, sl);
    this.cone.mesh.position.copy(SPOT.p).addScaledVector(sv, 0.07);
    this.cone.mesh.quaternion.setFromUnitVectors(V3(0, -1, 0), sv);
    this.motes = new Motes(R, S, 1000, 47, [-3.0, 0.1, -1.9, 1.6, 2.7, 2.0]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    let rg = mixRig(lookW(id, f), LAB_RIGS, "lab");
    // shot 3 (reveal): the room is dim; the theatrical spot warms up from "beat" and SLAMS to full on "robot"
    let pulse = 0;
    if (id === 3) {
      const spotK = 0.3 + 0.3 * smooth((t - W.beat) / 1.2) + 0.4 * smooth((t - (W.robot - 0.35)) / 0.3);
      if (t > W.robot - 0.1) pulse = Math.exp(-(t - (W.robot - 0.1)) * 3.5) * smooth((t - (W.robot - 0.1)) / 0.08);
      rg = { ...rg, spot: sc3(rg.spot, spotK * (1 + 0.35 * pulse)), cone: rg.cone * spotK * (1 + 0.4 * pulse) };
    }
    // shot 5 (peak): a warm swell on "it tickled" and again on "even more"
    if (id === 5) {
      for (const w of [W.tickled, W.tickled2]) if (t >= w - 0.1) pulse = Math.max(pulse, 0.8 * Math.exp(-(t - (w - 0.1)) * 2.2) * smooth((t - (w - 0.1)) / 0.1));
      if (pulse > 0) rg = { ...rg, spot: sc3(rg.spot, 1 + 0.3 * pulse), warm: sc3(rg.warm, 1 + 1.2 * pulse), sun: sc3(rg.sun, 1 + 0.15 * pulse) };
    }
    // the low sun through the blinds (~18 deg): stripes across the table, BEAN and the floor
    const sd = V3(-0.668, 0.33, -0.678).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    const wc = V3((LWIN.x0 + LWIN.x1) / 2, (LWIN.y0 + LWIN.y1) / 2, LZ + 0.06);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1);
    (S.u.uWU.value as THREE.Vector3).set(1, 0, 0); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((LWIN.x1 - LWIN.x0) / 2 - 0.02, (LWIN.y1 - LWIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(1, 14, 0.026, 0.14);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(LX, LZ, LY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t;
    const sdir = SPOT.aim.clone().sub(SPOT.p).normalize();
    (S.u.uPP.value as THREE.Vector3).copy(W2(SPOT.p.x, SPOT.p.y, SPOT.p.z)); (S.u.uPD.value as THREE.Vector3).copy(sdir);
    (S.u.uPC.value as THREE.Vector3).set(...rg.spot); (S.u.uPK.value as THREE.Vector2).set(Math.cos(0.42), Math.cos(0.3));
    const tube = rg.tube;
    setLights(S, [
      { p: W2(-1.3, LY - 0.4, -0.9), c: tube, r: 2.2 }, { p: W2(1.3, LY - 0.4, -0.9), c: tube, r: 2.2 },
      { p: W2(-1.3, LY - 0.4, 1.5), c: tube, r: 2.2 }, { p: W2(1.3, LY - 0.4, 1.5), c: tube, r: 2.2 },
      { p: W2(0, 1.6, 3.6), c: rg.fill, r: 3.4 },
      { p: W2(-0.2, 0.9, 0.9), c: sc3(rg.sun, 0.07), r: 1.4 },
      { p: W2(0, 1.2, 0.3), c: sc3(rg.spot, 0.06), r: 1.4 },
      { p: W2(1.9, 1.3, LZ + 0.9), c: [0.05 * rg.crt, 0.2 * rg.crt, 0.1 * rg.crt], r: 0.8 },
      { p: W2(-2.0, 1.5, 0.5), c: rg.warm, r: 2.0 },
    ], rg.au, rg.ad);
    (this.tubeMat.uniforms.uEm.value as THREE.Vector3).set(...rg.tubeEm);
    const se = sc3(rg.spot, 0.55); (this.spotMat.uniforms.uEm.value as THREE.Vector3).set(se[0] + 0.02, se[1] + 0.02, se[2] + 0.02);
    for (const m of this.crtMats) (m.uniforms.uEm.value as THREE.Vector3).set(rg.crt, rg.crt, rg.crt);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view, rg.view + (1.15 - rg.view) * 0.25);
    const bl = clamp01(Math.sin(t * Math.PI * 2 * 0.95) * 6 + 0.5); // blinking cursor, soft edges
    (this.ledMat.uniforms.uEm.value as THREE.Vector3).set(0.35 * rg.crt * bl, 1.9 * rg.crt * bl, 0.7 * rg.crt * bl);
    this.haze.set(wc, V3(1, 0, 0), V3(0, 1, 0), (LWIN.x1 - LWIN.x0) / 2, (LWIN.y1 - LWIN.y0) / 2, sd.clone().negate(), 4.6, rg.hazeC, rg.haze, O);
    this.cone.mat.uniforms.uK.value = rg.cone; this.cone.mat.uniforms.uT.value = t;
    (this.cone.mat.uniforms.uCol.value as THREE.Vector3).set(...sc3(rg.spot, 0.075));
    this.cone.mesh.visible = rg.cone > 0.003;
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -LX + 0.1; this.posX.visible = c.x < LX - 0.1; this.ceil.visible = c.y < LY - 0.1;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { home: [-0.3, 1.45, 3.9, -0.5, 1.0, -0.8, 50], lab: [0.2, 1.6, 4.6, 0, 1.2, -0.8, 50] };
export class Sets {
  root = new THREE.Group();
  private home = new Home();
  private lab = new Lab();
  constructor() { this.root.add(this.home.root, this.lab.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM) {
      const pc = cam as THREE.PerspectiveCamera, o = place === "lab" ? LAB : HOME, d = DEBUG_VIEW[place];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = d[6]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    this.home.root.visible = place === "home";
    this.lab.root.visible = place === "lab";
    if (this.home.root.visible) this.home.update(id, t, f, cam);
    if (this.lab.root.visible) this.lab.update(id, t, f, cam);
  }
}
