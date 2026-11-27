// "Why You Get Goosebumps" ("Bald Fur"): a funny science short timed to ~/goose-short/voice/words.json (37.5 s, voice
// "Liam"). Owner: "make it insanely good and funny"; <= 40 s, relatable; rendered in the CLOUD.
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one ("goosebumps = puffing up fur you don't even have"),
// climbs to one twist (MUSIC presses the same button: your body puffs up to look scary... for a song). 2 CAMERA very
// few cuts: travel, LAND, then the important word is said while still. 3 LIGHT low sun, long shadows, blue shade, haze;
// the light changes when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 5
// "hits": BEAN on his bed with headphones, the song drops, eyes bulge, every hair stands, his GHOST FUR explodes).
// Watermark on (common/Watermark.tsx). World units metres. PLACES (ALL NEW):
//   STREET (0,0,0)     a snowy little BUS STOP at a cold winter late afternoon: a low gold sun down the street, long
//                      blue shadows on snow, a glass shelter (back panel at z -1.0, roof y 2.3, x -1.4..1.4) with a
//                      bench (seat y 0.46 at z -0.65), a bus-stop sign, snowy kerb, street lamps, little houses with
//                      warm windows, falling snow. BEAN (t-shirt + shorts, the only one not dressed for it) stands at
//                      STREET+(-0.45,0,-0.25); a round CAT sits on the bench at STREET+(0.55,0.46,-0.65).
//   ROOM   (400,0,0)   BEAN's cosy bedroom at a warm low sunset: a bed along the back wall (z -1.4, mattress top y 0.5),
//                      a big window on the left wall (x -2) with the low sun raking in, posters, a speaker, a plant, a
//                      standing MIRROR at ROOM+(1.35,0,-0.55) angled toward BEAN, fairy lights. BEAN sits on the bed at
//                      ROOM+(0,0.5,-0.75) facing +z, big headphones; outro: he stands at ROOM+(0.35,0,-0.1) facing
//                      the mirror (3/4 to the lens).
//   SKIN   (1000,0,0)  ON the skin, giant scale (BEAN-arm skin landscape, surface y 4): soft peach skin with pores, giant
//                      HAIRS (like springy stalks, ~5 m) each with its own red ARRECTOR MUSCLE strap from the hair root
//                      to the skin under it, a glowing yellow NERVE network under the surface with little hands on
//                      every muscle; on "pull" the muscles contract -> the hairs swing upright and the skin around each
//                      root DOMES into a big bump.
//   ICE    (3000,0,0)  an ICE-AGE tundra in a blizzard at a pale low sun: snowdrifts, a glacier, distant mammoths, pine
//                      silhouettes. The furry ANCESTOR stands at ICE+(-0.6,0,0), modern BEAN at ICE+(0.65,0,0.1).
export const FPS = 30;
export const TOTAL = 1170;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const STREET: V3 = [0, 0, 0];
export const ROOM: V3 = [400, 0, 0];
export const SKIN: V3 = [1000, 0, 0];
export const ICE: V3 = [3000, 0, 0];

/** word cues (s) */
export const W = {
  goosebumps: 0.0, body: 0.94, puff: 1.53, fur: 1.9, dont: 2.72, have: 3.04, every: 4.12, hair: 4.67, skin: 5.1,
  muscle: 6.2, cold: 7.42, scared: 7.79, nerves: 8.62, pull: 8.89, once: 9.58, hairs: 10.33, stand: 10.63, up2: 10.96,
  skin2: 11.4, bumps: 11.69, cat: 13.14, works: 13.71, fur2: 14.64, puffs: 14.86, traps: 15.55, warm: 15.92, air: 16.25,
  twice: 17.25, big: 17.68, you3: 18.97, bumps2: 19.64, hairy: 20.78, ancestors: 21.05, full: 21.84, coat: 22.09,
  kept: 23.3, button: 23.59, lost: 24.4, coat2: 24.78, now: 25.87, weird: 26.19, music: 27.25, press: 27.74,
  button2: 28.4, shiver: 29.73, song: 30.3, hits: 30.56, body2: 31.79, puffing: 32.14, scary: 32.81, for: 33.89,
  song2: 34.18, very: 35.24, scary2: 35.54, very2: 36.68, bald: 36.97,
};
export const FLASHES: number[] = [];

export type Look = "street" | "skin" | "cat" | "ice" | "room" | "peak" | "roomend";
export type Place = "street" | "room" | "skin" | "ice";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 122, look: "street", place: "street", light: "golden" }, // HOOK (cold blue bus stop, low gold sun): open CLOSE on BEAN's bare forearm (he shivers): "Goosebumps" (0.0) the bumps rise + tiny hairs spring up; pull back to BEAN: "puff up fur" (1.53-1.9) a dotted GHOST FUR outline (a huge fluffy coat he doesn't have) puffs out around him, proud; "you don't even have" (2.72) it fizzles away, BEAN looks down at himself, confused
  { id: 2, a: 122, b: 380, look: "skin", place: "skin", light: "golden" },   // SKIN (dive into the arm): "every tiny hair" (4.67) land among giant hairs; "its own tiny muscle" (6.2) the red muscle strap at a root lights up + label; "cold" (7.42) giant snowflakes drift by, "scared" (7.79) a scary shadow sweeps over; "nerves pull" (8.62-8.89) the yellow nerve lights up, its little hands YANK every muscle; "hairs stand up" (10.63) all hairs swing upright in a wave; "skin bumps up" (11.69) the skin domes into bumps
  { id: 3, a: 380, b: 610, look: "cat", place: "street", light: "golden" },  // CAT (back at the bus stop, wider): "on a cat" (13.14) a snow clump plops off the shelter roof next to the cat (startle); "fur puffs up" (14.86) it FLOOFS to 2x; "traps warm air" (15.55-16.25) a cosy warm glow layer + little air puffs in the fur; "twice as big" (17.25) a "2x" size ruler slides in; "on you" (18.97) BEAN tries it too (strains); "bumps" (19.64) just tiny bumps (sad "boop"), the cat looks at him with pity
  { id: 4, a: 610, b: 772, look: "ice", place: "ice", light: "day" },        // ICE AGE (blizzard, pale low sun): "hairy ancestors" (20.78-21.05) the furry ANCESTOR in the storm; "full coat" (22.09) it presses a big red PUFF button on its chest: a MAJESTIC floof; "you kept the button" (23.59) modern BEAN beside it, shivering, holds up the same red button; "lost the coat" (24.4) he presses it: ONE tiny hair goes "boing"
  { id: 5, a: 772, b: 1050, look: "room", place: "room", light: "golden" },  // THE TWIST (warm sunset bedroom): "now the weird part" (26.19) BEAN on his bed, headphones on, chill; "music can press" (27.25-27.74) music notes float out, one note with a little hand presses the PUFF button; "song hits" (30.56) THE PEAK (light ramps room -> peak): MEME FACE, every hair stands, his ghost fur EXPLODES; "puffing up to look scary" (32.81) the ghost fur forms a scary BEAR silhouette roaring behind him; "for a song" (34.18) reveal: his phone plays a tiny cute song ("Little Duckling Lullaby"), the bear deflates
  { id: 6, a: 1050, b: 1170, look: "roomend", place: "room", light: "golden" }, // OUTRO (same room, continuous camera, the light settles to dusk): "very scary" (35.24) BEAN does a RAWR claw pose at the mirror; "very bald" (36.97) the mirror shows a bald bumpy little BEAN, the cat at the window (it followed him home) gives a slow pitying blink; hold
];
export const XFADE: Record<number, number> = { 2: 10, 3: 12, 4: 12, 5: 12 }; // 5 -> 6: no dissolve (continuous camera, same room)
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["room", "peak", 908, 918, "room"], ["peak", "roomend", 1050, 1080, "room"]];
/** shots that share another shot's (frozen) sun so a continuous camera never sees the sun jump */
export const SUN_FROM: Record<number, number> = { 6: 5 };
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
/** shot 1: shiver (always), bumps rise on the arm, ghost fur puffs out then fizzles, confused look */
export const hookAt = (id: number, t: number) => (id === 1 ? {
  shiver: 1, bumps: ramp(t, 0.1, 0.5), ghost: ramp(t, W.puff - 0.2, 0.35) * (1 - ramp(t, W.dont - 0.1, 0.45)),
  fizzle: ramp(t, W.dont - 0.1, 0.45), confused: ramp(t, W.dont - 0.1, 0.3),
} : { shiver: 0, bumps: 0, ghost: 0, fizzle: 0, confused: 0 });
/** shot 2 skin: muscle highlight, cold (snowflakes), scared (shadow sweep), nerve glow, pull (contract), stand (hairs
 *  upright, staggered wave over x), bumps (skin domes) */
export const skinAt = (id: number, t: number) => (id === 2 ? {
  muscle: ramp(t, W.muscle - 0.3, 0.4), cold: ramp(t, W.cold - 0.2, 0.4) * (1 - ramp(t, W.pull, 0.6)),
  scared: ramp(t, W.scared - 0.1, 0.25) * (1 - ramp(t, W.scared + 0.5, 0.4)), nerve: ramp(t, W.nerves - 0.25, 0.3),
  pull: ramp(t, W.pull - 0.05, 0.25), stand: ramp(t, W.stand - 0.35, 0.6), bumps: ramp(t, W.bumps - 0.3, 0.5),
} : { muscle: 0, cold: 0, scared: 0, nerve: 0, pull: 0, stand: 0, bumps: 0 });
/** shot 3 cat: plop (snow clump falls + lands), puff (cat fur 1 -> 2x), warm (glow layer), ruler (2x), try (BEAN
 *  strains), bumps (his tiny bumps), pity (cat's look) */
export const catAt = (id: number, t: number) => (id === 3 ? {
  plop: ramp(t, W.cat - 0.5, 0.45), puff: ramp(t, W.puffs - 0.15, 0.3), warm: ramp(t, W.traps - 0.1, 0.6),
  ruler: ramp(t, W.twice - 0.25, 0.35), tryk: ramp(t, W.you3 - 0.25, 0.3) * (1 - ramp(t, W.bumps2 + 0.3, 0.3)),
  bumps: ramp(t, W.bumps2 - 0.1, 0.2), pity: ramp(t, W.bumps2 + 0.3, 0.3),
} : { plop: 0, puff: 0, warm: 0, ruler: 0, tryk: 0, bumps: 0, pity: 0 });
/** shot 4 ice age: floof (ancestor's majestic puff on its button), button (BEAN raises his), press (BEAN presses), boing */
export const iceAt = (id: number, t: number) => (id === 4 ? {
  floof: ramp(t, W.full - 0.15, 0.3), button: ramp(t, W.kept - 0.2, 0.35), press: ramp(t, W.lost - 0.15, 0.15),
  boing: ramp(t, W.lost + 0.05, 0.15),
} : { floof: 0, button: 0, press: 0, boing: 0 });
/** shot 5 twist: notes (music notes float out), press (a note presses the button), hit (THE PEAK: meme face + ghost
 *  fur explodes), bear (ghost fur forms a scary bear), reveal (phone shows the cute song), deflate (bear sags) */
export const roomAt = (id: number, t: number) => (id === 5 ? {
  notes: ramp(t, W.music - 0.3, 0.5), press: ramp(t, W.press - 0.05, 0.2) * (1 - ramp(t, W.button2 + 0.4, 0.3)),
  hit: ramp(t, W.hits - 0.08, 0.12), bear: ramp(t, W.scary - 0.35, 0.45), reveal: ramp(t, W.for - 0.2, 0.35),
  deflate: ramp(t, W.song2, 0.5),
} : { notes: 0, press: 0, hit: 0, bear: 0, reveal: 0, deflate: 0 });
/** shot 6 outro: rawr (claw pose at the mirror), bald (the mirror's bald bumpy reflection read), blink (cat) */
export const endAt = (id: number, t: number) => (id === 6 ? {
  rawr: ramp(t, W.very - 0.15, 0.2), bald: ramp(t, W.very2 - 0.1, 0.3), blink: ramp(t, W.bald + 0.75, 0.2) * (1 - ramp(t, W.bald + 1.15, 0.2)),
} : { rawr: 0, bald: 0, blink: 0 });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const St = at(STREET), Ro = at(ROOM), Sk = at(SKIN), Ic = at(ICE);
// Cameras: see CAM below. RULE 2: travel, LAND, say the key word while still. Keys are
// quintic glides (zero velocity at every key) unless vd is set; a key past a shot's last visible frame keeps the camera
// moving through the cross-fade.
// CAM (cam owner). RULE 2: every move is a quintic glide that LANDS (zero velocity) before its key word; the word is
// said on a still frame. Keys past a shot's last visible frame (vd set) keep the camera moving through the cross-fade.
// contract points copied as numbers (story.ts must not import cast/props: circular): cast.HOOK_BUMP, props.PHONE.c / .n
const HB: V3 = [-0.3653, 0.8592, -0.075];
const PHONE_C: V3 = [400.5075, 0.5642, -0.5036], PHONE_N: V3 = [-0.1993, 0.4078, 0.8911];
const PHONE_CAM: V3 = [PHONE_C[0] + PHONE_N[0] * 1.0, PHONE_C[1] + PHONE_N[1] * 1.0, PHONE_C[2] + PHONE_N[2] * 1.0];
const PHONE_L: V3 = [PHONE_C[0], PHONE_C[1] - 0.035, PHONE_C[2]];
const CAMS: Record<number, CK[]> = {
  1: [K(0, St(-0.33, 0.88, 0.66), St(-0.37, 0.83, -0.08), 30), K(20, St(-0.33, 0.88, 0.64), St(-0.37, 0.83, -0.08), 30), // "Goosebumps": still CLOSE on the forearm (bumps rise)
    K(44, St(-0.3, 1.2, 2.75), St(-0.38, 0.98, -0.3), 45), K(98, St(-0.3, 1.2, 2.72), St(-0.38, 0.98, -0.3), 45),      // land on BEAN before "puff up fur" (46), hold through "don't even have"
    K(130, [HB[0] + 0.02, HB[1] + 0.03, HB[2] + 0.62], HB, 5.5, { vd: -0.035 })],                                      // DIVE into the hero goosebump (dissolves into the skin)
  2: [K(112, Sk(0.5, 17, 20), Sk(0.45, 3.8, 0.5), 45, { vd: -0.03 }), K(138, Sk(0.1, 9.2, 12.4), Sk(0.4, 4.0, 0.6), 45),   // drop in, LAND among the hairs: "every tiny hair" (140)
    K(156, Sk(0.1, 9.15, 12.3), Sk(0.4, 4.0, 0.6), 45), K(182, Sk(-0.2, 6.6, 8.8), Sk(0.4, 3.6, 2.0), 45),              // LAND on the hero muscle: "its own tiny muscle" (186)
    K(236, Sk(-0.15, 6.7, 9.1), Sk(0.45, 3.65, 1.9), 45), K(258, Sk(0.8, 10.2, 15.8), Sk(0.6, 3.8, -1.5), 45),        // drift (cold, scared); LAND wide: "nerves pull" (259)
    K(362, Sk(0.8, 10.1, 15.5), Sk(0.6, 3.85, -1.5), 45), K(394, Sk(0.7, 16, 22), Sk(0.6, 3.8, -2), 45, { vd: 0.03 })], // hold: stand up, bumps (351); RISE out
  3: [K(370, St(-0.38, 1.0, 0.8), St(-0.42, 0.92, -0.25), 32, { vd: 0.04 }), K(392, St(0.22, 1.15, 3.1), St(0.22, 0.8, -0.5), 48), // QA: wider + right so the clump plop (x 0.95) is in frame // pull back to the bus stop (clump plops): "cat" (394)
    K(410, St(0.22, 1.15, 3.08), St(0.22, 0.8, -0.5), 48), K(436, St(0.45, 1.2, 2.6), St(0.45, 0.95, -0.6), 42),       // LAND on the cat: "fur puffs up" (446)
    K(545, St(0.45, 1.2, 2.56), St(0.45, 0.95, -0.6), 42), K(566, St(0.05, 1.1, 2.9), St(0.05, 0.72, -0.5), 45),      // hold: warm air, "twice as big"; two-shot: "on you" (569) "bumps" (589)
    K(600, St(0.05, 1.1, 2.88), St(0.05, 0.72, -0.5), 45), K(618, St(0.05, 1.45, 2.6), St(0.05, 2.35, -6), 8)], // WHOOSH: crash-zoom into the low sun's glare down the street (whiteout)
  4: [K(602, Ic(-0.45, 1.4, 4.1), Ic(-1.6, 4.6, -6), 8), K(628, Ic(-0.45, 1.35, 3.9), Ic(-0.5, 1.1, 0), 44), // out of the pale sun's glare: LAND on the ANCESTOR "ancestors" (631)
    K(682, Ic(-0.45, 1.35, 3.86), Ic(-0.5, 1.1, 0), 44), K(697, Ic(0.15, 1.45, 4.25), Ic(0.15, 1.05, 0), 45),           // full coat (663); two-shot: "you kept the button" (699-708)
    K(712, Ic(0.15, 1.45, 4.23), Ic(0.15, 1.05, 0), 45), K(727, Ic(0.47, 1.37, 3.62), Ic(0.47, 1.07, 0), 42),            // push to BEAN: "lost the coat" (732) boing
    K(758, Ic(0.47, 1.37, 3.6), Ic(0.47, 1.07, 0), 42), K(782, Ic(0.6, 1.4, 3.0), Ic(4.6, 1.2, -0.6), 42)],              // WHIP right
  5: [K(762, Ro(0, 1.3, 2.4), Ro(-3.6, 1.1, -0.4), 42), K(785, Ro(0, 1.3, 2.4), Ro(0, 1.0, -0.75), 42),               // whip in from the left: LAND on BEAN "now the weird part" (786)
    K(866, Ro(0, 1.3, 2.36), Ro(0, 1.0, -0.75), 42), K(902, Ro(0, 1.26, 1.5), Ro(0, 1.17, -0.75), 40),                 // music, press, button; push IN: tight meme face "hits" (917)
    K(940, Ro(0, 1.26, 1.48), Ro(0, 1.17, -0.75), 40), K(976, Ro(0, 1.55, 3.0), Ro(0, 1.42, -0.9), 45),                 // pull back for the BEAR: "scary" (984)
    K(996, Ro(0, 1.55, 2.98), Ro(0, 1.42, -0.9), 45), K(1013, PHONE_CAM, PHONE_L, 30),                                    // LAND on the phone: "for a song" (1017-1038)
    K(1038, PHONE_CAM, PHONE_L, 30), K(1058, Ro(0.15, 1.35, 2.55), Ro(0.85, 1.0, -0.35), 45)],                          // follow the leap to the mirror
  6: [K(1038, PHONE_CAM, PHONE_L, 30), K(1058, Ro(0.15, 1.35, 2.55), Ro(0.85, 1.0, -0.35), 45),                         // (continuous) LAND: "Very scary" RAWR (1057)
    K(1082, Ro(0.15, 1.35, 2.53), Ro(0.85, 1.0, -0.35), 45), K(1097, Ro(0.45, 1.2, 1.0), Ro(1.3, 1.0, -0.55), 40),     // push to the glass: "Very bald" (1100-1120)
    K(1121, Ro(0.45, 1.2, 0.99), Ro(1.3, 1.0, -0.55), 40), K(1135, Ro(-0.6, 1.25, 1.3), Ro(-1.78, 1.04, 0.32), 34),   // whip-pan to the cat on the sill (pity blink)
    K(1170, Ro(-0.61, 1.25, 1.28), Ro(-1.78, 1.04, 0.32), 34)],
};
/** camera shakes: [frame, amplitude] (none: the peak face must be still) */
const KICKS: [number, number][] = [];
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
const DOFK: [number, number][] = [[0, 0.5], [122, 0.5], [135, 0.25], [370, 0.25], [385, 0.5], [1170, 0.5]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0;
  while (i < DOFK.length - 1 && f >= DOFK[i + 1][0]) i++;
  const A = DOFK[i], B = DOFK[Math.min(i + 1, DOFK.length - 1)];
  const u = B[0] > A[0] ? clamp01((f - A[0]) / (B[0] - A[0])) : 0;
  return { cInf: A[1] + (B[1] - A[1]) * u };
};
