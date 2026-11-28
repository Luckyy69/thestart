// OWNER: staff. The crew's STAFF ROOM (shot 4) inside the stomach wall, at STAFF = (2000, 0, 0): a cosy, funny break
// room with pink fleshy walls that have TILES painted on (lower 1.3 m), a checker lino floor, a round PORTHOLE in the
// back wall showing the stomach juice sloshing outside (glowing green-yellow), lockers, a red vending machine
// "SNACKS (for humans)" full of human food, a coffee counter, a punch-card TIME CLOCK, a big SCHEDULE lightbox
// ("SHIFT: CLEAN / 11:59 / (right before LUNCH)") that flickers on with chasing marquee bulbs on staffAt.board, the big
// WALL CLOCK (11:58 -> 11:59 on tick: the minute hand jumps with a springy overshoot as the red second hand hits 12), a
// red ALARM beacon on top of the clock that spins (sweeping red beam, red light washing the room and the cards) from
// the whistle on, a mop rack + bucket, a "NO CRUMB LEFT BEHIND" poster, "EMPLOYEE OF THE MONTH", a water cooler.
// The crew's EXIT door (back wall, left, green EXIT sign) swings open on the whistle onto a glowing stomach tunnel.
// The room is entered through the front wall's "STAFF ONLY" doorway (for the 3 -> 4 swoosh).
//
// The room lights itself with its OWN shader rig (technique: freeze/hq.ts): ambient (cool lilac from above, warm from
// below), 8 soft point lights (two tungsten pendants, the cool vending glow, the green-yellow porthole juice, the
// board glow, the corridor spill, the exit sign, a cool front fill = the blue shade), the spinning red BEACON and a
// low warm tungsten KEY along the world sun (looks.ts staff az/el), multiplied by the world shadow map, so the cards'
// long shadows fall across the floor onto the back wall. Glows + hazy light cones (NOINK, additive).
//
// CONTRACTS (local metres, world = STAFF + local; floor y 0; the camera looks -z at the back wall):
//   room: floor x -2.8..2.8, z -2.4..4.6; back wall z -2.4; side walls x +-2.8 (superellipse vault, apex y 3.4);
//     front wall z 4.6 with the STAFF ONLY doorway x -0.65..0.65, y 0..2.3 (STAFF_ENTRY = its centre). Outside the
//     doorway: a big flesh wall + floor (z > 4.6), so a camera can fly in through the door. Keep the camera >= 0.6 m
//     from the door frame (x +-0.65) and the open door leaf (hinged at x -0.65, swung in to about (-1.07, 3.37)).
//   CLOCK centre STAFF_CLOCK = (0, 2.2, -2.2) (face radius 0.38); BEACON on top (0, 2.8, -2.28).
//   SCHEDULE board STAFF_BOARD centre (-0.98, 2.15, -2.34), 0.95 x 1.1 m (the foreman points here).
//   EXIT door STAFF_EXIT (-2.17, 0, -2.4) (opening x -2.55..-1.8, h 1.95): opens from the whistle; the crew run out
//     through it (or out of frame). MOP rack x -1.35..-0.6 on the back wall (mops hang, heads at y ~0.3; the 3D mops
//     STAY: the cast carries its own mops when they run). Bucket (-0.78, 0, -2.0).
//   Counter + coffee machine x 0.42..1.32 (z -2.4..-1.85, top y 0.93); VENDING machine x 1.4..2.3, front z -1.65;
//   PORTHOLE (1.85, 2.5, -2.4) r 0.34; lockers on the left wall x -2.7..-2.3, z -1.7..-0.2; water cooler (2.4, 0, 0.3).
//   Floor in front of the back wall z -1.6..3 and x -1.4..1.4 is FREE for the cast (crew around (0, 0, -0.6)).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { NOINK } from "../bridge/ink";
import { CHAR } from "../bridge/shade";
import { STAFF, W, SHOTS, SUN_FROM, V3 as SV3, camAt, staffAt, smooth, clamp01 } from "./story";
import { LOOKS } from "./looks";
import {
  fleshTex, tileTex, floorTex, clockTex, boardTex, boardGlowTex, posterTex, vendWinTex, vendSignTex, vendPanelTex, doorTex,
  exitTex, lockerTex, timeClockTex, cardRackTex, employeeTex, corridorTex, coffeeTex, matTex,
} from "./staff_paint";

type C3 = [number, number, number];
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const add = (x: number, y: number, z: number): SV3 => [STAFF[0] + x, STAFF[1] + y, STAFF[2] + z];

// ============================================================ layout
const RX = 2.8, RYT = 3.4, BZ = -2.4, FZ = 4.6;
const DX0 = -2.55, DX1 = -1.8, DH = 1.95;                 // the crew EXIT door (back wall)
const EW = 0.65, EH = 2.3;                                // the STAFF ONLY entry doorway (front wall), half width / height
const PX = 1.85, PY = 2.5, PR = 0.34;                     // porthole
const CX = 0, CY = 2.2, CZ = -2.2, CR = 0.38;             // wall clock
const BX = -0.975, BY = 2.148, BW = 0.95, BH = 0.95 * 1180 / 1024; // schedule board
const TILE_TOP = 1.32;

// ============================================================ exported contracts (world coordinates)
export const STAFF_CLOCK = add(CX, CY, CZ);
export const STAFF_BEACON = add(0, 2.8, -2.28);
export const STAFF_BOARD = add(BX, BY, -2.34);
export const STAFF_EXIT = add((DX0 + DX1) / 2, 0, BZ);
export const STAFF_ENTRY = add(0, 1.15, FZ);
export const STAFF_PORTHOLE = add(PX, PY, BZ);
export const STAFF_BUCKET = add(-0.78, 0, -2.0);
export const STAFF_CREW = add(0, 0, -0.6);

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
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, rs = 10, ts = 48) { this.add(new THREE.TorusGeometry(R, r, rs, ts), mat, mx, col); }
  plane(mat: THREE.Material, w: number, h: number, mx: THREE.Matrix4, col?: string) { this.add(new THREE.PlaneGeometry(w, h), mat, mx, col); }
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

// ============================================================ the staff-room light shader (own rig)
const NL = 8;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uBP; uniform vec2 uBD; uniform vec3 uBC; uniform vec3 uO; uniform float uFogCap; uniform float uTime;
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(${RX.toFixed(2)} - abs(l.x), l.z - (${BZ.toFixed(2)})), 9.0);
  float a = 0.62 + 0.38 * smoothstep(0.0, 0.7, dw);
  float b = l.y > 0.004 ? 0.72 + 0.28 * smoothstep(0.0, 0.3, l.y) : 1.0;
  return a * b;
}
vec3 beaconL(vec3 p, vec3 n){
  vec3 d = p - uBP; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
  vec2 hz = normalize(d.xz + vec2(1e-5));
  float beam = pow(max(dot(hz, uBD), 0.0), 6.0);
  return uBC * (0.12 + 1.9 * beam) * smoothstep(-0.25, 0.5, dot(n, -l)) * fallK(2.6, r2) * smoothstep(0.15, 0.7, sqrt(r2));
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * ao * (0.8 + 0.2 * sh);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.7 + 0.3 * sh) * (0.45 + 0.55 * ao);
  }
  L += beaconL(p, n);
  float ndl = dot(n, uSD);
  if (ndl > 0.0) L += uSC * smoothstep(0.0, 0.3, ndl) * sh * (0.6 + 0.4 * ao);
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
uniform sampler2D uMap; uniform sampler2D uMap2; uniform vec3 uGlowK; uniform float uTile;
uniform vec3 uDC; uniform float uAng;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${CORE}
float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  float sh = getShadowMask();
  vec2 uv = vUv * uRep;
  vec3 alb = uCol * vC;
#ifdef WALL
  // flesh everywhere, hand-painted tiles on the lower walls (triplanar by the dominant normal, 1 m texture tiles)
  vec3 lp = vW - uO; vec3 an = abs(n);
  vec2 tuv = an.z > an.x ? vec2(lp.x, lp.y) : vec2(lp.z, lp.y);
  float cl = smoothstep(0.6, 0.85, an.y);
  vec3 fl = texture2D(uMap, cl > 0.5 ? lp.xz * 0.8 : tuv * 0.8).rgb;
  vec3 tl = texture2D(uMap2, tuv).rgb;
  float edge = ${TILE_TOP.toFixed(2)} + 0.025 * sin(tuv.x * 7.0) + 0.012 * sin(tuv.x * 23.0);
  float tk = (1.0 - smoothstep(edge - 0.008, edge + 0.008, lp.y)) * (1.0 - cl) * uTile;
  alb *= mix(fl, tl, tk);
  float st = smoothstep(edge + 0.03, edge + 0.04, lp.y) * (1.0 - smoothstep(edge + 0.1, edge + 0.11, lp.y)) * (1.0 - cl) * uTile;
  alb = mix(alb, vec3(0.86, 0.3, 0.34), st);
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
#ifdef GLOWMAP
  c += texture2D(uMap2, uv).rgb * uGlowK;
#endif
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm + alb * lit * 0.05;
#endif
#ifdef PORT
  // the stomach JUICE sloshing outside the porthole (disc uv), bubbles rising, the pink cavern wall above
  vec2 q = vUv * 2.0 - 1.0;
  float wv = 0.02 + 0.07 * sin(q.x * 4.0 + uTime * 1.5) + 0.03 * sin(q.x * 11.0 - uTime * 2.4);
  float juice = 1.0 - smoothstep(wv - 0.015, wv + 0.015, q.y);
  vec3 wall = mix(vec3(0.42, 0.08, 0.16), vec3(0.9, 0.3, 0.34), smoothstep(-0.1, 1.0, q.y));
  wall *= 0.82 + 0.18 * sin(q.y * 16.0 + sin(q.x * 3.0 + 1.0) * 2.0);
  vec3 jc = mix(vec3(0.78, 0.95, 0.12), vec3(0.18, 0.5, 0.05), smoothstep(wv, -1.0, q.y));
  for (int i = 0; i < 7; i++) {
    float fi = float(i), bx = -0.75 + 1.5 * h1(fi + 1.3), sp = 0.18 + 0.12 * h1(fi + 7.1);
    float by = -1.0 + mod(uTime * sp + h1(fi + 3.7) * 2.0, 1.0 + wv) ;
    float br = 0.05 + 0.05 * h1(fi + 9.2);
    float d = length(q - vec2(bx + 0.04 * sin(uTime * 2.0 + fi), by));
    float ring = smoothstep(br, br - 0.02, d) - smoothstep(br - 0.025, br - 0.045, d);
    jc = mix(jc, vec3(1.0, 1.0, 0.8), ring * 0.85 * step(by, wv - 0.02));
  }
  vec3 pc = mix(wall * 0.75, jc * 1.25, juice) + vec3(1.0, 1.0, 0.7) * exp(-pow((q.y - wv) / 0.025, 2.0)) * 0.8;
  float gl = smoothstep(0.62, 0.7, length(q - vec2(-0.12, 0.12))) * (1.0 - smoothstep(0.72, 0.8, length(q - vec2(-0.12, 0.12)))) * step(0.0, -q.x + q.y + 0.2);
  c = pc * uEm + vec3(0.9, 0.95, 1.0) * gl * 0.45;
#endif
#ifdef DOME
  // the ALARM beacon: a rotating reflector behind red glass, a bright band sweeps across the dome
  vec3 qd = (vW - uDC) / max(length(vW - uDC), 1e-4);
  float s = sin(uAng), fr = 0.5 + 0.5 * cos(uAng);
  float band = exp(-pow((qd.x - s) / 0.32, 2.0)) * (0.25 + 0.75 * fr);
  c = uEm * (0.45 + 1.0 * band) + vec3(0.3, 0.1, 0.0) * band * uEm.r + alb * lit * 0.12;
  c += vec3(1.0, 0.92, 0.85) * pow(max(dot(n, normalize(vec3(-0.45, 0.65, 0.6))), 0.0), 50.0) * 0.8;
#endif
  vec3 v = normalize(cameraPosition - vW);
  if (uRim > 0.0) c += uRim * pow(1.0 - max(dot(n, v), 0.0), 3.0) * uAU;
#ifdef SPEC
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  { vec3 d = uBP - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    vec2 hz = normalize(-d.xz + vec2(1e-5)); float beam = pow(max(dot(hz, uBD), 0.0), 8.0);
    c += uBC * (0.2 + beam) * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(2.8, r2) * uSpecK; }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * uSpecK * sh * 0.5;
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
      uSD: { value: V(0, 1, 0) }, uSC: { value: V(0, 0, 0) }, uBP: { value: V(0, -999, 0) }, uBD: { value: new THREE.Vector2(1, 0) }, uBC: { value: V(0, 0, 0) },
      uO: { value: V(0, 0, 0) }, uFogCap: { value: 0.5 }, uTime: { value: 0 },
    },
  };
};
type MOpt = { col?: string; map?: THREE.Texture; map2?: THREE.Texture; em?: C3; self?: C3; spec?: number; specK?: number; emap?: boolean; glow?: boolean; rep?: [number, number]; rim?: number; dome?: boolean; wall?: boolean; port?: boolean; cutout?: boolean; tile?: number };
const smat = (S: Rig, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap && !o.wall) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.glow) defines.GLOWMAP = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.dome) defines.DOME = "1";
  if (o.wall) defines.WALL = "1";
  if (o.port) defines.PORT = "1";
  if (o.cutout) defines.CUTOUT = "1";
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uMap2: { value: o.map2 ?? null }, uGlowK: { value: V(0, 0, 0) },
      uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) }, uRim: { value: o.rim ?? 0 }, uTile: { value: o.tile ?? 1 },
      uDC: { value: V(0, 0, 0) }, uAng: { value: 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true, fog: true,
  });
};

// ============================================================ glows + light cones (NOINK, additive)
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
/** a soft hazy light cone (radius r0 at the apex -> r1 at length L along d), additive, ray-marched density */
class Shaft {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, r0: number, r1: number, fadeIn = 0.06) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 40, 1, false); g.translate(0, 0.5, 0);
    const P = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) { const y = P.getY(i), r = (r0 + (r1 - r0) * y) * 1.04 + 0.01; P.setXYZ(i, P.getX(i) * r, y, P.getZ(i) * r); }
    g.computeVertexNormals();
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: V(1, 1, 1) }, uK: { value: 0 }, uIn: { value: fadeIn }, uA: { value: V(0, 0, 0) }, uD: { value: V(0, 1, 0) }, uL: { value: 1 }, uR: { value: new THREE.Vector2(r0, r1) } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform vec3 uC; uniform float uK; uniform float uIn; uniform vec3 uA; uniform vec3 uD; uniform float uL; uniform vec2 uR; varying vec3 vW;
        float dens(vec3 p){
          vec3 q = p - uA; float ax = dot(q, uD), s = ax / uL;
          if (s < 0.0 || s > 1.0) return 0.0;
          float r = mix(uR.x, uR.y, s), x = length(q - uD * ax) / r;
          return max(0.0, 1.0 - x * x) * smoothstep(0.0, uIn, s) * (1.0 - smoothstep(0.3, 1.0, s));
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

// ============================================================ the room shell
/** the vault outline: superellipse |x/RX|^4 + |y/RYT|^4 = 1 (y >= 0), from the left floor corner over to the right */
const vault = (n: number): [number, number][] => {
  const o: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = Math.PI * (1 - i / n), c = Math.cos(a), s = Math.sin(a); o.push([RX * Math.sign(c) * Math.sqrt(Math.abs(c)), RYT * Math.sqrt(Math.abs(s))]); }
  return o;
};
/** the side walls + ceiling: the outline extruded from the back wall to the front; soft fleshy bulges above y 2 */
const vaultGeo = () => {
  const prof = vault(72), nz = 44, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nz; j++) {
    const z = BZ + ((FZ - BZ) * j) / nz;
    for (let i = 0; i < prof.length; i++) {
      const [x, y] = prof[i], a = Math.PI * (1 - i / (prof.length - 1));
      const nx = -Math.cos(a), ny = -Math.sin(a), nl = Math.hypot(nx, ny);
      const k = smooth((y - 2.0) / 0.6) * smooth((z - BZ) / 0.5) * smooth((FZ - z) / 0.5);
      const d = (0.06 + 0.06 * Math.sin(z * 2.1 + y * 1.7) * Math.sin(y * 2.9 - z * 1.3) + 0.04 * Math.sin(x * 3.1 + z * 3.3)) * k;
      pos.push(x + (nx / nl) * d, y + (ny / nl) * d, z);
    }
  }
  const np = prof.length;
  for (let j = 0; j < nz; j++) for (let i = 0; i < np - 1; i++) { const a = j * np + i, b = a + 1, c = a + np, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};
/** the back wall: the vault outline as a flat shape with the EXIT door + porthole holes */
const backGeo = () => {
  const s = new THREE.Shape(), p = vault(72);
  s.moveTo(-RX, -0.1); for (const [x, y] of p) s.lineTo(x, Math.max(y, 0)); s.lineTo(RX, -0.1); s.lineTo(-RX, -0.1);
  const d = new THREE.Path(); d.moveTo(DX0, -0.05); d.lineTo(DX1, -0.05); d.lineTo(DX1, DH); d.lineTo(DX0, DH); d.lineTo(DX0, -0.05); s.holes.push(d);
  const h = new THREE.Path(); h.absarc(PX, PY, PR + 0.02, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ShapeGeometry(s, 48); g.translate(0, 0, BZ);
  return g;
};
/** the front wall (z FZ): a big flesh wall with the STAFF ONLY doorway */
const frontGeo = () => {
  const s = new THREE.Shape();
  s.moveTo(-7, -0.1); s.lineTo(7, -0.1); s.lineTo(7, 7); s.lineTo(-7, 7); s.lineTo(-7, -0.1);
  const d = new THREE.Path(); d.moveTo(-EW, -0.05); d.lineTo(EW, -0.05); d.lineTo(EW, EH); d.lineTo(-EW, EH); d.lineTo(-EW, -0.05); s.holes.push(d);
  const g = new THREE.ShapeGeometry(s, 12); g.translate(0, 0, FZ);
  return g;
};
/** 0 -> 1 with a springy overshoot (u in 0..1+) */
const springy = (u: number) => (u <= 0 ? 0 : 1 - Math.exp(-5 * u) * Math.cos(10 * u));
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const DEBUG_CAM = false as boolean; // staff-only framing check (OFF for the real render)
const DEBUG_VIEW = [0.0, 1.6, 4.2, 0.0, 1.5, -1.5, 62];

export class Staff {
  root = new THREE.Group();
  private S = rig();
  private glows: Glows; private bulbs: Glows; private cones: Shaft[] = []; private beam: Shaft;
  private dome: THREE.ShaderMaterial; private boardM: THREE.ShaderMaterial; private bulbM: THREE.ShaderMaterial; private vendM: THREE.ShaderMaterial[] = [];
  private portM: THREE.ShaderMaterial; private exitM: THREE.ShaderMaterial; private corrM: THREE.ShaderMaterial;
  private hHour = new THREE.Group(); private hMin = new THREE.Group(); private hSec = new THREE.Group();
  private door = new THREE.Group();
  private sunV: THREE.Vector3 | null = null;

  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...STAFF);
    const b = new Bat(), fu = new Bat(), cast = new Bat();
    const wall = smat(S, { wall: true, map: fleshTex(), map2: tileTex(), spec: 22, specK: 0.14, rim: 0.12 });
    const flesh = smat(S, { wall: true, map: fleshTex(), map2: tileTex(), tile: 0, spec: 18, specK: 0.12, rim: 0.1 });
    const floor = smat(S, { map: floorTex(), rep: [1 / 1.6, 1 / 1.6], spec: 50, specK: 0.3 });
    const plain = smat(S, {}), paint = smat(S, { spec: 30, specK: 0.2 }), gloss = smat(S, { spec: 60, specK: 0.55 }), metal = smat(S, { spec: 90, specK: 0.9 });
    const tex = (map: THREE.Texture, self: C3 = [0.1, 0.1, 0.1], spec = 30, specK = 0.15) => smat(S, { map, self, spec, specK });
    const INK = "#2a1c20", BRASS = "#d9a548", RED = "#e8343c", CREAM = "#f6e6c8", WOOD = "#7a4a2a";

    // ---- shell: checker floor, vault walls + ceiling, back wall, front wall, outside approach ----
    { const g = new THREE.PlaneGeometry(2 * RX, FZ - BZ, 4, 4); g.rotateX(-Math.PI / 2); g.translate(0, 0, (BZ + FZ) / 2);
      const P = g.getAttribute("position") as THREE.BufferAttribute, U = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i), -P.getZ(i));
      b.add(g, floor); }
    b.add(vaultGeo(), wall);
    b.add(backGeo(), wall, undefined, "#fff4f0");
    b.add(frontGeo(), flesh, undefined, "#f4d0cc");
    { const g = new THREE.PlaneGeometry(14, 6); g.rotateX(-Math.PI / 2); g.translate(0, -0.002, FZ + 3); b.add(g, flesh, undefined, "#e8b0a8"); }
    // baseboard (wood) along the back wall + the side walls
    b.box(paint, -RX + 0.05, 0, BZ, DX0 - 0.06, 0.1, BZ + 0.05, WOOD); b.box(paint, DX1 + 0.06, 0, BZ, RX - 0.05, 0.1, BZ + 0.05, WOOD);
    for (const sx of [-1, 1]) b.box(paint, sx * (RX - 0.06), 0, BZ, sx * (RX - 0.005), 0.1, FZ, WOOD);

    // ---- the EXIT door (back wall, left): frame, the swinging leaf, the glowing tunnel behind, EXIT sign, mat ----
    {
      const fc = "#f2e6d0";
      fu.box(paint, DX0 - 0.07, 0, BZ - 0.02, DX0, DH + 0.07, BZ + 0.06, fc); fu.box(paint, DX1, 0, BZ - 0.02, DX1 + 0.07, DH + 0.07, BZ + 0.06, fc);
      fu.box(paint, DX0 - 0.07, DH, BZ - 0.02, DX1 + 0.07, DH + 0.08, BZ + 0.06, fc);
      const lb = new Bat(), dw = DX1 - DX0;
      lb.box(paint, 0.01, 0.01, -0.045, dw - 0.01, DH - 0.01, -0.005, "#5ab8a8");
      lb.plane(tex(doorTex("CREW"), [0.12, 0.12, 0.12]), dw - 0.03, DH - 0.03, TRS(dw / 2, DH / 2, -0.002));
      lb.sph(metal, TRS(dw - 0.09, 1.0, 0.03, 0, 0, 0, 0.035), 12, BRASS); lb.rod(metal, V(dw - 0.09, 1.0, 0.0), V(dw - 0.09, 1.0, 0.03), 0.012, 6, BRASS);
      for (const m of lb.build(this.door, true)) m.matrixAutoUpdate = true;
      this.door.position.set(DX0, 0, BZ); R.add(this.door);
      // the tunnel behind (flesh, open toward the room) + its glowing far end
      const cz0 = BZ - 1.1;
      { const g = new THREE.PlaneGeometry(dw + 0.1, 1.1); g.rotateX(-Math.PI / 2); g.translate((DX0 + DX1) / 2, 0, BZ - 0.55); b.add(g, flesh, undefined, "#d88890"); }
      { const g = new THREE.PlaneGeometry(dw + 0.1, 1.1); g.rotateX(Math.PI / 2); g.translate((DX0 + DX1) / 2, DH + 0.05, BZ - 0.55); b.add(g, flesh, undefined, "#d88890"); }
      for (const x of [DX0 - 0.05, DX1 + 0.05]) { const g = new THREE.PlaneGeometry(1.1, DH + 0.1); g.rotateY(Math.PI / 2); g.translate(x, (DH + 0.1) / 2 - 0.05, BZ - 0.55); b.add(g, flesh, undefined, "#d88890"); }
      this.corrM = smat(S, { map: corridorTex(), emap: true, em: [1.1, 1.0, 0.95] });
      { const g = new THREE.PlaneGeometry(dw + 0.12, DH + 0.12); g.translate((DX0 + DX1) / 2, DH / 2, cz0); b.add(g, this.corrM); }
      // EXIT sign
      fu.rbox(paint, 0.42, 0.17, 0.07, 0.015, TRS((DX0 + DX1) / 2, DH + 0.27, BZ + 0.035), "#e8e8e0");
      this.exitM = smat(S, { map: exitTex(), emap: true, em: [1.2, 1.2, 1.2] });
      fu.plane(this.exitM, 0.38, 0.14, TRS((DX0 + DX1) / 2, DH + 0.27, BZ + 0.072));
      fu.plane(smat(S, { map: matTex(), self: [0.08, 0.08, 0.08], spec: 10, specK: 0.05 }), 0.72, 0.36, TRS((DX0 + DX1) / 2, 0.005, BZ + 0.38, 0, -Math.PI / 2));
    }

    // ---- the WALL CLOCK (centre) + the ALARM beacon on top ----
    {
      cast.cyl(gloss, 0.43, 0.43, 0.16, 48, TRS(CX, CY, BZ + 0.08, 0, Math.PI / 2), RED);
      fu.torus(gloss, 0.41, 0.035, TRS(CX, CY, CZ - 0.005), "#c8242c", 12, 64);
      fu.add(new THREE.CircleGeometry(CR, 64), tex(clockTex(), [0.22, 0.2, 0.18], 40, 0.25), TRS(CX, CY, CZ - 0.02));
      const hand = (grp: THREE.Group, L: number, wdt: number, z: number, col: string, tail = 0.05) => {
        const hb = new Bat(); hb.rbox(plain, wdt, L + tail, 0.012, wdt * 0.45, TRS(0, (L - tail) / 2, 0), col);
        for (const m of hb.build(grp, false)) m.matrixAutoUpdate = true;
        grp.position.set(CX, CY, z); R.add(grp);
      };
      hand(this.hHour, 0.2, 0.04, CZ - 0.006, INK); hand(this.hMin, 0.31, 0.028, CZ + 0.004, INK); hand(this.hSec, 0.33, 0.011, CZ + 0.014, RED, 0.08);
      fu.cyl(metal, 0.028, 0.028, 0.03, 16, TRS(CX, CY, CZ + 0.02, 0, Math.PI / 2), "#2a2a2a");
      // the beacon (a bracket, a chrome base, the red dome)
      fu.box(metal, -0.04, 2.6, BZ, 0.04, 2.66, BZ + 0.14, "#6a6a72");
      fu.cyl(metal, 0.1, 0.11, 0.06, 24, TRS(0, 2.69, -2.28), "#9a9aa2");
      const dg = new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); dg.scale(1, 1.25, 1);
      this.dome = smat(S, { dome: true, col: "#ff4040", em: [0.3, 0.03, 0.03], spec: 70, specK: 0.6 });
      const dm = new THREE.Mesh(clean(dg), this.dome); dm.position.set(0, 2.72, -2.28); dm.frustumCulled = false; R.add(dm);
      fu.torus(metal, 0.1, 0.012, TRS(0, 2.72, -2.28, 0, Math.PI / 2), "#d0d0d8", 8, 32);
    }

    // ---- the SCHEDULE board (lightbox) + marquee bulbs ----
    const bulbPts: THREE.Vector3[] = [];
    {
      cast.rbox(paint, BW + 0.08, BH + 0.08, 0.06, 0.02, TRS(BX, BY, BZ + 0.03), "#5a3420");
      this.boardM = smat(S, { map: boardTex(), map2: boardGlowTex(), glow: true, self: [0.08, 0.08, 0.1], spec: 40, specK: 0.2 });
      fu.plane(this.boardM, BW, BH, TRS(BX, BY, BZ + 0.064));
      const per = 2 * (BW + BH), nB = 30;
      for (let i = 0; i < nB; i++) {
        let s = (i / nB) * per; const x0 = BX - BW / 2 - 0.02, y0 = BY - BH / 2 - 0.02, w = BW + 0.04, h = BH + 0.04;
        let x = x0, y = y0;
        if (s < w) x = x0 + s; else if ((s -= w) < h) { x = x0 + w; y = y0 + s; } else if ((s -= h) < w) { x = x0 + w - s; y = y0 + h; } else { s -= w; y = y0 + h - s; }
        bulbPts.push(V(x, y, BZ + 0.075));
      }
      this.bulbM = smat(S, { col: "#fff0c8", em: [0.2, 0.18, 0.12] });
      const bb = new Bat(); for (const p of bulbPts) bb.sph(this.bulbM, TRS(p.x, p.y, p.z, 0, 0, 0, 0.019), 8);
      bb.build(R);
    }

    // ---- TIME CLOCK + card rack, MOP rack (mops + broom) + bucket ----
    {
      cast.rbox(paint, 0.26, 0.32, 0.14, 0.02, TRS(-1.6, 1.3, BZ + 0.07), "#c8bfa8");
      fu.plane(tex(timeClockTex(), [0.12, 0.12, 0.12]), 0.24, 0.3, TRS(-1.6, 1.3, BZ + 0.142));
      fu.box(paint, -1.73, 0.82, BZ, -1.47, 1.06, BZ + 0.05, "#8a6a4a");
      fu.plane(tex(cardRackTex()), 0.24, 0.22, TRS(-1.6, 0.94, BZ + 0.052));
      // the rack rail + pegs
      cast.rbox(paint, 0.82, 0.08, 0.04, 0.015, TRS(-0.975, 1.44, BZ + 0.02), WOOD);
      const mopX = [-1.27, -1.04, -0.81, -0.62];
      mopX.forEach((x, k) => {
        fu.rod(metal, V(x, 1.44, BZ + 0.04), V(x, 1.47, BZ + 0.12), 0.012, 6, "#c8c0b0");
        const tilt = 0.04 * Math.sin(k * 2.3), top = V(x, 1.5, BZ + 0.1), bot = V(x + tilt, 0.36, BZ + 0.13);
        cast.rod(paint, top, bot, 0.016, 8, ["#c8864a", "#3a7fd0", "#c8864a", "#e8a43a"][k]);
        if (k < 3) {
          cast.rbox(gloss, 0.14, 0.04, 0.05, 0.012, TRS(bot.x, 0.36, bot.z), "#3a7fd0");
          for (let s = 0; s < 9; s++) { const a = (s / 9) * Math.PI - Math.PI / 2, sx = Math.sin(a) * 0.07; cast.rod(plain, V(bot.x + sx * 0.8, 0.35, bot.z + 0.01), V(bot.x + sx * 1.3 + 0.01 * Math.sin(s * 3 + k), 0.08 + 0.03 * hash(s + k * 9), bot.z + 0.03 + 0.02 * Math.cos(s)), 0.016, 5, "#f4f0e4"); }
        } else {
          cast.rbox(paint, 0.24, 0.06, 0.05, 0.012, TRS(bot.x, 0.34, bot.z), "#5a3a2a");
          for (let s = 0; s < 10; s++) cast.rod(plain, V(bot.x - 0.11 + s * 0.024, 0.32, bot.z), V(bot.x - 0.13 + s * 0.028, 0.14, bot.z + 0.01), 0.008, 4, "#e8c070");
        }
      });
      // the yellow bucket with a wringer
      cast.cyl(gloss, 0.17, 0.14, 0.32, 24, TRS(-0.78, 0.16, -2.0), "#ffd23a");
      fu.torus(gloss, 0.17, 0.012, TRS(-0.78, 0.32, -2.0, 0, Math.PI / 2), "#e8b820", 6, 32);
      fu.cyl(plain, 0.15, 0.15, 0.01, 24, TRS(-0.78, 0.28, -2.0), "#8ac0d0");
      cast.rbox(paint, 0.16, 0.12, 0.16, 0.02, TRS(-0.78, 0.38, -2.06), "#3a3a44");
      fu.add(new THREE.TorusGeometry(0.17, 0.008, 6, 24, Math.PI), metal, TRS(-0.78, 0.32, -2.0, Math.PI / 2, 0, 0.4), "#c8c8d0");
    }

    // ---- poster + coffee counter (coffee machine, mugs, donuts) ----
    {
      cast.rbox(paint, 0.74, 0.99, 0.02, 0.006, TRS(0.88, 1.95, BZ + 0.012), "#2a2a30");
      fu.plane(tex(posterTex(), [0.12, 0.12, 0.1]), 0.7, 0.957, TRS(0.88, 1.95, BZ + 0.024));
      cast.box(paint, 0.42, 0.08, BZ, 1.32, 0.88, -1.86, "#3f9a92");
      cast.box(paint, 0.44, 0, BZ, 1.3, 0.08, -1.88, "#2a6a64");
      fu.box(gloss, 0.39, 0.88, BZ, 1.35, 0.93, -1.82, CREAM);
      for (const x of [0.645, 1.095]) { fu.box(paint, x - 0.2, 0.14, -1.86, x + 0.2, 0.82, -1.845, "#4ab0a6"); fu.sph(metal, TRS(x + (x < 1 ? 0.15 : -0.15), 0.62, -1.835, 0, 0, 0, 0.018), 8, BRASS); }
      // coffee machine
      cast.rbox(gloss, 0.32, 0.46, 0.3, 0.03, TRS(0.72, 1.16, -2.22), "#2a2a30");
      fu.rbox(gloss, 0.34, 0.05, 0.32, 0.015, TRS(0.72, 1.41, -2.22), "#c8c0b8");
      fu.box(plain, 0.6, 0.95, -2.16, 0.84, 0.97, -2.06, "#1a1a1a");
      fu.plane(tex(coffeeTex(), [0.25, 0.22, 0.2]), 0.26, 0.13, TRS(0.72, 1.3, -2.068));
      cast.cyl(gloss, 0.07, 0.065, 0.16, 18, TRS(0.72, 1.06, -2.12), "#5a2a14");
      fu.cyl(metal, 0.075, 0.075, 0.03, 18, TRS(0.72, 1.15, -2.12), "#3a3a3a");
      fu.sph(smat(S, { col: "#000000", em: [2.2, 0.2, 0.1] }), TRS(0.84, 1.2, -2.068, 0, 0, 0, 0.012), 8);
      // mugs (fun colours) + a box of donuts
      ([[1.0, -2.0, "#ffffff"], [1.12, -2.12, "#ff8ab0"], [1.24, -1.98, "#ffd23a"]] as [number, number, string][]).forEach(([x, z, c], k) => {
        cast.cyl(gloss, 0.045, 0.04, 0.1, 16, TRS(x, 0.98, z), c);
        fu.torus(gloss, 0.03, 0.009, TRS(x + 0.05, 0.98, z, k * 0.7), c, 8, 16);
        fu.cyl(plain, 0.04, 0.04, 0.004, 16, TRS(x, 1.025, z), "#4a2410");
      });
      cast.box(paint, 0.95, 0.93, -2.36, 1.3, 0.97, -2.18, "#ffd0e0");
      for (let k = 0; k < 3; k++) { fu.torus(gloss, 0.04, 0.022, TRS(1.01 + k * 0.11, 0.985, -2.27, 0, -Math.PI / 2), "#e8a050", 8, 16); fu.torus(gloss, 0.04, 0.012, TRS(1.01 + k * 0.11, 1.0, -2.27, 0, -Math.PI / 2), ["#ff6aa0", "#6a3a20", "#ffffff"][k], 8, 16); }
    }

    // ---- the VENDING machine "SNACKS (for humans)" ----
    {
      const vx = 1.85, vz0 = BZ, vz1 = -1.65;
      cast.rbox(gloss, 0.9, 1.95, vz1 - vz0, 0.05, TRS(vx, 0.975, (vz0 + vz1) / 2), RED);
      for (const x of [vx - 0.38, vx + 0.38]) fu.box(paint, x - 0.035, 0, vz1 - 0.1, x + 0.035, 0.05, vz1 - 0.02, "#2a2a2a");
      const win = smat(S, { map: vendWinTex(), emap: true, em: [1.05, 1.15, 1.25] }); this.vendM.push(win);
      fu.plane(win, 0.56, 1.0, TRS(vx - 0.1, 1.0, vz1 + 0.006));
      fu.box(metal, vx - 0.41, 0.47, vz1, vx + 0.21, 0.5, vz1 + 0.03, "#c8c8d0"); fu.box(metal, vx - 0.41, 1.5, vz1, vx + 0.21, 1.53, vz1 + 0.03, "#c8c8d0");
      fu.box(metal, vx - 0.41, 0.47, vz1, vx - 0.38, 1.53, vz1 + 0.03, "#c8c8d0"); fu.box(metal, vx + 0.18, 0.47, vz1, vx + 0.21, 1.53, vz1 + 0.03, "#c8c8d0");
      const sign = smat(S, { map: vendSignTex(), emap: true, em: [1.2, 1.15, 1.1] }); this.vendM.push(sign);
      fu.rbox(paint, 0.82, 0.3, 0.04, 0.02, TRS(vx, 1.74, vz1 + 0.01), "#c8242c");
      fu.plane(sign, 0.76, 0.27, TRS(vx, 1.74, vz1 + 0.032));
      fu.plane(tex(vendPanelTex(), [0.14, 0.14, 0.16]), 0.16, 0.64, TRS(vx + 0.31, 1.06, vz1 + 0.006));
      fu.box(plain, vx - 0.36, 0.14, vz1, vx + 0.2, 0.34, vz1 + 0.02, "#1a1a20");
      fu.box(metal, vx - 0.34, 0.3, vz1 + 0.02, vx + 0.18, 0.33, vz1 + 0.04, "#8a8a92");
    }

    // ---- the PORTHOLE (brass frame, rivets, the juice view behind) ----
    {
      fu.torus(metal, PR + 0.025, 0.055, TRS(PX, PY, BZ + 0.02), BRASS, 12, 64);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.15; fu.sph(metal, TRS(PX + Math.cos(a) * (PR + 0.03), PY + Math.sin(a) * (PR + 0.03), BZ + 0.07, 0, 0, 0, 0.016), 8, "#f0c870"); }
      fu.cyl(plain, PR + 0.02, PR + 0.02, 0.12, 48, TRS(PX, PY, BZ - 0.06, 0, Math.PI / 2), "#7a3048", true);
      this.portM = smat(S, { port: true, em: [1.0, 1.0, 1.0] });
      const pd = new THREE.Mesh(clean(new THREE.CircleGeometry(PR + 0.03, 48)), this.portM); pd.position.set(PX, PY, BZ - 0.11); pd.frustumCulled = false; R.add(pd);
    }

    // ---- LOCKERS (left wall), EMPLOYEE OF THE MONTH + water cooler (right), a plant ----
    {
      cast.box(paint, -2.7, 0.02, -1.7, -2.31, 1.9, -0.2, "#6a7a8a");
      fu.plane(tex(lockerTex(), [0.1, 0.1, 0.1], 50, 0.3), 1.48, 1.86, TRS(-2.305, 0.96, -0.95, Math.PI / 2));
      fu.box(paint, -2.72, 1.9, -1.72, -2.29, 1.95, -0.18, "#4a5a6a");
      fu.box(paint, -2.7, 0, -1.7, -2.31, 0.02, -0.2, "#2a2a30");
      // a little stack of folded towels + a hard hat on top
      fu.rbox(plain, 0.3, 0.06, 0.26, 0.02, TRS(-2.5, 1.98, -1.3), "#7ac8f0"); fu.rbox(plain, 0.28, 0.06, 0.24, 0.02, TRS(-2.5, 2.04, -1.3), "#ff8ab0");
      fu.add(new THREE.SphereGeometry(0.13, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2), gloss, TRS(-2.5, 1.95, -0.6), "#ffd23a");
      fu.cyl(gloss, 0.17, 0.17, 0.015, 20, TRS(-2.5, 1.955, -0.6), "#ffd23a");
      // employee of the month (right wall)
      cast.rbox(paint, 0.04, 0.6, 0.48, 0.008, TRS(2.735, 1.65, -0.9), "#c89038");
      fu.plane(tex(employeeTex(), [0.12, 0.12, 0.1]), 0.46, 0.576, TRS(2.712, 1.65, -0.9, -Math.PI / 2));
      // water cooler
      cast.rbox(gloss, 0.34, 0.95, 0.34, 0.03, TRS(2.4, 0.475, 0.3), "#e8e8e0");
      fu.box(plain, 2.3, 0.62, 0.47, 2.34, 0.66, 0.5, "#3a7fd0"); fu.box(plain, 2.46, 0.62, 0.47, 2.5, 0.66, 0.5, RED);
      cast.cyl(smat(S, { col: "#7ac0f0", spec: 80, specK: 0.9, self: [0.2, 0.3, 0.4] }), 0.15, 0.15, 0.4, 24, TRS(2.4, 1.18, 0.3), "#ffffff");
      fu.add(new THREE.SphereGeometry(0.15, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), smat(S, { col: "#7ac0f0", spec: 80, specK: 0.9, self: [0.2, 0.3, 0.4] }), TRS(2.4, 1.38, 0.3, 0, 0, 0, [1, 0.5, 1]));
      // plant (left front)
      cast.cyl(gloss, 0.16, 0.12, 0.3, 18, TRS(-2.3, 0.15, 0.6), "#e86a3a");
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; cast.add(new THREE.SphereGeometry(0.12, 10, 8), gloss, TRS(-2.3 + Math.cos(a) * 0.1, 0.42 + (k % 3) * 0.1, 0.6 + Math.sin(a) * 0.1, 0, 0, 0, [0.7, 1.4, 0.7]), k % 2 ? "#4aa04a" : "#6ac05a"); }
    }

    // ---- the STAFF ONLY doorway (front wall): frame, sign on the outer face, the leaf swung open inward ----
    {
      const fc = "#f2e6d0";
      fu.box(paint, -EW - 0.08, 0, FZ - 0.06, -EW, EH + 0.08, FZ + 0.06, fc); fu.box(paint, EW, 0, FZ - 0.06, EW + 0.08, EH + 0.08, FZ + 0.06, fc);
      fu.box(paint, -EW - 0.08, EH, FZ - 0.06, EW + 0.08, EH + 0.09, FZ + 0.06, fc);
      fu.rbox(paint, 1.1, 0.34, 0.04, 0.03, TRS(0, EH + 0.36, FZ + 0.03), "#fff6e2");
      const sm = smat(S, { map: doorTex("STAFF ONLY"), self: [0.15, 0.15, 0.15] });
      const sg = new THREE.PlaneGeometry(1.0, 0.28); const U = sg.getAttribute("uv") as THREE.BufferAttribute;
      for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i), 0.54 + U.getY(i) * 0.24); // the STAFF/ONLY panel of the door art
      fu.add(sg, sm, TRS(0, EH + 0.36, FZ + 0.052));
      const leaf = new Bat(), w = 2 * EW;
      leaf.box(paint, 0.01, 0.01, -0.025, w - 0.01, EH - 0.01, 0.025, "#f0a43a");
      leaf.plane(sm, w - 0.04, EH - 0.04, TRS(w / 2, EH / 2, 0.027));
      leaf.sph(metal, TRS(w - 0.1, 1.0, 0.06, 0, 0, 0, 0.04), 12, BRASS);
      const lg = new THREE.Group(); lg.position.set(-EW, 0, FZ); lg.rotation.y = 1.9; R.add(lg);
      leaf.build(lg, false); // no shadow: the open leaf sits behind the lens and would throw a big wedge across the floor
    }

    // ---- practicals: two tungsten pendant lamps ----
    for (const sx of [-1, 1]) {
      const x = sx * 0.9;
      fu.rod(plain, V(x, 3.36, -0.9), V(x, 2.95, -0.9), 0.008, 6, "#2a2020");
      fu.add(new THREE.SphereGeometry(0.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), gloss, TRS(x, 2.8, -0.9), "#2f7f78");
      fu.cyl(metal, 0.035, 0.035, 0.07, 12, TRS(x, 2.98, -0.9), BRASS);
      fu.sph(smat(S, { col: "#000000", em: [3.2, 2.2, 1.1] }), TRS(x, 2.76, -0.9, 0, 0, 0, 0.06), 12);
    }

    b.build(R); fu.build(R); cast.build(R, true);
    // ---- glows (group 0 practicals, 1 + 2 the marquee bulbs, 3 the beacon) ----
    this.glows = new Glows(R, [
      ...[-1, 1].map((sx) => ({ p: V(sx * 0.9, 2.72, -0.9), c: [0.55, 0.36, 0.16] as C3, s: 0.9, g: 0 })),
      { p: V(0.84, 1.2, -2.05), c: [0.35, 0.03, 0.02], s: 0.09, g: 0 },
      { p: V(1.75, 1.0, -1.55), c: [0.08, 0.13, 0.18], s: 1.5, g: 0 },
      { p: V(1.85, 1.74, -1.55), c: [0.22, 0.05, 0.04], s: 0.9, g: 0 },
      { p: V(PX, PY, BZ + 0.1), c: [0.16, 0.22, 0.04], s: 1.0, g: 0 },
      { p: V((DX0 + DX1) / 2, DH + 0.27, BZ + 0.12), c: [0.05, 0.22, 0.08], s: 0.55, g: 0 },
      { p: V(0, 2.74, -2.12), c: [0.3, 0.015, 0.01], s: 0.7, g: 3 }, { p: V(0, 2.74, -2.12), c: [0.14, 0.01, 0.008], s: 2.0, g: 3 },
      { p: V((DX0 + DX1) / 2, 1.0, BZ - 0.3), c: [0.3, 0.16, 0.08], s: 1.6, g: 2 },
    ]);
    this.bulbs = new Glows(R, bulbPts.map((p, i) => ({ p: p.clone().setZ(p.z + 0.03), c: [0.3, 0.22, 0.08] as C3, s: 0.13, g: i % 2 })));
    this.cones = [new Shaft(R, 0.17, 0.95, 0.04), new Shaft(R, 0.17, 0.95, 0.04)];
    this.beam = new Shaft(R, 0.05, 0.85, 0.1);
    R.traverse((o) => { o.frustumCulled = false; });
  }

  /** the world's camera-relative sun for shot 4 (same formula as world.shotSun) */
  private sun() {
    if (this.sunV) return this.sunV;
    const id = SUN_FROM[4] ?? 4, s = SHOTS[id - 1], L = LOOKS.staff;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return (this.sunV = V(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize());
  }

  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const on = SHOTS[id - 1].place === "staff";
    this.root.visible = on;
    if (!on) return;
    if (DEBUG_CAM) {
      const d = DEBUG_VIEW;
      cam.position.set(STAFF[0] + d[0], STAFF[1] + d[1], STAFF[2] + d[2]); cam.lookAt(STAFF[0] + d[3], STAFF[1] + d[4], STAFF[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    const S = this.S, O = this.root.position, Wp = (x: number, y: number, z: number) => V(x + O.x, y + O.y, z + O.z);
    const st = staffAt(id, t), sd = this.sun();
    // ---- state ----
    const alarm = st.whistle, spin = t * Math.PI * 2 * 1.25;
    const t0 = W.before - 0.1;
    const mJump = st.tick > 0 ? springy((t - t0) / 0.55) : 0;
    // board: a neon flicker-on (deterministic per frame) while it ramps, then steady
    const fl = st.board > 0 && st.board < 1 ? 0.55 + 0.45 * (hash(Math.floor(t * 30)) > 0.4 ? 1 : 0.2) : 1;
    const board = st.board * fl;
    const doorU = (t - (W.usually + 0.05)) / 0.5, door = doorU <= 0 ? 0 : 1 - Math.exp(-5 * doorU) * Math.cos(7 * doorU);
    // ---- rig ----
    (S.u.uSD.value as THREE.Vector3).copy(sd);
    const keyK = 1 - 0.3 * alarm;
    (S.u.uSC.value as THREE.Vector3).set(1.55 * keyK, 1.0 * keyK, 0.5 * keyK);
    (S.u.uO.value as THREE.Vector3).copy(O); S.u.uFogCap.value = 0.5; S.u.uTime.value = t;
    const redA = alarm * 0.08 * (0.6 + 0.4 * Math.cos(spin * 2));
    (S.u.uAU.value as THREE.Vector3).set(0.26 + redA, 0.27 * (1 - 0.3 * alarm), 0.5 * (1 - 0.3 * alarm));
    (S.u.uAD.value as THREE.Vector3).set(0.34 + redA * 0.6, 0.2 * (1 - 0.3 * alarm), 0.13 * (1 - 0.3 * alarm));
    const pend: C3 = [1.0 * keyK, 0.66 * keyK, 0.28 * keyK];
    const L: [THREE.Vector3, C3, number][] = [
      [Wp(-0.9, 2.66, -0.9), pend, 1.5],                                             // pendant left (tungsten)
      [Wp(0.9, 2.66, -0.9), pend, 1.5],                                              // pendant right
      [Wp(1.75, 1.05, -1.2), [0.2, 0.4, 0.62], 1.5],                                 // vending glow (cool)
      [Wp(PX, PY - 0.1, BZ + 0.45), [0.32, 0.42, 0.08], 0.9],                        // porthole juice (green-yellow)
      [Wp(BX, BY, BZ + 0.5), [0.55 * board, 0.4 * board, 0.12 * board], 1.0],       // schedule board glow
      [Wp((DX0 + DX1) / 2, 1.0, BZ + 0.2), [1.0 * door, 0.5 * door, 0.28 * door], 1.0], // tunnel spill through the open door
      [Wp((DX0 + DX1) / 2, DH + 0.27, BZ + 0.25), [0.04, 0.2, 0.07], 0.55],           // exit sign
      [Wp(0.4, 2.1, 4.0), [0.16, 0.24, 0.52], 3.6],                                  // cool front fill (blue shade)
    ];
    L.forEach(([p, c, r], i) => { S.lp[i].copy(p); S.lc[i].set(...c); S.lr[i] = r; });
    (S.u.uBP.value as THREE.Vector3).copy(Wp(0, 2.74, -2.2));
    (S.u.uBD.value as THREE.Vector2).set(Math.sin(spin), Math.cos(spin));
    (S.u.uBC.value as THREE.Vector3).set(2.4 * alarm, 0.07 * alarm, 0.05 * alarm);
    // ---- materials ----
    (this.boardM.uniforms.uGlowK.value as THREE.Vector3).set(1.7 * board, 1.5 * board, 1.25 * board);
    (this.bulbM.uniforms.uEm.value as THREE.Vector3).set(0.2 + 2.2 * board, 0.18 + 1.7 * board, 0.12 + 0.8 * board);
    (this.dome.uniforms.uEm.value as THREE.Vector3).set(0.22 + 2.4 * alarm, 0.02 + 0.06 * alarm, 0.02 + 0.05 * alarm);
    this.dome.uniforms.uAng.value = spin; (this.dome.uniforms.uDC.value as THREE.Vector3).copy(Wp(0, 2.72, -2.28));
    for (const m of this.vendM) { const k = 0.94 + 0.06 * Math.sin(t * 23.0) * Math.sin(t * 5.3); (m.uniforms.uEm.value as THREE.Vector3).set(1.05 * k, 1.15 * k, 1.25 * k); }
    (this.corrM.uniforms.uEm.value as THREE.Vector3).set(0.6 + 0.6 * door, 0.55 + 0.5 * door, 0.5 + 0.45 * door);
    (this.exitM.uniforms.uEm.value as THREE.Vector3).set(1.2, 1.2, 1.2);
    // ---- the clock hands: 11:58:5x -> the second hand ticks round to 12 and the minute hand JUMPS to 11:59 ----
    const sec = 60 - (t0 - t), si = Math.floor(sec), sa = si - 1 + Math.min(1, springy((sec - si) / 0.16));
    const mins = 58 + mJump;
    this.hSec.rotation.z = -(sa / 60) * Math.PI * 2;
    this.hMin.rotation.z = -(mins / 60) * Math.PI * 2;
    this.hHour.rotation.z = -((11 + mins / 60) / 12) * Math.PI * 2;
    // ---- the exit door swings open (into the tunnel) ----
    this.door.rotation.y = 1.75 * door;
    // ---- glows, cones, beacon beam ----
    const chase = (Math.floor(t * 4) % 2) === 0 ? 1 : 0;
    this.glows.gk.set(keyK, 1, door, alarm * (0.8 + 0.2 * Math.cos(spin * 2)));
    this.bulbs.gk.set(board * (0.35 + 0.65 * chase), board * (0.35 + 0.65 * (1 - chase)), 0, 0);
    for (const [i, sx] of [-1, 1].entries()) this.cones[i].set(V(sx * 0.9, 2.78, -0.9), V(0, -1, 0), 2.7, [1.0, 0.7, 0.36], 0.22 * keyK, O);
    const bd = V(Math.sin(spin), -0.1, Math.cos(spin)).normalize();
    this.beam.set(V(0, 2.74, -2.28), bd, 2.8, [1.0, 0.06, 0.04], 1.4 * alarm * smooth(Math.cos(spin) * 3 + 0.4) * (0.15 + 0.85 * Math.sin(spin) ** 2), O);
    // ---- the cards pick up the red alarm sweep (crew around (0, 1, -0.6)) ----
    if (alarm > 0) {
      const d = V(0, 1.0, -0.6).sub(V(0, 2.74, -2.2)), h = Math.hypot(d.x, d.z);
      const sw = Math.pow(Math.max(0, (d.x * Math.sin(spin) + d.z * Math.cos(spin)) / h), 6);
      const k = clamp01(alarm * (0.18 + 0.45 * sw));
      const ct = CHAR.uCharTint.value, si2 = CHAR.uSideTint.value;
      ct.set(ct.x + (1.25 - ct.x) * k, ct.y + (0.5 - ct.y) * k, ct.z + (0.45 - ct.z) * k);
      si2.set(si2.x + (1.1 - si2.x) * k, si2.y + (0.35 - si2.y) * k, si2.z + (0.35 - si2.z) * k);
    }
  }
}
