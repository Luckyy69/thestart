// OWNER: sets (funny). Hand-painted canvas textures for the HALLWAY (+ the kitchen behind it) and the anatomy MUSEUM.
// All <= 2048, cached by key (bridge/paint ctex). v 0 = top of the canvas = top of the plane.
import { ctex } from "../bridge/paint";
import { G, otxt, noise, blot, rrect, star } from "./sets_kit";

const SANS = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const SERIF = "'DejaVu Serif', 'Liberation Serif', Georgia, serif";
const txt = (g: G, s: string, x: number, y: number, px: number, col: string, font = SANS, weight = "bold", align: CanvasTextAlign = "center") => {
  g.font = `${weight} ${Math.round(px)}px ${font}`; g.textAlign = align; g.textBaseline = "middle"; g.fillStyle = col; g.fillText(s, x, y);
};
const scribble = (g: G, r: () => number, x: number, y: number, w: number, lines: number, lh: number, col: string) => {
  g.strokeStyle = col; g.lineCap = "round";
  for (let i = 0; i < lines; i++) { g.lineWidth = lh * 0.3; const L = w * (0.55 + r() * 0.45); g.beginPath(); g.moveTo(x, y + i * lh); for (let s = 0; s < L; s += 12) g.lineTo(x + s, y + i * lh + (r() - 0.5) * 3); g.stroke(); }
};

// ======================================================================== HALLWAY
/** warm honey floorboards along x (the hall's length): 0.13 m boards, 2 m tile (1024 px) */
export const boardsTex = () => ctex("fnBoards", 1024, 1024, (g, r) => {
  const n = 16, bw = 1024 / n;
  for (let i = 0; i < n; i++) {
    let x = -r() * 500;
    while (x < 1024) {
      const L = 300 + r() * 520;
      g.fillStyle = `hsl(${26 + r() * 9},${52 + r() * 14}%,${50 + r() * 11}%)`; g.fillRect(x, i * bw, L, bw);
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(105,50,18,${0.06 + r() * 0.12})`; g.lineWidth = 1 + r() * 2;
        const y0 = i * bw + 4 + r() * (bw - 8); g.beginPath(); g.moveTo(x, y0); g.bezierCurveTo(x + L * 0.3, y0 + (r() - 0.5) * 10, x + L * 0.7, y0 + (r() - 0.5) * 10, x + L, y0 + (r() - 0.5) * 6); g.stroke();
      }
      if (r() < 0.3) { g.strokeStyle = "rgba(95,45,15,0.3)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x + L * r(), i * bw + bw / 2, 15, 6, 0, 0, 7); g.stroke(); }
      g.fillStyle = "rgba(60,28,8,0.6)"; g.fillRect(x, i * bw, 2.5, bw);
      g.fillStyle = "rgba(255,225,170,0.25)"; g.fillRect(x + 2.5, i * bw, 2, bw);
      x += L;
    }
    g.fillStyle = "rgba(60,28,8,0.55)"; g.fillRect(0, i * bw, 1024, 2.5);
    g.fillStyle = "rgba(255,225,170,0.2)"; g.fillRect(0, i * bw + 2.5, 1024, 1.5);
  }
  for (let i = 0; i < 36; i++) blot(g, r() * 1024, r() * 1024, 80 + r() * 200, "255,238,200", 0.09, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.025);
});
/** cream wallpaper: soft vertical stripes + a tiny sprig; 1 m tile (512 px) */
export const paperTex = () => ctex("fnPaper", 512, 512, (g, r) => {
  g.fillStyle = "#fbf1dc"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = "rgba(236,206,160,0.55)"; g.fillRect(i * 64 + 6, 0, 22, 512);
    g.fillStyle = "rgba(220,180,130,0.35)"; g.fillRect(i * 64 + 34, 0, 3, 512);
  }
  for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) {
    const x = i * 64 + 49, y = j * 128 + (i % 2) * 64 + 30;
    g.strokeStyle = "rgba(150,170,110,0.55)"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y + 14); g.quadraticCurveTo(x + 2, y, x - 1, y - 10); g.stroke();
    g.fillStyle = "rgba(150,175,105,0.6)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 5, y + 2, 5, 2.5, s * 0.6, 0, 7); g.fill(); }
    g.fillStyle = "rgba(230,120,110,0.65)"; g.beginPath(); g.arc(x - 1, y - 12, 3.5, 0, 7); g.fill();
  }
  for (let i = 0; i < 30; i++) blot(g, r() * 512, r() * 512, 40 + r() * 100, r() < 0.5 ? "255,250,240" : "210,180,140", 0.12, 512, 512);
  noise(g, 0, 0, 512, 512, r, 4000, 0.025);
});
/** generic painted plaster (multiplied by the vertex colour); 2 m tile */
export const plasterTex = () => ctex("fnPlaster", 512, 512, (g, r) => {
  g.fillStyle = "#f2f2f2"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 512, 40 + r() * 120, r() < 0.5 ? "255,255,255" : "212,212,222", 0.25, 512, 512);
  noise(g, 0, 0, 512, 512, r, 5000, 0.03);
});
/** painted wainscot below the dado: raised panels (0.6 m wide repeat, 0.9 m tall), white */
export const wainscotTex = () => ctex("fnWains", 512, 768, (g, r) => {
  g.fillStyle = "#f6f2ea"; g.fillRect(0, 0, 512, 768);
  g.strokeStyle = "rgba(150,135,110,0.55)"; g.lineWidth = 7; rrect(g, 60, 90, 392, 560, 8); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 4; rrect(g, 68, 98, 376, 544, 6); g.stroke();
  g.strokeStyle = "rgba(160,145,120,0.3)"; g.lineWidth = 3; rrect(g, 88, 118, 336, 504, 4); g.stroke();
  for (let i = 0; i < 20; i++) blot(g, r() * 512, r() * 768, 40 + r() * 90, "200,190,170", 0.1, 512, 768);
  noise(g, 0, 0, 512, 768, r, 3000, 0.025);
});
/** the long red RUNNER rug (u along the hall): cream border, red field, a row of navy + mustard medallions, fringe */
export const runnerTex = () => ctex("fnRunner", 2048, 512, (g, r) => {
  g.fillStyle = "#c8352f"; g.fillRect(0, 0, 2048, 512);
  g.fillStyle = "#f1dcb0"; g.fillRect(0, 40, 2048, 40); g.fillRect(0, 432, 2048, 40);
  g.fillStyle = "#24315e"; g.fillRect(0, 80, 2048, 16); g.fillRect(0, 416, 2048, 16);
  // border zigzag
  g.fillStyle = "#c8352f"; for (let x = 0; x < 2048; x += 32) { g.beginPath(); g.moveTo(x, 80); g.lineTo(x + 16, 46); g.lineTo(x + 32, 80); g.fill(); g.beginPath(); g.moveTo(x, 432); g.lineTo(x + 16, 466); g.lineTo(x + 32, 432); g.fill(); }
  for (let i = 0; i < 6; i++) {
    const cx = 170 + i * 341, cy = 256;
    g.fillStyle = "#24315e"; g.beginPath(); g.moveTo(cx - 150, cy); g.lineTo(cx, cy - 130); g.lineTo(cx + 150, cy); g.lineTo(cx, cy + 130); g.closePath(); g.fill();
    g.fillStyle = "#e8b23a"; g.beginPath(); g.moveTo(cx - 105, cy); g.lineTo(cx, cy - 90); g.lineTo(cx + 105, cy); g.lineTo(cx, cy + 90); g.closePath(); g.fill();
    g.fillStyle = "#c8352f"; g.beginPath(); g.moveTo(cx - 60, cy); g.lineTo(cx, cy - 50); g.lineTo(cx + 60, cy); g.lineTo(cx, cy + 50); g.closePath(); g.fill();
    g.fillStyle = "#f1dcb0"; star(g, cx, cy, 24, 10, 8, 0); g.fill();
    g.fillStyle = "#e8b23a"; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 170, cy - 110, 12, 0, 7); g.fill(); g.beginPath(); g.arc(cx + s * 170, cy + 110, 12, 0, 7); g.fill(); }
  }
  // wear: a lighter worn path down the middle, fibres
  for (let i = 0; i < 40; i++) blot(g, r() * 2048, 200 + r() * 112, 60 + r() * 120, "255,220,190", 0.07, 2048, 512);
  for (let i = 0; i < 14000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.07)" : "rgba(255,230,200,0.07)"; g.fillRect(r() * 2048, r() * 512, 1, 3 + r() * 3); }
  g.strokeStyle = "rgba(241,220,176,0.9)"; g.lineWidth = 3; for (let x = 4; x < 2048; x += 9) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 4, 36); g.moveTo(x, 512); g.lineTo(x + (r() - 0.5) * 4, 476); g.stroke(); }
});
/** the LEFT jamb's victim log (a plane on the casing face): pencil tally marks + "OW!" + a little arrow */
export const tallyTex = () => ctex("fnTally", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  g.strokeStyle = "rgba(60,60,70,0.85)"; g.lineCap = "round"; g.lineWidth = 6;
  const group = (x: number, y: number, n: number) => {
    for (let i = 0; i < Math.min(4, n); i++) { g.beginPath(); g.moveTo(x + i * 16 + (r() - 0.5) * 3, y); g.lineTo(x + i * 16 + (r() - 0.5) * 4, y + 62); g.stroke(); }
    if (n >= 5) { g.beginPath(); g.moveTo(x - 8, y + 50); g.lineTo(x + 62, y + 10); g.stroke(); }
  };
  group(40, 40, 5); group(140, 40, 5); group(40, 130, 5); group(140, 130, 5); group(40, 220, 3);
  g.save(); g.translate(128, 360); g.rotate(-0.12); txt(g, "OW!", 0, 0, 74, "rgba(200,40,40,0.9)"); g.restore();
  g.strokeStyle = "rgba(200,40,40,0.85)"; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 410); g.lineTo(128, 470); g.moveTo(108, 450); g.lineTo(128, 472); g.lineTo(148, 450); g.stroke();
});
/** a photo in a frame: k 0 baby BEAN in a bath, 1 the dog, 2 a family portrait (BEAN + mum + dad), 3 BEAN with an arm sling */
export const photoTex = (k: number) => ctex("fnPhoto" + k, 512, 640, (g, r) => {
  g.fillStyle = "#fbf6ec"; g.fillRect(0, 0, 512, 640); // the mount
  const X = 56, Y = 56, Wd = 400, Hd = 528;
  const sky = ["#bfe6ff", "#ffe2a8", "#d8ecc8", "#ffd2d8"][k];
  const gr = g.createLinearGradient(0, Y, 0, Y + Hd); gr.addColorStop(0, sky); gr.addColorStop(1, "#fff6e4"); g.fillStyle = gr; g.fillRect(X, Y, Wd, Hd);
  g.save(); g.beginPath(); g.rect(X, Y, Wd, Hd); g.clip();
  g.lineWidth = 9; g.strokeStyle = "#2a1a14";
  const bean = (cx: number, cy: number, s: number, hair: string, shirt: string) => {
    g.fillStyle = shirt; g.beginPath(); g.ellipse(cx, cy + 150 * s, 95 * s, 110 * s, 0, Math.PI, 0); g.lineTo(cx + 95 * s, cy + 300 * s); g.lineTo(cx - 95 * s, cy + 300 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#ffd2a8"; g.beginPath(); g.ellipse(cx, cy, 80 * s, 92 * s, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = hair; g.beginPath(); g.ellipse(cx, cy - 62 * s, 74 * s, 38 * s, 0, Math.PI, 0); g.fill();
    g.fillStyle = "#2a1a14"; for (const sx of [-1, 1]) { g.beginPath(); g.arc(cx + sx * 26 * s, cy - 4 * s, 8 * s, 0, 7); g.fill(); }
    g.fillStyle = "#ff7a7a"; g.beginPath(); g.arc(cx, cy + 16 * s, 9 * s, 0, 7); g.fill();
    g.strokeStyle = "#2a1a14"; g.lineWidth = 6 * s; g.beginPath(); g.arc(cx, cy + 34 * s, 22 * s, 0.2, Math.PI - 0.2); g.stroke(); g.lineWidth = 9;
  };
  if (k === 0) {
    g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(256, 520, 240, 120, 0, 0, 7); g.fill();
    bean(256, 330, 0.95, "#6a3a1a", "#ffd2a8");
    g.fillStyle = "#ffffff"; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(70 + r() * 370, 430 + r() * 50, 22 + r() * 22, 0, 7); g.fill(); g.strokeStyle = "rgba(120,160,200,0.6)"; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = "#ffd23a"; g.beginPath(); g.ellipse(380, 420, 40, 30, 0, 0, 7); g.fill(); g.beginPath(); g.arc(405, 385, 22, 0, 7); g.fill();
    g.fillStyle = "#ff8a2a"; g.beginPath(); g.moveTo(424, 380); g.lineTo(450, 388); g.lineTo(424, 395); g.fill();
  } else if (k === 1) {
    g.fillStyle = "#8ac86a"; g.fillRect(X, Y + 380, Wd, 160);
    g.fillStyle = "#c8843a"; g.strokeStyle = "#2a1a14";
    g.beginPath(); g.ellipse(250, 430, 130, 80, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(250, 290, 100, 90, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#7a4a1a"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(250 + s * 95, 290, 32, 70, s * 0.3, 0, 7); g.fill(); g.stroke(); }
    g.fillStyle = "#2a1a14"; for (const s of [-1, 1]) { g.beginPath(); g.arc(250 + s * 36, 275, 11, 0, 7); g.fill(); }
    g.beginPath(); g.ellipse(250, 320, 22, 15, 0, 0, 7); g.fill();
    g.fillStyle = "#ff7a8a"; g.beginPath(); g.ellipse(262, 365, 16, 26, 0.2, 0, 7); g.fill();
    g.fillStyle = "#e8343c"; g.fillRect(170, 360, 160, 18);
  } else if (k === 2) {
    bean(140, 250, 0.7, "#3a2418", "#4a8ad8"); bean(372, 240, 0.72, "#a8582a", "#e86a8a"); bean(256, 340, 0.62, "#6a3a1a", "#ffd23a");
  } else {
    bean(256, 260, 0.95, "#6a3a1a", "#3a8ae8");
    g.fillStyle = "#ffffff"; g.strokeStyle = "#2a1a14"; rrect(g, 150, 430, 210, 70, 30); g.fill(); g.stroke();
    g.strokeStyle = "#d8d8d8"; g.lineWidth = 20; g.beginPath(); g.moveTo(170, 430); g.lineTo(256, 360); g.lineTo(340, 430); g.stroke();
  }
  g.restore();
  g.strokeStyle = "rgba(120,100,80,0.4)"; g.lineWidth = 4; g.strokeRect(X, Y, Wd, Hd);
  noise(g, 0, 0, 512, 640, r, 3000, 0.03);
});
/** HOME SWEET HOME cross-stitch sampler (a little house, hearts, a bean family) */
export const samplerTex = () => ctex("fnSampler", 768, 512, (g, r) => {
  g.fillStyle = "#f8f0dc"; g.fillRect(0, 0, 768, 512);
  g.strokeStyle = "rgba(180,160,120,0.25)"; g.lineWidth = 1; for (let i = 0; i < 768; i += 8) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); } for (let i = 0; i < 512; i += 8) { g.beginPath(); g.moveTo(0, i); g.lineTo(768, i); g.stroke(); }
  const xs = (cx: number, cy: number, col: string) => { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 3, cy - 3); g.lineTo(cx + 3, cy + 3); g.moveTo(cx + 3, cy - 3); g.lineTo(cx - 3, cy + 3); g.stroke(); };
  // stitched text via a hidden canvas pass: draw text, sample it into X stitches
  const off = document.createElement("canvas"); off.width = 768; off.height = 512; const o = off.getContext("2d")!;
  o.font = `bold 92px ${SANS}`; o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#000"; o.fillText("HOME", 384, 120); o.fillText("SWEET HOME", 384, 230);
  o.fillRect(300, 330, 168, 110); o.beginPath(); o.moveTo(280, 335); o.lineTo(384, 270); o.lineTo(488, 335); o.fill();
  const d = o.getImageData(0, 0, 768, 512).data;
  for (let y = 4; y < 512; y += 8) for (let x = 4; x < 768; x += 8) if (d[(y * 768 + x) * 4 + 3] > 128) xs(x, y, y < 280 ? "#c8302a" : y < 340 && Math.abs(x - 384) < 110 ? "#c8302a" : "#3a6ab0");
  g.fillStyle = "#e8c23a"; g.fillRect(366, 400, 36, 40);
  for (const [hx, hy] of [[110, 400], [658, 400]]) { g.fillStyle = "#e84a6a"; g.beginPath(); g.arc(hx - 18, hy, 22, 0, 7); g.arc(hx + 18, hy, 22, 0, 7); g.fill(); g.beginPath(); g.moveTo(hx - 40, hy + 6); g.lineTo(hx, hy + 52); g.lineTo(hx + 40, hy + 6); g.fill(); }
  g.strokeStyle = "#3a8a4a"; g.lineWidth = 4; g.setLineDash([10, 6]); g.strokeRect(24, 24, 720, 464); g.setLineDash([]);
  noise(g, 0, 0, 768, 512, r, 2000, 0.03);
});
/** the kitchen floor: buttercup + cream checker tiles 0.3 m (2 per 0.6 m, 512 px = 0.6 m) */
export const checkerTex = () => ctex("fnChecker", 512, 512, (g, r) => {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = (i + j) % 2 ? "#ffd24a" : "#fff6dc"; g.fillRect(i * 256, j * 256, 256, 256);
    blot(g, i * 256 + 128, j * 256 + 128, 160, "255,255,255", 0.15, 512, 512);
  }
  g.strokeStyle = "rgba(150,120,70,0.5)"; g.lineWidth = 4; for (const k of [0, 256, 512]) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 512); g.moveTo(0, k); g.lineTo(512, k); g.stroke(); }
  noise(g, 0, 0, 512, 512, r, 3000, 0.03);
});
/** white subway tiles (backsplash): 0.6 x 0.6 m tile */
export const subwayTex = () => ctex("fnSubway", 512, 512, (g, r) => {
  g.fillStyle = "#d8d4cc"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) {
    const x = i * 128 + (j % 2) * 64, y = j * 64;
    g.fillStyle = `hsl(48,${30 + r() * 20}%,${94 + r() * 4}%)`; rrect(g, x + 3, y + 3, 122, 58, 6); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x + 10, y + 8, 60, 6);
  }
  noise(g, 0, 0, 512, 512, r, 1500, 0.02);
});
/** the FRIDGE door: magnets, a crayon drawing of BEAN with a sore elbow, a shopping list, a "MON: LAUNDRY" chore chart */
export const fridgeTex = () => ctex("fnFridge", 512, 1024, (g, r) => {
  g.fillStyle = "#f4f6fa"; g.fillRect(0, 0, 512, 1024);
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, "rgba(255,255,255,0.5)"); gr.addColorStop(0.5, "rgba(255,255,255,0)"); gr.addColorStop(1, "rgba(180,190,210,0.25)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 1024);
  g.fillStyle = "rgba(150,160,180,0.6)"; g.fillRect(0, 372, 512, 8); // freezer split
  // crayon drawing
  g.save(); g.translate(170, 190); g.rotate(-0.06);
  g.fillStyle = "#ffffff"; g.fillRect(-130, -150, 260, 300); g.strokeStyle = "rgba(0,0,0,0.12)"; g.strokeRect(-130, -150, 260, 300);
  g.lineWidth = 7; g.lineCap = "round"; g.strokeStyle = "#3a6ad8"; g.beginPath(); g.arc(0, -50, 46, 0, 7); g.stroke();
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 6; g.beginPath(); g.moveTo(-14, -60); g.lineTo(-14, -52); g.moveTo(14, -60); g.lineTo(14, -52); g.stroke();
  g.beginPath(); g.arc(0, -24, 16, Math.PI + 0.3, -0.3); g.stroke();
  g.strokeStyle = "#e8343c"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 70); g.moveTo(0, 20); g.lineTo(-60, 40); g.moveTo(0, 20); g.lineTo(60, 0); g.moveTo(0, 70); g.lineTo(-30, 120); g.moveTo(0, 70); g.lineTo(30, 120); g.stroke();
  g.strokeStyle = "#ffb000"; g.lineWidth = 5; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-70 - k * 10, 30 + k * 16); g.lineTo(-90 - k * 10, 20 + k * 16); g.stroke(); }
  txt(g, "OW", -78, -10, 30, "#e8343c");
  txt(g, "by Bean", 60, 128, 24, "#7a4ad8", SANS, "bold");
  g.restore();
  // magnets
  const mag = (x: number, y: number, c: string) => { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(x + 3, y + 4, 17, 0, 7); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, 17, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.arc(x - 5, y - 6, 5, 0, 7); g.fill(); };
  mag(170, 50, "#e8343c");
  // shopping list
  g.save(); g.translate(370, 210); g.rotate(0.05);
  g.fillStyle = "#fff59a"; g.fillRect(-90, -110, 180, 240);
  txt(g, "LIST", 0, -80, 30, "#2a2a6a");
  g.font = `bold 24px ${SANS}`; g.textAlign = "left"; g.fillStyle = "#2a2a6a";
  ["milk", "eggs", "band-aids", "MORE", "band-aids", "pillow?"].forEach((s, i) => g.fillText(s, -72, -40 + i * 30));
  g.restore(); mag(370, 105, "#3a8ae8");
  // chore chart
  g.save(); g.translate(256, 640); g.rotate(-0.02);
  g.fillStyle = "#ffffff"; g.fillRect(-190, -150, 380, 300);
  txt(g, "CHORES", 0, -118, 34, "#e86a2a");
  const rows = ["MON  laundry", "TUE  dishes", "WED  laundry", "THU  bins"];
  g.font = `bold 26px ${SANS}`; g.textAlign = "left";
  rows.forEach((s, i) => { g.fillStyle = "#2a2a3a"; g.fillText(s, -160, -60 + i * 50); g.fillStyle = i === 0 ? "#3ab83a" : "#d8d8d8"; star(g, 150, -60 + i * 50, 18, 8); g.fill(); });
  g.restore(); mag(256, 500, "#ffc23a"); mag(120, 780, "#7ad07a");
  // a cute fruit magnet + a letter magnet
  g.fillStyle = "#e8343c"; g.beginPath(); g.arc(400, 860, 30, 0, 7); g.fill(); g.fillStyle = "#3a9a3a"; g.beginPath(); g.ellipse(410, 828, 12, 6, 0.5, 0, 7); g.fill();
  otxt(g, "B", 100, 900, 64, "#3a8ae8", "#1a2a5a", 6);
  noise(g, 0, 0, 512, 1024, r, 2000, 0.02);
});
/** the garden outside the kitchen window (emissive): morning sky, a fence, a washing line with socks(!), a tree */
export const gardenTex = () => ctex("fnGarden", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#8cc8f8"); gr.addColorStop(0.5, "#cfe8fb"); gr.addColorStop(0.62, "#fff1d4"); gr.addColorStop(1, "#fff1d4");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 7; i++) blot(g, r() * 1024, 80 + r() * 260, 70 + r() * 90, "255,255,255", 0.8, 1024, 1024);
  g.fillStyle = "#5aa64a"; g.beginPath(); g.arc(800, 470, 230, 0, 7); g.fill(); g.fillStyle = "#6ab85a"; g.beginPath(); g.arc(740, 420, 150, 0, 7); g.fill();
  g.fillStyle = "#7a5a3a"; g.fillRect(780, 600, 40, 200);
  g.fillStyle = "#a8d888"; g.fillRect(0, 700, 1024, 324);
  g.fillStyle = "#e8d4b0"; for (let x = 0; x < 1024; x += 60) { g.fillRect(x, 610, 44, 170); g.beginPath(); g.moveTo(x, 610); g.lineTo(x + 22, 586); g.lineTo(x + 44, 610); g.fill(); }
  g.fillStyle = "#d4bc94"; g.fillRect(0, 640, 1024, 14); g.fillRect(0, 730, 1024, 14);
  // washing line with socks + a striped tee
  g.strokeStyle = "#5a5a5a"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 470); g.quadraticCurveTo(512, 540, 1024, 460); g.stroke();
  const cols = ["#e8343c", "#3a8ae8", "#ffc23a", "#7ad07a", "#e86ab4"];
  for (let i = 0; i < 6; i++) { const x = 90 + i * 140, y = 470 + 60 * Math.sin((x / 1024) * Math.PI) * 0.9; g.fillStyle = cols[i % 5]; rrect(g, x - 16, y, 32, 70, 8); g.fill(); g.beginPath(); g.ellipse(x + 8, y + 72, 22, 13, 0, 0, 7); g.fill(); }
  g.fillStyle = "#ffd23a"; g.fillRect(450, 520, 120, 110); g.fillStyle = "#e8343c"; for (let k = 0; k < 4; k++) g.fillRect(450, 534 + k * 26, 120, 10);
  for (let i = 0; i < 60; i++) { g.fillStyle = ["#ff6a8a", "#ffffff", "#ffd23a"][i % 3]; g.beginPath(); g.arc(r() * 1024, 780 + r() * 200, 5 + r() * 5, 0, 7); g.fill(); }
});
/** a wall calendar: "MAY", a cat photo, a grid with a few doodles */
export const calendarTex = () => ctex("fnCal", 384, 576, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 384, 576);
  g.fillStyle = "#ffd2a0"; g.fillRect(20, 20, 344, 230);
  g.fillStyle = "#e8943a"; g.beginPath(); g.ellipse(192, 170, 90, 70, 0, 0, 7); g.fill(); g.beginPath(); g.arc(192, 100, 60, 0, 7); g.fill();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(192 + s * 50, 80); g.lineTo(192 + s * 60, 30); g.lineTo(192 + s * 20, 55); g.fill(); }
  g.fillStyle = "#2a1a14"; for (const s of [-1, 1]) { g.beginPath(); g.arc(192 + s * 22, 98, 7, 0, 7); g.fill(); }
  txt(g, "MAY", 192, 290, 52, "#e8343c");
  g.strokeStyle = "rgba(60,60,80,0.4)"; g.lineWidth = 2;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 7; i++) { g.strokeRect(24 + i * 48, 330 + j * 46, 48, 46); }
  g.strokeStyle = "rgba(220,40,40,0.85)"; g.lineWidth = 4; for (const [i, j] of [[1, 0], [3, 1], [1, 2], [5, 3]]) { g.beginPath(); g.arc(48 + i * 48, 353 + j * 46, 18, 0, 7); g.stroke(); }
  noise(g, 0, 0, 384, 576, r, 800, 0.02);
});
/** the kitchen clock face */
export const kClockTex = () => ctex("fnKClock", 512, 512, (g) => {
  g.fillStyle = "#fffdf4"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = "#e8343c"; g.beginPath(); g.arc(256 + Math.sin(a) * 200, 256 - Math.cos(a) * 200, k % 3 ? 10 : 18, 0, 7); g.fill(); }
  g.strokeStyle = "#1a1a24"; g.lineCap = "round"; g.lineWidth = 16; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + 70, 256 - 90); g.stroke();
  g.lineWidth = 10; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 - 20, 256 - 170); g.stroke();
  g.fillStyle = "#1a1a24"; g.beginPath(); g.arc(256, 256, 16, 0, 7); g.fill();
});

// ======================================================================== MUSEUM
/** dark honey basket-weave parquet: squares of 4 strips, alternating direction; 1.2 m tile (1024 px = 4 x 4 squares) */
export const parquetTex = () => ctex("fnParquet", 1024, 1024, (g, r) => {
  g.fillStyle = "#4a2810"; g.fillRect(0, 0, 1024, 1024);
  const S = 256, n = 4, sw = S / n;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const hor = (i + j) % 2 === 0;
    for (let k = 0; k < n; k++) {
      const x = i * S + (hor ? 0 : k * sw), y = j * S + (hor ? k * sw : 0), w = hor ? S : sw, h = hor ? sw : S;
      g.fillStyle = `hsl(${24 + r() * 10},${46 + r() * 16}%,${30 + r() * 13}%)`; g.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
      for (let q = 0; q < 4; q++) {
        g.strokeStyle = `rgba(50,20,6,${0.1 + r() * 0.14})`; g.lineWidth = 1.5; g.beginPath();
        if (hor) { const yy = y + 5 + r() * (sw - 10); g.moveTo(x + 3, yy); g.bezierCurveTo(x + S * 0.3, yy + (r() - 0.5) * 5, x + S * 0.7, yy + (r() - 0.5) * 5, x + S - 3, yy + (r() - 0.5) * 3); }
        else { const xx = x + 5 + r() * (sw - 10); g.moveTo(xx, y + 3); g.bezierCurveTo(xx + (r() - 0.5) * 5, y + S * 0.3, xx + (r() - 0.5) * 5, y + S * 0.7, xx + (r() - 0.5) * 3, y + S - 3); }
        g.stroke();
      }
      g.fillStyle = "rgba(255,215,160,0.14)"; if (hor) g.fillRect(x + 2, y + 2, w - 4, 3); else g.fillRect(x + 2, y + 2, 3, h - 4);
    }
  }
  for (let i = 0; i < 40; i++) blot(g, r() * 1024, r() * 1024, 90 + r() * 200, r() < 0.6 ? "255,220,170" : "40,20,8", 0.08, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.03);
});
/** deep green DAMASK wallpaper: gold-ish motifs, 0.8 m tile */
export const damaskTex = () => ctex("fnDamask", 512, 512, (g, r) => {
  g.fillStyle = "#357058"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 40; i++) blot(g, r() * 512, r() * 512, 50 + r() * 110, r() < 0.5 ? "70,120,90" : "20,50,36", 0.2, 512, 512);
  const motif = (cx: number, cy: number) => {
    g.fillStyle = "rgba(160,190,120,0.42)"; g.strokeStyle = "rgba(200,200,130,0.4)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(cx, cy - 110);
    g.bezierCurveTo(cx + 60, cy - 70, cx + 80, cy - 10, cx + 30, cy + 20); g.bezierCurveTo(cx + 70, cy + 40, cx + 50, cy + 100, cx, cy + 115);
    g.bezierCurveTo(cx - 50, cy + 100, cx - 70, cy + 40, cx - 30, cy + 20); g.bezierCurveTo(cx - 80, cy - 10, cx - 60, cy - 70, cx, cy - 110); g.fill(); g.stroke();
    g.fillStyle = "rgba(20,60,40,0.6)"; g.beginPath(); g.ellipse(cx, cy, 18, 40, 0, 0, 7); g.fill();
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 30, cy - 50, 10, 24, s * 0.5, 0, 7); g.fill(); }
  };
  motif(128, 128); motif(384, 384); motif(384 - 512, 384); motif(128 + 512, 128); motif(128, 128 + 512); motif(384, 384 - 512);
  noise(g, 0, 0, 512, 512, r, 4000, 0.04);
});
/** dark wood panelling (museum wainscot): 1 m x 1 m tile */
export const panelTex = () => ctex("fnMuPanel", 512, 512, (g, r) => {
  g.fillStyle = "#5a3018"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2; i++) {
    const x = i * 256;
    g.fillStyle = "#6a3a1c"; g.fillRect(x + 26, 40, 204, 400);
    for (let k = 0; k < 10; k++) { g.strokeStyle = `rgba(30,12,4,${0.1 + r() * 0.15})`; g.lineWidth = 2; const xx = x + 30 + r() * 196; g.beginPath(); g.moveTo(xx, 42); g.bezierCurveTo(xx + 10, 160, xx - 10, 300, xx + 4, 438); g.stroke(); }
    g.strokeStyle = "rgba(255,200,140,0.25)"; g.lineWidth = 4; g.strokeRect(x + 26, 40, 204, 400);
    g.strokeStyle = "rgba(20,8,2,0.6)"; g.lineWidth = 4; g.strokeRect(x + 30, 44, 204, 400);
  }
  noise(g, 0, 0, 512, 512, r, 4000, 0.035);
});
/** warm limestone plaster (back + right walls) with faint blocks; 2 m tile */
export const stoneTex = () => ctex("fnStone", 512, 512, (g, r) => {
  g.fillStyle = "#efe2c4"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) {
    const x = i * 256 + (j % 2) * 128, y = j * 128;
    g.fillStyle = `hsl(${38 + r() * 6},${36 + r() * 12}%,${80 + r() * 6}%)`; g.fillRect(x + 2, y + 2, 252, 124); g.fillRect(x + 2 - 512, y + 2, 252, 124);
  }
  g.fillStyle = "rgba(150,120,80,0.35)"; for (let j = 0; j <= 4; j++) g.fillRect(0, j * 128 - 2, 512, 3);
  for (let i = 0; i < 50; i++) blot(g, r() * 512, r() * 512, 30 + r() * 90, r() < 0.5 ? "255,250,235" : "170,140,100", 0.14, 512, 512);
  noise(g, 0, 0, 512, 512, r, 5000, 0.035);
});
/** the HALL OF ANATOMY banner (over the back arch) */
export const bannerTex = () => ctex("fnBanner", 2048, 512, (g, r) => {
  g.fillStyle = "#7a1c22"; g.fillRect(0, 0, 2048, 512);
  g.strokeStyle = "#e8c060"; g.lineWidth = 14; g.strokeRect(24, 24, 2000, 464); g.lineWidth = 4; g.strokeRect(46, 46, 1956, 420);
  txt(g, "HALL OF ANATOMY", 1024, 214, 142, "#f4d690", SERIF, "bold"); // (qa2) 170 -> 142: the H and Y ran under the bone ornaments
  txt(g, "~  BONES  ·  BRAINS  ·  BITS  ~", 1024, 380, 70, "#e8c070", SERIF, "bold");
  for (const x of [130, 1918]) { g.fillStyle = "#f4d690"; g.beginPath(); g.ellipse(x, 256, 34, 80, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x, 160, 40, 0, 7); g.arc(x, 352, 40, 0, 7); g.fill(); }
  noise(g, 0, 0, 2048, 512, r, 8000, 0.04);
});
/** the stanchion sign: PLEASE DO NOT TOUCH THE BONES (+ a handwritten "they're ticklish") */
export const touchTex = () => ctex("fnTouch", 1024, 512, (g, r) => {
  g.fillStyle = "#f8f0dc"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = "#7a1c22"; g.lineWidth = 18; g.strokeRect(14, 14, 996, 484);
  txt(g, "PLEASE", 512, 92, 70, "#7a1c22", SERIF);
  txt(g, "DO NOT TOUCH", 512, 190, 110, "#1a1410", SERIF);
  txt(g, "THE BONES", 512, 298, 110, "#1a1410", SERIF);
  g.save(); g.translate(560, 418); g.rotate(-0.05); txt(g, "(they're ticklish)", 0, 0, 58, "#2a4ab8", SANS, "italic bold"); g.restore();
  noise(g, 0, 0, 1024, 512, r, 3000, 0.03);
});
/** engraved brass plate: lines of text (deep engraving + a bevelled border) */
export const brassTex = (key: string, lines: [string, number][], w = 1024, h = 256) => ctex("fnBrass" + key, w, h, (g, r) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#f4d27a"); gr.addColorStop(0.45, "#c89838"); gr.addColorStop(0.6, "#e8c060"); gr.addColorStop(1, "#a87828");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(90,60,10,0.8)"; g.lineWidth = h * 0.04; g.strokeRect(h * 0.06, h * 0.06, w - h * 0.12, h - h * 0.12);
  g.strokeStyle = "rgba(255,240,190,0.7)"; g.lineWidth = h * 0.015; g.strokeRect(h * 0.1, h * 0.1, w - h * 0.2, h - h * 0.2);
  const n = lines.length;
  lines.forEach(([s, px], i) => {
    const y = h * (0.5 + (i - (n - 1) / 2) * 0.34);
    txt(g, s, w / 2 + 2, y + 3, px, "rgba(255,240,190,0.6)", SERIF); txt(g, s, w / 2, y, px, "#3a2408", SERIF);
  });
  for (let i = 0; i < 400; i++) { g.strokeStyle = `rgba(255,250,220,${0.05 + r() * 0.08})`; g.lineWidth = 1; const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - 0.5) * 6); g.stroke(); }
});
/** an anatomy chart: k 0 THE HUMAN SKELETON (206 bones), k 1 THE NERVES (the ulnar nerve highlighted: "OUCH ->") */
export const chartTex = (k: number) => ctex("fnChart" + k, 768, 1024, (g, r) => {
  g.fillStyle = "#f2e6c8"; g.fillRect(0, 0, 768, 1024);
  for (let i = 0; i < 30; i++) blot(g, r() * 768, r() * 1024, 60 + r() * 160, "190,150,90", 0.1, 768, 1024);
  txt(g, k === 0 ? "THE HUMAN SKELETON" : "THE NERVOUS SYSTEM", 384, 70, 50, "#3a2410", SERIF);
  txt(g, k === 0 ? "206 bones (approx.)" : "fig. 7: the ulnar nerve", 384, 122, 30, "#6a4a2a", SERIF, "italic");
  const cx = 384, sk = k === 0 ? "#fbf6e8" : "#f2c8a8";
  g.lineWidth = 8; g.strokeStyle = "#3a2410"; g.fillStyle = sk; g.lineCap = "round";
  // a simple standing figure
  g.beginPath(); g.ellipse(cx, 230, 62, 74, 0, 0, 7); g.fill(); g.stroke();
  const limb = (x0: number, y0: number, x1: number, y1: number, w: number) => { g.lineWidth = w + 10; g.strokeStyle = "#3a2410"; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.lineWidth = w; g.strokeStyle = sk; g.stroke(); };
  limb(cx, 300, cx, 590, 34);
  if (k === 0) for (let i = 0; i < 7; i++) { g.lineWidth = 7; g.strokeStyle = "#3a2410"; g.beginPath(); g.ellipse(cx, 360 + i * 30, 90 - i * 4, 12, 0, 0, Math.PI); g.stroke(); }
  limb(cx - 70, 330, cx - 130, 470, 20); limb(cx - 130, 470, cx - 150, 610, 18); limb(cx + 70, 330, cx + 130, 470, 20); limb(cx + 130, 470, cx + 150, 610, 18);
  limb(cx - 70, 330, cx + 70, 330, 18);
  limb(cx - 40, 600, cx - 60, 780, 24); limb(cx - 60, 780, cx - 60, 930, 20); limb(cx + 40, 600, cx + 60, 780, 24); limb(cx + 60, 780, cx + 60, 930, 20);
  limb(cx - 60, 600, cx + 60, 600, 24);
  if (k === 0) {
    g.strokeStyle = "#3a2410"; g.lineWidth = 6; g.fillStyle = "#3a2410"; for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 24, 220, 14, 0, 7); g.fill(); }
    g.beginPath(); g.moveTo(cx - 26, 268); g.lineTo(cx + 26, 268); g.stroke();
    // labels with leader lines, one is HUMERUS
    const lab = (s: string, x0: number, y0: number, tx: number, ty: number, hi = false) => {
      g.strokeStyle = "#6a4a2a"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(tx, ty); g.stroke();
      txt(g, s, tx + (tx < cx ? -6 : 6), ty, hi ? 30 : 24, hi ? "#b82a20" : "#3a2410", SERIF, "bold", tx < cx ? "right" : "left");
    };
    lab("SKULL", cx + 50, 200, 600, 180); lab("HUMERUS", cx - 100, 400, 170, 390, true); lab("RIBS", cx + 60, 400, 600, 400); lab("FEMUR", cx - 50, 700, 190, 700); lab("PATELLA", cx + 60, 780, 610, 790);
  } else {
    // the nerve tree in yellow; the ulnar nerve along the arm in orange with OUCH
    g.strokeStyle = "#e8b020"; g.lineWidth = 5;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, 320); g.quadraticCurveTo(cx + s * 80, 340, cx + s * 130, 470); g.lineTo(cx + s * 150, 610); g.stroke(); g.beginPath(); g.moveTo(cx, 590); g.lineTo(cx + s * 60, 780); g.lineTo(cx + s * 60, 930); g.stroke(); }
    g.strokeStyle = "#e8541a"; g.lineWidth = 9; g.beginPath(); g.moveTo(cx - 60, 330); g.quadraticCurveTo(cx - 120, 420, cx - 136, 470); g.lineTo(cx - 156, 612); g.stroke();
    g.fillStyle = "#e8541a"; g.beginPath(); g.arc(cx - 132, 470, 14, 0, 7); g.fill();
    txt(g, "ULNAR NERVE", 150, 530, 30, "#b82a20", SERIF, "bold");
    txt(g, "(the 'funny' bit)", 150, 566, 24, "#6a4a2a", SERIF, "italic");
    g.strokeStyle = "#b82a20"; g.lineWidth = 3; g.beginPath(); g.moveTo(170, 505); g.lineTo(cx - 146, 478); g.stroke();
  }
  g.strokeStyle = "rgba(90,60,30,0.6)"; g.lineWidth = 10; g.strokeRect(10, 10, 748, 1004);
  noise(g, 0, 0, 768, 1024, r, 5000, 0.035);
});
/** a small museum case label: title + catalogue line */
export const labelTex = (key: string, a: string, b: string) => ctex("fnLabel" + key, 512, 256, (g, r) => {
  g.fillStyle = "#f8f0dc"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#3a2410"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 236);
  txt(g, a, 256, 100, 54, "#1a1410", SERIF);
  txt(g, b, 256, 182, 34, "#6a4a2a", SERIF, "italic");
  noise(g, 0, 0, 512, 256, r, 800, 0.03);
});
/** the sticker on the cheap 2026 frame */
export const stickerTex = () => ctex("fnSticker", 256, 256, (g) => {
  g.fillStyle = "#ffd23a"; star(g, 128, 128, 124, 100, 16, 0); g.fill();
  txt(g, "SALE", 128, 92, 44, "#e8343c"); txt(g, "4.99", 128, 156, 64, "#1a1a1a");
});
/** the sky seen up through the skylight (emissive): warm late-afternoon */
export const skyTex = () => ctex("fnMuSky", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#9ac0e8"); gr.addColorStop(1, "#ffe0b0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6; i++) blot(g, r() * 512, r() * 512, 60 + r() * 80, "255,240,220", 0.6, 512, 512);
});
/** the view out of the museum's arched windows (emissive): golden late-afternoon sky, rooftops */
export const muOutTex = () => ctex("fnMuOut", 1024, 1024, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#a8c4e0"); gr.addColorStop(0.55, "#ffe0a8"); gr.addColorStop(0.75, "#ffc888"); gr.addColorStop(1, "#ffc888");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 6; i++) blot(g, r() * 1024, 100 + r() * 300, 80 + r() * 120, "255,245,225", 0.7, 1024, 1024);
  g.fillStyle = "#c89a7a"; for (let i = 0; i < 9; i++) { const x = i * 120 + r() * 30, h = 120 + r() * 160; g.fillRect(x, 1024 - 260 - h, 100, h + 260); g.beginPath(); g.moveTo(x - 10, 1024 - 260 - h); g.lineTo(x + 50, 1024 - 320 - h); g.lineTo(x + 110, 1024 - 260 - h); g.fill(); }
  g.fillStyle = "#ffe8b0"; for (let i = 0; i < 30; i++) g.fillRect(r() * 1024, 700 + r() * 250, 14, 20);
});
/** dents + paint chips on the LEFT jamb at elbow height (transparent decal; centre = the BONK spot) */
export const dentTex = () => ctex("fnDent", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512);
  for (let i = 0; i < 9; i++) {
    const x = 60 + r() * 150, y = 170 + r() * 190, s = 8 + r() * 16;
    g.fillStyle = "rgba(150,140,125,0.55)"; g.beginPath(); g.ellipse(x, y, s * 1.4, s, r() * 3, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,0.9)"; g.beginPath(); g.ellipse(x - 2, y - 3, s * 0.9, s * 0.5, 0.3, 0, 7); g.fill();
  }
  for (let i = 0; i < 7; i++) {
    const x = 40 + r() * 190, y = 190 + r() * 150;
    g.fillStyle = "rgba(150,95,45,0.95)"; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, rr = 5 + r() * 11; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7); }
    g.closePath(); g.fill(); g.strokeStyle = "rgba(90,60,30,0.8)"; g.lineWidth = 2; g.stroke();
  }
});
/** red + white gingham (cafe curtain) */
export const ginghamTex = () => ctex("fnGingham", 128, 128, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "rgba(220,50,50,0.55)"; for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 16, 128); g.fillRect(0, i * 32, 128, 16); }
});
/** cream marble with soft grey veins */
export const marbleTex = () => ctex("fnMarble", 512, 512, (g, r) => {
  g.fillStyle = "#f6efe0"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 30; i++) blot(g, r() * 512, r() * 512, 40 + r() * 120, r() < 0.5 ? "255,255,250" : "220,205,180", 0.2, 512, 512);
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(140,125,110,${0.2 + r() * 0.25})`; g.lineWidth = 1 + r() * 3;
    let x = r() * 512, y = 0; g.beginPath(); g.moveTo(x, y);
    while (y < 512) { x += (r() - 0.45) * 40; y += 20 + r() * 30; g.lineTo(x, y); }
    g.stroke();
  }
  noise(g, 0, 0, 512, 512, r, 3000, 0.02);
});
