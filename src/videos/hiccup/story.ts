// "Hiccups Come From Tadpoles": a funny science short timed to ~/hiccup-short/voice/words.json (38.1 s, voice "Liam").
// The owner's growth plan: SHORT (<= 41 s), body + funny + relatable (like "Astronauts Can't Burp", our best performer).
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist (68 years / 430 million hics).
// 2 CAMERA very few cuts: travel, LAND, then the important word is said while the camera is still. 3 LIGHT low sun,
// long shadows, blue shade, haze; the light changes when the story turns. 4 FACES one feeling per line; the big meme
// face ONLY at the peak (shot 5 "four hundred thirty million hics": old Osborne). Watermark on (common/Watermark.tsx).
// World units metres. PLACES (ALL NEW):
//   KITCHEN (0,0,0)       BEAN's bright little kitchen at golden morning: a counter at z=-0.6 (top y 0.92), fridge,
//                         window with low sun stripes, plants, a fish tank on the counter (callback to "water"); BEAN
//                         stands at KITCHEN+(0,0,0) with a fizzy can.
//   POND    (3000,0,0)    a prehistoric pond, half underwater: sunbeams through green water, reeds, lily pads, pebbles;
//                         a big cute TADPOLE swims at POND+(0,1.2,0) (cast card). The water surface is at y 2.2.
//   FARM    (-3000,0,0)   an Iowa hog farm in 1922: red barn, a hog-weighing SCALE at FARM+(0.8,0,-0.3), a pen with
//                         a hog, a windmill, corn, a wooden calendar on the barn wall; Charles Osborne stands at
//                         FARM+(0,0,0). Sepia-gold low sun.
export const FPS = 30;
export const TOTAL = 1230;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const KITCHEN: V3 = [0, 0, 0];
export const POND: V3 = [3000, 0, 0];
export const FARM: V3 = [-3000, 0, 0];

/** word cues (s) */
export const W = {
  hiccups: 0.28, ancestors: 1.9, water: 2.83, hiccup: 4.1, diaphragm: 4.77, spasming: 5.76, gasp: 7.07, throat: 8.23,
  slams: 8.59, shut: 8.99, hic: 10.05, why: 11.24, that: 12.32, scientists: 13.56, ancient: 14.52, tadpoles: 15.34,
  gulp: 16.95, snap: 17.84, shut2: 18.61, water2: 19.26, gills: 20.2, lungs: 21.36, millions: 22.45, still: 24.03,
  doing: 24.28, it: 24.53, fizzy: 26.16, drink: 26.47, sometimes: 27.71, stop: 29.14, y1922: 30.52, farmer: 31.63,
  osborne: 32.6, hiccuping: 33.32, kept: 34.42, sixtyeight: 35.02, years: 35.54, million: 37.4, hics: 37.72,
};
export const FLASHES: number[] = [];

export type Look = "kitchen" | "xray" | "pond" | "farm" | "peak";
export type Place = "kitchen" | "pond" | "farm";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 115, look: "kitchen", place: "kitchen", light: "golden" }, // HOOK: BEAN mid-sip of a fizzy can -> HIC! (0.25 s, jolts, can splashes); on "ancestors... water" (1.9-2.83) a big FISH/TADPOLE-shaped shadow swims across the wall behind him; he side-eyes it
  { id: 2, a: 115, b: 335, look: "xray", place: "kitchen", light: "day" },     // X-RAY of BEAN's chest + throat: the DIAPHRAGM dome spasms down (5.76), air rushes in "gasp" (7.07), the THROAT DOOR slams shut (8.99) -> "HIC!" (10.05); "why would a body ever do that?" (12.32) BEAN shrugs
  { id: 3, a: 335, b: 660, look: "pond", place: "pond", light: "day" },        // TURN (light changes to green underwater sunbeams): the prehistoric POND; "Some scientists think... tadpoles" (15.34) a cute TADPOLE swims in; "gulp" (16.95) its cheeks puff, its throat SNAPS shut (18.61), water flows over its gills (20.2), "not into their lungs" (21.36) the lungs stay dry (tick)
  { id: 4, a: 660, b: 910, look: "kitchen", place: "kitchen", light: "golden" },// MATCH: the tadpole morphs into BEAN (match cut); "Millions of years later" BEAN in the kitchen "still doing it" HIC (24.53); "after a fizzy drink" (26.47) he looks at the can, betrayed; "And sometimes... it doesn't stop." (29.14) hic hic hic, worried
  { id: 5, a: 910, b: 1230, look: "farm", place: "farm", light: "golden" },    // TWIST: Iowa 1922 (sepia-gold): farmer Charles Osborne weighing a hog on a scale (30.52); "started hiccuping" (33.32) HIC; "sixty-eight years" (35.02): time-lapse: calendar pages fly 1922 -> 1990, he ages (hair goes white, beard grows), still hiccuping; "430 million hics" (37.72): an odometer counter spins to 430,000,000 + THE MEME FACE (only here): exhausted old Osborne, one last giant HIC; hold
];
export const XFADE: Record<number, number> = { 2: 6, 3: 8, 4: 10, 5: 8 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["farm", "peak", 1120, 1135, "farm"]];
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
/** every hic: [t, who, size] (cast: body jolt + "HIC!" card; holo: diaphragm/throat; audio: the hic sound) */
export const HICS: [number, string, number][] = [
  [0.25, "bean", 0.8], [W.hic - 0.05, "bean", 1.0], [W.it - 0.05, "bean", 0.7],
  [W.sometimes + 0.2, "bean", 0.5], [W.stop - 0.35, "bean", 0.6], [W.stop + 0.35, "bean", 0.7],
  [W.hiccuping - 0.05, "osborne", 0.7], [W.sixtyeight + 0.3, "osborne", 0.5], [W.years + 0.25, "osborne", 0.5],
  [W.million - 0.1, "osborne", 0.6], [W.hics + 0.2, "osborne", 1.0],
];
/** the fish/tadpole shadow on the kitchen wall (shot 1): 0..1 swim progress */
export const shadowAt = (id: number, t: number) => (id === 1 ? { show: smooth((t - (W.ancestors - 0.3)) / 0.4) * (1 - smooth((t - 3.5) / 0.3)), x: smooth((t - (W.ancestors - 0.3)) / 1.6) } : { show: 0, x: 0 });
/** X-ray (shot 2): show, diaphragm drop 0..1, air in, throat door closed 0..1 */
export const xrayAt = (id: number, t: number) => (id === 2 ? {
  show: smooth((t - (shotStart(2) - 0.2)) / 0.4), diaphragm: smooth((t - (W.spasming - 0.2)) / 0.15) * (1 - 0.6 * smooth((t - (W.hic + 0.3)) / 0.6)),
  air: smooth((t - (W.gasp - 0.1)) / 0.5), door: smooth((t - (W.shut - 0.12)) / 0.08),
} : { show: 0, diaphragm: 0, air: 0, door: 0 });
/** tadpole (shot 3): gulp, throat snap, gill flow, lungs dry tick */
export const tadpoleAt = (id: number, t: number) => (id === 3 ? {
  gulp: smooth((t - (W.gulp - 0.15)) / 0.3), snap: smooth((t - (W.shut2 - 0.1)) / 0.08), flow: smooth((t - (W.water2 - 0.2)) / 0.6), dry: smooth((t - (W.lungs - 0.1)) / 0.3),
} : { gulp: 0, snap: 0, flow: 0, dry: 0 });
/** the tadpole -> BEAN morph at the 3->4 transition: 0..1 */
export const morphAt = (f: number) => smooth((f - 645) / 30);
/** Osborne's time-lapse (shot 5): year shown, age 0..1 (1922 -> 1990), odometer value */
export const osborneAt = (id: number, t: number) => {
  if (id !== 5) return { year: 1922, age: 0, count: 0, show: 0 };
  const age = smooth((t - (W.kept - 0.1)) / (W.million - W.kept));
  const year = Math.round(1922 + 68 * age);
  const cu = smooth((t - (W.million - 0.9)) / 1.1);
  return { year, age, count: Math.round(430000000 * cu), show: smooth((t - (W.kept - 0.2)) / 0.4) };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ki = at(KITCHEN), Po = at(POND), Fa = at(FARM);
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
  1: shot(1, [[0, Ki(0.2, 1.3, 2.6), Ki(0, 1.2, 0), 34], [115, Ki(0.1, 1.3, 2.4), Ki(0, 1.2, 0), 34]]),
  2: shot(2, [[115, Ki(0, 1.3, 2.0), Ki(0, 1.15, 0), 34], [335, Ki(0, 1.3, 1.9), Ki(0, 1.15, 0), 34]]),
  3: shot(3, [[335, Po(0, 1.4, 4.0), Po(0, 1.2, 0), 38], [660, Po(0, 1.3, 2.6), Po(0, 1.2, 0), 34]]),
  4: shot(4, [[660, Ki(0, 1.3, 2.4), Ki(0, 1.2, 0), 34], [910, Ki(0, 1.3, 2.4), Ki(0, 1.2, 0), 34]]),
  5: shot(5, [[910, Fa(1.5, 1.6, 5.0), Fa(0.3, 1.0, 0), 38], [1230, Fa(0.2, 1.45, 2.4), Fa(0, 1.35, 0), 34]]),
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
const DOFK: [number, number, V3?][] = [[0, 1], [115, 1], [335, 0.8], [660, 1], [910, 0.8]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
