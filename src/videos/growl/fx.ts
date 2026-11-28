// OWNER: cast. Canvas2D drawings for "The Cleaning Crew" (all NEW designs; Pen style: thick-thin plum ink, painted
// crescents; BEAN's construction = our channel's model: bean head, brown hair with the cowlick, red nose).
// Kid cards use the bridge 600 x 1000 design space (1000 units = 2.16 m at scale 1, soles at y 975).
//   drawKid     BEAN (royal-blue school hoodie with a crest, drawstrings, red nose) SEATED at his exam desk: the belly
//               RUMBLE (hoodie ripples), the tiny belly HATCH that flips open, the yellow "CLEANING IN PROGRESS" wet-floor
//               sign + the tiny yellow-gloved waving hand, the mortified MEME (eyes bulge, beet-red, clenched teeth), the
//               sink into the hoodie, the tiny "sorry" crew member. Also the PUPILS (hair styles, jumpers, writing,
//               turning round to stare: front / three-quarter / back-of-head views).
//   drawTeacher the strict TEACHER (grey bun, cat-eye glasses, mustard cardigan, plaid skirt, open register book).
//   drawCrew    the stomach-cell janitor CREW (round jelly blobs, royal-blue overalls, yellow rubber gloves, red wellies,
//               hard hats / cap / beanie / bandana; mop, broom, bucket, spray, duster; surfboards) + the FOREMAN (big,
//               moustache, white BOSS hard hat, hi-vis vest, clipboard, whistle).
//   fx*         ZZZ, RING RING!, grrr, wobble lines, GRRROWL letters (+ echoes), the peak shockwave, mmf, TWEET!, sorry,
//               ?, !!, sweat, sparkles, speed lines, dust puffs, juice spray, steam, a dropped pencil, flying papers.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix } from "../bridge/toon";

export type P2 = [number, number];
type C3 = [number, number, number];
const WHITE = "#ffffff", MOUTH = "#5a1424", TONGUE = "#ff6f86", BLUSH = "#ff5a7a";
const rad = (d: number) => (d * Math.PI) / 180;
export const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 91.7 + k * 47.3) * 31871.519; return x - Math.floor(x); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const cl01 = (x: number) => Math.max(0, Math.min(1, x));
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
const local = (p: Pen, x: number, y: number, a: number, fn: () => void, k = 1, ky = k) => { const g = p.g; g.save(); g.translate(x, y); g.rotate(a); if (k !== 1 || ky !== 1) g.scale(k, ky); fn(); g.restore(); };
const alpha = (p: Pen, a: number, fn: () => void) => { const g = p.g; g.save(); g.globalAlpha *= cl01(a); fn(); g.restore(); };
const SH_SKIN: C3 = [0.95, 0.84, 0.86], SH_HAIR: C3 = [0.62, 0.6, 0.74];
const FONT = "Arial Black, 'Liberation Sans', Arial, sans-serif";
/** bold comic lettering: ink rim + fill (+ white halo) */
export const letter = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, halo = 0, maxW?: number, weight = 900) => {
  const g = p.g; g.save(); g.font = `${weight} ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (halo) { g.lineWidth = ink + 2 * halo; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  if (ink) { g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); }
  g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
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
/** underdamped spring 0 -> 1 with overshoot (s = seconds since the trigger) */
export const spring = (s: number, w = 13, d = 5) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));

// ======================================================================================================================
// HANDS (local frame: palm centre 0,0, fingers toward -y, forearm toward +y; ~220 units tip to palm heel)
// ======================================================================================================================
export type HandK = "open" | "fist" | "splay" | "rest" | "point" | "thumb" | "grip";
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
/** a kid's / adult's hand */
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
    case "open": case "rest": {
      const sp = kind === "rest" ? 0.5 : 1;
      fingersUp([-0.24 * sp, -0.08 * sp, 0.08 * sp, 0.24 * sp], [120, 138, 130, 104]);
      palmFill(); thumb(-0.95, 94);
      break;
    }
    case "splay": fingersUp([-0.62, -0.22, 0.22, 0.62], [116, 134, 128, 104], 1.1); palmFill(); thumb(-1.45, 92); break;
    case "point": finger(p, [-46, -36], -0.06, 150, 36, skin); fist(0); break;
    case "thumb": fist(); finger(p, [-70, -6], -0.35, 120, 40, skin); break;
    case "grip": fingersUp([-0.1, -0.03, 0.03, 0.1], [70, 80, 76, 62]); palmFill(); thumb(-0.6, 70); break;
    case "fist": fist(); break;
  }
  g.restore();
};

// ======================================================================================================================
// FACES (local frame: head centre 0,0, y down, head half-width a)
// ======================================================================================================================
export type Expr =
  | "focus" | "write" | "eep" | "puzzled" | "stunned" | "meme" | "sheepish" | "stare" | "gasp" | "snicker" | "stern" | "glare"
  | "sleep" | "alarm" | "happy" | "grin" | "surf" | "wince" | "sip" | "shout" | "puff" | "sorry" | "lookup" | "determined" | "boss";
type EyeK = "wide" | "tiny" | "bulge" | "half" | "happy" | "round" | "sparkle" | "blink" | "angry" | "shut" | "sleep" | "squint";
type MouthK = "tongue" | "smile" | "grin" | "grit" | "clench" | "hmm" | "mmm" | "shout" | "flat" | "squiggle" | "gasp" | "ooh" | "wobble" | "frown" | "drool" | "pucker" | "set";
const EXPR: Record<Expr, { eye: [EyeK, EyeK]; brow: [[number, number], [number, number]]; mouth: MouthK; blush?: number; cheeks?: number }> = {
  focus: { eye: ["half", "half"], brow: [[5, -1], [5, -1]], mouth: "tongue" },
  write: { eye: ["half", "half"], brow: [[2, 0], [2, 0]], mouth: "hmm" },
  eep: { eye: ["wide", "wide"], brow: [[-13, -16], [-13, -16]], mouth: "wobble" },
  puzzled: { eye: ["round", "round"], brow: [[-2, -4], [-14, -20]], mouth: "squiggle" },
  stunned: { eye: ["tiny", "tiny"], brow: [[-16, -18], [-16, -18]], mouth: "ooh" },
  meme: { eye: ["bulge", "bulge"], brow: [[-14, 6], [-14, 6]], mouth: "clench" },
  sheepish: { eye: ["round", "round"], brow: [[-16, -2], [-16, -2]], mouth: "wobble", blush: 1 },
  stare: { eye: ["tiny", "tiny"], brow: [[-12, -15], [-12, -15]], mouth: "flat" },
  gasp: { eye: ["tiny", "tiny"], brow: [[-15, -18], [-15, -18]], mouth: "gasp" },
  snicker: { eye: ["happy", "happy"], brow: [[-4, -8], [-4, -8]], mouth: "mmm", blush: 0.6, cheeks: 0.55 },
  stern: { eye: ["half", "half"], brow: [[9, -3], [9, -3]], mouth: "flat" },
  glare: { eye: ["angry", "angry"], brow: [[16, -5], [16, -5]], mouth: "frown" },
  sleep: { eye: ["sleep", "sleep"], brow: [[-2, -2], [-2, -2]], mouth: "drool", blush: 0.4 },
  alarm: { eye: ["wide", "wide"], brow: [[-15, -18], [-15, -18]], mouth: "gasp" },
  happy: { eye: ["round", "round"], brow: [[-10, -8], [-10, -8]], mouth: "smile", blush: 0.35 },
  grin: { eye: ["happy", "happy"], brow: [[-9, -8], [-9, -8]], mouth: "grin", blush: 0.4 },
  surf: { eye: ["sparkle", "sparkle"], brow: [[-12, -12], [-12, -12]], mouth: "grin", blush: 0.4 },
  wince: { eye: ["shut", "shut"], brow: [[12, -6], [12, -6]], mouth: "grit" },
  sip: { eye: ["happy", "happy"], brow: [[-3, -2], [-3, -2]], mouth: "mmm", blush: 0.45 },
  shout: { eye: ["angry", "angry"], brow: [[14, -6], [14, -6]], mouth: "shout" },
  puff: { eye: ["shut", "shut"], brow: [[8, -8], [8, -8]], mouth: "pucker", cheeks: 1.15, blush: 0.6 },
  sorry: { eye: ["sparkle", "sparkle"], brow: [[-12, 5], [-12, 5]], mouth: "wobble", blush: 0.7 },
  lookup: { eye: ["wide", "wide"], brow: [[-16, -18], [-16, -18]], mouth: "ooh" },
  determined: { eye: ["angry", "angry"], brow: [[10, -6], [10, -6]], mouth: "set" },
  boss: { eye: ["half", "half"], brow: [[12, -2], [12, -2]], mouth: "flat" },
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
    case "tiny": p.ell(x, y - 2 * u, 13 * u, 14.5 * u, WHITE, 3.4 * u); p.dot(x + j * 0.5 + lx * 5.5 * u, y - 2 * u + ly * 5.5 * u, 2.8 * u); break;
    case "bulge": { // THE MEME: huge popping eyes (k), bloodshot, pin pupils that shiver
      const s = 1 + 0.55 * cl01(k), r = 16 * u * s, ox = side * 4 * u * s, cy = y - 6 * u * s;
      p.ell(x + ox, cy, r, r * 1.16, WHITE, 4 * u);
      for (let i = 0; i < 4; i++) { const a0 = rad((side > 0 ? 110 : 10) + 30 * i); p.stroke(thru([x + ox + Math.cos(a0) * r * 0.95, cy + Math.sin(a0) * r * 1.05], [x + ox + Math.cos(a0 + 0.2) * r * 0.72, cy + Math.sin(a0 + 0.2) * r * 0.8], [x + ox + Math.cos(a0) * r * 0.5, cy + Math.sin(a0) * r * 0.55], 6), 1.5 * u, "#ff4a5a"); }
      p.dot(x + ox + j * 0.8 + lx * 3 * u, cy + 1 * u + ly * 3 * u, 3.2 * u);
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
    case "half": {
      const lidY = y - 1.2 * u, wpts = ellPts(x, y, 10 * u, 8.6 * u, 30);
      p.poly(wpts, WHITE, 0);
      p.clip(wpts, () => {
        const px = x + lx * 4.6 * u, py = y + 2.6 * u + ly * 1.8 * u;
        p.ell(px, py, 4.6 * u, 5.2 * u, INK, 0); p.dot(px - 1.2 * u, py - 1.2 * u, 1.2 * u, WHITE);
        p.poly([[x - 14 * u, y - 13 * u], [x + 14 * u, y - 13 * u], [x + 14 * u, lidY], [x - 14 * u, lidY]], mul(skin, [0.93, 0.85, 0.88]), 0);
      });
      p.poly(wpts, null, 2.4 * u);
      p.stroke(thru([x - 11.5 * u, lidY + 0.6 * u], [x, lidY - 0.8 * u], [x + 11.5 * u, lidY + 0.6 * u], 8), 4 * u);
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
    case "sleep": p.arc(x, y - 1 * u, 9 * u, 6 * u, 20, 160, 4.2 * u); for (let i = 0; i < 3; i++) { const a = rad(60 + i * 30); p.stroke([[x + Math.cos(a) * 9 * u, y - u + Math.sin(a) * 6 * u], [x + Math.cos(a) * 12 * u, y - u + Math.sin(a) * 9.5 * u]], 2.2 * u); } break;
    case "squint": {
      const wpts = ellPts(x, y + u, 10 * u, 4.4 * u, 24);
      p.poly(wpts, WHITE, 0); p.clip(wpts, () => p.ell(x + lx * 3 * u + side * 1.5 * u, y + u, 4 * u, 5 * u, INK, 0)); p.poly(wpts, null, 2.4 * u);
      break;
    }
    case "shut": { const o = side * 9 * u; p.stroke([[x - o, y - 6.5 * u], [x + o * 0.55, y], [x - o, y + 6.5 * u]], 4.4 * u); break; }
    case "blink": p.stroke(thru([x - 9.5 * u, y], [x, y + 2 * u], [x + 9.5 * u, y], 8), 3.8 * u); break;
  }
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const sh = shake % 2 ? 1 : -1;
  switch (kind) {
    case "tongue": { // concentrating: a tight line, the tongue tip poking out of the corner
      p.ell(mx + 8 * u, my + 4.5 * u, 4.2 * u, 3.6 * u, TONGUE, 2.2 * u);
      p.stroke(thru([mx - 8 * u, my + 2 * u], [mx, my + 3 * u], [mx + 8 * u, my + 2 * u], 8), 3.4 * u);
      break;
    }
    case "smile": { const pts = [...thru([mx - 11 * u, my - 2 * u], [mx, my - 1 * u], [mx + 11 * u, my - 2 * u], 8), ...thru([mx + 11 * u, my - 2 * u], [mx, my + 9 * u], [mx - 11 * u, my - 2 * u], 10).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 7 * u, 6 * u, 3.5 * u, TONGUE, 0)); p.poly(pts, null, 3 * u); break; }
    case "grin": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 2.5 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 13 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 10 * u, 8 * u, 4 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 8 * u], [mx + 16 * u, my - 8 * u], [mx + 16 * u, my], [mx - 16 * u, my]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.2 * u); break; }
    case "grit": { const pts = rrect(mx - 13 * u, my - 4.5 * u, mx + 13 * u, my + 5 * u, 3.5 * u); p.poly(pts, WHITE, 3 * u); p.stroke([[mx - 12 * u, my + 0.3 * u], [mx + 12 * u, my + 0.3 * u]], 1.4 * u); for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 4.6 * u, my - 4 * u], [mx + i * 4.6 * u, my + 4.5 * u]], 1.2 * u); break; }
    case "clench": { // THE MEME: a huge wobbly clenched grimace, every tooth showing, gums, corners pulled down
      const w = (17 + 5 * cl01(k)) * u, h = (8 + 3 * cl01(k)) * u, pts: P2[] = [];
      for (let i = 0; i <= 16; i++) { const x = -w + (2 * w * i) / 16; pts.push([mx + x, my - h + 1.6 * u * Math.sin(i * 1.7 + sh) - 2 * u * Math.cos((x / w) * 1.4)]); }
      for (let i = 16; i >= 0; i--) { const x = -w + (2 * w * i) / 16; pts.push([mx + x, my + h + 1.6 * u * Math.sin(i * 1.3 - sh) + 3 * u * (Math.abs(x / w) ** 2)]); }
      p.poly(pts, "#ff8a9a", 0);
      p.clip(pts, () => {
        p.poly(rrect(mx - w - 2 * u, my - h * 0.62, mx + w + 2 * u, my + h * 0.7, 2 * u), WHITE, 0);
        p.stroke([[mx - w, my + 0.4 * u], [mx + w, my + 0.4 * u]], 1.6 * u);
        for (let i = -3; i <= 3; i++) p.stroke([[mx + i * 5.4 * u, my - h], [mx + i * 5.4 * u + 0.6 * u * sh, my + h]], 1.4 * u);
      });
      p.poly(pts, null, 3.6 * u);
      break;
    }
    case "hmm": p.stroke(thru([mx - 7 * u, my + 3 * u], [mx, my + 2 * u], [mx + 6 * u, my + 1 * u], 8), 3.2 * u); break;
    case "mmm": p.stroke(thru([mx - 7 * u, my + 2 * u], [mx, my + 6 * u], [mx + 7 * u, my + 2 * u], 8), 3.4 * u); break;
    case "shout": { const pts = [...thru([mx - 15 * u, my - 4 * u], [mx, my - 6 * u], [mx + 15 * u, my - 4 * u], 10), ...thru([mx + 15 * u, my - 4 * u], [mx, my + 17 * u], [mx - 15 * u, my - 4 * u], 12).slice(1)]; p.poly(pts, MOUTH, 0); p.clip(pts, () => { p.ell(mx, my + 13 * u, 9 * u, 4.5 * u, TONGUE, 0); p.poly([[mx - 16 * u, my - 9 * u], [mx + 16 * u, my - 9 * u], [mx + 16 * u, my - 1 * u], [mx - 16 * u, my - 1 * u]], WHITE, 1.2 * u); }); p.poly(pts, null, 3.3 * u); break; }
    case "flat": p.stroke([[mx - 7 * u, my + u], [mx + 7 * u, my + 1.4 * u]], 3.4 * u); break;
    case "squiggle": { const s: P2[] = []; for (let i = 0; i <= 14; i++) s.push([mx - 9 * u + i * 1.4 * u, my + 2.4 * u * Math.sin(i * 0.95) - i * 0.25 * u]); p.stroke(s, 3.4 * u); break; }
    case "gasp": { const pts = ellPts(mx, my + 2 * u, 7 * u, 10 * u, 30); p.poly(pts, MOUTH, 0); p.clip(pts, () => p.ell(mx, my + 10 * u, 6 * u, 4 * u, TONGUE, 0)); p.poly(pts, null, 3.2 * u); break; }
    case "ooh": p.ell(mx, my + 1.5 * u, 5 * u, 6.4 * u, MOUTH, 3 * u); p.ell(mx, my + 5 * u, 3 * u, 2 * u, TONGUE, 0); break;
    case "wobble": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 10 * u + i * 1.65 * u, my + 2 * u + 1.7 * u * Math.sin(i * 1.6 + (shake % 2) * 0.9) - 2.5 * u * Math.sin((i / 12) * Math.PI)]); p.stroke(s, 3.4 * u); break; }
    case "frown": p.arc(mx, my + 5 * u, 8 * u, 4.4 * u, 205, 335, 3.4 * u); break;
    case "drool": p.ell(mx, my + 2 * u, 4.4 * u, 3.4 * u, MOUTH, 2.6 * u); p.poly([[mx + 3 * u, my + 4 * u], [mx + 6 * u, my + 4 * u], [mx + 5.5 * u, my + 11 * u], [mx + 3.5 * u, my + 11 * u]], "#bfe8ff", 1.6 * u); p.dot(mx + 4.5 * u, my + 11.5 * u, 2.2 * u, "#bfe8ff"); break;
    case "pucker": p.ell(mx, my + 1 * u, 4.4 * u, 4 * u, "#ff7a8a", 2.6 * u); p.dot(mx, my + 1 * u, 1.6 * u, MOUTH); break;
    case "set": p.stroke(thru([mx - 9 * u, my + 3 * u], [mx, my + 0.5 * u], [mx + 9 * u, my + 3 * u], 8), 3.6 * u); break;
  }
};
export type FaceOpt = { glasses?: string; moustache?: string; nose?: string; noBrow?: boolean; shift?: number };
export const face = (p: Pen, f: FaceS, a: number, skin: string, lid: number, opt: FaceOpt = {}) => {
  const u = a / 50, D = EXPR[f.e], look = f.look ?? [0, 0], k = f.k ?? 1, shake = f.shake ?? 0, sx = (opt.shift ?? 0) * a * 0.5;
  const ex = 0.37 * a * (1 - 0.25 * Math.abs(opt.shift ?? 0)), ey = -0.05 * a;
  if (D.blush) for (const s of [-1, 1]) glow(p, sx + s * 0.6 * a, 0.3 * a, 0.27 * a, BLUSH, 0.55 * D.blush);
  if (D.cheeks) for (const s of [-1, 1]) {
    const c = D.cheeks, cx = sx + s * (0.62 + 0.1 * c) * a, cy = 0.36 * a, r = (0.22 + 0.14 * c) * a;
    p.ell(cx, cy, r, r * 0.92, skin, 0);
    p.arc(cx, cy, r, r * 0.92, s > 0 ? -70 : 110, s > 0 ? 70 : 250, 2.8 * u);
    glow(p, cx, cy + 0.05 * a, r * 0.8, BLUSH, 0.45);
  }
  for (const s of [-1, 1]) {
    const x = sx + s * ex;
    let ek = D.eye[s < 0 ? 0 : 1];
    if (lid >= 1 && ["wide", "round", "half", "sparkle", "squint", "angry"].includes(ek)) ek = "blink";
    else if (lid > 0 && (ek === "wide" || ek === "round" || ek === "sparkle")) ek = "half";
    eye(p, ek, x, ey, u, s, look, k, shake, skin);
    if (opt.noBrow) continue;
    const bw = D.brow[s < 0 ? 0 : 1], big = ek === "tiny" || ek === "wide" || ek === "bulge";
    const by = ey - (big ? 23 : 18) * u - (ek === "bulge" ? 9 * u * k : 0) - (opt.glasses ? 3 * u : 0);
    const b0: P2 = [x - s * 8 * u, by + bw[0] * u], b1: P2 = [x + s * 9 * u, by + bw[1] * u];
    tapered(p, b0, b1, 6 * u, 3.4 * u, INK);
  }
  if (opt.glasses) { // cat-eye glasses: swept-up outer corners, a glint
    for (const s of [-1, 1]) {
      const cx = sx + s * ex;
      const pts: P2[] = [[cx - s * 13 * u, ey - 9 * u], [cx + s * 17 * u, ey - 14 * u], [cx + s * 14 * u, ey + 4 * u], [cx + s * 3 * u, ey + 10 * u], [cx - s * 12 * u, ey + 7 * u]];
      p.poly(pts, rgba(WHITE, 0.16), 3.6 * u);
      p.stroke([[cx - 8 * u, ey - 6 * u], [cx - 3 * u, ey - 8 * u]], 2.2 * u, rgba(WHITE, 0.9));
    }
    p.stroke(thru([sx - ex + 12 * u, ey - 4 * u], [sx, ey - 7 * u], [sx + ex - 12 * u, ey - 4 * u], 6), 2.6 * u);
  }
  const nb = opt.nose ?? mul(skin, [0.97, 0.86, 0.85]);
  p.ell(sx * 1.1, 0.17 * a, 6.6 * u, 5.4 * u, nb, 2.2 * u);
  p.dot(sx * 1.1 - 2 * u, 0.14 * a - 1.4 * u, 1.5 * u, "rgba(255,255,255,0.8)");
  if (opt.moustache) for (const s of [-1, 1]) { const pts = [...thru([sx, 0.27 * a], [sx + s * 11 * u, 0.22 * a], [sx + s * 22 * u, 0.36 * a], 8), ...thru([sx + s * 22 * u, 0.36 * a], [sx + s * 10 * u, 0.38 * a], [sx, 0.32 * a], 8).slice(1)]; p.poly(pts, opt.moustache, 2.4 * u); }
  mouth(p, D.mouth, sx * 0.9, 0.45 * a + (opt.moustache ? 4 * u : 0), u, k, shake);
};

// ======================================================================================================================
// KIDS: BEAN + the pupils, SEATED behind an exam desk (upright 600 x 1000 card; soles / floor at y 975)
// ======================================================================================================================
export const SKIN_B = "#ffdcc0";
export type HairK = "bean" | "pigtails" | "bob" | "spiky" | "afro" | "bun" | "pony" | "curly" | "teacher";
export type KidLook = { skin: string; hair: HairK; hairCol: string; top: string; topDk: string; trim: string; bottom: string; shoes: string; crest?: boolean; nose?: string; glasses?: string; stripe?: boolean };
export type ArmS = { sh: P2; w: P2; bend: number; hand?: HandK; hang?: number; hk?: number; thick?: number; mirror?: boolean; pencil?: number };
/** turn: 0 front, +-0.5 three-quarter (face toward screen +-x), |turn| >= 0.8 back of the head */
export type KidS = {
  look: KidLook; head: P2; a: number; tilt: number; face: FaceS; lid: number; seed: number;
  body: P2; rx: number; ry: number; arms: ArmS[]; turn?: number;
  /** belly rumble 0..1+ and its phase (frame) */ rumble?: number; ph?: number;
  /** the belly hatch 0..1 open, the wet-floor sign 0..1+ (spring scale), the gloved hand wave (angle) */ hatch?: number; sign?: number; wave?: number;
  /** beet-red 0..1, sink 0..1 (slides down into the hoodie), the tiny crew member 0..1+ out of the hatch */ red?: number; sink?: number; mini?: number;
};
export const BELLY_PT: P2 = [300, 500]; // the hatch on BEAN's hoodie (canvas)
const hairBack = (p: Pen, L: KidLook, a: number) => {
  const col = L.hairCol;
  if (L.hair === "afro") { const pts = puffPts(0, -0.25 * a, 1.25 * a, 1.0 * a, 11, 5); p.gradFill(pts, col, mul(col, SH_HAIR), -2.2, 0.3); p.poly(pts, null, 5); }
  if (L.hair === "curly") { const pts = puffPts(0, -0.3 * a, 1.12 * a, 0.95 * a, 14, 9, 1.25); p.gradFill(pts, col, mul(col, SH_HAIR), -2.2, 0.3); p.poly(pts, null, 5); }
  if (L.hair === "pigtails") for (const sd of [-1, 1]) {
    const B: P2 = [sd * 0.95 * a, -0.35 * a], T: P2 = [sd * 1.45 * a, 0.25 * a];
    const pts = [...thru(B, [sd * 1.5 * a, -0.45 * a], T, 10), ...thru(T, [sd * 1.05 * a, 0.05 * a], B, 10).slice(1)];
    p.poly(pts, col, 5);
    p.ell(sd * 0.98 * a, -0.4 * a, 0.14 * a, 0.14 * a, "#ff4a8a", 4.4);
  }
  if (L.hair === "pony") { const pts = [...thru([0.6 * a, -0.6 * a], [1.35 * a, -0.5 * a], [1.2 * a, 0.5 * a], 10), ...thru([1.2 * a, 0.5 * a], [0.95 * a, -0.1 * a], [0.6 * a, -0.6 * a], 10).slice(1)]; p.poly(pts, col, 5); p.ell(0.78 * a, -0.58 * a, 0.12 * a, 0.12 * a, "#4ad0ff", 4); }
  if (L.hair === "bob") { const pts = [...thru([-1.08 * a, 0.35 * a], [-1.25 * a, -0.9 * a], [0, -1.12 * a], 12), ...thru([0, -1.12 * a], [1.25 * a, -0.9 * a], [1.08 * a, 0.35 * a], 12).slice(1)]; p.poly(pts, mul(col, [0.85, 0.85, 0.9]), 5); }
  if (L.hair === "bun") { p.ell(0.1 * a, -1.12 * a, 0.36 * a, 0.3 * a, col, 5); p.ell(0.0 * a, -1.0 * a, 0.2 * a, 0.08 * a, "#ffd23a", 3.5); }
  if (L.hair === "teacher") { p.ell(0, -1.12 * a, 0.46 * a, 0.36 * a, col, 5); p.stroke(thru([-0.3 * a, -1.15 * a], [0, -1.3 * a], [0.3 * a, -1.15 * a], 8), 4, mul(col, [0.75, 0.75, 0.8])); p.stroke([[0.25 * a, -1.4 * a], [0.55 * a, -1.0 * a]], 7, "#c8384a"); p.stroke([[-0.2 * a, -1.42 * a], [-0.5 * a, -1.05 * a]], 7, "#c8384a"); }
};
const hairFront = (p: Pen, L: KidLook, a: number, light: number, shift = 0) => {
  const col = L.hairCol, hd = mul(col, SH_HAIR);
  const cap = (pts: P2[]) => { p.gradFill(pts, col, hd, light, 0.3); p.poly(pts, null, 5); };
  const sx = shift * a * 0.5;
  switch (L.hair) {
    case "bean": case "pigtails": case "bun": case "pony": case "teacher": {
      cap([...thru([-0.99 * a, -0.05 * a], [-0.78 * a, -0.86 * a], [0.02 * a, -1.02 * a], 10), ...thru([0.02 * a, -1.02 * a], [0.78 * a, -0.86 * a], [0.99 * a, -0.1 * a], 10).slice(1),
        ...thru([0.99 * a, -0.1 * a], [0.85 * a, -0.45 * a], [0.55 * a + sx, -0.5 * a], 6).slice(1), ...thru([0.55 * a + sx, -0.5 * a], [0.05 * a + sx, -0.32 * a], [-0.45 * a + sx, -0.42 * a], 10).slice(1),
        ...thru([-0.45 * a + sx, -0.42 * a], [-0.8 * a, -0.3 * a], [-0.99 * a, -0.05 * a], 6).slice(1)]);
      p.stroke(thru([0.12 * a, -0.9 * a], [0.42 * a, -0.82 * a], [0.66 * a, -0.6 * a], 6), 0.05 * a, rgba(WHITE, 0.5));
      if (L.hair === "bean") { const cw = thru([-0.08 * a, -0.98 * a], [-0.22 * a, -1.28 * a], [0.22 * a, -1.36 * a], 8); p.stroke(cw, 0.13 * a + 10, INK); p.stroke(cw, 0.13 * a, col); }
      break;
    }
    case "bob": cap([...thru([-1.0 * a, 0.1 * a], [-0.9 * a, -0.95 * a], [0, -1.05 * a], 10), ...thru([0, -1.05 * a], [0.9 * a, -0.95 * a], [1.0 * a, 0.1 * a], 10).slice(1), ...thru([1.0 * a, 0.1 * a], [0.85 * a, -0.4 * a], [0.6 * a + sx, -0.42 * a], 6).slice(1), [-0.6 * a + sx, -0.42 * a], ...thru([-0.6 * a + sx, -0.42 * a], [-0.85 * a, -0.4 * a], [-1.0 * a, 0.1 * a], 6).slice(1)]); break;
    case "spiky": {
      const pts: P2[] = [[-0.98 * a, -0.1 * a]];
      for (let i = 0; i <= 8; i++) { const an = rad(-175 + i * 21.25); pts.push([Math.cos(an) * a * 0.92, Math.sin(an) * a * 0.86]); if (i < 8) { const am = rad(-175 + (i + 0.5) * 21.25); pts.push([Math.cos(am) * a * 1.32, Math.sin(am) * a * 1.3]); } }
      pts.push([0.98 * a, -0.1 * a], [0.5 * a + sx, -0.48 * a], [-0.5 * a + sx, -0.48 * a]);
      cap(pts); break;
    }
    case "afro": cap([...thru([-0.95 * a, -0.2 * a], [-0.6 * a, -1.0 * a], [0.6 * a, -1.0 * a], 12), [0.95 * a, -0.2 * a], ...thru([0.95 * a, -0.2 * a], [0.4 * a + sx, -0.5 * a], [-0.95 * a, -0.2 * a], 10).slice(1)]); break;
    case "curly": { const pts = puffPts(sx * 0.3, -0.62 * a, 0.95 * a, 0.42 * a, 9, 4, 1.25); cap(pts); break; }
  }
};
/** the back of a head (pupil turned round to stare at BEAN): hair over the skull, both ears */
const headBack = (p: Pen, L: KidLook, a: number, seed: number, light: number) => {
  const hp = blobPts(0, 0, headBlob(seed, a, 0));
  for (const sd of [-1, 1]) p.ell(sd * 0.98 * a, 0.05 * a, 0.16 * a, 0.22 * a, L.skin, 4.5);
  if (L.hair === "pigtails" || L.hair === "bob") hairBack(p, L, a);
  p.shadedFill(hp, L.skin, mul(L.skin, SH_SKIN), light, a, 0.4);
  const col = L.hairCol;
  const cover = L.hair === "bob" || L.hair === "pigtails" ? 0.55 : L.hair === "afro" || L.hair === "curly" ? 0.75 : 0.35;
  p.clip(hp, () => { const pts = [...thru([-1.2 * a, cover * a], [0, (cover + 0.15) * a], [1.2 * a, cover * a], 10), [1.2 * a, -1.5 * a], [-1.2 * a, -1.5 * a]] as P2[]; p.gradFill(pts, col, mul(col, SH_HAIR), light, 0.3); p.stroke(thru([-0.4 * a, -0.85 * a], [0, -0.95 * a], [0.4 * a, -0.85 * a], 6), 0.05 * a, rgba(WHITE, 0.4)); });
  p.inkRing(hp, 5.5, thickAngle(light), 0.4);
  if (L.hair === "bun" || L.hair === "teacher" || L.hair === "pony") hairBack(p, L, a);
  if (L.hair === "afro" || L.hair === "curly") { const pts = puffPts(0, -0.2 * a, 1.15 * a, 1.0 * a, 12, 7, 1.2); p.gradFill(pts, col, mul(col, SH_HAIR), light, 0.3); p.poly(pts, null, 5); }
};
/** a yellow HB pencil, centred, length L along -y */
const pencil = (p: Pen, L: number) => {
  const w = L * 0.09, h = L / 2;
  p.poly([[-w, -h * 0.55], [w, -h * 0.55], [w, h * 0.7], [-w, h * 0.7]], "#ffc82a", 4);
  p.poly([[-w, -h * 0.55], [w, -h * 0.55], [0, -h]], "#f4d0a0", 4); p.poly([[-w * 0.35, -h * 0.85], [w * 0.35, -h * 0.85], [0, -h]], INK, 0);
  p.poly([[-w, h * 0.7], [w, h * 0.7], [w, h * 0.85], [-w, h * 0.85]], "#c8c8d0", 4); p.poly(rrect(-w, h * 0.85, w, h, w * 0.5), "#ff8aa8", 4);
};
const armDraw = (p: Pen, A: ArmS, skin: string, sleeve: string, cuff: string) => {
  const d = Math.hypot(A.w[0] - A.sh[0], A.w[1] - A.sh[1]) || 1, nx = -(A.w[1] - A.sh[1]) / d, ny = (A.w[0] - A.sh[0]) / d;
  const M: P2 = [(A.sh[0] + A.w[0]) / 2 + nx * A.bend, (A.sh[1] + A.w[1]) / 2 + ny * A.bend];
  const pts = thru(A.sh, M, A.w, 14), w = A.thick ?? 46;
  const ang = Math.atan2(A.w[0] - M[0], -(A.w[1] - M[1])) + (A.hang ?? 0), hk = A.hk ?? 0.36;
  limb(p, pts, sleeve, w, 5);
  const E = pts[pts.length - 1], P0 = pts[pts.length - 3], an = Math.atan2(E[1] - P0[1], E[0] - P0[0]);
  const cs: P2[] = [[E[0] - Math.cos(an) * 16, E[1] - Math.sin(an) * 16], E];
  p.stroke(cs, w + 16, INK); p.stroke(cs, w + 6, cuff);
  if (A.hand) local(p, A.w[0], A.w[1], ang, () => local(p, 0, -HAND_WRIST * 0.8, 0, () => {
    drawHand(p, A.hand!, skin, A.mirror);
    if (A.pencil !== undefined) local(p, A.mirror ? 20 : -20, -30, (A.mirror ? -1 : 1) * (0.6 + A.pencil), () => pencil(p, 250));
  }), hk);
};
/** the hoodie torso; the belly rumble ripples its outline (rumble, ph) */
const hoodie = (p: Pen, s: KidS, light: number) => {
  const L = s.look, c = s.body, rb = s.rumble ?? 0, ph = s.ph ?? 0, B: P2 = [BELLY_PT[0], c[1] - 30];
  let pts = blobPts(c[0], c[1], { a: s.rx, b: s.ry, nTop: 2.0, nBot: 3.0, egg: 0.1, asym: 0, rot: 0, noise: 0.01, seed: 26 }, 72);
  if (rb > 0.001) pts = pts.map(([x, y]) => { // ripples run round the belly: bumps that travel with the phase
    const dy = y - B[1], w = Math.exp(-(dy * dy) / (2 * 110 * 110)), an = Math.atan2(y - B[1], x - B[0]);
    const bump = rb * w * (9 * Math.sin(an * 7 + ph * 1.9) + 7 * Math.sin(ph * 2.7 + y * 0.05)) + rb * w * 10;
    const nx = x - c[0] > 0 ? 1 : -1;
    return [x + nx * bump, y] as P2;
  });
  p.shadedFill(pts, L.top, L.topDk, light, s.rx, 0.4);
  p.clip(pts, () => {
    if (L.stripe) for (let i = 0; i < 3; i++) p.poly(rrect(c[0] - 2 * s.rx, c[1] - 0.35 * s.ry + i * 0.36 * s.ry, c[0] + 2 * s.rx, c[1] - 0.22 * s.ry + i * 0.36 * s.ry, 2), rgba(WHITE, 0.6), 0);
    p.poly(rrect(c[0] - 0.62 * s.rx, c[1] + 0.28 * s.ry, c[0] + 0.62 * s.rx, c[1] + 0.8 * s.ry, 20), mul(L.top, [0.9, 0.9, 0.95]), 4);
    p.poly([[c[0] - 2 * s.rx, c[1] + 0.86 * s.ry], [c[0] + 2 * s.rx, c[1] + 0.86 * s.ry], [c[0] + 2 * s.rx, c[1] + 2 * s.ry], [c[0] - 2 * s.rx, c[1] + 2 * s.ry]], L.trim, 4);
    if (L.crest) { // the school crest: a yellow shield with a tiny red bean
      const x = c[0] + 0.5 * s.rx, y = c[1] - 0.56 * s.ry, r = 0.2 * s.rx;
      const sh: P2[] = [[x - r, y - r], [x + r, y - r], [x + r, y + 0.2 * r], [x, y + 1.2 * r], [x - r, y + 0.2 * r]];
      p.poly(sh, "#ffd23a", 3.5); p.ell(x, y, 0.38 * r, 0.5 * r, "#ff6a3a", 2.5, 0, 360, 20);
    }
    if (rb > 0.02) for (let i = 0; i < 3; i++) { // ripple rings across the belly
      const u = (ph * 0.09 + i / 3) % 1, rr = 18 + 90 * u, m = Math.min(1, rb);
      p.arc(B[0], B[1], rr * 1.15, rr * 0.7, 200, 340, (6 - 3 * u) * m, rgba(INK, 0.6 * (1 - u) * m));
      p.arc(B[0], B[1], rr * 1.15, rr * 0.7, 20, 160, (6 - 3 * u) * m, rgba(INK, 0.45 * (1 - u) * m));
    }
    p.poly([[c[0] - 2 * s.rx, c[1] + 0.5 * s.ry], [c[0] + 2 * s.rx, c[1] + 0.5 * s.ry], [c[0] + 2 * s.rx, c[1] + 2 * s.ry], [c[0] - 2 * s.rx, c[1] + 2 * s.ry]], rgba(INK, 0.1), 0);
  });
  p.inkRing(pts, 5, thickAngle(light), 0.4);
};
/** the hood behind the neck + drawstrings (front) */
const hoodBack = (p: Pen, s: KidS) => { const c = s.body, top = c[1] - s.ry; p.ell(c[0], top + 6, 0.95 * s.a, 0.36 * s.a, s.look.topDk, 5); p.ell(c[0], top + 14, 0.62 * s.a, 0.18 * s.a, mul(s.look.topDk, [0.7, 0.7, 0.78]), 0); };
const strings = (p: Pen, s: KidS) => {
  const c = s.body, top = c[1] - s.ry;
  for (const sd of [-1, 1]) { const pts = thru([c[0] + sd * 22, top + 12], [c[0] + sd * 27, top + 50], [c[0] + sd * 21, top + 86], 8); p.stroke(pts, 13, INK); p.stroke(pts, 6, WHITE); p.poly(rrect(c[0] + sd * 21 - 6, top + 84, c[0] + sd * 21 + 6, top + 102, 4), "#c8c8d0", 3); }
};
/** the tiny "CLEANING IN PROGRESS" wet-floor A-frame sign (local: base centre 0,0; height h) */
export const wetSign = (p: Pen, h: number) => {
  const w = h * 0.74, u = h / 100;
  p.poly([[-w / 2 - 6 * u, 0], [-w / 2 + 6 * u, -h], [w / 2 - 6 * u, -h], [w / 2 + 6 * u, 0]], "#ffd21a", 4 * u);
  p.poly([[-w / 2 + 5 * u, -h + 4 * u], [w / 2 - 5 * u, -h + 4 * u], [w / 2 - 3.5 * u, -h + 13 * u], [-w / 2 + 3.5 * u, -h + 13 * u]], "#ff8a1a", 0);
  p.ell(0, -h - 3 * u, 7 * u, 4.5 * u, "#ffd21a", 3 * u);
  letter(p, "CLEANING", 0, -h * 0.71, 14 * u, INK, 0, 0, w * 0.88);
  letter(p, "IN PROGRESS", 0, -h * 0.56, 10 * u, INK, 0, 0, w * 0.84);
  const fx = -2 * u, fy = -h * 0.22; // the slipping stick figure + a puddle
  p.dot(fx + 8 * u, fy - 24 * u, 5.5 * u);
  p.stroke([[fx + 6 * u, fy - 17 * u], [fx - 3 * u, fy - 2 * u]], 4.4 * u); p.stroke([[fx + 3 * u, fy - 12 * u], [fx + 16 * u, fy - 19 * u]], 3.6 * u); p.stroke([[fx + 3 * u, fy - 12 * u], [fx - 10 * u, fy - 16 * u]], 3.6 * u);
  p.stroke([[fx - 3 * u, fy - 2 * u], [fx + 11 * u, fy + 4 * u]], 3.6 * u); p.stroke([[fx - 3 * u, fy - 2 * u], [fx - 14 * u, fy + 6 * u]], 3.6 * u);
  p.ell(0, fy + 11 * u, 21 * u, 3.6 * u, INK, 0);
};
/** a rubber-glove mitten (local: palm centre 0,0, fingers toward -y) */
export const mitt = (p: Pen, r: number, kind: "open" | "fist" | "thumb" | "point" | "splay", col = "#ffd23a") => {
  const ol = Math.max(2.5, r * 0.11), dk = mul(col, [0.86, 0.74, 0.6]);
  if (kind === "open" || kind === "splay") {
    const sp = kind === "splay" ? 0.38 : 0.18;
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * sp, B: P2 = [(i - 1.5) * 0.42 * r, -0.4 * r], T: P2 = [B[0] + Math.sin(a) * 0.9 * r, B[1] - Math.cos(a) * 0.9 * r]; p.stroke([B, T], 0.42 * r + 2 * ol, INK); p.stroke([B, T], 0.42 * r, col); }
  }
  if (kind === "point") { p.stroke([[-0.3 * r, -0.4 * r], [-0.3 * r, -1.45 * r]], 0.44 * r + 2 * ol, INK); p.stroke([[-0.3 * r, -0.4 * r], [-0.3 * r, -1.45 * r]], 0.44 * r, col); }
  if (kind === "thumb") { p.stroke([[-0.55 * r, -0.2 * r], [-0.58 * r, -1.35 * r]], 0.46 * r + 2 * ol, INK); p.stroke([[-0.55 * r, -0.2 * r], [-0.58 * r, -1.35 * r]], 0.46 * r, col); }
  p.ell(0, 0, 0.95 * r, 0.85 * r, col, ol);
  p.clip(ellPts(0, 0, 0.95 * r, 0.85 * r, 30), () => p.ell(0.35 * r, 0.4 * r, 0.9 * r, 0.6 * r, dk, 0));
  if (kind === "fist" || kind === "thumb" || kind === "point") for (let i = 0; i < 3; i++) p.arc((i - 1) * 0.42 * r + 0.15 * r, -0.4 * r, 0.22 * r, 0.2 * r, 180, 360, ol * 0.7);
  if (kind !== "thumb") { p.stroke([[-0.7 * r, 0.1 * r], [-1.25 * r, -0.35 * r]], 0.4 * r + 2 * ol, INK); p.stroke([[-0.7 * r, 0.1 * r], [-1.25 * r, -0.35 * r]], 0.4 * r, col); }
  p.poly(rrect(-0.85 * r, 0.55 * r, 0.85 * r, 1.05 * r, 0.2 * r), mul(col, [0.94, 0.88, 0.8]), ol);
};
/** a stubby yellow rubber-gloved arm (local: base 0,0; the glove ~L up, waving by angle) */
const gloveArm = (p: Pen, L: number, wave: number) => {
  const tip: P2 = [Math.sin(wave) * L, -Math.cos(wave) * L];
  limb(p, thru([0, 0], [tip[0] * 0.4 + 0.08 * L, tip[1] * 0.5], tip, 8), "#ffd23a", L * 0.17, Math.max(2.5, L * 0.045));
  local(p, tip[0], tip[1], wave, () => mitt(p, L * 0.3, "open"));
};
/** the seated kid (BEAN or a pupil). Lap at ~body bottom; legs hang to the floor (hidden by the desk from the front). */
export const drawKid = (p: Pen, s: KidS, light: number) => {
  const olS = p.ol; p.ol = 5;
  const L = s.look, a = s.a, turn = s.turn ?? 0, back = Math.abs(turn) >= 0.8, red = s.red ?? 0;
  const skin = red > 0.01 ? mix(L.skin, "#ff5050", 0.7 * red) : L.skin;
  const sink = s.sink ?? 0, dyB = 34 * sink, dyH = 78 * sink; // the body slumps, the head sinks INTO the hoodie
  const lapY = s.body[1] + s.ry - 22;
  for (const sd of [-1, 1]) {
    const hip: P2 = [300 + sd * 56, lapY], knee: P2 = [300 + sd * 70, lapY + 40], foot: P2 = [300 + sd * 74, 950];
    limb(p, [hip, knee, foot], L.bottom, 0.52 * a, 5);
    p.ell(foot[0] + sd * 8, 958, 0.4 * a, 0.18 * a, L.shoes, 5);
    p.stroke([[foot[0] + sd * 8 - 0.34 * a, 966], [foot[0] + sd * 8 + 0.34 * a, 966]], 0.07 * a, WHITE);
  }
  p.poly(rrect(300 - 1.05 * a, lapY - 20, 300 + 1.05 * a, lapY + 48, 30), L.bottom, 5);
  const sB: KidS = { ...s, body: [s.body[0], s.body[1] + dyB], head: [s.head[0], s.head[1] + dyH] };
  if (!back) hoodBack(p, sB);
  local(p, sB.head[0], sB.head[1], s.tilt, () => {
    const lt = light - s.tilt;
    if (back) { headBack(p, L, a, s.seed, lt); return; }
    if (Math.abs(turn) > 0.05) p.ell(-Math.sign(turn) * 0.97 * a, 0.08 * a, 0.15 * a, 0.2 * a, skin, 4.5); // the far ear
    hairBack(p, L, a);
    const hp = blobPts(0, 0, headBlob(s.seed, a, 0));
    p.shadedFill(hp, skin, mul(skin, SH_SKIN), lt, a, 0.4);
    if (red > 0.01) p.clip(hp, () => { glow(p, 0, 0.35 * a, 1.1 * a, "#ff1a2a", 0.5 * red); for (let i = 0; i < 3; i++) p.stroke([[-0.5 * a + i * 0.13 * a, -0.66 * a], [-0.44 * a + i * 0.13 * a, -0.52 * a]], 0.035 * a, rgba("#b01830", 0.6 * red)); });
    p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
    face(p, s.face, a, skin, s.lid, { nose: L.nose, glasses: L.glasses, shift: turn });
    hairFront(p, L, a, lt, turn);
  });
  hoodie(p, sB, light);
  if (!back) strings(p, sB);
  else { const c = sB.body, top = c[1] - sB.ry; p.poly(thru([c[0] - 0.85 * a, top + 8], [c[0], top + 150], [c[0] + 0.85 * a, top + 8], 12), L.topDk, 5); }
  const handSkin = red > 0.01 ? mix(L.skin, "#ff6a6a", 0.35 * red) : L.skin;
  for (const A of s.arms) armDraw(p, { ...A, sh: [A.sh[0], A.sh[1] + dyB] }, handSkin, L.top, L.trim);
  // ---- the belly gag (BEAN): hatch, sign, gloved hand, the tiny "sorry" crew member ----
  const hk = s.hatch ?? 0;
  if (hk > 0.01) {
    const bx = BELLY_PT[0], by = BELLY_PT[1] + dyB, r = 24 * Math.min(1, hk * 3);
    p.ell(bx, by, r * 1.3, r * 0.98, "#a8b2c6", 4);
    p.ell(bx, by, r, r * 0.74, "#2a1630", 0);
    const mi = s.mini ?? 0;
    if (mi > 0.01) p.clip([[bx - 220, by - 300], [bx + 220, by - 300], [bx + 220, by], [bx + r, by], ...ellPts(bx, by, r, r * 0.74, 30).filter((q) => q[1] >= by).sort((m, n) => n[0] - m[0]), [bx - r, by], [bx - 220, by]], () =>
      drawCrew(p, { look: CREW_LOOKS[1], pose: "peek", face: { e: "sorry", look: [0.1, -0.3] }, lid: 0, k: 1, ph: 0, light }, bx, by + 34 - 74 * Math.min(1.1, mi), 26));
    // the lid flips up on its top hinge (squashes to an edge, then stands up behind the sign)
    const ang = hk * Math.PI * 0.9, c = Math.cos(ang), top = by - r * 0.74;
    const lid = () => { p.ell(bx, top + (r * 0.74) * c * (c > 0 ? 1 : 0.5), r * 1.25, Math.max(3, Math.abs(c) * r * (c > 0 ? 0.95 : 0.45)), c > 0 ? "#d4dcea" : "#8a94a8", 4); if (c > 0.2) p.ell(bx - r * 0.3, top + (r * 0.74) * c - 0.2 * r * c, r * 0.3, r * 0.12 * c, rgba(WHITE, 0.8), 0); };
    if (c <= 0) lid();
    const sg = s.sign ?? 0;
    if (sg > 0.01) local(p, bx - 12, by + 4, -0.06, () => wetSign(p, 116), Math.max(0.01, sg));
    if (sg > 0.01) local(p, bx + 18, by, 0.2, () => gloveArm(p, 58, s.wave ?? 0.3), Math.max(0.01, Math.min(1, sg * 1.1)));
    if (c > 0) lid();
  }
  p.ol = olS;
};

// ======================================================================================================================
// THE TEACHER (standing; 600 x 1000, soles at y 975)
// ======================================================================================================================
export type TeacherS = { look: KidLook; face: FaceS; lid: number; tilt: number; book: number; turn?: number; light: number };
export const T_HEAD: P2 = [300, 205];
export const drawTeacher = (p: Pen, s: TeacherS) => {
  const olS = p.ol; p.ol = 5;
  const L = s.look, a = 92, lt = s.light, turn = s.turn ?? 0, back = Math.abs(turn) >= 0.8;
  for (const sd of [-1, 1]) { limb(p, [[300 + sd * 40, 760], [300 + sd * 46, 945]], "#5a4a5a", 34, 5); p.ell(300 + sd * 54, 952, 40, 18, "#3a2a2a", 5); }
  const skirt: P2[] = [[200, 600], [400, 600], [430, 880], [170, 880]];
  p.poly(skirt, "#7a3a4a", 5);
  p.clip(skirt, () => { for (let i = 0; i < 7; i++) p.stroke([[160 + i * 45, 590], [175 + i * 45, 890]], 6, rgba("#ffd23a", 0.35)); for (let j = 0; j < 6; j++) p.stroke([[150, 630 + j * 45], [450, 630 + j * 45]], 6, rgba("#2a1a2a", 0.3)); });
  p.poly(skirt, null, 5);
  const body = blobPts(300, 460, { a: 125, b: 175, nTop: 2.2, nBot: 3.0, egg: 0.08, asym: 0, rot: 0, noise: 0.01, seed: 61 }, 64);
  p.shadedFill(body, "#e8b23a", "#b07a2a", lt, 130, 0.4);
  p.clip(body, () => {
    if (!back) { p.poly([[262, 280], [338, 280], [316, 640], [284, 640]], "#fff6ea", 4); for (let i = 0; i < 4; i++) p.dot(332, 340 + i * 60, 7, "#8a5a2a"); }
  });
  p.inkRing(body, 5, thickAngle(lt), 0.4);
  p.poly(rrect(300 - 0.25 * a, 250, 300 + 0.25 * a, 300, 12), L.skin, 0);
  if (!back) p.poly([[256, 285], [300, 330], [344, 285], [300, 302]], "#f0e6d8", 3);
  local(p, T_HEAD[0], T_HEAD[1], s.tilt, () => {
    if (back) { headBack(p, L, a, 61, lt); return; }
    hairBack(p, L, a);
    const hp = blobPts(0, 0, headBlob(61, a, 0));
    p.shadedFill(hp, L.skin, mul(L.skin, SH_SKIN), lt, a, 0.4);
    p.inkRing(hp, 5.5, thickAngle(lt), 0.4);
    face(p, s.face, a, L.skin, s.lid, { glasses: "#2a2a3a", nose: L.nose, shift: turn });
    hairFront(p, L, a, lt, turn);
  });
  const bk = s.book, by = lerp(600, 470, bk);
  for (const sd of [-1, 1]) {
    const sh: P2 = [300 + sd * 112, 330], w: P2 = [300 + sd * 92, by + 34];
    limb(p, thru(sh, [300 + sd * 150, (330 + by) / 2 + 20], w, 10), "#e8b23a", 48, 5);
    local(p, w[0], w[1], sd * -0.5, () => drawHand(p, "grip", L.skin, sd > 0), 0.34);
  }
  if (!back) {
    for (const sd of [-1, 1]) p.poly([[300, by - 20], [300 + sd * 122, by - 40 + 12 * (1 - bk)], [300 + sd * 122, by + 72], [300, by + 82]], "#2a6a5a", 5);
    for (const sd of [-1, 1]) { const q: P2[] = [[300, by - 12], [300 + sd * 108, by - 30 + 12 * (1 - bk)], [300 + sd * 108, by + 62], [300, by + 72]]; p.poly(q, "#fffaf0", 3.5); for (let i = 0; i < 4; i++) p.stroke([[300 + sd * 18, by + 4 + i * 15], [300 + sd * 92, by - 8 + i * 15]], 3, rgba(INK, 0.4)); }
  }
  p.ol = olS;
};

// ======================================================================================================================
// THE CREW (stomach-cell janitors) + the FOREMAN. drawCrew(p, s, x0, y0, r): feet centre at (x0, y0), body radius r.
// ======================================================================================================================
export type Tool = "mop" | "broom" | "bucket" | "spray" | "duster" | "clipboard" | "mug" | null;
export type CrewLook = { body: string; hat: "hard" | "cap" | "beanie" | "band" | "boss"; hatCol: string; tool: Tool; boots?: string; moustache?: string; vest?: boolean; seed: number };
export const CREW_LOOKS: CrewLook[] = [
  { body: "#ffe066", hat: "hard", hatCol: "#ff8a1a", tool: "mop", seed: 3 },
  { body: "#8ee8ff", hat: "hard", hatCol: "#ffd21a", tool: "broom", seed: 7 },
  { body: "#c9a8ff", hat: "beanie", hatCol: "#ff5a6a", tool: "bucket", seed: 11 },
  { body: "#9af07a", hat: "cap", hatCol: "#ff4a3a", tool: "spray", seed: 13 },
  { body: "#ffb07a", hat: "band", hatCol: "#3a8aff", tool: "duster", seed: 17 },
];
export const FOREMAN: CrewLook = { body: "#b8c4ff", hat: "boss", hatCol: "#ffffff", tool: "clipboard", moustache: "#5a3a2a", vest: true, seed: 23 };
export type CrewPose = "stand" | "sleep" | "jump" | "surf" | "run" | "ears" | "thumbs" | "squash" | "mug" | "point" | "whistle" | "cheer" | "peek" | "lookup" | "walk" | "blown";
/** k = pose amount / squash, ph = walk / run phase (0..1), board 0..1 (surfboard scale), pizza 0..1 (slice lands) */
export type CrewS = { look: CrewLook; pose: CrewPose; face: FaceS; lid: number; k: number; ph: number; light: number; board?: number; pizza?: number; hold?: Tool; mugUp?: number };
const OVERALL = "#2c5fd0", OVERALL_DK = "#1f428f", BOOT = "#ff4a4a";
type MittK = "open" | "fist" | "thumb" | "point" | "splay";
const toolDraw = (p: Pen, tool: Tool, r: number) => { // local: grip at 0,0
  const ol = Math.max(2.5, r * 0.06);
  switch (tool) {
    case "mop": p.poly(rrect(-0.06 * r, -1.6 * r, 0.06 * r, 0.9 * r, 0.05 * r), "#c8884a", ol);
      p.poly(rrect(-0.3 * r, 0.82 * r, 0.3 * r, 0.98 * r, 0.06 * r), "#8a9ab0", ol);
      for (let i = 0; i < 9; i++) { const x = -0.34 * r + i * 0.085 * r, s = thru([x, 0.95 * r], [x + 0.03 * r * Math.sin(i), 1.2 * r], [x - 0.04 * r + 0.05 * r * Math.sin(i * 2), 1.45 * r], 6); p.stroke(s, 0.09 * r + 2 * ol, INK); p.stroke(s, 0.09 * r, "#f4f0e4"); }
      break;
    case "broom": p.poly(rrect(-0.06 * r, -1.6 * r, 0.06 * r, 0.85 * r, 0.05 * r), "#c8884a", ol);
      p.poly([[-0.2 * r, 0.8 * r], [0.2 * r, 0.8 * r], [0.42 * r, 1.45 * r], [-0.42 * r, 1.45 * r]], "#ffb83a", ol);
      p.poly(rrect(-0.22 * r, 0.72 * r, 0.22 * r, 0.9 * r, 0.05 * r), "#ff4a3a", ol);
      for (let i = 0; i < 6; i++) p.stroke([[-0.3 * r + i * 0.12 * r, 1.0 * r], [-0.36 * r + i * 0.145 * r, 1.4 * r]], ol * 0.7);
      break;
    case "bucket": p.arc(0, 0.25 * r, 0.42 * r, 0.3 * r, 180, 360, ol * 1.2);
      p.poly([[-0.48 * r, 0.25 * r], [0.48 * r, 0.25 * r], [0.38 * r, 0.95 * r], [-0.38 * r, 0.95 * r]], "#a8b4c8", ol);
      p.ell(0, 0.25 * r, 0.48 * r, 0.1 * r, "#5ac8ff", ol);
      p.stroke([[-0.4 * r, 0.5 * r], [0.4 * r, 0.5 * r]], ol, rgba(INK, 0.4));
      break;
    case "spray": p.poly(rrect(-0.2 * r, -0.2 * r, 0.2 * r, 0.6 * r, 0.08 * r), "#4ad0ff", ol);
      p.poly([[-0.12 * r, -0.2 * r], [0.12 * r, -0.2 * r], [0.1 * r, -0.42 * r], [-0.1 * r, -0.42 * r]], "#ffffff", ol);
      p.poly([[0.06 * r, -0.42 * r], [0.36 * r, -0.4 * r], [0.36 * r, -0.3 * r], [0.06 * r, -0.3 * r]], "#ff5a6a", ol);
      p.ell(0, 0.22 * r, 0.12 * r, 0.12 * r, "#ffffff", 0);
      break;
    case "duster": p.poly(rrect(-0.05 * r, -0.2 * r, 0.05 * r, 0.9 * r, 0.04 * r), "#8a5a3a", ol);
      p.poly(puffPts(0, -0.55 * r, 0.32 * r, 0.42 * r, 8, 5, 1.3), "#ff8ad0", ol);
      p.ell(-0.08 * r, -0.65 * r, 0.1 * r, 0.06 * r, rgba(WHITE, 0.7), 0);
      break;
    case "clipboard": p.poly(rrect(-0.42 * r, -0.62 * r, 0.42 * r, 0.5 * r, 0.05 * r), "#c8884a", ol);
      p.poly(rrect(-0.35 * r, -0.52 * r, 0.35 * r, 0.42 * r, 0.02 * r), WHITE, ol * 0.8);
      p.poly(rrect(-0.15 * r, -0.7 * r, 0.15 * r, -0.52 * r, 0.04 * r), "#9aa4b4", ol);
      for (let i = 0; i < 4; i++) { p.stroke([[-0.18 * r, -0.36 * r + i * 0.2 * r], [0.26 * r, -0.36 * r + i * 0.2 * r]], ol * 0.6, rgba(INK, 0.5)); p.stroke([[-0.3 * r, -0.38 * r + i * 0.2 * r], [-0.26 * r, -0.33 * r + i * 0.2 * r], [-0.2 * r, -0.43 * r + i * 0.2 * r]], ol * 0.7, "#2aa04a"); }
      break;
    case "mug": p.ell(0.3 * r, 0, 0.11 * r, 0.14 * r, null, ol * 1.6);
      p.poly(rrect(-0.24 * r, -0.28 * r, 0.24 * r, 0.26 * r, 0.06 * r), "#ff6a8a", ol);
      p.ell(0, -0.27 * r, 0.22 * r, 0.05 * r, "#6a3a24", ol * 0.6);
      letter(p, "#1", 0, 0, 0.2 * r, WHITE, 0, 0);
      break;
  }
};
const hatDraw = (p: Pen, L: CrewLook, C: P2, r: number, light: number) => {
  const ol = Math.max(3, r * 0.05), c = L.hatCol, dk = mul(c, [0.78, 0.74, 0.8]), top = C[1] - 0.78 * r;
  switch (L.hat) {
    case "hard": case "boss": {
      const dome = [...thru([C[0] - 0.7 * r, top + 0.22 * r], [C[0] - 0.55 * r, top - 0.42 * r], [C[0], top - 0.5 * r], 10), ...thru([C[0], top - 0.5 * r], [C[0] + 0.55 * r, top - 0.42 * r], [C[0] + 0.7 * r, top + 0.22 * r], 10).slice(1)];
      p.gradFill(dome, c, dk, light, 0.3); p.poly(dome, null, ol);
      p.poly(rrect(C[0] - 0.12 * r, top - 0.5 * r, C[0] + 0.12 * r, top + 0.2 * r, 0.06 * r), mul(c, [0.9, 0.88, 0.9]), ol * 0.8);
      p.poly(rrect(C[0] - 0.88 * r, top + 0.14 * r, C[0] + 0.88 * r, top + 0.3 * r, 0.08 * r), c, ol);
      p.ell(C[0] - 0.36 * r, top - 0.22 * r, 0.14 * r, 0.07 * r, rgba(WHITE, 0.6), 0, 0, 360, -25);
      if (L.hat === "boss") { p.poly(rrect(C[0] - 0.64 * r, top - 0.06 * r, C[0] + 0.64 * r, top + 0.13 * r, 0.04 * r), "#ff4a3a", ol * 0.6); letter(p, "BOSS", C[0], top + 0.04 * r, 0.16 * r, WHITE, 0.03 * r); }
      break;
    }
    case "cap": {
      const dome = [...thru([C[0] - 0.68 * r, top + 0.2 * r], [C[0] - 0.5 * r, top - 0.36 * r], [C[0], top - 0.42 * r], 10), ...thru([C[0], top - 0.42 * r], [C[0] + 0.5 * r, top - 0.36 * r], [C[0] + 0.68 * r, top + 0.2 * r], 10).slice(1)];
      p.poly([[C[0] - 0.1 * r, top + 0.14 * r], [C[0] - 1.1 * r, top + 0.04 * r], [C[0] - 1.05 * r, top + 0.24 * r], [C[0] - 0.1 * r, top + 0.28 * r]], dk, ol);
      p.gradFill(dome, c, dk, light, 0.3); p.poly(dome, null, ol);
      p.ell(C[0], top - 0.42 * r, 0.08 * r, 0.05 * r, WHITE, ol * 0.7);
      break;
    }
    case "beanie": {
      const pts = [...thru([C[0] - 0.72 * r, top + 0.25 * r], [C[0] - 0.5 * r, top - 0.45 * r], [C[0] + 0.05 * r, top - 0.5 * r], 10), ...thru([C[0] + 0.05 * r, top - 0.5 * r], [C[0] + 0.55 * r, top - 0.4 * r], [C[0] + 0.72 * r, top + 0.25 * r], 10).slice(1)];
      p.gradFill(pts, c, dk, light, 0.3); p.poly(pts, null, ol);
      p.poly(rrect(C[0] - 0.76 * r, top + 0.1 * r, C[0] + 0.76 * r, top + 0.32 * r, 0.1 * r), mul(c, [0.85, 0.85, 0.9]), ol);
      p.poly(puffPts(C[0] + 0.05 * r, top - 0.56 * r, 0.18 * r, 0.15 * r, 7, 3), WHITE, ol);
      break;
    }
    case "band": {
      p.poly(rrect(C[0] - 0.8 * r, top + 0.05 * r, C[0] + 0.8 * r, top + 0.26 * r, 0.1 * r), c, ol);
      for (let i = 0; i < 4; i++) p.dot(C[0] - 0.55 * r + i * 0.36 * r, top + 0.15 * r, 0.035 * r, WHITE);
      p.poly([[C[0] + 0.72 * r, top + 0.14 * r], [C[0] + 1.02 * r, top - 0.04 * r], [C[0] + 0.96 * r, top + 0.2 * r]], c, ol);
      p.poly([[C[0] + 0.72 * r, top + 0.16 * r], [C[0] + 1.0 * r, top + 0.36 * r], [C[0] + 0.8 * r, top + 0.36 * r]], c, ol);
      break;
    }
  }
};
export const drawCrew = (p: Pen, s: CrewS, x0: number, y0: number, r: number) => {
  const L = s.look, ol = Math.max(3, r * 0.05), g = p.g, k = s.k, ph = s.ph, light = s.light;
  const dk = mul(L.body, [0.84, 0.76, 0.86]);
  let lean = 0, sqY = 1, lift = 0.42 * r;
  let legs: [P2, P2] = [[-0.32 * r, 0], [0.32 * r, 0]];
  let hands: [P2, P2] = [[-1.05 * r, 0.45 * r], [1.05 * r, 0.45 * r]], kinds: [MittK, MittK] = ["fist", "fist"];
  let hold: Tool = s.hold !== undefined ? s.hold : L.tool, holdSide = 1, toolRot = 0, toolBack = false;
  switch (s.pose) {
    case "stand": break;
    case "walk": { const w = Math.sin(ph * Math.PI * 2); legs = [[-0.32 * r + 0.2 * r * w, -0.08 * r * Math.max(0, w)], [0.32 * r - 0.2 * r * w, -0.08 * r * Math.max(0, -w)]]; lean = 0.04 * w; break; }
    case "jump": sqY = 1 + 0.18 * k; hands = [[-1.1 * r, -1.15 * r], [1.1 * r, -1.15 * r]]; kinds = ["splay", "splay"]; legs = [[-0.36 * r, -0.12 * r], [0.36 * r, -0.12 * r]]; hold = null; break;
    case "cheer": hands = [[-1.05 * r, -1.2 * r], [1.05 * r, -1.2 * r]]; kinds = ["open", "fist"]; toolRot = -0.3; break;
    case "surf": sqY = 0.9; lean = -0.12 + 0.05 * Math.sin(ph * 6); hands = [[-1.55 * r, -0.25 * r], [1.5 * r, -0.45 * r]]; kinds = ["splay", "splay"]; legs = [[-0.5 * r, 0], [0.5 * r, 0]]; lift = 0.36 * r; hold = null; break;
    case "run": { const w = Math.sin(ph * Math.PI * 2); lean = 0.32; legs = [[-0.1 * r + 0.55 * r * w, -0.15 * r * Math.max(0, w)], [0.1 * r - 0.55 * r * w, -0.15 * r * Math.max(0, -w)]]; hands = [[-0.9 * r - 0.3 * r * w, 0.15 * r], [0.95 * r, -0.1 * r]]; toolRot = -1.1; toolBack = true; break; }
    case "ears": hands = [[-0.98 * r, -0.2 * r], [0.98 * r, -0.2 * r]]; kinds = ["open", "open"]; hold = null; sqY = 0.94; break;
    case "blown": lean = -0.28; hands = [[-1.3 * r, -0.8 * r], [1.3 * r, -0.7 * r]]; kinds = ["splay", "splay"]; hold = null; break;
    case "thumbs": hands = [[-1.05 * r, 0.45 * r], [1.25 * r, -0.55 * r]]; kinds = ["fist", "thumb"]; hold = null; break;
    case "squash": sqY = lerp(1, 0.72, k); hands = [[-1.35 * r, 0.3 * r], s.face.e === "grin" ? [1.05 * r, -1.75 * r] : [1.4 * r, -0.35 * r]]; kinds = ["splay", s.face.e === "grin" ? "thumb" : "splay"]; hold = null; break;
    case "mug": hands = [[-1.0 * r, 0.45 * r], [0.42 * r, lerp(0.42, 0.22, s.mugUp ?? 0) * r]]; hold = "mug"; break;
    case "point": hands = [[-0.85 * r, 0.25 * r], [1.65 * r, -1.05 * r]]; kinds = ["fist", "point"]; holdSide = 0; break;
    case "whistle": hands = [[-0.85 * r, 0.25 * r], [0.34 * r, 0.2 * r]]; kinds = ["fist", "fist"]; holdSide = 0; break;
    case "lookup": hands = [[-1.2 * r, -0.4 * r], [1.2 * r, -0.4 * r]]; kinds = ["splay", "splay"]; hold = null; break;
    case "peek": hands = [[-1.0 * r, -0.15 * r], [0.95 * r, -0.75 * r]]; kinds = ["open", "open"]; hold = null; break;
    case "sleep": hands = [[-0.4 * r, 0.3 * r], [0.4 * r, 0.3 * r]]; kinds = ["fist", "fist"]; hold = null; break;
  }
  g.save(); g.translate(x0, y0);
  if (s.pose === "sleep") { g.translate(0, -0.95 * r); g.rotate(-Math.PI / 2 + 0.12); g.translate(0, 1.25 * r); }
  g.rotate(lean); g.scale(1 / Math.sqrt(sqY), sqY);
  const C: P2 = [0, -lift - 0.92 * r];
  const sh: [P2, P2] = [[-0.86 * r, C[1] + 0.1 * r], [0.86 * r, C[1] + 0.1 * r]];
  if ((s.board ?? 0) > 0.01) local(p, 0, 0.04 * r, 0, () => { // surfboard under the feet
    const bp = ellPts(0, 0, 1.5 * r, 0.2 * r, 40); p.poly(bp, "#ff6a9a", ol);
    p.clip(bp, () => { p.poly([[-0.25 * r, -r], [0.05 * r, -r], [0.05 * r, r], [-0.25 * r, r]], "#ffffff", 0); p.ell(0.5 * r, 0.12 * r, 1.4 * r, 0.1 * r, rgba(INK, 0.15), 0); });
    p.poly(bp, null, ol);
  }, s.board!);
  const grip = (i: number): P2 => [C[0] + hands[i][0], C[1] + hands[i][1]];
  if (hold && toolBack) local(p, grip(1)[0], grip(1)[1], toolRot, () => toolDraw(p, hold, r));
  legs.forEach((F, i) => {
    const hip: P2 = [(i ? 0.3 : -0.3) * r, C[1] + 0.7 * r], foot: P2 = [F[0], F[1] - 0.12 * r];
    limb(p, [hip, foot], OVERALL_DK, 0.34 * r, ol);
    p.poly(rrect(foot[0] - 0.2 * r, foot[1] - 0.26 * r, foot[0] + 0.2 * r, foot[1] + 0.04 * r, 0.06 * r), L.boots ?? BOOT, ol);
    p.ell(foot[0] + (i ? 0.08 : -0.08) * r, foot[1] + 0.06 * r, 0.3 * r, 0.13 * r, L.boots ?? BOOT, ol);
  });
  const bp = blobPts(C[0], C[1], { a: r, b: r * 0.95, nTop: 2.1, nBot: 2.4, egg: 0.1, asym: 0, rot: 0, noise: 0.012, seed: L.seed }, 64);
  p.shadedFill(bp, L.body, dk, light, r, 0.4);
  p.clip(bp, () => {
    for (let i = 0; i < 5; i++) p.ell(C[0] + (rnd(L.seed, i) - 0.5) * 1.4 * r, C[1] + (rnd(L.seed, i + 9) - 0.6) * 0.9 * r, 0.06 * r, 0.05 * r, rgba(WHITE, 0.45), 0);
    const bibTop = C[1] + 0.12 * r;
    p.poly([[C[0] - 2 * r, bibTop + 0.28 * r], [C[0] - 0.5 * r, bibTop + 0.28 * r], [C[0] - 0.46 * r, bibTop], [C[0] + 0.46 * r, bibTop], [C[0] + 0.5 * r, bibTop + 0.28 * r], [C[0] + 2 * r, bibTop + 0.28 * r], [C[0] + 2 * r, C[1] + 2 * r], [C[0] - 2 * r, C[1] + 2 * r]], OVERALL, ol);
    for (const sd of [-1, 1]) { p.poly([[C[0] + sd * 0.46 * r, bibTop + 0.04 * r], [C[0] + sd * 0.3 * r, bibTop + 0.04 * r], [C[0] + sd * 0.62 * r, C[1] - 0.6 * r], [C[0] + sd * 0.8 * r, C[1] - 0.55 * r]], OVERALL, ol); p.dot(C[0] + sd * 0.38 * r, bibTop + 0.1 * r, 0.05 * r, "#ffd23a"); }
    p.ell(C[0], bibTop + 0.34 * r, 0.14 * r, 0.14 * r, "#ffd23a", ol * 0.8); p.ell(C[0] - 0.03 * r, bibTop + 0.32 * r, 0.05 * r, 0.05 * r, "#8ee8ff", 0);
    if (L.vest) { for (const sd of [-1, 1]) p.poly([[C[0] + sd * 0.5 * r, C[1] - 0.7 * r], [C[0] + sd * 2 * r, C[1] - 0.7 * r], [C[0] + sd * 2 * r, C[1] + 2 * r], [C[0] + sd * 0.55 * r, C[1] + 2 * r]], "#ff8a1a", ol); for (const sd of [-1, 1]) p.poly([[C[0] + sd * 0.56 * r, C[1] + 0.34 * r], [C[0] + sd * 2 * r, C[1] + 0.34 * r], [C[0] + sd * 2 * r, C[1] + 0.46 * r], [C[0] + sd * 0.56 * r, C[1] + 0.46 * r]], "#e8f0ff", 0); }
    p.ell(C[0] - 0.42 * r, C[1] - 0.5 * r, 0.24 * r, 0.12 * r, rgba(WHITE, 0.55), 0, 0, 360, -30);
  });
  p.inkRing(bp, Math.max(4, r * 0.06), thickAngle(light), 0.4);
  local(p, C[0], C[1] - 0.26 * r, 0, () => face(p, s.face, 0.7 * r, L.body, s.lid, { nose: L.vest ? "#ff8a8a" : mul(L.body, [1, 0.8, 0.85]), moustache: L.moustache }));
  if (s.pose === "whistle") {
    p.stroke(thru([C[0] - 0.55 * r, C[1] - 0.3 * r], [C[0] - 0.15 * r, C[1] + 0.55 * r], [C[0] + 0.25 * r, C[1] + 0.12 * r], 8), ol, "#ff4a3a");
    local(p, C[0] + 0.1 * r, C[1] + 0.1 * r, 0.25, () => { p.poly(rrect(-0.04 * r, -0.08 * r, 0.3 * r, 0.08 * r, 0.04 * r), "#c8d0e0", ol); p.ell(0.32 * r, 0.06 * r, 0.12 * r, 0.12 * r, "#c8d0e0", ol); });
  }
  hatDraw(p, L, C, r, light);
  for (const i of [0, 1]) {
    const S = sh[i], H = grip(i), M: P2 = [(S[0] + H[0]) / 2 + (i ? 0.12 : -0.12) * r, (S[1] + H[1]) / 2 + 0.1 * r];
    if (hold && !toolBack && i === holdSide) local(p, H[0], H[1], toolRot + (i ? 0.08 : -0.08), () => toolDraw(p, hold, r));
    limb(p, thru(S, M, H, 8), L.body, 0.2 * r, ol);
    const ang = Math.atan2(H[0] - M[0], -(H[1] - M[1]));
    local(p, H[0], H[1], kinds[i] === "thumb" ? 0 : ang, () => mitt(p, 0.24 * r, kinds[i], "#ffd23a"));
  }
  if ((s.pizza ?? 0) > 0.01) { // the pizza slice that lands on the squashed crew member (shot 3): tip to the left, cheese drips
    const pk = s.pizza!, py = C[1] - 0.92 * r - (1 - pk) * 3.2 * r; // (QA2) rests on his HAT (was -0.62 r: it covered his face)
    local(p, C[0] + 0.1 * r, py, -0.12, () => {
      const sl: P2[] = [[-1.75 * r, 0.25 * r], [1.25 * r, -0.75 * r], [1.45 * r, -0.25 * r], [1.3 * r, 0.4 * r]];
      p.poly([[1.15 * r, -0.85 * r], [1.62 * r, -0.3 * r], [1.48 * r, 0.5 * r], [1.2 * r, 0.42 * r], [1.32 * r, -0.28 * r]], "#d8903a", ol); // crust
      p.poly(sl, "#ffd25a", ol);
      p.clip(sl, () => {
        p.poly([[-1.75 * r, 0.25 * r], [1.3 * r, 0.4 * r], [1.3 * r, 0.6 * r], [-1.75 * r, 0.45 * r]], "#ffb83a", 0);
        for (const [x, y] of [[-0.6, 0.1], [0.3, -0.25], [0.75, 0.12], [0.05, 0.22]] as P2[]) { p.ell(x * r, y * r, 0.2 * r, 0.17 * r, "#e8403a", ol * 0.6); p.dot(x * r - 0.06 * r, y * r - 0.05 * r, 0.04 * r, rgba(WHITE, 0.7)); }
      });
      for (let i = 0; i < 4; i++) { if (i === 1 || i === 2) continue; /* (QA2) no drips over his eyes */ const x = -1.1 * r + i * 0.62 * r, y0 = 0.27 * r + 0.03 * r * i, L = (0.3 + 0.18 * (i % 2)) * r; p.poly([[x - 0.08 * r, y0], [x + 0.08 * r, y0], [x + 0.06 * r, y0 + L], [x - 0.06 * r, y0 + L]], "#ffd25a", 0); p.ell(x, y0 + L, 0.09 * r, 0.1 * r, "#ffd25a", 0); p.stroke([[x - 0.08 * r, y0 + 0.02 * r], [x - 0.07 * r, y0 + L]], ol * 0.8); p.stroke([[x + 0.08 * r, y0 + 0.02 * r], [x + 0.07 * r, y0 + L]], ol * 0.8); p.arc(x, y0 + L, 0.09 * r, 0.1 * r, 0, 180, ol * 0.8); }
    });
  }
  g.restore();
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
export const fxSpeed = (p: Pen) => { for (const [x, y0, l] of [[50, 30, 420], [128, 90, 380], [206, 50, 440]] as const) { p.stroke([[x, y0], [x, y0 + l]], 30, INK); p.stroke([[x, y0 + 6], [x, y0 + l - 6]], 14, WHITE); } };
/** a dust puff (256 x 256) */
export const fxPuff = (p: Pen, col: string) => { p.poly(puffPts(128, 128, 104, 84, 8, 7), col, 8); p.ell(150, 150, 50, 30, mul(col, [0.88, 0.86, 0.9]), 0); };
/** ZZZ letter (256 x 256) */
export const fxZ = (p: Pen) => letter(p, "Z", 128, 128, 210, "#bfe6ff", 30, 0);
/** rumble wobble lines ")))" (256 x 256) */
export const fxWobble = (p: Pen) => { for (let i = 0; i < 3; i++) { const pts = thru([60 + i * 52, 40 + i * 10], [100 + i * 58, 128], [60 + i * 52, 216 - i * 10], 12); p.stroke(pts, 28 - i * 4, INK); p.stroke(pts, 12 - i * 2, WHITE); } };
/** a comic word card (800 x 400): grrr (wobbly letters), ring (RING! burst), tweet (whistle blast), mmf (muffled soft
 *  bubble), sorry (tiny speech bubble) */
export const fxWord = (p: Pen, word: string, style: "grrr" | "ring" | "tweet" | "mmf" | "sorry", ph = 0) => {
  if (style === "grrr") {
    const n = word.length;
    for (let i = 0; i < n; i++) local(p, 130 + i * (540 / Math.max(1, n - 1)), 200 + 26 * Math.sin(ph * 2 + i * 1.3), 0.18 * Math.sin(ph * 3 + i), () => letter(p, word[i], 0, 0, 200, i % 2 ? "#b07aff" : "#ff8a5a", 30, 10));
  } else if (style === "ring") {
    p.poly(starPts(400, 200, 196, 14, 0.72, 0.1 + ph), "#ffe14a", 14);
    letter(p, word, 400, 205, 116, "#ff3a4a", 22, 0, 600);
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) p.stroke([[400 + sd * (300 + i * 26), 200 - 90 + i * 90], [400 + sd * (350 + i * 30), 200 - 120 + i * 120]], 14);
  } else if (style === "tweet") {
    p.poly(starPts(400, 200, 196, 11, 0.6, 0.2), "#e8f8ff", 14);
    p.poly(starPts(400, 200, 140, 11, 0.66, 0.4), "#7ad8ff", 0);
    letter(p, word, 400, 206, 128, WHITE, 24, 0, 620);
  } else if (style === "mmf") {
    p.poly(puffPts(400, 200, 280, 150, 10, 3, 1.1), "#fff0f4", 12);
    p.ell(330, 140, 70, 26, rgba(WHITE, 0.9), 0, 0, 360, -12);
    letter(p, word, 400, 215, 150, "#c890a8", 0, 0, 440, 700);
  } else {
    const pill = rrect(130, 90, 670, 290, 100, 10);
    p.poly([[270, 280], [200, 380], [340, 286]], WHITE, 12);
    p.poly(pill, WHITE, 12);
    letter(p, word, 400, 192, 120, "#5a4a8a", 0, 0, 480, 700);
  }
};
/** the big GRRROWL letters (1600 x 640): chunky, every letter wobbles / jumps (ph); a = alpha (echo copies) */
export const fxGrowl = (p: Pen, word: string, ph: number, a = 1, hot = false) => {
  alpha(p, a, () => {
    const n = word.length, step = 1440 / n;
    for (let i = 0; i < n; i++) {
      // (QA2) hot (the hall peak): TALL condensed glyphs that fill the card's height (they were ~30 % of it: read small)
      const s0 = hot ? 400 : Math.min(step * 1.22, 330), wob = hot ? 26 : 40;
      const x = 80 + step * (i + 0.5), y = 330 + wob * Math.sin(ph * 2.2 + i * 0.9), rot = (hot ? 0.1 : 0.16) * Math.sin(ph * 3.1 + i * 1.7), sz = s0 + 0.1 * s0 * Math.sin(ph * 1.7 + i * 2.3);
      local(p, x, y, rot, () => {
        const g = p.g; g.save(); if (hot) g.scale(0.56, 1); g.font = `900 ${sz}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
        g.lineWidth = 64; g.strokeStyle = WHITE; g.strokeText(word[i], 0, 0);
        g.lineWidth = 40; g.strokeStyle = INK; g.strokeText(word[i], 0, 0);
        const gr = g.createLinearGradient(0, -sz / 2, 0, sz / 2);
        gr.addColorStop(0, hot ? "#ffe14a" : "#ffc03a"); gr.addColorStop(0.55, hot ? "#ff6a2a" : "#ff7a3a"); gr.addColorStop(1, hot ? "#d81a3a" : "#d83a6a");
        g.fillStyle = gr; g.fillText(word[i], 0, 0);
        g.restore();
      });
    }
  });
};
/** a jagged shockwave ring (soft, 1024 x 1024) */
export const fxShock = (p: Pen, col: string, a: number) => {
  const pts: P2[] = [];
  for (let i = 0; i < 48; i++) { const an = (i / 48) * Math.PI * 2, r = 440 + (i % 2 ? 36 : -20) * (0.6 + 0.4 * rnd(5, i)); pts.push([512 + Math.cos(an) * r, 512 + Math.sin(an) * r]); }
  const g = p.g; g.save(); g.lineJoin = "round";
  p.path(pts, true); g.lineWidth = 56; g.strokeStyle = rgba(col, 0.4 * a); g.stroke();
  p.path(pts, true); g.lineWidth = 20; g.strokeStyle = rgba(WHITE, 0.85 * a); g.stroke();
  g.restore();
};
/** a soft radial glow (256 x 256) */
export const fxGlow = (p: Pen, col: string, a: number) => glow(p, 128, 128, 126, col, a);
/** juice spray droplets (256 x 256) */
export const fxSpray = (p: Pen, seed: number) => {
  p.poly(puffPts(128, 196, 104, 44, 7, seed), "#e8ffb8", 7);
  for (let i = 0; i < 7; i++) { const x = 40 + 176 * rnd(seed, i), y = 50 + 140 * rnd(seed, i + 7), r = 10 + 16 * rnd(seed, i + 3); p.ell(x, y, r, r * 1.1, i % 3 ? "#c8f06a" : "#f4ffb0", 6); }
};
/** coffee steam wisp (soft, 256 x 256) */
export const fxSteam = (p: Pen, seed: number) => {
  const s: P2[] = []; for (let i = 0; i <= 20; i++) s.push([128 + 34 * Math.sin(i * 0.5 + seed), 230 - i * 10]);
  p.stroke(s, 26, rgba(WHITE, 0.55)); p.stroke(s, 10, rgba(WHITE, 0.85));
};
/** a single pencil (128 x 512) for the dropped-pencil gag */
export const fxPencil = (p: Pen) => local(p, 64, 256, 0, () => pencil(p, 470));
/** hot rays behind BEAN at the peak (soft, 1024 x 1024) */
export const fxRays = (p: Pen, c0: string, c1: string, a = 0.5) => {
  for (let i = 0; i < 22; i++) { const a0 = (i / 22) * Math.PI * 2, a1 = a0 + Math.PI / 22; p.poly([[512, 512], [512 + Math.cos(a0) * 512, 512 + Math.sin(a0) * 512], [512 + Math.cos(a1) * 512, 512 + Math.sin(a1) * 512]], rgba(i % 2 ? c0 : c1, a), 0); }
  glow(p, 512, 512, 380, "#ffffff", 0.3);
};
/** a flying exam paper (256 x 320) */
export const fxPaper = (p: Pen) => { const pg = rrect(30, 20, 226, 300, 8); p.poly(pg, "#fffaf0", 8); for (let i = 0; i < 7; i++) p.stroke([[60, 70 + i * 30], [196 - (i % 3) * 20, 70 + i * 30]], 6, rgba(INK, 0.35)); };
/** impact star (512 x 512) */
export const fxImpact = (p: Pen, col: string) => { p.poly(starPts(256, 256, 240, 11, 0.55, 0.2), col, 14); p.poly(starPts(256, 256, 150, 11, 0.6, 0.4), WHITE, 0); };
