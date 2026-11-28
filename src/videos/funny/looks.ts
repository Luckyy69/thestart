// "Live Wire" per-look light rigs (OWNER: looks agent; this is the lead's FIRST PASS: tune every look on stills).
// RULE 3: a low sun, long shadows, blue shade, haze; the light CHANGES when the story turns. Sun azimuths are
// CAMERA-RELATIVE (bridge/lights.ts): 0 = ahead (backlight), +90 = screen right, 180 = behind the camera; world.ts
// freezes the sun per shot from the shot's mean view direction (SUN_FROM shares a sun between shots). Skies: 5 stops c[i]
// at elevation e[i] deg, ON-SCREEN colours (world.ts pre-inverts the tone map). lit / shade / lift are linear multipliers
// for the world two-tone (bridge/shade.ts TONE); charTint / sideTint / charShade tint the character cards (CHAR).
// Places with their own shader rig may read sunAz / sunEl.
//
// The colour arc: a WARM low MORNING sun down the hallway (honey stripes, blue shade) -> a warm RED-ORANGE arm cavern
// lit by the glowing yellow cable -> "just skin": the low sun glowing THROUGH the skin roof (hot peach translucency) ->
// "live wire": ELECTRIC (the cavern drops into violet dark, the cable + sparks blaze cyan-white) -> THE PEAK: the hallway
// under a hard electric-blue key, deep navy shade -> PINKY TOWN: cosy lamp-lit dusk (warm windows, blue shade) -> the
// TWIST: a dusty amber ANATOMY MUSEUM (long late-afternoon beams, sepia haze) -> "humorous": a stage SPOTLIGHT pops on
// the plaque, the room dims -> END: the hallway again, the sun lower, cooler, flatter (deadpan).
//   hall   : low morning sun from the hallway's END window (x +5): WORLD bearing HALL_SUN_BEARING (light travels -x down
//            the hall, drifting toward the back wall), el 12; az solved per shot 1's mean view (~110 = behind-right):
//            long honey stripe along the floor past the doorway, BEAN's long shadow along the back wall; blue shade.
//   arm    : warm cavern. "sun" = a soft glow from the far skin roof ahead (az -20, el 32); ground/bounce = the cable's
//            yellow glow from below. Rose-maroon shade, a peach haze swallowing the far ends (fog 8 -> 60 m).
//   skin   : (ramp arm -> skin 312-330) SAME az/el as arm; the key pushed hot peach-pink, lift up (light through skin).
//   zap    : (ramp skin -> zap 398-428; shot 4 starts here) SAME az/el; key cold cyan-white, shade deep violet,
//            hemi down, fog dark plum: the cable + sparks (emissive, bloom) carry the frame.
//   peak   : the hallway (shared sun with shot 1): a HARD electric-blue key, deep navy shade. World saturation DOWN
//            (0.62): the sunny yellow kitchen would turn olive/green under a blue key; desaturated it goes electric
//            blue-lavender and BEAN's card (CHAR, not uSat) pops against it.
//   town   : (ramp zap -> town 492-514) cosy dusk: warm lamp key low from behind-left (az -140, el 14), blue shade.
//            NOTE town is reached by a ramp inside shot 4: keep its az/el EQUAL to arm/zap (the sun is frozen per
//            shot); the warmth comes from colours + the town's own lamps.
//   museum : late-afternoon low sun through the RIGHT windows (WORLD bearing MUSEUM_SUN_BEARING, az ~90, el 15):
//            long amber beams slanting across the gallery toward the lens, dust, sepia haze.
//   pun    : (ramp museum -> pun 876-884) SAME az/el: the whole room dims (key, shade, lift, hemi, fog down); the
//            spotlight is lightfx's cone + pool + plaque halo (the plaque stays bright against the dim room).
//   hallend: the hallway at the end: the same bearing as hall (SUN_FROM 6:1), lower + cooler, flatter, bluer shade.
import { LIGHTS, LightPreset } from "../bridge/lights";
import { Look, SHOTS, camAt } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });

// ---- skies (on-screen colours, elevation stops in degrees) ----
const hallSky = { c: ["#fff0d0", "#ffe2b4", "#d8e4f0", "#a8c8ec", "#78a6e0"], e: [0, 3, 9, 22, 50] };
const armSky = { c: ["#ffb08c", "#f49a84", "#d8787c", "#a85870", "#6a3a5a"], e: [0, 3, 9, 20, 46] };
const skinSky = { c: ["#ffd0a8", "#ffbc98", "#f49c8c", "#c87884", "#8a5070"], e: [0, 3, 9, 20, 46] };
const zapSky = { c: ["#4a3a7a", "#3a2e6a", "#2a225a", "#1c1846", "#100e30"], e: [0, 3, 9, 20, 46] };
const peakSky = { c: ["#3a5090", "#2e427e", "#24346a", "#1a2858", "#101a40"], e: [0, 3, 9, 22, 50] };
const townSky = { c: ["#ffb88a", "#f49a8a", "#b8789a", "#6a5a9a", "#3a3a7a"], e: [0, 3, 9, 22, 50] };
const museumSky = { c: ["#ffd8a0", "#f4c890", "#d8b490", "#a89aa0", "#6a7aa0"], e: [0, 3, 9, 22, 50] };
const punSky = { c: ["#8a6a5a", "#6a5450", "#4a3e48", "#302a3c", "#1a1a2c"], e: [0, 3, 9, 22, 50] };
const hallendSky = { c: ["#ffd8b0", "#f4c8a8", "#c4cce0", "#94b0dc", "#6688cc"], e: [0, 3, 9, 22, 50] };

// ---- light presets ----
/** WORLD sun bearings. The world sun is camera-relative (frozen per shot from the shot's mean view), so the hall and
 *  museum suns are solved from a WORLD bearing (deg, atan2(z, x) of the horizontal toward-the-sun vector) and the shot's
 *  mean view direction (same sampling as world.ts shotSun): the shafts stay locked to the windows even when the cameras
 *  change. HALL: the light travels down the hall (-x) from the END window, drifting slightly toward the back wall (-z),
 *  so the honey stripe runs along the floor past the kitchen doorway and catches BEAN; his long shadow falls screen-left
 *  along the back wall. MUSEUM: the light enters the RIGHT windows and slants across the gallery toward the lens (+z),
 *  through SKELLY, onto the parquet in long diagonal bars. */
export const HALL_SUN_BEARING = 7, MUSEUM_SUN_BEARING = -18.5;
const azFor = (id: number, bearing: number) => {
  const s = SHOTS[id - 1];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  let az = bearing - (Math.atan2(fz, fx) * 180) / Math.PI;
  while (az > 180) az -= 360;
  while (az <= -180) az += 360;
  return Math.round(az * 10) / 10;
};
const SUN_HALL = { az: azFor(1, HALL_SUN_BEARING), el: 12 }, SUN_ARM = { az: -20, el: 32 }, SUN_MU = { az: azFor(5, MUSEUM_SUN_BEARING), el: 15 };
const hall = mk(gold, { ...SUN_HALL, lit: [1.95, 1.6, 1.12], shade: [0.26, 0.34, 0.68], lift: [0.03, 0.04, 0.09], term: 0.07, lambert: 0.28, sideK: 0.84,
  charTint: [1.0, 0.94, 0.84], sideTint: [0.78, 0.88, 1.06], charShade: 0.84, charGrad: 0.07, sunCol: "#ffe2b0", sunI: 5.2, sky: "#cfe0f6", ground: "#9a8068", hemiI: 0.46,
  fog: "#f0e0cc", actorShadow: true, bias: -0.0005, normalBias: 0.025 });
const peak = mk(hall, { lit: [0.52, 0.68, 2.05], shade: [0.07, 0.12, 0.42], lift: [0.008, 0.02, 0.07], term: 0.05,
  charTint: [0.85, 0.98, 1.2], sideTint: [0.5, 0.62, 1.3], charShade: 0.6, sunCol: "#b8e4ff", sunI: 7.0, sky: "#4a6ab8", ground: "#1e2a50", hemiI: 0.3,
  fog: "#24346a" });
const hallend = mk(hall, { lit: [1.75, 1.45, 1.1], shade: [0.2, 0.28, 0.62], lift: [0.02, 0.032, 0.08],
  charTint: [0.94, 0.92, 0.9], sideTint: [0.7, 0.8, 1.04], charShade: 0.7, sunCol: "#ffd4a0", sunI: 4.6, sky: "#b4c8e6", ground: "#6a5a54", hemiI: 0.38,
  fog: "#c8c8d8" });
const arm = mk(gold, { ...SUN_ARM, lit: [1.9, 1.3, 0.96], shade: [0.46, 0.22, 0.36], lift: [0.07, 0.035, 0.05], term: 0.09, lambert: 0.35,
  charTint: [1.0, 0.88, 0.8], sideTint: [1.04, 0.96, 0.62], charShade: 0.86, sunCol: "#ffc8a8", sunI: 5.0, sky: "#ffb4a8", ground: "#c8a040", hemiI: 0.45,
  fog: "#d88070", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const skin = mk(arm, { lit: [2.2, 1.6, 1.2], shade: [0.52, 0.3, 0.4], lift: [0.1, 0.06, 0.06], charTint: [1.04, 0.92, 0.82], sunCol: "#ffd8b8", sunI: 5.8,
  fog: "#f0a088" });
const zap = mk(arm, { lit: [1.2, 1.5, 2.1], shade: [0.2, 0.12, 0.36], lift: [0.02, 0.015, 0.06], term: 0.06,
  charTint: [0.86, 0.94, 1.12], sideTint: [0.7, 0.6, 1.2], charShade: 0.7, sunCol: "#c0e8ff", sunI: 4.2, sky: "#5a4a9a", ground: "#2a2050", hemiI: 0.28,
  fog: "#2a2050" });
const town = mk(arm, { lit: [1.9, 1.4, 1.0], shade: [0.24, 0.26, 0.58], lift: [0.04, 0.04, 0.09],
  charTint: [1.0, 0.9, 0.78], sideTint: [0.74, 0.84, 1.1], charShade: 0.84, sunCol: "#ffc890", sunI: 4.6, sky: "#9a90c8", ground: "#8a6040", hemiI: 0.4,
  fog: "#8a78a8" });
const museum = mk(gold, { ...SUN_MU, lit: [2.0, 1.55, 1.0], shade: [0.3, 0.3, 0.56], lift: [0.05, 0.045, 0.07], term: 0.08, lambert: 0.32,
  charTint: [1.0, 0.9, 0.76], sideTint: [0.78, 0.86, 1.08], charShade: 0.84, sunCol: "#ffd090", sunI: 5.4, sky: "#e0c8a8", ground: "#7a5a40", hemiI: 0.42,
  fog: "#d8c0a0", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const pun = mk(museum, { lit: [1.3, 0.98, 0.68], shade: [0.09, 0.09, 0.24], lift: [0.012, 0.012, 0.03], charShade: 0.66, sunCol: "#ffe2b0", sunI: 4.0,
  sky: "#4a3e48", ground: "#2a2028", hemiI: 0.22, fog: "#3a3040" });

const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  hall: L(hall, hallSky, 1.06, 10, 80, [0.035, 0.026, 0.014]),
  arm: L(arm, armSky, 1.1, 8, 60, [0.06, 0.05, 0.01]),
  skin: L(skin, skinSky, 1.1, 8, 60, [0.08, 0.05, 0.02]),
  zap: L(zap, zapSky, 1.16, 6, 50, [0.01, 0.02, 0.05]),
  peak: L(peak, peakSky, 0.62, 4, 40, [0.01, 0.015, 0.05]),
  town: L(town, townSky, 1.1, 8, 55, [0.05, 0.035, 0.01]),
  museum: L(museum, museumSky, 1.04, 7, 55, [0.04, 0.03, 0.015]),
  pun: L(pun, punSky, 1.1, 4, 30, [0.02, 0.015, 0.01]),
  hallend: L(hallend, hallendSky, 1.0, 9, 70, [0.02, 0.022, 0.03]),
};
