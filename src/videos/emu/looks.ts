// Per-place looks for the miners short (owner: surface agent). Each look = a full light preset in the shared
// LightPreset shape (bridge/lights.ts) + sky stops, fog, saturation, bounce, sun placement and camera near plane.
// The sun is camera-relative and frozen per shot (world.ts): az from the shot's view axis (0 = backlight, 90 = right).
//   desert : Atacama noon: hot warm key, deep saturated blue zenith, pale dusty horizon, violet-cool shade, long haze
//   dusk   : low backlit orange sun with a disc, peach horizon -> violet zenith, violet-blue shade, warm bounce
//   night  : navy sky + stars (surface.ts), the "sun" is the white work-light rig (high, from behind the lens side),
//            navy-blue shade, horizon haze only far (the floodlights / bulbs / flames carry the glow via bloom)
//   mine   : underground: warm helmet-lamp key, near-black warm shade, black-brown sky/fog close in
//   cut    : the cutaway diagram: clean bright neutral light, soft shade, pale clear sky, no haze near
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const desert: LightPreset = {
  ...day, az: 68, el: 56,
  lit: [1.74, 1.62, 1.46], shade: [0.3, 0.28, 0.42], lift: [0.03, 0.025, 0.06], lambert: 0.32, sideK: 0.8, term: 0.14,
  charTint: [1.0, 0.95, 0.9], charShade: 0.84, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.9, 0.88, 0.98],
  blob: [0.6, 0.52, 0.52], actorShadow: true,
  fog: "#e8d6bf", sunCol: "#fff0d6", sunI: 3.4, sky: "#cfe2ff", ground: "#a8765a", hemiI: 0.42,
  bias: -0.0003, normalBias: 0.02,
};
const dusk: LightPreset = {
  ...gold, az: 14, el: 8,
  lit: [1.8, 1.08, 0.6], shade: [0.27, 0.19, 0.3], lift: [0.05, 0.025, 0.07], lambert: 0.3, sideK: 0.8, term: 0.08,
  charTint: [1.0, 0.8, 0.6], charShade: 0.86, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.84, 0.78, 0.96],
  blob: [0.7, 0.66, 0.86], actorShadow: true,
  fog: "#f0a37a", sunCol: "#ffb06a", sunI: 6.0, sky: "#e0b4a8", ground: "#7a5058", hemiI: 0.42,
};
const night: LightPreset = {
  ...day, az: 150, el: 52,
  lit: [1.05, 1.1, 1.24], shade: [0.04, 0.055, 0.14], lift: [0.012, 0.018, 0.06], lambert: 0.38, sideK: 0.8, term: 0.22,
  charTint: [0.94, 0.97, 1.05], charShade: 0.8, charGrad: 0.12, bodyGrad: 0.27, sideTint: [0.72, 0.8, 1.0],
  blob: [0.22, 0.24, 0.38], actorShadow: true,
  fog: "#18264c", sunCol: "#e8eeff", sunI: 2.6, sky: "#3a4a7a", ground: "#101420", hemiI: 0.3,
  bias: -0.0004, normalBias: 0.02,
};
const mine: LightPreset = {
  ...day, az: 140, el: 34,
  lit: [1.75, 1.28, 0.82], shade: [0.055, 0.038, 0.036], lift: [0.014, 0.007, 0.005], lambert: 0.5, sideK: 0.75, term: 0.3,
  charTint: [1.0, 0.86, 0.7], charShade: 0.76, charGrad: 0.16, bodyGrad: 0.3, sideTint: [0.9, 0.76, 0.66],
  blob: [0.22, 0.16, 0.13], actorShadow: true,
  fog: "#140d0a", sunCol: "#ffc890", sunI: 2.2, sky: "#4a3020", ground: "#100a08", hemiI: 0.15,
  bias: -0.0004, normalBias: 0.01,
};
const cut: LightPreset = {
  ...day, az: 120, el: 45,
  lit: [1.62, 1.56, 1.44], shade: [0.5, 0.48, 0.62], lift: [0.03, 0.03, 0.05], lambert: 0.3, sideK: 0.85, term: 0.2,
  charTint: [1.0, 0.97, 0.94], charShade: 0.88, charGrad: 0.06, bodyGrad: 0.18, sideTint: [0.94, 0.92, 0.98],
  blob: [0.62, 0.6, 0.64], actorShadow: false,
  fog: "#dce8f2", sunCol: "#fff6e8", sunI: 3.0, sky: "#dce8f2", ground: "#a09080", hemiI: 0.45,
};
export const LOOKS: Record<Look, LookDef> = {
  day: { light: { ...day }, sky: LOOK.day.sky, fog: [day.fog, 200, 3000], sat: LOOK.day.sat, bounce: LOOK.day.bounce, sunAz: day.az, sunEl: day.el, sunDisc: false, near: 0.1, shadowMin: 20 },
  golden: { light: { ...gold }, sky: LOOK.golden.sky, fog: [gold.fog, 200, 3000], sat: LOOK.golden.sat, bounce: LOOK.golden.bounce, sunAz: gold.az, sunEl: gold.el, sunDisc: true, near: 0.1, shadowMin: 20 },
  office: { light: { ...day }, sky: LOOK.day.sky, fog: [day.fog, 400, 3000], sat: LOOK.day.sat, bounce: LOOK.day.bounce, sunAz: 40, sunEl: 35, sunDisc: false, near: 0.05, shadowMin: 8 },
};
