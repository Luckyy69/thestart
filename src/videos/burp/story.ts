// "Astronauts Can't Burp": a funny science short timed to ~/burp-short/voice/words.json (55.4 s, voice "Liam").
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist. 2 CAMERA very few cuts: travel,
// LAND, then the important word is said while the camera is still. 3 LIGHT low sun, long shadows, blue shade, haze; the
// light changes when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 8).
// World units metres. PLACES (separate sets, far apart):
//   STATION (0,0,0)       a space-station module (ISS-like): long padded tube along +x (x -6..+6), deck y=0, ceiling
//                         y=2.3, walls z=+-1.15; handrails, laptops, velcro, cables, bags; a big round window on the -z
//                         wall at x=+1.5 (Earth + low sun outside); hatch rings at both ends (x=-6, x=+6).
//   EARTH   (3000,0,0)    a backyard on Earth at golden hour: lawn, wooden fence, deck chair, grill, a long low sun.
//   MIDDECK (-3000,0,0)   the 1985 space-shuttle middeck: wall of lockers (+x side), ladder hole, sleep bags, floor y=0,
//                         ceiling y=2.2, a small window shaft of low sun.
//   ORBIT   (0,0,-9000)   outside: black space, stars, the curved Earth below with a blue haze rim and a low sun on the
//                         limb; the shuttle (shot 6), the two soda cans (shot 5), the station exterior (shot 10).
export const FPS = 30;
export const TOTAL = 1725;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const STATION: V3 = [0, 0, 0];
export const EARTH: V3 = [3000, 0, 0];
export const MIDDECK: V3 = [-3000, 0, 0];
export const ORBIT: V3 = [0, 0, -9000];

/** word cues (s) */
export const W = {
  cant: 0.57, burp0: 0.86, notwont: 1.51, cant2: 2.45, earth: 3.63, gravity: 3.96, gas: 6.03, up: 6.69, food: 7.15,
  down: 7.73, burp1: 8.42, space: 9.48, nothing: 9.95, mix: 12.06, bubbly: 12.86, soup: 13.32, burps: 15.3, air: 16.53,
  out: 17.21, call: 18.44, wet: 19.01, wetburp: 19.26, now: 20.17, guess: 20.4, fizzy: 21.62, space2: 22.3, y1985: 23.68,
  coca: 24.57, pepsi: 25.46, cans: 26.48, shuttle: 27.59, challenger: 27.88, crew: 29.23, opened: 29.48, sip: 30.68,
  bubbles: 31.71, nowhere: 32.25, go: 32.68, wet2: 33.76, burps2: 34.85, neither: 36.08, menu: 37.33, but: 37.95,
  newman: 38.91, trick: 39.58, pushed: 40.74, wall: 41.32, hard: 41.92, split: 43.32, gravity2: 45.57, gasup: 46.82,
  fooddown: 47.89, perfect: 49.56, burp3: 49.98, billions: 51.04, rocket: 52.13, still: 54.03, wall2: 54.6, burp4: 54.94,
};
export const FLASHES: number[] = [];

export type Look = "station" | "backyard" | "commercial" | "orbit" | "middeck" | "gross" | "sunrise";
export type Place = "station" | "earth" | "middeck" | "orbit";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 96, look: "station", place: "station", light: "day" },        // HOOK: astronaut (BEAN) floats mid-module, tries to burp: strain -> annoyed ("Not won't") -> defeated ("Can't.")
  { id: 2, a: 96, b: 270, look: "backyard", place: "earth", light: "golden" },    // ON EARTH: BEAN in a deck chair sips a soda; X-ray stomach: gas floats up, food stays down; satisfied "Burp." (253)
  { id: 3, a: 270, b: 600, look: "station", place: "station", light: "day" },     // IN SPACE: X-ray hologram stomach: gas + food mix into bubbly soup (400); queasy; "wet burp" (578): a wobbly blob floats out, embarrassed
  { id: 4, a: 600, b: 700, look: "commercial", place: "orbit", light: "golden" }, // "Now guess who...": a red can and a blue can drift into a spotlight in orbit, glinting (22.3)
  { id: 5, a: 700, b: 870, look: "orbit", place: "orbit", light: "day" },         // "In 1985...": the space shuttle over Earth, low sun on the limb, payload bay; land on it for "Challenger" (836)
  { id: 6, a: 870, b: 1010, look: "middeck", place: "middeck", light: "day" },    // middeck: 3 crew open the cans (pssht 885), big happy sip (920), X-ray stomachs fill with bubbles: nervous
  { id: 7, a: 1010, b: 1135, look: "gross", place: "middeck", light: "day" },     // PEAK: "Wet." (1013) / "Burps." (1046): THE MEME FACE (only here) + wet-burp blobs; the menu card gets a red X (1120)
  { id: 8, a: 1135, b: 1525, look: "sunrise", place: "station", light: "golden" },// TWIST: sunrise through the window; NEWMAN braces at the -x hatch, launches on "Hard." (1258), flies down the module; X-ray: gas up (1405), food down (1437); catches a rail, still; "One perfect burp." (1499) proud
  { id: 9, a: 1525, b: 1725, look: "sunrise", place: "orbit", light: "golden" },  // OUTRO: travel out to the station exterior at sunrise; land; on "wall to burp" (1638) a tiny burp ring pops from the window
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8 };
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
/** X-ray stomach hologram: mode + gas separation (1 = gas on top / food bottom, 0 = mixed soup) + bubble amount */
export const stomachAt = (id: number, t: number) => {
  if (id === 2) return { show: smooth((t - (W.gravity - 0.3)) / 0.4), sep: smooth((t - W.gas) / 1.2), bubbles: 0.6 };
  if (id === 3) return { show: smooth((t - (W.space - 0.2)) / 0.4) * (1 - smooth((t - (W.burps - 0.1)) / 0.4)), sep: 1 - smooth((t - W.nothing) / 2.6), bubbles: 0.6 + 0.4 * smooth((t - W.mix) / 1.2) };
  if (id === 6) return { show: smooth((t - (W.bubbles - 0.3)) / 0.4) * (1 - smooth((t - (W.wet2 - 0.72)) / 0.45)), sep: 0, bubbles: smooth((t - W.bubbles) / 1.0) };
  if (id === 8) return { show: smooth((t - (W.split - 0.3)) / 0.4), sep: smooth((t - W.gasup) / 1.5), bubbles: 0.7 };
  return { show: 0, sep: 0, bubbles: 0 };
};
/** burp events: [t, kind, who] (cast draws the face + fx; audio adds the sound) */
export type BurpKind = "fail" | "clean" | "wet" | "tiny";
export const BURPS: [number, BurpKind, string][] = [
  [W.cant - 0.05, "fail", "bean"], [W.burp1 - 0.05, "clean", "bean"], [W.wetburp - 0.05, "wet", "bean"],
  [W.wet2 - 0.05, "wet", "crew1"], [W.wet2 + 0.25, "wet", "crew2"], [W.burps2 - 0.05, "wet", "crew0"],
  [W.burp3 - 0.05, "clean", "newman"], [W.burp4 - 0.05, "tiny", "newman"],
];
/** soda cans in the middeck (shot 6-7): opened (pssht) and sipping */
export const canAt = (id: number, t: number) => (id === 6 || id === 7 ? { open: t >= W.opened - LEAD ? 1 : 0, sip: id === 6 ? smooth((t - (W.sip - 0.3)) / 0.3) * (1 - smooth((t - (W.bubbles - 0.2)) / 0.3)) : 0 } : { open: 0, sip: 0 });
/** the menu card (shot 7): red X drawn on "menu" */
export const menuAt = (id: number, t: number) => (id === 7 ? { show: smooth((t - (W.neither - 0.3)) / 0.35), cross: smooth((t - (W.menu - 0.15)) / 0.3) } : { show: 0, cross: 0 });
/** Newman's push (shot 8): x along the module (STATION local), braced -> launch on "Hard." -> glide -> catch rail */
export const NEWMAN_X0 = -5.1, NEWMAN_X1 = 3.6;
export const newmanAt = (id: number, t: number) => {
  if (id !== 8) return { x: NEWMAN_X0, crouch: 0, flying: 0, caught: 0 };
  const crouch = smooth((t - (W.pushed - 0.2)) / 0.5) * (1 - smooth((t - (W.hard - 0.05)) / 0.12));
  const u = clamp01((t - (W.hard - LEAD)) / (W.fooddown + 0.5 - W.hard)); // ~6.5 s glide (microgravity drift, eased landing)
  const e = 1 - Math.pow(1 - u, 1.8);
  return { x: NEWMAN_X0 + (NEWMAN_X1 - NEWMAN_X0) * e, crouch, flying: u > 0 && u < 1 ? 1 : 0, caught: smooth((u - 0.97) / 0.03) };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const St = at(STATION), Ea = at(EARTH), Md = at(MIDDECK), Or = at(ORBIT);
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
// first-pass framing (the cam owner rewrites this): BEAN floats at STATION+(0,1.15,0); Earth chair EARTH+(0,0,0);
// crew at MIDDECK+(-0.9|0|0.9, 1.1, 0); Newman along STATION x NEWMAN_X0..X1 at y 1.2.
// shot 8: between the "Hard." hold and the "gravity" hold the camera rides alongside Newman (x locked a little ahead of
// his chest) between the holds, easing out of / into each; y / z / fov keep the waypoint glide
const track8 = (ks: Key[]): Key[] => ks.map((k) => {
  const w = k.f > 1258 && k.f < 1360 ? smooth((k.f - 1258) / 16) * (1 - smooth((k.f - 1340) / 26))
    : k.f > 1370 && k.f < 1442 ? smooth((k.f - 1370) / 14) * (1 - smooth((k.f - 1416) / 26)) : 0;
  if (w === 0) return k;
  const nx = STATION[0] + newmanAt(8, k.f / FPS).x + (k.f < 1368 ? 0.05 : 0.15); // 2nd ride: lens a touch wider + framed back so the trailing X-ray (gas up) stays in
  const lx = k.look[0] + (nx - k.look[0]) * w, dx = lx - k.look[0];
  return { ...k, pos: [k.pos[0] + dx, k.pos[1], k.pos[2]], look: [lx, k.look[1], k.look[2]], fov: k.fov! + (k.f > 1368 ? 8 * w : 0) };
});
const CAMS: Record<number, Key[]> = {
  // HOOK: already moving on frame 0 (the glide began off-screen at -14): low dutch angle -> crane up + dolly in, LAND on
  // BEAN with Earth in the window beside him for "burp" (26); push to his face, LAND for "Can't." (73)
  1: shot(1, [[-14, St(-2.8, 1.35, 2.75), St(0.25, 1.24, 0), 38, 0.04], [22, St(-1.75, 1.3, 2.55), St(0.12, 1.2, 0), 34], [40, St(-1.75, 1.3, 2.55), St(0.12, 1.2, 0), 34],
    [64, St(-1.4, 1.5, 2.1), St(0.14, 1.42, 0), 32], [96, St(-1.4, 1.5, 2.1), St(0.14, 1.42, 0), 32]]),
  // golden backyard: crane down from the wide, LAND on BEAN + hologram + can (gas up / food down), push in, LAND "Burp." (253)
  2: shot(2, [[92, Ea(4.6, 2.7, 8.6), Ea(0.3, 0.75, 0), 36], [150, Ea(0.04, 1.4, 3.5), Ea(-0.01, 0.48, 0.1), 43], [192, Ea(0.04, 1.4, 3.5), Ea(-0.01, 0.48, 0.1), 43],
    [236, Ea(0.03, 1.3, 3.0), Ea(-0.01, 0.54, 0.1), 45], [270, Ea(0.03, 1.3, 3.0), Ea(-0.01, 0.54, 0.1), 45]]), // framed left: X-ray beside his chest (chair side), can on the table at right
  // back in space: dolly in from the module wide, LAND on BEAN + hologram for "soup" (400); orbit round to his face, LAND "wet burp" (578)
  3: shot(3, [[266, St(3.4, 1.6, 3.6), St(0.7, 1.1, 0), 34], [338, St(1.15, 1.3, 3.3), St(0.26, 1.12, 0), 38], [430, St(1.15, 1.3, 3.3), St(0.26, 1.12, 0), 38],
    [540, St(-0.95, 1.45, 2.4), St(0.05, 1.38, 0), 34], [600, St(-0.95, 1.45, 2.4), St(0.05, 1.38, 0), 34]]),
  // the cans glide into the spotlight: crane down + dolly in, LAND for "space" (669)
  4: shot(4, [[600, Or(-4.2, 1.8, 11.5), Or(0, 0.2, 0), 36], [655, Or(-1.0, 0.3, 5.6), Or(0, -0.35, 0), 34], [700, Or(-1.0, 0.3, 5.6), Or(0, -0.35, 0), 34]]),
  // the orbiter over the curved Earth: long glide in from deep space, LAND on the whole shuttle for "Challenger" (836)
  5: shot(5, [[700, Or(0, 80, 260), Or(98, -10, 0), 40], [815, Or(50, 34, 92), Or(97, -7, 0), 38], [870, Or(50, 34, 92), Or(97, -7, 0), 38]]),
  // middeck: dolly in to the three crew, LAND for the "sip" (920); push to the centre face, LAND for "go" (980); then
  // ease in to the centre man for the peak
  6: shot(6, [[870, Md(0.75, 1.5, 6.1), Md(0.03, 1.1, 0), 46], [884, Md(0.5, 1.45, 5.45), Md(0.03, 1.12, 0), 46], [958, Md(0.5, 1.45, 5.45), Md(0.03, 1.12, 0), 46],
    [976, Md(0.3, 1.45, 3.2), Md(0, 1.12, 0), 38], [990, Md(0.3, 1.45, 3.2), Md(0, 1.12, 0), 38], [1010, Md(0.15, 1.56, 2.5), Md(0, 1.45, 0), 36]]),
  // PEAK (no visible cut, the room turns green): held on THE MEME FACE for "Wet." (1013), a short push, LAND "Burps." (1046);
  // ease back with the menu in the foreground, LAND for "menu" (1120)
  7: shot(7, [[1010, Md(0.15, 1.56, 2.5), Md(0, 1.45, 0), 36], [1024, Md(0.15, 1.56, 2.5), Md(0, 1.45, 0), 36], [1040, Md(0.1, 1.62, 2.25), Md(0, 1.55, 0), 36],
    [1064, Md(0.1, 1.62, 2.25), Md(0, 1.55, 0), 36], [1100, Md(0.3, 1.58, 2.8), Md(0.02, 1.24, 0.5), 36], [1135, Md(0.3, 1.58, 2.8), Md(0.02, 1.24, 0.5), 36]]),
  // TWIST: from the golden window, dolly to Newman braced at the push wall, LAND "Hard." (1258); track with his flight,
  // LAND as he sails past the sunrise window for "gravity" (1367); drift to the catch bar, LAND "perfect burp" (1499)
  8: track8(shot(8, [[1135, St(0.8, 1.5, 3.4), St(1.5, 1.3, -1.0), 38], [1180, St(-4.45, 1.35, 3.7), St(-4.9, 1.05, 0), 40], [1258, St(-4.45, 1.35, 3.7), St(-4.9, 1.05, 0), 40],
    [1360, St(1.75, 1.25, 3.25), St(1.9, 1.1, 0), 42], [1372, St(1.75, 1.25, 3.25), St(1.9, 1.1, 0), 42],
    [1442, St(3.37, 1.4, 3.3), St(3.5, 1.15, 0), 46], [1525, St(3.37, 1.4, 3.3), St(3.5, 1.15, 0), 46]])),
  // OUTRO: sunrise over the limb, travel in from the wide to the lit cupola window, LAND "wall to burp" (1638), drift out
  9: shot(9, [[1525, Or(-178, 14, 62), Or(-200, -2, 0), 40], [1612, Or(-198.9, 1.2, 9.0), Or(-200, -0.45, 2), 36], [1665, Or(-198.9, 1.2, 9.0), Or(-200, -0.45, 2), 36],
    [1708, Or(-192, 4.5, 26), Or(-200, -2.2, 1), 40], [1725, Or(-192, 4.5, 26), Or(-200, -2.2, 1), 40]]),
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
// mild lens blur only (backgrounds stay readable): [frame, cInf, focus?]
const DOFK: [number, number, V3?][] = [[0, 1.2], [96, 0], [270, 1.0], [600, 0], [870, 0.8], [1010, 1.4], [1135, 0.8], [1525, 0]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
