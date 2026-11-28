// "Live Wire" (why hitting your funny bone zaps your pinky): Bean Stories short #17, timed to
// ~/funny-short/voice/words.json (34.53 s, voice "Liam"). TOTAL 1072 frames = voice + 1.2 s (the final deadpan + tag).
// STYLE RULES (channel, binding): 1 SCRIPT strange fact in line one ("your funny bone isn't a bone"), climbs to ONE twist
// (it's a nerve with no padding -> a live wire -> the name is a pun: HUMERUS / HUMOROUS ... "It's still not funny").
// 2 CAMERA very few cuts: travel, LAND, then the key word is said while still; continuous moves + portal transitions.
// 3 LIGHT low sun, long shadows, blue shade, haze; the light CHANGES when the story turns. 4 FACES one feeling per line;
// BEAN's MEME face ONLY at the peak: ONE hard cut (shot 3, "a live WIRE", f 433-462).
// Watermark + captions on (Funny.tsx). World units metres. PLACES (each its own world offset):
//   HALL   (0,0,0)    a sunny family HALLWAY at a low warm MORNING sun. The hallway runs along x (x -4..+5); back wall
//                     at z -1.4 (0.12 thick, front face z -1.34) with the KITCHEN DOORWAY centred at x 0 (opening x
//                     -0.45..+0.45, height 2.05; the bright yellow kitchen behind it, z < -1.4). Low sun through a tall
//                     window in the far END wall (x +5) rakes long stripes along the floor toward -x. Family photos,
//                     a coat rack, a runner rug, a radiator, a "HOME SWEET HOME" sampler. BEAN walks OUT of the kitchen
//                     toward the lens (+z) carrying a heaped LAUNDRY BASKET and clips his right elbow (screen-left) on
//                     the left JAMB (x -0.45) at f 12. He then stands at BEAN_HALL = HALL+(0.1, 0, -1.15).
//                     Shot 3 (THE PEAK) and shot 6 (END) are this same hallway.
//   ARM    (1000,0,0) INSIDE BEAN's ARM, giant scale: an HOURGLASS of two warm fleshy chambers along +x joined at the
//                     elbow: the UPPER-ARM chamber (x -18..-2) and the FOREARM/HAND chamber (x +2..+26), floor y 0,
//                     arched ceilings ~9 m (striped red muscle bundles like giant ropes; the ceiling is lined with huge
//                     pillowy FAT cushions), a long white HUMERUS bone ridge along the -z wall of the upper chamber.
//                     The ULNAR NERVE = a fat glowing yellow POWER CABLE on short posts (y ~1.0) with a little lamp on
//                     every post, wrapped in fluffy pink PADDING cushions everywhere EXCEPT the elbow. It runs from the
//                     NECK SUBSTATION at ARM+(-16,0,0) ("NECK - C8/T1") down to PINKY TOWN at the hand end.
//                     Between the chambers the walls + ceiling pinch into a LOW ARCH (the elbow): looking down the line
//                     from the upper chamber you see THROUGH the arch to Pinky Town's lights ("light at the end of the
//                     tunnel"), and shot 4's camera RIDES through it.
//                     The ELBOW GAP at ARM+(0,0,0): the cable squeezes through a tiny tunnel (x -1.6..+1.6) between the
//                     bone knob (medial epicondyle: a big white boulder at ARM+(0,1.2,-1.6), faint stencil "HUMERUS")
//                     and a muscle wall (z +1.6); NO padding there; its ROOF is a thin translucent SKIN membrane at y
//                     ~2.3 with the low sun glowing through it (a few giant hairs outside). A "NO PADDING" sign-holder
//                     (cast) stands at ARM+(0.9,0,1.25). On "whack" a giant DOOR-FRAME edge (props) slams down on the
//                     skin roof from OUTSIDE and dents it onto the cable.
//                     PINKY TOWN (x 15..24): the cable climbs a POWER POLE at ARM+(16,0,0) and splits into two house
//                     wires: PINKY's cottage ARM+(20,0,1.6) and RING's cottage ARM+(20,0,-1.4) (RING gets only HALF:
//                     half his house is wired). PINKY stands at ARM+(18.2,0,1.0), RING at ARM+(18.2,0,-0.5). A sign
//                     "PINKY TOWN - POP. 1 1/2". The other fingers live further on (ARM+(22.5,0,-3.5)) on a different
//                     line ("MEDIAN NERVE CO."): their lamps never light up, they sip tea, unbothered.
//   MUSEUM (2000,0,0) a dusty old ANATOMY MUSEUM gallery at a low late-afternoon sun: tall windows on the RIGHT wall
//                     (x +3.5) rake long amber beams with dust motes across a creaky parquet floor; a skylight above.
//                     The SKELETON ("SKELLY", a cast card) on a plinth at MUSEUM+(0,0,0) facing +z; its upper arm bone
//                     at HUMERUS_PT ~MUSEUM+(-0.3,1.25,0.05); the brass HUMERUS plaque (props) hangs on a little stand at
//                     MUSEUM+(-0.6,1.2,0.3) and FLIPS to HUMOROUS. BEAN (visitor, ice pack on his elbow) at
//                     MUSEUM+(1.15,0,1.3). The PORTRAIT WALL = the LEFT wall x -3.4: four frames facing +x at y 1.75,
//                     z -0.6 (1840 gentleman), -2.2 (1900 lady), -3.8 (1950 dad), -5.4 (2026: BEAN, unamused).
import { W } from "./words";
export { W, WF, WORDS } from "./words";

export const FPS = 30;
export const TOTAL = 1072;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;
const fr = (s: number) => Math.round(s * FPS);

export const HALL: V3 = [0, 0, 0];
export const ARM: V3 = [1000, 0, 0];
export const MUSEUM: V3 = [2000, 0, 0];

/** named beat FRAMES (audio cues + key gags). All derived from W: never hard-code seconds elsewhere. */
export const BEAT = {
  whack1: 12,                        // hallway BONK: elbow clips the door jamb (between "funny" 8 and "bone" 17)
  sock: 40,                          // a sock from the basket lands on BEAN's head
  xray: fr(W.its2) - 2,              // 102: the round X-RAY window opens over his elbow (whoosh + ding)
  nerve: fr(W.nerve),                // 113: the glowing cable inside the window pulses
  dive: 116,                         // 116-136 dive into the x-ray window (whoosh)
  neck: fr(W.neck),                  // 157: neck substation lights
  pinkyWide: fr(W.pinky),            // 189: the whole line in one wide
  elbow: fr(W.elbow),                // 225
  squeeze: fr(W.squeezes),           // 250: the cable squeezes into the gap (rubbery squeak)
  noPad: fr(W.no),                   // 296: sign-holder lifts "NO PADDING"
  skin: fr(W.skin),                  // 338: the skin roof glows
  shadow: fr(W.when),                // 367: the door-frame shadow falls on the roof (rumble)
  whack2: fr(W.whack) + 2,           // 378: the giant door frame SLAMS the skin roof (big THUD)
  sparks: fr(W.basically),           // 405-432: sparks crackle, building
  peak: fr(W.wire) - 4,              // 433: HARD CUT to the MEME face (ZAP surge)
  peakFace: fr(W.wire) - 1,          // 436: the meme face fully on (THE PEAK FRAME)
  line: fr(W.the2),                  // 458-490: the light front races along the whole line (bulb dings)
  swoop: 490,                        // 490-514 swoop down to Pinky Town (whoosh)
  scream: fr(W.pinky2),              // 526-550: PINKY screams (RING half-screams)
  fine: fr(W.totally),               // 579: PINKY stops, pats himself: fine
  bandaid: fr(W.fine) - 6,           // 587: band-aid slapped on anyway (pat)
  rise: 596,                         // 596-620 rise into the glow / dissolve into the museum (whoosh)
  why: fr(W.why),                    // 672: BEAN "?"
  pun: fr(W.pun),                    // 729: SKELLY's shifty smirk
  tap: fr(W.right),                  // 777: SKELLY taps its own humerus (tok tok)
  label: fr(W.humerus),              // 807: plaque HUMERUS (glint)
  flip: fr(W.humorous) - 3,          // 878: the plaque FLIPS (clack)
  rimshot: fr(W.humorous) + 5,       // 886: ba-dum-tss
  laugh: fr(W.joke) - 2,             // 947: the 1840 portrait LAUGHS (dusty guffaw + dust puff)
  laugh2: fr(W.almost), laugh3: fr(W.two), laugh4: fr(W.hundred), // 960 / 968 / 974: the later portraits laugh
  portal: 984,                       // 984-998 push into BEAN's portrait -> the hallway (whoosh)
  deadpan: fr(W.its3),               // 1001: "It's still not funny."
  sting: fr(W.funny4) + 13,          // 1030: deadpan sting
  exit: 1041,                        // BEAN walks out of frame
  bonk: 1056,                        // offscreen BONK (the OTHER elbow) + a tiny "zzt"
} as const;

export const FLASHES: number[] = [BEAT.peak]; // the PEAK punch (one decaying flash, no strobe)

export type Look = "hall" | "arm" | "skin" | "zap" | "peak" | "town" | "museum" | "pun" | "hallend";
export type Place = "hall" | "arm" | "museum";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 130, look: "hall", place: "hall", light: "golden" },      // HOOK (sunny hallway, low warm morning sun): BEAN walks out of the kitchen with a heaped laundry basket: BONK (12) his elbow clips the jamb; "Your funny bone isn't a bone" (8-48) he freezes mid-step, WINCE (one feeling: ouch), a sock lands on his head (40), tiny zap squiggles at his pinky; "And it's definitely not funny" (57-97) he glares into the lens, unamused; "It's a nerve" (104-113) a round X-RAY window opens over his elbow: a glowing yellow cable inside; DIVE into it
  { id: 2, a: 130, b: 433, look: "arm", place: "arm", light: "golden" },      // INSIDE THE ARM (warm fleshy cavern, the glowing cable): "It runs from your neck" (140-157) land on the NECK SUBSTATION; "all the way down to your pinky" (164-189) rise and turn down the line: the WHOLE cable in one long view, through the elbow arch, Pinky Town twinkling at the far end; "And at your elbow" (225) glide down to the gap; "it squeezes through a tiny gap" (250-284) the cable squeezes in (bulges, sweats); "with no padding" (296-301) the sign-holder lifts NO PADDING (the cable elsewhere is in fluffy cushions); "Just skin." (331-338) tilt up: the thin skin roof glows with sunlight (LOOK arm -> skin); "So when you whack it" (362-385) a door-frame SHADOW falls over the roof, then the giant frame SLAMS it (378): the roof dents onto the cable; "you're basically hitting a live" (399-429) sparks crackle (LOOK skin -> zap)
  { id: 3, a: 433, b: 462, look: "peak", place: "hall", light: "day" },       // THE PEAK (ONE HARD CUT, the hallway): "WIRE" (437): BEAN ELECTROCUTED, the meme face: hair shoots up in spikes, eyes bulge, rectangle grimace, rigid, his arm flashes x-ray (glowing bones), bolts crackle round him, the basket's laundry blasts upward; a hard electric-blue key, the hallway drops into deep blue shade
  { id: 4, a: 462, b: 612, look: "zap", place: "arm", light: "golden" },      // THE SURGE (arm, dark, the cable glowing): "The whole line lights up" (458-487) the SAME wide as "pinky" (189): a lightning front races from the elbow along the whole line, every post lamp pops on in sequence (still camera); RIDE down the line, THROUGH the elbow arch, into Pinky Town (490-516, LOOK zap -> town); "and your pinky screams" (514-536) PINKY screams (hair up, "AAAAA!"), RING half-screams (only his left half); "even though your pinky is totally fine" (550-593) PINKY stops mid-scream, pats himself: fine; slaps on a band-aid anyway (deadpan); rise up into the glow
  { id: 5, a: 612, b: 992, look: "museum", place: "museum", light: "golden" }, // THE TWIST (the light changes: a dusty anatomy museum, amber beams, haze): "Now the weird part" (625-642) land wide on SKELLY; "Why funny?" (672-680) BEAN with an ice pack: "?"; "Probably a pun" (713-729) SKELLY's shifty smirk; "The bone right there is called the humerus" (763-807) SKELLY taps its upper arm, push in to the brass plaque HUMERUS; "Humerus..." (840) hold; "humorous" (881) the plaque FLIPS to HUMOROUS (LOOK museum -> pun: a stage spotlight pops), ba-dum-tss, SKELLY's jaw clacks with laughter; "People have been making that joke" (919-949) truck to the 1840 portrait: it LAUGHS (dust puffs out); "for almost two hundred years" (955-983) truck along the row (1900, 1950 laugh in turn) to the last frame: BEAN, 2026, unamused; push INTO his portrait
  { id: 6, a: 992, b: 1072, look: "hallend", place: "hall", light: "golden" }, // END (the hallway again, the sun lower + cooler, deadpan): the portrait dissolves into the real doorway: BEAN with a PILLOW taped to his elbow (padding!), deadpan into the lens: "It's still not funny." (1001-1029); hold; he turns and walks out (1041); offscreen BONK (1056) + a tiny "zzt"
];
/** dissolve lengths (frames) INTO shot id. 3 = the hard cut (no entry). */
export const XFADE: Record<number, number> = { 2: 12, 4: 8, 5: 16, 6: 12 };
/** smooth light turns: [fromLook, toLook, f0, f1, place]. world.ts applies every ramp of the shot IN ORDER (chained),
 *  so a shot can turn twice (arm -> skin -> zap). A ramp whose f0 lies before an incoming shot's start finishes there. */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [
  ["arm", "skin", 312, 330, "arm"],          // tilt up to the sunlit skin roof: warm translucent glow
  ["skin", "zap", 398, 428, "arm"],          // the sparks build: the light goes electric and dark
  ["zap", "town", 492, 514, "arm"],          // swoop into Pinky Town: cosy lamp-lit
  ["museum", "pun", 876, 884, "museum"],     // HUMOROUS: the stage spotlight pops on
  ["pun", "museum", 905, 935, "museum"],     // (cam) the spot goes off as the camera glides to the portraits
];
/** shots that share another shot's (frozen) sun so a cut / continuous camera never sees the sun jump */
export const SUN_FROM: Record<number, number> = { 3: 1, 4: 2, 6: 1 };
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
const T = (f: number) => f / FPS;
/** shot 1 hook: walk (0..1 BEAN walks out of the kitchen, stops at the whack), whack (the elbow hits the jamb), wince
 *  (ouch face), sock (0..1 the sock's flight: off the basket -> onto his head), zing (pinky squiggles), glare (unamused
 *  look into the lens), xray (the x-ray window opens over his elbow), pulse (the cable inside glows/pulses) */
export const hookAt = (id: number, t: number) => (id === 1 ? {
  walk: ramp(t, 0, T(BEAT.whack1)), whack: ramp(t, T(BEAT.whack1) - 0.03, 0.05), wince: ramp(t, T(BEAT.whack1), 0.12) * (1 - ramp(t, W.definitely - 0.2, 0.25)),
  sock: ramp(t, T(BEAT.whack1) + 0.02, T(BEAT.sock - BEAT.whack1)), zing: ramp(t, T(BEAT.whack1) + 0.05, 0.1) * (1 - ramp(t, W.and - 0.1, 0.4)),
  glare: ramp(t, W.definitely - 0.2, 0.25), xray: ramp(t, T(BEAT.xray), 0.3), pulse: ramp(t, W.nerve - 0.1, 0.2),
} : { walk: 0, whack: 0, wince: 0, sock: 0, glare: 0, zing: 0, xray: 0, pulse: 0 });
/** shot 2 arm: neck (substation lights up), route (signposts / the line reads end to end), squeeze (0..1 the cable
 *  squeezes into the gap: bulge travels through), noPad (sign-holder lifts NO PADDING), skin (the roof glow comes up),
 *  shadow (the door-frame shadow darkens the roof), whack (0..1 the slam: frame down), dent (roof dent depth 0..1:
 *  snaps in on the whack, eases back to ~0.35), spark (sparks build on the cable at the dent) */
export const armAt = (id: number, t: number) => (id === 2 ? {
  neck: ramp(t, W.neck - 0.15, 0.25), route: ramp(t, W.all - 0.1, 0.8), squeeze: ramp(t, W.squeezes - 0.1, 1.2),
  noPad: ramp(t, W.no - 0.15, 0.2), skin: ramp(t, W.just - 0.25, 0.5), shadow: ramp(t, W.when - 0.15, 0.4) * (1 - ramp(t, T(BEAT.whack2) + 0.3, 0.6) * 0.5),
  whack: ramp(t, T(BEAT.whack2) - 0.12, 0.12), dent: ramp(t, T(BEAT.whack2) - 0.03, 0.04) * (1 - 0.65 * ramp(t, T(BEAT.whack2) + 0.15, 0.6)),
  spark: ramp(t, W.basically - 0.1, 0.9),
} : { neck: 0, route: 0, squeeze: 0, noPad: 0, skin: 0, shadow: 0, whack: 0, dent: 0, spark: 0 });
/** shot 3 PEAK: zap (0..1 electrocution on: instant), buzz (a 0..1 sawtooth at ~15 Hz for the jitter / bolt redraw,
 *  quantised per frame), settle (the last frames: the shake eases before the dissolve) */
export const peakAt = (id: number, t: number) => (id === 3 ? {
  zap: ramp(t, T(BEAT.peak) - 0.01, 0.03), buzz: ((t * FPS) % 2) / 2, settle: ramp(t, T(456), 0.2),
} : { zap: 0, buzz: 0, settle: 0 });
/** shot 4 surge: line (0..1 the light front: from the elbow outward to BOTH ends, arm.ts maps it to cable length),
 *  allOn (every lamp blazing), scream (PINKY screams), ring (RING's half-scream), fine (PINKY stops, pats himself),
 *  bandaid (the band-aid goes on), calm (the line dims back to a soft glow) */
export const surgeAt = (id: number, t: number) => (id === 4 ? {
  line: ramp(t, W.the2 - 0.1, 1.0), allOn: ramp(t, W.up - 0.15, 0.2) * (1 - 0.6 * ramp(t, W.totally - 0.2, 0.6)),
  scream: ramp(t, W.pinky2 - 0.15, 0.15) * (1 - ramp(t, W.totally - 0.25, 0.25)), ring: ramp(t, W.pinky2 - 0.05, 0.15) * (1 - ramp(t, W.totally - 0.15, 0.25)),
  fine: ramp(t, W.totally - 0.15, 0.25), bandaid: ramp(t, T(BEAT.bandaid), 0.2), calm: ramp(t, W.totally - 0.2, 0.6),
} : { line: 0, allOn: 0, scream: 0, ring: 0, fine: 0, bandaid: 0, calm: 0 });
/** shot 5 museum: ponder (BEAN "?"), smirk (SKELLY's shifty side-eye), tap (SKELLY taps its humerus), glint (plaque
 *  glints), flip (0..1 the plaque rotates HUMERUS -> HUMOROUS), rimshot (ba-dum-tss lettering), skLaugh (SKELLY's jaw
 *  clacks), laugh0..3 (portraits 1840 / 1900 / 1950 / 1990 laugh, in turn), dust (dust puff from the 1840 frame) */
export const museumAt = (id: number, t: number) => (id === 5 ? {
  ponder: ramp(t, W.why - 0.15, 0.2), smirk: ramp(t, W.probably - 0.1, 0.25) * (1 - ramp(t, W.the4 - 0.2, 0.3)),
  tap: ramp(t, W.right - 0.15, 0.2) * (1 - ramp(t, W.humerus2 + 0.3, 0.3)), glint: ramp(t, W.humerus - 0.1, 0.2),
  flip: ramp(t, T(BEAT.flip), 0.28), rimshot: ramp(t, T(BEAT.rimshot), 0.1) * (1 - ramp(t, T(BEAT.rimshot) + 0.9, 0.3)),
  skLaugh: ramp(t, W.humorous + 0.1, 0.25), laugh0: ramp(t, T(BEAT.laugh), 0.15), dust: ramp(t, T(BEAT.laugh), 0.9),
  laugh1: ramp(t, T(BEAT.laugh2) - 0.1, 0.15), laugh2: ramp(t, T(BEAT.laugh3) - 0.1, 0.15), laugh3: ramp(t, T(BEAT.laugh4) - 0.1, 0.15),
} : { ponder: 0, smirk: 0, tap: 0, glint: 0, flip: 0, rimshot: 0, skLaugh: 0, laugh0: 0, dust: 0, laugh1: 0, laugh2: 0, laugh3: 0 });
/** shot 6 end: deadpan (half-lidded stare), exit (0..1 he turns + walks out screen-right), bonk (the offscreen BONK
 *  star at the right frame edge), zzt (a tiny zap squiggle after it) */
export const endAt = (id: number, t: number) => (id === 6 ? {
  deadpan: ramp(t, W.its3 - 0.15, 0.2), exit: ramp(t, T(BEAT.exit), 0.45), bonk: ramp(t, T(BEAT.bonk) - 0.03, 0.05),
  zzt: ramp(t, T(BEAT.bonk) + 0.1, 0.1),
} : { deadpan: 0, exit: 0, bonk: 0, zzt: 0 });

// ---------------- camera (lead / cam owner; first pass) ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
export type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ha = at(HALL), Ar = at(ARM), Mu = at(MUSEUM);
// RULE 2: every move is a glide (CAMS) or a RIDE (Catmull-Rom through several keys, warped to start / end at rest) that
// LANDS before its key word. Key-word frames: bone 17 bone2 37 | definitely 68 funny2 85 | nerve 113 | neck 157 pinky
// 189 | elbow 225 tiny 273 gap 284 no 296 padding 301 | skin 338 | whack 376 | live 429 WIRE 437 (PEAK) | whole 464
// line 472 up 487 | pinky2 526 screams 536 | totally 579 fine 593 | weird 635 part 642 | why 672 funny3 680 | pun 729 |
// humerus 807 humerus2 840 humorous 881 | joke 949 | years 983 | still 1007 not2 1013 funny4 1017.
/** BEAN's right ELBOW in the hallway (the x-ray window centre + the dive target), local to HALL. cast.ts MUST draw
 *  his elbow here in shot 1 (the card is a billboard: keep the hook ~5 cm in front of the card toward the lens). */
export const ELBOW_L: V3 = [-0.32, 0.86, -1.08];
export type Path = { k: CK[]; rest: [boolean, boolean] };
const P = (rest: [boolean, boolean], ...k: CK[]): Path => ({ k, rest });
// ---- shot 1: the hook ----
const C1 = K(0, Ha(0.95, 1.22, 1.75), Ha(0.0, 0.98, -1.2), 42);                 // 3/4 front of the doorway: the BONK (12) + wince
const C1b = K(48, Ha(0.9, 1.21, 1.68), Ha(0.0, 0.98, -1.2), 42);                // (a 7 cm creep: reads still)
const C1glare = (f: number, d = 0) => K(f, Ha(0.35, 1.22, 0.55 - d), Ha(0.08, 1.08, -1.15), 40); // push in: the glare "definitely not funny" (68-97)
const C1x = (f: number, d = 0) => K(f, Ha(-0.12, 1.0, -0.05 - d), Ha(...ELBOW_L), 36);   // the x-ray window on his elbow: "nerve" (113)
const DIVE = P([true, false], C1x(116), K(136, Ha(ELBOW_L[0], ELBOW_L[1] + 0.01, ELBOW_L[2] + 0.62), Ha(...ELBOW_L), 10)); // crash-zoom into the x-ray window
// ---- shot 2: the arm ----
const C2neck = (f: number, d = 0) => K(f, Ar(-13.5 - d, 2.4, 4.9), Ar(-16.5, 1.45, 0.5), 50);     // the NECK SUBSTATION: "neck" (157) (qa1: framed so the NECK - C8/T1 plate on the +z face reads)
const FALL = P([false, true], K(124, Ar(-18.5, 6.5, 7.5), Ar(-15.0, 2.0, 0.0), 54), K(138, Ar(-15.0, 3.6, 6.0), Ar(-15.4, 1.4, 0.0), 50), C2neck(152));
const C2wide = (f: number, d = 0) => K(f, Ar(-14.8 - d, 2.7, 1.9), Ar(4.0, 1.2, 0.0), 50);       // rise + turn down the line: the WHOLE cable, through the elbow arch to Pinky Town glowing: "pinky" (189)
const C2elbow = (f: number, d = 0) => K(f, Ar(-3.8 + d, 1.95, 3.3), Ar(0.0, 1.05, 0.0), 48);    // the elbow gap: "elbow" (225)
const C2gap = (f: number, d = 0) => K(f, Ar(-0.6 + d, 1.08, 2.35), Ar(0.45, 0.53, 0.35), 54);     // (cam) from the open +z side: the gap + the sweating cable + the sign-holder: "squeezes .. tiny gap" (250-284) "no padding" (296-301)
const C2skin = (f: number, d = 0) => K(f, Ar(-1.7 + d, 1.15, 2.2), Ar(0.2, 2.4, 0.1), 52);      // tilt up: the glowing skin roof: "just skin" (331-338)
// (qa1) was high in the roof funnel looking DOWN the line: the roof (shadow 367, dent 378) sat out of frame and the sign
// was cut by the frame edge. Now a low 3/4 from the open +z side that holds the skin roof, the bare cable and the
// sign-holder at once: the door-frame shadow darkens the roof, then the dent SLAMS down onto the cable (378).
const C2whack = (f: number, d = 0) => K(f, Ar(-1.7 + d, 1.2, 2.25), Ar(0.45, 1.55, 0.1), 62);
const C2zap = (f: number, d = 0) => K(f, Ar(-1.2 + d, 1.15, 1.9), Ar(0.6, 1.3, 0.1), 56);        // push into the dent, sparks: "live" (429) (qa1: a gentle push on the whack framing: dent + cable + worker stay in frame; was a washed-out close-up)
// ---- shot 3: the PEAK ----
const C3 = (f: number, d = 0) => K(f, Ha(-0.02, 1.2, 0.5 - d), Ha(-0.06, 1.02, -1.15), 44);        // BEAN's face, big: "WIRE" (437)
// ---- shot 4: the surge ----
const C4town = (f: number, d = 0) => K(f, Ar(14.9 + d, 1.55, 3.7), Ar(18.3, 1.0, 0.25), 46);    // Pinky Town: PINKY + RING: "screams" (536)
const C4fine = (f: number, d = 0) => K(f, Ar(16.65 + d, 1.2, 2.85), Ar(18.2, 0.74, 1.0), 44);    // push in on PINKY: "totally fine" (579-593)
const SWOOP = P([true, true], C2wide(490, 0.2), K(498, Ar(-5.0, 1.6, 0.65), Ar(1.0, 1.45, 0.3), 52), K(503, Ar(0.0, 1.55, 0.55), Ar(6.0, 1.4, 0.3), 54),
  K(509, Ar(7.0, 1.9, 1.6), Ar(16.0, 1.3, 0.4), 50), C4town(516)); // RIDE down the line THROUGH the elbow arch (under the dented roof) into Pinky Town
const RISE = P([true, false], C4fine(596, 0.06), K(620, Ar(17.6, 5.8, 2.2), Ar(18.6, 12.0, 0.3), 62)); // rise into the glow -> the museum
// ---- shot 5: the museum ----
const C5wide = (f: number, d = 0) => K(f, Mu(0.7, 1.72, 5.3 - d), Mu(0.32, 1.12, 0.0), 52);    // land wide on SKELLY: "weird part" (635-642) (qa2: BEAN was half cut by the right edge)
const DESCEND = P([false, true], K(604, Mu(0.6, 5.2, 5.7), Mu(0.3, 2.6, 0.0), 58), C5wide(632));
const C5bean = (f: number, d = 0) => K(f, Mu(1.95, 1.35, 3.5 - d), Mu(0.85, 1.05, 1.0), 44);     // BEAN "?": "why funny" (672-680)
const C5skel = (f: number, d = 0) => K(f, Mu(0.35, 1.45, 2.7 - d), Mu(0.0, 1.15, 0.0), 44);      // SKELLY smirks: "probably a pun" (713-729)
// (qa2) the plaque 3/4 from the left: the WHOLE plaque (its left end was cut by the frame) + SKELLY's face above it, so his
// tap / grin / jaw-clacking laugh at the flip are in the same frame as HUMOROUS. Creeps in along its axis.
const C5hum = (f: number, d = 0) => K(f, Mu(-1.5 + 0.64 * d, 1.45, 1.9 - 0.82 * d), Mu(-0.4, 1.3, 0.15), 44); // the plaque: "humerus" (807) .. "humorous" (881)
const C5p = (f: number, z: number, d = 0) => K(f, Mu(-1.3 + d, 1.74, z + 0.5), Mu(-3.4, 1.75, z), 44); // a portrait, 3/4
const TRUCK = P([true, true], C5p(952, -0.6, 0.03), K(962, Mu(-1.3, 1.74, -1.6), Mu(-3.4, 1.75, -2.4), 44), K(972, Mu(-1.35, 1.74, -3.3), Mu(-3.4, 1.75, -4.1), 44),
  K(980, Mu(-1.4, 1.75, -5.4), Mu(-3.4, 1.75, -5.4), 40));                                       // along the laughing row to BEAN's 2026 portrait: "years" (983)
const PORTAL = P([true, true], K(984, Mu(-1.4, 1.75, -5.4), Mu(-3.4, 1.75, -5.4), 40), K(1004, Mu(-2.59, 1.75, -5.4), Mu(-3.4, 1.75, -5.4), 34)); // push INTO the portrait (shot 5 ends at 998, still slowing: settleAt continues the same curve in the hall)
// ---- shot 6: the end ----
// (qa2) rest framing widened (1.6 m @ 38 -> 2.05 m @ 42): the pillow (the padding gag) was cut by the left edge and the
// doorway was gone; now head-to-knees with the pillow + the right jamb in frame, so the exit + offscreen BONK read.
const C6 = (f: number, d = 0) => K(f, Ha(0.06, 1.15, 0.89 - d), Ha(0.06, 0.98, -1.15), 42);        // BEAN in the doorway (matches the portrait): "still not funny" (1007-1029)
/** (cam) THE PORTAL: shot 6 keeps pushing IN along C6's axis at the SAME apparent zoom rate as the push into the
 *  2026 portrait (shot 5 PORTAL), so BEAN in the hall and BEAN in the painting stay registered through the 986-998
 *  dissolve (cast paints the portrait from camAt(6, 992)). scale ~ 1/(d tan(fov/2)): the hall camera's d*tan follows the
 *  portrait camera's (times K), split between a dolly and a zoom (the hall is only 3.6 m deep), then eases to rest on
 *  C6 at SET_END (no stop before 998: the dissolve never sees the hall camera turn round). */
const SET_A = 986, SET_END = 1004; // = the PORTAL path's end key
const C6REST = C6(SET_END);
type SetC = { u: V3; D: number; P6: number; k: number };
let SETC: SetC | null = null; // lazy (sub / len / pathAt are defined further down)
const portalG = (f: number) => { const c = pathAt(PORTAL, Math.min(SET_END, f)); return (c.pos[0] - (MUSEUM[0] - 3.37)) * Math.tan((c.fov * Math.PI) / 360); };
const setC = (): SetC => SETC ??= (() => {
  const d = sub(C6REST.pos, C6REST.look), D = len(d), P6 = D * Math.tan((C6REST.fov * Math.PI) / 360);
  return { u: d.map((x) => x / D) as V3, D, P6, k: P6 / portalG(SET_END) };
})();
const settleAt = (f: number): Cam => {
  const { u: ax, D: D6, P6, k } = setC(), p = k * portalG(Math.max(SET_A, f));
  const D = D6 * Math.pow(p / P6, 0.35), tn = p / D; // dolly 35 %, zoom 65 % (the hall is only 3.6 m deep; qa2: 45 -> 35 % keeps the wider rest framing's start inside the hall)
  return { pos: [C6REST.look[0] + ax[0] * D, C6REST.look[1] + ax[1] * D, C6REST.look[2] + ax[2] * D], look: C6REST.look, fov: (Math.atan(tn) * 360) / Math.PI, roll: 0 };
};
export const CAMS: Record<number, CK[]> = {
  1: [C1, C1b, C1glare(64), C1glare(98, 0.05), C1x(108), C1x(116, 0.02), DIVE.k[1]],
  2: [C2neck(152), C2neck(160, 0.04), C2wide(186), C2wide(196, 0.06), C2elbow(220), C2elbow(232, 0.04), C2gap(248), C2gap(312, 0.08),
    C2skin(328), C2skin(344, 0.03), C2whack(360), C2whack(392, 0.06), C2zap(426), C2zap(433, 0.02)],
  3: [C3(433), C3(462, 0.05)],
  4: [C2wide(462, 0.12), C2wide(490, 0.2), C4town(516), C4town(560, 0.08), C4fine(575), C4fine(596, 0.06)],
  5: [C5wide(632), C5wide(648, 0.06), C5bean(666), C5bean(690, 0.04), C5skel(708), C5skel(745, 0.06), C5hum(795), C5hum(914, 0.11), // (cam) hold until the BA-DUM-TSS card is gone (913)
    C5p(942, -0.6), C5p(952, -0.6, 0.03), K(980, Mu(-1.4, 1.75, -5.4), Mu(-3.4, 1.75, -5.4), 40)],
  6: [C6REST, C6(1072, 0.1)],
};
/** per shot: the RIDEs (continuous flights through several keys; used inside [first key, last key], CAMS holds their
 *  end keys). One extra glide (C5hum -> the 1840 portrait, 914-942) is a plain CAMS glide. */
export const RIDE: Record<number, Path[]> = { 1: [DIVE], 2: [FALL], 4: [SWOOP, RISE], 5: [DESCEND, TRUCK, PORTAL] };
/** camera shakes: [frame, amplitude] */
const KICKS: [number, number][] = [[BEAT.whack1, 0.01], [BEAT.whack2, 0.016], [BEAT.peak, 0.02]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const mix3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const camKey = (ks: CK[], f: number): Cam => {
  if (f <= ks[0].f) return { pos: ks[0].pos, look: ks[0].look, fov: ks[0].fov, roll: ks[0].roll ?? 0 };
  let i = 0;
  while (i < ks.length - 2 && f >= ks[i + 1].f) i++;
  const A = ks[i], B = ks[i + 1];
  if (f >= B.f) return { pos: B.pos, look: B.look, fov: B.fov, roll: B.roll ?? 0 };
  const Tn = B.f - A.f, u = (f - A.f) / Tn, g = glide(u);
  const look = mix3(A.look, B.look, g);
  const dA = sub(A.pos, A.look), dB = sub(B.pos, B.look), lA = len(dA), lB = len(dB);
  const dir = mix3(dA.map((v) => v / lA) as V3, dB.map((v) => v / lB) as V3, g), dl = len(dir);
  const p0 = Math.log(lA), p1 = Math.log(lB), m0 = (A.vd ?? 0) * Tn, m1 = (B.vd ?? 0) * Tn, u2 = u * u, u3 = u2 * u;
  const d = Math.exp(p0 * (2 * u3 - 3 * u2 + 1) + m0 * (u3 - 2 * u2 + u) + p1 * (3 * u2 - 2 * u3) + m1 * (u3 - u2));
  return { pos: [look[0] + (dir[0] / dl) * d, look[1] + (dir[1] / dl) * d, look[2] + (dir[2] / dl) * d], look, fov: A.fov + (B.fov - A.fov) * g, roll: (A.roll ?? 0) + ((B.roll ?? 0) - (A.roll ?? 0)) * g };
};
/** time warp 0..1: eased (zero speed) at a rested end, constant speed at a moving end */
const warp = (u: number, r: [boolean, boolean]) => (r[0] && r[1] ? glide(u) : r[0] ? u * u * (2 - u) : r[1] ? u + u * u - u * u * u : u);
const pathAt = (Q: Path, f: number): Cam => {
  const ks = Q.k, f0 = ks[0].f, f1 = ks[ks.length - 1].f, ft = f0 + warp(clamp01((f - f0) / (f1 - f0)), Q.rest) * (f1 - f0);
  let i = 0;
  while (i < ks.length - 2 && ft >= ks[i + 1].f) i++;
  const A = ks[i], B = ks[i + 1], Tn = B.f - A.f, u = clamp01((ft - A.f) / Tn), u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const tan = (j: number, g: (k: CK) => number) => { const a = ks[Math.max(0, j - 1)], b = ks[Math.min(ks.length - 1, j + 1)]; return (g(b) - g(a)) / (b.f - a.f); };
  const ip = (g: (k: CK) => number) => h00 * g(A) + h10 * Tn * tan(i, g) + h01 * g(B) + h11 * Tn * tan(i + 1, g);
  return { pos: [ip((k) => k.pos[0]), ip((k) => k.pos[1]), ip((k) => k.pos[2])], look: [ip((k) => k.look[0]), ip((k) => k.look[1]), ip((k) => k.look[2])], fov: ip((k) => k.fov), roll: 0 };
};
export const camAt = (id: number, f: number): Cam => {
  const Q = (RIDE[id] ?? []).find((q) => f >= q.k[0].f && f <= q.k[q.k.length - 1].f);
  const c = id === 6 && f < SET_END ? settleAt(f) : Q ? pathAt(Q, f) : camKey(CAMS[id], f);
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
// mild lens blur only (backgrounds must be SHARP): [frame, cInf], linearly blended between keys (no pops)
const DOFK: [number, number][] = [[0, 0.35], [TOTAL, 0.35]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0;
  while (i < DOFK.length - 1 && f >= DOFK[i + 1][0]) i++;
  const A = DOFK[i], B = DOFK[Math.min(i + 1, DOFK.length - 1)];
  const u = B[0] > A[0] ? clamp01((f - A[0]) / (B[0] - A[0])) : 0;
  return { cInf: A[1] + (B[1] - A[1]) * u };
};
