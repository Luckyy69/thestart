// OWNER: sets. "Your Voice on Recordings": BEAN's golden-hour sunset BEDROOM and the 2013 voice-perception LAB with its
// padded LISTENING BOOTH and the animated RATING BOARD. Everything here is new: geometry, paintings, colours.
//
// Both sets light themselves with their OWN small shader rig (the world's lights never touch these materials):
//   - ambient warm-from-below / cool-blue-from-above (the blue shade), painted room AO, up to 10 soft point lights and
//     one soft spot (cone, soft edge),
//   - the LOW SUN THROUGH A WINDOW: a surface point is sunlit only if its ray toward the sun passes the window
//     aperture minus its glazing bars (ROOM: 2 x 3 panes + a hanging plant's leaf dapple) or venetian slats (LAB),
//     with a penumbra that widens with distance; ROOM: a big striped sunset patch on the back wall behind BEAN;
//     LAB: slatted stripes over the booth's foam back + the wall behind the researcher,
//   - the world's sun shadow map (cards keep their long shadows). looks.ts aims the world sun along the same window
//     sun (low, from the left behind the camera) for shots looking -z, so the cards' and props' shadows agree.
// A ray-marched haze shaft (NOINK, additive) shows the bars / slats in the air; dust motes glow only in the sun.
// Fairy lights, lantern, ring light and the board's glows are additive billboards on NOINK. Side walls / ceiling hide
// when the camera is outside them (cutaway). The rigs follow SHOTS + LOOK_RAMPS (room / xray; lab -> peak).
//
// CONTRACTS (LOCAL to the place anchor, metres; world = anchor + local):
//   ROOM = (0,0,0). Floor y 0, back wall z -1.4, side walls x +-2.6, ceiling 2.7, open toward +z (floor to z 5.5).
//     BEAN stands at (0,0,0). Floor kept clear for the crowd: x -1.4..1.4, z -0.75..2.2 (the bed's foot corner
//       x -1.75..-0.5 reaches z 0.55). The CAT can sit on the BED: duvet top y ~0.6 (e.g. (-0.85, 0.6, 0.2)).
//     Round rug centre (0.05, 0.35), radii 1.12 x 0.92, top y 0.012 (cards' feet at y 0 are fine).
//     SUN PATCH (golden, window bars) on the back wall x ~-0.95..1.2, y ~0.7..2.2 (behind BEAN).
//     BABY PHOTO frame centre (-0.62, 2.0, -1.36), outer 0.46 x 0.56 (photo 0.34 x 0.44); keep cards' heads off the
//       region x -0.9..-0.3, y 1.75..2.3 (back-wall coords) in shot 3. Photo fades in per micAt.life (kept in shot 5).
//     BED x -1.75..-0.5, z -1.4..0.55 (headboard top 1.05). Monstera pot (-0.3, 0, -1.12), guitar on the wall at
//       x 0.42, DESK x 0.72..1.92, z -1.4..-0.82, top 0.76 (laptop (1.38, 0.76, -1.08), RING LIGHT centre
//       (0.98, 1.34, -1.12) r 0.21), chair tucked in at (1.5, 0, -1.0). Posters (-1.3, 1.62) and (1.32, 1.86).
//       Fairy lights swag along y 2.2..2.45. Paper lantern (0.25, 2.37, 0.6).
//     WINDOW in the left wall x -2.6: z -0.55..0.45, y 1.0..2.5 (curtains, sunset view). In shot 2 (side view looking
//       -x) it sits right behind BEAN's head.
//   LAB = (3000,0,0). Floor y 0, back wall z -1.6, side walls x +-2.6, ceiling 3.0, open toward +z (floor to z 6.5).
//     STOOL for BEAN at (0, 0, 0.4): seat top y 0.62, r 0.19. DESK in front of him: top y 0.76,
//       x -0.55..0.55, z 0.58..1.04 (top free for the props tablet except a small amp at (0.42, 0.76, 0.94)).
//     BOOTH (padded, open to the camera): back panel x -0.86..0.86, z -0.77..-0.626, top 1.29; wings x +-(0.73..0.87),
//       z -0.77..-0.23, top 1.55 (red "IN USE" lamp on the right wing top (0.8, 1.6, -0.5)). Carpet top y 0.016.
//     RATING BOARD screen centre (0, 1.925, -1.495): screen x -1.24..1.24, y 1.16..2.69. Bars A..F at x = -0.8 + 0.32 i,
//       0.22 wide, 5 cm deep, baseline y 1.30, height 0.9 x ratingAt.bars[i]; letter badges at y 2.43; header y 2.61.
//       The crown sits on D's top (x 0.16). Board is OFF (dark glass) until ratingAt.show.
//     RESEARCHER's spot (1.2, 0, -0.5): floor clear x 0.9..1.6, z -1.2..0.3. WINDOW with venetian blinds in the
//       left wall x -2.6: z 0.2..1.5, y 0.95..2.45 (low warm sun from the left-front, across the booth).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { ROOM, LAB, SHOTS, LOOK_RAMPS, Look, W, smooth, clamp01, micAt, ratingAt } from "./story";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

/** exported contract points (world coordinates) */
export const BEAN_SPOT = add(ROOM, 0, 0, 0);
export const BABY_PHOTO = add(ROOM, -0.62, 2.0, -1.36);
export const BED_TOP = add(ROOM, -1.12, 0.6, -0.2);
export const DESK_ROOM = add(ROOM, 1.32, 0.76, -1.1);
export const STOOL = add(LAB, 0, 0.62, 0.4);
export const LAB_DESK_TOP = add(LAB, 0, 0.76, 0.85);
export const BOARD = add(LAB, 0, 1.925, -1.495);
export const BAR_X = [-0.8, -0.48, -0.16, 0.16, 0.48, 0.8].map((x) => LAB[0] + x);
export const BAR_BASE_Y = 1.3, BAR_H = 0.9;
export const RESEARCHER_SPOT = add(LAB, 1.2, 0, -0.5);

// ============================================================ the light shader (own rig)
const NL = 10;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uPP; uniform vec3 uPD; uniform vec3 uPC; uniform vec2 uPK; uniform vec3 uO; uniform vec4 uBox; uniform float uAO;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// sun through the window aperture (bars / slats + a leafy dapple from the top of the window), 0..1
float sunK(vec3 p, float leaf){
  float den = dot(uSD, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + uSD * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.003 + 0.009 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float d = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float d = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (leaf > 0.0 && uWM.w > 0.0) { // a hanging plant / tree outside: soft leafy dapple, mostly in the upper part, drifting
    vec2 s = a * 2.6 + vec2(sin(uTT * 0.37), cos(uTT * 0.29)) * 0.07;
    float nz = tn2(s + 7.0) * 0.62 + tn2(s * 2.9 + 3.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.5, 0.72 + pen * 2.0, nz) * smoothstep(-0.2, 0.5, a.y / uWH.y);
  }
  return k;
}
// painted AO: darken toward the floor / wall / ceiling corners of the room box
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
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.8 + 0.2 * sh) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.8 + 0.2 * sh) * (0.5 + 0.5 * ao);
  }
  vec3 dp = uPP - p; float pr2 = dot(dp, dp); vec3 pl = dp * inversesqrt(max(pr2, 1e-6));
  L += uPC * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * smoothstep(-0.1, 0.45, dot(n, pl)) / (1.0 + 0.25 * pr2) * (0.6 + 0.4 * sh);
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = sunK(p, 1.0); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * (0.25 + 0.75 * sh); }
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
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uMix;
#if defined(HAS_MAP) || defined(EMAP) || defined(SCRN)
uniform sampler2D uMap;
#endif
#ifdef MIX2
uniform sampler2D uMap2;
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
#ifdef MIX2
  tx = mix(tx, texture2D(uMap2, uv), uMix);
#endif
  vec3 c = uCol * vC * tx.rgb * lightAt(vW, n, sh) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm;
#endif
#ifdef SCRN
  c = uCol * vC * lightAt(vW, n, sh) + texture2D(uMap, uv).rgb * uEm;
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
type MOpt = { col?: string; map?: THREE.Texture; map2?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean; scrn?: boolean; rep?: [number, number] };
const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap && !o.scrn) defines.HAS_MAP = "1";
  if (o.map2) defines.MIX2 = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.scrn) defines.SCRN = "1";
  if (o.spec) defines.SPEC = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 },
      uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uMap2: { value: o.map2 ?? null }, uMix: { value: 0 },
      uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};

// ============================================================ volumetrics + glows (NOINK, additive)
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
          float acc = 0.0; float dt = tB / 24.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 24; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (p.y < uFloor + 0.01) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(0.5, 1.0, along));
            float nz = 0.6 + 0.4 * tn2(p.xz * 2.1 + vec2(p.y * 1.9, uTT * 0.07));
            acc += sunK(p, 0.0) * fall * nz * smoothstep(0.5, 1.4, length(p - cameraPosition));
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
          vec3 L = uSC * sunK(p, 0.0) * 0.8 + uPC * smoothstep(uPK.x, uPK.y, dot(-pl, uPD)) * 0.1 + (uAU + uAD) * 0.04;
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
type GlowItem = { p: THREE.Vector3; c: C3; s: number; g: number; tw?: number };
/** soft round glows (fairy bulbs, lamps, the board): camera-facing additive billboards; per-glow colour, size, group */
class Glows {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; gk = new THREE.Vector4(1, 1, 1, 1);
  constructor(parent: THREE.Object3D, items: GlowItem[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(), n = items.length;
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const P = new Float32Array(n * 4), Cc = new Float32Array(n * 4);
    items.forEach((it, i) => { P.set([it.p.x, it.p.y, it.p.z, it.s], i * 4); Cc.set([...it.c, it.g + (it.tw ?? 0) * 0.1], i * 4); });
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iC", new THREE.InstancedBufferAttribute(Cc, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uG: { value: this.gk }, uT: { value: 0 } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iC; uniform vec4 uG; uniform float uT; varying vec3 vC; varying vec2 vQ;
        void main(){
          vec3 p = (modelMatrix * vec4(iP.xyz, 1.0)).xyz;
          float gi = floor(iC.w + 0.01), tw = (iC.w - gi) * 10.0;
          float k = gi < 0.5 ? uG.x : gi < 1.5 ? uG.y : gi < 2.5 ? uG.z : uG.w;
          k *= 1.0 + tw * 0.22 * sin(uT * (2.1 + fract(p.x * 7.3) * 2.0) + p.x * 31.0 + p.y * 17.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = p + (right * position.x + up * position.y) * iP.w;
          float dist = length(cameraPosition - p);
          vQ = position.xy * 2.0; vC = iC.rgb * k * smoothstep(0.5, 1.2, dist);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 9.0) * 0.8 + exp(-r2 * 3.0) * 0.25; a *= 1.0 - smoothstep(0.8, 1.0, r2); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 7; parent.add(this.mesh);
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
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4, col?: string) {
    const c = clean(g, C(col)); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col?: string, mx?: THREE.Matrix4) {
    this.add(boxM(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), mat, mx, col);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4, col?: string, seg = 3) { this.add(new RoundedBoxGeometry(w, h, d, seg, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx, col); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, col?: string, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx, col); }
  lathe(mat: THREE.Material, pts: [number, number][], mx: THREE.Matrix4, seg = 28, col?: string) { this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, mx, col); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 14, col?: string) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx, col); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2, rs = 10) { this.add(new THREE.TorusGeometry(R, r, rs, 48, arc), mat, mx, col); }
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
/** same on a side wall at x = xw (u = z, holes in z) */
const wallX = (xw: number, z0: number, z1: number, y0: number, y1: number, holes: number[][] = []) => {
  const g = wallZ(z0, z1, y0, y1, 0, holes);
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
/** a plane (w x h, facing +z, uv 0..1) */
const pic = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
/** a hanging drape: vertical folds (facing +z), top edge at y=0 going down to -h, width w */
const drape = (w: number, h: number, folds: number, amp: number, seed: number) => {
  const g = new THREE.PlaneGeometry(w, h, Math.max(8, folds * 8), 6), p = g.getAttribute("position") as THREE.BufferAttribute, r = rng(seed);
  const ph = r() * 6.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), v = (h / 2 - y) / h;
    p.setXYZ(i, x * (1 - 0.25 * Math.sin(Math.PI * Math.min(1, v * 1.6)) * (v < 0.62 ? 1 : 0.6)), y - h / 2, amp * (0.55 + 0.45 * v) * Math.sin((x / w) * folds * Math.PI * 2 + ph + v * 0.6));
  }
  g.computeVertexNormals();
  return g;
};

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

// ---------------- ROOM textures
/** honey oak floorboards, 1.2 m tile, boards 0.15 m wide with staggered butt joints */
const oakTex = () => ctex("voOak", 1024, 1024, (g, r) => {
  const bw = 1024 / 8;
  for (let i = 0; i < 8; i++) {
    let y = -r() * 600;
    while (y < 1024) {
      const L = 380 + r() * 520, l = 0.86 + r() * 0.2, h = 30 + r() * 8;
      g.fillStyle = `hsl(${h},${52 + r() * 10}%,${Math.round(58 * l)}%)`; g.fillRect(i * bw, y, bw, L);
      for (let k = 0; k < 14; k++) { // grain
        g.strokeStyle = `rgba(120,70,30,${0.05 + r() * 0.1})`; g.lineWidth = 1 + r() * 2.5; g.beginPath();
        const x0 = i * bw + 6 + r() * (bw - 12); g.moveTo(x0, y); for (let s = 0; s <= 8; s++) g.lineTo(x0 + Math.sin(s * 0.9 + r() * 3) * 3, y + (s * L) / 8); g.stroke();
      }
      if (r() < 0.35) { g.fillStyle = "rgba(110,60,25,0.25)"; g.beginPath(); g.ellipse(i * bw + 20 + r() * (bw - 40), y + r() * L, 5 + r() * 5, 10 + r() * 8, 0, 0, 7); g.fill(); }
      g.fillStyle = "rgba(255,230,180,0.18)"; g.fillRect(i * bw + 3, y, 4, L);
      g.fillStyle = "rgba(70,35,15,0.55)"; g.fillRect(i * bw, y, bw, 3);
      y += L;
    }
    g.fillStyle = "rgba(60,30,12,0.6)"; g.fillRect(i * bw, 0, 3, 1024);
  }
  noise(g, 0, 0, 1024, 1024, r, 16000, 0.03);
});
/** dusty periwinkle wallpaper with tiny cream stars + moons, 0.6 m tile */
const wallpaperTex = () => ctex("voWallpaper", 1024, 1024, (g, r) => {
  g.fillStyle = "#aab0e2"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) blot(g, r() * 1024, r() * 1024, 50 + r() * 140, r() < 0.5 ? "196,200,240" : "140,146,206", 0.08, 1024, 1024);
  for (let k = 0; k < 16; k++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(k * 64, 0, 22, 1024); }
  const cell = 128;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const x = i * cell + (j % 2 ? cell / 2 : 0) + 64, y = j * cell + 64;
    g.fillStyle = "rgba(255,246,214,0.55)";
    if ((i + j) % 3 === 0) { g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); g.fillStyle = "#aab0e2"; g.beginPath(); g.arc(x + 7, y - 4, 12, 0, 7); g.fill(); }
    else { star(g, x, y, 11, 4.5); g.fill(); }
    g.fillStyle = "rgba(255,246,214,0.4)"; g.beginPath(); g.arc(x + 40, y + 34, 3, 0, 7); g.fill();
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** round woven rug: terracotta / mustard / cream rings + a teal border */
const rugTex = () => ctex("voRug", 1024, 1024, (g, r) => {
  g.fillStyle = "#2f8a8a"; g.fillRect(0, 0, 1024, 1024);
  const rings = ["#2f8a8a", "#f3e6c8", "#e07a4a", "#f3e6c8", "#f0b840", "#f3e6c8", "#e07a4a", "#c8503a"];
  rings.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(512, 512, 510 - i * 58, 0, 7); g.fill(); });
  for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; g.fillStyle = "rgba(255,250,235,0.85)"; g.beginPath(); g.arc(512 + Math.cos(a) * 475, 512 + Math.sin(a) * 475, 9, 0, 7); g.fill(); }
  for (let k = 0; k < 9000; k++) { const a = r() * 6.28, d = r() * 500; g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "60,30,20"},0.06)`; g.fillRect(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 2, 4); }
  g.strokeStyle = "rgba(60,30,20,0.18)"; g.lineWidth = 2; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(512, 512, 30 + k * 12, 0, 7); g.stroke(); }
});
/** duvet: mustard + cream big gingham with little stars */
const duvetTex = () => ctex("voDuvet", 1024, 1024, (g, r) => {
  g.fillStyle = "#fbefd2"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 8; k++) { g.fillStyle = "rgba(236,168,52,0.55)"; g.fillRect(k * 128, 0, 64, 1024); g.fillRect(0, k * 128, 1024, 64); }
  for (let k = 0; k < 8; k++) for (let j = 0; j < 8; j++) { g.fillStyle = "rgba(255,255,255,0.35)"; star(g, k * 128 + 96, j * 128 + 96, 12, 5); g.fill(); }
  for (let k = 0; k < 260; k++) blot(g, r() * 1024, r() * 1024, 30 + r() * 60, "180,110,40", 0.05, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.03);
});
/** a band poster */
const posterTex = (kind: number) => ctex("voPoster" + kind, 512, 704, (g, r) => {
  if (kind === 0) { // THE SQUEAKS: a hot-pink gig poster with a retro mic + lightning
    const gr = g.createLinearGradient(0, 0, 0, 704); gr.addColorStop(0, "#ff4f8b"); gr.addColorStop(1, "#7a2ad0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 704);
    for (let k = 0; k < 18; k++) { g.fillStyle = "rgba(255,230,120,0.12)"; g.beginPath(); g.moveTo(256, 330); const a = (k / 18) * Math.PI * 2; g.lineTo(256 + Math.cos(a) * 700, 330 + Math.sin(a) * 700); g.lineTo(256 + Math.cos(a + 0.15) * 700, 330 + Math.sin(a + 0.15) * 700); g.fill(); }
    g.fillStyle = "#1a1030"; rrect(g, 206, 200, 100, 170, 50); g.fill(); g.fillStyle = "#e8e8f0"; rrect(g, 216, 210, 80, 150, 40); g.fill();
    g.strokeStyle = "#1a1030"; g.lineWidth = 6; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(222, 235 + k * 22); g.lineTo(290, 235 + k * 22); g.stroke(); }
    g.fillStyle = "#1a1030"; g.fillRect(248, 370, 16, 90); g.fillRect(210, 455, 92, 14);
    g.fillStyle = "#ffe14a"; g.beginPath(); g.moveTo(120, 150); g.lineTo(170, 150); g.lineTo(145, 220); g.lineTo(180, 220); g.lineTo(110, 320); g.lineTo(132, 240); g.lineTo(100, 240); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(390, 160); g.lineTo(430, 160); g.lineTo(410, 215); g.lineTo(440, 215); g.lineTo(380, 300); g.lineTo(398, 235); g.lineTo(372, 235); g.closePath(); g.fill();
    otxt(g, "THE", 256, 60, 44, "#ffe14a", "#1a1030", 10); otxt(g, "SQUEAKS", 256, 120, 86, "#ffffff", "#1a1030", 14);
    otxt(g, "LIVE  TONIGHT", 256, 560, 40, "#ffe14a", "#1a1030", 8); txt(g, "doors 7pm  *  all ages", 256, 620, 26, "#ffffff");
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(0, 0, 512, 10);
  } else { // LOUD CLOUD world tour: teal, a happy cloud singing
    g.fillStyle = "#18b6b0"; g.fillRect(0, 0, 512, 704);
    for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? "#139a96" : "#18b6b0"; g.fillRect(0, 300 + k * 44, 512, 44); }
    g.fillStyle = "#ffffff"; g.strokeStyle = "#1c2440"; g.lineWidth = 10;
    g.beginPath(); for (const [x, y, rr] of [[170, 270, 70], [250, 230, 90], [340, 270, 70], [200, 320, 60], [300, 320, 65]]) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, 7); } g.stroke(); g.fill();
    g.fillStyle = "#1c2440"; g.beginPath(); g.arc(225, 268, 10, 0, 7); g.arc(290, 268, 10, 0, 7); g.fill();
    g.beginPath(); g.ellipse(258, 312, 30, 26, 0, 0, 7); g.fill(); g.fillStyle = "#ff6a7a"; g.beginPath(); g.ellipse(258, 322, 18, 12, 0, 0, 7); g.fill();
    g.fillStyle = "#ffe14a"; for (const [x, y] of [[120, 130], [400, 140], [430, 380]]) { g.save(); g.translate(x, y); g.beginPath(); g.ellipse(0, 0, 18, 14, -0.4, 0, 7); g.fill(); g.fillRect(14, -60, 7, 60); g.restore(); }
    otxt(g, "LOUD", 256, 470, 92, "#ffe14a", "#1c2440", 14); otxt(g, "CLOUD", 256, 560, 92, "#ffffff", "#1c2440", 14);
    txt(g, "WORLD TOUR", 256, 640, 34, "#1c2440");
  }
  noise(g, 0, 0, 512, 704, r, 6000, 0.04);
  g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 3; g.beginPath(); g.moveTo(20, 690); g.lineTo(60, 650); g.stroke();
});
/** the BABY PHOTO: baby BEAN, bald with one orange curl, freckles, wide-open bawling mouth, sound lines "WAAAH" */
const babyTex = () => ctex("voBaby", 512, 640, (g, r) => {
  const gr = g.createRadialGradient(256, 300, 40, 256, 320, 420); gr.addColorStop(0, "#d8f0ff"); gr.addColorStop(1, "#8cc4ec"); g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(255,255,255,0.55)"; star(g, 40 + r() * 430, 150 + r() * 60, 12, 5); g.fill(); }
  g.fillStyle = "#ffd84a"; g.strokeStyle = "#2a1a14"; g.lineWidth = 9; g.beginPath(); g.ellipse(256, 650, 220, 150, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(150 + k * 70, 580, 14, 0, 7); g.fill(); }
  g.fillStyle = "#ffd2b0"; g.beginPath(); g.ellipse(256, 340, 150, 170, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ff9a8a"; g.beginPath(); g.ellipse(160, 390, 38, 26, 0, 0, 7); g.ellipse(352, 390, 38, 26, 0, 0, 7); g.fill();
  g.strokeStyle = "#ff6a1a"; g.lineWidth = 16; g.lineCap = "round"; g.beginPath(); g.moveTo(250, 175); g.bezierCurveTo(230, 115, 300, 105, 300, 145); g.bezierCurveTo(300, 175, 262, 175, 268, 150); g.stroke();
  g.strokeStyle = "#2a1a14"; g.lineWidth = 9; g.lineCap = "round";
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256 + s * 95, 290); g.lineTo(256 + s * 50, 310); g.lineTo(256 + s * 95, 328); g.stroke(); }
  g.fillStyle = "#6ac8ff"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(256 + s * 110, 350, 10, 18, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(256 + s * 125, 405, 8, 14, 0, 0, 7); g.fill(); }
  g.fillStyle = "#d98a5a"; for (const [x, y] of [[200, 355], [214, 370], [190, 372], [312, 355], [298, 370], [322, 372]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  g.fillStyle = "#7a1a2a"; g.strokeStyle = "#2a1a14"; g.lineWidth = 9; g.beginPath(); g.ellipse(256, 430, 62, 58, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ff7a8a"; g.beginPath(); g.ellipse(256, 458, 36, 20, 0, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(236, 378, 16, 12);
  g.strokeStyle = "#ff3a6a"; g.lineWidth = 8; for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(256, 430, 170 + k * 26, s < 0 ? Math.PI - 0.35 : -0.35, s < 0 ? Math.PI + 0.35 : 0.35); g.stroke(); }
  otxt(g, "WAAAH!", 256, 82, 76, "#ff3a6a", "#ffffff", 14);
  g.fillStyle = "rgba(255,200,120,0.12)"; g.fillRect(0, 0, 512, 640);
  noise(g, 0, 0, 512, 640, r, 5000, 0.04);
});
/** the empty frame glass before micAt.life: dark glass with a soft reflection */
const blankTex = () => ctex("voBlank", 512, 640, (g) => {
  const gr = g.createLinearGradient(0, 0, 512, 640); gr.addColorStop(0, "#3a3f62"); gr.addColorStop(1, "#22263e"); g.fillStyle = gr; g.fillRect(0, 0, 512, 640);
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(60, 640); g.lineTo(180, 640); g.lineTo(470, 0); g.lineTo(350, 0); g.fill();
  g.fillStyle = "rgba(255,255,255,0.07)"; g.beginPath(); g.moveTo(220, 640); g.lineTo(250, 640); g.lineTo(540, 0); g.lineTo(510, 0); g.fill();
});
/** the SUNSET outside the bedroom window: big low sun, peach-rose sky, lilac rooftops + a tree */
const sunsetTex = () => ctex("voSunset", 1024, 768, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 768);
  gr.addColorStop(0, "#5a4a9a"); gr.addColorStop(0.3, "#c86a9a"); gr.addColorStop(0.55, "#ff9a6a"); gr.addColorStop(0.75, "#ffd08a"); gr.addColorStop(1, "#ffe8b0");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 768);
  const sx = 600, sy = 520;
  const hg = g.createRadialGradient(sx, sy, 20, sx, sy, 420); hg.addColorStop(0, "rgba(255,250,220,1)"); hg.addColorStop(0.18, "rgba(255,230,160,0.8)"); hg.addColorStop(1, "rgba(255,180,120,0)");
  g.fillStyle = hg; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = "#fff8e0"; g.beginPath(); g.arc(sx, sy, 70, 0, 7); g.fill();
  for (let k = 0; k < 7; k++) {
    const y = 140 + k * 55 + r() * 20, x = r() * 800, w = 200 + r() * 300;
    g.fillStyle = `rgba(${k < 3 ? "255,170,170" : "255,210,170"},0.55)`; rrect(g, x, y, w, 14 + r() * 10, 10); g.fill();
    g.fillStyle = "rgba(255,240,210,0.6)"; rrect(g, x + 20, y, w - 60, 5, 3); g.fill();
  }
  g.fillStyle = "#7a5a9a"; g.beginPath(); g.moveTo(0, 768);
  let x = 0; while (x < 1024) { const w = 60 + r() * 90, h = 560 + r() * 60; g.lineTo(x, h); g.lineTo(x + w * 0.5, h - 30 - r() * 30); g.lineTo(x + w, h); if (r() < 0.4) { g.lineTo(x + w, h - 50); g.lineTo(x + w + 14, h - 50); g.lineTo(x + w + 14, h); } x += w; }
  g.lineTo(1024, 768); g.fill();
  g.fillStyle = "#5a3e7a"; g.beginPath(); g.moveTo(0, 768); x = -40;
  while (x < 1024) { const w = 140 + r() * 120, h = 640 + r() * 50; g.lineTo(x, h); g.lineTo(x + w * 0.5, h - 70); g.lineTo(x + w, h); x += w; }
  g.lineTo(1024, 768); g.fill();
  for (let k = 0; k < 14; k++) { g.fillStyle = "rgba(255,220,120,0.9)"; g.fillRect(40 + r() * 940, 660 + r() * 90, 12, 16); }
  g.fillStyle = "#3e2a5a";
  for (let k = 0; k < 26; k++) { g.beginPath(); g.arc(90 + r() * 170, 200 + r() * 300, 40 + r() * 50, 0, 7); g.fill(); }
  g.fillRect(160, 450, 26, 320);
});
/** laptop screen: a music app with a waveform */
const laptopTex = () => ctex("voLaptop", 512, 320, (g, r) => {
  g.fillStyle = "#1c1f3a"; g.fillRect(0, 0, 512, 320);
  g.fillStyle = "#2c3060"; g.fillRect(0, 0, 512, 34); txt(g, "my_demo_FINAL(3).wav", 256, 17, 18, "#cfd6ff", "center", "normal");
  g.strokeStyle = "#ff5a9a"; g.lineWidth = 3; g.beginPath();
  for (let x = 20; x < 492; x += 3) { const a = (0.25 + 0.75 * Math.abs(Math.sin(x * 0.021))) * (0.4 + 0.6 * r()) * 70; g.moveTo(x, 160 - a); g.lineTo(x, 160 + a); }
  g.stroke();
  g.fillStyle = "#ffe14a"; g.fillRect(190, 70, 3, 180);
  g.fillStyle = "#ff5a9a"; g.beginPath(); g.arc(256, 280, 18, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(250, 270); g.lineTo(266, 280); g.lineTo(250, 290); g.fill();
});
/** book spines (one row) */
const spinesTex = () => ctex("voSpines", 512, 256, (g, r) => {
  let x = 0; const cols = ["#e0403a", "#2f8ad0", "#f0b840", "#3aa06a", "#8a4ac8", "#f07a3a", "#2a3a6a", "#e8e0c8"];
  while (x < 512) { const w = 22 + r() * 30, c = cols[Math.floor(r() * cols.length)]; g.fillStyle = c; g.fillRect(x, 0, w, 256); g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 4, 40, w - 8, 8); g.fillRect(x + 4, 200, w - 8, 6); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(x + w - 3, 0, 3, 256); x += w; }
});

// ---------------- LAB textures
/** speckled vinyl tiles, 0.5 m tiles in two cool greys */
const vinylTex = () => ctex("voVinyl", 1024, 1024, (g, r) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = (i + j) % 2 ? "#b9c4d2" : "#cdd6e0"; g.fillRect(i * 512, j * 512, 512, 512);
    for (let k = 0; k < 1800; k++) { g.fillStyle = r() < 0.5 ? "rgba(70,80,100,0.3)" : "rgba(255,255,255,0.5)"; g.fillRect(i * 512 + r() * 512, j * 512 + r() * 512, 2 + r() * 3, 2 + r() * 3); }
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(i * 512 + 3, j * 512 + 3, 506, 4);
  }
  g.strokeStyle = "rgba(60,70,90,0.45)"; g.lineWidth = 3; for (const k of [0, 512, 1024]) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 1024); g.moveTo(0, k); g.lineTo(1024, k); g.stroke(); }
  for (let k = 0; k < 30; k++) blot(g, r() * 1024, r() * 1024, 80 + r() * 160, "255,255,255", 0.05, 1024, 1024);
});
/** pale cool lab paint, 1.2 m tile */
const labWallTex = () => ctex("voLabWall", 1024, 1024, (g, r) => {
  g.fillStyle = "#dfe6ee"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 200; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 140, r() < 0.5 ? "245,248,252" : "190,200,214", 0.08, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.025);
});
/** wedge acoustic foam (deep blue-slate), baked soft light from the upper left; 0.3 m tile */
const foamTex = () => ctex("voFoam", 768, 768, (g, r) => {
  const n = 6, s = 768 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = i * s, y = j * s, vert = (i + j) % 2 === 0;
    for (let k = 0; k < 2; k++) {
      const a = vert ? x + k * (s / 2) : x, b = vert ? y : y + k * (s / 2), w = vert ? s / 2 : s, h = vert ? s : s / 2;
      const gr = vert ? g.createLinearGradient(a, 0, a + w, 0) : g.createLinearGradient(0, b, 0, b + h);
      gr.addColorStop(0, "#5a6aa0"); gr.addColorStop(0.48, "#3e4c80"); gr.addColorStop(0.52, "#2a3462"); gr.addColorStop(1, "#1e2650");
      g.fillStyle = gr; g.fillRect(a, b, w, h);
      g.fillStyle = "rgba(160,180,240,0.35)"; if (vert) g.fillRect(a + w * 0.47, b + 4, 3, h - 8); else g.fillRect(a + 4, b + h * 0.47, w - 8, 3);
    }
    g.strokeStyle = "rgba(10,14,34,0.55)"; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3);
  }
  for (let k = 0; k < 26000; k++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,20,0.18)" : "rgba(200,210,255,0.08)"; g.fillRect(r() * 768, r() * 768, 1.5, 1.5); }
});
/** the campus outside the lab window (2013): blue sky, warm low sun, trees, a brick building */
const campusTex = () => ctex("voCampus", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#7ab0e8"); gr.addColorStop(0.55, "#c8dcf0"); gr.addColorStop(0.8, "#ffe0b0"); gr.addColorStop(1, "#ffd090");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  const hg = g.createRadialGradient(780, 720, 20, 780, 720, 380); hg.addColorStop(0, "rgba(255,245,210,1)"); hg.addColorStop(1, "rgba(255,220,160,0)"); g.fillStyle = hg; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#b86a4a"; g.fillRect(120, 520, 420, 504); g.fillStyle = "#9a5a3e"; g.fillRect(120, 500, 420, 30);
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { g.fillStyle = (i + j) % 3 ? "#e8f0f8" : "#ffd88a"; g.fillRect(150 + i * 80, 560 + j * 90, 48, 56); g.fillStyle = "#9a5a3e"; g.fillRect(150 + i * 80, 586 + j * 90, 48, 4); }
  for (let k = 0; k < 40; k++) { g.fillStyle = k % 2 ? "#4a9a52" : "#3a8a48"; g.beginPath(); g.arc(560 + r() * 460, 640 + r() * 260, 50 + r() * 60, 0, 7); g.fill(); }
  for (let k = 0; k < 20; k++) { g.fillStyle = "#5aaa5e"; g.beginPath(); g.arc(r() * 140, 700 + r() * 260, 40 + r() * 50, 0, 7); g.fill(); }
  g.fillStyle = "#6a8a5a"; g.fillRect(0, 960, 1024, 64);
});
const signTex = () => ctex("voQuiet", 1024, 256, (g) => {
  g.fillStyle = "#1c2440"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#e8413a"; g.fillRect(0, 0, 1024, 18); g.fillRect(0, 238, 1024, 18);
  otxt(g, "QUIET PLEASE", 512, 100, 92, "#ffffff", "#1c2440", 4); txt(g, "LISTENING TEST IN PROGRESS", 512, 182, 50, "#ffd34a");
});
const labPosterTex = () => ctex("voLabPoster", 512, 704, (g, r) => {
  g.fillStyle = "#f4f2ea"; g.fillRect(0, 0, 512, 704); g.fillStyle = "#2a62c8"; g.fillRect(0, 0, 512, 120);
  txt(g, "PERCEPTION LAB", 256, 48, 44, "#ffffff"); txt(g, "voice study  *  2013", 256, 94, 26, "#cfe0ff", "center", "normal");
  g.strokeStyle = "#2a2a3a"; g.lineWidth = 10; g.fillStyle = "#ffd2b0";
  g.beginPath(); g.moveTo(300, 200); g.bezierCurveTo(420, 190, 440, 330, 380, 400); g.bezierCurveTo(350, 440, 360, 500, 310, 520); g.bezierCurveTo(260, 540, 250, 470, 280, 450); g.bezierCurveTo(240, 380, 200, 220, 300, 200); g.fill(); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(330, 260); g.bezierCurveTo(380, 270, 380, 340, 340, 360); g.stroke();
  g.strokeStyle = "#2a62c8"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(220, 360, 40 + k * 40, Math.PI * 0.7, Math.PI * 1.3); g.stroke(); }
  for (let k = 0; k < 7; k++) { g.fillStyle = "#b8bcc8"; g.fillRect(50, 580 + k * 16, 300 + r() * 110, 7); }
});
const clockTex = () => ctex("voClock", 512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#1c2440"; for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.save(); g.translate(256 + Math.sin(a) * 210, 256 - Math.cos(a) * 210); g.rotate(a); g.fillRect(-6, -20, 12, 40); g.restore(); }
  g.strokeStyle = "#1c2440"; g.lineCap = "round"; g.lineWidth = 18; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 110, 256 - 60); g.stroke();
  g.lineWidth = 12; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 - 40, 256 - 170); g.stroke();
  g.strokeStyle = "#e8413a"; g.lineWidth = 5; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 60, 256 + 160); g.stroke();
  g.fillStyle = "#1c2440"; g.beginPath(); g.arc(256, 256, 16, 0, 7); g.fill();
});
const inUseTex = () => ctex("voInUse", 256, 96, (g) => { g.fillStyle = "#3a0806"; g.fillRect(0, 0, 256, 96); txt(g, "IN USE", 128, 50, 62, "#ffd8d0"); });

// ---------------- the RATING BOARD screen (redrawn when the rating state changes)
const BAR_COL: C3[] = [[0.12, 0.62, 1.0], [0.4, 0.42, 1.0], [1.0, 0.3, 0.8], [1.0, 0.62, 0.08], [0.15, 0.95, 0.55], [0.3, 0.65, 1.0]];
const BAR_HEX = ["#5accff", "#8c9aff", "#f280d8", "#ffb82e", "#66f2b2", "#80c0ff"];
class BoardTex {
  cv: HTMLCanvasElement; tex: THREE.CanvasTexture; key = ""; W = 1024; H = 640;
  constructor() {
    this.cv = document.createElement("canvas"); this.cv.width = this.W; this.cv.height = this.H;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    this.draw([0, 0, 0, 0, 0, 0], 0, 0);
  }
  /** screen space: x -1.24..1.24 -> 0..W, y 2.69..1.16 -> 0..H */
  sx(x: number) { return ((x + 1.24) / 2.48) * this.W; }
  sy(y: number) { return ((2.69 - y) / 1.53) * this.H; }
  draw(bars: number[], own: number, q: number) {
    const key = bars.map((b) => Math.round(b * 200)).join(",") + "|" + Math.round(own * 60) + "|" + (own < 0.4 ? q : 0);
    if (key === this.key) return; this.key = key;
    const g = this.cv.getContext("2d")!, W = this.W, H = this.H;
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#16245a"); gr.addColorStop(1, "#0a1230"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const y0 = this.sy(BAR_BASE_Y), y1 = this.sy(BAR_BASE_Y + BAR_H);
    g.strokeStyle = "rgba(120,160,255,0.16)"; g.lineWidth = 2;
    for (let k = 0; k <= 10; k++) { const y = y0 + ((y1 - y0) * k) / 10; g.beginPath(); g.moveTo(this.sx(-1.2), y); g.lineTo(this.sx(1.2), y); g.stroke(); }
    for (const k of [0, 5, 10]) txt(g, String(k), this.sx(-1.2) + 4, y0 + ((y1 - y0) * k) / 10 - 12, 18, "rgba(170,200,255,0.75)", "left");
    g.strokeStyle = "rgba(170,200,255,0.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(this.sx(-1.2), y0); g.lineTo(this.sx(1.2), y0); g.stroke();
    g.fillStyle = "#1e3070"; g.fillRect(0, 0, W, this.sy(2.53)); g.fillStyle = "#ffd34a"; g.fillRect(0, this.sy(2.53) - 4, W, 4);
    txt(g, "RATE EACH VOICE", W / 2, this.sy(2.611), 42, "#ffffff");
    txt(g, "2013", W - 64, this.sy(2.611), 28, "#ffd34a");
    g.fillStyle = "#5accff"; for (let k = 0; k < 5; k++) { const h = [10, 22, 34, 18, 26][k]; g.fillRect(36 + k * 10, this.sy(2.611) - h / 2, 6, h); }
    for (let i = 0; i < 6; i++) {
      const xc = this.sx(BX[i]), yb = this.sy(2.43), isD = i === 3, gold = isD ? own : 0;
      g.fillStyle = isD ? `rgb(${Math.round(42 + 213 * gold)},${Math.round(60 + 150 * gold)},${Math.round(128 - 88 * gold)})` : "#2a3c80";
      g.beginPath(); g.arc(xc, yb, 28, 0, 7); g.fill();
      g.strokeStyle = isD ? `rgba(255,230,140,${0.5 + 0.5 * gold})` : "rgba(140,180,255,0.6)"; g.lineWidth = 4; g.stroke();
      txt(g, "ABCDEF"[i], xc, yb + 2, 38, isD && gold > 0.5 ? "#3a2000" : "#ffffff");
      const b = bars[i];
      if (!isD && b > 0.03) txt(g, (b * 10).toFixed(1), xc, this.sy(BAR_BASE_Y + BAR_H * b) - 24, 30, BAR_HEX[i]);
    }
    // D is the mystery voice until "their own voice": "???" pulses in its empty column
    const qa = (1 - smooth(own / 0.35)) * (0.78 + 0.22 * Math.sin(q * 0.45));
    if (qa > 0.01) { g.globalAlpha = qa; otxt(g, "???", this.sx(BX[3]), this.sy(2.05), 64, "#ffd34a", "#0a1230", 8); g.globalAlpha = 1; }
    g.fillStyle = "rgba(255,255,255,0.025)"; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
    this.tex.needsUpdate = true;
  }
}

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

// ============================================================ the ROOM (BEAN's bedroom, golden-hour sunset)
const RX = 2.6, RZ = -1.4, RY = 2.7, RZF = 5.5;
const RWIN = { z0: -0.55, z1: 0.45, y0: 1.0, y1: 2.5 };
const PHOTO = { x: -0.62, y: 2.0, w: 0.34, h: 0.44 };
type RoomRig = { au: C3; ad: C3; sun: C3; patchB: C3; winB: C3; fill: C3; lamp: C3; ring: C3; ringEm: C3; laptop: number; view: C3; fairy: number; haze: number; hazeC: C3; motes: number; photoGlow: number };
const ROOM_RIGS: Partial<Record<Look, RoomRig>> = {
  room: {
    au: [0.3, 0.33, 0.5], ad: [0.36, 0.25, 0.2], sun: [3.3, 2.0, 0.92], patchB: [0.62, 0.34, 0.14], winB: [0.5, 0.3, 0.18], fill: [0.2, 0.22, 0.34],
    lamp: [0.4, 0.26, 0.12], ring: [0.32, 0.34, 0.4], ringEm: [2.2, 2.25, 2.4], laptop: 1.0, view: [1.1, 1.0, 0.95], fairy: 1.0, haze: 0.3, hazeC: [1.0, 0.66, 0.36], motes: 1.3, photoGlow: 1,
  },
  xray: {
    au: [0.045, 0.08, 0.2], ad: [0.02, 0.035, 0.085], sun: [0.25, 0.45, 1.05], patchB: [0.03, 0.07, 0.18], winB: [0.05, 0.12, 0.32], fill: [0.04, 0.07, 0.18],
    lamp: [0.0, 0.0, 0.0], ring: [0.02, 0.05, 0.1], ringEm: [0.15, 0.3, 0.6], laptop: 0.35, view: [0.16, 0.28, 0.62], fairy: 0.22, haze: 0.14, hazeC: [0.3, 0.6, 1.2], motes: 0.8, photoGlow: 0.2,
  },
};
class Room {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  viewMat!: THREE.ShaderMaterial; lampMat!: THREE.ShaderMaterial; ringMat!: THREE.ShaderMaterial; laptopMat!: THREE.ShaderMaterial; photoMat!: THREE.ShaderMaterial;
  bulbMat!: THREE.MeshBasicMaterial;
  haze: Haze; motes: Motes; glows!: Glows;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...ROOM);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat(); // fu = furniture (casts world shadows)
    const floor = imat(S, { map: oakTex(), rep: [1 / 1.2, 1 / 1.2], spec: 30, specK: 0.25 });
    const paper = imat(S, { map: wallpaperTex(), rep: [1 / 0.6, 1 / 0.6] });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 90, specK: 1.0 });
    const wood = imat(S, { map: oakTex(), rep: [1 / 1.2, 1 / 1.2], spec: 40, specK: 0.3 });
    const ceilM = imat(S, { col: "#f6eee6" });
    const TRIM = "#fbf4ea", MUST = "#f0b13a", TEAL = "#2f8a8a", PLUM = "#6a3a7a";
    // ---- floor, walls, ceiling, skirting, cornice ----
    b.add(flat(-RX, RZ, RX, RZF, 0), floor);
    b.add(wallZ(-RX, RX, 0, RY, RZ), paper);
    bn.add(wallX(-RX, RZ, RZF, 0, RY, [[RWIN.z0, RWIN.z1, RWIN.y0, RWIN.y1]]), paper);
    bp.add(wallX(RX, RZ, RZF, 0, RY, [[1.2, 2.1, 0, 2.08]]), paper);
    bc.add(flat(-RX, RZ, RX, RZF, RY), ceilM);
    b.box(paint, -RX, 0, RZ, RX, 0.13, RZ + 0.022, TRIM); b.box(paint, -RX, RY - 0.08, RZ, RX, RY, RZ + 0.05, TRIM);
    for (const [bb, x, s] of [[bn, -RX, 1], [bp, RX, -1]] as [Bat, number, number][]) { bb.box(paint, x, 0, RZ, x + s * 0.022, 0.13, RZF, TRIM); bb.box(paint, x, RY - 0.08, RZ, x + s * 0.05, RY, RZF, TRIM); }
    // ---- round rug under BEAN (its own thin disc ON the floor) ----
    {
      const rg = new THREE.CylinderGeometry(1, 1, 0.012, 64, 1); rg.translate(0, 0.006, 0);
      const uv = rg.getAttribute("uv") as THREE.BufferAttribute, p = rg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.5 + p.getX(i) * 0.5, 0.5 - p.getZ(i) * 0.5);
      b.add(rg, imat(S, { map: rugTex() }), TRS(0.05, 0, 0.35, 0, 0, 0, [1.12, 1, 0.92]));
    }
    // ---- the BED (headboard on the back wall), duvet + pillows + a plushie + a hoodie ----
    {
      const x0 = -1.75, x1 = -0.5, z0 = RZ, z1 = 0.55, xc = (x0 + x1) / 2;
      fu.rbox(paint, x1 - x0, 0.26, z1 - z0 - 0.04, 0.03, TRS(xc, 0.15, (z0 + z1) / 2 + 0.02), "#c88a52");
      for (const x of [x0 + 0.05, x1 - 0.05]) fu.box(paint, x - 0.03, 0, z1 - 0.06, x + 0.03, 0.04, z1, "#8a5a32");
      fu.rbox(plain, x1 - x0 - 0.06, 0.2, z1 - z0 - 0.1, 0.06, TRS(xc, 0.37, (z0 + z1) / 2 + 0.02), "#f6f0e6");
      fu.rbox(gloss, x1 - x0 + 0.1, 1.05, 0.1, 0.08, TRS(xc, 0.525, z0 + 0.055), MUST, 4);
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) fu.sph(gloss, TRS(x0 + 0.2 + i * 0.29 + (j ? 0.145 : 0), 0.72 + j * 0.18, z0 + 0.105, 0, 0, 0, [0.022, 0.022, 0.012]), 10, "#c4862a");
      const DW = x1 - x0 + 0.08, DL = 1.45;
      const dg = new THREE.BoxGeometry(DW, 0.1, DL, 26, 2, 30), dp = dg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < dp.count; i++) {
        const x = dp.getX(i), y = dp.getY(i), z = dp.getZ(i);
        const bump = 0.022 * Math.sin(x * 9 + z * 4) * Math.sin(z * 7 - x * 3) + 0.035 * Math.exp(-((x + 0.15) ** 2 + (z - 0.1) ** 2) * 6);
        const edge = Math.abs(x) / (DW / 2);
        dp.setY(i, y + (y > 0 ? bump - Math.max(0, edge - 0.9) * 0.5 : 0));
      }
      dg.computeVertexNormals();
      const duv = dg.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < duv.count; i++) duv.setXY(i, (dp.getX(i) + 1) * 0.9, (dp.getZ(i) + 1) * 0.9);
      fu.add(dg, imat(S, { map: duvetTex(), spec: 10, specK: 0.06 }), TRS(xc, 0.52, z1 - DL / 2 + 0.02));
      fu.rbox(plain, DW - 0.02, 0.09, 0.22, 0.04, TRS(xc, 0.535, z1 - DL - 0.06, 0, -0.1), "#f6f0e6");
      fu.sph(plain, TRS(xc - 0.25, 0.6, z0 + 0.3, 0.1, -0.35, 0, [0.28, 0.1, 0.17]), 18, "#fbf6ee");
      fu.sph(plain, TRS(xc + 0.28, 0.6, z0 + 0.3, -0.12, -0.35, 0, [0.26, 0.1, 0.16]), 18, "#fbf6ee");
      fu.rbox(plain, 0.3, 0.28, 0.1, 0.06, TRS(xc + 0.05, 0.72, z0 + 0.42, 0.1, -0.35, 0.1), TEAL, 3);
      fu.sph(plain, TRS(xc - 0.36, 0.7, z0 + 0.42, 0, 0, 0, [0.07, 0.08, 0.06]), 14, "#f4c8d8");
      fu.sph(plain, TRS(xc - 0.36, 0.8, z0 + 0.44, 0, 0, 0, 0.055), 14, "#f4c8d8");
      for (const s of [-1, 1]) fu.sph(plain, TRS(xc - 0.36 + s * 0.025, 0.89, z0 + 0.44, 0, 0, s * 0.25, [0.016, 0.055, 0.012]), 10, "#f4c8d8");
      fu.sph(gloss, TRS(xc - 0.375, 0.81, z0 + 0.49, 0, 0, 0, 0.007), 8, "#2a1a14"); fu.sph(gloss, TRS(xc - 0.345, 0.81, z0 + 0.49, 0, 0, 0, 0.007), 8, "#2a1a14");
      fu.rbox(plain, 0.38, 0.05, 0.28, 0.025, TRS(xc + 0.1, 0.61, 0.15, 0.4, 0, 0.04), PLUM, 3);
      fu.rbox(plain, 0.1, 0.04, 0.32, 0.02, TRS(xc + 0.32, 0.6, 0.25, 0.9, 0, 0.0), PLUM, 3);
    }
    // ---- monstera in a terracotta pot (between bed and BEAN; it throws leaf shadows into the sun patch) ----
    {
      const px = -0.3, pz = -1.12;
      fu.lathe(gloss, [[0.001, 0], [0.11, 0], [0.15, 0.3], [0.165, 0.31], [0.165, 0.35], [0.14, 0.35], [0.001, 0.33]], TRS(px, 0, pz), 28, "#d06a42");
      const r = rng(77);
      for (let k = 0; k < 9; k++) {
        const a = -2.4 + (k / 8) * 2.1 + (r() - 0.5) * 0.3, L = 0.55 + r() * 0.45, tilt = 0.5 + r() * 0.5;
        const tip = V3(px + Math.cos(a) * 0.35 * tilt, 0.34 + L, pz + 0.06 + Math.sin(a) * 0.12);
        fu.tube(plain, [V3(px, 0.34, pz), V3(px + Math.cos(a) * 0.12, 0.34 + L * 0.55, pz + 0.04), tip], 0.008, 12, "#4a8a3a", 5);
        const lg = new THREE.CircleGeometry(0.16 + r() * 0.06, 24);
        const lp = lg.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i), ang = Math.atan2(y, x), notch = 1 - 0.26 * Math.max(0, Math.sin(ang * 7)) * (Math.hypot(x, y) > 0.08 ? 1 : 0); lp.setXYZ(i, x * notch, y * notch * 1.15, -0.3 * (x * x + y * y)); }
        lg.computeVertexNormals();
        fu.add(lg, plain, TRS(tip.x, tip.y, tip.z, a + Math.PI / 2 + 0.3, -0.5 - r() * 0.4, 0), k % 2 ? "#3f9a4a" : "#2f8a42");
      }
    }
    // ---- acoustic GUITAR leaning on the wall right of BEAN ----
    {
      const sh = new THREE.Shape();
      sh.moveTo(0, -0.24); sh.bezierCurveTo(0.24, -0.24, 0.23, 0.02, 0.13, 0.06); sh.bezierCurveTo(0.2, 0.12, 0.17, 0.27, 0, 0.27);
      sh.bezierCurveTo(-0.17, 0.27, -0.2, 0.12, -0.13, 0.06); sh.bezierCurveTo(-0.23, 0.02, -0.24, -0.24, 0, -0.24);
      const eg = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
      const M = new THREE.Matrix4().compose(V3(0.42, 0.25, -1.24), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0, -0.06, "YXZ")), V3(1, 1, 1));
      fu.add(eg, gloss, M, "#e08a3a");
      const top = new THREE.Matrix4().multiplyMatrices(M, TRS(0, 0, 0.093));
      fu.add(new THREE.CircleGeometry(0.06, 28), plain, top.clone().multiply(TRS(0, 0.06, 0.001)), "#2a1408");
      fu.add(new THREE.RingGeometry(0.065, 0.078, 32), plain, top.clone().multiply(TRS(0, 0.06, 0.002)), "#f6e0b0");
      fu.box(gloss, -0.07, -0.17, 0, 0.07, -0.145, 0.012, "#3a2010", top);
      fu.box(gloss, -0.024, 0.2, -0.01, 0.024, 0.74, 0.012, "#7a4a22", top);
      fu.rbox(gloss, 0.075, 0.15, 0.03, 0.012, top.clone().multiply(TRS(0, 0.81, 0)), "#3a2010");
      for (const y of [0.76, 0.8, 0.84]) for (const s of [-1, 1]) fu.cyl(metal, 0.008, 0.008, 0.02, 8, top.clone().multiply(TRS(s * 0.045, y, 0, 0, 0, Math.PI / 2)), "#e8e0c8");
      fu.cyl(gloss, 0.045, 0.06, 0.04, 16, TRS(0.42, 0.02, -1.2), "#2a2a30");
    }
    // ---- DESK (right) with laptop, RING LIGHT, mug, cactus, a little speaker, the chair tucked in ----
    {
      const x0 = 0.72, x1 = 1.92, z0 = RZ, z1 = -0.82, top = 0.76;
      fu.box(wood, x0, top - 0.035, z0 + 0.01, x1, top, z1, "#ffffff");
      for (const x of [x0 + 0.04, x1 - 0.04]) for (const z of [z0 + 0.05, z1 - 0.04]) fu.rod(metal, V3(x, 0, z), V3(x, top - 0.035, z), 0.018, 10, "#2a2a32");
      fu.box(paint, x1 - 0.45, 0.42, z0 + 0.03, x1 - 0.04, top - 0.035, z1 + 0.02, "#f6f0e6");
      fu.box(paint, x1 - 0.43, 0.44, z1 + 0.02, x1 - 0.06, 0.56, z1 + 0.03, TEAL); fu.box(paint, x1 - 0.43, 0.58, z1 + 0.02, x1 - 0.06, 0.7, z1 + 0.03, TEAL);
      const lx = 1.38, lz = -1.08;
      fu.rbox(metal, 0.34, 0.018, 0.24, 0.008, TRS(lx, top + 0.009, lz), "#c8ccd4");
      fu.box(plain, lx - 0.15, top + 0.0185, lz - 0.09, lx + 0.15, top + 0.021, lz + 0.03, "#3a3e48");
      const sm = TRS(lx, top + 0.018, lz - 0.12, 0, -0.32);
      fu.rbox(metal, 0.34, 0.24, 0.012, 0.005, new THREE.Matrix4().multiplyMatrices(sm, TRS(0, 0.12, -0.006)), "#c8ccd4");
      this.laptopMat = imat(S, { map: laptopTex(), emap: true, em: [1, 1, 1] });
      fu.add(pic(0.31, 0.2), this.laptopMat, new THREE.Matrix4().multiplyMatrices(sm, TRS(0, 0.125, 0.0015)));
      const rx = 0.98, ry = 1.34, rz = -1.12;
      fu.cyl(metal, 0.06, 0.07, 0.025, 18, TRS(rx, top + 0.012, rz), "#2a2a32");
      fu.rod(metal, V3(rx, top, rz), V3(rx, ry - 0.21, rz), 0.012, 8, "#2a2a32");
      fu.torus(gloss, 0.21, 0.03, TRS(rx, ry, rz, 0.15), "#2a2a32", Math.PI * 2, 12);
      this.ringMat = imat(S, { col: "#000000", em: [2.2, 2.25, 2.4] });
      fu.torus(this.ringMat, 0.21, 0.018, TRS(rx, ry, rz, 0.15).multiply(TRS(0, 0, 0.022)), "#ffffff", Math.PI * 2, 10);
      fu.cyl(gloss, 0.03, 0.03, 0.06, 12, TRS(rx, ry, rz, 0.15, Math.PI / 2), "#2a2a32");
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.1], [0.038, 0.1], [0.001, 0.095]], TRS(1.66, top, -1.0), 18, "#ff6a7a");
      for (let k = 0; k < 4; k++) fu.rod(plain, V3(1.66 + (k - 1.5) * 0.012, top + 0.05, -1.0), V3(1.66 + (k - 1.5) * 0.03, top + 0.2, -1.0 + (k % 2) * 0.02), 0.006, 6, ["#ffd34a", "#2f8ad0", "#e0403a", "#3aa06a"][k]);
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.05, 0.07], [0.001, 0.07]], TRS(1.82, top, -1.25), 16, "#f2ece0");
      fu.sph(plain, TRS(1.82, top + 0.12, -1.25, 0, 0, 0, [0.035, 0.07, 0.035]), 12, "#4a9a52");
      fu.sph(gloss, TRS(1.82, top + 0.2, -1.25, 0, 0, 0, 0.015), 8, "#ff6a9a");
      fu.rbox(gloss, 0.12, 0.18, 0.12, 0.02, TRS(1.14, top + 0.09, -1.3), "#2a2a32");
      fu.cyl(gloss, 0.04, 0.04, 0.01, 18, TRS(1.14, top + 0.11, -1.239, 0, Math.PI / 2), "#4a4a54");
      // chair tucked in under the desk
      fu.cyl(metal, 0.03, 0.03, 0.42, 10, TRS(1.5, 0.24, -1.0), "#2a2a32"); fu.cyl(metal, 0.24, 0.26, 0.03, 20, TRS(1.5, 0.03, -1.0), "#2a2a32");
      fu.rbox(gloss, 0.46, 0.08, 0.44, 0.04, TRS(1.5, 0.48, -1.0), "#e8413a");
      fu.rbox(gloss, 0.44, 0.42, 0.07, 0.05, TRS(1.5, 0.98, -0.74, 0, 0.05), "#e8413a");
      fu.rod(metal, V3(1.5, 0.5, -0.76), V3(1.5, 0.78, -0.76), 0.02, 8, "#2a2a32");
    }
    // ---- posters, the BABY PHOTO frame, a shelf above the bed ----
    {
      const posters: [number, number, number, number][] = [[-1.3, 1.62, 0.44, 0.6], [1.32, 1.86, 0.48, 0.66]];
      posters.forEach(([x, y, w, h], k) => {
        const M = TRS(x, y, RZ + 0.004, 0, 0, k ? 0.025 : -0.02);
        fu.add(pic(w, h), imat(S, { map: posterTex(k ? 0 : 1), spec: 40, specK: 0.15 }), M);
        for (const dx of [-1, 1]) fu.sph(gloss, new THREE.Matrix4().multiplyMatrices(M, TRS((dx * w) / 2 - dx * 0.025, h / 2 - 0.025, 0.004, 0, 0, 0, [0.012, 0.012, 0.006])), 8, k ? "#ffd34a" : "#e8413a");
      });
      const { x, y, w, h } = PHOTO;
      fu.rbox(gloss, w + 0.12, h + 0.12, 0.04, 0.02, TRS(x, y, RZ + 0.02), "#e0a83a", 3);
      fu.box(plain, x - w / 2 - 0.025, y - h / 2 - 0.025, RZ + 0.04, x + w / 2 + 0.025, y + h / 2 + 0.025, RZ + 0.041, "#fbf4e4");
      this.photoMat = imat(S, { map: blankTex(), map2: babyTex(), spec: 60, specK: 0.3 });
      fu.add(pic(w, h), this.photoMat, TRS(x, y, RZ + 0.0425));
      fu.rod(metal, V3(x - 0.12, y + h / 2 + 0.06, RZ + 0.02), V3(x, y + h / 2 + 0.2, RZ + 0.006), 0.003, 5, "#8a6a3a");
      fu.rod(metal, V3(x + 0.12, y + h / 2 + 0.06, RZ + 0.02), V3(x, y + h / 2 + 0.2, RZ + 0.006), 0.003, 5, "#8a6a3a");
      fu.sph(metal, TRS(x, y + h / 2 + 0.2, RZ + 0.01, 0, 0, 0, 0.012), 8, "#c8a040");
      const sx0 = -2.3, sx1 = -1.6, sy = 2.02;
      fu.box(wood, sx0, sy - 0.03, RZ, sx1, sy, RZ + 0.22, "#ffffff");
      fu.box(plain, sx0 + 0.02, sy, RZ + 0.03, sx0 + 0.38, sy + 0.2, RZ + 0.169, "#3a3050");
      fu.add(pic(0.36, 0.2), imat(S, { map: spinesTex() }), TRS(sx0 + 0.2, sy + 0.1, RZ + 0.1705));
      fu.lathe(gloss, [[0.001, 0], [0.06, 0], [0.07, 0.1], [0.001, 0.1]], TRS(sx1 - 0.12, sy, RZ + 0.11), 18, "#f2ece0");
      const r = rng(19);
      for (let k = 0; k < 6; k++) {
        const L = 0.3 + r() * 0.55, p0 = V3(sx1 - 0.12, sy + 0.1, RZ + 0.12), pts = [p0, V3(p0.x + (r() - 0.5) * 0.2, sy + 0.02, RZ + 0.22), V3(p0.x + (r() - 0.5) * 0.3, sy - L, RZ + 0.2 + r() * 0.06)];
        fu.tube(plain, pts, 0.004, 12, "#3f7a3a", 5);
        const cv = new THREE.CatmullRomCurve3(pts);
        for (let q = 1; q < 7; q++) { const P = cv.getPoint(q / 7); fu.sph(gloss, TRS(P.x, P.y, P.z + 0.01, k + q, 0.5, 0.5, [0.03, 0.006, 0.024]), 8, q % 2 ? "#5aa04a" : "#79b858"); }
      }
    }
    // ---- the WINDOW (left wall): reveal, sash bars, sill pots, curtains on a rod, a macrame plant ----
    {
      const { z0, z1, y0, y1 } = RWIN, D = 0.18, xb = -RX - 0.1;
      bn.box(paint, -RX - D, y0, z0 - 0.002, -RX, y1, z0, TRIM); bn.box(paint, -RX - D, y0, z1, -RX, y1, z1 + 0.002, TRIM); bn.box(paint, -RX - D, y1, z0, -RX, y1 + 0.002, z1, TRIM);
      for (const [a, c, d, e] of [[z0 - 0.06, z0, y0 - 0.02, y1 + 0.06], [z1, z1 + 0.06, y0 - 0.02, y1 + 0.06], [z0 - 0.06, z1 + 0.06, y1, y1 + 0.06]]) bn.box(paint, -RX, d, a, -RX + 0.025, e, c, TRIM);
      for (const [a, c, d, e] of [[z0, z0 + 0.04, y0, y1], [z1 - 0.04, z1, y0, y1], [z0, z1, y1 - 0.04, y1], [z0, z1, y0, y0 + 0.04]]) bn.box(paint, xb - 0.022, d, a, xb + 0.022, e, c, TRIM);
      const zm = (z0 + z1) / 2; bn.box(paint, xb - 0.018, y0 + 0.04, zm - 0.018, xb + 0.018, y1 - 0.04, zm + 0.018, TRIM);
      for (const k of [1, 2]) { const y = y0 + ((y1 - y0) * k) / 3; bn.box(paint, xb - 0.018, y - 0.018, z0 + 0.04, xb + 0.018, y + 0.018, z1 - 0.04, TRIM); }
      bn.box(paint, -RX - D, y0 - 0.05, z0 - 0.1, -RX + 0.13, y0, z1 + 0.1, TRIM);
      bn.lathe(gloss, [[0.001, 0], [0.045, 0], [0.055, 0.08], [0.001, 0.08]], TRS(-RX + 0.05, y0, z0 + 0.18), 16, "#3a8ad8");
      bn.sph(plain, TRS(-RX + 0.05, y0 + 0.15, z0 + 0.18, 0, 0, 0, [0.035, 0.08, 0.035]), 12, "#4a9a52");
      bn.lathe(gloss, [[0.001, 0], [0.05, 0], [0.06, 0.06], [0.001, 0.06]], TRS(-RX + 0.05, y0, z1 - 0.2), 16, "#ffd34a");
      for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; bn.sph(plain, TRS(-RX + 0.05 + Math.cos(a) * 0.03, y0 + 0.08, z1 - 0.2 + Math.sin(a) * 0.03, a, 0.6, 0, [0.03, 0.012, 0.018]), 8, "#7ac08a"); }
      bn.rod(metal, V3(-RX + 0.09, y1 + 0.14, z0 - 0.45), V3(-RX + 0.09, y1 + 0.14, z1 + 0.45), 0.014, 10, "#c8a040");
      for (const z of [z0 - 0.47, z1 + 0.47]) bn.sph(metal, TRS(-RX + 0.09, y1 + 0.14, z, 0, 0, 0, 0.03), 12, "#c8a040");
      const cur = imat(S, { spec: 20, specK: 0.12 });
      for (const [zc, sd] of [[z0 - 0.24, 3], [z1 + 0.24, 5]] as [number, number][]) bn.add(drape(0.42, y1 + 0.1, 3, 0.035, sd), cur, TRS(-RX + 0.11, y1 + 0.12, zc, Math.PI / 2), PLUM);
      for (const z of [z0 - 0.24, z1 + 0.24]) bn.torus(gloss, 0.1, 0.016, TRS(-RX + 0.11, 1.05, z, 0, Math.PI / 2), MUST);
      bn.rod(plain, V3(-RX - 0.06, y1, -0.05), V3(-RX - 0.06, y1 - 0.4, -0.05), 0.004, 5, "#f2e6c8");
      bn.lathe(gloss, [[0.001, 0], [0.07, 0], [0.09, 0.12], [0.001, 0.12]], TRS(-RX - 0.06, y1 - 0.52, -0.05), 16, "#f2ece0");
      const r = rng(23);
      for (let k = 0; k < 7; k++) {
        const pts = [V3(-RX - 0.06, y1 - 0.42, -0.05), V3(-RX - 0.06 + (r() - 0.5) * 0.12, y1 - 0.5, -0.05 + (r() - 0.5) * 0.25), V3(-RX - 0.06 + (r() - 0.5) * 0.1, y1 - 0.75 - r() * 0.35, -0.05 + (r() - 0.5) * 0.4)];
        bn.tube(plain, pts, 0.004, 10, "#3f7a3a", 5);
        const cv = new THREE.CatmullRomCurve3(pts);
        for (let q = 1; q < 6; q++) { const P = cv.getPoint(q / 6); bn.sph(gloss, TRS(P.x, P.y, P.z, k + q, 0.5, 0.5, [0.012, 0.03, 0.024]), 8, q % 2 ? "#5aa04a" : "#79b858"); }
      }
      this.viewMat = imat(S, { map: sunsetTex(), emap: true, em: [1, 1, 1] });
      const card = new THREE.Mesh(clean(new THREE.PlaneGeometry(6, 4.5).rotateY(Math.PI / 2)), this.viewMat);
      card.position.set(-RX - 2.4, 1.6, -0.05); card.layers.set(NOINK); card.frustumCulled = false; R.add(card);
    }
    // ---- right wall: a door (teal) with a yellow sign ----
    {
      bp.box(paint, RX - 0.02, 0, 1.2, RX - 0.055, 2.08, 2.1, TEAL);
      for (const [y0, y1] of [[0.15, 0.95], [1.1, 1.92]]) bp.box(paint, RX - 0.055, y0, 1.3, RX - 0.065, y1, 2.0, "#26746f");
      bp.sph(gloss, TRS(RX - 0.09, 1.0, 1.98, 0, 0, 0, 0.03), 12, "#c8a040");
      for (const [a, c] of [[1.12, 1.2], [2.1, 2.18]]) bp.box(paint, RX - 0.035, 0, a, RX, 2.16, c, TRIM);
      bp.box(paint, RX - 0.035, 2.08, 1.12, RX, 2.16, 2.18, TRIM);
      bp.rbox(paint, 0.02, 0.18, 0.36, 0.01, TRS(RX - 0.075, 1.55, 1.65), "#ffd34a");
    }
    // ---- paper lantern (ceiling) ----
    {
      bc.rod(plain, V3(0.25, RY, 0.6), V3(0.25, 2.5, 0.6), 0.005, 6, "#2a2a2a");
      this.lampMat = imat(S, { col: "#ffffff", em: [0.6, 0.45, 0.3] });
      bc.sph(this.lampMat, TRS(0.25, 2.37, 0.6, 0, 0, 0, [0.14, 0.12, 0.14]), 24, "#fff4e0");
    }
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    // ---- fairy lights: a swag along the back wall (wire inked, bulbs + glows on NOINK) ----
    {
      const wire = new Bat(), pts: THREE.Vector3[] = [], bulbs: THREE.Vector3[] = [];
      const xs = [-2.45, -1.6, -0.75, 0.1, 0.95, 1.8, 2.45];
      for (let i = 0; i < xs.length - 1; i++) {
        const a = xs[i], c = xs[i + 1];
        for (let k = 0; k <= 12; k++) { if (i > 0 && k === 0) continue; const u = k / 12; pts.push(V3(a + (c - a) * u, 2.44 - 0.2 * Math.sin(Math.PI * u) - (i % 2 ? 0.03 : 0), RZ + 0.035 + 0.02 * Math.sin(Math.PI * u))); }
      }
      wire.tube(plain, pts, 0.0035, 240, "#2a3a2a", 5);
      for (const x of xs) wire.sph(gloss, TRS(x, 2.445, RZ + 0.02, 0, 0, 0, 0.012), 8, "#c8a040");
      wire.build(R);
      const cv = new THREE.CatmullRomCurve3(pts);
      for (let k = 0; k < 44; k++) bulbs.push(cv.getPoint((k + 0.5) / 44).add(V3(0, -0.018, 0.006)));
      const cols: C3[] = [[2.6, 1.7, 0.7], [2.6, 1.4, 0.9], [2.3, 1.9, 0.9]];
      this.bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.8, 0.8) });
      const sg = new THREE.SphereGeometry(0.011, 10, 6), merged: THREE.BufferGeometry[] = [];
      for (const p of bulbs) merged.push(sg.clone().translate(p.x, p.y, p.z));
      const bm = new THREE.Mesh(mergeGeometries(merged, false), this.bulbMat); bm.layers.set(NOINK); bm.frustumCulled = false; R.add(bm);
      const items: GlowItem[] = bulbs.map((p, k) => ({ p, c: sc3(cols[k % 3], 0.18), s: 0.11, g: 0, tw: 1 }));
      items.push({ p: V3(0.25, 2.37, 0.6), c: [0.5, 0.36, 0.2], s: 0.75, g: 1 });            // lantern
      items.push({ p: V3(0.98, 1.34, -1.08), c: [0.22, 0.23, 0.26], s: 0.75, g: 2 });       // ring light
      items.push({ p: V3(1.38, 0.88, -1.17), c: [0.12, 0.08, 0.2], s: 0.45, g: 3 });        // laptop
      this.glows = new Glows(R, items);
    }
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 900, 31, [-2.5, 0.6, -1.35, 1.6, 2.5, 0.6]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), ROOM_RIGS, "room");
    // the low sunset sun through the left window: one big striped golden patch on the back wall behind BEAN
    const wc = V3(-RX - 0.1, (RWIN.y0 + RWIN.y1) / 2, (RWIN.z0 + RWIN.z1) / 2);
    const sd = V3(wc.x - 0.15, wc.y - 1.42, wc.z - RZ).normalize(); // toward the sun (patch centre (0.15, 1.42) on the back wall)
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(1, 0, 0);
    (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((RWIN.z1 - RWIN.z0) / 2 - 0.04, (RWIN.y1 - RWIN.y0) / 2 - 0.04);
    (S.u.uWM.value as THREE.Vector4).set(2, 3, 0.018, 0.4);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(RX, RZ, RY, 0); S.u.uAO.value = 1;
    (S.u.uPC.value as THREE.Vector3).set(0, 0, 0);
    S.u.uTT.value = t;
    const life = id === 5 ? 1 : micAt(id, t).life;
    const glowLife = id === 3 ? life * (1 - smooth((t - 25.0) / 1.2)) : 0;
    setLights(S, [
      { p: W2(0.15, 1.42, RZ + 0.5), c: rg.patchB, r: 1.7 },                    // bounce off the sun patch
      { p: W2(-2.2, 1.7, -0.05), c: rg.winB, r: 1.5 },                          // window glow
      { p: W2(0.2, 1.6, 3.6), c: rg.fill, r: 3.6 },                             // cool front fill
      { p: W2(0.25, 2.2, 0.6), c: rg.lamp, r: 1.4 },                            // paper lantern
      { p: W2(0.98, 1.34, -0.95), c: rg.ring, r: 0.9 },                         // ring light
      { p: W2(1.38, 0.95, -0.95), c: sc3([0.12, 0.08, 0.22], rg.laptop), r: 0.45 },
      { p: W2(0, 2.3, RZ + 0.2), c: sc3([0.3, 0.2, 0.09], rg.fairy), r: 1.2 },   // fairy lights
      { p: W2(-1.8, 2.3, RZ + 0.2), c: sc3([0.3, 0.2, 0.09], rg.fairy), r: 1.0 },
      { p: W2(PHOTO.x, PHOTO.y, RZ + 0.35), c: sc3([0.9, 0.6, 0.3], glowLife * rg.photoGlow), r: 0.5 }, // the photo "lights up"
      { p: W2(-1.1, 0.9, 0.9), c: sc3(rg.winB, 0.35), r: 1.2 },
    ], rg.au, rg.ad);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(...rg.view);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(...sc3([0.6, 0.45, 0.3], rg.fairy));
    (this.ringMat.uniforms.uEm.value as THREE.Vector3).set(...rg.ringEm);
    (this.laptopMat.uniforms.uEm.value as THREE.Vector3).set(rg.laptop, rg.laptop, rg.laptop);
    this.photoMat.uniforms.uMix.value = smooth(life);
    (this.photoMat.uniforms.uEm.value as THREE.Vector3).set(...sc3([0.5, 0.36, 0.2], glowLife * rg.photoGlow * smooth(life)));
    this.bulbMat.color.setRGB(2.6 * rg.fairy + 0.15, 1.8 * rg.fairy + 0.25, 0.8 * rg.fairy + 0.5 * (1 - rg.fairy));
    this.glows.gk.set(rg.fairy, rg.fairy, rg.ringEm[0] / 2.2, rg.laptop); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(wc, V3(0, 0, 1), V3(0, 1, 0), (RWIN.z1 - RWIN.z0) / 2, (RWIN.y1 - RWIN.y0) / 2, sd.clone().negate(), 3.4, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -RX + 0.1; this.posX.visible = c.x < RX - 0.1; this.ceil.visible = c.y < RY - 0.1;
  }
}

// ============================================================ the LAB (2013 voice-perception lab)
const LX = 2.6, LZ = -1.6, LY = 3.0, LZF = 6.5;
const LWIN = { z0: 0.2, z1: 1.5, y0: 0.95, y1: 2.45 };
const BX = [-0.8, -0.48, -0.16, 0.16, 0.48, 0.8], BZ = -1.495;
const LSPOT = { p: V3(0, 2.95, 1.6), aim: V3(0, 0.9, 0.3) };
type LabRig = { au: C3; ad: C3; sun: C3; tube: C3; tubeEm: C3; spot: C3; fill: C3; warm: C3; view: number; haze: number; hazeC: C3; motes: number; board: number; dGlow: C3; inUse: number };
const LAB_RIGS: Partial<Record<Look, LabRig>> = {
  lab: { au: [0.34, 0.4, 0.52], ad: [0.18, 0.18, 0.2], sun: [3.2, 2.15, 1.15], tube: [0.55, 0.62, 0.7], tubeEm: [2.0, 2.2, 2.4], spot: [0, 0, 0], fill: [0.2, 0.24, 0.34], warm: [0.16, 0.1, 0.05], view: 1.1, haze: 0.24, hazeC: [1.0, 0.8, 0.55], motes: 1.0, board: 1.0, dGlow: [1.6, 1.0, 0.25], inUse: 1 },
  peak: { au: [0.36, 0.22, 0.34], ad: [0.32, 0.16, 0.14], sun: [4.6, 2.5, 1.5], tube: [0.62, 0.42, 0.4], tubeEm: [2.4, 1.7, 1.5], spot: [3.4, 2.0, 1.5], fill: [0.28, 0.14, 0.24], warm: [0.5, 0.22, 0.14], view: 1.15, haze: 0.38, hazeC: [1.0, 0.62, 0.5], motes: 1.5, board: 1.1, dGlow: [2.4, 1.4, 0.4], inUse: 1 },
};
class Lab {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  tubeMat!: THREE.ShaderMaterial; viewMat!: THREE.ShaderMaterial; screenMat!: THREE.ShaderMaterial; inUseMat!: THREE.ShaderMaterial;
  barMats: THREE.ShaderMaterial[] = []; bars: THREE.Mesh[] = []; crown = new THREE.Group(); crownMat!: THREE.ShaderMaterial;
  board = new BoardTex();
  haze: Haze; motes: Motes; glows: Glows;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...LAB);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat();
    const floor = imat(S, { map: vinylTex(), rep: [1, 1], spec: 50, specK: 0.3 });
    const wall = imat(S, { map: labWallTex(), rep: [1 / 1.2, 1 / 1.2] });
    const foam = imat(S, { map: foamTex(), rep: [1 / 0.6, 1 / 0.6] });
    const plain = imat(S, {}), gloss = imat(S, { spec: 50, specK: 0.45 }), metal = imat(S, { spec: 80, specK: 0.9 }), paint = imat(S, { spec: 30, specK: 0.15 });
    const ceilM = imat(S, { col: "#eef2f6" });
    const BLUE = "#2a62c8", STEEL = "#c4cad2", DARK = "#22262e", WHITE2 = "#f4f6f8", FELT = "#25356a";
    // ---- floor, walls, ceiling, a blue stripe band at dado height ----
    b.add(flat(-LX, LZ, LX, LZF, 0), floor);
    b.add(wallZ(-LX, LX, 0, LY, LZ), wall);
    bn.add(wallX(-LX, LZ, LZF, 0, LY, [[LWIN.z0, LWIN.z1, LWIN.y0, LWIN.y1]]), wall);
    bp.add(wallX(LX, LZ, LZF, 0, LY), wall);
    bc.add(flat(-LX, LZ, LX, LZF, LY), ceilM);
    b.box(paint, -LX, 0, LZ, LX, 0.1, LZ + 0.02, DARK); b.box(gloss, -LX, 0.9, LZ, LX, 0.98, LZ + 0.018, BLUE);
    for (const [bb, x, s] of [[bn, -LX, 1], [bp, LX, -1]] as [Bat, number, number][]) { bb.box(paint, x, 0, LZ, x + s * 0.02, 0.1, LZF, DARK); bb.box(gloss, x, 0.9, LZ, x + s * 0.018, 0.98, LZF, BLUE); }
    for (let x = -2.4; x <= 2.41; x += 0.6) bc.box(paint, x - 0.012, LY - 0.02, LZ, x + 0.012, LY, LZF, "#d4dae2");
    for (let z = -1.4; z <= 6.41; z += 0.6) bc.box(paint, -LX, LY - 0.021, z - 0.012, LX, LY - 0.001, z + 0.012, "#d4dae2");
    this.tubeMat = imat(S, { col: "#000000", em: [2, 2.2, 2.4] });
    for (const [x, z] of [[-0.9, 0.5], [0.9, 0.5], [0, -0.9]] as [number, number][]) {
      bc.box(metal, x - 0.32, LY - 0.06, z - 0.62, x + 0.32, LY - 0.025, z + 0.62, STEEL);
      bc.box(this.tubeMat, x - 0.28, LY - 0.066, z - 0.58, x + 0.28, LY - 0.061, z + 0.58, "#ffffff");
    }
    // ---- the RATING BOARD: a big wall screen (bezel, mount), 3D bars + crown driven in update() ----
    {
      fu.rbox(gloss, 2.62, 1.67, 0.08, 0.03, TRS(0, 1.925, LZ + 0.05), "#14161c", 3);
      this.screenMat = imat(S, { map: this.board.tex, scrn: true, col: "#0c1224", em: [0, 0, 0], spec: 80, specK: 0.6 });
      fu.add(pic(2.48, 1.53), this.screenMat, TRS(0, 1.925, BZ));
      fu.rbox(gloss, 0.3, 0.035, 0.05, 0.012, TRS(1.05, 1.11, BZ + 0.02), "#2a2e38");
      fu.rbox(gloss, 1.2, 0.08, 0.08, 0.03, TRS(0, 1.03, LZ + 0.06), "#20242c");
      for (let k = 0; k < 24; k++) fu.cyl(plain, 0.008, 0.008, 0.004, 8, TRS(-0.5 + k * 0.0435, 1.03, LZ + 0.1, 0, Math.PI / 2), "#3a3e48");
      for (let i = 0; i < 6; i++) fu.box(plain, BX[i] - 0.12, BAR_BASE_Y - 0.012, BZ + 0.001, BX[i] + 0.12, BAR_BASE_Y, BZ + 0.012, "#2a3c80");
      const bg = new THREE.BoxGeometry(0.22, 1, 0.05); bg.translate(0, 0.5, 0.025);
      for (let i = 0; i < 6; i++) {
        const m = imat(S, { col: "#404040", em: BAR_COL[i], spec: 60, specK: 0.4 });
        const mesh = new THREE.Mesh(clean(bg), m); mesh.position.set(BX[i], BAR_BASE_Y, BZ + 0.003); mesh.scale.set(1, 0.004, 1);
        mesh.visible = false; mesh.receiveShadow = true; mesh.frustumCulled = false; R.add(mesh); this.bars.push(mesh); this.barMats.push(m);
      }
      this.crownMat = imat(S, { col: "#ffc83a", em: [0.6, 0.4, 0.05], spec: 70, specK: 1.2 });
      const cb = new Bat();
      cb.lathe(this.crownMat, [[0.1, 0], [0.105, 0.004], [0.105, 0.05], [0.095, 0.054], [0.092, 0.004]], TRS(0, 0, 0), 32);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + Math.PI / 2, x = Math.cos(a) * 0.098, z = Math.sin(a) * 0.098;
        cb.add(new THREE.ConeGeometry(0.035, 0.11, 4), this.crownMat, TRS(x, 0.1, z, -a + Math.PI / 4));
        cb.sph(this.crownMat, TRS(x * 1.02, 0.16, z * 1.02, 0, 0, 0, 0.016), 10);
      }
      const gem = imat(S, { col: "#ff3a6a", em: [0.5, 0.05, 0.15], spec: 90, specK: 1.5 });
      for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + (k - 1) * 0.6; cb.sph(gem, TRS(Math.cos(a) * 0.108, 0.028, Math.sin(a) * 0.108, 0, 0, 0, [0.016, 0.016, 0.008]), 10); }
      cb.build(this.crown); this.crown.visible = false; R.add(this.crown);
      for (const s of [-1, 1]) {
        const x = s * 1.66;
        fu.box(metal, x - 0.04, 1.9, LZ, x + 0.04, 1.94, LZ + 0.22, "#3a3e48");
        const sm = TRS(x, 2.12, LZ + 0.2, -s * 0.25);
        fu.rbox(gloss, 0.24, 0.36, 0.26, 0.03, sm, "#1c1e24");
        fu.cyl(gloss, 0.075, 0.07, 0.02, 24, sm.clone().multiply(TRS(0, -0.05, 0.13, 0, Math.PI / 2)), "#e8e8ee");
        fu.cyl(gloss, 0.03, 0.025, 0.022, 16, sm.clone().multiply(TRS(0, 0.1, 0.13, 0, Math.PI / 2)), "#e8e8ee");
      }
    }
    // ---- the padded LISTENING BOOTH (open toward the camera) ----
    {
      const z0 = -0.75, zb = -0.63, zf = -0.25, WH = 1.55;
      fu.rbox(gloss, 1.72, 1.29, 0.14, 0.06, TRS(0, 0.645, (z0 + zb) / 2 - 0.01), FELT, 4);
      fu.box(foam, -0.74, 0.1, zb - 0.01, 0.74, 1.19, zb + 0.004, "#ffffff");
      for (const s of [-1, 1]) {
        const xc = s * 0.8;
        fu.rbox(gloss, 0.14, WH, zf - z0 + 0.04, 0.06, TRS(xc, WH / 2, (z0 + zf) / 2), FELT, 4);
        fu.box(foam, s * 0.715, 0.12, zb + 0.01, s * 0.729, WH - 0.1, zf - 0.04, "#ffffff");
        fu.rod(gloss, V3(xc, 0.05, zf + 0.022), V3(xc, WH - 0.05, zf + 0.022), 0.012, 8, "#ffc83a");
      }
      fu.rod(gloss, V3(-0.73, 1.29, zb + 0.005), V3(0.73, 1.29, zb + 0.005), 0.012, 8, "#ffc83a");
      fu.box(plain, -0.88, 0, -0.78, 0.88, 0.014, 1.25, "#2c3a70");
      fu.box(plain, -0.84, 0.014, -0.74, 0.84, 0.016, 1.21, "#34448a");
      fu.rbox(gloss, 0.2, 0.09, 0.1, 0.02, TRS(0.8, 1.6, -0.5), "#1c1e24");
      this.inUseMat = imat(S, { map: inUseTex(), emap: true, em: [2.2, 1.2, 1.1] });
      fu.add(pic(0.16, 0.06), this.inUseMat, TRS(0.8, 1.6, -0.448));
      fu.add(pic(0.16, 0.06), this.inUseMat, TRS(0.8, 1.6, -0.552, Math.PI));
    }
    // ---- BEAN's STOOL + the DESK in front of him ----
    {
      const sx = 0, sz = 0.4;
      fu.cyl(gloss, 0.19, 0.19, 0.07, 32, TRS(sx, 0.585, sz), "#1c2a5a");
      fu.torus(gloss, 0.19, 0.03, TRS(sx, 0.585, sz, 0, Math.PI / 2), "#1c2a5a");
      fu.cyl(metal, 0.035, 0.035, 0.5, 12, TRS(sx, 0.3, sz), STEEL);
      fu.torus(metal, 0.15, 0.012, TRS(sx, 0.26, sz, 0, Math.PI / 2), STEEL);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.4; fu.rod(metal, V3(sx, 0.08, sz), V3(sx + Math.cos(a) * 0.24, 0.02, sz + Math.sin(a) * 0.24), 0.016, 8, STEEL); fu.sph(gloss, TRS(sx + Math.cos(a) * 0.24, 0.022, sz + Math.sin(a) * 0.24, 0, 0, 0, 0.022), 10, DARK); }
      const x0 = -0.55, x1 = 0.55, z0 = 0.58, z1 = 1.04, top = 0.76;
      fu.rbox(gloss, x1 - x0, 0.03, z1 - z0, 0.012, TRS(0, top - 0.015, (z0 + z1) / 2), WHITE2, 2);
      for (const x of [x0 + 0.04, x1 - 0.04]) for (const z of [z0 + 0.04, z1 - 0.04]) fu.rod(metal, V3(x, 0.016, z), V3(x, top - 0.03, z), 0.014, 10, STEEL);
      fu.rod(metal, V3(x0 + 0.04, 0.12, z1 - 0.04), V3(x1 - 0.04, 0.12, z1 - 0.04), 0.01, 8, STEEL);
      fu.box(plain, x0 + 0.06, top - 0.06, z0 + 0.03, x1 - 0.06, top - 0.031, z0 + 0.06, "#2a2e38");
      fu.rbox(gloss, 0.14, 0.05, 0.1, 0.01, TRS(0.42, top + 0.025, z1 - 0.1), "#2a2e38");
      fu.cyl(gloss, 0.016, 0.016, 0.02, 14, TRS(0.42, top + 0.03, z1 - 0.049, 0, Math.PI / 2), "#c8ccd4");
    }
    // ---- left part of the back wall: lab poster, the QUIET sign, a ficus, a coat stand with a lab coat ----
    {
      fu.add(pic(0.5, 0.69), imat(S, { map: labPosterTex(), spec: 30, specK: 0.15 }), TRS(-1.95, 1.65, LZ + 0.004));
      fu.box(paint, -2.22, 2.25, LZ, -1.68, 2.45, LZ + 0.03, "#1c2440");
      fu.add(pic(0.52, 0.13), imat(S, { map: signTex() }), TRS(-1.95, 2.35, LZ + 0.031));
      fu.torus(gloss, 0.17, 0.02, TRS(1.95, 2.45, LZ + 0.02), "#1c2440");
      fu.add(new THREE.CircleGeometry(0.165, 36), imat(S, { map: clockTex() }), TRS(1.95, 2.45, LZ + 0.012));
      fu.lathe(gloss, [[0.001, 0], [0.13, 0], [0.16, 0.36], [0.001, 0.36]], TRS(-1.6, 0, -1.2), 24, WHITE2);
      fu.rod(plain, V3(-1.6, 0.36, -1.2), V3(-1.62, 1.1, -1.2), 0.02, 8, "#6a4a2a");
      const r = rng(5);
      for (let k = 0; k < 30; k++) fu.sph(plain, TRS(-1.6 + (r() - 0.5) * 0.6, 1.1 + r() * 0.6, -1.2 + (r() - 0.5) * 0.45, r() * 6, r(), 0, [0.11, 0.07, 0.1]), 10, k % 2 ? "#3f9a4a" : "#2f8a42");
      fu.rod(metal, V3(-2.3, 0, -0.95), V3(-2.3, 1.8, -0.95), 0.018, 8, "#3a3e48");
      fu.cyl(metal, 0.2, 0.22, 0.03, 18, TRS(-2.3, 0.015, -0.95), "#3a3e48");
      fu.rbox(plain, 0.34, 0.9, 0.12, 0.05, TRS(-2.3, 1.3, -0.89, 0.2), WHITE2, 3);
    }
    // ---- right part: the researcher's corner — a cart with a mixer + laptop, a filing cabinet ----
    {
      const cx = 1.95, cz = -1.05;
      fu.box(metal, cx - 0.35, 0.85, cz - 0.28, cx + 0.35, 0.88, cz + 0.28, STEEL); fu.box(metal, cx - 0.35, 0.25, cz - 0.28, cx + 0.35, 0.28, cz + 0.28, STEEL);
      for (const x of [cx - 0.32, cx + 0.32]) for (const z of [cz - 0.25, cz + 0.25]) { fu.rod(metal, V3(x, 0.06, z), V3(x, 0.88, z), 0.012, 8, STEEL); fu.sph(gloss, TRS(x, 0.035, z, 0, 0, 0, 0.035), 10, DARK); }
      fu.rbox(gloss, 0.36, 0.06, 0.24, 0.015, TRS(cx - 0.1, 0.91, cz + 0.08), "#2a2e38");
      for (let k = 0; k < 8; k++) fu.box(plain, cx - 0.26 + k * 0.04, 0.94, cz + 0.02, cx - 0.25 + k * 0.04, 0.945, cz + 0.16, "#e8e8ee");
      const lm = TRS(cx + 0.12, 0.888, cz - 0.1, -0.3);
      fu.rbox(metal, 0.32, 0.016, 0.22, 0.006, lm.clone().multiply(TRS(0, 0.008, 0)), "#c8ccd4");
      fu.rbox(metal, 0.32, 0.2, 0.012, 0.005, lm.clone().multiply(TRS(0, 0.016, -0.11, 0, -0.25).multiply(TRS(0, 0.1, 0))), "#c8ccd4");
      fu.box(paint, 2.2, 0, LZ + 0.02, 2.58, 1.3, LZ + 0.6, "#8a96a8");
      for (let k = 0; k < 3; k++) { fu.box(paint, 2.22, 0.08 + k * 0.4, LZ + 0.6, 2.56, 0.44 + k * 0.4, LZ + 0.612, "#9aa6b8"); fu.box(metal, 2.33, 0.36 + k * 0.4, LZ + 0.612, 2.45, 0.38 + k * 0.4, LZ + 0.63, STEEL); }
      fu.box(gloss, 2.24, 1.3, LZ + 0.1, 2.5, 1.4, LZ + 0.42, "#f0d040");
    }
    // ---- the WINDOW with venetian blinds (left wall) + the campus outside ----
    {
      const { z0, z1, y0, y1 } = LWIN, D = 0.22;
      bn.box(wall, -LX - D, y0, z0 - 0.002, -LX, y1, z0); bn.box(wall, -LX - D, y0, z1, -LX, y1, z1 + 0.002); bn.box(wall, -LX - D, y1, z0, -LX, y1 + 0.002, z1);
      for (const [a, c, d, e] of [[z0 - 0.06, z0, y0 - 0.06, y1 + 0.06], [z1, z1 + 0.06, y0 - 0.06, y1 + 0.06], [z0, z1, y1, y1 + 0.06], [z0, z1, y0 - 0.06, y0]]) bn.box(gloss, -LX - 0.2, d, a, -LX - 0.12, e, c, WHITE2);
      bn.box(gloss, -LX - 0.2, y0, (z0 + z1) / 2 - 0.025, -LX - 0.14, y1, (z0 + z1) / 2 + 0.025, WHITE2);
      bn.box(gloss, -LX - D, y0 - 0.08, z0 - 0.1, -LX + 0.12, y0 - 0.03, z1 + 0.1, WHITE2);
      const n = 16, sh = (y1 - y0) / n;
      for (let k = 0; k < n; k++) bn.box(gloss, -0.032, -0.003, z0 + 0.02, 0.032, 0.003, z1 - 0.02, "#f4f0e4", TRS(-LX + 0.05, y0 + (k + 1) * sh - 0.012, 0, 0, 0, 0.55));
      bn.box(gloss, -LX + 0.01, y1 + 0.005, z0 - 0.02, -LX + 0.1, y1 + 0.08, z1 + 0.02, WHITE2);
      for (const z of [z0 + 0.2, z1 - 0.2]) bn.rod(plain, V3(-LX + 0.05, y0 + 0.02, z), V3(-LX + 0.05, y1, z), 0.003, 4, "#d8d0bc");
      bn.rod(plain, V3(-LX + 0.1, y1, z1 - 0.08), V3(-LX + 0.1, y0 + 0.35, z1 - 0.08), 0.004, 4, "#e8e2d0");
      this.viewMat = imat(S, { map: campusTex(), emap: true, em: [1.1, 1.1, 1.1] });
      const card = new THREE.Mesh(clean(new THREE.PlaneGeometry(5, 5).rotateY(Math.PI / 2)), this.viewMat);
      card.position.set(-LX - 2.2, 1.6, (z0 + z1) / 2 + 0.6); card.layers.set(NOINK); card.frustumCulled = false; R.add(card);
      for (let k = 0; k < 9; k++) bn.rbox(gloss, 0.05, 0.55, 0.08, 0.02, TRS(-LX + 0.08, 0.45, z0 + 0.15 + k * 0.12), WHITE2, 2);
    }
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 1000, 47, [-2.5, 0.2, -1.5, 1.6, 2.7, 1.8]);
    this.glows = new Glows(R, [
      { p: V3(BX[3], BAR_BASE_Y + 0.6, BZ + 0.08), c: [0.5, 0.33, 0.06], s: 1.5, g: 0 },   // D's gold glow
      { p: V3(0.8, 1.6, -0.42), c: [0.6, 0.06, 0.05], s: 0.4, g: 1, tw: 0.4 },            // IN USE
      { p: V3(0, 1.925, BZ + 0.05), c: [0.05, 0.09, 0.2], s: 3.0, g: 2 },                   // the screen's cool bloom
    ]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), LAB_RIGS, "lab");
    const rt = ratingAt(id, t), show = rt.show, own = rt.own;
    // the D pulse when it hits the top ("rated it higher")
    const hit = own > 0 ? Math.exp(-Math.max(0, t - (W.higher + 0.35)) * 2.2) * smooth((t - (W.higher + 0.1)) / 0.25) : 0;
    // low warm sun through the blinds (left wall, from the front-left): slatted stripes over the booth back + the wall
    // behind the researcher
    const wc = V3(-LX - 0.05, (LWIN.y0 + LWIN.y1) / 2, (LWIN.z0 + LWIN.z1) / 2);
    const sd = V3(wc.x - 0.35, wc.y - 1.12, wc.z + 0.63).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...sc3(rg.sun, 1 + 0.15 * hit));
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(1, 0, 0);
    (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((LWIN.z1 - LWIN.z0) / 2 - 0.02, (LWIN.y1 - LWIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(1, 16, 0.024, 0.12);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(LX, LZ, LY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t;
    const sdir = LSPOT.aim.clone().sub(LSPOT.p).normalize();
    (S.u.uPP.value as THREE.Vector3).copy(W2(LSPOT.p.x, LSPOT.p.y, LSPOT.p.z)); (S.u.uPD.value as THREE.Vector3).copy(sdir);
    (S.u.uPC.value as THREE.Vector3).set(...sc3(rg.spot, 1 + 0.4 * hit)); (S.u.uPK.value as THREE.Vector2).set(Math.cos(0.5), Math.cos(0.3));
    const dTop = BAR_BASE_Y + BAR_H * rt.bars[3];
    const dg = sc3(rg.dGlow, own * (1 + 0.8 * hit));
    const scr = show * rg.board;
    setLights(S, [
      { p: W2(-0.9, LY - 0.3, 0.5), c: rg.tube, r: 2.2 }, { p: W2(0.9, LY - 0.3, 0.5), c: rg.tube, r: 2.2 }, { p: W2(0, LY - 0.3, -0.9), c: rg.tube, r: 2.0 },
      { p: W2(0, 1.6, 3.8), c: rg.fill, r: 3.6 },
      { p: W2(0, 1.9, BZ + 0.6), c: [0.08 * scr, 0.14 * scr, 0.3 * scr], r: 1.4 },  // the screen's cool spill
      { p: W2(BX[3], dTop, BZ + 0.35), c: dg, r: 0.9 },                              // D's gold
      { p: W2(-1.6, 1.2, 0.6), c: rg.warm, r: 2.2 },                                 // warm bounce from the sunny floor
      { p: W2(0.8, 1.6, -0.35), c: [0.25 * rg.inUse, 0.02, 0.02], r: 0.35 },
      { p: W2(0.1, 1.0, -0.4), c: sc3(rg.sun, 0.05), r: 1.0 },                      // bounce off the striped booth
    ], rg.au, rg.ad);
    (this.tubeMat.uniforms.uEm.value as THREE.Vector3).set(...rg.tubeEm);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view, rg.view);
    (this.inUseMat.uniforms.uEm.value as THREE.Vector3).set(2.2 * rg.inUse, 1.2 * rg.inUse, 1.1 * rg.inUse);
    // ---- the board: canvas (scores, ???), screen power, bars, crown ----
    if (id === 4) this.board.draw(rt.bars, own, Math.floor(t * 30));
    (this.screenMat.uniforms.uEm.value as THREE.Vector3).set(1.15 * scr, 1.15 * scr, 1.2 * scr);
    for (let i = 0; i < 6; i++) {
      const h = BAR_H * rt.bars[i], m = this.bars[i];
      m.visible = show > 0.01 && h > 0.004;
      m.scale.set(1, Math.max(0.004, h), 1);
      const k = scr * (i === 3 ? 0.75 + 0.6 * hit : 0.55), c = BAR_COL[i];
      (this.barMats[i].uniforms.uEm.value as THREE.Vector3).set(c[0] * k, c[1] * k, c[2] * k);
    }
    // crown: scales in on D's top with a little overshoot, then bobs and turns
    const cu = clamp01((own - 0.55) / 0.45);
    const back = cu <= 0 ? 0 : 1 + 2.2 * Math.pow(cu - 1, 3) + 1.2 * Math.pow(cu - 1, 2);
    this.crown.visible = cu > 0.001;
    this.crown.position.set(BX[3], dTop + 0.012 + 0.012 * Math.sin(t * 3.0) * cu, BZ + 0.115);
    this.crown.rotation.set(0.12, 0.35 * Math.sin(t * 1.4), -0.12 + 0.05 * Math.sin(t * 2.1));
    this.crown.scale.setScalar(Math.max(0.001, back * 1.4));
    (this.crownMat.uniforms.uEm.value as THREE.Vector3).set(0.6 + 0.8 * hit, 0.4 + 0.5 * hit, 0.05);
    this.glows.gk.set(own * (1 + 0.8 * hit), rg.inUse * (0.9 + 0.1 * Math.sin(t * 4)), scr, 0); this.glows.mat.uniforms.uT.value = t;
    const gp = (this.glows.mesh.geometry as THREE.InstancedBufferGeometry).getAttribute("iP") as THREE.InstancedBufferAttribute;
    gp.setXYZ(0, BX[3], BAR_BASE_Y + Math.max(0.05, BAR_H * rt.bars[3] * 0.75), BZ + 0.08); gp.needsUpdate = true;
    this.haze.set(wc, V3(0, 0, 1), V3(0, 1, 0), (LWIN.z1 - LWIN.z0) / 2, (LWIN.y1 - LWIN.y0) / 2, sd.clone().negate(), 4.2, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -LX + 0.1; this.posX.visible = c.x < LX - 0.1; this.ceil.visible = c.y < LY - 0.1;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { room: [0.1, 1.45, 4.6, 0, 1.25, -0.8, 46], lab: [0.2, 1.6, 4.6, 0, 1.4, -0.8, 46] };
export class Sets {
  root = new THREE.Group();
  private room = new Room();
  private lab = new Lab();
  constructor() { this.root.add(this.room.root, this.lab.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const pc = cam as THREE.PerspectiveCamera, o = place === "lab" ? LAB : ROOM, d = DEBUG_VIEW[place];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = d[6]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    this.room.root.visible = place === "room";
    this.lab.root.visible = place === "lab";
    if (this.room.root.visible) this.room.update(id, t, f, cam);
    if (this.lab.root.visible) this.lab.update(id, t, f, cam);
  }
}
