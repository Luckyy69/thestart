// OWNER: cast agent. Drawings for "Astronauts Can't Burp": our own floating astronaut cards (bridge Pen style: bean heads,
// thick-thin plum ink, painted crescents) and every effect card (burp rings, fail puff, wet blobs, droplets, sweat, speed
// lines, sparkles, "?", the pssht can spray).
// Design space 600 x 1000 units per card (bridge: 1000 units = 2.16 m, canvas y 975 = the card origin). Floating figures
// are laid out around a CHEST anchor (300, 490); the deck-chair sitter uses the same figure moved down by SIT_DY.
import { Pen, INK, blobPts, headBlob, thickAngle, mul, mix, shade, Blob } from "../bridge/toon";

type P2 = [number, number];
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
/** closed ellipse contour, clockwise on screen (like blobPts) */
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
/** clip to the union of several closed shapes */
const clipMany = (p: Pen, parts: P2[][], fn: () => void) => {
  const g = p.g; g.save(); g.beginPath();
  for (const pts of parts) { pts.forEach(([x0, y0], i) => { const [x, y] = p.P(x0, y0); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); }
  g.clip("nonzero"); fn(); g.restore();
};
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
const SH_SKIN: [number, number, number] = [0.96, 0.86, 0.84], SH_CLOTH: [number, number, number] = [0.64, 0.66, 0.74], SH_HAIR: [number, number, number] = [0.62, 0.62, 0.7];

// ---------------- characters ----------------
export type HairStyle = "tuft" | "flop" | "curly" | "poof" | "feather" | "crop";
export type Kit = {
  seed: number; skin: string; hair: string; style: HairStyle; shirt: string; stripe?: string; tee?: boolean; pants: string; socks: string;
  moustache?: string; glasses?: "round" | "aviator"; patch?: boolean; tape?: string; headband?: string;
};
export type Legs = "tuck" | "dangle" | "crouch" | "stretch" | "sit";
export type Pose = {
  legs: Legs; legs2?: Legs; lk?: number;
  /** hand targets in canvas units [screen-left hand, screen-right hand]; front = drawn over the torso */
  hands: [P2, P2]; front?: [boolean, boolean];
  /** canvas rotation of the head about its centre (rad, + = clockwise): keeps a rolled flyer's face upright */
  headRot?: number; headTilt?: number; sit?: boolean;
};
export type Face = "neutral" | "strain" | "annoyed" | "defeated" | "relaxed" | "sip" | "ahh" | "worried" | "queasy" | "wetburp" | "embarrassed"
  | "excited" | "happySip" | "nervous" | "meme" | "memeBurp" | "sheepish" | "sly" | "determined" | "wide" | "blissful";
export type FaceS = { e: Face; k?: number; look?: number; shake?: number };

export const SIT_DY = 230;
const HEAD_A = 118;
/** figure layout (canvas units) for a floating (dy 0) or seated (dy SIT_DY) card */
export const layout = (sit = false) => {
  const dy = sit ? SIT_DY : 0, hc = 300 + dy, chin = 403 + dy, tbot = 612 + dy;
  return { dy, hc, chin, tbot, top: chin - 54, hipY: 592 + dy, chest: [300, 490 + dy] as P2, belly: [300, 548 + dy] as P2, mouth: [300, hc + 50] as P2,
    sh: [[224, chin + 26], [376, chin + 26]] as [P2, P2] };
};
const ARM1 = 92, ARM2 = 88;

type LegP = { knee: P2; foot: P2; dir: P2 };
const legPreset = (m: Legs, s: number, hipY: number): LegP => {
  switch (m) {
    case "dangle": return { knee: [300 + s * 52, hipY + 112], foot: [300 + s * 40, hipY + 236], dir: [s * 0.55, 1] };
    case "tuck": return { knee: [300 + s * 92, hipY + 24], foot: [300 + s * 52, hipY + 132], dir: [s * 1, 0.3] };
    case "crouch": return { knee: [300 + s * 104, hipY - 4], foot: [300 + s * 44, hipY + 110], dir: [s * 1, 0] };
    case "stretch": return { knee: [300 + s * 20, hipY + 152], foot: [300 + s * 15, hipY + 318], dir: [s * 0.15, 1] };
    case "sit": return { knee: [300 + s * 78, hipY + 8], foot: [300 + s * 74, 950], dir: [s * 1, 0.15] };
  }
};

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

const hairBehind = (p: Pen, k: Kit, cx: number, hc: number, H: Blob, light: number, thick: number, u: number) => {
  if (k.style === "poof") { // 80s perm in zero-g: a huge floating cloud
    const lumps: [number, number, number][] = [];
    for (let i = 0; i < 11; i++) { const a = rad(150 + (i / 10) * 240); lumps.push([cx + Math.cos(a) * H.a * 1.02, hc + Math.sin(a) * H.b * 1.0 - 14 * u, (24 + 7 * rnd(k.seed, i)) * u]); }
    lumps.push([cx, hc - 30 * u, 70 * u]);
    const parts = lumps.map(([x, y, r]) => ellPts(x, y, r, r * 0.92, 28));
    for (const pt of parts) p.inkRing(pt, 4.6 * u, thick, 0.45);
    for (const pt of parts) p.shadedFill(scalePts(pt, 0.97), k.hair, mul(k.hair, SH_HAIR), light, H.a * 1.4, 0.4);
    for (const [x, y, r] of lumps.slice(2, 8)) p.arc(x - 4 * u, y - 3 * u, r * 0.55, r * 0.45, 200, 250, 2.4 * u, mix(k.hair, WHITE, 0.3));
  } else if (k.style === "curly") {
    for (let i = 0; i < 9; i++) {
      const a = rad(185 + (i / 8) * 170), x = cx + Math.cos(a) * H.a * 1.0, y = hc + Math.sin(a) * H.b * 1.0;
      const pt = ellPts(x, y, 14 * u, 13 * u, 22);
      p.inkRing(pt, 4 * u, thick, 0.4); p.poly(scalePts(pt, 0.94), k.hair, 0);
    }
  } else if (k.style === "feather") {
    for (const s of [-1, 1]) p.poly([[cx + s * 0.86 * H.a, hc - 0.45 * H.b], [cx + s * 1.18 * H.a, hc - 0.05 * H.b], [cx + s * 1.08 * H.a, hc + 0.12 * H.b], [cx + s * 0.9 * H.a, hc + 0.05 * H.b]], k.hair, 4 * u);
  }
};

const hairFront = (p: Pen, k: Kit, hp: P2[], cx: number, hc: number, H: Blob, light: number, thick: number, u: number) => {
  const dk = mul(k.hair, [0.6, 0.58, 0.64]);
  if (k.style === "tuft" || k.style === "flop") {
    if (k.style === "tuft") { // zero-g cowlick standing straight up
      p.line(curve([cx + 6 * u, hc - H.b + 4 * u], [cx + 12 * u, hc - H.b - 22 * u], [cx - 4 * u, hc - H.b - 38 * u], 12), k.hair, 7 * u);
      p.line(curve([cx - 10 * u, hc - H.b + 6 * u], [cx - 22 * u, hc - H.b - 14 * u], [cx - 32 * u, hc - H.b - 18 * u], 10), k.hair, 5 * u);
    }
    capHair(p, hp, cx, hc, H, 0.42, k.hair, light, thick, u, 5);
    if (k.style === "flop") p.line(curve([cx + 4 * u, hc - H.b + 8 * u], [cx + 22 * u, hc - H.b + 10 * u], [cx + 28 * u, hc - 0.5 * H.b], 10), k.hair, 6 * u);
    p.stroke([[cx + 14 * u, hc - 0.9 * H.b], [cx + 4 * u, hc - 0.55 * H.b]], 1.3 * u, dk);
  } else if (k.style === "curly") {
    capHair(p, hp, cx, hc, H, 0.5, k.hair, light, thick, u, 6);
    for (let i = 0; i < 5; i++) p.arc(cx + (i - 2) * 16 * u, hc - 0.62 * H.b, 6 * u, 5 * u, 180, 360, 1.6 * u, dk);
  } else if (k.style === "poof") {
    const run = capHair(p, hp, cx, hc, H, 0.48, k.hair, light, thick, u, 7);
    if (run.length > 3) for (let i = 0; i < 4; i++) p.arc(cx + (i - 1.5) * 20 * u, hc - 0.58 * H.b, 8 * u, 6 * u, 160, 380, 1.6 * u, dk);
  } else if (k.style === "feather") {
    capHair(p, hp, cx, hc, H, 0.35, k.hair, light, thick, u, 3);
    p.stroke([[cx, hc - H.b * 1.02], [cx - 2 * u, hc - 0.55 * H.b]], 1.6 * u, dk);
    for (const s of [-1, 1]) p.stroke(curve([cx + s * 4 * u, hc - 0.95 * H.b], [cx + s * 30 * u, hc - 0.75 * H.b], [cx + s * 50 * u, hc - 0.55 * H.b], 8), 1.4 * u, dk);
  } else {
    capHair(p, hp, cx, hc, H, 0.56, k.hair, light, thick, u, 2);
  }
  if (k.headband) {
    const y = hc - 0.5 * H.b;
    p.clip(hp.map(([x, yy]) => [cx + (x - cx) * 1.06, hc + (yy - hc) * 1.06] as P2), () => p.band([[cx - 1.2 * H.a, y + 6 * u], [cx + 1.2 * H.a, y - 4 * u]], k.headband!, 10 * u, 1.6 * u));
  }
};

type EyeK = "dot" | "big" | "small" | "lid" | "slit" | "droop" | "happy" | "dash" | "squeeze" | "shock" | "bulge" | "aside";
type MouthK = "dash" | "frown" | "smirk" | "smile" | "smileWide" | "grin" | "ahh" | "o" | "O" | "wave" | "press" | "grit" | "sheep" | "blorp" | "sigh" | "flat";
type FaceDef = { eye: EyeK; brow: [number, number]; mouth: MouthK; puff?: number; red?: number; green?: number; blush?: number; tilt?: number };
const FACES: Record<Face, FaceDef> = {
  neutral: { eye: "lid", brow: [0, -1], mouth: "dash" },
  strain: { eye: "squeeze", brow: [6, -3], mouth: "press", puff: 0.6, red: 0.55 },
  annoyed: { eye: "slit", brow: [7, -2], mouth: "flat" },
  defeated: { eye: "droop", brow: [-6, 6], mouth: "sigh", tilt: 6 },
  relaxed: { eye: "happy", brow: [-2, 1], mouth: "smile" },
  sip: { eye: "happy", brow: [-3, 0], mouth: "o" },
  ahh: { eye: "happy", brow: [-5, 0], mouth: "ahh", blush: 0.5 },
  worried: { eye: "small", brow: [-6, 4], mouth: "wave" },
  queasy: { eye: "droop", brow: [-5, 5], mouth: "wave", green: 0.55, puff: 0.12 },
  wetburp: { eye: "squeeze", brow: [-5, 2], mouth: "blorp", green: 0.4, puff: 0.1 },
  embarrassed: { eye: "aside", brow: [-5, 3], mouth: "sheep", blush: 1 },
  excited: { eye: "big", brow: [-7, -5], mouth: "grin" },
  happySip: { eye: "happy", brow: [-4, -2], mouth: "o", blush: 0.3 },
  nervous: { eye: "small", brow: [-6, 3], mouth: "wave" },
  meme: { eye: "bulge", brow: [-15, -10], mouth: "press", puff: 1, red: 0.6, green: 0.5 },
  memeBurp: { eye: "squeeze", brow: [-8, -4], mouth: "blorp", puff: 0.35, green: 0.45, red: 0.3 },
  sheepish: { eye: "aside", brow: [-6, 4], mouth: "sheep", blush: 1 },
  sly: { eye: "slit", brow: [2, -6], mouth: "smirk" },
  determined: { eye: "lid", brow: [8, -3], mouth: "grit" },
  wide: { eye: "shock", brow: [-9, -8], mouth: "o" },
  blissful: { eye: "happy", brow: [-6, 2], mouth: "smileWide", blush: 0.6, tilt: -5 },
};

const eye = (p: Pen, kind: EyeK, x: number, ey: number, u: number, side: number, look: number, shake: number) => {
  const lx = x + look * 3 * u, lw = 3.8 * u;
  switch (kind) {
    case "dot": p.ell(lx, ey, 4.4 * u, 6.4 * u, INK, 0); break;
    case "big": p.ell(lx, ey, 5.6 * u, 8.2 * u, INK, 0); break;
    case "small": p.ell(lx, ey, 3.2 * u, 4.6 * u, INK, 0); break;
    case "aside": p.ell(x + 4 * u, ey + u, 4 * u, 5.6 * u, INK, 0); break;
    case "lid": p.ell(lx, ey - u, 7 * u, 6 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey - u], [x + 9 * u, ey - u]], lw); break;
    case "slit": p.ell(lx, ey, 7 * u, 2.8 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u, ey], [x + 9 * u, ey]], lw); break;
    case "droop": p.ell(lx, ey + 2 * u, 6.5 * u, 3.4 * u, INK, 0, 0, 180); p.stroke([[x - 9 * u * side, ey], [x + 9 * u * side, ey + 3 * u]], lw); break;
    case "happy": p.arc(x, ey + 3 * u, 8 * u, 6 * u, 200, 340, lw); break;
    case "dash": p.stroke([[x - 8.5 * u, ey], [x + 8.5 * u, ey]], lw); break;
    case "squeeze": p.stroke([[x + 7 * u * side, ey - 6 * u], [x - 7 * u * side, ey], [x + 7 * u * side, ey + 6 * u]], lw * 1.1); break;
    case "shock": p.ell(x, ey, 11 * u, 12 * u, WHITE, 2.6 * u); p.dot(lx - side * 1.5 * u, ey + 1.5 * u, 3.4 * u); break;
    case "bulge": { // THE MEME EYES: huge bloodshot saucers, pinprick pupils pointing slightly apart
      const r = 18.5 * u, ox = side * 2 * u, j = (shake % 2 ? 1 : -1) * 0.8 * u, cy = ey - 4 * u;
      p.ell(x + ox, cy, r * 1.05, r * 1.18, WHITE, 3.4 * u);
      for (let i = 0; i < 3; i++) { // red veins from the rim
        const a = rad(side > 0 ? 200 + i * 55 : -20 - i * 55), c = Math.cos(a), s = Math.sin(a);
        const a0: P2 = [x + ox + c * r * 0.98, cy + s * r * 1.12];
        p.stroke([a0, [a0[0] - c * 6 * u + 2 * u, a0[1] - s * 6 * u], [a0[0] - c * 10 * u, a0[1] - s * 9 * u + 1.5 * u]], 1.2 * u, "#e0505a");
      }
      p.dot(x + ox + side * 3.5 * u + j, cy + 1 * u - j, 3 * u);
      break;
    }
  }
};

const dmouth = (p: Pen, mx: number, y: number, rx: number, ry: number, u: number, tongue = false) => {
  p.ell(mx, y, rx, ry, MOUTH, 0, 0, 180);
  p.clip([[mx - rx, y], [mx + rx, y], [mx + rx, y + 3 * u], [mx - rx, y + 3 * u]], () => p.ell(mx, y, rx, ry, WHITE, 0, 0, 180));
  if (tongue) p.ell(mx + 2 * u, y + 0.62 * ry, 0.42 * rx, 0.3 * ry, TONGUE, 0);
  p.ell(mx, y, rx, ry, null, 3 * u, 0, 180);
};
const mouth = (p: Pen, kind: MouthK, mx: number, my: number, u: number, k: number, shake: number) => {
  const mw = 4 * u;
  switch (kind) {
    case "dash": p.stroke([[mx - 5.5 * u, my], [mx + 5.5 * u, my - 0.8 * u]], mw); break;
    case "flat": p.stroke([[mx - 9 * u, my + 1.5 * u], [mx + 7 * u, my - 0.5 * u]], mw); p.stroke([[mx + 7 * u, my - 0.5 * u], [mx + 10 * u, my + 2 * u]], 3 * u); break;
    case "frown": p.arc(mx, my + 3 * u, 6.5 * u, 3.5 * u, 200, 340, mw); break;
    case "sigh": p.arc(mx, my + 4 * u, 5 * u, 3 * u, 200, 340, mw); p.ell(mx + 1 * u, my + 2.5 * u, 2.2 * u, 1.6 * u, MOUTH, 0); break;
    case "smirk": p.arc(mx + 3 * u, my - 4 * u, 8 * u, 4.5 * u, 10, 120, mw); p.stroke([[mx - 5 * u, my - 0.5 * u], [mx + 2 * u, my + 0.5 * u]], mw); break;
    case "smile": p.arc(mx, my - 3 * u, 8 * u, 4.5 * u, 20, 160, mw); break;
    case "smileWide": p.arc(mx, my - 5 * u, 12 * u, 7 * u, 15, 165, mw); break;
    case "grin": dmouth(p, mx, my - u, 13 * u, 9 * u, u); break;
    case "ahh": dmouth(p, mx, my - 2 * u, 12 * u, 11 * u, u, true); break;
    case "o": p.ell(mx + 2 * u, my + u, 4 * u, 4.6 * u, MOUTH, 2.8 * u); break;
    case "O": p.ell(mx, my + 2 * u, 9 * u, 11 * u, MOUTH, 3.2 * u); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([mx - 9 * u + i * 1.5 * u, my + 1.6 * u * Math.sin(i * 1.3)]); p.stroke(s, 3 * u); break; }
    case "press": { // lips clamped shut against the pressure: a tight pucker with stress ticks
      const w = (6 - 2.5 * k) * u;
      p.ell(mx, my + u, w, 2.6 * u, "#b0505a", 2.8 * u);
      for (const s of [-1, 1]) p.stroke([[mx + s * (w + 3 * u), my - 2 * u], [mx + s * (w + 6 * u), my + 4 * u]], 1.6 * u);
      if (k > 0.5) p.stroke([[mx - 2 * u, my + 7 * u], [mx + 2 * u, my + 7.5 * u]], 1.4 * u);
      break;
    }
    case "grit":
      p.poly([[mx - 11 * u, my - 4 * u], [mx + 11 * u, my - 4 * u], [mx + 10 * u, my + 4 * u], [mx - 10 * u, my + 4 * u]], WHITE, 3 * u);
      p.stroke([[mx - 10 * u, my], [mx + 10 * u, my]], 1.4 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 5.5 * u, my - 4 * u], [mx + j * 5.5 * u, my + 4 * u]], 1.4 * u);
      break;
    case "sheep": { // awkward wide teeth grin, one corner up
      p.poly([[mx - 13 * u, my - 1 * u], [mx + 13 * u, my - 5 * u], [mx + 11 * u, my + 3 * u], [mx - 11 * u, my + 4 * u]], WHITE, 3 * u);
      for (const j of [-1, 0, 1]) p.stroke([[mx + j * 6 * u, my - 3.4 * u - j * u], [mx + j * 6 * u, my + 3.6 * u]], 1.3 * u);
      break;
    }
    case "blorp": { // a big wobbly open mouth with cola-brown goo welling out
      const pts: P2[] = [], j = shake % 3, sc = 0.8 + 0.4 * k;
      for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = 1 + 0.07 * Math.sin(a * 5 + j * 2); pts.push([mx + Math.cos(a) * 13 * u * r * sc, my + 3 * u + Math.sin(a) * 12 * u * r * sc]); }
      p.poly(pts, MOUTH, 0);
      p.clip(pts, () => { p.ell(mx, my + 14 * u, 13 * u, 9 * u, "#c9772e", 0); p.ell(mx - 3 * u, my + 9 * u, 4 * u, 2.5 * u, "#f3b56a", 0); });
      p.poly(pts, null, 3.2 * u);
      break;
    }
  }
};

const drawFace = (p: Pen, kit: Kit, cx: number, hc: number, H: Blob, f: FaceS, lid: number) => {
  const D = FACES[f.e], u = (2 * H.a) / 100, look = f.look ?? 0, shake = f.shake ?? 0, k = f.k ?? 1;
  const ey = hc - (D.eye === "bulge" ? 2 : 0) * u, ex = (D.eye === "bulge" ? 21 : 13) * u;
  let ek = D.eye;
  if (lid >= 1 && !["happy", "squeeze", "bulge", "dash"].includes(ek)) ek = "dash";
  else if (lid > 0 && (ek === "dot" || ek === "big" || ek === "small" || ek === "aside")) ek = "lid";
  else if (lid > 0 && ek === "lid") ek = "slit";
  for (const side of [-1, 1]) {
    const x = cx + side * ex;
    eye(p, ek, x, ey, u, side, look, shake);
    const [dI, dO] = D.brow, by = ey - (ek === "bulge" ? 38 : ek === "shock" ? 24 : 20) * u;
    if (ek === "bulge" || ek === "shock") p.arc(x + (ek === "bulge" ? side * 2 * u : 0), by + (dI + dO) * 0.25 * u, 11 * u, 4 * u, 200, 340, 4.4 * u);
    else if (f.e === "sly" && side < 0) taper(p, [x + 8.5 * u, by + 2 * u], [x - 8.5 * u, by + 3 * u], 5 * u, 2.5 * u);
    else taper(p, [x - side * 8.5 * u, by + dI * u], [x + side * 8.5 * u, by + dO * u], 5 * u, 2.5 * u);
  }
  if (kit.glasses && ek !== "bulge") for (const side of [-1, 1]) {
    const x = cx + side * 13 * u;
    if (kit.glasses === "round") p.ell(x, ey, 11 * u, 10 * u, null, 2.6 * u);
    else p.poly([[x - side * 11 * u, ey - 8 * u], [x + side * 12 * u, ey - 9 * u], [x + side * 10 * u, ey + 5 * u], [x + side * 1 * u, ey + 10 * u], [x - side * 10 * u, ey + 4 * u]], null, 2.4 * u);
    if (side > 0) p.stroke([[cx - 2.5 * u, ey - 4 * u], [cx + 2.5 * u, ey - 4 * u]], 2.2 * u);
  }
  const mx = cx + (f.e === "sly" ? 4 * u : 0), my = hc + 21 * u;
  if (kit.moustache) { // bushy 80s moustache, bristles up when the cheeks blow out
    const up = (D.puff ?? 0) * k * 3 * u - (D.eye === "bulge" ? 3 * u : 0);
    const pts: P2[] = [[mx - 20 * u, my - 2 * u - up], [mx - 12 * u, my - 10 * u - up], [mx, my - 9 * u - up], [mx + 12 * u, my - 10 * u - up], [mx + 20 * u, my - 2 * u - up], [mx + 13 * u, my - 4 * u - up], [mx, my - 3 * u - up], [mx - 13 * u, my - 4 * u - up]];
    mouth(p, D.mouth, mx, my + 2 * u, u, k, shake);
    p.poly(pts, kit.moustache, 2.6 * u);
    for (let i = -2; i <= 2; i++) p.stroke([[mx + i * 6 * u, my - 8 * u - up], [mx + i * 6.5 * u, my - 4 * u - up]], 1.1 * u, mul(kit.moustache, [0.6, 0.6, 0.65]));
  } else mouth(p, D.mouth, mx, my, u, k, shake);
  if (f.e === "meme") for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { // pressure throb ticks beside the temples
    const x = cx + s * (1.08 * H.a + i * 1.5 * u), y = hc - 0.55 * H.b + i * 9 * u;
    p.stroke([[x, y], [x + s * 9 * u, y - 2 * u]], 2.6 * u, INK);
  }
};

/** a whole astronaut card in the 600 x 1000 design space */
export const drawAstro = (p: Pen, kit: Kit, pose: Pose, face: FaceS, light: number, lid = 0) => {
  const L = layout(!!pose.sit), D = FACES[face.e], kk = face.k ?? 1;
  const puff = (D.puff ?? 0) * kk, grow = 1 + (face.e === "meme" ? 0.08 * kk : 0);
  const H0 = headBlob(kit.seed, HEAD_A, 0), H: Blob = { ...H0, a: H0.a * grow, b: H0.b * grow, rot: H0.rot * 0.5 };
  const W = 2 * H0.a, u = W / 100, thick = thickAngle(light), ow = 5 * u;
  const skinSh = mul(kit.skin, SH_SKIN), legCol = kit.pants, sockCol = kit.socks;
  // ---- legs ----
  for (const s of [-1, 1]) {
    const A = legPreset(pose.legs, s, L.hipY), B = legPreset(pose.legs2 ?? pose.legs, s, L.hipY), t = pose.lk ?? 0;
    const knee = lerp2(A.knee, B.knee, t), foot = lerp2(A.foot, B.foot, t), dir = lerp2(A.dir, B.dir, t);
    const hip: P2 = [300 + s * 30, L.hipY];
    const leg = curve(hip, knee, foot, 14);
    p.stroke(leg, 7.4 * u + 2 * p.ol * 0.9, INK);
    p.stroke(leg.slice(0, 12), 7.4 * u, legCol);
    p.stroke(leg.slice(11), 6.4 * u, sockCol);
    const m = leg[5], m2 = leg[6], ang = Math.atan2(m2[1] - m[1], m2[0] - m[0]);
    p.poly(ellPts(m[0] + s * 4 * u, m[1], 6 * u, 4.5 * u, 16, ang), shade(legCol, 0.88), 1.4 * u); // cargo pocket
    const dl = Math.hypot(dir[0], dir[1]) || 1, fx = foot[0] + (dir[0] / dl) * 9 * u, fy = foot[1] + (dir[1] / dl) * 9 * u;
    if (pose.legs === "sit" && (pose.legs2 ?? "sit") === "sit") p.ell(foot[0] + s * 6 * u, foot[1] + 2 * u, 10 * u, 6.5 * u, sockCol, 2.4 * u);
    else p.poly(ellPts((foot[0] + fx) / 2, (foot[1] + fy) / 2, 11 * u, 6.5 * u, 24, Math.atan2(dir[1], dir[0])), sockCol, 2.4 * u);
  }
  // ---- arms (2-bone, elbows out) ----
  const arm = (side: 0 | 1) => {
    const S = L.sh[side], s = side ? 1 : -1, Hd = pose.hands[side];
    const d0 = Math.hypot(Hd[0] - S[0], Hd[1] - S[1]), d = Math.max(30, Math.min(d0, ARM1 + ARM2 - 2));
    const ang = Math.atan2(Hd[1] - S[1], Hd[0] - S[0]), hand: P2 = [S[0] + Math.cos(ang) * d, S[1] + Math.sin(ang) * d];
    const dx = hand[0] - S[0], dy = hand[1] - S[1];
    const a = (ARM1 * ARM1 - ARM2 * ARM2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ARM1 * ARM1 - a * a));
    let px = -dy / d, py = dx / d;
    if (px * s < 0) { px = -px; py = -py; }
    const E: P2 = [S[0] + (dx / d) * a + px * h, S[1] + (dy / d) * a + py * h];
    const pts = [...curve(S, lerp2(S, E, 0.5), E, 6), ...curve(E, lerp2(E, hand, 0.5), hand, 6).slice(1)];
    p.stroke(pts, 5.6 * u + 2 * p.ol * 0.9, INK);
    p.stroke(pts, 5.6 * u, kit.skin);
    const sl = lerp2(S, E, 0.55);
    p.line([S, sl], kit.shirt, 13 * u);
    if (kit.stripe) p.stroke([lerp2(S, sl, 0.4), lerp2(S, sl, 0.72)], 13 * u, kit.stripe);
    p.dot(hand[0], hand[1], 7.6 * u); p.dot(hand[0], hand[1], 5.6 * u, kit.skin);
  };
  const front = pose.front ?? [false, false];
  if (!front[0]) arm(0);
  if (!front[1]) arm(1);
  // ---- torso: shirt + pants band ----
  const T: Blob = { a: (0.4 * W) / 1.06, b: 0.5 * (L.tbot - L.top), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0, rot: 0, noise: 0.006, seed: kit.seed + 7 };
  const tcy = L.tbot - T.b, tp = blobPts(300, tcy, T);
  p.gradFill(tp, kit.shirt, mul(kit.shirt, SH_CLOTH), light, 0.22, 0.3);
  const seam = mul(kit.shirt, [0.68, 0.66, 0.72]);
  p.clip(tp, () => {
    if (kit.stripe) for (let i = 0; i < 4; i++) { const y = L.chin + 34 + i * 40; p.band([[100, y], [500, y]], kit.stripe!, 16, 0); }
    const pb = L.tbot - 50;
    p.gradFill([[150, pb], [450, pb - 2], [450, 1000], [150, 1000]], kit.pants, mul(kit.pants, SH_CLOTH), light, 0.3);
    p.band([[150, pb + 3], [450, pb + 1]], mul(kit.pants, [0.55, 0.55, 0.6]), 9, 1.2);
    p.stroke([[300, pb + 12], [300, L.tbot]], 1.4 * u, mul(kit.pants, [0.6, 0.6, 0.65]));
    if (!kit.tee) { // polo placket + buttons
      p.stroke([[300, L.chin - 2], [300, L.chin + 58]], 1.3 * u, seam);
      for (const y of [L.chin + 22, L.chin + 44]) { p.dot(300.6, y, 2.8 * u); p.dot(300.6, y, 2 * u, WHITE); }
    }
    if (kit.patch) { // our own mission patch (screen-right chest)
      const px = 300 + 0.5 * T.a, py = L.chin + 56;
      p.ell(px, py, 13 * u, 13 * u, "#2a3f8f", 1.6 * u);
      p.ell(px, py, 9 * u, 4 * u, null, 1.6 * u, 0, 360, -25);
      p.ell(px - 2 * u, py + 1.5 * u, 4.5 * u, 4.5 * u, "#5ab0e8", 1 * u);
      p.dot(px + 6 * u, py - 5 * u, 1.8 * u, "#f4d35a");
      p.arc(px, py, 10.5 * u, 10.5 * u, 215, 295, 1.6 * u, "#e04a3a");
    }
    if (kit.tape) { // name tape (screen-left chest)
      const px = 300 - 0.52 * T.a, py = L.chin + 54, g = p.g;
      p.poly([[px - 20 * u, py - 5.5 * u], [px + 20 * u, py - 5.5 * u], [px + 20 * u, py + 5.5 * u], [px - 20 * u, py + 5.5 * u]], "#1d2236", 1.2 * u);
      const [tx, ty] = p.P(px, py + 0.4 * u);
      g.save(); g.translate(tx, ty); if (p.rot) g.rotate(p.rot[0]);
      g.fillStyle = WHITE; g.font = `900 ${7.6 * u}px Arial Black, Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(kit.tape!, 0, 0); g.restore();
    }
  });
  p.inkRing(tp, ow, thick);
  if (kit.tee) p.arc(300, L.chin - 6, 24 * u, 10 * u, 20, 160, 3 * u, mul(kit.shirt, [0.8, 0.8, 0.85]));
  else for (const sd of [-1, 1]) p.poly([[300 + sd * 2 * u, L.chin - 2 * u], [300 + sd * 26 * u, L.chin - 8 * u], [300 + sd * 19 * u, L.chin + 22]], kit.stripe ? WHITE : mix(kit.shirt, WHITE, 0.2), 1.8 * u);
  if (front[0]) arm(0);
  if (front[1]) arm(1);
  // ---- head (+ blown-out cheeks) ----
  const hr = (pose.headRot ?? 0) + rad((D.tilt ?? 0) + (pose.headTilt ?? 0));
  const cx = 300 + (face.e === "meme" ? ((face.shake ?? 0) % 2 ? 1.2 : -1.2) * u : 0), hc = L.hc;
  p.rot = hr ? [hr, 300, hc] : null;
  hairBehind(p, kit, cx, hc, H, light, thick, u);
  const hp = blobPts(cx, hc, H), parts: P2[][] = [hp], cr = (0.14 + 0.3 * puff) * H.a, cxo = (0.62 + 0.18 * puff) * H.a, cyo = (0.34 + 0.06 * puff) * H.b;
  if (puff > 0.04) for (const s of [-1, 1]) parts.push(ellPts(cx + s * cxo, hc + cyo, cr * 1.05, cr * 0.95, 36));
  for (const pt of parts) p.inkRing(pt, ow, thick);
  parts.forEach((pt, i) => p.shadedFill(scalePts(pt, 1 - (0.5 * ow) / (i ? cr : H.a)), kit.skin, skinSh, light, i ? cr * 1.6 : H.a));
  const red = (D.red ?? 0) * kk, green = (D.green ?? 0) * kk, blush = (D.blush ?? 0) * kk;
  if (red > 0 || green > 0 || blush > 0) clipMany(p, parts, () => {
    const g = p.g;
    if (green > 0) {
      const [ax, ay] = p.P(cx, hc + H.b * 1.1), [bx, by] = p.P(cx, hc - H.b * 0.35);
      const gr = g.createLinearGradient(ax, ay, bx, by);
      gr.addColorStop(0, rgba("#7cc95a", 0.85 * green)); gr.addColorStop(0.55, rgba("#a6d86a", 0.5 * green)); gr.addColorStop(1, rgba("#a6d86a", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
    const a = red > 0 ? red : blush * 0.6;
    if (a > 0) for (const s of [-1, 1]) {
      const [x, y] = p.P(cx + s * cxo, hc + 0.36 * H.b), R = red > 0 ? (0.22 + 0.3 * puff) * H.a : 0.17 * H.a;
      const gr = g.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, rgba("#ff5050", 0.65 * a)); gr.addColorStop(1, rgba("#ff5050", 0));
      g.fillStyle = gr; g.fillRect(-5000, -5000, 20000, 20000);
    }
  });
  if (puff > 0.3) for (const s of [-1, 1]) p.arc(cx + s * cxo - 0.2 * cr, hc + cyo - 0.25 * cr, cr * 0.55, cr * 0.5, 200, 250, 3 * u, "rgba(255,255,255,0.85)");
  hairFront(p, kit, hp, cx, hc, H, light, thick, u);
  drawFace(p, kit, cx, hc, H, face, lid);
  p.rot = null;
};

// ---------------- effect cards ----------------
/** clean burp ring (512 x 512): a pale blue-white shock ring, alpha a */
export const fxBurpRing = (p: Pen, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  p.arc(256, 256, 200, 200, 0, 360, 44, INK);
  p.arc(256, 256, 200, 200, 0, 360, 28, "#dff4ff");
  p.arc(256, 256, 200, 200, 200, 260, 10, WHITE);
  g.restore();
};
/** the pathetic fail puff (256 x 256): a small droopy grey cloud */
export const fxFailPuff = (p: Pen, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  const lumps: [number, number, number][] = [[128, 120, 58], [80, 140, 38], [176, 140, 40], [110, 168, 34], [150, 170, 32]];
  for (const [x, y, r] of lumps) p.ell(x, y, r + 9, r + 8, INK, 0);
  for (const [x, y, r] of lumps) p.ell(x, y, r, r * 0.95, "#c9cdd6", 0);
  p.arc(116, 108, 28, 22, 200, 260, 8, WHITE);
  g.restore();
};
/** wobbly translucent cola blob (256 x 256); ph = wobble phase step, a = alpha */
export const fxWetBlob = (p: Pen, seed: number, ph: number, a: number) => {
  const pts: P2[] = [], n = 40, w = ph * 0.8;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 92 * (1 + 0.1 * Math.sin(2 * t + w + seed) + 0.06 * Math.sin(3 * t - 1.3 * w + seed * 2));
    pts.push([128 + Math.cos(t) * r * (1 + 0.08 * Math.sin(w)), 128 + Math.sin(t) * r * (1 - 0.08 * Math.sin(w))]);
  }
  const g = p.g; g.save(); g.globalAlpha = a;
  p.path(pts, true); g.fillStyle = "rgba(196,110,40,0.62)"; g.fill();
  p.poly(pts, null, 9);
  p.ell(150, 160, 14, 14, "rgba(255,230,190,0.9)", 4);
  p.ell(102, 150, 9, 9, "rgba(255,230,190,0.9)", 3);
  p.arc(112, 104, 48, 40, 200, 260, 12, "rgba(255,255,255,0.95)");
  g.restore();
};
/** little round droplet (128 x 128) */
export const fxDrop = (p: Pen, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  p.ell(64, 64, 44, 44, "rgba(205,125,55,0.7)", 8);
  p.arc(54, 52, 20, 16, 200, 260, 8, WHITE);
  g.restore();
};
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#9fd4ff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, "#e8f6ff");
};
/** speed lines (768 x 256), alpha a */
export const fxSpeed = (p: Pen, seed: number, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 38 + (rnd(seed, i) - 0.5) * 14, x0 = 20 + rnd(seed, i + 7) * 220, x1 = 520 + rnd(seed, i + 13) * 230, w = 9 + rnd(seed, i + 3) * 7;
    p.poly([[x0, y], [x1, y - w / 2], [x1 + 8, y], [x1, y + w / 2]], "#ffffff", 5);
  }
  g.restore();
};
/** sparkle: 4-point stars (240 x 240) */
export const fxSparkle = (p: Pen, t: number) => {
  const k = 0.55 + 0.45 * Math.sin(t * Math.PI);
  for (const [cx, cy, r] of [[120, 120, 100 * k], [50, 60, 34 * k], [196, 190, 28 * k]] as const) {
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r2 = i % 2 ? r * 0.28 : r; pts.push([cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)]); }
    p.poly(pts, "#fff3a8", 6);
  }
};
/** "?" (300 x 400) */
export const fxQuestion = (p: Pen) => {
  const g = p.g;
  g.save(); g.font = "900 330px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineJoin = "round"; g.lineWidth = 30; g.strokeStyle = INK; g.strokeText("?", 150, 350);
  g.fillStyle = "#ffe46b"; g.fillText("?", 150, 350); g.restore();
  p.arc(122, 150, 40, 70, 200, 250, 9, "#fff7c4");
};
/** pssht: fizzy spray burst out of a can top (256 x 256), u = 0..1 life, alpha a */
export const fxSpray = (p: Pen, seed: number, u: number, a: number) => {
  const g = p.g; g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(128, 200, 0, 128, 170, 130);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.moveTo(128, 240); g.lineTo(24, 40); g.quadraticCurveTo(128, -10, 232, 40); g.closePath(); g.fill();
  for (let i = 0; i < 14; i++) {
    const ang = rad(-90 + (rnd(seed, i) - 0.5) * 100), d = 40 + (150 + 40 * rnd(seed, i + 5)) * u, r = 5 + 7 * rnd(seed, i + 9);
    const x = 128 + Math.cos(ang) * d, y = 236 + Math.sin(ang) * d;
    if (y < 10 || x < 10 || x > 246) continue;
    p.ell(x, y, r, r, "#e8f8ff", 3);
  }
  g.restore();
};
