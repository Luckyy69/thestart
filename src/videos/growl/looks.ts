// "The Cleaning Crew" per-look light rigs (owner: staff/looks agent). RULE 3: a low sun, long shadows, blue shade,
// haze; the light CHANGES when the story turns. Sun azimuths are CAMERA-RELATIVE (bridge/lights.ts): 0 = ahead
// (backlight), +90 = screen right, 180 = behind the camera; world.ts freezes the sun per shot from the shot's mean
// view direction. Skies: 5 stops c[i] at elevation e[i] deg, ON-SCREEN colours (world.ts pre-inverts the tone map).
// lit / shade / lift are linear multipliers for the world two-tone (bridge/shade.ts TONE); charTint / sideTint /
// charShade tint the character cards (CHAR). Places with their own shader rig (belly.ts, staff.ts) read sunAz / sunEl
// (and the cards read CHAR), so those stay meaningful there too.
//
// The colour arc: COOL late-morning exam hall (white-gold sun stripes through the blinds, blue shade) -> a warm PINK-
// ORANGE stomach lit by green-yellow juice from below -> warmer GOLDEN when it fills -> a cosy TUNGSTEN break room
// with a cool vending glow -> the hall again, HUSHED (dimmer, cooler, one stripe) -> a HOT SPOTLIGHT on BEAN while the
// room drops into deep navy shade.
//   hall : late morning. The sun is low and comes through the venetian blinds of the LEFT windows (x -5), slightly
//          ahead of the lens (az -80, el 16): long stripes rake across the floor and desks toward screen-right, the
//          cards get a warm rim on their left and throw long shadows to the right. Clean white-gold key, clear blue
//          shade, a pale cool haze (fog 9 -> 80 m). Sky (seen through the windows) a pale morning blue.
//   belly: a warm PINK-ORANGE cavern. The "sun" = the rim light falling in from the oesophagus opening above and
//          ahead (az -25, el 34: lit tops, crew shadows fall toward the lens); the hemisphere GROUND colour and the
//          world bounce are the green-yellow JUICE glow from below; card far sides pick up the juice (sideTint
//          green-yellow). Rose-mauve shade, a peach haze that swallows the far end of the cavern (fog 6 -> 48 m).
//   full : LOOK_RAMPS belly -> full (570..610, continuous camera): the SAME sun bearing (belly/full MUST keep equal
//          az/el) pushed warmer and golden: honey key, warm plum shade, a golden haze, golden card rims. Cosier.
//   staff: a cosy TUNGSTEN break room (staff.ts has its own rig and reads az/el for its key): a low warm tungsten key
//          from behind-left of the lens (az -150, el 24) throws the crew's long shadows across the floor onto the
//          back wall (to screen-right); cool lilac-blue shade = the vending-machine glow; cards warm with a cool
//          cyan far side; a light warm haze (fog 5 -> 32 m).
//   hush : the hall again (shot 5), HUSHED: the SAME sun bearing as hall/peak (hush/peak MUST keep equal az/el: the
//          sun is cached per shot); the blinds are closed except ONE slat stripe across BEAN (sets.ts): the key stays
//          bright for that stripe, but shade, lift, hemisphere and the haze drop and go cooler and greyer.
//   peak : "GROWLS" (LOOK_RAMPS hush -> peak 954..962): the stripe turns into a HOT SPOTLIGHT on BEAN (hot amber-
//          white key, x1.4), the rest of the room falls into deep navy shade (shade, lift, hemi, haze, sky all sink to
//          blue), hot cards with a cold blue far side, saturation up.
// Notes for the place owners (their sets are empty in the staff sandbox, so these are judged on sky / fog / card tint):
//   sets (hall): build the blind stripes from the world sun (az -80, el 16 in hall AND hush; please set SUN_FROM
//          {5: 1} in story.ts so shots 1 and 5 share the identical sun = identical stripes); hush: close the blinds
//          except the slat whose stripe crosses BEAN; peak: widen that stripe into a soft pool on BEAN if you can.
//   belly: your shader rig can read LOOKS.belly / LOOKS.full (sunAz -25, sunEl 34; key "#ffd0b0" -> "#ffc880";
//          juice-from-below = light.ground "#a8b848" -> "#c0a040"; bounce green-yellow).
import { LIGHTS, LightPreset } from "../bridge/lights";
import { Look } from "./story";
import { hallSunAz, HALL_SUN_EL } from "./sets";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });

// ---- skies (on-screen colours, elevation stops in degrees) ----
const hallSky = { c: ["#e4eef2", "#d8eaf4", "#b2d4f0", "#86b8ea", "#5a94da"], e: [0, 3, 9, 22, 50] };
const bellySky = { c: ["#ffb89c", "#ffb09c", "#f4949a", "#d87a92", "#a85a82"], e: [0, 3, 9, 20, 46] };
const fullSky = { c: ["#ffe0a0", "#ffc88a", "#f4a47c", "#d8887c", "#a86a7c"], e: [0, 3, 9, 20, 46] };
const staffSky = { c: ["#ffd09a", "#f4b088", "#d89088", "#a87890", "#6a5a8a"], e: [0, 3, 9, 21, 48] };
const hushSky = { c: ["#d4dce6", "#bccbe0", "#9ab2d6", "#7896c8", "#5274b4"], e: [0, 3, 9, 22, 50] };
const peakSky = { c: ["#3a4c86", "#2e4078", "#24346a", "#1a2858", "#101a40"], e: [0, 3, 9, 22, 50] };

// ---- light presets ----
const SUN_HALL = { az: -80, el: 16 }, SUN_BELLY = { az: -25, el: 34 };
const hall = mk(day, { ...SUN_HALL, lit: [1.82, 1.64, 1.34], shade: [0.26, 0.36, 0.7], lift: [0.03, 0.045, 0.1], term: 0.07, lambert: 0.28, sideK: 0.84,
  charTint: [1.0, 0.95, 0.88], sideTint: [0.78, 0.88, 1.06], charShade: 0.86, charGrad: 0.07, sunCol: "#fff0d0", sunI: 5.2, sky: "#cfe0f6", ground: "#9a8068", hemiI: 0.46,
  fog: "#cddcf0", actorShadow: true, bias: -0.0005, normalBias: 0.025 });
const hush = mk(hall, { lit: [1.62, 1.5, 1.32], shade: [0.19, 0.27, 0.6], lift: [0.018, 0.032, 0.08], term: 0.07,
  charTint: [0.9, 0.91, 0.95], sideTint: [0.68, 0.79, 1.04], charShade: 0.52, /* (QA2) 0.84: the single stripe vanished on the cards */ sunCol: "#f4f0e4", sunI: 4.4, sky: "#b4c8e6", ground: "#6a5a54", hemiI: 0.36,
  fog: "#a8bcdc" });
const peak = mk(hush, { lit: [2.45, 1.48, 0.74], shade: [0.09, 0.15, 0.5], lift: [0.008, 0.02, 0.07], term: 0.05,
  charTint: [1.16, 0.9, 0.72], sideTint: [0.52, 0.68, 1.26], charShade: 0.62, sunCol: "#ffc890", sunI: 7.0, sky: "#4a6ab8", ground: "#1e2a50", hemiI: 0.3,
  fog: "#2a3a6c" });
const belly = mk(gold, { ...SUN_BELLY, lit: [2.0, 1.3, 0.98], shade: [0.5, 0.26, 0.44], lift: [0.08, 0.04, 0.05], term: 0.09, lambert: 0.35,
  charTint: [1.0, 0.86, 0.8], sideTint: [0.88, 1.02, 0.66], charShade: 0.86, sunCol: "#ffd0b0", sunI: 5.2, sky: "#ffb4a8", ground: "#a8b848", hemiI: 0.45,
  fog: "#f0a08c", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const full = mk(belly, { lit: [2.05, 1.5, 0.82], shade: [0.52, 0.32, 0.38], lift: [0.09, 0.055, 0.04], term: 0.08,
  charTint: [1.0, 0.88, 0.7], sideTint: [0.98, 0.9, 0.66], sunCol: "#ffc880", sky: "#ffc89a", ground: "#c0a040",
  fog: "#f2b680" });
const staff = mk(gold, { az: -150, el: 24, lit: [1.9, 1.28, 0.7], shade: [0.3, 0.34, 0.66], lift: [0.05, 0.045, 0.09], term: 0.08, lambert: 0.32,
  charTint: [1.0, 0.86, 0.68], sideTint: [0.74, 0.9, 1.14], charShade: 0.86, sunCol: "#ffb870", sunI: 5.4, sky: "#a8c0e8", ground: "#7a5048", hemiI: 0.42,
  fog: "#d89a78", actorShadow: true, bias: -0.0004, normalBias: 0.02 });

const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  hall: L(hall, hallSky, 1.06, 9, 80, [0.03, 0.024, 0.016]),
  belly: L(belly, bellySky, 1.12, 6, 48, [0.05, 0.07, 0.015]),
  full: L(full, fullSky, 1.12, 6, 48, [0.07, 0.055, 0.01]),
  staff: L(staff, staffSky, 1.1, 5, 32, [0.05, 0.03, 0.01]),
  hush: L(hush, hushSky, 0.98, 7, 70, [0.015, 0.02, 0.035]),
  peak: L(peak, peakSky, 1.18, 4, 40, [0.01, 0.012, 0.04]),
};
// (cam integration) the HALL looks follow sets.ts: sunAz = hallSunAz(1) (shot 5 shares shot 1's frozen sun via SUN_FROM),
// sunEl = HALL_SUN_EL, so the world sun == the hall rig's HALL_SUN and the blind stripes / the single hush stripe land on
// the cards. hall / hush / peak stay EQUAL (shared sun). Lazy getters: sets.ts imports this module (no init-order cycle).
let HALL_AZ: number | null = null;
for (const k of ["hall", "hush", "peak"] as Look[]) {
  Object.defineProperty(LOOKS[k], "sunAz", { get: () => (HALL_AZ ??= hallSunAz(1)), enumerable: true });
  Object.defineProperty(LOOKS[k], "sunEl", { get: () => HALL_SUN_EL, enumerable: true });
}
