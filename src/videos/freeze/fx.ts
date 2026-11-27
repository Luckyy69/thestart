// OWNER: cast. Canvas2D drawings for "Wrong Address" (all NEW designs; Pen style: thick-thin plum ink, painted crescents).
// Character cards use the bridge 600 x 1000 design space (1000 units = 2.16 m at scale 1, soles at y 975).
//   drawPerson  BEAN (cobalt tee with a tiny smiling cone, mango shorts, red sneakers, red nose), the gym KIDS (6 hair
//               styles), the SCHOOLKID (lab coat, goggles, pigtails, stopwatch), her DAD (sweater vest, tie, glasses,
//               moustache, clipboard). Held items: the HUGE 3-scoop cone (vanilla / mint-choc-chip / strawberry, drips,
//               a cherry, a bite), spoon, bowl, stopwatch, clipboard, the "0 PAIN SENSORS" sign. Frost creeping over
//               the forehead, the head-top LID that flips open on a hinge with the little BRAIN popping out, icicle
//               hair + the frozen-scream MEME face (the peak only), frozen solid (blue sheen).
//   drawBrain   the HQ BRAIN: pink wrinkly, headset mic, white gloves, on an orange swivel chair.
//   fx*         frost crystals, ice shards, vapour, "?", "!!", OUCH, FOREHEAD!, ahh, nah (frozen bubble), CLICK!, splats,
//               hearts, sparkles, speed lines, impact, frost burst, the glossy ICE BLOCK.
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
export type HandK = "open" | "fist" | "splay" | "rest" | "scratch" | "point" | "pinky" | "slam";
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
  const palm = blobPts(0, 0, { a: 70, b: 66, nTop: 2.4, nBot: 2.2, egg: 0.06, asym: 0, rot: 0, noise: 0.01, seed: 5 }, 48);
  const fingersUp = (angs: number[], lens: number[], spread = 1) => { const xs = [-48, -16, 16, 48]; for (let i = 0; i < 4; i++) finger(p, [xs[i] * spread, -40 + Math.abs(xs[i]) * 0.14], angs[i], lens[i], 34, skin); };
  const thumb = (a: number, L: number, base: P2 = [-56, 4]) => finger(p, base, a, L, 37, skin);
  const palmFill = () => {
    p.poly(palm, skin, 0);
    p.clip(palm, () => { p.ell(30, 30, 70, 60, rgba(SHD, 0.12), 0); p.stroke(thru([-40, 22], [-5, 34], [30, 48], 8), 3, rgba(INK, 0.35)); });
    p.poly(palm, null, 5.5);
  };
  const fist = (skip = -1) => { palmFill(); for (let i = 0; i < 4; i++) if (i !== skip) curl(p, [-48 + i * 32, -40 + Math.abs(i - 1.5) * 4], 33, 68, skin); p.poly(rrect(-78, -8, 14, 28, 18, 6), skin, 5); };
  switch (kind) {
    case "open": case "rest": case "slam": {
      const sp = kind === "rest" ? 0.5 : kind === "slam" ? 1.4 : 1;
      fingersUp([-0.24 * sp, -0.08 * sp, 0.08 * sp, 0.24 * sp], [120, 138, 130, 104]);
      palmFill(); thumb(-0.95, 94);
      break;
    }
    case "splay": fingersUp([-0.62, -0.22, 0.22, 0.62], [116, 134, 128, 104], 1.1); palmFill(); thumb(-1.45, 92); break;
    case "scratch": fingersUp([-0.5, -0.45, -0.4, -0.35], [104, 118, 112, 92]); palmFill(); thumb(-1.2, 86); break;
    case "point": finger(p, [-46, -36], -0.06, 150, 36, skin); fist(0); break;
    case "pinky": finger(p, [52, -30], 0.85, 104, 30, skin); fist(3); break;
    case "fist": fist(); break;
  }
  g.restore();
};

// ======================================================================================================================
// HELD ITEMS (drawn upright in card space, centred on the palm; size unit a = head half-width)
// ======================================================================================================================
const CONE = "#e8a85a", CONE_DK = "#b8743a", PINK = "#ff8fb8", PINK_DK = "#e05a8e", MINT = "#8ff0c8", MINT_DK = "#3ec49a", VAN = "#fff1c8", VAN_DK = "#e8c890", CHOC = "#6a3a24";
export type ItemS =
  | { k: "cone"; bite: number; drip: number; scoops: number; tilt?: number; ph?: number; lick?: number; frost?: number; sc?: number }
  | { k: "spoon"; load: number; tilt?: number; col?: string }
  | { k: "bowl"; col?: string; fill?: string }
  | { k: "stopwatch"; press: number }
  | { k: "clipboard"; tilt?: number }
  | { k: "sign"; tilt?: number }
  | { k: "mug" };
/** one ice-cream scoop (puffy top, drippy lip); bite = radius of a bite taken out of its upper right */
const scoop = (p: Pen, cx: number, cy: number, r: number, col: string, dk: string, seed: number, bite = 0, chips = false, frost = 0) => {
  const pts: P2[] = [];
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, s = Math.sin(a);
    let rr = r * (1 + 0.05 * Math.sin(a * 7 + seed));
    if (s > 0.2) rr *= 1 + 0.12 * Math.max(0, Math.sin(a * 9 + seed * 2)); // drippy lower lip
    pts.push([cx + Math.cos(a) * rr * 1.08, cy + s * rr * (s > 0 ? 0.78 : 0.95)]);
  }
  const g = p.g, bx = cx - r * 0.62, by = cy - r * 0.62, br = r * 0.55 * bite;
  g.save();
  if (bite > 0.02) { p.path(pts, true); g.moveTo(bx + br, by); g.arc(bx, by, br, 0, Math.PI * 2, true); g.clip("evenodd"); }
  p.poly(pts, col, 0);
  p.clip(pts, () => {
    p.ell(cx + r * 0.35, cy + r * 0.45, r * 1.0, r * 0.6, dk, 0);
    p.ell(cx - r * 0.38, cy - r * 0.42, r * 0.34, r * 0.2, rgba(WHITE, 0.75), 0, 0, 360, -25);
    if (chips) for (let i = 0; i < 6; i++) p.ell(cx + (rnd(seed, i) - 0.5) * 1.5 * r, cy + (rnd(seed, i + 9) - 0.5) * 1.2 * r, r * 0.09, r * 0.06, CHOC, 0, 0, 360, rnd(seed, i + 3) * 90);
    if (bite > 0.02) p.ell(bx, by, br * 1.18, br * 1.18, dk, 0);
    if (frost > 0.02) { p.ell(cx, cy - r * 0.2, r * 1.2, r * 0.9, rgba("#e6f7ff", 0.5 * frost), 0); }
  });
  p.poly(pts, null, Math.max(3, r * 0.09));
  g.restore();
  if (bite > 0.02) { // ink along the bite edge, inside the scoop
    p.clip(pts, () => p.ell(bx, by, br, br, null, Math.max(3, r * 0.08)));
    for (let i = 0; i < 3; i++) { const a = rad(110 + i * 35); p.dot(bx + Math.cos(a) * br * 1.02, by + Math.sin(a) * br * 1.02, r * 0.07, col); }
  }
};
const drawCone = (p: Pen, s: Extract<ItemS, { k: "cone" }>, a: number) => {
  // origin = the grip (palm): the waffle cone runs down from y -0.25a to the tip at +0.8a; scoops stack above
  const top = -0.3 * a, tip = 0.85 * a, hw = 0.36 * a;
  local(p, 0, 0, s.tilt ?? 0, () => {
    if ((s.sc ?? 1) !== 1) p.g.scale(s.sc!, s.sc!); // (qa2) the cone shrinks INTO the mouth on "Nah"
    const cone: P2[] = [[-hw, top], [hw, top], [0.04 * a, tip], [-0.04 * a, tip]];
    p.poly(cone, CONE, 0);
    p.clip(cone, () => {
      for (let i = -6; i <= 6; i++) { p.stroke([[i * 0.14 * a - 0.6 * a, top], [i * 0.14 * a + 0.6 * a, tip + 0.2 * a]], Math.max(2.5, 0.025 * a), CONE_DK); p.stroke([[i * 0.14 * a + 0.6 * a, top], [i * 0.14 * a - 0.6 * a, tip + 0.2 * a]], Math.max(2.5, 0.025 * a), CONE_DK); }
      p.poly([[0, top], [hw, top], [0.04 * a, tip]], rgba(SHD, 0.18), 0);
    });
    p.poly(cone, null, Math.max(3.5, 0.05 * a));
    p.poly(rrect(-hw - 0.05 * a, top - 0.1 * a, hw + 0.05 * a, top + 0.06 * a, 0.05 * a), CONE, Math.max(3.5, 0.045 * a));
    const n = Math.round(s.scoops), r = 0.36 * a, cols: [string, string, boolean][] = [[VAN, VAN_DK, false], [MINT, MINT_DK, true], [PINK, PINK_DK, false]];
    for (let i = 0; i < n; i++) scoop(p, 0.02 * a * (i % 2 ? -1 : 1), top - 0.22 * a - i * 0.5 * a, r * (1 - 0.04 * i), cols[i][0], cols[i][1], 3 + i * 7, i === n - 1 ? s.bite : 0, cols[i][2], s.frost ?? 0);
    if (n >= 3 && s.bite < 0.3) { // a cherry on the top scoop
      const cy = top - 0.22 * a - 2 * 0.5 * a - 0.34 * a;
      p.stroke(thru([0, cy], [0.08 * a, cy - 0.16 * a], [0.18 * a, cy - 0.26 * a], 6), Math.max(3, 0.03 * a), "#4a7a2a");
      p.ell(0, cy, 0.12 * a, 0.11 * a, "#ff2a4a", Math.max(3, 0.035 * a)); p.dot(-0.04 * a, cy - 0.04 * a, 0.03 * a, WHITE);
    }
    // drips running down the cone (drip 0..1 loops)
    for (let j = 0; j < 2; j++) {
      const u = ((s.drip ?? 0) + j * 0.5) % 1, x = (j ? 0.2 : -0.24) * a, y0 = top - 0.02 * a, L = 0.12 * a + 0.35 * a * u, col = j ? PINK : MINT;
      p.poly([[x - 0.05 * a, y0], [x + 0.05 * a, y0], [x + 0.045 * a, y0 + L], [x - 0.045 * a, y0 + L]], col, 0);
      p.ell(x, y0 + L, 0.06 * a, 0.07 * a, col, Math.max(2.5, 0.025 * a));
      p.stroke([[x - 0.05 * a, y0 + 0.02 * a], [x - 0.05 * a, y0 + L]], Math.max(2.5, 0.025 * a));
      p.stroke([[x + 0.05 * a, y0 + 0.02 * a], [x + 0.05 * a, y0 + L]], Math.max(2.5, 0.025 * a));
    }
  });
};
const drawItem = (p: Pen, s: ItemS, a: number) => {
  switch (s.k) {
    case "cone": drawCone(p, s, a); break;
    case "spoon": local(p, 0, 0, s.tilt ?? 0, () => {
      p.poly(rrect(-0.05 * a, -0.2 * a, 0.05 * a, 0.55 * a, 0.04 * a), "#dfe6f0", 4);
      p.ell(0, -0.34 * a, 0.17 * a, 0.22 * a, "#eef3fa", 4.5);
      if (s.load > 0.05) scoop(p, 0, -0.42 * a, 0.17 * a * s.load, s.col ?? PINK, mix(s.col ?? PINK, "#7a3a6a", 0.3), 4);
    }); break;
    case "bowl": {
      const pts = [...thru([-0.5 * a, -0.1 * a], [0, 0.42 * a], [0.5 * a, -0.1 * a], 14)];
      scoop(p, -0.12 * a, -0.16 * a, 0.24 * a, s.fill ?? PINK, mix(s.fill ?? PINK, "#7a3a6a", 0.3), 7, 0, false);
      scoop(p, 0.16 * a, -0.14 * a, 0.22 * a, MINT, MINT_DK, 9, 0, true);
      p.poly(pts, s.col ?? "#ffd23a", 4.5);
      p.clip(pts, () => p.ell(0.25 * a, 0.25 * a, 0.5 * a, 0.3 * a, rgba(SHD, 0.2), 0));
      p.ell(0, -0.1 * a, 0.5 * a, 0.08 * a, mix(s.col ?? "#ffd23a", WHITE, 0.4), 4);
      break;
    }
    case "stopwatch": {
      const r = 0.36 * a, pr = s.press;
      p.poly(rrect(-0.07 * a, -r - 0.2 * a + 0.06 * a * pr, 0.07 * a, -r + 0.02 * a, 0.03 * a), "#c8ced8", 4);
      p.ell(0, -r - 0.22 * a + 0.06 * a * pr, 0.12 * a, 0.06 * a, "#ff4a4a", 4);
      p.ell(0, 0, r * 1.1, r * 1.1, "#ff6a3a", 5); p.ell(0, 0, r * 0.86, r * 0.86, WHITE, 4);
      for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; p.stroke([[Math.cos(an) * r * 0.72, Math.sin(an) * r * 0.72], [Math.cos(an) * r * 0.8, Math.sin(an) * r * 0.8]], 3); }
      const hand = -Math.PI / 2 + pr * 2.2; p.stroke([[0, 0], [Math.cos(hand) * r * 0.66, Math.sin(hand) * r * 0.66]], 5, "#ff3a4a"); p.dot(0, 0, 0.05 * a);
      break;
    }
    case "clipboard": local(p, 0, 0, s.tilt ?? 0, () => {
      const b = rrect(-0.5 * a, -0.85 * a, 0.5 * a, 0.45 * a, 0.06 * a);
      p.poly(b, "#c8884a", 5);
      p.poly(rrect(-0.42 * a, -0.74 * a, 0.42 * a, 0.38 * a, 0.02 * a), WHITE, 3.5);
      p.poly(rrect(-0.18 * a, -0.92 * a, 0.18 * a, -0.74 * a, 0.04 * a), "#9aa4b4", 4);
      // a tiny bar chart: FAST tall, SLOW short (the result)
      p.poly([[-0.3 * a, 0.25 * a], [-0.08 * a, 0.25 * a], [-0.08 * a, -0.45 * a], [-0.3 * a, -0.45 * a]], "#ff4a5a", 3);
      p.poly([[0.06 * a, 0.25 * a], [0.28 * a, 0.25 * a], [0.28 * a, -0.1 * a], [0.06 * a, -0.1 * a]], "#3a9aff", 3);
      p.stroke([[-0.36 * a, 0.27 * a], [0.36 * a, 0.27 * a]], 3);
    }); break;
    case "sign": local(p, 0, 0, s.tilt ?? 0, () => {
      p.poly(rrect(-0.05 * a, -0.2 * a, 0.05 * a, 0.5 * a, 0.03 * a), "#c8884a", 3.5);
      const b = rrect(-0.95 * a, -1.05 * a, 0.95 * a, -0.15 * a, 0.08 * a);
      p.poly(b, "#fffaf0", 5);
      letter(p, "0", -0.62 * a, -0.6 * a, 0.72 * a, "#ff3a4a", 0.1 * a, 0);
      letter(p, "PAIN", 0.2 * a, -0.8 * a, 0.36 * a, "#2a2a44", 0.05 * a, 0, 1.25 * a);
      letter(p, "SENSORS", 0.2 * a, -0.42 * a, 0.27 * a, "#2a2a44", 0.04 * a, 0, 1.25 * a);
    }); break;
    case "mug": p.poly(rrect(-0.26 * a, -0.3 * a, 0.26 * a, 0.3 * a, 0.06 * a), "#ffd23a", 4); p.ell(0.3 * a, 0, 0.12 * a, 0.16 * a, null, 6); break;
  }
};

// ======================================================================================================================
// FACES (local frame: head centre 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr =
  | "chomp" | "yum" | "ouch" | "lookup" | "aah" | "meme" | "eager" | "shovel" | "dainty" | "wince" | "fix" | "puff" | "think"
  | "stuffed" | "deadpan" | "proud" | "focus" | "alert" | "confused" | "angry" | "chill" | "shrug" | "gasp" | "smug" | "happy" | "worried";
type EyeK = "wide" | "tiny" | "bulge" | "half" | "lazy" | "happy" | "squint" | "shut" | "round" | "sparkle" | "blink" | "angry" | "wink";
type MouthK = "chomp" | "smile" | "grin" | "grit" | "aah" | "freeze" | "stuffed" | "lick" | "hmm" | "mmm" | "shout" | "flat" | "squiggle" | "gasp" | "ooh" | "smirk" | "wobble" | "frown";
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number; cheeks?: number }> = {
  chomp: { eye: ["happy", "happy"], brow: [[-6, -8], [-6, -8]], mouth: "chomp", blush: 0.5, cheeks: 0.55 },
  yum: { eye: ["happy", "happy"], brow: [[-6, -6], [-6, -6]], mouth: "grin", blush: 0.45 },
  ouch: { eye: ["shut", "shut"], brow: [[12, -6], [12, -6]], mouth: "grit" },
  lookup: { eye: ["round", "round"], brow: [[-14, -12], [-14, -12]], mouth: "ooh" },
  aah: { eye: ["happy", "happy"], brow: [[-12, -14], [-12, -14]], mouth: "aah", blush: 0.3 },
  meme: { eye: ["bulge", "bulge"], brow: [[-22, -27], [-22, -27]], mouth: "freeze" },
  eager: { eye: ["sparkle", "sparkle"], brow: [[-10, -10], [-10, -10]], mouth: "grin", blush: 0.4 },
  shovel: { eye: ["wide", "wide"], brow: [[6, -6], [6, -6]], mouth: "stuffed", cheeks: 0.7, blush: 0.3 },
  dainty: { eye: ["happy", "happy"], brow: [[-4, -9], [-4, -9]], mouth: "lick", blush: 0.4 },
  wince: { eye: ["shut", "shut"], brow: [[10, -4], [10, -4]], mouth: "wobble" },
  fix: { eye: ["half", "half"], brow: [[-16, -20], [-16, -20]], mouth: "smirk", blush: 0.3 },
  puff: { eye: ["happy", "happy"], brow: [[-3, 2], [-3, 2]], mouth: "mmm", blush: 0.8, cheeks: 1 },
  think: { eye: ["half", "round"], brow: [[6, 4], [-18, -22]], mouth: "hmm" },
  stuffed: { eye: ["wide", "wide"], brow: [[-12, -14], [-12, -14]], mouth: "stuffed", cheeks: 1.15, blush: 0.4 },
  deadpan: { eye: ["lazy", "lazy"], brow: [[3, 4], [3, 4]], mouth: "flat", cheeks: 0.7 },
  proud: { eye: ["happy", "happy"], brow: [[-9, -8], [-9, -8]], mouth: "grin", blush: 0.4 },
  focus: { eye: ["squint", "round"], brow: [[6, -2], [-10, -12]], mouth: "smirk" },
  alert: { eye: ["wide", "wide"], brow: [[-14, -16], [-14, -16]], mouth: "gasp" },
  confused: { eye: ["round", "round"], brow: [[5, 3], [-12, -16]], mouth: "squiggle" },
  angry: { eye: ["angry", "angry"], brow: [[14, -6], [14, -6]], mouth: "shout" },
  chill: { eye: ["happy", "happy"], brow: [[-4, -3], [-4, -3]], mouth: "smile", blush: 0.35 },
  shrug: { eye: ["half", "half"], brow: [[-14, -6], [-14, -6]], mouth: "smile", blush: 0.3 },
  gasp: { eye: ["tiny", "tiny"], brow: [[-15, -17], [-15, -17]], mouth: "gasp" },
  smug: { eye: ["half", "half"], brow: [[-10, -14], [-10, -14]], mouth: "smirk", blush: 0.3 },
  happy: { eye: ["round", "round"], brow: [[-10, -8], [-10, -8]], mouth: "smile", blush: 0.35 },
  worried: { eye: ["wide", "wide"], brow: [[-11, 3], [-11, 3]], mouth: "wobble" },
};
export type FaceS = { e: Expr; look?: P2; k?: number; shake?: number };
const eye = (p: Pen, kind: EyeK, x: number, y: number, u: number, side: number, look: P2, k: number, shake: number, skin: string) => {
  const lx = look[0], ly = look[1], j = (shake % 2 ? 0.7 : -0.7) * u;
  switch (kind) {
    case "wide": {
      p.ell(x, y - u, 11 * u, 13 * u, WHITE, 3.2 * u);
      const px = x + lx * 4.4 * u, py = y - u + ly * 5.5 * u;
      p.ell(px, py, 4 * u, 4.6 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.6 * u, 1.3 * u, WHITE);
      break;
    }
    case "tiny": p.ell(x, y - 2 * u, 13 * u, 14.5 * u, WHITE, 3.4 * u); p.dot(x + j * 0.5 + lx * 3.5 * u, y - 2 * u + ly * 3.5 * u, 2.6 * u); break;
    case "bulge": { // THE MEME FREEZE: huge popping eyes (bulge k), bloodshot, pin pupils, frost lashes
      const s = 1 + 0.5 * cl01(k), r = 17 * u * s, ox = side * 5 * u * s, cy = y - 7 * u * s;
      p.ell(x + ox, cy, r, r * 1.14, WHITE, 4 * u);
      for (let i = 0; i < 4; i++) { const a0 = rad((side > 0 ? 110 : 10) + 30 * i); p.stroke(thru([x + ox + Math.cos(a0) * r * 0.95, cy + Math.sin(a0) * r * 1.05], [x + ox + Math.cos(a0 + 0.2) * r * 0.72, cy + Math.sin(a0 + 0.2) * r * 0.8], [x + ox + Math.cos(a0) * r * 0.5, cy + Math.sin(a0) * r * 0.55], 6), 1.5 * u, "#ff4a5a"); }
      p.dot(x + ox + j * 0.6, cy + 1 * u, 3.4 * u);
      for (let i = 0; i < 3; i++) { const a0 = rad(-150 + i * 30 + (side > 0 ? 60 : 0)); p.stroke([[x + ox + Math.cos(a0) * r, cy + Math.sin(a0) * r * 1.14], [x + ox + Math.cos(a0) * r * 1.35, cy + Math.sin(a0) * r * 1.45]], 2.6 * u, "#9ae0ff"); }
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
    case "wink": p.arc(x, y + 2 * u, 9 * u, 5 * u, 200, 340, 4 * u); break;
    case "blink": p.stroke(thru([x - 9.5 * u, y], [x, y + 2 * u], [x + 9.5 * u, y], 8), 3.8 * u); break;
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const sh = shake % 2 ? 1 : -1;
  switch (kind) {
    case "chomp": { // a full, chomping closed mouth with an ice-cream smear
      const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 13 * u + i * 1.86 * u, my + 2 * u + 1.6 * u * Math.sin(i * 1.3)]);
      p.ell(mx + 6 * u, my + 4 * u, 9 * u, 4.5 * u, PINK, 2 * u, 0, 360, 10);
      p.stroke(s, 3.6 * u);
      break;
    }
    case "smile": { const pts = [...thru([mx - 11 * u, my - 2 * u], [mx, my - 1 * u], [mx + 11 * u, my - 2 * u], 8), ...thru([mx + 11 * u, my - 2 * u], [mx, my + 9 * u], [mx - 11 * u, my - 2 * u], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 7 * u, 6 * u, 3.5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); break; }
    case "grin": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2.5 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 13 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 10 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 8 * u], [mx + 16 * u, my - 8 * u], [mx + 16 * u, my], [mx - 16 * u, my]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
    case "grit": { const pts = rrect(mx - 13 * u, my - 4.5 * u, mx + 13 * u, my + 5 * u, 3.5 * u); p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 12 * u, my + 0.3 * u], [mx + 12 * u, my + 0.3 * u]], 1.4 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.6 * u, my - 4 * u], [mx + i * 4.6 * u, my + 4.5 * u]], 1.2 * u); break; }
    case "aah": { // the dive target: a HUGE open mouth (k 0..1 opens), uvula + tongue, a peek at the palate ridges
      const w = (10 + 14 * k) * u, h = (6 + 26 * k) * u, top = my - 6 * u;
      const pts = ellPts(mx, top + h / 2, w, h / 2, 40);
      p.poly(pts, "#4a0c1c", 0);
      p.clip(pts, () => {
        p.ell(mx, top - h * 0.05, w * 0.9, h * 0.42, "#c8455e", 0);
        for (let i = 0; i < 3; i++) p.arc(mx, top + h * 0.05 + i * 0.07 * h, w * (0.6 - 0.1 * i), h * 0.12, 20, 160, 1.2 * u, rgba("#7a1830", 0.7));
        p.poly([[mx - w, top - 2 * u], [mx + w, top - 2 * u], [mx + w, top + 4 * u], [mx - w, top + 4 * u]], WHITE, 1.2 * u);
        p.ell(mx, top + h * 0.3, 2.6 * u, 4.4 * u, "#ff5a78", 0); p.dot(mx, top + h * 0.38, 2.8 * u, "#ff5a78");
        p.ell(mx, top + h * 0.98, w * 0.78, h * 0.32, TONGUE, 2 * u);
        p.stroke([[mx, top + h * 0.75], [mx, top + h * 0.92]], 1.4 * u, rgba("#b0304a", 0.8));
      });
      p.poly(pts, null, 3.4 * u);
      break;
    }
    case "freeze": { // FROZEN SCREAM: a huge wobbling scream, icicles hanging from the top teeth, frosty blue tongue
      const w = 21 * u, h = (31 + 9 * cl01(k)) * u, top = my - 8 * u;
      const pts: P2[] = [];
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2, r = 1 + 0.06 * Math.sin(a * 5 + sh); pts.push([mx + Math.cos(a) * w * r, top + h / 2 + Math.sin(a) * h / 2 * r]); }
      p.poly(pts, "#2a1846", 0);
      p.clip(pts, () => {
        p.ell(mx + 2 * u * sh, top + h * 0.92, w * 0.75, h * 0.32, "#9ad8ff", 2 * u);
        p.poly([[mx - w, top - 2 * u], [mx + w, top - 2 * u], [mx + w, top + 6 * u], [mx - w, top + 6 * u]], WHITE, 1.4 * u);
        p.poly([[mx - w, top + h - 5 * u], [mx + w, top + h - 5 * u], [mx + w, top + h + 3 * u], [mx - w, top + h + 3 * u]], WHITE, 1.4 * u);
        for (let i = -2; i <= 2; i++) { const x0 = mx + i * 7 * u, L = (8 + 5 * ((i + 5) % 3)) * u; p.poly([[x0 - 2.6 * u, top + 5 * u], [x0 + 2.6 * u, top + 5 * u], [x0, top + 5 * u + L]], "#d8f4ff", 1.2 * u); }
      });
      p.poly(pts, null, 3.8 * u);
      break;
    }
    case "stuffed": { // mouth full: a tight wavy line, a dab of ice cream at the corner
      const s: P2[] = []; for (let i = 0; i <= 10; i++) s.push([mx - 7 * u + i * 1.4 * u, my + 3 * u + 1.2 * u * Math.sin(i * 1.7 + sh)]);
      p.stroke(s, 3.4 * u); p.ell(mx + 9 * u, my + 4 * u, 3.6 * u, 3 * u, PINK, 1.6 * u);
      break;
    }
    case "lick": { // tiny dainty lick: small o with the tongue tip out
      p.ell(mx + 2 * u, my + 3 * u, 4 * u, 3.6 * u, MOUTH, 2.4 * u);
      p.ell(mx + 3 * u, my + 7 * u, 3.4 * u, 3.6 * u, TONGUE, 2 * u);
      break;
    }
    case "hmm": p.stroke(thru([mx - 9 * u, my + 3 * u], [mx, my + 1.5 * u], [mx + 7 * u, my - 0.5 * u], 8), 3.4 * u); p.stroke([[mx + 7 * u, my - 0.5 * u], [mx + 9.5 * u, my + 1.5 * u]], 2.4 * u); break;
    case "mmm": p.stroke(thru([mx - 6 * u, my + 3 * u], [mx, my + 5.5 * u], [mx + 6 * u, my + 3 * u], 8), 3.2 * u); break;
    case "shout": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 6 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 17 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 13 * u, 9 * u, 4.5 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 9 * u], [mx + 16 * u, my - 9 * u], [mx + 16 * u, my - 1 * u], [mx - 16 * u, my - 1 * u]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.3 * u); break; }
    case "flat": p.stroke([[mx - 8 * u, my + u], [mx + 8 * u, my + 1.6 * u]], 3.4 * u); break;
    case "squiggle": { const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 9 * u + i * 1.4 * u, my + 2.4 * u * Math.sin(i * 0.95) - i * 0.25 * u]); p.stroke(s, 3.4 * u); break; }
    case "gasp": { const pts = ellPts(mx, my + 2 * u, 7 * u, 10 * u, 30); p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 10 * u, 6 * u, 4 * u, TONGUE, 0)); p.poly(pts, null, 3.2 * u); break; }
    case "ooh": p.ell(mx, my + 1.5 * u, 5.4 * u, 7 * u, MOUTH, 3 * u); p.ell(mx, my + 5 * u, 3.2 * u, 2.2 * u, TONGUE, 0); break;
    case "smirk": p.stroke(thru([mx - 10 * u, my + 2 * u], [mx, my + 2.4 * u], [mx + 10 * u, my - 4 * u], 8), 3.8 * u); p.stroke([[mx + 10 * u, my - 4 * u], [mx + 12.5 * u, my - 1.5 * u]], 2.4 * u); break;
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 10 * u + i * 1.65 * u, my + 2 * u + 1.7 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9) - 2.5 * u * Math.sin((i / 12) * Math.PI)]); p.stroke(s, 3.4 * u); break; }
    case "frown": p.arc(mx, my + 5 * u, 8 * u, 4.4 * u, 205, 335, 3.4 * u); break;
  }
};
export type FaceOpt = { glasses?: string; goggles?: boolean; moustache?: string; nose?: string; frozen?: number; noBrow?: boolean };
export const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: FaceOpt = {}) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0;
  const ex = 0.37 * a, ey = -0.05 * a;
  if (D.blush) for (const s of [-1, 1]) glow(p, s * 0.6 * a, 0.3 * a, 0.27 * a, BLUSH, 0.55 * D.blush);
  if (D.cheeks) for (const s of [-1, 1]) { // puffed cheeks bulge past the head outline
    const c = D.cheeks, cx = s * (0.62 + 0.1 * c) * a, cy = 0.36 * a, r = (0.22 + 0.14 * c) * a;
    p.ell(cx, cy, r, r * 0.92, skin, 0);
    p.arc(cx, cy, r, r * 0.92, s > 0 ? -70 : 110, s > 0 ? 70 : 250, 2.8 * u);
    glow(p, cx, cy + 0.05 * a, r * 0.8, BLUSH, 0.45);
  }
  for (const s of [-1, 1]) {
    const x = s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "half", "lazy", "sparkle", "squint", "angry"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round" || ek === "sparkle")) ek = "half";
    eye(p, ek, x, ey, u, s, look, k, shake, skin);
    if (opt.noBrow) continue;
    const bw = D.brow[s < 0 ? 0 : 1], big = ek === "tiny" || ek === "wide" || ek === "bulge";
    const by = ey - (big ? 23 : 18) * u - (ek === "bulge" ? 9 * u * k : 0) - (opt.goggles ? 5 * u : 0);
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 9 * u, by + bw[1] * u];
    tapered(p, b0, b1, 6 * u, 3.4 * u, INK);
  }
  if (opt.glasses) for (const s of [-1, 1]) { p.ell(s * ex, ey - u, 15 * u, 13 * u, rgba(WHITE, 0.18), 2.6 * u); p.stroke(thru([s * ex - 9 * u, ey - 8 * u], [s * ex - 4 * u, ey - 10 * u], [s * ex + 2 * u, ey - 9 * u], 5), 2 * u, rgba(WHITE, 0.8)); }
  if (opt.glasses) { p.stroke(thru([-ex + 15 * u, ey - 3 * u], [0, ey - 6 * u], [ex - 15 * u, ey - 3 * u], 6), 2.6 * u); }
  if (opt.goggles) {
    for (const s of [-1, 1]) {
      const pts = ellPts(s * ex, ey - u, 17 * u, 15 * u, 36);
      p.clip(pts, () => p.ell(s * ex, ey - u, 17 * u, 15 * u, rgba("#9ae8ff", 0.25), 0));
      p.ell(s * ex, ey - u, 17 * u, 15 * u, null, 5 * u); p.ell(s * ex, ey - u, 17 * u, 15 * u, null, 2.6 * u);
      p.stroke(ellPts(s * ex, ey - u, 17 * u, 15 * u, 36).concat([ellPts(s * ex, ey - u, 17 * u, 15 * u, 36)[0]]), 3 * u, "#7ad0ff");
      p.stroke(thru([s * ex - 10 * u, ey - 8 * u], [s * ex - 4 * u, ey - 12 * u], [s * ex + 3 * u, ey - 11 * u], 5), 2.6 * u, rgba(WHITE, 0.9));
    }
    p.stroke([[-ex + 17 * u, ey - u], [ex - 17 * u, ey - u]], 4 * u, "#7ad0ff");
  }
  const nb = opt.nose ?? mul(skin, [0.97, 0.86, 0.85]);
  p.ell(0, 0.17 * a, 6.6 * u, 5.4 * u, nb, 2.2 * u);
  p.dot(-2 * u, 0.14 * a - 1.4 * u, 1.5 * u, "rgba(255,255,255,0.8)");
  if (opt.moustache) for (const s of [-1, 1]) { const pts = [...thru([0, 0.27 * a], [s * 9 * u, 0.24 * a], [s * 17 * u, 0.33 * a], 8), ...thru([s * 17 * u, 0.33 * a], [s * 8 * u, 0.36 * a], [0, 0.31 * a], 8).slice(1)]; p.poly(pts, opt.moustache, 2.2 * u); }
  mouth(p, D.mouth, 0, 0.45 * a + (opt.moustache ? 2 * u : 0), u, k, shake);
};

// ======================================================================================================================
// PEOPLE (upright 600 x 1000 card; soles / floor at y 975)
// ======================================================================================================================
export const SKIN_B = "#ffdcc0";
export type HairK = "bean" | "pigtails" | "bob" | "spiky" | "afro" | "bun" | "dad" | "cap";
export type Look = { skin: string; hair: HairK; hairCol: string; top: string; topDk: string; bottom: string; shoes: string; print?: "cone" | "star" | "stripe" | "bolt" | "none"; coat?: boolean; vest?: string; glasses?: string; goggles?: boolean; moustache?: string; nose?: string; cap?: string };
export type ArmS = { sh: P2; w: P2; bend: number; hand?: HandK; hang?: number; hk?: number; back?: boolean; thick?: number; sleeve?: number; mirror?: boolean; item?: ItemS; itemAt?: P2; glove?: string };
export type LegS = { hip: P2; foot: P2; bend: number };
export type PersonS = {
  look: Look; head: P2; a: number; tilt: number; face: FaceS; lid: number; seed?: number;
  body: P2; rx: number; ry: number; rot?: number; arms: ArmS[]; legs: LegS[];
  /** seated on a stool (seat height canvas y) */ stool?: number;
  /** 0..1 blue frost creeping down from the crown */ frost?: number;
  /** 0..1: the whole body frozen (blue tint + frost) */ frozen?: number;
  /** icicle hair 0..1+ (the meme freeze peak) */ ice?: number;
  /** the head-top LID: 0..1 open (angle), brain: 0..1 pops out, shrug 0..1; brainFace */ cap?: number; brain?: number; shrug?: number; brainE?: Expr;
};
const BLUE_SKIN = "#cfeaff";
const hairBack = (p: Pen, s: PersonS, a: number) => {
  const L = s.look, col = L.hairCol;
  if ((s.ice ?? 0) > 0.02) { // icicle hair: every hair freezes straight up into ice spikes
    const k = s.ice!, n = 13;
    for (let i = 0; i < n; i++) {
      const ang = rad(-180 - 6 + (192 * i) / (n - 1)), Ln = a * (0.3 + 0.6 * k * (0.7 + 0.5 * rnd(7, i))), w = 0.15 * a;
      const B: P2 = [Math.cos(ang) * a * 0.8, Math.sin(ang) * a * 0.76 - 0.05 * a], T: P2 = [Math.cos(ang) * (a * 0.8 + Ln), Math.sin(ang) * (a * 0.76 + Ln) - 0.05 * a];
      const nn: P2 = [-Math.sin(ang) * w, Math.cos(ang) * w];
      const pts: P2[] = [[B[0] + nn[0], B[1] + nn[1]], T, [B[0] - nn[0], B[1] - nn[1]]];
      p.poly(pts, i % 2 ? "#dff6ff" : "#a8e4ff", 4.6);
      p.stroke([[B[0] + nn[0] * 0.3, B[1] + nn[1] * 0.3], [T[0] * 0.7 + B[0] * 0.3, T[1] * 0.7 + B[1] * 0.3]], Math.max(2, 0.03 * a), rgba(WHITE, 0.9));
    }
    return;
  }
  if (L.hair === "afro") { const pts = puffPts(0, -0.25 * a, 1.25 * a, 1.0 * a, 11, 5); p.gradFill(pts, col, mul(col, SH_HAIR), -2.2, 0.3); p.poly(pts, null, 5); }
  if (L.hair === "pigtails") for (const sd of [-1, 1]) {
    const B: P2 = [sd * 0.95 * a, -0.35 * a], T: P2 = [sd * 1.45 * a, 0.25 * a];
    const pts = [...thru(B, [sd * 1.5 * a, -0.45 * a], T, 10), ...thru(T, [sd * 1.05 * a, 0.05 * a], B, 10).slice(1)];
    p.poly(pts, col, 5);
    p.ell(sd * 0.98 * a, -0.4 * a, 0.14 * a, 0.14 * a, "#ff4a8a", 4.4);
  }
  if (L.hair === "bob") { const pts = [...thru([-1.08 * a, 0.35 * a], [-1.25 * a, -0.9 * a], [0, -1.12 * a], 12), ...thru([0, -1.12 * a], [1.25 * a, -0.9 * a], [1.08 * a, 0.35 * a], 12).slice(1)]; p.poly(pts, mul(col, [0.85, 0.85, 0.9]), 5); }
  if (L.hair === "bun") { p.ell(0.1 * a, -1.12 * a, 0.36 * a, 0.3 * a, col, 5); p.ell(0.0 * a, -1.0 * a, 0.2 * a, 0.08 * a, "#ffd23a", 3.5); }
};
const hairFront = (p: Pen, s: PersonS, a: number, light: number) => {
  const L = s.look, col = L.hairCol, hd = mul(col, SH_HAIR);
  if ((s.ice ?? 0) > 0.02) { // a frost cap + hanging icicles
    const pts = puffPts(0, -0.86 * a, 0.86 * a, 0.3 * a, 10, 19);
    p.poly(pts, "#f4fbff", 0); p.clip(pts, () => p.ell(0.25 * a, -0.74 * a, 0.9 * a, 0.2 * a, "#bfe2ff", 0)); p.poly(pts, null, 4.4);
    for (let i = 0; i < 6; i++) { const x = (-0.66 + i * 0.26) * a, l = (0.16 + 0.12 * rnd(31, i)) * a * cl01(s.ice!); p.poly([[x - 0.05 * a, -0.62 * a], [x + 0.05 * a, -0.62 * a], [x, -0.62 * a + l]], "#dff6ff", 3); }
    return;
  }
  const cap = (pts: P2[]) => { p.gradFill(pts, col, hd, light, 0.3); p.poly(pts, null, 5); };
  switch (L.hair) {
    case "bean": case "pigtails": case "bun": {
      cap([...thru([-0.99 * a, -0.05 * a], [-0.78 * a, -0.86 * a], [0.02 * a, -1.02 * a], 10), ...thru([0.02 * a, -1.02 * a], [0.78 * a, -0.86 * a], [0.99 * a, -0.1 * a], 10).slice(1),
        ...thru([0.99 * a, -0.1 * a], [0.85 * a, -0.45 * a], [0.55 * a, -0.5 * a], 6).slice(1), ...thru([0.55 * a, -0.5 * a], [0.05 * a, -0.32 * a], [-0.45 * a, -0.42 * a], 10).slice(1),
        ...thru([-0.45 * a, -0.42 * a], [-0.8 * a, -0.3 * a], [-0.99 * a, -0.05 * a], 6).slice(1)]);
      p.stroke(thru([0.12 * a, -0.9 * a], [0.42 * a, -0.82 * a], [0.66 * a, -0.6 * a], 6), 0.05 * a, rgba(WHITE, 0.5));
      if (L.hair === "bean") { const cw = thru([-0.08 * a, -0.98 * a], [-0.22 * a, -1.28 * a], [0.22 * a, -1.36 * a], 8); p.stroke(cw, 0.13 * a + 10, INK); p.stroke(cw, 0.13 * a, col); }
      break;
    }
    case "bob": cap([...thru([-1.0 * a, 0.1 * a], [-0.9 * a, -0.95 * a], [0, -1.05 * a], 10), ...thru([0, -1.05 * a], [0.9 * a, -0.95 * a], [1.0 * a, 0.1 * a], 10).slice(1), ...thru([1.0 * a, 0.1 * a], [0.85 * a, -0.4 * a], [0.6 * a, -0.42 * a], 6).slice(1), [-0.6 * a, -0.42 * a], ...thru([-0.6 * a, -0.42 * a], [-0.85 * a, -0.4 * a], [-1.0 * a, 0.1 * a], 6).slice(1)]); break;
    case "spiky": {
      const pts: P2[] = [[-0.98 * a, -0.1 * a]];
      for (let i = 0; i <= 8; i++) { const an = rad(-175 + i * 21.25); pts.push([Math.cos(an) * a * 0.92, Math.sin(an) * a * 0.86]); if (i < 8) { const am = rad(-175 + (i + 0.5) * 21.25); pts.push([Math.cos(am) * a * 1.32, Math.sin(am) * a * 1.3]); } }
      pts.push([0.98 * a, -0.1 * a], [0.5 * a, -0.48 * a], [-0.5 * a, -0.48 * a]);
      cap(pts); break;
    }
    case "afro": cap([...thru([-0.95 * a, -0.2 * a], [-0.6 * a, -1.0 * a], [0.6 * a, -1.0 * a], 12).slice(0), [0.95 * a, -0.2 * a], ...thru([0.95 * a, -0.2 * a], [0.4 * a, -0.5 * a], [-0.95 * a, -0.2 * a], 10).slice(1)]); break;
    case "dad": { // receding: a shiny dome with side tufts
      for (const sd of [-1, 1]) { const pts = puffPts(sd * 0.9 * a, -0.25 * a, 0.22 * a, 0.35 * a, 6, 3 + sd); p.poly(pts, col, 4.4); }
      p.stroke(thru([-0.55 * a, -0.7 * a], [-0.25 * a, -0.88 * a], [0.12 * a, -0.9 * a], 8), 0.07 * a, rgba(WHITE, 0.7));
      p.stroke(thru([-0.1 * a, -0.92 * a], [0.05 * a, -1.1 * a], [0.2 * a, -1.06 * a], 6), 5, col);
      break;
    }
    case "cap": {
      const c = L.cap ?? "#3a6aff";
      const dome = [...thru([-0.98 * a, -0.25 * a], [-0.7 * a, -1.05 * a], [0.1 * a, -1.05 * a], 10), ...thru([0.1 * a, -1.05 * a], [0.8 * a, -0.95 * a], [0.98 * a, -0.25 * a], 10).slice(1)];
      p.gradFill(dome, c, mul(c, SH_HAIR), light, 0.3); p.poly(dome, null, 5);
      p.poly([[-0.98 * a, -0.25 * a], [0.98 * a, -0.25 * a], [1.35 * a, -0.12 * a], [-0.2 * a, -0.15 * a]], mul(c, [0.8, 0.8, 0.85]), 5);
      p.ell(0, -1.05 * a, 0.1 * a, 0.06 * a, WHITE, 3);
      break;
    }
  }
};
const armDraw = (p: Pen, A: ArmS, skin: string, sleeveCol: string | null, a: number) => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const pts = thru(A.sh, M, A.w, 14), w = A.thick ?? 40;
  const ang = Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), hk = A.hk ?? 0.36;
  const palm: P2 = [A.w[0] + Math.sin(ang) * HAND_WRIST * 0.8 * hk, A.w[1] - Math.cos(ang) * HAND_WRIST * 0.8 * hk];
  const hand = () => { if (A.hand) local(p, A.w[0], A.w[1], ang, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => drawHand(p, A.hand!, A.glove ?? skin, A.mirror)), hk); };
  const item = () => { if (A.item) { const at = A.itemAt ?? [0, 0]; local(p, palm[0] + at[0], palm[1] + at[1], 0, () => drawItem(p, A.item!, a)); } };
  const behind = A.item && (A.item.k === "cone" || A.item.k === "spoon" || A.item.k === "stopwatch" || A.item.k === "sign" || A.item.k === "mug");
  if (behind) item();
  limb(p, pts, skin, w, 5);
  if (sleeveCol && (A.sleeve ?? 0) > 0) {
    const m = Math.max(2, Math.round(14 * (A.sleeve ?? 0))), sp = pts.slice(0, m + 1);
    limb(p, sp, sleeveCol, w + 16, 5);
    const E = sp[sp.length - 1], P0 = sp[sp.length - 2], an = Math.atan2(E[1] - P0[1], E[0] - P0[0]);
    p.stroke([[E[0] - Math.sin(an) * (w + 12) / 2, E[1] + Math.cos(an) * (w + 12) / 2], [E[0] + Math.sin(an) * (w + 12) / 2, E[1] - Math.cos(an) * (w + 12) / 2]], 4, rgba(INK, 0.5));
  }
  hand();
  if (A.item && !behind) item();
};
/** in-card palm (canvas) of an arm */
export const palmOf = (A: ArmS): P2 => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const ang = Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), r = HAND_WRIST * 0.8 * (A.hk ?? 0.36);
  return [A.w[0] + Math.sin(ang) * r, A.w[1] - Math.cos(ang) * r];
};
const printDraw = (p: Pen, kind: string, sx: number, sy: number, r: number) => {
  switch (kind) {
    case "cone": // a tiny smiling ice-cream cone
      p.poly([[sx - 0.55 * r, sy], [sx + 0.55 * r, sy], [sx, sy + 1.3 * r]], CONE, 4);
      p.ell(sx, sy - 0.25 * r, 0.62 * r, 0.55 * r, PINK, 4);
      p.dot(sx - 0.2 * r, sy - 0.3 * r, 0.07 * r); p.dot(sx + 0.2 * r, sy - 0.3 * r, 0.07 * r); p.arc(sx, sy - 0.18 * r, 0.18 * r, 0.12 * r, 20, 160, 3);
      break;
    case "star": p.poly(starPts(sx, sy, 0.75 * r, 5, 0.48), "#ffe14a", 4); break;
    case "bolt": p.poly([[sx - 0.2 * r, sy - 0.8 * r], [sx + 0.45 * r, sy - 0.8 * r], [sx + 0.05 * r, sy - 0.1 * r], [sx + 0.4 * r, sy - 0.1 * r], [sx - 0.35 * r, sy + 0.9 * r], [sx - 0.05 * r, sy + 0.1 * r], [sx - 0.4 * r, sy + 0.1 * r]], "#ffe14a", 4); break;
  }
};
const torsoDraw = (p: Pen, s: PersonS, light: number) => {
  const L = s.look;
  const pts = blobPts(s.body[0], s.body[1], { a: s.rx, b: s.ry, nTop: 2.1, nBot: 2.7, egg: 0.1, asym: 0, rot: s.rot ?? 0, noise: 0.01, seed: 26 }, 56);
  const thick = thickAngle(light), c = s.body;
  p.shadedFill(pts, L.top, L.topDk, light, s.rx, 0.4);
  p.clip(pts, () => {
    if (L.print === "stripe") for (let i = 0; i < 4; i++) p.poly(rrect(c[0] - 2 * s.rx, c[1] - 0.55 * s.ry + i * 0.4 * s.ry, c[0] + 2 * s.rx, c[1] - 0.4 * s.ry + i * 0.4 * s.ry, 2), rgba(WHITE, 0.75), 0);
    else if (L.print && L.print !== "none") printDraw(p, L.print, c[0] + 4, c[1] - 0.18 * s.ry, 0.3 * s.rx);
    if (L.vest) { // dad: a sweater vest (V-neck) over the shirt + a tie
      const v = [[c[0] - 2 * s.rx, c[1] - 0.55 * s.ry], [c[0] - 0.42 * s.rx, c[1] - 0.95 * s.ry], [c[0], c[1] - 0.15 * s.ry], [c[0] + 0.42 * s.rx, c[1] - 0.95 * s.ry], [c[0] + 2 * s.rx, c[1] - 0.55 * s.ry], [c[0] + 2 * s.rx, c[1] + 2 * s.ry], [c[0] - 2 * s.rx, c[1] + 2 * s.ry]] as P2[];
      p.poly([[c[0] - 0.07 * s.rx, c[1] - 0.9 * s.ry], [c[0] + 0.07 * s.rx, c[1] - 0.9 * s.ry], [c[0] + 0.12 * s.rx, c[1] - 0.1 * s.ry], [c[0], c[1] + 0.02 * s.ry], [c[0] - 0.12 * s.rx, c[1] - 0.1 * s.ry]], "#d83a4a", 3.5);
      p.poly(v, L.vest, 4.5);
      for (let i = -2; i <= 2; i++) for (let j = 0; j < 3; j++) p.poly([[c[0] + i * 0.45 * s.rx, c[1] + j * 0.4 * s.ry - 0.1 * s.ry], [c[0] + i * 0.45 * s.rx + 0.12 * s.rx, c[1] + j * 0.4 * s.ry + 0.08 * s.ry], [c[0] + i * 0.45 * s.rx, c[1] + j * 0.4 * s.ry + 0.26 * s.ry], [c[0] + i * 0.45 * s.rx - 0.12 * s.rx, c[1] + j * 0.4 * s.ry + 0.08 * s.ry]], rgba(WHITE, 0.25), 0);
    }
    if (L.coat) { // lab coat: open white coat over the tee, lapels, a pocket with pens
      for (const sd of [-1, 1]) {
        const pts2: P2[] = [[c[0] + sd * 2 * s.rx, c[1] - 1.2 * s.ry], [c[0] + sd * 0.3 * s.rx, c[1] - 1.05 * s.ry], [c[0] + sd * 0.42 * s.rx, c[1] - 0.25 * s.ry], [c[0] + sd * 0.36 * s.rx, c[1] + 2 * s.ry], [c[0] + sd * 2 * s.rx, c[1] + 2 * s.ry]];
        p.poly(pts2, "#fbfdff", 4.5);
        p.poly([[c[0] + sd * 0.3 * s.rx, c[1] - 1.05 * s.ry], [c[0] + sd * 0.62 * s.rx, c[1] - 0.7 * s.ry], [c[0] + sd * 0.42 * s.rx, c[1] - 0.25 * s.ry]], "#e4ecf6", 3.5);
      }
      p.poly(rrect(c[0] + 0.5 * s.rx, c[1] - 0.25 * s.ry, c[0] + 0.85 * s.rx, c[1] + 0.05 * s.ry, 4), "#eef3fa", 3);
      p.stroke([[c[0] + 0.6 * s.rx, c[1] - 0.25 * s.ry], [c[0] + 0.6 * s.rx, c[1] - 0.45 * s.ry]], 7, "#3a7aff");
      p.stroke([[c[0] + 0.72 * s.rx, c[1] - 0.25 * s.ry], [c[0] + 0.74 * s.rx, c[1] - 0.42 * s.ry]], 7, "#ff4a5a");
    }
    if (!L.vest && !L.coat) p.ell(c[0], c[1] - s.ry * 1.0, 0.36 * s.rx, 0.16 * s.ry, L.topDk, 4);
    p.poly([[c[0] - 2 * s.rx, c[1] + 0.9 * s.ry], [c[0] + 2 * s.rx, c[1] + 0.9 * s.ry], [c[0] + 2 * s.rx, c[1] + 2 * s.ry], [c[0] - 2 * s.rx, c[1] + 2 * s.ry]], rgba(INK, 0.12), 0);
  });
  p.inkRing(pts, 5, thick, 0.4);
};
const legsDraw = (p: Pen, s: PersonS, skin: string, a: number) => {
  const L = s.look;
  if (s.stool !== undefined) { const y = s.stool; p.poly(rrect(s.body[0] - 0.95 * a, y, s.body[0] + 0.95 * a, y + 0.16 * a, 0.05 * a), "#c8884a", 4.4); for (const sd of [-1, 1]) p.poly(rrect(s.body[0] + sd * 0.75 * a - 0.06 * a, y + 0.16 * a, s.body[0] + sd * 0.75 * a + 0.06 * a, 960, 0.03 * a), "#9a6436", 4); }
  const shorts = !L.coat && !L.vest;
  for (const Lg of s.legs) {
    const d = Math.hypot(Lg.foot[0] - Lg.hip[0], Lg.foot[1] - Lg.hip[1]) || 1, nx = -(Lg.foot[1] - Lg.hip[1]) / d, ny = (Lg.foot[0] - Lg.hip[0]) / d;
    const pts = thru(Lg.hip, [(Lg.hip[0] + Lg.foot[0]) / 2 + nx * Lg.bend, (Lg.hip[1] + Lg.foot[1]) / 2 + ny * Lg.bend], Lg.foot, 12);
    const out = Lg.foot[0] > s.body[0] ? 1 : -1;
    if (shorts) { limb(p, pts, skin, 0.42 * a, 5); limb(p, pts.slice(0, 6), L.bottom, 0.6 * a, 5); }
    else limb(p, pts, L.bottom, 0.5 * a, 5);
    const fx = Lg.foot[0] + out * 10, fy = Lg.foot[1] + 4;
    p.ell(fx, fy, 0.38 * a, 0.18 * a, L.shoes, 5);
    p.stroke([[fx - 0.34 * a, fy + 0.1 * a], [fx + 0.34 * a, fy + 0.1 * a]], 0.07 * a, WHITE);
  }
};
/** the head-top LID cut (canvas y in head frame) and its hinge (screen-right) */
const LID_Y = -0.58;
export const drawPerson = (p: Pen, s: PersonS, light: number) => {
  const olS = p.ol; p.ol = 5;
  const a = s.a, L = s.look, fz = s.frozen ?? 0, skin = fz > 0.5 ? BLUE_SKIN : L.skin, seed = s.seed ?? 23;
  legsDraw(p, s, skin, a);
  for (const A of s.arms) if (A.back) armDraw(p, A, skin, L.coat ? "#fbfdff" : L.top, a);
  torsoDraw(p, s, light);
  p.poly(rrect(s.head[0] - 0.25 * a, s.head[1] + 0.55 * a, s.head[0] + 0.25 * a, s.body[1] - s.ry + 14, 12), skin, 0);
  local(p, s.head[0], s.head[1], s.tilt, () => {
    const lt = light - s.tilt, lidK = s.cap ?? 0, cut = LID_Y * a;
    hairBack(p, s, a);
    const hp = blobPts(0, 0, headBlob(seed, a, 0));
    const skull = () => {
      p.shadedFill(hp, skin, mul(skin, SH_SKIN), lt, a, 0.4);
      if ((s.frost ?? 0) > 0.01 || fz > 0.01) p.clip(hp, () => frostCap(p, a, Math.max(s.frost ?? 0, fz), seed));
      p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
    };
    if (lidK < 0.005) {
      skull();
      face(p, s.face, a, skin, s.lid, { glasses: L.glasses, goggles: L.goggles, moustache: L.moustache, nose: L.nose, frozen: fz });
      hairFront(p, s, a, lt);
    } else {
      const below: P2[] = [[-2 * a, cut], [2 * a, cut], [2 * a, 2 * a], [-2 * a, 2 * a]], above: P2[] = [[-2 * a, -3 * a], [2 * a, -3 * a], [2 * a, cut], [-2 * a, cut]];
      p.clip(below, skull);
      face(p, s.face, a, skin, 0, { glasses: L.glasses, goggles: L.goggles, moustache: L.moustache, nose: L.nose, frozen: fz });
      // the open skull: a dark pink rim; the BRAIN rises out of it
      const ow = 0.82 * a, oh = 0.2 * a * Math.min(1, lidK * 1.5);
      p.ell(0, cut, ow, oh, "#8a2a4a", 4);
      p.clip(ellPts(0, cut, ow, oh, 40), () => p.ell(0, cut + oh * 0.4, ow * 0.9, oh * 0.8, "#5a1430", 0));
      const bk = s.brain ?? 0;
      if (bk > 0.01) {
        const by = cut + 0.5 * a - bk * 0.95 * a;
        p.clip([[-3 * a, -4 * a], [3 * a, -4 * a], [3 * a, cut], [ow, cut], ...ellPts(0, cut, ow, oh, 40, 0).filter((q) => q[1] >= cut).sort((m, n) => n[0] - m[0]), [-ow, cut], [-3 * a, cut]], () => {
          drawBrainBody(p, { cx: 0, cy: by, r: 0.62 * a, face: { e: s.brainE ?? "shrug", look: [0, 0] }, lid: 0, shrug: s.shrug ?? 0, sign: s.shrug ?? 0, light: lt });
        });
        p.arc(0, cut, ow, oh, 0, 180, 5); // the front rim over the brain's bottom
      }
      // the lid: the crown + hair swing open about the hinge at the screen-right end of the cut
      const hx = 0.86 * a, th = lidK * 1.55;
      local(p, hx, cut, th, () => local(p, -hx, -cut, 0, () => {
        p.clip(above, skull);
        p.ell(0, cut, ow * 0.98, oh * 0.8, "#ffb0b8", 3.5); // underside of the lid
        hairFront(p, s, a, lt);
      }));
    }
  });
  for (const A of s.arms) if (!A.back) armDraw(p, A, skin, L.coat ? "#fbfdff" : L.top, a);
  if (fz > 0.01) frostBody(p, s, fz);
  p.ol = olS;
};
/** blue frost creeping down the head from the crown (k 0..1 reaches the brows), crystals + a jagged edge */
const frostCap = (p: Pen, a: number, k: number, seed: number) => {
  const edge = -a * 1.05 + k * 0.95 * a, pts: P2[] = [[-1.3 * a, -1.3 * a], [1.3 * a, -1.3 * a]];
  for (let i = 0; i <= 16; i++) { const x = 1.3 * a - (i / 16) * 2.6 * a; pts.push([x, edge + (i % 2 ? 0.1 : -0.04) * a * (0.6 + 0.8 * rnd(seed, i))]); }
  const g = p.g, gr = g.createLinearGradient(0, -a, 0, edge + 0.1 * a);
  gr.addColorStop(0, rgba("#6ac8ff", 0.85)); gr.addColorStop(1, rgba("#bfeaff", 0.75));
  p.path(pts, true); g.fillStyle = gr; g.fill();
  p.stroke(pts.slice(2), Math.max(2.5, 0.035 * a), "#f4fcff");
  for (let i = 0; i < 9; i++) {
    const x = (rnd(seed + 5, i) - 0.5) * 1.6 * a, y = -a + (edge + a) * rnd(seed + 7, i);
    if (y > edge - 0.05 * a) continue;
    crystal(p, x, y, (0.08 + 0.06 * rnd(seed, i + 30)) * a, rnd(seed, i + 40));
  }
};
const crystal = (p: Pen, x: number, y: number, r: number, rot: number) => {
  for (let i = 0; i < 3; i++) { const an = rot + (i / 3) * Math.PI; p.stroke([[x - Math.cos(an) * r, y - Math.sin(an) * r], [x + Math.cos(an) * r, y + Math.sin(an) * r]], Math.max(2, r * 0.22), WHITE); }
  p.dot(x, y, r * 0.22, WHITE);
};
/** frozen solid: blue sheen down the whole body */
const frostBody = (p: Pen, s: PersonS, k: number) => {
  const g = p.g; g.save(); g.globalCompositeOperation = "source-atop";
  g.fillStyle = rgba("#7ac8ff", 0.35 * k); g.fillRect(0, 0, 600, 1000);
  g.restore();
  for (let i = 0; i < 6; i++) crystal(p, s.body[0] + (rnd(77, i) - 0.5) * 2 * s.rx, s.body[1] + (rnd(78, i) - 0.5) * 1.6 * s.ry, 14 + 8 * rnd(79, i), rnd(80, i) * 3);
};

// ======================================================================================================================
// THE BRAIN (pink, wrinkly, cute): body only (used inside BEAN's head) and the full HQ character on a swivel chair
// ======================================================================================================================
const BR = "#ff9ec0", BR_DK = "#e06a96", BR_LN = "#c04a7a";
type BrainBody = { cx: number; cy: number; r: number; face: FaceS; lid: number; shrug?: number; sign?: number; light: number; facing?: number; headset?: boolean; arms?: ArmS[] | null; frown?: number };
export const drawBrainBody = (p: Pen, b: BrainBody) => {
  const { cx, cy, r } = b, fc = b.facing ?? 0;
  // little shrug arms (behind) for the hook version
  const sh = b.shrug ?? 0;
  if (b.arms === undefined && sh > 0.01) for (const sd of [-1, 1]) {
    const S: P2 = [cx + sd * 0.82 * r, cy + 0.2 * r], E: P2 = [cx + sd * (0.95 + 0.45 * sh) * r, cy + (0.2 - 0.55 * sh) * r];
    limb(p, thru(S, [cx + sd * 1.2 * r, cy + 0.35 * r], E, 8), BR, 0.2 * r, 4);
    if (sd < 0 && (b.sign ?? 0) > 0.02) local(p, E[0], E[1] - 0.42 * r, -0.15, () => drawItem(p, { k: "sign" }, r * 0.8), Math.min(1, b.sign!));
    local(p, E[0], E[1], sd * (0.9 - 0.4 * sh) + (sd < 0 ? 0 : 0), () => drawHand(p, "open", WHITE, sd > 0), 0.16 * r / 50);
  }
  const pts = puffPts(cx, cy, r * 1.08, r * 0.86, 9, 13, 1.1);
  p.shadedFill(pts, BR, BR_DK, b.light, r, 0.4);
  p.clip(pts, () => {
    for (let i = 0; i < 7; i++) { // gyri: wiggly wrinkles
      const y = cy - 0.7 * r + i * 0.22 * r, s: P2[] = [];
      for (let j = 0; j <= 18; j++) { const x = cx - 1.1 * r + j * 0.122 * r; s.push([x, y + 0.07 * r * Math.sin(j * 1.3 + i * 2.1) + 0.04 * r * Math.sin(j * 2.9 + i)]); }
      if (i >= 3 && i <= 5) continue; // keep the face clean
      p.stroke(s, Math.max(2.5, 0.04 * r), BR_LN);
    }
    p.stroke(thru([cx + fc * 0.2 * r, cy - 0.9 * r], [cx + fc * 0.25 * r, cy - 0.5 * r], [cx + fc * 0.18 * r, cy - 0.32 * r], 8), Math.max(3, 0.05 * r), BR_LN);
    p.ell(cx - 0.35 * r, cy - 0.5 * r, 0.3 * r, 0.14 * r, rgba(WHITE, 0.45), 0, 0, 360, -20);
  });
  p.inkRing(pts, Math.max(4, 0.07 * r), thickAngle(b.light), 0.4);
  local(p, cx + fc * 0.28 * r, cy + 0.12 * r, 0, () => face(p, b.face, r * 0.62, BR, b.lid, { nose: "#ff7aa8" }));
  if (b.headset) {
    const band = thru([cx - 1.02 * r, cy + 0.05 * r], [cx, cy - 1.25 * r], [cx + 1.02 * r, cy + 0.05 * r], 16);
    p.stroke(band, 0.08 * r + 8, INK); p.stroke(band, 0.08 * r, "#3a3448");
    const ex = cx + (fc >= 0 ? 1 : -1) * 1.0 * r;
    p.poly(rrect(ex - 0.16 * r, cy - 0.12 * r, ex + 0.16 * r, cy + 0.3 * r, 0.1 * r), "#ffd23a", 4.5);
    const mic = thru([ex, cy + 0.2 * r], [ex - (fc >= 0 ? 1 : -1) * 0.25 * r, cy + 0.55 * r], [cx + fc * 0.28 * r + (fc >= 0 ? 1 : -1) * 0.3 * r, cy + 0.52 * r], 10);
    p.stroke(mic, 0.035 * r + 8, INK); p.stroke(mic, 0.035 * r, "#3a3448");
    const M = mic[mic.length - 1]; p.ell(M[0], M[1], 0.08 * r, 0.06 * r, "#3a3448", 4);
  }
};
export type BrainS = { face: FaceS; lid: number; facing: number; arms: ArmS[]; bob: number; light: number; spin?: number };
/** the HQ BRAIN on a swivel chair (600 x 1000, floor y 975): brain centre (300, 470), r 175 */
export const BRAIN_C: P2 = [300, 470];
export const BRAIN_R = 175;
export const drawBrain = (p: Pen, s: BrainS) => {
  const olS = p.ol; p.ol = 5;
  const cx = BRAIN_C[0], cy = BRAIN_C[1] + s.bob, r = BRAIN_R, sp = s.spin ?? 0;
  // (integration) no chair here: the brain sits on hq.ts's 3D swivel chair (seat top = canvas y ~615 when placed by cast.ts)
  void sp;
  // little legs dangling
  for (const sd of [-1, 1]) { limb(p, thru([300 + sd * 60, 600], [300 + sd * 78, 650], [300 + sd * 70, 720], 8), BR, 26, 4); p.ell(300 + sd * 78, 726, 34, 18, WHITE, 4.5); }
  for (const A of s.arms) if (A.back) armDraw(p, A, BR, null, 100);
  drawBrainBody(p, { cx, cy, r, face: s.face, lid: s.lid, light: s.light, facing: s.facing, headset: true, arms: null });
  for (const A of s.arms) if (!A.back) armDraw(p, A, BR, null, 100);
  p.ol = olS;
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
export const fxMark = (p: Pen, m: string, col: string) => letter(p, m, m.length > 1 ? 200 : 150, 210, 330, col, 32, 10);
export const MARK_COL = { "!": "#ff5a4a", "?": "#ffe46b", "!!": "#ff5a4a" } as const;
export const fxSparkle = (p: Pen, col: string) => { p.poly(starPts(128, 128, 112, 4, 0.22), col, 9); p.dot(128, 128, 16, WHITE); };
/** an ice crystal / snowflake (256 x 256) */
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
/** an ice shard (256 x 256): a blue-white crystal splinter */
export const fxShard = (p: Pen, seed: number) => {
  const pts: P2[] = [[128, 10], [170 + 20 * rnd(seed, 1), 120], [140, 246], [96 - 20 * rnd(seed, 2), 130]];
  p.poly(pts, "#bfeaff", 9); p.poly([[128, 10], [140, 246], [96 - 20 * rnd(seed, 2), 130]], "#e8f8ff", 0); p.poly(pts, null, 9);
  p.stroke([[118, 60], [108, 120]], 10, WHITE);
};
/** cold vapour wisp (soft, 256 x 256) */
export const fxVapour = (p: Pen, seed: number) => {
  for (let i = 0; i < 5; i++) glow(p, 70 + 120 * rnd(seed, i), 80 + 100 * rnd(seed, i + 5), 60 + 30 * rnd(seed, i + 9), "#eaf6ff", 0.55);
  const s: P2[] = []; for (let i = 0; i <= 20; i++) s.push([40 + i * 9, 150 + 26 * Math.sin(i * 0.6 + seed)]);
  p.stroke(s, 10, rgba(WHITE, 0.6));
};
export const fxBreath = (p: Pen, seed: number) => { const pts = puffPts(128, 128, 96, 70, 7, seed); p.poly(pts, "#f4fbff", 7); p.ell(100, 104, 24, 14, WHITE, 0); };
/** soft ray burst (512 x 512) */
export const fxRays = (p: Pen, c0: string, c1: string, a = 0.5) => {
  for (let i = 0; i < 18; i++) { const a0 = (i / 18) * Math.PI * 2, a1 = a0 + Math.PI / 18; p.poly([[256, 256], [256 + Math.cos(a0) * 256, 256 + Math.sin(a0) * 256], [256 + Math.cos(a1) * 256, 256 + Math.sin(a1) * 256]], rgba(i % 2 ? c0 : c1, a), 0); }
  glow(p, 256, 256, 200, "#ffffff", 0.55);
};
/** a soft round glow (256 x 256) */
export const fxGlow = (p: Pen, col: string, a: number) => glow(p, 128, 128, 126, col, a);
export const fxSpeed = (p: Pen) => { for (const [x, y0, l] of [[50, 30, 420], [128, 90, 380], [206, 50, 440]] as const) { p.stroke([[x, y0], [x, y0 + l]], 30, INK); p.stroke([[x, y0 + 6], [x, y0 + l - 6]], 14, WHITE); } };
export const fxPoof = (p: Pen) => { p.poly(puffPts(128, 128, 104, 84, 8, 7), "#ffffff", 8); p.ell(150, 150, 50, 30, "#e0e8f6", 0); };
/** an ice-cream splat blob flying off a spoon (256 x 256) */
export const fxSplat = (p: Pen, col: string, seed: number) => {
  const pts = puffPts(128, 128, 78, 64, 7, seed, 1.3);
  p.poly(pts, col, 9); p.ell(104, 104, 22, 14, rgba(WHITE, 0.7), 0, 0, 360, -25);
  for (let i = 0; i < 3; i++) { const an = rnd(seed, i) * 6.28; p.ell(128 + Math.cos(an) * 108, 128 + Math.sin(an) * 100, 14, 14, col, 6); }
};
export const fxHeart = (p: Pen, col: string) => {
  const pts: P2[] = []; for (let i = 0; i < 40; i++) { const t = (i / 40) * Math.PI * 2; pts.push([128 + 95 * Math.pow(Math.sin(t), 3), 120 - (78 * Math.cos(t) - 30 * Math.cos(2 * t) - 12 * Math.cos(3 * t) - 6 * Math.cos(4 * t))]); }
  p.poly(pts, col, 9); p.ell(92, 90, 18, 12, rgba(WHITE, 0.75), 0, 0, 360, -30);
};
/** stopwatch CLICK: radiating ticks + a tiny word (512 x 256) */
export const fxClick = (p: Pen) => {
  for (let i = 0; i < 7; i++) { const an = rad(-160 + i * 23.3), A: P2 = [256 + Math.cos(an) * 70, 200 + Math.sin(an) * 70], B: P2 = [256 + Math.cos(an) * 120, 200 + Math.sin(an) * 120]; p.stroke([A, B], 22, INK); p.stroke([A, B], 10, "#ffe14a"); }
  letter(p, "CLICK!", 256, 60, 84, "#ffe14a", 16, 6, 430);
};
/** impact star (512 x 512) */
export const fxImpact = (p: Pen, col: string) => { p.poly(starPts(256, 256, 240, 11, 0.55, 0.2), col, 14); p.poly(starPts(256, 256, 150, 11, 0.6, 0.4), WHITE, 0); };
/** a comic word: ouch (jagged red), forehead (alarm sign), ahh (warm puffy), nah (tiny frozen bubble), chomp: 800 x 500 */
export const fxWord = (p: Pen, word: string, style: "ouch" | "alarm" | "ahh" | "nah" | "chomp", ph = 0) => {
  if (style === "ouch") {
    p.poly(starPts(400, 250, 250, 13, 0.7, 0.1 + ph), "#ffe14a", 16);
    p.poly(starPts(400, 250, 196, 13, 0.72, 0.3 + ph), "#ff3a5a", 0);
    letter(p, word, 400, 262, 176, WHITE, 30, 0, 620);
  } else if (style === "alarm") {
    const box = rrect(30, 110, 770, 390, 40);
    p.poly(box, "#ff2a3a", 16);
    p.clip(box, () => { for (let i = -4; i < 12; i++) p.poly([[i * 80, 110], [i * 80 + 40, 110], [i * 80 + 40 - 60, 390], [i * 80 - 60, 390]], rgba("#ffe14a", 0.35), 0); });
    p.poly(rrect(56, 136, 744, 364, 26), null, 8);
    letter(p, word, 400, 255, 150, "#ffffff", 26, 0, 660);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) p.stroke([[400 + sd * (390 + i * 4), 250 - 70 + i * 70], [400 + sd * (430 + i * 6), 250 - 100 + i * 100]], 12);
  } else if (style === "ahh") {
    p.poly(puffPts(400, 250, 330, 190, 11, 3), "#ffe4c8", 14);
    const n = word.length;
    for (let i = 0; i < n; i++) local(p, 190 + i * (420 / Math.max(1, n - 1)), 250 + 18 * Math.sin(ph * 3 + i), 0.08 * Math.sin(ph * 2 + i), () => letter(p, word[i], 0, 0, 170, ["#ff8a3a", "#ff6a7a", "#ffb03a", "#ff8a3a"][i % 4], 26, 8));
  } else if (style === "nah") { // a small speech bubble frozen solid: icicles + frost
    const pill = rrect(190, 130, 610, 330, 90, 10);
    p.poly([[300, 320], [250, 430], [370, 326]], "#e4f6ff", 12);
    p.poly(pill, "#e4f6ff", 14);
    p.clip(pill, () => { p.ell(520, 170, 120, 40, rgba(WHITE, 0.8), 0, 0, 360, 15); p.ell(260, 300, 140, 40, rgba("#9ad8ff", 0.5), 0); });
    p.poly(pill, null, 14);
    letter(p, word, 400, 236, 120, "#6ab8e8", 20, 0, 360);
    for (let i = 0; i < 5; i++) p.poly([[290 + i * 60, 326], [318 + i * 60, 326], [304 + i * 60, 380 + 20 * (i % 2)]], "#dff6ff", 7);
  } else {
    p.poly(starPts(400, 250, 230, 9, 0.62, 0.3), "#ffffff", 14);
    letter(p, word, 400, 258, 150, "#ff6a9a", 26, 0, 560);
  }
};
/** the MEME FREEZE frost explosion (soft, 1024 x 1024): an icy starburst ring of crystals */
export const fxFrostBurst = (p: Pen, k: number, ph: number) => {
  const c = 512;
  glow(p, c, c, 500 * k, "#bfeaff", 0.75);
  for (let i = 0; i < 16; i++) {
    const an = (i / 16) * Math.PI * 2 + ph * 0.1, L = (260 + 200 * rnd(3, i)) * k, w = 46 * k;
    const B: P2 = [c + Math.cos(an) * 120 * k, c + Math.sin(an) * 120 * k], T: P2 = [c + Math.cos(an) * L, c + Math.sin(an) * L], n: P2 = [-Math.sin(an) * w, Math.cos(an) * w];
    p.poly([[B[0] + n[0], B[1] + n[1]], T, [B[0] - n[0], B[1] - n[1]]], rgba(i % 2 ? "#ffffff" : "#9ae0ff", 0.9), 10);
  }
  glow(p, c, c, 260 * k, "#ffffff", 0.9);
};
/** the ICE BLOCK (soft see-through, 600 x 1000): a glossy translucent block with bevels, cracks, frost at the base */
export const fxIceBlock = (p: Pen, k: number) => {
  const box = rrect(40, 40, 560, 960, 46, 10), g = p.g;
  g.save(); g.globalAlpha = Math.min(1, k);
  const gr = g.createLinearGradient(0, 40, 600, 960);
  gr.addColorStop(0, "rgba(220,245,255,0.55)"); gr.addColorStop(0.5, "rgba(150,215,255,0.38)"); gr.addColorStop(1, "rgba(110,180,240,0.55)");
  p.path(box, true); g.fillStyle = gr; g.fill();
  p.clip(box, () => {
    p.poly([[40, 40], [560, 40], [500, 100], [100, 100]], "rgba(255,255,255,0.5)", 0);
    p.poly([[40, 40], [100, 100], [100, 900], [40, 960]], "rgba(255,255,255,0.3)", 0);
    p.poly([[560, 40], [500, 100], [500, 900], [560, 960]], "rgba(90,160,230,0.3)", 0);
    p.poly([[100, 140], [190, 140], [100, 560]], "rgba(255,255,255,0.45)", 0);
    p.poly([[140, 140], [180, 140], [110, 440], [100, 440]], "rgba(255,255,255,0.6)", 0);
    p.stroke([[470, 160], [430, 260], [462, 330], [420, 420]], 5, "rgba(255,255,255,0.85)");
    p.stroke([[150, 760], [210, 700], [196, 650]], 5, "rgba(255,255,255,0.8)");
    p.poly(puffPts(300, 960, 300, 70, 12, 4), "rgba(240,250,255,0.85)", 0);
  });
  g.lineWidth = 12; g.strokeStyle = INK; p.path(box, true); g.stroke();
  p.poly(rrect(100, 100, 500, 900, 20, 6), null, 3);
  g.restore();
};
