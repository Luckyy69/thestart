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
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 6, 6: 6, 7: 8, 8: 8 }; // dissolves (cam owner): 3 brain->planet push, 4 whip down, 5/6 face-change softeners (camera continuous), 7 + 8 whip-pans
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
// CAMERA (cam owner). Each shot = waypoints [frame, pos, look, fov, opts]: TRAVEL between them (glide by default), then
// HOLD still (two waypoints with the same values) through the important word. Waypoints may lie outside the shot's
// [a, b] so the camera keeps moving through the XFADE dissolves. Transitions:
//   1->2 one continuous camera (no cut; the world freezes)      2->3 push INTO the glowing brain (fov 36->11), out of the
//   3->4 whip-pan DOWN off the planet into the lab                   "brain-ball" = the planet (fov 15->30), match move
//   4->5, 5->6 continuous camera + soft dissolve                     6->7 whip-pan right, 7->8 whip-pan right home
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Ease = "io" | "in" | "out";
type WP = [number, V3, V3, number, { ease?: Ease; roll?: number }?];
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ho = at(HOME), La = at(LAB);
// tiny planet (same maths as globe.ts: centre GLOBE+(0,-6,0), radius 6, lon 0 = +z, lon 90 = +x)
const PC: V3 = [GLOBE[0], GLOBE[1] - 6, GLOBE[2]];
const sph = (lon: number, lat: number, r: number): V3 => {
  const a = (lon * Math.PI) / 180, b = (lat * Math.PI) / 180;
  return [PC[0] + Math.cos(b) * Math.sin(a) * r, PC[1] + Math.sin(b) * r, PC[2] + Math.cos(b) * Math.cos(a) * r];
};
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ease = (e: Ease | undefined, x: number) => { const u = clamp01(x); return e === "in" ? u * u * u : e === "out" ? 1 - (1 - u) ** 3 : glide(u); };
const path = (ws: WP[]) => (f: number): Cam => {
  if (f <= ws[0][0]) return { pos: ws[0][1], look: ws[0][2], fov: ws[0][3], roll: ws[0][4]?.roll ?? 0 };
  let i = 0;
  while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
  const A = ws[i], B = ws[i + 1], u = ease(B[4]?.ease, (f - A[0]) / (B[0] - A[0]));
  return { pos: lerp3(A[1], B[1], u), look: lerp3(A[2], B[2], u), fov: A[3] + (B[3] - A[3]) * u, roll: (A[4]?.roll ?? 0) + ((B[4]?.roll ?? 0) - (A[4]?.roll ?? 0)) * u };
};
/** planet waypoints in orbit coordinates: camera at (lon, lat, dist from the planet centre), pos lerped on the sphere */
type OW = [number, number, number, number, V3, number, { ease?: Ease }?];
const orbit = (ws: OW[]) => (f: number): Cam => {
  let i = 0;
  while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
  const A = ws[i], B = ws[Math.min(i + 1, ws.length - 1)], u = f <= A[0] ? 0 : ease(B[6]?.ease, (f - A[0]) / (B[0] - A[0]));
  const m = (j: 1 | 2 | 3 | 5) => A[j] + (B[j] - A[j]) * u;
  const arc = A[1] !== B[1] && A[3] === B[3] ? Math.sin(Math.PI * u) : 0; // country hops lift up and over the clouds
  return { pos: sph(m(1), m(2) + 6 * arc, m(3) + 3 * arc), look: lerp3(A[4], B[4], u), fov: m(5) + 6 * arc, roll: 0 };
};
/** a planet person's close-up: globe.ts countryCam(lon, 28, 13) position, aimed a little below the person so they sit high */
const cLook = (lon: number) => sph(lon, 42.5, 6.6);
const cOW = (f: number, lon: number, o?: { ease?: Ease }): OW => [f, lon, 28, 13, cLook(lon), 22, o];
const FULL_LOOK: V3 = [GLOBE[0], GLOBE[1] - 7.4, GLOBE[2]]; // full planet: pos (3008,4,28) = lon 15.9, lat 19, dist 30.8
const FULL_LON = 360 + (Math.atan2(8, 28) * 180) / Math.PI, FULL_LAT = (Math.asin(10 / Math.hypot(8, 10, 28)) * 180) / Math.PI, FULL_D = Math.hypot(8, 10, 28);

// framings (reused so holds and continuous cuts match exactly)
const H_WALK: [V3, V3] = [Ho(-0.85, 1.2, 3.7), Ho(-0.45, 0.92, 0)];
const H_FULL: [V3, V3] = [Ho(0.12, 1.05, 4.2), Ho(0.1, 0.86, 0)];      // BEAN head-to-toe + the table leg
const H_FAST: [V3, V3] = [Ho(0.02, 1.2, 3.4), Ho(0.0, 0.98, 0)];
const H_FAINT: [V3, V3] = [Ho(-0.12, 1.08, 4.15), Ho(0.0, 0.88, 0)];
const X_PATH: [V3, V3] = [Ho(0.6, 1.25, 4.25), Ho(-0.05, 1.0, 0)];      // x-ray: whole body, toe -> brain path
const X_HEAD: [V3, V3] = [Ho(0.15, 1.45, 2.85), Ho(-0.12, 1.2, 0)];
const X_OW: [V3, V3] = [Ho(-0.6, 1.25, 4.15), Ho(-0.05, 1.0, 0)];
const X_LESS: [V3, V3] = [Ho(-0.35, 1.45, 2.95), Ho(-0.14, 1.2, 0)];
const BRAIN: V3 = Ho(-0.32, 1.47, 0.07); // props brainPos(2, t) at the end of shot 2
const BRAIN_IN: V3 = lerp3(BRAIN, X_LESS[0], 0.66 / Math.hypot(X_LESS[0][0] - BRAIN[0], X_LESS[0][1] - BRAIN[1], X_LESS[0][2] - BRAIN[2]));
const L_WIDE: [V3, V3] = [La(0, 2.05, 5.2), La(0, 1.4, -0.6)];
const L_SCI: [V3, V3] = [La(0.05, 1.5, 1.85), La(0, 1.22, -0.75)];
const L_ICE: [V3, V3] = [La(0, 1.9, 4.5), La(0, 1.0, -0.3)];
const L_VOLA: [V3, V3] = [La(-0.72, 1.45, 1.95), La(-0.82, 1.2, -0.34)];
const L_VOLB: [V3, V3] = [La(0.72, 1.45, 1.95), La(0.82, 1.2, -0.34)];
const L_SCREEN: [V3, V3] = [La(0, 2.6, 3.75), La(0, 1.82, -1.575)];
const L_YOU: [V3, V3] = [La(-0.5, 1.45, 3.0), La(-0.5, 1.15, -0.5)];
const L_STRONG: [V3, V3] = [La(2.3, 1.5, 2.0), La(0.98, 1.2, -0.62)];
const L_MEME: [V3, V3] = [La(0.8, 1.42, 1.72), La(0.85, 1.24, -0.31)];
const L_FOUCH: [V3, V3] = [La(-0.55, 1.5, 2.05), La(-0.68, 1.27, -0.34)];
const L_FAKE: [V3, V3] = [La(-0.35, 1.9, 3.3), La(-0.4, 1.5, -1.0)];
const H_END: [V3, V3] = [Ho(0.1, 1.08, 3.85), Ho(0.1, 0.9, 0)];
const H_IN: [V3, V3] = [Ho(-0.55, 1.12, 3.9), Ho(-0.6, 0.9, 0)];
const hold = (f0: number, f1: number, F: [V3, V3], fov: number, o?: { ease?: Ease }): WP[] => [[f0, F[0], F[1], fov, o], [f1, F[0], F[1], fov]];

const CAMS: Record<number, (f: number) => Cam> = {
  1: path([[0, ...H_WALK, 40], ...hold(30, 100, H_FULL, 40), ...hold(136, 180, H_FAST, 40), ...hold(208, 250, H_FAINT, 40)]),
  2: path([...hold(250, 262, H_FAINT, 40), ...hold(296, 336, X_PATH, 40), ...hold(380, 455, X_HEAD, 36), ...hold(490, 514, X_OW, 40),
    ...hold(546, 562, X_LESS, 36), [574, lerp3(X_LESS[0], BRAIN_IN, 0.12), BRAIN, 33], [594, BRAIN_IN, BRAIN, 9, { ease: "in" }]]),
  3: orbit([[586, 0, 38, 37, PC, 22], [592, 0, 37, 31, PC, 23, { ease: "out" }], cOW(611, 0), cOW(624, 0), cOW(656, 90), cOW(676, 90), cOW(718, 180), cOW(738, 180),
    cOW(772, 270), cOW(800, 270), [872, FULL_LON, FULL_LAT, FULL_D, FULL_LOOK, 46], [1004, FULL_LON, FULL_LAT, FULL_D, FULL_LOOK, 46]]),
  4: path([...hold(1000, 1018, L_WIDE, 44), ...hold(1058, 1088, L_SCI, 40), ...hold(1132, 1180, L_ICE, 46), ...hold(1222, 1242, L_VOLA, 38),
    ...hold(1278, 1302, L_SCREEN, 44), ...hold(1340, 1404, L_VOLB, 38), ...hold(1432, 1460, L_YOU, 40)]),
  5: path([...hold(1460, 1470, L_YOU, 40), ...hold(1508, 1524, L_STRONG, 40), ...hold(1542, 1545, L_MEME, 38)]),
  6: path([...hold(1542, 1588, L_MEME, 38), ...hold(1620, 1660, L_SCREEN, 44)]),
  7: path([...hold(1660, 1700, L_FOUCH, 38), ...hold(1724, 1766, L_FAKE, 40), ...hold(1800, 1865, L_VOLB, 38)]),
  8: path([[1865, ...H_IN, 40], ...hold(1897, 1995, H_END, 40)]),
};
/** whip-pans: [boundary frame (= incoming shot's a), axis, degrees, roll]. The outgoing camera accelerates into the turn over
 *  [B-6, B+4], the incoming one arrives already turning over [B-4, B+6] and settles; XFADE blends the two. */
const WHIPS: [number, "yaw" | "pitch", number, number][] = [[1000, "pitch", -62, 0.06], [1660, "yaw", -75, 0.1], [1865, "yaw", -80, -0.1]];
const whipOffset = (id: number, f: number): { yaw: number; pitch: number; roll: number } => {
  const o = { yaw: 0, pitch: 0, roll: 0 };
  for (const [B, axis, deg, rl] of WHIPS) {
    const inc = SHOTS.find((s) => s.a === B)!.id;
    let k = 0;
    if (id === inc - 1 && f > B - 6) k = clamp01((f - (B - 6)) / 10) ** 2.4;           // outgoing: 0 -> 1
    else if (id === inc && f < B + 6) k = -((1 - clamp01((f - (B - 4)) / 10)) ** 2.4);  // incoming: -1 -> 0
    if (!k) continue;
    o[axis] += deg * k;
    o.roll += rl * Math.sin(Math.PI * Math.abs(k)) * Math.sign(k || 1);
  }
  return o;
};
const KICKS: [number, number][] = [[Math.round(STUB1 * FPS) + 1, 0.035]];
export const camAt = (id: number, f: number): Cam => {
  const c0 = CAMS[id](f), c: Cam = { pos: [...c0.pos] as V3, look: [...c0.look] as V3, fov: c0.fov, roll: c0.roll };
  const w = whipOffset(id, f);
  if (w.yaw || w.pitch) {
    let dx = c.look[0] - c.pos[0], dy = c.look[1] - c.pos[1], dz = c.look[2] - c.pos[2];
    const len = Math.hypot(dx, dy, dz), hz = Math.hypot(dx, dz);
    let yaw = Math.atan2(dx, dz), pitch = Math.atan2(dy, hz);
    yaw += (w.yaw * Math.PI) / 180; pitch = Math.max(-1.35, Math.min(1.35, pitch + (w.pitch * Math.PI) / 180));
    dx = Math.sin(yaw) * Math.cos(pitch) * len; dz = Math.cos(yaw) * Math.cos(pitch) * len; dy = Math.sin(pitch) * len;
    c.look = [c.pos[0] + dx, c.pos[1] + dy, c.pos[2] + dz];
    c.roll += w.roll;
  }
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
const DOFK: [number, number, V3?][] = [[0, 1], [250, 1], [590, 0.5], [1000, 1], [1460, 1], [1545, 1.2], [1660, 1], [1865, 1]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
