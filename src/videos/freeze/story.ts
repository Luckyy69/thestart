// "Wrong Address" (why ice cream gives you brain freeze): a funny science short timed to
// ~/freeze-short/voice/words.json (33.4 s, voice "Liam"). Owner: "make it insanely good and funny"; <= 40 s, relatable;
// rendered in the CLOUD.
// STYLE RULES (user, binding): 1 SCRIPT strange fact in line one ("brain freeze isn't happening in your brain"), climbs
// to one twist (a SCHOOLKID and her dad proved it: the fast ice-cream eaters got TWICE the brain freeze). 2 CAMERA very
// few cuts: travel, LAND, then the important word is said while still. 3 LIGHT low sun, long shadows, blue shade, haze;
// the light changes when the story turns. 4 FACES one feeling per line; the big meme face ONLY at the peak (shot 4
// "Twice the brain freeze": BEAN, one of the fast eaters, FREEZES: eyes bulge, frost explodes over his head, icicle
// hair, ice-blue flash).
// Watermark on (common/Watermark.tsx). World units metres. PLACES (ALL NEW):
//   PARK  (0,0,0)     a summer city PARK at a warm low golden late afternoon: a pastel ICE-CREAM CART (striped
//                     umbrella, "ICE CREAM" sign, cone-shaped sign on a pole) at PARK+(1.3,0,-1.3); grass, a curving
//                     gravel path, a park bench at PARK+(-1.4,0,-1.2), round trees, a pond, flower beds, lamp posts,
//                     distant pastel city skyline and hills. Long warm shadows, blue shade. BEAN stands at
//                     PARK+(-0.15,0,-0.2) facing +z, holding a huge 3-scoop cone (pink/mint/vanilla).
//                     Shot 5 = the SAME park at DUSK (rose sky, lamps lit, string lights on the cart).
//   MOUTH (1000,0,0)  INSIDE BEAN's mouth, giant scale (a cosy pink cave): floor = the TONGUE (surface y 0, x -4..4,
//                     running z +6 (lips, a bright opening framed by giant upper/lower TEETH) -> z -8 (dark throat)),
//                     the PALATE (roof of the mouth) arches overhead (apex y 5.5) with ridges; red BLOOD VESSELS run
//                     along the palate like plump pipes; a glowing yellow NERVE cable runs from the palate back
//                     and UP into a tunnel at the back (toward the brain). A giant ICE-CREAM SCOOP slab slides in from
//                     the lips and slams against the palate on "cold".
//   HQ    (2000,0,0)  BRAIN HQ inside BEAN's head: a cosy retro control room. The back wall has TWO big round EYE
//                     WINDOWS looking out at the park (glowing warm). A big switchboard CONSOLE at HQ+(0,0,-1.2) with
//                     two big alarm lamps on a panel above it labelled "MOUTH" (left, x -0.7) and "FOREHEAD" (right,
//                     x +0.7) at y ~1.9, z -1.6; the yellow NERVE cable comes up through the floor at HQ+(0,0,0.6)
//                     and SPLITS (one plug, two wires) to both lamps. The BRAIN character (pink, wrinkly, headset)
//                     sits at the console on a swivel chair at HQ+(0,0,-0.5) facing the panel (3/4 to the lens).
//   GYM   (3000,0,0)  a school SCIENCE FAIR in a gym at a cool bright morning (low sun through high windows on the
//                     left: long beams across the wooden floor): a long table at z -0.9 with two groups of kids: FAST
//                     (left, x -1.6..-0.2, banner "FAST") and SLOW (right, x 0.2..1.6, banner "SLOW"); BEAN sits
//                     in the FAST group at GYM+(-0.45,0,-0.9). The SCHOOLKID (girl, lab goggles, pigtails,
//                     stopwatch) stands at GYM+(0.1,0,0.1) with her DAD (tall, glasses, clipboard) at
//                     GYM+(0.65,0,0.0); a trifold poster "ICE-CREAM HEADACHE STUDY" and a BAR CHART board at
//                     GYM+(2.1,0,-1.0) whose FAST bar rises to 2x on "Twice".
export const FPS = 30;
export const TOTAL = 1065;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
export const LEAD = 2 / FPS;

export const PARK: V3 = [0, 0, 0];
export const MOUTH: V3 = [1000, 0, 0];
export const HQ: V3 = [2000, 0, 0];
export const GYM: V3 = [3000, 0, 0];

/** word cues (s) */
export const W = {
  brain: 0.0, freeze: 0.337, isnt: 0.639, happening: 0.882, brain1: 1.509, your2: 2.183, cant: 2.589, feel: 2.995,
  pain: 3.262, cold: 4.075, hits: 4.377, roof: 4.702, mouth: 5.155, blood: 5.968, vessels: 6.223, squeeze: 6.861,
  shut: 7.279, then: 7.872, blast: 8.104, wide: 8.487, open: 8.789, nerve: 9.659, rings: 9.985, alarm: 10.403,
  but: 11.018, same: 11.389, nerve2: 11.645, wires: 12.237, forehead: 12.829, so: 13.56, brain2: 13.874,
  confused: 14.338, blames: 15.325, face: 15.743, now: 16.811, weird: 17.124, part: 17.391, schoolkid: 18.169,
  dad: 18.912, tested: 19.168, half: 20.306, kids: 20.677, ate: 20.967, fast: 21.641, half2: 22.314, slow: 22.825,
  fast2: 24.032, ones: 24.346, twice: 25.17, brain3: 25.623, freeze2: 25.878, fix: 27.121, press: 28.119,
  warm: 28.572, tongue: 28.839, roof2: 29.373, mouth2: 29.849, or: 30.557, eat: 31.463, slower: 31.684, nah: 32.914,
};
export const FLASHES: number[] = [];

export type Look = "park" | "mouth" | "hq" | "gym" | "peak" | "parkend";
export type Place = "park" | "mouth" | "hq" | "gym";
export type ShotDef = { id: number; a: number; b: number; look: Look; place: Place; light: "day" | "golden" };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 120, look: "park", place: "park", light: "golden" },     // HOOK (warm golden park): open CLOSE on BEAN chomping his huge 3-scoop cone: "Brain freeze" (0.0) frost creeps over his forehead, he clutches it (ouch); "isn't happening in your brain" (0.9-1.5) hold; "Your brain can't even feel pain" (2.2-3.3) the top of his head flips open like a lid, his little BRAIN peeks out and shrugs, holding a tiny sign "0 PAIN SENSORS"; then DIVE into his open mouth
  { id: 2, a: 120, b: 346, look: "mouth", place: "mouth", light: "golden" },  // INSIDE THE MOUTH (pink cave): "The cold hits the roof" (4.1-4.7) the giant ice-cream slab slams onto the palate, frost spreads (light turns cold blue on the palate); "blood vessels there squeeze shut" (6.2-7.3) the red vessel pipes PINCH thin (little scared faces); "then blast wide open" (8.1-8.8) they BALLOON fat (boing); "A nerve rings the alarm" (9.7-10.4) the yellow nerve lights up, a big alarm BELL on it rings; "But that same nerve" (11.0) travel along the glowing cable up the tunnel toward the brain
  { id: 3, a: 346, b: 500, look: "hq", place: "hq", light: "golden" },       // BRAIN HQ: the cable arrives; "also wires up your forehead" (12.2-12.8) the plug splits: BOTH lamps "MOUTH" and "FOREHEAD" flash; "So your brain gets confused" (14.3) the BRAIN at the console scratches its head ("?"); "and blames your face" (15.3-15.7) it slams the big red button: a big "FOREHEAD!" alarm + a pointing arrow at the FOREHEAD lamp
  { id: 4, a: 500, b: 805, look: "gym", place: "gym", light: "day" },        // THE TWIST (school science fair, cool bright morning): "Now the weird part" (16.8) land wide; "A schoolkid and her dad tested this" (18.2-19.2) the girl (goggles) clicks her stopwatch, dad raises his clipboard; "Half the kids ate ice cream fast" (20.3-21.6) the FAST group shovels; "Half ate it slow" (22.3-22.8) the SLOW group takes tiny dainty licks; "The fast ones?" (24.0) the girl points at the FAST group; "Twice the brain freeze" (25.2) THE PEAK (light ramps gym -> peak): BEAN's MEME FREEZE face, the FAST bar shoots up to "2x"
  { id: 5, a: 805, b: 1065, look: "parkend", place: "park", light: "golden" }, // OUTRO (the park at dusk): "The fix?" (27.1) BEAN with a fresh cone, finger up; "Press your warm tongue to the roof of your mouth" (28.1-29.8) he does it: cheeks puff, tongue up, relief (a little warm glow); "Or... eat slower." (30.6-31.7) he looks at the cone, considers; "Nah." (32.9) he shoves the WHOLE cone in: instantly frozen into an ice block (deadpan), hold
];
export const XFADE: Record<number, number> = { 2: 10, 3: 12, 4: 12, 5: 12 };
/** smooth light turns: [fromLook, toLook, f0, f1, place] */
export const LOOK_RAMPS: [Look, Look, number, number, Place][] = [["gym", "peak", 752, 760, "gym"]];
/** shots that share another shot's (frozen) sun so a continuous camera never sees the sun jump */
export const SUN_FROM: Record<number, number> = {};
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
/** shot 1: bite (chomp), frost (creeps over his forehead), ouch (clutches forehead), lid (head-top flips open), brain
 *  (brain peeks out), shrug (brain shrugs + "0 PAIN SENSORS" sign), close (lid closes before the dive), open (mouth
 *  opens wide for the dive) */
export const hookAt = (id: number, t: number) => (id === 1 ? {
  bite: ramp(t, 0.0, 0.25), frost: ramp(t, 0.25, 0.9), ouch: ramp(t, W.freeze - 0.05, 0.25),
  lid: ramp(t, W.your2 - 0.35, 0.3) * (1 - ramp(t, 3.55, 0.25)), brain: ramp(t, W.your2 - 0.2, 0.35) * (1 - ramp(t, 3.5, 0.25)),
  shrug: ramp(t, W.pain - 0.3, 0.25) * (1 - ramp(t, 3.6, 0.2)), open: ramp(t, 3.4, 0.3),
} : { bite: 0, frost: 0, ouch: 0, lid: 0, brain: 0, shrug: 0, open: 0 });
/** shot 2 mouth: slab (ice-cream slab slides in, 0..1 = lips -> palate), cold (impact + frost spreading over the
 *  palate), squeeze (vessels pinch), blast (vessels balloon), nerve (cable glows), alarm (bell ringing), travel
 *  (pulse races up the cable toward the brain) */
export const mouthAt = (id: number, t: number) => (id === 2 ? {
  slab: ramp(t, W.cold - 0.45, 0.45), cold: ramp(t, W.cold - 0.02, 0.6), squeeze: ramp(t, W.squeeze - 0.15, 0.35) * (1 - ramp(t, W.blast - 0.15, 0.12)),
  blast: ramp(t, W.blast - 0.15, 0.2) * (1 - 0.5 * ramp(t, W.nerve, 0.6)), nerve: ramp(t, W.nerve - 0.3, 0.35),
  alarm: ramp(t, W.rings - 0.15, 0.15), travel: ramp(t, W.but - 0.2, 0.9),
} : { slab: 0, cold: 0, squeeze: 0, blast: 0, nerve: 0, alarm: 0, travel: 0 });
/** shot 3 HQ: pulse (signal arrives through the cable), mouthLamp, foreLamp (both flash), confused, blame (slams the
 *  button: FOREHEAD alarm) */
export const hqAt = (id: number, t: number) => (id === 3 ? {
  pulse: ramp(t, W.same + 0.1, 0.4), mouthLamp: ramp(t, W.nerve2 + 0.42, 0.2), // QA: the pulse arrives after the tunnel ride (shot 3 fades in 340-352)
  foreLamp: ramp(t, W.forehead - 0.12, 0.15),
  confused: ramp(t, W.confused - 0.15, 0.25) * (1 - ramp(t, W.blames - 0.1, 0.15)), blame: ramp(t, W.blames - 0.08, 0.15),
} : { pulse: 0, mouthLamp: 0, foreLamp: 0, confused: 0, blame: 0 });
/** shot 4 gym: girl (stopwatch click), dad (clipboard up), fast (fast group shovels), slow (slow group dainty), point
 *  (girl points at FAST), peak (BEAN's MEME FREEZE), chart (FAST bar rises to 2x) */
export const gymAt = (id: number, t: number) => (id === 4 ? {
  girl: ramp(t, W.schoolkid - 0.15, 0.25), dad: ramp(t, W.dad - 0.15, 0.25), fast: ramp(t, W.fast - 0.6, 0.3),
  slow: ramp(t, W.slow - 0.4, 0.3), point: ramp(t, W.fast2 - 0.15, 0.25), peak: ramp(t, W.twice - 0.08, 0.12),
  chart: ramp(t, W.twice - 0.05, 0.45),
} : { girl: 0, dad: 0, fast: 0, slow: 0, point: 0, peak: 0, chart: 0 });
/** shot 5 outro: fix (finger up), tongue (tongue to the roof: cheeks puff, relief glow), think (looks at the cone),
 *  nah (shoves the whole cone in), ice (frozen into an ice block) */
export const endAt = (id: number, t: number) => (id === 5 ? {
  fix: ramp(t, W.fix - 0.15, 0.25) * (1 - ramp(t, W.press - 0.2, 0.2)), tongue: ramp(t, W.tongue - 0.25, 0.25) * (1 - ramp(t, W.or - 0.2, 0.25)),
  think: ramp(t, W.or - 0.1, 0.3) * (1 - ramp(t, W.nah - 0.15, 0.1)), nah: ramp(t, W.nah - 0.05, 0.18), ice: ramp(t, W.nah + 0.25, 0.2),
} : { fix: 0, tongue: 0, think: 0, nah: 0, ice: 0 });

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** a camera key: frame, position, look point, fov, roll, vd (log-distance velocity per frame at this key) */
type CK = { f: number; pos: V3; look: V3; fov: number; roll?: number; vd?: number };
const K = (f: number, pos: V3, look: V3, fov: number, o: { roll?: number; vd?: number } = {}): CK => ({ f, pos, look, fov, ...o });
const at = (o: V3) => (x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const Pa = at(PARK), Mo = at(MOUTH), Hq = at(HQ), Gy = at(GYM);
// CAMERA (RULE 2): very few cuts; every move is a quintic glide that LANDS (zero velocity) before its key word, which is
// then said on a still frame. Keys past a shot's last visible frame (vd set) keep the camera moving through cross-fades.
// Frames of the key words: brain 0 | your2 65 pain 98 | cold 122 roof 141 | squeeze 206 blast 243 open 264 | nerve 290
// alarm 312 | but 331 | wires 367 forehead 385 | confused 430 blames 460 | now 504 | schoolkid 545 dad 567 | fast 649 |
// slow 685 | fast2 721 | twice 755 freeze2 776 | fix 814 | press 844 tongue 865 | or 917 slower 951 | nah 987.
const HOOK: V3 = [-0.15, 1.135, -0.17]; // cast MOUTH_HOOK (the centre of BEAN's wide-open "aah" mouth)
const CAMS: Record<number, CK[]> = {
  1: [K(0, Pa(-0.1, 1.3, 2.15), Pa(-0.1, 1.2, -0.2), 40), K(100, Pa(-0.1, 1.3, 2.09), Pa(-0.1, 1.2, -0.2), 40),        // still MEDIUM-CLOSE: BEAN + the whole cone, room above for the lid, brain + sign
    K(126, [HOOK[0], HOOK[1] + 0.02, HOOK[2] + 0.64], HOOK, 9, { vd: -0.03 })],                                               // DIVE: crash-zoom into the open mouth (dissolves into the giant mouth)
  2: [K(114, Mo(0, 2.0, 11.0), Mo(0, 2.4, 0), 62, { vd: -0.03 }), K(134, Mo(0, 1.75, 8.3), Mo(0, 3.0, -2.5), 66),        // through the lips: LAND framed by the teeth: "the cold hits the roof" (141)
    K(186, Mo(0, 1.75, 8.2), Mo(0, 3.0, -2.5), 66), K(203, Mo(0.4, 1.95, 5.5), Mo(0.35, 5.0, -0.6), 62),                      // push up to the vessels: "squeeze shut" (206) .. "blast wide open" (243-264)
    K(270, Mo(0.4, 1.95, 5.45), Mo(0.35, 5.0, -0.6), 62), K(287, Mo(-0.9, 1.9, 3.4), Mo(1.2, 3.6, -3.0), 58),               // to the NERVE + BELL: "a nerve" (290) lights up, "rings the alarm" (300-312)
    K(316, Mo(-0.9, 1.9, 3.3), Mo(1.2, 3.6, -3.0), 58)],                                                                   // then RIDE (below): "but" (331) chase the pulse up the nerve tunnel
  3: [K(334, Hq(0.9, 0.35, 1.25), Hq(-0.6, 1.0, 0.2), 56, { vd: 0.03 }), K(360, Hq(0.62, 0.95, 3.4), Hq(0.15, 0.81, -1.1), 49), // up out of the floor hole with the cable: LAND wide: "wires" (367) "forehead" (385)
    K(402, Hq(0.62, 0.95, 3.38), Hq(0.15, 0.81, -1.1), 49), K(424, Hq(0.58, 0.92, 3.05), Hq(0.15, 0.8, -1.1), 49),            // ease in: "confused" (430), "blames your face" (460-472)
    K(482, Hq(0.58, 0.92, 3.03), Hq(0.15, 0.8, -1.1), 49), K(506, Hq(0.6, 2.78, -1.6), Hq(0.6, 2.78, -2.4), 34, { vd: -0.04 })], // push into BEAN's right EYE window ...
  4: [K(494, Gy(-2.6, 3.3, 0.9), Gy(-4, 3.45, 0.2), 40, { vd: -0.03 }), K(514, Gy(-1.0, 2.4, 5.2), Gy(0.0, 1.1, -0.9), 52), // ... out of the gym's sunny window: LAND wide: "weird part" (514) (qa2: from the left so the dad stands in the gap between the SLOW kids)
    K(526, Gy(-1.0, 2.4, 5.17), Gy(0.0, 1.1, -0.9), 52), K(542, Gy(0.42, 1.38, 2.75), Gy(0.38, 1.12, 0.0), 47),            // the girl + her dad: "schoolkid" (545) "dad" (567)
    K(598, Gy(0.42, 1.38, 2.72), Gy(0.38, 1.12, 0.0), 47), K(620, Gy(-0.95, 1.4, 1.3), Gy(-0.95, 0.95, -1.06), 50),          // the FAST group: "ate it fast" (629-649)
    K(655, Gy(-0.95, 1.4, 1.28), Gy(-0.95, 0.95, -1.06), 50), K(676, Gy(2.2, 1.5, 1.05), Gy(1.08, 0.98, -1.1), 54),       // the SLOW group: "slow" (685)
    K(700, Gy(2.19, 1.5, 1.03), Gy(1.08, 0.98, -1.1), 54), K(717, Gy(-0.1, 1.45, 2.9), Gy(-0.3, 1.0, -0.6), 52),         // the girl points: "the fast ones?" (721)
    K(735, Gy(-0.1, 1.45, 2.88), Gy(-0.3, 1.0, -0.6), 52), K(750, Gy(1.16, 1.5, 1.37), Gy(2.16, 1.2, -1.14), 50),     // (qa2) the CHART, big: "Twice" (755): the FAST bar shoots to 2x
    K(765, Gy(1.14, 1.5, 1.33), Gy(2.16, 1.2, -1.14), 50), K(766, Gy(-0.62, 1.32, 0.97), Gy(-0.47, 1.1, -1.06), 42),    // hard CUT (a whip would sweep the girl + dad past the lens) to BEAN:
    K(792, Gy(-0.62, 1.32, 0.92), Gy(-0.47, 1.1, -1.06), 42), K(808, Gy(-0.4, 1.3, 0.6), Gy(-4.5, 2.7, -0.4), 42)], // his MEME face explodes (768): "brain freeze" (769-776), BIG, still; WHOOSH: whip left into the window glare
  5: [K(799, Pa(-0.2, 1.3, 2.2), Pa(3.6, 1.4, 0.4), 42), K(812, Pa(0.0, 1.3, 2.15), Pa(-0.12, 1.12, -0.2), 42),         // whip in from the right: LAND on BEAN at dusk: "the fix?" (814)
    K(824, Pa(0.0, 1.3, 2.13), Pa(-0.12, 1.12, -0.2), 42), K(842, Pa(-0.08, 1.3, 1.6), Pa(-0.12, 1.17, -0.2), 40),          // push in: "press your warm tongue" (844-895)
    K(950, Pa(-0.08, 1.3, 1.57), Pa(-0.12, 1.17, -0.2), 40), K(978, Pa(0.0, 1.25, 2.9), Pa(-0.12, 0.95, -0.2), 44),         // "or eat slower" (917-951); pull back for the ICE BLOCK: "Nah" (987)
    K(1065, Pa(0.0, 1.25, 2.84), Pa(-0.12, 0.95, -0.2), 44)],
};
/** QA: the shot-2 RIDE: a continuous chase (Hermite through timed keys, starts from rest, never stops) behind the nerve
 *  pulse (mouth.ts pulseS: leaves the palate root at f 312, past the bell, down the throat, up the tunnel by f 342) */
const RIDE: Record<number, CK[]> = {
  2: [K(316, Mo(-0.9, 1.9, 3.3), Mo(1.2, 3.6, -3.0), 58), K(324, Mo(-0.7, 2.15, 0.4), Mo(1.4, 3.6, -4.0), 60),
    K(330, Mo(0.5, 2.05, -3.2), Mo(0.95, 3.4, -7.0), 64), K(336, Mo(-0.1, 3.4, -6.0), Mo(0.8, 8.0, -8.8), 68),
    K(342, Mo(0.05, 6.0, -7.6), Mo(0.7, 12.5, -9.6), 68), K(348, Mo(0.0, 9.2, -8.9), Mo(0.5, 15.0, -10.0), 66),
    K(354, Mo(0.0, 11.5, -9.3), Mo(0.4, 16.0, -10.2), 66)]
};
/** camera shakes: [frame, amplitude] */
const KICKS: [number, number][] = [[459, 0.012]]; // the brain SLAMS the big red button
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
const herm = (ks: CK[], f: number): Cam => {
  let i = 0;
  while (i < ks.length - 2 && f >= ks[i + 1].f) i++;
  const A = ks[i], B = ks[i + 1], T = B.f - A.f, u = clamp01((f - A.f) / T), u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  const tan = (j: number, g: (k: CK) => number) => (j <= 0 ? 0 : (g(ks[Math.min(ks.length - 1, j + 1)]) - g(ks[j - 1])) / (ks[Math.min(ks.length - 1, j + 1)].f - ks[j - 1].f));
  const ip = (g: (k: CK) => number) => h00 * g(A) + h10 * T * tan(i, g) + h01 * g(B) + h11 * T * tan(i + 1, g);
  return { pos: [ip((k) => k.pos[0]), ip((k) => k.pos[1]), ip((k) => k.pos[2])], look: [ip((k) => k.look[0]), ip((k) => k.look[1]), ip((k) => k.look[2])], fov: ip((k) => k.fov), roll: 0 };
};
export const camAt = (id: number, f: number): Cam => {
  const R = RIDE[id];
  const c = R && f >= R[0].f ? herm(R, f) : camKey(CAMS[id], f);
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
const DOFK: [number, number][] = [[0, 0.5], [1065, 0.5]];
export const dofAt = (f: number): { cInf: number; focus?: (f: number) => V3 } => {
  let i = 0;
  while (i < DOFK.length - 1 && f >= DOFK[i + 1][0]) i++;
  const A = DOFK[i], B = DOFK[Math.min(i + 1, DOFK.length - 1)];
  const u = B[0] > A[0] ? clamp01((f - A[0]) / (B[0] - A[0])) : 0;
  return { cInf: A[1] + (B[1] - A[1]) * u };
};
