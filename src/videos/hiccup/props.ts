// OWNER: props agent. See /home/user/lookmatch/HICCUP_BRIEF.md
// Hard props of "Hiccups Come From Tadpoles" (all pure functions of (id, t); never frustum culled):
//   1. ZING! LIME FIZZ: BEAN's own-design fizzy can (lime body, magenta swoosh, bubble pattern, "ZING!" lettering,
//      stay-on ring-pull, condensation glints). canPose(id, t) is THE contract for BEAN's can hand (cast follows it).
//      Shot 1: mid-sip at the mouth -> the first HIC (0.25 s) knocks it off his lips and a big FIZZ SPRAY erupts
//      (stretched droplets + foam crown + mist), then it is lowered to the hand. Shot 2: held low at the hip (clear of
//      the X-ray). Shot 4: scales in with the morph, lifted up on "fizzy drink" for the betrayed look (fizz rising),
//      lowered on "sometimes"; every later BEAN hic jolts it with a small fizz spurt.
//   2. PRAIRIE KING hog-scale dial: a green cast-iron column with a brass-bezelled round dial (0-500 LBS, hand-painted
//      face) behind the hog platform; the needle settles on the hog, kicks on every Osborne hic, wanders through the
//      68-year time-lapse (a new hog every year) and slams round on the last giant hic.
//   3. CORN SACKS: lumpy burlap "IOWA SEED CORN" sacks (tied necks), a stack + an open sack with cobs; more sacks
//      scale in during the time-lapse (68 years of corn).
//   4. HIC PUFFS: per HICS, a soft air ring + a burst of iridescent 3D bubbles out of the mouth that drift, wobble
//      and pop (scale-up + fade + sparkle, never a hard pop). NOINK.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { KITCHEN, FARM, W, HICS, V3, FPS, SHOTS, smooth, clamp01, glide, morphAt, osborneAt, shotStart } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: props-only framing for stills (must be false when reporting)
const DEBUG_SET = false; // TEMP: stand-in floor/counter/platform for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const lerp3 = (a: V3, b: V3, u: number): V3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
const shotEnd = (id: number) => SHOTS[id - 1].b / FPS;

// ============================== public contracts ==============================
/** default anchors until cast reports (swap these for cast's handAt / mouthAt when merged) */
export const BEAN_HAND: V3 = add(KITCHEN, 0.28, 1.0, 0.12);
export const BEAN_MOUTH: V3 = add(KITCHEN, 0, 1.38, 0.1);
export const OSBORNE_MOUTH: V3 = add(FARM, 0, 1.45, 0.1);
/** hic jolt envelope for `who` at t: 0 at rest, a quick kick up to the hic size, then a damped wobble (-..+) */
export const hicKick = (t: number, who: string) => {
  let k = 0;
  for (const [h, w, s] of HICS) {
    if (w !== who) continue;
    const d = t - h;
    if (d < 0 || d > 0.9) continue;
    k += s * (d < 0.05 ? Math.sin((d / 0.05) * Math.PI * 0.5) : Math.exp(-(d - 0.05) * 7) * Math.cos((d - 0.05) * 22));
  }
  return k;
};
/** mouth point (world) the hic bubbles come out of: BEAN default + jolt; Osborne stoops 9 cm as he ages */
export const hicMouth = (id: number, t: number, who: string): V3 => {
  const k = Math.max(0, hicKick(t, who));
  if (who === "osborne") { const a = osborneAt(id, t).age; return add(OSBORNE_MOUTH, 0.02 * a, -0.09 * a + 0.03 * k, 0.03 * a); }
  return add(BEAN_MOUTH, 0, 0.03 * k, 0);
};

/** can: CAN_H x CAN_SCALE = 0.17 m tall, radius CAN_R x CAN_SCALE = 0.046 m (cartoon size) */
export const CAN_H = 0.122, CAN_R = 0.033, CAN_SCALE = 1.4;
const HH = (CAN_H / 2) * CAN_SCALE; // half height (world)
export type CanPose = {
  /** 0..1 visibility (scales in; never pops) */ show: number;
  /** can CENTRE (world) = the grip point for BEAN's hand */ pos: V3;
  /** rad about z: + = top toward screen-left (BEAN's mouth) */ tilt: number;
  /** rad about x: + = top toward the camera (+z) */ lean: number;
  /** true when BEAN's hand holds it (shots 1, 2, 4) */ held: boolean;
};
const SIP_TILT = 1.2;
/** the can at his lips: rim just in front of the mouth */
const sipPos = (): V3 => add(BEAN_MOUTH, 0.015 + HH * Math.sin(SIP_TILT), -0.015 - HH * Math.cos(SIP_TILT), 0.07);
const liftAt = (t: number) => glide((t - (W.fizzy - 0.35)) / 0.5) * (1 - glide((t - (W.sometimes - 0.25)) / 0.6));
/** BEAN's can per shot. Shot 1: sip until the HIC (0.25 s), knocked off his lips, lowered to BEAN_HAND by ~1.2 s.
 *  Shot 2: eases down to the hip BEAN_HAND+(0.05,-0.27,0.02) by shotStart(2)+0.7 (clear of the chest X-ray).
 *  Shot 4: scales in with morphAt, at BEAN_HAND; lifted to KITCHEN+(0.21,1.25,0.3) on "fizzy" (W.fizzy-0.35 .. +0.5)
 *  for the betrayed look, lowered back from W.sometimes-0.25. Every BEAN hic jolts it. Hidden in shots 3 and 5. */
export const canPose = (id: number, t: number): CanPose => {
  const k = hicKick(t, "bean");
  const wob = (a: number) => a * Math.sin(t * 1.7) + a * 0.6 * Math.sin(t * 2.9 + 1.3);
  if (id === 1) {
    const sip = sipPos(), rest = BEAN_HAND;
    const glug = t < 0.25 ? 0.035 * Math.sin(t * 14) : 0;
    const u = glide((t - 0.5) / 0.7);
    const p = lerp3(sip, rest, u);
    const off = 1 - u; // the knock-off is big at the lips, small at rest
    return {
      show: 1, held: true,
      pos: add(p, 0.06 * k * (0.4 + off) + wob(0.003), 0.045 * k + wob(0.002), 0.035 * k * off),
      tilt: (SIP_TILT + glug) * (1 - u) + 0.1 * u - 0.45 * k * off - 0.12 * k * u, lean: 0.12 * u + 0.1 * k,
    };
  }
  if (id === 2) {
    const u = glide((t - shotStart(2)) / 0.7);
    const p = lerp3(BEAN_HAND, add(BEAN_HAND, 0.05, -0.27, 0.02), u);
    return { show: 1, held: true, pos: add(p, 0.012 * k + wob(0.002), 0.03 * k, 0), tilt: 0.1 - 0.08 * u - 0.15 * k, lean: 0.12 + 0.08 * k };
  }
  if (id === 4) {
    const s = glide(morphAt(t * FPS));
    const up = liftAt(t);
    const p = lerp3(BEAN_HAND, add(KITCHEN, 0.21, 1.25, 0.3), up);
    return { show: s, held: true, pos: add(p, 0.015 * k + wob(0.003), 0.04 * k - 0.04 * (1 - s), 0), tilt: 0.1 - 0.22 * up - 0.18 * k, lean: 0.12 + 0.22 * up + 0.1 * k };
  }
  return { show: 0, held: false, pos: BEAN_HAND, tilt: 0, lean: 0 };
};
/** unit can axis (bottom -> top) for a pose */
export const canAxis = (q: CanPose): V3 => { const st = Math.sin(q.tilt), ct = Math.cos(q.tilt); return [-st, ct * Math.cos(q.lean), ct * Math.sin(q.lean)]; };
/** the can's opening (world) for a pose: top centre along the can axis */
export const canTop = (q: CanPose): V3 => { const a = canAxis(q), h = HH * 0.98; return add(q.pos, a[0] * h, a[1] * h, a[2] * h); };
/** fizz eruptions from the can: [t, power]; the first hic is THE spray (power 1), later BEAN hics small spurts */
export const SPRAYS: [number, number][] = HICS.filter((h) => h[1] === "bean").map((h, i) => [h[0], i === 0 ? 1 : 0.32 + 0.2 * h[2]]);
const beanShot = (t: number) => (t < shotEnd(1) ? 1 : t < shotEnd(2) ? 2 : t >= shotStart(4) && t < shotEnd(4) ? 4 : 0);

/** hog-scale dial (shot 5): column foot at SCALE_DIAL_BASE (0.2 m square footprint), dial centre SCALE_DIAL
 *  (radius SCALE_DIAL_R, case depth 0.08 m behind the face, face toward +z yawed SCALE_DIAL_YAW). Stands just behind
 *  the hog platform (sets: FARM+(0.8,0,-0.3)); the hog card stands in front of the column. */
export const SCALE_DIAL_BASE: V3 = add(FARM, 0.95, 0, -0.98);
export const SCALE_DIAL: V3 = add(FARM, 0.95, 1.27, -0.94);
export const SCALE_DIAL_R = 0.21, SCALE_DIAL_YAW = -0.12;
const yearHog = (y: number) => 190 + 130 * rng(y * 7 + 3)(); // a new hog each year (lbs)
/** dial reading (lbs, 0..500) + needle angle (rad, clockwise from 12 o'clock; 0 lbs = -2.6, 500 = +2.6) */
export const dialAt = (id: number, t: number) => {
  if (id !== 5) return { lbs: 0, angle: -2.6 };
  const t0 = shotStart(5), o = osborneAt(id, t), d = Math.max(0, t - t0);
  // the hog has just stepped on: a damped swing onto 245 lbs
  let lbs = 245 - 245 * Math.exp(-d * 2.2) * Math.cos(d * 5.5);
  // time-lapse: a new hog every year (smoothly, the needle swings between them)
  if (o.age > 0) {
    const yf = 1922 + 68 * o.age, y0 = Math.floor(yf), u = smooth(yf - y0);
    const tl = yearHog(y0) + (yearHog(y0 + 1) - yearHog(y0)) * u;
    lbs += (tl - 245) * smooth(o.age / 0.05) * (1 - smooth((t - (W.million - 0.2)) / 0.4));
  }
  // every hic jolts the scale (he leans on it); the last giant one slams it round
  for (const [h, w, s] of HICS) {
    if (w !== "osborne") continue;
    const e = t - h;
    if (e < 0 || e > 1.8) continue;
    const big = s >= 1 ? 1 : 0, e1 = Math.max(0, e - 0.07);
    lbs += (60 + 170 * big) * s * Math.sin(Math.min(1, e / 0.07) * Math.PI * 0.5) * Math.exp(-e1 * (big ? 2.2 : 4.5)) * Math.cos(e1 * (big ? 9 : 14));
  }
  lbs = Math.max(0, Math.min(498, lbs));
  return { lbs, angle: -2.6 + (5.2 * lbs) / 500 };
};

/** corn sacks (shot 5), FARM-relative: [x, z, yaw, scale, tiltX, tiltZ, y, ageIn (-1 = always)]; ~0.55 m wide,
 *  0.72 m tall at scale 1. The extra ones scale in when osborneAt.age passes ageIn. */
export const SACKS: [number, number, number, number, number, number, number, number][] = [
  [-1.05, -0.78, 0.25, 1.0, 0, 0.04, 0, -1],
  [-1.55, -0.92, -0.35, 0.96, 0, -0.05, 0, -1],
  [-1.3, -0.88, 0.1, 0.86, -0.06, 0.32, 0.5, -1], // leaning on top of the two
  [-1.95, -1.05, 0.6, 0.92, 0, 0.03, 0, 0.18],
  [-0.72, -1.15, -0.2, 0.9, 0, -0.04, 0, 0.38],
  [-1.75, -1.2, -0.1, 0.82, -0.05, 0.28, 0.5, 0.58],
  [-0.95, -1.25, 0.4, 0.84, 0.05, -0.3, 0.52, 0.78],
];
/** the open sack with cobs (radius ~0.24 m, 0.47 m tall) + two cobs on the ground to its +x */
export const OPEN_SACK: V3 = add(FARM, -0.8, 0, 0.22);

// ============================== materials / textures ==============================
const lamb = (col: THREE.ColorRepresentation, map: THREE.Texture | null = null) => twoTone(new THREE.MeshLambertMaterial({ color: col, map }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number, glow = 0) =>
  twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh, emissive: new THREE.Color(glow, glow, glow), emissiveMap: glow ? map : null }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const lathe = (pts: [number, number][], seg = 48) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const noink = <T extends THREE.Object3D>(o: T, order = 15) => { o.layers.set(NOINK); o.frustumCulled = false; o.renderOrder = order; return o; };
const solid = <T extends THREE.Mesh>(m: T) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; return m; };
const xf = (g: THREE.BufferGeometry, p: [number, number, number], e: [number, number, number], s = 1) =>
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)), new THREE.Vector3(s, s, s)));

/** ZING! LIME FIZZ wrap (1024x512, two logos round the can so any yaw shows one; logos centred at u 0.25 / 0.75) */
const canTex = () => ctex("hicCanZing", 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, "#3f8a12"); gr.addColorStop(0.1, "#8fe02a"); gr.addColorStop(0.5, "#b4f03c"); gr.addColorStop(0.9, "#8fe02a"); gr.addColorStop(1, "#3f8a12");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 110; i++) { // bubble pattern
    const x = r() * 1024, y = 30 + r() * 450, rr = 4 + r() * r() * 26;
    g.strokeStyle = "rgba(255,255,235,0.6)"; g.lineWidth = 3.5; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.22, 0, TAU); g.fill();
  }
  // magenta swoosh band (period = the texture width, so it wraps seamlessly)
  g.fillStyle = "#e0187a"; g.beginPath(); g.moveTo(0, 392);
  for (let x = 0; x <= 1024; x += 8) g.lineTo(x, 392 + 34 * Math.sin((x / 1024) * TAU * 2));
  for (let x = 1024; x >= 0; x -= 8) g.lineTo(x, 452 + 30 * Math.sin((x / 1024) * TAU * 2 + 0.6));
  g.closePath(); g.fill();
  g.strokeStyle = "#fff36a"; g.lineWidth = 8; g.beginPath();
  for (let x = 0; x <= 1024; x += 8) { const y = 384 + 34 * Math.sin((x / 1024) * TAU * 2); if (x) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke();
  g.fillStyle = "#e0187a"; g.fillRect(0, 64, 1024, 14); g.fillStyle = "#fff36a"; g.fillRect(0, 78, 1024, 5);
  for (const cx of [256, 768]) {
    g.save(); g.translate(cx, 232);
    g.fillStyle = "#fff36a"; g.beginPath(); // splash burst behind the word
    for (let k = 0; k < 28; k++) { const a = (k / 28) * TAU, rr = k % 2 ? 112 : 150; g.lineTo(Math.cos(a) * rr * 1.45, Math.sin(a) * rr * 0.78); }
    g.closePath(); g.fill(); g.lineWidth = 6; g.strokeStyle = "#1d4a06"; g.stroke();
    g.rotate(-0.12);
    g.font = `900 148px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = 26; g.strokeStyle = "#7a0a42"; g.strokeText("ZING!", 0, 6);
    g.fillStyle = "#e0187a"; g.fillText("ZING!", 0, 6);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.save(); g.beginPath(); g.rect(-240, -70, 480, 46); g.clip(); g.fillText("ZING!", 0, 6); g.restore();
    g.restore();
    g.font = `900 40px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.lineWidth = 10; g.strokeStyle = "#1d4a06"; g.strokeText("LIME FIZZ", cx, 352); g.fillStyle = "#ffffff"; g.fillText("LIME FIZZ", cx, 352);
    g.font = `800 22px ${FONT}`; g.fillStyle = "#1d4a06"; g.fillText("EXTRA BUBBLY · 330 ml", cx, 112);
  }
});
const metalTex = () => ctex("hicCanMetal", 256, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, "#c9ced6"); gr.addColorStop(0.3, "#f4f6fa"); gr.addColorStop(0.55, "#a9b0bb"); gr.addColorStop(0.8, "#e6e9ef"); gr.addColorStop(1, "#c9ced6");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
});
const softTex = () => ctex("hicSoft", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const ringTex = () => ctex("hicRing", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 40, 128, 128, 126);
  gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.55, "rgba(255,255,255,0.85)"); gr.addColorStop(0.75, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const starTex = () => ctex("hicStar", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 20);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff";
  const w = 60, h = 4;
  g.beginPath(); g.moveTo(64 - w, 64); g.quadraticCurveTo(64, 64 - h, 64 + w, 64); g.quadraticCurveTo(64, 64 + h, 64 - w, 64); g.fill();
  g.beginPath(); g.moveTo(64, 64 - w); g.quadraticCurveTo(64 + h, 64, 64, 64 + w); g.quadraticCurveTo(64 - h, 64, 64, 64 - w); g.fill();
});
/** burlap with a faded stencil, centred at u 0.5 (the -z side of a lathe: sacks are yawed by PI to face +z) */
const burlapTex = () => ctex("hicBurlap", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9a86e"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 6) { g.fillStyle = `rgba(${r() < 0.5 ? "120,88,44" : "232,206,150"},${0.18 + r() * 0.12})`; g.fillRect(0, y, 1024, 3); }
  for (let x = 0; x < 1024; x += 6) { g.fillStyle = `rgba(${r() < 0.5 ? "110,80,40" : "236,212,160"},${0.14 + r() * 0.1})`; g.fillRect(x, 0, 3, 1024); }
  for (let i = 0; i < 70; i++) { const x = 80 + r() * 864, y = r() * 1024, rr = 20 + r() * 70; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(110,76,36,0.22)"); gr.addColorStop(1, "rgba(110,76,36,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  g.save(); g.translate(512, 520); g.globalAlpha = 0.8;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 92px ${FONT}`; g.fillStyle = "#a3282a"; g.fillText("IOWA", 0, -190);
  g.save(); g.rotate(-0.5); g.fillStyle = "#2f5aa0"; // ear-of-corn stencil
  g.beginPath(); g.ellipse(0, 0, 54, 140, 0, 0, TAU); g.fill();
  g.fillStyle = "#c9a86e"; for (let ky = -110; ky <= 110; ky += 30) for (let kx = -30; kx <= 30; kx += 30) { g.beginPath(); g.arc(kx + (ky % 60 ? 15 : 0), ky, 9, 0, TAU); g.fill(); }
  g.fillStyle = "#3d7a3a"; g.beginPath(); g.moveTo(-10, 120); g.quadraticCurveTo(-110, 60, -80, -80); g.quadraticCurveTo(-40, 40, 0, 140); g.fill();
  g.beginPath(); g.moveTo(10, 120); g.quadraticCurveTo(110, 60, 84, -70); g.quadraticCurveTo(40, 40, 0, 140); g.fill();
  g.restore();
  g.font = `900 70px ${FONT}`; g.fillStyle = "#2f5aa0"; g.fillText("SEED CORN", 0, 200);
  g.font = `800 36px ${FONT}`; g.fillStyle = "#a3282a"; g.fillText("No.1 YELLOW DENT", 0, 262);
  g.restore();
});
const kernelTex = () => ctex("hicKernels", 512, 512, (g, r) => {
  g.fillStyle = "#b87a12"; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 26) for (let x = -22; x < 512; x += 22) {
    const ox = (y / 26) % 2 ? 11 : 0, c = ["#ffd23a", "#f6c21e", "#ffdc56", "#efb414"][Math.floor(r() * 4)];
    g.fillStyle = c; g.beginPath(); g.ellipse(x + ox + 11, y + 13, 9.5, 11.5, 0, 0, TAU); g.fill();
    g.fillStyle = "rgba(255,250,210,0.75)"; g.beginPath(); g.ellipse(x + ox + 8, y + 9, 3, 4, 0, 0, TAU); g.fill();
  }
});
const huskTex = () => ctex("hicHusk", 256, 256, (g, r) => {
  g.fillStyle = "#d8c27a"; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 5) { g.fillStyle = `rgba(${r() < 0.5 ? "150,130,60" : "240,226,160"},0.4)`; g.fillRect(x, 0, 2, 256); }
});
/** dial face: cream enamel, 0..500 LBS over +-2.6 rad (clockwise from 12), red 50s, maker's name (fictional) */
const dialTex = () => ctex("hicDialFace", 1024, 1024, (g) => {
  const c = 512, R = 500;
  const gr = g.createRadialGradient(c - 120, c - 160, 40, c, c, R);
  gr.addColorStop(0, "#fffaf0"); gr.addColorStop(0.8, "#f3e6c8"); gr.addColorStop(1, "#d9c49a");
  g.fillStyle = "#2c1c10"; g.fillRect(0, 0, 1024, 1024);
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
  g.strokeStyle = "#3a2614"; g.lineWidth = 6; g.beginPath(); g.arc(c, c, R - 40, -Math.PI / 2 - 2.6, -Math.PI / 2 + 2.6); g.stroke();
  for (let v = 0; v <= 500; v += 5) {
    const a = -2.6 + (5.2 * v) / 500, sx = Math.sin(a), sy = -Math.cos(a);
    const major = v % 50 === 0, mid = v % 10 === 0;
    const r0 = R - 40, r1 = r0 - (major ? 70 : mid ? 40 : 22);
    g.strokeStyle = major ? "#b0161c" : "#2a1a0c"; g.lineWidth = major ? 12 : mid ? 6 : 3;
    g.beginPath(); g.moveTo(c + sx * r0, c + sy * r0); g.lineTo(c + sx * r1, c + sy * r1); g.stroke();
    if (v % 100 === 0) { g.font = `900 64px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#2a1a0c"; g.fillText(String(v), c + sx * (r1 - 62), c + sy * (r1 - 62)); }
  }
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `900 120px ${FONT}`; g.fillStyle = "#b0161c"; g.fillText("LBS", c, c + 140);
  g.font = `900 52px ${FONT}`; g.fillStyle = "#2a1a0c"; g.fillText("PRAIRIE KING", c, c - 200);
  g.font = `700 30px ${FONT}`; g.fillText("HOG & STOCK SCALE", c, c - 150);
  g.font = `italic 700 26px ${FONT}`; g.fillText("Guaranteed Honest Weight", c, c + 214);
  const vg = g.createRadialGradient(c, c, R * 0.7, c, c, R); // aged glass edge
  vg.addColorStop(0, "rgba(90,60,20,0)"); vg.addColorStop(1, "rgba(90,60,20,0.25)");
  g.fillStyle = vg; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
});
const columnTex = () => ctex("hicColumn", 256, 512, (g) => {
  g.fillStyle = "#2d5a3c"; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#d9b04a"; for (const y of [30, 40, 470, 480]) g.fillRect(0, y, 256, 4);
  g.strokeStyle = "#d9b04a"; g.lineWidth = 4; g.strokeRect(70, 90, 116, 340);
  g.fillStyle = "rgba(0,0,0,0.12)"; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 10, 512);
});

// ============================== bubble shader (hic puffs) ==============================
const bubbleMat = () => new THREE.ShaderMaterial({
  uniforms: { uTint: { value: new THREE.Color(1, 1, 1) } },
  vertexShader: `attribute float aA; varying float vA; varying vec3 vN; varying vec3 vV; varying vec3 vC;
    void main(){ vA = aA; vC = vec3(1.0);
      #ifdef USE_INSTANCING_COLOR
        vC = instanceColor;
      #endif
      mat4 mm = modelMatrix * instanceMatrix; vec4 w = mm * vec4(position, 1.0);
      vN = normalize(mat3(viewMatrix) * normalize(mat3(mm) * normal)); vec4 v = viewMatrix * w; vV = normalize(-v.xyz);
      gl_Position = projectionMatrix * v; }`,
  fragmentShader: `uniform vec3 uTint; varying float vA; varying vec3 vN; varying vec3 vV; varying vec3 vC;
    void main(){ vec3 n = normalize(vN); float f = 1.0 - abs(dot(n, vV));
      float rim = pow(f, 2.2);
      vec3 ir = mix(vec3(0.55, 0.95, 1.0), vec3(1.0, 0.6, 0.95), smoothstep(0.2, 0.9, f + 0.25 * n.x));
      ir = mix(ir, vec3(1.0, 0.95, 0.55), smoothstep(0.55, 1.0, f) * 0.6 * (0.5 + 0.5 * n.y));
      float sp = pow(max(dot(n, normalize(vec3(-0.5, 0.65, 0.6))), 0.0), 40.0);
      float sp2 = pow(max(dot(n, normalize(vec3(0.45, -0.5, 0.7))), 0.0), 18.0);
      vec3 col = ir * uTint * vC * (0.85 + 0.6 * rim) + vec3(1.6) * sp + vec3(0.6) * sp2;
      float a = clamp(0.1 + 0.85 * rim + sp + 0.4 * sp2, 0.0, 1.0) * vA;
      gl_FragColor = vec4(col, a); }`,
  transparent: true, depthWrite: false, fog: false,
});

// ============================== geometry builders ==============================
const canGeo = () => {
  const s = CAN_SCALE, R0 = CAN_R, Y0 = -CAN_H / 2;
  const body = new THREE.CylinderGeometry(R0, R0, 0.094, 56, 1, true).translate(0, Y0 + 0.059, 0);
  const top = lathe([[R0, 0.106], [0.031, 0.114], [0.0275, 0.119], [0.0285, 0.1215], [0.0276, 0.1222], [0.0255, 0.1195], [0.001, 0.1195]], 56).translate(0, Y0, 0);
  const bot = lathe([[0.001, 0.005], [0.02, 0.0045], [0.025, 0.0], [0.029, 0.0025], [R0, 0.012]], 56).translate(0, Y0, 0);
  const metal = mergeGeometries([strip(top), strip(bot)], false);
  // stay-on ring-pull (lifted a little: the can is open) + rivet; the opening is on the -z side, the ring on +z
  const ring = new THREE.TorusGeometry(0.0075, 0.0019, 8, 24).scale(1, 1.35, 1).rotateX(-Math.PI / 2 + 0.25).translate(0, Y0 + 0.1222, 0.008);
  const rivet = new THREE.CylinderGeometry(0.0028, 0.0028, 0.0022, 12).translate(0, Y0 + 0.1205, 0);
  const tab = mergeGeometries([strip(ring), strip(rivet)], false);
  // the opening: a dark tear-drop 1 mm above the lid (no coplanar faces)
  const sh = new THREE.Shape(); sh.moveTo(0, 0.0045); sh.quadraticCurveTo(0.009, 0.006, 0.0085, 0.013); sh.quadraticCurveTo(0, 0.0185, -0.0085, 0.013); sh.quadraticCurveTo(-0.009, 0.006, 0, 0.0045);
  const hole = new THREE.ShapeGeometry(sh, 6).rotateX(-Math.PI / 2).translate(0, Y0 + 0.1203, 0);
  for (const g of [body, metal, tab, hole]) g.scale(s, s, s);
  return { body, metal, tab, hole };
};
/** lumpy burlap sack (lathe, flattened front-back, uv.y = height), height ~0.72 m, tied neck + tuft */
const sackGeo = (seed: number, open = false) => {
  const r = rng(seed);
  const pts: [number, number][] = open
    ? [[0.001, 0], [0.15, 0.004], [0.225, 0.05], [0.245, 0.16], [0.236, 0.3], [0.222, 0.4], [0.232, 0.43], [0.24, 0.45], [0.225, 0.465], [0.2, 0.44]]
    : [[0.001, 0], [0.16, 0.004], [0.238, 0.055], [0.255, 0.17], [0.243, 0.32], [0.205, 0.44], [0.13, 0.53], [0.07, 0.57], [0.052, 0.6], [0.062, 0.62], [0.085, 0.665], [0.07, 0.7], [0.035, 0.715], [0.001, 0.718]];
  const g = lathe(pts, 40);
  const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute;
  const ph = [r() * TAU, r() * TAU, r() * TAU];
  const H = open ? 0.465 : 0.718;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), hy = y / H;
    const lump = 1 + 0.07 * Math.sin(a * 3 + ph[0] + hy * 4) + 0.05 * Math.sin(a * 5 + ph[1] - hy * 7) + 0.04 * Math.sin(hy * 11 + ph[2]);
    const slump = 1 + 0.12 * Math.max(0, 0.35 - hy); // sags out at the bottom
    x *= lump * slump * 1.08; z *= lump * slump * 0.8;
    y += 0.02 * Math.sin(a * 2 + ph[0]) * hy;
    p.setXYZ(i, x, Math.max(0, y), z); uv.setY(i, 0.08 + 0.84 * Math.min(1, y / 0.62));
  }
  g.computeVertexNormals();
  return g;
};
const cobGeo = () => lathe([[0.001, -0.11], [0.014, -0.106], [0.024, -0.09], [0.029, -0.04], [0.028, 0.04], [0.022, 0.09], [0.012, 0.11], [0.001, 0.115]], 20);

// ============================== props ==============================
type Drop = { te: number; life: number; v: V3; r: number; spray: number };
type Bub = { hic: number; te: number; life: number; v: V3; r: number; ph: number };
const MAX_DROPS = 160, MAX_BUBS = 90, MAX_SPARK = 24;

export class Props {
  root = new THREE.Group();
  // can
  private can = new THREE.Group(); private canInner = new THREE.Group();
  private glints: THREE.Sprite[] = [];
  private foam: THREE.InstancedMesh; private drops: THREE.InstancedMesh; private fizz: THREE.InstancedMesh; private mist: THREE.Sprite[] = [];
  private dropDefs: Drop[] = [];
  // scale + sacks
  private farm = new THREE.Group(); private needle = new THREE.Group(); private dialGlint: THREE.Sprite; private extra: THREE.Group[] = [];
  // hic puffs
  private bubbles: THREE.InstancedMesh; private bubA: THREE.InstancedBufferAttribute; private bubDefs: Bub[] = [];
  private rings: THREE.Sprite[] = []; private sparks: THREE.Sprite[] = [];
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private sv = new THREE.Vector3(); private pv = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0); private dv = new THREE.Vector3(); private eu = new THREE.Euler(); private col = new THREE.Color();

  constructor() {
    const R = this.root;
    // ---------------- the can ----------------
    const G = canGeo();
    const body = solid(new THREE.Mesh(G.body, phong("#ffffff", canTex(), "#d8ffd0", 55, 0.22)));
    const metal = solid(new THREE.Mesh(G.metal, phong("#e8ecf2", metalTex(), "#ffffff", 90, 0.2)));
    const tab = solid(new THREE.Mesh(G.tab, phong("#d9dde3", null, "#ffffff", 80)));
    const hole = new THREE.Mesh(G.hole, new THREE.MeshBasicMaterial({ color: "#1a1a14" })); hole.frustumCulled = false;
    this.canInner.add(body, metal, tab, hole);
    for (let j = 0; j < 8; j++) { // condensation glints
      const s = noink(new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(2.4, 2.5, 2.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })), 16);
      const a = (j / 8) * TAU + 0.4, y = (-0.04 + (((j * 37) % 9) / 9) * 0.08) * CAN_SCALE;
      s.position.set(Math.sin(a) * (CAN_R * CAN_SCALE + 0.0015), y, Math.cos(a) * (CAN_R * CAN_SCALE + 0.0015));
      this.canInner.add(s); this.glints.push(s);
    }
    this.can.add(this.canInner); this.can.visible = false; R.add(this.can);
    this.foam = solid(new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 2), twoTone(new THREE.MeshLambertMaterial({ color: "#fbfff0", emissive: new THREE.Color(0.42, 0.44, 0.38) })), 14)); // inked cartoon foam blobs
    this.foam.count = 0; R.add(this.foam);
    this.drops = noink(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 1.25, 0.55), fog: false }), MAX_DROPS), 14);
    this.drops.count = 0; R.add(this.drops);
    this.fizz = noink(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.2), fog: false }), 16), 14);
    this.fizz.count = 0; R.add(this.fizz);
    for (let i = 0; i < 4; i++) {
      const m = noink(new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.1, 1.15, 1.05), transparent: true, depthWrite: false, fog: false })), 13);
      m.visible = false; R.add(m); this.mist.push(m);
    }
    SPRAYS.forEach(([ts, pw], si) => {
      const r = rng(41 + si * 13), big = pw >= 1, n = big ? 90 : Math.round(36 * pw);
      for (let i = 0; i < n; i++) {
        const te = ts + (big ? 0.42 : 0.12) * Math.pow(r(), 1.6);
        const sp = (big ? 1.3 + 1.6 * r() : 0.6 + 0.7 * r()) * (1 - (0.35 * (te - ts)) / 0.42);
        this.dropDefs.push({ te, life: (big ? 0.5 : 0.35) + 0.35 * r(), v: [(r() - 0.5) * 0.9, (r() - 0.5) * 0.9, sp], r: (big ? 0.0032 : 0.0025) + 0.0055 * r() * r(), spray: si });
      }
    });
    // ---------------- hog-scale dial ----------------
    {
      const D = new THREE.Group(), col = lamb("#ffffff", columnTex()), brass = phong("#d6a540", null, "#fff0c0", 60), iron = lamb("#284e35");
      D.add(solid(new THREE.Mesh(mergeGeometries([strip(new THREE.BoxGeometry(0.2, 0.06, 0.2).translate(0, 0.03, 0)), strip(new THREE.BoxGeometry(0.15, 0.05, 0.15).translate(0, 0.085, 0)), strip(new THREE.CylinderGeometry(0.06, 0.045, 0.07, 20).translate(0, 0.985, -0.02))], false), iron)));
      D.add(solid(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.05, 0.86, 20, 1, true).translate(0, 0.54, 0), col)));
      D.add(solid(new THREE.Mesh(mergeGeometries([0.12, 0.5, 0.95].map((y) => strip(new THREE.TorusGeometry(y > 0.9 ? 0.044 : 0.054, 0.011, 8, 24).rotateX(Math.PI / 2).translate(0, y, 0))), false), brass)));
      const head = new THREE.Group(); head.position.set(SCALE_DIAL[0] - SCALE_DIAL_BASE[0], SCALE_DIAL[1] - SCALE_DIAL_BASE[1], SCALE_DIAL[2] - SCALE_DIAL_BASE[2]);
      const Rd = SCALE_DIAL_R;
      // round cast-iron case (lathe around z), brass bezel, cream face, finial on top
      head.add(solid(new THREE.Mesh(lathe([[0.001, -0.07], [Rd * 0.85, -0.07], [Rd + 0.03, -0.045], [Rd + 0.035, 0.0], [Rd + 0.02, 0.012], [Rd + 0.005, 0.012]], 48).rotateX(Math.PI / 2), iron)));
      head.add(solid(new THREE.Mesh(new THREE.TorusGeometry(Rd + 0.012, 0.016, 12, 64).translate(0, 0, 0.018), brass)));
      head.add(solid(new THREE.Mesh(new THREE.CircleGeometry(Rd + 0.004, 64).translate(0, 0, 0.006), lamb("#ffffff", dialTex()))));
      head.add(solid(new THREE.Mesh(lathe([[0.001, 0], [0.03, 0.005], [0.022, 0.03], [0.01, 0.05], [0.018, 0.07], [0.001, 0.09]], 16).translate(0, Rd + 0.025, -0.03), brass)));
      // needle: black pointer + red tip + counterweight tail, brass hub, in front of the face
      const ns = new THREE.Shape(); ns.moveTo(-0.007, -0.045); ns.lineTo(-0.0035, Rd * 0.8); ns.lineTo(0, Rd * 0.9); ns.lineTo(0.0035, Rd * 0.8); ns.lineTo(0.007, -0.045); ns.lineTo(0.016, -0.06); ns.lineTo(0, -0.075); ns.lineTo(-0.016, -0.06); ns.closePath();
      this.needle.add(solid(new THREE.Mesh(new THREE.ExtrudeGeometry(ns, { depth: 0.004, bevelEnabled: false }), lamb("#1c1410"))));
      this.needle.add(solid(new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 10).translate(0, Rd * 0.82, 0.002), lamb("#d0181c"))));
      this.needle.position.z = 0.011;
      head.add(this.needle, solid(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.012, 20).rotateX(Math.PI / 2).translate(0, 0, 0.012), brass)));
      this.dialGlint = noink(new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(0.55, 0.48, 0.36), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })), 16);
      this.dialGlint.position.set(-Rd * 0.42, Rd * 0.45, 0.035); this.dialGlint.scale.set(Rd * 0.7, Rd * 0.5, 1);
      head.add(this.dialGlint);
      head.rotation.set(-0.06, SCALE_DIAL_YAW, 0);
      D.add(head); D.position.set(...SCALE_DIAL_BASE);
      this.farm.add(D);
    }
    // ---------------- corn sacks (FARM-relative geometry, one shift at the end) ----------------
    {
      const burlap = lamb("#ffffff", burlapTex()), twine = lamb("#8a6a3a"), kern = lamb("#ffffff", kernelTex()), husk = lamb("#ffffff", huskTex());
      const stat: THREE.BufferGeometry[] = [], ties: THREE.BufferGeometry[] = [], cobs: THREE.BufferGeometry[] = [], leaves: THREE.BufferGeometry[] = [];
      const tie = () => new THREE.TorusGeometry(0.06, 0.012, 8, 24).rotateX(Math.PI / 2).translate(0, 0.598, 0).scale(1.08, 1, 0.8);
      const place = (g: THREE.BufferGeometry, s: (typeof SACKS)[number]) => xf(g, [s[0], s[6], s[1]], [s[4], Math.PI + s[2], s[5]], s[3]);
      SACKS.forEach((s, i) => {
        if (s[7] < 0) { stat.push(strip(place(sackGeo(7 + i * 11), s))); ties.push(strip(place(tie(), s))); return; }
        const gp = new THREE.Group();
        gp.add(solid(new THREE.Mesh(sackGeo(7 + i * 11), burlap)), solid(new THREE.Mesh(tie(), twine)));
        gp.position.set(FARM[0] + s[0], FARM[1] + s[6], FARM[2] + s[1]); gp.rotation.set(s[4], Math.PI + s[2], s[5]);
        gp.userData = { s: s[3], age: s[7] }; gp.visible = false;
        this.extra.push(gp); this.farm.add(gp);
      });
      // the open sack: rolled rim, a heaped kernel fill, three cobs poking out + two on the ground
      const ox = OPEN_SACK[0] - FARM[0], oz = OPEN_SACK[2] - FARM[2];
      const os: (typeof SACKS)[number] = [ox, oz, 0.35, 1, 0, 0, 0, -1];
      stat.push(strip(place(sackGeo(99, true), os)));
      ties.push(strip(place(new THREE.TorusGeometry(0.215, 0.028, 10, 40).rotateX(Math.PI / 2).scale(1.08, 1, 0.8).translate(0, 0.45, 0), os)));
      const fill = new THREE.CircleGeometry(0.205, 32).rotateX(-Math.PI / 2).scale(1.08, 1, 0.8);
      const fp = fill.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), z = fp.getZ(i); fp.setY(i, 0.415 + 0.055 * Math.max(0, 1 - (x * x + z * z) / 0.045)); }
      fill.computeVertexNormals();
      cobs.push(strip(place(fill, os)));
      const cob = (x: number, y: number, z: number, rx: number, rz: number, ry = 0) => cobs.push(strip(xf(cobGeo(), [ox + x, y, oz + z], [rx, ry, rz])));
      cob(-0.05, 0.52, 0.0, 0.2, 0.5); cob(0.06, 0.53, -0.03, -0.15, -0.45); cob(0.0, 0.54, 0.06, 0.55, 0.05);
      cob(0.36, 0.028, 0.12, 0, Math.PI / 2, 0.7); cob(0.3, 0.028, 0.3, 0, Math.PI / 2, -0.3);
      const leaf = (x: number, y: number, z: number, ry: number, rz: number) => leaves.push(strip(xf(new THREE.ConeGeometry(0.032, 0.16, 6, 1, true, 0, Math.PI).translate(0, -0.08, 0).scale(1, 1, 0.5), [ox + x, y, oz + z], [0, ry, rz])));
      leaf(0.27, 0.035, 0.06, 0.7 + Math.PI / 2, 1.25); leaf(0.4, 0.035, 0.33, -0.3 - Math.PI / 2, -1.25);
      for (const [gs, m] of [[stat, burlap], [ties, twine], [cobs, kern], [leaves, husk]] as [THREE.BufferGeometry[], THREE.Material][])
        this.farm.add(solid(new THREE.Mesh(mergeGeometries(gs, false).translate(FARM[0], FARM[1], FARM[2]), m)));
    }
    this.farm.visible = false; R.add(this.farm);
    // ---------------- hic puffs ----------------
    this.bubbles = noink(new THREE.InstancedMesh(new THREE.SphereGeometry(1, 24, 16), bubbleMat(), MAX_BUBS), 18);
    this.bubA = new THREE.InstancedBufferAttribute(new Float32Array(MAX_BUBS), 1); this.bubA.setUsage(THREE.DynamicDrawUsage);
    this.bubbles.geometry.setAttribute("aA", this.bubA);
    this.bubbles.setColorAt(0, new THREE.Color(1, 1, 1));
    this.bubbles.count = 0; R.add(this.bubbles);
    HICS.forEach(([th, who, size], hi) => {
      const r = rng(300 + hi * 17), giant = size >= 1 && who === "osborne", n = Math.round(5 + 8 * size + (giant ? 6 : 0));
      for (let i = 0; i < n; i++) {
        const side = r() < 0.5 ? -1 : 1, a = side * (0.25 + 1.0 * r()), up = -0.1 + 0.9 * r();
        const sp = (0.55 + 0.7 * r()) * (0.75 + 0.45 * size) * (giant ? 1.35 : 1);
        this.bubDefs.push({ hic: hi, te: th + 0.012 * i + 0.03 * r(), life: 0.7 + 0.65 * r(), v: [Math.sin(a) * sp, up * sp * 0.7, Math.cos(a) * sp * 0.8], r: (0.012 + 0.03 * r() * r()) * (0.7 + 0.5 * size), ph: r() * TAU });
      }
      if (size >= 1) this.bubDefs.push({ hic: hi, te: th + 0.05, life: 1.5, v: [0.12, 0.35, 0.5], r: giant ? 0.1 : 0.07, ph: 1 }); // the one big bubble
    });
    for (let i = 0; i < 3; i++) { const s = noink(new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex(), color: new THREE.Color(1.15, 1.2, 1.25), transparent: true, depthWrite: false, fog: false })), 17); s.visible = false; R.add(s); this.rings.push(s); }
    for (let i = 0; i < MAX_SPARK; i++) { const s = noink(new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(2.6, 2.6, 2.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })), 19); s.visible = false; R.add(s); this.sparks.push(s); }
    // ---------------- debug stand-ins (stills only) ----------------
    if (DEBUG_SET) {
      const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => R.add(solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, d).translate(x, y, z), lamb(c))));
      box(8, 0.02, 8, 0, -0.011, 0, "#c8b090"); box(3, 0.92, 0.6, 0, 0.46, -0.6, "#e8e0d0"); box(6, 3, 0.1, 0, 1.5, -1.4, "#f4d8a8");
      box(10, 0.02, 10, FARM[0], -0.011, FARM[2], "#c8a868"); box(1.2, 0.16, 0.9, FARM[0] + 0.8, 0.08, FARM[2] - 0.3, "#8a6a48"); box(8, 4, 0.2, FARM[0], 2, FARM[2] - 2.2, "#b03028");
    }
  }

  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    let p: V3 | null = null, d = 1.0;
    if (id === 1 || id === 2 || id === 4) { p = canPose(id, t).pos; p = [p[0] - 0.12, p[1] + 0.12, p[2]]; d = 1.1; }
    else if (id === 5) { if (t < 36) { p = [SCALE_DIAL[0] - 0.1, SCALE_DIAL[1] - 0.15, SCALE_DIAL[2]]; d = 1.3; } else { p = add(FARM, -1.0, 0.45, -0.5); d = 2.2; } }
    if (!p) return;
    cam.position.set(p[0] + 0.25, p[1] + 0.15, p[2] + d); cam.lookAt(p[0], p[1], p[2]); cam.fov = 38; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    this.updateCan(id, t, cam);
    this.updateFarm(id, t);
    this.updatePuffs(id, t);
  }

  // ---------------- can + fizz ----------------
  private updateCan(id: number, t: number, cam: THREE.Camera) {
    const q = canPose(id, t), on = q.show > 0.002;
    this.can.visible = on;
    let nf = 0, nd = 0, nz = 0;
    for (const m of this.mist) m.visible = false;
    if (on) {
      this.can.position.set(...q.pos); this.can.rotation.set(q.lean, 0, q.tilt);
      this.can.scale.setScalar(0.6 + 0.4 * q.show);
      this.can.updateMatrixWorld();
      // the logo faces the lens (a little off-axis so the can reads round)
      const dx = cam.position.x - q.pos[0], dz = cam.position.z - q.pos[2];
      this.canInner.rotation.y = Math.atan2(-dz, dx) + 0.35;
      this.glints.forEach((s, j) => {
        const a = Math.pow(Math.max(0, Math.sin(TAU * (t * 0.45 + j * 0.37))), 10);
        s.visible = a > 0.01; (s.material as THREE.SpriteMaterial).opacity = a; s.scale.setScalar((0.008 + 0.016 * a) * CAN_SCALE);
      });
      const top = canTop(q), ax = canAxis(q);
      // foam crown: sum of spray envelopes
      let foam = 0;
      for (const [ts, pw] of SPRAYS) {
        if (beanShot(ts) !== id) continue;
        const d = t - ts;
        if (d < 0 || d > 1.6) continue;
        foam += Math.min(1, pw * 1.4) * smooth(d / 0.06) * (1 - smooth((d - 0.35) / (pw >= 1 ? 1.1 : 0.5)));
      }
      foam = Math.min(1.2, foam) * q.show;
      if (foam > 0.01) {
        const fr = rng(5);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU + fr() * 0.4, rr = (i < 5 ? 0.008 : 0.02) * CAN_SCALE, hgt = (i < 5 ? 0.016 : 0.004) * CAN_SCALE;
          const s = (0.008 + 0.006 * fr()) * CAN_SCALE * foam * (0.85 + 0.15 * Math.sin(t * 18 + i));
          this.pv.set(Math.cos(a) * rr * (1 + 0.3 * foam), HH * 0.98 + hgt * foam - 0.004, Math.sin(a) * rr * (1 + 0.3 * foam)).applyMatrix4(this.can.matrixWorld);
          this.m4.compose(this.pv, this.q.identity(), this.sv.setScalar(s * 1.25)); this.foam.setMatrixAt(nf++, this.m4);
        }
        this.mist.forEach((m, i) => {
          const u = clamp01(foam) * (0.6 + 0.4 * Math.sin(i * 2.1 + t * 3)), mat = m.material as THREE.SpriteMaterial, k = 0.03 + 0.03 * i;
          m.visible = u > 0.02;
          m.position.set(top[0] + ax[0] * k + 0.02 * Math.sin(i * 1.7), top[1] + ax[1] * k + 0.015 * i, top[2] + ax[2] * k + 0.01);
          m.scale.setScalar(0.04 + 0.035 * i * u); mat.opacity = 0.32 * u;
        });
      }
      // gentle fizz specks rising out of the opening (more when lifted on "fizzy")
      const lifted = id === 4 ? liftAt(t) : 0, nF = Math.round(6 + 10 * lifted);
      for (let i = 0; i < nF; i++) {
        const u = (t * (0.9 + 0.13 * (i % 5)) + i * 0.618) % 1, a = i * 2.4;
        const r = 0.0025 * CAN_SCALE * (1 + lifted) * Math.sin(Math.PI * u) * q.show;
        if (r <= 0.0002) continue;
        this.pv.set(top[0] + 0.012 * Math.cos(a) * CAN_SCALE + 0.004 * Math.sin(u * 12 + i), top[1] + 0.005 + u * (0.05 + 0.06 * lifted), top[2] + 0.012 * Math.sin(a) * CAN_SCALE);
        this.m4.compose(this.pv, this.q.identity(), this.sv.setScalar(r)); this.fizz.setMatrixAt(nz++, this.m4);
      }
    }
    // spray droplets: free particles emitted from the opening at their own emission time (pure in t)
    const g = -6.5;
    for (const d of this.dropDefs) {
      if (nd >= MAX_DROPS || beanShot(SPRAYS[d.spray][0]) !== id) continue;
      const tau = t - d.te;
      if (tau < 0 || tau > d.life) continue;
      const qe = canPose(id, d.te);
      if (qe.show < 0.5) continue;
      const o = canTop(qe), ax = canAxis(qe);
      // direction: the can axis blended with up + toward the lens, spread by the drop's own random offset
      const bx = ax[0] * 0.8 + d.v[0], by = ax[1] * 0.8 + 0.75 + d.v[1], bz = ax[2] * 0.8 + 0.3 + d.v[0] * 0.3;
      const nl = Math.hypot(bx, by, bz) || 1, sp = d.v[2];
      const vx = (bx / nl) * sp, vy = (by / nl) * sp, vz = (bz / nl) * sp;
      const life = tau / d.life, s = d.r * smooth(tau / 0.03) * (1 - smooth((life - 0.6) / 0.4));
      if (s <= 0.0003) continue;
      this.pv.set(o[0] + vx * tau, o[1] + vy * tau + 0.5 * g * tau * tau, o[2] + vz * tau);
      const cvy = vy + g * tau, cs = Math.hypot(vx, cvy, vz) || 1;
      this.q.setFromUnitVectors(this.up, this.dv.set(vx / cs, cvy / cs, vz / cs));
      this.m4.compose(this.pv, this.q, this.sv.set(s, s * (1 + 0.9 * Math.min(cs, 2.5)), s)); this.drops.setMatrixAt(nd++, this.m4);
    }
    this.foam.count = nf; this.drops.count = nd; this.fizz.count = nz;
    this.foam.instanceMatrix.needsUpdate = this.drops.instanceMatrix.needsUpdate = this.fizz.instanceMatrix.needsUpdate = true;
  }

  // ---------------- farm: dial + sacks ----------------
  private updateFarm(id: number, t: number) {
    const on = id === 5;
    this.farm.visible = on;
    if (!on) return;
    this.needle.rotation.z = -dialAt(id, t).angle; // clockwise on screen
    (this.dialGlint.material as THREE.SpriteMaterial).opacity = 0.7 + 0.3 * Math.sin(t * 1.3);
    const age = osborneAt(id, t).age;
    for (const gp of this.extra) {
      const u = glide((age - gp.userData.age) / 0.07), s = gp.userData.s as number;
      gp.visible = u > 0.002;
      if (gp.visible) gp.scale.set(s * (0.3 + 0.7 * u), s * u * (1 + 0.12 * Math.sin(Math.PI * u)), s * (0.3 + 0.7 * u));
    }
  }

  // ---------------- hic puffs ----------------
  private hicShot(th: number, who: string) { return who === "osborne" ? 5 : beanShot(th); }
  private updatePuffs(id: number, t: number) {
    const farm = id === 5;
    (this.bubbles.material as THREE.ShaderMaterial).uniforms.uTint.value.setRGB(farm ? 1.15 : 1.0, farm ? 1.02 : 1.0, farm ? 0.82 : 1.05);
    let nb = 0, ns = 0, nr = 0;
    for (const s of this.sparks) s.visible = false;
    for (const s of this.rings) s.visible = false;
    for (const [th, who, size] of HICS) { // soft air rings
      if (this.hicShot(th, who) !== id || nr >= this.rings.length) continue;
      const d = t - th;
      if (d < 0 || d > 0.4) continue;
      const u = d / 0.4, m = hicMouth(id, th, who), ring = this.rings[nr++], mat = ring.material as THREE.SpriteMaterial;
      ring.visible = true; ring.position.set(m[0] + 0.02, m[1] + 0.01, m[2] + 0.08 + 0.1 * u);
      ring.scale.setScalar((0.06 + 0.32 * Math.sqrt(u)) * (0.6 + 0.6 * size));
      mat.opacity = 0.65 * smooth(u / 0.15) * (1 - smooth(u)); mat.rotation = 0.3 * u;
    }
    for (const b of this.bubDefs) {
      const [th, who] = HICS[b.hic];
      if (nb >= MAX_BUBS || this.hicShot(th, who) !== id) continue;
      const tau = t - b.te;
      if (tau < 0 || tau > b.life) continue;
      const m = hicMouth(id, b.te, who), k = 3.2, e = (1 - Math.exp(-k * tau)) / k;
      const x = m[0] + b.v[0] * e + 0.012 * Math.sin(tau * 5 + b.ph);
      const y = m[1] + b.v[1] * e + 0.09 * tau * tau + 0.008 * Math.sin(tau * 7 + b.ph * 2);
      const z = m[2] + 0.05 + b.v[2] * e;
      const life = tau / b.life, pu = smooth((life - 0.9) / 0.1);
      const grow = 1 - Math.pow(1 - clamp01(tau / 0.12), 3);
      const r = b.r * grow * (1 + 0.35 * pu) * (1 + 0.06 * Math.sin(tau * 13 + b.ph));
      const a = (1 - pu) * smooth(tau / 0.05);
      if (life > 0.9 && ns < MAX_SPARK) this.spark(ns++, x, y, z, b.r, pu);
      if (r < 0.0005 || a < 0.01) continue;
      const wq = 0.07 * Math.sin(tau * 11 + b.ph) * (1 - life); // gentle squash/stretch wobble
      this.q.setFromEuler(this.eu.set(0, 0, b.ph));
      this.m4.compose(this.pv.set(x, y, z), this.q, this.sv.set(r * (1 + wq), r * (1 - wq), r)); this.bubbles.setMatrixAt(nb, this.m4);
      this.bubA.setX(nb, a); this.bubbles.setColorAt(nb, this.col.setHSL((b.ph / TAU) * 0.15 + 0.5, 0.25, 0.92));
      nb++;
    }
    this.bubbles.count = nb; this.bubbles.instanceMatrix.needsUpdate = true; this.bubA.needsUpdate = true;
    if (this.bubbles.instanceColor) this.bubbles.instanceColor.needsUpdate = true;
  }
  private spark(i: number, x: number, y: number, z: number, r: number, u: number) {
    const s = this.sparks[i], a = Math.sin(Math.PI * clamp01(u));
    s.visible = a > 0.02; s.position.set(x, y, z + 0.01); s.scale.setScalar(r * 2.6 * (0.5 + u)); (s.material as THREE.SpriteMaterial).opacity = a;
  }
}
