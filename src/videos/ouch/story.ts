// "Why We Say Ow": a funny science short timed to ~/ouch-short/voice/words.json (64.5 s, voice "Liam").
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist. 2 CAMERA very few cuts: travel,
// LAND, then the important word is said while the camera is still. 3 LIGHT low sun, long shadows, blue shade, haze; the
// light changes when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 6 "Swearing.").
// World units metres. PLACES (separate sets, far apart):
//   HOME  (0,0,0)       a cosy hallway at early-morning golden hour: wooden floor, rug, a side table with a sharp leg
//                       at HOME+(0.35,0,0) (BEAN stubs his right toe on it), coat hooks, framed pictures, a window throwing
//                       long low sun stripes; floor y=0, walls at z=-1.2 (back) and x=+-3; the camera side (+z) is open.
//   GLOBE (3000,0,0)    a TINY PLANET (radius 6, centre GLOBE+(0,-6,0)): little houses + landmarks for four countries
//                       (USA/UK, France, Spain, Denmark) at the four quarters, each with a person who stubs a toe; low sun
//                       raking across the terminator, long shadows, haze rim.
//   LAB   (-3000,0,0)   a university pain lab: two ice-water tubs (TUB_A at LAB+(-0.7,0,0), TUB_B at LAB+(0.7,0,0)), a big
//                       wall stopwatch/score screen, a lab bench, a scientist; cool blue clinical light that TURNS red/
//                       dramatic for "something even stronger" and the swearing beats.
export const FPS = 30;
export const TOTAL = 1995;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const HOME: V3 = [0, 0, 0];
export const GLOBE: V3 = [3000, 0, 0];
export const LAB: V3 = [-3000, 0, 0];
export const TUB_A: V3 = [LAB[0] - 0.7, 0, LAB[2]];
export const TUB_B: V3 = [LAB[0] + 0.7, 0, LAB[2]];

/** word cues (s) */
export const W = {
  ever: 0.0, toe0: 0.61, ow0: 1.22, knew: 2.69, happened: 3.03, brain0: 4.37, fast: 4.78, dramatic: 7.19, pain: 8.52,
  signal: 8.81, races: 9.16, toe: 9.86, brain: 10.39, split: 10.87, mouth: 12.31, think: 13.73, weird: 15.24,
  part: 15.5, owA: 16.78, less: 18.54, english: 19.82, ow1: 20.53, french: 21.69, aie: 22.22, spanish: 23.64, ay: 24.29,
  danish: 25.52, av: 26.12, checked: 28.1, languages: 29.41, share: 31.58, ah: 32.3, sound: 32.65, singapore: 34.45,
  mean: 35.61, hold: 37.33, ice: 38.06, could: 39.18, said: 40.87, ow2: 41.11, twenty: 42.24, longer: 42.88,
  hearing: 43.84, ow3: 45.05, didnt: 46.22, help: 46.52, yourself: 47.95, another: 49.26, stronger: 50.63,
  swearing: 51.67, swore: 53.29, third: 54.22, longer2: 54.48, madeup: 55.58, words: 56.27, didnt2: 57.4, work: 57.69,
  allday: 59.6, less2: 61.17, boost: 61.57, save: 62.33, swearwords: 62.75, toes: 64.04,
};
export const FLASHES: number[] = [];

export type Look = "morning" | "xray" | "planet" | "lab" | "drama" | "peak";
export type Place = "home" | "globe" | "lab";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 250, look: "morning", place: "home", light: "golden" }, // HOOK "Ever hit your toe and yelled OW!": BEAN shuffles in with a coffee, STUBS (hit 0.55 s) + his own "OW!" (1.22); hops, coffee splash; "Your brain is fast" (4.8); "a little dramatic" (7.19): theatrical over-the-top faint pose
  { id: 2, a: 250, b: 590, look: "xray", place: "home", light: "day" },     // X-RAY: the world freezes mid-faint; a glowing pain signal races from the toe up the leg/spine to the brain (9.15-10.9); the brain flashes; mouth opens "before you can think" (13.73); "here's the weird part" (15.5): that "ow" (16.78) makes it hurt less (18.54)
  { id: 3, a: 590, b: 1000, look: "planet", place: "globe", light: "golden" },// TINY PLANET: travel around it; four people stub toes on their words: "ow" 15.04 (UK/US), "aie" 16.56 (France), "ay" 18.26 (Spain), "av" 19.85 (Denmark); pull back: bubbles everywhere (131 languages), a big "AH" sound wave (26.07)
  { id: 4, a: 1000, b: 1460, look: "lab", place: "lab", light: "day" },      // LAB (Singapore): a scientist rubs hands ("mean" 29.58); volunteers plunge hands in ice (31.84): shivering; the "OW" volunteer lasts longer: score bars (+20% on 37.17); the headphones volunteer hears "ow" -> no help (40.94); "say it yourself" (42.49)
  { id: 5, a: 1460, b: 1545, look: "drama", place: "lab", light: "day" },   // TURN: lights drop to dramatic red spot; a new scientist steps in ("something even stronger" 45.2)
  { id: 6, a: 1545, b: 1660, look: "peak", place: "lab", light: "day" },    // PEAK: "Swearing." (46.97): THE MEME FACE (only here): the volunteer screams with a black CENSOR BAR + grawlix "#@$%!" + BEEP; "a third longer" bar shoots up (49.71)
  { id: 7, a: 1660, b: 1865, look: "lab", place: "lab", light: "day" },     // "Made-up swear words?": a volunteer yells "FOUCH!" -> bubble fizzles, the bar doesn't move ("Didn't work." 51.85); a grumpy sailor-type who swears all day: tiny bar ("less of a boost" 55.15)
  { id: 8, a: 1865, b: 1995, look: "morning", place: "home", light: "golden" },// CALLBACK: BEAN again with coffee, stubs the same toe, inhales... "for your toes." (60.50): censor bar + BEEP pops over his mouth; hold
];
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 8: 8 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] (world.ts blends the light rig) */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [
  ["morning", "xray", 247, 265, "home"], ["lab", "drama", 1456, 1480, "lab"], ["drama", "peak", 1539, 1549, "lab"],
];
export const shotAt = (f: number) => { for (const s of SHOTS) if (f >= s.a && f < s.b) return s; return SHOTS[SHOTS.length - 1]; };
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const shotStart = (id: number) => SHOTS[id - 1].a / FPS;

// ---------------- story state (pure functions of id, t) ----------------
/** BEAN's toe stub (shots 1 + 8): walk -> hit -> hop. hit = time of impact */
export const STUB1 = 0.55, STUB8 = 63.3;
export const stubAt = (id: number, t: number) => {
  const hit = id === 1 ? STUB1 : id === 8 ? STUB8 : -99;
  if (hit < 0) return { x: 0, walking: 0, hit: 0, hopping: 0, since: -1 };
  const walkX = id === 1 ? -0.7 + 0.7 * smooth((t + 0.3) / (hit + 0.3)) : -1.2 + 1.2 * smooth((t - (hit - 1.6)) / 1.6);
  return { x: walkX, walking: t < hit ? 1 : 0, hit: t >= hit ? 1 : 0, hopping: id === 1 && t >= hit ? 1 : 0, since: t - hit };
};
/** X-ray pain signal (shot 2): 0 at the toe -> 1 at the brain */
export const signalAt = (id: number, t: number) => (id === 2 ? { show: smooth((t - (W.pain - 0.3)) / 0.4), p: smooth((t - W.races) / (W.split + 0.4 - W.races)), brain: smooth((t - (W.split + 0.35)) / 0.25), mouth: smooth((t - (W.mouth - 0.1)) / 0.3) } : { show: 0, p: 0, brain: 0, mouth: 0 });
/** tiny planet (shot 3): which country speaks (stub + bubble) */
export const COUNTRIES: { key: string; word: string; t: number; lon: number }[] = [
  { key: "uk", word: "OW!", t: W.ow1, lon: 0 }, { key: "fr", word: "AÏE!", t: W.aie, lon: 90 },
  { key: "es", word: "¡AY!", t: W.ay, lon: 180 }, { key: "dk", word: "AV!", t: W.av, lon: 270 },
];
export const planetAt = (id: number, t: number) => (id === 3 ? { many: smooth((t - (W.checked - 0.3)) / 1.2), ah: smooth((t - (W.ah - 0.1)) / 0.4) } : { many: 0, ah: 0 });
/** lab (shots 4-7): hands in ice, score bars (0..1 heights), who is speaking */
export const labAt = (id: number, t: number) => {
  const inIce = id === 4 ? smooth((t - (W.ice - 0.25)) / 0.3) : id >= 5 ? 1 : 0;
  return {
    inIce,
    barBase: id === 4 ? smooth((t - (W.could + 0.3)) / 0.6) : id >= 5 ? 1 : 0,              // the silent volunteer's time
    barOw: id === 4 ? smooth((t - (W.twenty - 0.2)) / 0.8) * 1.2 : id >= 5 ? 1.2 : 0,      // +20 %
    barHear: id === 4 ? smooth((t - (W.didnt - 0.2)) / 0.6) : id >= 5 ? 1 : 0,              // hearing "ow": no gain
    barSwear: id === 6 ? smooth((t - (W.third - 0.3)) / 0.8) * 1.33 : id >= 7 ? 1.33 : 0,  // +33 %
    barFake: id === 7 ? smooth((t - (W.didnt2 - 0.2)) / 0.6) : 0,                           // made-up words: no gain
    barSailor: id === 7 ? smooth((t - (W.less2 - 0.3)) / 0.6) * 1.08 : 0,                   // swears all day: small gain
    drama: id === 5 ? smooth((t - shotStart(5)) / 0.8) : id === 6 ? 1 : 0,
  };
};
/** censor bar + BEEP events: [t, who] */
export const BEEPS: [number, string][] = [[W.swearing + 0.05, "swearer"], [W.swore + 0.1, "swearer"], [STUB8 + 0.15, "bean"]];

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ho = at(HOME), Gl = at(GLOBE), La = at(LAB);
// CAMERA (cam owner). Each shot = a few waypoints [frame, pos, look, fov, roll?]: TRAVEL between them with glide(), then
// HOLD still (two waypoints with the same values) through the important word. Tiny drift only while travelling.
type WP = [number, V3, V3, number, number?];
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const shot = (id: number, ws: WP[]): Key[] => {
  const { a, b } = SHOTS[id - 1], out: Key[] = [];
  const fn = (f: number) => {
    let i = 0;
    while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
    const A = ws[i], B = ws[Math.min(i + 1, ws.length - 1)];
    const u = B[0] === A[0] ? 0 : glide((f - A[0]) / (B[0] - A[0]));
    return P(f, lerp3(A[1], B[1], u), lerp3(A[2], B[2], u), A[3] + (B[3] - A[3]) * u, (A[4] ?? 0) + ((B[4] ?? 0) - (A[4] ?? 0)) * u);
  };
  for (let f = a; ; f += 2) { const g = Math.min(f, b); out.push(fn(g)); if (g >= b) break; }
  return out;
};
// first-pass framing (the cam owner rewrites this)
const CAMS: Record<number, Key[]> = {
  1: shot(1, [[0, Ho(-1.6, 1.3, 3.2), Ho(-0.2, 0.9, 0), 40], [40, Ho(-0.4, 1.2, 2.6), Ho(0.3, 0.9, 0), 36], [250, Ho(-0.3, 1.25, 2.4), Ho(0.3, 0.95, 0), 34]]),
  2: shot(2, [[250, Ho(0.9, 0.5, 1.8), Ho(0.35, 0.2, 0), 38], [480, Ho(0.6, 1.6, 2.0), Ho(0.3, 1.4, 0), 36], [590, Ho(0.5, 1.6, 1.8), Ho(0.3, 1.45, 0), 34]]),
  3: shot(3, [[590, Gl(0, 2, 16), Gl(0, -1, 0), 40], [760, Gl(10, 4, 10), Gl(0, -1, 0), 40], [900, Gl(0, 10, 18), Gl(0, -2, 0), 42], [1000, Gl(0, 10, 20), Gl(0, -2, 0), 42]]),
  4: shot(4, [[1000, La(0, 1.6, 5), La(0, 1.0, 0), 40], [1180, La(0, 1.4, 3.6), La(0, 1.0, 0), 38], [1460, La(0, 1.4, 3.4), La(0, 1.0, 0), 38]]),
  5: shot(5, [[1460, La(0, 1.4, 3.4), La(0, 1.1, 0), 38], [1545, La(0.6, 1.4, 2.6), La(0.7, 1.2, 0), 34]]),
  6: shot(6, [[1545, La(0.7, 1.35, 2.2), La(0.7, 1.25, 0), 32], [1660, La(0.7, 1.35, 2.2), La(0.7, 1.25, 0), 32]]),
  7: shot(7, [[1660, La(0, 1.5, 3.8), La(0, 1.0, 0), 40], [1865, La(0, 1.5, 3.6), La(0, 1.0, 0), 40]]),
  8: shot(8, [[1865, Ho(-0.4, 1.2, 2.6), Ho(0.3, 0.9, 0), 36], [1995, Ho(-0.3, 1.25, 2.3), Ho(0.3, 0.95, 0), 33]]),
};
const KICKS: [number, number][] = [];
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
    if (d >= 0 && d < 10) {
      const s = a * Math.sin(Math.PI * d * 0.9) * Math.exp(-d / 3);
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};
// mild lens blur only (the user: backgrounds must NOT be blurry): [frame, cInf, focus?]
const DOFK: [number, number, V3?][] = [[0, 1], [250, 1], [590, 0], [1000, 1], [1460, 1], [1545, 1.2], [1660, 1], [1865, 1]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
