// OWNER: staff. Hand-painted canvas textures for the crew STAFF ROOM (staff.ts): pink flesh, hand-painted wall tiles,
// checker linoleum, the wall clock (LUNCH sticker), the SCHEDULE board (+ its glow layer), the "NO CRUMB LEFT BEHIND"
// poster, the vending machine ("SNACKS (for humans)"), the STAFF ONLY / EXIT signs, lockers, the punch-card time clock,
// "EMPLOYEE OF THE MONTH" and the glowing corridor behind the exit door.
import { ctex } from "../bridge/paint";

type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const INK = "#1a1214";
export const otxt = (g: G, s: string, x: number, y: number, px: number, col: string, ink: string, lw: number, font = FONT) => {
  g.font = `bold ${Math.round(px)}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; if (lw > 0) { g.strokeStyle = ink; g.lineWidth = lw; g.strokeText(s, x, y); } g.fillStyle = col; g.fillText(s, x, y);
};
const noise = (g: G, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W: number, H: number) => {
  for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};
const rrect = (g: G, x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const wob = (g: G, x: number, y: number, w: number, h: number, r: () => number, j: number) => {
  g.beginPath(); g.moveTo(x + (r() - 0.5) * j, y + (r() - 0.5) * j);
  g.lineTo(x + w + (r() - 0.5) * j, y + (r() - 0.5) * j); g.lineTo(x + w + (r() - 0.5) * j, y + h + (r() - 0.5) * j); g.lineTo(x + (r() - 0.5) * j, y + h + (r() - 0.5) * j); g.closePath();
};

/** soft pink stomach-wall FLESH (1 m tile, seamless): lobes, faint capillaries, glossy speckles */
export const fleshTex = () => ctex("stFleshWall", 512, 512, (g, r) => {
  const W = 512;
  g.fillStyle = "#f4aca6"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 46; i++) blot(g, r() * W, r() * W, 40 + r() * 90, r() < 0.5 ? "255,206,186" : "222,128,140", 0.28, W, W);
  for (let i = 0; i < 22; i++) {
    const x = r() * W, y = r() * W, a = r() * 6.3;
    g.strokeStyle = `rgba(200,80,110,${0.18 + r() * 0.15})`; g.lineWidth = 1.5 + r() * 1.5; g.lineCap = "round";
    for (const ox of [-W, 0, W]) for (const oy of [-W, 0, W]) {
      let px = x, py = y, pa = a; g.beginPath(); g.moveTo(px + ox, py + oy);
      for (let k = 0; k < 14; k++) { pa += Math.sin(k * 1.7 + i) * 0.5; px += Math.cos(pa) * 9; py += Math.sin(pa) * 9; g.lineTo(px + ox, py + oy); }
      g.stroke();
    }
  }
  for (let i = 0; i < 150; i++) { g.fillStyle = `rgba(255,236,232,${0.25 + r() * 0.35})`; g.beginPath(); g.arc(r() * W, r() * W, 1 + r() * 2.5, 0, 7); g.fill(); }
  noise(g, W, W, r, 5000, 0.03);
});
/** hand-painted TILES on the flesh (1 m tile = 4 x 4 tiles): wobbly cream/mint squares, pink flesh grout, a gloss
 *  stroke on each, the odd chipped corner and a painted crack */
export const tileTex = () => ctex("stWallTiles", 512, 512, (g, r) => {
  const W = 512, n = 4, s = W / n;
  g.fillStyle = "#e69c98"; g.fillRect(0, 0, W, W);
  for (let i = 0; i < 20; i++) blot(g, r() * W, r() * W, 30 + r() * 60, "214,120,130", 0.3, W, W);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * s + 4, y = j * s + 4, mint = (i * 7 + j * 3) % 5 === 1;
    wob(g, x, y, s - 8, s - 8, r, 5);
    g.fillStyle = mint ? "#a6e0cf" : (i + j) % 2 ? "#fff3dc" : "#fbe8cc"; g.fill();
    g.strokeStyle = "rgba(170,90,100,0.35)"; g.lineWidth = 2; g.stroke();
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(x + s * 0.3, y + s * 0.25, s * 0.18, s * 0.05, -0.6, 0, 7); g.fill();
    if (r() < 0.25) { g.fillStyle = "#e69c98"; g.beginPath(); g.moveTo(x + s - 8, y + s - 8); g.lineTo(x + s - 28, y + s - 8); g.lineTo(x + s - 8, y + s - 24); g.closePath(); g.fill(); }
    const gr = g.createLinearGradient(x, y, x, y + s); gr.addColorStop(0, "rgba(255,255,255,0.08)"); gr.addColorStop(1, "rgba(160,80,60,0.1)"); g.fillStyle = gr; g.fillRect(x, y, s - 8, s - 8);
  }
  g.strokeStyle = "rgba(120,70,70,0.45)"; g.lineWidth = 2; g.beginPath(); g.moveTo(300, 140); g.lineTo(318, 170); g.lineTo(310, 196); g.lineTo(330, 226); g.stroke();
  noise(g, W, W, r, 5000, 0.025);
});
/** cream + teal CHECKER linoleum (1.6 m tile = 4 x 4), scuffs and a soft wax sheen */
export const floorTex = () => ctex("stCheckerFloor", 1024, 1024, (g, r) => {
  const n = 4, s = 1024 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    g.fillStyle = (i + j) % 2 ? "#2f8f88" : "#f4e6c6"; g.fillRect(i * s, j * s, s, s);
    const gr = g.createLinearGradient(i * s, j * s, i * s + s, j * s + s); gr.addColorStop(0, "rgba(255,255,255,0.07)"); gr.addColorStop(1, "rgba(0,0,0,0.06)"); g.fillStyle = gr; g.fillRect(i * s, j * s, s, s);
  }
  g.strokeStyle = "rgba(40,30,30,0.35)"; g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 1024); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(1024, i * s); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(60,40,40,${0.05 + r() * 0.08})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * 1024, y = r() * 1024; g.moveTo(x, y); g.quadraticCurveTo(x + 20, y + 10, x + 30 + r() * 60, y + (r() - 0.5) * 20); g.stroke(); }
  noise(g, 1024, 1024, r, 12000, 0.03);
});
/** the WALL CLOCK face: cream dial, bold numbers, minute ticks, a red "LUNCH!" sticker at 12, a little brand */
export const clockTex = () => ctex("stWallClock", 512, 512, (g, r) => {
  const c = 256;
  g.fillStyle = "#fff6e2"; g.beginPath(); g.arc(c, c, 256, 0, 7); g.fill();
  const gr = g.createRadialGradient(c - 60, c - 80, 20, c, c, 260); gr.addColorStop(0, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(220,180,140,0.35)"); g.fillStyle = gr; g.fill();
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2, big = k % 5 === 0, r0 = big ? 196 : 214, r1 = 232;
    g.strokeStyle = INK; g.lineWidth = big ? 9 : 4; g.lineCap = "round";
    g.beginPath(); g.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0); g.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1); g.stroke();
  }
  for (let h = 1; h <= 12; h++) {
    if (h === 12) continue;
    const a = (h / 12) * Math.PI * 2; otxt(g, String(h), c + Math.sin(a) * 158, c - Math.cos(a) * 158 + 3, 52, INK, INK, 0);
  }
  // the LUNCH sticker at 12 (slightly crooked)
  g.save(); g.translate(c + 4, c - 152); g.rotate(-0.08);
  rrect(g, -78, -32, 156, 64, 14); g.fillStyle = "#e8343c"; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  otxt(g, "LUNCH!", 0, 3, 40, "#fff6e2", INK, 0); g.restore();
  otxt(g, "STOMACH & CO.", c, c + 92, 24, "#8a5a40", INK, 0);
  g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.arc(c, c, 250, 0, 7); g.stroke();
  noise(g, 512, 512, r, 2500, 0.025);
});
const BOARD_W = 1024, BOARD_H = 1180;
/** the SCHEDULE board (albedo): a navy lightbox with a cream "CREW SCHEDULE" header, the unlit letters printed dark */
export const boardTex = () => ctex("stBoardBase", BOARD_W, BOARD_H, (g, r) => {
  const W = BOARD_W, H = BOARD_H;
  g.fillStyle = "#2a3150"; g.fillRect(0, 0, W, H);
  rrect(g, 40, 40, W - 80, 200, 26); g.fillStyle = "#f4e2b8"; g.fill(); g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  otxt(g, "CREW SCHEDULE", W / 2, 142, 96, "#c8342c", INK, 0);
  for (const [y0, h] of [[290, 250], [570, 330], [930, 200]] as [number, number][]) { rrect(g, 60, y0, W - 120, h, 22); g.fillStyle = "#1c2238"; g.fill(); g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 4; g.stroke(); }
  // the unlit letters (dim)
  otxt(g, "SHIFT: CLEAN", W / 2, 418, 116, "#4a5274", INK, 0);
  otxt(g, "11:59", W / 2, 740, 250, "#4a5274", INK, 0);
  otxt(g, "(right before LUNCH)", W / 2, 1032, 74, "#4a5274", INK, 0);
  g.strokeStyle = "#7a4a2a"; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, H - 26);
  g.strokeStyle = INK; g.lineWidth = 6; g.strokeRect(2, 2, W - 4, H - 4); g.strokeRect(27, 27, W - 54, H - 54);
  noise(g, W, H, r, 6000, 0.03);
});
/** the SCHEDULE board (glow layer, additive): the lit letters, LUNCH in hot red, a blinking arrow */
export const boardGlowTex = () => ctex("stBoardGlow", BOARD_W, BOARD_H, (g) => {
  const W = BOARD_W;
  g.fillStyle = "#000000"; g.fillRect(0, 0, W, BOARD_H);
  g.shadowColor = "rgba(255,200,80,0.9)"; g.shadowBlur = 26;
  otxt(g, "SHIFT: CLEAN", W / 2, 418, 116, "#ffe9a0", INK, 0);
  otxt(g, "11:59", W / 2, 740, 250, "#fff2c0", INK, 0);
  g.font = `bold 74px ${FONT}`; g.textBaseline = "middle"; g.textAlign = "left";
  const s1 = "(right before ", s2 = "LUNCH", s3 = ")", w1 = g.measureText(s1).width, w2 = g.measureText(s2).width, w3 = g.measureText(s3).width;
  let x = W / 2 - (w1 + w2 + w3) / 2;
  g.fillStyle = "#ffe9a0"; g.fillText(s1, x, 1032); x += w1;
  g.shadowColor = "rgba(255,60,40,0.95)"; g.fillStyle = "#ff5a48"; g.fillText(s2, x, 1032); x += w2;
  g.shadowColor = "rgba(255,200,80,0.9)"; g.fillStyle = "#ffe9a0"; g.fillText(s3, x, 1032);
  g.shadowBlur = 0;
});
/** motivational poster "NO CRUMB LEFT BEHIND": a heroic mop against sunrise rays, a tiny crumb fleeing */
export const posterTex = () => ctex("stPosterCrumb", 512, 700, (g, r) => {
  const W = 512, H = 700;
  g.fillStyle = "#ffd27a"; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = 430;
  for (let k = 0; k < 18; k++) { const a0 = (k / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18; g.fillStyle = k % 2 ? "#ffb85a" : "#ffe09a"; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 700, a0, a1); g.closePath(); g.fill(); }
  g.fillStyle = "#ff8a4a"; g.beginPath(); g.arc(cx, cy + 40, 120, Math.PI, 0); g.fill();
  // the mop
  g.save(); g.translate(cx - 10, 560); g.rotate(-0.22);
  g.fillStyle = "#c8864a"; g.strokeStyle = INK; g.lineWidth = 6; rrect(g, -12, -330, 24, 330, 10); g.fill(); g.stroke();
  for (let i = 0; i < 9; i++) { g.strokeStyle = INK; g.lineWidth = 22; g.lineCap = "round"; g.beginPath(); g.moveTo(-60 + i * 15, 0); g.quadraticCurveTo(-64 + i * 16, 60, -70 + i * 18 + Math.sin(i) * 10, 110); g.stroke(); g.strokeStyle = "#f4f0e8"; g.lineWidth = 14; g.stroke(); }
  rrect(g, -70, -18, 140, 34, 10); g.fillStyle = "#3a7fd0"; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
  g.restore();
  // a tiny crumb running away (sweat drop)
  g.fillStyle = "#d89a4a"; g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.ellipse(400, 618, 34, 26, 0.2, 0, 7); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(392, 612, 5, 0, 7); g.arc(410, 610, 5, 0, 7); g.fill();
  g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(380, 644); g.lineTo(368, 670); g.moveTo(414, 644); g.lineTo(428, 668); g.stroke();
  g.fillStyle = "#7ac8f0"; g.beginPath(); g.moveTo(440, 580); g.quadraticCurveTo(452, 600, 440, 606); g.quadraticCurveTo(428, 600, 440, 580); g.fill();
  rrect(g, 20, 20, W - 40, 170, 18); g.fillStyle = "#2a3150"; g.fill();
  otxt(g, "NO CRUMB", W / 2, 72, 64, "#fff3dc", INK, 0);
  otxt(g, "LEFT BEHIND", W / 2, 142, 58, "#ffd27a", INK, 0);
  g.strokeStyle = INK; g.lineWidth = 12; g.strokeRect(6, 6, W - 12, H - 12);
  noise(g, W, H, r, 4000, 0.03);
});
/** vending window (emissive): shelves of HUMAN food (pizza, burger, donut, apple, fries, broccoli) + price tags */
export const vendWinTex = () => ctex("stVendWindow", 512, 768, (g, r) => {
  const W = 512, H = 768;
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#c8f0ff"); bg.addColorStop(1, "#7cc0e8"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rows = 4, rh = H / rows;
  const draw = [
    (x: number, y: number) => { g.fillStyle = "#f2b84a"; g.beginPath(); g.moveTo(x - 34, y - 28); g.lineTo(x + 34, y - 28); g.lineTo(x, y + 34); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#d8402c"; for (const [a, b] of [[-12, -14], [10, -12], [0, 6]]) { g.beginPath(); g.arc(x + a, y + b, 7, 0, 7); g.fill(); } g.fillStyle = "#c8864a"; g.fillRect(x - 36, y - 36, 72, 10); },
    (x: number, y: number) => { g.fillStyle = "#e0a050"; g.beginPath(); g.ellipse(x, y - 12, 36, 20, 0, Math.PI, 0); g.fill(); g.stroke(); g.fillStyle = "#6ab040"; g.fillRect(x - 38, y - 10, 76, 8); g.fillStyle = "#7a3a20"; g.fillRect(x - 36, y - 2, 72, 14); g.fillStyle = "#e0a050"; g.fillRect(x - 34, y + 12, 68, 12); g.strokeRect(x - 36, y - 10, 72, 34); },
    (x: number, y: number) => { g.fillStyle = "#ff8ab0"; g.beginPath(); g.arc(x, y, 32, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#c8f0ff"; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#fff"; for (let k = 0; k < 6; k++) g.fillRect(x - 20 + k * 7, y - 22 + (k % 2) * 30, 4, 9); },
    (x: number, y: number) => { g.fillStyle = "#e8343c"; g.beginPath(); g.arc(x - 12, y + 4, 26, 0, 7); g.arc(x + 12, y + 4, 26, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#6ab040"; g.beginPath(); g.ellipse(x + 10, y - 30, 12, 6, -0.5, 0, 7); g.fill(); g.stroke(); },
    (x: number, y: number) => { g.fillStyle = "#ffd23a"; for (let k = 0; k < 6; k++) { g.fillRect(x - 22 + k * 8, y - 38 + (k % 3) * 5, 7, 40); g.strokeRect(x - 22 + k * 8, y - 38 + (k % 3) * 5, 7, 40); } g.fillStyle = "#e8343c"; g.beginPath(); g.moveTo(x - 30, y - 6); g.lineTo(x + 30, y - 6); g.lineTo(x + 22, y + 34); g.lineTo(x - 22, y + 34); g.closePath(); g.fill(); g.stroke(); },
    (x: number, y: number) => { g.fillStyle = "#4a9a3a"; for (const [a, b, s] of [[-14, -12, 18], [12, -14, 18], [0, -26, 18]]) { g.beginPath(); g.arc(x + a, y + b, s, 0, 7); g.fill(); g.stroke(); } g.fillStyle = "#9ad06a"; g.fillRect(x - 6, y, 12, 30); g.strokeRect(x - 6, y, 12, 30); },
  ];
  for (let j = 0; j < rows; j++) {
    const y = j * rh + rh * 0.48;
    for (let i = 0; i < 3; i++) {
      const x = 90 + i * 166;
      g.strokeStyle = INK; g.lineWidth = 4; draw[(i + j * 2) % draw.length](x, y);
      rrect(g, x - 34, y + 44, 68, 26, 6); g.fillStyle = "#fffaf0"; g.fill(); g.lineWidth = 3; g.stroke();
      otxt(g, "1 BITE", x, y + 58, 16, INK, INK, 0);
    }
    g.fillStyle = "#8a96a8"; g.fillRect(0, (j + 1) * rh - 14, W, 10); g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(0, (j + 1) * rh - 14, W, 3);
  }
  g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(150, 0); g.lineTo(60, H); g.lineTo(-50, H); g.closePath(); g.fill();
  noise(g, W, H, r, 3000, 0.03);
});
/** vending header sign (emissive): "SNACKS" + "(for humans)" */
export const vendSignTex = () => ctex("stVendSign", 512, 200, (g) => {
  g.fillStyle = "#e8343c"; g.fillRect(0, 0, 512, 200);
  g.fillStyle = "#ff6a5a"; g.fillRect(0, 0, 512, 30);
  otxt(g, "SNACKS", 256, 82, 104, "#fff6e2", INK, 10);
  otxt(g, "(for humans)", 256, 160, 46, "#ffe08a", INK, 6);
});
/** the vending machine's coin panel (albedo) */
export const vendPanelTex = () => ctex("stVendPanel", 128, 512, (g, r) => {
  g.fillStyle = "#3a3f50"; g.fillRect(0, 0, 128, 512);
  rrect(g, 18, 30, 92, 60, 8); g.fillStyle = "#8af0b0"; g.fill(); otxt(g, "00", 64, 62, 34, "#1a4030", INK, 0);
  for (let k = 0; k < 9; k++) { rrect(g, 18 + (k % 3) * 32, 120 + Math.floor(k / 3) * 34, 26, 26, 5); g.fillStyle = "#e8e4dc"; g.fill(); otxt(g, String(k + 1), 31 + (k % 3) * 32, 134 + Math.floor(k / 3) * 34, 16, INK, INK, 0); }
  rrect(g, 44, 250, 40, 70, 8); g.fillStyle = "#c8c0b0"; g.fill(); g.fillStyle = INK; g.fillRect(60, 262, 8, 46);
  otxt(g, "CRUMBS", 64, 345, 18, "#ffd23a", INK, 0); otxt(g, "ONLY", 64, 368, 18, "#ffd23a", INK, 0);
  noise(g, 128, 512, r, 800, 0.04);
});
/** the STAFF ONLY entry door (front wall, outer face) and the EXIT door (back wall): a painted mint door */
export const doorTex = (label: "STAFF ONLY" | "CREW") => ctex("stDoor" + label.replace(" ", ""), 384, 1024, (g, r) => {
  const W = 384, H = 1024;
  g.fillStyle = label === "CREW" ? "#5ab8a8" : "#f0a43a"; g.fillRect(0, 0, W, H);
  for (const [y, h] of [[560, 380], [80, 120]] as [number, number][]) { rrect(g, 44, y, W - 88, h, 16); g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 8; g.stroke(); g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 4; g.stroke(); }
  rrect(g, 40, 250, W - 80, 220, 18); g.fillStyle = "#fff6e2"; g.fill(); g.strokeStyle = INK; g.lineWidth = 8; g.stroke();
  if (label === "STAFF ONLY") { otxt(g, "STAFF", W / 2, 320, 72, "#c8342c", INK, 0); otxt(g, "ONLY", W / 2, 400, 72, "#c8342c", INK, 0); }
  else { otxt(g, "CREW", W / 2, 320, 72, "#2a3150", INK, 0); otxt(g, "TO WORK", W / 2, 400, 52, "#2a3150", INK, 0); }
  g.strokeStyle = INK; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
  noise(g, W, H, r, 3000, 0.03);
});
/** the green glowing EXIT sign (emissive) */
export const exitTex = () => ctex("stExitSign", 256, 96, (g) => {
  g.fillStyle = "#1c8a4a"; g.fillRect(0, 0, 256, 96);
  otxt(g, "EXIT", 104, 50, 60, "#e8ffe8", "#0a3a1a", 6);
  g.fillStyle = "#e8ffe8"; g.beginPath(); g.moveTo(178, 30); g.lineTo(178, 70); g.lineTo(220, 50); g.closePath(); g.fill();
  g.fillRect(162, 42, 18, 16);
});
/** three LOCKERS (the crew's names on the labels, vents, a sticker) */
export const lockerTex = () => ctex("stLockers", 768, 960, (g, r) => {
  const names = ["GUS", "PIP", "MOPPY"], cols = ["#4a86c8", "#e8a43a", "#c860a0"];
  for (let i = 0; i < 3; i++) {
    const x = i * 256;
    g.fillStyle = cols[i]; g.fillRect(x, 0, 256, 960);
    g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(x + 10, 0, 24, 960);
    for (let k = 0; k < 6; k++) { rrect(g, x + 64, 70 + k * 26, 128, 12, 6); g.fillStyle = "rgba(20,20,30,0.6)"; g.fill(); }
    rrect(g, x + 58, 260, 140, 56, 8); g.fillStyle = "#fff6e2"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    otxt(g, names[i], x + 128, 290, 36, INK, INK, 0);
    rrect(g, x + 196, 470, 22, 90, 8); g.fillStyle = "#d8d0c0"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    for (let k = 0; k < 6; k++) { rrect(g, x + 64, 760 + k * 26, 128, 12, 6); g.fillStyle = "rgba(20,20,30,0.6)"; g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(x + 4, 4, 248, 952);
  }
  // stickers: a star, a heart, "I <3 CRUMBS"
  g.fillStyle = "#ffd23a"; g.strokeStyle = INK; g.lineWidth = 4; g.beginPath();
  for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 22 : 50; g.lineTo(128 + Math.cos(a) * rr, 420 + Math.sin(a) * rr); }
  g.closePath(); g.fill(); g.stroke();
  g.save(); g.translate(640, 400); g.rotate(0.15); rrect(g, -80, -30, 160, 60, 12); g.fillStyle = "#fff"; g.fill(); g.stroke(); otxt(g, "I ♥ MOPS", 0, 2, 28, "#e8343c", INK, 0); g.restore();
  noise(g, 768, 960, r, 6000, 0.03);
});
/** the punch-card TIME CLOCK face + the card rack */
export const timeClockTex = () => ctex("stTimeClock", 256, 320, (g, r) => {
  g.fillStyle = "#d8cfb8"; g.fillRect(0, 0, 256, 320);
  rrect(g, 28, 24, 200, 70, 10); g.fillStyle = "#2a2a30"; g.fill(); otxt(g, "IN / OUT", 128, 61, 40, "#ff6a48", INK, 0);
  otxt(g, "PUNCH IN", 128, 124, 30, "#2a3150", INK, 0);
  rrect(g, 70, 150, 116, 18, 6); g.fillStyle = "#1a1a1a"; g.fill();
  g.fillStyle = "#fff6e2"; g.fillRect(86, 100 + 60, 84, 110); g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(86, 160, 84, 110);
  for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(40,40,60,0.6)"; g.fillRect(96, 178 + k * 18, 64, 4); }
  g.fillStyle = "#e8343c"; g.fillRect(86, 160, 84, 12);
  g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(4, 4, 248, 312);
  noise(g, 256, 320, r, 1000, 0.03);
});
export const cardRackTex = () => ctex("stCardRack", 256, 256, (g, r) => {
  g.fillStyle = "#8a6a4a"; g.fillRect(0, 0, 256, 256);
  const cols = ["#e8343c", "#3a7fd0", "#ffd23a", "#4ab04a", "#c070e0", "#ff8a3a"];
  for (let k = 0; k < 6; k++) {
    const x = 14 + (k % 3) * 80, y = 18 + Math.floor(k / 3) * 120;
    g.fillStyle = "#fff6e2"; g.fillRect(x, y, 66, 100); g.fillStyle = cols[k]; g.fillRect(x, y, 66, 16);
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(x, y, 66, 100);
    g.fillStyle = "#5a3a2a"; g.fillRect(x - 4, y + 70, 74, 26);
  }
  noise(g, 256, 256, r, 800, 0.04);
});
/** "EMPLOYEE OF THE MONTH": a framed portrait of a smug little crew blob holding a mop */
export const employeeTex = () => ctex("stEmployee", 384, 480, (g, r) => {
  g.fillStyle = "#c89038"; g.fillRect(0, 0, 384, 480);
  g.fillStyle = "#fff6e2"; g.fillRect(24, 24, 336, 432);
  otxt(g, "EMPLOYEE", 192, 64, 40, "#c8342c", INK, 0); otxt(g, "OF THE MONTH", 192, 106, 30, "#2a3150", INK, 0);
  g.fillStyle = "#9ad0f0"; g.fillRect(64, 136, 256, 250);
  g.fillStyle = "#7ad05a"; g.strokeStyle = INK; g.lineWidth = 6; g.beginPath(); g.ellipse(192, 300, 80, 76, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ffd23a"; g.beginPath(); g.ellipse(192, 232, 70, 30, 0, Math.PI, 0); g.fill(); g.stroke(); g.fillRect(118, 226, 148, 12); g.strokeRect(118, 226, 148, 12);
  g.fillStyle = INK; g.beginPath(); g.arc(170, 284, 8, 0, 7); g.arc(214, 284, 8, 0, 7); g.fill();
  g.lineWidth = 5; g.beginPath(); g.arc(192, 310, 24, 0.2, Math.PI - 0.2); g.stroke();
  g.strokeStyle = "#c8864a"; g.lineWidth = 10; g.beginPath(); g.moveTo(276, 380); g.lineTo(300, 160); g.stroke();
  otxt(g, "GUS", 192, 420, 34, INK, INK, 0);
  g.strokeStyle = INK; g.lineWidth = 8; g.strokeRect(4, 4, 376, 472); g.strokeRect(24, 24, 336, 432);
  noise(g, 384, 480, r, 2000, 0.03);
});
/** the corridor seen through the open EXIT door (emissive): a glowing pink-orange stomach tunnel */
export const corridorTex = () => ctex("stCorridor", 256, 512, (g, r) => {
  const gr = g.createRadialGradient(128, 300, 10, 128, 300, 300); gr.addColorStop(0, "#fff0c0"); gr.addColorStop(0.3, "#ffb070"); gr.addColorStop(0.7, "#e86a6a"); gr.addColorStop(1, "#8a2a4a");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  for (let k = 0; k < 7; k++) { g.strokeStyle = `rgba(160,40,70,${0.25 + 0.05 * k})`; g.lineWidth = 6 + k * 2; g.beginPath(); g.ellipse(128, 300, 30 + k * 26, 50 + k * 40, 0, 0, 7); g.stroke(); }
  noise(g, 256, 512, r, 1500, 0.04);
});
/** small "COFFEE" label + mug faces */
export const coffeeTex = () => ctex("stCoffeeLabel", 256, 128, (g) => {
  g.fillStyle = "#2a2a30"; g.fillRect(0, 0, 256, 128);
  otxt(g, "COFFEE", 128, 46, 50, "#ffd27a", INK, 0); otxt(g, "(decaf? never)", 128, 96, 26, "#f4e2b8", INK, 0);
});
export const matTex = () => ctex("stDoorMat", 512, 256, (g, r) => {
  g.fillStyle = "#b8744a"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "90,50,30" : "220,160,110"},0.35)`; g.fillRect(r() * 512, r() * 256, 2, 5); }
  otxt(g, "GO GET 'EM", 256, 128, 64, "#fff3dc", "#5a2a18", 8);
  g.strokeStyle = "#5a2a18"; g.lineWidth = 14; g.strokeRect(7, 7, 498, 242);
});
