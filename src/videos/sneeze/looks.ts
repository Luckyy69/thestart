// Per-look light rigs for the sun-sneeze short (owner: eras agent). RULE 3: low sun, long shadows, blue shade, haze; the
// light changes when the story turns.
//   dawn    : STREET at sunrise: a blinding low sun straight down the street (backlight), long shadows, blue shade, haze
//   greece  : Athens golden hour: warm Mediterranean low sun, turquoise sea haze, violet shade
//   england : 1630s England: a soft hazy pale-gold morning, misty blue shade (a different, cooler gold)
//   xray    : inside the head: deep blue-black, the nerves glow (story turns)
//   flash   : the ACHOO peak: an overexposed warm white punch
//   stage   : 1978 conference: warm stage spots + cool house lights, a little haze in the projector beam
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
const dawnSky = { c: ["#ffd08a", "#ffb07a", "#f0907e", "#9a78a8", "#4a5a9a"], e: [0, 3, 9, 20, 44] };
// DAWN / FLASH (+ XRAY, same street): the sunrise rakes DOWN the street from +x. Camera-relative: az 103 / el 9 with
// the shot 1/5/6 cameras looking ~-z gives the world sun ~(0.96, 0.16, 0.22) (sets owner's tested direction).
const dawn = mk(gold, { az: 103, el: 9, lit: [2.0, 1.4, 0.85], shade: [0.24, 0.28, 0.5], lift: [0.04, 0.03, 0.07], sunCol: "#ffbe78", sunI: 6.2, sky: "#e8c0b0", ground: "#6a5a50", hemiI: 0.42, fog: "#f0c0a0", actorShadow: true });
// GREECE: a hot amber sun low over the sea (right of the view axis), violet shade, deep Aegean-blue zenith, warm haze
const greece = mk(gold, { az: 16, el: 7, lit: [2.05, 1.38, 0.74], shade: [0.25, 0.22, 0.48], lift: [0.04, 0.025, 0.07], term: 0.08,
  charTint: [1.0, 0.82, 0.62], sideTint: [0.84, 0.78, 0.96], sunCol: "#ffb468", sunI: 6.2, sky: "#f0c0a0", ground: "#b08870", hemiI: 0.42, fog: "#f6c393", actorShadow: true });
// ENGLAND: a pale lemon-gold sun through morning mist (LEFT of the view axis, a little higher), cool green-blue shade,
// soft contrast, milky haze close in
const england = mk(gold, { az: -62, el: 13, lit: [1.8, 1.6, 1.18], shade: [0.27, 0.36, 0.52], lift: [0.05, 0.055, 0.07], term: 0.12,
  charTint: [1.0, 0.93, 0.8], sideTint: [0.88, 0.92, 0.98], sunCol: "#ffe6b4", sunI: 5.0, sky: "#dfe4ea", ground: "#6a7a58", hemiI: 0.45, fog: "#efe5cc", actorShadow: true });
const xray = mk(day, { az: 103, el: 9, lit: [0.7, 0.95, 1.4], shade: [0.08, 0.14, 0.32], lift: [0.01, 0.03, 0.08], sunCol: "#8ab8ff", sunI: 2.2, sky: "#3050a0", ground: "#101830", hemiI: 0.35, fog: "#0a1430", actorShadow: true });
const flash = mk(gold, { az: 103, el: 9, lit: [2.4, 2.1, 1.7], shade: [0.6, 0.55, 0.6], lift: [0.1, 0.09, 0.09], sunCol: "#fff0d0", sunI: 8.0, sky: "#fff0e0", ground: "#c0a090", hemiI: 0.6, fog: "#fff0e0", actorShadow: true });
const stage = mk(day, { az: 30, el: 18, lit: [1.95, 1.6, 1.25], shade: [0.2, 0.18, 0.36], lift: [0.03, 0.02, 0.05], sunCol: "#ffd8a0", sunI: 5.0, sky: "#402838", ground: "#201018", hemiI: 0.3, fog: "#2a1a24", actorShadow: true });
const out = (L: LightPreset, sat: number, sky = dawnSky, far = 900): LookDef => ({ light: L, sky, fog: [L.fog, 60, far], sat, bounce: LOOK.golden.bounce, sunAz: L.az, sunEl: L.el, sunDisc: true, near: 0.05, shadowMin: 10 });
export const LOOKS: Record<Look, LookDef> = {
  dawn: out(dawn, 1.12),
  greece: { ...out(greece, 1.14, { c: ["#f6c393", "#ffbb80", "#f2a486", "#b49ab8", "#4a7cc0"], e: [0, 3, 9, 20, 46] }), fog: [greece.fog, 90, 1500] },
  england: { ...out(england, 1.04, { c: ["#efe5cc", "#efe6d4", "#d8dfe6", "#adc2da", "#7f9ec8"], e: [0, 4, 11, 24, 50] }), fog: [england.fog, 10, 520] }, // QA1: far 230 -> 520: the parkland trees (160-250 m) keep their fill under the ink
  xray: { ...out(xray, 1.1), sunDisc: false },
  flash: out(flash, 1.1),
  stage: { ...out(stage, 1.12), sunDisc: false, fog: [stage.fog, 60, 3000] },
};
