// "The Falling Jolt Before Sleep": a funny science short timed to ~/jerk-short/voice/words.json (38.7 s, voice "Liam").
// The owner: "make it insanely good and funny"; short (41 s), relatable; rendered in the CLOUD.
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one, climbs to one twist (an ancient tree-sleeping reflex,
// "a tree you're not even in"). 2 CAMERA very few cuts: travel, LAND, then the important word is said while still.
// 3 LIGHT low sun, long shadows, blue shade, haze; the light changes when the story turns (night blue -> jungle sunset).
// 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 3: the ancestor ape jolting awake mid-fall).
// Watermark on (common/Watermark.tsx). Clean thumbnail style (see projects/SESSION_NOTES.md).
// World units metres. PLACES (ALL NEW):
//   BEDROOM (0,0,0)      BEAN's bedroom at night: bed against the back wall (mattress top y 0.55, BEAN lies at
//                        BEDROOM+(0,0.6,-0.4) under a duvet, head toward -x), a big window at the back (z=-1.4) with
//                        moonlight + a low warm street-lamp glow, nightstand, lamp, alarm clock, posters.
//   BLOCK   (0,0,-40)    the APARTMENT BLOCK exterior at night (BEAN's window is one of 10 lit windows, 2 columns x 5
//                        floors); 7 of the 10 sleepers JOLT on "seventy percent" (cast cards in the windows).
//   JUNGLE  (3000,0,0)   a prehistoric jungle at a low golden SUNSET: a huge tree with a thick branch at
//                        JUNGLE+(0,6,0) where an ANCESTOR APE sleeps; the ground far below with a grinning sabre-tooth
//                        cat; vines, ferns, haze, long shadows.
export const FPS = 30;
export const TOTAL = 1230;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const BEDROOM: V3 = [0, 0, 0];
export const BLOCK: V3 = [0, 0, -40];
export const JUNGLE: V3 = [3000, 0, 0];

/** word cues (s) */
export const W = {
  jolt: 0.29, asleep: 1.45, brain: 2.81, falling: 3.5, tree: 4.66, hypnic: 6.19, jerk: 6.55, seventy: 7.62, percent: 7.98,
  people: 8.37, them: 8.86, idea: 10.53, why: 10.82, drift: 11.98, muscles: 12.79, limp: 13.91, brain2: 14.89, half: 15.51,
  awake: 15.74, drop: 17.64, panics: 18.53, wefalling: 19.66, fires: 20.63, once: 21.71, scientists: 23.07,
  ancient: 24.11, reflex: 24.47, millions: 25.66, ancestors: 27.0, trees: 28.04, relax: 29.26, much: 29.77, fall: 30.77,
  quick: 31.93, jolt2: 32.17, woke: 32.43, ground: 33.59, next: 34.82, happens: 35.28, saved: 36.25, you: 36.51,
  tree2: 37.62, even: 38.22, in: 38.44,
};
export const FLASHES: number[] = [];

export type Look = "night" | "xray" | "jungle" | "peak";
export type Place = "bedroom" | "block" | "jungle";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 190, look: "night", place: "bedroom", light: "day" },     // HOOK: BEAN drifting off in bed -> a huge comic JOLT (0.3 s): he flies up off the mattress, duvet flaps, hair up; lands wide awake (asleep? 1.45); "Your brain thinks you're falling... out of a tree" (4.66): a thought bubble with a tree branch; "hypnic jerk" (6.55) a label
  { id: 2, a: 190, b: 330, look: "night", place: "block", light: "day" },     // PULL-OUT through his window to the APARTMENT BLOCK at night: 10 lit windows; "seventy percent of people get them" (7.62-8.86): 7 of the 10 sleepers JOLT one after another, 3 sleep on peacefully
  { id: 3, a: 330, b: 670, look: "xray", place: "bedroom", light: "day" },     // X-RAY (back in the bedroom, the room goes blue): BEAN asleep; his MUSCLES (red) go limp + grey (13.91); the BRAIN with one eye half open (15.74); "feels your body drop" (17.64) an alarm; "We're falling!" (19.66) the brain screams into a megaphone; "fires every muscle at once" (21.71): lightning to every muscle -> JOLT
  { id: 4, a: 670, b: 1035, look: "jungle", place: "jungle", light: "golden" },// TWIST (light changes to a golden prehistoric sunset): "Millions of years ago" a cute ANCESTOR APE sleeps on a high branch (28.04); "relax too much" (29.77) it slides; "you'd fall" (30.77) it falls; "A quick jolt" (32.17): JOLT + THE MEME FACE (only here): eyes bulging, grabs the branch with one hand; "before they hit the ground" (33.59): dangling over a grinning sabre-tooth cat that sighs
  { id: 5, a: 1035, b: 1230, look: "night", place: "bedroom", light: "day" },  // OUTRO: BEAN in bed jolts again (34.9); "your brain just saved you" (36.51) he gives his own head a proud pat; "from a tree you're not even in" (38.44): a single LEAF floats down from nowhere onto his pillow, he stares at it; hold
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 4: 24 }; // 4 -> 5 is a hard jolt cut (no fade)
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["jungle", "peak", 958, 968, "jungle"]];
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
/** every jolt: [t, who, size] (cast: body jolt; audio: the jolt hit). who: bean | win0..win9 | ape */
export const JOLTS: [number, string, number][] = [
  [0.3, "bean", 1.0],
  [7.55, "win0", 0.6], [7.75, "win3", 0.6], [7.95, "win5", 0.6], [8.15, "win1", 0.6], [8.35, "win8", 0.6], [8.55, "win6", 0.6], [8.75, "win9", 0.6],
  [W.once - 0.05, "bean", 0.9], [W.jolt2 - 0.05, "ape", 1.2], [W.next + 0.1, "bean", 0.6],
];
/** which window sleepers jolt (7 of 10) */
export const JOLT_WINDOWS = [0, 1, 3, 5, 6, 8, 9];
/** X-ray (shot 3): show, muscles limp 0..1, brain half-awake eye, alarm, panic megaphone, fire-all lightning */
export const xrayAt = (id: number, t: number) => (id === 3 ? {
  show: smooth((t - (shotStart(3) - 0.2)) / 0.5), limp: smooth((t - (W.muscles - 0.1)) / 1.2), halfEye: smooth((t - (W.half - 0.2)) / 0.4),
  alarm: smooth((t - (W.drop - 0.2)) / 0.3), panic: smooth((t - (W.wefalling - 0.15)) / 0.25) * (1 - smooth((t - (W.once + 0.3)) / 0.4)), fire: smooth((t - (W.fires - 0.1)) / 0.3) * (1 - smooth((t - (W.once + 0.4)) / 0.5)),
} : { show: 0, limp: 0, halfEye: 0, alarm: 0, panic: 0, fire: 0 });
/** the ape (shot 4): asleep, sliding off 0..1, falling drop (m), caught (jolt), dangling */
export const apeAt = (id: number, t: number) => {
  if (id !== 4) return { slide: 0, drop: 0, caught: 0 };
  const slide = smooth((t - (W.much - 0.4)) / 0.6);
  const fallT = Math.max(0, t - (W.fall - 0.15));
  const caught = smooth((t - (W.jolt2 - 0.08)) / 0.08);
  const drop = caught > 0.5 ? 1.25 : Math.min(1.25, 0.5 * 9.8 * fallT * fallT * 0.35);
  return { slide, drop, caught };
};
/** the leaf (shot 5): falls from above onto the pillow, lands by "in" */
export const leafAt = (id: number, t: number) => (id === 5 ? { show: smooth((t - (W.saved - 0.2)) / 0.4), fall: smooth((t - (W.saved - 0.2)) / (W.in - W.saved + 0.15)) } : { show: 0, fall: 0 });

// ---------------- camera ----------------
// CAMERA (cam owner). RULE 2: very few cuts. Each shot is a short list of keys; the camera TRAVELS between keys and
// HOLDS (consecutive keys with equal values) through every key word. The rig is an orbit: look point + view direction +
// LOG distance + fov. Look / direction / fov ease with glide() (zero velocity + acceleration at every key); the log
// distance is a cubic Hermite whose end slopes are 0 except at the place-change keys (vd = log-distance change per
// frame), so a pull-out / push-in keeps its zoom RATE across the crossfade into the next place (no velocity jump).
//   1 -> 2 (190): pull back off BEAN's bed; the block shot starts INSIDE window 4's frame (mini BEAN in the same spot)
//                 and keeps pulling back to the whole facade, landing before "seventy".
//   2 -> 3 (330): push into window 4; the bedroom shot continues the push into the X-ray framing (holo.xrayCam).
//   3 -> 4 (670): a slow dreamy push + roll into a long dissolve; the jungle opens high and drifts down (same push).
//   4 -> 5 (1035): a hard cut back to bed with a little shake (KICKS).
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Be = at(BEDROOM), Bl = at(BLOCK), Ju = at(JUNGLE);
const HEAD0: V3 = Be(-0.75, 0.75, 0.12); // BEAN's head at rest (cast.headAt: his card stands at z +0.1)
const XH = at(HEAD0);
// the X-ray framing (holo.xrayCam head + (0.62, 0.95, 4.45), pulled back ~0.5 m + 0.14 m right so the brain bubble,
// the banner and the "WE'RE FALLING!" burst all fit the frame)
const XRAY_POS = XH(0.76, 1.1, 4.28), XRAY_LOOK = XH(0.76, 0.55, -0.52);
// shot-1 hook framing (also the shot-5 bookend): wide enough that the JOLT! burst sits beside his face, not on it
const HOOK_POS = Be(-0.4, 1.3, 3.25), HOOK_LOOK = Be(-0.46, 0.95, 0.1);
// block: window 4 (BEAN's, red curtains) close-up from just outside its frame, and the whole facade
const W4_LOOK = Bl(-1.45, 6.22, -0.75);
const FACADE_POS = Bl(0, 5.3, 34), FACADE_LOOK = Bl(0, 5.55, 0);
const CAMS: Record<number, CK[]> = {
  1: [ // HOOK: close on BEAN, held through the jolt (f 9) + "asleep?"; ease out to make room for the tree bubble
    K(0, HOOK_POS, HOOK_LOOK, 45), K(52, HOOK_POS, HOOK_LOOK, 45),
    K(118, Be(-0.36, 1.46, 3.6), Be(-0.42, 1.08, 0.1), 45), K(150, Be(-0.36, 1.46, 3.6), Be(-0.42, 1.08, 0.1), 45),
    K(195, Be(-0.02, 1.42, 4.35), Be(-0.06, 1.0, -0.4), 45, { vd: 0.021 }), // pulling back, still accelerating
  ],
  2: [ // continue the pull-back out of window 4 to the whole block; land before "seventy"; push back into window 4
    K(186, Bl(-1.45, 6.5, 1.75), W4_LOOK, 45, { vd: 0.021 }),
    K(216, FACADE_POS, FACADE_LOOK, 40), K(280, FACADE_POS, FACADE_LOOK, 40),
    K(335, Bl(-1.45, 6.48, 2.05), W4_LOOK, 45, { vd: -0.012 }),
  ],
  3: [ // continue the push into the X-ray; held for "limp"; in to the brain for "half"; back out for drop .. "once"
    K(325, Be(-0.06, 1.62, 5.05), Be(-0.08, 1.06, -0.4), 52, { vd: -0.008 }),
    K(372, XRAY_POS, XRAY_LOOK, 50), K(424, XRAY_POS, XRAY_LOOK, 50),
    K(456, XH(0.72, 1.15, 3.9), XH(0.72, 0.8, 0), 50), K(487, XH(0.72, 1.15, 3.9), XH(0.72, 0.8, 0), 50),
    K(520, XRAY_POS, XRAY_LOOK, 50), K(656, XRAY_POS, XRAY_LOOK, 50),
    K(684, XH(0.6, 0.9, 3.7), XH(0.55, 0.55, -0.3), 47, { roll: 0.035, vd: -0.006 }), // the dreamy push into the dissolve
  ],
  4: [ // JUNGLE: open high + dreamy, drift down to the hero wide; push to the sleeping ape ("trees"); ride the fall into
       // the PEAK close-up (held for "jolt"); pull back to show the dangling ape over the cat ("ground")
    K(657, Ju(4.4, 9.4, 13.2), Ju(0.2, 7.0, 0), 44, { roll: -0.03, vd: -0.006 }),
    K(760, Ju(2.6, 6.5, 10.6), Ju(0.1, 5.3, 0), 42), K(786, Ju(2.6, 6.5, 10.6), Ju(0.1, 5.3, 0), 42),
    K(826, Ju(1.8, 6.9, 5.5), Ju(-0.12, 6.05, 0), 40), K(926, Ju(1.8, 6.9, 5.5), Ju(-0.12, 6.05, 0), 40),
    K(957, Ju(1.02, 5.38, 4.4), Ju(0.04, 4.85, 0.5), 40), K(976, Ju(1.02, 5.38, 4.4), Ju(0.04, 4.85, 0.5), 40), // face above the caption band
    K(1001, Ju(1.4, 2.75, 9.0), Ju(0.25, 2.3, 0.85), 48), K(1035, Ju(1.4, 2.75, 9.0), Ju(0.25, 2.3, 0.85), 48), // tight: ape top, cat head above the captions
  ],
  5: [ // OUTRO (hard cut, shake): the hook framing; held through the jolt + "saved"; ease in to the pillow for the leaf;
       // held still to the end
    K(1035, HOOK_POS, HOOK_LOOK, 45), K(1096, HOOK_POS, HOOK_LOOK, 45),
    K(1138, Be(-0.86, 1.55, 2.45), Be(-0.98, 0.85, 0.0), 42), K(1230, Be(-0.86, 1.55, 2.45), Be(-0.98, 0.85, 0.0), 42),
  ],
};
/** camera shakes: [frame, amplitude] (the jolts + the jolt cut) */
const KICKS: [number, number][] = [[9, 0.1], [650, 0.08], [963, 0.13], [1035, 0.16], [1048, 0.08]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const mix3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const camKey = (ks: CK[], f: number): Cam => {
  if (f <= ks[0].f) return { pos: ks[0].pos, look: ks[0].look, fov: ks[0].fov, roll: ks[0].roll ?? 0 };
  let i = 0;
  while (i < ks.length - 2 && f >= ks[i + 1].f) i++;
  const A = ks[i], B = ks[i + 1];
  if (f >= B.f) return { pos: B.pos, look: B.look, fov: B.fov, roll: B.roll ?? 0 };
  const T = B.f - A.f, u = (f - A.f) / T, g = glide(u);
  const look = mix3(A.look, B.look, g);
  const dA = sub(A.pos, A.look), dB = sub(B.pos, B.look), lA = len(dA), lB = len(dB);
  const dir = mix3(dA.map((v) => v / lA) as V3, dB.map((v) => v / lB) as V3, g), dl = len(dir);
  const p0 = Math.log(lA), p1 = Math.log(lB), m0 = (A.vd ?? 0) * T, m1 = (B.vd ?? 0) * T, u2 = u * u, u3 = u2 * u;
  const d = Math.exp(p0 * (2 * u3 - 3 * u2 + 1) + m0 * (u3 - 2 * u2 + u) + p1 * (3 * u2 - 2 * u3) + m1 * (u3 - u2));
  return { pos: [look[0] + (dir[0] / dl) * d, look[1] + (dir[1] / dl) * d, look[2] + (dir[2] / dl) * d], look, fov: A.fov + (B.fov - A.fov) * g, roll: (A.roll ?? 0) + ((B.roll ?? 0) - (A.roll ?? 0)) * g };
};
export const camAt = (id: number, f: number): Cam => {
  const c = camKey(CAMS[id], f);
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
const DOFK: [number, number, V3?][] = [[0, 0.9], [190, 0.45], [330, 0.8], [670, 0.55], [1035, 0.9]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let e: [number, number, V3?] = DOFK[0];
  for (const d of DOFK) if (f >= d[0]) e = d;
  const p = e[2];
  return p ? { cInf: e[1], focus: () => p } : { cInf: e[1] };
};
