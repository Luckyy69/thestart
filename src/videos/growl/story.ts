// "The Cleaning Crew" (why your stomach growls): a funny science short timed to ~/growl-short/voice/words.json
// (34.5 s, voice "Liam"). Owner: "make it insanely good and funny"; <= 40 s, relatable; rendered in the CLOUD.
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one ("your stomach growling doesn't mean it's hungry, it
// means it's CLEANING"), climbs to one twist (the cleaning crew runs on a SCHEDULE: it starts right before you usually
// eat... which is why it always growls in the quietest room possible). 2 CAMERA very few cuts: travel, LAND, then the
// important word is said while still. 3 LIGHT low sun, long shadows, blue shade, haze; the light changes when the story
// turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 5 "always GROWLS": BEAN in the silent
// exam hall, a monster GRRROWL: mortified meme face, eyes bulge, sweat, beet-red; the whole hall turns to stare).
// Watermark on (common/Watermark.tsx). World units metres. PLACES (ALL NEW):
//   HALL  (0,0,0)     a big silent school EXAM HALL at a cool late morning: rows of little single desks (3 rows x 4,
//                     spacing 1.3 m in x, 1.4 m in z, desks face -z toward the front), tall windows on the LEFT wall
//                     (x -5) with venetian blinds raking long stripes of low sun across the floor, a big round WALL
//                     CLOCK on the front wall (z -5, y 3.2) whose hands read 11:58 in shot 1 and tick to 11:59 /
//                     12:00 in shot 5 ("LUNCH" sticker at 12), a "SILENCE - EXAM IN PROGRESS" sign, the teacher's
//                     desk at HALL+(0,0,-3.8). BEAN sits at the middle desk HALL+(0,0,0) (seat y 0.45, desk top y
//                     0.75, desk at z -0.35) facing -z; other pupils (cast) at the other desks; the TEACHER at the
//                     front desk.
//   BELLY (1000,0,0)  INSIDE BEAN's STOMACH, giant scale: a huge cosy cavern (floor ~y 0, ~16 m long along x, ~9 m
//                     wide in z, ~8 m high): soft pink-orange walls with big wavy RUGAE folds, a glowing green-yellow
//                     pool of stomach JUICE (acid) on the floor (centre BELLY+(0,0.05,0), ~6 m wide), a few CRUMBS,
//                     shiny AIR BUBBLE pockets, the oesophagus opening in the roof at BELLY+(-5,8,0) (food drops in from
//                     there in shot 3) and the exit (pylorus) tunnel at BELLY+(7,1.5,0). The CREW's corner: hammocks,
//                     an alarm clock, a tiny wall clock, mops and brooms at BELLY+(-3,0,2.5). The SQUEEZE: a glowing
//                     ring of muscle that contracts the cavern wall and travels from x -6 to x +7 (a big wave), pushing
//                     crumbs and the crew's giant broom; when it squishes the AIR BUBBLE at BELLY+(1.5,1.2,-1) the
//                     GROWL (sound rings + big "GRRROWL" letters) echoes around the cavern.
//                     Shot 3 = the SAME cavern FULL: food (spaghetti, a pizza slice, broccoli, a burger, peas) tumbles
//                     in from the roof and fills it; the same squeeze only makes a tiny muffled "mmf".
//   STAFF (2000,0,0)  the crew's STAFF ROOM inside the stomach wall: a cosy break room (lockers, a vending machine, a
//                     coffee machine, a punch-card TIME CLOCK, a big SCHEDULE BOARD "SHIFT: CLEAN - 11:59 (right before
//                     LUNCH)", a big wall CLOCK at STAFF+(0,2.2,-2.2) at 11:58 -> 11:59). The crew (cast) gather; the
//                     FOREMAN points at the schedule and blows a whistle.
export const FPS = 30;
export const TOTAL = 1095;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const HALL: V3 = [0, 0, 0];
export const BELLY: V3 = [1000, 0, 0];
export const STAFF: V3 = [2000, 0, 0];

/** word cues (s) */
export const W = {
  your: 0.0, stomach: 0.267, growling: 0.615, doesnt: 0.987, hungry: 1.521, it: 2.171, means: 2.31, cleaning: 2.659,
  when: 3.68, stomach2: 4.005, empty: 4.563, cleaning2: 5.294, crew: 5.619, wakes: 5.828, up: 6.107, every: 7.117,
  hour: 7.454, two: 7.814, giant: 8.557, squeeze: 8.905, sweeps: 9.323, down: 9.671, gut: 9.996, pushing: 10.472,
  every2: 11.041, last: 11.366, crumb: 11.645, but: 12.458, no: 12.817, food: 13.061, there: 13.41, air: 14.408,
  juice: 15.058, squish: 16.057, echoes: 17.009, thats: 18.123, growl: 18.495, your2: 19.598, does: 20.132,
  full: 20.875, too: 21.13, you: 22.071, cant: 22.442, hear: 22.686, food2: 23.836, muffles: 24.346, sound: 24.915,
  now: 25.995, weird: 26.308, part: 26.564, crew2: 27.388, schedule: 28.062, starts: 28.793, before: 29.315,
  usually: 29.791, eat: 30.175, which: 30.906, always: 31.556, growls: 31.928, quietest: 32.996, room: 33.472,
  possible: 33.704,
};
export const FLASHES: number[] = [];

export type Look = "hall" | "belly" | "full" | "staff" | "hush" | "peak";
export type Place = "hall" | "belly" | "staff";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 108, look: "hall", place: "hall", light: "day" },        // HOOK (silent exam hall, cool late morning, blinds): close on BEAN at his desk: "Your stomach growling" (0.3-0.6) his belly RUMBLES (t-shirt ripples, little sound lines, a pencil rattles); "doesn't mean it's hungry" (1.0-1.5) he looks down at it, puzzled; "It means it's cleaning" (2.3-2.7) a tiny yellow "CLEANING IN PROGRESS" wet-floor sign pops up out of his belly button with a little gloved hand (it waves); then DIVE into his belly
  { id: 2, a: 108, b: 570, look: "belly", place: "belly", light: "golden" }, // THE EMPTY STOMACH (giant cavern): "goes empty" (4.6) land on the empty cavern, a few crumbs, the juice pool glowing; "a cleaning crew wakes up" (5.6-6.1) the tiny janitor CREW in hammocks, an alarm clock rings, they jump up; "every hour or two" (7.1-7.8) a little clock spins; "a giant squeeze sweeps down your gut" (8.9-10.0) the muscle ring CONTRACTS and travels down the cavern like a wave, the crew surf/push a giant broom; "pushing out every last crumb" (10.5-11.6) crumbs swept into the exit tunnel; "no food in there, just air and juice" (12.8-15.1) land on the shiny AIR BUBBLE over the JUICE pool; "Squish it, and it echoes" (16.1-17.0) the squeeze SQUISHES the bubble: sound rings bounce off the walls; "That's the growl" (18.1-18.5) huge "GRRROWL" letters echo
  { id: 3, a: 570, b: 778, look: "full", place: "belly", light: "golden" },  // THE FULL STOMACH (same cavern, continuous camera, the light warms: LOOK_RAMPS belly -> full): "does this when it's full too" (20.1-21.1) FOOD tumbles in from the roof (spaghetti, pizza, broccoli, burger) and fills the cavern; "you just can't hear it" (22.4-22.9) the same squeeze rolls under the food; "food muffles the sound" (24.3-24.9) only a tiny muffled "mmf" bubble pops out, a crew member under a pizza slice gives a thumbs-up
  { id: 4, a: 778, b: 920, look: "staff", place: "staff", light: "golden" }, // THE TWIST (the crew's staff room): "Now the weird part" (26.0-26.6) the crew in their break room, coffee; "the crew runs on a schedule" (27.4-28.1) the SCHEDULE board "CLEAN: 11:59 (right before LUNCH)"; "so it starts right before you usually eat" (28.8-30.2) the wall clock ticks to 11:59, the FOREMAN blows the whistle, the crew grab mops and run
  { id: 5, a: 920, b: 1095, look: "hush", place: "hall", light: "day" },     // PAYOFF (the silent exam hall again, hushed, the light dimmer/cooler with a single sun stripe on BEAN): "Which is why it always" (30.9-31.6) silence, the clock hits 11:59; "GROWLS" (31.9) THE PEAK (light ramps hush -> peak): a monster GRRROWL, BEAN's MORTIFIED MEME face; "in the quietest room possible" (33.0-33.7) the WHOLE hall and the teacher turn and stare; hold (BEAN sinks in his seat, a tiny crew member pops out of his belly button: "sorry")
];
export const XFADE: Record<number, number> = { 2: 10, 4: 12, 5: 12 }; // 2 -> 3: no dissolve (continuous camera, same cavern)
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["belly", "full", 570, 610, "belly"], ["hush", "peak", 954, 962, "hall"]];
/** (QA2) after the peak the light SETTLES back toward the calm hush (rule 3: the story turns from the meme to the
 *  stare): the extra mix toward "hush" (0..1) for shot 5, stepped ONLY on the hard cuts (982 stare reveal, 1023 "sorry")
 *  so no exposure change happens inside a shot. 0 everywhere else (frames < 982 unchanged). */
export const settleAt = (id: number, f: number) => (id !== 5 || f < 982 ? 0 : f < 1023 ? 0.82 : 0.92);
/** shots that share another shot's (frozen) sun so a continuous camera never sees the sun jump */
export const SUN_FROM: Record<number, number> = { 3: 2, 5: 1 };
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
/** shot 1: rumble (belly rumbles, shirt ripples), puzzled (looks down), sign (wet-floor sign + gloved hand pops out of
 *  the belly button), wave (the hand waves) */
export const hookAt = (id: number, t: number) => (id === 1 ? {
  rumble: ramp(t, W.stomach, 0.2) * (1 - ramp(t, W.hungry + 0.2, 0.4)), puzzled: ramp(t, W.doesnt - 0.15, 0.25),
  sign: ramp(t, W.means - 0.2, 0.3), wave: ramp(t, W.cleaning - 0.1, 0.2),
} : { rumble: 0, puzzled: 0, sign: 0, wave: 0 });
/** shot 2 empty stomach: alarm (clock rings), wake (crew jump up), clock (little clock spins), squeeze (0..1 = the
 *  muscle wave's travel x -6 -> +7), sweep (crumbs pushed into the exit), bubble (air bubble highlight), squish (the
 *  wave squishes the bubble), echo (sound rings), growl (big GRRROWL letters) */
export const bellyAt = (id: number, t: number) => (id === 2 ? {
  alarm: ramp(t, W.crew - 0.3, 0.15) * (1 - ramp(t, W.up + 0.3, 0.3)), wake: ramp(t, W.wakes - 0.1, 0.3),
  clock: ramp(t, W.every - 0.1, 0.8), squeeze: ramp(t, W.squeeze - 0.2, 2.9), sweep: ramp(t, W.pushing - 0.1, 1.3),
  bubble: ramp(t, W.air - 0.2, 0.4), squish: ramp(t, W.squish - 0.1, 0.25), echo: ramp(t, W.echoes - 0.2, 1.4),
  growl: ramp(t, W.growl - 0.1, 0.2),
} : { alarm: 0, wake: 0, clock: 0, squeeze: 0, sweep: 0, bubble: 0, squish: 0, echo: 0, growl: 0 });
/** shot 3 full stomach: fill (food tumbles in and fills the cavern), squeeze2 (the wave rolls under the food),
 *  muffle (tiny "mmf" bubble), thumbs (crew member's thumbs-up under the pizza) */
export const fullAt = (id: number, t: number) => (id === 3 ? {
  fill: ramp(t, W.does - 0.3, 1.2), squeeze2: ramp(t, W.cant - 0.3, 2.2), muffle: ramp(t, W.muffles - 0.1, 0.3),
  thumbs: ramp(t, W.sound - 0.1, 0.25),
} : { fill: 0, squeeze2: 0, muffle: 0, thumbs: 0 });
/** shot 4 staff room: board (the schedule board lights up), tick (wall clock 11:58 -> 11:59), whistle (foreman blows),
 *  run (crew grab mops and run) */
export const staffAt = (id: number, t: number) => (id === 4 ? {
  board: ramp(t, W.schedule - 0.3, 0.3), tick: ramp(t, W.before - 0.1, 0.15), whistle: ramp(t, W.usually - 0.1, 0.15),
  run: ramp(t, W.eat - 0.1, 0.5),
} : { board: 0, tick: 0, whistle: 0, run: 0 });
/** shot 5 payoff: tick (hall clock 11:58 -> 11:59), peak (THE MEME GROWL), stare (everyone turns), sink (BEAN sinks
 *  in his seat), sorry (tiny crew member: "sorry") */
export const endAt = (id: number, t: number) => (id === 5 ? {
  tick: ramp(t, W.always - 0.1, 0.12), peak: ramp(t, W.growls - 0.08, 0.12), stare: ramp(t, W.quietest - 0.25, 0.35),
  sink: ramp(t, W.possible + 0.3, 0.5), sorry: ramp(t, W.possible + 0.9, 0.3),
} : { tick: 0, peak: 0, stare: 0, sink: 0, sorry: 0 });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Ha = at(HALL), Be = at(BELLY), St = at(STAFF);
// CAMERA (RULE 2, cam owner): very few cuts. Every move is a glide (or a Catmull-Rom PATH through several keys) that
// LANDS at rest before its key word, which is then said on a still frame. Key-word frames: stomach 8 doesnt 30 hungry 46
// means 69 cleaning 80 | empty 137 crew 169 wakes 175 every 213 squeeze 267 crumb 349 no 385 air 432 juice 452 squish 482
// echoes 510 growl 555 | full 626 cant 673 muffles 730 sound 748 | weird 789 part 797 schedule 842 before 880 usually
// 894 eat 905 | always 947 GROWLS 958 quietest 990 room 1004 possible 1011.
// Transitions: 1->2 crash-zoom into BEAN's hoodie hatch (cast BELLY_HOOK) / dissolve / fall down the oesophagus and pull
// back to reveal the empty cavern | 2->3 one continuous swing round the cavern while the food pours in | 3->4 swoosh into
// the flesh wall / dissolve / through the "STAFF ONLY" doorway | 4->5 chase the crew into their EXIT door / dissolve /
// whoosh in from the window side onto BEAN | shot 5: two hard cuts (the stare reveal from behind, then BEAN again).
/** cast BELLY_HOOK (the hatch on BEAN's hoodie belly, 5 cm in front of his card), local to HALL */
const HOOK_L: V3 = [0, (975 - 500) * 0.00216 * 0.8, -0.05];
/** a flight through several keys: Catmull-Rom (pos, look, fov) in key time, warped so it starts / ends at rest */
type Path = { k: CK[]; rest: [boolean, boolean] };
const P = (rest: [boolean, boolean], ...k: CK[]): Path => ({ k, rest });
// ---- shot 1: the hook ----
const C1 = K(0, Ha(0.1, 1.24, -1.95), Ha(0, 0.97, 0), 40);                                          // medium-close from the front
const C1b = K(87, Ha(0.08, 1.23, -1.88), Ha(0, 0.96, 0), 40);                                      // (a 6 cm creep: reads still)
const DIVE = P([true, false], C1b, K(112, Ha(HOOK_L[0], HOOK_L[1] + 0.015, HOOK_L[2] - 0.6), Ha(...HOOK_L), 9)); // crash-zoom into the hatch
// ---- shot 2: the empty stomach ----
const C2land = K(132, Be(-5.6, 4.6, -1.8), Be(2.0, 1.6, 0.6), 62);
const FALL = P([false, true], K(103, Be(-5.1, 11.4, -0.3), Be(-3.9, 3.5, 0.6), 64), K(116, Be(-5.0, 6.6, -0.6), Be(-2.0, 2.0, 0.0), 63), C2land);                                    // down the oesophagus, level out down the cavern: "empty" (137)
const C2crew = (f: number, d = 0) => K(f, Be(-2.2 + d, 4.2, -3.0 + d), Be(-3.3, 0.45, 2.2), 56);  // the crew corner + alarm + wall clock: "crew" (169) "wakes up" (175) "every hour or two" (213)
const C2clock = (f: number, d = 0) => K(f, Be(-2.0 + d, 4.0, -2.6), Be(-2.3, 1.6, 2.6), 50);     // tilt up to the little wall clock spinning: "every hour or two" (213)
const C2wideA = (f: number, d = 0) => K(f, Be(-7.3 + d, 4.8, -0.6), Be(2.5, 1.4, 0.2), 60);      // (qa1 look y 1.4 -> 1.6: crew faces below the caption band; pos z 0.9 -> -0.6, look z -0.6 -> 0.2: the broom now sweeps past the bubble on the +z side, keep the crew corner out of the frame) down the length: "squeeze" (267)
const C2wideB = (f: number, d = 0) => K(f, Be(-1.6 + d, 3.9, 0.5), Be(6.5, 3.3, -0.2), 54);       // (qa1 look y 2.1 -> 3.3: crew faces below the caption band) push in after the wave: crumbs into the EXIT: "every last crumb" (349)
const C2bub = (f: number, d = 0) => K(f, Be(-6.0 + d, 3.2, 1.2 - d / 2), Be(2.0, 1.4, -0.9), 54); // (qa1) was from (-3, 2.8, 3.1): the bubble (and its squish) was cropped at the left edge; now bubble + watching crew both fit, crew corner out of frame // the bubble: "air" (432) "squish" (482)
const C2growl = (f: number, d = 0) => K(f, Be(-4.6 + d, 4.3, 3.15), Be(2.1, 2.5, -0.8), 58);     // pull back: "growl" (555)
const C3full = (f: number, d = 0) => K(f, Be(4.6 - d, 5.2, 1.3), Be(-3.0, 2.6, -0.3), 62);        // the food pours in: "full" (626)
const SWING = P([true, true], C2growl(560, 0.04), K(586, Be(0.4, 5.0, 2.9), Be(-4.0, 4.0, 0.0), 62), C3full(612));
// ---- shot 3: the full stomach ----
const C3mmf = (f: number, d = 0) => K(f, Be(4.7 - d, 1.8, 0.95), Be(3.0, 0.42, 0.9), 54); // (QA2) longer lens: less blurry near floor         // the pizza + "mmf": "muffles" (730)
const SWOOSH = P([true, false], C3mmf(756, 0.04), K(784, Be(4.6, 2.2, 1.9), Be(4.2, 2.0, 6.0), 56)); // swoosh into the flesh wall
// ---- shot 4: the staff room ----
const C4wide = (f: number, d = 0) => K(f, St(0.2, 1.52, 4.0 - d), St(0.1, 1.22, -1.3), 62); // (QA2) look lower: crew faces above the caption band       // "the weird part" (797)
const DOOR = P([false, true], K(772, St(0.15, 1.5, 7.2), St(0.05, 1.3, 4.6), 58), K(784, St(0.05, 1.45, 5.2), St(0.05, 1.3, 0.0), 60), C4wide(794));
const C4board = (f: number, d = 0) => K(f, St(-1.3, 1.8, 2.9 - d), St(-0.95, 1.48, -2.0), 56); // (QA2) lower: BOSS's face above the caption band   // board + clock + foreman: "schedule" (842) .. "eat" (905)
const CHASE = P([true, false], C4board(902, 0.05), K(926, St(-2.05, 1.35, 0.9), St(-2.17, 1.05, -2.6), 60)); // after the crew into the EXIT door
// ---- shot 5: the payoff ----
const C5med = (f: number, d = 0) => K(f, Ha(0.1, 1.45, -2.0 + d), Ha(0, 1.0, 0), 40);           // "which is why it always" (927-947)
const WHOOSH = P([false, true], K(914, Ha(-2.2, 2.5, -3.4), Ha(-0.3, 1.1, 0.0), 50), C5med(936));
const C5close = (f: number, d = 0) => K(f, Ha(0.03, 1.28, -1.5 + d), Ha(0, 1.24, 0), 46); // (QA2) head lower in frame: headroom for BIG letters        // THE MEME, big: "GROWLS" (958)
const C5back = (f: number, d = 0) => K(f, Ha(0.15, 2.85, 4.5 - d), Ha(-0.1, 0.9, -1.5), 60); // (QA2) wider + higher: the WHOLE hall stares (was 2 cropped pupils)        // CUT: the whole hall turns to stare: "quietest room possible"
const C5front = (f: number, d = 0) => K(f, Ha(-0.07, 1.2, -1.12 + d), Ha(-0.09, 1.02, 0), 54); // BEAN left of the centred caption       // CUT: BEAN sinks; the tiny crew member: "sorry"
const CAMS: Record<number, CK[]> = {
  1: [C1, C1b, DIVE.k[1]],
  2: [C2land, K(142, C2land.pos, C2land.look, 62), C2crew(160), C2crew(200, 0.06), C2clock(212), C2clock(236, 0.04), C2wideA(262), C2wideA(298, 0.08),
    C2wideB(340), C2wideB(372, 0.04), C2bub(404), C2bub(512, 0.12), C2growl(540), C2growl(560, 0.04)],
  3: [C3full(612), C3full(690, 0.08), C3mmf(724), C3mmf(756, 0.04)],
  4: [C4wide(794), C4wide(814, 0.05), C4board(838), C4board(902, 0.05)],
  5: [C5med(936), C5med(947, 0.04), C5close(956), C5close(981, 0.03), C5back(982), C5back(1022, 0.12), C5front(1023), C5front(1095, 0.1)],
};
/** per shot: the flights (used inside [first key, last key]; CAMS holds their end keys) */
const PATHS: Record<number, Path[]> = { 1: [DIVE], 2: [FALL, SWING], 3: [SWING, SWOOSH], 4: [DOOR, CHASE], 5: [WHOOSH] };
/** camera shakes: [frame, amplitude] */
const KICKS: [number, number][] = [[957, 0.012]]; // the monster GROWL
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
/** time warp 0..1: eased (zero speed) at a rested end, constant speed at a moving end */
const warp = (u: number, r: [boolean, boolean]) => (r[0] && r[1] ? glide(u) : r[0] ? u * u * (2 - u) : r[1] ? u + u * u - u * u * u : u);
const pathAt = (Q: Path, f: number): Cam => {
  const ks = Q.k, f0 = ks[0].f, f1 = ks[ks.length - 1].f, ft = f0 + warp(clamp01((f - f0) / (f1 - f0)), Q.rest) * (f1 - f0);
  let i = 0;
  while (i < ks.length - 2 && ft >= ks[i + 1].f) i++;
  const A = ks[i], B = ks[i + 1], T = B.f - A.f, u = clamp01((ft - A.f) / T), u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const tan = (j: number, g: (k: CK) => number) => { const a = ks[Math.max(0, j - 1)], b = ks[Math.min(ks.length - 1, j + 1)]; return (g(b) - g(a)) / (b.f - a.f); };
  const ip = (g: (k: CK) => number) => h00 * g(A) + h10 * T * tan(i, g) + h01 * g(B) + h11 * T * tan(i + 1, g);
  return { pos: [ip((k) => k.pos[0]), ip((k) => k.pos[1]), ip((k) => k.pos[2])], look: [ip((k) => k.look[0]), ip((k) => k.look[1]), ip((k) => k.look[2])], fov: ip((k) => k.fov), roll: 0 };
};
export const camAt = (id: number, f: number): Cam => {
  const Q = (PATHS[id] ?? []).find((q) => f >= q.k[0].f && f <= q.k[q.k.length - 1].f);
  const c = Q ? pathAt(Q, f) : camKey(CAMS[id], f);
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
const DOFK: [number, number][] = [[0, 0.5], [981, 0.5], [982, 0.3], [1022, 0.3], [1023, 0.5], [1095, 0.5]]; // the wide stare reveal: crisper
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0;
  while (i < DOFK.length - 1 && f >= DOFK[i + 1][0]) i++;
  const A = DOFK[i], B = DOFK[Math.min(i + 1, DOFK.length - 1)];
  const u = B[0] > A[0] ? clamp01((f - A[0]) / (B[0] - A[0])) : 0;
  return { cInf: A[1] + (B[1] - A[1]) * u };
};
