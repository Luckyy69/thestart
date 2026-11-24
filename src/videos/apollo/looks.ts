// Per-place looks for the Apollo short (owner: outdoor agent). Each look = a full light preset in the shared
// LightPreset shape (bridge/lights.ts) + sky stops, fog, saturation, bounce, sun placement and camera near plane.
//   storm    : grey Florida rain / inside the storm deck: cool blue-grey, soft overcast light, darker zenith, haze only far
//              (fog starts at 300 m so the rocket ~300 m from the lens stays crisp; the cloud layers carry the haze)
//   interior : warm cabin lamps, deep red-brown shade (the red alarm tone comes from the C&W lights + this shade)
//   mcc      : dim room lit by the screens: cool cyan-white key, near-black blue shade
//   diagram  : clean bright day, soft shadows, pale sky
//   space    : hard white sun, black shade, black sky
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const storm: LightPreset = {
  ...day, az: 100, el: 62,
  lit: [1.12, 1.18, 1.3], shade: [0.42, 0.47, 0.6], lift: [0.03, 0.035, 0.05], lambert: 0.45, sideK: 0.78, term: 0.5,
  charTint: [0.9, 0.94, 1.02], charShade: 0.84, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.88, 0.9, 0.98],
  blob: [0.5, 0.52, 0.58], actorShadow: false,
  fog: "#7f8a99", sunCol: "#dfe6f2", sunI: 1.6, sky: "#b8c4d4", ground: "#5a6052", hemiI: 0.9,
};
const interior: LightPreset = {
  ...day, az: 140, el: 48,
  lit: [1.62, 1.3, 0.98], shade: [0.34, 0.16, 0.15], lift: [0.05, 0.012, 0.01], lambert: 0.4, sideK: 0.8, term: 0.22,
  charTint: [1.0, 0.86, 0.78], charShade: 0.82, charGrad: 0.12, bodyGrad: 0.24, sideTint: [0.98, 0.82, 0.8],
  blob: [0.5, 0.36, 0.34], actorShadow: true,
  sunCol: "#ffd2a0", sunI: 2.4, sky: "#ffcfa8", ground: "#6a3430", hemiI: 0.5,
};
const mcc: LightPreset = {
  ...day, az: 160, el: 40,
  lit: [1.0, 1.12, 1.3], shade: [0.11, 0.12, 0.2], lift: [0.01, 0.015, 0.04], lambert: 0.35, sideK: 0.75, term: 0.2,
  charTint: [0.88, 0.95, 1.05], charShade: 0.78, charGrad: 0.14, bodyGrad: 0.28, sideTint: [0.78, 0.84, 1.0],
  blob: [0.3, 0.32, 0.42], actorShadow: true,
  sunCol: "#cfe6ff", sunI: 1.8, sky: "#9fb8e0", ground: "#1c2030", hemiI: 0.35,
};
const diagram: LightPreset = {
  ...day, az: 120, el: 45,
  lit: [1.6, 1.56, 1.46], shade: [0.52, 0.52, 0.66], lift: [0.03, 0.03, 0.05], lambert: 0.3, sideK: 0.85, term: 0.2,
};
const space: LightPreset = {
  ...gold, az: 115, el: 22,
  lit: [2.05, 2.0, 1.9], shade: [0.07, 0.075, 0.1], lift: [0.008, 0.01, 0.02], lambert: 0.35, sideK: 0.85, term: 0.08,
  charTint: [1.0, 1.0, 1.0], charShade: 0.72, charGrad: 0.12, bodyGrad: 0.3, sideTint: [0.82, 0.85, 0.95],
  blob: [0.2, 0.2, 0.25], actorShadow: true,
  fog: "#000000", sunCol: "#ffffff", sunI: 4.5, sky: "#202838", ground: "#3a3a3a", hemiI: 0.15,
};
export const LOOKS: Record<Look, LookDef> = {
  storm: { light: storm, sky: { c: ["#8994a3", "#7f8a9a", "#6c7789", "#566173", "#3e4757"], e: [0, 4, 12, 26, 60] }, fog: ["#828d9c", 300, 2300], sat: 0.82, bounce: [0, 0, 0], sunAz: storm.az, sunEl: storm.el, sunDisc: false, near: 0.2, shadowMin: 20 },
  interior: { light: interior, sky: { c: ["#9aa3ae", "#8d96a2", "#7c8594", "#6a7383", "#566070"], e: [0, 4, 12, 26, 60] }, fog: ["#8d96a2", 400, 3000], sat: 1.05, bounce: [0.05, 0.015, 0.0], sunAz: interior.az, sunEl: interior.el, sunDisc: false, near: 0.05, shadowMin: 6 },
  mcc: { light: mcc, sky: { c: ["#1c2232", "#181d2b", "#141824", "#10131c", "#0b0d14"], e: [0, 4, 12, 26, 60] }, fog: ["#141824", 400, 3000], sat: 1.05, bounce: [0.0, 0.01, 0.03], sunAz: mcc.az, sunEl: mcc.el, sunDisc: false, near: 0.05, shadowMin: 12 },
  diagram: { light: diagram, sky: { c: ["#dbe9f2", "#c6def2", "#a6ccef", "#86b7e8", "#5f9bdc"], e: [0, 3, 10, 22, 50] }, fog: ["#dbe9f2", 2600, 9000], sat: 1.0, bounce: [0, 0, 0], sunAz: diagram.az, sunEl: diagram.el, sunDisc: false, near: 0.5, shadowMin: 40 },
  space: { light: space, sky: { c: ["#000000", "#000000", "#000000", "#000000", "#000000"], e: [0, 4, 10, 20, 40] }, fog: ["#000000", 6000, 11000], sat: 0.9, bounce: [0, 0, 0], sunAz: space.az, sunEl: space.el, sunDisc: false, near: 0.1, shadowMin: 20 },
};
void LOOK;
