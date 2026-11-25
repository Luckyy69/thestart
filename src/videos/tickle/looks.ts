// Per-look world light rigs for the tickle short (owner: sets). RULE 3: low sun, long shadows, blue shade, haze; the light
// changes when the story turns (world.ts blends looks over LOOK_RAMPS). These drive the CARDS + props (three lights + shade
// uniforms); the sets light themselves (sets.ts) with the same sun directions, so card shadows run parallel to the
// window stripes:
//   HOME sun (through the big window, toward +x +z, ~25 deg up)  -> camera-relative az -25, el 25 (shots look along -z)
//   LAB  sun (through the blinds, toward +x +z, ~19 deg up)      -> az -45, el 19
//   morning : golden early sun from behind-left (rim + long shadows toward the camera), cool blue shade
//   xray    : the room drops to deep blue-cyan; cards go dim and cool so the glowing brain reads
//   lab     : clean fluorescent neutral with the warm low window sun
//   reveal  : the turn: house lights down, warm theatrical key, near-black shade
//   peak    : the tickle peak: warm pink-gold saturated punch
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
const dawnSky = { c: ["#ffcf8a", "#f7a878", "#de8a84", "#8a6aa0", "#3a4a88"], e: [0, 4, 10, 21, 44] };
const nightSky = { c: ["#2a4a90", "#1e3a7a", "#16306a", "#10245a", "#0a1638"], e: [0, 4, 10, 21, 44] };
const morning = mk(gold, {
  az: -25, el: 25, lit: [1.95, 1.38, 0.86], shade: [0.32, 0.34, 0.62], lift: [0.045, 0.04, 0.085], term: 0.1,
  charTint: [1.0, 0.84, 0.64], sideTint: [0.84, 0.82, 0.98], sunCol: "#ffbc78", sunI: 5.6, sky: "#f0c8b0", ground: "#7a5040", hemiI: 0.46, fog: "#d8a888", actorShadow: true,
});
const xray = mk(day, {
  az: -25, el: 25, lit: [0.62, 0.86, 1.36], shade: [0.07, 0.12, 0.3], lift: [0.01, 0.03, 0.08],
  charTint: [0.78, 0.88, 1.0], sideTint: [0.8, 0.86, 1.0], charShade: 0.8, sunCol: "#86b4ff", sunI: 2.1, sky: "#2e4c9a", ground: "#0e1630", hemiI: 0.34, fog: "#0a1430", actorShadow: true,
});
const lab = mk(day, {
  az: -45, el: 19, lit: [1.78, 1.62, 1.42], shade: [0.27, 0.32, 0.52], lift: [0.025, 0.03, 0.06], term: 0.12,
  charTint: [1.0, 0.95, 0.9], sunCol: "#ffe0b8", sunI: 3.4, sky: "#c8d8f0", ground: "#5a5448", hemiI: 0.5, fog: "#283444", actorShadow: true,
});
const reveal = mk(day, {
  az: -45, el: 19, lit: [1.95, 1.2, 0.72], shade: [0.1, 0.08, 0.16], lift: [0.015, 0.01, 0.03], term: 0.08,
  charTint: [1.0, 0.82, 0.62], charShade: 0.78, sunCol: "#ffb070", sunI: 4.2, sky: "#4a2a3a", ground: "#1a0c10", hemiI: 0.22, fog: "#200810", actorShadow: true,
});
const peak = mk(day, {
  az: -45, el: 19, lit: [2.12, 1.38, 1.04], shade: [0.26, 0.11, 0.22], lift: [0.045, 0.012, 0.04], term: 0.1,
  charTint: [1.0, 0.84, 0.78], sideTint: [0.96, 0.8, 0.9], sunCol: "#ffb48a", sunI: 5.6, sky: "#e07090", ground: "#3a1018", hemiI: 0.4, fog: "#300818", actorShadow: true,
});
const indoor = (L: LightPreset, sat: number, sky = dawnSky): LookDef => ({ light: L, sky, fog: [L.fog, 60, 3000], sat, bounce: LOOK.golden.bounce, sunAz: L.az, sunEl: L.el, sunDisc: false, near: 0.05, shadowMin: 8 });
export const LOOKS: Record<Look, LookDef> = {
  morning: indoor(morning, 1.14),
  xray: indoor(xray, 1.1, nightSky),
  lab: indoor(lab, 1.06),
  reveal: indoor(reveal, 1.16),
  peak: indoor(peak, 1.22),
};
