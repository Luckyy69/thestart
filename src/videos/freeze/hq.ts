// OWNER: hq. BRAIN HQ (shot 3): a cosy retro control room INSIDE BEAN's head, at HQ = (2000, 0, 0).
//
// The room lights itself with its OWN small shader rig (technique: goose sets.ts room rig): ambient (warm from below,
// cool lilac from above = the blue shade), 9 soft point lights (amber pendant + sconces, a cool front fill, the CRT
// glow, both alarm lamps, the moving nerve pulse, the golden spill from the eyes), TWO ROTATING RED BEACONS (one per
// alarm lamp: a sweeping horizontal beam lighting walls, console and floor) and the LOW SUN coming in only through the
// two PUPILS of the eye windows (per pixel: the ray toward the sun must pass a pupil disc in the back-wall plane), so
// two round golden patches + hazy light shafts fall into the room. The sun direction = the world's camera-relative
// sun for shot 3 (looks.ts hq: az/el), so the world shadow map (console, chair, the BRAIN card) agrees.
//
// Story beats (story.ts hqAt, words W): the cable glows; on `pulse` a bright pulse races up the NERVE from the floor
// grommet to the junction box; one PLUG -> a Y-SPLITTER -> two wires: the left wire fires to the MOUTH lamp on
// `mouthLamp`, the right wire races on "wires" and lights FOREHEAD on `foreLamp` (the gag: one nerve, two lamps).
// Both lamps spin red beacons. `confused`: the centre CRT shows "???" and the eye windows do a double blink.
// `blame`: the big red button is slammed (depresses + springs back), the FOREHEAD lamp swells huge-bright (springy),
// its beacon floods the room with red, the CRTs go red, and the character cards pick up the red sweep (CHAR tint).
//
// CONTRACTS (local metres, world = HQ + local; floor y 0; room open toward +z):
//   room: floor x -2.6..2.6, z -2.4..4.0; back wall z -2.4; side walls x +-2.6 (superellipse vault, apex y 3.7).
//   EYE windows: centres (+-0.6, 2.78, -2.4), pupil (window) radius 0.3, iris frame outer 0.52.
//   CONSOLE x -1.05..1.05, front face z -0.95 (top 0.8), sloping up to y 1.0 at z -1.5; CRT riser z -1.55..-1.4,
//     top y 1.45. BUTTON (big red) at HQ_BUTTON (top of its dome). Chair seat top y 0.5 at (0, 0.5, -0.5): the cast
//     should seat the BRAIN card's bottom at y ~0.5 (the 3D chair is here; the card should NOT draw a chair).
//   LAMPS: MOUTH (-0.7, 1.92, -1.6), FOREHEAD (+0.7, 1.92, -1.6), dome radius 0.19 (FOREHEAD swells x1.35 on blame);
//     plaques under them at y 1.645. Junction box (0, 2.3, -1.66); plug (0, 2.06); Y splitter (0, 1.98, -1.6).
//   NERVE: up through the floor grommet at (0, 0, 0.6), sweeping up the left side, along the top of the lamp panel
//     into the box. NERVE_HQ = its points (world). FILE CABINETS "PAIN REPORTS" x -2.25..-1.3 at the back wall.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { NOINK } from "../bridge/ink";
import { CHAR } from "../bridge/shade";
import { HQ, W, SHOTS, SUN_FROM, V3 as SV3, camAt, hqAt, smooth, clamp01 } from "./story";
import { LOOKS } from "./looks";
import { tissueTex, floorTex, wainTex, rugTex, screenTex, plaqueTex, daysTex, drawerTex, irisTex, outsideTex, qTex, hazardTex } from "./hq_paint";

type C3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const add = (x: number, y: number, z: number): SV3 => [HQ[0] + x, HQ[1] + y, HQ[2] + z];

// ============================================================ exported contracts (world coordinates)
export const HQ_EYES: SV3[] = [add(-0.6, 2.78, -2.4), add(0.6, 2.78, -2.4)];
export const HQ_LAMPS = { mouth: add(-0.7, 1.92, -1.6), forehead: add(0.7, 1.92, -1.6) };
export const HQ_CHAIR = add(0, 0.5, -0.5);
export const HQ_HOLE = add(0, 0, 0.6);
const BTN = { x: 0.42, s: 0.3 };
const TILT = Math.atan2(0.2, 0.55);
const slopeAt = (s: number) => ({ y: 0.8 + 0.2 * s, z: -0.95 - 0.55 * s });
export const HQ_BUTTON = add(BTN.x, slopeAt(BTN.s).y + 0.1, slopeAt(BTN.s).z + 0.03);
const NERVE_LOCAL: [number, number, number][] = [
  [0, -0.35, 0.6], [0, 0.05, 0.6], [-0.18, 0.32, 0.5], [-0.55, 0.72, 0.22], [-0.82, 1.25, -0.25], [-0.98, 1.85, -0.85],
  [-1.0, 2.2, -1.35], [-0.82, 2.33, -1.62], [-0.45, 2.3, -1.66], [-0.16, 2.3, -1.66],
];
export const NERVE_HQ: SV3[] = NERVE_LOCAL.map(([x, y, z]) => add(x, y, z));

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
  const sc = typeof s === "number" ? V(s, s, s) : V(...s);
  return new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
const C = (h?: string) => (h ? new THREE.Color(h) : undefined);
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4, col?: string) {
    const c = clean(g, C(col)); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col?: string) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); this.add(g, mat, undefined, col);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4, col?: string, seg = 2) { this.add(new RoundedBoxGeometry(w, h, d, seg, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx, col); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, col?: string, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx, col); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 12, col?: string) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx, col); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()), V(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, rs = 10, ts = 48) { this.add(new THREE.TorusGeometry(R, r, rs, ts), mat, mx, col); }
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

// ============================================================ the HQ light shader (own rig)
const NL = 9;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uE0; uniform vec3 uE1; uniform float uER; uniform float uBZ;
uniform vec3 uBP[2]; uniform vec2 uBD[2]; uniform vec3 uBC[2]; uniform vec3 uO; uniform float uFogCap;
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// the sun through the two pupils (back-wall plane z = uBZ), 0..1; anything behind the wall is in the open sun
float apK(vec3 p){
  if (p.z < uBZ - 0.01) return 1.0;
  if (uSD.z > -0.01) return 0.0;
  float t = (uBZ - p.z) / uSD.z; vec3 q = p + uSD * t;
  float pen = 0.004 + 0.012 * t;
  float d = min(length(q.xy - uE0.xy), length(q.xy - uE1.xy));
  return 1.0 - smoothstep(uER - pen, uER + pen, d);
}
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(2.6 - abs(l.x), l.z + 2.4), 9.0);
  float a = 0.62 + 0.38 * smoothstep(0.0, 0.8, dw);
  float b = l.y > 0.004 ? 0.72 + 0.28 * smoothstep(0.0, 0.35, l.y) : 1.0;
  return a * b;
}
vec3 beaconL(vec3 p, vec3 n, int i){
  vec3 d = p - uBP[i]; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
  vec2 hz = normalize(d.xz + vec2(1e-5));
  float beam = pow(max(dot(hz, uBD[i]), 0.0), 7.0);
  return uBC[i] * (0.06 + 1.8 * beam) * smoothstep(-0.25, 0.5, dot(n, -l)) * fallK(2.0, r2) * smoothstep(0.2, 0.9, sqrt(r2));
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * ao * (0.8 + 0.2 * sh);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.7 + 0.3 * sh) * (0.45 + 0.55 * ao);
  }
  L += beaconL(p, n, 0) + beaconL(p, n, 1);
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = apK(p); if (k > 0.0) L += uSC * smoothstep(0.0, 0.25, ndl) * k * sh; }
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
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vC = color;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform vec3 uSelf; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uRim;
uniform sampler2D uMap; uniform sampler2D uMap2; uniform float uMix;
uniform float uPu; uniform float uPk; uniform float uGl; uniform vec3 uPC;
uniform vec3 uDC; uniform float uAng; uniform float uLid;
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
  vec3 alb = uCol * vC;
#ifdef LID
  float ly = vUv.y * 2.0 - 1.0, e = 1.0 - 2.15 * uLid;
  if (ly < e) discard;
  alb *= mix(0.3, 1.0, smoothstep(0.0, 0.1, ly - e));
#endif
#ifdef HAS_MAP
  vec4 tx = texture2D(uMap, uv);
  #ifdef CUTOUT
  if (tx.a < 0.5) discard;
  #endif
  alb *= tx.rgb;
#endif
  vec3 lit = lightAt(vW, n, sh);
  vec3 c = alb * (lit + uSelf) + uEm * vC;
#ifdef EMAP
  vec3 em = texture2D(uMap, uv).rgb;
  #ifdef EMAP2
  em = mix(em, texture2D(uMap2, uv).rgb, uMix);
  #endif
  c = em * uEm + alb * lit * 0.05;
#endif
#ifdef CABLE
  float du = vUv.x - uPu, head = exp(-pow(du / 0.03, 2.0)), tail = du < 0.0 ? exp(du / 0.1) * step(-0.5, du) : 0.0;
  c += uPC * (uGl + uPk * (head * 1.6 + tail * 0.7)) + vec3(1.0, 0.95, 0.8) * uPk * head * 0.8;
#endif
#ifdef DOME
  // a rotating beacon reflector behind red glass: a bright band sweeps across the dome
  vec3 q = (vW - uDC) / max(length(vW - uDC), 1e-4);
  float s = sin(uAng), fr = 0.5 + 0.5 * cos(uAng);
  float band = exp(-pow((q.x - s) / 0.3, 2.0)) * (0.25 + 0.75 * fr);
  c = uEm * (0.45 + 1.0 * band) + vec3(0.3, 0.1, 0.0) * band * uEm.r + alb * lit * 0.04;
  c += vec3(1.0, 0.92, 0.85) * pow(max(dot(n, normalize(vec3(-0.45, 0.65, 0.6))), 0.0), 50.0) * 0.8;
#endif
  vec3 v = normalize(cameraPosition - vW);
  if (uRim > 0.0) c += uRim * pow(1.0 - max(dot(n, v), 0.0), 3.0) * uAU;
#ifdef SPEC
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  for (int i = 0; i < 2; i++) {
    vec3 d = uBP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    vec2 hz = normalize(-d.xz + vec2(1e-5)); float beam = pow(max(dot(hz, uBD[i]), 0.0), 10.0);
    c += uBC[i] * (0.2 + beam) * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(2.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * apK(vW) * uSpecK * sh;
#endif
  gl_FragColor = vec4(c, 1.0);
#ifdef USE_FOG
  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth) * uFogCap;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif
}`;
type Rig = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const rig = (): Rig => {
  const lp = Array.from({ length: NL }, () => V(0, -999, 0)), lc = Array.from({ length: NL }, () => V(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V(0, 0, 0) }, uAD: { value: V(0, 0, 0) },
      uSD: { value: V(0, 1, 0) }, uSC: { value: V(0, 0, 0) }, uE0: { value: V(0, 0, 0) }, uE1: { value: V(0, 0, 0) }, uER: { value: 0.3 }, uBZ: { value: 0 },
      uBP: { value: [V(0, -999, 0), V(0, -999, 0)] }, uBD: { value: [new THREE.Vector2(1, 0), new THREE.Vector2(1, 0)] }, uBC: { value: [V(0, 0, 0), V(0, 0, 0)] },
      uO: { value: V(0, 0, 0) }, uFogCap: { value: 0.6 },
    },
  };
};
type MOpt = { col?: string; map?: THREE.Texture; map2?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; emap2?: boolean; rep?: [number, number]; rim?: number; cable?: boolean; dome?: boolean; lid?: boolean; cutout?: boolean };
const hmat = (S: Rig, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.emap2) defines.EMAP2 = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.cable) defines.CABLE = "1";
  if (o.dome) defines.DOME = "1";
  if (o.lid) defines.LID = "1";
  if (o.cutout) defines.CUTOUT = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uMap2: { value: o.map2 ?? null }, uMix: { value: 0 },
      uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) }, uRim: { value: o.rim ?? 0 },
      uPu: { value: -1 }, uPk: { value: 0 }, uGl: { value: 0 }, uPC: { value: V(1, 0.72, 0.08) }, uDC: { value: V(0, 0, 0) }, uAng: { value: 0 }, uLid: { value: 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true, fog: true,
  });
};

// ============================================================ glows + light shafts (NOINK, additive)
type GlowItem = { p: THREE.Vector3; c: C3; s: number; g: number };
/** soft round glows: camera-facing additive billboards; per-glow colour, size and group (4 groups, gk) */
class Glows {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; gk = new THREE.Vector4(1, 1, 1, 1);
  constructor(parent: THREE.Object3D, items: GlowItem[], near = 0.4) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(), n = items.length;
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const P = new Float32Array(n * 4), Cc = new Float32Array(n * 4);
    items.forEach((it, i) => { P.set([it.p.x, it.p.y, it.p.z, it.s], i * 4); Cc.set([...it.c, it.g], i * 4); });
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iC", new THREE.InstancedBufferAttribute(Cc, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uG: { value: this.gk }, uNear: { value: near } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iC; uniform vec4 uG; uniform float uNear; varying vec3 vC; varying vec2 vQ;
        void main(){
          vec3 p = (modelMatrix * vec4(iP.xyz, 1.0)).xyz;
          float gi = floor(iC.w + 0.01);
          float k = gi < 0.5 ? uG.x : gi < 1.5 ? uG.y : gi < 2.5 ? uG.z : uG.w;
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
/** a soft light shaft / beacon beam: a cone (radius r0 at the apex -> r1 at length L along d), additive. Each front
 *  fragment ray-marches the cone volume behind it (density 1 - (rho/r)^2), so the beam reads from ANY angle (also
 *  looking down its axis), fading in at the apex, out along its length and near the lens */
class Shaft {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, r0: number, r1: number, fadeIn = 0.06) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 40, 1, false); g.translate(0, 0.5, 0);
    // a cone hull (scaled per set()): radius goes r0 -> r1 along y
    const P = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), r = (r0 + (r1 - r0) * y) * 1.04 + 0.01; P.setXYZ(i, P.getX(i) * r, y, P.getZ(i) * r); }
    g.computeVertexNormals();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: V(1, 1, 1) }, uK: { value: 0 }, uIn: { value: fadeIn }, uZB: { value: new THREE.Vector3(-1e9, -1e9, 1) }, uA: { value: V(0, 0, 0) }, uD: { value: V(0, 1, 0) }, uL: { value: 1 }, uR: { value: new THREE.Vector2(r0, r1) } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform vec3 uC; uniform float uK; uniform float uIn; uniform vec3 uZB; uniform vec3 uA; uniform vec3 uD; uniform float uL; uniform vec2 uR; varying vec3 vW;
        float dens(vec3 p){
          vec3 q = p - uA; float ax = dot(q, uD), s = ax / uL;
          if (s < 0.0 || s > 1.0) return 0.0;
          float r = mix(uR.x, uR.y, s), x = length(q - uD * ax) / r;
          float zb = 1.0 - (1.0 - uZB.z) * smoothstep(uZB.x - 0.08, uZB.x + 0.08, p.z) * (1.0 - smoothstep(uZB.y - 0.1, uZB.y + 0.1, p.z));
          return max(0.0, 1.0 - x * x) * smoothstep(0.0, uIn, s) * (1.0 - smoothstep(0.3, 1.0, s)) * zb;
        }
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          float span = 2.2 * uR.y + 0.4, dt = span / 24.0, acc = 0.0;
          for (int i = 0; i < 24; i++) acc += dens(vW + rd * ((float(i) + 0.5) * dt)) * dt;
          acc *= smoothstep(0.5, 1.4, length(cameraPosition - vW));
          gl_FragColor = vec4(uC * uK * acc, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
  /** apex at a (local to the parent), pointing along unit d, length L; O = the parent's world offset */
  set(a: THREE.Vector3, d: THREE.Vector3, L: number, col: C3, k: number, O: THREE.Vector3) {
    this.mesh.position.copy(a); this.mesh.quaternion.setFromUnitVectors(V(0, 1, 0), d); this.mesh.scale.set(1, L, 1);
    const u = this.mat.uniforms;
    (u.uC.value as THREE.Vector3).set(...col); u.uK.value = k; (u.uA.value as THREE.Vector3).copy(a).add(O); (u.uD.value as THREE.Vector3).copy(d); u.uL.value = L;
    this.mesh.visible = k > 0.002;
  }
}

// ============================================================ the room
const RX = 2.6, RYT = 3.7, BZ = -2.4, FZ = 4.0, EYE_R = 0.3, IRIS_R = 0.52, EYE_Y = 2.78, EYE_X = 0.6;
/** the vault outline: superellipse |x/RX|^4 + |y/RYT|^4 = 1 (y >= 0), from the left floor corner over to the right */
const vault = (n: number): [number, number][] => {
  const o: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI * (1 - i / n), c = Math.cos(a), s = Math.sin(a); o.push([RX * Math.sign(c) * Math.sqrt(Math.abs(c)), RYT * Math.sqrt(Math.abs(s))]); }
  return o;
};
/** the bumpy brain-tissue walls + vault: the outline extruded from the back wall to the front, displaced inward */
const vaultGeo = () => {
  const prof = vault(72), nz = 40, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let arc = 0; const arcs: number[] = [0];
  for (let i = 1; i < prof.length; i++) { arc += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]); arcs.push(arc); }
  for (let j = 0; j <= nz; j++) {
    const z = BZ + ((FZ - BZ) * j) / nz;
    for (let i = 0; i < prof.length; i++) {
      const [x, y] = prof[i], a = Math.PI * (1 - i / (prof.length - 1));
      const nx = -Math.cos(a), ny = -Math.sin(a), nl = Math.hypot(nx, ny); // inward-ish
      const k = smooth((y - 1.0) / 0.5);
      const d = (0.06 + 0.07 * Math.sin(z * 2.3 + y * 1.7) * Math.sin(y * 2.9 - z * 1.1) + 0.04 * Math.sin(arcs[i] * 4.1 + z * 3.3)) * k;
      pos.push(x + (nx / nl) * d, y + (ny / nl) * d, z); uv.push(arcs[i], z);
    }
  }
  const np = prof.length;
  for (let j = 0; j < nz; j++) for (let i = 0; i < np - 1; i++) { const a = j * np + i, b = a + 1, c = a + np, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
/** the back wall: the vault outline as a flat shape with the two eye holes; uv in metres */
const backGeo = () => {
  const s = new THREE.Shape(), p = vault(72);
  s.moveTo(p[0][0], 0); for (const [x, y] of p) s.lineTo(x, y); s.lineTo(p[0][0], 0);
  for (const sx of [-1, 1]) { const h = new THREE.Path(); h.absarc(sx * EYE_X, EYE_Y, IRIS_R - 0.03, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ShapeGeometry(s, 48); g.translate(0, 0, BZ);
  const P = g.getAttribute("position") as THREE.BufferAttribute, U = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i), P.getY(i));
  return g;
};
/** the eye-window blinks: one on "So", a double blink on "confused" (pure fn of t) */
const blinkAt = (t: number) => {
  const b = (t0: number, d = 0.16) => { const u = 1 - Math.abs(t - t0) / d; return u > 0 ? smooth(u * 1.4) : 0; };
  return Math.max(b(W.so + 0.12), b(W.confused + 0.12), b(W.confused + 0.45));
};
/** 0 -> 1 with a springy overshoot (u in 0..1+) */
const springy = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(10 * u));

const DEBUG_CAM = false as boolean; // HQ-only framing check (OFF for the real render)
const DEBUG_VIEW = [0.0, 1.6, 3.6, 0.0, 1.55, -1.2, 50];
const DEBUG_STANDIN = false as boolean; // a pink ball where the BRAIN card sits (OFF for the real render)

export class Hq {
  root = new THREE.Group();
  private S = rig();
  private glows: Glows; private pulseGlow: Glows; private shafts: Shaft[] = []; private beams: Shaft[] = [];
  private cableMain: THREE.ShaderMaterial; private wireL: THREE.ShaderMaterial; private wireR: THREE.ShaderMaterial;
  private domeM: THREE.ShaderMaterial; private domeF: THREE.ShaderMaterial; private domeFG = new THREE.Group();
  private lids: THREE.ShaderMaterial[] = []; private scr: THREE.ShaderMaterial[] = []; private btn = new THREE.Group();
  private curve = new THREE.CatmullRomCurve3(NERVE_LOCAL.map(([x, y, z]) => V(x, y, z)));
  private curveL: THREE.CatmullRomCurve3; private curveR: THREE.CatmullRomCurve3;
  private outMat: THREE.ShaderMaterial[] = []; private holeGlow: THREE.ShaderMaterial;
  private sunV: THREE.Vector3 | null = null;

  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...HQ);
    const b = new Bat(), fu = new Bat(), cast = new Bat();
    const tissue = hmat(S, { map: tissueTex(), rep: [0.62, 0.62], spec: 18, specK: 0.12, rim: 0.15 });
    const floor = hmat(S, { map: floorTex(), rep: [0.55, 0.55], spec: 40, specK: 0.25 });
    const wain = hmat(S, { map: wainTex(), rep: [1, 1.05], spec: 30, specK: 0.15 });
    const plain = hmat(S, {}), paint = hmat(S, { spec: 30, specK: 0.2 }), gloss = hmat(S, { spec: 60, specK: 0.55 }), metal = hmat(S, { spec: 90, specK: 0.9 });
    const TEAL = "#3fa59a", TEALD = "#2c7f78", CREAM = "#f6e6c8", MUST = "#e6a93a", BRASS = "#d9a548", RED = "#e8343c";

    // ---- shell: floor, bumpy tissue vault, back wall with the eye holes, wainscot ----
    { const g = new THREE.PlaneGeometry(2 * RX, FZ - BZ, 4, 4); g.rotateX(-Math.PI / 2); g.translate(0, 0, (BZ + FZ) / 2);
      const P = g.getAttribute("position") as THREE.BufferAttribute, U = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i), -P.getZ(i));
      b.add(g, floor); }
    b.add(vaultGeo(), tissue, undefined, "#ffffff");
    b.add(backGeo(), tissue, undefined, "#f8d0da");
    for (const sx of [-1, 1]) {
      const g = new THREE.PlaneGeometry(FZ - BZ, 0.95); g.rotateY(-sx * Math.PI / 2); g.translate(sx * (RX - 0.05), 0.475, (BZ + FZ) / 2);
      const P = g.getAttribute("position") as THREE.BufferAttribute, U = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) U.setXY(i, P.getZ(i), P.getY(i));
      b.add(g, wain);
      b.box(paint, sx * (RX - 0.09), 0.93, BZ, sx * (RX - 0.02), 1.0, FZ, "#6a3420");
      b.box(paint, sx * (RX - 0.08), 0, BZ, sx * (RX - 0.02), 0.09, FZ, "#5a2a18");
    }
    { const g = new THREE.PlaneGeometry(2 * RX - 0.1, 0.95); g.translate(0, 0.475, BZ + 0.05);
      const P = g.getAttribute("position") as THREE.BufferAttribute, U = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i), P.getY(i));
      b.add(g, wain);
      b.box(paint, -RX + 0.1, 0.93, BZ, RX - 0.1, 1.0, BZ + 0.09, "#6a3420"); b.box(paint, -RX + 0.1, 0, BZ, RX - 0.1, 0.09, BZ + 0.08, "#5a2a18"); }
    // colourful cable bundles running along the vault (the brain's "wiring")
    { const prof = vault(60), cols = ["#e8343c", "#3a7fd0", "#ffd23a", "#4ab04a", "#c070e0"];
      ([[-1.6, 0.16], [-1.35, 0.2], [1.45, 0.18], [1.7, 0.16], [0.25, 0.2]] as [number, number][]).forEach(([x0, inset], k) => {
        const pts: THREE.Vector3[] = [];
        for (let j = 0; j <= 14; j++) {
          const z = BZ + 0.3 + (1.4 - BZ - 0.3) * (j / 14), xt = x0 + 0.06 * Math.sin(z * 2 + k);
          let best = prof[0]; for (const p of prof) if (Math.abs(p[0] - xt) < Math.abs(best[0] - xt)) best = p;
          pts.push(V(xt * (1 - inset / RX), best[1] - inset - 0.08 - 0.04 * Math.sin(z * 2.4 + k * 1.3), z));
        }
        fu.tube(gloss, pts, 0.03, 60, cols[k], 8);
        for (let j = 1; j < 14; j += 3) { const p = pts[j], q = pts[j + 1]; fu.torus(metal, 0.045, 0.012, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), q.clone().sub(p).normalize()), V(1, 1, 1)), BRASS, 6, 16); }
      }); }

    // ---- the EYE WINDOWS: iris frame (ring), socket rim + pupil frame, socket, blinking lids, the park outside ----
    for (const sx of [-1, 1]) {
      const ex = sx * EYE_X;
      const ring = new THREE.RingGeometry(EYE_R, IRIS_R, 72, 2);
      const P = ring.getAttribute("position") as THREE.BufferAttribute, U = ring.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) U.setXY(i, 0.5 + P.getX(i) / (2 * IRIS_R), 0.5 + P.getY(i) / (2 * IRIS_R));
      fu.add(ring, hmat(S, { map: irisTex(), spec: 80, specK: 0.8, self: [0.12, 0.1, 0.08] }), TRS(ex, EYE_Y, BZ + 0.025));
      fu.torus(gloss, IRIS_R + 0.02, 0.05, TRS(ex, EYE_Y, BZ + 0.03), "#d0607e", 12, 72);   // the fleshy socket rim
      fu.torus(metal, EYE_R, 0.022, TRS(ex, EYE_Y, BZ + 0.03), "#2a1c20", 10, 72);          // the pupil window frame
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.2; fu.sph(metal, TRS(ex + Math.cos(a) * (EYE_R + 0.035), EYE_Y + Math.sin(a) * (EYE_R + 0.035), BZ + 0.035, 0, 0, 0, 0.014), 8, BRASS); }
      fu.cyl(plain, EYE_R, EYE_R, 0.14, 48, TRS(ex, EYE_Y, BZ - 0.07, 0, Math.PI / 2), "#7a3048", true);
      const lid = hmat(S, { lid: true, col: "#f0a898", self: [0.35, 0.22, 0.2] }); this.lids.push(lid);
      const lg = new THREE.Mesh(clean(new THREE.CircleGeometry(EYE_R + 0.01, 48)), lid); lg.position.set(ex, EYE_Y, BZ - 0.06); lg.frustumCulled = false; R.add(lg);
      const om = hmat(S, { map: outsideTex(), emap: true, em: [1.25, 1.2, 1.1] }); this.outMat.push(om);
      const og = new THREE.Mesh(clean(new THREE.PlaneGeometry(1.3, 1.3)), om); og.position.set(ex * 1.08, EYE_Y + 0.08, BZ - 0.55); og.frustumCulled = false; R.add(og);
    }

    // ---- the CONSOLE (teal retro switchboard): body + sloped panel + CRT riser + controls ----
    {
      const sh = new THREE.Shape(); sh.moveTo(0.95, 0); sh.lineTo(0.95, 0.8); sh.lineTo(1.5, 1.0); sh.lineTo(1.56, 1.0); sh.lineTo(1.56, 0); sh.lineTo(0.95, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 2.1, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 });
      g.rotateY(Math.PI / 2); g.translate(-1.05, 0, 0);
      cast.add(g, paint, undefined, TEAL);
      cast.box(paint, -1.02, 0.0, -0.98, 1.02, 0.08, -0.9, "#1e4a46");                      // toe kick
      cast.box(paint, -1.06, 0.36, -0.95, 1.06, 0.4, -0.9, CREAM);                           // cream trim stripe
      cast.rbox(paint, 2.14, 0.5, 0.16, 0.03, TRS(0, 1.15, -1.48), TEALD);                     // the CRT riser
      cast.rbox(gloss, 2.2, 0.05, 0.22, 0.02, TRS(0, 1.42, -1.48), CREAM);
      [-0.66, 0, 0.66].forEach((x, k) => {
        fu.rbox(gloss, 0.52, 0.38, 0.05, 0.04, TRS(x, 1.16, -1.39), "#e9dcc0");
        const sm = hmat(S, { map: screenTex(k), map2: k === 1 ? qTex() : undefined, emap: true, emap2: k === 1, em: [0.4, 1.6, 0.9] }); this.scr.push(sm);
        const sg = new THREE.Mesh(clean(new THREE.PlaneGeometry(0.42, 0.3)), sm); sg.position.set(x, 1.16, -1.36); sg.frustumCulled = false; R.add(sg);
      });
      // controls on the slope (tilted to its normal)
      const onS = (x: number, s: number, h = 0) => { const p = slopeAt(s); return TRS(x, p.y + h * Math.cos(TILT), p.z + h * Math.sin(TILT), 0, TILT); };
      for (let i = 0; i < 5; i++) { const x = -0.88 + i * 0.17; fu.cyl(gloss, 0.045, 0.05, 0.05, 18, onS(x, 0.72, 0.025), CREAM); fu.rbox(plain, 0.012, 0.012, 0.05, 0.004, onS(x, 0.7, 0.052), "#2a2a2a"); }
      for (let i = 0; i < 6; i++) { const x = -0.88 + i * 0.12; fu.cyl(metal, 0.022, 0.022, 0.015, 12, onS(x, 0.4, 0.008), "#c8c0b0"); fu.add(new THREE.CylinderGeometry(0.008, 0.01, 0.09, 8), metal, new THREE.Matrix4().multiplyMatrices(onS(x, 0.4, 0.05), TRS(0, 0, 0, 0, 0.45 * (i % 2 ? 1 : -1))), "#e0e0e0"); }
      ([["#ffd23a", -0.28], ["#4ab0e0", -0.14], ["#ff7a3a", 0.0], ["#7ad05a", 0.14]] as [string, number][]).forEach(([c, x]) => fu.cyl(gloss, 0.035, 0.035, 0.03, 14, onS(x, 0.6, 0.015), c));
      for (let i = 0; i < 3; i++) { const x = 0.68 + i * 0.1; fu.rbox(plain, 0.03, 0.01, 0.3, 0.004, onS(x, 0.5, 0.004), "#1e3c3a"); fu.rbox(gloss, 0.06, 0.035, 0.04, 0.01, onS(x, 0.3 + i * 0.18, 0.02), "#f0f0f0"); }
      // the big lever
      fu.rbox(metal, 0.1, 0.05, 0.16, 0.015, onS(-0.62, 0.3, 0.02), "#585058");
      fu.add(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), metal, new THREE.Matrix4().multiplyMatrices(onS(-0.62, 0.3, 0.17), TRS(0, -0.02, 0, 0, -0.35)), "#d0d0d8");
      fu.sph(gloss, new THREE.Matrix4().multiplyMatrices(onS(-0.62, 0.3, 0.17), TRS(0, 0.15, -0.055, 0, 0, 0, 0.045)), 14, RED);
      // the BIG RED BUTTON: hazard ring + housing (static) + the dome (animated group)
      const hz = hmat(S, { map: hazardTex(), rep: [3, 0.5], spec: 40, specK: 0.3 });
      fu.cyl(hz, 0.13, 0.135, 0.03, 32, onS(BTN.x, BTN.s, 0.015), "#ffffff");
      fu.cyl(metal, 0.1, 0.1, 0.035, 28, onS(BTN.x, BTN.s, 0.045), "#3a3a3a");
      const bb = new Bat(); bb.sph(gloss, TRS(0, 0, 0, 0, 0, 0, [0.085, 0.055, 0.085]), 24, RED); bb.cyl(gloss, 0.085, 0.085, 0.03, 24, TRS(0, -0.012, 0), "#c42028");
      for (const m of bb.build(this.btn, true)) m.matrixAutoUpdate = true;
      const bp = slopeAt(BTN.s); this.btn.position.set(BTN.x, bp.y + 0.07 * Math.cos(TILT), bp.z + 0.07 * Math.sin(TILT)); this.btn.rotation.x = TILT; R.add(this.btn);
      // a mug on the riser + a stack of paper
      cast.cyl(gloss, 0.05, 0.045, 0.11, 16, TRS(-0.86, 1.5, -1.46), "#ffffff"); fu.torus(gloss, 0.032, 0.01, TRS(-0.8, 1.5, -1.46), "#ffffff", 8, 16);
      fu.cyl(plain, 0.045, 0.045, 0.005, 16, TRS(-0.86, 1.552, -1.46), "#5a3018");
      cast.rbox(plain, 0.22, 0.04, 0.16, 0.005, TRS(0.85, 1.47, -1.47, 0.12), "#fffaf0");
    }

    // ---- the LAMP PANEL: header board, two alarm domes (beacons), plaques, rivets, junction box, plug, splitter ----
    {
      fu.rbox(paint, 2.0, 0.58, 0.08, 0.04, TRS(0, 1.87, -1.74), MUST);
      fu.rbox(paint, 2.06, 0.05, 0.12, 0.02, TRS(0, 2.18, -1.73), "#a86a20");
      for (const sx of [-1, 1]) cast.rod(metal, V(sx * 0.9, 1.42, -1.76), V(sx * 0.9, 1.68, -1.76), 0.02, 8, "#6a5a4a");
      for (let i = 0; i < 10; i++) { const x = -0.95 + (i % 5) * 0.475; fu.sph(metal, TRS(x, i < 5 ? 2.11 : 1.63, -1.695, 0, 0, 0, 0.012), 6, BRASS); }
      for (const [sx, name] of [[-1, "MOUTH"], [1, "FOREHEAD"]] as [number, string][]) {
        const x = sx * 0.7;
        fu.cyl(metal, 0.235, 0.245, 0.06, 40, TRS(x, 1.92, -1.68, 0, Math.PI / 2), "#c89038");
        fu.add(new THREE.PlaneGeometry(0.46, 0.115), hmat(S, { map: plaqueTex(name), spec: 50, specK: 0.3, self: [0.15, 0.12, 0.1] }), TRS(x, 1.615, -1.695));
        for (let k = 0; k < 4; k++) fu.rbox(plain, 0.012, 0.11, 0.01, 0.004, TRS(x - sx * 0.3 + k * 0.025 * sx, 1.93, -1.698), "#6a4a20");
      }
      const dg = new THREE.SphereGeometry(0.19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); dg.rotateX(Math.PI / 2); dg.scale(1, 1, 0.85);
      this.domeM = hmat(S, { dome: true, col: "#ff4040", em: [0.5, 0.05, 0.05], spec: 70, specK: 0.6 });
      this.domeF = hmat(S, { dome: true, col: "#ff4040", em: [0.5, 0.05, 0.05], spec: 70, specK: 0.6 });
      const gM = new THREE.Group(); gM.position.set(-0.7, 1.92, -1.65); R.add(gM);
      this.domeFG.position.set(0.7, 1.92, -1.65); R.add(this.domeFG);
      for (const [grp, mat] of [[gM, this.domeM], [this.domeFG, this.domeF]] as [THREE.Group, THREE.ShaderMaterial][]) {
        const dm = new THREE.Mesh(clean(dg), mat); dm.frustumCulled = false; grp.add(dm);
        const cb = new Bat();
        for (let k = 0; k < 3; k++) cb.torus(metal, 0.2, 0.009, TRS(0, 0, 0, 0, 0, (k / 3) * Math.PI + 0.3, [1, 1, 0.9]), "#3a3030", 6, 40);
        cb.torus(metal, 0.2, 0.016, TRS(0, 0, 0.012), "#e8c060", 8, 40);
        for (const m of cb.build(grp)) m.matrixAutoUpdate = true;
      }
      // junction box (hazard-trimmed) + the ONE plug + the Y splitter
      fu.rbox(paint, 0.28, 0.2, 0.14, 0.025, TRS(0, 2.3, -1.66), "#4a4a52");
      fu.add(new THREE.PlaneGeometry(0.24, 0.05), hmat(S, { map: hazardTex(), rep: [2, 1] }), TRS(0, 2.235, -1.588));
      fu.sph(metal, TRS(0, 2.33, -1.588, 0, 0, 0, [0.03, 0.03, 0.012]), 10, "#ffd23a");
      fu.rod(gloss, V(0, 2.2, -1.64), V(0, 2.1, -1.62), 0.03, 12, "#ffd23a");               // the short cord
      fu.rbox(gloss, 0.1, 0.09, 0.08, 0.02, TRS(0, 2.06, -1.62), "#222226");                 // the PLUG
      fu.rbox(gloss, 0.26, 0.09, 0.1, 0.025, TRS(0, 1.98, -1.6), "#f2f0ea");                 // the Y splitter (two outlets)
      for (const sx of [-1, 1]) fu.rbox(plain, 0.03, 0.04, 0.02, 0.006, TRS(sx * 0.08, 1.97, -1.548), "#2a2a2a");
    }

    // ---- the NERVE: floor grommet + main cable + the two split wires (glowing, pulse) ----
    {
      this.cableMain = hmat(S, { cable: true, col: "#ffc828", spec: 50, specK: 0.5 });
      const m = new THREE.Mesh(clean(new THREE.TubeGeometry(this.curve, 160, 0.055, 12, false)), this.cableMain); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; R.add(m);
      for (let k = 1; k < 9; k++) { const u = k / 9.5, p = this.curve.getPointAt(u), tn = this.curve.getTangentAt(u); fu.add(new THREE.TorusGeometry(0.065, 0.014, 8, 20), metal, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(V(0, 0, 1), tn), V(1, 1, 1)), "#c89038"); }
      fu.torus(metal, 0.12, 0.03, TRS(0, 0.0, 0.6, 0, Math.PI / 2), BRASS, 10, 40);
      this.holeGlow = hmat(S, { col: "#000000", em: [1.2, 0.8, 0.2] });
      const hd = new THREE.Mesh(clean(new THREE.CircleGeometry(0.1, 32)), this.holeGlow); hd.rotation.x = -Math.PI / 2; hd.position.set(0, 0.004, 0.6); R.add(hd);
      const wire = (sx: number) => new THREE.CatmullRomCurve3([V(sx * 0.12, 1.98, -1.57), V(sx * 0.24, 1.97, -1.555), V(sx * 0.36, 1.92, -1.56), V(sx * 0.46, 1.93, -1.6), V(sx * 0.5, 1.95, -1.64)]);
      this.curveL = wire(-1); this.curveR = wire(1);
      this.wireL = hmat(S, { cable: true, col: "#f2c43a", spec: 50, specK: 0.5 }); this.wireR = hmat(S, { cable: true, col: "#f2c43a", spec: 50, specK: 0.5 });
      for (const [cv, mt] of [[this.curveL, this.wireL], [this.curveR, this.wireR]] as [THREE.CatmullRomCurve3, THREE.ShaderMaterial][]) { const w = new THREE.Mesh(clean(new THREE.TubeGeometry(cv, 40, 0.024, 10, false)), mt); w.frustumCulled = false; R.add(w); }
    }

    // ---- the swivel CHAIR (no backrest: the brain card faces the lens) + round rug ----
    {
      fu.add(new THREE.CircleGeometry(1.0, 64), hmat(S, { map: rugTex(), cutout: true, spec: 10, specK: 0.05 }), TRS(0, 0.006, -0.35, 0, -Math.PI / 2, 0, [1, 0.8, 1]));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + 0.3; cast.rod(metal, V(0, 0.08, -0.5), V(Math.cos(a) * 0.28, 0.05, -0.5 + Math.sin(a) * 0.28), 0.022, 8, "#3a3a44"); cast.sph(gloss, TRS(Math.cos(a) * 0.28, 0.03, -0.5 + Math.sin(a) * 0.28, 0, 0, 0, 0.03), 8, "#1a1a1a"); }
      cast.cyl(metal, 0.03, 0.03, 0.36, 12, TRS(0, 0.26, -0.5), "#b8b8c0");
      cast.cyl(metal, 0.05, 0.05, 0.12, 14, TRS(0, 0.14, -0.5), "#3a3a44");
      cast.rbox(gloss, 0.56, 0.1, 0.5, 0.045, TRS(0, 0.45, -0.5), "#e8604a", 3);
      cast.rbox(gloss, 0.5, 0.03, 0.44, 0.012, TRS(0, 0.39, -0.5), "#3a3a44");
    }

    // ---- FILE CABINETS "PAIN REPORTS" (back left) with a stuffed drawer + papers ----
    {
      const dm = hmat(S, { map: drawerTex(), self: [0.1, 0.1, 0.08] });
      for (const [x0, h] of [[-2.25, 1.3], [-1.76, 1.15]] as [number, number][]) {
        cast.rbox(paint, 0.46, h, 0.55, 0.03, TRS(x0 + 0.23, h / 2, BZ + 0.38), "#8a9a5a");
        const n = h > 1.2 ? 4 : 3, dh = (h - 0.08) / n;
        for (let k = 0; k < n; k++) {
          const y = 0.05 + dh * (k + 0.5), open = x0 > -2 && k === n - 1 ? 0.16 : 0;
          cast.rbox(paint, 0.42, dh - 0.03, 0.04 + open, 0.012, TRS(x0 + 0.23, y, BZ + 0.66 + open / 2), "#9aac68");
          fu.add(new THREE.PlaneGeometry(0.16, 0.06), dm, TRS(x0 + 0.23, y + dh * 0.18, BZ + 0.682 + open));
          fu.rbox(metal, 0.14, 0.025, 0.03, 0.01, TRS(x0 + 0.23, y - dh * 0.15, BZ + 0.69 + open), "#d8d0c0");
          if (open) for (let p = 0; p < 6; p++) fu.box(plain, x0 + 0.06 + p * 0.005, y + dh * 0.3, BZ + 0.6 + p * 0.03, x0 + 0.4 - p * 0.01, y + dh * 0.3 + 0.08 + 0.04 * Math.sin(p * 2.3), BZ + 0.606 + p * 0.03, p % 2 ? "#fffaf0" : "#ffe8e8");
        }
      }
      for (let p = 0; p < 7; p++) cast.rbox(plain, 0.34, 0.012, 0.26, 0.003, TRS(-2.02 + 0.01 * Math.sin(p * 1.7), 1.307 + p * 0.013, BZ + 0.4, 0.1 * Math.sin(p * 2.9)), p % 3 ? "#fffaf0" : "#ffd8e0");
    }
    // ---- right side: "DAYS WITHOUT BRAIN FREEZE: 0" sign, wall clock, a potted plant on a stool ----
    {
      fu.add(new THREE.PlaneGeometry(0.6, 0.45), hmat(S, { map: daysTex(), spec: 40, specK: 0.2, self: [0.1, 0.1, 0.1] }), TRS(1.78, 1.55, BZ + 0.012));
      fu.cyl(gloss, 0.17, 0.17, 0.05, 32, TRS(1.78, 2.2, BZ + 0.03, 0, Math.PI / 2), "#e8343c");
      fu.cyl(plain, 0.145, 0.145, 0.052, 32, TRS(1.78, 2.2, BZ + 0.032, 0, Math.PI / 2), "#fff8ec");
      fu.rbox(plain, 0.015, 0.1, 0.01, 0.005, TRS(1.78 + 0.02, 2.2 + 0.04, BZ + 0.062, 0, 0, -0.5), "#1a1a1a"); fu.rbox(plain, 0.015, 0.07, 0.01, 0.005, TRS(1.78 - 0.03, 2.2 + 0.01, BZ + 0.062, 0, 0, 1.2), "#1a1a1a");
      cast.cyl(paint, 0.17, 0.17, 0.04, 20, TRS(1.95, 0.5, -1.7), "#c8844a");
      for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; cast.rod(paint, V(1.95 + Math.cos(a) * 0.12, 0.48, -1.7 + Math.sin(a) * 0.12), V(1.95 + Math.cos(a) * 0.15, 0, -1.7 + Math.sin(a) * 0.15), 0.018, 6, "#9a5e30"); }
      cast.cyl(gloss, 0.12, 0.09, 0.2, 18, TRS(1.95, 0.62, -1.7), "#ff8a5a");
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; cast.add(new THREE.SphereGeometry(0.1, 10, 8), gloss, TRS(1.95 + Math.cos(a) * 0.08, 0.82 + (k % 3) * 0.08, -1.7 + Math.sin(a) * 0.08, 0, 0, 0, [0.7, 1.3, 0.7]), k % 2 ? "#4aa04a" : "#6ac05a"); }
    }
    // ---- practicals: two brass wall sconces (amber shades) + a pendant dome lamp ----
    {
      for (const sx of [-1, 1]) {
        fu.rod(metal, V(sx * (RX - 0.06), 1.85, -0.6), V(sx * (RX - 0.3), 1.95, -0.6), 0.015, 6, BRASS);
        fu.cyl(hmat(S, { col: "#000000", em: [2.6, 1.5, 0.6] }), 0.06, 0.11, 0.14, 18, TRS(sx * (RX - 0.32), 2.02, -0.6), "#ffffff", true);
      }
      fu.rod(metal, V(0, RYT, 0.9), V(0, 3.1, 0.9), 0.01, 6, "#3a3030");
      fu.add(new THREE.SphereGeometry(0.24, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), gloss, TRS(0, 3.1, 0.9), "#2f7f78");
      fu.sph(hmat(S, { col: "#000000", em: [3, 2, 1] }), TRS(0, 3.0, 0.9, 0, 0, 0, 0.06), 10);
    }

    b.build(R); fu.build(R); cast.build(R, true);
    // ---- glows (group 0 eyes, 1 practicals, 2 mouth lamp, 3 forehead lamp) + the pulse spark ----
    this.glows = new Glows(R, [
      ...[-1, 1].map((sx) => ({ p: V(sx * EYE_X, EYE_Y, BZ + 0.08), c: [0.5, 0.36, 0.18] as C3, s: 1.5, g: 0 })),
      ...[-1, 1].map((sx) => ({ p: V(sx * (RX - 0.32), 2.0, -0.6), c: [0.5, 0.3, 0.1] as C3, s: 0.7, g: 1 })),
      { p: V(0, 0.05, 0.6), c: [0.5, 0.35, 0.08], s: 0.6, g: 1 },
      { p: V(-0.7, 1.92, -1.45), c: [0.2, 0.008, 0.005], s: 0.75, g: 2 }, { p: V(-0.7, 1.92, -1.45), c: [0.16, 0.01, 0.01], s: 1.8, g: 2 },
      { p: V(0.7, 1.92, -1.45), c: [0.2, 0.008, 0.005], s: 0.75, g: 3 }, { p: V(0.7, 1.92, -1.45), c: [0.16, 0.01, 0.01], s: 2.2, g: 3 },
    ]);
    this.pulseGlow = new Glows(R, [{ p: V(0, 0, 0), c: [1.2, 1.0, 0.5], s: 0.42, g: 0 }, { p: V(0, 0, 0), c: [0.8, 0.55, 0.1], s: 0.9, g: 0 }, { p: V(0, 0, 0), c: [0.3, 0.18, 0.03], s: 2.0, g: 0 }], 0.3);
    this.shafts = [new Shaft(R, EYE_R * 0.98, EYE_R * 1.25, 0.03), new Shaft(R, EYE_R * 0.98, EYE_R * 1.25, 0.03)];
    this.beams = [new Shaft(R, 0.06, 0.9, 0.1), new Shaft(R, 0.06, 0.9, 0.1)];
    if (DEBUG_STANDIN) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 16), hmat(S, { col: "#ff9ab0" })); m.position.set(0, 0.95, -0.5); m.castShadow = true; R.add(m); }
    R.traverse((o) => { o.frustumCulled = false; });
  }

  /** the world's camera-relative sun for shot 3 (same formula as world.shotSun) */
  private sun() {
    if (this.sunV) return this.sunV;
    const id = SUN_FROM[3] ?? 3, s = SHOTS[id - 1], L = LOOKS.hq;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return (this.sunV = V(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize());
  }

  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const on = SHOTS[id - 1].place === "hq";
    this.root.visible = on;
    if (!on) return;
    if (DEBUG_CAM) {
      const d = DEBUG_VIEW;
      cam.position.set(HQ[0] + d[0], HQ[1] + d[1], HQ[2] + d[2]); cam.lookAt(HQ[0] + d[3], HQ[1] + d[4], HQ[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    const S = this.S, O = this.root.position, Wp = (x: number, y: number, z: number) => V(x + O.x, y + O.y, z + O.z);
    const st = hqAt(id, t), sd = this.sun();
    // ---- state ----
    const pulse = st.pulse, mL = st.mouthLamp, fL = st.foreLamp, blame = st.blame;
    const env = (u: number) => (u > 0 && u < 1 ? Math.sqrt(Math.sin(Math.PI * u)) : 0);
    const wl = smooth((t - (W.same + 0.52)) / 0.16), wr = smooth((t - (W.wires - 0.05)) / (W.forehead - 0.12 - W.wires + 0.05));
    const press = smooth((t - (W.blames - 0.08)) / 0.06) * (1 - smooth((t - (W.blames + 0.3)) / 0.2));
    const swell = springy((t - (W.blames - 0.08)) / 0.6);
    const spinM = t * Math.PI * 2 * 1.1, spinF = t * Math.PI * 2 * (1.1 + 0.4 * blame) + 1.7;
    const alarm = Math.max(mL, fL), blink = blinkAt(t);
    // ---- rig ----
    (S.u.uSD.value as THREE.Vector3).copy(sd);
    const sunK = 1 - 0.55 * blame;
    (S.u.uSC.value as THREE.Vector3).set(2.6 * sunK, 1.75 * sunK, 0.85 * sunK);
    (S.u.uE0.value as THREE.Vector3).set(O.x - EYE_X, O.y + EYE_Y, O.z + BZ); (S.u.uE1.value as THREE.Vector3).set(O.x + EYE_X, O.y + EYE_Y, O.z + BZ);
    S.u.uER.value = EYE_R * (1 - 0.95 * blink); S.u.uBZ.value = O.z + BZ;
    (S.u.uO.value as THREE.Vector3).copy(O); S.u.uFogCap.value = 0.5;
    const red = 0.1 * blame * (0.75 + 0.25 * Math.cos(spinF * 2));
    (S.u.uAU.value as THREE.Vector3).set(0.36 + red, 0.32 * (1 - 0.5 * blame), 0.5 * (1 - 0.4 * blame));
    (S.u.uAD.value as THREE.Vector3).set(0.34 + red * 0.6, 0.2 * (1 - 0.5 * blame), 0.12 * (1 - 0.5 * blame));
    const L: [THREE.Vector3, C3, number][] = [
      [Wp(0, 2.95, 0.9), [1.35 * (1 - 0.4 * blame), 0.92 * (1 - 0.6 * blame), 0.36 * (1 - 0.6 * blame)], 2.4],                                   // amber pendant (front, above)
      [Wp(-RX + 0.35, 2.0, -0.6), [0.55, 0.32, 0.12], 1.0],                          // sconce left
      [Wp(RX - 0.35, 2.0, -0.6), [0.55, 0.32, 0.12], 1.0],                           // sconce right
      [Wp(0, 1.2, -1.05), [0.05 + 0.25 * blame, 0.22 * (1 - blame), 0.16 * (1 - blame)], 0.55], // CRT glow
      [Wp(-0.7, 1.75, -0.9), [0.4 * mL, 0.02 * mL, 0.015 * mL], 0.6],               // MOUTH lamp
      [Wp(0.7, 1.75, -0.9), [0.4 * fL + 0.9 * blame, 0.02 * fL + 0.02 * blame, 0.015 * fL + 0.02 * blame], 0.6 + 0.8 * blame], // FOREHEAD lamp
      [Wp(0, -999, 0), [0, 0, 0], 0.5],                                             // the moving pulse (set below)
      [Wp(0.4, 1.9, 3.6), [0.16, 0.2, 0.42], 3.2],                                  // cool lilac front fill (blue shade)
      [Wp(0, 2.5, -1.9), [0.5 * sunK, 0.32 * sunK, 0.14 * sunK], 1.3],              // golden spill from the eyes
    ];
    // the pulse: up the main cable, then the left wire, then the right wire
    let pp: THREE.Vector3 | null = null, pk = 0;
    if (pulse > 0 && pulse < 1) { pp = this.curve.getPointAt(clamp01(pulse)); pk = env(pulse); }
    else if (wl > 0 && wl < 1) { pp = this.curveL.getPointAt(wl); pk = 0.8 * env(wl); }
    else if (wr > 0 && wr < 1) { pp = this.curveR.getPointAt(wr); pk = env(wr); }
    if (pp) { L[6][0] = pp.clone().add(O); L[6][1] = [2.0 * pk, 1.4 * pk, 0.35 * pk]; }
    L.forEach(([p, c, r], i) => { S.lp[i].copy(p); S.lc[i].set(...c); S.lr[i] = r; });
    // beacons (rotating, horizontal sweep)
    const bp = S.u.uBP.value as THREE.Vector3[], bd = S.u.uBD.value as THREE.Vector2[], bc = S.u.uBC.value as THREE.Vector3[];
    bp[0].copy(Wp(-0.7, 1.92, -1.5)); bp[1].copy(Wp(0.7, 1.92, -1.5));
    bd[0].set(Math.sin(spinM), Math.cos(spinM)); bd[1].set(Math.sin(spinF), Math.cos(spinF));
    bc[0].set(0.55 * mL, 0.02 * mL, 0.015 * mL); bc[1].set(0.55 * fL + 1.7 * blame, 0.02 * fL + 0.03 * blame, 0.015 * fL + 0.03 * blame);
    // ---- materials ----
    this.cableMain.uniforms.uGl.value = 0.45 + 0.3 * smooth(pulse * 3); this.cableMain.uniforms.uPu.value = pulse > 0 && pulse < 1 ? pulse : -1; this.cableMain.uniforms.uPk.value = 2.4 * env(pulse);
    this.wireL.uniforms.uGl.value = 0.12 + 0.4 * wl; this.wireL.uniforms.uPu.value = wl > 0 && wl < 1 ? wl : -1; this.wireL.uniforms.uPk.value = 2.4 * env(wl);
    this.wireR.uniforms.uGl.value = 0.12 + 0.4 * wr; this.wireR.uniforms.uPu.value = wr > 0 && wr < 1 ? wr : -1; this.wireR.uniforms.uPk.value = 2.4 * env(wr);
    (this.holeGlow.uniforms.uEm.value as THREE.Vector3).set(0.9 + 0.8 * (1 - pulse), 0.6 + 0.5 * (1 - pulse), 0.15);
    const domeE = (k: number, extra: number): C3 => [0.1 + 0.42 * k + 0.3 * extra, 0.006 + 0.012 * k + 0.02 * extra, 0.006 + 0.01 * k + 0.012 * extra];
    (this.domeM.uniforms.uEm.value as THREE.Vector3).set(...domeE(mL, 0)); this.domeM.uniforms.uAng.value = spinM;
    (this.domeM.uniforms.uDC.value as THREE.Vector3).copy(Wp(-0.7, 1.92, -1.65));
    (this.domeF.uniforms.uEm.value as THREE.Vector3).set(...domeE(fL, 2.6 * blame)); this.domeF.uniforms.uAng.value = spinF;
    (this.domeF.uniforms.uDC.value as THREE.Vector3).copy(Wp(0.7, 1.92, -1.65));
    this.domeFG.scale.setScalar(1 + 0.25 * swell);
    const bpos = slopeAt(BTN.s), pd = 0.07 - 0.035 * press;
    this.btn.position.set(BTN.x, bpos.y + pd * Math.cos(TILT), bpos.z + pd * Math.sin(TILT));
    for (const l of this.lids) l.uniforms.uLid.value = blink;
    const conf = smooth((t - (W.confused - 0.2)) / 0.2) * (1 - smooth((t - (W.blames - 0.15)) / 0.15));
    this.scr.forEach((m, k) => {
      const flick = 0.88 + 0.12 * Math.sin(t * 37 + k * 2.1);
      const r = blame * (0.6 + 0.4 * Math.max(0, Math.cos(spinF * 2)));
      (m.uniforms.uEm.value as THREE.Vector3).set((0.35 + 2.0 * r) * flick, (1.5 * (1 - r) + 0.15) * flick, (0.85 * (1 - r) + 0.1) * flick);
      if (k === 1) m.uniforms.uMix.value = conf;
    });
    for (const m of this.outMat) (m.uniforms.uEm.value as THREE.Vector3).set(1.25 * (1 - 0.3 * blame), 1.18 * (1 - 0.4 * blame), 1.08 * (1 - 0.4 * blame));
    // ---- glows, shafts, beacon beams ----
    this.glows.gk.set(1 - 0.5 * blame, 1, 0.15 + 1.0 * mL, 0.15 + 1.0 * fL + 0.7 * blame * (0.8 + 0.2 * Math.cos(spinF * 2)));
    if (pp) { this.pulseGlow.mesh.visible = true; this.pulseGlow.mesh.position.copy(pp); this.pulseGlow.gk.set(pk, 0, 0, 0); } else this.pulseGlow.mesh.visible = false;
    const sdl = sd.clone().negate();
    for (const sh of this.shafts) (sh.mat.uniforms.uZB.value as THREE.Vector3).set(O.z - 2.25, O.z - 1.45, 0.12); // dim where the beam crosses the lamp panel
    [-1, 1].forEach((sx, i) => this.shafts[i].set(V(sx * EYE_X, EYE_Y, BZ - 0.05), sdl, 4.2, [1.0, 0.72, 0.36], 1.15 * sunK * (1 - blink), O));
    const beamDir = (a: number) => V(Math.sin(a), -0.08, Math.cos(a)).normalize();
    this.beams[0].set(V(-0.7, 1.92, -1.6), beamDir(spinM), 2.6, [1.0, 0.06, 0.04], 0.9 * mL * smooth(Math.cos(spinM) * 3 + 0.4) * (0.12 + 0.88 * Math.sin(spinM) ** 2), O);
    this.beams[1].set(V(0.7, 1.92, -1.6), beamDir(spinF), 2.6 + 1.0 * blame, [1.0, 0.06, 0.04], (0.9 * fL + 1.3 * blame) * smooth(Math.cos(spinF) * 3 + 0.4) * (0.12 + 0.88 * Math.sin(spinF) ** 2), O);
    // ---- character cards pick up the red alarm (the brain at the chair) ----
    if (alarm > 0) {
      const brain = V(0, 1.0, -0.5), sweep = (p: THREE.Vector3, a: number) => { const d = brain.clone().sub(p), h = Math.hypot(d.x, d.z); return Math.pow(Math.max(0, (d.x * Math.sin(a) + d.z * Math.cos(a)) / h), 10); };
      const k = Math.min(1, 0.25 * mL * (0.3 + sweep(V(-0.7, 1.92, -1.5), spinM)) + (0.25 * fL + 0.55 * blame) * (0.35 + sweep(V(0.7, 1.92, -1.5), spinF)));
      const ct = CHAR.uCharTint.value, si = CHAR.uSideTint.value;
      ct.set(ct.x + (1.25 - ct.x) * k, ct.y + (0.5 - ct.y) * k, ct.z + (0.45 - ct.z) * k);
      si.set(si.x + (1.1 - si.x) * k, si.y + (0.35 - si.y) * k, si.z + (0.35 - si.z) * k);
    }
  }
}
