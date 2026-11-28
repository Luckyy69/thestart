// OWNER: arm agent. INSIDE BEAN's ARM (shots 2 + 4), ARM = (1000,0,0): the cavern, the NERVE CABLE (ulnar nerve as a
// glowing power cable on posts with a lamp on each), its padding cushions, the NECK SUBSTATION, the ELBOW GAP (bone knob,
// muscle wall, thin SKIN ROOF that dents on the whack), the SURGE glow along the cable, and PINKY TOWN.
// Layout (ARM-local, metres; floor y 0):
//   An HOURGLASS shell lofted along x (X0 -21.5 .. X1 29.5): the UPPER-ARM chamber (x < -2.9: half-width 9.6, roof
//   9.5), the FOREARM chamber (x > 2.9: half-width 7.4 -> 8.6, roof 8.4 -> 11.3 over Pinky Town) and between them the
//   walls + roof pinch (|x| < 2.85) into the LOW ELBOW ARCH (half-width 1.6, roof = ROOF_Y 2.45 at x 0). The walls are
//   giant striped MUSCLE ropes running along the arm; the roofs of both chambers are lined with pillowy cream FAT
//   cushions; the long white HUMERUS ridge runs along the upper chamber's -z wall and curls into the BONE KNOB
//   (BONE_KNOB, faint stencil "HUMERUS") at the arch: the cable squeezes under it. The arch's roof is a thin
//   translucent SKIN membrane (sunlit, pores, hair silhouettes, the door-frame shadow) that DENTS (roofDent) on the
//   whack; the forearm chamber's roof over Pinky Town is the same glowing skin (the "skin sky" the 4->5 rise goes into).
//   The CABLE (CABLE_PTS) runs on wooden posts with a hanging lamp each (LAMPS), wrapped between the posts in fluffy pink
//   zip-tied PADDING cushions everywhere EXCEPT the elbow gap (bare x -2.6..3.0). The NECK SUBSTATION at (-16.95,1.25,0),
//   fingerpost "ELBOW 2 km / PINKY TOWN" at (-9.6,0,-1.55), "CAUTION LIVE!" at (-2.75,0,-1.4). Pinky Town: arm_town.ts.
// Clearances kept: the shot 4 RIDE passes the arch at y ~1.55, z ~0.55 under the residual dent (roof 2.45 - 0.35 = 2.1
// at x 0); no posts / cushions / signs within 1 m of the ride; the 189 long view sees through the arch to the town.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { ctex } from "../bridge/paint";
import { SHOTS, ARM, V3, W, BEAT, FPS, armAt, surgeAt, clamp01, smooth } from "./story";
import { AU, GLSL_NOISE, GLSL_CAB, amat, tubeGeo, blobGeo, pillowGeo, C, h1, vn, lerp, sm, spr, TAU, hash, softTex, plateTex, dialTex, arrowTex, cautionTex, knobTex } from "./arm_kit";
import { buildTown, Town, PINKY_HOUSE_L, RING_HOUSE_L } from "./arm_town";

const Ar = (x: number, y: number, z: number): V3 => [ARM[0] + x, ARM[1] + y, ARM[2] + z];
// ---------------- CONTRACTS (world metres) ----------------
/** the cable's control points, NECK (u = 0) -> PINKY TOWN pole top (u = 1). Catmull-Rom (centripetal). */
export const CABLE_PTS: V3[] = [Ar(-16, 1.2, 0), Ar(-10, 1.05, 0.6), Ar(-4.5, 1.0, -0.3), Ar(-1.6, 0.92, 0), Ar(0, 0.9, 0), Ar(1.6, 0.92, 0),
  Ar(5, 1.0, 0.5), Ar(11, 1.1, -0.3), Ar(15.6, 1.4, 0), Ar(16, 3.2, 0)];
const CURVE = new THREE.CatmullRomCurve3(CABLE_PTS.map((p) => new THREE.Vector3(...p)), false, "centripetal");
/** a point on the cable at arc-length fraction u (0 = neck, 1 = town pole top) */
export const cablePt = (u: number): V3 => { const v = CURVE.getPointAt(clamp01(u)); return [v.x, v.y, v.z]; };
export const CABLE_LEN = CURVE.getLength();
export const CABLE_R = 0.16; // cable radius (m)
/** arc-length fraction of the elbow gap centre */
export const ELBOW_U = (() => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = CURVE.getPointAt(i / 400); const d = Math.abs(p.x - (ARM[0] + 0)); if (d < bd) { bd = d; best = i / 400; } } return best; })();
export const NECK_AT: V3 = Ar(-16, 0, 0);          // substation base (the box spans x -17.9..-16.0, the cable leaves its +x face)
export const ELBOW_GAP: V3 = Ar(0, 0, 0);          // gap floor centre (tunnel x -1.6..+1.6)
export const BONE_KNOB: V3 = Ar(0, 1.2, -1.6);     // medial epicondyle boulder centre (r 1.2)
export const ROOF_Y = 2.45;                        // skin roof height at rest (local y) at x 0 (arm agent: was 2.3)
export const ROOF_SPAN: [number, number] = [-1.6, 1.6]; // roof x extent (local)
/** the roof dent (m, downward) at local x along the roof, for frame (id,t): the door frame pushes it toward the cable.
 *  Shot 2: armAt.dent (1.0 m: the slam presses the membrane down toward the cable; the fx door frame's bullnose is
 *  built for D <= 1.06), eases back to 0.35; shot 4: the
 *  leftover dent 0.35 (the RIDE camera passes under it at y 1.55). */
export const roofDent = (id: number, t: number, lx = 0) => (id === 2 ? armAt(id, t).dent : id === 4 ? 0.35 : 0) * Math.exp(-(lx * lx) / 0.5);
export const SIGN_AT: V3 = Ar(0.65, 0, 0.55);      // the NO PADDING sign-holder's soles (cast). (cam) was (0.9,0,1.25): moved beside the gap so the +z gap camera holds both
export const TOWN_POLE: V3 = Ar(16, 0, 0);
export const PINKY_AT: V3 = Ar(18.2, 0, 1.0);      // PINKY's soles (cast)
export const RING_AT: V3 = Ar(18.2, 0, -0.5);      // RING's soles (cast)
export const PINKY_HOUSE: V3 = Ar(...PINKY_HOUSE_L);
export const RING_HOUSE: V3 = Ar(...RING_HOUSE_L);
export const OTHERS_AT: V3 = Ar(22.5, 0, -3.5);    // the other fingers (median line, unbothered)

// cable arc-length table (local)
const NT = 2400;
const CT: V3[] = Array.from({ length: NT + 1 }, (_, i) => { const p = CURVE.getPointAt(i / NT); return [p.x - ARM[0], p.y, p.z]; });
const ctAt = (u: number): V3 => CT[Math.round(clamp01(u) * NT)];
const tanAt = (u: number) => { const a = ctAt(u - 0.002), b = ctAt(u + 0.002); const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]); return v.normalize(); };
const uAtX = (x: number) => { let best = 0, bd = 1e9; for (let i = 0; i <= NT; i += 2) { const d = Math.abs(CT[i][0] - x); if (d < bd && CT[i][1] < 2) { bd = d; best = i / NT; } } return best; };
/** padded zones (local x): the cable is bare through the elbow gap and at both ends */
const ZONES: [number, number][] = [[-15.4, -2.6], [3.0, 15.0]];
/** post runs: the forearm side starts at x 4.3 so the shot 4 RIDE (rising out of the arch toward +z) clears the lamps */
const POST_ZONES: [number, number][] = [[-15.4, -2.6], [4.3, 15.0]];
const POST_SPACING = 1.55;
const POST_U: number[] = (() => {
  const out: number[] = [];
  for (const [x0, x1] of POST_ZONES) {
    const u0 = uAtX(x0) + 0.25 / CABLE_LEN, u1 = uAtX(x1);
    const n = Math.max(1, Math.round(((u1 - u0) * CABLE_LEN) / POST_SPACING));
    for (let i = 0; i <= n; i++) out.push(u0 + ((u1 - u0) * i) / n);
  }
  return out;
})();
/** post / lamp positions along the cable (lamp centre = the bulb hanging 0.55 m over the cable), each with its
 *  arc-length fraction. No posts in the elbow gap (x -2.6..4.3). */
export const LAMPS: { p: V3; u: number }[] = POST_U.map((u) => { const c = cablePt(u); return { p: [c[0], c[1] + 0.55, c[2]] as V3, u }; });
/** the surge's lit span along the cable for (id,t): every u in [lo, hi] is lit (the front runs from ELBOW_U outward
 *  to both ends with surgeAt.line). Shot 2 sparks only (no span). */
export const surgeSpan = (id: number, t: number): { lo: number; hi: number; k: number } => {
  const s = surgeAt(id, t);
  if (id !== 4) return { lo: ELBOW_U, hi: ELBOW_U, k: 0 };
  return { lo: ELBOW_U - s.line * ELBOW_U, hi: ELBOW_U + s.line * (1 - ELBOW_U), k: 1 - 0.5 * s.calm };
};
/** shot 4: the time (s) the surge front passes arc length u (surgeAt.line = ramp(t, W.the2 - 0.1, 1.0)) */
const LINE_T0 = W.the2 - 0.1, LINE_D = 1.0;
const passT = (u: number) => {
  const l = u < ELBOW_U ? (ELBOW_U - u) / ELBOW_U : (u - ELBOW_U) / (1 - ELBOW_U);
  let a = 0, b = 1;
  for (let i = 0; i < 22; i++) { const m = (a + b) / 2; if (smooth(m) < l) a = m; else b = m; }
  return LINE_T0 + ((a + b) / 2) * LINE_D;
};

// ============================== the hourglass shell ==============================
const X0 = -21.5, X1 = 29.5;
type Sec = { cy: number; Bu: number; Bl: number; Ap: number; An: number; eu: number; k: number; kc: number };
const TUN = { cy: 1.0, Bu: ROOF_Y - 1.0, Bl: 1.6, Ap: 3.1, An: 1.6, eu: 0.92 }; // +z opens wide (the elbow cameras look in from +z); the muscle bulge pinches the cable
const sec = (x: number): Sec => {
  const k = sm((Math.abs(x) - 1.15) / 1.7);
  let ch;
  if (x < 0) ch = { cy: 3.4, Bu: 6.1, Bl: 5.0, Ap: 9.6, An: 9.6, eu: 0.8 };
  else { const f = sm((x - 11) / 4); ch = { cy: lerp(3.0, 3.4, f), Bu: lerp(5.4, 7.9, f), Bl: 4.6, Ap: lerp(7.4, 8.6, f), An: lerp(7.4, 8.6, f), eu: 0.8 }; }
  const a = X0 + 2.8, b = X1 - 3.2;
  const kc = (x < a ? Math.sqrt(Math.max(0, 1 - ((x - a) / 2.8) ** 2)) : 1) * (x > b ? Math.sqrt(Math.max(0, 1 - ((x - b) / 3.2) ** 2)) : 1);
  const m = (p: number, q: number) => lerp(p, q, k);
  return { cy: m(TUN.cy, ch.cy), Bu: m(TUN.Bu, ch.Bu) * kc, Bl: m(TUN.Bl, ch.Bl) * Math.max(kc, 0.2), Ap: m(TUN.Ap, ch.Ap) * kc, An: m(TUN.An, ch.An) * kc, eu: m(TUN.eu, ch.eu), k, kc };
};
/** skin weight: the arch roof membrane + the town sky */
const skinW = (x: number, s: number) => Math.max(Math.exp(-((x / 1.35) ** 4)) * sm((s - 0.45) / 0.3), sm((x - 11.5) / 2.5) * sm((s - 0.2) / 0.35) * sm((X1 - 0.6 - x) / 1.5));
/** where the fat cushions line the roof (ropes flatten there) */
const cushZone = (x: number) => (x < 0 ? sm((x + 19.6) / 1.0) * (1 - sm((x + 4.2) / 0.8)) : sm((x - 4.0) / 0.8) * (1 - sm((x - 11.8) / 0.8)));
const NF = 34;
/** raw shell point at (x, angle th): th = -PI/2 floor centre, 0 = +z wall, PI/2 roof, PI = -z wall */
const shellRaw = (x: number, th: number, ropes = true) => {
  const D = sec(x), c = Math.cos(th), s = Math.sin(th), up = s > 0;
  const e = up ? D.eu : 0.5, B = up ? D.Bu : D.Bl, A = c > 0 ? D.Ap : D.An;
  let pz = A * Math.sign(c) * Math.abs(c) ** e, py = B * Math.sign(s) * Math.abs(s) ** e;
  const sk = skinW(x, s);
  let fold = 0, amp = 0;
  if (ropes) {
    const ph = (th * NF) / TAU + 0.3 * Math.sin(0.35 * x + 2.0 * th) + 0.15 * Math.sin(0.9 * x - 3 * th + 1);
    fold = Math.pow(0.5 + 0.5 * Math.cos(TAU * ph), 1.6);
    amp = 0.62 * sm((s + 0.5) / 0.35) * sm((D.k - 0.12) / 0.6) * D.kc * D.kc * (1 - sk) * (1 - 0.85 * sm((s - 0.42) / 0.16) * cushZone(x));
    const und = 0.1 * vn(x * 0.4 + th * 2, th * 3 + 5) * sm((s + 0.5) / 0.35) * D.kc;
    const rr = Math.hypot(pz, py) || 1, off = -amp * fold + und;
    pz += (pz / rr) * off; py += (py / rr) * off;
  }
  const y = Math.max(0, D.cy + py);
  return { y, z: pz, s, c, fold, amp, sk, D };
};
/** the smooth wall's point on the -z side at height y (for the bone ridge) + the inward normal there */
const wallPtNeg = (x: number, y: number) => {
  let a = Math.PI / 2 + 0.02, b = 1.5 * Math.PI - 0.05;
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (shellRaw(x, m, false).y > y) a = m; else b = m; }
  const th = (a + b) / 2, p = shellRaw(x, th, false);
  const px = shellRaw(x + 0.05, th, false), pt = shellRaw(x, th + 0.01, false);
  const dX = new THREE.Vector3(0.05, px.y - p.y, px.z - p.z), dT = new THREE.Vector3(0, pt.y - p.y, pt.z - p.z);
  const n = new THREE.Vector3().crossVectors(dX, dT).normalize();
  if (n.z < 0) n.negate();
  return { p: new THREE.Vector3(x, p.y, p.z), n };
};

const hazardTex = () => ctex("fnArmHazard", 512, 64, (g) => {
  g.fillStyle = "#ffd23a"; g.fillRect(0, 0, 512, 64);
  g.fillStyle = "#1c1420"; for (let x = -64; x < 560; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill(); }
});

const sheathMat = () => new THREE.ShaderMaterial({
  uniforms: { ...AU, uGain: { value: 1 } },
  vertexShader: /* glsl */ `attribute float aU; varying float vU; varying vec3 vW; varying vec3 vN;
    void main(){ vU = aU; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform float uGain; uniform float uT; varying float vU; varying vec3 vW; varying vec3 vN;
    ${GLSL_NOISE}
    ${GLSL_CAB}
    void main(){
      vec3 V = normalize(cameraPosition - vW);
      float c = abs(dot(normalize(vN), V));
      float L = cabL(vU);
      float a = pow(c, 2.2) * (0.85 + 0.15 * sin(vU * 260.0 - uT * 9.0));
      float dc = length(cameraPosition - vW);
      a *= smoothstep(0.7, 2.0, dc);
      gl_FragColor = vec4(cabC(vU, L) * L * a * 0.32 * uGain, 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide,
});

const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; return o;
};
/** merge simple geometries (position + normal) */
const merge = (gs: THREE.BufferGeometry[]) => {
  const P: number[] = [], N: number[] = [], I: number[] = [];
  let off = 0;
  for (const g of gs) {
    const p = g.getAttribute("position"), n = g.getAttribute("normal");
    for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(n.getX(i), n.getY(i), n.getZ(i)); }
    if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) I.push(i + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); out.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3)); out.setIndex(I);
  return out;
};
/** a box between two points (thickness w x h) */
const beamGeo = (a: THREE.Vector3, b: THREE.Vector3, w: number, h: number) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.BoxGeometry(w, h, L);
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), d, Math.abs(d.y / L) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
  m.setPosition(a.clone().add(b).multiplyScalar(0.5));
  return g.applyMatrix4(m);
};

// ============================== Arm ==============================
export class Arm {
  root = new THREE.Group();
  private patch!: THREE.Mesh; private patchRest!: Float32Array; private patchNrm!: Float32Array; private patchX!: Float32Array; private patchW!: Float32Array; private patchEdge!: Uint8Array; private lastDent = -1;
  private cable!: THREE.Mesh; private cableRest!: Float32Array; private cableC!: Float32Array; private cableU!: Float32Array; private cableNA = 14; private cableDirty = false;
  private lampBulbs!: THREE.InstancedMesh; private lampHalos: THREE.Sprite[] = [];
  private town!: Town;
  private needles: THREE.Group[] = []; private humMat!: THREE.MeshBasicMaterial; private humHalo!: THREE.Sprite;
  private col = new THREE.Color();

  constructor() {
    const R = this.root;
    R.position.set(...ARM);
    R.visible = false;
    this.buildShell();
    this.buildBone();
    this.buildCable();
    this.buildPosts();
    this.buildSubstation();
    this.buildSigns();
    this.town = buildTown(); R.add(this.town.G);
    R.traverse((o) => { o.frustumCulled = false; });
  }

  // ---------------- shell (main + the dentable roof patch over the arch) ----------------
  private buildShell() {
    const R = this.root, NA = 176, xs: number[] = [];
    for (let x = X0; x <= X1 + 1e-6;) { xs.push(x); x += Math.abs(x) < 3.2 ? 0.08 : 0.2; }
    const nr = xs.length, nv = nr * (NA + 1);
    const pos = new Float32Array(nv * 3), col = new Float32Array(nv * 3), cab = new Float32Array(nv * 2), skn = new Float32Array(nv), sv = new Float32Array(nv);
    const tc = new THREE.Color();
    const wallC = C("#d8465a"), crest = C("#ff9a88"), valley = C("#6a1430"), floorC = C("#c2505c"), roofC = C("#e2606c"), skinC = C("#ffc6a2"), waistC = C("#a82a44");
    const CS: V3[] = []; for (let i = 0; i <= 600; i++) CS.push(CT[Math.round((i / 600) * NT)]);
    xs.forEach((x, i) => {
      for (let j = 0; j <= NA; j++) {
        const th = -Math.PI / 2 + (j / NA) * TAU, P = shellRaw(x, th), v = i * (NA + 1) + j, k = v * 3;
        pos[k] = x; pos[k + 1] = P.y; pos[k + 2] = P.z;
        sv[v] = P.s; skn[v] = P.sk;
        tc.copy(wallC).lerp(floorC, sm((-P.s - 0.35) / 0.4)).lerp(roofC, sm((P.s - 0.3) / 0.5));
        const ak = Math.min(1, P.amp / 0.3);
        tc.lerp(crest, 0.65 * P.fold * P.fold * ak).lerp(valley, 0.6 * (1 - P.fold) ** 2 * ak);
        tc.lerp(waistC, 0.45 * (1 - P.D.k) * (1 - P.sk) * sm((P.s + 0.6) / 0.3));
        tc.multiplyScalar(1 + 0.08 * vn(x * 0.8 + 7, th * 4));
        tc.lerp(skinC, P.sk);
        col[k] = tc.r; col[k + 1] = tc.g; col[k + 2] = tc.b;
        let bd = 1e9, bu = 0;
        for (let q = 0; q < CS.length; q++) { const c = CS[q], d = (c[0] - x) ** 2 + (c[1] - P.y) ** 2 + (c[2] - P.z) ** 2; if (d < bd) { bd = d; bu = q / 600; } }
        cab[v * 2] = Math.sqrt(bd); cab[v * 2 + 1] = bu;
      }
    });
    const idxAll: number[] = [];
    for (let i = 0; i < nr - 1; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1; idxAll.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aCab", new THREE.BufferAttribute(cab, 2)); g.setAttribute("aSkin", new THREE.BufferAttribute(skn, 1));
    g.setIndex(idxAll); g.computeVertexNormals();
    const ti = Math.floor(nr * 0.3) * (NA + 1) + 2; // a floor vertex: its normal must point up (into the cavern)
    if ((g.getAttribute("normal") as THREE.BufferAttribute).getY(ti) < 0) { for (let i = 0; i < idxAll.length; i += 3) { const t = idxAll[i + 1]; idxAll[i + 1] = idxAll[i + 2]; idxAll[i + 2] = t; } g.setIndex(idxAll); g.computeVertexNormals(); }
    const nrm = (g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array;
    // split: the roof patch over the arch (|x| <= 2.5, s > 0.1) is its own small mesh so the dent can move it
    const inP = (v: number) => Math.abs(pos[v * 3]) <= 2.5 + 1e-4 && sv[v] > 0.1;
    const mainIdx: number[] = [], patchTris: number[] = [];
    for (let t = 0; t < idxAll.length; t += 3) { const a = idxAll[t], b = idxAll[t + 1], c = idxAll[t + 2]; if (inP(a) && inP(b) && inP(c)) patchTris.push(a, b, c); else mainIdx.push(a, b, c); }
    g.setIndex(mainIdx);
    const shellMat = amat("flesh", { vc: true, spec: 0.42, shin: 36, rim: [0.42, 0.16, 0.14] });
    const main = mesh(g, shellMat); main.castShadow = false; R.add(main);
    const map = new Map<number, number>(), list: number[] = [];
    for (const v of patchTris) if (!map.has(v)) { map.set(v, list.length); list.push(v); }
    const n = list.length, pp = new Float32Array(n * 3), pn = new Float32Array(n * 3), pc = new Float32Array(n * 3), pcab = new Float32Array(n * 2), psk = new Float32Array(n), px = new Float32Array(n), pw = new Float32Array(n), edge = new Uint8Array(n);
    list.forEach((v, i) => {
      for (let q = 0; q < 3; q++) { pp[i * 3 + q] = pos[v * 3 + q]; pn[i * 3 + q] = nrm[v * 3 + q]; pc[i * 3 + q] = col[v * 3 + q]; }
      pcab[i * 2] = cab[v * 2]; pcab[i * 2 + 1] = cab[v * 2 + 1]; psk[i] = skn[v];
      px[i] = pos[v * 3]; pw[i] = sm((sv[v] - 0.3) / 0.45);
      edge[i] = Math.abs(pos[v * 3]) > 2.45 || sv[v] < 0.16 ? 1 : 0;
    });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("normal", new THREE.BufferAttribute(pn, 3)); pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    pg.setAttribute("aCab", new THREE.BufferAttribute(pcab, 2)); pg.setAttribute("aSkin", new THREE.BufferAttribute(psk, 1));
    pg.setIndex(patchTris.map((v) => map.get(v)!));
    this.patch = mesh(pg, shellMat); this.patch.castShadow = false; R.add(this.patch);
    this.patchRest = new Float32Array(pp); this.patchNrm = new Float32Array(pn); this.patchX = px; this.patchW = pw; this.patchEdge = edge;

    // ---- the fat cushions lining both chambers' roofs ----
    {
      const spots: { p: THREE.Vector3; n: THREE.Vector3; s: number; r: number }[] = [];
      let row = 0;
      for (let x = -18.6; x <= 11.4; x += 2.3, row++) {
        if (cushZone(x) < 0.9) continue;
        for (const dir of [1, -1]) {
          let th = Math.PI / 2, acc = dir > 0 ? (row % 2 ? 1.05 : 2.1) : (row % 2 ? 1.05 : 0);
          let prev = shellRaw(x, th, false);
          for (let k = 0; k < 600; k++) {
            th += dir * 0.004;
            const P = shellRaw(x, th, false);
            acc += Math.hypot(P.y - prev.y, P.z - prev.z); prev = P;
            if (P.s < 0.5) break;
            if (acc >= 2.1) {
              acc -= 2.1;
              const ctr = new THREE.Vector3(x, P.D.cy, 0), p = new THREE.Vector3(x, P.y, P.z), nIn = ctr.clone().sub(p).setX(0).normalize();
              spots.push({ p, n: nIn, s: 0.92 + 0.16 * h1(spots.length * 3 + 1), r: (h1(spots.length * 7 + 2) - 0.5) * 0.3 });
            }
          }
        }
      }
      const im = new THREE.InstancedMesh(pillowGeo(), amat("plain", { vc: true, spec: 0.35, shin: 30, rim: [0.4, 0.32, 0.14] }), spots.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      spots.forEach((S, i) => {
        q.setFromUnitVectors(up, S.n); q2.setFromAxisAngle(S.n, S.r); q.premultiply(q2);
        m4.compose(S.p.clone().addScaledVector(S.n, 0.18), q, new THREE.Vector3(1.12 * S.s, 0.95 * S.s, 1.0 * S.s));
        im.setMatrixAt(i, m4);
        im.setColorAt(i, new THREE.Color().setHSL(0.13 + 0.02 * h1(i), 1, 0.97 + 0.03 * h1(i + 4)));
      });
      im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
    }
  }

  // ---------------- the HUMERUS ridge + the bone knob ----------------
  private buildBone() {
    const R = this.root, pts: V3[] = [], rads: number[] = [];
    const K = new THREE.Vector3(BONE_KNOB[0] - ARM[0] - 0.4, BONE_KNOB[1], BONE_KNOB[2]);
    for (let x = -19.8; x <= -1.0 + 1e-6; x += 0.25) {
      const y = x < -3.6 ? 2.55 + 0.08 * Math.sin(x * 0.5) : lerp(2.55, 1.45, sm((x + 3.6) / 2.6));
      const W0 = wallPtNeg(x, y), r = x < -18.6 ? lerp(0.95, 0.72, sm((x + 19.8) / 1.2)) : 0.72 + 0.04 * Math.sin(x * 1.3);
      const p = W0.p.addScaledVector(W0.n, 0.3);
      if (x > -2.2) p.lerp(K, sm((x + 2.2) / 1.2));
      pts.push([p.x, p.y, p.z]); rads.push(r);
    }
    const ns = pts.length - 1;
    const g = tubeGeo(pts, (u) => rads[Math.round(u * ns)] * (1 + 0.05 * Math.sin(u * 60)), 22, (u, a) => C("#f6ecd6").lerp(C("#e0caa0"), 0.4 * (0.5 + 0.5 * Math.sin(a * 3 + u * 40))), true);
    R.add(mesh(g, amat("bone", { vc: true, spec: 0.35, shin: 40, rim: [0.3, 0.28, 0.22] })));
    const kg = new THREE.SphereGeometry(1.2, 56, 36);
    { const p = kg.getAttribute("position") as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.04 * vn(x * 2.2 + 3, y * 2.2 + z * 1.7); p.setXYZ(i, x * k * 1.08, y * k, z * k); } kg.computeVertexNormals(); }
    const knob = mesh(kg, amat("bone", { map: knobTex(), spec: 0.35, shin: 40, rim: [0.3, 0.28, 0.22] }), BONE_KNOB[0] - ARM[0], BONE_KNOB[1], BONE_KNOB[2]);
    const want = new THREE.Vector2(-3.4, 4.6).normalize(); // text toward the elbow cameras (-x, +z)
    knob.rotation.y = Math.atan2(-want.y, want.x);
    R.add(knob);
  }

  // ---------------- the cable + glow sheath + padding + zip ties ----------------
  private buildCable() {
    const R = this.root, NS = 900, pts: V3[] = [];
    for (let i = 0; i <= NS; i++) pts.push(ctAt(i / NS));
    const gapK = (u: number) => Math.exp(-(((u - ELBOW_U) / 0.035) ** 2));
    const g = tubeGeo(pts, (u) => CABLE_R * (1 - 0.14 * gapK(u)) * (u > 0.995 ? 0.7 : 1), this.cableNA, undefined, true, (u) => u);
    this.cable = mesh(g, amat("cable", { color: "#ffcf3a", spec: 0.85, shin: 70, rim: [0.4, 0.3, 0.08] })); R.add(this.cable);
    this.cableRest = new Float32Array((g.getAttribute("position") as THREE.BufferAttribute).array as Float32Array);
    this.cableC = new Float32Array(pts.flat()); this.cableU = new Float32Array(pts.map((_, i) => i / NS));
    const sg = tubeGeo(pts.filter((_, i) => i % 3 === 0), () => 0.46, 12, undefined, false, (u) => u);
    const sh = new THREE.Mesh(sg, sheathMat()); sh.layers.set(NOINK); sh.renderOrder = 4; sh.frustumCulled = false; R.add(sh);
    // padding: fluffy pink zip-tied cushions between the posts, in the padded zones only
    const segs: [number, number][] = [];
    const gapU = 0.24 / CABLE_LEN;
    for (const [x0, x1] of ZONES) {
      const u0 = uAtX(x0), u1 = uAtX(x1), ps = POST_U.filter((u) => u >= u0 - 1e-6 && u <= u1 + 1e-6);
      const cuts = [u0, ...ps, u1];
      for (let i = 0; i < cuts.length - 1; i++) { const a = cuts[i] + (i === 0 ? 0 : gapU), b = cuts[i + 1] - (i + 1 === cuts.length - 1 ? 0 : gapU); if ((b - a) * CABLE_LEN > 0.45) segs.push([a, b]); }
    }
    const geos: THREE.BufferGeometry[] = [], ties: { p: V3; t: THREE.Vector3; r: number }[] = [];
    const pinkA = C("#ff8cba"), pinkB = C("#ffc4dc"), pinkC = C("#f4609a");
    segs.forEach(([a, b], si) => {
      const n = 26, sp: V3[] = [];
      for (let i = 0; i <= n; i++) sp.push(ctAt(lerp(a, b, i / n)));
      const tieAt = [0.24, 0.76];
      const rad = (v: number, an: number) => {
        let r = 0.17 + 0.2 * Math.pow(Math.sin(Math.PI * v), 0.42);
        for (const tv of tieAt) r -= 0.075 * Math.exp(-(((v - tv) / 0.045) ** 2));
        return r * (1 + 0.06 * Math.cos(5 * an + si) + 0.03 * Math.cos(11 * an + v * 9));
      };
      geos.push(tubeGeo(sp, rad, 20, (v, an) => pinkA.clone().lerp(pinkB, 0.5 + 0.5 * Math.sin(an)).lerp(pinkC, 0.4 * Math.exp(-(((v - 0.24) / 0.06) ** 2)) + 0.4 * Math.exp(-(((v - 0.76) / 0.06) ** 2))), true, (v) => lerp(a, b, v)));
      for (const tv of tieAt) { const u = lerp(a, b, tv); ties.push({ p: ctAt(u), t: tanAt(u), r: rad(tv, 0) * 0.97 + 0.012 }); }
    });
    {
      const P: number[] = [], N: number[] = [], Cc: number[] = [], U: number[] = [], I: number[] = [];
      let off = 0;
      for (const g2 of geos) {
        const p = g2.getAttribute("position"), nn = g2.getAttribute("normal"), c = g2.getAttribute("color"), u = g2.getAttribute("aU");
        for (let i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i)); Cc.push(c.getX(i), c.getY(i), c.getZ(i)); U.push(u.getX(i)); }
        for (let i = 0; i < g2.index!.count; i++) I.push(g2.index!.getX(i) + off);
        off += p.count;
      }
      const mg = new THREE.BufferGeometry();
      mg.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); mg.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
      mg.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3)); mg.setAttribute("aU", new THREE.Float32BufferAttribute(U, 1)); mg.setIndex(I);
      R.add(mesh(mg, amat("pad", { vc: true, spec: 0.12, shin: 14, rim: [0.45, 0.25, 0.32], glow: 1 })));
    }
    {
      const im = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.11, 8, 28), amat("plain", { color: "#f2f6ff", spec: 0.8, shin: 90, rim: [0.3, 0.3, 0.34] }), ties.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), z = new THREE.Vector3(0, 0, 1);
      ties.forEach((T, i) => { q.setFromUnitVectors(z, T.t); m4.compose(new THREE.Vector3(...T.p), q, new THREE.Vector3(T.r, T.r, T.r * 0.9)); im.setMatrixAt(i, m4); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
    }
  }

  // ---------------- posts with hanging lamps ----------------
  private buildPosts() {
    const R = this.root, woodG: THREE.BufferGeometry[] = [], inkG: THREE.BufferGeometry[] = [], insG: THREE.BufferGeometry[] = [];
    const V = (a: number, b: number, c: number) => new THREE.Vector3(a, b, c);
    POST_U.forEach((u) => {
      const c = ctAt(u), t = tanAt(u), n = V(t.z, 0, -t.x).normalize(); if (n.z > 0) n.negate();
      const base = V(c[0], 0, c[2]).addScaledVector(n, 0.42), topY = c[1] + 0.86;
      const post = new THREE.CylinderGeometry(0.055, 0.075, topY + 0.04, 10); post.translate(base.x, (topY + 0.04) / 2, base.z); woodG.push(post);
      const cap = new THREE.SphereGeometry(0.08, 10, 8); cap.translate(base.x, topY + 0.06, base.z); woodG.push(cap);
      const cy = c[1] - CABLE_R - 0.06;
      woodG.push(beamGeo(V(base.x, cy, base.z), V(c[0], cy, c[2]).addScaledVector(n, -0.05), 0.07, 0.07));
      const ins = new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12); ins.translate(c[0], cy + 0.045, c[2]); insG.push(ins);
      woodG.push(beamGeo(V(base.x, topY - 0.02, base.z), V(c[0], topY - 0.02, c[2]).addScaledVector(n, -0.06), 0.06, 0.06));
      const rod = new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6); rod.translate(c[0], topY - 0.1, c[2]); inkG.push(rod);
      const shade = new THREE.ConeGeometry(0.17, 0.13, 14, 1, true); shade.translate(c[0], c[1] + 0.67, c[2]); inkG.push(shade);
      const shadeTop = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10); shadeTop.translate(c[0], c[1] + 0.745, c[2]); inkG.push(shadeTop);
    });
    R.add(mesh(merge(woodG), amat("wood", { color: "#7a4e2e", spec: 0.15, shin: 18, rim: [0.3, 0.16, 0.08] })));
    R.add(mesh(merge(inkG), amat("plain", { color: "#2e6a5a", spec: 0.6, shin: 60, side: THREE.DoubleSide, rim: [0.2, 0.3, 0.25] })));
    R.add(mesh(merge(insG), amat("plain", { color: "#f4f0e8", spec: 0.7, shin: 80 })));
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.095, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), POST_U.length);
    const m4 = new THREE.Matrix4();
    LAMPS.forEach((L, i) => {
      m4.makeTranslation(L.p[0] - ARM[0], L.p[1] - ARM[1], L.p[2] - ARM[2]); bulbs.setMatrixAt(i, m4); bulbs.setColorAt(i, new THREE.Color(0.4, 0.3, 0.2));
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.2, 0.85, 0.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.position.set(L.p[0] - ARM[0], L.p[1] - ARM[1] - 0.02, L.p[2] - ARM[2]); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 5; R.add(s); this.lampHalos.push(s);
    });
    bulbs.castShadow = false; bulbs.frustumCulled = false; R.add(bulbs); this.lampBulbs = bulbs;
  }

  // ---------------- the NECK SUBSTATION ----------------
  private buildSubstation() {
    const R = this.root, G = new THREE.Group(); G.position.set(-16.95, 0, 0);
    const body = amat("plain", { color: "#4aa8a0", spec: 0.45, shin: 50, rim: [0.2, 0.32, 0.3] }), dark = amat("plain", { color: "#2a5a66", spec: 0.4, shin: 40 });
    const ink = amat("plain", { color: "#2a2430", spec: 0.4, shin: 40 }), por = amat("plain", { color: "#f2e8d8", spec: 0.8, shin: 90, rim: [0.3, 0.28, 0.24] });
    G.add(mesh(new THREE.BoxGeometry(1.9, 2.3, 2.1), body, 0, 1.2, 0));
    G.add(mesh(new THREE.BoxGeometry(2.04, 0.14, 2.24), dark, 0, 2.42, 0));
    G.add(mesh(new THREE.BoxGeometry(2.0, 0.12, 2.2), dark, 0, 0.06, 0));
    { const hz = amat("plain", { map: hazardTex(), spec: 0.2 }); G.add(mesh(new THREE.BoxGeometry(1.94, 0.2, 2.14), [hz, hz, dark, dark, hz, hz], 0, 0.3, 0)); }
    for (let k = 0; k < 6; k++) G.add(mesh(new THREE.BoxGeometry(0.07, 1.4, 0.16), dark, -0.7 + k * 0.28, 1.25, -1.12));
    for (const y of [0.62, 1.95]) G.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 1.6), dark, 0.98, y, 0)); // +x face rails
    { const pm = amat("plain", { map: plateTex(), spec: 0.08, shin: 20, rim: [0.1, 0.1, 0.1] }); G.add(mesh(new THREE.BoxGeometry(1.36, 0.68, 0.04), [ink, ink, ink, ink, pm, ink], 0, 1.62, 1.07)); }
    for (const dx of [-0.42, 0.42]) {
      const d = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32).rotateX(Math.PI / 2), [ink, amat("plain", { map: dialTex(), spec: 0.2 }), ink], dx, 0.86, 1.075); G.add(d);
      const nd = new THREE.Group(); nd.position.set(dx, 0.86, 1.11);
      nd.add(mesh(new THREE.BoxGeometry(0.02, 0.15, 0.01), amat("plain", { color: "#e8202a" }), 0, 0.065, 0));
      nd.add(mesh(new THREE.SphereGeometry(0.025, 8, 6), ink));
      G.add(nd); this.needles.push(nd);
    }
    for (const x of [-0.5, 0.0, 0.5]) for (let k = 0; k < 4; k++) G.add(mesh(new THREE.CylinderGeometry(0.15 - k * 0.012, 0.17 - k * 0.012, 0.09, 16), por, x, 2.55 + k * 0.11, -0.5));
    this.humMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.5, 0.2) });
    { const b = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), this.humMat); b.position.set(0.6, 2.62, 0.62); G.add(b); G.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), ink, 0.6, 2.52, 0.62)); }
    this.humHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(0.7, 1.4, 0.5), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.humHalo.position.set(0.6, 2.62, 0.62); this.humHalo.layers.set(NOINK); this.humHalo.renderOrder = 5; G.add(this.humHalo);
    G.add(mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.18, 20).rotateZ(Math.PI / 2), dark, 0.98, 1.2, 0));
    R.add(G);
    const key: V3[] = [[-16.95, 2.45, 0], [-17.2, 3.6, 0], [-18.2, 4.9, 0.2], [-19.6, 5.7, 0.3], [-21.6, 6.2, 0.3]];
    const fp: V3[] = [key[0]];
    for (let i = 1; i < key.length; i++) for (let k = 1; k <= 8; k++) fp.push([lerp(key[i - 1][0], key[i][0], k / 8), lerp(key[i - 1][1], key[i][1], k / 8), lerp(key[i - 1][2], key[i][2], k / 8)]);
    R.add(mesh(tubeGeo(fp, () => 0.24, 14, undefined, false, () => 0), amat("cable", { color: "#ffcf3a", spec: 0.85, shin: 70 })));
  }

  // ---------------- signs ----------------
  private buildSigns() {
    const R = this.root, wood = amat("wood", { color: "#8a5a34", spec: 0.15, shin: 18 });
    {
      const G = new THREE.Group(); G.position.set(-9.6, 0, -1.55);
      G.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 10), wood, 0, 1.25, 0));
      G.add(mesh(new THREE.ConeGeometry(0.1, 0.16, 10), wood, 0, 2.58, 0));
      const mk = (key: string, text: string, sub: string, y: number, bg: string, yaw: number) => {
        const m = amat("plain", { map: arrowTex(key, text, sub, bg), spec: 0.05, shin: 20, rim: [0.1, 0.1, 0.1] }); m.alphaTest = 0.5;
        const b = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), m); b.position.set(0.72 * Math.cos(yaw), y, 0.08 - 0.72 * Math.sin(yaw)); b.rotation.y = yaw; b.castShadow = true; b.frustumCulled = false; G.add(b);
      };
      mk("elbow", "ELBOW", "2 km", 2.15, "#ffd23a", 0.12);
      mk("pinky", "PINKY TOWN", "30 km", 1.68, "#ff9ac0", -0.1);
      R.add(G);
    }
    {
      const G = new THREE.Group(); G.position.set(-2.75, 0, -1.4); G.rotation.y = -1.0;
      G.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.95, 10), amat("plain", { color: "#3a3a44", spec: 0.6, shin: 60 }), 0, 0.97, -0.03));
      const face = amat("plain", { map: cautionTex(), spec: 0.05, shin: 20, rim: [0.1, 0.1, 0.1] }), bk = amat("plain", { color: "#c8c0b0", spec: 0.4 });
      G.add(mesh(new THREE.BoxGeometry(0.62, 0.78, 0.035), [bk, bk, bk, bk, face, bk], 0, 1.62, 0.01));
      R.add(G);
    }
  }

  // ============================== per frame ==============================
  update(id: number, t: number, f: number, _cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = SHOTS[id - 1].place === "arm";
    if (!R.visible) return;
    const a = armAt(id, t), s4 = surgeAt(id, t), sp = surgeSpan(id, t);
    AU.uT.value = t;
    const flick = 0.72 + 0.28 * hash(f * 0.37 + 1, 7.1);
    const tW = BEAT.whack2 / FPS, whackFl = id === 2 && t >= tW - 0.02 ? Math.exp(-Math.max(0, t - tW) / 0.12) * sm((t - tW + 0.02) / 0.03) : 0;
    const frontK = id === 4 ? 2.6 * sm(s4.line / 0.04) * (1 - sm((s4.line - 0.88) / 0.12)) : 0;
    const townK = id === 4 ? sm((f - 492) / 22) : 0;

    // ---------- cable light ----------
    if (id === 2) {
      const pulse = a.route > 0 && a.route < 1 ? a.route : -1;
      AU.uCab.value.set(1.0 + 0.1 * a.neck, ELBOW_U, ELBOW_U, 0);
      AU.uFront.value.set(0, 2.2 * a.spark + 3.0 * whackFl, pulse, 1.4 * Math.sin(Math.PI * clamp01(a.route)));
      AU.uCabX.value.set(ELBOW_U, 0.85 * a.spark, 1.0, a.spark > 0 ? flick : 1);
    } else {
      AU.uCab.value.set(0.32, sp.lo, sp.hi, 1.35 * sp.k);
      AU.uFront.value.set(frontK, 0, -1, 0);
      AU.uCabX.value.set(ELBOW_U, 0.3 * (1 - s4.calm) * (1 - townK), 1.0, 1);
    }
    // ---------- skin ----------
    {
      const rise = id === 4 ? sm((f - 594) / 26) : 0;
      AU.uShX.value = id === 2 ? 3.0 * (1 - smooth((t - (W.when - 0.2)) / 0.45)) : 0; // (qa1) the shadow slides in over the roof
      if (id === 2) AU.uSkin.value.set((0.42 + 0.95 * a.skin * (1 - 0.55 * sm((t - W.basically) / 0.8))) * (1 - 0.6 * sm((f - 398) / 30)), a.shadow, (1 - a.whack) * 2.2, 0.8); // (qa1) the zap ramp darkens the roof too
      else AU.uSkin.value.set(0.3, 0, 2.2, lerp(0.38, 0.95, townK) + 1.1 * rise);
    }
    // ---------- the roof dent (CPU: the ink pass sees the real shape) ----------
    {
      const d = roofDent(id, t, 0);
      if (Math.abs(d - this.lastDent) > 1e-4) {
        const g = this.patch.geometry, P = g.getAttribute("position") as THREE.BufferAttribute, A = P.array as Float32Array, Rr = this.patchRest;
        for (let i = 0; i < this.patchX.length; i++) { const x = this.patchX[i]; A[i * 3 + 1] = Rr[i * 3 + 1] - d * Math.exp(-(x * x) / 0.5) * this.patchW[i]; }
        P.needsUpdate = true;
        const NA = g.getAttribute("normal") as THREE.BufferAttribute;
        if (d > 1e-4) {
          g.computeVertexNormals();
          const Nn = (g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array;
          for (let i = 0; i < this.patchX.length; i++) if (this.patchEdge[i]) for (let q = 0; q < 3; q++) Nn[i * 3 + q] = this.patchNrm[i * 3 + q];
        } else NA.copyArray(this.patchNrm);
        (g.getAttribute("normal") as THREE.BufferAttribute).needsUpdate = true;
        this.lastDent = d;
      }
    }
    // ---------- the cable squeeze (a bulge travels through the gap) ----------
    {
      const q = id === 2 ? a.squeeze : 0, on = q > 0.001 && q < 0.999;
      if (on || this.cableDirty) {
        const P = this.cable.geometry.getAttribute("position") as THREE.BufferAttribute, A = P.array as Float32Array, Rr = this.cableRest, Cc = this.cableC, U = this.cableU, na = this.cableNA + 1;
        // (qa1) a tight lump (~0.2 m) that crawls through the gap inside the close camera's ~1.4 m view (was 0.4 m wide = invisible)
        const ub = ELBOW_U - 0.012 + 0.062 * q, amt = 0.72 * Math.pow(Math.sin(Math.PI * q), 0.5);
        for (let i = 0; i < U.length; i++) {
          const u = U[i]; if (Math.abs(u - ELBOW_U) > 0.1) continue;
          const sc = on ? 1 + amt * Math.exp(-(((u - ub) / 0.0055) ** 2)) - 0.16 * Math.sin(Math.PI * q) * Math.exp(-(((u - ELBOW_U) / 0.02) ** 2)) : 1;
          for (let j = 0; j < na; j++) { const k = (i * na + j) * 3; for (let c = 0; c < 3; c++) A[k + c] = Cc[i * 3 + c] + (Rr[k + c] - Cc[i * 3 + c]) * sc; }
        }
        P.needsUpdate = true; this.cable.geometry.computeVertexNormals(); this.cableDirty = on;
      }
    }
    // ---------- lamps ----------
    {
      const mb = this.lampBulbs;
      LAMPS.forEach((L, i) => {
        let k: number, ov = 0;
        if (id === 2) k = 0.55 + 0.05 * Math.sin(t * 3 + i);
        else { const on = spr(t - passT(L.u), 5.0, 18); k = 0.06 + on * 1.75 * (1 - 0.4 * s4.calm); ov = Math.max(0, on - 1); }
        mb.setColorAt(i, this.col.setRGB(1.0, 0.72, 0.36).multiplyScalar(0.35 + 1.4 * k));
        const h = this.lampHalos[i]; h.visible = k > 0.1; h.scale.setScalar(0.5 + 0.55 * k + 1.2 * ov);
        (h.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.32 * k + ov);
      });
      if (mb.instanceColor) mb.instanceColor.needsUpdate = true;
    }
    // ---------- substation hum ----------
    {
      const hum = id === 2 ? a.neck : id === 4 ? sm((t - passT(0.02)) / 0.15) : 0;
      this.humMat.color.setRGB(0.25 + 1.2 * hum, 0.45 + 1.6 * hum, 0.2 + 0.5 * hum);
      this.humHalo.visible = hum > 0.01; this.humHalo.scale.setScalar(0.4 + 0.9 * hum * (0.92 + 0.08 * Math.sin(t * 50)));
      (this.humHalo.material as THREE.SpriteMaterial).opacity = 0.8 * hum;
      this.needles.forEach((n, i) => { n.rotation.z = 0.9 - 1.5 * hum - 0.08 * hum * Math.sin(t * 31 + i * 2) - (id === 4 ? 0.5 * (1 - s4.calm) : 0); });
    }
    // ---------- Pinky Town lights ----------
    {
      const T = this.town, tp = passT(1);
      let k: number;
      if (id === 2) k = 1;
      else { const on = spr(t - tp, 4.5, 15); k = 0.15 + 1.1 * on * (1 - 0.25 * s4.calm) + 0.5 * (t > tp ? Math.exp(-(t - tp) / 0.2) * sm((t - tp) / 0.05) : 0); }
      T.winP.color.setRGB(1.0, 0.74, 0.36).multiplyScalar(0.25 + 1.15 * k);
      T.winR.color.setRGB(1.0, 0.74, 0.36).multiplyScalar(0.25 + 1.15 * k);
      T.bulbs.color.setRGB(1.0, 0.8, 0.45).multiplyScalar(0.4 + 1.3 * k);
      T.halos.forEach((h) => { h.scale.setScalar(0.8 + 0.8 * k); (h.material as THREE.SpriteMaterial).opacity = Math.min(1, 0.55 * k); });
    }
    // ---------- fake lights (ARM-local) ----------
    {
      const P = AU.uPLp.value, Cc = AU.uPLc.value, Rr = AU.uPLr.value;
      const hum = id === 2 ? a.neck : id === 4 ? 0.6 * sm((t - passT(0.02)) / 0.15) : 0;
      P[0].set(-15.6, 2.2, 1.6); Cc[0].set(0.8, 1.0, 0.5).multiplyScalar(1.3 * hum); Rr[0] = 3.5;
      const sk = id === 2 ? a.skin * (1 - 0.75 * a.shadow) : 0.25;
      P[1].set(0, 2.0, 0.2); Cc[1].set(1.0, 0.6, 0.42).multiplyScalar(1.6 * sk); Rr[1] = 2.6;
      P[2].set(19.0, 3.2, 0.4); Cc[2].set(1.0, 0.68, 0.38).multiplyScalar(id === 2 ? 1.2 : 0.4 + 1.6 * townK); Rr[2] = 6.0;
      if (id === 2) {
        const sparkK = 1.9 * a.spark * flick + 4.0 * whackFl; // (qa1) 3.2 washed the zap build-up out to pastel pink
        if (sparkK > 0.02) { P[3].set(0, 1.15, 0.1); Cc[3].set(0.7, 0.9, 1.3).multiplyScalar(sparkK); Rr[3] = 2.6; }
        else { const r = a.route > 0 && a.route < 1 ? a.route : 0, p = ctAt(r); P[3].set(p[0], p[1] + 0.4, p[2]); Cc[3].set(1.0, 0.75, 0.35).multiplyScalar(1.8 * Math.sin(Math.PI * r)); Rr[3] = 3.0; }
      } else { const p = ctAt(sp.hi); P[3].set(p[0], p[1] + 0.3, p[2]); Cc[3].set(0.8, 0.95, 1.3).multiplyScalar(1.6 * frontK); Rr[3] = 4.0; }
    }
  }
}
