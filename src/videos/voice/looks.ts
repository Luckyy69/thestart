// Per-look light rigs for the voice short (owner: sets agent). RULE 3: low sun, long shadows, blue shade, haze; the light
// CHANGES when the story turns. The sets light themselves (sets.ts own rig); these presets drive the CARDS (char tint /
// shade), the world sun's SHADOW direction and the sky/fog. The world sun is aimed along the sets' window sun:
//   room : BEAN's bedroom at golden-hour sunset: the sun is very low (el 7) from the left window, behind the camera's
//          left (az -114 for cameras looking -z): warm peach key on the cards, periwinkle-blue shade, long shadows
//          falling back-right across the floor.
//   xray : the same room sunk into deep blue-black; the cold sun keeps the same world direction for shot 2's side view
//          (camera looking -x -> az -24), so the long shadows don't jump between shots.
//   lab  : THE TURN: the 2013 lab, cool clinical blue-white; one low warm sun shaft through the blinds from the
//          front-left (az -116, el 10); neutral-cool card tint.
//   peak : "rated it higher than everyone else's": the same lab pushed to a warm pink-gold punch (LOOK_RAMPS lab->peak).
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
const sunsetSky = { c: ["#ffd896", "#ffb07a", "#f08a8a", "#a87ab0", "#5a5aa0"], e: [0, 3, 9, 20, 44] };
const xraySky = { c: ["#14305e", "#122a56", "#0f244c", "#0c1c40", "#081432"], e: [0, 4, 12, 24, 50] };
const labSky = { c: ["#ffe0b0", "#d8e4f0", "#a8c8ec", "#7ab0e8", "#5a90d8"], e: [0, 3, 9, 20, 44] };
const peakSky = { c: ["#ffd2a0", "#ffa890", "#f8829a", "#d46ea4", "#7c58a8"], e: [0, 3, 9, 20, 44] };

const room = mk(gold, { az: -114, el: 7, lit: [1.95, 1.4, 0.92], shade: [0.27, 0.29, 0.54], lift: [0.04, 0.035, 0.08], term: 0.08,
  charTint: [1.0, 0.86, 0.72], sideTint: [0.82, 0.84, 1.0], sunCol: "#ffb878", sunI: 6.0, sky: "#e8c0b0", ground: "#6a5060", hemiI: 0.42, fog: "#e8b8a0", actorShadow: true });
const xray = mk(day, { az: -24, el: 7, lit: [0.55, 0.8, 1.35], shade: [0.06, 0.1, 0.26], lift: [0.01, 0.025, 0.07], term: 0.12,
  charTint: [0.82, 0.9, 1.0], sideTint: [0.7, 0.8, 1.0], charShade: 0.8, sunCol: "#8ab8ff", sunI: 2.2, sky: "#3050a0", ground: "#101830", hemiI: 0.35, fog: "#0e2048", actorShadow: true });
const lab = mk(day, { az: -116, el: 10, lit: [1.75, 1.62, 1.42], shade: [0.28, 0.33, 0.52], lift: [0.02, 0.03, 0.07], term: 0.1,
  charTint: [0.97, 0.97, 1.0], sideTint: [0.84, 0.9, 1.0], sunCol: "#ffe0c0", sunI: 4.0, sky: "#b8d0f0", ground: "#405060", hemiI: 0.45, fog: "#c8d8ec", actorShadow: true });
const peak = mk(gold, { az: -116, el: 10, lit: [2.2, 1.55, 1.38], shade: [0.42, 0.26, 0.42], lift: [0.08, 0.04, 0.06], term: 0.08,
  charTint: [1.0, 0.86, 0.82], sideTint: [0.96, 0.8, 0.92], sunCol: "#ffb0a0", sunI: 6.0, sky: "#f0c0c0", ground: "#604050", hemiI: 0.45, fog: "#f6c8c0", actorShadow: true });
const indoor = (L: LightPreset, sat: number, sky: LookDef["sky"], bounce: C3 = LOOK.golden.bounce): LookDef =>
  ({ light: L, sky, fog: [L.fog, 60, 3000], sat, bounce, sunAz: L.az, sunEl: L.el, sunDisc: false, near: 0.05, shadowMin: 8 });
export const LOOKS: Record<Look, LookDef> = {
  room: indoor(room, 1.12, sunsetSky),
  xray: indoor(xray, 1.05, xraySky, [0, 0, 0]),
  lab: indoor(lab, 1.05, labSky, [0, 0, 0]),
  peak: indoor(peak, 1.16, peakSky),
};
