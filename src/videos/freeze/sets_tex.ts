// OWNER: sets. Hand-painted canvas textures for the PARK + GYM (all <= 2048, cached by key).
import { ctex } from "../bridge/paint";
import { G, otxt, noise, blot, rrect, star } from "./sets_kit";

// ============================================================ PARK
/** lush summer lawn: painted greens, clover, blade strokes, a few daisies; 2.5 m tile */
export const grassTex = () => ctex("fzGrass", 1024, 1024, (g, r) => {
  g.fillStyle = "#7cc24e"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 120; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 180, r() < 0.5 ? "150,206,82" : "70,150,60", 0.22, 1024, 1024);
  for (let i = 0; i < 9000; i++) {
    const x = r() * 1024, y = r() * 1024, L = 6 + r() * 12, a = -0.4 + r() * 0.8;
    g.strokeStyle = r() < 0.5 ? `rgba(40,110,40,${0.18 + r() * 0.2})` : `rgba(190,235,120,${0.15 + r() * 0.2})`;
    g.lineWidth = 1 + r() * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(a) * L, y - Math.cos(a) * L); g.stroke();
  }
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024; g.fillStyle = "rgba(60,140,60,0.35)"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + Math.cos(k * 2.1) * 5, y + Math.sin(k * 2.1) * 5, 5, 0, 7); g.fill(); } }
  for (let i = 0; i < 70; i++) {
    const x = r() * 1024, y = r() * 1024;
    g.fillStyle = r() < 0.7 ? "#fffaf0" : "#ffe06a";
    for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + Math.cos(k) * 4, y + Math.sin(k) * 4, 3.5, 2, k, 0, 7); g.fill(); }
    g.fillStyle = "#ffc23a"; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
  }
});
/** warm beige gravel with pebbles; 1 m tile */
export const gravelTex = () => ctex("fzGravel", 512, 512, (g, r) => {
  g.fillStyle = "#e8cfa0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 50; i++) blot(g, r() * 512, r() * 512, 30 + r() * 90, r() < 0.5 ? "250,226,180" : "200,160,110", 0.25, 512, 512);
  for (let i = 0; i < 1600; i++) {
    const x = r() * 512, y = r() * 512, s = 1.5 + r() * 4;
    g.fillStyle = ["#c9a878", "#f6e2bc", "#b88e64", "#dcc39a", "#a8937a"][Math.floor(r() * 5)];
    g.beginPath(); g.ellipse(x, y, s, s * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill();
    if (s > 3.5) { g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.3, s * 0.35, 0, 7); g.fill(); }
  }
  noise(g, 0, 0, 512, 512, r, 6000, 0.04);
});
/** foliage dapples (multiplied by the per-lump vertex colour) */
export const leafTex = () => ctex("fzLeaf", 512, 512, (g, r) => {
  g.fillStyle = "#e8f0e0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) blot(g, r() * 512, r() * 512, 30 + r() * 70, r() < 0.5 ? "255,255,230" : "170,190,160", 0.35, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, s = 4 + r() * 8;
    g.fillStyle = r() < 0.5 ? "rgba(255,255,235,0.35)" : "rgba(120,150,110,0.3)";
    g.beginPath(); g.ellipse(x, y, s, s * 0.55, r() * 3, 0, 7); g.fill();
  }
});
/** the cart's front panel: "ICE CREAM" with a cone, sprinkles, scallops */
export const cartSignTex = () => ctex("fzCartSign", 1024, 512, (g, r) => {
  g.fillStyle = "#ffe8f0"; rrect(g, 0, 0, 1024, 512, 60); g.fill();
  g.fillStyle = "#ff8fb8"; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc(32 + k * 64, 0, 32, 0, Math.PI); g.fill(); }
  for (let i = 0; i < 70; i++) { g.save(); g.translate(60 + r() * 900, 90 + r() * 380); g.rotate(r() * 3); g.fillStyle = ["#ff5a8a", "#5ac8ff", "#ffd23a", "#7ad07a", "#b07aff"][i % 5]; rrect(g, -9, -3, 18, 6, 3); g.fill(); g.restore(); }
  // cone
  g.save(); g.translate(150, 280); g.lineWidth = 9; g.strokeStyle = "#3a1a2a"; g.lineJoin = "round";
  g.fillStyle = "#e8a85a"; g.beginPath(); g.moveTo(-62, 0); g.lineTo(0, 170); g.lineTo(62, 0); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = "rgba(150,80,30,0.7)"; g.lineWidth = 4; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(-62 + k * 20, 0); g.lineTo(k * 20 + 40, 120); g.stroke(); }
  g.strokeStyle = "#3a1a2a"; g.lineWidth = 9;
  g.fillStyle = "#ff9ec4"; g.beginPath(); g.arc(0, -30, 70, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#e8343c"; g.beginPath(); g.arc(8, -104, 18, 0, 7); g.fill(); g.stroke();
  g.restore();
  otxt(g, "ICE", 600, 175, 150, "#ff4f8a", "#3a1a2a", 22);
  otxt(g, "CREAM", 600, 330, 150, "#3aaee0", "#3a1a2a", 22);
  g.fillStyle = "#3a1a2a"; g.font = "bold 44px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("★ SCOOPS · CONES · SMILES ★", 600, 450);
});
/** the A-frame chalkboard menu */
export const menuTex = () => ctex("fzMenu", 512, 704, (g, r) => {
  g.fillStyle = "#2e3a34"; g.fillRect(0, 0, 512, 704);
  for (let i = 0; i < 40; i++) blot(g, r() * 512, r() * 704, 40 + r() * 80, "255,255,255", 0.04, 512, 704);
  otxt(g, "TODAY!", 256, 90, 84, "#ffe06a", "#2e3a34", 2);
  const row = (y: number, a: string, b: string, c: string) => { g.fillStyle = c; g.beginPath(); g.arc(70, y, 22, 0, 7); g.fill(); otxt(g, a, 230, y, 46, "#ffffff", "#2e3a34", 2); otxt(g, b, 420, y, 46, "#ffb0cc", "#2e3a34", 2); };
  row(210, "PINK", "$2", "#ff9ec4"); row(300, "MINT", "$2", "#9ef0c8"); row(390, "VANILLA", "$2", "#fff0c0"); row(480, "CHOCO", "$2", "#9a5a3a");
  otxt(g, "3 SCOOPS = $5", 256, 600, 50, "#7ad0ff", "#2e3a34", 2);
  g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 4; g.setLineDash([14, 10]); g.strokeRect(20, 20, 472, 664); g.setLineDash([]);
});
/** waffle cross-hatch for the giant cone sign */
export const waffleTex = () => ctex("fzWaffle", 256, 256, (g) => {
  g.fillStyle = "#e9a85c"; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#b8743a"; g.lineWidth = 10;
  for (let k = -4; k < 8; k++) { g.beginPath(); g.moveTo(k * 64, 0); g.lineTo(k * 64 + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k * 64 + 256, 0); g.lineTo(k * 64, 256); g.stroke(); }
  g.fillStyle = "rgba(255,230,180,0.35)"; for (let k = 0; k < 16; k++) { g.beginPath(); g.arc((k % 4) * 64 + 32, Math.floor(k / 4) * 64, 8, 0, 7); g.fill(); }
});
/** skyline facades: pastel wall (opaque) + windows; window alpha 0.4 = lit at dusk (WINA), alpha 1 = dark; 4 m x 3.5 m tile */
export const facadeTex = () => ctex("fzFacade", 512, 512, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20; i++) blot(g, r() * 512, r() * 512, 40 + r() * 90, "225,215,215", 0.25, 512, 512);
  g.fillStyle = "rgba(200,190,200,1)"; g.fillRect(0, 490, 512, 22);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const x = 60 + i * 256, y = 90 + j * 256;
    g.fillStyle = "rgba(150,160,190,1)"; g.fillRect(x - 10, y - 10, 156, 196);
    const lit = r() < 0.6;
    g.clearRect(x, y, 136, 176);
    g.fillStyle = lit ? "rgba(200,220,245,0.4)" : "rgba(120,140,180,1)"; g.fillRect(x, y, 136, 176);
    g.fillStyle = "rgba(150,160,190,1)"; g.fillRect(x + 63, y, 10, 176);
  }
});

// ============================================================ GYM
/** maple floor boards; 2 m tile */
export const mapleTex = () => ctex("fzMaple", 1024, 1024, (g, r) => {
  const n = 14, bw = 1024 / n;
  for (let i = 0; i < n; i++) {
    let y = -r() * 300;
    while (y < 1024) {
      const L = 220 + r() * 420;
      g.fillStyle = `hsl(${32 + r() * 6},${52 + r() * 14}%,${66 + r() * 8}%)`; g.fillRect(i * bw, y, bw, L);
      for (let k = 0; k < 5; k++) { g.strokeStyle = `rgba(150,90,40,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 1.5; g.beginPath(); const x0 = i * bw + 5 + r() * (bw - 10); g.moveTo(x0, y); g.lineTo(x0 + (r() - 0.5) * 6, y + L); g.stroke(); }
      g.fillStyle = "rgba(110,60,20,0.35)"; g.fillRect(i * bw, y, bw, 2);
      y += L;
    }
    g.fillStyle = "rgba(110,60,20,0.35)"; g.fillRect(i * bw, 0, 2, 1024);
  }
  for (let i = 0; i < 30; i++) blot(g, r() * 1024, r() * 1024, 80 + r() * 160, "255,250,235", 0.12, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.025);
});
/** painted cinder blocks; 1.6 m x 0.8 m tile (4 x 4 blocks of 0.4 x 0.2) */
export const blockTex = () => ctex("fzBlock", 512, 256, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 256);
  for (let j = 0; j < 4; j++) for (let i = -1; i < 5; i++) {
    const x = i * 128 + (j % 2 ? 64 : 0), y = j * 64;
    g.fillStyle = `rgba(${235 + r() * 20},${235 + r() * 20},${240 + r() * 15},1)`; rrect(g, x + 3, y + 3, 122, 58, 6); g.fill();
  }
  g.fillStyle = "rgba(150,150,170,0.5)"; for (let j = 0; j <= 4; j++) g.fillRect(0, j * 64 - 2, 512, 4);
  noise(g, 0, 0, 512, 256, r, 5000, 0.04);
});
const bannerBase = (g: G, w: number, h: number, bg: string, edge: string) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = edge; g.fillRect(0, 0, w, 22); g.fillRect(0, h - 22, w, 22);
  g.fillStyle = "rgba(255,255,255,0.5)"; for (let x = 20; x < w; x += 60) { g.beginPath(); g.arc(x, 11, 5, 0, 7); g.fill(); g.beginPath(); g.arc(x, h - 11, 5, 0, 7); g.fill(); }
};
/** "FAST" banner: hot red, a rocket + speed lines */
export const fastTex = () => ctex("fzFast", 1024, 384, (g) => {
  bannerBase(g, 1024, 384, "#ff4a3a", "#ffd23a");
  g.strokeStyle = "rgba(255,230,120,0.8)"; g.lineWidth = 14; g.lineCap = "round";
  for (const [y, L] of [[120, 160], [190, 220], [260, 150]] as [number, number][]) { g.beginPath(); g.moveTo(70, y); g.lineTo(70 + L, y); g.stroke(); }
  g.save(); g.translate(830, 192); g.rotate(-0.5); g.lineWidth = 10; g.strokeStyle = "#3a0a10";
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(0, -110); g.quadraticCurveTo(55, -40, 40, 70); g.lineTo(-40, 70); g.quadraticCurveTo(-55, -40, 0, -110); g.fill(); g.stroke();
  g.fillStyle = "#ffd23a"; g.beginPath(); g.moveTo(-30, 70); g.lineTo(0, 130); g.lineTo(30, 70); g.fill(); g.stroke();
  g.fillStyle = "#5ac8ff"; g.beginPath(); g.arc(0, -20, 20, 0, 7); g.fill(); g.stroke();
  g.restore();
  otxt(g, "FAST", 500, 200, 210, "#ffffff", "#3a0a10", 22);
});
/** "SLOW" banner: calm blue, a snail */
export const slowTex = () => ctex("fzSlow", 1024, 384, (g) => {
  bannerBase(g, 1024, 384, "#3a8ae8", "#9ef0c8");
  g.save(); g.translate(845, 215); g.lineWidth = 10; g.strokeStyle = "#0a1a3a"; g.lineJoin = "round";
  g.fillStyle = "#ffd36a"; g.beginPath(); g.moveTo(-95, 60); g.quadraticCurveTo(-110, 30, -80, 20); g.lineTo(70, 20); g.quadraticCurveTo(110, 30, 100, 60); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-80, 25); g.lineTo(-95, -40); g.moveTo(-70, 22); g.lineTo(-62, -42); g.stroke();
  g.fillStyle = "#0a1a3a"; g.beginPath(); g.arc(-95, -42, 9, 0, 7); g.fill(); g.beginPath(); g.arc(-62, -44, 9, 0, 7); g.fill();
  g.fillStyle = "#ff8ab4"; g.beginPath(); g.arc(20, -30, 62, 0, 7); g.fill(); g.stroke();
  g.beginPath(); for (let a = 0; a < 12; a += 0.2) { const rr = 52 - a * 4; g.lineTo(20 + Math.cos(a) * rr, -30 + Math.sin(a) * rr); } g.stroke();
  g.restore();
  otxt(g, "SLOW", 470, 200, 210, "#ffffff", "#0a1a3a", 22);
});
/** the big wall banner */
export const fairTex = () => ctex("fzFair", 2048, 512, (g, r) => {
  g.fillStyle = "#fff6e0"; rrect(g, 0, 0, 2048, 512, 40); g.fill();
  g.fillStyle = "#7a5ae8"; rrect(g, 14, 14, 2020, 484, 34); g.fill();
  for (let i = 0; i < 40; i++) { g.fillStyle = ["#ffd23a", "#ff8ab4", "#9ef0c8", "#ffffff"][i % 4]; star(g, 40 + r() * 1960, 40 + r() * 430, 14, 6); g.fill(); }
  otxt(g, "SCIENCE FAIR!", 1024, 230, 220, "#ffd23a", "#2a1460", 26);
  otxt(g, "★ MAPLE GROVE ELEMENTARY ★", 1024, 420, 76, "#ffffff", "#2a1460", 12);
});
/** the study trifold: three panels on one canvas (1536 x 768): title across, hypothesis, method, results */
export const trifoldTex = () => ctex("fzTrifold", 1536, 768, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 1536, 768);
  const pan = ["#cfeaff", "#fff0b0", "#ffd6e6"];
  for (let i = 0; i < 3; i++) { g.fillStyle = pan[i]; g.fillRect(i * 512 + 16, 16, 480, 736); }
  // title strip across the middle panel top
  g.fillStyle = "#ff4f8a"; rrect(g, 540, 30, 456, 230, 24); g.fill(); g.lineWidth = 8; g.strokeStyle = "#3a1a2a"; g.stroke();
  otxt(g, "ICE-CREAM", 768, 82, 72, "#ffffff", "#3a1a2a", 10);
  otxt(g, "HEADACHE", 768, 152, 72, "#ffffff", "#3a1a2a", 10);
  otxt(g, "STUDY", 768, 222, 64, "#ffe06a", "#3a1a2a", 10);
  // middle: a drawing of a cone + a brain with a snowflake
  g.save(); g.translate(768, 480); g.lineWidth = 8; g.strokeStyle = "#3a1a2a";
  g.fillStyle = "#ff9ec4"; g.beginPath(); g.arc(-90, -60, 70, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#e9a85c"; g.beginPath(); g.moveTo(-150, -30); g.lineTo(-90, 140); g.lineTo(-30, -30); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#ffb0c8"; g.beginPath(); g.ellipse(90, -30, 90, 70, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(90, -100); g.lineTo(90, 40); g.stroke();
  g.strokeStyle = "#3aaee0"; g.lineWidth = 10; for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; g.beginPath(); g.moveTo(90 - Math.cos(a) * 40, 110 - Math.sin(a) * 40); g.lineTo(90 + Math.cos(a) * 40, 110 + Math.sin(a) * 40); g.stroke(); }
  g.restore();
  otxt(g, "FAST vs SLOW", 768, 690, 54, "#3a1a2a", "#fffaf0", 4);
  // left: hypothesis lines + a question mark
  otxt(g, "QUESTION", 256, 80, 56, "#2a5aa0", "#fffaf0", 4);
  otxt(g, "?", 256, 330, 300, "#ff4f8a", "#3a1a2a", 14);
  g.fillStyle = "#6a7a9a"; for (let k = 0; k < 6; k++) g.fillRect(70, 520 + k * 34, 300 + (k % 3) * 40, 12);
  // right: a tiny table of tally marks
  otxt(g, "RESULTS", 1280, 80, 56, "#c02a5a", "#fffaf0", 4);
  g.strokeStyle = "#3a1a2a"; g.lineWidth = 6; g.strokeRect(1080, 150, 400, 420); g.beginPath(); g.moveTo(1280, 150); g.lineTo(1280, 570); g.moveTo(1080, 230); g.lineTo(1480, 230); g.stroke();
  otxt(g, "FAST", 1180, 190, 40, "#ff4a3a", "#fffaf0", 3); otxt(g, "SLOW", 1380, 190, 40, "#3a8ae8", "#fffaf0", 3);
  for (let k = 0; k < 4; k++) { const y = 270 + k * 70; g.lineWidth = 5; for (let m = 0; m < 4; m++) { g.beginPath(); g.moveTo(1110 + m * 20, y); g.lineTo(1110 + m * 20, y + 44); g.stroke(); } g.beginPath(); g.moveTo(1100, y + 40); g.lineTo(1200, y + 6); g.stroke(); if (k < 2) for (let m = 0; m < 4; m++) { g.beginPath(); g.moveTo(1310 + m * 20, y); g.lineTo(1310 + m * 20, y + 44); g.stroke(); } }
});
/** a background trifold (variant per seed) */
export const bgTrifoldTex = (k: number) => ctex("fzBgTri" + k, 768, 384, (g, r) => {
  const sets = [["VOLCANO!", "#ff7a3a", "#ffe6d0"], ["PLANTS", "#4ab04a", "#e6ffd8"], ["MAGNETS", "#c03a5a", "#f0e0ff"], ["SPACE", "#3a4ab0", "#dfe6ff"], ["SLIME LAB", "#7ad03a", "#fff6c0"]][k % 5];
  g.fillStyle = sets[2]; g.fillRect(0, 0, 768, 384);
  for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(i * 256 + 10, 10, 236, 364); }
  g.fillStyle = sets[1]; rrect(g, 280, 20, 208, 90, 16); g.fill();
  otxt(g, sets[0], 384, 66, sets[0].length > 6 ? 34 : 44, "#ffffff", "#1a1a2a", 6);
  for (let i = 0; i < 9; i++) { g.fillStyle = ["#ff8ab4", "#5ac8ff", "#ffd23a", "#7ad07a"][i % 4]; rrect(g, 30 + (i % 3) * 256 + r() * 40, 150 + Math.floor(i / 3) * 70, 120 + r() * 60, 44, 8); g.fill(); }
});
/** the scoreboard */
export const scoreTex = () => ctex("fzScore", 1024, 512, (g) => {
  g.fillStyle = "#1a1a24"; rrect(g, 0, 0, 1024, 512, 30); g.fill();
  g.fillStyle = "#2a2a3a"; rrect(g, 20, 20, 984, 472, 22); g.fill();
  otxt(g, "HOME", 250, 80, 60, "#ffffff", "#1a1a24", 4); otxt(g, "GUEST", 774, 80, 60, "#ffffff", "#1a1a24", 4);
  for (const [x, s] of [[250, "88"], [774, "88"]] as [number, string][]) { g.fillStyle = "#0a0a10"; rrect(g, x - 150, 120, 300, 200, 16); g.fill(); otxt(g, s, x, 222, 180, "#ff3a3a", "#0a0a10", 2); }
  g.fillStyle = "#0a0a10"; rrect(g, 392, 360, 240, 110, 16); g.fill(); otxt(g, "8:30", 512, 418, 84, "#ffd23a", "#0a0a10", 2);
  otxt(g, "PENGUINS", 512, 220, 46, "#5ac8ff", "#1a1a24", 4);
});
/** the bright morning outside the high windows: sky, a few treetops, a roofline */
export const outsideTex = () => ctex("fzOutside", 1024, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#9ecbff"); gr.addColorStop(0.6, "#d8ecff"); gr.addColorStop(1, "#fff6e0");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 6; i++) blot(g, r() * 1024, 40 + r() * 80, 60 + r() * 60, "255,255,255", 0.7, 1024, 256);
  g.fillStyle = "#7ab86a"; for (let i = 0; i < 26; i++) { g.beginPath(); g.arc(i * 42 + r() * 20, 250 - r() * 50, 30 + r() * 30, 0, 7); g.fill(); }
  g.fillStyle = "#5a9a5a"; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(i * 60 + r() * 30, 262 - r() * 20, 26 + r() * 20, 0, 7); g.fill(); }
});
/** the centre-court logo: a penguin mascot + "PENGUINS" ring (alpha decal) */
export const logoTex = () => ctex("fzLogo", 1024, 1024, (g) => {
  g.clearRect(0, 0, 1024, 1024);
  g.lineWidth = 26; g.strokeStyle = "#3a6ad8"; g.beginPath(); g.arc(512, 512, 480, 0, 7); g.stroke();
  g.fillStyle = "rgba(90,200,255,0.6)"; g.beginPath(); g.arc(512, 512, 330, 0, 7); g.fill();
  g.save(); g.translate(512, 540); g.lineWidth = 14; g.strokeStyle = "#0a1a3a"; g.lineJoin = "round";
  g.fillStyle = "#1e2a4a"; g.beginPath(); g.ellipse(0, 30, 160, 210, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(0, 70, 110, 160, 0, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(s * 50, -100, 38, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#0a1a3a"; g.beginPath(); g.arc(s * 44, -96, 16, 0, 7); g.fill(); }
  g.fillStyle = "#ffa23a"; g.beginPath(); g.moveTo(-30, -50); g.lineTo(0, -10); g.lineTo(30, -50); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = "#ff4a3a"; g.beginPath(); g.moveTo(-120, -170); g.quadraticCurveTo(0, -260, 120, -170); g.lineTo(-120, -170); g.fill(); g.stroke();
  g.restore();
  g.font = "bold 92px 'DejaVu Sans', sans-serif"; g.fillStyle = "#3a6ad8"; g.textAlign = "center"; g.textBaseline = "middle";
  const s = "GO PENGUINS!  GO PENGUINS!  ";
  for (let i = 0; i < s.length; i++) { const a = -Math.PI / 2 + ((i - s.length / 4) / s.length) * Math.PI * 2; g.save(); g.translate(512 + Math.cos(a) * 405, 512 + Math.sin(a) * 405); g.rotate(a + Math.PI / 2); g.fillText(s[i], 0, 0); g.restore(); }
});
/** a wall clock */
export const clockTex = () => ctex("fzClock", 256, 256, (g) => {
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
  g.lineWidth = 12; g.strokeStyle = "#1a1a24"; g.stroke();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = "#1a1a24"; g.fillRect(128 + Math.cos(a) * 95 - 4, 128 + Math.sin(a) * 95 - 4, 8, 8); }
  g.lineCap = "round"; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(-Math.PI / 2 + 8.5 / 12 * Math.PI * 2) * 55, 128 + Math.sin(-Math.PI / 2 + 8.5 / 12 * Math.PI * 2) * 55); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 40); g.stroke();
});
/** cup band / tub label */
export const tubTex = () => ctex("fzTub", 512, 128, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 128);
  g.fillStyle = "#ff8ab4"; g.fillRect(0, 0, 512, 26); g.fillRect(0, 102, 512, 26);
  for (const x of [128, 384]) otxt(g, "VANILLA", x, 64, 40, "#3a6ad8", "#ffffff", 4);
});
