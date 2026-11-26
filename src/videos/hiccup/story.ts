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
export const FLASHES: number[] = [911];

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
export const XFADE: Record<number, number> = { 2: 6, 3: 10, 4: 12, 5: 8 }; // cam owner: 2 = the scan wipe (holo xrayAt.show 109..121; short, BEAN's pose differs), 3 = tank water -> pond water, 4 = the morph match, 5 = the whip
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
// CAMERA (cam owner). Rule 2: very few cuts; TRAVEL, LAND, then the key word is said while the camera is STILL.
// Each shot is a path of waypoints [frame, pos, look, fov, opts]; hold() = two identical waypoints (a still landing).
// Waypoints may lie outside the shot's [a, b] so the camera keeps moving through the XFADE dissolves.
// Landings (word -> frame): HIC 8 | water 85 | diaphragm 143 | gasp 212, shut 270, Hic 302 | that? 370 | tadpoles 460,
//   gulp 508 | shut 558 | gills 606, lungs 641 (+ the morph) | it 736 | drink 794 | stop 874 | 1922 916 | hiccuping 1000 |
//   sixty-eight years 1051-1066 | hics 1132 (THE MEME FACE + 430,000,000, held to the end).
// Transitions:
//   1->2 X-RAY SCAN WIPE: one continuous camera path shared by shots 1 + 2 (W12), still travelling from the wall shadow
//        onto the chest while the holo's scan line wipes the X-ray in (xrayAt.show 109..121 = the 12-frame XFADE).
//   2->3 DIVE: after "Hic" the camera swings round BEAN's screen-left side and accelerates INTO the glowing fish tank on
//        the counter; the dissolve (tank water -> pond water) happens as the lens closes on the front glass, and shot 3
//        comes out of it underwater, still flying forward, and decelerates onto the pond.
//   3->4 MORPH MATCH: shot 3 ends on MATCH(tadpole head), shot 4 starts on MATCH(BEAN's head): same lens, same
//        head-relative framing, so the tadpole -> BEAN morph (morphAt 645..675) dissolves head on head.
//   4->5 WHIP to 1922 (WHIPS): the kitchen whips away, Iowa whips in and lands still before "1922".
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Ease = "io" | "in" | "in2" | "out" | "out2";
type Opt = { ease?: Ease; roll?: number; via?: V3[] };
type WP = [number, V3, V3, number, Opt?];
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ki = at(KITCHEN), Po = at(POND), Fa = at(FARM);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ease = (e: Ease | undefined, x: number) => { const u = clamp01(x); return e === "in" ? u * u * u : e === "in2" ? u * u : e === "out" ? 1 - (1 - u) ** 3 : e === "out2" ? 1 - (1 - u) ** 2 : glide(u); };
/** Catmull-Rom through pts at u 0..1 (pass-through moves that never stop at the via points) */
const spline = (pts: V3[], u: number): V3 => {
  const n = pts.length - 1, s = clamp01(u) * n, i = Math.min(n - 1, Math.floor(s)), x = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (k: 0 | 1 | 2) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * x + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * x * x + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * x * x * x);
  return [c(0), c(1), c(2)];
};
const path = (ws: WP[]) => (f: number): Cam => {
  if (f <= ws[0][0]) { const A = ws[0]; return { pos: A[1], look: A[2], fov: A[3], roll: A[4]?.roll ?? 0 }; }
  let i = 0;
  while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
  const A = ws[i], B = ws[i + 1], u = ease(B[4]?.ease, (f - A[0]) / Math.max(1e-6, B[0] - A[0]));
  const pos = B[4]?.via ? spline([A[1], ...B[4].via, B[1]], u) : lerp3(A[1], B[1], u);
  return { pos, look: lerp3(A[2], B[2], u), fov: A[3] + (B[3] - A[3]) * u, roll: (A[4]?.roll ?? 0) + ((B[4]?.roll ?? 0) - (A[4]?.roll ?? 0)) * u };
};
type F = [V3, V3];
/** a framing: the world span y0..y1 at (x, z) is centred in the frame above the caption band (bottom 22 %), ~6 % headroom
 *  when it fills it; az = degrees round the subject (+ = camera to screen right), el = camera rise per metre of distance,
 *  wmin = the minimum frame WIDTH (m) at the subject (the 9:16 frame is narrow). */
const fr = (o: (x: number, y: number, z: number) => V3, x: number, z: number, y0: number, y1: number, fov: number, az = 0, el = 0.04, wmin = 0): F => {
  const H = Math.max((y1 - y0) / 0.66, wmin / 0.5625), ly = (y0 + y1) / 2 - 0.11 * H, d = H / (2 * Math.tan((fov * Math.PI) / 360)), a = (az * Math.PI) / 180;
  return [o(x + d * Math.sin(a), ly + d * el, z + d * Math.cos(a)), o(x, ly, z)];
};
const hold = (f0: number, f1: number, Fr: F, fov: number, o?: Opt): WP[] => [[f0, Fr[0], Fr[1], fov, o], [f1, Fr[0], Fr[1], fov]];
const key = (f: number, Fr: F, fov: number, o?: Opt): WP => [f, Fr[0], Fr[1], fov, o];

// ---- KITCHEN (shots 1, 2, 4): BEAN at Ki(0,0,0), head Ki(0,1.46,0), hair tip ~2.1; wall z -0.95; tank x -0.95..-0.35 ----
const K_HIC = fr(Ki, 0.05, 0, 0.55, 2.2, 36, 10, 0.04);              // "HIC" (8): mid-sip, the can splashes, HIC! card
const K_WALL = fr(Ki, 0.45, -0.3, 0.35, 2.45, 40, -4, 0.05, 1.9);    // "water" (85): BEAN + the tadpole shadow on the wall
// X-RAY (shot 2): straight on (the holo yaws to the camera); torso box chest -0.4..+0.36, pills inside, head kept whole
const X_FULL = fr(Ki, 0, 0, 0.6, 2.1, 38, 0, 0.02);                  // "diaphragm" (143): the whole cutaway + DIAPHRAGM pill
const X_THR = fr(Ki, 0, 0, 0.72, 2.16, 36, 0, 0.02);                 // "gasp" (212) "shut" (270) "Hic" (302): windpipe + door
const TANK_SEE: F = [Ki(-0.7, 1.17, 0.85), Ki(-0.65, 1.12, -0.62)]; // swing round BEAN's screen-left side onto the glowing tank (0.7 m off him)
const TANK_IN: F = [Ki(-0.65, 1.12, -0.37), Ki(-0.65, 1.11, -0.78)]; // ... then accelerate INTO it: the lens 9 cm off the front glass (z -0.46)
// MORPH MATCH: the same head-relative framing for the tadpole (shot 3) and BEAN (shot 4)
// (frame 2.65 m tall at the head, head at ~42 % from the top: the whole gill diagram fits, BEAN is a full-figure medium)
const MATCH = (o: (x: number, y: number, z: number) => V3, hx: number, hy: number): F => { const H = 2.65, d = H / (2 * Math.tan((40 * Math.PI) / 360)), ly = hy - 0.08 * H; return [o(hx, ly + 0.02 * d, d), o(hx, ly, 0)]; };
const K_MORPH = MATCH(Ki, -0.09, 1.46);                              // BEAN's head 0.09 m right of centre, like the tadpole's
const K_IT = fr(Ki, 0.05, 0, 0.6, 2.2, 36, -8, 0.04);                // "it" (736): HIC
const K_CAN = fr(Ki, 0.16, 0, 0.75, 2.18, 34, 14, 0.04);             // "drink" (794): the betrayed look at the lifted can
const K_STOP = fr(Ki, 0.05, 0, 0.9, 2.38, 34, 4, 0.03);             // "stop" (874): worried face, hic hic, sweat
// ---- POND (shot 3): tadpole card centre Po(0,1.2,0) (head +x, head centre local (0.12, 0)); surface y 2.2 ----
const P_IN: F = [Po(0, 1.5, 7.6), Po(0, 1.38, 0)];                   // out of the tank dissolve: still flying forward
const P_VISTA: F = [Po(-0.4, 1.5, 4.7), Po(0.5, 1.3, 0)];           // "that?" (370): the pond, rays (the waiting tadpole at x -1.6 off frame left)
const G_WIDE = fr(Po, 0.1, 0, 0.75, 1.85, 38, 4, 0.03, 1.55);        // "tadpoles" (460) "gulp" (508): tadpole + diagram
const G_SNAP = fr(Po, 0.16, 0, 0.8, 1.72, 34, 0, 0.02, 1.2);       // "shut" (558): throat door inset + head
const P_MORPH = MATCH(Po, 0.12, 1.24);  /* head at local x 0.21 */                               // "gills" (606) "lungs" (641) + the morph
// ---- FARM (shot 5): Osborne Fa(0,0,0) hat top ~1.85; hog Fa(0.8,0.18,-0.3); calendar (-0.55,1.745,-2.15); odometer (0,1.95,0.35) ----
const F_1922 = fr(Fa, 0.2, -0.6, -0.05, 2.35, 40, -12, 0.08, 2.3);   // "1922" (916): farm, scale + hog, calendar, barn
const F_HIC = fr(Fa, 0.35, 0, 0.1, 2.05, 38, -6, 0.05, 1.6);         // "hiccuping" (1000): Osborne + the hog
const F_YEARS = fr(Fa, -0.25, -0.3, 0.35, 2.55, 36, -8, 0.04, 1.8);    // "sixty-eight years" (1051-1066): calendar + odometer
const F_MEME = fr(Fa, 0.03, 0.2, 0.75, 2.38, 36, 5, 0.03);             // "hics" (1132): THE MEME FACE + 430,000,000, held

const W12: WP[] = [...hold(0, 22, K_HIC, 36), ...hold(60, 100, K_WALL, 40), ...hold(132, 165, X_FULL, 38), ...hold(196, 312, X_THR, 36),
  key(328, TANK_SEE, 32), key(340, TANK_IN, 28, { ease: "in2" })];
const CAMS_W: Record<number, WP[]> = {
  1: W12,
  2: W12,
  3: [[330, P_IN[0], P_IN[1], 30], key(362, P_VISTA, 40, { ease: "out" }), ...hold(362, 396, P_VISTA, 40),
    ...hold(452, 526, G_WIDE, 36), ...hold(548, 576, G_SNAP, 34), ...hold(600, 680, P_MORPH, 40)],
  4: [...hold(640, 688, K_MORPH, 40), ...hold(722, 752, K_IT, 36), ...hold(782, 818, K_CAN, 34), ...hold(856, 930, K_STOP, 34)],
  5: [...hold(890, 958, F_1922, 40), ...hold(986, 1018, F_HIC, 38), ...hold(1042, 1080, F_YEARS, 36), ...hold(1116, 1240, F_MEME, 36)],
};
const CAMS: Record<number, (f: number) => Cam> = {};
for (const k of Object.keys(CAMS_W)) CAMS[+k] = path(CAMS_W[+k]);
/** whip-pans: [boundary frame (= incoming shot's a), axis, degrees (+yaw = pan left), roll]. The outgoing camera
 *  accelerates into the turn over [B-14, B-2], the incoming one arrives already turning and settles over [B-6, B+4]
 *  (so it is STILL 2 frames before "1922"); XFADE 5 (8) blends at full speed. */
const WHIPS: [number, "yaw" | "pitch", number, number][] = [[910, "yaw", -90, -0.08]];
const whipOffset = (id: number, f: number): { yaw: number; pitch: number; roll: number } => {
  const o = { yaw: 0, pitch: 0, roll: 0 };
  for (const [B, axis, deg, rl] of WHIPS) {
    const inc = SHOTS.find((s) => s.a === B)!.id;
    let k = 0;
    if (id === inc - 1 && f > B - 14) k = clamp01((f - (B - 14)) / 12) ** 2.4;
    else if (id === inc && f < B + 4) k = -((1 - clamp01((f - (B - 6)) / 10)) ** 2.4);
    if (!k) continue;
    o[axis] += deg * k;
    o.roll += rl * Math.sin(Math.PI * Math.abs(k)) * Math.sign(k || 1);
  }
  return o;
};
/** camera kicks: [frame, amplitude] (never on a key word): the last giant HIC (after "hics" has landed) */
const KICKS: [number, number][] = [[1138, 0.025]];
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
// mild lens blur only (the user: backgrounds must NOT be blurry; cInf <= 1.2): [frame, cInf, focus?]. Focus = the look point.
const DOFK: [number, number, V3?][] = [[0, 0.8], [115, 0.6], [335, 0.6], [660, 0.8], [910, 0.8], [1110, 0.9]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
