// "The Sun Sneeze": a funny science short timed to ~/sneeze-short/voice/words.json (56.5 s, voice "Liam").
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist (the official name spells ACHOO).
// 2 CAMERA very few cuts: travel, LAND, then the important word is said while the camera is still. 3 LIGHT low sun,
// long shadows, blue shade, haze; the light changes when the story turns. 4 FACES one feeling per line; the big meme
// face ONLY at the peak (shot 5 "Achoo!"). Every video carries the Bean Stories WATERMARK (common/Watermark.tsx).
// The user: "even better than last time, cool transitions, insanely good quality overall". ALL sets new.
// World units metres. PLACES (separate sets, far apart):
//   STREET  (0,0,0)       a colourful little terraced street at SUNRISE: BEAN's front door at STREET+(0,0,-1.2) (dark
//                         hallway behind it), steps, a low sun rising at the end of the street (long shadows, haze);
//                         BEAN steps out onto STREET+(0,0,0). His family (shot 6) steps out the same door.
//   GREECE  (3000,0,0)    ancient Athens at golden hour: marble terrace + columns, olive trees, the sea, Aristotle with
//                         a scroll at GREECE+(0,0,0).
//   ENGLAND (-3000,0,0)   1630s England: a hazy morning garden with a hedge maze/lavender, a brick manor, a sundial;
//                         Francis Bacon (ruff collar, tall hat) at ENGLAND+(0,0,0) faces the sun (eyes closed).
//   STAGE   (0,0,-3000)   a 1978 science conference stage: curtains, a podium, a slide projector, a GIANT BANNER whose
//                         initials light up A-C-H-O-O; a scientist at the podium, BEAN in the front row.
export const FPS = 30;
export const TOTAL = 1755;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const STREET: V3 = [0, 0, 0];
export const GREECE: V3 = [3000, 0, 0];
export const ENGLAND: V3 = [-3000, 0, 0];
export const STAGE: V3 = [0, 0, -3000];

/** word cues (s) */
export const W = {
  sneeze0: 1.39, sun0: 2.39, maybe: 3.06, them: 3.75, aristotle: 6.08, theory: 6.9, heats: 8.1, nose0: 8.51,
  sweats: 9.45, sneeze1: 10.82, later: 12.55, bacon: 13.65, tested: 13.99, faced: 15.26, closed: 16.45, heat: 17.8,
  there: 18.15, wasnt: 19.28, notnose: 21.08, eyes0: 22.14, scientists: 23.79, crossed: 24.75, wires: 25.17,
  nerveA: 26.33, sneeze2: 27.06, nerveB: 28.39, light0: 29.21, eyes1: 29.79, bright: 30.85, floods: 31.38,
  mixes: 33.44, signals: 33.97, light1: 35.64, nose1: 37.52, achoo: 38.65, families: 40.69, parent: 42.42,
  fifty: 44.21, chance: 44.87, best: 46.55, official: 48.73, name: 49.23, autosomal: 50.21, dominant: 50.84,
  compelling: 51.41, helio: 51.95, outburst: 53.07, short: 54.79, achoo2: 55.93,
};
export const FLASHES: number[] = [];

export type Look = "dawn" | "greece" | "england" | "xray" | "flash" | "stage";
export type Place = "street" | "greece" | "england" | "stage";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 140, look: "dawn", place: "street", light: "golden" },     // HOOK: BEAN steps out of his dark doorway into the blinding low sunrise; squint, "ah... ah..." -> SNEEZE on "sneeze" (1.39); "Maybe you're one of them." (3.75): he points at the viewer, sniffling
  { id: 2, a: 140, b: 355, look: "greece", place: "greece", light: "golden" }, // ANCIENT GREECE: Aristotle's theory: the sun heats his nose (glows red, 8.1), the nose SWEATS (drips, 9.45) ... and he sneezes (10.82), scroll flies
  { id: 3, a: 355, b: 700, look: "england", place: "england", light: "golden" },// 1635 ENGLAND: Francis Bacon faces the sun with his eyes CLOSED (16.45): heat (sweat, 17.8) but NO sneeze (19.28: smug "!"); "So it's not your nose." (21.08) "It's your eyes." (22.14): he opens his eyes -> squint
  { id: 4, a: 700, b: 1155, look: "xray", place: "street", light: "day" },     // X-RAY (story turns): inside BEAN's head: the sneeze nerve (green, to the nose) runs right next to the light nerve (gold, from the eyes) "crossed wires" (25.17); bright light floods in (31.38); the signals JUMP across (33.97); the brain's thought bubble "Light? Must be something in the nose!" (37.52)
  { id: 5, a: 1155, b: 1205, look: "flash", place: "street", light: "golden" },// PEAK "Achoo!" (38.65): THE MEME FACE (only here): a colossal sneeze, shockwave, hair blown back, white flash
  { id: 6, a: 1205, b: 1390, look: "dawn", place: "street", light: "golden" }, // FAMILY: Mum + Dad + 4 kids step out of the door into the sun; a chain of sneezes; "fifty percent chance" (44.21): exactly 2 of the 4 kids sneeze, the other 2 look confused
  { id: 7, a: 1390, b: 1755, look: "stage", place: "stage", light: "day" },    // TWIST: 1978 conference: a scientist unveils the official name on a giant banner, word by word (50.21-53.07), the initials A-C-H-O-O light up; "Or for short..." (54.79) beat; "ACHOO." (55.93): BEAN in the front row sneezes on cue; hold
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 6: 6, 7: 8 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["xray", "flash", 1150, 1160, "street"]];
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
/** sneezes: [t, who, size 0..1] (cast draws the build-up "ah..ah.." 0.6 s before t, the blast at t; audio adds sound) */
export const SNEEZES: [number, string, number][] = [
  [W.sneeze0, "bean", 0.6], [W.sneeze1, "aristotle", 0.6], [W.achoo, "bean", 1.0],
  [W.families - 0.3, "dad", 0.5], [W.families + 0.25, "mum", 0.5], [W.fifty - 0.05, "kid1", 0.45], [W.chance + 0.05, "kid3", 0.45],
  [W.achoo2, "bean", 0.7],
];
/** BEAN at the door (shots 1, 6): door open 0..1, step out 0..1 */
export const doorAt = (id: number, t: number) => (id === 1 ? { open: smooth((t + 0.2) / 0.5), step: smooth((t - 0.1) / 0.6) } : id === 6 ? { open: 1, step: smooth((t - shotStart(6)) / 1.2) } : { open: 0, step: 0 });
/** Aristotle's nose (shot 2): heat glow, sweat */
export const noseAt = (id: number, t: number) => (id === 2 ? { heat: smooth((t - (W.heats - 0.2)) / 0.5), sweat: smooth((t - (W.sweats - 0.2)) / 0.4) } : { heat: 0, sweat: 0 });
/** Bacon (shot 3): eyes closed, heat, "no sneeze" beat, eyes open */
export const baconAt = (id: number, t: number) => (id === 3 ? { closed: smooth((t - (W.closed - 0.3)) / 0.2) * (1 - smooth((t - (W.eyes0 - 0.25)) / 0.15)), heat: smooth((t - (W.heat - 0.2)) / 0.5), nosneeze: smooth((t - (W.wasnt - 0.1)) / 0.2) } : { closed: 0, heat: 0, nosneeze: 0 });
/** X-ray nerves (shot 4): show, nerves drawn 0..1 (sneeze nerve, light nerve), light flood, cross-talk jump, thought bubble */
export const nervesAt = (id: number, t: number) => (id === 4 ? {
  show: smooth((t - (shotStart(4) - 0.1)) / 0.5), crossed: smooth((t - (W.crossed - 0.2)) / 0.5),
  sneezeNerve: smooth((t - (W.nerveA - 0.1)) / 0.7), lightNerve: smooth((t - (W.nerveB - 0.1)) / 0.7),
  flood: smooth((t - (W.floods - 0.3)) / 0.5), jump: smooth((t - (W.signals - 0.4)) / 0.5), thought: smooth((t - (W.light1 - 0.15)) / 0.3),
} : { show: 0, crossed: 0, sneezeNerve: 0, lightNerve: 0, flood: 0, jump: 0, thought: 0 });
/** banner (shot 7): reveal, words lit 0..5, initials glow, the "ACHOO" collapse */
export const bannerAt = (id: number, t: number) => {
  if (id !== 7) return { reveal: 0, words: 0, initials: 0, achoo: 0 };
  const cues = [W.autosomal, W.dominant, W.compelling, W.helio, W.outburst];
  let words = 0; for (const c of cues) words += smooth((t - (c - 0.1)) / 0.25);
  return { reveal: smooth((t - (W.official - 0.3)) / 0.6), words, initials: smooth((t - (W.short - 0.3)) / 0.6), achoo: smooth((t - (W.achoo2 - 0.15)) / 0.25) };
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const St = at(STREET), Gr = at(GREECE), En = at(ENGLAND), Sg = at(STAGE);
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
  1: shot(1, [[0, St(0.4, 1.4, 3.4), St(0, 1.1, -0.6), 38], [40, St(0.1, 1.35, 2.6), St(0, 1.15, -0.2), 34], [140, St(0.1, 1.35, 2.5), St(0, 1.15, 0), 32]]),
  2: shot(2, [[140, Gr(2.5, 1.8, 4.5), Gr(0, 1.3, 0), 38], [250, Gr(0.4, 1.6, 2.6), Gr(0, 1.5, 0), 32], [355, Gr(0.4, 1.6, 2.5), Gr(0, 1.5, 0), 32]]),
  3: shot(3, [[355, En(-2.5, 1.8, 4.5), En(0, 1.3, 0), 38], [500, En(0.3, 1.6, 2.7), En(0, 1.5, 0), 32], [700, En(0.3, 1.6, 2.5), En(0, 1.5, 0), 32]]),
  4: shot(4, [[700, St(0.0, 1.5, 2.2), St(0, 1.45, 0), 32], [1155, St(0.0, 1.5, 1.9), St(0, 1.45, 0), 30]]),
  5: shot(5, [[1155, St(0.0, 1.45, 1.8), St(0, 1.4, 0), 32], [1205, St(0.0, 1.45, 2.2), St(0, 1.4, 0), 36]]),
  6: shot(6, [[1205, St(0.0, 1.6, 5.0), St(0, 1.0, -0.5), 40], [1390, St(0.0, 1.5, 4.4), St(0, 1.0, -0.5), 38]]),
  7: shot(7, [[1390, Sg(0, 1.8, 7.0), Sg(0, 2.2, -2.0), 42], [1755, Sg(0, 1.7, 5.5), Sg(0, 2.4, -2.0), 40]]),
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
const DOFK: [number, number, V3?][] = [[0, 1], [140, 0.8], [355, 0.8], [700, 1], [1155, 1], [1205, 0.8], [1390, 0.6]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
