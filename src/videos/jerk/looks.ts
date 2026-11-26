// Per-look light rigs for the hypnic-jerk short (owner: jungle agent). RULE 3: a low light source, long shadows, blue
// shade, haze; the light CHANGES when the story turns (night blue -> golden jungle sunset).
//   night  : bedroom + apartment block at night. A low cold MOON key from ahead-left (az -25, el 28, = sets.ts MOON_DIR: through the back-wall
//            window at z -1.4 it lands across the bed and the floor in front of it, window-frame shadows slanting right),
//            deep blue shade, a faint warm street-lamp bounce on shaded faces turned to the lens, blue night haze
//            (fog 14 -> 220 m: nothing inside the room, a soft veil on the block at 8-16 m).
//   xray   : the same room sinks into deep blue-black (dark fog close in, 2.4 -> 12 m) so the glowing body reads alone.
//   jungle : THE TURN. A prehistoric jungle at a low golden SUNSET: the sun low ahead-right (az +24, el 9), long shadows
//            raking toward the lens-left, periwinkle-blue shade, warm peach haze (30 -> 420 m) that swallows the valley.
//   peak   : the ape's jolt (LOOK_RAMPS jungle -> peak 958..968): the same sun pushed to a hot golden-pink punch.
// Sun azimuths are CAMERA-RELATIVE (lights.ts): 0 = ahead (backlight), +90 = screen right, 180 = behind the camera.
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
const nightSky = { c: ["#3a4478", "#2c3568", "#1f2854", "#141c3e", "#0a1029"], e: [0, 4, 12, 26, 55] };
const xraySky = { c: ["#14305e", "#122a56", "#0f244c", "#0c1c40", "#081432"], e: [0, 4, 12, 24, 50] };
// sunset, not dusk: butter horizon, apricot, coral rose by ~10 deg, mauve, a deep periwinkle overhead
const jungleSky = { c: ["#ffd48c", "#ffb072", "#f78c70", "#c07490", "#5c5c9c"], e: [0, 3, 9, 21, 48] };
const peakSky = { c: ["#ffdca0", "#ffb488", "#ff8c88", "#dc6a96", "#7454a4"], e: [0, 3, 9, 21, 48] };

const night = mk(day, { az: -25, el: 28, lit: [1.05, 1.2, 1.66], shade: [0.13, 0.17, 0.38], lift: [0.025, 0.03, 0.075], term: 0.1,
  charTint: [0.9, 0.94, 1.0], sideTint: [0.78, 0.83, 1.0], charShade: 0.84, sunCol: "#b8ccff", sunI: 3.0, sky: "#5060a0", ground: "#1a1a30", hemiI: 0.4,
  fog: "#18203f", actorShadow: true });
const xray = mk(day, { az: -25, el: 28, lit: [0.5, 0.72, 1.3], shade: [0.05, 0.09, 0.24], lift: [0.01, 0.025, 0.07], term: 0.12,
  charTint: [0.8, 0.88, 1.0], sideTint: [0.7, 0.8, 1.0], charShade: 0.8, sunCol: "#8ab8ff", sunI: 2.2, sky: "#3050a0", ground: "#101830", hemiI: 0.35,
  fog: "#0c1838", actorShadow: true });
const jungle = mk(gold, { az: 58, el: 12, lit: [2.05, 1.45, 0.85], shade: [0.34, 0.36, 0.64], lift: [0.05, 0.05, 0.08], term: 0.08,
  charTint: [1.0, 0.85, 0.68], sideTint: [0.84, 0.82, 0.98], sunCol: "#ffb468", sunI: 6.2, sky: "#f0c0a0", ground: "#3a4a28", hemiI: 0.42,
  fog: "#eeb490", actorShadow: true });
const peak = mk(gold, { az: 58, el: 12, lit: [2.35, 1.55, 1.0], shade: [0.42, 0.32, 0.56], lift: [0.08, 0.05, 0.07], term: 0.07,
  charTint: [1.0, 0.86, 0.78], sideTint: [0.96, 0.8, 0.92], sunCol: "#ff9a88", sunI: 6.5, sky: "#f0c0c0", ground: "#5a4030", hemiI: 0.45,
  fog: "#f8b89c", actorShadow: true });
const L = (P: LightPreset, sky: LookDef["sky"], sat: number, near: number, far: number, bounce: C3, sunDisc = false, shadowMin = 8): LookDef =>
  ({ light: P, sky, fog: [P.fog, near, far], sat, bounce, sunAz: P.az, sunEl: P.el, sunDisc, near: 0.05, shadowMin });
export const LOOKS: Record<Look, LookDef> = {
  night: L(night, nightSky, 1.06, 14, 220, [0.045, 0.028, 0.008]),
  xray: L(xray, xraySky, 1.0, 2.4, 12, [0, 0, 0]),
  jungle: L(jungle, jungleSky, 1.12, 18, 300, [0.05, 0.025, 0.0], true, 10),
  peak: L(peak, peakSky, 1.16, 18, 300, [0.07, 0.03, 0.02], true, 10),
};
