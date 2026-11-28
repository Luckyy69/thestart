// OWNER: props/fx agent. Canvas2D EFFECT drawings for "Live Wire" (all NEW; Pen style: plum ink rims, flat comic
// colours, white halos on lettering). Every drawing is a pure function of its arguments (seeded, no Math.random), so a
// card key that encodes the arguments is a valid cache key.
//   impacts  fxImpact (BONK / WHAM bursts), fxLines (radial action lines), fxSplinter, fxChip
//   hallway  fxSock, fxZing (pinky squiggles), fxXray (the round x-ray window: bones + the glowing nerve cable)
//   arm      fxSweat, fxPuff, fxBolt (jagged arcs), fxSpark (4-point twinkle), fxGlow (soft), fxRays (soft)
//   peak     fxZap (ZZZAP! letters), fxShirt / fxPants / fxDuck (laundry), fxSmoke (soft)
//   surge    fxScream (AAAAA! / aa), fxWordSm ("zzt", "fine")
//   museum   fxRimshot (drum kit + BA-DUM-TSS in three beats), fxHa (laughing speech puffs), fxDust (soft)
import { Pen, INK } from "../bridge/toon";

export type P2 = [number, number];
export const WHITE = "#ffffff";
const rad = (d: number) => (d * Math.PI) / 180;
export const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 31871.519; return x - Math.floor(x); };
export const cl01 = (x: number) => Math.max(0, Math.min(1, x));
export const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${cl01(a)})`; };
const qbez = (a: P2, c: P2, b: P2, n = 12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
/** quadratic curve through k at its middle */
const thru = (a: P2, k: P2, b: P2, n = 12) => qbez(a, [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], b, n);
const local = (p: Pen, x: number, y: number, a: number, fn: () => void, k = 1, ky = k) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); if (k !== 1 || ky !== 1) g.scale(k, ky); fn(); g.restore(); };
const alpha = (p: Pen, a: number, fn: () => void) => { const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number, mid = 0) => {
  if (a <= 0.005 || r <= 0) return;
  const g = p.g, gr = g.createRadialGradient(x0, y0, 0, x0, y0, r);
  gr.addColorStop(0, rgba(col, a)); if (mid) gr.addColorStop(mid, rgba(col, a * 0.55)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, r, 0, Math.PI * 2); g.fill();
};
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
export const starPts = (cx: number, cy: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2, seed = -1, jag = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2, j = seed >= 0 ? 1 + jag * (rnd(seed, i) - 0.5) : 1, rr = (i % 2 ? r * inner : r) * j;
    out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return out;
};
const puffPts = (cx: number, cy: number, rx: number, ry: number, bumps: number, seed: number, bulge = 1.14): P2[] => {
  const ring: P2[] = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2, a1 = ((i + 1) / bumps) * Math.PI * 2, r0 = 0.9 + 0.08 * rnd(seed, i), r1 = 0.9 + 0.08 * rnd(seed, (i + 1) % bumps);
    const P0: P2 = [cx + Math.cos(a0) * rx * r0, cy + Math.sin(a0) * ry * r0], P1: P2 = [cx + Math.cos(a1) * rx * r1, cy + Math.sin(a1) * ry * r1];
    const am = (a0 + a1) / 2, C: P2 = [cx + Math.cos(am) * rx * bulge, cy + Math.sin(am) * ry * bulge];
    ring.push(...qbez(P0, C, P1, 6).slice(0, -1));
  }
  return ring;
};
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
const SERIF = "Georgia, 'DejaVu Serif', 'Liberation Serif', serif";
/** bold comic lettering: white halo + ink rim + fill (fill may be a gradient) */
export const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string | CanvasGradient, ink = size * 0.16, halo = 0, maxW?: number, font = FONT, weight = 900) => {
  const g = p.g; g.save(); g.font = `${weight} ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); }
  g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};
const vgrad = (p: Pen, y0: number, y1: number, cols: string[]) => { const gr = p.g.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; };
/** one letter per glyph, each wobbling with ph (shaky comic words). w = card width, h = card height */
const shaky = (p: Pen, word: string, w: number, h: number, size: number, ph: number, wob: number, cols: string[], ink: number, halo: number, condense = 1, font = FONT) => {
  const n = word.length, step = Math.min((w * 0.9) / n, size * 0.74 * condense), x0 = (w - step * n) / 2;
  for (let i = 0; i < n; i++) {
    const x = x0 + step * (i + 0.5), y = h / 2 + wob * Math.sin(ph * 2.3 + i * 1.1), r = 0.14 * Math.sin(ph * 3.3 + i * 1.9), sz = size * (1 + 0.08 * Math.sin(ph * 1.9 + i * 2.7));
    local(p, x, y, r, () => {
      const g = p.g; g.save(); g.scale(condense, 1); g.font = `900 ${sz}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
      g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(word[i], 0, 0);
      g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(word[i], 0, 0);
      g.fillStyle = vgrad(p, -sz / 2, sz / 2, cols); g.fillText(word[i], 0, 0); g.restore();
    });
  }
};

// ============================================================ impacts
/** a comic impact burst (512 x 512) with optional lettering: BONK! / WHAM! (seeded jaggedness) */
export const fxImpact = (p: Pen, col: string, inner: string, text = "", txtCol = "#ff3a4a", seed = 1, size = 120) => {
  p.poly(starPts(256, 256, 248, 13, 0.62, 0.15, seed, 0.28), col, 13);
  p.poly(starPts(256, 256, 176, 13, 0.7, 0.4, seed + 7, 0.2), inner, 0);
  if (text) local(p, 256, 262, -0.1, () => letter(p, text, 0, 0, size, vgrad(p, -size / 2, size / 2, [txtCol === "#ff3a4a" ? "#ff7a4a" : txtCol, txtCol]), size * 0.2, size * 0.07, 440));
};
/** radial action lines (512 x 512): a ring of tapered ink spikes round an empty centre */
export const fxLines = (p: Pen, seed: number, col = INK) => {
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + 0.2 * rnd(seed, i), r0 = 150 + 50 * rnd(seed, i + 30), r1 = 236 - 20 * rnd(seed, i + 60), w = 7 + 9 * rnd(seed, i + 90);
    const c = Math.cos(a), s = Math.sin(a), nx = -s, ny = c;
    p.poly([[256 + c * r0, 256 + s * r0], [256 + c * r1 + nx * w, 256 + s * r1 + ny * w], [256 + c * r1 - nx * w, 256 + s * r1 - ny * w]], col, 0);
  }
};
/** a wood splinter with a white-paint face (128 x 256) */
export const fxSplinter = (p: Pen, seed: number) => {
  const j = (k: number) => (rnd(seed, k) - 0.5) * 24;
  const pts: P2[] = [[64 + j(1), 14], [92 + j(2), 70], [86 + j(3), 160], [70 + j(4), 244], [44 + j(5), 150], [36 + j(6), 60]];
  p.poly(pts, "#e0b277", 7);
  p.clip(pts, () => { p.poly([[0, 0], [64, 0], [52, 256], [0, 256]], "#fbf7ee", 0); p.stroke([[78, 40], [74, 120], [66, 220]], 4, "#a8743e"); });
  p.poly(pts, null, 7);
};
/** a flake of white paint (128 x 128) */
export const fxChip = (p: Pen, seed: number) => {
  const pts: P2[] = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2, r = 40 + 20 * rnd(seed, i); pts.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.7]); }
  p.poly(pts, "#fffdf6", 6); p.stroke([[44, 70], [80, 58]], 4, "#d8cdb8");
};

// ============================================================ hallway
/** a striped sock (256 x 256), toe to the right */
export const fxSock = (p: Pen) => {
  const pts: P2[] = [[70, 30], [130, 30], [134, 150], [190, 156], [226, 176], [228, 214], [196, 230], [110, 228], [74, 206], [70, 150]];
  p.poly(pts, WHITE, 0);
  p.clip(pts, () => {
    for (let i = 0; i < 4; i++) p.poly([[60, 40 + i * 30], [150, 40 + i * 30], [150, 54 + i * 30], [60, 54 + i * 30]], i % 2 ? "#3a8ae8" : "#ff4a5a", 0);
    p.poly([[60, 20], [150, 20], [150, 44], [60, 44]], "#ff4a5a", 0);
    p.ell(222, 202, 36, 34, "#ff4a5a", 0); p.ell(86, 214, 26, 22, "#ff4a5a", 0);
    p.ell(150, 200, 70, 22, rgba("#7a3a6a", 0.12), 0);
  });
  p.poly(pts, null, 8);
  p.stroke(thru([80, 44], [100, 40], [124, 44], 6), 4, rgba(INK, 0.5));
};
/** pinky zing squiggles (256 x 256): three yellow zigzags fanning out (seed = variant) */
export const fxZing = (p: Pen, seed: number) => {
  for (let k = 0; k < 3; k++) {
    const a = rad(-60 + 60 * k + 10 * (rnd(seed, k) - 0.5)), c = Math.cos(a), s = Math.sin(a), pts: P2[] = [];
    for (let i = 0; i <= 5; i++) { const d = 40 + i * 17, o = (i % 2 ? 1 : -1) * (12 + 5 * rnd(seed, i + k * 9)); pts.push([128 + c * d - s * o, 128 + s * d + c * o]); }
    p.line(pts, "#ffe14a", 10);
  }
};
/** the round X-RAY window (1024 x 1024): a chunky porthole lens (cream rim, bolts, a red "X-RAY" tab), inside a deep
 *  blue x-ray of the elbow: the arm's soft silhouette, the HUMERUS coming down from the top right, the elbow knob, the
 *  forearm bones going off to the left, and the glowing yellow NERVE cable hugging the bone round the knob (no
 *  padding there: a little "!" spark). pulse 0..1 = the cable glow; ph = a bright blip travelling down the cable. */
export const fxXray = (p: Pen, pulse: number, ph: number) => {
  const g = p.g, C = 512, R = 400;
  g.save(); g.beginPath(); g.arc(C, C, R, 0, Math.PI * 2); g.clip();
  const bg = g.createRadialGradient(C - 80, C - 100, 40, C, C, R); bg.addColorStop(0, "#2a5a9a"); bg.addColorStop(1, "#0c1a3a");
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 1024);
  // x-ray grid
  g.strokeStyle = "rgba(140,200,255,0.12)"; g.lineWidth = 3;
  for (let x = 112; x < 1000; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(1024, x); g.stroke(); }
  // the arm's flesh silhouette (bent at the elbow)
  const arm = (w: number, col: string) => { g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(860, -40); g.lineTo(560, 560); g.lineTo(-60, 690); g.stroke(); };
  arm(330, "rgba(120,180,255,0.22)"); arm(250, "rgba(150,205,255,0.16)");
  // bones: humerus (top right -> elbow), radius + ulna (elbow -> left)
  const bone = (a: P2, b: P2, w: number) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    const pts: P2[] = [[a[0] + nx * w / 2, a[1] + ny * w / 2], [b[0] + nx * w / 2, b[1] + ny * w / 2], [b[0] - nx * w / 2, b[1] - ny * w / 2], [a[0] - nx * w / 2, a[1] - ny * w / 2]];
    p.poly(pts, "#eaf6ff", 0); p.stroke([[a[0] + nx * w * 0.18, a[1] + ny * w * 0.18], [b[0] + nx * w * 0.18, b[1] + ny * w * 0.18]], w * 0.18, "rgba(170,215,255,0.9)");
  };
  bone([820, 0], [575, 510], 92);
  p.ell(560, 545, 112, 82, "#eaf6ff", 0, 0, 360, -20);            // the elbow end of the humerus
  p.ell(642, 585, 58, 50, "#f6fbff", 0);                           // the medial epicondyle: THE KNOB
  bone([520, 575], [20, 640], 58); bone([540, 640], [20, 720], 50);
  p.ell(498, 600, 52, 44, "#eaf6ff", 0);
  g.globalCompositeOperation = "source-over";
  // the NERVE: a glowing yellow cable down the humerus, round the BACK of the knob, along the forearm
  const nerve = [...thru([900, 120], [760, 330], [690, 520], 10), ...thru([700, 560], [705, 650], [600, 680], 8).slice(1), ...thru([590, 682], [300, 700], [-20, 770], 10).slice(1)];
  const k = 0.55 + 0.45 * pulse;
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [w, a] of [[90, 0.12], [60, 0.22], [40, 0.4]] as const) { p.path(nerve, false); g.strokeStyle = rgba("#ffd84a", a * k); g.lineWidth = w; g.stroke(); }
  p.path(nerve, false); g.strokeStyle = "#5a3a10"; g.lineWidth = 30; g.stroke();
  p.path(nerve, false); g.strokeStyle = pulse > 0.5 ? "#fff2a0" : "#ffd040"; g.lineWidth = 20; g.stroke();
  p.path(nerve, false); g.strokeStyle = rgba(WHITE, 0.5 + 0.4 * pulse); g.lineWidth = 6; g.stroke();
  // padding cushions along the cable EXCEPT at the elbow (pink puffs on the humerus + forearm parts)
  for (const i of [3, 6, 24, 28]) { const q = nerve[i]; if (q) p.poly(puffPts(q[0], q[1], 34, 26, 6, i), "#ff9ab8", 5); }
  // the travelling blip
  if (pulse > 0.02) { const q = nerve[Math.min(nerve.length - 1, Math.floor(ph * (nerve.length - 1)))]; glow(p, q[0], q[1], 90, "#fff6c0", 0.95 * pulse); p.dot(q[0], q[1], 14, WHITE); }
  // the unpadded spot: a tiny warning spark
  p.poly(starPts(735, 612, 34 + 10 * pulse, 4, 0.3, 0.3), "#fff6a8", 4);
  // glass glare
  g.strokeStyle = "rgba(255,255,255,0.28)"; g.lineWidth = 34; g.beginPath(); g.arc(C, C, R - 60, rad(200), rad(250)); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 14; g.beginPath(); g.arc(C, C, R - 110, rad(205), rad(232)); g.stroke();
  g.restore();
  // the rim: chunky cream ring with bolts + an ink rim, a red tab "X-RAY"
  g.save(); g.beginPath(); g.arc(C, C, R + 70, 0, Math.PI * 2); g.arc(C, C, R, 0, Math.PI * 2, true);
  const rg = g.createLinearGradient(0, 100, 0, 940); rg.addColorStop(0, "#fff4d8"); rg.addColorStop(1, "#d8b878");
  g.fillStyle = rg; g.fill("evenodd"); g.restore();
  p.ell(C, C, R + 70, R + 70, null, 16); p.ell(C, C, R, R, null, 12);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.39; p.ell(C + Math.cos(a) * (R + 35), C + Math.sin(a) * (R + 35), 13, 13, "#a8885a", 5); }
  local(p, C, C - R - 52, 0, () => { p.poly(rrect(-120, -46, 120, 46, 22), "#ff4a5a", 10); letter(p, "X-RAY", 0, 3, 62, WHITE, 0, 0, 210); });
};

// ============================================================ arm
const dropPts = (x: number, y: number, r: number): P2[] => {
  const out: P2[] = [];
  for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; out.push([x + Math.cos(a) * r, y + 0.05 * r + Math.sin(a) * r]); }
  out.push(...thru([x - r * 0.98, y + 0.05 * r], [x - 0.6 * r, y - 1.0 * r], [x, y - 2.1 * r], 8));
  out.push(...thru([x, y - 2.1 * r], [x + 0.6 * r, y - 1.0 * r], [x + r * 0.98, y + 0.05 * r], 8).slice(1));
  return out;
};
/** a sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => { const pts = dropPts(100, 170, 50); p.poly(pts, "#8ad4ff", 0); p.clip(pts, () => p.ell(118, 192, 40, 30, "#3a8ad8", 0)); p.poly(pts, null, 9); p.ell(82, 152, 10, 16, WHITE, 0, 0, 360, -20); };
/** a dust / skin-flake puff (256 x 256) */
export const fxPuff = (p: Pen, col: string, shade: string, seed: number) => { const pts = puffPts(128, 128, 104, 84, 8, seed); p.poly(pts, col, 8); p.clip(pts, () => p.ell(160, 168, 90, 50, shade, 0)); p.poly(pts, null, 8); p.ell(96, 98, 26, 14, rgba(WHITE, 0.8), 0, 0, 360, -20); };
/** a jagged lightning arc (512 x 256), left -> right, with forks; hot = white core / cyan rim */
export const fxBolt = (p: Pen, seed: number, col = "#7ae8ff") => {
  const pts: P2[] = [[16, 128]];
  for (let i = 1; i < 9; i++) pts.push([16 + i * 60 + (rnd(seed, i) - 0.5) * 20, 128 + (rnd(seed, i + 20) - 0.5) * 120 * Math.sin((i / 9) * Math.PI)]);
  pts.push([496, 128 + (rnd(seed, 40) - 0.5) * 30]);
  glow(p, 256, 128, 250, col, 0.0);
  p.line(pts, col, 16);
  p.stroke(pts, 6, WHITE);
  for (let f = 0; f < 2; f++) {
    const i = 2 + Math.floor(rnd(seed, 50 + f) * 5), a = pts[i], d = (rnd(seed, 60 + f) > 0.5 ? 1 : -1);
    const fk: P2[] = [a, [a[0] + 40, a[1] + d * 34], [a[0] + 70, a[1] + d * 30 + 20 * d], [a[0] + 110, a[1] + d * 70]];
    p.line(fk, col, 8); p.stroke(fk, 3, WHITE);
  }
};
/** a 4-point twinkle (256 x 256) */
export const fxSpark = (p: Pen, col: string) => { p.poly(starPts(128, 128, 112, 4, 0.22), col, 9); p.dot(128, 128, 16, WHITE); };
/** a soft radial glow (soft card, 256 x 256) */
export const fxGlow = (p: Pen, col: string, a: number) => glow(p, 128, 128, 126, col, a, 0.35);
/** soft rays (soft card, 1024 x 1024) */
export const fxRays = (p: Pen, c0: string, c1: string, a: number, n = 20) => {
  for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n; p.poly([[512, 512], [512 + Math.cos(a0) * 512, 512 + Math.sin(a0) * 512], [512 + Math.cos(a1) * 512, 512 + Math.sin(a1) * 512]], rgba(i % 2 ? c0 : c1, a), 0); }
  glow(p, 512, 512, 420, "#ffffff", a * 0.6);
};
/** the surge front (512 x 512): a crackling ball of light, star core + mini forks (seed = variant) */
export const fxFront = (p: Pen, seed: number) => {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + rnd(seed, i), pts: P2[] = [[256, 256]];
    for (let k = 1; k <= 4; k++) { const d = k * 52, o = (rnd(seed, i * 7 + k) - 0.5) * 50; pts.push([256 + Math.cos(a) * d - Math.sin(a) * o, 256 + Math.sin(a) * d + Math.cos(a) * o]); }
    p.line(pts, "#9af0ff", 10); p.stroke(pts, 4, WHITE);
  }
  p.poly(starPts(256, 256, 120, 8, 0.5, rnd(seed, 99), seed, 0.3), "#e8fdff", 10);
  p.ell(256, 256, 50, 50, WHITE, 0);
};

// ============================================================ peak
/** ZZZAP! (1600 x 560): jagged electric letters, white-cyan-blue gradient, navy ink (ph = wobble phase, 2 drawings) */
export const fxZap = (p: Pen, ph: number) => {
  // a zigzag bolt underline behind the word
  const z: P2[] = []; for (let i = 0; i <= 12; i++) z.push([80 + i * 120, 470 + (i % 2 ? -34 : 34)]);
  p.line(z, "#ffe14a", 26);
  shaky(p, "ZZZAP!", 1600, 520, 400, ph, 18, ["#ffffff", "#9af0ff", "#2a9aff"], 42, 18, 0.8);
};
/** a striped tee (256 x 256) */
export const fxShirt = (p: Pen) => {
  const pts: P2[] = [[70, 40], [104, 30], [128, 52], [152, 30], [186, 40], [236, 96], [204, 126], [182, 108], [184, 226], [72, 226], [74, 108], [52, 126], [20, 96]];
  p.poly(pts, "#ffd23a", 0);
  p.clip(pts, () => { for (let i = 0; i < 5; i++) p.poly([[0, 70 + i * 36], [256, 70 + i * 36], [256, 86 + i * 36], [0, 86 + i * 36]], "#3a8ae8", 0); });
  p.poly(pts, null, 8);
};
/** heart-print underpants (256 x 256) */
export const fxPants = (p: Pen) => {
  const pts: P2[] = [[40, 60], [216, 60], [222, 120], [190, 196], [146, 150], [128, 160], [110, 150], [66, 196], [34, 120]];
  p.poly(pts, WHITE, 0);
  p.clip(pts, () => { for (const [x, y] of [[80, 100], [150, 92], [190, 132], [100, 150], [128, 118]] as const) { p.ell(x - 7, y, 9, 9, "#ff5a7a", 0); p.ell(x + 7, y, 9, 9, "#ff5a7a", 0); p.poly([[x - 15, y + 3], [x + 15, y + 3], [x, y + 18]], "#ff5a7a", 0); } });
  p.poly(pts, null, 8);
  p.poly([[40, 60], [216, 60], [216, 78], [40, 78]], "#9ad0ff", 6);
};
/** a rubber duck (256 x 256) */
export const fxDuck = (p: Pen) => {
  p.poly(puffPts(120, 160, 92, 60, 9, 3, 1.05), "#ffd23a", 8);
  p.ell(160, 92, 52, 50, "#ffd23a", 8);
  p.poly([[200, 92], [246, 102], [204, 116]], "#ff8a2a", 6);
  p.ell(170, 82, 12, 14, WHITE, 4); p.dot(174, 84, 6);
  p.arc(110, 160, 40, 24, 200, 340, 6);
};
/** a smoke puff (soft, 256 x 256) */
export const fxSmoke = (p: Pen, seed: number, a: number) => {
  alpha(p, a, () => {
    p.poly(puffPts(128, 128, 100, 86, 8, seed), "#6a6a7a", 0);
    p.poly(puffPts(118, 112, 70, 56, 7, seed + 3), "#9a9aac", 0);
    p.ell(100, 96, 24, 14, "#c4c4d4", 0);
  });
};

// ============================================================ surge
/** AAAAA! (1400 x 500) shaking scream letters; small = RING's "aa" (half blue, half yellow, half-hearted) */
export const fxScream = (p: Pen, word: string, ph: number, half = false) => {
  if (half) shaky(p, word, 1400, 500, 380, ph, 10, ["#bfe6ff", "#5aa0e8"], 40, 14, 0.9);
  else shaky(p, word, 1400, 500, 400, ph, 34, ["#fff07a", "#ff8a3a", "#e8243a"], 42, 16, 0.78);
};
/** a small word (512 x 256): "zzt" (electric yellow), "fine." (calm) */
export const fxWordSm = (p: Pen, word: string, style: "zzt" | "fine", ph = 0) => {
  if (style === "zzt") {
    const z: P2[] = [[60, 200], [120, 170], [100, 210], [170, 186]];
    p.line(z, "#ffe14a", 10);
    shaky(p, word, 512, 230, 150, ph, 8, ["#fff6a8", "#ffd23a"], 22, 6, 0.95);
  } else {
    letter(p, word, 256, 128, 120, vgrad(p, 70, 190, ["#ffffff", "#bff0ff"]), 18, 6, 470, SERIF, 700);
  }
};

// ============================================================ museum
/** the RIMSHOT (1280 x 520): a tiny drum kit on the left (bass drum with a star, snare, a cymbal on a stand that
 *  wobbles on TSS) + the three beats "BA-" "DUM-" "TSS!" (stage 0..3 = how many are shown; crash = cymbal lines) */
export const fxRimshot = (p: Pen, stage: number, crash: number) => {
  // kit
  local(p, 170, 300, 0, () => {
    p.stroke([[110, -150], [120, 170]], 10); p.stroke([[120, 170], [80, 205]], 8); p.stroke([[120, 170], [160, 205]], 8);
    local(p, 110, -150, crash > 0 ? 0.22 * Math.sin(crash * 9) * (1 - cl01(crash)) + 0.12 : 0.12, () => { p.ell(0, 0, 105, 22, "#ffd23a", 9); p.ell(-30, -6, 40, 8, "#fff6a8", 0); });
    p.ell(0, 90, 112, 112, "#e8243a", 10); p.ell(0, 90, 82, 82, "#fff4e0", 8); p.poly(starPts(0, 90, 46, 5, 0.45), "#ffd23a", 6);
    p.poly(rrect(-150, -30, -36, 34, 14), "#e8e8f4", 8); p.stroke([[-150, -14], [-36, -14]], 6, "#e8243a");
    p.stroke([[-130, -110], [-70, -40]], 9, "#c89a5a"); p.dot(-130, -110, 12, "#c89a5a");
  });
  const words: [string, number, number, string][] = [["BA-", 470, 280, "#ffe14a"], ["DUM-", 750, 250, "#ffb03a"], ["TSS!", 1070, 220, "#9af0ff"]];
  words.forEach(([w, x, y, c], i) => {
    const k = cl01(stage - i);
    if (k <= 0) return;
    local(p, x, y, -0.08 + 0.06 * i, () => letter(p, w, 0, 0, 150 + (i === 2 ? 30 : 0), vgrad(p, -80, 80, [WHITE, c]), 30, 12, 330), 0.6 + 0.4 * k);
  });
  if (crash > 0) for (let i = 0; i < 5; i++) { const a = rad(-160 + i * 28); p.stroke([[280 + Math.cos(a) * 140, 150 + Math.sin(a) * 60], [280 + Math.cos(a) * 200, 150 + Math.sin(a) * 90]], 9); }
};
/** a laughing speech puff (800 x 480) in an old-paint palette */
export const fxHa = (p: Pen, word: string, col: string, ph: number, seed: number) => {
  p.poly([[300, 380], [210, 470], [380, 386]], "#fff6e0", 10);
  p.poly(puffPts(400, 220, 360, 180, 11, seed, 1.1), "#fff6e0", 12);
  local(p, 400, 222 + 8 * Math.sin(ph * 2), 0.05 * Math.sin(ph * 3), () => letter(p, word, 0, 0, 150, col, 0, 0, 600, SERIF, 900), 1 + 0.04 * Math.sin(ph * 5));
};
/** a dust cloud (soft, 256 x 256) */
export const fxDust = (p: Pen, seed: number, a: number) => {
  alpha(p, a, () => {
    const body = puffPts(128, 132, 96, 76, 8, seed, 1.18);
    p.poly(body, "#f4ead4", 0);
    p.clip(body, () => { p.ell(150, 176, 100, 56, "#ddc9a4", 0); p.ell(100, 98, 40, 22, "#fffaf0", 0); });
    for (let i = 0; i < 4; i++) p.dot(40 + 180 * rnd(seed, i), 40 + 180 * rnd(seed, i + 5), 5 + 5 * rnd(seed, i + 9), "#e0cca4");
  });
};
