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
import { LOOKS } from "./looks";
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
export const XFADE: Record<number, number> = { 2: 12, 3: 12, 4: 10, 6: 8, 7: 8 }; // dissolves (cam owner): 2 + 3 sun-disc match dissolves, 4 eye-to-eye, 6 the blow-back, 7 the whip
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
  show: smooth((t - (shotStart(4) - 0.55)) / 0.4), crossed: smooth((t - (W.crossed - 0.2)) / 0.5),
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
// CAMERA (cam owner). Rule 2: very few cuts; TRAVEL, LAND, then the key word is said while the camera is STILL.
// Each shot is a path of waypoints [frame, pos, look, fov, opts]; hold() = two identical waypoints (a still landing).
// Waypoints may lie outside the shot's [a, b] so the camera keeps moving through the XFADE dissolves.
// Signature transitions:
//   1->2->3 SUN MATCH-CUTS: BEAN's sunrise -> whip right + tilt up onto the sun disc; dissolve sun-on-sun into Aristotle's
//           sun, tilt down onto Greece; at the end tilt up onto his sun again -> dissolve into Bacon's sun, pan down.
//           look "SUN" = the shot's own camera-relative world sun (world.shotSun), solved here as a fixed point (the
//           sun depends on the shot's mean view direction, which includes the sun move itself), so the disc sits dead
//           centre in both layers of every sun dissolve.
//   3->4    push INTO Bacon's eye ("It's your eyes"), dissolve into the glowing X-ray eye on BEAN's hologram, pull out.
//   4|5     hard cut on the flash (x-ray creep on the itchy nose -> the meme face, held still from the cut).
//   5->6    the ACHOO shockwave blows the camera back (one continuous path across the dissolve) onto the family.
//   6->7    whip-pan right off the family into 1978 (WHIPS), crane in over the audience to the banner.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Ease = "io" | "in" | "in2" | "out" | "out2";
type Aim = V3 | "SUN";
type Opt = { ease?: Ease; roll?: number; via?: V3[] };
type WP = [number, V3, Aim, number, Opt?];
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const St = at(STREET), Gr = at(GREECE), En = at(ENGLAND), Sg = at(STAGE);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ease = (e: Ease | undefined, x: number) => { const u = clamp01(x); return e === "in" ? u * u * u : e === "in2" ? u * u : e === "out" ? 1 - (1 - u) ** 3 : e === "out2" ? 1 - (1 - u) ** 2 : glide(u); };
/** Catmull-Rom through pts at u 0..1 (pass-through crane moves that never stop at the via points) */
const spline = (pts: V3[], u: number): V3 => {
  const n = pts.length - 1, s = clamp01(u) * n, i = Math.min(n - 1, Math.floor(s)), x = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (k: 0 | 1 | 2) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * x + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * x * x + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * x * x * x);
  return [c(0), c(1), c(2)];
};

// ---- the world's camera-relative sun (same formula as world.shotSun / sets.worldSun), solved per shot ----
const SUN_D = 12; // a "SUN" look target sits this far along the sun direction (also the DOF focus: far = sharp sky)
const SUNV = new Map<number, V3>();
const sunFrom = (id: number, fx: number, fz: number): V3 => {
  const L = LOOKS[SHOTS[id - 1].look], az = (L.sunAz * Math.PI) / 180, el = (L.sunEl * Math.PI) / 180;
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  const v: V3 = [hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)], n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
};
/** world sun direction of shot id (unit, toward the sun) */
export const sunDirOf = (id: number): V3 => {
  let v = SUNV.get(id);
  if (v) return v;
  SUNV.set(id, sunFrom(id, 0, -1));
  const { a, b } = SHOTS[id - 1];
  for (let k = 0; k < 8; k++) {
    let fx = 0, fz = 0;
    for (let f = a; f < b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1;
    SUNV.set(id, sunFrom(id, fx / n, fz / n));
  }
  v = SUNV.get(id)!;
  return v;
};
const aimDir = (id: number, pos: V3, a: Aim): { d: V3; len: number } => {
  if (a === "SUN") return { d: sunDirOf(id), len: SUN_D };
  const x = a[0] - pos[0], y = a[1] - pos[1], z = a[2] - pos[2], n = Math.hypot(x, y, z) || 1;
  return { d: [x / n, y / n, z / n], len: n };
};
const path = (id: number, ws: WP[]) => (f: number): Cam => {
  const res = (A: WP, pos: V3, look: V3, fov: number): Cam => ({ pos, look, fov, roll: A[4]?.roll ?? 0 });
  if (f <= ws[0][0]) { const A = ws[0], m = aimDir(id, A[1], A[2]); return res(A, A[1], lerp3(A[1], lerp3(A[1], [A[1][0] + m.d[0], A[1][1] + m.d[1], A[1][2] + m.d[2]], 1), m.len), A[3]); }
  let i = 0;
  while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
  const A = ws[i], B = ws[i + 1], u = ease(B[4]?.ease, (f - A[0]) / Math.max(1e-6, B[0] - A[0]));
  const pos = B[4]?.via ? spline([A[1], ...B[4].via, B[1]], u) : lerp3(A[1], B[1], u);
  let look: V3;
  if (A[2] !== "SUN" && B[2] !== "SUN") look = lerp3(A[2], B[2], u); // fixed targets: the subject stays put on screen
  else { // a pan/tilt to or from the sun: interpolate the view DIRECTION (yaw / pitch), so the whip sweeps evenly
    const a = aimDir(id, A[1], A[2]), b = aimDir(id, B[1], B[2]);
    const ya = Math.atan2(a.d[0], a.d[2]), yb = Math.atan2(b.d[0], b.d[2]);
    let dy = yb - ya; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI;
    const pa = Math.asin(Math.max(-1, Math.min(1, a.d[1]))), pb = Math.asin(Math.max(-1, Math.min(1, b.d[1])));
    const yw = ya + dy * u, pt = pa + (pb - pa) * u, len = a.len + (b.len - a.len) * u;
    look = [pos[0] + Math.sin(yw) * Math.cos(pt) * len, pos[1] + Math.sin(pt) * len, pos[2] + Math.cos(yw) * Math.cos(pt) * len];
  }
  return { pos, look, fov: A[3] + (B[3] - A[3]) * u, roll: (A[4]?.roll ?? 0) + ((B[4]?.roll ?? 0) - (A[4]?.roll ?? 0)) * u };
};
type F = [V3, V3];
/** a framing: the world span y0..y1 at (x, z) is centred in the frame above the caption band (bottom 22 %), ~6 % headroom when it fills it;
 *  az = degrees round the subject (+ = camera to screen right), el = camera rise per metre of distance (looks down),
 *  wmin = the minimum frame WIDTH (m) at the subject (the 9:16 frame is narrow). */
const fr = (o: (x: number, y: number, z: number) => V3, x: number, z: number, y0: number, y1: number, fov: number, az = 0, el = 0.06, wmin = 0): F => {
  const H = Math.max((y1 - y0) / 0.66, wmin / 0.5625), ly = (y0 + y1) / 2 - 0.11 * H, d = H / (2 * Math.tan((fov * Math.PI) / 360)), a = (az * Math.PI) / 180;
  return [o(x + d * Math.sin(a), ly + d * el, z + d * Math.cos(a)), o(x, ly, z)];
};
const hold = (f0: number, f1: number, Fr: F, fov: number, o?: Opt): WP[] => [[f0, Fr[0], Fr[1], fov, o], [f1, Fr[0], Fr[1], fov]];
const key = (f: number, Fr: F, fov: number, o?: Opt): WP => [f, Fr[0], Fr[1], fov, o];
const sun = (f: number, pos: V3, fov: number, o?: Opt): WP => [f, pos, "SUN", fov, o];
const nudge = (p: V3, x: number, y: number, z: number): V3 => [p[0] + x, p[1] + y, p[2] + z];
const SUN_FOV = 30; // every sun-disc dissolve: same lens, disc dead centre -> the discs overlap exactly

// ---- STREET (shots 1, 4, 5, 6): BEAN at St+(0,0,0), head St+(0,1.458,0), hair top ~2.15; door at z -1.2 ----
const HY = 1.458;
const S_OPEN = fr(St, 0.05, -0.6, 0.1, 2.45, 40, -12, 0.08);        // frame 0: the red door opening, BEAN in the dark
const S_SNEEZE = fr(St, 0, 0, 0.5, 2.18, 36, 16, 0.05);             // "sneeze" (42): squint -> ah..ah.. -> ACHOO
const S_THEM = fr(St, 0, 0, 0.8, 2.14, 33, 13, 0.04);               // "them" (112): he points at the viewer
const S_SUNP: V3 = St(1.4, 2.2, 1.1);                               // whip end: up + toward the facade line so the sun clears the
                                                                     // opposite terrace roofs (sun ~10 deg off +x down the street)
// ---- GREECE (shot 2): Aristotle at Gr+(0,0,0), laurel top ~2.05 ----
const G_AR = fr(Gr, 0, 0, -0.05, 2.12, 40, 16, 0.1, 2.2);           // "Aristotle" (182): full figure, sea + Acropolis
const G_NOSE = fr(Gr, 0, 0, 0.95, 2.1, 32, 9, 0.04);                 // "heats" (243) + "sweats" (284): the red nose
const G_SUNP: V3 = Gr(-1.2, 2.5, 5.3);                               // the sun-disc dissolves: clear sightline over the sea, left of the olive tree
const G_SNZ = fr(Gr, 0, 0, 0.5, 2.14, 36, 5, 0.05, 1.45);           // "sneeze" (325): the blast + the flying scroll
// ---- ENGLAND (shot 3): Bacon at En+(0,0,0), hat top ~2.4 ----
const E_WIDE = fr(En, 0, 0, -0.05, 2.5, 40, -8, 0.12, 2.3);         // "Bacon" (410): the garden, the manor
const E_SUNP: V3 = En(-0.6, 3.3, 6.2);                              // the sun dissolve: high over the yew walls, cranes down
const E_MED = fr(En, 0, 0, 0.62, 2.45, 34, -6, 0.05);               // "closed" (494): eyes shut, facing the sun
const E_BOOK = fr(En, -0.08, 0, 0.92, 2.45, 31, 11, 0.08);           // "there" (545) + "wasn't" (579): HEAT ✓ SNEEZE ✗
const E_FACE = fr(En, 0, 0, 1.15, 2.47, 31, 0, 0.03);               // "nose" (632) + "eyes" (664): the glare
const BACON_EYE: V3 = En(-0.09, 1.52, 0.03);                         // his screen-left eye (measured on the 664 still)
// ---- X-RAY (shot 4): the hologram plane is head + HOLO_D (0.2) toward the camera; nerves.ts NERVE_LAYOUT ----
const hd = (x: number, y: number, z: number): V3 => St(x, HY + y, z);
const XEYE: V3 = hd(0.2, 0.055, 0.2);                                // the hologram eye (NERVE_LAYOUT.eye)
const X_EYE0: V3 = hd(0, 0.055, 0.8);                                // straight in front of the head (the hologram yaws to the camera
                                                                     // x: camera x 0 keeps it square), the eye dead centre
const XNOSE: V3 = hd(0.29, -0.035, 0.2);
const X_FULL: F = [hd(0.03, 0.1, 2.7), hd(0.03, 0.1, 0)];          // nerves.ts recommended framing (fov 32)
const X_CROSS: F = [hd(0.06, 0.04, 2.25), hd(0.06, 0.04, 0.2)];     // "crossed wires" (755): eye, crossing, nose + label
const X_FLOOD: F = [hd(0.12, 0.08, 2.1), hd(0.12, 0.08, 0.2)];      // "floods" (941): the eye + the beams from screen right
const X_SIG: F = [hd(0.07, 0.02, 2.15), hd(0.07, 0.02, 0.2)];       // "signals" (1019): sparks jump to the green nerve
     // ---- PEAK (shot 5) + FAMILY (shot 6) ----
const S_MEME = fr(St, 0, 0, 0.82, 2.3, 34, 0, 0.02);                // THE MEME FACE (1160): still from the cut
const S_BLOWN: F = [St(0.25, 2.05, 6.4), St(0, 1.25, -0.4)];         // the shockwave throws the camera back ...
const F_WIDE = fr(St, 0, 0.2, -0.05, 2.35, 46, 0, 0.14, 3.4);       // ... onto the family at the door: "families" (1221)
const K_L = fr(St, -1.1, 1.35, -0.05, 1.55, 40, -5, 0.12, 1.8);     // "fifty" (1326): kid1 sneezes, kid2 doesn't
const K_R = fr(St, 1.1, 1.35, -0.05, 1.55, 40, 5, 0.12, 1.8);       // "chance" (1346): kid3 sneezes, kid4 doesn't
// ---- STAGE (shot 7): deck y 0.6; banner centre (0,2.6,-2.2) 6 x 2.7, text x +-1.3; ACHOO at (0,2.65,-1.5) 2.7 wide ----
const T_ARRIVE: F = [Sg(-0.6, 3.1, 10.6), Sg(0.4, 2.1, -1.5)];        // whip lands: back of the hall, the whole stage
const T_NAME = fr(Sg, 0.75, -1.9, 0.6, 4.05, 40, 3, 0.1, 4.7);      // "official name" (1477): banner unrolls + scientist
const T_WORDS = fr(Sg, 0, -2.2, 1.45, 3.85, 38, 0, 0.09, 2.85);     // the 5 words (1506-1592): the text block, held
const T_SHORT = fr(Sg, -0.12, -2.2, 1.5, 3.8, 36, -3, 0.08, 2.7);    // "short" (1644): A C H O O glow gold
const T_ACHOO: F = [Sg(0.0, 4.6, 9.6), Sg(0.0, 0.97, -1.5)];          // "ACHOO." (1678) -> end: pull back, the 3D ACHOO! over BEAN in the front row (high enough that
                                                                     // BEAN's head clears the row-2 heads behind him)

const CAMS_W: Record<number, WP[]> = {
  1: [key(0, S_OPEN, 40), [34, S_SNEEZE[0], S_SNEEZE[1], 36], ...hold(34, 64, S_SNEEZE, 36), ...hold(98, 117, S_THEM, 33),
    sun(132, S_SUNP, SUN_FOV, { ease: "io" }), sun(152, S_SUNP, SUN_FOV)],
  2: [sun(126, G_SUNP, SUN_FOV), sun(146, G_SUNP, SUN_FOV), key(174, G_AR, 40, { ease: "io" }),
    ...hold(174, 212, G_AR, 40), ...hold(234, 298, G_NOSE, 32), ...hold(314, 334, G_SNZ, 36),
    sun(350, nudge(G_SNZ[0], 0.05, 0.08, 0.1), SUN_FOV), sun(366, nudge(G_SNZ[0], 0.05, 0.08, 0.1), SUN_FOV)],
  3: [sun(340, E_SUNP, SUN_FOV), sun(360, E_SUNP, SUN_FOV), key(398, E_WIDE, 40, { ease: "io" }),
    ...hold(398, 424, E_WIDE, 40), ...hold(480, 508, E_MED, 34), ...hold(532, 592, E_BOOK, 34), ...hold(620, 670, E_FACE, 31),
    [678, nudge(E_FACE[0], -0.03, -0.04, -0.1), BACON_EYE, 30], [706, nudge(BACON_EYE, 0, 0, 0.62), BACON_EYE, 13, { ease: "in2" }]],
  4: [[692, X_EYE0, XEYE, 15], [708, nudge(X_EYE0, 0, 0, -0.1), XEYE, 14, { ease: "out" }],
    [744, X_CROSS[0], X_CROSS[1], 32, { ease: "io" }], ...hold(744, 774, X_CROSS, 32), ...hold(800, 866, X_FULL, 32),
    ...hold(924, 962, X_FLOOD, 32), ...hold(1000, 1036, X_SIG, 32), ...hold(1060, 1160, X_FULL, 32)],
  5: [...hold(1150, 1185, S_MEME, 34), [1216, F_WIDE[0], F_WIDE[1], 46, { ease: "out", via: [S_BLOWN[0]] }]],
  6: [...hold(1150, 1185, S_MEME, 34), [1216, F_WIDE[0], F_WIDE[1], 46, { ease: "out", via: [S_BLOWN[0]] }],
    ...hold(1216, 1296, F_WIDE, 46), ...hold(1316, 1330, K_L, 40), ...hold(1344, 1400, K_R, 40)],
  7: [...hold(1380, 1416, T_ARRIVE, 44), key(1466, T_WORDS, 38, { via: [Sg(-0.25, 3.15, 7.9)] }), ...hold(1466, 1600, T_WORDS, 38),
    ...hold(1630, 1651, T_SHORT, 36), [1673, T_ACHOO[0], T_ACHOO[1], 36], [1800, T_ACHOO[0], T_ACHOO[1], 36]],
};
const CAMS: Record<number, (f: number) => Cam> = {};
for (const k of Object.keys(CAMS_W)) CAMS[+k] = path(+k, CAMS_W[+k]);
/** whip-pans: [boundary frame (= incoming shot's a), axis, degrees (+yaw = pan left), roll]. The outgoing camera
 *  accelerates into the turn over [B-6, B+4], the incoming one arrives already turning over [B-4, B+6]; XFADE blends. */
const WHIPS: [number, "yaw" | "pitch", number, number][] = [[1390, "yaw", -90, -0.08]];
const whipOffset = (id: number, f: number): { yaw: number; pitch: number; roll: number } => {
  const o = { yaw: 0, pitch: 0, roll: 0 };
  for (const [B, axis, deg, rl] of WHIPS) {
    const inc = SHOTS.find((s) => s.a === B)!.id;
    let k = 0;
    if (id === inc - 1 && f > B - 7) k = clamp01((f - (B - 7)) / 11) ** 2.4;
    else if (id === inc && f < B + 7) k = -((1 - clamp01((f - (B - 4)) / 11)) ** 2.4);
    if (!k) continue;
    o[axis] += deg * k;
    o.roll += rl * Math.sin(Math.PI * Math.abs(k)) * Math.sign(k || 1);
  }
  return o;
};
/** camera kicks: [frame, amplitude] (never on a key word): the ACHOO shockwave hitting the lens as it blows back */
const KICKS: [number, number][] = [[1186, 0.05]];
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
    if (d >= 0 && d < 12) {
      const s = a * Math.sin(Math.PI * d * 0.9) * Math.exp(-d / 3);
      const dist = Math.hypot(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]);
      c.look = [c.look[0] + s * dist * 0.25, c.look[1] + s * dist * 0.5, c.look[2]];
      c.roll += s * 0.4;
    }
  }
  return c;
};
// mild lens blur only (the user: backgrounds must NOT be blurry): [frame, cInf, focus?]. Focus = the look point.
const DOFK: [number, number, V3?][] = [[0, 0.9], [126, 0.6], [174, 0.8], [340, 0.6], [398, 0.8], [692, 1.0], [1150, 1.1], [1186, 0.8], [1380, 0.8], [1640, 0.7]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
