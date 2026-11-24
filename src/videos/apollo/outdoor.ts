// OWNER: outdoor agent. Pad + Florida in rain, storm cloud deck, rain, lightning bolts, the diagram set, the Moon.
//   pad      : wet concrete hardstand (flame pit, puddles, floodlights, LOX/LH2 spheres), crawlerway, swamp lagoons,
//              palms/scrub/oaks, a causeway with spectators' cars and umbrellas (CAUSEWAY / SPECTATOR_SPOTS for cast)
//   sky      : storm deck = one instanced, per-frame depth-sorted billboard cloud system (NOINK) + a cloud floor at y=1100
//   rain     : camera-relative streaks (instanced, world-fixed drops wrapped around the lens, faded at the wrap edge)
//   bolts    : branching HDR ribbons rebuilt per frame while lit, flicker = strikeK; scene flash via TONE/CHAR + a light
//   diagram  : clean ground, stylised extruded cloud deck (y = 900), the wire bolt cloud -> nose -> plume -> ground
//   moon     : cratered grey ground with a close curved horizon, stars, Earth
// Everything is a pure function of (id, t): seeded hashes only, no state carried between frames.
import * as THREE from "three";
import { Batch, V, lam, addVeg, boxGeo, quad } from "../bridge/build";
import { ctex, rng } from "../bridge/paint";
import { twoTone, TONE, CHAR } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, STRIKES, FPS, strikeK, rocketAt, camAt, DIAGRAM, MOON, ROCKET_H, smooth, clamp01, V3, W } from "./story";

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;

// ---------------- contracts for other owners ----------------
/** causeway across the foreground lagoon: road top y, along x from x0 to x1, road between z0 and z1 (camera side = z1) */
export const CAUSEWAY = { y: 1.2, x0: -1000, x1: 700, z0: 167, z1: 183 };
/** free standing spots for spectator cards on the causeway's camera-side shoulder (y = road top), clear of my props */
export const SPECTATOR_SPOTS: V3[] = [-260, -232, -205, -176, -118, -92, -64, -30, 6, 40, 78].map((x, i) => [x + hh(i, 3) * 4, CAUSEWAY.y, 182.2]);

// ---------------- lagoons (ellipses with a seeded wobble) ----------------
type Lagoon = { x: number; z: number; rx: number; rz: number; s: number };
const LAGOONS: Lagoon[] = [
  { x: -120, z: 178, rx: 650, rz: 55, s: 1 }, { x: 380, z: -40, rx: 160, rz: 120, s: 2 }, { x: -420, z: -220, rx: 220, rz: 130, s: 3 },
  { x: 100, z: -600, rx: 700, rz: 160, s: 4 }, { x: -700, z: 380, rx: 200, rz: 90, s: 5 }, { x: 420, z: 380, rx: 250, rz: 100, s: 6 },
];
const wob = (L: Lagoon, a: number) => 1 + 0.07 * Math.sin(3 * a + L.s) + 0.04 * Math.sin(7 * a + 2 * L.s) + 0.02 * Math.sin(13 * a + L.s * 5);
const inLagoon = (x: number, z: number, m = 1) => LAGOONS.some((L) => {
  const dx = (x - L.x) / L.rx, dz = (z - L.z) / L.rz, a = Math.atan2(dz, dx);
  return Math.hypot(dx, dz) < wob(L, a) * m;
});
const PAD_R = 80, PIT = 11;

// ---------------- painted textures ----------------
const concreteTex = () => ctex("ap_concrete", 1024, 1024, (g, r) => {
  g.fillStyle = "#8b9097"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { // slabs (4 m)
    const l = 0.9 + r() * 0.16;
    g.fillStyle = `rgba(${Math.round(139 * l)},${Math.round(144 * l)},${Math.round(151 * l)},1)`; g.fillRect(i * 256, j * 256, 256, 256);
  }
  for (let k = 0; k < 70; k++) { // wet dark blotches
    const x = r() * 1024, y = r() * 1024, rad = 30 + r() * 120, gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, "rgba(52,60,72,0.38)"); gr.addColorStop(1, "rgba(52,60,72,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  }
  for (let k = 0; k < 220; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "40,44,52" : "200,205,212"},${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 14, 2 + r() * 4); }
  g.strokeStyle = "rgba(40,44,52,0.75)"; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 256, 0); g.lineTo(i * 256, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * 256); g.lineTo(1024, i * 256); g.stroke(); }
  for (let k = 0; k < 40; k++) { // sheen streaks (sky reflected in the wet surface)
    g.fillStyle = `rgba(215,225,238,${0.06 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 30 + r() * 90);
  }
});
const landTex = () => ctex("ap_land", 1024, 1024, (g, r) => {
  g.fillStyle = "#6f8148"; g.fillRect(0, 0, 1024, 1024);
  const cols = ["#5f7340", "#7b8a50", "#8a8a58", "#56693c", "#6a7c44", "#86804e"];
  for (let k = 0; k < 900; k++) {
    const x = r() * 1024, y = r() * 1024, rad = 6 + r() * 40;
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.globalAlpha = 0.35 + r() * 0.4;
    g.beginPath(); g.ellipse(x, y, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = "rgba(48,62,34,0.55)"; g.lineWidth = 2; g.lineCap = "round";
  for (let k = 0; k < 1400; k++) { const x = r() * 1024, y = r() * 1024; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y - 6 - r() * 10); g.stroke(); }
  for (let k = 0; k < 30; k++) { // standing water in the grass
    const x = r() * 1024, y = r() * 1024; g.fillStyle = "rgba(70,84,96,0.55)";
    g.beginPath(); g.ellipse(x, y, 20 + r() * 50, 8 + r() * 16, r() * 3, 0, TAU); g.fill();
    g.fillStyle = "rgba(170,182,196,0.35)"; g.fillRect(x - 10, y - 2, 20 + r() * 20, 2);
  }
});
const waterTex = () => ctex("ap_water", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024);
  gr.addColorStop(0, "#3c4a58"); gr.addColorStop(0.5, "#455462"); gr.addColorStop(1, "#3a4856");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 160; k++) { // sky reflections, horizontal streaks
    g.fillStyle = `rgba(${150 + r() * 40},${165 + r() * 40},${185 + r() * 40},${0.12 + r() * 0.2})`;
    g.fillRect(r() * 1024, r() * 1024, 40 + r() * 200, 2 + r() * 4);
  }
  for (let k = 0; k < 260; k++) { // rain rings
    const x = r() * 1024, y = r() * 1024, rad = 3 + r() * 12;
    g.strokeStyle = `rgba(205,215,228,${0.2 + r() * 0.3})`; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(x, y, rad, rad * 0.45, 0, 0, TAU); g.stroke();
  }
});
const roadTex = () => ctex("ap_road", 512, 512, (g, r) => {
  g.fillStyle = "#3f444b"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 500; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "20,22,26" : "120,128,140"},${0.1 + r() * 0.15})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 6, 2 + r() * 3); }
  for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(190,200,215,${0.1 + r() * 0.15})`; g.fillRect(r() * 512, r() * 512, 60 + r() * 120, 3); }
  g.fillStyle = "#e0c25a"; for (let x = 0; x < 512; x += 128) g.fillRect(x + 20, 250, 70, 10); // dashed centre line
  g.fillStyle = "#d9dbdd"; g.fillRect(0, 22, 512, 6); g.fillRect(0, 484, 512, 6);
});
const puddleTex = () => ctex("ap_puddle", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#5d6b7c"); gr.addColorStop(1, "#3b4655");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(210,222,238,${0.15 + r() * 0.3})`; g.fillRect(r() * 512, r() * 512, 3 + r() * 5, 40 + r() * 120); }
  for (let k = 0; k < 60; k++) {
    const x = r() * 512, y = r() * 512, rad = 4 + r() * 14;
    g.strokeStyle = `rgba(220,228,240,${0.25 + r() * 0.3})`; g.lineWidth = 1.5; g.beginPath(); g.ellipse(x, y, rad, rad * 0.6, 0, 0, TAU); g.stroke();
  }
});
const gravelTex = () => ctex("ap_gravel", 512, 512, (g, r) => {
  g.fillStyle = "#9c968a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "70,66,60" : "200,196,186"},${0.2 + r() * 0.3})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2 + r() * 3); }
  for (let k = 0; k < 20; k++) { g.fillStyle = "rgba(70,80,92,0.3)"; g.beginPath(); g.ellipse(r() * 512, r() * 512, 20 + r() * 40, 8 + r() * 12, 0, 0, TAU); g.fill(); }
});
const floorTex = () => ctex("ap_cfloor", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c7787"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 420; k++) {
    const x = r() * 1024, y = r() * 1024, rad = 30 + r() * 110, lit = r() < 0.45;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = g.createRadialGradient(x + ox, y + oy - rad * 0.2, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, lit ? "rgba(150,160,176,0.5)" : "rgba(70,80,96,0.45)"); gr.addColorStop(1, lit ? "rgba(150,160,176,0)" : "rgba(70,80,96,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(x + ox, y + oy, rad, 0, TAU); g.fill();
    }
  }
});
/** storm cloud atlas: 2 x 2 cells of 1024 x 512 (0,1 towering storm cells with rain shafts, 2 long band, 3 ragged scud) */
const stormAtlas = () => ctex("ap_stormAtlas", 2048, 1024, (g) => {
  const pal = { lit: "#a3acbb", mid: "#7a8597", shade: "#566074", dark: "#465062" };
  for (let c = 0; c < 4; c++) {
    const r = rng(c * 7717 + 31), U = (a: number, b: number) => a + (b - a) * r();
    const ox = (c % 2) * 1024, oy = Math.floor(c / 2) * 512;
    g.save(); g.beginPath(); g.rect(ox + 8, oy + 8, 1008, 496); g.clip();
    const lobes: { x: number; y: number; r: number }[] = [];
    const base = c === 3 ? 300 : c === 2 ? 330 : 360;
    const n = c === 2 ? 14 : c === 3 ? 10 : 9;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, hump = c === 2 ? 0.45 : c === 3 ? 0.5 : Math.sin(Math.PI * t) ** 0.7;
      const rad = (c === 3 ? 40 : 50) + (c === 2 ? 70 : 120) * hump * U(0.75, 1.15);
      lobes.push({ x: ox + 120 + t * 784 + U(-25, 25), y: oy + base - rad * U(0.3, 0.7), r: rad });
    }
    if (c < 2) for (let i = 0; i < 5; i++) { const t = U(0.3, 0.7), rad = U(60, 110); lobes.push({ x: ox + 120 + t * 784, y: oy + base - 190 - rad * U(0.2, 0.6), r: rad }); }
    if (c < 2) { // rain shafts under the storm cells
      for (let k = 0; k < 7; k++) {
        const x = ox + U(260, 760), w = U(30, 90), gr = g.createLinearGradient(0, oy + base - 20, 0, oy + 500);
        gr.addColorStop(0, "rgba(70,80,96,0.55)"); gr.addColorStop(1, "rgba(70,80,96,0)");
        g.fillStyle = gr; g.beginPath(); g.moveTo(x, oy + base - 20); g.lineTo(x + w, oy + base - 20); g.lineTo(x + w - 40, oy + 500); g.lineTo(x - 40, oy + 500); g.fill();
      }
    }
    const layer = (dx: number, dy: number, k: number, col: string, blur: number) => {
      g.save(); g.filter = `blur(${blur}px)`; g.fillStyle = col; g.beginPath();
      for (const l of lobes) { const x = l.x + dx * l.r, y = l.y + dy * l.r; g.moveTo(x + l.r * k, y); g.arc(x, y, l.r * k, 0, TAU); }
      g.fill(); g.restore();
    };
    layer(0, 0, 1.0, pal.shade, 12);
    layer(0.02, 0.22, 0.8, pal.dark, 18);
    layer(-0.02, -0.06, 0.9, pal.shade, 10);
    layer(-0.05, -0.16, 0.78, pal.mid, 12);
    layer(-0.1, -0.3, 0.55, pal.lit, 14);
    if (c === 3) { g.globalCompositeOperation = "destination-out"; // ragged holes: scud
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(0,0,0,${U(0.2, 0.6)})`; g.beginPath(); g.ellipse(ox + U(100, 920), oy + U(150, 380), U(10, 50), U(5, 20), 0, 0, TAU); g.fill(); }
      g.globalCompositeOperation = "source-over"; }
    // soft cell border (no lobe may end on the clip rectangle as a straight edge)
    g.globalCompositeOperation = "destination-in";
    const hx = g.createLinearGradient(ox, 0, ox + 1024, 0);
    hx.addColorStop(0, "rgba(0,0,0,0)"); hx.addColorStop(0.12, "rgba(0,0,0,1)"); hx.addColorStop(0.88, "rgba(0,0,0,1)"); hx.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = hx; g.fillRect(ox, oy, 1024, 512);
    const vy = g.createLinearGradient(0, oy, 0, oy + 512);
    vy.addColorStop(0, "rgba(0,0,0,0)"); vy.addColorStop(0.14, "rgba(0,0,0,1)"); vy.addColorStop(0.86, "rgba(0,0,0,1)"); vy.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = vy; g.fillRect(ox, oy, 1024, 512);
    g.globalCompositeOperation = "source-over";
    g.restore();
  }
});

// ---------------- cloud billboard system ----------------
const CLOUD_VS = /* glsl */ `
attribute vec3 iC; attribute vec4 iS; attribute vec2 iA;
uniform vec3 uCam;
varying vec2 vUv; varying float vA; varying float vB; varying vec3 vW;
#include <fog_pars_vertex>
void main(){
  vec3 toC = uCam - iC; vec2 h = normalize(toC.xz + vec2(1e-4, 0.0));
  vec3 right = vec3(h.y, 0.0, -h.x);
  vec3 wp = iC + right * position.x * iS.x * sign(iS.w) + vec3(0.0, position.y * iS.y, 0.0);
  float idx = abs(iS.w) - 1.0; vec2 cell = vec2(mod(idx, 2.0), floor(idx / 2.0 + 0.01));
  vUv = (cell + uv) * 0.5;
  float d = length(uCam - wp * 0.0 - iC);
  vA = iA.x * smoothstep(iS.x * 0.5 + 8.0, iS.x * 1.0 + 40.0, d);
  vB = iA.y; vW = iC;
  vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const CLOUD_FS = /* glsl */ `
uniform sampler2D map; uniform vec3 uTint; uniform vec3 uFlashPos; uniform float uFlash; uniform vec3 uFlashCol;
varying vec2 vUv; varying float vA; varying float vB; varying vec3 vW;
#include <fog_pars_fragment>
void main(){
  vec4 t = texture2D(map, vUv);
  float a = t.a * vA; if (a < 0.004) discard;
  vec3 c = t.rgb * uTint * vB;
  float fl = uFlash * exp(-length(vW - uFlashPos) / 420.0);
  c += uFlashCol * fl * (0.35 + 1.4 * t.r);
  gl_FragColor = vec4(c, a);
  #include <fog_fragment>
}`;
type Cloud = { x: number; y: number; z: number; w: number; h: number; cell: number; flip: number; a: number; b: number };

// ---------------- rain ----------------
const RAIN_VS = /* glsl */ `
attribute vec4 iO;
uniform vec3 uCam; uniform float uT; uniform float uBox; uniform vec3 uFall; uniform vec3 uStreak; uniform float uWidth;
varying float vA; varying float vY;
void main(){
  vec3 p = iO.xyz * uBox + uFall * uT * (0.85 + 0.3 * iO.w);
  vec3 rel = mod(p - uCam + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 wp = uCam + rel;
  float d = length(rel);
  vA = smoothstep(uBox * 0.5, uBox * 0.28, d) * smoothstep(3.5, 9.0, d) * (0.6 + 0.4 * iO.w);
  vec3 ax = uStreak * (0.75 + 0.5 * iO.w);
  vec3 side = normalize(cross(ax, uCam - wp)) * uWidth * (0.7 + 0.6 * fract(iO.w * 7.0));
  vec3 pos = wp + side * position.x + ax * position.y;
  vY = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;
const RAIN_FS = /* glsl */ `
uniform vec3 uCol; uniform float uAlpha;
varying float vA; varying float vY;
void main(){ float a = uAlpha * vA * sin(3.14159 * clamp(vY, 0.0, 1.0)); if (a < 0.003) discard; gl_FragColor = vec4(uCol, a); }`;

// ---------------- lightning ----------------
type Seg = { a: THREE.Vector3; b: THREE.Vector3; w: number; lv: number; s0: number; s1: number; fk: number }; // s = path distance (reveal)
const boltPath = (r: () => number, a: THREE.Vector3, b: THREE.Vector3, rough: number, depth: number) => {
  let pts = [a.clone(), b.clone()];
  const L = a.distanceTo(b), dir = b.clone().sub(a).normalize();
  const p1 = new THREE.Vector3(1, 0, 0).cross(dir); if (p1.lengthSq() < 0.01) p1.set(0, 0, 1).cross(dir); p1.normalize();
  const p2 = dir.clone().cross(p1).normalize();
  let amp = L * rough;
  for (let d = 0; d < depth; d++) {
    const nx: THREE.Vector3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i].clone().add(pts[i + 1]).multiplyScalar(0.5);
      m.addScaledVector(p1, (r() - 0.5) * 2 * amp).addScaledVector(p2, (r() - 0.5) * 2 * amp);
      nx.push(m, pts[i + 1]);
    }
    pts = nx; amp *= 0.52;
  }
  return pts;
};
/** a bolt (main channel a -> b) with forks; positions relative to `o` */
const makeBolt = (seed: number, a: THREE.Vector3, b: THREE.Vector3, w: number, forks: number, rough = 0.12, s0 = 0): { segs: Seg[]; len: number } => {
  const r = rng(seed), segs: Seg[] = [];
  const pts = boltPath(r, a, b, rough, 6);
  let s = s0;
  for (let i = 0; i < pts.length - 1; i++) { const l = pts[i].distanceTo(pts[i + 1]); segs.push({ a: pts[i], b: pts[i + 1], w, lv: 0, s0: s, s1: s + l, fk: 1 }); s += l; }
  const total = s;
  for (let f = 0; f < forks; f++) {
    const i = 4 + Math.floor(r() * (pts.length * 0.7));
    if (i >= pts.length - 1) continue;
    const st = pts[i], dir = pts[Math.min(pts.length - 1, i + 4)].clone().sub(st).normalize();
    const side = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.4, r() - 0.5).normalize();
    const len = a.distanceTo(b) * (0.12 + r() * 0.22);
    const end = st.clone().addScaledVector(dir.add(side.multiplyScalar(0.9)).normalize(), len);
    const fp = boltPath(r, st, end, 0.16, 4), fk = 0.35 + 0.6 * r();
    let fs = segs[i].s0;
    for (let k = 0; k < fp.length - 1; k++) { const l = fp[k].distanceTo(fp[k + 1]); segs.push({ a: fp[k], b: fp[k + 1], w: w * (0.45 - 0.25 * (k / fp.length)), lv: 1, s0: fs, s1: fs + l, fk }); fs += l; }
  }
  return { segs, len: total };
};
class Ribbon {
  mesh: THREE.Mesh; private pos: Float32Array; private col: Float32Array; private n = 0; private cap: number;
  constructor(cap: number, mat: THREE.Material) {
    this.cap = cap; this.pos = new Float32Array(cap * 18); this.col = new Float32Array(cap * 18);
    const g = new THREE.BufferGeometry(), uv = new Float32Array(cap * 12);
    for (let i = 0; i < cap; i++) uv.set([0, 0.5, 1, 0.5, 1, 0.5, 0, 0.5, 1, 0.5, 0, 0.5], i * 12); // u across the ribbon (soft profile)
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.layers.set(NOINK); this.mesh.renderOrder = 6;
  }
  begin() { this.n = 0; }
  private tA = new THREE.Vector3(); private tB = new THREE.Vector3(); private sd = new THREE.Vector3(); private dv = new THREE.Vector3();
  add(a: THREE.Vector3, b: THREE.Vector3, w: number, c: THREE.Color, k: number, cam: THREE.Vector3) {
    if (this.n >= this.cap || k <= 0.001) return;
    this.dv.subVectors(b, a); this.tA.subVectors(cam, a);
    this.sd.crossVectors(this.dv, this.tA).normalize().multiplyScalar(w / 2);
    const ext = this.dv.clone().normalize().multiplyScalar(w * 0.35); // overlap joints
    const a2 = this.tA.copy(a).sub(ext), b2 = this.tB.copy(b).add(ext);
    const v = [a2.x - this.sd.x, a2.y - this.sd.y, a2.z - this.sd.z, a2.x + this.sd.x, a2.y + this.sd.y, a2.z + this.sd.z,
      b2.x + this.sd.x, b2.y + this.sd.y, b2.z + this.sd.z, b2.x - this.sd.x, b2.y - this.sd.y, b2.z - this.sd.z];
    const o = this.n * 18;
    [0, 1, 2, 0, 2, 3].forEach((q, i) => { this.pos.set(v.slice(q * 3, q * 3 + 3), o + i * 3); this.col.set([c.r * k, c.g * k, c.b * k], o + i * 3); });
    this.n++;
  }
  end() {
    const g = this.mesh.geometry;
    g.setDrawRange(0, this.n * 6);
    (g.attributes.position as THREE.BufferAttribute).needsUpdate = true; (g.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.visible = this.n > 0;
  }
}
/** soft cross-section profiles for the bolt ribbons (rgb carries the falloff: the ribbons blend with MAX, so overlapping
 *  segment joints never double up into bright blocks) */
const profTex = (key: string, f: (x: number) => number) => {
  const t = ctex(key, 128, 4, (g) => {
    for (let i = 0; i < 128; i++) { const v = Math.round(255 * clamp01(f(Math.abs((i + 0.5) / 64 - 1)))); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i, 0, 1, 4); }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
};
const glowTex = () => ctex("ap_glow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ---------------- moon ----------------
const moonTex = () => ctex("ap_moon", 1024, 1024, (g, r) => {
  g.fillStyle = "#9c9a98"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "60,60,64" : "200,198,196"},${0.12 + r() * 0.2})`; const s = 1 + r() * 4; g.fillRect(r() * 1024, r() * 1024, s, s); }
  for (let k = 0; k < 90; k++) { // small painted craters (bright rim toward the sun side, dark bowl)
    const x = r() * 1024, y = r() * 1024, rad = 4 + r() * r() * 46;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      g.fillStyle = "rgba(70,70,76,0.45)"; g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.8, 0, 0, TAU); g.fill();
      g.strokeStyle = "rgba(225,222,215,0.55)"; g.lineWidth = Math.max(1.5, rad * 0.18);
      g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * 0.8, 0, Math.PI * 0.1, Math.PI * 1.1); g.stroke();
    }
  }
  for (let k = 0; k < 160; k++) { g.fillStyle = "rgba(80,78,80,0.5)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 2 + r() * 5, 1.5 + r() * 3, r() * 3, 0, TAU); g.fill(); } // footprints / pebbles
});
const earthTex = () => ctex("ap_earth", 512, 512, (g, r) => {
  g.save(); g.beginPath(); g.arc(256, 256, 240, 0, TAU); g.clip();
  g.fillStyle = "#2f6fd0"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#4f9a4a";
  for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(120 + r() * 280, 120 + r() * 280, 30 + r() * 70, 20 + r() * 50, r() * 3, 0, TAU); g.fill(); }
  g.fillStyle = "#c9a970"; g.beginPath(); g.ellipse(300, 230, 40, 26, 0.6, 0, TAU); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineCap = "round";
  for (let k = 0; k < 16; k++) { g.lineWidth = 8 + r() * 14; g.beginPath(); const y = 40 + r() * 430, x = r() * 400; g.moveTo(x, y); g.quadraticCurveTo(x + 60, y - 20 + r() * 40, x + 80 + r() * 120, y + r() * 30 - 15); g.stroke(); }
  const sh = g.createLinearGradient(140, 0, 512, 0); // night side
  sh.addColorStop(0, "rgba(4,8,20,0)"); sh.addColorStop(0.55, "rgba(4,8,20,0.2)"); sh.addColorStop(0.8, "rgba(4,8,20,0.92)");
  g.fillStyle = sh; g.fillRect(0, 0, 512, 512);
  g.restore();
  g.strokeStyle = "rgba(160,205,255,0.9)"; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 238, Math.PI * 0.55, Math.PI * 1.45); g.stroke();
});
const MOON_R = 60000; // curvature radius (cartoon-small: horizon ~0.5 km from the lens)
type Crater = { x: number; z: number; r: number; d: number };
const CRATERS: Crater[] = (() => {
  const out: Crater[] = [];
  for (let i = 0; out.length < 70 && i < 400; i++) {
    const a = hh(i, 41) * TAU, d = 45 + hh(i, 42) ** 1.6 * 1400, r = 4 + hh(i, 43) ** 2 * (d < 120 ? 10 : 80);
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.hypot(x, z) - r * 1.4 < 40) continue;
    out.push({ x, z, r, d: r * 0.28 });
  }
  return out;
})();
const moonH = (x: number, z: number) => {
  const R = Math.hypot(x, z);
  let h = -(R * R) / (2 * MOON_R);
  const far = smooth((R - 60) / 300);
  h += far * (2.2 * Math.sin(x * 0.011 + 1) * Math.sin(z * 0.013 + 2) + 1.2 * Math.sin(x * 0.031) * Math.cos(z * 0.027));
  h += smooth((R - 500) / 900) * 40 * Math.max(0, Math.sin(Math.atan2(z, x) * 3 + 1.3)) ** 2; // distant low hills
  for (const c of CRATERS) {
    const q = Math.hypot(x - c.x, z - c.z) / c.r;
    if (q < 1) h -= c.d * (1 - q * q) - c.d * 0.25;
    else if (q < 1.6) h += c.d * 0.25 * (1 - smooth((q - 1) / 0.6));
  }
  return h;
};

export class Outdoor {
  root = new THREE.Group();
  private pad = new THREE.Group(); private sky = new THREE.Group(); private diag = new THREE.Group(); private moon = new THREE.Group();
  private clouds: Cloud[] = []; private cloudMesh!: THREE.Mesh; private cloudMat!: THREE.ShaderMaterial; private cloudGeo!: THREE.InstancedBufferGeometry;
  private floor!: THREE.Mesh;
  private rain!: THREE.Mesh; private rainMat!: THREE.ShaderMaterial;
  private curtains: THREE.Mesh[] = []; private curtainTex!: THREE.Texture;
  private core: Ribbon; private glow: Ribbon; private hitGlow: THREE.Sprite; private cloudGlow: THREE.Sprite;
  private strikeLight = new THREE.DirectionalLight("#dfe6ff", 0);
  private bolts = new Map<string, { segs: Seg[]; len: number }>();
  private stars!: THREE.Points; private earth!: THREE.Sprite; private earthDir: THREE.Vector3 | null = null;
  private lampGlows: THREE.Sprite[] = [];
  private padCams: THREE.Vector3[] = [];

  constructor() {
    const R = this.root;
    R.add(this.pad, this.sky, this.diag, this.moon);
    // pad cameras (sampled from the camera keys) for keeping props out of the lens and out of the sight lines
    for (const s of SHOTS) if (s.place === "pad") for (let f = s.a; f < s.b; f += 4) { const c = camAt(s.id, f); if (Math.abs(c.pos[0]) < 2000) this.padCams.push(V(...c.pos)); }
    this.buildPad();
    this.buildSky();
    this.buildRain();
    this.buildDiagram();
    this.buildMoon();
    const maxBlend = { blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor } as const;
    const coreMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: profTex("ap_boltCore", (x) => 1 - Math.max(0, (x - 0.45) / 0.55) ** 1.5), ...maxBlend, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, map: profTex("ap_boltGlow", (x) => Math.exp(-4.2 * x * x) * (1 - x * x)), ...maxBlend, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.glow = new Ribbon(1400, glowMat); this.core = new Ribbon(1400, coreMat);
    this.glow.mesh.renderOrder = 5;
    R.add(this.glow.mesh, this.core.mesh);
    const gm = () => new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(3, 3.2, 4), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
    this.hitGlow = new THREE.Sprite(gm()); this.cloudGlow = new THREE.Sprite(gm());
    for (const s of [this.hitGlow, this.cloudGlow]) { s.layers.set(NOINK); s.renderOrder = 7; s.visible = false; s.frustumCulled = false; R.add(s); }
    R.add(this.strikeLight, this.strikeLight.target);
  }

  /** true when a prop at p (radius rad) would be near a pad camera or block its view of the rocket */
  private blocks(x: number, z: number, top: number, rad: number) {
    for (const c of this.padCams) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < rad + 8) return true;
      // sight line camera -> rocket axis (origin): distance of the prop to the segment in xz
      const L = Math.hypot(c.x, c.z), ux = -c.x / L, uz = -c.z / L, t = (x - c.x) * ux + (z - c.z) * uz;
      if (t > 0 && t < L - 20) {
        const perp = Math.abs((x - c.x) * uz - (z - c.z) * ux);
        const lineY = c.y + (55 - c.y) * (t / L); // aims at the rocket's middle
        if (perp < rad + 6 && top > lineY - 40 && t < L * 0.8) return true;
      }
    }
    return false;
  }

  // =============================== PAD ===============================
  private buildPad() {
    const P = this.pad, b = new Batch();
    // land (extruded, with holes for the lagoons and the hardstand)
    const shape = new THREE.Shape([V(-3200, -3200, 0), V(3200, -3200, 0), V(3200, 3200, 0), V(-3200, 3200, 0)].map((v) => new THREE.Vector2(v.x, v.y)));
    for (const L of LAGOONS) {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU, k = wob(L, a); pts.push(new THREE.Vector2(L.x + Math.cos(a) * L.rx * k, -(L.z + Math.sin(a) * L.rz * k))); }
      shape.holes.push(new THREE.Path(pts.reverse()));
    }
    const oct: THREE.Vector2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + Math.PI / 8; oct.push(new THREE.Vector2(Math.cos(a) * (PAD_R - 0.5), Math.sin(a) * (PAD_R - 0.5))); }
    shape.holes.push(new THREE.Path(oct.slice().reverse()));
    const land = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, -1.2, 0);
    const lt = landTex(); lt.repeat.set(1 / 26, 1 / 26);
    const landM = new THREE.Mesh(land, lam("ap_land", () => ({ map: lt })));
    landM.receiveShadow = true; landM.castShadow = false; landM.matrixAutoUpdate = false; P.add(landM);
    // water under everything
    const wt = waterTex(); wt.repeat.set(160, 160);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(6400, 6400).rotateX(-Math.PI / 2).translate(0, -0.7, 0), new THREE.MeshBasicMaterial({ map: wt, color: new THREE.Color(0.62, 0.66, 0.72), fog: true }));
    water.matrixAutoUpdate = false; P.add(water);
    // hardstand: octagonal concrete slab (top y = 0.06) with the flame pit
    const ct = concreteTex(); ct.repeat.set(1 / 16, 1 / 16);
    const conc = twoTone(new THREE.MeshPhongMaterial({ map: ct, specular: new THREE.Color("#4c5866"), shininess: 26 }));
    const os = new THREE.Shape(oct.map((v) => v.clone().multiplyScalar(PAD_R / (PAD_R - 0.5))));
    os.holes.push(new THREE.Path([new THREE.Vector2(-PIT, -PIT), new THREE.Vector2(-PIT, PIT), new THREE.Vector2(PIT, PIT), new THREE.Vector2(PIT, -PIT)]));
    b.add(new THREE.ExtrudeGeometry(os, { depth: 1.6, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, -1.54, 0), conc);
    // flame pit: inward walls, sooty floor, the wedge deflector
    const soot = lam("ap_soot", () => ({ color: "#3a3836" }));
    const d0 = -9, e = PIT;
    const T = 0.06;
    b.add(quad(V(e, d0, e), V(-e, d0, e), V(-e, T, e), V(e, T, e)), soot);
    b.add(quad(V(-e, d0, -e), V(e, d0, -e), V(e, T, -e), V(-e, T, -e)), soot);
    b.add(quad(V(-e, d0, e), V(-e, d0, -e), V(-e, T, -e), V(-e, T, e)), soot);
    b.add(quad(V(e, d0, -e), V(e, d0, e), V(e, T, e), V(e, T, -e)), soot);
    b.add(quad(V(-e, d0, e), V(e, d0, e), V(e, d0, -e), V(-e, d0, -e)), soot);
    b.add(new THREE.CylinderGeometry(0.01, 6, 6, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(1, 1, 3.3).translate(0, d0 + 2.6, 0), lam("ap_deflector", () => ({ color: "#6b6560" })));
    // concrete ring road + crawlerway (gravel) on the land, polygon offset (no coplanar flicker)
    const gt = gravelTex(); gt.repeat.set(1 / 14, 1 / 14);
    const gravel = twoTone(new THREE.MeshLambertMaterial({ map: gt, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    for (const zc of [-19, 19]) b.add(quad(V(-2400, 0.05, zc + 6.5), V(-PAD_R + 2, 0.05, zc + 6.5), V(-PAD_R + 2, 0.05, zc - 6.5), V(-2400, 0.05, zc - 6.5), 2322 / 14, 13 / 14), gravel);
    // puddles on the hardstand
    const pt = puddleTex(); pt.repeat.set(1 / 9, 1 / 9);
    const pm = new THREE.MeshBasicMaterial({ map: pt, color: new THREE.Color(0.9, 0.95, 1.0), fog: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 });
    const puddles: THREE.BufferGeometry[] = [];
    for (let i = 0, n = 0; i < 80 && n < 18; i++) {
      const a = hh(i, 21) * TAU, d = 18 + hh(i, 22) * (PAD_R - 26), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x) < PIT + 3 && Math.abs(z) < PIT + 3) continue;
      if (Math.abs(z + 20) < 10 && Math.abs(x) < 14) continue; // tower footprint
      n++;
      const pts: THREE.Vector2[] = [], rx = 2.5 + hh(i, 23) * 6, rz = 1.5 + hh(i, 24) * 3.5;
      for (let k = 0; k < 18; k++) { const t = (k / 18) * TAU, w = 1 + 0.18 * Math.sin(3 * t + i) + 0.1 * Math.sin(5 * t + 2 * i); pts.push(new THREE.Vector2(x + Math.cos(t) * rx * w, -(z + Math.sin(t) * rz * w))); }
      puddles.push(new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateX(-Math.PI / 2).translate(0, 0.08, 0));
    }
    for (const g of puddles) { const m = new THREE.Mesh(g, pm); m.layers.set(NOINK); m.matrixAutoUpdate = false; P.add(m); }
    // puddles on the crawlerway
    for (let i = 0; i < 26; i++) {
      const x = -100 - hh(i, 31) * 900, z = (hh(i, 32) < 0.5 ? -19 : 19) + (hh(i, 33) - 0.5) * 8, rx = 2 + hh(i, 34) * 5;
      const g = new THREE.CircleGeometry(1, 14).scale(rx, rx * 0.5, 1).rotateX(-Math.PI / 2).translate(x, 0.07, z);
      const m = new THREE.Mesh(g, pm); m.layers.set(NOINK); m.matrixAutoUpdate = false; P.add(m);
    }
    // LOX / LH2 spheres on legs, low service buildings, water tower
    const white = lam("ap_tankWhite", () => ({ color: "#e9e7e1" })), steel = lam("ap_steel", () => ({ color: "#8d949c" })), bldg = lam("ap_bldg", () => ({ color: "#c9c2b2" })), roofM = lam("ap_roof", () => ({ color: "#6b6f74" }));
    for (const [x, z, r] of [[150, -110, 11], [-150, -120, 9]] as [number, number, number][]) {
      if (this.blocks(x, z, r * 2.4, r)) continue;
      b.add(new THREE.SphereGeometry(r, 28, 18).translate(x, r * 1.35, z), white);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; b.add(new THREE.CylinderGeometry(0.4, 0.5, r * 1.1, 6).translate(x + Math.cos(a) * r * 0.72, r * 0.55, z + Math.sin(a) * r * 0.72), steel); }
      b.add(boxGeo(V(x - r * 1.2, 0, z - r * 1.2), V(x + r * 1.2, 0.6, z + r * 1.2)), lam("ap_plinth", () => ({ color: "#9a9890" })));
    }
    for (const [x, z, w, d, h] of [[120, 60, 26, 14, 7], [-120, -60, 20, 12, 6], [200, -10, 18, 10, 5]] as number[][]) {
      if (this.blocks(x, z, h, Math.max(w, d) / 2)) continue;
      b.add(boxGeo(V(x - w / 2, 0, z - d / 2), V(x + w / 2, h, z + d / 2)), bldg);
      b.add(boxGeo(V(x - w / 2 - 0.4, h, z - d / 2 - 0.4), V(x + w / 2 + 0.4, h + 0.5, z + d / 2 + 0.4)), roofM);
    }
    if (!this.blocks(230, 120, 40, 8)) {
      b.add(new THREE.CylinderGeometry(1.2, 1.6, 34, 10).translate(230, 17, 120), steel);
      b.add(new THREE.SphereGeometry(7, 20, 12).scale(1, 0.75, 1).translate(230, 38, 120), white);
    }
    // floodlight masts round the hardstand: HDR lamp panels + soft glows (bloom)
    const lampM = new THREE.MeshBasicMaterial({ color: new THREE.Color(5.0, 4.4, 3.4), fog: false });
    for (const deg of [20, 65, 160, 205, 250, 295, 340]) {
      const a = THREE.MathUtils.degToRad(deg), x = Math.cos(a) * (PAD_R + 12), z = Math.sin(a) * (PAD_R + 12);
      if (this.blocks(x, z, 30, 2)) continue;
      b.add(new THREE.CylinderGeometry(0.35, 0.55, 30, 8).translate(x, 15, z), steel);
      const yaw = Math.atan2(-x, -z), m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 30, z);
      b.add(boxGeo(V(-2.6, -0.9, -0.6), V(2.6, 0.9, 0.6)), lam("ap_lampHousing", () => ({ color: "#4b5058" })), m);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.4), lampM);
      panel.position.set(x, 30, z).add(V(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(0.65)); panel.rotation.y = yaw; panel.layers.set(NOINK); P.add(panel);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(0.9, 0.8, 0.6), blending: THREE.AdditiveBlending, depthWrite: false, fog: true, transparent: true }));
      gl.position.copy(panel.position); gl.scale.setScalar(9); gl.layers.set(NOINK); P.add(gl); this.lampGlows.push(gl);
    }
    // ---- causeway: embankment + wet road, spectators' cars, umbrellas ----
    const C = CAUSEWAY, slope = lam("ap_bank", () => ({ color: "#6e7a4c" }));
    const zb0 = C.z0 - 5, zb1 = C.z1 + 5;
    b.add(quad(V(C.x0, -1, zb1), V(C.x1, -1, zb1), V(C.x1, C.y, C.z1), V(C.x0, C.y, C.z1)), slope);
    b.add(quad(V(C.x1, -1, zb0), V(C.x0, -1, zb0), V(C.x0, C.y, C.z0), V(C.x1, C.y, C.z0)), slope);
    const rt = roadTex(); rt.repeat.set(1, 1);
    const roadM = twoTone(new THREE.MeshPhongMaterial({ map: rt, specular: new THREE.Color("#55606e"), shininess: 30 }));
    b.add(quad(V(C.x0, C.y, C.z1), V(C.x1, C.y, C.z1), V(C.x1, C.y, C.z0), V(C.x0, C.y, C.z0), (C.x1 - C.x0) / 18, 1), roadM);
    const carCols = ["#4fb3b0", "#e9e0c2", "#c9483c", "#f0d36a", "#9fd4b4", "#f4f1ea", "#2b2f38", "#e98f78", "#6d8fc9", "#b5b9be"];
    const cars: { x: number; z: number; c: string; yaw: number }[] = [];
    for (let x = C.x0 + 30, i = 0; x < C.x1 - 30; i++) {
      x += 5.6 + hh(i, 51) * (hh(i, 52) < 0.2 ? 30 : 4);
      cars.push({ x, z: 170.0 + (hh(i, 53) - 0.5) * 0.3, c: carCols[Math.floor(hh(i, 54) * carCols.length)], yaw: (hh(i, 55) - 0.5) * 0.06 });
      if (hh(i, 56) < 0.75 && !SPECTATOR_SPOTS.some((s) => Math.abs(s[0] - x) < 4)) cars.push({ x: x + 1.5, z: 179.6, c: carCols[Math.floor(hh(i, 57) * carCols.length)], yaw: Math.PI + (hh(i, 58) - 0.5) * 0.06 });
    }
    const bodyG = boxGeo(V(-2.4, 0.3, -0.95), V(2.4, 1.05, 0.95)), cabG = boxGeo(V(-1.1, 1.05, -0.82), V(1.0, 1.62, 0.82));
    const wheelG = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10).rotateX(Math.PI / 2);
    const glass = lam("ap_glass", () => ({ color: "#3b4656" })), tyre = lam("ap_tyre", () => ({ color: "#1e1f22" })), chrome = lam("ap_chrome", () => ({ color: "#c7ccd2" }));
    const carMats = new Map<string, THREE.Material>();
    for (const car of cars) {
      let cm = carMats.get(car.c); if (!cm) { cm = lam("ap_car" + car.c, () => ({ color: car.c })); carMats.set(car.c, cm); }
      const m = new THREE.Matrix4().makeRotationY(car.yaw).setPosition(car.x, C.y, car.z);
      b.add(bodyG, cm, m); b.add(cabG, glass, m);
      b.add(boxGeo(V(-1.0, 1.62, -0.8), V(0.9, 1.7, 0.8)), cm, m);
      b.add(boxGeo(V(2.4, 0.38, -0.9), V(2.5, 0.55, 0.9)), chrome, m); b.add(boxGeo(V(-2.5, 0.38, -0.9), V(-2.4, 0.55, 0.9)), chrome, m);
      for (const [wx, wz] of [[-1.5, -0.9], [1.5, -0.9], [-1.5, 0.9], [1.5, 0.9]]) b.add(wheelG, tyre, m.clone().multiply(new THREE.Matrix4().makeTranslation(wx, 0.34, wz)));
    }
    const umbCols = ["#d8423a", "#2f4f8f", "#f0c43c", "#1f2226", "#3c8f6a", "#e8e2d4", "#b34f8f"];
    for (let gI = 0; gI < 14; gI++) {
      const gx = C.x0 + 80 + hh(gI, 61) * (C.x1 - C.x0 - 160);
      if (SPECTATOR_SPOTS.some((s) => Math.abs(s[0] - gx) < 8)) continue;
      const n = 2 + Math.floor(hh(gI, 62) * 4);
      for (let k = 0; k < n; k++) {
        const x = gx + (k - n / 2) * 1.3 + hh(gI * 9 + k, 63) * 0.5, z = 182.0 + (hh(gI * 9 + k, 64) - 0.5) * 0.6, y = C.y + 1.85 + hh(gI * 9 + k, 65) * 0.2;
        const um = lam("ap_umb" + k % umbCols.length + "_" + gI % 3, () => ({ color: umbCols[(gI * 3 + k) % umbCols.length], side: THREE.DoubleSide }));
        const tilt = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler((hh(gI * 9 + k, 66) - 0.5) * 0.4, 0, (hh(gI * 9 + k, 67) - 0.5) * 0.4)).setPosition(x, y, z);
        b.add(new THREE.ConeGeometry(0.62, 0.34, 8, 1, true).translate(0, 0.17, 0), um, tilt);
        b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.9, 4).translate(0, -0.6, 0), tyre, tilt);
      }
    }
    // ---- vegetation: palm hammocks, palmetto scrub, oaks; far treeline ----
    const frondM = lam("ap_frond", () => ({ color: "#557f3e", side: THREE.DoubleSide })), trunkM = lam("ap_palmTrunk", () => ({ color: "#7c6c5a" }));
    const frondG = (() => {
      const g = new THREE.PlaneGeometry(1, 1, 7, 2), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const u = p.getX(i) + 0.5, v = p.getY(i), w = 0.16 * Math.sin(Math.PI * Math.min(1, u * 1.05)) + 0.015;
        p.setXYZ(i, u, -0.42 * u * u - Math.abs(v) * w * 0.6, v * 2 * w);
      }
      g.computeVertexNormals(); return g;
    })();
    const palm = (x: number, z: number, h: number, seed: number) => {
      const lean = (hh(seed, 71) - 0.5) * 0.18, la = hh(seed, 72) * TAU;
      const top = V(Math.cos(la) * Math.sin(lean) * h, h, Math.sin(la) * Math.sin(lean) * h);
      const tr = new THREE.CylinderGeometry(0.22, 0.34, h, 7, 1, true).translate(0, h / 2, 0);
      const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(Math.sin(la) * lean, 0, -Math.cos(la) * lean)).setPosition(x, -0.2, z);
      b.add(tr, trunkM, m);
      const cx = x + top.x, cy = top.y - 0.2, cz = z + top.z;
      b.add(new THREE.SphereGeometry(0.55, 8, 6), trunkM, new THREE.Matrix4().makeTranslation(cx, cy, cz));
      const n = 11 + Math.floor(hh(seed, 73) * 4), len = h * (0.36 + hh(seed, 74) * 0.08);
      for (let k = 0; k < n; k++) {
        const yaw = (k / n) * TAU + hh(seed * 13 + k, 75) * 0.4, pitch = 0.55 - (k % 3) * 0.35 + hh(seed * 13 + k, 76) * 0.2;
        b.add(frondG, frondM, new THREE.Matrix4().compose(V(cx, cy, cz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, pitch, "YZX")), V(len, len, len)));
      }
    };
    const okLand = (x: number, z: number, rad: number) => !inLagoon(x, z, 1.12) && Math.hypot(x, z) > PAD_R + 30 + rad && !(x < -60 && Math.abs(z) < 34 + rad)
      && !(z > C.z0 - 14 && z < C.z1 + 14 && x > C.x0 - 10 && x < C.x1 + 10);
    const clusters: [number, number][] = [];
    for (let i = 0; i < 40; i++) { const a = hh(i, 81) * TAU, d = 150 + hh(i, 82) ** 0.8 * 1000; clusters.push([Math.cos(a) * d, Math.sin(a) * d]); }
    clusters.push([-60, 300], [-260, 270], [60, 250], [-330, 120], [210, 160], [-520, 560], [-300, 600], [-640, 160]);
    let palms = 0, bushes = 0, oaks = 0;
    clusters.forEach(([cx, cz], ci) => {
      const n = 4 + Math.floor(hh(ci, 83) * 7);
      for (let k = 0; k < n; k++) {
        const s = ci * 31 + k, x = cx + (hh(s, 84) - 0.5) * 70, z = cz + (hh(s, 85) - 0.5) * 70, dist = Math.hypot(x, z);
        const kind = hh(s, 86);
        if (kind < 0.55 && palms < 220) { const h = 8 + hh(s, 87) * 9; if (okLand(x, z, 3) && !this.blocks(x, z, h, 4)) { palm(x, z, h, s); palms++; } }
        else if (kind < 0.8 && oaks < 70) { const h = 7 + hh(s, 88) * 6; if (okLand(x, z, h * 0.4) && !this.blocks(x, z, h, h * 0.45)) { addVeg(b, hh(s, 89) < 0.6 ? "round" : "fat", x, -0.1, z, h, s, dist > 400 ? 2 : 1); oaks++; } }
        for (let j = 0; j < 3 && bushes < 260; j++) {
          const bx = x + (hh(s * 3 + j, 90) - 0.5) * 22, bz = z + (hh(s * 3 + j, 91) - 0.5) * 22, h = 1.4 + hh(s * 3 + j, 92) * 1.6;
          if (okLand(bx, bz, h) && !this.blocks(bx, bz, h, h)) { addVeg(b, "bush", bx, -0.15, bz, h, s * 3 + j + 500, 2); bushes++; }
        }
      }
    });
    // causeway-side scrub
    for (let i = 0; i < 40; i++) {
      const x = C.x0 + 20 + hh(i, 93) * (C.x1 - C.x0 - 40), z = hh(i, 94) < 0.5 ? C.z0 - 6 - hh(i, 95) * 3 : C.z1 + 6 + hh(i, 95) * 3;
      if (inLagoon(x, z, 1.0) || this.blocks(x, z, 2, 2) || SPECTATOR_SPOTS.some((s) => Math.abs(s[0] - x) < 5)) continue;
      addVeg(b, "bush", x, -0.15, z, 1.2 + hh(i, 96), i + 900, 2);
    }
    // far treeline (low bumpy silhouette ring)
    const tl: THREE.BufferGeometry[] = [];
    const N = 260;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, rr = (a: number) => 1350 + 250 * Math.sin(a * 3 + 1) + 120 * Math.sin(a * 7);
      const ht = (k: number) => 14 + 10 * hh(k % N, 97) + 6 * Math.sin(k * 0.9);
      tl.push(quad(V(Math.cos(a0) * rr(a0), -1, Math.sin(a0) * rr(a0)), V(Math.cos(a1) * rr(a1), -1, Math.sin(a1) * rr(a1)), V(Math.cos(a1) * rr(a1), ht(i + 1), Math.sin(a1) * rr(a1)), V(Math.cos(a0) * rr(a0), ht(i), Math.sin(a0) * rr(a0))));
    }
    for (const g of tl) b.add(g, lam("ap_treeline", () => ({ color: "#465f3c", side: THREE.DoubleSide })));
    b.build(P);
    P.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.material === pm) m.castShadow = false; });

    // rain curtains (distant grey rain shafts, scrolling)
    this.curtainTex = ctex("ap_curtain", 512, 512, (g, r) => {
      for (let k = 0; k < 520; k++) { g.strokeStyle = `rgba(205,214,226,${0.05 + r() * 0.12})`; g.lineWidth = 1 + r() * 2; const x = r() * 512, y = r() * 512, l = 30 + r() * 90;
        for (const oy of [-512, 0]) { g.beginPath(); g.moveTo(x, y + oy); g.lineTo(x - l * 0.12, y + l + oy); g.stroke(); } }
    });
    this.curtainTex.wrapS = this.curtainTex.wrapT = THREE.RepeatWrapping;
    const vfade = ctex("ap_curtainFade2", 256, 256, (g) => { const im = g.createImageData(256, 256); for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const u = x / 255, v = y / 255, k = Math.min(1, Math.sin(Math.PI * u) * 1.3) ** 1.5 * Math.min(1, v / 0.25, (1 - v) / 0.15) * 255, o = (y * 256 + x) * 4; im.data[o] = im.data[o + 1] = im.data[o + 2] = k; im.data[o + 3] = 255; } g.putImageData(im, 0, 0); });
    vfade.wrapS = vfade.wrapT = THREE.ClampToEdgeWrapping;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.5 + (hh(i, 99) - 0.5) * 2.6 + Math.PI, d = 260 + hh(i, 98) * 700;
      const mat = new THREE.MeshBasicMaterial({ map: this.curtainTex, alphaMap: vfade, transparent: true, depthWrite: false, fog: true, opacity: 0.55, color: new THREE.Color(0.8, 0.84, 0.9) });
      const w = 300 + hh(i, 97) * 300, m = new THREE.Mesh(new THREE.PlaneGeometry(w, 260).translate(0, 120, 0), mat);
      m.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); m.layers.set(NOINK); m.renderOrder = 2;
      this.curtains.push(m); P.add(m);
    }
  }

  // =============================== SKY / STORM DECK ===============================
  private buildSky() {
    const S = this.sky, cl = this.clouds;
    const axisX = (y: number) => y * 0.08 + 6;
    // storm deck around the climb column (rocket base x = 0.08 * alt, z = 0)
    for (let i = 0, n = 0; i < 900 && n < 150; i++) {
      const y = 1080 + hh(i, 1) * 950, a = hh(i, 2) * TAU, r = 70 + hh(i, 3) ** 1.3 * 1500;
      const w = THREE.MathUtils.clamp(r * (0.55 + hh(i, 4) * 0.5), 50, 900);
      if (r < w * 0.55 + 32) continue;
      const cell = r > 500 && hh(i, 5) < 0.6 ? Math.floor(hh(i, 6) * 2) : 2 + Math.floor(hh(i, 6) * 2);
      cl.push({ x: axisX(y) + Math.cos(a) * r, y, z: Math.sin(a) * r, w, h: w * (cell < 2 ? 0.55 : 0.32), cell, flip: hh(i, 7) < 0.5 ? -1 : 1, a: cell === 3 ? 0.7 : 0.95, b: 0.75 + hh(i, 8) * 0.4 });
      n++;
    }
    // puffs sitting on the cloud floor (break the flat plane)
    for (let i = 0; i < 40; i++) {
      const a = hh(i, 11) * TAU, r = 90 + hh(i, 12) * 1400, w = 120 + hh(i, 13) * 360;
      if (r < w * 0.55 + 32) continue;
      cl.push({ x: axisX(1100) + Math.cos(a) * r, y: 1100 + w * 0.08, z: Math.sin(a) * r, w, h: w * 0.3, cell: 2, flip: hh(i, 14) < 0.5 ? -1 : 1, a: 1, b: 0.8 + hh(i, 15) * 0.25 });
    }
    // low scud over the pad (pad shots: a low, dark ceiling)
    for (let i = 0; i < 90; i++) {
      const a = hh(i, 21) * TAU, r = 280 + hh(i, 22) * 1700, w = 200 + hh(i, 23) * 520;
      cl.push({ x: Math.cos(a) * r, y: 210 + hh(i, 24) * 300, z: Math.sin(a) * r, w, h: w * 0.34, cell: hh(i, 25) < 0.5 ? 3 : 2, flip: hh(i, 26) < 0.5 ? -1 : 1, a: 0.85, b: 0.7 + hh(i, 27) * 0.3 });
    }
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1);
    geo.index = base.index; geo.setAttribute("position", base.attributes.position); geo.setAttribute("uv", base.attributes.uv);
    const N = cl.length;
    geo.setAttribute("iC", new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("iS", new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("iA", new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2).setUsage(THREE.DynamicDrawUsage));
    geo.instanceCount = N;
    this.cloudGeo = geo;
    this.cloudMat = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), map: { value: stormAtlas() }, uCam: { value: new THREE.Vector3() }, uTint: { value: new THREE.Color(1, 1, 1) },
        uFlashPos: { value: new THREE.Vector3() }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1.6, 1.7, 2.4) } },
      vertexShader: CLOUD_VS, fragmentShader: CLOUD_FS, transparent: true, depthWrite: false, fog: true,
    });
    this.cloudMesh = new THREE.Mesh(geo, this.cloudMat); this.cloudMesh.frustumCulled = false; this.cloudMesh.layers.set(NOINK); this.cloudMesh.renderOrder = 1;
    S.add(this.cloudMesh);
    // cloud floor (deck base) at y = 1100: drawn first among transparents so plumes stay whole over it
    const ft = floorTex(); ft.repeat.set(30, 30);
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: ft, color: new THREE.Color(0.78, 0.82, 0.9), transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide }));
    this.floor.position.set(0, 1100, 0); this.floor.layers.set(NOINK); this.floor.renderOrder = -0.5; this.floor.frustumCulled = false;
    S.add(this.floor);
  }
  private sortClouds(cam: THREE.Vector3) {
    const cl = this.clouds, d = cl.map((c, i) => [(c.x - cam.x) ** 2 + (c.y - cam.y) ** 2 + (c.z - cam.z) ** 2, i]);
    d.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    const C = this.cloudGeo.attributes.iC as THREE.InstancedBufferAttribute, S = this.cloudGeo.attributes.iS as THREE.InstancedBufferAttribute, A = this.cloudGeo.attributes.iA as THREE.InstancedBufferAttribute;
    d.forEach(([, i], k) => { const c = cl[i]; C.setXYZ(k, c.x, c.y, c.z); S.setXYZW(k, c.w, c.h, 0, c.flip * (c.cell + 1)); A.setXY(k, c.a, c.b); });
    C.needsUpdate = S.needsUpdate = A.needsUpdate = true;
  }

  // =============================== RAIN ===============================
  private buildRain() {
    const N = 7000, geo = new THREE.InstancedBufferGeometry(), base = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
    geo.index = base.index; geo.setAttribute("position", base.attributes.position);
    const o = new Float32Array(N * 4), r = rng(4242);
    for (let i = 0; i < N * 4; i++) o[i] = r();
    geo.setAttribute("iO", new THREE.InstancedBufferAttribute(o, 4)); geo.instanceCount = N;
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uT: { value: 0 }, uBox: { value: 64 }, uFall: { value: new THREE.Vector3(1.5, -9.5, 0.6) }, uStreak: { value: new THREE.Vector3(0, -1.6, 0) },
        uWidth: { value: 0.03 }, uCol: { value: new THREE.Color(0.75, 0.8, 0.88) }, uAlpha: { value: 0.45 } },
      vertexShader: RAIN_VS, fragmentShader: RAIN_FS, transparent: true, depthWrite: false,
    });
    this.rain = new THREE.Mesh(geo, this.rainMat); this.rain.frustumCulled = false; this.rain.layers.set(NOINK); this.rain.renderOrder = 8;
    this.root.add(this.rain);
  }

  // =============================== DIAGRAM ===============================
  private buildDiagram() {
    const D = this.diag, b = new Batch(), [dx, , dz] = DIAGRAM;
    const ground = lam("ap_dgGround", () => ({ color: "#93c77a" }));
    b.add(new THREE.CircleGeometry(4200, 96).rotateX(-Math.PI / 2).translate(dx, 0, dz), ground);
    const ring = lam("ap_dgRing", () => ({ color: "#d9cf9a", polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    b.add(new THREE.RingGeometry(36, 52, 48).rotateX(-Math.PI / 2).translate(dx, 0.4, dz), ring); // the pad, as a symbol
    // stylised deck: extruded profile, flat bottom at y = 900, bumpy top
    const sh = new THREE.Shape();
    const X0 = -2200, X1 = 2200;
    sh.moveTo(X0, 0);
    for (let i = 1; i <= 16; i++) { const x = X0 + ((X1 - X0) * i) / 16; sh.quadraticCurveTo(x - (X1 - X0) / 32, -34, x, 0); } // scalloped belly
    const bumps = 22;
    for (let i = bumps; i >= 0; i--) {
      const x = X0 + ((X1 - X0) * i) / bumps, y = 150 + 70 * hh(i, 111) + 40 * Math.sin(i * 1.3);
      if (i === bumps) sh.lineTo(x, y * 0.6);
      else sh.quadraticCurveTo(x + (X1 - X0) / bumps / 2, y + 90, x, y * (i === 0 ? 0.6 : 1));
    }
    sh.lineTo(X0, 0);
    const deckG = new THREE.ExtrudeGeometry(sh, { depth: 500, bevelEnabled: true, bevelThickness: 30, bevelSize: 30, bevelSegments: 4, curveSegments: 8 }).translate(dx, 900 + 30, dz - 250);
    b.add(deckG, lam("ap_dgCloud", () => ({ color: "#c4cbd9" })));
    // a few toy trees and a far ridge for scale
    for (let i = 0; i < 40; i++) {
      const a = hh(i, 121) * TAU, r = 220 + hh(i, 122) * 1400, x = dx + Math.cos(a) * r, z = dz + Math.sin(a) * r;
      if (z > dz + 300 && Math.abs(x - dx) < 900) continue; // keep the foreground open toward the camera
      addVeg(b, hh(i, 123) < 0.5 ? "cone" : "round", x, 0, z, 40 + hh(i, 124) * 40, i + 3000, 2);
    }
    b.build(D);
  }

  // =============================== MOON ===============================
  private buildMoon() {
    const M = this.moon, [mx, , mz] = MOON;
    const seg = 240, g = new THREE.PlaneGeometry(2, 2, seg, seg).rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
    const map = (u: number) => Math.sign(u) * Math.abs(u) ** 2.1 * 2600;
    for (let i = 0; i < p.count; i++) {
      const x = map(p.getX(i)), z = map(p.getZ(i));
      p.setXYZ(i, x, moonH(x, z), z); uv.setXY(i, x / 34, z / 34);
    }
    g.computeVertexNormals(); g.translate(mx, 0, mz);
    const mt = moonTex();
    const ground = new THREE.Mesh(g, lam("ap_moonGround", () => ({ map: mt })));
    ground.receiveShadow = true; ground.castShadow = true; ground.matrixAutoUpdate = false; M.add(ground);
    // boulders
    const b = new Batch(), rock = lam("ap_rock", () => ({ color: "#8a8784" }));
    for (let i = 0; i < 60; i++) {
      const a = hh(i, 131) * TAU, d = 14 + hh(i, 132) ** 1.5 * 300, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 0.2 + hh(i, 133) ** 2 * (d < 40 ? 0.6 : 3);
      if (d < 30 && Math.abs(Math.atan2(z, x) - Math.atan2(22, -14)) < 0.5) continue; // keep the camera side clear
      b.add(new THREE.IcosahedronGeometry(1, 0).scale(s * (1 + hh(i, 134) * 0.5), s * 0.65, s), rock, new THREE.Matrix4().makeRotationY(hh(i, 135) * 6).setPosition(mx + x, moonH(x, z) + s * 0.25, mz + z));
    }
    b.build(M);
    // stars on a camera-centred shell
    const N = 1600, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = rng(777);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), k = r() < 0.06 ? 2.4 : 0.35 + r() * 0.75;
      pos.set([Math.cos(a) * s * 1000, u * 1000, Math.sin(a) * s * 1000], i * 3);
      const warm = r(); col.set([k * (0.9 + 0.1 * warm), k * 0.95, k * (1.05 - 0.15 * warm)], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const starTex = ctex("ap_star", 32, 32, (g2) => { const gr = g2.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, "#fff"); gr.addColorStop(0.35, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g2.fillStyle = gr; g2.fillRect(0, 0, 32, 32); });
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.4, sizeAttenuation: true, map: starTex, vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.stars.frustumCulled = false; this.stars.layers.set(NOINK); this.stars.renderOrder = -0.9; M.add(this.stars);
    this.earth = new THREE.Sprite(new THREE.SpriteMaterial({ map: earthTex(), color: new THREE.Color(1.25, 1.25, 1.3), fog: false, depthWrite: false }));
    this.earth.layers.set(NOINK); this.earth.frustumCulled = false; this.earth.renderOrder = -0.8; M.add(this.earth);
  }

  // =============================== per frame ===============================
  private boltFor(key: string, make: () => { segs: Seg[]; len: number }) {
    let v = this.bolts.get(key);
    if (!v) { v = make(); this.bolts.set(key, v); }
    return v;
  }
  private nose(id: number, t: number) {
    const rs = rocketAt(id, t), base = V(...rs.pos), ax = V(Math.sin(rs.tilt), Math.cos(rs.tilt), 0);
    return { base, ax, nose: base.clone().addScaledVector(ax, ROCKET_H) };
  }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const s = SHOTS[id - 1], cp = cam.position;
    const outdoorCam = Math.abs(cp.x) < 2000 && cp.z > -3000;
    const stormHere = s.look === "storm" && outdoorCam;
    this.pad.visible = stormHere && cp.y < 1000;
    this.sky.visible = stormHere;
    this.diag.visible = s.place === "diagram";
    this.moon.visible = s.place === "moon";
    this.rain.visible = stormHere;
    // ---- clouds ----
    if (this.sky.visible) {
      this.sortClouds(cp);
      this.cloudMat.uniforms.uCam.value.copy(cp);
      this.cloudMat.uniforms.uTint.value.setRGB(0.86, 0.9, 1.0);
      this.floor.visible = cp.y > 1104; // seen from below its far edge would draw a straight line across the pad sky
    }
    if (this.pad.visible) {
      this.curtainTex.offset.set(0, t * 0.9);
      for (const c of this.curtains) c.rotation.y = Math.atan2(cp.x - c.position.x, cp.z - c.position.z);
    }
    // ---- rain: drops fixed in the world, falling, wrapped around the lens; streak = relative velocity ----
    if (this.rain.visible) {
      const c0 = camAt(id, f - 1).pos, c1 = camAt(id, f + 1).pos;
      const vc = V((c1[0] - c0[0]) * FPS / 2, (c1[1] - c0[1]) * FPS / 2, (c1[2] - c0[2]) * FPS / 2);
      const u = this.rainMat.uniforms, fall = u.uFall.value as THREE.Vector3;
      const rel = fall.clone().sub(vc), L = THREE.MathUtils.clamp(rel.length() * 0.075, 0.9, 4.0);
      u.uStreak.value.copy(rel.normalize().multiplyScalar(L));
      u.uCam.value.copy(cp); u.uT.value = t;
      u.uWidth.value = s.place === "sky" ? 0.03 : 0.022;
    }
    // ---- lightning ----
    this.core.begin(); this.glow.begin();
    let flash = 0; const flashPos = V(0, 0, 0);
    this.hitGlow.visible = false; this.cloudGlow.visible = false;
    const white = new THREE.Color(7, 7.2, 9), blue = new THREE.Color(0.9, 1.0, 2.2);
    if (s.place === "sky") {
      STRIKES.forEach((ts, si) => {
        if (si === 4) return; // the diagram strike
        const k = strikeK(t, ts);
        if (k <= 0.001) return;
        const { base, ax, nose } = this.nose(id, t);
        const fs = Math.round(ts * FPS), c = camAt(id, Math.max(s.a, Math.min(s.b - 1, fs)));
        const right = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize().cross(V(0, 1, 0));
        const dist = V(...c.pos).distanceTo(nose);
        const bolt = this.boltFor(`sky${id}_${si}`, () => {
          const side = si % 2 ? -1 : 1, top = V(0, 0, 0).addScaledVector(right, side * dist * 0.28).add(V(0, dist * 0.75, 0));
          const up = makeBolt(9100 + si * 17 + id, top, V(0, 0, 0), dist * 0.006, 5, 0.13);
          const down = makeBolt(9300 + si * 17 + id, V(0, -ROCKET_H, 0), V(0, -ROCKET_H - 330, 0).addScaledVector(right, -side * 40), dist * 0.005, 3, 0.06, up.len);
          for (const sg of down.segs) { sg.a.add(V(0, 0, 0)); }
          return { segs: [...up.segs, ...down.segs.map((sg) => ({ ...sg, lv: sg.lv + 2 }))], len: up.len + down.len };
        });
        const stroke = (t - ts) < 0.12 ? 0 : (t - ts) < 0.27 ? 1 : 2;
        // the lower channel is attached to the base (moves with the tilt), the upper to the nose
        const tA = V(0, 0, 0), tB = V(0, 0, 0), q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), ax);
        for (const sg of bolt.segs) {
          const lower = sg.lv >= 2, lv = sg.lv % 2;
          const fk = lv === 0 ? 1 : (hh(Math.round(sg.fk * 9973) + stroke * 7, 141) < sg.fk ? sg.fk : 0); // whole fork on/off per stroke (no dashes)
          const kk = k * fk;
          if (lower) { tA.copy(sg.a).add(V(0, ROCKET_H, 0)).applyQuaternion(q).add(nose).addScaledVector(ax, -ROCKET_H); tB.copy(sg.b).add(V(0, ROCKET_H, 0)).applyQuaternion(q).add(nose).addScaledVector(ax, -ROCKET_H); }
          else { tA.copy(sg.a).add(nose); tB.copy(sg.b).add(nose); }
          this.core.add(tA, tB, sg.w, white, kk, cp);
          this.glow.add(tA, tB, sg.w * 7, blue, kk * 0.75, cp);
        }
        void base;
        if (k > flash) {
          flash = k; flashPos.copy(nose).addScaledVector(right, (si % 2 ? -1 : 1) * dist * 0.28).add(V(0, dist * 0.75, 0));
          this.hitGlow.visible = true; this.hitGlow.position.copy(nose); this.hitGlow.scale.setScalar(dist * 0.1 * (0.6 + 0.4 * k));
          (this.hitGlow.material as THREE.SpriteMaterial).opacity = k;
          this.cloudGlow.visible = true; this.cloudGlow.position.copy(flashPos); this.cloudGlow.scale.setScalar(dist * 0.55);
          (this.cloudGlow.material as THREE.SpriteMaterial).opacity = 0.3 * k;
        }
      });
    }
    if (s.place === "diagram") {
      const ts = STRIKES[4], rs = rocketAt(id, t), base = V(...rs.pos), nose = base.clone().add(V(0, ROCKET_H, 0));
      const bolt = this.boltFor("diagram", () => {
        const a = makeBolt(7001, V(-140, 900 - nose.y, 0), V(0, 0, 0), 4.2, 4, 0.1);
        const toCam = V(-900, 0, 1300).normalize().multiplyScalar(9);
        const body = makeBolt(7002, toCam.clone(), toCam.clone().add(V(0, -ROCKET_H, 0)), 3.4, 0, 0.05, a.len);
        const plume = makeBolt(7003, V(0, -ROCKET_H - 4, 0).add(toCam), V(14, -nose.y, 6), 4.2, 5, 0.035, a.len + body.len);
        const segs = [...a.segs, ...body.segs, ...plume.segs];
        return { segs, len: a.len + body.len + plume.len };
      });
      const prog = smooth((t - ts) / 0.75), reveal = prog * bolt.len;
      const hold = t > ts ? Math.max(strikeK(t, ts), 0.55 + 0.25 * Math.sin(t * 37) * Math.sin(t * 23 + 1)) * smooth((ts + 3.2 - t) / 0.5 + 1) : 0;
      if (hold > 0.001) {
        const tA = V(0, 0, 0), tB = V(0, 0, 0);
        for (const sg of bolt.segs) {
          if (sg.s0 > reveal) continue;
          const part = sg.s1 > reveal ? (reveal - sg.s0) / (sg.s1 - sg.s0) : 1;
          tA.copy(sg.a).add(nose); tB.copy(sg.a).lerp(sg.b, part).add(nose);
          const kk = hold * (sg.lv ? sg.fk * 0.8 : 1);
          this.core.add(tA, tB, sg.w, white, kk, cp);
          this.glow.add(tA, tB, sg.w * 8, blue, kk * 0.5, cp);
        }
        if (prog > 0.98) {
          this.hitGlow.visible = true; this.hitGlow.position.set(nose.x + 14, 4, nose.z + 6); this.hitGlow.scale.setScalar(160 * (0.8 + 0.2 * hold));
          (this.hitGlow.material as THREE.SpriteMaterial).opacity = clamp01(hold);
        }
        flash = strikeK(t, ts) * 0.6; flashPos.set(nose.x - 140, 900, nose.z);
      }
    }
    this.core.end(); this.glow.end();
    // ---- strike flash on the scene: clouds, world two-tone, cards, an extra light for plain materials ----
    this.cloudMat.uniforms.uFlash.value = flash * 1.1; this.cloudMat.uniforms.uFlashPos.value.copy(flashPos);
    this.rainMat.uniforms.uAlpha.value = 0.34 + 0.3 * flash;
    (this.rainMat.uniforms.uCol.value as THREE.Color).setRGB(0.75 + 1.2 * flash, 0.8 + 1.2 * flash, 0.88 + 1.5 * flash);
    this.strikeLight.intensity = 1.6 * flash;
    this.strikeLight.position.copy(flashPos); this.strikeLight.target.position.copy(cp);
    if (flash > 0.001) {
      TONE.uLitCol.value.multiplyScalar(1 + 0.35 * flash);
      TONE.uShadeCol.value.multiplyScalar(1 + 0.7 * flash);
      TONE.uShadeLift.value.add(new THREE.Vector3(0.04, 0.045, 0.07).multiplyScalar(flash));
      CHAR.uCharTint.value.multiplyScalar(1 + 0.25 * flash);
    }
    // ---- moon: stars + Earth ride with the camera (infinitely far) ----
    if (this.moon.visible) {
      this.stars.position.copy(cp);
      if (!this.earthDir) {
        const mid = Math.round((s.a + s.b) / 2), c = camAt(id, mid);
        const fwd = V(c.look[0] - c.pos[0], 0, c.look[2] - c.pos[2]).normalize();
        const el = Math.atan2(c.look[1] - c.pos[1], Math.hypot(c.look[0] - c.pos[0], c.look[2] - c.pos[2]));
        const az = THREE.MathUtils.degToRad(5), e2 = el + THREE.MathUtils.degToRad(12);
        const h = fwd.clone().applyAxisAngle(V(0, 1, 0), -az);
        this.earthDir = V(h.x * Math.cos(e2), Math.sin(e2), h.z * Math.cos(e2)).normalize();
      }
      this.earth.position.copy(cp).addScaledVector(this.earthDir, 900);
      this.earth.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(2.1)));
    }
    void lerp; void W;
  }
}
