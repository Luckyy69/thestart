// OWNER: sets. Props for "Rain Tires", lit by the sets' own shader rigs (sets.ts bathRig / labRig).
//   BATH: the FOAM (instanced puffs, slowly breathing, ink-outlined like a cumulus), soap BUBBLES drifting up (NOINK),
//     the RUBBER DUCK bobbing on the foam, the SOAP BAR (shot 6: it squirts around the foam in hops, then BEAN grabs it).
//   LAB : 4 bowls (2 of water + marbles, 2 empty) and 18 glossy MARBLES (instanced): the bowl contents follow labAt,
//     the carried marble rides cast's fingertip, and SMOOTH's bowl squirts everywhere at the fumble.
//
// CONTRACTS (world coordinates; BATH / LAB from story; cast = cast.ts):
//   foamY(xl, zl, t): the foam surface height (world y) at BATH-local (xl, zl). In front of BEAN (|x| < 0.35,
//     z 0.05..0.36) the puff tops sit at ~0.74..0.8 (cast draws his in-card foam band below 0.75); the foam mounds to
//     ~0.95 at the tub ends and behind him. The tub's front rim (0.62..0.65) hides the card's bottom edge.
//   DUCK: duckAt(id, t) -> world position (BATH + (-0.56, ~0.88, 0.08), bobbing), turned 3/4 toward the lens.
//   SOAP: soapAt(id, t) -> { p (world), rot, show }. Shots 1/2: in its gold dish on the front-left rim (SOAP_DISH).
//     Shot 6: from shotStart(6) + 0.45 s it squirts out and hops across the foam in front of BEAN (z 0.22..0.33),
//     then on endAt.grab it flies into cast SOAP_AT = BATH + (0.5, 0.8, 0.35), arriving at grab 0.6, where the 3D bar
//     hides (cast's soapHeld draws it in the fist). Colours match fx SOAP / SOAP_DK.
//   MARBLES: full bowl holds MARBLES - ceil(count), empty bowl floor(count) (count = labAt.smooth / .wrinkly); while
//     cast carryAt(4, t, who).holding a marble is drawn at its P (fingertip). From labAt.fumble start
//     (W.faster - 0.1) the SMOOTH bowl's remaining marbles squirt out (staggered 40 ms) and bounce around the table /
//     off the edge to the floor (deterministic sim); his landed ones stay. The trophy is cast's.
import * as THREE from "three";
import { BATH, LAB, SHOTS, W, labAt, endAt, shotStart, smooth, MARBLES } from "./story";
import { bathRig, labRig, imat, Bat, TRS, V3, clean, C3, BOWLS, BOWL_R } from "./sets";
import * as CastMod from "./cast";
import { rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ BATH contracts
/** foam surface (world y) at BATH-local x, z (inside the tub) */
export const foamY = (x: number, z: number, t: number) => {
  const ends = Math.min(1, Math.abs(x) / 0.8);
  const front = Math.exp(-((x / 0.38) ** 2)) * smooth((z + 0.05) / 0.2);   // the dip in front of BEAN's chest
  return BATH[1] + 0.79 + 0.12 * ends * ends + 0.03 * Math.max(0, -z / 0.34) - 0.05 * front
    + 0.012 * Math.sin(x * 9 + 1.3) * Math.sin(z * 11 + 0.4) + 0.004 * Math.sin(t * 1.15 + x * 3);
};
export const SOAP_DISH = add(BATH, -0.4, 0.675, 0.345);
/** = cast SOAP_AT: where BEAN's fist closes on the bar */
export const SOAP_AT = add(BATH, 0.36, 0.82, 0.32); // QA: in frame (x 0.5 cut the grab at the right edge)
const DUCK_L = [-0.56, 0.08];
export const duckAt = (_id: number, t: number): C3 => {
  const y = foamY(DUCK_L[0], DUCK_L[1], t) - 0.015 + 0.012 * Math.sin(t * 2.1);
  return [BATH[0] + DUCK_L[0] + 0.01 * Math.sin(t * 0.7), y, BATH[2] + DUCK_L[1]];
};
const HOP_PTS: [number, number][] = [[-0.2, 0.3], [0.42, 0.27], [-0.08, 0.32], [0.6, 0.22], [-0.36, 0.27], [0.18, 0.31], [0.46, 0.3]];
const HOP_T = 0.52;
/** the soap bar (world position, euler rotation, shown) */
export const soapAt = (id: number, t: number): { p: C3; rot: C3; show: boolean } => {
  const rest = { p: SOAP_DISH, rot: [0, 0.3, 0] as C3, show: true };
  if (id !== 6) return rest;
  const t0 = shotStart(6) + 0.45, g = endAt(id, t).grab;
  if (g >= 0.6) return { p: SOAP_AT, rot: [0, 0, 0], show: false };
  if (t < t0) return rest;
  const tG = W.rainmode - 0.05, tt = Math.min(t, tG), n = Math.max(0, (tt - t0) / HOP_T), k = Math.floor(n), u = n - k;
  const pt = (i: number): C3 => {
    if (i < 0) return SOAP_DISH;
    const [x, z] = HOP_PTS[i % HOP_PTS.length];
    return [BATH[0] + x, foamY(x, z, t) + 0.025, BATH[2] + z];
  };
  const A = pt(k - 1), B = pt(k), e = smooth(u);
  let p: C3 = [A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e + 0.15 * Math.sin(Math.PI * u), A[2] + (B[2] - A[2]) * e];
  let rot: C3 = [0.4 * Math.sin(n * 5.1), 0.3 + n * 2.6, 0.5 * Math.sin(n * 3.7)];
  if (g > 0) {
    const ge = smooth(g / 0.6);
    p = [p[0] + (SOAP_AT[0] - p[0]) * ge, p[1] + (SOAP_AT[1] - p[1]) * ge + 0.05 * Math.sin(Math.PI * ge), p[2] + (SOAP_AT[2] - p[2]) * ge];
    rot = [rot[0] * (1 - ge), rot[1] * (1 - ge), rot[2] * (1 - ge)];
  }
  return { p, rot, show: true };
};

// ============================================================ LAB contracts: the marble race
type Side = "smooth" | "wrinkly";
type Carry = (id: number, t: number, who: Side) => { P: C3; holding: boolean };
/** cast's carryAt when present (the merged cast.ts); null in sandboxes whose cast is a stub */
const carryAt: Carry | null = (CastMod as unknown as { carryAt?: Carry }).carryAt ?? null;
const MR = 0.03;
/** bowl slot k (0..7) of a bowl whose base centre is b: a ring of 5 + 3 on top (local offsets) */
const SLOTS: C3[] = [
  ...Array.from({ length: 5 }, (_, i): C3 => { const a = (i / 5) * Math.PI * 2 + 0.3; return [Math.cos(a) * 0.062, 0.05, Math.sin(a) * 0.062]; }),
  ...Array.from({ length: 3 }, (_, i): C3 => { const a = (i / 3) * Math.PI * 2 + 1.0; return [Math.cos(a) * 0.034, 0.1, Math.sin(a) * 0.034]; }),
];
const slotP = (b: C3, k: number): C3 => [b[0] + SLOTS[k][0], b[1] + SLOTS[k][1], b[2] + SLOTS[k][2]];
const countOf = (side: Side, id: number, t: number) => { const la = labAt(id, t); return Math.max(0, Math.min(MARBLES, side === "smooth" ? la.smooth : la.wrinkly)); };
const T_FUMBLE = W.faster - 0.1;
/** marble k of a side at count c: k < floor(c) landed in the empty bowl; k >= ceil(c) still in the water bowl (taken
 *  top-first); else (in the fingers) null */
const bowlP = (side: Side, k: number, c: number): C3 | null => {
  const B = BOWLS[side];
  if (k < Math.floor(c)) { const p = slotP(B.empty, k), d = c - k - 1, bounce = d >= 0 && d < 0.4 ? 0.025 * Math.abs(Math.sin(d * 16)) * Math.exp(-d * 8) : 0; return [p[0], p[1] + bounce, p[2]]; }
  if (k >= Math.ceil(c)) return slotP(B.full, MARBLES - 1 - k);
  return null;
};
/** the smooth side's chaos: deterministic ballistic marbles bouncing on the table / floor / walls */
const TB = { y: LAB[1] + 0.8, x0: LAB[0] - 1.0, x1: LAB[0] + 1.0, z0: LAB[2] - 0.22, z1: LAB[2] + 0.38 };
const SW_BOX = { x: LAB[0], z: LAB[2] + 0.3, hx: 0.16, hz: 0.04, top: LAB[1] + 1.14 }; // the desk stopwatch
const chaosCache = new Map<string, C3>();
const chaosP = (k: number, p0: C3, t: number): C3 => {
  const key = k + ":" + t.toFixed(4);
  const hit = chaosCache.get(key); if (hit) return hit;
  const r = rng(1000 + k * 37), launch = T_FUMBLE + 0.04 * k;
  if (t <= launch) return p0;
  let [x, y, z] = p0;
  let vx = (k % 2 ? 1 : -1) * (0.3 + 1.2 * r()) - 0.25, vy = 1.6 + 1.3 * r(), vz = -0.2 + 1.0 * r();
  const dt = 1 / 240, steps = Math.min(2400, Math.floor((t - launch) / dt));
  for (let i = 0; i < steps; i++) {
    vy -= 9.8 * dt; x += vx * dt; y += vy * dt; z += vz * dt;
    const onTable = x > TB.x0 && x < TB.x1 && z > TB.z0 && z < TB.z1, ground = onTable ? TB.y + MR : LAB[1] + MR;
    if (y < ground && (onTable ? y > TB.y - 0.03 : true)) {
      y = ground;
      if (Math.abs(vy) < 0.35) { vy = 0; const sp = Math.hypot(vx, vz), dec = Math.max(0, sp - 0.5 * dt); if (sp > 1e-6) { vx *= dec / sp; vz *= dec / sp; } }
      else { vy = -vy * 0.55; vx *= 0.86; vz *= 0.86; }
    }
    if (Math.abs(x - SW_BOX.x) < SW_BOX.hx + MR && Math.abs(z - SW_BOX.z) < SW_BOX.hz + MR && y < SW_BOX.top) { // bonk off the stopwatch
      if (Math.abs(x - SW_BOX.x) / SW_BOX.hx > Math.abs(z - SW_BOX.z) / SW_BOX.hz) { x = SW_BOX.x + Math.sign(x - SW_BOX.x) * (SW_BOX.hx + MR); vx = -vx * 0.6; }
      else { z = SW_BOX.z + Math.sign(z - SW_BOX.z) * (SW_BOX.hz + MR); vz = -vz * 0.6; }
    }
    if (z < LAB[2] - 1.6 + MR) { z = LAB[2] - 1.6 + MR; vz = Math.abs(vz) * 0.6; }
    if (Math.abs(x - LAB[0]) > 1.9 - MR) { x = LAB[0] + Math.sign(x - LAB[0]) * (1.9 - MR); vx = -vx * 0.6; }
    if (z > LAB[2] + 1.8) { z = LAB[2] + 1.8; vz = -Math.abs(vz) * 0.5; }
  }
  const out: C3 = [x, y, z];
  if (chaosCache.size > 4000) chaosCache.clear();
  chaosCache.set(key, out);
  return out;
};
/** world position of bowl marble k of a side at time t (id 4), or null while it is in the fingers / squirted by cast */
export const marbleAt = (side: Side, k: number, t: number): C3 | null => {
  const id = 4;
  if (side === "wrinkly" || t < T_FUMBLE) return bowlP(side, k, countOf(side, id, t));
  const cF = countOf("smooth", id, T_FUMBLE), p0 = bowlP(side, k, cF);
  if (!p0 || k < Math.floor(cF)) return p0;
  return chaosP(k, p0, t);
};

// ============================================================ painting + shaders
/** iridescent soap bubbles (NOINK, alpha): thin rainbow rim + a window highlight */
class Bubbles {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, n: number, seed: number) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 4), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const s = i % 2 ? 1 : -1, x = s * (0.38 + r() * 0.45);
      P.set([x, 0.88, -0.25 + r() * 0.5, 0.018 + r() * r() * 0.035], i * 4);
      D.set([r(), 0.12 + r() * 0.1, r() * 6.28, r()], i * 4);
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iS; uniform float uT; varying vec2 vQ; varying float vA; varying float vH;
        void main(){
          float life = fract(uT * iS.y + iS.x);
          vec3 p = (modelMatrix * vec4(iP.xyz, 1.0)).xyz + vec3(0.06 * sin(uT * 1.3 + iS.z) * life, life * 0.9, 0.04 * cos(uT * 1.1 + iS.z));
          float s = iP.w * smoothstep(0.0, 0.12, life);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = p + (right * position.x + up * position.y) * s * 2.0;
          vQ = position.xy * 2.0; vH = iS.w + uT * 0.2;
          vA = (1.0 - smoothstep(0.75, 1.0, life)) * smoothstep(0.5, 1.0, length(cameraPosition - p));
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uK; varying vec2 vQ; varying float vA; varying float vH;
        vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
        void main(){ float r = length(vQ); if (r > 1.0) discard;
          float rim = smoothstep(0.62, 0.97, r) * (1.0 - smoothstep(0.97, 1.0, r));
          vec3 c = mix(vec3(1.0), hue(vH + atan(vQ.y, vQ.x) * 0.16 + r * 0.5), 0.55);
          float hl = smoothstep(0.22, 0.05, length(vQ - vec2(-0.38, 0.4)));
          float a = (rim * 0.75 + 0.06 + hl * 0.9) * vA * uK;
          gl_FragColor = vec4(c * 1.15 + hl, a); }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8; parent.add(this.mesh);
  }
}

// ============================================================ Props
type Puff = { x: number; z: number; r: number; ph: number; dy: number };
export class Props {
  root = new THREE.Group();
  private bath = new THREE.Group(); private lab = new THREE.Group();
  private foam: THREE.InstancedMesh; private puffs: Puff[] = [];
  private duck = new THREE.Group(); private soap = new THREE.Group();
  private bubbles: Bubbles;
  private marbles: THREE.InstancedMesh;
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private s = new THREE.Vector3(); private p = new THREE.Vector3();
  constructor() {
    const R = this.root;
    R.add(this.bath, this.lab);
    // ============ BATH ============
    {
      const S = bathRig(), B = this.bath;
      B.position.set(...BATH);
      const plain = imat(S, {}), gloss = imat(S, { spec: 60, specK: 0.6, rim: 0.4 }), metal = imat(S, { spec: 90, specK: 1.0 });
      // ---- FOAM: a base mass + instanced puffs (big crown puffs, small bubbles, rim spills) ----
      const base = new Bat();
      base.sph(imat(S, { col: "#f4f6ff", spec: 30, specK: 0.2 }), TRS(0, 0.7, 0, 0, 0, 0, [0.8, 0.09, 0.33]), 32, "#ffffff");
      base.build(B, true);
      const r = rng(77), P = this.puffs;
      const inside = (x: number, z: number, m: number) => Math.pow(Math.abs(x) / (0.8 - m), 2.6) + Math.pow(Math.abs(z) / (0.335 - m), 2.6) < 1;
      for (let i = 0; i < 900 && P.length < 190; i++) {
        const x = (r() * 2 - 1) * 0.8, z = (r() * 2 - 1) * 0.33, rr = 0.06 + r() * 0.075;
        if (!inside(x, z, rr * 0.35)) continue;
        if (P.some((q) => Math.hypot(q.x - x, q.z - z) < (q.r + rr) * 0.55)) continue;
        P.push({ x, z, r: rr, ph: r() * 6.28, dy: -0.48 });
      }
      for (let i = 0; i < 900 && P.length < 330; i++) { // small bubbles on top
        const x = (r() * 2 - 1) * 0.78, z = (r() * 2 - 1) * 0.32, rr = 0.018 + r() * 0.03;
        if (!inside(x, z, 0.02)) continue;
        P.push({ x, z, r: rr, ph: r() * 6.28, dy: 0.15 + r() * 0.35 });
      }
      for (let k = 0; k < 26; k++) { // spills over the rim (front + ends)
        const th = (k / 26) * Math.PI * 2 + r() * 0.1, c = Math.cos(th), s = Math.sin(th);
        if (s < -0.2) continue;
        const ex = Math.sign(c) * Math.pow(Math.abs(c), 2 / 2.6), ez = Math.sign(s) * Math.pow(Math.abs(s), 2 / 2.6);
        P.push({ x: ex * 0.8, z: ez * 0.345, r: 0.05 + r() * 0.03, ph: r() * 6.28, dy: 999 });
      }
      const sg = clean(new THREE.SphereGeometry(1, 18, 12));
      this.foam = new THREE.InstancedMesh(sg, imat(S, { col: "#ffffff", spec: 40, specK: 0.35, rim: 0.5 }), P.length);
      const fc = new THREE.Color();
      P.forEach((q, i) => { fc.setRGB(0.97 + r() * 0.03, 0.97 + r() * 0.03, 1.0); this.foam.setColorAt(i, fc); });
      this.foam.castShadow = true; this.foam.receiveShadow = true; this.foam.frustumCulled = false; B.add(this.foam);
      // ---- the RUBBER DUCK (local +x = forward) ----
      {
        const d = new Bat(), Y = "#ffd21e", O = "#ff7a1a";
        d.sph(gloss, TRS(0, 0.035, 0, 0, 0, 0, [0.075, 0.05, 0.058]), 22, Y);
        d.sph(gloss, TRS(-0.06, 0.06, 0, 0, 0, 0.6, [0.03, 0.022, 0.03]), 14, Y); // tail
        d.sph(gloss, TRS(0.035, 0.1, 0, 0, 0, 0, 0.044), 22, Y);
        d.sph(gloss, TRS(0.083, 0.094, 0, 0, 0, -0.15, [0.03, 0.011, 0.024]), 14, O);
        d.sph(gloss, TRS(0.078, 0.082, 0, 0, 0, 0.1, [0.024, 0.008, 0.02]), 14, O);
        for (const s of [-1, 1]) {
          d.sph(gloss, TRS(-0.005, 0.045, s * 0.05, 0, 0, 0.2, [0.04, 0.02, 0.012]), 12, "#ffc400");
          d.sph(gloss, TRS(0.06, 0.112, s * 0.024, 0, 0, 0, 0.009), 10, "#1a1420");
          d.sph(plain, TRS(0.066, 0.116, s * 0.027, 0, 0, 0, 0.0032), 6, "#ffffff");
          d.sph(plain, TRS(0.058, 0.094, s * 0.03, 0, 0, 0, [0.004, 0.006, 0.006]), 6, "#ff9aa0");
        }
        d.build(this.duck, true); B.add(this.duck);
      }
      // ---- the SOAP BAR (pink, a heart pressed in the top) + its gold dish on the rim ----
      {
        const sb = new Bat();
        sb.rbox(imat(S, { spec: 70, specK: 0.9, rim: 0.4 }), 0.11, 0.038, 0.066, 0.017, TRS(0, 0, 0), "#ff9ecf", 3);
        const hs = new THREE.Shape(); hs.moveTo(0, -0.012); hs.bezierCurveTo(-0.03, 0.006, -0.012, 0.02, 0, 0.008); hs.bezierCurveTo(0.012, 0.02, 0.03, 0.006, 0, -0.012);
        sb.add(new THREE.ShapeGeometry(hs, 8), plain, TRS(0, 0.0192, 0, 0, -Math.PI / 2, 0), "#e0609e");
        sb.build(this.soap, true); this.root.add(this.soap);
        const dish = new Bat(), dx = SOAP_DISH[0] - BATH[0], dz = SOAP_DISH[2] - BATH[2];
        dish.lathe(metal, [[0.001, 0], [0.06, 0.0], [0.075, 0.018], [0.072, 0.02], [0.055, 0.004], [0.001, 0.004]], TRS(dx, SOAP_DISH[1] - BATH[1] - 0.03, dz, 0, 0, 0, [1.15, 1, 0.8]), 24, "#f0b83a");
        dish.rod(metal, V3(dx, 0.66, dz - 0.05), V3(dx, 0.62, dz - 0.06), 0.006, 6, "#f0b83a");
        dish.build(B, true);
      }
      this.bubbles = new Bubbles(B, 14, 9);
    }
    // ============ LAB ============
    {
      const S = labRig(), L = this.lab;
      const gloss = imat(S, { spec: 60, specK: 0.5 });
      const b = new Bat();
      const water = imat(S, { col: "#5ab8f0", spec: 120, specK: 1.4, self: [0.06, 0.1, 0.16] });
      for (const [side, rim] of [["smooth", "#4a9ae8"], ["wrinkly", "#ff8a3a"]] as [Side, string][]) {
        for (const which of ["full", "empty"] as const) {
          const c = BOWLS[side][which];
          b.lathe(gloss, [[0.001, 0], [0.07, 0], [0.074, 0.006], [0.11, 0.05], [BOWL_R, 0.064], [BOWL_R + 0.006, 0.07], [BOWL_R - 0.004, 0.072], [0.1, 0.06], [0.065, 0.012], [0.001, 0.012]], TRS(c[0], c[1], c[2]), 40, "#fffaf2");
          b.torus(gloss, BOWL_R + 0.002, 0.007, TRS(c[0], c[1] + 0.07, c[2], 0, Math.PI / 2), rim, Math.PI * 2, 8);
          if (which === "full") b.cyl(water, 0.106, 0.098, 0.006, 40, TRS(c[0], c[1] + 0.047, c[2]));
        }
      }
      b.build(this.root, true);
      // marbles: 8 per side, instanced, glossy candy colours
      this.marbles = new THREE.InstancedMesh(clean(new THREE.SphereGeometry(MR, 20, 14)), imat(S, { col: "#ffffff", spec: 110, specK: 1.6, rim: 0.6, self: [0.06, 0.06, 0.06] }), 2 * MARBLES + 2);
      const cols = ["#3ad0ff", "#ff5a7a", "#ffd23a", "#6ae06a"], mc = new THREE.Color(); // = fx MARBLE
      for (let i = 0; i < 2 * MARBLES + 2; i++) { mc.set(cols[i % cols.length]); this.marbles.setColorAt(i, mc); }
      this.marbles.castShadow = true; this.marbles.receiveShadow = true; this.marbles.frustumCulled = false; this.root.add(this.marbles);
      void L;
    }
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    const inBath = place === "bath", inLab = place === "lab";
    this.bath.visible = inBath; this.soap.visible = inBath;
    this.marbles.visible = inLab;
    for (const o of this.root.children) if (o !== this.bath && o !== this.lab && o !== this.soap && o !== this.marbles) o.visible = inLab;
    if (inBath) {
      // foam: every puff breathes slowly
      const m = this.m4, q = this.q.identity(), s = this.s, p = this.p;
      this.puffs.forEach((u, i) => {
        const br = 1 + 0.045 * Math.sin(t * 1.1 + u.ph) + 0.02 * Math.sin(t * 0.43 + u.ph * 2);
        const y = u.dy > 900 ? 0.7 + 0.01 * Math.sin(t * 0.9 + u.ph) : foamY(u.x, u.z, t) - BATH[1] + u.r * u.dy + 0.006 * Math.sin(t * 0.8 + u.ph);
        p.set(u.x * (u.dy > 900 ? 1.0 : 1), y, u.z); s.set(u.r * br, u.r * br * (u.dy > 900 ? 0.8 : 0.92), u.r * br);
        m.compose(p, q, s); this.foam.setMatrixAt(i, m);
      });
      this.foam.instanceMatrix.needsUpdate = true;
      const d = duckAt(id, t);
      this.duck.position.set(d[0] - BATH[0], d[1] - BATH[1], d[2] - BATH[2]);
      this.duck.rotation.set(0.06 * Math.sin(t * 1.9), -0.9 + 0.15 * Math.sin(t * 0.5), 0.08 * Math.sin(t * 2.1 + 1), "YXZ");
      const sp = soapAt(id, t);
      this.soap.visible = sp.show; this.soap.position.set(...sp.p); this.soap.rotation.set(sp.rot[0], sp.rot[1], sp.rot[2], "YXZ");
      this.bubbles.mat.uniforms.uT.value = t; this.bubbles.mat.uniforms.uK.value = id === 2 ? 0.5 : 1;
    }
    if (inLab) {
      const m = this.m4, q = this.q.identity(), one = this.s.set(1, 1, 1), zero = new THREE.Vector3(0, 0, 0);
      [["smooth", 0], ["wrinkly", 1]].forEach(([side, j]) => {
        const sd = side as Side, jj = j as number;
        for (let k = 0; k < MARBLES; k++) {
          const P = id === 4 ? marbleAt(sd, k, t) : bowlP(sd, k, 0);
          m.compose(P ? this.p.set(...P) : this.p.set(0, -50, 0), q, P ? one : zero); this.marbles.setMatrixAt(jj * MARBLES + k, m);
        }
        // the carried marble at cast's fingertip
        const cr = id === 4 && carryAt ? carryAt(4, t, sd) : null;
        const show = !!cr && cr.holding && !(sd === "smooth" && t >= T_FUMBLE);
        m.compose(show ? this.p.set(...cr!.P) : this.p.set(0, -50, 0), q, show ? one : zero); this.marbles.setMatrixAt(2 * MARBLES + jj, m);
      });
      this.marbles.instanceMatrix.needsUpdate = true;
    }
  }
}
