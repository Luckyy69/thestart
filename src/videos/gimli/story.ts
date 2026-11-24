// "The Jet That Ran Out of Fuel" (the Gimli Glider): shot plan timed to ~/gimli-short/voice/words.json (67.7 s).
// Places: the airport at the origin (day), the kitchen at x = -1000, the cruise set high over a cloud sea at ALT,
// the cockpit set at CK, Gimli's old runway (now a racetrack) at x = 3000 by the lake (golden evening).
export const FPS = 30;
export const TOTAL = 2090;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const KITCHEN: V3 = [-1000, 0, 0];
export const ALT: V3 = [0, 2000, 0];
export const CK: V3 = [600, 2000, 0];
export const GIMLI: V3 = [3000, 0, 0];
export const STOP_X = 2985;

export const W = {
  wrong: 4.34, metric: 7.71, kilograms: 12.49, pounds: 15.22, cups: 17.62, spoons: 19.54, little: 22.63,
  takes: 23.96, half: 25.18, warning: 28.26, beeps: 28.58, left: 29.68, stops: 30.21, right: 31.34, dark: 33.8,
  luckily: 34.93, gliders: 36.18, unluckily: 37.72, racetrack: 40.3, families: 42.38, karts: 43.66,
  tips: 45.33, sideways: 45.98, drops: 50.03, stone: 50.61, collapses: 53.09, scrapes: 54.58, sparks: 56.26,
  racers: 57.4, extinguishers: 58.71, walk: 61.23, plane: 62.48, repaired: 63.74, gimli: 66.77,
};

export type Light = "day" | "golden";
export type Place = "cruise" | "airport" | "kitchen" | "cockpit" | "gimli";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 161, light: "golden", place: "cruise" },     // hook: silent jet gliding
  { id: 2, a: 161, b: 270, light: "day", place: "airport" },     // 1983, metric
  { id: 3, a: 270, b: 405, light: "day", place: "airport" },     // new 767 in kilograms
  { id: 4, a: 405, b: 478, light: "day", place: "airport" },     // worked out in pounds
  { id: 5, a: 478, b: 701, light: "day", place: "kitchen" },     // cups vs spoons
  { id: 6, a: 701, b: 810, light: "day", place: "airport" },     // takes off with less than half
  { id: 7, a: 810, b: 971, light: "golden", place: "cruise" },   // warning, left engine, right engine
  { id: 8, a: 971, b: 1048, light: "golden", place: "cockpit" }, // screens go dark
  { id: 9, a: 1048, b: 1132, light: "golden", place: "cockpit" },// captain flies gliders
  { id: 10, a: 1132, b: 1236, light: "golden", place: "gimli" }, // the runway is a racetrack (aerial)
  { id: 11, a: 1236, b: 1337, light: "golden", place: "gimli" }, // families, campers, go-karts
  { id: 12, a: 1337, b: 1573, light: "golden", place: "gimli" }, // the slip: sideways, drops like a stone
  { id: 13, a: 1573, b: 1716, light: "golden", place: "gimli" }, // nose gear collapses, sparks
  { id: 14, a: 1716, b: 1792, light: "golden", place: "gimli" }, // racers with extinguishers
  { id: 15, a: 1792, b: 1865, light: "golden", place: "gimli" }, // everybody walks away
  { id: 16, a: 1865, b: TOTAL, light: "golden", place: "cruise" },// repaired, flew 25 more years
];
export const XFADE: Record<number, number> = { 5: 6, 6: 6, 16: 12 };
export const FLASH_AT = 161;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state ----------------
/** engines: 1 running .. 0 dead (left = -z side, right = +z side) */
export const engines = (id: number, t: number): [number, number] => {
  if (id === 1) return [0, 0];
  if (id === 7) return [1 - smooth((t - (W.left - 0.1)) / 1.2), 1 - smooth((t - (W.right - 0.1)) / 1.2)];
  if (id >= 8 && id <= 15) return [0, 0];
  return [1, 1];
};
/** screens in the cockpit: 1 lit .. 0 dark */
export const screens = (id: number, t: number) => (id === 8 ? 1 - smooth((t - (W.dark - 0.25)) / 0.25) : id === 9 ? 0 : 1);
/** the plane at Gimli: position, attitude (yaw = nose turned toward +z, roll = bank), gear, collapse */
export type PlaneState = { pos: V3; yaw: number; roll: number; pitch: number; gear: boolean; collapse: number };
export const gimliPlane = (id: number, t: number): PlaneState => {
  if (id === 10) { const u = (t - 37.7) / 3.5; return { pos: [GIMLI[0] - 2600 + 500 * u, 900 - 60 * u, 120], yaw: 0, roll: 0, pitch: 0.02, gear: false, collapse: 0 }; }
  if (id === 11) { const u = (t - 41.2) / 3.4; return { pos: [GIMLI[0] - 1500 + 420 * u, 420 - 70 * u, 60], yaw: 0, roll: 0.05, pitch: 0, gear: true, collapse: 0 }; }
  if (id === 12) {
    const t0 = 44.6, t1 = 52.45, u = clamp01((t - t0) / (t1 - t0));
    const slip = smooth((t - (W.tips - 0.2)) / 1.0) * (1 - smooth((t - 51.2) / 1.0));
    const drop = smooth((t - (W.drops - 0.3)) / 1.6);
    const x = GIMLI[0] - 900 + 520 * u, y = 230 - 120 * u - 70 * drop + 0 * slip;
    return { pos: [x, Math.max(6, y), 18 * slip], yaw: 0.38 * slip, roll: -0.42 * slip, pitch: -0.04 * drop, gear: true, collapse: 0 };
  }
  if (id === 13) {
    const t0 = 52.45, k = clamp01((t - t0) / 4.6), x = GIMLI[0] - 360 + (STOP_X - (GIMLI[0] - 360)) * (1 - (1 - k) ** 2.2);
    const touch = clamp01((t - t0) / 0.35), y = 4 * (1 - touch);
    return { pos: [x, y, 0], yaw: 0, roll: 0, pitch: 0.06 * (1 - touch), gear: true, collapse: smooth((t - (W.collapses - 0.05)) / 0.45) };
  }
  return { pos: [STOP_X, 0, 0], yaw: 0, roll: 0, pitch: 0, gear: true, collapse: 1 };
};
/** sparks from the nose (shot 13 after the collapse, while it still slides) */
export const sparksAt = (id: number, t: number) => (id === 13 ? smooth((t - W.collapses - 0.25) / 0.3) * (1 - smooth((t - 56.6) / 0.6)) : 0);

// ---------------- camera ----------------
// Grammar (reference): a hard cut every ~1.1-2.4 s, mostly close/medium framings, low angles, foreground framing.
// K = a key reached by a smootherstep glide; P = a key reached by a linear creep (a hold that keeps pushing in);
// cut keys (X) jump hard. Keys flagged rp/rl are offsets from the jet (gimliPlane) in shots 12-13.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; rel?: boolean; lin?: boolean; rp?: boolean; rl?: boolean };
const K = (f: number, pos: V3, look: V3, fov = 40, roll = 0, cut = false): Key => ({ f, pos, look, fov, roll, cut });
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const X = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, cut: true });
/** jet-relative variants: pos and/or look are offsets from the jet's position at that frame */
const R = (k: Key, rp: boolean, rl: boolean): Key => ({ ...k, rp, rl });
const A = (x: number, y: number, z: number): V3 => [ALT[0] + x, ALT[1] + y, ALT[2] + z];
const C = (x: number, y: number, z: number): V3 => [CK[0] + x, CK[1] + y, CK[2] + z];
const G = (x: number, y: number, z: number): V3 => [GIMLI[0] + x, GIMLI[1] + y, GIMLI[2] + z];
const KI = (x: number, y: number, z: number): V3 => [KITCHEN[0] + x, KITCHEN[1] + y, KITCHEN[2] + z];
const CAMS: Record<number, Key[]> = {
  1: [K(0, A(-96, 20, 104), A(-4, 0, 0), 40, 0.04), P(55, A(-90, 19, 99), A(-3, 0, 0), 39, 0.06),
      X(56, A(20, -4.5, 17), A(6, -2.4, 7.9), 38, 0.05), P(107, A(18, -4.3, 15.4), A(6, -2.4, 7.9), 34, 0.08),       // dead engine, under the wing
      X(108, A(46, 4, -18), A(20, 0.5, 0), 36, -0.04), P(161, A(42.5, 3.5, -16.2), A(20, 0.5, 0), 32, -0.08)],         // nose, cockpit windows
  2: [K(161, [-66, 3, 30], [0, 6, 2], 46), P(215, [-62.5, 2.8, 28.6], [1, 6, 2], 44, -0.04),
      X(216, [-1, 1.0, 8.4], [-4.6, 1.45, 12.2], 40, 0.04), P(270, [-1.5, 1.0, 9.0], [-4.6, 1.5, 12.2], 36, 0.08)],   // fueler, low, under the wing
  3: [K(270, [10, 2.2, 22], [2, 3.6, 6], 40), P(327, [9.2, 2.1, 20.6], [1.8, 3.5, 6.3], 38, 0.04),
      X(328, [6.5, 0.9, 15.5], [2.4, 2.0, 10], 42, -0.04), P(367, [6.1, 0.9, 14.9], [2.4, 2.0, 10], 39, -0.07),       // checker + gauge, low
      X(368, [2.6, 3.0, 13.6], [1, 3.85, 9.4], 34, 0.04), P(405, [2.5, 3.1, 13.0], [1, 3.85, 9.4], 31, 0.07)],      // gauge close ("kilograms")
  4: [K(405, [-8.5, 1.6, 13.2], [-3.6, 1.3, 9.6], 36), P(447, [-8.0, 1.6, 12.6], [-3.6, 1.3, 9.6], 34, -0.04),
      X(448, [-0.6, 1.1, 12.2], [-3.0, 1.65, 9.7], 42, 0.04), P(478, [-0.8, 1.12, 11.9], [-3.0, 1.65, 9.7], 39, 0.07)], // scale + fueler close ("pounds")
  5: [K(478, KI(0, 1.5, 4.4), KI(0, 1.15, 0), 38), P(527, KI(0.15, 1.46, 3.9), KI(0.05, 1.14, 0), 36, 0.03),
      X(528, KI(-0.95, 1.36, 1.15), KI(-0.5, 1.25, 0.05), 34, -0.04), P(577, KI(-0.9, 1.35, 1.0), KI(-0.5, 1.25, 0.05), 31, -0.07), // cup
      X(578, KI(0.85, 1.22, 0.95), KI(0.4, 1.18, 0.1), 34, 0.04), P(629, KI(0.8, 1.22, 0.83), KI(0.4, 1.18, 0.1), 31, 0.07),         // spoon
      X(630, KI(0.4, 1.32, 1.7), KI(-0.1, 1.5, -0.75), 40, -0.04), P(701, KI(0.35, 1.33, 1.45), KI(-0.1, 1.5, -0.75), 36, -0.08)],   // baker, nervous
  6: [K(701, [-205, 2.5, -24], [-300, 4, -78], 42), P(756, [-201, 2.5, -24.8], [-200, 12, -78], 43, -0.03),
      X(757, [-140, 1.0, -44], [-250, 4, -78], 50, 0.05), P(810, [-141, 0.9, -45], [-90, 20, -78], 46, 0.08)],       // runway edge: the jet roars past
  7: [K(810, A(-70, 22, 120), A(0, 1, 0), 40), K(870, A(-60, 20, 108), A(0, 1, 0), 40),
      K(872, A(-2, -1.5, -22), A(6.5, -2.2, -7.9), 40, 0.05, true), K(924, A(-1.4, -1.6, -20.5), A(6.5, -2.2, -7.9), 38, 0.06),
      K(926, A(-2, -1.5, 22), A(6.5, -2.2, 7.9), 40, -0.05, true), K(971, A(-1.4, -1.6, 20.5), A(6.5, -2.2, 7.9), 38, -0.06)],
  8: [K(971, C(-1.5, 1.95, 0.05), C(1.2, 0.85, 0), 54), P(1005, C(-1.42, 1.92, 0.05), C(1.2, 0.85, 0), 51, 0.03),
      X(1006, C(0.85, 1.12, -0.2), C(0, 1.02, -0.55), 64, -0.04), P(1048, C(0.8, 1.12, -0.22), C(0, 1.02, -0.55), 58, -0.08)], // screens go dark
  9: [K(1048, C(3.4, 1.45, -0.6), C(0, 1.3, -0.6), 34), P(1079, C(3.3, 1.45, -0.6), C(0, 1.3, -0.6), 32, -0.03),
      X(1080, C(0.85, 1.05, -0.1), C(0, 1.35, -0.75), 58, 0.04), P(1132, C(0.8, 1.05, -0.15), C(0, 1.35, -0.75), 53, 0.08)],     // captain + thought, low
  10: [K(1132, G(120, 140, 230), G(330, 0, 10), 44), P(1199, G(127, 134, 223), G(333, 0, 10), 42, 0.04),
       X(1200, G(318, 1.8, 17), G(336, 1.5, 29), 34, -0.04), P(1236, G(318.6, 1.8, 17.4), G(336, 1.5, 29), 31, -0.08)],   // trackside, karts + crowd
  11: [K(1236, G(352, 2.6, 22.4), G(343, 1.5, 29), 40, 0.03), P(1289, G(351.4, 2.55, 22.9), G(343, 1.5, 29), 36, 0.07), // families over the tyre wall
       X(1290, G(298, 0.9, -7), G(380, 0.8, 3), 30, -0.04), P(1312, G(299, 0.9, -7), G(380, 0.8, 3), 28, -0.06), // karts coming at us, low
       X(1312, G(372, 1.5, 38), G(-1084, 330, 60), 32, 0.04), P(1337, G(371, 1.5, 37.6), G(-1084, 330, 60), 29, 0.07)],  // over the crowd: the jet                                                        // ...look up: the jet
  12: [R(K(1337, [-80, 14, 70], [8, 2, 0], 46), true, true), R(P(1384, [-74, 13, 72], [8, 2, 0], 45, -0.04), true, true),
       R(X(1385, [34, -6, 24], [0, 1, 2], 42, 0.04), true, true), R(P(1436, [30, -5, 22], [0, 1, 2], 39, 0.08), true, true),   // under the nose, banked
       R(X(1437, G(-300, 1.2, 34), [6, -4, 0], 40, -0.04), false, true), R(P(1496, G(-301, 1.2, 33.6), [6, -4, 0], 38, -0.07), false, true), // from the runway
       R(X(1497, [-30, 4, 62], [6, 0, 0], 44, 0.03), true, true), R(P(1573, [-22, 8, 70], [6, 0, 0], 46, 0.07), true, true)],  // drops like a stone
  13: [R(K(1573, [36, 2.4, 40], [23, 1.8, 0], 42), true, true), R(P(1613, [35, 2.2, 38], [23, 1.8, 0], 40, 0.04), true, true),
       R(X(1614, [38, 0.7, 10], [22, 1.3, 0], 42, -0.04), true, true), R(P(1663, [36, 0.6, 9], [22, 1.3, 0], 38, -0.08), true, true), // nose scraping, sparks
       R(X(1664, G(36, 1.0, 20), [14, 2, 0], 42, 0.04), false, true), R(P(1716, G(35, 1.0, 19.4), [16, 2, 0], 39, 0.07), false, true)], // it slides up and stops
  14: [K(1716, G(40, 1.0, 14), G(42, 1.2, 3), 46, -0.03), P(1751, G(28, 1.0, 14), G(24, 1.3, 3), 44, -0.07),         // racers run in
       X(1752, G(25, 1.0, 9.5), G(15, 1.5, 2.5), 40, 0.04), P(1792, G(24.2, 1.0, 9.0), G(15, 1.5, 2.5), 37, 0.07)],    // extinguishers
  15: [K(1792, G(10, 1.6, 34), G(-6, 3.0, 4), 46), P(1829, G(9.5, 1.6, 32.6), G(-6, 3.1, 4), 44, 0.03),
       X(1830, G(-15.5, 0.9, 17.5), G(-19, 1.5, 12.5), 36, -0.04), P(1865, G(-15.8, 0.9, 17.0), G(-19, 1.5, 12.5), 33, -0.08)], // captain under the wing
  16: [K(1865, A(96, 16, 104), A(2, 0, 0), 40), P(1924, A(90, 16, 102), A(2, 0, 0), 40, -0.03),
       X(1925, A(48, -6, 14), A(18, 0, 0), 36, 0.04), P(1984, A(45, -5.5, 13), A(18, 0, 0), 32, 0.08),                // nose, engines running again
       X(1985, A(88, 16, 101), A(2, 0, 0), 40, -0.03), K(TOTAL, A(76, 16, 98), A(2, 0, 0), 40, -0.06)],
};
const KICKS: [number, number][] = [[Math.round(W.stops * FPS) - 1, 0.02], [Math.round((W.right + 0.2) * FPS), 0.02],
  [Math.round(W.collapses * FPS) - 1, 0.05], [Math.round(W.scrapes * FPS), 0.03], [Math.round(W.stone * FPS) - 2, 0.02]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const camAt = (id: number, f: number): Cam => {
  const ks = CAMS[id];
  let k0 = ks[0], k1 = ks[ks.length - 1];
  for (let i = 0; i < ks.length - 1; i++) if (f >= ks[i].f && (f < ks[i + 1].f || i === ks.length - 2)) { k0 = ks[i]; k1 = ks[i + 1]; break; }
  if (f < ks[0].f) k1 = k0;
  if (k1.cut) { /* glide into a cut key never happens: hold k0 until the cut */ k1 = k0; }
  const x = k1.f === k0.f ? 0 : clamp01((f - k0.f) / (k1.f - k0.f));
  const u = k1.lin ? x : glide(x);
  const jet = k0.rp || k0.rl || k1.rp || k1.rl ? gimliPlane(id, f / FPS).pos : ([0, 0, 0] as V3);
  const P0 = k0.rp ? add(k0.pos, jet) : k0.pos, P1 = k1.rp ? add(k1.pos, jet) : k1.pos;
  const L0 = k0.rl ? add(k0.look, jet) : k0.look, L1 = k1.rl ? add(k1.look, jet) : k1.look;
  const m = (a: V3, b: V3) => a.map((v, i) => v + (b[i] - v) * u) as V3;
  const c: Cam = { pos: m(P0, P1), look: m(L0, L1), fov: k0.fov! + (k1.fov! - k0.fov!) * u, roll: k0.roll! + (k1.roll! - k0.roll!) * u };
  for (const [kf, a] of KICKS) {
    const d = Math.floor(f - kf);
    if (d >= 0 && d < 7) {
      const s = (d % 2 ? -1 : 1) * a * (1 - d / 7);
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};

/** lens blur per beat (reference: close-ups 12-16, mediums 6-10, wides 0): [first frame, cInf, focus (default: the look target)].
 *  Close/medium shots on a character focus on that character's eyes. */
const EYE = 1.55;
const DOFK: [number, number, V3?][] = [
  [0, 4], [56, 14], [108, 12], [161, 0], [216, 13, [-4.6, EYE, 12.2]], [270, 6], [328, 12, [3.2, EYE, 10.6]], [368, 16],
  [405, 12, [-3.6, EYE, 9.6]], [448, 15, [-3.6, EYE, 9.6]],
  [478, 10, KI(-0.1, EYE, -0.75)], [528, 16], [578, 16], [630, 14, KI(-0.1, EYE, -0.75)], [701, 0], [757, 3], [810, 4], [872, 12],
  [971, 10, C(0, 1.4, -0.3)], [1006, 12, C(0, 1.1, -0.55)], [1048, 12, C(0, 1.4, -0.55)], [1080, 14, C(0, 1.4, -0.55)],
  [1132, 0], [1200, 6], [1236, 10, G(343, EYE, 29)], [1290, 3], [1312, 0], [1337, 0], [1385, 4], [1437, 0], [1497, 0],
  [1573, 4], [1614, 12], [1664, 5], [1716, 6], [1752, 12, G(24.4, 1.25, 3.7)], [1792, 8], [1830, 14, G(-19, EYE, 12.5)],
  [1865, 4], [1925, 12], [1985, 4],
];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
