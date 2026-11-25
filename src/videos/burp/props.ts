// OWNER: props agent. See /home/user/lookmatch/BURP_BRIEF.md
// Hard props of "Astronauts Can't Burp" (all deterministic in (id, t); never frustum culled):
//   1. COLA CANS: our own fake RED "COLA" can and BLUE "COLA" can (no real logos), with the little 1985-style drinking
//      spout + hinged cap. Shot 4: two hero cans (x7 scale) glide/spin into a warm spotlight cone at ORBIT, with
//      condensation sparkles and a glint on "space". Shots 6-7: three hand cans (crew0 red, crew1 blue, crew2 red) at
//      canPos(); they open with a pssht mist puff on canAt.open and tilt to the mouth on the sip.
//   2. X-RAY STOMACH hologram (stomachAt): a camera-facing glowing cyan stomach (NOINK, HDR glow) drawn live on a canvas.
//      sep=1: big pale GAS pocket on top (with an up arrow) + orange-brown FOOD pool at the bottom (down arrow).
//      sep=0: one bubbly mixed soup (food chunks + gas bubbles everywhere, wobbling). Bubbles animate deterministically.
//      BEAN (shots 2, 3) and Newman (8): beside the chest; crew (6): smaller, X-ray over the belly.
//   3. MENU clipboard (shot 7): a floating space-food menu with a big "COLA" box; the red X is drawn on menuAt.cross.
//   4. Backyard soda (shot 2): a red COLA can in BEAN's hand at canPos(2,t,"bean"), sipped per sodaAt(t).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { STATION, EARTH, MIDDECK, ORBIT, W, LEAD, V3, stomachAt, canAt, menuAt, newmanAt, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: props-only framing for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
function lerp3(a: V3, b: V3, u: number): V3 { return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }

// ============================== public contracts ==============================
export type Who = "bean" | "crew0" | "crew1" | "crew2" | "newman";
/** default character anchors (card origin, world) until cast reports: BEAN floats STATION+(0,1.15,0) (chest +0.15),
 *  sits EARTH+(0,0,0) (chest 0.9), crew MIDDECK+(-0.9|0|0.9,1.1,0) (chest +0.15), Newman STATION+(newmanAt.x,1.2,0) */
export const charPos = (id: number, t: number, who: Who): V3 => {
  if (who === "bean") return id === 2 ? add(EARTH, 0, 0, 0) : add(STATION, 0, 1.15, 0);
  if (who === "newman") return add(STATION, newmanAt(id, t).x, 1.2, 0);
  // centre = crew0 (the PEAK: "Wet." -> "Burps." on the centre face), crew1 left, crew2 right
  return add(MIDDECK, who === "crew0" ? 0 : who === "crew1" ? -0.9 : 0.9, 1.1, 0);
};
/** chest point (world) */
export const chestPos = (id: number, t: number, who: Who): V3 => {
  const p = charPos(id, t, who);
  return id === 2 && who === "bean" ? add(p, 0, 0.55, 0.1) : add(p, 0, 0.15, 0); // seated chest (cast BEAN_SEAT_CHEST)
};
/** stomach hologram height (m) at scale 1; plane aspect 0.8 (w = 0.8 h) */
export const STOMACH_H = 0.56;
/** who shows a stomach in a shot */
export const stomachWho = (id: number): Who[] => (id === 2 || id === 3 ? ["bean"] : id === 6 ? ["crew0", "crew1", "crew2"] : id === 8 ? ["newman"] : []);
/** stomach hologram centre (world) + scale: BEAN 0.55 m to the +x (screen right) of the chest; Newman 0.62 m to -x (trailing);
 *  crew: X-ray over the belly (chest -0.12, 0.2 m in front of the card), scale 0.62. Gentle deterministic bob. */
export const stomachPos = (id: number, t: number, who: Who): { pos: V3; scale: number } => {
  const c = chestPos(id, t, who), bob = 0.012 * Math.sin(t * 1.7 + who.length);
  if (who.startsWith("crew")) return { pos: add(c, 0, -0.12 + bob, 0.2), scale: 0.62 };
  if (who === "newman") return { pos: add(c, -0.62, 0.12 + bob, 0.1), scale: 1 }; // trails behind him (he flies +x, the camera leads)
  return { pos: add(c, 0.55, 0.04 + bob, 0.05), scale: 1 };
};
/** which can each character holds */
export const CAN_OF: Record<string, "red" | "blue"> = { crew0: "red", crew1: "blue", crew2: "red", bean: "red" };
/** can: 0.13 m tall at scale 1; hand cans x1.35 (~0.175 m), orbit hero cans x7 (~0.9 m) */
export const CAN_H = 0.13, CAN_SCALE = 1.35, ORBIT_CAN_SCALE = 7;
/** backyard sip (shot 2): 0 resting on the armrest -> 1 at the mouth (3.45..4.85 s) */
export const sodaAt = (id: number, t: number) => (id === 2 ? smooth((t - 3.45) / 0.35) * (1 - smooth((t - 4.85) / 0.35)) : 0);
/** CAN CENTRE (world) = the grip point for the hand; tilt (rad about z, + = top toward screen left/mouth); sip 0..1.
 *  Crew: rest chest+(0.26,-0.1,0.14) -> mouth chest+(0.1,0.24,0.16), sips staggered (i-1)*0.12 s around canAt.sip.
 *  BEAN backyard: rest EARTH+(0.32,0.62,0.16) -> mouth chest+(0.1,0.26,0.16). */
export const canPos = (id: number, t: number, who: Who): { show: boolean; pos: V3; tilt: number; sip: number } => {
  if (id === 2 && who === "bean") {
    const s = sodaAt(id, t), c = chestPos(id, t, "bean");
    return { show: true, pos: lerp3(add(EARTH, 0.52, 0.5, 0.2), add(c, 0.1, 0.26, 0.16), s), tilt: 1.1 * s, sip: s };
  }
  if ((id === 6 || id === 7) && who.startsWith("crew")) {
    const i = +who.slice(4), c = chestPos(id, t, who), stag = (i - 1) * 0.12;
    const s = id === 6 ? smooth((t - (W.sip - 0.3 + stag)) / 0.3) * (1 - smooth((t - (W.bubbles - 0.2 + stag)) / 0.3)) : 0;
    const bob = 0.01 * Math.sin(t * 2.1 + i * 2);
    return { show: true, pos: lerp3(add(c, 0.26, -0.1 + bob, 0.14), add(c, 0.1, 0.24, 0.16), s), tilt: 1.15 * s, sip: s };
  }
  return { show: false, pos: [0, 0, 0], tilt: 0, sip: 0 };
};
/** orbit hero cans (shot 4): the logo eases round to face the first-pass lens by "space" (22.3 s); glide in from the sides 20.0..21.65 s, then hover + spin in the spotlight at ORBIT+(+-0.42,0,0) */
export const orbitCanPos = (t: number, k: 0 | 1): { pos: V3; spin: number; tilt: number } => {
  const u = glide((t - 20.0) / 1.65), sx = k ? 1 : -1;
  const end: V3 = [sx * 0.42, k ? -0.05 : 0.05, 0], start: V3 = [sx * 4.6, k ? -1.4 : 1.5, -2.0];
  const p = lerp3(start, end, u);
  return { pos: add(ORBIT, p[0], p[1] + 0.04 * Math.sin(t * 1.3 + k * 2), p[2]), spin: Math.atan2(-1 - p[0], 6 - p[2]) - Math.PI / 2 + sx * 4.2 * (1 - glide((t - 20.0) / 2.2)) + 0.2 * Math.sin((t - 22.3) * 1.1 + k), tilt: sx * (0.18 + 0.5 * (1 - u)) + 0.05 * Math.sin(t * 0.9 + k) };
};
/** menu clipboard (shot 7): drifts in from the right to MIDDECK+(0.04,1.25,1.1); 0.34 x 0.46 m, facing +z */
export const menuPose = (id: number, t: number): { show: number; pos: V3; yaw: number; roll: number } => {
  const m = menuAt(id, t), u = glide((t - (W.neither - 0.3)) / 0.9);
  return { show: m.show, pos: add(MIDDECK, 0.04 + 0.9 * (1 - u), 1.25 + 0.015 * Math.sin(t * 1.4), 1.1), yaw: -0.12 - 0.5 * (1 - u), roll: 0.06 * Math.sin(t * 0.8) + 0.25 * (1 - u) };
};

// ============================== textures ==============================
/** our own fake can wraps (two logos around, so a spinning can always shows one) */
const canTex = (kind: "red" | "blue") => ctex("burpCan_" + kind, 1024, 512, (g, r) => {
  const red = kind === "red";
  const gr = g.createLinearGradient(0, 0, 0, 512);
  if (red) { gr.addColorStop(0, "#8e0f17"); gr.addColorStop(0.12, "#e0262e"); gr.addColorStop(0.88, "#e0262e"); gr.addColorStop(1, "#8e0f17"); }
  else { gr.addColorStop(0, "#0d2466"); gr.addColorStop(0.12, "#2457d6"); gr.addColorStop(0.88, "#2457d6"); gr.addColorStop(1, "#0d2466"); }
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  if (red) {
    for (let i = 0; i < 90; i++) { const x = r() * 1024, y = 40 + r() * 440, rr = 3 + r() * r() * 22; g.strokeStyle = "rgba(255,235,220,0.55)"; g.lineWidth = 3; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.stroke(); }
    g.fillStyle = "#ffd23a"; g.fillRect(0, 404, 1024, 16); g.fillRect(0, 92, 1024, 8);
  } else {
    g.save(); g.globalAlpha = 0.35; g.fillStyle = "#cfe0ff";
    for (let x = -600; x < 1100; x += 120) { g.beginPath(); g.moveTo(x, 512); g.lineTo(x + 40, 512); g.lineTo(x + 340, 0); g.lineTo(x + 300, 0); g.fill(); }
    g.restore();
    g.strokeStyle = "#ffd23a"; g.lineWidth = 14; g.beginPath();
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 420 + ((x / 32) % 2 ? -12 : 12));
    g.stroke();
    g.fillStyle = "#e8eef8"; g.fillRect(0, 84, 1024, 10);
  }
  for (const cx of [256, 768]) {
    g.save(); g.translate(cx, 250);
    if (red) {
      g.fillStyle = "#ffd23a"; g.beginPath();
      for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, rr = k % 2 ? 120 : 150; g.lineTo(Math.cos(a) * rr * 1.5, Math.sin(a) * rr * 0.7); }
      g.fill();
    } else { g.fillStyle = "#0d2466"; g.beginPath(); g.ellipse(0, 0, 220, 105, 0, 0, TAU); g.fill(); g.strokeStyle = "#ffd23a"; g.lineWidth = 8; g.stroke(); }
    g.transform(1, 0, red ? -0.22 : -0.1, 1, 0, 0);
    g.font = `900 ${red ? 150 : 140}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = 22; g.strokeStyle = red ? "#7a0a10" : "#081640"; g.strokeText("COLA", 0, 4);
    g.fillStyle = red ? "#ffffff" : "#ffe46a"; g.fillText("COLA", 0, 4);
    g.restore();
    g.font = `800 34px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = red ? "#ffffff" : "#e8eef8";
    g.fillText(red ? "ORIGINAL FIZZ" : "SPACE BLUE", cx, 370);
  }
});
const metalTex = () => ctex("burpCanMetal", 256, 64, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 0);
  gr.addColorStop(0, "#c9ced6"); gr.addColorStop(0.3, "#f4f6fa"); gr.addColorStop(0.55, "#a9b0bb"); gr.addColorStop(0.8, "#e6e9ef"); gr.addColorStop(1, "#c9ced6");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
});
const softTex = () => ctex("burpSoft", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const starTex = () => ctex("burpStar", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 20);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#fff";
  const w = 60, h = 4;
  g.beginPath(); g.moveTo(64 - w, 64); g.quadraticCurveTo(64, 64 - h, 64 + w, 64); g.quadraticCurveTo(64, 64 + h, 64 - w, 64); g.fill();
  g.beginPath(); g.moveTo(64, 64 - w); g.quadraticCurveTo(64 + h, 64, 64, 64 + w); g.quadraticCurveTo(64 - h, 64, 64, 64 - w); g.fill();
});
const puffTex = () => ctex("burpPuff", 256, 256, (g, r) => {
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r() * 50, x = 128 + Math.cos(a) * d, y = 128 + Math.sin(a) * d, rr = 40 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rr);
    gr.addColorStop(0, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  }
});

// ============================== stomach hologram ==============================
const SW = 512, SH = 640;
/** cartoon J-stomach in canvas px: esophagus top-left, fundus dome upper-left, wide bottom, pylorus stub right */
const stomachPath = () => {
  const p = new Path2D();
  p.moveTo(214, 18); p.lineTo(220, 112);
  p.bezierCurveTo(150, 88, 74, 150, 82, 262);
  p.bezierCurveTo(90, 410, 168, 556, 300, 560);
  p.bezierCurveTo(392, 564, 448, 514, 458, 452);
  p.lineTo(494, 424); p.lineTo(470, 394);
  p.bezierCurveTo(424, 428, 336, 410, 306, 312);
  p.bezierCurveTo(290, 246, 284, 166, 272, 112);
  p.lineTo(270, 18);
  p.closePath();
  return p;
};
const LY = 336; // liquid level when separated (canvas px)
type Part = { sx: number; sy: number; mx: number; my: number; r: number; ph: number; w: number };
const glowTex = () => ctex("burpStomachGlow", SW, SH, (g) => {
  const p = stomachPath();
  g.shadowColor = "rgba(90,240,255,1)"; g.shadowBlur = 38; g.strokeStyle = "rgba(120,245,255,0.9)"; g.lineWidth = 16; g.lineJoin = "round";
  g.stroke(p); g.stroke(p);
});
class Stomach {
  cv = document.createElement("canvas"); g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  group = new THREE.Group(); main: THREE.Mesh; glow: THREE.Mesh;
  private path = stomachPath(); private food: Part[] = []; private gas: Part[] = []; private fizz: Part[] = [];
  private last = "";
  constructor(seed: number) {
    this.cv.width = SW; this.cv.height = SH; this.g = this.cv.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const r = rng(seed * 7 + 3), g = this.g, P = this.path;
    const inside = (x: number, y: number, pad: number) => g.isPointInPath(P, x, y) && g.isPointInPath(P, x - pad, y) && g.isPointInPath(P, x + pad, y) && g.isPointInPath(P, x, y - pad) && g.isPointInPath(P, x, y + pad);
    const pick = (y0: number, y1: number, pad: number): [number, number] => {
      for (let k = 0; k < 400; k++) { const x = 90 + r() * 380, y = y0 + r() * (y1 - y0); if (inside(x, y, pad)) return [x, y]; }
      return [250, 440];
    };
    for (let i = 0; i < 15; i++) { const rr = 13 + r() * 13, s = pick(LY + 30, 550, rr + 6), m = pick(120, 550, rr + 6); this.food.push({ sx: s[0], sy: s[1], mx: m[0], my: m[1], r: rr, ph: r() * TAU, w: 0.7 + r() * 0.8 }); }
    for (let i = 0; i < 26; i++) { const rr = 9 + r() * r() * 22, s = pick(118, LY - 26, rr + 4), m = pick(120, 550, rr + 4); this.gas.push({ sx: s[0], sy: s[1], mx: m[0], my: m[1], r: rr, ph: r() * TAU, w: 0.8 + r() * 1.0 }); }
    for (let i = 0; i < 10; i++) { const s = pick(LY + 20, 545, 8); this.fizz.push({ sx: s[0], sy: s[1], mx: 0, my: 0, r: 3 + r() * 4, ph: r(), w: 0.35 + r() * 0.3 }); }
    const geo = new THREE.PlaneGeometry(0.8, 1);
    this.main = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: glowTex(), color: new THREE.Color(1.6, 3.2, 3.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.glow.position.z = -0.002;
    for (const m of [this.main, this.glow]) { m.layers.set(NOINK); m.frustumCulled = false; this.group.add(m); }
    this.main.renderOrder = 21; this.glow.renderOrder = 20;
    this.group.visible = false;
  }
  draw(t: number, sep: number, bub: number) {
    const key = `${t.toFixed(3)}_${sep.toFixed(3)}_${bub.toFixed(3)}`;
    if (key === this.last) return;
    this.last = key;
    const g = this.g, P = this.path;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SW, SH); g.globalAlpha = 1;
    // dark soft backing so the hologram reads on any background (bright backyard included)
    const vg = g.createRadialGradient(285, 330, 40, 285, 330, 300);
    vg.addColorStop(0, "rgba(6,20,40,0.62)"); vg.addColorStop(0.7, "rgba(6,20,40,0.42)"); vg.addColorStop(1, "rgba(6,20,40,0)");
    g.fillStyle = vg; g.fillRect(0, 0, SW, SH);
    g.save(); g.clip(P);
    g.fillStyle = "rgba(40,150,185,0.32)"; g.fillRect(0, 0, SW, SH);
    // mixed soup tint (sep 0)
    if (sep < 0.999) {
      g.fillStyle = `rgba(214,128,52,${0.5 * (1 - sep)})`; g.fillRect(0, 0, SW, SH);
      for (let i = 0; i < 6; i++) {
        const x = 140 + 60 * i + 18 * Math.sin(t * 0.9 + i), y = 200 + ((i * 97) % 300) + 14 * Math.cos(t * 0.7 + i * 2);
        const gr = g.createRadialGradient(x, y, 0, x, y, 90); gr.addColorStop(0, `rgba(176,92,30,${0.45 * (1 - sep)})`); gr.addColorStop(1, "rgba(176,92,30,0)");
        g.fillStyle = gr; g.fillRect(x - 90, y - 90, 180, 180);
      }
    }
    const surf = (x: number) => LY + 5 * Math.sin(x * 0.028 + t * 2.2) + 3 * Math.sin(x * 0.061 - t * 1.3);
    if (sep > 0.001) {
      const gp = g.createLinearGradient(0, 110, 0, LY);
      gp.addColorStop(0, `rgba(235,252,255,${0.6 * sep})`); gp.addColorStop(1, `rgba(170,235,255,${0.38 * sep})`);
      g.fillStyle = gp; g.fillRect(0, 0, SW, LY + 10);
      g.beginPath(); g.moveTo(0, SH); g.lineTo(0, surf(0));
      for (let x = 0; x <= SW; x += 16) g.lineTo(x, surf(x));
      g.lineTo(SW, SH); g.closePath();
      const lp = g.createLinearGradient(0, LY, 0, 560);
      lp.addColorStop(0, `rgba(236,150,62,${sep})`); lp.addColorStop(1, `rgba(150,76,26,${sep})`);
      g.fillStyle = lp; g.fill();
      g.strokeStyle = `rgba(255,226,170,${0.9 * sep})`; g.lineWidth = 6; g.beginPath();
      for (let x = 0; x <= SW; x += 16) { if (x) g.lineTo(x, surf(x)); else g.moveTo(x, surf(x)); }
      g.stroke();
    }
    const wob = 2 + 9 * (1 - sep);
    for (const f of this.food) {
      const x = f.mx + (f.sx - f.mx) * sep + wob * Math.sin(t * f.w + f.ph), y = f.my + (f.sy - f.my) * sep + wob * Math.cos(t * f.w * 0.8 + f.ph * 1.3);
      g.save(); g.translate(x, y); g.rotate(f.ph + t * 0.3 * (1 - sep));
      g.beginPath();
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU, rr = f.r * (0.8 + 0.25 * Math.sin(k * 2.3 + f.ph * 3)); g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr * 0.82); }
      g.closePath(); g.fillStyle = "#b8601f"; g.fill(); g.lineWidth = 3.5; g.strokeStyle = "#5a2a0c"; g.stroke();
      g.fillStyle = "rgba(255,200,130,0.7)"; g.beginPath(); g.arc(-f.r * 0.3, -f.r * 0.3, f.r * 0.22, 0, TAU); g.fill();
      g.restore();
    }
    const n = this.gas.length * (0.25 + 0.75 * clamp01(bub));
    this.gas.forEach((b, i) => {
      const a = clamp01(n - i);
      if (a <= 0) return;
      const x = b.mx + (b.sx - b.mx) * sep + wob * 1.1 * Math.sin(t * b.w * 1.2 + b.ph), y = b.my + (b.sy - b.my) * sep + wob * Math.cos(t * b.w + b.ph * 0.7);
      const rr = b.r * (0.5 + 0.5 * a) * (1 + 0.06 * Math.sin(t * 3 + b.ph));
      g.globalAlpha = a;
      g.fillStyle = "rgba(225,250,255,0.42)"; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
      g.lineWidth = 3.5; g.strokeStyle = "#ffffff"; g.stroke();
      g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.38, rr * 0.22, 0, TAU); g.fill();
      g.globalAlpha = 1;
    });
    if (sep > 0.02) for (const z of this.fizz) {
      const u = (t * z.w + z.ph) % 1, y = z.sy + (LY + 12 - z.sy) * u;
      g.globalAlpha = sep * Math.sin(Math.PI * u); g.strokeStyle = "#fff4dc"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(z.sx + 3 * Math.sin(u * 9 + z.ph * 6), y, z.r, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
    g.fillStyle = "rgba(160,245,255,0.07)";
    for (let y = ((t * 24) % 12) - 12; y < SH; y += 12) g.fillRect(0, y, SW, 4);
    g.restore();
    g.lineJoin = "round"; g.strokeStyle = "#8ff6ff"; g.lineWidth = 11; g.stroke(P);
    g.strokeStyle = "#f2feff"; g.lineWidth = 3.5; g.stroke(P);
    // labels + arrows ("Gas up. Food down.")
    if (sep > 0.02) {
      g.globalAlpha = smooth((sep - 0.25) / 0.6);
      const label = (s: string, x: number, y: number, sz: number) => { g.font = `900 ${sz}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.lineWidth = 10; g.strokeStyle = "#062033"; g.strokeText(s, x, y); g.fillStyle = "#ffffff"; g.fillText(s, x, y); };
      const arrow = (x: number, y: number, dir: number, col: string) => {
        g.save(); g.translate(x, y); g.scale(1, dir);
        g.beginPath(); g.moveTo(0, -34); g.lineTo(24, -6); g.lineTo(9, -6); g.lineTo(9, 30); g.lineTo(-9, 30); g.lineTo(-9, -6); g.lineTo(-24, -6); g.closePath();
        g.lineJoin = "round"; g.lineWidth = 8; g.strokeStyle = "#062033"; g.stroke(); g.fillStyle = col; g.fill(); g.restore();
      };
      label("GAS", 182, 252, 54); arrow(182, 178 - 6 * Math.sin(t * 3), 1, "#8ff6ff");
      label("FOOD", 292, 478, 50); arrow(408, 470 + 5 * Math.sin(t * 3), -1, "#ffb066");
      g.globalAlpha = 1;
    }
    this.tex.needsUpdate = true;
  }
}

// ============================== cans ==============================
const lamb = (col: THREE.ColorRepresentation) => twoTone(new THREE.MeshLambertMaterial({ color: col }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number) => twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const R0 = 0.036, Y0 = -CAN_H / 2;
let canGeo: { body: THREE.BufferGeometry; metal: THREE.BufferGeometry; spout: THREE.BufferGeometry; cap: THREE.BufferGeometry } | null = null;
const getCanGeo = () => {
  if (canGeo) return canGeo;
  const body = new THREE.CylinderGeometry(R0, R0, 0.1, 48, 1, true).translate(0, Y0 + 0.062, 0);
  const lp = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
  const top = lp([[R0, 0.111], [0.033, 0.12], [0.0295, 0.126], [0.0305, 0.129], [0.0295, 0.13], [0.026, 0.127], [0.001, 0.127]]).translate(0, Y0, 0);
  const bot = lp([[0.001, 0.004], [0.022, 0.0035], [0.027, 0.0], [0.031, 0.002], [R0, 0.013]]).translate(0, Y0, 0);
  const metal = mergeGeometries([strip(top), strip(bot)], false);
  // 1985-style drinking spout (short nozzle on a collar) near the rim
  const spout = mergeGeometries([strip(new THREE.CylinderGeometry(0.0075, 0.009, 0.016, 20).translate(0, Y0 + 0.135, 0.012)), strip(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 20).translate(0, Y0 + 0.1285, 0.012))], false);
  // hinged cap, hinge at its -z edge (rotation.x < 0 flips it open)
  const cap = new THREE.CylinderGeometry(0.0095, 0.0095, 0.005, 20).translate(0, 0.0025, 0.0085);
  canGeo = { body, metal, spout, cap };
  return canGeo;
};
class Can {
  group = new THREE.Group(); inner = new THREE.Group(); cap: THREE.Mesh; puff: THREE.Sprite;
  constructor(kind: "red" | "blue", hero: boolean) {
    const G = getCanGeo();
    const body = new THREE.Mesh(G.body, phong("#ffffff", canTex(kind), hero ? "#ffffff" : "#bbbbbb", hero ? 70 : 40));
    const metal = new THREE.Mesh(G.metal, phong("#e8ecf2", metalTex(), "#ffffff", 90));
    const spout = new THREE.Mesh(G.spout, lamb("#f2f2f0"));
    this.cap = new THREE.Mesh(G.cap, lamb(kind === "red" ? "#d42029" : "#1f4fc8"));
    this.cap.position.set(0, Y0 + 0.143, 0.012 - 0.0085);
    for (const m of [body, metal, spout, this.cap]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; this.inner.add(m); }
    this.puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: new THREE.Color(1.1, 1.15, 1.2), transparent: true, depthWrite: false, fog: false }));
    this.puff.layers.set(NOINK); this.puff.frustumCulled = false; this.puff.visible = false; this.puff.renderOrder = 15;
    this.group.add(this.inner, this.puff); this.group.visible = false;
  }
  /** open: 0..1 cap angle; puffT: seconds since opening (<0: none) */
  setOpen(open: number, puffT: number) {
    this.cap.rotation.x = -2.0 * open;
    const on = puffT >= 0 && puffT < 0.9;
    this.puff.visible = on;
    if (on) {
      const u = puffT / 0.9;
      this.puff.position.set(0, Y0 + 0.15 + 0.06 * u, 0.012);
      this.puff.scale.setScalar(0.02 + 0.09 * Math.sqrt(u));
      (this.puff.material as THREE.SpriteMaterial).opacity = 0.9 * smooth(u / 0.08) * (1 - smooth(u));
    }
  }
}

// ============================== props ==============================
export class Props {
  root = new THREE.Group();
  private stomachs: Stomach[] = [];
  private hero: Can[] = []; private hand: Can[] = []; private soda: Can;
  private sparks: THREE.Sprite[][] = [[], []]; private glint: THREE.Sprite[] = [];
  private cone: THREE.Mesh; private pool: THREE.Sprite;
  private menu = new THREE.Group(); private menuCv = document.createElement("canvas"); private menuTex: THREE.CanvasTexture; private menuLast = -1;

  constructor() {
    const R = this.root;
    for (let i = 0; i < 3; i++) { const s = new Stomach(11 + i * 5); this.stomachs.push(s); R.add(s.group); }
    (["red", "blue"] as const).forEach((k, i) => {
      const c = new Can(k, true); c.group.scale.setScalar(ORBIT_CAN_SCALE); this.hero.push(c); R.add(c.group);
      for (let j = 0; j < 7; j++) { // condensation sparkles on the surface
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(3, 3, 3.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
        const a = (j / 7) * TAU + i, y = -0.04 + (((j * 37) % 9) / 9) * 0.085;
        s.position.set(Math.sin(a) * (R0 + 0.001), y, Math.cos(a) * (R0 + 0.001)); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 16;
        c.inner.add(s); this.sparks[i].push(s);
      }
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: new THREE.Color(5, 4.6, 3.8), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      gl.layers.set(NOINK); gl.frustumCulled = false; gl.renderOrder = 17; gl.visible = false; R.add(gl); this.glint.push(gl);
    });
    for (const k of ["red", "blue", "red"] as const) { const c = new Can(k, false); c.group.scale.setScalar(CAN_SCALE); this.hand.push(c); R.add(c.group); }
    this.soda = new Can("red", false); this.soda.group.scale.setScalar(CAN_SCALE); R.add(this.soda.group);
    // spotlight cone + warm pool (shot 4)
    const coneMat = new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color(1.0, 0.78, 0.45) }, k: { value: 0 } },
      vertexShader: "varying vec3 vN; varying vec3 vW; varying float vH; void main(){ vH = uv.y; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vW; varying float vH; void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v)); float a = pow(e, 1.6) * smoothstep(0.0, 0.35, vH) * (0.35 + 0.65 * vH) * k; gl_FragColor = vec4(col * a * 0.32, 1.0); }",
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    this.cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 1.5, 6.5, 48, 1, true), coneMat);
    this.cone.position.set(ORBIT[0], ORBIT[1] + 2.6, ORBIT[2] - 0.3); this.cone.layers.set(NOINK); this.cone.frustumCulled = false; this.cone.renderOrder = 5; this.cone.visible = false;
    this.pool = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(0.55, 0.4, 0.22), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.pool.position.set(ORBIT[0], ORBIT[1], ORBIT[2] - 1.2); this.pool.scale.setScalar(3.6); this.pool.layers.set(NOINK); this.pool.frustumCulled = false; this.pool.renderOrder = 4; this.pool.visible = false;
    R.add(this.cone, this.pool);
    // menu clipboard (shot 7)
    this.menuCv.width = 512; this.menuCv.height = 700;
    this.menuTex = new THREE.CanvasTexture(this.menuCv); this.menuTex.colorSpace = THREE.SRGBColorSpace; this.menuTex.anisotropy = 8;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.012), lamb("#9a6a3c"));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.41), new THREE.MeshBasicMaterial({ map: this.menuTex, color: new THREE.Color(0.92, 0.92, 0.9) }));
    paper.position.set(0, -0.015, 0.0075);
    const clip = new THREE.Mesh(mergeGeometries([strip(new THREE.BoxGeometry(0.12, 0.045, 0.014).translate(0, 0.215, 0.012)), strip(new THREE.CylinderGeometry(0.008, 0.008, 0.09, 12).rotateZ(Math.PI / 2).translate(0, 0.238, 0.016))], false), phong("#cfd5dc", null, "#ffffff", 80));
    for (const m of [board, paper, clip]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; this.menu.add(m); }
    this.menu.visible = false; R.add(this.menu);
  }

  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    let p: V3 | null = null, d = 1.6;
    if (id === 2 || id === 3) { p = stomachPos(id, t, "bean").pos; p = [p[0] - 0.28, p[1] - 0.05, p[2]]; d = 2.6; }
    else if (id === 6 || id === 7) { p = add(MIDDECK, 0, 1.15, 0); d = 3.2; if (id === 7) { p = add(MIDDECK, 0.12, 1.25, 0.6); d = 1.6; } }
    else if (id === 8) { p = stomachPos(id, t, "newman").pos; d = 2.2; }
    if (!p) return;
    cam.position.set(p[0], p[1] + 0.1, p[2] + d); cam.lookAt(p[0], p[1], p[2]); cam.fov = 36; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  private drawMenu(cross: number) {
    const g = this.menuCv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = "#fbf7ea"; g.fillRect(0, 0, 512, 700);
    g.fillStyle = "#24406e"; g.fillRect(0, 0, 512, 96);
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff";
    g.font = `900 46px ${FONT}`; g.fillText("SHUTTLE MENU", 256, 40);
    g.font = `700 22px ${FONT}`; g.fillText("FLIGHT 51-F  ·  DRINKS", 256, 76);
    g.textAlign = "left"; g.font = `700 30px ${FONT}`;
    ["Orange drink", "Lemonade", "Cocoa", "Tea w/ lemon", "Apple cider"].forEach((s, i) => {
      const y = 140 + i * 50; g.fillStyle = "#24314a"; g.fillText(s, 40, y);
      g.strokeStyle = "#2f8a3a"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(430, y); g.lineTo(446, y + 14); g.lineTo(474, y - 16); g.stroke();
      g.strokeStyle = "rgba(36,49,74,0.15)"; g.lineWidth = 2; g.beginPath(); g.moveTo(40, y + 25); g.lineTo(472, y + 25); g.stroke();
    });
    g.strokeStyle = "#24314a"; g.lineWidth = 6; g.strokeRect(34, 410, 444, 230);
    g.textAlign = "center"; g.font = `900 120px ${FONT}`; g.fillStyle = "#24314a"; g.fillText("COLA", 256, 492);
    const can = (x: number, c: string) => { g.fillStyle = c; g.fillRect(x - 26, 560, 52, 64); g.fillStyle = "#c9ced6"; g.fillRect(x - 26, 556, 52, 8); g.fillRect(x - 26, 620, 52, 6); g.fillStyle = "#fff"; g.font = `900 15px ${FONT}`; g.fillText("COLA", x, 592); };
    can(196, "#d8232a"); can(316, "#2457d6");
    if (cross > 0) { // red X, stroke by stroke
      g.strokeStyle = "#e01a1a"; g.lineWidth = 30; g.lineCap = "round";
      const ln = (x0: number, y0: number, x1: number, y1: number, u: number) => { if (u <= 0) return; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u); g.stroke(); };
      ln(60, 420, 452, 632, clamp01(cross / 0.5)); ln(452, 420, 60, 632, clamp01((cross - 0.5) / 0.5));
    }
    this.menuTex.needsUpdate = true;
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const DBG = (globalThis as { __PROPDBG?: boolean }).__PROPDBG !== false && DEBUG_CAM;
    if (DBG) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    // ---- X-ray stomachs ----
    const st = stomachAt(id, t), whos = stomachWho(id);
    this.stomachs.forEach((s, i) => {
      const who = whos[i];
      const show = who ? st.show : 0;
      s.group.visible = show > 0.002;
      if (!s.group.visible) return;
      const p = stomachPos(id, t, who), e = 0.7 + 0.3 * glide(show);
      s.group.position.set(...p.pos);
      s.group.quaternion.copy(cam.quaternion);
      s.group.rotateZ(0.04 * Math.sin(t * 0.9 + i));
      s.group.scale.setScalar(STOMACH_H * p.scale * e);
      (s.main.material as THREE.MeshBasicMaterial).opacity = show;
      (s.glow.material as THREE.MeshBasicMaterial).opacity = show * (0.85 + 0.15 * Math.sin(t * 2.4 + i));
      s.draw(t + i * 1.7, st.sep, st.bubbles);
    });
    // ---- orbit hero cans (shot 4) ----
    const orbit = id === 4;
    this.cone.visible = this.pool.visible = orbit;
    if (orbit) {
      const k = smooth((t - 20.0) / 0.8);
      (this.cone.material as THREE.ShaderMaterial).uniforms.k.value = k;
      (this.pool.material as THREE.SpriteMaterial).opacity = k;
    }
    this.hero.forEach((c, i) => {
      c.group.visible = orbit;
      this.glint[i].visible = false;
      if (!orbit) return;
      const q = orbitCanPos(t, i as 0 | 1);
      c.group.position.set(...q.pos); c.group.rotation.set(0, 0, q.tilt); c.inner.rotation.y = q.spin;
      c.setOpen(0, -1);
      this.sparks[i].forEach((s, j) => {
        const a = Math.pow(Math.max(0, Math.sin(TAU * (t * 0.55 + j * 0.37 + i * 0.21))), 8);
        s.visible = a > 0.01;
        (s.material as THREE.SpriteMaterial).opacity = a;
        s.scale.setScalar(0.012 + 0.018 * a);
      });
      const gu = (t - (W.space2 - 0.15 + i * 0.18)) / 0.55; // glint sweeps down each can on "space"
      if (gu > 0 && gu < 1) {
        const gl = this.glint[i], a = Math.sin(Math.PI * gu), m = gl.material as THREE.SpriteMaterial;
        gl.visible = true; gl.position.set(q.pos[0] - 0.2 + i * 0.05, q.pos[1] + 0.3 - 0.35 * gu, q.pos[2] + 0.3);
        gl.scale.setScalar(0.6 * a); m.opacity = a; m.rotation = 0.3 + gu * 0.6;
      }
    });
    // ---- hand cans (shots 6-7) ----
    const ca = canAt(id, t), opened = W.opened - LEAD;
    this.hand.forEach((c, i) => {
      const q = canPos(id, t, ("crew" + i) as Who);
      c.group.visible = q.show;
      if (!q.show) return;
      c.group.position.set(...q.pos); c.group.rotation.set(0, 0, q.tilt);
      c.inner.rotation.y = -0.5 + 0.3 * i;
      const tOpen = opened + i * 0.06;
      c.setOpen(ca.open ? smooth((t - tOpen) / 0.12) : 0, id === 6 ? t - tOpen : -1);
    });
    // ---- backyard soda (shot 2) ----
    const qs = canPos(id, t, "bean");
    this.soda.group.visible = qs.show;
    if (qs.show) { this.soda.group.position.set(...qs.pos); this.soda.group.rotation.set(0, 0, qs.tilt); this.soda.inner.rotation.y = -0.6; this.soda.setOpen(1, -1); }
    // ---- menu (shot 7) ----
    const mp = menuPose(id, t), mc = menuAt(id, t);
    this.menu.visible = mp.show > 0.002;
    if (this.menu.visible) {
      this.menu.position.set(...mp.pos); this.menu.rotation.set(-0.08, mp.yaw, mp.roll);
      this.menu.scale.setScalar(0.6 + 0.4 * glide(mp.show));
      const cr = Math.round(mc.cross * 60) / 60;
      if (cr !== this.menuLast) { this.menuLast = cr; this.drawMenu(cr); }
    }
  }
}
