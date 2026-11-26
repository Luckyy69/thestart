// Per-look light rigs for the hiccup short (owner: pond agent). RULE 3: low sun, long shadows, blue shade, haze; the
// light CHANGES when the story turns. The five looks are five different worlds of light:
//   kitchen : golden MORNING kitchen: a low warm sun (front-left, through the back-wall window) rakes stripes across
//             the room toward the lens, long shadows, cool periwinkle shade, warm peach haze.
//   xray    : the X-ray (same kitchen): the room sinks into deep blue-black (dark fog close in, a cold rim light), so
//             the glowing body reads alone.
//   pond    : THE TURN: underwater. A high sun (el 60, slightly ahead/right) pours god rays + golden caustics down
//             through green-teal water; teal-blue shade, thick water haze (fog 2.5 -> 26 m). pond.ts switches to an air
//             rig automatically if a camera ever surfaces.
//   farm    : Iowa 1922: a low sepia-gold sun (front-right), very long shadows, dusty amber haze, slightly
//             desaturated (old-photo warmth) with violet-brown shade.
//   peak    : "430 million hics": the same farm sun pushed to a hot golden-pink punch (LOOK_RAMPS farm -> peak).
// Sun azimuths are CAMERA-RELATIVE (lights.ts): 0 = ahead (backlight), +90 = screen right, 180 = behind the camera.
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
// golden morning sky (seen through the kitchen window): butter horizon, peach, soft rose, morning blue above
const morningSky = { c: ["#ffd896", "#ffc08a", "#f6a888", "#b99ab8", "#6a86c0"], e: [0, 3, 9, 20, 44] };
const xraySky = { c: ["#14305e", "#122a56", "#0f244c", "#0c1c40", "#081432"], e: [0, 4, 12, 24, 50] };
const pondSky = { c: ["#3e9c8c", "#48a694", "#5cb8a2", "#79caae", "#9adcbc"], e: [0, 4, 12, 24, 50] };     // the water itself
const farmSky = { c: ["#f8dc9c", "#f2c486", "#e2a67e", "#b89284", "#7c86a8"], e: [0, 3, 9, 20, 44] };
const peakSky = { c: ["#ffd2a0", "#ffa890", "#f8829a", "#d46ea4", "#7c58a8"], e: [0, 3, 9, 20, 44] };

const kitchen = mk(gold, { az: -55, el: 13, lit: [1.95, 1.42, 0.88], shade: [0.26, 0.29, 0.52], lift: [0.04, 0.035, 0.07], term: 0.08,
  charTint: [1.0, 0.86, 0.7], sideTint: [0.84, 0.84, 0.98], sunCol: "#ffbe78", sunI: 6.0, sky: "#e8c0b0", ground: "#6a5a50", hemiI: 0.42, fog: "#f0cfae", actorShadow: true });
const xray = mk(day, { az: -55, el: 13, lit: [0.55, 0.8, 1.35], shade: [0.06, 0.1, 0.26], lift: [0.01, 0.025, 0.07], term: 0.12,
  charTint: [0.82, 0.9, 1.0], sideTint: [0.7, 0.8, 1.0], charShade: 0.8, sunCol: "#8ab8ff", sunI: 2.2, sky: "#3050a0", ground: "#101830", hemiI: 0.35, fog: "#0e2048", actorShadow: true });
const pond = mk(day, { az: 20, el: 60, lit: [1.05, 1.36, 1.12], shade: [0.1, 0.3, 0.36], lift: [0.02, 0.06, 0.06], term: 0.16,
  charTint: [0.95, 1.02, 0.98], sideTint: [0.8, 0.95, 0.98], sunCol: "#d8ffd0", sunI: 4.0, sky: "#60c0b0", ground: "#204030", hemiI: 0.45, fog: "#3e9c8c", actorShadow: true });
const farm = mk(gold, { az: 40, el: 8, lit: [1.98, 1.5, 0.92], shade: [0.31, 0.25, 0.4], lift: [0.05, 0.04, 0.05], term: 0.07,
  charTint: [1.0, 0.84, 0.64], sideTint: [0.86, 0.8, 0.94], sunCol: "#ffc888", sunI: 5.5, sky: "#e8c8a0", ground: "#7a6040", hemiI: 0.42, fog: "#ead2a4", actorShadow: true });
const peak = mk(gold, { az: 40, el: 8, lit: [2.3, 1.62, 1.28], shade: [0.5, 0.32, 0.42], lift: [0.1, 0.06, 0.05], term: 0.07, // QA2: shade + lift up (the barn wall read muddy maroon)
  charTint: [1.0, 0.86, 0.76], sideTint: [0.95, 0.8, 0.9], sunCol: "#ffb0a0", sunI: 6.5, sky: "#f0c0b0", ground: "#7a5050", hemiI: 0.45, fog: "#f6c8b4", actorShadow: true });
const out = (L: LightPreset, sat: number, sky: LookDef["sky"], near = 60, far = 900): LookDef =>
  ({ light: L, sky, fog: [L.fog, near, far], sat, bounce: LOOK.golden.bounce, sunAz: L.az, sunEl: L.el, sunDisc: false, near: 0.05, shadowMin: 10 });
export const LOOKS: Record<Look, LookDef> = {
  kitchen: out(kitchen, 1.12, morningSky, 30, 700),
  xray: { ...out(xray, 1.05, xraySky, 2.2, 13), bounce: [0, 0, 0] },
  pond: { ...out(pond, 1.12, pondSky, 2.5, 26), bounce: [0, 0, 0] },
  farm: out(farm, 1.0, farmSky, 35, 520),
  peak: out(peak, 1.16, peakSky, 35, 520),
};
