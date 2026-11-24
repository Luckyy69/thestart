// OWNER: cast agent (effect drawings) — Canvas2D drawings via the bridge Pen.
// 1) accessories drawn onto a character's own card after bodyFront (same canvas, so they never drift off the face):
//    glasses, headset, narrow tie + pocket protector, A7L pressure-suit details (neck ring, snoopy cap ears, bubble
//    helmet, hose connectors), PLSS backpack (drawn BEFORE the body), umbrella (Florida rain).
// 2) effect cards: "?" (confusion), thought bubble with the scrambled test screen (Aaron's memory), cheer sparkles.
import { Pen, INK, headBlob, blobPts, Blob, mix, shade } from "../bridge/toon";

type P2 = [number, number];
const rnd = (seed: number, k: number) => { const x = Math.sin(seed * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const ellP = (cx: number, cy: number, rx: number, ry: number, n = 48): P2[] =>
  Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * Math.PI * 2), cy + ry * Math.sin((i / n) * Math.PI * 2)] as P2);
/** limb-like stroke with a THIN ink rim (Pen.line's rim is sized for big shapes) */
const thin = (p: Pen, pts: P2[], col: string, w: number, rim: number) => { p.stroke(pts, w + 2 * rim, INK); p.stroke(pts, w, col); };
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const pts: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]])
    for (let i = 0; i <= 6; i++) { const b = ((a + (90 * i) / 6) * Math.PI) / 180; pts.push([cx + r * Math.cos(b), cy + r * Math.sin(b)]); }
  return pts;
};

// ---------------- body geometry (mirrors bodyFront in bridge/toon.ts for the adult build) ----------------
export type Geo = { W: number; u: number; HH: number; Ha: number; Hb: number; hc: number; chin: number; crown: number; torsoBot: number; tcx: number; Ta: number; seed: number; facing: number; H: Blob };
/** head / torso landmarks of an adult front card (design units, soles at 975) */
export const geoOf = (seed: number, mode: "stand" | "sit", facing = 0): Geo => {
  const H = headBlob(seed, 118, facing), W = 2 * H.a, HH = 2 * H.b, u = W / 100;
  const torsoBot = mode === "sit" ? 975 - 0.2 * HH : 975 - 1.4 * HH, chin = torsoBot - 1.1 * HH, hc = chin - H.b;
  return { W, u, HH, Ha: H.a, Hb: H.b, hc, chin, crown: hc - H.b, torsoBot, tcx: 300 + 3 * u * facing, Ta: (0.4 * W) / 1.06, seed, facing, H };
};

export type Acc = { back?: boolean; glasses?: boolean; headset?: boolean; tie?: string; pens?: boolean; suit?: boolean; helmet?: boolean; plss?: boolean; umbrella?: string; vest?: string };
export const accKey = (a: Acc) => [a.back ? "B" : "", a.glasses ? "g" : "", a.headset ? "h" : "", a.tie ?? "", a.pens ? "p" : "", a.suit ? "s" : "", a.helmet ? "H" : "", a.plss ? "P" : "", a.umbrella ?? "", a.vest ?? ""].join("");

/** drawn before the body: life-support backpack behind the torso, umbrella canopy shaft behind the head */
export const accBehind = (p: Pen, g: Geo, a: Acc) => {
  const { u, HH, chin, torsoBot, tcx, Ta } = g;
  if (a.plss) {
    const bp = rr(tcx - 1.28 * Ta, chin - 0.12 * HH, tcx + 1.28 * Ta, torsoBot - 0.08 * HH, 9 * u);
    p.poly(bp, "#e9e7e0", 4 * u);
    p.poly(rr(tcx + 0.9 * Ta, chin - 0.22 * HH, tcx + 1.18 * Ta, chin + 0.05 * HH, 3 * u), "#b9bcc4", 3 * u); // antenna housing
  }
};

/** drawn after the body, onto the same card */
export const accFront = (p: Pen, g: Geo, a: Acc) => {
  const { u, HH, Ha, Hb, hc, chin, crown, tcx, Ta, seed, facing } = g;
  const fx = 300 + 7 * u * facing;
  if (a.suit && a.back) {
    // seen from behind (over-the-shoulder shots): the snoopy cap covers the whole head, no face, no chest details
    const hp = blobPts(300, hc, g.H);
    p.clip(hp, () => {
      p.poly([[300 - 1.3 * Ha, crown - 20 * u], [300 + 1.3 * Ha, crown - 20 * u], [300 + 1.3 * Ha, chin + 20 * u], [300 - 1.3 * Ha, chin + 20 * u]], "#f4f2ec", 0);
      p.poly([[300 - 9 * u, crown - 20 * u], [300 + 9 * u, crown - 20 * u], [300 + 9 * u, chin + 20 * u], [300 - 9 * u, chin + 20 * u]], "#6b5446", 0);
      p.arc(300, hc, 0.8 * Ha, 0.8 * Hb, 200, 250, 6 * u, "#ffffff");
    });
    p.poly(hp, null, 5 * u);
    for (const s of [-1, 1]) p.ell(300 + s * 0.97 * Ha, hc + 6 * u, 8 * u, 13 * u, "#6b5446", 2.5 * u);
    p.ell(300, chin + 3 * u, 0.36 * g.W, 5.5 * u, "#4a78c8", 2.5 * u);
  } else if (a.suit) {
    // hose connectors (blue in, red out) + a small mission patch
    for (const [dx, col] of [[-0.42, "#3d6fd0"], [-0.18, "#d0423b"]] as const) p.ell(tcx + dx * Ta, chin + 0.55 * HH, 5 * u, 5 * u, col, 2 * u);
    p.ell(tcx + 0.45 * Ta, chin + 0.3 * HH, 7 * u, 7 * u, "#2f4f9a", 2 * u);
    p.dot(tcx + 0.45 * Ta, chin + 0.3 * HH, 2.4 * u, "#ffffff");
    // neck ring (anodised blue)
    p.ell(300, chin + 3 * u, 0.36 * g.W, 5.5 * u, "#4a78c8", 2.5 * u);
    p.stroke([[300 - 0.3 * g.W, chin + 2 * u], [300 + 0.3 * g.W, chin + 2 * u]], 1.5 * u, "#a9c4ee");
    // snoopy-cap ear pieces (white cap is the Outfit hat)
    const hp = blobPts(300, hc, g.H), cut = hc - 0.56 * Hb;
    p.clip(hp, () => {
      p.poly([[300 - 1.3 * Ha, crown - 20 * u], [300 + 1.3 * Ha, crown - 20 * u], [300 + 1.3 * Ha, cut], [300 - 1.3 * Ha, cut]], "#f4f2ec", 0);
      p.poly([[300 - 9 * u, crown - 20 * u], [300 + 9 * u, crown - 20 * u], [300 + 9 * u, cut], [300 - 9 * u, cut]], "#6b5446", 0);
      p.stroke([[300 - 1.3 * Ha, cut], [300 + 1.3 * Ha, cut]], 3 * u, INK);
    });
    p.inkRing(hp, 5 * u, Math.PI / 2, 0.3);
    for (const s of [-1, 1]) p.ell(300 + s * 0.97 * Ha, hc + 6 * u, 8 * u, 13 * u, "#6b5446", 2.5 * u);
  }
  if (a.glasses) {
    const col = "#1d1820";
    for (const s of [-1, 1]) p.poly(rr(fx + s * 13 * u - 10.5 * u, hc - 8.5 * u, fx + s * 13 * u + 10.5 * u, hc + 8 * u, 4 * u), null, 3.4 * u);
    p.stroke([[fx - 3 * u, hc - 3 * u], [fx + 3 * u, hc - 3 * u]], 2.6 * u, col);
    for (const s of [-1, 1]) p.stroke([[fx + s * 23.5 * u, hc - 5 * u], [300 + s * 0.96 * Ha, hc - 7 * u]], 2.6 * u, col);
  }
  if (a.headset) {
    const pts: P2[] = [];
    for (let i = 0; i <= 24; i++) { const t = Math.PI + (Math.PI * i) / 24; pts.push([300 + 1.04 * Ha * Math.cos(t), hc - 6 * u + 1.07 * Hb * Math.sin(t)]); }
    thin(p, pts, "#4a4c55", 3.2 * u, 1.3 * u);
    const s = -1, ex = 300 + s * 0.98 * Ha, ey = hc + 2 * u;
    p.ell(ex, ey, 8 * u, 11 * u, "#2a2b31", 2.5 * u);
    thin(p, [[ex + 3 * u, ey + 8 * u], [fx - 16 * u, hc + 22 * u], [fx - 11 * u, hc + 23 * u]], "#4a4c55", 1.3 * u, 0.9 * u);
    p.ell(fx - 10 * u, hc + 23 * u, 3 * u, 2.4 * u, "#2a2b31", 1 * u);
  }
  if (a.tie) {
    const x = tcx + 2 * u * facing;
    p.poly([[x - 3.6 * u, chin + 1 * u], [x + 3.6 * u, chin + 1 * u], [x + 2.4 * u, chin + 6 * u], [x - 2.4 * u, chin + 6 * u]], a.tie, 1.2 * u);
    p.poly([[x - 2.2 * u, chin + 6 * u], [x + 2.2 * u, chin + 6 * u], [x + 3.2 * u, chin + 0.44 * HH], [x, chin + 0.48 * HH], [x - 3.2 * u, chin + 0.44 * HH]], a.tie, 1.2 * u);
    p.stroke([[x - 2 * u, chin + 0.3 * HH], [x + 2 * u, chin + 0.31 * HH]], 1.2 * u, "#c9ccd2"); // tie clip
  }
  if (a.vest) { // waistcoat over the shirt: two front panels clipped to the torso, V opening, buttons
    const T: Blob = { a: Ta, b: 0.5 * (g.torsoBot - (chin - 0.25 * HH)), nTop: 2.2, nBot: 2.6, egg: 0.12, asym: 0.04 * facing, rot: 0, noise: 0.006, seed: seed + 7 };
    const tp = blobPts(tcx, g.torsoBot - T.b, T), x = tcx + 2 * u * facing;
    p.clip(tp, () => {
      for (const s of [-1, 1]) p.poly([[x + s * 2.2 * Ta, chin - 0.4 * HH], [x + s * 15 * u, chin - 0.4 * HH], [x + s * 15 * u, chin - 2 * u], [x + s * 0.5 * u, chin + 0.5 * HH],
        [x + s * 0.5 * u, g.torsoBot + 20 * u], [x + s * 2.2 * Ta, g.torsoBot + 20 * u]], s < 0 ? a.vest! : shade(a.vest!, 0.9), 1.8 * u);
    });
    p.inkRing(tp, 5 * u, Math.PI / 2, 0.3);
    for (let k = 0; k < 3; k++) p.dot(x + 4 * u, chin + 0.58 * HH + k * 0.16 * HH, 2.6 * u, "#e8c45a");
  }
  if (a.pens) { // pocket protector on the casual shirt's chest pocket (same side bodyFront picks)
    const fs = facing || (rnd(seed, 40) < 0.5 ? -1 : 1), px = tcx - fs * 0.46 * Ta, py = chin + 0.3 * HH;
    p.poly(rr(px - 7.5 * u, py - 2 * u, px + 7.5 * u, py + 8 * u, 1.5 * u), "#dfe6ee", 1.2 * u);
    ([["#2f5fc0", -4], ["#d0423b", 0], ["#1d1820", 4]] as const).forEach(([c, dx]) => thin(p, [[px + dx * u, py - 6 * u], [px + dx * u, py + 1 * u]], c, 1.7 * u, 0.7 * u));
  }
  if (a.helmet) {
    // clear bubble: tint over the face (opaque there), see-through outside (alpha < .5 cut by alphaTest), ink rim + glare
    const cy = hc - 4 * u, rx = 1.3 * Ha, ry = 1.32 * Hb;
    p.g.save(); p.path(ellP(300, cy, rx, ry, 72), true); p.g.fillStyle = "rgba(190,225,255,0.22)"; p.g.globalCompositeOperation = "source-atop"; p.g.fill(); p.g.restore();
    p.poly(ellP(300, cy, rx, ry, 72), null, 4.5 * u);
    p.arc(300, cy, rx - 7 * u, ry - 7 * u, 200, 250, 5 * u, "#ffffff");
    p.arc(300, cy, rx - 7 * u, ry - 7 * u, 258, 268, 5 * u, "#ffffff");
    p.ell(300, cy + ry - 2 * u, 0.5 * g.W, 6 * u, "#4a78c8", 2.5 * u); // neck ring the bubble locks onto
  }
  if (a.umbrella) {
    // held by an invisible hand at the chest (dot), canopy over the head
    const hx = tcx + 0.9 * Ta, hy = chin + 0.42 * HH, top = crown - 0.55 * HH, R = 1.9 * Ha;
    thin(p, [[hx, hy], [300 + 4 * u, top]], "#3a2a22", 2.4 * u, 1 * u);
    thin(p, [[hx, hy], [hx + 5 * u, hy + 7 * u], [hx + 10 * u, hy + 3 * u]], "#3a2a22", 2.4 * u, 1 * u);
    const cv: P2[] = [];
    for (let i = 0; i <= 30; i++) { const t = Math.PI + (Math.PI * i) / 30; cv.push([300 + R * Math.cos(t), top + 0.32 * HH + 0.52 * HH * Math.sin(t)]); }
    for (let i = 6; i >= 0; i--) { const x = 300 - R + (2 * R * i) / 6, k = i % 2 ? 1 : 0; cv.push([x, top + 0.32 * HH - k * 5 * u]); }
    p.poly(cv, a.umbrella, 4 * u);
    for (const k of [-0.33, 0.33]) p.stroke([[300 + k * R * 1.6, top + 0.3 * HH], [300 + k * 0.4 * R, top - 0.12 * HH]], 1.4 * u, shade(a.umbrella, 0.72));
    p.arc(300, top + 0.32 * HH, R * 0.82, 0.42 * HH, 220, 255, 3 * u, mix(a.umbrella, "#ffffff", 0.4));
    p.dot(300, top - 0.2 * HH, 3.5 * u, INK);
    p.dot(hx, hy, 5.5 * u, INK);
  }
};

// ---------------- effect cards ----------------
/** "?" on a 300 x 400 canvas: warm yellow with a fat plum ink rim */
export const fxQuestion = (p: Pen) => {
  const g = p.g;
  g.save(); g.font = "900 330px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.lineJoin = "round"; g.lineWidth = 30; g.strokeStyle = INK; g.strokeText("?", 150, 350);
  g.fillStyle = "#ffe46b"; g.fillText("?", 150, 350);
  g.restore();
  p.arc(122, 150, 40, 70, 200, 250, 9, "#fff7c4");
};

/** thought bubble (560 x 440): cloud + trailing puffs at the lower left, a 1968 test CRT with scrambled numbers inside */
export const fxThoughtScreen = (p: Pen, flick = 0) => {
  const cloud = (cx: number, cy: number, rx: number, ry: number, n: number, k: number): P2[] => {
    const pts: P2[] = [];
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, r = 1 + k * Math.abs(Math.sin((a * n) / 2)); pts.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]); }
    return pts;
  };
  const g = p.g;
  const puff = (pts: P2[], cx: number, cy: number, r: number) => {
    const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r * 1.2);
    gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.6, "#f3f6ff"); gr.addColorStop(1, "#c6d0ee");
    p.path(pts, true); g.fillStyle = gr; g.fill(); p.poly(pts, null, 8);
  };
  for (const [x, y, r] of [[60, 408, 14], [100, 372, 22]] as const) puff(ellP(x, y, r, r), x, y, r);
  puff(cloud(292, 182, 222, 140, 11, 0.06), 292, 182, 230);
  // the CRT: grey bezel, dark green-black glass, scrambled amber/green digits
  p.poly(rr(130, 70, 460, 300, 26), "#8e959c", 7);
  const sx0 = 152, sy0 = 90, sx1 = 438, sy1 = 280;
  p.poly(rr(sx0, sy0, sx1, sy1, 20), "#0c2418", 5);
  g.save(); p.path(rr(sx0, sy0, sx1, sy1, 20), true); g.clip();
  g.font = "bold 22px Courier New, monospace"; g.textBaseline = "top";
  const chars = "0123456789#%*$&@?/";
  for (let r = 0; r < 8; r++) {
    let s = "";
    for (let c = 0; c < 19; c++) s += chars[Math.floor(rnd(r * 31 + c + flick * 7, 3) * chars.length)];
    const dx = (rnd(r, 9 + flick) - 0.5) * 30;
    g.fillStyle = r % 3 === 1 ? "#ffd36a" : "#7dff9a";
    g.fillText(s, sx0 + 10 + dx, sy0 + 10 + r * 22.5);
  }
  g.fillStyle = "rgba(125,255,154,0.18)";
  for (let y = sy0; y < sy1; y += 6) g.fillRect(sx0, y, sx1 - sx0, 2);
  g.restore();
  p.arc(220, 140, 70, 40, 200, 250, 6, "rgba(255,255,255,0.55)");
  // little label plate: TEST
  p.poly(rr(250, 306, 340, 336, 6), "#f2c84b", 4);
  g.save(); g.font = "900 22px Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("TEST", 295, 322); g.restore();
};

/** cheer sparkle: 4-point stars (240 x 240), t 0..1 pulses the size */
export const fxSparkle = (p: Pen, t: number) => {
  const k = 0.55 + 0.45 * Math.sin(t * Math.PI);
  for (const [cx, cy, r] of [[120, 120, 100 * k], [50, 60, 34 * k], [196, 190, 28 * k]] as const) {
    const pts: P2[] = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr2 = i % 2 ? r * 0.28 : r; pts.push([cx + rr2 * Math.cos(a), cy + rr2 * Math.sin(a)]); }
    p.poly(pts, "#fff3a8", 6);
  }
};
