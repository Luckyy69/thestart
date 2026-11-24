// OWNER: cast agent (effect drawings) — Canvas2D drawings via the bridge Pen.
// 1) accessories painted onto a character's own card after bodyFront (same canvas, nothing drifts): Australian slouch hat
//    (side brim pinned up + rising-sun badge, or a plain farmer's felt), the major's peaked cap (red band, black peak,
//    optional askew tilt + a stray emu feather), a big handlebar moustache whose tips follow his mood (perky -> droop),
//    Sam Browne belt + officer's pockets + red collar tabs + ribbon bar, soldier webbing belt, farmer's braces + rolled
//    sleeves, a wheat straw in the mouth, a pitchfork / white flag / thumbs-up on the raised hand, a telephone earpiece at
//    the ear, binoculars over the eyes, a sticking plaster.
// 2) effect cards: "?" / "!" pops, sweat drops, speed lines, the "RING RING!" burst, cartoon poof clouds, soft dust,
//    sparkles + a tooth glint, the major's thought bubble (emu army), and the NEWSPAPER broadsheet (1536 x 2048).
import { Pen, INK, headBlob, blobPts, Blob, mix, shade, Build } from "../bridge/toon";

type P2 = [number, number];
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const ellP = (cx: number, cy: number, rx: number, ry: number, n = 48, a0 = 0, a1 = Math.PI * 2): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => [cx + rx * Math.cos(a0 + ((a1 - a0) * i) / n), cy + ry * Math.sin(a0 + ((a1 - a0) * i) / n)] as P2);
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const b = ((a + (90 * i) / 6) * Math.PI) / 180; pts.push([cx + r * Math.cos(b), cy + r * Math.sin(b)]); }
  return pts;
};
const curve = (a: P2, k: P2, b: P2, n = 12): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * a[0] + 2 * s * t * k[0] + t * t * b[0], s * s * a[1] + 2 * s * t * k[1] + t * t * b[1]] as P2; });
const bez = (a: P2, k: P2, b: P2, t: number): P2 => { const s = 1 - t; return [s * s * a[0] + 2 * s * t * k[0] + t * t * b[0], s * s * a[1] + 2 * s * t * k[1] + t * t * b[1]]; };
const thin = (p: Pen, pts: P2[], col: string, w: number, rim: number) => { p.stroke(pts, w + 2 * rim, INK); p.stroke(pts, w, col); };
const hexA = (c: string, a: number) => { const v = parseInt(c.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };

// ---------------- body geometry (mirrors bodyFront in bridge/toon.ts) ----------------
const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 }, stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 }, kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};
export type CardMode = "stand" | "sit" | "stroll";
export type Geo = { W: number; u: number; HH: number; Ha: number; Hb: number; hc: number; chin: number; crown: number; torsoBot: number; hipY: number;
  tcx: number; Ta: number; Tb: number; seed: number; facing: number; H: Blob; mode: CardMode; build: Build; phase: number; sway: number };
/** geometry of a front card; stroll includes bodyFront's step bob + sway at `phase` */
export const geoOf = (seed: number, mode: CardMode, facing = 0, build: Build = "adult", phase = 0): Geo => {
  const Bd = BUILD[build], H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100, two = Math.PI * 2;
  const tall = (1 + Bd.torso + Bd.legs) * HH, bob = mode === "stroll" ? 0.015 * tall * Math.cos(2 * two * phase) : 0;
  const torsoBot = mode === "sit" ? 975 - 0.2 * HH : 975 - Bd.legs * HH + bob, chin = torsoBot - Bd.torso * HH, hc = chin - H.b;
  return { W, u, HH, Ha: H.a, Hb: H.b, hc, chin, crown: hc - H.b, torsoBot, hipY: torsoBot - 0.12 * HH, tcx: 300 + 3 * u * facing,
    Ta: ((Bd.tw / 2) * W) / 1.06, Tb: 0.5 * (torsoBot - (chin - 0.25 * HH)), seed, facing, H, mode, build, phase,
    sway: mode === "stroll" ? 1.0 * Math.sin(two * phase) : 0 };
};
const torsoPts = (g: Geo) => {
  const T: Blob = { a: g.Ta, b: g.Tb, nTop: 2.2, nBot: 2.6, egg: g.build === "stout" ? 0.17 : 0.12, asym: 0.04 * g.facing, rot: 0, noise: 0.006, seed: g.seed + 7 };
  return blobPts(g.tcx, g.torsoBot - g.Tb, T);
};
type Arm = [P2, P2, P2];
/** the two arms as bodyFront draws them: [left (screen), right] as quadratic (shoulder, control, hand) */
export const armsOf = (g: Geo, o: { wave?: number; rifle?: boolean }): [Arm, Arm] => {
  const { tcx, Ta, chin, HH, u, torsoBot, crown, mode } = g;
  const sh = (s: number): P2 => [tcx + s * 0.85 * Ta, chin + 0.12 * HH];
  if (mode === "sit") return [-1, 1].map((s) => [sh(s), [tcx + s * (1.1 * Ta + 6 * u), sh(s)[1] + 0.4 * HH], [tcx + s * (1.2 * Ta + 10 * u), torsoBot + 0.04 * HH]] as Arm) as [Arm, Arm];
  const hang = (s: number, fwd: number): Arm => {
    const S = sh(s), ex = tcx + s * (1.12 * Ta + 4 * u);
    const hx = ex + s * 3 * u - s * 6 * u * Math.max(0, fwd) + s * 4 * u * Math.max(0, -fwd);
    return [S, [ex, S[1] + 0.48 * HH], [hx, chin + 1.04 * HH - Math.abs(fwd) * 9 * u]];
  };
  const sw = mode === "stroll" ? Math.sin(2 * Math.PI * g.phase) : 0;
  let R: Arm;
  if (o.rifle && mode !== "stroll") {
    const R0: P2 = [300 + 47 * u, torsoBot + 0.12 * HH], R1: P2 = [300 + 64 * u, crown - 0.32 * HH];
    R = [sh(1), [tcx + 1.12 * Ta + 5 * u, sh(1)[1] + 0.45 * HH], [R0[0] + (R1[0] - R0[0]) * 0.1, R0[1] + (R1[1] - R0[1]) * 0.1]];
  } else if (o.wave !== undefined) {
    const S = sh(1), w = o.wave;
    R = [S, [tcx + 1.1 * Ta + 10 * u + 3 * u * w, S[1] - 0.22 * HH], [tcx + 1.18 * Ta + 16 * u + 12 * u * w, S[1] - 0.6 * HH]];
  } else R = hang(1, sw);
  return [hang(-1, -sw), R];
};
export const headTopY = (g: Geo) => g.crown;

/** remove the arms (everything left/right of the torso between shoulder and hip); right only or both */
const eraseArms = (p: Pen, g: Geo, both: boolean) => {
  const gg = p.g, tp = torsoPts(g), { tcx, chin, HH, torsoBot } = g;
  const x0 = both ? 0 : tcx + 0.3 * g.Ta;
  gg.save(); gg.beginPath();
  const box: P2[] = [[x0, chin + 0.02 * HH], [600, chin + 0.02 * HH], [600, torsoBot + 0.3 * HH], [x0, torsoBot + 0.3 * HH]];
  box.forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); }); gg.closePath(); gg.clip();
  gg.beginPath(); gg.rect(-2000, -2000, 6000, 6000);
  tp.forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); }); gg.closePath();
  gg.globalCompositeOperation = "destination-out"; gg.fillStyle = "#000"; gg.fill("evenodd"); gg.restore();
  p.clip([[-400, chin + 1.5 * g.u], [1000, chin + 1.5 * g.u], [1000, 1400], [-400, 1400]], () => p.poly(tp, null, 4.6 * g.u));
};

export type Acc = {
  slouch?: string;      // slouch hat felt colour
  pinned?: boolean;     // side brim pinned up + rising-sun badge (army)
  cap?: boolean;        // the major's peaked cap
  askew?: number;       // cap tilt (deg)
  feather?: boolean;    // an emu feather stuck in the cap band
  tache?: number;       // handlebar moustache mood -1 droop .. 1 perky
  officer?: boolean;    // Sam Browne belt, 4 pockets, red tabs, ribbons
  webbing?: boolean;    // soldier: khaki webbing belt + shirt pockets
  braces?: string;      // farmer braces colour
  rolled?: string;      // rolled sleeves: forearm skin colour
  straw?: boolean;      // wheat straw in the mouth
  fork?: boolean;       // pitchfork in the raised hand
  flag?: number;        // limp white flag on the raised hand (flutter phase)
  thumb?: boolean;      // thumbs-up on the raised hand
  phone?: boolean;      // telephone earpiece held to the ear (right arm re-drawn)
  binocs?: boolean;     // binoculars over the eyes (both arms re-drawn)
  plaster?: boolean;    // sticking plaster on the cheek
  wave?: number;        // (mirror of FrontOpts.wave, for the raised-hand items)
  rifle?: boolean;      // (mirror of Outfit.rifle)
};
export const accKey = (a: Acc) => JSON.stringify(a, (_k, v) => (typeof v === "number" ? Math.round(v * 40) / 40 : v));

export const KHAKI = "#c4aa70", KHAKI_D = "#8f7a50", FELT = "#8e7250", LEATHER = "#7a4524", BRASS = "#e2b64a";

/** the slouch hat (front view) */
const slouchHat = (p: Pen, g: Geo, col: string, pinned: boolean) => {
  const { u, hc } = g, cx = 300, by = hc - 25 * u, dk = shade(col, 0.78), lt = mix(col, "#ffffff", 0.22);
  // brim: wide, flat, seen a touch from above (back half lighter, front edge lip); pinned side ends at the crown
  const xl = cx - 78 * u, xr = pinned ? cx + 44 * u : cx + 78 * u;
  const brim: P2[] = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30, x = xl + (xr - xl) * t, e = (2 * (x - cx)) / (156 * u); brim.push([x, by - 7 * u * Math.sqrt(Math.max(0, 1 - e * e)) - 1 * u]); }
  for (let i = 30; i >= 0; i--) { const t = i / 30, x = xl + (xr - xl) * t, e = (2 * (x - cx)) / (156 * u); brim.push([x, by + 6.5 * u * Math.sqrt(Math.max(0, 1 - e * e)) + 1 * u + (x < cx - 60 * u ? (cx - 60 * u - x) * 0.12 : 0)]); }
  p.poly(brim, col, 3.6 * u);
  p.stroke(brim.slice(31).map(([x, y]) => [x, y - 2.4 * u] as P2), 1.6 * u, dk);
  // crown: tapered dome with the centre dent (pinch)
  const crown: P2[] = [[cx - 43 * u, by + 1 * u], [cx - 45 * u, by - 18 * u], [cx - 38 * u, by - 34 * u], [cx - 22 * u, by - 41 * u], [cx - 6 * u, by - 36 * u],
    [cx + 2 * u, by - 33 * u], [cx + 10 * u, by - 37 * u], [cx + 26 * u, by - 41 * u], [cx + 39 * u, by - 33 * u], [cx + 45 * u, by - 18 * u], [cx + 43 * u, by + 1 * u]];
  p.poly(crown, col, 4 * u);
  p.stroke([[cx + 2 * u, by - 33 * u], [cx + 1 * u, by - 20 * u]], 1.8 * u, dk); // dent crease
  p.stroke(curve([cx - 34 * u, by - 26 * u], [cx - 28 * u, by - 36 * u], [cx - 16 * u, by - 37 * u]), 3 * u, lt);
  // puggaree band (pleated)
  const band: P2[] = [[cx - 44 * u, by - 1 * u], [cx - 44.5 * u, by - 11 * u], [cx + 44.5 * u, by - 11 * u], [cx + 44 * u, by - 1 * u]];
  p.poly(band, pinned ? "#c9b68a" : shade(col, 0.6), 2.4 * u);
  if (pinned) for (const k of [-0.6, -0.2, 0.2, 0.6]) p.stroke([[cx + k * 44 * u, by - 9.5 * u], [cx + (k + 0.1) * 44 * u, by - 2.5 * u]], 1.1 * u, "#a8946a");
  if (pinned) {
    // the pinned-up side: the brim folded flat against the crown, screen right
    const flap: P2[] = [[cx + 40 * u, by + 2 * u], [cx + 62 * u, by - 2 * u], [cx + 70 * u, by - 22 * u], [cx + 64 * u, by - 46 * u], [cx + 50 * u, by - 52 * u], [cx + 40 * u, by - 40 * u]];
    p.poly(flap, mix(col, "#ffffff", 0.08), 3.6 * u);
    p.stroke(curve([cx + 44 * u, by - 4 * u], [cx + 64 * u, by - 20 * u], [cx + 52 * u, by - 46 * u]), 1.4 * u, dk);
    // rising-sun badge
    const bx = cx + 54 * u, byy = by - 24 * u;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI, r0 = 4 * u, r1 = (i % 2 ? 8.5 : 10.5) * u;
      p.poly([[bx + r0 * Math.cos(a - 0.12), byy + r0 * Math.sin(a - 0.12)], [bx + r1 * Math.cos(a), byy + r1 * Math.sin(a)], [bx + r0 * Math.cos(a + 0.12), byy + r0 * Math.sin(a + 0.12)]], BRASS, 1 * u);
    }
    p.ell(bx, byy, 4.6 * u, 4.6 * u, BRASS, 1.2 * u, 180, 360);
    p.stroke([[bx - 11 * u, byy + 0.5 * u], [bx + 11 * u, byy + 0.5 * u]], 2 * u, INK);
    p.poly(rr(bx - 9 * u, byy + 2 * u, bx + 9 * u, byy + 6 * u, 1.5 * u), BRASS, 1 * u);
  }
};

/** the major's peaked service cap */
const peakedCap = (p: Pen, g: Geo, a: Acc) => {
  const { u, hc } = g, cx = 300, by = hc - 26 * u;
  const prev = p.rot, tilt = ((a.askew ?? 0) * Math.PI) / 180;
  if (tilt) {
    // compose with the body rotation: rotate about the cap base
    const [px, py] = p.P(cx, by);
    p.rot = [(prev ? prev[0] : 0) + tilt, px, py, 0, 0];
    const base = prev; // map design -> body-rotated, then tilt about the base point
    const P0 = p.P.bind(p);
    p.P = (x: number, y: number): P2 => {
      if (!base) return P0(x, y);
      const a0 = base[0], c0 = Math.cos(a0), s0 = Math.sin(a0);
      const x1 = base[1] + (x - base[1]) * c0 - (y - base[2]) * s0, y1 = base[2] + (x - base[1]) * s0 + (y - base[2]) * c0;
      const ct = Math.cos(tilt), st = Math.sin(tilt);
      return [px + (x1 - px) * ct - (y1 - py) * st, py + (x1 - px) * st + (y1 - py) * ct];
    };
    if (!base) p.rot = [tilt, px, py];
  }
  const top: P2[] = [];
  const crownCol = "#9c875a";
  // crown: flares wide above the band
  const crown: P2[] = [[cx - 46 * u, by - 12 * u], [cx - 60 * u, by - 26 * u], [cx - 56 * u, by - 34 * u], [cx, by - 38 * u], [cx + 56 * u, by - 34 * u], [cx + 60 * u, by - 26 * u], [cx + 46 * u, by - 12 * u]];
  p.poly(crown, crownCol, 4 * u);
  p.stroke(curve([cx - 48 * u, by - 30 * u], [cx, by - 35 * u], [cx + 30 * u, by - 32 * u]), 2.4 * u, mix(crownCol, "#ffffff", 0.3));
  void top;
  // band (staff red)
  p.poly([[cx - 46 * u, by + 1 * u], [cx - 46 * u, by - 13 * u], [cx + 46 * u, by - 13 * u], [cx + 46 * u, by + 1 * u]], "#bf2f36", 3 * u);
  if (a.feather) {
    const fx0 = cx + 30 * u, fy0 = by - 8 * u;
    const f: P2[] = [[fx0, fy0], [fx0 + 10 * u, fy0 - 26 * u], [fx0 + 24 * u, fy0 - 48 * u], [fx0 + 16 * u, fy0 - 22 * u], [fx0 + 5 * u, fy0 - 2 * u]];
    p.poly(f, "#4a3a2c", 2 * u);
    for (let i = 1; i < 5; i++) { const t = i / 5; p.stroke([[fx0 + 12 * u * t, fy0 - 28 * u * t], [fx0 + 12 * u * t + 9 * u, fy0 - 28 * u * t - 4 * u]], 1.4 * u, "#6a5440"); }
  }
  // chin strap + peak
  p.stroke([[cx - 40 * u, by + 1 * u], [cx + 40 * u, by + 1 * u]], 2.4 * u, LEATHER);
  const peak = ellP(cx, by + 1 * u, 47 * u, 10 * u, 30, 0, Math.PI);
  p.poly(peak, "#1d1a1e", 3 * u);
  p.arc(cx - 8 * u, by + 3 * u, 30 * u, 5 * u, 20, 120, 2.2 * u, "#6a6470");
  // gold badge: crown over a lion-ish blob
  p.ell(cx, by - 20 * u, 7 * u, 6.5 * u, BRASS, 1.6 * u);
  p.poly([[cx - 6 * u, by - 26 * u], [cx - 3 * u, by - 31 * u], [cx, by - 27 * u], [cx + 3 * u, by - 31 * u], [cx + 6 * u, by - 26 * u]], BRASS, 1.2 * u);
  p.dot(cx, by - 20 * u, 2 * u, "#a07a2a");
  if (tilt) { delete (p as unknown as { P?: unknown }).P; p.rot = prev; }
};

/** the handlebar moustache: m = mood (-1 droop .. 1 perky) */
const handlebar = (p: Pen, g: Geo, m: number) => {
  const { u, hc } = g, cx = 300 + 8 * u * g.facing, y0 = hc + 11 * u, col = "#5b3a24", hi = "#8a5f3e";
  for (const s of [-1, 1]) {
    const tipY = y0 + 2 * u - 9 * u * m, curlY = tipY - 7 * u * Math.sign(m || 0.01) * Math.min(1, Math.abs(m) + 0.3);
    const top: P2[] = curve([cx + s * 1 * u, y0 - 4 * u], [cx + s * 16 * u, y0 - 7 * u], [cx + s * 30 * u, tipY - 1 * u], 10);
    const bot: P2[] = curve([cx + s * 30 * u, tipY + 1.5 * u], [cx + s * 16 * u, y0 + 4 * u], [cx + s * 1 * u, y0 + 2.5 * u], 10);
    p.poly([...top, [cx + s * 35 * u, curlY], [cx + s * 36.5 * u, curlY + 3 * u * Math.sign(m || 0.01)], ...bot], col, 2.4 * u);
    p.stroke(curve([cx + s * 5 * u, y0 - 3 * u], [cx + s * 15 * u, y0 - 5 * u], [cx + s * 24 * u, tipY - 1 * u], 8), 1.6 * u, hi);
  }
};

/** design-space points of interest for world-placed cards */
export const mouthPt = (g: Geo): P2 => [300 + 8 * g.u * g.facing, g.hc + 20 * g.u];
export const earPt = (g: Geo): P2 => [300 + 0.95 * g.Ha, g.hc + 4 * g.u];

/** drawn after the body, onto the same card. `o` colours of the outfit */
export const accFront = (p: Pen, g: Geo, a: Acc, o: { jacket: string; pants: string; boots: string; skin: string }) => {
  const { u, HH, hc, chin, tcx, Ta, torsoBot } = g;
  const armCol = mix(o.jacket, INK, 0.66);
  const tp = torsoPts(g);
  const arms = armsOf(g, { wave: a.wave, rifle: a.rifle });
  if (a.phone || a.binocs) eraseArms(p, g, !!a.binocs);
  // ---- clothing on the torso ----
  if (a.officer || a.webbing || a.braces) {
    // clip to the torso BELOW the chin (the head covers the torso's top; never paint over the face)
    const below: P2[] = [[-400, chin + 1.5 * u], [1000, chin + 1.5 * u], [1000, 1400], [-400, 1400]];
    p.clip(below, () => p.clip(tp, () => {
      if (a.braces) for (const s of [-1, 1]) {
        p.band([[tcx + s * 0.55 * Ta, chin - 0.05 * HH], [tcx + s * 0.42 * Ta, torsoBot + 0.05 * HH]], a.braces!, 5.5 * u, 1.3 * u);
        p.dot(tcx + s * 0.44 * Ta, torsoBot - 0.2 * HH, 2.2 * u, BRASS);
      }
      if (a.webbing || a.officer) {
        // breast pockets with flaps + buttons
        for (const s of [-1, 1]) {
          const px = tcx + s * 0.45 * Ta, py = chin + 0.22 * HH;
          p.poly(rr(px - 11 * u, py, px + 11 * u, py + 17 * u, 2 * u), shade(o.jacket, 0.95), 1.3 * u);
          p.poly([[px - 12 * u, py - 1 * u], [px + 12 * u, py - 1 * u], [px + 11 * u, py + 6 * u], [px, py + 8 * u], [px - 11 * u, py + 6 * u]], shade(o.jacket, 0.88), 1.3 * u);
          p.dot(px, py + 5 * u, 1.8 * u, a.officer ? BRASS : shade(o.jacket, 0.6));
        }
      }
      if (a.officer) {
        // lower pockets, Sam Browne: waist belt + cross strap over the right shoulder (screen left) + brass
        for (const s of [-1, 1]) { const px = tcx + s * 0.5 * Ta, py = torsoBot - 0.36 * HH; p.poly(rr(px - 13 * u, py, px + 13 * u, py + 20 * u, 2 * u), shade(o.jacket, 0.94), 1.3 * u); }
        p.band([[tcx - 0.62 * Ta, chin - 0.06 * HH], [tcx + 0.95 * Ta, torsoBot - 0.36 * HH]], LEATHER, 6 * u, 1.3 * u);
        p.band([[tcx - 1.3 * Ta, torsoBot - 0.4 * HH], [tcx + 1.3 * Ta, torsoBot - 0.4 * HH]], LEATHER, 8 * u, 1.4 * u);
        p.poly(rr(tcx - 6 * u, torsoBot - 0.4 * HH - 6 * u, tcx + 6 * u, torsoBot - 0.4 * HH + 6 * u, 1.5 * u), BRASS, 1.4 * u);
        p.poly(rr(tcx - 3 * u, torsoBot - 0.4 * HH - 3 * u, tcx + 3 * u, torsoBot - 0.4 * HH + 3 * u, 0.8 * u), LEATHER, 0.8 * u);
        for (let k = 0; k < 3; k++) p.dot(tcx + 2 * u * g.facing, chin + (0.18 + 0.2 * k) * HH, 2 * u, BRASS);
        // ribbon bar (far too many ribbons)
        const rx = tcx - 0.62 * Ta, ry = chin + 0.16 * HH;
        ["#c8323a", "#2f5fa8", "#e8c45a", "#3f8a4a", "#7b3a8a"].forEach((c, k) => p.poly(rr(rx - 13 * u + k * 5.4 * u, ry, rx - 8 * u + k * 5.4 * u, ry + 4.5 * u, 0.5 * u), c, 0.8 * u));
      } else if (a.webbing) {
        p.band([[tcx - 1.3 * Ta, torsoBot - 0.32 * HH], [tcx + 1.3 * Ta, torsoBot - 0.32 * HH]], "#c2b083", 7 * u, 1.3 * u);
        p.poly(rr(tcx - 5 * u, torsoBot - 0.32 * HH - 5 * u, tcx + 5 * u, torsoBot - 0.32 * HH + 5 * u, 1 * u), "#b9a77a", 1.2 * u);
      }
    }));
    p.clip(below, () => p.poly(tp, null, 4.6 * u));
    if (a.officer) for (const s of [-1, 1]) p.poly([[tcx + s * 6 * u, chin - 3 * u], [tcx + s * 17 * u, chin - 5 * u], [tcx + s * 15 * u, chin + 3 * u], [tcx + s * 6 * u, chin + 3 * u]], "#bf2f36", 1.2 * u);
  }
  // ---- rolled sleeves: forearms in skin from the elbow down + the rolled cuff ----
  if (a.rolled && !a.phone && !a.binocs) {
    for (const arm of arms) {
      const pts = curve(arm[0], arm[1], arm[2], 16).slice(9);
      thin(p, pts, a.rolled, 4.6 * u, 0.9 * u);
      const c = bez(arm[0], arm[1], arm[2], 9 / 16), c2 = bez(arm[0], arm[1], arm[2], 10 / 16), dx = c2[0] - c[0], dy = c2[1] - c[1], l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      p.poly([[c[0] + nx * 4.6 * u, c[1] + ny * 4.6 * u], [c[0] - nx * 4.6 * u, c[1] - ny * 4.6 * u], [c2[0] - nx * 4.4 * u, c2[1] - ny * 4.4 * u], [c2[0] + nx * 4.4 * u, c2[1] + ny * 4.4 * u]], mix(o.jacket, "#ffffff", 0.15), 1.4 * u);
      p.dot(arm[2][0], arm[2][1], 5.5 * u, INK);
    }
  }
  // ---- face things ----
  if (a.plaster) {
    const x = 300 + 16 * u, y = hc + 34 * u;
    p.poly(rr(x - 9 * u, y - 4 * u, x + 9 * u, y + 4 * u, 2 * u).map(([px, py]) => [x + (px - x) * 0.94 - (py - y) * 0.34, y + (px - x) * 0.34 + (py - y) * 0.94] as P2), "#f0c8a0", 1.4 * u);
    p.stroke([[x - 4 * u, y + 2 * u], [x + 4 * u, y - 2 * u]], 1 * u, "#c79a76");
  }
  if (a.tache !== undefined) handlebar(p, g, a.tache);
  if (a.straw) {
    const [mx, my] = mouthPt(g);
    thin(p, [[mx + 4 * u, my], [mx + 34 * u, my - 12 * u]], "#e8c65a", 2.2 * u, 0.8 * u);
    for (let k = 0; k < 4; k++) { const x = mx + 30 * u + k * 2.5 * u, y = my - 11 * u - k * 1.2 * u; p.ell(x, y - 2 * u, 2.2 * u, 3.4 * u, "#e8b84a", 0.9 * u, 0, 360, -60); }
  }
  // ---- hats ----
  if (a.slouch) slouchHat(p, g, a.slouch, !!a.pinned);
  if (a.cap) peakedCap(p, g, a);
  // ---- re-drawn arms ----
  if (a.phone) {
    // right arm bent up: the earpiece of a candlestick telephone held to his ear, cord dangling
    const S: P2 = [tcx + 0.85 * Ta, chin + 0.12 * HH], E: P2 = [tcx + 1.3 * Ta + 10 * u, chin + 0.5 * HH], [ex, ey] = earPt(g), Hd: P2 = [ex + 6 * u, ey + 12 * u];
    p.stroke(curve(S, [E[0] + 8 * u, E[1] - 0.05 * HH], E), 5.2 * u, armCol);
    p.stroke(curve(E, [E[0] + 2 * u, (E[1] + Hd[1]) / 2], Hd), 5.2 * u, armCol);
    p.stroke(curve([Hd[0] + 3 * u, Hd[1] + 8 * u], [Hd[0] + 22 * u, Hd[1] + 40 * u], [Hd[0] + 10 * u, Hd[1] + 90 * u], 14), 1.8 * u, INK); // cord
    p.poly(rr(ex - 4 * u, ey - 8 * u, ex + 12 * u, ey + 14 * u, 4 * u), "#1d1a1e", 2 * u); // earpiece
    p.ell(ex - 3 * u, ey + 3 * u, 4 * u, 9 * u, "#3a363e", 1.4 * u);
    p.dot(Hd[0], Hd[1], 5.5 * u, INK);
  }
  if (a.binocs) {
    const by = hc - 1 * u;
    for (const s of [-1, 1]) {
      const S: P2 = [tcx + s * 0.85 * Ta, chin + 0.12 * HH], E: P2 = [tcx + s * (1.15 * Ta + 6 * u), chin + 0.5 * HH], Hd: P2 = [300 + s * 18 * u, by + 14 * u];
      p.stroke(curve(S, [E[0], E[1]], E), 5.2 * u, armCol);
      p.stroke(curve(E, [E[0] - s * 2 * u, by + 30 * u], Hd), 5.2 * u, armCol);
    }
    for (const s of [-1, 1]) {
      const x = 300 + s * 13 * u;
      p.poly(rr(x - 10 * u, by - 10 * u, x + 10 * u, by + 12 * u, 3 * u), "#2b2a2e", 2.4 * u);
      p.ell(x, by - 10 * u, 9 * u, 4 * u, "#5c6a7a", 1.6 * u);
      p.ell(x - 2 * u, by - 11 * u, 3 * u, 1.5 * u, "#cfe6ff", 0);
    }
    p.poly(rr(300 - 4 * u, by - 4 * u, 300 + 4 * u, by + 6 * u, 1.5 * u), "#3a383e", 1.4 * u);
    for (const s of [-1, 1]) p.dot(300 + s * 18 * u, by + 14 * u, 5.5 * u, INK);
  }
  // ---- held in the raised hand ----
  const [hx, hy] = arms[1][2];
  if (a.fork && a.wave !== undefined) {
    thin(p, [[hx - 2 * u, hy + 50 * u], [hx + 2 * u, hy - 0.75 * HH]], "#b0844e", 3.4 * u, 1.2 * u);
    const ty = hy - 0.75 * HH, tx = hx + 2 * u;
    p.stroke([[tx - 13 * u, ty], [tx + 13 * u, ty]], 3.4 * u, INK);
    for (const k of [-1, 0, 1]) thin(p, [[tx + k * 12 * u, ty], [tx + k * 12 * u + k * 1.5 * u, ty - 26 * u]], "#c9ccd2", 2 * u, 1 * u);
    p.dot(hx, hy, 5.5 * u, INK);
  }
  if (a.flag !== undefined && a.wave !== undefined) {
    const top = hy - 0.95 * HH, ph = a.flag;
    thin(p, [[hx, hy + 12 * u], [hx, top]], "#b0844e", 2.4 * u, 1 * u);
    // a limp, ragged white hanky drooping from the pole tip
    const n = 10, L: P2[] = [], R: P2[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, sway = 3 * u * Math.sin(ph * Math.PI * 2 + t * 3) * t;
      L.push([hx + 1 * u + sway * 0.4 + 4 * u * t, top + 2 * u + t * 44 * u]);
      R.push([hx + 34 * u * (1 - 0.55 * t) + sway, top + 2 * u + t * 44 * u + 8 * u * (1 - t) * t]);
    }
    const rag: P2[] = [...R.slice().reverse(), ...L];
    p.poly(rag, "#f6f3ea", 2.4 * u);
    p.stroke([[hx + 8 * u, top + 10 * u], [hx + 14 * u, top + 30 * u]], 1.2 * u, "#c9c4b6");
    p.dot(hx, top, 2.8 * u, "#e8c45a");
    p.dot(hx, hy, 5.5 * u, INK);
  }
  if (a.thumb && a.wave !== undefined) {
    p.poly(rr(hx - 7 * u, hy - 6 * u, hx + 7 * u, hy + 7 * u, 4 * u), INK, 0);
    p.poly(rr(hx - 2.6 * u, hy - 19 * u, hx + 2.6 * u, hy - 2 * u, 2.6 * u), INK, 0);
  }
};

// ---------------- effect cards ----------------
/** "?" on a 300 x 400 canvas */
export const fxQuestion = (p: Pen) => {
  const g = p.g;
  g.save(); g.font = "900 330px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineJoin = "round"; g.lineWidth = 30; g.strokeStyle = INK; g.strokeText("?", 150, 350);
  g.fillStyle = "#ffe46b"; g.fillText("?", 150, 350); g.restore();
  p.arc(122, 150, 40, 70, 200, 250, 9, "#fff7c4");
};
/** "!" on a 300 x 400 canvas */
export const fxBang = (p: Pen) => {
  const g = p.g;
  g.save(); g.font = "900 330px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineJoin = "round"; g.lineWidth = 30; g.strokeStyle = INK; g.strokeText("!", 150, 350);
  g.fillStyle = "#ff6a4a"; g.fillText("!", 150, 350); g.restore();
};
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#9fd4ff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, "#e8f6ff");
};
/** soft dust puff (256 x 256), seed varies the lumps */
export const fxDust = (p: Pen, seed: number, col = "#c99a6a", a = 0.55) => {
  const g = p.g;
  for (let i = 0; i < 7; i++) {
    const x = 128 + (rnd(seed, i) - 0.5) * 110, y = 140 + (rnd(seed, i + 9) - 0.5) * 80, r = 42 + rnd(seed, i + 19) * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
};
/** cartoon poof cloud with an ink outline (512 x 400), seed varies the lumps */
export const fxPoof = (p: Pen, seed: number, col = "#f4ead6") => {
  const lumps: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + rnd(seed, i) * 0.4; lumps.push([256 + 150 * Math.cos(a), 205 + 105 * Math.sin(a), 70 + rnd(seed, i + 9) * 34]); }
  lumps.push([256, 205, 140]);
  for (const [x, y, r] of lumps) p.ell(x, y, r + 11, (r + 11) * 0.9, INK, 0);
  for (const [x, y, r] of lumps) p.ell(x, y, r, r * 0.9, col, 0);
  for (const [x, y, r] of lumps.slice(0, 4)) p.arc(x - 8, y - 6, r * 0.6, r * 0.5, 200, 260, 9, "#ffffff");
};
/** speed lines (768 x 256): tapered streaks */
export const fxSpeed = (p: Pen, seed: number) => {
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 38 + (rnd(seed, i) - 0.5) * 14, x0 = 20 + rnd(seed, i + 7) * 220, x1 = 520 + rnd(seed, i + 13) * 230, w = 9 + rnd(seed, i + 3) * 7;
    p.poly([[x0, y], [x1, y - w / 2], [x1 + 8, y], [x1, y + w / 2]], "#ffffff", 5);
  }
};
/** cheer sparkle: 4-point stars (240 x 240) */
export const fxSparkle = (p: Pen, t: number) => {
  const k = 0.55 + 0.45 * Math.sin(t * Math.PI);
  for (const [cx, cy, r] of [[120, 120, 100 * k], [50, 60, 34 * k], [196, 190, 28 * k]] as const) {
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r2 = i % 2 ? r * 0.28 : r; pts.push([cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)]); }
    p.poly(pts, "#fff3a8", 6);
  }
};
/** the "RING RING!" telephone burst (1024 x 800); v wobbles the spikes */
export const fxRing = (p: Pen, v: number) => {
  const pts: P2[] = [], n = 22;
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2, r = i % 2 ? 0.74 : 1 + 0.12 * rnd(v + 3, i);
    pts.push([512 + 470 * r * Math.cos(a), 400 + 360 * r * Math.sin(a)]);
  }
  p.poly(pts, "#ffd23a", 16);
  p.poly(pts.map(([x, y]) => [512 + (x - 512) * 0.8, 400 + (y - 400) * 0.8] as P2), "#fff2a0", 0);
  const g = p.g;
  g.save(); g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.font = "900 230px Arial Black, Arial, sans-serif";
  for (const [s, x, y, r] of [["RING", 470, 300, -0.12], ["RING!", 545, 520, 0.06]] as const) {
    g.save(); g.translate(x + (v % 2 ? 6 : -6), y); g.rotate(r + (v % 2 ? 0.03 : -0.03));
    g.lineWidth = 34; g.strokeStyle = INK; g.strokeText(s, 0, 0);
    g.fillStyle = "#e0322c"; g.fillText(s, 0, 0); g.restore();
  }
  g.restore();
  // vibration ticks
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) p.arc(512 + s * (360 + k * 40), 400, 40 + k * 30, 120 + k * 60, s > 0 ? -40 : 140, s > 0 ? 40 : 220, 12, INK);
};

// ---------------- the major's dream: a thought bubble with an emu army (1024 x 900) ----------------
const miniEmu = (p: Pen, x: number, y: number, s: number, hat: boolean) => {
  const dark = "#4a3626";
  for (const k of [-1, 1]) { // legs
    p.stroke([[x + k * 8 * s, y - 40 * s], [x + k * 11 * s, y]], 5 * s, "#c9a77a");
    p.stroke([[x + k * 11 * s, y], [x + k * 11 * s + 12 * s, y + 2 * s]], 4 * s, "#c9a77a");
  }
  const body: P2[] = [];
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = 1 + 0.08 * Math.sin(i * 2.7); body.push([x + 36 * s * r * Math.cos(a), y - 62 * s + 26 * s * r * Math.sin(a)]); }
  p.poly(body, dark, 5 * s);
  p.line([[x + 22 * s, y - 72 * s], [x + 30 * s, y - 110 * s], [x + 26 * s, y - 140 * s]], "#6f8aa6", 10 * s);
  p.ell(x + 28 * s, y - 148 * s, 14 * s, 12 * s, "#7f97b2", 4 * s);
  p.poly([[x + 38 * s, y - 150 * s], [x + 56 * s, y - 146 * s], [x + 38 * s, y - 142 * s]], "#d9b36a", 3 * s);
  p.ell(x + 31 * s, y - 151 * s, 5 * s, 5 * s, "#ff9a2e", 2 * s); p.dot(x + 32 * s, y - 151 * s, 2.2 * s);
  if (hat) {
    p.ell(x + 26 * s, y - 158 * s, 24 * s, 5 * s, FELT, 3 * s);
    p.poly([[x + 14 * s, y - 158 * s], [x + 16 * s, y - 174 * s], [x + 36 * s, y - 174 * s], [x + 38 * s, y - 158 * s]], FELT, 3 * s);
    p.poly([[x + 38 * s, y - 158 * s], [x + 50 * s, y - 160 * s], [x + 46 * s, y - 180 * s], [x + 38 * s, y - 172 * s]], mix(FELT, "#ffffff", 0.1), 3 * s);
  }
  // a tiny rifle on the shoulder
  p.band([[x - 30 * s, y - 50 * s], [x + 10 * s, y - 118 * s]], "#7a4b2a", 5 * s, 2 * s, "round");
};
export const fxThought = (p: Pen) => {
  const cl: [number, number, number][] = [[300, 330, 170], [520, 260, 200], [740, 330, 170], [400, 500, 170], [640, 500, 180], [210, 470, 120], [830, 470, 120]];
  for (const [x, y, r] of cl) p.ell(x, y, r + 12, (r + 12) * 0.85, INK, 0);
  for (const [x, y, r] of [[170, 760, 52], [100, 850, 30]] as const) p.ell(x, y, r, r * 0.85, "#ffffff", 10);
  for (const [x, y, r] of cl) p.ell(x, y, r, r * 0.85, "#ffffff", 0);
  // ground strip + three emu soldiers marching in step, a little flag
  p.poly([[230, 590], [820, 590], [800, 615], [250, 615]], "#d9b98a", 6);
  for (const [k, x] of [[0, 360], [1, 520], [2, 680]] as const) miniEmu(p, x, 590 - (k % 2) * 4, 1.25, true);
  p.stroke([[810, 590], [810, 330]], 8, INK);
  p.poly([[812, 334], [900, 350], [812, 384]], "#e0322c", 6);
};

// ---------------- the NEWSPAPER (1536 x 2048): an old broadsheet ----------------
export const NEWS_CW = 1536, NEWS_CH = 2048;
const serif = (w: number, px: number) => `${w} ${px}px "Times New Roman", "DejaVu Serif", Georgia, serif`;
/** fits a line of text to a width (scaling the font size down) and draws it centred */
const fitText = (g: CanvasRenderingContext2D, s: string, cx: number, y: number, maxW: number, weight: number, px: number, col: string, track = 0) => {
  g.font = serif(weight, px);
  let w = g.measureText(s).width + track * (s.length - 1);
  const k = w > maxW ? maxW / w : 1;
  g.font = serif(weight, px * k); w = g.measureText(s).width + track * k * (s.length - 1);
  g.fillStyle = col; g.textBaseline = "alphabetic"; g.textAlign = "left";
  let x = cx - w / 2;
  for (const ch of s) { g.fillText(ch, x, y); x += g.measureText(ch).width + track * k; }
};
export const fxNews = (p: Pen) => {
  const g = p.g, W = NEWS_CW, H = NEWS_CH, M = 64;
  // aged paper with a slightly uneven edge
  const edge: P2[] = [];
  const N = 30;
  for (let i = 0; i <= N; i++) edge.push([M + ((W - 2 * M) * i) / N, M + (rnd(1, i) - 0.5) * 10]);
  for (let i = 1; i <= N; i++) edge.push([W - M + (rnd(2, i) - 0.5) * 10, M + ((H - 2 * M) * i) / N]);
  for (let i = N - 1; i >= 0; i--) edge.push([M + ((W - 2 * M) * i) / N, H - M + (rnd(3, i) - 0.5) * 10]);
  for (let i = N - 1; i >= 1; i--) edge.push([M + (rnd(4, i) - 0.5) * 10, M + ((H - 2 * M) * i) / N]);
  p.path(edge, true);
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, "#f6eed6"); gr.addColorStop(0.6, "#efe3c2"); gr.addColorStop(1, "#e2d0a6");
  g.fillStyle = gr; g.fill();
  g.save(); p.path(edge, true); g.clip();
  // foxing spots + a vertical fold
  for (let i = 0; i < 26; i++) { const x = rnd(5, i) * W, y = rnd(6, i) * H, r = 10 + rnd(7, i) * 50; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, "rgba(170,125,60,0.14)"); rg.addColorStop(1, "rgba(170,125,60,0)"); g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
  g.fillStyle = "rgba(120,90,50,0.06)"; g.fillRect(W / 2, 0, W / 2, H);
  g.strokeStyle = "rgba(110,80,45,0.3)"; g.lineWidth = 4; g.beginPath(); g.moveTo(W / 2, 0); g.lineTo(W / 2 + 4, H); g.stroke();
  g.restore();
  const ink = "#231c1a", L = M + 60, R = W - M - 60, CW = R - L;
  // masthead
  fitText(g, "THE WHEATBELT GAZETTE", W / 2, 250, CW, 900, 150, ink, 4);
  g.fillStyle = ink; g.fillRect(L, 285, CW, 9); g.fillRect(L, 302, CW, 3);
  g.font = serif(700, 40); g.textBaseline = "middle";
  g.textAlign = "left"; g.fillText("No. 1932", L, 338);
  g.textAlign = "center"; g.fillText("WESTERN AUSTRALIA, DECEMBER 1932", W / 2, 338);
  g.textAlign = "right"; g.fillText("TWOPENCE", R, 338);
  g.fillRect(L, 368, CW, 3); g.fillRect(L, 378, CW, 9);
  // the headline
  fitText(g, "THE GREAT", W / 2, 590, CW, 900, 230, ink, 6);
  fitText(g, "EMU WAR", W / 2, 830, CW, 900, 280, ink, 10);
  g.fillRect(L + 120, 880, CW - 240, 5);
  fitText(g, "ARMY RETREATS — BIRDS UNHURT", W / 2, 960, CW - 80, 700, 70, "#7a1d1a", 2);
  g.fillRect(L, 1000, CW, 3);
  // the picture: an engraving-style emu in a box, wearing the slouch hat, with a caption
  const bx0 = L, bx1 = L + CW * 0.56, by0 = 1030, by1 = 1560;
  g.fillStyle = "#e4d5b0"; g.fillRect(bx0, by0, bx1 - bx0, by1 - by0);
  g.save(); g.beginPath(); g.rect(bx0, by0, bx1 - bx0, by1 - by0); g.clip();
  g.strokeStyle = "rgba(60,45,35,0.25)"; g.lineWidth = 3;
  for (let y = by0 + 10; y < by1; y += 14) { g.beginPath(); g.moveTo(bx0, y); g.lineTo(bx1, y + 6); g.stroke(); }
  g.fillStyle = "#b89f6e"; g.fillRect(bx0, by1 - 110, bx1 - bx0, 110);
  miniEmu(p, (bx0 + bx1) / 2 - 30, by1 - 70, 2.3, true);
  g.restore();
  g.strokeStyle = ink; g.lineWidth = 8; g.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
  g.font = serif(400, 34); g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillText("The victor, photographed at Campion.", (bx0 + bx1) / 2, by1 + 48);
  // columns: little headings + greeked text lines
  const col = (x0: number, x1: number, y0: number, y1: number, head: string, seed: number) => {
    g.font = serif(900, 44); g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "alphabetic";
    const cx = (x0 + x1) / 2; let s = head; g.font = serif(900, 44);
    while (g.measureText(s).width > x1 - x0 && s.length > 3) s = s.slice(0, -1);
    g.fillText(s, cx, y0 + 40);
    g.fillRect(cx - 60, y0 + 58, 120, 3);
    let y = y0 + 92, k = 0;
    while (y < y1) {
      let x = x0;
      const last = rnd(seed, k * 3) < 0.13;
      const end = last ? x0 + (x1 - x0) * (0.35 + 0.4 * rnd(seed, k)) : x1;
      while (x < end - 20) { const w = 18 + rnd(seed + k, x) * 70; g.fillStyle = "rgba(35,28,26,0.62)"; g.fillRect(x, y, Math.min(w, end - x), 11); x += w + 12; }
      y += 26; k++;
      if (last) y += 12;
    }
  };
  col(bx1 + 40, R, 1030, 1560, "MAJOR BAFFLED", 11);
  const c3 = (CW - 80) / 3;
  col(L, L + c3, 1620, H - M - 70, "10,000 ROUNDS", 12);
  col(L + c3 + 40, L + 2 * c3 + 40, 1620, H - M - 70, "BIRDS REGROUP", 13);
  col(L + 2 * c3 + 80, R, 1620, H - M - 70, "WHEAT GONE", 14);
  g.fillStyle = ink;
  for (const x of [L + c3 + 20, L + 2 * c3 + 60]) g.fillRect(x - 1.5, 1620, 3, H - M - 70 - 1620);
  g.fillRect(bx1 + 19, 1030, 3, 530);
  g.fillRect(L, 1595, CW, 3);
  // ink outline of the sheet (cartoon style)
  p.poly(edge, null, 12);
};
