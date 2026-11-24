// "The Skyscraper That Cooked a Car": shot plan timed to ~/scorchie-short/voice/words.json (63.1 s of voice).
// World units are metres, ground at y = 0. London street runs along x; the tower stands north of it (-z) with its
// concave south face looking at the street; the hot spot lands on the south pavement at SPOT. A park sits at x = -300
// (magnifying glass) and Las Vegas at x = +600 (golden light).
export const FPS = 30;
export const TOTAL = 1940;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

// ---------------- places ----------------
export const SPOT: V3 = [0, 0, 6.2];       // London hot spot
export const CAR: V3 = [0, 0, 4.4];        // parked Jaguar (centre, facing +x)
export const PARK_AT: V3 = [-300, 0, 0];   // magnifying-glass kid
export const VEGAS: V3 = [600, 0, 0];      // pool deck centre
export const VSPOT: V3 = [603, 0, 6];      // Vegas hot spot on the lounger
export const CLOCK_AT: V3 = [-4.2, 0, 9.4];

// ---------------- word cues (s) ----------------
export const W = {
  melted: 1.18, parks: 11.03, goes: 13.0, mirror: 15.23, badge: 16.37, panels: 17.74, wax: 19.1,
  word: 19.95, reporter: 21.75, beam: 22.75, pan: 23.24, cracks: 24.08, fries: 24.95, crowds: 27.56,
  luckily: 30.21, unluckily: 33.17, flat: 35.92, curved: 38.72, spot2: 41.78, leaf: 43.45, glass: 43.9,
  skyscraper: 47.48, fins: 50.27, before: 55.31, hotel: 57.47, melted2: 58.51, bag: 59.25, death: 62.31,
};
export const LEAD = 2 / FPS;

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: "street" | "flat" | "side" | "park" | "aerial" | "vegas" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 119, light: "day", place: "street" },       // hook: car melting in the beam
  { id: 2, a: 119, b: 286, light: "day", place: "street" },     // 2013, the curved tower
  { id: 3, a: 286, b: 425, light: "day", place: "street" },     // he parks and goes to work
  { id: 4, a: 425, b: 598, light: "day", place: "street" },     // mirror, badge, panels
  { id: 5, a: 598, b: 648, light: "day", place: "street" },     // word gets around
  { id: 6, a: 648, b: 817, light: "day", place: "street" },     // reporter fries an egg
  { id: 7, a: 817, b: 906, light: "day", place: "street" },     // crowds in the hot spot
  { id: 8, a: 906, b: 1066, light: "day", place: "street" },    // two hours a day / every sunny day
  { id: 9, a: 1066, b: 1154, light: "day", place: "flat" },     // a flat window bounces it straight back
  { id: 10, a: 1154, b: 1285, light: "day", place: "side" },    // a curved wall focuses it
  { id: 11, a: 1285, b: 1355, light: "day", place: "park" },    // magnifying glass and leaf
  { id: 12, a: 1355, b: 1469, light: "day", place: "aerial" },  // this magnifying glass was a skyscraper
  { id: 13, a: 1469, b: 1591, light: "day", place: "street" },  // the fins go on
  { id: 14, a: 1591, b: 1688, light: "day", place: "street" },  // here's the thing
  { id: 15, a: 1688, b: 1821, light: "golden", place: "vegas" },// Las Vegas, bag melts by the pool
  { id: 16, a: 1821, b: TOTAL, light: "golden", place: "vegas" }, // the death ray
];
export const XFADE: Record<number, number> = { 11: 6, 12: 6, 15: 10 };
export const FLASH_AT = 119;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};
/** the car: x position (drives in during shot 3), and how melted each part is (0..1) */
export const carX = (id: number, t: number) => (id === 3 ? CAR[0] - 26 * (1 - smooth((t - 9.6) / 1.6)) : CAR[0]);
export const melt = (id: number, t: number) => {
  if (id === 1) return { mirror: smooth((t - 0.6) / 1.6), badge: smooth((t - 1.2) / 1.8), panels: smooth((t - 1.6) / 2.2) };
  if (id === 3 || id === 2) return { mirror: 0, badge: 0, panels: 0 };
  if (id === 4) return {
    mirror: smooth((t - (W.mirror - 0.1)) / 0.9), badge: smooth((t - (W.badge - 0.1)) / 0.9), panels: smooth((t - (W.panels - 0.1)) / 1.4),
  };
  return { mirror: 1, badge: 1, panels: 1 };
};
/** hot spot strength (0..1.4) and centre; shot 8 sweeps it along the street ("two hours a day", then every day) */
export const spotAt = (id: number, t: number): { k: number; at: V3; r: number } => {
  if (id === 2) return { k: 0, at: SPOT, r: 3 };
  if (id === 3) return { k: 0, at: SPOT, r: 3 };
  if (id === 4) return { k: 0.4 + 0.6 * smooth((t - 14.2) / 0.8), at: SPOT, r: 3.2 };
  if (id === 8) {
    const sweep = (u: number) => [SPOT[0] - 7 + 14 * u, 0, SPOT[2]] as V3;
    if (t < W.unluckily - LEAD) { const u = clamp01((t - 30.2) / 2.8); return { k: Math.sin(Math.PI * clamp01(u * 1.02)) * 1.1 + 0.05, at: sweep(u), r: 3 }; }
    const u = ((t - (W.unluckily - LEAD)) / 0.55) % 1; // every day: quick repeating sweeps
    return { k: Math.sin(Math.PI * u) * 1.1, at: sweep(u), r: 3 };
  }
  if (id === 13) return { k: 1 - smooth((t - 49.9) / 2.2), at: SPOT, r: 3.2 };
  if (id === 14) return { k: 0, at: SPOT, r: 3 };
  if (id >= 15) return { k: id === 16 && t > W.death - LEAD ? 1 + 0.8 * Math.exp(-(t - W.death) * 2.5) : 1, at: VSPOT, r: 2.6 };
  return { k: 1, at: SPOT, r: 3.2 };
};
/** fins on the south face: 0 none .. 1 every floor (shot 13 builds them bottom-up) */
export const finsAt = (id: number, t: number) => (id < 13 ? 0 : id > 13 ? 1 : smooth((t - (W.fins - 0.6)) / 2.0));
/** rays shown (0..1 growth) for the explanation shots */
export const raysAt = (id: number, t: number) =>
  id === 9 ? smooth((t - 35.7) / 1.0) : id === 10 ? smooth((t - 38.9) / 1.6) : id === 12 ? 1 : 0;

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean };
const K = (f: number, pos: V3, look: V3, fov = 40, roll = 0, cut = false): Key => ({ f, pos, look, fov, roll, cut });
/** the look point of a shot's first key (world.ts centres the sun shadow box on it, so it does not drift) */
export const shotLook0 = (id: number): V3 => CAMS[id][0].look;
/** per shot: keyframes; between keys a symmetric smootherstep glide (so every hold creeps). A cut is two keys on the
 *  same frame: the first ends the glide, the second (cut = true) is where the camera jumps to (hard cut inside a shot). */
const C = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => K(f, pos, look, fov, roll, true);
const CAMS: Record<number, Key[]> = {
  // hook: wide on the melting car, cut to the badge/hood close-up as it goes soft
  1: [K(0, [7.4, 1.25, 9.6], [0.9, 1.0, 4.2], 42), K(58, [7.0, 1.22, 9.3], [0.95, 0.98, 4.25], 41.5, 0.03),
      C(58, [5.9, 1.35, 8.1], [1.7, 0.85, 4.4], 34, -0.04), K(119, [5.5, 1.3, 7.8], [1.7, 0.83, 4.4], 32, -0.06)],
  // the curved tower: street wide, then a low worm's-eye look up its concave face, then a side angle
  2: [K(119, [64, 1.7, 9.5], [4, 14, -20], 50), K(192, [62, 1.7, 9.4], [3, 24, -21], 50, -0.02),
      C(192, [-12, 1.5, 10.5], [0, 42, -22], 56, 0.04), K(250, [-11, 1.5, 10.2], [0, 50, -22], 56, 0.06),
      C(250, [31, 1.6, 8.2], [0, 60, -24], 48, -0.03), K(286, [30, 1.6, 8.0], [0, 66, -24], 48, -0.05)],
  // he parks (wide), then a medium as he gets out and strolls off to work
  3: [K(286, [-10, 1.55, 11.2], [-3, 1.0, 4.4], 38), K(345, [-9.6, 1.55, 11.0], [0.3, 1.0, 4.6], 38),
      C(345, [4.6, 1.45, 10.6], [1.2, 1.1, 6.0], 34, 0.03), K(425, [5.6, 1.45, 10.4], [3.0, 1.1, 6.4], 33, 0.05)],
  // mirror close-up, badge close-up, then the medium for the panels (was two fast whip-pans: QA pops)
  4: [K(425, [2.5, 1.5, 8.6], [0.95, 1.18, 5.4], 30, 0.05), K(482, [2.35, 1.45, 8.1], [0.95, 1.15, 5.4], 29, 0.06),
      C(482, [5.6, 1.25, 7.4], [2.3, 0.85, 4.4], 30, -0.04), K(523, [5.4, 1.2, 7.0], [2.3, 0.85, 4.4], 29, -0.05),
      C(523, [5.2, 1.75, 13.6], [0.2, 1.0, 4.8], 40, 0.0), K(598, [4.6, 1.7, 12.4], [0.2, 1.05, 4.9], 39, 0.04)],
  5: [K(598, [-4.2, 1.6, 15.5], [0.4, 1.4, 7.2], 42), K(648, [-3.6, 1.6, 14.4], [0.4, 1.4, 7.2], 41, 0.05)],
  // reporter: walk-in wide, medium on her as she arrives, close on the pan for the egg
  6: [K(648, [-1.5, 1.55, 15.4], [-2.0, 1.2, 7.8], 40), K(706, [-0.4, 1.47, 12.8], [-1.3, 1.07, 8.0], 35),
      C(706, [0.6, 1.5, 11.0], [-1.6, 1.25, 8.0], 32, 0.04), K(742, [0.5, 1.48, 10.8], [-1.6, 1.22, 8.0], 31, 0.05),
      C(742, [-0.6, 2.0, 10.3], [-1.12, 0.98, 8.2], 34, -0.03), K(817, [-0.65, 1.95, 10.0], [-1.12, 0.98, 8.2], 32, -0.05)],
  // crowds: wide, then close on the happy faces
  7: [K(817, [7.5, 1.7, 17.5], [0, 1.4, 7.0], 42), K(862, [6.8, 1.68, 16.6], [0, 1.4, 7.0], 41.5, -0.03),
      C(862, [2.8, 1.45, 12.6], [0.2, 1.2, 8.2], 33, 0.04), K(906, [2.6, 1.45, 12.2], [0.2, 1.2, 8.2], 32, 0.06)],
  // two hours a day (wide), every sunny day: close on the clock, then back wide as the spot sweeps
  8: [K(906, [-9.5, 1.3, 17.5], [-2.0, 2.6, 7.2], 46), K(995, [-8.6, 1.3, 16.2], [-2.2, 2.6, 7.4], 45),
      C(995, [-2.9, 2.7, 13.4], [-4.2, 3.35, 9.6], 30, 0.04), K(1030, [-3.0, 2.7, 13.1], [-4.2, 3.35, 9.6], 29, 0.06),
      C(1030, [-8.2, 1.28, 15.6], [-2.3, 2.65, 7.5], 44), K(1066, [-7.9, 1.25, 15.2], [-2.4, 2.7, 7.6], 44, 0.06)],
  9: [K(1066, [80, 2.0, 30], [72, 13, -18], 50), K(1154, [79, 2.0, 27.5], [72, 13, -18], 49, 0.05)],
  // the curved wall: side wide, then down on the rays converging on the pavement crowd
  10: [K(1154, [150, 38, 20], [0, 44, -8], 46), K(1222, [144, 37, 19], [0, 43, -8], 45.5, -0.02),
       C(1222, [22, 19, 15.5], [0, 3, 5], 46, 0.03), K(1285, [20, 18, 14.5], [0, 2.5, 5.5], 44, 0.05)],
  11: [K(1285, [-298.0, 1.05, 3.3], [-299.7, 0.3, 0.3], 36), K(1355, [-298.2, 0.95, 2.9], [-299.7, 0.28, 0.3], 34, 0.05)],
  12: [K(1355, [118, 85, 150], [0, 38, -12], 46), K(1424, [103, 75, 130], [0, 38, -12], 46),
       C(1424, [84, 62, 104], [0, 40, -12], 44, 0.05), K(1469, [80, 60, 100], [0, 40, -12], 44, 0.06)],
  // the fins go on: tilt up, then close on the crowd losing its fun
  13: [K(1469, [10, 1.7, 10.5], [0, 46, -20], 56), K(1532, [9.5, 1.7, 10.25], [0, 50, -20], 55.5, -0.03),
       C(1532, [3.2, 1.5, 13.4], [-0.6, 1.3, 8.6], 34, 0.04), K(1591, [3.0, 1.5, 13.0], [-0.6, 1.3, 8.6], 33, 0.06)],
  14: [K(1591, [9, 1.7, 10.5], [0, 92, -18], 48), K(1640, [8.5, 1.7, 10.25], [0, 98, -18], 46, 0.03),
       C(1640, [92, 70, 120], [0, 62, -14], 40, -0.03), K(1688, [88, 68, 114], [0, 62, -14], 40, -0.05)],
  // Vegas: wide, push to the guest, cut close on the bag as it melts
  15: [K(1688, [612, 4, 24], [601, 6, -6], 44), K(1745, [608, 2.2, 15.5], [603.3, 1.2, 5.8], 38),
       K(1758, [607.8, 2.1, 15.0], [603.3, 1.15, 5.85], 37.5, 0.02),
       C(1758, [606.6, 1.25, 8.7], [603.8, 0.72, 6.3], 34, -0.04), K(1821, [606.4, 1.2, 8.4], [603.8, 0.7, 6.3], 32, -0.06)],
  16: [K(1821, [597, 1.6, 15.5], [601.5, 1.4, 7.6], 40), K(1866, [597.5, 1.55, 14.6], [601.6, 1.4, 7.6], 39),
       C(1866, [598.6, 1.5, 12.6], [601.8, 1.3, 7.4], 36, 0.07), K(TOTAL, [598.4, 1.5, 12.2], [601.8, 1.3, 7.4], 35, 0.08)],
};
/** impact shakes: a smooth damped wobble (was a per-frame sign flip, which the re-timed cut turned into frame-diff pops) */
const KICKS: [number, number][] = [[Math.round(W.melted * FPS) - 1, 0.025], [Math.round(W.cracks * FPS) - 1, 0.018], [Math.round(W.panels * FPS) - 1, 0.015],
  [Math.round(W.skyscraper * FPS) - 1, 0.05], [Math.round(W.death * FPS) - 1, 0.025]];
export const camAt = (id: number, f: number): Cam => {
  const ks = CAMS[id];
  // the last key at or before f (so at a cut frame the cut key wins)
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].f <= f) i++;
  const k0 = ks[i], k1 = i < ks.length - 1 ? ks[i + 1] : ks[i];
  const u = k1.f === k0.f || f < k0.f ? 0 : glide((f - k0.f) / (k1.f - k0.f));
  const m = (a: V3, b: V3) => a.map((v, j) => v + (b[j] - v) * u) as V3;
  const c: Cam = { pos: m(k0.pos, k1.pos), look: m(k0.look, k1.look), fov: k0.fov! + (k1.fov! - k0.fov!) * u, roll: k0.roll! + (k1.roll! - k0.roll!) * u };
  for (const [kf, a] of KICKS) {
    const d = f - kf;
    if (d > 0 && d < 12) {
      const s = a * Math.sin(Math.PI * d * 0.45) * Math.exp(-d / 3);
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};

// ---------------- lens ----------------
const DOF: Record<number, number> = { 1: 12, 2: 0, 3: 8, 4: 13, 5: 10, 6: 12, 7: 10, 8: 7, 9: 0, 10: 0, 11: 14, 12: 0, 13: 0, 14: 0, 15: 8, 16: 11 };
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => ({ cInf: DOF[shotAt(f).id] ?? 0 });
