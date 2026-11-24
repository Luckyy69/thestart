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
// CAMERA (cam owner). Each shot = waypoints [frame, pos, look, fov, roll?] eased with glide() between them, plus a slow
// constant drift (m/s, on pos + look) so the frame never sits dead between moves; sampled into linear keys every 2
// frames. Truck shots 10-11 are authored in the truck's frame (x from the truck along ROAD, no bounce) so the camera
// tracks it. Subjects sit in the upper-middle (look targets aimed below the faces); the bottom ~22% is the caption band.
type WP = [number, V3, V3, number, number?];
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const shot = (id: number, ws: WP[], drift: V3 = [0, 0, 0], frame: (f: number, p: V3) => V3 = (_f, p) => p): Key[] => {
  const { a, b } = SHOTS[id - 1], out: Key[] = [];
  const fn = (f: number) => {
    let i = 0;
    while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
    const A = ws[i], B = ws[Math.min(i + 1, ws.length - 1)];
    const u = B[0] === A[0] ? 0 : glide((f - A[0]) / (B[0] - A[0]));
    const d = (f - a) / FPS, dr = (p: V3): V3 => frame(f, [p[0] + drift[0] * d, p[1] + drift[1] * d, p[2] + drift[2] * d]);
    return P(f, dr(lerp3(A[1], B[1], u)), dr(lerp3(A[2], B[2], u)), A[3] + (B[3] - A[3]) * u, (A[4] ?? 0) + ((B[4] ?? 0) - (A[4] ?? 0)) * u);
  };
  for (let f = a; ; f += 2) { const g = Math.min(f, b); out.push(fn(g)); if (g >= b) break; }
  return out;
};
/** truck frame (shots 10-11): local x along the road from the truck, y up, z = world z offset from the road */
const truckFrame = (id: number) => (f: number, p: V3): V3 => [ROAD[0] + chaseAt(id, f / FPS).truckX + p[0], p[1], ROAD[2] + p[2]];
const Hd = at(HIDE);
const Sc = at(SCORE);
const CAMS: Record<number, Key[]> = {
  // 1 standoff: low two-shot against the sky, then a snap push into the emu's glaring profile on "birds" (84)
  1: shot(1, [
    [0, Fa(0.15, 0.85, 8.8), Fa(0.0, 0.85, 0), 40],
    [50, Fa(0.15, 0.9, 7.8), Fa(0.0, 0.9, 0), 40],
    [82, Fa(1.05, 1.45, 3.0), Fa(0.7, 1.4, -0.2), 30],
    [119, Fa(1.0, 1.48, 2.7), Fa(0.7, 1.42, -0.2), 29, 0.02],
  ]),
  // 2 "And lost.": the hatted emu close, the hatless soldier cut by the left edge
  2: shot(2, [
    [119, Fa(0.6, 1.42, 3.7), Fa(0.35, 1.36, 0), 32, -0.02],
    [161, Fa(0.55, 1.48, 3.15), Fa(0.38, 1.4, 0), 30, 0.02],
  ]),
  // 3 golden farm: wide with the homestead, glide down to the soldiers -> farmers
  3: shot(3, [
    [161, Fa(-12.6, 2.7, -6.5), Fa(-17.7, 0.8, -24.6), 38], // QA: start closer so the four soldiers read from frame 1
    [215, Fa(-14.4, 2.25, -9.6), Fa(-17.8, 0.75, -24.4), 38],
    [252, Fa(-16.2, 1.75, -12), Fa(-17.15, 0.75, -24), 38],
    [320, Fa(-17.0, 1.65, -12.9), Fa(-17.2, 0.8, -24), 36.5, 0.02],
  ], [-0.06, 0, 0]),
  // 4 deadpan wide: the hill fills with the wave behind the tiny farmers, crane down as it arrives
  4: shot(4, [
    [320, Fa(12, 4, 42), Fa(0, 8, -215), 24],
    [411, Fa(21.5, 2.0, 45), Fa(4, -5, -60), 40, -0.02],
  ]),
  // 5 office: phone ringing in the foreground, the major behind the desk; push in
  5: shot(5, [
    [411, Of(-0.95, 1.45, 3.0), Of(0.05, 1.12, -0.1), 39], // QA: major's head + pop cards inside frame
    [452, Of(-0.65, 1.42, 2.5), Of(0.05, 1.15, -0.15), 37],
    [487, Of(-0.5, 1.4, 2.25), Of(0.0, 1.18, -0.25), 35, 0.02],
  ]),
  // 6 the line-up: pull back as each item lands (major, soldiers, guns, crates)
  6: shot(6, [
    [487, Fa(0.15, 1.45, 5.4), Fa(0, 0.98, 0.3), 36],
    [530, Fa(0.1, 1.45, 5.0), Fa(0, 1.0, 0.3), 36],
    [556, Fa(0.0, 1.55, 8.2), Fa(0, 0.9, 0.3), 38],
    [592, Fa(-0.1, 1.9, 9.8), Fa(0, 0.75, 0.8), 38],
    [626, Fa(0.7, 2.0, 11.6), Fa(0.6, 0.9, 0.6), 38],
    [643, Fa(0.7, 2.0, 11.2), Fa(0.6, 0.9, 0.6), 38, 0.015],
  ]),
  // 7 "Easy, right?": the major's smug close-up
  7: shot(7, [
    [643, Fa(0.4, 1.45, 2.6), Fa(0.05, 1.23, 0), 34, 0.02],
    [683, Fa(0.3, 1.45, 2.25), Fa(0.04, 1.25, 0), 33, -0.02],
  ]),
  // 8 the dam: high deadpan wide of the thousand, descend to behind the ambush team
  8: shot(8, [
    [683, Da(-62, 30, 64), Da(1, 0, -19), 42],
    [742, Da(-50, 15, 52), Da(-3, 0, -14), 42],
    [790, Da(-30.0, 2.3, 22.1), Da(-21.6, 0.7, 14.9), 42],
  ]),
  // 9 the jam: side close-up on the Lewis gun (jams on 802), then over the shoulder as the emus scatter
  9: shot(9, [
    [790, Hd(1.2, 1.25, 2.75), Hd(-0.35, 0.95, 0.95), 36],
    [812, Hd(1.1, 1.28, 2.6), Hd(-0.35, 0.95, 0.95), 35],
    [848, Hd(2.3, 1.75, 4.4), Hd(-0.7, 1.12, -0.4), 40, 0.02],
  ]),
  // 10 the gun clunks onto the truck, then a sweeping track forward to look back at truck + pack
  10: shot(10, [
    [848, [-2.4, 2.7, 3.0], [-0.9, 1.85, 0], 38],
    [872, [-2.2, 2.65, 2.85], [-0.9, 1.85, 0], 36],
    [937, [17, 2.2, 7.5], [6, 1.1, 0.3], 44],
  ], [0, 0, 0], truckFrame(10)),
  // 11 riding with the truck: the pack pulls away, crane up as they vanish down the road
  11: shot(11, [
    [937, [-3.2, 2.3, 5.4], [5, 1.25, -0.8], 40],
    [998, [-8.5, 3.0, 1.4], [15, 0.9, -0.3], 40],
    [1046, [-9, 4.5, 0.9], [40, 0.6, 0], 38],
    [1076, [-9.5, 4.7, 0.8], [45, 0.6, 0], 37],
  ], [0, 0, 0], truckFrame(11)),
  // 12 aerial deadpan over the groups, descend to one group as its lookout pops up
  12: shot(12, [
    [1076, Fa(5, 50, 86), Fa(-4, 0, -6), 44],
    [1140, Fa(1, 30, 62), Fa(-6, 0, 6), 42],
    [1205, Fa(-6.5, 8.5, 38), Fa(-11, 0.5, 16.5), 38],
  ]),
  // 13 guerrilla: the soldier with binoculars misses the camo emu; push to the emu's eyes on "guerrilla"
  13: shot(13, [
    [1205, Fa(-0.1, 1.4, 4.5), Fa(0.0, 1.0, 0), 36],
    [1222, Fa(-0.05, 1.4, 4.2), Fa(0.02, 1.02, 0), 36],
    [1246, Fa(0.42, 1.38, 2.1), Fa(0.3, 1.25, -0.2), 30],
    [1271, Fa(0.4, 1.38, 1.95), Fa(0.3, 1.26, -0.2), 29, 0.02],
  ]),
  // 14 golden: the army trudges home, emus wave behind; slow pull back + rise
  14: shot(14, [
    [1271, Ro(0.8, 1.6, 6.8), Ro(0.5, 0.95, -3), 40],
    [1351, Ro(2.2, 2.0, 10.2), Ro(0.8, 0.95, -4), 41, -0.02],
  ]),
  // 15 the major's quote: push in, pull back for the thought bubble (beat 1487), push to his face + bubble
  15: shot(15, [
    [1351, Of(0.9, 1.5, 2.9), Of(-0.05, 1.12, -0.6), 38],
    [1420, Of(0.6, 1.45, 2.4), Of(-0.08, 1.18, -0.7), 34],
    [1470, Of(0.3, 1.4, 1.95), Of(-0.1, 1.22, -0.8), 32],
    [1500, Of(0.1, 1.55, 3.1), Of(0.15, 1.5, -0.8), 37],
    [1549, Of(0.12, 1.55, 2.75), Of(0.15, 1.55, -0.8), 35, 0.02],
  ]),
  // 16 the newspaper: settle so the page fills the frame above the caption band
  16: shot(16, [
    [1549, Fa(0, 1.25, 2.9), Fa(0, 1.13, 0.45), 36],
    [1600, Fa(0, 1.2, 2.3), Fa(0, 1.12, 0.45), 36],
    [1621, Fa(0.02, 1.2, 2.25), Fa(0, 1.12, 0.45), 35.5],
  ]),
  // 17 final score: wide, push to the board for "one"/"zero", then the hatted emu's victory close-up
  17: shot(17, [
    [1621, Sc(0.6, 2.7, 17), Sc(0, 1.95, -1), 42],
    [1660, Sc(0.3, 2.5, 11), Sc(-0.1, 2.0, 0), 38],
    [1702, Sc(0.1, 2.5, 10), Sc(-0.1, 2.0, 0), 38],
    [1738, Sc(3.5, 1.85, 8.0), Sc(2.2, 1.25, 1.7), 38],
    [1800, Sc(3.3, 1.8, 7.3), Sc(2.2, 1.25, 1.7), 37, 0.02],
  ]),
};
const KICKS: [number, number][] = [[84, 0.04], [126, 0.03], [382, 0.025], [442, 0.025], [581, 0.025], [619, 0.03], [653, 0.035], [802, 0.04], [860, 0.04], [961, 0.025], [1032, 0.025], [1487, 0.02], [1670, 0.03], [1702, 0.035]];
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
// mild lens blur only (backgrounds stay readable): [frame, cInf, focus?] (focus default = the look target)
const DOFK: [number, number, V3?][] = [
  [0, 2], [60, 5], [119, 5], [161, 1], [240, 3], [320, 0], [411, 4], [487, 3], [643, 5], [683, 0], [790, 5], [812, 2],
  [848, 3], [880, 1], [937, 1], [1076, 0], [1205, 3], [1230, 5], [1271, 2], [1351, 4], [1549, 2], [1621, 1], [1660, 2], [1720, 4],
];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
void X;
