// OWNER: cast. Shared Canvas2D drawing kit for "Live Wire" (all NEW drawings; Pen style = the channel's: thick-thin
// plum ink, painted crescents, bean heads). Geometry helpers, hands, the FACE system (eyes / mouths / brows per
// expression, incl. the ELECTROCUTED meme face) and bold lettering. Used by cast_bean.ts + cast_folk.ts.
import { Pen, INK, mul } from "../bridge/toon";

export type P2 = [number, number];
export type C3 = [number, number, number];
export const WHITE = "#ffffff", MOUTH = "#5a1424", TONGUE = "#ff6f86", BLUSH = "#ff5a7a";
export const rad = (d: number) => (d * Math.PI) / 180;
export const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 31871.519; return x - Math.floor(x); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const cl01 = (x: number) => Math.max(0, Math.min(1, x));
export const mixP = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
export const qbez = (a: P2, c: P2, b: P2, n = 12): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
/** quadratic curve passing through k at its middle */
export const thru = (a: P2, k: P2, b: P2, n = 12) => qbez(a, [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], b, n);
export const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
};
export const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
export const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
export const limb = (p: Pen, pts: P2[], col: string, w: number, ink: number) => { p.stroke(pts, w + 2 * ink, INK); p.stroke(pts, w, col); };
export const tapered = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
export const glow = (p: Pen, x0: number, y0: number, r: number, col: string, a: number) => {
  if (a <= 0.01 || r <= 0) return;
  const g = p.g, gr = g.createRadialGradient(x0, y0, 0, x0, y0, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, r, 0, Math.PI * 2); g.fill();
};
export const local = (p: Pen, x: number, y: number, a: number, fn: () => void, k = 1, ky = k) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); if (k !== 1 || ky !== 1) g.scale(k, ky); fn(); g.restore(); };
export const alpha = (p: Pen, a: number, fn: () => void) => { const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
export const SH_SKIN: C3 = [0.95, 0.84, 0.86], SH_HAIR: C3 = [0.62, 0.6, 0.74], SH_CLOTH: C3 = [0.7, 0.72, 0.86];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo) */
export const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); }
  g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};
export const starPts = (cx: number, cy: number, r: number, n = 5, inner = 0.45, rot = -Math.PI / 2): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n * 2; i++) { const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return out;
};
/** puffy cloud ring of bumps round an ellipse */
export const puffPts = (cx: number, cy: number, rx: number, ry: number, bumps: number, seed: number, bulge = 1.14): P2[] => {
  const ring: P2[] = [];
  for (let i = 0; i < bumps; i++) {
    const a0 = (i / bumps) * Math.PI * 2, a1 = ((i + 1) / bumps) * Math.PI * 2, r0 = 0.9 + 0.08 * rnd(seed, i), r1 = 0.9 + 0.08 * rnd(seed, (i + 1) % bumps);
    const P0: P2 = [cx + Math.cos(a0) * rx * r0, cy + Math.sin(a0) * ry * r0], P1: P2 = [cx + Math.cos(a1) * rx * r1, cy + Math.sin(a1) * ry * r1];
    const am = (a0 + a1) / 2, C: P2 = [cx + Math.cos(am) * rx * bulge, cy + Math.sin(am) * ry * bulge];
    ring.push(...qbez(P0, C, P1, 6).slice(0, -1));
  }
  return ring;
};
/** a little lightning zigzag from a to b (n kinks, seeded) */
export const zig = (a: P2, b: P2, n: number, amp: number, seed: number): P2[] => {
  const out: P2[] = [a], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  for (let i = 1; i < n; i++) { const u = i / n, o = (i % 2 ? 1 : -1) * amp * (0.6 + 0.4 * rnd(seed, i)); out.push([a[0] + dx * u + nx * o, a[1] + dy * u + ny * o]); }
  out.push(b);
  return out;
};
/** underdamped spring 0 -> 1 with overshoot (s = seconds since the trigger) */
export const spring = (s: number, w = 13, d = 5) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));

// ======================================================================================================================
// HANDS (local frame: palm centre 0,0, fingers toward -y, forearm toward +y)
// ======================================================================================================================
export type HandK = "open" | "fist" | "splay" | "rest" | "point" | "pat" | "grip" | "cup";
export const HAND_WRIST = 170;
const SHD = "#7a3a6a";
const finger = (p: Pen, B: P2, a: number, L: number, w: number, skin: string) => {
  const d: P2 = [Math.sin(a), -Math.cos(a)], n: P2 = [Math.cos(a), Math.sin(a)];
  const T: P2 = [B[0] + d[0] * L, B[1] + d[1] * L];
  const side = (sg: number, u: number): P2 => [B[0] + d[0] * L * u + n[0] * sg * w / 2, B[1] + d[1] * L * u + n[1] * sg * w / 2];
  const C: P2 = [T[0] - d[0] * w / 2, T[1] - d[1] * w / 2];
  const pts: P2[] = [side(1, -0.15), side(1, 1 - w / (2 * L))];
  for (let i = 1; i < 16; i++) { const th = (i / 16) * Math.PI, r = w / 2; pts.push([C[0] + n[0] * Math.cos(th) * r + d[0] * Math.sin(th) * r, C[1] + n[1] * Math.cos(th) * r + d[1] * Math.sin(th) * r]); }
  pts.push(side(-1, 1 - w / (2 * L)), side(-1, -0.15));
  p.poly(pts, skin, 0);
  p.clip(pts, () => p.poly([[B[0] + n[0] * w * 0.2 - d[0] * 30, B[1] + n[1] * w * 0.2 - d[1] * 30], [B[0] + n[0] * w - d[0] * 30, B[1] + n[1] * w - d[1] * 30], [T[0] + n[0] * w + d[0] * w, T[1] + n[1] * w + d[1] * w], [T[0] + n[0] * w * 0.2 + d[0] * w, T[1] + n[1] * w * 0.2 + d[1] * w]], rgba(SHD, 0.16), 0));
  p.poly(pts, null, 5);
};
const curl = (p: Pen, C: P2, w: number, h: number, skin: string) => {
  const pts = rrect(C[0] - w / 2, C[1] - h / 2, C[0] + w / 2, C[1] + h / 2, w * 0.45, 6);
  p.poly(pts, skin, 0);
  p.clip(pts, () => p.poly([[C[0] - w, C[1] + h * 0.15], [C[0] + w, C[1] + h * 0.15], [C[0] + w, C[1] + h], [C[0] - w, C[1] + h]], rgba(SHD, 0.18), 0));
  p.poly(pts, null, 5);
};
export const drawHand = (p: Pen, kind: HandK, skin: string, mirror = false) => {
  const g = p.g;
  g.save();
  if (mirror) g.scale(-1, 1);
  limb(p, [[0, 40], [0, HAND_WRIST]], skin, 92, 5);
  const palm = [...ellPts(0, 0, 70, 66, 40)];
  const fingersUp = (angs: number[], lens: number[], spread = 1) => { const xs = [-48, -16, 16, 48]; for (let i = 0; i < 4; i++) finger(p, [xs[i] * spread, -40 + Math.abs(xs[i]) * 0.14], angs[i], lens[i], 34, skin); };
  const thumb = (a: number, L: number, base: P2 = [-56, 4]) => finger(p, base, a, L, 37, skin);
  const palmFill = () => {
    p.poly(palm, skin, 0);
    p.clip(palm, () => { p.ell(30, 30, 70, 60, rgba(SHD, 0.12), 0); p.stroke(thru([-40, 22], [-5, 34], [30, 48], 8), 3, rgba(INK, 0.35)); });
    p.poly(palm, null, 5.5);
  };
  const fist = (skip = -1) => { palmFill(); for (let i = 0; i < 4; i++) if (i !== skip) curl(p, [-48 + i * 32, -40 + Math.abs(i - 1.5) * 4], 33, 68, skin); p.poly(rrect(-78, -8, 14, 28, 18, 6), skin, 5); };
  switch (kind) {
    case "open": case "rest": case "pat": {
      const sp = kind === "rest" ? 0.5 : kind === "pat" ? 0.2 : 1;
      fingersUp([-0.24 * sp, -0.08 * sp, 0.08 * sp, 0.24 * sp], kind === "pat" ? [104, 118, 112, 90] : [120, 138, 130, 104]);
      palmFill(); thumb(-0.95, 94);
      break;
    }
    case "splay": fingersUp([-0.7, -0.25, 0.25, 0.7], [122, 140, 134, 110], 1.12); palmFill(); thumb(-1.55, 96); break;
    case "grip": fingersUp([-0.1, -0.03, 0.03, 0.1], [70, 80, 76, 62]); palmFill(); thumb(-0.6, 70); break;
    case "cup": fingersUp([0.3, 0.35, 0.4, 0.45], [96, 110, 104, 86]); palmFill(); thumb(-0.3, 80); break;
    case "point": finger(p, [-46, -36], -0.06, 150, 36, skin); fist(0); break;
    case "fist": fist(); break;
  }
  g.restore();
};

// ======================================================================================================================
// FACES (local frame: head centre 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr =
  | "hum" | "wince" | "glare" | "zap" | "lookup" | "ponder" | "deadpan" | "calm" | "sip" | "scream" | "halfScream" | "fine"
  | "shrug" | "grin" | "smirk" | "laugh" | "proud" | "jolly" | "worry";
type EyeK = "wide" | "half" | "lazy" | "happy" | "shut" | "round" | "blink" | "angry" | "zap" | "bulge" | "tight" | "side" | "sly";
type MouthK = "pucker" | "grit" | "flat" | "zap" | "ooh" | "squiggle" | "smile" | "grin" | "scream" | "halfScream" | "sip" | "meh" | "smirk" | "laugh" | "wobble";
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number }> = {
  hum: { eye: ["happy", "happy"], brow: [[-8, -9], [-8, -9]], mouth: "pucker", blush: 0.45 },
  wince: { eye: ["shut", "shut"], brow: [[13, -7], [13, -7]], mouth: "grit", blush: 0.25 },
  glare: { eye: ["lazy", "half"], brow: [[9, 6], [-6, -9]], mouth: "flat" },
  zap: { eye: ["zap", "zap"], brow: [[-40, -30], [-36, -26]], mouth: "zap" },
  lookup: { eye: ["round", "round"], brow: [[-13, -12], [-13, -12]], mouth: "ooh" },
  ponder: { eye: ["round", "round"], brow: [[6, 4], [-16, -22]], mouth: "squiggle" },
  deadpan: { eye: ["lazy", "lazy"], brow: [[4, 4], [4, 4]], mouth: "flat" },
  calm: { eye: ["happy", "happy"], brow: [[-5, -5], [-5, -5]], mouth: "smile", blush: 0.4 },
  sip: { eye: ["happy", "happy"], brow: [[-3, -2], [-3, -2]], mouth: "sip", blush: 0.45 },
  scream: { eye: ["bulge", "bulge"], brow: [[-32, -22], [-32, -22]], mouth: "scream" },
  halfScream: { eye: ["happy", "bulge"], brow: [[-4, -3], [-24, -30]], mouth: "halfScream" },
  fine: { eye: ["lazy", "lazy"], brow: [[2, 2], [2, 2]], mouth: "meh" },
  shrug: { eye: ["half", "half"], brow: [[-15, -8], [-15, -8]], mouth: "meh" },
  grin: { eye: ["round", "round"], brow: [[-9, -8], [-9, -8]], mouth: "grin", blush: 0.3 },
  smirk: { eye: ["sly", "sly"], brow: [[8, 2], [-16, -20]], mouth: "smirk" },
  laugh: { eye: ["tight", "tight"], brow: [[-12, -16], [-12, -16]], mouth: "laugh", blush: 0.6 },
  proud: { eye: ["half", "half"], brow: [[-6, -8], [-6, -8]], mouth: "flat" },
  jolly: { eye: ["happy", "happy"], brow: [[-8, -8], [-8, -8]], mouth: "smile", blush: 0.4 },
  worry: { eye: ["wide", "wide"], brow: [[-12, 4], [-12, 4]], mouth: "wobble" },
};
export type FaceS = { e: Expr; look?: P2; k?: number; shake?: number };
const eye = (p: Pen, kind: EyeK, x: number, y: number, u: number, side: number, look: P2, k: number, shake: number, skin: string) => {
  const lx = look[0], ly = look[1], j = (shake % 2 ? 0.7 : -0.7) * u;
  const lidCol = mul(skin, [0.93, 0.85, 0.88]);
  switch (kind) {
    case "wide": {
      p.ell(x, y - u, 11 * u, 13 * u, WHITE, 3.2 * u);
      const px = x + lx * 4.4 * u, py = y - u + ly * 5.5 * u;
      p.ell(px, py, 4 * u, 4.6 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.6 * u, 1.3 * u, WHITE);
      break;
    }
    case "round": {
      p.ell(x, y - u, 9.6 * u, 10.8 * u, WHITE, 3 * u);
      const px = x + lx * 4 * u, py = y - u + ly * 4.4 * u;
      p.ell(px, py, 4.8 * u, 5.4 * u, INK, 0); p.dot(px - 1.5 * u, py - 1.9 * u, 1.5 * u, WHITE);
      break;
    }
    case "half": case "lazy": case "sly": {
      const lidY = kind === "half" ? y - 1.2 * u : kind === "sly" ? y + 1.2 * u : y + 2.8 * u, wpts = ellPts(x, y, 10 * u, 8.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4.6 * u, py = y + 2.6 * u + ly * 1.5 * u;
        p.ell(px, py, 4.6 * u, 5.2 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.2 * u, 1.2 * u, WHITE);
        const tilt = kind === "sly" ? side * 2.5 * u : 0;
        p.poly([[x - 14 * u, y - 13 * u], [x + 14 * u, y - 13 * u], [x + 14 * u, lidY + tilt], [x - 14 * u, lidY - tilt]], lidCol, 0);
      });
      p.poly(wpts, null, 2.4 * u);
      const tl = kind === "sly" ? side * 2.5 * u : 0;
      p.stroke(thru([x - 11.5 * u, lidY + 0.6 * u - tl], [x, lidY - 0.8 * u], [x + 11.5 * u, lidY + 0.6 * u + tl], 8), 4 * u);
      if (kind === "lazy") p.arc(x, y + 10.5 * u, 8 * u, 3.2 * u, 20, 160, 1.7 * u, "#8a5a8a");
      break;
    }
    case "angry": {
      const wpts = ellPts(x, y, 10.5 * u, 9.5 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4 * u, py = y + 2 * u + ly * 2 * u;
        p.ell(px, py, 4.4 * u, 5 * u, INK, 0);
        p.poly([[x - side * 14 * u, y - 1 * u], [x + side * 14 * u, y - 12 * u], [x + side * 14 * u, y - 16 * u], [x - side * 14 * u, y - 16 * u]], lidCol, 0);
      });
      p.poly(wpts, null, 2.4 * u);
      break;
    }
    case "bulge": { // a scream: big round eyes, pin pupils that shiver
      const r = 14 * u * (1 + 0.25 * cl01(k)), cy = y - 4 * u;
      p.ell(x, cy, r, r * 1.12, WHITE, 3.6 * u);
      p.dot(x + j * 0.6, cy + u, 2.6 * u);
      break;
    }
    case "zap": { // THE MEME: two HUGE mismatched eyeballs, bloodshot, crazed pin pupils pointing different ways
      const s = side < 0 ? 1.0 : 1.16, r = 15 * u * s, ox = side * 5.5 * u, cy = y - 10 * u + (side < 0 ? 0 : -2 * u);
      glow(p, x + ox, cy, r * 1.3, "#8af4ff", 0.4);
      p.ell(x + ox, cy, r, r * 1.08, WHITE, 4.2 * u);
      for (let i = 0; i < 5; i++) {
        const a0 = rad((side > 0 ? 100 : -20) + 34 * i + (shake % 2) * 8);
        p.stroke(zig([x + ox + Math.cos(a0) * r * 0.96, cy + Math.sin(a0) * r * 1.03], [x + ox + Math.cos(a0 + 0.15) * r * 0.5, cy + Math.sin(a0 + 0.15) * r * 0.54], 3, 1.6 * u, i + side * 7), 1.4 * u, "#ff3a52");
      }
      const pd: P2 = side < 0 ? [-0.45, -0.5] : [0.4, 0.45], pj = shake % 2 ? 1.2 * u : -1.2 * u;
      p.dot(x + ox + pd[0] * r * 0.55 + pj, cy + pd[1] * r * 0.55, 3.4 * u);
      p.dot(x + ox + pd[0] * r * 0.55 + pj - 1.1 * u, cy + pd[1] * r * 0.55 - 1.2 * u, 1 * u, WHITE);
      break;
    }
    case "happy": p.arc(x, y + 3 * u, 9 * u, 8 * u, 200, 340, 4.4 * u); break;
    case "tight": { // laughing: squeezed shut arcs + a tear
      p.arc(x, y + 1 * u, 10 * u, 7 * u, 200, 340, 4.6 * u);
      p.ell(x + side * 9 * u, y + 7 * u, 2.6 * u, 3.8 * u, "#bfe8ff", 1.6 * u);
      break;
    }
    case "shut": { const o = side * 9 * u; p.stroke([[x - o, y - 6.5 * u], [x + o * 0.55, y], [x - o, y + 6.5 * u]], 4.4 * u); break; }
    case "side": {
      p.ell(x, y - u, 10 * u, 11 * u, WHITE, 3 * u);
      p.ell(x + 5 * u, y - u + ly * 3 * u, 4.4 * u, 5 * u, INK, 0);
      break;
    }
    case "blink": p.stroke(thru([x - 9.5 * u, y], [x, y + 2 * u], [x + 9.5 * u, y], 8), 3.8 * u); break;
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const sh = shake % 2 ? 1 : -1;
  switch (kind) {
    case "pucker": p.ell(mx + 3 * u, my + 2 * u, 4.4 * u, 4 * u, "#ff7a8a", 2.6 * u); p.dot(mx + 3 * u, my + 2 * u, 1.6 * u, MOUTH); break;
    case "grit": { const pts = rrect(mx - 14 * u, my - 4.5 * u, mx + 14 * u, my + 5.5 * u, 3.5 * u); p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 13 * u, my + 0.5 * u], [mx + 13 * u, my + 0.5 * u]], 1.4 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 5 * u, my - 4 * u], [mx + i * 5 * u, my + 5 * u]], 1.2 * u); break; }
    case "flat": p.stroke([[mx - 8 * u, my + 1.4 * u], [mx + 8 * u, my + 1.4 * u]], 3.6 * u); break;
    case "meh": p.stroke(thru([mx - 9 * u, my + 3 * u], [mx, my + 1 * u], [mx + 9 * u, my + 3 * u], 8), 3.4 * u); break;
    case "zap": { // THE MEME grimace: a huge rigid rectangle of teeth, both rows, gums, a lightning gap that chatters
      const w = 27 * u, h = 17 * u, y0 = my - 4 * u;
      const box = rrect(mx - w, y0 - h / 2, mx + w, y0 + h / 2, 5 * u);
      p.poly(box, "#ff8a9a", 0);
      p.clip(box, () => {
        p.poly(rrect(mx - w - 2 * u, y0 - h / 2 + 2.6 * u, mx + w + 2 * u, y0 - 0.6 * u + sh * 0.5 * u, u), WHITE, 0);
        p.poly(rrect(mx - w - 2 * u, y0 + 1.4 * u + sh * 0.5 * u, mx + w + 2 * u, y0 + h / 2 - 2.4 * u, u), WHITE, 0);
        p.stroke(zig([mx - w, y0 + 0.4 * u + sh * 0.5 * u], [mx + w, y0 + 0.4 * u - sh * 0.5 * u], 9, 0.9 * u, 3 + (shake % 2)), 1.8 * u, "#2a1846");
        for (let i = -4; i <= 4; i++) { p.stroke([[mx + i * 5.6 * u, y0 - h / 2], [mx + i * 5.6 * u, y0 - 0.6 * u]], 1.3 * u); p.stroke([[mx + i * 5.6 * u + 2.8 * u, y0 + 1.4 * u], [mx + i * 5.6 * u + 2.8 * u, y0 + h / 2]], 1.3 * u); }
      });
      p.poly(box, null, 3.8 * u);
      for (const s of [-1, 1]) p.stroke([[mx + s * (w + 1 * u), y0 - h * 0.2], [mx + s * (w + 4.5 * u), y0 - h * 0.45]], 2.2 * u); // tension creases
      break;
    }
    case "ooh": p.ell(mx, my + 1.5 * u, 4.4 * u, 5.6 * u, MOUTH, 2.8 * u); p.ell(mx, my + 4.5 * u, 2.6 * u, 1.8 * u, TONGUE, 0); break;
    case "squiggle": { const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 9 * u + i * 1.4 * u, my + 2.4 * u * Math.sin(i * 0.95) - i * 0.25 * u]); p.stroke(s, 3.4 * u); break; }
    case "smile": { const pts = [...thru([mx - 11 * u, my - 2 * u], [mx, my - 1 * u], [mx + 11 * u, my - 2 * u], 8), ...thru([mx + 11 * u, my - 2 * u], [mx, my + 9 * u], [mx - 11 * u, my - 2 * u], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 7 * u, 6 * u, 3.5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); break; }
    case "grin": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2.5 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 13 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 10 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 8 * u], [mx + 16 * u, my - 8 * u], [mx + 16 * u, my], [mx - 16 * u, my]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
    case "scream": { // a HUGE wobbling scream: tonsils, tongue, top teeth
      const w = 21 * u, h = (36 + 6 * cl01(k)) * u, top = my - 9 * u, pts: P2[] = [];
      for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2, r = 1 + 0.05 * Math.sin(a * 6 + sh); pts.push([mx + Math.cos(a) * w * r, top + h / 2 + Math.sin(a) * h / 2 * r]); }
      p.poly(pts, "#4a0c1c", 0);
      p.clip(pts, () => {
        p.ell(mx, top + h * 0.95, w * 0.8, h * 0.3, TONGUE, 2 * u);
        p.poly([[mx - w, top - 2 * u], [mx + w, top - 2 * u], [mx + w, top + 5 * u], [mx - w, top + 5 * u]], WHITE, 1.4 * u);
        p.ell(mx + sh * u, top + h * 0.3, 2.4 * u, 4 * u, "#ff5a78", 0);
      });
      p.poly(pts, null, 3.6 * u);
      break;
    }
    case "halfScream": { // screen-left half calm (a sip line), screen-right half SCREAMING
      p.stroke(thru([mx - 12 * u, my + 2 * u], [mx - 6 * u, my + 3.5 * u], [mx, my + 2 * u], 6), 3.2 * u);
      const pts = [...thru([mx, my - 2 * u], [mx + 9 * u, my - 7 * u], [mx + 16 * u, my - 4 * u], 8), ...thru([mx + 16 * u, my - 4 * u], [mx + 12 * u, my + 16 * u], [mx, my + 4 * u], 10).slice(1)];
      p.poly(pts, "#4a0c1c", 0); p.clip(pts, () => { p.ell(mx + 9 * u, my + 12 * u, 7 * u, 4 * u, TONGUE, 0); p.poly([[mx, my - 9 * u], [mx + 18 * u, my - 9 * u], [mx + 18 * u, my - 3 * u], [mx, my - 3 * u]], WHITE, 1 * u); }); p.poly(pts, null, 3.2 * u);
      break;
    }
    case "sip": p.stroke(thru([mx - 6 * u, my + 3 * u], [mx, my + 5.5 * u], [mx + 6 * u, my + 3 * u], 8), 3.2 * u); break;
    case "smirk": p.stroke(thru([mx - 10 * u, my + 2 * u], [mx, my + 2.4 * u], [mx + 10 * u, my - 4 * u], 8), 3.8 * u); p.stroke([[mx + 10 * u, my - 4 * u], [mx + 12.5 * u, my - 1.5 * u]], 2.4 * u); break;
    case "laugh": { // head-back guffaw: a wide open D mouth
      const w = 18 * u, h = (17 + 5 * sh * 0.5) * u;
      const pts = [...thru([mx - w, my - 4 * u], [mx, my - 6 * u], [mx + w, my - 4 * u], 10), ...thru([mx + w, my - 4 * u], [mx, my - 4 * u + h * 1.5], [mx - w, my - 4 * u], 12).slice(1)];
      p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + h * 0.95, 10 * u, 5 * u, TONGUE, 0); p.poly([[mx - w, my - 9 * u], [mx + w, my - 9 * u], [mx + w, my - 0.5 * u], [mx - w, my - 0.5 * u]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.4 * u);
      break;
    }
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 10 * u + i * 1.65 * u, my + 2 * u + 1.7 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9) - 2.5 * u * Math.sin((i / 12) * Math.PI)]); p.stroke(s, 3.4 * u); break; }
  }
};
export type FaceOpt = { nose?: string; noseGlow?: number; noBrow?: boolean; shift?: number; mouthDy?: number; skipMouth?: boolean };
/** the face: eyes + brows + nose + mouth (head centre 0,0, half-width a). shift = 3/4 turn (-1..1, face toward screen +-x) */
export const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: FaceOpt = {}) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0, sx = (opt.shift ?? 0) * a * 0.45;
  const ex = 0.37 * a * (1 - 0.2 * Math.abs(opt.shift ?? 0)), ey = -0.05 * a;
  if (D.blush) for (const s of [-1, 1]) glow(p, sx + s * 0.6 * a, 0.3 * a, 0.27 * a, BLUSH, 0.55 * D.blush);
  for (const s of [-1, 1]) {
    const x = sx + s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "half", "lazy", "angry", "sly", "side"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round")) ek = "half";
    eye(p, ek, x, ey, u, s, look, k, shake, skin);
    if (opt.noBrow) continue;
    const bw = D.brow[s < 0 ? 0 : 1], big = ek === "wide" || ek === "bulge" || ek === "zap";
    const by = ey - (big ? 23 : 18) * u - (ek === "zap" ? 12 * u : 0);
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 9 * u, by + bw[1] * u];
    if (ek === "zap") p.stroke(zig(b0, b1, 4, 2.2 * u, s + 5 + (shake % 2)), 5 * u);
    else tapered(p, b0, b1, 6 * u, 3.4 * u, INK);
  }
  const nb = opt.nose ?? mul(skin, [0.97, 0.86, 0.85]), ng = opt.noseGlow ?? 0;
  if (ng > 0.01) { glow(p, sx * 1.05, 0.17 * a, 34 * u, "#fff27a", 0.9 * ng); glow(p, sx * 1.05, 0.17 * a, 16 * u, "#ffffff", 0.9 * ng); }
  p.ell(sx * 1.05, 0.17 * a, 6.6 * u * (1 + 0.25 * ng), 5.4 * u * (1 + 0.25 * ng), ng > 0.01 ? "#ff6a5a" : nb, 2.2 * u);
  p.dot(sx * 1.05 - 2 * u, 0.14 * a - 1.4 * u, 1.5 * u * (1 + ng), "rgba(255,255,255,0.85)");
  if (ng > 0.01) for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + 0.3; p.stroke([[sx * 1.05 + Math.cos(an) * 10 * u, 0.17 * a + Math.sin(an) * 9 * u], [sx * 1.05 + Math.cos(an) * 15 * u, 0.17 * a + Math.sin(an) * 13.5 * u]], 1.8 * u, "#fff27a"); }
  if (!opt.skipMouth) mouth(p, D.mouth, sx * 0.9, 0.45 * a + (opt.mouthDy ?? 0) * u, u, k, shake);
};
