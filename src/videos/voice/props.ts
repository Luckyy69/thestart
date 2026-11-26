// OWNER: props agent. See /home/user/lookmatch/VOICE_BRIEF.md
// Hard props of "Your Voice on Recordings" (pure functions of (id, t); never frustum culled; glows/bubbles on NOINK):
//   1. BEAN's PHONE (shots 1, 3, 5): a coral-pink phone with a VOICE MEMO app: a scrolling waveform with a yellow
//      playhead that runs per phoneAt.play, a timer and a big play/pause button. Over it a squeaky "hello?" BUBBLE card
//      (wobbly jittery letters, squeak marks) in shot 1; a warm "hello" bubble with a heart in shot 5.
//      Shot 1: held up (hand = phonePose.grip), jolts away on "recordings", droops on "real you" (phoneAt.droop).
//      Shot 3: hangs low in the drooped hand. Shot 5: lifted again on "hate".
//   2. The big retro chrome STUDIO MICROPHONE (shot 3): a 50s slatted capsule mic on a boom stand with a heavy base and
//      a trailing cable. It slides in from screen right per micAt.mic (leaning, then a damped wobble) and slides back
//      out on "weird". Its grille glows blue while it catches the air path (micAt.catch).
//   3. LAB HEADPHONES (shot 4): big cream/teal over-ear headphones on BEAN's head (band behind the card plane, cups
//      straddle it), LED rings (blue while voices play, gold on voice D, pink at the peak), sound arcs, and a coiled
//      cord down to the tablet.
//   4. The RATING TABLET (shot 4): on a folio stand on the desk, facing the camera: "RATE EACH VOICE", sliders A-F per
//      ratingAt.bars; D is "???" until ratingAt.own, then shoots to 9.6 in gold with a crown + heart.
// Contracts for the cast/holo/sets are the exported functions below (world coordinates).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { ROOM, LAB, V3, W, smooth, clamp01, glide, phoneAt, micAt, ratingAt } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: props-only framing for stills (must be false when reporting)
const DEBUG_SET = false; // TEMP: stand-in floor/desk/head for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace";
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const lerp3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const hash = (i: number) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ============================== public contracts ==============================
/** default anchors until cast reports (cast: set PROP_HOOKS.head to your headAt to drive the headphones) */
export const BEAN_HAND: V3 = add(ROOM, 0.28, 1.05, 0.15);
export const BEAN_HEAD: V3 = add(ROOM, 0, 1.45, 0);
export const BEAN_MOUTH: V3 = add(ROOM, 0, 1.36, 0.05);
/** LAB: BEAN sits on the stool at LAB+(0,0,0.4); assumed seated head centre + head half-width (m) */
export const LAB_SEAT: V3 = add(LAB, 0, 0, 0.4);
export const LAB_HEAD: V3 = add(LAB, 0, 1.22, 0.4);
export const HEAD_R = 0.21;
export const DESK_Y = 0.76;
/** cast fills these (props never imports cast): head(id,t) -> BEAN's head centre (world) in the lab, r = half-width */
export const PROP_HOOKS: { head?: (id: number, t: number) => V3 | undefined; headR?: number } = {};

// ---------------- phone ----------------
/** phone body (m): cartoon-big so the screen reads on a phone */
export const PHONE_W = 0.118, PHONE_H = 0.236, PHONE_D = 0.017;
/** the grip point sits this far below the phone centre (phone-local -y): BEAN's fingers wrap the lower third */
const GRIP_DY = 0.05;
const GRIP_UP: V3 = BEAN_HAND;                       // held up, screen to camera (shot 1, shot 5 after "hate")
const GRIP_LOW: V3 = add(ROOM, 0.31, 0.86, 0.12);    // drooped at his side (end of shot 1, shot 3, start of shot 5)
/** recording position 0..1 (the memo is PLAY_DUR s long) and where each shot starts playing */
const PLAY_DUR = 2.3;
const playStart = (id: number) => (id === 5 ? W.hate - 0.2 : 0.05);
const jolt = (t: number) => { const d = t - (W.recordings - 0.12); return d < 0 || d > 1.2 ? 0 : Math.sin(Math.min(1, d / 0.08) * Math.PI * 0.5) * Math.exp(-Math.max(0, d - 0.08) * 5) * Math.cos(Math.max(0, d - 0.08) * 18); };
export type PhonePose = {
  /** 0..1 visible (shots 1, 3, 5) */ show: number;
  /** BEAN's hand (world): cast puts the holding hand here */ grip: V3;
  /** phone centre (world) */ pos: V3;
  /** rad: + = screen tips toward the floor */ pitch: number;
  /** rad about the screen normal */ roll: number;
  /** 0..1 memo playing, 0..1 recording position */ play: number; pos01: number;
};
/** THE phone contract: BEAN's holding hand = grip (world). The screen faces the camera (yaw toward it). */
export const phonePose = (id: number, t: number): PhonePose => {
  if (id !== 1 && id !== 3 && id !== 5) return { show: 0, grip: GRIP_LOW, pos: add(GRIP_LOW, 0, GRIP_DY, 0), pitch: 0, roll: 0, play: 0, pos01: 0 };
  const ph = phoneAt(id, t);
  let low = 1;
  if (id === 1) low = glide(ph.droop);
  if (id === 5) low = 1 - glide((t - (W.hate - 0.75)) / 0.6);
  const j = id === 1 ? jolt(t) : 0;
  const breathe = 0.004 * Math.sin(t * 2.1);
  const g = lerp3(GRIP_UP, GRIP_LOW, low);
  const grip: V3 = [g[0] + 0.035 * j, g[1] + 0.02 * j + breathe * (1 - low), g[2] - 0.02 * j];
  const pitch = lerp(-0.14, 0.95, low) - 0.12 * j, roll = lerp(-0.06, 0.2, low) - 0.16 * j;
  // phone centre = grip + GRIP_DY along the phone's own up axis (pitched/rolled)
  const up = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(pitch, 0, roll, "YXZ"));
  const pos: V3 = [grip[0] + up.x * GRIP_DY, grip[1] + up.y * GRIP_DY, grip[2] + up.z * GRIP_DY];
  return { show: 1, grip, pos, pitch, roll, play: ph.play, pos01: clamp01((t - playStart(id)) / (id === 5 ? 4.4 : PLAY_DUR)) };
};
export const phoneGrip = (id: number, t: number): V3 => phonePose(id, t).grip;
/** the "hello" bubble: 0..1 shown (scales in/out, never pops) */
export const bubbleAt = (id: number, t: number) => {
  if (id === 1) return smooth((t - 0.1) / 0.22) * (1 - smooth((t - (W.bad - 0.05)) / 0.3));
  if (id === 5) return smooth((t - (W.hate + 0.05)) / 0.25);
  return 0;
};

// ---------------- microphone ----------------
/** grille centre of the mic when fully in (world); it faces BEAN's mouth. holo: aim the blue air rings here. */
export const MIC_GRILLE: V3 = add(ROOM, 0.3, 1.36, 0.34);
/** heavy round stand base (world, fully in). It slides in along -x from MIC_BASE + (MIC_SLIDE, 0, 0). */
export const MIC_BASE: V3 = add(ROOM, 0.66, 0, 0.58);
export const MIC_SLIDE = 1.75;
const MIC_YAW = Math.atan2(BEAN_MOUTH[0] - MIC_GRILLE[0], BEAN_MOUTH[2] - MIC_GRILLE[2]);
const micLean = (id: number, t: number) => {
  const m = micAt(id, t).mic, entering = t < W.weird - 0.25;
  let lean = (entering ? -1 : 1) * 0.16 * Math.sin(Math.PI * m);
  const ta = t - (W.microphone + 0.1);
  if (entering && ta > 0) lean += 0.05 * Math.exp(-ta * 3.5) * Math.sin(ta * 13);
  return lean;
};
/** mic state (world): show 0..1, grille centre, its facing (unit, toward the mouth), catch 0..1, base position */
export const micPose = (id: number, t: number): { show: number; grille: V3; front: V3; catch: number; base: V3; lean: number } => {
  const m = micAt(id, t), e = glide(m.mic), dx = MIC_SLIDE * (1 - e), lean = micLean(id, t);
  const base = add(MIC_BASE, dx, 0, 0);
  // grille = base + Rz(lean) (grille - base)
  const lx = MIC_GRILLE[0] - MIC_BASE[0], ly = MIC_GRILLE[1] - MIC_BASE[1];
  const grille: V3 = [base[0] + lx * Math.cos(lean) - ly * Math.sin(lean), base[1] + lx * Math.sin(lean) + ly * Math.cos(lean), MIC_GRILLE[2]];
  return { show: m.mic > 0.0005 ? 1 : 0, grille, front: [Math.sin(MIC_YAW), 0, Math.cos(MIC_YAW)], catch: m.catch * e, base, lean };
};

// ---------------- headphones ----------------
/** HEADPHONES on BEAN (shot 4 only, on from the cut): head centre (world), r = head half-width, play 0..1 (sound arcs),
 *  tint: the LED ring colour mode 0 blue (other voices) -> 1 gold (voice D) -> 2 pink (peak) */
export const headphonesAt = (id: number, t: number): { show: number; head: V3; r: number; play: number; tint: number } => {
  if (id !== 4) return { show: 0, head: LAB_HEAD, r: HEAD_R, play: 0, tint: 0 };
  const h = PROP_HOOKS.head?.(id, t) ?? LAB_HEAD, R = ratingAt(id, t);
  const others = smooth((t - (W.rated - 0.35)) / 0.3) * (1 - smooth((t - (W.rated + 1.55)) / 0.3));
  const play = Math.max(others, R.playingD);
  const tint = R.playingD + smooth((t - (W.higher - 0.25)) / 0.5);
  return { show: 1, head: h, r: PROP_HOOKS.headR ?? HEAD_R, play, tint };
};

// ---------------- rating tablet ----------------
/** tablet case (m), lean back from vertical, yaw toward screen-centre; it stands on the desk on a folio stand.
 *  The bottom edge rests on the desk at TABLET_FOOT; sets: keep the desk top under x -0.45..0.1, z 0.6..1.0 (LAB-local). */
export const TAB_W = 0.33, TAB_H = 0.225, TAB_D = 0.014;
const TAB_LEAN = THREE.MathUtils.degToRad(38), TAB_YAW = 0.22;
export const TABLET_FOOT: V3 = add(LAB, -0.2, DESK_Y, 0.88);
const tabMat = (() => {
  const m = new THREE.Matrix4().makeRotationY(TAB_YAW).multiply(new THREE.Matrix4().makeRotationX(-TAB_LEAN));
  const foot = new THREE.Vector3(0, -TAB_H / 2, -TAB_D / 2).applyMatrix4(m); // bottom-back edge offset from the centre
  const c = new THREE.Vector3(TABLET_FOOT[0], TABLET_FOOT[1] + 0.004, TABLET_FOOT[2]).sub(foot);
  m.setPosition(c);
  return m;
})();
const tabWorld = (x: number, y: number, z: number): V3 => { const v = new THREE.Vector3(x, y, z).applyMatrix4(tabMat); return [v.x, v.y, v.z]; };
/** tablet screen centre (world) and its facing normal */
export const TABLET_CENTRE: V3 = tabWorld(0, 0, 0);
export const TABLET_NORMAL: V3 = (() => { const n = new THREE.Vector3(0, 0, 1).transformDirection(tabMat); return [n.x, n.y, n.z]; })();
// screen canvas layout (px) -> tablet-local metres
const SCR_W = TAB_W - 0.026, SCR_H = TAB_H - 0.026, TCW = 1024, TCH = Math.round((1024 * SCR_H) / SCR_W);
const ROW_Y0 = 150, ROW_DY = (TCH - ROW_Y0 - 24) / 6, TRK_X0 = 156, TRK_X1 = 800;
const scrLocal = (px: number, py: number): [number, number] => [(px / TCW - 0.5) * SCR_W, (0.5 - py / TCH) * SCR_H];
const knobPx = (i: number, v: number): [number, number] => [TRK_X0 + (TRK_X1 - TRK_X0) * clamp01(v), ROW_Y0 + ROW_DY * (i + 0.5)];
/** slider knob i (0=A..5=F) on the tablet screen (world) */
export const tabletKnob = (id: number, t: number, i: number): V3 => {
  const R = ratingAt(id, t), [px, py] = knobPx(i, R.bars[i]), [x, y] = scrLocal(px, py);
  return tabWorld(x, y, TAB_D / 2 + 0.004);
};
/** the row BEAN is rating now (-1 none): each bar fills in turn from W.rated; D (3) is rated last, at the peak */
export const activeRow = (id: number, t: number) => {
  if (id !== 4) return -1;
  const R = ratingAt(id, t);
  if (R.playingD > 0.5) return 3;
  let a = -1;
  for (let i = 0; i < 6; i++) if (i !== 3 && t >= W.rated - 0.25 + 0.25 * i) a = i;
  return a;
};
/** BEAN's tapping finger (world): on the knob being rated (shot 4); the knob he drags up at the peak is D's */
export const tabletTap = (id: number, t: number): V3 => { const a = activeRow(id, t); return tabletKnob(id, t, a < 0 ? 0 : a); };

// ============================== materials + textures ==============================
const lamb = (col: THREE.ColorRepresentation, map: THREE.Texture | null = null) => twoTone(new THREE.MeshLambertMaterial({ color: col, map }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number) => twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const rbox = (w: number, h: number, d: number, r: number, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const cylY = (r: number, h: number, n = 24, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, n);
const cylX = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateZ(Math.PI / 2);
const cylZ = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateX(Math.PI / 2);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
const tube = (pts: V3[], r: number, seg = 64) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false);
/** a cylinder between two points (axis A -> B) */
const rod = (A: V3, B: V3, r: number, n = 16) => {
  const a = new THREE.Vector3(...A), b = new THREE.Vector3(...B), d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2);
};
const glowTex = () => ctex("voGlow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
/** cartoon chrome: hard light/dark reflection bands around the circumference (u) */
const chromeTex = () => ctex("voChrome", 512, 32, (g) => {
  const gr = g.createLinearGradient(0, 0, 512, 0);
  const stops: [number, string][] = [[0, "#5d6a7e"], [0.08, "#eef3fa"], [0.14, "#ffffff"], [0.2, "#9aa7ba"], [0.3, "#3e4656"], [0.42, "#c8d2e0"], [0.5, "#f4f7fb"],
    [0.58, "#8592a6"], [0.7, "#3a4252"], [0.8, "#dfe6f0"], [0.86, "#ffffff"], [0.93, "#8e9ab0"], [1, "#5d6a7e"]];
  for (const [s, c] of stops) gr.addColorStop(s, c);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 32);
});
const meshTex = () => ctex("voMicMesh", 256, 256, (g) => {
  g.fillStyle = "#23252e"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#3b3f4c";
  for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 256; x += 8) { g.beginPath(); g.arc(x, y, 2.2, 0, TAU); g.fill(); }
});
const badgeTex = () => ctex("voBadge", 256, 128, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "#ffe27a"); gr.addColorStop(0.5, "#e0a422"); gr.addColorStop(1, "#ffd25a");
  g.fillStyle = gr; g.beginPath(); g.roundRect(0, 0, 256, 128, 26); g.fill();
  g.strokeStyle = "#8a5a10"; g.lineWidth = 8; g.beginPath(); g.roundRect(8, 8, 240, 112, 20); g.stroke();
  g.fillStyle = "#5a3408"; g.font = `italic 900 70px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("VOX", 128, 68);
});
const caseTex = () => ctex("voPhoneCase", 256, 512, (g, r) => {
  g.fillStyle = "#ff6f8e"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 26; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,240,120,0.85)" : "rgba(255,255,255,0.75)"; const x = r() * 256, y = r() * 512, s = 6 + r() * 10; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); }
});
const stickerTex = () => ctex("voSticker", 256, 256, (g) => {
  g.fillStyle = "#ff6f8e"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffe14d"; g.beginPath(); g.arc(128, 128, 120, 0, TAU); g.fill();
  g.strokeStyle = "#2a1e2e"; g.lineWidth = 10; g.stroke();
  g.fillStyle = "#2a1e2e"; g.beginPath(); g.ellipse(92, 104, 13, 20, 0, 0, TAU); g.ellipse(164, 104, 13, 20, 0, 0, TAU); g.fill();
  g.lineWidth = 12; g.lineCap = "round"; g.beginPath(); g.arc(128, 140, 52, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
});
const arcTex = () => ctex("voArcs", 128, 256, (g) => {
  g.strokeStyle = "rgba(255,255,255,1)"; g.lineCap = "round";
  for (const [r, w] of [[60, 14], [100, 12]] as [number, number][]) { g.lineWidth = w; g.beginPath(); g.arc(-10, 128, r, -0.75, 0.75); g.stroke(); }
});
const tabBackTex = () => ctex("voTabBack", 256, 256, (g) => {
  g.fillStyle = "#ff8c2a"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.9)"; g.font = `900 34px ${FONT}`; g.textAlign = "center"; g.fillText("PROPERTY OF", 128, 104); g.fillText("VOICE LAB", 128, 146);
  g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 6; g.strokeRect(30, 64, 196, 100);
});

/** collects static geometry per material and merges it into one mesh per material */
class Bag {
  private m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mat: THREE.Material, ...gs: THREE.BufferGeometry[]) { const a = this.m.get(mat) ?? []; for (const g of gs) a.push(strip(g)); this.m.set(mat, a); }
  build(parent: THREE.Object3D, shadow = true) {
    for (const [mat, gs] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(gs, false), mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.frustumCulled = false; parent.add(mesh);
    }
    this.m.clear();
  }
}
const solid = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, shadow = true) => {
  const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
};
const glowSprite = (col: THREE.Color, parent: THREE.Object3D) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 12; parent.add(s); return s;
};
const dynCanvas = (w: number, h: number) => {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, g: cv.getContext("2d")!, tex, key: "" };
};
/** coiled cord along a curve */
const coil = (pts: THREE.Vector3[], r: number, tubeR: number, turnsPerM: number) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const L = curve.getLength(), turns = Math.max(4, Math.round(L * turnsPerM)), N = turns * 10;
  const fr = curve.computeFrenetFrames(N, false), out: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPointAt(i / N), a = (i / N) * turns * TAU;
    out.push(p.clone().addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(out), N * 2, tubeR, 5, false);
};

// ============================== voice memo screen ==============================
const PCW = 480, PCH = 960;
/** the recording: a squeaky two-syllable "hel-LO?" (0..1 along the memo) */
const memoAmp = (u: number) => {
  const b = (c: number, w: number, a: number) => a * Math.exp(-(((u - c) / w) ** 2));
  return 0.06 + b(0.25, 0.08, 0.75) + b(0.5, 0.12, 1.0) + b(0.62, 0.05, 0.55) + 0.05 * Math.sin(u * 90);
};
const NBARS = 64, BAR_DX = 15;
const drawMemo = (g: CanvasRenderingContext2D, pos01: number, play: number, t: number, warm: boolean) => {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createLinearGradient(0, 0, 0, PCH);
  bg.addColorStop(0, warm ? "#2a1a3e" : "#121838"); bg.addColorStop(1, warm ? "#4a2246" : "#252c5e");
  g.fillStyle = bg; g.fillRect(0, 0, PCW, PCH);
  // status bar + island
  g.fillStyle = "#ffffff"; g.font = `700 26px ${FONT}`; g.textBaseline = "middle"; g.textAlign = "left"; g.fillText("9:41", 34, 40);
  g.fillStyle = "#06070c"; g.beginPath(); g.roundRect(PCW / 2 - 62, 22, 124, 36, 18); g.fill();
  g.strokeStyle = "#ffffff"; g.lineWidth = 3; g.strokeRect(PCW - 84, 30, 42, 20); g.fillStyle = "#7dff9a"; g.fillRect(PCW - 81, 33, 30, 14); g.fillStyle = "#fff"; g.fillRect(PCW - 41, 36, 4, 8);
  // header
  g.fillStyle = "#ffffff"; g.font = `900 44px ${FONT}`; g.fillText("Voice Memos", 34, 118);
  g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.roundRect(24, 156, PCW - 48, 92, 22); g.fill();
  g.fillStyle = "#ff5a6e"; g.beginPath(); g.arc(70, 202, 22, 0, TAU); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(63, 186, 14, 24, 7); g.fill(); g.fillRect(69, 212, 2, 8);
  g.font = `800 32px ${FONT}`; g.fillText("me_hello.m4a", 108, 190);
  g.fillStyle = "rgba(255,255,255,0.6)"; g.font = `600 22px ${FONT}`; g.fillText("Today  ·  0:02", 108, 224);
  // waveform: scrolls left past the fixed centre playhead
  const cy = 470, H = 170, px = PCW / 2;
  g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, cy - H - 20, PCW, 2 * H + 40);
  g.strokeStyle = "rgba(255,255,255,0.18)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, cy); g.lineTo(PCW, cy); g.stroke();
  const sx = pos01 * NBARS * BAR_DX;
  for (let k = 0; k < NBARS; k++) {
    const x = px + k * BAR_DX - sx;
    if (x < -10 || x > PCW + 10) continue;
    const u = k / NBARS, played = x <= px;
    let a = memoAmp(u) * (0.55 + 0.45 * hash(k));
    const near = Math.exp(-(((x - px) / 34) ** 2)) * play;            // live bounce at the playhead
    a *= 1 + near * (0.35 * Math.sin(t * 47 + k) + 0.25);
    const h = Math.max(5, Math.min(1.12, a) * H);
    g.fillStyle = played ? (warm ? "#ffb0d0" : "#ff5a6e") : "rgba(200,210,255,0.55)";
    g.beginPath(); g.roundRect(x - 4.5, cy - h, 9, 2 * h, 4.5); g.fill();
  }
  g.strokeStyle = "#ffd84a"; g.lineWidth = 5; g.beginPath(); g.moveTo(px, cy - H - 26); g.lineTo(px, cy + H + 26); g.stroke();
  g.fillStyle = "#ffd84a"; g.beginPath(); g.arc(px, cy - H - 26, 10, 0, TAU); g.arc(px, cy + H + 26, 10, 0, TAU); g.fill();
  // timer + scrubber
  const sec = pos01 * 2.0;
  g.fillStyle = "#ffffff"; g.font = `800 64px ${MONO}`; g.textAlign = "center"; g.fillText(`0:0${Math.floor(sec)}.${Math.floor((sec % 1) * 10)}`, PCW / 2, 718);
  g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.roundRect(40, 774, PCW - 80, 8, 4); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(40, 774, Math.max(8, (PCW - 80) * pos01), 8, 4); g.fill();
  g.beginPath(); g.arc(40 + (PCW - 80) * pos01, 778, 13, 0, TAU); g.fill();
  // controls: big play / pause
  const bx = PCW / 2, by = 872;
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(bx, by, 60, 0, TAU); g.fill();
  g.fillStyle = "#ff3d55";
  if (play > 0.5) { g.beginPath(); g.roundRect(bx - 24, by - 28, 16, 56, 5); g.roundRect(bx + 8, by - 28, 16, 56, 5); g.fill(); }
  else { g.beginPath(); g.moveTo(bx - 18, by - 30); g.lineTo(bx + 30, by); g.lineTo(bx - 18, by + 30); g.closePath(); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 5;
  for (const s of [-1, 1]) { g.beginPath(); g.arc(bx + s * 140, by, 28, 0, TAU); g.stroke(); g.fillStyle = "rgba(255,255,255,0.75)"; g.font = `800 22px ${FONT}`; g.fillText("15", bx + s * 140, by + 1); }
  // glass sheen
  const sh = g.createLinearGradient(0, 0, PCW, PCH); sh.addColorStop(0, "rgba(255,255,255,0.10)"); sh.addColorStop(0.35, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.fillRect(0, 0, PCW, PCH);
};

// ============================== the "hello" bubble ==============================
const BCW = 640, BCH = 440;
const drawBubble = (g: CanvasRenderingContext2D, t: number, warm: boolean) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BCW, BCH);
  const q = Math.floor(t * 15), r = (i: number) => hash(q * 31 + i) - 0.5; // 15 Hz squeaky jitter
  const cx = 320, cy = 190, rx = 250, ry = 140;
  // wobbly outline + tail toward the phone (bottom-right)
  const outline = () => {
    g.beginPath();
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU, wob = warm ? 1 + 0.02 * Math.sin(a * 5 + t * 2) : 1 + 0.035 * Math.sin(a * 9) + 0.012 * r(i);
      const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.moveTo(cx + 60, cy + ry * 0.8); g.lineTo(cx + 160, BCH - 14); g.lineTo(cx + 130, cy + ry * 0.6); g.closePath();
  };
  g.fillStyle = warm ? "#ffe3ee" : "#fff6b8"; g.strokeStyle = "#1f1724"; g.lineWidth = 14; g.lineJoin = "round";
  outline(); g.stroke();
  g.beginPath(); g.ellipse(cx, cy, rx * 0.985, ry * 0.985, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(cx + 60, cy + ry * 0.8); g.lineTo(cx + 160, BCH - 14); g.lineTo(cx + 130, cy + ry * 0.6); g.closePath(); g.fill();
  outline(); g.save(); g.clip(); g.fill(); g.restore();
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  if (warm) {
    g.fillStyle = "#c2185b"; g.font = `900 110px ${FONT}`; g.fillText("hello", cx - 40, cy + 40);
    const hx = cx + 150, hy = cy - 6, s = 1 + 0.08 * Math.sin(t * 7);
    g.save(); g.translate(hx, hy); g.scale(s, s); g.fillStyle = "#ff3d7a";
    g.beginPath(); g.moveTo(0, 30); g.bezierCurveTo(-60, -10, -30, -60, 0, -26); g.bezierCurveTo(30, -60, 60, -10, 0, 30); g.fill();
    g.strokeStyle = "#1f1724"; g.lineWidth = 6; g.stroke(); g.restore();
    return;
  }
  // squeaky letters: tall, narrow, each one jittering + tilting
  const txt = "hello?", widths = [62, 62, 40, 40, 66, 58];
  let x = cx - widths.reduce((s, w) => s + w, 0) / 2;
  for (let i = 0; i < txt.length; i++) {
    const w = widths[i];
    g.save(); g.translate(x + w / 2, cy + 50 + 10 * r(i + 10) - (i === 4 ? 10 : 0)); g.rotate(0.16 * r(i + 20)); g.scale(0.9, 1.35 + 0.1 * r(i + 30));
    g.font = `italic 900 92px ${FONT}`; g.fillStyle = "#ff3d55"; g.strokeStyle = "#1f1724"; g.lineWidth = 7;
    g.strokeText(txt[i], 0, 0); g.fillText(txt[i], 0, 0); g.restore();
    x += w;
  }
  // squeak marks
  g.strokeStyle = "#1f1724"; g.lineWidth = 7; g.lineCap = "round";
  for (const [sx, sy, a] of [[cx - 236, cy - 120, -2.4], [cx - 268, cy - 30, -2.9], [cx + 236, cy - 124, -0.7]] as [number, number, number][]) {
    for (let k = 0; k < 3; k++) {
      const aa = a + (k - 1) * 0.34 + 0.05 * r(k + 40), l = 26 + 6 * r(k + 50);
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + Math.cos(aa) * l, sy + Math.sin(aa) * l); g.stroke();
    }
  }
  g.fillStyle = "#6a4a20"; g.font = `italic 900 36px ${FONT}`; g.fillText("*squeak*", cx, cy - 78 + 4 * r(60));
};

// ============================== tablet screen ==============================
const LETTERS = ["A", "B", "C", "D", "E", "F"];
const ROW_COL = ["#4aa8ff", "#36c98a", "#a77bff", "#ffb020", "#ff6a8a", "#2fc4d8"];
const drawTablet = (g: CanvasRenderingContext2D, id: number, t: number) => {
  const R = ratingAt(id, t), act = activeRow(id, t), gold = R.own;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = "#07080c"; g.fillRect(0, 0, TCW, TCH);
  g.globalAlpha = 0.25 + 0.75 * R.show;
  const bg = g.createLinearGradient(0, 0, 0, TCH); bg.addColorStop(0, "#f6f8ff"); bg.addColorStop(1, "#e2e8f8");
  g.fillStyle = bg; g.fillRect(0, 0, TCW, TCH);
  // header
  g.fillStyle = "#1f3a6e"; g.fillRect(0, 0, TCW, 120);
  g.fillStyle = "#ffffff"; g.font = `900 50px ${FONT}`; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText("RATE EACH VOICE", 36, 50);
  g.font = `800 26px ${FONT}`; g.fillStyle = "#9fc0ff"; g.fillText("VOICE STUDY 2013  ·  1-10", 36, 94);
  if (act >= 0) {
    const pc = act === 3 ? (gold > 0.5 ? "#ffd23a" : "#b48cff") : ROW_COL[act];
    g.fillStyle = pc; g.beginPath(); g.roundRect(TCW - 330, 28, 300, 64, 32); g.fill();
    g.fillStyle = "#10162a"; g.font = `900 34px ${FONT}`; g.textAlign = "center";
    const on = Math.sin(t * 12) > 0;
    g.beginPath(); g.moveTo(TCW - 290, 44); g.lineTo(TCW - 262, 60); g.lineTo(TCW - 290, 76); g.closePath(); if (on) g.fill(); else { g.lineWidth = 4; g.strokeStyle = "#10162a"; g.stroke(); }
    g.fillText(`VOICE ${act === 3 && R.own < 0.05 ? "?" : LETTERS[act]}`, TCW - 160, 61);
  }
  // rows
  for (let i = 0; i < 6; i++) {
    const y = ROW_Y0 + ROW_DY * (i + 0.5), v = R.bars[i], isD = i === 3;
    if (i === act) { g.fillStyle = isD ? `rgba(255,210,58,${0.25 + 0.2 * gold})` : "rgba(74,168,255,0.16)"; g.beginPath(); g.roundRect(14, y - ROW_DY / 2 + 4, TCW - 28, ROW_DY - 8, 18); g.fill(); }
    const chip = isD ? (gold > 0.5 ? "#ffcc1a" : "#8a6ad8") : ROW_COL[i];
    g.fillStyle = chip; g.beginPath(); g.arc(78, y, 34, 0, TAU); g.fill();
    g.fillStyle = "#ffffff"; g.font = `900 42px ${FONT}`; g.textAlign = "center"; g.fillText(LETTERS[i], 78, y + 2);
    g.fillStyle = "#c9d2e8"; g.beginPath(); g.roundRect(TRK_X0, y - 11, TRK_X1 - TRK_X0, 22, 11); g.fill();
    const [kx] = knobPx(i, v);
    if (v > 0.002) { g.fillStyle = isD ? "#ffc21a" : chip; g.beginPath(); g.roundRect(TRK_X0, y - 11, Math.max(22, kx - TRK_X0), 22, 11); g.fill(); }
    if (isD && gold > 0.02) { const gl = g.createRadialGradient(kx, y, 10, kx, y, 80); gl.addColorStop(0, `rgba(255,220,80,${0.8 * gold})`); gl.addColorStop(1, "rgba(255,220,80,0)"); g.fillStyle = gl; g.fillRect(kx - 80, y - 80, 160, 160); }
    g.fillStyle = "#ffffff"; g.strokeStyle = isD ? (gold > 0.5 ? "#c88a00" : "#8a6ad8") : chip; g.lineWidth = 8;
    g.beginPath(); g.arc(kx, y, 26, 0, TAU); g.fill(); g.stroke();
    g.textAlign = "left"; g.font = `900 46px ${FONT}`;
    if (isD && gold < 0.05) { g.fillStyle = "#8a6ad8"; g.fillText("???", TRK_X1 + 50, y + 2); }
    else if (v > 0.002) { g.fillStyle = isD ? "#c88a00" : "#243050"; g.fillText((1 + 9 * v).toFixed(1), TRK_X1 + 50, y + 2); }
    else { g.fillStyle = "#9aa6c0"; g.fillText("-", TRK_X1 + 60, y + 2); }
    if (isD && gold > 0.05) {
      g.save(); g.globalAlpha *= clamp01(gold * 1.5); g.translate(kx, y - 46); g.scale(0.6 + 0.4 * gold, 0.6 + 0.4 * gold);
      g.fillStyle = "#ffcc1a"; g.strokeStyle = "#7a4a00"; g.lineWidth = 5;
      g.beginPath(); g.moveTo(-30, 12); g.lineTo(-34, -20); g.lineTo(-14, -2); g.lineTo(0, -28); g.lineTo(14, -2); g.lineTo(34, -20); g.lineTo(30, 12); g.closePath(); g.fill(); g.stroke();
      g.restore();
      g.save(); g.globalAlpha *= gold; g.translate(TRK_X1 + 178, y - 2); const s = 0.9 + 0.12 * Math.sin(t * 9); g.scale(s, s);
      g.fillStyle = "#ff3d7a"; g.beginPath(); g.moveTo(0, 22); g.bezierCurveTo(-44, -8, -22, -44, 0, -18); g.bezierCurveTo(22, -44, 44, -8, 0, 22); g.fill(); g.restore();
    }
  }
  g.globalAlpha = 1;
  const sh = g.createLinearGradient(0, 0, TCW, TCH); sh.addColorStop(0, "rgba(255,255,255,0.12)"); sh.addColorStop(0.4, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = sh; g.fillRect(0, 0, TCW, TCH);
};

// ============================== Props ==============================
const HP_TINTS = [new THREE.Color(0.35, 0.8, 1.6), new THREE.Color(1.6, 1.15, 0.25), new THREE.Color(1.7, 0.45, 0.9)];
export class Props {
  root = new THREE.Group();
  private phone = new THREE.Group();
  private memo = dynCanvas(PCW, PCH);
  private bubble: THREE.Mesh; private bub = dynCanvas(BCW, BCH);
  private micRig = new THREE.Group(); private micGlow: THREE.Sprite;
  private hp = new THREE.Group(); private hpLeds: THREE.Mesh; private hpArcs: THREE.Sprite[] = [];
  private cord: THREE.Mesh; private cordKey = "";
  private tab = new THREE.Group(); private tabScr = dynCanvas(TCW, TCH); private tabGlow: THREE.Sprite;

  constructor() {
    this.root.add(this.phone, this.micRig, this.hp, this.tab);
    this.buildPhone();
    this.bubble = new THREE.Mesh(new THREE.PlaneGeometry(1, BCH / BCW), new THREE.MeshBasicMaterial({ map: this.bub.tex, alphaTest: 0.5, fog: false }));
    this.bubble.layers.set(NOINK); this.bubble.frustumCulled = false; this.bubble.renderOrder = 20; this.root.add(this.bubble);
    this.micGlow = this.buildMic();
    const hpOut = this.buildHeadphones(); this.hpLeds = hpOut.leds; this.cord = hpOut.cord;
    this.tabGlow = this.buildTablet();
    if (DEBUG_SET) this.buildDebug();
    this.phone.visible = this.bubble.visible = this.micRig.visible = this.hp.visible = this.cord.visible = this.tab.visible = false;
  }

  // ---------------------------------- phone ----------------------------------
  private buildPhone() {
    const P = this.phone, b = new Bag(), W2 = PHONE_W, H2 = PHONE_H, D2 = PHONE_D;
    const caseM = phong("#ffffff", caseTex(), "#ffffff", 50), black = phong("#101118", null, "#8a90a0", 80), chrome = phong("#ffffff", chromeTex(), "#ffffff", 100);
    b.add(caseM, rbox(W2, H2, D2, 0.019, 4));
    b.add(black, at(rbox(W2 - 0.008, H2 - 0.008, 0.004, 0.015, 3), 0, 0, D2 / 2 - 0.001)); // glass front (proud 1 mm)
    b.add(caseM, at(rbox(0.006, 0.034, 0.008, 0.002), W2 / 2 + 0.002, 0.05, 0), at(rbox(0.006, 0.022, 0.008, 0.002), -W2 / 2 - 0.002, 0.065, 0), at(rbox(0.006, 0.022, 0.008, 0.002), -W2 / 2 - 0.002, 0.035, 0));
    b.add(black, at(rbox(0.046, 0.046, 0.006, 0.01), 0.026, 0.083, -D2 / 2 - 0.002)); // camera bump (back)
    for (const [x, y] of [[0.016, 0.093], [0.016, 0.072], [0.036, 0.083]]) b.add(chrome, at(cylZ(0.0085, 0.006, 20), x, y, -D2 / 2 - 0.005));
    b.build(P);
    const st = solid(new THREE.PlaneGeometry(0.06, 0.06), lamb("#ffffff", stickerTex()), P, false);
    st.position.set(-0.018, -0.04, -D2 / 2 - 0.0015); st.rotation.set(0, Math.PI, 0.2);
    // screen (self-lit memo app), 1.3 mm in front of the glass
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(W2 - 0.014, H2 - 0.02), new THREE.MeshBasicMaterial({ map: this.memo.tex, color: new THREE.Color(1.05, 1.05, 1.05) }));
    scr.position.z = D2 / 2 + 0.0023; scr.frustumCulled = false; P.add(scr);
  }

  // ---------------------------------- microphone ----------------------------------
  private buildMic(): THREE.Sprite {
    const rig = this.micRig, mic = new THREE.Group(), b = new Bag(), mb = new Bag();
    const chrome = phong("#ffffff", chromeTex(), "#ffffff", 110), dark = phong("#1c1d24", null, "#6a7080", 50), iron = phong("#2a2b33", null, "#9098a8", 60);
    const meshM = lamb("#ffffff", meshTex()), cable = lamb("#18181e"), red = phong("#e0303a", null, "#ffffff", 80);
    // stand (rig origin = base centre on the floor)
    const M: V3 = [MIC_GRILLE[0] - MIC_BASE[0], MIC_GRILLE[1] - MIC_BASE[1], MIC_GRILLE[2] - MIC_BASE[2]];
    const POLE = 1.02, KN: V3 = [M[0], M[1] - 0.205, M[2]], TOP: V3 = [0, POLE, 0];
    b.add(iron, cylY(0.17, 0.035, 48, 0.16).translate(0, 0.0175, 0));
    b.add(iron, new THREE.SphereGeometry(0.16, 40, 12, 0, TAU, 0, 0.42).scale(1, 0.55, 1).translate(0, 0.002, 0));
    b.add(chrome, new THREE.TorusGeometry(0.168, 0.008, 8, 64).rotateX(Math.PI / 2).translate(0, 0.036, 0));
    b.add(chrome, cylY(0.026, 0.05, 24).translate(0, 0.09, 0));
    b.add(chrome, cylY(0.016, POLE - 0.1, 20).translate(0, 0.07 + (POLE - 0.1) / 2, 0));
    b.add(dark, cylY(0.024, 0.06, 20).translate(0, 0.66, 0), cylX(0.008, 0.07, 10).translate(0.03, 0.66, 0));
    b.add(dark, new THREE.SphereGeometry(0.03, 20, 14).translate(...TOP), cylZ(0.012, 0.09, 12).translate(TOP[0], TOP[1], 0.04));
    b.add(chrome, rod(TOP, KN, 0.012));
    b.add(cable, tube([[KN[0], KN[1] - 0.03, KN[2] + 0.025], [KN[0] * 0.6, KN[1] - 0.1, KN[2] * 0.6 + 0.03], [0.03, POLE - 0.08, 0.04], [0.035, 0.7, 0.035], [0.03, 0.4, 0.028],
      [0.05, 0.12, 0.05], [0.14, 0.012, 0.12], [0.4, 0.012, 0.1], [0.9, 0.012, -0.02], [1.6, 0.012, 0.04]], 0.0075, 120));
    b.build(rig);
    // the mic itself (mic-local origin = grille centre; +z faces the mouth)
    const HH = 0.14, R0 = 0.08, DZ = 0.74, p = 3.2;
    const rOf = (y: number) => R0 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y / HH), p)), 1 / p);
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) { const y = -HH + (2 * HH * i) / 40; prof.push(new THREE.Vector2(Math.max(0.0005, rOf(y)), y)); }
    mb.add(meshM, new THREE.LatheGeometry(prof, 48).scale(0.95, 0.985, DZ * 0.95));
    const NS = 13;
    for (let i = 0; i < NS; i++) { const y = -HH * 0.86 + (1.72 * HH * i) / (NS - 1), r = rOf(y); if (r < 0.01) continue; mb.add(chrome, new THREE.TorusGeometry(r * 1.005, 0.0062, 8, 56).rotateX(Math.PI / 2).scale(1, 1, DZ).translate(0, y, 0)); }
    for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const pts: V3[] = [];
      for (let i = 0; i <= 24; i++) { const y = -HH * 0.97 + (1.94 * HH * i) / 24, r = rOf(y) * 1.03; pts.push([sx * r, y, sz * r * DZ]); }
      mb.add(chrome, tube(pts, sx ? 0.006 : 0.011, 48));
    }
    mb.add(chrome, new THREE.TorusGeometry(R0 * 0.62, 0.012, 10, 48).rotateX(Math.PI / 2).scale(1, 1, DZ).translate(0, -HH * 0.93, 0));
    mb.add(chrome, cylY(0.022, 0.07, 24, 0.03).translate(0, -HH - 0.03, 0));
    mb.add(chrome, new THREE.SphereGeometry(0.03, 24, 16).translate(0, -0.205, 0));
    mb.add(dark, cylX(0.011, 0.1, 12).translate(0, -0.205, 0), cylX(0.02, 0.016, 16).translate(0.056, -0.205, 0), cylX(0.02, 0.016, 16).translate(-0.056, -0.205, 0));
    mb.add(red, new THREE.SphereGeometry(0.009, 12, 8).translate(0, -HH - 0.035, 0.026));
    mb.build(mic);
    for (const s of [1, -1]) {
      const yb = -HH * 0.45, bd = solid(new THREE.PlaneGeometry(0.06, 0.03), lamb("#ffffff", badgeTex()), mic, false);
      bd.position.set(0, yb, s * (rOf(yb) * DZ * 1.03 + 0.011 + 0.004)); if (s < 0) bd.rotation.y = Math.PI;
    }
    mic.position.set(...M); mic.rotation.y = MIC_YAW;
    rig.add(mic);
    const glow = glowSprite(new THREE.Color(0.45, 0.85, 1.6), mic); glow.position.set(0, 0, 0.02); glow.scale.set(0.5, 0.6, 1);
    return glow;
  }

  // ---------------------------------- headphones ----------------------------------
  private buildHeadphones() {
    const H = this.hp, b = new Bag();
    const cream = phong("#fff1da", null, "#ffffff", 40), teal = phong("#1fb8b0", null, "#ffffff", 70), pad = lamb("#2a2a36"), chrome = phong("#ffffff", chromeTex(), "#ffffff", 100);
    // unit head radius; the group is scaled by r. Band sits behind the card plane (z < 0), cups straddle it.
    b.add(cream, new THREE.TorusGeometry(1.2, 0.1, 12, 64, Math.PI).scale(1, 1, 1.5).translate(0, 0.02, -0.18));
    b.add(pad, new THREE.TorusGeometry(1.09, 0.075, 10, 48, Math.PI - 0.9).rotateZ(0.45).scale(1, 1, 1.6).translate(0, 0.02, -0.18));
    for (const s of [-1, 1]) {
      b.add(chrome, rod([s * 1.2, 0.04, -0.12], [s * 1.24, -0.12, -0.02], 0.035, 12));
      b.add(chrome, new THREE.TorusGeometry(0.45, 0.04, 8, 32, Math.PI).rotateY(Math.PI / 2).translate(s * 1.28, -0.2, 0));
      b.add(teal, cylX(0.43, 0.3, 40).translate(s * 1.3, -0.2, 0));
      b.add(cream, cylX(0.36, 0.06, 40).translate(s * 1.47, -0.2, 0));
      b.add(teal, new THREE.TorusGeometry(0.43, 0.05, 10, 40).rotateY(Math.PI / 2).translate(s * 1.45, -0.2, 0));
      b.add(pad, cylX(0.4, 0.14, 36).translate(s * 1.1, -0.2, 0), new THREE.TorusGeometry(0.34, 0.08, 10, 36).rotateY(Math.PI / 2).translate(s * 1.06, -0.2, 0));
    }
    b.build(H);
    const ledGeo = mergeGeometries([-1, 1].map((s) => strip(new THREE.TorusGeometry(0.26, 0.04, 8, 40).rotateY(Math.PI / 2).translate(s * 1.505, -0.2, 0))), false);
    const leds = solid(ledGeo, new THREE.MeshBasicMaterial({ color: HP_TINTS[0].clone() }), H, false);
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: arcTex(), color: new THREE.Color(0.7, 1.3, 1.6), transparent: true, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 16; s.visible = false; this.root.add(s); this.hpArcs.push(s);
    }
    const cord = new THREE.Mesh(new THREE.BufferGeometry(), lamb("#22222c"));
    cord.castShadow = true; cord.receiveShadow = true; cord.frustumCulled = false; this.root.add(cord);
    return { leds, cord };
  }

  // ---------------------------------- tablet ----------------------------------
  private buildTablet(): THREE.Sprite {
    const T = this.tab, b = new Bag();
    const orange = phong("#ff8c2a", null, "#ffffff", 40), black = phong("#0e0f14", null, "#8a90a0", 80), grey = lamb("#3a3e4c");
    b.add(orange, rbox(TAB_W, TAB_H, TAB_D, 0.02, 3));
    b.add(black, at(rbox(TAB_W - 0.012, TAB_H - 0.012, 0.004, 0.014, 3), 0, 0, TAB_D / 2 - 0.001));
    // folio stand behind: two struts from the upper back down to the desk + a cross bar
    const top = new THREE.Vector3(0, 0.03, -TAB_D / 2 - 0.004);
    const foot = (() => {
      const fw = new THREE.Vector3(0, -TAB_H / 2, -TAB_D / 2).applyMatrix4(tabMat);
      fw.add(new THREE.Vector3(-Math.sin(TAB_YAW), 0, -Math.cos(TAB_YAW)).multiplyScalar(0.16)).setY(TABLET_FOOT[1] + 0.007);
      return fw.applyMatrix4(tabMat.clone().invert());
    })();
    for (const s of [-1, 1]) b.add(grey, rod([top.x + s * 0.08, top.y, top.z], [foot.x + s * 0.08, foot.y, foot.z], 0.007, 10));
    b.add(grey, rod([top.x - 0.09, top.y, top.z], [top.x + 0.09, top.y, top.z], 0.008, 10));
    b.add(black, cylX(0.006, 0.012, 12).translate(-TAB_W / 2 - 0.004, -0.04, 0)); // headphone jack
    b.build(T);
    const back = solid(new THREE.PlaneGeometry(0.12, 0.12), lamb("#ffffff", tabBackTex()), T, false); back.position.set(0, -0.03, -TAB_D / 2 - 0.0015); back.rotation.y = Math.PI;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(SCR_W, SCR_H), new THREE.MeshBasicMaterial({ map: this.tabScr.tex, color: new THREE.Color(1.04, 1.04, 1.04) }));
    scr.position.z = TAB_D / 2 + 0.0024; scr.frustumCulled = false; T.add(scr);
    T.matrixAutoUpdate = false; T.matrix.copy(tabMat);
    const glow = glowSprite(new THREE.Color(1.6, 1.2, 0.3), T); glow.position.set(0, 0, -0.04); glow.scale.set(0.6, 0.48, 1);
    return glow;
  }

  // ---------------------------------- debug stand-ins ----------------------------------
  private buildDebug() {
    const D = new THREE.Group(); this.root.add(D);
    const fl = solid(new THREE.BoxGeometry(6, 0.02, 6), lamb("#b89070"), D); fl.position.set(ROOM[0], -0.01, ROOM[2]);
    const fl2 = solid(new THREE.BoxGeometry(6, 0.02, 6), lamb("#8090a8"), D); fl2.position.set(LAB[0], -0.01, LAB[2]);
    const wall = solid(new THREE.BoxGeometry(6, 3, 0.05), lamb("#d0a890"), D); wall.position.set(ROOM[0], 1.5, ROOM[2] - 1.4);
    const wall2 = solid(new THREE.BoxGeometry(6, 3, 0.05), lamb("#a0b0c8"), D); wall2.position.set(LAB[0], 1.5, LAB[2] - 1.5);
    const desk = solid(new THREE.BoxGeometry(1.2, 0.04, 0.5), lamb("#d8c0a0"), D); desk.position.set(LAB[0], DESK_Y - 0.02, LAB[2] + 0.8);
    const head = solid(new THREE.SphereGeometry(0.21, 24, 16).scale(1, 1.05, 0.12), lamb("#f0c090"), D); head.position.set(...BEAN_HEAD);
    const head2 = solid(new THREE.SphereGeometry(0.21, 24, 16).scale(1, 1.05, 0.12), lamb("#f0c090"), D); head2.position.set(...LAB_HEAD);
    const body = solid(new THREE.BoxGeometry(0.42, 0.7, 0.05), lamb("#4a70c0"), D); body.position.set(ROOM[0], 0.85, ROOM[2]);
    const body2 = solid(new THREE.BoxGeometry(0.42, 0.55, 0.05), lamb("#4a70c0"), D); body2.position.set(LAB[0], 0.78, LAB[2] + 0.4);
  }
  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const o = (globalThis as { __PROPCAM?: number }).__PROPCAM ?? Math.round(t * 30) % 3;
    let p: V3, l: V3, fov = 34;
    if (id === 1 || id === 5) { if (o === 1) { const ph = phonePose(id, t).pos; p = add(ph, -0.05, 0.08, 0.75); l = add(ph, -0.04, 0.08, 0); fov = 40; } else return; }
    else if (id === 3) { if (o === 1) { p = add(ROOM, 1.3, 1.4, 1.7); l = add(MIC_GRILLE, 0, -0.15, 0); fov = 36; } else if (o === 2) { p = add(ROOM, 0.3, 1.0, 3.9); l = add(ROOM, 0.3, 0.75, 0); fov = 40; } else return; }
    else if (id === 4) { if (o === 1) { p = add(TABLET_CENTRE, 0.1, 0.12, 0.75); l = TABLET_CENTRE; fov = 36; } else if (o === 2) { p = add(LAB_HEAD, 0.7, 0.05, 1.5); l = add(LAB_HEAD, 0, -0.15, 0); fov = 40; } else return; }
    else return;
    cam.position.set(...p); cam.up.set(0, 1, 0); cam.lookAt(...l); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  // ---------------------------------- per frame ----------------------------------
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    this.updatePhone(id, t, cam);
    this.updateMic(id, t);
    this.updateHeadphones(id, t, cam.position);
    this.updateTablet(id, t);
  }

  private updatePhone(id: number, t: number, cam: THREE.Camera) {
    const P = phonePose(id, t);
    this.phone.visible = P.show > 0;
    const bs = bubbleAt(id, t);
    this.bubble.visible = this.phone.visible && bs > 0.002;
    if (!this.phone.visible) return;
    const cp = cam.position, yaw = Math.atan2(cp.x - P.pos[0], cp.z - P.pos[2]);
    this.phone.position.set(...P.pos); this.phone.rotation.set(P.pitch, yaw, P.roll, "YXZ");
    const warm = id === 5, key = `${id}|${P.pos01.toFixed(4)}|${P.play.toFixed(2)}|${P.play > 0.01 ? t.toFixed(3) : ""}`;
    if (key !== this.memo.key) { this.memo.key = key; drawMemo(this.memo.g, P.pos01, P.play, t, warm); this.memo.tex.needsUpdate = true; }
    if (!this.bubble.visible) return;
    // bubble: pops out of the phone's top toward screen-left, facing the camera; squeaky wobble (shot 1)
    const bkey = `${id}|${Math.floor(t * 15)}`;
    if (bkey !== this.bub.key) { this.bub.key = bkey; drawBubble(this.bub.g, t, warm); this.bub.tex.needsUpdate = true; }
    const camQ = cam.quaternion, right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ), up = new THREE.Vector3(0, 1, 0).applyQuaternion(camQ), back = new THREE.Vector3(0, 0, 1).applyQuaternion(camQ);
    const e = bs < 1 ? bs * bs * (3.4 - 2.4 * bs) : 1; // slight overshoot
    const top = new THREE.Vector3(...P.pos).add(new THREE.Vector3(0, PHONE_H / 2, 0).applyEuler(this.phone.rotation));
    const W0 = warm ? 0.2 : 0.29; // QA1: shot 1 bigger + clear of his cheek (hook)
    const c = top.addScaledVector(up, 0.02 + (warm ? 0.075 : 0.1) * e).addScaledVector(right, (warm ? -0.09 : 0.03) * e).addScaledVector(back, 0.05);
    this.bubble.position.copy(c); this.bubble.quaternion.copy(camQ);
    const jig = warm ? 0.03 * Math.sin(t * 3) : 0.07 * Math.sin(t * 31) * (hash(Math.floor(t * 15)) - 0.2);
    this.bubble.rotateZ(jig + (warm ? 0.05 : 0.08));
    const sq = warm ? 1 : 1 + 0.05 * Math.sin(t * 38);
    this.bubble.scale.set((W0 * e) / sq, W0 * e * sq, 1);
  }

  private updateMic(id: number, t: number) {
    const M = micPose(id, t);
    this.micRig.visible = M.show > 0;
    if (!this.micRig.visible) return;
    this.micRig.position.set(...M.base); this.micRig.rotation.set(0, 0, M.lean);
    const pulse = 0.65 + 0.35 * Math.sin(t * TAU * 2.4);
    (this.micGlow.material as THREE.SpriteMaterial).opacity = 0.75 * M.catch * pulse; this.micGlow.visible = M.catch > 0.01;
    this.micGlow.scale.set(0.42 + 0.08 * pulse, 0.52 + 0.08 * pulse, 1);
  }

  private updateHeadphones(id: number, t: number, cp: THREE.Vector3) {
    const hp = headphonesAt(id, t);
    const vis = hp.show > 0;
    this.hp.visible = this.cord.visible = vis;
    this.hpArcs.forEach((s) => (s.visible = false));
    if (!vis) return;
    const yaw = Math.atan2(cp.x - hp.head[0], cp.z - hp.head[2]);
    const thump = hp.play * 0.035 * Math.max(0, Math.sin(t * TAU * 2.2));
    this.hp.position.set(...hp.head); this.hp.rotation.set(0, yaw, 0); this.hp.scale.setScalar(hp.r * (1 + thump));
    // LED rings: blue -> gold (voice D) -> pink (peak)
    const k = hp.tint, c = k <= 1 ? HP_TINTS[0].clone().lerp(HP_TINTS[1], k) : HP_TINTS[1].clone().lerp(HP_TINTS[2], k - 1);
    (this.hpLeds.material as THREE.MeshBasicMaterial).color.copy(c).multiplyScalar(0.35 + 0.65 * (0.4 + 0.6 * hp.play));
    this.hpArcs.forEach((s, i) => {
      if (hp.play < 0.01) return;
      s.visible = true;
      const sx = i ? 1 : -1, u = (t * 2.2 + i * 0.5) % 1, off = hp.r * (1.8 + 0.5 * u);
      s.position.set(hp.head[0] + Math.cos(yaw) * off * sx, hp.head[1] - 0.2 * hp.r, hp.head[2] - Math.sin(yaw) * off * sx);
      s.scale.set(hp.r * 0.55 * sx, hp.r * 1.1, 1);
      const sm = s.material as THREE.SpriteMaterial;
      sm.color.copy(c); sm.opacity = hp.play * Math.sin(Math.PI * u) * 0.9;
    });
    // coiled cord: screen-left cup -> tablet jack (rebuilt only when the head moves)
    const key = hp.head.map((v) => v.toFixed(3)).join(",") + "|" + yaw.toFixed(3) + "|" + (hp.r * (1 + thump)).toFixed(4);
    if (key !== this.cordKey) {
      this.cordKey = key;
      this.hp.updateMatrixWorld(true);
      const a = new THREE.Vector3(-1.3, -0.64, 0.0).applyMatrix4(this.hp.matrixWorld);
      const jack = new THREE.Vector3(-TAB_W / 2 - 0.01, -0.04, 0).applyMatrix4(tabMat);
      const mid1 = a.clone().add(new THREE.Vector3(-0.05, -0.16, 0.05)), mid2 = new THREE.Vector3((a.x + jack.x) / 2 - 0.08, Math.min(a.y, jack.y) - 0.05, (a.z + jack.z) / 2);
      this.cord.geometry.dispose(); this.cord.geometry = coil([a, mid1, mid2, jack], 0.007, 0.0028, 90);
    }
  }

  private updateTablet(id: number, t: number) {
    const vis = id === 4;
    this.tab.visible = vis;
    if (!vis) return;
    const R = ratingAt(id, t), act = activeRow(id, t);
    const key = `${R.show.toFixed(3)}|${R.bars.map((b) => b.toFixed(3)).join(",")}|${R.own.toFixed(3)}|${act}|${R.own > 0.05 || act >= 0 ? Math.floor(t * 12) : 0}`;
    if (key !== this.tabScr.key) { this.tabScr.key = key; drawTablet(this.tabScr.g, id, t); this.tabScr.tex.needsUpdate = true; }
    (this.tabGlow.material as THREE.SpriteMaterial).opacity = 0.15 * R.show + 0.6 * R.own; this.tabGlow.visible = R.show > 0.01;
  }
}
