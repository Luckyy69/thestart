// Per-look light rigs for the ouch short (owner: globe agent). RULE 3: low sun, long shadows, blue shade, haze; the light
// changes when the story turns (world.ts blends looks over LOOK_RAMPS).
//   morning : early-morning hallway: very low warm sun stripes through the window, long shadows, cool blue shade, dusty haze
//   xray    : the freeze: the room drops to deep blue-cyan, the character glows (the X-ray nerve signal reads)
//   planet  : tiny planet: low golden sun raking across, long shadows, blue shade on the night side, haze rim
//   lab     : clinical cool-blue lab with a low warm window shaft
//   drama   : the turn: lights dim, a hot red/orange key from one side
//   peak    : the swearing peak: saturated red-magenta punch
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
const dawnSky = { c: ["#ffc27a", "#f8a070", "#e6847a", "#9a6a98", "#3e4f8a"], e: [0, 4, 10, 21, 44] };
const morning = mk(gold, { az: -55, el: 9, lit: [1.9, 1.3, 0.8], shade: [0.3, 0.32, 0.6], lift: [0.04, 0.035, 0.08], sunCol: "#ffb870", sunI: 6.0, sky: "#e8c0a8", ground: "#6a5040", hemiI: 0.42, fog: "#d8a888", actorShadow: true });
const xray = mk(day, { az: -55, el: 9, lit: [0.7, 0.95, 1.4], shade: [0.08, 0.14, 0.32], lift: [0.01, 0.03, 0.08], sunCol: "#8ab8ff", sunI: 2.2, sky: "#3050a0", ground: "#101830", hemiI: 0.35, fog: "#0a1430", actorShadow: true });
const planet = mk(gold, { az: 120, el: 14, lit: [1.95, 1.42, 0.95], shade: [0.4, 0.43, 0.8], lift: [0.04, 0.045, 0.1], term: 0.1, sunCol: "#ffbe78", sunI: 6.0, sky: "#e0b8b0", ground: "#4a5a48", hemiI: 0.4, fog: "#c8a0a0", actorShadow: true });
// tiny planet sky: indigo night up top (stars, globe.ts), rose at ~15 deg, a warm peach haze toward/below the horizon
const planetSky = { c: ["#f7b98e", "#ec9f86", "#b9789c", "#55508f", "#1c2152"], e: [0, 6, 16, 32, 62] };
const lab = mk(day, { az: -65, el: 12, lit: [1.7, 1.6, 1.45], shade: [0.26, 0.32, 0.5], lift: [0.02, 0.03, 0.06], sunCol: "#ffe8cc", sunI: 3.2, sky: "#b8d0f0", ground: "#405060", hemiI: 0.45, fog: "#283444", actorShadow: true });
const drama = mk(day, { az: 75, el: 8, lit: [2.0, 0.9, 0.6], shade: [0.12, 0.08, 0.2], lift: [0.02, 0.01, 0.03], sunCol: "#ff7a4a", sunI: 5.0, sky: "#602030", ground: "#200810", hemiI: 0.25, fog: "#200810", actorShadow: true });
const peak = mk(day, { az: 60, el: 10, lit: [2.1, 1.0, 1.1], shade: [0.2, 0.06, 0.24], lift: [0.04, 0.0, 0.04], sunCol: "#ff5a8a", sunI: 5.5, sky: "#a02860", ground: "#300818", hemiI: 0.35, fog: "#300818", actorShadow: true });
const indoor = (L: LightPreset, sat: number, sky = dawnSky): LookDef => ({ light: L, sky, fog: [L.fog, 60, 3000], sat, bounce: LOOK.golden.bounce, sunAz: L.az, sunEl: L.el, sunDisc: false, near: 0.05, shadowMin: 8 });
export const LOOKS: Record<Look, LookDef> = {
  morning: indoor(morning, 1.12),
  xray: indoor(xray, 1.1),
  planet: { light: planet, sky: planetSky, fog: [planet.fog, 120, 2000], sat: 1.12, bounce: LOOK.golden.bounce, sunAz: planet.az, sunEl: planet.el, sunDisc: false, near: 0.05, shadowMin: 14 },
  lab: indoor(lab, 1.05),
  drama: indoor(drama, 1.15),
  peak: indoor(peak, 1.2),
};
