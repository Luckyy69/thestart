// OWNER: cast agent (effect drawings) — Canvas2D drawings via the bridge Pen.
// 1) accessories painted onto a character's own card after bodyFront (same canvas, nothing drifts): mining hard hat
//    + lamp, coverall reflective stripes, beard (stubble -> full, grows with the day count), dark sunglasses, hi-vis vest,
//    Chilean hand flag (on the raised `wave` hand), candle jar / framed photo (in the `icecream` front hand, painted
//    over the cone), the spoon of tuna + open can (shot 7), a side-hug arm, cross-legged floor sitting (legs erased and
//    re-drawn folded), and arm removal for custom arms.
// 2) effect cards: soft glows (helmet lamps, candles), the NOTE close-up (crisp 2048 x 1536 paper, hand-lettered red
//    "ESTAMOS BIEN EN EL REFUGIO LOS 33") + the rescuer's sleeves holding it, "?", "x2" spoons, sweat drops, dust puffs,
//    cheer sparkles, confetti-free.
import { Pen, INK, headBlob, blobPts, Blob, mix, shade, Build } from "../bridge/toon";

type P2 = [number, number];
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const ellP = (cx: number, cy: number, rx: number, ry: number, n = 48, a0 = 0, a1 = Math.PI * 2): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => [cx + rx * Math.cos(a0 + ((a1 - a0) * i) / n), cy + ry * Math.sin(a0 + ((a1 - a0) * i) / n)] as P2);
const thin = (p: Pen, pts: P2[], col: string, w: number, rim: number) => { p.stroke(pts, w + 2 * rim, INK); p.stroke(pts, w, col); };
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const b = ((a + (90 * i) / 6) * Math.PI) / 180; pts.push([cx + r * Math.cos(b), cy + r * Math.sin(b)]); }
  return pts;
};
const curve = (a: P2, k: P2, b: P2, n = 12): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = i / n, s = 1 - t; return [s * s * a[0] + 2 * s * t * k[0] + t * t * b[0], s * s * a[1] + 2 * s * t * k[1] + t * t * b[1]] as P2; });

// ---------------- body geometry (mirrors bodyFront in bridge/toon.ts) ----------------
const BUILD: Record<Build, { a: number; torso: number; legs: number; tw: number }> = {
  adult: { a: 118, torso: 1.1, legs: 1.4, tw: 0.8 }, stout: { a: 118, torso: 1.15, legs: 1.32, tw: 0.92 }, kid: { a: 112, torso: 0.85, legs: 1.0, tw: 0.72 },
};
export type Geo = { W: number; u: number; HH: number; Ha: number; Hb: number; hc: number; chin: number; crown: number; torsoBot: number; hipY: number;
  tcx: number; Ta: number; Tb: number; seed: number; facing: number; H: Blob; mode: "stand" | "sit"; build: Build };
export const geoOf = (seed: number, mode: "stand" | "sit", facing = 0, build: Build = "adult"): Geo => {
  const Bd = BUILD[build], H = headBlob(seed, Bd.a, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoBot = mode === "sit" ? 975 - 0.2 * HH : 975 - Bd.legs * HH, chin = torsoBot - Bd.torso * HH, hc = chin - H.b;
  return { W, u, HH, Ha: H.a, Hb: H.b, hc, chin, crown: hc - H.b, torsoBot, hipY: torsoBot - 0.12 * HH, tcx: 300 + 3 * u * facing,
    Ta: ((Bd.tw / 2) * W) / 1.06, Tb: 0.5 * (torsoBot - (chin - 0.25 * HH)), seed, facing, H, mode, build };
};
const torsoPts = (g: Geo) => {
  const T: Blob = { a: g.Ta, b: g.Tb, nTop: 2.2, nBot: 2.6, egg: g.build === "stout" ? 0.17 : 0.12, asym: 0.04 * g.facing, rot: 0, noise: 0.006, seed: g.seed + 7 };
  return blobPts(g.tcx, g.torsoBot - g.Tb, T);
};
/** design-space points of interest (for world-placed glow cards) */
export const lampPt = (g: Geo): P2 => [300 + 7 * g.u * g.facing, g.hc - 40 * g.u];
export const holdPt = (g: Geo): P2 => [g.tcx + 0.5 * g.Ta, g.chin + 0.52 * g.HH];
/** bottom of the folded legs of a cross-legged floor sitter (design y) */
export const crossBottom = (g: Geo) => g.torsoBot + 0.16 * g.HH;

export type Acc = {
  helmet?: string; lamp?: boolean; stripes?: string; beard?: number; beardCol?: string; shades?: boolean; vest?: string;
  flag?: number; wave?: number; candle?: boolean; photo?: number; spoon?: boolean; hug?: boolean; cross?: boolean; zip?: boolean; noArms?: boolean;
};
export const accKey = (a: Acc) => JSON.stringify(a, (_k, v) => (typeof v === "number" ? Math.round(v * 40) / 40 : v));

const CHILE_BLUE = "#1f45b0", CHILE_RED = "#d8262f";
const star = (cx: number, cy: number, r: number): P2[] => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5, k = i % 2 ? 0.4 : 1; return [cx + r * k * Math.cos(a), cy + r * k * Math.sin(a)] as P2;
});
/** a Chilean flag (rect x0,y0 w,h) with a waving lower edge; hoist on the left */
export const chileFlag = (p: Pen, x0: number, y0: number, w: number, h: number, ph: number, ol: number) => {
  const n = 14, top: P2[] = [], bot: P2[] = [], mid: P2[] = [];
  const wv = (t: number) => h * 0.09 * Math.sin(ph * Math.PI * 2 + t * 5.5) * t;
  for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + w * t; top.push([x, y0 + wv(t)]); mid.push([x, y0 + h / 2 + wv(t)]); bot.push([x, y0 + h + wv(t)]); }
  p.poly([...mid, ...bot.slice().reverse()], CHILE_RED, 0);
  p.poly([...top, ...mid.slice().reverse()], "#ffffff", 0);
  const cw = Math.round(n / 3), cant: P2[] = [...top.slice(0, cw + 1), ...mid.slice(0, cw + 1).reverse()];
  p.poly(cant, CHILE_BLUE, 0);
  const [sx, sy] = [(top[0][0] + top[cw][0]) / 2, (top[0][1] + mid[0][1]) / 2 + wv(cw / n / 2) * 0.5];
  p.poly(star(sx, sy, h * 0.17), "#ffffff", 0);
  p.poly([...top, ...bot.slice().reverse()], null, ol);
};

/** cross-legged floor sitting on a STAND card: erase the standing legs below the torso, paint folded legs */
const crossLegs = (p: Pen, g: Geo, pants: string, boots: string) => {
  const { u, HH, torsoBot, tcx } = g, gg = p.g;
  gg.save(); gg.globalCompositeOperation = "destination-out"; gg.fillStyle = "#000";
  gg.fillRect(0, torsoBot + 0.02 * HH, 600, 1000); gg.restore();
  const yb = crossBottom(g), legCol = mix(pants, INK, 0.25);
  // two folded shins crossing in front of the hips + boots peeking out at the sides
  for (const s of [-1, 1]) {
    const pts: P2[] = [[tcx - s * 6 * u, torsoBot - 0.1 * HH], [tcx + s * 52 * u, torsoBot - 0.02 * HH], [tcx + s * 60 * u, yb - 5 * u],
      [tcx + s * 40 * u, yb], [tcx - s * 22 * u, yb - 3 * u], [tcx - s * 18 * u, torsoBot + 0.02 * HH]];
    p.poly(pts, s < 0 ? legCol : shade(legCol, 0.9), 4 * u);
    p.ell(tcx - s * 30 * u, yb - 6 * u, 10 * u, 6.5 * u, boots, 3 * u);
  }
};
/** remove the hanging right arm (everything right of the torso between shoulder and hip) */
const eraseRightArm = (p: Pen, g: Geo, both = false) => {
  const gg = p.g, tp = torsoPts(g), { tcx, chin, HH, torsoBot } = g;
  const x0 = both ? 0 : tcx + 0.3 * g.Ta;
  gg.save(); gg.beginPath(); gg.rect(x0, chin + 0.02 * HH, 600 - x0, torsoBot + 0.04 * HH - chin); gg.clip();
  gg.beginPath(); gg.rect(0, 0, 600, 1000);
  tp.forEach(([x, y], i) => (i ? gg.lineTo(x, y) : gg.moveTo(x, y))); gg.closePath();
  gg.globalCompositeOperation = "destination-out"; gg.fillStyle = "#000"; gg.fill("evenodd"); gg.restore();
  p.poly(tp, null, 4.6 * g.u);
};

/** drawn before the body */
export const accBehind = (_p: Pen, _g: Geo, _a: Acc) => { /* nothing behind yet */ };

/** drawn after the body, onto the same card. `o` colours of the outfit */
export const accFront = (p: Pen, g: Geo, a: Acc, o: { jacket: string; pants: string; boots: string; skin: string }) => {
  const { u, HH, Ha, Hb, hc, chin, crown, tcx, Ta, seed, facing } = g;
  const fx = 300 + 7 * u * facing, armCol = mix(o.jacket, INK, 0.66);
  if (a.cross) crossLegs(p, g, o.pants, o.boots);
  if (a.spoon || a.hug || a.noArms) eraseRightArm(p, g, !!a.noArms);
  const tp = torsoPts(g);
  // ---- coverall details: zip, reflective stripes ----
  if (a.zip || a.stripes || a.vest) {
    p.clip(tp, () => {
      if (a.vest) {
        for (const s of [-1, 1]) p.poly([[tcx + s * 2.2 * Ta, chin - 0.4 * HH], [tcx + s * 13 * u, chin - 0.4 * HH], [tcx + s * 13 * u, chin - 2 * u], [tcx + s * 2 * u, chin + 0.42 * HH],
          [tcx + s * 2 * u, g.torsoBot + 20 * u], [tcx + s * 2.2 * Ta, g.torsoBot + 20 * u]], s < 0 ? a.vest! : shade(a.vest!, 0.9), 1.8 * u);
      }
      if (a.zip) p.stroke([[tcx + 2 * u * facing, chin], [tcx + 2 * u * facing, g.torsoBot - 0.15 * HH]], 1.6 * u, shade(o.jacket, 0.62));
      const sc = a.stripes ?? (a.vest ? "#e9eef0" : null);
      if (sc) {
        const band = (y: number) => {
          p.poly([[tcx - 2 * Ta, y - 3.6 * u], [tcx + 2 * Ta, y - 3.6 * u], [tcx + 2 * Ta, y + 3.6 * u], [tcx - 2 * Ta, y + 3.6 * u]], sc, 1.3 * u);
          p.stroke([[tcx - 2 * Ta, y], [tcx + 2 * Ta, y]], 1.2 * u, "#b9c2c8");
        };
        for (const s of [-1, 1]) {
          const x = tcx + s * 0.5 * Ta;
          p.poly([[x - 3.4 * u, chin - 10 * u], [x + 3.4 * u, chin - 10 * u], [x + 3.4 * u, chin + 0.55 * HH], [x - 3.4 * u, chin + 0.55 * HH]], sc, 1.3 * u);
        }
        band(chin + 0.55 * HH);
        if (g.build !== "kid") band(chin + 0.9 * HH);
      }
    });
    p.poly(tp, null, 4.6 * u);
    if (a.stripes && g.mode === "stand" && !a.cross) // knee bands on the stick legs
      for (const s of [-1, 1]) { const y = 975 - 0.55 * HH, x = 300 + s * 19 * u; p.poly(rr(x - 5 * u, y - 2.6 * u, x + 5 * u, y + 2.6 * u, 1 * u), a.stripes, 1 * u); }
  }
  // ---- beard: stubble stipple -> full beard ring around the mouth ----
  const bd = a.beard ?? 0;
  if (bd > 0.04) {
    const col = a.beardCol ?? "#3a2a22", hp = blobPts(300, hc, g.H), mx = 300 + 8 * u * facing, my = hc + 20 * u, gg = p.g;
    if (bd < 0.35) {
      p.clip(hp, () => {
        const k = bd / 0.35;
        gg.save(); gg.beginPath();
        const jaw = ellP(300, hc + 0.15 * Hb, 1.08 * Ha, 0.95 * Hb, 40, 0.05, Math.PI - 0.05);
        jaw.forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); });
        gg.closePath();
        ellP(mx, my + 1 * u, 12 * u, 7 * u, 24).forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); });
        gg.closePath();
        gg.fillStyle = col; gg.globalAlpha = 0.1 + 0.3 * k; gg.fill("evenodd"); gg.restore();
        gg.fillStyle = col; gg.globalAlpha = 0.25 + 0.4 * k;
        for (let i = 0; i < 90; i++) {
          const x = 300 + (rnd(seed, i) * 2 - 1) * Ha, y = hc + 12 * u + rnd(seed, i + 300) * Hb;
          if (Math.hypot((x - mx) / 14, (y - my) / 8) < 1 || Math.hypot((x - 300) / Ha, (y - hc) / Hb) > 0.97) continue;
          const [px, py] = p.P(x, y); gg.beginPath(); gg.arc(px, py, 0.45 * u, 0, 7); gg.fill();
        }
        gg.globalAlpha = 1;
      });
    } else {
      const k = (bd - 0.35) / 0.65, drop = (4 + 16 * k) * u, top = hc + (12 - 6 * k) * u;
      const outer: P2[] = [];
      for (let i = 0; i <= 32; i++) { // jaw-hugging lower arc, a bit below the chin as it grows
        const t = Math.PI * (i / 32), x = 300 + 1.02 * Ha * Math.cos(t), yy = hc + (Hb + drop) * Math.sin(t);
        outer.push([x, Math.max(top, yy)]);
      }
      gg.save();
      gg.beginPath();
      outer.forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); });
      gg.closePath();
      const hole = ellP(mx, my + 1 * u, (13 - 2 * k) * u, (8 - 1.5 * k) * u, 30);
      hole.forEach((q0, i) => { const [x, y] = p.P(q0[0], q0[1]); if (i) gg.lineTo(x, y); else gg.moveTo(x, y); });
      gg.closePath();
      gg.fillStyle = col; gg.fill("evenodd");
      gg.lineWidth = 2.6 * u; gg.strokeStyle = INK; gg.lineJoin = "round"; gg.stroke();
      gg.restore();
      // a few hair ticks + moustache over the mouth hole
      for (let i = 0; i < 9; i++) { const t = 0.15 + 0.7 * (i / 8), x = 300 + 0.9 * Ha * Math.cos(Math.PI * t), y = hc + (Hb + drop * 0.6) * Math.sin(Math.PI * t);
        p.stroke([[x, y - 5 * u], [x + 1.5 * u, y + 1 * u]], 1.2 * u, shade(col, 0.6)); }
      for (const s of [-1, 1]) p.poly([[mx, my - 7.5 * u], [mx + s * 15 * u, my - 4 * u + 3 * k * u], [mx + s * 12 * u, my - 9.5 * u], [mx + s * 2 * u, my - 10.5 * u]], col, 1.8 * u);
    }
  }
  // ---- sunglasses (the rescued men wore dark wraparounds against the light) ----
  if (a.shades) {
    for (const s of [-1, 1]) {
      const cx = fx + s * 13 * u;
      p.poly(rr(cx - 11.5 * u, hc - 8 * u, cx + 11.5 * u, hc + 7.5 * u, 5 * u), "#17141c", 2.4 * u);
      p.stroke([[cx - 6 * u, hc - 3.5 * u], [cx - 1.5 * u, hc - 5 * u]], 1.8 * u, "#7d8aa6");
    }
    p.stroke([[fx - 2 * u, hc - 5 * u], [fx + 2 * u, hc - 5 * u]], 2.6 * u, "#17141c");
    for (const s of [-1, 1]) p.stroke([[fx + s * 24.5 * u, hc - 4 * u], [300 + s * 0.97 * Ha, hc - 6 * u]], 2.6 * u, "#17141c");
  }
  // ---- mining hard hat + lamp ----
  if (a.helmet) {
    const by = hc - 27 * u, ry = by - (crown - 9 * u), rx = 1.05 * Ha;
    const dome = ellP(300, by, rx, ry, 36, Math.PI, Math.PI * 2);
    p.poly(dome, a.helmet, 4.2 * u);
    p.clip(dome, () => p.poly([[300 - 6 * u, crown - 20 * u], [300 + 6 * u, crown - 20 * u], [300 + 6 * u, by], [300 - 6 * u, by]], shade(a.helmet!, 0.86), 1.4 * u)); // ridge
    p.poly(dome, null, 4.2 * u);
    p.arc(300, by, rx - 9 * u, ry - 8 * u, 200, 245, 4 * u, mix(a.helmet, "#ffffff", 0.6));
    p.poly(ellP(300, by + 1 * u, 1.2 * Ha, 5.5 * u, 36), shade(a.helmet, 0.82), 3 * u); // brim
    if (a.lamp) {
      const [lx, ly] = lampPt(g);
      p.poly(rr(lx - 13 * u, ly - 9 * u, lx + 13 * u, ly + 9 * u, 4 * u), "#3b3e46", 2.6 * u);
      p.ell(lx, ly, 9 * u, 6.5 * u, "#fff6c8", 2 * u);
      p.ell(lx - 2.5 * u, ly - 2 * u, 3.5 * u, 2.2 * u, "#ffffff", 0);
      p.stroke([[lx + 13 * u, ly], [300 + 1.0 * Ha, ly + 5 * u]], 2 * u, "#2a2b31"); // strap
    }
  }
  // ---- held things ----
  if (a.flag !== undefined) {
    const S: P2 = [tcx + 0.85 * Ta, chin + 0.12 * HH], w = a.wave ?? 0.5;
    const hx = tcx + 1.18 * Ta + 16 * u + 12 * u * w, hy = S[1] - 0.6 * HH, top = hy - 0.95 * HH;
    thin(p, [[hx, hy + 10 * u], [hx, top]], "#c9ccd2", 2.2 * u, 1 * u);
    p.dot(hx, top, 3 * u, "#e8c45a");
    chileFlag(p, hx + 1 * u, top + 2 * u, Math.min(0.62 * HH, 590 - hx), 0.4 * HH, a.flag, 2.4 * u);
    p.dot(hx, hy, 5.5 * u, INK);
  }
  if (a.candle) {
    const [hx, hy] = holdPt(g);
    p.poly(rr(hx - 13 * u, hy - 33 * u, hx + 13 * u, hy + 10 * u, 4 * u), "#c94040", 2.4 * u);
    p.poly(rr(hx - 9 * u, hy - 30 * u, hx + 9 * u, hy - 22 * u, 2 * u), "#f4efe2", 1.2 * u);
    p.stroke([[hx, hy - 30 * u], [hx, hy - 34 * u]], 1.2 * u, INK);
    p.poly([[hx, hy - 50 * u], [hx + 5 * u, hy - 38 * u], [hx, hy - 32 * u], [hx - 5 * u, hy - 38 * u]], "#ffc23a", 1.4 * u);
    p.ell(hx, hy - 37.5 * u, 2.2 * u, 3.5 * u, "#fff6c8", 0);
    p.stroke([[hx - 8 * u, hy - 15 * u], [hx - 8 * u, hy + 3 * u]], 1.6 * u, "#ff8a7a");
    p.dot(hx, hy, 5.5 * u, INK);
  }
  if (a.photo !== undefined) {
    const [hx, hy] = holdPt(g), x0 = hx - 21 * u, x1 = hx + 21 * u, y0 = hy - 50 * u, y1 = hy + 9 * u;
    p.poly(rr(x0, y0, x1, y1, 2 * u), "#f4efe2", 2.4 * u);
    p.poly(rr(x0 + 4 * u, y0 + 4 * u, x1 - 4 * u, y1 - 9 * u, 1 * u), ["#8fb6e0", "#e8c07a", "#9fd0a8"][a.photo % 3], 1.2 * u);
    const cx = hx, cy = y0 + 25 * u; // a tiny portrait: a smiling miner in his helmet
    p.ell(cx, cy + 15 * u, 14 * u, 8 * u, ["#f08a2c", "#2f5fa8"][a.photo % 2], 1.2 * u);
    p.ell(cx, cy, 10 * u, 11 * u, ["#f5c9a0", "#c99067", "#ecd0b6"][a.photo % 3], 1.2 * u);
    p.poly(ellP(cx, cy - 3 * u, 11 * u, 10 * u, 16, Math.PI, Math.PI * 2), ["#ffffff", "#f2c84b"][a.photo % 2], 1.2 * u);
    p.dot(cx - 3.5 * u, cy + 1 * u, 1.2 * u); p.dot(cx + 3.5 * u, cy + 1 * u, 1.2 * u);
    p.arc(cx, cy + 3 * u, 4 * u, 2.5 * u, 20, 160, 1 * u);
    p.poly([[x0 + 10 * u, y1 + 1 * u], [x1 - 10 * u, y1 + 1 * u], [x1 - 13 * u, y1 + 6 * u], [x0 + 13 * u, y1 + 6 * u]], "#1d1820", 0); // black ribbon
    p.dot(hx - 15 * u, hy, 5.5 * u, INK); p.dot(hx + 17 * u, hy - 4 * u, 5.5 * u, INK);
  }
  if (a.spoon) {
    // right arm bent up: spoon of tuna lifted to the mouth; the open can on the lap
    const S: P2 = [tcx + 0.85 * Ta, chin + 0.12 * HH], E: P2 = [tcx + 1.25 * Ta + 6 * u, chin + 0.62 * HH], Hd: P2 = [tcx + 0.62 * Ta, chin + 0.22 * HH];
    p.stroke(curve(S, [E[0] + 6 * u, E[1] - 0.1 * HH], E), 5.2 * u, armCol);
    p.stroke([E, Hd], 5.2 * u, armCol);
    const my = hc + 20 * u, mx = 300 + 8 * u * facing, bx = mx + 9 * u, byy = my + 12 * u;
    thin(p, [[Hd[0] + 2 * u, Hd[1] + 2 * u], [bx + 6 * u, byy + 3 * u]], "#c9ccd2", 2.6 * u, 1 * u);
    p.ell(bx, byy, 11 * u, 6 * u, "#d6dade", 1.8 * u, 0, 360, -12);
    p.ell(bx, byy - 2 * u, 8.5 * u, 3.6 * u, "#e9b49a", 1.2 * u, 0, 360, -12);
    for (let k = 0; k < 4; k++) p.dot(bx - 5 * u + k * 3.2 * u, byy - 3.5 * u + (k % 2) * 1.5 * u, 1.1 * u, "#c98a6e");
    p.dot(Hd[0], Hd[1], 5.5 * u, INK);
    const cx = tcx - 4 * u, cy = g.torsoBot + 0.02 * HH; // the can on the lap
    p.poly([[cx - 16 * u, cy - 8 * u], [cx + 16 * u, cy - 8 * u], [cx + 16 * u, cy + 4 * u], [cx - 16 * u, cy + 4 * u]], "#3a6fc2", 2.2 * u);
    p.poly([[cx - 16 * u, cy - 4 * u], [cx + 16 * u, cy - 4 * u], [cx + 16 * u, cy], [cx - 16 * u, cy]], "#f2c84b", 0);
    p.ell(cx, cy - 8 * u, 16 * u, 5 * u, "#c9ccd2", 2.2 * u);
    p.ell(cx, cy - 8 * u, 12.5 * u, 3.4 * u, "#e9b49a", 1 * u);
    p.ell(cx + 18 * u, cy - 16 * u, 8 * u, 3 * u, "#b9bcc4", 1.4 * u, 0, 360, -40); // the peeled lid
  }
  if (a.hug) { // the right arm across a partner standing just right (and behind) on screen
    const S: P2 = [tcx + 0.85 * Ta, chin + 0.12 * HH];
    p.stroke(curve(S, [tcx + 1.4 * Ta + 30 * u, chin - 0.02 * HH], [tcx + 1.4 * Ta + 60 * u, chin + 0.18 * HH]), 5.6 * u, INK);
    p.stroke(curve(S, [tcx + 1.4 * Ta + 30 * u, chin - 0.02 * HH], [tcx + 1.4 * Ta + 60 * u, chin + 0.18 * HH]), 4.2 * u, mix(o.jacket, INK, 0.25));
    p.dot(tcx + 1.4 * Ta + 60 * u, chin + 0.18 * HH, 5.8 * u, INK);
  }
  void crown; void Hb;
};

// ---------------- effect cards ----------------
/** soft radial glow (NOINK soft card); col = rgb triple 0..255 */
export const fxGlow = (p: Pen, col: [number, number, number], core = 0.18) => {
  const g = p.g, [r, gg, b] = col, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(255,255,250,1)`); gr.addColorStop(core, `rgba(${r},${gg},${b},0.9)`);
  gr.addColorStop(0.45, `rgba(${r},${gg},${b},0.28)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
};
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
  g.fillStyle = "#ffe46b"; g.fillText("!", 150, 350); g.restore();
};
/** sweat drop (200 x 260) */
export const fxSweat = (p: Pen) => {
  p.poly([[100, 18], [150, 120], [158, 170], [140, 215], [100, 236], [60, 215], [42, 170], [50, 120]], "#9fd4ff", 12);
  p.arc(100, 175, 34, 40, 200, 250, 10, "#e8f6ff");
};
/** soft dust puff (256 x 256), seed varies the lumps; t 0..1 thins it */
export const fxDust = (p: Pen, seed: number, col = "#b49a7e", a = 0.55) => {
  const g = p.g;
  for (let i = 0; i < 7; i++) {
    const x = 128 + (rnd(seed, i) - 0.5) * 110, y = 140 + (rnd(seed, i + 9) - 0.5) * 80, r = 42 + rnd(seed, i + 19) * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, hexA(col, a)); gr.addColorStop(1, hexA(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
};
const hexA = (c: string, a: number) => { const v = parseInt(c.slice(1), 16); return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`; };
/** cheer sparkle: 4-point stars (240 x 240) */
export const fxSparkle = (p: Pen, t: number) => {
  const k = 0.55 + 0.45 * Math.sin(t * Math.PI);
  for (const [cx, cy, r] of [[120, 120, 100 * k], [50, 60, 34 * k], [196, 190, 28 * k]] as const) {
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, r2 = i % 2 ? r * 0.28 : r; pts.push([cx + r2 * Math.cos(a), cy + r2 * Math.sin(a)]); }
    p.poly(pts, "#fff3a8", 6);
  }
};
/** "x2" with two little spoons (420 x 300): the ration */
export const fxTwoSpoons = (p: Pen) => {
  for (const [x, rot] of [[90, -0.35], [170, 0.3]] as const) {
    const c = Math.cos(rot), s = Math.sin(rot), R = (dx: number, dy: number): P2 => [x + dx * c - dy * s, 150 + dx * s + dy * c];
    thin(p, [R(0, 20), R(0, 120)], "#d6dade", 16, 6);
    p.poly(ellP(0, 0, 36, 50, 30).map(([dx, dy]) => R(dx, dy - 30)), "#d6dade", 8);
    p.poly(ellP(0, 0, 25, 34, 24).map(([dx, dy]) => R(dx, dy - 34)), "#e9b49a", 4);
  }
  const g = p.g;
  g.save(); g.font = "900 150px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = 22; g.strokeStyle = INK; g.strokeText("x2", 320, 160);
  g.fillStyle = "#ffe46b"; g.fillText("x2", 320, 160); g.restore();
};

// ---------------- the NOTE (2048 x 1536): crumpled paper, red marker lettering ----------------
/** single-stroke capitals on a unit box (y down) */
const GLYPH: Record<string, { w: number; s: P2[][] }> = {
  E: { w: 0.72, s: [[[1, 0], [0, 0.02], [0.02, 1], [1, 0.98]], [[0.02, 0.5], [0.8, 0.48]]] },
  S: { w: 0.74, s: [[[0.95, 0.14], [0.72, 0.01], [0.32, 0], [0.06, 0.16], [0.1, 0.38], [0.5, 0.5], [0.86, 0.6], [0.98, 0.8], [0.74, 0.98], [0.3, 1], [0.02, 0.84]]] },
  T: { w: 0.8, s: [[[0, 0.01], [1, 0]], [[0.5, 0.01], [0.49, 1]]] },
  A: { w: 0.86, s: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.62], [0.8, 0.6]]] },
  M: { w: 1.0, s: [[[0, 1], [0.06, 0], [0.5, 0.62], [0.94, 0], [1, 1]]] },
  O: { w: 0.92, s: [Array.from({ length: 25 }, (_, i) => { const a = -Math.PI / 2 - 0.3 + (i / 24) * Math.PI * 2.1; return [0.5 + 0.5 * Math.cos(a), 0.5 + 0.5 * Math.sin(a)] as P2; })] },
  B: { w: 0.74, s: [[[0, 0], [0, 1]], [[0, 0], [0.62, 0], [0.88, 0.12], [0.86, 0.36], [0.58, 0.48], [0, 0.48]], [[0.58, 0.48], [0.92, 0.6], [0.96, 0.84], [0.7, 1], [0, 1]]] },
  I: { w: 0.18, s: [[[0.5, 0], [0.5, 1]]] },
  N: { w: 0.86, s: [[[0, 1], [0, 0], [1, 1], [1, 0]]] },
  L: { w: 0.66, s: [[[0, 0], [0.01, 1], [0.96, 0.98]]] },
  R: { w: 0.78, s: [[[0, 1], [0, 0], [0.64, 0], [0.92, 0.14], [0.92, 0.36], [0.64, 0.5], [0, 0.5]], [[0.45, 0.5], [1, 1]]] },
  F: { w: 0.66, s: [[[0.98, 0], [0, 0.01], [0.01, 1]], [[0.01, 0.48], [0.72, 0.47]]] },
  U: { w: 0.84, s: [[[0, 0], [0, 0.68], [0.18, 0.95], [0.5, 1], [0.82, 0.95], [1, 0.68], [1, 0]]] },
  G: { w: 0.88, s: [[[0.95, 0.18], [0.7, 0], [0.34, 0], [0.07, 0.2], [0, 0.5], [0.08, 0.8], [0.35, 1], [0.7, 1], [0.97, 0.82], [0.97, 0.56], [0.56, 0.56]]] },
  "3": { w: 0.74, s: [[[0.04, 0.12], [0.34, 0], [0.72, 0.02], [0.92, 0.2], [0.8, 0.42], [0.42, 0.5]], [[0.42, 0.5], [0.84, 0.58], [0.98, 0.8], [0.76, 0.98], [0.34, 1], [0.02, 0.88]]] },
};
/** Catmull-Rom through the points (hand-drawn look) */
const smoothPts = (pts: P2[], n = 6): P2[] => {
  if (pts.length < 3) return pts;
  const out: P2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const handLine = (g: CanvasRenderingContext2D, text: string, x0: number, y0: number, h: number, seed: number, lw: number) => {
  let x = x0;
  [...text].forEach((ch, ci) => {
    if (ch === " ") { x += h * 0.5; return; }
    const G = GLYPH[ch];
    if (!G) return;
    const sl = -0.12 + 0.06 * (rnd(seed, ci) - 0.5), sc = 1 + 0.08 * (rnd(seed, ci + 40) - 0.5), dy = (rnd(seed, ci + 80) - 0.5) * 0.08 * h;
    const w = G.w * h * 0.72 * sc;
    for (const [si, s] of G.s.entries()) {
      const pts = s.map(([u, v], k) => {
        const jx = (rnd(seed * 7 + ci, si * 31 + k) - 0.5) * 0.05 * h, jy = (rnd(seed * 11 + ci, si * 37 + k) - 0.5) * 0.05 * h;
        const yy = v * h * sc;
        return [x + u * w - sl * (yy - h) + jx, y0 + dy + yy - h + jy] as P2;
      });
      const sp = ch === "O" || ch === "S" || ch === "G" || ch === "3" || ch === "U" ? smoothPts(pts, 4) : pts;
      g.beginPath(); sp.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
      g.lineWidth = lw * (0.92 + 0.16 * rnd(seed, ci * 3 + si)); g.stroke();
    }
    x += w + h * 0.2;
  });
  return x;
};
export const NOTE_CW = 2048, NOTE_CH = 1536;
/** the note, unfolded and held up: off-white crumpled paper with fold creases, red marker text, tape scrap */
export const fxNote = (p: Pen) => {
  const g = p.g, W = NOTE_CW, H = NOTE_CH;
  // irregular, slightly torn paper outline
  const edge: P2[] = [];
  const M = 70, N = 40;
  const jit = (i: number, k: number) => (rnd(i, k) - 0.5) * 18;
  for (let i = 0; i <= N; i++) edge.push([M + ((W - 2 * M) * i) / N, M + 10 + jit(i, 1) + 14 * Math.sin(i * 0.7)]);
  for (let i = 1; i <= N * 0.75; i++) edge.push([W - M + jit(i, 2), M + ((H - 2 * M) * i) / (N * 0.75)]);
  for (let i = N - 1; i >= 0; i--) edge.push([M + ((W - 2 * M) * i) / N, H - M - 8 + jit(i, 3) + 10 * Math.sin(i * 1.3)]);
  for (let i = Math.floor(N * 0.75) - 1; i >= 1; i--) edge.push([M + jit(i, 4), M + ((H - 2 * M) * i) / (N * 0.75)]);
  // paper base with a soft warm gradient
  p.path(edge, true);
  const gr = g.createLinearGradient(0, 0, W, H);
  gr.addColorStop(0, "#fbf7ea"); gr.addColorStop(0.55, "#f1ead6"); gr.addColorStop(1, "#e4d9bf");
  g.fillStyle = gr; g.fill();
  // crumple facets: subtle light/dark polygons, clipped to the paper
  g.save(); p.path(edge, true); g.clip();
  for (let i = 0; i < 46; i++) {
    const cx = rnd(5, i) * W, cy = rnd(6, i) * H, r = 120 + rnd(7, i) * 260, a0 = rnd(8, i) * 6.3;
    const pts: P2[] = Array.from({ length: 3 + Math.floor(rnd(9, i) * 3) }, (_, k) => {
      const a = a0 + (k / 4) * Math.PI * 2 + rnd(10, i * 7 + k) * 0.9; return [cx + r * Math.cos(a), cy + r * 0.7 * Math.sin(a)] as P2;
    });
    p.path(pts, true); g.fillStyle = rnd(11, i) < 0.5 ? "rgba(255,255,250,0.32)" : "rgba(150,120,80,0.075)"; g.fill();
  }
  // wrinkle lines
  g.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const x = rnd(12, i) * W, y = rnd(13, i) * H, a = rnd(14, i) * 6.3, l = 90 + rnd(15, i) * 240;
    const pts: P2[] = [[x, y], [x + Math.cos(a) * l * 0.5 + (rnd(16, i) - 0.5) * 40, y + Math.sin(a) * l * 0.5 + (rnd(17, i) - 0.5) * 40], [x + Math.cos(a) * l, y + Math.sin(a) * l]];
    p.path(pts, false); g.strokeStyle = "rgba(120,95,60,0.16)"; g.lineWidth = 3; g.stroke();
    p.path(pts.map(([a1, b1]) => [a1 + 4, b1 + 4] as P2), false); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 3; g.stroke();
  }
  // fold creases: one vertical, one horizontal (it was folded small to fit the bag) + shading on one half
  g.fillStyle = "rgba(120,95,60,0.07)"; g.fillRect(W / 2, 0, W / 2, H / 2);
  g.fillStyle = "rgba(120,95,60,0.05)"; g.fillRect(0, H / 2, W / 2, H / 2);
  for (const [a, b] of [[[W / 2 + 6, 0], [W / 2 - 8, H]], [[0, H / 2 - 4], [W, H / 2 + 10]]] as [P2, P2][]) {
    p.path([a, b], false); g.strokeStyle = "rgba(110,85,55,0.38)"; g.lineWidth = 5; g.stroke();
    p.path([[a[0] + 6, a[1] + 6], [b[0] + 6, b[1] + 6]], false); g.strokeStyle = "rgba(255,255,255,0.65)"; g.lineWidth = 4; g.stroke();
  }
  // faint ruled lines (torn from a notebook)
  for (let y = 210; y < H - 120; y += 118) { p.path([[M, y], [W - M, y + 4]], false); g.strokeStyle = "rgba(90,130,200,0.18)"; g.lineWidth = 3; g.stroke(); }
  g.restore();
  // the red marker text, three lines
  g.save(); g.strokeStyle = "#cf1f24"; g.lineCap = "round"; g.lineJoin = "round";
  const lines: [string, number, number][] = [["ESTAMOS BIEN", 520, 270], ["EN EL REFUGIO", 900, 270], ["LOS 33", 1320, 255]];
  const widthOf = (s: string, h: number) => [...s].reduce((a, ch) => a + (ch === " " ? h * 0.5 : (GLYPH[ch]?.w ?? 0) * h * 0.72 + h * 0.2), -h * 0.2);
  lines.forEach(([s, y, h0], i) => {
    const h = Math.min(h0, (W - 2 * M - 260) / (widthOf(s, 1) || 1)), x = (W - widthOf(s, h)) / 2 + (i - 1) * 30;
    // ink bleed: a slightly wider soft pass, then the marker stroke
    g.globalAlpha = 0.22; handLine(g, s, x, y, h, 3 + i, 40); g.globalAlpha = 1;
    handLine(g, s, x, y, h, 3 + i, 27);
  });
  g.restore();
  // tape scrap at the top edge
  g.save(); g.translate(W * 0.5, M + 6); g.rotate(-0.06);
  g.fillStyle = "rgba(230,236,240,0.62)"; g.fillRect(-170, -40, 340, 86);
  g.strokeStyle = "rgba(160,170,180,0.6)"; g.lineWidth = 3; g.strokeRect(-170, -40, 340, 86);
  g.restore();
  // ink outline of the sheet (cartoon style)
  p.poly(edge, null, 12);
  // the rescuer's thumbs gripping the bottom corners (ink-dot hands)
  for (const [x, y] of [[M + 40, H - M - 60], [W - M - 40, H - M - 70]] as const) { p.dot(x, y, 58, INK); p.arc(x - 10, y - 14, 30, 26, 200, 250, 10, "#4a3a50"); }
};
/** the sleeves holding the note (600 x 900): two red coverall arms rising from the bottom to the paper's lower corners */
export const fxNoteArms = (p: Pen, sleeve: string) => {
  for (const [x0, x1] of [[110, 80], [490, 520]] as const) {
    const pts: P2[] = [[x0 + (x0 < 300 ? -30 : 30), 900], [x0 + (x1 - x0) * 0.4, 520], [x1, 70]];
    p.line(pts, mix(sleeve, INK, 0.2), 46);
    p.stroke([[x0 + (x1 - x0) * 0.55 - 22, 420], [x0 + (x1 - x0) * 0.55 + 22, 412]], 12, "#e9eef0");
  }
};
