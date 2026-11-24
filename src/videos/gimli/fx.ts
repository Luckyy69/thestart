// Effect drawings for the Gimli short (bridge Pen): fuel gauge, balance scale, measuring cup + spoon, flour heap,
// thought bubble with a glider, sparks, extinguisher spray, cockpit screens, racetrack + runway textures.
// PROPS pass: painted look (gradient fills, rim light, glints, cast shade, thick-thin ink) like the reference props.
// Non-soft cards are alpha-tested at 0.5, so every fill on them stays opaque.
import { Pen, INK } from "../bridge/toon";
import { ctex } from "../bridge/paint";

type P2 = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const lin = (p: Pen, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) => {
  const gr = p.g.createLinearGradient(x0, y0, x1, y1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr;
};
const radial = (p: Pen, x: number, y: number, r0: number, r1: number, stops: [number, string][]) => {
  const gr = p.g.createRadialGradient(x, y, r0, x, y, r1); for (const [o, c] of stops) gr.addColorStop(o, c); return gr;
};
/** fill a path with a canvas gradient (no ink) */
const gfill = (p: Pen, pts: P2[], fill: CanvasGradient | string) => { p.path(pts, true); p.g.fillStyle = fill; p.g.fill(); };
const ellP = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] => {
  const o: P2[] = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o;
};
const hash = (a: number, b: number) => { const r = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return r - Math.floor(r); };

/** round fuel gauge on a 320 x 320 canvas; level 0..1 (needle sweeps -120..+120 deg), red zone at the bottom */
export const fxGauge = (p: Pen, level: number) => {
  // chrome bezel
  p.ell(160, 160, 152, 152, null, 8);
  gfill(p, ellP(160, 160, 150, 150), lin(p, 40, 20, 280, 300, [[0, "#f4f6fa"], [0.45, "#9aa3b2"], [0.55, "#6c7584"], [1, "#d6dbe3"]]));
  gfill(p, ellP(160, 160, 134, 134), "#1f2a38");
  // face
  gfill(p, ellP(160, 160, 126, 126), radial(p, 140, 130, 10, 140, [[0, "#fffdf6"], [0.75, "#f4ecd8"], [1, "#d9ccb0"]]));
  // coloured zones: red (empty), amber, green
  p.arc(160, 160, 102, 102, 150, 185, 16, "#e03c35");
  p.arc(160, 160, 102, 102, 185, 215, 16, "#f2b33a");
  p.arc(160, 160, 102, 102, 215, 390, 16, "#4fb05a");
  for (let i = 0; i <= 16; i++) {
    const a = rad(-120 + i * 15 - 90), big = i % 4 === 0, r0 = big ? 84 : 92;
    p.stroke([[160 + r0 * Math.cos(a), 160 + r0 * Math.sin(a)], [160 + 112 * Math.cos(a), 160 + 112 * Math.sin(a)]], big ? 7 : 3.5, INK);
  }
  const g = p.g; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK;
  g.fillText("E", 160 + 66 * Math.cos(rad(-210)), 160 + 66 * Math.sin(rad(-210)));
  g.fillText("F", 160 + 66 * Math.cos(rad(30)), 160 + 66 * Math.sin(rad(30)));
  // fuel-pump icon
  p.poly([[140, 206], [168, 206], [168, 246], [140, 246]], "#2b3a4a", 4);
  p.poly([[146, 212], [162, 212], [162, 224], [146, 224]], "#9fd3ff", 0);
  p.stroke([[168, 214], [180, 222], [180, 240], [186, 240]], 4, "#2b3a4a");
  // needle with a drop shadow
  const a = rad(-120 + 240 * level - 90), tip: P2 = [160 + 100 * Math.cos(a), 160 + 100 * Math.sin(a)];
  const nrm: P2 = [-Math.sin(a) * 7, Math.cos(a) * 7], tail: P2 = [160 - 24 * Math.cos(a), 160 - 24 * Math.sin(a)];
  const needle = (dx: number, dy: number): P2[] => [[tail[0] + nrm[0] + dx, tail[1] + nrm[1] + dy], [tip[0] + dx, tip[1] + dy], [tail[0] - nrm[0] + dx, tail[1] - nrm[1] + dy]];
  gfill(p, needle(5, 6), "rgba(60,40,30,0.55)");
  p.poly(needle(0, 0), "#e8322c", 4);
  p.ell(160, 160, 16, 16, "#3a4454", 4); p.dot(155, 155, 5, "#aab4c4");
  // glass glint
  p.g.save(); p.path(ellP(160, 160, 126, 126), true); p.g.clip();
  gfill(p, [[40, 120], [120, 34], [168, 34], [56, 160]], "rgba(255,255,255,0.55)");
  p.g.restore();
};

/** balance scale on a 520 x 360 canvas: a big block (left) and a small block (right); tilt -1..1 */
export const fxScale = (p: Pen, tilt: number) => {
  const a = tilt * 0.32, cx = 260, cy = 120, L = 190;
  const brass = (x0: number, x1: number) => lin(p, x0, 0, x1, 0, [[0, "#9c7420"], [0.35, "#f6d77a"], [0.55, "#e2b44a"], [1, "#8a6418"]]);
  // base + pillar
  p.poly([[176, 344], [344, 344], [332, 318], [188, 318]], null, 6); gfill(p, [[176, 344], [344, 344], [332, 318], [188, 318]], lin(p, 0, 318, 0, 344, [[0, "#7b5a26"], [1, "#4d3618"]]));
  p.poly([[176, 344], [344, 344], [332, 318], [188, 318]], null, 6);
  const pil: P2[] = [[236, 320], [284, 320], [270, 130], [250, 130]];
  gfill(p, pil, brass(236, 284)); p.poly(pil, null, 6);
  const lx = cx - L * Math.cos(a), ly = cy - L * Math.sin(a), rx = cx + L * Math.cos(a), ry = cy + L * Math.sin(a);
  p.stroke([[lx, ly], [rx, ry]], 18, INK); p.stroke([[lx, ly], [rx, ry]], 10, "#e8c45a"); p.stroke([[lx, ly - 2], [rx, ry - 2]], 3, "#fff2c0");
  p.ell(cx, cy, 16, 16, "#e8c45a", 5); p.dot(cx - 4, cy - 5, 5, "#fff6d6");
  for (const [x, y, big] of [[lx, ly, true], [rx, ry, false]] as const) {
    p.stroke([[x, y], [x - 46, y + 72]], 4, INK); p.stroke([[x, y], [x + 46, y + 72]], 4, INK);
    // pan: brass dish
    const pan = ellP(x, y + 76, 64, 15);
    gfill(p, pan, brass(x - 64, x + 64)); p.poly(pan, null, 5);
    const w = big ? 46 : 20, h = big ? 64 : 26, b = y + 72;
    // block with a lit top face and a shaded side
    const front: P2[] = [[x - w, b], [x + w * 0.6, b], [x + w * 0.6, b - h], [x - w, b - h]];
    const side: P2[] = [[x + w * 0.6, b], [x + w, b - 8], [x + w, b - h - 8], [x + w * 0.6, b - h]];
    const top: P2[] = [[x - w, b - h], [x + w * 0.6, b - h], [x + w, b - h - 8], [x - w * 0.6, b - h - 8]];
    const [c0, c1, c2] = big ? ["#3f78c8", "#2a4f8c", "#7fb0ee"] : ["#d83a3e", "#962328", "#f58a82"];
    gfill(p, front, c0); gfill(p, side, c1); gfill(p, top, c2);
    p.poly([[x - w, b], [x + w * 0.6, b], [x + w, b - 8], [x + w, b - h - 8], [x - w * 0.6, b - h - 8], [x - w, b - h]], null, 6);
    p.stroke([[x - w + 6, b - h + 6], [x - w + 6, b - 8]], 4, "rgba(255,255,255,0.7)");
  }
};

/** measuring cup full of flour on a 300 x 300 canvas */
export const fxCup = (p: Pen) => {
  // handle
  p.line([[214, 128], [266, 136], [258, 222], [206, 224]], "#cfe4f6", 16);
  const body: P2[] = [[60, 90], [220, 90], [200, 270], [80, 270]];
  gfill(p, body, lin(p, 60, 0, 220, 0, [[0, "#b8d6ee"], [0.25, "#eaf5ff"], [0.6, "#cfe4f6"], [1, "#9fc2e0"]]));
  // flour inside (visible through the glass) with a domed, shaded top
  gfill(p, [[72, 112], [208, 112], [196, 262], [84, 262]], lin(p, 72, 0, 208, 0, [[0, "#efe7d6"], [0.4, "#fffaf0"], [1, "#e3d8c2"]]));
  gfill(p, [[64, 108], [96, 76], [140, 64], [186, 74], [216, 106], [190, 116], [140, 120], [90, 116]], radial(p, 128, 76, 4, 90, [[0, "#ffffff"], [0.7, "#f6efe0"], [1, "#dccfb6"]]));
  p.poly([[64, 108], [96, 76], [140, 64], [186, 74], [216, 106]], null, 0); p.stroke([[64, 108], [96, 76], [140, 64], [186, 74], [216, 106]], 5, INK);
  // measure marks + glass glints
  for (let i = 0; i < 4; i++) { p.stroke([[88, 146 + i * 30], [114, 146 + i * 30]], 5, "#d23b3b"); p.dot(124, 146 + i * 30, 3.5, "#d23b3b"); }
  p.stroke([[188, 104], [176, 250]], 7, "rgba(255,255,255,0.9)"); p.stroke([[198, 110], [192, 170]], 3, "rgba(255,255,255,0.9)");
  p.poly(body, null, 8);
  p.ell(140, 92, 80, 12, null, 5);
};
/** a tiny teaspoon with a pinch of flour on a 300 x 120 canvas */
export const fxSpoon = (p: Pen) => {
  const steel = lin(p, 0, 50, 0, 80, [[0, "#f4f6fa"], [0.5, "#aab2bf"], [1, "#6d7686"]]);
  p.stroke([[38, 72], [190, 60]], 16, INK); p.stroke([[40, 72], [188, 60]], 8, steel as unknown as string);
  p.ell(225, 58, 46, 28, null, 7); gfill(p, ellP(225, 58, 44, 26), radial(p, 212, 48, 2, 54, [[0, "#ffffff"], [0.5, "#c4cad4"], [1, "#7c8594"]]));
  gfill(p, [[196, 52], [212, 36], [232, 32], [252, 40], [258, 54], [226, 60]], radial(p, 228, 42, 2, 30, [[0, "#ffffff"], [1, "#e9e0cc"]]));
  p.stroke([[196, 52], [212, 36], [232, 32], [252, 40], [258, 54]], 4, INK);
  p.stroke([[56, 66], [150, 59]], 3, "#ffffff");
};

/** thought bubble with a little glider on a 420 x 360 canvas */
export const fxThought = (p: Pen) => {
  const cloud = (cx: number, cy: number, rx: number, ry: number, n: number, k: number): P2[] => {
    const pts: P2[] = [];
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2, r = 1 + k * Math.abs(Math.sin((a * n) / 2)); pts.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]); }
    return pts;
  };
  const fill = (pts: P2[], cx: number, cy: number, r: number) => { gfill(p, pts, radial(p, cx - r * 0.3, cy - r * 0.35, r * 0.1, r * 1.2, [[0, "#ffffff"], [0.6, "#f4f7ff"], [1, "#c9d4f2"]])); p.poly(pts, null, 7); };
  for (const [x, y, r] of [[52, 334, 12], [86, 304, 20]] as const) fill(ellP(x, y, r, r), x, y, r);
  const main = cloud(228, 150, 160, 106, 9, 0.07);
  fill(main, 228, 150, 170);
  // sky disc inside the bubble
  p.g.save(); p.path(ellP(228, 152, 132, 84), true); p.g.clip();
  gfill(p, ellP(228, 152, 132, 84), lin(p, 0, 70, 0, 236, [[0, "#6fb6f0"], [1, "#cfe9fb"]]));
  p.ell(150, 200, 40, 16, "#ffffff", 0); p.ell(300, 120, 34, 12, "#ffffff", 0);
  p.g.restore(); p.poly(ellP(228, 152, 132, 84), null, 4);
  // glider: long thin wings, slim body, T-tail, motion lines
  for (let i = 0; i < 3; i++) p.stroke([[108 + i * 6, 186 + i * 12], [152 + i * 6, 184 + i * 12]], 4, "rgba(255,255,255,0.95)");
  p.poly([[110, 148], [356, 136], [360, 146], [112, 160]], "#ffd34a", 5);
  p.stroke([[118, 150], [350, 139]], 3, "#fff2b0");
  p.poly([[176, 152], [318, 144], [344, 152], [322, 162], [190, 166]], "#f7f6f2", 5);
  p.poly([[172, 150], [196, 116], [212, 116], [198, 152]], "#e8322c", 4);
  p.poly([[180, 118], [228, 114], [228, 121], [180, 125]], "#ffd34a", 3);
  p.ell(312, 150, 18, 8, "#2c4a78", 3); p.dot(306, 147, 3, "#bfe0ff");
};

/** a shower of sparks on a 500 x 300 canvas, seed for variation (alpha-tested card: opaque strokes only) */
export const fxSparks = (p: Pen, seed: number) => {
  const x0 = 470, y0 = 260, ol = p.ol;
  p.ol = 2.5;
  for (let i = 0; i < 34; i++) {
    const u = hash(seed, i), v = hash(seed * 3.1, i * 9.7), w = hash(seed + 7, i);
    const a = rad(186 + 70 * u), len = 80 + 200 * v, drop = 30 * w;
    const s0 = 0.25 + 0.5 * w, s1 = Math.min(1, s0 + 0.18 + 0.3 * hash(i, seed * 2));
    const pt = (t: number): P2 => [x0 + len * t * Math.cos(a), y0 + len * t * Math.sin(a) * 0.8 + drop * t * t];
    const pts: P2[] = [pt(s0), pt((s0 + s1) / 2), pt(s1)];
    const col = i % 4 === 0 ? "#ff8a1e" : i % 3 ? "#ffcf2e" : "#fff1a0";
    p.line(pts, col, 3 + (i % 3) * 1.5, true);
    p.stroke(pts.slice(1), 1.5, "#ffffff");
    if (i % 6 === 0) { const [ex, ey] = pt(Math.min(1, s1 + 0.06)); p.ell(ex, ey, 5, 5, "#fff4b8", 2.5); }
  }
  // hot core flash at the contact point
  const star: P2[] = [];
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 16 : 34 + 10 * hash(seed, i); star.push([x0 - 14 + r * Math.cos(a), y0 - 8 + r * Math.sin(a) * 0.75]); }
  p.poly(star, "#ffb32e", 4); p.ell(x0 - 14, y0 - 8, 13, 9, "#fff8d8", 0);
  p.ol = ol;
};

/** extinguisher spray: puffy white-blue foam cone on a 400 x 260 canvas, puff u 0..1 (soft card) */
export const fxSpray = (p: Pen, u: number) => {
  for (let i = 0; i < 8; i++) {
    const d = 34 + i * 42 * (0.6 + 0.4 * u), r = 16 + i * 11, y = 130 + Math.sin(i * 2 + u * 6) * 10, al = Math.max(0, 0.95 - i * 0.1);
    const g = p.g; g.globalAlpha = al;
    p.ell(30 + d, y, r, r * 0.82, null, 5);
    gfill(p, ellP(30 + d, y, r, r * 0.82), radial(p, 30 + d - r * 0.3, y - r * 0.35, r * 0.1, r * 1.1, [[0, "#ffffff"], [0.65, "#eef3ff"], [1, "#b9c8e8"]]));
    g.globalAlpha = 1;
  }
  // a few droplets
  for (let i = 0; i < 10; i++) { const x = 80 + 300 * hash(i, u * 10), y = 130 + 90 * (hash(i + 3, u * 7) - 0.5); p.dot(x, y, 3 + 3 * hash(i, 2), "rgba(210,230,255,0.9)"); }
};

/** cockpit display: dark glass with an attitude indicator (sky/ground) and tapes, or a nav arc */
export const screenTex = (k: number) => ctex("screen2_" + k, 256, 256, (g) => {
  const bg = g.createLinearGradient(0, 0, 0, 256); bg.addColorStop(0, "#111827"); bg.addColorStop(1, "#05080e");
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.font = "bold 14px monospace"; g.textAlign = "center"; g.textBaseline = "middle";
  if (k === 0) {
    g.save(); g.beginPath(); g.roundRect(54, 40, 148, 170, 18); g.clip();
    const sky = g.createLinearGradient(0, 40, 0, 140); sky.addColorStop(0, "#1f6fd6"); sky.addColorStop(1, "#5fb0ff");
    g.fillStyle = sky; g.fillRect(0, 0, 256, 140);
    const gr = g.createLinearGradient(0, 140, 0, 230); gr.addColorStop(0, "#b8742f"); gr.addColorStop(1, "#6e4116");
    g.fillStyle = gr; g.fillRect(0, 140, 256, 140);
    g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 140); g.lineTo(256, 140); g.stroke();
    g.lineWidth = 2; for (const d of [-30, -15, 15, 30]) { const w = Math.abs(d) === 30 ? 40 : 22; g.beginPath(); g.moveTo(128 - w, 140 + d); g.lineTo(128 + w, 140 + d); g.stroke(); }
    g.restore();
    g.strokeStyle = "#ffd84a"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(80, 128); g.lineTo(112, 128); g.lineTo(112, 138); g.moveTo(144, 138); g.lineTo(144, 128); g.lineTo(176, 128); g.stroke();
    g.fillStyle = "#ffd84a"; g.fillRect(124, 124, 8, 8);
    // speed + altitude tapes
    for (const [x0, txt] of [[6, "250"], [208, "350"]] as const) {
      g.fillStyle = "#2a3344"; g.fillRect(x0, 40, 42, 170);
      g.strokeStyle = "#cfd6e2"; g.lineWidth = 2; for (let y = 50; y < 210; y += 16) { g.beginPath(); g.moveTo(x0 + (x0 < 100 ? 32 : 0), y); g.lineTo(x0 + (x0 < 100 ? 42 : 10), y); g.stroke(); }
      g.fillStyle = "#000000"; g.fillRect(x0, 114, 42, 24); g.strokeStyle = "#ffffff"; g.strokeRect(x0, 114, 42, 24);
      g.fillStyle = "#3ef08a"; g.fillText(txt, x0 + 21, 127);
    }
    g.fillStyle = "#5ee0ff"; g.fillText("ALT HOLD", 128, 24);
  } else {
    // nav display: heading arc, route, waypoints
    g.strokeStyle = "#e9eef7"; g.lineWidth = 3; g.beginPath(); g.arc(128, 210, 150, Math.PI * 1.18, Math.PI * 1.82); g.stroke();
    for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.18 + (0.64 * i) / 12); g.beginPath(); g.moveTo(128 + 150 * Math.cos(a), 210 + 150 * Math.sin(a)); g.lineTo(128 + (i % 3 ? 140 : 132) * Math.cos(a), 210 + (i % 3 ? 140 : 132) * Math.sin(a)); g.stroke(); }
    g.strokeStyle = "rgba(94,224,255,0.45)"; g.lineWidth = 2; for (const r of [60, 105]) { g.beginPath(); g.arc(128, 210, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    g.strokeStyle = "#ff5ad8"; g.lineWidth = 4; g.beginPath(); g.moveTo(128, 210); g.lineTo(150, 130); g.lineTo(196, 70); g.stroke();
    g.fillStyle = "#3ef08a"; for (const [x, y] of [[150, 130], [196, 70]]) { g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 8, y); g.lineTo(x, y + 8); g.lineTo(x - 8, y); g.fill(); }
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(128, 196); g.lineTo(140, 222); g.lineTo(116, 222); g.fill();
    g.fillStyle = "#f2b33a"; g.fillText("FUEL  0", 64, 24); g.fillStyle = "#5ee0ff"; g.fillText("HDG 270", 190, 24);
  }
  // glass sheen
  const sh = g.createLinearGradient(0, 0, 256, 256); sh.addColorStop(0, "rgba(255,255,255,0.10)"); sh.addColorStop(0.4, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.fillRect(0, 0, 256, 256);
});

/** old runway turned racetrack: weathered concrete slabs, tyre marks, faded runway centre dashes and edge lines */
export const runwayTex = () => ctex("gimliRunway2", 1024, 256, (g, r) => {
  const base = g.createLinearGradient(0, 0, 0, 256); base.addColorStop(0, "#8a8c93"); base.addColorStop(0.5, "#979aa1"); base.addColorStop(1, "#8a8c93");
  g.fillStyle = base; g.fillRect(0, 0, 1024, 256);
  // slab tone variation
  for (let x = 0; x < 1024; x += 64) for (let y = 0; y < 256; y += 64) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,250" : "40,40,55"},${(0.03 + r() * 0.06).toFixed(3)})`; g.fillRect(x, y, 64, 64); }
  for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "30,30,40"},${0.03 + r() * 0.06})`; g.fillRect(r() * 1024, r() * 256, 3 + r() * 8, 2 + r() * 5); }
  // repair patches + cracks
  for (let i = 0; i < 6; i++) { g.fillStyle = "rgba(55,55,65,0.25)"; g.fillRect(r() * 980, r() * 220, 20 + r() * 40, 14 + r() * 26); }
  g.strokeStyle = "rgba(35,35,45,0.35)"; g.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { let x = r() * 1024, y = r() * 256; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  // slab joints
  g.strokeStyle = "rgba(40,40,50,0.45)"; g.lineWidth = 2;
  for (let x = 0; x < 1024; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  for (const y of [64, 192]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  // tyre marks (dark rubber streaks) along the track lines
  for (const y0 of [86, 102, 154, 170]) { g.fillStyle = "rgba(25,25,30,0.18)"; for (let x = 0; x < 1024; x += 4) g.fillRect(x, y0 + Math.sin(x * 0.02 + y0) * 3, 4, 5 + 3 * r()); }
  // faded centre dashes + edge lines
  g.fillStyle = "rgba(248,248,240,0.8)"; for (let x = 20; x < 1024; x += 128) g.fillRect(x, 123, 64, 10);
  g.fillStyle = "rgba(248,248,240,0.7)"; g.fillRect(0, 8, 1024, 6); g.fillRect(0, 242, 1024, 6);
});
export const startLineTex = () => ctex("chequer2", 256, 64, (g, r) => {
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#15151a" : "#f6f6f2"; g.fillRect(i * 16, j * 16, 16, 16); }
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let i = 0; i < 60; i++) g.fillRect(r() * 256, r() * 64, 3, 2);
});
export const cloudSeaTex = () => ctex("cloudSea2", 1024, 1024, (g, r) => {
  g.fillStyle = "#dfe6f2"; g.fillRect(0, 0, 1024, 1024);
  // billows: shaded underside (cool) then bright tops (white), drawn in clusters so they read as cauliflower heads
  const blob = (x: number, y: number, rr: number) => {
    for (const [dx, dy] of [[0, 0], [1024, 0], [-1024, 0], [0, 1024], [0, -1024]]) {
      const X = x + dx, Y = y + dy; if (X < -rr * 2 || X > 1024 + rr * 2 || Y < -rr * 2 || Y > 1024 + rr * 2) continue;
      const gs = g.createRadialGradient(X + rr * 0.25, Y + rr * 0.35, 0, X + rr * 0.25, Y + rr * 0.35, rr * 1.15);
      gs.addColorStop(0, "rgba(140,155,195,0.32)"); gs.addColorStop(1, "rgba(140,155,195,0)");
      g.fillStyle = gs; g.fillRect(X - rr * 1.2, Y - rr * 1.2, rr * 2.8, rr * 2.8);
      const gr = g.createRadialGradient(X - rr * 0.2, Y - rr * 0.25, 0, X - rr * 0.2, Y - rr * 0.25, rr);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(X - rr * 1.2, Y - rr * 1.2, rr * 2.4, rr * 2.4);
    }
  };
  for (let c = 0; c < 70; c++) {
    const cx = r() * 1024, cy = r() * 1024, R = 40 + r() * 70;
    for (let k = 0; k < 6; k++) blob(cx + (r() - 0.5) * R * 1.6, cy + (r() - 0.5) * R, R * (0.45 + r() * 0.5));
  }
});
export const tileTex = () => ctex("kitchenTile2", 256, 256, (g, r) => {
  g.fillStyle = "#a9c2bb"; g.fillRect(0, 0, 256, 256); // grout
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 64 + 3, y = j * 64 + 3, v = (r() - 0.5) * 10;
    const t = g.createLinearGradient(x, y, x + 58, y + 58);
    t.addColorStop(0, `rgb(${242 + v},${249 + v},${246 + v})`); t.addColorStop(1, `rgb(${222 + v},${236 + v},${231 + v})`);
    g.fillStyle = t; g.beginPath(); g.roundRect(x, y, 58, 58, 5); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x + 6, y + 6, 18, 4); g.fillRect(x + 6, y + 6, 4, 14); // glaze glint
  }
});
