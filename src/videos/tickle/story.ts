// "Why You Can't Tickle Yourself": a funny science short timed to ~/tickle-short/voice/words.json (48.9 s, voice "Liam").
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist. 2 CAMERA very few cuts: travel,
// LAND, then the important word is said while the camera is still. 3 LIGHT low sun, long shadows, blue shade, haze; the
// light changes when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 5 "it tickled").
// Every video carries the Bean Stories WATERMARK (common/Watermark.tsx, in Tickle.tsx).
// World units metres. PLACES (ALL NEW sets, nothing reused from earlier shorts):
//   HOME (0,0,0)       BEAN's cosy living room in the early-morning golden hour: a big window with low sun stripes,
//                      a squashy armchair at HOME+(-1.6,0,-0.3) (outro), a rug, bookshelves, plants, a lamp, a TV
//                      cabinet, posters; floor y=0, back wall z=-1.4, side walls x=+-3.2, the camera side (+z) open.
//                      BEAN stands at HOME+(0,0,0) for the hook.
//   LAB  (-3000,0,0)   a 1990s London neuroscience lab (UCL vibe): beige computers, a CRT monitor, cables, a whiteboard
//                      with brain diagrams, a window with blinds; the TICKLE ROBOT rig on the lab table at RIG (top y
//                      0.78): a handle/joystick robot for the left hand, a second robot arm with a soft foam tip over
//                      the right palm, a big DELAY dial (0 -> 0.3 s) + a CRT readout.
export const FPS = 30;
export const TOTAL = 1530;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const HOME: V3 = [0, 0, 0];
export const LAB: V3 = [-3000, 0, 0];
export const RIG: V3 = [LAB[0], 0.78, LAB[2]];

/** word cues (s) */
export const W = {
  tickle0: 0.41, yourself: 0.72, wait: 2.79, nothing: 4.02, right: 4.61, notyou: 6.13, brain0: 7.55, move: 9.58,
  cerebellum: 11.12, predicts: 11.68, feel: 13.22, turns: 14.76, down: 15.6, fingers: 17.44, ribs: 18.22, knows: 19.42,
  surprise: 20.74, notickle: 21.61, scientists: 22.65, london: 23.35, beat: 24.14, robot: 26.11, handle: 27.34,
  tickles: 29.33, otherhand: 30.04, barely: 31.77, tickled0: 32.1, delay: 34.38, fraction: 35.78, second: 36.4,
  suddenly: 37.79, tickled: 39.24, longer: 40.58, delay2: 40.99, more: 41.48, tickled2: 41.8, keepup: 44.01,
  want: 45.53, robot2: 47.22, slow: 48.34, one: 48.62,
};
export const FLASHES: number[] = [];

export type Look = "morning" | "xray" | "lab" | "reveal" | "peak";
export type Place = "home" | "lab";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 255, look: "morning", place: "home", light: "golden" },  // HOOK "Try to tickle yourself. Go on, I'll wait.": BEAN wiggles his fingers at his own ribs, stone-faced; "Nothing, right?" (4.61) shrug; "That's not you." (6.13) "That's your brain." (7.55): he taps his head
  { id: 2, a: 255, b: 660, look: "xray", place: "home", light: "day" },      // X-RAY: his glowing brain; the CEREBELLUM lights up + label (11.12); a "forecast" card of the touch (predicts 11.68); a volume knob turns the feeling DOWN (15.6); his own fingers come for his ribs (17.44); the brain already KNOWS (19.42: smug brain with a "SEEN IT" stamp); "No surprise. No tickle." (21.61) deadpan BEAN
  { id: 3, a: 660, b: 790, look: "reveal", place: "lab", light: "day" },    // TURN (light changes): the London lab; two scientists whip a sheet off the TICKLE ROBOT on "robot" (26.11): spotlight + sparkles
  { id: 4, a: 790, b: 1110, look: "lab", place: "lab", light: "day" },      // the test: BEAN moves the handle (27.34) -> the robot's foam tip tickles his other palm (29.33); "barely tickled" (32.1): bored; a scientist turns the DELAY dial (34.38) to 0.2 s (36.4)
  { id: 5, a: 1110, b: 1290, look: "peak", place: "lab", light: "day" },    // PEAK: "And suddenly..." (37.79) beat of silence -> "it tickled." (39.24): THE MEME FACE (only here): BEAN explodes laughing; "the longer the delay" (40.6): the dial cranks up -> even harder (41.8), tears of laughter
  { id: 6, a: 1290, b: 1370, look: "xray", place: "lab", light: "day" },    // X-RAY in the lab: his brain panting + sweating, a "LOADING..." spinner: "couldn't keep up" (44.01)
  { id: 7, a: 1370, b: 1530, look: "morning", place: "home", light: "golden" }, // OUTRO: BEAN at home in the armchair; a tiny, very slow robot creeps up and (on "slow" 48.34) tickles him: a happy giggle; hold
];
export const XFADE: Record<number, number> = { 3: 12, 4: 6, 5: 8, 6: 6, 7: 8 }; // dissolves (cam owner): 3 brain push -> whiteboard brain, 4 + 6 continuous softeners, 5 + 7 whip-pans
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [
  ["morning", "xray", 252, 270, "home"], ["lab", "reveal", 650, 735, "lab"], ["lab", "peak", 1107, 1160, "lab"], ["peak", "xray", 1287, 1300, "lab"],
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
/** BEAN's self-tickle attempts (shots 1-2): fingers wiggle at his ribs; 0..1 reach */
export const selfTickleAt = (id: number, t: number) => (id === 1 ? { reach: smooth((t - 0.3) / 0.4) * (1 - smooth((t - (W.nothing + 0.3)) / 0.4)), wiggle: 1 } : id === 2 ? { reach: smooth((t - (W.fingers - 0.3)) / 0.5), wiggle: 1 } : { reach: 0, wiggle: 0 });
/** X-ray brain (shots 2 + 6): show, cerebellum glow, forecast card, volume knob (1 = full, 0 = down), "knows" stamp, panting */
export const brainAt = (id: number, t: number) => {
  if (id === 2) return { show: smooth((t - (shotStart(2) - 0.1)) / 0.4), cereb: smooth((t - (W.cerebellum - 0.1)) / 0.3), forecast: smooth((t - (W.predicts - 0.1)) / 0.4) * (1 - smooth((t - (W.turns - 0.3)) / 0.3)), volume: 1 - smooth((t - W.turns) / 0.9), knows: smooth((t - (W.knows - 0.1)) / 0.25), panting: 0 };
  if (id === 6) return { show: smooth((t - (shotStart(6) - 0.1)) / 0.3), cereb: 1, forecast: 0, volume: 1, knows: 0, panting: 1 };
  return { show: 0, cereb: 0, forecast: 0, volume: 1, knows: 0, panting: 0 };
};
/** the tickle robot (shots 3-6): sheet off, handle motion, foam tip contact, delay (s) on the dial, tickle strength 0..1 */
export const robotAt = (id: number, t: number) => {
  const sheet = id === 3 ? smooth((t - (W.robot - 0.35)) / 0.45) : id > 3 ? 1 : 0;
  const run = id === 4 ? smooth((t - (W.handle - 0.2)) / 0.4) : id === 5 || id === 6 ? 1 : 0;
  const delay = id === 4 ? 0.2 * smooth((t - W.delay) / (W.second - W.delay)) : id === 5 ? 0.2 + 0.1 * smooth((t - W.longer) / 1.0) : id === 6 ? 0.3 : 0;
  const tickle = id === 4 ? 0.12 * smooth((t - (W.tickles - 0.2)) / 0.4) : id === 5 ? 0.12 + 0.88 * smooth((t - (W.tickled - 0.15)) / 0.2) : id === 6 ? 1 : 0;
  return { sheet, run, delay, tickle, phase: t * 3.2 };
};
/** the little slow robot at home (shot 7): creeps 0..1, tickles from "slow" */
export const slowBotAt = (id: number, t: number) => (id === 7 ? { creep: smooth((t - shotStart(7)) / (W.slow - shotStart(7))), tickle: smooth((t - (W.slow - 0.1)) / 0.3) } : { creep: 0, tickle: 0 });

// ---------------- camera ----------------
// CAMERA (cam owner). Rule 2: very few cuts; TRAVEL, LAND, then the key word is said while the camera is STILL.
// Each shot is a path of waypoints [frame, pos, look, fov, opts]; hold() = two identical waypoints (a still landing).
// Waypoints may lie outside the shot's [a, b] so the camera keeps moving through the XFADE dissolves.
// Transitions: 1->2 one continuous camera (the room dims to x-ray) | 2->3 push INTO the glowing hologram brain, dissolve,
//   come OUT of the brain drawn on the lab whiteboard and crane back over the table to the reveal | 3->4 continuous |
//   4->5 whip-pan left off the DELAY dial onto BEAN | 5->6 continuous (x-ray dissolve) | 6->7 whip-pan right, home.
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Ease = "io" | "in" | "in2" | "out";
type WP = [number, V3, V3, number, { ease?: Ease; roll?: number; via?: V3[] }?];
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ho = at(HOME), La = at(LAB);
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const ease = (e: Ease | undefined, x: number) => { const u = clamp01(x); return e === "in" ? u * u * u : e === "in2" ? u * u : e === "out" ? 1 - (1 - u) ** 3 : glide(u); };
/** Catmull-Rom through pts at u 0..1 (pass-through crane moves that never stop at the via points) */
const spline = (pts: V3[], u: number): V3 => {
  const n = pts.length - 1, s = clamp01(u) * n, i = Math.min(n - 1, Math.floor(s)), x = s - i;
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)];
  const c = (k: 0 | 1 | 2) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * x + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * x * x + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * x * x * x);
  return [c(0), c(1), c(2)];
};
const path = (ws: WP[]) => (f: number): Cam => {
  if (f <= ws[0][0]) return { pos: ws[0][1], look: ws[0][2], fov: ws[0][3], roll: ws[0][4]?.roll ?? 0 };
  let i = 0;
  while (i < ws.length - 2 && f >= ws[i + 1][0]) i++;
  const A = ws[i], B = ws[i + 1], u = ease(B[4]?.ease, (f - A[0]) / (B[0] - A[0]));
  const pos = B[4]?.via ? spline([A[1], ...B[4].via, B[1]], u) : lerp3(A[1], B[1], u);
  return { pos, look: lerp3(A[2], B[2], u), fov: A[3] + (B[3] - A[3]) * u, roll: (A[4]?.roll ?? 0) + ((B[4]?.roll ?? 0) - (A[4]?.roll ?? 0)) * u };
};
type F = [V3, V3];
/** a framing: the world span y0..y1 at (x, z) fills the frame above the caption band (bottom 22 %) with ~8 % headroom;
 *  az = degrees round the subject (+ = camera to screen right), el = camera rise per metre of distance (looks down),
 *  wmin = the minimum frame WIDTH (m) at the subject (the 9:16 frame is narrow: BEAN's head + hair is ~0.8 m wide). */
const fr = (o: (x: number, y: number, z: number) => V3, x: number, z: number, y0: number, y1: number, fov: number, az = 0, el = 0.06, wmin = 0): F => {
  const H = Math.max((y1 - y0) / 0.68, wmin / 0.5625), top = y1 + 0.08 * H, ly = top - H / 2, d = H / (2 * Math.tan((fov * Math.PI) / 360)), a = (az * Math.PI) / 180;
  return [o(x + d * Math.sin(a), ly + d * el, z + d * Math.cos(a)), o(x, ly, z)];
};
const hold = (f0: number, f1: number, Fr: F, fov: number, o?: { ease?: Ease; via?: V3[] }): WP[] => [[f0, Fr[0], Fr[1], fov, o], [f1, Fr[0], Fr[1], fov]];
const key = (f: number, Fr: F, fov: number, o?: { ease?: Ease; via?: V3[] }): WP => [f, Fr[0], Fr[1], fov, o];

// ---- HOME (shots 1-2): BEAN stands at H+(0,0,0), head H+(0,1.458,0), hair/antenna top ~2.05 ----
const HY = 1.458;
const H_OPEN = fr(Ho, 0.05, 0, 0.35, 2.05, 40, -16, 0.1);   // frame 0: wider, off-axis, already gliding in
const H_HOOK = fr(Ho, 0, 0, 0.62, 2.05, 36, -5);           // "tickle yourself" (22): fingers at the ribs + stone face
const H_WAIT = fr(Ho, 0.02, 0, 0.72, 2.02, 34, 9);          // "I'll wait" (84)
const H_SHRUG = fr(Ho, 0, 0, 0.42, 2.06, 36, -3);           // "Nothing, right?" (138): the shrug
const H_BRAIN = fr(Ho, 0.04, 0, HY - 0.36, HY + 0.72, 32, 2, 0.06, 1.25); // "brain" (227) + x-ray open: head, hologram, thought card
const X_CEREB = fr(Ho, -0.1, 0, HY - 0.3, HY + 0.5, 30, -12, 0.06, 1.08); // "cerebellum" (334): the gold lobe + label
const X_KNOB = fr(Ho, 0.02, 0, HY - 0.3, HY + 0.76, 32, 10, 0.06, 1.05);  // "down" (468): the volume knob on the thought card
const X_RIBS = fr(Ho, 0, 0, 0.72, HY + 0.74, 36, -4);       // "ribs" (547) + "knows" (583): fingers at the ribs + SEEN IT
const X_NO = fr(Ho, -0.03, 0, HY - 0.33, HY + 0.7, 31, 0, 0.06, 0.98);  // "No tickle" (648): deadpan + smug brain
const BRAIN_C: V3 = Ho(-0.01, HY + 0.12, 0.14);                // the hologram brain centre (brain.ts LAYOUT.brain, HOLO_D)
const BRAIN_IN: V3 = Ho(0.0, HY + 0.13, 0.9);                  // end of the push: 0.75 m from the hologram, fov 36

// ---- LAB (shots 3-6): BEAN on the stool L+(0,0,0.55), head ~L+(0,1.30,0.55); rig on the table (top 0.78) ----
const LY = 1.3;
const BOARD_BRAIN: V3 = La(-0.56, 1.64, -1.95);                 // the brain drawn on the whiteboard (sets.ts boardTex)
const L_BOARD: F = [La(-0.53, 1.68, -0.66), BOARD_BRAIN];      // tight on the drawing (behind the scientists), fov 34
const L_LONDON = fr(La, 0, -0.45, 0.25, 2.55, 40, 0, 0.16);    // "London" (700): the whole lab, sheet-covered rig
const L_ROBOT = fr(La, 0.27, -0.15, 0.6, 2.2, 40, 16, 0.34, 2.3); // QA2: was x 0.05 wmin 1.95 (SCI_B at the table end now)       // "robot" (783): the sheet whips off, spotlight
const L_HANDLE = fr(La, 0.22, 0.45, 0.62, 1.82, 34, 26, 0.16, 1.4);    // "handle" (820): his fist on the joystick + face
const L_PALM = fr(La, -0.24, 0.45, 0.58, 1.82, 34, -26, 0.16, 1.4);    // "other hand" (901): foam tip on his palm
const L_BARELY = fr(La, -0.02, 0.5, 0.7, 1.78, 32, 4, 0.1, 1.35);        // "barely" (963): bored face + both hands
const L_DELAY = fr(La, 0.84, -0.1, 0.9, 2.02, 34, 6, 0.18, 1.45); // QA2: was az 52 (console side-on, SCI_B hidden)   // "delay" (1031): SCI_B's hand on the dial
const L_DIAL = fr(La, 0.52, -0.08, 1.0, 1.62, 30, 8, 0.06);      // "second" (1092): the dial + CRT "DELAY: 0.20 s"
const L_FACE = fr(La, 0, 0.55, LY - 0.4, LY + 1.0, 34, -3, 0.05, 1.25); // "suddenly" (1134) + THE MEME FACE (1177) + HAHA bursts
const L_MORE = fr(La, 0.22, 0.2, 0.6, LY + 1.0, 38, 12, 0.14, 1.75);       // "more" (1254): dial cranked, scientists amazed
const L_XRAY = fr(La, -0.03, 0.55, LY - 0.36, LY + 0.74, 32, 0, 0.04, 1.08); // "keep up" (1320): panting brain + LOADING card

// ---- HOME outro (shot 7): BEAN in the armchair (card H+(-1.6,0,0.15), head ~1.13); slow robot on the floor ----
const O_CHAIR = fr(Ho, -1.5, 0.15, 0.25, 1.62, 36, -6, 0.08);    // whip lands: BEAN in the armchair
const O_BOT = fr(Ho, -0.98, 0.42, -0.06, 0.62, 34, 8, 0.36, 0.82); // QA: tighter on the little robot        // "robot" (1417): tilt down to the creeping toy
const O_END = fr(Ho, -1.36, 0.2, -0.24, 1.62, 38, 2, 0.18);     // "slow one" (1450) -> end: BEAN giggling + the robot

const CAMS: Record<number, (f: number) => Cam> = {
  1: path([key(0, H_OPEN, 40), ...hold(20, 50, H_HOOK, 36), ...hold(78, 102, H_WAIT, 34), ...hold(130, 168, H_SHRUG, 36),
    ...hold(214, 262, H_BRAIN, 32)]),
  2: path([...hold(214, 300, H_BRAIN, 32), ...hold(326, 350, X_CEREB, 30), ...hold(374, 424, H_BRAIN, 32), ...hold(458, 490, X_KNOB, 32),
    ...hold(536, 606, X_RIBS, 36), ...hold(632, 652, X_NO, 31), [667, BRAIN_IN, BRAIN_C, 36, { ease: "in2" }]]),
  3: path([[654, L_BOARD[0], L_BOARD[1], 34], [710, L_LONDON[0], L_LONDON[1], 40, { via: [La(-0.22, 2.2, -0.45), La(-0.02, 2.62, 1.5)] }],
    [742, L_LONDON[0], L_LONDON[1], 40], ...hold(768, 800, L_ROBOT, 40)]),
  4: path([...hold(768, 800, L_ROBOT, 40), ...hold(814, 860, L_HANDLE, 34), ...hold(890, 926, L_PALM, 34), ...hold(950, 990, L_BARELY, 32),
    ...hold(1022, 1060, L_DELAY, 34), ...hold(1084, 1110, L_DIAL, 30)]),
  5: path([...hold(1112, 1200, L_FACE, 34), ...hold(1240, 1296, L_MORE, 38)]),
  6: path([...hold(1240, 1290, L_MORE, 38), ...hold(1312, 1370, L_XRAY, 32)]),
  7: path([...hold(1370, 1398, O_CHAIR, 36), ...hold(1412, 1434, O_BOT, 36), ...hold(1448, 1530, O_END, 38)]),
};
/** whip-pans: [boundary frame (= incoming shot's a), axis, degrees (+yaw = pan left), roll]. The outgoing camera
 *  accelerates into the turn over [B-6, B+4], the incoming one arrives already turning over [B-4, B+6]; XFADE blends. */
const WHIPS: [number, "yaw" | "pitch", number, number][] = [[1110, "yaw", 70, -0.08], [1370, "yaw", -80, 0.1]];
const whipOffset = (id: number, f: number): { yaw: number; pitch: number; roll: number } => {
  const o = { yaw: 0, pitch: 0, roll: 0 };
  for (const [B, axis, deg, rl] of WHIPS) {
    const inc = SHOTS.find((s) => s.a === B)!.id;
    let k = 0;
    if (id === inc - 1 && f > B - 6) k = clamp01((f - (B - 6)) / 10) ** 2.4;
    else if (id === inc && f < B + 6) k = -((1 - clamp01((f - (B - 4)) / 10)) ** 2.4);
    if (!k) continue;
    o[axis] += deg * k;
    o.roll += rl * Math.sin(Math.PI * Math.abs(k)) * Math.sign(k || 1);
  }
  return o;
};
/** camera kicks: [frame, amplitude]. None: rule 2 wants the camera STILL on every key word (sheet + meme included). */
const KICKS: [number, number][] = [];
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
const DOFK: [number, number, V3?][] = [[0, 0.9], [255, 0.9], [656, 0.7], [790, 0.9], [1110, 1.1], [1290, 0.9], [1370, 0.9]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
