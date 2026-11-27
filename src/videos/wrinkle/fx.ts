// OWNER: cast agent. Canvas2D drawings for "Rain Tires" (all NEW designs; Pen style: thick-thin plum ink, painted
// crescents). Character cards use the bridge 600 x 1000 design space (1000 units = 2.16 m at scale 1, soles y = 975).
//   drawFig    any upright bean (BEAN in the bath with the in-card foam band, SMOOTH, WRINKLY, the REFEREE, the caveman
//              ANCESTOR): head, hair style, outfit (bare / jersey with a name / lab coat / fur tunic), arms to canvas
//              wrist points chosen by the cast, legs, faces (one EXPR per line, incl. THE MEME FACE on SMOOTH).
//   drawHandCard  ONE big hand on its own card (palm centre at canvas 300,500, k = HAND_K): open / grip / soap /
//              pinch (marble) / splay / thumb, with deep PRUNEY fingertip grooves (prune 0..1) or a glossy SMOOTH shine.
//   fx*        water drop, splash crown, "!" "?", sparkle, speed lines, confetti, SCREECH arcs, labels, the brain
//              PIT-STOP thought bubble (swap 0..1), the "RAIN MODE: ON" dashboard badge, trophy, marble, ray burst.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix } from "../bridge/toon";

export type P2 = [number, number];
type C3 = [number, number, number];
const WHITE = "#ffffff", MOUTH = "#5a1424", TONGUE = "#ff6f86", BLUSH = "#ff5a7a", WATER = "#7cc8ff", WATER_DK = "#3a8ad8";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 31871.519; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const cl01 = (x: number) => Math.max(0, Math.min(1, x));
const sm = (x: number) => { const u = cl01(x); return u * u * (3 - 2 * u); };
const qbez = (a: P2, c: P2, b: P2, n = 12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
/** quadratic curve passing through k at its middle */
const thru = (a: P2, k: P2, b: P2, n = 12) => qbez(a, [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], b, n);
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
const shrink = (pts: P2[], k: number): P2[] => {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x / pts.length; cy += y / pts.length; }
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
export const rotP = (P: P2, a: number, c: P2 = [0, 0]): P2 => { const dx = P[0] - c[0], dy = P[1] - c[1], co = Math.cos(a), s = Math.sin(a); return [c[0] + dx * co - dy * s, c[1] + dx * s + dy * co]; };
const limb = (p: Pen, pts: P2[], col: string, w: number, ink: number) => { p.stroke(pts, w + 2 * ink, INK); p.stroke(pts, w, col); };
const tapered = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  if (a <= 0.01) return;
  const g = p.g, gr = g.createRadialGradient(x0, y0, 0, x0, y0, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, r, 0, Math.PI * 2); g.fill();
};
const local = (p: Pen, x: number, y: number, a: number, fn: () => void, k = 1) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); if (k !== 1) g.scale(k, k); fn(); g.restore(); };
const SH_SKIN: C3 = [0.95, 0.84, 0.86], SH_CLOTH: C3 = [0.66, 0.68, 0.82], SH_HAIR: C3 = [0.62, 0.6, 0.74];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo) */
export const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};
const starPts = (cx: number, cy: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return out;
};
/** puffy cloud / foam ring of bumps round an ellipse */
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
/** a water drop (point up), round part centred at x, y, radius r */
const dropPts = (x: number, y: number, r: number): P2[] => {
  const out: P2[] = [[x, y - 2.1 * r]];
  out.push(...thru([x, y - 2.1 * r], [x + 0.6 * r, y - 1.0 * r], [x + r * 0.98, y + 0.05 * r], 8).slice(1));
  for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; out.push([x + Math.cos(a) * r, y + 0.05 * r + Math.sin(a) * r]); }
  out.push(...thru([x - r * 0.98, y + 0.05 * r], [x - 0.6 * r, y - 1.0 * r], [x, y - 2.1 * r], 8));
  return out;
};
const waterDrop = (p: Pen, x: number, y: number, r: number, ink: number) => {
  const pts = dropPts(x, y, r);
  p.poly(pts, WATER, 0);
  p.clip(pts, () => p.ell(x + 0.35 * r, y + 0.45 * r, r * 0.8, r * 0.6, WATER_DK, 0));
  p.poly(pts, null, ink);
  p.ell(x - 0.38 * r, y - 0.35 * r, r * 0.2, r * 0.32, WHITE, 0, 0, 360, -20);
};

// ======================================================================================================================
// HANDS (local frame: palm centre 0,0, fingers toward -y, forearm toward +y; ~220 units tip to palm heel)
// ======================================================================================================================
export type HandK = "open" | "grip" | "soap" | "pinch" | "splay" | "thumb" | "rest";
export type HandS = { kind: HandK; ang: number; prune: number; shine: number; skin: string; sleeve?: string; wet?: number; mirror?: boolean; fur?: boolean; thumbA?: number };
export const HAND_K = 1.4;
/** local units from the palm centre to the forearm end (the body card's arm meets it there) */
export const HAND_WRIST = 170;
const PRUNE_TINT = "#c98ac0";
/** one finger as a capsule from base B along angle a (0 = up), length L, width w; pruney grooves on the top ~half */
const finger = (p: Pen, B: P2, a: number, L: number, w: number, s: HandS, seed: number) => {
  const d: P2 = [Math.sin(a), -Math.cos(a)], n: P2 = [Math.cos(a), Math.sin(a)];
  const T: P2 = [B[0] + d[0] * L, B[1] + d[1] * L];
  const side = (sg: number, u: number): P2 => [B[0] + d[0] * L * u + n[0] * sg * w / 2, B[1] + d[1] * L * u + n[1] * sg * w / 2];
  const C: P2 = [T[0] - d[0] * w / 2, T[1] - d[1] * w / 2];
  const pts: P2[] = [side(1, -0.15), side(1, 1 - w / (2 * L))];
  for (let i = 1; i < 16; i++) {
    const th = (i / 16) * Math.PI, r = (w / 2) * (1 + (s.prune > 0.3 ? 0.08 * s.prune * Math.cos(i * 2.4 + seed) : 0));
    pts.push([C[0] + n[0] * Math.cos(th) * r + d[0] * Math.sin(th) * r, C[1] + n[1] * Math.cos(th) * r + d[1] * Math.sin(th) * r]);
  }
  pts.push(side(-1, 1 - w / (2 * L)), side(-1, -0.15));
  const tip = mix(s.skin, PRUNE_TINT, 0.55 * s.prune);
  p.poly(pts, s.skin, 0);
  p.clip(pts, () => {
    if (s.prune > 0.02) { // pruney tint on the top 55 %
      const P0: P2 = [B[0] + d[0] * L * 0.45, B[1] + d[1] * L * 0.45];
      p.poly([[P0[0] + n[0] * w, P0[1] + n[1] * w], [P0[0] - n[0] * w, P0[1] - n[1] * w], [T[0] - n[0] * w + d[0] * w, T[1] - n[1] * w + d[1] * w], [T[0] + n[0] * w + d[0] * w, T[1] + n[1] * w + d[1] * w]], tip, 0);
    }
    // shade down the right side
    p.poly([[B[0] + n[0] * w * 0.2 - d[0] * 30, B[1] + n[1] * w * 0.2 - d[1] * 30], [B[0] + n[0] * w - d[0] * 30, B[1] + n[1] * w - d[1] * 30], [T[0] + n[0] * w + d[0] * w, T[1] + n[1] * w + d[1] * w], [T[0] + n[0] * w * 0.2 + d[0] * w, T[1] + n[1] * w * 0.2 + d[1] * w]], rgba("#7a3a6a", 0.16), 0);
    for (const u of [0.3, 0.35]) { const Q: P2 = [B[0] + d[0] * L * u, B[1] + d[1] * L * u]; p.stroke(thru([Q[0] - n[0] * w * 0.28, Q[1] - n[1] * w * 0.28], [Q[0] + d[0] * 3, Q[1] + d[1] * 3], [Q[0] + n[0] * w * 0.28, Q[1] + n[1] * w * 0.28], 6), 2.4, rgba(INK, 0.5)); }
    // DEEP pruney grooves: 4 wavy dark bands with a pale lip above each (they read at phone size)
    if (s.prune > 0.02) for (let j = 0; j < 4; j++) {
      const u = 0.56 + j * 0.11, Q: P2 = [B[0] + d[0] * L * u, B[1] + d[1] * L * u];
      const line: P2[] = [];
      for (let i = 0; i <= 10; i++) { const v = -0.6 + 1.2 * (i / 10), wv = (j % 2 ? 1 : -1) * 4 * s.prune * Math.sin(i * 1.3 + seed + j) + 3 * Math.sin(i * 0.9 + j); line.push([Q[0] + n[0] * v * w + d[0] * wv, Q[1] + n[1] * v * w + d[1] * wv]); }
      p.stroke(line.map(([x, y]) => [x + d[0] * 5, y + d[1] * 5] as P2), 4.4 * s.prune, rgba("#ffe6f6", 0.9 * s.prune));
      p.stroke(line, 6.4 * s.prune, rgba("#4a1a44", 0.95 * s.prune));
    }
    if (s.shine > 0.02) { // SMOOTH: glossy streak + glint
      p.stroke([[B[0] + d[0] * L * 0.2 - n[0] * w * 0.18, B[1] + d[1] * L * 0.2 - n[1] * w * 0.18], [B[0] + d[0] * L * 0.88 - n[0] * w * 0.14, B[1] + d[1] * L * 0.88 - n[1] * w * 0.14]], 7, rgba(WHITE, 0.85 * s.shine));
      p.dot(C[0] - n[0] * w * 0.15, C[1] - n[1] * w * 0.15, 5.5, rgba(WHITE, s.shine));
    }
  });
  p.poly(pts, null, 5);
};
/** curled finger seen from the front: a fat rounded fingertip pad folded over the palm */
const curl = (p: Pen, C: P2, w: number, h: number, s: HandS, seed: number) => {
  const pts = rrect(C[0] - w / 2, C[1] - h / 2, C[0] + w / 2, C[1] + h / 2, w * 0.45, 6);
  p.poly(pts, mix(s.skin, PRUNE_TINT, 0.5 * s.prune), 0);
  p.clip(pts, () => {
    p.poly([[C[0] - w, C[1] + h * 0.15], [C[0] + w, C[1] + h * 0.15], [C[0] + w, C[1] + h], [C[0] - w, C[1] + h]], rgba("#7a3a6a", 0.18), 0);
    if (s.prune > 0.02) for (let j = 0; j < 3; j++) {
      const y = C[1] - h * 0.28 + j * h * 0.24, line: P2[] = [];
      for (let i = 0; i <= 8; i++) line.push([C[0] - w * 0.5 + (w * i) / 8, y + 3.5 * Math.sin(i * 1.4 + seed + j) * s.prune]);
      p.stroke(line.map(([x, yy]) => [x, yy - 4] as P2), 3.6 * s.prune, rgba("#ffe6f6", 0.9 * s.prune));
      p.stroke(line, 5.6 * s.prune, rgba("#4a1a44", 0.95 * s.prune));
    }
    if (s.shine > 0.02) p.stroke([[C[0] - w * 0.25, C[1] - h * 0.3], [C[0] + w * 0.15, C[1] - h * 0.34]], 6, rgba(WHITE, 0.85 * s.shine));
  });
  p.poly(pts, null, 5);
};
export const SOAP = "#ff9ecf", SOAP_DK = "#e0609e";
const soapBar = (p: Pen, x: number, y: number, a: number, k: number) => local(p, x, y, a, () => {
  const pts = rrect(-84, -46, 84, 46, 30, 6);
  p.poly(pts, SOAP, 0);
  p.clip(pts, () => { p.poly(rrect(-90, 10, 90, 60, 20), SOAP_DK, 0); p.ell(-30, -20, 36, 10, rgba(WHITE, 0.8), 0); });
  p.poly(pts, null, 6);
  for (let i = 0; i < 4; i++) p.ell(-60 + i * 40 + 10 * rnd(3, i), -50 - 10 * rnd(5, i), 12 + 6 * rnd(7, i), 12 + 6 * rnd(7, i), "#f4fbff", 4);
}, k);
export const MARBLE = ["#3ad0ff", "#ff5a7a", "#ffd23a", "#6ae06a"];
const marble = (p: Pen, x: number, y: number, r: number, col: string) => {
  const o = Math.max(2, r * 0.14);
  p.ell(x, y, r, r, col, 0);
  p.clip(ellPts(x, y, r, r, 30), () => { p.ell(x + r * 0.3, y + r * 0.35, r * 0.9, r * 0.7, rgba(INK, 0.25), 0); p.stroke(thru([x - r * 0.5, y + r * 0.6], [x, y - r * 0.1], [x + r * 0.4, y - r * 0.7], 8), r * 0.22, rgba(WHITE, 0.45)); });
  p.ell(x, y, r, r, null, o);
  p.ell(x - r * 0.35, y - r * 0.38, r * 0.26, r * 0.18, WHITE, 0, 0, 360, -35);
};
/** the whole hand in its local frame */
export const drawHand = (p: Pen, s: HandS) => {
  const g = p.g;
  g.save();
  if (s.mirror) g.scale(-1, 1);
  // forearm (sleeve / fur cuff / bare)
  limb(p, [[0, 40], [0, HAND_WRIST]], s.skin, 92, 5);
  if (s.sleeve) { p.poly(rrect(-58, 112, 58, HAND_WRIST + 30, 14), s.sleeve, 5); p.stroke([[-50, 126], [50, 126]], 4, rgba(INK, 0.4)); }
  if (s.fur) p.poly([[-60, 120], [-40, 100], [-20, 118], [0, 96], [20, 116], [42, 98], [62, 120], [60, HAND_WRIST + 30], [-60, HAND_WRIST + 30]], "#c8823a", 5);
  const palm = blobPts(0, 0, { a: 70, b: 66, nTop: 2.4, nBot: 2.2, egg: 0.06, asym: 0, rot: 0, noise: 0.01, seed: 5 }, 48);
  const fingersUp = (angs: number[], lens: number[], spread = 1) => {
    const xs = [-48, -16, 16, 48];
    for (let i = 0; i < 4; i++) finger(p, [xs[i] * spread, -40 + Math.abs(xs[i]) * 0.14], angs[i], lens[i], 34, s, i * 1.7 + 2);
  };
  const thumb = (a: number, L: number, base: P2 = [-56, 4]) => finger(p, base, a, L, 37, s, 9);
  const palmFill = () => {
    p.poly(palm, s.skin, 0);
    p.clip(palm, () => { p.ell(30, 30, 70, 60, rgba("#7a3a6a", 0.12), 0); p.stroke(thru([-40, 22], [-5, 34], [30, 48], 8), 3, rgba(INK, 0.35)); p.stroke(thru([-46, -2], [0, 8], [46, -8], 8), 3, rgba(INK, 0.35)); });
    p.poly(palm, null, 5.5);
  };
  switch (s.kind) {
    case "open": case "rest": {
      const sp = s.kind === "open" ? 1 : 0.55;
      fingersUp([-0.24 * sp, -0.08 * sp, 0.08 * sp, 0.24 * sp], [120, 138, 130, 104]);
      palmFill();
      thumb(s.thumbA ?? -0.95, 94);
      break;
    }
    case "splay": { // fingers flung wide (fumbling / flailing)
      fingersUp([-0.6, -0.22, 0.22, 0.6], [112, 130, 124, 100], 1.1);
      palmFill();
      thumb(-1.4, 90);
      break;
    }
    case "pinch": { // index + thumb pinch, the others curled
      finger(p, [-16, -40], -0.32, 122, 34, s, 3);
      palmFill();
      for (let i = 0; i < 3; i++) curl(p, [6 + i * 30, -32], 30, 54, s, i);
      thumb(-0.22, 98, [-60, -4]);
      break;
    }
    case "grip": case "soap": case "thumb": { // fist: four curled fingertip pads in a row across the top of the palm
      if (s.kind === "soap") soapBar(p, 4, -62, 0.05, 0.98);
      palmFill();
      for (let i = 0; i < 4; i++) curl(p, [-48 + i * 32, -40 + Math.abs(i - 1.5) * 4], 33, 68, s, i);
      if (s.kind === "thumb") finger(p, [-62, -14], -0.2, 116, 39, s, 9);
      else p.poly(rrect(-78, -8, 14, 28, 18, 6), mix(s.skin, PRUNE_TINT, 0.35 * s.prune), 5);
      break;
    }
  }
  if ((s.wet ?? 0) > 0.05) for (let i = 0; i < 3; i++) waterDrop(p, -44 + 44 * i + 10 * rnd(11, i), (s.kind === "open" || s.kind === "splay" ? -120 : -10) + 70 * rnd(13, i), 7 + 3 * rnd(17, i), 2.4);
  g.restore();
};
/** a hand on its own 600 x 1000 card: palm centre at canvas (300, 500) */
export const drawHandCard = (p: Pen, s: HandS) => local(p, 300, 500, s.ang, () => drawHand(p, s), HAND_K);

// ======================================================================================================================
// FACES (local frame: head centre 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr =
  | "horror" | "puzzled" | "wonder" | "curious" | "shock" | "bored" | "worried" | "realize" | "smug" | "calm"
  | "nervous" | "strain" | "meme" | "defeat" | "ready" | "focus" | "triumph" | "watch" | "wow" | "cheer"
  | "effort" | "scared" | "grit" | "relief" | "cheeky";
type EyeK = "wide" | "tiny" | "meme" | "half" | "lazy" | "happy" | "squint" | "shut" | "round" | "sparkle" | "blink";
type MouthK = "grimace" | "squiggle" | "ooh" | "smile" | "side" | "gasp" | "flat" | "wobble" | "smirk" | "meme" | "tongue" | "grin" | "grit" | "frown" | "yell";
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number }> = {
  horror: { eye: ["wide", "wide"], brow: [[-9, -2], [-9, -2]], mouth: "grimace" },
  puzzled: { eye: ["round", "round"], brow: [[5, 3], [-10, -13]], mouth: "squiggle" },
  wonder: { eye: ["sparkle", "sparkle"], brow: [[-7, -6], [-7, -6]], mouth: "ooh", blush: 0.5 },
  curious: { eye: ["half", "round"], brow: [[4, -2], [-8, -11]], mouth: "side" },
  shock: { eye: ["tiny", "tiny"], brow: [[-15, -17], [-15, -17]], mouth: "gasp" },
  bored: { eye: ["lazy", "lazy"], brow: [[3, 4], [3, 4]], mouth: "flat" },
  worried: { eye: ["wide", "wide"], brow: [[-11, 3], [-11, 3]], mouth: "wobble" },
  realize: { eye: ["round", "round"], brow: [[-10, -10], [-10, -10]], mouth: "ooh" },
  smug: { eye: ["half", "half"], brow: [[-13, -17], [-13, -17]], mouth: "smirk", blush: 0.55 },
  calm: { eye: ["round", "round"], brow: [[0, 0], [0, 0]], mouth: "smile" },
  nervous: { eye: ["wide", "wide"], brow: [[-9, 3], [-9, 3]], mouth: "grit" },
  strain: { eye: ["shut", "shut"], brow: [[9, -2], [9, -2]], mouth: "grit" },
  meme: { eye: ["meme", "meme"], brow: [[-20, -24], [-20, -24]], mouth: "meme" },
  defeat: { eye: ["half", "half"], brow: [[-7, 5], [-7, 5]], mouth: "frown" },
  ready: { eye: ["squint", "squint"], brow: [[9, -2], [9, -2]], mouth: "flat" },
  focus: { eye: ["squint", "squint"], brow: [[10, -3], [10, -3]], mouth: "tongue" },
  triumph: { eye: ["happy", "happy"], brow: [[-8, -7], [-8, -7]], mouth: "grin", blush: 0.7 },
  watch: { eye: ["round", "round"], brow: [[-1, 0], [-1, 0]], mouth: "flat" },
  wow: { eye: ["wide", "wide"], brow: [[-12, -12], [-12, -12]], mouth: "ooh" },
  cheer: { eye: ["happy", "happy"], brow: [[-7, -6], [-7, -6]], mouth: "grin", blush: 0.4 },
  effort: { eye: ["squint", "squint"], brow: [[8, 0], [8, 0]], mouth: "grit" },
  scared: { eye: ["tiny", "tiny"], brow: [[-13, -3], [-13, -3]], mouth: "yell" },
  grit: { eye: ["shut", "shut"], brow: [[11, -4], [11, -4]], mouth: "grit" },
  relief: { eye: ["happy", "happy"], brow: [[-5, 3], [-5, 3]], mouth: "smile", blush: 0.4 },
  cheeky: { eye: ["happy", "round"], brow: [[2, 2], [-9, -12]], mouth: "grin", blush: 0.5 },
};
export type FaceS = { e: Expr; look?: P2; k?: number; shake?: number };
const eye = (p: Pen, kind: EyeK, x: number, y: number, u: number, side: number, look: P2, k: number, shake: number, skin: string) => {
  const lx = look[0], ly = look[1], j = (shake % 2 ? 0.7 : -0.7) * u;
  switch (kind) {
    case "wide": {
      p.ell(x, y - u, 11 * u, 13 * u, WHITE, 3.2 * u);
      const px = x + lx * 4.4 * u + j, py = y - u + ly * 5.5 * u;
      p.ell(px, py, 3.8 * u, 4.4 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.6 * u, 1.2 * u, WHITE);
      break;
    }
    case "tiny": p.ell(x, y - 2 * u, 13 * u, 14.5 * u, WHITE, 3.4 * u); p.dot(x + j * 0.5 + lx * 3 * u, y - 2 * u + ly * 3 * u, 2.6 * u); break;
    case "meme": { // THE MEME FACE: bulging eyes with red veins, pin pupils pointing different ways
      const s = 1 + 0.35 * cl01(k), r = 17 * u * s, ox = side * 4 * u * s, cy = y - 6 * u;
      p.ell(x + ox, cy, r, r * 1.12, WHITE, 3.6 * u);
      for (let i = 0; i < 3; i++) { const a0 = rad((side > 0 ? 120 : 20) + 30 * i); p.stroke(thru([x + ox + Math.cos(a0) * r * 0.95, cy + Math.sin(a0) * r * 1.05], [x + ox + Math.cos(a0 + 0.2) * r * 0.72, cy + Math.sin(a0 + 0.2) * r * 0.8], [x + ox + Math.cos(a0) * r * 0.5, cy + Math.sin(a0) * r * 0.55], 6), 1.5 * u, "#ff4a5a"); }
      p.dot(x + ox + side * 5 * u + j, cy + 2 * u - side * 4 * u, 3 * u);
      break;
    }
    case "round": {
      p.ell(x, y - u, 9.6 * u, 10.8 * u, WHITE, 3 * u);
      const px = x + lx * 4 * u, py = y - u + ly * 4.4 * u;
      p.ell(px, py, 4.6 * u, 5.2 * u, INK, 0); p.dot(px - 1.5 * u, py - 1.9 * u, 1.5 * u, WHITE);
      break;
    }
    case "sparkle": {
      p.ell(x, y - u, 10.5 * u, 12 * u, WHITE, 3 * u);
      const px = x + lx * 3.4 * u, py = y - u + ly * 4 * u;
      p.ell(px, py, 6.4 * u, 7.4 * u, "#3a2448", 0);
      p.poly(starPts(px - 2 * u, py - 2.5 * u, 3.8 * u, 4, 0.35), WHITE, 0); p.dot(px + 2.6 * u, py + 3 * u, 1.3 * u, WHITE);
      break;
    }
    case "half": case "lazy": {
      const lidY = kind === "half" ? y - 1.2 * u : y + 2.6 * u, wpts = ellPts(x, y, 10 * u, 8.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4.6 * u, py = y + 2.6 * u + ly * 1.5 * u;
        p.ell(px, py, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.2 * u, 1.2 * u, WHITE);
        p.poly([[x - 14 * u, y - 13 * u], [x + 14 * u, y - 13 * u], [x + 14 * u, lidY], [x - 14 * u, lidY]], mul(skin, [0.93, 0.85, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke(thru([x - 11.5 * u, lidY + 0.6 * u], [x, lidY - 0.8 * u], [x + 11.5 * u, lidY + 0.6 * u], 8), 4 * u);
      if (kind === "lazy") p.arc(x, y + 10 * u, 8 * u, 3.5 * u, 20, 160, 1.8 * u, "#8a5a8a");
      break;
    }
    case "happy": p.arc(x, y + 3 * u, 9 * u, 8 * u, 200, 340, 4.2 * u); break;
    case "squint": {
      const wpts = ellPts(x, y + u, 10 * u, 4.4 * u, 24);
      p.poly(wpts, WHITE, 0); p.clip(wpts, () => p.ell(x + lx * 3 * u + side * 1.5 * u, y + u, 4 * u, 5 * u, INK, 0)); p.poly(wpts, null, 2.4 * u);
      p.stroke([[x - 12 * u, y - 3.4 * u + side * 1.6 * u], [x + 12 * u, y - 3.4 * u - side * 1.6 * u]], 4.2 * u);
      break;
    }
    case "shut": { const o = side * 9 * u; p.stroke([[x - o, y - 6.5 * u], [x + o * 0.55, y], [x - o, y + 6.5 * u]], 4.4 * u); break; }
    case "blink": p.stroke(thru([x - 9.5 * u, y], [x, y + 2 * u], [x + 9.5 * u, y], 8), 3.8 * u); break;
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const sh = shake % 2 ? 1 : -1;
  switch (kind) {
    case "grimace": { // horror: a wide wobbly bar of clenched teeth
      const top: P2[] = [], bot: P2[] = [];
      for (let i = 0; i <= 12; i++) { const x = mx - 16 * u + (32 * u * i) / 12; top.push([x, my - 5 * u + 1.4 * u * Math.sin(i * 1.7 + sh)]); bot.push([x, my + 6 * u + 1.6 * u * Math.sin(i * 1.5 - sh)]); }
      const pts = [...top, ...bot.reverse()];
      p.poly(pts, WHITE, 3.2 * u);
      p.stroke([[mx - 15 * u, my + 0.5 * u], [mx + 15 * u, my + 0.5 * u]], 1.6 * u);
      for (let i = -3; i <= 3; i++) p.stroke([[mx + i * 4.4 * u, my - 4.5 * u], [mx + i * 4.4 * u, my + 5.5 * u]], 1.3 * u);
      break;
    }
    case "squiggle": { const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 9 * u + i * 1.4 * u, my + 2.4 * u * Math.sin(i * 0.95) - i * 0.25 * u]); p.stroke(s, 3.4 * u); break; }
    case "ooh": p.ell(mx, my + 1.5 * u, 5 * u, 6.4 * u, MOUTH, 3 * u); p.ell(mx, my + 4.5 * u, 3 * u, 2 * u, TONGUE, 0); break;
    case "smile": { const pts = [...thru([mx - 11 * u, my - 2 * u], [mx, my - 1 * u], [mx + 11 * u, my - 2 * u], 8), ...thru([mx + 11 * u, my - 2 * u], [mx, my + 9 * u], [mx - 11 * u, my - 2 * u], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 7 * u, 6 * u, 3.5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); break; }
    case "side": p.stroke(thru([mx - 8 * u, my + 1 * u], [mx + 1 * u, my + 2.6 * u], [mx + 9 * u, my - 2.4 * u], 8), 3.4 * u); break;
    case "gasp": { const pts = ellPts(mx, my + 2 * u, 7 * u, 10 * u, 30); p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 10 * u, 6 * u, 4 * u, TONGUE, 0)); p.poly(pts, null, 3.2 * u); break; }
    case "flat": p.stroke([[mx - 8 * u, my + u], [mx + 8 * u, my + 1.6 * u]], 3.4 * u); break;
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 2 * u + 1.7 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9)]); p.stroke(s, 3.4 * u); break; }
    case "smirk": p.stroke(thru([mx - 10 * u, my + 2 * u], [mx, my + 2.4 * u], [mx + 10 * u, my - 4 * u], 8), 3.8 * u); p.stroke([[mx + 10 * u, my - 4 * u], [mx + 12.5 * u, my - 1.5 * u]], 2.4 * u); break;
    case "meme": { // THE MEME MOUTH: a huge wobbling scream, teeth top + bottom, flapping tongue, uvula
      const w = 20 * u, h = (30 + 8 * cl01(k)) * u, top = my - 8 * u;
      const pts: P2[] = [];
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, r = 1 + 0.06 * Math.sin(a * 5 + sh); pts.push([mx + Math.cos(a) * w * r, top + h / 2 + Math.sin(a) * h / 2 * r]); }
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => {
        p.ell(mx + 3 * u * sh, top + h * 0.92, w * 0.75, h * 0.32, TONGUE, 2 * u);
        p.poly([[mx - w, top - 2 * u], [mx + w, top - 2 * u], [mx + w, top + 6 * u], [mx - w, top + 6 * u]], WHITE, 1.4 * u);
        p.poly([[mx - w, top + h - 5 * u], [mx + w, top + h - 5 * u], [mx + w, top + h + 3 * u], [mx - w, top + h + 3 * u]], WHITE, 1.4 * u);
        p.poly([[mx - 3 * u, top + 6 * u], [mx + 3 * u, top + 6 * u], [mx + 2 * u, top + 14 * u], [mx - 2 * u, top + 14 * u]], "#c8304a", 0);
        p.dot(mx, top + 14 * u, 2.8 * u, "#c8304a");
      });
      p.poly(pts, null, 3.6 * u);
      break;
    }
    case "tongue": {
      p.stroke(thru([mx - 9 * u, my + 2 * u], [mx, my + 1 * u], [mx + 9 * u, my + 1.5 * u], 8), 3.4 * u);
      local(p, mx + 7 * u, my + 3 * u, 0.5, () => { p.ell(0, 3 * u, 4.4 * u, 5.4 * u, TONGUE, 2.4 * u); p.stroke([[0, 0], [0, 5 * u]], 1.4 * u, "#c8304a"); });
      break;
    }
    case "grin": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2.5 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 13 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 10 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 8 * u], [mx + 16 * u, my - 8 * u], [mx + 16 * u, my], [mx - 16 * u, my]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
    case "grit": { const pts = rrect(mx - 12 * u, my - 4.5 * u, mx + 12 * u, my + 5 * u, 3.5 * u); p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 11 * u, my + 0.3 * u], [mx + 11 * u, my + 0.3 * u]], 1.4 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.5 * u, my - 4 * u], [mx + i * 4.5 * u, my + 4.5 * u]], 1.2 * u); break; }
    case "frown": p.arc(mx, my + 5 * u, 8 * u, 4.4 * u, 205, 335, 3.4 * u); break;
    case "yell": { const pts: P2[] = []; for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; pts.push([mx + Math.cos(a) * 10 * u * (1 + 0.08 * Math.sin(a * 4 + sh)), my + 4 * u + Math.sin(a) * 9 * u]); } p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 12 * u, 7 * u, 4 * u, TONGUE, 0); p.poly([[mx - 11 * u, my - 6 * u], [mx + 11 * u, my - 6 * u], [mx + 11 * u, my - 1 * u], [mx - 11 * u, my - 1 * u]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
  }
};
const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: { brow?: string; freckles?: boolean } = {}) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0;
  const ex = 0.37 * a, ey = -0.05 * a;
  if ((D.blush ?? 0) > 0.02) for (const s of [-1, 1]) glow(p, s * 0.6 * a, 0.3 * a, 0.25 * a, BLUSH, 0.5 * (D.blush ?? 0));
  if (opt.freckles) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.dot(s * (0.46 + 0.1 * i) * a, (0.2 + (i % 2) * 0.07) * a, 1.5 * u, rgba("#b05a3a", 0.7));
  for (const s of [-1, 1]) {
    const x = s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "half", "lazy", "sparkle", "squint"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round" || ek === "sparkle")) ek = "half";
    eye(p, ek, x, ey, u, s, look, k, shake, skin);
    const bw = D.brow[s < 0 ? 0 : 1], big = ek === "tiny" || ek === "wide" || ek === "meme";
    const by = ey - (big ? 23 : 18) * u;
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 9 * u, by + bw[1] * u];
    if (opt.brow) { tapered(p, b0, b1, 9 * u, 6 * u, INK); tapered(p, b0, b1, 6 * u, 3.4 * u, opt.brow); }
    else tapered(p, b0, b1, 6 * u, 3.4 * u, INK);
  }
  const nb = mul(skin, [0.97, 0.86, 0.85]);
  p.ell(0, 0.17 * a, 6.4 * u, 5.2 * u, nb, 0);
  p.arc(0, 0.17 * a, 6.4 * u, 5.2 * u, 20, 160, 2.6 * u);
  p.dot(-2 * u, 0.14 * a - 1.4 * u, 1.4 * u, "rgba(255,255,255,0.75)");
  mouth(p, D.mouth, 0, 0.43 * a, u, k, shake);
};

// ======================================================================================================================
// FIGURES (upright 600 x 1000 card)
// ======================================================================================================================
export type Hair = "tuft" | "slick" | "band" | "curly" | "wild";
export type Top = "bare" | "jersey" | "coat" | "fur";
export type Kit = { seed: number; skin: string; hair: Hair; hairCol: string; top: Top; topCol: string; topCol2: string; name?: string; pants?: string; shoe?: string; freckles?: boolean };
export const BEAN_KIT: Kit = { seed: 23, skin: "#ffdcbc", hair: "tuft", hairCol: "#c8642a", top: "bare", topCol: "#ffdcbc", topCol2: "#ffdcbc", freckles: true };
export const SMOOTH_KIT: Kit = { seed: 31, skin: "#ffe6cf", hair: "slick", hairCol: "#2a3a6a", top: "jersey", topCol: "#4a8aff", topCol2: "#ffffff", name: "SMOOTH", pants: "#3a3f5a", shoe: "#f4f4f4" };
export const WRINKLY_KIT: Kit = { seed: 37, skin: "#e8b48a", hair: "band", hairCol: "#3a2418", top: "jersey", topCol: "#ff7a2a", topCol2: "#ffe14a", name: "WRINKLY", pants: "#2a4a3a", shoe: "#ff4a4a" };
export const REF_KIT: Kit = { seed: 43, skin: "#f6d2b0", hair: "curly", hairCol: "#f2efe8", top: "coat", topCol: "#f6f8ff", topCol2: "#8ac8ff", pants: "#4a4a5a", shoe: "#3a2a2a" };
export const ANC_KIT: Kit = { seed: 53, skin: "#e0a678", hair: "wild", hairCol: "#3a2216", top: "fur", topCol: "#c8823a", topCol2: "#6a3a1a", pants: "#c8823a", shoe: "#e0a678" };
export type ArmS = { sh: P2; w: P2; bend: number; hand?: HandS; handK?: number; back?: boolean; thick?: number };
export type FigS = {
  head: P2; a: number; tilt: number; face: FaceS; lid: number;
  body: P2; rx: number; ry: number; rot: number;
  arms: ArmS[]; legs: { hip: P2; foot: P2; bend: number }[];
  /** BATH: canvas y of the foam line (everything below is foam), foam hat amount */
  foamY?: number; foamHat?: number; wet?: number; goggles?: number;
  /** extra in-card prop in the screen-left hand area: "clip" clipboard */
  clip?: P2;
};
const hairBack = (p: Pen, k: Kit, a: number, s: FigS) => {
  if (k.hair === "wild") { // big bushy wet caveman mop behind the head
    const wet = s.wet ?? 0, pts: P2[] = [];
    for (let i = 0; i < 20; i++) { const ang = (i / 20) * Math.PI * 2, low = Math.max(0, Math.sin(ang)), r = a * (1.3 + 0.18 * rnd(k.seed, i)); pts.push([Math.cos(ang) * r * 1.04, Math.sin(ang) * r * (0.92 + 0.35 * wet * low) - 0.1 * a]); }
    const sp: P2[] = []; for (let i = 0; i < pts.length; i++) { const A = pts[i], B = pts[(i + 1) % pts.length]; sp.push(...qbez(A, [(A[0] + B[0]) / 2 * 0.86, (A[1] + B[1]) / 2 * 0.86], B, 4).slice(0, -1)); }
    p.poly(sp, k.hairCol, 5);
    p.clip(sp, () => p.ell(0.3 * a, 0.4 * a, 1.2 * a, 1.0 * a, rgba("#000000", 0.18), 0));
    p.poly(sp, null, 5);
  }
  if (k.hair === "curly") for (let i = 0; i < 9; i++) { const ang = rad(150 + i * 30), r = 0.96 * a; p.ell(Math.cos(ang) * r, Math.sin(ang) * r * 0.95 - 0.05 * a, 0.27 * a, 0.25 * a, k.hairCol, 4.4); }
};
const hairFront = (p: Pen, k: Kit, a: number, s: FigS, light: number) => {
  const hd = mul(k.hairCol, SH_HAIR);
  switch (k.hair) {
    case "tuft": { // BEAN: a ginger cap of hair + three wet spikes
      const cap = [...thru([-0.98 * a, -0.1 * a], [-0.7 * a, -0.82 * a], [0, -0.98 * a], 10), ...thru([0, -0.98 * a], [0.72 * a, -0.8 * a], [0.98 * a, -0.12 * a], 10).slice(1), ...thru([0.98 * a, -0.12 * a], [0.4 * a, -0.5 * a], [-0.2 * a, -0.42 * a], 8).slice(1), ...thru([-0.2 * a, -0.42 * a], [-0.6 * a, -0.4 * a], [-0.98 * a, -0.1 * a], 8).slice(1)];
      for (const [x, h, r] of [[-0.25, 0.42, -0.35], [0.05, 0.5, 0], [0.32, 0.4, 0.4]] as const) { const B: P2 = [x * a, -0.88 * a]; p.poly([[B[0] - 0.14 * a, B[1] + 0.1 * a], [B[0] + Math.sin(r) * h * a, B[1] - Math.cos(r) * h * a], [B[0] + 0.14 * a, B[1] + 0.1 * a]], k.hairCol, 4.4); }
      p.gradFill(cap, k.hairCol, hd, light, 0.3); p.poly(cap, null, 5);
      p.stroke(thru([0.15 * a, -0.86 * a], [0.4 * a, -0.74 * a], [0.62 * a, -0.5 * a], 6), 3, rgba(WHITE, 0.6));
      break;
    }
    case "slick": { // SMOOTH: shiny slicked side-part (everything about him is slippery)
      const cap = [...thru([-1.0 * a, 0.05 * a], [-0.85 * a, -0.85 * a], [-0.1 * a, -1.02 * a], 10), ...thru([-0.1 * a, -1.02 * a], [0.75 * a, -0.92 * a], [1.02 * a, -0.05 * a], 10).slice(1), ...thru([1.02 * a, -0.05 * a], [0.7 * a, -0.55 * a], [-0.35 * a, -0.6 * a], 8).slice(1), ...thru([-0.35 * a, -0.6 * a], [-0.8 * a, -0.45 * a], [-1.0 * a, 0.05 * a], 6).slice(1)];
      p.gradFill(cap, k.hairCol, hd, light, 0.3); p.poly(cap, null, 5);
      p.stroke(thru([-0.6 * a, -0.78 * a], [-0.1 * a, -0.94 * a], [0.5 * a, -0.82 * a], 8), 0.09 * a, rgba(WHITE, 0.8));
      p.stroke([[-0.35 * a, -0.98 * a], [-0.3 * a, -0.62 * a]], 3.4, INK);
      break;
    }
    case "band": { // WRINKLY: spiky hair + a red sports sweatband
      for (let i = 0; i < 7; i++) { const x = (-0.8 + i * 0.27) * a, h = (0.38 + 0.12 * rnd(k.seed, i)) * a; p.poly([[x - 0.17 * a, -0.62 * a], [x + 0.05 * a, -0.62 * a - h - 0.25 * a], [x + 0.19 * a, -0.62 * a]], k.hairCol, 4.4); }
      p.poly(thru([-0.95 * a, -0.25 * a], [0, -1.0 * a], [0.95 * a, -0.25 * a], 12), k.hairCol, 0);
      const band = [...thru([-1.02 * a, -0.34 * a], [0, -0.66 * a], [1.02 * a, -0.34 * a], 12), ...thru([1.02 * a, -0.14 * a], [0, -0.44 * a], [-1.02 * a, -0.14 * a], 12)];
      p.poly(band, "#ff3a4a", 5);
      p.stroke(thru([-0.9 * a, -0.29 * a], [0, -0.56 * a], [0.9 * a, -0.29 * a], 12), 0.05 * a, WHITE);
      p.poly([[0.95 * a, -0.25 * a], [1.35 * a, -0.05 * a], [1.25 * a, 0.12 * a], [0.98 * a, -0.12 * a]], "#ff3a4a", 4);
      break;
    }
    case "curly": { // REFEREE: white curls + safety goggles up on the forehead
      for (let i = 0; i < 6; i++) p.ell((-0.6 + i * 0.24) * a, -0.86 * a - 0.08 * a * Math.sin(i * 1.3), 0.24 * a, 0.2 * a, k.hairCol, 4.4);
      if ((s.goggles ?? 1) > 0) { p.stroke([[-1.02 * a, -0.5 * a], [1.02 * a, -0.5 * a]], 0.12 * a, "#3a3a4a"); for (const sd of [-1, 1]) { p.ell(sd * 0.36 * a, -0.55 * a, 0.3 * a, 0.22 * a, "#bfe8ff", 5); p.ell(sd * 0.36 * a - 0.08 * a, -0.6 * a, 0.08 * a, 0.05 * a, WHITE, 0); } }
      break;
    }
    case "wild": { // caveman fringe, plastered down by the rain, a bone hair clip
      const wet = s.wet ?? 0;
      p.poly(thru([-0.97 * a, -0.35 * a], [0, -1.12 * a], [0.97 * a, -0.35 * a], 12), k.hairCol, 0);
      for (let i = 0; i < 6; i++) { const x = (-0.75 + i * 0.3) * a, L = (0.3 + 0.25 * wet) * a, y0 = -0.9 * a + 0.12 * a * Math.abs(i - 2.5) / 2.5; p.poly([[x - 0.2 * a, y0], [x + 0.04 * a, -0.55 * a + L], [x + 0.2 * a, y0]], k.hairCol, 4); }
      p.stroke(thru([-0.5 * a, -0.95 * a], [0, -1.06 * a], [0.4 * a, -0.98 * a], 8), 3, rgba(WHITE, 0.5));
      local(p, 0.55 * a, -0.88 * a, 0.5, () => { p.poly(rrect(-0.22 * a, -0.04 * a, 0.22 * a, 0.04 * a, 0.03 * a), "#f6f0e0", 3); for (const sd of [-1, 1]) for (const v of [-1, 1]) p.ell(sd * 0.24 * a, v * 0.05 * a, 0.06 * a, 0.06 * a, "#f6f0e0", 3); });
      break;
    }
  }
};
const foamHat = (p: Pen, a: number, k: number) => {
  if (k < 0.02) return;
  const pts = puffPts(0.12 * a, -1.0 * a, 0.58 * a * k, 0.3 * a * k, 9, 71);
  p.poly(pts, "#ffffff", 0); p.clip(pts, () => p.ell(0.3 * a, -0.82 * a, 0.6 * a, 0.2 * a, "#d6e6ff", 0)); p.poly(pts, null, 4.4);
  p.ell(0.36 * a, -1.0 * a - 0.38 * a * k, 0.13 * a * k, 0.13 * a * k, "#ffffff", 3.6);
};
const torsoDraw = (p: Pen, k: Kit, s: FigS, light: number) => {
  const pts = blobPts(s.body[0], s.body[1], { a: s.rx, b: s.ry, nTop: 2.1, nBot: 2.7, egg: 0.1, asym: 0, rot: s.rot, noise: 0.01, seed: k.seed + 3 }, 56);
  const thick = thickAngle(light), c = s.body;
  if (k.top === "bare") {
    p.shadedFill(pts, k.skin, mul(k.skin, SH_SKIN), light, s.rx, 0.4); p.inkRing(pts, 5, thick, 0.4);
    p.arc(c[0], c[1] - 0.25 * s.ry, 0.45 * s.rx, 0.18 * s.ry, 30, 150, 3, rgba(INK, 0.3));
    return;
  }
  p.shadedFill(pts, k.topCol, mul(k.topCol, SH_CLOTH), light, s.rx, 0.4);
  p.clip(pts, () => {
    if (k.top === "jersey") {
      p.poly([[c[0] - 2 * s.rx, c[1] - 0.12 * s.ry], [c[0] + 2 * s.rx, c[1] - 0.12 * s.ry], [c[0] + 2 * s.rx, c[1] - 0.0 * s.ry], [c[0] - 2 * s.rx, c[1] - 0.0 * s.ry]], k.topCol2, 0);
      p.ell(c[0], c[1] - s.ry * 0.98, 0.34 * s.rx, 0.18 * s.ry, k.topCol2, 3.4);
      if (k.name) letter(p, k.name, c[0], c[1] + 0.34 * s.ry, Math.min(0.4 * s.ry, (2.6 * s.rx) / k.name.length), WHITE, 6, 0, 1.7 * s.rx);
    } else if (k.top === "coat") {
      for (const sd of [-1, 1]) p.poly([[c[0] + sd * 0.05 * s.rx, c[1] - s.ry], [c[0] + sd * 0.38 * s.rx, c[1] - s.ry], [c[0] + sd * 0.05 * s.rx, c[1] + 0.2 * s.ry]], k.topCol2, 4);
      p.stroke([[c[0], c[1] + 0.2 * s.ry], [c[0], c[1] + s.ry]], 4, rgba(INK, 0.6));
      p.poly(rrect(c[0] + 0.3 * s.rx, c[1] + 0.05 * s.ry, c[0] + 0.7 * s.rx, c[1] + 0.35 * s.ry, 6), k.topCol, 3.4);
      for (let i = 0; i < 3; i++) p.stroke([[c[0] + (0.38 + i * 0.1) * s.rx, c[1] + 0.12 * s.ry], [c[0] + (0.38 + i * 0.1) * s.rx, c[1] - 0.1 * s.ry]], 6, ["#ff4a4a", "#3a7aff", "#2ac06a"][i]);
    } else if (k.top === "fur") {
      p.poly([[c[0] - 1.2 * s.rx, c[1] - 1.2 * s.ry], [c[0] - 0.05 * s.rx, c[1] - 1.2 * s.ry], [c[0] - 1.2 * s.rx, c[1] - 0.15 * s.ry]], k.skin, 0);
      p.stroke([[c[0] - 1.2 * s.rx, c[1] - 0.15 * s.ry], [c[0] - 0.05 * s.rx, c[1] - 1.2 * s.ry]], 5);
      for (let i = 0; i < 7; i++) p.ell(c[0] + (rnd(k.seed, i) - 0.3) * 1.3 * s.rx, c[1] + (rnd(k.seed, i + 9) - 0.3) * 1.3 * s.ry, 0.13 * s.rx, 0.1 * s.ry, k.topCol2, 0, 0, 360, rnd(k.seed, i + 20) * 90);
      p.poly([[c[0] - s.rx, c[1] + 0.5 * s.ry], [c[0] + s.rx, c[1] + 0.5 * s.ry], [c[0] + s.rx, c[1] + s.ry * 1.2], [c[0] - s.rx, c[1] + s.ry * 1.2]], rgba("#000000", 0.2 * (s.wet ?? 0)), 0);
    }
  });
  p.inkRing(pts, 5, thick, 0.4);
};
/** the foam band of the bath (in-card, so BEAN always reads chest-deep even where the 3D foam is thin) */
const foamBand = (p: Pen, y: number, t: number) => {
  // a puffy cloud of foam hugging his chest (x 60..540), bumpy top + rounded sides, down past the card bottom
  const pts: P2[] = [[70, 1010], ...thru([70, 1010], [40, y + 60], [90, y + 10], 6).slice(1)];
  const n = 9;
  for (let i = 0; i < n; i++) { const x = 90 + (420 * i) / n, bump = 22 + 12 * rnd(91, i); pts.push(...thru([x, y + 10], [x + 210 / n, y - bump + 4 * Math.sin(t * 1.3 + i)], [x + 420 / n, y + 10], 6).slice(1)); }
  pts.push(...thru([510, y + 10], [560, y + 60], [530, 1010], 6).slice(1));
  p.poly(pts, "#fbfdff", 0);
  p.clip(pts, () => { for (let i = 0; i < 5; i++) p.ell(110 + i * 95, y + 60 + 14 * rnd(5, i), 60, 26, "#dce8ff", 0); for (let i = 0; i < 8; i++) p.ell(110 + 50 * i + 20 * rnd(8, i), y + 22 + 30 * rnd(9, i), 7 + 5 * rnd(10, i), 7 + 5 * rnd(10, i), null, 2.4); });
  p.poly(pts, null, 5);
};
const armDraw = (p: Pen, k: Kit, A: ArmS, a: number) => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const pts = thru(A.sh, M, A.w, 14), w = A.thick ?? 0.4 * a;
  limb(p, pts, k.skin, w, 5);
  if (k.top === "jersey") limb(p, pts.slice(0, 5), k.topCol, w + 10, 5);
  if (k.top === "coat") limb(p, pts.slice(0, 12), k.topCol, w + 8, 5);
  if (A.hand) local(p, A.w[0], A.w[1], Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + A.hand.ang, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, A.hand!)), A.handK ?? 0.3);
};
const clipboard = (p: Pen, C: P2, a: number) => local(p, C[0], C[1], -0.12, () => {
  p.poly(rrect(-0.6 * a, -0.8 * a, 0.6 * a, 0.8 * a, 8), "#c8945a", 5);
  p.poly(rrect(-0.5 * a, -0.65 * a, 0.5 * a, 0.72 * a, 4), WHITE, 3);
  p.poly(rrect(-0.22 * a, -0.9 * a, 0.22 * a, -0.68 * a, 6), "#9aa0b0", 4);
  for (let i = 0; i < 5; i++) { p.stroke([[-0.38 * a, (-0.4 + i * 0.24) * a], [0.2 * a, (-0.4 + i * 0.24) * a]], 4, "#8a9ac0"); p.stroke([[0.28 * a, (-0.44 + i * 0.24) * a], [0.34 * a, (-0.36 + i * 0.24) * a], [0.44 * a, (-0.5 + i * 0.24) * a]], 4, "#2ac06a"); }
});
export const drawFig = (p: Pen, k: Kit, s: FigS, light: number, tt = 0) => {
  const olS = p.ol; p.ol = 5;
  const a = s.a, foam = s.foamY;
  const body = () => {
    for (const L of s.legs) {
      const d = Math.hypot(L.foot[0] - L.hip[0], L.foot[1] - L.hip[1]) || 1, nx = -(L.foot[1] - L.hip[1]) / d, ny = (L.foot[0] - L.hip[0]) / d;
      const pts = thru(L.hip, [(L.hip[0] + L.foot[0]) / 2 + nx * L.bend, (L.hip[1] + L.foot[1]) / 2 + ny * L.bend], L.foot, 12);
      limb(p, pts, k.top === "fur" ? k.skin : k.pants ?? k.skin, 0.48 * a, 5);
      const fx = L.foot[0] + (L.foot[0] > s.body[0] ? 10 : -10);
      p.ell(fx, L.foot[1] + 4, 0.34 * a, 0.18 * a, k.shoe ?? k.skin, 5);
      if (k.top === "fur") for (let i = -1; i <= 1; i++) p.dot(fx + i * 0.13 * a, L.foot[1] - 0.04 * a, 2.4);
    }
    for (const A of s.arms) if (A.back) armDraw(p, k, A, a);
    torsoDraw(p, k, s, light);
    p.poly(rrect(s.head[0] - 0.25 * a, s.head[1] + 0.55 * a, s.head[0] + 0.25 * a, s.body[1] - s.ry + 14, 12), k.skin, 0);
    local(p, s.head[0], s.head[1], s.tilt, () => {
      const lt = light - s.tilt;
      hairBack(p, k, a, s);
      const hp = blobPts(0, 0, headBlob(k.seed, a));
      p.shadedFill(hp, k.skin, mul(k.skin, SH_SKIN), lt, a, 0.4);
      p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
      const fk = s.face.e === "meme" ? 1 + 0.14 * cl01(s.face.k ?? 1) : 1;
      local(p, 0, 0, 0, () => face(p, s.face, a, k.skin, s.lid, { freckles: k.freckles, brow: k.hair === "curly" ? "#e8e4dc" : undefined }), fk);
      hairFront(p, k, a, s, lt);
      if (s.foamHat) foamHat(p, a, s.foamHat);
      if ((s.wet ?? 0) > 0.05) for (let i = 0; i < 3; i++) waterDrop(p, (-0.75 + 0.7 * i) * a, -0.2 * a + 0.4 * a * rnd(k.seed + 7, i), 0.07 * a, 2.4);
    });
    if (s.clip) clipboard(p, s.clip, a);
    for (const A of s.arms) if (!A.back) armDraw(p, k, A, a);
  };
  if (foam !== undefined) {
    p.clip([[-50, -50], [650, -50], [650, foam + 30], [-50, foam + 30]], body);
    foamBand(p, foam, tt);
  } else body();
  p.ol = olS;
};

// ======================================================================================================================
// EFFECT CARDS (canvas units = pixels of the fx canvas)
// ======================================================================================================================
export const fxDrop = (p: Pen) => waterDrop(p, 128, 170, 70, 10);
/** a crown of water + droplets flying out (k = 0..1 life) */
export const fxSplash = (p: Pen, k: number) => {
  const r = 60 + 110 * k;
  for (let i = 0; i < 7; i++) { const a = rad(200 + i * 23.3), x = 256 + Math.cos(a) * r, y = 200 + Math.sin(a) * r * 0.9 + 70 * k * k; waterDrop(p, x, y, 16 * (1 - 0.5 * k), 6); }
  const crown: P2[] = [[150, 232]]; for (let i = 0; i <= 6; i++) crown.push([170 + i * 29, i % 2 ? 175 - 40 * (1 - k) : 215]); crown.push([362, 232]);
  p.poly(crown, WATER, 8);
};
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
export const fxSweat = (p: Pen) => waterDrop(p, 100, 170, 50, 9);
export const fxSparkle = (p: Pen, col: string) => { p.poly(starPts(128, 128, 112, 4, 0.22), col, 9); p.dot(128, 128, 16, WHITE); };
/** speed lines (lines along the card's y) */
export const fxSpeed = (p: Pen) => { for (const [x, y0, l] of [[50, 30, 420], [128, 90, 380], [206, 50, 440]] as const) { p.stroke([[x, y0], [x, y0 + l]], 30, INK); p.stroke([[x, y0 + 6], [x, y0 + l - 6]], 14, WHITE); } };
export const fxConfetti = (p: Pen, col: string, shape: number) => {
  if (shape === 0) p.poly(rrect(50, 80, 206, 176, 14), col, 10);
  else if (shape === 1) p.poly(starPts(128, 128, 100, 5, 0.45), col, 10);
  else { p.stroke(thru([40, 150], [128, 70], [216, 150], 10), 50, INK); p.stroke(thru([40, 150], [128, 70], [216, 150], 10), 30, col); }
};
/** tyre SCREECH: three skid arcs + smoke puffs */
export const fxScreech = (p: Pen) => {
  for (let i = 0; i < 3; i++) { const c = thru([40, 120 + i * 70], [256, 60 + i * 70], [470, 110 + i * 70], 14); p.stroke(c, 28, INK); p.stroke(c, 11, i === 1 ? "#ffe14a" : WHITE); }
  for (let i = 0; i < 3; i++) p.poly(puffPts(90 + i * 165, 360, 62, 42, 7, 30 + i), "#e8eef8", 8);
};
export const fxLabel = (p: Pen, text: string, col: string, txt = WHITE) => {
  const pill = rrect(30, 40, 994, 260, 110, 10);
  p.poly(pill, col, 18);
  p.poly(shrink(pill, 0.9).map(([x, y]) => [x, y - 8] as P2), mix(col, WHITE, 0.22), 0);
  letter(p, text, 512, 152, 150, txt, 28, 0, 880);
};
/** big burst word ("GRIP!") */
export const fxPow = (p: Pen, word: string, col: string) => {
  p.poly(starPts(400, 300, 290, 12, 0.72, 0.1), "#fff27a", 16);
  p.poly(starPts(400, 300, 220, 12, 0.75, 0.3), col, 0);
  letter(p, word, 400, 304, 170, WHITE, 30, 0, 560);
};
/** the rain-mode dashboard badge: a car-dash warning light (tyre + rain) and "RAIN MODE: ON" */
export const fxBadge = (p: Pen) => {
  const box = rrect(20, 30, 1004, 370, 70, 10);
  p.poly(box, "#1e2a44", 18);
  p.poly(shrink(box, 0.93), "#26375a", 0);
  const cx = 190, cy = 222;
  glow(p, cx, cy, 170, "#5ad8ff", 0.45);
  p.ell(cx, cy, 100, 100, "#2a2a32", 12);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; local(p, cx + Math.cos(a) * 84, cy + Math.sin(a) * 84, a + Math.PI / 2, () => p.stroke([[-14, -8], [0, 6], [14, -8]], 9, "#5ad8ff")); }
  p.ell(cx, cy, 44, 44, "#9aa8c0", 10); p.ell(cx, cy, 14, 14, "#2a2a32", 0);
  for (let i = 0; i < 3; i++) waterDrop(p, cx - 70 + i * 70, 96 + (i % 2) * 14, 18, 6);
  letter(p, "RAIN MODE", 650, 140, 112, "#5ad8ff", 22, 0, 600);
  p.poly(rrect(490, 222, 810, 330, 46), "#3ae07a", 10);
  letter(p, "ON", 650, 278, 96, WHITE, 18, 0, 300);
  glow(p, 890, 276, 60, "#3ae07a", 0.6); p.dot(890, 276, 26, "#3ae07a");
};
export const fxTrophy = (p: Pen) => {
  const G = "#ffcc2a", GD = "#d8901a";
  for (const sd of [-1, 1]) { const c = thru([256 + sd * 120, 120], [256 + sd * 196, 170], [256 + sd * 100, 262], 12); p.stroke(c, 30, INK); p.stroke(c, 14, G); }
  const cup = [...thru([120, 90], [256, 110], [392, 90], 10), ...thru([392, 90], [380, 260], [256, 330], 12).slice(1), ...thru([256, 330], [132, 260], [120, 90], 12).slice(1)];
  p.poly(cup, G, 0); p.clip(cup, () => { p.ell(340, 220, 100, 150, GD, 0); p.stroke([[170, 120], [190, 260]], 18, rgba(WHITE, 0.75)); }); p.poly(cup, null, 14);
  p.poly(rrect(226, 320, 286, 400, 10), G, 12); p.poly(rrect(160, 396, 352, 470, 18), GD, 12);
  p.poly(starPts(256, 200, 50, 5, 0.45), WHITE, 8);
};
export const fxMarble = (p: Pen, col: string) => marble(p, 64, 64, 52, col);
export const fxRays = (p: Pen) => {
  for (let i = 0; i < 16; i++) { const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 16; p.poly([[256, 256], [256 + Math.cos(a0) * 256, 256 + Math.sin(a0) * 256], [256 + Math.cos(a1) * 256, 256 + Math.sin(a1) * 256]], i % 2 ? "#ffe14a" : "#ff7a3a", 0); }
};

// ---------------- the BRAIN PIT-STOP thought bubble ----------------
const tyre = (p: Pen, x: number, y: number, r: number, rot: number, rain: boolean) => local(p, x, y, rot, () => {
  p.ell(0, 0, r, r, "#2c2a34", 9);
  if (rain) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; local(p, Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, a + Math.PI / 2, () => p.stroke([[-r * 0.16, -r * 0.1], [0, r * 0.08], [r * 0.16, -r * 0.1]], r * 0.11, "#9ae8ff")); }
  else p.arc(0, 0, r * 0.8, r * 0.8, 200, 290, r * 0.1, rgba(WHITE, 0.75));
  p.ell(0, 0, r * 0.5, r * 0.5, "#c8d0dc", 7);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; p.dot(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, r * 0.06, "#5a6070"); }
});
const brainChar = (p: Pen, x: number, y: number, s: number, grab: P2, face: "go" | "proud") => local(p, x, y, 0, () => {
  for (const sd of [-1, 1]) { limb(p, [[sd * 30, 66], [sd * 40, 128]], "#ff9ab8", 18, 5); p.ell(sd * 50, 134, 24, 12, "#3a3a4a", 5); }
  for (const sd of [-1, 1]) limb(p, thru([sd * 70, 20], [(sd * 70 + grab[0]) / 2, (20 + grab[1]) / 2 + 20], [grab[0] + sd * 22, grab[1]], 8), "#ff9ab8", 16, 5);
  const pts = puffPts(0, 0, 96, 74, 11, 13, 1.08);
  p.poly(pts, "#ffa8c4", 0);
  p.clip(pts, () => {
    p.ell(30, 30, 90, 60, rgba("#c8507a", 0.25), 0);
    p.stroke([[0, -70], [4, -20], [-4, 30]], 6, "#d8608a");
    for (const [a, b, c] of [[[-70, -20], [-40, -40], [-20, -10]], [[-60, 20], [-30, 0], [-20, 40]], [[20, -40], [50, -20], [70, -40]], [[20, 10], [50, 30], [75, 5]]] as P2[][]) p.stroke(thru(a, b, c, 8), 5, "#d8608a");
  });
  p.poly(pts, null, 7);
  for (const sd of [-1, 1]) { if (face === "proud") p.arc(sd * 26, 10, 12, 10, 200, 340, 6); else { p.ell(sd * 26, 6, 13, 15, WHITE, 5); p.dot(sd * 26 - 5, 8, 6); } }
  if (face === "proud") p.stroke(thru([-22, 34], [0, 50], [22, 34], 8), 6); else { p.stroke([[-16, 38], [16, 36]], 6); local(p, 10, 40, 0.4, () => p.ell(0, 6, 7, 9, TONGUE, 3)); }
  // backwards pit-crew cap
  p.poly(thru([-80, -26], [0, -112], [80, -26], 12), "#ff3a3a", 7);
  p.poly(rrect(56, -48, 124, -28, 10), "#ff3a3a", 6);
  p.ell(0, -62, 22, 13, WHITE, 4);
  letter(p, "B", 0, -61, 24, "#ff3a3a", 3);
}, s);
/** swap 0..1: 0-0.45 the smooth slick is yanked off + flung away, 0.35-0.9 the brain rolls the grooved rain tyre on,
 *  0.9-1 bolted + a ding sparkle; wob = idle bob phase. Trail puffs point to the bottom-right (BEAN's head). */
export const fxBubble = (p: Pen, swap: number, wob: number) => {
  p.poly(puffPts(720, 770, 30, 24, 6, 2), WHITE, 9); p.poly(puffPts(650, 690, 44, 36, 7, 4), WHITE, 10);
  const ring = puffPts(400, 330, 370, 290, 13, 29);
  p.poly(ring, WHITE, 0);
  p.clip(shrink(ring, 0.93), () => {
    const g = p.g, gr = g.createLinearGradient(0, 60, 0, 640);
    gr.addColorStop(0, "#8ab8ff"); gr.addColorStop(0.68, "#d6e8ff"); gr.addColorStop(0.69, "#5a6478"); gr.addColorStop(1, "#3a4256");
    g.fillStyle = gr; g.fillRect(0, 0, 800, 700);
    for (let i = 0; i < 18; i++) { const x = 80 + 660 * rnd(41, i), y = 90 + 280 * rnd(43, i); p.stroke([[x, y], [x - 10, y + 36]], 5, rgba("#3a7ad8", 0.7)); }
    for (let i = 0; i < 5; i++) p.stroke([[80 + i * 150, 580], [140 + i * 150, 580]], 10, rgba(WHITE, 0.8));
    // the little race car (side view), rear wheel at (250, 478)
    const car: P2[] = [[110, 478], ...thru([110, 478], [120, 400], [220, 388], 8).slice(1), [320, 350], [430, 350], [480, 392], [600, 402], [650, 450], [650, 478]];
    p.poly(car, "#ff4a3a", 9);
    p.poly([[340, 360], [422, 360], [458, 396], [330, 396]], "#bfe8ff", 6);
    p.poly(rrect(80, 384, 132, 404, 6), "#2c2a34", 6);
    letter(p, "13", 540, 440, 44, WHITE, 6);
    tyre(p, 570, 484, 60, wob * 0.2, true);
    const off = sm(swap / 0.45), on = sm((swap - 0.35) / 0.55);
    const ox = lerp(250, 60, off), oy = lerp(484, 150, off) - 120 * Math.sin(off * Math.PI);
    if (off < 1) tyre(p, ox, oy, 60 * (1 - 0.3 * off), -off * 9, false);
    if (off > 0.05 && off < 0.95) for (let i = 0; i < 3; i++) p.stroke([[ox + 50 + i * 22, oy + 46 + i * 12], [ox + 120 + i * 22, oy + 86 + i * 12]], 7, rgba(WHITE, 0.9));
    const tx = lerp(740, 250, on);
    if (swap > 0.3) tyre(p, tx, 484, 60, -(740 - tx) / 60, true);
    const bx = swap < 0.4 ? lerp(380, 340, sm(swap / 0.4)) : on < 1 ? Math.max(390, tx + 135) : 400;
    const by = 400 + (on >= 1 ? 4 * Math.sin(wob * 3) : 0);
    const grab: P2 = swap < 0.4 ? [Math.max(-150, ox - bx + 30), Math.max(-200, oy - by)] : on < 1 ? [tx - bx + 40, 70] : [-80, -40];
    brainChar(p, bx, by, 0.95, grab, swap > 0.9 ? "proud" : "go");
    if (swap > 0.88) { const k = sm((swap - 0.88) / 0.12); p.poly(starPts(330, 400, 44 * k, 4, 0.25), "#fff27a", 6); }
  });
  p.poly(ring, null, 14);
};
