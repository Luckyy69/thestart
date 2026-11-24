// "The War Australia Lost to Birds" (the Great Emu War, Western Australia, Nov-Dec 1932): a FUNNY, catchy short timed to
// ~/emu-short/voice/words.json (57.4 s, voice "Liam"). World units metres, ground y = 0. PLACES (separate sets, far apart):
//   FARM    (0,0,0)       wheat farms of the Campion district: golden wheat fields, a tin-roof homestead + windmill + water
//                         tank, fences, red dirt, gum trees, a wide sky. The scoreboard sign stands at SCORE for the finale.
//   DAM     (600,0,0)     the watering hole (a red-earth farm dam with a muddy bank) where ~1000 emus gather; the soldiers'
//                         hiding spot behind a bush at DAM+(-25,0,18).
//   ROAD    (0,0,-1500)   a long straight red-dirt road through scrub along +x for the truck chase.
//   OFFICE  (4000,0,0)    a 1930s army office (desk, map, telephone, flag) for the "farmers called the army" + quote beats.
export const FPS = 30;
export const TOTAL = 1800;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const FARM: V3 = [0, 0, 0];
export const HOMESTEAD: V3 = [-30, 0, -40];
export const SCORE: V3 = [10, 0, 20];
export const DAM: V3 = [600, 0, 0];
export const HIDE: V3 = [575, 0, 18];
export const ROAD: V3 = [0, 0, -1500];
export const OFFICE: V3 = [4000, 0, 0];

/** word cues (s) */
export const W = {
  declared: 1.96, war: 2.38, birds: 2.8, lost: 4.21, ww1: 5.98, soldiers: 7.49, farmers: 8.47, twenty: 10.94, emus: 11.7,
  ate: 12.74, everything: 12.97, called: 14.72, army: 15.09, major: 17.29, two1: 17.83, soldiers2: 18.09, two2: 18.76,
  guns: 19.36, ten: 20.02, bullets: 20.62, easy: 21.44, right: 21.76, first: 22.77, ambush: 23.11, thousand: 24.07,
  watering: 25.08, gun: 26.52, jams: 26.73, twelve: 27.27, bolt: 28.66, truck: 30.13, run: 31.82, fifty: 32.05, hour: 33.04,
  cant: 34.41, keepup: 34.91, split: 36.63, groups: 37.47, lookout: 38.94, basically: 40.17, guerrilla: 40.87,
  warfare: 41.28, weeks: 42.69, home: 44.04, majorSaid: 45.19, bullets2: 47.94, birds2: 48.69, beat: 49.55, world: 50.55,
  great: 52.49, emu: 52.8, war2: 53.1, score: 54.39, emus1: 55.02, one: 55.68, army0: 56.19, zero: 56.73,
};
export const FLASHES: number[] = [];

export type Look = "day" | "golden" | "office";
export type Place = "farm" | "dam" | "road" | "office";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 119, look: "day", place: "farm", light: "day" },        // "declared war on birds": soldier vs ONE emu standoff
  { id: 2, a: 119, b: 161, look: "day", place: "farm", light: "day" },      // "And lost.": the emu wears the soldier's hat
  { id: 3, a: 161, b: 320, look: "golden", place: "farm", light: "golden" },// ex-soldiers become wheat farmers
  { id: 4, a: 320, b: 411, look: "day", place: "farm", light: "day" },      // 20,000 emus pour over the hill and eat everything
  { id: 5, a: 411, b: 487, look: "office", place: "office", light: "day" }, // the farmers called the army (phone)
  { id: 6, a: 487, b: 643, look: "day", place: "farm", light: "day" },      // the line-up: 1 major, 2 soldiers, 2 guns, 10,000 bullets
  { id: 7, a: 643, b: 683, look: "day", place: "farm", light: "day" },      // "Easy, right?" major's smug close-up
  { id: 8, a: 683, b: 790, look: "day", place: "dam", light: "day" },       // first ambush: 1000 emus at the watering hole
  { id: 9, a: 790, b: 848, look: "day", place: "dam", light: "day" },       // the gun jams after twelve
  { id: 10, a: 848, b: 937, look: "day", place: "road", light: "day" },     // gun bolted on a truck
  { id: 11, a: 937, b: 1076, look: "day", place: "road", light: "day" },    // emus at 50 km/h, the truck can't keep up
  { id: 12, a: 1076, b: 1205, look: "day", place: "farm", light: "day" },   // small groups, each with a lookout
  { id: 13, a: 1205, b: 1271, look: "day", place: "farm", light: "day" },   // "guerrilla warfare" (camouflaged emu)
  { id: 14, a: 1271, b: 1351, look: "golden", place: "road", light: "golden" }, // the army goes home; emus wave goodbye
  { id: 15, a: 1351, b: 1549, look: "office", place: "office", light: "day" },  // the major's quote
  { id: 16, a: 1549, b: 1621, look: "day", place: "farm", light: "day" },   // "the Great Emu War" newspaper
  { id: 17, a: 1621, b: TOTAL, look: "golden", place: "farm", light: "golden" }, // final score: Emus 1, Army 0
];
export const XFADE: Record<number, number> = { 3: 8, 14: 8, 17: 10 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- story state (pure functions of shot id + time) ----------------
/** wheat left standing on the farm (1 = full golden crop, 0 = eaten to stubble): eaten during shot 4 */
export const wheatAt = (id: number, t: number) => (id < 4 ? 1 : id === 4 ? 1 - smooth((t - (W.ate - 0.6)) / 1.2) : 0.15);
/** the 20,000 emus pouring over the hill in shot 4: 0..1 progress of the wave */
export const waveAt = (id: number, t: number) => (id === 4 ? smooth((t - (W.twenty - 0.4)) / 1.6) : id > 4 ? 1 : 0);
/** line-up beat (shot 6): how many items have popped in: major, 2 soldiers, 2 guns, crates (each on its word) */
export const lineupAt = (id: number, t: number) => {
  if (id !== 6) return { major: 0, soldiers: 0, guns: 0, crates: 0 };
  const k = (c: number) => smooth((t - (c - LEAD - 0.08)) / 0.18);
  return { major: k(W.major), soldiers: k(W.soldiers2), guns: k(W.guns), crates: k(W.bullets) };
};
/** the jam (shot 9): firing until "jams", then a puff + the gun stops; emus scatter from "twelve" */
export const jamAt = (id: number, t: number) => (id === 9 ? { firing: t < W.jams - LEAD ? 1 : 0, puff: smooth((t - (W.jams - LEAD)) / 0.25), scatter: smooth((t - (W.twelve - 0.1)) / 0.8) } : { firing: 0, puff: 0, scatter: id > 9 ? 1 : 0 });
/** the road chase: truck x along ROAD (m), emus' lead over the truck grows from "run" */
export const chaseAt = (id: number, t: number) => {
  if (id === 10) return { truckX: 8 * (t - 28.3), lead: 6 };
  if (id === 11) { const tt = t - 31.2; return { truckX: 70 + 9 * tt, lead: 6 + 3.8 * Math.max(0, tt) * Math.max(0, tt) }; }
  return { truckX: 0, lead: 0 };
};
/** scoreboard (shot 17): the numbers flip in on their words */
export const scoreAt = (id: number, t: number) => (id === 17 ? { emus: smooth((t - (W.one - 0.1)) / 0.2), army: smooth((t - (W.zero - 0.1)) / 0.2) } : { emus: 0, army: 0 });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const K = (f: number, pos: V3, look: V3, fov = 40, roll = 0, cut = false): Key => ({ f, pos, look, fov, roll, cut });
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const X = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, cut: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Fa = at(FARM), Da = at(DAM), Ro = at(ROAD), Of = at(OFFICE);
// first-pass framings (the camera owner refines these)
const CAMS: Record<number, Key[]> = {
  1: [K(0, Fa(6, 1.4, 10), Fa(0, 1.3, 0), 40), P(119, Fa(5.5, 1.4, 9), Fa(0, 1.3, 0), 38, 0.04)],
  2: [K(119, Fa(1.8, 1.4, 3.2), Fa(0, 1.6, 0), 34), P(161, Fa(1.7, 1.4, 3.0), Fa(0, 1.6, 0), 32, -0.04)],
  3: [K(161, Fa(40, 4, 60), Fa(-20, 3, -30), 44), P(320, Fa(36, 4, 54), Fa(-20, 3, -30), 43, 0.03)],
  4: [K(320, Fa(20, 2.5, 40), Fa(-10, 6, -80), 46), P(411, Fa(18, 2.5, 36), Fa(-10, 4, -60), 45, -0.03)],
  5: [K(411, Of(1.6, 1.5, 2.2), Of(0, 1.2, 0), 40), P(487, Of(1.5, 1.45, 2.0), Of(0, 1.2, 0), 38, 0.03)],
  6: [K(487, Fa(0, 1.5, 12), Fa(0, 1.3, 0), 40), P(643, Fa(0, 1.5, 10.5), Fa(0, 1.3, 0), 38, 0.02)],
  7: [K(643, Fa(0.8, 1.7, 2.2), Fa(0, 1.75, 0), 30), P(683, Fa(0.75, 1.7, 2.0), Fa(0, 1.75, 0), 28, 0.05)],
  8: [K(683, Da(-40, 6, 40), Da(0, 0, 0), 44), P(790, Da(-36, 5, 36), Da(0, 0, 0), 43, 0.03)],
  9: [K(790, Da(-22, 1.2, 22), Da(-25, 0.9, 18), 36), P(848, Da(-22.2, 1.2, 21.6), Da(-25, 0.9, 18), 34, -0.04)],
  10: [K(848, Ro(-6, 2, 10), Ro(0, 1.5, 0), 40), P(937, Ro(-5, 2, 9), Ro(0, 1.5, 0), 38, 0.03)],
  11: [K(937, Ro(-10, 2.5, 12), Ro(10, 1.2, 0), 44), P(1076, Ro(-8, 2.5, 11), Ro(12, 1.2, 0), 43, -0.03)],
  12: [K(1076, Fa(0, 90, 120), Fa(0, 0, 0), 44), P(1205, Fa(0, 80, 105), Fa(0, 0, 0), 43, 0.02)],
  13: [K(1205, Fa(3, 1.3, 4), Fa(0, 1.4, 0), 34), P(1271, Fa(2.8, 1.3, 3.7), Fa(0, 1.4, 0), 32, 0.04)],
  14: [K(1271, Ro(20, 2, 14), Ro(0, 1.5, 0), 40), P(1351, Ro(18, 2, 12), Ro(0, 1.5, 0), 39, -0.03)],
  15: [K(1351, Of(1.8, 1.55, 2.4), Of(0, 1.45, 0), 38), P(1549, Of(1.5, 1.5, 2.0), Of(0, 1.45, 0), 34, 0.03)],
  16: [K(1549, Fa(0, 1.5, 3), Fa(0, 1.2, 0), 36), P(1621, Fa(0, 1.45, 2.6), Fa(0, 1.2, 0), 34, -0.03)],
  17: [K(1621, Fa(10, 2, 30), Fa(10, 2, 20), 40), P(TOTAL, Fa(10, 2, 27), Fa(10, 2.2, 20), 38, 0.03)],
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
const DOFK: [number, number, V3?][] = [[0, 0]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
void X;
