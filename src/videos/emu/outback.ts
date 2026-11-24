// OWNER: outback agent. See /home/user/lookmatch/EMU_BRIEF.md
// The Emu War sets (one Group per place, only the shot's place is visible):
//   FARM   : red-earth plain with a hill to the north (the emu wave pours over its crest), four golden wheat fields
//            (dynamic carpet + stalk skirts, eaten down to red stubble by wheatAt with a north->south patchy front),
//            tin-roof homestead with a striped bullnose verandah, turning windmill + corrugated tanks, post-and-wire
//            fences, gum trees, red dirt tracks, SCORE kept clear for the props board, a camouflage bush (shot 13).
//   DAM    : red-earth farm dam (water + wet mud bank), scrub, skeleton gums, reeds, the big hide bush at HIDE.
//   ROAD   : long straight corrugated red-dirt road along +x, spinifex, scrub, termite mounds, telegraph poles + wires.
//   OFFICE : 1930s army office (desk, wall map of WA with pins, flag, filing cabinet, window light, ceiling fan, clock).
// Pure functions of (id, t): seeded hashes only.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, V, lam, boxGeo } from "../bridge/build";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, camAt, FARM, HOMESTEAD, SCORE, DAM, HIDE, ROAD, OFFICE, wheatAt, smooth, clamp01, Place, V3 } from "./story";

// ======================================================================================================
// contracts for other owners
// ======================================================================================================
/** wheat fields at FARM (x0..x1, z0..z1, world metres). Standing wheat top ~WHEAT_H above groundY; eaten -> stubble. */
export const FIELDS = [
  { x0: 4, x1: 140, z0: -150, z1: -14 },
  { x0: -170, x1: -62, z0: -165, z1: -72 },
  { x0: -150, x1: -22, z0: 12, z1: 120 },
  { x0: 16, x1: 150, z0: -2, z1: 140 },
];
export const WHEAT_H = 1.0;
/** the big bush the soldiers hide behind (dam side of HIDE): centre, radius, top */
export const HIDE_BUSH = { x: HIDE[0] + 1.6, z: HIDE[2] - 1.2, r: 1.0, top: 1.4 };
/** shot 13 only: the bush the camouflaged emu stands in (emu at FARM origin): front lobe low (body hidden), back lobe */
export const SHOT13_BUSH = { front: [0.85, 0, 1.05] as V3, back: [-0.35, 0, -0.95] as V3, frontTop: 1.05, backTop: 1.5 };
/** army office desk (top y, centre, size x by z); the person stands / sits behind it at OFFICE (z ~ 0) */
export const DESK = { x: OFFICE[0], z: OFFICE[2] + 0.6, w: 1.6, d: 0.8, top: 0.78 };
/** suggested telephone spot on the desk (props) */
export const PHONE_AT: V3 = [OFFICE[0] + 0.48, DESK.top, OFFICE[2] + 0.52];
/** farm obstacles emus / cast must not walk through: [x, z, radius] */
export const FARM_KEEPOUT: [number, number, number][] = [];
/** dam: ground is exactly 0 outside damShore(angle) (angle = atan2(z - DAM.z, x - DAM.x)); water inside */
export const damShore = (a: number) => 12.4 + 0.8 * Math.sin(3 * a + 0.5) + 0.5 * Math.sin(5 * a + 2) + 0.8; // water edge <= 14 m, ground 0 beyond <= 14.5 m
export const DAM_WATER_Y = -0.38;
/** road: straight along +x at z = ROAD.z, flat (y = 0) for |z - ROAD.z| < 40, x in [-700, 1700] */
export const ROAD_HALF = 3.6;

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;
const lerp = THREE.MathUtils.lerp;
type P2 = [number, number];

// ======================================================================================================
// ground heights (analytic; meshes sample them on fine grids near the action, where they are flat anyway)
// ======================================================================================================
const rolling = (x: number, z: number) => 14 * Math.sin(x * 0.0041 + 1.3) * Math.sin(z * 0.0053 + 0.4) + 8 * Math.sin(x * 0.011 - z * 0.008 + 2) + 3 * Math.sin(x * 0.031 + z * 0.027);
const mesas = (x: number, z: number) => { // flat-topped ranges far out
  const n = 0.5 + 0.5 * Math.sin(x * 0.0023 + 0.7) * Math.cos(z * 0.0029 + 1.1) + 0.25 * Math.sin(x * 0.0061 - z * 0.0047);
  return 55 * smooth((n - 0.55) / 0.12);
};
const hillCrestZ = (x: number) => -215 + 25 * Math.sin(x * 0.01 + 0.5);
const farmH = (x: number, z: number) => {
  const r = Math.hypot(x, z + 40);
  const hill = 24 * Math.exp(-(((z - hillCrestZ(x)) / 62) ** 2)) * smooth((-128 - z) / 52) * (1 - smooth((Math.abs(x) - 380) / 200));
  const far = smooth((r - 420) / 900);
  return hill + far * (22 + rolling(x, z) + mesas(x, z));
};
const damH = (x: number, z: number) => {
  const lx = x - DAM[0], lz = z - DAM[2], r = Math.hypot(lx, lz), a = Math.atan2(lz, lx);
  const pit = -2.0 * smooth((damShore(a) - r) / 4.0);
  const far = smooth((r - 260) / 700);
  // spoil bank (the dam wall heap) well behind the water, away from the flock
  const sa = Math.atan2(lz, lx) + 0.75, sb = 3.2 * Math.exp(-(((r - 105) / 16) ** 2)) * Math.exp(-((sa / 0.7) ** 2));
  return pit + sb + far * (18 + rolling(x, z) + mesas(x, z));
};
const roadH = (x: number, z: number) => {
  const lz = z - ROAD[2];
  const far = smooth((Math.abs(lz) - 90) / 650) * (1 - 0.3 * smooth((Math.abs(x - 500) - 1500) / 600)) + smooth((Math.abs(x - 500) - 1600) / 800);
  const dunes = 1.4 * smooth((Math.abs(lz) - 45) / 30) * (0.5 + 0.5 * Math.sin(x * 0.05 + lz * 0.03)) * (0.5 + 0.5 * Math.sin(x * 0.013 - lz * 0.07));
  return dunes + clamp01(far) * (16 + rolling(x, z) + 1.3 * mesas(x, z));
};
const placeOf = (x: number, z: number): Place => (x > 2500 ? "office" : z < -800 ? "road" : x > 320 ? "dam" : "farm");
/** ground height at (x, z) for the set the point belongs to (office floor = 0) */
export const groundY = (x: number, z: number) => {
  const p = placeOf(x, z);
  return p === "farm" ? farmH(x, z) : p === "dam" ? damH(x, z) : p === "road" ? roadH(x, z) : 0;
};

// ======================================================================================================
// painted textures
// ======================================================================================================
const wrapped = (W: number, H: number, x: number, y: number, fn: (x: number, y: number) => void) => { for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) fn(x + ox, y + oy); };
const blobs = (g: CanvasRenderingContext2D, r: () => number, W: number, H: number, n: number, cols: string[], r0: number, r1: number) => {
  for (let k = 0; k < n; k++) {
    const x = r() * W, y = r() * H, rad = r0 + r() * (r1 - r0), c = cols[Math.floor(r() * cols.length)];
    wrapped(W, H, x, y, (px, py) => {
      if (px < -rad || py < -rad || px > W + rad || py > H + rad) return;
      const gr = g.createRadialGradient(px, py, 0, px, py, rad); gr.addColorStop(0, c); gr.addColorStop(1, c.replace(/[\d.]+\)$/, "0)"));
      g.fillStyle = gr; g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    });
  }
};
/** neutral light earth (vertex colours carry the red / grass hue) with pebbles, dry grass strokes, cracks */
const dirtTex = () => ctex("eo_dirt", 2048, 2048, (g, r) => {
  const W = 2048;
  g.fillStyle = "#efe2d6"; g.fillRect(0, 0, W, W);
  blobs(g, r, W, W, 220, ["rgba(214,176,150,0.45)", "rgba(250,236,222,0.45)", "rgba(200,160,136,0.35)"], 50, 240);
  g.lineCap = "round";
  for (let k = 0; k < 2600; k++) { // dry grass strokes (pale) + dark twigs
    const x = r() * W, y = r() * W, l = 8 + r() * 26, a = -Math.PI / 2 + (r() - 0.5) * 1.4, pale = r() < 0.75;
    g.strokeStyle = pale ? `rgba(255,246,214,${0.25 + r() * 0.3})` : `rgba(120,80,60,${0.2 + r() * 0.2})`; g.lineWidth = 1.5 + r() * 1.5;
    wrapped(W, W, x, y, (px, py) => { if (px < -40 || py < -40 || px > W + 40 || py > W + 40) return; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); g.stroke(); });
  }
  for (let k = 0; k < 2400; k++) { // pebbles: dark underside, body, lit top
    const x = r() * W, y = r() * W, s = 1.5 + r() * r() * 9, tone = r();
    const base = tone < 0.4 ? [196, 140, 112] : tone < 0.75 ? [228, 200, 176] : [160, 110, 92];
    wrapped(W, W, x, y, (px, py) => {
      if (px < -20 || py < -20 || px > W + 20 || py > W + 20) return;
      g.fillStyle = "rgba(90,50,36,0.4)"; g.beginPath(); g.ellipse(px + s * 0.2, py + s * 0.35, s, s * 0.7, 0, 0, TAU); g.fill();
      g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`; g.beginPath(); g.ellipse(px, py, s, s * 0.72, 0, 0, TAU); g.fill();
      g.fillStyle = "rgba(255,245,230,0.4)"; g.beginPath(); g.ellipse(px - s * 0.2, py - s * 0.25, s * 0.5, s * 0.3, 0, 0, TAU); g.fill();
    });
  }
  g.strokeStyle = "rgba(130,84,64,0.32)"; g.lineWidth = 2;
  for (let k = 0; k < 90; k++) { let x = r() * W, y = r() * W; g.beginPath(); g.moveTo(x, y); for (let i = 0; i < 5; i++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
});
/** red-dirt track / road: two worn ruts, washboard corrugations, potholes, soft edges */
const roadTex = (key: string, ruts: boolean) => ctex(key, 1024, 1024, (g, r) => {
  const W = 1024;
  g.fillStyle = "#e2a27a"; g.fillRect(0, 0, W, W);
  blobs(g, r, W, W, 120, ["rgba(196,120,84,0.4)", "rgba(240,190,150,0.4)", "rgba(210,140,100,0.35)"], 30, 120);
  if (ruts) for (let y = 0; y < W; y += 22) { g.fillStyle = "rgba(150,80,52,0.16)"; g.fillRect(150, y, W - 300, 7); g.fillStyle = "rgba(255,214,180,0.14)"; g.fillRect(150, y + 8, W - 300, 5); }
  for (const cx of [300, 724]) {
    const gr = g.createLinearGradient(cx - 90, 0, cx + 90, 0);
    gr.addColorStop(0, "rgba(140,70,44,0)"); gr.addColorStop(0.3, "rgba(140,70,44,0.42)"); gr.addColorStop(0.5, "rgba(120,60,40,0.5)"); gr.addColorStop(0.7, "rgba(140,70,44,0.42)"); gr.addColorStop(1, "rgba(140,70,44,0)");
    g.fillStyle = gr; g.fillRect(cx - 90, 0, 180, W);
    g.strokeStyle = "rgba(255,220,190,0.25)"; g.lineWidth = 3; // ridge highlights beside the ruts
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 78, 0); for (let y = 0; y <= W; y += 32) g.lineTo(cx + s * (78 + 6 * Math.sin(y * 0.02)), y); g.stroke(); }
  }
  for (let k = 0; k < 9; k++) { // potholes
    const x = 200 + r() * 620, y = r() * W, w = 20 + r() * 40;
    g.fillStyle = "rgba(110,52,32,0.5)"; g.beginPath(); g.ellipse(x, y, w, w * 0.6, 0, 0, TAU); g.fill();
    g.strokeStyle = "rgba(255,220,190,0.45)"; g.lineWidth = 3; g.beginPath(); g.ellipse(x, y + 3, w, w * 0.6, 0, 0.2, Math.PI - 0.2); g.stroke();
  }
  for (let k = 0; k < 1400; k++) { const s = 1.5 + r() * 4; g.fillStyle = r() < 0.5 ? `rgba(130,64,40,${0.25 + r() * 0.3})` : `rgba(255,226,196,${0.3 + r() * 0.3})`; g.beginPath(); g.ellipse(r() * W, r() * W, s, s * 0.7, 0, 0, TAU); g.fill(); }
  const e = g.createLinearGradient(0, 0, W, 0);
  e.addColorStop(0, "rgba(214,130,90,1)"); e.addColorStop(0.1, "rgba(214,130,90,0)"); e.addColorStop(0.9, "rgba(214,130,90,0)"); e.addColorStop(1, "rgba(214,130,90,1)");
  g.fillStyle = e; g.fillRect(0, 0, W, W);
});
/** standing wheat seen from above: packed ears (light tops, dark gaps), awns */
const wheatTopTex = () => ctex("eo_wheatTop", 2048, 2048, (g, r) => {
  const W = 2048;
  g.fillStyle = "#c9a645"; g.fillRect(0, 0, W, W);
  blobs(g, r, W, W, 120, ["rgba(150,110,30,0.3)", "rgba(250,225,140,0.3)"], 60, 220);
  const cols = ["#f8e28a", "#f0d06a", "#fbe9a4", "#e6c25a", "#f6dc80"];
  for (let k = 0; k < 14000; k++) {
    const x = r() * W, y = r() * W, a = r() * TAU, L = 14 + r() * 12, w = 4 + r() * 2.5;
    const c = cols[Math.floor(r() * cols.length)];
    wrapped(W, W, x, y, (px, py) => {
      if (px < -40 || py < -40 || px > W + 40 || py > W + 40) return;
      g.fillStyle = "rgba(110,80,20,0.3)"; g.beginPath(); g.ellipse(px + 2, py + 3, L * 0.55, w * 0.7, a, 0, TAU); g.fill();
      g.fillStyle = c; g.beginPath(); g.ellipse(px, py, L * 0.5, w * 0.55, a, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,240,190,0.5)"; g.lineWidth = 1; g.beginPath(); g.moveTo(px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5); g.lineTo(px + Math.cos(a) * L * 1.1, py + Math.sin(a) * L * 1.1); g.stroke();
    });
  }
});
/** the side of a wheat stand: stalks with ears at the top, dark base */
const wheatSideTex = () => ctex("eo_wheatSide", 1024, 512, (g, r) => {
  const W = 1024, H = 512;
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#ecca5c"); gr.addColorStop(0.35, "#d4ac4a"); gr.addColorStop(1, "#8a6a30");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.lineCap = "round";
  for (let k = 0; k < 900; k++) {
    const x = r() * W, lean = (r() - 0.5) * 20, top = 10 + r() * 80;
    const c = r() < 0.5 ? "rgba(246,212,120,0.75)" : "rgba(190,140,60,0.7)";
    for (const ox of [-W, 0, W]) {
      g.strokeStyle = c; g.lineWidth = 2 + r() * 1.5; g.beginPath(); g.moveTo(x + ox, H); g.quadraticCurveTo(x + ox + lean * 0.3, H * 0.5, x + ox + lean, top + 28); g.stroke();
      g.fillStyle = r() < 0.5 ? "#f4cf6c" : "#e2b24c"; g.beginPath(); g.ellipse(x + ox + lean, top + 14, 5, 16, lean * 0.02, 0, TAU); g.fill();
      g.strokeStyle = "rgba(110,70,20,0.5)"; g.lineWidth = 1.2; g.stroke();
    }
  }
});
/** stubble: short pale straw stalks in rows on red dirt */
const stubbleTex = () => ctex("eo_stubble", 1024, 1024, (g, r) => {
  const W = 1024;
  g.fillStyle = "#d6a274"; g.fillRect(0, 0, W, W);
  blobs(g, r, W, W, 80, ["rgba(190,120,80,0.4)", "rgba(240,180,130,0.35)"], 30, 120);
  for (let row = 0; row < W; row += 16) {
    for (let x = 0; x < W; x += 3 + r() * 6) {
      const y = row + (r() - 0.5) * 5, l = 4 + r() * 7;
      g.strokeStyle = r() < 0.7 ? "rgba(255,232,170,0.85)" : "rgba(170,120,60,0.7)"; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - l); g.stroke();
    }
  }
  for (let k = 0; k < 160; k++) { const x = r() * W, y = r() * W; g.strokeStyle = "rgba(250,220,150,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 12); g.stroke(); }
});
/** corrugated iron, ridges along v (down the slope); colour by material tint */
const corrTex = (key: string, stripes: string[] | null) => ctex(key, 512, 512, (g, r) => {
  const W = 512;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, W);
  if (stripes) for (let i = 0; i < 8; i++) { g.fillStyle = stripes[i % stripes.length]; g.fillRect(i * 64, 0, 64, W); }
  for (let x = 0; x < W; x += 2) { const s = Math.sin((x / 16) * TAU); g.fillStyle = s > 0 ? `rgba(255,255,255,${0.22 * s})` : `rgba(0,0,0,${-0.16 * s})`; g.fillRect(x, 0, 2, W); }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(120,60,30,${0.05 + r() * 0.08})`; g.fillRect(r() * W, r() * W, 6 + r() * 20, 20 + r() * 80); } // rust streaks
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, W, 4); // sheet lap
});
const boardTex = (key: string, base: string, line: string, n: number) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.03})`; g.fillRect(r() * 512, r() * 512, 40 + r() * 140, 3 + r() * 6); }
  const step = 512 / n;
  for (let i = 0; i < n; i++) { const y = i * step; g.fillStyle = line; g.fillRect(0, y + step - 6, 512, 6); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(0, y, 512, 3); }
});
const barkTex = () => ctex("eo_bark", 256, 512, (g, r) => {
  g.fillStyle = "#efe8dc"; g.fillRect(0, 0, 256, 512);
  blobs(g, r, 256, 512, 50, ["rgba(170,160,150,0.5)", "rgba(220,190,160,0.45)", "rgba(150,150,160,0.4)"], 15, 60);
  g.strokeStyle = "rgba(120,110,100,0.4)"; g.lineWidth = 2;
  for (let k = 0; k < 40; k++) { const x = r() * 256, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y + 20, x + (r() - 0.5) * 10, y + 40 + r() * 40); g.stroke(); }
});
const leafTex = (key: string, base: string) => ctex(key, 256, 128, (g, r) => {
  const b = new THREE.Color(base), top = b.clone().offsetHSL(0.01, 0.02, 0.09), bot = b.clone().offsetHSL(-0.01, 0, -0.08);
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, "#" + top.getHexString()); gr.addColorStop(0.45, "#" + b.getHexString()); gr.addColorStop(1, "#" + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  for (let k = 0; k < 70; k++) {
    const x = r() * 256, y = 8 + r() * 112, rad = 4 + r() * 8, light = y < 64 ? r() < 0.7 : r() < 0.25;
    for (const ox of [-256, 0, 256]) { g.strokeStyle = light ? "rgba(240,255,200,0.25)" : "rgba(30,50,30,0.22)"; g.lineWidth = 2.5; g.lineCap = "round"; g.beginPath(); g.arc(x + ox, y + rad * 0.6, rad, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
  }
});
const spinifexTex = () => ctex("eo_spinifex", 256, 128, (g, r) => {
  g.fillStyle = "#c9b45e"; g.fillRect(0, 0, 256, 128);
  g.lineCap = "round";
  for (let k = 0; k < 500; k++) {
    const x = r() * 256, y = r() * 128, a = -Math.PI / 2 + (r() - 0.5) * 2.2, l = 6 + r() * 14;
    g.strokeStyle = r() < 0.6 ? "rgba(240,226,150,0.6)" : "rgba(120,110,50,0.45)"; g.lineWidth = 1.5;
    for (const ox of [-256, 0, 256]) { g.beginPath(); g.moveTo(x + ox, y); g.lineTo(x + ox + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  }
});
const waterTex = () => ctex("eo_water", 1024, 1024, (g, r) => {
  const W = 1024;
  g.fillStyle = "#7b8e86"; g.fillRect(0, 0, W, W);
  blobs(g, r, W, W, 60, ["rgba(150,120,90,0.35)", "rgba(110,150,160,0.35)"], 60, 200);
  g.lineCap = "round";
  for (let k = 0; k < 320; k++) { // ripple glints
    const x = r() * W, y = r() * W, l = 20 + r() * 60;
    g.strokeStyle = `rgba(235,245,250,${0.25 + r() * 0.35})`; g.lineWidth = 2 + r() * 2;
    wrapped(W, W, x, y, (px, py) => { if (px < -80 || px > W + 80 || py < -10 || py > W + 10) return; g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px + l / 2, py - 4, px + l, py); g.stroke(); });
  }
});
const mudTex = () => ctex("eo_mud", 1024, 1024, (g, r) => {
  const W = 1024;
  g.fillStyle = "#e8d2c4"; g.fillRect(0, 0, W, W);
  g.strokeStyle = "rgba(90,50,36,0.45)"; g.lineWidth = 3; // dried-mud crack polygons
  for (let k = 0; k < 260; k++) { const x = r() * W, y = r() * W; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 70, y + (r() - 0.5) * 70); g.lineTo(x + (r() - 0.5) * 70, y + (r() - 0.5) * 70); g.stroke(); }
  for (let k = 0; k < 140; k++) { // three-toed emu footprints
    const x = r() * W, y = r() * W, a = r() * TAU;
    g.strokeStyle = "rgba(80,44,30,0.5)"; g.lineWidth = 3;
    for (const d of [-0.5, 0, 0.5]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a + d) * 14, y + Math.sin(a + d) * 14); g.stroke(); }
  }
});
const glowTex = () => ctex("eo_beam", 64, 256, (g) => {
  for (let y = 0; y < 256; y++) { const v = y / 255, a = Math.min(1, v * 5) * (1 - v) ** 0.6; g.fillStyle = `rgba(255,255,255,${(a * 0.9).toFixed(3)})`; g.fillRect(0, y, 64, 1); }
});
// ---- office paints ----
const floorTex = () => ctex("eo_floor", 1024, 1024, (g, r) => {
  const W = 1024, n = 8, step = W / n;
  for (let i = 0; i < n; i++) {
    const c = new THREE.Color("#9a6440").offsetHSL((r() - 0.5) * 0.02, 0, (r() - 0.5) * 0.08);
    g.fillStyle = "#" + c.getHexString(); g.fillRect(i * step, 0, step, W);
    for (let k = 0; k < 30; k++) { g.strokeStyle = `rgba(60,30,15,${0.1 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; const x = i * step + r() * step; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, W * 0.3, x - 8, W * 0.6, x + 4, W); g.stroke(); }
    g.fillStyle = "rgba(40,20,10,0.6)"; g.fillRect(i * step, 0, 4, W);
    const cut = r() * W; g.fillRect(i * step, cut, step, 3);
  }
});
const wallTex = () => ctex("eo_wall", 512, 512, (g, r) => {
  g.fillStyle = "#f0e4c8"; g.fillRect(0, 0, 512, 512);
  blobs(g, r, 512, 512, 40, ["rgba(200,180,140,0.25)", "rgba(255,250,235,0.3)"], 30, 120);
});
const waTex = () => ctex("eo_wamap", 1024, 1024, (g, r) => {
  const W = 1024, H = 1024;
  g.fillStyle = "#efe3c2"; g.fillRect(0, 0, W, H);
  blobs(g, r, W, H, 30, ["rgba(190,160,110,0.25)"], 40, 160);
  // sea
  g.fillStyle = "#9cc3d6"; g.fillRect(40, 130, W - 80, H - 200);
  const lon0 = 111, lon1 = 131, lat0 = -12.5, lat1 = -36;
  const P = (lo: number, la: number): P2 => [40 + ((lo - lon0) / (lon1 - lon0)) * (W - 80), 130 + ((la - lat0) / (lat1 - lat0)) * (H - 200)];
  // the rest of the continent (grey-green) east of the border
  g.fillStyle = "#d8d2b4"; g.beginPath(); g.moveTo(...P(129, -14.9)); g.lineTo(...P(130.2, -12.6)); g.lineTo(...P(131, -12.4)); g.lineTo(...P(131, -31.5)); g.lineTo(...P(129, -31.7)); g.closePath(); g.fill();
  const coast: P2[] = [[129, -14.9], [127.9, -14.5], [126.9, -13.8], [126.2, -14.2], [125.0, -14.6], [124.4, -15.4], [124.0, -16.2], [123.5, -16.7], [122.9, -16.4], [122.2, -17.2], [122.2, -18.2], [121.0, -19.5], [119.0, -20.0], [117.0, -20.6], [116.0, -20.9], [115.5, -21.5], [114.6, -21.8], [114.1, -21.8], [113.6, -23.0], [113.9, -24.4], [113.4, -25.5], [114.2, -26.4], [114.0, -27.0], [114.6, -28.7], [115.0, -30.5], [115.7, -31.9], [115.7, -33.3], [115.0, -33.6], [115.1, -34.3], [116.5, -35.0], [118.0, -35.0], [119.5, -34.4], [121.8, -33.9], [123.6, -33.9], [124.2, -33.0], [126.0, -32.3], [127.5, -32.1], [129, -31.7]];
  g.beginPath(); coast.forEach((p, i) => (i ? g.lineTo(...P(...p)) : g.moveTo(...P(...p)))); g.closePath();
  g.fillStyle = "#e9c486"; g.fill();
  g.strokeStyle = "#3a2a20"; g.lineWidth = 5; g.stroke();
  // wheatbelt shading
  g.save(); g.clip();
  g.fillStyle = "rgba(214,150,60,0.55)"; g.beginPath(); g.ellipse(...P(117.6, -31.2), 120, 190, -0.3, 0, TAU); g.fill();
  g.strokeStyle = "rgba(120,90,60,0.25)"; g.lineWidth = 2; // grid lines
  for (let lo = 114; lo <= 129; lo += 3) { g.beginPath(); g.moveTo(...P(lo, -12)); g.lineTo(...P(lo, -36)); g.stroke(); }
  for (let la = -15; la >= -35; la -= 4) { g.beginPath(); g.moveTo(...P(111, la)); g.lineTo(...P(131, la)); g.stroke(); }
  g.restore();
  g.setLineDash([14, 10]); g.strokeStyle = "#3a2a20"; g.lineWidth = 4; g.beginPath(); g.moveTo(...P(129, -14.9)); g.lineTo(...P(129, -31.7)); g.stroke(); g.setLineDash([]);
  // Perth + towns
  const dot = (lo: number, la: number, s: number, name: string, dx = 14) => {
    const [x, y] = P(lo, la); g.fillStyle = "#2a1c18"; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    g.font = "bold 26px Georgia, serif"; g.fillText(name, x + dx, y + 9);
  };
  dot(115.86, -31.95, 9, "PERTH", -120); dot(121.47, -30.75, 6, "KALGOORLIE"); dot(114.6, -28.77, 6, "GERALDTON"); dot(117.88, -35.02, 6, "ALBANY", -40);
  // the emu front: a cluster of red pins around Campion, circled in red pencil
  const [cx, cy] = P(118.4, -30.9);
  g.strokeStyle = "#c21e1e"; g.lineWidth = 6; g.beginPath(); g.ellipse(cx, cy, 95, 70, -0.2, 0.15, TAU + 0.35); g.stroke();
  for (let k = 0; k < 22; k++) {
    const x = cx + (r() - 0.5) * 140, y = cy + (r() - 0.5) * 100;
    g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.arc(x + 4, y + 5, 9, 0, TAU); g.fill();
    g.fillStyle = r() < 0.75 ? "#d42a2a" : "#2a58c4"; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - 3, y - 3, 3, 0, TAU); g.fill();
  }
  g.fillStyle = "#c21e1e"; g.font = "bold italic 40px Georgia, serif"; g.fillText("EMUS?!", cx + 70, cy - 70);
  // title cartouche
  g.fillStyle = "#3a2a20"; g.font = "bold 62px Georgia, serif"; g.textAlign = "center"; g.fillText("WESTERN AUSTRALIA", W / 2, 92);
  g.font = "28px Georgia, serif"; g.fillText("MILITARY DISTRICT  -  1932", W / 2, H - 28);
  g.strokeStyle = "#3a2a20"; g.lineWidth = 8; g.strokeRect(12, 12, W - 24, H - 24); g.lineWidth = 2; g.strokeRect(26, 26, W - 52, H - 52);
  // compass rose
  const [ox, oy] = [W - 150, H - 190];
  g.fillStyle = "#3a2a20"; g.beginPath(); g.moveTo(ox, oy - 60); g.lineTo(ox + 14, oy); g.lineTo(ox, oy + 60); g.lineTo(ox - 14, oy); g.closePath(); g.fill();
  g.font = "bold 30px Georgia, serif"; g.fillText("N", ox, oy - 70);
});
const ausFlagTex = () => ctex("eo_flag", 512, 256, (g) => {
  const W = 512, H = 256;
  g.fillStyle = "#1f2f7a"; g.fillRect(0, 0, W, H);
  // union canton (simplified)
  const cw = W / 2, ch = H / 2;
  g.save(); g.beginPath(); g.rect(0, 0, cw, ch); g.clip();
  g.strokeStyle = "#ffffff"; g.lineWidth = 26; g.beginPath(); g.moveTo(0, 0); g.lineTo(cw, ch); g.moveTo(cw, 0); g.lineTo(0, ch); g.stroke();
  g.strokeStyle = "#c8202f"; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(cw, ch); g.moveTo(cw, 0); g.lineTo(0, ch); g.stroke();
  g.fillStyle = "#ffffff"; g.fillRect(cw / 2 - 21, 0, 42, ch); g.fillRect(0, ch / 2 - 21, cw, 42);
  g.fillStyle = "#c8202f"; g.fillRect(cw / 2 - 12, 0, 24, ch); g.fillRect(0, ch / 2 - 12, cw, 24);
  g.restore();
  const star = (x: number, y: number, R: number, n: number) => { g.fillStyle = "#ffffff"; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? R * 0.45 : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
  star(cw / 2, ch + 64, 34, 7);
  star(W * 0.75, H * 0.8, 16, 7); star(W * 0.62, H * 0.47, 16, 7); star(W * 0.75, H * 0.16, 16, 7); star(W * 0.87, H * 0.4, 16, 7); star(W * 0.81, H * 0.55, 9, 5);
  for (let x = 0; x < W; x += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + 0.05 * Math.sin(x * 0.045)})`; g.fillRect(x, 0, 2, H); }
});
const outsideTex = () => ctex("eo_outside", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#7fb4ec"); gr.addColorStop(0.55, "#d6e6f4"); gr.addColorStop(0.62, "#e8c49a"); gr.addColorStop(0.64, "#d08856"); gr.addColorStop(1, "#c87444");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#b6a274"; for (let k = 0; k < 7; k++) { const x = r() * 512; g.beginPath(); g.ellipse(x, 330, 30 + r() * 30, 14, 0, Math.PI, 0); g.fill(); }
  g.fillStyle = "#7d8f5a"; g.beginPath(); g.ellipse(120, 300, 60, 40, 0, 0, TAU); g.fill(); g.fillStyle = "#e8e0d0"; g.fillRect(116, 300, 8, 30);
});
const paperTex = () => ctex("eo_papers", 512, 512, (g, r) => {
  g.fillStyle = "#f6efdc"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#2a2a3a"; g.font = "bold 40px Georgia, serif"; g.fillText("ORDERS", 30, 60);
  for (let y = 100; y < 490; y += 26) { g.fillStyle = "rgba(40,40,60,0.55)"; g.fillRect(30, y, 160 + r() * 280, 6); }
  g.strokeStyle = "#b22"; g.lineWidth = 6; g.beginPath(); g.arc(400, 420, 50, 0, TAU); g.stroke(); g.font = "bold 22px Georgia, serif"; g.fillStyle = "#b22"; g.fillText("URGENT", 356, 428);
});
const clockTex = () => ctex("eo_clock", 256, 256, (g) => {
  g.fillStyle = "#f8f2e0"; g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill();
  g.strokeStyle = "#2a1c18"; g.lineWidth = 10; g.stroke();
  g.fillStyle = "#2a1c18"; for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; g.fillRect(128 + Math.cos(a) * 96 - 4, 128 + Math.sin(a) * 96 - 4, 8, 8); }
});
const cabinetTex = () => ctex("eo_cabinet", 256, 512, (g) => {
  g.fillStyle = "#6f7a5a"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 4; i++) {
    const y = 12 + i * 125; g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 4; g.strokeRect(14, y, 228, 112);
    g.fillStyle = "#c9c2a4"; g.fillRect(98, y + 22, 60, 20); g.fillStyle = "#d8d0b0"; g.fillRect(100, y + 60, 56, 10); g.fillStyle = "#33301f"; g.fillRect(100, y + 70, 56, 6);
  }
});
const noticeTex = () => ctex("eo_notice", 512, 384, (g, r) => {
  g.fillStyle = "#a8794a"; g.fillRect(0, 0, 512, 384);
  for (let k = 0; k < 7; k++) {
    const x = 20 + (k % 4) * 120 + r() * 10, y = 20 + Math.floor(k / 4) * 180 + r() * 10, w = 100, h = 140;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate((r() - 0.5) * 0.15);
    g.fillStyle = k === 2 ? "#f3e0a0" : "#f6f0e0"; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = "rgba(40,40,50,0.6)"; for (let l = 0; l < 7; l++) g.fillRect(-w / 2 + 10, -h / 2 + 18 + l * 16, 50 + r() * 30, 4);
    if (k === 2) { g.fillStyle = "#3a2a20"; g.beginPath(); g.ellipse(0, 30, 22, 16, 0, 0, TAU); g.fill(); g.fillRect(-3, -10, 5, 30); g.beginPath(); g.arc(0, -14, 7, 0, TAU); g.fill(); }
    g.fillStyle = "#c22"; g.beginPath(); g.arc(0, -h / 2 + 8, 5, 0, TAU); g.fill();
    g.restore();
  }
});

// ======================================================================================================
// geometry helpers
// ======================================================================================================
const Y = V(0, 1, 0);
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, r1 = r) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r1, r, L, seg, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
};
const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => boxGeo(V(x0, y0, z0), V(x1, y1, z1));
const frame = (x: number, y: number, z: number, yaw: number) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
const sph = new THREE.SphereGeometry(1, 16, 11), sphLo = new THREE.SphereGeometry(1, 10, 7);
const lamC = (key: string, color: string, extra: THREE.MeshLambertMaterialParameters = {}) => lam("eo_" + key, () => ({ color, ...extra }));
const lamT = (key: string, map: THREE.Texture, color = "#ffffff", extra: THREE.MeshLambertMaterialParameters = {}) => lam("eo_" + key, () => ({ map, color, ...extra }));
/** a lumpy blob (smooth normals) for bushes / mounds */
const lumpGeo = (seed: number, q = 0) => {
  const g = new THREE.SphereGeometry(1, q ? 10 : 16, q ? 7 : 11), p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.12 * Math.sin(x * 4 + seed) * Math.cos(z * 3.6 + seed * 1.7) + 0.07 * Math.sin(y * 5 + seed * 2.3);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
};
const LUMPS = [0, 1, 2, 3].map((s) => lumpGeo(s * 1.9 + 0.4));
/** a ribbon (track / road) draped on the ground, uv: u across 0..1, v along (metres / vlen) */
const ribbon = (path: P2[], w: number, lift: number, vlen: number, step = 1.5) => {
  const curve = new THREE.CatmullRomCurve3(path.map(([x, z]) => V(x, 0, z)), false, "centripetal");
  const L = curve.getLength(), n = Math.max(4, Math.ceil(L / step)), NA = 5;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = curve.getPointAt(u), tg = curve.getTangentAt(u), sx = -tg.z, sz = tg.x, s = Math.hypot(sx, sz) || 1;
    for (let q = 0; q < NA; q++) {
      const k = -1 + (2 * q) / (NA - 1), x = p.x + (sx / s) * k * w / 2, z = p.z + (sz / s) * k * w / 2;
      pos.push(x, groundY(x, z) + lift, z); uv.push(q / (NA - 1), (u * L) / vlen);
    }
    if (i < n) for (let q = 0; q < NA - 1; q++) { const a = i * NA + q, c = a + NA; idx.push(a, c, a + 1, a + 1, c, c + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  if ((g.attributes.normal as THREE.BufferAttribute).getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; } g.setIndex(idx); g.computeVertexNormals(); }
  return g.toNonIndexed();
};
const ticks = (lo: number, hi: number, fine: [number, number, number][], coarse: number) => {
  const out: number[] = [];
  let v = lo;
  while (v < hi) {
    out.push(v);
    let st = coarse;
    for (const [a, b, s] of fine) { const d = v < a ? a - v : v > b ? v - b : 0; st = Math.min(st, s + d * 0.06); }
    v += Math.max(0.5, st);
  }
  out.push(hi);
  return out;
};

// ======================================================================================================
// wheat field: a dynamic carpet (top) + stalk skirt (sides), heights rebuilt when wheatAt changes
// ======================================================================================================
const STEP = 1.0, BURIED = -0.45;
class Wheat {
  top: THREE.Mesh; skirt: THREE.Mesh;
  private nx: number; private nz: number;
  private gy: Float32Array; private hTop: Float32Array; private thr: Float32Array;
  private ring: number[] = []; // top-vertex index for each skirt column
  constructor(f: { x0: number; x1: number; z0: number; z1: number }, parent: THREE.Object3D, topMat: THREE.Material, sideMat: THREE.Material) {
    const nx = (this.nx = Math.round((f.x1 - f.x0) / STEP) + 1), nz = (this.nz = Math.round((f.z1 - f.z0) / STEP) + 1);
    const N = nx * nz, pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), col = new Float32Array(N * 3);
    this.gy = new Float32Array(N); this.hTop = new Float32Array(N); this.thr = new Float32Array(N);
    const c = new THREE.Color(), gold = new THREE.Color("#fff4cc"), deep = new THREE.Color("#f6dc96"), green = new THREE.Color("#e6ecaa"), pale = new THREE.Color("#fffaea");
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, x = f.x0 + i * STEP, z = f.z0 + j * STEP;
      const clump = 0.5 + 0.5 * Math.sin(x * 2.3 + Math.sin(z * 1.7) * 2) * Math.sin(z * 2.1 + x * 0.6);
      const edge = i === 0 || j === 0 || i === nx - 1 || j === nz - 1;
      this.gy[k] = groundY(x, z);
      this.hTop[k] = WHEAT_H * (0.86 + 0.16 * clump + 0.06 * Math.sin(x * 0.21 + z * 0.17)) - (edge ? 0.05 + 0.1 * hh(k, 5) : 0);
      const north = clamp01((-z + 20) / 170), noise = 0.5 + 0.25 * Math.sin(x * 0.11 + 1.7) * Math.sin(z * 0.13 + 0.3) + 0.25 * Math.sin(x * 0.043 - z * 0.051 + 2);
      this.thr[k] = -0.06 + 0.62 * north + 0.6 * noise * (0.7 + 0.3 * hh(Math.floor(x / 3) * 1000 + Math.floor(z / 3), 9));
      pos[k * 3] = x; pos[k * 3 + 2] = z; uv[k * 2] = x / 2.5; uv[k * 2 + 1] = z / 2.5;
      const n1 = 0.5 + 0.5 * Math.sin(x * 0.05 + 0.4) * Math.sin(z * 0.06 + 1.2), n2 = 0.5 + 0.5 * Math.sin(x * 0.17 - z * 0.13);
      c.copy(gold).lerp(deep, n1 * 0.8).lerp(green, 0.25 * smooth((n2 - 0.6) / 0.4)).lerp(pale, 0.35 * smooth((0.3 - n2) / 0.3));
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx: number[] = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, cc = a + nx + 1, d = a + nx; idx.push(a, d, cc, a, cc, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    this.top = new THREE.Mesh(g, topMat); this.top.castShadow = true; this.top.receiveShadow = true; this.top.frustumCulled = false; this.top.matrixAutoUpdate = false;
    parent.add(this.top);
    // skirt: perimeter loop (counter-clockwise seen from above so faces point out)
    for (let i = 0; i < nx; i++) this.ring.push(i);                       // z0 edge (faces -z)
    for (let j = 1; j < nz; j++) this.ring.push(j * nx + nx - 1);         // x1 edge (faces +x)
    for (let i = nx - 2; i >= 0; i--) this.ring.push((nz - 1) * nx + i);  // z1 edge (faces +z)
    for (let j = nz - 2; j >= 0; j--) this.ring.push(j * nx);             // x0 edge (faces -x)
    const R = this.ring.length, sp = new Float32Array(R * 2 * 3), su = new Float32Array(R * 2 * 2), sidx: number[] = [];
    let run = 0;
    for (let q = 0; q < R; q++) {
      const k = this.ring[q], x = pos[k * 3], z = pos[k * 3 + 2];
      if (q) { const kp = this.ring[q - 1]; run += Math.hypot(x - pos[kp * 3], z - pos[kp * 3 + 2]); }
      sp[q * 6] = x; sp[q * 6 + 2] = z; sp[q * 6 + 3] = x; sp[q * 6 + 5] = z;
      su[q * 4] = run / 2; su[q * 4 + 1] = 0; su[q * 4 + 2] = run / 2; su[q * 4 + 3] = 1;
      if (q < R - 1) { const a = q * 2, b = a + 2; sidx.push(a, b, a + 1, a + 1, b, b + 1); }
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(sp, 3)); sg.setAttribute("uv", new THREE.BufferAttribute(su, 2)); sg.setIndex(sidx);
    this.skirt = new THREE.Mesh(sg, sideMat); this.skirt.castShadow = true; this.skirt.receiveShadow = true; this.skirt.frustumCulled = false; this.skirt.matrixAutoUpdate = false;
    parent.add(this.skirt);
    this.set(1);
  }
  set(w: number) {
    const p = this.top.geometry.attributes.position as THREE.BufferAttribute, a = p.array as Float32Array;
    for (let k = 0; k < this.gy.length; k++) {
      const e = smooth((w - this.thr[k]) / 0.14 + 0.5);
      a[k * 3 + 1] = this.gy[k] + lerp(BURIED, this.hTop[k], e);
    }
    p.needsUpdate = true; this.top.geometry.computeVertexNormals();
    const sp = this.skirt.geometry.attributes.position as THREE.BufferAttribute, s = sp.array as Float32Array;
    for (let q = 0; q < this.ring.length; q++) { const k = this.ring[q]; s[q * 6 + 1] = this.gy[k] + BURIED - 0.05; s[q * 6 + 4] = a[k * 3 + 1]; }
    sp.needsUpdate = true; this.skirt.geometry.computeVertexNormals();
  }
}

// ======================================================================================================
// Outback
// ======================================================================================================
type CamS = { x: number; y: number; z: number; lx: number; ly: number; lz: number };
export class Outback {
  root = new THREE.Group();
  private sets: Record<Place, THREE.Group> = { farm: new THREE.Group(), dam: new THREE.Group(), road: new THREE.Group(), office: new THREE.Group() };
  private cams: Record<Place, CamS[]> = { farm: [], dam: [], road: [], office: [] };
  private wheat: Wheat[] = []; private lastW = -1;
  private windWheel!: THREE.Group; private fan!: THREE.Group;
  private scorePosts!: THREE.Group; private bush13!: THREE.Group;
  private water!: THREE.Mesh;

  constructor() {
    for (const s of SHOTS) for (let f = s.a; f < s.b; f += 3) { const c = camAt(s.id, f); this.cams[s.place].push({ x: c.pos[0], y: c.pos[1], z: c.pos[2], lx: c.look[0], ly: c.look[1], lz: c.look[2] }); }
    for (const g of Object.values(this.sets)) this.root.add(g);
    this.buildFarm();
    this.buildDam();
    this.buildRoad();
    this.buildOffice();
  }

  /** true when a thing at (x, z) (radius rad, top height) would stand near one of the place's cameras or in its sight line */
  private blocks(pl: Place, x: number, z: number, top: number, rad: number) {
    for (const c of this.cams[pl]) {
      const d = Math.hypot(x - c.x, z - c.z);
      if (d < rad + 3) return true;
      const L = Math.hypot(c.lx - c.x, c.lz - c.z) || 1, ux = (c.lx - c.x) / L, uz = (c.lz - c.z) / L, t = (x - c.x) * ux + (z - c.z) * uz;
      if (t > 0 && t < L + 4) {
        const perp = Math.abs((x - c.x) * uz - (z - c.z) * ux);
        const lineY = c.y + (c.ly - c.y) * Math.min(1, t / L);
        if (perp < rad + 1.5 + t * 0.05 && top > lineY - 1.8) return true;
      }
    }
    return false;
  }

  // =============================== terrain ===============================
  private terrain(parent: THREE.Object3D, cx: number, cz: number, ext: number, fine: { x: [number, number, number][]; z: [number, number, number][] }, hf: (x: number, z: number) => number, cf: (x: number, z: number, h: number, c: THREE.Color) => void) {
    const XS = ticks(cx - ext, cx + ext, fine.x, 90), ZS = ticks(cz - ext, cz + ext, fine.z, 90), NX = XS.length, NZ = ZS.length;
    const pos = new Float32Array(NX * NZ * 3), uv = new Float32Array(NX * NZ * 2), col = new Float32Array(NX * NZ * 3), c = new THREE.Color();
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i, x = XS[i], z = ZS[j], h = hf(x, z);
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x / 9; uv[k * 2 + 1] = z / 9;
      cf(x, z, h, c); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx: number[] = [];
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, cc = a + NX + 1, d = a + NX; idx.push(a, d, cc, a, cc, b); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, lam("eo_ground", () => ({ map: dirtTex(), vertexColors: true })));
    m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false; m.frustumCulled = false;
    parent.add(m);
  }

  // =============================== shared scenery pieces ===============================
  private gum(b: Batch, x: number, z: number, h: number, seed: number, dead = false) {
    const r = rng(seed * 7 + 13), U = (a: number, c: number) => a + (c - a) * r();
    const y = groundY(x, z), bark = lamT("bark", barkTex(), dead ? "#c8c0b8" : "#ffffff");
    const leaves = [lamT("gumLeaf0", leafTex("eo_gl0", "#7f9a58")), lamT("gumLeaf1", leafTex("eo_gl1", "#8aa364")), lamT("gumLeaf2", leafTex("eo_gl2", "#6f8f5a"))];
    const lean = U(-0.08, 0.08) * h, lean2 = U(-0.08, 0.08) * h;
    const base = V(x, y - 0.2, z), fork = V(x + lean, y + U(0.38, 0.5) * h, z + lean2);
    const tr = 0.028 * h + 0.1;
    b.add(strut(base, fork, tr, 10, tr * 0.72), bark);
    b.add(new THREE.SphereGeometry(tr * 1.25, 10, 6).scale(1, 0.4, 1).translate(x, y, z), bark); // root flare
    const nl = 3 + Math.floor(r() * 2), a0 = r() * TAU;
    for (let i = 0; i < nl; i++) {
      const a = a0 + (i * TAU) / nl + U(-0.4, 0.4), rad = U(0.18, 0.3) * h, ty = U(0.7, 0.88) * h;
      const mid = V(fork.x + Math.cos(a) * rad * 0.45, y + (fork.y - y + ty) * 0.5 + 0.08 * h, fork.z + Math.sin(a) * rad * 0.45);
      const tip = V(fork.x + Math.cos(a) * rad, y + ty, fork.z + Math.sin(a) * rad);
      b.add(strut(fork, mid, tr * 0.6, 8, tr * 0.42), bark); b.add(strut(mid, tip, tr * 0.42, 7, tr * 0.22), bark);
      if (dead) { // bare twigs
        for (let k = 0; k < 3; k++) { const ka = a + U(-0.9, 0.9); b.add(strut(tip, tip.clone().add(V(Math.cos(ka) * 0.12 * h, U(0.05, 0.14) * h, Math.sin(ka) * 0.12 * h)), tr * 0.2, 5, tr * 0.06), bark); }
        continue;
      }
      const leaf = leaves[i % 3];
      for (let k = 0; k < 3; k++) {
        const s = U(0.09, 0.14) * h, ka = r() * TAU, kd = k ? U(0.06, 0.12) * h : 0;
        b.add(k % 2 ? sph : LUMPS[(seed + k) % 4], leaf, new THREE.Matrix4().compose(V(tip.x + Math.cos(ka) * kd, tip.y + U(-0.02, 0.05) * h, tip.z + Math.sin(ka) * kd), new THREE.Quaternion().setFromAxisAngle(Y, r() * TAU), V(s * 1.15, s * 0.62, s)));
      }
    }
    if (!dead) b.add(LUMPS[seed % 4], leaves[seed % 3], new THREE.Matrix4().compose(V(fork.x, y + 0.86 * h, fork.z), new THREE.Quaternion(), V(0.15 * h, 0.09 * h, 0.15 * h)));
  }
  private shrub(b: Batch, x: number, z: number, s: number, seed: number, kind: "salt" | "green" | "spin") {
    const r = rng(seed * 3 + 5), y = groundY(x, z);
    if (kind === "spin") { // spinifex hummock: a low spiky dome
      const m = lamT("spinifex", spinifexTex());
      b.add(LUMPS[seed % 4], m, new THREE.Matrix4().compose(V(x, y - 0.05 * s, z), new THREE.Quaternion().setFromAxisAngle(Y, r() * TAU), V(s, s * 0.5, s * (0.8 + r() * 0.3))));
      return;
    }
    const m = kind === "salt" ? [lamC("salt0", "#9aa684"), lamC("salt1", "#8d9c80")][seed % 2] : [lamC("scrub0", "#7c9450"), lamC("scrub1", "#6d8a4c"), lamC("scrub2", "#8ca05c")][seed % 3];
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const ka = (k / n) * TAU + r(), kd = k ? s * 0.55 : 0, kr = s * (k ? 0.5 + r() * 0.2 : 0.68);
      b.add(k % 2 ? sphLo : LUMPS[k % 4], m, new THREE.Matrix4().compose(V(x + Math.cos(ka) * kd, y + kr * 0.6, z + Math.sin(ka) * kd), new THREE.Quaternion().setFromAxisAngle(Y, r() * TAU), V(kr, kr * 0.78, kr)));
    }
  }
  private fenceLine(b: Batch, a: P2, c: P2, gap = 3.6) {
    const post = lamC("post", "#8a755e"), wire = lamC("wire", "#3a3634");
    const L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.max(1, Math.round(L / gap));
    const tops: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const x = lerp(a[0], c[0], i / n), z = lerp(a[1], c[1], i / n), y = groundY(x, z), big = i === 0 || i === n;
      const ph = big ? 1.35 : 1.2, pr = big ? 0.09 : 0.06, lean = (hh(i + Math.floor(x * 7), 3) - 0.5) * 0.06;
      b.add(strut(V(x, y - 0.2, z), V(x + lean, y + ph, z + lean * 0.5), pr, 6, pr * 0.85), post);
      tops.push(V(x + lean * 0.8, y, z + lean * 0.4));
    }
    for (const wy of [0.42, 0.76, 1.08]) for (let i = 0; i < n; i++) {
      const p0 = tops[i].clone().add(V(0, wy, 0)), p1 = tops[i + 1].clone().add(V(0, wy, 0));
      b.add(strut(p0, p0.clone().lerp(p1, 0.5).add(V(0, -0.035, 0)), 0.009, 4), wire);
      b.add(strut(p0.clone().lerp(p1, 0.5).add(V(0, -0.035, 0)), p1, 0.009, 4), wire);
    }
  }

  // =============================== FARM ===============================
  private buildFarm() {
    const G = this.sets.farm, b = new Batch();
    // ---- ground ----
    const red = new THREE.Color("#d08058"), deep = new THREE.Color("#bc6644"), grassC = new THREE.Color("#e4d49c"), sage = new THREE.Color("#b6b98a"), far = new THREE.Color("#c49a80");
    this.terrain(G, 0, -40, 3200, { x: [[-230, 230, 2]], z: [[-280, 200, 2]] }, farmH, (x, z, h, c) => {
      const n1 = 0.5 + 0.5 * Math.sin(x * 0.031 + Math.sin(z * 0.023) * 2) * Math.sin(z * 0.027 + 1), n2 = 0.5 + 0.5 * Math.sin(x * 0.0071 - z * 0.0083 + 2);
      c.copy(red).lerp(deep, 0.5 * n1);
      const grass = smooth((n2 - 0.22) / 0.3) * (1 - smooth((24 - Math.hypot(x + 10, z + 20)) / 14)) * 0.75;
      c.lerp(grassC, grass * 0.85).lerp(sage, grass * 0.35 * n1);
      c.lerp(sage, 0.25 * smooth(h / 8) * n1).lerp(grassC, 0.55 * smooth(h / 8) * (1 - smooth((Math.hypot(x, z) - 600) / 300)));
      c.lerp(far, smooth((Math.hypot(x, z) - 500) / 800) * 0.5);
    });
    // ---- wheat ----
    const topMat = lam("eo_wheatTopM", () => ({ map: wheatTopTex(), vertexColors: true }));
    const sideMat = lam("eo_wheatSideM", () => ({ map: wheatSideTex() }));
    const stub = new THREE.MeshLambertMaterial({ map: stubbleTex(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const stubM = twoTone(stub);
    for (const f of FIELDS) {
      this.wheat.push(new Wheat(f, G, topMat, sideMat));
      // stubble bed under the crop (follows the ground, lifted a hair, polygon offset)
      const pos: number[] = [], uv: number[] = [], idx: number[] = [], st = 2, nx = Math.ceil((f.x1 - f.x0 + 0.6) / st) + 1, nz = Math.ceil((f.z1 - f.z0 + 0.6) / st) + 1;
      for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = Math.min(f.x1 + 0.3, f.x0 - 0.3 + i * st), z = Math.min(f.z1 + 0.3, f.z0 - 0.3 + j * st); pos.push(x, groundY(x, z) + 0.02, z); uv.push(x / 4, z / 4); }
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; idx.push(a, a + nx, a + nx + 1, a, a + nx + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, stubM); m.receiveShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false; G.add(m);
      // post-and-wire fence 1.4 m outside
      const o = 1.4, A: P2 = [f.x0 - o, f.z0 - o], B: P2 = [f.x1 + o, f.z0 - o], C: P2 = [f.x1 + o, f.z1 + o], D: P2 = [f.x0 - o, f.z1 + o];
      for (const [p, q] of [[A, B], [B, C], [C, D], [D, A]] as [P2, P2][]) this.fenceLine(b, p, q);
    }
    // ---- red dirt tracks ----
    const tracks: P2[][] = [
      [[2, 260], [1, 120], [0, 40], [-1, 6], [-3, -20], [-10, -36], [-18, -42]],          // south road -> homestead yard
      [[-3, -20], [-6, -45], [-8, -60], [-6, -110], [-4, -170], [0, -300]],                // north past the windmill, over the hill
      [[-18, -42], [-40, -58], [-60, -66], [-120, -68], [-200, -66]],                       // west along the paddocks
      [[0, -6], [40, -8], [100, -8], [200, -10]],                                           // east between the fields
    ];
    const tg = mergeGeometries(tracks.map((p, i) => ribbon(p, i ? 3.6 : 4.4, 0.035, 8)), false);
    const tm = new THREE.Mesh(tg, twoTone(new THREE.MeshLambertMaterial({ map: roadTex("eo_track", false), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
    tm.receiveShadow = true; tm.matrixAutoUpdate = false; tm.frustumCulled = false; G.add(tm);
    // ---- homestead ----
    this.homestead(b);
    this.windmill(G, b);
    // ---- gum trees + scrub ----
    const gums: [number, number, number][] = [[-52, -22, 15], [-50, -58, 17], [-14, -70, 13], [-62, -40, 12], [22, -48, 0], [-34, 8, 14], [-80, -12, 18], [-26, -96, 16],
      [60, 14, 0], [-6, -132, 14], [160, -60, 18], [-190, 30, 16], [-110, -40, 13], [190, 60, 17], [-30, 150, 15], [-75, 140, 12], [80, -170, 15], [-120, -190, 16], [120, 170, 14], [-220, -100, 18]];
    let gi = 0;
    for (const [x, z, h0] of gums) {
      const h = h0 || 13 + hh(gi, 4) * 4, rad = 0.35 * h;
      gi++;
      if (FIELDS.some((f) => x > f.x0 - rad - 2 && x < f.x1 + rad + 2 && z > f.z0 - rad - 2 && z < f.z1 + rad + 2)) continue;
      if (this.blocks("farm", x, z, h, rad) || Math.hypot(x - SCORE[0], z - SCORE[2]) < 12 || Math.hypot(x, z) < 14) continue;
      this.gum(b, x, z, h, gi);
      FARM_KEEPOUT.push([x, z, 0.8]);
    }
    // gum belt along the far fence lines + scattered trees out on the plain and the hill
    const R = rng(4041);
    for (let i = 0, n = 0; i < 900 && n < 70; i++) {
      const x = (R() - 0.5) * 900, z = -40 + (R() - 0.5) * 760, d = Math.hypot(x, z + 40), h = 10 + R() * 9, rad = 0.35 * h;
      if (d < 90 || FIELDS.some((f) => x > f.x0 - rad - 3 && x < f.x1 + rad + 3 && z > f.z0 - rad - 3 && z < f.z1 + rad + 3)) continue;
      if (this.blocks("farm", x, z, groundY(x, z) + h, rad)) continue;
      this.gum(b, x, z, h, 100 + i); n++;
    }
    for (let i = 0, n = 0; i < 2000 && n < 160; i++) {
      const x = (R() - 0.5) * 600, z = -40 + (R() - 0.5) * 560, s = 0.35 + R() * 0.6;
      if (Math.hypot(x, z) < 16 || FIELDS.some((f) => x > f.x0 - 3 && x < f.x1 + 3 && z > f.z0 - 3 && z < f.z1 + 3)) continue;
      if (Math.hypot(x - HOMESTEAD[0], z - HOMESTEAD[2]) < 16 || Math.abs(x) < 4 || this.blocks("farm", x, z, groundY(x, z) + s, s)) continue;
      this.shrub(b, x, z, s, i, R() < 0.6 ? "salt" : "green"); n++;
    }
    b.build(G);
    // ---- SCORE: left clear for the props scoreboard ----
    this.scorePosts = new THREE.Group(); G.add(this.scorePosts);
    // (props builds the board on its own posts at SCORE: x +-1.65, z +-0.2; this set keeps SCORE x +-2.5 clear)
    // ---- shot 13 camouflage bush ----
    this.bush13 = new THREE.Group(); G.add(this.bush13);
    { const bb = new Batch(), m0 = lamC("bush13a", "#6f9050"), m1 = lamC("bush13b", "#7f9c58"), twig = lamC("twig", "#6a4a34");
      const fr = SHOT13_BUSH.front, bk = SHOT13_BUSH.back;
      const lob = (x: number, y: number, z: number, s: number, i: number) => bb.add(LUMPS[i % 4], i % 2 ? m0 : m1, new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(Y, i * 1.3), V(s, s * 0.85, s)));
      lob(fr[0], 0.5, fr[2], 0.62, 0); lob(fr[0] - 0.45, 0.4, fr[2] - 0.12, 0.48, 1); lob(fr[0] + 0.42, 0.38, fr[2] + 0.1, 0.45, 2); lob(fr[0] - 0.1, 0.82, fr[2] - 0.15, 0.36, 3);
      lob(bk[0], 0.75, bk[2], 0.8, 4); lob(bk[0] - 0.7, 0.55, bk[2] + 0.2, 0.6, 5); lob(bk[0] + 0.7, 0.6, bk[2] + 0.1, 0.62, 6); lob(bk[0] + 0.1, 1.15, bk[2] - 0.1, 0.45, 7);
      for (let k = 0; k < 6; k++) { const a = k * 1.1, x = fr[0] + Math.cos(a) * 0.4, z = fr[2] + Math.sin(a) * 0.3; bb.add(strut(V(x, 0.6, z), V(x + Math.cos(a) * 0.3, 1.0 + hh(k, 2) * 0.15, z + Math.sin(a) * 0.2), 0.012, 4), twig); }
      bb.build(this.bush13); }
  }

  private homestead(b: Batch) {
    const [hx, , hz] = HOMESTEAD, yaw = 0.61, M = frame(hx, 0, hz, yaw);
    const at = (x: number, y: number, z: number) => M.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z));
    const W = 12, D = 9, F = 0.6, WH = 3.0, hw = W / 2, hd = D / 2; // house body, floor height, wall height
    FARM_KEEPOUT.push([hx, hz, 17]); // shot 4 contract: no emus within 17 m of HOMESTEAD
    const wb = lamT("weatherboard", boardTex("eo_wb", "#f3ead2", "rgba(150,130,100,0.55)", 12), "#ffffff");
    const trim = lamC("trim", "#3f6b4a"), white = lamC("white", "#f6f2e8"), glass = lamC("glass", "#2b3a4c"), stump = lamC("stump", "#6a5a4a");
    const roofM = lamT("roofRed", corrTex("eo_corr", null), "#c0503e"), verM = lamT("verStripe", corrTex("eo_corrS", ["#c0503e", "#f2e8d6"]), "#ffffff");
    const brick = lamC("brick", "#a8543c"), deck = lamT("deck", boardTex("eo_deck", "#a87a52", "rgba(60,36,20,0.6)", 10), "#ffffff");
    // stumps + floor
    for (let i = -2; i <= 2; i++) for (const s of [-1, 1]) b.add(box(i * 2.6 - 0.12, -0.1, s * (hd - 0.3) - 0.12, i * 2.6 + 0.12, F, s * (hd - 0.3) + 0.12), stump, M);
    b.add(box(-hw - 0.05, F - 0.18, -hd - 0.05, hw + 0.05, F, hd + 0.05), lamC("bearer", "#7a6248"), M);
    // walls (weatherboard, tile 3 m)
    b.add(boxGeo(V(-hw, F, -hd), V(hw, F + WH, hd), 3), wb, M);
    // windows (dark pane proud of the wall, white frame proud of the pane, green shutters) + front door
    const win = (x: number, z: number, face: number, w = 1.2, h = 1.4) => { // face: 0 front(+z), 1 right(+x), 2 left(-x)
      const r = face === 0 ? 0 : face === 1 ? Math.PI / 2 : -Math.PI / 2, wm = M.clone().multiply(new THREE.Matrix4().makeTranslation(x, F + 1.0, z)).multiply(new THREE.Matrix4().makeRotationY(r));
      b.add(box(-w / 2, 0, 0, w / 2, h, 0.03), glass, wm);
      b.add(box(-w / 2 - 0.08, -0.08, 0, w / 2 + 0.08, 0, 0.07), white, wm); b.add(box(-w / 2 - 0.08, h, 0, w / 2 + 0.08, h + 0.1, 0.07), white, wm);
      b.add(box(-w / 2 - 0.08, 0, 0, -w / 2, h, 0.07), white, wm); b.add(box(w / 2, 0, 0, w / 2 + 0.08, h, 0.07), white, wm);
      b.add(box(-0.03, 0, 0.03, 0.03, h, 0.06), white, wm); b.add(box(-w / 2, h * 0.5 - 0.03, 0.03, w / 2, h * 0.5 + 0.03, 0.06), white, wm);
      for (const s of [-1, 1]) b.add(box(s * (w / 2 + 0.1) - (s > 0 ? 0 : 0.5), 0, 0.02, s * (w / 2 + 0.1) + (s > 0 ? 0.5 : 0), h, 0.06), trim, wm);
    };
    win(-3.6, hd, 0); win(3.6, hd, 0); win(hw, -1.5, 1); win(hw, 2.2, 1); win(-hw, 0, 2);
    { const dm = M.clone().multiply(new THREE.Matrix4().makeTranslation(0, F, hd));
      b.add(box(-0.55, 0, 0, 0.55, 2.2, 0.05), trim, dm); b.add(box(-0.65, 2.2, 0, 0.65, 2.32, 0.08), white, dm); b.add(box(-0.65, 0, 0, -0.55, 2.2, 0.08), white, dm); b.add(box(0.55, 0, 0, 0.65, 2.2, 0.08), white, dm);
      b.add(new THREE.SphereGeometry(0.05, 8, 6).translate(0.38, 1.05, 0.08), lamC("brass", "#d8b04a"), dm); }
    // hipped roof (corrugated red), eaves overhang
    { const e = 0.35, x0 = -hw - e, x1 = hw + e, z0 = -hd - e, z1 = hd + e, y0 = F + WH, rh = 2.3, rl = 2.2; // ridge half-length rl
      const P = (x: number, y: number, z: number) => V(x, y, z);
      const A = P(x0, y0, z0), B = P(x1, y0, z0), C = P(x1, y0, z1), Dd = P(x0, y0, z1), R0 = P(-rl, y0 + rh, 0), R1 = P(rl, y0 + rh, 0);
      const quadG = (a: THREE.Vector3, bq: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number, v: number) => {
        const g = new THREE.BufferGeometry(), n = new THREE.Vector3().subVectors(bq, a).cross(new THREE.Vector3().subVectors(d, a)).normalize();
        g.setAttribute("position", new THREE.Float32BufferAttribute([a, bq, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
        g.setAttribute("normal", new THREE.Float32BufferAttribute(Array(6).fill(0).flatMap(() => [n.x, n.y, n.z]), 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([0, v, u, v, u, 0, 0, v, u, 0, 0, 0], 2));
        return g;
      };
      const sl = Math.hypot(hd + e, rh);
      b.add(quadG(Dd, C, R1, R0, (x1 - x0) / 1.4, sl / 3), roofM, M);  // front slope
      b.add(quadG(B, A, R0, R1, (x1 - x0) / 1.4, sl / 3), roofM, M);  // back slope
      b.add(quadG(C, B, R1, R1, (z1 - z0) / 1.4, sl / 3), roofM, M);  // right hip (tri)
      b.add(quadG(A, Dd, R0, R0, (z1 - z0) / 1.4, sl / 3), roofM, M); // left hip (tri)
      b.add(strut(R0.clone().add(V(-0.1, 0.03, 0)), R1.clone().add(V(0.1, 0.03, 0)), 0.07, 8), lamC("ridgeCap", "#8c3a2e"), M);
      // fascia / gutter
      b.add(box(x0, y0 - 0.16, z1 - 0.02, x1, y0 + 0.02, z1 + 0.1), white, M); b.add(box(x1 - 0.02, y0 - 0.16, z0, x1 + 0.1, y0 + 0.02, z1), white, M);
      b.add(box(x0, y0 - 0.16, z0 - 0.1, x1, y0 + 0.02, z0 + 0.02), white, M); b.add(box(x0 - 0.1, y0 - 0.16, z0, x0 + 0.02, y0 + 0.02, z1), white, M);
      // chimney (brick) on the left
      b.add(box(-hw + 0.6, F + 1.5, -1.6, -hw + 1.5, y0 + rh + 0.9, -0.8), brick, M); b.add(box(-hw + 0.5, y0 + rh + 0.9, -1.7, -hw + 1.6, y0 + rh + 1.1, -0.7), lamC("chimCap", "#7a3a2a"), M);
    }
    // striped bullnose-ish verandah on the front + right side: deck, posts, rail, curved striped roof
    { const vd = 2.6, y0 = F + WH - 0.05, yl = F + 2.35;
      b.add(box(-hw - 0.3, F - 0.12, hd, hw + vd, F, hd + vd), deck, M);
      b.add(box(hw, F - 0.12, -hd - 0.3, hw + vd, F, hd), deck, M);
      const posts: [number, number][] = [];
      for (let x = -hw; x <= hw + vd + 0.01; x += (W + vd) / 6) posts.push([x - 0.1 * (x > hw ? 1 : 0), hd + vd - 0.15]);
      for (let z = hd + vd - 0.15 - (D + vd) / 5; z >= -hd - 0.2; z -= (D + vd) / 5) posts.push([hw + vd - 0.15, z]);
      for (const [x, z] of posts) b.add(box(x - 0.07, F, z - 0.07, x + 0.07, yl, z + 0.07), white, M);
      // rail + balusters along the front (gap at the door / steps)
      for (const [xa, xb] of [[-hw - 0.2, -1.0], [1.0, hw + vd - 0.15]]) {
        b.add(box(xa, F + 0.85, hd + vd - 0.19, xb, F + 0.92, hd + vd - 0.11), white, M);
        for (let x = xa + 0.15; x < xb; x += 0.22) b.add(box(x - 0.02, F, hd + vd - 0.17, x + 0.02, F + 0.85, hd + vd - 0.13), white, M);
      }
      b.add(box(hw + vd - 0.19, F + 0.85, -hd - 0.2, hw + vd - 0.11, F + 0.92, hd + vd - 0.15), white, M);
      for (let z = -hd; z < hd + vd - 0.3; z += 0.22) b.add(box(hw + vd - 0.17, F, z - 0.02, hw + vd - 0.13, F + 0.85, z + 0.02), white, M);
      // curved (bullnose) roof sheets: a quarter-ish curve from the wall line down to the beam
      const NS = 7, bull = (along: "x" | "z") => {
        const pos: number[] = [], uv: number[] = [], idx: number[] = [];
        const La = along === "x" ? W + vd + 0.6 : D + vd + 0.3, s0 = along === "x" ? -hw - 0.3 : -hd - 0.3;
        for (let i = 0; i <= NS; i++) {
          const u = i / NS, ang = u * Math.PI * 0.42, out = 0.15 + (vd + 0.15) * Math.sin(ang) / Math.sin(Math.PI * 0.42), yy = y0 - (y0 - yl) * (1 - Math.cos(ang)) / (1 - Math.cos(Math.PI * 0.42));
          for (const e of [0, 1]) {
            const a = s0 + e * La;
            if (along === "x") pos.push(Math.min(a, hw + out), yy, hd + out); else pos.push(hw + out, yy, Math.min(a, hd + out));
            uv.push(e * La / 1.4, u * 1.2);
          }
          if (i < NS) { const a = i * 2; along === "x" ? idx.push(a, a + 1, a + 3, a, a + 3, a + 2) : idx.push(a, a + 3, a + 1, a, a + 2, a + 3); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
        if ((g.attributes.normal as THREE.BufferAttribute).getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; } g.setIndex(idx); g.computeVertexNormals(); }
        return g;
      };
      b.add(bull("x"), verM, M); b.add(bull("z"), verM, M);
      b.add(box(-hw - 0.3, yl - 0.18, hd + vd - 0.2, hw + vd, yl, hd + vd - 0.08), white, M); // beam
      b.add(box(hw + vd - 0.2, yl - 0.18, -hd - 0.3, hw + vd - 0.08, yl, hd + vd), white, M);
      // steps
      for (let s = 0; s < 3; s++) b.add(box(-0.9, 0, hd + vd + s * 0.3, 0.9, F - 0.2 * s - 0.15, hd + vd + 0.3 + s * 0.3), deck, M);
    }
    // raised rainwater tank on a timber stand beside the house
    { const tx = -hw - 2.2, tz = -2.5, ty = 1.8;
      for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) b.add(box(tx + dx - 0.08, 0, tz + dz - 0.08, tx + dx + 0.08, ty, tz + dz + 0.08), stump, M);
      b.add(box(tx - 1.15, ty - 0.12, tz - 1.15, tx + 1.15, ty, tz + 1.15), lamC("bearer", "#7a6248"), M);
      this.tank(b, at(tx, ty, tz), 1.0, 1.7);
    }
  }
  /** corrugated tank (vertical ribs as real geometry) with a shallow cone roof; base at matrix origin */
  private tank(b: Batch, M: THREE.Matrix4, r: number, h: number) {
    const corr = lamT("tank", corrTex("eo_tankC", null), "#c4ccd0");
    const g = new THREE.CylinderGeometry(r, r, h, 96, 6, false), p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i), a = Math.atan2(z, x), k = 1 + 0.012 * Math.sin(y * 34) ; p.setXYZ(i, x * k, y, z * k); void a; }
    g.computeVertexNormals(); g.translate(0, h / 2, 0);
    const uv = g.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2 * Math.PI * r / 1.5, uv.getY(i));
    // ribs run horizontally on round tanks: rotate texture by using v for corrugation -> swap uv
    for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v * h * 6, u); }
    b.add(g, corr, M);
    b.add(new THREE.ConeGeometry(r * 1.06, r * 0.35, 48, 1, false).translate(0, h + r * 0.175, 0), corr, M);
    b.add(new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.08, 48).translate(0, h, 0), lamC("tankRim", "#9aa2a8"), M);
    b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12).translate(0, h + r * 0.38, 0), lamC("tankRim", "#9aa2a8"), M);
  }
  private windmill(G: THREE.Group, b: Batch) {
    const x = -8, z = -58, H = 10.5, yaw = 0.35;
    FARM_KEEPOUT.push([x, z, 3], [x + 4.2, z - 1.5, 3.2]);
    const steel = lamC("millSteel", "#8b949a"), blade = lamC("millBlade", "#dfe3e4"), tail = lamC("millTail", "#c0503e");
    const legs: THREE.Vector3[] = [];
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const a = V(x + dx * 1.5, -0.1, z + dz * 1.5), c = V(x + dx * 0.28, H, z + dz * 0.28);
      b.add(strut(a, c, 0.06, 6), steel); legs.push(a, c);
      b.add(box(a.x - 0.25, -0.1, a.z - 0.25, a.x + 0.25, 0.15, a.z + 0.25), lamC("footing", "#bdb6aa"));
    }
    // horizontal girts + diagonal braces per panel
    const L = (k: number, y: number) => { const a = legs[k * 2], c = legs[k * 2 + 1], u = (y + 0.1) / (H + 0.1); return a.clone().lerp(c, u); };
    const levels = [0.4, 3, 5.6, 8, H - 0.4];
    for (let li = 0; li < levels.length; li++) for (let k = 0; k < 4; k++) {
      const p0 = L(k, levels[li]), p1 = L((k + 1) % 4, levels[li]);
      b.add(strut(p0, p1, 0.03, 5), steel);
      if (li < levels.length - 1) { b.add(strut(p0, L((k + 1) % 4, levels[li + 1]), 0.02, 4), steel); }
    }
    b.add(box(x - 0.7, H - 0.1, z - 0.7, x + 0.7, H, z + 0.7), lamC("millDeck", "#7a6a58"));
    b.add(strut(V(x, H - 4, z), V(x, H + 0.6, z), 0.05, 6), steel); // pump rod
    // head: turntable + gearbox, wheel (rotates), tail vane
    const head = frame(x, H + 0.6, z, yaw);
    b.add(new THREE.CylinderGeometry(0.25, 0.3, 0.3, 12), steel, head);
    b.add(box(-0.25, 0.1, -0.5, 0.25, 0.6, 0.5), lamC("gearbox", "#6c757c"), head);
    b.add(box(-0.04, 0.3, -3.2, 0.04, 0.38, -0.4), steel, head);
    b.add(box(-0.03, -0.3, -3.9, 0.03, 1.3, -2.9), tail, head);
    this.windWheel = new THREE.Group();
    this.windWheel.position.copy(V(x, H + 0.95, z)).add(V(Math.sin(yaw) * 0.75, 0, Math.cos(yaw) * 0.75));
    this.windWheel.rotation.set(0, yaw, 0, "YXZ");
    { const wb = new Batch(), N = 18, R0 = 0.45, R1 = 1.9;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU, g = new THREE.BoxGeometry(0.34, R1 - R0, 0.02).translate(0, (R0 + R1) / 2, 0);
        g.rotateY(0.45); g.rotateZ(a);
        wb.add(g, blade);
      }
      for (const rr of [R0, R1 - 0.05, (R0 + R1) / 2]) wb.add(new THREE.TorusGeometry(rr, 0.025, 6, 48), steel);
      wb.add(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 12).rotateX(Math.PI / 2), steel);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; wb.add(strut(V(0, 0, 0), V(Math.cos(a) * R1, Math.sin(a) * R1, 0), 0.02, 4), steel); }
      wb.build(this.windWheel); }
    G.add(this.windWheel);
    // ground tank by the windmill + trough
    this.tank(b, frame(x + 4.2, 0, z - 1.5, 0), 2.3, 2.2);
    b.add(box(x + 1.0, 0, z + 2.2, x + 4.2, 0.55, z + 2.9), lamC("trough", "#9aa2a8"));
    b.add(box(x + 1.1, 0.5, z + 2.3, x + 4.1, 0.52, z + 2.8), lamC("troughWater", "#5f8a9a"));
  }

  // =============================== DAM ===============================
  private buildDam() {
    const G = this.sets.dam, b = new Batch(), [dx, , dz] = DAM;
    const red = new THREE.Color("#d08058"), deep = new THREE.Color("#bc6242"), mud = new THREE.Color("#8a5a44"), wet = new THREE.Color("#6a4a3c"), green = new THREE.Color("#b4b46a"), far = new THREE.Color("#c8805e");
    this.terrain(G, dx, dz, 3200, { x: [[dx - 120, dx + 120, 1]], z: [[dz - 120, dz + 120, 1]] }, damH, (x, z, h, c) => {
      const lx = x - dx, lz = z - dz, r = Math.hypot(lx, lz), R = damShore(Math.atan2(lz, lx));
      const n1 = 0.5 + 0.5 * Math.sin(x * 0.031 + Math.sin(z * 0.023) * 2) * Math.sin(z * 0.027 + 1);
      c.copy(red).lerp(deep, 0.5 * n1);
      c.lerp(green, 0.45 * smooth((r - R - 3) / 6) * (1 - smooth((r - R - 30) / 25)) * (0.5 + 0.5 * n1));
      c.lerp(mud, smooth((R + 4 - r) / 4)); c.lerp(wet, smooth((R - 0.5 - r) / 1.5));
      c.lerp(far, smooth((r - 400) / 800) * 0.5);
    });
    // dried-mud bank decal (footprints + cracks) as a ring just above the ground
    { const pos: number[] = [], uv: number[] = [], idx: number[] = [], NA = 160, NR = 6;
      for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) {
        const a = (i / NA) * TAU, R = damShore(a), r = R - 1.5 + (j / NR) * 7.5, x = dx + Math.cos(a) * r, z = dz + Math.sin(a) * r;
        pos.push(x, groundY(x, z) + 0.025, z); uv.push(x / 5, z / 5);
      }
      for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i; idx.push(a, a + NA + 1, a + NA + 2, a, a + NA + 2, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      if ((g.attributes.normal as THREE.BufferAttribute).getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const k = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = k; } g.setIndex(idx); g.computeVertexNormals(); }
      const al = new Float32Array((NA + 1) * (NR + 1) * 3); // fade the decal at its outer rim via vertex colour toward the ground tone
      for (let j = 0; j <= NR; j++) for (let i = 0; i <= NA; i++) { const k = j * (NA + 1) + i, v = 0.55 + 0.25 * (j / NR); al[k * 3] = 0.78 * v / 0.8; al[k * 3 + 1] = 0.52 * v / 0.8; al[k * 3 + 2] = 0.42 * v / 0.8; }
      g.setAttribute("color", new THREE.BufferAttribute(al, 3));
      const m = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ map: mudTex(), vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
      m.receiveShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false; m.renderOrder = 1; G.add(m);
    }
    // water
    { const g = new THREE.CircleGeometry(16.5, 96).rotateX(-Math.PI / 2).translate(dx, DAM_WATER_Y, dz);
      const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 14, p.getZ(i) / 14);
      const t = waterTex(); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      this.water = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ map: t, color: "#d6eef2" }), 1.5));
      this.water.receiveShadow = true; this.water.castShadow = false; this.water.matrixAutoUpdate = false; this.water.frustumCulled = false; G.add(this.water);
    }
    // reeds at the water's edge
    const reed = [lamC("reed0", "#7c8a44"), lamC("reed1", "#9a8c4a")], head = lamC("reedHead", "#6a4430");
    for (let k = 0; k < 16; k++) {
      const a = hh(k, 31) * TAU, R = damShore(a) - 1.4 - hh(k, 32) * 1.5, x = dx + Math.cos(a) * R, z = dz + Math.sin(a) * R;
      if (this.blocks("dam", x, z, 1.6, 1)) continue;
      for (let s = 0; s < 9; s++) {
        const sx = x + (hh(k * 9 + s, 33) - 0.5) * 1.2, sz = z + (hh(k * 9 + s, 34) - 0.5) * 1.2, h = 1.2 + hh(k * 9 + s, 35) * 0.9, l = (hh(k * 9 + s, 36) - 0.5) * 0.3;
        b.add(strut(V(sx, DAM_WATER_Y - 0.2, sz), V(sx + l, DAM_WATER_Y + h, sz + l * 0.5), 0.022, 5, 0.006), reed[s % 2]);
        if (s % 3 === 0) b.add(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6).translate(sx + l * 0.85, DAM_WATER_Y + h * 0.82, sz + l * 0.42), head);
      }
    }
    // the hide bush (dense, round, a few twigs) + its neighbours
    { const hbx = HIDE_BUSH.x, hbz = HIDE_BUSH.z, m = [lamC("hide0", "#6f8f4c"), lamC("hide1", "#7d9a52"), lamC("hide2", "#64844a")];
      const lobes: [number, number, number, number][] = [[0, 0.75, 0, 0.85], [-0.75, 0.55, 0.15, 0.62], [0.78, 0.52, -0.1, 0.64], [0.2, 1.05, -0.25, 0.5], [-0.35, 0.95, -0.35, 0.48], [0.1, 0.5, -0.6, 0.6], [-0.2, 0.45, 0.5, 0.5]];
      lobes.forEach(([lx, ly, lz, s], i) => b.add(LUMPS[i % 4], m[i % 3], new THREE.Matrix4().compose(V(hbx + lx * 0.5, ly * 0.95, hbz + lz * 0.5), new THREE.Quaternion().setFromAxisAngle(Y, i), V(s * 0.72, s * 0.82, s * 0.72))));
      for (let k = 0; k < 7; k++) { const a = k * 0.9 + 0.3, x = hbx + Math.cos(a) * 0.4, z = hbz + Math.sin(a) * 0.35; b.add(strut(V(x, 0.85, z), V(x + Math.cos(a) * 0.2, 1.3 + hh(k, 8) * 0.12, z + Math.sin(a) * 0.18), 0.014, 4), lamC("twig", "#6a4a34")); }
    }
    // gum trees (living + skeleton), scrub, spinifex
    const R = rng(5150);
    const trees: [number, number, number, boolean][] = [[dx + 40, dz - 32, 16, false], [dx + 22, dz - 46, 13, true], [dx - 48, dz - 18, 15, false], [dx + 55, dz + 20, 14, false], [dx - 8, dz + 48, 12, true], [dx + 70, dz - 60, 18, false], [dx - 70, dz - 55, 17, false]];
    trees.forEach(([x, z, h, dead], i) => { if (!this.blocks("dam", x, z, h, 0.35 * h) && Math.hypot(x - dx, z - dz) > damShore(Math.atan2(z - dz, x - dx)) + 8) this.gum(b, x, z, h, 300 + i, dead); });
    for (let i = 0, n = 0; i < 1500 && n < 50; i++) {
      const a = R() * TAU, d = 40 + R() ** 1.5 * 500, x = dx + Math.cos(a) * d, z = dz + Math.sin(a) * d, h = 9 + R() * 9;
      if (this.blocks("dam", x, z, groundY(x, z) + h, 0.35 * h)) continue;
      this.gum(b, x, z, h, 400 + i, R() < 0.2); n++;
    }
    for (let i = 0, n = 0; i < 3000 && n < 220; i++) {
      const a = R() * TAU, d = damShore(a) + 6 + R() ** 1.3 * 300, x = dx + Math.cos(a) * d, z = dz + Math.sin(a) * d, s = 0.3 + R() * 0.6;
      if (Math.hypot(x - HIDE_BUSH.x, z - HIDE_BUSH.z) < 5 || this.blocks("dam", x, z, groundY(x, z) + s, s)) continue;
      // keep the flock's ring around the water (r < shore + 60 on the camera side) mostly clear: only low spinifex there
      const nearRing = d < damShore(a) + 60, kind = nearRing ? "spin" : R() < 0.5 ? "salt" : R() < 0.5 ? "green" : "spin";
      if (nearRing && R() < 0.7) continue;
      this.shrub(b, x, z, kind === "spin" ? s * 0.9 : s, i, kind); n++;
    }
    b.build(G);
  }

  // =============================== ROAD ===============================
  private buildRoad() {
    const G = this.sets.road, b = new Batch(), [rx, , rz] = ROAD;
    const red = new THREE.Color("#d07850"), deep = new THREE.Color("#b85c3a"), spin = new THREE.Color("#dcc888"), far = new THREE.Color("#c27a5a");
    this.terrain(G, 500, rz, 3400, { x: [[-700, 1700, 2]], z: [[rz - 60, rz + 60, 2]] }, roadH, (x, z, h, c) => {
      const n1 = 0.5 + 0.5 * Math.sin(x * 0.029 + Math.sin(z * 0.021) * 2) * Math.sin(z * 0.033 + 1), n2 = 0.5 + 0.5 * Math.sin(x * 0.0081 - z * 0.0067 + 2);
      c.copy(red).lerp(deep, 0.45 * n1).lerp(spin, 0.5 * smooth((n2 - 0.4) / 0.3) * smooth((Math.abs(z - rz) - 6) / 6));
      c.lerp(far, smooth((Math.abs(z - rz) - 500) / 900) * 0.5);
    });
    // the road: one straight corrugated ribbon + a darker wheel-worn centre, verge windrows of loose dirt (painted)
    { const g = ribbon([[rx - 700, rz], [rx + 1700, rz]], 2 * ROAD_HALF, 0.04, 9, 2);
      const m = new THREE.Mesh(g, twoTone(new THREE.MeshLambertMaterial({ map: roadTex("eo_road", true), polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 })));
      m.receiveShadow = true; m.matrixAutoUpdate = false; m.frustumCulled = false; G.add(m); }
    // telegraph line on the far (-z) side: poles every 55 m, crossarm, insulators, 4 sagging wires
    { const pole = lamC("tPole", "#8a6a4c"), ins = lamC("insul", "#f2f0ea"), wire = lamC("tWire", "#2a2626"), zP = rz - 11;
      const tops: THREE.Vector3[][] = [];
      for (let x = rx - 640; x <= rx + 1700; x += 55) {
        const xx = x + (hh(x, 1) - 0.5) * 3, h = 7.2, lean = (hh(x, 2) - 0.5) * 0.25, y = groundY(xx, zP);
        b.add(strut(V(xx, y - 0.3, zP), V(xx + lean, y + h, zP), 0.13, 8, 0.1), pole);
        b.add(box(xx + lean - 0.07, y + h - 0.6, zP - 1.1, xx + lean + 0.07, y + h - 0.46, zP + 1.1), pole);
        const row: THREE.Vector3[] = [];
        for (const dzz of [-0.95, -0.4, 0.4, 0.95]) { const p = V(xx + lean, y + h - 0.32, zP + dzz); b.add(new THREE.CylinderGeometry(0.035, 0.05, 0.16, 8).translate(p.x, p.y - 0.06, p.z), ins); row.push(p); }
        tops.push(row);
      }
      for (let i = 0; i < tops.length - 1; i++) for (let k = 0; k < 4; k++) {
        const a = tops[i][k], c = tops[i + 1][k], S = 10; let prev = a;
        for (let s = 1; s <= S; s++) { const u = s / S, p = a.clone().lerp(c, u).add(V(0, -0.9 * 4 * u * (1 - u), 0)); b.add(strut(prev, p, 0.012, 4), wire); prev = p; }
      }
    }
    // termite mounds, scrub, spinifex, mulga trees
    const R = rng(6262), mound = lamT("mound", dirtTex(), "#c86a3e"), mound2 = lamT("mound2", dirtTex(), "#b45a34");
    const moundGeo = (seed: number) => {
      const pts: THREE.Vector2[] = [], N = 12;
      for (let i = 0; i <= N; i++) { const u = i / N, r = (1 - u) ** 0.8 * (0.5 + 0.08 * Math.sin(u * 17 + seed)) + 0.04; pts.push(new THREE.Vector2(Math.max(0.02, r), u)); }
      const g = new THREE.LatheGeometry(pts, 14), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + 0.18 * Math.sin(Math.atan2(z, x) * 3 + seed + y * 4) * (1 - y); p.setXYZ(i, x * k, y, z * k); }
      g.computeVertexNormals(); return g;
    };
    const mg = [0, 1, 2, 3].map((s) => moundGeo(s * 2.1));
    const clearCam = (x: number, z: number) => (z > rz + ROAD_HALF && z < rz + 30 && x > rx - 120 && x < rx + 420) || (z > rz - 14 && z < rz && x > rx - 30 && x < rx + 32); // camera side + the waving rows (z-5.6 / z-8.6, x -7..10): kept clear
    for (let i = 0, n = 0; i < 4000 && n < 140; i++) {
      const side = R() < 0.5 ? -1 : 1, x = rx - 650 + R() * 2300, z = rz + side * (ROAD_HALF + 6 + R() ** 1.6 * 320), h = 1.2 + R() ** 1.5 * 2.8;
      if (clearCam(x, z) || this.blocks("road", x, z, groundY(x, z) + h, h * 0.45)) continue;
      const y = groundY(x, z), m = n % 3 ? mound : mound2, yaw = R() * TAU;
      b.add(mg[n % 4], m, new THREE.Matrix4().compose(V(x, y - 0.1, z), new THREE.Quaternion().setFromAxisAngle(Y, yaw), V(h * 0.42, h, h * 0.42)));
      if (h > 2) { const sx = x + Math.cos(yaw) * h * 0.22, sz = z + Math.sin(yaw) * h * 0.22, s2 = h * 0.62; b.add(mg[(n + 1) % 4], m, new THREE.Matrix4().compose(V(sx, y - 0.1, sz), new THREE.Quaternion().setFromAxisAngle(Y, yaw + 1), V(s2 * 0.4, s2, s2 * 0.4))); }
      n++;
    }
    for (let i = 0, n = 0; i < 9000 && n < 900; i++) {
      const side = R() < 0.5 ? -1 : 1, x = rx - 680 + R() * 2380, z = rz + side * (ROAD_HALF + 1.2 + R() ** 1.4 * 360), s = 0.3 + R() * 0.55;
      const kind = R() < 0.62 ? "spin" : R() < 0.6 ? "salt" : "green";
      if (z < rz && z > rz - 14 && x > rx - 30 && x < rx + 32) continue;
      if ((kind !== "spin" || s > 0.6) && clearCam(x, z)) continue;
      if (this.blocks("road", x, z, groundY(x, z) + s, s)) continue;
      this.shrub(b, x, z, s, i, kind); n++;
    }
    for (let i = 0, n = 0; i < 2000 && n < 60; i++) {
      const side = R() < 0.5 ? -1 : 1, x = rx - 650 + R() * 2300, z = rz + side * (ROAD_HALF + 14 + R() ** 1.3 * 500), h = 5 + R() * 6;
      if (clearCam(x, z) || this.blocks("road", x, z, groundY(x, z) + h, 0.35 * h)) continue;
      this.gum(b, x, z, h, 700 + i, R() < 0.12); n++;
    }
    b.build(G);
  }

  // =============================== OFFICE ===============================
  private buildOffice() {
    const G = this.sets.office, b = new Batch(), [ox, , oz] = OFFICE;
    const X0 = ox - 3.3, X1 = ox + 3.4, Z0 = oz - 2.7, Z1 = oz + 3.6, HT = 3.3;
    const O = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(ox + x, y, oz + z);
    // floor (boards) + skirting + walls (cream upper, green dado) + picture rail; walls that would block the sun don't cast
    const floor = lamT("floor", floorTex()), wall = lamT("wall", wallTex(), "#ffffff"), dado = lamC("dado", "#5c7a5a"), rail = lamC("rail", "#6a4630");
    { const g = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
      const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 2.4, p.getZ(i) / 2.4);
      b.add(g, floor); }
    const nb = new Batch(); // non-shadow-casting room shell (back, right, front walls, ceiling)
    const cast = new Batch(); // the window wall casts (window light patch)
    const wallBox = (bb: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => bb.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), 2), m);
    // back wall (z = Z0)
    wallBox(nb, X0, 0, Z0 - 0.2, X1, HT, Z0, wall);
    wallBox(nb, X0, 0, Z0, X1, 1.0, Z0 + 0.03, dado); wallBox(nb, X0, 1.0, Z0, X1, 1.06, Z0 + 0.05, rail); wallBox(nb, X0, 2.62, Z0, X1, 2.68, Z0 + 0.05, rail);
    // right wall (x = X1) + front wall (z = Z1)
    wallBox(nb, X1, 0, Z0, X1 + 0.2, HT, Z1, wall); wallBox(nb, X1 - 0.03, 0, Z0, X1, 1.0, Z1, dado); wallBox(nb, X1 - 0.05, 1.0, Z0, X1, 1.06, Z1, rail);
    wallBox(nb, X0, 0, Z1, X1, HT, Z1 + 0.2, wall); wallBox(nb, X0, 0, Z1 - 0.03, X1, 1.0, Z1, dado);
    // ceiling (pressed-metal white) — never casts
    wallBox(nb, X0 - 0.2, HT, Z0 - 0.2, X1 + 0.2, HT + 0.1, Z1 + 0.2, lamC("ceiling", "#f4efe2"));
    wallBox(nb, X0, HT - 0.12, Z0, X1, HT, Z0 + 0.12, rail);
    // left wall (x = X0) with a window opening z in [WZ0, WZ1], y in [WY0, WY1]; taller than the room so the sun can't skim over
    const WZ0 = oz - 1.9, WZ1 = oz + 0.1, WY0 = 0.95, WY1 = 2.45, TOP = HT + 2.5;
    wallBox(cast, X0 - 0.25, 0, Z0 - 0.2, X0, TOP, WZ0, wall); wallBox(cast, X0 - 0.25, 0, WZ1, X0, TOP, Z1 + 0.2, wall);
    wallBox(cast, X0 - 0.25, 0, WZ0, X0, WY0, WZ1, wall); wallBox(cast, X0 - 0.25, WY1, WZ0, X0, TOP, WZ1, wall);
    wallBox(nb, X0, 0, Z0, X0 + 0.03, 1.0, WZ0, dado); wallBox(nb, X0, 0, WZ1, X0 + 0.03, 1.0, Z1, dado); wallBox(nb, X0, 0, WZ0, X0 + 0.03, WY0 - 0.06, WZ1, dado);
    // window frame + sash bars (cast: they print bars into the light patch) + sill
    const wf = lamC("winFrame", "#f4f0e4");
    wallBox(cast, X0 - 0.22, WY0 - 0.08, WZ0 - 0.06, X0 + 0.1, WY0, WZ1 + 0.06, wf); // sill
    wallBox(cast, X0 - 0.2, WY1, WZ0 - 0.06, X0 + 0.04, WY1 + 0.08, WZ1 + 0.06, wf);
    wallBox(cast, X0 - 0.2, WY0, WZ0 - 0.06, X0 + 0.04, WY1, WZ0, wf); wallBox(cast, X0 - 0.2, WY0, WZ1, X0 + 0.04, WY1, WZ1 + 0.06, wf);
    wallBox(cast, X0 - 0.14, (WY0 + WY1) / 2 - 0.03, WZ0, X0 - 0.08, (WY0 + WY1) / 2 + 0.03, WZ1, wf);
    for (const zz of [WZ0 + (WZ1 - WZ0) / 3, WZ0 + (2 * (WZ1 - WZ0)) / 3]) wallBox(cast, X0 - 0.14, WY0, zz - 0.02, X0 - 0.08, WY1, zz + 0.02, wf);
    // outside: a bright painted backdrop (sky + red plain) beyond the glass
    { const g = new THREE.PlaneGeometry(7, 5).rotateY(Math.PI / 2).translate(X0 - 3.2, 1.9, (WZ0 + WZ1) / 2);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: outsideTex(), color: new THREE.Color(1.25, 1.2, 1.12), fog: false }));
      m.layers.set(NOINK); m.matrixAutoUpdate = false; m.frustumCulled = false; G.add(m);
      // dusty sunbeam from the window (additive, no ink)
      const dir = V(1, -0.53, -0.12).normalize(), L = 3.2, corners = [V(X0, WY0, WZ0), V(X0, WY0, WZ1), V(X0, WY1, WZ1), V(X0, WY1, WZ0)];
      const pos: number[] = [], uv: number[] = [];
      for (let i = 0; i < 4; i++) {
        const a = corners[i].clone().add(V(ox * 0, 0, 0)), c = corners[(i + 1) % 4].clone();
        const a2 = a.clone().addScaledVector(dir, L), c2 = c.clone().addScaledVector(dir, L);
        for (const p of [a, c, c2, a, c2, a2]) pos.push(p.x, Math.max(0.02, p.y), p.z);
        uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
      }
      const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); bg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      const t = glowTex(); const bm = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.2, 0.17, 0.11), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      // uv.y runs along the beam: rotate the gradient so it fades away from the window
      const u2 = bg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < u2.count; i += 6) { const s = [0, 0, 1, 0, 1, 1]; for (let k = 0; k < 6; k++) u2.setXY(i + k, 0.5, 1 - s[k] * 0.9 - 0.05); }
      bm.layers.set(NOINK); bm.matrixAutoUpdate = false; bm.frustumCulled = false; bm.renderOrder = 4; G.add(bm);
    }
    // ---- furniture ----
    const wood = lamC("deskWood", "#7a4a2c"), woodD = lamC("deskWoodD", "#5e3820"), leather = lamC("blotter", "#3f5a3a"), brass = lamC("brass", "#d8b04a");
    { const { w, d, top } = DESK, dz = DESK.z - oz;
      b.add(box(-w / 2, top - 0.05, dz - d / 2, w / 2, top, dz + d / 2), wood, O(0, 0, 0));
      b.add(box(-w / 2 + 0.02, 0.1, dz + d / 2 - 0.06, w / 2 - 0.02, top - 0.05, dz + d / 2 - 0.02), woodD, O(0, 0, 0)); // modesty panel (front, camera side)
      for (const sx of [-1, 1]) { // pedestals with drawers
        const x0 = sx < 0 ? -w / 2 + 0.02 : w / 2 - 0.44, x1 = x0 + 0.42;
        b.add(box(x0, 0, dz - d / 2 + 0.03, x1, top - 0.05, dz + d / 2 - 0.03), wood, O(0, 0, 0));
        for (let k = 0; k < 3; k++) { const y = 0.12 + k * 0.2; b.add(box(x0 + 0.05, y, dz + d / 2 - 0.03, x1 - 0.05, y + 0.16, dz + d / 2 + 0.0), woodD, O(0, 0, 0)); b.add(box(x0 + 0.16, y + 0.07, dz + d / 2, x1 - 0.16, y + 0.09, dz + d / 2 + 0.025), brass, O(0, 0, 0)); }
      }
      b.add(box(-0.45, top, dz - 0.25, 0.25, top + 0.01, dz + 0.2), leather, O(0, 0, 0));
      { const g = new THREE.PlaneGeometry(0.3, 0.4).rotateX(-Math.PI / 2).rotateY(0.25).translate(ox - 0.15, top + 0.016, oz + dz); b.add(g, lamT("papers", paperTex())); }
      b.add(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 12).translate(ox - 0.6, top + 0.03, oz + dz - 0.2), lamC("ink", "#1e2230"));
      b.add(strut(V(ox - 0.58, top + 0.05, oz + dz - 0.2), V(ox - 0.5, top + 0.2, oz + dz - 0.24), 0.006, 4), lamC("quill", "#e8e0d0"));
      // stack of files
      for (let k = 0; k < 4; k++) b.add(box(-0.72, top + k * 0.035, dz + 0.05, -0.38, top + k * 0.035 + 0.03, dz + 0.3), [lamC("f0", "#c9a66a"), lamC("f1", "#8a5a3a"), lamC("f2", "#b8b090")][k % 3], O(0.02 * (k % 2), 0, 0));
      // chair behind the desk
      const cz = -0.45; b.add(box(-0.25, 0.45, cz - 0.22, 0.25, 0.5, cz + 0.22), wood, O(0, 0, 0)); b.add(box(-0.25, 0.5, cz - 0.24, 0.25, 1.05, cz - 0.2), wood, O(0, 0, 0));
      for (const [lx, lz] of [[-0.22, cz - 0.2], [0.22, cz - 0.2], [-0.22, cz + 0.2], [0.22, cz + 0.2]]) b.add(box(lx - 0.025, 0, lz - 0.025, lx + 0.025, 0.45, lz + 0.025), woodD, O(0, 0, 0));
    }
    // wall map of WA (framed) on the back wall, behind and left of the desk
    { const mw = 1.5, mh = 1.5, mx = -1.25, my = 1.95, z = Z0 - oz + 0.05;
      b.add(box(mx - mw / 2 - 0.06, my - mh / 2 - 0.06, z - 0.03, mx + mw / 2 + 0.06, my + mh / 2 + 0.06, z + 0.02), lamC("mapFrame", "#4a2e1c"), O(0, 0, 0));
      const g = new THREE.PlaneGeometry(mw, mh).translate(ox + mx, my, oz + z + 0.03); b.add(g, lamT("waMap", waTex()));
      // a few real pin heads standing off the map
      const R = rng(88);
      for (let k = 0; k < 7; k++) b.add(new THREE.SphereGeometry(0.018, 8, 6).translate(ox + mx - 0.05 + (R() - 0.5) * 0.22, my - 0.18 + (R() - 0.5) * 0.16, oz + z + 0.06), lamC("pin", "#d42a2a"));
      // noticeboard to the right of the map
      b.add(box(0.15, 1.3, z - 0.02, 1.05, 2.0, z + 0.02), lamC("cork", "#7a5232"), O(0, 0, 0));
      b.add(new THREE.PlaneGeometry(0.82, 0.62).translate(ox + 0.6, 1.65, oz + z + 0.03), lamT("notice", noticeTex()));
      // wall clock above
      b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 32).rotateX(Math.PI / 2).translate(ox + 0.6, 2.42, oz + z + 0.0), lamC("clockRim", "#4a2e1c"));
      b.add(new THREE.CircleGeometry(0.15, 32).translate(ox + 0.6, 2.42, oz + z + 0.03), lamT("clockFace", clockTex()));
      b.add(box(-0.006, 0, 0, 0.006, 0.1, 0.01).rotateZ(-0.6).translate(ox + 0.6, 2.42, oz + z + 0.035), lamC("hand", "#1a1a1a"));
      b.add(box(-0.006, 0, 0, 0.006, 0.07, 0.01).rotateZ(2.2).translate(ox + 0.6, 2.42, oz + z + 0.035), lamC("hand", "#1a1a1a"));
    }
    // flag on a pole in the back-left corner (folds as geometry)
    { const fx = X0 + 0.45, fz = Z0 + 0.45;
      b.add(strut(V(fx, 0, fz), V(fx, 2.5, fz), 0.022, 8), lamC("flagPole", "#6a4630"));
      b.add(new THREE.SphereGeometry(0.05, 10, 8).translate(fx, 2.53, fz), brass);
      b.add(new THREE.CylinderGeometry(0.18, 0.22, 0.06, 16).translate(fx, 0.03, fz), woodD);
      const g = new THREE.PlaneGeometry(0.95, 0.5, 16, 6), p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.475, y = p.getY(i); p.setXYZ(i, x, y - 0.45 * x * x * 0.4 - x * 0.12, 0.06 * Math.sin(x * 9) * x + 0.02 * y); }
      g.computeVertexNormals();
      b.add(g, lam("eo_flagM", () => ({ map: ausFlagTex(), side: THREE.DoubleSide })), new THREE.Matrix4().makeRotationY(-0.9).setPosition(fx + 0.02, 2.2, fz + 0.02));
    }
    // filing cabinet (right of the noticeboard) + a hat stand with a slouch hat
    { b.add(box(1.25, 0, Z0 - oz + 0.02, 1.8, 1.35, Z0 - oz + 0.67), lamT("cabinet", cabinetTex()), O(0, 0, 0));
      b.add(box(1.3, 1.35, Z0 - oz + 0.1, 1.72, 1.4, Z0 - oz + 0.55), lamC("cabTop", "#5c664a"), O(0, 0, 0));
      const hx = 2.6, hz = -1.6;
      b.add(strut(V(ox + hx, 0, oz + hz), V(ox + hx, 1.8, oz + hz), 0.025, 8), woodD);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU; b.add(strut(V(ox + hx, 0.02, oz + hz), V(ox + hx + Math.cos(a) * 0.3, 0.02, oz + hz + Math.sin(a) * 0.3), 0.02, 5), woodD); b.add(strut(V(ox + hx, 1.65, oz + hz), V(ox + hx + Math.cos(a + 1) * 0.18, 1.75, oz + hz + Math.sin(a + 1) * 0.18), 0.012, 5), woodD); }
      b.add(new THREE.CylinderGeometry(0.2, 0.24, 0.03, 20).translate(ox + hx, 1.8, oz + hz), lamC("hatBrim", "#8a7550"));
      b.add(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 16).translate(ox + hx, 1.87, oz + hz), lamC("hatBrim", "#8a7550"));
      b.add(new THREE.CylinderGeometry(0.132, 0.132, 0.03, 16).translate(ox + hx, 1.83, oz + hz), lamC("hatBand", "#3a3a2a"));
      // rug under the desk
      const rug = new THREE.CircleGeometry(1, 40).scale(1.5, 1, 1).rotateX(-Math.PI / 2).translate(ox, 0.012, oz + 0.2);
      b.add(rug, twoTone(new THREE.MeshLambertMaterial({ color: "#8a3a30", polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })));
    }
    // ceiling fan + pendant lamp
    this.fan = new THREE.Group(); this.fan.position.set(ox + 0.3, HT - 0.55, oz + 0.6); G.add(this.fan);
    { const fb = new Batch(), m = lamC("fanWood", "#5a3a22"), mt = lamC("fanMetal", "#9a8a6a");
      fb.add(new THREE.CylinderGeometry(0.1, 0.13, 0.16, 16), mt);
      for (let k = 0; k < 4; k++) { const g = new THREE.BoxGeometry(0.62, 0.015, 0.14).translate(0.42, -0.02, 0); g.rotateX(0.12); g.rotateY((k / 4) * TAU); fb.add(g, m); }
      fb.build(this.fan); }
    b.add(strut(V(ox + 0.3, HT - 0.47, oz + 0.6), V(ox + 0.3, HT, oz + 0.6), 0.015, 6), lamC("fanMetal", "#9a8a6a"));
    b.build(G); nb.build(G, false); cast.build(G, true);
  }

  // =============================== per frame ===============================
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    const s = SHOTS[id - 1];
    for (const k of Object.keys(this.sets) as Place[]) this.sets[k].visible = k === s.place;
    if (s.place === "farm") {
      const w = wheatAt(id, t);
      if (Math.abs(w - this.lastW) > 1e-5) { for (const f of this.wheat) f.set(w); this.lastW = w; }
      this.windWheel.rotation.z = -t * 2.4;
      this.scorePosts.visible = id === 17;
      this.bush13.visible = id === 13;
    } else if (s.place === "dam") {
      const m = this.water.material as THREE.MeshLambertMaterial;
      if (m.map) m.map.offset.set(t * 0.012, t * 0.007);
    } else if (s.place === "office") {
      this.fan.rotation.y = t * 3.2;
    }
  }
}
void FARM;
