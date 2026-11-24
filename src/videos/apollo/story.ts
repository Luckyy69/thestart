// "The Rocket That Made Its Own Lightning" (Apollo 12, 14 Nov 1969): shot plan timed to ~/apollo-short/voice/words.json
// (60.1 s of voice). World units metres, ground y = 0. PLACES (each a separate set, far apart):
//   PAD     (0,0,0)        launch pad in rain: Saturn V on the pad (base at y=0, ~111 m tall, axis +y), service tower at z=-20
//   SKY     (0,0,0)+air    the same rocket flying: pose from rocketAt(); storm cloud deck base ~y=1100, tops ~1900
//   CABIN   (3000,0,0)     command-module interior: panel toward +x, three couches (Conrad z=-0.75, Gordon z=0, Bean z=+0.75)
//   MCC     (-3000,0,0)    Mission Control: tiered console rows facing -z toward a big wall of screens at z=-14
//   DIAGRAM (0,0,-6000)    explanation: flat ground, cloud deck at y=900, the rocket at y~520 with a plume reaching the ground
//   MOON    (6000,0,0)     lunar surface, black sky, Earth; the lunar module at MOON
export const FPS = 30;
export const TOTAL = 1865;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const PAD: V3 = [0, 0, 0];
export const CABIN: V3 = [3000, 0, 0];
export const MCC: V3 = [-3000, 0, 0];
export const DIAGRAM: V3 = [0, 0, -6000];
export const MOON: V3 = [6000, 0, 0];
export const ROCKET_H = 111;
/** Mission Control seats (x, z relative to MCC; y=0 floor). Aaron is the young engineer in the front row. */
export const SEATS = { aaron: [1.2, 0, -4.0] as V3, flight: [0, 0, 2.5] as V3 };

/** word cues (s) */
export const W = {
  struck: 2.97, lightning: 3.5, twice: 4.3, made: 5.96, itself: 6.64, rainy: 8.59, florida: 9.38, astronauts: 10.6,
  biggest: 12.03, liftoff: 13.83, flash: 16.46, warning: 17.79, once: 19.35, second: 21.62, bolt: 21.94,
  mission: 23.16, garbage: 24.82, abort: 27.79, engineer: 29.57, aaron: 30.63, nobody1: 31.94, tryWord: 33.37, sce: 33.87,
  aux: 34.82, year: 36.42, numbers: 39.01, test: 39.74, capsule: 41.22, bean: 42.44, switch: 43.25, flips: 43.75,
  life: 45.79, nobody2: 46.77, morning: 48.25, exhaust: 50.24, long: 51.22, wire: 53.08, ground: 54.44, rod: 56.87,
  five: 57.67, landed: 59.01, moon: 59.56,
};
/** lightning strikes on the rocket (s): the hook shows two (struck / twice), the story ones at "flash" and "bolt",
 *  the diagram one travels cloud -> rocket -> plume -> ground at "wire" */
export const STRIKES = [W.struck + 0.25, W.twice - 0.05, W.flash - 0.05, W.bolt - 0.05, W.wire - 0.2, W.rod - 0.15];
/** white screen flashes (frames, 3 frames each) on the strikes the camera sees from outside */
export const FLASHES = [Math.round((W.struck + 0.25) * FPS), Math.round((W.twice - 0.05) * FPS), Math.round((W.flash - 0.05) * FPS), Math.round((W.bolt - 0.05) * FPS)];

export type Look = "storm" | "interior" | "mcc" | "diagram" | "space";
export type Place = "sky" | "pad" | "cabin" | "mcc" | "diagram" | "moon";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 157, look: "storm", place: "sky", light: "day" },        // hook: rocket in storm, struck, twice
  { id: 2, a: 157, b: 233, look: "storm", place: "sky", light: "day" },      // the rocket made that lightning itself
  { id: 3, a: 233, b: 308, look: "storm", place: "pad", light: "day" },      // grey rainy morning in Florida
  { id: 4, a: 308, b: 415, look: "storm", place: "pad", light: "day" },      // three astronauts on top (tilt up, cut inside)
  { id: 5, a: 415, b: 447, look: "storm", place: "pad", light: "day" },      // liftoff
  { id: 6, a: 447, b: 524, look: "storm", place: "sky", light: "day" },      // 36 s later, a flash
  { id: 7, a: 524, b: 606, look: "interior", place: "cabin", light: "day" }, // every warning light comes on
  { id: 8, a: 606, b: 689, look: "storm", place: "sky", light: "day" },      // 16 s later, a second bolt
  { id: 9, a: 689, b: 773, look: "mcc", place: "mcc", light: "day" },        // screens fill with garbage
  { id: 10, a: 773, b: 871, look: "mcc", place: "mcc", light: "day" },       // everyone thinks: abort
  { id: 11, a: 871, b: 1001, look: "mcc", place: "mcc", light: "day" },      // a young engineer, John Aaron...
  { id: 12, a: 1001, b: 1087, look: "mcc", place: "mcc", light: "day" },     // "Try SCE to AUX"
  { id: 13, a: 1087, b: 1225, look: "mcc", place: "mcc", light: "day" },     // a year earlier, in a test (memory)
  { id: 14, a: 1225, b: 1339, look: "interior", place: "cabin", light: "day" }, // Bean finds the switch and flips it
  { id: 15, a: 1339, b: 1395, look: "mcc", place: "mcc", light: "day" },     // the screens come back to life
  { id: 16, a: 1395, b: 1471, look: "storm", place: "pad", light: "day" },   // nobody saw any lightning that morning
  { id: 17, a: 1471, b: 1658, look: "diagram", place: "diagram", light: "day" }, // the plume as a giant wire
  { id: 18, a: 1658, b: 1730, look: "storm", place: "sky", light: "day" },   // its own lightning rod
  { id: 19, a: 1730, b: TOTAL, look: "space", place: "moon", light: "golden" }, // five days later: the Moon
];
export const XFADE: Record<number, number> = { 13: 8, 14: 6, 17: 8, 19: 12 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state (pure functions of shot id + time) ----------------
/** strike envelope at time t: 1 at the strike, decaying over ~0.35 s with 2 re-strokes (lightning flickers) */
export const strikeK = (t: number, ts: number) => {
  const d = t - ts;
  if (d < 0 || d > 0.6) return 0;
  return Math.max(Math.exp(-d / 0.08), d > 0.12 ? 0.8 * Math.exp(-(d - 0.12) / 0.06) : 0, d > 0.27 ? 0.6 * Math.exp(-(d - 0.27) / 0.06) : 0);
};
export const strikeNow = (t: number) => Math.max(...STRIKES.map((s) => strikeK(t, s)));

/** the rocket: position of its base, tilt (rad, pitch over toward +x), engines on, plume length (m), on the pad or flying */
export type RocketState = { pos: V3; tilt: number; engines: number; plume: number; onPad: boolean };
export const rocketAt = (id: number, t: number): RocketState => {
  const s = SHOTS[id - 1];
  if (s.place === "pad") {
    if (id === 5) { const u = Math.max(0, t - W.liftoff - 0.1); return { pos: [0, 2.2 * u * u, 0], tilt: 0, engines: smooth((t - (W.liftoff - 0.5)) / 0.4), plume: 60 + 40 * u, onPad: u <= 0 }; }
    return { pos: [0, 0, 0], tilt: 0, engines: 0, plume: 0, onPad: true };
  }
  if (s.place === "sky") {
    // climbing through the cloud deck: altitude by mission time (T+36 s ~ 2 km in reality; compressed into the set)
    const climb = (alt: number, k: number) => ({ pos: [alt * 0.08, alt, 0] as V3, tilt: 0.05 + k, engines: 1, plume: 320, onPad: false });
    if (id === 1) return climb(1150 + 30 * t, 0.04);
    if (id === 2) return climb(1300 + 30 * (t - 5.2), 0.05);
    if (id === 6) return climb(1250 + 30 * (t - 14.9), 0.06);
    if (id === 8) return climb(1500 + 30 * (t - 20.2), 0.08);
    return climb(1400 + 30 * (t - 55.2), 0.06);
  }
  if (s.place === "diagram") return { pos: [DIAGRAM[0], 520, DIAGRAM[2]], tilt: 0, engines: 1, plume: 520, onPad: false };
  return { pos: [0, -9999, 0], tilt: 0, engines: 0, plume: 0, onPad: true }; // not in this set
};
/** cabin warning lights (0 off .. 1 all on, blinking), cabin power (1 normal .. 0.3 brown-out) */
export const cabinAt = (id: number, t: number) => {
  if (id === 7) { const on = smooth((t - (W.warning - 0.35)) / 0.12); return { warn: on, power: 1 - 0.55 * on }; }
  if (id === 14) { const fixed = smooth((t - (W.flips + 0.1)) / 0.3); return { warn: 1 - fixed, power: 0.45 + 0.55 * fixed }; }
  return { warn: 0, power: 1 };
};
/** the SCE switch position: 0 = NORM, 1 = AUX (flipped on "flips") */
export const switchAt = (id: number, t: number) => (id === 14 ? smooth((t - (W.flips - 0.05)) / 0.12) : 0);
/** Mission Control screens: 0 clean data .. 1 garbage; shot 15 snaps back to clean on "life" */
export const screensAt = (id: number, t: number) => {
  if (id === 9) return smooth((t - (W.mission + 0.5)) / 0.3); // fills with garbage as the line lands
  if (id >= 10 && id <= 13) return 1;
  if (id === 15) return 1 - smooth((t - (W.life - 0.6)) / 0.25);
  return 0;
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean; rp?: boolean; rl?: boolean };
const K = (f: number, pos: V3, look: V3, fov = 40, roll = 0, cut = false): Key => ({ f, pos, look, fov, roll, cut });
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const X = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, cut: true });
/** rocket-relative variants: pos and/or look are offsets from the rocket base at that frame */
const R = (k: Key, rp: boolean, rl: boolean): Key => ({ ...k, rp, rl });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Cb = at(CABIN), Mc = at(MCC), Dg = at(DIAGRAM), Mo = at(MOON);
// Camera plan (camera owner): a cut every ~1-1.7 s inside shots. Each beat = X(start) hard cut + P(end) linear creep (no
// static holds), rolls 3-5 deg; sky shots are rocket-relative (R) so the climbing rocket stays framed while clouds stream
// past. Strike beats: the bolt geometry is built from the camera at the strike frame (outdoor.ts: top = nose + 0.75 D up,
// 0.28 D sideways), so those beats look UP at the nose (nose low-centre, bolt top in the upper corner: fully in frame).
const S = (k: Key) => R(k, true, true);
const CAMS: Record<number, Key[]> = {
  // hook: climbing through the storm -> tight on the capsule -> STRUCK (f97) -> TWICE (f127)
  1: [S(X(0, [-34, 150, 48], [8, 72, 0], 50, 0.06)), S(P(45, [-30, 144, 44], [8, 74, 0], 48, 0.075)),
      S(X(45, [-14, 98, 21], [9.5, 106, 0], 34, -0.05)), S(P(88, [-12.5, 100.5, 18.5], [9.5, 106.5, 0], 32, -0.07)),
      S(X(88, [-60, 60, 150], [20, 140, 0], 55, 0.05)), S(P(112, [-56, 62, 143], [20, 141, 0], 54, 0.065)),
      S(X(112, [60, 40, 130], [-10, 140, 0], 55, -0.05)), S(P(157, [55, 44, 121], [-10, 142, 0], 52, -0.075))],
  // "the rocket made that lightning itself": the engines, then the whole rocket over its long plume
  2: [S(X(157, [-22, -12, 30], [2, 10, 0], 48, 0.06)), S(P(195, [-20, -10, 27], [2, 12, 0], 46, 0.08)),
      S(X(195, [40, 150, 62], [2, 40, 0], 50, -0.05)), S(P(233, [37, 146, 57], [2, 38, 0], 48, -0.07))],
  // rainy Florida: umbrellas on the causeway with the rocket behind them, then the wet pad from the ground
  3: [X(233, [-30.8, 3.0, 195], [0, 52, 0], 46, 0.04), P(270, [-30.2, 3.2, 193], [0, 54, 0], 45, 0.055),
      X(270, [-34, 2.2, 46], [0, 42, 0], 50, -0.05), P(308, [-32, 2.3, 43], [0, 46, 0], 49, -0.07)],
  // three astronauts on top: tilt up the stack, cut inside to the crew, then Conrad
  4: [X(308, [-36, 3.5, 58], [0, 28, 0], 44, 0.03), P(360, [-33, 4.5, 53], [0, 100, 0], 40, -0.04),
      X(360, Cb(1.85, 1.38, 0.1), Cb(0.1, 1.15, 0), 54, 0.04), P(388, Cb(1.78, 1.36, 0.06), Cb(0.1, 1.17, 0), 52, 0.055),
      X(388, Cb(1.78, 1.34, -1.02), Cb(0.1, 1.24, -0.75), 44, -0.04), P(415, Cb(1.72, 1.33, -1.0), Cb(0.1, 1.24, -0.75), 42, -0.06)],
  // liftoff: low by the flame trench, looking up at the engines
  5: [X(415, [-46, 2, 40], [0, 16, 0], 50, 0.05), P(447, [-44, 1.8, 38], [0, 21, 0], 48, 0.075)],
  // 36 s later: from under the climbing rocket, then the FLASH (f492)
  6: [S(X(447, [30, -60, 52], [5, 60, 0], 52, -0.05)), S(P(480, [28, -56, 48], [5, 62, 0], 50, -0.07)),
      S(X(480, [-40, 40, 150], [20, 140, 0], 56, 0.06)), S(P(524, [-37, 43, 142], [20, 141, 0], 54, 0.075))],
  // every warning light: over the crew to the panel, the blinking matrix, Conrad
  7: [X(524, Cb(-0.45, 1.65, -0.35), Cb(2, 1.45, 0.1), 58, 0.04), P(556, Cb(-0.5, 1.67, -0.33), Cb(2, 1.47, 0.12), 56, 0.06),
      X(556, Cb(1.0, 1.52, 0.3), Cb(1.86, 1.78, 0), 36, -0.05), P(582, Cb(1.06, 1.54, 0.27), Cb(1.86, 1.79, 0), 33, -0.07),
      X(582, Cb(1.8, 1.34, -0.36), Cb(0.1, 1.24, -0.75), 44, 0.05), P(606, Cb(1.74, 1.33, -0.38), Cb(0.1, 1.24, -0.75), 42, 0.07)],
  // a second bolt (f657): rain on the capsule, then the strike
  8: [S(X(606, [18, 70, 26], [6, 82, 0], 38, 0.05)), S(P(640, [17, 73, 24], [6, 84, 0], 36, 0.07)),
      S(X(640, [90, 30, 120], [0, 140, 0], 56, -0.06)), S(P(689, [84, 34, 112], [0, 141, 0], 54, -0.08))],
  // Mission Control: the room, garbage on a CRT, the controllers
  9: [X(689, Mc(-1.6, 2.7, -0.9), Mc(0.6, 1.4, -12), 52, 0.04), P(725, Mc(-1.5, 2.6, -1.3), Mc(0.6, 1.4, -12), 50, 0.06),
      X(725, Mc(-1.05, 1.48, -3.25), Mc(-1.05, 1.2, -4.85), 40, -0.05), P(750, Mc(-1.05, 1.47, -3.4), Mc(-1.05, 1.2, -4.85), 37, -0.07),
      X(750, Mc(-0.85, 1.9, -2.25), Mc(-0.3, 1.5, -3.88), 46, 0.05), P(773, Mc(-0.82, 1.88, -2.4), Mc(-0.3, 1.5, -3.88), 44, 0.07)],
  // "abort": the flight director, closer on "abort", the room
  10: [X(773, Mc(1.95, 2.3, 0.85), Mc(0.5, 1.45, 2.75), 44, -0.04), P(812, Mc(1.9, 2.26, 0.92), Mc(0.5, 1.46, 2.75), 42, -0.06),
       X(812, Mc(2.0, 1.65, 3.25), Mc(0.5, 1.56, 2.75), 42, 0.05), P(845, Mc(1.92, 1.64, 3.22), Mc(0.5, 1.56, 2.75), 39, 0.07),
       X(845, Mc(-2.4, 2.3, 0.7), Mc(0.2, 1.45, -3.9), 46, -0.04), P(871, Mc(-2.3, 2.25, 0.4), Mc(0.2, 1.45, -3.9), 44, -0.06)],
  // a young engineer, John Aaron (EECOM), and nobody else knows
  11: [X(871, Mc(1.55, 2.05, -1.55), Mc(1.2, 1.45, -3.88), 46, 0.04), P(915, Mc(1.52, 2.0, -1.75), Mc(1.2, 1.46, -3.88), 44, 0.06),
       X(915, Mc(2.15, 1.66, -2.65), Mc(1.2, 1.52, -3.88), 44, -0.05), P(958, Mc(2.1, 1.65, -2.69), Mc(1.2, 1.52, -3.88), 41, -0.07),
       X(958, Mc(3.6, 2.1, -2.0), Mc(-0.2, 1.25, -3.4), 46, 0.04), P(1001, Mc(3.5, 2.06, -2.1), Mc(-0.2, 1.26, -3.4), 44, 0.06)],
  // "Try SCE to AUX": Aaron close, then the '?' over every head
  12: [X(1001, Mc(0.3, 1.64, -2.3), Mc(1.2, 1.54, -3.88), 42, -0.05), P(1040, Mc(0.36, 1.63, -2.42), Mc(1.2, 1.54, -3.88), 40, -0.07),
       X(1040, Mc(-1.15, 2.4, -1.05), Mc(0.2, 1.72, -4.0), 56, 0.05), P(1087, Mc(-1.08, 2.36, -1.3), Mc(0.2, 1.72, -4.0), 54, 0.07)],
  // the memory: Aaron + thought bubble, the bubble's test screen, the puzzled room
  13: [X(1087, Mc(2.2, 1.95, -1.85), Mc(1.35, 1.95, -3.88), 46, 0.04), P(1135, Mc(2.12, 1.95, -2.0), Mc(1.35, 1.97, -3.88), 44, 0.06),
       X(1135, Mc(1.95, 2.25, -2.55), Mc(1.5, 2.3, -3.95), 40, -0.05), P(1180, Mc(1.9, 2.25, -2.7), Mc(1.5, 2.3, -3.95), 37, -0.07),
       X(1180, Mc(-0.7, 2.45, -1.3), Mc(1.05, 1.95, -4.0), 54, 0.04), P(1225, Mc(-0.6, 2.4, -1.5), Mc(1.05, 1.95, -4.0), 52, 0.06)],
  // Bean finds the switch and flips it: wide, Bean, the SCE switch (NORM -> AUX)
  14: [X(1225, Cb(0.55, 1.5, 1.24), Cb(1.3, 1.1, 0.4), 48, 0.04), P(1268, Cb(0.59, 1.49, 1.21), Cb(1.3, 1.1, 0.4), 46, 0.06),
       X(1268, Cb(1.78, 1.34, 0.4), Cb(0.1, 1.24, 0.75), 44, -0.05), P(1298, Cb(1.72, 1.33, 0.42), Cb(0.1, 1.24, 0.75), 42, -0.07),
       X(1298, Cb(0.85, 1.22, 0.52), Cb(1.25, 1.05, 0.45), 32, 0.05), P(1339, Cb(0.87, 1.21, 0.51), Cb(1.25, 1.05, 0.45), 30, 0.07)],
  // the screens come back to life: two CRTs, then the cheering room
  15: [X(1339, Mc(-1.05, 1.48, -3.25), Mc(-1.05, 1.2, -4.85), 38, 0.05), P(1366, Mc(-1.05, 1.47, -3.38), Mc(-1.05, 1.2, -4.85), 35, 0.07),
       X(1366, Mc(-1.6, 2.4, -0.6), Mc(0.2, 1.65, -4.0), 50, -0.04), P(1395, Mc(-1.5, 2.35, -0.85), Mc(0.2, 1.7, -4.0), 48, -0.06)],
  // nobody saw any lightning: umbrellas on the causeway, the rocket behind
  16: [X(1395, [8.6, 3.0, 198], [0, 40, 0], 44, 0.04), P(1432, [8.4, 3.2, 195.5], [0, 42, 0], 43, 0.055),
       X(1432, [8.3, 3.0, 188.5], [7.5, 4.0, 181.7], 40, -0.05), P(1471, [8.2, 3.05, 187.8], [7.5, 4.1, 181.7], 38, -0.07)],
  // the diagram: the system, the plume, the wire strike, down to the ground
  17: [X(1471, Dg(-260, 120, 430), Dg(0, 280, 0), 60, 0.03), P(1512, Dg(-248, 122, 410), Dg(0, 285, 0), 58, 0.045),
       X(1512, Dg(-150, 470, 250), Dg(0, 515, 0), 52, -0.04), P(1556, Dg(-142, 468, 238), Dg(0, 512, 0), 50, -0.06),
       X(1556, Dg(-330, 520, 520), Dg(-30, 640, 0), 52, 0.04), P(1612, Dg(-314, 518, 496), Dg(-30, 640, 0), 50, 0.055),
       X(1612, Dg(-190, 70, 290), Dg(10, 75, 0), 50, -0.05), P(1658, Dg(-180, 70, 275), Dg(10, 80, 0), 48, -0.07)],
  // its own lightning rod (f1702)
  18: [S(X(1658, [-10, 112, -22], [10, 106, 0], 36, 0.05)), S(P(1690, [-9, 111, -20], [10, 106, 0], 34, 0.07)),
       S(X(1690, [-20, 60, -150], [20, 140, 0], 58, 0.05)), S(P(1730, [-18, 63, -141], [20, 141, 0], 56, 0.07))],
  // five days later, the Moon
  19: [X(1730, Mo(-14, 1.2, 21), Mo(-3, 2.4, 3), 44, 0.04), P(1778, Mo(-13.2, 1.25, 19.8), Mo(-3, 2.4, 3), 43, 0.055),
       X(1778, Mo(-6.6, 1.35, 15.8), Mo(-4.6, 1.35, 8.5), 40, -0.04), P(1822, Mo(-6.5, 1.35, 15.2), Mo(-4.6, 1.38, 8.5), 38, -0.06),
       X(1822, Mo(-9.5, 0.6, 14.5), Mo(0, 3.4, 0), 46, 0.05), P(TOTAL, Mo(-9.0, 0.62, 13.8), Mo(0, 3.6, 0), 44, 0.07)],
};
/** damped impact kicks [frame, amplitude]: lightning strikes the camera sees + liftoff */
const KICKS: [number, number][] = [[97, 0.035], [128, 0.03], [418, 0.04], [492, 0.035], [657, 0.035], [1590, 0.02], [1702, 0.03]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const camAt = (id: number, f: number): Cam => {
  const ks = CAMS[id];
  let k0 = ks[0], k1 = ks[ks.length - 1];
  for (let i = 0; i < ks.length - 1; i++) if (f >= ks[i].f && (f < ks[i + 1].f || i === ks.length - 2)) { k0 = ks[i]; k1 = ks[i + 1]; break; }
  if (f < ks[0].f) k1 = k0;
  if (k1.cut) k1 = k0;
  const x = k1.f === k0.f ? 0 : clamp01((f - k0.f) / (k1.f - k0.f));
  const u = k1.lin ? x : glide(x);
  const rk = k0.rp || k0.rl || k1.rp || k1.rl ? rocketAt(id, f / FPS).pos : ([0, 0, 0] as V3);
  const P0 = k0.rp ? add(k0.pos, rk) : k0.pos, P1 = k1.rp ? add(k1.pos, rk) : k1.pos;
  const L0 = k0.rl ? add(k0.look, rk) : k0.look, L1 = k1.rl ? add(k1.look, rk) : k1.look;
  const m = (a: V3, b: V3) => a.map((v, i) => v + (b[i] - v) * u) as V3;
  const c: Cam = { pos: m(P0, P1), look: m(L0, L1), fov: k0.fov! + (k1.fov! - k0.fov!) * u, roll: k0.roll! + (k1.roll! - k0.roll!) * u };
  // smooth damped impact shakes (no per-frame sign flip)
  for (const [kf, a] of KICKS) {
    const d = f - kf;
    if (d >= 0 && d < 30) {
      const s = a * Math.sin((Math.PI * 2 * d) / 13) * Math.exp(-d / 6); // ~2 slow swings, damped, smooth frame to frame
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};
/** lens blur per beat: [first frame, cInf, focus point (default: the look target, i.e. the eyes)] */
const DOFK: [number, number, V3?][] = [
  [0, 3], [45, 6], [88, 0], [157, 5], [195, 0], [233, 5, [-28.7, 2.8, 182]], [270, 3], [308, 2], [360, 8], [388, 14],
  [415, 0], [447, 2], [480, 0], [524, 8], [556, 12], [582, 14], [606, 5], [640, 0],
  [689, 6], [725, 10], [750, 8], [773, 9], [812, 13], [845, 8], [871, 7], [915, 13], [958, 7], [1001, 14], [1040, 7],
  [1087, 9], [1135, 13], [1180, 6], [1225, 7], [1268, 14], [1298, 16], [1339, 12], [1366, 6],
  [1395, 5, [7.6, 2.8, 181.8]], [1432, 12], [1471, 0], [1512, 2], [1556, 0], [1612, 2], [1658, 5], [1690, 0],
  [1730, 3], [1778, 8], [1822, 5],
];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
