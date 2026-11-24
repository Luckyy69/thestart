// OWNER: surface agent. See /home/user/lookmatch/MINERS_BRIEF.md
// The Atacama surface set (place "desert"; lit as desert / dusk / night by looks.ts):
//   terrain   : one big non-uniform grid (0.5 m cells at the mine portal, 2 m over the work basin, coarse far out),
//               ochre/rust dirt texture x vertex colours (rust patches, mountain strata bands), the brown mine mountain
//               with a cut bench + the portal culvert at MINE_MOUTH, rolling hills, a far ring of Andes peaks (snow caps)
//   roads     : dusty tyre-tracked ribbons (sampled on the exact terrain mesh) mouth -> camp / drill / shaft / out
//   mine mouth: steel+timber portal canopy, a dark tunnel, haul trucks, pickups, a light tower
//   CAMP      : Camp Hope: ~30 dome / ridge tents + tarps, a white marquee, waving Chilean flags (vertex shader),
//               the shrine (photos, flowers, candles with HDR flames), generators, string lights (HDR bulbs)
//   DRILL     : truck-mounted drill rig: lattice mast, sliding top drive, the rod string above props' lower string,
//               wellhead collar, pipe rack, mud pit, cuttings pile, light tower
//   SHAFT     : rescue platform: grated steel deck, shaft collar (top y = SHAFT_COLLAR_Y), tapered headframe with a big
//               yellow pulley wheel that turns with capsuleAt(), the hoist cable down to the capsule top, winch house,
//               crowd barriers, floodlight towers (beams + light pools at night), a giant Chilean flag
//   sky extras: stars (night only)
// Everything is a pure function of (id, t): seeded hashes only.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, V, lam, boxGeo } from "../bridge/build";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, camAt, CAMP, DRILL, SHAFT, MINE_MOUTH, rodAt, capsuleAt, smooth, clamp01, Look } from "./story";

// ---------------- contracts for other owners ----------------
/** shaft collar top (capsule base at SHAFT y + capsuleAt().y is hidden below this by the black hole disc) */
export const SHAFT_COLLAR_Y = 0.3;
/** the hoist cable ends at the capsule top = SHAFT y + capsuleAt().y + CAPSULE_TOP (props: put the cage eye there) */
export const CAPSULE_TOP = 4.0;
/** drill rod string, ONE string with no overlap: while rodAt().note, props draws the lower string (bit tip at up - 5
 *  up to the top tool joint at up + ROD_PROPS_TOP) and surface draws only the pipe above it up to the top drive;
 *  otherwise surface draws the whole string from the bore up. Pipe radius ROD_R = the props pipe radius. */
export const ROD_R = 0.05;
export const ROD_PROPS_TOP = -5 + 1.34 + 2 * 3 + 2.75 + 0.25;
/** free plaza at Camp Hope (no props inside this radius around CAMP): cast stands here */
export const CAMP_CLEAR = 11;

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;
type P2 = [number, number];

// ======================================================================================================
// terrain height
// ======================================================================================================
const WORK = { x0: -225, x1: 160, z0: -113, z1: 150 };
const MX = MINE_MOUTH[0], MZ = MINE_MOUTH[2]; // portal front at MZ + 8 (culvert sticks out of the cut bench)
const flatK = (x: number, z: number) => {
  const dx = Math.max(WORK.x0 - x, 0, x - WORK.x1), dz = Math.max(WORK.z0 - z, 0, z - WORK.z1);
  return 1 - smooth(Math.hypot(dx, dz) / 110);
};
const mountain = (x: number, z: number) => {
  const dx = (x - MX) / 330, dz = (z - (MZ - 175)) / 178, d = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
  const u = 1 - d * (1 + 0.07 * Math.sin(5 * a + 1) + 0.04 * Math.sin(11 * a + 2));
  let h = u > 0 ? 150 * Math.pow(u, 1.35) : 0;
  if (u > 0) h += 9 * u * Math.sin(x * 0.045 + 1) * Math.sin(z * 0.05) + 4 * u * Math.sin(x * 0.11 - z * 0.07);
  // the cut bench the portal is driven into: a steep face rising from z = MZ+5 .. MZ-13
  const lat = 1 - smooth((Math.abs(x - MX) - 60) / 110);
  h += 24 * smooth((MZ + 5 - z) / 18) * lat * (z > MZ - 330 ? 1 : 0.6);
  return h;
};
const hills = (x: number, z: number) => {
  const n = 9 * Math.sin(x * 0.0061 + 1.3) * Math.sin(z * 0.0073 + 0.4) + 5 * Math.sin(x * 0.017 - z * 0.011 + 2) + 2.4 * Math.sin(x * 0.043 + z * 0.037);
  const R = Math.hypot(x + 30, z);
  const g = smooth((R - 200) / 900), a = Math.atan2(z, x);
  return 10 + n + g * (60 + 55 * Math.sin(a * 3 + 1.1) + 25 * Math.sin(a * 7 + 0.3) + 18 * Math.sin(x * 0.004) * Math.cos(z * 0.005));
};
/** terrain height before the tunnel corridor is carved out (the overburden patch over the tunnel uses this) */
const rawH0 = (x: number, z: number) => {
  const f = flatK(x, z);
  let h = (1 - f) * hills(x, z) + mountain(x, z);
  if (f > 0 && z > WORK.z0 - 2) h *= 1 - f * smooth((z - (WORK.z0 - 8)) / 8); // basin floor exactly 0
  return h;
};
/** the tunnel runs from the portal front (MZ + 8) back to TUN_BACK inside the mountain */
const TUN_BACK = MZ - 40, TUN_HW = 3.0, TUN_H = 5.4, TUN_WALL = 1.1;
const rawH = (x: number, z: number) => {
  const h = rawH0(x, z);
  // tunnel corridor: the heightfield is carved down to the floor under the whole tunnel (walls + overburden patch
  // cover the trench), and in front of the portal only where the ground is low (apron)
  if (Math.abs(x - MX) < 3.5 && z > TUN_BACK && z < MZ + 7.5) return -0.3;
  if (Math.abs(x - MX) < 3.25 && z >= MZ + 7.5 && h < 6.6) return 0;
  return h;
};

// non-uniform grid ticks
const ticks = (lo: number, hi: number, fine: [number, number, number][], coarse: number) => {
  const out: number[] = [];
  let v = lo;
  while (v < hi) {
    out.push(v);
    let st = coarse;
    for (const [a, b, s] of fine) {
      const d = v < a ? a - v : v > b ? v - b : 0;
      st = Math.min(st, s + d * 0.055);
    }
    v += Math.max(0.5, st);
  }
  out.push(hi);
  return out;
};
const XS = ticks(-3000, 3000, [[MX - 12, MX + 12, 0.5], [-245, 175, 2]], 70);
const ZS = ticks(-3000, 3000, [[MZ - 43, MZ + 18, 0.5], [-150, 160, 2]], 70);
const NX = XS.length, NZ = ZS.length;
const HT = new Float32Array(NX * NZ);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) HT[j * NX + i] = rawH(XS[i], ZS[j]);
const find = (a: number[], v: number) => { let lo = 0, hi = a.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (a[m] <= v) lo = m; else hi = m - 1; } return lo; };
/** exact height of the rendered terrain mesh (same triangle split as the index buffer) */
export const groundY = (x: number, z: number) => {
  const i = find(XS, x), j = find(ZS, z);
  const u = clamp01((x - XS[i]) / (XS[i + 1] - XS[i])), v = clamp01((z - ZS[j]) / (ZS[j + 1] - ZS[j]));
  const a = HT[j * NX + i], b = HT[j * NX + i + 1], c = HT[(j + 1) * NX + i + 1], d = HT[(j + 1) * NX + i];
  return u >= v ? a + (b - a) * u + (c - b) * v : a + (c - d) * u + (d - a) * v;
};

// ======================================================================================================
// painted textures
// ======================================================================================================
const wrapped = (W: number, x: number, y: number, fn: (x: number, y: number) => void) => { for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) fn(x + ox, y + oy); };
const dirtTex = () => ctex("mn_dirt", 2048, 2048, (g, r) => {
  const W = 2048;
  g.fillStyle = "#cba684"; g.fillRect(0, 0, W, W);
  const blot = ["rgba(176,112,70,0.35)", "rgba(220,170,118,0.35)", "rgba(160,96,60,0.28)", "rgba(208,150,98,0.3)", "rgba(190,128,84,0.3)"];
  for (let k = 0; k < 260; k++) {
    const x = r() * W, y = r() * W, rad = 40 + r() * 220, c = blot[Math.floor(r() * blot.length)];
    wrapped(W, x, y, (px, py) => { const gr = g.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, c); gr.addColorStop(1, c.replace(/[\d.]+\)$/, "0)")); g.fillStyle = gr; g.beginPath(); g.arc(px, py, rad, 0, TAU); g.fill(); });
  }
  // wind ripples / fine streaks
  g.lineCap = "round";
  for (let k = 0; k < 900; k++) {
    const x = r() * W, y = r() * W, l = 10 + r() * 40, light = r() < 0.5;
    g.strokeStyle = light ? `rgba(232,196,150,${0.18 + r() * 0.2})` : `rgba(128,78,48,${0.12 + r() * 0.15})`; g.lineWidth = 1.5 + r() * 2;
    wrapped(W, x, y, (px, py) => { g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + l / 2, py - 3, px + l, py + 1); g.stroke(); });
  }
  // pebbles with a lit top and a dark underside
  for (let k = 0; k < 2600; k++) {
    const x = r() * W, y = r() * W, s = 2 + r() * r() * 12, tone = r();
    const base = tone < 0.33 ? [150, 92, 62] : tone < 0.66 ? [176, 138, 104] : [118, 84, 66];
    wrapped(W, x, y, (px, py) => {
      if (px < -20 || py < -20 || px > W + 20 || py > W + 20) return;
      g.fillStyle = "rgba(70,40,28,0.45)"; g.beginPath(); g.ellipse(px + s * 0.2, py + s * 0.35, s, s * 0.7, 0, 0, TAU); g.fill();
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; g.beginPath(); g.ellipse(px, py, s, s * 0.72, r() * 3, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,230,200,0.35)"; g.beginPath(); g.ellipse(px - s * 0.2, py - s * 0.25, s * 0.5, s * 0.3, 0, 0, TAU); g.fill();
    });
  }
  // dry cracks
  g.strokeStyle = "rgba(110,64,40,0.35)"; g.lineWidth = 2;
  for (let k = 0; k < 120; k++) {
    let x = r() * W, y = r() * W; const n = 4 + Math.floor(r() * 5);
    g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < n; i++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); }
    g.stroke();
  }
});
const roadTex = () => ctex("mn_road", 512, 1024, (g, r) => {
  g.fillStyle = "#d9b58a"; g.fillRect(0, 0, 512, 1024);
  for (let k = 0; k < 140; k++) { const x = r() * 512, y = r() * 1024, rad = 20 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rad); const c = r() < 0.5 ? "190,140,98" : "236,206,166"; gr.addColorStop(0, `rgba(${c},0.4)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
  // two worn tyre tracks with tread marks
  for (const cx of [130, 382]) {
    const gr = g.createLinearGradient(cx - 60, 0, cx + 60, 0);
    gr.addColorStop(0, "rgba(150,100,66,0)"); gr.addColorStop(0.3, "rgba(150,100,66,0.45)"); gr.addColorStop(0.7, "rgba(150,100,66,0.45)"); gr.addColorStop(1, "rgba(150,100,66,0)");
    g.fillStyle = gr; g.fillRect(cx - 60, 0, 120, 1024);
    g.strokeStyle = "rgba(110,70,46,0.35)"; g.lineWidth = 3;
    for (let y = 0; y < 1024; y += 14) { g.beginPath(); g.moveTo(cx - 34, y); g.lineTo(cx - 6, y + 7); g.lineTo(cx + 22, y); g.stroke(); }
  }
  for (let k = 0; k < 900; k++) { const s = 1.5 + r() * 5; g.fillStyle = r() < 0.5 ? `rgba(120,80,56,${0.3 + r() * 0.3})` : `rgba(245,222,190,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * 512, r() * 1024, s, s * 0.7, 0, 0, TAU); g.fill(); }
  // soft edges (dust blending into the ground)
  const e = g.createLinearGradient(0, 0, 512, 0);
  e.addColorStop(0, "rgba(201,146,98,1)"); e.addColorStop(0.1, "rgba(201,146,98,0)"); e.addColorStop(0.9, "rgba(201,146,98,0)"); e.addColorStop(1, "rgba(201,146,98,1)");
  g.fillStyle = e; g.fillRect(0, 0, 512, 1024);
});
const rockTex = () => ctex("mn_rock", 512, 512, (g, r) => {
  g.fillStyle = "#a8684a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 160; k++) { const x = r() * 512, y = r() * 512, rad = 10 + r() * 60; g.fillStyle = r() < 0.5 ? "rgba(130,74,50,0.35)" : "rgba(196,140,100,0.3)"; wrapped(512, x, y, (px, py) => { g.beginPath(); g.ellipse(px, py, rad, rad * 0.5, r(), 0, TAU); g.fill(); }); }
  g.strokeStyle = "rgba(70,38,26,0.5)"; g.lineWidth = 2.5;
  for (let k = 0; k < 40; k++) { let x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 4; i++) { x += (r() - 0.5) * 60; y += (r() - 0.3) * 40; g.lineTo(x, y); } g.stroke(); }
  for (let y = 0; y < 512; y += 64 + r() * 30) { g.strokeStyle = "rgba(240,200,160,0.25)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + y) * 6); g.stroke(); }
});
const seamTex = () => ctex("mn_tentSeam", 512, 256, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${0.03 + r() * 0.04})`; g.fillRect(r() * 512, r() * 256, 20 + r() * 80, 4 + r() * 20); }
  g.strokeStyle = "rgba(40,30,30,0.45)"; g.lineWidth = 5;
  for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(i * 128 + 2, 0); g.lineTo(i * 128 + 2, 256); g.stroke(); }
  g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 236); g.lineTo(512, 236); g.stroke();
  // door (zipped arch) on one side
  g.fillStyle = "rgba(20,16,20,0.55)"; g.beginPath(); g.moveTo(40, 256); g.quadraticCurveTo(64, 90, 88, 256); g.fill();
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(36, 256); g.quadraticCurveTo(64, 80, 92, 256); g.stroke();
});
const flagTex = () => ctex("mn_chile", 512, 342, (g) => {
  const W = 512, H = 342;
  g.fillStyle = "#f4f3ef"; g.fillRect(0, 0, W, H / 2);
  g.fillStyle = "#d22b2b"; g.fillRect(0, H / 2, W, H / 2);
  g.fillStyle = "#1f46a8"; g.fillRect(0, 0, H / 2, H / 2);
  const cx = H / 4, cy = H / 4, R = H * 0.115;
  g.fillStyle = "#ffffff"; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? R * 0.382 : R; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  g.closePath(); g.fill();
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 10, H); // hoist sleeve
  for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + 0.04 * Math.sin(x * 0.05)})`; g.fillRect(x, 0, 2, H); }
});
const grateTex = () => ctex("mn_grate", 256, 256, (g) => {
  g.fillStyle = "#6c7480"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#3a4048"; g.lineWidth = 4;
  for (let i = 0; i <= 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
  g.strokeStyle = "#8d96a2"; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
});
const hazardTex = () => ctex("mn_hazard", 256, 64, (g) => {
  g.fillStyle = "#f2c12e"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#1d1d20";
  for (let x = -64; x < 256 + 64; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 64, 0); g.lineTo(x + 32, 0); g.fill(); }
});
const photosTex = () => ctex("mn_photos", 1024, 512, (g, r) => {
  g.fillStyle = "#f2eee4"; g.fillRect(0, 0, 1024, 512);
  const skin = ["#e6b48c", "#c98f68", "#a8714e", "#dca27a"], shirt = ["#e06a2c", "#2f62b4", "#3c8f5a", "#9a3f3a", "#5b4a8a"];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
    const x = 30 + col * 140 + (r() - 0.5) * 10, y = 26 + row * 160 + (r() - 0.5) * 10, w = 110, h = 136;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.12); g.translate(-w / 2, -h / 2);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(4, 5, w, h);
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
    g.fillStyle = ["#9fc3e0", "#d8c49c", "#b9d1b0", "#e0b4a8"][Math.floor(r() * 4)]; g.fillRect(8, 8, w - 16, h - 34);
    g.fillStyle = shirt[Math.floor(r() * shirt.length)]; g.beginPath(); g.ellipse(w / 2, h - 26, 34, 26, 0, Math.PI, 0); g.fill();
    g.fillStyle = skin[Math.floor(r() * skin.length)]; g.beginPath(); g.ellipse(w / 2, 52, 21, 25, 0, 0, TAU); g.fill();
    g.strokeStyle = "#2a1c24"; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = "#2a1c24"; g.beginPath(); g.arc(w / 2 - 8, 50, 2.6, 0, TAU); g.arc(w / 2 + 8, 50, 2.6, 0, TAU); g.fill();
    if (r() < 0.6) { g.fillStyle = r() < 0.5 ? "#f2f2f2" : "#f0c43c"; g.beginPath(); g.ellipse(w / 2, 32, 26, 13, 0, Math.PI, 0); g.fill(); g.strokeStyle = "#2a1c24"; g.lineWidth = 2; g.stroke(); }
    g.restore();
  }
});
const canvasTex = () => ctex("mn_canvas", 512, 512, (g, r) => {
  g.fillStyle = "#f3efe6"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 80; k++) { g.fillStyle = `rgba(120,100,80,${0.03 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 30 + r() * 120, 3 + r() * 10); }
  g.strokeStyle = "rgba(90,80,70,0.35)"; g.lineWidth = 4;
  for (let x = 0; x < 512; x += 128) { g.beginPath(); g.moveTo(x + 2, 0); g.lineTo(x + 2, 512); g.stroke(); }
});
const glowTex = () => ctex("mn_glow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.2, "rgba(255,255,255,0.5)"); gr.addColorStop(0.5, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const flameTex = () => ctex("mn_flame", 64, 128, (g) => {
  const gr = g.createRadialGradient(32, 84, 0, 32, 84, 40);
  gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.35, "rgba(255,210,120,0.95)"); gr.addColorStop(0.7, "rgba(255,140,40,0.5)"); gr.addColorStop(1, "rgba(255,120,30,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(62, 80, 32, 124); g.quadraticCurveTo(2, 80, 32, 8); g.fill();
});
const poolTex = () => ctex("mn_pool", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.45, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const beamTex = () => ctex("mn_beam", 64, 256, (g) => {
  for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
    const v = y / 255, u = Math.abs(x / 63 - 0.5) * 2;
    const a = (1 - v) ** 1.5 * Math.min(1, v * 8) * (1 - u * u);
    g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.fillRect(x, y, 1, 1);
  }
});
const starTex = () => ctex("mn_star", 32, 32, (g) => {
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
});

// ======================================================================================================
// geometry helpers
// ======================================================================================================
const Y = V(0, 1, 0);
/** cylinder (radius r) from a to b */
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
};
const frame = (x: number, y: number, z: number, yaw: number) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
const mul = (m: THREE.Matrix4, x: number, y: number, z: number, yaw = 0) => m.clone().multiply(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z));
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => boxGeo(V(x0, y0, z0), V(x1, y1, z1));
/** rock lump: deformed sphere, smooth normals */
const rockGeo = (seed: number, q: number) => {
  const g = new THREE.SphereGeometry(1, q ? 7 : 10, q ? 5 : 7), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.22 * Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 1.3) + 0.12 * Math.sin(y * 4 + seed * 2);
    p.setXYZ(i, x * k, Math.max(y * k * 0.62, -0.25), z * k);
  }
  g.computeVertexNormals();
  return g;
};

const lamC = (key: string, color: string, extra: THREE.MeshLambertMaterialParameters = {}) => lam("mn_" + key, () => ({ color, ...extra }));

// ======================================================================================================
// Surface
// ======================================================================================================
type CamS = { x: number; y: number; z: number; lx: number; ly: number; lz: number };
const NIGHT: Record<Look, number> = { desert: 0, dusk: 0.65, night: 1, mine: 0, cut: 0 };

export class Surface {
  root = new THREE.Group();
  private cams: CamS[] = [];
  private uT = { value: 0 };
  private bulbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.9, 0.7), fog: true });
  private lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1), fog: true });
  private flames: THREE.Sprite[] = [];
  private flameMat!: THREE.SpriteMaterial; private flameGlowMat!: THREE.SpriteMaterial;
  private lampGlows: THREE.Sprite[] = []; private lampGlowMat!: THREE.SpriteMaterial;
  private nightOnly: THREE.Object3D[] = [];
  private beamMat!: THREE.MeshBasicMaterial; private poolMat!: THREE.MeshBasicMaterial;
  private stars!: THREE.Mesh;
  private rod!: THREE.Mesh; private topDrive!: THREE.Group;
  private wheel!: THREE.Group; private cable!: THREE.Mesh; private wheelC = new THREE.Vector3(); private shaftFrame!: THREE.Matrix4;
  private drillFrame!: THREE.Matrix4;
  private tunnelGlowMat!: THREE.SpriteMaterial;

  constructor() {
    for (const s of SHOTS) if (s.place === "desert") for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(s.id, f); this.cams.push({ x: c.pos[0], y: c.pos[1], z: c.pos[2], lx: c.look[0], ly: c.look[1], lz: c.look[2] });
    }
    const b = new Batch();
    this.buildTerrain();
    this.buildFar();
    this.buildRoads();
    this.buildPortal(b);
    this.buildVehicles(b);
    this.buildCamp(b);
    this.buildDrill(b);
    this.buildShaft(b);
    this.buildScatter(b);
    b.build(this.root);
    this.buildStars();
  }

  /** true when a prop at (x, z) (radius rad, top height) would stand near a desert camera or in its sight line */
  private blocks(x: number, z: number, top: number, rad: number) {
    for (const c of this.cams) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < rad + 3) return true;
      const L = Math.hypot(c.lx - c.x, c.lz - c.z) || 1, ux = (c.lx - c.x) / L, uz = (c.lz - c.z) / L, t = (x - c.x) * ux + (z - c.z) * uz;
      if (t > 0 && t < L + 2) {
        const perp = Math.abs((x - c.x) * uz - (z - c.z) * ux);
        const lineY = c.y + (c.ly - c.y) * Math.min(1, t / L);
        if (perp < rad + 1.2 + t * 0.04 && top > lineY - 1.5) return true;
      }
    }
    return false;
  }

  // =============================== terrain ===============================
  private buildTerrain() {
    const t = dirtTex();
    const mat = twoTone(new THREE.MeshLambertMaterial({ map: t, vertexColors: true }));
    const all = (n: number) => Array.from({ length: n }, (_, i) => i);
    // shading normals from the UNCARVED surface (the trench must not tilt the normals along the tunnel line)
    const n0 = this.addGrid(all(NX), all(NZ), (i, j) => rawH0(XS[i], ZS[j]), mat, null, false);
    this.addGrid(all(NX), all(NZ), (i, j) => HT[j * NX + i], mat, n0);
    // overburden patch over the tunnel trench: the uncarved mountain surface (dropped inside the culvert roof where
    // the ground is lower than the roof), sharing the border vertices with the terrain (no seams, no coplanar strips)
    const ci = all(NX).filter((i) => Math.abs(XS[i] - MX) < 3.5), cj = all(NZ).filter((j) => ZS[j] > TUN_BACK && ZS[j] < MZ + 7.5);
    const pi = all(ci[ci.length - 1] - ci[0] + 3).map((k) => ci[0] - 1 + k), pj = all(cj[cj.length - 1] - cj[0] + 3).map((k) => cj[0] - 1 + k);
    this.addGrid(pi, pj, (i, j) => { const h = rawH0(XS[i], ZS[j]); return h > TUN_H + TUN_WALL + 0.05 ? h : TUN_H + TUN_WALL - 0.1; }, mat, n0);
  }
  /** a heightfield grid over the given tick columns / rows (same a-c split as groundY), painted with strata */
  private addGrid(is: number[], js: number[], hf: (i: number, j: number) => number, mat: THREE.Material, nrm: Float32Array | null, add = true): Float32Array {
    const NI = is.length, NJ = js.length;
    const pos = new Float32Array(NI * NJ * 3), uv = new Float32Array(NI * NJ * 2), col = new Float32Array(NI * NJ * 3);
    const c = new THREE.Color(), sand = new THREE.Color("#fff3e4"), rust = new THREE.Color("#f0bfa0"), brown = new THREE.Color("#c99a80");
    const strata = ["#fde8d2", "#c97a5c", "#e8b48c", "#9c6a58", "#f2cfa8", "#b8705a", "#dca07a"].map((h) => new THREE.Color(h));
    const scree = new THREE.Color("#8a5a4a"), rock = new THREE.Color("#a86a54");
    for (let jj = 0; jj < NJ; jj++) for (let ii = 0; ii < NI; ii++) {
      const k = jj * NI + ii, x = XS[is[ii]], z = ZS[js[jj]], h = hf(is[ii], js[jj]);
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 16; uv[k * 2 + 1] = z / 16;
      const n1 = 0.5 + 0.5 * Math.sin(x * 0.021 + Math.sin(z * 0.013) * 2) * Math.sin(z * 0.017 + 1), n2 = 0.5 + 0.5 * Math.sin(x * 0.0043 - z * 0.0051 + 2);
      c.copy(sand).lerp(rust, 0.25 + 0.5 * n1 * n2);
      const m = mountain(x, z), mk = smooth((m - 3) / 25);
      if (mk > 0) { // strata bands on the mountain: tilted, wobbling layers of cream / rust / ochre / brown
        const hs = rawH0(x, z);
        const sl = Math.hypot(rawH0(x + 1, z) - rawH0(x - 1, z), rawH0(x, z + 1) - rawH0(x, z - 1)) / 2; // slope
        const L = hs * 0.16 + x * 0.012 + 0.9 * Math.sin(x * 0.031 + z * 0.02) + 0.35 * Math.sin(x * 0.11 + 2);
        const li = Math.floor(L), fr = L - li, si = ((li % strata.length) + strata.length) % strata.length;
        const edge = smooth((fr - 0.82) / 0.12); // crisp band edges
        c.lerp(brown, mk * 0.45);
        c.lerp(strata[si].clone().lerp(strata[(si + 1) % strata.length], edge), mk * 0.62 * smooth(sl * 1.4));
        // vertical gully streaks (darker scree runs) on the steep faces
        const gully = Math.pow(0.5 + 0.5 * Math.sin(x * 0.42 + 2.3 * Math.sin(z * 0.05) + Math.sin(x * 0.13)), 6);
        c.lerp(scree, mk * 0.35 * gully * smooth(sl * 1.2));
        // bare rock on the steepest parts, pale dust on the flatter benches
        c.lerp(rock, mk * 0.25 * smooth((sl - 0.9) * 2)); c.lerp(sand, mk * 0.25 * (1 - smooth(sl * 2.5)));
      }
      const far = smooth((Math.hypot(x, z) - 600) / 900); // distant hills a touch redder
      c.lerp(rust, far * 0.3);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx: number[] = [];
    for (let j = 0; j < NJ - 1; j++) for (let i = 0; i < NI - 1; i++) {
      const a = j * NI + i, b = a + 1, cc = a + NI + 1, d = a + NI;
      idx.push(a, d, cc, a, cc, b); // split a-c (matches groundY)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    if (!add) return (g.attributes.normal as THREE.BufferAttribute).array as Float32Array;
    if (nrm) { // copy the shading normals of the full-grid reference (indexed by tick column / row)
      const na = g.attributes.normal as THREE.BufferAttribute;
      for (let jj = 0; jj < NJ; jj++) for (let ii = 0; ii < NI; ii++) { const k = jj * NI + ii, q = (js[jj] * NX + is[ii]) * 3; na.setXYZ(k, nrm[q], nrm[q + 1], nrm[q + 2]); }
    }
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.castShadow = true; m.matrixAutoUpdate = false;
    this.root.add(m);
    return (g.attributes.normal as THREE.BufferAttribute).array as Float32Array;
  }

  // =============================== far Andes ring ===============================
  private buildFar() {
    const NA = 360, NR = 14, pos: number[] = [], col: number[] = [], idx: number[] = [];
    const c = new THREE.Color(), base = new THREE.Color("#b88070"), hi = new THREE.Color("#9c6e78"), snow = new THREE.Color("#f6f1f0");
    const peaks = [0.3, 1.1, 1.9, 2.6, 3.4, 4.3, 5.0, 5.7].map((a, i) => ({ a, h: 380 + hh(i, 3) * 300, w: 0.09 + hh(i, 4) * 0.08 }));
    for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * TAU, rr = 1700 + (j / NR) * 1400 + 120 * Math.sin(a * 4 + 1);
      const u = j / NR, ridge = Math.sin(Math.PI * Math.min(1, u * 1.25));
      let h = -40 + ridge * (150 + 90 * Math.sin(a * 5 + 0.7) + 60 * Math.sin(a * 13 + 2) + 30 * Math.sin(a * 29));
      for (const p of peaks) { let da = Math.abs(a - p.a); da = Math.min(da, TAU - da); h += ridge * p.h * Math.max(0, 1 - da / p.w) ** 1.6; }
      pos.push(Math.cos(a) * rr, h, Math.sin(a) * rr);
      c.copy(base).lerp(hi, clamp01(h / 400));
      if (h > 360) c.lerp(snow, smooth((h - 360) / 60));
      col.push(c.r, c.g, c.b);
    }
    for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i, b = a + 1, d = a + NA + 1, cc = d + 1; idx.push(a, b, cc, a, cc, d); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
    m.receiveShadow = false; m.castShadow = false; m.matrixAutoUpdate = false;
    this.root.add(m);
  }

  // =============================== roads ===============================
  private roadPaths(): P2[][] {
    const pz = MZ + 9;
    return [
      [[MX, pz], [MX + 4, pz + 30], [18, -40], [40, 10], [80, 60], [150, 110], [260, 170], [420, 250], [650, 330], [900, 380], [1300, 420]],
      [[18, -40], [-20, -10], [-70, 20], [-105, 40], [CAMP[0] + 18, CAMP[2] + 4]],
      [[30, -22], [60, -32], [DRILL[0] - 9, DRILL[2] + 6]],
      [[0, -30], [-30, -36], [SHAFT[0] + 12, SHAFT[2] + 4]],
      // haul track switchbacking up the mine mountain (draped on the slope)
      [[MX + 14, MZ + 12], [MX + 40, MZ + 2], [MX + 70, MZ - 14], [MX + 92, MZ - 30], [MX + 70, MZ - 46], [MX + 25, MZ - 56], [MX - 30, MZ - 60], [MX - 80, MZ - 58]],
    ];
  }
  private buildRoads() {
    const geos: THREE.BufferGeometry[] = [];
    for (const [pi, path] of this.roadPaths().entries()) {
      const w = pi === 0 ? 8 : pi === 4 ? 5 : 6;
      // Catmull-Rom through the points, sampled every ~1.5 m
      const curve = new THREE.CatmullRomCurve3(path.map(([x, z]) => V(x, 0, z)), false, "centripetal");
      const L = curve.getLength(), n = Math.max(8, Math.ceil(L / 1.5));
      const pos: number[] = [], uv: number[] = [], idx: number[] = [], NA = 5; // 4 strips across: hugs curved slopes
      const lift = pi === 4 ? 0.09 : 0.04;
      for (let i = 0; i <= n; i++) {
        const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u), sx = -tg.z, sz = tg.x;
        const s = Math.hypot(sx, sz) || 1;
        for (let q = 0; q < NA; q++) {
          const k = -1 + (2 * q) / (NA - 1), x = p.x + (sx / s) * k * w / 2, z = p.z + (sz / s) * k * w / 2;
          pos.push(x, groundY(x, z) + lift, z);
          uv.push(q / (NA - 1), (u * L) / 10);
        }
        if (i < n) for (let q = 0; q < NA - 1; q++) { const a = i * NA + q, c = a + NA; idx.push(a, c, a + 1, a + 1, c, c + 1); }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      if ((g.attributes.normal as THREE.BufferAttribute).getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; } g.setIndex(idx); g.computeVertexNormals(); }
      geos.push(g.toNonIndexed());
    }
    const m = new THREE.Mesh(mergeGeometries(geos, false), twoTone(new THREE.MeshLambertMaterial({ map: roadTex(), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
    m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false;
    this.root.add(m);
  }
  private nearRoad(x: number, z: number, m: number) {
    for (const path of this.roadPaths()) for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i], [bx, bz] = path[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
      const t = clamp01(((x - ax) * dx + (z - az) * dz) / L2), px = ax + dx * t, pz = az + dz * t;
      if (Math.hypot(x - px, z - pz) < m) return true;
    }
    return false;
  }

  // =============================== mine portal ===============================
  private buildPortal(b: Batch) {
    const z0 = MZ - 14, z1 = MZ + 8, hw = TUN_HW, wt = TUN_WALL, hgt = TUN_H;
    const steel = lamC("portalSteel", "#4f5a66"), conc = lamC("concrete", "#b7ab98"), rust = lamC("rustSteel", "#8c4a30");
    // culvert walls + roof (outer shell, thick enough to hide the carved trench edges), sitting in the cut bench
    b.add(box(MX - hw - wt, 0, z0, MX - hw, hgt, z1), conc);
    b.add(box(MX + hw, 0, z0, MX + hw + wt, hgt, z1), conc);
    b.add(box(MX - hw - wt, hgt, z0, MX + hw + wt, hgt + wt, z1), conc);
    // ---- the tunnel interior: rock lining + timber sets + rails + pipe, receding into the dark to TUN_BACK, with
    // depth falloff baked into vertex colours and a warm lamp glowing far inside ----
    const zb = TUN_BACK + 0.3, xi = hw - 0.02, yr = hgt - 0.03, LAMP = V(MX - 0.4, 4.55, z1 - 27), LAMP2 = V(MX + 0.5, 4.6, z1 - 13);
    const warm = new THREE.Color(1.0, 0.6, 0.28);
    const shadeAt = (p: THREE.Vector3, base: THREE.Color, out: THREE.Color) => {
      const d = Math.max(0, z1 - p.z), k = 0.02 + 0.98 * Math.exp(-d / 4.2);
      const w = 0.55 * Math.exp(-p.distanceTo(LAMP) / 2.2) + 0.22 * Math.exp(-p.distanceTo(LAMP2) / 1.8);
      out.copy(base).multiplyScalar(k).add(warm.clone().multiplyScalar(w));
      out.r = Math.min(out.r, 1); out.g = Math.min(out.g, 1); out.b = Math.min(out.b, 1);
      return out;
    };
    const tint = (geos: THREE.BufferGeometry[], g: THREE.BufferGeometry, hex: string) => {
      const x = (g.index ? g.toNonIndexed() : g), p = x.attributes.position as THREE.BufferAttribute, base = new THREE.Color(hex), c = new THREE.Color(), v = V(0, 0, 0);
      const col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { shadeAt(v.set(p.getX(i), p.getY(i), p.getZ(i)), base, c); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      x.setAttribute("color", new THREE.BufferAttribute(col, 3));
      if (!x.attributes.uv) x.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
      geos.push(x);
    };
    const lining: THREE.BufferGeometry[] = [], wood: THREE.BufferGeometry[] = [];
    const L = z1 - zb, nz = Math.ceil(L / 0.8);
    // inward-facing planes (front side toward the tunnel axis), uv in metres / 4
    const plane = (w: number, hP: number, sw: number, sh: number, rot: (g: THREE.BufferGeometry) => void) => {
      const g = new THREE.PlaneGeometry(w, hP, sw, sh); const uvA = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * w / 4, uvA.getY(i) * hP / 4);
      rot(g); return g;
    };
    const zc = (z1 + zb) / 2;
    tint(lining, plane(2 * xi, L, 6, nz, (g) => g.rotateX(-Math.PI / 2).translate(MX, 0.02, zc)), "#9a7a66");   // floor
    tint(lining, plane(2 * xi, L, 6, nz, (g) => g.rotateX(Math.PI / 2).translate(MX, yr, zc)), "#b08a72");      // roof
    tint(lining, plane(L, yr, nz, 4, (g) => g.rotateY(Math.PI / 2).translate(MX - xi, yr / 2, zc)), "#b88a70");  // left wall
    tint(lining, plane(L, yr, nz, 4, (g) => g.rotateY(-Math.PI / 2).translate(MX + xi, yr / 2, zc)), "#b88a70"); // right wall
    tint(lining, new THREE.PlaneGeometry(2 * xi, yr).translate(MX, yr / 2, zb), "#000000");                     // back cap
    // timber sets every 2.4 m (posts + cap + knee braces), deeper ones fading into the dark
    for (let zz = z1 - 0.9; zz > zb + 1; zz -= 2.4) {
      tint(wood, box(MX - xi + 0.02, 0.02, zz - 0.15, MX - xi + 0.32, yr - 0.02, zz + 0.15), "#a06a40");
      tint(wood, box(MX + xi - 0.32, 0.02, zz - 0.15, MX + xi - 0.02, yr - 0.02, zz + 0.15), "#a06a40");
      tint(wood, box(MX - xi + 0.02, yr - 0.36, zz - 0.17, MX + xi - 0.02, yr - 0.02, zz + 0.17), "#94603a");
      for (const sgn of [-1, 1]) tint(wood, strut(V(MX + sgn * (xi - 0.3), yr - 1.2, zz), V(MX + sgn * (xi - 1.2), yr - 0.36, zz), 0.07, 6), "#8a5834");
    }
    // rails + sleepers on the floor, a ventilation pipe along the right wall, a cable along the left wall
    for (const rx of [-0.6, 0.6]) tint(wood, box(MX + rx - 0.04, 0.02, zb + 0.5, MX + rx + 0.04, 0.13, z1 + 0.6), "#8f969e");
    for (let zz = z1 + 0.3; zz > zb + 0.8; zz -= 0.9) tint(wood, box(MX - 0.95, 0.02, zz - 0.11, MX + 0.95, 0.07, zz + 0.11), "#6a4a34");
    tint(wood, strut(V(MX + xi - 0.55, 4.3, zb + 0.4), V(MX + xi - 0.55, 4.3, z1 - 0.2), 0.26, 14), "#e0b23a");
    tint(wood, strut(V(MX - xi + 0.45, 3.6, zb + 0.4), V(MX - xi + 0.45, 3.6, z1 - 0.2), 0.04, 6), "#2a2a2e");
    // lamp cords
    for (const lp of [LAMP, LAMP2]) tint(wood, strut(V(lp.x, lp.y + 0.1, lp.z), V(lp.x, yr - 0.01, lp.z), 0.012, 4), "#2a2a2e");
    const tunMat = (map?: THREE.Texture) => twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, ...(map ? { map } : {}) }), 0); // no shade lift: real darkness
    for (const [list, m] of [[lining, tunMat(rockTex())], [wood, tunMat()]] as [THREE.BufferGeometry[], THREE.Material][]) {
      const g = mergeGeometries(list, false); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; mesh.castShadow = false; mesh.matrixAutoUpdate = false; mesh.frustumCulled = false;
      this.root.add(mesh);
    }
    // the lamps: HDR bulbs + soft additive glows (kept below the roof so the glow never clips on it)
    this.tunnelGlowMat = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1.0, 0.55, 0.22), blending: THREE.AdditiveBlending, depthWrite: false, fog: true, transparent: true });
    for (const [lp, sc] of [[LAMP, 1.6], [LAMP2, 1.1]] as [THREE.Vector3, number][]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.2), fog: true }));
      bulb.position.copy(lp); bulb.layers.set(NOINK); bulb.matrixAutoUpdate = false; bulb.updateMatrix(); bulb.frustumCulled = false; this.root.add(bulb);
      const gs = new THREE.Sprite(this.tunnelGlowMat); gs.position.copy(lp); gs.scale.setScalar(sc); gs.layers.set(NOINK); gs.renderOrder = 5; gs.frustumCulled = false; this.root.add(gs);
    }
    // steel portal frame: H-beam posts + lintel, a sign board (no text) and hazard band
    const fz = z1 + 0.05;
    b.add(box(MX - hw - 0.95, 0, fz - 0.2, MX - hw - 0.35, hgt + 1.3, fz + 0.45), steel);
    b.add(box(MX + hw + 0.35, 0, fz - 0.2, MX + hw + 0.95, hgt + 1.3, fz + 0.45), steel);
    b.add(box(MX - hw - 1.3, hgt + 0.7, fz - 0.25, MX + hw + 1.3, hgt + 1.55, fz + 0.5), steel);
    const hz = hazardTex(); hz.repeat.set(4, 1);
    b.add(box(MX - hw - 1.28, hgt + 0.78, fz + 0.5, MX + hw + 1.28, hgt + 1.47, fz + 0.56), lam("mn_hazardBand", () => ({ map: hz })));
    // wing walls / gabions either side of the mouth (rock-filled cages)
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) for (let l = 0; l < 3 - k; l++) {
      const x = MX + s * (hw + 1.6 + k * 1.05 + 0.5), y = l * 1.0;
      b.add(box(x - 0.5, y, z1 - 1.5, x + 0.5, y + 0.98, z1 + 0.1), lam("mn_gabion", () => ({ map: rockTex(), color: "#c8b8a8" })));
    }
    // ventilation duct along the right wall + pipes running out of the mine
    b.add(strut(V(MX + hw + 2.4, 0.6, z1 + 25), V(MX + hw + 2.4, 0.6, z1 - 1), 0.5, 14), lamC("duct", "#f0c43a"));
    b.add(strut(V(MX - hw - 2.2, 0.25, z1 + 30), V(MX - hw - 2.2, 0.25, z1 - 1), 0.16, 10), rust);
    b.add(strut(V(MX - hw - 2.6, 0.2, z1 + 30), V(MX - hw - 2.6, 0.2, z1 - 1), 0.12, 10), lamC("pipeBlack", "#2c2f34"));
    // compressor shed + water tank next to the mouth
    const sx = MX + 16, sz = MZ + 16;
    b.add(box(sx - 4, 0, sz - 3, sx + 4, 3.2, sz + 3), lamC("shedWall", "#d8d2c2"));
    b.add(box(sx - 4.3, 3.2, sz - 3.3, sx + 4.3, 3.5, sz + 3.3), lamC("shedRoof", "#6e7a86"));
    b.add(box(sx - 1, 0, sz + 3, sx + 1, 2.3, sz + 3.08), lamC("doorBlue", "#3a6fb0"));
    b.add(new THREE.CylinderGeometry(2.2, 2.2, 4.2, 20).translate(MX - 15, 2.1, MZ + 16), lamC("tankWhite", "#e8e4da"));
    b.add(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 20).translate(MX - 15, 4.35, MZ + 16), lamC("tankLid", "#9aa2aa"));
  }

  // =============================== vehicles ===============================
  private haulTruck(b: Batch, x: number, z: number, yaw: number) {
    const M = frame(x, 0, z, yaw), yel = lamC("cat", "#f2b230"), dk = lamC("tyre", "#232326"), bed = lamC("bedRust", "#a4552e"), gl = lamC("glass", "#34404e"), st = lamC("chassis", "#3e3a36");
    b.add(box(-2.6, 1.6, -4.6, 2.6, 2.8, 4.6), st, M); // chassis
    b.add(box(-3.2, 2.8, -1.2, 3.2, 3.4, 4.8), yel, M); // deck
    b.add(box(-3.3, 3.4, -4.2, 3.3, 5.9, 1.6), bed, M); // dump body
    b.add(box(-3.4, 5.6, -4.3, 3.4, 6.1, 1.7), yel, M); // body rim
    b.add(box(-3.4, 5.6, 1.6, 3.4, 6.7, 3.9), yel, M); // canopy over the cab
    b.add(box(-3.0, 3.4, 2.1, -1.0, 5.4, 4.0), yel, M); // cab
    b.add(box(-2.95, 4.3, 3.95, -1.05, 5.2, 4.05), gl, M);
    b.add(box(-0.6, 2.9, 4.6, 2.4, 4.6, 5.2), lamC("grille", "#4a4640"), M); // radiator
    for (const [wx, wz] of [[-2.6, 3.2], [2.6, 3.2], [-2.4, -2.8], [2.4, -2.8], [-3.6, -2.8], [3.6, -2.8]]) {
      b.add(new THREE.CylinderGeometry(1.55, 1.55, 1.1, 18).rotateZ(Math.PI / 2), dk, mul(M, wx, 1.55, wz));
      b.add(new THREE.CylinderGeometry(0.7, 0.7, 1.16, 12).rotateZ(Math.PI / 2), yel, mul(M, wx, 1.55, wz));
    }
    b.add(strut(V(-2.2, 2.8, 4.7), V(-2.2, 0.6, 5.6), 0.06, 6), st, M); // ladder rail
  }
  private pickup(b: Batch, x: number, z: number, yaw: number, col: string, i: number) {
    const M = frame(x, 0, z, yaw), body = lamC("car" + col, col), dk = lamC("tyre", "#232326"), gl = lamC("glass", "#34404e");
    b.add(box(-0.95, 0.45, -2.6, 0.95, 1.15, 2.6), body, M);
    b.add(box(-0.88, 1.15, -0.1, 0.88, 1.8, 1.5), body, M);
    b.add(box(-0.86, 1.2, 1.45, 0.86, 1.72, 1.55), gl, M);
    b.add(box(-0.9, 1.2, -0.1, -0.86, 1.7, 1.4), gl, M); b.add(box(0.86, 1.2, -0.1, 0.9, 1.7, 1.4), gl, M);
    b.add(box(-0.5, 1.8, 0.3, 0.5, 1.92, 0.6), lamC("beacon", "#ff8a1e"), M); // amber light bar
    b.add(strut(V(0.8, 1.15, -2.4), V(0.8, 4.2, -2.4), 0.015, 4), lamC("whip", "#d0d0d0"), M); // safety flag whip
    b.add(box(0.8, 3.7, -2.42, 0.81, 4.15, -2.0), lamC("whipFlag", i % 2 ? "#ff6a1a" : "#e83a2a", { side: THREE.DoubleSide }), M);
    for (const [wx, wz] of [[-0.9, 1.7], [0.9, 1.7], [-0.9, -1.7], [0.9, -1.7]]) b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14).rotateZ(Math.PI / 2), dk, mul(M, wx, 0.42, wz));
  }
  private lightTower(b: Batch, x: number, z: number, yaw: number, h = 9, night = true) {
    const M = frame(x, 0, z, yaw), y = lamC("ltYellow", "#f0b52c"), st = lamC("ltSteel", "#8a929c"), dk = lamC("tyre", "#232326");
    b.add(box(-0.9, 0.5, -1.6, 0.9, 1.7, 1.6), y, M);
    b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 12).rotateZ(Math.PI / 2), dk, mul(M, -0.95, 0.4, 0));
    b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.25, 12).rotateZ(Math.PI / 2), dk, mul(M, 0.95, 0.4, 0));
    b.add(strut(V(0, 1.7, 0), V(0, h, 0), 0.09, 8), st, M);
    b.add(box(-1.3, h - 0.1, -0.15, 1.3, h + 0.1, 0.15), st, M);
    for (const lx of [-0.95, -0.32, 0.32, 0.95]) for (const ly of [h + 0.45, h + 1.15]) {
      b.add(box(lx - 0.28, ly - 0.28, -0.25, lx + 0.28, ly + 0.28, 0.1), lamC("lampHouse", "#3c4048"), M);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), this.lampMat);
      p.applyMatrix4(mul(M, lx, ly, 0.105)); p.layers.set(NOINK); p.matrixAutoUpdate = false; p.updateMatrix(); this.root.add(p);
      if (lx === -0.32 || lx === 0.32) {
        const gp = V(lx, ly, 0.3).applyMatrix4(M);
        const gs = new THREE.Sprite(this.lampGlowMat); gs.position.copy(gp); gs.scale.setScalar(3.2); gs.layers.set(NOINK); this.root.add(gs); this.lampGlows.push(gs);
      }
    }
    if (night) {
      // beam + pool on the ground in front of it
      const fwd = V(0, 0, 1).applyMatrix4(new THREE.Matrix4().makeRotationY(yaw)), top = V(x, h + 0.8, z), hit = V(x + fwd.x * h * 1.2, 0, z + fwd.z * h * 1.2);
      this.beam(top, hit, h * 0.35);
      this.pool(hit.x, hit.z, h * 1.3);
    }
  }
  private beam(a: THREE.Vector3, b: THREE.Vector3, r: number) {
    const ab = b.clone().sub(a), L0 = ab.length();
    for (const c of this.cams) { // never put a camera inside (or close to) a beam cone
      const p = V(c.x, c.y, c.z).sub(a), t = p.dot(ab) / L0;
      if (t > -2 && t < L0 + 2 && p.clone().addScaledVector(ab, -t / L0).length() < (r * Math.max(0, t) / L0) + 3) return;
    }
    const L = a.distanceTo(b), g = new THREE.ConeGeometry(r, L, 24, 1, true).translate(0, -L / 2, 0).rotateY(0);
    // cone apex at a (uv v: 0 at apex .. 1 at base)
    const uvA = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvA.count; i++) uvA.setY(i, 1 - uvA.getY(i));
    const m = new THREE.Mesh(g, this.beamMat);
    m.quaternion.setFromUnitVectors(V(0, -1, 0), b.clone().sub(a).normalize()); m.position.copy(a);
    m.layers.set(NOINK); m.renderOrder = 4; this.root.add(m); this.nightOnly.push(m);
  }
  private pool(x: number, z: number, r: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), this.poolMat);
    m.position.set(x, groundY(x, z) + 0.08, z); m.layers.set(NOINK); m.renderOrder = 3; this.root.add(m); this.nightOnly.push(m);
  }
  private buildVehicles(b: Batch) {
    this.lampGlowMat = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1, 1, 1), blending: THREE.AdditiveBlending, depthWrite: false, fog: true, transparent: true });
    this.beamMat = new THREE.MeshBasicMaterial({ map: beamTex(), color: new THREE.Color(0.035, 0.038, 0.045), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true });
    this.poolMat = new THREE.MeshBasicMaterial({ map: poolTex(), color: new THREE.Color(0.09, 0.095, 0.105), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 });
    const trucks: [number, number, number][] = [[MX + 26, MZ + 30, -0.5], [MX - 30, MZ + 34, 0.7], [MX + 58, MZ + 22, -1.2]];
    for (const [x, z, yaw] of trucks) if (!this.blocks(x, z, 7, 6)) this.haulTruck(b, x, z, yaw);
    const cols = ["#f3f1ea", "#f3f1ea", "#d8342c", "#f3f1ea", "#2f5fa8", "#e8e2d2", "#3a3d42", "#f3f1ea"];
    const spots: [number, number, number][] = [[MX + 9, MZ + 22, 0.3], [MX - 12, MZ + 24, -0.2], [CAMP[0] + 30, CAMP[2] - 10, 1.2], [CAMP[0] + 26, CAMP[2] - 17, 1.0], [DRILL[0] + 2, DRILL[2] - 14, 2.0],
      [SHAFT[0] + 14, SHAFT[2] - 6, -1.3], [SHAFT[0] + 18, SHAFT[2] + 2, -1.6], [CAMP[0] - 36, CAMP[2] + 20, 2.5], [40, 30, 0.8], [-30, -55, 1.4]];
    spots.forEach(([x, z, yaw], i) => { if (!this.blocks(x, z, 2, 3)) this.pickup(b, x, z, yaw, cols[i % cols.length], i); });
    if (!this.blocks(MX - 9, MZ + 14, 11, 2)) this.lightTower(b, MX - 9, MZ + 14, 0.4, 9, false);
  }

  // =============================== Camp Hope ===============================
  private flagMat(amp: number) {
    const m = twoTone(new THREE.MeshLambertMaterial({ map: flagTex(), side: THREE.DoubleSide }));
    const prev = m.onBeforeCompile, uT = this.uT;
    m.onBeforeCompile = (sh, r) => {
      prev.call(m, sh, r);
      sh.uniforms.uT = uT;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;")
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          { float k = uv.x; float ph = position.x * 0.37 + position.z * 0.29;
            transformed += normal * ${amp.toFixed(3)} * k * ( sin( uv.x * 6.5 - uT * 5.2 + ph ) + 0.35 * sin( uv.y * 4.0 + uv.x * 3.0 - uT * 7.9 + ph * 2.0 ) ); }`);
    };
    m.customProgramCacheKey = () => "mnFlag2_" + amp.toFixed(3);
    return m;
  }
  /** a flag (local: hoist edge on the pole at x = 0, flying toward +x) -> merged list */
  private flag(list: THREE.BufferGeometry[], M: THREE.Matrix4, w: number, h: number, y: number) {
    const g = new THREE.PlaneGeometry(w, h, 14, 7).translate(w / 2 + 0.05, y - h / 2, 0);
    g.applyMatrix4(M); list.push(g);
  }
  private buildCamp(b: Batch) {
    const C = CAMP, cx = C[0], cz = C[2];
    // mean view direction of the camp shots (camera -> camp) to put the shrine and the dense tents behind the cast
    let vx = 0, vz = 0;
    for (const c of this.cams) if (Math.hypot(c.lx - cx, c.lz - cz) < 30) { const L = Math.hypot(c.lx - c.x, c.lz - c.z) || 1; vx += (c.lx - c.x) / L; vz += (c.lz - c.z) / L; }
    const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    const rx = -vz, rz = vx; // screen right
    const at = (back: number, right: number): P2 => [cx + vx * back + rx * right, cz + vz * back + rz * right];
    const faceCam = Math.atan2(-vx, -vz);
    const flags: THREE.BufferGeometry[] = [], bigFlags: THREE.BufferGeometry[] = [];
    const pole = lamC("flagPole", "#d9d9d6"), wood = lamC("woodPole", "#8a6040");
    const used: [number, number, number][] = [];
    const free = (x: number, z: number, r: number) => Math.hypot(x - cx, z - cz) > CAMP_CLEAR + r && !used.some(([ux, uz, ur]) => Math.hypot(x - ux, z - uz) < ur + r + 0.6) && !this.nearRoad(x, z, 4 + r);
    // ---- shrine (behind-left of the plaza, facing the cameras) ----
    {
      const [sx, sz] = at(CAMP_CLEAR + 2.5, -5.5);
      used.push([sx, sz, 3]);
      const M = frame(sx, 0, sz, faceCam);
      b.add(box(-1.6, 0, -0.5, 1.6, 0.85, 0.5), lamC("altarCloth", "#f4f1ea"), M);
      b.add(box(-1.65, 0.75, 0.5, 1.65, 0.85, 0.53), lamC("altarHem", "#1f46a8"), M);
      b.add(box(-1.9, 0, -0.75, 1.9, 2.6, -0.6), lamC("shrineBoard", "#7a5032"), M);
      const ph = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.75), lam("mn_photos", () => ({ map: photosTex() })));
      ph.applyMatrix4(mul(M, 0, 1.68, -0.585)); ph.matrixAutoUpdate = false; ph.updateMatrix(); ph.receiveShadow = true; this.root.add(ph);
      b.add(box(-0.08, 2.6, -0.72, 0.08, 3.7, -0.62), wood, M); b.add(box(-0.5, 3.25, -0.72, 0.5, 3.4, -0.62), wood, M); // cross
      // flowers in jars + rosary of little flags
      const fl = ["#e8463c", "#f2c230", "#f4f1ea", "#d94f8a", "#f08a2c"];
      for (let k = 0; k < 9; k++) {
        const fx = -1.4 + k * 0.35, M2 = mul(M, fx, 0.85, 0.1 + hh(k, 7) * 0.2);
        b.add(new THREE.CylinderGeometry(0.07, 0.06, 0.18, 10).translate(0, 0.09, 0), lamC("jar", "#9fc3cf"), M2);
        b.add(new THREE.SphereGeometry(0.11, 10, 8).translate(0, 0.3, 0), lamC("flower" + (k % 5), fl[k % 5]), M2);
      }
      // candles: on the altar and in rows on the ground in front
      this.flameMat = new THREE.SpriteMaterial({ map: flameTex(), color: new THREE.Color(3, 2.4, 1.6), depthWrite: false, fog: true, transparent: true });
      this.flameGlowMat = new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(0.5, 0.32, 0.14), blending: THREE.AdditiveBlending, depthWrite: false, fog: true, transparent: true });
      const candle = (lx: number, ly: number, lz: number, h: number, k: number) => {
        const p = V(lx, ly, lz).applyMatrix4(M);
        b.add(new THREE.CylinderGeometry(0.035, 0.035, h, 10).translate(p.x, p.y + h / 2, p.z), lamC("candle" + (k % 3), ["#f4efe0", "#e94a3a", "#f2d04a"][k % 3]));
        const s = new THREE.Sprite(this.flameMat); s.position.set(p.x, p.y + h + 0.05, p.z); s.scale.set(0.06, 0.12, 1); s.layers.set(NOINK); s.renderOrder = 6; this.root.add(s); this.flames.push(s);
        if (k % 3 === 0) { const gl = new THREE.Sprite(this.flameGlowMat); gl.position.copy(s.position); gl.scale.setScalar(0.7); gl.layers.set(NOINK); gl.renderOrder = 5; this.root.add(gl); this.lampGlows.push(gl); }
      };
      let k = 0;
      for (let i = 0; i < 7; i++) candle(-1.3 + i * 0.43, 0.85, -0.25 + (i % 2) * 0.12, 0.16 + hh(i, 9) * 0.1, k++);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9 - row; i++) candle(-1.5 + i * 0.37 + row * 0.18 + (hh(k, 11) - 0.5) * 0.08, 0, 0.9 + row * 0.32, 0.1 + hh(k, 12) * 0.12, k++);
      // big flag on a tall pole beside the shrine
      const P = frame(sx + rx * 2.6, 0, sz + rz * 2.6, faceCam + 0.6);
      b.add(new THREE.CylinderGeometry(0.05, 0.07, 8, 10).translate(0, 4, 0), pole, P);
      b.add(new THREE.SphereGeometry(0.1, 10, 8).translate(0, 8.05, 0), lamC("poleBall", "#d9b44a"), P);
      this.flag(bigFlags, P, 3.0, 2.0, 7.9);
    }
    // ---- the white marquee (community tent) ----
    {
      const [mx, mz] = at(30, 9);
      if (free(mx, mz, 8)) {
        used.push([mx, mz, 8]);
        const M = frame(mx, 0, mz, faceCam), cv = lam("mn_marquee", () => ({ map: canvasTex() }));
        b.add(box(-6, 0, -4, 6, 2.6, 4), cv, M);
        const roofG = new THREE.CylinderGeometry(1, 1, 12.4, 3, 1).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).scale(1, 1.4, 4.9).translate(0, 2.6 + 1.4 * 0.5, 0);
        b.add(roofG, cv, M);
        b.add(box(-1.4, 0, 4.0, 1.4, 2.3, 4.06), lamC("marqueeDoor", "#3a3030"), M);
        b.add(box(-6.2, 2.25, 4.0, 6.2, 2.6, 4.12), lamC("marqueeBand", "#d22b2b"), M);
      }
    }
    // ---- tents ----
    const tentCols = ["#e0473c", "#2f6fc9", "#f2c230", "#3aa57a", "#f08a2c", "#8a4fb5", "#e9e2d0", "#36a3c9", "#d94f8a", "#2f6fc9", "#e0473c", "#5fae3e"];
    const seam = seamTex();
    let n = 0;
    for (let i = 0; i < 700 && n < 46; i++) {
      const ang = Math.atan2(vz, vx) + (hh(i, 21) - 0.5) * 3.6, r = 13 + hh(i, 22) ** 0.9 * 30, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
      const along = (x - cx) * vx + (z - cz) * vz, lat = (x - cx) * rx + (z - cz) * rz;
      if (along < -4 && Math.abs(lat) < 16) continue; // keep the camera side open
      const kind = hh(i, 23), w = kind < 0.6 ? 2.2 + hh(i, 24) * 1.4 : 2.0 + hh(i, 24), h = kind < 0.6 ? 1.3 + hh(i, 25) * 0.5 : 1.5 + hh(i, 25) * 0.3;
      if (!free(x, z, w * 0.8) || this.blocks(x, z, h, w * 0.6)) continue;
      used.push([x, z, w * 0.8]); n++;
      const col = tentCols[i % tentCols.length], mat = lam("mn_tent" + col, () => ({ color: col, map: seam }));
      const yaw = Math.atan2(cx - x, cz - z) + (hh(i, 26) - 0.5) * 0.8; // doors roughly toward the plaza
      const M = frame(x, groundY(x, z), z, yaw);
      if (kind < 0.6) { // dome tent with a fly sheet and pole hoops
        b.add(new THREE.SphereGeometry(1, 20, 8, Math.PI * 0.85, TAU, 0, Math.PI / 2).scale(w / 2, h, w * 0.6), mat, M);
        b.add(new THREE.TorusGeometry(1, 0.018, 5, 24, Math.PI).scale(w / 2 + 0.02, h + 0.02, 1).rotateY(0.6), lamC("hoop", "#2a2a2e"), M);
        b.add(new THREE.TorusGeometry(1, 0.018, 5, 24, Math.PI).scale(w / 2 + 0.02, h + 0.02, 1).rotateY(-0.6), lamC("hoop", "#2a2a2e"), M);
      } else { // ridge tent (triangular prism) with a darker door end
        const len = w * 1.3;
        b.add(new THREE.CylinderGeometry(1, 1, len, 3, 1).rotateX(Math.PI / 2).rotateZ(Math.PI).scale(w / 2 / 0.866, h / 1.5, 1).translate(0, h / 3, 0), mat, M);
        b.add(strut(V(0, 0, len / 2 + 0.05), V(0, h + 0.15, len / 2 + 0.05), 0.025, 6), lamC("hoop", "#2a2a2e"), M);
        b.add(strut(V(0, 0, -len / 2 - 0.05), V(0, h + 0.15, -len / 2 - 0.05), 0.025, 6), lamC("hoop", "#2a2a2e"), M);
      }
      // a small flag on some tents
      if (hh(i, 27) < 0.45) { const fp = mul(M, w * 0.45, 0, 0, 0.3); b.add(new THREE.CylinderGeometry(0.02, 0.02, h + 1.3, 6).translate(0, (h + 1.3) / 2, 0), pole, fp); this.flag(flags, fp, 0.7, 0.47, h + 1.28); }
      // camping chair / cooler by some tents
      if (hh(i, 28) < 0.5) { const cp = mul(M, w * 0.7, 0, w * 0.6, 0.5); b.add(box(-0.25, 0.35, -0.25, 0.25, 0.42, 0.25), lamC("chair" + (i % 3), ["#2f62b4", "#3c8f5a", "#c8402e"][i % 3]), cp); b.add(box(-0.25, 0.42, -0.3, 0.25, 0.9, -0.24), lamC("chair" + (i % 3), ["#2f62b4", "#3c8f5a", "#c8402e"][i % 3]), cp); for (const [a2, c2] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) b.add(box(a2 - 0.02, 0, c2 - 0.02, a2 + 0.02, 0.36, c2 + 0.02), lamC("chairLeg", "#5a5a60"), cp); }
      else if (hh(i, 28) < 0.7) b.add(box(-0.35, 0, -0.25, 0.35, 0.45, 0.25), lamC("cooler", "#e8e4da"), mul(M, -w * 0.7, 0, w * 0.5, 0.2));
    }
    // ---- tarp shelters (blue tarps on poles) ----
    for (let i = 0, k = 0; i < 80 && k < 5; i++) {
      const ang = hh(i, 31) * TAU, r = 16 + hh(i, 32) * 26, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
      const along = (x - cx) * vx + (z - cz) * vz; if (along < 0) continue;
      if (!free(x, z, 3) || this.blocks(x, z, 2.6, 3)) continue;
      used.push([x, z, 3]); k++;
      const M = frame(x, 0, z, hh(i, 33) * TAU), tarp = lamC("tarp" + (k % 2), k % 2 ? "#2d78c8" : "#e8732c", { side: THREE.DoubleSide });
      const q = new THREE.PlaneGeometry(4.2, 3.4, 4, 4).rotateX(-Math.PI / 2 + 0.18);
      const pa = q.attributes.position as THREE.BufferAttribute; for (let v = 0; v < pa.count; v++) pa.setY(v, pa.getY(v) - 0.12 * Math.cos(pa.getX(v) * 0.75) * Math.cos(pa.getZ(v) * 0.9));
      q.computeVertexNormals();
      b.add(q.translate(0, 2.3, 0), tarp, M);
      for (const [px, pz] of [[-2, -1.6], [2, -1.6], [-2, 1.6], [2, 1.6]]) b.add(new THREE.CylinderGeometry(0.03, 0.03, 2.3 - pz * 0.18, 6).translate(px, (2.3 - pz * 0.18) / 2, pz), wood, M);
      b.add(box(-1, 0, -0.5, 1, 0.75, 0.5), lamC("table", "#c9b08a"), M); // table under it
    }
    // ---- flag poles around the camp ----
    for (let i = 0, k = 0; i < 200 && k < 14; i++) {
      const ang = hh(i, 41) * TAU, r = 12 + hh(i, 42) * 40, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r;
      const along = (x - cx) * vx + (z - cz) * vz, lat = (x - cx) * rx + (z - cz) * rz;
      if (along < -4 && Math.abs(lat) < 20) continue;
      const h = 4.5 + hh(i, 43) * 3;
      if (!free(x, z, 0.4) || this.blocks(x, z, h, 0.6)) continue;
      used.push([x, z, 0.5]); k++;
      const P = frame(x, groundY(x, z), z, 0.3 + (hh(i, 44) - 0.5) * 0.5);
      b.add(new THREE.CylinderGeometry(0.035, 0.05, h, 8).translate(0, h / 2, 0), hh(i, 45) < 0.5 ? pole : wood, P);
      this.flag(flags, P, 1.5, 1.0, h - 0.05);
    }
    // ---- generators + fuel drums ----
    for (const [bk, rt] of [[20, -16], [16, 18], [36, -4]] as P2[]) {
      const [x, z] = at(bk, rt);
      if (!free(x, z, 1.6) || this.blocks(x, z, 1.6, 1.6)) continue;
      used.push([x, z, 1.6]);
      const M = frame(x, 0, z, faceCam + 0.4);
      b.add(box(-1.2, 0.2, -0.7, 1.2, 1.5, 0.7), lamC("genset", "#f08a1c"), M);
      b.add(box(-1.25, 0, -0.75, 1.25, 0.22, 0.75), lamC("genBase", "#3a3a3e"), M);
      b.add(box(-0.7, 0.5, 0.7, 0.4, 1.2, 0.74), lamC("genPanel", "#2e3238"), M);
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 8).translate(0.85, 1.8, -0.3), lamC("exhaust", "#2e2e30"), M);
      for (let d = 0; d < 3; d++) b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 14).translate(1.9 + d * 0.65, 0.45, -0.2 + (d % 2) * 0.5), lamC("drum" + (d % 2), d % 2 ? "#2f62b4" : "#c8402e"), M);
    }
    // ---- string lights over the plaza (back half arc between poles) ----
    {
      const N = 7, R = CAMP_CLEAR + 1.5, ps: THREE.Vector3[] = [];
      for (let i = 0; i < N; i++) {
        const a = Math.atan2(vz, vx) + (-1.25 + (2.5 * i) / (N - 1));
        const x = cx + Math.cos(a) * R, z = cz + Math.sin(a) * R;
        if (this.blocks(x, z, 3.6, 0.4)) { ps.push(V(NaN, 0, 0)); continue; }
        b.add(new THREE.CylinderGeometry(0.04, 0.05, 3.6, 8).translate(x, 1.8, z), wood);
        ps.push(V(x, 3.5, z));
      }
      const wire = lamC("wire", "#1e1e22"), bulbs: THREE.BufferGeometry[] = [];
      for (let i = 0; i < ps.length - 1; i++) {
        const a = ps[i], c = ps[i + 1]; if (isNaN(a.x) || isNaN(c.x)) continue;
        const S = 10, pts: THREE.Vector3[] = [];
        for (let k = 0; k <= S; k++) { const u = k / S; pts.push(a.clone().lerp(c, u).add(V(0, -0.9 * 4 * u * (1 - u), 0))); }
        for (let k = 0; k < S; k++) b.add(strut(pts[k], pts[k + 1], 0.012, 4), wire);
        for (let k = 1; k < S; k++) { const bg = new THREE.SphereGeometry(0.06, 8, 6).translate(pts[k].x, pts[k].y - 0.08, pts[k].z); bulbs.push(bg); }
      }
      if (bulbs.length) { const m = new THREE.Mesh(mergeGeometries(bulbs, false), this.bulbMat); m.layers.set(NOINK); m.matrixAutoUpdate = false; this.root.add(m); }
    }
    // ---- light tower lighting the camp at night ----
    { const [x, z] = at(24, 14); if (free(x, z, 2) && !this.blocks(x, z, 10, 2)) { used.push([x, z, 2]); this.lightTower(b, x, z, Math.atan2(cx - x, cz - z), 8, false); } }
    // flags mesh (waving)
    if (flags.length) { const m = new THREE.Mesh(mergeGeometries(flags, false), this.flagMat(0.07)); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.root.add(m); }
    if (bigFlags.length) { const m = new THREE.Mesh(mergeGeometries(bigFlags, false), this.flagMat(0.14)); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.root.add(m); }
  }

  // =============================== drill rig ===============================
  private buildDrill(b: Batch) {
    const [dx, , dz] = DRILL;
    let vx = 0, vz = 0;
    for (const c of this.cams) if (Math.hypot(c.lx - dx, c.lz - dz) < 15) { const L = Math.hypot(c.lx - c.x, c.lz - c.z) || 1; vx += (c.lx - c.x) / L; vz += (c.lz - c.z) / L; }
    const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    // truck axis: away from the cameras, swung 55 deg to the left so it reads as a truck
    const sw = -1.45, ax = vx * Math.cos(sw) - vz * Math.sin(sw), az = vx * Math.sin(sw) + vz * Math.cos(sw);
    const yaw = Math.atan2(ax, az), M = frame(dx, 0, dz, yaw);
    this.drillFrame = M;
    const red = lamC("rigRed", "#c8352a"), white = lamC("rigWhite", "#efece4"), st = lamC("rigSteel", "#5d6670"), dk = lamC("tyre", "#232326"), gl = lamC("glass", "#34404e"), yel = lamC("cat", "#f2b230");
    // carrier truck (hole at local origin, mast at z 0.25..1.55, cab at the far end)
    b.add(box(-1.3, 0.9, 0.6, 1.3, 1.5, 12.0), st, M);
    b.add(box(-1.4, 1.5, 0.6, 1.4, 1.9, 9.8), white, M);
    b.add(box(-1.3, 1.9, 9.9, 1.3, 4.1, 12.4), red, M); // cab
    b.add(box(-1.25, 3.0, 12.38, 1.25, 3.9, 12.46), gl, M);
    b.add(box(-1.32, 3.0, 10.4, -1.28, 3.8, 12.1), gl, M); b.add(box(1.28, 3.0, 10.4, 1.32, 3.8, 12.1), gl, M);
    b.add(box(-1.31, 2.2, 10.0, 1.31, 2.5, 12.42), white, M);
    for (const wz of [2.2, 3.6, 7.6, 11.0]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 16).rotateZ(Math.PI / 2), dk, mul(M, s * 1.15, 0.62, wz));
    // deck machinery: engine house, hydraulic tank, hose reel
    b.add(box(-1.3, 1.9, 4.6, 1.3, 3.6, 8.6), red, M);
    b.add(box(-1.32, 3.0, 4.8, 1.32, 3.3, 8.4), white, M);
    b.add(new THREE.CylinderGeometry(0.5, 0.5, 2.2, 14).rotateX(Math.PI / 2).translate(0.6, 2.4, 3.2), st, M);
    b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.8, 16).rotateZ(Math.PI / 2).translate(-0.7, 2.5, 3.0), yel, M);
    // stabiliser jacks
    for (const [jx, jz] of [[-1.6, 0.9], [1.6, 0.9], [-1.6, 9.4], [1.6, 9.4]]) { b.add(box(jx - 0.12, 0.1, jz - 0.12, jx + 0.12, 1.4, jz + 0.12), yel, M); b.add(box(jx - 0.35, 0, jz - 0.35, jx + 0.35, 0.1, jz + 0.35), st, M); }
    // lattice mast 1.3 x 1.3, 18 m
    const H = 18, x0 = -0.65, x1 = 0.65, z0 = 0.25, z1 = 1.55;
    for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) b.add(box(px - 0.07, 0.3, pz - 0.07, px + 0.07, H, pz + 0.07), red, M);
    for (let y = 1.2, k = 0; y < H; y += 1.5, k++) {
      const c = k % 2 ? white : red;
      b.add(box(x0, y - 0.04, z0 - 0.04, x1, y + 0.04, z0 + 0.04), c, M); b.add(box(x0, y - 0.04, z1 - 0.04, x1, y + 0.04, z1 + 0.04), c, M);
      b.add(box(x0 - 0.04, y - 0.04, z0, x0 + 0.04, y + 0.04, z1), c, M); b.add(box(x1 - 0.04, y - 0.04, z0, x1 + 0.04, y + 0.04, z1), c, M);
      if (y + 1.5 < H) {
        b.add(strut(V(x0, y, z1), V(x1, y + 1.5, z1), 0.03, 6), c, M);
        b.add(strut(V(x0, y, z0), V(x0, y + 1.5, z1), 0.03, 6), c, M); b.add(strut(V(x1, y, z1), V(x1, y + 1.5, z0), 0.03, 6), c, M);
      }
    }
    b.add(box(-0.85, H, -0.3, 0.85, H + 0.6, 1.75), red, M); // crown block
    b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 18).rotateZ(Math.PI / 2).translate(0, H + 0.9, 0.3), yel, M);
    // guide rails on the mast front where the top drive runs
    for (const s of [-0.35, 0.35]) b.add(box(s - 0.05, 1.0, 0.15, s + 0.05, H - 0.5, 0.25), st, M);
    // mast foot frame at ground + work floor plate around the hole
    b.add(box(-1.0, 0, -0.9, 1.0, 0.18, 1.8), st, M);
    b.add(box(-0.55, 0.18, -0.55, 0.55, 0.3, -0.25), st, M); b.add(box(-0.55, 0.18, 0.25, 0.55, 0.3, 0.55), st, M);
    // wellhead collar around the hole (rod r 0.05 / note bag r <= 0.11 pass through) + dark bore
    b.add(new THREE.CylinderGeometry(0.2, 0.22, 0.5, 18, 1, true).translate(0, 0.25, 0), lamC("collar", "#3e4650"), M);
    b.add(new THREE.RingGeometry(0.12, 0.2, 18).rotateX(-Math.PI / 2).translate(0, 0.5, 0), lamC("collar", "#3e4650"), M);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#080706", fog: true }));
    bore.applyMatrix4(mul(M, 0, 0.47, 0)); bore.matrixAutoUpdate = false; bore.updateMatrix(); this.root.add(bore);
    // pipe rack on the right side: 3 sawhorses, 3 layers of rods
    const pipe = lamC("rodSteel", "#7f8a95"), rack = lamC("rackYellow", "#e2a82a");
    for (const rz of [2.2, 5.6, 9.0]) { b.add(box(3.0, 0, rz - 0.1, 3.2, 0.9, rz + 0.1), rack, M); b.add(box(5.0, 0, rz - 0.1, 5.2, 0.9, rz + 0.1), rack, M); b.add(box(2.9, 0.9, rz - 0.12, 5.3, 1.0, rz + 0.12), rack, M); }
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 9 - layer; i++) {
      const px = 3.25 + i * 0.22 + layer * 0.11, py = 1.08 + layer * 0.19;
      b.add(new THREE.CylinderGeometry(0.085, 0.085, 9.0, 10).rotateX(Math.PI / 2).translate(px, py, 5.6), pipe, M);
    }
    for (const s of [3.2, 5.2]) b.add(box(s - 0.06, 0.9, 1.0, s + 0.06, 1.75, 1.15), rack, M); // stops
    // mud pit (steel tank) + cuttings pile + hoses
    b.add(box(-6.2, 0, 3.0, -3.0, 1.3, 7.0), lamC("mudTank", "#4f6f8a"), M);
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.8).rotateX(-Math.PI / 2), lamC("mud", "#6b5546"));
    mud.applyMatrix4(mul(M, -4.6, 1.22, 5.0)); mud.matrixAutoUpdate = false; mud.updateMatrix(); this.root.add(mud);
    b.add(new THREE.ConeGeometry(2.4, 1.4, 20).scale(1, 1, 0.8).translate(-4.2, 0.66, 10.5), lamC("cuttings", "#9c948a"), M);
    b.add(strut(V(-0.3, 0.25, -0.2), V(-3.0, 1.0, 3.4), 0.09, 8), lamC("hose", "#1f2024"), M);
    // wet ground patch around the hole (decal)
    const wetT = ctex("mn_wet", 256, 256, (g, r) => { g.fillStyle = "rgba(0,0,0,0)"; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 40; k++) { const x = 128 + (r() - 0.5) * 140, y = 128 + (r() - 0.5) * 140, rad = 20 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(80,58,44,0.45)"); gr.addColorStop(1, "rgba(80,58,44,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } });
    const wet = new THREE.Mesh(new THREE.PlaneGeometry(9, 9).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: wetT, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10 }));
    twoTone(wet.material as THREE.MeshLambertMaterial);
    wet.position.set(dx, 0.02, dz); wet.layers.set(NOINK); wet.receiveShadow = true; this.root.add(wet);
    // the rod string + top drive (posed per frame)
    this.rod = new THREE.Mesh(new THREE.CylinderGeometry(ROD_R, ROD_R, 1, 14).translate(0, 0.5, 0), lamC("rod", "#8f99a4"));
    this.rod.castShadow = true; this.rod.receiveShadow = true; this.rod.frustumCulled = false; this.root.add(this.rod);
    const td = new THREE.Group();
    const tdm = (g: THREE.BufferGeometry, m: THREE.Material) => { const k = new THREE.Mesh(g, m); k.castShadow = true; k.receiveShadow = true; k.frustumCulled = false; td.add(k); };
    tdm(boxGeo(V(-0.45, 0, -0.4), V(0.45, 1.2, 0.22)), red);
    tdm(boxGeo(V(-0.3, 1.2, -0.3), V(0.3, 1.6, 0.1)), yel);
    tdm(boxGeo(V(-0.5, 0.3, 0.12), V(0.5, 0.9, 0.2)), st);
    tdm(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 14).translate(0, -0.17, 0), st);
    td.matrixAutoUpdate = false;
    this.topDrive = td; this.root.add(td);
    // light tower + a pickup at the drill site
    const lp = V(-3.5, 0, 6).applyMatrix4(M);
    if (!this.blocks(lp.x, lp.z, 10, 2)) this.lightTower(b, lp.x, lp.z, yaw + Math.PI * 1.1, 9, false);
  }

  // =============================== rescue platform ===============================
  private buildShaft(b: Batch) {
    const [sx, , sz] = SHAFT;
    let vx = 0, vz = 0;
    for (const c of this.cams) if (Math.hypot(c.lx - sx, c.lz - sz) < 15) { const L = Math.hypot(c.lx - c.x, c.lz - c.z) || 1; vx += (c.lx - c.x) / L; vz += (c.lz - c.z) / L; }
    if (!vx && !vz) vz = -1;
    const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    const yaw = Math.atan2(-vx, -vz), M = frame(sx, 0, sz, yaw); // local +z toward the cameras
    this.shaftFrame = M;
    const steel = lamC("hfSteel", "#6f8fb0"), dk = lamC("hfDark", "#3a4552"), yel = lamC("cat", "#f2b230"), rail = lamC("railYellow", "#f2c12e");
    // grated deck 10 x 10 (top y 0.12) + hazard edge
    const gt = grateTex(); gt.repeat.set(10, 10);
    b.add(box(-5, -0.1, -5, 5, 0.12, 5), lam("mn_grateDeck", () => ({ map: gt })), M);
    const hz = hazardTex(); hz.repeat.set(5, 1);
    const hm = lam("mn_hazardEdge", () => ({ map: hz }));
    b.add(box(-5.05, -0.1, 5.0, 5.05, 0.14, 5.06), hm, M); b.add(box(-5.05, -0.1, -5.06, 5.05, 0.14, -5.0), hm, M);
    // shaft collar (top at SHAFT_COLLAR_Y) + black bore
    b.add(new THREE.CylinderGeometry(0.72, 0.78, SHAFT_COLLAR_Y - 0.12 + 0.02, 28, 1, true).translate(0, 0.11 + (SHAFT_COLLAR_Y - 0.1) / 2, 0), lamC("collarSteel", "#55606c"), M);
    b.add(new THREE.RingGeometry(0.52, 0.72, 28).rotateX(-Math.PI / 2).translate(0, SHAFT_COLLAR_Y, 0), lamC("collarSteel", "#55606c"), M);
    const boreM = new THREE.Mesh(new THREE.CircleGeometry(0.53, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#050405", fog: true }));
    boreM.applyMatrix4(mul(M, 0, SHAFT_COLLAR_Y - 0.01, 0)); boreM.matrixAutoUpdate = false; boreM.updateMatrix(); this.root.add(boreM);
    // railings on the back and the sides (front open toward the cameras)
    const post = (x: number, z: number) => b.add(box(x - 0.04, 0.12, z - 0.04, x + 0.04, 1.2, z + 0.04), rail, M);
    for (let i = 0; i <= 5; i++) { const u = -5 + i * 2; post(u, -4.9); post(-4.9, u); post(4.9, u); }
    for (const y of [0.65, 1.15]) {
      b.add(box(-4.95, y - 0.03, -4.95, 4.95, y + 0.03, -4.85), rail, M);
      b.add(box(-4.95, y - 0.03, -4.95, -4.85, y + 0.03, 4.95), rail, M);
      b.add(box(4.85, y - 0.03, -4.95, 4.95, y + 0.03, 4.95), rail, M);
    }
    // tapered headframe: legs from (+-2.9, 0, +-2.9) to (+-1.1, 13, +-1.1)
    const TOP = 13, A = 2.9, B = 1.1;
    const leg = (sx2: number, sz2: number) => b.add(strut(V(sx2 * A, 0.12, sz2 * A), V(sx2 * B, TOP, sz2 * B), 0.14, 10), steel, M);
    leg(-1, -1); leg(1, -1); leg(-1, 1); leg(1, 1);
    for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1]) b.add(box(sx2 * A - 0.4, 0.12, sz2 * A - 0.4, sx2 * A + 0.4, 0.3, sz2 * A + 0.4), dk, M);
    const at = (s: number, y: number) => A + (B - A) * (y / TOP) * s; // half-width at height y
    for (let y = 4; y < TOP; y += 3) {
      const w = at(1, y);
      b.add(strut(V(-w, y, -w), V(w, y, -w), 0.06, 8), steel, M); // back
      b.add(strut(V(-w, y, -w), V(-w, y, w), 0.06, 8), steel, M); b.add(strut(V(w, y, -w), V(w, y, w), 0.06, 8), steel, M);
      if (y >= 7) b.add(strut(V(-w, y, w), V(w, y, w), 0.06, 8), steel, M); // front ties only high up
      const w2 = at(1, Math.min(TOP, y + 3));
      b.add(strut(V(-w, y, -w), V(w2, Math.min(TOP, y + 3), -w2), 0.045, 6), steel, M);
      b.add(strut(V(-w, y, w), V(-w2, Math.min(TOP, y + 3), -w2), 0.045, 6), steel, M); b.add(strut(V(w, y, -w), V(w2, Math.min(TOP, y + 3), w2), 0.045, 6), steel, M);
    }
    b.add(box(-1.6, TOP, -2.6, 1.6, TOP + 0.4, 1.6), dk, M); // head deck
    for (const s of [-1, 1]) b.add(box(s * 1.5 - 0.05, TOP + 0.4, -2.6, s * 1.5 + 0.05, TOP + 1.4, 1.6), rail, M);
    // sheave wheel (axis along local x), front tangent right above the shaft axis
    const R = 1.6, wc = V(0, TOP + 0.6 + R, -R);
    this.wheelC.copy(wc);
    const wg = new THREE.Group();
    const wm = (g: THREE.BufferGeometry, m: THREE.Material) => { const k = new THREE.Mesh(g, m); k.castShadow = true; k.receiveShadow = true; k.frustumCulled = false; wg.add(k); };
    wm(new THREE.TorusGeometry(R, 0.11, 10, 48).rotateY(Math.PI / 2), yel);
    wm(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 16).rotateZ(Math.PI / 2), dk);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; wm(strut(V(0, 0, 0), V(0, Math.cos(a) * R, Math.sin(a) * R), 0.05, 6), yel); }
    for (const s of [-1, 1]) b.add(box(s * 0.45 - 0.08, TOP + 0.4, wc.z - 0.3, s * 0.45 + 0.08, wc.y + 0.1, wc.z + 0.3), dk, M); // bearing blocks
    wg.matrixAutoUpdate = false; this.wheel = wg; this.root.add(wg);
    // hoist cable (posed per frame) + the back cable to the winch house
    this.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6).translate(0, 0.5, 0), lamC("cable", "#2a2c30"));
    this.cable.frustumCulled = false; this.cable.castShadow = true; this.root.add(this.cable);
    const wh = V(0, 2.6, -40);
    b.add(box(-3.5, 0, -43, 3.5, 3.6, -37), lamC("winchHouse", "#2f6fa8"), M);
    b.add(box(-3.7, 3.6, -43.2, 3.7, 3.9, -36.8), lamC("shedRoof", "#6e7a86"), M);
    b.add(new THREE.CylinderGeometry(1.1, 1.1, 3.2, 20).rotateZ(Math.PI / 2).translate(0, 2.6, -36.4), yel, M);
    b.add(strut(V(0, wc.y + R * 0.98, wc.z - R * 0.2), V(wh.x, wh.y + 1.0, -36.4), 0.025, 6), lamC("cable", "#2a2c30"), M);
    // crowd barriers (arc behind / beside, radius 14..15)
    const fence = lamC("fence", "#c9ced4");
    for (let i = 0; i < 22; i++) {
      const a = Math.PI * 0.18 + (i / 21) * Math.PI * 1.64 + Math.PI / 2; // skip the camera-facing front
      const R2 = 14.5, x = Math.cos(a) * R2, z = Math.sin(a) * R2;
      const wp = V(x, 0, z).applyMatrix4(M);
      if (this.blocks(wp.x, wp.z, 1.1, 1.2)) continue;
      const F = mul(M, x, 0, z, -a + Math.PI / 2);
      b.add(box(-1.1, 0.05, -0.02, 1.1, 0.1, 0.02), fence, F); b.add(box(-1.1, 1.0, -0.025, 1.1, 1.08, 0.025), fence, F);
      for (let k = 0; k <= 8; k++) b.add(box(-1.1 + k * 0.275 - 0.012, 0.1, -0.012, -1.1 + k * 0.275 + 0.012, 1.0, 0.012), fence, F);
      for (const s of [-1, 1]) b.add(box(s * 1.1 - 0.25, 0, -0.3, s * 1.1 + 0.05, 0.04, 0.3), fence, F);
    }
    // floodlight towers around the platform (beams + pools at night)
    for (const [lx, lz] of [[-10, 3], [10, 3], [-9, -11], [9, -11]] as P2[]) {
      const wp = V(lx, 0, lz).applyMatrix4(M);
      if (this.blocks(wp.x, wp.z, 12, 2)) continue;
      const toC = Math.atan2(sx - wp.x, sz - wp.z);
      this.lightTower(b, wp.x, wp.z, toC, 11, true);
    }
    // giant Chilean flag on a gantry behind the headframe
    const gf: THREE.BufferGeometry[] = [];
    const F = mul(M, 7, 1, -38);
    for (const s of [0, 16]) b.add(new THREE.CylinderGeometry(0.16, 0.2, 17, 12).translate(s, 8.5, 0), steel, F);
    b.add(strut(V(0, 16.6, 0), V(16, 16.6, 0), 0.1, 8), steel, F);
    const bf = new THREE.PlaneGeometry(15.4, 10, 24, 14).translate(8, 16.3 - 5, 0.25);
    // hanging banner: waves only gently (fixed top edge) -> use the flag shader with uv swapped: amplitude by (1 - v)
    const uvA = bf.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uvA.count; i++) { const u = uvA.getX(i), v = uvA.getY(i); uvA.setXY(i, u, v); }
    bf.applyMatrix4(F); gf.push(bf);
    const gm = this.flagMat(0.05);
    const gmesh = new THREE.Mesh(mergeGeometries(gf, false), gm); gmesh.castShadow = true; gmesh.receiveShadow = true; gmesh.frustumCulled = false; this.root.add(gmesh);
    // the platform's own pool of light at night
    this.pool(sx, sz, 6.5);
  }

  // =============================== rocks + scrub ===============================
  private buildScatter(b: Batch) {
    const rockM = lam("mn_rockLump", () => ({ map: rockTex() })), rockM2 = lam("mn_rockLump2", () => ({ map: rockTex(), color: "#d8c8bc" }));
    const scrubM = [lamC("scrub0", "#9a9a52"), lamC("scrub1", "#8a8048"), lamC("scrub2", "#a89a5c")];
    const twig = lamC("twig", "#6a4a34");
    const rgeo = [0, 1, 2, 3].map((s) => rockGeo(s * 1.7 + 0.3, 0)), rgeoF = [0, 1].map((s) => rockGeo(s * 2.3 + 1, 1));
    const sph = new THREE.SphereGeometry(1, 8, 6);
    const zones: [number, number, number][] = [[CAMP[0], CAMP[2], 58], [DRILL[0], DRILL[2], 18], [SHAFT[0], SHAFT[2], 20], [MX, MZ + 22, 30]];
    const okAt = (x: number, z: number, r: number) => !zones.some(([zx, zz, zr]) => Math.hypot(x - zx, z - zz) < zr + r) && !this.nearRoad(x, z, 5 + r) && !(Math.abs(x - MX) < 8 && z > MZ - 16 && z < MZ + 12);
    const R = rng(777);
    let rocks = 0, scrub = 0;
    for (let i = 0; i < 6000 && (rocks < 520 || scrub < 650); i++) {
      // denser near the work basin, sparse far out
      const a = R() * TAU, d = 20 + R() ** 1.7 * 900, x = -10 + Math.cos(a) * d, z = 10 + Math.sin(a) * d;
      const isRock = R() < 0.45;
      if (isRock && rocks < 520) {
        const s = (0.25 + R() ** 2.5 * 2.6) * (d > 300 ? 2.2 : 1);
        if (!okAt(x, z, s) || this.blocks(x, z, s, s)) continue;
        const y = groundY(x, z) - s * 0.15, far = d > 250;
        b.add(far ? rgeoF[rocks % 2] : rgeo[rocks % 4], rocks % 3 ? rockM : rockM2, new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * TAU, (R() - 0.5) * 0.3)), V(s * (0.8 + R() * 0.6), s, s * (0.8 + R() * 0.5))));
        rocks++;
        // small rock companions
        if (s > 0.8 && !far) for (let k = 0; k < 3; k++) { const s2 = s * (0.2 + R() * 0.25), x2 = x + (R() - 0.5) * s * 3, z2 = z + (R() - 0.5) * s * 3; if (okAt(x2, z2, s2) && !this.blocks(x2, z2, s2, s2)) b.add(rgeo[k], rockM, new THREE.Matrix4().compose(V(x2, groundY(x2, z2) - s2 * 0.1, z2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, R() * TAU, 0)), V(s2, s2, s2))); }
      } else if (scrub < 650) {
        const s = 0.35 + R() * 0.55;
        if (!okAt(x, z, s) || this.blocks(x, z, s, s)) continue;
        const y = groundY(x, z), m = scrubM[scrub % 3];
        const n = 3 + Math.floor(R() * 3);
        for (let k = 0; k < n; k++) {
          const ka = (k / n) * TAU + R(), kd = k ? s * 0.55 : 0, kr = s * (k ? 0.55 + R() * 0.2 : 0.7);
          b.add(sph, m, new THREE.Matrix4().compose(V(x + Math.cos(ka) * kd, y + kr * 0.55, z + Math.sin(ka) * kd), new THREE.Quaternion(), V(kr, kr * 0.7, kr)));
        }
        if (d < 200) for (let k = 0; k < 3; k++) { const ka = R() * TAU; b.add(strut(V(x, y, z), V(x + Math.cos(ka) * s * 1.1, y + s * 1.0, z + Math.sin(ka) * s * 1.1), 0.015, 4), twig); }
        scrub++;
      }
    }
    // ---- the mine mountain: strata ledges (flat outcrops along the contours), boulders, scree, scrub ----
    { // own batch WITHOUT shadow casting: on the steep sunlit face their cast shadows read as long spikes
      const fb = new Batch();
      const M2 = rng(4242), ledgeM = lam("mn_ledge", () => ({ map: rockTex(), color: "#e0b49a" }));
      const onFace = (x: number, z: number, r: number) => !(Math.abs(x - MX) < 7 + r && z > TUN_BACK - 4 && z < MZ + 14) && !this.nearRoad(x, z, 3.5 + r) && Math.hypot(x - (MX - 9), z - (MZ + 14)) > 6 + r;
      let nl = 0, nb = 0, ns = 0;
      for (let i = 0; i < 4000 && (nl < 70 || nb < 160 || ns < 220); i++) {
        const x = MX + (M2() - 0.5) * 300, z = MZ + 10 - M2() ** 1.4 * 200, kind = M2();
        const m = mountain(x, z); if (m < 2) continue;
        const y = groundY(x, z), gx = groundY(x + 1, z) - groundY(x - 1, z), gz = groundY(x, z + 1) - groundY(x, z - 1), sl = Math.hypot(gx, gz) / 2;
        const contour = Math.atan2(gz, -gx); // yaw that lays the long axis along the contour line
        if (kind < 0.3 && nl < 70 && sl > 0.35) { // ledge: a strata outcrop jutting from the slope
          const s = 1.2 + M2() * 2.6;
          if (!onFace(x, z, s * 2) || this.blocks(x, z, y + s, s * 2)) continue;
          fb.add(rgeo[nl % 4], ledgeM, new THREE.Matrix4().compose(V(x, y - s * (0.2 + 0.55 * Math.min(sl, 1.5)), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -contour, 0)), V(s * 2.6, s * 0.6, s * 0.75)));
          nl++;
        } else if (kind < 0.62 && nb < 160) { // boulders + scree
          const s = 0.3 + M2() ** 2 * 1.8;
          if (!onFace(x, z, s) || this.blocks(x, z, y + s, s)) continue;
          fb.add(rgeo[nb % 4], nb % 3 ? rockM : rockM2, new THREE.Matrix4().compose(V(x, y - s * (0.15 + 0.45 * Math.min(sl, 1.5)), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, M2() * TAU, (M2() - 0.5) * 0.3)), V(s * (0.8 + M2() * 0.6), s, s * (0.8 + M2() * 0.5))));
          nb++;
        } else if (ns < 220 && sl < 1.4) { // scrub tufts on the gentler parts
          const s = 0.3 + M2() * 0.45;
          if (!onFace(x, z, s) || this.blocks(x, z, y + s, s)) continue;
          const mm = scrubM[ns % 3];
          for (let k = 0; k < 3; k++) { const ka = (k / 3) * TAU + M2(), kd = k ? s * 0.5 : 0, kr = s * (k ? 0.6 : 0.75); fb.add(sph, mm, new THREE.Matrix4().compose(V(x + Math.cos(ka) * kd, groundY(x + Math.cos(ka) * kd, z + Math.sin(ka) * kd) + kr * 0.45, z + Math.sin(ka) * kd), new THREE.Quaternion(), V(kr, kr * 0.7, kr))); }
          ns++;
        }
      }
      // the cut bench face either side of the portal: blocky outcrops and loose rocks stuck in the face
      for (let k = 0; k < 60; k++) {
        const side = k % 2 ? 1 : -1, x = MX + side * (8 + hh(k, 71) * 70), z = MZ + 3 - hh(k, 72) * 15, s = 0.4 + hh(k, 73) ** 1.5 * 1.6;
        if (this.nearRoad(x, z, 2 + s) || this.blocks(x, z, groundY(x, z) + s, s) || (Math.abs(x - MX) < 7 + s && z > TUN_BACK - 4)) continue;
        const y = groundY(x, z), gx = groundY(x + 1, z) - groundY(x - 1, z), gz = groundY(x, z + 1) - groundY(x, z - 1), sl = Math.min(1.5, Math.hypot(gx, gz) / 2);
        fb.add(rgeo[k % 4], k % 3 ? ledgeM : rockM, new THREE.Matrix4().compose(V(x, y - s * (0.3 + 0.6 * sl), z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.atan2(gz, -gx) * -1 + hh(k, 74) * 0.4, 0)), V(s * 1.8, s * 0.75, s * 0.5)));
      }
      // boulder apron at the foot of the cut face either side of the portal
      for (let k = 0; k < 26; k++) {
        const side = k % 2 ? 1 : -1, x = MX + side * (9 + hh(k, 61) * 26), z = MZ + 3 + hh(k, 62) * 5, s = 0.35 + hh(k, 63) ** 2 * 1.3;
        if (Math.hypot(x - (MX - 9), z - (MZ + 14)) < 4 || Math.hypot(x - (MX + 16), z - (MZ + 16)) < 7 || Math.hypot(x - (MX - 15), z - (MZ + 16)) < 4.5 || this.nearRoad(x, z, 3 + s) || this.blocks(x, z, s, s)) continue;
        fb.add(rgeo[k % 4], k % 3 ? rockM : rockM2, new THREE.Matrix4().compose(V(x, groundY(x, z) - s * 0.15, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, hh(k, 64) * TAU, 0)), V(s * 1.2, s, s)));
      }
      fb.build(this.root, false);
    }
    // power line along the main road (wooden poles + sagging wires)
    const path = this.roadPaths()[0], poles: THREE.Vector3[] = [];
    const curve = new THREE.CatmullRomCurve3(path.map(([x, z]) => V(x, 0, z)), false, "centripetal"), L = curve.getLength();
    for (let s = 40; s < L - 10; s += 45) {
      const p = curve.getPointAt(s / L), tg = curve.getTangentAt(s / L), x = p.x - tg.z * 7.5, z = p.z + tg.x * 7.5;
      if (this.blocks(x, z, 9, 1) || Math.hypot(x - MX, z - MZ) < 30) { poles.push(V(NaN, 0, 0)); continue; }
      const y = groundY(x, z);
      b.add(new THREE.CylinderGeometry(0.12, 0.16, 9, 8).translate(x, y + 4.5, z), lamC("woodPole", "#8a6040"));
      b.add(strut(V(x - tg.x * 0 - tg.z * 1.2, y + 8.4, z + tg.x * 1.2), V(x + tg.z * 1.2, y + 8.4, z - tg.x * 1.2), 0.06, 6), lamC("woodPole", "#8a6040"));
      poles.push(V(x, y + 8.5, z));
    }
    const wire = lamC("wire", "#1e1e22");
    for (let i = 0; i < poles.length - 1; i++) {
      const a = poles[i], c = poles[i + 1]; if (isNaN(a.x) || isNaN(c.x)) continue;
      const S = 8;
      let prev = a.clone();
      for (let k = 1; k <= S; k++) { const u = k / S, p = a.clone().lerp(c, u).add(V(0, -1.4 * 4 * u * (1 - u), 0)); b.add(strut(prev, p, 0.02, 4), wire); prev = p; }
    }
  }

  // =============================== stars ===============================
  private buildStars() {
    const N = 1600, pos: number[] = [], uv: number[] = [], col: number[] = [], r = rng(99), Rr = 5000;
    for (let i = 0; i < N; i++) {
      const az = r() * TAU, el = Math.asin(0.04 + r() * 0.96) ;
      const d = V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
      const s = Rr * (0.0011 + r() ** 4 * 0.0035);
      const up = Math.abs(d.y) > 0.95 ? V(1, 0, 0) : V(0, 1, 0), a = new THREE.Vector3().crossVectors(up, d).normalize().multiplyScalar(s), bb = new THREE.Vector3().crossVectors(d, a).normalize().multiplyScalar(s);
      const c = d.multiplyScalar(Rr);
      const k = 0.6 + r() * 0.9, warm = r();
      const cc = [k * (warm < 0.2 ? 1.15 : 0.95), k, k * (warm > 0.8 ? 1.2 : 1.0)];
      const vs = [c.clone().sub(a).sub(bb), c.clone().add(a).sub(bb), c.clone().add(a).add(bb), c.clone().sub(a).add(bb)];
      for (const q of [0, 1, 2, 0, 2, 3]) { pos.push(vs[q].x, vs[q].y, vs[q].z); col.push(...cc); }
      uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    this.stars = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: starTex(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.stars.frustumCulled = false; this.stars.layers.set(NOINK); this.stars.renderOrder = -0.5; this.stars.visible = false;
    this.root.add(this.stars);
  }

  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const s = SHOTS[id - 1];
    this.root.visible = s.place === "desert";
    if (!this.root.visible) return;
    const nk = NIGHT[s.look];
    this.uT.value = t;
    // ---- lights by look ----
    this.bulbMat.color.setRGB(lerp(1.0, 5.5, nk), lerp(0.88, 3.6, nk), lerp(0.66, 1.5, nk));
    this.lampMat.color.setRGB(lerp(0.75, 7.5, nk), lerp(0.78, 7.4, nk), lerp(0.82, 6.6, nk));
    this.lampGlowMat.color.setRGB(0.9 * nk, 0.9 * nk, 0.85 * nk);
    for (const g of this.lampGlows) g.visible = nk > 0.05;
    this.flameGlowMat.color.setRGB(lerp(0.25, 0.7, nk), lerp(0.15, 0.42, nk), lerp(0.06, 0.16, nk));
    for (let i = 0; i < this.flames.length; i++) { // flicker (pure function of t)
      const fl = this.flames[i], k = 1 + 0.12 * Math.sin(t * 23 + i * 1.7) + 0.08 * Math.sin(t * 37 + i * 2.9);
      fl.scale.set(0.06 * (0.9 + 0.1 * k), 0.13 * k, 1);
    }
    const night = s.look === "night";
    for (const o of this.nightOnly) o.visible = night;
    this.stars.visible = night;
    this.stars.position.copy(cam.position);
    // ---- drill rod + top drive ----
    const rd = rodAt(id, t), tdY = 7.0 + rd.up;
    const dp = V(DRILL[0], 0, DRILL[2]), y0 = rd.note ? rd.up + ROD_PROPS_TOP - 0.02 : 0.3, y1 = tdY - 0.3;
    this.rod.position.set(dp.x, y0, dp.z); this.rod.scale.set(1, Math.max(0.01, y1 - y0), 1);
    this.topDrive.matrix.copy(mul(this.drillFrame, 0, tdY, 0));
    // ---- sheave wheel + hoist cable ----
    const cp = capsuleAt(id, t);
    const capTop = (cp.show ? cp.y : -40) + CAPSULE_TOP;
    const ang = -(capTop - CAPSULE_TOP) / 1.6;
    this.wheel.matrix.copy(this.shaftFrame).multiply(new THREE.Matrix4().makeTranslation(this.wheelC.x, this.wheelC.y, this.wheelC.z)).multiply(new THREE.Matrix4().makeRotationX(ang));
    const topY = this.wheelC.y, bot = Math.max(capTop, -30);
    this.cable.position.set(SHAFT[0], bot, SHAFT[2]); this.cable.scale.set(1, topY - bot, 1);
  }
}
