// OWNER: sets. "Bald Fur": the snowy BUS STOP (STREET, shots 1 + 3) and BEAN's sunset BEDROOM (ROOM, shots 5 + 6).
//
// Both sets light themselves with their OWN small shader rig (technique: wrinkle / jerk sets): ambient (sky from above,
// bounce from below), up to 12 soft point lights, scene fog (+ a warm sun-ward haze glow outdoors) and the LOW SUN:
//   STREET: open sky. The sun key = the world's camera-relative sun for the shot (same formula as world.shotSun, so the
//     cards' long shadows agree). The world shadow map gives the near long shadows (shelter, bench, lamp, sign, the
//     big bare tree); an ANALYTIC house-shadow test (ray vs 32 house boxes) lays the long blue shadows of the receding
//     houses across the snowy side street, with sun stripes through the gaps. Falling snow is instanced + deterministic
//     (NOINK). Warm windows, warm lit street lamps, a backlit "STAY WARM" ad box in the shelter.
//     street: cold blue; cat (shot 3): the same place in warmer, lower light.
//     The roof CLUMP: sits in a notch of the roof's snow overhang above the cat; it teeters and drops on catAt.plop
//     (ballistic, lands exactly when plop reaches 1), squashes into a little mound at PLOP_AT and bursts into a puff.
//   ROOM: the sun enters ONLY through the big left-wall window (x -2): per pixel a surface is lit only if its ray toward
//     the sun passes the window aperture minus its glazing bars, so the low sun lays a barred patch across the bed, BEAN
//     and the back wall. A ray-marched haze shaft and dust motes glow in the beam. Fairy lights over the bed.
//     room -> peak (LOOK_RAMPS, at "hits"): the rig ramps to concert MAGENTA / VIOLET with a hot GOLD sun, the fairy
//     lights and the speaker pulse on the beat. peak -> roomend (shot 6): dusk: a low rose sun, violet-blue shade, the
//     desk lamp + fairy lights carry the room.
//
// SUN (looks.ts): STREET wants the sun DOWN THE STREET, a little left: street az -14 / el 6, cat az -16 / el 5.
//   ROOM wants the sun from the LEFT, a touch behind the lens so it rakes through the window onto the bed and the back
//   wall: room / peak / roomend az -115 / el 12 (keep az/el equal in room, peak and roomend: shot 6 shares shot 5's sun).
//   The rigs read the world's sun, so any az works, but these put the window patch where the story is.
//
// CONTRACTS (world = place anchor + local, metres; STREET = (0,0,0), ROOM = (400,0,0)):
//   STREET: sidewalk / snow top y 0 (BEAN and the cards stand at y 0); road y -0.14 beyond the kerb (front face z 0.6).
//     SHELTER x -1.4..1.4: back glass z -1.0 (mullions at x +-0.5, hidden behind BEAN / the cat; the centre bay is
//       clear: the street recedes behind it), roof underside y 2.3, roof z -1.2..-0.42 (front fascia "BUS STOP 42" at
//       z -0.41), snow on top to ~2.5 with icicles. Backlit ad box ("STAY WARM!") in the left bay x -1.37..-0.53.
//     BENCH seat top y 0.46, z -0.81..-0.49 (centre -0.65), x -1.15..1.25. The cat sits on it at (0.55, 0.46, -0.65).
//     CLUMP_REST (0.95, 2.43, -0.47) on the roof's front edge; it falls from T_DROP (= W.cat - 0.5, catAt.plop start)
//       and lands at PLOP_AT (0.95, 0, -0.5) at T_LAND (= plop 1); a burst puff (NOINK) to T_LAND + 0.65 s and 7 snow
//       chunks; the squashed mound stays. clumpAt(id, t) -> { p, land (0/1), burst (0..1 age) } for the cast / fx.
//     Side street behind the shelter, receding along -z (road x -3..3), houses from z -14 to -130, lamps, bare trees,
//       a snowman (2.3, 0, -6.5), a distant hill (z ~-200). BUS-stop pole (1.75, 0, 0.3) sign at y 2.62, lamp
//       (-2.3, 0, 0.3), bin (-1.2, 0, -0.55), big bare tree (-2.7, 0, -3.6).
//   ROOM: floor y 0, back wall z -1.55, left wall x -2 (window z -1.15..0.55, y 0.8..2.2, deep sill top y 0.8),
//     right wall x 2, ceiling 2.6, open toward +z (floor to z 3.8).
//     BED along the back wall: x -1.05..0.95, z -1.5..-0.35, duvet top ~y 0.5 (cloud headboard at the left end,
//       PILLOW centre (-0.72, 0.58, -1.0)). BEAN sits at (0, 0.5, -0.75).
//     MIRROR_GLASS: a standing cheval mirror at (1.35, 0, -0.55) turned to face BEAN's outro spot (0.35, 0, -0.1); the
//       light glass plane (NOINK, transparent) is centre c, unit normal n (toward the room), w x h. A painted
//       silvery backing sits 0.07 m behind it: draw the reflection card in between (~0.03 behind the glass).
//     CAT_SILL: the cat's seat point on the window sill (outro).
//     Posters: "GRRR!" bear band poster (-0.72, 1.72), rocket poster (0.75, 1.75); speaker on the nightstand
//     (-1.48, 0.5, -1.3); plant (1.68, 0, -1.25); desk on the right wall x 1.5..2.0, z 0.35..1.45; rug (0.15, 0, 0.45).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { STREET, ROOM, SHOTS, LOOK_RAMPS, SUN_FROM, Look, W, V3 as SV3, smooth, clamp01, camAt, roomAt } from "./story";
import { LOOKS } from "./looks";

export const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export type C3 = [number, number, number];
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ exported contracts (world coordinates)
export const SHELTER = { x0: STREET[0] - 1.4, x1: STREET[0] + 1.4, back: STREET[2] - 1.0, roofY: STREET[1] + 2.3, roofZ0: STREET[2] - 1.2, roofZ1: STREET[2] - 0.42 };
export const BENCH = { y: STREET[1] + 0.46, z: STREET[2] - 0.65, z0: STREET[2] - 0.81, z1: STREET[2] - 0.49, x0: STREET[0] - 1.15, x1: STREET[0] + 1.25 };
export const CLUMP_REST = add(STREET, 0.95, 2.43, -0.47);
export const PLOP_AT = add(STREET, 0.95, 0, -0.5);
/** the clump drops at T_DROP (catAt.plop starts) and lands at T_LAND (plop = 1) (story time, s) */
export const T_DROP = W.cat - 0.5, T_LAND = W.cat - 0.05;
export const clumpAt = (id: number, t: number): { p: C3; land: number; burst: number; wob: number } => {
  if (id === 3 && t >= T_DROP) {
    if (t >= T_LAND) return { p: [PLOP_AT[0], PLOP_AT[1] + 0.07, PLOP_AT[2]], land: 1, burst: clamp01((t - T_LAND) / 0.65), wob: 0 };
    const u = (t - T_DROP) / (T_LAND - T_DROP), y = CLUMP_REST[1] - (CLUMP_REST[1] - PLOP_AT[1] - 0.07) * u * u;
    return { p: [CLUMP_REST[0], y, CLUMP_REST[2] + (PLOP_AT[2] - CLUMP_REST[2]) * u], land: 0, burst: 0, wob: 0 };
  }
  const wob = id === 3 ? smooth((t - (T_DROP - 0.35)) / 0.3) : 0;
  return { p: CLUMP_REST, land: 0, burst: 0, wob };
};
export const BED = { x0: ROOM[0] - 1.05, x1: ROOM[0] + 0.95, z0: ROOM[2] - 1.5, z1: ROOM[2] - 0.35, top: ROOM[1] + 0.5 };
export const PILLOW = add(ROOM, -0.72, 0.58, -1.0);
export const BEAN_SEAT = add(ROOM, 0, 0.5, -0.75);
export const BEAN_OUTRO = add(ROOM, 0.35, 0, -0.1);
const MIR_BASE = add(ROOM, 1.35, 0, -0.55);
const MIR_N: C3 = (() => { const x = BEAN_OUTRO[0] - MIR_BASE[0], z = BEAN_OUTRO[2] - MIR_BASE[2], n = Math.hypot(x, z); return [x / n, 0, z / n]; })();
/** the mirror's light glass plane: centre, unit normal (toward the room / BEAN), width, height */
export const MIRROR_GLASS = { c: [MIR_BASE[0], ROOM[1] + 1.0, MIR_BASE[2]] as C3, n: MIR_N, w: 0.52, h: 1.3 };
const RW = { x: -2.0, z0: -1.15, z1: 0.55, y0: 0.8, y1: 2.2, fr: 0.045 };
export const ROOM_WINDOW = { x: ROOM[0] + RW.x, z0: ROOM[2] + RW.z0, z1: ROOM[2] + RW.z1, y0: ROOM[1] + RW.y0, y1: ROOM[1] + RW.y1 };
/** the cat's seat on the window sill (sill top y 0.8, toward the room-front end of the sill, in the sun) */
export const CAT_SILL = add(ROOM, -1.8, 0.8, 0.3);

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
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string, r1?: number) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r1 ?? r, r, L, seg, 1, false), mat, m, col);
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
/** a horizontal plane x0..x1, z0..z1 at y (uv in metres; swap: uv along z) with optional height bumps */
const flat = (x0: number, z0: number, x1: number, z1: number, y: number, sx = 1, sz = 1, h?: (x: number, z: number) => number, swap = false) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, sx, sz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    if (h) p.setY(i, y + h(x, z));
    if (swap) uv.setXY(i, -z, x); else uv.setXY(i, x, -z);
  }
  if (h) g.computeVertexNormals();
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
/** a side wall at x = x0 running along z (z0..z1); uv (z, y) in metres; holes [za, zb, ya, yb] */
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
/** a lumpy snow mound: a squashed half sphere with seeded bumps (base at y 0) */
export const lump = (rx: number, ry: number, rz: number, seed: number, amp = 0.12, seg = 16) => {
  const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2), p = g.getAttribute("position") as THREE.BufferAttribute, r = rng(seed);
  const a = [r() * 6, r() * 6, r() * 6], f = [2 + r() * 2, 2 + r() * 2, 3 + r() * 2];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * (Math.sin(x * f[0] + a[0]) * Math.sin(z * f[1] + a[1]) + 0.5 * Math.sin((x + z) * f[2] + a[2])) * Math.min(1, y * 3 + 0.2);
    p.setXYZ(i, x * rx * k, y * ry * k, z * rz * k);
  }
  g.computeVertexNormals();
  return g;
};

// ============================================================ the light shader (own rig)
const NL = 12, NB = 32;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform float uOpen; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uO; uniform vec4 uBox; uniform float uAO; uniform vec4 uHB[${NB}]; uniform float uHH[${NB}]; uniform float uHS;
uniform vec3 uHazeC; uniform float uFogCap;
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
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float e = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float e = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, e); }
  if (leaf > 0.0 && uWM.w > 0.0) { // a snowy tree outside: a soft bare-branch dapple in the top of the window, swaying
    vec2 s = a * 3.1 + vec2(sin(uTT * 0.31), cos(uTT * 0.23)) * 0.05;
    float nz = tn2(s + 11.0) * 0.62 + tn2(s * 2.9 + 5.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.55, 0.72 + pen * 2.0, nz) * smoothstep(0.0, 0.9, a.y / uWH.y);
  }
  return k;
}
// outdoors: the long shadows of the receding houses (ray toward the sun vs house boxes), softer with distance
float houseK(vec3 p, vec3 d){
  if (uHS < 0.5 || d.y < 0.003) return 1.0;
  vec3 dd = d + vec3(1e-5); vec3 inv = 1.0 / dd; float s = 1.0;
  for (int i = 0; i < ${NB}; i++) {
    vec4 b = uHB[i]; if (uHH[i] <= 0.0) continue;
    vec3 t0 = (vec3(b.x, -1.0, b.y) - p) * inv, t1 = (vec3(b.z, uHH[i], b.w) - p) * inv;
    vec3 tn = min(t0, t1), tf = max(t0, t1);
    float a = max(max(tn.x, tn.y), tn.z), e = min(min(tf.x, tf.y), tf.z);
    if (e > 0.0 && e > a) { float a0 = max(a, 0.0); s = min(s, 1.0 - smoothstep(0.0, 0.06 + 0.025 * a0, e - a0)); }
  }
  return s;
}
float sunK(vec3 p, float leaf){ return uOpen > 0.5 ? houseK(p, uSD) : apK(p, uSD, leaf); }
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
  if (ndl > 0.0) { float k = sunK(p, 1.0); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * (0.1 + 0.9 * sh); }
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
  vec3 lit = lightAt(vW, n, sh);
  vec3 c = uCol * vC * tx.rgb * (lit + uSelf) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm * vC;
#endif
  vec3 v = normalize(cameraPosition - vW);
  if (uRim > 0.0) c += uRim * pow(1.0 - max(dot(n, v), 0.0), 3.0) * (uAU * 0.8 + uSC * 0.08 * sunK(vW, 0.0));
#ifdef SPEC
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW, 0.0) * uSpecK * 1.4 * sh;
#endif
  gl_FragColor = vec4(c, 1.0);
#ifdef USE_FOG
  // scene fog (looks.ts), capped so the far hill still reads; outdoors the haze glows warm toward the low sun
  float fogFactor = smoothstep(fogNear, fogFar, vFogDepth) * uFogCap;
  vec3 fc = fogColor;
  if (uOpen > 0.5) fc = mix(fc, uHazeC, pow(max(dot(-v, uSD), 0.0), 6.0) * 0.75);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fc, fogFactor);
#endif
}`;
export type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uOpen: { value: 0 }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(1, 0, 0) },
      uWU: { value: V3(0, 0, 1) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(2, 2, 0.02, 0) },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 1 },
      uHB: { value: Array.from({ length: NB }, () => new THREE.Vector4(0, 0, 0, 0)) }, uHH: { value: new Array(NB).fill(0) }, uHS: { value: 0 },
      uHazeC: { value: new THREE.Color(1, 0.8, 0.6) }, uFogCap: { value: 1 },
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
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSelf: { value: V3(...(o.self ?? [0, 0, 0])) },
      uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
      uRim: { value: o.rim ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true, fog: true,
  });
};
/** the two rigs (props.ts builds its props on them) */
let streetS: LSet | null = null, roomS: LSet | null = null;
export const streetRig = () => streetS ?? (streetS = lset());
export const roomRig = () => roomS ?? (roomS = lset());

// ============================================================ volumetrics, glows, snow (NOINK)
const keepU = () => ({ uKB0: { value: V3(BEAN_SEAT[0], BEAN_SEAT[1] + 0.15, BEAN_SEAT[2]) }, uKB1: { value: V3(BEAN_OUTRO[0], BEAN_OUTRO[1] + 0.1, BEAN_OUTRO[2]) } });
/** ray-marched haze inside the window prism: the bars show in the beam */
class Haze {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uInv: { value: new THREE.Matrix3() }, uCen: { value: V3(0, 0, 0) }, uHC: { value: V3(1, 1, 1) }, uK: { value: 0 }, uFloor: { value: 0 }, ...keepU() },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uHC; uniform float uK; uniform float uFloor; varying vec3 vW;
        ${CORE}
        // keep-out around BEAN's cards (bed seat + outro spot): beam haze / motes must not bleach the character
        uniform vec3 uKB0; uniform vec3 uKB1;
        float rayAxisD(vec3 ro, vec3 rd, vec3 a, float h){
          vec3 w = ro - a; float b = rd.y, d = dot(rd, w), e = w.y, den = max(1.0 - b * b, 1e-4);
          float t = clamp((e - b * d) / den, 0.0, h); vec3 q = a + vec3(0.0, t, 0.0);
          float s = max(dot(q - ro, rd), 0.0); return length(ro + rd * s - q);
        }
        float keepOut(vec3 ro, vec3 rd){
          float m0 = smoothstep(0.5, 1.25, rayAxisD(ro, rd, uKB0, 1.35));
          float m1 = smoothstep(0.32, 0.85, rayAxisD(ro, rd, uKB1, 1.75));
          return min(m0, m1);
        }
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
          acc *= dt * uK * mix(0.1, 1.0, keepOut(cameraPosition, rd));
          vec3 hc = uHC * acc; hc = 0.32 * (vec3(1.0) - exp(-hc / 0.32)); // soft cap: the beam glows, never clips
          gl_FragColor = vec4(hc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
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
/** dust motes: glow only inside the sunbeam */
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
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 }, ...keepU() },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        // keep-out around BEAN's cards (bed seat + outro spot): beam haze / motes must not bleach the character
        uniform vec3 uKB0; uniform vec3 uKB1;
        float rayAxisD(vec3 ro, vec3 rd, vec3 a, float h){
          vec3 w = ro - a; float b = rd.y, d = dot(rd, w), e = w.y, den = max(1.0 - b * b, 1e-4);
          float t = clamp((e - b * d) / den, 0.0, h); vec3 q = a + vec3(0.0, t, 0.0);
          float s = max(dot(q - ro, rd), 0.0); return length(ro + rd * s - q);
        }
        float keepOut(vec3 ro, vec3 rd){
          float m0 = smoothstep(0.5, 1.25, rayAxisD(ro, rd, uKB0, 1.35));
          float m1 = smoothstep(0.32, 0.85, rayAxisD(ro, rd, uKB1, 1.75));
          return min(m0, m1);
        }
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.12 + sin(uT * 0.09 + ph * 3.0) * 0.05,
            sin(uT * 0.15 * sp + ph * 2.0) * 0.1, cos(uT * 0.19 * sp + ph * 1.3) * 0.12);
          vec3 L = uSC * apK(p, uSD, 0.0) * 0.7 + (uAU + uAD) * 0.02;
          float tw = 0.6 + 0.4 * sin(uT * (1.3 + 2.2 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.7, 1.5, dist) / max(1.0, dist * 0.2) * mix(0.15, 1.0, keepOut(cameraPosition, normalize(p - cameraPosition)));
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
/** deterministic falling snow: instanced soft flakes wrapping inside a box (faded at the wrap), sway, none under the
 *  shelter roof, faded near the lens; colour per frame (lit by the rig, brighter toward the sun) */
class Snowfall {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, n: number, seed: number, lo: C3, hi: C3, size: [number, number]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 4), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P.set([lo[0] + r() * (hi[0] - lo[0]), lo[1] + r() * (hi[1] - lo[1]), lo[2] + r() * (hi[2] - lo[2]), size[0] + (size[1] - size[0]) * r() * r()], i * 4);
      D.set([r() * 6.283, 0.45 + 0.5 * r(), 0.04 + 0.1 * r(), r()], i * 4);
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uK: { value: 1 }, uLo: { value: V3(...lo) }, uHi: { value: V3(...hi) }, uCol: { value: V3(1, 1, 1) }, uSunC: { value: V3(0, 0, 0) },
        uSD: { value: V3(0, 1, 0) }, uRoof: { value: new THREE.Vector4(-1.55, -1.25, 1.55, -0.4) }, uRoofY: { value: 2.3 } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iS; uniform float uT; uniform vec3 uLo; uniform vec3 uHi; uniform vec3 uCol; uniform vec3 uSunC;
        uniform vec3 uSD; uniform vec4 uRoof; uniform float uRoofY; varying vec3 vC; varying vec2 vQ; varying float vA;
        void main(){
          float H = uHi.y - uLo.y;
          float y = uLo.y + mod(iP.y - uLo.y - uT * iS.y, H);
          vec3 p = vec3(iP.x + iS.z * sin(uT * (0.7 + iS.w) + iS.x) + 0.12 * uT * (0.4 + iS.w) - 0.6, y, iP.z + iS.z * 0.7 * cos(uT * (0.6 + iS.w * 0.8) + iS.x * 1.7));
          float a = smoothstep(0.0, 0.5, y - uLo.y) * smoothstep(0.0, 0.8, uHi.y - y);
          if (p.x > uRoof.x && p.x < uRoof.z && p.z > uRoof.y && p.z < uRoof.w) a *= smoothstep(uRoofY - 0.3, uRoofY + 0.05, y);
          vec3 wp = (modelMatrix * vec4(p, 1.0)).xyz;
          float dist = length(cameraPosition - wp);
          a *= smoothstep(0.55, 1.3, dist);
          float s = iP.w * max(1.0, dist * 0.07);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = wp + (right * position.x + up * position.y) * s;
          vec3 vd = normalize(wp - cameraPosition);
          vC = uCol + uSunC * (0.35 + 0.65 * pow(max(dot(vd, uSD), 0.0), 4.0));
          vQ = position.xy * 2.0; vA = a;
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uK; varying vec3 vC; varying vec2 vQ; varying float vA;
        void main(){ float r2 = dot(vQ, vQ); float a = (smoothstep(1.0, 0.25, r2) * 0.75 + 0.25 * exp(-r2 * 6.0)) * vA * uK; if (a < 0.004) discard; gl_FragColor = vec4(vC, a); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; parent.add(this.mesh);
  }
}
/** the clump's burst: soft snow puffs (NOINK) radiating from the landing point; uAge 0..1 */
class Puff {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, n: number, seed: number) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + r() * 0.4; D.set([Math.cos(a), 0.25 + r() * 0.9, Math.sin(a) * 0.6, 0.7 + r() * 0.6], i * 4); }
    g.setAttribute("iD", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uAge: { value: 0 }, uP: { value: V3(0, 0, 0) }, uCol: { value: V3(1, 1, 1) } },
      vertexShader: /* glsl */ `attribute vec4 iD; uniform float uAge; uniform vec3 uP; varying vec2 vQ; varying float vA;
        void main(){
          float e = 1.0 - pow(1.0 - uAge, 3.0);
          vec3 p = uP + vec3(iD.x * 0.42, iD.y * 0.4, iD.z * 0.42) * e * iD.w + vec3(0.0, 0.05, 0.0);
          float s = (0.12 + 0.3 * e) * iD.w;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vQ = position.xy * 2.0; vA = smoothstep(0.0, 0.06, uAge) * pow(1.0 - uAge, 1.6);
          gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
      fragmentShader: /* glsl */ `uniform vec3 uCol; varying vec2 vQ; varying float vA;
        void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 3.2) * (1.0 - smoothstep(0.7, 1.0, r2)) * vA * 0.85; if (a < 0.004) discard; gl_FragColor = vec4(uCol, a); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 9; parent.add(this.mesh);
  }
}

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
export const otxt = (g: G, s: string, x: number, y: number, px: number, col: string, ink: string, lw: number) => {
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
export const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

// ---------------- STREET textures
/** soft snow: white with lavender-blue drifts, wind ripples, a trail of boot prints + grain; 2 m tile */
const snowTex = () => ctex("goSnow", 1024, 1024, (g, r) => {
  g.fillStyle = "#f6f8fc"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) blot(g, r() * 1024, r() * 1024, 80 + r() * 200, r() < 0.55 ? "196,206,236" : "255,255,255", 0.22, 1024, 1024);
  for (let i = 0; i < 120; i++) { const x = r() * 1024, y = r() * 1024, L = 30 + r() * 60; g.strokeStyle = "rgba(170,182,220,0.12)"; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x - L, y); g.quadraticCurveTo(x, y - 6, x + L, y + 2); g.stroke(); }
  for (let k = 0; k < 2; k++) {
    let x = 200 + k * 520, y = 40;
    for (let s = 0; s < 9; s++) { const ox = (s % 2 ? 26 : -26); g.fillStyle = "rgba(150,165,215,0.32)"; g.beginPath(); g.ellipse(x + ox, y, 17, 30, 0.1 * (k ? 1 : -1), 0, 7); g.fill(); y += 112; x += (k ? 14 : -10); }
  }
  for (let i = 0; i < 9000; i++) { g.fillStyle = r() < 0.6 ? "rgba(255,255,255,0.5)" : "rgba(150,160,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 1.5, 1.5); }
});
/** packed-snow road with two slushy tyre ruts along v; 6 m tile */
const roadTex = () => ctex("goRoadSnow", 1024, 1024, (g, r) => {
  g.fillStyle = "#e6eaf4"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) blot(g, r() * 1024, r() * 1024, 80 + r() * 160, r() < 0.5 ? "200,208,232" : "255,255,255", 0.25, 1024, 1024);
  for (const cx of [270, 754]) for (const dx of [-60, 60]) {
    const x = cx + dx;
    const gr = g.createLinearGradient(x - 46, 0, x + 46, 0); gr.addColorStop(0, "rgba(120,130,170,0)"); gr.addColorStop(0.3, "rgba(120,128,168,0.55)"); gr.addColorStop(0.5, "rgba(96,104,146,0.7)"); gr.addColorStop(0.7, "rgba(120,128,168,0.55)"); gr.addColorStop(1, "rgba(120,130,170,0)");
    g.fillStyle = gr; g.fillRect(x - 46, 0, 92, 1024);
    g.strokeStyle = "rgba(255,255,255,0.35)"; g.lineWidth = 3; for (let y = 0; y < 1024; y += 18) { g.beginPath(); g.moveTo(x - 28, y); g.lineTo(x + 28, y + 6); g.stroke(); }
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.04);
});
/** house plaster (tinted per house by vertex colour): mottle; 2 m tile */
const plasterTex = () => ctex("goPlaster", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 80; i++) blot(g, r() * 512, r() * 512, 40 + r() * 100, r() < 0.5 ? "225,215,205" : "255,255,255", 0.25, 512, 512);
  noise(g, 0, 0, 512, 512, r, 9000, 0.05);
});
/** a warm lit window: curtains, a lamp glow, a cross mullion painted in */
const winTex = () => ctex("goWinWarm", 256, 320, (g) => {
  const gr = g.createRadialGradient(128, 190, 10, 128, 170, 200); gr.addColorStop(0, "#fff2b0"); gr.addColorStop(0.5, "#ffc060"); gr.addColorStop(1, "#e07a3a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#d0503a"; g.beginPath(); g.moveTo(0, 0); g.lineTo(70, 0); g.quadraticCurveTo(40, 160, 70, 320); g.lineTo(0, 320); g.fill();
  g.beginPath(); g.moveTo(256, 0); g.lineTo(186, 0); g.quadraticCurveTo(216, 160, 186, 320); g.lineTo(256, 320); g.fill();
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, 0, 256, 10);
  g.fillStyle = "#3a2430"; g.fillRect(120, 0, 16, 320); g.fillRect(0, 150, 256, 14);
});
/** the backlit ad: "STAY WARM!" puffy jacket (a joke on BEAN in shorts) */
const adTex = () => ctex("goAdWarm", 512, 896, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 896); gr.addColorStop(0, "#ffe9a8"); gr.addColorStop(1, "#ffb37a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 896);
  g.fillStyle = "rgba(255,255,255,0.55)"; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(r() * 512, 150 + r() * 700, 4 + r() * 8, 0, 7); g.fill(); }
  otxt(g, "STAY", 256, 92, 108, "#ff5a3a", "#5a1a10", 14); otxt(g, "WARM!", 256, 196, 108, "#ff5a3a", "#5a1a10", 14);
  g.save(); g.translate(256, 540); g.lineWidth = 10; g.strokeStyle = "#1e2a5a"; g.lineJoin = "round";
  const puffs = (x: number, y: number, w: number, h: number, n: number) => { for (let k = 0; k < n; k++) { rrect(g, x, y + (k * h) / n, w, h / n + 6, 30); g.fillStyle = k % 2 ? "#4a9ae8" : "#5ab0ff"; g.fill(); g.stroke(); } };
  puffs(-210, -160, 90, 330, 5); puffs(120, -160, 90, 330, 5); puffs(-125, -200, 250, 400, 6);
  g.fillStyle = "#ffd23a"; g.fillRect(-6, -196, 12, 392);
  g.beginPath(); g.ellipse(0, -215, 100, 42, 0, 0, 7); g.fillStyle = "#f4f0e8"; g.fill(); g.stroke();
  g.restore();
  otxt(g, "-50%", 400, 820, 64, "#ffffff", "#c02a20", 12);
  otxt(g, "PUFF CO.", 140, 830, 40, "#1e2a5a", "#fff4d0", 6);
});
/** the roof fascia: "BUS STOP" + route badges "42" */
const fasciaTex = () => ctex("goFascia", 2048, 160, (g) => {
  g.fillStyle = "#1e4a5a"; g.fillRect(0, 0, 2048, 160);
  g.fillStyle = "#2a6a7a"; g.fillRect(0, 0, 2048, 14);
  otxt(g, "BUS STOP", 1024, 84, 96, "#fff4e0", "#0c2228", 10);
  for (const x of [330, 1718]) { g.fillStyle = "#ffd23a"; rrect(g, x - 80, 22, 160, 116, 26); g.fill(); g.lineWidth = 8; g.strokeStyle = "#0c2228"; g.stroke(); otxt(g, "42", x, 84, 82, "#e8343c", "#5a1010", 6); }
});
/** the round bus-stop sign */
const signTex = () => ctex("goBusSign", 512, 512, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#e8343c"; g.beginPath(); g.arc(256, 256, 238, 0, 7); g.fill();
  g.fillStyle = "#fff8ec"; g.beginPath(); g.arc(256, 256, 170, 0, 7); g.fill();
  g.fillStyle = "#1e4a9a"; g.fillRect(20, 196, 472, 120);
  otxt(g, "BUS", 256, 258, 104, "#ffffff", "#0c1a40", 8);
});
const plate42Tex = () => ctex("goPlate42", 256, 192, (g) => {
  g.fillStyle = "#ffd23a"; rrect(g, 6, 6, 244, 180, 24); g.fill(); g.lineWidth = 10; g.strokeStyle = "#1c1c28"; g.stroke();
  otxt(g, "42", 128, 98, 118, "#1c1c28", "#ffd23a", 2);
});
/** the timetable panel inside the shelter */
const timetableTex = () => ctex("goTimetable", 256, 384, (g, r) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 256, 384); g.fillStyle = "#1e4a9a"; g.fillRect(0, 0, 256, 64);
  otxt(g, "42", 128, 34, 46, "#ffd23a", "#0c1a40", 4);
  for (let k = 0; k < 12; k++) { g.fillStyle = "#3a3a4a"; g.fillRect(24, 88 + k * 24, 50 + r() * 30, 9); g.fillRect(140, 88 + k * 24, 70 + r() * 30, 9); }
});
/** honey wood slats (bench) */
const woodTex = () => ctex("goWoodHoney", 512, 512, (g, r) => {
  g.fillStyle = "#e0a062"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 70; k++) { g.strokeStyle = `rgba(130,70,20,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const y0 = r() * 512; g.moveTo(0, y0); for (let s = 0; s <= 8; s++) g.lineTo((s * 512) / 8, y0 + Math.sin(s * 0.9 + r() * 3) * 5); g.stroke(); }
  noise(g, 0, 0, 512, 512, r, 6000, 0.04);
});

// ---------------- ROOM textures
/** warm peach wallpaper with little cream stars + dots; 1 m tile */
const wallpaperTex = () => ctex("goWallpaper", 1024, 1024, (g, r) => {
  g.fillStyle = "#f8c9a4"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 120; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 150, r() < 0.5 ? "255,226,196" : "226,160,130", 0.12, 1024, 1024);
  const star = (x: number, y: number, s: number) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const x = i * 128 + (j % 2 ? 64 : 0) + 20, y = j * 128 + 40;
    g.fillStyle = "rgba(255,244,222,0.9)"; star(x, y, 15);
    g.fillStyle = "rgba(224,128,110,0.6)"; g.beginPath(); g.arc(x + 62, y + 52, 6, 0, 7); g.fill();
  }
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** dusty-blue painted wainscot boards; 1 m tile */
const wainTex = () => ctex("goWainscot", 512, 512, (g, r) => {
  g.fillStyle = "#6f8fc0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(i * 85 + 4, 0, 6, 512); g.fillStyle = "rgba(20,30,70,0.25)"; g.fillRect(i * 85 + 80, 0, 5, 512); }
  for (let i = 0; i < 40; i++) blot(g, r() * 512, r() * 512, 40 + r() * 90, "40,60,110", 0.06, 512, 512);
  noise(g, 0, 0, 512, 512, r, 6000, 0.03);
});
/** warm oak floor boards; 2 m tile */
const floorTex = () => ctex("goFloorOak", 1024, 1024, (g, r) => {
  const n = 8, bw = 1024 / n;
  for (let i = 0; i < n; i++) {
    let y = -r() * 300;
    while (y < 1024) {
      const L = 260 + r() * 380;
      g.fillStyle = `hsl(${26 + r() * 6},${48 + r() * 12}%,${48 + r() * 9}%)`; g.fillRect(i * bw, y, bw, L);
      for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(100,50,20,${0.07 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const x0 = i * bw + 8 + r() * (bw - 16); g.moveTo(x0, y); g.lineTo(x0 + (r() - 0.5) * 8, y + L); g.stroke(); }
      g.fillStyle = "rgba(60,30,10,0.55)"; g.fillRect(i * bw, y, bw, 3);
      y += L;
    }
    g.fillStyle = "rgba(60,30,10,0.6)"; g.fillRect(i * bw, 0, 3, 1024);
  }
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.03);
});
/** round rug: pastel concentric rings + a zigzag band */
const rugTex = () => ctex("goRug", 1024, 1024, (g, r) => {
  const cols = ["#ff8a7a", "#ffd36a", "#7ad0c0", "#c9a0e8", "#fff4e0", "#ff8a7a", "#5ab0e8", "#ffd36a"];
  for (let k = 0; k < cols.length; k++) { g.fillStyle = cols[k]; g.beginPath(); g.arc(512, 512, 510 - k * 62, 0, 7); g.fill(); }
  g.strokeStyle = "#fff4e0"; g.lineWidth = 14; g.beginPath();
  for (let a = 0; a <= 72; a++) { const t = (a / 72) * Math.PI * 2, rr = 300 + (a % 2 ? 22 : -22); g.lineTo(512 + Math.cos(t) * rr, 512 + Math.sin(t) * rr); } g.stroke();
  for (let i = 0; i < 30000; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,255,255,0.1)" : "rgba(60,30,40,0.1)"; g.fillRect(r() * 1024, r() * 1024, 2, 3); }
});
/** mustard duvet with white stars + teal stitching; 1 m tile */
const duvetTex = () => ctex("goDuvet", 512, 512, (g, r) => {
  g.fillStyle = "#f2b640"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(30,120,130,0.55)"; g.lineWidth = 4; g.setLineDash([12, 10]);
  for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 128); g.lineTo(512, k * 128); g.stroke(); g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, 512); g.stroke(); }
  g.setLineDash([]);
  g.fillStyle = "#fff6e0";
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const x = i * 128 + 64, y = j * 128 + 64; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 9 : 22; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  noise(g, 0, 0, 512, 512, r, 8000, 0.04);
});
/** "GRRR!" bear band poster (the bear the ghost fur becomes) */
const bearPosterTex = () => ctex("goPosterBear", 512, 704, (g, r) => {
  g.fillStyle = "#2a1e4a"; g.fillRect(0, 0, 512, 704);
  for (let k = 0; k < 14; k++) { g.fillStyle = k % 2 ? "rgba(255,90,160,0.35)" : "rgba(255,210,60,0.3)"; g.beginPath(); g.moveTo(256, 380); g.arc(256, 380, 600, (k / 14) * 6.28, ((k + 0.5) / 14) * 6.28); g.fill(); }
  g.save(); g.translate(256, 420); g.fillStyle = "#7a4a2a"; g.strokeStyle = "#140a0a"; g.lineWidth = 10;
  g.beginPath(); g.arc(-110, -130, 50, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(110, -130, 50, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(0, 0, 170, 160, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#c8946a"; g.beginPath(); g.ellipse(0, 50, 90, 72, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#140a0a"; g.beginPath(); g.ellipse(0, 70, 60, 42, 0, 0, Math.PI); g.fill();
  g.fillStyle = "#fff"; for (const x of [-38, -14, 14, 38]) { g.beginPath(); g.moveTo(x - 9, 70); g.lineTo(x, 92); g.lineTo(x + 9, 70); g.fill(); }
  g.fillStyle = "#140a0a"; g.beginPath(); g.ellipse(0, 20, 22, 14, 0, 0, 7); g.fill();
  for (const x of [-60, 60]) { g.fillStyle = "#fff"; g.beginPath(); g.arc(x, -40, 22, 0, 7); g.fill(); g.fillStyle = "#140a0a"; g.beginPath(); g.arc(x, -36, 10, 0, 7); g.fill(); }
  g.restore();
  otxt(g, "GRRR!", 256, 100, 120, "#ffd23a", "#140a0a", 16);
  otxt(g, "WORLD TOUR", 256, 640, 50, "#ff6ab0", "#140a0a", 8);
  noise(g, 0, 0, 512, 704, r, 5000, 0.05);
});
/** rocket + planets poster */
const rocketPosterTex = () => ctex("goPosterRocket", 512, 704, (g, r) => {
  g.fillStyle = "#1e5aa0"; g.fillRect(0, 0, 512, 704);
  for (let i = 0; i < 80; i++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(r() * 512, r() * 704, 3, 3); }
  g.fillStyle = "#ffb03a"; g.beginPath(); g.arc(120, 150, 70, 0, 7); g.fill();
  g.strokeStyle = "#ffe0a0"; g.lineWidth = 10; g.beginPath(); g.ellipse(120, 150, 120, 26, -0.3, 0, 7); g.stroke();
  g.save(); g.translate(330, 430); g.rotate(0.35); g.strokeStyle = "#140a1a"; g.lineWidth = 10;
  g.fillStyle = "#ff8a3a"; g.beginPath(); g.moveTo(-60, 150); g.lineTo(0, 240); g.lineTo(60, 150); g.fill();
  g.fillStyle = "#f4f0e8"; g.beginPath(); g.moveTo(0, -200); g.quadraticCurveTo(80, -80, 60, 150); g.lineTo(-60, 150); g.quadraticCurveTo(-80, -80, 0, -200); g.fill(); g.stroke();
  g.fillStyle = "#e8343c"; g.beginPath(); g.moveTo(-60, 60); g.lineTo(-120, 170); g.lineTo(-60, 150); g.fill(); g.stroke(); g.beginPath(); g.moveTo(60, 60); g.lineTo(120, 170); g.lineTo(60, 150); g.fill(); g.stroke();
  g.fillStyle = "#5ad0ff"; g.beginPath(); g.arc(0, -40, 34, 0, 7); g.fill(); g.stroke();
  g.restore();
  otxt(g, "TO THE MOON", 256, 650, 50, "#ffd23a", "#0a1a3a", 8);
});
/** the view out of the left window: a low sunset over snowy rooftops (self-lit) */
const outsideTex = () => ctex("goOutside", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffb08a"); gr.addColorStop(0.45, "#ffd49a"); gr.addColorStop(0.7, "#fff0c0"); gr.addColorStop(1, "#ffd8a8");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const sg = g.createRadialGradient(330, 330, 6, 330, 330, 240); sg.addColorStop(0, "rgba(255,255,236,1)"); sg.addColorStop(0.2, "rgba(255,240,200,0.8)"); sg.addColorStop(1, "rgba(255,220,170,0)");
  g.fillStyle = sg; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#c88aa0"; g.beginPath(); g.moveTo(0, 420);
  for (let x = 0; x <= 512; x += 64) { const h = 360 + (x % 128 ? 30 : -10) + r() * 20; g.lineTo(x, h + 30); g.lineTo(x + 32, h); } g.lineTo(512, 512); g.lineTo(0, 512); g.fill();
  g.fillStyle = "#fff4ec"; for (let x = 0; x <= 512; x += 64) { g.fillRect(x + 4, 380 + (x % 128 ? 30 : -10), 56, 10); }
  g.fillStyle = "#ffe6a0"; for (let i = 0; i < 9; i++) g.fillRect(20 + i * 56, 440 + (i % 2) * 20, 14, 18);
  g.strokeStyle = "rgba(110,70,90,0.6)"; g.lineWidth = 6; g.beginPath(); g.moveTo(60, 512); g.lineTo(80, 200); g.moveTo(78, 300); g.lineTo(20, 220); g.moveTo(80, 260); g.lineTo(150, 170); g.stroke();
});

// ============================================================ rigs per look
type Rig = { au: C3; ad: C3; sun: C3; lamp: C3; win: number; fill: C3; haze: number; hazeC: C3; skyHaze: C3; snow: number; motes: number; patchB: C3; warmB: C3; mag: C3; vio: C3; fairy: number; desk: number; beat: number };
const R0: Rig = { au: [0, 0, 0], ad: [0, 0, 0], sun: [0, 0, 0], lamp: [0, 0, 0], win: 1, fill: [0, 0, 0], haze: 0, hazeC: [1, 1, 1], skyHaze: [1, 1, 1], snow: 0, motes: 0, patchB: [0, 0, 0], warmB: [0, 0, 0], mag: [0, 0, 0], vio: [0, 0, 0], fairy: 0, desk: 0, beat: 0 };
const RIGS: Record<Look, Rig> = {
  street: { ...R0, au: [0.34, 0.47, 0.98], ad: [0.22, 0.25, 0.42], sun: [3.2, 2.25, 1.35], lamp: [1.5, 0.9, 0.38], win: 1.15, fill: [0.08, 0.1, 0.2], skyHaze: [1.0, 0.8, 0.62], snow: 1 },
  cat: { ...R0, au: [0.3, 0.37, 0.76], ad: [0.21, 0.18, 0.27], sun: [2.7, 1.7, 0.82], lamp: [1.7, 1.0, 0.4], win: 1.3, fill: [0.1, 0.09, 0.16], skyHaze: [1.0, 0.72, 0.5], snow: 0.85 },
  skin: { ...R0 }, ice: { ...R0 },
  room: { ...R0, au: [0.36, 0.33, 0.56], ad: [0.24, 0.15, 0.13], sun: [3.35, 1.78, 0.8], win: 1.35, fill: [0.11, 0.12, 0.26], haze: 0.5, hazeC: [1.0, 0.7, 0.42], motes: 1.3,
    patchB: [0.42, 0.22, 0.09], warmB: [0.38, 0.2, 0.08], fairy: 0.7, desk: 0.15 },
  peak: { ...R0, au: [0.42, 0.16, 0.55], ad: [0.26, 0.06, 0.3], sun: [3.9, 2.1, 0.58], win: 1.6, fill: [0.2, 0.05, 0.3], haze: 0.7, hazeC: [1.2, 0.6, 0.34], motes: 1.5,
    patchB: [0.5, 0.24, 0.06], warmB: [0.5, 0.2, 0.05], mag: [2.4, 0.3, 1.6], vio: [0.9, 0.35, 2.2], fairy: 1.6, desk: 0.15, beat: 1 },
  roomend: { ...R0, au: [0.24, 0.26, 0.56], ad: [0.13, 0.09, 0.17], sun: [2.5, 1.05, 0.85], win: 0.9, fill: [0.08, 0.09, 0.22], haze: 0.42, hazeC: [1.0, 0.55, 0.55], motes: 0.9,
    patchB: [0.26, 0.11, 0.08], warmB: [0.22, 0.1, 0.07], fairy: 1.15, desk: 1.0 },
};
const mixRig = (a: Rig, b: Rig, k: number): Rig => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const o: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof Rig)[]) {
    const x = a[key], y = b[key];
    o[key] = Array.isArray(x) ? (x as number[]).map((v, i) => v + ((y as number[])[i] - v) * k) : (x as number) + ((y as number) - (x as number)) * k;
  }
  return o as Rig;
};
/** the rig for this frame: the shot's look, blended through LOOK_RAMPS exactly like world.ts */
const rigAt = (id: number, f: number): Rig => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && f >= r[2] && (
    (s.look === r[0] && r[2] >= s.a && r[2] <= s.b) || (s.look === r[1] && s.a >= r[2] && s.a <= r[3] && f <= r[3])));
  if (!rp) return RIGS[s.look];
  return mixRig(RIGS[rp[0]], RIGS[rp[1]], smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2])));
};
/** the world's camera-relative sun for a shot (same formula as world.shotSun, incl. SUN_FROM) */
const sunCache = new Map<number, THREE.Vector3>();
export const worldSun = (id: number) => {
  let v = sunCache.get(id);
  if (v) return v;
  const id2 = SUN_FROM[id] ?? id, s = SHOTS[id2 - 1], L = LOOKS[SHOTS[id - 1].look];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id2, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  sunCache.set(id, v);
  return v;
};
/** ROOM: the sets' own fixed sun (from shot 5's mean view: az ROOM_SUN_AZ, el ROOM_SUN_EL) so it always rakes through
 *  the left window onto the bed + back wall, whatever looks.ts says; looks room/peak/roomend should use the same */
export const ROOM_SUN_AZ = -115, ROOM_SUN_EL = 12;
let roomSunV: THREE.Vector3 | null = null;
export const roomSun = () => {
  if (roomSunV) return roomSunV;
  const s = SHOTS[4];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(5, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(ROOM_SUN_AZ), el = THREE.MathUtils.degToRad(ROOM_SUN_EL);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  return (roomSunV = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize());
};

// ============================================================ the STREET (bus stop)
type House = { x0: number; x1: number; z0: number; z1: number; h: number; col: string; roof: string; gable: boolean; floors: number; chim: boolean; front: number };
const HOUSE_COLS = ["#ff8a7a", "#ffd36a", "#7ac8e8", "#9ad08a", "#c9a0e8", "#ffb070", "#f4ead8", "#e86a6a", "#6ab8b0", "#f6a0c0"];
const ROOF_COLS = ["#8a3a3a", "#3a4a7a", "#5a3a5a", "#2e5a5a", "#7a4a2a"];
const makeHouses = (): House[] => {
  const r = rng(424), out: House[] = [];
  for (const side of [-1, 1]) {
    let z = side < 0 ? -14 : -16.5;
    let k = side < 0 ? 0 : 3;
    while (z > -132) {
      const w = 4.6 + r() * 2.4, h = 3.0 + r() * 1.2 + (r() < 0.55 ? 2.4 : 0), d = 6.5;
      const front = side * (5.0 + r() * 0.6);
      const x0 = side < 0 ? front - d : front, x1 = side < 0 ? front : front + d;
      out.push({ x0, x1, z0: z - w, z1: z, h, col: HOUSE_COLS[k % HOUSE_COLS.length], roof: ROOF_COLS[(k * 3 + 1) % ROOF_COLS.length], gable: r() < 0.6, floors: h > 4.8 ? 2 : 1, chim: r() < 0.6, front });
      z -= w + 0.9 + r() * 2.2; k++;
    }
  }
  return out.sort((a, b) => b.z1 - a.z1); // nearest first (the analytic shadow list keeps the nearest NB)
};
const HOUSES = makeHouses();
/** a bare winter tree: recursive tapered branches + snow on the upper sides of the bigger limbs; scale s */
const bareTree = (b: Bat, bark: THREE.Material, snowM: THREE.Material, x: number, z: number, s: number, seed: number, col = "#5a4048") => {
  const r = rng(seed);
  const branch = (a: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const e = a.clone().addScaledVector(dir, len);
    b.rod(bark, a, e, rad, depth > 2 ? 5 : 7, col, rad * 0.68);
    if (depth >= 1 && dir.y < 0.92 && rad > 0.025) b.rod(snowM, a.clone().add(V3(0, rad * 0.8, 0)), e.clone().add(V3(0, rad * 0.6, 0)), rad * 0.5, 5, "#f4f6ff", rad * 0.3);
    if (depth >= 4 || rad < 0.012) return;
    const n = depth === 0 ? 3 : 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const az = (i / n) * Math.PI * 2 + r() * 1.2 + depth, tilt = 0.45 + r() * 0.35;
      const d = dir.clone().multiplyScalar(0.55).add(V3(Math.cos(az) * tilt, 0.35 + r() * 0.25, Math.sin(az) * tilt)).normalize();
      branch(e, d, len * (0.62 + r() * 0.15), rad * 0.62, depth + 1);
    }
  };
  branch(V3(x, -0.05, z), V3(0, 1, 0), 1.6 * s, 0.11 * s, 0);
};
class Street {
  root = new THREE.Group(); S: LSet;
  clump = new THREE.Group(); puff: Puff; chunks: THREE.Mesh[] = [];
  snowNear: Snowfall; snowFar: Snowfall; glows: Glows; adMat: THREE.ShaderMaterial; glassMat: THREE.ShaderMaterial;
  constructor() {
    this.S = streetRig();
    const R = this.root, S = this.S;
    R.position.set(...STREET);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), far = new Bat();
    const snow = imat(S, { map: snowTex(), rep: [0.5, 0.5], spec: 18, specK: 0.12 });
    const snowP = imat(S, { spec: 18, specK: 0.12 }); // plain snow lumps (vertex colour)
    const road = imat(S, { map: roadTex(), rep: [1 / 6, 1 / 6] });
    const plaster = imat(S, { map: plasterTex(), rep: [0.5, 0.5] });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 80, specK: 0.7 });
    const ice = imat(S, { spec: 90, specK: 1.2, rim: 0.6, self: [0.15, 0.2, 0.3] });
    const winM = imat(S, { map: winTex(), emap: true, em: [1.7, 1.55, 1.35] });
    const lampM = imat(S, { col: "#000000", em: [3.4, 2.3, 1.1] });
    const wood = imat(S, { map: woodTex(), rep: [1, 1], spec: 40, specK: 0.25 });
    const SNOW = "#f6f8ff", TEAL = "#2a5a5e", DARK = "#2a2e3e", TRIM = "#fbf4e6";
    // ---- ground: sidewalk snow (y 0, gently lumpy away from the cards), kerb, roads ----
    const bump = (x: number, z: number) => {
      const nearCards = Math.exp(-((x / 2.2) ** 2) - (((z + 0.4) / 1.4) ** 2));
      return (0.02 * Math.sin(x * 1.7 + 0.3) * Math.sin(z * 2.3 + 1.1) + 0.012 * Math.sin(x * 4.1 + z * 3.3)) * (1 - 0.85 * nearCards);
    };
    b.add(flat(-40, -3.2, 40, 0.54, 0, 160, 19, bump), snow);
    b.add(flat(-3.0, -140, 3.0, -3.2, -0.14, 6, 40), road);                              // the side street (ruts along z)
    b.add(flat(-60, 0.62, 60, 18, -0.14, 1, 1, undefined, true), road);                  // the main road (ruts along x)
    for (const sx of [-1, 1]) {
      b.add(flat(sx < 0 ? -14 : 3.06, -140, sx < 0 ? -3.06 : 14, -3.2, 0, 22, 60, (x, z) => 0.03 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(z * 0.9)), snow); // side sidewalks + yards
      b.box(plain, sx * 3.03 - 0.03, -0.14, -140, sx * 3.03 + 0.03, -0.01, -3.2, "#b8bccc");                                // side kerbs
      for (let k = 0; k < 44; k++) { const z = -4 - k * 3.05; fu.add(lump(0.35 + (k % 4) * 0.06, 0.2 + (k % 3) * 0.04, 0.8, k * 7 + (sx > 0 ? 1 : 0), 0.2, 12), snowP, TRS(sx * 2.88, -0.12, z, sx * 0.1), SNOW); } // plowed banks
    }
    b.box(plain, -60, -0.14, 0.54, 60, -0.005, 0.62, "#a8aec2");                   // the front kerb (granite)
    for (let k = 0; k < 37; k++) { const x = -40 + k * 2.2; if (Math.abs(x) > 2.1) fu.add(lump(0.9, 0.2 + (k % 5) * 0.03, 0.3, k + 400, 0.2, 14), snowP, TRS(x, -0.02, 0.5), SNOW); } // plowed snow along the kerb
    // ---- the SHELTER ----
    {
      const X = 1.4, ZB = -1.0, ZF = -0.48, YR = 2.3;
      for (const x of [-X, X]) for (const z of [ZB, ZF]) cast.rbox(paint, 0.08, YR, 0.08, 0.02, TRS(x, YR / 2, z), TEAL);
      for (const x of [-0.5, 0.5]) cast.box(paint, x - 0.025, 0.1, ZB - 0.03, x + 0.025, YR - 0.06, ZB + 0.03, TEAL);   // back mullions
      cast.box(paint, -X, 0.06, ZB - 0.035, X, 0.14, ZB + 0.035, TEAL); cast.box(paint, -X, YR - 0.1, ZB - 0.035, X, YR - 0.02, ZB + 0.035, TEAL);
      for (const x of [-X, X]) { cast.box(paint, x - 0.03, 0.06, ZB, x + 0.03, 0.14, ZF, TEAL); cast.box(paint, x - 0.03, YR - 0.1, ZB, x + 0.03, YR - 0.02, ZF, TEAL); }
      // roof: underside panel, fascia, the snow cap with a drooping front overhang (a notch for the CLUMP)
      cast.box(paint, -1.52, YR, -1.2, 1.52, YR + 0.07, -0.45, "#e8eef0");
      cast.box(paint, -1.53, YR - 0.12, -0.45, 1.53, YR + 0.08, -0.41, "#1e4a5a");
      fu.add(new THREE.PlaneGeometry(3.04, 0.19), imat(S, { map: fasciaTex(), self: [0.12, 0.12, 0.14] }), TRS(0, YR - 0.02, -0.405));
      cast.rbox(snowP, 3.14, 0.16, 0.84, 0.07, TRS(0, YR + 0.13, -0.81), SNOW, 3);
      for (let i = 0; i < 16; i++) {
        const x = -1.48 + i * 0.198; if (Math.abs(x - 0.95) < 0.16) continue;
        cast.add(lump(0.13, 0.13, 0.11, 700 + i, 0.15, 12), snowP, TRS(x, YR + 0.07, -0.43, i * 0.7, 0.25), SNOW);
      }
      for (let i = 0; i < 8; i++) cast.add(lump(0.3, 0.12 + (i % 3) * 0.03, 0.3, 720 + i, 0.2, 12), snowP, TRS(-1.3 + i * 0.37, YR + 0.18, -0.85 + (i % 2) * 0.15, i), SNOW);
      const r = rng(77);
      for (let i = 0; i < 22; i++) { // icicles under the front fascia
        const x = -1.45 + i * 0.138 + (r() - 0.5) * 0.05, L = 0.04 + r() * r() * 0.2; if (Math.abs(x - 0.95) < 0.2) continue;
        fu.add(new THREE.ConeGeometry(0.014 + L * 0.06, L, 6), ice, TRS(x, YR - 0.12 - L / 2, -0.43, 0, Math.PI, 0), "#d8ecff");
      }
      // back glass + side glass (NOINK, see-through, a faint sheen + frosty foot)
      this.glassMat = new THREE.ShaderMaterial({
        uniforms: { uTint: { value: V3(0.75, 0.85, 1.0) }, uK: { value: 1 } },
        vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: /* glsl */ `uniform vec3 uTint; uniform float uK; varying vec2 vUv; varying vec3 vW;
          void main(){ float s = vW.x * 0.9 + vW.y * 0.55 + vW.z * 0.9;
            float streak = smoothstep(0.06, 0.0, abs(fract(s * 0.45) - 0.5) - 0.06) * 0.6 + smoothstep(0.02, 0.0, abs(fract(s * 0.45 + 0.13) - 0.5) - 0.01) * 0.4;
            float frost = smoothstep(0.16, 0.0, vUv.y);
            gl_FragColor = vec4(uTint * uK, 0.06 + 0.1 * streak + frost * 0.35); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const glass = (w: number, h: number, m: THREE.Matrix4) => { const gm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.glassMat); gm.applyMatrix4(m); gm.layers.set(NOINK); gm.renderOrder = 3; gm.frustumCulled = false; R.add(gm); };
      glass(0.95, YR - 0.24, TRS(0, YR / 2 - 0.02, ZB)); glass(0.85, YR - 0.24, TRS(0.95, YR / 2 - 0.02, ZB));
      glass(ZF - ZB - 0.06, YR - 0.24, TRS(-X, YR / 2 - 0.02, (ZB + ZF) / 2, Math.PI / 2)); glass(ZF - ZB - 0.06, YR - 0.24, TRS(X, YR / 2 - 0.02, (ZB + ZF) / 2, Math.PI / 2));
      // ad lightbox (left bay): the poster glows from inside
      cast.box(paint, -1.37, 0.62, ZB - 0.06, -0.53, 2.12, ZB + 0.06, "#e8eef0");
      this.adMat = imat(S, { map: adTex(), emap: true, em: [1.25, 1.2, 1.1] });
      fu.add(new THREE.PlaneGeometry(0.76, 1.42), this.adMat, TRS(-0.95, 1.37, ZB + 0.062));
      fu.box(gloss, -1.37, 0.62, ZB + 0.06, -0.53, 0.66, ZB + 0.075, "#e8eef0"); fu.box(gloss, -1.37, 2.08, ZB + 0.06, -0.53, 2.12, ZB + 0.075, "#e8eef0");
      fu.box(gloss, -1.37, 0.66, ZB + 0.06, -1.33, 2.08, ZB + 0.075, "#e8eef0"); fu.box(gloss, -0.57, 0.66, ZB + 0.06, -0.53, 2.08, ZB + 0.075, "#e8eef0");
      // timetable (right bay)
      fu.box(paint, 1.03, 1.27, ZB + 0.003, 1.27, 1.63, ZB + 0.01, "#1e4a9a");
      fu.add(new THREE.PlaneGeometry(0.22, 0.33), imat(S, { map: timetableTex(), self: [0.1, 0.1, 0.12] }), TRS(1.15, 1.45, ZB + 0.012));
      // BENCH: honey slats on cantilever brackets, seat top 0.46
      for (let k = 0; k < 4; k++) { const z0 = -0.81 + k * 0.08; fu.rbox(wood, 2.4, 0.035, 0.066, 0.012, TRS(0.05, 0.4425, z0 + 0.033), "#ffffff"); }
      for (const x of [-0.95, 0.05, 1.05]) {
        cast.box(metal, x - 0.025, 0.38, -0.84, x + 0.025, 0.425, ZB + 0.03, DARK);
        cast.rod(metal, V3(x, 0.4, -0.76), V3(x, 0.02, -0.95), 0.018, 6, DARK);
        cast.box(metal, x - 0.04, 0.0, -0.99, x + 0.04, 0.03, -0.9, DARK);
      }
      fu.add(lump(0.14, 0.05, 0.12, 811, 0.2, 12), snowP, TRS(1.15, 0.46, -0.7), SNOW);
      fu.add(lump(0.1, 0.04, 0.1, 812, 0.2, 12), snowP, TRS(-1.05, 0.46, -0.58), SNOW);
      // drifts against the outside of the back glass + at the front posts
      for (let i = 0; i < 9; i++) fu.add(lump(0.42, 0.16 + (i % 3) * 0.06, 0.35, 830 + i, 0.18, 14), snowP, TRS(-1.6 + i * 0.4, 0, ZB - 0.3, i * 0.9), SNOW);
      for (const x of [-X, X]) fu.add(lump(0.22, 0.12, 0.2, 850 + (x > 0 ? 1 : 0), 0.2, 12), snowP, TRS(x, 0, ZF + 0.04), SNOW);
      // bin (left), with a snow cap
      cast.lathe(gloss, [[0.001, 0], [0.17, 0], [0.19, 0.62], [0.2, 0.66], [0.001, 0.66]], TRS(-1.2, 0, -0.55), 20, "#2a6a4a");
      cast.torus(metal, 0.195, 0.015, TRS(-1.2, 0.64, -0.55, 0, Math.PI / 2), DARK);
      cast.add(lump(0.2, 0.08, 0.2, 860, 0.15, 12), snowP, TRS(-1.2, 0.66, -0.55), SNOW);
      // bus-stop pole with the round BUS sign + "42" plate (front right)
      cast.rod(metal, V3(1.75, 0, 0.3), V3(1.75, 2.95, 0.3), 0.03, 10, "#5a6078");
      fu.cyl(gloss, 0.26, 0.26, 0.03, 40, TRS(1.75, 2.62, 0.3, 0, Math.PI / 2), "#e8343c");
      for (const s of [1, -1]) fu.add(new THREE.CircleGeometry(0.255, 40), imat(S, { map: signTex(), self: [0.1, 0.1, 0.1] }), TRS(1.75, 2.62, 0.3 + s * 0.017, s > 0 ? 0 : Math.PI));
      fu.add(lump(0.2, 0.07, 0.04, 870, 0.15, 10), snowP, TRS(1.75, 2.87, 0.3), SNOW);
      fu.rbox(gloss, 0.3, 0.22, 0.02, 0.02, TRS(1.75, 2.22, 0.3), "#ffd23a");
      for (const s of [1, -1]) fu.add(new THREE.PlaneGeometry(0.28, 0.2), imat(S, { map: plate42Tex() }), TRS(1.75, 2.22, 0.3 + s * 0.0105, s > 0 ? 0 : Math.PI));
    }
    // ---- street lamps (warm, lit): front-left by the stop + along the side street ----
    const lampAt = (x: number, z: number, h = 3.5) => {
      const T = x > -2.5 && z > -1 ? cast : far;
      T.lathe(metal, [[0.001, 0], [0.11, 0], [0.11, 0.1], [0.07, 0.16], [0.055, 0.5], [0.001, 0.5]], TRS(x, 0, z), 12, "#22303a");
      T.rod(metal, V3(x, 0.4, z), V3(x, h, z), 0.04, 8, "#22303a");
      T.lathe(metal, [[0.001, 0], [0.09, 0], [0.12, 0.05], [0.001, 0.05]], TRS(x, h, z), 10, "#22303a");
      fu.lathe(lampM, [[0.001, 0], [0.1, 0], [0.135, 0.38], [0.001, 0.38]], TRS(x, h + 0.04, z), 4);
      T.lathe(metal, [[0.001, 0], [0.17, 0.0], [0.21, 0.05], [0.001, 0.2]], TRS(x, h + 0.42, z), 4, "#22303a");
      for (let q = 0; q < 4; q++) { const a = (q / 4) * Math.PI * 2 + Math.PI / 4; T.rod(metal, V3(x + Math.cos(a) * 0.1, h + 0.05, z + Math.sin(a) * 0.1), V3(x + Math.cos(a) * 0.14, h + 0.42, z + Math.sin(a) * 0.14), 0.01, 4, "#22303a"); }
      fu.add(lump(0.17, 0.08, 0.17, Math.round(Math.abs(x * 7 + z * 3)), 0.15, 10), snowP, TRS(x, h + 0.52, z), SNOW);
    };
    const LAMPS: [number, number][] = [[-2.3, 0.3], [-3.55, -9], [3.55, -19], [-3.55, -31], [3.55, -44], [-3.55, -57], [3.55, -71], [-3.55, -86], [3.55, -101], [-3.55, -117]];
    for (const [x, z] of LAMPS) lampAt(x, z);
    // ---- houses: plaster bodies, snowy roofs, warm windows, doors, chimneys ----
    const hb = this.S.u.uHB.value as THREE.Vector4[], hh = this.S.u.uHH.value as number[];
    HOUSES.forEach((H, i) => {
      if (i < NB) { hb[i].set(H.x0 + 0.05, H.z0 + 0.05, H.x1 - 0.05, H.z1 - 0.05); hh[i] = H.h; }
      const tgt = far, side = H.front < 0 ? -1 : 1, fx = H.front, w = H.z1 - H.z0, zc = (H.z0 + H.z1) / 2, xc = (H.x0 + H.x1) / 2, d = H.x1 - H.x0;
      tgt.box(plaster, H.x0, -0.1, H.z0, H.x1, H.h, H.z1, H.col);
      tgt.box(paint, H.x0 - 0.03, -0.1, H.z0 - 0.03, H.x1 + 0.03, 0.45, H.z1 + 0.03, "#8a8aa0"); // plinth
      const rise = H.gable ? w * 0.42 : d * 0.38, ov = 0.32;
      if (H.gable) { // ridge along x: the gable triangle faces the street
        const sh = new THREE.Shape(); sh.moveTo(H.z0, H.h); sh.lineTo(H.z1, H.h); sh.lineTo(zc, H.h + rise); sh.lineTo(H.z0, H.h);
        const tri = new THREE.ShapeGeometry(sh); tri.rotateY(-Math.PI / 2);
        for (const xx of [H.x0, H.x1]) tgt.add(tri.clone().translate(xx, 0, 0), plaster, undefined, H.col);
        const L = Math.hypot(w / 2, rise) + ov, ang = Math.atan2(rise, w / 2);
        for (const s of [-1, 1]) {
          const cz = zc + s * (w / 4 + ov * 0.35), cy = H.h + rise / 2 - ov * 0.3 * Math.sin(ang);
          tgt.rbox(paint, d + 2 * ov, 0.07, L, 0.02, TRS(xc, cy - 0.04, cz, 0, s * ang), H.roof);
          tgt.rbox(snowP, d + 2 * ov + 0.04, 0.2, L + 0.02, 0.09, TRS(xc, cy + 0.08, cz, 0, s * ang), SNOW, 2);
        }
        tgt.add(new THREE.CircleGeometry(0.28, 20), winM, TRS(fx + side * 0.02, H.h + rise * 0.4, zc, side * Math.PI / 2), "#ffffff");
      } else { // ridge along z
        const sh = new THREE.Shape(); sh.moveTo(H.x0, H.h); sh.lineTo(H.x1, H.h); sh.lineTo(xc, H.h + rise); sh.lineTo(H.x0, H.h);
        const tri = new THREE.ShapeGeometry(sh);
        for (const zz of [H.z0, H.z1]) tgt.add(tri.clone().translate(0, 0, zz), plaster, undefined, H.col);
        const L = Math.hypot(d / 2, rise) + ov, ang = Math.atan2(rise, d / 2);
        for (const s of [-1, 1]) {
          const cx = xc + s * (d / 4 + ov * 0.35), cy = H.h + rise / 2 - ov * 0.3 * Math.sin(ang);
          tgt.rbox(paint, L, 0.07, w + 2 * ov, 0.02, TRS(cx, cy - 0.04, zc, 0, 0, -s * ang), H.roof);
          tgt.rbox(snowP, L + 0.02, 0.2, w + 2 * ov + 0.04, 0.09, TRS(cx, cy + 0.08, zc, 0, 0, -s * ang), SNOW, 2);
        }
      }
      if (H.chim) { const cz = H.z0 + w * 0.3, cx2 = xc + d * 0.15; tgt.box(paint, cx2 - 0.3, H.h, cz - 0.25, cx2 + 0.3, H.h + rise + 0.9, cz + 0.25, "#b0585a"); tgt.rbox(snowP, 0.7, 0.14, 0.6, 0.06, TRS(cx2, H.h + rise + 0.95, cz), SNOW); }
      const rows = H.floors === 2 ? [0.95, 3.35] : [1.0], nW = w > 5.6 ? 3 : 2;
      rows.forEach((wy, ri) => {
        for (let k = 0; k < nW; k++) {
          const wz = H.z0 + (w * (k + 0.5)) / nW;
          if (ri === 0 && k === (nW === 3 ? 1 : 0)) { // door + warm transom
            tgt.box(gloss, fx - side * 0.05, 0.4, wz - 0.48, fx + side * 0.06, 2.35, wz + 0.48, TRIM);
            tgt.box(gloss, fx + side * 0.06, 0.45, wz - 0.4, fx + side * 0.08, 2.25, wz + 0.4, HOUSE_COLS[(i * 3 + 5) % HOUSE_COLS.length]);
            tgt.add(new THREE.PlaneGeometry(0.5, 0.2), winM, TRS(fx + side * 0.085, 2.05, wz, side * Math.PI / 2), "#ffffff");
            continue;
          }
          tgt.box(paint, fx - side * 0.04, wy - 0.08, wz - 0.5, fx + side * 0.07, wy + 1.32, wz + 0.5, TRIM);
          tgt.add(new THREE.PlaneGeometry(0.82, 1.22), winM, TRS(fx + side * 0.075, wy + 0.62, wz, side * Math.PI / 2), "#ffffff");
          tgt.box(paint, fx - side * 0.04, wy - 0.12, wz - 0.58, fx + side * 0.24, wy - 0.04, wz + 0.58, TRIM);
          tgt.rbox(snowP, 0.2, 0.08, 1.14, 0.035, TRS(fx + side * 0.13, wy - 0.01, wz), SNOW);
        }
      });
    });
    // picket fences with snow along the front yards
    for (const sx of [-1, 1]) for (let k = 0; k < 76; k++) { const z = -6 - k * 1.6; far.box(paint, sx * 4.55 - 0.03, 0, z - 0.06, sx * 4.55 + 0.03, 0.75, z, "#f4ead8"); }
    for (const sx of [-1, 1]) { far.box(paint, sx * 4.55 - 0.02, 0.5, -128, sx * 4.55 + 0.02, 0.58, -6, "#f4ead8"); far.box(snowP, sx * 4.55 - 0.05, 0.75, -128, sx * 4.55 + 0.05, 0.8, -6, SNOW); }
    // ---- bare trees: one big tree behind the shelter (its branch shadows reach the stop), a row down the street ----
    const bark = imat(S, {});
    bareTree(cast, bark, snowP, -2.7, -3.6, 1.9, 9101);
    bareTree(cast, bark, snowP, 3.3, -5.2, 1.3, 9102);
    for (let k = 0; k < 9; k++) bareTree(far, bark, snowP, (k % 2 ? 1 : -1) * 4.1, -13 - k * 12.5, 1.5 + (k % 3) * 0.2, 9200 + k);
    // ---- a snowman behind the stop (right) ----
    {
      const x = 2.3, z = -6.5;
      for (const [y, rr] of [[0.32, 0.36], [0.85, 0.26], [1.25, 0.19]] as [number, number][]) cast.sph(snowP, TRS(x, y, z, 0, 0, 0, rr), 18, SNOW);
      cast.add(new THREE.ConeGeometry(0.035, 0.2, 8), gloss, TRS(x - 0.06, 1.26, z + 0.24, 0, Math.PI / 2 - 0.2, 0), "#ff8a2a");
      cast.cyl(gloss, 0.13, 0.15, 0.2, 16, TRS(x, 1.48, z), DARK); cast.cyl(gloss, 0.22, 0.22, 0.02, 20, TRS(x, 1.39, z), DARK);
      cast.torus(plain, 0.2, 0.05, TRS(x, 1.1, z, 0, Math.PI / 2), "#e8343c");
      for (const s of [-1, 1]) cast.rod(bark, V3(x + s * 0.22, 0.9, z), V3(x + s * 0.6, 1.2, z + 0.1), 0.015, 5, "#5a4048");
      for (const s of [-1, 1]) fu.sph(gloss, TRS(x + s * 0.06, 1.33, z + 0.17, 0, 0, 0, 0.025), 8, "#1c1c28");
    }
    // ---- the distant HILL with pines (far, hazy) ----
    {
      const hill = new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      far.add(hill, snowP, TRS(-20, -2, -200, 0, 0, 0, [150, 32, 45]), "#eef2ff");
      far.add(hill, snowP, TRS(70, -2, -235, 0, 0, 0, [110, 44, 40]), "#e8eeff");
      const r = rng(1313);
      for (let i = 0; i < 90; i++) {
        const x = -110 + r() * 230, z = -168 - r() * 30;
        const hx = (x + 20) / 150, hy = 32 * Math.sqrt(Math.max(0, 1 - hx * hx - ((z + 200) / 45) ** 2)) - 2;
        if (hy < 1) continue;
        const s = 2.2 + r() * 2.5;
        far.add(new THREE.ConeGeometry(0.42 * s, 1.6 * s, 7), plain, TRS(x, hy + 0.6 * s, z), r() < 0.5 ? "#2e5a5e" : "#3a6a5a");
      }
    }
    b.build(R); fu.build(R); cast.build(R, true); far.build(R);
    // ---- the CLUMP (animated) + its burst chunks ----
    {
      const cb = new Bat();
      cb.add(lump(0.13, 0.11, 0.11, 901, 0.18, 14), snowP, TRS(0, -0.05, 0), SNOW);
      cb.sph(snowP, TRS(0.04, 0.03, 0.01, 0, 0, 0, [0.1, 0.08, 0.09]), 12, SNOW);
      cb.sph(snowP, TRS(-0.06, 0.0, -0.01, 0, 0, 0, [0.08, 0.07, 0.08]), 12, SNOW);
      for (const m of cb.build(this.clump)) { m.castShadow = true; m.matrixAutoUpdate = true; }
      R.add(this.clump);
      const cg = clean(new THREE.SphereGeometry(1, 10, 6), new THREE.Color(SNOW));
      for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(cg, snowP); m.frustumCulled = false; m.visible = false; m.receiveShadow = true; R.add(m); this.chunks.push(m); }
      this.puff = new Puff(R, 22, 31);
    }
    // ---- glows: lamps, house windows, the ad box; falling snow ----
    const items: GlowItem[] = [];
    for (const [x, z] of LAMPS) { items.push({ p: V3(x, 3.73, z), c: [0.9, 0.62, 0.3], s: 0.9, g: 0 }, { p: V3(x, 3.73, z), c: [0.22, 0.14, 0.07], s: 3.2, g: 0 }); }
    HOUSES.forEach((H) => {
      const side = H.front < 0 ? -1 : 1, w = H.z1 - H.z0, nW = w > 5.6 ? 3 : 2, rows = H.floors === 2 ? [0.95, 3.35] : [1.0];
      for (const wy of rows) for (let k = 0; k < nW; k++) items.push({ p: V3(H.front + side * 0.3, wy + 0.62, H.z0 + (w * (k + 0.5)) / nW), c: [0.16, 0.1, 0.04], s: 2.0, g: 1 });
    });
    items.push({ p: V3(-0.95, 1.37, -0.85), c: [0.16, 0.13, 0.08], s: 1.6, g: 2 });
    this.glows = new Glows(R, items, 0.8);
    this.snowNear = new Snowfall(R, 1500, 4242, [-4.5, -0.2, -7], [4.5, 4.6, 3.8], [0.012, 0.03]);
    this.snowFar = new Snowfall(R, 2200, 4343, [-14, -0.2, -60], [14, 14, -7], [0.03, 0.06]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), sd = worldSun(id);
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun); S.u.uOpen.value = 1; S.u.uHS.value = 1;
    S.u.uAO.value = 0; S.u.uTT.value = t; S.u.uFogCap.value = 0.82; (S.u.uHazeC.value as THREE.Color).setRGB(...rg.skyHaze);
    setLights(S, [
      { p: W2(-2.3, 3.6, 0.3), c: rg.lamp, r: 2.6 },                    // the lamp by the stop
      { p: W2(-0.95, 1.4, -0.75), c: [0.32, 0.24, 0.12], r: 0.75 },      // the ad box spill
      { p: W2(-3.55, 3.6, -9), c: rg.lamp, r: 2.4 }, { p: W2(3.55, 3.6, -19), c: rg.lamp, r: 2.4 }, { p: W2(-3.55, 3.6, -31), c: rg.lamp, r: 2.4 },
      { p: W2(3.55, 3.6, -44), c: rg.lamp, r: 2.4 }, { p: W2(-3.55, 3.6, -57), c: rg.lamp, r: 2.4 },
      { p: W2(0.2, 1.6, 3.5), c: rg.fill, r: 3.5 },                     // soft front fill
    ], rg.au, rg.ad);
    (this.adMat.uniforms.uEm.value as THREE.Vector3).set(1.25 * rg.win, 1.2 * rg.win, 1.1 * rg.win);
    this.glows.gk.set(rg.win, rg.win, rg.win, 0); this.glows.mat.uniforms.uT.value = t;
    for (const sn of [this.snowNear, this.snowFar]) {
      const u = sn.mat.uniforms; u.uT.value = t; u.uK.value = rg.snow;
      (u.uCol.value as THREE.Vector3).set(rg.au[0] * 1.5 + rg.ad[0], rg.au[1] * 1.5 + rg.ad[1], rg.au[2] * 1.2 + rg.ad[2]);
      (u.uSunC.value as THREE.Vector3).set(rg.sun[0] * 0.3, rg.sun[1] * 0.3, rg.sun[2] * 0.3); (u.uSD.value as THREE.Vector3).copy(sd);
    }
    // the clump: teeters, drops, squashes into a mound; chunks fly + the puff
    const c = clumpAt(id, t);
    this.clump.position.set(c.p[0] - O.x, c.p[1] - O.y, c.p[2] - O.z);
    this.clump.rotation.set(0.12 * c.wob * Math.sin(t * 38), 0, 0.1 * c.wob * Math.sin(t * 31 + 1));
    this.clump.scale.set(1, 1, 1);
    if (c.land) {
      const k = smooth((t - T_LAND) / 0.14), bounce = Math.sin(clamp01((t - T_LAND) / 0.3) * Math.PI) * (1 - k) * 0.15;
      this.clump.scale.set(1 + 0.45 * k, 1 - 0.55 * k + bounce, 1 + 0.35 * k);
      this.clump.position.y -= 0.03 * k;
    }
    this.puff.mesh.visible = c.burst > 0 && c.burst < 1;
    if (this.puff.mesh.visible) {
      this.puff.mat.uniforms.uAge.value = c.burst; (this.puff.mat.uniforms.uP.value as THREE.Vector3).set(...PLOP_AT);
      (this.puff.mat.uniforms.uCol.value as THREE.Vector3).set(rg.au[0] * 1.9 + rg.sun[0] * 0.05, rg.au[1] * 1.9 + rg.sun[1] * 0.05, rg.au[2] * 1.6 + rg.sun[2] * 0.05); // a cool blue-white puff reads on the sunlit snow
    }
    const ta = t - T_LAND, r = rng(55);
    this.chunks.forEach((m, i) => {
      const a = (i / this.chunks.length) * Math.PI * 2 + r(), v = 0.9 + r() * 0.9, vy = 1.4 + r() * 1.3, s = 0.025 + r() * 0.02;
      m.visible = id === 3 && ta > 0;
      if (!m.visible) return;
      const tl = (2 * vy) / 9.8, tt = Math.min(ta, tl), k = smooth((ta - tl) / 0.25), g0 = smooth(ta / 0.05);
      m.position.set(PLOP_AT[0] - O.x + Math.cos(a) * v * tt * 0.55, 0.05 + vy * tt - 4.9 * tt * tt, PLOP_AT[2] - O.z + Math.sin(a) * v * tt * 0.4);
      m.scale.set(s * (1 + 0.4 * k) * g0, s * (1 - 0.5 * k) * g0, s * (1 + 0.4 * k) * g0);
    });
  }
}

// ============================================================ the ROOM (BEAN's bedroom)
const RX0 = -2.0, RX1 = 2.0, RZ = -1.55, RY = 2.6, RZF = 3.8, WAIN = 0.85;
const RWX = RX0 - 0.09; // the sash plane
/** a window in a wall at x = wx facing +x: architrave, deep sill, sash frame + bars matching the aperture */
const sideWindow = (b: Bat, paint: THREE.Material, wx: number, wf: number, z0: number, z1: number, y0: number, y1: number, fr: number, cols: number, rows: number, TRIM: string, FR: string) => {
  const A = 0.07;
  b.box(paint, wf, y0 - 0.02, z0 - A, wf + 0.028, y1 + A, z0, TRIM); b.box(paint, wf, y0 - 0.02, z1, wf + 0.028, y1 + A, z1 + A, TRIM);
  b.box(paint, wf, y1, z0, wf + 0.028, y1 + A, z1, TRIM);
  b.box(paint, wf - 0.2, y0 - 0.04, z0 - 0.12, wf + 0.26, y0 + 0.001, z1 + 0.12, TRIM); // the deep sill (the cat sits on it)
  b.box(paint, wf, y0 - 0.16, z0 - 0.05, wf + 0.03, y0 - 0.04, z1 + 0.05, TRIM);
  const zi0 = z0 + fr, zi1 = z1 - fr, yi0 = y0 + fr, yi1 = y1 - fr, x0 = wx - 0.025, x1 = wx + 0.025;
  b.box(paint, x0, y0 + 0.001, z0, x1, y1, zi0, FR); b.box(paint, x0, y0 + 0.001, zi1, x1, y1, z1, FR);
  b.box(paint, x0, y0 + 0.001, zi0, x1, yi0, zi1, FR); b.box(paint, x0, yi1, zi0, x1, y1, zi1, FR);
  const bh = 0.025;
  for (let k = 1; k < cols; k++) { const z = zi0 + ((zi1 - zi0) * k) / cols; b.box(paint, x0 + 0.006, yi0, z - bh, x1 - 0.006, yi1, z + bh, FR); }
  for (let k = 1; k < rows; k++) { const y = yi0 + ((yi1 - yi0) * k) / rows; b.box(paint, x0 + 0.004, y - bh, zi0, x1 - 0.004, y + bh, zi1, FR); }
};
const reveals = (b: Bat, mat: THREE.Material, xa: number, xb: number, z0: number, z1: number, y0: number, y1: number) => {
  b.box(mat, xa, y0, z0 - 0.001, xb, y1, z0); b.box(mat, xa, y0, z1, xb, y1, z1 + 0.001);
  b.box(mat, xa, y1, z0, xb, y1 + 0.001, z1); b.box(mat, xa, y0 - 0.001, z0, xb, y0, z1);
};
const leafShape = (L: number) => {
  const s = new THREE.Shape(), w = L * 0.55;
  s.moveTo(0, 0); s.bezierCurveTo(-w, -L * 0.15, -w * 1.05, L * 0.6, 0, L); s.bezierCurveTo(w * 1.05, L * 0.6, w, -L * 0.15, 0, 0);
  return new THREE.ShapeGeometry(s, 8);
};
/** fairy-light bulb positions (local): 3 swags across the back wall over the bed + a run along the window head */
const FAIRY: { p: THREE.Vector3; c: C3 }[] = (() => {
  const out: { p: THREE.Vector3; c: C3 }[] = [], cols: C3[] = [[1.0, 0.7, 0.3], [1.0, 0.45, 0.6], [0.5, 0.9, 0.85], [1.0, 0.85, 0.4], [0.75, 0.55, 1.0]];
  let k = 0;
  const swag = (x0: number, x1: number, y: number, sag: number, n: number) => { for (let i = 0; i <= n; i++) { const u = i / n; out.push({ p: V3(x0 + (x1 - x0) * u, y - sag * Math.sin(u * Math.PI), RZ + 0.05), c: cols[k++ % cols.length] }); } };
  swag(-1.45, -0.5, 2.3, 0.22, 7); swag(-0.5, 0.5, 2.3, 0.26, 7); swag(0.5, 1.45, 2.3, 0.22, 7);
  for (let i = 0; i <= 10; i++) { const u = i / 10; out.push({ p: V3(RX0 + 0.07, RW.y1 + 0.16 - 0.08 * Math.sin(u * Math.PI * 2) ** 2, RW.z0 - 0.1 + (RW.z1 - RW.z0 + 0.2) * u), c: cols[k++ % cols.length] }); }
  return out;
})();
class Room {
  root = new THREE.Group(); S: LSet;
  ceil = new THREE.Group(); negX = new THREE.Group(); posX = new THREE.Group();
  haze: Haze; motes: Motes; glows: Glows; fairyGlow: Glows; outMat: THREE.ShaderMaterial; bulbMat: THREE.ShaderMaterial; deskLampMat: THREE.ShaderMaterial;
  cone = new THREE.Group(); mirGlass!: THREE.ShaderMaterial;
  constructor() {
    this.S = roomRig();
    const R = this.root, S = this.S;
    R.position.set(...ROOM);
    R.add(this.ceil, this.negX, this.posX);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat();
    const wallp = imat(S, { map: wallpaperTex(), rep: [1, 1] }), wain = imat(S, { map: wainTex(), rep: [1, 1] });
    const floor = imat(S, { map: floorTex(), rep: [0.5, 0.5], spec: 40, specK: 0.22 });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 90, specK: 0.9 });
    const soft = imat(S, { rim: 0.25 });
    const TRIM = "#fff4e4", WOOD = "#c8844a", WOODD = "#9a5e30";
    // ---- floor, back wall (wainscot + wallpaper), side walls (left: the SUN window), ceiling ----
    b.add(flat(RX0, RZ, RX1, RZF, 0), floor);
    b.add(wallZ(RX0, RX1, 0, WAIN, RZ), wain); b.add(wallZ(RX0, RX1, WAIN, RY, RZ), wallp);
    b.box(paint, RX0, WAIN - 0.03, RZ, RX1, WAIN + 0.04, RZ + 0.04, TRIM); b.box(paint, RX0, 0, RZ, RX1, 0.1, RZ + 0.025, TRIM);
    b.box(paint, RX0, RY - 0.08, RZ, RX1, RY, RZ + 0.06, TRIM);
    {
      const hole = [[RW.z0, RW.z1, RW.y0, RW.y1]];
      bn.add(wallX(RX0, RZ, RZF, 0, WAIN, hole), wain); bn.add(wallX(RX0, RZ, RZF, WAIN, RY, hole), wallp);
      bn.add(wallX(RX0 - 0.18, RZ, RZF, 0, RY), wallp);
      reveals(bn, wallp, RX0 - 0.18, RX0, RW.z0, RW.z1, RW.y0, RW.y1);
      bn.box(paint, RX0, WAIN - 0.03, RZ, RX0 + 0.04, WAIN + 0.04, RW.z0 - 0.07, TRIM); bn.box(paint, RX0, WAIN - 0.03, RW.z1 + 0.07, RX0 + 0.04, WAIN + 0.04, RZF, TRIM);
      bn.box(paint, RX0, 0, RZ, RX0 + 0.025, 0.1, RZF, TRIM);
      sideWindow(bn, paint, RWX, RX0, RW.z0, RW.z1, RW.y0, RW.y1, RW.fr, 3, 2, TRIM, "#fffaf0");
      // the view out: a self-lit sunset over snowy roofs (NOINK), set back behind the sash
      this.outMat = imat(S, { map: outsideTex(), emap: true, em: [1.5, 1.5, 1.5] });
      const og = new THREE.Mesh(clean(new THREE.PlaneGeometry(RW.z1 - RW.z0 + 0.4, RW.y1 - RW.y0 + 0.4)), this.outMat);
      og.rotation.y = Math.PI / 2; og.position.set(RX0 - 0.17, (RW.y0 + RW.y1) / 2, (RW.z0 + RW.z1) / 2); og.layers.set(NOINK); og.frustumCulled = false; this.negX.add(og);
      // curtains (coral, gathered at both sides) + rod
      const cm = imat(S, { spec: 20, specK: 0.1, rim: 0.2 });
      for (const [z, sd] of [[RW.z0 - 0.22, 41], [RW.z1 + 0.22, 42]] as [number, number][]) bn.add(drape(0.42, RW.y1 - RW.y0 + 0.55, 3, 0.04, sd, 0.6, 0.35), cm, TRS(RX0 + 0.09, RW.y1 + 0.3, z, Math.PI / 2), "#ff7a6a");
      bn.rod(metal, V3(RX0 + 0.1, RW.y1 + 0.3, RW.z0 - 0.5), V3(RX0 + 0.1, RW.y1 + 0.3, RW.z1 + 0.5), 0.014, 8, "#f0b83a");
      // a little cactus at the back end of the sill
      bn.lathe(gloss, [[0.001, 0], [0.06, 0], [0.075, 0.1], [0.001, 0.1]], TRS(RX0 + 0.12, RW.y0, RW.z0 + 0.12), 14, "#ff8a5a");
      bn.add(lump(0.04, 0.13, 0.04, 61, 0.1, 10), gloss, TRS(RX0 + 0.12, RW.y0 + 0.09, RW.z0 + 0.12), "#4aa04a");
      bp.add(wallX(RX1, RZ, RZF, 0, WAIN), wain); bp.add(wallX(RX1, RZ, RZF, WAIN, RY), wallp);
      bp.box(paint, RX1 - 0.04, WAIN - 0.03, RZ, RX1, WAIN + 0.04, RZF, TRIM); bp.box(paint, RX1 - 0.025, 0, RZ, RX1, 0.1, RZF, TRIM);
      bc.add(flat(RX0, RZ, RX1, RZF, RY), imat(S, { col: "#fff0e0" }));
      bc.lathe(gloss, [[0.001, 0], [0.22, 0], [0.2, -0.08], [0.001, -0.1]], TRS(0, RY, 0.8), 24, "#fff4dc");
    }
    // ---- the BED along the back wall: honey frame, cloud headboard (left), mattress, rumpled duvet, pillows ----
    {
      const x0 = -1.05, x1 = 0.95, z0 = -1.5, z1 = -0.35;
      cast.rbox(gloss, x1 - x0, 0.2, z1 - z0, 0.03, TRS((x0 + x1) / 2, 0.2, (z0 + z1) / 2), WOOD);
      for (const x of [x0 + 0.06, x1 - 0.06]) for (const z of [z0 + 0.06, z1 - 0.06]) cast.cyl(gloss, 0.035, 0.03, 0.12, 10, TRS(x, 0.06, z), WOODD);
      const hs = new THREE.Shape(); hs.moveTo(z0, 0.1); hs.lineTo(z1, 0.1); hs.lineTo(z1, 0.85);
      hs.absarc(z1 - 0.18, 0.85, 0.18, 0, Math.PI * 0.95, false); hs.absarc(z1 - 0.55, 0.98, 0.24, 0.1, Math.PI * 0.95, false); hs.absarc(z0 + 0.2, 0.86, 0.2, 0.1, Math.PI, false); hs.lineTo(z0, 0.1);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 16 });
      hg.rotateY(-Math.PI / 2); // shape x -> world z, extrude along -x
      cast.add(hg, gloss, TRS(x0 - 0.02, 0, 0), "#6ab0d8");
      const fs = new THREE.Shape(); fs.moveTo(z0, 0.1); fs.lineTo(z1, 0.1); fs.lineTo(z1, 0.5); fs.absarc((z0 + z1) / 2, 0.5, (z1 - z0) / 2, 0, Math.PI, false); fs.lineTo(z0, 0.1);
      const fg = new THREE.ExtrudeGeometry(fs, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 16 });
      fg.scale(1, 0.62, 1); fg.rotateY(-Math.PI / 2);
      cast.add(fg, gloss, TRS(x1 + 0.08, 0.04, 0), "#6ab0d8");
      cast.rbox(soft, x1 - x0 - 0.04, 0.16, z1 - z0 - 0.04, 0.06, TRS((x0 + x1) / 2, 0.36, (z0 + z1) / 2), "#fff8ee", 3);
      // duvet: a draped, rumpled sheet over the mattress (top ~0.48-0.5), a fold near the pillow, hanging over the front
      const dm = imat(S, { map: duvetTex(), rep: [1.4, 1.4], rim: 0.2 });
      const dg = new THREE.PlaneGeometry(1.55, 1.5, 40, 40), dp = dg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < dp.count; i++) {
        const u = dp.getX(i), v = dp.getY(i);
        let y = 0.47 + 0.008 * Math.sin(u * 5 + v * 4) + 0.004 * Math.sin(u * 11 - v * 7), z = -0.93 - v * 0.75;
        if (z > z1 - 0.03) { const over = z - (z1 - 0.03); y = 0.47 - over * 1.4; z = z1 + 0.015 + 0.015 * Math.sin(u * 9) + over * 0.05; }
        y += 0.025 * Math.exp(-(((u + 0.6) / 0.16) ** 2));
        dp.setXYZ(i, u + 0.15, y, z);
      }
      dg.computeVertexNormals();
      fu.add(dg, dm, undefined, "#ffffff");
      fu.rbox(soft, 0.4, 0.12, 0.62, 0.06, TRS(-0.72, 0.53, -1.0, 0.05), "#ffffff", 3);              // pillow
      fu.rbox(soft, 0.36, 0.3, 0.12, 0.06, TRS(-0.25, 0.62, -1.38, 0.08, -0.25), "#ff8a9a", 3);     // cushions against the wall
      fu.rbox(soft, 0.3, 0.26, 0.11, 0.05, TRS(0.45, 0.6, -1.4, -0.1, -0.2), "#7ad0c0", 3);
    }
    // ---- nightstand (left, by the headboard) + the SPEAKER on it; plant (back right) ----
    {
      cast.rbox(gloss, 0.42, 0.5, 0.36, 0.03, TRS(-1.48, 0.25, -1.3), "#ffd36a");
      fu.box(paint, -1.66, 0.3, -1.12, -1.3, 0.31, -1.115, "#e8a83a");
      fu.sph(metal, TRS(-1.48, 0.38, -1.11, 0, 0, 0, 0.02), 8, "#c8844a");
      const sx = -1.48, sy = 0.5, sz = -1.3;
      cast.rbox(gloss, 0.34, 0.52, 0.3, 0.025, TRS(sx, sy + 0.26, sz), "#3a2a3a");
      fu.cyl(gloss, 0.12, 0.12, 0.012, 32, TRS(sx, sy + 0.2, sz + 0.153, 0, Math.PI / 2), "#1c1420");
      fu.cyl(gloss, 0.045, 0.045, 0.012, 24, TRS(sx, sy + 0.42, sz + 0.153, 0, Math.PI / 2), "#1c1420");
      fu.torus(metal, 0.12, 0.012, TRS(sx, sy + 0.2, sz + 0.16), "#c8c0d0");
      const cb = new Bat(); cb.lathe(gloss, [[0.001, 0.03], [0.04, 0.025], [0.105, 0.0], [0.001, 0.0]], TRS(0, 0, 0, 0, Math.PI / 2), 28, "#5a4a6a"); cb.sph(gloss, TRS(0, 0, 0.03, 0, 0, 0, [0.035, 0.035, 0.02]), 14, "#2a2030");
      for (const m of cb.build(this.cone)) m.matrixAutoUpdate = true;
      this.cone.position.set(sx, sy + 0.2, sz + 0.16); R.add(this.cone);
      fu.sph(imat(S, { col: "#000000", em: [2.4, 0.4, 0.6] }), TRS(sx + 0.12, sy + 0.04, sz + 0.153, 0, 0, 0, 0.012), 8);
      const px = 1.68, pz = -1.25;
      cast.lathe(gloss, [[0.001, 0], [0.15, 0], [0.19, 0.36], [0.2, 0.38], [0.001, 0.38]], TRS(px, 0, pz), 22, "#e8784a");
      const r = rng(23), lm = imat(S, { spec: 40, specK: 0.3 });
      for (let k = 0; k < 13; k++) { const a = (k / 13) * Math.PI * 2 + r() * 0.3; cast.add(leafShape(0.36 + r() * 0.16), lm, TRS(px + Math.cos(a) * 0.05, 0.36 + r() * 0.2, pz + Math.sin(a) * 0.05, -a + Math.PI / 2, -0.3 - r() * 0.5, 0), k % 2 ? "#3f9a3a" : "#5ab44a"); }
    }
    // ---- posters, fairy-light wires ----
    {
      fu.add(new THREE.PlaneGeometry(0.5, 0.69), imat(S, { map: bearPosterTex(), spec: 30, specK: 0.1 }), TRS(-0.72, 1.72, RZ + 0.004, 0, 0, 0.035));
      fu.add(new THREE.PlaneGeometry(0.46, 0.63), imat(S, { map: rocketPosterTex(), spec: 30, specK: 0.1 }), TRS(0.75, 1.75, RZ + 0.004, 0, 0, -0.03));
      for (const [x, y] of [[-0.73, 2.05], [0.76, 2.05]] as [number, number][]) fu.sph(gloss, TRS(x, y, RZ + 0.01, 0, 0, 0, [0.014, 0.014, 0.008]), 8, "#e8343c");
      const pts = (x0: number, x1: number, y: number, sag: number) => { const o: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const u = i / 12; o.push(V3(x0 + (x1 - x0) * u, y - sag * Math.sin(u * Math.PI) + 0.012, RZ + 0.04)); } return o; };
      for (const [x0, x1, sag] of [[-1.45, -0.5, 0.22], [-0.5, 0.5, 0.26], [0.5, 1.45, 0.22]] as [number, number, number][]) fu.tube(plain, pts(x0, x1, 2.3, sag), 0.004, 30, "#3a5a3a", 4);
      const o: THREE.Vector3[] = []; for (let i = 0; i <= 20; i++) { const u = i / 20; o.push(V3(RX0 + 0.07, RW.y1 + 0.17 - 0.08 * Math.sin(u * Math.PI * 2) ** 2, RW.z0 - 0.1 + (RW.z1 - RW.z0 + 0.2) * u)); }
      bn.tube(plain, o, 0.004, 40, "#3a5a3a", 4);
    }
    // ---- desk on the right wall: desk lamp, books, mug; a chair; a guitar on the wall ----
    {
      const dx0 = 1.5, dx1 = 2.0, dz0 = 0.35, dz1 = 1.45, dy = 0.74;
      cast.rbox(gloss, dx1 - dx0, 0.04, dz1 - dz0, 0.012, TRS((dx0 + dx1) / 2, dy - 0.02, (dz0 + dz1) / 2), WOOD);
      for (const z of [dz0 + 0.04, dz1 - 0.04]) cast.box(paint, dx0 + 0.02, 0, z - 0.02, dx0 + 0.05, dy - 0.04, z + 0.02, "#ffffff");
      cast.box(paint, dx0 + 0.05, 0.4, dz0 + 0.04, dx1 - 0.01, dy - 0.04, dz0 + 0.42, "#ffffff");
      for (let k = 0; k < 5; k++) cast.rbox(gloss, 0.2, 0.035, 0.26, 0.006, TRS(1.78, dy + 0.018 + k * 0.036, 1.15, 0.15 * Math.sin(k * 2.1)), ["#e8343c", "#4a9ae8", "#ffd23a", "#5ad07a", "#c9a0e8"][k]);
      cast.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.1], [0.001, 0.1]], TRS(1.62, dy, 1.3), 14, "#ff8a9a");
      cast.cyl(metal, 0.08, 0.09, 0.03, 18, TRS(1.85, dy + 0.015, 0.55), "#2a6a7a");
      cast.rod(metal, V3(1.85, dy + 0.02, 0.55), V3(1.78, dy + 0.4, 0.62), 0.012, 6, "#2a6a7a");
      cast.rod(metal, V3(1.78, dy + 0.4, 0.62), V3(1.66, dy + 0.48, 0.72), 0.012, 6, "#2a6a7a");
      cast.lathe(metal, [[0.001, 0.0], [0.03, 0.0], [0.09, -0.12], [0.001, -0.12]], TRS(1.66, dy + 0.5, 0.72, 0, 0, 0.5), 18, "#2a6a7a");
      this.deskLampMat = imat(S, { col: "#000000", em: [0, 0, 0] });
      fu.sph(this.deskLampMat, TRS(1.62, dy + 0.42, 0.72, 0, 0, 0, 0.035), 10);
      cast.rbox(gloss, 0.4, 0.05, 0.4, 0.02, TRS(1.25, 0.45, 0.9), "#ff8a5a");
      cast.rbox(gloss, 0.05, 0.45, 0.4, 0.02, TRS(1.05, 0.7, 0.9, 0, 0, 0.08), "#ff8a5a");
      for (const x of [1.08, 1.42]) for (const z of [0.73, 1.07]) cast.rod(metal, V3(x, 0.43, z), V3(x, 0, z), 0.012, 6, "#3a3a4a");
      const gx = RX1 - 0.06, gy = 1.45, gz = -0.25;
      fu.add(lump(0.17, 0.03, 0.2, 71, 0.0, 16), gloss, TRS(gx, gy - 0.25, gz, 0, 0, Math.PI / 2), "#e8343c");
      fu.add(lump(0.13, 0.03, 0.15, 72, 0.0, 16), gloss, TRS(gx, gy, gz, 0, 0, Math.PI / 2), "#e8343c");
      fu.box(gloss, gx - 0.012, gy, gz - 0.03, gx + 0.012, gy + 0.55, gz + 0.03, "#5a3a22");
      fu.cyl(plain, 0.04, 0.04, 0.004, 16, TRS(gx - 0.032, gy - 0.12, gz, 0, 0, Math.PI / 2), "#1c1420");
    }
    // ---- the RUG ----
    fu.add(new THREE.CircleGeometry(1.0, 64), imat(S, { map: rugTex(), rep: [1, 1] }), TRS(0.15, 0.006, 0.45, 0, -Math.PI / 2, 0, [1, 0.82, 1]));
    // ---- the standing MIRROR (cheval): rounded wooden frame on two posts, painted backing + light glass (NOINK) ----
    {
      const g = MIRROR_GLASS, cx = g.c[0] - ROOM[0], cy = g.c[1] - ROOM[1], cz = g.c[2] - ROOM[2];
      const yaw = Math.atan2(g.n[0], g.n[2]);
      const M = (lx: number, ly: number, lz: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => new THREE.Matrix4().multiplyMatrices(TRS(cx, cy, cz, yaw), TRS(lx, ly, lz, ry, rx, rz, s));
      const hw = g.w / 2, hh = g.h / 2;
      const rrS = (s: THREE.Shape | THREE.Path, w: number, h: number, r: number) => { s.moveTo(-w + r, -h); s.lineTo(w - r, -h); s.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false); s.lineTo(w, h - r); s.absarc(w - r, h - r, r, 0, Math.PI / 2, false); s.lineTo(-w + r, h); s.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false); s.lineTo(-w, -h + r); s.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false); };
      const outer = new THREE.Shape(); rrS(outer, hw + 0.06, hh + 0.06, 0.3); const hole = new THREE.Path(); rrS(hole, hw, hh, 0.24); outer.holes.push(hole);
      cast.add(new THREE.ExtrudeGeometry(outer, { depth: 0.05, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2, curveSegments: 18 }), gloss, M(0, 0, -0.04), "#ffd36a");
      const inner = new THREE.Shape(); rrS(inner, hw + 0.01, hh + 0.01, 0.245);
      this.mirGlass = new THREE.ShaderMaterial({
        uniforms: { uK: { value: 1 }, uWarm: { value: V3(1, 0.8, 0.6) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `uniform float uK; uniform vec3 uWarm; varying vec2 vUv;
          void main(){ vec2 q = vUv; float s = q.x * 0.8 + q.y;
            float streak = smoothstep(0.035, 0.0, abs(s - 0.62)) * 0.55 + smoothstep(0.014, 0.0, abs(s - 0.71)) * 0.45 + smoothstep(0.02, 0.0, abs(s - 1.28)) * 0.3;
            float edge = smoothstep(0.06, 0.0, min(min(q.x, 1.0 - q.x), min(q.y, 1.0 - q.y)));
            vec3 c = mix(vec3(0.86, 0.93, 1.0), uWarm, 0.35 * q.x);
            gl_FragColor = vec4(c * uK, 0.08 + 0.35 * streak + 0.2 * edge); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      });
      const uvs = (geo: THREE.BufferGeometry) => { const gp = geo.getAttribute("position") as THREE.BufferAttribute, guv = geo.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < gp.count; i++) guv.setXY(i, (gp.getX(i) + hw) / (2 * hw), (gp.getY(i) + hh) / (2 * hh)); return geo; };
      const glass = new THREE.Mesh(uvs(new THREE.ShapeGeometry(inner, 18)), this.mirGlass); glass.applyMatrix4(M(0, 0, 0.0)); glass.layers.set(NOINK); glass.renderOrder = 4; glass.frustumCulled = false; R.add(glass);
      const bk = ctex("goMirrorBack", 256, 512, (gx, r) => {
        const gr = gx.createLinearGradient(0, 0, 256, 512); gr.addColorStop(0, "#c8d8ec"); gr.addColorStop(0.5, "#ecd6cc"); gr.addColorStop(1, "#b8a8c8"); gx.fillStyle = gr; gx.fillRect(0, 0, 256, 512);
        for (let i = 0; i < 30; i++) blot(gx, r() * 256, r() * 512, 30 + r() * 70, r() < 0.5 ? "255,220,180" : "170,180,220", 0.25, 256, 512);
        gx.fillStyle = "rgba(255,255,255,0.5)"; gx.beginPath(); gx.moveTo(30, 0); gx.lineTo(90, 0); gx.lineTo(0, 200); gx.lineTo(0, 70); gx.fill();
      });
      fu.add(uvs(new THREE.ShapeGeometry(inner, 18)), imat(S, { map: bk, self: [0.35, 0.35, 0.4], spec: 80, specK: 0.4 }), M(0, 0, -0.07));
      fu.rbox(gloss, 2 * hw + 0.1, 2 * hh + 0.1, 0.02, 0.008, M(0, 0, -0.1), "#e0a84a");
      for (const s of [-1, 1]) {
        const px = s * (hw + 0.1);
        cast.rbox(gloss, 0.05, hh + 0.95, 0.05, 0.015, M(px, -cy + (hh + 0.95) / 2, -0.04), "#ffd36a");
        cast.rbox(gloss, 0.06, 0.05, 0.42, 0.02, M(px, 0.025 - cy, -0.04), "#e0a84a");
        cast.sph(metal, M(px - s * 0.035, 0, -0.04, 0, 0, 0, 0.03), 10, "#f0b83a");
      }
    }
    b.build(R); fu.build(R); cast.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    // ---- fairy lights: bulbs (emissive, pulse at the peak) + glows ----
    {
      this.bulbMat = imat(S, { col: "#000000", em: [1, 1, 1] });
      const fb = new Bat(), fbn = new Bat();
      for (const q of FAIRY) (q.p.x < RX0 + 0.1 ? fbn : fb).sph(this.bulbMat, TRS(q.p.x, q.p.y - 0.012, q.p.z, 0, 0, 0, [0.014, 0.02, 0.014]), 8, "#" + new THREE.Color(...q.c).getHexString());
      fb.build(R); fbn.build(this.negX);
      this.fairyGlow = new Glows(R, FAIRY.map((q) => ({ p: V3(q.p.x + (q.p.x < RX0 + 0.1 ? 0.03 : 0), q.p.y - 0.012, q.p.z + (q.p.x < RX0 + 0.1 ? 0 : 0.03)), c: [q.c[0] * 0.5, q.c[1] * 0.5, q.c[2] * 0.5] as C3, s: 0.22, g: 0, tw: 1 })), 0.4);
    }
    this.glows = new Glows(R, [
      { p: V3(RX0 + 0.05, (RW.y0 + RW.y1) / 2, (RW.z0 + RW.z1) / 2), c: [0.4, 0.26, 0.13], s: 2.2, g: 0 },   // the window's halo
      { p: V3(1.62, 1.16, 0.72), c: [0.6, 0.4, 0.15], s: 0.35, g: 1 }, { p: V3(1.62, 1.16, 0.72), c: [0.14, 0.09, 0.04], s: 1.4, g: 1 }, // desk lamp
    ], 0.4);
    this.haze = new Haze(R, S);
    this.motes = new Motes(R, S, 700, 71, [-1.9, 0.5, -1.45, 1.6, 2.4, 1.0]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), sd = roomSun();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun); S.u.uOpen.value = 0; S.u.uHS.value = 0;
    (S.u.uWC.value as THREE.Vector3).set(O.x + RWX, O.y + (RW.y0 + RW.y1) / 2, O.z + (RW.z0 + RW.z1) / 2);
    (S.u.uWN.value as THREE.Vector3).set(1, 0, 0); (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((RW.z1 - RW.z0) / 2 - RW.fr, (RW.y1 - RW.y0) / 2 - RW.fr);
    (S.u.uWM.value as THREE.Vector4).set(3, 2, 0.025, 0.35);
    (S.u.uO.value as THREE.Vector3).set(O.x, O.y, O.z); (S.u.uBox.value as THREE.Vector4).set(RX1, RZ, RY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uFogCap.value = 1;
    // the beat (peak): 2 pulses / s from "hits", calmer once the bear deflates
    const ra = roomAt(id, t), beatPh = Math.max(0, t - W.hits), beat = rg.beat * (0.5 + 0.5 * Math.cos(beatPh * Math.PI * 4)) * (1 - 0.6 * ra.deflate);
    const mag = rg.mag.map((v) => v * (0.75 + 0.5 * beat)) as C3, vio = rg.vio.map((v) => v * (1.1 - 0.4 * beat)) as C3;
    setLights(S, [
      { p: W2(0.1, 1.05, -0.9), c: rg.patchB, r: 1.1 },                 // sun bounce off the bed
      { p: W2(RX0 + 0.5, 1.5, -0.3), c: rg.warmB, r: 1.2 },             // glow in front of the window
      { p: W2(0.3, 1.9, 3.2), c: rg.fill, r: 3.6 },                     // cool front fill
      { p: W2(0.0, 2.05, RZ + 0.35), c: [0.16 * rg.fairy, 0.1 * rg.fairy, 0.06 * rg.fairy], r: 0.9 },   // fairy lights over the bed
      { p: W2(1.62, 1.12, 0.72), c: [0.9 * rg.desk, 0.55 * rg.desk, 0.22 * rg.desk], r: 0.8 },         // desk lamp
      { p: W2(1.7, 1.6, 0.9), c: mag, r: 1.8 },                         // peak: magenta from the right
      { p: W2(-0.6, 2.4, 0.4), c: vio, r: 1.6 },                        // peak: violet from above
      { p: W2(-1.4, 0.9, -1.0), c: [rg.patchB[0] * 0.6 * (1 + beat), rg.patchB[1] * 0.5, rg.patchB[2] * 0.4], r: 0.8 }, // speaker corner
    ], rg.au, rg.ad);
    (this.outMat.uniforms.uEm.value as THREE.Vector3).set(rg.sun[0] * 0.42, rg.sun[1] * 0.68, rg.sun[2] * 1.35);
    const fk = rg.fairy * (1 + 0.8 * beat);
    (this.bulbMat.uniforms.uEm.value as THREE.Vector3).set(1.6 * fk + 0.4, 1.6 * fk + 0.4, 1.6 * fk + 0.4);
    this.fairyGlow.gk.set(fk, 0, 0, 0); this.fairyGlow.mat.uniforms.uT.value = t;
    (this.deskLampMat.uniforms.uEm.value as THREE.Vector3).set(3.0 * rg.desk, 2.2 * rg.desk, 1.0 * rg.desk);
    this.glows.gk.set(rg.win, rg.desk, 0, 0); this.glows.mat.uniforms.uT.value = t;
    this.haze.set(V3(RWX, (RW.y0 + RW.y1) / 2, (RW.z0 + RW.z1) / 2), V3(0, 0, 1), V3(0, 1, 0), (RW.z1 - RW.z0) / 2, (RW.y1 - RW.y0) / 2, sd.clone().negate(), 4.2, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    this.cone.scale.set(1, 1, 1 + 1.6 * beat);
    (this.mirGlass.uniforms.uWarm.value as THREE.Vector3).set(...(rg.sun.map((v) => Math.min(1.2, v / 3.5)) as C3));
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > RX0 + 0.1; this.posX.visible = c.x < RX1 - 0.1; this.ceil.visible = c.y < RY - 0.1;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { street: [0.1, 1.7, 5.5, 0.1, 1.2, -2, 45], room: [0, 1.5, 3.6, 0, 1.1, -0.6, 50] };
export class Sets {
  root = new THREE.Group();
  private street = new Street();
  private room = new Room();
  constructor() { this.root.add(this.street.root, this.room.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const o: SV3 = place === "room" ? ROOM : STREET, d = DEBUG_VIEW[place];
      cam.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); cam.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    this.street.root.visible = place === "street";
    this.room.root.visible = place === "room";
    if (this.street.root.visible) this.street.update(id, t, f);
    if (this.room.root.visible) this.room.update(id, t, f, cam);
  }
}
