// Per-look light rigs for the burp short (owner: exterior agent). Same LookDef shape as the emu short.
// RULE: low sun, long shadows, blue shade, haze; the light changes when the story turns.
//   station    : cool blue module shade, a low raking sun shaft through the round window (az from the window side)
//   backyard   : Earth golden hour: very low warm sun, long shadows, peach haze
//   commercial : the soda-can reveal in orbit: warm spotlight-gold key on black space, rim light
//   orbit      : hard low sun on Earth's limb, blue haze rim, black sky
//   middeck    : 1985 middeck: blue-grey shade, one low sun shaft through the small window
//   gross      : the PEAK: the middeck turned sickly green-yellow (story turns)
//   sunrise    : the TWIST: golden sunrise flooding the station module, long warm shadows, haze
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const space = { c: ["#02030a", "#02030a", "#03040c", "#03040c", "#010208"], e: [0, 5, 20, 40, 80] };
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
const station = mk(day, { az: -70, el: 14, lit: [1.75, 1.6, 1.4], shade: [0.26, 0.32, 0.5], lift: [0.02, 0.03, 0.06], sunCol: "#fff0d8", sunI: 3.2, sky: "#9fc0ff", ground: "#3a4a6a", hemiI: 0.45, fog: "#24304a", actorShadow: true });
const backyard = mk(gold, { az: 35, el: 8, lit: [1.9, 1.25, 0.72], shade: [0.5, 0.45, 0.76], lift: [0.07, 0.05, 0.11], sunCol: "#ffb46a", sunI: 6.0, sky: "#e8b8a8", ground: "#5a6a48", hemiI: 0.42, fog: "#f0b088", actorShadow: true });
const commercial = mk(gold, { az: 135, el: 22, lit: [2.1, 1.55, 0.95], shade: [0.2, 0.2, 0.42], lift: [0.03, 0.03, 0.08], sunCol: "#ffd08a", sunI: 5.0, sky: "#402040", ground: "#100818", hemiI: 0.3, fog: "#000000", actorShadow: false });
const orbit = mk(day, { az: 100, el: 12, lit: [1.95, 1.8, 1.55], shade: [0.3, 0.38, 0.62], lift: [0.02, 0.03, 0.07], sunCol: "#fff2e0", sunI: 4.5, sky: "#5a80d0", ground: "#102040", hemiI: 0.3, fog: "#000000", actorShadow: true });
const middeck = mk(day, { az: -60, el: 12, lit: [1.7, 1.55, 1.35], shade: [0.28, 0.32, 0.48], lift: [0.02, 0.03, 0.06], sunCol: "#ffeed6", sunI: 3.0, sky: "#a8c0f0", ground: "#404858", hemiI: 0.45, fog: "#2a3040", actorShadow: true });
const gross = mk(day, { az: -60, el: 12, lit: [1.55, 1.75, 0.9], shade: [0.26, 0.36, 0.18], lift: [0.03, 0.05, 0.01], sunCol: "#e8ff90", sunI: 3.0, sky: "#b8e070", ground: "#405020", hemiI: 0.5, fog: "#2a3818", actorShadow: true });
const sunrise = mk(gold, { az: -40, el: 8, lit: [2.0, 1.32, 0.72], shade: [0.3, 0.27, 0.5], lift: [0.05, 0.03, 0.07], sunCol: "#ffb066", sunI: 6.0, sky: "#f0c0a0", ground: "#504060", hemiI: 0.4, fog: "#c08070", actorShadow: true });
export const LOOKS: Record<Look, LookDef> = {
  station: { light: station, sky: space, fog: [station.fog, 60, 3000], sat: 1.05, bounce: [0.0, 0.01, 0.03], sunAz: station.az, sunEl: station.el, sunDisc: false, near: 0.05, shadowMin: 8 },
  backyard: { light: backyard, sky: { c: ["#ffc27a", "#f8a070", "#e6847a", "#b46a88", "#5e4f8a"], e: [0, 4, 10, 21, 44] }, fog: [backyard.fog, 14, 240], sat: 1.12, bounce: LOOK.golden.bounce, sunAz: backyard.az, sunEl: backyard.el, sunDisc: true, near: 0.05, shadowMin: 10 },
  commercial: { light: commercial, sky: space, fog: [commercial.fog, 3000, 20000], sat: 1.15, bounce: [0.03, 0.02, 0.0], sunAz: commercial.az, sunEl: commercial.el, sunDisc: false, near: 0.05, shadowMin: 8 },
  orbit: { light: orbit, sky: space, fog: [orbit.fog, 3000, 20000], sat: 1.08, bounce: [0.0, 0.01, 0.03], sunAz: orbit.az, sunEl: orbit.el, sunDisc: false, near: 0.5, shadowMin: 60 },
  middeck: { light: middeck, sky: space, fog: [middeck.fog, 60, 3000], sat: 1.05, bounce: [0.0, 0.01, 0.03], sunAz: middeck.az, sunEl: middeck.el, sunDisc: false, near: 0.05, shadowMin: 8 },
  gross: { light: gross, sky: space, fog: [gross.fog, 60, 3000], sat: 1.15, bounce: [0.01, 0.03, 0.0], sunAz: gross.az, sunEl: gross.el, sunDisc: false, near: 0.05, shadowMin: 8 },
  sunrise: { light: sunrise, sky: space, fog: [sunrise.fog, 60, 3000], sat: 1.12, bounce: LOOK.golden.bounce, sunAz: sunrise.az, sunEl: sunrise.el, sunDisc: false, near: 0.05, shadowMin: 8 },
};
