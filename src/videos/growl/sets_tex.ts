// OWNER: sets (growl). Hand-painted canvas textures for the exam HALL (all <= 2048, cached by key).
import { ctex } from "../bridge/paint";
import { G, otxt, noise, blot, rrect } from "./sets_kit";

const FNT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
/** polished honey-oak strip floor: staggered planks 0.14 m wide; 2 m tile (1024 px) */
export const oakTex = () => ctex("grhOak", 1024, 1024, (g, r) => {
  const n = 14, bw = 1024 / n;
  for (let i = 0; i < n; i++) {
    let y = -r() * 400;
    while (y < 1024) {
      const L = 260 + r() * 460;
      g.fillStyle = `hsl(${28 + r() * 8},${50 + r() * 16}%,${54 + r() * 10}%)`; g.fillRect(i * bw, y, bw, L);
      for (let k = 0; k < 7; k++) {
        g.strokeStyle = `rgba(110,55,20,${0.06 + r() * 0.1})`; g.lineWidth = 1 + r() * 2;
        const x0 = i * bw + 4 + r() * (bw - 8); g.beginPath(); g.moveTo(x0, y); g.bezierCurveTo(x0 + (r() - 0.5) * 10, y + L * 0.3, x0 + (r() - 0.5) * 10, y + L * 0.7, x0 + (r() - 0.5) * 6, y + L); g.stroke();
      }
      if (r() < 0.25) { g.strokeStyle = "rgba(100,50,20,0.25)"; g.lineWidth = 2; g.beginPath(); g.ellipse(i * bw + bw / 2, y + L * r(), 6, 14, 0, 0, 7); g.stroke(); }
      g.fillStyle = "rgba(70,35,10,0.55)"; g.fillRect(i * bw, y, bw, 2.5);
      y += L;
    }
    g.fillStyle = "rgba(70,35,10,0.5)"; g.fillRect(i * bw, 0, 2.5, 1024);
  }
  for (let i = 0; i < 40; i++) blot(g, r() * 1024, r() * 1024, 80 + r() * 200, "255,240,210", 0.1, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.025);
});
/** painted plaster (multiplied by vertex colour): soft mottling; 2 m tile */
export const plasterTex = () => ctex("grhPlaster", 512, 512, (g, r) => {
  g.fillStyle = "#f4f4f4"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) blot(g, r() * 512, r() * 512, 40 + r() * 120, r() < 0.5 ? "255,255,255" : "215,215,225", 0.25, 512, 512);
  noise(g, 0, 0, 512, 512, r, 5000, 0.03);
});
/** wood panelling for the dado (vertical boards) 1.2 m x 1 m tile */
export const panelTex = () => ctex("grhPanel", 512, 512, (g, r) => {
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `hsl(${24 + r() * 6},${42 + r() * 10}%,${46 + r() * 6}%)`; g.fillRect(i * 85.3, 0, 85.3, 512);
    for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(80,40,15,${0.08 + r() * 0.1})`; g.lineWidth = 1.5; const x = i * 85.3 + 6 + r() * 72; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 8, 512); g.stroke(); }
    g.fillStyle = "rgba(50,25,8,0.6)"; g.fillRect(i * 85.3, 0, 3, 512);
    g.fillStyle = "rgba(255,230,190,0.18)"; g.fillRect(i * 85.3 + 3, 0, 3, 512);
  }
  noise(g, 0, 0, 512, 512, r, 3000, 0.03);
});
/** the BLACKBOARD: green chalkboard, "EXAM" + "NO TALKING", chalk smudges, a date, a doodle */
export const boardTex = () => ctex("grhBoard", 2048, 768, (g, r) => {
  g.fillStyle = "#2f5a48"; g.fillRect(0, 0, 2048, 768);
  for (let i = 0; i < 70; i++) blot(g, r() * 2048, r() * 768, 60 + r() * 200, "255,255,255", 0.045, 2048, 768);
  for (let i = 0; i < 14; i++) { g.strokeStyle = "rgba(255,255,255,0.06)"; g.lineWidth = 40 + r() * 40; g.lineCap = "round"; const x = r() * 2048, y = r() * 768; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 150, y - 60 + r() * 120, x + 300 + r() * 200, y + (r() - 0.5) * 80); g.stroke(); }
  const chalk = (s: string, x: number, y: number, px: number, col: string, rot = 0) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.font = `bold ${px}px ${FNT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = col; g.fillText(s, 0, 0);
    g.globalCompositeOperation = "destination-out"; for (let i = 0; i < px * 9; i++) { g.fillStyle = `rgba(0,0,0,${0.25 + r() * 0.4})`; g.fillRect((r() - 0.5) * s.length * px * 0.7, (r() - 0.5) * px, 2 + r() * 3, 1.5 + r() * 2); }
    g.restore();
  };
  chalk("EXAM", 1024, 230, 300, "#fffbe8", -0.02);
  chalk("NO TALKING!", 1024, 520, 170, "#ffe28a", 0.015);
  g.strokeStyle = "rgba(255,240,200,0.85)"; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.moveTo(560, 640); g.quadraticCurveTo(1024, 680, 1490, 630); g.stroke();
  chalk("Thursday", 250, 90, 70, "#ffffff", -0.03);
  chalk("Maths  9:00 - 12:00", 300, 700, 52, "#b8e8ff", 0.0);
  chalk("Pencils down at 12!", 1760, 700, 52, "#ffb8c8", -0.02);
  // a little chalk doodle: a clock with a fork + knife
  g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 8;
  g.beginPath(); g.arc(1800, 230, 90, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(1800, 230); g.lineTo(1800, 160); g.moveTo(1800, 230); g.lineTo(1850, 230); g.stroke();
  g.beginPath(); g.moveTo(1670, 150); g.lineTo(1670, 320); g.moveTo(1650, 150); g.lineTo(1650, 200); g.moveTo(1690, 150); g.lineTo(1690, 200); g.stroke();
  g.beginPath(); g.moveTo(1930, 150); g.quadraticCurveTo(1960, 210, 1930, 250); g.lineTo(1930, 320); g.stroke();
});
/** the "SILENCE - EXAM IN PROGRESS" banner (red on cream, stitched edge) */
export const silenceTex = () => ctex("grhSilence", 2048, 384, (g, r) => {
  g.fillStyle = "#fff4dc"; g.fillRect(0, 0, 2048, 384);
  g.fillStyle = "#e8343c"; g.fillRect(0, 0, 2048, 34); g.fillRect(0, 350, 2048, 34);
  g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 5; g.setLineDash([22, 14]);
  g.beginPath(); g.moveTo(0, 17); g.lineTo(2048, 17); g.moveTo(0, 367); g.lineTo(2048, 367); g.stroke(); g.setLineDash([]);
  otxt(g, "SILENCE", 1024, 150, 170, "#e8343c", "#3a1418", 22);
  g.fillStyle = "#3a1418"; g.font = `bold 92px ${FNT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXAM IN PROGRESS", 1024, 284);
  // two "shh" faces
  for (const x of [190, 1858]) {
    g.lineWidth = 12; g.strokeStyle = "#3a1418"; g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(x, 190, 110, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#3a1418"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 38, 160, 12, 18, 0, 0, 7); g.fill(); }
    g.beginPath(); g.ellipse(x, 235, 22, 14, 0, 0, 7); g.fill();
    g.fillStyle = "#ffb08a"; rrect(g, x - 14, 190, 28, 110, 14); g.fill(); g.stroke();
  }
  noise(g, 0, 0, 2048, 384, r, 6000, 0.03);
});
/** the WALL CLOCK face: numbers, minute ticks, a "LUNCH" sticker at 12 */
export const clockFaceTex = () => ctex("grhClock", 1024, 1024, (g) => {
  g.fillStyle = "#fffdf4"; g.beginPath(); g.arc(512, 512, 500, 0, 7); g.fill();
  const gr = g.createRadialGradient(512, 512, 300, 512, 512, 500); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(120,110,90,0.18)");
  g.fillStyle = gr; g.beginPath(); g.arc(512, 512, 500, 0, 7); g.fill();
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2, big = k % 5 === 0, r0 = big ? 420 : 445, r1 = 478;
    g.strokeStyle = "#1a1a24"; g.lineWidth = big ? 16 : 6; g.lineCap = "butt";
    g.beginPath(); g.moveTo(512 + Math.sin(a) * r0, 512 - Math.cos(a) * r0); g.lineTo(512 + Math.sin(a) * r1, 512 - Math.cos(a) * r1); g.stroke();
  }
  g.fillStyle = "#1a1a24"; g.font = `bold 92px ${FNT}`; g.textAlign = "center"; g.textBaseline = "middle";
  for (let h = 1; h <= 12; h++) { if (h === 12) continue; const a = (h / 12) * Math.PI * 2; g.fillText(String(h), 512 + Math.sin(a) * 345, 518 - Math.cos(a) * 345); }
  // the LUNCH sticker at 12 (a little burger + text on a tilted yellow sticker)
  g.save(); g.translate(512, 205); g.rotate(-0.08);
  g.fillStyle = "#ffd23a"; g.strokeStyle = "#e8343c"; g.lineWidth = 10; rrect(g, -150, -72, 300, 144, 30); g.fill(); g.stroke();
  g.fillStyle = "#e8343c"; g.font = `bold 70px ${FNT}`; g.fillText("LUNCH", 22, -2);
  g.fillStyle = "#d8883a"; g.beginPath(); g.ellipse(-112, -16, 26, 16, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#6ab83a"; g.fillRect(-140, -14, 56, 7); g.fillStyle = "#7a3a1a"; g.fillRect(-138, -7, 52, 10);
  g.fillStyle = "#d8883a"; g.fillRect(-136, 3, 48, 9);
  g.restore();
  g.fillStyle = "rgba(26,26,36,0.55)"; g.font = `bold 34px ${FNT}`; g.fillText("SCHOOL TIME CO.", 512, 700);
});
/** the view outside the windows: bright cool late-morning sky, a hedge, trees, the school field (emissive) */
export const outsideTex = () => ctex("grhOutside", 2048, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#8ec2f4"); gr.addColorStop(0.55, "#cfe6fb"); gr.addColorStop(0.75, "#fff3dc"); gr.addColorStop(1, "#fff3dc");
  g.fillStyle = gr; g.fillRect(0, 0, 2048, 512);
  for (let i = 0; i < 9; i++) blot(g, r() * 2048, 60 + r() * 140, 80 + r() * 110, "255,255,255", 0.75, 2048, 512);
  g.fillStyle = "#a8d888"; g.fillRect(0, 400, 2048, 112);
  for (let i = 0; i < 26; i++) { const x = r() * 2048, s = 50 + r() * 60; g.fillStyle = ["#6ab05a", "#7ac06a", "#5aa05a"][i % 3]; g.beginPath(); g.arc(x, 380 - s * 0.6, s, 0, 7); g.fill(); g.fillStyle = "#7a5a40"; g.fillRect(x - 6, 380 - s * 0.2, 12, s * 0.4 + 20); }
  g.fillStyle = "#4e9a4e"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(i * 54 + r() * 20, 420 - r() * 12, 30 + r() * 12, 0, 7); g.fill(); }
  g.fillStyle = "#e8e0cc"; g.fillRect(0, 470, 2048, 6);
});
/** paper (generic notices): ruled sheet with blocks of "text" */
const scribble = (g: G, r: () => number, x: number, y: number, w: number, lines: number, lh: number, col: string) => {
  g.strokeStyle = col; g.lineCap = "round";
  for (let i = 0; i < lines; i++) { g.lineWidth = lh * 0.35; const L = w * (0.55 + r() * 0.45); g.beginPath(); g.moveTo(x, y + i * lh); for (let s = 0; s < L; s += 14) g.lineTo(x + s, y + i * lh + (r() - 0.5) * 3); g.stroke(); }
};
/** the BULLETIN board: cork + pinned notices, a lunch menu, a gold star chart */
export const corkTex = () => ctex("grhCork", 1536, 1024, (g, r) => {
  g.fillStyle = "#c8945a"; g.fillRect(0, 0, 1536, 1024);
  for (let i = 0; i < 5000; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,70,30,0.35)" : "rgba(240,200,140,0.35)"; g.fillRect(r() * 1536, r() * 1024, 2 + r() * 4, 2 + r() * 4); }
  const note = (x: number, y: number, w: number, h: number, col: string, rot: number, title: string, tc: string) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = "rgba(60,30,10,0.3)"; g.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = tc; g.font = `bold ${Math.round(w * 0.12)}px ${FNT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(title, 0, -h / 2 + w * 0.12);
    scribble(g, r, -w / 2 + 24, -h / 2 + w * 0.26, w - 48, Math.floor((h - w * 0.3) / 30), 30, "rgba(40,40,60,0.45)");
    g.fillStyle = "#e8343c"; g.beginPath(); g.arc(0, -h / 2 + 10, 12, 0, 7); g.fill();
    g.restore();
  };
  note(230, 300, 340, 440, "#fffaf0", -0.05, "LUNCH MENU", "#e8343c");
  note(640, 260, 300, 300, "#bfe8ff", 0.04, "CHESS CLUB", "#2a5aa8");
  note(1010, 330, 380, 480, "#fff8c8", -0.02, "SCHOOL TRIP", "#2a8a3a");
  note(1360, 300, 260, 320, "#ffd0e0", 0.06, "LOST CAT", "#a82a5a");
  note(480, 760, 420, 340, "#ffffff", 0.03, "STAR CHART", "#d8a020");
  note(1050, 790, 360, 300, "#d8ffd0", -0.04, "QUIET PLEASE", "#2a8a3a");
  g.fillStyle = "#ffd23a"; for (let i = 0; i < 12; i++) { const x = 330 + (i % 6) * 60, y = 760 + Math.floor(i / 6) * 70; g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 11 : 26; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
  g.strokeStyle = "#8a5a2a"; g.lineWidth = 30; g.strokeRect(15, 15, 1506, 994);
});
/** posters: a periodic table, a "SHHH!" poster, a world map */
export const posterTex = (k: number) => ctex("grhPoster" + k, 768, 1024, (g, r) => {
  if (k === 0) {
    g.fillStyle = "#f8f4ea"; g.fillRect(0, 0, 768, 1024);
    otxt(g, "THE ELEMENTS", 384, 90, 64, "#2a4a8a", "#f8f4ea", 2);
    const cols = ["#ff9a8a", "#ffd27a", "#9ad8ff", "#a8e89a", "#d8b0ff", "#ffb0d8"];
    for (let y = 0; y < 7; y++) for (let x = 0; x < 18; x++) {
      if (y === 0 && x > 0 && x < 17) continue; if ((y === 1 || y === 2) && x > 1 && x < 12) continue;
      g.fillStyle = cols[(x + y * 3) % 6]; g.fillRect(24 + x * 40, 180 + y * 50, 36, 46);
    }
    for (let y = 0; y < 2; y++) for (let x = 0; x < 14; x++) { g.fillStyle = cols[(x + 2) % 6]; g.fillRect(104 + x * 40, 560 + y * 50, 36, 46); }
    scribble(g, r, 60, 720, 640, 7, 38, "rgba(40,40,60,0.4)");
  } else if (k === 1) {
    g.fillStyle = "#3a8ae8"; g.fillRect(0, 0, 768, 1024);
    for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(255,255,255,0.08)"; g.beginPath(); g.arc(384, 440, 420 - i * 32, 0, 7); g.fill(); }
    g.lineWidth = 16; g.strokeStyle = "#0a1a3a"; g.fillStyle = "#ffd23a"; g.beginPath(); g.arc(384, 420, 230, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#0a1a3a"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(384 + s * 80, 360, 24, 36, 0, 0, 7); g.fill(); }
    g.beginPath(); g.ellipse(384, 500, 46, 30, 0, 0, 7); g.fill();
    g.fillStyle = "#ffb08a"; rrect(g, 354, 400, 60, 230, 30); g.fill(); g.stroke();
    otxt(g, "SHHH!", 384, 800, 190, "#ffffff", "#0a1a3a", 22);
    g.fillStyle = "#ffffff"; g.font = `bold 44px ${FNT}`; g.textAlign = "center"; g.fillText("silence is golden", 384, 940);
  } else {
    g.fillStyle = "#bfe4f8"; g.fillRect(0, 0, 768, 1024);
    g.fillStyle = "#8ad07a";
    for (const [x, y, w, h] of [[120, 300, 200, 160], [180, 500, 120, 240], [400, 260, 160, 140], [420, 440, 120, 200], [560, 300, 170, 170], [620, 620, 110, 80]]) { g.beginPath(); g.ellipse(x, y, w / 2, h / 2, r() * 2, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(40,80,120,0.3)"; g.lineWidth = 3; for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 128); g.lineTo(768, i * 128); g.stroke(); g.beginPath(); g.moveTo(i * 96, 120); g.lineTo(i * 96, 1024); g.stroke(); }
    g.fillStyle = "#f8f4ea"; g.fillRect(0, 0, 768, 120);
    otxt(g, "OUR WORLD", 384, 62, 70, "#2a6a3a", "#f8f4ea", 2);
  }
  g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 6; g.strokeRect(3, 3, 762, 1018);
});
/** the exam paper on each desk: "MATHS EXAM", name line, questions, a few sums; v 0 = top */
export const examTex = () => ctex("grhExam", 512, 704, (g, r) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 704);
  g.fillStyle = "#1a2a4a"; g.font = `bold 46px ${FNT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MATHS EXAM", 256, 60);
  g.font = `bold 24px ${FNT}`; g.textAlign = "left"; g.fillText("Name: ________", 40, 118);
  g.strokeStyle = "rgba(40,60,100,0.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 145); g.lineTo(482, 145); g.stroke();
  for (let q = 0; q < 6; q++) {
    const y = 190 + q * 84;
    g.fillStyle = "#1a2a4a"; g.font = `bold 26px ${FNT}`; g.fillText(`${q + 1}.`, 36, y);
    scribble(g, r, 80, y, 380, 1, 22, "rgba(30,40,70,0.55)");
    g.strokeStyle = "rgba(60,90,200,0.55)"; g.lineWidth = 3; g.beginPath(); g.moveTo(90, y + 34); for (let s = 0; s < 160 * r() + 60; s += 10) g.lineTo(90 + s, y + 34 + Math.sin(s * 0.5) * 6); g.stroke();
  }
  g.fillStyle = "rgba(232,52,60,0.8)"; g.font = `bold 28px ${FNT}`; g.textAlign = "right"; g.fillText("/ 100", 482, 118);
});
/** trophy cabinet back: deep blue felt */
export const feltTex = () => ctex("grhFelt", 256, 256, (g, r) => {
  g.fillStyle = "#2a3a7a"; g.fillRect(0, 0, 256, 256); noise(g, 0, 0, 256, 256, r, 3000, 0.06);
});
/** ceiling acoustic tiles 0.6 m (1 tile = 128 px; 4 x 4 per texture) */
export const ceilTex = () => ctex("grhCeil", 512, 512, (g, r) => {
  g.fillStyle = "#f2f2ee"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) { g.fillStyle = "rgba(120,120,130,0.25)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.fillStyle = "rgba(160,160,170,0.8)"; for (let k = 0; k <= 4; k++) { g.fillRect(k * 128 - 3, 0, 6, 512); g.fillRect(0, k * 128 - 3, 512, 6); }
});
/** the classroom door with a little window + "EXAM ROOM" sign */
export const doorSignTex = () => ctex("grhDoorSign", 512, 256, (g) => {
  g.fillStyle = "#ffffff"; rrect(g, 0, 0, 512, 256, 30); g.fill();
  g.strokeStyle = "#e8343c"; g.lineWidth = 16; rrect(g, 8, 8, 496, 240, 24); g.stroke();
  otxt(g, "EXAM ROOM", 256, 100, 70, "#e8343c", "#ffffff", 2);
  g.fillStyle = "#1a2a4a"; g.font = `bold 40px ${FNT}`; g.textAlign = "center"; g.fillText("do not disturb", 256, 180);
});
