// OWNER: cast agent. Drawings for "The Falling Jolt Before Sleep" (all NEW designs; Pen style: thick-thin plum ink,
// painted crescents). Character cards use the bridge 600 x 1000 design space (1000 units = 2.16 m at scale 1).
//   drawBed    a sleeper LYING IN BED, drawn in BED SPACE: X = 0..1000 along the bed (head end -> foot end, screen
//              left -> right), Y = height, DOWN positive, mattress top at Y = 0 (canvas x = 40 - Y, canvas y = X; the
//              cast rolls the card +90 deg so that canvas "up" points to world -x). Pillow, body (pyjamas, flung limbs
//              on a jolt), head (face + hair + nightcap / curlers / mask / ...), the flapping duvet, the over-duvet
//              arm (rest / clutch / pat / limp), plushies. BEAN + 9 window sleepers (people and a dog).
//   drawApe    the cute round ANCESTOR APE (asleep on its back, sliding, tumbling, THE MEME FACE, dangling) on an
//              upright card; body centre + hands / feet are canvas points chosen by the cast.
//   drawCat    the SABRE-TOOTH CAT sitting on its haunches (napkin bib, knife + fork): sly grin, lip lick, drool,
//              shock, the disappointed sigh.
//   fx*        Zzz, JOLT! bursts, motion lines, "!" "?", sweat, sparkles, SNORE bubble, tree thought bubble, label,
//              "pat pat", sigh puff, whoosh arcs, peak ray burst, heart thump.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix } from "../bridge/toon";

export type P2 = [number, number];
type C3 = [number, number, number];
const WHITE = "#ffffff", MOUTH = "#5a1424", TONGUE = "#ff6f86", TEAR = "#a6dcff", TEAR_HI = "#eefaff", BLUSH = "#ff5a7a";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 73.31 + k * 51.17) * 21734.1931; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = cl01(x); return u * u * (3 - 2 * u); };
export const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const qbez = (a: P2, c: P2, b: P2, n = 12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
/** quadratic curve through k at its middle */
const thru = (a: P2, k: P2, b: P2, n = 12) => qbez(a, [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], b, n);
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
};
const shrink = (pts: P2[], k: number): P2[] => {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x / pts.length; cy += y / pts.length; }
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
const rotP = (P: P2, a: number, c: P2 = [0, 0]): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
/** inked limb: ink stroke then colour stroke (round caps) */
const limb = (p: Pen, pts: P2[], col: string, w: number, ink: number) => { p.stroke(pts, w + 2 * ink, INK); p.stroke(pts, w, col); };
const tapered = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
/** soft radial glow at a design point (in-card) */
const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  if (a <= 0.01) return;
  const g = p.g, gr = g.createRadialGradient(x0, y0, 0, x0, y0, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, r, 0, Math.PI * 2); g.fill();
};
const faded = (p: Pen, a: number, fn: () => void) => { if (a <= 0.01) return; const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
/** draw fn() in a local frame: translate to (x, y), rotate a */
const local = (p: Pen, x: number, y: number, a: number, fn: () => void) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); fn(); g.restore(); };
const SH_SKIN: C3 = [0.95, 0.84, 0.86], SH_CLOTH: C3 = [0.64, 0.68, 0.8], SH_HAIR: C3 = [0.64, 0.62, 0.74];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo outside the ink) */
const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};
const starPts = (cx: number, cy: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return out;
};
const heartPts = (cx: number, cy: number, r: number): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < 40; i++) { const t = (i / 40) * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); out.push([cx + (x * r) / 16, cy + (y * r) / 16]); }
  return out;
};
/** fluffy cloud ring (bumps) round an ellipse */
const cloudPts = (cx: number, cy: number, rx: number, ry: number, bumps: number, seed: number, bulge = 1.13): P2[] => {
  const ring: P2[] = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2, a1 = ((i + 1) / bumps) * Math.PI * 2, r0 = 0.9 + 0.08 * rnd(seed, i), r1 = 0.9 + 0.08 * rnd(seed, (i + 1) % bumps);
    const P0: P2 = [cx + Math.cos(a0) * rx * r0, cy + Math.sin(a0) * ry * r0], P1: P2 = [cx + Math.cos(a1) * rx * r1, cy + Math.sin(a1) * ry * r1];
    const am = (a0 + a1) / 2, C: P2 = [cx + Math.cos(am) * rx * bulge, cy + Math.sin(am) * ry * bulge];
    ring.push(...qbez(P0, C, P1, 6).slice(0, -1));
  }
  return ring;
};
/** y of a Catmull-Rom curve through pts (sorted by x) at x */
const spline = (pts: P2[], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  const n = pts.length;
  if (x >= pts[n - 1][0]) return pts[n - 1][1];
  let i = 0;
  while (i < n - 2 && x > pts[i + 1][0]) i++;
  const p0 = pts[Math.max(0, i - 1)][1], p1 = pts[i][1], p2 = pts[i + 1][1], p3 = pts[Math.min(n - 1, i + 2)][1];
  const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]), t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

// ======================================================================================================================
// FACES (BEAN + the window sleepers; local frame: head centre at 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr = "sleep" | "dream" | "snore" | "slack" | "jolt" | "wide" | "susp" | "half" | "uneasy" | "scrunch" | "proud" | "stare" | "side";
type EyeK = "shut" | "pop" | "wide" | "flat" | "half" | "happy" | "squeeze" | "round" | "blink";
type MouthK = "content" | "snore" | "slack" | "gah" | "wobble" | "smirk" | "grit" | "grin" | "o" | "frown";
/** eyes [screen-left, screen-right], brows [inner, outer] (u, + = down) per side, mouth */
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number; bags?: number }> = {
  sleep: { eye: ["shut", "shut"], brow: [[1, 2], [1, 2]], mouth: "content", blush: 0.35 },
  dream: { eye: ["shut", "shut"], brow: [[-1, 1], [-1, 1]], mouth: "content", blush: 0.6 },
  snore: { eye: ["shut", "shut"], brow: [[0, 2], [0, 2]], mouth: "snore", blush: 0.3 },
  slack: { eye: ["shut", "shut"], brow: [[-1, 3], [-1, 3]], mouth: "slack", blush: 0.2 },
  jolt: { eye: ["pop", "pop"], brow: [[-12, -15], [-12, -15]], mouth: "gah" },
  wide: { eye: ["wide", "wide"], brow: [[-7, -4], [-7, -4]], mouth: "wobble", bags: 0.8 },
  susp: { eye: ["flat", "flat"], brow: [[5, -1], [-5, -8]], mouth: "smirk" },
  half: { eye: ["shut", "half"], brow: [[1, 2], [-3, -4]], mouth: "slack", blush: 0.2 },
  uneasy: { eye: ["shut", "shut"], brow: [[-6, 3], [-6, 3]], mouth: "frown" },
  scrunch: { eye: ["squeeze", "squeeze"], brow: [[7, -2], [7, -2]], mouth: "grit" },
  proud: { eye: ["happy", "happy"], brow: [[-4, -5], [-4, -5]], mouth: "grin", blush: 0.8 },
  stare: { eye: ["round", "round"], brow: [[-4, -1], [-4, -1]], mouth: "o" },
  side: { eye: ["flat", "flat"], brow: [[4, 0], [4, 0]], mouth: "frown", bags: 0.5 },
};
export type FaceS = { e: Expr; look?: P2; k?: number; shake?: number };
const eye = (p: Pen, kind: EyeK, x: number, y: number, u: number, side: number, look: P2, k: number, shake: number, skin: string) => {
  const lx = look[0], ly = look[1];
  switch (kind) {
    case "shut": // sleepy closed lids: a soft U + one lash
      p.arc(x, y - 3 * u, 9.5 * u, 6.5 * u, 22, 158, 3.6 * u);
      p.stroke([[x + side * 8.6 * u, y - 0.4 * u], [x + side * 12.5 * u, y + 2.4 * u]], 2.4 * u);
      break;
    case "blink": p.stroke(thru([x - 9 * u, y], [x, y + 1.6 * u], [x + 9 * u, y], 8), 3.6 * u); break;
    case "pop": { // the jolt: eyes spring wide open, huge and white, pin pupils
      const s = 1 + 0.28 * cl01(k), r = 12.5 * u * s, j = (shake % 2 ? 0.8 : -0.8) * u;
      p.ell(x, y - 3 * u, r, r * 1.12, WHITE, 3.4 * u);
      p.arc(x, y - 3 * u, r * 0.78, r * 0.88, 30, 110, 2 * u, "rgba(150,170,220,0.55)");
      p.dot(x + j - side * 1.2 * u, y - 2.6 * u, 2.6 * u);
      break;
    }
    case "wide": { // wide awake: big white eyes, small trembling pupils
      const j = (shake % 2 ? 0.5 : -0.5) * u;
      p.ell(x, y - u, 10.5 * u, 12 * u, WHITE, 3 * u);
      p.ell(x + lx * 3 * u + j, y + ly * 3 * u - u, 3.6 * u, 4.2 * u, INK, 0); p.dot(x + lx * 3 * u + j - 1.2 * u, y + ly * 3 * u - 2.4 * u, 1.2 * u, WHITE);
      break;
    }
    case "round": { // staring: round eyes, pupils toward `look`
      p.ell(x, y - u, 9.5 * u, 10.5 * u, WHITE, 3 * u);
      const px = x + lx * 4 * u, py = y - u + ly * 4.4 * u;
      p.ell(px, py, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.4 * u, py - 1.8 * u, 1.5 * u, WHITE);
      break;
    }
    case "flat": case "half": { // suspicious flat lid / sleepy half lid, pupil slid to `look`
      const lidY = kind === "flat" ? y - 2.2 * u : y + 0.2 * u, wpts = ellPts(x, y, 9.8 * u, 8 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4.6 * u, py = y + 1.8 * u + ly * 1.5 * u;
        p.ell(px, py, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.2 * u, 1.3 * u, WHITE);
        p.poly([[x - 13 * u, y - 12 * u], [x + 13 * u, y - 12 * u], [x + 13 * u, lidY], [x - 13 * u, lidY]], mul(skin, [0.93, 0.86, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke([[x - 11 * u, lidY], [x + 11 * u, lidY]], 4 * u);
      break;
    }
    case "happy": p.arc(x, y + 3 * u, 9 * u, 7.5 * u, 200, 340, 4 * u); break;
    case "squeeze": { const o = side * 8 * u; p.stroke([[x - o, y - 6 * u], [x + o * 0.6, y], [x - o, y + 6 * u]], 4.2 * u); break; }
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number, drool: number) => {
  switch (kind) {
    case "content": p.arc(mx, my - 4 * u, 8 * u, 5 * u, 25, 155, 3.4 * u); break;
    case "snore": p.ell(mx, my + u, 4.2 * u, 5 * u, MOUTH, 2.8 * u); break;
    case "slack": { // limp: jaw hanging, a drool string
      const pts = ellPts(mx, my + 2 * u, 6.5 * u, 8 * u, 30);
      p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 9 * u, 5 * u, 4 * u, TONGUE, 0)); p.poly(pts, null, 2.8 * u);
      if (drool > 0.02) { const x = mx + 5.5 * u, y0 = my + 6 * u, L = 16 * u * drool; p.poly([[x - 1.6 * u, y0], [x + 1.6 * u, y0], [x + 2.4 * u, y0 + L], [x, y0 + L + 3 * u], [x - 2.4 * u, y0 + L]], TEAR, 1.8 * u); }
      break;
    }
    case "gah": { // the JOLT yell: a huge D, top teeth, tongue, uvula
      const w = 13 * u, h = (18 + 6 * cl01(k)) * u, top = my - 6 * u;
      const pts = [...thru([mx - w, top], [mx, top - 2 * u], [mx + w, top], 10), ...thru([mx + w, top], [mx + 0.2 * w, top + 1.3 * h], [mx - w, top], 14).slice(1)];
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => {
        p.ell(mx + 2 * u, top + h * 0.98, w * 0.7, h * 0.4, TONGUE, 0);
        p.poly([[mx - w, top - 4 * u], [mx + w, top - 4 * u], [mx + w, top + 4.5 * u], [mx - w, top + 4.5 * u]], WHITE, 1.4 * u);
        for (let i = -2; i <= 2; i++) p.stroke([[mx + i * w * 0.32, top], [mx + i * w * 0.32, top + 4.5 * u]], 1.2 * u);
        p.ell(mx, top + 8 * u, 2 * u, 3 * u, "#a8304a", 0);
      });
      p.poly(pts, null, 3.4 * u);
      break;
    }
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.6 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9)]); p.stroke(s, 3.4 * u); break; }
    case "smirk": p.stroke(thru([mx - 9 * u, my + 2.5 * u], [mx, my + 1.5 * u], [mx + 8 * u, my - 3 * u], 8), 3.6 * u); p.stroke([[mx + 8 * u, my - 3 * u], [mx + 10 * u, my - 1 * u]], 2.2 * u); break;
    case "grit": {
      const pts = rrect(mx - 12 * u, my - 4.5 * u, mx + 12 * u, my + 5 * u, 3.5 * u);
      p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 11 * u, my + 0.3 * u], [mx + 11 * u, my + 0.3 * u]], 1.4 * u);
      for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.5 * u, my - 4 * u], [mx + i * 4.5 * u, my + 4.5 * u]], 1.2 * u);
      break;
    }
    case "grin": { // proud: wide open smile, top teeth, tongue
      const pts = [...thru([mx - 14 * u, my - 4 * u], [mx, my - 2 * u], [mx + 14 * u, my - 4 * u], 10), ...thru([mx + 14 * u, my - 4 * u], [mx, my + 12 * u], [mx - 14 * u, my - 4 * u], 12).slice(1)];
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => { p.ell(mx, my + 9 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 15 * u, my - 7 * u], [mx + 15 * u, my - 7 * u], [mx + 15 * u, my], [mx - 15 * u, my]], WHITE, 1.2 * u); });
      p.poly(pts, null, 3.2 * u);
      break;
    }
    case "o": p.ell(mx, my + u, 3.6 * u, 4.2 * u, MOUTH, 2.6 * u); break;
    case "frown": p.arc(mx, my + 4 * u, 7.5 * u, 4 * u, 205, 335, 3.4 * u); break;
  }
};
/** the whole face (eyes, brows, nose, mouth, blush, freckles). mask: a sleep mask covers the eyes */
const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: { freckles?: boolean; brow?: string; browW?: number; drool?: number; masked?: boolean }) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0;
  const ex = 0.36 * a, ey = -0.04 * a;
  const blush = D.blush ?? 0;
  if (blush > 0.02) for (const s of [-1, 1]) glow(p, s * 0.6 * a, 0.3 * a, 0.25 * a, BLUSH, 0.5 * blush);
  if (opt.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(s * (0.44 + 0.1 * i) * a, (0.2 + (i % 2) * 0.07) * a, 1.5 * u, rgba("#b05a3a", 0.7));
  for (const s of [-1, 1]) {
    const x = s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "flat", "half"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round")) ek = "half";
    if ((D.bags ?? 0) > 0) faded(p, D.bags ?? 0, () => { p.arc(x, ey + 9 * u, 8 * u, 4 * u, 20, 160, 1.8 * u, "#8a5a8a"); p.arc(x, ey + 12 * u, 6.5 * u, 3 * u, 30, 150, 1.4 * u, "#8a5a8a"); });
    if (!opt.masked) eye(p, ek, x, ey, u, s, look, k, shake, skin);
    const bw = D.brow[s < 0 ? 0 : 1], pop = ek === "pop" || ek === "wide";
    const by = ey - (pop ? 22 : 17) * u;
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 8.5 * u, by + bw[1] * u];
    if (opt.brow) { const w = opt.browW ?? 1; tapered(p, b0, b1, 9 * u * w, 6 * u * w, INK); tapered(p, b0, b1, 6 * u * w, 3.4 * u * w, opt.brow); }
    else tapered(p, b0, b1, 5.4 * u, 3 * u, INK);
  }
  // nose: a soft button
  const nb = mul(skin, [0.97, 0.87, 0.86]);
  p.ell(0, 0.17 * a, 6.2 * u, 5 * u, nb, 0);
  p.arc(0, 0.17 * a, 6.2 * u, 5 * u, 20, 160, 2.6 * u);
  p.dot(-2 * u, 0.14 * a - 1.4 * u, 1.4 * u, "rgba(255,255,255,0.75)");
  mouth(p, D.mouth, 0, 0.43 * a, u, k, shake, opt.drool ?? 0);
};

// ======================================================================================================================
// SLEEPERS IN BED (bed space)
// ======================================================================================================================
export type Style = "bean" | "bald" | "curlers" | "beard" | "spiky" | "part" | "pigtails" | "bun" | "mohawk" | "dog";
export type Pattern = "stars" | "dots" | "check" | "hearts" | "plaid" | "bones" | "stripe" | "zig" | "moons";
export type BedKit = {
  seed: number; style: Style; skin: string; hair: string; pj: string; pj2: string; duvet: string; duvet2: string; pat: Pattern; pillow: string;
  sock: string; extra?: ("tache" | "teddy" | "phones" | "mask" | "glasses" | "unicorn" | "freckles")[];
};
export const BEAN_KIT: BedKit = { seed: 41, style: "bean", skin: "#ffdcbc", hair: "#8a4a26", pj: "#ff7a68", pj2: "#fff1d6", duvet: "#ffbe3d", duvet2: "#fff6d8", pat: "stars", pillow: "#eee6ff", sock: "#7ac8ff", extra: ["freckles"] };
/** the 10 window sleepers (index = window); BEAN is window 4 */
export const SLEEPERS: BedKit[] = [
  { seed: 11, style: "bald", skin: "#f2c8a0", hair: "#f4f2ee", pj: "#5aa06a", pj2: "#d8f0d8", duvet: "#6ac0ff", duvet2: "#f0c890", pat: "plaid", pillow: "#f6f0e6", sock: "#8a6a4a", extra: ["tache"] },
  { seed: 12, style: "curlers", skin: "#f8d4b8", hair: "#7a4a8a", pj: "#ff8ab8", pj2: "#ffffff", duvet: "#ff8a6a", duvet2: "#ffe27a", pat: "dots", pillow: "#fff0f6", sock: "#ff8ab8" },
  { seed: 13, style: "beard", skin: "#c99067", hair: "#3a2418", pj: "#4a7ad8", pj2: "#a8c8ff", duvet: "#ffd34a", duvet2: "#e0802a", pat: "check", pillow: "#eef4ff", sock: "#4a7ad8", extra: ["teddy"] },
  { seed: 14, style: "dog", skin: "#f6efe4", hair: "#a8642e", pj: "#f6efe4", pj2: "#d8b48a", duvet: "#c98ae0", duvet2: "#ffffff", pat: "bones", pillow: "#f4f0ff", sock: "#f6efe4" },
  { ...BEAN_KIT },
  { seed: 16, style: "spiky", skin: "#ecd0b6", hair: "#2a2a3a", pj: "#5a5a6e", pj2: "#9ae86a", duvet: "#7ad08a", duvet2: "#ffffff", pat: "zig", pillow: "#e8e4f4", sock: "#9ae86a", extra: ["phones"] },
  { seed: 17, style: "part", skin: "#f5c9a0", hair: "#4a3020", pj: "#2e4a8a", pj2: "#8aa8e8", duvet: "#ff7aa0", duvet2: "#ffffff", pat: "stripe", pillow: "#f4f6fa", sock: "#2e4a8a", extra: ["mask"] },
  { seed: 18, style: "pigtails", skin: "#ffe0c4", hair: "#e8a030", pj: "#ffd84a", pj2: "#ffffff", duvet: "#5a8ae0", duvet2: "#ffffff", pat: "hearts", pillow: "#fff4fa", sock: "#ff8ac0", extra: ["unicorn", "freckles"] },
  { seed: 19, style: "bun", skin: "#f2cfb0", hair: "#c8c4d0", pj: "#b08ae0", pj2: "#ffffff", duvet: "#ff6a6a", duvet2: "#ffffff", pat: "moons", pillow: "#fbf6ff", sock: "#b08ae0", extra: ["glasses"] },
  { seed: 20, style: "mohawk", skin: "#d8a47a", hair: "#3ad86a", pj: "#2a2a30", pj2: "#ff4a6a", duvet: "#6ab0f0", duvet2: "#ffffff", pat: "stars", pillow: "#f0f0f0", sock: "#ff4a6a" },
];
export type Arm = "rest" | "clutch" | "pat" | "limp" | "chin" | "none" | "hug";
export type BedS = {
  lift: number; duv: number; sep: number; flap: number; wave: number; splay: number; hairUp: number; capUp: number;
  tilt: number; breathe: number; wig: number; trem: number; pull: number; arm: Arm; patK: number; f: FaceS; lid: number; drool: number; mask: number;
  /** rest hand -> limp hand (slides off the duvet); rest hand -> head-pat */
  limpK: number; patB: number;
  /** the set owns the pillow (3D) */
  noPillow?: boolean;
};
/** bed-space layout (design units): head centre at rest, head half-width, body centre line, duvet ends */
export const BED = { head: [185, -93] as P2, a: 90, yc: -62, X0: 248, X1: 996 };
/** the duvet's top line above the mattress at rest (height, + = up) */
const PROFILE: P2[] = [[248, 92], [272, 128], [330, 148], [420, 144], [520, 126], [610, 110], [700, 116], [760, 122], [842, 102], [898, 126], [928, 160], [952, 150], [978, 96], [996, 34]];
/** where the head is (bed space) for a state */
export const bedHead = (s: { lift: number }): P2 => [BED.head[0], BED.head[1] - s.lift * 1.04];
/** the duvet's top surface Y at X (bed space, Y down) */
export const duvetTop = (s: BedS, X: number) => {
  let h = spline(PROFILE, X);
  if (s.wig !== 0) h += s.wig * 16 * Math.sin(X * 0.02) * Math.exp(-(((X - 900) / 70) ** 2)); // feet kicking under the duvet
  h = lerp(h, 92, 0.55 * s.sep);
  h += 6 * s.breathe * Math.exp(-(((X - 380) / 120) ** 2));
  h += s.pull * 40 * Math.exp(-(((X - 262) / 50) ** 2)); // pulled up to the chin (clutch)
  const env = Math.sin(Math.PI * cl01((X - BED.X0) / (BED.X1 - BED.X0)));
  const lift = s.duv * (0.86 + 0.14 * Math.sin(X * 0.011 + 1)) + s.flap * 34 * Math.sin(X / 95 - s.wave) * (0.4 + 0.6 * env);
  return -(h + lift);
};
const pattern = (p: Pen, kind: Pattern, col: string, x0: number, y0: number, x1: number, y1: number, seed: number, sz = 1) => {
  const g = p.g;
  switch (kind) {
    case "stars": case "moons": for (let gx = x0, i = 0; gx < x1; gx += 86 * sz, i++) for (let gy = y0 + (i % 2 ? 40 : 0) * sz, j = 0; gy < y1; gy += 80 * sz, j++) {
      const jx = (rnd(seed, i * 17 + j) - 0.5) * 24 * sz, jy = (rnd(seed, i * 31 + j) - 0.5) * 20 * sz;
      if (kind === "stars") p.poly(starPts(gx + jx, gy + jy, 15 * sz, 5, 0.45, -Math.PI / 2 + rnd(seed, i + j * 7)), col, 0);
      else p.poly([...ellPts(gx + jx, gy + jy, 13 * sz, 13 * sz, 20).slice(5, 16), ...ellPts(gx + jx + 5 * sz, gy + jy - 3 * sz, 10 * sz, 10 * sz, 20).slice(5, 16).reverse()], col, 0);
    } break;
    case "dots": for (let gx = x0, i = 0; gx < x1; gx += 46 * sz, i++) for (let gy = y0 + (i % 2 ? 23 : 0) * sz; gy < y1; gy += 46 * sz) p.dot(gx, gy, 8 * sz, col); break;
    case "check": case "plaid": {
      g.save(); g.globalAlpha *= kind === "check" ? 0.45 : 0.55;
      for (let gx = x0; gx < x1; gx += 70 * sz) p.poly([[gx, y0], [gx + 30 * sz, y0], [gx + 30 * sz, y1], [gx, y1]], col, 0);
      for (let gy = y0; gy < y1; gy += 70 * sz) p.poly([[x0, gy], [x1, gy], [x1, gy + 30 * sz], [x0, gy + 30 * sz]], col, 0);
      g.restore();
      if (kind === "plaid") for (let gx = x0 + 50 * sz; gx < x1; gx += 70 * sz) p.stroke([[gx, y0], [gx, y1]], 4 * sz, "#2a1a1a");
      break;
    }
    case "hearts": for (let gx = x0, i = 0; gx < x1; gx += 80 * sz, i++) for (let gy = y0 + (i % 2 ? 36 : 0) * sz; gy < y1; gy += 72 * sz) p.poly(heartPts(gx, gy, 14 * sz), col, 0); break;
    case "bones": for (let gx = x0, i = 0; gx < x1; gx += 90 * sz, i++) for (let gy = y0 + (i % 2 ? 40 : 0) * sz; gy < y1; gy += 80 * sz) local(p, gx, gy, 0.5 + i, () => {
      p.poly(rrect(-16 * sz, -5 * sz, 16 * sz, 5 * sz, 4 * sz), col, 0); for (const s of [-1, 1]) for (const t of [-1, 1]) p.dot(s * 16 * sz, t * 5 * sz, 6 * sz, col);
    }); break;
    case "stripe": for (let gx = x0; gx < x1; gx += 40 * sz) p.poly([[gx, y0], [gx + 14 * sz, y0], [gx + 14 * sz, y1], [gx, y1]], col, 0); break;
    case "zig": for (let gy = y0; gy < y1; gy += 56 * sz) { const s: P2[] = []; for (let gx = x0, i = 0; gx < x1 + 30; gx += 26 * sz, i++) s.push([gx, gy + (i % 2 ? 14 : -14) * sz]); p.stroke(s, 8 * sz, col); } break;
  }
};
/** hand (mitten + thumb) at H pointing along angle ang */
const hand = (p: Pen, H: P2, ang: number, skin: string, r = 17, fist = false, paw = false) => {
  local(p, H[0], H[1], ang, () => {
    if (paw) { p.ell(0, 0, r * 1.25, r, skin, 4); for (let i = -1; i <= 1; i++) p.stroke([[r * 0.55, i * r * 0.45], [r * 1.05, i * r * 0.5]], 3); return; }
    p.ell(0, 0, r * 1.1, r * (fist ? 0.95 : 0.85), skin, 4.4);
    if (fist) for (let i = -1; i <= 1; i++) p.stroke([[r * 0.2, i * r * 0.38], [r * 0.8, i * r * 0.38]], 2.6);
    p.ell(-r * 0.15, -r * 0.9, r * 0.3, r * 0.42, skin, 3.4, 0, 360, -30);
  });
};
/** a sleeve along pts with the hand at the end */
const arm = (p: Pen, pts: P2[], col: string, skin: string, w = 34, fist = false, paw = false, handAng?: number) => {
  limb(p, pts, col, w, 4.4);
  const B = pts[pts.length - 1], A = pts[pts.length - 2];
  const ang = handAng ?? Math.atan2(B[1] - A[1], B[0] - A[0]);
  hand(p, [B[0] + Math.cos(ang) * 8, B[1] + Math.sin(ang) * 8], ang, skin, 17, fist, paw);
};

// ---------------- hair + head wear ----------------
/** behind-the-head hair: jolt spikes, curler perm, bun, pigtails, puffs, beard backing */
const hairBack = (p: Pen, k: BedKit, a: number, up: number) => {
  const u = a / 50, col = k.hair, dk = mul(col, SH_HAIR), seed = k.seed;
  const spike = (ang: number, len: number, w: number, c: string) => {
    const b0: P2 = [Math.cos(ang - w) * a * 0.92, Math.sin(ang - w) * a * 0.92], b1: P2 = [Math.cos(ang + w) * a * 0.92, Math.sin(ang + w) * a * 0.92];
    const tip: P2 = [Math.cos(ang) * (a + len), Math.sin(ang) * (a + len)];
    p.poly([b0, lerp2(lerp2(b0, tip, 0.5), [Math.cos(ang + 0.3) * (a + len * 0.6), Math.sin(ang + 0.3) * (a + len * 0.6)], 0.25), tip, b1], c, 3.6 * u);
  };
  if (k.style === "bean" || k.style === "part" || k.style === "spiky" || k.style === "beard") {
    // a jolt makes every hair stand on end
    if (up > 0.03) for (let i = 0; i < 13; i++) { const f = i / 12, ang = rad(150 + f * 240) + (rnd(seed, i) - 0.5) * 0.15; spike(ang, (0.3 + 0.35 * rnd(seed, i + 5)) * a * up, 0.13, i % 3 ? col : dk); }
  }
  if (k.style === "curlers") p.poly(cloudPts(0, -0.15 * a, 1.2 * a, 1.08 * a, 12, seed, 1.12), col, 4 * u);
  if (k.style === "bun") { const by = -1.05 * a - 0.35 * a * up; p.ell(0, by, 0.42 * a, 0.36 * a, col, 4 * u); p.arc(0, by, 0.3 * a, 0.24 * a, 200, 330, 2 * u, dk); }
  if (k.style === "pigtails") for (const s of [-1, 1]) {
    const ang = rad(s > 0 ? 20 : 160) - s * up * 1.3, b: P2 = [s * 0.9 * a, -0.35 * a], tip: P2 = [b[0] + Math.cos(ang) * 0.75 * a, b[1] + Math.sin(ang) * 0.75 * a];
    const n: P2 = [-Math.sin(ang), Math.cos(ang)], mid = lerp2(b, tip, 0.5);
    const e0: P2 = [b[0] + n[0] * 0.2 * a, b[1] + n[1] * 0.2 * a], e1: P2 = [b[0] - n[0] * 0.2 * a, b[1] - n[1] * 0.2 * a];
    p.poly([...thru(e0, [mid[0] + n[0] * 0.3 * a, mid[1] + n[1] * 0.3 * a], tip, 8), ...thru(tip, [mid[0] - n[0] * 0.3 * a, mid[1] - n[1] * 0.3 * a], e1, 8).slice(1)], col, 4 * u);
    local(p, b[0], b[1], ang, () => { for (const t of [-1, 1]) p.poly([[0, 0], [-0.12 * a, t * 0.2 * a], [0.12 * a, t * 0.2 * a]], "#ff5a8a", 3 * u); p.dot(0, 0, 0.07 * a, "#ff5a8a"); });
  }
  if (k.style === "bald") for (const s of [-1, 1]) { // white puffs over the ears (poof on a jolt)
    const r = (0.26 + 0.16 * up) * a;
    p.poly(cloudPts(s * 0.92 * a, -0.18 * a - 0.1 * a * up, r, r * 0.9, 7, seed + s, 1.18), col, 3.6 * u);
  }
};
const hairFront = (p: Pen, k: BedKit, a: number, up: number, light: number) => {
  const u = a / 50, col = k.hair, dk = mul(col, SH_HAIR), seed = k.seed;
  const cap = (pts: P2[]) => { p.shadedFill(pts, col, dk, light, a, 0.35); p.poly(pts, null, 4 * u); };
  switch (k.style) {
    case "bean": { // a chestnut fringe peeking out under the nightcap + side tufts
      const fr: P2[] = [[-0.92 * a, -0.42 * a]];
      for (let i = 0; i <= 6; i++) { const f = i / 6, x = lerp(-0.86 * a, 0.7 * a, f); fr.push([x, -0.42 * a - 0.04 * a * Math.sin(f * Math.PI)]); if (i < 6) fr.push([x + 0.13 * a, (-0.14 - 0.08 * rnd(seed, i)) * a - up * 0.14 * a]); }
      fr.push([0.85 * a, -0.42 * a], [0.8 * a, -0.62 * a], [-0.9 * a, -0.62 * a]);
      cap(fr);
      for (const s of [-1, 1]) p.poly([[s * 0.9 * a, -0.45 * a], [s * (1.12 + 0.2 * up) * a, -0.2 * a - 0.2 * a * up], [s * 0.98 * a, -0.18 * a], [s * (1.08 + 0.15 * up) * a, 0.02 * a], [s * 0.92 * a, -0.02 * a]], col, 3.4 * u);
      break;
    }
    case "part": { // neat side part (businessman), a cowlick springs up on a jolt
      const pts: P2[] = [[-0.98 * a, -0.05 * a], ...thru([-0.98 * a, -0.05 * a], [-0.7 * a, -0.95 * a], [0.2 * a, -1.0 * a], 10).slice(1), ...thru([0.2 * a, -1.0 * a], [0.85 * a, -0.8 * a], [0.98 * a, -0.1 * a], 8).slice(1), [0.86 * a, -0.42 * a], ...thru([0.86 * a, -0.42 * a], [0.2 * a, -0.5 * a], [-0.35 * a, -0.62 * a], 8).slice(1), [-0.86 * a, -0.3 * a]];
      cap(pts); p.stroke(thru([-0.35 * a, -0.62 * a], [-0.3 * a, -0.85 * a], [-0.15 * a, -0.98 * a], 6), 2.4 * u, dk);
      if (up > 0.05) p.poly([[0.1 * a, -0.95 * a], [0.25 * a, -(1.1 + 0.5 * up) * a], [0.3 * a, -0.95 * a]], col, 3 * u);
      break;
    }
    case "spiky": {
      const pts: P2[] = [[-0.98 * a, -0.1 * a]];
      for (let i = 0; i <= 8; i++) { const ang = rad(185 + i * 21.25), r = (i % 2 ? 1.0 : 1.32 + 0.25 * up) * a; pts.push([Math.cos(ang) * r, Math.sin(ang) * r - 0.06 * a]); }
      pts.push([0.98 * a, -0.1 * a], [0.6 * a, -0.45 * a], [0.2 * a, -0.32 * a], [-0.3 * a, -0.48 * a], [-0.7 * a, -0.36 * a]);
      cap(pts);
      break;
    }
    case "beard": {
      const pts: P2[] = [[-0.96 * a, -0.2 * a], ...thru([-0.96 * a, -0.2 * a], [0, -1.22 * a], [0.96 * a, -0.2 * a], 14).slice(1), [0.7 * a, -0.55 * a], [0, -0.66 * a], [-0.7 * a, -0.55 * a]];
      cap(pts);
      break;
    }
    case "curlers": {
      p.poly(cloudPts(0, -0.72 * a, 0.9 * a, 0.34 * a, 9, seed + 3, 1.15), col, 3.6 * u);
      for (let i = 0; i < 4; i++) {
        const x = (-0.6 + i * 0.4) * a, y = -0.95 * a - (i % 2 ? 0.1 : 0) * a - up * 0.3 * a * (i % 2 ? 1.4 : 1), ang = (i - 1.5) * 0.25 + up * (i - 1.5) * 0.5;
        local(p, x, y, ang, () => { p.poly(rrect(-0.14 * a, -0.22 * a, 0.14 * a, 0.22 * a, 0.08 * a), "#ff9ac8", 3 * u); for (let j = -1; j <= 1; j++) p.stroke([[-0.12 * a, j * 0.1 * a], [0.12 * a, j * 0.1 * a]], 1.6 * u, "#e06a9a"); });
      }
      break;
    }
    case "pigtails": {
      const pts: P2[] = [[-0.98 * a, -0.05 * a], ...thru([-0.98 * a, -0.05 * a], [0, -1.24 * a], [0.98 * a, -0.05 * a], 14).slice(1)];
      for (let i = 6; i >= 0; i--) { const x = lerp(-0.85 * a, 0.85 * a, i / 6); pts.push([x, -0.38 * a + (i % 2 ? 0.1 * a : 0)]); }
      cap(pts);
      break;
    }
    case "bun": {
      const pts: P2[] = [[-1.0 * a, -0.05 * a], ...thru([-1.0 * a, -0.05 * a], [0, -1.2 * a], [1.0 * a, -0.05 * a], 14).slice(1), ...thru([1.0 * a, -0.05 * a], [0.5 * a, -0.55 * a], [0, -0.5 * a], 8).slice(1), ...thru([0, -0.5 * a], [-0.5 * a, -0.55 * a], [-1.0 * a, -0.05 * a], 8).slice(1, -1)];
      cap(pts); for (const s of [-1, 1]) p.arc(s * 0.45 * a, -0.75 * a, 0.25 * a, 0.12 * a, 200, 340, 2 * u, dk);
      break;
    }
    case "mohawk": { // a tall green crest (taller on a jolt)
      const pts: P2[] = [];
      for (let i = 0; i <= 8; i++) { const f = i / 8, ang = rad(212 + f * 116), r = a * (i % 2 ? 1.0 : 1.4 + 0.45 * up); pts.push([Math.cos(ang) * r * 0.62, Math.sin(ang) * r - 0.1 * a]); }
      pts.push([0.35 * a, -0.75 * a], [-0.35 * a, -0.75 * a]);
      cap(pts);
      break;
    }
    case "bald": p.arc(-0.2 * a, -0.55 * a, 0.3 * a, 0.18 * a, 200, 290, 4 * u, "rgba(255,255,255,0.7)"); break;
    case "dog": break;
  }
};
/** BEAN's long striped nightcap: droops over the pillow; up 0..1 = shot straight up stiff on a jolt */
const nightcap = (p: Pen, a: number, up: number, light: number) => {
  const u = a / 50, A = "#3a5fd8", B = "#a8d4ff", POM = "#ffd84a";
  const L: P2 = [-1.0 * a, -0.34 * a], R: P2 = [1.0 * a, -0.34 * a];
  const T = lerp2([-2.05 * a, 0.05 * a], [0.25 * a, -2.7 * a], up), Co = lerp2([0.05 * a, -2.25 * a], [0.85 * a, -1.5 * a], up), Ci = lerp2([-1.25 * a, -1.05 * a], [-0.55 * a, -1.5 * a], up);
  const crown: P2[] = [];
  for (let i = 0; i <= 16; i++) { const ang = rad(196 + i * (148 / 16)); crown.push([Math.cos(ang) * 1.05 * a, Math.sin(ang) * 1.0 * a - 0.08 * a]); }
  const cone: P2[] = [...crown, ...qbez(R, Co, T, 16).slice(1), ...qbez(T, Ci, L, 16).slice(1)];
  p.shadedFill(cone, A, mul(A, SH_CLOTH), light, 1.5 * a, 0.3);
  p.clip(cone, () => { for (let i = 0; i < 8; i++) p.arc(0, -0.3 * a, (1.35 + i * 0.42) * a, (1.3 + i * 0.42) * a, 0, 360, 0.2 * a, B); });
  p.poly(cone, null, 4.2 * u);
  const cuff = thru(L, [0, -0.6 * a], R, 14);
  limb(p, cuff, "#f6f4ff", 0.26 * a, 4 * u);
  for (let i = 1; i < 6; i++) { const P = cuff[Math.round((i / 6) * 14)]; p.arc(P[0], P[1] + 0.02 * a, 0.08 * a, 0.06 * a, 200, 340, 1.8 * u, "#c8c4e0"); }
  p.poly(cloudPts(T[0], T[1], 0.27 * a, 0.27 * a, 9, 5, 1.2), POM, 4 * u);
  p.arc(T[0] - 0.06 * a, T[1] - 0.06 * a, 0.13 * a, 0.1 * a, 200, 280, 2.4 * u, "rgba(255,255,255,0.8)");
};
const accessories = (p: Pen, k: BedKit, a: number, s: BedS) => {
  const u = a / 50, ex = k.extra ?? [];
  if (ex.includes("tache")) { // a white walrus moustache (bristles out on a jolt)
    const my = 0.33 * a, w = (0.55 + 0.15 * s.hairUp) * a;
    p.poly([...thru([-w, my + 0.1 * a], [-0.3 * a, my - 0.2 * a], [0, my - 0.05 * a], 8), ...thru([0, my - 0.05 * a], [0.3 * a, my - 0.2 * a], [w, my + 0.1 * a], 8).slice(1), ...thru([w, my + 0.1 * a], [0, my + 0.22 * a], [-w, my + 0.1 * a], 10).slice(1, -1)], k.hair, 3.4 * u);
  }
  if (ex.includes("glasses")) for (const sd of [-1, 1]) { p.ell(sd * 0.36 * a, -0.04 * a, 0.25 * a, 0.23 * a, "rgba(220,240,255,0.25)", 3 * u); p.arc(0, -0.06 * a, 0.12 * a, 0.06 * a, 200, 340, 2.6 * u); }
  if (ex.includes("phones")) {
    p.arc(0, -0.1 * a, 1.08 * a, 1.08 * a, 190, 350, 0.12 * a, INK); p.arc(0, -0.1 * a, 1.08 * a, 1.08 * a, 192, 348, 0.07 * a, "#ff4a6a");
    for (const sd of [-1, 1]) p.poly(rrect(sd * 1.0 * a - 0.16 * a, -0.25 * a, sd * 1.0 * a + 0.16 * a, 0.2 * a, 0.12 * a), "#ff4a6a", 3.6 * u);
  }
  if (ex.includes("mask")) { // a sleep mask: over the eyes, flipped up to the forehead on a jolt
    const my = lerp(-0.06 * a, -0.62 * a, s.mask);
    p.poly(rrect(-0.85 * a, my - 0.22 * a, 0.85 * a, my + 0.2 * a, 0.18 * a), "#6a4ab8", 3.6 * u);
    for (const sd of [-1, 1]) p.arc(sd * 0.36 * a, my + 0.02 * a, 0.16 * a, 0.08 * a, 20, 160, 2.6 * u, "#ffd84a");
  }
};
/** the dog (a beagle) asleep in a people bed; ears shoot up on a jolt */
const dogHead = (p: Pen, k: BedKit, f: FaceS, a: number, up: number, light: number) => {
  const u = a / 50, tan = k.hair, white = k.skin, jolt = f.e === "jolt", awake = !["sleep", "dream", "snore", "slack"].includes(f.e);
  for (const s of [-1, 1]) local(p, s * 0.7 * a, -0.55 * a, s * (0.25 - 2.9 * up), () => {
    const ear: P2[] = [[-0.2 * a, 0], ...thru([-0.2 * a, 0], [-0.3 * a, 0.7 * a], [0, 1.1 * a], 10).slice(1), ...thru([0, 1.1 * a], [0.36 * a, 0.6 * a], [0.22 * a, 0], 10).slice(1)];
    p.shadedFill(ear, mul(tan, [0.82, 0.76, 0.76]), mul(tan, [0.6, 0.55, 0.6]), light, a * 0.6, 0.3); p.poly(ear, null, 4 * u);
  });
  const head = blobPts(0, 0, { a: 0.95 * a, b: 0.9 * a, nTop: 2.0, nBot: 2.4, egg: -0.06, asym: 0, rot: 0, noise: 0.006, seed: 14 }, 72);
  p.shadedFill(head, tan, mul(tan, SH_SKIN), light, a, 0.4);
  p.clip(head, () => { p.poly([[-0.12 * a, -1.1 * a], [0.12 * a, -1.1 * a], [0.3 * a, 0.2 * a], [-0.3 * a, 0.2 * a]], white, 0); p.ell(0, 0.5 * a, 0.75 * a, 0.5 * a, white, 0); });
  p.inkRing(head, 4.6 * u, thickAngle(light), 0.45);
  p.ell(0, 0.42 * a, 0.5 * a, 0.34 * a, white, 3 * u);
  p.ell(0, 0.28 * a, 0.2 * a, 0.14 * a, INK, 0); p.dot(-0.06 * a, 0.24 * a, 0.05 * a, "rgba(255,255,255,0.7)");
  p.stroke([[0, 0.4 * a], [0, 0.52 * a]], 2.6 * u);
  if (awake) { // yip! eyes pop (tongue out on the jolt itself)
    if (jolt) { p.ell(0, 0.66 * a, 0.18 * a, 0.16 * a, MOUTH, 2.8 * u); p.ell(0.05 * a, 0.84 * a, 0.12 * a, 0.16 * a, TONGUE, 2.6 * u); }
    else p.arc(0, 0.6 * a, 0.14 * a, 0.06 * a, 200, 340, 2.6 * u);
    const r = jolt ? 1 : 0.85;
    for (const s of [-1, 1]) { p.ell(s * 0.34 * a, -0.12 * a, 0.22 * a * r, 0.25 * a * r, WHITE, 3 * u); p.dot(s * 0.34 * a, -0.1 * a, 0.06 * a); }
  } else {
    p.arc(-0.12 * a, 0.52 * a, 0.12 * a, 0.08 * a, 20, 160, 2.6 * u); p.arc(0.12 * a, 0.52 * a, 0.12 * a, 0.08 * a, 20, 160, 2.6 * u);
    for (const s of [-1, 1]) p.arc(s * 0.34 * a, -0.16 * a, 0.16 * a, 0.1 * a, 22, 158, 3.4 * u);
    glow(p, 0, 0.62 * a, 0.3 * a, BLUSH, 0.2);
  }
};

/** a whole sleeper in bed. Bed space (see the header); light = screen angle the light comes from. */
export const drawBed = (p: Pen, k: BedKit, s: BedS, light: number) => {
  const g = p.g, olSave = p.ol;
  g.save();
  g.transform(0, 1, -1, 0, 40, 0); // bed space -> canvas: x_c = 40 - Y, y_c = X
  if (s.trem) g.translate(s.trem, -Math.abs(s.trem) * 0.3);
  p.ol = 4.4;
  const a = BED.a, dog = k.style === "dog", thick = thickAngle(light);
  const yc = BED.yc - s.lift, H = bedHead(s), skin = k.skin, pj = k.pj, pjS = mul(pj, SH_CLOTH);
  // ---- pillow (puffs back up as the head leaves it)
  const puff = cl01(s.lift / 60);
  if (!s.noPillow) {
  const pil = rrect(46, -78 - 10 * puff, 336, 8, 38, 8).map(([x, y]) => [x + 6 * Math.sin(y * 0.05), y] as P2);
  p.gradFill(pil, k.pillow, mul(k.pillow, [0.78, 0.8, 0.92]), light, 0.35); p.inkRing(pil, 4.6, thick, 0.4);
  p.stroke(thru([70, -40 - 5 * puff], [190, -52 - 8 * puff], [310, -40 - 5 * puff], 10), 2.4, mul(k.pillow, [0.75, 0.78, 0.9]));
  }
  // ---- the body (visible when the duvet flies off it)
  const sp = s.splay;
  if (s.sep > 0.02 || sp > 0.02) {
    const hip: P2 = [560, yc + 10];
    const legs: [P2, P2, P2][] = [
      [[hip[0], hip[1] - 12], lerp2([730, yc - 2], [660, yc - 120], sp), lerp2([905, yc - 10], [770, yc - 190], sp)],
      [[hip[0], hip[1] + 8], lerp2([735, yc + 12], [720, yc - 60], sp), lerp2([915, yc + 4], [880, yc - 130], sp)],
    ];
    const shoulder: P2 = [305, yc - 10];
    const arms: [P2, P2, P2][] = [
      [shoulder, lerp2([380, yc + 10], [290, yc - 110], sp), lerp2([450, yc - 10], [250, yc - 190], sp)],
      [[shoulder[0] + 12, shoulder[1] + 10], lerp2([390, yc + 20], [400, yc - 110], sp), lerp2([470, yc], [440, yc - 200], sp)],
    ];
    const legDraw = (L: [P2, P2, P2]) => {
      limb(p, thru(L[0], L[1], L[2], 10), pj, 48, 4.4);
      const ang = Math.atan2(L[2][1] - L[1][1], L[2][0] - L[1][0]);
      local(p, L[2][0], L[2][1], ang, () => { p.poly(rrect(-14, -30, 30, 24, 18), dog ? k.skin : k.sock, 4.4); if (!dog) for (let i = 0; i < 2; i++) p.stroke([[-6 + i * 12, -26], [-6 + i * 12, 20]], 5, WHITE); });
    };
    legDraw(legs[0]);
    arm(p, thru(arms[0][0], arms[0][1], arms[0][2], 8), pj, skin, 36, false, dog);
    const torso = rrect(272, yc - 64, 610, yc + 58, 58, 8);
    p.gradFill(torso, pj, pjS, light, 0.3);
    p.clip(torso, () => { pattern(p, "dots", rgba(k.pj2, 0.9), 280, yc - 64, 610, yc + 60, k.seed, 0.8); p.stroke([[290, yc - 54], [600, yc - 54]], 6, k.pj2); });
    p.inkRing(torso, 4.4, thick, 0.4);
    legDraw(legs[1]);
    arm(p, thru(arms[1][0], arms[1][1], arms[1][2], 8), pj, skin, 36, false, dog);
  }
  // ---- the head
  const tilt = s.tilt;
  local(p, H[0], H[1], tilt, () => {
    const lt = light - tilt, u = a / 50;
    if (dog) { dogHead(p, k, s.f, a, s.hairUp, lt); return; }
    hairBack(p, k, a, s.hairUp);
    for (const sd of [-1, 1]) { p.ell(sd * 0.97 * a, 0.08 * a, 0.2 * a, 0.26 * a, skin, 3.6 * u); p.arc(sd * 0.97 * a, 0.08 * a, 0.1 * a, 0.14 * a, sd > 0 ? -80 : 100, sd > 0 ? 80 : 260, 2.2 * u, mul(skin, [0.8, 0.62, 0.62])); }
    const B = headBlob(k.seed, a);
    B.rot = 0;
    const hp = blobPts(0, 0, B, 72);
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), lt, a, 0.4);
    p.inkRing(hp, 4.6 * u, thickAngle(lt), 0.45);
    if (k.style === "beard") { // beard on the jaw (the mouth sits on it)
      const bd: P2[] = [[-0.92 * a, 0.0], ...thru([-0.92 * a, 0.0], [-0.7 * a, 0.95 * a], [0, 1.04 * a], 10).slice(1), ...thru([0, 1.04 * a], [0.7 * a, 0.95 * a], [0.92 * a, 0.0], 10).slice(1), [0.7 * a, 0.18 * a], ...thru([0.7 * a, 0.18 * a], [0, 0.3 * a], [-0.7 * a, 0.18 * a], 8).slice(1)];
      p.shadedFill(bd, k.hair, mul(k.hair, SH_HAIR), lt, a, 0.35); p.poly(bd, null, 3.6 * u);
    }
    hairFront(p, k, a, s.hairUp, lt);
    const ex = k.extra ?? [];
    face(p, s.f, a, skin, s.lid, { freckles: ex.includes("freckles"), drool: s.drool, masked: ex.includes("mask") && s.mask < 0.5, brow: k.style === "bald" ? k.hair : undefined, browW: 1.2 });
    accessories(p, k, a, s);
    if (k.style === "bean") nightcap(p, a, s.capUp, lt);
  });
  // ---- the duvet
  const X0 = BED.X0, X1 = BED.X1, top: P2[] = [], bot: P2[] = [];
  for (let X = X0; X <= X1 + 0.1; X += 12) top.push([X, duvetTop(s, X)]);
  for (let X = X1; X >= X0 - 0.1; X -= 12) {
    const tY = duvetTop(s, X), hem = 7 + 4 * Math.sin(X * 0.09);
    bot.push([X, lerp(hem, tY + 84 + 14 * Math.sin(X / 70 - s.wave), sm(s.sep))]);
  }
  const duv = [...top, ...bot];
  p.gradFill(duv, k.duvet, mul(k.duvet, SH_CLOTH), light, 0.32);
  p.clip(duv, () => {
    pattern(p, k.pat, k.duvet2, X0, -560, X1 + 40, 40, k.seed, 1);
    g.save(); g.setLineDash([10, 9]); // quilt stitching
    for (let X = X0 + 120; X < X1; X += 125) p.stroke([[X, duvetTop(s, X) + 6], [X + 4, 40]], 2.2, mul(k.duvet, [0.72, 0.68, 0.72]));
    g.restore();
    // the folded-over sheet at the chin end
    p.poly([[X0 - 10, -600], [X0 + 46, -600], [X0 + 40 + 6 * s.flap, 60], [X0 - 10, 60]], "#f4f2fa", 0);
    p.stroke([[X0 + 44, duvetTop(s, X0 + 44)], [X0 + 40, 30]], 3.4, "#c8c4dc");
    for (const X of [612, 846]) p.stroke(thru([X - 30, duvetTop(s, X - 30) + 8], [X, duvetTop(s, X) + 40], [X + 20, duvetTop(s, X + 20) + 70], 6), 4, mul(k.duvet, [0.7, 0.66, 0.74]));
  });
  p.inkRing(duv, 5, thick, 0.4);
  // ---- plushies + the arm over the duvet
  const tY = (X: number) => duvetTop(s, X);
  if (k.extra?.includes("teddy") || k.extra?.includes("unicorn")) {
    const uni = k.extra.includes("unicorn"), cx = 360, cy = tY(360) - 30, col = uni ? "#ffffff" : "#c8884a";
    if (uni) p.poly([[cx - 8, cy - 40], [cx + 4, cy - 92], [cx + 14, cy - 38]], "#ffd84a", 3.4);
    else for (const sd of [-1, 1]) p.ell(cx + sd * 36, cy - 30, 16, 16, col, 3.6);
    p.ell(cx, cy, 46, 42, col, 4);
    if (uni) p.poly(cloudPts(cx - 34, cy - 20, 22, 30, 6, 3, 1.2), "#ff8ac0", 3);
    p.ell(cx + 6, cy + 14, 18, 13, mix(col, WHITE, 0.4), 3);
    p.dot(cx + 6, cy + 9, 5); for (const sd of [-1, 1]) p.arc(cx + sd * 16, cy - 8, 6, 4, 200, 340, 3);
  }
  switch (s.arm) {
    case "rest": case "hug": case "pat": { // resting on the duvet; slides off when limp; blends up to the proud head-pat
      const A: P2 = [300, tY(300) + 26];
      const restH: P2 = s.arm === "hug" ? [372, tY(372) - 4] : lerp2([430, tY(430) + 14], [482, -2], s.limpK);
      const restM: P2 = [lerp(A[0], restH[0], 0.5), lerp(tY(365) + 16, tY(400) + 6, s.limpK)];
      const b = s.arm === "pat" ? s.patB : 0, Ht = rotP([0.1 * a, -1.04 * a - 7 * s.patK], tilt), headH: P2 = [H[0] + Ht[0], H[1] + Ht[1]];
      const Hh = lerp2(restH, headH, b), E = lerp2(restM, [lerp(A[0], headH[0], 0.5) + 85, Math.min(A[1], headH[1]) - 25], b);
      arm(p, thru(A, E, Hh, 12), pj, skin, 34, false, dog, lerp(0.15 + 0.1 * s.limpK, Math.PI + 0.55, b));
      break;
    }
    case "clutch": for (const X of [270, 318]) hand(p, [X, tY(X) - 4], -Math.PI / 2 - 0.2, skin, 17, true, dog); break;
    case "chin": {
      const A: P2 = [312, tY(312) + 24], Ht = rotP([0.35 * a, 0.95 * a], tilt), Hh: P2 = [H[0] + Ht[0] + 10, H[1] + Ht[1]];
      arm(p, thru(A, [A[0] + 30, A[1] - 40], Hh, 8), pj, skin, 34, true, dog, Math.PI + 0.9);
      break;
    }
    case "none": break;
  }
  g.restore();
  p.ol = olSave;
};

// ======================================================================================================================
// THE ANCESTOR APE (upright card, design space 600 x 1000)
// ======================================================================================================================
export type ApeFace = "sleep" | "snore" | "meme" | "gulp" | "phew";
export type ApeS = {
  C: P2; rot: number; headRot: number; hands: [P2, P2]; feet: [P2, P2]; grip: [boolean, boolean];
  e: ApeFace; look: P2; snot: number; fur: number; k: number; shake: number; lid: number; breathe: number;
};
const FUR = "#b8622e", FUR_DK = "#8a4420", MASK = "#f6cfa2", EAR_IN = "#f09a96";
/** body-local layout: head centre, head half-width, shoulders / hips (screen-right side; mirror x for the left) */
export const APE = { headDy: -168, headA: 84, shoulder: [70, -52] as P2, hip: [52, 72] as P2, armL: 210, legL: 140 };
/** fur-tufted ellipse: soft tufts (fur 0) -> long spikes standing on end (fur 1) */
const furPts = (cx: number, cy: number, rx: number, ry: number, n: number, fur: number, seed: number): P2[] => {
  const pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, tip = i % 2 === 0, j = rnd(seed, i);
    const r = tip ? 1 + (0.07 + 0.05 * j) * (1 - fur) + (0.32 + 0.2 * j) * fur : 0.96;
    pts.push([cx + Math.cos(a + (tip ? 0.05 * fur : 0)) * rx * r, cy + Math.sin(a) * ry * r]);
  }
  return pts;
};
const apeFace = (p: Pen, s: ApeS, a: number) => {
  const u = a / 50, meme = s.e === "meme", k = s.k;
  // the mask: two eye discs + muzzle (merged: ink pass, then fill pass)
  const pieces: P2[][] = [ellPts(-0.32 * a, -0.05 * a, 0.38 * a, 0.36 * a, 30), ellPts(0.32 * a, -0.05 * a, 0.38 * a, 0.36 * a, 30), ellPts(0, 0.38 * a, 0.55 * a, 0.4 * a, 30)];
  for (const pc of pieces) p.poly(pc, MASK, 5 * u);
  for (const pc of pieces) p.poly(pc, MASK, 0);
  glow(p, -0.5 * a, 0.35 * a, 0.22 * a, BLUSH, 0.35); glow(p, 0.5 * a, 0.35 * a, 0.22 * a, BLUSH, 0.35);
  p.arc(0, 0.2 * a, 0.16 * a, 0.08 * a, 200, 340, 2.2 * u, mul(MASK, [0.8, 0.66, 0.6]));
  for (const sd of [-1, 1]) p.ell(sd * 0.08 * a, 0.25 * a, 0.045 * a, 0.035 * a, INK, 0);
  const sh = (s.shake % 2 ? 1 : -1) * u;
  if (meme) { // THE MEME FACE: saucer eyes bulging past the head, pin pupils, brows rocketed off, a full-throat scream
    const r = (0.4 + 0.1 * cl01(k)) * a;
    for (const sd of [-1, 1]) {
      const x = sd * 0.42 * a + sh, y = -0.2 * a;
      p.ell(x, y, r * 1.02, r * 1.1, WHITE, 4.4 * u);
      p.arc(x, y, r * 0.84, r * 0.9, 30, 120, 2.4 * u, "rgba(150,170,220,0.6)");
      p.dot(x - sd * 0.05 * a, y + 0.02 * a, 0.055 * a);
      p.dot(x - sd * 0.05 * a - 0.02 * a, y - 0.01 * a, 0.018 * a, WHITE);
      tapered(p, [x - sd * 0.22 * a, y - r - 0.22 * a], [x + sd * 0.2 * a, y - r - 0.36 * a], 9 * u, 5 * u, FUR_DK);
      for (const t of [-1, 0, 1]) p.stroke([[x + sd * (r + 0.05 * a), y + t * 0.16 * a], [x + sd * (r + 0.18 * a), y + t * 0.24 * a]], 2.6 * u);
    }
    const mx = 0, my = 0.62 * a, w = 0.36 * a, h = (0.42 + 0.06 * cl01(k)) * a;
    const pts = ellPts(mx, my, w, h, 36);
    p.poly(pts, MOUTH, 0);
    p.clip(pts, () => {
      p.ell(mx + 0.04 * a, my + h * 0.75, w * 0.8, h * 0.5, TONGUE, 0);
      p.poly([[mx - w, my - h - 1], [mx + w, my - h - 1], [mx + w, my - h + 0.16 * a], [mx - w, my - h + 0.16 * a]], WHITE, 1.4 * u);
      for (let i = -2; i <= 2; i++) p.stroke([[mx + i * w * 0.3, my - h], [mx + i * w * 0.3, my - h + 0.16 * a]], 1.4 * u);
      for (const sd of [-1, 1]) p.poly([[mx + sd * 0.12 * a, my + h + 2], [mx + sd * 0.24 * a, my + h + 2], [mx + sd * 0.18 * a, my + h - 0.13 * a]], WHITE, 1.4 * u);
      p.ell(mx, my - h + 0.25 * a, 0.05 * a, 0.08 * a, "#a8304a", 0);
    });
    p.poly(pts, null, 4 * u);
    return;
  }
  for (const sd of [-1, 1]) {
    const x = sd * 0.32 * a, y = -0.06 * a;
    if (s.e === "sleep" || s.e === "snore") { p.arc(x, y - 0.06 * a, 0.17 * a, 0.12 * a, 22, 158, 3.6 * u); p.stroke([[x + sd * 0.16 * a, y - 0.02 * a], [x + sd * 0.23 * a, y + 0.03 * a]], 2.4 * u); }
    else if (s.lid >= 1) p.stroke(thru([x - 0.16 * a, y], [x, y + 0.03 * a], [x + 0.16 * a, y], 8), 3.6 * u);
    else {
      p.ell(x, y, 0.2 * a, 0.22 * a, WHITE, 3 * u);
      const px = x + s.look[0] * 0.08 * a + sh * 0.4, py = y + s.look[1] * 0.1 * a;
      p.ell(px, py, 0.085 * a, 0.1 * a, INK, 0); p.dot(px - 0.03 * a, py - 0.04 * a, 0.03 * a, WHITE);
      const bw = s.e === "gulp" ? [-0.06, 0.04] : [-0.02, -0.04];
      tapered(p, [x - sd * 0.14 * a, y - 0.32 * a + bw[0] * a], [x + sd * 0.16 * a, y - 0.32 * a + bw[1] * a], 7 * u, 4 * u, FUR_DK);
    }
  }
  const mx = 0, my = 0.48 * a;
  if (s.e === "snore") p.ell(mx, my, 0.09 * a, 0.11 * a, MOUTH, 2.8 * u);
  else if (s.e === "sleep") p.arc(mx, my - 0.06 * a, 0.16 * a, 0.08 * a, 25, 155, 3.4 * u);
  else if (s.e === "gulp") { const w: P2[] = []; for (let i = 0; i <= 12; i++) w.push([mx - 0.2 * a + i * 0.033 * a, my + 0.03 * a * Math.sin(i * 1.7 + (s.shake % 2))]); p.stroke(w, 3.4 * u); }
  else { // phew: a nervous toothy grin
    const pts = [...thru([mx - 0.26 * a, my - 0.05 * a], [mx, my - 0.02 * a], [mx + 0.26 * a, my - 0.05 * a], 8), ...thru([mx + 0.26 * a, my - 0.05 * a], [mx, my + 0.2 * a], [mx - 0.26 * a, my - 0.05 * a], 10).slice(1)];
    p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 0.24 * a, my + 0.02 * a], [mx + 0.24 * a, my + 0.02 * a]], 1.4 * u);
  }
  if (s.snot > 0.03) { const r = 0.32 * a * s.snot, cx = 0.12 * a + r * 0.75, cy = 0.27 * a + r * 0.25; p.ell(cx, cy, r, r * 0.96, "rgba(190,235,255,0.6)", 2.6 * u); p.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, r * 0.35, 200, 280, 2.4 * u, "rgba(255,255,255,0.95)"); }
};
/** the ape: body centre s.C (canvas), body rotation s.rot; hands / feet are canvas points */
export const drawApe = (p: Pen, s: ApeS, light: number) => {
  const olSave = p.ol; p.ol = 4.4;
  const rot = s.rot, C = s.C, Wd = (P: P2): P2 => { const r = rotP(P, rot); return [C[0] + r[0], C[1] + r[1]]; };
  const thick = thickAngle(light), fur = s.fur;
  const limbTo = (A: P2, B: P2, L: number, w: number, bendSide: number) => {
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, nx = -(B[1] - A[1]) / d, ny = (B[0] - A[0]) / d;
    const bend = d < L ? Math.sqrt(Math.max(0, (L / 2) ** 2 - (d / 2) ** 2)) * bendSide : 0, ww = d > L ? w * Math.max(0.62, Math.sqrt(L / d)) : w;
    const M: P2 = [(A[0] + B[0]) / 2 + nx * bend, (A[1] + B[1]) / 2 + ny * bend];
    const pts = thru(A, M, B, 14);
    limb(p, pts, FUR, ww, 4.4);
    for (let i = 3; i < 12; i += 4) { // fur tufts along the limb (on end at the jolt)
      const P = pts[i], Q = pts[i + 1], tl = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, tx = (Q[0] - P[0]) / tl, ty = (Q[1] - P[1]) / tl, o = ww / 2;
      p.poly([[P[0] - ty * o * 0.9, P[1] + tx * o * 0.9], [P[0] - ty * (o + 10 + 18 * fur) + tx * 6, P[1] + tx * (o + 10 + 18 * fur) + ty * 6], [P[0] - ty * o * 0.9 + tx * 14, P[1] + tx * o * 0.9 + ty * 14]], FUR, 3);
    }
    return M;
  };
  const sh = [Wd([-APE.shoulder[0], APE.shoulder[1]]), Wd(APE.shoulder)] as [P2, P2];
  const hp = [Wd([-APE.hip[0], APE.hip[1]]), Wd(APE.hip)] as [P2, P2];
  const footAt = (F: P2, sd: number) => { p.ell(F[0], F[1], 30, 21, MASK, 4.4, 0, 360, rot * 28.6); for (let i = 0; i < 3; i++) p.stroke([[F[0] + sd * (i * 9 - 4), F[1] - 14], [F[0] + sd * (i * 9 - 4), F[1] - 4]], 2.4); };
  const handAt = (Hh: P2, from: P2, grip: boolean) => {
    const ang = Math.atan2(Hh[1] - from[1], Hh[0] - from[0]);
    local(p, Hh[0], Hh[1], ang, () => {
      p.ell(0, 0, 28, 22, MASK, 4.4);
      if (grip) for (let i = -1; i <= 1; i++) p.stroke([[6, i * 8], [24, i * 9]], 3);
      else { p.ell(10, -22, 9, 13, MASK, 3.6, 0, 360, -30); for (let i = -1; i <= 1; i++) p.stroke([[14, i * 8], [26, i * 9]], 2.6); }
    });
  };
  // legs, back arm, torso, head, front arm (the gripping arm goes on top)
  const front = s.grip[0] && !s.grip[1] ? 0 : 1, back = 1 - front;
  for (const i of [0, 1]) { const sd = i ? 1 : -1; limbTo(hp[i], s.feet[i], APE.legL, 52, -sd); footAt(s.feet[i], sd); }
  { const sd = back ? 1 : -1, M = limbTo(sh[back], s.hands[back], APE.armL, 46, sd); handAt(s.hands[back], M, s.grip[back]); }
  const gripping = s.grip[front];
  if (gripping) { const sd = front ? 1 : -1, M = limbTo(sh[front], s.hands[front], APE.armL, 46, sd); handAt(s.hands[front], M, true); }
  const torso = furPts(0, 0, 96, 108, 14, fur, 3).map((P) => Wd(P));
  p.shadedFill(torso, FUR, mul(FUR, SH_HAIR), light, 108, 0.35);
  p.inkRing(torso, 4.6, thick, 0.4);
  local(p, C[0], C[1], rot, () => { const belly = ellPts(0, 18 + s.breathe * 3, 62, 70 + s.breathe * 4, 30); p.poly(belly, MASK, 0); p.arc(0, 18, 62, 70, 20, 160, 2.4, mul(MASK, [0.85, 0.75, 0.7])); p.dot(0, 40, 4, mul(MASK, [0.7, 0.55, 0.5])); });
  const Hc = Wd([0, APE.headDy]), a = APE.headA, hr = rot + s.headRot;
  local(p, Hc[0], Hc[1], hr, () => {
    const lt = light - hr;
    if (s.e === "meme") { const hk = 1 + 0.22 * cl01(s.k); p.g.scale(hk, hk); }
    for (let i = -1; i <= 1; i++) { const ang = rad(-90 + i * 22), L = (0.32 + 0.5 * fur) * a, b0: P2 = [Math.cos(ang - 0.18) * a * 0.9, Math.sin(ang - 0.18) * a * 0.9], b1: P2 = [Math.cos(ang + 0.18) * a * 0.9, Math.sin(ang + 0.18) * a * 0.9]; p.poly([b0, [Math.cos(ang) * (a + L) + i * 6 * (1 - fur), Math.sin(ang) * (a + L)], b1], i ? FUR : FUR_DK, 3.6); }
    for (const sd of [-1, 1]) { p.ell(sd * 0.98 * a, -0.05 * a, 0.3 * a, 0.3 * a, FUR, 4.4); p.ell(sd * 0.98 * a, -0.05 * a, 0.17 * a, 0.17 * a, EAR_IN, 0); }
    const head = furPts(0, 0, a, a * 0.94, 16, fur * 0.9, 9);
    p.shadedFill(head, FUR, mul(FUR, SH_HAIR), lt, a, 0.4);
    p.inkRing(head, 4.6, thickAngle(lt), 0.4);
    apeFace(p, s, a);
  });
  if (!gripping) { const sd = front ? 1 : -1, M = limbTo(sh[front], s.hands[front], APE.armL, 46, sd); handAt(s.hands[front], M, false); }
  p.ol = olSave;
};

// ======================================================================================================================
// THE SABRE-TOOTH CAT (upright card, sitting; feet at y 975)
// ======================================================================================================================
export type CatFace = "sly" | "lick" | "drool" | "shock" | "sigh";
export type CatS = { e: CatFace; tail: number; paws: number; slump: number; look: P2; shake: number; bounce: number };
const TAWNY = "#e2a24e", CREAM = "#fbe6c0", SPOT = "#b06a2a";
/** head centre at rest (canvas) */
export const CAT_HEAD: P2 = [300, 330];
export const drawCat = (p: Pen, s: CatS, light: number) => {
  const olSave = p.ol; p.ol = 4.4;
  const thick = thickAngle(light), sl = s.slump, by = s.bounce, a = 140, u = a / 50;
  const hc: P2 = [CAT_HEAD[0], CAT_HEAD[1] + 40 * sl - by];
  const tw = s.tail * 40;
  limb(p, thru([440, 930], [560 + tw * 0.5, 820], [520 + tw, 650 + 30 * sl], 14), TAWNY, 42, 4.4);
  p.ell(520 + tw, 650 + 30 * sl, 24, 26, "#5a3418", 4.4);
  const haunch = ellPts(300, 810 - by * 0.3, 205, 160 - 10 * sl, 48);
  p.shadedFill(haunch, TAWNY, mul(TAWNY, SH_HAIR), light, 200, 0.35); p.inkRing(haunch, 4.6, thick, 0.4);
  for (const sd of [-1, 1]) { const F: P2 = [300 + sd * 140, 948]; p.ell(F[0], F[1], 74, 32, TAWNY, 4.4); for (let i = -1; i <= 1; i++) p.stroke([[F[0] + i * 22 + sd * 20, F[1] + 6], [F[0] + i * 22 + sd * 20, F[1] + 26]], 3); }
  const chest = ellPts(300, 600 + 30 * sl - by * 0.6, 142, 170, 40);
  p.shadedFill(chest, TAWNY, mul(TAWNY, SH_HAIR), light, 160, 0.35); p.inkRing(chest, 4.6, thick, 0.4);
  p.clip(chest, () => { p.ell(300, 640 + 30 * sl, 90, 150, CREAM, 0); for (let i = 0; i < 6; i++) p.ell(190 + (i % 3) * 22 + (i > 2 ? 200 : 0), 540 + Math.floor(i / 3) * 60 + (i % 3) * 30, 9, 7, SPOT, 0); });
  // the napkin bib (red check) tied at the neck
  const nk = 470 + 40 * sl - by;
  const bib: P2[] = [[205, nk], [395, nk], [300 + 20 * sl, nk + 190 - 20 * sl]];
  p.poly(bib, WHITE, 0);
  p.clip(bib, () => { for (let x = 200; x < 400; x += 36) p.poly([[x, nk], [x + 16, nk], [x + 16, nk + 200], [x, nk + 200]], "rgba(230,60,70,0.55)", 0); for (let y = nk; y < nk + 200; y += 36) p.poly([[200, y], [400, y], [400, y + 16], [200, y + 16]], "rgba(230,60,70,0.55)", 0); });
  p.poly(bib, null, 4.4);
  for (const sd of [-1, 1]) p.poly([[300 + sd * 95, nk + 4], [300 + sd * 140, nk - 22], [300 + sd * 130, nk + 22]], WHITE, 3.6);
  // front legs + paws: fork (screen-left), knife (screen-right); lowered on the sigh
  const pw = s.paws;
  for (const sd of [-1, 1]) {
    const Sh: P2 = [300 + sd * 105, 540 + 30 * sl - by * 0.6], Pw: P2 = lerp2([300 + sd * 120, 900], [300 + sd * 165, 600 - by], pw);
    limb(p, thru(Sh, [300 + sd * 175, lerp(720, 590, pw)], Pw, 10), TAWNY, 66, 4.4);
    const dir = lerp(1, -1, pw), base: P2 = Pw, tip: P2 = [base[0] + sd * 14 * (1 - pw), base[1] + dir * 170];
    const P0 = lerp2(base, tip, 0.52);
    limb(p, [base, P0], "#c8ccd8", 12, 3);
    if (sd < 0) { // fork
      const tY = tip[1], hY = P0[1] + dir * 30;
      p.poly([[P0[0] - 20, P0[1]], [P0[0] + 20, P0[1]], [P0[0] + 20, tY], [P0[0] + 12, tY], [P0[0] + 12, hY], [P0[0] + 4, hY], [P0[0] + 4, tY], [P0[0] - 4, tY], [P0[0] - 4, hY], [P0[0] - 12, hY], [P0[0] - 12, tY], [P0[0] - 20, tY]], "#e4e8f0", 3.4);
    } else { // knife
      p.poly([[P0[0] - 10, P0[1]], [P0[0] + 12, P0[1]], [P0[0] + 12, tip[1] - dir * 20], [P0[0] - 10, tip[1]]], "#e4e8f0", 3.4);
      p.stroke([[P0[0] + 2, P0[1] + dir * 14], [P0[0] + 2, tip[1] - dir * 30]], 2, "rgba(255,255,255,0.9)");
    }
    p.ell(Pw[0], Pw[1], 46, 40, TAWNY, 4.4);
    for (let i = -1; i <= 1; i++) p.stroke([[Pw[0] + i * 15, Pw[1] - 30], [Pw[0] + i * 15, Pw[1] - 14]], 3);
  }
  // head
  local(p, hc[0], hc[1], 0.04 * sl, () => {
    const lt = light;
    for (const sd of [-1, 1]) local(p, sd * 0.62 * a, -0.72 * a, sd * (0.2 + 0.9 * sl), () => { p.ell(0, 0, 0.26 * a, 0.24 * a, TAWNY, 4.4); p.ell(0, 0.04 * a, 0.13 * a, 0.12 * a, "#f6a0a0", 0); });
    for (const sd of [-1, 1]) p.poly([[sd * 0.8 * a, -0.3 * a], [sd * 1.22 * a, -0.05 * a], [sd * 0.98 * a, 0.08 * a], [sd * 1.25 * a, 0.28 * a], [sd * 0.92 * a, 0.36 * a], [sd * 1.08 * a, 0.58 * a], [sd * 0.6 * a, 0.6 * a]], CREAM, 4);
    const head = blobPts(0, 0, { a: a, b: a * 0.86, nTop: 2.1, nBot: 2.6, egg: 0.04, asym: 0, rot: 0, noise: 0.006, seed: 77 }, 72);
    p.shadedFill(head, TAWNY, mul(TAWNY, SH_SKIN), lt, a, 0.4); p.inkRing(head, 4.8 * u, thickAngle(lt), 0.45);
    p.clip(head, () => { for (let i = -1; i <= 1; i++) p.poly([[i * 0.2 * a - 0.05 * a, -0.95 * a], [i * 0.2 * a + 0.05 * a, -0.95 * a], [i * 0.16 * a, -0.62 * a]], SPOT, 0); });
    for (const sd of [-1, 1]) p.ell(sd * 0.21 * a, 0.36 * a, 0.3 * a, 0.23 * a, CREAM, 3 * u);
    for (const sd of [-1, 1]) p.ell(sd * 0.21 * a, 0.36 * a, 0.29 * a, 0.22 * a, CREAM, 0);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(sd * (0.18 + 0.08 * i) * a, (0.34 + (i % 2) * 0.06) * a, 0.018 * a, SPOT);
    const sh = (s.shake % 2 ? 1 : -1) * 0.6 * u;
    for (const sd of [-1, 1]) {
      const x = sd * 0.38 * a, y = -0.14 * a;
      if (s.e === "shock") { p.ell(x, y, 0.2 * a, 0.22 * a, WHITE, 3 * u); p.dot(x + sh, y, 0.05 * a); tapered(p, [x - sd * 0.15 * a, y - 0.36 * a], [x + sd * 0.15 * a, y - 0.42 * a], 6 * u, 3.5 * u); }
      else if (s.e === "sigh") { // flat, droopy, done
        const wp = ellPts(x, y, 0.19 * a, 0.15 * a, 28); p.poly(wp, "#ffe9a0", 0);
        p.clip(wp, () => { p.dot(x + s.look[0] * 0.05 * a, y + 0.06 * a, 0.07 * a); p.poly([[x - 0.25 * a, y - 0.3 * a], [x + 0.25 * a, y - 0.3 * a], [x + 0.25 * a, y + 0.02 * a], [x - 0.25 * a, y + 0.02 * a]], mul(TAWNY, [0.92, 0.88, 0.88]), 0); });
        p.poly(wp, null, 2.4 * u); p.stroke([[x - 0.2 * a, y + 0.02 * a], [x + 0.2 * a, y + 0.02 * a]], 3.8 * u);
        tapered(p, [x - sd * 0.15 * a, y - 0.24 * a], [x + sd * 0.17 * a, y - 0.16 * a], 6 * u, 3.5 * u);
      } else { // sly / lick / drool: gleaming slit-pupil eyes on the dinner above
        const big = s.e === "drool", wp = ellPts(x, y, 0.2 * a, big ? 0.21 * a : 0.15 * a, 28);
        p.poly(wp, "#ffe27a", 0);
        p.clip(wp, () => {
          const px = x + s.look[0] * 0.06 * a, py = y + s.look[1] * 0.07 * a;
          p.ell(px, py, 0.05 * a, big ? 0.15 * a : 0.12 * a, INK, 0); p.dot(px - 0.04 * a, py - 0.06 * a, 0.035 * a, WHITE);
          if (!big) p.poly([[x - 0.25 * a, y - 0.3 * a], [x + 0.25 * a, y - 0.3 * a], [x + 0.25 * a, y - 0.05 * a + sd * 0.03 * a], [x - 0.25 * a, y - 0.05 * a - sd * 0.03 * a]], mul(TAWNY, [0.92, 0.88, 0.88]), 0);
        });
        p.poly(wp, null, 2.6 * u);
        if (!big) p.stroke([[x - 0.22 * a, y - 0.05 * a - sd * 0.03 * a], [x + 0.22 * a, y - 0.05 * a + sd * 0.03 * a]], 3.8 * u);
        if (big) p.poly(starPts(x - 0.06 * a, y - 0.08 * a, 0.06 * a, 4, 0.4, 0), WHITE, 0);
        tapered(p, [x - sd * 0.15 * a, y - 0.24 * a], [x + sd * 0.17 * a, y - 0.36 * a], 6 * u, 3.5 * u);
      }
    }
    p.poly([[-0.12 * a, 0.12 * a], [0.12 * a, 0.12 * a], [0, 0.24 * a]], "#c8606a", 2.6 * u);
    p.dot(-0.04 * a, 0.15 * a, 0.025 * a, "rgba(255,255,255,0.7)");
    const my = 0.48 * a;
    const fang = (sd: number, len: number) => {
      const b: P2 = [sd * 0.13 * a, my - 0.02 * a];
      p.poly([[b[0] - sd * 0.06 * a, b[1]], [b[0] + sd * 0.06 * a, b[1]], ...thru([b[0] + sd * 0.06 * a, b[1]], [b[0] + sd * 0.05 * a, b[1] + len * 0.6], [b[0] - sd * 0.02 * a, b[1] + len], 8).slice(1), ...thru([b[0] - sd * 0.02 * a, b[1] + len], [b[0] - sd * 0.06 * a, b[1] + len * 0.5], [b[0] - sd * 0.06 * a, b[1]], 8).slice(1)], WHITE, 3 * u);
      p.stroke([[b[0] - sd * 0.01 * a, b[1] + len * 0.2], [b[0] - sd * 0.02 * a, b[1] + len * 0.7]], 1.6 * u, "#c8d0e0");
    };
    if (s.e === "shock") { p.ell(0, my + 0.2 * a, 0.2 * a, 0.26 * a, MOUTH, 3 * u); fang(-1, 0.48 * a); fang(1, 0.48 * a); }
    else if (s.e === "sigh") { p.arc(0, my + 0.1 * a, 0.18 * a, 0.08 * a, 200, 340, 3.4 * u); p.ell(0.24 * a, my + 0.08 * a, 0.07 * a, 0.06 * a, MOUTH, 2.4 * u); fang(-1, 0.4 * a); fang(1, 0.4 * a); }
    else { // the big hungry grin
      const pts = [...thru([-0.48 * a, my - 0.1 * a], [0, my + 0.02 * a], [0.48 * a, my - 0.1 * a], 10), ...thru([0.48 * a, my - 0.1 * a], [0, my + 0.34 * a], [-0.48 * a, my - 0.1 * a], 14).slice(1)];
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => { p.ell(0, my + 0.3 * a, 0.28 * a, 0.12 * a, TONGUE, 0); for (let i = -3; i <= 3; i++) if (Math.abs(i) > 1) p.poly([[i * 0.1 * a - 0.04 * a, my - 0.1 * a], [i * 0.1 * a + 0.04 * a, my - 0.1 * a], [i * 0.1 * a, my]], WHITE, 1.4 * u); });
      p.poly(pts, null, 3.4 * u);
      fang(-1, 0.5 * a); fang(1, 0.5 * a);
      if (s.e === "lick") { p.poly(ellPts(0.34 * a, my - 0.04 * a, 0.14 * a, 0.1 * a, 24, -0.6), TONGUE, 3 * u); p.stroke([[0.28 * a, my - 0.02 * a], [0.38 * a, my - 0.08 * a]], 1.6 * u, "#d04a64"); }
      if (s.e === "drool") { const x = -0.3 * a, y0 = my + 0.06 * a; p.poly([[x - 0.03 * a, y0], [x + 0.03 * a, y0], [x + 0.045 * a, y0 + 0.24 * a], [x, y0 + 0.3 * a], [x - 0.045 * a, y0 + 0.24 * a]], TEAR, 2.2 * u); }
    }
    for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) p.stroke([[sd * 0.42 * a, 0.36 * a + i * 0.06 * a], [sd * (0.85 + 0.05 * Math.abs(i)) * a, (0.32 + i * 0.12 + 0.08 * sl) * a]], 1.8 * u);
  });
  p.ol = olSave;
};

// ======================================================================================================================
// EFFECT CARDS (camera-facing, unlit)
// ======================================================================================================================
/** "Z" (256 x 256) */
export const fxZ = (p: Pen, col: string) => letter(p, "Z", 128, 132, 210, col, 30, 10);
/** "JOLT!" (800 x 600): a jagged electric starburst + lettering */
export const fxJolt = (p: Pen, word: string, col: string, seed: number) => {
  const n = 14, pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 0.62 : 0.94 + 0.06 * rnd(seed, i); pts.push([400 + Math.cos(a) * 380 * r, 300 + Math.sin(a) * 270 * r]); }
  p.poly(pts, col, 18);
  p.poly(shrink(pts, 0.8), mix(col, WHITE, 0.45), 0);
  for (const [x, y, s] of [[110, 90, 1], [690, 500, -1]] as const) p.poly([[x, y - 40], [x + 22 * s, y - 4], [x - 6 * s, y + 2], [x + 18 * s, y + 44], [x - 22 * s, y - 2], [x + 4 * s, y - 8]], "#fff27a", 8);
  letter(p, word, 400, 312, word.length > 5 ? 150 : 190, WHITE, 34, 0, 620);
};
/** motion lines (256 x 512): three vertical speed streaks */
export const fxLines = (p: Pen) => { for (const [x, l] of [[60, 360], [128, 440], [196, 320]] as const) { p.stroke([[x, 40], [x, 40 + l]], 34, INK); p.stroke([[x, 46], [x, 34 + l]], 16, WHITE); } };
/** whoosh arcs (512 x 256): the duvet flapping */
export const fxWhoosh = (p: Pen) => { for (let i = 0; i < 3; i++) { const y = 60 + i * 60, c = thru([30 + i * 30, y + 30], [256, y - 30], [480 - i * 20, y + 20], 12); p.stroke(c, 24, INK); p.stroke(c, 10, WHITE); } };
/** "!" or "?" (300 x 400) */
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#a6dcff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, TEAR_HI);
};
/** four-point twinkle (256 x 256) */
export const fxSparkle = (p: Pen, col: string) => {
  const pts: P2[] = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 24 : 112; pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); }
  const smp: P2[] = [];
  for (let i = 0; i < pts.length; i++) smp.push(...qbez(pts[i], lerp2(lerp2(pts[i], pts[(i + 1) % 8], 0.5), [128, 128], 0.35), pts[(i + 1) % 8], 5).slice(0, -1));
  p.poly(smp, col, 9);
  p.dot(128, 128, 18, WHITE);
};
/** "SNORE" bubble (640 x 400): a soft cloud with a tail to the bottom-left */
export const fxSnore = (p: Pen) => {
  p.poly([[150, 270], [60, 380], [230, 290]], "#eef4ff", 14);
  p.poly(cloudPts(340, 175, 270, 135, 11, 8), "#eef4ff", 14);
  p.poly([[150, 268], [228, 286], [190, 250]], "#eef4ff", 0);
  letter(p, "SNORE", 340, 182, 116, "#7a9aff", 24, 0, 480);
};
/** thought bubble (800 x 800): a tree with a long branch, a tiny bed tumbling off it; trailing puffs to the bottom-left */
export const fxThought = (p: Pen) => {
  p.ell(70, 742, 26, 22, WHITE, 10); p.ell(134, 672, 40, 34, WHITE, 11);
  const ring = cloudPts(450, 360, 330, 300, 12, 21);
  p.poly(ring, WHITE, 14);
  p.clip(shrink(ring, 0.9), () => {
    p.poly(rrect(110, 60, 800, 700, 40), "#cfe8ff", 0);
    p.poly([[250, 720], [270, 420], [230, 250], [300, 250], [330, 410], [340, 720]], "#9a5a2a", 8);
    p.poly([[320, 380], [560, 330], [660, 318], [660, 350], [560, 365], [330, 430]], "#9a5a2a", 8);
    p.poly(cloudPts(260, 200, 150, 110, 9, 4, 1.15), "#4ac06a", 8);
    p.poly(cloudPts(620, 290, 90, 60, 7, 6, 1.15), "#4ac06a", 8);
    local(p, 560, 520, 0.45, () => { // the tiny bed, tumbling off the branch
      p.poly(rrect(-90, -20, 90, 24, 10), "#ffbe3d", 7);
      p.poly(rrect(-100, 20, 100, 44, 8), "#8a5a3a", 7);
      p.ell(-70, -34, 30, 28, "#ffdcbc", 7); p.poly([[-96, -44], [-46, -50], [-120, -90]], "#3a5fd8", 6);
      p.ell(-80, -38, 6, 7, WHITE, 3); p.ell(-62, -38, 6, 7, WHITE, 3);
    });
    for (let i = 0; i < 3; i++) p.stroke([[470 + i * 40, 610 - i * 10], [460 + i * 40, 670 - i * 10]], 8, INK);
  });
  p.poly(ring, null, 14);
};
/** a label (1024 x 300): rounded ink-rimmed pill with a lightning icon */
export const fxLabel = (p: Pen, text: string, col: string) => {
  const pill = rrect(30, 50, 994, 250, 100, 10);
  p.poly(pill, col, 16);
  p.poly(shrink(pill, 0.92).map(([x, y]) => [x, y - 6] as P2), mix(col, WHITE, 0.25), 0);
  p.poly([[150, 80], [100, 162], [140, 162], [112, 226], [190, 132], [148, 132], [176, 80]], "#fff27a", 9);
  letter(p, text, 560, 156, 118, WHITE, 26, 0, 760);
};
/** "pat pat" (512 x 256) */
export const fxPat = (p: Pen) => { letter(p, "pat", 150, 110, 120, "#ffe46b", 24, 8); letter(p, "pat", 370, 160, 120, "#ffe46b", 24, 8); };
/** sigh puff (560 x 360) */
export const fxSigh = (p: Pen) => {
  p.poly(cloudPts(300, 170, 230, 120, 9, 33), "#f4f0ea", 12);
  letter(p, "sigh...", 300, 175, 96, "#8a8aa0", 20, 0, 400);
  p.ell(60, 300, 26, 22, "#f4f0ea", 9); p.ell(24, 340, 14, 12, "#f4f0ea", 7);
};
/** the peak's ray burst (512 x 512) */
export const fxRays = (p: Pen) => {
  const n = 18, pts: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 110 : 246 - (i % 4 === 0 ? 0 : 28); pts.push([256 + Math.cos(a) * r, 256 + Math.sin(a) * r]); }
  p.poly(pts, "#ffd25a", 6);
  p.poly(shrink(pts, 0.7), "#fff4c4", 0);
};
/** a heart thump (256 x 256) */
export const fxThump = (p: Pen) => { p.poly(heartPts(128, 132, 96), "#ff4a6a", 12); p.arc(96, 104, 30, 26, 200, 280, 10, "rgba(255,255,255,0.8)"); };
