// OWNER: cast agent. Drawings for "Why We Say Ow": our own STANDING bean-head figures (bridge Pen style: bean heads,
// thick-thin plum ink, painted crescents; built on the burp astronaut drawing) and every effect card (OW burst, speech
// bubbles, censor bar, grawlix, shiver lines, cold puffs, steam, tears, sweat, stars, "!" "?" pops, headphone "ow").
// Design space 600 x 1000 units per card (bridge: 1000 units = 2.16 m). The card origin (canvas 300, 975) is the point
// between the feet ON the ground. Standing head centre canvas y 300 (1.46 m), mouth y 350 (1.35 m), crown ~ y 185.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, Blob } from "../bridge/toon";

export type P2 = [number, number];
const WHITE = "#ffffff", MOUTH = "#5a1e28", TONGUE = "#e86e78";
const rad = (d: number) => (d * Math.PI) / 180;
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: P2, b: P2, t: number): P2 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const curve = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], out: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; out.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return out;
};
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 40, rot = 0): P2[] => {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = rx * Math.cos(a), y = ry * Math.sin(a); out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]); }
  return out;
};
const scalePts = (pts: P2[], k: number): P2[] => {
  let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x / pts.length; cy += y / pts.length; }
  return pts.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
const taper = (p: Pen, a: P2, b: P2, wa: number, wb: number, col = INK) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  p.poly([[a[0] + nx * wa / 2, a[1] + ny * wa / 2], [b[0] + nx * wb / 2, b[1] + ny * wb / 2], [b[0] - nx * wb / 2, b[1] - ny * wb / 2], [a[0] - nx * wa / 2, a[1] - ny * wa / 2]], col, 0);
  p.dot(a[0], a[1], wa / 2, col); p.dot(b[0], b[1], wb / 2, col);
};
const clipMany = (p: Pen, parts: P2[][], fn: () => void) => {
  const g = p.g; g.save(); g.beginPath();
  for (const pts of parts) { pts.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
  g.clip("nonzero"); fn(); g.restore();
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const rrect = (x0: number, y0: number, x1: number, y1: number, r: number, n = 6): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= n; i++) pts.push([cx + r * Math.cos(rad(a + (90 * i) / n)), cy + r * Math.sin(rad(a + (90 * i) / n))]);
  return pts;
};
const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84], SH_CLOTH: [number, number, number] = [0.64, 0.66, 0.74], SH_HAIR: [number, number, number] = [0.62, 0.62, 0.7];
const FONT = "Arial Black, Arial, sans-serif";
/** bold comic text with an ink rim (+ optional white rim outside the ink) */
const text = (p: Pen, s: string, x: number, y: number, size: number, fill: string, ink = size * 0.16, white = 0, maxW?: number) => {
  const g = p.g; g.save(); g.font = `900 ${size}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  if (white) { g.lineWidth = ink + 2 * white; g.strokeStyle = WHITE; g.strokeText(s, x, y, maxW); }
  g.lineWidth = ink; g.strokeStyle = INK; g.strokeText(s, x, y, maxW); g.fillStyle = fill; g.fillText(s, x, y, maxW); g.restore();
};

// ---------------- characters ----------------
export type HairStyle = "bed" | "tuft" | "flop" | "curly" | "bun" | "bob" | "bald" | "crop" | "swoop" | "long";
export type Top = "pj" | "tee" | "polo" | "sweater" | "stripes" | "breton" | "hoodie" | "shirt";
export type Hat = "beret" | "flatcap" | "captain" | "beanie" | "flower";
export type Kit = {
  seed: number; skin: string; hair: string; style: HairStyle; top: Top; shirt: string; stripe?: string; pants: string; shoes: string;
  slippers?: boolean; coat?: boolean; hat?: Hat; hatCol?: string; moustache?: string; beard?: string; glasses?: "round" | "square";
  scarf?: string; scarf2?: string; anchor?: boolean; earring?: boolean; brows?: string;
};
export type Pose = {
  /** ankle points (canvas units) [screen-left foot, screen-right foot] */
  feet: [P2, P2];
  /** hand targets (canvas units, absolute) [screen-left, screen-right]; front = drawn over the torso */
  hands: [P2, P2]; front?: [boolean, boolean];
  /** whole figure raised (canvas units) */
  lift?: number;
  /** upper body lean about the hips (rad, + = clockwise on screen) */
  lean?: number;
  /** extra head tilt (deg) */
  headTilt?: number;
  /** stubbed toe: -1 screen-left foot, 1 screen-right foot (red, swollen, throbbing) */
  toe?: number; throb?: number;
  /** fingers blue with cold 0..1 */
  blue?: number;
  /** spread fingers per hand (drama / gesture) */
  open?: [boolean, boolean];
  /** squash & stretch on the whole card about the feet (1 = none) */
  sy?: number;
};
export type Face = "neutral" | "sleepy" | "content" | "sip" | "shock" | "pain" | "ow" | "drama" | "peek" | "relief" | "worried" | "cold"
  | "deadpan" | "defeated" | "proud" | "evil" | "sly" | "serious" | "intense" | "wow" | "strain" | "meme" | "memeAfter" | "rage" | "swear"
  | "fouch" | "sheepish" | "bored" | "grumpy" | "mutter" | "smile" | "point" | "look";
export type FaceS = { e: Face; k?: number; look?: number; shake?: number };

const HEAD_A = 118;
export const LAYOUT = { hc: 300, chin: 403, top: 349, tbot: 612, hipY: 592, sh: [[224, 429], [376, 429]] as [P2, P2], crown: 185 };
/** mouth centre below the head centre, in head units u (u = 2.36 canvas units) */
export const MOUTH_DY = 21;
const ARM1 = 94, ARM2 = 90, THIGH = 186, SHIN = 186;

// --- hair ---
const capHair = (p: Pen, hp: P2[], cx: number, hc: number, H: Blob, cutK: number, col: string, light: number, thick: number, u: number, scallop = 4) => {
  const n = hp.length, cut = hc - cutK * H.b, run: P2[] = [];
  for (let i = Math.floor(n / 2); i < n; i++) if (hp[i][1] < cut) run.push([cx + (hp[i][0] - cx) * 1.045, hc + (hp[i][1] - hc) * 1.045]);
  if (run.length < 4) return run;
  const [x0, y0] = run[run.length - 1], [x1, y1] = run[0];
  for (let i = 1; i < 8; i++) run.push([x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8 + (i % 2 ? scallop * u : 0)]);
  p.shadedFill(run, col, mul(col, SH_HAIR), light, H.a, 0.35);
  p.clip(run, () => { const a = (light * 180) / Math.PI; p.arc(cx, hc - 2 * u, 0.84 * H.a, 0.8 * H.b, a - 22, a + 22, 3.4 * u, mix(col, WHITE, 0.32)); });
  p.inkRing(run, 4.2 * u, thick, 0.45);
  return run;
};
const hairBehind = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, light: number, thick: number, u: number, spikes: number) => {
  if (k.style === "bed" || spikes > 0) { // bed hair: wild spikes (they stand on end with rage)
    const n = 9, up = 1 + spikes * 0.7;
    for (let i = 0; i < n; i++) {
      const a = rad(200 + (i / (n - 1)) * 140 + (rnd(k.seed, i) - 0.5) * 10), L = (22 + 20 * rnd(k.seed, i + 3)) * u * up;
      const b0 = a - rad(9), b1 = a + rad(9);
      const base0: P2 = [cx + Math.cos(b0) * H.a * 0.92, hc + Math.sin(b0) * H.b * 0.92], base1: P2 = [cx + Math.cos(b1) * H.a * 0.92, hc + Math.sin(b1) * H.b * 0.92];
      const tip: P2 = [cx + Math.cos(a + (rnd(k.seed, i + 7) - 0.5) * 0.3) * (H.a + L), hc + Math.sin(a) * (H.b + L)];
      p.poly([base0, tip, base1], k.hair, 4 * u);
    }
  }
  if (k.style === "curly") {
    for (let i = 0; i < 9; i++) {
      const a = rad(185 + (i / 8) * 170), x = cx + Math.cos(a) * H.a * 1.0, y = hc + Math.sin(a) * H.b * 1.0;
      const pt = ellPts(x, y, 15 * u, 14 * u, 22);
      p.inkRing(pt, 4 * u, thick, 0.4); p.poly(scalePts(pt, 0.94), k.hair, 0);
    }
  } else if (k.style === "bun") {
    const pt = ellPts(cx + 0.1 * H.a, hc - H.b * 1.02, 30 * u, 26 * u, 30);
    p.inkRing(pt, 4.4 * u, thick); p.shadedFill(pt, k.hair, mul(k.hair, SH_HAIR), light, 30 * u);
  } else if (k.style === "bob" || k.style === "long") {
    const L = k.style === "long" ? 1.25 : 0.62;
    const pts: P2[] = [[cx - 1.12 * H.a, hc - 0.2 * H.b], [cx - 1.1 * H.a, hc + L * H.b], [cx - 0.7 * H.a, hc + (L + 0.06) * H.b], [cx + 0.7 * H.a, hc + (L + 0.06) * H.b], [cx + 1.1 * H.a, hc + L * H.b], [cx + 1.12 * H.a, hc - 0.2 * H.b], [cx, hc - 1.1 * H.b]];
    p.poly(pts, mul(k.hair, [0.82, 0.82, 0.86]), 4.4 * u);
  }
};
const hairFront = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, light: number, thick: number, u: number) => {
  const dk = mul(k.hair, [0.6, 0.58, 0.64]);
  switch (k.style) {
    case "bed": capHair(p, hp, cx, hc, H, 0.48, k.hair, light, thick, u, 7);
      p.line(curve([cx + 10 * u, hc - H.b + 6 * u], [cx + 26 * u, hc - H.b - 16 * u], [cx + 8 * u, hc - H.b - 34 * u], 12), k.hair, 6 * u); break;
    case "tuft": case "flop":
      capHair(p, hp, cx, hc, H, 0.42, k.hair, light, thick, u, 5);
      if (k.style === "flop") p.line(curve([cx + 4 * u, hc - H.b + 8 * u], [cx + 22 * u, hc - H.b + 10 * u], [cx + 28 * u, hc - 0.5 * H.b], 10), k.hair, 6 * u);
      else p.line(curve([cx - 10 * u, hc - H.b + 6 * u], [cx - 22 * u, hc - H.b - 14 * u], [cx - 32 * u, hc - H.b - 18 * u], 10), k.hair, 5 * u);
      break;
    case "curly": capHair(p, hp, cx, hc, H, 0.5, k.hair, light, thick, u, 6);
      for (let i = 0; i < 5; i++) p.arc(cx + (i - 2) * 16 * u, hc - 0.62 * H.b, 6 * u, 5 * u, 180, 360, 1.6 * u, dk); break;
    case "bun": case "bob": case "long": capHair(p, hp, cx, hc, H, 0.4, k.hair, light, thick, u, 3);
      p.stroke([[cx - 4 * u, hc - H.b * 1.0], [cx - 10 * u, hc - 0.5 * H.b]], 1.6 * u, dk); break;
    case "swoop": capHair(p, hp, cx, hc, H, 0.45, k.hair, light, thick, u, 2);
      p.poly(curve([cx - 0.9 * H.a, hc - 0.4 * H.b], [cx - 0.2 * H.a, hc - 1.25 * H.b], [cx + 0.9 * H.a, hc - 0.55 * H.b], 14).concat(curve([cx + 0.9 * H.a, hc - 0.55 * H.b], [cx, hc - 0.85 * H.b], [cx - 0.9 * H.a, hc - 0.4 * H.b], 10)), k.hair, 3.6 * u); break;
    case "bald": // shiny dome with a fringe at the sides
      for (const s of [-1, 1]) p.poly([[cx + s * 0.98 * H.a, hc - 0.4 * H.b], [cx + s * 1.1 * H.a, hc - 0.05 * H.b], [cx + s * 1.02 * H.a, hc + 0.18 * H.b], [cx + s * 0.88 * H.a, hc - 0.05 * H.b]], k.hair, 3.6 * u);
      p.arc(cx - 0.3 * H.a, hc - 0.7 * H.b, 0.25 * H.a, 0.12 * H.b, 200, 300, 4 * u, "rgba(255,255,255,0.8)"); break;
    default: capHair(p, hp, cx, hc, H, 0.56, k.hair, light, thick, u, 2);
  }
};
const hatOn = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, light: number, thick: number, u: number) => {
  if (!k.hat) return;
  const c = k.hatCol ?? "#2a2a3a", top = hc - H.b;
  if (k.hat === "beret") {
    const pts = ellPts(cx - 0.12 * H.a, top + 0.2 * H.b, 1.05 * H.a, 0.36 * H.b, 40, rad(-8));
    p.inkRing(pts, 4.6 * u, thick); p.shadedFill(pts, c, mul(c, SH_CLOTH), light, H.a);
    p.line([[cx - 0.1 * H.a, top - 0.12 * H.b], [cx - 0.06 * H.a, top - 0.26 * H.b]], c, 4 * u);
  } else if (k.hat === "flatcap") {
    const pts: P2[] = [...curve([cx - 1.02 * H.a, top + 0.42 * H.b], [cx - 0.2 * H.a, top - 0.2 * H.b], [cx + 0.95 * H.a, top + 0.3 * H.b], 16), [cx + 1.25 * H.a, top + 0.48 * H.b], [cx + 0.9 * H.a, top + 0.55 * H.b], [cx - 1.0 * H.a, top + 0.55 * H.b]];
    p.poly(pts, c, 4.4 * u); p.stroke(curve([cx - 0.95 * H.a, top + 0.45 * H.b], [cx, top + 0.3 * H.b], [cx + 0.9 * H.a, top + 0.42 * H.b], 10), 1.6 * u, mul(c, [0.6, 0.6, 0.65]));
  } else if (k.hat === "captain") { // grumpy skipper's cap
    const crown = curve([cx - 1.05 * H.a, top + 0.34 * H.b], [cx, top - 0.38 * H.b], [cx + 1.05 * H.a, top + 0.34 * H.b], 16);
    p.poly(crown, WHITE, 4.4 * u);
    p.poly([[cx - 0.92 * H.a, top + 0.32 * H.b], [cx + 0.92 * H.a, top + 0.32 * H.b], [cx + 0.86 * H.a, top + 0.56 * H.b], [cx - 0.86 * H.a, top + 0.56 * H.b]], "#1d2236", 3.6 * u);
    p.poly([[cx - 0.8 * H.a, top + 0.56 * H.b], [cx + 0.8 * H.a, top + 0.56 * H.b], [cx + 0.6 * H.a, top + 0.74 * H.b], [cx - 0.6 * H.a, top + 0.74 * H.b]], "#141826", 3.6 * u);
    p.ell(cx, top + 0.44 * H.b, 9 * u, 7 * u, "#e8c45a", 1.8 * u);
  } else if (k.hat === "beanie") {
    p.poly(curve([cx - 1.04 * H.a, top + 0.52 * H.b], [cx, top - 0.5 * H.b], [cx + 1.04 * H.a, top + 0.52 * H.b], 18), c, 4.4 * u);
    p.poly([[cx - 1.06 * H.a, top + 0.4 * H.b], [cx + 1.06 * H.a, top + 0.4 * H.b], [cx + 1.04 * H.a, top + 0.62 * H.b], [cx - 1.04 * H.a, top + 0.62 * H.b]], k.scarf2 ?? WHITE, 3.6 * u);
    p.ell(cx, top - 0.3 * H.b, 16 * u, 15 * u, k.scarf2 ?? WHITE, 3.6 * u);
  } else if (k.hat === "flower") {
    const x = cx + 0.78 * H.a, y = top + 0.3 * H.b;
    for (let i = 0; i < 6; i++) { const a = rad(i * 60); p.ell(x + Math.cos(a) * 11 * u, y + Math.sin(a) * 11 * u, 9 * u, 9 * u, c, 2.4 * u); }
    p.ell(x, y, 7 * u, 7 * u, "#ffd23a", 2.4 * u);
  }
};

// --- faces ---
type EyeK = "dot" | "big" | "small" | "lid" | "slit" | "droop" | "happy" | "dash" | "squeeze" | "shock" | "bulge" | "aside";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "o" | "wave" | "press" | "grit" | "sheep" | "scream" | "wail" | "evil" | "chatter" | "yell" | "flat" | "mutter";
type FaceDef = { eye: EyeK; eye2?: EyeK; brow: [number, number]; mouth: MouthK; puff?: number; red?: number; blue?: number; blush?: number; tilt?: number; veins?: number; tears?: number };
const FACES: Record<Face, FaceDef> = {
  neutral: { eye: "dot", brow: [0, -1], mouth: "dash" },
  sleepy: { eye: "lid", brow: [-2, 2], mouth: "smile", tilt: 4 },
  content: { eye: "happy", brow: [-2, 1], mouth: "smile", blush: 0.3 },
  sip: { eye: "happy", brow: [-3, 0], mouth: "o", blush: 0.3 },
  shock: { eye: "shock", brow: [-9, -8], mouth: "grit" },
  pain: { eye: "squeeze", brow: [7, -3], mouth: "grit", red: 0.35, tears: 0.5 },
  ow: { eye: "squeeze", brow: [-8, 4], mouth: "scream", red: 0.25, tears: 1 },
  drama: { eye: "squeeze", brow: [-10, 6], mouth: "wail", tilt: -10, tears: 1, blush: 0.4 },
  peek: { eye: "squeeze", eye2: "small", brow: [-8, 4], mouth: "wave", tilt: -8, tears: 0.6 },
  relief: { eye: "happy", brow: [-6, 2], mouth: "smileWide", blush: 0.6, tilt: -4 },
  worried: { eye: "small", brow: [-6, 4], mouth: "wave" },
  cold: { eye: "squeeze", brow: [-5, 3], mouth: "chatter", blue: 0.6 },
  deadpan: { eye: "lid", brow: [0, 0], mouth: "flat", blue: 0.5 },
  defeated: { eye: "droop", brow: [-6, 6], mouth: "frown", blue: 0.6, tilt: 6 },
  proud: { eye: "happy", brow: [-5, -3], mouth: "grin", blue: 0.35 },
  evil: { eye: "slit", brow: [9, -6], mouth: "evil" },
  sly: { eye: "slit", brow: [2, -6], mouth: "smirk" },
  serious: { eye: "lid", brow: [8, -2], mouth: "flat" },
  intense: { eye: "big", brow: [10, -4], mouth: "smirk" },
  wow: { eye: "big", brow: [-8, -6], mouth: "o" },
  strain: { eye: "squeeze", brow: [7, -3], mouth: "press", puff: 0.6, red: 0.6 },
  meme: { eye: "bulge", brow: [-15, -10], mouth: "yell", red: 1, veins: 1, puff: 0.15 },
  memeAfter: { eye: "happy", brow: [-6, -4], mouth: "grit", red: 0.45 },
  rage: { eye: "squeeze", brow: [10, -4], mouth: "press", puff: 1, red: 1, veins: 0.6 },
  swear: { eye: "squeeze", brow: [10, -6], mouth: "yell", red: 1, veins: 1 },
  fouch: { eye: "squeeze", brow: [-4, -4], mouth: "yell", blue: 0.3 },
  sheepish: { eye: "aside", brow: [-6, 4], mouth: "sheep", blush: 1, blue: 0.3 },
  bored: { eye: "lid", brow: [-1, 3], mouth: "flat", blue: 0.15 },
  grumpy: { eye: "slit", brow: [8, -1], mouth: "frown" },
  mutter: { eye: "lid", brow: [6, 0], mouth: "mutter", blue: 0.15 },
  smile: { eye: "dot", brow: [-2, -1], mouth: "smile" },
  point: { eye: "happy", brow: [-4, -3], mouth: "grin" },
  look: { eye: "aside", brow: [-2, 0], mouth: "dash" },
};

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, shake: number) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 4.4 * u, 6.4 * u, INK, 0); break;
    case "big": p.ell(lx, ey, 5.6 * u, 8.2 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3.2 * u, 4.6 * u, INK, 0); break;
    case "aside": p.ell(x + 4 * u * (look || 1), ey + u, 4 * u, 5.6 * u, INK, 0); break;
    case "lid": p.ell(lx, ey, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.8 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "droop": p.ell(lx, ey + 2 * u, 6.5 * u, 3.4 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u * side, ey], [x + 9 * u * side, ey + 3 * u]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 8 * u * side, ey - 7 * u], [x - 7 * u * side, ey], [x + 8 * u * side, ey + 7 * u]], lw * 1.15); break;
    case "shock": p.ell(x, ey, 11 * u, 12 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3.4 * u); break;
    case "bulge": { // THE MEME EYES: huge bloodshot saucers popping off the face, pinprick pupils, shaking
      const r = 21 * u, ox = side * 3 * u + (shake % 2 ? 1 : -1) * 1.2 * u, cy = ey - 6 * u;
      p.ell(x + ox, cy, r * 1.06, r * 1.2, WHITE, 3.6 * u);
      for (let i = 0; i < 4; i++) {
        const a = rad(side > 0 ? 190 + i * 42 : -10 - i * 42), c = Math.cos(a), s = Math.sin(a);
        const a0: P2 = [x + ox + c * r, cy + s * r * 1.14];
        p.stroke([a0, [a0[0] - c * 6 * u + 2 * u, a0[1] - s * 6 * u], [a0[0] - c * 11 * u, a0[1] - s * 10 * u + 1.5 * u]], 1.3 * u, "#e0505a");
      }
      p.dot(x + ox + side * 2.5 * u, cy + 2 * u, 2.6 * u);
      break;
    }
  }
};
const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0);
  p.clip(ellPts(mx, y, rx, ry, 40), () => {
    p.poly([[mx - rx, y - ry], [mx + rx, y - ry], [mx + rx, y - ry + 6 * u], [mx - rx, y - ry + 6 * u]], WHITE, 0);
    if (tongue) p.ell(mx + 2 * u, y + 0.7 * ry, 0.5 * rx, 0.34 * ry, TONGUE, 0);
  });
  p.ell(mx, y, rx, ry, null, 3 * u);
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.8 * u]], mw); break;
    case "flat": p.stroke([[mx - 9 * u, my + 1.5 * u], [mx + 9 * u, my + 1.5 * u]], mw); break;
    case "frown": p.arc(mx, my + 4 * u, 8 * u, 4 * u, 200, 340, mw); break;
    case "smirk": p.arc(mx + 3 * u, my - 4 * u, 8 * u, 4.5 * u, 10, 120, mw); p.stroke([[mx - 5 * u, my - 0.5 * u], [mx + 2 * u, my + 0.5 * u]], mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 5 * u, 12 * u, 7 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 13 * u, 9 * u, u); break;
    case "o": p.ell(mx + 1 * u, my + u, 4 * u, 4.6 * u, MOUTH, 2.8 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.6 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "mutter": { const s: P2[] = []; for (let i = 0; i <= 8; i++) s.push([mx - 6 * u + i * 1.5 * u, my + 1.2 * u * Math.sin(i * 1.7 + shake)]); p.stroke(s, 3 * u); break; }
    case "press": {
      const w = (6 - 2.5 * k) * u;
      p.ell(mx, my + u, w, 2.6 * u, "#b0505a", 2.8 * u);
      for (const s of [-1, 1]) p.stroke([[mx + s * (w + 3 * u), my - 2 * u], [mx + s * (w + 6 * u), my + 4 * u]], 1.6 * u);
      break;
    }
    case "grit": case "chatter": {
      const j = kind === "chatter" ? ((shake % 2) ? 1.5 : -1.5) * u : 0;
      p.poly([[mx - 12 * u, my - 5 * u + j], [mx + 12 * u, my - 5 * u - j], [mx + 11 * u, my + 5 * u + j], [mx - 11 * u, my + 5 * u - j]], WHITE, 3 * u);
      p.stroke([[mx - 11 * u, my], [mx + 11 * u, my]], 1.4 * u);
      for (const i of [-1.5, -0.5, 0.5, 1.5]) p.stroke([[mx + i * 5.5 * u, my - 5 * u], [mx + i * 5.5 * u, my + 5 * u]], 1.4 * u);
      break;
    }
    case "sheep": {
      p.poly([[mx - 13 * u, my - 1 * u], [mx + 13 * u, my - 5 * u], [mx + 11 * u, my + 3 * u], [mx - 11 * u, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u, my - 3.4 * u - j * u], [mx + j * 6 * u, my + 3.6 * u]], 1.3 * u);
      break;
    }
    case "evil": { // wide toothy crescent grin
      const pts = [...curve([mx - 20 * u, my - 6 * u], [mx, my + 14 * u], [mx + 20 * u, my - 6 * u], 16), ...curve([mx + 20 * u, my - 6 * u], [mx, my + 2 * u], [mx - 20 * u, my - 6 * u], 12).slice(1)];
      p.poly(pts, WHITE, 3 * u);
      for (const i of [-2, -1, 0, 1, 2]) p.stroke([[mx + i * 6.5 * u, my - 4 * u], [mx + i * 6.5 * u, my + 6 * u - Math.abs(i) * 2.4 * u]], 1.3 * u);
      break;
    }
    case "scream": { // the big "OW!": tall open mouth, teeth, tongue (k grows it)
      const s = 0.55 + 0.45 * k;
      dmouth(p, mx, my + 4 * u * s, 13 * u * s, 15 * u * s, u, true);
      break;
    }
    case "yell": { // a HUGE screaming mouth (swears: under the censor bar)
      const s = 0.6 + 0.4 * k, rx = 20 * u * s, ry = 15 * u * s, y = my + 4 * u;
      const pts = rrect(mx - rx, y - ry, mx + rx, y + ry, 9 * u * s);
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => {
        p.poly([[mx - rx, y - ry], [mx + rx, y - ry], [mx + rx, y - ry + 7 * u], [mx - rx, y - ry + 7 * u]], WHITE, 0);
        p.poly([[mx - rx, y + ry - 6 * u], [mx + rx, y + ry - 6 * u], [mx + rx, y + ry], [mx - rx, y + ry]], WHITE, 0);
        for (const i of [-1, 0, 1]) p.stroke([[mx + i * 9 * u, y - ry], [mx + i * 9 * u, y - ry + 7 * u]], 1.2 * u);
        p.ell(mx, y + ry * 0.55, rx * 0.5, ry * 0.32, TONGUE, 0);
      });
      p.poly(pts, null, 3.2 * u);
      break;
    }
    case "wail": { // trembling drama-queen mouth, wobbly
      const pts: P2[] = [], j = shake % 3;
      for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2, r = 1 + 0.08 * Math.sin(a * 6 + j * 2); pts.push([mx + Math.cos(a) * 12 * u * r, my + 4 * u + Math.sin(a) * (Math.sin(a) < 0 ? 6 : 10) * u * r]); }
      p.poly(pts, MOUTH, 3 * u);
      p.clip(pts, () => p.ell(mx, my + 13 * u, 7 * u, 4 * u, TONGUE, 0));
      break;
    }
  }
};

const drawFace = (p: Pen, kit: Kit, cx: number, hc: number, H: Blob, f: FaceS, lid: number) => {
  const D = FACES[f.e], u = (2 * H.a) / 100, look = f.look ?? 0, shake = f.shake ?? 0, k = f.k ?? 1;
  const bulge = D.eye === "bulge", ey = hc - (bulge ? 4 : 0) * u, ex = (bulge ? 23 : 13) * u;
  for (const side of [-1, 1]) {
    let ek = side > 0 && D.eye2 ? D.eye2 : D.eye;
    if (lid >= 1 && !["happy", "squeeze", "bulge", "dash"].includes(ek)) ek = "dash";
    else if (lid > 0 && (ek === "dot" || ek === "big" || ek === "small" || ek === "aside")) ek = "lid";
    else if (lid > 0 && ek === "lid") ek = "slit";
    const x = cx + side * ex;
    eye(p, ek, x, ey, u, side, look, shake);
    const [dI, dO] = D.brow, by = ey - (ek === "bulge" ? 46 : ek === "shock" ? 24 : 20) * u, bc = kit.brows ?? INK;
    if (ek === "bulge") p.arc(x + side * 3 * u, by - 6 * u, 13 * u, 6 * u, 200, 340, 5 * u, bc);
    else if (ek === "shock") p.arc(x, by + (dI + dO) * 0.25 * u, 11 * u, 4 * u, 200, 340, 4.4 * u, bc);
    else if (f.e === "sly" && side < 0) taper(p, [x + 8.5 * u, by + 2 * u], [x - 8.5 * u, by + 3 * u], 5 * u, 2.5 * u, bc);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u, bc);
  }
  if (kit.glasses && !bulge) for (const side of [-1, 1]) {
    const x = cx + side * 13 * u;
    if (kit.glasses === "round") p.ell(x, ey, 11 * u, 10 * u, null, 2.6 * u);
    else p.poly(rrect(x - 11 * u, ey - 8 * u, x + 11 * u, ey + 8 * u, 3 * u), null, 2.6 * u);
    if (side > 0) p.stroke([[cx - 2.5 * u, ey - 3 * u], [cx + 2.5 * u, ey - 3 * u]], 2.2 * u);
  }
  if ((D.tears ?? 0) > 0) for (const side of [-1, 1]) { // streams down the cheeks
    const x = cx + side * ex + side * 4 * u, y0 = ey + 6 * u, L = 30 * u * (D.tears ?? 0);
    p.poly([[x - 3 * u, y0], [x + 3 * u, y0], [x + 4 * u + side * 2 * u, y0 + L], [x - 4 * u + side * 2 * u, y0 + L]], "#8fd0ff", 1.8 * u);
  }
  const mx = cx + (f.e === "sly" || f.e === "mutter" ? 4 * u : 0), my = hc + MOUTH_DY * u;
  if (kit.beard) { // big salty beard around the mouth
    const pts: P2[] = [[cx - 0.9 * H.a, hc + 0.05 * H.b], ...curve([cx - 0.9 * H.a, hc + 0.3 * H.b], [cx, hc + 1.55 * H.b], [cx + 0.9 * H.a, hc + 0.3 * H.b], 18), [cx + 0.9 * H.a, hc + 0.05 * H.b], [cx + 0.5 * H.a, hc + 0.45 * H.b], [cx - 0.5 * H.a, hc + 0.45 * H.b]];
    p.poly(pts, kit.beard, 3.6 * u);
    for (let i = -3; i <= 3; i++) p.stroke([[cx + i * 10 * u, hc + 0.6 * H.b], [cx + i * 9 * u, hc + 0.85 * H.b]], 1.3 * u, mul(kit.beard, [0.65, 0.65, 0.7]));
  }
  mouth(p, D.mouth, mx, my, u, k, shake);
  if (kit.moustache) {
    const up = D.mouth === "yell" || D.mouth === "scream" ? 8 * u : 0;
    const pts: P2[] = [[mx - 20 * u, my - 2 * u], [mx - 12 * u, my - 10 * u], [mx, my - 9 * u], [mx + 12 * u, my - 10 * u], [mx + 20 * u, my - 2 * u], [mx + 13 * u, my - 4 * u], [mx, my - 3 * u], [mx - 13 * u, my - 4 * u]];
    p.poly(pts.map(([x, y]) => [x, y - up] as P2), kit.moustache, 2.6 * u);
  }
  if ((D.veins ?? 0) > 0) for (const s of [-1, 1]) { // anger-vein cross on the forehead + throb ticks at the temples
    const vx = cx + s * 0.42 * H.a, vy = hc - (bulge ? 0.86 : 0.62) * H.b, r = 9 * u * (D.veins ?? 1);
    if (s > 0) for (const a of [45, 135, 225, 315]) p.arc(vx + Math.cos(rad(a)) * r * 0.9, vy + Math.sin(rad(a)) * r * 0.9, r * 0.55, r * 0.55, a + 90, a + 270, 2.6 * u, "#c8222e");
    for (let i = 0; i < 3; i++) { const x = cx + s * (1.08 * H.a + i * 1.5 * u), y = hc - 0.5 * H.b + i * 10 * u; p.stroke([[x, y], [x + s * 10 * u, y - 2 * u]], 2.8 * u, INK); }
  }
};

/** a whole standing figure in the 600 x 1000 design space (ankles ~ canvas y 950, origin 300, 975) */
export const drawGuy = (p: Pen, kit: Kit, pose: Pose, face: FaceS, light: number, lid = 0) => {
  const L = LAYOUT, D = FACES[face.e], kk = face.k ?? 1, g = p.g;
  const puff = (D.puff ?? 0) * kk, meme = face.e === "meme", grow = 1 + (meme ? 0.14 * kk : 0);
  const H0 = headBlob(kit.seed, HEAD_A, 0), H: Blob = { ...H0, a: H0.a * grow, b: H0.b * grow, rot: H0.rot * 0.5 };
  const W = 2 * H0.a, u = W / 100, thick = thickAngle(light), ow = 5 * u;
  const skinSh = mul(kit.skin, SH_SKIN);
  const lean = pose.lean ?? 0, lift = pose.lift ?? 0, hip: P2 = [300, L.hipY];
  g.save();
  if (pose.sy && pose.sy !== 1) { g.translate(300, 975); g.scale(1 / Math.sqrt(pose.sy), pose.sy); g.translate(-300, -975); }
  g.translate(0, -lift);
  const rotB = (P: P2, a: number): P2 => { const c = Math.cos(a), s = Math.sin(a), dx = P[0] - hip[0], dy = P[1] - hip[1]; return [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c]; };
  const coat = !!kit.coat, legCol = kit.top === "pj" ? kit.shirt : kit.pants;
  // ---- legs (2-bone IK, knees out) ----
  const leg = (side: 0 | 1) => {
    const s = side ? 1 : -1, Hp: P2 = [300 + s * 30, L.hipY], Ft = pose.feet[side];
    const d0 = Math.hypot(Ft[0] - Hp[0], Ft[1] - Hp[1]), d = Math.max(40, Math.min(d0, THIGH + SHIN - 3));
    const ang = Math.atan2(Ft[1] - Hp[1], Ft[0] - Hp[0]), F: P2 = [Hp[0] + Math.cos(ang) * d, Hp[1] + Math.sin(ang) * d];
    const dx = F[0] - Hp[0], dy = F[1] - Hp[1], a = (THIGH * THIGH - SHIN * SHIN + d * d) / (2 * d), h = Math.sqrt(Math.max(0, THIGH * THIGH - a * a));
    let px = -dy / d, py = dx / d; if (px * s < 0) { px = -px; py = -py; }
    const K: P2 = [Hp[0] + (dx / d) * a + px * h, Hp[1] + (dy / d) * a + py * h];
    const pts = [...curve(Hp, lerp2(Hp, K, 0.5), K, 6), ...curve(K, lerp2(K, F, 0.5), F, 6).slice(1)];
    const lw = (kit.top === "pj" ? 12 : 9.5) * u;
    p.stroke(pts, lw + 2 * p.ol * 0.9, INK); p.stroke(pts, lw, legCol);
    if (kit.top === "pj") p.stroke(pts.slice(0, 12), 1.6 * u, kit.stripe ?? WHITE);
    p.stroke([pts[11], F], lw * 0.82, kit.slippers ? kit.skin : mix(kit.shoes, WHITE, 0.6));
    const raised = F[1] < 900, dir = raised ? [s * 0.85, -0.25] : [s * 0.55, 0.12], dl = Math.hypot(dir[0], dir[1]);
    const cxs = F[0] + (dir[0] / dl) * 10 * u, cys = F[1] + 6 * u + (dir[1] / dl) * 10 * u, rot = Math.atan2(dir[1], dir[0]);
    const red = pose.toe === s;
    if (kit.slippers) { // fuzzy slipper (the stubbed big toe pokes out, red and swollen)
      const sp = ellPts(cxs, cys, 19 * u, 10 * u, 28, rot);
      p.inkRing(sp, 4.2 * u, thick); p.poly(sp, kit.shoes, 0);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.dot(cxs + Math.cos(a) * 15 * u, cys + Math.sin(a) * 7 * u, 3 * u, mix(kit.shoes, WHITE, 0.35)); }
      if (red) {
        const tx = cxs + Math.cos(rot) * 20 * u, ty = cys + Math.sin(rot) * 20 * u, r = (9 + 3 * (pose.throb ?? 0)) * u;
        p.ell(tx, ty, r, r * 0.9, "#ff4a4a", 3.2 * u); p.arc(tx - 2 * u, ty - 2 * u, r * 0.5, r * 0.4, 200, 260, 2 * u, "#ffd0d0");
      }
    } else {
      const c = Math.cos(rot), sn = Math.sin(rot);
      p.poly(curve([cxs - 18 * u, cys + 6 * u], [cxs, cys - 14 * u], [cxs + 18 * u, cys + 6 * u], 12).map(([x, y]) => { const X = x - cxs, Y = y - cys; return [cxs + X * c - Y * sn, cys + X * sn + Y * c] as P2; }), kit.shoes, 4 * u);
      if (red) { const tx = cxs + c * 18 * u, ty = cys + sn * 18 * u, r = (11 + 4 * (pose.throb ?? 0)) * u; p.ell(tx, ty, r, r, rgba("#ff3030", 0.6), 0); }
    }
  };
  leg(0); leg(1);
  // ---- body frame (lean about the hips) ----
  p.rot = lean ? [lean, hip[0], hip[1]] : null;
  const blue = Math.min(1, pose.blue ?? 0), handCol = blue > 0 ? mix(kit.skin, "#7fb2ff", 0.65 * blue) : kit.skin;
  const long = coat || kit.top === "pj" || kit.top === "sweater" || kit.top === "hoodie" || kit.top === "shirt" || kit.top === "breton";
  const sleeve = coat ? "#f6f8fb" : kit.shirt;
  const arm = (side: 0 | 1) => {
    const S = L.sh[side], s = side ? 1 : -1, Hd = rotB(pose.hands[side], -lean);
    const d0 = Math.hypot(Hd[0] - S[0], Hd[1] - S[1]), d = Math.max(30, Math.min(d0, ARM1 + ARM2 - 2));
    const ang = Math.atan2(Hd[1] - S[1], Hd[0] - S[0]), hand: P2 = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
    const dx = hand[0] - S[0], dy = hand[1] - S[1];
    const a = (ARM1 * ARM1 - ARM2 * ARM2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ARM1 * ARM1 - a * a));
    let px = -dy / d, py = dx / d; if (px * s < 0) { px = -px; py = -py; }
    const E: P2 = [S[0] + (dx / d) * a + px * h, S[1] + (dy / d) * a + py * h];
    const pts = [...curve(S, lerp2(S, E, 0.5), E, 6), ...curve(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    const aw = (long ? 9 : 6) * u;
    p.stroke(pts, aw + 2 * p.ol * 0.9, INK);
    p.stroke(pts, aw, long ? sleeve : kit.skin);
    if (!long) p.line([S, lerp2(S, E, 0.55)], sleeve, 13 * u);
    if (kit.top === "breton" && !coat) for (let i = 1; i < 6; i++) { const q0 = pts[i * 2]; p.dot(q0[0], q0[1], 3.2 * u, kit.stripe ?? "#1d2a5c"); }
    if (pose.open?.[side]) for (let i = -2; i <= 2; i++) { const aa = ang + i * 0.32; p.line([hand, [hand[0] + Math.cos(aa) * 13 * u, hand[1] + Math.sin(aa) * 13 * u]], handCol, 3.2 * u); }
    p.dot(hand[0], hand[1], 8 * u); p.dot(hand[0], hand[1], 6 * u, handCol);
    if (blue > 0.2) for (let i = 0; i < 3; i++) p.dot(hand[0] + (i - 1) * 3.5 * u, hand[1] + 5 * u, 2 * u, mix(handCol, WHITE, 0.4));
  };
  const front = pose.front ?? [false, false];
  if (!front[0]) arm(0);
  if (!front[1]) arm(1);
  // ---- torso ----
  const T: Blob = { a: (0.4 * W) / 1.06, b: 0.5 * (L.tbot - L.top), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0, rot: 0, noise: 0.006, seed: kit.seed + 7 };
  const tcy = L.tbot - T.b, tp = blobPts(300, tcy, T);
  if (kit.top === "hoodie") p.poly(ellPts(300, L.chin - 6, 0.78 * T.a, 30 * u, 30), mul(kit.shirt, [0.8, 0.8, 0.85]), ow);
  p.gradFill(tp, kit.shirt, mul(kit.shirt, SH_CLOTH), light, 0.22, 0.3);
  p.clip(tp, () => {
    const pb = L.tbot - 50;
    if (kit.top === "stripes" || kit.top === "breton" || kit.top === "sweater") for (let i = 0; i < 6; i++) {
      const y = L.chin + 26 + i * (kit.top === "sweater" ? 44 : 30);
      if (kit.top === "sweater") { for (let x = 140; x < 470; x += 26) p.poly([[x, y], [x + 13, y - 12], [x + 26, y], [x + 13, y + 12]], kit.stripe ?? WHITE, 0); }
      else p.band([[100, y], [500, y]], kit.stripe ?? "#1d2a5c", 12, 0);
    }
    if (kit.top === "pj") for (let x = 170; x < 450; x += 34) p.stroke([[x, L.top], [x, 1000]], 4 * u, rgba(kit.stripe ?? "#ffffff", 0.75));
    if (kit.top !== "pj") {
      p.gradFill([[150, pb], [450, pb - 2], [450, 1000], [150, 1000]], kit.pants, mul(kit.pants, SH_CLOTH), light, 0.3);
      p.band([[150, pb + 3], [450, pb + 1]], mul(kit.pants, [0.55, 0.55, 0.6]), 9, 1.2);
    }
    if (kit.top === "pj" || kit.top === "polo" || kit.top === "shirt") {
      p.stroke([[300, L.chin - 2], [300, L.chin + 150]], 1.4 * u, mul(kit.shirt, [0.68, 0.66, 0.72]));
      for (const y of [L.chin + 24, L.chin + 62, L.chin + 100]) { p.dot(300.6, y, 3 * u); p.dot(300.6, y, 2.1 * u, WHITE); }
    }
    if (kit.top === "hoodie") p.poly([[230, L.chin + 110], [370, L.chin + 110], [390, L.chin + 170], [210, L.chin + 170]], mul(kit.shirt, [0.88, 0.88, 0.92]), 1.6 * u);
    if (kit.anchor) {
      const ax = 300 + 0.45 * T.a, ay = L.chin + 70;
      p.ell(ax, ay, 14 * u, 14 * u, WHITE, 1.6 * u);
      p.stroke([[ax, ay - 9 * u], [ax, ay + 8 * u]], 2 * u, "#1d2a5c"); p.arc(ax, ay + 2 * u, 7 * u, 6 * u, 20, 160, 2 * u, "#1d2a5c"); p.stroke([[ax - 5 * u, ay - 4 * u], [ax + 5 * u, ay - 4 * u]], 2 * u, "#1d2a5c");
    }
  });
  p.inkRing(tp, ow, thick);
  if (coat) { // open white lab coat: lapels, pocket + pen, tails over the hips
    const cpts = (s: number): P2[] => [[300 + s * 14 * u, L.chin - 4], [300 + s * 1.02 * T.a, L.top + 40], [300 + s * 1.08 * T.a, L.tbot + 10], [300 + s * 1.0 * T.a, 745], [300 + s * 18 * u, 745], [300 + s * 20 * u, L.chin + 90]];
    for (const s of [-1, 1]) { const pts = cpts(s); p.gradFill(pts, "#f6f8fb", "#b8c2d4", light, 0.3); p.poly(pts, null, ow * 0.8); }
    for (const s of [-1, 1]) p.poly([[300 + s * 14 * u, L.chin - 4], [300 + s * 40 * u, L.chin + 4], [300 + s * 22 * u, L.chin + 70]], "#e4e9f2", 2 * u);
    p.poly([[300 + 0.45 * T.a, L.chin + 70], [300 + 0.85 * T.a, L.chin + 70], [300 + 0.85 * T.a, L.chin + 110], [300 + 0.45 * T.a, L.chin + 110]], "#eef2f8", 2 * u);
    p.band([[300 + 0.55 * T.a, L.chin + 56], [300 + 0.55 * T.a, L.chin + 84]], "#2a5fd0", 3 * u, 1.2 * u);
  }
  if (kit.top === "pj") for (const sd of [-1, 1]) p.poly([[300 + sd * 2 * u, L.chin - 2 * u], [300 + sd * 26 * u, L.chin - 8 * u], [300 + sd * 19 * u, L.chin + 22]], mix(kit.shirt, WHITE, 0.25), 1.8 * u);
  else if (kit.top === "polo" || kit.top === "shirt") for (const sd of [-1, 1]) p.poly([[300 + sd * 2 * u, L.chin - 2 * u], [300 + sd * 26 * u, L.chin - 8 * u], [300 + sd * 19 * u, L.chin + 22]], WHITE, 1.8 * u);
  else if (kit.top === "tee" || kit.top === "stripes" || kit.top === "breton") p.arc(300, L.chin - 6, 24 * u, 10 * u, 20, 160, 3 * u, mul(kit.shirt, [0.8, 0.8, 0.85]));
  if (kit.scarf) {
    p.poly([[300 - 30 * u, L.chin - 6 * u], [300 + 30 * u, L.chin - 6 * u], [300 + 22 * u, L.chin + 10 * u], [300 - 22 * u, L.chin + 10 * u]], kit.scarf, 2.4 * u);
    p.poly([[300 + 4 * u, L.chin + 6 * u], [300 + 22 * u, L.chin + 8 * u], [300 + 14 * u, L.chin + 48 * u]], kit.scarf2 ?? kit.scarf, 2.4 * u);
  }
  if (front[0]) arm(0);
  if (front[1]) arm(1);
  // ---- head ----
  const tilt = rad((D.tilt ?? 0) + (pose.headTilt ?? 0));
  const shakeX = meme || face.e === "rage" || face.e === "swear" ? ((face.shake ?? 0) % 2 ? 1.6 : -1.6) * u : 0;
  const hcR = rotB([300, L.hc], lean), cx = 300 + shakeX, hc = L.hc;
  p.rot = lean || tilt ? [lean + tilt, 300, hc, hcR[0] - 300, hcR[1] - hc] : null;
  const spikes = meme ? kk : face.e === "rage" || face.e === "swear" ? 0.4 : 0;
  if (kit.style !== "bald") hairBehind(p, kit, cx, hc, H, light, thick, u, spikes);
  const hp = blobPts(cx, hc, H), parts: P2[][] = [hp], cr = (0.14 + 0.3 * puff) * H.a, cxo = (0.62 + 0.18 * puff) * H.a, cyo = (0.34 + 0.06 * puff) * H.b;
  if (puff > 0.04) for (const s of [-1, 1]) parts.push(ellPts(cx + s * cxo, hc + cyo, cr * 1.05, cr * 0.95, 36));
  if (kit.earring) p.ell(cx - 1.0 * H.a, hc + 0.3 * H.b, 5 * u, 5 * u, null, 2.2 * u);
  for (const pt of parts) p.inkRing(pt, ow, thick);
  parts.forEach((pt, i) => p.shadedFill(scalePts(pt, 1 - (0.5 * ow) / (i ? cr : H.a)), kit.skin, skinSh, light, i ? cr * 1.6 : H.a));
  const red = (D.red ?? 0) * kk, blush = (D.blush ?? 0) * kk, bl = (D.blue ?? 0) * kk;
  if (red > 0 || blush > 0 || bl > 0) clipMany(p, parts, () => {
    if (red > 0.3) { // the red rises from the chin like a thermometer
      const [ax, ay] = p.P(cx, hc + H.b * 1.1), [bx, by] = p.P(cx, hc - H.b * 1.0), top = Math.min(1, red);
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, rgba("#ff2a2a", 0.85 * top)); gr.addColorStop(Math.max(0.01, 0.75 * top), rgba("#ff3a3a", 0.6 * top)); gr.addColorStop(Math.min(0.999, 0.75 * top + 0.25), rgba("#ff3a3a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
    if (bl > 0) {
      const [ax, ay] = p.P(cx, hc - H.b), [bx, by] = p.P(cx, hc + H.b);
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, rgba("#6fa8ff", 0.5 * bl)); gr.addColorStop(1, rgba("#9cc4ff", 0.12 * bl));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
    const a = red > 0 ? Math.min(1, red) : blush * 0.6;
    if (a > 0) for (const s of [-1, 1]) {
      const [x, y] = p.P(cx + s * cxo, hc + 0.36 * H.b), R = red > 0 ? (0.22 + 0.3 * puff) * H.a : 0.17 * H.a;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, rgba("#ff5050", 0.65 * a)); gr.addColorStop(1, rgba("#ff5050", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
  });
  if (puff > 0.3) for (const s of [-1, 1]) p.arc(cx + s * cxo - 0.2 * cr, hc + cyo - 0.25 * cr, cr * 0.55, cr * 0.5, 200, 250, 3 * u, "rgba(255,255,255,0.85)");
  if (bl > 0.3) p.ell(cx + 1.5 * u, hc + 9 * u, 4 * u, 3 * u, rgba("#ff7a8a", 0.8), 0);
  hairFront(p, kit, hp, cx, hc, H, light, thick, u);
  hatOn(p, kit, cx, hc, H, light, thick, u);
  drawFace(p, kit, cx, hc, H, face, lid);
  p.rot = null;
  g.restore();
};

// ---------------- effect cards ----------------
/** comic shout burst (768 x 640): jagged yellow star with the word, alpha a */
export const fxBurst = (p: Pen, word: string, seed: number, a: number, col = "#ffd93b", tcol = "#e8312a") => {
  const g = p.g; g.save(); g.globalAlpha = a;
  const pts: P2[] = [], n = 22;
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2, r = i % 2 ? 0.62 + 0.08 * rnd(seed, i) : 0.92 + 0.08 * rnd(seed, i + 30); pts.push([384 + Math.cos(t) * 360 * r, 320 + Math.sin(t) * 290 * r]); }
  const outer: P2[] = pts.map(([x, y], i) => { const r = i % 2 ? 0.86 : 1.04; return [384 + (x - 384) * r, 320 + (y - 320) * r]; });
  p.poly(outer, tcol, 14); // QA1: a red spiky back layer = classic comic punch
  p.poly(scalePts(pts, 0.86), col, 14);
  p.poly(scalePts(pts, 0.68), mix(col, "#ff9a2a", 0.55), 0);
  p.poly(scalePts(pts, 0.52), col, 0);
  text(p, word, 384, 334, word.length > 3 ? 190 : 236, tcol, 30, 10, 600);
  g.restore();
};
/** speech bubble (640 x 480) with a tail to the bottom-left (-1) / bottom-right (1); fizzle 0..1 deflates it */
export const fxBubble = (p: Pen, word: string, tail: number, a: number, fizzle = 0, tcol = INK, size = 0) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  const sag = fizzle, pts: P2[] = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2, wob = 1 + 0.03 * Math.sin(t * 7);
    let x = 320 + Math.cos(t) * 270 * wob, y = 200 + Math.sin(t) * 150 * wob;
    if (sag > 0) { y += sag * (0.5 + 0.5 * Math.sin(t)) * 90 + sag * 25 * Math.sin(t * 5); x = 320 + (x - 320) * (1 - 0.25 * sag); }
    pts.push([x, y]);
  }
  const tx = 320 + tail * 120, tip: P2 = [320 + tail * 230, 450 + sag * 10];
  p.poly([[tx - 50, 300 + sag * 60], tip, [tx + 50, 300 + sag * 60]], WHITE, 12);
  p.poly(pts, WHITE, 12);
  p.poly([[tx - 40, 290 + sag * 60], tip, [tx + 40, 290 + sag * 60]], WHITE, 0);
  g.save(); g.translate(320, 205 + sag * 50); g.rotate(sag * 0.25 * (tail || 1)); g.scale(1 - 0.2 * sag, 1 - 0.45 * sag);
  text(p, word, 0, 0, size || (word.length > 4 ? 120 : 150), sag > 0 ? mix(tcol, "#9aa0aa", sag) : tcol, 22, 0, 500);
  g.restore();
  g.restore();
};
/** censor bar (512 x 160): solid black rounded bar */
export const fxCensor = (p: Pen) => {
  p.poly(rrect(14, 18, 498, 142, 26), "#0b0a0e", 8);
  p.stroke([[60, 44], [200, 40]], 6, "rgba(255,255,255,0.18)");
};
const GRAWLIX = ["#", "@", "$", "%", "!", "&", "*", "?"];
const GCOL = ["#ff3b3b", "#ffd23a", "#3bd3ff", "#ff5fd2", "#7cff5a", "#ff9a2a"];
/** one grawlix symbol (256 x 256); i >= 100: a lightning bolt (odd) or a swirl (even) */
export const fxGrawlix = (p: Pen, i: number) => {
  if (i >= 100) {
    if (i % 2) p.poly([[150, 20], [80, 140], [130, 140], [96, 236], [190, 100], [140, 100], [176, 20]], "#ffd23a", 12);
    else { const pts: P2[] = []; for (let k = 0; k < 40; k++) { const a = k * 0.42, r = 10 + k * 2.6; pts.push([128 + Math.cos(a) * r, 128 + Math.sin(a) * r]); } p.line(pts, "#3bd3ff", 12); }
    return;
  }
  text(p, GRAWLIX[i % GRAWLIX.length], 128, 136, 200, GCOL[(i * 5 + 1) % GCOL.length], 26, 10);
};
/** shiver zigzags (128 x 384) */
export const fxShiver = (p: Pen, seed: number) => {
  for (let j = 0; j < 3; j++) {
    const pts: P2[] = [], x0 = 26 + j * 36, y0 = 40 + j * 40 + 20 * rnd(seed, j);
    for (let i = 0; i < 7; i++) pts.push([x0 + (i % 2 ? 14 : -14), y0 + i * 34]);
    p.stroke(pts, 11, INK);
    p.stroke(pts, 6, "#d8f0ff");
  }
};
/** soft puff (256 x 256): cold breath / mist; col tint, alpha a */
export const fxPuff = (p: Pen, seed: number, a: number, col = "#ffffff") => {
  const g = p.g; g.save(); g.globalAlpha = a;
  for (let i = 0; i < 5; i++) {
    const x = 128 + (rnd(seed, i) - 0.5) * 100, y = 128 + (rnd(seed, i + 9) - 0.5) * 80, r = 50 + 30 * rnd(seed, i + 4);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(col, 0.9)); gr.addColorStop(0.6, rgba(col, 0.55)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.restore();
};
/** comic steam cloud with ink (256 x 256), alpha a */
export const fxSteam = (p: Pen, seed: number, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  const lumps = ([[128, 140, 60], [76, 158, 40], [182, 156, 42], [110, 96, 40], [156, 92, 36]] as [number, number, number][]).map(([x, y, r], i) => [x, y, r * (0.85 + 0.3 * rnd(seed, i))] as [number, number, number]);
  for (const [x, y, r] of lumps) p.ell(x, y, r + 9, r + 8, INK, 0);
  for (const [x, y, r] of lumps) p.ell(x, y, r, r * 0.95, "#f4f6fa", 0);
  p.arc(110, 120, 30, 22, 200, 260, 8, WHITE);
  g.restore();
};
/** tear / water drop (128 x 160) */
export const fxTear = (p: Pen) => {
  p.poly([[64, 10], [100, 80], [104, 112], [88, 140], [64, 150], [40, 140], [24, 112], [28, 80]], "#8fd0ff", 9);
  p.arc(64, 108, 22, 26, 200, 250, 7, "#e8f6ff");
};
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#9fd4ff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, "#e8f6ff");
};
/** cartoon star (200 x 200) */
export const fxStar = (p: Pen, col = "#ffe14a") => {
  const pts: P2[] = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 36 : 86; pts.push([100 + r * Math.cos(a), 104 + r * Math.sin(a)]); }
  p.poly(pts, col, 10); p.arc(84, 84, 22, 18, 200, 260, 7, "#fff8c8");
};
/** "!" or "?" pop (300 x 400) */
export const fxMark = (p: Pen, m: "!" | "?", col = "#ffe46b") => text(p, m, 150, 210, 330, col, 30, 0);
/** pain ticks around a stubbed toe (256 x 256) */
export const fxThrob = (p: Pen) => {
  for (const a of [-160, -90, -20]) { const c = Math.cos(rad(a)), s = Math.sin(rad(a)); p.line([[128 + c * 56, 150 + s * 56], [128 + c * 116, 150 + s * 116]], "#ff4040", 12); }
};
/** tiny grey "ow" sound from a headphone (256 x 256): flat, no help */
export const fxTinyOw = (p: Pen, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  for (const r of [40, 70]) p.arc(40, 128, r, r, -40, 40, 8, "#c8ced8");
  text(p, "ow", 170, 128, 80, "#c8ced8", 12, 0);
  g.restore();
};
