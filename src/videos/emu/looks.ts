// Per-look light rigs for the Emu War short (owner: outback agent). Each look = a full light preset in the shared
// LightPreset shape (bridge/lights.ts) + sky stops, fog, saturation, bounce, sun placement and camera near plane.
// The sun is camera-relative and frozen per shot (world.ts): az from the shot's view axis (0 = backlight, 90 = right).
//   day    : WA wheatbelt noon: hot cream key, deep saturated blue zenith over a pale dusty horizon, violet-warm shade
//   golden : warm evening: low orange sun with a disc, peach horizon -> rose -> violet zenith, warm bounce
//   office : 1930s army office interior: the sun comes in through the left-wall window (az -62: the window light
//            lands on the desk / person); walls and ceiling don't cast, so the room is the warm "shade" tone
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const outbackDay: LightPreset = {
  ...day, az: 64, el: 54,
  lit: [1.78, 1.62, 1.42], shade: [0.34, 0.27, 0.36], lift: [0.03, 0.022, 0.05], lambert: 0.3, sideK: 0.8, term: 0.14,
  charTint: [1.0, 0.96, 0.9], charShade: 0.85, charGrad: 0.08, bodyGrad: 0.2, sideTint: [0.9, 0.88, 0.98],
  blob: [0.6, 0.5, 0.52], actorShadow: true,
  fog: "#ecd8bc", sunCol: "#fff0d6", sunI: 3.4, sky: "#cfe2ff", ground: "#b0704e", hemiI: 0.42,
  bias: -0.0003, normalBias: 0.02,
};
const outbackGold: LightPreset = {
  ...gold, az: 28, el: 11,
  lit: [1.78, 1.12, 0.62], shade: [0.3, 0.2, 0.3], lift: [0.05, 0.025, 0.06], lambert: 0.3, sideK: 0.8, term: 0.08,
  charTint: [1.0, 0.82, 0.62], charShade: 0.87, charGrad: 0.1, bodyGrad: 0.24, sideTint: [0.86, 0.8, 0.95],
  blob: [0.72, 0.64, 0.82], actorShadow: true,
  fog: "#f2ac80", sunCol: "#ffb46a", sunI: 6.0, sky: "#e0b4a8", ground: "#7a5058", hemiI: 0.42,
  bias: -0.0005, normalBias: 0.03,
};
const office: LightPreset = {
  ...day, az: -62, el: 28,
  lit: [1.9, 1.6, 1.18], shade: [0.6, 0.47, 0.4], lift: [0.04, 0.028, 0.03], lambert: 0.35, sideK: 0.82, term: 0.16,
  charTint: [1.0, 0.92, 0.82], charShade: 0.82, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.94, 0.86, 0.82],
  blob: [0.5, 0.4, 0.36], actorShadow: true,
  fog: "#6a4a36", sunCol: "#ffe2b0", sunI: 3.0, sky: "#f0dcc0", ground: "#6a4a36", hemiI: 0.4,
  bias: -0.0004, normalBias: 0.01,
};
export const LOOKS: Record<Look, LookDef> = {
  day: { light: outbackDay, sky: { c: ["#f2e2c6", "#c6dcef", "#86b8ec", "#4f92e0", "#2a6ccc"], e: [0, 2.5, 7, 16, 42] }, fog: [outbackDay.fog, 260, 3200], sat: 1.0, bounce: [0.02, 0.01, 0], sunAz: outbackDay.az, sunEl: outbackDay.el, sunDisc: false, near: 0.1, shadowMin: 20 },
  golden: { light: outbackGold, sky: { c: ["#ffc27a", "#f8a070", "#e6847a", "#b46a88", "#5e4f8a"], e: [0, 4, 10, 21, 44] }, fog: [outbackGold.fog, 220, 3000], sat: 1.12, bounce: LOOK.golden.bounce, sunAz: outbackGold.az, sunEl: outbackGold.el, sunDisc: true, near: 0.1, shadowMin: 20 },
  office: { light: office, sky: LOOK.day.sky, fog: [office.fog, 400, 3000], sat: 1.06, bounce: [0.03, 0.015, 0], sunAz: office.az, sunEl: office.el, sunDisc: false, near: 0.05, shadowMin: 8 },
};
