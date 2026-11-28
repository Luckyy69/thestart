// OWNER: sets. "The Cleaning Crew": the school EXAM HALL (shot 1 "hall" + shot 5 "hush" -> "peak").
//
// The hall lights itself with its OWN shader rig (sets_kit.ts imat, technique: freeze/sets.ts GYM): the low late-morning
// sun enters ONLY through the tall window strip in the LEFT wall (x -5): per pixel a surface is lit only if its ray
// toward the sun passes the window aperture minus the piers and the VENETIAN BLIND slats, so the sun lays long raking
// stripes across the oak floor, the desks and the far wall; ray-marched haze beams + dust motes glow in the shafts
// (NOINK). The slats are real instanced geometry whose tilt follows the look:
//   hall  cool late morning: blinds half open (stripes everywhere), cool blue ambient, warm pale sun, soft haze.
//   hush  (shot 5): the room dimmer + cooler, the blinds SHUT except ONE open slat gap aimed at BEAN's chest: ONE sun
//         stripe across BEAN (and his desk), one thin haze beam.
//   peak  (LOOK_RAMPS hush -> peak, "GROWLS"): the gap opens into a hot patch on BEAN + a theatrical overhead SPOTLIGHT
//         (hot cone + pool), the rest of the room falls into deep blue shade.
// SUN: the rig uses HALL_SUN, a FIXED world direction (from the left windows, a little behind the desks). When the
//   world's own sun (looks.ts sunAz/sunEl for the shot's look) matches it within 4 deg, the left wall, ceiling and the
//   blind slats CAST into the world shadow map (so the CARDS get the same stripes / the single hush stripe / the peak
//   patch) and the set uses the map; otherwise the set falls back to its analytic aperture test and casts nothing.
//   hallSunAz(id) returns the looks sunAz that makes the world sun match for a shot's (final) camera; el = HALL_SUN_EL.
//
// CONTRACTS (world = HALL + local, metres, HALL = (0,0,0)):
//   Room: oak floor y 0; LEFT wall x -5 (window strip z -4.2..4.0, y 0.95..3.6, 5 bays, piers, blinds), FRONT wall
//   z -5 (blackboard x -2..2 y 0.92..2.62, CLOCK above it), BACK wall z 5.4 (SILENCE banner, bulletin board, trophy
//   cabinet), RIGHT wall x 4.4 (posters, the door at z 3.0..4.1), ceiling y 4.3.
//   DESKS[i] = the pupil's spot (card foot) for row r (z -1.4, 0, 1.4: front..back) x col c (x -2.6, -1.3, 0, 1.3),
//   i = r * 4 + c. BEAN = DESKS[BEAN_DESK = 6] = (0,0,0). Each desk: top y DESK_TOP_Y (0.75) centred at (x, z - 0.35), 0.66 x 0.46;
//   chair seat y 0.45 at (x, z + 0.04), back rest at z + 0.25.
//   TEACHER_DESK: centre (0, 0, -3.8), top y 0.78, x -0.95..0.95, z -4.1..-3.5 (teacher stands behind at z ~ -4.45);
//   APPLE_AT, BELL_AT on its top. CLOCK: centre (0, 3.2, -4.93), radius 0.42, facing +z; clockAt(id, t) = the shown
//   time (shot 1 11:58 + ticking seconds; shot 5 the minute hand jumps to 11:59 at T_TICK = W.always - 0.1).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { HALL, SHOTS, LOOK_RAMPS, SUN_FROM, settleAt, Look, V3 as SV3, smooth, clamp01, camAt, W } from "./story";
import { LOOKS } from "./looks";
import { V3, C3, Bat, TRS, MM, flat, wallZ, wallX, lump, LSet, imat, setLights, hallRig, Glows, GlowItem, Haze, Motes, clean } from "./sets_kit";
import { oakTex, plasterTex, panelTex, boardTex, silenceTex, clockFaceTex, outsideTex, corkTex, posterTex, feltTex, ceilTex, doorSignTex } from "./sets_tex";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ exported contracts (world coordinates)
export const HX0 = -5, HX1 = 4.4, HZ0 = -5, HZ1 = 5.4, HY = 4.3;
export const DESK_COLS = [-2.6, -1.3, 0, 1.3], DESK_ROWS = [-1.4, 0, 1.4];
export const DESK_TOP_Y = 0.75;
/** pupil spots (card foot), i = row * 4 + col; BEAN = DESKS[BEAN_DESK] */
export const DESKS: C3[] = DESK_ROWS.flatMap((z) => DESK_COLS.map((x) => add(HALL, x, 0, z)));
export const BEAN_DESK = 6;
/** the desk-top centre for pupil spot i */
export const deskTop = (i: number): C3 => add(DESKS[i], 0, DESK_TOP_Y, -0.35);
export const TEACHER_DESK = { c: add(HALL, 0, 0, -3.8), top: 0.78, x0: -0.95, x1: 0.95, z0: -4.1, z1: -3.5 };
export const APPLE_AT = add(HALL, -0.55, 0.78, -3.68);
export const BELL_AT = add(HALL, 0.55, 0.78, -3.7);
export const CLOCK = { c: add(HALL, 0, 3.2, -4.93), r: 0.42, n: [0, 0, 1] as C3 };
export const WIN = { x: HX0, z0: -4.2, z1: 4.0, y0: 0.95, y1: 3.6, bays: 5, pier: 0.16, slats: 26 };
/** the low sun (unit, toward the sun) the hall rig uses */
export const HALL_SUN_AZ = -62, HALL_SUN_EL = 19; // as a looks sunAz/El for a camera looking -z (toward the blackboard): from the front-left
export const HALL_SUN = (() => {
  const az = THREE.MathUtils.degToRad(HALL_SUN_AZ), el = THREE.MathUtils.degToRad(HALL_SUN_EL);
  return V3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
})();
const meanView = (id: number) => {
  const s = SHOTS[id - 1];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1;
  return [fx / n, fz / n];
};
/** the looks.ts sunAz (deg) that makes world.shotSun == HALL_SUN for shot id (use sunEl = HALL_SUN_EL) */
export const hallSunAz = (id: number) => {
  const [fx, fz] = meanView(id), h = Math.hypot(HALL_SUN.x, HALL_SUN.z), hx = HALL_SUN.x / h, hz = HALL_SUN.z / h;
  return THREE.MathUtils.radToDeg(Math.atan2(fx * hz - fz * hx, fx * hx + fz * hz));
};
/** the world's sun for a shot (same formula as world.shotSun) */
const wsCache = new Map<number, THREE.Vector3>();
const worldSun = (id: number) => {
  let v = wsCache.get(id);
  if (v) return v;
  const L = LOOKS[SHOTS[id - 1].look], [fx, fz] = meanView(SUN_FROM[id] ?? id); // (cam) same shot as world.shotSun
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = V3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  wsCache.set(id, v);
  return v;
};

// ---- the clock ----
/** a damped spring 0 -> 1 with a small overshoot */
const spring = (s: number) => (s <= 0 ? 0 : 1 - Math.exp(-9 * s) * (Math.cos(22 * s) + (9 / 22) * Math.sin(22 * s)));
export const T_TICK = W.always - 0.1;
/** the time the hall clock shows: h, m (fractional, overshoot on the jump), s (ticking, overshoot per tick) */
export const clockAt = (id: number, t: number) => {
  if (id === 5) {
    const d = t - T_TICK, sec = Math.floor(d) + spring((d - Math.floor(d)) * 1.6);
    return { h: 11, m: 58 + spring(d * 1.5), s: sec };
  }
  const sec = 21 + Math.floor(t) + spring((t - Math.floor(t)) * 1.6);
  return { h: 11, m: 58 + sec / 600, s: sec };
};

// ============================================================ rigs per look
export type Rig = {
  au: C3; ad: C3; sun: C3; fill: C3; bounce: C3; haze: number; hazeC: C3; motes: number; outK: number; tubes: number;
  blind: number; /* 0 = half-open slats (stripes), 1 = shut with ONE open gap */ gapH: number; /* gap half-height on the window (m) */
  spot: C3; spotR: number; /* pool radius on the floor */ beam: number;
};
const PITCH0 = (WIN.y1 - WIN.y0) / WIN.slats;
const R0: Rig = { au: [0, 0, 0], ad: [0, 0, 0], sun: [0, 0, 0], fill: [0, 0, 0], bounce: [0, 0, 0], haze: 0, hazeC: [1, 1, 1], motes: 0, outK: 1, tubes: 0, blind: 0, gapH: 0.045, spot: [0, 0, 0], spotR: 0.9, beam: 0 };
const RIGS: Record<Look, Rig> = {
  hall: { ...R0, au: [0.46, 0.55, 0.78], ad: [0.26, 0.24, 0.26], sun: [3.1, 2.65, 2.05], fill: [0.1, 0.12, 0.17], bounce: [0.3, 0.22, 0.13], haze: 0.75, hazeC: [1.0, 0.93, 0.8], motes: 1.3, outK: 1.0, tubes: 0.35 },
  hush: { ...R0, au: [0.22, 0.29, 0.5], ad: [0.1, 0.11, 0.17], sun: [3.4, 2.75, 1.95], fill: [0.05, 0.07, 0.13], bounce: [0.16, 0.11, 0.06], haze: 1.6, hazeC: [1.0, 0.9, 0.72], motes: 1.6, outK: 0.55, tubes: 0, blind: 1, gapH: PITCH0 },
  peak: { ...R0, au: [0.09, 0.14, 0.38], ad: [0.03, 0.04, 0.12], sun: [4.0, 2.6, 1.25], fill: [0.02, 0.04, 0.12], bounce: [0.35, 0.18, 0.06], haze: 1.6, hazeC: [1.0, 0.75, 0.45], motes: 2.0, outK: 0.3, tubes: 0, blind: 1, gapH: 0.36, spot: [2.3, 1.6, 0.85], spotR: 0.95, beam: 1 },
  belly: { ...R0 }, full: { ...R0 }, staff: { ...R0 },
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
export const rigAt = (id: number, f: number): Rig => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && f >= r[2] && (
    (s.look === r[0] && r[2] >= s.a && r[2] <= s.b) || (s.look === r[1] && s.a >= r[2] && s.a <= r[3] && f <= r[3])));
  const base = !rp ? RIGS[s.look] : mixRig(RIGS[rp[0]], RIGS[rp[1]], smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2])));
  const stl = settleAt(id, f); // (QA2) shot 5 after the peak: settle back toward the hush rig (stepped on cuts only)
  return stl > 0 ? mixRig(base, RIGS.hush, stl) : base;
};

// ============================================================ helpers
const WCZ = (WIN.z0 + WIN.z1) / 2, WCY = (WIN.y0 + WIN.y1) / 2, BAYW = (WIN.z1 - WIN.z0) / WIN.bays, PITCH = (WIN.y1 - WIN.y0) / WIN.slats;
/** where the sun ray through local point p meets the window plane: (z, y) */
const onWindow = (p: THREE.Vector3) => { const t = (HX0 - p.x) / HALL_SUN.x; return [p.z + HALL_SUN.z * t, p.y + HALL_SUN.y * t]; };
/** BEAN's chest (local): the hush stripe is aimed here */
export const STRIPE_AT = V3(0, 1.28, 0.0); // (QA2) across his FACE (eyes + nose): the quiet-room spotlight (was the chest 1.0)
const GAP = (() => {
  const [z, y] = onWindow(STRIPE_AT);
  const bay = THREE.MathUtils.clamp(Math.floor((z - WIN.z0) / BAYW), 0, WIN.bays - 1);
  const k = Math.round((y - WIN.y0) / PITCH), yc = WIN.y0 + k * PITCH; // snap between two slats (the gap = 2 open slats)
  return { bay, zc: WIN.z0 + (bay + 0.5) * BAYW, yc, k };
})();

/** a cone beam (NOINK, additive): the theatrical spotlight */
class Beam {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, top: THREE.Vector3, r0: number, r1: number) {
    const h = top.y;
    const g = new THREE.CylinderGeometry(r0, r1, h, 48, 12, true); g.translate(0, h / 2, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: V3(0, 0, 0) }, uH: { value: h } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); vY = position.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uC; uniform float uH; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float f = abs(dot(normalize(vN), normalize(vV))); float a = pow(f, 2.2) * (0.35 + 0.65 * smoothstep(0.0, uH, vY)) * smoothstep(0.0, 0.25, vY);
          gl_FragColor = vec4(uC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.position.set(top.x, 0, top.z); this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    parent.add(this.mesh);
  }
}

// ============================================================ the HALL
class Hall {
  root = new THREE.Group(); S: LSet;
  haze: Haze; motes: Motes; outMat: THREE.ShaderMaterial; tubeMat: THREE.ShaderMaterial; spotLens: THREE.ShaderMaterial; glows: Glows; beam: Beam;
  slats: THREE.InstancedMesh; slatInfo: { z: number; y: number; bay: number; k: number }[] = [];
  casters: THREE.Mesh[] = []; wallCasters: THREE.Mesh[] = [];
  /** (QA2) shot 5 only: an invisible shadow-only "shutter" over the left wall with ONE slit (the hush stripe). BEAN sits
   *  right where a window PIER's shadow falls (it cut a soft dark band down his face), so in shot 5 the real wall + slats
   *  stop casting and this occluder (its slit spans the pier) casts the single clean stripe instead. */
  shutter: THREE.Mesh[] = [];
  hands: { h: THREE.Mesh; m: THREE.Mesh; s: THREE.Mesh };
  negX = new THREE.Group(); posX = new THREE.Group(); front = new THREE.Group(); back = new THREE.Group(); ceil = new THREE.Group();
  private lastSlat = "";
  constructor() {
    this.S = hallRig();
    const R = this.root, S = this.S;
    R.position.set(...HALL);
    R.add(this.negX, this.posX, this.front, this.back, this.ceil);
    const b = new Bat(), fu = new Bat(), cast = new Bat(), bn = new Bat(), bnc = new Bat(), bp = new Bat(), bf = new Bat(), bb = new Bat(), bc = new Bat(), bcc = new Bat();
    const oak = imat(S, { map: oakTex(), rep: [0.5, 0.5], spec: 90, specK: 0.6 });
    const plaster = imat(S, { map: plasterTex(), rep: [0.5, 0.5] }), panel = imat(S, { map: panelTex(), rep: [1 / 1.2, 1], spec: 40, specK: 0.25 });
    const plain = imat(S, {}), paint = imat(S, { spec: 30, specK: 0.18 }), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 80, specK: 0.8 });
    const wood = imat(S, { spec: 50, specK: 0.35 }), cloth = imat(S, { rim: 0.15 }), leaf = imat(S, { spec: 30, specK: 0.2, rim: 0.25 });
    const WALL = "#dfeadf", TRIM = "#fffaf0", DADO = "#ffffff", RAIL = "#a8643a";
    // ---- floor ----
    b.add(flat(HX0, HZ0, HX1, HZ1, 0), oak);
    // ---- walls: wood dado 0..1.0 + rail, sage plaster above; skirting; cornice ----
    const dado = 1.0;
    const sideWall = (T: Bat, TC: Bat, x: number, holes: number[][], inward: number) => {
      TC.add(wallX(x, HZ0, HZ1, 0, dado, holes), panel, undefined, DADO); TC.add(wallX(x, HZ0, HZ1, dado, HY, holes), plaster, undefined, WALL);
      const segs = holes.length ? [[HZ0, holes[0][0]], [holes[0][1], HZ1]] : [[HZ0, HZ1]], full = [[HZ0, HZ1]];
      const railCut = holes.length > 0 && holes[0][2] < dado + 0.05 && holes[0][3] > dado - 0.02, skirtCut = holes.length > 0 && holes[0][2] < 0.1;
      for (const [za, zb] of railCut ? segs : full) T.box(wood, x, dado - 0.02, za, x + inward * 0.04, dado + 0.05, zb, RAIL);
      for (const [za, zb] of skirtCut ? segs : full) T.box(paint, x, 0, za, x + inward * 0.025, 0.1, zb, "#7a4a2e");
      T.box(paint, x, HY - 0.12, HZ0, x + inward * 0.05, HY, HZ1, TRIM);
    };
    const endWall = (T: Bat, z: number, inward: number) => {
      T.add(wallZ(HX0, HX1, 0, dado, z), panel, undefined, DADO); T.add(wallZ(HX0, HX1, dado, HY, z), plaster, undefined, WALL);
      T.box(wood, HX0, dado - 0.02, z, HX1, dado + 0.05, z + inward * 0.04, RAIL); T.box(paint, HX0, 0, z, HX1, 0.1, z + inward * 0.025, "#7a4a2e");
      T.box(paint, HX0, HY - 0.12, z, HX1, HY, z + inward * 0.05, TRIM);
    };
    // LEFT wall with the window strip (casts: the stripes on the cards)
    {
      const hole = [[WIN.z0, WIN.z1, WIN.y0, WIN.y1]];
      sideWall(bn, bnc, HX0, hole, 1);
      const xo = HX0 - 0.32;
      bnc.box(paint, xo, WIN.y0 - 0.32, WIN.z0 - 0.02, HX0 + 0.14, WIN.y0, WIN.z1 + 0.02, TRIM);                // sill + reveal
      bnc.box(paint, xo, WIN.y1, WIN.z0, HX0, WIN.y1 + 0.3, WIN.z1, TRIM);                                     // head reveal
      for (let k = 0; k <= WIN.bays; k++) { const z = WIN.z0 + k * BAYW; bnc.box(paint, xo, WIN.y0, z - WIN.pier, HX0 + 0.02, WIN.y1, z + WIN.pier, TRIM); }
      for (let k = 0; k < WIN.bays; k++) {
        const zc = WIN.z0 + (k + 0.5) * BAYW;
        // window frames outside the slats (a mullion + a transom per bay)
        bn.box(metal, xo + 0.05, WIN.y0, zc - 0.02, xo + 0.09, WIN.y1, zc + 0.02, "#f4f0e8");
        bn.box(metal, xo + 0.05, 2.75, zc - BAYW / 2 + WIN.pier, xo + 0.09, 2.8, zc + BAYW / 2 - WIN.pier, "#f4f0e8");
        // the blinds' head rail + a pull cord with a tassel; ladder strings
        bnc.box(gloss, HX0 + 0.04, WIN.y1 - 0.06, zc - BAYW / 2 + WIN.pier + 0.01, HX0 + 0.16, WIN.y1, zc + BAYW / 2 - WIN.pier - 0.01, "#f6f4ee");
        bn.rod(plain, V3(HX0 + 0.165, WIN.y1 - 0.05, zc + BAYW / 2 - WIN.pier - 0.08), V3(HX0 + 0.165, 1.55, zc + BAYW / 2 - WIN.pier - 0.08), 0.004, 4, "#e8e4da");
        bn.add(new THREE.ConeGeometry(0.016, 0.05, 8), gloss, TRS(HX0 + 0.165, 1.53, zc + BAYW / 2 - WIN.pier - 0.08), "#e8e4da");
        for (const s of [-0.3, 0.3]) for (const dx of [0.05, 0.15]) bn.rod(plain, V3(HX0 + dx, WIN.y1 - 0.06, zc + s * BAYW), V3(HX0 + dx, WIN.y0 + 0.02, zc + s * BAYW), 0.002, 3, "#f0ece4");
        // radiator under the sill
        const rz0 = zc - 0.55, rz1 = zc + 0.55;
        for (let i = 0; i < 12; i++) { const z = rz0 + (i + 0.5) * ((rz1 - rz0) / 12); bn.rbox(gloss, 0.09, 0.5, 0.065, 0.025, TRS(HX0 + 0.12, 0.38, z), "#f2efe6"); }
        bn.rod(metal, V3(HX0 + 0.12, 0.16, rz0 - 0.04), V3(HX0 + 0.12, 0.16, rz1 + 0.04), 0.018, 8, "#e4e0d6");
        bn.rod(metal, V3(HX0 + 0.12, 0.16, rz0 - 0.04), V3(HX0 + 0.12, 0.0, rz0 - 0.04), 0.014, 6, "#c8c4ba");
      }
      this.outMat = imat(S, { map: outsideTex(), emap: true, em: [1.3, 1.3, 1.3] });
      const og = new THREE.Mesh(new THREE.PlaneGeometry(WIN.z1 - WIN.z0 + 3, WIN.y1 - WIN.y0 + 1.4), this.outMat);
      (og.geometry as THREE.BufferGeometry).setAttribute("color", new THREE.Float32BufferAttribute(new Array(4 * 3).fill(1), 3));
      og.rotation.y = Math.PI / 2; og.position.set(HX0 - 1.6, WCY + 0.2, WCZ); og.layers.set(NOINK); og.frustumCulled = false; this.negX.add(og);
      // the BLINDS: one instanced slat per (bay, row); tilt per look (update)
      const sg = clean(new THREE.BoxGeometry(0.11, 0.005, BAYW - 2 * WIN.pier - 0.03), new THREE.Color("#fbf8f0"));
      this.slats = new THREE.InstancedMesh(sg, imat(S, { spec: 40, specK: 0.3, self: [0.55, 0.5, 0.42], rim: 0.3 }), WIN.bays * WIN.slats);
      for (let bay = 0; bay < WIN.bays; bay++) for (let k = 0; k < WIN.slats; k++) this.slatInfo.push({ z: WIN.z0 + (bay + 0.5) * BAYW, y: WIN.y0 + (k + 0.5) * PITCH, bay, k });
      this.slats.frustumCulled = false; this.slats.receiveShadow = true; this.slats.layers.set(NOINK); this.negX.add(this.slats); // NOINK: no ink speckle between shut slats (still casts: the shadow map follows the main camera's layers)
    }
    // RIGHT wall: posters, the DOOR, coat hooks + backpacks
    {
      const D = { z0: 3.0, z1: 4.1, y1: 2.2 };
      sideWall(bp, bp, HX1, [[D.z0, D.z1, 0, D.y1]], -1);
      bp.box(wood, HX1 + 0.02, 0, D.z0, HX1 + 0.06, D.y1, D.z1, "#3a7ac8");                                     // door leaf (set back)
      bp.box(paint, HX1 - 0.04, 0, D.z0 - 0.08, HX1 + 0.02, D.y1 + 0.08, D.z0, TRIM); bp.box(paint, HX1 - 0.04, 0, D.z1, HX1 + 0.02, D.y1 + 0.08, D.z1 + 0.08, TRIM);
      bp.box(paint, HX1 - 0.04, D.y1, D.z0, HX1 + 0.02, D.y1 + 0.08, D.z1, TRIM);
      bp.box(gloss, HX1 + 0.01, 1.25, D.z0 + 0.3, HX1 + 0.019, 1.75, D.z0 + 0.62, "#bfe0f4");                   // door window
      bp.rod(metal, V3(HX1 - 0.02, 1.0, D.z1 - 0.12), V3(HX1 - 0.02, 1.0, D.z1 - 0.28), 0.014, 6, "#d8d4ca");
      bp.plane(imat(S, { map: doorSignTex(), self: [0.08, 0.08, 0.08] }), 0.5, 0.25, TRS(HX1 - 0.045, 2.45, (D.z0 + D.z1) / 2, -Math.PI / 2));
      const pm = (k: number) => imat(S, { map: posterTex(k), self: [0.06, 0.06, 0.06], spec: 30, specK: 0.15 });
      const poster = (k: number, z: number, y: number, w: number, rot: number) => { bp.plane(pm(k), w, (w * 4) / 3, MM(TRS(HX1 - 0.006, y, z, -Math.PI / 2), TRS(0, 0, 0, 0, 0, rot))); };
      poster(0, -3.2, 2.25, 1.1, 0.0); poster(1, -1.3, 2.2, 0.9, 0.02); poster(2, 0.5, 2.25, 1.0, -0.015);
      bp.box(wood, HX1 - 0.03, 1.55, 1.3, HX1, 1.65, 2.75, "#a8643a");
      const bags = ["#e8343c", "#3a8ae8", "#ffb03a", "#7ad07a"];
      for (let i = 0; i < 4; i++) {
        const z = 1.45 + i * 0.37;
        bp.rod(metal, V3(HX1 - 0.03, 1.6, z), V3(HX1 - 0.12, 1.62, z), 0.012, 6, "#c8c4ba");
        bp.rbox(cloth, 0.2, 0.42, 0.3, 0.08, TRS(HX1 - 0.14, 1.32, z, 0, 0, 0.05 * (i - 1.5)), bags[i], 3);
        bp.rbox(cloth, 0.07, 0.2, 0.24, 0.035, TRS(HX1 - 0.27, 1.24, z), bags[(i + 2) % 4], 2);
      }
    }
    // FRONT wall: BLACKBOARD + chalk tray, the CLOCK, a pennant string, a cupboard with a globe
    {
      endWall(bf, HZ0, 1);
      const z = HZ0;
      bf.box(wood, -2.12, 0.92, z, 2.12, 2.62, z + 0.04, "#a8643a");
      bf.plane(imat(S, { map: boardTex(), self: [0.05, 0.05, 0.05] }), 4.0, 1.5, TRS(0, 1.77, z + 0.045));
      bf.box(wood, -2.12, 0.95, z, 2.12, 0.99, z + 0.12, "#a8643a");
      for (const [x, col] of [[-1.2, "#ffffff"], [-1.08, "#ffe28a"], [0.9, "#ffb8c8"]] as [number, string][]) bf.rod(plain, V3(x, 1.0, z + 0.08), V3(x + 0.08, 1.0, z + 0.07), 0.008, 6, col);
      bf.rbox(cloth, 0.14, 0.04, 0.06, 0.015, TRS(1.4, 1.01, z + 0.08), "#3a3a4a");
      const C = CLOCK.c, cz = C[2] - HALL[2];
      bf.cyl(gloss, CLOCK.r + 0.05, CLOCK.r + 0.05, 0.06, 48, TRS(0, C[1], cz - 0.03, 0, Math.PI / 2), "#e8343c");
      bf.torus(gloss, CLOCK.r + 0.03, 0.035, TRS(0, C[1], cz + 0.008), "#e8343c", Math.PI * 2, 12);
      bf.add(new THREE.CircleGeometry(CLOCK.r, 48), imat(S, { map: clockFaceTex(), self: [0.14, 0.14, 0.14] }), TRS(0, C[1], cz + 0.003));
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V3(HX0 + 0.2 + (HX1 - HX0 - 0.4) * u, 4.12 - 0.22 * Math.sin(u * Math.PI), z + 0.12)); }
      bf.tube(plain, pts, 0.005, 60, "#3a3a4a", 4);
      const pc = ["#ff4a3a", "#ffd23a", "#3a8ae8", "#7ad07a", "#ff8ab4"];
      for (let i = 0; i < 20; i++) {
        if (Math.abs(pts[i].x) < 0.75) continue;
        const a = pts[i], c = pts[i + 1], sh = new THREE.Shape(), dx = c.x - a.x, dy = c.y - a.y;
        sh.moveTo(0, 0); sh.lineTo(dx * 0.85, dy * 0.85); sh.lineTo(dx * 0.42, dy * 0.42 - 0.2); sh.lineTo(0, 0);
        bf.add(new THREE.ShapeGeometry(sh), cloth, TRS(a.x + dx * 0.07, a.y + dy * 0.07, a.z), pc[i % 5]);
      }
      bf.rbox(wood, 0.9, 2.1, 0.5, 0.03, TRS(3.6, 1.05, z + 0.27), "#c8844a", 2);
      bf.box(paint, 3.6 - 0.005, 0.1, z + 0.52, 3.6 + 0.005, 2.0, z + 0.53, "#7a4a2e");
      for (const s of [-1, 1]) bf.sph(metal, TRS(3.6 + s * 0.06, 1.1, z + 0.54, 0, 0, 0, 0.02), 8, "#e8d07a");
      bf.cyl(metal, 0.09, 0.12, 0.05, 16, TRS(3.6, 2.125, z + 0.27), "#3a3a4a");
      bf.rod(metal, V3(3.6, 2.15, z + 0.27), V3(3.6, 2.3, z + 0.27), 0.012, 6, "#3a3a4a");
      bf.sph(gloss, TRS(3.6, 2.45, z + 0.27, 0.4, 0.4, 0, 0.19), 20, "#5ab4e8");
      bf.add(lump(0.11, 0.08, 0.09, 7, 0.25, 10, false), gloss, TRS(3.53, 2.5, z + 0.4, 0.3), "#8ad07a");
      bf.add(lump(0.08, 0.06, 0.06, 9, 0.25, 10, false), gloss, TRS(3.7, 2.38, z + 0.42, 1.0), "#8ad07a");
      bf.torus(metal, 0.215, 0.01, TRS(3.6, 2.45, z + 0.27, 0, 0, 0.4), "#c8a24a", Math.PI);
    }
    // BACK wall: the SILENCE banner, bulletin board, TROPHY CABINET, a bench
    {
      endWall(bb, HZ1, -1);
      const z = HZ1;
      const bg = new THREE.PlaneGeometry(3.4, 0.64, 30, 2), bpz = bg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < bpz.count; i++) bpz.setZ(i, 0.02 * Math.sin(bpz.getX(i) * 4) * (0.35 - bpz.getY(i)));
      bg.computeVertexNormals();
      bb.add(bg, imat(S, { map: silenceTex(), self: [0.08, 0.08, 0.08], spec: 30, specK: 0.15 }), TRS(0.1, 2.9, z - 0.05, Math.PI));
      for (const s of [-1, 1]) bb.rod(plain, V3(0.1 + s * 1.65, 3.21, z - 0.05), V3(0.1 + s * 1.75, HY - 0.12, z - 0.01), 0.005, 4, "#3a3a4a");
      bb.box(wood, -4.1, 1.15, z - 0.04, -1.8, 2.65, z, "#8a5a2a");
      bb.plane(imat(S, { map: corkTex(), self: [0.05, 0.05, 0.05] }), 2.3, 1.5, TRS(-2.95, 1.9, z - 0.045, Math.PI));
      const tx0 = 1.0, tx1 = 3.3, ty1 = 2.1, tz0 = z - 0.45;
      bb.box(wood, tx0, 0, tz0, tx1, 0.7, z, "#9a5a2e");
      bb.box(wood, tx0 - 0.03, ty1, tz0 - 0.03, tx1 + 0.03, ty1 + 0.06, z, "#9a5a2e");
      for (const x of [tx0, tx1 - 0.04]) bb.box(wood, x, 0.7, tz0, x + 0.04, ty1, z, "#9a5a2e");
      bb.plane(imat(S, { map: feltTex() }), tx1 - tx0 - 0.08, ty1 - 0.7, TRS((tx0 + tx1) / 2, (ty1 + 0.7) / 2, z - 0.01, Math.PI));
      for (const y of [1.15, 1.6]) bb.box(gloss, tx0 + 0.04, y, tz0 + 0.02, tx1 - 0.04, y + 0.02, z - 0.02, "#e8f4ff");
      const gold = imat(S, { spec: 90, specK: 1.1, rim: 0.3 });
      const cup = (x: number, y: number, s: number, col: string) => {
        bb.box(wood, x - 0.07 * s, y, tz0 + 0.12, x + 0.07 * s, y + 0.06 * s, tz0 + 0.26, "#3a2a2a");
        bb.lathe(gold, ([[0.001, 0], [0.04, 0], [0.012, 0.05], [0.012, 0.1], [0.07, 0.14], [0.08, 0.24], [0.072, 0.26], [0.001, 0.2]] as [number, number][]).map(([r, h]) => [r * s, h * s] as [number, number]), TRS(x, y + 0.06 * s, tz0 + 0.19), 20, col);
        for (const sd of [-1, 1]) bb.torus(gold, 0.035 * s, 0.008 * s, TRS(x + sd * 0.085 * s, y + 0.25 * s, tz0 + 0.19), col, Math.PI * 2, 6);
      };
      cup(1.4, 0.72, 1.2, "#f4c23a"); cup(2.15, 0.72, 1.6, "#f4c23a"); cup(2.9, 0.72, 1.1, "#d8dce8");
      cup(1.5, 1.17, 0.9, "#e89a4a"); cup(2.6, 1.17, 1.0, "#f4c23a");
      bb.sph(gold, TRS(1.95, 1.33, tz0 + 0.2, 0, 0, 0, 0.1), 20, "#f4c23a"); bb.box(wood, 1.87, 1.17, tz0 + 0.12, 2.03, 1.23, tz0 + 0.28, "#3a2a2a");
      for (let i = 0; i < 4; i++) { const x = 1.35 + i * 0.52; bb.cyl(gold, 0.08, 0.08, 0.012, 24, TRS(x, 1.82, tz0 + 0.1, 0, Math.PI / 2 - 0.15), ["#f4c23a", "#d8dce8", "#e89a4a", "#f4c23a"][i]); bb.box(cloth, x - 0.02, 1.9, tz0 + 0.12, x + 0.02, 2.05, tz0 + 0.14, ["#e8343c", "#3a8ae8", "#e8343c", "#7ad07a"][i]); }
      bb.box(metal, tx0, 0.7, tz0 - 0.02, tx1, 0.73, tz0, "#c8a24a"); bb.box(metal, tx0, ty1 - 0.03, tz0 - 0.02, tx1, ty1, tz0, "#c8a24a");
      bb.rbox(wood, 1.4, 0.06, 0.4, 0.02, TRS(-2.7, 0.45, z - 0.3), "#c8844a");
      for (const x of [-3.3, -2.1]) bb.box(metal, x - 0.02, 0, z - 0.45, x + 0.02, 0.42, z - 0.15, "#5a6a8a");
      bb.rbox(cloth, 0.5, 0.3, 0.32, 0.03, TRS(-3.0, 0.63, z - 0.3, 0.1), "#e8c890", 2);
      bb.rbox(cloth, 0.14, 0.1, 0.28, 0.05, TRS(-2.45, 0.53, z - 0.3, 0.6), "#3a8ae8", 2);
    }
    // ---- potted PLANTS in the corners ----
    const plant = (T: Bat, x: number, z: number, s: number, seed: number) => {
      T.lathe(gloss, ([[0.001, 0], [0.16, 0], [0.21, 0.36], [0.23, 0.38], [0.23, 0.42], [0.001, 0.42]] as [number, number][]).map(([r, h]) => [r * s, h * s] as [number, number]), TRS(x, 0, z), 20, "#e86a3a");
      T.torus(gloss, 0.225 * s, 0.02 * s, TRS(x, 0.4 * s, z, 0, Math.PI / 2), "#d85a2a");
      T.add(lump(0.2 * s, 0.05 * s, 0.2 * s, seed, 0.1, 12), plain, TRS(x, 0.4 * s, z), "#5a3a2a");
      // a bushy leafy crown: a central stem and clusters of foliage lumps (palette per plant)
      const pal = [["#4aa848", "#5ab858", "#3a8a3a"], ["#5ab84a", "#7ac85a", "#3f9a3a"]][seed % 2];
      T.rod(leaf, V3(x, 0.4 * s, z), V3(x, 0.75 * s, z), 0.025 * s, 6, "#6a4a2a");
      const n = 7;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + seed, up = ((i * 37) % 10) / 10, rr = (0.17 + 0.05 * up) * s;
        T.add(lump(rr, rr * 0.85, rr, seed * 11 + i, 0.14, 12, false), leaf, TRS(x + Math.cos(a) * 0.2 * s, (0.78 + up * 0.25) * s, z + Math.sin(a) * 0.2 * s, a), pal[i % 3]);
      }
      T.add(lump(0.24 * s, 0.22 * s, 0.24 * s, seed * 13, 0.14, 14, false), leaf, TRS(x, 0.95 * s, z), pal[1]);
      T.add(lump(0.16 * s, 0.15 * s, 0.16 * s, seed * 17, 0.14, 12, false), leaf, TRS(x + 0.03 * s, 1.18 * s, z), pal[0]);
    };
    plant(cast, -4.45, -4.45, 1.3, 1); plant(cast, 3.85, 4.75, 1.4, 2); plant(cast, -4.45, 4.8, 1.2, 3); plant(cast, 2.6, -4.55, 1.0, 4);
    // ---- the 12 DESKS + CHAIRS ----
    {
      const TOP = "#e8c48a", FRAME = "#4a6a9a", SEAT = ["#ff8a3a", "#3aa0e8", "#ffc23a", "#5ac87a"];
      DESKS.forEach((d, i) => {
        const x = d[0] - HALL[0], z = d[2] - HALL[2];
        cast.rbox(wood, 0.66, 0.035, 0.46, 0.012, TRS(x, DESK_TOP_Y - 0.0175, z - 0.35), TOP);
        cast.box(paint, x - 0.3, 0.6, z - 0.56, x + 0.3, 0.615, z - 0.2, "#c8d0dc");
        cast.box(paint, x - 0.3, 0.615, z - 0.56, x + 0.3, 0.68, z - 0.545, "#c8d0dc");
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cast.rod(metal, V3(x + sx * 0.29, 0, z - 0.35 + sz * 0.19), V3(x + sx * 0.29, DESK_TOP_Y - 0.035, z - 0.35 + sz * 0.19), 0.014, 6, FRAME);
        for (const sx of [-1, 1]) cast.rod(metal, V3(x + sx * 0.29, 0.12, z - 0.54), V3(x + sx * 0.29, 0.12, z - 0.16), 0.01, 5, FRAME);
        const sc = SEAT[(i * 3 + Math.floor(i / 4)) % 4], cz = z + 0.04;
        cast.rbox(gloss, 0.4, 0.035, 0.38, 0.03, TRS(x, 0.43, cz), sc, 3);
        cast.rbox(gloss, 0.38, 0.22, 0.03, 0.03, TRS(x, 0.72, cz + 0.22, 0, -0.12), sc, 3);
        for (const sx of [-1, 1]) {
          cast.rod(metal, V3(x + sx * 0.18, 0, cz - 0.17), V3(x + sx * 0.18, 0.41, cz - 0.15), 0.011, 6, FRAME);
          cast.rod(metal, V3(x + sx * 0.18, 0, cz + 0.17), V3(x + sx * 0.18, 0.84, cz + 0.24), 0.011, 6, FRAME);
        }
      });
    }
    // ---- the TEACHER's DESK: top, pedestal, modesty panel, apple, bell, papers, mug, pencil cup; her chair ----
    {
      const T = TEACHER_DESK, cx = T.c[0] - HALL[0], czz = T.c[2] - HALL[2], x0 = cx + T.x0, x1 = cx + T.x1, z0 = czz + (T.z0 + 3.8), z1 = czz + (T.z1 + 3.8), top = T.top;
      cast.rbox(wood, x1 - x0 + 0.06, 0.05, z1 - z0 + 0.06, 0.015, TRS((x0 + x1) / 2, top - 0.025, (z0 + z1) / 2), "#b8743e");
      cast.box(wood, x0, 0.05, z1 - 0.03, x1, top - 0.05, z1, "#9a5a2e");
      cast.box(wood, x0, 0, z0, x0 + 0.04, top - 0.05, z1 - 0.03, "#9a5a2e");
      cast.box(wood, x1 - 0.45, 0, z0, x1, top - 0.05, z1 - 0.03, "#a8643a");
      for (let k = 0; k < 3; k++) { const y = 0.12 + k * 0.22; fu.box(metal, x1 - 0.3, y + 0.08, z0 - 0.012, x1 - 0.15, y + 0.1, z0 - 0.001, "#e8d07a"); }
      const ty = top;
      const A = APPLE_AT, ax = A[0] - HALL[0], az = A[2] - HALL[2];
      fu.add(lump(0.055, 0.05, 0.055, 33, 0.06, 18, false), gloss, TRS(ax, ty + 0.05, az), "#e8303a");
      fu.rod(plain, V3(ax, ty + 0.09, az), V3(ax + 0.008, ty + 0.125, az), 0.004, 4, "#5a3a1a");
      { const lg = new THREE.SphereGeometry(1, 10, 6); lg.scale(0.014, 0.004, 0.03); fu.add(lg, leaf, TRS(ax + 0.02, ty + 0.115, az, 0.6, 0, 0.3), "#5ab858"); }
      const B = BELL_AT, bx = B[0] - HALL[0], bz = B[2] - HALL[2];
      fu.cyl(wood, 0.06, 0.065, 0.025, 24, TRS(bx, ty + 0.0125, bz), "#5a3a2a");
      fu.lathe(metal, [[0.001, 0.075], [0.025, 0.07], [0.045, 0.05], [0.055, 0.02], [0.058, 0.0], [0.001, 0.0]], TRS(bx, ty + 0.025, bz), 24, "#e8c860");
      fu.rod(metal, V3(bx, ty + 0.1, bz), V3(bx, ty + 0.115, bz), 0.004, 6, "#c8c4ba"); fu.cyl(metal, 0.012, 0.012, 0.008, 12, TRS(bx, ty + 0.119, bz), "#c8c4ba");
      for (let k = 0; k < 2; k++) fu.box(paint, -0.15 + k * 0.32 - 0.11, ty, z0 + 0.2, -0.15 + k * 0.32 + 0.11, ty + 0.05 + k * 0.03, z0 + 0.5, "#fbfbf6");
      fu.box(paint, -0.15 - 0.105, ty + 0.05, z0 + 0.25, -0.15 + 0.105, ty + 0.056, z0 + 0.45, "#ffe6e6");
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.1], [0.001, 0.1]], TRS(0.35, ty, z0 + 0.15), 16, "#3a8ae8");
      fu.torus(gloss, 0.025, 0.007, TRS(0.395, ty + 0.05, z0 + 0.15, 0, 0, Math.PI / 2), "#3a8ae8", Math.PI * 2, 6);
      fu.lathe(gloss, [[0.001, 0], [0.035, 0], [0.035, 0.1], [0.001, 0.1]], TRS(-0.75, ty, z0 + 0.15), 12, "#ffc23a");
      for (const [dx, col] of [[-0.012, "#e8343c"], [0.01, "#ffd23a"], [0.0, "#3a8ae8"]] as [number, string][]) fu.rod(plain, V3(-0.75 + dx, ty + 0.05, z0 + 0.15 + dx), V3(-0.75 + dx * 3, ty + 0.17, z0 + 0.15 + dx * 2), 0.005, 6, col);
      fu.rbox(paint, 0.3, 0.04, 0.22, 0.01, TRS(0.72, ty + 0.02, z0 + 0.25, 0.2), "#2a6a3a");
      const cz = z0 - 0.42;
      cast.rbox(cloth, 0.46, 0.08, 0.44, 0.03, TRS(0, 0.48, cz), "#3a3a5a", 2);
      cast.rbox(cloth, 0.44, 0.5, 0.07, 0.03, TRS(0, 0.85, cz - 0.24, 0, 0.08), "#3a3a5a", 2);
      cast.rod(metal, V3(0, 0.07, cz), V3(0, 0.44, cz), 0.025, 8, "#2a2a34");
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; cast.rod(metal, V3(0, 0.07, cz), V3(Math.cos(a) * 0.28, 0.05, cz + Math.sin(a) * 0.28), 0.015, 5, "#2a2a34"); }
    }
    // ---- CEILING: tiles + fluorescent light boxes (on dimly in "hall", off in hush) + the spotlight can ----
    bcc.add(flat(HX0, HZ0, HX1, HZ1, HY), imat(S, { map: ceilTex(), rep: [1 / 2.4, 1 / 2.4] }), undefined, "#f2f4f6");
    this.tubeMat = imat(S, { col: "#000000", em: [1, 1, 1] });
    const tubeG: GlowItem[] = [];
    for (const x of [-2.6, 0, 2.4]) for (const z of [-2.8, 0.2, 3.2]) {
      bc.box(metal, x - 0.32, HY - 0.08, z - 0.62, x + 0.32, HY - 0.001, z + 0.62, "#e8ecf0");
      bc.box(this.tubeMat, x - 0.26, HY - 0.086, z - 0.56, x + 0.26, HY - 0.08, z + 0.56, "#ffffff");
      tubeG.push({ p: V3(x, HY - 0.12, z), c: [0.25, 0.3, 0.34], s: 1.6, g: 0 });
    }
    const SP = V3(0.0, HY - 0.3, 0.6);
    bc.cyl(metal, 0.12, 0.16, 0.3, 20, TRS(SP.x, SP.y + 0.03, SP.z), "#2a2a34");
    bc.rod(metal, V3(SP.x, SP.y + 0.18, SP.z), V3(SP.x, HY, SP.z), 0.02, 6, "#2a2a34");
    this.spotLens = imat(S, { col: "#000000", em: [0, 0, 0] });
    bc.cyl(this.spotLens, 0.135, 0.135, 0.01, 20, TRS(SP.x, SP.y - 0.125, SP.z), "#ffffff");
    b.build(R); fu.build(R); cast.build(R, true);
    bp.build(this.posX); bf.build(this.front); bb.build(this.back); bc.build(this.ceil);
    bn.build(this.negX);
    // casters (only when the world sun matches HALL_SUN): the left wall, its reveals + head rails, the ceiling
    this.wallCasters = bnc.build(this.negX);
    this.casters.push(...this.wallCasters, ...bcc.build(this.ceil));
    const shMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shMat);
      m.rotation.y = Math.PI / 2; m.castShadow = true; m.receiveShadow = false; m.layers.set(NOINK); m.visible = false;
      this.shutter.push(m); R.add(m);
    }
    this.glows = new Glows(R, tubeG, 0.6);
    this.beam = new Beam(R, V3(SP.x, SP.y - 0.13, SP.z), 0.13, 0.95);
    this.spotTop = SP;
    const keeps = [
      { a: V3(HALL[0], 0.5, HALL[2]), h: 0.9, r0: 0.28, r1: 0.6 },          // BEAN (his face)
      { a: V3(HALL[0], 0.6, HALL[2] - 4.4), h: 1.2, r0: 0.3, r1: 0.7 },     // the teacher
    ];
    this.haze = new Haze(R, S, keeps);
    this.motes = new Motes(R, S, 1100, 91, [HX0 + 0.15, 0.3, -4.6, 3.2, 3.9, 4.8], keeps);
    const C = CLOCK.c, handMat = imat(S, { spec: 50, specK: 0.4, self: [0.1, 0.1, 0.1] });
    const hand = (len: number, w: number, tail: number, col: string, zoff: number) => {
      const g = clean(new THREE.BoxGeometry(w, len + tail, 0.01), new THREE.Color(col)); g.translate(0, (len - tail) / 2, 0);
      const m = new THREE.Mesh(g, handMat); m.position.set(0, C[1] - HALL[1], C[2] - HALL[2] + zoff); m.frustumCulled = false; m.receiveShadow = true; this.front.add(m); return m;
    };
    this.hands = { h: hand(0.22, 0.045, 0.05, "#1a1a24", 0.02), m: hand(0.34, 0.03, 0.06, "#1a1a24", 0.035), s: hand(0.36, 0.012, 0.09, "#e8343c", 0.05) };
    const cap = new THREE.Mesh(clean(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), new THREE.Color("#e8343c")), handMat);
    cap.rotation.x = Math.PI / 2; cap.position.set(0, C[1] - HALL[1], C[2] - HALL[2] + 0.062); this.front.add(cap);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  spotTop: THREE.Vector3;
  /** tilt the slats: blind 0 = all half-open; 1 = shut except the gap rows (open within gapH of GAP.yc in GAP.bay) */
  private setSlats(blind: number, gapH: number) {
    const key = blind.toFixed(3) + "/" + gapH.toFixed(3);
    if (key === this.lastSlat) return;
    this.lastSlat = key;
    const m = new THREE.Matrix4(), OPEN = -0.84, SHUT = -1.45;
    this.slatInfo.forEach((s, i) => {
      const open = s.bay === GAP.bay ? clamp01((gapH - Math.abs(s.y - GAP.yc)) / PITCH + 0.5) : 0;
      const tilt = OPEN + (SHUT * (1 - open) - OPEN) * blind;   // the open gap slats go edge-on (0)
      m.compose(V3(HX0 + 0.1, s.y, s.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, tilt)), V3(1, 1, 1));
      this.slats.setMatrixAt(i, m);
    });
    this.slats.instanceMatrix.needsUpdate = true;
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), sd = HALL_SUN;
    // does the world sun (cards' shadow map) agree with ours? then the walls + blinds cast, and the set uses the map
    const match = worldSun(id).angleTo(sd) < THREE.MathUtils.degToRad(4);
    S.u.uMapK.value = match ? 1 : 0;
    const shut = id === 5 && match; // (QA2) shot 5: the shutter casts the one clean stripe (see shutter)
    for (const m of this.casters) m.castShadow = match && !(shut && this.wallCasters.includes(m));
    this.slats.castShadow = match && !shut;
    if (shut) {
      const gh = 0.8 * rg.gapH, y0 = GAP.yc - gh, y1 = GAP.yc + gh, z0 = WIN.z0 + GAP.bay * BAYW + WIN.pier / 2, z1 = WIN.z0 + (GAP.bay + 1) * BAYW + 0.4;
      const X = HX0 - 0.25, Z0 = -7, Z1 = 8, Y0 = -2, Y1 = 7;
      const rects = [[Z0, Z1, Y0, y0], [Z0, Z1, y1, Y1], [Z0, z0, y0, y1], [z1, Z1, y0, y1]];
      rects.forEach(([a, b, c, d], i) => { const m = this.shutter[i]; m.visible = true; m.position.set(X, (c + d) / 2, (a + b) / 2); m.scale.set(b - a, d - c, 1); });
    } else for (const m of this.shutter) m.visible = false;
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun); S.u.uOpen.value = 0;
    (S.u.uWC.value as THREE.Vector3).set(O.x + HX0, O.y + WCY, O.z + WCZ);
    (S.u.uWN.value as THREE.Vector3).set(1, 0, 0); (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((WIN.z1 - WIN.z0) / 2, (WIN.y1 - WIN.y0) / 2);
    (S.u.uWM.value as THREE.Vector4).set(WIN.bays, WIN.slats, WIN.pier + 0.015, PITCH * 0.27);
    (S.u.uSl.value as THREE.Vector4).set(GAP.zc - WCZ, GAP.yc - WCY, BAYW / 2 - WIN.pier, Math.max(0.004, rg.gapH));
    S.u.uSlK.value = rg.blind;
    this.setSlats(rg.blind, rg.gapH);
    (S.u.uO.value as THREE.Vector3).set(O.x, O.y, O.z); (S.u.uBox.value as THREE.Vector4).set((HX1 - HX0) / 2, HZ0, HY, (HX0 + HX1) / 2); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uFogCap.value = 0.5;
    // the peak SPOT (overhead, a pool around BEAN)
    const sp = W2(this.spotTop.x, this.spotTop.y - 0.13, this.spotTop.z), tgt = W2(0, 0, -0.05);
    const dir = tgt.clone().sub(sp), dl = dir.length(); dir.normalize();
    const ang = Math.atan2(rg.spotR, dl);
    (S.u.uSpP.value as THREE.Vector4).set(sp.x, sp.y, sp.z, Math.cos(ang)); (S.u.uSpD.value as THREE.Vector3).copy(dir); (S.u.uSpC.value as THREE.Vector3).set(...rg.spot);
    const pk = rg.beam;
    this.beam.mesh.quaternion.setFromUnitVectors(V3(0, 1, 0), dir.clone().negate());
    this.beam.mesh.position.set(sp.x - O.x, sp.y - O.y, sp.z - O.z); this.beam.mesh.translateY(-dl);
    (this.beam.mat.uniforms.uC.value as THREE.Vector3).set(0.13 * pk, 0.085 * pk, 0.045 * pk); this.beam.mesh.visible = pk > 0.01;
    (this.spotLens.uniforms.uEm.value as THREE.Vector3).set(0.1 + 6 * pk, 0.1 + 4.6 * pk, 0.1 + 2.6 * pk);
    const tb = rg.tubes;
    setLights(S, [
      { p: W2(-1.0, 0.4, -0.2), c: rg.bounce, r: 2.6 },                                  // sun bounce off the bright floor stripes
      { p: W2(HX0 + 0.7, 2.3, -1.5), c: [rg.bounce[0] * 0.7, rg.bounce[1] * 0.75, rg.bounce[2] * 0.9], r: 3.0 }, // window glow
      { p: W2(HX0 + 0.7, 2.3, 2.5), c: [rg.bounce[0] * 0.7, rg.bounce[1] * 0.75, rg.bounce[2] * 0.9], r: 3.0 },
      { p: W2(0.5, 2.0, 4.6), c: rg.fill, r: 4.5 },                                      // cool fill from the back
      { p: W2(0.5, 2.0, -4.2), c: rg.fill, r: 4.5 },                                     // cool fill from the front
      { p: W2(0, 3.6, 0.2), c: [0.22 * tb, 0.25 * tb, 0.28 * tb], r: 3.5 },              // the ceiling tubes
      { p: W2(-2.6, 3.6, -2.8), c: [0.2 * tb, 0.23 * tb, 0.26 * tb], r: 3.0 },
      { p: W2(2.4, 3.6, 3.2), c: [0.2 * tb, 0.23 * tb, 0.26 * tb], r: 3.0 },
      { p: W2(0, 0.3, 0.6), c: [rg.spot[0] * 0.06, rg.spot[1] * 0.045, rg.spot[2] * 0.03], r: 1.8 }, // the spot's warm floor bounce
    ], rg.au, rg.ad);
    (this.outMat.uniforms.uEm.value as THREE.Vector3).set(1.25 * rg.outK, 1.3 * rg.outK, 1.4 * rg.outK);
    ((this.slats.material as THREE.ShaderMaterial).uniforms.uSelf.value as THREE.Vector3).set(0.55 * rg.outK, 0.5 * rg.outK, 0.42 * rg.outK);
    (this.tubeMat.uniforms.uEm.value as THREE.Vector3).set(0.1 + 2.6 * tb, 0.12 + 2.7 * tb, 0.15 + 2.8 * tb);
    this.glows.gk.set(tb, 0, 0, 0); this.glows.mat.uniforms.uT.value = t; this.glows.mesh.visible = tb > 0.01;
    this.haze.set(V3(HX0, WCY, WCZ), V3(0, 0, 1), V3(0, 1, 0), (WIN.z1 - WIN.z0) / 2, (WIN.y1 - WIN.y0) / 2, sd.clone().negate(), 11, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    const ck = clockAt(id, t), TAU = Math.PI * 2;
    this.hands.s.rotation.z = -(ck.s / 60) * TAU;
    this.hands.m.rotation.z = -(ck.m / 60) * TAU;
    this.hands.h.rotation.z = -((ck.h + ck.m / 60) / 12) * TAU;
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > HX0 + 0.05; this.posX.visible = c.x < HX1 - 0.05; this.front.visible = c.z > HZ0 + 0.05; this.back.visible = c.z < HZ1 - 0.05; this.ceil.visible = c.y < HY - 0.05;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
/** per shot: [px, py, pz, lx, ly, lz, fov] (local) */
const DEBUG_VIEW: Record<number, number[]> = { 1: [0.5, 1.15, -1.5, 0.0, 0.8, -0.2, 40], 5: [0.9, 1.35, -1.9, -0.3, 0.75, 0.2, 45] };
export class Sets {
  root = new THREE.Group();
  private hall = new Hall();
  constructor() { this.root.add(this.hall.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && place === "hall" && DEBUG_VIEW[id]) {
      const o: SV3 = HALL, d = DEBUG_VIEW[id];
      cam.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); cam.up.set(0, 1, 0); cam.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    this.hall.root.visible = place === "hall";
    if (this.hall.root.visible) this.hall.update(id, t, f, cam);
  }
}
