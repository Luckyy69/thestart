// OWNER: eras. The two historical sets of "The Sun Sneeze" (one Group per place, only the shot's place is shown).
//   GREECE  : ancient Athens at golden hour. A marble terrace high on a headland: slab floor, a balustrade along the
//             cliff edge, a Doric stoa (fluted columns, painted triglyph frieze, Pompeian-red back wall, tiled roof) on
//             the left, olive trees in Greek-key terracotta pots + a marble bench + amphorae on the right. Below: a
//             real terrain (ochre cliffs, scrub, cypresses, olive groves, the white-and-terracotta city), the
//             ACROPOLIS on its rock with the Parthenon, the Aegean (own shader: painted wave dashes, a sun glitter path
//             that follows the shot's sun, sparkles), islands fading into the haze, sail boats, gulls, warm clouds.
//   ENGLAND : a 1630s manor garden on a hazy pale-gold morning. A red-brick Jacobean manor (diaper brickwork, Dutch
//             gables with ball finials, clustered octagonal chimneys, stone mullion windows with leaded glass, a stone
//             porch), a terrace with balustrade and steps, a long gravel walk, a gravel roundel with a bronze SUNDIAL,
//             clipped box hedges, lavender beds, yew topiary cones, stone urns, tall yew hedge walls, parkland trees,
//             a church spire, low hills, drifting MIST banks and glowing pollen motes in the sun.
// The world's sun is camera-relative (world.ts shotSun); eras recomputes the same direction per shot so the sea
// glitter / sun halo always sit under the real sun. Everything is a pure function of (id, t); seeded hashes only.
//
// CONTRACTS (local to the place anchor, metres; +z = toward the default cameras):
//   GREECE  (3000,0,0): terrace floor top y 0, x -10..10, z -4.6..10 (podium to y -1.4). Aristotle at (0,0,0).
//     BALUSTRADE along the cliff edge z -4.6..-4.1, rail top y 1.0. STOA columns at x -2.4, z -3.4/-0.6/2.2/5.0/7.8
//     (r 0.33, top 4.65), stylobate x -8.2..-1.9 top y 0.25, back wall x -7.6. Clear floor: x -1.6..9, z -3.9..9 except
//     OLIVE pots (2.7,-3.2) r0.55, (5.9,-2.7) r0.45, (6.4,4.6) r0.45, BENCH x 3.0..3.8 z 0.2..2.4, amphorae (-1.55,-2.6),
//     (-1.6,-1.9), brazier (-1.2,0,6.2). Temple wall behind the camera at z 9.4. Sea level y -60.
//     ACROPOLIS rock top y +10 centred (-190,-620) with the Parthenon (top ~y +29): ~17 deg left of -z. The coast runs
//     ~8 deg left of -z: land + the white city on the left, the open sea with islands and sail boats on the right.
//     The sun (look greece az +16, el 7) sits low over the sea just right of the view axis, glitter path below it.
//   ENGLAND (-3000,0,0): ground y 0. Bacon at (0,0,0) in the middle of a gravel ROUNDEL r 2.6. SUNDIAL at (-1.45,0,-1.05)
//     (dial plate top y 1.08). Gravel walk x -1.0..1.0 from z -21 to 16. Low box hedges ring the roundel (r ~2.95,
//     gaps on the walk) and edge the beds; LAVENDER beds x +-(1.25..4.85), z -19.2..-4.2 and 4.2..13.2. Urns on
//     pedestals (+-1.5,0,-3.7). Topiary cones (+-3.0,0,-11.3), (+-3.0,0,8.3). Yew walls x +-7.6 (h 2.6, z -20.5..13.5).
//     Manor centred on x 0 (behind Bacon): wing fronts z -22, terrace z -22.2..-18.6 (top y 0.6, steps x +-2.2),
//     main facade + porch z -26 (porch to -23.6), gables to y ~16.8, chimneys to y ~19.
//     The sun (look england az -50) sits LEFT of the view axis, low (el 12): left end walls lit, facades in blue shade.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Batch, V, lam, boxGeo, quad, addVeg } from "../bridge/build";
import { ctex, rng, grassHD, roofHD, cloudHD, CLOUD_GOLD } from "../bridge/paint";
import { untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, GREECE, ENGLAND, camAt, smooth, clamp01 } from "./story";
import { LOOKS } from "./looks";

const TAU = Math.PI * 2;
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const M = (key: string, p: THREE.MeshLambertMaterialParameters) => lam("er_" + key, () => p);
const M4 = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: [number, number, number] = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, n = 8, r2 = r) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r, L, n, 1, false).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
};
const lathe = (pts: [number, number][], seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true, recv = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; o.frustumCulled = false; parent.add(o); return o;
};
const tri3 = (a: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3)); g.computeVertexNormals(); return g;
};
// value noise (deterministic)
const h2 = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
const n2 = (x: number, y: number) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
};
const fbm = (x: number, y: number) => n2(x, y) * 0.55 + n2(x * 2.03 + 5.1, y * 2.03 + 1.7) * 0.28 + n2(x * 4.1 + 2.3, y * 4.1 + 8.2) * 0.17;
const sm = (a: number, b: number, x: number) => smooth((x - a) / (b - a));

// ============================================================ textures
const softDot = (key: string) => ctex(key, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.6)"); gr.addColorStop(0.6, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("er_halo", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.08, "rgba(255,255,255,0.55)"); gr.addColorStop(0.25, "rgba(255,255,255,0.18)");
  gr.addColorStop(0.55, "rgba(255,255,255,0.05)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const mistTex = () => ctex("er_mist", 512, 256, (g) => {
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const x = 110 + r() * 292, y = 118 + r() * 30, rad = 50 + r() * 60;
    g.save(); g.translate(x, y); g.scale(1.9, 0.6);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    gr.addColorStop(0, "rgba(255,255,255,0.32)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); g.restore();
  }
});
const gullTex = () => ctex("er_gull", 128, 64, (g) => {
  g.strokeStyle = "#2a2230"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath(); g.moveTo(8, 22); g.quadraticCurveTo(34, 6, 64, 36); g.quadraticCurveTo(94, 6, 120, 22); g.stroke();
  g.strokeStyle = "#fff8ec"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(12, 22); g.quadraticCurveTo(34, 9, 62, 34); g.moveTo(66, 34); g.quadraticCurveTo(94, 9, 116, 22); g.stroke();
});
/** marble: warm white with soft grey-rose veins */
const marbleTex = () => ctex("er_marble", 1024, 1024, (g, r) => {
  g.fillStyle = "#f3e9db"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = r() * 1024, rad = 80 + r() * 200, c = r() < 0.5 ? "rgba(255,240,225,0.35)" : "rgba(214,196,186,0.25)";
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, c); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  g.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    let x = r() * 1024, y = r() * 1024, a = r() * TAU;
    g.strokeStyle = `rgba(150,130,135,${0.12 + r() * 0.16})`; g.lineWidth = 1 + r() * 2.2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 40; k++) { a += (r() - 0.5) * 0.7; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); }
    g.stroke();
  }
});
/** terrace slabs: 1024 px = 4.8 m, 4 x 4 slabs of 1.2 m with offset rows */
const slabTex = () => ctex("er_slabs", 1024, 1024, (g, r) => {
  g.fillStyle = "#bfae98"; g.fillRect(0, 0, 1024, 1024);
  const cols = ["#f2e6d4", "#efe0cc", "#f5ebdc", "#ead9c6", "#f0dfd2", "#e8dccb"], S = 256;
  for (let row = 0; row < 4; row++) for (let i = -1; i < 5; i++) {
    const x = i * S + (row % 2) * S * 0.5, y = row * S, c = cols[Math.floor(r() * cols.length)];
    g.fillStyle = c; g.fillRect(x + 3, y + 3, S - 6, S - 6);
    const gr = g.createLinearGradient(x, y, x + S, y + S);
    gr.addColorStop(0, "rgba(255,250,240,0.22)"); gr.addColorStop(1, "rgba(150,120,100,0.12)");
    g.fillStyle = gr; g.fillRect(x + 3, y + 3, S - 6, S - 6);
    for (let k = 0; k < 2; k++) { // faint veins
      let vx = x + r() * S, vy = y + r() * S, a = r() * TAU;
      g.strokeStyle = `rgba(160,135,130,${0.1 + r() * 0.12})`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(vx, vy);
      for (let q = 0; q < 14; q++) { a += (r() - 0.5) * 0.8; vx = Math.min(x + S - 6, Math.max(x + 6, vx + Math.cos(a) * 12)); vy = Math.min(y + S - 6, Math.max(y + 6, vy + Math.sin(a) * 12)); g.lineTo(vx, vy); }
      g.stroke();
    }
    g.fillStyle = "rgba(255,250,240,0.35)"; g.fillRect(x + 3, y + 3, S - 6, 3);
  }
});
/** Doric frieze: blue triglyphs + red metopes with a pale relief disc; 1024 x 256 = 1.6 m x 0.54 m (u repeats) */
const friezeTex = () => ctex("er_frieze", 1024, 256, (g) => {
  g.fillStyle = "#b9452f"; g.fillRect(0, 0, 1024, 256);
  for (const x0 of [0, 512]) {
    g.fillStyle = "#2f4f86"; g.fillRect(x0, 0, 190, 256);
    g.fillStyle = "rgba(10,20,50,0.55)"; for (const gx of [40, 90, 140]) g.fillRect(x0 + gx, 18, 14, 238);
    g.fillStyle = "rgba(160,190,235,0.35)"; for (const gx of [34, 84, 134]) g.fillRect(x0 + gx, 18, 5, 238);
    g.fillStyle = "#efe4cf"; g.beginPath(); g.ellipse(x0 + 350, 130, 82, 82, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(120,70,40,0.6)"; g.lineWidth = 6; g.stroke();
    g.fillStyle = "#d7a646"; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; g.moveTo(x0 + 350, 130); g.arc(x0 + 350, 130, 46, a, a + 0.32); } g.fill();
  }
  g.fillStyle = "#e9dcc4"; g.fillRect(0, 0, 1024, 14); g.fillRect(0, 242, 1024, 14);
  g.fillStyle = "#d8a242"; g.fillRect(0, 14, 1024, 5);
});
/** stoa back wall: Pompeian red panels, ochre bands, black dado; 1024 px = 5.2 m square */
const stoaWallTex = () => ctex("er_stoaWall", 1024, 1024, (g, r) => {
  g.fillStyle = "#b8442e"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = "#2b2228"; g.fillRect(0, 780, 1024, 244);
  g.fillStyle = "#d39a3c"; g.fillRect(0, 760, 1024, 22); g.fillRect(0, 120, 1024, 18);
  for (const x0 of [40, 552]) {
    g.strokeStyle = "#e8c070"; g.lineWidth = 8; g.strokeRect(x0, 200, 432, 500);
    g.strokeStyle = "rgba(255,235,200,0.5)"; g.lineWidth = 3; g.strokeRect(x0 + 22, 222, 388, 456);
    g.fillStyle = "#e7d7b4"; g.beginPath(); g.ellipse(x0 + 216, 450, 70, 110, 0, 0, TAU); g.fill();
    g.fillStyle = "#4f7b5a"; g.beginPath(); g.ellipse(x0 + 216, 450, 26, 70, 0, 0, TAU); g.fill();
  }
  g.fillStyle = "#1f3f6a"; for (let x = 0; x < 1024; x += 64) g.fillRect(x + 20, 840, 24, 24);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,20,15,${r() * 0.08})`; g.fillRect(r() * 1024, r() * 760, 80 + r() * 200, 40 + r() * 160); }
});
/** terracotta pot: black band with a Greek key (meander) */
const potTex = () => ctex("er_pot", 1024, 512, (g) => {
  g.fillStyle = "#c96a3d"; g.fillRect(0, 0, 1024, 512);
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "rgba(255,210,170,0.15)"); gr.addColorStop(1, "rgba(80,30,10,0.2)");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  g.fillStyle = "#231a1e"; g.fillRect(0, 150, 1024, 120); g.fillRect(0, 330, 1024, 16); g.fillRect(0, 120, 1024, 10);
  g.strokeStyle = "#d98a52"; g.lineWidth = 9; g.lineCap = "square";
  for (let x = 0; x < 1024; x += 64) { // meander
    g.beginPath(); g.moveTo(x, 250); g.lineTo(x, 170); g.lineTo(x + 48, 170); g.lineTo(x + 48, 230); g.lineTo(x + 20, 230); g.lineTo(x + 20, 200); g.stroke();
    g.beginPath(); g.moveTo(x, 250); g.lineTo(x + 64, 250); g.stroke();
  }
  g.fillStyle = "#231a1e"; for (let x = 16; x < 1024; x += 48) { g.beginPath(); g.moveTo(x, 420); g.lineTo(x + 14, 360); g.lineTo(x + 28, 420); g.fill(); }
});
const oliveLeafTex = () => ctex("er_oliveLeaf", 256, 128, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#d4dcae"); gr.addColorStop(0.45, "#b2bf8a"); gr.addColorStop(1, "#93a274");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  g.lineCap = "round";
  for (let k = 0; k < 160; k++) {
    const x = r() * 256, y = r() * 128, a = r() * TAU, L = 5 + r() * 6, light = r() < (y < 64 ? 0.65 : 0.3);
    g.strokeStyle = light ? "rgba(230,240,210,0.45)" : "rgba(50,70,40,0.35)"; g.lineWidth = 2.2;
    for (const ox of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  }
});
const yewTex = (key: string, base: string, hi: string, lo: string) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 900; k++) {
    const x = r() * 512, y = r() * 512, rad = 3 + r() * 6, light = r() < 0.45;
    g.strokeStyle = light ? hi : lo; g.lineWidth = 2;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.beginPath(); g.arc(x + ox, y + oy, rad, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }
});
/** Jacobean brick with a diaper (diamond) pattern of dark burnt headers. 1024 px = 2.4 m (32 courses x 10 bricks) */
const brickTex = () => ctex("er_brick", 1024, 1024, (g, r) => {
  g.fillStyle = "#d9c7ae"; g.fillRect(0, 0, 1024, 1024);
  const CH = 32, BW = 102.4;
  for (let row = 0; row < CH; row++) for (let i = -1; i < 11; i++) {
    const x = i * BW + (row % 2) * BW * 0.5, y = row * CH, cx = (i + 10) % 10, cxx = cx * 2 + (row % 2);
    const dia = ((cxx + row) % 16 === 0) || ((cxx - row + 64) % 16 === 0);
    const base = dia ? ["#4f3a4c", "#5a4054", "#463648"][Math.floor(r() * 3)] : ["#b0452f", "#a63f2c", "#bd5236", "#9c3a2a", "#b84c34", "#c45a3c"][Math.floor(r() * 6)];
    g.fillStyle = base; g.fillRect(x + 2, y + 2, BW - 4, CH - 4);
    g.fillStyle = "rgba(255,220,190,0.14)"; g.fillRect(x + 3, y + 2, BW - 6, 3);
    g.fillStyle = "rgba(50,20,15,0.16)"; g.fillRect(x + 3, y + CH - 6, BW - 6, 3);
  }
  for (let i = 0; i < 14; i++) {
    const x = r() * 1024, y = r() * 1024, rad = 60 + r() * 140, c = r() < 0.5 ? "rgba(60,40,40,0.12)" : "rgba(230,190,150,0.1)";
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, c); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
});
/** leaded diamond-pane glass: cool sky reflection on top, warm low-sun reflection below */
const glassTex = () => ctex("er_glass", 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#a9bcd4"); gr.addColorStop(0.5, "#62749a"); gr.addColorStop(1, "#c99c76");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "rgba(40,40,55,0.7)"; g.lineWidth = 2.5;
  for (let k = -512; k < 768; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k - 256, 256); g.stroke(); }
  g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(30, 0); g.lineTo(90, 0); g.lineTo(20, 140); g.lineTo(0, 140); g.lineTo(0, 60); g.fill();
});
const gravelTex = () => ctex("er_gravel", 1024, 1024, (g, r) => {
  g.fillStyle = "#d8c8a6"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 9000; k++) {
    const x = r() * 1024, y = r() * 1024, rad = 1.5 + r() * 3.5, c = ["#c4b08c", "#e8dcc0", "#b8a283", "#efe6d2", "#a8957a"][Math.floor(r() * 5)];
    g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rad, rad * 0.75, r() * 3, 0, TAU); g.fill();
  }
});
const stoneTex = () => ctex("er_stone", 512, 512, (g, r) => {
  g.fillStyle = "#e2d2b0"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) {
    const x = r() * 512, y = r() * 512, rad = 20 + r() * 60;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, r() < 0.5 ? "rgba(180,160,120,0.18)" : "rgba(255,248,230,0.2)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
});

// ============================================================ shared geometry
const geoCache = new Map<string, THREE.BufferGeometry>();
const cached = (k: string, make: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = make(); geoCache.set(k, g); } return g; };
/** fluted Doric shaft (base at y 0), entasis, 20 flutes with crisp arrises */
const flutedShaft = (h: number, r0: number, r1: number, n = 20) => cached(`shaft${h}_${r0}_${n}`, () => {
  const g = new THREE.CylinderGeometry(1, 1, h, n * 6, 10, true).translate(0, h / 2, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = y / h;
    const a = Math.atan2(z, x), R = r0 + (r1 - r0) * t + 0.025 * r0 * Math.sin(Math.PI * t);
    const fr = (((a / TAU) * n) % 1 + 1) % 1;
    const k = 1 - 0.065 * Math.sin(fr * Math.PI);
    p.setXYZ(i, Math.cos(a) * R * k, y, Math.sin(a) * R * k);
  }
  g.computeVertexNormals();
  return g;
});
const sphere = (q: number) => cached("sph" + q, () => new THREE.SphereGeometry(1, [20, 14, 9][q], [14, 10, 6][q]));

// ============================================================ the sea shader (NOINK)
const SEA_VS = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SEA_FS = /* glsl */ `uniform vec3 uSun; uniform float uT; uniform vec3 uNear; uniform vec3 uDeep; uniform vec3 uHor; uniform vec3 uCrest;
uniform vec3 uGlint; uniform vec3 uFog; uniform vec2 uFogR; uniform vec3 uO; varying vec3 vW;
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float wav(vec2 p){ return n2(p * 0.045 + vec2(uT * 0.035, uT * 0.02)) + 0.5 * n2(p * 0.13 + vec2(-uT * 0.05, uT * 0.04)) + 0.25 * n2(p * 0.37 + vec2(uT * 0.09, -uT * 0.06)); }
void main(){
  vec3 V = vW - cameraPosition; float d = length(V); vec3 rd = V / d;
  vec2 p = vW.xz - uO.xz;
  float e = 0.8 + d * 0.004;
  float gx = wav(p + vec2(e, 0.0)) - wav(p - vec2(e, 0.0)), gz = wav(p + vec2(0.0, e)) - wav(p - vec2(0.0, e));
  float k = 0.9 / (1.0 + d * 0.006);
  vec3 n = normalize(vec3(-gx * k, 1.0, -gz * k));
  float fres = pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  vec3 col = mix(uNear, uDeep, smoothstep(40.0, 500.0, d));
  col = mix(col, uHor, clamp(fres * 0.6, 0.0, 0.42));
  // painted wave dashes (stretched across the view), fading with distance
  float ds = n2(vec2(p.x * 0.09 + p.y * 0.02, p.y * 0.5) + vec2(uT * 0.05, 0.0));
  float dash = smoothstep(0.7, 0.76, ds) * (1.0 - smoothstep(60.0, 420.0, d));
  col = mix(col, uCrest, dash * 0.45);
  vec3 r = reflect(rd, n); float s = max(dot(r, uSun), 0.0);
  float sunSide = max(dot(normalize(vec3(rd.x, 0.0, rd.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0);
  col += uGlint * (pow(s, 90.0) * 0.12 + pow(s, 900.0) * 1.6) * smoothstep(0.0, 0.25, uSun.y + 0.1);
  // sparkles: cells that flash softly in time, only in the glitter path and near enough to stay above a pixel
  vec2 cp = p * 0.55; vec2 ci = floor(cp); float hz = h2(ci); vec2 cf = fract(cp) - 0.5;
  float ph = fract(hz * 7.13 + uT * (0.35 + hz * 0.5));
  float tw = smoothstep(0.0, 0.25, ph) * (1.0 - smoothstep(0.25, 0.6, ph));
  float dot0 = 1.0 - smoothstep(0.05, 0.22, length(cf));
  col += uGlint * 2.2 * dot0 * tw * step(0.72, hz) * pow(s, 40.0) * (1.0 - smoothstep(80.0, 260.0, d)) * pow(sunSide, 6.0);
  col = mix(col, uFog, smoothstep(uFogR.x, uFogR.y, d));
  gl_FragColor = vec4(col, 1.0);
}`;

// temporary preview cameras by frame: [pos, look, fov] local to the place (keep EMPTY when delivering)
const DEBUG_CAM: Record<number, [[number, number, number], [number, number, number], number]> = {};

// ============================================================ the class
export class Eras {
  root = new THREE.Group();
  private greece = new THREE.Group();
  private england = new THREE.Group();
  private seaMat!: THREE.ShaderMaterial;
  private boats: THREE.Group[] = [];
  private gulls: THREE.Sprite[] = [];
  private mist: { s: THREE.Sprite; x: number; y: number; z: number; w: number; sp: number; ph: number }[] = [];
  private motes!: THREE.Points; private moteBase!: Float32Array;
  private haloG!: THREE.Sprite; private haloE!: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();

  constructor() {
    this.root.add(this.greece, this.england);
    this.greece.position.set(...GREECE); this.england.position.set(...ENGLAND);
    this.buildGreece();
    this.buildEngland();
    const halo = (col: THREE.Color) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = -0.4; s.visible = false; this.root.add(s); return s;
    };
    this.haloG = halo(new THREE.Color(1.0, 0.62, 0.3)); this.haloE = halo(new THREE.Color(0.95, 0.82, 0.55));
  }

  /** the world's camera-relative shot sun (same maths as world.ts shotSun) */
  private sunFor(id: number): THREE.Vector3 {
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1], L = LOOKS[s.look];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  // ======================================================================== GREECE
  private buildGreece() {
    const G = this.greece, b = new Batch();
    const marble = M("marble", { map: marbleTex() }), slab = M("slab", { map: slabTex() });
    const potM = M("pot", { map: potTex() }), bronze = M("bronze", { color: "#b98a3e" }), bark = M("oliveBark", { color: "#7c6a58" });
    const wallM = M("stoaWall", { map: stoaWallTex() }), redM = M("cornRed", { color: "#b5452f" });
    // ---- terrace: slab floor on a podium ----
    b.add(boxGeo(V(-10, -1.4, -4.6), V(10, 0, 10), 4.8), slab);
    // ---- balustrade along the cliff edge ----
    {
      b.add(boxGeo(V(-10, 0, -4.62), V(10, 0.16, -4.08), 2), marble);
      b.add(boxGeo(V(-10.05, 0.86, -4.66), V(10.05, 1.0, -4.04), 2), marble);
      const bal = lathe([[0.0, 0], [0.075, 0], [0.075, 0.05], [0.05, 0.08], [0.085, 0.2], [0.1, 0.3], [0.085, 0.4], [0.05, 0.5], [0.04, 0.56], [0.065, 0.6], [0.075, 0.66], [0.075, 0.7], [0.0, 0.7]], 14);
      const peds = [-9.8, -6.44, -3.08, 0.28, 3.64, 7.0, 9.8];
      for (const x of peds) {
        b.add(boxGeo(V(x - 0.2, 0.16, -4.6), V(x + 0.2, 0.86, -4.1)), marble);
        b.add(lathe([[0, 0], [0.09, 0.02], [0.11, 0.1], [0.07, 0.22], [0, 0.3]], 10), bronze, M4(x, 1.0, -4.35));
      }
      for (let x = -9.52; x <= 9.6; x += 0.28) {
        if (peds.some((p) => Math.abs(p - x) < 0.3)) continue;
        b.add(bal, marble, M4(x, 0.16, -4.35));
      }
    }
    // ---- STOA on the left: stylobate, fluted columns, entablature, roof, painted back wall ----
    {
      b.add(boxGeo(V(-8.2, 0, -4.6), V(-1.9, 0.12, 9.4)), marble);
      b.add(boxGeo(V(-8.1, 0.12, -4.5), V(-2.0, 0.25, 9.4)), marble);
      const shaft = flutedShaft(4.0, 0.33, 0.26), ech = lathe([[0, 0], [0.27, 0], [0.33, 0.07], [0.4, 0.14], [0.43, 0.2], [0, 0.2]], 28);
      for (const z of [-3.4, -0.6, 2.2, 5.0, 7.8]) {
        b.add(shaft, marble, M4(-2.4, 0.25, z));
        b.add(new THREE.CylinderGeometry(0.275, 0.275, 0.05, 28).translate(0, 0.025, 0), marble, M4(-2.4, 4.22, z)); // necking ring
        b.add(ech, marble, M4(-2.4, 4.28, z));
        b.add(boxGeo(V(-2.85, 4.48, z - 0.45), V(-1.95, 4.65, z + 0.45)), marble); // abacus
      }
      b.add(boxGeo(V(-2.8, 4.65, -4.5), V(-2.0, 5.08, 9.4)), marble); // architrave
      b.add(boxGeo(V(-2.06, 4.96, -4.5), V(-1.97, 5.04, 9.4)), M("gold", { color: "#d6a748" }));   // taenia
      b.add(boxGeo(V(-2.8, 5.08, -4.5), V(-2.08, 5.62, 9.4)), marble);
      b.add(quad(V(-2.04, 5.08, 9.4), V(-2.04, 5.08, -4.5), V(-2.04, 5.62, -4.5), V(-2.04, 5.62, 9.4), 13.9 / 1.6, 1), M("frieze", { map: friezeTex() }));
      b.add(boxGeo(V(-2.95, 5.62, -4.62), V(-1.86, 5.82, 9.4)), marble); // cornice
      b.add(boxGeo(V(-1.86, 5.68, -4.62), V(-1.8, 5.8, 9.4)), redM);
      // roof: a sloped tile plane from the cornice up to the back wall, antefixes, ceiling beams
      const roofM = M("roofT", { map: roofHD("#c4643e"), side: THREE.DoubleSide });
      b.add(quad(V(-1.7, 5.86, 9.4), V(-1.7, 5.86, -4.75), V(-8.3, 7.4, -4.75), V(-8.3, 7.4, 9.4), 14.2 / 2.2, 6.8 / 2.2), roofM);
      const ant = lathe([[0, 0], [0.14, 0.0], [0.16, 0.18], [0.0, 0.34]], 8);
      for (let z = -4.5; z <= 9.3; z += 0.9) b.add(ant, redM, M4(-1.76, 5.84, z, 0, 0, 0, [0.6, 1, 1]));
      for (let z = -4.2; z <= 9; z += 1.4) b.add(boxGeo(V(-7.6, 5.0, z - 0.09), V(-2.8, 5.2, z + 0.09)), M("beam", { color: "#8d5a3a" }));
      b.add(boxGeo(V(-8.3, 0, -4.6), V(-7.6, 7.45, 9.4), 5.2), wallM);
      b.add(boxGeo(V(-8.3, 0.25, -4.62), V(-2.9, 5.08, -4.3), 5.2), wallM); // end wall toward the sea
    }
    // ---- olive trees in Greek-key pots, bench, amphorae, brazier ----
    {
      const pot = lathe([[0, 0], [0.3, 0], [0.34, 0.04], [0.42, 0.18], [0.5, 0.42], [0.5, 0.6], [0.44, 0.72], [0.46, 0.76], [0.52, 0.8], [0.52, 0.86], [0.42, 0.86], [0.4, 0.78], [0, 0.76]], 32);
      const leaf = M("oliveLeaf", { map: oliveLeafTex(), emissive: "#3f5a22" }) /* QA1: backlit crowns read olive-green, not grey */, soil = M("soil", { color: "#6a4a34" });
      const olive = (x: number, z: number, s: number, h: number, seed: number) => {
        b.add(pot, potM, M4(x, 0, z, seed, 0, 0, [s, s, s]));
        b.add(new THREE.CylinderGeometry(0.41 * s, 0.41 * s, 0.02, 20), soil, M4(x, 0.8 * s, z));
        const r = rng(seed * 31 + 5), U = (a: number, c: number) => a + (c - a) * r();
        const y0 = 0.78 * s, fork = V(x + U(-0.12, 0.12), y0 + h * 0.36, z + U(-0.12, 0.12));
        const mid = V(x + U(-0.15, 0.15), y0 + h * 0.18, z + U(-0.1, 0.1)), k = h / 3;
        b.add(strut(V(x, y0 - 0.05, z), mid, 0.11 * k, 9, 0.085 * k), bark);
        b.add(strut(mid, fork, 0.085 * k, 9, 0.07 * k), bark);
        const crown = V(fork.x, y0 + h * 0.68, fork.z), lobes: THREE.Vector3[] = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU + U(-0.3, 0.3), rr = h * U(0.22, 0.36);
          lobes.push(V(crown.x + Math.cos(a) * rr, crown.y + U(-0.12, 0.2) * h, crown.z + Math.sin(a) * rr));
        }
        lobes.push(V(crown.x, crown.y + h * 0.16, crown.z));
        for (const L of lobes) {
          b.add(strut(fork, fork.clone().lerp(L, 0.75), 0.04 * k, 6, 0.018 * k), bark);
          const rad = h * U(0.15, 0.21);
          b.add(sphere(0), leaf, M4(L.x, L.y, L.z, U(0, 6), 0, 0, [rad * 1.15, rad * 0.62, rad]));
        }
      };
      olive(2.7, -3.2, 1.05, 3.4, 1);
      olive(5.9, -2.7, 0.9, 2.9, 2);
      olive(6.4, 4.6, 0.9, 3.0, 3);
      // marble bench with paw ends
      b.add(boxGeo(V(3.0, 0.42, 0.2), V(3.8, 0.52, 2.4)), marble);
      for (const z of [0.35, 2.25]) { b.add(boxGeo(V(3.08, 0, z - 0.13), V(3.72, 0.42, z + 0.13)), marble); b.add(sphere(1), marble, M4(3.0, 0.08, z, 0, 0, 0, [0.12, 0.08, 0.1])); }
      // amphorae by the first column
      const amph = lathe([[0, 0], [0.05, 0.02], [0.14, 0.18], [0.2, 0.4], [0.19, 0.55], [0.1, 0.68], [0.07, 0.72], [0.07, 0.84], [0.09, 0.86], [0, 0.86]], 24);
      b.add(amph, potM, M4(-1.55, 0, -2.6, 0.4)); b.add(amph, potM, M4(-1.6, 0, -1.9, 1.7, 0.05, 0, [0.85, 0.85, 0.85]));
      // a bronze tripod brazier
      b.add(lathe([[0, 0], [0.26, 0.0], [0.3, 0.06], [0.28, 0.16], [0, 0.12]], 20), bronze, M4(-1.2, 1.05, 6.2));
      for (let q = 0; q < 3; q++) { const a = (q / 3) * TAU; b.add(strut(V(-1.2 + Math.cos(a) * 0.32, 0, 6.2 + Math.sin(a) * 0.32), V(-1.2 + Math.cos(a) * 0.2, 1.06, 6.2 + Math.sin(a) * 0.2), 0.018), bronze); }
    }
    // ---- behind the camera: a temple wall (closes the set) ----
    b.add(boxGeo(V(-10, 0, 9.4), V(10, 5.4, 10.4), 5.2), wallM);
    b.add(boxGeo(V(-10.1, 5.4, 9.3), V(10.1, 5.8, 10.5)), marble);
    b.build(G);

    // ---- terrain (headland, plain, Acropolis rock, islands, far mountains) ----
    const A = { x: -190, z: -620 };
    const coastX = (z: number) => -10 + 0.14 * Math.min(z, 0) + 9 * Math.sin(z * 0.011 + 1.3) + 4 * Math.sin(z * 0.037);
    const H = (x: number, z: number) => {
      const dz = Math.max(0, -6.5 - z), dx = Math.max(0, Math.abs(x) - 15);
      const u = Math.hypot(dz, dx * 0.8) / 46;
      const rock = (fbm(x * 0.08, z * 0.08) - 0.5) * 10 * clamp01(u * 3) * (1 - clamp01(u));
      let hd = 66 * Math.pow(1 - smooth(u), 0.9) - 7.4 + rock;
      if (z > 10) hd = Math.max(hd, 58.6 + Math.min(30, (z - 10) * 0.35) * (1 - smooth((Math.abs(x) - 25) / 60)));
      const land = coastX(z) - x, m = sm(-6, 22, land);
      const plain = 3 + 7 * fbm(x * 0.008, z * 0.008) + Math.max(0, land - 120) * 0.04;
      let hl = -7 + (plain + 7) * m;
      const e = Math.hypot((x - A.x) / 46, (z - A.z) / 22);
      const ha = 66 * (1 - sm(0.8, 1.15, e)) + 20 * (1 - sm(1.0, 1.9, e)) + (fbm(x * 0.05, z * 0.05) - 0.5) * 6 * sm(0.7, 1.0, e) * (1 - sm(1.1, 2.0, e));
      hl = Math.max(hl, ha);
      let hi = -30;
      for (const [ix, iz, ir, ih] of [[150, -560, 70, 34], [330, -840, 130, 62], [90, -1250, 210, 95], [520, -620, 60, 24]] as const) {
        const d = Math.hypot(x - ix, (z - iz) * 1.3) / ir;
        hi = Math.max(hi, ih * Math.pow(1 - smooth(d), 1.4) * (0.8 + 0.4 * fbm(x * 0.02, z * 0.02)) - 4);
      }
      const r = Math.hypot(x, z);
      const mt = sm(0, 120, coastX(z) - x - 200) * sm(800, 1500, r) * (60 + 110 * fbm(Math.atan2(z, x) * 6, 3.1)) - 10;
      return Math.max(hd, hl, hi, mt);
    };
    {
      const NR = 170, NA = 300, pos: number[] = [], idx: number[] = [], col: number[] = [], Hs: number[] = [];
      for (let i = 0; i <= NR; i++) {
        const r = 2400 * Math.pow(i / NR, 2.3);
        for (let j = 0; j < NA; j++) {
          const a = (j / NA) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r, hgt = H(x, z);
          Hs.push(hgt); pos.push(x, hgt - 60, z);
        }
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) {
        const a = i * NA + j, bb = i * NA + ((j + 1) % NA), c = a + NA, d = bb + NA;
        idx.push(a, c, bb, bb, c, d);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const nrm = g.attributes.normal as THREE.BufferAttribute, c = new THREE.Color();
      const sand = new THREE.Color("#f0d8a6"), rockC = new THREE.Color("#dba878"), rockD = new THREE.Color("#b9825e"), scrub = new THREE.Color("#a8a05c"), plainC = new THREE.Color("#d9bc7e"), field = new THREE.Color("#b9b264"), far = new THREE.Color("#a8889a");
      for (let i = 0; i < Hs.length; i++) {
        const x = pos[i * 3], z = pos[i * 3 + 2], hgt = Hs[i], ny = nrm.getY(i), r = Math.hypot(x, z);
        const steep = 1 - sm(0.55, 0.85, ny), nz = fbm(x * 0.03, z * 0.03);
        c.copy(plainC).lerp(field, sm(0.45, 0.65, n2(x * 0.02, z * 0.02)) * 0.7).lerp(scrub, sm(0.5, 0.7, nz) * 0.6);
        c.lerp(rockC, steep).lerp(rockD, steep * 0.5 * (0.5 + 0.5 * Math.sin(hgt * 0.9)));
        c.lerp(sand, 1 - sm(0.5, 3.5, hgt));
        c.lerp(far, sm(600, 1400, r) * 0.6);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      mesh(g, M("terrainG", { vertexColors: true }), G, false, true);
    }
    // ---- Acropolis buildings ----
    {
      const ab = new Batch(), top = 10, mar = M("acroMarble", { color: "#f4e6cf" }), mw = M("acroWall", { color: "#d8b48a" });
      const cx = A.x, cz = A.z;
      for (let k = 0; k < 40; k++) { // fortification wall along the rim
        const a0 = (k / 40) * TAU, a1 = ((k + 1) / 40) * TAU;
        const p0 = V(cx + Math.cos(a0) * 46 * 0.86, top, cz + Math.sin(a0) * 22 * 0.86), p1 = V(cx + Math.cos(a1) * 46 * 0.86, top, cz + Math.sin(a1) * 22 * 0.86);
        const mid = p0.clone().add(p1).multiplyScalar(0.5), L = p0.distanceTo(p1), yaw = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
        ab.add(new THREE.BoxGeometry(L + 0.6, 6, 2.2), mw, M4(mid.x, top - 1.5, mid.z, yaw));
      }
      const px = cx + 4, pz = cz - 2, W2 = 30, D2 = 13;
      ab.add(boxGeo(V(px - W2, top - 0.5, pz - D2), V(px + W2, top + 1.5, pz + D2)), mar);
      const col = new THREE.CylinderGeometry(0.85, 0.98, 10.4, 10);
      for (let i = 0; i < 17; i++) for (const zz of [-D2 + 1.4, D2 - 1.4]) ab.add(col, mar, M4(px - W2 + 1.4 + i * ((2 * W2 - 2.8) / 16), top + 1.5 + 5.2, pz + zz));
      for (let i = 1; i < 7; i++) for (const xx of [-W2 + 1.4, W2 - 1.4]) ab.add(col, mar, M4(px + xx, top + 1.5 + 5.2, pz - D2 + 1.4 + i * ((2 * D2 - 2.8) / 7)));
      ab.add(boxGeo(V(px - W2 + 4, top + 1.5, pz - D2 + 4), V(px + W2 - 4, top + 11.5, pz + D2 - 4)), M("acroCella", { color: "#e2c9a6" }));
      ab.add(boxGeo(V(px - W2 + 0.4, top + 11.9, pz - D2 + 0.4), V(px + W2 - 0.4, top + 15.2, pz + D2 - 0.4)), mar);
      ab.add(boxGeo(V(px - W2 + 0.6, top + 12.7, pz + D2 - 0.44), V(px + W2 - 0.6, top + 14.0, pz + D2 - 0.3)), M("acroFrieze", { color: "#c8665a" }));
      for (const sx of [-1, 1]) {
        const x0 = px + sx * (W2 - 0.4);
        ab.add(sx > 0 ? tri3(V(x0, top + 15.2, pz - D2 + 0.4), V(x0, top + 19.4, pz), V(x0, top + 15.2, pz + D2 - 0.4)) : tri3(V(x0, top + 15.2, pz + D2 - 0.4), V(x0, top + 19.4, pz), V(x0, top + 15.2, pz - D2 + 0.4)), mar);
      }
      const rf = M("acroRoof", { color: "#c47a58", side: THREE.DoubleSide });
      ab.add(quad(V(px - W2, top + 15.2, pz + D2), V(px + W2, top + 15.2, pz + D2), V(px + W2, top + 19.4, pz), V(px - W2, top + 19.4, pz)), rf);
      ab.add(quad(V(px + W2, top + 15.2, pz - D2), V(px - W2, top + 15.2, pz - D2), V(px - W2, top + 19.4, pz), V(px + W2, top + 19.4, pz)), rf);
      ab.add(boxGeo(V(cx - 10, top, cz + 12), V(cx + 6, top + 7, cz + 17)), mar);
      ab.add(boxGeo(V(cx - 42, top - 2, cz - 9), V(cx - 33, top + 8, cz + 9)), mar);
      ab.add(new THREE.CylinderGeometry(0.4, 0.9, 9, 8).translate(0, 4.5, 0), bronze, M4(cx - 22, top, cz + 3));
      ab.build(G, true);
    }
    // ---- the city: white houses with terracotta roofs around the rock; cypresses + olive groves ----
    {
      const cb = new Batch(), r = rng(4040);
      const walls = [M("houseA", { color: "#f4ead8" }), M("houseB", { color: "#ead7b8" }), M("houseC", { color: "#e8c9a4" })];
      const roofs = [M("roofA", { color: "#c4603c" }), M("roofB", { color: "#b45238" })];
      const hip = new THREE.ConeGeometry(0.75, 0.42, 4, 1).rotateY(Math.PI / 4).translate(0, 0.21, 0);
      for (let i = 0; i < 560; i++) {
        const a = r() * TAU, rr = 1.25 + r() * r() * 3.2, x = A.x + Math.cos(a) * 46 * rr, z = A.z + Math.sin(a) * 28 * rr;
        const w = 4 + r() * 5, d = 4 + r() * 5, hh2 = 3 + r() * 3, yaw = r() * 0.4 - 0.2 + (r() < 0.5 ? 0 : Math.PI / 2);
        if (coastX(z) - x < 14 || Math.hypot(x, z) < 70) continue;
        const hgt = H(x, z);
        if (Math.abs(hgt - H(x + 3, z + 3)) > 3 || hgt > 40) continue;
        const y = hgt - 60;
        cb.add(new THREE.BoxGeometry(w, hh2 + 2, d).translate(0, (hh2 + 2) / 2 - 2, 0), walls[i % 3], M4(x, y, z, yaw));
        cb.add(hip, roofs[i % 2], M4(x, y + hh2, z, yaw, 0, 0, [w * 0.75, 3.2, d * 0.75]));
      }
      const cyp = M("cypress", { color: "#3d5a34" }), grove = M("grove", { color: "#8a9a62" });
      for (let i = 0; i < 520; i++) {
        const x = (r() - 0.5) * 900, z = -30 - r() * 800, kind = r(), sz = r();
        if (coastX(z) - x < 4) continue;
        const hgt = H(x, z), sl = Math.abs(H(x + 2, z) - hgt) + Math.abs(H(x, z + 2) - hgt);
        if (sl > 2.5 || hgt < 1.5) continue;
        if (Math.hypot((x - A.x) / 46, (z - A.z) / 22) < 1.3) continue;
        const y = hgt - 60;
        if (kind < 0.35) { const h = 7 + sz * 7; cb.add(sphere(2), cyp, M4(x, y + h * 0.5, z, 0, 0, 0, [h * 0.13, h * 0.5, h * 0.13])); }
        else { const s = 2 + sz * 1.6; cb.add(sphere(2), grove, M4(x, y + s * 0.8, z, kind * 60, 0, 0, [s, s * 0.7, s])); }
      }
      for (const [x, z, h] of [[-14, -14, 8], [-19, -18, 10], [13, -15, 9], [18, -21, 11], [-24, -8, 9], [24, -10, 9], [9, -26, 7]] as const) {
        const y = H(x, z) - 60;
        cb.add(sphere(1), cyp, M4(x, y + h * 0.5, z, 0, 0, 0, [h * 0.12, h * 0.52, h * 0.12]));
        cb.add(new THREE.CylinderGeometry(0.12, 0.18, 1.5, 6).translate(0, 0.75, 0), bark, M4(x, y - 0.2, z));
      }
      cb.build(G, true);
    }
    // ---- the Aegean ----
    {
      this.seaMat = new THREE.ShaderMaterial({
        uniforms: {
          uSun: { value: V(0, 0.1, -1) }, uT: { value: 0 }, uNear: { value: untone("#1a82a2") }, uDeep: { value: untone("#235f9c") },
          uHor: { value: untone("#d6a898") }, uCrest: { value: untone("#9fe0e0") }, uGlint: { value: new THREE.Color(2.4, 1.7, 0.95) },
          uFog: { value: new THREE.Color() }, uFogR: { value: new THREE.Vector2(80, 1400) }, uO: { value: V(...GREECE) },
        },
        vertexShader: SEA_VS, fragmentShader: SEA_FS, fog: false,
      });
      const g = new THREE.CircleGeometry(4200, 96).rotateX(-Math.PI / 2).translate(0, -60, 0);
      const m = new THREE.Mesh(g, this.seaMat); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = -0.3; G.add(m);
    }
    // ---- sail boats ----
    {
      const hullM = M("hull", { color: "#5a3a2a" }), sailM = M("sail", { color: "#f4e8d0", side: THREE.DoubleSide }), stripe = M("sailStripe", { color: "#b5452f", side: THREE.DoubleSide });
      for (const [x, z, s, yaw] of [[70, -230, 1, 0.5], [190, -420, 1.3, -0.3], [40, -520, 1.1, 0.9]] as const) {
        const bg = new THREE.Group(), bb = new Batch();
        bb.add(new THREE.SphereGeometry(1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2).scale(5, 1.4, 1.3).translate(0, 0.9, 0), hullM);
        bb.add(new THREE.CylinderGeometry(0.12, 0.15, 8, 6).translate(0, 4.5, 0), hullM);
        const sg = new THREE.PlaneGeometry(6, 5, 6, 4); const sp = sg.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < sp.count; i++) sp.setZ(i, 0.6 * Math.sin(((sp.getX(i) + 3) / 6) * Math.PI));
        sg.computeVertexNormals(); sg.rotateY(Math.PI / 2); sg.translate(0.3, 5, 0);
        bb.add(sg, sailM);
        bb.add(new THREE.PlaneGeometry(6, 0.6).rotateY(Math.PI / 2).translate(0.95, 5, 0), stripe);
        bb.build(bg, false);
        bg.position.set(x, -60, z); bg.rotation.y = yaw; bg.scale.setScalar(s); G.add(bg); this.boats.push(bg);
      }
    }
    // ---- gulls ----
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gullTex(), transparent: true, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 1; G.add(s); this.gulls.push(s);
    }
    // ---- warm clouds low on the horizon ----
    for (const [a, el, w, seed] of [[-0.35, 4.5, 330, 1], [0.12, 6.5, 260, 2], [0.55, 3.2, 300, 3], [-0.9, 7, 280, 4], [1.2, 5, 260, 5], [-1.6, 3.5, 300, 6]] as const) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(70 + seed, CLOUD_GOLD), transparent: true, depthWrite: false, fog: false }));
      const d = 1600, dir = V(Math.sin(a), 0, -Math.cos(a));
      s.position.set(dir.x * d, Math.tan((el * Math.PI) / 180) * d, dir.z * d); s.scale.set(w * 1.6, w * 0.8, 1); s.layers.set(NOINK); s.renderOrder = -0.5; s.frustumCulled = false; G.add(s);
    }
  }

  // ======================================================================== ENGLAND
  private buildEngland() {
    const E = this.england, b = new Batch();
    const stone = M("stone", { map: stoneTex() }), gravel = M("gravel", { map: gravelTex() });
    const yew = M("yew", { map: yewTex("er_yewT", "#2f5a34", "rgba(150,200,120,0.35)", "rgba(10,40,20,0.35)") });
    const box = M("box", { map: yewTex("er_boxT", "#4c7f3a", "rgba(190,230,140,0.4)", "rgba(20,60,20,0.3)") });
    // ---- ground: lawns, park, far hills ----
    const GH = (x: number, z: number) => {
      const r = Math.hypot(x, z * 0.8);
      const roll = 3.5 * (fbm(x * 0.012, z * 0.012) - 0.3) * sm(40, 120, r);
      const hills = sm(180, 420, r) * (30 + 45 * fbm(Math.atan2(z, x) * 3 + 1.0, 2.0));
      return Math.max(0, roll) + hills;
    };
    {
      const NR = 120, NA = 220, pos: number[] = [], idx: number[] = [], col: number[] = [], uv: number[] = [];
      const c = new THREE.Color(), lawn = new THREE.Color("#ffffff"), stripeC = new THREE.Color("#e4f0c8"), park = new THREE.Color("#e8edc0"), fieldA = new THREE.Color("#f2e8b0"), fieldB = new THREE.Color("#c8dca8"), far = new THREE.Color("#c8c8cc");
      for (let i = 0; i <= NR; i++) {
        const r = 1500 * Math.pow(i / NR, 2.2);
        for (let j = 0; j < NA; j++) {
          const a = (j / NA) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r, y = GH(x, z);
          pos.push(x, y, z); uv.push(x / 3, z / 3);
          const stripe = (Math.floor((x + 100) / 2.2) % 2) * (1 - sm(20, 40, r));
          const fl = n2(x * 0.02, z * 0.02) > 0.5 ? fieldA : fieldB;
          c.copy(lawn).lerp(stripeC, stripe * 0.5).lerp(park, sm(30, 80, r)).lerp(fl, sm(90, 200, r) * 0.6).lerp(far, sm(300, 700, r) * 0.5);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * NA + j, bb = i * NA + ((j + 1) % NA), cc = a + NA, d = bb + NA; idx.push(a, cc, bb, bb, cc, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
      mesh(g, M("lawnE", { map: grassHD(), vertexColors: true, color: "#c4dc9c" }), E, false, true);
    }
    // ---- gravel walk + roundel ----
    {
      b.add(boxGeo(V(-1.0, 0, -21), V(1.0, 0.02, -2.4), 3), gravel);
      b.add(boxGeo(V(-1.0, 0, 2.4), V(1.0, 0.02, 16), 3), gravel);
      const rg = new THREE.CircleGeometry(2.62, 48).rotateX(-Math.PI / 2).translate(0, 0.024, 0);
      const uvA = rg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 1.75, uvA.getY(i) * 1.75);
      b.add(rg, gravel);
      for (let k = 0; k < 48; k++) { // stone kerb ring
        const am = ((k + 0.5) / 48) * TAU;
        b.add(new THREE.BoxGeometry(0.14, 0.07, 2.67 * (TAU / 48) + 0.01).translate(0, 0.035, 0), stone, M4(Math.cos(am) * 2.69, 0, Math.sin(am) * 2.69, -am));
      }
    }
    // ---- low box hedges (rounded) ----
    const hedge = (x0: number, z0: number, x1: number, z1: number, h = 0.5, w = 0.42) => {
      const L = Math.hypot(x1 - x0, z1 - z0); if (L < 0.2) return;
      b.add(new RoundedBoxGeometry(L + w * 0.5, h, w, 3, Math.min(0.16, h * 0.4)), box, M4((x0 + x1) / 2, h / 2 - 0.02, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0)));
    };
    {
      const R = 2.98, n = 26;
      for (let k = 0; k < n; k++) {
        const a0 = (k / n) * TAU, a1 = ((k + 1) / n) * TAU, am = (a0 + a1) / 2;
        if (Math.abs(Math.cos(am) * R) < 1.3) continue;
        hedge(Math.cos(a0) * R, Math.sin(a0) * R, Math.cos(a1) * R, Math.sin(a1) * R, 0.46, 0.38);
      }
      for (const s of [-1, 1]) for (const [za, zb] of [[-19.2, -4.2], [4.2, 13.2]] as const) {
        hedge(s * 1.25, za, s * 1.25, zb); hedge(s * 4.85, za, s * 4.85, zb);
        hedge(s * 1.46, za, s * 4.64, za); hedge(s * 1.46, zb, s * 4.64, zb);
      }
    }
    // ---- lavender (grey-green mounds + purple spikes) ----
    {
      const lavLeaf = M("lavLeaf", { color: "#7f9a7a" }), lavFl = M("lavFl", { color: "#9a72e6" }), lavFl2 = M("lavFl2", { color: "#b892f2" });
      // flower heads: a cloud of purple dabs over the mound (no thin stalks: they would ink into black hair)
      const r = rng(808), spikes: THREE.BufferGeometry[] = [], spikes2: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 26; k++) {
        const a = r() * TAU, rr = Math.sqrt(r()) * 0.3, y = 0.2 + (1 - rr / 0.3) * 0.16 + r() * 0.08;
        const g = new THREE.SphereGeometry(1, 6, 5).scale(0.028, 0.075, 0.028).rotateZ(rr * 1.2).rotateY(a).translate(Math.cos(a) * rr, y, -Math.sin(a) * rr);
        (k % 3 ? spikes : spikes2).push(g);
      }
      const spG = mergeGeometries(spikes, false), spG2 = mergeGeometries(spikes2, false);
      const bush = (x: number, z: number, s: number, yaw: number) => {
        b.add(sphere(1), lavLeaf, M4(x, 0.05 * s, z, yaw, 0, 0, [0.27 * s, 0.17 * s, 0.27 * s]));
        b.add(spG, lavFl, M4(x, 0, z, yaw, 0, 0, [s, s, s])); b.add(spG2, lavFl2, M4(x, 0, z, yaw, 0, 0, [s, s, s]));
      };
      for (const s of [-1, 1]) for (const [za, zb] of [[-18.6, -4.8], [4.8, 12.6]] as const) {
        for (const xx of [1.95, 2.75, 3.5, 4.2]) for (let z = za; z <= zb; z += 0.58) if (Math.hypot(xx - 3.0, z + 11.3) > 0.95 && Math.hypot(xx - 3.0, z - 8.3) > 0.95) bush(s * (xx + (hh(z * 7, xx) - 0.5) * 0.12), z + (hh(z, xx) - 0.5) * 0.1, 0.95 + hh(z, xx * 3) * 0.3, hh(z, xx) * 6);
      }
      for (let k = 0; k < 34; k++) { // a lavender ring outside the roundel hedge
        const a = (k / 34) * TAU, x = Math.cos(a) * 3.55, z = Math.sin(a) * 3.55;
        if (Math.abs(x) < 1.95) continue;
        bush(x, z, 1.0 + hh(k, 4) * 0.25, k);
      }
    }
    // ---- sundial (bronze dial on a stone baluster) ----
    {
      const sx = -1.45, sz = -1.05, bronze = M("bronzeE", { color: "#a07a3a" });
      b.add(lathe([[0, 0], [0.32, 0], [0.32, 0.08], [0.26, 0.1], [0.26, 0.16], [0.14, 0.22], [0.11, 0.4], [0.15, 0.62], [0.12, 0.84], [0.09, 0.9], [0.18, 0.96], [0.22, 1.02], [0.22, 1.06], [0, 1.06]], 28), stone, M4(sx, 0, sz));
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32).translate(0, 1.07, 0), bronze, M4(sx, 0, sz));
      for (let k = 0; k < 12; k++) b.add(new THREE.BoxGeometry(0.012, 0.006, 0.04).translate(0, 1.083, 0.165), M("dialMark", { color: "#3a2a1a" }), M4(sx, 0, sz, (k / 12) * TAU));
      const gn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.2, 0.28).translate(0, 0.1, 0).applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, 0, -0.65)), bronze);
      gn.position.set(sx, 1.08, sz); gn.rotation.y = 0.5; gn.castShadow = true; gn.receiveShadow = true; gn.frustumCulled = false; E.add(gn);
    }
    // ---- urns, topiary cones, yew walls ----
    {
      const urn = lathe([[0, 0], [0.22, 0], [0.22, 0.12], [0.12, 0.18], [0.1, 0.5], [0.14, 0.56], [0.12, 0.6], [0.3, 0.72], [0.34, 0.9], [0.3, 1.06], [0.36, 1.1], [0.36, 1.16], [0, 1.16]], 24);
      for (const s of [-1, 1]) {
        b.add(boxGeo(V(s * 1.5 - 0.26, 0, -3.96), V(s * 1.5 + 0.26, 0.55, -3.44)), stone);
        b.add(urn, stone, M4(s * 1.5, 0.55, -3.7));
        b.add(sphere(1), box, M4(s * 1.5, 1.82, -3.7, 0, 0, 0, [0.27, 0.2, 0.27]));
        for (const z of [-11.3, 8.3]) {
          b.add(new THREE.ConeGeometry(0.62, 2.4, 20, 4).translate(0, 1.2 + 0.25, 0), yew, M4(s * 3.0, 0, z));
          b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16).translate(0, 0.15, 0), M("soilE", { color: "#5a4632" }), M4(s * 3.0, 0, z));
        }
        b.add(new RoundedBoxGeometry(1.0, 1.7, 34, 3, 0.22), yew, M4(s * 9.2, 0.83, -3.5));
        for (const z of [-20.4, 13.4]) b.add(sphere(0), yew, M4(s * 9.2, 2.05, z, 0, 0, 0, [0.5, 0.5, 0.5]));
      }
    }
    // ---- terrace in front of the manor ----
    {
      b.add(boxGeo(V(-14, 0, -22.2), V(14, 0.6, -19.0), 2.4), stone);
      for (let k = 0; k < 3; k++) b.add(boxGeo(V(-2.2, 0, -19.0 + k * 0.36), V(2.2, 0.6 - k * 0.2, -19.0 + (k + 1) * 0.36)), stone);
      const bal = lathe([[0, 0], [0.06, 0], [0.06, 0.04], [0.08, 0.18], [0.04, 0.34], [0.06, 0.4], [0, 0.4]], 10);
      for (const s of [-1, 1]) {
        for (let x = 2.7; x <= 13.6; x += 0.25) b.add(bal, stone, M4(s * x, 0.68, -19.25));
        b.add(boxGeo(V(s > 0 ? 2.4 : -13.9, 0.6, -19.4), V(s > 0 ? 13.9 : -2.4, 0.68, -19.1)), stone);
        b.add(boxGeo(V(s > 0 ? 2.4 : -13.9, 1.08, -19.45), V(s > 0 ? 13.9 : -2.4, 1.16, -19.05)), stone);
        b.add(boxGeo(V(s * 2.4 - 0.22, 0.6, -19.5), V(s * 2.4 + 0.22, 1.3, -19.0)), stone);
        b.add(sphere(1), stone, M4(s * 2.4, 1.45, -19.25, 0, 0, 0, [0.17, 0.17, 0.17]));
      }
    }
    b.build(E);
    this.buildManor(E);
    // ---- parkland, woods, church (the low sun comes from the LEFT: keep that sector open so the garden is sunlit) ----
    const sunSector = (x: number, z: number, rr: number) => { const a = Math.atan2(x, -z) * 180 / Math.PI; return a < -32 && a > -105 && rr < 160; };
    {
      const pb = new Batch(), r = rng(1235);
      for (let i = 0; i < 170; i++) {
        const a = r() * TAU, rr = 30 + r() * 220, x = Math.cos(a) * rr, z = Math.sin(a) * rr * 0.9, h = 10 + r() * 10, k = r();
        if (Math.abs(x) < 16 && z > -42) continue;
        if (Math.abs(x) < 26 && z > -46 && z < -14) continue;
        if (sunSector(x, z, rr)) continue;
        addVeg(pb, k < 0.7 ? "round" : "fat", x, GH(x, z), z, h, 900 + i, rr > 80 ? 2 : 1);
      }
      for (const [x, z, h] of [[-21, -40, 17], [24, -38, 19], [31, -24, 13], [-15, -52, 18], [19, -54, 20], [0, -60, 21], [37, -6, 14], [-30, 14, 13]] as const) if (!sunSector(x, z, Math.hypot(x, z))) addVeg(pb, "round", x, 0, z, h, 70 + x, 0);
      const cs = M("church", { color: "#cdbf9e" });
      pb.add(boxGeo(V(-150, 0, -210), V(-142, 16, -202)), cs);
      pb.add(new THREE.ConeGeometry(5.2, 16, 4).rotateY(Math.PI / 4).translate(-146, 24, -206), M("spire", { color: "#6a6a78" }));
      pb.add(boxGeo(V(-168, 0, -209), V(-150, 9, -203)), cs);
      pb.build(E, true);
    }
    // ---- mist banks (NOINK sprites, drift) ----
    {
      const r = rng(5150);
      for (let i = 0; i < 34; i++) {
        const z = -12 - r() * 120, x = (r() - 0.5) * (40 + Math.abs(z) * 1.2), w = 18 + r() * 30 + Math.abs(z) * 0.3, y = 0.2 + r() * 0.8 + Math.abs(z) * 0.015, o = 0.35 + r() * 0.3;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex(), color: new THREE.Color(1.0, 0.97, 0.9), transparent: true, opacity: o, depthWrite: false, fog: false }));
        s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 2;
        E.add(s); this.mist.push({ s, x, y, z, w, sp: 0.15 + r() * 0.25, ph: r() * TAU });
      }
    }
    // ---- pollen motes glinting in the sun ----
    {
      const N = 140, r = rng(31337);
      this.moteBase = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) this.moteBase.set([(r() - 0.5) * 12, 0.3 + r() * 3.2, -6 + r() * 9, r() * TAU], i * 4);
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      this.motes = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.045, map: softDot("er_mote"), color: new THREE.Color(1.6, 1.3, 0.8), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
      this.motes.layers.set(NOINK); this.motes.frustumCulled = false; this.motes.renderOrder = 3; E.add(this.motes);
    }
    // ---- soft pale clouds ----
    const pal = { lit: "#fff6e4", mid: "#ece6e2", shade: "#c6ccdc" };
    for (const [a, el, w, seed] of [[-0.5, 6, 300, 1], [0.25, 9, 280, 2], [0.8, 5, 320, 3], [-1.2, 8, 260, 4], [1.5, 7, 280, 5]] as const) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(90 + seed, pal), transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      const d = 1000, dir = V(Math.sin(a), 0, -Math.cos(a));
      s.position.set(dir.x * d, Math.tan((el * Math.PI) / 180) * d, dir.z * d); s.scale.set(w * 1.4, w * 0.7, 1); s.layers.set(NOINK); s.renderOrder = -0.5; s.frustumCulled = false; E.add(s);
    }
  }

  /** red-brick Jacobean manor, centred on x 0: main block facade z -26, wings x +-(8.5..14) forward to z -22 */
  private buildManor(E: THREE.Group) {
    const b = new Batch();
    const brick = M("brick", { map: brickTex() }), stone = M("stone", { map: stoneTex() }), glass = M("glass", { map: glassTex() });
    const slate = M("slate", { map: roofHD("#6a6470", true), side: THREE.DoubleSide });
    const Z0 = -26, ZW = -22, BACK = -38, EAV = 10.6, RID = 15.2;
    b.add(boxGeo(V(-8.5, 0, BACK), V(8.5, EAV, Z0), 2.4), brick);
    for (const s of [-1, 1]) b.add(boxGeo(V(s > 0 ? 8.5 : -14, 0, BACK), V(s > 0 ? 14 : -8.5, EAV, ZW), 2.4), brick);
    // stone plinth, string courses, cornice: proud of the brick on every visible face
    const band = (y0: number, y1: number, d: number) => {
      b.add(boxGeo(V(-8.5, y0, Z0), V(8.5, y1, Z0 + d)), stone);
      for (const s of [-1, 1]) {
        b.add(boxGeo(V(s > 0 ? 8.5 - d : -14 - d, y0, ZW), V(s > 0 ? 14 + d : -8.5 + d, y1, ZW + d)), stone);   // wing front
        b.add(boxGeo(V(s > 0 ? 14 : -14 - d, y0, BACK), V(s > 0 ? 14 + d : -14, y1, ZW)), stone);               // wing outer side
        b.add(boxGeo(V(s > 0 ? 8.5 - d : -8.5, y0, Z0 + d), V(s > 0 ? 8.5 : -8.5 + d, y1, ZW)), stone);          // wing inner side
      }
    };
    band(0, 0.7, 0.12); band(3.85, 4.05, 0.08); band(7.35, 7.55, 0.08); band(EAV - 0.35, EAV, 0.16);
    // quoins on the wing front corners
    for (const s of [-1, 1]) for (let k = 0; k < 13; k++) {
      const y = 0.78 + k * 0.7, w = k % 2 ? 0.42 : 0.7;
      for (const cx of [s * 14, s * 8.5]) {
        const inward = cx === s * 14 ? -s : s;
        const x0 = cx, x1 = cx + inward * w;
        b.add(boxGeo(V(Math.min(x0, x1), y, ZW), V(Math.max(x0, x1), y + 0.3, ZW + 0.05)), stone);
      }
    }
    // mullion windows: stone surround, mullions + transom, leaded glass (all proud of the wall face, nothing coplanar)
    const win = (cx: number, y0: number, w: number, h: number, zf: number, nM: number) => {
      const t = 0.12;
      b.add(quad(V(cx - w / 2, y0, zf + 0.025), V(cx + w / 2, y0, zf + 0.025), V(cx + w / 2, y0 + h, zf + 0.025), V(cx - w / 2, y0 + h, zf + 0.025), w / 1.2, h / 1.2), glass);
      b.add(boxGeo(V(cx - w / 2 - 0.16, y0 - 0.16, zf), V(cx + w / 2 + 0.16, y0, zf + t + 0.04)), stone);
      b.add(boxGeo(V(cx - w / 2 - 0.2, y0 + h, zf), V(cx + w / 2 + 0.2, y0 + h + 0.2, zf + t + 0.06)), stone);
      b.add(boxGeo(V(cx - w / 2 - 0.12, y0, zf), V(cx - w / 2, y0 + h, zf + t)), stone);
      b.add(boxGeo(V(cx + w / 2, y0, zf), V(cx + w / 2 + 0.12, y0 + h, zf + t)), stone);
      for (let k = 1; k < nM; k++) { const x = cx - w / 2 + (k * w) / nM; b.add(boxGeo(V(x - 0.05, y0, zf), V(x + 0.05, y0 + h, zf + t - 0.02)), stone); }
      b.add(boxGeo(V(cx - w / 2, y0 + h * 0.64 - 0.05, zf), V(cx + w / 2, y0 + h * 0.64 + 0.05, zf + t - 0.02)), stone);
    };
    for (const [y0, h] of [[1.25, 2.3], [4.6, 2.4], [8.0, 1.9]] as const) {
      for (const x of [-6.2, -3.6, 3.6, 6.2]) win(x, y0, 1.7, h, Z0, 3);
      for (const s of [-1, 1]) win(s * 11.25, y0, 2.6, h, ZW, 4);
    }
    // Dutch gables (curved shoulders, pediment, ball finials) + gable window + oculus
    const gable = (cx: number, zf: number, w: number) => {
      const hw = w / 2, top = 6.2;
      const prof: [number, number][] = [[-hw, 0], [-hw, 0.6], [-hw * 0.78, 1.0], [-hw * 0.72, 1.9], [-hw * 0.5, 2.3], [-hw * 0.48, 3.4], [-hw * 0.3, 3.9], [-hw * 0.3, 5.1], [-hw * 0.38, 5.1], [0, top], [hw * 0.38, 5.1], [hw * 0.3, 5.1], [hw * 0.3, 3.9], [hw * 0.48, 3.4], [hw * 0.5, 2.3], [hw * 0.72, 1.9], [hw * 0.78, 1.0], [hw, 0.6], [hw, 0]];
      const sh = new THREE.Shape(prof.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false, curveSegments: 6 });
      const uvA = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 2.4, uvA.getY(i) / 2.4);
      b.add(g, brick, M4(cx, EAV, zf - 0.5));
      for (let i = 1; i < prof.length - 2; i++) { // stone coping
        const [xa, ya] = prof[i], [xb, yb] = prof[i + 1], L = Math.hypot(xb - xa, yb - ya), ang = Math.atan2(yb - ya, xb - xa);
        b.add(new THREE.BoxGeometry(L + 0.12, 0.16, 0.62).translate(L / 2, 0.08, 0), stone, M4(cx + xa, EAV + ya, zf - 0.25, 0, 0, ang));
      }
      b.add(sphere(1), stone, M4(cx, EAV + top + 0.45, zf - 0.25, 0, 0, 0, [0.28, 0.28, 0.28]));
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 0.3, 10).translate(0, 0.15, 0), stone, M4(cx, EAV + top + 0.05, zf - 0.25));
      for (const s of [-1, 1]) b.add(sphere(1), stone, M4(cx + s * hw * 0.6, EAV + 2.55, zf - 0.25, 0, 0, 0, [0.2, 0.2, 0.2]));
      win(cx, EAV + 1.3, Math.min(1.5, w * 0.34), 1.6, zf, 3);
      b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 24).rotateX(Math.PI / 2).translate(0, 0, 0.03), stone, M4(cx, EAV + 4.4, zf));
    };
    for (const s of [-1, 1]) gable(s * 11.25, ZW, 5.5);
    gable(0, Z0, 4.4); // central gable above the porch
    // roofs: main ridge along x, wing ridges along z
    {
      const zm = (Z0 + BACK) / 2;
      b.add(quad(V(-8.5, EAV, Z0 + 0.3), V(8.5, EAV, Z0 + 0.3), V(8.5, RID, zm), V(-8.5, RID, zm), 17 / 2.4, 7 / 2.4), slate);
      b.add(quad(V(8.5, EAV, BACK - 0.3), V(-8.5, EAV, BACK - 0.3), V(-8.5, RID, zm), V(8.5, RID, zm), 17 / 2.4, 7 / 2.4), slate);
      for (const s of [-1, 1]) {
        const xa = s * 8.5, xb = s * 14, xm = s * 11.25, rr = RID + 0.6;
        b.add(quad(V(xa - s * 0.3, EAV, ZW - 0.4), V(xa - s * 0.3, EAV, BACK - 0.3), V(xm, rr, BACK - 0.3), V(xm, rr, ZW - 0.4), 16 / 2.4, 6.5 / 2.4), slate);
        b.add(quad(V(xb + s * 0.3, EAV, BACK - 0.3), V(xb + s * 0.3, EAV, ZW - 0.4), V(xm, rr, ZW - 0.4), V(xm, rr, BACK - 0.3), 16 / 2.4, 6.5 / 2.4), slate);
        b.add(tri3(V(xa, EAV, BACK), V(xm, rr, BACK), V(xb, EAV, BACK)), brick);
      }
      b.add(tri3(V(-8.5, EAV, BACK), V(0, RID, BACK), V(8.5, EAV, BACK)), brick);
    }
    // clustered octagonal chimney stacks
    for (const [x, z] of [[-11.25, -31], [11.25, -31], [-4.5, -32], [4.5, -32]] as const) {
      b.add(boxGeo(V(x - 1.1, RID - 2.5, z - 0.6), V(x + 1.1, RID + 0.8, z + 0.6), 2.4), brick);
      for (let k = 0; k < 3; k++) {
        const cx = x - 0.7 + k * 0.7;
        b.add(new THREE.CylinderGeometry(0.28, 0.28, 2.6, 8).translate(0, 1.3, 0), brick, M4(cx, RID + 0.85, z));
        b.add(new THREE.CylinderGeometry(0.36, 0.3, 0.3, 8).translate(0, 0.15, 0), brick, M4(cx, RID + 3.45, z));
      }
      b.add(boxGeo(V(x - 1.15, RID + 0.7, z - 0.65), V(x + 1.15, RID + 0.85, z + 0.65)), stone);
    }
    // stone porch: arched doorway, columns, strapwork parapet
    {
      const pz0 = Z0, pz1 = Z0 + 2.4;
      b.add(boxGeo(V(-2.1, 0, pz0), V(-1.3, 7.4, pz1)), stone);
      b.add(boxGeo(V(1.3, 0, pz0), V(2.1, 7.4, pz1)), stone);
      b.add(boxGeo(V(-1.3, 3.5, pz0), V(1.3, 7.4, pz1)), stone);
      { const sp = new THREE.Shape(); sp.moveTo(-1.3, 2.4); sp.lineTo(-1.1, 2.4); sp.absarc(0, 2.4, 1.1, Math.PI, 0, true); sp.lineTo(1.3, 2.4); sp.lineTo(1.3, 3.5); sp.lineTo(-1.3, 3.5); sp.lineTo(-1.3, 2.4);
        b.add(new THREE.ExtrudeGeometry(sp, { depth: 2.4, bevelEnabled: false, curveSegments: 20 }), stone, M4(0, 0, pz0)); } // spandrel over the arch
      b.add(boxGeo(V(-2.3, 7.4, pz0), V(2.3, 7.75, pz1 + 0.15)), stone);
      for (const s of [-1, 1]) { b.add(new THREE.CylinderGeometry(0.17, 0.2, 3.4, 16).translate(0, 1.7, 0), stone, M4(s * 1.7, 0.2, pz1 + 0.25)); }
      { // moulded round arch (a half annulus), proud of the porch front
        const ar = new THREE.Shape(); ar.absarc(0, 0, 1.55, 0, Math.PI, false); ar.lineTo(-1.1, 0); ar.absarc(0, 0, 1.1, Math.PI, 0, true); ar.lineTo(1.55, 0);
        b.add(new THREE.ExtrudeGeometry(ar, { depth: 0.14, bevelEnabled: false, curveSegments: 20 }), stone, M4(0, 2.4, pz1));
        b.add(boxGeo(V(-0.14, 3.42, pz1), V(0.14, 3.85, pz1 + 0.18)), stone); // keystone
      }
      const door = ctex("er_door", 256, 512, (g) => {
        g.fillStyle = "#4a2e22"; g.fillRect(0, 0, 256, 512);
        g.strokeStyle = "#2a1812"; g.lineWidth = 4; for (let x = 32; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
        g.fillStyle = "#1c120e"; for (const y of [90, 260, 430]) g.fillRect(10, y, 236, 12);
        g.fillStyle = "#c79a4a"; g.beginPath(); g.arc(200, 290, 10, 0, TAU); g.fill();
      });
      const dg = new THREE.Shape(); dg.moveTo(-1.1, 0); dg.lineTo(1.1, 0); dg.lineTo(1.1, 2.4); dg.absarc(0, 2.4, 1.1, 0, Math.PI, false); dg.lineTo(-1.1, 0);
      const dgeo = new THREE.ShapeGeometry(dg, 12); const du = dgeo.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < du.count; i++) du.setXY(i, (du.getX(i) + 1.1) / 2.2, du.getY(i) / 3.5);
      b.add(dgeo, M("door", { map: door }), M4(0, 0.02, pz0 + 0.03));
      win(0, 4.4, 1.5, 2.2, pz1, 3);
    }
    b.build(E);
  }

  // ======================================================================== per frame
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const s = SHOTS[id - 1], g = s.place === "greece", e = s.place === "england";
    const dbg = DEBUG_CAM[_f];
    if (dbg && (g || e)) { // temporary preview vantage (OFF when DEBUG_CAM is empty)
      const o = g ? GREECE : ENGLAND, pc = cam as THREE.PerspectiveCamera;
      pc.position.set(o[0] + dbg[0][0], dbg[0][1], o[2] + dbg[0][2]); pc.lookAt(o[0] + dbg[1][0], dbg[1][1], o[2] + dbg[1][2]);
      pc.fov = dbg[2]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    this.greece.visible = g; this.england.visible = e;
    this.haloG.visible = g; this.haloE.visible = e;
    if (!g && !e) return;
    const sun = this.sunFor(id), cp = cam.position;
    const halo = g ? this.haloG : this.haloE;
    halo.position.copy(cp).addScaledVector(sun, 1000);
    halo.scale.setScalar(g ? 520 : 640);
    (halo.material as THREE.SpriteMaterial).opacity = g ? 0.85 : 0.75;
    if (g) {
      const u = this.seaMat.uniforms;
      u.uT.value = t; (u.uSun.value as THREE.Vector3).copy(sun);
      untone(LOOKS.greece.fog[0], u.uFog.value as THREE.Color);
      (u.uFogR.value as THREE.Vector2).set(LOOKS.greece.fog[1] * 3, LOOKS.greece.fog[2] * 1.8); // the sea keeps its blue further out
      this.boats.forEach((bt, i) => { bt.position.y = -60 + 0.25 * Math.sin(t * 1.3 + i * 2); bt.rotation.z = 0.04 * Math.sin(t * 1.1 + i); });
      this.gulls.forEach((gl, i) => { // lazy circles below the terrace, flapping by squashing the wings
        const a = t * (0.16 + i * 0.025) + i * 1.3, R = 14 + i * 5;
        gl.position.set(Math.cos(a) * R + (i - 2) * 6, -6 + i * 2.5 + Math.sin(t * 0.7 + i) * 1.2, -34 - i * 9 + Math.sin(a) * R * 0.5);
        const flap = 0.55 + 0.45 * Math.abs(Math.sin(t * (4.2 + i * 0.4) + i));
        gl.scale.set(1.6, 0.8 * flap, 1);
      });
    } else {
      for (const m of this.mist) {
        m.s.position.set(m.x + Math.sin(t * 0.2 * m.sp + m.ph) * 3 + t * m.sp, m.y + Math.sin(t * 0.2 + m.ph) * 0.15, m.z);
        m.s.scale.set(m.w, m.w * 0.13, 1);
      }
      const p = this.motes.geometry.attributes.position as THREE.BufferAttribute, B = this.moteBase;
      for (let i = 0; i < p.count; i++) {
        const ph = B[i * 4 + 3];
        p.setXYZ(i, B[i * 4] + Math.sin(t * 0.3 + ph) * 0.5 + t * 0.06, B[i * 4 + 1] + Math.sin(t * 0.45 + ph * 2) * 0.25, B[i * 4 + 2] + Math.cos(t * 0.27 + ph) * 0.4);
      }
      p.needsUpdate = true;
    }
  }
}
