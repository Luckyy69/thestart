// "Bald Fur" per-look light rigs (owner: ice/looks agent). RULE 3: a low sun, long shadows, blue shade, haze; the light
// CHANGES when the story turns. Sun azimuths are CAMERA-RELATIVE (bridge/lights.ts): 0 = ahead (backlight), +90 =
// screen right, 180 = behind the camera; the sun is frozen per shot from the shot's mean view direction (world.ts
// shotSun). Skies are 5 stops c[i] at elevation e[i] deg, ON-SCREEN colours (world.ts pre-inverts the tone map).
// The story's colour arc: COLD blue bus stop -> WARM peach skin -> the bus stop WARMER (the cat's cosy floof) -> PALE
// BLUE ice-age blizzard -> WARM sunset bedroom -> the PEAK (concert magenta/violet + hot gold) -> DUSK.
//   street : a cold winter late afternoon. A low gold sun DOWN THE STREET, ahead-left (az -14, el 6: in frame for a
//            camera looking down the street, sun disc on; matches the sets' baked rig), so the snow and kerbs throw long BLUE shadows toward the lens
//            right; deep steel-blue shade, a cold lilac-blue haze (fog 8 -> 110 m: the far houses go misty but stay
//            painted). Sky: a thin gold band at the horizon into cold periwinkle and deep winter blue. Cards: cool.
//   skin   : warm PEACH, giant scale (fog 18 -> 130 m on the far skin). A low warm key from behind-right (az 125,
//            el 14) so lit faces turn to the lens and the leaning hairs throw long shadows away from it; rosy-lilac
//            shade, a warm PEACH sky (peach -> apricot -> warm terracotta-peach top, no magenta).
//   cat    : the bus stop again, the light WARMER: a touch lower (az -16, el 5) and amber-rose but
//            DIMMER on the snow (lit ~1.78 vs street 2.0, so the white snow doesn't blow out),
//            warmer violet shade, a rosy haze (fog 7 -> 95 m), sky amber -> salmon -> mauve. The cat's warm glow reads.
//   ice    : a PALE BLUE ice-age BLIZZARD. A pale lemon-white sun low AHEAD, a little left (az -7, el 6.5: its disc glows
//            through the snow over the glacier saddle, upper-left third, under the watermark), so the characters and
//            snowdrifts throw long soft shadows toward the lens; light steel-blue shade (high ambient from the snow),
//            a pale blue haze (fog 4 -> 120 m: mammoths at ~30 m readable, the glacier capped at ~50 %). Sky: white-out
//            horizon, powder blue, slate-blue storm top. ice.ts draws its own dome + sun disc (sunDisc off here).
//   room   : a warm low SUNSET through the left-wall window (az -115 = from screen left, a little ahead, el 12;
//            matches the sets' fixed room rig + card shadows), golden
//            light raking across the bed toward the right wall, periwinkle shade, warm haze (3 -> 42 m).
//   peak   : the TWIST punch on "hits" (LOOK_RAMPS room -> peak 908..918): the SAME sun pushed to a concert key: hot
//            gold light, MAGENTA/violet shade + lift, a magenta-violet sky and haze, pink-violet card rims.
//   roomend: DUSK settles (peak -> roomend at the 5 -> 6 cut, continuous camera): the SAME sun bearing (shot 6 shares
//            shot 5's frozen sun via SUN_FROM; room/peak/roomend MUST keep identical az/el), now weak rose light, deep
//            violet-blue shade, dusk sky (a last rose band under indigo).
import { LIGHTS, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
// skies
const streetSky = { c: ["#ffd8a0", "#f2c8b0", "#b8c2e0", "#7f98cc", "#4a64a2"], e: [0, 2.5, 8, 20, 48] };
const skinSky = { c: ["#ffd6ac", "#ffc69c", "#ffb48c", "#f4a07e", "#e08a70"], e: [0, 3, 9, 20, 46] };
const catSky = { c: ["#ffc888", "#ffb090", "#eaa0a4", "#a08cc0", "#56609e"], e: [0, 2.5, 8, 20, 48] };
const iceSky = { c: ["#d6e1ee", "#c2d1e7", "#a3badc", "#7d97c5", "#566f9f"], e: [0, 3, 9, 22, 50] };
const roomSky = { c: ["#ffd894", "#ffb877", "#f79272", "#c87892", "#62609e"], e: [0, 3, 9, 21, 48] };
const peakSky = { c: ["#ffc070", "#ff8aa0", "#e055b8", "#9c48c8", "#4a2a8c"], e: [0, 3, 9, 21, 48] };
const endSky = { c: ["#f8b490", "#e09098", "#a07cb0", "#5e64a2", "#2c3470"], e: [0, 3, 9, 21, 48] };

const street = mk(gold, { az: -14, el: 6, lit: [2.0, 1.5, 0.92], shade: [0.2, 0.3, 0.64], lift: [0.03, 0.05, 0.11], term: 0.07,
  charTint: [0.98, 0.9, 0.84], sideTint: [0.72, 0.82, 1.0], charShade: 0.84, sunCol: "#ffc274", sunI: 6.0, sky: "#a8b8dc", ground: "#4a5a7a", hemiI: 0.42,
  fog: "#aebcdc", actorShadow: true });
const skin = mk(gold, { az: 125, el: 14, lit: [2.05, 1.5, 1.12], shade: [0.5, 0.36, 0.6], lift: [0.07, 0.045, 0.08], term: 0.09, lambert: 0.35,
  charTint: [1.0, 0.88, 0.8], sideTint: [0.94, 0.82, 1.0], sunCol: "#ffc8a0", sunI: 5.2, sky: "#f6c0a8", ground: "#7a4a5a", hemiI: 0.42,
  fog: "#f8c0a8", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const cat = mk(gold, { az: -16, el: 5, lit: [1.78, 1.16, 0.68], shade: [0.26, 0.24, 0.55], lift: [0.05, 0.035, 0.09], term: 0.07,
  charTint: [1.0, 0.86, 0.74], sideTint: [0.86, 0.8, 1.0], charShade: 0.86, sunCol: "#ffa868", sunI: 6.2, sky: "#e0b0b8", ground: "#5a4a6a", hemiI: 0.42,
  fog: "#d8b4bc", actorShadow: true });
const ice = mk(day, { az: -7, el: 6.5, lit: [1.24, 1.21, 1.14], shade: [0.33, 0.46, 0.86], lift: [0.04, 0.065, 0.11], term: 0.06, lambert: 0.25, sideK: 0.86,
  charTint: [0.95, 0.97, 1.02], sideTint: [0.78, 0.88, 1.0], charShade: 0.86, charGrad: 0.08, sunCol: "#fff0d0", sunI: 4.5, sky: "#d6e4f6", ground: "#8a9ab8", hemiI: 0.5,
  fog: "#bfcfe6", actorShadow: true, bias: -0.0006, normalBias: 0.03 });
const room = mk(gold, { az: -115, el: 12, lit: [1.72, 1.2, 0.72], shade: [0.33, 0.35, 0.66], lift: [0.05, 0.05, 0.085], term: 0.08,
  charTint: [1.0, 0.86, 0.7], sideTint: [0.84, 0.83, 1.0], sunCol: "#ffb86c", sunI: 6.2, sky: "#f0c4a4", ground: "#5a4a58", hemiI: 0.42,
  fog: "#f2c8a6", actorShadow: true });
const peak = mk(room, { lit: [2.12, 1.2, 0.6], shade: [0.52, 0.18, 0.62], lift: [0.12, 0.02, 0.12], term: 0.07,
  charTint: [1.0, 0.84, 0.78], sideTint: [1.0, 0.62, 0.98], sunCol: "#ffa040", sunI: 7.0, sky: "#e070c0", ground: "#5a2060", hemiI: 0.45,
  fog: "#d470b8" });
const roomEnd = mk(room, { lit: [1.62, 1.08, 0.92], shade: [0.24, 0.26, 0.6], lift: [0.04, 0.04, 0.1], term: 0.08,
  charTint: [0.96, 0.84, 0.82], sideTint: [0.74, 0.78, 1.0], sunCol: "#ff9a7a", sunI: 4.6, sky: "#9a90b8", ground: "#3a3458", hemiI: 0.42,
  fog: "#9a88b0" });
const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  street: L(street, streetSky, 1.08, 8, 110, [0.02, 0.025, 0.04], true, 10),
  skin: L(skin, skinSky, 1.12, 18, 130, [0.07, 0.03, 0.03]),
  cat: L(cat, catSky, 1.1, 7, 95, [0.05, 0.03, 0.02], true, 10),
  ice: L(ice, iceSky, 1.1, 6, 140, [0.02, 0.03, 0.05], false, 8),
  room: L(room, roomSky, 1.1, 3, 42, [0.05, 0.026, 0.0]),
  peak: L(peak, peakSky, 1.2, 3, 40, [0.09, 0.02, 0.07]),
  roomend: L(roomEnd, endSky, 1.06, 3, 40, [0.03, 0.02, 0.04]),
};
