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
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 8, 5: 8 };
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
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Key = { f: number; pos: V3; look: V3; fov?: number; roll?: number; cut?: boolean; lin?: boolean };
const P = (f: number, pos: V3, look: V3, fov = 40, roll = 0): Key => ({ f, pos, look, fov, roll, lin: true });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ro = at(ROOM), La = at(LAB);
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
  1: shot(1, [[0, Ro(0.2, 1.35, 2.6), Ro(0, 1.2, 0), 34], [125, Ro(0.1, 1.35, 2.4), Ro(0, 1.25, 0), 34]]),
  2: shot(2, [[125, Ro(1.8, 1.45, 0.4), Ro(0, 1.4, 0), 34], [520, Ro(1.7, 1.45, 0.3), Ro(0, 1.4, 0), 34]]),
  3: shot(3, [[520, Ro(0.1, 1.35, 2.4), Ro(0, 1.25, 0), 34], [745, Ro(0, 1.5, 4.4), Ro(0, 1.1, 0), 40]]),
  4: shot(4, [[745, La(0, 1.6, 4.5), La(0, 1.3, 0), 40], [1060, La(0, 1.4, 2.4), La(0, 1.3, 0), 34]]),
  5: shot(5, [[1060, Ro(0.1, 1.35, 2.4), Ro(0, 1.25, 0), 34], [1200, Ro(0.05, 1.35, 2.2), Ro(0, 1.25, 0), 32]]),
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
const DOFK: [number, number, V3?][] = [[0, 1], [125, 1], [520, 0.8], [745, 0.8], [1060, 1]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
