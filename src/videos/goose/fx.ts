// OWNER: cast. Canvas2D drawings for "Bald Fur" (all NEW designs; Pen style: thick-thin plum ink, painted crescents).
// Character cards use the bridge 600 x 1000 design space (1000 units = 2.16 m at scale 1, soles / seat at y 975).
//   drawBean     BEAN: a coral "summer" tee + hibiscus shorts + flip-flops (STREET, ICE: the only one not dressed
//                for it: red nose, snow cap, icicle) or a teal hoodie (sleeves pushed up) + sweats + huge red
//                headphones (ROOM). Hair swoop + cowlick that bursts into spikes (the peak), or BALD (the mirror).
//                Bare skin carries GOOSEBUMPS and standing hairs; one springy BOING hair; a strain blush that rises
//                like a thermometer. One EXPR per line; THE MEME FACE exists only for the peak.
//   drawForearm  the hook close-up: one big bare forearm + fist; bumps DOME up (staggered) and tiny hairs spring
//                upright with an overshoot.
//   drawCat      the round grey-orange CAT: calm / startle / FLOOF (2x, spiky, bottle-brush tail) / cosy warm-air
//                layer / smug / pity / slow blink.
//   drawAncestor the round furry early human with a big red PUFF button: MAJESTIC wind-blown floof.
//   fxGhost      dotted translucent ghost fur coat (puff, fizzle into sparkles, peak explosion);  fxBear  the ghost
//                bear (roars, then sags + deflates).
//   fx*          shiver lines, BRRR, snowflake, notes, note-with-a-hand, PUFF button, "!", "?", sweat, sparkle,
//                BOOP / BOING / RAWR words, the 2x ruler, the magnifier lens, breath + warm-air puffs, arrows, rays.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix } from "../bridge/toon";

export type P2 = [number, number];
type C3 = [number, number, number];
const WHITE = "#ffffff", MOUTH = "#5a1424", TONGUE = "#ff6f86", BLUSH = "#ff5a7a";
const rad = (d: number) => (d * Math.PI) / 180;
export const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 31871.519; return x - Math.floor(x); };
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
export const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`; };
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
  if (a <= 0.01 || r <= 0) return;
  const g = p.g, gr = g.createRadialGradient(x0, y0, 0, x0, y0, r);
  gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.beginPath(); g.arc(x0, y0, r, 0, Math.PI * 2); g.fill();
};
const local = (p: Pen, x: number, y: number, a: number, fn: () => void, k = 1) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); if (k !== 1) g.scale(k, k); fn(); g.restore(); };
const alpha = (p: Pen, a: number, fn: () => void) => { const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
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
/** puffy cloud ring of bumps round an ellipse */
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
/** fur outline: n pointed tufts round an ellipse (amp = tuft depth, skew = wind push along +x, seed = jitter) */
const furPts = (cx: number, cy: number, rx: number, ry: number, n: number, amp: number, seed: number, skew = 0, a0 = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const aV = a0 + (i / n) * Math.PI * 2, aT = a0 + ((i + 0.5) / n) * Math.PI * 2, j = 0.85 + 0.3 * rnd(seed, i);
    const V: P2 = [cx + Math.cos(aV) * rx * (1 - 0.05 * amp), cy + Math.sin(aV) * ry * (1 - 0.05 * amp)];
    const T: P2 = [cx + Math.cos(aT) * rx * (1 + amp * j) + skew * (0.6 + 0.4 * Math.sin(aT)), cy + Math.sin(aT) * ry * (1 + amp * j)];
    const Vn: P2 = [cx + Math.cos(aV + (Math.PI * 2) / n) * rx * (1 - 0.05 * amp), cy + Math.sin(aV + (Math.PI * 2) / n) * ry * (1 - 0.05 * amp)];
    const c0: P2 = [(V[0] + T[0]) / 2 + (T[1] - V[1]) * 0.12, (V[1] + T[1]) / 2 - (T[0] - V[0]) * 0.12];
    const c1: P2 = [(T[0] + Vn[0]) / 2 + (Vn[1] - T[1]) * 0.12, (T[1] + Vn[1]) / 2 - (Vn[0] - T[0]) * 0.12];
    out.push(...qbez(V, c0, T, 5).slice(0, -1), ...qbez(T, c1, Vn, 5).slice(0, -1));
  }
  return out;
};
/** sample a closed polyline at evenly spaced arc lengths */
const resample = (pts: P2[], n: number): { P: P2; T: P2 }[] => {
  const L: number[] = [0];
  for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L.push(L[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const tot = L[L.length - 1], out: { P: P2; T: P2 }[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const s = (k / n) * tot;
    while (j < pts.length - 1 && L[j + 1] < s) j++;
    const a = pts[j], b = pts[(j + 1) % pts.length], seg = L[j + 1] - L[j] || 1, u = (s - L[j]) / seg;
    out.push({ P: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], T: [(b[0] - a[0]) / seg, (b[1] - a[1]) / seg] });
  }
  return out;
};
/** underdamped spring 0 -> 1 with overshoot (s = seconds since the trigger) */
export const spring = (s: number, w = 13, d = 5) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));

// ======================================================================================================================
// HANDS (local frame: palm centre 0,0, fingers toward -y, forearm toward +y; ~220 units tip to palm heel)
// ======================================================================================================================
export type HandK = "open" | "fist" | "splay" | "claw" | "rest" | "hold" | "slap" | "scratch";
export const HAND_WRIST = 170;
const finger = (p: Pen, B: P2, a: number, L: number, w: number, skin: string) => {
  const d: P2 = [Math.sin(a), -Math.cos(a)], n: P2 = [Math.cos(a), Math.sin(a)];
  const T: P2 = [B[0] + d[0] * L, B[1] + d[1] * L];
  const side = (sg: number, u: number): P2 => [B[0] + d[0] * L * u + n[0] * sg * w / 2, B[1] + d[1] * L * u + n[1] * sg * w / 2];
  const C: P2 = [T[0] - d[0] * w / 2, T[1] - d[1] * w / 2];
  const pts: P2[] = [side(1, -0.15), side(1, 1 - w / (2 * L))];
  for (let i = 1; i < 16; i++) { const th = (i / 16) * Math.PI, r = w / 2; pts.push([C[0] + n[0] * Math.cos(th) * r + d[0] * Math.sin(th) * r, C[1] + n[1] * Math.cos(th) * r + d[1] * Math.sin(th) * r]); }
  pts.push(side(-1, 1 - w / (2 * L)), side(-1, -0.15));
  p.poly(pts, skin, 0);
  p.clip(pts, () => {
    p.poly([[B[0] + n[0] * w * 0.2 - d[0] * 30, B[1] + n[1] * w * 0.2 - d[1] * 30], [B[0] + n[0] * w - d[0] * 30, B[1] + n[1] * w - d[1] * 30], [T[0] + n[0] * w + d[0] * w, T[1] + n[1] * w + d[1] * w], [T[0] + n[0] * w * 0.2 + d[0] * w, T[1] + n[1] * w * 0.2 + d[1] * w]], rgba("#7a3a6a", 0.16), 0);
    const Q: P2 = [B[0] + d[0] * L * 0.42, B[1] + d[1] * L * 0.42];
    p.stroke(thru([Q[0] - n[0] * w * 0.26, Q[1] - n[1] * w * 0.26], [Q[0] + d[0] * 3, Q[1] + d[1] * 3], [Q[0] + n[0] * w * 0.26, Q[1] + n[1] * w * 0.26], 6), 2.6, rgba(INK, 0.45));
  });
  p.poly(pts, null, 5);
};
/** a bent claw finger: base segment, then the tip hooks over (bend), white nail */
const clawFinger = (p: Pen, B: P2, a: number, L: number, w: number, skin: string, bend: number) => {
  const d: P2 = [Math.sin(a), -Math.cos(a)], K: P2 = [B[0] + d[0] * L * 0.6, B[1] + d[1] * L * 0.6];
  const a2 = a + bend, d2: P2 = [Math.sin(a2), -Math.cos(a2)], T: P2 = [K[0] + d2[0] * L * 0.4, K[1] + d2[1] * L * 0.4];
  limb(p, [B, K, T], skin, w, 5);
  const n2: P2 = [Math.cos(a2), Math.sin(a2)];
  p.poly([[T[0] + n2[0] * w * 0.32, T[1] + n2[1] * w * 0.32], [T[0] + d2[0] * w * 0.95, T[1] + d2[1] * w * 0.95], [T[0] - n2[0] * w * 0.32, T[1] - n2[1] * w * 0.32]], "#fffaf0", 3.4);
};
const curl = (p: Pen, C: P2, w: number, h: number, skin: string) => {
  const pts = rrect(C[0] - w / 2, C[1] - h / 2, C[0] + w / 2, C[1] + h / 2, w * 0.45, 6);
  p.poly(pts, skin, 0);
  p.clip(pts, () => p.poly([[C[0] - w, C[1] + h * 0.15], [C[0] + w, C[1] + h * 0.15], [C[0] + w, C[1] + h], [C[0] - w, C[1] + h]], rgba("#7a3a6a", 0.18), 0));
  p.poly(pts, null, 5);
};
/** the big red PUFF button (dome on a black base, label plate): centre x, y; r dome radius; press 0..1 */
export const puffButton = (p: Pen, x: number, y: number, r: number, press = 0, label = true) => {
  const sq = 1 - 0.45 * press, o = Math.max(3, r * 0.09);
  p.poly(rrect(x - r * 1.35, y + r * 0.1, x + r * 1.35, y + r * 0.62, r * 0.22), "#2c2a34", o);
  const dome = [...thru([x - r, y + r * 0.2], [x, y + r * 0.2 - r * 1.0 * sq], [x + r, y + r * 0.2], 16), ...thru([x + r, y + r * 0.2], [x, y + r * 0.34], [x - r, y + r * 0.2], 8).slice(1)];
  p.poly(dome, "#ff2f3f", 0);
  p.clip(dome, () => { p.ell(x + r * 0.35, y + r * 0.1, r * 0.9, r * 0.5, "#c8142a", 0); p.ell(x - r * 0.35, y + r * 0.2 - r * 0.62 * sq, r * 0.28, r * 0.14 * sq + 1, rgba(WHITE, 0.85), 0, 0, 360, -20); });
  p.poly(dome, null, o);
  if (label) { p.poly(rrect(x - r * 1.05, y + r * 0.72, x + r * 1.05, y + r * 1.32, r * 0.14), "#fff3c4", Math.max(2.5, r * 0.07)); letter(p, "PUFF", x, y + r * 1.03, r * 0.5, "#ff2f3f", r * 0.1, 0, r * 1.9); }
};
export const drawHand = (p: Pen, kind: HandK, skin: string, mirror = false, press = 0) => {
  const g = p.g;
  g.save();
  if (mirror) g.scale(-1, 1);
  limb(p, [[0, 40], [0, HAND_WRIST]], skin, 92, 5);
  const palm = blobPts(0, 0, { a: 70, b: 66, nTop: 2.4, nBot: 2.2, egg: 0.06, asym: 0, rot: 0, noise: 0.01, seed: 5 }, 48);
  const fingersUp = (angs: number[], lens: number[], spread = 1) => { const xs = [-48, -16, 16, 48]; for (let i = 0; i < 4; i++) finger(p, [xs[i] * spread, -40 + Math.abs(xs[i]) * 0.14], angs[i], lens[i], 34, skin); };
  const thumb = (a: number, L: number, base: P2 = [-56, 4]) => finger(p, base, a, L, 37, skin);
  const palmFill = () => {
    p.poly(palm, skin, 0);
    p.clip(palm, () => { p.ell(30, 30, 70, 60, rgba("#7a3a6a", 0.12), 0); p.stroke(thru([-40, 22], [-5, 34], [30, 48], 8), 3, rgba(INK, 0.35)); });
    p.poly(palm, null, 5.5);
  };
  const fist = () => { palmFill(); for (let i = 0; i < 4; i++) curl(p, [-48 + i * 32, -40 + Math.abs(i - 1.5) * 4], 33, 68, skin); p.poly(rrect(-78, -8, 14, 28, 18, 6), skin, 5); };
  switch (kind) {
    case "open": case "rest": case "slap": {
      const sp = kind === "rest" ? 0.5 : 1;
      fingersUp([-0.24 * sp, -0.08 * sp, 0.08 * sp, 0.24 * sp], [120, 138, 130, 104]);
      palmFill(); thumb(-0.95, 94);
      break;
    }
    case "splay": fingersUp([-0.62, -0.22, 0.22, 0.62], [116, 134, 128, 104], 1.1); palmFill(); thumb(-1.45, 92); break;
    case "claw": {
      const xs = [-50, -17, 17, 50], angs = [-0.5, -0.17, 0.17, 0.5], ls = [118, 134, 128, 106];
      for (let i = 0; i < 4; i++) clawFinger(p, [xs[i], -40 + Math.abs(xs[i]) * 0.14], angs[i], ls[i], 34, skin, (angs[i] < 0 ? -1 : 1) * 0.95);
      palmFill(); clawFinger(p, [-58, 4], -1.3, 96, 37, skin, -0.9);
      break;
    }
    case "scratch": fingersUp([-0.5, -0.45, -0.4, -0.35], [104, 118, 112, 92]); palmFill(); thumb(-1.2, 86); break;
    case "hold": puffButton(p, 0, -112, 74, press); fist(); break;
    case "fist": fist(); break;
  }
  g.restore();
};

// ======================================================================================================================
// FACES (local frame: head centre 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr =
  | "shiver" | "proud" | "confused" | "awe" | "strain" | "sad" | "hopeful" | "deadpan" | "chill" | "oh" | "meme" | "roar"
  | "sheepish" | "content" | "heroic" | "side" | "tinyrawr" | "startle" | "worried" | "wow";
type EyeK = "wide" | "tiny" | "meme" | "half" | "lazy" | "happy" | "squint" | "shut" | "round" | "sparkle" | "blink" | "angry";
type MouthK = "chatter" | "smirk" | "squiggle" | "ooh" | "grit" | "frown" | "smile" | "flat" | "meme" | "roar" | "wobble" | "grin" | "small" | "gasp";
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number }> = {
  shiver: { eye: ["wide", "wide"], brow: [[-10, 3], [-10, 3]], mouth: "chatter" },
  proud: { eye: ["half", "half"], brow: [[-13, -17], [-13, -17]], mouth: "smirk", blush: 0.6 },
  confused: { eye: ["round", "round"], brow: [[5, 3], [-10, -14]], mouth: "squiggle" },
  awe: { eye: ["sparkle", "sparkle"], brow: [[-8, -7], [-8, -7]], mouth: "ooh", blush: 0.45 },
  strain: { eye: ["shut", "shut"], brow: [[10, -3], [10, -3]], mouth: "grit" },
  sad: { eye: ["half", "half"], brow: [[-8, 6], [-8, 6]], mouth: "frown" },
  hopeful: { eye: ["round", "round"], brow: [[-11, -6], [-11, -6]], mouth: "smile", blush: 0.3 },
  deadpan: { eye: ["lazy", "lazy"], brow: [[3, 4], [3, 4]], mouth: "flat" },
  chill: { eye: ["happy", "happy"], brow: [[-4, -3], [-4, -3]], mouth: "smile", blush: 0.35 },
  oh: { eye: ["wide", "wide"], brow: [[-13, -13], [-13, -13]], mouth: "ooh" },
  meme: { eye: ["meme", "meme"], brow: [[-21, -25], [-21, -25]], mouth: "meme" },
  roar: { eye: ["angry", "angry"], brow: [[13, -5], [13, -5]], mouth: "roar" },
  sheepish: { eye: ["happy", "happy"], brow: [[-9, 4], [-9, 4]], mouth: "wobble", blush: 1 },
  content: { eye: ["happy", "happy"], brow: [[-3, -2], [-3, -2]], mouth: "smile", blush: 0.3 },
  heroic: { eye: ["happy", "happy"], brow: [[-9, -8], [-9, -8]], mouth: "grin", blush: 0.35 },
  side: { eye: ["half", "half"], brow: [[2, 1], [2, 1]], mouth: "flat" },
  tinyrawr: { eye: ["tiny", "tiny"], brow: [[9, -2], [9, -2]], mouth: "small" },
  startle: { eye: ["tiny", "tiny"], brow: [[-15, -17], [-15, -17]], mouth: "gasp" },
  worried: { eye: ["wide", "wide"], brow: [[-11, 3], [-11, 3]], mouth: "wobble" },
  wow: { eye: ["wide", "wide"], brow: [[-14, -14], [-14, -14]], mouth: "gasp" },
};
export type FaceS = { e: Expr; look?: P2; k?: number; shake?: number };
const eye = (p: Pen, kind: EyeK, x: number, y: number, u: number, side: number, look: P2, k: number, shake: number, skin: string) => {
  const lx = look[0], ly = look[1], j = (shake % 2 ? 0.7 : -0.7) * u;
  switch (kind) {
    case "wide": {
      p.ell(x, y - u, 11 * u, 13 * u, WHITE, 3.2 * u);
      const px = x + lx * 4.4 * u + j * 0.6, py = y - u + ly * 5.5 * u;
      p.ell(px, py, 4 * u, 4.6 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.6 * u, 1.3 * u, WHITE);
      break;
    }
    case "tiny": p.ell(x, y - 2 * u, 13 * u, 14.5 * u, WHITE, 3.4 * u); p.dot(x + j * 0.5 + lx * 3.5 * u, y - 2 * u + ly * 3.5 * u, 2.6 * u); break;
    case "meme": { // THE MEME FACE: bulging bloodshot eyes, pin pupils pointing different ways
      const s = 1 + 0.4 * cl01(k), r = 17 * u * s, ox = side * 4 * u * s, cy = y - 6 * u;
      p.ell(x + ox, cy, r, r * 1.12, WHITE, 3.8 * u);
      for (let i = 0; i < 4; i++) { const a0 = rad((side > 0 ? 110 : 10) + 30 * i); p.stroke(thru([x + ox + Math.cos(a0) * r * 0.95, cy + Math.sin(a0) * r * 1.05], [x + ox + Math.cos(a0 + 0.2) * r * 0.72, cy + Math.sin(a0 + 0.2) * r * 0.8], [x + ox + Math.cos(a0) * r * 0.5, cy + Math.sin(a0) * r * 0.55], 6), 1.5 * u, "#ff4a5a"); }
      p.dot(x + ox + side * 5 * u + j, cy + 2 * u - side * 4 * u, 3.2 * u);
      break;
    }
    case "round": {
      p.ell(x, y - u, 9.6 * u, 10.8 * u, WHITE, 3 * u);
      const px = x + lx * 4 * u, py = y - u + ly * 4.4 * u;
      p.ell(px, py, 4.8 * u, 5.4 * u, INK, 0); p.dot(px - 1.5 * u, py - 1.9 * u, 1.5 * u, WHITE);
      break;
    }
    case "sparkle": {
      p.ell(x, y - u, 10.5 * u, 12 * u, WHITE, 3 * u);
      const px = x + lx * 3.4 * u, py = y - u + ly * 4 * u;
      p.ell(px, py, 6.6 * u, 7.6 * u, "#3a2448", 0);
      p.poly(starPts(px - 2 * u, py - 2.5 * u, 3.8 * u, 4, 0.35), WHITE, 0); p.dot(px + 2.6 * u, py + 3 * u, 1.3 * u, WHITE);
      break;
    }
    case "half": case "lazy": {
      const lidY = kind === "half" ? y - 1.2 * u : y + 2.6 * u, wpts = ellPts(x, y, 10 * u, 8.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4.6 * u, py = y + 2.6 * u + ly * 1.5 * u;
        p.ell(px, py, 4.6 * u, 5.2 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.2 * u, 1.2 * u, WHITE);
        p.poly([[x - 14 * u, y - 13 * u], [x + 14 * u, y - 13 * u], [x + 14 * u, lidY], [x - 14 * u, lidY]], mul(skin, [0.93, 0.85, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke(thru([x - 11.5 * u, lidY + 0.6 * u], [x, lidY - 0.8 * u], [x + 11.5 * u, lidY + 0.6 * u], 8), 4 * u);
      if (kind === "lazy") p.arc(x, y + 10 * u, 8 * u, 3.5 * u, 20, 160, 1.8 * u, "#8a5a8a");
      break;
    }
    case "angry": {
      const wpts = ellPts(x, y, 10.5 * u, 9.5 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4 * u, py = y + 2 * u + ly * 2 * u;
        p.ell(px, py, 4.4 * u, 5 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.4 * u, 1.2 * u, WHITE);
        p.poly([[x - side * 14 * u, y - 1 * u], [x + side * 14 * u, y - 12 * u], [x + side * 14 * u, y - 16 * u], [x - side * 14 * u, y - 16 * u]], mul(skin, [0.93, 0.85, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke([[x - side * 12 * u, y - 0.6 * u], [x + side * 12 * u, y - 10.5 * u]], 4.4 * u);
      break;
    }
    case "happy": p.arc(x, y + 3 * u, 9 * u, 8 * u, 200, 340, 4.4 * u); break;
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
    case "chatter": { // chattering teeth: open / shut every other 2 frames
      const open = Math.floor(shake / 2) % 2 === 0, h = open ? 6.5 * u : 4.5 * u;
      const pts = rrect(mx - 13 * u, my - h, mx + 13 * u, my + h, 3.6 * u);
      p.poly(pts, open ? MOUTH : WHITE, 3 * u);
      if (open) {
        p.poly(rrect(mx - 12 * u, my - h + 0.5 * u, mx + 12 * u, my - h + 4.2 * u, 1.5 * u), WHITE, 1.3 * u);
        p.poly(rrect(mx - 12 * u, my + h - 4.2 * u, mx + 12 * u, my + h - 0.5 * u, 1.5 * u), WHITE, 1.3 * u);
        for (let i = -2; i <= 2; i++) { p.stroke([[mx + i * 4.6 * u, my - h + 0.8 * u], [mx + i * 4.6 * u, my - h + 4 * u]], 1.1 * u); p.stroke([[mx + i * 4.6 * u, my + h - 4 * u], [mx + i * 4.6 * u, my + h - 0.8 * u]], 1.1 * u); }
      } else { p.stroke([[mx - 12 * u, my], [mx + 12 * u, my]], 1.3 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.6 * u, my - h + 0.6 * u], [mx + i * 4.6 * u, my + h - 0.6 * u]], 1.1 * u); }
      break;
    }
    case "squiggle": { const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 9 * u + i * 1.4 * u, my + 2.4 * u * Math.sin(i * 0.95) - i * 0.25 * u]); p.stroke(s, 3.4 * u); break; }
    case "ooh": p.ell(mx, my + 1.5 * u, 5.4 * u, 7 * u, MOUTH, 3 * u); p.ell(mx, my + 5 * u, 3.2 * u, 2.2 * u, TONGUE, 0); break;
    case "smile": { const pts = [...thru([mx - 11 * u, my - 2 * u], [mx, my - 1 * u], [mx + 11 * u, my - 2 * u], 8), ...thru([mx + 11 * u, my - 2 * u], [mx, my + 9 * u], [mx - 11 * u, my - 2 * u], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 7 * u, 6 * u, 3.5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); break; }
    case "gasp": { const pts = ellPts(mx, my + 2 * u, 7 * u, 10 * u, 30); p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 10 * u, 6 * u, 4 * u, TONGUE, 0)); p.poly(pts, null, 3.2 * u); break; }
    case "flat": p.stroke([[mx - 8 * u, my + u], [mx + 8 * u, my + 1.6 * u]], 3.4 * u); break;
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 10 * u + i * 1.65 * u, my + 2 * u + 1.7 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9) - 2.5 * u * Math.sin((i / 12) * Math.PI)]); p.stroke(s, 3.4 * u); break; }
    case "smirk": p.stroke(thru([mx - 10 * u, my + 2 * u], [mx, my + 2.4 * u], [mx + 10 * u, my - 4 * u], 8), 3.8 * u); p.stroke([[mx + 10 * u, my - 4 * u], [mx + 12.5 * u, my - 1.5 * u]], 2.4 * u); break;
    case "frown": p.arc(mx, my + 5 * u, 8 * u, 4.4 * u, 205, 335, 3.4 * u); break;
    case "grit": { const pts = rrect(mx - 12 * u, my - 4.5 * u, mx + 12 * u, my + 5 * u, 3.5 * u); p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 11 * u, my + 0.3 * u], [mx + 11 * u, my + 0.3 * u]], 1.4 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.5 * u, my - 4 * u], [mx + i * 4.5 * u, my + 4.5 * u]], 1.2 * u); break; }
    case "grin": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2.5 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 13 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 10 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 8 * u], [mx + 16 * u, my - 8 * u], [mx + 16 * u, my], [mx - 16 * u, my]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
    case "meme": { // THE MEME MOUTH: a huge wobbling scream, teeth top + bottom, flapping tongue, uvula
      const w = 21 * u, h = (31 + 8 * cl01(k)) * u, top = my - 8 * u;
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
    case "roar": { // RAWR: a wide open D-mouth, two fangs, tongue
      const pts = [...thru([mx - 17 * u, my - 5 * u], [mx, my - 7 * u], [mx + 17 * u, my - 5 * u], 10), ...thru([mx + 17 * u, my - 5 * u], [mx, my + 19 * u], [mx - 17 * u, my - 5 * u], 14).slice(1)];
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => {
        p.ell(mx, my + 15 * u, 10 * u, 5 * u, TONGUE, 0);
        for (const s of [-1, 1]) p.poly([[mx + s * 12 * u, my - 7 * u], [mx + s * 4 * u, my - 7 * u], [mx + s * 8.5 * u, my + 4 * u]], WHITE, 1.4 * u);
      });
      p.poly(pts, null, 3.4 * u);
      break;
    }
    case "small": { // a tiny pathetic rawr
      const pts = ellPts(mx, my + 2 * u, 5 * u, 4.4 * u, 24);
      p.poly(pts, MOUTH, 2.6 * u);
      for (const s of [-1, 1]) p.poly([[mx + s * 3.6 * u, my - 1.4 * u], [mx + s * 1.2 * u, my - 1.4 * u], [mx + s * 2.4 * u, my + 1.6 * u]], WHITE, 0.8 * u);
      break;
    }
  }
};
type FaceOpt = { brow?: string; browW?: number; cold?: number; nose?: string; icicle?: boolean };
const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: FaceOpt = {}) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0;
  const ex = 0.37 * a, ey = -0.05 * a;
  const bl = Math.max(D.blush ?? 0, 0.7 * (opt.cold ?? 0));
  if (bl > 0.02) for (const s of [-1, 1]) glow(p, s * 0.6 * a, 0.3 * a, 0.27 * a, BLUSH, 0.55 * bl);
  for (const s of [-1, 1]) {
    const x = s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "half", "lazy", "sparkle", "squint", "angry"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round" || ek === "sparkle")) ek = "half";
    eye(p, ek, x, ey, u, s, look, k, shake, skin);
    const bw = D.brow[s < 0 ? 0 : 1], big = ek === "tiny" || ek === "wide" || ek === "meme";
    const by = ey - (big ? 23 : 18) * u - (ek === "meme" ? 6 * u * k : 0);
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 9 * u, by + bw[1] * u], bwk = opt.browW ?? 1;
    if (opt.brow) { tapered(p, b0, b1, 10 * u * bwk, 7 * u * bwk, INK); tapered(p, b0, b1, 7 * u * bwk, 4 * u * bwk, opt.brow); }
    else tapered(p, b0, b1, 6 * u, 3.4 * u, INK);
  }
  const cold = opt.cold ?? 0;
  const nb = opt.nose ?? (cold > 0.3 ? "#ff6a6a" : mul(skin, [0.97, 0.86, 0.85]));
  const nr = 1 + 0.25 * cold;
  p.ell(0, 0.17 * a, 6.4 * u * nr, 5.2 * u * nr, nb, cold > 0.3 ? 2.2 * u : 0);
  if (cold <= 0.3) p.arc(0, 0.17 * a, 6.4 * u, 5.2 * u, 20, 160, 2.6 * u);
  p.dot(-2 * u, 0.14 * a - 1.4 * u, 1.5 * u * nr, "rgba(255,255,255,0.8)");
  if (opt.icicle) p.poly([[-2.4 * u, 0.17 * a + 4.4 * u], [3.4 * u, 0.17 * a + 4.4 * u], [0.6 * u, 0.17 * a + 15 * u]], "#cfefff", 1.6 * u);
  mouth(p, D.mouth, 0, 0.45 * a, u, k, shake);
};

// ======================================================================================================================
// BEAN (upright 600 x 1000 card)
// ======================================================================================================================
export const SKIN_B = "#ffdcc0", SKIN_COLD = "#f8d8d2";
const TEE = "#ff6a4a", TEE_DK = "#d8463a", SHORTS = "#22c8bc", HOOD = "#29b39c", HOOD_DK = "#1c8a7a", SWEATS = "#3c4a72", HAIR_B = "#6a3b22";
const PHONES = "#ff3a4a";
export type ArmS = {
  sh: P2; w: P2; bend: number; hand?: HandK; hang?: number; hk?: number; back?: boolean; thick?: number;
  /** fraction of the arm under the sleeve (tee ~.32, hoodie pushed-up ~.5) */ sleeve?: number;
  bumps?: number; hairs?: number; boing?: number; press?: number; mirror?: boolean;
};
export type LegS = { hip: P2; foot: P2; bend: number };
export type BeanS = {
  outfit: "tee" | "hoodie"; head: P2; a: number; tilt: number; face: FaceS; lid: number; seed?: number;
  body: P2; rx: number; ry: number; rot?: number;
  arms: ArmS[]; legs?: LegS[]; seat?: number;
  /** hair spikes 0..1+ (the peak), bald = the mirror reflection */ spike?: number; bald?: boolean;
  phones?: 0 | 1 | 2; phonesUp?: number; snow?: number; icicle?: boolean; cold?: number; red?: number;
  legBumps?: number; headBumps?: number; facing?: number;
};
/** bumps + standing hairs along a limb polyline (canvas units; w = limb width) */
const skinDetail = (p: Pen, pts: P2[], w: number, u0: number, bumps: number, hairs: number, seed: number, n = 7) => {
  if (bumps < 0.02 && hairs < 0.02) return;
  const at = (u: number): { P: P2; T: P2 } => {
    const f = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), r = f - i, a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { P: [a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r], T: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] };
  };
  for (let i = 0; i < n; i++) {
    const u = u0 + (0.92 - u0) * ((i + 0.5) / n), { P, T } = at(u), N: P2 = [-T[1], T[0]];
    if (bumps > 0.02) for (const v of [-0.22, 0.2]) {
      const vv = v + 0.12 * (rnd(seed, i * 3 + (v > 0 ? 1 : 0)) - 0.5), r = w * (0.075 + 0.03 * rnd(seed, i + 40)) * bumps;
      const C: P2 = [P[0] + N[0] * w * vv + T[0] * w * 0.2 * (v > 0 ? 1 : 0), P[1] + N[1] * w * vv + T[1] * w * 0.2 * (v > 0 ? 1 : 0)];
      p.dot(C[0] + r * 0.25, C[1] + r * 0.3, r * 1.05, rgba("#b0605a", 0.35));
      p.dot(C[0], C[1], r, rgba("#fff0e4", 0.95));
      p.arc(C[0], C[1], r, r, 20, 160, Math.max(1.4, r * 0.35), rgba(INK, 0.55));
    }
    if (hairs > 0.02) for (const sd of [-1, 1]) {
      const E: P2 = [P[0] + N[0] * sd * w * 0.5, P[1] + N[1] * sd * w * 0.5], L = w * (0.3 + 0.12 * rnd(seed, i + 70)) * hairs;
      const dir: P2 = [N[0] * sd * 0.9 + T[0] * 0.25, N[1] * sd * 0.9 + T[1] * 0.25];
      p.stroke(thru(E, [E[0] + dir[0] * L * 0.5 + T[0] * 3, E[1] + dir[1] * L * 0.5 + T[1] * 3], [E[0] + dir[0] * L, E[1] + dir[1] * L], 5), Math.max(2.4, w * 0.05), "#4a2c1c");
    }
  }
};
/** one springy coil hair ("boing") at P pointing along dir (k = 0..1+ length) */
const boingHair = (p: Pen, P: P2, dir: P2, L: number, k: number, wob: number) => {
  if (k < 0.02) return;
  const n: P2 = [-dir[1], dir[0]], pts: P2[] = [];
  for (let i = 0; i <= 40; i++) { const s = i / 40, c = Math.sin(s * Math.PI * 7) * L * 0.1 * k * (1 - 0.3 * s); pts.push([P[0] + dir[0] * L * k * s + n[0] * (c + wob * s * s * L * 0.15), P[1] + dir[1] * L * k * s + n[1] * (c + wob * s * s * L * 0.15)]); }
  p.stroke(pts, 8, WHITE); p.stroke(pts, 4.6, "#3a2416");
  const T = pts[pts.length - 1]; p.dot(T[0], T[1], 5, "#3a2416");
};
const armDraw = (p: Pen, A: ArmS, skin: string, sleeveCol: string | null, cuffCol: string | null, seed: number) => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const pts = thru(A.sh, M, A.w, 14), w = A.thick ?? 40;
  const hand = () => { if (A.hand) local(p, A.w[0], A.w[1], Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, A.hand!, skin, A.mirror, A.press ?? 0)), A.hk ?? 0.36); };
  if (A.hand === "hold") hand();
  limb(p, pts, skin, w, 5);
  skinDetail(p, pts, w, A.sleeve ?? 0, A.bumps ?? 0, A.hairs ?? 0, seed);
  if (sleeveCol && (A.sleeve ?? 0) > 0) {
    const m = Math.max(2, Math.round(14 * (A.sleeve ?? 0))), sp = pts.slice(0, m + 1);
    limb(p, sp, sleeveCol, w + 14, 5);
    const E = sp[sp.length - 1], P0 = sp[sp.length - 2], a = Math.atan2(E[1] - P0[1], E[0] - P0[0]);
    if (cuffCol) local(p, E[0], E[1], a, () => p.poly(rrect(-12, -(w + 22) / 2, 12, (w + 22) / 2, 10), cuffCol, 5));
    else p.stroke([[E[0] - Math.sin(a) * (w + 10) / 2, E[1] + Math.cos(a) * (w + 10) / 2], [E[0] + Math.sin(a) * (w + 10) / 2, E[1] - Math.cos(a) * (w + 10) / 2]], 4, rgba(INK, 0.5));
  }
  if ((A.boing ?? 0) > 0.02) {
    const i = 10, P = pts[i], Q = pts[i + 1], l = Math.hypot(Q[0] - P[0], Q[1] - P[1]) || 1, N: P2 = [-(Q[1] - P[1]) / l, (Q[0] - P[0]) / l];
    const up: P2 = (A.mirror ? N[0] > 0 : N[0] < 0) ? N : [-N[0], -N[1]]; // QA2: springs AWAY from the body/face
    boingHair(p, [P[0] + up[0] * w * 0.45, P[1] + up[1] * w * 0.45], up, 130, A.boing!, Math.sin((A.boing ?? 0) * 9));
  }
  if (A.hand !== "hold") hand();
};
const beanHairBack = (p: Pen, s: BeanS, a: number) => {
  const k = s.spike ?? 0;
  if (s.bald || k < 0.02) return;
  // the burst: every hair stands up (a ring of long spikes behind the head)
  const n = 15;
  for (let i = 0; i < n; i++) {
    const ang = rad(-180 - 12 + (204 * i) / (n - 1)), L = a * (0.35 + 0.55 * k * (0.75 + 0.5 * rnd(7, i))), w = 0.16 * a;
    const B: P2 = [Math.cos(ang) * a * 0.82, Math.sin(ang) * a * 0.78 - 0.05 * a], T: P2 = [Math.cos(ang) * (a * 0.82 + L), Math.sin(ang) * (a * 0.78 + L) - 0.05 * a];
    const nn: P2 = [-Math.sin(ang) * w, Math.cos(ang) * w];
    p.poly([[B[0] + nn[0], B[1] + nn[1]], T, [B[0] - nn[0], B[1] - nn[1]]], i % 3 === 1 ? mix(HAIR_B, "#a0603a", 0.5) : HAIR_B, 4.6);
  }
};
const beanHairFront = (p: Pen, s: BeanS, a: number, light: number) => {
  const k = s.spike ?? 0;
  if (s.bald) { // the mirror: a shiny bald dome, goosebumps everywhere and ONE sad hair
    p.stroke(thru([-0.55 * a, -0.72 * a], [-0.25 * a, -0.92 * a], [0.15 * a, -0.95 * a], 8), 0.08 * a, rgba(WHITE, 0.75));
    p.dot(0.32 * a, -0.86 * a, 0.045 * a, rgba(WHITE, 0.8));
    boingHair(p, [0.05 * a, -0.97 * a], [0.15, -1], 0.4 * a, 1, 0.6);
    return;
  }
  const hd = mul(HAIR_B, SH_HAIR), lift = 0.1 * a * k;
  const cap = [...thru([-0.99 * a, -0.05 * a], [-0.78 * a, -0.86 * a - lift], [0.02 * a, -1.02 * a - lift], 10), ...thru([0.02 * a, -1.02 * a - lift], [0.78 * a, -0.86 * a - lift], [0.99 * a, -0.1 * a], 10).slice(1),
    ...thru([0.99 * a, -0.1 * a], [0.85 * a, -0.45 * a], [0.55 * a, -0.5 * a], 6).slice(1),
    ...thru([0.55 * a, -0.5 * a], [0.05 * a, -0.32 * a], [-0.45 * a, -0.42 * a], 10).slice(1),
    ...thru([-0.45 * a, -0.42 * a], [-0.8 * a, -0.3 * a], [-0.99 * a, -0.05 * a], 6).slice(1)];
  p.gradFill(cap, HAIR_B, hd, light, 0.3); p.poly(cap, null, 5);
  p.stroke(thru([-0.3 * a, -0.62 * a], [0.1 * a, -0.46 * a], [0.5 * a, -0.62 * a], 8), 3.4, rgba(INK, 0.5));
  p.stroke(thru([0.12 * a, -0.9 * a], [0.42 * a, -0.82 * a], [0.66 * a, -0.6 * a], 6), 0.05 * a, rgba(WHITE, 0.55));
  // the cowlick (stands straight up on the peak)
  const cw = thru([-0.08 * a, -0.98 * a - lift], [-0.02 * a - 0.2 * a * (1 - k), -1.28 * a - lift - 0.2 * a * k], [0.22 * a - 0.2 * a * k, -1.36 * a - lift - 0.35 * a * k], 8);
  p.stroke(cw, 0.13 * a + 10, INK); p.stroke(cw, 0.13 * a, HAIR_B);
};
const headphones = (p: Pen, a: number, mode: 0 | 1 | 2, up: number, front: boolean) => {
  if (!mode) return;
  if (mode === 1) {
    const dy = -0.28 * a * up;
    if (!front) {
      const band = thru([-1.0 * a, -0.15 * a + dy], [0, -1.24 * a + dy], [1.0 * a, -0.15 * a + dy], 16);
      p.stroke(band, 0.2 * a + 10, INK); p.stroke(band, 0.2 * a, "#3a3448");
      const pad = thru([-0.55 * a, -0.98 * a + dy], [0, -1.2 * a + dy], [0.55 * a, -0.98 * a + dy], 10);
      p.stroke(pad, 0.14 * a + 8, INK); p.stroke(pad, 0.14 * a, PHONES);
      return;
    }
    for (const sd of [-1, 1]) {
      const cx = sd * 1.0 * a, cy = 0.02 * a + dy;
      p.poly(rrect(cx - 0.2 * a, cy - 0.36 * a, cx + 0.2 * a, cy + 0.36 * a, 0.16 * a), PHONES, 5);
      p.poly(rrect(cx + sd * 0.12 * a - 0.1 * a, cy - 0.3 * a, cx + sd * 0.12 * a + 0.1 * a, cy + 0.3 * a, 0.08 * a), "#3a3448", 4);
      p.stroke([[cx - sd * 0.05 * a, cy - 0.24 * a], [cx - sd * 0.05 * a, cy - 0.02 * a]], 0.05 * a, rgba(WHITE, 0.7));
    }
    return;
  }
  if (!front) return; // around the neck (over the torso, below the chin)
  const band = thru([-0.75 * a, 1.0 * a], [0, 1.3 * a], [0.75 * a, 1.0 * a], 12);
  p.stroke(band, 0.16 * a + 10, INK); p.stroke(band, 0.16 * a, "#3a3448");
  for (const sd of [-1, 1]) local(p, sd * 0.78 * a, 1.05 * a, sd * 0.5, () => { p.poly(rrect(-0.2 * a, -0.3 * a, 0.2 * a, 0.3 * a, 0.15 * a), PHONES, 5); p.ell(0, 0, 0.09 * a, 0.18 * a, "#3a3448", 3); });
};
const snowCap = (p: Pen, a: number, k: number) => {
  if (k < 0.02) return;
  const pts = puffPts(0.05 * a, -0.98 * a, 0.62 * a * k, 0.28 * a * k, 9, 17);
  p.poly(pts, "#ffffff", 0); p.clip(pts, () => p.ell(0.25 * a, -0.84 * a, 0.7 * a, 0.2 * a, "#d0e2ff", 0)); p.poly(pts, null, 4.4);
  p.ell(-0.45 * a, -0.9 * a, 0.06 * a * k, 0.12 * a * k, "#ffffff", 3, 0, 360, 10);
};
const torsoDraw = (p: Pen, s: BeanS, light: number) => {
  const pts = blobPts(s.body[0], s.body[1], { a: s.rx, b: s.ry, nTop: 2.1, nBot: 2.7, egg: 0.1, asym: 0, rot: s.rot ?? 0, noise: 0.01, seed: 26 }, 56);
  const thick = thickAngle(light), c = s.body;
  const col = s.outfit === "tee" ? TEE : HOOD;
  p.shadedFill(pts, col, mul(col, SH_CLOTH), light, s.rx, 0.4);
  p.clip(pts, () => {
    if (s.outfit === "tee") { // a summer tee: a sun wearing sunglasses
      const sx = c[0] + 4, sy = c[1] - 0.12 * s.ry, r = 0.3 * s.rx;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; p.poly([[sx + Math.cos(a - 0.15) * r * 1.15, sy + Math.sin(a - 0.15) * r * 1.15], [sx + Math.cos(a) * r * 1.6, sy + Math.sin(a) * r * 1.6], [sx + Math.cos(a + 0.15) * r * 1.15, sy + Math.sin(a + 0.15) * r * 1.15]], "#ffd23a", 3); }
      p.ell(sx, sy, r, r, "#ffd23a", 4);
      for (const sd of [-1, 1]) p.poly(rrect(sx + sd * 0.42 * r - 0.3 * r, sy - 0.25 * r, sx + sd * 0.42 * r + 0.3 * r, sy + 0.08 * r, 0.12 * r), "#241726", 0);
      p.stroke([[sx - 0.15 * r, sy - 0.15 * r], [sx + 0.15 * r, sy - 0.15 * r]], 4, "#241726");
      p.arc(sx, sy + 0.2 * r, 0.35 * r, 0.25 * r, 20, 160, 4);
      p.ell(c[0], c[1] - s.ry * 1.0, 0.36 * s.rx, 0.16 * s.ry, TEE_DK, 4);
    } else { // hoodie: hood roll behind the neck, kangaroo pocket, drawstrings
      p.poly(rrect(c[0] - 0.62 * s.rx, c[1] + 0.25 * s.ry, c[0] + 0.62 * s.rx, c[1] + 0.75 * s.ry, 0.2 * s.rx), HOOD_DK, 4);
      p.stroke([[c[0] - 0.62 * s.rx, c[1] + 0.3 * s.ry], [c[0] - 0.4 * s.rx, c[1] + 0.75 * s.ry]], 3, rgba(INK, 0.4));
      p.ell(c[0], c[1] - s.ry * 0.98, 0.5 * s.rx, 0.2 * s.ry, HOOD_DK, 4.4);
      for (const sd of [-1, 1]) { p.stroke([[c[0] + sd * 0.16 * s.rx, c[1] - 0.82 * s.ry], [c[0] + sd * 0.2 * s.rx, c[1] - 0.3 * s.ry]], 7, INK); p.stroke([[c[0] + sd * 0.16 * s.rx, c[1] - 0.82 * s.ry], [c[0] + sd * 0.2 * s.rx, c[1] - 0.3 * s.ry]], 3.5, WHITE); p.ell(c[0] + sd * 0.2 * s.rx, c[1] - 0.27 * s.ry, 5, 7, WHITE, 3); }
    }
    p.poly([[c[0] - 2 * s.rx, c[1] + 0.9 * s.ry], [c[0] + 2 * s.rx, c[1] + 0.9 * s.ry], [c[0] + 2 * s.rx, c[1] + 2 * s.ry], [c[0] - 2 * s.rx, c[1] + 2 * s.ry]], rgba(INK, 0.15), 0);
  });
  p.inkRing(pts, 5, thick, 0.4);
};
const legsDraw = (p: Pen, s: BeanS, skin: string, a: number) => {
  if (s.seat !== undefined) { // cross-legged on the bed (sweats + striped socks)
    const y = s.seat, cx = s.body[0], col = SWEATS;
    const thigh = (sd: number) => limb(p, thru([cx + sd * 50, y - 70], [cx + sd * 120, y - 60], [cx + sd * 175, y - 35], 10), col, 0.62 * a, 5);
    const shin = (sd: number) => limb(p, thru([cx + sd * 175, y - 35], [cx + sd * 60, y - 6], [cx - sd * 70, y - 22], 10), col, 0.56 * a, 5);
    const sock = (sd: number) => { local(p, cx - sd * 92, y - 26, sd * 0.3, () => { p.ell(0, 0, 0.34 * a, 0.2 * a, WHITE, 5); p.stroke([[-0.05 * a, -0.18 * a], [-0.05 * a, 0.18 * a]], 6, "#ff3a4a"); }); };
    thigh(-1); thigh(1); sock(1); shin(-1); sock(-1); shin(1);
    return;
  }
  for (const L of s.legs ?? []) {
    const d = Math.hypot(L.foot[0] - L.hip[0], L.foot[1] - L.hip[1]) || 1, nx = -(L.foot[1] - L.hip[1]) / d, ny = (L.foot[0] - L.hip[0]) / d;
    const pts = thru(L.hip, [(L.hip[0] + L.foot[0]) / 2 + nx * L.bend, (L.hip[1] + L.foot[1]) / 2 + ny * L.bend], L.foot, 12);
    const out = L.foot[0] > s.body[0] ? 1 : -1;
    if (s.outfit === "tee") { // bare shins, flip-flops
      limb(p, pts, skin, 0.44 * a, 5);
      skinDetail(p, pts, 0.44 * a, 0.45, s.legBumps ?? 0, 0, 11 + out, 4);
      const fx = L.foot[0] + out * 8, fy = L.foot[1] + 6;
      p.ell(fx, fy + 6, 0.4 * a, 0.13 * a, "#ffd23a", 4.4);
      p.ell(fx, fy - 4, 0.3 * a, 0.15 * a, skin, 4.4);
      for (let i = -2; i <= 2; i++) { const tx = fx + i * 0.11 * a + out * 0.05 * a; p.dot(tx, fy - 0.1 * a, 0.055 * a, skin); p.arc(tx, fy - 0.1 * a, 0.055 * a, 0.055 * a, 180, 360, 2.4); }
      p.stroke([[fx - 0.22 * a, fy + 2], [fx, fy - 0.12 * a], [fx + 0.22 * a, fy + 2]], 0.07 * a + 6, INK); p.stroke([[fx - 0.22 * a, fy + 2], [fx, fy - 0.12 * a], [fx + 0.22 * a, fy + 2]], 0.07 * a, "#ff4a8a");
      limb(p, pts.slice(0, 6), SHORTS, 0.6 * a, 5);
    } else {
      limb(p, pts, SWEATS, 0.5 * a, 5);
      p.ell(L.foot[0] + out * 10, L.foot[1] + 4, 0.36 * a, 0.18 * a, WHITE, 5);
      p.stroke([[L.foot[0] + out * 10 - 0.25 * a, L.foot[1] - 0.06 * a], [L.foot[0] + out * 10 + 0.25 * a, L.foot[1] - 0.06 * a]], 5, "#ff3a4a");
    }
  }
  if (s.outfit === "tee" && s.legs && s.legs.length > 1) { // shorts seat + hibiscus print
    const L0 = s.legs[0], L1 = s.legs[1], y0 = Math.min(L0.hip[1], L1.hip[1]) - 30;
    const pts = rrect(Math.min(L0.hip[0], L1.hip[0]) - 0.34 * a, y0, Math.max(L0.hip[0], L1.hip[0]) + 0.34 * a, y0 + 0.75 * a, 0.2 * a);
    p.poly(pts, SHORTS, 5);
    p.clip(pts, () => { for (let i = 0; i < 4; i++) { const x = Math.min(L0.hip[0], L1.hip[0]) - 0.2 * a + i * 0.33 * a, y = y0 + 0.25 * a + (i % 2) * 0.3 * a; p.poly(starPts(x, y, 0.12 * a, 5, 0.55), "#ff8ac8", 2.4); p.dot(x, y, 0.035 * a, "#ffe14a"); } });
  }
};
export const drawBean = (p: Pen, s: BeanS, light: number) => {
  const olS = p.ol; p.ol = 5;
  const a = s.a, skin = (s.cold ?? 0) > 0.3 ? SKIN_COLD : SKIN_B, seed = s.seed ?? 23;
  const sleeveCol = s.outfit === "tee" ? TEE : HOOD, cuff = s.outfit === "hoodie" ? HOOD_DK : null;
  legsDraw(p, s, skin, a);
  for (const A of s.arms) if (A.back) armDraw(p, A, skin, sleeveCol, cuff, seed);
  torsoDraw(p, s, light);
  p.poly(rrect(s.head[0] - 0.25 * a, s.head[1] + 0.55 * a, s.head[0] + 0.25 * a, s.body[1] - s.ry + 14, 12), skin, 0);
  local(p, s.head[0], s.head[1], s.tilt, () => {
    const lt = light - s.tilt;
    beanHairBack(p, s, a);
    headphones(p, a, s.phones === 1 ? 1 : 0, s.phonesUp ?? 0, false);
    const hp = blobPts(0, 0, headBlob(seed, a, s.facing ?? 0));
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), lt, a, 0.4);
    if ((s.red ?? 0) > 0.02) p.clip(hp, () => { const r = s.red!, g = p.g, gr = g.createLinearGradient(0, a, 0, -a); gr.addColorStop(0, rgba("#ff2a3a", 0.62 * r)); gr.addColorStop(cl01(r * 0.9), rgba("#ff2a3a", 0.5 * r)); gr.addColorStop(Math.min(1, r * 0.9 + 0.08), rgba("#ff2a3a", 0)); g.fillStyle = gr; g.fillRect(-a * 1.2, -a * 1.2, a * 2.4, a * 2.4); });
    if ((s.headBumps ?? 0) > 0.02) p.clip(hp, () => { for (let i = 0; i < 30; i++) { const x = (rnd(41, i) * 2 - 1) * 0.92 * a, y = (rnd(43, i) * 2 - 1) * 0.95 * a; if (Math.abs(x) < 0.62 * a && y > -0.42 * a && y < 0.75 * a) continue; const r = 0.04 * a * s.headBumps!; p.dot(x + r * 0.3, y + r * 0.3, r * 1.1, rgba("#b0605a", 0.4)); p.dot(x, y, r, "#fff0e6"); p.arc(x, y, r, r, 20, 160, 1.8, rgba(INK, 0.55)); } });
    p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
    const fk = s.face.e === "meme" ? 1 + 0.14 * cl01(s.face.k ?? 1) : 1;
    local(p, (s.facing ?? 0) * 0.08 * a, 0, 0, () => face(p, s.face, a, skin, s.lid, { cold: s.cold, icicle: s.icicle }), fk);
    beanHairFront(p, s, a, lt);
    headphones(p, a, s.phones === 1 ? 1 : 0, s.phonesUp ?? 0, true);
    snowCap(p, a, s.snow ?? 0);
  });
  if (s.phones === 2) local(p, s.head[0], s.head[1], 0, () => headphones(p, a, 2, 0, true));
  for (const A of s.arms) if (!A.back) armDraw(p, A, skin, sleeveCol, cuff, seed);
  p.ol = olS;
};

// ======================================================================================================================
// THE HOOK FOREARM (its own 600 x 1000 card; local frame: elbow (0, 330) -> wrist (0, -150), fist beyond)
// ======================================================================================================================
export type ArmCardS = { ang: number; bumps: number; t: number; t0: number; skin?: string };
export const FA_ELBOW: P2 = [0, 330], FA_WRIST: P2 = [0, -150];
/** a hero bump (the camera's dive target), local frame */
export const FA_HERO: P2 = [8, 95];
const FA_W = (y: number) => lerp(150, 172, (y - FA_WRIST[1]) / (FA_ELBOW[1] - FA_WRIST[1]));
type Bump = { x: number; y: number; r: number; d: number; h: number };
const FA_BUMPS: Bump[] = (() => {
  const out: Bump[] = [];
  for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
    const y = FA_ELBOW[1] - 40 - (i + 0.5 + 0.35 * (rnd(3, i * 7 + j) - 0.5)) * 58, w = FA_W(y);
    const x = (-0.75 + (j + 0.5 + 0.45 * (rnd(5, i * 7 + j) - 0.5) + (i % 2) * 0.35) * 0.42) * w * 0.85;
    if (Math.abs(x) > w * 0.36 || (Math.abs(x - FA_HERO[0]) < 34 && Math.abs(y - FA_HERO[1]) < 34)) continue;
    out.push({ x, y, r: 11 + 6 * rnd(9, i * 7 + j), d: rnd(11, i * 7 + j), h: rnd(13, i * 7 + j) });
  }
  out.push({ x: FA_HERO[0], y: FA_HERO[1], r: 18, d: 0.1, h: 0.3 });
  return out;
})();
/** the shiver close-up: bumps DOME up (bumps 0..1, staggered), tiny hairs spring upright from (t - t0) */
export const drawForearm = (p: Pen, s: ArmCardS) => {
  const skin = s.skin ?? SKIN_COLD;
  local(p, 300, 500, s.ang, () => {
    local(p, FA_WRIST[0], FA_WRIST[1], 0, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, "fist", skin), 1.25));
    const L: P2[] = [], R: P2[] = [];
    for (let i = 0; i <= 16; i++) { const y = lerp(FA_ELBOW[1], FA_WRIST[1], i / 16), w = FA_W(y) / 2 * (1 + 0.04 * Math.sin(i * 0.9)); L.push([-w, y]); R.push([w, y]); }
    const wW = FA_W(FA_WRIST[1]) / 2, wE = FA_W(FA_ELBOW[1]) / 2;
    const capTop: P2[] = [], capBot: P2[] = [];
    for (let i = 1; i < 12; i++) { const a = (i / 12) * Math.PI; capTop.push([wW * Math.cos(a), FA_WRIST[1] - Math.sin(a) * wW * 0.5]); capBot.push([-wE * Math.cos(a), FA_ELBOW[1] + Math.sin(a) * wE * 0.6]); }
    // right side elbow -> wrist, wrist cap right -> left, left side wrist -> elbow, elbow cap left -> right
    const outline: P2[] = [...R, ...capTop, ...L.slice().reverse(), ...capBot];
    p.gradFill(outline, skin, mul(skin, [0.88, 0.76, 0.8]), -Math.PI / 2 - 0.4, 0.25);
    p.clip(outline, () => {
      p.ell(55, 60, 60, 260, rgba("#c07878", 0.16), 0);
      p.stroke(thru([-40, 300], [-55, 100], [-45, -120], 10), 22, rgba(WHITE, 0.22));
      for (let i = 0; i < 18; i++) p.dot((rnd(21, i) - 0.5) * 120, lerp(300, -130, rnd(23, i)), 1.8, rgba("#9a5a50", 0.45));
      for (const b of FA_BUMPS) {
        const g = sm((s.bumps * 1.6 - b.d * 0.6) / 1.0), r = b.r * g;
        if (r < 0.5) continue;
        glow(p, b.x + r * 0.3, b.y + r * 0.35, r * 1.8, "#a05048", 0.24 * g);
        p.dot(b.x, b.y, r, mix(skin, "#ffffff", 0.3));
        p.clip(ellPts(b.x, b.y, r, r, 24), () => p.ell(b.x + r * 0.45, b.y + r * 0.5, r * 0.95, r * 0.9, mix(skin, "#d08878", 0.55), 0));
        p.arc(b.x, b.y, r, r, 15, 165, Math.max(1.6, r * 0.2), rgba(INK, 0.55));
        p.dot(b.x - r * 0.35, b.y - r * 0.4, r * 0.25, rgba(WHITE, 0.9));
      }
    });
    p.inkRing(outline, 7, Math.PI * 0.35, 0.45);
    // tiny hairs: lying flat along the arm -> spring upright (overshoot), staggered
    const up = -s.ang;
    const hair = (B: P2, a0: number, a1: number, L: number, ph: number) => {
      const sp = spring(s.t - s.t0 - 0.2 - 0.45 * ph, 14, 4.5), a = a0 + (a1 - a0) * sp, l = L * (0.75 + 0.25 * Math.min(1.2, sp));
      const d: P2 = [Math.sin(a), -Math.cos(a)], n: P2 = [Math.cos(a), Math.sin(a)];
      const T: P2 = [B[0] + d[0] * l, B[1] + d[1] * l], C: P2 = [B[0] + d[0] * l * 0.5 + n[0] * l * 0.12, B[1] + d[1] * l * 0.5 + n[1] * l * 0.12];
      p.stroke(qbez(B, C, T, 6), 6.4, "#3a2214");
    };
    for (const b of FA_BUMPS) { const g = sm((s.bumps * 1.6 - b.d * 0.6) / 1.0); hair([b.x, b.y - b.r * g * 0.6], 0.25 * (b.h - 0.5), up + 0.35 * (b.h - 0.5), 46 + 14 * b.h, b.h); }
    for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) {
      const y = lerp(FA_ELBOW[1] - 40, FA_WRIST[1] + 30, (i + 0.5 * (sd > 0 ? 1 : 0)) / 9), w = FA_W(y) / 2, h = rnd(31 + sd, i);
      hair([sd * w * 0.98, y], sd * 0.15, sd * (Math.PI / 2) * 0.8 + up * 0.2 + 0.3 * (h - 0.5), 54 + 16 * h, h);
    }
  });
};

// ======================================================================================================================
// THE CAT (its own 600 x 1000 card, base centre 300, 975)
// ======================================================================================================================
export type CatMood = "calm" | "startle" | "floof" | "cosy" | "smug" | "pity" | "scared";
export type CatS = { puff: number; warm: number; mood: CatMood; lid: number; look: P2 };
const CAT = "#a6abc0", CAT_DK = "#7e8399", CAT_OR = "#f2914a", CAT_CR = "#fbefdc", CAT_EAR = "#ffaab6";
/** in-card drawing scale (the 2x floof + bottle-brush tail must stay inside the 600-wide card) */
export const CAT_K = 0.62;
/** unpuffed: ear tips ~350 * CAT_K units above the base */
export const CAT_TOP = 350 * CAT_K;
export const drawCat = (p: Pen, s: CatS, light: number) => {
  const pf = Math.max(0, s.puff), S = 1 + pf, amp = 0.04 + 0.2 * cl01(pf), ink = 5 / Math.sqrt(S);
  local(p, 300, 975, 0, () => {
    const body = { cx: 0, cy: -100, rx: 122, ry: 100 }, head = { cx: 0, cy: -222, rx: 110, ry: 92 };
    const ta = cl01(pf), tw = 30 + 34 * ta;
    const tailMid = thru([95, -60], [lerp(170, 190 - 30 * ta, ta), lerp(-10, -170, ta)], [lerp(90, 150 - 20 * ta, ta), lerp(-4, -300, ta)], 12);
    const drawTail = () => {
      if (ta > 0.15) for (let i = 0; i < tailMid.length - 1; i++) { // bottle-brush bristles
        const A = tailMid[i], B = tailMid[i + 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, n: P2 = [-(B[1] - A[1]) / l, (B[0] - A[0]) / l];
        for (const sd of [-1, 1]) p.poly([[A[0] + n[0] * sd * tw * 0.3, A[1] + n[1] * sd * tw * 0.3], [A[0] + n[0] * sd * tw * (0.6 + 0.5 * ta) + (B[0] - A[0]) * 0.4, A[1] + n[1] * sd * tw * (0.6 + 0.5 * ta) + (B[1] - A[1]) * 0.4], [B[0] + n[0] * sd * tw * 0.3, B[1] + n[1] * sd * tw * 0.3]], i % 3 === 1 ? CAT_OR : CAT, ink);
      }
      limb(p, tailMid, CAT, tw, ink);
      for (let i = 2; i < tailMid.length - 1; i += 3) { const A = tailMid[i], B = tailMid[i + 1], l = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, n: P2 = [-(B[1] - A[1]) / l, (B[0] - A[0]) / l]; p.stroke([[A[0] - n[0] * tw * 0.42, A[1] - n[1] * tw * 0.42], [A[0] + n[0] * tw * 0.42, A[1] + n[1] * tw * 0.42]], tw * 0.22, CAT_OR); }
      const T = tailMid[tailMid.length - 1], T0 = tailMid[tailMid.length - 3]; p.stroke([T0, T], tw * 0.95, CAT_OR);
    };
    if (ta >= 0.3) drawTail();
    const m = s.mood;
    for (const sd of [-1, 1]) { // ears
      const bx = sd * 62, by = -282, flat = m === "scared" || m === "startle" ? 0.35 : 0;
      const ear: P2[] = [[bx - sd * 36, by + 22], [bx + sd * (18 + 10 * ta), by - 74 - 6 * ta], [bx + sd * 46, by + 14]];
      const e2 = ear.map(([x, y]) => [x + sd * flat * (by - y) * 0.6, y + flat * (by - y) * 0.4] as P2);
      p.poly(e2, sd < 0 ? CAT_OR : CAT, ink);
      p.poly(shrink(e2, 0.55).map(([x, y]) => [x, y + 6] as P2), CAT_EAR, 0);
    }
    const bodyPts = furPts(body.cx, body.cy, body.rx, body.ry, 22, amp, 3), headPts = furPts(head.cx, head.cy, head.rx, head.ry, 20, amp * 0.8, 5, 0, -Math.PI / 2);
    p.shadedFill(bodyPts, CAT, CAT_DK, light, body.rx, 0.4);
    p.clip(bodyPts, () => {
      p.ell(0, -60, 70, 70, CAT_CR, 0);
      p.ell(-70, -150, 60, 40, CAT_OR, 0, 0, 360, -20);
      for (let i = 0; i < 3; i++) p.stroke(thru([90, -150 + i * 34], [110, -135 + i * 34], [128, -120 + i * 34], 6), 10, CAT_DK);
      if (s.warm > 0.02) { // the trapped warm-air layer: a warm glow + a dotted "air" contour inside the fur
        glow(p, 0, -110, 190, "#ffa04a", 0.6 * s.warm);
        for (const P of resample(shrink(bodyPts, 0.8), 26)) p.dot(P.P[0], P.P[1], 4.6, rgba("#ff6a1a", 0.9 * s.warm));
      }
    });
    p.inkRing(bodyPts, ink * 1.1, thickAngle(light), 0.4);
    for (const sd of [-1, 1]) { p.ell(sd * 34, -14, 30, 18, CAT_CR, ink); p.stroke([[sd * 34 - 6, -22], [sd * 34 - 6, -8]], 2.6, rgba(INK, 0.6)); p.stroke([[sd * 34 + 6, -22], [sd * 34 + 6, -8]], 2.6, rgba(INK, 0.6)); }
    if (ta < 0.3) drawTail();
    p.shadedFill(headPts, CAT, CAT_DK, light, head.rx, 0.4);
    p.clip(headPts, () => {
      p.ell(-50, -290, 70, 55, CAT_OR, 0, 0, 360, 15);
      for (let i = -1; i <= 1; i++) p.stroke([[i * 18, -312], [i * 14, -278]], 8, CAT_DK);
      p.ell(0, -190, 62, 40, CAT_CR, 0);
      if (s.warm > 0.02) glow(p, 0, -220, 140, "#ffa04a", 0.4 * s.warm);
    });
    p.inkRing(headPts, ink * 1.1, thickAngle(light), 0.4);
    // face
    const ey = -232, look = s.look;
    for (const sd of [-1, 1]) {
      const x = sd * 42;
      if (m === "cosy" || s.lid >= 1) { p.arc(x, ey + 4, 18, 14, m === "cosy" ? 200 : 20, m === "cosy" ? 340 : 160, 6); continue; }
      const r = m === "startle" || m === "scared" || m === "floof" ? 27 : 23;
      p.ell(x, ey, r, r * 1.08, WHITE, s.lid > 0.2 ? 0 : 4.4);
      p.clip(ellPts(x, ey, r, r * 1.08, 30), () => {
        const pr = m === "startle" || m === "scared" ? 6 : m === "floof" ? 15 : 14;
        p.ell(x + look[0] * 8, ey + look[1] * 6, pr + 6, pr + 7, "#ffc23a", 0);
        p.ell(x + look[0] * 8, ey + look[1] * 6, pr, pr * 1.2, INK, 0);
        p.dot(x + look[0] * 8 - pr * 0.4, ey + look[1] * 6 - pr * 0.5, Math.max(2.5, pr * 0.35), WHITE);
        // eyelids: pity / smug half-lids (pity droops outward), blink lowers the lid
        const base = m === "pity" || m === "smug" ? ey - 4 : ey - r * 1.15;
        const ll = lerp(base, ey + r * 1.1, cl01(s.lid)), tw2 = m === "pity" ? 6 : 0;
        if (ll > ey - r * 1.1) {
          p.poly([[x - r - 4, ey - r * 1.3], [x + r + 4, ey - r * 1.3], [x + r + 4, ll + sd * tw2], [x - r - 4, ll - sd * tw2]], CAT, 0);
          p.stroke([[x - r, ll - sd * tw2], [x + r, ll + sd * tw2]], 5);
        }
      });
      { // QA2: a closing lid hides the top of the eye ring (no "goggle" ring over the lid); cross-faded, no pop
        const kc0 = cl01((s.lid - 0.2) / 0.3), kc = kc0 * kc0 * (3 - 2 * kc0);
        if (kc < 0.999) alpha(p, 1 - kc, () => p.ell(x, ey, r, r * 1.08, null, 4.4));
        if (kc > 0.001) {
          const base = m === "pity" || m === "smug" ? ey - 4 : ey - r * 1.15, ll = lerp(base, ey + r * 1.1, cl01(s.lid)), tw2 = m === "pity" ? 6 : 0;
          alpha(p, kc, () => p.clip([[x - r - 8, ll - sd * tw2 - 1], [x + r + 8, ll + sd * tw2 - 1], [x + r + 8, ey + r * 1.5], [x - r - 8, ey + r * 1.5]], () => p.ell(x, ey, r, r * 1.08, null, 4.4)));
        }
      }
      if (m === "pity" || m === "scared") p.stroke([[x - sd * 4, ey - r - (m === "pity" ? 6 : 14)], [x + sd * 18, ey - r - (m === "pity" ? -2 : 22)]], 6);
    }
    p.poly([[-9, -200], [9, -200], [0, -190]], "#ff8aa0", 3);
    if (m === "startle" || m === "scared" || m === "floof") p.ell(0, -172, 10, 13, MOUTH, 3.4);
    else if (m === "pity") p.arc(0, -170, 9, 5, 200, 340, 3.6);
    else { p.arc(-8, -186, 8, 8, 20, 160, 3.4); p.arc(8, -186, 8, 8, 20, 160, 3.4); }
    if (m === "cosy" || m === "smug") for (const sd of [-1, 1]) glow(p, sd * 62, -196, 22, BLUSH, 0.6);
    const sp = m === "floof" || m === "startle" || m === "scared" ? 0.35 : 0;
    for (const sd of [-1, 1]) for (let i = -1; i <= 1; i++) p.stroke(thru([sd * 40, -192 + i * 8], [sd * 80, -196 + i * (12 + 30 * sp)], [sd * 118, -198 + i * (18 + 50 * sp)], 6), 2.6, rgba(INK, 0.8));
  }, S * CAT_K);
};

// ======================================================================================================================
// THE ANCESTOR (600 x 1000 card, soles at 975): a round furry early human with a big red PUFF button
// ======================================================================================================================
export type AncS = { floof: number; press: number; hero: number; face: FaceS; lid: number; tilt: number; gust?: number };
const FUR = "#a8622c", FUR_DK = "#6e3a1a", FUR_LT = "#e0a060", ANC_SKIN = "#eab48c";
/** canvas centre of the ancestor's chest button */
export const ANC_BTN: P2 = [300, 590];
/** in-card drawing scale about the soles (the majestic floof must stay inside the 600-wide card) */
export const ANC_K = 0.8;
export const drawAncestor = (p: Pen, s: AncS, light: number) => {
  const olS = p.ol; p.ol = 5;
  const g0 = p.g; g0.save(); g0.translate(300, 975); g0.scale(ANC_K, ANC_K); g0.translate(-300, -975);
  const f = cl01(s.floof), h = cl01(s.hero), wind = 40 * f * Math.min(1.5, s.gust ?? 1);
  const body = { cx: 300, cy: 650, rx: 150 * (1 + 0.62 * f), ry: 205 * (1 + 0.3 * f) };
  for (const sd of [-1, 1]) { // legs + big bare feet
    limb(p, [[300 + sd * 60, 800], [300 + sd * 70, 940]], FUR, 70, 5);
    p.ell(300 + sd * 80, 955, 62, 26, ANC_SKIN, 5);
    for (let i = 0; i < 4; i++) { const tx = 300 + sd * (58 + i * 16); p.dot(tx, 936, 6.5, ANC_SKIN); p.arc(tx, 936, 6.5, 6.5, 180, 360, 2.6); }
  }
  const sh: P2[] = [[300 - body.rx * 0.78, 520], [300 + body.rx * 0.78, 520]];
  const relax: P2[] = [[300 - body.rx - 10, 720], [300 + body.rx + 10, 720]];
  const hero: P2[] = [[300 - body.rx * 0.9, 700], [Math.min(560, 300 + body.rx * 0.95 + 40), 210]];
  const hand = (i: number): P2 => {
    const r = relax[i], pr: P2 = i === 1 ? [ANC_BTN[0] + 50, ANC_BTN[1] - 40] : r, k = i === 1 ? s.press : 0;
    const m: P2 = [lerp(r[0], pr[0], k), lerp(r[1], pr[1], k)];
    return [lerp(m[0], hero[i][0], h), lerp(m[1], hero[i][1], h)];
  };
  const arm = (i: number) => {
    const S = sh[i], W = hand(i), sd = i ? 1 : -1;
    const pts = thru(S, [(S[0] + W[0]) / 2 + sd * 40, (S[1] + W[1]) / 2 + 20], W, 12);
    limb(p, pts, FUR, 66, 5);
    for (let j = 2; j < pts.length - 2; j += 3) p.poly([[pts[j][0] - 22, pts[j][1]], [pts[j][0] + wind * 0.4 + sd * 26, pts[j][1] + 8], [pts[j][0] + 10, pts[j][1] + 22]], FUR, 4);
    const kind: HandK = h > 0.5 ? "fist" : i === 1 && s.press > 0.5 ? "slap" : "rest";
    const ang = Math.atan2(W[0] - pts[pts.length - 3][0], -(W[1] - pts[pts.length - 3][1]));
    local(p, W[0], W[1], ang, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, kind, ANC_SKIN, i === 1)), 0.4);
  };
  const bp = furPts(body.cx, body.cy, body.rx, body.ry, 26, 0.1 + 0.16 * f, 61, wind);
  p.shadedFill(bp, FUR, FUR_DK, light, body.rx, 0.4);
  p.clip(bp, () => {
    for (let i = 0; i < 26; i++) { const x = body.cx + (rnd(63, i) - 0.5) * 1.6 * body.rx, y = body.cy + (rnd(65, i) - 0.5) * 1.7 * body.ry; p.stroke(thru([x, y], [x + 14 + wind * 0.3, y + 16], [x + 4 + wind * 0.6, y + 40], 6), 7, i % 2 ? FUR_LT : FUR_DK); }
    p.ell(300, 690, body.rx * 0.6, body.ry * 0.55, rgba(FUR_LT, 0.35), 0);
  });
  p.inkRing(bp, 5.5, thickAngle(light), 0.4);
  if (f > 0.05) for (let i = 0; i < 7; i++) { // windswept streamers
    const y = body.cy - body.ry * 0.7 + i * body.ry * 0.23, x = Math.min(520, body.cx + body.rx * (0.85 + 0.1 * rnd(67, i)));
    const st = thru([x - 20, y], [x + 30 * f, y - 18], [Math.min(590, x + (50 + 30 * rnd(69, i)) * f), y + 6], 8);
    p.stroke(st, 20 * f + 8, INK); p.stroke(st, 20 * f, i % 2 ? FUR : FUR_LT);
  }
  p.band(thru([300 - 0.7 * 150, 488], [300, 556], [300 + 0.7 * 150, 628], 10), "#6a4024", 24, 4);
  puffButton(p, ANC_BTN[0], ANC_BTN[1], 46, s.press * (1 - h));
  arm(0); arm(1);
  local(p, 300, 312, s.tilt, () => {
    const a = 86, mane = furPts(wind * 0.25, -6, a * (1.42 + 0.4 * f), a * (1.36 + 0.28 * f), 18, 0.18 + 0.12 * f, 71, wind * 0.8, -Math.PI / 2);
    p.shadedFill(mane, FUR, FUR_DK, light - s.tilt, a * 1.4, 0.4); p.inkRing(mane, 5.5, thickAngle(light), 0.4);
    const hp = blobPts(0, 8, { a: a * 0.98, b: a * 0.94, nTop: 2.2, nBot: 2.4, egg: -0.08, asym: 0, rot: 0, noise: 0.006, seed: 53 }, 56);
    p.shadedFill(hp, ANC_SKIN, mul(ANC_SKIN, SH_SKIN), light, a, 0.4); p.inkRing(hp, 5, thickAngle(light), 0.4);
    for (let i = 0; i < 5; i++) { const x = (-0.62 + i * 0.31) * a; p.poly([[x - 0.22 * a, -0.8 * a], [x + 0.06 * a + wind * 0.2, -0.32 * a], [x + 0.22 * a, -0.78 * a]], FUR, 4); }
    local(p, 0, 8, 0, () => face(p, s.face, a, ANC_SKIN, s.lid, { brow: FUR_DK, browW: 1.3 }));
    local(p, -0.9 * a, -0.86 * a, -0.5, () => { p.poly(rrect(-0.24 * a, -0.05 * a, 0.24 * a, 0.05 * a, 0.03 * a), "#f6f0e0", 3); for (const sd of [-1, 1]) for (const v of [-1, 1]) p.ell(sd * 0.26 * a, v * 0.06 * a, 0.07 * a, 0.07 * a, "#f6f0e0", 3); });
  });
  g0.restore();
  p.ol = olS;
};

// ======================================================================================================================
// GHOST FUR + GHOST BEAR (soft cards: translucent fill, dotted ink outline; alpha baked in)
// ======================================================================================================================
/** the ghost fur coat on a 1024 x 1024 card: k = puff 0..1(+), fiz = fizzle 0..1, col = fill tint, dotC = dot colour,
 *  burst = 0 coat .. 1 explosion spikes, ph = wobble phase, op = overall opacity */
export const fxGhost = (p: Pen, k: number, fiz: number, col: string, dotC: string, burst: number, ph: number, op = 1, dotK = 1) => {
  const cx = 512, cy = 512, rx = 270 * k, ry = 310 * k;
  if (k < 0.02) return;
  alpha(p, op, () => {
    const pts = furPts(cx, cy, rx, ry, 30, 0.13 + 0.18 * burst, 81, 0, ph * 0.03);
    const fa = 1 - fiz;
    if (fa > 0.02) {
      const g = p.g, gr = g.createRadialGradient(cx, cy, rx * 0.2, cx, cy, Math.max(rx, ry) * 1.15);
      gr.addColorStop(0, rgba(col, 0.08 * fa)); gr.addColorStop(0.6, rgba(col, 0.32 * fa)); gr.addColorStop(1, rgba(col, 0.58 * fa));
      p.path(pts, true); g.fillStyle = gr; g.fill();
      for (let i = 0; i < 22; i++) { // inner fur strokes (dotted)
        const a = (i / 22) * Math.PI * 2 + 0.2 * rnd(83, i), r0 = 0.6 + 0.25 * rnd(85, i);
        const A: P2 = [cx + Math.cos(a) * rx * r0, cy + Math.sin(a) * ry * r0], B: P2 = [cx + Math.cos(a) * rx * (r0 + 0.2), cy + Math.sin(a) * ry * (r0 + 0.2)];
        for (let j = 0; j < 4; j++) p.dot(lerp(A[0], B[0], j / 3), lerp(A[1], B[1], j / 3), 4.5 * Math.min(1.4, k), rgba(WHITE, 0.7 * fa));
      }
    }
    // the dotted outline: dots drift out + vanish in random order on the fizzle
    for (const [i, q] of resample(pts, 120).entries()) {
      const th = rnd(87, i), gone = sm((fiz - th * 0.7) / 0.3);
      if (gone >= 1) continue;
      const nx = q.P[0] - cx, ny = q.P[1] - cy, l = Math.hypot(nx, ny) || 1, drift = 90 * gone * (0.5 + rnd(89, i));
      const x = q.P[0] + (nx / l) * drift, y = q.P[1] + (ny / l) * drift - 60 * gone, rk = Math.min(1.3, 0.6 + 0.4 * k) * dotK;
      p.dot(x, y, (9.5 * (1 - gone) + 1) * rk, rgba(WHITE, 0.85 * (1 - gone)));
      p.dot(x, y, 6.2 * (1 - gone) * rk, rgba(dotC, 0.95 * (1 - gone)));
    }
  });
};
/** the ghost BEAR (1024 x 1280 card): rises (k), roars (open jaw), then sags + deflates (d) */
export const fxBear = (p: Pen, k: number, d: number, col: string, dotC: string, ph: number, op = 1) => {
  if (k < 0.02) return;
  const g = p.g;
  alpha(p, op * (1 - 0.35 * d), () => {
    g.save();
    g.translate(512, 1230); g.scale(k * (1 + 0.12 * d), k * (1 - 0.5 * d)); g.translate(-512, -1230);
    const sag = d, roar = 1 - d;
    const head: P2 = [512, 330 + 40 * sag], hr = 150;
    const arm = (sd: number) => {
      const S: P2 = [512 + sd * 230, 560], W: P2 = [512 + sd * lerp(330, 300, sag), lerp(300, 820, sag)], M: P2 = [512 + sd * lerp(400, 330, sag), lerp(400, 700, sag)];
      return thru(S, M, W, 12);
    };
    const shapes: P2[][] = [];
    for (const sd of [-1, 1]) shapes.push(furPts(512 + sd * 150, 1120, 110, 120, 10, 0.12, 93 + sd, 0));
    shapes.push(furPts(512, 800, 300, 390, 28, 0.08 + 0.05 * roar, 95, 0));
    const fill = (pts: P2[]) => { p.path(pts, true); g.fillStyle = rgba(col, 0.6); g.fill(); }; // QA2: denser so the bear reads
    for (const s2 of shapes) fill(s2);
    for (const sd of [-1, 1]) { const a = arm(sd); g.lineCap = "round"; p.path(a, false); g.strokeStyle = rgba(col, 0.6); g.lineWidth = 150; g.stroke(); }
    for (const sd of [-1, 1]) fill(ellPts(head[0] + sd * 112, head[1] - 118 + 30 * sag, 52, 50 - 12 * sag, 24, sd * 0.4 * sag));
    const hp = furPts(head[0], head[1], hr * 1.1, hr, 18, 0.1, 97, 0);
    fill(hp);
    const dots = (pts: P2[], n: number) => { for (const [i, q] of resample(pts, n).entries()) { const r = 7 + 1.5 * Math.sin(ph * 3 + i); p.dot(q.P[0], q.P[1], r + 3, rgba(WHITE, 0.7)); p.dot(q.P[0], q.P[1], r, rgba(dotC, 0.95)); } };
    for (const s2 of shapes) dots(s2, 70);
    dots(hp, 50);
    for (const sd of [-1, 1]) {
      const a = arm(sd), W = a[a.length - 1];
      for (let i = 0; i < a.length; i += 2) { const A = a[i]; p.dot(A[0], A[1] - 75, 6, rgba(dotC, 0.8)); p.dot(A[0], A[1] + 75, 6, rgba(dotC, 0.8)); }
      for (let i = 0; i < 4; i++) { // claws
        const ca = -Math.PI / 2 + sd * (0.2 + i * 0.32) * (1 - 0.6 * sag) + Math.PI * sag, T: P2 = [W[0] + Math.cos(ca) * 120, W[1] + Math.sin(ca) * 120];
        p.poly([[W[0] + Math.cos(ca + 0.12) * 70, W[1] + Math.sin(ca + 0.12) * 70], T, [W[0] + Math.cos(ca - 0.12) * 70, W[1] + Math.sin(ca - 0.12) * 70]], rgba(WHITE, 0.92), 5);
      }
    }
    for (const sd of [-1, 1]) {
      if (sag < 0.5) { glow(p, head[0] + sd * 55, head[1] - 25, 46, "#ffe14a", 0.9 * roar); p.poly([[head[0] + sd * 22, head[1] - 10], [head[0] + sd * 84, head[1] - 48], [head[0] + sd * 82, head[1] - 18]], "#fff6a0", 5); }
      else p.arc(head[0] + sd * 55, head[1] - 5, 22, 14, 200, 340, 8, rgba(dotC, 0.95));
    }
    if (roar > 0.5) {
      const jaw = [...thru([head[0] - 80, head[1] + 30], [head[0], head[1] + 10], [head[0] + 80, head[1] + 30], 10), ...thru([head[0] + 80, head[1] + 30], [head[0], head[1] + 170], [head[0] - 80, head[1] + 30], 14).slice(1)];
      p.poly(jaw, rgba("#3a0a2a", 0.85), 6);
      for (const sd of [-1, 1]) { p.poly([[head[0] + sd * 62, head[1] + 26], [head[0] + sd * 30, head[1] + 22], [head[0] + sd * 48, head[1] + 82]], WHITE, 4); p.poly([[head[0] + sd * 52, head[1] + 128], [head[0] + sd * 22, head[1] + 138], [head[0] + sd * 40, head[1] + 92]], WHITE, 4); }
    } else p.ell(head[0], head[1] + 70, 22, 18, rgba("#3a0a2a", 0.8), 5);
    p.ell(head[0], head[1] + 15, 30, 20, rgba("#3a2a4a", 0.9), 4);
    if (sag > 0.2) for (let i = 0; i < 3; i++) p.stroke(thru([380 + i * 90, 640 + 40 * i], [420 + i * 90, 660 + 40 * i], [460 + i * 90, 640 + 40 * i], 6), 6, rgba(dotC, 0.6 * sag));
    g.restore();
  });
};

// ======================================================================================================================
// EFFECT CARDS (canvas units = pixels of the fx canvas)
// ======================================================================================================================
const dropPts = (x: number, y: number, r: number): P2[] => {
  const out: P2[] = [[x, y - 2.1 * r]];
  out.push(...thru([x, y - 2.1 * r], [x + 0.6 * r, y - 1.0 * r], [x + r * 0.98, y + 0.05 * r], 8).slice(1));
  for (let i = 1; i < 16; i++) { const a = (i / 16) * Math.PI; out.push([x + Math.cos(a) * r, y + 0.05 * r + Math.sin(a) * r]); }
  out.push(...thru([x - r * 0.98, y + 0.05 * r], [x - 0.6 * r, y - 1.0 * r], [x, y - 2.1 * r], 8));
  return out;
};
export const fxSweat = (p: Pen) => { const pts = dropPts(100, 170, 50); p.poly(pts, "#8ad4ff", 0); p.clip(pts, () => p.ell(118, 192, 40, 30, "#3a8ad8", 0)); p.poly(pts, null, 9); p.ell(82, 152, 10, 16, WHITE, 0, 0, 360, -20); };
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, 150, 210, 330, col, 32, 10);
export const fxSparkle = (p: Pen, col: string) => { p.poly(starPts(128, 128, 112, 4, 0.22), col, 9); p.dot(128, 128, 16, WHITE); };
/** shiver lines: three short wavy vertical strokes (256 x 512) */
export const fxShiver = (p: Pen, ph: number) => {
  for (let i = 0; i < 3; i++) {
    const x = 50 + i * 78, pts: P2[] = [];
    for (let j = 0; j <= 14; j++) pts.push([x + 16 * Math.sin(j * 1.6 + ph + i), 90 + i * 30 + j * 22 - i * 20]);
    p.stroke(pts, 26, INK); p.stroke(pts, 12, i === 1 ? "#bfe8ff" : WHITE);
  }
};
/** "BRRR": icy wobbling letters with snow caps + icicles (768 x 300) */
export const fxBrrr = (p: Pen, ph: number) => {
  const w = "BRRR", xs = [120, 290, 450, 610];
  for (let i = 0; i < 4; i++) local(p, xs[i] + 6 * Math.sin(ph * 2 + i * 1.7), 150 + 12 * Math.sin(ph * 3 + i), 0.12 * Math.sin(ph * 2.4 + i), () => {
    letter(p, w[i], 0, 0, 210 - i * 8, "#bfeaff", 30, 12);
    p.ell(-24, -84, 36, 13, "#ffffff", 5);
  });
  for (let i = 0; i < 3; i++) p.poly([[160 + i * 160, 236], [178 + i * 160, 236], [169 + i * 160, 282]], "#cfefff", 5);
};
export const fxSnowflake = (p: Pen, seed: number) => {
  const c = 128;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2 * seed, d: P2 = [Math.cos(a), Math.sin(a)];
    const arm: P2[] = [[c, c], [c + d[0] * 100, c + d[1] * 100]];
    p.stroke(arm, 30, INK); p.stroke(arm, 14, WHITE);
    for (const t of [0.45, 0.72]) for (const sd of [-1, 1]) { const b = a + sd * 0.7, B: P2 = [c + d[0] * 100 * t, c + d[1] * 100 * t], E: P2 = [B[0] + Math.cos(b) * 34 * (1.1 - t), B[1] + Math.sin(b) * 34 * (1.1 - t)]; p.stroke([B, E], 22, INK); p.stroke([B, E], 9, WHITE); }
  }
  p.ell(c, c, 24, 24, "#dff4ff", 8);
};
/** a music note (256 x 256): kind 0 quaver, 1 beamed pair; col fill */
export const fxNote = (p: Pen, kind: number, col: string) => {
  p.ell(78, 196, 46, 34, col, 9, 0, 360, -20);
  p.stroke([[118, 188], [118, 40]], 16);
  if (kind === 0) p.poly([...thru([118, 40], [178, 72], [172, 140], 8), [160, 136], [164, 96], [118, 78]], col, 8);
  else { p.ell(178, 168, 40, 30, col, 9, 0, 360, -20); p.stroke([[214, 160], [214, 20]], 16); p.poly([[118, 40], [214, 20], [214, 54], [118, 74]], col, 8); }
  p.ell(62, 186, 12, 7, rgba(WHITE, 0.8), 0, 0, 360, -20);
};
/** the note with a little gloved hand that POKES (512 x 384): poke 0..1 extends the arm to the right */
export const fxNoteHand = (p: Pen, poke: number, col: string) => {
  const ex = 230 + 170 * poke;
  const arm = thru([150, 200], [lerp(230, 300, poke), 172], [ex, 190], 10);
  p.stroke(arm, 30, INK); p.stroke(arm, 16, WHITE);
  local(p, ex + 24, 190, 0, () => { p.ell(0, 0, 38, 32, WHITE, 8); p.poly(rrect(14, -14, 82, 12, 12), WHITE, 7); p.stroke([[-22, -18], [-6, -24]], 5); });
  local(p, -10, 50, 0, () => fxNote(p, 0, col));
  p.ell(70, 238, 13, 15, WHITE, 5); p.dot(74, 241, 6);
};
export const fxButton = (p: Pen, press: number) => puffButton(p, 256, 190, 140, press);
/** a burst word (BOOP sad + small / BOING springy / RAWR jagged): 800 x 500 */
export const fxWord = (p: Pen, word: string, style: "boop" | "boing" | "rawr", ph = 0) => {
  if (style === "rawr") {
    p.poly(starPts(400, 250, 245, 14, 0.7, 0.1), "#ffe14a", 16);
    p.poly(starPts(400, 250, 190, 14, 0.74, 0.3), "#ff3a5a", 0);
    letter(p, word, 400, 258, 170, WHITE, 30, 0, 600);
  } else if (style === "boing") {
    const n = word.length;
    for (let i = 0; i < n; i++) local(p, 130 + i * (540 / (n - 1)), 260 - 50 * Math.abs(Math.sin(ph * 6 + i * 0.9)), 0.15 * Math.sin(ph * 5 + i), () => letter(p, word[i], 0, 0, 170, ["#ffd23a", "#3ad0ff", "#ff6a9a", "#6ae06a", "#ffd23a"][i % 5], 30, 12));
  } else {
    const pill = rrect(150, 140, 650, 360, 105, 10);
    p.poly(pill, "#e4ecf8", 14);
    letter(p, word, 400, 252, 132, "#7a8aa8", 22, 0, 440);
    p.stroke(thru([600, 330], [640, 390], [610, 440], 8), 10, "#8ad4ff");
  }
};
/** the 2x size ruler (320 x 1024): marks; "1x" at y1, "2x" at y2 (canvas y) */
export const fxRuler = (p: Pen, y1: number, y2: number) => {
  const box = rrect(50, 30, 140, 1010, 16);
  p.poly(box, "#ffd88a", 10);
  p.clip(box, () => { p.poly(rrect(50, 30, 72, 1010, 4), "#f0b85a", 0); for (let i = 0; i < 41; i++) p.stroke([[140, 50 + i * 24], [i % 5 ? 118 : 94, 50 + i * 24]], i % 5 ? 4 : 6); });
  p.poly(box, null, 10);
  for (const [y, s] of [[y1, "1x"], [y2, "2x"]] as const) {
    p.stroke([[24, y], [170, y]], 18, INK); p.stroke([[24, y], [170, y]], 8, s === "2x" ? "#ff3a5a" : "#3a7aff");
    letter(p, s, 238, y, s === "2x" ? 100 : 72, s === "2x" ? "#ff3a5a" : "#3a7aff", 16, 6, 150);
  }
};
/** magnifier callout (600 x 600): a lens on bare skin with 3 TINY bumps + one hair; handle to the bottom-left */
export const fxLens = (p: Pen, k: number) => {
  p.stroke([[150, 450], [60, 545]], 64, INK); p.stroke([[150, 450], [60, 545]], 40, "#8a5a3a");
  const C: P2 = [330, 270], r = 220, lens = ellPts(C[0], C[1], r, r, 60);
  p.poly(lens, SKIN_COLD, 0);
  p.clip(lens, () => {
    p.ell(C[0] + 80, C[1] + 90, r, r, rgba("#c08080", 0.18), 0);
    for (const [x, y, rr] of [[250, 250, 18], [370, 220, 14], [330, 330, 16]] as const) { const q = rr * k; if (q < 0.5) continue; glow(p, x + 4, y + 5, q * 2, "#a05048", 0.3); p.dot(x, y, q, mix(SKIN_COLD, "#ffffff", 0.35)); p.arc(x, y, q, q, 15, 165, 3.4, rgba(INK, 0.6)); p.dot(x - q * 0.35, y - q * 0.4, q * 0.3, WHITE); }
    p.stroke(qbez([372, 214], [380, 170], [400, 150], 6), 6, "#3a2214");
    p.stroke(thru([150, 130], [200, 100], [260, 110], 8), 18, rgba(WHITE, 0.6));
  });
  p.ell(C[0], C[1], r, r, null, 22); p.ell(C[0], C[1], r + 14, r + 14, null, 8);
};
/** a breath cloud (256 x 256) */
export const fxBreath = (p: Pen, seed: number) => { const pts = puffPts(128, 128, 96, 70, 7, seed); p.poly(pts, "#f4fbff", 7); p.ell(100, 104, 24, 14, WHITE, 0); };
/** a warm-air puff with a swirl (256 x 256) */
export const fxWarm = (p: Pen, seed: number) => {
  p.poly(puffPts(128, 128, 96, 80, 7, seed), "#ffd2a0", 7);
  p.stroke(thru([84, 150], [128, 80], [168, 136], 10), 9, "#ff8a3a"); p.stroke(thru([168, 136], [140, 170], [118, 140], 8), 9, "#ff8a3a");
};
/** a small arrow pointing to the bottom-left tip (256 x 256) */
export const fxArrow = (p: Pen, col: string) => {
  const s: P2[] = [[220, 40], [90, 170]];
  p.stroke(s, 40, INK); p.stroke(s, 20, col);
  p.poly([[40, 216], [64, 120], [136, 192]], col, 9);
};
/** concert ray burst (512 x 512), soft */
export const fxRays = (p: Pen, c0: string, c1: string) => {
  for (let i = 0; i < 18; i++) { const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18; p.poly([[256, 256], [256 + Math.cos(a0) * 256, 256 + Math.sin(a0) * 256], [256 + Math.cos(a1) * 256, 256 + Math.sin(a1) * 256]], rgba(i % 2 ? c0 : c1, 0.5), 0); }
  glow(p, 256, 256, 200, "#ffffff", 0.55);
};
/** whoosh speed lines along the card y (256 x 512) */
export const fxSpeed = (p: Pen) => { for (const [x, y0, l] of [[50, 30, 420], [128, 90, 380], [206, 50, 440]] as const) { p.stroke([[x, y0], [x, y0 + l]], 30, INK); p.stroke([[x, y0 + 6], [x, y0 + l - 6]], 14, WHITE); } };
/** a puff of air (cut-out cloud, 256 x 256) */
export const fxPoof = (p: Pen) => { p.poly(puffPts(128, 128, 104, 84, 8, 7), "#ffffff", 8); p.ell(150, 150, 50, 30, "#e0e8f6", 0); };
/** pastel note with a star (the cute song, 256 x 256) */
export const fxCuteNote = (p: Pen, col: string) => { fxNote(p, 1, col); p.poly(starPts(48, 52, 34, 5, 0.5), "#fff27a", 5); };
/** "!" / "?" mark helper re-export for the cast */
export const MARK_COL = { "!": "#ff5a4a", "?": "#ffe46b" } as const;

// ======================================================================================================================
// THE MIRROR (its own 600 x 1000 card in the glass plane): a warm reflected room, the BALD bumpy little BEAN (mirrored,
// same pose), a tiny "rawr", arrows pointing at the bumps (bald 0..1), glass sheen. gw = glass width in canvas units
// (glass spans y 50..950), kk = BEAN scale in the glass, slide = canvas x offset of the reflected BEAN (enters).
// ======================================================================================================================
const arrowAt = (p: Pen, tip: P2, ang: number, size: number, col: string) => local(p, tip[0], tip[1], ang, () => {
  const s: P2[] = [[0, -size * 0.25], [0, -size]];
  p.stroke(s, size * 0.2 + 8, INK); p.stroke(s, size * 0.2, col);
  p.poly([[0, 0], [-size * 0.24, -size * 0.34], [size * 0.24, -size * 0.34]], col, 5);
});
export const drawMirror = (p: Pen, s: BeanS | null, light: number, gw: number, kk: number, slide: number, bald: number, rawr: number) => {
  const x0 = 300 - gw / 2, x1 = 300 + gw / 2, y0 = 50, y1 = 950, rect = rrect(x0, y0, x1, y1, Math.min(30, gw * 0.08));
  p.clip(rect, () => {
    const g = p.g, gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, "#b98aa6"); gr.addColorStop(0.68, "#e6a88e"); gr.addColorStop(0.69, "#8e5e56"); gr.addColorStop(1, "#6e4a48");
    g.fillStyle = gr; g.fillRect(x0, y0, gw, y1 - y0);
    p.poly([[x0, 250], [x0 + gw * 0.45, 160], [x0 + gw * 0.62, 640], [x0, 720]], rgba("#ffd8a0", 0.3), 0); // the sun slab
    p.poly(rrect(x0 + gw * 0.62, 180, x0 + gw * 0.95, 400, 10), "#5a8ac8", 4); // a reflected poster
    p.poly(starPts(x0 + gw * 0.785, 290, gw * 0.09, 5, 0.5), "#ffe14a", 3);
    if (s) {
      g.save(); g.translate(300 + slide, 932); g.scale(-kk, kk); g.translate(-300, -950);
      drawBean(p, s, Math.PI - light);
      g.restore();
      const hx = 300 + slide, hy = 932 - (950 - s.head[1]) * kk, a = s.a * kk;
      if (rawr > 0.02) { // a tiny "rawr" (unmirrored so it reads)
        const k = rawr;
        local(p, hx - 1.15 * a, hy + 0.2 * a, -0.12, () => { p.poly(rrect(-0.75 * a, -0.32 * a, 0.75 * a, 0.32 * a, 0.3 * a), "#fff6e0", 4); letter(p, "rawr", 0, 2, 0.36 * a, "#ff6a8a", 4, 0, 1.3 * a); }, k);
      }
      for (let i = 0; i < 3; i++) { // arrows at the bumps
        const k = Math.min(1.15, Math.max(0, spring(bald * 1.2 - i * 0.18, 14, 5) * (bald > 0.01 ? 1 : 0)));
        if (k < 0.02) continue;
        const tips: P2[] = [[hx + 0.62 * a, hy - 0.78 * a], [hx - 0.8 * a, hy - 0.6 * a], [hx + 1.35 * a, hy + 0.9 * a]];
        const angs = [0.75, -0.75, 2.0];
        arrowAt(p, tips[i], angs[i], 0.95 * a * k, "#ffe14a");
      }
    }
    p.poly([[x0, 430], [x0 + gw * 0.55, 230], [x0 + gw * 0.62, 280], [x0, 500]], rgba(WHITE, 0.18), 0); // sheen
    p.poly([[x0, 560], [x0 + gw * 0.7, 300], [x0 + gw * 0.74, 330], [x0, 590]], rgba(WHITE, 0.12), 0);
  });
  p.poly(rect, null, 8);
};
