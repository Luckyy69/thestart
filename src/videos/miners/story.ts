// "The Note on the Drill" (Los 33, San José mine, Chile, 2010): shot plan timed to ~/miners-short/voice/words.json
// (66.7 s, voice "Liam"). World units metres, ground y = 0. PLACES (separate sets, far apart):
//   DESERT  (0,0,0)       Atacama desert surface: the mine mouth in a brown mountain at (0,0,-120), dirt roads, trucks,
//                         CAMP (Camp Hope: tents, Chilean flags, families) centred at CAMP, DRILL rig at DRILL, the rescue
//                         platform + winch tower over the rescue shaft at SHAFT (night scenes). Light: desert / dusk / night.
//   MINE    (4000,0,0)    underground: the spiral ramp tunnel (collapse) around MINE+(0,0,-30..0) and the REFUGE shelter
//                         room at REFUGE (a ~10 x 6 m rock room with benches, a cabinet of emergency food, lamps).
//   CUT     (0,0,-8000)   the cutaway diagram: a cross-section slice of the mountain, surface at y=0 down to y=-760, the
//                         megablock, the refuge at depth 700, probe holes (thin lines), the rescue shaft, Empire State
//                         silhouette and a car tire for scale.
export const FPS = 30;
export const TOTAL = 2060;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const DESERT: V3 = [0, 0, 0];
export const MINE_MOUTH: V3 = [0, 0, -120];
export const CAMP: V3 = [-140, 0, 60];
export const DRILL: V3 = [90, 0, -40];
export const SHAFT: V3 = [-60, 0, -40];
export const MINE: V3 = [4000, 0, 0];
export const REFUGE: V3 = [4000, 0, 40];
export const CUT: V3 = [0, 0, -8000];

/** word cues (s) */
export const W = {
  trapped: 0.96, underground: 2.18, seventeen: 3.55, dead: 5.77, august: 7.37, atacama: 9.39, deep: 11.27, collapses: 13.19,
  sealed: 15.73, block: 16.25, heavy: 17.41, empire: 17.91, shelter: 20.33, food: 21.8, two: 22.61, share: 24.16,
  spoonfuls: 25.24, tuna: 25.86, every: 26.66, surface: 28.62, families: 29.08, tents: 29.78, wait: 30.3, drills: 31.38,
  holes: 32.53, blind: 34.15, day: 35.61, nothing: 36.8, then: 37.95, day17: 38.92, drill: 40.04, back: 40.58, note: 41.22,
  taped: 41.52, red: 43.27, we: 44.3, fine: 44.76, the33: 46.65, why: 48.55, months: 49.68, because: 51.0, rescue: 51.49,
  hole: 51.85, wide: 52.93, tire: 53.57, engineers: 54.64, built: 55.12, capsule: 56.12, phoenix: 56.94, one1: 58.69,
  oneby: 59.93, rode: 61.61, light: 62.37, after: 63.39, days69: 64.28, home: 66.15,
};
export const FLASHES: number[] = [];

export type Look = "desert" | "dusk" | "night" | "mine" | "cut";
export type Place = "desert" | "mine" | "cut";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 96, look: "mine", place: "mine", light: "day" },        // trapped 700 m down: lamps in the dark refuge
  { id: 2, a: 96, b: 213, look: "dusk", place: "desert", light: "golden" }, // the world thought they were dead
  { id: 3, a: 213, b: 338, look: "desert", place: "desert", light: "day" }, // August 2010, Atacama
  { id: 4, a: 338, b: 442, look: "mine", place: "mine", light: "day" },     // deep inside, the mountain collapses
  { id: 5, a: 442, b: 593, look: "cut", place: "cut", light: "day" },       // sealed by a block twice the Empire State
  { id: 6, a: 593, b: 714, look: "mine", place: "mine", light: "day" },     // tiny shelter, food for two days
  { id: 7, a: 714, b: 846, look: "mine", place: "mine", light: "day" },     // two spoonfuls of tuna every other day
  { id: 8, a: 846, b: 941, look: "desert", place: "desert", light: "day" }, // families pitch tents and wait
  { id: 9, a: 941, b: 1068, look: "desert", place: "desert", light: "day" },// drills punch holes, searching blind (+cut)
  { id: 10, a: 1068, b: 1139, look: "dusk", place: "desert", light: "golden" }, // day after day, nothing
  { id: 11, a: 1139, b: 1290, look: "desert", place: "desert", light: "day" }, // day 17: the drill comes up with a note
  { id: 12, a: 1290, b: 1450, look: "desert", place: "desert", light: "day" }, // "Estamos bien..." + the cheer
  { id: 13, a: 1450, b: 1530, look: "cut", place: "cut", light: "day" },     // why two more months?
  { id: 14, a: 1530, b: 1632, look: "cut", place: "cut", light: "day" },     // a hole as wide as a car tire
  { id: 15, a: 1632, b: 1798, look: "night", place: "desert", light: "day" },// the Phoenix capsule
  { id: 16, a: 1798, b: 1902, look: "night", place: "desert", light: "day" },// one by one, up into the light
  { id: 17, a: 1902, b: TOTAL, look: "dusk", place: "desert", light: "golden" }, // 69 days: every one came home
];
export const XFADE: Record<number, number> = { 2: 8, 10: 10, 13: 8, 15: 10, 17: 12 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state (pure functions of shot id + time) ----------------
/** the collapse in shot 4: 0 before, rises to 1 over ~1.2 s from just before "collapses" (rocks falling, dust) */
export const collapseAt = (id: number, t: number) => (id === 4 ? smooth((t - (W.collapses - 0.6)) / 1.2) : id > 4 ? 1 : 0);
/** the megablock in the cutaway (shot 5): 0 = still part of the mountain .. 1 = dropped, sealing the ramp */
export const megablockAt = (id: number, t: number) => (id === 5 ? smooth((t - (W.sealed - 0.3)) / 0.9) : id > 5 ? 1 : 0);
/** Empire State comparison silhouette in the cutaway: 0..1 fade-in on "Empire" */
export const empireAt = (id: number, t: number) => (id === 5 ? smooth((t - (W.empire - 0.25)) / 0.35) : 0);
/** probe drills (shot 9 and the cutaway beat): number of probe lines drawn (grows), all missing the refuge */
export const probesAt = (id: number, t: number) => (id === 9 ? clamp01((t - W.drills) / 2.6) : id >= 10 && id <= 14 ? 1 : 0);
/** the drill rod coming up in shot 11: height of the rod tip above the ground (m) and whether the note is on it */
export const rodAt = (id: number, t: number) => (id === 11 ? { up: 6 * smooth((t - (W.drill - 0.4)) / 2.0), note: true } : id === 12 ? { up: 6, note: true } : { up: 0, note: false });
/** rescue shaft (cutaway shots 13-14): drawn 0..1 from the surface down to the refuge; tire comparison 0..1 */
export const shaftAt = (id: number, t: number) => (id === 13 ? smooth((t - (W.months - 0.3)) / 1.0) : id >= 14 ? 1 : 0);
export const tireAt = (id: number, t: number) => (id === 14 ? smooth((t - (W.tire - 0.35)) / 0.35) : 0);
/** the Fénix capsule: y of its base relative to the shaft top (negative = below ground), visible */
export const capsuleAt = (id: number, t: number) => {
  if (id === 15) return { y: 0.0, show: true };                                  // standing on the platform, presented
  if (id === 16) return { y: -6 + 6 * smooth((t - (W.rode - 0.8)) / 1.4), show: true }; // rising out of the shaft into the light
  return { y: 0, show: false };
};
/** the day counter (tally marks on the refuge wall) for shots 1, 6, 7 */
export const dayAt = (id: number, t: number) => (id === 7 ? Math.min(17, 2 + Math.floor((t - 23.8) * 4)) : id === 1 ? 17 : 1);

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const K = (f: number, pos: V3, look: V3, fov = 40, roll = 0, cut = false): Key => ({ f, pos, look, fov, roll, cut });
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const X = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, cut: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Mi = at(MINE), Rf = at(REFUGE), Ct = at(CUT), Cp = at(CAMP), Dr = at(DRILL), Sh = at(SHAFT);
// Camera plan (camera owner): every shot is a run of held set-ups joined by hard cuts (X keys), each hold creeping
// linearly (P keys) with a 3-5 deg roll; the DOF table below follows the set-ups (close 12-16, medium 6-10, wide 0).
// Seg = [start frame, pos, look, fov, roll, end pos, end look, end fov, end roll, dof cInf]; a seg ends where the next
// one starts (or at the shot end).
type Seg = [number, V3, V3, number, number, V3, V3, number, number, number];
const DOF_SEGS: [number, number][] = [];
const shot = (b: number, ...segs: Seg[]): Key[] => segs.flatMap((s, i) => {
  const end = i < segs.length - 1 ? segs[i + 1][0] : b;
  DOF_SEGS.push([s[0], s[9]]);
  return [(i ? X : K)(s[0], s[1], s[2], s[3], s[4]), P(end, s[5], s[6], s[7], s[8])];
});
const D = (x: number) => (x * Math.PI) / 180; // roll in degrees
const CAMS: Record<number, Key[]> = {
  // trapped 700 m down: a low close on the floor sleepers in the lamp light -> the refuge from the doorway
  1: shot(96,
    [0, Rf(1.3, 1.0, 2.0), Rf(1.0, 0.85, 0), 36, D(4), Rf(1.25, 0.98, 1.8), Rf(1.0, 0.85, 0), 35, D(5), 12],
    [40, Rf(2.8, 1.5, 5.4), Rf(-1.5, 1, -1.5), 46, D(-3), Rf(2.5, 1.45, 4.8), Rf(-1.5, 1, -1.5), 45, D(-4), 7]),
  // dusk vigil: families with candles + photos -> close on a mother's candle face on "dead"
  2: shot(213,
    [96, Cp(3, 1.25, 10), Cp(0.5, 1.4, 3.5), 40, D(3), Cp(2.6, 1.22, 9.3), Cp(0.4, 1.4, 3.5), 39, D(4), 8],
    [150, Cp(-2.6, 1.45, 7.4), Cp(-2.14, 1.55, 5.15), 30, D(-4), Cp(-2.55, 1.45, 7.1), Cp(-2.14, 1.55, 5.15), 29, D(-5), 14]),
  // August 2010, Atacama: low by the haul road -> high over the bench -> push into the dark portal
  3: shot(338,
    [213, [30, 2.5, -40], [0, 14, -120], 46, D(-3), [28, 2.4, -44], [0, 14, -120], 45, D(-4), 0],
    [262, [-34, 14, -66], [2, 6, -112], 40, D(4), [-31, 13, -70], [2, 6, -112], 39, D(5), 0],
    [300, [7, 3, -86], [0, 3.5, -113], 40, D(-3), [5.5, 2.9, -91], [0, 3.5, -113], 38, D(-4), 4]),
  // deep inside: close on three cheerful miners -> wide down the ramp as it collapses -> dusty shocked faces
  4: shot(442,
    [338, Mi(1.5, 1.5, 4.5), Mi(-0.3, 1.8, -14), 40, D(3), Mi(1.35, 1.5, 4.0), Mi(-0.3, 1.8, -14), 39, D(4), 9],
    [378, Mi(1.6, 1.7, 9), Mi(-0.6, 1.5, -12), 46, D(-3), Mi(1.4, 1.65, 8.2), Mi(-0.6, 1.5, -12), 45, D(-5), 0],
    [416, Mi(-1.5, 1.05, 4.6), Mi(0, 1.5, 0.8), 42, D(5), Mi(-1.4, 1.1, 4.3), Mi(0, 1.5, 0.8), 41, D(4), 10]),
  // cutaway: close on the megablock dropping -> wide diagram (block vs Empire State) -> punch in on the scale pair
  5: shot(593,
    [442, Ct(150, -180, 560), Ct(125, -215, 0), 38, D(3), Ct(140, -190, 500), Ct(125, -215, 0), 37, D(4), 0],
    [500, Ct(20, -360, 1250), Ct(20, -370, 0), 40, D(-2), Ct(35, -345, 1130), Ct(20, -370, 0), 40, D(-3), 0],
    [548, Ct(0, -300, 1000), Ct(-10, -310, 0), 40, D(3), Ct(10, -290, 930), Ct(-10, -310, 0), 40, D(4), 0]),
  // tiny shelter: the room toward the cabinet -> MS standing miners + cabinet on "food" -> high angle on "two days"
  6: shot(714,
    [593, Rf(1, 1.35, 2), Rf(-1, 1, -2.7), 46, D(-3), Rf(0.85, 1.32, 1.6), Rf(-1, 1, -2.7), 44, D(-4), 8],
    [640, Rf(0.5, 1.5, 0.9), Rf(-1.2, 1.45, -1.6), 36, D(4), Rf(0.42, 1.5, 0.72), Rf(-1.2, 1.45, -1.6), 35, D(5), 11],
    [678, Rf(2, 2.35, 2.4), Rf(-0.5, 0.4, -1), 50, D(-4), Rf(1.8, 2.3, 2.1), Rf(-0.5, 0.4, -1), 48, D(-5), 6]),
  // two spoonfuls: low close on the spoon man -> tighter with the spoons -> the tally wall growing
  7: shot(846,
    [714, Rf(0.9, 0.75, 1.5), Rf(0, 0.9, 0), 38, D(3), Rf(0.82, 0.76, 1.35), Rf(0, 0.9, 0), 37, D(4), 13],
    [750, Rf(0.75, 1.05, 1.6), Rf(0.05, 1.0, 0.05), 36, D(-4), Rf(0.7, 1.05, 1.45), Rf(0.05, 1.0, 0.05), 35, D(-5), 14],
    [800, Rf(1.6, 1.15, 1.6), Rf(2.9, 1.2, -3), 42, D(3), Rf(1.68, 1.15, 1.35), Rf(2.9, 1.2, -3), 41, D(4), 8]),
  // Camp Hope: crane over the tents -> eye-level MS of the waiting families
  8: shot(941,
    [846, Cp(16, 9, 24), Cp(-2, 1, -4), 44, D(-3), Cp(15, 7.6, 22.2), Cp(-2, 1, -4), 43, D(-4), 0],
    [885, Cp(1.2, 1.15, 9.4), Cp(0.8, 1.5, 5.5), 36, D(4), Cp(1.15, 1.15, 9.0), Cp(0.8, 1.5, 5.5), 35, D(5), 9]),
  // drills: low up the mast with the crew -> cutaway insert of the probes -> sweating faces, "searching blind"
  9: shot(1068,
    [941, Dr(7, 0.9, 9), Dr(0, 6, 0), 48, D(4), Dr(6.4, 0.9, 8.3), Dr(0, 6.5, 0), 47, D(5), 0],
    [985, Ct(-80, -380, 1150), Ct(-80, -380, 0), 40, D(-2), Ct(-80, -375, 1080), Ct(-80, -380, 0), 40, D(-3), 0],
    [1030, Dr(4.4, 1.55, 6.2), Dr(2.6, 1.75, 3.6), 34, D(-4), Dr(4.25, 1.55, 5.95), Dr(2.6, 1.75, 3.6), 33, D(-5), 12]),
  // day after day, nothing: low dusk MS of the vigil -> close on a candle face
  10: shot(1139,
    [1068, Cp(4.5, 0.7, 9.5), Cp(1, 1.6, 2.5), 40, D(3), Cp(4.3, 0.75, 9.0), Cp(1, 1.6, 2.5), 39, D(4), 8],
    [1104, Cp(5.6, 1.5, 7.5), Cp(4.43, 1.55, 5.39), 30, D(-4), Cp(5.5, 1.5, 7.25), Cp(4.43, 1.55, 5.39), 29, D(-5), 14]),
  // day 17: crew waiting at the hole -> low on the rod coming up -> close on the taped bag
  11: shot(1290,
    [1139, Dr(3.6, 1.0, 6.0), Dr(0.3, 1.6, 1.2), 40, D(-3), Dr(3.4, 1.0, 5.6), Dr(0.3, 1.6, 1.2), 39, D(-4), 9],
    [1190, Dr(2.8, 0.55, 1.6), Dr(0, 1.3, 0), 42, D(4), Dr(2.65, 0.55, 1.5), Dr(0, 1.45, 0), 41, D(5), 10],
    [1235, Dr(1.4, 1.5, 0.7), Dr(0, 1.4, 0), 30, D(-4), Dr(1.3, 1.5, 0.62), Dr(0, 1.4, 0), 29, D(-5), 13]),
  // the note: readable close -> tighter on the red text -> the crew cheering "the thirty-three"
  12: shot(1450,
    [1290, Dr(1.6, 1.3, 2.8), Dr(0.5, 1.25, 0.95), 30, D(3), Dr(1.52, 1.3, 2.65), Dr(0.5, 1.25, 0.95), 29, D(3), 12],
    [1340, Dr(1.33, 1.28, 2.36), Dr(0.45, 1.27, 0.88), 30, D(-3), Dr(1.29, 1.28, 2.29), Dr(0.45, 1.27, 0.88), 29, D(-4), 14],
    [1385, Dr(3.2, 1.2, 4.6), Dr(0.2, 1.5, 0.3), 40, D(4), Dr(3.0, 1.2, 4.3), Dr(0.2, 1.55, 0.3), 39, D(5), 8]),
  // why two more months: the diagram -> closer on the shaft being drawn
  13: shot(1530,
    [1450, Ct(-40, -360, 1200), Ct(-40, -370, 0), 40, D(-2), Ct(-40, -355, 1130), Ct(-40, -370, 0), 40, D(-3), 0],
    [1490, Ct(-60, -200, 620), Ct(-60, -220, 0), 40, D(3), Ct(-60, -200, 570), Ct(-60, -220, 0), 40, D(4), 0]),
  // a hole as wide as a car tire
  14: shot(1632,
    [1530, Ct(-50, -30, 260), Ct(-56, -40, 0), 36, D(3), Ct(-52, -28, 235), Ct(-56, -40, 0), 36, D(4), 0],
    [1580, Ct(-56, -6, 160), Ct(-56, -12, 0), 34, D(-3), Ct(-56, -6, 142), Ct(-56, -12, 0), 34, D(-4), 0]),
  // night: engineers around the Phoenix -> low hero up the capsule -> wide platform with the crowd
  15: shot(1798,
    [1632, Sh(4.5, 1.0, 6.5), Sh(0, 2.0, 0), 42, D(3), Sh(4.2, 1.0, 6.0), Sh(0, 2.0, 0), 41, D(4), 8],
    [1680, Sh(1.6, 0.5, 2.4), Sh(0, 2.6, 0), 46, D(-4), Sh(1.5, 0.5, 2.25), Sh(0, 2.8, 0), 45, D(-5), 9],
    [1725, Sh(9, 5, 9), Sh(-3, 1.5, -4), 44, D(3), Sh(8.4, 4.6, 8.4), Sh(-3, 1.5, -4), 43, D(4), 0]),
  // one by one: the crowd waiting -> the capsule rising -> the miner stepping out into the light
  16: shot(1902,
    [1798, Sh(-2, 1.4, -3), Sh(-9, 1.6, -12), 40, D(-3), Sh(-2.2, 1.4, -3.3), Sh(-9, 1.6, -12), 39, D(-4), 8],
    [1840, Sh(2.2, 0.6, 3.0), Sh(0, 1.8, 0), 44, D(4), Sh(2.1, 0.6, 2.85), Sh(0, 2.2, 0), 43, D(5), 9],
    [1870, Sh(1.7, 1.45, 2.6), Sh(0.4, 1.4, 0.55), 36, D(-4), Sh(1.65, 1.45, 2.45), Sh(0.4, 1.4, 0.55), 35, D(-5), 13]),
  // 69 days, every one came home: hug MS -> close hug -> crane up over the camp
  17: shot(TOTAL,
    [1902, Cp(1.2, 1.45, 9.4), Cp(0.3, 1.45, 6.4), 32, D(3), Cp(1.15, 1.45, 9.0), Cp(0.3, 1.45, 6.4), 31, D(4), 12],
    [1950, Cp(3.4, 1.4, 6.9), Cp(2.6, 1.45, 4.2), 32, D(-4), Cp(3.35, 1.4, 6.65), Cp(2.6, 1.45, 4.2), 31, D(-5), 8],
    [2000, Cp(5, 2.2, 13), Cp(0, 1.5, 2), 42, D(3), Cp(9, 7, 21), Cp(0, 1.5, 2), 46, D(5), 0]),
};
/** impacts: [frame, amplitude] -> a smooth damped shake (period 0.3 s, settles in ~0.6 s) */
const KICKS: [number, number][] = [[384, 0.012], [396, 0.03], [404, 0.018], [416, 0.016], [487, 0.008], [1400, 0.006], [1866, 0.006]];

export const camAt = (id: number, f: number): Cam => {
  const ks = CAMS[id];
  let k0 = ks[0], k1 = ks[ks.length - 1];
  for (let i = 0; i < ks.length - 1; i++) if (f >= ks[i].f && (f < ks[i + 1].f || i === ks.length - 2)) { k0 = ks[i]; k1 = ks[i + 1]; break; }
  if (f < ks[0].f) k1 = k0;
  if (k1.cut) k1 = k0;
  const x = k1.f === k0.f ? 0 : clamp01((f - k0.f) / (k1.f - k0.f));
  const u = k1.lin ? x : glide(x);
  const m = (a: V3, b: V3) => a.map((v, i) => v + (b[i] - v) * u) as V3;
  const c: Cam = { pos: m(k0.pos, k1.pos), look: m(k0.look, k1.look), fov: k0.fov! + (k1.fov! - k0.fov!) * u, roll: k0.roll! + (k1.roll! - k0.roll!) * u };
  for (const [kf, a] of KICKS) {
    const d = f - kf;
    if (d >= 0 && d < 24) {
      const s = a * Math.sin((2 * Math.PI * d) / 9) * Math.exp(-d / 6) * smooth(d / 2 + 0.5);
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};
const DOFK: [number, number, V3?][] = DOF_SEGS.slice().sort((p, q) => p[0] - q[0]);
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
void X;
