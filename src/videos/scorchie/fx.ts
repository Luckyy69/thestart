// Effect drawings for the scorchie short (Canvas2D through the bridge Pen): pan + egg, clock, magnifying glass, leaf,
// plastic bag, heat shimmer, hot-spot glow texture, painted glass curtain wall.
import * as THREE from "three";
import { Pen, INK } from "../bridge/toon";
import { ctex } from "../bridge/paint";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;

/** frying pan seen from the front-above on a 500 x 260 canvas; egg 0 none, 1 raw, 2 frying (white set, bubbles) */
export const fxPan = (p: Pen, egg: number, sizzle: number) => {
  p.stroke([[300, 150], [490, 120]], 30, INK);
  p.stroke([[305, 150], [486, 121]], 20, "#3b2a22");
  p.ell(170, 150, 160, 70, "#2d3038", 8);
  p.ell(170, 142, 140, 56, "#474b56", 0);
  if (egg >= 1) {
    const wob = egg >= 2 ? 1.0 : 0.85;
    const pts: P2[] = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = 62 + 10 * Math.sin(a * 3 + 1) + 6 * Math.sin(a * 5); pts.push([165 + r * Math.cos(a) * wob, 142 + r * 0.42 * Math.sin(a)]); }
    p.poly(pts, egg >= 2 ? "#ffffff" : "rgba(240,240,225,0.9)", 4);
    p.ell(160, 136, 26, 17, "#ffb81c", 4);
    p.ell(154, 131, 8, 5, "#fff1b8", 0);
    if (egg >= 2) for (let i = 0; i < 6; i++) {
      const x = 120 + ((i * 37 + sizzle * 90) % 100), y = 125 + (i % 3) * 14;
      p.ell(x, y, 5, 3, "rgba(255,255,255,0.9)", 2);
    }
  }
};

/** street clock face on a 320 x 320 canvas, hour/minute hands */
export const fxClock = (p: Pen, hour: number) => {
  p.ell(160, 160, 150, 150, "#2b3a4a", 8);
  p.ell(160, 160, 128, 128, "#fbf6e8", 5);
  for (let i = 0; i < 12; i++) { const a = rad(i * 30); p.stroke([[160 + 104 * Math.sin(a), 160 - 104 * Math.cos(a)], [160 + 118 * Math.sin(a), 160 - 118 * Math.cos(a)]], i % 3 ? 5 : 10, INK); }
  const ah = rad((hour % 12) * 30), am = rad((hour % 1) * 360);
  p.stroke([[160, 160], [160 + 62 * Math.sin(ah), 160 - 62 * Math.cos(ah)]], 14, INK);
  p.stroke([[160, 160], [160 + 98 * Math.sin(am), 160 - 98 * Math.cos(am)]], 8, INK);
  p.dot(160, 160, 12, "#c0353a");
};

/** magnifying glass on a 420 x 420 canvas (lens top-left, handle to the bottom-right) */
export const fxMagnifier = (p: Pen) => {
  p.stroke([[250, 250], [395, 395]], 46, INK);
  p.stroke([[255, 255], [390, 390]], 32, "#8a4b2a");
  p.ell(165, 165, 140, 140, "#d9a441", 10);
  p.ell(165, 165, 118, 118, "rgba(190,230,255,0.55)", 6);
  p.ell(125, 120, 38, 22, "rgba(255,255,255,0.8)", 0, 0, 360, -40);
};

/** a leaf on a 260 x 160 canvas, burn 0..1 (brown scorch grows from the focus point) */
export const fxLeaf = (p: Pen, burn: number) => {
  const pts: P2[] = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24, a = u * Math.PI; pts.push([30 + 200 * u, 80 - 52 * Math.sin(a)]); }
  for (let i = 24; i >= 0; i--) { const u = i / 24, a = u * Math.PI; pts.push([30 + 200 * u, 80 + 46 * Math.sin(a)]); }
  p.poly(pts, "#6fb53f", 6);
  p.stroke([[22, 84], [228, 80]], 6, "#3f7a2a");
  if (burn > 0) {
    p.ell(140, 78, 10 + 40 * burn, 8 + 30 * burn, "#8a5a2c", 0);
    p.ell(140, 78, 4 + 22 * burn, 3 + 16 * burn, "#2a1a12", 0);
  }
};

/** plastic newspaper bag on a 260 x 260 canvas, droop 0 (fresh) .. 1 (melted puddle) */
export const fxBag = (p: Pen, droop: number) => {
  const d = droop, pts: P2[] = [];
  const top = 40 + 140 * d, w = 70 + 60 * d;
  pts.push([130 - w * 0.55, top], [130 - w * 0.35, top - 18 * (1 - d)], [130 + w * 0.35, top - 18 * (1 - d)], [130 + w * 0.55, top]);
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([130 + w * (0.55 + 0.25 * Math.sin(u * Math.PI)) * Math.cos(u * Math.PI * 0.5), top + (220 - top) * Math.sin(u * Math.PI * 0.5)]); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; pts.push([130 - w * (0.55 + 0.25 * Math.sin(u * Math.PI)) * Math.cos(u * Math.PI * 0.5) + 10 * d * Math.sin(u * 9), top + (220 - top) * Math.sin(u * Math.PI * 0.5)]); }
  p.poly(pts, "#cfe3f2", 6);
  if (d < 0.6) p.stroke([[110, top + 40], [150, top + 40]], 8, "#3f6fb5");
  if (d > 0.3) for (let i = 0; i < 3; i++) p.ell(80 + i * 50, 226, 14, 6, "#b8cfe0", 3);
};

/** rising heat shimmer: three wavy strokes on a 300 x 400 canvas, phase u */
export const fxHeat = (p: Pen, u: number) => {
  for (let k = 0; k < 3; k++) {
    const x0 = 70 + k * 80, pts: P2[] = [];
    for (let i = 0; i <= 16; i++) { const y = 380 - i * 22; pts.push([x0 + 16 * Math.sin(i * 0.9 + u * 6.28 + k), y]); }
    p.line(pts, "rgba(255,255,255,0.75)", 9, false);
  }
};

/** comic "!" pop on a 200 x 300 canvas */
export const fxBang = (p: Pen) => {
  p.poly([[70, 20], [140, 20], [120, 200], [90, 200]], "#ffd84a", 8);
  p.ell(105, 255, 26, 26, "#ffd84a", 8);
};

/** hot spot: soft radial glow (white core) */
export const spotTex = () => ctex("hotspot", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,240,1)"); gr.addColorStop(0.35, "rgba(255,240,190,0.85)");
  gr.addColorStop(0.7, "rgba(255,200,120,0.3)"); gr.addColorStop(1, "rgba(255,180,100,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

/** curtain-wall glass: sky-blue panes, slim white mullions every 1.5 m, darker spandrels at each floor (4 x 3.4 m tile) */
export const glassTex = (key: string, pane: string, sky: string, frame = "#e9eef5") => ctex("glass" + key, 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, sky); gr.addColorStop(1, pane);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) { // painted sky reflections
    g.fillStyle = `rgba(255,255,255,${0.08 + 0.1 * r()})`;
    const x = r() * 512, w = 30 + r() * 80;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 120, 512); g.lineTo(x - 120, 512); g.fill();
  }
  g.fillStyle = "rgba(30,40,70,0.55)"; g.fillRect(0, 440, 512, 72); // spandrel
  g.fillStyle = frame;
  for (let x = 0; x < 512; x += 192) g.fillRect(x, 0, 10, 512);
  g.fillRect(0, 436, 512, 8);
  g.fillStyle = "rgba(20,20,30,0.85)"; g.fillRect(0, 506, 512, 6);
});
export const repeatTex = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.needsUpdate = true; return t; };

/** looping steam/smoke puff on a 300 x 300 canvas: like fxPuff but born transparent (sin envelope), so the loop
 *  wrap is invisible (fxPuff restarts at full opacity: a visible pop every cycle). a = overall opacity 0..1 */
export const fxSteam = (p: Pen, t: number, a = 1) => {
  const env = Math.sin(Math.PI * t) * a;
  for (let i = 0; i < 5; i++) {
    const ang = rad(160 + i * 55), d = 30 + 80 * t, r = (26 + 22 * (i % 2)) * (0.6 + 0.6 * t);
    p.ell(150 + d * Math.cos(ang), 200 - 90 * t + d * 0.45 * Math.sin(ang), r, r * 0.8, `rgba(238,232,220,${(0.85 * env).toFixed(3)})`, 0);
  }
};

/** London shop front, 1024 x 384 for an ~8.6 x 3.2 m ground floor: fascia band with an abstract logo (no text),
 *  big display windows with goods, a recessed door, pilasters and a stall riser. kind picks the palette. */
export const shopTex = (kind: number) => ctex("shop" + kind, 1024, 384, (g, r) => {
  const P = [
    { fascia: "#1f4a3a", trim: "#d9b34a", goods: ["#e2453c", "#f3d35a", "#3f6fb5", "#f4f1ea"] },   // green grocer
    { fascia: "#7a1f2b", trim: "#e9d9b0", goods: ["#c9862f", "#f4e3c0", "#8a4b2a", "#d9a441"] },   // bakery
    { fascia: "#1d2a4a", trim: "#c9ced6", goods: ["#5a8fc2", "#c25a7a", "#f4f1ea", "#2f5f6a"] },   // boutique
    { fascia: "#2b2b30", trim: "#e7c64a", goods: ["#e7c64a", "#b5653f", "#7b5ac9", "#f7f3ea"] },   // newsagent
    { fascia: "#6a3a1f", trim: "#f0e2c8", goods: ["#3b5b9a", "#d9a441", "#e2453c", "#f7f3ea"] },   // cafe
  ][kind % 5];
  g.fillStyle = "#e9e1d0"; g.fillRect(0, 0, 1024, 384);                     // stone surround
  g.fillStyle = P.fascia; g.fillRect(0, 18, 1024, 78);                       // fascia
  g.fillStyle = P.trim; g.fillRect(0, 18, 1024, 6); g.fillRect(0, 90, 1024, 6);
  // abstract logo: a roundel + bars (reads as a sign, never as text)
  g.beginPath(); g.arc(512, 57, 26, 0, 7); g.fill();
  g.fillStyle = P.fascia; g.beginPath(); g.arc(512, 57, 15, 0, 7); g.fill();
  g.fillStyle = P.trim; for (const s of [-1, 1]) { g.fillRect(512 + s * 60 - (s < 0 ? 180 : 0), 50, 180, 14); }
  // windows + door
  const win = (x0: number, x1: number) => {
    g.fillStyle = P.fascia; g.fillRect(x0 - 8, 110, x1 - x0 + 16, 262);
    const gr = g.createLinearGradient(0, 118, 0, 300); gr.addColorStop(0, "#3a4f6a"); gr.addColorStop(1, "#1d2636");
    g.fillStyle = gr; g.fillRect(x0, 118, x1 - x0, 182);
    for (let k = 0; k < 3; k++) { // shelves of goods
      const y = 170 + k * 44; g.fillStyle = "#c9b48e"; g.fillRect(x0 + 6, y + 26, x1 - x0 - 12, 5);
      for (let x = x0 + 12; x < x1 - 24; x += 18 + r() * 16) { g.fillStyle = P.goods[Math.floor(r() * 4)]; const h = 14 + r() * 14; g.fillRect(x, y + 26 - h, 12 + r() * 8, h); }
    }
    g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(x0 + 20, 118); g.lineTo(x0 + 70, 118); g.lineTo(x0 + 10, 300); g.lineTo(x0, 300); g.lineTo(x0, 160); g.fill();
    g.fillStyle = P.trim; for (let x = x0; x <= x1; x += (x1 - x0) / 3) g.fillRect(x - 2, 118, 4, 182);
    g.fillStyle = P.fascia; g.fillRect(x0, 300, x1 - x0, 72);                // stall riser
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x0 + 10, 310, x1 - x0 - 20, 52);
  };
  win(40, 420); win(604, 984);
  g.fillStyle = P.fascia; g.fillRect(452, 110, 120, 274);
  g.fillStyle = "#2a3346"; g.fillRect(466, 126, 92, 150);
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(472, 132, 20, 138);
  g.fillStyle = P.trim; g.beginPath(); g.arc(540, 320, 6, 0, 7); g.fill();
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 376, 1024, 8);
});

/** awning stripes, 256 x 128 */
export const awningTex = (a: string, b: string) => ctex("awn" + a + b, 256, 128, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 128); }
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 112, 256, 16);
});

/** vehicle side windows strip, 512 x 128: dark glass with a sky reflection band */
export const busWinTex = () => ctex("busWin", 512, 128, (g) => {
  g.fillStyle = "#f2e9d6"; g.fillRect(0, 0, 512, 128);
  for (let x = 8; x < 512; x += 64) {
    const gr = g.createLinearGradient(0, 14, 0, 114); gr.addColorStop(0, "#8fb4d8"); gr.addColorStop(0.45, "#2f425c"); gr.addColorStop(1, "#1b2434");
    g.fillStyle = gr; g.fillRect(x, 14, 52, 100);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(x + 6, 18, 8, 92);
  }
});

/** painted HD asphalt: two-lane road tile (12 m across, 12 m along), patches, cracks, worn markings */
export const roadHD = () => ctex("roadHD", 1024, 1024, (g, r) => {
  g.fillStyle = "#5b5f6c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "70,74,88" : "98,100,112"},${0.35 + r() * 0.3})`; const w = 60 + r() * 220; g.fillRect(r() * 1024, r() * 1024, w, 40 + r() * 120); }
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "15,15,25"},${0.04 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 5, 2 + r() * 4); }
  g.strokeStyle = "rgba(25,25,35,0.35)"; g.lineWidth = 2;
  for (let i = 0; i < 10; i++) { g.beginPath(); let x = r() * 1024, y = r() * 1024; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = "#f2efe4"; g.fillRect(0, 502, 560, 20);                           // centre dash
  g.fillStyle = "rgba(242,239,228,0.25)"; g.fillRect(560, 502, 60, 20);
  g.fillStyle = "#e7c64a"; for (const y of [966, 990]) g.fillRect(0, y, 1024, 12); // double yellow, south kerb
  g.fillStyle = "#e7c64a"; for (const y of [34, 58]) g.fillRect(0, y, 1024, 12);   // and north kerb
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, 1004, 1024, 20); g.fillRect(0, 0, 1024, 20); // gutters
});

/** pool water: turquoise with painted caustic web and sparkles, 1024 x 1024 */
export const poolTex = () => ctex("poolHD", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#1fb6d0"); gr.addColorStop(1, "#46d6e4");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  g.strokeStyle = "rgba(220,255,255,0.45)"; g.lineWidth = 5; g.lineJoin = "round";
  for (let i = 0; i < 70; i++) {
    const cx = r() * 1024, cy = r() * 1024, n = 5 + Math.floor(r() * 3), rr = 30 + r() * 40;
    g.beginPath();
    for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2 + r() * 0.4, R = rr * (0.7 + r() * 0.5); const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a); if (k) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(255,255,255,0.85)"; g.fillRect(r() * 1024, r() * 1024, 10 + r() * 14, 3); }
  g.strokeStyle = "rgba(10,70,110,0.35)"; g.lineWidth = 4; // lane tiles seen through the water
  for (let x = 0; x < 1024; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
});

/** wide soft halo for the hot spot (a second, bigger additive layer) */
export const haloTex = () => ctex("halo", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,210,140,0.9)"); gr.addColorStop(0.4, "rgba(255,170,90,0.45)"); gr.addColorStop(1, "rgba(255,140,60,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

/** vertical beam gradient (bright at the ground, fading up) for the light shaft planes, 64 x 256 */
export const shaftTex = () => ctex("shaft", 64, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
  const gx = g.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(0.5, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)");
  g.globalCompositeOperation = "destination-out"; g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
});
