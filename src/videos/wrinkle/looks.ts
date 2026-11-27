// "Rain Tires" per-look light rigs (owner: micro agent). RULE 3: a low sun, long shadows, blue shade, haze; the light
// CHANGES when the story turns: warm golden bath -> cold electric X-ray on "on purpose" -> warm pink inside the finger ->
// golden lab (hot punch at the peak) -> a dark blue prehistoric storm with a low gold sun breaking through -> golden bath.
// Sun azimuths are CAMERA-RELATIVE (lights.ts): 0 = ahead (backlight), +90 = screen right, 180 = behind the camera; the
// sun is frozen per shot from the shot's mean view direction (world.ts shotSun).
//   bath    : late-afternoon sun through the frosted window, low AHEAD-LEFT (az -55, el 14). With the first-pass cameras
//             (looking -z) the sun direction is world (-0.79, 0.24, -0.56): the window belongs on the back wall's left
//             end / the left wall (sets agent). Long warm shadows rake toward the lens-right, periwinkle shade, a warm
//             steam haze close in (fog 3 -> 42 m: ~6 % at a wall 5 m away).
//   xray    : COLD ELECTRIC BLUE. The room sinks into blue-black (dark navy fog 2.2 -> 11 m), a cold cyan key from the same
//             window side, so the hologram glows alone. Shot 2 uses it for the whole shot; to make the turn land ON "on
//             purpose", the cam owner can set SHOTS[1].look = "bath" and add LOOK_RAMPS ["bath","xray",382,389,"bath"].
//   micro   : warm PINK inside the fingertip: a low peach key from behind-right (az 115, el 18) that lights the cut face
//             and rakes ACROSS the grooves (they run along z: long groove shadows), lilac-blue shade, a pink rim on the
//             skin (micro.ts), soft pink haze 18 -> 115 m on the dome behind. Sky: peach -> rose -> plum.
//   lab     : golden window light low from screen-left (az -110, el 17, matches the sets window), blue shade, a soft warm haze (5 -> 70 m).
//   peak    : the meme punch (LOOK_RAMPS lab -> peak 772..782): the same sun pushed hot gold-pink, magenta shade.
//   rain    : a dark blue STORM, the low gold sun breaking through AHEAD (az 8, el 8: the sun disc sits in frame, a bit
//             right of centre, ~8 deg up) so wet rocks get gold rims + speculars and faces toward us fall into deep
//             storm-blue shade; rain haze 7 -> 95 m. Sky: a gold band on the horizon under slate storm clouds.
//   bathend : back in the bath, the sun lower and a touch rosier (az -55, el 10), cooler blue shade (rain on the window).
import { LIGHTS, LightPreset } from "../bridge/lights";
import { Look } from "./story";
type C3 = [number, number, number];
export type LookDef = {
  light: LightPreset; sky: { c: string[]; e: number[] }; fog: [string, number, number]; sat: number; bounce: C3;
  sunAz: number; sunEl: number; sunDisc: boolean; near: number; shadowMin: number;
};
const day = LIGHTS.day, gold = LIGHTS.golden;
const mk = (base: LightPreset, o: Partial<LightPreset>): LightPreset => ({ ...base, ...o });
// skies: 5 stops c[i] at elevation e[i] degrees (on-screen colours; world.ts pre-inverts the tone map)
const bathSky = { c: ["#ffd894", "#ffb877", "#f79272", "#c87892", "#62609e"], e: [0, 3, 9, 21, 48] };
const bathEndSky = { c: ["#ffcf98", "#f7aa80", "#e48a80", "#a87896", "#55628f"], e: [0, 3, 9, 21, 48] };
const xraySky = { c: ["#16407a", "#123670", "#0e2a5c", "#0a1e48", "#061232"], e: [0, 4, 12, 24, 50] };
const microSky = { c: ["#ffc2b2", "#ffa8ac", "#f28aa6", "#c8709e", "#7c5498"], e: [0, 3, 8, 18, 45] };
const labSky = { c: ["#ffd48c", "#ffb072", "#f78c70", "#c07490", "#5c5c9c"], e: [0, 3, 9, 21, 48] };
const peakSky = { c: ["#ffdca0", "#ffb488", "#ff8c88", "#dc6a96", "#7454a4"], e: [0, 3, 9, 21, 48] };
const rainSky = { c: ["#ffcf86", "#e8a47c", "#7c84a0", "#4a5676", "#2a3350"], e: [0, 2.5, 7, 16, 40] };

const bath = mk(gold, { az: -55, el: 14, lit: [2.1, 1.48, 0.86], shade: [0.33, 0.36, 0.66], lift: [0.05, 0.05, 0.085], term: 0.08,
  charTint: [1.0, 0.86, 0.7], sideTint: [0.84, 0.83, 1.0], sunCol: "#ffb86c", sunI: 6.2, sky: "#f0c4a4", ground: "#5a4a58", hemiI: 0.42,
  fog: "#f2c8a6", actorShadow: true });
const bathEnd = mk(bath, { az: -55, el: 10, lit: [2.05, 1.36, 0.86], shade: [0.3, 0.35, 0.7], lift: [0.045, 0.05, 0.095],
  charTint: [1.0, 0.84, 0.72], sideTint: [0.8, 0.83, 1.0], sunCol: "#ffaa70", fog: "#e2bcae" });
const xray = mk(day, { az: -40, el: 22, lit: [0.48, 0.86, 1.62], shade: [0.035, 0.07, 0.24], lift: [0.01, 0.03, 0.085], term: 0.1,
  charTint: [0.74, 0.88, 1.0], sideTint: [0.62, 0.8, 1.0], charShade: 0.8, sunCol: "#7cc8ff", sunI: 2.4, sky: "#2a5ab0", ground: "#0c1630", hemiI: 0.35,
  fog: "#0a1a44", actorShadow: true });
const micro = mk(gold, { az: 115, el: 18, lit: [2.0, 1.4, 1.08], shade: [0.46, 0.33, 0.6], lift: [0.06, 0.04, 0.08], term: 0.09, lambert: 0.35,
  charTint: [1.0, 0.88, 0.82], sideTint: [0.92, 0.82, 1.0], sunCol: "#ffc0a0", sunI: 5.0, sky: "#f6b8b0", ground: "#7a4a5a", hemiI: 0.42,
  fog: "#f8b0aa", actorShadow: true, bias: -0.0004, normalBias: 0.02 });
const lab = mk(gold, { az: -110, el: 17, lit: [2.05, 1.45, 0.85], shade: [0.34, 0.36, 0.64], lift: [0.05, 0.05, 0.08], term: 0.08,
  charTint: [1.0, 0.86, 0.7], sideTint: [0.84, 0.82, 0.98], sunCol: "#ffb468", sunI: 6.2, sky: "#f0c0a0", ground: "#5a4a3a", hemiI: 0.42,
  fog: "#f0c09c", actorShadow: true });
const peak = mk(gold, { az: -110, el: 17, lit: [2.45, 1.5, 0.95], shade: [0.46, 0.28, 0.56], lift: [0.09, 0.04, 0.07], term: 0.07,
  charTint: [1.0, 0.86, 0.76], sideTint: [0.98, 0.78, 0.92], sunCol: "#ff9a80", sunI: 6.8, sky: "#f8c0b8", ground: "#6a3a30", hemiI: 0.45,
  fog: "#ffb898", actorShadow: true });
const rain = mk(gold, { az: 8, el: 5, lit: [2.15, 1.38, 0.7], shade: [0.15, 0.2, 0.44], lift: [0.02, 0.035, 0.08], term: 0.09,
  charTint: [0.92, 0.88, 0.86], sideTint: [0.7, 0.78, 1.0], charShade: 0.82, sunCol: "#ffb860", sunI: 6.0, sky: "#6a7a9c", ground: "#2a3428", hemiI: 0.4,
  fog: "#5e6e8e", actorShadow: true });
const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  bath: L(bath, bathSky, 1.1, 3, 42, [0.05, 0.026, 0.0]),
  xray: L(xray, xraySky, 1.02, 2.2, 11, [0, 0.005, 0.02]),
  micro: L(micro, microSky, 1.12, 18, 115, [0.07, 0.025, 0.03]),
  lab: L(lab, labSky, 1.1, 5, 70, [0.05, 0.025, 0.0]),
  peak: L(peak, peakSky, 1.18, 5, 70, [0.08, 0.03, 0.02]),
  rain: L(rain, rainSky, 1.05, 7, 95, [0.03, 0.022, 0.0], true, 10),
  bathend: L(bathEnd, bathEndSky, 1.08, 3, 42, [0.045, 0.025, 0.005]),
};
