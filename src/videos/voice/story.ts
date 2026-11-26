// "Your Voice on Recordings": a funny science short timed to ~/voice-short/voice/words.json (37.7 s, voice "Liam").
// The owner's growth plan: SHORT (40 s), relatable, comment-bait ("NO!"). Rendered in the CLOUD (not the owner's Mac).
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist (you rate your own voice highest).
// 2 CAMERA very few cuts: travel, LAND, then the important word is said while the camera is still. 3 LIGHT low sun,
// long shadows, blue shade, haze; the light changes when the story turns. 4 FACES one feeling per line; the big meme
// face ONLY at the peak (shot 4 "higher than everyone else's": BEAN falls in love with his own voice). Watermark on.
// World units metres. PLACES (ALL NEW):
//   ROOM (0,0,0)       BEAN's cosy bedroom at golden-hour sunset: bed, desk with a laptop, posters, fairy lights, a
//                      window with low sun stripes; BEAN stands at ROOM+(0,0,0) holding his phone. Floor y=0, back wall
//                      z=-1.4, camera side +z open.
//   LAB  (3000,0,0)    a 2013 university voice-perception lab: a padded LISTENING BOOTH with a desk + headphones, a big
//                      wall RATING BOARD (voice A..F with bars), a researcher; cool blue-white light that turns warm/pink
//                      at the peak.
export const FPS = 30;
export const TOTAL = 1200;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const ROOM: V3 = [0, 0, 0];
export const LAB: V3 = [3000, 0, 0];

/** word cues (s) */
export const W = {
  recordings: 1.0, bad: 2.52, news: 2.81, real: 4.39, you: 4.62, talk: 6.18, twice: 7.22, air: 9.02, everyone: 9.47,
  skull: 11.99, bones: 13.6, ears: 15.31, deeper: 16.46, microphone: 17.93, airpart: 19.31, part: 19.48, weird: 20.8,
  heard: 22.33, life: 23.98, twist: 25.53, study: 26.76, rated: 27.7, voices: 28.82, theirs: 30.05, there: 30.58,
  own: 31.79, voice: 31.97, higher: 33.76, elses: 34.44, hate: 35.75, recognize: 36.97, it: 37.49,
};
export const FLASHES: number[] = [];

export type Look = "room" | "xray" | "lab" | "peak";
export type Place = "room" | "lab";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 125, look: "room", place: "room", light: "golden" },  // HOOK: BEAN plays back a voice memo on his phone (a waveform + a squeaky nasal "hello" bubble): horrified (1.0); "Bad news." (2.81) dread; "That's the real you." (4.62) defeated, the phone droops
  { id: 2, a: 125, b: 520, look: "xray", place: "room", light: "day" },   // X-RAY HEAD (side view): "you hear yourself twice" (7.22) two paths light up: the AIR path (blue rings out of the mouth, around to the ear, 9.02) and the BONE path (orange vibrations through the skull, 11.99); bones carry it straight to the ears (15.31); "deeper" (16.46): the inner waveform turns big and bassy
  { id: 3, a: 520, b: 745, look: "room", place: "room", light: "golden" },// MIC: a big retro microphone catches ONLY the blue air path (19.48); "that weird voice is the one everyone has heard" (22.33): pull back: friends, family, a teacher and the cat pop in around BEAN, all nodding "yep"; "your whole life" (23.98) baby-photo frame on the wall
  { id: 4, a: 745, b: 1060, look: "lab", place: "lab", light: "day" },     // TWIST (light changes): 2013 lab; "In one study" (26.76): BEAN in the listening booth with headphones rating voices A-F on a tablet; "without knowing theirs was in there" (30.58) a sly researcher; "Their own voice?" (31.97) voice D plays; "rated it higher than everyone else's" (34.44): D's bar shoots to the top: THE MEME FACE (only here): BEAN smitten with his own voice, heart eyes, blushing
  { id: 5, a: 1060, b: 1200, look: "room", place: "room", light: "golden" },// OUTRO: back in the room; "You don't hate your voice." (36.14) he lifts the phone again; "You just don't recognize it." (37.49) a shy, warm smile; hold
];
export const XFADE: Record<number, number> = { 2: 12, 3: 10, 4: 8, 5: 12 }; // cam owner: 2 = the X-ray scan (holo xrayAt.show 121..133), 3 = into the head -> out of the face, 4 = the whip, 5 = the face match
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["lab", "peak", 1005, 1030, "lab"]];
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
/** the phone playback (shots 1, 5): playing 0..1, the waveform level */
export const phoneAt = (id: number, t: number) => (id === 1 ? { play: smooth((t - 0.05) / 0.2) * (1 - smooth((t - 2.3) / 0.3)), droop: smooth((t - (W.you - 0.3)) / 0.5) } : id === 5 ? { play: smooth((t - (W.hate - 0.2)) / 0.3), droop: 0 } : { play: 0, droop: 0 });
/** X-ray (shot 2): show, air path, bone path, "straight to the ears", deeper */
export const xrayAt = (id: number, t: number) => (id === 2 ? {
  show: smooth((t - (shotStart(2) - 0.2)) / 0.4), twice: smooth((t - (W.twice - 0.2)) / 0.3), air: smooth((t - (W.air - 0.2)) / 0.6),
  bone: smooth((t - (W.skull - 0.2)) / 0.6), ears: smooth((t - (W.ears - 0.3)) / 0.4), deep: smooth((t - (W.deeper - 0.15)) / 0.4),
} : { show: 0, twice: 0, air: 0, bone: 0, ears: 0, deep: 0 });
/** microphone (shot 3): mic in, catch the air path, the crowd of "everyone" pops in */
export const micAt = (id: number, t: number) => (id === 3 ? { mic: smooth((t - (W.microphone - 0.4)) / 0.5) * (1 - smooth((t - (W.weird - 0.2)) / 0.4)), catch: smooth((t - (W.airpart - 0.2)) / 0.4), crowd: smooth((t - (W.heard - 0.6)) / 0.5), life: smooth((t - (W.life - 0.2)) / 0.4) } : { mic: 0, catch: 0, crowd: 0, life: 0 });
/** the rating study (shot 4): voices A..F get rated (0..1 bar heights), D is BEAN's own (shoots to the top) */
export const RATING_BASE = [0.55, 0.62, 0.48, 0.0, 0.58, 0.51];
export const ratingAt = (id: number, t: number) => {
  if (id !== 4) return { show: 0, bars: [0, 0, 0, 0, 0, 0], own: 0, playingD: 0 };
  const show = smooth((t - (W.study - 0.3)) / 0.5);
  const bars = RATING_BASE.map((b, i) => (i === 3 ? 0 : b * smooth((t - (W.rated - 0.2 + 0.25 * i)) / 0.5)));
  const own = smooth((t - (W.higher - 0.25)) / 0.6);
  bars[3] = 0.95 * own;
  return { show, bars, own, playingD: smooth((t - (W.own - 0.3)) / 0.3) };
};

// ---------------- camera ----------------
// CAMERA (cam owner). Rule 2: very few cuts; TRAVEL, LAND, then the key word is said while the camera is STILL.
// Each shot is a path of waypoints [frame, pos, look, fov, opts]; hold() = two identical waypoints (a still landing).
// Waypoints may lie outside the shot's [a, b] so the camera keeps moving through the XFADE dissolves.
// Landings (word -> frame): recordings 30 | news 84 | real you 139, twice 217 | air 271 | skull 360 | ears 459, deeper 494 |
//   air part 584 | heard 670 | life 719 | study 803 | there 917 | own voice 959 | else's 1033 (THE MEME FACE + the gold D
//   bar + crown) | voice 1084, recognize it 1124 (held to the end).
// Transitions:
//   1->2 X-RAY SCAN: one continuous camera path shared by shots 1 + 2 (W12): after "news" the camera orbits 90 deg round
//        BEAN's screen-right side onto the side view (looking -x) while the holo's scan line sweeps the X-ray head in
//        (xrayAt.show 121..133 ~ the 12-frame XFADE), and lands before "real you".
//   2->3 PULL OUT: after "deeper" the camera pushes INTO the glowing head (ear / waveform); the dissolve lands on BEAN's
//        face from the front, close, and the camera pulls straight back as the mic slides in (micCam by "air part").
//   3->4 WHIP to the lab (WHIPS): the room whips away screen-left, the lab whips in and settles wide, then glides in.
//   4->5 MATCH on BEAN's face: shot 4 ends (after the held meme face) pushing onto a head-relative framing FACE;
//        shot 5 starts on the very same head-relative framing in the room (head on head through the dissolve).
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Ease = "io" | "in" | "in2" | "out" | "out2";
type Opt = { ease?: Ease; roll?: number; via?: V3[] };
type WP = [number, V3, V3, number, Opt?];
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ro = at(ROOM), La = at(LAB);
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
 *  when it fills it; az = degrees round the subject (+ = camera to screen right, 90 = looking -x), el = camera rise per
 *  metre of distance, wmin = the minimum frame WIDTH (m) at the subject (the 9:16 frame is narrow). */
const fr = (o: (x: number, y: number, z: number) => V3, x: number, z: number, y0: number, y1: number, fov: number, az = 0, el = 0.04, wmin = 0): F => {
  const H = Math.max((y1 - y0) / 0.66, wmin / 0.5625), ly = (y0 + y1) / 2 - 0.11 * H, d = H / (2 * Math.tan((fov * Math.PI) / 360)), a = (az * Math.PI) / 180;
  return [o(x + d * Math.sin(a), ly + d * el, z + d * Math.cos(a)), o(x, ly, z)];
};
/** a width-led framing: frame WIDTH w (m) at (x, z), the frame top at world height ytop (vertical 9:16) */
const frT = (o: (x: number, y: number, z: number) => V3, x: number, z: number, ytop: number, w: number, fov: number, az = 0, el = 0.03): F => {
  const H = w / 0.5625, ly = ytop - 0.5 * H, d = H / (2 * Math.tan((fov * Math.PI) / 360)), a = (az * Math.PI) / 180;
  return [o(x + d * Math.sin(a), ly + d * el, z + d * Math.cos(a)), o(x, ly, z)];
};
const hold = (f0: number, f1: number, Fr: F, fov: number, o?: Opt): WP[] => [[f0, Fr[0], Fr[1], fov, o], [f1, Fr[0], Fr[1], fov]];
const key = (f: number, Fr: F, fov: number, o?: Opt): WP => [f, Fr[0], Fr[1], fov, o];

// ---- ROOM (shots 1, 2, 3, 5): BEAN at Ro(0,0,0), head Ro(0,1.46,0), hair tip ~2.1; phone in his screen-right hand ----
const H_OPEN = fr(Ro, 0.12, 0, 0.45, 2.3, 38, 14, 0.05);              // frame 0: a touch wider, off to the right ...
const H_REC = fr(Ro, 0.1, 0, 0.75, 2.25, 36, 6, 0.04, 1.35);           // "recordings" (30): horrified + phone + "hello?"
const H_NEWS = fr(Ro, 0.06, 0, 0.75, 2.25, 34, -4, 0.03, 1.3);        // "news" (84): dread, closer
const H_SWING = fr(Ro, 0.05, 0.05, 0.85, 2.2, 36, 48, 0.03, 1.4);     // (pass-through) the orbit round his screen-right side
// X-RAY (shot 2) side view looking -x; the holo yaws to the camera, world z = holo-local x (toward the face, screen-left).
// Content box local x -0.54..0.58, y -0.48..0.68 round the head (y 0.97..2.13).
const X_FULL = fr(Ro, 0, 0.05, 0.95, 2.15, 36, 90, 0.0, 1.52);       // "real you" (139) "twice" (217): the whole head + both routes
const X_AIR = fr(Ro, 0, 0.04, 0.95, 2.17, 35, 90, 0.01, 1.56);        // "air" (271): the air loop over the head
const X_BONE = fr(Ro, 0, 0.06, 0.92, 2.12, 34, 90, -0.01, 1.5);      // "skull" (360): jaw -> skull -> inner ear
const X_EAR = fr(Ro, 0, 0.02, 0.98, 2.1, 34, 90, 0.0, 1.46);       // "ears" (459) "deeper" (494): cochlea + DEEPER wave
const X_IN: F = [Ro(0.85, 1.52, -0.06), Ro(0, 1.52, -0.06)];           // into the head (0.81 m off the holo, 0.95 off the card)
// MIC (shot 3): out of the head straight back to the mic framing (holo micCam: mouth ~Ro(0,1.36,0.05), grille Ro(.3,1.36,.34))
const M_OUT: F = [Ro(0.0, 1.47, 1.0), Ro(0.0, 1.43, 0)];              // the dissolve: close on his face, front
const M_MIC: F = [Ro(0.04, 1.4, 3.45), Ro(0.04, 1.32, 0.05)];       // "air part" (584): mouth, mic, REC panel (fov 34)
const M_CROWD: F = [Ro(0.04, 1.9, 7.2), Ro(0.03, 1.0, 0.6)];  // fov 44, from z 7.2: the floor (ends z 5.5) and the ceiling (y 2.7, ends z 5.5) fill the frame edges     // "heard" (670): BEAN + the whole crowd + cat
const M_LIFE: F = [Ro(-0.04, 1.95, 7.1), Ro(-0.03, 1.08, 0.5)];     // "life" (719): + the baby photo on the back wall
// ---- LAB (shot 4): BEAN seated, head La(0,1.30,0.4); desk top 0.76 z .58..1.04; board centre (0,1.925,-1.495) ----
const L_WIDE = frT(La, 0, -0.3, 3.1, 2.9, 44);         // the whip lands: the booth, the board, the room
const L_STUDY = frT(La, 0, -0.2, 2.95, 2.2, 40);       // "study" (803): BEAN in the booth + the board
const L_THERE = frT(La, 0.6, -0.1, 2.8, 2.2, 38, 0);    // "there" (917): BEAN + the sly researcher
const L_OWN = frT(La, 0.08, 0.1, 2.85, 1.9, 36, 0, 0.02);       // "own voice" (959): BEAN, the tablet, D "???" on the board
const L_MEME = fr(La, 0.08, 0.1, 0.8, 2.6, 34, 0, 0.0, 1.7);         // "else's" (1033): THE MEME FACE + the gold D bar + crown
/** MATCH: one head-relative framing for both places (shot 4 ends on it, shot 5 starts on it) */
const FACE = (h: V3) => fr(at(h), 0.08, 0, -0.86, 0.79, 36, 5, 0.03, 1.5);
const L_HEAD = La(0, 1.30, 0.4), R_HEAD = Ro(0, 1.46, 0);
const L_FACE = FACE(L_HEAD), R_OUT = FACE(R_HEAD);                    // R_OUT "voice" (1084) "recognize it" (1124): held to the end
/** a lab framing moved into the room, head-relative (shot 5's canvas during the match dissolve) */
const toRoom = (Fr: F): F => Fr.map((p) => [p[0] - L_HEAD[0] + R_HEAD[0], p[1] - L_HEAD[1] + R_HEAD[1], p[2] - L_HEAD[2] + R_HEAD[2]]) as F;

const W12: WP[] = [key(0, H_OPEN, 38), ...hold(22, 40, H_REC, 36), ...hold(72, 92, H_NEWS, 34),
  key(134, X_FULL, 36, { via: [H_SWING[0]] }), ...hold(134, 228, X_FULL, 36), ...hold(258, 285, X_AIR, 35),
  ...hold(345, 372, X_BONE, 34), ...hold(448, 502, X_EAR, 34), key(522, X_IN, 28, { ease: "in2" })];
const CAMS_W: Record<number, WP[]> = {
  1: W12,
  2: W12,
  3: [[512, M_OUT[0], M_OUT[1], 32], key(574, M_MIC, 34, { ease: "out" }), ...hold(574, 606, M_MIC, 34), ...hold(660, 690, M_CROWD, 46),
    ...hold(712, 760, M_LIFE, 46)],
  4: [...hold(735, 752, L_WIDE, 44), ...hold(796, 840, L_STUDY, 40), ...hold(905, 930, L_THERE, 38), ...hold(950, 975, L_OWN, 36),
    ...hold(1022, 1044, L_MEME, 34), key(1068, L_FACE, 36)],
  5: [...hold(1022, 1044, toRoom(L_MEME), 34), key(1068, R_OUT, 36), ...hold(1068, 1240, R_OUT, 36)],
};
const CAMS: Record<number, (f: number) => Cam> = {};
for (const k of Object.keys(CAMS_W)) CAMS[+k] = path(CAMS_W[+k]);
/** whip-pans: [boundary frame (= incoming shot's a), axis, degrees (+yaw = pan left), roll]. The outgoing camera
 *  accelerates into the turn over [B-14, B-2], the incoming one arrives already turning and settles over [B-6, B+4];
 *  XFADE 4 (8) blends at full speed. */
const WHIPS: [number, "yaw" | "pitch", number, number][] = [[745, "yaw", -90, -0.08]];
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
/** camera kicks: [frame, amplitude] (never on a key word) */
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
const DOFK: [number, number, V3?][] = [[0, 0.8], [119, 0.6], [520, 0.7], [745, 0.7], [1060, 0.8]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
