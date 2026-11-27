// "Wrong Address" per-look light rigs (owner: hq/looks agent). RULE 3: a low sun, long shadows, blue shade, haze; the
// light CHANGES when the story turns. Sun azimuths are CAMERA-RELATIVE (bridge/lights.ts): 0 = ahead (backlight),
// +90 = screen right, 180 = behind the camera; world.ts freezes the sun per shot from the shot's mean view direction.
// Skies: 5 stops c[i] at elevation e[i] deg, ON-SCREEN colours (world.ts pre-inverts the tone map). lit / shade / lift
// are linear multipliers for the world two-tone (bridge/shade.ts TONE); charTint / sideTint / charShade tint the
// character cards (CHAR). Places with their own shader rig (mouth.ts, hq.ts) read sunAz / sunEl (and the cards read
// CHAR), so keep those meaningful there too.
//
// The colour arc: warm GOLD park -> warm PINK mouth (goes icy on the palate: mouth.ts) -> AMBER control room under red
// alarm light -> cool bright MORNING gym -> ICE-BLUE flash at the peak -> rose/indigo DUSK park.
//   park   : a golden summer late afternoon. Low warm sun ahead-left (az -35, el 7: backlit rims, long shadows toward
//            the lens-right, the disc can sit in the sky upper-left behind the trees), cool periwinkle-blue shade, a
//            warm honey haze (fog 12 -> 170 m: the skyline goes soft but stays painted). Sky: gold horizon -> cream ->
//            aqua -> a clear summer blue top (no grey mud between peach and blue). Cards: warm gold with a cool far side.
//   mouth  : a warm PINK cave. The "sun" = the park light pouring in through the LIPS behind the camera (az 165,
//            el 12: lit faces turn to the lens, the tongue papillae throw long shadows inward), rosy-magenta shade, a
//            pink haze (fog 6 -> 45 m swallows the throat). mouth.ts turns the palate ICY BLUE locally on "cold".
//   hq     : a cosy AMBER control room. The low sun comes in only through the PUPILS of the two eye windows on the
//            back wall (az 0 = straight ahead, el 42, so the two round golden patches land on the console / floor and the
//            BRAIN card's shadow falls toward the lens); hq.ts adds the amber practicals, a cool lilac front fill (the
//            blue shade) and the RED rotating beacons that flood the room on "blames". Cards: amber with a lilac side.
//   gym    : a cool bright MORNING. A clean white-gold sun low from the LEFT through the high windows (az -95, el 18:
//            beams rake across the floor to the right, the table and kids throw long shadows to the right), crisp
//            blue-grey shade, a light cool haze (fog 8 -> 90 m). Sky (through the windows): pale morning blue.
//   peak   : the TWIST on "Twice" (LOOK_RAMPS gym -> peak 752..760): the SAME sun bearing (gym/peak MUST keep equal
//            az/el) pushed to an ICE-BLUE / cyan flash-freeze: cyan-white key, deep cobalt shade, a cyan haze, a hard
//            white-cyan rim on the cards (sideTint), the world a touch more saturated.
//   parkend: the park at DUSK. The sun is on the horizon (az -35, el 2, rose disc), weak rose light, deep indigo
//            shade, a lilac haze; sky: a last rose-gold band under mauve and indigo. The lamps + cart string lights
//            (sets.ts, keyed on this look) carry the scene.
import { LIGHTS, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });

// ---- skies (on-screen colours, elevation stops in degrees) ----
const parkSky = { c: ["#ffd88c", "#ffe2b0", "#bfe2ee", "#80b8ea", "#4a86d6"], e: [0, 2.5, 8, 18, 45] };
const mouthSky = { c: ["#ffc4b0", "#ffb0a8", "#f49aa4", "#e0849a", "#b86a8c"], e: [0, 3, 9, 20, 46] };
const hqSky = { c: ["#ffd49a", "#ffbe86", "#f4a07c", "#d08488", "#8a6a96"], e: [0, 3, 9, 21, 48] };
const gymSky = { c: ["#f2f2ea", "#dfeaf2", "#bcd6ee", "#8fbbe6", "#5f97da"], e: [0, 3, 9, 22, 50] };
const peakSky = { c: ["#eafcff", "#c4f0ff", "#8ad8f8", "#58aee8", "#2e6cc8"], e: [0, 3, 9, 21, 48] };
const endSky = { c: ["#ffc08c", "#f4949a", "#b07cb4", "#5c5ca8", "#262c68"], e: [0, 2.5, 8, 20, 48] };

// ---- light presets ----
const park = mk(gold, { az: -35, el: 7, lit: [1.9, 1.38, 0.8], shade: [0.27, 0.32, 0.62], lift: [0.04, 0.045, 0.1], term: 0.07,
  charTint: [1.0, 0.87, 0.7], sideTint: [0.8, 0.84, 1.0], charShade: 0.86, sunCol: "#ffc072", sunI: 6.2, sky: "#b8c8e8", ground: "#5a6a48", hemiI: 0.42,
  fog: "#f2cfa4", actorShadow: true });
const mouth = mk(gold, { az: 165, el: 12, lit: [2.0, 1.36, 1.12], shade: [0.5, 0.28, 0.5], lift: [0.08, 0.035, 0.06], term: 0.09, lambert: 0.35,
  charTint: [1.0, 0.84, 0.8], sideTint: [1.0, 0.74, 0.9], sunCol: "#ffc0a8", sunI: 5.2, sky: "#f6b4b0", ground: "#7a3a4a", hemiI: 0.42,
  fog: "#f2a0a6", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const hq = mk(gold, { az: 0, el: 42, lit: [1.75, 1.22, 0.7], shade: [0.34, 0.3, 0.6], lift: [0.06, 0.04, 0.08], term: 0.08,
  charTint: [1.0, 0.84, 0.66], sideTint: [0.86, 0.78, 1.0], charShade: 0.86, sunCol: "#ffb868", sunI: 5.6, sky: "#f0c0a0", ground: "#6a4048", hemiI: 0.42,
  fog: "#e8a87a", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const gym = mk(day, { az: -115, el: 30, /* (integration) = sets GYM_SUN_AZ/EL: card shadows match the window patches */ lit: [1.72, 1.64, 1.46], shade: [0.3, 0.4, 0.72], lift: [0.035, 0.05, 0.1], term: 0.07, lambert: 0.28, sideK: 0.84,
  charTint: [0.98, 0.97, 0.98], sideTint: [0.8, 0.88, 1.0], charShade: 0.86, charGrad: 0.07, sunCol: "#fff2da", sunI: 5.0, sky: "#d4e6f8", ground: "#a08a70", hemiI: 0.48,
  fog: "#d2e0f0", actorShadow: true, bias: -0.0005, normalBias: 0.025 });
const peak = mk(gym, { lit: [1.35, 1.8, 2.15], shade: [0.2, 0.42, 0.95], lift: [0.03, 0.09, 0.16], term: 0.06,
  charTint: [0.86, 1.0, 1.14], sideTint: [0.72, 1.0, 1.3], charShade: 0.84, sunCol: "#c8f4ff", sunI: 6.5, sky: "#9ae4ff", ground: "#3a6aa0", hemiI: 0.5,
  fog: "#a4e2fa" });
const parkend = mk(gold, { az: -35, el: 2, lit: [1.38, 0.86, 0.82], shade: [0.2, 0.21, 0.52], lift: [0.04, 0.035, 0.1], term: 0.08,
  charTint: [0.96, 0.82, 0.84], sideTint: [0.7, 0.74, 1.0], charShade: 0.84, sunCol: "#ff9a86", sunI: 4.2, sky: "#8a84b8", ground: "#3a3458", hemiI: 0.45,
  fog: "#a68cb6", actorShadow: true });

const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  park: L(park, parkSky, 1.1, 12, 170, [0.05, 0.035, 0.015], true, 10),
  mouth: L(mouth, mouthSky, 1.12, 6, 45, [0.08, 0.03, 0.035]),
  hq: L(hq, hqSky, 1.1, 4, 30, [0.05, 0.028, 0.008]),
  gym: L(gym, gymSky, 1.08, 8, 90, [0.025, 0.03, 0.04]),
  peak: L(peak, peakSky, 1.16, 5, 60, [0.02, 0.05, 0.08]),
  parkend: L(parkend, endSky, 1.06, 10, 120, [0.04, 0.02, 0.045], true, 10),
};
