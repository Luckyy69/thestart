// "Why Your Fingers Wrinkle in the Bath" ("Rain Tires"): a funny science short timed to ~/wrinkle-short/voice/words.json
// (36.9 s, voice "Liam"). Owner: "make it insanely good and funny"; <= 40 s, relatable; rendered in the CLOUD.
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one ("not water soaking in: your brain putting on rain
// tires"), climbs to one twist (the nerve does it ON PURPOSE -> grip -> rain mode). 2 CAMERA very few cuts: travel,
// LAND, then the important word is said while still. 3 LIGHT low sun, long shadows, blue shade, haze; the light changes
// when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 4 "faster": the
// smooth-finger contestant fumbling every wet marble while the wrinkly one zooms).
// Watermark on (common/Watermark.tsx). World units metres. PLACES (ALL NEW):
//   BATH  (0,0,0)       BEAN's bathroom at a low golden late-afternoon sun through a frosted window: a big clawfoot tub
//                       along x (rim y 0.62) full of foam; BEAN sits in it at BATH+(0,0.35,0) facing +z, arms on the rim;
//                       steam haze, tiles, rubber duck, shampoo bottles, a towel, a little rain on the window (shot 6).
//   LAB   (400,0,0)     a cosy science lab: a table with two contestants side by side (SMOOTH fingers left, WRINKLY
//                       right), each with a bowl of water full of marbles and an empty bowl, a big stopwatch, a banner
//                       "WET MARBLE CHALLENGE"; warm low window light, blue shade.
//   MICRO (1000,0,0)    INSIDE a fingertip (giant scale): a pink skin landscape (surface at y 4) with fingerprint ridges,
//                       under it red BLOOD VESSEL tubes and a glowing yellow NERVE with little hands; the skin shrinks
//                       and FOLDS into big grooves; a giant TIRE rolls in alongside with matching tread.
//   CLIFF (3000,0,0)    a prehistoric rainy cliff/riverbank at a low sun breaking through storm clouds: wet mossy
//                       rocks, a slick branch over a river, ANCESTOR BEAN (caveman) climbing with wrinkly fingers.
export const FPS = 30;
export const TOTAL = 1170;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const BATH: V3 = [0, 0, 0];
export const LAB: V3 = [400, 0, 0];
export const MICRO: V3 = [1000, 0, 0];
export const CLIFF: V3 = [3000, 0, 0];

/** word cues (s) */
export const W = {
  wrinkly: 0.28, bath: 0.63, fingers: 0.87, not: 1.87, water: 2.04, soaking: 2.3, brain: 3.58, putting: 4.39, rain: 4.82,
  tires: 5.03, weird: 6.53, part: 6.79, nerve: 8.1, finger: 8.49, cut: 8.93, never: 9.88, wrinkles: 10.11, body: 11.89,
  purpose: 12.85, hands: 14.07, wet: 14.58, nerves: 15.44, squeeze: 15.74, vessels: 16.45, skin: 17.11, fingertips: 18.34,
  shrink: 18.89, fold: 19.93, grooves: 20.39, tread: 22.07, tire: 22.5, experiment: 23.94, people: 24.73, moved: 25.05,
  marbles: 25.55, faster: 25.94, wrinkly2: 26.59, fingers2: 26.98, scientists: 28.19, ancestors: 29.35, grip: 29.89,
  rocks: 30.36, branches: 30.78, rain2: 31.4, next: 32.55, stuck: 33.05, bath2: 33.48, hands2: 34.3, ruined: 34.74,
  switched: 35.86, rainmode: 36.3, mode: 36.55,
};
export const FLASHES: number[] = [];

export type Look = "bath" | "xray" | "micro" | "lab" | "peak" | "rain" | "bathend";
export type Place = "bath" | "lab" | "micro" | "cliff";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 207, look: "bath", place: "bath", light: "golden" },     // HOOK: BEAN in a foamy bath holds his hand up to the lens: super PRUNEY fingers (0.87); "not water soaking in" (2.3) a water drop bounces off a fingertip; "your brain... putting on rain tires" (3.58-5.03): a thought bubble: his BRAIN in a pit-crew cap swaps a smooth tire for a grooved RAIN tire; "Here's the weird part" (6.53) he leans in
  { id: 2, a: 207, b: 405, look: "bath", place: "bath", light: "golden" },   // X-RAY HAND (push into his raised hand -> a holo X-ray: bones + one glowing yellow NERVE to each fingertip): "nerve... cut" (8.93) a pair of scissors SNIPS the ring finger's nerve; "never wrinkles" (10.11) the 4 others prune up, the snipped one stays smooth + shiny; "on purpose" (12.85) a stamp "ON PURPOSE!" + BEAN's face goes "!" (the turn: light goes cold + electric)
  { id: 3, a: 405, b: 700, look: "micro", place: "micro", light: "day" },    // MICRO (dive into a fingertip): "hands stay wet" (14.58) water drops land on the skin landscape; "nerves squeeze" (15.74) the nerve's little hands squeeze the blood vessels (they narrow, red goes darker); "fingertips shrink" (18.89) the skin sinks; "fold into grooves" (20.39) it folds into big grooves; "tread on a tire" (22.07-22.5) a giant tire rolls in beside: same pattern
  { id: 4, a: 700, b: 843, look: "lab", place: "lab", light: "golden" },     // EXPERIMENT: two contestants, wet marbles bowl to bowl, a stopwatch; "faster" (25.94) THE PEAK: WRINKLY zooms (speed lines), SMOOTH fumbles every marble, they squirt everywhere: THE MEME FACE (only here) on SMOOTH; "wrinkly fingers" (26.59) WRINKLY wins, a trophy
  { id: 5, a: 843, b: 968, look: "rain", place: "cliff", light: "golden" },  // ANCESTORS (the twist: a low sun through a prehistoric rainstorm): ANCESTOR BEAN climbs a wet rock, slips a foot, "grip" (29.89) his wrinkly fingers clamp on (tire-grip SCREECH lines); "branches in the rain" (30.78-31.4) he swings onto a slick branch over a river, safe
  { id: 6, a: 968, b: 1170, look: "bathend", place: "bath", light: "golden" },// OUTRO: back in the bath (rain now on the window, sun low): "stuck in the bath" (33.05) BEAN bored, chin in foam; "hands aren't ruined" (34.74) he looks at his pruney hands, worried; "rain mode" (36.3): a little dashboard badge "RAIN MODE: ON" pops over his hand, he grabs the slippery SOAP bar that has been squirting around -> it can't escape now; smug; hold
];
export const XFADE: Record<number, number> = { 2: 8, 3: 14, 4: 10, 5: 12, 6: 10 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["bath", "xray", 383, 392, "bath"], ["lab", "peak", 772, 782, "lab"]];
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
const ramp = (t: number, t0: number, d: number) => smooth((t - t0) / d);
/** BEAN's finger wrinkle amount 0..1 (shots 1, 6: fully pruney) */
export const pruneAt = (id: number, _t: number) => (id === 1 || id === 6 ? 1 : 0);
/** shot 1: the bouncing water drop, the brain pit-stop bubble (tire swap 0..1) */
export const hookAt = (id: number, t: number) => (id === 1 ? {
  drop: ramp(t, W.water - 0.3, 0.8), bubble: ramp(t, W.brain - 0.3, 0.35) * (1 - ramp(t, W.weird - 0.2, 0.4)), swap: ramp(t, W.putting - 0.1, 0.7), lean: ramp(t, W.weird - 0.2, 0.5),
} : { drop: 0, bubble: 0, swap: 0, lean: 0 });
/** shot 2 X-ray hand: show, nerves glow, snip (the ring finger's nerve, finger 3), wrinkle (other 4), stamp */
export const SNIP_FINGER = 3;
export const holoAt = (id: number, t: number) => (id === 2 ? {
  show: ramp(t, shotStart(2) - 0.3, 0.5), nerves: ramp(t, W.nerve - 0.25, 0.5), snip: ramp(t, W.cut - 0.1, 0.15),
  wrinkle: ramp(t, W.never - 0.2, 0.9), stamp: ramp(t, W.purpose - 0.1, 0.2),
} : { show: 0, nerves: 0, snip: 0, wrinkle: 0, stamp: 0 });
/** shot 3 micro: wet drops, squeeze (vessels narrow), shrink (skin sinks), fold (grooves), tire (rolls in 0..1) */
export const microAt = (id: number, t: number) => (id === 3 ? {
  wet: ramp(t, W.hands - 0.2, 0.6), squeeze: ramp(t, W.squeeze - 0.1, 0.8), shrink: ramp(t, W.shrink - 0.3, 0.8),
  fold: ramp(t, W.fold - 0.45, 0.8), tire: ramp(t, W.tread - 1.0, 1.0),
} : { wet: 0, squeeze: 0, shrink: 0, fold: 0, tire: 0 });
/** shot 4 lab race: go (stopwatch start), marbles moved by WRINKLY / SMOOTH (count, of 8), fumble (peak), win */
export const MARBLES = 8;
export const labAt = (id: number, t: number) => {
  if (id !== 4) return { go: 0, wrinkly: 0, smooth: 0, fumble: 0, win: 0 };
  const go = ramp(t, W.people - 0.2, 0.2), tr = Math.max(0, t - W.people);
  return { go, wrinkly: Math.min(MARBLES, tr * 3.2), smooth: Math.min(MARBLES, tr * 0.9), fumble: ramp(t, W.faster - 0.1, 0.15), win: ramp(t, W.wrinkly2 - 0.1, 0.3) };
};
/** shot 5 ancestor climb: climb 0..1, slip (foot), grip (clamp), swing onto the branch */
export const cliffAt = (id: number, t: number) => (id === 5 ? {
  climb: ramp(t, shotStart(5), 1.4), slip: ramp(t, W.grip - 0.45, 0.2) * (1 - ramp(t, W.grip - 0.08, 0.15)), grip: ramp(t, W.grip - 0.08, 0.1),
  swing: ramp(t, W.branches - 0.4, 0.8), rain: 1,
} : { climb: 0, slip: 0, grip: 0, swing: 0, rain: 0 });
/** shot 6 outro: bored, worried (look at hands), rain-mode badge, soap grab */
export const endAt = (id: number, t: number) => (id === 6 ? {
  bored: ramp(t, W.stuck - 0.3, 0.4) * (1 - ramp(t, W.hands2 - 0.3, 0.3)), worried: ramp(t, W.hands2 - 0.3, 0.3) * (1 - ramp(t, W.switched - 0.2, 0.3)),
  badge: ramp(t, W.rainmode - 0.15, 0.25), grab: ramp(t, W.rainmode - 0.05, 0.12), smug: ramp(t, W.mode, 0.3),
} : { bored: 0, worried: 0, badge: 0, grab: 0, smug: 0 });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ba = at(BATH), La = at(LAB), Mi = at(MICRO), Cl = at(CLIFF);
// CAMERA (cam owner). RULE 2: travel, LAND, say the key word while still. Keys are quintic glides (zero velocity at
// every key) unless vd is set; a key past a shot's last visible frame keeps the camera moving through the cross-fade.
const H = (x: number, y: number, z: number) => Ba(0.35 + x, 1.25 + y, 0.15 + z); // BEAN's raised palm (= holo HAND)
const XRAY = K(236, H(-0.04, 0.07, 1.87), H(-0.04, -0.01, 0), 40); // holo.ts xrayCam
// shot 1 + 2 share the push into the hand so the 1->2 dissolve (203-211) is seamless
const PUSH: CK[] = [K(160, Ba(-0.06, 1.5, 2.75), Ba(-0.06, 1.42, 0), 45), XRAY];
// shot 3 whip-out (3->4 at 700): pan hard right off the landed tire; shot 4 whips in from the lab's sun window
const MG = K(684, Mi(1.0, 8.0, 13.0), Mi(1.0, 3.1, -1), 45);
const LW = K(722, La(0, 2.05, 4.4), La(0, 1.25, -0.2), 45); // lab wide: both contestants, referee, stopwatch, 4 bowls
const CAMS: Record<number, CK[]> = {
  // HOOK: open moving on BEAN + hand, close on the pruney fingers (land 24, "fingers" 26), drop (61) held close; pull
  // back for the brain pit-stop bubble (land 110), "tires" (151) still; push into the hand (160 -> 236)
  1: [K(0, Ba(0.16, 1.32, 2.05), Ba(0.16, 1.22, 0), 45, { vd: -0.03 }), K(24, H(-0.1, 0.2, 1.5), H(-0.1, 0.14, 0), 42),
    K(66, H(-0.11, 0.2, 1.42), H(-0.11, 0.14, 0), 42), K(110, Ba(-0.08, 1.5, 2.85), Ba(-0.08, 1.42, 0), 45), ...PUSH],
  // X-RAY: land 236, hold through cut (268) / wrinkles (303) / ON PURPOSE (385, kick 389); dive into the middle
  // (wrinkly) fingertip 393 -> 416, dissolving into the micro world (398-412)
  2: [...PUSH, K(392, XRAY.pos, XRAY.look, 40), K(416, H(-0.028, 0.3, 0.72), H(-0.028, 0.3, 0), 30, { vd: -0.06 })],
  // MICRO: fall in from high (moving at 398), LAND 452 (wet 437 lands on the skin, squeeze 472 still), rise to the
  // grooves + tire view (486 -> 542), hold through shrink (567) / fold (598) / grooves (612) / tread-tire (662-675)
  3: [K(398, Mi(0, 15.5, 17.5), Mi(0, 4, -3), 45, { vd: -0.014 }), K(452, Mi(0.4, 7.2, 13.2), Mi(0.4, 2.3, 0), 45),
    K(486, Mi(0.45, 7.15, 13.05), Mi(0.4, 2.3, 0), 45), K(542, Mi(1.0, 8.2, 13.6), Mi(1.0, 3.1, -1), 45), MG,
    K(716, MG.pos, Mi(10, 3.1, 2.3), 45)],
  // LAB: whip in from the left (sun window), land wide 722 (experiment 718 settling, people 742 still); push into
  // SMOOTH 748 -> 774 for the PEAK meme face ("faster" 778, light 772-782); pull back for the win (790 -> 812);
  // whoosh down into SMOOTH's water bowl 828 -> 852 (the splash into the rain, 837-849)
  4: [K(684, LW.pos, La(-2.3, 1.25, 0.42), 45), LW, K(748, La(0, 2.02, 4.3), La(0, 1.25, -0.2), 45),
    K(774, La(-0.42, 1.36, 1.45), La(-0.5, 1.12, -0.3), 42), K(783, La(-0.42, 1.35, 1.4), La(-0.5, 1.12, -0.3), 42),
    K(800, La(0.1, 1.85, 3.7), La(0.1, 1.2, -0.2), 45), K(828, La(0.1, 1.84, 3.6), La(0.1, 1.2, -0.2), 45),
    K(852, La(-0.62, 1.55, 0.45), La(-0.66, 0.82, 0.05), 40, { vd: -0.04 })],
  // CLIFF (local to CLIFF): whoosh down through the rain into the hero wide (land 860, sun gap right); swoop to the
  // grip close-up (land 888, "grip" 897 still), up to the branch (land 932, "rain" 942 still); push into the rain.
  // Every view yaws ~12 deg right so the camera-relative sun (LOOKS.rain az 8) sits right of the cliff corner, in frame
  5: [K(828, Cl(-1.6, 7.5, 12.6), Cl(0.6, 3.0, 0), 44, { vd: -0.02 }), K(860, Cl(-1.3, 2.85, 7.6), Cl(0.45, 2.05, 0), 42),
    K(866, Cl(-1.27, 2.86, 7.45), Cl(0.45, 2.07, 0), 42), K(888, Cl(-1.0, 3.45, 3.3), Cl(-0.35, 3.0, 0.3), 40),
    K(906, Cl(-0.97, 3.44, 3.15), Cl(-0.35, 3.0, 0.3), 40), K(932, Cl(0.4, 3.7, 6.4), Cl(1.9, 4.3, -0.3), 42),
    K(956, Cl(0.45, 3.72, 6.2), Cl(1.9, 4.3, -0.3), 42), K(980, Cl(0.95, 3.95, 4.5), Cl(1.9, 4.4, -0.3), 40, { vd: -0.02 })],
  // OUTRO: from the rainy window glide down to BEAN (land 990, "stuck" 991); in to the hands (land 1036, "ruined"
  // 1042); a hair closer (1046 -> 1080) and STILL from 1080: badge + soap grab (1089), hold to the end
  6: [K(958, Ba(-0.62, 1.58, 0.95), Ba(-0.675, 1.55, -0.63), 40), K(990, Ba(0.02, 1.3, 2.15), Ba(0.02, 1.1, 0), 45),
    K(1012, Ba(0.03, 1.3, 2.08), Ba(0.03, 1.1, 0), 45), K(1036, Ba(0.12, 1.25, 2.05), Ba(0.12, 1.15, 0), 45),
    K(1046, Ba(0.12, 1.25, 2.05), Ba(0.12, 1.15, 0), 45), K(1080, Ba(0.12, 1.25, 1.95), Ba(0.12, 1.15, 0), 45)],
};
/** camera shakes: [frame, amplitude] */
const KICKS: [number, number][] = [[389, 0.08], [897, 0.05]];
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
// mild lens blur only (backgrounds must NOT be blurry): [frame, cInf], linearly blended between keys (no pops)
const DOFK: [number, number][] = [[0, 0.5], [394, 0.5], [412, 0.25], [690, 0.25], [705, 0.45], [960, 0.45], [975, 0.5]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0;
  while (i < DOFK.length - 1 && f >= DOFK[i + 1][0]) i++;
  const A = DOFK[i], B = DOFK[Math.min(i + 1, DOFK.length - 1)];
  const u = B[0] > A[0] ? clamp01((f - A[0]) / (B[0] - A[0])) : 0;
  return { cInf: A[1] + (B[1] - A[1]) * u };
};
