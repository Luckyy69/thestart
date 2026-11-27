// OWNER: hq. Hand-painted canvas textures for BRAIN HQ (hq.ts): pink wrinkly brain tissue, honey floor planks,
// walnut wainscot, the round rug, CRT screens, plaques ("MOUTH", "FOREHEAD", "PAIN REPORTS"), the "DAYS WITHOUT
// BRAIN FREEZE: 0" sign, the iris frames and the painted park seen through the eye windows.
import { ctex } from "../bridge/paint";

type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
export const otxt = (g: G, s: string, x: number, y: number, px: number, col: string, ink: string, lw: number) => {
  g.font = `bold ${Math.round(px)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; if (lw > 0) { g.strokeStyle = ink; g.lineWidth = lw; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y);
};
const noise = (g: G, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
/** soft radial blot, wrapped so the tile stays seamless */
const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W: number, H: number) => {
  for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

/** pink BRAIN TISSUE: soft lobes, meandering sulci (crimson grooves with a light lip), glossy speckles; seamless */
export const tissueTex = () => ctex("hqTissue", 1024, 1024, (g, r) => {
  const W = 1024;
  g.fillStyle = "#fac8c0"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 70; i++) blot(g, r() * W, r() * W, 60 + r() * 140, r() < 0.5 ? "255,226,200" : "236,160,164", 0.2, W, W);
  // sulci: random-walk meanders, drawn 9x (wrapped) so the tile is seamless
  const paths: [number, number][][] = [];
  for (let i = 0; i < 46; i++) {
    let x = r() * W, y = r() * W, a = r() * Math.PI * 2, da = 0;
    const p: [number, number][] = [[x, y]], n = 26 + Math.floor(r() * 30);
    for (let k = 0; k < n; k++) { da = da * 0.75 + (r() - 0.5) * 0.9; a += da; x += Math.cos(a) * 11; y += Math.sin(a) * 11; p.push([x, y]); }
    paths.push(p);
  }
  const stroke = (col: string, lw: number, dx: number, dy: number) => {
    g.strokeStyle = col; g.lineWidth = lw; g.lineCap = "round"; g.lineJoin = "round";
    for (const p of paths) for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
      g.beginPath(); p.forEach(([x, y], k) => (k ? g.lineTo(x + ox + dx, y + oy + dy) : g.moveTo(x + ox + dx, y + oy + dy))); g.stroke();
    }
  };
  stroke("rgba(255,214,224,0.75)", 15, -3, -4);   // the lit lip of each fold
  stroke("rgba(214,110,140,0.8)", 9, 1, 2);        // the groove
  stroke("rgba(160,60,96,0.6)", 3, 1, 2);        // its dark core
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,240,244,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(r() * W, r() * W, 1.5 + r() * 3, 0, 7); g.fill(); }
  noise(g, W, W, r, 9000, 0.03);
});
/** honey oak floor planks (1 m tile, 8 boards) */
export const floorTex = () => ctex("hqFloor", 1024, 1024, (g, r) => {
  const cols = ["#d9924e", "#cf8645", "#e09c58", "#c97f40", "#d68e4c"];
  for (let i = 0; i < 8; i++) {
    const x = i * 128;
    let y = -r() * 600;
    while (y < 1024) {
      const L = 380 + r() * 420;
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, 128, L);
      for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(120,60,20,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const gx = x + 8 + r() * 112; g.moveTo(gx, y); g.bezierCurveTo(gx + 6, y + L * 0.3, gx - 6, y + L * 0.6, gx + 3, y + L); g.stroke(); }
      g.fillStyle = "rgba(90,40,15,0.75)"; g.fillRect(x, y + L - 3, 128, 3);
      y += L;
    }
    g.fillStyle = "rgba(90,40,15,0.8)"; g.fillRect(x, 0, 3, 1024);
    g.fillStyle = "rgba(255,220,170,0.25)"; g.fillRect(x + 3, 0, 3, 1024);
  }
  noise(g, 1024, 1024, r, 12000, 0.03);
});
/** walnut wainscot boards with a highlight bevel (1 m tile) */
export const wainTex = () => ctex("hqWain", 512, 512, (g, r) => {
  g.fillStyle = "#8a4a2c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) {
    const x = i * 128;
    g.fillStyle = i % 2 ? "#96522f" : "#8c4b2b"; g.fillRect(x + 10, 30, 108, 452);
    g.strokeStyle = "rgba(255,200,150,0.35)"; g.lineWidth = 4; g.strokeRect(x + 12, 32, 104, 448);
    g.strokeStyle = "rgba(50,20,10,0.6)"; g.lineWidth = 3; g.strokeRect(x + 8, 28, 112, 456);
    for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(60,25,10,${0.12 + r() * 0.1})`; g.lineWidth = 2; g.beginPath(); const gx = x + 20 + r() * 88; g.moveTo(gx, 34); g.bezierCurveTo(gx + 8, 180, gx - 8, 330, gx, 478); g.stroke(); }
  }
  noise(g, 512, 512, r, 4000, 0.03);
});
/** round rug: concentric retro rings */
export const rugTex = () => ctex("hqRug", 512, 512, (g, r) => {
  g.clearRect(0, 0, 512, 512);
  const rings: [number, string][] = [[250, "#e0603a"], [228, "#ffd36a"], [212, "#2f8f8a"], [170, "#ffd36a"], [156, "#e0603a"], [110, "#f6e6c8"], [60, "#2f8f8a"]];
  for (const [rad, c] of rings) { g.fillStyle = c; g.beginPath(); g.arc(256, 256, rad, 0, 7); g.fill(); }
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; g.fillStyle = "#f6e6c8"; g.beginPath(); g.arc(256 + Math.cos(a) * 191, 256 + Math.sin(a) * 191, 7, 0, 7); g.fill(); }
  noise(g, 512, 512, r, 6000, 0.05);
});
/** a CRT screen (white artwork, tinted by the material's emissive colour): 0 waveform, 1 radar, 2 bars */
export const screenTex = (k: number) => ctex("hqScreen" + k, 256, 192, (g, r) => {
  g.fillStyle = "#101010"; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 1;
  for (let x = 16; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 192); g.stroke(); }
  for (let y = 16; y < 192; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  g.strokeStyle = "#ffffff"; g.fillStyle = "#ffffff"; g.lineWidth = 5; g.lineCap = "round";
  if (k === 0) { g.beginPath(); for (let x = 0; x <= 256; x += 4) { const y = 96 + Math.sin(x * 0.07) * 30 * Math.sin(x * 0.013 + 1) + (Math.abs(x - 150) < 14 ? -50 * Math.sin((x - 136) * 0.23) : 0); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  if (k === 1) { g.lineWidth = 3; for (const rad of [30, 60, 85]) { g.beginPath(); g.arc(128, 96, rad, 0, 7); g.stroke(); } g.lineWidth = 6; g.beginPath(); g.moveTo(128, 96); g.lineTo(200, 50); g.stroke(); for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(80 + r() * 100, 50 + r() * 90, 6, 0, 7); g.fill(); } }
  if (k === 2) { for (let i = 0; i < 7; i++) { const h = 30 + r() * 120; g.fillRect(18 + i * 33, 176 - h, 22, h); } }
  // scanlines + vignette
  for (let y = 0; y < 192; y += 3) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, y, 256, 1); }
  const vg = g.createRadialGradient(128, 96, 60, 128, 96, 170); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)"); g.fillStyle = vg; g.fillRect(0, 0, 256, 192);
});
/** label plaque: cream letters on a dark red enamel plate with a gold rim */
export const plaqueTex = (s: string, bg = "#fff4dc", fg = "#8a1a22") => ctex("hqPlaque" + s + bg, 512, 128, (g) => {
  g.fillStyle = "#e8b04a"; rrect(g, 0, 0, 512, 128, 26); g.fill();
  g.fillStyle = bg; rrect(g, 9, 9, 494, 110, 20); g.fill();
  g.fillStyle = "rgba(255,255,255,0.12)"; rrect(g, 14, 14, 484, 40, 16); g.fill();
  otxt(g, s, 256, 68, s.length > 6 ? 66 : 76, fg, "#2a0a0c", 0);
  for (const x of [30, 482]) { g.fillStyle = "#c8902e"; g.beginPath(); g.arc(x, 64, 8, 0, 7); g.fill(); }
});
/** "DAYS WITHOUT BRAIN FREEZE: 0" safety sign */
export const daysTex = () => ctex("hqDays", 512, 384, (g) => {
  g.fillStyle = "#2c5f8c"; rrect(g, 0, 0, 512, 384, 24); g.fill();
  g.fillStyle = "#f6efe0"; rrect(g, 14, 14, 484, 356, 16); g.fill();
  g.fillStyle = "#2c5f8c"; rrect(g, 14, 14, 484, 92, 16); g.fill(); g.fillRect(14, 70, 484, 36);
  otxt(g, "DAYS WITHOUT", 256, 60, 54, "#ffffff", "#000", 0);
  otxt(g, "BRAIN FREEZE", 256, 150, 56, "#1c2a3c", "#000", 0);
  g.fillStyle = "#1c1c1c"; rrect(g, 176, 196, 160, 160, 14); g.fill();
  otxt(g, "0", 256, 282, 150, "#ff4a3a", "#000", 0);
});
/** filing-cabinet drawer label card */
export const drawerTex = () => ctex("hqDrawer", 256, 96, (g) => {
  g.fillStyle = "#c8a050"; g.fillRect(0, 0, 256, 96);
  g.fillStyle = "#fff8e8"; g.fillRect(12, 12, 232, 72);
  otxt(g, "PAIN", 128, 34, 30, "#2a2a2a", "#000", 0);
  otxt(g, "REPORTS", 128, 66, 30, "#2a2a2a", "#000", 0);
});
/** an iris (the eye-window frame): hazel-green fibres around a black pupil ring; uv centre = the pupil */
export const irisTex = () => ctex("hqIris", 1024, 1024, (g, r) => {
  const c = 512;
  const gr = g.createRadialGradient(c, c, 280, c, c, 512);
  gr.addColorStop(0, "#c88a34"); gr.addColorStop(0.35, "#7aa04a"); gr.addColorStop(0.8, "#3f7f6a"); gr.addColorStop(1, "#1f4a48");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 520; i++) {
    const a = r() * Math.PI * 2, r0 = 300 + r() * 40, r1 = 420 + r() * 90, w = 1.5 + r() * 4;
    g.strokeStyle = r() < 0.5 ? `rgba(255,230,160,${0.15 + r() * 0.3})` : `rgba(20,50,40,${0.15 + r() * 0.3})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.quadraticCurveTo(c + Math.cos(a + 0.04) * (r0 + r1) / 2, c + Math.sin(a + 0.04) * (r0 + r1) / 2, c + Math.cos(a) * r1, c + Math.sin(a) * r1); g.stroke();
  }
  g.strokeStyle = "rgba(20,30,30,0.85)"; g.lineWidth = 26; g.beginPath(); g.arc(c, c, 498, 0, 7); g.stroke(); // limbal ring
  g.strokeStyle = "rgba(255,210,120,0.5)"; g.lineWidth = 14; g.beginPath(); g.arc(c, c, 312, 0, 7); g.stroke();  // collarette
  // a glossy cornea highlight (the eye is wet!)
  g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(c - 250, c - 280, 70, 34, -0.7, 0, 7); g.fill();
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(c - 150, c - 370, 18, 0, 7); g.fill();
});
/** "???" for the centre CRT while the brain is confused (white artwork, tinted by the screen colour) */
export const qTex = () => ctex("hqQ", 256, 192, (g) => {
  g.fillStyle = "#101010"; g.fillRect(0, 0, 256, 192);
  otxt(g, "???", 128, 100, 120, "#ffffff", "#000", 0);
  for (let y = 0; y < 192; y += 3) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, y, 256, 1); }
  const vg = g.createRadialGradient(128, 96, 60, 128, 96, 170); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.7)"); g.fillStyle = vg; g.fillRect(0, 0, 256, 192);
});
/** yellow/black hazard stripes (button ring, junction box trim) */
export const hazardTex = () => ctex("hqHazard", 256, 64, (g) => {
  g.fillStyle = "#ffd23a"; g.fillRect(0, 0, 256, 64);
  g.fillStyle = "#1a1a1a"; for (let x = -64; x < 320; x += 64) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 64); g.lineTo(x + 96, 0); g.lineTo(x + 64, 0); g.fill(); }
});
/** the PARK seen through BEAN's eyes (each pupil shows the middle ~65 %): golden late-afternoon sky with the low sun,
 *  hills + skyline, round trees, the striped ice-cream cart, and his own giant cone right in front of his face */
export const outsideTex = () => ctex("hqOutside", 1024, 1024, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 600);
  sky.addColorStop(0, "#f08c8c"); sky.addColorStop(0.45, "#ffbe86"); sky.addColorStop(1, "#fff0c4");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 1024);
  const sun = g.createRadialGradient(330, 470, 10, 330, 470, 330); sun.addColorStop(0, "rgba(255,255,236,1)"); sun.addColorStop(0.15, "rgba(255,244,200,0.9)"); sun.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(255,236,214,0.75)"; const x = 150 + r() * 700, y = 200 + r() * 200; g.beginPath(); g.ellipse(x, y, 70 + r() * 60, 14 + r() * 8, 0, 0, 7); g.fill(); }
  g.fillStyle = "#dca2b4"; for (let i = 0; i < 26; i++) { const w = 24 + r() * 30, h = 30 + r() * 80; g.fillRect(i * 40 + r() * 10, 560 - h, w, h + 20); }
  g.fillStyle = "#c2b27a"; g.beginPath(); g.moveTo(0, 600); for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 570 - 26 * Math.sin(x * 0.006 + 1) - 12 * Math.sin(x * 0.02)); g.lineTo(1024, 1024); g.lineTo(0, 1024); g.fill();
  g.fillStyle = "#8fc25a"; g.fillRect(0, 600, 1024, 424);
  const grd = g.createLinearGradient(0, 590, 0, 1024); grd.addColorStop(0, "rgba(255,220,140,0.55)"); grd.addColorStop(1, "rgba(60,120,40,0.35)"); g.fillStyle = grd; g.fillRect(0, 590, 1024, 434);
  const tree = (x: number, y: number, s: number) => {
    g.fillStyle = "#7a4a2a"; g.fillRect(x - s * 0.08, y - s * 0.2, s * 0.16, s * 0.6);
    g.fillStyle = "#4f9a40"; g.beginPath(); g.arc(x, y - s * 0.5, s * 0.5, 0, 7); g.fill();
    g.fillStyle = "#7cc25a"; g.beginPath(); g.arc(x - s * 0.15, y - s * 0.62, s * 0.3, 0, 7); g.fill();
    g.strokeStyle = "#1a1a1a"; g.lineWidth = 4; g.beginPath(); g.arc(x, y - s * 0.5, s * 0.5, 0, 7); g.stroke();
  };
  for (const [x, y, s] of [[200, 640, 170], [320, 620, 110], [860, 640, 190], [740, 615, 100]]) tree(x, y, s);
  // the ice-cream cart (right of centre): striped umbrella
  const cx = 640, cy = 660;
  g.fillStyle = "#ffe6ee"; g.fillRect(cx - 60, cy - 50, 120, 70); g.strokeStyle = "#1a1a1a"; g.lineWidth = 4; g.strokeRect(cx - 60, cy - 50, 120, 70);
  g.fillStyle = "#7ad0d0"; g.fillRect(cx - 60, cy - 50, 120, 16);
  g.fillStyle = "#555"; g.fillRect(cx - 3, cy - 130, 6, 82);
  for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? "#ffffff" : "#ff6a8a"; g.beginPath(); g.moveTo(cx, cy - 112); g.arc(cx, cy - 112, 84, Math.PI + (k / 6) * Math.PI, Math.PI + ((k + 1) / 6) * Math.PI); g.closePath(); g.fill(); }
  g.beginPath(); g.arc(cx, cy - 112, 84, Math.PI, 0); g.closePath(); g.stroke();
  // BEAN's own giant cone right in front of his eyes (bottom centre, cut by the frame)
  const kx = 470, ky = 1000;
  g.fillStyle = "#e8a85a"; g.beginPath(); g.moveTo(kx - 170, ky - 130); g.lineTo(kx + 170, ky - 130); g.lineTo(kx, ky + 260); g.closePath(); g.fill();
  g.save(); g.clip(); g.strokeStyle = "rgba(150,90,40,0.8)"; g.lineWidth = 6; for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(kx + k * 46 - 100, ky - 130); g.lineTo(kx + k * 46 + 100, ky + 160); g.stroke(); g.beginPath(); g.moveTo(kx + k * 46 + 100, ky - 130); g.lineTo(kx + k * 46 - 100, ky + 160); g.stroke(); } g.restore();
  const scoop = (x: number, y: number, rad: number, c: string, hi: string) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); g.fillStyle = hi; g.beginPath(); g.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.32, 0, 7); g.fill(); g.strokeStyle = "#1a1a1a"; g.lineWidth = 5; g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke(); };
  scoop(kx, ky - 170, 150, "#ffb0c4", "rgba(255,236,242,0.85)");
  for (let i = 0; i < 9; i++) { g.fillStyle = "#6a3a2a"; g.beginPath(); g.ellipse(kx - 90 + r() * 180, ky - 230 + r() * 120, 9, 5, r() * 3, 0, 7); g.fill(); }
  noise(g, 1024, 1024, r, 8000, 0.03);
});
