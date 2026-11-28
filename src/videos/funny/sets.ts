// OWNER: sets agent. "Live Wire": the sunny family HALLWAY (+ the yellow KITCHEN behind its doorway; shots 1, 3, 6) and
// the dusty anatomy MUSEUM (shot 5). Layout (see the story.ts header): HALL = (0,0,0), MUSEUM = (2000,0,0).
//
// Each place lights itself with its OWN shader rig (sets_kit.ts imat; technique growl/sets.ts): the low sun reaches a
// surface only if its ray toward the sun passes a window aperture (analytic, per pixel: bays + piers, arched tops,
// glazing bars, the sill plant's leaves), so the sun lays sharp window-shaped stripes on floors and walls; the rest sits
// in a blue sky ambient + warm bounce point lights.
//   HALL   sun HALL_SUN through the END window (x +5, 2 x 3 panes, a potted plant on the sill): long honey stripes down
//          the floorboards toward -x that reach the back wall + the doorway (the LEFT jamb's dented, band-aided corner
//          catches the light) and spill through the door onto the kitchen tiles (DOOR CHAIN: kitchen points see the
//          hall window only through the doorway). The KITCHEN gets its own sun through its right-hand window + warm
//          fills, so the doorway glows sunny yellow behind BEAN.
//   MUSEUM sun MU_SUN through the three tall ARCHED windows in the right wall (x +3.5, glazing bars): long amber beams
//          across the parquet, over SKELLY's plinth, onto the green portrait wall; brass picture lights, a skylight.
// Looks: rigs per look mirror looks.ts (hall / peak (electric-blue key, navy shade) / hallend (lower, cooler) /
// museum / pun (the room dims, a stage spot pools round the plinth)), blended through LOOK_RAMPS like world.ts.
// SUN MATCH: when the world sun (looks.ts sunAz/sunEl for the shot) is within 4 deg of the rig sun, the set uses the
// world shadow map (cards + small furniture cast long shadows inside the window stripes) and the furniture casts;
// otherwise the set stays analytic. hallSunAz() / muSunAz() = the looks sunAz that makes them match (el = *_SUN_EL).
// Walls never cast into the world map (the cards stay lit).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { SHOTS, HALL, MUSEUM, V3, LOOK_RAMPS, Look, smooth, camAt, SUN_FROM } from "./story";
import { LOOKS } from "./looks";
import { V3 as v3, C3, Bat, TRS, MM, flat, wallZ, wallX, lump, LSet, lset, imat, setLights, setAperture, mixRec, Glows, GlowItem } from "./sets_kit";
import * as TX from "./sets_tex";

const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
// ---------------- CONTRACTS (world metres) ----------------
/** the kitchen doorway in the hallway's back wall: opening x -0.45..+0.45 (local), height 2.05, wall plane z -1.4
 *  (0.12 thick: front face z -1.34). JAMB_HIT = the left jamb's front edge at elbow height (BEAN's elbow BONK point). */
export const DOOR = { x0: -0.45, x1: 0.45, h: 2.05, z: -1.4, t: 0.12 };
export const JAMB_HIT: V3 = at(HALL, -0.45, 0.88, -1.34);
/** windows (for lightfx.ts beams): centre, width, height, inward normal */
export type Win = { place: "hall" | "museum"; c: V3; w: number; h: number; n: V3 };
export const WINDOWS: Win[] = [
  { place: "hall", c: at(HALL, 5.0, 1.45, -0.4), w: 1.1, h: 1.7, n: [-1, 0, 0] },  // the END window: low morning sun down the hall
  ...[-1.2, -3.0, -4.8].map((z): Win => ({ place: "museum", c: at(MUSEUM, 3.5, 2.1, z), w: 1.2, h: 2.6, n: [-1, 0, 0] })),
];
/** museum: the skeleton plinth (top surface centre) */
export const PLINTH_TOP: V3 = at(MUSEUM, 0, 0.18, 0);
/** museum: portrait slots on the LEFT wall (wall face x -3.4): canvas CENTRE (2 cm off the wall), size (m), year.
 *  The frames are yours (sets); the painted faces inside are cast cards (they animate: they laugh). */
export const PORTRAITS: { c: V3; w: number; h: number; year: string }[] = [
  { c: at(MUSEUM, -3.37, 1.75, -0.6), w: 0.72, h: 0.95, year: "1840" },
  { c: at(MUSEUM, -3.37, 1.75, -2.2), w: 0.72, h: 0.95, year: "1900" },
  { c: at(MUSEUM, -3.37, 1.75, -3.8), w: 0.72, h: 0.95, year: "1950" },
  { c: at(MUSEUM, -3.37, 1.75, -5.4), w: 0.72, h: 0.95, year: "2026" },
];
export const MU_WALL_X = -3.4;

// ---------------- the rig suns (world, unit, toward the sun) ----------------
/** b = bearing from +x toward +z (deg), el = elevation (deg) */
const sunVec = (b: number, el: number) => { const B = THREE.MathUtils.degToRad(b), E = THREE.MathUtils.degToRad(el); return v3(Math.cos(E) * Math.cos(B), Math.sin(E), Math.cos(E) * Math.sin(B)).normalize(); };
/** hallway: from the END window (+x), a little from the front (+z): the beam drifts toward the back wall + doorway */
export const HALL_SUN_EL = 12;
export const HALL_SUN = sunVec(7, HALL_SUN_EL);       // == looks.ts HALL_SUN_BEARING 7, el 12
/** museum: from the right windows (+x), a little from the back (-z): the beams fall forward over the plinth */
export const MU_SUN_EL = 15;
export const MU_SUN = sunVec(-18.5, MU_SUN_EL);      // == looks.ts MUSEUM_SUN_BEARING -18.5, el 15
const meanView = (id: number) => {
  const s = SHOTS[id - 1];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1;
  return [fx / n, fz / n];
};
const azFor = (id: number, S: THREE.Vector3) => {
  const [fx, fz] = meanView(id), h = Math.hypot(S.x, S.z), hx = S.x / h, hz = S.z / h;
  return THREE.MathUtils.radToDeg(Math.atan2(fx * hz - fz * hx, fx * hx + fz * hz));
};
/** the looks.ts sunAz (deg) for the hall looks (hall / peak / hallend: shot 1's view, SUN_FROM 3:1, 6:1) that makes the
 *  world sun == HALL_SUN (with sunEl = HALL_SUN_EL) */
export const hallSunAz = () => azFor(1, HALL_SUN);
/** the looks.ts sunAz for museum / pun (shot 5's view) that makes the world sun == MU_SUN (sunEl = MU_SUN_EL) */
export const muSunAz = () => azFor(5, MU_SUN);
const wsCache = new Map<string, THREE.Vector3>();
/** the world's sun for a shot (same formula as world.shotSun) */
const worldSun = (id: number, look: Look) => {
  const key = id + look;
  let v = wsCache.get(key);
  if (v) return v;
  const L = LOOKS[look], [fx, fz] = meanView(SUN_FROM[id] ?? id);
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = v3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  wsCache.set(key, v);
  return v;
};

// ---------------- rigs per look ----------------
type Rig = { au: C3; ad: C3; sun: C3; bounce: C3; fill: C3; kfill: C3; lamp: number; outK: number; spot: C3 };
const R0: Rig = { au: [0, 0, 0], ad: [0, 0, 0], sun: [0, 0, 0], bounce: [0, 0, 0], fill: [0, 0, 0], kfill: [0, 0, 0], lamp: 0, outK: 1, spot: [0, 0, 0] };
const RIGS: Record<Look, Rig> = {
  // warm honey morning sun, clear blue shade, a glowing yellow kitchen
  hall: { ...R0, au: [0.4, 0.48, 0.72], ad: [0.3, 0.25, 0.22], sun: [3.5, 2.6, 1.55], bounce: [0.34, 0.23, 0.11], fill: [0.07, 0.09, 0.15], kfill: [0.62, 0.5, 0.26], lamp: 0.15, outK: 1.0 },
  // THE PEAK: a hard electric-blue key down the hall, the house drops into navy
  peak: { ...R0, au: [0.06, 0.1, 0.3], ad: [0.03, 0.035, 0.11], sun: [1.3, 2.6, 5.0], bounce: [0.05, 0.16, 0.4], fill: [0.02, 0.04, 0.14], kfill: [0.06, 0.12, 0.34], lamp: 0.0, outK: 0.35 },
  // the end: lower, cooler, flatter (deadpan)
  hallend: { ...R0, au: [0.36, 0.43, 0.66], ad: [0.22, 0.2, 0.21], sun: [2.5, 2.0, 1.5], bounce: [0.2, 0.16, 0.11], fill: [0.08, 0.1, 0.15], kfill: [0.4, 0.35, 0.24], lamp: 0.1, outK: 0.85 },
  // dusty amber late afternoon
  museum: { ...R0, au: [0.36, 0.38, 0.56], ad: [0.3, 0.22, 0.15], sun: [3.7, 2.6, 1.35], bounce: [0.4, 0.25, 0.1], fill: [0.08, 0.08, 0.13], kfill: [0.42, 0.3, 0.16], lamp: 1.0, outK: 1.0 },
  // HUMOROUS: the house lights go down, a stage spot on the plinth
  pun: { ...R0, au: [0.07, 0.07, 0.13], ad: [0.05, 0.035, 0.035], sun: [0.8, 0.5, 0.26], bounce: [0.06, 0.04, 0.02], fill: [0.02, 0.02, 0.04], kfill: [0.08, 0.06, 0.04], lamp: 0.3, outK: 0.3, spot: [3.4, 2.7, 1.6] },
  arm: R0, skin: R0, zap: R0, town: R0,
};
/** the rig for this frame: the shot's look, blended through LOOK_RAMPS exactly like world.lookAt */
const rigAt = (id: number, f: number): Rig => {
  const s = SHOTS[id - 1];
  let R = RIGS[s.look];
  for (const r of LOOK_RAMPS) {
    if (r[4] !== s.place || f < r[2]) continue;
    const g = smooth((f - r[2]) / Math.max(1, r[3] - r[2]));
    if (r[2] >= s.a && r[2] < s.b) R = mixRec(R, RIGS[r[1]], g);
    else if (s.look === r[1] && s.a > r[2] && s.a <= r[3]) R = mixRec(RIGS[r[0]], R, g);
  }
  return R;
};

// ---------------- helpers ----------------
const emissive = (parent: THREE.Object3D, tex: THREE.Texture, w: number, h: number, mx: THREE.Matrix4, k: number) => {
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(k, k, k), fog: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.applyMatrix4(mx); m.layers.set(NOINK); m.frustumCulled = false; parent.add(m); return mat;
};
/** an outline (u, v) polyline of an arched opening: bottom-left -> bottom-right -> up -> arc -> down (ccw) */
const archPts = (u0: number, u1: number, v0: number, v1: number, seg = 16) => {
  const r = (u1 - u0) / 2, cu = (u0 + u1) / 2, vt = v1 - r, pts: THREE.Vector2[] = [new THREE.Vector2(u0, v0), new THREE.Vector2(u1, v0)];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI; pts.push(new THREE.Vector2(cu + Math.cos(a) * r, vt + Math.sin(a) * r)); }
  return pts;
};
/** a wall in the (u, v) plane with ARCHED / rect holes (outlines, ccw); uv = (u, v) metres; mapped by toW */
const shapeWall = (u0: number, u1: number, v0: number, v1: number, holes: THREE.Vector2[][], toW: (u: number, v: number) => THREE.Vector3) => {
  const sh = new THREE.Shape([new THREE.Vector2(u0, v0), new THREE.Vector2(u1, v0), new THREE.Vector2(u1, v1), new THREE.Vector2(u0, v1)]);
  for (const h of holes) sh.holes.push(new THREE.Path([...h].reverse()));
  const g = new THREE.ShapeGeometry(sh, 12), p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i), w = toW(u, v); uv.setXY(i, u, v); p.setXYZ(i, w.x, w.y, w.z); }
  g.computeVertexNormals();
  return g;
};
/** the reveal (jamb surfaces) of an opening outline, extruded between two depths (d0 -> d1 along the wall normal) */
const reveal = (pts: THREE.Vector2[], d0: number, d1: number, toW: (u: number, v: number, d: number) => THREE.Vector3, closed = false) => {
  const pos: number[] = [], uv: number[] = [];
  const n = closed ? pts.length : pts.length - 1;
  let L = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], la = L; L += a.distanceTo(b);
    const A0 = toW(a.x, a.y, d0), A1 = toW(a.x, a.y, d1), B0 = toW(b.x, b.y, d0), B1 = toW(b.x, b.y, d1);
    for (const [P, U, V] of [[A0, la, 0], [B0, L, 0], [B1, L, 1], [A0, la, 0], [B1, L, 1], [A1, la, 1]] as [THREE.Vector3, number, number][]) { pos.push(P.x, P.y, P.z); uv.push(U, V * Math.abs(d1 - d0)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
};
/** a sagging velvet rope between two points */
const sag = (a: THREE.Vector3, b: THREE.Vector3, d: number, n = 12) => Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return a.clone().lerp(b, u).add(v3(0, -d * 4 * u * (1 - u), 0)); });
const LEAFC = ["#4aa848", "#5ab858", "#3a8a3a"];

// ============================================================================ HALLWAY (+ kitchen)
// hall box (local): x -4..5, z -1.34 (back wall face) .. 2.4, floor 0, ceiling 2.6. Kitchen: x -1.9..1.9, z -3.8..-1.46, ceiling 2.5.
const HX0 = -4, HX1 = 5, HZB = -1.34, HZK = -1.46, HZF = 2.4, HY = 2.6;
const KX0 = -1.9, KX1 = 1.9, KZ0 = -3.8, KY = 2.5;
const EW = { z0: -0.95, z1: 0.15, y0: 0.6, y1: 2.3 };   // the END window opening (x = HX1); WINDOWS[0]
const KW = { z0: -3.15, z1: -2.05, y0: 0.95, y1: 2.05 }; // the kitchen's sun window (right wall x = KX1)
const KB = { x0: 0.25, x1: 1.35, y0: 1.05, y1: 2.05 };   // the kitchen's back window over the sink (garden view)
/** the potted plant on the END window sill: leaf blobs in window coords (u = z - zc, v = y - yc, r) */
const LEAVES: [number, number, number][] = [[0.3, -0.62, 0.085], [0.2, -0.55, 0.07], [0.4, -0.52, 0.075], [0.3, -0.43, 0.075], [0.19, -0.7, 0.05], [0.42, -0.66, 0.055], [0.33, -0.33, 0.05], [0.25, -0.36, 0.045]];

class Hallway {
  root = new THREE.Group(); S: LSet = lset();
  casters: THREE.Mesh[] = []; glows: Glows; outMats: THREE.MeshBasicMaterial[] = []; lampMat: THREE.ShaderMaterial;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...HALL);
    this.lampMat = imat(S, { col: "#000000", em: [1, 1, 1] });
    const b = new Bat(), fu = new Bat(), cs = new Bat(); // cs = floor furniture that casts into the world map (when matched)
    const boards = imat(S, { map: TX.boardsTex(), rep: [0.5, 0.5], spec: 70, specK: 0.45 });
    const paper = imat(S, { map: TX.paperTex() }), wains = imat(S, { map: TX.wainscotTex(), rep: [1 / 0.6, 1 / 0.9], spec: 30, specK: 0.15 });
    const plaster = imat(S, { map: TX.plasterTex(), rep: [0.5, 0.5] }), paint = imat(S, { spec: 40, specK: 0.22 }), gloss = imat(S, { spec: 70, specK: 0.5 });
    const metal = imat(S, { spec: 90, specK: 0.9 }), wood = imat(S, { spec: 50, specK: 0.3 }), cloth = imat(S, { rim: 0.2 });
    const leaf = imat(S, { spec: 30, specK: 0.25, rim: 0.3 });
    const TRIM = "#fffaf0", CASING = "#fbf8f2";
    // ---------------- floor + runner ----------------
    b.add(flat(HX0, HZB, HX1, HZF, 0), boards);
    b.box(wood, DOOR.x0, 0, HZK, DOOR.x1, 0.012, HZB, "#b07a48");                                   // threshold saddle
    fu.rbox(cloth, 7.4, 0.01, 0.9, 0.004, TRS(0.5, 0.006, -0.62), "#a82a26", 1);
    b.plane(imat(S, { map: TX.runnerTex(), rim: 0.1 }), 7.4, 0.9, MM(TRS(0.5, 0.0115, -0.62), TRS(0, 0, 0, 0, -Math.PI / 2)));
    // ---------------- BACK wall (the doorway) ----------------
    const door = [[DOOR.x0, DOOR.x1, 0, DOOR.h]];
    b.add(wallZ(HX0, HX1, 0, 0.9, HZB, door), wains, undefined, "#f8f4ec");
    b.add(wallZ(HX0, HX1, 0.9, HY, HZB, door), paper);
    b.add(wallZ(KX0, KX1, 0, KY, HZK, door), plaster, undefined, "#ffd667");                         // kitchen side (yellow)
    // the reveal linings + the head soffit (painted white)
    b.box(gloss, DOOR.x0 - 0.02, 0, HZK + 0.005, DOOR.x0, DOOR.h, HZB - 0.005, CASING);
    b.box(gloss, DOOR.x1, 0, HZK + 0.005, DOOR.x1 + 0.02, DOOR.h, HZB - 0.005, CASING);
    b.box(gloss, DOOR.x0 - 0.02, DOOR.h, HZK + 0.005, DOOR.x1 + 0.02, DOOR.h + 0.02, HZB - 0.005, CASING);
    // chunky casings (architrave) + plinth blocks + a head with a cap moulding (hall side); simpler on the kitchen side
    for (const [zc, s] of [[HZB + 0.012, 1], [HZK - 0.012, -1]] as [number, number][]) {
      const d = s > 0 ? 0.034 : 0.024;
      b.rbox(gloss, 0.095, DOOR.h + 0.1, d, 0.008, TRS(DOOR.x0 - 0.0475, (DOOR.h + 0.1) / 2, zc + s * d * 0.2), CASING, 2);
      b.rbox(gloss, 0.095, DOOR.h + 0.1, d, 0.008, TRS(DOOR.x1 + 0.0475, (DOOR.h + 0.1) / 2, zc + s * d * 0.2), CASING, 2);
      b.rbox(gloss, 1.16, 0.12, d + 0.006, 0.01, TRS(0, DOOR.h + 0.1, zc + s * (d * 0.2 + 0.003)), CASING, 2);
      if (s > 0) {
        b.rbox(gloss, 1.22, 0.035, d + 0.026, 0.008, TRS(0, DOOR.h + 0.175, zc + 0.016), CASING, 2);
        for (const x of [DOOR.x0 - 0.05, DOOR.x1 + 0.05]) b.rbox(gloss, 0.11, 0.18, d + 0.012, 0.008, TRS(x, 0.09, zc + 0.012), "#f2eee6", 2);
      }
    }
    // dado rail, skirting, cornice (hall side; broken by the casings)
    for (const [x0, x1] of [[HX0, DOOR.x0 - 0.095], [DOOR.x1 + 0.095, HX1]]) {
      b.rbox(wood, x1 - x0, 0.055, 0.03, 0.01, TRS((x0 + x1) / 2, 0.915, HZB + 0.012), TRIM, 2);
      b.rbox(paint, x1 - x0, 0.13, 0.022, 0.006, TRS((x0 + x1) / 2, 0.065, HZB + 0.008), TRIM, 2);
    }
    b.rbox(paint, HX1 - HX0, 0.1, 0.06, 0.01, TRS((HX0 + HX1) / 2, HY - 0.05, HZB + 0.025), TRIM, 2);
    // the LEFT jamb: previous victims: dents + chips (decals), pencil tally, a band-aid on the corner (ha)
    {
      const dents = imat(S, { map: TX.dentTex(), cut: true, spec: 40, specK: 0.2 });
      b.plane(dents, 0.11, 0.3, TRS(DOOR.x0 + 0.0015, 0.9, HZB - 0.058, Math.PI / 2), CASING);       // on the reveal (faces +x)
      b.plane(dents, 0.08, 0.3, TRS(DOOR.x0 - 0.045, 0.92, HZB + 0.0315), CASING);                    // on the casing front
      b.plane(imat(S, { map: TX.tallyTex(), cut: true }), 0.075, 0.15, TRS(DOOR.x0 - 0.047, 1.14, HZB + 0.0315));
      const aid = "#f0b98c";
      fu.rbox(cloth, 0.05, 0.026, 0.004, 0.0015, TRS(DOOR.x0 - 0.024, 0.875, HZB + 0.0325, 0, 0, 0.35), aid, 1);
      fu.rbox(cloth, 0.004, 0.026, 0.05, 0.0015, TRS(DOOR.x0 + 0.0025, 0.875, HZB - 0.023, 0, -0.35, 0), aid, 1);
      fu.box(cloth, DOOR.x0 - 0.016, 0.867, HZB + 0.0345, DOOR.x0 - 0.003, 0.883, HZB + 0.0355, "#fde6d2");
    }
    // light switch (left of the door)
    fu.rbox(gloss, 0.085, 0.085, 0.01, 0.004, TRS(-0.66, 1.18, HZB + 0.005), "#fbf8f0", 2);
    fu.rbox(gloss, 0.018, 0.03, 0.012, 0.004, TRS(-0.66, 1.185, HZB + 0.014, 0, 0.25), "#f2eee6", 2);
    // family photos, the sampler
    const frame = (x: number, y: number, w: number, h: number, k: number, col: string, d = 0.025) => {
      const z = HZB + 0.003;
      fu.box(wood, x - w / 2, y - h / 2, z, x + w / 2, y + h / 2, z + d, col);
      b.plane(imat(S, { map: TX.photoTex(k), self: [0.04, 0.04, 0.04], spec: 60, specK: 0.25 }), w - 0.045, h - 0.045, TRS(x, y, z + d + 0.0015));
    };
    frame(-0.84, 1.6, 0.26, 0.32, 1, "#3a2a20");          // the dog
    frame(-1.28, 1.42, 0.3, 0.36, 3, "#c89a4a");          // BEAN in an arm sling (a previous bonk)
    frame(0.84, 1.56, 0.27, 0.33, 0, "#f4efe6");          // baby BEAN in the bath (with the duck)
    frame(1.32, 1.7, 0.36, 0.3, 2, "#8a5a3a");            // the family
    fu.box(wood, 2.05, 1.3, HZB + 0.003, 2.75, 1.78, HZB + 0.03, "#6a4a2e");
    b.plane(imat(S, { map: TX.samplerTex(), self: [0.04, 0.04, 0.04] }), 0.64, 0.42, TRS(2.4, 1.54, HZB + 0.0315));
    // radiator (right) + coat rack with a yellow RAINCOAT, a scarf, an umbrella stand (left)
    for (let i = 0; i < 10; i++) cs.rbox(gloss, 0.06, 0.55, 0.07, 0.02, TRS(2.0 + i * 0.075, 0.42, HZB + 0.06), "#f6f2ea", 2);
    fu.rod(metal, v3(1.95, 0.2, HZB + 0.06), v3(2.75, 0.2, HZB + 0.06), 0.014, 8, "#e8e4da");
    fu.rbox(wood, 0.9, 0.06, 0.03, 0.01, TRS(-2.35, 1.72, HZB + 0.016), "#8a5a3a", 2);
    for (let i = 0; i < 4; i++) fu.rod(metal, v3(-2.68 + i * 0.22, 1.72, HZB + 0.03), v3(-2.68 + i * 0.22, 1.76, HZB + 0.1), 0.012, 6, "#c8a050");
    {
      const cx = -2.46, top = 1.72;
      cs.add(lump(0.2, 0.62, 0.11, 21, 0.06, 18, false), cloth, TRS(cx, top - 0.55, HZB + 0.13), "#ffcf2a");
      cs.add(lump(0.12, 0.1, 0.1, 22, 0.1, 12, false), cloth, TRS(cx, top - 0.02, HZB + 0.12), "#ffc21a");
      for (const s of [-1, 1]) cs.add(lump(0.06, 0.4, 0.06, 23 + s, 0.05, 10, false), cloth, TRS(cx + s * 0.2, top - 0.5, HZB + 0.16, 0, 0, s * 0.08), "#f8c018");
      for (let k = 0; k < 4; k++) cs.sph(gloss, TRS(cx, top - 0.3 - k * 0.15, HZB + 0.235, 0, 0, 0, 0.012), 8, "#2a2a3a");
      cs.add(lump(0.05, 0.5, 0.04, 26, 0.05, 10, false), cloth, TRS(-2.02, top - 0.42, HZB + 0.11), "#e8343c");
      for (let k = 0; k < 4; k++) cs.box(cloth, -2.07, top - 0.82 + k * 0.1, HZB + 0.15, -1.97, top - 0.78 + k * 0.1, HZB + 0.152, "#ffffff");
      cs.cyl(gloss, 0.12, 0.11, 0.42, 20, TRS(-1.7, 0.21, HZB + 0.18), "#3a6ab0", true);
      cs.rod(metal, v3(-1.72, 0.1, HZB + 0.18), v3(-1.76, 0.95, HZB + 0.2), 0.01, 6, "#2a2a2a");
      cs.add(new THREE.ConeGeometry(0.06, 0.55, 8), cloth, TRS(-1.75, 0.72, HZB + 0.2, 0, 0, 0.05), "#2a3a8a");
      cs.add(new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI), metal, TRS(-1.78, 0.97, HZB + 0.2), "#5a3a1a");
    }
    // the little side table + an old phone + a plant (right, near the end window)
    {
      const tx = 3.3, tz = -1.05;
      cs.rbox(wood, 0.6, 0.035, 0.36, 0.01, TRS(tx, 0.74, tz), "#a8683a", 2);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) cs.rod(wood, v3(tx + sx * 0.26, 0, tz + sz * 0.14), v3(tx + sx * 0.25, 0.73, tz + sz * 0.13), 0.016, 6, "#8a5028");
      cs.rbox(gloss, 0.22, 0.07, 0.16, 0.03, TRS(tx - 0.1, 0.79, tz), "#e8343c", 3);
      cs.rbox(gloss, 0.26, 0.04, 0.05, 0.02, TRS(tx - 0.1, 0.845, tz, 0, 0, 0.04), "#e8343c", 3);
      cs.lathe(gloss, [[0.001, 0], [0.07, 0], [0.085, 0.13], [0.001, 0.13]], TRS(tx + 0.17, 0.757, tz), 16, "#3ab0a0");
      for (let k = 0; k < 6; k++) { const a = k * 1.1; cs.add(lump(0.07, 0.05, 0.07, 40 + k, 0.15, 10, false), leaf, TRS(tx + 0.17 + Math.cos(a) * 0.05, 0.93 + (k % 3) * 0.04, tz + Math.sin(a) * 0.05, a), LEAFC[k % 3]); }
    }
    // ---------------- END wall + the sun window (+ the sill plant) ----------------
    {
      const hole = [[EW.z0, EW.z1, EW.y0, EW.y1]];
      b.add(wallX(HX1, HZB, HZF, 0, 0.9, hole), wains, undefined, "#f8f4ec");
      b.add(wallX(HX1, HZB, HZF, 0.9, HY, hole), paper);
      const xo = HX1 + 0.14;
      b.box(paint, HX1 - 0.16, EW.y0 - 0.05, EW.z0 - 0.08, xo, EW.y0, EW.z1 + 0.08, TRIM);           // sill
      b.box(paint, HX1, EW.y1, EW.z0, xo, EW.y1 + 0.02, EW.z1, TRIM);
      b.box(paint, HX1, EW.y0, EW.z0 - 0.02, xo, EW.y1, EW.z0, TRIM); b.box(paint, HX1, EW.y0, EW.z1, xo, EW.y1, EW.z1 + 0.02, TRIM);
      for (const [za, zb] of [[EW.z0 - 0.09, EW.z0], [EW.z1, EW.z1 + 0.09]]) b.rbox(gloss, 0.03, EW.y1 - EW.y0 + 0.18, zb - za, 0.006, TRS(HX1 - 0.012, (EW.y0 + EW.y1) / 2 + 0.02, (za + zb) / 2), CASING, 2);
      b.rbox(gloss, 0.03, 0.09, EW.z1 - EW.z0 + 0.18, 0.006, TRS(HX1 - 0.012, EW.y1 + 0.045, (EW.z0 + EW.z1) / 2), CASING, 2);
      // the sash: a mullion + two transoms (match the aperture's 2 x 3 panes)
      const zc = (EW.z0 + EW.z1) / 2, yc = (EW.y0 + EW.y1) / 2, gx = HX1 + 0.07;
      fu.box(paint, gx - 0.02, EW.y0, zc - 0.02, gx + 0.02, EW.y1, zc + 0.02, TRIM);
      for (const dy of [-1, 1]) { const y = yc + dy * (EW.y1 - EW.y0) / 6; fu.box(paint, gx - 0.02, y - 0.02, EW.z0, gx + 0.02, y + 0.02, EW.z1, TRIM); }
      // curtains (soft folds), a curtain pole
      for (const [z, s] of [[EW.z0 - 0.22, -1], [EW.z1 + 0.22, 1]] as [number, number][]) {
        for (let k = 0; k < 4; k++) fu.add(lump(0.04, 1.05, 0.06, 50 + k + s, 0.03, 10, false), cloth, TRS(HX1 - 0.08 - (k % 2) * 0.02, 1.38, z + s * (k * 0.055 - 0.08)), k % 2 ? "#f4b8b0" : "#f8c8c0");
      }
      fu.rod(metal, v3(HX1 - 0.09, 2.45, EW.z0 - 0.45), v3(HX1 - 0.09, 2.45, EW.z1 + 0.45), 0.014, 8, "#c8a050");
      // the sill plant (its leaves = LEAVES in the aperture: they print a leafy silhouette into the sun stripes)
      fu.lathe(gloss, [[0.001, 0], [0.06, 0], [0.075, 0.13], [0.08, 0.14], [0.001, 0.14]], TRS(HX1 - 0.06, EW.y0, zc + 0.3), 16, "#e86a3a");
      LEAVES.forEach(([u, v, r], i) => fu.add(lump(r * 0.9, r, r * 0.9, 60 + i, 0.18, 12, false), leaf, TRS(HX1 - 0.06, yc + v, zc + u, i), LEAFC[i % 3]));
      // outside: a bright morning garden (emissive)
      this.outMats.push(emissive(R, TX.gardenTex(), 3.2, 3.2, TRS(HX1 + 0.9, 1.6, zc, -Math.PI / 2), 1.0));
    }
    // ---------------- side wall, front wall, ceiling ----------------
    b.add(wallX(HX0, HZB, HZF, 0, 0.9), wains, undefined, "#f8f4ec"); b.add(wallX(HX0, HZB, HZF, 0.9, HY), paper);
    b.add(wallZ(HX0, HX1, 0, 0.9, HZF), wains, undefined, "#f8f4ec"); b.add(wallZ(HX0, HX1, 0.9, HY, HZF), paper);
    b.add(flat(HX0, HZB, HX1, HZF, HY), plaster, undefined, "#fbf8f2");
    // ---------------- the KITCHEN ----------------
    const yellow = "#ffd667";
    b.add(flat(KX0, KZ0, KX1, HZK, 0), imat(S, { map: TX.checkerTex(), rep: [1 / 0.6, 1 / 0.6], spec: 60, specK: 0.35 }));
    b.add(wallZ(KX0, KX1, 0, KY, KZ0, [[KB.x0, KB.x1, KB.y0, KB.y1]]), plaster, undefined, yellow);
    b.add(wallX(KX1, KZ0, HZK, 0, KY, [[KW.z0, KW.z1, KW.y0, KW.y1]]), plaster, undefined, yellow);
    b.add(wallX(KX0, KZ0, HZK, 0, KY), plaster, undefined, yellow);
    b.add(flat(KX0, KZ0, KX1, HZK, KY), plaster, undefined, "#fffaf0");
    b.box(paint, KX0, KY - 0.08, KZ0, KX1, KY, KZ0 + 0.04, TRIM);
    // windows: frames + sills + glazing bars; outside views
    {
      const z = KZ0, cx = (KB.x0 + KB.x1) / 2, cy = (KB.y0 + KB.y1) / 2;
      b.box(paint, KB.x0 - 0.05, KB.y0 - 0.04, z - 0.1, KB.x1 + 0.05, KB.y0, z + 0.09, TRIM);
      b.box(paint, KB.x0 - 0.06, KB.y1, z + 0.002, KB.x1 + 0.06, KB.y1 + 0.06, z + 0.02, TRIM);
      for (const x of [KB.x0 - 0.06, KB.x1]) b.box(paint, x, KB.y0, z + 0.002, x + 0.06, KB.y1, z + 0.02, TRIM);
      b.box(paint, KB.x0 - 0.01, KB.y0, z - 0.1, KB.x0, KB.y1, z, TRIM); b.box(paint, KB.x1, KB.y0, z - 0.1, KB.x1 + 0.01, KB.y1, z, TRIM); b.box(paint, KB.x0, KB.y1 - 0.01, z - 0.1, KB.x1, KB.y1, z, TRIM);
      fu.box(paint, cx - 0.018, KB.y0, z - 0.06, cx + 0.018, KB.y1, z - 0.03, TRIM); fu.box(paint, KB.x0, cy - 0.018, z - 0.06, KB.x1, cy + 0.018, z - 0.03, TRIM);
      this.outMats.push(emissive(R, TX.gardenTex(), 2.6, 2.6, TRS(cx, 1.5, z - 1.0), 1.0));
      // gingham cafe curtain + a little plant on the sill
      const ging = imat(S, { map: TX.ginghamTex(), rep: [4, 4], rim: 0.15 });
      { // a gathered gingham VALANCE across the window top (a wavy strip)
        const vg = new THREE.PlaneGeometry(KB.x1 - KB.x0 + 0.2, 0.24, 40, 1), vp = vg.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < vp.count; i++) { const X = vp.getX(i), Y = vp.getY(i); vp.setZ(i, 0.018 * Math.sin(X * 48)); vp.setY(i, Y < 0 ? Y - 0.025 * Math.abs(Math.sin(X * 24)) : Y); }
        vg.computeVertexNormals();
        fu.add(vg, ging, TRS(cx, KB.y1 - 0.09, z + 0.07), "#ffffff");
      }
      fu.rod(metal, v3(KB.x0 - 0.1, KB.y1 + 0.03, z + 0.06), v3(KB.x1 + 0.1, KB.y1 + 0.03, z + 0.06), 0.01, 6, "#c8a050");
      fu.lathe(gloss, [[0.001, 0], [0.05, 0], [0.06, 0.1], [0.001, 0.1]], TRS(KB.x1 - 0.18, KB.y0, z + 0.04), 14, "#ffffff");
      for (let k = 0; k < 7; k++) fu.add(lump(0.025, 0.07, 0.025, 80 + k, 0.1, 8, false), leaf, TRS(KB.x1 - 0.18 + Math.cos(k) * 0.025, KB.y0 + 0.14 + (k % 2) * 0.03, z + 0.04 + Math.sin(k) * 0.025, 0, 0, Math.cos(k * 2.1) * 0.4), "#5ab84a");
      const x = KX1, zc = (KW.z0 + KW.z1) / 2, yc = (KW.y0 + KW.y1) / 2;
      b.box(paint, x - 0.1, KW.y0 - 0.04, KW.z0 - 0.05, x + 0.1, KW.y0, KW.z1 + 0.05, TRIM);
      for (const [za, zb] of [[KW.z0 - 0.06, KW.z0], [KW.z1, KW.z1 + 0.06]]) b.box(paint, x - 0.02, KW.y0, za, x - 0.002, KW.y1, zb, TRIM);
      b.box(paint, x - 0.02, KW.y1, KW.z0 - 0.06, x - 0.002, KW.y1 + 0.06, KW.z1 + 0.06, TRIM);
      b.box(paint, x, KW.y0, KW.z0 - 0.01, x + 0.1, KW.y1, KW.z0, TRIM); b.box(paint, x, KW.y0, KW.z1, x + 0.1, KW.y1, KW.z1 + 0.01, TRIM); b.box(paint, x, KW.y1 - 0.01, KW.z0, x + 0.1, KW.y1, KW.z1, TRIM);
      fu.box(paint, x + 0.03, KW.y0, zc - 0.018, x + 0.06, KW.y1, zc + 0.018, TRIM); fu.box(paint, x + 0.03, yc - 0.018, KW.z0, x + 0.06, yc + 0.018, KW.z1, TRIM);
      this.outMats.push(emissive(R, TX.gardenTex(), 2.6, 2.6, TRS(x + 1.0, 1.5, zc, -Math.PI / 2), 1.0));
    }
    // backsplash tiles, counters, cabinets, sink, kettle, toaster, fruit, the FRIDGE, clock, pendant lamp
    {
      const sub = imat(S, { map: TX.subwayTex(), rep: [1 / 0.6, 1 / 0.6], spec: 80, specK: 0.5 });
      const z = KZ0 + 0.004;
      for (const [x0, x1, y0, y1] of [[-0.95, KB.x0 - 0.06, 0.92, 1.55], [KB.x1 + 0.06, KX1, 0.92, 1.55], [KB.x0 - 0.06, KB.x1 + 0.06, 0.92, KB.y0 - 0.04]]) b.plane(sub, x1 - x0, y1 - y0, TRS((x0 + x1) / 2, (y0 + y1) / 2, z));
      const MINT = "#8fd6bf", TOP = "#e8b878";
      fu.box(paint, -0.95, 0, KZ0, KX1, 0.1, -3.27, "#5a8a7a");
      fu.box(paint, -0.95, 0.1, KZ0, KX1, 0.86, -3.22, MINT);
      for (let i = 0; i < 6; i++) {
        const x0 = -0.93 + i * 0.47, x1 = x0 + 0.44, xc = (x0 + x1) / 2;
        fu.rbox(gloss, x1 - x0, 0.7, 0.02, 0.008, TRS(xc, 0.48, -3.212), i === 3 ? "#9ce0ca" : MINT, 2);
        fu.sph(metal, TRS(i % 2 ? x0 + 0.05 : x1 - 0.05, 0.74, -3.195, 0, 0, 0, 0.016), 10, "#e8d070");
      }
      fu.rbox(wood, KX1 + 0.97, 0.045, 0.65, 0.012, TRS((KX1 - 0.97) / 2, 0.8825, -3.47), TOP, 2);
      // sink under the window + a swan-neck tap
      const sx = (KB.x0 + KB.x1) / 2;
      fu.box(metal, sx - 0.26, 0.906, -3.66, sx + 0.26, 0.908, -3.3, "#9aa4ae");
      fu.box(metal, sx - 0.23, 0.9085, -3.63, sx + 0.23, 0.9095, -3.33, "#5a646e");
      fu.rod(metal, v3(sx, 0.905, -3.72), v3(sx, 1.12, -3.72), 0.014, 10, "#d8dde2");
      fu.tube(metal, [v3(sx, 1.12, -3.72), v3(sx, 1.2, -3.66), v3(sx, 1.16, -3.58), v3(sx, 1.08, -3.56)], 0.013, 20, "#d8dde2", 8);
      for (const s of [-1, 1]) fu.cyl(metal, 0.018, 0.022, 0.05, 10, TRS(sx + s * 0.1, 0.93, -3.72), s > 0 ? "#e8343c" : "#3a8ae8");
      // kettle, toaster (toast popping), fruit bowl, cookie jar, a mug
      fu.lathe(gloss, [[0.001, 0], [0.09, 0], [0.1, 0.03], [0.095, 0.15], [0.06, 0.2], [0.001, 0.21]], TRS(-0.62, 0.905, -3.52), 20, "#e8343c");
      fu.torus(gloss, 0.06, 0.012, TRS(-0.62, 1.12, -3.52), "#2a2a2a", Math.PI, 8);
      fu.add(new THREE.ConeGeometry(0.02, 0.09, 8), gloss, TRS(-0.52, 1.02, -3.52, 0, 0, -1.0), "#e8343c");
      fu.rbox(metal, 0.26, 0.17, 0.15, 0.05, TRS(-0.18, 0.99, -3.6), "#e4e8ec", 3);
      for (const dx of [-0.05, 0.05]) fu.rbox(cloth, 0.1, 0.11, 0.014, 0.03, TRS(-0.18 + dx * 0.6, 1.1, -3.6 + dx * 0.5), "#e8b060", 2);
      fu.lathe(gloss, [[0.001, 0], [0.08, 0], [0.15, 0.07], [0.001, 0.07]], TRS(1.62, 0.905, -3.45), 20, "#3a8ae8");
      for (const [dx, dz, c] of [[0, 0, "#e8343c"], [0.06, 0.03, "#ff8a2a"], [-0.05, 0.04, "#7ac83a"]] as [number, number, string][]) fu.sph(gloss, TRS(1.62 + dx, 1.0, -3.45 + dz, 0, 0, 0, 0.042), 12, c);
      fu.tube(cloth, [v3(1.56, 0.99, -3.5), v3(1.6, 1.03, -3.47), v3(1.68, 1.04, -3.46), v3(1.72, 1.0, -3.45)], 0.022, 12, "#ffd23a", 8);
      fu.lathe(gloss, [[0.001, 0], [0.09, 0], [0.095, 0.2], [0.06, 0.22], [0.001, 0.22]], TRS(0.02, 0.905, -3.62), 16, "#f4efe4");
      fu.sph(gloss, TRS(0.02, 1.14, -3.62, 0, 0, 0, 0.03), 10, "#e8343c");
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.1], [0.001, 0.1]], TRS(1.25, 0.905, -3.35), 14, "#ffd23a");
      // upper cabinets (left of the window) + an open shelf with plates (right)
      fu.box(paint, -0.95, 1.6, KZ0, KB.x0 - 0.12, 2.35, -3.46, MINT);
      for (let i = 0; i < 3; i++) { const w = (KB.x0 - 0.12 + 0.95) / 3, x0 = -0.95 + i * w; fu.rbox(gloss, w - 0.02, 0.71, 0.02, 0.008, TRS(x0 + w / 2, 1.975, -3.452), MINT, 2); fu.sph(metal, TRS(x0 + (i % 2 ? 0.05 : w - 0.05), 1.66, -3.44, 0, 0, 0, 0.014), 8, "#e8d070"); }
      fu.box(wood, KB.x1 + 0.12, 1.72, KZ0, KX1, 1.75, -3.55, TOP);
      for (let i = 0; i < 4; i++) fu.cyl(gloss, 0.08, 0.08, 0.012, 20, TRS(KB.x1 + 0.22 + i * 0.03, 1.83, -3.7, Math.PI / 2, Math.PI / 2 - 0.2), ["#ffffff", "#3a8ae8", "#ffffff", "#e8343c"][i]);
      // the FRIDGE (retro cream, rounded) + its decorated door
      fu.rbox(gloss, 0.8, 1.85, 0.68, 0.07, TRS(-1.46, 0.925, -3.45), "#fff3d8", 4);
      b.plane(imat(S, { map: TX.fridgeTex(), spec: 60, specK: 0.3 }), 0.64, 1.6, TRS(-1.48, 0.98, -3.108));
      fu.rod(metal, v3(-1.12, 1.25, -3.09), v3(-1.12, 1.62, -3.09), 0.014, 8, "#d8dde2");
      fu.rod(metal, v3(-1.12, 0.6, -3.09), v3(-1.12, 1.0, -3.09), 0.014, 8, "#d8dde2");
      fu.rbox(cloth, 0.2, 0.3, 0.07, 0.01, TRS(-1.62, 2.0, -3.5, 0.2), "#e8343c", 1);
      fu.rbox(cloth, 0.16, 0.24, 0.06, 0.01, TRS(-1.36, 1.97, -3.45, -0.3), "#3a8ae8", 1);
      // the clock above the window
      fu.cyl(gloss, 0.15, 0.15, 0.035, 32, TRS(0.8, 2.28, KZ0 + 0.02, 0, Math.PI / 2), "#e8343c");
      b.add(new THREE.CircleGeometry(0.125, 32), imat(S, { map: TX.kClockTex(), self: [0.1, 0.1, 0.1] }), TRS(0.8, 2.28, KZ0 + 0.0385));
      // the pendant lamp
      fu.rod(metal, v3(0, KY, -2.55), v3(0, 2.1, -2.55), 0.006, 4, "#2a2a2a");
      fu.lathe(gloss, [[0.02, 0.12], [0.06, 0.1], [0.16, 0.0], [0.155, -0.005], [0.055, 0.095], [0.015, 0.115]], TRS(0, 1.98, -2.55), 24, "#e8343c");
      fu.sph(this.lampMat, TRS(0, 1.97, -2.55, 0, 0, 0, 0.045), 12, "#fff0c8");
      // a cat bowl + a little step stool
      fu.lathe(gloss, [[0.001, 0], [0.07, 0], [0.08, 0.05], [0.06, 0.05], [0.001, 0.02]], TRS(-0.9, 0, -2.2), 16, "#e86aa4");
      fu.rbox(gloss, 0.36, 0.04, 0.26, 0.012, TRS(1.55, 0.3, -2.0), "#ff8a3a", 2);
      for (const sx2 of [-1, 1]) fu.box(paint, 1.55 + sx2 * 0.15 - 0.012, 0, -2.12, 1.55 + sx2 * 0.15 + 0.012, 0.28, -1.88, "#ff8a3a");
    }
    b.build(R); fu.build(R, false);
    this.casters = cs.build(R, false);
    this.glows = new Glows(R, [{ p: v3(0, 1.94, -2.55), c: [0.9, 0.7, 0.4], s: 0.5, g: 0 }], 0.5);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number) {
    const S = this.S, O = this.root.position, W = (x: number, y: number, z: number) => v3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), look = SHOTS[id - 1].look;
    const match = worldSun(id, look).angleTo(HALL_SUN) < THREE.MathUtils.degToRad(4);
    S.u.uMapK.value = match ? 1 : 0;
    for (const m of this.casters) m.castShadow = match;
    (S.u.uSD.value as THREE.Vector3).copy(HALL_SUN); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    const zc = (EW.z0 + EW.z1) / 2, yc = (EW.y0 + EW.y1) / 2;
    setAperture(S, 0, { c: W(HX1, yc, zc), n: v3(-1, 0, 0), u: v3(0, 0, 1), v: v3(0, 1, 0), hw: (EW.z1 - EW.z0) / 2, hh: (EW.y1 - EW.y0) / 2, bays: 1, pier: 0, arch: false, cols: 2, rows: 3, bar: 0.022 });
    setAperture(S, 1, { c: W(KX1, (KW.y0 + KW.y1) / 2, (KW.z0 + KW.z1) / 2), n: v3(-1, 0, 0), u: v3(0, 0, 1), v: v3(0, 1, 0), hw: (KW.z1 - KW.z0) / 2, hh: (KW.y1 - KW.y0) / 2, bays: 1, pier: 0, arch: false, cols: 2, rows: 2, bar: 0.02 });
    (S.u.uLf.value as THREE.Vector3[]).forEach((L, i) => L.set(...LEAVES[i]));
    (S.u.uDoor.value as THREE.Vector4).set(O.x, (DOOR.x1 - DOOR.x0) / 2, O.y + DOOR.h / 2, DOOR.h / 2); S.u.uDZ.value = O.z + DOOR.z; S.u.uDK.value = 1;
    (S.u.uO.value as THREE.Vector3).copy(O);
    (S.u.uBA0.value as THREE.Vector3).set(HX0, 0, HZB); (S.u.uBA1.value as THREE.Vector3).set(HX1, HY, HZF);
    (S.u.uBB0.value as THREE.Vector3).set(KX0, 0, KZ0); (S.u.uBB1.value as THREE.Vector3).set(KX1, KY, HZK);
    S.u.uAO.value = 1; S.u.uTT.value = t; S.u.uFogCap.value = 0.4;
    (S.u.uSpC.value as THREE.Vector3).set(0, 0, 0);
    const k = rg.kfill, bo = rg.bounce, lp = rg.lamp;
    setLights(S, [
      { p: W(0.6, 0.25, -0.95), c: bo, r: 1.8 },                                         // sun bounce off the floor stripes by the door
      { p: W(3.6, 0.3, -0.6), c: bo, r: 2.4 },                                           // ... and nearer the window
      { p: W(4.5, 1.5, -0.4), c: [bo[0] * 0.6, bo[1] * 0.65, bo[2] * 0.8], r: 2.0 },     // window glow
      { p: W(0.4, 1.7, 1.9), c: rg.fill, r: 3.5 },                                       // cool fill from the front
      { p: W(0.2, 1.5, -2.5), c: k, r: 2.2 },                                            // the KITCHEN: warm sunny fill
      { p: W(1.3, 0.4, -2.6), c: [k[0] * 0.8, k[1] * 0.7, k[2] * 0.5], r: 1.8 },          // ... sun bounce off its tiles
      { p: W(-1.2, 1.6, -2.4), c: [k[0] * 0.5, k[1] * 0.45, k[2] * 0.35], r: 1.6 },      // ... by the fridge
      { p: W(0, 1.85, -2.55), c: [0.6 * lp, 0.48 * lp, 0.28 * lp], r: 1.4 },             // the pendant
      { p: W(0, 1.3, -1.6), c: [k[0] * 0.35, k[1] * 0.3, k[2] * 0.2], r: 1.0 },           // kitchen light spilling through the doorway
    ], rg.au, rg.ad);
    for (const m of this.outMats) m.color.setScalar(rg.outK);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(0.3 + 3.0 * lp, 0.25 + 2.4 * lp, 0.15 + 1.4 * lp);
    this.glows.gk.set(lp, 0, 0, 0); this.glows.mat.uniforms.uT.value = t; this.glows.mesh.visible = lp > 0.02;
  }
}

// ============================================================================ MUSEUM
// room (local): x -3.4 (portrait wall) .. 3.5 (arched windows), z -7 (back wall, grand arch) .. 7.2, a tall ceiling 6.0
// (the descending camera starts under it at y 5.4, z 5.6); a glazed skylight well x -0.8..1.4, z 4.4..6.8 up to 7.3.
const MX0 = MU_WALL_X, MX1 = 3.5, MZ0 = -7, MZ1 = 7.2, MY = 6.0;
const SKY = { x0: -0.8, x1: 1.4, z0: 4.4, z1: 6.8, y1: 7.3 };
const ARCH = { x0: -1.3, x1: 1.3, y1: 3.3 };  // the grand arch into the next gallery (z < MZ0)
const MWIN = { z0: -5.7, z1: -0.3, y0: 0.8, y1: 3.4, bays: 3, pier: 0.3 };
const BAYW = (MWIN.z1 - MWIN.z0) / MWIN.bays;
const PENDANTS: [number, number][] = [[-1.6, -3.0], [1.6, -3.0], [-1.6, 1.6], [1.6, 1.6]];

class Museum {
  root = new THREE.Group(); S: LSet = lset();
  casters: THREE.Mesh[] = []; glows: Glows; outMats: THREE.MeshBasicMaterial[] = []; lampMat: THREE.ShaderMaterial;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...MUSEUM);
    this.lampMat = imat(S, { col: "#000000", em: [1, 1, 1] });
    const b = new Bat(), fu = new Bat(), cs = new Bat(); // cs = floor furniture that casts into the world map (when matched)
    const parquet = imat(S, { map: TX.parquetTex(), rep: [1 / 1.2, 1 / 1.2], spec: 60, specK: 0.4 });
    const damask = imat(S, { map: TX.damaskTex(), rep: [1 / 0.8, 1 / 0.8], spec: 20, specK: 0.08 });
    const panel = imat(S, { map: TX.panelTex(), spec: 50, specK: 0.3 }), stone = imat(S, { map: TX.stoneTex(), rep: [0.5, 0.5] });
    const plaster = imat(S, { map: TX.plasterTex(), rep: [0.5, 0.5] }), paint = imat(S, { spec: 30, specK: 0.15 }), gloss = imat(S, { spec: 70, specK: 0.5 });
    const wood = imat(S, { spec: 60, specK: 0.4 }), gilt = imat(S, { spec: 60, specK: 1.3, rim: 0.4, self: [0.14, 0.1, 0.04] }), brass = imat(S, { spec: 80, specK: 1.2, rim: 0.3 });
    const marble = imat(S, { map: TX.marbleTex(), rep: [1.5, 1.5], spec: 90, specK: 0.6 }), velvet = imat(S, { rim: 0.5 });
    const glass = imat(S, { spec: 120, specK: 1.6, self: [0.02, 0.025, 0.03] }), bone = imat(S, { spec: 40, specK: 0.3, rim: 0.2 });
    const leaf = imat(S, { spec: 30, specK: 0.2, rim: 0.3 });
    // ---------------- floor ----------------
    b.add(flat(MX0, MZ0, MX1, MZ1, 0), parquet);
    // ---------------- LEFT: the PORTRAIT wall (deep green damask over dark panelling) ----------------
    {
      const x = MX0;
      b.add(wallX(x, MZ0, MZ1, 0, 1.0), panel, undefined, "#ffffff");
      b.add(wallX(x, MZ0, MZ1, 1.0, MY), damask);
      fu.box(wood, x, 0.97, MZ0, x + 0.035, 1.04, MZ1, "#3a1e0c");             // chair rail
      fu.box(wood, x, 0, MZ0, x + 0.025, 0.16, MZ1, "#2a1408");                // skirting
      fu.box(gilt, x, 2.78, MZ0, x + 0.03, 2.82, MZ1, "#c89a3a");              // picture rail
      PORTRAITS.forEach((P, i) => {
        const z = P.c[2] - MUSEUM[2], y = P.c[1] - MUSEUM[1], w = P.w, h = P.h;
        b.box(paint, x, y - h / 2, z - w / 2, x + 0.012, y + h / 2, z + w / 2, "#2a2018");     // canvas backing (behind the card at -3.37)
        if (i < 3) {
          // ornate GILT frame: a fat bevelled moulding, an inner bead, corner rosettes, a crest on top
          const fw = 0.11, fx = x + 0.004;
          for (const [cy, hh, cz, ww] of [[y + h / 2 + fw / 2 - 0.015, fw, z, w + 2 * fw - 0.03], [y - h / 2 - fw / 2 + 0.015, fw, z, w + 2 * fw - 0.03], [y, h + 2 * fw - 0.03, z - w / 2 - fw / 2 + 0.015, fw], [y, h + 2 * fw - 0.03, z + w / 2 + fw / 2 - 0.015, fw]] as number[][]) {
            fu.rbox(gilt, 0.05, hh, ww, 0.02, TRS(fx + 0.025, cy, cz), "#d8a83a", 3);
            fu.rbox(gilt, 0.02, hh > ww ? hh * 0.97 : hh * 0.4, hh > ww ? ww * 0.4 : ww * 0.97, 0.008, TRS(fx + 0.052, cy, cz), "#f0c860", 2);
          }
          for (const sy of [-1, 1]) for (const sz of [-1, 1]) fu.add(lump(0.035, 0.035, 0.035, 90 + i * 4 + sy + sz, 0.2, 10, false), gilt, TRS(fx + 0.06, y + sy * (h / 2 + fw / 2 - 0.015), z + sz * (w / 2 + fw / 2 - 0.015)), "#f0c860");
          fu.add(lump(0.04, 0.09, 0.16, 95 + i, 0.15, 12, true), gilt, TRS(fx + 0.03, y + h / 2 + fw - 0.02, z, 0, 0, -Math.PI / 2), "#e8b848");
          fu.sph(gilt, TRS(fx + 0.04, y + h / 2 + fw + 0.06, z, 0, 0, 0, 0.035), 10, "#f0c860");
        } else {
          // 2026: a cheap thin black plastic frame with a SALE sticker still on it
          const fw = 0.035;
          for (const [cy, hh, cz, ww] of [[y + h / 2 + fw / 2 - 0.012, fw, z, w + 2 * fw - 0.024], [y - h / 2 - fw / 2 + 0.012, fw, z, w + 2 * fw - 0.024], [y, h + 2 * fw - 0.024, z - w / 2 - fw / 2 + 0.012, fw], [y, h + 2 * fw - 0.024, z + w / 2 + fw / 2 - 0.012, fw]] as number[][])
            fu.box(gloss, x + 0.004, cy - hh / 2, cz - ww / 2, x + 0.045, cy + hh / 2, cz + ww / 2, "#16161a");
          b.plane(imat(S, { map: TX.stickerTex(), cut: true, self: [0.06, 0.06, 0.06] }), 0.09, 0.09, MM(TRS(x + 0.047, y - h / 2 - 0.005, z + w / 2 - 0.005, Math.PI / 2), TRS(0, 0, 0, 0, 0, 0.3)));
        }
        // the brass label under each frame + a brass PICTURE LIGHT above the old ones
        const lab = [["SIR REGINALD BONE", "1840"], ["LADY FEATHERSTONE", "1900"], ["DAD", "1950"], ["BEAN", "2026 · not amused"]][i];
        fu.box(brass, x + 0.004, y - h / 2 - 0.26, z - 0.19, x + 0.01, y - h / 2 - 0.14, z + 0.19, "#a87828");
        b.plane(imat(S, { map: TX.brassTex("p" + i, [[lab[0], 70], [lab[1], 52]], 1024, 320), spec: 80, specK: 0.9 }), 0.36, 0.11, TRS(x + 0.0115, y - h / 2 - 0.2, z, Math.PI / 2));
        if (i === 3) {
          const ly = y + h / 2 + 0.06;
          fu.rod(gloss, v3(x + 0.03, ly, z + 0.25), v3(x + 0.16, ly + 0.12, z + 0.12), 0.01, 6, "#f4f4f4");
          fu.lathe(gloss, [[0.001, 0.08], [0.02, 0.08], [0.06, 0.0], [0.001, 0.0]], MM(TRS(x + 0.18, ly + 0.1, z + 0.1), TRS(0, 0, 0, 0, 0, 2.3)), 14, "#f4f4f4");
          fu.sph(this.lampMat, TRS(x + 0.155, ly + 0.08, z + 0.1, 0, 0, 0, 0.022), 8, "#e8f4ff");
        } else {
          const ly = y + h / 2 + 0.24;
          fu.rod(brass, v3(x, ly - 0.08, z), v3(x + 0.16, ly + 0.02, z), 0.012, 8, "#c89a3a");
          fu.add(new THREE.CylinderGeometry(0.03, 0.04, 0.34, 16, 1, false), brass, TRS(x + 0.2, ly, z, 0, Math.PI / 2, 0), "#c89a3a");
          fu.box(this.lampMat, x + 0.185, ly - 0.03, z - 0.16, x + 0.205, ly - 0.025, z + 0.16, "#fff0c8");
        }
      });
    }
    // ---------------- RIGHT: the tall ARCHED windows (limestone, deep reveals, glazing bars) ----------------
    {
      const x = MX1, holes: THREE.Vector2[][] = [], D = 0.3;
      for (let k = 0; k < MWIN.bays; k++) { const zc = MWIN.z0 + (k + 0.5) * BAYW, hw = BAYW / 2 - MWIN.pier; holes.push(archPts(zc - hw, zc + hw, MWIN.y0, MWIN.y1)); }
      b.add(shapeWall(MZ0, MZ1, 0, MY, holes, (u, v) => v3(x, v, u)), stone, undefined, "#ffffff");
      fu.box(wood, x - 0.025, 0, MZ0, x, 0.16, MZ1, "#2a1408");
      for (const h of holes) {
        b.add(reveal(h, 0, D, (u, v, d) => v3(x + d, v, u), true), stone, undefined, "#f8eedc");
        const zc = (h[0].x + h[1].x) / 2, hw = (h[1].x - h[0].x) / 2;
        b.box(stone, x - 0.12, MWIN.y0 - 0.06, zc - hw - 0.08, x + 0.02, MWIN.y0, zc + hw + 0.08, "#efe0c0");   // sill
        // glazing: 3 columns (2 bars), 6 rows (5 bars), clipped by the arch
        const gx = x + D - 0.08, yt = MWIN.y1 - hw, bar = 0.018;
        for (let c = 1; c < 3; c++) { const lz = -hw + (c * 2 * hw) / 3; const top = yt + Math.sqrt(Math.max(0, hw * hw - lz * lz)); fu.box(paint, gx - 0.015, MWIN.y0, zc + lz - bar, gx + 0.015, top, zc + lz + bar, "#3a3028"); }
        for (let r = 1; r < 6; r++) { const y = MWIN.y0 + (r * (MWIN.y1 - MWIN.y0)) / 6; const half = y > yt ? Math.sqrt(Math.max(0, hw * hw - (y - yt) * (y - yt))) : hw; if (half > 0.03) fu.box(paint, gx - 0.015, y - bar, zc - half, gx + 0.015, y + bar, zc + half, "#3a3028"); }
        fu.add(new THREE.TorusGeometry(hw, 0.03, 6, 24, Math.PI), paint, TRS(gx, yt, zc, Math.PI / 2), "#3a3028");
        // a heavy velvet curtain gathered at one side
        fu.add(lump(0.08, 1.5, 0.14, 120 + Math.round(zc * 10), 0.08, 12, false), velvet, TRS(x - 0.12, 1.65, zc + hw + 0.16), "#7a1c22");
        fu.add(lump(0.06, 0.06, 0.12, 121 + Math.round(zc * 10), 0.1, 8, false), brass, TRS(x - 0.1, 1.5, zc + hw + 0.18), "#c89a3a");
      }
      fu.rod(brass, v3(x - 0.14, MWIN.y1 + 0.2, MWIN.z0 - 0.4), v3(x - 0.14, MWIN.y1 + 0.2, MWIN.z1 + 0.4), 0.02, 8, "#c89a3a");
      this.outMats.push(emissive(R, TX.muOutTex(), 7.0, 4.6, TRS(x + 1.4, 2.0, (MWIN.z0 + MWIN.z1) / 2, -Math.PI / 2), 1.0));
    }
    // ---------------- BACK: the grand arch to the next gallery, the HALL OF ANATOMY banner, two charts ----------------
    {
      const z = MZ0, ah = archPts(ARCH.x0, ARCH.x1, 0, ARCH.y1, 24), D = 0.4;
      b.add(shapeWall(MX0, MX1, 0, MY, [ah], (u, v) => v3(u, v, z)), stone, undefined, "#ffffff");
      b.add(reveal(ah.slice(1).concat([ah[0]]), 0, D, (u, v, d) => v3(u, v, z - d)), stone, undefined, "#f2e4c8");
      const r = (ARCH.x1 - ARCH.x0) / 2, yt = ARCH.y1 - r;
      fu.add(new THREE.TorusGeometry(r + 0.06, 0.05, 8, 40, Math.PI), stone, TRS(0, yt, z + 0.02), "#f8ecd4");
      for (const s of [-1, 1]) fu.box(stone, s * (r + 0.06) - 0.06, 0, z, s * (r + 0.06) + 0.06, yt, z + 0.07, "#f8ecd4");
      fu.box(stone, -0.13, ARCH.y1 - 0.02, z, 0.13, ARCH.y1 + 0.2, z + 0.1, "#fff4dc");
      for (const [x0, x1] of [[MX0, ARCH.x0 - 0.12], [ARCH.x1 + 0.12, MX1]]) fu.box(wood, x0, 0, z, x1, 0.16, z + 0.025, "#2a1408");
      // the banner (a slight sag)
      const bg = new THREE.PlaneGeometry(3.0, 0.75, 30, 2), bp = bg.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < bp.count; i++) bp.setZ(i, 0.025 * Math.sin(bp.getX(i) * 4) * (0.4 - bp.getY(i)));
      bg.computeVertexNormals();
      b.add(bg, imat(S, { map: TX.bannerTex(), self: [0.05, 0.05, 0.05], spec: 30, specK: 0.2, rim: 0.2 }), TRS(0, 3.92, z + 0.1));
      fu.rod(brass, v3(-1.6, 4.32, z + 0.1), v3(1.6, 4.32, z + 0.1), 0.02, 8, "#c89a3a");
      for (const s of [-1, 1]) fu.sph(brass, TRS(s * 1.62, 4.32, z + 0.1, 0, 0, 0, 0.04), 10, "#e8c060");
      // anatomy charts in thin frames
      for (const [cx, k] of [[-2.35, 0], [2.35, 1]] as [number, number][]) {
        fu.box(wood, cx - 0.52, 1.35, z, cx + 0.52, 2.73, z + 0.04, "#3a1e0c");
        b.plane(imat(S, { map: TX.chartTex(k), self: [0.04, 0.04, 0.04] }), 0.96, 1.3, TRS(cx, 2.04, z + 0.042));
      }
      // the next gallery through the arch: a lit room with cases + a whale-ish rib cage
      const gz0 = z - 3.4;
      b.add(flat(-2.4, gz0, 2.4, z - D, 0), parquet);
      b.add(wallZ(-2.4, 2.4, 0, 3.8, gz0), stone, undefined, "#f0dcb8");
      b.add(wallX(-2.4, gz0, z - D, 0, 3.8), stone, undefined, "#e8d0a8"); b.add(wallX(2.4, gz0, z - D, 0, 3.8), stone, undefined, "#e8d0a8");
      b.add(wallZ(-2.4, 2.4, 0, 3.8, z - D, [[ARCH.x0, ARCH.x1, 0, ARCH.y1]]), stone, undefined, "#e8d0a8");
      b.add(flat(-2.4, gz0, 2.4, z - D, 3.8), plaster, undefined, "#f0e4cc");
      // (qa2) the rib-cage that stood here (x 0.2) sat dead behind SKELLY from every shot-5 angle: end-on it read as a dome
      // + black arcs growing out of his shoulder (632-914), in profile as a coil over his skull. Removed: a clean arch.
      for (const s of [-1, 1]) { fu.box(wood, s * 1.9 - 0.3, 0, gz0 + 0.4, s * 1.9 + 0.3, 0.8, gz0 + 1.6, "#5a3018"); fu.box(glass, s * 1.9 - 0.28, 0.8, gz0 + 0.42, s * 1.9 + 0.28, 1.4, gz0 + 1.58, "#bcd8d8"); }
    }
    // ---------------- FRONT wall + ceiling (beams) + the SKYLIGHT ----------------
    {
      b.add(wallZ(MX0, MX1, 0, MY, MZ1), stone, undefined, "#ffffff");
      const rect = [new THREE.Vector2(SKY.x0, SKY.z0), new THREE.Vector2(SKY.x1, SKY.z0), new THREE.Vector2(SKY.x1, SKY.z1), new THREE.Vector2(SKY.x0, SKY.z1)];
      b.add(shapeWall(MX0, MX1, MZ0, MZ1, [rect], (u, v) => v3(u, MY, v)), plaster, undefined, "#f4ead8");
      for (let z = MZ0 + 1.2; z < MZ1; z += 1.8) { if (z > SKY.z0 - 0.15 && z < SKY.z1 + 0.15) continue; fu.box(wood, MX0, MY - 0.22, z - 0.12, MX1, MY - 0.002, z + 0.12, "#6a4022"); }
      fu.box(gilt, MX0, MY - 0.16, MZ0, MX0 + 0.12, MY - 0.002, MZ1, "#c89a3a"); fu.box(gilt, MX1 - 0.12, MY - 0.16, MZ0, MX1, MY - 0.002, MZ1, "#c89a3a");
      const lw = (u0: number, u1: number, mk: (u: number, v: number) => THREE.Vector3) => b.add(shapeWall(u0, u1, MY, SKY.y1, [], mk), plaster, undefined, "#fbf4e4");
      lw(SKY.x0, SKY.x1, (u, v) => v3(u, v, SKY.z0)); lw(SKY.x0, SKY.x1, (u, v) => v3(u, v, SKY.z1));
      lw(SKY.z0, SKY.z1, (u, v) => v3(SKY.x0, v, u)); lw(SKY.z0, SKY.z1, (u, v) => v3(SKY.x1, v, u));
      for (let i = 1; i < 4; i++) { const xx = SKY.x0 + (i * (SKY.x1 - SKY.x0)) / 4; fu.box(paint, xx - 0.025, SKY.y1 - 0.06, SKY.z0, xx + 0.025, SKY.y1, SKY.z1, "#3a3028"); }
      for (let i = 1; i < 4; i++) { const zz = SKY.z0 + (i * (SKY.z1 - SKY.z0)) / 4; fu.box(paint, SKY.x0, SKY.y1 - 0.06, zz - 0.025, SKY.x1, SKY.y1, zz + 0.025, "#3a3028"); }
      this.outMats.push(emissive(R, TX.skyTex(), SKY.x1 - SKY.x0, SKY.z1 - SKY.z0, MM(TRS((SKY.x0 + SKY.x1) / 2, SKY.y1 + 0.01, (SKY.z0 + SKY.z1) / 2), TRS(0, 0, 0, 0, Math.PI / 2)), 1.0));
      for (const [px, pz] of PENDANTS) {
        fu.rod(brass, v3(px, MY, pz), v3(px, 3.55, pz), 0.008, 4, "#8a6a2a");
        fu.sph(this.lampMat, TRS(px, 3.45, pz, 0, 0, 0, 0.1), 14, "#fff2d8");
        fu.cyl(brass, 0.04, 0.05, 0.05, 10, TRS(px, 3.56, pz), "#c89a3a");
      }
    }
    // ---------------- SKELLY's PLINTH (cream marble, a brass nameplate) + the velvet rope ring + the sign ----------------
    {
      const T = PLINTH_TOP[1] - MUSEUM[1];
      cs.rbox(marble, 1.02, 0.06, 1.02, 0.012, TRS(0, 0.03, 0), "#e8dcc4", 2);
      cs.rbox(marble, 0.86, T - 0.07, 0.86, 0.01, TRS(0, 0.06 + (T - 0.07) / 2, 0), "#fbf3e2", 2);
      cs.rbox(marble, 0.92, 0.025, 0.92, 0.008, TRS(0, T - 0.0125, 0), "#fffaf0", 2);
      b.plane(imat(S, { map: TX.brassTex("sk", [["SKELLY", 80], ["est. 1888", 50]], 1024, 300), spec: 80, specK: 1.0 }), 0.36, 0.075, TRS(0, 0.105, 0.4315));
      const posts: THREE.Vector3[] = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI / 2 - Math.PI / 6 + (k * Math.PI) / 3; posts.push(v3(Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05)); }
      for (const p of posts) {
        cs.cyl(brass, 0.11, 0.13, 0.03, 20, TRS(p.x, 0.015, p.z), "#c89a3a");
        cs.rod(brass, v3(p.x, 0.03, p.z), v3(p.x, 0.86, p.z), 0.017, 10, "#d8aa48");
        cs.sph(brass, TRS(p.x, 0.89, p.z, 0, 0, 0, 0.035), 12, "#f0c860");
      }
      for (let k = 0; k < 6; k++) { const a = posts[k], c = posts[(k + 1) % 6]; cs.tube(velvet, sag(v3(a.x, 0.84, a.z), v3(c.x, 0.84, c.z), 0.12), 0.019, 16, "#9a1a26", 8); }
      // PLEASE DO NOT TOUCH THE BONES (they're ticklish): hangs off the front rope
      const sx = -0.22, sz = 0.93;
      cs.box(paint, sx - 0.21, 0.49, sz - 0.004, sx + 0.21, 0.71, sz + 0.004, "#3a1e0c");
      b.plane(imat(S, { map: TX.touchTex(), self: [0.06, 0.06, 0.06], spec: 30, specK: 0.2 }), 0.4, 0.2, TRS(sx, 0.6, sz + 0.0055));
      for (const s of [-1, 1]) cs.rod(brass, v3(sx + s * 0.15, 0.71, sz), v3(sx + s * 0.13, 0.75, sz), 0.004, 4, "#c89a3a");
    }
    // ---------------- display cases: the GIANT EAR, the BRAIN in a jar, a jar of TEETH, a femur, a bench, a palm ----------------
    {
      const caseAt = (x: number, z: number, w: number, d: number, hb: number, hg: number) => {
        cs.rbox(wood, w, hb, d, 0.015, TRS(x, hb / 2, z), "#5a3018", 2);
        cs.box(wood, x - w / 2 - 0.02, hb - 0.04, z - d / 2 - 0.02, x + w / 2 + 0.02, hb, z + d / 2 + 0.02, "#3a1e0c");
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cs.box(wood, x + sx * w / 2 - 0.02, hb, z + sz * d / 2 - 0.02, x + sx * w / 2 + 0.02, hb + hg, z + sz * d / 2 + 0.02, "#3a1e0c");
        cs.box(wood, x - w / 2 - 0.02, hb + hg, z - d / 2 - 0.02, x + w / 2 + 0.02, hb + hg + 0.05, z + d / 2 + 0.02, "#3a1e0c");
      };
      // the EAR (right, back)
      caseAt(2.15, -5.3, 0.9, 0.7, 0.85, 1.0);
      {
        const ex = 2.15, ey = 1.35, ez = -5.35;
        cs.add(lump(0.28, 0.4, 0.07, 140, 0.1, 18, false), bone, TRS(ex, ey, ez, -0.3), "#f4b0a0");
        cs.torus(bone, 0.22, 0.05, TRS(ex + 0.02, ey + 0.04, ez + 0.05, -0.3), "#f8c0b0", Math.PI * 1.4, 8);
        cs.add(lump(0.08, 0.1, 0.05, 141, 0.1, 10, false), bone, TRS(ex - 0.02, ey - 0.02, ez + 0.07, -0.3), "#c87a78");
        cs.add(lump(0.07, 0.11, 0.05, 142, 0.1, 10, false), bone, TRS(ex + 0.03, ey - 0.33, ez + 0.02, -0.3), "#f4a898");
        cs.cyl(brass, 0.025, 0.03, 0.12, 8, TRS(ex, 0.92, ez), "#c89a3a");
        b.plane(imat(S, { map: TX.labelTex("ear", "THE EAR", "(x 20 · do not whisper)"), self: [0.05, 0.05, 0.05] }), 0.34, 0.17, TRS(ex, 0.55, -5.3 + 0.354));
      }
      // the BRAIN in a jar on a pedestal (left of the arch)
      {
        const px = -1.45, pz = -6.25;
        cs.rbox(marble, 0.42, 1.0, 0.42, 0.01, TRS(px, 0.5, pz), "#efe4cc", 2);
        cs.add(lump(0.12, 0.1, 0.14, 150, 0.22, 16, false), bone, TRS(px, 1.18, pz), "#f0a0a8");
        cs.lathe(glass, [[0.001, 0], [0.16, 0], [0.175, 0.03], [0.175, 0.36], [0.13, 0.4], [0.13, 0.44], [0.001, 0.44]], TRS(px, 1.0, pz), 24, "#cfe8e0");
        cs.cyl(brass, 0.14, 0.14, 0.04, 20, TRS(px, 1.46, pz), "#c89a3a");
        b.plane(imat(S, { map: TX.labelTex("brain", "BRAIN", "(on loan)"), self: [0.05, 0.05, 0.05] }), 0.3, 0.15, TRS(px, 0.78, pz + 0.2135));
      }
      // a jar of TEETH on a little table (left, back corner) + a big femur on a stand (right of the arch)
      {
        const tx = -2.55, tz = -6.3;
        cs.rbox(wood, 0.7, 0.04, 0.5, 0.01, TRS(tx, 0.8, tz), "#5a3018", 2);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) cs.rod(wood, v3(tx + sx * 0.3, 0, tz + sz * 0.2), v3(tx + sx * 0.3, 0.78, tz + sz * 0.2), 0.02, 6, "#3a1e0c");
        for (let i = 0; i < 26; i++) { const a = i * 2.4, rr = 0.03 + (i % 4) * 0.025; cs.add(lump(0.022, 0.03, 0.02, 160 + i, 0.2, 6, false), bone, TRS(tx + Math.cos(a) * rr, 0.86 + Math.floor(i / 7) * 0.05, tz + Math.sin(a) * rr, a), "#fffaf0"); }
        cs.lathe(glass, [[0.001, 0], [0.13, 0], [0.14, 0.03], [0.14, 0.3], [0.1, 0.33], [0.001, 0.33]], TRS(tx, 0.82, tz), 20, "#d8ecec");
        cs.cyl(brass, 0.1, 0.1, 0.03, 16, TRS(tx, 1.16, tz), "#c89a3a");
        b.plane(imat(S, { map: TX.labelTex("teeth", "TEETH", "(assorted, mostly)"), self: [0.05, 0.05, 0.05] }), 0.26, 0.13, TRS(tx, 0.7, tz + 0.27));
        const fx = 1.75, fz = -6.4;
        cs.rbox(wood, 0.36, 0.06, 0.36, 0.01, TRS(fx, 0.03, fz), "#3a1e0c", 2);
        cs.rod(brass, v3(fx, 0.06, fz), v3(fx, 0.5, fz), 0.015, 8, "#c89a3a");
        cs.rod(bone, v3(fx - 0.02, 0.5, fz), v3(fx + 0.02, 1.55, fz), 0.045, 12, "#f8f0dc");
        for (const yy of [0.5, 1.55]) for (const s of [-1, 1]) cs.sph(bone, TRS(fx + s * 0.05, yy, fz, 0, 0, 0, 0.065), 12, "#f8f0dc");
      }
      // a long bench facing the portraits (low: below the portrait frames)
      cs.rbox(wood, 0.42, 0.06, 2.4, 0.015, TRS(-2.3, 0.44, -3.0), "#6a3a1c", 2);
      for (const zz of [-4.0, -2.0]) cs.box(wood, -2.48, 0, zz - 0.04, -2.12, 0.41, zz + 0.04, "#3a1e0c");
      // a potted palm in the front-right corner (seen on the descent)
      cs.lathe(gloss, [[0.001, 0], [0.18, 0], [0.24, 0.45], [0.26, 0.48], [0.001, 0.48]], TRS(2.9, 0, 3.2), 20, "#2a5a8a");
      for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; cs.add(lump(0.08, 0.5, 0.03, 170 + k, 0.05, 10, false), leaf, TRS(2.9 + Math.cos(a) * 0.25, 1.05, 3.2 + Math.sin(a) * 0.25, -a, 0, 0.7), LEAFC[k % 3]); }
    }
    b.build(R); fu.build(R, false);
    this.casters = cs.build(R, false);
    const gl: GlowItem[] = [];
    PORTRAITS.forEach((P, i) => gl.push(i < 3 ? { p: v3(MX0 + 0.2, P.c[1] - MUSEUM[1] + P.h / 2 + 0.2, P.c[2] - MUSEUM[2]), c: [0.6, 0.45, 0.22], s: 0.42, g: 0 } : { p: v3(MX0 + 0.16, P.c[1] - MUSEUM[1] + P.h / 2 + 0.14, P.c[2] - MUSEUM[2] + 0.1), c: [0.35, 0.4, 0.45], s: 0.22, g: 0 }));
    for (const [px, pz] of PENDANTS) gl.push({ p: v3(px, 3.45, pz), c: [0.5, 0.4, 0.24], s: 0.7, g: 0 });
    this.glows = new Glows(R, gl, 0.6);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number) {
    const S = this.S, O = this.root.position, W = (x: number, y: number, z: number) => v3(x + O.x, y + O.y, z + O.z);
    const rg = rigAt(id, f), look = SHOTS[id - 1].look;
    const match = worldSun(id, look).angleTo(MU_SUN) < THREE.MathUtils.degToRad(4);
    S.u.uMapK.value = match ? 1 : 0;
    for (const m of this.casters) m.castShadow = match;
    (S.u.uSD.value as THREE.Vector3).copy(MU_SUN); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    setAperture(S, 0, { c: W(MX1, (MWIN.y0 + MWIN.y1) / 2, (MWIN.z0 + MWIN.z1) / 2), n: v3(-1, 0, 0), u: v3(0, 0, 1), v: v3(0, 1, 0), hw: (MWIN.z1 - MWIN.z0) / 2, hh: (MWIN.y1 - MWIN.y0) / 2, bays: MWIN.bays, pier: MWIN.pier, arch: true, cols: 3, rows: 6, bar: 0.02 });
    setAperture(S, 1, null);
    (S.u.uLf.value as THREE.Vector3[]).forEach((L) => L.set(0, 0, 0));
    S.u.uDK.value = 0;
    (S.u.uO.value as THREE.Vector3).copy(O);
    (S.u.uBA0.value as THREE.Vector3).set(MX0, 0, MZ0); (S.u.uBA1.value as THREE.Vector3).set(MX1, MY, MZ1);
    (S.u.uBB0.value as THREE.Vector3).set(-2.4, 0, MZ0 - 3.4); (S.u.uBB1.value as THREE.Vector3).set(2.4, 3.8, MZ0);
    S.u.uAO.value = 1; S.u.uTT.value = t; S.u.uFogCap.value = 0.6;
    // the stage SPOT (look pun): from the ceiling, a hot pool round the plinth + plaque
    const sp = W(-0.35, MY - 0.1, 1.5), tgt = W(-0.25, 0, 0.05), dir = tgt.clone().sub(sp), dl = dir.length(); dir.normalize();
    (S.u.uSpP.value as THREE.Vector4).set(sp.x, sp.y, sp.z, Math.cos(Math.atan2(1.05, dl))); (S.u.uSpD.value as THREE.Vector3).copy(dir); (S.u.uSpC.value as THREE.Vector3).set(...rg.spot);
    const bo = rg.bounce, lp = rg.lamp, k = rg.kfill;
    setLights(S, [
      { p: W(0.3, 0.3, 0.3), c: bo, r: 2.2 },                                          // sun bounce off the beams on the floor
      { p: W(-1.6, 0.3, -2.0), c: bo, r: 2.2 },
      { p: W(2.7, 2.2, -3.0), c: [bo[0] * 0.5, bo[1] * 0.55, bo[2] * 0.7], r: 3.0 },  // window glow
      { p: W(0.4, 2.0, 4.6), c: rg.fill, r: 4.5 },                                     // cool fill (skylight)
      { p: W(0, 2.2, -8.8), c: k, r: 2.8 },                                            // the next gallery's warm light
      ...PORTRAITS.map((P, i) => ({ p: W(MX0 + (i < 3 ? 0.35 : 0.7), P.c[1] - MUSEUM[1] + (i < 3 ? 0.35 : 0.15), P.c[2] - MUSEUM[2]), c: (i < 3 ? [0.55 * lp, 0.4 * lp, 0.2 * lp] : [1.15 * lp, 1.1 * lp, 1.0 * lp]) as C3, r: i < 3 ? 1.0 : 2.5 })), // (cam) 2026: further off the wall, wider + warmer: the frame corners were dark at 983
      { p: W(-1.6, 3.3, -3.0), c: [0.16 * lp, 0.12 * lp, 0.07 * lp], r: 2.2 },          // the pendant globes
      { p: W(1.6, 3.3, 1.6), c: [0.16 * lp, 0.12 * lp, 0.07 * lp], r: 2.2 },
      { p: W(-0.3, 0.4, 0.4), c: [rg.spot[0] * 0.05, rg.spot[1] * 0.04, rg.spot[2] * 0.03], r: 1.6 },  // the spot's bounce
    ], rg.au, rg.ad);
    for (const m of this.outMats) m.color.setScalar(rg.outK);
    (this.lampMat.uniforms.uEm.value as THREE.Vector3).set(0.2 + 2.6 * lp, 0.16 + 2.1 * lp, 0.1 + 1.3 * lp);
    this.glows.gk.set(lp, 0, 0, 0); this.glows.mat.uniforms.uT.value = t; this.glows.mesh.visible = lp > 0.02;
  }
}

// ============================================================================ Sets (world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
/** per shot: [px, py, pz, lx, ly, lz, fov] (local to the shot's place) */
const DEBUG_VIEW: Record<number, number[]> = { 1: [2.6, 1.5, 2.2, 0.0, 1.0, -1.6, 55], 5: [1.5, 2.2, 6.0, -0.5, 1.2, -3.0, 60] };
export class Sets {
  root = new THREE.Group();
  private hall = new Hallway();
  private museum = new Museum();
  constructor() { this.root.add(this.hall.root, this.museum.root); }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[id]) {
      const o: V3 = place === "museum" ? MUSEUM : HALL, d = DEBUG_VIEW[id];
      cam.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); cam.up.set(0, 1, 0); cam.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); cam.fov = d[6]; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    this.hall.root.visible = place === "hall";
    this.museum.root.visible = place === "museum";
    if (this.hall.root.visible) this.hall.update(id, t, f);
    if (this.museum.root.visible) this.museum.update(id, t, f);
  }
}
