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
export const XFADE: Record<number, number> = { 3: 8, 4: 6, 6: 6, 7: 8 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [
  ["morning", "xray", 252, 270, "home"], ["lab", "peak", 1107, 1160, "lab"], ["peak", "xray", 1287, 1300, "lab"],
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
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ho = at(HOME), La = at(LAB);
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
  1: shot(1, [[0, Ho(-0.4, 1.3, 3.0), Ho(0, 1.0, 0), 38], [60, Ho(-0.2, 1.25, 2.5), Ho(0, 1.05, 0), 34], [255, Ho(-0.1, 1.3, 2.3), Ho(0, 1.1, 0), 32]]),
  2: shot(2, [[255, Ho(-0.1, 1.3, 2.3), Ho(0, 1.1, 0), 32], [380, Ho(0.2, 1.55, 1.6), Ho(0, 1.45, 0), 30], [660, Ho(0.1, 1.4, 2.0), Ho(0, 1.2, 0), 32]]),
  3: shot(3, [[660, La(0, 1.6, 4.2), La(0, 1.1, 0), 40], [790, La(0, 1.4, 3.0), La(0, 1.0, 0), 36]]),
  4: shot(4, [[790, La(0.2, 1.4, 2.8), La(0, 1.0, 0), 36], [1110, La(0.2, 1.4, 2.6), La(0, 1.05, 0), 34]]),
  5: shot(5, [[1110, La(0, 1.4, 2.2), La(0, 1.2, 0), 32], [1290, La(0, 1.4, 2.0), La(0, 1.25, 0), 30]]),
  6: shot(6, [[1290, La(0, 1.5, 1.8), La(0, 1.45, 0), 30], [1370, La(0, 1.5, 1.7), La(0, 1.45, 0), 30]]),
  7: shot(7, [[1370, Ho(-1.0, 1.3, 2.6), Ho(-1.6, 0.8, -0.3), 38], [1530, Ho(-1.2, 1.2, 2.2), Ho(-1.6, 0.8, -0.3), 34]]),
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
const DOFK: [number, number, V3?][] = [[0, 1], [255, 1], [660, 0.6], [790, 1], [1110, 1.2], [1290, 1], [1370, 1]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
